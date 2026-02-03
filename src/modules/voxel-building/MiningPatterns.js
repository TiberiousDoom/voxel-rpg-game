/**
 * MiningPatterns.js - Advanced mining pattern system
 *
 * Provides mining patterns, auto-dig features, and
 * cave-in mechanics for the voxel mining system.
 *
 * Part of Phase 26: Advanced Mining Features
 */

/**
 * Mining pattern types
 */
export const MiningPatternType = {
  SINGLE: 'single',
  SHAFT: 'shaft',
  TUNNEL: 'tunnel',
  STAIRCASE: 'staircase',
  ROOM: 'room',
  STRIP_MINE: 'strip_mine',
  QUARRY: 'quarry'
};

/**
 * Mining direction
 */
export const MiningDirection = {
  NORTH: { dx: 0, dy: -1, dz: 0 },
  SOUTH: { dx: 0, dy: 1, dz: 0 },
  EAST: { dx: 1, dy: 0, dz: 0 },
  WEST: { dx: -1, dy: 0, dz: 0 },
  UP: { dx: 0, dy: 0, dz: 1 },
  DOWN: { dx: 0, dy: 0, dz: -1 }
};

/**
 * Mining pattern definitions
 */
export const MINING_PATTERNS = {
  [MiningPatternType.SINGLE]: {
    name: 'Single Block',
    description: 'Mine a single block',
    blocks: [{ x: 0, y: 0, z: 0 }],
    repeatable: false
  },

  [MiningPatternType.SHAFT]: {
    name: 'Vertical Shaft',
    description: 'Mine straight down (2x2)',
    blocks: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 }
    ],
    direction: MiningDirection.DOWN,
    repeatable: true
  },

  [MiningPatternType.TUNNEL]: {
    name: 'Horizontal Tunnel',
    description: 'Mine a 2-high, 3-wide tunnel',
    blocks: [
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 1 },
      { x: 0, y: 2, z: 0 }, { x: 0, y: 2, z: 1 }
    ],
    direction: MiningDirection.NORTH,
    repeatable: true
  },

  [MiningPatternType.STAIRCASE]: {
    name: 'Staircase',
    description: 'Mine descending stairs',
    blocks: [
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 1 }
    ],
    stepDown: true,
    repeatable: true
  },

  [MiningPatternType.ROOM]: {
    name: 'Room',
    description: 'Mine a rectangular room',
    configurable: true,
    defaultSize: { width: 5, depth: 5, height: 3 }
  },

  [MiningPatternType.STRIP_MINE]: {
    name: 'Strip Mine',
    description: 'Efficient ore-finding pattern',
    blocks: [
      // Main corridor
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 1 }
    ],
    branches: {
      spacing: 3,
      length: 8,
      direction: 'perpendicular'
    },
    repeatable: true
  },

  [MiningPatternType.QUARRY]: {
    name: 'Quarry',
    description: 'Mine a large open pit',
    configurable: true,
    defaultSize: { width: 10, depth: 10, height: 1 },
    layerByLayer: true
  }
};

/**
 * MiningPatternGenerator - Generates block positions for patterns
 */
export class MiningPatternGenerator {
  /**
   * Generate blocks for a pattern
   * @param {string} patternType - MiningPatternType
   * @param {object} origin - Starting position { x, y, z }
   * @param {object} options - Pattern options
   * @returns {Array} Array of { x, y, z } positions
   */
  static generate(patternType, origin, options = {}) {
    const pattern = MINING_PATTERNS[patternType];
    if (!pattern) return [];

    const direction = options.direction || pattern.direction || MiningDirection.NORTH;
    const size = options.size || pattern.defaultSize;
    const blocks = [];

    switch (patternType) {
      case MiningPatternType.SINGLE:
        blocks.push({ x: origin.x, y: origin.y, z: origin.z });
        break;

      case MiningPatternType.SHAFT:
        this._generateShaft(blocks, origin, options.depth || 10);
        break;

      case MiningPatternType.TUNNEL:
        this._generateTunnel(blocks, origin, direction, options.length || 10);
        break;

      case MiningPatternType.STAIRCASE:
        this._generateStaircase(blocks, origin, direction, options.depth || 10);
        break;

      case MiningPatternType.ROOM:
        this._generateRoom(blocks, origin, size);
        break;

      case MiningPatternType.STRIP_MINE:
        this._generateStripMine(blocks, origin, direction, options);
        break;

      case MiningPatternType.QUARRY:
        this._generateQuarry(blocks, origin, size);
        break;

      default:
        // Use predefined blocks
        if (pattern.blocks) {
          for (const block of pattern.blocks) {
            blocks.push({
              x: origin.x + block.x,
              y: origin.y + block.y,
              z: origin.z + block.z
            });
          }
        }
    }

    return blocks;
  }

  /**
   * Generate vertical shaft
   * @private
   */
  static _generateShaft(blocks, origin, depth) {
    for (let z = 0; z < depth; z++) {
      for (let dx = 0; dx < 2; dx++) {
        for (let dy = 0; dy < 2; dy++) {
          blocks.push({
            x: origin.x + dx,
            y: origin.y + dy,
            z: origin.z - z
          });
        }
      }
    }
  }

  /**
   * Generate horizontal tunnel
   * @private
   */
  static _generateTunnel(blocks, origin, direction, length) {
    const dir = typeof direction === 'string' ? MiningDirection[direction] : direction;

    for (let i = 0; i < length; i++) {
      // 3-wide, 2-high tunnel
      for (let w = -1; w <= 1; w++) {
        for (let h = 0; h < 2; h++) {
          const x = origin.x + (dir.dx * i) + (dir.dy !== 0 ? w : 0);
          const y = origin.y + (dir.dy * i) + (dir.dx !== 0 ? w : 0);
          const z = origin.z + h;
          blocks.push({ x, y, z });
        }
      }
    }
  }

  /**
   * Generate descending staircase
   * @private
   */
  static _generateStaircase(blocks, origin, direction, depth) {
    const dir = typeof direction === 'string' ? MiningDirection[direction] : direction;

    for (let i = 0; i < depth; i++) {
      // 2-wide, 3-high stair step
      for (let w = 0; w < 2; w++) {
        for (let h = 0; h < 3; h++) {
          const x = origin.x + (dir.dx * i) + (dir.dy !== 0 ? w : 0);
          const y = origin.y + (dir.dy * i) + (dir.dx !== 0 ? w : 0);
          const z = origin.z - i + h;
          blocks.push({ x, y, z });
        }
      }
    }
  }

  /**
   * Generate rectangular room
   * @private
   */
  static _generateRoom(blocks, origin, size) {
    const { width = 5, depth = 5, height = 3 } = size;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < depth; y++) {
        for (let z = 0; z < height; z++) {
          blocks.push({
            x: origin.x + x,
            y: origin.y + y,
            z: origin.z + z
          });
        }
      }
    }
  }

  /**
   * Generate strip mine pattern
   * @private
   */
  static _generateStripMine(blocks, origin, direction, options) {
    const mainLength = options.mainLength || 20;
    const branchSpacing = options.branchSpacing || 3;
    const branchLength = options.branchLength || 8;

    const dir = typeof direction === 'string' ? MiningDirection[direction] : direction;

    // Main corridor
    this._generateTunnel(blocks, origin, dir, mainLength);

    // Side branches
    for (let i = branchSpacing; i < mainLength; i += branchSpacing) {
      const branchOrigin = {
        x: origin.x + (dir.dx * i),
        y: origin.y + (dir.dy * i),
        z: origin.z
      };

      // Left branch
      const leftDir = { dx: dir.dy, dy: -dir.dx, dz: 0 };
      this._generateTunnel(blocks, branchOrigin, leftDir, branchLength);

      // Right branch
      const rightDir = { dx: -dir.dy, dy: dir.dx, dz: 0 };
      this._generateTunnel(blocks, branchOrigin, rightDir, branchLength);
    }
  }

  /**
   * Generate quarry pattern
   * @private
   */
  static _generateQuarry(blocks, origin, size) {
    const { width = 10, depth = 10, height = 1 } = size;

    // Generate layer by layer (top to bottom)
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < depth; y++) {
          blocks.push({
            x: origin.x + x,
            y: origin.y + y,
            z: origin.z - z
          });
        }
      }
    }
  }
}

/**
 * CaveInManager - Handles structural integrity and cave-ins
 */
export class CaveInManager {
  constructor(config = {}) {
    this.voxelWorld = config.voxelWorld || null;
    this.enabled = config.enabled !== false;
    this.maxUnsupportedSpan = config.maxUnsupportedSpan || 5;
    this.checkRadius = config.checkRadius || 3;
    this.caveInProbability = config.caveInProbability || 0.3;
    this.pendingCaveIns = [];
    this.supportBlocks = new Set(['stone', 'wood_pillar', 'support_beam', 'brick']);
  }

  /**
   * Set voxel world reference
   * @param {VoxelWorld} voxelWorld
   */
  setVoxelWorld(voxelWorld) {
    this.voxelWorld = voxelWorld;
  }

  /**
   * Check if a position needs support
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {object} Support status
   */
  checkSupport(x, y, z) {
    if (!this.voxelWorld || !this.enabled) {
      return { supported: true, span: 0 };
    }

    // Check above for blocks that need support
    const blockAbove = this.voxelWorld.getBlock(x, y, z + 1);
    if (!blockAbove || blockAbove.type === 'air') {
      return { supported: true, span: 0 };
    }

    // Count unsupported span in all directions
    const spans = [];
    const directions = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
    ];

    for (const dir of directions) {
      let span = 0;
      let cx = x;
      let cy = y;

      while (span < this.maxUnsupportedSpan + 1) {
        const block = this.voxelWorld.getBlock(cx, cy, z);
        if (block && block.type !== 'air') {
          // Found support
          break;
        }

        // Check for support column below
        const columnSupport = this._hasColumnSupport(cx, cy, z);
        if (columnSupport) {
          break;
        }

        cx += dir.dx;
        cy += dir.dy;
        span++;
      }

      spans.push(span);
    }

    const maxSpan = Math.max(...spans);
    const supported = maxSpan <= this.maxUnsupportedSpan;

    return {
      supported,
      span: maxSpan,
      risk: supported ? 0 : Math.min(1, (maxSpan - this.maxUnsupportedSpan) * 0.2)
    };
  }

  /**
   * Check for vertical support column
   * @private
   */
  _hasColumnSupport(x, y, z) {
    for (let checkZ = z - 1; checkZ >= 0; checkZ--) {
      const block = this.voxelWorld.getBlock(x, y, checkZ);
      if (!block || block.type === 'air') {
        return false;
      }
      if (this.supportBlocks.has(block.type)) {
        return true;
      }
    }
    // Reached bottom, considered supported
    return true;
  }

  /**
   * Check area for potential cave-ins after mining
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {Array} List of unstable positions
   */
  checkAreaStability(x, y, z) {
    if (!this.enabled || !this.voxelWorld) return [];

    const unstable = [];

    // Check surrounding area
    for (let dx = -this.checkRadius; dx <= this.checkRadius; dx++) {
      for (let dy = -this.checkRadius; dy <= this.checkRadius; dy++) {
        for (let dz = 0; dz <= this.checkRadius; dz++) {
          const checkX = x + dx;
          const checkY = y + dy;
          const checkZ = z + dz;

          const support = this.checkSupport(checkX, checkY, checkZ);
          if (!support.supported) {
            unstable.push({
              x: checkX,
              y: checkY,
              z: checkZ,
              risk: support.risk,
              span: support.span
            });
          }
        }
      }
    }

    return unstable;
  }

  /**
   * Process block mined event
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {object|null} Cave-in event or null
   */
  onBlockMined(x, y, z) {
    if (!this.enabled) return null;

    const unstable = this.checkAreaStability(x, y, z);

    if (unstable.length === 0) return null;

    // Check if cave-in triggers
    for (const pos of unstable) {
      if (Math.random() < pos.risk * this.caveInProbability) {
        return this._triggerCaveIn(pos.x, pos.y, pos.z);
      }
    }

    return null;
  }

  /**
   * Trigger a cave-in at position
   * @private
   */
  _triggerCaveIn(x, y, z) {
    const affectedBlocks = [];

    // Collapse blocks above
    for (let checkZ = z + 1; checkZ < z + 10; checkZ++) {
      const block = this.voxelWorld?.getBlock(x, y, checkZ);
      if (!block || block.type === 'air') break;

      // Check horizontal spread
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const spreadBlock = this.voxelWorld?.getBlock(x + dx, y + dy, checkZ);
          if (spreadBlock && spreadBlock.type !== 'air') {
            if (Math.random() < 0.5) {
              affectedBlocks.push({ x: x + dx, y: y + dy, z: checkZ, type: spreadBlock.type });
            }
          }
        }
      }
    }

    return {
      type: 'cave_in',
      origin: { x, y, z },
      affectedBlocks,
      timestamp: Date.now()
    };
  }

  /**
   * Get recommended support positions
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {Array} Positions where support is recommended
   */
  getRecommendedSupports(x, y, z) {
    const unstable = this.checkAreaStability(x, y, z);
    const supports = [];

    for (const pos of unstable) {
      // Recommend support at high-risk positions
      if (pos.risk > 0.3) {
        // Find nearest floor position
        let floorZ = pos.z;
        while (floorZ > 0) {
          const block = this.voxelWorld?.getBlock(pos.x, pos.y, floorZ - 1);
          if (block && block.type !== 'air') break;
          floorZ--;
        }

        supports.push({
          x: pos.x,
          y: pos.y,
          z: floorZ,
          recommendedType: 'support_beam',
          urgency: pos.risk
        });
      }
    }

    return supports;
  }

  /**
   * Update cave-in simulation
   * @param {number} deltaTime
   */
  update(deltaTime) {
    // Process pending cave-ins
    const completed = [];

    for (let i = 0; i < this.pendingCaveIns.length; i++) {
      const caveIn = this.pendingCaveIns[i];
      caveIn.progress = (caveIn.progress || 0) + deltaTime;

      if (caveIn.progress >= 1000) { // 1 second collapse
        completed.push(i);
      }
    }

    // Remove completed cave-ins
    for (let i = completed.length - 1; i >= 0; i--) {
      this.pendingCaveIns.splice(completed[i], 1);
    }
  }

  /**
   * Enable/disable cave-in system
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

/**
 * AutoDigManager - Manages automatic mining expansion
 */
export class AutoDigManager {
  constructor(config = {}) {
    this.gatheringManager = config.gatheringManager || null;
    this.voxelWorld = config.voxelWorld || null;
    this.enabled = false;
    this.activePatterns = new Map(); // patternId -> pattern state
    this.maxActivePatterns = config.maxActivePatterns || 5;
  }

  /**
   * Set external references
   * @param {object} refs
   */
  setReferences(refs) {
    if (refs.gatheringManager) this.gatheringManager = refs.gatheringManager;
    if (refs.voxelWorld) this.voxelWorld = refs.voxelWorld;
  }

  /**
   * Start an auto-dig pattern
   * @param {string} patternType - MiningPatternType
   * @param {object} origin - Starting position
   * @param {object} options - Pattern options
   * @returns {string|null} Pattern ID or null
   */
  startPattern(patternType, origin, options = {}) {
    if (!this.enabled || !this.gatheringManager) return null;
    if (this.activePatterns.size >= this.maxActivePatterns) return null;

    const patternId = `autoDig-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const pattern = {
      id: patternId,
      type: patternType,
      origin: { ...origin },
      options: { ...options },
      currentStep: 0,
      maxSteps: options.maxSteps || 100,
      paused: false,
      createdAt: Date.now()
    };

    this.activePatterns.set(patternId, pattern);
    this._queueNextBlocks(pattern);

    return patternId;
  }

  /**
   * Queue next blocks for mining
   * @private
   */
  _queueNextBlocks(pattern) {
    const batchSize = 10; // Blocks to queue at once
    const blocks = MiningPatternGenerator.generate(
      pattern.type,
      pattern.origin,
      {
        ...pattern.options,
        startStep: pattern.currentStep,
        maxSteps: batchSize
      }
    );

    // Filter to unqueued, mineable blocks
    const toQueue = blocks.filter(pos => {
      const block = this.voxelWorld?.getBlock(pos.x, pos.y, pos.z);
      return block && block.type !== 'air';
    });

    // Queue for mining
    for (const pos of toQueue) {
      this.gatheringManager?.createMiningTask(pos.x, pos.y, pos.z);
    }

    pattern.currentStep += blocks.length;
  }

  /**
   * Pause a pattern
   * @param {string} patternId
   */
  pausePattern(patternId) {
    const pattern = this.activePatterns.get(patternId);
    if (pattern) {
      pattern.paused = true;
    }
  }

  /**
   * Resume a pattern
   * @param {string} patternId
   */
  resumePattern(patternId) {
    const pattern = this.activePatterns.get(patternId);
    if (pattern) {
      pattern.paused = false;
    }
  }

  /**
   * Cancel a pattern
   * @param {string} patternId
   */
  cancelPattern(patternId) {
    this.activePatterns.delete(patternId);
  }

  /**
   * Update auto-dig patterns
   */
  update() {
    if (!this.enabled) return;

    for (const pattern of this.activePatterns.values()) {
      if (pattern.paused) continue;
      if (pattern.currentStep >= pattern.maxSteps) {
        this.activePatterns.delete(pattern.id);
        continue;
      }

      // Check if more blocks need to be queued
      const pendingTasks = this.gatheringManager?.getPendingTaskCount() || 0;
      if (pendingTasks < 20) {
        this._queueNextBlocks(pattern);
      }
    }
  }

  /**
   * Get active pattern count
   * @returns {number}
   */
  getActivePatternCount() {
    return this.activePatterns.size;
  }

  /**
   * Get all active patterns
   * @returns {Array}
   */
  getActivePatterns() {
    return Array.from(this.activePatterns.values());
  }

  /**
   * Enable/disable auto-dig
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export default {
  MiningPatternType,
  MiningDirection,
  MINING_PATTERNS,
  MiningPatternGenerator,
  CaveInManager,
  AutoDigManager
};
