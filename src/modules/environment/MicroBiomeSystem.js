/**
 * MicroBiomeSystem.js
 * Generates micro-biomes (small special areas within larger biomes)
 *
 * Phase 3C: Advanced Biome Features
 *
 * Examples:
 * - Oases in deserts (water + palm trees)
 * - Clearings in forests (open grass areas)
 * - Rock formations in plains
 * - Hot springs in tundra
 * - Mushroom circles in forests
 * - Flower patches in plains
 */

import { NoiseGenerator } from './NoiseGenerator.js';

/**
 * Micro-biome types and their properties
 */
export const MicroBiomeType = {
  OASIS: 'oasis',
  CLEARING: 'clearing',
  ROCK_FORMATION: 'rock_formation',
  HOT_SPRING: 'hot_spring',
  MUSHROOM_CIRCLE: 'mushroom_circle',
  FLOWER_PATCH: 'flower_patch',
  CRYSTAL_CLUSTER: 'crystal_cluster',
  ANCIENT_TREE: 'ancient_tree',
};

/**
 * Micro-biome definitions
 */
const MICRO_BIOME_DEFINITIONS = {
  oasis: {
    id: 'oasis',
    name: 'Oasis',
    parentBiomes: ['desert'],
    rarity: 0.05, // 5% chance in eligible chunks
    minRadius: 3,
    maxRadius: 8,
    features: {
      centerFeature: 'water_pool',
      props: ['palm_tree', 'cactus'],
      groundOverride: 'grass',
    },
    description: 'A rare water source in the desert with palm trees',
  },

  clearing: {
    id: 'clearing',
    name: 'Forest Clearing',
    parentBiomes: ['forest'],
    rarity: 0.15,
    minRadius: 4,
    maxRadius: 10,
    features: {
      groundOverride: 'grass',
      props: ['wildflowers', 'small_rock'],
      removeProps: ['tree'], // Remove trees in clearing
    },
    description: 'An open grassy area within the forest',
  },

  rock_formation: {
    id: 'rock_formation',
    name: 'Rock Formation',
    parentBiomes: ['plains', 'desert', 'tundra'],
    rarity: 0.08,
    minRadius: 2,
    maxRadius: 6,
    features: {
      props: ['large_rock', 'boulder'],
      heightVariation: 2, // Raise terrain slightly
    },
    description: 'A cluster of large rocks and boulders',
  },

  hot_spring: {
    id: 'hot_spring',
    name: 'Hot Spring',
    parentBiomes: ['tundra', 'mountains'],
    rarity: 0.03,
    minRadius: 2,
    maxRadius: 5,
    features: {
      centerFeature: 'hot_water',
      props: ['steam_vent'],
      particles: 'steam',
    },
    description: 'A naturally heated pool of water',
  },

  mushroom_circle: {
    id: 'mushroom_circle',
    name: 'Mushroom Circle',
    parentBiomes: ['forest', 'swamp'],
    rarity: 0.1,
    minRadius: 3,
    maxRadius: 7,
    features: {
      props: ['mushroom_large', 'mushroom_small'],
      pattern: 'circle', // Arrange props in circle
    },
    description: 'A mysterious circle of giant mushrooms',
  },

  flower_patch: {
    id: 'flower_patch',
    name: 'Flower Patch',
    parentBiomes: ['plains', 'forest'],
    rarity: 0.2,
    minRadius: 2,
    maxRadius: 5,
    features: {
      props: ['wildflowers', 'tulips', 'roses'],
      colorVariation: true,
    },
    description: 'A colorful patch of wildflowers',
  },

  crystal_cluster: {
    id: 'crystal_cluster',
    name: 'Crystal Cluster',
    parentBiomes: ['mountains', 'desert'],
    rarity: 0.02,
    minRadius: 2,
    maxRadius: 4,
    features: {
      props: ['crystal_large', 'crystal_small'],
      glowEffect: true,
    },
    description: 'A rare formation of glowing crystals',
  },

  ancient_tree: {
    id: 'ancient_tree',
    name: 'Ancient Tree',
    parentBiomes: ['forest', 'plains'],
    rarity: 0.05,
    minRadius: 4,
    maxRadius: 6,
    features: {
      centerFeature: 'ancient_tree_large',
      props: ['vine', 'moss'],
      heightVariation: 1,
    },
    description: 'A massive ancient tree surrounded by vines',
  },
};

/**
 * MicroBiome instance
 */
export class MicroBiome {
  constructor(id, type, definition, position, radius) {
    this.id = id;
    this.type = type;
    this.definition = definition;
    this.position = position; // {x, z}
    this.radius = radius;
    this.createdAt = Date.now();
  }

  /**
   * Check if position is inside micro-biome
   */
  containsPosition(x, z) {
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    const distSq = dx * dx + dz * dz;
    return distSq <= this.radius * this.radius;
  }

  /**
   * Get influence at position (0-1, 1 = center, 0 = edge/outside)
   */
  getInfluence(x, z) {
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist >= this.radius) return 0;

    // Smooth falloff from center to edge
    return 1 - (dist / this.radius);
  }

  /**
   * Get bounds
   */
  getBounds() {
    return {
      left: this.position.x - this.radius,
      right: this.position.x + this.radius,
      top: this.position.z - this.radius,
      bottom: this.position.z + this.radius,
    };
  }
}

/**
 * MicroBiomeSystem - Manages micro-biome generation
 */
export class MicroBiomeSystem {
  constructor(terrainSystem, biomeManager, options = {}) {
    this.terrainSystem = terrainSystem;
    this.biomeManager = biomeManager;

    this.config = {
      chunkSize: terrainSystem?.config?.chunkSize || 32,
      enabled: options.enabled !== false,
      globalRarityMultiplier: options.globalRarityMultiplier || 1.0,
      minDistanceBetweenMicroBiomes: options.minDistanceBetweenMicroBiomes || 20,
      ...options,
    };

    this.definitions = MICRO_BIOME_DEFINITIONS;

    // Storage: chunkKey -> Array<MicroBiome>
    this.chunkMicroBiomes = new Map();

    // Global registry: microBiomeId -> MicroBiome
    this.microBiomesById = new Map();

    // Noise for placement variation
    this.placementNoise = new NoiseGenerator(terrainSystem?.seed || Date.now());

    this.nextMicroBiomeId = 0;

    // Statistics
    this.stats = {
      microBiomesGenerated: 0,
      byType: {},
    };
  }

  /**
   * Generate micro-biomes for a chunk
   */
  generateMicroBiomesForChunk(chunkX, chunkZ) {
    if (!this.config.enabled) return [];

    const chunkKey = `${chunkX},${chunkZ}`;

    // Check if already generated
    if (this.chunkMicroBiomes.has(chunkKey)) {
      return this.chunkMicroBiomes.get(chunkKey);
    }

    const microBiomes = [];
    const chunkSize = this.config.chunkSize;
    const worldX = chunkX * chunkSize;
    const worldZ = chunkZ * chunkSize;

    // Get biome at chunk center
    const centerX = worldX + chunkSize / 2;
    const centerZ = worldZ + chunkSize / 2;
    const biome = this.biomeManager?.getBiomeAt?.(centerX, centerZ) ||
                  this.terrainSystem?.getBiome?.(centerX, centerZ) || 'plains';

    // Get eligible micro-biome types for this biome
    const eligibleTypes = this.getEligibleMicroBiomeTypes(biome);

    if (eligibleTypes.length === 0) {
      this.chunkMicroBiomes.set(chunkKey, microBiomes);
      return microBiomes;
    }

    // Use noise to determine if micro-biomes should spawn
    const spawnChance = this.placementNoise.noise2D(chunkX * 0.07, chunkZ * 0.07) * 0.5 + 0.5;

    for (const definition of eligibleTypes) {
      const adjustedRarity = definition.rarity * this.config.globalRarityMultiplier;

      if (spawnChance < adjustedRarity) {
        // Try to place micro-biome
        const posX = worldX + Math.floor(Math.random() * chunkSize);
        const posZ = worldZ + Math.floor(Math.random() * chunkSize);
        const radius = definition.minRadius +
          Math.floor(Math.random() * (definition.maxRadius - definition.minRadius + 1));

        // Check distance to other micro-biomes
        if (this.hasMinimumDistance(posX, posZ, radius)) {
          const microBiome = new MicroBiome(
            `micro_${this.nextMicroBiomeId++}`,
            definition.id,
            definition,
            { x: posX, z: posZ },
            radius
          );

          microBiomes.push(microBiome);
          this.microBiomesById.set(microBiome.id, microBiome);

          // Update stats
          this.stats.microBiomesGenerated++;
          this.stats.byType[definition.id] = (this.stats.byType[definition.id] || 0) + 1;
        }
      }
    }

    this.chunkMicroBiomes.set(chunkKey, microBiomes);
    return microBiomes;
  }

  /**
   * Get eligible micro-biome types for a biome
   */
  getEligibleMicroBiomeTypes(biome) {
    const eligible = [];

    for (const definitionId in this.definitions) {
      const definition = this.definitions[definitionId];

      if (definition.parentBiomes.includes(biome)) {
        eligible.push(definition);
      }
    }

    return eligible;
  }

  /**
   * Check minimum distance to other micro-biomes
   */
  hasMinimumDistance(x, z, radius) {
    const minDist = this.config.minDistanceBetweenMicroBiomes;

    for (const microBiome of this.microBiomesById.values()) {
      const dx = x - microBiome.position.x;
      const dz = z - microBiome.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const combinedRadius = radius + microBiome.radius;

      if (distance < minDist + combinedRadius) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get micro-biomes in region
   */
  getMicroBiomesInRegion(startX, startZ, width, depth) {
    const microBiomes = [];
    const chunkSize = this.config.chunkSize;

    const minChunkX = Math.floor(startX / chunkSize);
    const maxChunkX = Math.floor((startX + width) / chunkSize);
    const minChunkZ = Math.floor(startZ / chunkSize);
    const maxChunkZ = Math.floor((startZ + depth) / chunkSize);

    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        const chunkKey = `${chunkX},${chunkZ}`;
        let chunkMicroBiomes = this.chunkMicroBiomes.get(chunkKey);

        if (!chunkMicroBiomes) {
          chunkMicroBiomes = this.generateMicroBiomesForChunk(chunkX, chunkZ);
        }

        for (const microBiome of chunkMicroBiomes) {
          const bounds = microBiome.getBounds();

          if (!(bounds.right < startX || bounds.left >= startX + width ||
                bounds.bottom < startZ || bounds.top >= startZ + depth)) {
            microBiomes.push(microBiome);
          }
        }
      }
    }

    return microBiomes;
  }

  /**
   * Get micro-biome at position
   */
  getMicroBiomeAt(x, z) {
    const chunkX = Math.floor(x / this.config.chunkSize);
    const chunkZ = Math.floor(z / this.config.chunkSize);
    const chunkKey = `${chunkX},${chunkZ}`;

    let chunkMicroBiomes = this.chunkMicroBiomes.get(chunkKey);

    if (!chunkMicroBiomes) {
      chunkMicroBiomes = this.generateMicroBiomesForChunk(chunkX, chunkZ);
    }

    for (const microBiome of chunkMicroBiomes) {
      if (microBiome.containsPosition(x, z)) {
        return microBiome;
      }
    }

    return null;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalMicroBiomes: this.microBiomesById.size,
      loadedChunks: this.chunkMicroBiomes.size,
    };
  }

  /**
   * Clear all micro-biomes
   */
  clear() {
    this.chunkMicroBiomes.clear();
    this.microBiomesById.clear();
    this.nextMicroBiomeId = 0;
    this.stats = {
      microBiomesGenerated: 0,
      byType: {},
    };
  }
}

export default MicroBiomeSystem;
