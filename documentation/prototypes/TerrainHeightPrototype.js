/**
 * TerrainHeightPrototype.js - Phase 0 Integration Prototype
 *
 * TEMPORARY prototype for testing terrain height integration with existing systems.
 * This is NOT the final implementation - it's for validation only.
 *
 * Purpose:
 * - Test how terrain height affects building placement
 * - Test NPC pathfinding with height differences
 * - Measure performance impact
 * - Validate assumptions before full Phase 1 implementation
 *
 * Once Phase 0 is complete, this will be replaced by the full TerrainManager.
 */

export class TerrainHeightPrototype {
  /**
   * Create a simple terrain height map for testing
   * @param {number} width - Grid width
   * @param {number} height - Grid height
   */
  constructor(width = 10, height = 10) {
    this.width = width;
    this.height = height;

    // Height map: 2D array of height values (0-10)
    // 0 = lowest, 10 = highest
    this.heightMap = [];

    // Initialize with varied heights for testing
    this.generateTestHeightMap();
  }

  /**
   * Generate a simple test height map
   * Creates a varied terrain for testing (not procedural, just for validation)
   */
  generateTestHeightMap() {
    // Create simple height variations:
    // - Flat area (height 0) in bottom-left for testing flat placement
    // - Gentle slope in middle for testing slope tolerance
    // - Hill in top-right for testing steep slopes

    for (let z = 0; z < this.height; z++) {
      this.heightMap[z] = [];
      for (let x = 0; x < this.width; x++) {
        let height;

        // Bottom-left quadrant: Flat (height 0)
        if (x < this.width / 2 && z < this.height / 2) {
          height = 0;
        }
        // Bottom-right: Gentle slope (height 0-3)
        else if (x >= this.width / 2 && z < this.height / 2) {
          height = Math.floor((x - this.width / 2) / 2);
        }
        // Top-left: Medium elevation (height 2-4)
        else if (x < this.width / 2 && z >= this.height / 2) {
          height = 2 + Math.floor((z - this.height / 2) / 3);
        }
        // Top-right: Hill (height 0-8)
        else {
          const dx = x - this.width / 2;
          const dz = z - this.height / 2;
          const distance = Math.sqrt(dx * dx + dz * dz);
          const maxDistance = Math.sqrt((this.width / 2) ** 2 + (this.height / 2) ** 2);
          height = Math.floor((distance / maxDistance) * 8);
        }

        this.heightMap[z][x] = Math.max(0, Math.min(10, height));
      }
    }
  }

  /**
   * Get terrain height at a position
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate (using z instead of y to match grid convention)
   * @returns {number} Height value (0-10), or -1 if out of bounds
   */
  getHeight(x, z) {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return -1;
    }
    return this.heightMap[z][x];
  }

  /**
   * Get slope between two adjacent tiles
   * @param {number} x1 - First tile X
   * @param {number} z1 - First tile Z
   * @param {number} x2 - Second tile X
   * @param {number} z2 - Second tile Z
   * @returns {number} Height difference (absolute value)
   */
  getSlope(x1, z1, x2, z2) {
    const h1 = this.getHeight(x1, z1);
    const h2 = this.getHeight(x2, z2);

    if (h1 === -1 || h2 === -1) {
      return Infinity; // Out of bounds
    }

    return Math.abs(h2 - h1);
  }

  /**
   * Check if a region is relatively flat (for building placement)
   * @param {number} startX - Top-left X
   * @param {number} startZ - Top-left Z
   * @param {number} width - Region width
   * @param {number} depth - Region depth
   * @param {number} maxSlopeTolerance - Max allowed height difference (default: 0 = must be perfectly flat)
   * @returns {object} {flat: boolean, minHeight: number, maxHeight: number, heightDiff: number}
   */
  isRegionFlat(startX, startZ, width, depth, maxSlopeTolerance = 0) {
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let z = startZ; z < startZ + depth; z++) {
      for (let x = startX; x < startX + width; x++) {
        const height = this.getHeight(x, z);

        if (height === -1) {
          // Out of bounds
          return { flat: false, minHeight: -1, maxHeight: -1, heightDiff: Infinity, reason: 'Out of bounds' };
        }

        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
      }
    }

    const heightDiff = maxHeight - minHeight;

    return {
      flat: heightDiff <= maxSlopeTolerance,
      minHeight,
      maxHeight,
      heightDiff,
      reason: heightDiff > maxSlopeTolerance ? `Height difference ${heightDiff} exceeds tolerance ${maxSlopeTolerance}` : undefined
    };
  }

  /**
   * Get the average height of a region (for determining building placement height)
   * @param {number} startX
   * @param {number} startZ
   * @param {number} width
   * @param {number} depth
   * @returns {number} Average height, rounded
   */
  getRegionAverageHeight(startX, startZ, width, depth) {
    let totalHeight = 0;
    let count = 0;

    for (let z = startZ; z < startZ + depth; z++) {
      for (let x = startX; x < startX + width; x++) {
        const height = this.getHeight(x, z);
        if (height !== -1) {
          totalHeight += height;
          count++;
        }
      }
    }

    return count > 0 ? Math.round(totalHeight / count) : 0;
  }

  /**
   * Flatten terrain under a building (for auto-flatten feature testing)
   * @param {number} startX
   * @param {number} startZ
   * @param {number} width
   * @param {number} depth
   * @param {number} targetHeight - Height to flatten to (default: average height)
   * @returns {object} {success: boolean, heightChanged: number}
   */
  flattenRegion(startX, startZ, width, depth, targetHeight = null) {
    // If no target height specified, use average
    if (targetHeight === null) {
      targetHeight = this.getRegionAverageHeight(startX, startZ, width, depth);
    }

    let cellsChanged = 0;

    for (let z = startZ; z < startZ + depth; z++) {
      for (let x = startX; x < startX + width; x++) {
        if (x >= 0 && x < this.width && z >= 0 && z < this.height) {
          if (this.heightMap[z][x] !== targetHeight) {
            this.heightMap[z][x] = targetHeight;
            cellsChanged++;
          }
        }
      }
    }

    return {
      success: true,
      cellsChanged,
      flattenedTo: targetHeight
    };
  }

  /**
   * Export height map data for persistence testing
   * @returns {object}
   */
  toJSON() {
    return {
      width: this.width,
      height: this.height,
      heightMap: this.heightMap
    };
  }

  /**
   * Import height map data
   * @param {object} data
   */
  fromJSON(data) {
    this.width = data.width;
    this.height = data.height;
    this.heightMap = data.heightMap;
  }
}

/**
 * Render terrain height map to canvas (for testing visualization)
 * @param {CanvasRenderingContext2D} ctx
 * @param {TerrainHeightPrototype} terrain
 * @param {number} tileSize - Size of each tile in pixels
 * @param {number} offsetX - Camera offset X
 * @param {number} offsetY - Camera offset Y
 */
export function renderTerrainPrototype(ctx, terrain, tileSize, offsetX = 0, offsetY = 0) {
  for (let z = 0; z < terrain.height; z++) {
    for (let x = 0; x < terrain.width; x++) {
      const height = terrain.getHeight(x, z);

      // Calculate screen position
      const screenX = x * tileSize - offsetX;
      const screenY = z * tileSize - offsetY;

      // Skip if outside viewport
      if (screenX + tileSize < 0 || screenY + tileSize < 0) continue;
      if (screenX > ctx.canvas.width || screenY > ctx.canvas.height) continue;

      // Color based on height (darker = lower, lighter = higher)
      // Height 0 = dark green, Height 10 = light green/yellow
      const heightRatio = height / 10;
      const r = Math.floor(34 + heightRatio * 100);  // 34-134
      const g = Math.floor(139 + heightRatio * 80);  // 139-219
      const b = Math.floor(34 + heightRatio * 20);   // 34-54

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(screenX, screenY, tileSize, tileSize);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.strokeRect(screenX, screenY, tileSize, tileSize);

      // Draw height number (for debugging)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(height.toString(), screenX + tileSize / 2, screenY + tileSize / 2);
    }
  }
}
