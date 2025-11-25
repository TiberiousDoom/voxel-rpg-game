/**
 * PathfindingSystem.js - A* Pathfinding for AI Navigation
 *
 * Features:
 * - A* pathfinding algorithm for efficient shortest path calculation
 * - Terrain-aware movement costs
 * - Dynamic obstacle avoidance
 * - Path smoothing and caching
 * - Integration with TerrainSystem and SpatialGrid
 *
 * @see https://www.redblobgames.com/pathfinding/a-star/introduction.html
 */

/**
 * Priority Queue implementation using binary heap
 * Used for efficient A* frontier management
 */
class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  /**
   * Check if queue is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.elements.length === 0;
  }

  /**
   * Add element with priority (lower priority = higher importance)
   * @param {*} element - Element to add
   * @param {number} priority - Priority value
   */
  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this._bubbleUp(this.elements.length - 1);
  }

  /**
   * Remove and return highest priority element
   * @returns {*} Element or null if empty
   */
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

  /**
   * Get size of queue
   * @returns {number}
   */
  size() {
    return this.elements.length;
  }

  /**
   * Bubble up element at index
   * @private
   */
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

  /**
   * Bubble down element at index
   * @private
   */
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
 * Terrain cost modifiers by type
 */
const TERRAIN_COSTS = {
  GRASS: 1.0,
  PLAINS: 1.0,
  ROAD: 0.5,    // Roads are faster
  FOREST: 1.5,  // Forests slow movement
  SAND: 1.3,    // Sand is harder to traverse
  SNOW: 1.4,    // Snow slows movement
  SWAMP: 2.0,   // Swamps are very slow
  MOUNTAIN: 3.0, // Mountains are difficult
  WATER: Infinity, // Water is impassable by default
  DEEP_WATER: Infinity,
  WALL: Infinity,
  BUILDING: Infinity
};

/**
 * PathfindingSystem class
 * Provides A* pathfinding with terrain awareness
 */
export class PathfindingSystem {
  /**
   * Create pathfinding system
   * @param {Object} options - Configuration options
   * @param {number} options.gridSize - Size of pathfinding grid cells (default: 32)
   * @param {number} options.maxSearchNodes - Maximum nodes to search (default: 1000)
   * @param {boolean} options.allowDiagonal - Allow diagonal movement (default: true)
   * @param {number} options.cacheTimeout - Path cache timeout in ms (default: 5000)
   */
  constructor(options = {}) {
    this.gridSize = options.gridSize || 32;
    this.maxSearchNodes = options.maxSearchNodes || 1000;
    this.allowDiagonal = options.allowDiagonal !== false;
    this.cacheTimeout = options.cacheTimeout || 5000;

    // Terrain data reference
    this.terrainData = null;
    this.worldWidth = 0;
    this.worldHeight = 0;

    // Dynamic obstacles
    this.obstacles = new Map(); // obstacleId -> {position, radius}

    // Path cache for performance
    this.pathCache = new Map();

    // Statistics
    this.stats = {
      pathsCalculated: 0,
      cacheHits: 0,
      averageNodesSearched: 0,
      totalNodesSearched: 0
    };
  }

  /**
   * Set terrain data for pathfinding
   * @param {Object} terrainData - Terrain information
   * @param {number} worldWidth - World width in pixels
   * @param {number} worldHeight - World height in pixels
   */
  setTerrainData(terrainData, worldWidth, worldHeight) {
    this.terrainData = terrainData;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.clearCache();
  }

  /**
   * Add a dynamic obstacle
   * @param {string} id - Obstacle ID
   * @param {Object} position - {x, z} position
   * @param {number} radius - Obstacle radius
   */
  addObstacle(id, position, radius = 16) {
    this.obstacles.set(id, { position: { ...position }, radius });
    this.clearCache();
  }

  /**
   * Remove a dynamic obstacle
   * @param {string} id - Obstacle ID
   */
  removeObstacle(id) {
    if (this.obstacles.delete(id)) {
      this.clearCache();
    }
  }

  /**
   * Update obstacle position
   * @param {string} id - Obstacle ID
   * @param {Object} position - New position {x, z}
   */
  updateObstacle(id, position) {
    const obstacle = this.obstacles.get(id);
    if (obstacle) {
      obstacle.position = { ...position };
      this.clearCache();
    }
  }

  /**
   * Clear path cache
   */
  clearCache() {
    this.pathCache.clear();
  }

  /**
   * Find path from start to goal
   * @param {Object} start - Start position {x, z}
   * @param {Object} goal - Goal position {x, z}
   * @param {Object} options - Pathfinding options
   * @param {boolean} options.smoothPath - Apply path smoothing (default: true)
   * @param {boolean} options.useCache - Use path cache (default: true)
   * @param {Function} options.isWalkable - Custom walkability check
   * @param {Function} options.getCost - Custom movement cost function
   * @returns {Object} Result {path, success, nodesSearched}
   */
  findPath(start, goal, options = {}) {
    const smoothPath = options.smoothPath !== false;
    const useCache = options.useCache !== false;

    // Check cache first
    if (useCache) {
      const cachedPath = this._getCachedPath(start, goal);
      if (cachedPath) {
        this.stats.cacheHits++;
        return { path: cachedPath, success: true, nodesSearched: 0, cached: true };
      }
    }

    // Convert to grid coordinates
    const startNode = this._worldToGrid(start);
    const goalNode = this._worldToGrid(goal);

    // Check if start or goal is walkable
    if (!this._isWalkable(startNode, options.isWalkable)) {
      return { path: [], success: false, nodesSearched: 0, reason: 'start_blocked' };
    }
    if (!this._isWalkable(goalNode, options.isWalkable)) {
      return { path: [], success: false, nodesSearched: 0, reason: 'goal_blocked' };
    }

    // A* algorithm
    const frontier = new PriorityQueue();
    frontier.enqueue(startNode, 0);

    const cameFrom = new Map();
    const costSoFar = new Map();

    const startKey = this._nodeKey(startNode);
    cameFrom.set(startKey, null);
    costSoFar.set(startKey, 0);

    let nodesSearched = 0;

    while (!frontier.isEmpty() && nodesSearched < this.maxSearchNodes) {
      const current = frontier.dequeue();
      const currentKey = this._nodeKey(current);
      nodesSearched++;

      // Goal reached
      if (current.x === goalNode.x && current.z === goalNode.z) {
        let path = this._reconstructPath(cameFrom, current);

        // Convert to world coordinates
        path = path.map(node => this._gridToWorld(node));

        // Smooth path if requested
        if (smoothPath && path.length > 2) {
          path = this._smoothPath(path, options.isWalkable);
        }

        // Cache the path
        if (useCache) {
          this._cachePath(start, goal, path);
        }

        // Update stats
        this.stats.pathsCalculated++;
        this.stats.totalNodesSearched += nodesSearched;
        this.stats.averageNodesSearched =
          this.stats.totalNodesSearched / this.stats.pathsCalculated;

        return { path, success: true, nodesSearched };
      }

      // Explore neighbors
      const neighbors = this._getNeighbors(current, options.isWalkable);

      for (const next of neighbors) {
        const nextKey = this._nodeKey(next);
        const movementCost = this._getMovementCost(current, next, options.getCost);
        const newCost = costSoFar.get(currentKey) + movementCost;

        if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
          costSoFar.set(nextKey, newCost);
          const priority = newCost + this._heuristic(next, goalNode);
          frontier.enqueue(next, priority);
          cameFrom.set(nextKey, current);
        }
      }
    }

    // No path found
    this.stats.pathsCalculated++;
    this.stats.totalNodesSearched += nodesSearched;
    this.stats.averageNodesSearched =
      this.stats.totalNodesSearched / this.stats.pathsCalculated;

    return {
      path: [],
      success: false,
      nodesSearched,
      reason: nodesSearched >= this.maxSearchNodes ? 'max_nodes_exceeded' : 'no_path'
    };
  }

  /**
   * Find path with multiple waypoints
   * @param {Object[]} waypoints - Array of {x, z} positions
   * @param {Object} options - Pathfinding options
   * @returns {Object} Result {path, success}
   */
  findPathThroughWaypoints(waypoints, options = {}) {
    if (waypoints.length < 2) {
      return { path: waypoints.length === 1 ? [waypoints[0]] : [], success: true };
    }

    const fullPath = [];
    let totalNodesSearched = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const result = this.findPath(waypoints[i], waypoints[i + 1], options);
      totalNodesSearched += result.nodesSearched;

      if (!result.success) {
        return { path: fullPath, success: false, failedAt: i, nodesSearched: totalNodesSearched };
      }

      // Add path (skip first point except for first segment to avoid duplicates)
      if (i === 0) {
        fullPath.push(...result.path);
      } else {
        fullPath.push(...result.path.slice(1));
      }
    }

    return { path: fullPath, success: true, nodesSearched: totalNodesSearched };
  }

  /**
   * Get direct line path if clear (no obstacles)
   * @param {Object} start - Start position {x, z}
   * @param {Object} goal - Goal position {x, z}
   * @returns {Object|null} Direct path or null if blocked
   */
  getDirectPath(start, goal) {
    if (this._hasLineOfSight(start, goal)) {
      return { path: [start, goal], success: true, direct: true };
    }
    return null;
  }

  /**
   * Calculate heuristic (estimated cost to goal)
   * Uses octile distance for diagonal movement
   * @private
   */
  _heuristic(node, goal) {
    const dx = Math.abs(goal.x - node.x);
    const dz = Math.abs(goal.z - node.z);

    if (this.allowDiagonal) {
      // Octile distance
      const D = 1;
      const D2 = Math.SQRT2;
      return D * (dx + dz) + (D2 - 2 * D) * Math.min(dx, dz);
    }

    // Manhattan distance
    return dx + dz;
  }

  /**
   * Get walkable neighbors
   * @private
   */
  _getNeighbors(node, customIsWalkable) {
    const neighbors = [];
    const directions = [
      { x: 0, z: -1 },  // North
      { x: 1, z: 0 },   // East
      { x: 0, z: 1 },   // South
      { x: -1, z: 0 }   // West
    ];

    if (this.allowDiagonal) {
      directions.push(
        { x: 1, z: -1 },  // NE
        { x: 1, z: 1 },   // SE
        { x: -1, z: 1 },  // SW
        { x: -1, z: -1 }  // NW
      );
    }

    for (const dir of directions) {
      const neighbor = {
        x: node.x + dir.x,
        z: node.z + dir.z
      };

      if (this._isWalkable(neighbor, customIsWalkable)) {
        // For diagonal movement, check that we can actually move diagonally
        // (not cutting through corners)
        if (this.allowDiagonal && dir.x !== 0 && dir.z !== 0) {
          const horiz = { x: node.x + dir.x, z: node.z };
          const vert = { x: node.x, z: node.z + dir.z };
          if (!this._isWalkable(horiz, customIsWalkable) ||
              !this._isWalkable(vert, customIsWalkable)) {
            continue;
          }
        }
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  /**
   * Check if a grid position is walkable
   * @private
   */
  _isWalkable(node, customCheck) {
    // Use custom check if provided
    if (customCheck) {
      const worldPos = this._gridToWorld(node);
      return customCheck(worldPos);
    }

    // Check bounds
    const worldPos = this._gridToWorld(node);
    if (worldPos.x < 0 || worldPos.x >= this.worldWidth ||
        worldPos.z < 0 || worldPos.z >= this.worldHeight) {
      return false;
    }

    // Check terrain
    if (this.terrainData) {
      const terrainType = this._getTerrainAt(worldPos);
      if (TERRAIN_COSTS[terrainType] === Infinity) {
        return false;
      }
    }

    // Check dynamic obstacles
    for (const obstacle of this.obstacles.values()) {
      const dx = worldPos.x - obstacle.position.x;
      const dz = worldPos.z - obstacle.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < obstacle.radius * obstacle.radius) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get movement cost between adjacent nodes
   * @private
   */
  _getMovementCost(from, to, customCost) {
    const toWorld = this._gridToWorld(to);

    // Base cost (1 for cardinal, sqrt(2) for diagonal)
    let cost = (from.x !== to.x && from.z !== to.z) ? Math.SQRT2 : 1;

    // Custom cost function
    if (customCost) {
      const customMultiplier = customCost(toWorld);
      if (typeof customMultiplier === 'number') {
        cost *= customMultiplier;
      }
    } else if (this.terrainData) {
      // Apply terrain cost
      const terrainType = this._getTerrainAt(toWorld);
      cost *= TERRAIN_COSTS[terrainType] || 1;
    }

    return cost;
  }

  /**
   * Get terrain type at position
   * @private
   */
  _getTerrainAt(position) {
    if (!this.terrainData) return 'GRASS';

    // Handle different terrain data formats
    if (typeof this.terrainData === 'function') {
      return this.terrainData(position);
    }

    if (this.terrainData.getTerrainAt) {
      return this.terrainData.getTerrainAt(position.x, position.z);
    }

    return 'GRASS';
  }

  /**
   * Reconstruct path from cameFrom map
   * @private
   */
  _reconstructPath(cameFrom, current) {
    const path = [current];
    let currentKey = this._nodeKey(current);

    while (cameFrom.get(currentKey) !== null) {
      current = cameFrom.get(currentKey);
      currentKey = this._nodeKey(current);
      path.unshift(current);
    }

    return path;
  }

  /**
   * Smooth path by removing unnecessary waypoints
   * @private
   */
  _smoothPath(path, customIsWalkable) {
    if (path.length <= 2) return path;

    const smoothed = [path[0]];
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
      let furthest = currentIndex + 1;

      // Find furthest point with line of sight
      for (let i = path.length - 1; i > currentIndex + 1; i--) {
        if (this._hasLineOfSight(path[currentIndex], path[i], customIsWalkable)) {
          furthest = i;
          break;
        }
      }

      smoothed.push(path[furthest]);
      currentIndex = furthest;
    }

    return smoothed;
  }

  /**
   * Check line of sight between two world positions
   * Uses Bresenham's line algorithm
   * @private
   */
  _hasLineOfSight(start, goal, customIsWalkable) {
    const startGrid = this._worldToGrid(start);
    const goalGrid = this._worldToGrid(goal);

    let x0 = startGrid.x;
    let z0 = startGrid.z;
    const x1 = goalGrid.x;
    const z1 = goalGrid.z;

    const dx = Math.abs(x1 - x0);
    const dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;

    while (true) {
      if (!this._isWalkable({ x: x0, z: z0 }, customIsWalkable)) {
        return false;
      }

      if (x0 === x1 && z0 === z1) break;

      const e2 = 2 * err;
      if (e2 > -dz) {
        err -= dz;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        z0 += sz;
      }
    }

    return true;
  }

  /**
   * Convert world position to grid node
   * @private
   */
  _worldToGrid(position) {
    return {
      x: Math.floor(position.x / this.gridSize),
      z: Math.floor(position.z / this.gridSize)
    };
  }

  /**
   * Convert grid node to world position (center of cell)
   * @private
   */
  _gridToWorld(node) {
    return {
      x: node.x * this.gridSize + this.gridSize / 2,
      z: node.z * this.gridSize + this.gridSize / 2
    };
  }

  /**
   * Generate cache key for node
   * @private
   */
  _nodeKey(node) {
    return `${node.x},${node.z}`;
  }

  /**
   * Get cached path
   * @private
   */
  _getCachedPath(start, goal) {
    const key = `${Math.floor(start.x)},${Math.floor(start.z)}-${Math.floor(goal.x)},${Math.floor(goal.z)}`;
    const cached = this.pathCache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return [...cached.path]; // Return copy
    }

    return null;
  }

  /**
   * Cache a path
   * @private
   */
  _cachePath(start, goal, path) {
    const key = `${Math.floor(start.x)},${Math.floor(start.z)}-${Math.floor(goal.x)},${Math.floor(goal.z)}`;
    this.pathCache.set(key, {
      path: [...path], // Store copy
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.pathCache.size > 100) {
      const oldestKey = this.pathCache.keys().next().value;
      this.pathCache.delete(oldestKey);
    }
  }

  /**
   * Get pathfinding statistics
   * @returns {Object}
   */
  getStatistics() {
    return {
      ...this.stats,
      cacheSize: this.pathCache.size,
      obstacleCount: this.obstacles.size
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      pathsCalculated: 0,
      cacheHits: 0,
      averageNodesSearched: 0,
      totalNodesSearched: 0
    };
  }
}

/**
 * Calculate distance between two positions
 * @param {Object} pos1 - First position {x, z}
 * @param {Object} pos2 - Second position {x, z}
 * @returns {number} Distance
 */
export function distance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Calculate squared distance (faster, for comparisons)
 * @param {Object} pos1 - First position {x, z}
 * @param {Object} pos2 - Second position {x, z}
 * @returns {number} Squared distance
 */
export function distanceSquared(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dz = pos2.z - pos1.z;
  return dx * dx + dz * dz;
}

/**
 * Normalize a vector
 * @param {Object} vec - Vector {x, z}
 * @returns {Object} Normalized vector
 */
export function normalize(vec) {
  const len = Math.sqrt(vec.x * vec.x + vec.z * vec.z);
  if (len === 0) return { x: 0, z: 0 };
  return { x: vec.x / len, z: vec.z / len };
}

export { TERRAIN_COSTS };
export default PathfindingSystem;
