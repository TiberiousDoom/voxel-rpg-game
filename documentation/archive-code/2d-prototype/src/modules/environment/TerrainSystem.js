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
import { PropManager } from './PropManager.js';
import { StructureGenerator } from './structures/StructureGenerator.js'; // Phase 3D
import { MicroBiomeSystem } from './MicroBiomeSystem.js'; // Phase 3C
import { WeatherSystem } from './WeatherSystem.js'; // Phase 3C
import { SeasonalSystem } from './SeasonalSystem.js'; // Phase 3C
import { WaterBodySystem } from './WaterBodySystem.js'; // Phase 3B
import { RiverSystem } from './RiverSystem.js'; // Phase 3B
import { SeasonalEventSystem } from '../events/SeasonalEventSystem.js'; // Phase 3 Gameplay
import { StructureInteractionSystem } from '../structures/StructureInteractionSystem.js'; // Phase 3 Gameplay
import biomeConfigs from '../../config/environment/biomeConfigs.js';
import propDefinitions from '../../config/environment/propDefinitions.js';
import structureTemplates from '../../config/environment/structures/structureTemplates.js'; // Phase 3D

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

    // Phase 3: Initialize PropManager
    this.propManager = new PropManager(
      this,              // terrainSystem (for height/biome queries)
      this.biomeManager, // biomeManager (for biome-specific prop rules)
      propDefinitions,   // prop type definitions
      {
        chunkSize,
        minPropDistance: 2,
        maxPropsPerChunk: 200
      }
    );

    // Phase 3D: Initialize StructureGenerator
    this.structureGenerator = new StructureGenerator(
      this,              // terrainSystem (for height/biome queries)
      this.biomeManager, // biomeManager (for biome-specific rules)
      structureTemplates, // structure templates
      {
        chunkSize,
        minStructureDistance: 50,
        maxStructuresPerChunk: 2,
        structureDensity: 0.3,
        spawnProtectionRadius: 100
      }
    );

    // Phase 3C: Initialize MicroBiomeSystem
    this.microBiomeSystem = new MicroBiomeSystem(
      this,              // terrainSystem
      this.biomeManager, // biomeManager
      {
        chunkSize,
        enabled: options.enableMicroBiomes !== false,
        globalRarityMultiplier: 1.0,
        minDistanceBetweenMicroBiomes: 20
      }
    );

    // Phase 3C: Initialize WeatherSystem
    this.weatherSystem = new WeatherSystem(
      this.worldGenerator,
      {
        enableWeather: options.enableWeather !== false,
        weatherChangeDuration: 120000, // 2 minutes
        globalWeather: true
      }
    );

    // Phase 3C: Initialize SeasonalSystem
    this.seasonalSystem = new SeasonalSystem({
      enabled: options.enableSeasons !== false,
      dayLength: 600000, // 10 minutes per day
      daysPerSeason: 30,
      transitionDuration: 3,
      autoProgress: true,
      startSeason: 'spring'
    });

    // Phase 3B: Initialize WaterBodySystem
    this.waterBodySystem = new WaterBodySystem(
      this,              // terrainSystem
      this.biomeManager, // biomeManager
      {
        chunkSize,
        enabled: options.enableWaterBodies !== false,
        waterLevel: 3,
        globalRarityMultiplier: 1.0,
        minDistanceBetweenWaterBodies: 30,
        generateShores: true
      }
    );

    // Phase 3B: Initialize RiverSystem
    this.riverSystem = new RiverSystem(
      this, // terrainSystem
      {
        enabled: options.enableRivers !== false,
        riverDensity: 0.02,
        minElevation: 6,
        maxRiverLength: 200,
        minRiverWidth: 1,
        maxRiverWidth: 4,
        flowAccumulation: true,
        allowMerging: true,
        regionSize: 128
      }
    );

    // Phase 3 Gameplay: Initialize SeasonalEventSystem
    this.seasonalEventSystem = new SeasonalEventSystem(
      this.seasonalSystem,
      {
        enableEvents: options.enableSeasonalEvents !== false,
        eventCheckInterval: 86400000, // Check daily (1 game day = 10 minutes default)
        maxActiveEvents: 2
      }
    );

    // Phase 3 Gameplay: Initialize StructureInteractionSystem
    this.structureInteractionSystem = new StructureInteractionSystem(
      this.structureGenerator,
      {
        minChestsPerStructure: 1,
        maxChestsPerStructure: 3,
        interactionRadius: 2,
        enableRespawn: true,
        respawnTime: 3600000 // 1 hour
      }
    );

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
  update(cameraX, cameraZ, viewportWidth, viewportHeight, deltaTime = 16) {
    const startTime = performance.now();

    const result = this.chunkManager.update(
      cameraX,
      cameraZ,
      viewportWidth,
      viewportHeight
    );

    // Phase 3C: Update weather and seasons
    if (this.weatherSystem) {
      this.weatherSystem.update(deltaTime);
    }

    if (this.seasonalSystem) {
      this.seasonalSystem.update(deltaTime);
    }

    // Phase 3 Gameplay: Update seasonal events
    if (this.seasonalEventSystem) {
      this.seasonalEventSystem.update(deltaTime);
    }

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
      props: this.propManager.getStats(),
      structures: this.structureGenerator?.getStats(),
      microBiomes: this.microBiomeSystem?.getStats(), // Phase 3C
      weather: this.weatherSystem?.getStats(), // Phase 3C
      season: this.seasonalSystem?.getStats(), // Phase 3C
      waterBodies: this.waterBodySystem?.getStats(), // Phase 3B
      rivers: this.riverSystem?.getStats(), // Phase 3B
      seasonalEvents: this.seasonalEventSystem?.getStats(), // Phase 3 Gameplay
      structureInteraction: this.structureInteractionSystem?.getStats(), // Phase 3 Gameplay
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

  /**
   * Get prop manager (for direct access) - Phase 3
   * @returns {PropManager}
   */
  getPropManager() {
    return this.propManager;
  }

  /**
   * Generate props for a chunk - Phase 3
   * Call this when a chunk is loaded
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {Array<Prop>} Generated props
   */
  generatePropsForChunk(chunkX, chunkZ) {
    return this.propManager.generatePropsForChunk(chunkX, chunkZ);
  }

  /**
   * Get props in a region - Phase 3
   * @param {number} startX - Region start X
   * @param {number} startZ - Region start Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @returns {Array<Prop>} Props in region
   */
  getPropsInRegion(startX, startZ, width, depth) {
    return this.propManager.getPropsInRegion(startX, startZ, width, depth);
  }

  /**
   * Get prop at position - Phase 3
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {Prop|null} Prop at position
   */
  getPropAt(x, z) {
    return this.propManager.getPropAt(x, z);
  }

  /**
   * Remove/harvest a prop - Phase 3
   * @param {string} propId - Prop ID
   * @returns {object} {success, resources, prop}
   */
  removeProp(propId) {
    return this.propManager.removeProp(propId);
  }

  // ===== Phase 3D: Structure convenience methods =====

  /**
   * Get structures in a region - Phase 3D
   * @param {number} startX - Region start X
   * @param {number} startZ - Region start Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @returns {Array<Structure>} Structures in region
   */
  getStructuresInRegion(startX, startZ, width, depth) {
    return this.structureGenerator.getStructuresInRegion(startX, startZ, width, depth);
  }

  /**
   * Get structure at position - Phase 3D
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {Structure|null} Structure at position
   */
  getStructureAt(x, z) {
    return this.structureGenerator.getStructureAt(x, z);
  }

  /**
   * Get structure by ID - Phase 3D
   * @param {string} structureId - Structure ID
   * @returns {Structure|null} Structure instance
   */
  getStructureById(structureId) {
    return this.structureGenerator.getStructureById(structureId);
  }

  /**
   * Remove structure - Phase 3D
   * @param {string} structureId - Structure ID
   * @returns {boolean} True if removed
   */
  removeStructure(structureId) {
    return this.structureGenerator.removeStructure(structureId);
  }

  // ===== Phase 3C: Micro-biome convenience methods =====

  /**
   * Get micro-biomes in a region - Phase 3C
   * @param {number} startX - Region start X
   * @param {number} startZ - Region start Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @returns {Array<MicroBiome>} Micro-biomes in region
   */
  getMicroBiomesInRegion(startX, startZ, width, depth) {
    return this.microBiomeSystem.getMicroBiomesInRegion(startX, startZ, width, depth);
  }

  /**
   * Get micro-biome at position - Phase 3C
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {MicroBiome|null} Micro-biome at position
   */
  getMicroBiomeAt(x, z) {
    return this.microBiomeSystem.getMicroBiomeAt(x, z);
  }

  // ===== Phase 3C: Weather convenience methods =====

  /**
   * Get current weather - Phase 3C
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {string} Weather type
   */
  getWeather(x, z) {
    return this.weatherSystem.getCurrentWeather(x, z);
  }

  /**
   * Get weather effects - Phase 3C
   * @returns {object} Weather effects
   */
  getWeatherEffects() {
    return this.weatherSystem.getWeatherEffects();
  }

  /**
   * Set weather manually - Phase 3C
   * @param {string} weatherType - Weather type
   */
  setWeather(weatherType) {
    return this.weatherSystem.setWeather(weatherType);
  }

  /**
   * Get weather system - Phase 3C
   * @returns {WeatherSystem} Weather system instance
   */
  getWeatherSystem() {
    return this.weatherSystem;
  }

  // ===== Phase 3C: Season convenience methods =====

  /**
   * Get current season - Phase 3C
   * @returns {string} Season type
   */
  getCurrentSeason() {
    return this.seasonalSystem.currentSeason;
  }

  /**
   * Get season info - Phase 3C
   * @returns {object} Season information
   */
  getSeasonInfo() {
    return this.seasonalSystem.getCurrentSeasonInfo();
  }

  /**
   * Set season manually - Phase 3C
   * @param {string} season - Season type
   */
  setSeason(season) {
    return this.seasonalSystem.setSeason(season);
  }

  /**
   * Get seasonal system - Phase 3C
   * @returns {SeasonalSystem} Seasonal system instance
   */
  getSeasonalSystem() {
    return this.seasonalSystem;
  }

  /**
   * Get micro-biome system - Phase 3C
   * @returns {MicroBiomeSystem} Micro-biome system instance
   */
  getMicroBiomeSystem() {
    return this.microBiomeSystem;
  }

  // ===== Phase 3B: Water body convenience methods =====

  /**
   * Get water bodies in a region - Phase 3B
   * @param {number} startX - Region start X
   * @param {number} startZ - Region start Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @returns {Array<WaterBody>} Water bodies in region
   */
  getWaterBodiesInRegion(startX, startZ, width, depth) {
    return this.waterBodySystem.getWaterBodiesInRegion(startX, startZ, width, depth);
  }

  /**
   * Get water body at position - Phase 3B
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {WaterBody|null} Water body at position
   */
  getWaterBodyAt(x, z) {
    return this.waterBodySystem.getWaterBodyAt(x, z);
  }

  /**
   * Get water depth at position - Phase 3B
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {number} Water depth (0 if no water)
   */
  getWaterDepth(x, z) {
    return this.waterBodySystem.getWaterDepthAt(x, z);
  }

  /**
   * Check if position is water - Phase 3B
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {boolean} True if water
   */
  isWater(x, z) {
    return this.waterBodySystem.isWater(x, z) || this.riverSystem.isRiver(x, z);
  }

  // ===== Phase 3B: River convenience methods =====

  /**
   * Get rivers in a region - Phase 3B
   * @param {number} startX - Region start X
   * @param {number} startZ - Region start Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @returns {Array<River>} Rivers in region
   */
  getRiversInRegion(startX, startZ, width, depth) {
    return this.riverSystem.getRiversInRegion(startX, startZ, width, depth);
  }

  /**
   * Get river at position - Phase 3B
   * @param {number} x - Tile X
   * @param {number} z - Tile Z
   * @returns {River|null} River at position
   */
  getRiverAt(x, z) {
    return this.riverSystem.getRiverAt(x, z);
  }

  /**
   * Generate rivers for area - Phase 3B
   * @param {number} startX - Region start X
   * @param {number} startZ - Region start Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   */
  generateRiversForArea(startX, startZ, width, depth) {
    return this.riverSystem.generateRiversForArea(startX, startZ, width, depth);
  }

  /**
   * Get water body system - Phase 3B
   * @returns {WaterBodySystem} Water body system instance
   */
  getWaterBodySystem() {
    return this.waterBodySystem;
  }

  /**
   * Get river system - Phase 3B
   * @returns {RiverSystem} River system instance
   */
  getRiverSystem() {
    return this.riverSystem;
  }

  // ===== Phase 3 Gameplay: Seasonal event methods =====

  /**
   * Get seasonal event system - Phase 3 Gameplay
   * @returns {SeasonalEventSystem} Seasonal event system instance
   */
  getSeasonalEventSystem() {
    return this.seasonalEventSystem;
  }

  /**
   * Get active seasonal events - Phase 3 Gameplay
   * @returns {Array<object>} Active events
   */
  getActiveSeasonalEvents() {
    return this.seasonalEventSystem?.getActiveEvents() || [];
  }

  /**
   * Get effect multiplier from active events - Phase 3 Gameplay
   * @param {string} effectType - Effect type (e.g., 'plantGrowth', 'harvestYield')
   * @returns {number} Combined multiplier from all active events
   */
  getEventEffectMultiplier(effectType) {
    return this.seasonalEventSystem?.getEffectMultiplier(effectType) || 1.0;
  }

  // ===== Phase 3 Gameplay: Structure interaction methods =====

  /**
   * Get structure interaction system - Phase 3 Gameplay
   * @returns {StructureInteractionSystem} Structure interaction system instance
   */
  getStructureInteractionSystem() {
    return this.structureInteractionSystem;
  }

  /**
   * Get structure system (alias for compatibility) - Phase 3D
   * @returns {StructureGenerator} Structure generator instance
   */
  getStructureSystem() {
    return this.structureGenerator;
  }

  /**
   * Discover a structure - Phase 3 Gameplay
   * @param {string} structureId - Structure ID
   * @param {object} player - Player object {id, position}
   * @returns {object} Discovery result {success, state, chestCount}
   */
  discoverStructure(structureId, player) {
    return this.structureInteractionSystem?.discoverStructure(structureId, player);
  }

  /**
   * Open a chest - Phase 3 Gameplay
   * @param {string} chestId - Chest ID
   * @param {object} player - Player object {id, position}
   * @returns {object} Interaction result {success, loot, chest}
   */
  openChest(chestId, player) {
    return this.structureInteractionSystem?.openChest(chestId, player);
  }

  /**
   * Get nearby chests - Phase 3 Gameplay
   * @param {object} position - Position {x, z}
   * @param {number} radius - Search radius
   * @returns {Array<object>} Nearby chests with distance
   */
  getNearbyChests(position, radius) {
    return this.structureInteractionSystem?.getNearbyChests(position, radius) || [];
  }

  /**
   * Get exploration state for structure - Phase 3 Gameplay
   * @param {string} structureId - Structure ID
   * @returns {object|null} Exploration state
   */
  getStructureExplorationState(structureId) {
    return this.structureInteractionSystem?.getExplorationState(structureId);
  }
}
