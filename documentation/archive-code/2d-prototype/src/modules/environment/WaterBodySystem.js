/**
 * WaterBodySystem.js
 * Generates and manages water bodies (lakes, ponds, pools)
 *
 * Phase 3B: Water Features Enhancement
 *
 * Features:
 * - Procedural lake generation in low elevation areas
 * - Pond spawning in forests/plains
 * - Hot springs in volcanic/mountain areas
 * - Shore detection and beach generation
 * - Water depth calculations
 */

import { NoiseGenerator } from './NoiseGenerator.js';

/**
 * Water body types
 */
export const WaterBodyType = {
  LAKE: 'lake',
  POND: 'pond',
  POOL: 'pool',
  HOT_SPRING: 'hot_spring',
  OCEAN: 'ocean',
};

/**
 * Water body definitions
 */
const WATER_BODY_DEFINITIONS = {
  lake: {
    id: 'lake',
    name: 'Lake',
    minRadius: 10,
    maxRadius: 30,
    depth: 3,
    allowedBiomes: ['plains', 'forest', 'hills'],
    rarity: 0.05,
    requiresLowElevation: true,
    maxElevation: 4,
  },

  pond: {
    id: 'pond',
    name: 'Pond',
    minRadius: 4,
    maxRadius: 10,
    depth: 2,
    allowedBiomes: ['plains', 'forest', 'swamp'],
    rarity: 0.15,
    requiresLowElevation: true,
    maxElevation: 5,
  },

  pool: {
    id: 'pool',
    name: 'Pool',
    minRadius: 2,
    maxRadius: 5,
    depth: 1,
    allowedBiomes: ['desert', 'plains'],
    rarity: 0.08,
    requiresLowElevation: false,
  },

  hot_spring: {
    id: 'hot_spring',
    name: 'Hot Spring',
    minRadius: 2,
    maxRadius: 6,
    depth: 2,
    allowedBiomes: ['mountains', 'tundra'],
    rarity: 0.03,
    requiresLowElevation: false,
    temperature: 'hot', // Special property
    particles: 'steam',
  },
};

/**
 * Water body instance
 */
export class WaterBody {
  constructor(id, type, definition, position, radius, depth) {
    this.id = id;
    this.type = type;
    this.definition = definition;
    this.position = position; // {x, z} center
    this.radius = radius;
    this.depth = depth;
    this.waterLevel = 3; // Default water level
    this.shore = []; // Array of shore tile positions
    this.createdAt = Date.now();
  }

  /**
   * Check if position is inside water body
   */
  containsPosition(x, z) {
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    const distSq = dx * dx + dz * dz;
    return distSq <= this.radius * this.radius;
  }

  /**
   * Get water depth at position (0 if outside)
   */
  getDepthAt(x, z) {
    if (!this.containsPosition(x, z)) return 0;

    // Calculate depth based on distance from center
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const normalizedDist = dist / this.radius;

    // Depth decreases near edges (smooth falloff)
    const depthFactor = 1 - Math.pow(normalizedDist, 2);
    return this.depth * depthFactor;
  }

  /**
   * Check if position is on shore (edge of water body)
   */
  isShore(x, z) {
    if (!this.containsPosition(x, z)) return false;

    const dx = x - this.position.x;
    const dz = z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Shore is outer 20% of radius
    return dist > this.radius * 0.8;
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
 * WaterBodySystem - Manages water body generation
 */
export class WaterBodySystem {
  constructor(terrainSystem, biomeManager, options = {}) {
    this.terrainSystem = terrainSystem;
    this.biomeManager = biomeManager;

    this.config = {
      chunkSize: terrainSystem?.config?.chunkSize || 32,
      enabled: options.enabled !== false,
      waterLevel: options.waterLevel || 3, // Default water level
      globalRarityMultiplier: options.globalRarityMultiplier || 1.0,
      minDistanceBetweenWaterBodies: options.minDistanceBetweenWaterBodies || 30,
      generateShores: options.generateShores !== false,
      ...options,
    };

    this.definitions = WATER_BODY_DEFINITIONS;

    // Storage: chunkKey -> Array<WaterBody>
    this.chunkWaterBodies = new Map();

    // Global registry: waterBodyId -> WaterBody
    this.waterBodiesById = new Map();

    // Noise for placement variation
    this.placementNoise = new NoiseGenerator(terrainSystem?.seed || Date.now());

    this.nextWaterBodyId = 0;

    // Statistics
    this.stats = {
      waterBodiesGenerated: 0,
      byType: {},
    };
  }

  /**
   * Generate water bodies for a chunk
   */
  generateWaterBodiesForChunk(chunkX, chunkZ) {
    if (!this.config.enabled) return [];

    const chunkKey = `${chunkX},${chunkZ}`;

    // Check if already generated
    if (this.chunkWaterBodies.has(chunkKey)) {
      return this.chunkWaterBodies.get(chunkKey);
    }

    const waterBodies = [];
    const chunkSize = this.config.chunkSize;
    const worldX = chunkX * chunkSize;
    const worldZ = chunkZ * chunkSize;

    // Get biome at chunk center
    const centerX = worldX + chunkSize / 2;
    const centerZ = worldZ + chunkSize / 2;
    const biome = this.biomeManager?.getBiomeAt?.(centerX, centerZ) ||
                  this.terrainSystem?.getBiome?.(centerX, centerZ) || 'plains';

    // Get eligible water body types for this biome
    const eligibleTypes = this.getEligibleWaterBodyTypes(biome);

    if (eligibleTypes.length === 0) {
      this.chunkWaterBodies.set(chunkKey, waterBodies);
      return waterBodies;
    }

    // Use noise to determine if water bodies should spawn
    const spawnChance = this.placementNoise.noise2D(chunkX * 0.05, chunkZ * 0.05) * 0.5 + 0.5;

    for (const definition of eligibleTypes) {
      const adjustedRarity = definition.rarity * this.config.globalRarityMultiplier;

      if (spawnChance < adjustedRarity) {
        // Try to place water body
        const posX = worldX + Math.floor(Math.random() * chunkSize);
        const posZ = worldZ + Math.floor(Math.random() * chunkSize);
        const radius = definition.minRadius +
          Math.floor(Math.random() * (definition.maxRadius - definition.minRadius + 1));
        const depth = definition.depth;

        // Check terrain suitability
        if (this.canPlaceWaterBody(definition, posX, posZ, radius)) {
          const waterBody = new WaterBody(
            `water_${this.nextWaterBodyId++}`,
            definition.id,
            definition,
            { x: posX, z: posZ },
            radius,
            depth
          );

          waterBody.waterLevel = this.config.waterLevel;

          // Generate shore if enabled
          if (this.config.generateShores) {
            waterBody.shore = this.generateShore(waterBody);
          }

          waterBodies.push(waterBody);
          this.waterBodiesById.set(waterBody.id, waterBody);

          // Update stats
          this.stats.waterBodiesGenerated++;
          this.stats.byType[definition.id] = (this.stats.byType[definition.id] || 0) + 1;
        }
      }
    }

    this.chunkWaterBodies.set(chunkKey, waterBodies);
    return waterBodies;
  }

  /**
   * Get eligible water body types for a biome
   */
  getEligibleWaterBodyTypes(biome) {
    const eligible = [];

    for (const definitionId in this.definitions) {
      const definition = this.definitions[definitionId];

      if (definition.allowedBiomes.includes(biome)) {
        eligible.push(definition);
      }
    }

    return eligible;
  }

  /**
   * Check if water body can be placed at position
   */
  canPlaceWaterBody(definition, x, z, radius) {
    if (!this.terrainSystem) return true;

    // Check elevation if required
    if (definition.requiresLowElevation) {
      const height = this.terrainSystem.getHeight(x, z);
      if (height > definition.maxElevation) {
        return false;
      }
    }

    // Check distance to other water bodies
    if (!this.hasMinimumDistance(x, z, radius)) {
      return false;
    }

    return true;
  }

  /**
   * Check minimum distance to other water bodies
   */
  hasMinimumDistance(x, z, radius) {
    const minDist = this.config.minDistanceBetweenWaterBodies;

    for (const waterBody of this.waterBodiesById.values()) {
      const dx = x - waterBody.position.x;
      const dz = z - waterBody.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const combinedRadius = radius + waterBody.radius;

      if (distance < minDist + combinedRadius) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate shore tiles for water body
   */
  generateShore(waterBody) {
    const shore = [];
    const radius = waterBody.radius;
    const centerX = waterBody.position.x;
    const centerZ = waterBody.position.z;

    // Sample points around the perimeter
    const numPoints = Math.floor(radius * 8); // More points for larger radius

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const shoreX = Math.round(centerX + Math.cos(angle) * radius);
      const shoreZ = Math.round(centerZ + Math.sin(angle) * radius);

      shore.push({ x: shoreX, z: shoreZ });
    }

    return shore;
  }

  /**
   * Get water bodies in region
   */
  getWaterBodiesInRegion(startX, startZ, width, depth) {
    const waterBodies = [];
    const chunkSize = this.config.chunkSize;

    const minChunkX = Math.floor(startX / chunkSize);
    const maxChunkX = Math.floor((startX + width) / chunkSize);
    const minChunkZ = Math.floor(startZ / chunkSize);
    const maxChunkZ = Math.floor((startZ + depth) / chunkSize);

    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        const chunkKey = `${chunkX},${chunkZ}`;
        let chunkWaterBodies = this.chunkWaterBodies.get(chunkKey);

        if (!chunkWaterBodies) {
          chunkWaterBodies = this.generateWaterBodiesForChunk(chunkX, chunkZ);
        }

        for (const waterBody of chunkWaterBodies) {
          const bounds = waterBody.getBounds();

          if (!(bounds.right < startX || bounds.left >= startX + width ||
                bounds.bottom < startZ || bounds.top >= startZ + depth)) {
            waterBodies.push(waterBody);
          }
        }
      }
    }

    return waterBodies;
  }

  /**
   * Get water body at position
   */
  getWaterBodyAt(x, z) {
    const chunkX = Math.floor(x / this.config.chunkSize);
    const chunkZ = Math.floor(z / this.config.chunkSize);
    const chunkKey = `${chunkX},${chunkZ}`;

    let chunkWaterBodies = this.chunkWaterBodies.get(chunkKey);

    if (!chunkWaterBodies) {
      chunkWaterBodies = this.generateWaterBodiesForChunk(chunkX, chunkZ);
    }

    for (const waterBody of chunkWaterBodies) {
      if (waterBody.containsPosition(x, z)) {
        return waterBody;
      }
    }

    return null;
  }

  /**
   * Get water depth at position (0 if no water)
   */
  getWaterDepthAt(x, z) {
    const waterBody = this.getWaterBodyAt(x, z);
    return waterBody ? waterBody.getDepthAt(x, z) : 0;
  }

  /**
   * Check if position is water
   */
  isWater(x, z) {
    return this.getWaterBodyAt(x, z) !== null;
  }

  /**
   * Check if position is shore
   */
  isShore(x, z) {
    const waterBody = this.getWaterBodyAt(x, z);
    return waterBody ? waterBody.isShore(x, z) : false;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalWaterBodies: this.waterBodiesById.size,
      loadedChunks: this.chunkWaterBodies.size,
    };
  }

  /**
   * Clear all water bodies
   */
  clear() {
    this.chunkWaterBodies.clear();
    this.waterBodiesById.clear();
    this.nextWaterBodyId = 0;
    this.stats = {
      waterBodiesGenerated: 0,
      byType: {},
    };
  }
}

export default WaterBodySystem;
