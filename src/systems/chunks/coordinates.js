/**
 * Coordinate system utilities for chunk management
 *
 * Three coordinate spaces:
 * 1. World coordinates (float) - Used by physics, rendering
 * 2. Chunk coordinates (int) - Identifies which chunk
 * 3. Local coordinates (int, 0-15) - Position within chunk
 */

// Chunk dimensions
export const CHUNK_SIZE = 16;
export const CHUNK_SIZE_Y = 16; // Same for now, could be different for tall worlds
export const CHUNK_SIZE_SQ = CHUNK_SIZE * CHUNK_SIZE;
export const CHUNK_SIZE_CUBED = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE_Y;

// World scale
export const VOXEL_SIZE = 2; // World units per voxel

/**
 * Convert world position to chunk coordinates
 * @param {number} worldX - World X position
 * @param {number} worldZ - World Z position
 * @returns {{chunkX: number, chunkZ: number}}
 */
export function worldToChunk(worldX, worldZ) {
  // Convert to voxel space first, then to chunk
  const voxelX = Math.floor(worldX / VOXEL_SIZE);
  const voxelZ = Math.floor(worldZ / VOXEL_SIZE);

  return {
    chunkX: Math.floor(voxelX / CHUNK_SIZE),
    chunkZ: Math.floor(voxelZ / CHUNK_SIZE),
  };
}

/**
 * Convert world position to local block coordinates within a chunk
 * @param {number} worldX - World X position
 * @param {number} worldY - World Y position
 * @param {number} worldZ - World Z position
 * @returns {{x: number, y: number, z: number, chunkX: number, chunkZ: number}}
 */
export function worldToLocal(worldX, worldY, worldZ) {
  // Convert to voxel space
  const voxelX = Math.floor(worldX / VOXEL_SIZE);
  const voxelY = Math.floor(worldY / VOXEL_SIZE);
  const voxelZ = Math.floor(worldZ / VOXEL_SIZE);

  // Get chunk coordinates
  const chunkX = Math.floor(voxelX / CHUNK_SIZE);
  const chunkZ = Math.floor(voxelZ / CHUNK_SIZE);

  // Get local coordinates (handle negative correctly with modulo)
  return {
    x: ((voxelX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    y: Math.max(0, Math.min(CHUNK_SIZE_Y - 1, voxelY)),
    z: ((voxelZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    chunkX,
    chunkZ,
  };
}

/**
 * Convert chunk + local coordinates to world position (block center)
 * @param {number} chunkX - Chunk X coordinate
 * @param {number} chunkZ - Chunk Z coordinate
 * @param {number} localX - Local X (0-15)
 * @param {number} localY - Local Y (0-15)
 * @param {number} localZ - Local Z (0-15)
 * @returns {{x: number, y: number, z: number}}
 */
export function localToWorld(chunkX, chunkZ, localX, localY, localZ) {
  return {
    x: (chunkX * CHUNK_SIZE + localX) * VOXEL_SIZE + VOXEL_SIZE / 2,
    y: localY * VOXEL_SIZE + VOXEL_SIZE / 2,
    z: (chunkZ * CHUNK_SIZE + localZ) * VOXEL_SIZE + VOXEL_SIZE / 2,
  };
}

/**
 * Get chunk origin in world coordinates (corner, not center)
 * @param {number} chunkX - Chunk X coordinate
 * @param {number} chunkZ - Chunk Z coordinate
 * @returns {{x: number, y: number, z: number}}
 */
export function chunkOriginWorld(chunkX, chunkZ) {
  return {
    x: chunkX * CHUNK_SIZE * VOXEL_SIZE,
    y: 0,
    z: chunkZ * CHUNK_SIZE * VOXEL_SIZE,
  };
}

/**
 * Create a unique string key for a chunk
 * @param {number} chunkX - Chunk X coordinate
 * @param {number} chunkZ - Chunk Z coordinate
 * @returns {string}
 */
export function chunkKey(chunkX, chunkZ) {
  return `${chunkX},${chunkZ}`;
}

/**
 * Parse a chunk key back to coordinates
 * @param {string} key - Chunk key string
 * @returns {{chunkX: number, chunkZ: number}}
 */
export function parseChunkKey(key) {
  const [x, z] = key.split(',').map(Number);
  return { chunkX: x, chunkZ: z };
}

/**
 * Convert local x,y,z to flat array index
 * Uses XZY order for cache-friendly horizontal iteration
 * @param {number} x - Local X (0-15)
 * @param {number} y - Local Y (0-15)
 * @param {number} z - Local Z (0-15)
 * @returns {number}
 */
export function blockIndex(x, y, z) {
  // XZY order: x + z * 16 + y * 256
  return x + (z << 4) + (y << 8);
}

/**
 * Convert flat array index back to local coordinates
 * @param {number} index - Array index
 * @returns {{x: number, y: number, z: number}}
 */
export function indexToLocal(index) {
  const x = index & 0xF;           // index % 16
  const z = (index >> 4) & 0xF;    // (index / 16) % 16
  const y = (index >> 8) & 0xF;    // index / 256
  return { x, y, z };
}

/**
 * Get Manhattan distance between two chunk coordinates
 * @param {number} x1 - First chunk X
 * @param {number} z1 - First chunk Z
 * @param {number} x2 - Second chunk X
 * @param {number} z2 - Second chunk Z
 * @returns {number}
 */
export function chunkDistance(x1, z1, x2, z2) {
  return Math.abs(x2 - x1) + Math.abs(z2 - z1);
}

/**
 * Get squared Euclidean distance between two chunk coordinates
 * (Faster than actual distance, good for comparisons)
 * @param {number} x1 - First chunk X
 * @param {number} z1 - First chunk Z
 * @param {number} x2 - Second chunk X
 * @param {number} z2 - Second chunk Z
 * @returns {number}
 */
export function chunkDistanceSq(x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return dx * dx + dz * dz;
}

/**
 * Check if local coordinates are within chunk bounds
 * @param {number} x - Local X
 * @param {number} y - Local Y
 * @param {number} z - Local Z
 * @returns {boolean}
 */
export function isInBounds(x, y, z) {
  return x >= 0 && x < CHUNK_SIZE &&
         y >= 0 && y < CHUNK_SIZE_Y &&
         z >= 0 && z < CHUNK_SIZE;
}

/**
 * Get all chunk coordinates within a square radius of a center chunk
 * @param {number} centerX - Center chunk X
 * @param {number} centerZ - Center chunk Z
 * @param {number} radius - Radius in chunks
 * @returns {Array<{chunkX: number, chunkZ: number}>}
 */
export function getChunksInRadius(centerX, centerZ, radius) {
  const chunks = [];

  for (let x = centerX - radius; x <= centerX + radius; x++) {
    for (let z = centerZ - radius; z <= centerZ + radius; z++) {
      chunks.push({ chunkX: x, chunkZ: z });
    }
  }

  return chunks;
}

/**
 * Get chunks in radius, sorted by distance from center
 * @param {number} centerX - Center chunk X
 * @param {number} centerZ - Center chunk Z
 * @param {number} radius - Radius in chunks
 * @returns {Array<{chunkX: number, chunkZ: number, distanceSq: number}>}
 */
export function getChunksInRadiusSorted(centerX, centerZ, radius) {
  const chunks = getChunksInRadius(centerX, centerZ, radius);

  // Add distance and sort
  return chunks
    .map(c => ({
      ...c,
      distanceSq: chunkDistanceSq(centerX, centerZ, c.chunkX, c.chunkZ),
    }))
    .sort((a, b) => a.distanceSq - b.distanceSq);
}
