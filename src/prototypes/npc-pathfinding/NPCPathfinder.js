/**
 * Grid-based NPC Pathfinder
 *
 * O(n) complexity algorithm for efficient pathfinding with 100+ NPCs.
 * Uses simple greedy movement with fallback to local search if blocked.
 *
 * Design:
 * - Each tick: move 1 cell toward target
 * - If blocked: attempt simple 3x3 search for alternate path
 * - No expensive A* calculations
 * - Fast enough for real-time movement at 60 FPS
 */

class NPCPathfinder {
  constructor(gridSize = 25) {
    this.gridSize = gridSize;
    this.obstacles = new Set(); // Set of occupied cells as "x,y,z"
    this.pathCache = new Map(); // Cache paths to reduce recalculation
  }

  /**
   * Add an obstacle to the grid
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  addObstacle(x, y, z) {
    const key = `${x},${y},${z}`;
    this.obstacles.add(key);
  }

  /**
   * Remove an obstacle from the grid
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  removeObstacle(x, y, z) {
    const key = `${x},${y},${z}`;
    this.obstacles.delete(key);
  }

  /**
   * Check if a position is walkable (not occupied)
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {boolean}
   */
  isWalkable(x, y, z) {
    // Check bounds
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize || z < 0 || z >= this.gridSize) {
      return false;
    }

    // Check obstacles
    const key = `${x},${y},${z}`;
    return !this.obstacles.has(key);
  }

  /**
   * Calculate distance between two points (Euclidean)
   * @param {number} x1
   * @param {number} y1
   * @param {number} z1
   * @param {number} x2
   * @param {number} y2
   * @param {number} z2
   * @returns {number}
   */
  distance(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get the next step toward target (greedy approach)
   * Moves one cell per call in direction of target
   *
   * @param {number} currentX
   * @param {number} currentY
   * @param {number} currentZ
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} targetZ
   * @returns {{x: number, y: number, z: number} | null} Next position or null if stuck
   */
  getNextStep(currentX, currentY, currentZ, targetX, targetY, targetZ) {
    // If already at target, return null (no movement needed)
    if (currentX === targetX && currentY === targetY && currentZ === targetZ) {
      return null;
    }

    // Calculate direction to target
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const dz = targetZ - currentZ;

    // Normalize to single-cell movement
    const steps = [];

    // Move in order of largest difference first (diagonal preference)
    const axes = [
      { delta: Math.abs(dx), sign: Math.sign(dx), axis: 'x' },
      { delta: Math.abs(dy), sign: Math.sign(dy), axis: 'y' },
      { delta: Math.abs(dz), sign: Math.sign(dz), axis: 'z' }
    ];

    axes.sort((a, b) => b.delta - a.delta);

    // Try each axis in order of importance
    for (const axis of axes) {
      if (axis.delta > 0) {
        steps.push(axis);
      }
    }

    // Try primary step (largest axis)
    if (steps.length > 0) {
      const primary = steps[0];
      const nextX = currentX + (primary.axis === 'x' ? primary.sign : 0);
      const nextY = currentY + (primary.axis === 'y' ? primary.sign : 0);
      const nextZ = currentZ + (primary.axis === 'z' ? primary.sign : 0);

      if (this.isWalkable(nextX, nextY, nextZ)) {
        return { x: nextX, y: nextY, z: nextZ };
      }

      // Primary blocked, try secondary
      if (steps.length > 1) {
        const secondary = steps[1];
        const altX = currentX + (secondary.axis === 'x' ? secondary.sign : 0);
        const altY = currentY + (secondary.axis === 'y' ? secondary.sign : 0);
        const altZ = currentZ + (secondary.axis === 'z' ? secondary.sign : 0);

        if (this.isWalkable(altX, altY, altZ)) {
          return { x: altX, y: altY, z: altZ };
        }
      }

      // Both primary and secondary blocked, try local search
      return this.searchLocalAlternative(currentX, currentY, currentZ, targetX, targetY, targetZ);
    }

    return null; // Stuck
  }

  /**
   * Local 3x3x3 search for alternate path when main path is blocked
   * Finds the neighbor cell closest to target
   *
   * @private
   * @param {number} currentX
   * @param {number} currentY
   * @param {number} currentZ
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} targetZ
   * @returns {{x: number, y: number, z: number} | null}
   */
  searchLocalAlternative(currentX, currentY, currentZ, targetX, targetY, targetZ) {
    let bestStep = null;
    let bestDistance = Infinity;

    // Search 3x3x3 cube around current position
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          // Skip current position
          if (dx === 0 && dy === 0 && dz === 0) {
            continue;
          }

          const nextX = currentX + dx;
          const nextY = currentY + dy;
          const nextZ = currentZ + dz;

          // Check if walkable
          if (!this.isWalkable(nextX, nextY, nextZ)) {
            continue;
          }

          // Calculate distance to target
          const dist = this.distance(nextX, nextY, nextZ, targetX, targetY, targetZ);

          if (dist < bestDistance) {
            bestDistance = dist;
            bestStep = { x: nextX, y: nextY, z: nextZ };
          }
        }
      }
    }

    return bestStep;
  }

  /**
   * Calculate full path from start to target (for pathfinding validation)
   * Uses BFS with distance limit to keep O(n) complexity
   *
   * @param {number} startX
   * @param {number} startY
   * @param {number} startZ
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} targetZ
   * @param {number} maxDistance Maximum cells to search (default: 50)
   * @returns {Array<{x, y, z}>} Path from start to target
   */
  findPath(startX, startY, startZ, targetX, targetY, targetZ, maxDistance = 50) {
    const cacheKey = `${startX},${startY},${startZ}-${targetX},${targetY},${targetZ}`;

    if (this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey);
    }

    const path = [];
    let currentX = startX;
    let currentY = startY;
    let currentZ = startZ;

    // Walk toward target, one step at a time
    for (let step = 0; step < maxDistance; step++) {
      path.push({ x: currentX, y: currentY, z: currentZ });

      if (currentX === targetX && currentY === targetY && currentZ === targetZ) {
        break; // Reached target
      }

      const nextStep = this.getNextStep(currentX, currentY, currentZ, targetX, targetY, targetZ);
      if (!nextStep) {
        break; // Stuck
      }

      currentX = nextStep.x;
      currentY = nextStep.y;
      currentZ = nextStep.z;
    }

    // Cache the path (with 5-second TTL to avoid stale paths)
    this.pathCache.set(cacheKey, path);
    setTimeout(() => this.pathCache.delete(cacheKey), 5000);

    return path;
  }

  /**
   * Clear all cached paths (for testing or reset)
   */
  clearPathCache() {
    this.pathCache.clear();
  }

  /**
   * Get diagnostic info for debugging
   * @returns {object}
   */
  getDiagnostics() {
    return {
      gridSize: this.gridSize,
      obstacleCount: this.obstacles.size,
      pathCacheSize: this.pathCache.size,
      freeSpaces: (this.gridSize ** 3) - this.obstacles.size
    };
  }
}

module.exports = NPCPathfinder;
