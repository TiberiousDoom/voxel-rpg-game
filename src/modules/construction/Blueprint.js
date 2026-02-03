/**
 * Blueprint.js - Structure blueprint definitions
 *
 * A Blueprint defines a structure that can be built, including:
 * - Block layout (3D array of block positions and types)
 * - Material requirements
 * - Build order rules
 * - Metadata (name, category, tier, etc.)
 *
 * Part of Phase 4: Blueprint & Construction System
 *
 * Usage:
 *   const blueprint = new Blueprint({
 *     name: 'Wooden House',
 *     blocks: [...],
 *     requirements: { wood: 20, stone: 5 }
 *   });
 */

import { getBlockRequiredMaterial } from '../voxel/BlockTypes.js';

/**
 * Blueprint categories
 */
export const BlueprintCategory = {
  HOUSING: 'housing',
  PRODUCTION: 'production',
  STORAGE: 'storage',
  DEFENSE: 'defense',
  DECORATION: 'decoration',
  INFRASTRUCTURE: 'infrastructure'
};

/**
 * Blueprint tier (matches existing tier system)
 */
export const BlueprintTier = {
  SURVIVAL: 'SURVIVAL',
  SETTLEMENT: 'SETTLEMENT',
  KINGDOM: 'KINGDOM'
};

/**
 * Blueprint block entry - defines a single block in the blueprint
 */
export class BlueprintBlock {
  /**
   * Create a blueprint block
   * @param {object} config
   */
  constructor(config) {
    this.relX = config.relX || 0;           // Relative X from origin
    this.relY = config.relY || 0;           // Relative Y from origin
    this.relZ = config.relZ || 0;           // Relative Z from origin
    this.blockType = config.blockType;       // BlockType enum value
    this.rotation = config.rotation || 0;    // 0, 90, 180, 270
    this.metadata = config.metadata || 0;    // Additional metadata

    // Build order (lower = built first)
    // Auto-calculated based on Z if not specified
    this.buildOrder = config.buildOrder !== undefined ?
      config.buildOrder : this.relZ * 1000 + this.relY * 100 + this.relX;
  }

  /**
   * Get required material for this block
   * @returns {{material: string, amount: number} | null}
   */
  getRequiredMaterial() {
    return getBlockRequiredMaterial(this.blockType);
  }

  /**
   * Clone the block with offset
   * @param {number} offsetX
   * @param {number} offsetY
   * @param {number} offsetZ
   * @returns {BlueprintBlock}
   */
  cloneWithOffset(offsetX, offsetY, offsetZ) {
    return new BlueprintBlock({
      relX: this.relX + offsetX,
      relY: this.relY + offsetY,
      relZ: this.relZ + offsetZ,
      blockType: this.blockType,
      rotation: this.rotation,
      metadata: this.metadata,
      buildOrder: this.buildOrder
    });
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      relX: this.relX,
      relY: this.relY,
      relZ: this.relZ,
      blockType: this.blockType,
      rotation: this.rotation,
      metadata: this.metadata,
      buildOrder: this.buildOrder
    };
  }

  /**
   * Import from JSON
   * @param {object} data
   * @returns {BlueprintBlock}
   */
  static fromJSON(data) {
    return new BlueprintBlock(data);
  }
}

/**
 * Blueprint - Complete structure definition
 */
export class Blueprint {
  /**
   * Create a blueprint
   * @param {object} config - Blueprint configuration
   */
  constructor(config) {
    this.id = config.id || `blueprint_${Date.now()}`;
    this.name = config.name || 'Unnamed Blueprint';
    this.description = config.description || '';

    // Classification
    this.category = config.category || BlueprintCategory.HOUSING;
    this.tier = config.tier || BlueprintTier.SURVIVAL;

    // Dimensions (calculated from blocks)
    this.dimensions = {
      width: config.width || 1,
      depth: config.depth || 1,
      height: config.height || 1
    };

    // Blocks array
    this.blocks = [];
    if (config.blocks) {
      this.blocks = config.blocks.map(b =>
        b instanceof BlueprintBlock ? b : new BlueprintBlock(b)
      );
      this._calculateDimensions();
    }

    // Pre-calculated material requirements
    this.requirements = config.requirements || null;
    if (!this.requirements) {
      this._calculateRequirements();
    }

    // Functional properties
    this.workSlots = config.workSlots || [];          // Where NPCs work
    this.entryPoints = config.entryPoints || [];      // Door/entry positions
    this.storageCapacity = config.storageCapacity || 0;

    // Build constraints
    this.requiresFoundation = config.requiresFoundation !== false;
    this.minTerrainHeight = config.minTerrainHeight || 0;
    this.maxTerrainSlope = config.maxTerrainSlope || 2;

    // Visual
    this.iconColor = config.iconColor || '#888888';
  }

  /**
   * Calculate dimensions from blocks
   * @private
   */
  _calculateDimensions() {
    if (this.blocks.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const block of this.blocks) {
      minX = Math.min(minX, block.relX);
      maxX = Math.max(maxX, block.relX);
      minY = Math.min(minY, block.relY);
      maxY = Math.max(maxY, block.relY);
      minZ = Math.min(minZ, block.relZ);
      maxZ = Math.max(maxZ, block.relZ);
    }

    this.dimensions = {
      width: maxX - minX + 1,
      depth: maxY - minY + 1,
      height: maxZ - minZ + 1
    };
  }

  /**
   * Calculate material requirements from blocks
   * @private
   */
  _calculateRequirements() {
    const requirements = {};

    for (const block of this.blocks) {
      const material = block.getRequiredMaterial();
      if (material) {
        if (!requirements[material.material]) {
          requirements[material.material] = 0;
        }
        requirements[material.material] += material.amount;
      }
    }

    this.requirements = requirements;
  }

  /**
   * Get blocks sorted by build order
   * @returns {Array<BlueprintBlock>}
   */
  getBlocksInBuildOrder() {
    return [...this.blocks].sort((a, b) => a.buildOrder - b.buildOrder);
  }

  /**
   * Get blocks at a specific Z-level
   * @param {number} z - Z-level (relative)
   * @returns {Array<BlueprintBlock>}
   */
  getBlocksAtLevel(z) {
    return this.blocks.filter(b => b.relZ === z);
  }

  /**
   * Get total block count
   * @returns {number}
   */
  getBlockCount() {
    return this.blocks.length;
  }

  /**
   * Get total material requirements
   * @returns {object} Map of material -> quantity
   */
  getMaterialRequirements() {
    return { ...this.requirements };
  }

  /**
   * Check if a material list satisfies requirements
   * @param {object} materials - Map of material -> quantity
   * @returns {{satisfied: boolean, missing: object}}
   */
  checkMaterials(materials) {
    const missing = {};
    let satisfied = true;

    for (const [material, required] of Object.entries(this.requirements)) {
      const available = materials[material] || 0;
      if (available < required) {
        missing[material] = required - available;
        satisfied = false;
      }
    }

    return { satisfied, missing };
  }

  /**
   * Rotate blueprint 90 degrees clockwise
   * @returns {Blueprint} New rotated blueprint
   */
  rotate90() {
    const rotatedBlocks = this.blocks.map(block => {
      // Rotate coordinates: (x, y) -> (y, -x)
      // Adjusted for positive coordinates
      return new BlueprintBlock({
        ...block.toJSON(),
        relX: block.relY,
        relY: this.dimensions.width - 1 - block.relX,
        rotation: (block.rotation + 90) % 360
      });
    });

    return new Blueprint({
      ...this.toJSON(),
      blocks: rotatedBlocks,
      width: this.dimensions.depth,
      depth: this.dimensions.width
    });
  }

  /**
   * Mirror blueprint horizontally (X-axis)
   * @returns {Blueprint} New mirrored blueprint
   */
  mirrorX() {
    const mirroredBlocks = this.blocks.map(block => {
      return new BlueprintBlock({
        ...block.toJSON(),
        relX: this.dimensions.width - 1 - block.relX
      });
    });

    return new Blueprint({
      ...this.toJSON(),
      blocks: mirroredBlocks
    });
  }

  /**
   * Get footprint (2D projection) of the blueprint
   * @returns {Array<{x: number, y: number}>}
   */
  getFootprint() {
    const footprint = new Set();

    for (const block of this.blocks) {
      footprint.add(`${block.relX},${block.relY}`);
    }

    return Array.from(footprint).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  }

  /**
   * Check if a position is inside the blueprint footprint
   * @param {number} relX - Relative X
   * @param {number} relY - Relative Y
   * @returns {boolean}
   */
  isInFootprint(relX, relY) {
    return this.blocks.some(b => b.relX === relX && b.relY === relY);
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      tier: this.tier,
      dimensions: this.dimensions,
      blocks: this.blocks.map(b => b.toJSON()),
      requirements: this.requirements,
      workSlots: this.workSlots,
      entryPoints: this.entryPoints,
      storageCapacity: this.storageCapacity,
      requiresFoundation: this.requiresFoundation,
      minTerrainHeight: this.minTerrainHeight,
      maxTerrainSlope: this.maxTerrainSlope,
      iconColor: this.iconColor
    };
  }

  /**
   * Import from JSON
   * @param {object} data
   * @returns {Blueprint}
   */
  static fromJSON(data) {
    return new Blueprint({
      ...data,
      blocks: data.blocks.map(b => BlueprintBlock.fromJSON(b))
    });
  }
}

/**
 * Blueprint builder - fluent API for creating blueprints
 */
export class BlueprintBuilder {
  constructor() {
    this.config = {
      blocks: [],
      workSlots: [],
      entryPoints: []
    };
  }

  /**
   * Set blueprint name
   */
  name(name) {
    this.config.name = name;
    return this;
  }

  /**
   * Set blueprint ID
   */
  id(id) {
    this.config.id = id;
    return this;
  }

  /**
   * Set description
   */
  description(desc) {
    this.config.description = desc;
    return this;
  }

  /**
   * Set category
   */
  category(cat) {
    this.config.category = cat;
    return this;
  }

  /**
   * Set tier
   */
  tier(t) {
    this.config.tier = t;
    return this;
  }

  /**
   * Add a single block
   */
  addBlock(relX, relY, relZ, blockType, options = {}) {
    this.config.blocks.push(new BlueprintBlock({
      relX,
      relY,
      relZ,
      blockType,
      ...options
    }));
    return this;
  }

  /**
   * Fill a rectangular region with blocks
   */
  fillRegion(x1, y1, z1, x2, y2, z2, blockType) {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
          this.addBlock(x, y, z, blockType);
        }
      }
    }
    return this;
  }

  /**
   * Fill walls (hollow box)
   */
  fillWalls(x1, y1, z1, x2, y2, z2, blockType) {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
          // Only add if on the edge
          const onEdgeX = x === Math.min(x1, x2) || x === Math.max(x1, x2);
          const onEdgeY = y === Math.min(y1, y2) || y === Math.max(y1, y2);
          if (onEdgeX || onEdgeY) {
            this.addBlock(x, y, z, blockType);
          }
        }
      }
    }
    return this;
  }

  /**
   * Fill floor (single Z-level)
   */
  fillFloor(x1, y1, z, x2, y2, blockType) {
    return this.fillRegion(x1, y1, z, x2, y2, z, blockType);
  }

  /**
   * Add work slot
   */
  addWorkSlot(relX, relY, relZ) {
    this.config.workSlots.push({ relX, relY, relZ });
    return this;
  }

  /**
   * Add entry point
   */
  addEntryPoint(relX, relY, relZ) {
    this.config.entryPoints.push({ relX, relY, relZ });
    return this;
  }

  /**
   * Set storage capacity
   */
  storageCapacity(capacity) {
    this.config.storageCapacity = capacity;
    return this;
  }

  /**
   * Build the blueprint
   * @returns {Blueprint}
   */
  build() {
    return new Blueprint(this.config);
  }
}

/**
 * Create a blueprint builder
 * @returns {BlueprintBuilder}
 */
export function createBlueprint() {
  return new BlueprintBuilder();
}
