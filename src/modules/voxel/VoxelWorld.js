/**
 * VoxelWorld.js - Manages the voxel world composed of chunks
 *
 * Provides world-level block access, chunk management, and terrain generation.
 * Handles conversion from world coordinates to chunk/local coordinates.
 *
 * Part of Phase 1: Voxel Data Architecture
 *
 * Features:
 * - World coordinate to chunk coordinate conversion
 * - Chunk loading/unloading with LRU cache
 * - Terrain generation from existing heightmap or procedural
 * - Block access by world coordinates
 * - Region operations (fill, copy, etc.)
 * - Integration with existing TerrainManager for migration
 *
 * Usage:
 *   const world = new VoxelWorld({ seed: 12345 });
 *   world.setBlock(100, 50, 3, BlockType.STONE);
 *   const block = world.getBlock(100, 50, 3);
 */

import { VoxelChunk, ChunkRef } from './VoxelChunk.js';
import { BlockType, isBlockSolid, isBlockWalkable } from './BlockTypes.js';

export class VoxelWorld {
  /**
   * Create a voxel world
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    // Configuration
    this.config = {
      chunkSizeX: options.chunkSizeX || 32,
      chunkSizeY: options.chunkSizeY || 32,
      chunkSizeZ: options.chunkSizeZ || 16,
      maxLoadedChunks: options.maxLoadedChunks || 100,
      seed: options.seed || Date.now(),
      worldGenerator: options.worldGenerator || null,
      terrainManager: options.terrainManager || null,  // For migration
      ...options
    };

    // Chunk storage
    this.chunks = new Map();        // Map<chunkKey, VoxelChunk>
    this.chunkRefs = new Map();     // Map<chunkKey, ChunkRef>

    // Modified chunks tracking (for saves)
    this.modifiedChunks = new Set();

    // Statistics
    this.stats = {
      chunksLoaded: 0,
      chunksGenerated: 0,
      chunksUnloaded: 0,
      blockChanges: 0
    };

    // Current viewer position (for chunk loading priority)
    this.viewerPosition = { x: 0, y: 0, z: 0 };
  }

  /**
   * Convert world coordinates to chunk coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {{chunkX: number, chunkY: number, localX: number, localY: number}}
   */
  worldToChunk(worldX, worldY) {
    const chunkX = Math.floor(worldX / this.config.chunkSizeX);
    const chunkY = Math.floor(worldY / this.config.chunkSizeY);
    const localX = worldX - chunkX * this.config.chunkSizeX;
    const localY = worldY - chunkY * this.config.chunkSizeY;

    return { chunkX, chunkY, localX, localY };
  }

  /**
   * Convert chunk coordinates to world coordinates
   * @param {number} chunkX - Chunk X
   * @param {number} chunkY - Chunk Y
   * @param {number} localX - Local X within chunk
   * @param {number} localY - Local Y within chunk
   * @returns {{x: number, y: number}}
   */
  chunkToWorld(chunkX, chunkY, localX = 0, localY = 0) {
    return {
      x: chunkX * this.config.chunkSizeX + localX,
      y: chunkY * this.config.chunkSizeY + localY
    };
  }

  /**
   * Get chunk key from coordinates
   * @private
   * @param {number} chunkX - Chunk X
   * @param {number} chunkY - Chunk Y
   * @returns {string}
   */
  _getChunkKey(chunkX, chunkY) {
    return `${chunkX},${chunkY}`;
  }

  /**
   * Get or create a chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkY - Chunk Y coordinate
   * @returns {VoxelChunk}
   */
  getChunk(chunkX, chunkY) {
    const key = this._getChunkKey(chunkX, chunkY);

    // Return existing chunk if loaded
    if (this.chunks.has(key)) {
      const ref = this.chunkRefs.get(key);
      if (ref) ref.touch();
      return this.chunks.get(key);
    }

    // Generate new chunk
    const chunk = this._generateChunk(chunkX, chunkY);
    this.chunks.set(key, chunk);

    // Track chunk reference
    const ref = new ChunkRef(chunkX, chunkY);
    ref.loaded = true;
    this.chunkRefs.set(key, ref);

    this.stats.chunksLoaded++;

    // Check if we need to unload old chunks
    this._checkChunkLimit();

    return chunk;
  }

  /**
   * Check if a chunk is loaded
   * @param {number} chunkX - Chunk X
   * @param {number} chunkY - Chunk Y
   * @returns {boolean}
   */
  isChunkLoaded(chunkX, chunkY) {
    return this.chunks.has(this._getChunkKey(chunkX, chunkY));
  }

  /**
   * Generate a new chunk with terrain
   * @private
   * @param {number} chunkX - Chunk X
   * @param {number} chunkY - Chunk Y
   * @returns {VoxelChunk}
   */
  _generateChunk(chunkX, chunkY) {
    const chunk = new VoxelChunk(chunkX, chunkY, {
      sizeX: this.config.chunkSizeX,
      sizeY: this.config.chunkSizeY,
      sizeZ: this.config.chunkSizeZ
    });

    // Generate terrain for this chunk
    this._generateTerrain(chunk);

    this.stats.chunksGenerated++;
    return chunk;
  }

  /**
   * Generate terrain blocks for a chunk
   * @private
   * @param {VoxelChunk} chunk - Chunk to generate terrain for
   */
  _generateTerrain(chunk) {
    const worldStartX = chunk.chunkX * this.config.chunkSizeX;
    const worldStartY = chunk.chunkY * this.config.chunkSizeY;

    for (let localY = 0; localY < this.config.chunkSizeY; localY++) {
      for (let localX = 0; localX < this.config.chunkSizeX; localX++) {
        const worldX = worldStartX + localX;
        const worldY = worldStartY + localY;

        // Get terrain height from existing TerrainManager or generate
        let terrainHeight;

        if (this.config.terrainManager) {
          // Use existing heightmap for migration
          terrainHeight = this.config.terrainManager.getHeight(worldX, worldY);
        } else if (this.config.worldGenerator) {
          // Use world generator
          terrainHeight = this.config.worldGenerator.generateHeight(worldX, worldY);
        } else {
          // Default flat terrain at z=3
          terrainHeight = 3;
        }

        // Convert height to voxel blocks
        // Height 0-10 maps to z-levels, with blocks below surface
        const surfaceZ = Math.floor(terrainHeight);

        // Fill blocks from bottom up to surface
        for (let z = 0; z < this.config.chunkSizeZ; z++) {
          let blockType = BlockType.AIR;

          if (z < surfaceZ - 3) {
            // Deep underground: stone
            blockType = BlockType.STONE;
          } else if (z < surfaceZ) {
            // Near surface: dirt
            blockType = BlockType.DIRT;
          } else if (z === surfaceZ) {
            // Surface: grass
            blockType = BlockType.GRASS;
          }
          // Above surface: air (default)

          if (blockType !== BlockType.AIR) {
            chunk.setBlock(localX, localY, z, blockType);
          }
        }
      }
    }

    // Mark chunk as not dirty after generation (it's fresh)
    chunk.clearDirty();
  }

  /**
   * Get block at world coordinates
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - Z-level
   * @returns {number} Block type
   */
  getBlock(x, y, z) {
    // Clamp Z to valid range
    if (z < 0 || z >= this.config.chunkSizeZ) {
      return BlockType.AIR;
    }

    const { chunkX, chunkY, localX, localY } = this.worldToChunk(x, y);
    const chunk = this.getChunk(chunkX, chunkY);

    return chunk.getBlock(localX, localY, z);
  }

  /**
   * Set block at world coordinates
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - Z-level
   * @param {number} blockType - Block type
   * @returns {boolean} True if block was set
   */
  setBlock(x, y, z, blockType) {
    // Clamp Z to valid range
    if (z < 0 || z >= this.config.chunkSizeZ) {
      return false;
    }

    const { chunkX, chunkY, localX, localY } = this.worldToChunk(x, y);
    const chunk = this.getChunk(chunkX, chunkY);

    const result = chunk.setBlock(localX, localY, z, blockType);

    if (result) {
      // Mark chunk as modified
      const key = this._getChunkKey(chunkX, chunkY);
      this.modifiedChunks.add(key);
      const ref = this.chunkRefs.get(key);
      if (ref) ref.modified = true;

      this.stats.blockChanges++;
    }

    return result;
  }

  /**
   * Get block metadata at world coordinates
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - Z-level
   * @returns {number} Metadata byte
   */
  getMetadata(x, y, z) {
    if (z < 0 || z >= this.config.chunkSizeZ) {
      return 0;
    }

    const { chunkX, chunkY, localX, localY } = this.worldToChunk(x, y);
    const chunk = this.getChunk(chunkX, chunkY);

    return chunk.getMetadata(localX, localY, z);
  }

  /**
   * Set block metadata at world coordinates
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - Z-level
   * @param {number} value - Metadata byte
   * @returns {boolean}
   */
  setMetadata(x, y, z, value) {
    if (z < 0 || z >= this.config.chunkSizeZ) {
      return false;
    }

    const { chunkX, chunkY, localX, localY } = this.worldToChunk(x, y);
    const chunk = this.getChunk(chunkX, chunkY);

    const result = chunk.setMetadata(localX, localY, z, value);

    if (result) {
      const key = this._getChunkKey(chunkX, chunkY);
      this.modifiedChunks.add(key);
    }

    return result;
  }

  /**
   * Get the highest solid block at a position
   * @param {number} x - World X
   * @param {number} y - World Y
   * @returns {number} Z-level of highest solid block, or -1 if none
   */
  getHighestBlock(x, y) {
    const { chunkX, chunkY, localX, localY } = this.worldToChunk(x, y);
    const chunk = this.getChunk(chunkX, chunkY);

    return chunk.getHighestBlock(localX, localY);
  }

  /**
   * Get the surface Z-level at a position (highest walkable block)
   * @param {number} x - World X
   * @param {number} y - World Y
   * @returns {number} Z-level to stand on, or 0 if none
   */
  getSurfaceZ(x, y) {
    for (let z = this.config.chunkSizeZ - 1; z >= 0; z--) {
      const block = this.getBlock(x, y, z);
      if (isBlockWalkable(block)) {
        return z;
      }
    }
    return 0;
  }

  /**
   * Check if a position is solid (blocked)
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - Z-level
   * @returns {boolean}
   */
  isSolid(x, y, z) {
    const block = this.getBlock(x, y, z);
    return isBlockSolid(block);
  }

  /**
   * Check if an entity can stand at a position
   * (solid block below, air at and above position)
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - Z-level (feet position)
   * @param {number} height - Entity height in blocks (default 2)
   * @returns {boolean}
   */
  canStandAt(x, y, z, height = 2) {
    // Need solid ground below
    if (z === 0) {
      // Can stand on bedrock level
    } else {
      const blockBelow = this.getBlock(x, y, z - 1);
      if (!isBlockWalkable(blockBelow)) {
        return false;
      }
    }

    // Need air at feet and head positions
    for (let h = 0; h < height; h++) {
      const block = this.getBlock(x, y, z + h);
      if (isBlockSolid(block)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Fill a region with a block type
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} z1 - Start Z
   * @param {number} x2 - End X (inclusive)
   * @param {number} y2 - End Y (inclusive)
   * @param {number} z2 - End Z (inclusive)
   * @param {number} blockType - Block type
   * @returns {number} Number of blocks changed
   */
  fillRegion(x1, y1, z1, x2, y2, z2, blockType) {
    // Normalize coordinates
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const minZ = Math.max(0, Math.min(z1, z2));
    const maxZ = Math.min(this.config.chunkSizeZ - 1, Math.max(z1, z2));

    let changed = 0;

    for (let z = minZ; z <= maxZ; z++) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (this.setBlock(x, y, z, blockType)) {
            changed++;
          }
        }
      }
    }

    return changed;
  }

  /**
   * Replace blocks of one type with another in a region
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} z1 - Start Z
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {number} z2 - End Z
   * @param {number} fromType - Block type to replace
   * @param {number} toType - Block type to replace with
   * @returns {number} Number of blocks changed
   */
  replaceBlocks(x1, y1, z1, x2, y2, z2, fromType, toType) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const minZ = Math.max(0, Math.min(z1, z2));
    const maxZ = Math.min(this.config.chunkSizeZ - 1, Math.max(z1, z2));

    let changed = 0;

    for (let z = minZ; z <= maxZ; z++) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (this.getBlock(x, y, z) === fromType) {
            if (this.setBlock(x, y, z, toType)) {
              changed++;
            }
          }
        }
      }
    }

    return changed;
  }

  /**
   * Get all blocks in a layer across multiple chunks
   * @param {number} z - Z-level
   * @param {number} minX - Minimum X
   * @param {number} minY - Minimum Y
   * @param {number} maxX - Maximum X
   * @param {number} maxY - Maximum Y
   * @returns {Array<{x: number, y: number, blockType: number}>}
   */
  getLayerBlocks(z, minX, minY, maxX, maxY) {
    const blocks = [];

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const blockType = this.getBlock(x, y, z);
        if (blockType !== BlockType.AIR) {
          blocks.push({ x, y, blockType });
        }
      }
    }

    return blocks;
  }

  /**
   * Unload a chunk from memory
   * @param {number} chunkX - Chunk X
   * @param {number} chunkY - Chunk Y
   * @returns {boolean} True if chunk was unloaded
   */
  unloadChunk(chunkX, chunkY) {
    const key = this._getChunkKey(chunkX, chunkY);

    if (!this.chunks.has(key)) {
      return false;
    }

    this.chunks.delete(key);

    const ref = this.chunkRefs.get(key);
    if (ref) {
      ref.loaded = false;
    }

    this.stats.chunksUnloaded++;
    return true;
  }

  /**
   * Check and unload chunks if over limit
   * @private
   */
  _checkChunkLimit() {
    if (this.chunks.size <= this.config.maxLoadedChunks) {
      return;
    }

    // Sort chunks by last access time
    const sortedRefs = Array.from(this.chunkRefs.entries())
      .filter(([_, ref]) => ref.loaded)
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Unload oldest chunks until under limit
    const toUnload = this.chunks.size - this.config.maxLoadedChunks;

    for (let i = 0; i < toUnload && i < sortedRefs.length; i++) {
      const ref = sortedRefs[i][1];
      this.unloadChunk(ref.chunkX, ref.chunkY);
    }
  }

  /**
   * Update viewer position for chunk loading priority
   * @param {number} x - Viewer X
   * @param {number} y - Viewer Y
   * @param {number} z - Viewer Z
   */
  setViewerPosition(x, y, z) {
    this.viewerPosition = { x, y, z };
  }

  /**
   * Preload chunks around a position
   * @param {number} centerX - Center X
   * @param {number} centerY - Center Y
   * @param {number} radius - Radius in chunks
   * @returns {number} Number of chunks loaded
   */
  preloadArea(centerX, centerY, radius) {
    const { chunkX: centerChunkX, chunkY: centerChunkY } = this.worldToChunk(centerX, centerY);
    let loaded = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const chunkX = centerChunkX + dx;
        const chunkY = centerChunkY + dy;

        if (!this.isChunkLoaded(chunkX, chunkY)) {
          this.getChunk(chunkX, chunkY);
          loaded++;
        }
      }
    }

    return loaded;
  }

  /**
   * Get all loaded chunks
   * @returns {Array<{chunkX: number, chunkY: number, chunk: VoxelChunk}>}
   */
  getLoadedChunks() {
    const result = [];

    this.chunks.forEach((chunk, key) => {
      result.push({
        chunkX: chunk.chunkX,
        chunkY: chunk.chunkY,
        chunk
      });
    });

    return result;
  }

  /**
   * Get all modified chunks (for saving)
   * @returns {Array<VoxelChunk>}
   */
  getModifiedChunks() {
    const modified = [];

    this.modifiedChunks.forEach(key => {
      const chunk = this.chunks.get(key);
      if (chunk) {
        modified.push(chunk);
      }
    });

    return modified;
  }

  /**
   * Clear modified tracking (after save)
   */
  clearModified() {
    this.modifiedChunks.clear();
    this.chunkRefs.forEach(ref => {
      ref.modified = false;
    });
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      currentlyLoaded: this.chunks.size,
      modifiedChunks: this.modifiedChunks.size,
      maxChunks: this.config.maxLoadedChunks
    };
  }

  /**
   * Export world data for saving
   * Only exports modified chunks for efficiency
   * @returns {object}
   */
  toJSON() {
    const chunks = {};

    // Save all modified chunks
    this.modifiedChunks.forEach(key => {
      const chunk = this.chunks.get(key);
      if (chunk) {
        chunks[key] = chunk.toJSON();
      }
    });

    return {
      config: this.config,
      chunks,
      stats: this.stats
    };
  }

  /**
   * Import world data from save
   * @param {object} data - Saved world data
   * @returns {VoxelWorld}
   */
  static fromJSON(data) {
    const world = new VoxelWorld(data.config);

    // Load saved chunks
    if (data.chunks) {
      for (const [key, chunkData] of Object.entries(data.chunks)) {
        const chunk = VoxelChunk.fromJSON(chunkData);
        world.chunks.set(key, chunk);

        const ref = new ChunkRef(chunk.chunkX, chunk.chunkY);
        ref.loaded = true;
        ref.modified = false;
        world.chunkRefs.set(key, ref);
      }
    }

    // Restore stats
    if (data.stats) {
      world.stats = { ...world.stats, ...data.stats };
    }

    return world;
  }

  /**
   * Get number of currently loaded chunks
   * @returns {number}
   */
  getLoadedChunkCount() {
    return this.chunks.size;
  }

  /**
   * Reset world to initial state (clear all chunks)
   */
  reset() {
    this.chunks.clear();
    this.chunkRefs.clear();
    this.modifiedChunks.clear();
    this.viewerPosition = { x: 0, y: 0, z: 0 };
    this.stats = {
      chunksLoaded: 0,
      chunksUnloaded: 0,
      blocksSet: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}
