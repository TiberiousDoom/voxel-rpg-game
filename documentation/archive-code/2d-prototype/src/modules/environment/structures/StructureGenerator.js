/**
 * StructureGenerator.js
 * Manages structure generation, placement, and spawning
 *
 * Phase 3D: Structure Generation
 */

import { Structure } from './Structure.js';
import { NoiseGenerator } from '../NoiseGenerator.js';

/**
 * StructureGenerator - Handles structure placement and management
 */
export class StructureGenerator {
  constructor(terrainSystem, biomeManager, structureTemplates = {}, options = {}) {
    this.terrainSystem = terrainSystem;
    this.biomeManager = biomeManager;
    this.structureTemplates = structureTemplates;

    this.config = {
      chunkSize: terrainSystem?.config.chunkSize || 32,
      minStructureDistance: options.minStructureDistance || 50, // tiles between structures
      maxStructuresPerChunk: options.maxStructuresPerChunk || 2,
      structureDensity: options.structureDensity || 0.3, // 0-1, chance to spawn
      spawnProtectionRadius: options.spawnProtectionRadius || 100, // No structures near spawn
      ...options
    };

    // Structure storage (chunkKey -> Array<Structure>)
    this.chunkStructures = new Map();

    // Global structure registry (structureId -> Structure)
    this.structuresById = new Map();

    // Noise for structure placement variation
    this.placementNoise = new NoiseGenerator(terrainSystem?.seed || Date.now());

    this.nextStructureId = 0;

    // Statistics
    this.stats = {
      structuresGenerated: 0,
      structuresByType: {},
      structuresByBiome: {},
    };
  }

  /**
   * Generate structures for a chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {Array<Structure>} Generated structures
   */
  generateStructuresForChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;

    // Check if already generated
    if (this.chunkStructures.has(chunkKey)) {
      return this.chunkStructures.get(chunkKey);
    }

    const structures = [];
    const chunkSize = this.config.chunkSize;
    const worldX = chunkX * chunkSize;
    const worldZ = chunkZ * chunkSize;

    // Check spawn protection
    if (this.isNearSpawn(worldX, worldZ)) {
      this.chunkStructures.set(chunkKey, structures);
      return structures;
    }

    // Get biome at chunk center
    const centerX = worldX + chunkSize / 2;
    const centerZ = worldZ + chunkSize / 2;
    const biome = this.biomeManager?.getBiomeAt?.(centerX, centerZ) ||
                  this.terrainSystem?.getBiome?.(centerX, centerZ) || 'plains';

    // Use noise to determine if structures should spawn here
    const spawnChance = this.placementNoise.noise2D(chunkX * 0.1, chunkZ * 0.1) * 0.5 + 0.5;

    if (spawnChance < this.config.structureDensity) {
      this.chunkStructures.set(chunkKey, structures);
      return structures;
    }

    // Get eligible structure types for this biome
    const eligibleTemplates = this.getTemplatesForBiome(biome);

    if (eligibleTemplates.length === 0) {
      this.chunkStructures.set(chunkKey, structures);
      return structures;
    }

    // Try to place structures
    const maxAttempts = this.config.maxStructuresPerChunk * 3;
    let attempts = 0;

    while (structures.length < this.config.maxStructuresPerChunk && attempts < maxAttempts) {
      attempts++;

      // Random position within chunk
      const localX = Math.floor(Math.random() * chunkSize);
      const localZ = Math.floor(Math.random() * chunkSize);
      const posX = worldX + localX;
      const posZ = worldZ + localZ;

      // Select random template
      const template = eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)];

      // Check if valid placement
      if (this.canPlaceStructure(template, posX, posZ, biome)) {
        // Random rotation
        const rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)];

        // Create structure
        const structure = new Structure(
          `struct_${this.nextStructureId++}`,
          template.id,
          template,
          { x: posX, z: posZ },
          rotation
        );

        structures.push(structure);
        this.structuresById.set(structure.id, structure);

        // Update stats
        this.stats.structuresGenerated++;
        this.stats.structuresByType[template.id] = (this.stats.structuresByType[template.id] || 0) + 1;
        this.stats.structuresByBiome[biome] = (this.stats.structuresByBiome[biome] || 0) + 1;
      }
    }

    // Store structures for this chunk
    this.chunkStructures.set(chunkKey, structures);

    return structures;
  }

  /**
   * Get structure templates eligible for a biome
   * @param {string} biome - Biome name
   * @returns {Array} Array of eligible templates
   */
  getTemplatesForBiome(biome) {
    const templates = [];

    for (const templateId in this.structureTemplates) {
      const template = this.structureTemplates[templateId];

      // Check if template can spawn in this biome
      if (!template.biomes || template.biomes.includes(biome) || template.biomes.includes('any')) {
        // Check rarity
        const rarity = template.rarity || 1.0;
        if (Math.random() < rarity) {
          templates.push(template);
        }
      }
    }

    return templates;
  }

  /**
   * Check if structure can be placed at position
   * @param {object} template - Structure template
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @param {string} biome - Biome at location
   * @returns {boolean}
   */
  canPlaceStructure(template, x, z, biome) {
    // Check terrain suitability
    if (!this.isTerrainSuitable(template, x, z)) {
      return false;
    }

    // Check distance to other structures
    if (!this.hasMinimumDistance(x, z, template.width, template.height)) {
      return false;
    }

    // Check bounds (must fit within reasonable world bounds)
    const maxCoord = 10000; // Reasonable world limit
    if (x < 0 || z < 0 || x + template.width > maxCoord || z + template.height > maxCoord) {
      return false;
    }

    return true;
  }

  /**
   * Check if terrain is suitable for structure
   * @param {object} template - Structure template
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {boolean}
   */
  isTerrainSuitable(template, x, z) {
    if (!this.terrainSystem) return true;

    const width = template.width;
    const height = template.height;

    // Sample terrain heights at structure corners
    const heights = [
      this.terrainSystem.getHeight(x, z),
      this.terrainSystem.getHeight(x + width - 1, z),
      this.terrainSystem.getHeight(x, z + height - 1),
      this.terrainSystem.getHeight(x + width - 1, z + height - 1),
    ];

    // Check all heights are valid
    if (heights.some(h => h === null || h === undefined)) {
      return false;
    }

    // Check terrain is relatively flat
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const heightDiff = maxHeight - minHeight;

    const maxAllowedDiff = template.maxHeightVariation || 2;
    if (heightDiff > maxAllowedDiff) {
      return false; // Too steep
    }

    // Check not in water
    const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
    const waterLevel = this.terrainSystem.config?.waterLevel || 3;

    if (template.requiresDryLand && avgHeight <= waterLevel) {
      return false; // Underwater
    }

    return true;
  }

  /**
   * Check if position has minimum distance to other structures
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @param {number} width - Structure width
   * @param {number} height - Structure height
   * @returns {boolean}
   */
  hasMinimumDistance(x, z, width, height) {
    const minDist = this.config.minStructureDistance;
    const centerX = x + width / 2;
    const centerZ = z + height / 2;

    // Check all existing structures
    for (const structure of this.structuresById.values()) {
      const structCenterX = structure.position.x + structure.width / 2;
      const structCenterZ = structure.position.z + structure.height / 2;

      const dx = centerX - structCenterX;
      const dz = centerZ - structCenterZ;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < minDist) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if position is near spawn (protected area)
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {boolean}
   */
  isNearSpawn(x, z) {
    const spawnX = 0; // Assume spawn at origin
    const spawnZ = 0;
    const dx = x - spawnX;
    const dz = z - spawnZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    return distance < this.config.spawnProtectionRadius;
  }

  /**
   * Get structures in a region
   * @param {number} startX - Region start X
   * @param {number} startZ - Region start Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @returns {Array<Structure>}
   */
  getStructuresInRegion(startX, startZ, width, depth) {
    const structures = [];
    const chunkSize = this.config.chunkSize;

    // Calculate chunk range
    const minChunkX = Math.floor(startX / chunkSize);
    const maxChunkX = Math.floor((startX + width) / chunkSize);
    const minChunkZ = Math.floor(startZ / chunkSize);
    const maxChunkZ = Math.floor((startZ + depth) / chunkSize);

    // Check each chunk
    for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        const chunkKey = `${chunkX},${chunkZ}`;
        let chunkStructures = this.chunkStructures.get(chunkKey);

        // Lazy generation
        if (!chunkStructures) {
          chunkStructures = this.generateStructuresForChunk(chunkX, chunkZ);
        }

        // Filter structures in region
        for (const structure of chunkStructures) {
          const bounds = structure.getBounds();

          // Check if structure overlaps region
          if (!(bounds.right < startX || bounds.left >= startX + width ||
                bounds.bottom < startZ || bounds.top >= startZ + depth)) {
            structures.push(structure);
          }
        }
      }
    }

    return structures;
  }

  /**
   * Get structure at position
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {Structure|null}
   */
  getStructureAt(x, z) {
    const chunkX = Math.floor(x / this.config.chunkSize);
    const chunkZ = Math.floor(z / this.config.chunkSize);
    const chunkKey = `${chunkX},${chunkZ}`;

    let chunkStructures = this.chunkStructures.get(chunkKey);

    // Lazy generation
    if (!chunkStructures) {
      chunkStructures = this.generateStructuresForChunk(chunkX, chunkZ);
    }

    // Find structure containing position
    for (const structure of chunkStructures) {
      if (structure.containsPosition(x, z)) {
        return structure;
      }
    }

    return null;
  }

  /**
   * Get structure by ID
   * @param {string} structureId - Structure ID
   * @returns {Structure|null}
   */
  getStructureById(structureId) {
    return this.structuresById.get(structureId) || null;
  }

  /**
   * Remove structure
   * @param {string} structureId - Structure ID
   * @returns {boolean} True if removed
   */
  removeStructure(structureId) {
    const structure = this.structuresById.get(structureId);
    if (!structure) return false;

    // Remove from chunk
    const chunkX = Math.floor(structure.position.x / this.config.chunkSize);
    const chunkZ = Math.floor(structure.position.z / this.config.chunkSize);
    const chunkKey = `${chunkX},${chunkZ}`;

    const chunkStructures = this.chunkStructures.get(chunkKey);
    if (chunkStructures) {
      const index = chunkStructures.findIndex(s => s.id === structureId);
      if (index !== -1) {
        chunkStructures.splice(index, 1);
      }
    }

    // Remove from global registry
    this.structuresById.delete(structureId);

    return true;
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      totalStructures: this.structuresById.size,
      loadedChunks: this.chunkStructures.size,
    };
  }

  /**
   * Clear all structures
   */
  clear() {
    this.chunkStructures.clear();
    this.structuresById.clear();
    this.nextStructureId = 0;
    this.stats = {
      structuresGenerated: 0,
      structuresByType: {},
      structuresByBiome: {},
    };
  }
}

export default StructureGenerator;
