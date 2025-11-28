/**
 * StructuralValidator.js - Validates structural integrity
 *
 * Ensures buildings have proper support and structural integrity.
 *
 * Part of Phase 22: Advanced Construction Features
 */

import { BlockType, isBlockSolid, getBlockProperty } from '../voxel/BlockTypes.js';

/**
 * Support types for structural analysis
 */
export const SupportType = {
  GROUND: 'ground',          // Directly on ground/solid below
  WALL: 'wall',              // Attached to wall
  COLUMN: 'column',          // Supported by column
  CANTILEVER: 'cantilever',  // Overhanging (limited support)
  NONE: 'none'               // No support
};

/**
 * StructuralValidator - Validates building structural integrity
 */
export class StructuralValidator {
  /**
   * Create validator
   * @param {object} config - Configuration
   */
  constructor(config = {}) {
    this.voxelWorld = config.voxelWorld || null;
    this.maxCantilever = config.maxCantilever || 3; // Max unsupported blocks
    this.requireFoundation = config.requireFoundation !== false;
  }

  /**
   * Set voxel world reference
   * @param {VoxelWorld} voxelWorld
   */
  setVoxelWorld(voxelWorld) {
    this.voxelWorld = voxelWorld;
  }

  /**
   * Validate a blueprint placement
   * @param {object} blueprint - Blueprint to validate
   * @param {object} position - Placement position {x, y, z}
   * @returns {object} Validation result
   */
  validatePlacement(blueprint, position) {
    if (!this.voxelWorld || !blueprint) {
      return { valid: false, errors: ['Missing voxel world or blueprint'] };
    }

    const errors = [];
    const warnings = [];

    // Check foundation
    if (this.requireFoundation) {
      const foundationCheck = this._checkFoundation(blueprint, position);
      if (!foundationCheck.valid) {
        errors.push(...foundationCheck.errors);
      }
      warnings.push(...foundationCheck.warnings);
    }

    // Check for collisions with existing blocks
    const collisionCheck = this._checkCollisions(blueprint, position);
    if (!collisionCheck.valid) {
      errors.push(...collisionCheck.errors);
    }

    // Check structural support for upper floors
    const supportCheck = this._checkSupport(blueprint, position);
    if (!supportCheck.valid) {
      errors.push(...supportCheck.errors);
    }
    warnings.push(...supportCheck.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      foundationRequired: this.requireFoundation
    };
  }

  /**
   * Check foundation requirements
   * @private
   */
  _checkFoundation(blueprint, position) {
    const errors = [];
    const warnings = [];

    // Get lowest Z-level blocks from blueprint
    const lowestZ = Math.min(...blueprint.blocks.map(b => b.z));
    const foundationBlocks = blueprint.blocks.filter(b => b.z === lowestZ);

    let unsupportedCount = 0;

    for (const block of foundationBlocks) {
      const worldX = position.x + block.x;
      const worldY = position.y + block.y;
      const worldZ = position.z + block.z;

      // Check what's below
      const below = this.voxelWorld.getBlock(worldX, worldY, worldZ - 1);

      if (!isBlockSolid(below) && below !== BlockType.BEDROCK) {
        unsupportedCount++;
      }
    }

    const unsupportedRatio = unsupportedCount / foundationBlocks.length;

    if (unsupportedRatio > 0.5) {
      errors.push(`Foundation not solid: ${unsupportedCount}/${foundationBlocks.length} blocks unsupported`);
    } else if (unsupportedRatio > 0.2) {
      warnings.push(`Weak foundation: ${unsupportedCount}/${foundationBlocks.length} blocks unsupported`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Check for block collisions
   * @private
   */
  _checkCollisions(blueprint, position) {
    const errors = [];
    let collisionCount = 0;

    for (const block of blueprint.blocks) {
      const worldX = position.x + block.x;
      const worldY = position.y + block.y;
      const worldZ = position.z + block.z;

      const existing = this.voxelWorld.getBlock(worldX, worldY, worldZ);

      if (existing !== BlockType.AIR && existing !== BlockType.CONSTRUCTION_MARKER) {
        collisionCount++;
      }
    }

    if (collisionCount > 0) {
      errors.push(`${collisionCount} blocks would collide with existing terrain`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check structural support for all blocks
   * @private
   */
  _checkSupport(blueprint, position) {
    const errors = [];
    const warnings = [];

    // Group blocks by Z-level
    const blocksByZ = new Map();
    for (const block of blueprint.blocks) {
      const z = block.z;
      if (!blocksByZ.has(z)) {
        blocksByZ.set(z, []);
      }
      blocksByZ.get(z).push(block);
    }

    // Check support for each level above ground
    const zLevels = Array.from(blocksByZ.keys()).sort((a, b) => a - b);

    for (let i = 1; i < zLevels.length; i++) {
      const z = zLevels[i];
      const blocksAtLevel = blocksByZ.get(z);
      const blocksBelow = blocksByZ.get(zLevels[i - 1]) || [];

      // Create position set for blocks below
      const belowPositions = new Set(
        blocksBelow.map(b => `${b.x},${b.y}`)
      );

      let unsupportedAtLevel = 0;

      for (const block of blocksAtLevel) {
        const hasDirectSupport = belowPositions.has(`${block.x},${block.y}`);
        const hasAdjacentSupport = this._hasAdjacentSupport(block, belowPositions);

        if (!hasDirectSupport && !hasAdjacentSupport) {
          unsupportedAtLevel++;
        }
      }

      if (unsupportedAtLevel > this.maxCantilever) {
        errors.push(`Level ${z}: ${unsupportedAtLevel} blocks exceed cantilever limit of ${this.maxCantilever}`);
      } else if (unsupportedAtLevel > 0) {
        warnings.push(`Level ${z}: ${unsupportedAtLevel} cantilevered blocks`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Check if block has adjacent support (wall attachment)
   * @private
   */
  _hasAdjacentSupport(block, belowPositions) {
    const adjacent = [
      { x: block.x - 1, y: block.y },
      { x: block.x + 1, y: block.y },
      { x: block.x, y: block.y - 1 },
      { x: block.x, y: block.y + 1 }
    ];

    return adjacent.some(pos => belowPositions.has(`${pos.x},${pos.y}`));
  }

  /**
   * Get support type for a block position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {string} Support type
   */
  getSupportType(x, y, z) {
    if (!this.voxelWorld) return SupportType.NONE;

    // Check direct support below
    const below = this.voxelWorld.getBlock(x, y, z - 1);

    if (below === BlockType.BEDROCK) {
      return SupportType.GROUND;
    }

    if (isBlockSolid(below)) {
      return z === 0 ? SupportType.GROUND : SupportType.COLUMN;
    }

    // Check wall attachment
    const neighbors = [
      this.voxelWorld.getBlock(x - 1, y, z),
      this.voxelWorld.getBlock(x + 1, y, z),
      this.voxelWorld.getBlock(x, y - 1, z),
      this.voxelWorld.getBlock(x, y + 1, z)
    ];

    if (neighbors.some(n => isBlockSolid(n))) {
      return SupportType.WALL;
    }

    // Check cantilever support (diagonal or nearby solid)
    const diagonalBelow = [
      this.voxelWorld.getBlock(x - 1, y, z - 1),
      this.voxelWorld.getBlock(x + 1, y, z - 1),
      this.voxelWorld.getBlock(x, y - 1, z - 1),
      this.voxelWorld.getBlock(x, y + 1, z - 1)
    ];

    if (diagonalBelow.some(n => isBlockSolid(n))) {
      return SupportType.CANTILEVER;
    }

    return SupportType.NONE;
  }

  /**
   * Check if a region is suitable for building
   * @param {object} min - Minimum corner {x, y, z}
   * @param {object} max - Maximum corner {x, y, z}
   * @returns {object} Suitability result
   */
  checkBuildingRegion(min, max) {
    if (!this.voxelWorld) {
      return { suitable: false, issues: ['No voxel world'] };
    }

    const issues = [];
    let flatness = 0;
    let totalTiles = 0;
    let waterTiles = 0;

    // Check the ground level at min.z - 1
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        totalTiles++;
        const groundBlock = this.voxelWorld.getBlock(x, y, min.z - 1);
        const surfaceBlock = this.voxelWorld.getBlock(x, y, min.z);

        if (!isBlockSolid(groundBlock)) {
          flatness--;
        } else {
          flatness++;
        }

        if (surfaceBlock === BlockType.WATER || surfaceBlock === BlockType.WATER_SOURCE) {
          waterTiles++;
        }
      }
    }

    const flatnessRatio = flatness / totalTiles;

    if (flatnessRatio < 0.7) {
      issues.push(`Terrain too uneven (${Math.round(flatnessRatio * 100)}% solid ground)`);
    }

    if (waterTiles > totalTiles * 0.2) {
      issues.push(`Too much water in region (${waterTiles}/${totalTiles} tiles)`);
    }

    return {
      suitable: issues.length === 0,
      issues,
      flatnessRatio,
      waterTiles,
      totalTiles
    };
  }
}

export default StructuralValidator;
