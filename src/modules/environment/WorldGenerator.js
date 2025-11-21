/**
 * WorldGenerator.js - Procedural World Generation
 *
 * Generates procedural terrain, biomes, and features using noise algorithms.
 * Provides deterministic generation (same seed = same world).
 *
 * Part of Phase 1: Core Terrain Generation System
 *
 * Features:
 * - Seed-based deterministic generation
 * - Terrain height generation (Perlin noise)
 * - Biome determination (temperature × moisture)
 * - Configurable generation parameters
 * - Multiple terrain layers (base + detail)
 *
 * Usage:
 *   const generator = new WorldGenerator(12345);
 *   const height = generator.generateHeight(x, z);
 *   const biome = generator.getBiome(x, z);
 */

import { NoiseGenerator } from './NoiseGenerator.js';

/**
 * Biome types based on temperature and moisture
 */
export const BiomeType = {
  OCEAN: 'ocean',           // Very low elevation
  BEACH: 'beach',           // Low elevation near water
  PLAINS: 'plains',         // Flat, low-medium temperature
  FOREST: 'forest',         // Medium moisture, medium temperature
  DESERT: 'desert',         // Low moisture, high temperature
  TUNDRA: 'tundra',         // Low temperature
  MOUNTAINS: 'mountains',   // High elevation
  HILLS: 'hills'            // Medium-high elevation
};

export class WorldGenerator {
  /**
   * Create a world generator
   * @param {number} seed - World seed for deterministic generation
   * @param {object} config - Generation configuration
   */
  constructor(seed = Date.now(), config = {}) {
    this.seed = seed;
    this.config = {
      // Height generation
      heightScale: config.heightScale || 0.02,     // Lower = larger features
      heightOctaves: config.heightOctaves || 4,    // More = more detail
      heightPersistence: config.heightPersistence || 0.5,
      heightLacunarity: config.heightLacunarity || 2.0,
      minHeight: config.minHeight || 0,
      maxHeight: config.maxHeight || 10,

      // Detail layer (adds small variation)
      detailScale: config.detailScale || 0.08,
      detailOctaves: config.detailOctaves || 3,
      detailStrength: config.detailStrength || 0.2, // How much detail affects final height

      // Biome generation
      biomeScale: config.biomeScale || 0.01,       // Very large scale
      biomeOctaves: config.biomeOctaves || 3,
      temperatureScale: config.temperatureScale || 0.008,
      moistureScale: config.moistureScale || 0.015,

      // Elevation thresholds for biomes
      oceanThreshold: config.oceanThreshold || 0.3,
      beachThreshold: config.beachThreshold || 0.4,
      hillsThreshold: config.hillsThreshold || 0.65,
      mountainsThreshold: config.mountainsThreshold || 0.8,

      ...config
    };

    // Initialize noise generators with different seeds for variety
    this.heightNoise = new NoiseGenerator(seed);
    this.detailNoise = new NoiseGenerator(seed + 1);
    this.temperatureNoise = new NoiseGenerator(seed + 2);
    this.moistureNoise = new NoiseGenerator(seed + 3);
    this.biomeNoise = new NoiseGenerator(seed + 4);
  }

  /**
   * Generate terrain height at world coordinates
   * Combines base height with detail layer
   *
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {number} Height value (0-10)
   */
  generateHeight(x, z) {
    // Base height (large-scale features)
    const baseHeight = this.heightNoise.height(x, z, {
      type: 'perlin',
      octaves: this.config.heightOctaves,
      persistence: this.config.heightPersistence,
      lacunarity: this.config.heightLacunarity,
      scale: this.config.heightScale
    });

    // Detail layer (small-scale variation)
    const detail = this.detailNoise.height(x, z, {
      type: 'perlin',
      octaves: this.config.detailOctaves,
      scale: this.config.detailScale
    });

    // Combine base and detail
    // detail is [0,1], convert to [-strength, +strength]
    const detailOffset = (detail - 0.5) * 2 * this.config.detailStrength;
    let finalHeight = baseHeight + detailOffset;

    // Clamp to valid range [0, 1]
    finalHeight = Math.max(0, Math.min(1, finalHeight));

    // Convert to integer height range [minHeight, maxHeight]
    const heightRange = this.config.maxHeight - this.config.minHeight;
    return Math.floor(this.config.minHeight + finalHeight * heightRange);
  }

  /**
   * Get temperature value at world coordinates (for biome determination)
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {number} Temperature value [0, 1] (0=cold, 1=hot)
   */
  getTemperature(x, z) {
    return this.temperatureNoise.height(x, z, {
      type: 'simplex',
      octaves: 2,
      scale: this.config.temperatureScale,
      persistence: 0.5
    });
  }

  /**
   * Get moisture value at world coordinates (for biome determination)
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {number} Moisture value [0, 1] (0=dry, 1=wet)
   */
  getMoisture(x, z) {
    return this.moistureNoise.height(x, z, {
      type: 'simplex',
      octaves: 3,
      scale: this.config.moistureScale,
      persistence: 0.6
    });
  }

  /**
   * Determine biome at world coordinates
   * Uses temperature, moisture, and elevation
   *
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {string} Biome type (from BiomeType enum)
   */
  getBiome(x, z) {
    // Get normalized height (0-1)
    const height = this.generateHeight(x, z);
    const normalizedHeight = (height - this.config.minHeight) /
      (this.config.maxHeight - this.config.minHeight);

    // Elevation-based biomes (override temp/moisture)
    if (normalizedHeight < this.config.oceanThreshold) {
      return BiomeType.OCEAN;
    }
    if (normalizedHeight < this.config.beachThreshold) {
      return BiomeType.BEACH;
    }
    if (normalizedHeight > this.config.mountainsThreshold) {
      return BiomeType.MOUNTAINS;
    }
    if (normalizedHeight > this.config.hillsThreshold) {
      return BiomeType.HILLS;
    }

    // Temperature and moisture-based biomes
    const temperature = this.getTemperature(x, z);
    const moisture = this.getMoisture(x, z);

    // Biome matrix (temperature × moisture)
    // Cold + wet = Tundra
    if (temperature < 0.3) {
      return BiomeType.TUNDRA;
    }
    // Hot + dry = Desert
    else if (temperature > 0.7 && moisture < 0.4) {
      return BiomeType.DESERT;
    }
    // Medium temp + high moisture = Forest
    else if (moisture > 0.6) {
      return BiomeType.FOREST;
    }
    // Default = Plains
    else {
      return BiomeType.PLAINS;
    }
  }

  /**
   * Get biome color for rendering (Phase 1)
   * Returns RGB color array based on biome type
   *
   * @param {string} biome - Biome type
   * @returns {Array<number>} [r, g, b] color (0-255)
   */
  static getBiomeColor(biome) {
    const colors = {
      [BiomeType.OCEAN]: [30, 80, 180],      // Deep blue
      [BiomeType.BEACH]: [240, 220, 130],    // Sandy yellow
      [BiomeType.PLAINS]: [100, 180, 80],    // Green
      [BiomeType.FOREST]: [34, 139, 34],     // Dark green
      [BiomeType.DESERT]: [230, 200, 100],   // Tan
      [BiomeType.TUNDRA]: [200, 220, 230],   // Icy blue-white
      [BiomeType.MOUNTAINS]: [150, 150, 150], // Gray
      [BiomeType.HILLS]: [120, 160, 90]      // Green-brown
    };

    return colors[biome] || colors[BiomeType.PLAINS];
  }

  /**
   * Check if position is suitable for a specific feature type
   * (e.g., tree placement, ore generation)
   *
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @param {string} featureType - Type of feature ('tree', 'ore', etc.)
   * @returns {boolean} True if feature can spawn here
   */
  canSpawnFeature(x, z, featureType) {
    const biome = this.getBiome(x, z);
    const height = this.generateHeight(x, z);

    // Feature-specific rules
    switch (featureType) {
      case 'tree':
        return (biome === BiomeType.FOREST || biome === BiomeType.PLAINS) &&
          height >= this.config.beachThreshold * 10;

      case 'rock':
        return biome === BiomeType.MOUNTAINS || biome === BiomeType.HILLS;

      case 'cactus':
        return biome === BiomeType.DESERT;

      case 'ore':
        // Ores spawn underground (not actually visible in terrain height)
        // This would be for future resource system
        return height > this.config.oceanThreshold * 10;

      default:
        return false;
    }
  }

  /**
   * Get spawn density for a feature type at coordinates
   * Returns probability [0, 1] of feature spawning
   *
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @param {string} featureType - Type of feature
   * @returns {number} Spawn probability [0, 1]
   */
  getFeatureDensity(x, z, featureType) {
    if (!this.canSpawnFeature(x, z, featureType)) {
      return 0;
    }

    const biome = this.getBiome(x, z);

    // Biome-specific density
    const densityMap = {
      tree: {
        [BiomeType.FOREST]: 0.3,
        [BiomeType.PLAINS]: 0.05,
        default: 0
      },
      rock: {
        [BiomeType.MOUNTAINS]: 0.2,
        [BiomeType.HILLS]: 0.1,
        default: 0
      },
      cactus: {
        [BiomeType.DESERT]: 0.08,
        default: 0
      }
    };

    const map = densityMap[featureType] || {};
    return map[biome] || map.default || 0;
  }

  /**
   * Export generator state for saving
   * @returns {object}
   */
  toJSON() {
    return {
      seed: this.seed,
      config: this.config
    };
  }

  /**
   * Restore generator from saved state
   * @param {object} data
   * @returns {WorldGenerator}
   */
  static fromJSON(data) {
    return new WorldGenerator(data.seed, data.config);
  }

  /**
   * Get generation info for debugging
   * @returns {object}
   */
  getInfo() {
    return {
      seed: this.seed,
      config: this.config,
      biomeTypes: Object.values(BiomeType)
    };
  }
}

/**
 * Preset world generation configurations
 */
export const WorldPresets = {
  // Default balanced world
  DEFAULT: {
    heightScale: 0.02,
    heightOctaves: 4,
    detailStrength: 0.2,
    oceanThreshold: 0.3,
    mountainsThreshold: 0.8
  },

  // Flat world (minimal height variation)
  FLAT: {
    heightScale: 0.005,
    heightOctaves: 2,
    detailStrength: 0.05,
    oceanThreshold: 0.2,
    mountainsThreshold: 0.95
  },

  // Mountainous world (extreme elevation)
  MOUNTAINOUS: {
    heightScale: 0.03,
    heightOctaves: 6,
    detailStrength: 0.3,
    oceanThreshold: 0.2,
    mountainsThreshold: 0.6
  },

  // Island world (more ocean)
  ISLANDS: {
    heightScale: 0.015,
    heightOctaves: 4,
    detailStrength: 0.2,
    oceanThreshold: 0.5,
    beachThreshold: 0.55,
    mountainsThreshold: 0.85
  },

  // Desert world (hot and dry)
  DESERT: {
    heightScale: 0.02,
    heightOctaves: 3,
    detailStrength: 0.15,
    temperatureScale: 0.005, // Large hot zones
    moistureScale: 0.02,     // Less moisture variation
    oceanThreshold: 0.25,
    mountainsThreshold: 0.8
  }
};
