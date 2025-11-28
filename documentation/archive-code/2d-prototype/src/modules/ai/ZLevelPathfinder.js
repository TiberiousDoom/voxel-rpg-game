/**
 * ZLevelPathfinder.js - 3D pathfinding with Z-level support
 *
 * Extends A* pathfinding to handle vertical movement through
 * stairs, ladders, and ramps in the voxel world.
 *
 * Part of Phase 15: Z-Level Pathfinding
 */

import { BlockType, isBlockWalkable, isBlockClimbable, getBlockProperty } from '../voxel/BlockTypes.js';

/**
 * Priority Queue for A* algorithm
 */
class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  isEmpty() {
    return this.elements.length === 0;
  }

  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this._bubbleUp(this.elements.length - 1);
  }

  dequeue() {
    if (this.isEmpty()) return null;

    const result = this.elements[0].element;
    const last = this.elements.pop();

    if (this.elements.length > 0) {
      this.elements[0] = last;
      this._bubbleDown(0);
    }

    return result;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.elements[parentIndex].priority <= this.elements[index].priority) {
        break;
      }
      [this.elements[parentIndex], this.elements[index]] =
        [this.elements[index], this.elements[parentIndex]];
      index = parentIndex;
    }
  }

  _bubbleDown(index) {
    const length = this.elements.length;

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length &&
          this.elements[leftChild].priority < this.elements[smallest].priority) {
        smallest = leftChild;
      }

      if (rightChild < length &&
          this.elements[rightChild].priority < this.elements[smallest].priority) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      [this.elements[index], this.elements[smallest]] =
        [this.elements[smallest], this.elements[index]];
      index = smallest;
    }
  }
}

/**
 * Movement costs for different vertical transitions
 */
const VERTICAL_MOVEMENT_COSTS = {
  flat: 1.0,       // Same Z-level horizontal movement
  diagonal: 1.414, // Diagonal movement on same level
  stairs: 2.0,     // Stairs up/down (1 Z-level)
  ladder: 2.5,     // Ladder up/down (1 Z-level)
  ramp: 1.5        // Ramp up/down (gradual slope)
};

/**
 * ZLevelPathfinder - 3D A* pathfinding for voxel worlds
 */
export class ZLevelPathfinder {
  /**
   * Create Z-level pathfinder
   * @param {VoxelWorld} voxelWorld - Reference to voxel world
   * @param {object} options - Configuration options
   */
  constructor(voxelWorld, options = {}) {
    this.voxelWorld = voxelWorld;

    // Configuration
    this.config = {
      maxSearchNodes: options.maxSearchNodes || 2000,
      allowDiagonal: options.allowDiagonal !== false,
      maxZLevelChange: options.maxZLevelChange || 10,
      verticalMovementCost: options.verticalMovementCost || 2.0,
      ...options
    };

    // Statistics
    this.stats = {
      pathsCalculated: 0,
      successfulPaths: 0,
      failedPaths: 0,
      totalNodesSearched: 0
    };
  }

  /**
   * Find path from start to goal in 3D space
   * @param {object} start - Start position {x, y, z}
   * @param {object} goal - Goal position {x, y, z}
   * @param {object} options - Pathfinding options
   * @returns {object} Result {path, success, nodesSearched, reason}
   */
  findPath(start, goal, options = {}) {
    // Validate positions
    if (!this._isValidPosition(start) || !this._isValidPosition(goal)) {
      return { path: [], success: false, nodesSearched: 0, reason: 'invalid_position' };
    }

    // Check if start/goal are walkable
    if (!this._isWalkable(start)) {
      return { path: [], success: false, nodesSearched: 0, reason: 'start_blocked' };
    }
    if (!this._isWalkable(goal)) {
      return { path: [], success: false, nodesSearched: 0, reason: 'goal_blocked' };
    }

    // Quick check: if on same level and close, try direct path
    if (start.z === goal.z && this._heuristic2D(start, goal) < 10) {
      const directPath = this._tryDirectPath(start, goal);
      if (directPath) {
        this.stats.pathsCalculated++;
        this.stats.successfulPaths++;
        return { path: directPath, success: true, nodesSearched: 0, direct: true };
      }
    }

    // A* algorithm in 3D
    const frontier = new PriorityQueue();
    frontier.enqueue(start, 0);

    const cameFrom = new Map();
    const costSoFar = new Map();

    const startKey = this._nodeKey(start);
    cameFrom.set(startKey, null);
    costSoFar.set(startKey, 0);

    let nodesSearched = 0;

    while (!frontier.isEmpty() && nodesSearched < this.config.maxSearchNodes) {
      const current = frontier.dequeue();
      const currentKey = this._nodeKey(current);
      nodesSearched++;

      // Goal reached
      if (current.x === goal.x && current.y === goal.y && current.z === goal.z) {
        const path = this._reconstructPath(cameFrom, current);

        this.stats.pathsCalculated++;
        this.stats.successfulPaths++;
        this.stats.totalNodesSearched += nodesSearched;

        return { path, success: true, nodesSearched };
      }

      // Explore neighbors (including vertical connections)
      const neighbors = this._getNeighbors3D(current);

      for (const neighbor of neighbors) {
        const nextKey = this._nodeKey(neighbor.position);
        const newCost = costSoFar.get(currentKey) + neighbor.cost;

        if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
          costSoFar.set(nextKey, newCost);
          const priority = newCost + this._heuristic3D(neighbor.position, goal);
          frontier.enqueue(neighbor.position, priority);
          cameFrom.set(nextKey, current);
        }
      }
    }

    // No path found
    this.stats.pathsCalculated++;
    this.stats.failedPaths++;
    this.stats.totalNodesSearched += nodesSearched;

    return {
      path: [],
      success: false,
      nodesSearched,
      reason: nodesSearched >= this.config.maxSearchNodes ? 'max_nodes_exceeded' : 'no_path'
    };
  }

  /**
   * Find path staying on same Z-level (faster for simple navigation)
   * @param {object} start - Start position {x, y, z}
   * @param {object} goal - Goal position {x, y, z}
   * @returns {object} Result
   */
  findPath2D(start, goal) {
    // Force goal to be on same Z-level as start
    const goal2D = { x: goal.x, y: goal.y, z: start.z };
    return this.findPath(start, goal2D);
  }

  /**
   * Get 3D neighbors including vertical connections
   * @private
   */
  _getNeighbors3D(position) {
    const neighbors = [];
    const { x, y, z } = position;

    // Get current block info
    const currentBlock = this.voxelWorld?.getBlock(x, y, z);
    const currentClimbable = isBlockClimbable(currentBlock);
    const connectsUp = getBlockProperty(currentBlock, 'connectsZLevel', 0) > 0;
    const connectsDown = getBlockProperty(currentBlock, 'connectsZLevel', 0) < 0;

    // Horizontal neighbors (same Z-level)
    const horizontalOffsets = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ];

    // Add diagonal if allowed
    if (this.config.allowDiagonal) {
      horizontalOffsets.push(
        { dx: 1, dy: 1 },
        { dx: 1, dy: -1 },
        { dx: -1, dy: 1 },
        { dx: -1, dy: -1 }
      );
    }

    for (const offset of horizontalOffsets) {
      const newPos = { x: x + offset.dx, y: y + offset.dy, z };

      if (this._isWalkable(newPos)) {
        const isDiagonal = offset.dx !== 0 && offset.dy !== 0;
        neighbors.push({
          position: newPos,
          cost: isDiagonal ? VERTICAL_MOVEMENT_COSTS.diagonal : VERTICAL_MOVEMENT_COSTS.flat
        });
      }
    }

    // Vertical neighbors (stairs/ladders)
    // Check if current position has stairs up
    if (connectsUp || currentClimbable) {
      const upPos = { x, y, z: z + 1 };
      if (this._isWalkable(upPos) || this._hasClimbableAt(upPos)) {
        neighbors.push({
          position: upPos,
          cost: currentClimbable ? VERTICAL_MOVEMENT_COSTS.ladder : VERTICAL_MOVEMENT_COSTS.stairs
        });
      }
    }

    // Check if current position has stairs down
    if (connectsDown || currentClimbable) {
      const downPos = { x, y, z: z - 1 };
      if (this._isWalkable(downPos) || this._hasClimbableAt(downPos)) {
        neighbors.push({
          position: downPos,
          cost: currentClimbable ? VERTICAL_MOVEMENT_COSTS.ladder : VERTICAL_MOVEMENT_COSTS.stairs
        });
      }
    }

    // Check for climbable blocks above/below that we can use
    if (!currentClimbable) {
      // Look for ladder/stairs at Z+1 that we can climb up to
      const blockAbove = this.voxelWorld?.getBlock(x, y, z + 1);
      if (isBlockClimbable(blockAbove)) {
        const upPos = { x, y, z: z + 1 };
        neighbors.push({
          position: upPos,
          cost: VERTICAL_MOVEMENT_COSTS.ladder
        });
      }

      // Look for ladder/stairs at Z-1 that connects to us
      const blockBelow = this.voxelWorld?.getBlock(x, y, z - 1);
      if (isBlockClimbable(blockBelow)) {
        const downPos = { x, y, z: z - 1 };
        neighbors.push({
          position: downPos,
          cost: VERTICAL_MOVEMENT_COSTS.ladder
        });
      }
    }

    // Check ramp directions (diagonal movement with Z change)
    const rampBlocks = [
      { type: BlockType.RAMP_NORTH, dx: 0, dy: -1 },
      { type: BlockType.RAMP_SOUTH, dx: 0, dy: 1 },
      { type: BlockType.RAMP_EAST, dx: 1, dy: 0 },
      { type: BlockType.RAMP_WEST, dx: -1, dy: 0 }
    ];

    for (const ramp of rampBlocks) {
      // Check if we're on a ramp going up
      if (currentBlock === ramp.type) {
        const upPos = { x: x + ramp.dx, y: y + ramp.dy, z: z + 1 };
        if (this._isWalkable(upPos)) {
          neighbors.push({
            position: upPos,
            cost: VERTICAL_MOVEMENT_COSTS.ramp
          });
        }
      }

      // Check adjacent ramp that leads down to us
      const adjacentBlock = this.voxelWorld?.getBlock(x - ramp.dx, y - ramp.dy, z + 1);
      if (adjacentBlock === ramp.type) {
        const downPos = { x: x - ramp.dx, y: y - ramp.dy, z: z + 1 };
        if (this._isWalkable(downPos)) {
          neighbors.push({
            position: downPos,
            cost: VERTICAL_MOVEMENT_COSTS.ramp
          });
        }
      }
    }

    return neighbors;
  }

  /**
   * Check if position is walkable
   * @private
   */
  _isWalkable(position) {
    if (!this.voxelWorld) {
      return true; // No voxel world, assume walkable
    }

    const { x, y, z } = position;

    // Get block at position (should be AIR or passable)
    const blockAtPos = this.voxelWorld.getBlock(x, y, z);

    // Check block below (should be solid/walkable floor)
    const blockBelow = this.voxelWorld.getBlock(x, y, z - 1);

    // Position is walkable if:
    // 1. Block at position is AIR or climbable (ladder/stairs)
    // 2. Block below is solid and walkable
    const isAirOrClimbable = blockAtPos === BlockType.AIR || isBlockClimbable(blockAtPos);
    const hasFloor = isBlockWalkable(blockBelow);

    return isAirOrClimbable && hasFloor;
  }

  /**
   * Check if position has climbable block
   * @private
   */
  _hasClimbableAt(position) {
    if (!this.voxelWorld) return false;

    const block = this.voxelWorld.getBlock(position.x, position.y, position.z);
    return isBlockClimbable(block);
  }

  /**
   * Validate position is within bounds
   * @private
   */
  _isValidPosition(position) {
    if (!position || typeof position.x !== 'number' ||
        typeof position.y !== 'number' || typeof position.z !== 'number') {
      return false;
    }

    // Check Z bounds
    if (position.z < 0 || position.z > this.config.maxZLevelChange * 2) {
      return false;
    }

    return true;
  }

  /**
   * Try direct path (line of sight on same level)
   * @private
   */
  _tryDirectPath(start, goal) {
    if (start.z !== goal.z) return null;

    // Bresenham's line algorithm to check if path is clear
    let x0 = start.x;
    let y0 = start.y;
    const x1 = goal.x;
    const y1 = goal.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    const path = [];

    while (true) {
      const pos = { x: x0, y: y0, z: start.z };

      if (!this._isWalkable(pos)) {
        return null; // Blocked
      }

      path.push(pos);

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return path;
  }

  /**
   * 3D heuristic (octile distance with vertical component)
   * @private
   */
  _heuristic3D(node, goal) {
    const dx = Math.abs(goal.x - node.x);
    const dy = Math.abs(goal.y - node.y);
    const dz = Math.abs(goal.z - node.z);

    // Octile distance for horizontal, plus vertical cost
    const horizontal = dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
    const vertical = dz * this.config.verticalMovementCost;

    return horizontal + vertical;
  }

  /**
   * 2D heuristic
   * @private
   */
  _heuristic2D(node, goal) {
    const dx = Math.abs(goal.x - node.x);
    const dy = Math.abs(goal.y - node.y);
    return dx + dy;
  }

  /**
   * Create unique key for node position
   * @private
   */
  _nodeKey(position) {
    return `${position.x},${position.y},${position.z}`;
  }

  /**
   * Reconstruct path from cameFrom map
   * @private
   */
  _reconstructPath(cameFrom, current) {
    const path = [];
    let node = current;

    while (node !== null) {
      path.unshift({ ...node });
      const key = this._nodeKey(node);
      node = cameFrom.get(key);
    }

    return path;
  }

  /**
   * Get pathfinding statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      averageNodesSearched: this.stats.pathsCalculated > 0
        ? this.stats.totalNodesSearched / this.stats.pathsCalculated
        : 0,
      successRate: this.stats.pathsCalculated > 0
        ? this.stats.successfulPaths / this.stats.pathsCalculated
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      pathsCalculated: 0,
      successfulPaths: 0,
      failedPaths: 0,
      totalNodesSearched: 0
    };
  }
}

export default ZLevelPathfinder;
