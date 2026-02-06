/**
 * ChunkManager - Coordinates chunk loading, unloading, and lifecycle
 *
 * Manages active chunks, load/unload queues, and chunk state.
 * Works with Web Workers for async terrain generation.
 */

import { Chunk, ChunkState } from './Chunk.js';
import {
  chunkKey,
  worldToChunk,
  chunkDistanceSq,
  getChunksInRadiusSorted,
  CHUNK_SIZE,
  VOXEL_SIZE,
} from './coordinates.js';

/**
 * Priority queue for chunk loading
 */
class LoadQueue {
  constructor() {
    this.items = [];
  }

  enqueue(chunkX, chunkZ, priority) {
    const key = chunkKey(chunkX, chunkZ);

    // Check if already in queue
    const existing = this.items.findIndex(item => item.key === key);
    if (existing !== -1) {
      // Update priority if higher
      if (priority < this.items[existing].priority) {
        this.items[existing].priority = priority;
        this.sort();
      }
      return;
    }

    this.items.push({ key, chunkX, chunkZ, priority });
    this.sort();
  }

  dequeue() {
    return this.items.shift();
  }

  remove(key) {
    const index = this.items.findIndex(item => item.key === key);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  has(key) {
    return this.items.some(item => item.key === key);
  }

  sort() {
    this.items.sort((a, b) => a.priority - b.priority);
  }

  get length() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }
}

/**
 * ChunkManager class
 */
export class ChunkManager {
  /**
   * Create a new ChunkManager
   * @param {Object} options
   * @param {number} options.viewDistance - View distance in chunks (default 8)
   * @param {number} options.seed - World seed for generation
   * @param {Function} options.onChunkReady - Callback when chunk is ready
   * @param {Function} options.onChunkUnload - Callback when chunk unloads
   */
  constructor(options = {}) {
    this.viewDistance = options.viewDistance ?? 8;
    this.seed = options.seed ?? Math.floor(Math.random() * 2147483647);
    this.onChunkReady = options.onChunkReady ?? (() => {});
    this.onChunkUnload = options.onChunkUnload ?? (() => {});

    // Active chunks
    this.chunks = new Map();

    // Load/unload queues
    this.loadQueue = new LoadQueue();
    this.unloadQueue = new Set();

    // Currently loading (waiting for worker)
    this.loading = new Set();

    // Player position tracking (use invalid values to force initial update)
    this.playerChunkX = Number.MAX_SAFE_INTEGER;
    this.playerChunkZ = Number.MAX_SAFE_INTEGER;
    this.initialized = false;

    // Mesh rebuild queue
    this.meshRebuildQueue = new Set();

    // Worker reference (set externally)
    this.workerPool = null;

    // Performance tracking
    this.stats = {
      chunksLoaded: 0,
      chunksUnloaded: 0,
      lastUpdateTime: 0,
    };

    // Configuration
    this.maxLoadsPerFrame = 2;
    this.maxUnloadsPerFrame = 4;
    this.maxMeshRebuildsPerFrame = 2;
  }

  /**
   * Set the worker pool for async terrain generation
   * @param {WorkerPool} pool
   */
  setWorkerPool(pool) {
    this.workerPool = pool;
  }

  /**
   * Update player position and trigger chunk loading/unloading
   * @param {number} worldX - Player world X position
   * @param {number} worldZ - Player world Z position
   */
  updatePlayerPosition(worldX, worldZ) {
    const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);

    // Check if player moved to a new chunk
    if (chunkX !== this.playerChunkX || chunkZ !== this.playerChunkZ) {
      this.playerChunkX = chunkX;
      this.playerChunkZ = chunkZ;
      this.updateChunkQueues();
    }
  }

  /**
   * Update load and unload queues based on player position
   */
  updateChunkQueues() {
    const { playerChunkX, playerChunkZ, viewDistance } = this;

    // Get chunks that should be loaded
    const chunksNeeded = getChunksInRadiusSorted(
      playerChunkX,
      playerChunkZ,
      viewDistance
    );

    const neededKeys = new Set(chunksNeeded.map(c => chunkKey(c.chunkX, c.chunkZ)));

    // Queue chunks that need loading
    for (const { chunkX, chunkZ, distanceSq } of chunksNeeded) {
      const key = chunkKey(chunkX, chunkZ);

      if (!this.chunks.has(key) && !this.loading.has(key) && !this.loadQueue.has(key)) {
        this.loadQueue.enqueue(chunkX, chunkZ, distanceSq);
      }
    }

    // Queue chunks that should be unloaded
    for (const [key] of this.chunks) {
      if (!neededKeys.has(key)) {
        this.unloadQueue.add(key);
      }
    }

    // Remove from load queue if no longer needed
    for (const item of [...this.loadQueue.items]) {
      if (!neededKeys.has(item.key)) {
        this.loadQueue.remove(item.key);
      }
    }

    // Cancel loading if no longer needed
    for (const key of this.loading) {
      if (!neededKeys.has(key)) {
        // Note: Would need worker cancellation support
        // For now, we'll just let it complete and unload immediately
      }
    }
  }

  /**
   * Process queues - call this every frame
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    const startTime = performance.now();

    // Process unloads first (free memory)
    this.processUnloadQueue();

    // Process loads
    this.processLoadQueue();

    // Note: Mesh rebuilds are handled by ChunkRenderer, which detects
    // dirty chunks via getDirtyChunks() and rebuilds them via the worker pool.

    this.stats.lastUpdateTime = performance.now() - startTime;
  }

  /**
   * Process chunk unload queue
   */
  processUnloadQueue() {
    let unloaded = 0;

    for (const key of this.unloadQueue) {
      if (unloaded >= this.maxUnloadsPerFrame) break;

      const chunk = this.chunks.get(key);
      if (chunk) {
        this.unloadChunk(chunk);
        unloaded++;
      }

      this.unloadQueue.delete(key);
    }
  }

  /**
   * Process chunk load queue
   */
  processLoadQueue() {
    let loaded = 0;

    while (this.loadQueue.length > 0 && loaded < this.maxLoadsPerFrame) {
      // Don't start too many concurrent loads
      if (this.loading.size >= 4) break;

      const item = this.loadQueue.dequeue();
      if (!item) break;

      // Double-check we still need this chunk
      const distSq = chunkDistanceSq(
        this.playerChunkX, this.playerChunkZ,
        item.chunkX, item.chunkZ
      );

      if (distSq > (this.viewDistance + 1) * (this.viewDistance + 1)) {
        continue; // Too far now, skip
      }

      this.startLoadingChunk(item.chunkX, item.chunkZ);
      loaded++;
    }
  }

  /**
   * Process mesh rebuild queue
   */
  processMeshRebuildQueue() {
    let rebuilt = 0;

    for (const key of this.meshRebuildQueue) {
      if (rebuilt >= this.maxMeshRebuildsPerFrame) break;

      const chunk = this.chunks.get(key);
      if (chunk && chunk.meshDirty && chunk.state === ChunkState.READY) {
        this.rebuildChunkMesh(chunk);
        rebuilt++;
      }

      this.meshRebuildQueue.delete(key);
    }
  }

  /**
   * Start loading a chunk (async)
   * @param {number} chunkX
   * @param {number} chunkZ
   */
  async startLoadingChunk(chunkX, chunkZ) {
    const key = chunkKey(chunkX, chunkZ);

    // Already loading or loaded
    if (this.loading.has(key) || this.chunks.has(key)) {
      return;
    }

    this.loading.add(key);

    try {
      let chunk;

      if (this.workerPool) {
        // Use worker for terrain generation
        const result = await this.workerPool.execute({
          type: 'generateTerrain',
          chunkX,
          chunkZ,
          seed: this.seed,
        });

        // Create chunk from worker result
        chunk = new Chunk(chunkX, chunkZ);
        chunk.blocks = new Uint8Array(result.blocks);
        chunk.rebuildHeightMap();
      } else {
        // Fallback: generate synchronously (for testing)
        chunk = this.generateChunkSync(chunkX, chunkZ);
      }

      // Check if we still need this chunk
      const distSq = chunkDistanceSq(
        this.playerChunkX, this.playerChunkZ,
        chunkX, chunkZ
      );

      if (distSq > (this.viewDistance + 1) * (this.viewDistance + 1)) {
        // No longer needed
        chunk.dispose();
        this.loading.delete(key);
        return;
      }

      // Add to active chunks
      chunk.state = ChunkState.READY;
      chunk.meshDirty = true;
      this.chunks.set(key, chunk);
      this.loading.delete(key);

      // Update neighbor references
      this.updateNeighbors(chunk);

      // Queue mesh build
      this.meshRebuildQueue.add(key);

      // Callback
      this.onChunkReady(chunk);

      this.stats.chunksLoaded++;

    } catch (error) {
      console.error(`Failed to load chunk ${key}:`, error);
      this.loading.delete(key);
    }
  }

  /**
   * Generate chunk synchronously (fallback/testing)
   * @param {number} chunkX
   * @param {number} chunkZ
   * @returns {Chunk}
   */
  generateChunkSync(chunkX, chunkZ) {
    const chunk = new Chunk(chunkX, chunkZ);

    // Simple terrain generation
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;

        // Simple height based on sine waves
        const height = Math.floor(
          8 +
          Math.sin(worldX * 0.1) * 2 +
          Math.cos(worldZ * 0.1) * 2 +
          Math.sin(worldX * 0.05 + worldZ * 0.05) * 3
        );

        for (let y = 0; y < CHUNK_SIZE; y++) {
          let blockType = 0; // Air

          if (y === 0) {
            blockType = 8; // Bedrock
          } else if (y < height - 3) {
            blockType = 1; // Stone
          } else if (y < height) {
            blockType = 2; // Dirt
          } else if (y === height) {
            blockType = 3; // Grass
          }

          if (blockType !== 0) {
            chunk.setBlock(x, y, z, blockType);
          }
        }
      }
    }

    chunk.rebuildHeightMap();
    return chunk;
  }

  /**
   * Update neighbor references for a chunk
   * @param {Chunk} chunk
   */
  updateNeighbors(chunk) {
    const { x, z } = chunk;

    // Get neighbors
    const north = this.chunks.get(chunkKey(x, z + 1));
    const south = this.chunks.get(chunkKey(x, z - 1));
    const east = this.chunks.get(chunkKey(x + 1, z));
    const west = this.chunks.get(chunkKey(x - 1, z));

    // Set references
    chunk.setNeighbor('north', north || null);
    chunk.setNeighbor('south', south || null);
    chunk.setNeighbor('east', east || null);
    chunk.setNeighbor('west', west || null);

    // Update neighbors to reference this chunk
    if (north) {
      north.setNeighbor('south', chunk);
      this.meshRebuildQueue.add(north.key);
    }
    if (south) {
      south.setNeighbor('north', chunk);
      this.meshRebuildQueue.add(south.key);
    }
    if (east) {
      east.setNeighbor('west', chunk);
      this.meshRebuildQueue.add(east.key);
    }
    if (west) {
      west.setNeighbor('east', chunk);
      this.meshRebuildQueue.add(west.key);
    }
  }

  /**
   * Unload a chunk
   * @param {Chunk} chunk
   */
  unloadChunk(chunk) {
    // Remove from neighbors
    const north = chunk.neighbors.north;
    const south = chunk.neighbors.south;
    const east = chunk.neighbors.east;
    const west = chunk.neighbors.west;

    if (north) north.setNeighbor('south', null);
    if (south) south.setNeighbor('north', null);
    if (east) east.setNeighbor('west', null);
    if (west) west.setNeighbor('east', null);

    // Callback before disposing
    this.onChunkUnload(chunk);

    // Clean up
    chunk.dispose();
    this.chunks.delete(chunk.key);
    this.meshRebuildQueue.delete(chunk.key);

    this.stats.chunksUnloaded++;
  }

  /**
   * Rebuild mesh for a chunk (placeholder - actual building done by meshBuilder)
   * @param {Chunk} chunk
   */
  rebuildChunkMesh(chunk) {
    // This will be implemented by the mesh builder integration
    // For now, just mark as not dirty
    chunk.meshDirty = false;
  }

  /**
   * Get a chunk by coordinates
   * @param {number} chunkX
   * @param {number} chunkZ
   * @returns {Chunk | undefined}
   */
  getChunk(chunkX, chunkZ) {
    return this.chunks.get(chunkKey(chunkX, chunkZ));
  }

  /**
   * Get a chunk by key
   * @param {string} key
   * @returns {Chunk | undefined}
   */
  getChunkByKey(key) {
    return this.chunks.get(key);
  }

  /**
   * Get block at world coordinates
   * @param {number} worldX
   * @param {number} worldY
   * @param {number} worldZ
   * @returns {number} Block type
   */
  getBlock(worldX, worldY, worldZ) {
    const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);
    const chunk = this.getChunk(chunkX, chunkZ);

    if (!chunk) return 0; // Air if chunk not loaded

    // Convert to local coordinates
    const voxelX = Math.floor(worldX / VOXEL_SIZE);
    const voxelY = Math.floor(worldY / VOXEL_SIZE);
    const voxelZ = Math.floor(worldZ / VOXEL_SIZE);

    const localX = ((voxelX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = Math.max(0, Math.min(CHUNK_SIZE - 1, voxelY));
    const localZ = ((voxelZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    return chunk.getBlock(localX, localY, localZ);
  }

  /**
   * Set block at world coordinates
   * @param {number} worldX
   * @param {number} worldY
   * @param {number} worldZ
   * @param {number} blockType
   * @returns {boolean} True if block was set
   */
  setBlock(worldX, worldY, worldZ, blockType) {
    const { chunkX, chunkZ } = worldToChunk(worldX, worldZ);
    const chunk = this.getChunk(chunkX, chunkZ);

    if (!chunk) return false; // Can't modify unloaded chunks

    // Convert to local coordinates
    const voxelX = Math.floor(worldX / VOXEL_SIZE);
    const voxelY = Math.floor(worldY / VOXEL_SIZE);
    const voxelZ = Math.floor(worldZ / VOXEL_SIZE);

    const localX = ((voxelX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = Math.max(0, Math.min(CHUNK_SIZE - 1, voxelY));
    const localZ = ((voxelZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const result = chunk.setBlock(localX, localY, localZ, blockType);

    if (result) {
      // Mark chunk as dirty so ChunkRenderer will rebuild its mesh
      chunk.meshDirty = true;
      this.meshRebuildQueue.add(chunk.key);

      // Check if we need to rebuild neighbor meshes (edge block)
      if (localX === 0 && chunk.neighbors.west) {
        chunk.neighbors.west.meshDirty = true;
        this.meshRebuildQueue.add(chunk.neighbors.west.key);
      }
      if (localX === CHUNK_SIZE - 1 && chunk.neighbors.east) {
        chunk.neighbors.east.meshDirty = true;
        this.meshRebuildQueue.add(chunk.neighbors.east.key);
      }
      if (localZ === 0 && chunk.neighbors.south) {
        chunk.neighbors.south.meshDirty = true;
        this.meshRebuildQueue.add(chunk.neighbors.south.key);
      }
      if (localZ === CHUNK_SIZE - 1 && chunk.neighbors.north) {
        chunk.neighbors.north.meshDirty = true;
        this.meshRebuildQueue.add(chunk.neighbors.north.key);
      }
    }

    return result;
  }

  /**
   * Mark a chunk for mesh rebuild
   * @param {string} key - Chunk key
   */
  markMeshDirty(key) {
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.meshDirty = true;
      this.meshRebuildQueue.add(key);
    }
  }

  /**
   * Get all active chunks
   * @returns {Map<string, Chunk>}
   */
  getActiveChunks() {
    return this.chunks;
  }

  /**
   * Get chunks that need mesh rebuild
   * @returns {Array<Chunk>}
   */
  getDirtyChunks() {
    return Array.from(this.chunks.values()).filter(c => c.meshDirty);
  }

  /**
   * Get current stats
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      activeChunks: this.chunks.size,
      loadQueueSize: this.loadQueue.length,
      loadingCount: this.loading.size,
      unloadQueueSize: this.unloadQueue.size,
      meshRebuildQueue: this.meshRebuildQueue.size,
    };
  }

  /**
   * Clean up all resources
   */
  dispose() {
    // Unload all chunks
    for (const chunk of this.chunks.values()) {
      chunk.dispose();
    }

    this.chunks.clear();
    this.loadQueue.clear();
    this.unloadQueue.clear();
    this.loading.clear();
    this.meshRebuildQueue.clear();
  }
}

export default ChunkManager;
