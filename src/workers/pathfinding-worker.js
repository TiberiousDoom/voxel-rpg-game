/**
 * pathfinding-worker.js - Web Worker for pathfinding calculations
 *
 * Offloads expensive A* pathfinding calculations to a background thread
 * to prevent blocking the main game loop. Significantly improves performance
 * when calculating paths for multiple NPCs.
 *
 * Performance Benefits:
 * - Non-blocking pathfinding (keeps 60 FPS during path calculation)
 * - Handles multiple NPCs simultaneously
 * - Path result caching
 * - Automatic worker pool management
 *
 * Communication Protocol:
 * Main Thread -> Worker:
 *   { id, type: 'findPath', start, goal, gridData, options }
 *
 * Worker -> Main Thread:
 *   { id, type: 'pathResult', path, stats, cached }
 */

/* eslint-disable no-restricted-globals */

/**
 * PathNode class for A* algorithm
 */
class PathNode {
  constructor(x, y, z, parent = null) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.parent = parent;
    this.g = 0;
    this.h = 0;
    this.f = 0;
  }

  getKey() {
    return `${this.x},${this.y},${this.z}`;
  }

  equals(x, y, z) {
    return this.x === x && this.y === y && this.z === z;
  }
}

/**
 * Pathfinding worker state
 */
const workerState = {
  cache: new Map(), // Path cache
  maxCacheSize: 500,
  stats: {
    pathsCalculated: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageTime: 0,
    totalTime: 0
  },
  occupiedCells: new Set(), // Set of "x,y,z" strings
  gridSize: 100,
  gridHeight: 10
};

/**
 * Movement directions (8-directional + vertical)
 */
const DIRECTIONS = [
  [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 0], [0, -1, 0],
  [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1],
  [1, -1, 0], [-1, -1, 0], [0, -1, 1], [0, -1, -1]
];

/**
 * Calculate Manhattan distance heuristic
 */
function heuristic(x1, y1, z1, x2, y2, z2) {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1) + Math.abs(z2 - z1);
}

/**
 * Calculate Euclidean distance
 */
function euclideanDistance(x1, y1, z1, x2, y2, z2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if a position is walkable
 */
function isWalkable(x, y, z) {
  // Check bounds
  if (x < 0 || x >= workerState.gridSize ||
      y < 0 || y >= workerState.gridHeight ||
      z < 0 || z >= workerState.gridSize) {
    return false;
  }

  // Check if occupied
  const key = `${x},${y},${z}`;
  return !workerState.occupiedCells.has(key);
}

/**
 * Get neighbors of a node
 */
function getNeighbors(node) {
  const neighbors = [];

  for (const [dx, dy, dz] of DIRECTIONS) {
    const newX = node.x + dx;
    const newY = node.y + dy;
    const newZ = node.z + dz;

    if (isWalkable(newX, newY, newZ)) {
      neighbors.push(new PathNode(newX, newY, newZ, node));
    }
  }

  return neighbors;
}

/**
 * Reconstruct path from goal to start
 */
function reconstructPath(goalNode) {
  const path = [];
  let current = goalNode;

  while (current !== null) {
    path.unshift({ x: current.x, y: current.y, z: current.z });
    current = current.parent;
  }

  return path;
}

/**
 * Find nearby walkable cell
 */
function findNearbyWalkableCell(x, y, z, radius = 2) {
  for (let r = 1; r <= radius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;

        const checkX = x + dx;
        const checkZ = z + dz;

        if (isWalkable(checkX, y, checkZ)) {
          return { x: checkX, y: y, z: checkZ };
        }

        if (isWalkable(checkX, y + 1, checkZ)) {
          return { x: checkX, y: y + 1, z: checkZ };
        }
        if (isWalkable(checkX, y - 1, checkZ)) {
          return { x: checkX, y: y - 1, z: checkZ };
        }
      }
    }
  }

  return null;
}

/**
 * A* pathfinding algorithm
 */
function findPath(start, goal, options = {}) {
  const maxIterations = options.maxIterations || 1000;
  const allowPartialPath = options.allowPartialPath !== false;

  const startX = Math.floor(start.x);
  const startY = Math.floor(start.y);
  const startZ = Math.floor(start.z);
  const goalX = Math.floor(goal.x);
  const goalY = Math.floor(goal.y);
  const goalZ = Math.floor(goal.z);

  // Check start validity
  if (!isWalkable(startX, startY, startZ)) {
    return null;
  }

  // Find walkable goal if needed
  let actualGoalX = goalX;
  let actualGoalY = goalY;
  let actualGoalZ = goalZ;

  if (!isWalkable(goalX, goalY, goalZ)) {
    const nearby = findNearbyWalkableCell(goalX, goalY, goalZ, 3);
    if (nearby) {
      actualGoalX = nearby.x;
      actualGoalY = nearby.y;
      actualGoalZ = nearby.z;
    } else if (!allowPartialPath) {
      return null;
    }
  }

  // Initialize A*
  const openSet = [];
  const closedSet = new Set();
  const startNode = new PathNode(startX, startY, startZ);

  startNode.g = 0;
  startNode.h = heuristic(startX, startY, startZ, actualGoalX, actualGoalY, actualGoalZ);
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

    // Check if reached goal
    if (current.equals(actualGoalX, actualGoalY, actualGoalZ)) {
      return {
        path: reconstructPath(current),
        iterations,
        complete: true
      };
    }

    // Track closest node
    const distToGoal = heuristic(current.x, current.y, current.z, actualGoalX, actualGoalY, actualGoalZ);
    if (distToGoal < closestDistance) {
      closestDistance = distToGoal;
      closestNode = current;
    }

    // Move to closed set
    openSet.splice(currentIndex, 1);
    closedSet.add(current.getKey());

    // Process neighbors
    const neighbors = getNeighbors(current);

    for (const neighbor of neighbors) {
      const neighborKey = neighbor.getKey();

      if (closedSet.has(neighborKey)) continue;

      const moveCost = euclideanDistance(
        current.x, current.y, current.z,
        neighbor.x, neighbor.y, neighbor.z
      );
      const tentativeG = current.g + moveCost;

      const existingNode = openSet.find(n => n.getKey() === neighborKey);

      if (!existingNode) {
        neighbor.g = tentativeG;
        neighbor.h = heuristic(neighbor.x, neighbor.y, neighbor.z, actualGoalX, actualGoalY, actualGoalZ);
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = current;
        openSet.push(neighbor);
      } else if (tentativeG < existingNode.g) {
        existingNode.g = tentativeG;
        existingNode.f = existingNode.g + existingNode.h;
        existingNode.parent = current;
      }
    }
  }

  // Return partial path if allowed
  if (allowPartialPath && closestNode !== startNode) {
    return {
      path: reconstructPath(closestNode),
      iterations,
      complete: false,
      partial: true
    };
  }

  return null;
}

/**
 * Get cache key for a path request
 */
function getCacheKey(start, goal) {
  const sx = Math.floor(start.x);
  const sy = Math.floor(start.y);
  const sz = Math.floor(start.z);
  const gx = Math.floor(goal.x);
  const gy = Math.floor(goal.y);
  const gz = Math.floor(goal.z);

  return `${sx},${sy},${sz}:${gx},${gy},${gz}`;
}

/**
 * Handle pathfinding request
 */
function handleFindPath(data) {
  const { id, start, goal, gridData, options } = data;
  const startTime = performance.now();

  // Update grid data if provided
  if (gridData) {
    if (gridData.occupiedCells) {
      workerState.occupiedCells = new Set(gridData.occupiedCells);
    }
    if (gridData.gridSize !== undefined) {
      workerState.gridSize = gridData.gridSize;
    }
    if (gridData.gridHeight !== undefined) {
      workerState.gridHeight = gridData.gridHeight;
    }
  }

  // Check cache
  const cacheKey = getCacheKey(start, goal);
  const cached = workerState.cache.get(cacheKey);

  if (cached && options.useCache !== false) {
    workerState.stats.cacheHits++;
    const elapsed = performance.now() - startTime;

    postMessage({
      id,
      type: 'pathResult',
      path: cached.path,
      cached: true,
      stats: {
        iterations: 0,
        timeMs: elapsed.toFixed(2),
        cached: true
      }
    });
    return;
  }

  workerState.stats.cacheMisses++;

  // Calculate path
  const result = findPath(start, goal, options);
  const elapsed = performance.now() - startTime;

  // Update statistics
  workerState.stats.pathsCalculated++;
  workerState.stats.totalTime += elapsed;
  workerState.stats.averageTime = workerState.stats.totalTime / workerState.stats.pathsCalculated;

  // Cache result if successful
  if (result && result.path && result.complete) {
    workerState.cache.set(cacheKey, {
      path: result.path,
      timestamp: Date.now()
    });

    // Limit cache size
    if (workerState.cache.size > workerState.maxCacheSize) {
      const firstKey = workerState.cache.keys().next().value;
      workerState.cache.delete(firstKey);
    }
  }

  // Send result
  postMessage({
    id,
    type: 'pathResult',
    path: result ? result.path : null,
    cached: false,
    complete: result ? result.complete : false,
    partial: result ? result.partial : false,
    stats: {
      iterations: result ? result.iterations : 0,
      timeMs: elapsed.toFixed(2),
      cached: false
    }
  });
}

/**
 * Handle clear cache request
 */
function handleClearCache() {
  workerState.cache.clear();
  postMessage({
    type: 'cacheCleared',
    message: 'Path cache cleared'
  });
}

/**
 * Handle get stats request
 */
function handleGetStats() {
  postMessage({
    type: 'stats',
    stats: {
      ...workerState.stats,
      cacheSize: workerState.cache.size,
      maxCacheSize: workerState.maxCacheSize
    }
  });
}

/**
 * Message handler
 */
self.onmessage = function(e) {
  const data = e.data;

  try {
    switch (data.type) {
      case 'findPath':
        handleFindPath(data);
        break;

      case 'clearCache':
        handleClearCache();
        break;

      case 'getStats':
        handleGetStats();
        break;

      case 'updateGrid':
        if (data.gridData) {
          if (data.gridData.occupiedCells) {
            workerState.occupiedCells = new Set(data.gridData.occupiedCells);
          }
          if (data.gridData.gridSize !== undefined) {
            workerState.gridSize = data.gridData.gridSize;
          }
          if (data.gridData.gridHeight !== undefined) {
            workerState.gridHeight = data.gridData.gridHeight;
          }
        }
        postMessage({ type: 'gridUpdated' });
        break;

      default:
        console.warn('[PathfindingWorker] Unknown message type:', data.type);
    }
  } catch (err) {
    postMessage({
      id: data.id,
      type: 'error',
      error: err.message,
      stack: err.stack
    });
  }
};

// Signal ready
postMessage({ type: 'ready', message: 'Pathfinding worker initialized' });
