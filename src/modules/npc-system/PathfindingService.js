/**
 * PathfindingService.js - A* pathfinding for NPC movement
 *
 * Provides pathfinding capabilities for NPCs to navigate around obstacles
 * using the A* algorithm on a 3D grid.
 *
 * Features:
 * - A* pathfinding with heuristic optimization
 * - 3D grid navigation (x, y, z)
 * - Obstacle avoidance (occupied cells)
 * - Configurable movement (8-directional on XZ plane, vertical movement)
 * - Path smoothing and optimization
 */

class PathNode {
  constructor(x, y, z, parent = null) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.parent = parent;

    // A* costs
    this.g = 0; // Cost from start
    this.h = 0; // Heuristic cost to goal
    this.f = 0; // Total cost (g + h)
  }

  /**
   * Get unique key for this node
   */
  getKey() {
    return `${this.x},${this.y},${this.z}`;
  }

  /**
   * Check if this node equals another position
   */
  equals(x, y, z) {
    return this.x === x && this.y === y && this.z === z;
  }
}

class PathfindingService {
  /**
   * Initialize pathfinding service
   * @param {GridManager} gridManager - Grid manager for collision checking
   */
  constructor(gridManager) {
    this.gridManager = gridManager;
    this.gridSize = gridManager.gridSize;
    this.gridHeight = gridManager.gridHeight;

    // Movement directions (8-directional + up/down)
    // Format: [dx, dy, dz]
    this.directions = [
      // Horizontal movement (on same Y level)
      [1, 0, 0],   // East
      [-1, 0, 0],  // West
      [0, 0, 1],   // South
      [0, 0, -1],  // North
      [1, 0, 1],   // Southeast
      [-1, 0, 1],  // Southwest
      [1, 0, -1],  // Northeast
      [-1, 0, -1], // Northwest

      // Vertical movement
      [0, 1, 0],   // Up
      [0, -1, 0],  // Down

      // Diagonal vertical (for stairs/ramps)
      [1, 1, 0],
      [-1, 1, 0],
      [0, 1, 1],
      [0, 1, -1],
      [1, -1, 0],
      [-1, -1, 0],
      [0, -1, 1],
      [0, -1, -1],
    ];
  }

  /**
   * Calculate Manhattan distance heuristic
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} z1 - Start Z
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {number} z2 - End Z
   * @returns {number} Heuristic distance
   */
  heuristic(x1, y1, z1, x2, y2, z2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1) + Math.abs(z2 - z1);
  }

  /**
   * Calculate Euclidean distance
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} z1 - Start Z
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {number} z2 - End Z
   * @returns {number} Euclidean distance
   */
  euclideanDistance(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Check if a position is walkable
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {boolean} True if walkable
   */
  isWalkable(x, y, z) {
    // Check bounds
    const bounds = this.gridManager.validateBounds(x, y, z);
    if (!bounds.valid) {
      return false;
    }

    // Check if occupied by building
    if (this.gridManager.isCellOccupied(x, y, z)) {
      return false;
    }

    return true;
  }

  /**
   * Get neighbors of a node
   * @param {PathNode} node - Current node
   * @returns {Array<PathNode>} Valid neighbor nodes
   */
  getNeighbors(node) {
    const neighbors = [];

    for (const [dx, dy, dz] of this.directions) {
      const newX = node.x + dx;
      const newY = node.y + dy;
      const newZ = node.z + dz;

      if (this.isWalkable(newX, newY, newZ)) {
        neighbors.push(new PathNode(newX, newY, newZ, node));
      }
    }

    return neighbors;
  }

  /**
   * Reconstruct path from goal node to start
   * @param {PathNode} goalNode - Final node
   * @returns {Array<Object>} Path as array of {x, y, z} positions
   */
  reconstructPath(goalNode) {
    const path = [];
    let current = goalNode;

    while (current !== null) {
      path.unshift({ x: current.x, y: current.y, z: current.z });
      current = current.parent;
    }

    return path;
  }

  /**
   * Find path from start to goal using A* algorithm
   * @param {Object} start - Start position {x, y, z}
   * @param {Object} goal - Goal position {x, y, z}
   * @param {Object} options - Pathfinding options
   * @param {number} options.maxIterations - Max iterations before giving up (default 1000)
   * @param {boolean} options.allowPartialPath - Return partial path if goal unreachable (default true)
   * @returns {Array<Object>|null} Path as array of positions, or null if no path found
   */
  findPath(start, goal, options = {}) {
    const maxIterations = options.maxIterations || 1000;
    const allowPartialPath = options.allowPartialPath !== false;

    // Round positions to integers
    const startX = Math.floor(start.x);
    const startY = Math.floor(start.y);
    const startZ = Math.floor(start.z);
    const goalX = Math.floor(goal.x);
    const goalY = Math.floor(goal.y);
    const goalZ = Math.floor(goal.z);

    // Check if start and goal are valid
    if (!this.isWalkable(startX, startY, startZ)) {
      console.warn(`[PathfindingService] Start position (${startX}, ${startY}, ${startZ}) is not walkable`);
      return null;
    }

    // If goal is occupied, find nearest walkable cell
    let actualGoalX = goalX;
    let actualGoalY = goalY;
    let actualGoalZ = goalZ;

    if (!this.isWalkable(goalX, goalY, goalZ)) {
      // Try to find a nearby walkable cell
      const nearbyWalkable = this.findNearbyWalkableCell(goalX, goalY, goalZ, 3);
      if (nearbyWalkable) {
        actualGoalX = nearbyWalkable.x;
        actualGoalY = nearbyWalkable.y;
        actualGoalZ = nearbyWalkable.z;
      } else {
        console.warn(`[PathfindingService] Goal position (${goalX}, ${goalY}, ${goalZ}) is not walkable and no nearby alternative found`);
        if (!allowPartialPath) {
          return null;
        }
      }
    }

    // Initialize A* data structures
    const openSet = [];
    const closedSet = new Set();
    const startNode = new PathNode(startX, startY, startZ);

    startNode.g = 0;
    startNode.h = this.heuristic(startX, startY, startZ, actualGoalX, actualGoalY, actualGoalZ);
    startNode.f = startNode.h;

    openSet.push(startNode);

    let iterations = 0;
    let closestNode = startNode;
    let closestDistance = startNode.h;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with lowest f cost
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet[currentIndex];

      // Check if we reached the goal
      if (current.equals(actualGoalX, actualGoalY, actualGoalZ)) {
        return this.reconstructPath(current);
      }

      // Track closest node for partial path
      const distToGoal = this.heuristic(current.x, current.y, current.z, actualGoalX, actualGoalY, actualGoalZ);
      if (distToGoal < closestDistance) {
        closestDistance = distToGoal;
        closestNode = current;
      }

      // Move current from open to closed
      openSet.splice(currentIndex, 1);
      closedSet.add(current.getKey());

      // Process neighbors
      const neighbors = this.getNeighbors(current);

      for (const neighbor of neighbors) {
        const neighborKey = neighbor.getKey();

        // Skip if already evaluated
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Calculate cost
        const moveCost = this.euclideanDistance(
          current.x, current.y, current.z,
          neighbor.x, neighbor.y, neighbor.z
        );
        const tentativeG = current.g + moveCost;

        // Check if this path is better
        const existingNode = openSet.find(n => n.getKey() === neighborKey);

        if (!existingNode) {
          // New node
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor.x, neighbor.y, neighbor.z, actualGoalX, actualGoalY, actualGoalZ);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          openSet.push(neighbor);
        } else if (tentativeG < existingNode.g) {
          // Better path found
          existingNode.g = tentativeG;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = current;
        }
      }
    }

    // No complete path found
    if (iterations >= maxIterations) {
      // eslint-disable-next-line no-console
      console.warn(`[PathfindingService] Max iterations (${maxIterations}) reached`);
    }

    // Return partial path if allowed
    if (allowPartialPath && closestNode !== startNode) {
      // eslint-disable-next-line no-console
      console.log(`[PathfindingService] Returning partial path (${closestDistance.toFixed(1)} from goal)`);
      return this.reconstructPath(closestNode);
    }

    return null;
  }

  /**
   * Find a nearby walkable cell
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} z - Center Z
   * @param {number} radius - Search radius
   * @returns {Object|null} Walkable position {x, y, z} or null
   */
  findNearbyWalkableCell(x, y, z, radius = 2) {
    // Search in expanding rings
    for (let r = 1; r <= radius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          // Only check cells on the edge of the ring (optimization)
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) {
            continue;
          }

          const checkX = x + dx;
          const checkZ = z + dz;

          // Check same level first
          if (this.isWalkable(checkX, y, checkZ)) {
            return { x: checkX, y: y, z: checkZ };
          }

          // Check one level up/down
          if (this.isWalkable(checkX, y + 1, checkZ)) {
            return { x: checkX, y: y + 1, z: checkZ };
          }
          if (this.isWalkable(checkX, y - 1, checkZ)) {
            return { x: checkX, y: y - 1, z: checkZ };
          }
        }
      }
    }

    return null;
  }

  /**
   * Smooth a path by removing unnecessary waypoints
   * @param {Array<Object>} path - Path to smooth
   * @returns {Array<Object>} Smoothed path
   */
  smoothPath(path) {
    if (!path || path.length <= 2) {
      return path;
    }

    const smoothed = [path[0]]; // Always keep start
    let current = 0;

    while (current < path.length - 1) {
      // Try to find the farthest visible point
      let farthest = current + 1;

      for (let i = path.length - 1; i > current + 1; i--) {
        if (this.hasLineOfSight(path[current], path[i])) {
          farthest = i;
          break;
        }
      }

      smoothed.push(path[farthest]);
      current = farthest;
    }

    return smoothed;
  }

  /**
   * Check if there's a clear line of sight between two points
   * @param {Object} start - Start position {x, y, z}
   * @param {Object} end - End position {x, y, z}
   * @returns {boolean} True if line of sight exists
   */
  hasLineOfSight(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance === 0) return true;

    const steps = Math.ceil(distance);

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = Math.floor(start.x + dx * t);
      const y = Math.floor(start.y + dy * t);
      const z = Math.floor(start.z + dz * t);

      if (!this.isWalkable(x, y, z)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get path statistics
   * @param {Array<Object>} path - Path to analyze
   * @returns {Object} Path statistics
   */
  getPathStats(path) {
    if (!path || path.length === 0) {
      return { length: 0, distance: 0, waypoints: 0 };
    }

    let distance = 0;
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      distance += this.euclideanDistance(
        prev.x, prev.y, prev.z,
        curr.x, curr.y, curr.z
      );
    }

    return {
      waypoints: path.length,
      distance: distance.toFixed(2),
      start: path[0],
      goal: path[path.length - 1]
    };
  }
}

export default PathfindingService;
