/**
 * ConstructionSite.js - Active construction site tracking
 *
 * A ConstructionSite represents an in-progress building, tracking:
 * - Blueprint being built
 * - Per-block construction status
 * - Material staging and delivery
 * - Worker assignments
 *
 * Part of Phase 4: Blueprint & Construction System
 *
 * Usage:
 *   const site = new ConstructionSite({
 *     blueprint: myBlueprint,
 *     position: { x: 10, y: 10, z: 0 }
 *   });
 */

import { Blueprint } from './Blueprint.js';

/**
 * Block construction status
 */
export const BlockStatus = {
  PENDING: 'pending',                    // Waiting for materials
  MATERIALS_RESERVED: 'materials_reserved', // Materials reserved in stockpile
  MATERIALS_DELIVERED: 'materials_delivered', // Materials at site
  IN_PROGRESS: 'in_progress',            // Being built
  COMPLETED: 'completed'                 // Block placed
};

/**
 * Construction site status
 */
export const SiteStatus = {
  PLANNED: 'planned',          // Blueprint placed, not started
  IN_PROGRESS: 'in_progress',  // Construction ongoing
  PAUSED: 'paused',            // Manually paused
  COMPLETED: 'completed',      // All blocks built
  CANCELLED: 'cancelled'       // Construction cancelled
};

/**
 * Block state tracking for construction
 */
export class ConstructionBlock {
  /**
   * Create a construction block tracker
   * @param {object} blueprintBlock - BlueprintBlock from blueprint
   * @param {object} worldPosition - Absolute world position
   */
  constructor(blueprintBlock, worldPosition) {
    this.blueprintBlock = blueprintBlock;

    // World position
    this.position = {
      x: worldPosition.x,
      y: worldPosition.y,
      z: worldPosition.z
    };

    // Construction status
    this.status = BlockStatus.PENDING;

    // Material tracking
    this.materialRequired = blueprintBlock.getRequiredMaterial();
    this.materialDelivered = false;

    // Worker assignments
    this.reservedByHauler = null;    // NPC ID of hauler
    this.assignedBuilder = null;      // NPC ID of builder

    // Progress (0-100)
    this.buildProgress = 0;

    // Timestamps
    this.reservedAt = null;
    this.deliveredAt = null;
    this.startedAt = null;
    this.completedAt = null;
  }

  /**
   * Check if block can be built (materials delivered, dependencies met)
   * @returns {boolean}
   */
  canBuild() {
    if (this.status === BlockStatus.COMPLETED) return false;
    return this.status === BlockStatus.MATERIALS_DELIVERED;
  }

  /**
   * Check if block needs materials hauled
   * @returns {boolean}
   */
  needsMaterials() {
    return this.status === BlockStatus.PENDING && this.materialRequired !== null;
  }

  /**
   * Reserve for material delivery
   * @param {string} npcId - Hauler NPC ID
   * @returns {boolean}
   */
  reserveForDelivery(npcId) {
    if (this.status !== BlockStatus.PENDING) return false;
    if (this.reservedByHauler) return false;

    this.reservedByHauler = npcId;
    this.status = BlockStatus.MATERIALS_RESERVED;
    this.reservedAt = Date.now();
    return true;
  }

  /**
   * Mark materials as delivered
   * @param {string} npcId - Hauler NPC ID (for validation)
   * @returns {boolean}
   */
  deliverMaterials(npcId = null) {
    if (npcId && this.reservedByHauler !== npcId) return false;

    this.materialDelivered = true;
    this.status = BlockStatus.MATERIALS_DELIVERED;
    this.reservedByHauler = null;
    this.deliveredAt = Date.now();
    return true;
  }

  /**
   * Cancel material reservation
   * @param {string} npcId - NPC ID (optional validation)
   * @returns {boolean}
   */
  cancelReservation(npcId = null) {
    if (npcId && this.reservedByHauler !== npcId) return false;
    if (this.status !== BlockStatus.MATERIALS_RESERVED) return false;

    this.reservedByHauler = null;
    this.status = BlockStatus.PENDING;
    this.reservedAt = null;
    return true;
  }

  /**
   * Assign builder to this block
   * @param {string} npcId - Builder NPC ID
   * @returns {boolean}
   */
  assignBuilder(npcId) {
    if (!this.canBuild()) return false;
    if (this.assignedBuilder) return false;

    this.assignedBuilder = npcId;
    this.status = BlockStatus.IN_PROGRESS;
    this.startedAt = Date.now();
    return true;
  }

  /**
   * Update build progress
   * @param {number} progress - Progress to add (0-100)
   * @returns {boolean} True if completed
   */
  addProgress(progress) {
    if (this.status !== BlockStatus.IN_PROGRESS) return false;

    this.buildProgress = Math.min(100, this.buildProgress + progress);

    if (this.buildProgress >= 100) {
      this.status = BlockStatus.COMPLETED;
      this.completedAt = Date.now();
      this.assignedBuilder = null;
      return true;
    }

    return false;
  }

  /**
   * Release builder assignment
   * @param {string} npcId - Builder NPC ID
   */
  releaseBuilder(npcId = null) {
    if (npcId && this.assignedBuilder !== npcId) return;

    this.assignedBuilder = null;
    if (this.status === BlockStatus.IN_PROGRESS && this.buildProgress < 100) {
      this.status = BlockStatus.MATERIALS_DELIVERED;
    }
  }

  /**
   * Get build time based on block hardness
   * @param {number} skillMultiplier - Builder skill (1.0 = normal)
   * @returns {number} Time in milliseconds
   */
  getBuildTime(skillMultiplier = 1.0) {
    // Base time is 2 seconds per block, modified by material
    const baseTime = 2000;
    return Math.floor(baseTime / skillMultiplier);
  }

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      position: this.position,
      status: this.status,
      materialDelivered: this.materialDelivered,
      buildProgress: this.buildProgress,
      completedAt: this.completedAt
    };
  }
}

/**
 * Construction Site - Manages building of a blueprint
 */
export class ConstructionSite {
  static nextId = 1;

  /**
   * Create a construction site
   * @param {object} config - Site configuration
   */
  constructor(config) {
    this.id = config.id || `site_${ConstructionSite.nextId++}`;

    // Blueprint reference
    this.blueprint = config.blueprint;
    this.blueprintId = this.blueprint?.id || config.blueprintId;

    // World position (origin of blueprint)
    this.position = {
      x: config.x || config.position?.x || 0,
      y: config.y || config.position?.y || 0,
      z: config.z || config.position?.z || 0
    };

    // Rotation (0, 90, 180, 270)
    this.rotation = config.rotation || 0;

    // Priority (higher = more important)
    this.priority = config.priority || 50;

    // Status
    this.status = config.status || SiteStatus.PLANNED;

    // Construction blocks
    this.blocks = new Map();  // Key: "x,y,z" -> ConstructionBlock
    this._initializeBlocks();

    // Material staging area (next to construction)
    this.materialDropoff = config.materialDropoff || this._calculateDropoff();
    this.stagedMaterials = new Map();  // material -> quantity

    // Statistics
    this.stats = {
      totalBlocks: 0,
      completedBlocks: 0,
      deliveredBlocks: 0,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null
    };

    this._updateStats();
  }

  /**
   * Initialize construction blocks from blueprint
   * @private
   */
  _initializeBlocks() {
    if (!this.blueprint) return;

    for (const bpBlock of this.blueprint.blocks) {
      // Calculate world position
      let relX = bpBlock.relX;
      let relY = bpBlock.relY;

      // Apply rotation
      if (this.rotation === 90) {
        [relX, relY] = [relY, -relX + this.blueprint.dimensions.width - 1];
      } else if (this.rotation === 180) {
        relX = -relX + this.blueprint.dimensions.width - 1;
        relY = -relY + this.blueprint.dimensions.depth - 1;
      } else if (this.rotation === 270) {
        [relX, relY] = [-relY + this.blueprint.dimensions.depth - 1, relX];
      }

      const worldPos = {
        x: this.position.x + relX,
        y: this.position.y + relY,
        z: this.position.z + bpBlock.relZ
      };

      const key = `${worldPos.x},${worldPos.y},${worldPos.z}`;
      this.blocks.set(key, new ConstructionBlock(bpBlock, worldPos));
    }
  }

  /**
   * Calculate material dropoff position
   * @private
   */
  _calculateDropoff() {
    // Place dropoff next to the building (south side)
    return {
      x: this.position.x + Math.floor((this.blueprint?.dimensions.width || 1) / 2),
      y: this.position.y + (this.blueprint?.dimensions.depth || 1),
      z: this.position.z
    };
  }

  /**
   * Update statistics
   * @private
   */
  _updateStats() {
    let completed = 0;
    let delivered = 0;

    for (const block of this.blocks.values()) {
      if (block.status === BlockStatus.COMPLETED) completed++;
      if (block.materialDelivered) delivered++;
    }

    this.stats.totalBlocks = this.blocks.size;
    this.stats.completedBlocks = completed;
    this.stats.deliveredBlocks = delivered;

    // Update site status
    if (completed === this.stats.totalBlocks && this.stats.totalBlocks > 0) {
      this.status = SiteStatus.COMPLETED;
      if (!this.stats.completedAt) {
        this.stats.completedAt = Date.now();
      }
    } else if (completed > 0 || delivered > 0) {
      if (this.status === SiteStatus.PLANNED) {
        this.status = SiteStatus.IN_PROGRESS;
        this.stats.startedAt = Date.now();
      }
    }
  }

  /**
   * Get block at world position
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z
   * @returns {ConstructionBlock | null}
   */
  getBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    return this.blocks.get(key) || null;
  }

  /**
   * Get all blocks that need materials hauled
   * @returns {Array<ConstructionBlock>}
   */
  getBlocksNeedingMaterials() {
    const needing = [];
    for (const block of this.blocks.values()) {
      if (block.needsMaterials()) {
        needing.push(block);
      }
    }
    // Sort by build order
    return needing.sort((a, b) =>
      a.blueprintBlock.buildOrder - b.blueprintBlock.buildOrder
    );
  }

  /**
   * Get all blocks ready to be built
   * @returns {Array<ConstructionBlock>}
   */
  getBlocksReadyToBuild() {
    const ready = [];
    for (const block of this.blocks.values()) {
      if (block.canBuild() && !block.assignedBuilder) {
        ready.push(block);
      }
    }
    // Sort by build order
    return ready.sort((a, b) =>
      a.blueprintBlock.buildOrder - b.blueprintBlock.buildOrder
    );
  }

  /**
   * Get the next block to haul materials for
   * @returns {ConstructionBlock | null}
   */
  getNextBlockForHauling() {
    const needing = this.getBlocksNeedingMaterials();
    return needing.length > 0 ? needing[0] : null;
  }

  /**
   * Get the next block to build
   * @returns {ConstructionBlock | null}
   */
  getNextBlockToBuild() {
    const ready = this.getBlocksReadyToBuild();

    // Check build dependencies (block below must be complete)
    for (const block of ready) {
      const below = this.getBlock(
        block.position.x,
        block.position.y,
        block.position.z - 1
      );

      // Can build if:
      // - It's the ground level (z === this.position.z)
      // - Or the block below is completed or doesn't exist in blueprint
      if (block.position.z === this.position.z ||
          !below ||
          below.status === BlockStatus.COMPLETED) {
        return block;
      }
    }

    return null;
  }

  /**
   * Reserve a block for material delivery
   * @param {string} npcId - Hauler NPC ID
   * @returns {{block: ConstructionBlock, material: object} | null}
   */
  reserveBlockForDelivery(npcId) {
    const block = this.getNextBlockForHauling();
    if (!block) return null;

    if (block.reserveForDelivery(npcId)) {
      return {
        block,
        material: block.materialRequired
      };
    }

    return null;
  }

  /**
   * Deliver materials to a block
   * @param {number} x - Block world X
   * @param {number} y - Block world Y
   * @param {number} z - Block world Z
   * @param {string} npcId - Hauler NPC ID
   * @returns {boolean}
   */
  deliverMaterials(x, y, z, npcId) {
    const block = this.getBlock(x, y, z);
    if (!block) return false;

    const result = block.deliverMaterials(npcId);
    if (result) {
      this._updateStats();
    }
    return result;
  }

  /**
   * Reserve a block for building
   * @param {string} npcId - Builder NPC ID
   * @returns {ConstructionBlock | null}
   */
  reserveBlockForBuilding(npcId) {
    const block = this.getNextBlockToBuild();
    if (!block) return null;

    if (block.assignBuilder(npcId)) {
      return block;
    }

    return null;
  }

  /**
   * Complete a block (place in world)
   * @param {number} x - Block world X
   * @param {number} y - Block world Y
   * @param {number} z - Block world Z
   * @param {string} npcId - Builder NPC ID
   * @returns {boolean}
   */
  completeBlock(x, y, z, npcId = null) {
    const block = this.getBlock(x, y, z);
    if (!block) return false;

    // Force complete
    block.buildProgress = 100;
    block.status = BlockStatus.COMPLETED;
    block.completedAt = Date.now();
    if (npcId) block.releaseBuilder(npcId);

    this._updateStats();
    return true;
  }

  /**
   * Release all reservations for an NPC
   * @param {string} npcId - NPC ID
   */
  releaseAllReservations(npcId) {
    for (const block of this.blocks.values()) {
      if (block.reservedByHauler === npcId) {
        block.cancelReservation(npcId);
      }
      if (block.assignedBuilder === npcId) {
        block.releaseBuilder(npcId);
      }
    }
  }

  /**
   * Get remaining material requirements
   * @returns {object} Map of material -> quantity still needed
   */
  getRemainingMaterials() {
    const remaining = {};

    for (const block of this.blocks.values()) {
      if (block.status === BlockStatus.COMPLETED) continue;
      if (block.materialDelivered) continue;

      const material = block.materialRequired;
      if (material) {
        if (!remaining[material.material]) {
          remaining[material.material] = 0;
        }
        remaining[material.material] += material.amount;
      }
    }

    return remaining;
  }

  /**
   * Get construction progress percentage
   * @returns {number} 0-100
   */
  getProgress() {
    if (this.stats.totalBlocks === 0) return 0;
    return Math.floor((this.stats.completedBlocks / this.stats.totalBlocks) * 100);
  }

  /**
   * Get ghost blocks for rendering (incomplete blocks)
   * @returns {Array<{x, y, z, blockType, status}>}
   */
  getGhostBlocks() {
    const ghosts = [];

    for (const block of this.blocks.values()) {
      if (block.status !== BlockStatus.COMPLETED) {
        ghosts.push({
          x: block.position.x,
          y: block.position.y,
          z: block.position.z,
          blockType: block.blueprintBlock.blockType,
          status: block.status
        });
      }
    }

    return ghosts;
  }

  /**
   * Pause construction
   */
  pause() {
    if (this.status === SiteStatus.IN_PROGRESS) {
      this.status = SiteStatus.PAUSED;
    }
  }

  /**
   * Resume construction
   */
  resume() {
    if (this.status === SiteStatus.PAUSED) {
      this.status = SiteStatus.IN_PROGRESS;
    }
  }

  /**
   * Cancel construction
   */
  cancel() {
    this.status = SiteStatus.CANCELLED;
    // Release all reservations
    for (const block of this.blocks.values()) {
      block.cancelReservation();
      block.releaseBuilder();
    }
  }

  /**
   * Check if construction is complete
   * @returns {boolean}
   */
  isComplete() {
    return this.status === SiteStatus.COMPLETED;
  }

  /**
   * Check if site is active (can be worked on)
   * @returns {boolean}
   */
  isActive() {
    return this.status === SiteStatus.PLANNED ||
           this.status === SiteStatus.IN_PROGRESS;
  }

  /**
   * Get site bounds
   * @returns {{minX, minY, minZ, maxX, maxY, maxZ}}
   */
  getBounds() {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const block of this.blocks.values()) {
      minX = Math.min(minX, block.position.x);
      maxX = Math.max(maxX, block.position.x);
      minY = Math.min(minY, block.position.y);
      maxY = Math.max(maxY, block.position.y);
      minZ = Math.min(minZ, block.position.z);
      maxZ = Math.max(maxZ, block.position.z);
    }

    return { minX, minY, minZ, maxX, maxY, maxZ };
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      progress: this.getProgress(),
      remainingMaterials: this.getRemainingMaterials()
    };
  }

  /**
   * Export to JSON
   */
  toJSON() {
    const blocksData = {};
    for (const [key, block] of this.blocks) {
      if (block.status !== BlockStatus.PENDING) {
        blocksData[key] = block.toJSON();
      }
    }

    return {
      id: this.id,
      blueprintId: this.blueprintId,
      position: this.position,
      rotation: this.rotation,
      priority: this.priority,
      status: this.status,
      blocks: blocksData,
      materialDropoff: this.materialDropoff,
      stagedMaterials: Object.fromEntries(this.stagedMaterials),
      stats: this.stats
    };
  }

  /**
   * Import from JSON (requires blueprint to be provided separately)
   * @param {object} data
   * @param {Blueprint} blueprint
   * @returns {ConstructionSite}
   */
  static fromJSON(data, blueprint) {
    const site = new ConstructionSite({
      id: data.id,
      blueprint,
      position: data.position,
      rotation: data.rotation,
      priority: data.priority,
      status: data.status
    });

    // Restore block states
    if (data.blocks) {
      for (const [key, blockData] of Object.entries(data.blocks)) {
        const block = site.blocks.get(key);
        if (block) {
          block.status = blockData.status;
          block.materialDelivered = blockData.materialDelivered;
          block.buildProgress = blockData.buildProgress;
          block.completedAt = blockData.completedAt;
        }
      }
    }

    // Restore staged materials
    if (data.stagedMaterials) {
      site.stagedMaterials = new Map(Object.entries(data.stagedMaterials));
    }

    // Restore stats
    if (data.stats) {
      site.stats = { ...site.stats, ...data.stats };
    }

    site._updateStats();
    return site;
  }
}
