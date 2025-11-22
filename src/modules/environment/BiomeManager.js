/**
 * BiomeManager.js - Biome Generation and Management
 *
 * Implements biome generation using Voronoi diagrams with noise-based
 * distortion for organic, natural-looking biome boundaries.
 *
 * Part of Phase 2: Biome System
 *
 * Features:
 * - Voronoi diagram generation for biome regions
 * - Noise-based boundary distortion (irregular shapes)
 * - Biome type assignment based on region properties
 * - Smooth biome blending at boundaries
 * - Configuration-driven biome definitions
 * - Temperature and moisture-based fallback
 *
 * Usage:
 *   const biomeManager = new BiomeManager(seed, biomeConfigs);
 *   const biome = biomeManager.getBiomeAt(x, z);
 *   const blended = biomeManager.getBlendedBiomes(x, z);
 */

import { NoiseGenerator } from './NoiseGenerator.js';

/**
 * Default biome types if no config provided
 */
export const BiomeType = {
  OCEAN: 'ocean',
  BEACH: 'beach',
  PLAINS: 'plains',
  FOREST: 'forest',
  DESERT: 'desert',
  TUNDRA: 'tundra',
  MOUNTAINS: 'mountains',
  SWAMP: 'swamp'
};

/**
 * Voronoi seed point for biome region
 */
class VoronoiSeed {
  constructor(x, z, biomeType, temperature, moisture) {
    this.x = x;
    this.z = z;
    this.biomeType = biomeType;
    this.temperature = temperature;  // -1 to 1 (cold to hot)
    this.moisture = moisture;        // -1 to 1 (dry to wet)
  }

  /**
   * Get squared distance to a point (faster than sqrt for comparisons)
   */
  distanceSquared(x, z) {
    const dx = this.x - x;
    const dz = this.z - z;
    return dx * dx + dz * dz;
  }

  /**
   * Get actual distance to a point
   */
  distance(x, z) {
    return Math.sqrt(this.distanceSquared(x, z));
  }
}

export class BiomeManager {
  /**
   * Create a biome manager
   * @param {number} seed - World seed for deterministic generation
   * @param {object} biomeConfigs - Map of biome ID to configuration
   * @param {object} options - Configuration options
   */
  constructor(seed = Date.now(), biomeConfigs = {}, options = {}) {
    this.seed = seed;
    this.biomeConfigs = biomeConfigs;

    // Configuration
    this.config = {
      // Voronoi generation
      voronoiSpacing: options.voronoiSpacing || 128,    // Distance between seed points
      voronoiJitter: options.voronoiJitter || 0.5,      // Random offset amount (0-1)

      // Noise distortion for irregular boundaries
      distortionScale: options.distortionScale || 0.03,  // Noise scale for boundary distortion
      distortionStrength: options.distortionStrength || 20, // How much to distort boundaries (tiles)

      // Biome blending
      blendRadius: options.blendRadius || 3,             // Tiles to blend at boundaries
      blendSmoothness: options.blendSmoothness || 0.5,   // 0-1, higher = smoother

      // Temperature and moisture (fallback approach)
      useVoronoi: options.useVoronoi !== false,          // Use Voronoi (default: true)
      temperatureScale: options.temperatureScale || 0.008,
      moistureScale: options.moistureScale || 0.015,

      // Region scanning (for Voronoi)
      scanRadius: options.scanRadius || 3,               // How many Voronoi cells to check

      ...options
    };

    // Initialize noise generators
    this.temperatureNoise = new NoiseGenerator(seed + 100);
    this.moistureNoise = new NoiseGenerator(seed + 200);
    this.distortionNoise = new NoiseGenerator(seed + 300);
    this.voronoiNoise = new NoiseGenerator(seed + 400);  // For Voronoi seed placement

    // Voronoi seed points (generated lazily per region)
    this.voronoiSeeds = new Map();  // Map<regionKey, Array<VoronoiSeed>>
    this.regionSize = this.config.voronoiSpacing * 2;  // Size of each region grid

    // Biome assignment cache
    this.biomeCache = new Map();  // Map<tileKey, biomeType>

    // Statistics
    this.stats = {
      biomeQueries: 0,
      cacheHits: 0,
      voronoiRegionsGenerated: 0
    };
  }

  /**
   * Get temperature at world coordinates
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {number} Temperature [-1, 1] (-1=cold, 1=hot)
   */
  getTemperature(x, z) {
    const noise = this.temperatureNoise.height(x, z, {
      type: 'simplex',
      octaves: 3,
      scale: this.config.temperatureScale,
      persistence: 0.5
    });

    // Convert from [0,1] to [-1,1]
    return noise * 2 - 1;
  }

  /**
   * Get moisture at world coordinates
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {number} Moisture [-1, 1] (-1=dry, 1=wet)
   */
  getMoisture(x, z) {
    const noise = this.moistureNoise.height(x, z, {
      type: 'simplex',
      octaves: 3,
      scale: this.config.moistureScale,
      persistence: 0.6
    });

    // Convert from [0,1] to [-1,1]
    return noise * 2 - 1;
  }

  /**
   * Get biome type at world coordinates
   * Uses Voronoi diagrams if enabled, otherwise temperature×moisture fallback
   *
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {string} Biome type ID
   */
  getBiomeAt(x, z) {
    this.stats.biomeQueries++;

    // Check cache first
    const tileKey = `${x},${z}`;
    if (this.biomeCache.has(tileKey)) {
      this.stats.cacheHits++;
      return this.biomeCache.get(tileKey);
    }

    let biomeType;

    if (this.config.useVoronoi) {
      biomeType = this.getVoronoiBiome(x, z);
    } else {
      biomeType = this.getTemperatureMoistureBiome(x, z);
    }

    // Cache result
    this.biomeCache.set(tileKey, biomeType);

    return biomeType;
  }

  /**
   * Get biome using Voronoi diagram approach
   * @private
   */
  getVoronoiBiome(x, z) {
    // Apply noise distortion to coordinates for irregular boundaries
    const distortionX = this.distortionNoise.height(x, z, {
      type: 'perlin',
      octaves: 2,
      scale: this.config.distortionScale
    });
    const distortionZ = this.distortionNoise.height(z, x, {
      type: 'perlin',
      octaves: 2,
      scale: this.config.distortionScale
    });

    // Apply distortion (convert [0,1] to [-strength, +strength])
    const distortedX = x + (distortionX - 0.5) * 2 * this.config.distortionStrength;
    const distortedZ = z + (distortionZ - 0.5) * 2 * this.config.distortionStrength;

    // Find closest Voronoi seed point
    const nearbySeeds = this.getNearbyVoronoiSeeds(distortedX, distortedZ);

    if (nearbySeeds.length === 0) {
      // Fallback if no seeds found (shouldn't happen)
      return this.getTemperatureMoistureBiome(x, z);
    }

    // Find closest seed (Voronoi cell determination)
    let closestSeed = nearbySeeds[0];
    let closestDistSq = closestSeed.distanceSquared(distortedX, distortedZ);

    for (let i = 1; i < nearbySeeds.length; i++) {
      const distSq = nearbySeeds[i].distanceSquared(distortedX, distortedZ);
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestSeed = nearbySeeds[i];
      }
    }

    return closestSeed.biomeType;
  }

  /**
   * Get biome using temperature×moisture fallback approach
   * @private
   */
  getTemperatureMoistureBiome(x, z) {
    const temp = this.getTemperature(x, z);
    const moisture = this.getMoisture(x, z);

    // Simple temperature×moisture lookup
    // Cold
    if (temp < -0.3) {
      return BiomeType.TUNDRA;
    }

    // Hot
    if (temp > 0.5) {
      return moisture < -0.2 ? BiomeType.DESERT : BiomeType.SWAMP;
    }

    // Temperate
    return moisture > 0.2 ? BiomeType.FOREST : BiomeType.PLAINS;
  }

  /**
   * Get nearby Voronoi seed points for a position
   * Generates seeds lazily for regions as needed
   * @private
   */
  getNearbyVoronoiSeeds(x, z) {
    const seeds = [];

    // Determine which region grid cells to scan
    const centerRegionX = Math.floor(x / this.regionSize);
    const centerRegionZ = Math.floor(z / this.regionSize);

    // Scan nearby regions (3x3 grid around center)
    for (let regionZ = centerRegionZ - 1; regionZ <= centerRegionZ + 1; regionZ++) {
      for (let regionX = centerRegionX - 1; regionX <= centerRegionX + 1; regionX++) {
        const regionSeeds = this.getRegionVoronoiSeeds(regionX, regionZ);
        seeds.push(...regionSeeds);
      }
    }

    return seeds;
  }

  /**
   * Get or generate Voronoi seeds for a region
   * @private
   */
  getRegionVoronoiSeeds(regionX, regionZ) {
    const regionKey = `${regionX},${regionZ}`;

    if (this.voronoiSeeds.has(regionKey)) {
      return this.voronoiSeeds.get(regionKey);
    }

    // Generate seeds for this region
    const seeds = [];
    const spacing = this.config.voronoiSpacing;
    const jitter = this.config.voronoiJitter;

    // Number of seeds per region (2x2 grid = 4 seeds per region)
    const seedsPerRegionSide = 2;

    for (let sz = 0; sz < seedsPerRegionSide; sz++) {
      for (let sx = 0; sx < seedsPerRegionSide; sx++) {
        // Base position in world coordinates
        const baseX = regionX * this.regionSize + sx * spacing + spacing / 2;
        const baseZ = regionZ * this.regionSize + sz * spacing + spacing / 2;

        // Add jittered offset using noise (deterministic)
        const jitterX = this.voronoiNoise.height(baseX, baseZ, {
          type: 'simplex',
          scale: 0.001,
          octaves: 1
        });
        const jitterZ = this.voronoiNoise.height(baseZ, baseX, {
          type: 'simplex',
          scale: 0.001,
          octaves: 1
        });

        // Apply jitter (convert [0,1] to [-jitter*spacing, +jitter*spacing])
        const seedX = baseX + (jitterX - 0.5) * 2 * jitter * spacing;
        const seedZ = baseZ + (jitterZ - 0.5) * 2 * jitter * spacing;

        // Determine biome type for this seed based on temperature and moisture
        const temp = this.getTemperature(seedX, seedZ);
        const moisture = this.getMoisture(seedX, seedZ);
        const biomeType = this.determineBiomeType(temp, moisture);

        seeds.push(new VoronoiSeed(seedX, seedZ, biomeType, temp, moisture));
      }
    }

    this.voronoiSeeds.set(regionKey, seeds);
    this.stats.voronoiRegionsGenerated++;

    return seeds;
  }

  /**
   * Determine biome type from temperature and moisture values
   * @private
   */
  determineBiomeType(temperature, moisture) {
    // Temperature ranges: cold < -0.3, temperate -0.3 to 0.5, hot > 0.5
    // Moisture ranges: dry < -0.2, medium -0.2 to 0.3, wet > 0.3

    // Cold regions
    if (temperature < -0.3) {
      return BiomeType.TUNDRA;
    }

    // Hot regions
    if (temperature > 0.5) {
      if (moisture < -0.2) {
        return BiomeType.DESERT;
      } else if (moisture > 0.3) {
        return BiomeType.SWAMP;
      } else {
        return BiomeType.PLAINS;  // Hot plains
      }
    }

    // Temperate regions
    if (moisture < -0.2) {
      return BiomeType.PLAINS;  // Dry plains
    } else if (moisture > 0.3) {
      return BiomeType.FOREST;  // Wet forest
    } else {
      return BiomeType.PLAINS;  // Medium plains
    }
  }

  /**
   * Get blended biomes at a position (for smooth transitions)
   * Returns array of {biome, weight} objects
   *
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {Array<{biome: string, weight: number}>} Biomes with weights
   */
  getBlendedBiomes(x, z) {
    const centerBiome = this.getBiomeAt(x, z);
    const blendRadius = this.config.blendRadius;

    // Sample surrounding tiles in a circle
    const biomeCounts = new Map();
    const totalSamples = (blendRadius * 2 + 1) * (blendRadius * 2 + 1);

    for (let dz = -blendRadius; dz <= blendRadius; dz++) {
      for (let dx = -blendRadius; dx <= blendRadius; dx++) {
        // Only sample within circular radius
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > blendRadius) continue;

        const biome = this.getBiomeAt(x + dx, z + dz);

        // Weight by distance (closer = more weight)
        const weight = 1.0 - (dist / blendRadius) * this.config.blendSmoothness;

        const current = biomeCounts.get(biome) || 0;
        biomeCounts.set(biome, current + weight);
      }
    }

    // Normalize weights
    const totalWeight = Array.from(biomeCounts.values()).reduce((sum, w) => sum + w, 0);

    return Array.from(biomeCounts.entries())
      .map(([biome, weight]) => ({
        biome,
        weight: weight / totalWeight
      }))
      .sort((a, b) => b.weight - a.weight);  // Sort by weight descending
  }

  /**
   * Get biome configuration by ID
   * @param {string} biomeId - Biome ID
   * @returns {object} Biome configuration
   */
  getBiomeConfig(biomeId) {
    return this.biomeConfigs[biomeId] || null;
  }

  /**
   * Get all available biome IDs
   * @returns {Array<string>} Array of biome IDs
   */
  getAllBiomeIds() {
    return Object.keys(this.biomeConfigs);
  }

  /**
   * Clear biome cache (call when settings change)
   */
  clearCache() {
    this.biomeCache.clear();
  }

  /**
   * Get statistics
   * @returns {object} Statistics object
   */
  getStatistics() {
    const cacheHitRate = this.stats.biomeQueries > 0
      ? (this.stats.cacheHits / this.stats.biomeQueries * 100).toFixed(1)
      : 0;

    return {
      ...this.stats,
      cacheSize: this.biomeCache.size,
      voronoiSeedsCount: Array.from(this.voronoiSeeds.values()).reduce((sum, seeds) => sum + seeds.length, 0),
      cacheHitRate: `${cacheHitRate}%`
    };
  }

  /**
   * Serialize biome manager state (minimal - just config)
   * @returns {object} Serialized state
   */
  serialize() {
    return {
      seed: this.seed,
      config: { ...this.config },
      // Don't serialize cache or Voronoi seeds (regenerate on load)
    };
  }

  /**
   * Deserialize biome manager state
   * @param {object} data - Serialized data
   * @param {object} biomeConfigs - Biome configurations
   * @returns {BiomeManager} New BiomeManager instance
   */
  static deserialize(data, biomeConfigs) {
    return new BiomeManager(data.seed, biomeConfigs, data.config);
  }
}
