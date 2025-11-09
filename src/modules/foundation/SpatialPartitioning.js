/**
 * SpatialPartitioning
 *
 * Divides the grid into chunks for efficient spatial queries.
 * Handles:
 * - Building indexing by chunk
 * - Neighbor searches (efficient radius queries)
 * - Building updates when position changes
 * - Spatial hash implementation
 */

class SpatialPartitioning {
  /**
   * Initialize spatial partitioning
   * @param {number} gridSize - Size of grid (100)
   * @param {number} gridHeight - Height of grid (50)
   * @param {number} chunkSize - Size of each spatial chunk (10)
   */
  constructor(gridSize = 100, gridHeight = 50, chunkSize = 10) {
    this.gridSize = gridSize;
    this.gridHeight = gridHeight;
    this.chunkSize = chunkSize;

    // Calculate number of chunks
    this.chunksX = Math.ceil(gridSize / chunkSize);
    this.chunksZ = Math.ceil(gridSize / chunkSize);
    this.chunksY = Math.ceil(gridHeight / chunkSize);

    // Chunk storage: Map<"chunkX,chunkY,chunkZ", Set<buildingId>>
    this.chunks = new Map();

    // Building to chunks mapping: Map<buildingId, Set<chunkKeys>>
    this.buildingChunks = new Map();
  }

  /**
   * Convert world position to chunk coordinates
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {object}
   */
  getChunkCoords(x, y, z) {
    return {
      chunkX: Math.floor(x / this.chunkSize),
      chunkY: Math.floor(y / this.chunkSize),
      chunkZ: Math.floor(z / this.chunkSize),
    };
  }

  /**
   * Convert chunk coords to chunk key
   * @param {number} chunkX
   * @param {number} chunkY
   * @param {number} chunkZ
   * @returns {string}
   */
  chunkKey(chunkX, chunkY, chunkZ) {
    return `${chunkX},${chunkY},${chunkZ}`;
  }

  /**
   * Get all chunks occupied by a building
   * @param {object} building - Building with position and dimensions
   * @returns {Set<string>} Set of chunk keys
   */
  getChunksForBuilding(building) {
    const chunks = new Set();
    const { x, y, z } = building.position;
    const { width = 1, height = 1, depth = 1 } = building.dimensions || {};

    for (let bx = x; bx < x + width; bx++) {
      for (let by = y; by < y + height; by++) {
        for (let bz = z; bz < z + depth; bz++) {
          const coords = this.getChunkCoords(bx, by, bz);
          const key = this.chunkKey(coords.chunkX, coords.chunkY, coords.chunkZ);
          chunks.add(key);
        }
      }
    }

    return chunks;
  }

  /**
   * Add a building to spatial partitioning
   * @param {object} building - Building object
   */
  addBuilding(building) {
    const buildingId = building.id;
    const chunks = this.getChunksForBuilding(building);

    // Add building to each chunk
    for (const chunkKey of chunks) {
      if (!this.chunks.has(chunkKey)) {
        this.chunks.set(chunkKey, new Set());
      }
      this.chunks.get(chunkKey).add(buildingId);
    }

    // Store chunk mapping
    this.buildingChunks.set(buildingId, chunks);
  }

  /**
   * Remove a building from spatial partitioning
   * @param {string} buildingId
   */
  removeBuilding(buildingId) {
    const chunks = this.buildingChunks.get(buildingId);

    if (chunks) {
      for (const chunkKey of chunks) {
        const chunk = this.chunks.get(chunkKey);
        if (chunk) {
          chunk.delete(buildingId);
          // Remove empty chunks
          if (chunk.size === 0) {
            this.chunks.delete(chunkKey);
          }
        }
      }
    }

    this.buildingChunks.delete(buildingId);
  }

  /**
   * Update a building's position (remove and re-add)
   * @param {object} building
   */
  updateBuilding(building) {
    this.removeBuilding(building.id);
    this.addBuilding(building);
  }

  /**
   * Get buildings in a specific chunk
   * @param {number} chunkX
   * @param {number} chunkY
   * @param {number} chunkZ
   * @returns {Set<string>} Set of building IDs
   */
  getBuildingsInChunk(chunkX, chunkY, chunkZ) {
    const key = this.chunkKey(chunkX, chunkY, chunkZ);
    return this.chunks.get(key) || new Set();
  }

  /**
   * Get buildings in adjacent chunks (3x3x3 cube around a chunk)
   * @param {number} chunkX
   * @param {number} chunkY
   * @param {number} chunkZ
   * @returns {Set<string>} Set of building IDs
   */
  getBuildingsInAdjacentChunks(chunkX, chunkY, chunkZ) {
    const buildings = new Set();

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nx = chunkX + dx;
          const ny = chunkY + dy;
          const nz = chunkZ + dz;

          // Check bounds
          if (nx < 0 || nx >= this.chunksX) continue;
          if (ny < 0 || ny >= this.chunksY) continue;
          if (nz < 0 || nz >= this.chunksZ) continue;

          const chunk = this.getBuildingsInChunk(nx, ny, nz);
          chunk.forEach(id => buildings.add(id));
        }
      }
    }

    return buildings;
  }

  /**
   * Query buildings within radius of a position
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} radius
   * @param {Array} allBuildings - Array of all building objects (for position lookup)
   * @returns {Array<object>} Buildings within radius
   */
  queryRadius(x, y, z, radius, allBuildings) {
    // Get center chunk
    const centerChunk = this.getChunkCoords(x, y, z);

    // Get potentially nearby buildings
    const candidateIds = this.getBuildingsInAdjacentChunks(
      centerChunk.chunkX,
      centerChunk.chunkY,
      centerChunk.chunkZ
    );

    // Filter by actual distance
    const result = [];
    const radiusSq = radius * radius;

    for (const buildingId of candidateIds) {
      const building = allBuildings.find(b => b.id === buildingId);
      if (!building) continue;

      const { x: bx, y: by, z: bz } = building.position;
      const dx = bx - x;
      const dy = by - y;
      const dz = bz - z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= radiusSq) {
        result.push({
          building,
          distance: Math.sqrt(distSq),
        });
      }
    }

    // Sort by distance
    result.sort((a, b) => a.distance - b.distance);

    return result;
  }

  /**
   * Get all buildings in a rectangular region
   * @param {number} x1
   * @param {number} y1
   * @param {number} z1
   * @param {number} x2
   * @param {number} y2
   * @param {number} z2
   * @param {Array} allBuildings
   * @returns {Array<object>}
   */
  queryRegion(x1, y1, z1, x2, y2, z2, allBuildings) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);

    // Get chunk range
    const minChunk = this.getChunkCoords(minX, minY, minZ);
    const maxChunk = this.getChunkCoords(maxX, maxY, maxZ);

    const result = [];
    const checked = new Set();

    // Iterate over chunks in range
    for (let cx = minChunk.chunkX; cx <= maxChunk.chunkX; cx++) {
      for (let cy = minChunk.chunkY; cy <= maxChunk.chunkY; cy++) {
        for (let cz = minChunk.chunkZ; cz <= maxChunk.chunkZ; cz++) {
          const buildingIds = this.getBuildingsInChunk(cx, cy, cz);

          for (const buildingId of buildingIds) {
            if (checked.has(buildingId)) continue;
            checked.add(buildingId);

            const building = allBuildings.find(b => b.id === buildingId);
            if (!building) continue;

            const { x, y, z } = building.position;
            if (x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ) {
              result.push(building);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Get statistics about spatial partitioning
   * @returns {object}
   */
  getStatistics() {
    let totalBuildings = 0;
    let totalChunks = this.chunks.size;
    const chunkSizes = [];

    for (const chunk of this.chunks.values()) {
      totalBuildings += chunk.size;
      chunkSizes.push(chunk.size);
    }

    const avgChunkSize = totalBuildings / Math.max(totalChunks, 1);
    const maxChunkSize = Math.max(...chunkSizes, 0);

    return {
      chunkSize: this.chunkSize,
      chunksX: this.chunksX,
      chunksZ: this.chunksZ,
      chunksY: this.chunksY,
      totalChunks,
      totalBuildings,
      averageChunkSize: avgChunkSize.toFixed(2),
      maxChunkSize,
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.chunks.clear();
    this.buildingChunks.clear();
  }
}

module.exports = SpatialPartitioning;
