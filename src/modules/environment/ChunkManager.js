/**
 * ChunkManager.js - Manages chunk loading/unloading based on viewport
 *
 * Handles efficient chunk management for performance optimization.
 * Only loads chunks visible in the viewport or near active players/entities.
 *
 * Part of Phase 1: Core Terrain Generation System
 *
 * Features:
 * - Viewport-based chunk culling (only load visible chunks)
 * - Player-based chunk loading (load around player positions)
 * - Automatic chunk unloading (LRU cache)
 * - Configurable load radius
 * - Performance tracking
 *
 * Usage:
 *   const chunkManager = new ChunkManager(terrainManager, {
 *     chunkLoadRadius: 2, // Load 2 chunks around viewport
 *     maxLoadedChunks: 50
 *   });
 *   chunkManager.update(cameraX, cameraZ, viewportWidth, viewportHeight);
 */

export class ChunkManager {
  /**
   * Create a chunk manager
   * @param {TerrainManager} terrainManager - Terrain manager instance
   * @param {object} options - Configuration options
   */
  constructor(terrainManager, options = {}) {
    this.terrainManager = terrainManager;

    // Configuration
    this.config = {
      chunkSize: terrainManager?.config.chunkSize || 32,  // Tiles per chunk
      tileSize: options.tileSize || 40,                   // Pixels per tile
      chunkLoadRadius: options.chunkLoadRadius || 2,      // Chunks to load around viewport
      maxLoadedChunks: options.maxLoadedChunks || 100,    // Maximum chunks in memory
      unloadDelayFrames: options.unloadDelayFrames || 60, // Frames to wait before unloading
      ...options
    };

    // Active chunks tracking
    this.activeChunks = new Set();        // Currently active chunk keys
    this.chunkLastUsedFrame = new Map();  // Track last frame each chunk was needed
    this.currentFrame = 0;

    // Player/entity tracking
    this.trackedEntities = new Map();     // Map<entityId, {x, z}>

    // Performance stats
    this.stats = {
      chunksLoaded: 0,
      chunksUnloaded: 0,
      chunksActive: 0,
      lastUpdateTime: 0
    };
  }

  /**
   * Update chunk loading based on viewport and player positions
   * Call this every frame from game loop
   *
   * @param {number} cameraX - Camera X position in world coordinates
   * @param {number} cameraZ - Camera Z position in world coordinates
   * @param {number} viewportWidth - Viewport width in pixels
   * @param {number} viewportHeight - Viewport height in pixels
   * @returns {object} Update info {chunksLoaded, chunksUnloaded}
   */
  update(cameraX, cameraZ, viewportWidth, viewportHeight) {
    const startTime = performance.now();
    this.currentFrame++;

    // Calculate visible chunk range from viewport
    const visibleChunks = this.calculateVisibleChunks(
      cameraX, cameraZ, viewportWidth, viewportHeight
    );

    // Add chunks around tracked entities (players, NPCs)
    const entityChunks = this.calculateEntityChunks();

    // Combine visible and entity chunks
    const requiredChunks = new Set([...visibleChunks, ...entityChunks]);

    // Load required chunks
    let chunksLoaded = 0;
    requiredChunks.forEach(chunkKey => {
      const [chunkX, chunkZ] = chunkKey.split(',').map(Number);

      // Mark as active and update last used frame
      this.activeChunks.add(chunkKey);
      this.chunkLastUsedFrame.set(chunkKey, this.currentFrame);

      // Ensure chunk is loaded in terrain manager
      if (!this.terrainManager?.isChunkLoaded(chunkX, chunkZ)) {
        // Chunk will be auto-generated on first access
        this.terrainManager?.getHeight(
          chunkX * this.config.chunkSize,
          chunkZ * this.config.chunkSize
        );
        chunksLoaded++;
        this.stats.chunksLoaded++;
      }
    });

    // Unload old chunks (chunks not used recently)
    const chunksUnloaded = this.unloadOldChunks();

    // Update stats
    this.stats.chunksActive = this.activeChunks.size;
    this.stats.lastUpdateTime = performance.now() - startTime;

    return {
      chunksLoaded,
      chunksUnloaded,
      chunksActive: this.activeChunks.size,
      updateTime: this.stats.lastUpdateTime
    };
  }

  /**
   * Calculate which chunks are visible in the viewport
   * @private
   */
  calculateVisibleChunks(cameraX, cameraZ, viewportWidth, viewportHeight) {
    const chunks = new Set();

    // Convert camera position to tile coordinates
    const cameraTileX = Math.floor(cameraX / this.config.tileSize);
    const cameraTileZ = Math.floor(cameraZ / this.config.tileSize);

    // Calculate viewport bounds in tiles
    const tilesWidth = Math.ceil(viewportWidth / this.config.tileSize);
    const tilesHeight = Math.ceil(viewportHeight / this.config.tileSize);

    // Add buffer based on chunkLoadRadius
    const bufferTiles = this.config.chunkLoadRadius * this.config.chunkSize;

    // Calculate tile range
    const minTileX = cameraTileX - bufferTiles;
    const maxTileX = cameraTileX + tilesWidth + bufferTiles;
    const minTileZ = cameraTileZ - bufferTiles;
    const maxTileZ = cameraTileZ + tilesHeight + bufferTiles;

    // Convert tile range to chunk range
    const minChunkX = Math.floor(minTileX / this.config.chunkSize);
    const maxChunkX = Math.floor(maxTileX / this.config.chunkSize);
    const minChunkZ = Math.floor(minTileZ / this.config.chunkSize);
    const maxChunkZ = Math.floor(maxTileZ / this.config.chunkSize);

    // Add all chunks in range
    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        chunks.add(`${chunkX},${chunkZ}`);
      }
    }

    return chunks;
  }

  /**
   * Calculate chunks needed around tracked entities (players, NPCs)
   * @private
   */
  calculateEntityChunks() {
    const chunks = new Set();

    this.trackedEntities.forEach(({ x, z }) => {
      // Convert world coordinates to chunk coordinates
      const chunkX = Math.floor(x / this.config.chunkSize);
      const chunkZ = Math.floor(z / this.config.chunkSize);

      // Load chunk the entity is in, plus surrounding chunks
      const radius = this.config.chunkLoadRadius;
      for (let dz = -radius; dz <= radius; dz++) {
        for (let dx = -radius; dx <= radius; dx++) {
          chunks.add(`${chunkX + dx},${chunkZ + dz}`);
        }
      }
    });

    return chunks;
  }

  /**
   * Unload chunks that haven't been used recently
   * @private
   * @returns {number} Number of chunks unloaded
   */
  unloadOldChunks() {
    if (!this.terrainManager) return 0;

    let chunksUnloaded = 0;
    const chunksToUnload = [];

    // Find chunks that haven't been used recently
    this.chunkLastUsedFrame.forEach((lastUsedFrame, chunkKey) => {
      const framesSinceUse = this.currentFrame - lastUsedFrame;

      if (framesSinceUse > this.config.unloadDelayFrames) {
        chunksToUnload.push(chunkKey);
      }
    });

    // If we're over the max loaded chunks limit, unload oldest chunks
    const totalLoaded = this.terrainManager.chunks.size;
    if (totalLoaded > this.config.maxLoadedChunks) {
      // Sort by last used frame (oldest first)
      const sortedChunks = Array.from(this.chunkLastUsedFrame.entries())
        .sort((a, b) => a[1] - b[1]);

      const excessCount = totalLoaded - this.config.maxLoadedChunks;
      for (let i = 0; i < excessCount && i < sortedChunks.length; i++) {
        const chunkKey = sortedChunks[i][0];
        if (!chunksToUnload.includes(chunkKey)) {
          chunksToUnload.push(chunkKey);
        }
      }
    }

    // Unload chunks
    chunksToUnload.forEach(chunkKey => {
      const [chunkX, chunkZ] = chunkKey.split(',').map(Number);

      if (this.terrainManager.unloadChunk(chunkX, chunkZ)) {
        this.activeChunks.delete(chunkKey);
        this.chunkLastUsedFrame.delete(chunkKey);
        chunksUnloaded++;
        this.stats.chunksUnloaded++;
      }
    });

    return chunksUnloaded;
  }

  /**
   * Track an entity (player, NPC) for chunk loading
   * @param {string} entityId - Unique entity identifier
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   */
  trackEntity(entityId, x, z) {
    this.trackedEntities.set(entityId, { x, z });
  }

  /**
   * Stop tracking an entity
   * @param {string} entityId - Entity identifier
   */
  untrackEntity(entityId) {
    this.trackedEntities.delete(entityId);
  }

  /**
   * Update entity position (for chunk loading)
   * @param {string} entityId - Entity identifier
   * @param {number} x - New world X coordinate
   * @param {number} z - New world Z coordinate
   */
  updateEntityPosition(entityId, x, z) {
    const entity = this.trackedEntities.get(entityId);
    if (entity) {
      entity.x = x;
      entity.z = z;
    }
  }

  /**
   * Get all currently active chunks
   * @returns {Array<{x: number, z: number}>}
   */
  getActiveChunks() {
    const chunks = [];
    this.activeChunks.forEach(chunkKey => {
      const [x, z] = chunkKey.split(',').map(Number);
      chunks.push({ x, z });
    });
    return chunks;
  }

  /**
   * Check if a chunk is currently active
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {boolean}
   */
  isChunkActive(chunkX, chunkZ) {
    return this.activeChunks.has(`${chunkX},${chunkZ}`);
  }

  /**
   * Force load a specific chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   */
  forceLoadChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;

    // Mark as active
    this.activeChunks.add(chunkKey);
    this.chunkLastUsedFrame.set(chunkKey, this.currentFrame);

    // Ensure loaded in terrain manager
    if (this.terrainManager && !this.terrainManager.isChunkLoaded(chunkX, chunkZ)) {
      this.terrainManager.getHeight(
        chunkX * this.config.chunkSize,
        chunkZ * this.config.chunkSize
      );
      this.stats.chunksLoaded++;
    }
  }

  /**
   * Force unload a specific chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {boolean} True if chunk was unloaded
   */
  forceUnloadChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;

    if (this.terrainManager?.unloadChunk(chunkX, chunkZ)) {
      this.activeChunks.delete(chunkKey);
      this.chunkLastUsedFrame.delete(chunkKey);
      this.stats.chunksUnloaded++;
      return true;
    }

    return false;
  }

  /**
   * Preload chunks in a rectangular area
   * Useful for loading terrain before player arrives
   *
   * @param {number} minX - Min world X coordinate
   * @param {number} minZ - Min world Z coordinate
   * @param {number} maxX - Max world X coordinate
   * @param {number} maxZ - Max world Z coordinate
   * @returns {number} Number of chunks preloaded
   */
  preloadArea(minX, minZ, maxX, maxZ) {
    const minChunkX = Math.floor(minX / this.config.chunkSize);
    const minChunkZ = Math.floor(minZ / this.config.chunkSize);
    const maxChunkX = Math.floor(maxX / this.config.chunkSize);
    const maxChunkZ = Math.floor(maxZ / this.config.chunkSize);

    let chunksPreloaded = 0;

    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        if (!this.terrainManager?.isChunkLoaded(chunkX, chunkZ)) {
          this.forceLoadChunk(chunkX, chunkZ);
          chunksPreloaded++;
        }
      }
    }

    return chunksPreloaded;
  }

  /**
   * Unload all chunks
   * Useful for cleanup or world change
   */
  unloadAllChunks() {
    if (!this.terrainManager) return;

    const chunksToUnload = Array.from(this.activeChunks);

    chunksToUnload.forEach(chunkKey => {
      const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
      this.terrainManager.unloadChunk(chunkX, chunkZ);
    });

    this.activeChunks.clear();
    this.chunkLastUsedFrame.clear();
  }

  /**
   * Get performance statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      trackedEntities: this.trackedEntities.size,
      maxLoadedChunks: this.config.maxLoadedChunks
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      chunksLoaded: 0,
      chunksUnloaded: 0,
      chunksActive: this.activeChunks.size,
      lastUpdateTime: 0
    };
  }
}
