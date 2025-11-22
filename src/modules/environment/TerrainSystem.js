/**
 * TerrainSystem.js - Main terrain system integration
 *
 * Initializes and manages all terrain-related components:
 * - WorldGenerator (procedural generation)
 * - TerrainManager (height data storage)
 * - ChunkManager (viewport culling)
 *
 * Part of Phase 1: Core Terrain Generation System
 *
 * Usage:
 *   const terrainSystem = new TerrainSystem({ seed: 12345 });
 *   terrainSystem.update(cameraX, cameraZ, viewportWidth, viewportHeight);
 *   const height = terrainSystem.getHeight(x, z);
 */

import { WorldGenerator, WorldPresets } from './WorldGenerator.js';
import { TerrainManager } from './TerrainManager.js';
import { ChunkManager } from './ChunkManager.js';
import { BiomeManager } from './BiomeManager.js';
import biomeConfigs from '../../config/environment/biomeConfigs.js';

export class TerrainSystem {
  /**
   * Create a terrain system
   * @param {object} options - System options
   * @param {number} options.seed - World seed (default: random)
   * @param {string} options.preset - World preset name (default: 'DEFAULT')
   * @param {number} options.chunkSize - Chunk size in tiles (default: 32)
   * @param {number} options.tileSize - Tile size in pixels (default: 40)
   * @param {number} options.chunkLoadRadius - Chunks to load around viewport (default: 2)
   * @param {number} options.maxLoadedChunks - Maximum chunks in memory (default: 100)
   */
  constructor(options = {}) {
    const {
      seed = Date.now(),
      preset = 'DEFAULT',
      chunkSize = 32,
      tileSize = 40,
      chunkLoadRadius = 2,
      maxLoadedChunks = 100
    } = options;

    this.seed = seed;
    this.config = {
      chunkSize,
      tileSize,
      chunkLoadRadius,
      maxLoadedChunks,
      useBiomeManager: options.useBiomeManager !== false  // Phase 2: Enable by default
    };

    // Phase 2: Initialize BiomeManager
    this.biomeManager = null;
    if (this.config.useBiomeManager) {
      this.biomeManager = new BiomeManager(seed, biomeConfigs, {
        useVoronoi: true,
        voronoiSpacing: 128,
        distortionStrength: 20,
        blendRadius: 3
      });
    }

    // Initialize world generator with preset and biome manager
    const worldConfig = WorldPresets[preset] || WorldPresets.DEFAULT;
    this.worldGenerator = new WorldGenerator(seed, worldConfig, this.biomeManager);

    // Initialize terrain manager
    this.terrainManager = new TerrainManager(this.worldGenerator, {
      chunkSize,
      minHeight: 0,
      maxHeight: 10
    });

    // Initialize chunk manager
    this.chunkManager = new ChunkManager(this.terrainManager, {
      chunkSize,
      tileSize,
      chunkLoadRadius,
      maxLoadedChunks
    });

    // Statistics
    this.stats = {
      updateCount: 0,
      lastUpdateTime: 0
    };
  }

  /**
   * Update chunk loading based on viewport
   * Call this every frame
   *
   * @param {number} cameraX - Camera X position in world coordinates (pixels)
   * @param {number} cameraZ - Camera Z position in world coordinates (pixels)
   * @param {number} viewportWidth - Viewport width in pixels
   * @param {number} viewportHeight - Viewport height in pixels
   * @returns {object} Update statistics
   */
  update(cameraX, cameraZ, viewportWidth, viewportHeight) {
    const startTime = performance.now();

    const result = this.chunkManager.update(
      cameraX,
      cameraZ,
      viewportWidth,
      viewportHeight
    );

    const elapsed = performance.now() - startTime;

    this.stats.updateCount++;
    this.stats.lastUpdateTime = elapsed;

    return {
      ...result,
      updateTime: elapsed
    };
  }

  /**
   * Get terrain height at world tile coordinates
   * @param {number} x - Tile X coordinate
   * @param {number} z - Tile Z coordinate
   * @returns {number} Height value (0-10)
   */
  getHeight(x, z) {
    return this.terrainManager.getHeight(x, z);
  }

  /**
   * Set terrain height at world tile coordinates
   * @param {number} x - Tile X coordinate
   * @param {number} z - Tile Z coordinate
   * @param {number} height - New height value
   */
  setHeight(x, z, height) {
    this.terrainManager.setHeight(x, z, height);
  }

  /**
   * Get biome at world tile coordinates
   * @param {number} x - Tile X coordinate
   * @param {number} z - Tile Z coordinate
   * @returns {string} Biome type
   */
  getBiome(x, z) {
    return this.worldGenerator.getBiome(x, z);
  }

  /**
   * Check if region is flat enough for building
   * @param {number} startX - Top-left X
   * @param {number} startZ - Top-left Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @param {number} maxSlopeTolerance - Max height difference
   * @returns {object} {flat, minHeight, maxHeight, heightDiff}
   */
  isRegionFlat(startX, startZ, width, depth, maxSlopeTolerance = 1) {
    return this.terrainManager.isRegionFlat(startX, startZ, width, depth, maxSlopeTolerance);
  }

  /**
   * Flatten region for building placement
   * @param {number} startX - Top-left X
   * @param {number} startZ - Top-left Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @param {number} targetHeight - Height to flatten to (default: average)
   * @returns {object} {success, cellsChanged, flattenedTo}
   */
  flattenRegion(startX, startZ, width, depth, targetHeight = null) {
    return this.terrainManager.flattenRegion(startX, startZ, width, depth, targetHeight);
  }

  /**
   * Calculate flatten cost for building placement preview (Phase 3)
   * @param {number} startX - Top-left X
   * @param {number} startZ - Top-left Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @param {number} targetHeight - Height to flatten to (default: average)
   * @returns {object} {targetHeight, totalHeightDiff, cellsAffected, maxHeightDiff, avgHeightDiff}
   */
  calculateFlattenCost(startX, startZ, width, depth, targetHeight = null) {
    return this.terrainManager.calculateFlattenCost(startX, startZ, width, depth, targetHeight);
  }

  /**
   * Raise terrain in a region (Phase 3: Terrain Editing Tools)
   * @param {number} startX - Top-left X
   * @param {number} startZ - Top-left Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @param {number} amount - Amount to raise (default: 1)
   * @returns {object} {success, cellsChanged, minHeight, maxHeight}
   */
  raiseRegion(startX, startZ, width, depth, amount = 1) {
    return this.terrainManager.raiseRegion(startX, startZ, width, depth, amount);
  }

  /**
   * Lower terrain in a region (Phase 3: Terrain Editing Tools)
   * @param {number} startX - Top-left X
   * @param {number} startZ - Top-left Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @param {number} amount - Amount to lower (default: 1)
   * @returns {object} {success, cellsChanged, minHeight, maxHeight}
   */
  lowerRegion(startX, startZ, width, depth, amount = 1) {
    return this.terrainManager.lowerRegion(startX, startZ, width, depth, amount);
  }

  /**
   * Smooth terrain in a region (Phase 3: Terrain Editing Tools)
   * @param {number} startX - Top-left X
   * @param {number} startZ - Top-left Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @param {number} iterations - Number of smoothing passes (default: 1)
   * @returns {object} {success, cellsChanged, iterations}
   */
  smoothRegion(startX, startZ, width, depth, iterations = 1) {
    return this.terrainManager.smoothRegion(startX, startZ, width, depth, iterations);
  }

  /**
   * Track an entity for chunk loading
   * @param {string} entityId - Entity ID
   * @param {number} x - Tile X coordinate
   * @param {number} z - Tile Z coordinate
   */
  trackEntity(entityId, x, z) {
    this.chunkManager.trackEntity(entityId, x, z);
  }

  /**
   * Untrack an entity
   * @param {string} entityId - Entity ID
   */
  untrackEntity(entityId) {
    this.chunkManager.untrackEntity(entityId);
  }

  /**
   * Update entity position (for chunk loading)
   * @param {string} entityId - Entity ID
   * @param {number} x - New tile X coordinate
   * @param {number} z - New tile Z coordinate
   */
  updateEntityPosition(entityId, x, z) {
    this.chunkManager.updateEntityPosition(entityId, x, z);
  }

  /**
   * Get combined statistics
   * @returns {object}
   */
  getStats() {
    return {
      terrain: this.terrainManager.getStats(),
      chunks: this.chunkManager.getStats(),
      world: this.worldGenerator.getInfo(),
      system: this.stats
    };
  }

  /**
   * Export terrain system state for saving
   * @returns {object}
   */
  toJSON() {
    return {
      seed: this.seed,
      config: this.config,
      worldGenerator: this.worldGenerator.toJSON(),
      terrainManager: this.terrainManager.toJSON()
    };
  }

  /**
   * Import terrain system from save
   * @param {object} data - Saved data
   * @returns {TerrainSystem}
   */
  static fromJSON(data) {
    // Restore world generator
    const worldGenerator = WorldGenerator.fromJSON(data.worldGenerator);

    // Restore terrain manager
    const terrainManager = TerrainManager.fromJSON(data.terrainManager, worldGenerator);

    // Create system with restored components
    const system = new TerrainSystem({
      ...data.config,
      seed: data.seed
    });

    // Replace with restored instances
    system.worldGenerator = worldGenerator;
    system.terrainManager = terrainManager;

    // Recreate chunk manager (doesn't need to be saved)
    system.chunkManager = new ChunkManager(terrainManager, data.config);

    return system;
  }

  /**
   * Get terrain manager (for direct access)
   * @returns {TerrainManager}
   */
  getTerrainManager() {
    return this.terrainManager;
  }

  /**
   * Get chunk manager (for direct access)
   * @returns {ChunkManager}
   */
  getChunkManager() {
    return this.chunkManager;
  }

  /**
   * Get world generator (for direct access)
   * @returns {WorldGenerator}
   */
  getWorldGenerator() {
    return this.worldGenerator;
  }

  /**
   * Get biome manager (for direct access) - Phase 2
   * @returns {BiomeManager|null}
   */
  getBiomeManager() {
    return this.biomeManager;
  }
}
