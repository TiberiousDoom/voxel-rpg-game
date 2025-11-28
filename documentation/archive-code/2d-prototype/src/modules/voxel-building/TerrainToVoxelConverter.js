/**
 * TerrainToVoxelConverter.js - Converts heightmap terrain to voxel data
 *
 * This module bridges the existing procedural terrain system with the
 * voxel building system. It converts 2D heightmap data into layered
 * voxel blocks that can be displayed and modified.
 *
 * Part of Phase 13: Terrain Conversion
 *
 * Usage:
 *   const converter = new TerrainToVoxelConverter(terrainSystem, voxelWorld);
 *   converter.convertRegion(startX, startZ, width, depth);
 */

import { BlockType } from '../voxel/BlockTypes.js';

/**
 * Biome-to-surface-block mapping
 */
const BIOME_SURFACE_BLOCKS = {
  forest: BlockType.GRASS,
  plains: BlockType.GRASS,
  grassland: BlockType.GRASS,
  hills: BlockType.GRASS,
  mountains: BlockType.STONE,
  desert: BlockType.SAND,
  beach: BlockType.SAND,
  swamp: BlockType.DIRT,
  tundra: BlockType.DIRT,
  snow: BlockType.SNOW,
  jungle: BlockType.GRASS,
  savanna: BlockType.GRASS,
  // Default
  default: BlockType.GRASS
};

/**
 * Get subsurface block based on biome
 */
const BIOME_SUBSURFACE_BLOCKS = {
  desert: BlockType.SAND,
  beach: BlockType.SAND,
  mountains: BlockType.STONE,
  default: BlockType.DIRT
};

/**
 * TerrainToVoxelConverter - Converts heightmap to voxel blocks
 */
export class TerrainToVoxelConverter {
  /**
   * Create terrain converter
   * @param {TerrainSystem} terrainSystem - Source terrain system
   * @param {VoxelWorld} voxelWorld - Target voxel world
   * @param {object} config - Conversion configuration
   */
  constructor(terrainSystem, voxelWorld, config = {}) {
    this.terrainSystem = terrainSystem;
    this.voxelWorld = voxelWorld;

    // Configuration
    this.config = {
      // How many voxel layers per terrain height unit
      heightScale: config.heightScale || 2,
      // Minimum Z-level (bedrock/base)
      baseLevel: config.baseLevel || 0,
      // Surface layer thickness (grass/sand on top)
      surfaceDepth: config.surfaceDepth || 1,
      // Subsurface layer thickness (dirt under grass)
      subsurfaceDepth: config.subsurfaceDepth || 3,
      // Fill below with stone
      fillWithStone: config.fillWithStone !== false,
      // Generate ores in stone layers
      generateOres: config.generateOres || false,
      // Water level in voxel Z
      waterLevel: config.waterLevel || 6,
      ...config
    };

    // Statistics
    this.stats = {
      blocksGenerated: 0,
      chunksConverted: 0,
      lastConversionTime: 0
    };
  }

  /**
   * Convert a region of terrain to voxels
   * @param {number} startX - Start X tile coordinate
   * @param {number} startZ - Start Z tile coordinate (terrain Y)
   * @param {number} width - Width in tiles
   * @param {number} depth - Depth in tiles
   * @returns {object} Conversion result
   */
  convertRegion(startX, startZ, width, depth) {
    const startTime = performance.now();
    let blocksCreated = 0;

    for (let x = startX; x < startX + width; x++) {
      for (let z = startZ; z < startZ + depth; z++) {
        blocksCreated += this._convertColumn(x, z);
      }
    }

    const elapsed = performance.now() - startTime;

    this.stats.blocksGenerated += blocksCreated;
    this.stats.chunksConverted++;
    this.stats.lastConversionTime = elapsed;

    return {
      blocksCreated,
      area: width * depth,
      conversionTime: elapsed
    };
  }

  /**
   * Convert a single terrain column to voxels
   * @private
   */
  _convertColumn(x, z) {
    // Get terrain data
    const terrainHeight = this.terrainSystem.getHeight(x, z);
    const biome = this.terrainSystem.getBiome(x, z);
    const isWater = this.terrainSystem.isWater?.(x, z) || false;

    // Calculate voxel height from terrain height
    const voxelHeight = Math.floor(terrainHeight * this.config.heightScale) + this.config.baseLevel;

    // Get block types for this biome
    const surfaceBlock = BIOME_SURFACE_BLOCKS[biome] || BIOME_SURFACE_BLOCKS.default;
    const subsurfaceBlock = BIOME_SUBSURFACE_BLOCKS[biome] || BIOME_SUBSURFACE_BLOCKS.default;

    let blocksSet = 0;

    // Fill from base to surface
    for (let voxelZ = this.config.baseLevel; voxelZ <= voxelHeight; voxelZ++) {
      let blockType;

      // Determine block type based on depth from surface
      const depthFromSurface = voxelHeight - voxelZ;

      if (depthFromSurface === 0) {
        // Top layer - surface block
        blockType = isWater ? BlockType.DIRT : surfaceBlock;
      } else if (depthFromSurface <= this.config.subsurfaceDepth) {
        // Subsurface layer
        blockType = subsurfaceBlock;
      } else {
        // Deep layer - stone
        blockType = BlockType.STONE;
      }

      // Set the block
      if (this.voxelWorld.setBlock(x, z, voxelZ, blockType)) {
        blocksSet++;
      }
    }

    // Add water blocks if position is water
    if (isWater) {
      for (let waterZ = voxelHeight + 1; waterZ <= this.config.waterLevel; waterZ++) {
        if (this.voxelWorld.setBlock(x, z, waterZ, BlockType.WATER)) {
          blocksSet++;
        }
      }
    }

    return blocksSet;
  }

  /**
   * Convert terrain around a chunk that was just loaded
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @param {number} chunkSize - Size of chunk in tiles
   * @returns {object} Conversion result
   */
  convertChunk(chunkX, chunkZ, chunkSize = 32) {
    const startX = chunkX * chunkSize;
    const startZ = chunkZ * chunkSize;
    return this.convertRegion(startX, startZ, chunkSize, chunkSize);
  }

  /**
   * Get the voxel height at a position (converted from terrain)
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate (terrain Y)
   * @returns {number} Voxel Z level of surface
   */
  getVoxelSurfaceLevel(x, z) {
    const terrainHeight = this.terrainSystem.getHeight(x, z);
    return Math.floor(terrainHeight * this.config.heightScale) + this.config.baseLevel;
  }

  /**
   * Check if a voxel position is underground
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @returns {boolean}
   */
  isUnderground(x, y, z) {
    const surfaceLevel = this.getVoxelSurfaceLevel(x, y);
    return z < surfaceLevel;
  }

  /**
   * Get appropriate block type for carving at position
   * Used when mining/digging reveals new blocks
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z level
   * @returns {number} Block type
   */
  getBlockTypeForPosition(x, y, z) {
    const surfaceLevel = this.getVoxelSurfaceLevel(x, y);
    const biome = this.terrainSystem.getBiome(x, y);

    const depthFromSurface = surfaceLevel - z;

    if (depthFromSurface <= 0) {
      return BlockType.AIR;
    } else if (depthFromSurface <= this.config.subsurfaceDepth) {
      return BIOME_SUBSURFACE_BLOCKS[biome] || BIOME_SUBSURFACE_BLOCKS.default;
    } else {
      return BlockType.STONE;
    }
  }

  /**
   * Update configuration
   * @param {object} newConfig - New config values
   */
  setConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  /**
   * Get conversion statistics
   * @returns {object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      blocksGenerated: 0,
      chunksConverted: 0,
      lastConversionTime: 0
    };
  }
}

export default TerrainToVoxelConverter;
