/**
 * TerrainManager.js - Manages terrain height data in chunks
 *
 * Handles terrain height storage, retrieval, and modification for the game world.
 * Uses a chunk-based system for efficient memory usage and loading/unloading.
 *
 * Part of Phase 1: Core Terrain Generation System
 *
 * Features:
 * - 32x32 tile chunks
 * - Procedural generation on-demand (via WorldGenerator)
 * - Terrain modification tracking (for differential saves)
 * - Building placement support (auto-flatten, region queries)
 * - Integration with GridManager
 *
 * Usage:
 *   const terrainManager = new TerrainManager(worldGenerator);
 *   const height = terrainManager.getHeight(x, z);
 *   terrainManager.flattenRegion(x, z, 3, 3); // For building placement
 */

export class TerrainManager {
  /**
   * Create a terrain manager
   * @param {WorldGenerator} worldGenerator - Generator for procedural terrain
   * @param {object} options - Configuration options
   */
  constructor(worldGenerator = null, options = {}) {
    this.worldGenerator = worldGenerator;

    // Configuration
    this.config = {
      chunkSize: options.chunkSize || 32,           // 32x32 tiles per chunk
      minHeight: options.minHeight || 0,            // Minimum terrain height
      maxHeight: options.maxHeight || 10,           // Maximum terrain height
      defaultHeight: options.defaultHeight || 0,    // Default height for ungenerated terrain
      ...options
    };

    // Chunk storage: Map<chunkKey, TerrainChunk>
    // chunkKey format: "cx,cz" (chunk coordinates)
    this.chunks = new Map();

    // Track modified tiles (for differential saves)
    // Format: Map<tileKey, {x, z, originalHeight, modifiedHeight}>
    this.modifications = new Map();

    // Statistics
    this.stats = {
      chunksLoaded: 0,
      chunksGenerated: 0,
      tilesModified: 0
    };
  }

  /**
   * Get terrain height at world coordinates
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {number} Height value (0-10)
   */
  getHeight(x, z) {
    // Convert world coordinates to chunk coordinates
    const chunkX = Math.floor(x / this.config.chunkSize);
    const chunkZ = Math.floor(z / this.config.chunkSize);
    const chunkKey = `${chunkX},${chunkZ}`;

    // Get or generate chunk
    let chunk = this.chunks.get(chunkKey);
    if (!chunk) {
      chunk = this.generateChunk(chunkX, chunkZ);
      this.chunks.set(chunkKey, chunk);
    }

    // Get tile coordinates within chunk
    const localX = x - chunkX * this.config.chunkSize;
    const localZ = z - chunkZ * this.config.chunkSize;

    // Return height from chunk
    return chunk.getHeight(localX, localZ);
  }

  /**
   * Set terrain height at world coordinates (marks as modified)
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @param {number} height - New height value
   */
  setHeight(x, z, height) {
    // Clamp height to valid range
    height = Math.max(this.config.minHeight, Math.min(this.config.maxHeight, height));

    // Get current height (will generate chunk if needed)
    const originalHeight = this.getHeight(x, z);

    // If height hasn't changed, do nothing
    if (originalHeight === height) {
      return;
    }

    // Convert to chunk coordinates
    const chunkX = Math.floor(x / this.config.chunkSize);
    const chunkZ = Math.floor(z / this.config.chunkSize);
    const chunkKey = `${chunkX},${chunkZ}`;

    // Update chunk
    const chunk = this.chunks.get(chunkKey);
    const localX = x - chunkX * this.config.chunkSize;
    const localZ = z - chunkZ * this.config.chunkSize;
    chunk.setHeight(localX, localZ, height);

    // Track modification for differential saves
    const tileKey = `${x},${z}`;
    if (!this.modifications.has(tileKey)) {
      this.modifications.set(tileKey, {
        x,
        z,
        originalHeight,
        modifiedHeight: height
      });
      this.stats.tilesModified++;
    } else {
      // Update existing modification
      this.modifications.get(tileKey).modifiedHeight = height;
    }
  }

  /**
   * Check if a region is relatively flat (for building placement)
   * @param {number} startX - Top-left X coordinate
   * @param {number} startZ - Top-left Z coordinate
   * @param {number} width - Region width in tiles
   * @param {number} depth - Region depth in tiles
   * @param {number} maxSlopeTolerance - Max allowed height difference (default: 1)
   * @returns {object} {flat: boolean, minHeight: number, maxHeight: number, heightDiff: number}
   */
  isRegionFlat(startX, startZ, width, depth, maxSlopeTolerance = 1) {
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let z = startZ; z < startZ + depth; z++) {
      for (let x = startX; x < startX + width; x++) {
        const height = this.getHeight(x, z);
        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
      }
    }

    const heightDiff = maxHeight - minHeight;

    return {
      flat: heightDiff <= maxSlopeTolerance,
      minHeight,
      maxHeight,
      heightDiff,
      reason: heightDiff > maxSlopeTolerance
        ? `Height difference ${heightDiff} exceeds tolerance ${maxSlopeTolerance}`
        : undefined
    };
  }

  /**
   * Get the average height of a region
   * @param {number} startX - Top-left X coordinate
   * @param {number} startZ - Top-left Z coordinate
   * @param {number} width - Region width in tiles
   * @param {number} depth - Region depth in tiles
   * @returns {number} Average height (rounded)
   */
  getRegionAverageHeight(startX, startZ, width, depth) {
    let totalHeight = 0;
    let count = 0;

    for (let z = startZ; z < startZ + depth; z++) {
      for (let x = startX; x < startX + width; x++) {
        totalHeight += this.getHeight(x, z);
        count++;
      }
    }

    return count > 0 ? Math.round(totalHeight / count) : this.config.defaultHeight;
  }

  /**
   * Flatten a region to a target height (for building placement)
   * @param {number} startX - Top-left X coordinate
   * @param {number} startZ - Top-left Z coordinate
   * @param {number} width - Region width in tiles
   * @param {number} depth - Region depth in tiles
   * @param {number} targetHeight - Height to flatten to (default: average height of region)
   * @returns {object} {success: boolean, cellsChanged: number, flattenedTo: number}
   */
  flattenRegion(startX, startZ, width, depth, targetHeight = null) {
    // If no target height specified, use average
    if (targetHeight === null) {
      targetHeight = this.getRegionAverageHeight(startX, startZ, width, depth);
    }

    let cellsChanged = 0;

    for (let z = startZ; z < startZ + depth; z++) {
      for (let x = startX; x < startX + width; x++) {
        const currentHeight = this.getHeight(x, z);
        if (currentHeight !== targetHeight) {
          this.setHeight(x, z, targetHeight);
          cellsChanged++;
        }
      }
    }

    return {
      success: true,
      cellsChanged,
      flattenedTo: targetHeight
    };
  }

  /**
   * Generate a chunk at the specified chunk coordinates
   * @private
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {TerrainChunk}
   */
  generateChunk(chunkX, chunkZ) {
    const chunk = new TerrainChunk(chunkX, chunkZ, this.config.chunkSize);

    // Generate terrain heights using WorldGenerator
    if (this.worldGenerator) {
      const worldX = chunkX * this.config.chunkSize;
      const worldZ = chunkZ * this.config.chunkSize;

      for (let localZ = 0; localZ < this.config.chunkSize; localZ++) {
        for (let localX = 0; localX < this.config.chunkSize; localX++) {
          const height = this.worldGenerator.generateHeight(
            worldX + localX,
            worldZ + localZ
          );
          chunk.setHeight(localX, localZ, height);
        }
      }
    } else {
      // No generator - use default height
      chunk.fill(this.config.defaultHeight);
    }

    this.stats.chunksGenerated++;
    return chunk;
  }

  /**
   * Unload a chunk (remove from memory)
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {boolean} True if chunk was unloaded
   */
  unloadChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;
    const deleted = this.chunks.delete(chunkKey);
    if (deleted) {
      this.stats.chunksLoaded--;
    }
    return deleted;
  }

  /**
   * Check if a chunk is loaded
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {boolean}
   */
  isChunkLoaded(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;
    return this.chunks.has(chunkKey);
  }

  /**
   * Get all loaded chunk coordinates
   * @returns {Array<{x: number, z: number}>}
   */
  getLoadedChunks() {
    const chunks = [];
    for (const key of this.chunks.keys()) {
      const [x, z] = key.split(',').map(Number);
      chunks.push({ x, z });
    }
    return chunks;
  }

  /**
   * Get all modifications (for differential saves)
   * @returns {Array<{x: number, z: number, originalHeight: number, modifiedHeight: number}>}
   */
  getModifications() {
    return Array.from(this.modifications.values());
  }

  /**
   * Clear all modifications tracking
   */
  clearModifications() {
    this.modifications.clear();
    this.stats.tilesModified = 0;
  }

  /**
   * Export terrain data for saving
   * Includes only modified tiles (differential save)
   * @returns {object}
   */
  toJSON() {
    return {
      config: this.config,
      modifications: Array.from(this.modifications.values()),
      stats: this.stats
    };
  }

  /**
   * Import terrain data from save
   * @param {object} data - Saved terrain data
   * @param {WorldGenerator} worldGenerator - Generator for unmodified terrain
   */
  static fromJSON(data, worldGenerator) {
    const manager = new TerrainManager(worldGenerator, data.config);

    // Restore modifications
    if (data.modifications) {
      data.modifications.forEach(mod => {
        const tileKey = `${mod.x},${mod.z}`;
        manager.modifications.set(tileKey, mod);

        // Apply modification to terrain
        manager.setHeight(mod.x, mod.z, mod.modifiedHeight);
      });
    }

    // Restore stats
    if (data.stats) {
      manager.stats = { ...manager.stats, ...data.stats };
    }

    return manager;
  }

  /**
   * Get statistics about terrain state
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      chunksLoaded: this.chunks.size,
      modificationsCount: this.modifications.size
    };
  }
}

/**
 * TerrainChunk - Represents a 32x32 tile chunk of terrain
 */
export class TerrainChunk {
  /**
   * Create a terrain chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @param {number} size - Chunk size (default: 32)
   */
  constructor(chunkX, chunkZ, size = 32) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.size = size;

    // Height data: 2D array [z][x]
    // Using typed array for memory efficiency
    this.heightData = new Uint8Array(size * size);
  }

  /**
   * Get height at local chunk coordinates
   * @param {number} localX - Local X (0 to size-1)
   * @param {number} localZ - Local Z (0 to size-1)
   * @returns {number}
   */
  getHeight(localX, localZ) {
    if (localX < 0 || localX >= this.size || localZ < 0 || localZ >= this.size) {
      return 0;
    }
    return this.heightData[localZ * this.size + localX];
  }

  /**
   * Set height at local chunk coordinates
   * @param {number} localX - Local X (0 to size-1)
   * @param {number} localZ - Local Z (0 to size-1)
   * @param {number} height - Height value
   */
  setHeight(localX, localZ, height) {
    if (localX < 0 || localX >= this.size || localZ < 0 || localZ >= this.size) {
      return;
    }
    this.heightData[localZ * this.size + localX] = Math.floor(height);
  }

  /**
   * Fill entire chunk with a height value
   * @param {number} height - Height value
   */
  fill(height) {
    const h = Math.floor(height);
    for (let i = 0; i < this.heightData.length; i++) {
      this.heightData[i] = h;
    }
  }

  /**
   * Export chunk data
   * @returns {object}
   */
  toJSON() {
    return {
      chunkX: this.chunkX,
      chunkZ: this.chunkZ,
      size: this.size,
      heightData: Array.from(this.heightData) // Convert Uint8Array to regular array
    };
  }

  /**
   * Import chunk data
   * @param {object} data
   * @returns {TerrainChunk}
   */
  static fromJSON(data) {
    const chunk = new TerrainChunk(data.chunkX, data.chunkZ, data.size);
    chunk.heightData = new Uint8Array(data.heightData);
    return chunk;
  }
}
