/**
 * Chunk Worker - Web Worker for off-thread chunk operations
 *
 * Self-contained worker with all dependencies inlined.
 * CRA doesn't support ES module imports in workers properly.
 */

/* eslint-disable no-restricted-globals */

// ============================================================================
// CONSTANTS
// ============================================================================

const CHUNK_SIZE = 16;
const CHUNK_SIZE_Y = 16;
const VOXEL_SIZE = 2;

// Block types
const BlockTypes = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  SAND: 4,
  WATER: 5,
  WOOD: 6,
  LEAVES: 7,
  BEDROCK: 8,
  GRAVEL: 9,
  COAL_ORE: 10,
  IRON_ORE: 11,
  GOLD_ORE: 12,
  CLAY: 13,
  SNOW: 14,
  ICE: 15,
  BERRY_BUSH: 16,
  CAMPFIRE: 17,
  CORRUPTED_STONE: 18,
  CORRUPTED_GRASS: 19,
  DEAD_LEAVES: 20,
  DEAD_WOOD: 21,
};

// Block colors [r, g, b] in 0-1 range
const BlockColors = {
  [BlockTypes.AIR]: [0, 0, 0],
  [BlockTypes.STONE]: [0.5, 0.5, 0.5],
  [BlockTypes.DIRT]: [0.545, 0.271, 0.075],
  [BlockTypes.GRASS]: [0.133, 0.545, 0.133],
  [BlockTypes.SAND]: [0.76, 0.7, 0.5],
  [BlockTypes.WATER]: [0.2, 0.4, 0.8],
  [BlockTypes.WOOD]: [0.545, 0.353, 0.169],
  [BlockTypes.LEAVES]: [0.2, 0.6, 0.2],
  [BlockTypes.BEDROCK]: [0.2, 0.2, 0.2],
  [BlockTypes.GRAVEL]: [0.5, 0.5, 0.55],
  [BlockTypes.COAL_ORE]: [0.3, 0.3, 0.3],
  [BlockTypes.IRON_ORE]: [0.6, 0.5, 0.45],
  [BlockTypes.GOLD_ORE]: [0.8, 0.7, 0.2],
  [BlockTypes.CLAY]: [0.6, 0.6, 0.65],
  [BlockTypes.SNOW]: [0.95, 0.95, 0.98],
  [BlockTypes.ICE]: [0.7, 0.85, 0.95],
  [BlockTypes.BERRY_BUSH]: [0.2, 0.45, 0.15],
  [BlockTypes.CAMPFIRE]: [0.9, 0.4, 0.1],
  [BlockTypes.CORRUPTED_STONE]: [0.12, 0.05, 0.15],
  [BlockTypes.CORRUPTED_GRASS]: [0.20, 0.30, 0.15],
  [BlockTypes.DEAD_LEAVES]: [0.58, 0.42, 0.28],
  [BlockTypes.DEAD_WOOD]: [0.45, 0.43, 0.40],
};

// Transparent blocks
const TransparentBlocks = new Set([
  BlockTypes.AIR,
  BlockTypes.WATER,
  BlockTypes.LEAVES,
  BlockTypes.ICE,
  BlockTypes.DEAD_LEAVES,
]);

// Face definitions
const FACES = {
  top: {
    vertices: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]],
    normal: [0, 1, 0],
  },
  bottom: {
    vertices: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]],
    normal: [0, -1, 0],
  },
  north: {
    vertices: [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]],
    normal: [0, 0, 1],
  },
  south: {
    vertices: [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]],
    normal: [0, 0, -1],
  },
  east: {
    vertices: [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]],
    normal: [1, 0, 0],
  },
  west: {
    vertices: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
    normal: [-1, 0, 0],
  },
};

// ============================================================================
// NOISE GENERATION
// ============================================================================

class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

class SimplexNoise {
  constructor(seed) {
    this.seed = seed;
    this.permutation = this.buildPermutation(seed);
  }

  buildPermutation(seed) {
    const perm = new Uint8Array(512);
    const random = new SeededRandom(seed);
    const p = new Uint8Array(256);

    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = random.nextInt(0, i);
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
    }
    return perm;
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  noise2D(x, y) {
    const perm = this.permutation;
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = perm[X] + Y;
    const B = perm[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(perm[A], x, y), this.grad(perm[B], x - 1, y), u),
      this.lerp(this.grad(perm[A + 1], x, y - 1), this.grad(perm[B + 1], x - 1, y - 1), u),
      v
    );
  }

  fbm(x, y, octaves = 4, lacunarity = 2, persistence = 0.5) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return value / maxValue;
  }
}

// ============================================================================
// RIFT CORRUPTION
// ============================================================================

// Corruption constants (mirrored from tuning.js)
const RIFT_DENSITY = 0.25;
const RIFT_MIN_SPAWN_DISTANCE = 96;
const RIFT_MIN_SEPARATION = 128;
const RIFT_CHUNK_SIZE_WORLD = 32; // world units per chunk (16 blocks * 2 voxel size)
const RIFT_GRID_RANGE = 8;

// Corruption radii in blocks
const CORRUPTION_RADIUS_FULL = 16;
const CORRUPTION_RADIUS_HEAVY = 28;
const CORRUPTION_RADIUS_LIGHT = 32;
// Chunk early-rejection distance in world units (CORRUPTION_RADIUS_LIGHT * VOXEL_SIZE + chunk diagonal)
const CORRUPTION_REJECT_DIST = 96;

// mulberry32 PRNG — identical to RiftManager.js
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cache rift positions per seed (only ever one seed in practice)
let _cachedRiftSeed = null;
let _cachedRiftPositions = null;

function getRiftPositions(seed) {
  if (_cachedRiftSeed === seed) return _cachedRiftPositions;

  const rand = mulberry32(seed);
  const candidates = [];

  for (let cx = -RIFT_GRID_RANGE; cx <= RIFT_GRID_RANGE; cx++) {
    for (let cz = -RIFT_GRID_RANGE; cz <= RIFT_GRID_RANGE; cz++) {
      if (rand() > RIFT_DENSITY) continue;
      const x = cx * RIFT_CHUNK_SIZE_WORLD + rand() * RIFT_CHUNK_SIZE_WORLD;
      const z = cz * RIFT_CHUNK_SIZE_WORLD + rand() * RIFT_CHUNK_SIZE_WORLD;

      // Check min distance from player spawn (0,0)
      if (Math.sqrt(x * x + z * z) < RIFT_MIN_SPAWN_DISTANCE) continue;
      candidates.push({ x, z });
    }
  }

  // Filter by minimum separation
  const accepted = [];
  for (const c of candidates) {
    let tooClose = false;
    for (const a of accepted) {
      const dx = c.x - a.x;
      const dz = c.z - a.z;
      if (Math.sqrt(dx * dx + dz * dz) < RIFT_MIN_SEPARATION) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) accepted.push(c);
  }

  _cachedRiftSeed = seed;
  _cachedRiftPositions = accepted;
  return accepted;
}

function getRiftsNearChunk(riftPositions, chunkX, chunkZ) {
  // Chunk center in world units
  const centerX = chunkX * CHUNK_SIZE * VOXEL_SIZE + CHUNK_SIZE;
  const centerZ = chunkZ * CHUNK_SIZE * VOXEL_SIZE + CHUNK_SIZE;
  const nearby = [];
  for (const rift of riftPositions) {
    const dx = rift.x - centerX;
    const dz = rift.z - centerZ;
    if (Math.abs(dx) < CORRUPTION_REJECT_DIST && Math.abs(dz) < CORRUPTION_REJECT_DIST) {
      nearby.push(rift);
    }
  }
  return nearby;
}

// Deterministic hash for corruption probability (stable across chunk boundaries)
function corruptionHash(wx, wz) {
  let h = (wx * 374761393 + wz * 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1103515245) | 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}

function applyCorruption(blocks, chunkX, chunkZ, nearbyRifts) {
  if (nearbyRifts.length === 0) return;

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      // World position in blocks, then convert to world units for distance
      const worldX = (chunkX * CHUNK_SIZE + x) * VOXEL_SIZE;
      const worldZ = (chunkZ * CHUNK_SIZE + z) * VOXEL_SIZE;

      // Find minimum distance to any rift (in blocks)
      let minDist = Infinity;
      for (const rift of nearbyRifts) {
        const dx = worldX - rift.x;
        const dz = worldZ - rift.z;
        const distWorld = Math.sqrt(dx * dx + dz * dz);
        const distBlocks = distWorld / VOXEL_SIZE;
        if (distBlocks < minDist) minDist = distBlocks;
      }

      if (minDist > CORRUPTION_RADIUS_LIGHT) continue;

      const wx = chunkX * CHUNK_SIZE + x;
      const wz = chunkZ * CHUNK_SIZE + z;

      // Z1: 0-16 blocks, 100% → CORRUPTED_STONE
      if (minDist <= CORRUPTION_RADIUS_FULL) {
        for (let y = 0; y < CHUNK_SIZE_Y; y++) {
          const index = x + (z << 4) + (y << 8);
          const block = blocks[index];
          if (block === BlockTypes.GRASS || block === BlockTypes.DIRT ||
              block === BlockTypes.SAND || block === BlockTypes.SNOW ||
              block === BlockTypes.CLAY || block === BlockTypes.STONE) {
            blocks[index] = BlockTypes.CORRUPTED_STONE;
          } else if (block === BlockTypes.WOOD) {
            blocks[index] = BlockTypes.DEAD_WOOD;
          } else if (block === BlockTypes.LEAVES || block === BlockTypes.BERRY_BUSH) {
            blocks[index] = BlockTypes.AIR;
          }
        }
        continue;
      }

      // Z2: 17-28 blocks — 80% CORRUPTED_STONE / 20% CORRUPTED_GRASS, gray trunks, no leaves
      if (minDist <= CORRUPTION_RADIUS_HEAVY) {
        const roll2 = corruptionHash(wx, wz);
        const toCorruptedStone = roll2 < 0.80;
        for (let y = 0; y < CHUNK_SIZE_Y; y++) {
          const index = x + (z << 4) + (y << 8);
          const block = blocks[index];
          if (block === BlockTypes.GRASS || block === BlockTypes.DIRT ||
              block === BlockTypes.SAND || block === BlockTypes.SNOW ||
              block === BlockTypes.CLAY || block === BlockTypes.STONE) {
            blocks[index] = toCorruptedStone ? BlockTypes.CORRUPTED_STONE : BlockTypes.CORRUPTED_GRASS;
          } else if (block === BlockTypes.WOOD) {
            blocks[index] = BlockTypes.DEAD_WOOD;
          } else if (block === BlockTypes.LEAVES || block === BlockTypes.BERRY_BUSH) {
            blocks[index] = BlockTypes.AIR;
          }
        }
      }

      // Z3: 29-32 blocks — all leaves/bushes die, 50% ground → CORRUPTED_GRASS
      if (minDist > CORRUPTION_RADIUS_HEAVY) {
        const roll3 = corruptionHash(wx + 7919, wz + 31337);
        for (let y = 0; y < CHUNK_SIZE_Y; y++) {
          const index = x + (z << 4) + (y << 8);
          const block = blocks[index];
          if (block === BlockTypes.LEAVES || block === BlockTypes.BERRY_BUSH) {
            blocks[index] = BlockTypes.DEAD_LEAVES;
          } else if (roll3 < 0.50 && (block === BlockTypes.GRASS || block === BlockTypes.DIRT ||
              block === BlockTypes.SAND || block === BlockTypes.SNOW)) {
            blocks[index] = BlockTypes.CORRUPTED_GRASS;
          }
        }
      }
    }
  }
}

// ============================================================================
// TERRAIN GENERATION
// ============================================================================

function generateTerrain(params) {
  const { chunkX, chunkZ, seed } = params;
  const noise = new SimplexNoise(seed);
  const random = new SeededRandom(seed + chunkX * 31337 + chunkZ * 7919);
  const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE_Y);

  // Terrain parameters - increased for more visible terrain
  const seaLevel = 2;
  const baseHeight = 4;
  const heightVariation = 4;

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = chunkX * CHUNK_SIZE + x;
      const worldZ = chunkZ * CHUNK_SIZE + z;

      const heightNoise = noise.fbm(worldX * 0.02, worldZ * 0.02, 4, 2, 0.5);
      const height = Math.floor(baseHeight + heightNoise * heightVariation);

      const temperature = noise.fbm(worldX * 0.005 + 1000, worldZ * 0.005, 2);
      const moisture = noise.fbm(worldX * 0.005 + 2000, worldZ * 0.005 + 1000, 2);

      let surfaceBlock = BlockTypes.GRASS;
      let subsurfaceBlock = BlockTypes.DIRT;

      if (temperature < -0.3) {
        surfaceBlock = BlockTypes.SNOW;
      } else if (temperature > 0.3 && moisture < -0.2) {
        surfaceBlock = BlockTypes.SAND;
        subsurfaceBlock = BlockTypes.SAND;
      } else if (moisture > 0.3 && height <= seaLevel + 1) {
        surfaceBlock = BlockTypes.CLAY;
      }

      for (let y = 0; y < CHUNK_SIZE_Y; y++) {
        const index = x + (z << 4) + (y << 8);
        let blockType = BlockTypes.AIR;

        if (y === 0) {
          blockType = BlockTypes.BEDROCK;
        } else if (y < height - 4) {
          blockType = BlockTypes.STONE;
          const oreNoise = noise.noise2D(worldX * 0.1 + y * 0.1, worldZ * 0.1);
          if (y < 8 && oreNoise > 0.7 && random.next() < 0.3) {
            blockType = BlockTypes.GOLD_ORE;
          } else if (y < 12 && oreNoise > 0.6 && random.next() < 0.4) {
            blockType = BlockTypes.IRON_ORE;
          } else if (oreNoise > 0.5 && random.next() < 0.5) {
            blockType = BlockTypes.COAL_ORE;
          }
        } else if (y < height) {
          blockType = subsurfaceBlock;
        } else if (y === height) {
          blockType = surfaceBlock;
        } else if (y <= seaLevel && height < seaLevel) {
          blockType = BlockTypes.WATER;
        }

        blocks[index] = blockType;
      }

      // Trees
      if (surfaceBlock === BlockTypes.GRASS &&
          height > seaLevel &&
          height < CHUNK_SIZE_Y - 5 &&
          random.next() < 0.02) {
        generateTree(blocks, x, height + 1, z, random);
      }

      // Berry bushes — spawn on grass if no tree above
      if (surfaceBlock === BlockTypes.GRASS &&
          height > seaLevel &&
          height + 1 < CHUNK_SIZE_Y &&
          blocks[x + (z << 4) + ((height + 1) << 8)] === BlockTypes.AIR &&
          random.next() < 0.03) {
        blocks[x + (z << 4) + ((height + 1) << 8)] = BlockTypes.BERRY_BUSH;
      }
    }
  }

  // Rift corruption pass — runs after trees + bushes so dead trees emerge naturally
  const riftPositions = getRiftPositions(seed);
  const nearbyRifts = getRiftsNearChunk(riftPositions, chunkX, chunkZ);
  applyCorruption(blocks, chunkX, chunkZ, nearbyRifts);

  return { blocks, chunkX, chunkZ };
}

function generateTree(blocks, x, baseY, z, random) {
  const trunkHeight = random.nextInt(3, 5);
  if (baseY + trunkHeight + 2 >= CHUNK_SIZE_Y) return;
  if (x < 2 || x >= CHUNK_SIZE - 2 || z < 2 || z >= CHUNK_SIZE - 2) return;

  for (let y = 0; y < trunkHeight; y++) {
    blocks[x + (z << 4) + ((baseY + y) << 8)] = BlockTypes.WOOD;
  }

  const leafY = baseY + trunkHeight;
  for (let dy = 0; dy <= 2; dy++) {
    const radius = dy === 2 ? 1 : 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const lx = x + dx, ly = leafY + dy, lz = z + dz;
        if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < CHUNK_SIZE_Y && lz >= 0 && lz < CHUNK_SIZE) {
          const dist = Math.abs(dx) + Math.abs(dz);
          if (dist <= radius && random.next() > 0.2) {
            const index = lx + (lz << 4) + (ly << 8);
            if (blocks[index] === BlockTypes.AIR) {
              blocks[index] = BlockTypes.LEAVES;
            }
          }
        }
      }
    }
  }
}

// ============================================================================
// MESH BUILDING
// ============================================================================

function buildChunkMesh(params) {
  const { blocks, neighborNorth, neighborSouth, neighborEast, neighborWest } = params;

  const maxVertices = 20000;
  const positions = new Float32Array(maxVertices * 3);
  const normals = new Float32Array(maxVertices * 3);
  const colors = new Float32Array(maxVertices * 3);
  const emissive = new Float32Array(maxVertices);  // per-vertex emissive factor (0=none, 1=full glow)
  const indices = [];
  let vertexCount = 0;

  function getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_SIZE_Y) return BlockTypes.AIR;
    if (x < 0) {
      if (!neighborWest) return BlockTypes.AIR;
      return neighborWest[(CHUNK_SIZE - 1) + (z << 4) + (y << 8)];
    }
    if (x >= CHUNK_SIZE) {
      if (!neighborEast) return BlockTypes.AIR;
      return neighborEast[0 + (z << 4) + (y << 8)];
    }
    if (z < 0) {
      if (!neighborSouth) return BlockTypes.AIR;
      return neighborSouth[x + ((CHUNK_SIZE - 1) << 4) + (y << 8)];
    }
    if (z >= CHUNK_SIZE) {
      if (!neighborNorth) return BlockTypes.AIR;
      return neighborNorth[x + (0 << 4) + (y << 8)];
    }
    return blocks[x + (z << 4) + (y << 8)];
  }

  function shouldRenderFace(blockType, adjacentType) {
    if (blockType === BlockTypes.AIR) return false;
    if (TransparentBlocks.has(adjacentType)) {
      if (blockType === adjacentType) return false;
      return true;
    }
    return false;
  }

  function isSolidForAO(x, y, z) {
    const b = getBlock(x, y, z);
    return b !== BlockTypes.AIR && b !== BlockTypes.WATER && b !== BlockTypes.LEAVES && b !== BlockTypes.ICE && b !== BlockTypes.DEAD_LEAVES;
  }

  // AO neighbor offsets per face per vertex: [side1, side2, corner]
  // Each is [dx, dy, dz] relative to the block position
  const AO_OFFSETS = {
    top: [ // +Y face, vertices at y+1
      [[-1,1,0],[0,1,-1],[-1,1,-1]], // v0 (0,1,0)
      [[1,1,0],[0,1,-1],[1,1,-1]],   // v1 (1,1,0)
      [[1,1,0],[0,1,1],[1,1,1]],     // v2 (1,1,1)
      [[-1,1,0],[0,1,1],[-1,1,1]],   // v3 (0,1,1)
    ],
    bottom: [ // -Y face, vertices at y-1
      [[-1,-1,0],[0,-1,1],[-1,-1,1]],  // v0 (0,0,1)
      [[1,-1,0],[0,-1,1],[1,-1,1]],    // v1 (1,0,1)
      [[1,-1,0],[0,-1,-1],[1,-1,-1]],  // v2 (1,0,0)
      [[-1,-1,0],[0,-1,-1],[-1,-1,-1]],// v3 (0,0,0)
    ],
    north: [ // +Z face, vertices at z+1
      [[-1,0,1],[0,-1,1],[-1,-1,1]],  // v0 (0,0,1)
      [[-1,0,1],[0,1,1],[-1,1,1]],    // v1 (0,1,1)
      [[1,0,1],[0,1,1],[1,1,1]],      // v2 (1,1,1)
      [[1,0,1],[0,-1,1],[1,-1,1]],    // v3 (1,0,1)
    ],
    south: [ // -Z face, vertices at z-1
      [[1,0,-1],[0,-1,-1],[1,-1,-1]],  // v0 (1,0,0)
      [[1,0,-1],[0,1,-1],[1,1,-1]],    // v1 (1,1,0)
      [[-1,0,-1],[0,1,-1],[-1,1,-1]],  // v2 (0,1,0)
      [[-1,0,-1],[0,-1,-1],[-1,-1,-1]],// v3 (0,0,0)
    ],
    east: [ // +X face, vertices at x+1
      [[1,0,1],[1,-1,0],[1,-1,1]],    // v0 (1,0,1)
      [[1,0,1],[1,1,0],[1,1,1]],      // v1 (1,1,1)
      [[1,0,-1],[1,1,0],[1,1,-1]],    // v2 (1,1,0)
      [[1,0,-1],[1,-1,0],[1,-1,-1]],  // v3 (1,0,0)
    ],
    west: [ // -X face, vertices at x-1
      [[-1,0,-1],[-1,-1,0],[-1,-1,-1]], // v0 (0,0,0)
      [[-1,0,-1],[-1,1,0],[-1,1,-1]],   // v1 (0,1,0)
      [[-1,0,1],[-1,1,0],[-1,1,1]],     // v2 (0,1,1)
      [[-1,0,1],[-1,-1,0],[-1,-1,1]],   // v3 (0,0,1)
    ],
  };

  const AO_BRIGHTNESS = [0.5, 0.65, 0.8, 1.0];

  // Simple hash for per-block color variation (deterministic, no allocations)
  function blockHash(x, y, z) {
    let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
    h = ((h ^ (h >> 13)) * 1103515245) | 0;
    return (h & 0x7fffffff) / 0x7fffffff; // 0.0–1.0
  }

  // Pre-scan for campfire positions in chunk AND neighbor edges (for warm glow)
  const campfirePositions = [];
  const CAMPFIRE_GLOW_RADIUS = 5;
  // Scan own chunk
  for (let cy = 0; cy < CHUNK_SIZE_Y; cy++) {
    for (let cz = 0; cz < CHUNK_SIZE; cz++) {
      for (let cx = 0; cx < CHUNK_SIZE; cx++) {
        if (blocks[cx + (cz << 4) + (cy << 8)] === BlockTypes.CAMPFIRE) {
          campfirePositions.push(cx, cy, cz);
        }
      }
    }
  }
  // Scan neighbor chunk edges for campfires within glow radius of boundary
  // Positions are stored in local-space coordinates (negative or >= CHUNK_SIZE)
  const R = CAMPFIRE_GLOW_RADIUS;
  if (neighborWest) {
    for (let cy = 0; cy < CHUNK_SIZE_Y; cy++) {
      for (let cz = 0; cz < CHUNK_SIZE; cz++) {
        for (let cx = CHUNK_SIZE - R; cx < CHUNK_SIZE; cx++) {
          if (neighborWest[cx + (cz << 4) + (cy << 8)] === BlockTypes.CAMPFIRE) {
            campfirePositions.push(cx - CHUNK_SIZE, cy, cz);
          }
        }
      }
    }
  }
  if (neighborEast) {
    for (let cy = 0; cy < CHUNK_SIZE_Y; cy++) {
      for (let cz = 0; cz < CHUNK_SIZE; cz++) {
        for (let cx = 0; cx < R; cx++) {
          if (neighborEast[cx + (cz << 4) + (cy << 8)] === BlockTypes.CAMPFIRE) {
            campfirePositions.push(cx + CHUNK_SIZE, cy, cz);
          }
        }
      }
    }
  }
  if (neighborSouth) {
    for (let cy = 0; cy < CHUNK_SIZE_Y; cy++) {
      for (let cz = CHUNK_SIZE - R; cz < CHUNK_SIZE; cz++) {
        for (let cx = 0; cx < CHUNK_SIZE; cx++) {
          if (neighborSouth[cx + (cz << 4) + (cy << 8)] === BlockTypes.CAMPFIRE) {
            campfirePositions.push(cx, cy, cz - CHUNK_SIZE);
          }
        }
      }
    }
  }
  if (neighborNorth) {
    for (let cy = 0; cy < CHUNK_SIZE_Y; cy++) {
      for (let cz = 0; cz < R; cz++) {
        for (let cx = 0; cx < CHUNK_SIZE; cx++) {
          if (neighborNorth[cx + (cz << 4) + (cy << 8)] === BlockTypes.CAMPFIRE) {
            campfirePositions.push(cx, cy, cz + CHUNK_SIZE);
          }
        }
      }
    }
  }

  function getCampfireGlow(x, y, z) {
    let glow = 0;
    for (let i = 0; i < campfirePositions.length; i += 3) {
      const dx = x - campfirePositions[i];
      const dy = y - campfirePositions[i + 1];
      const dz = z - campfirePositions[i + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < CAMPFIRE_GLOW_RADIUS && dist > 0) {
        glow = Math.max(glow, 1.0 - dist / CAMPFIRE_GLOW_RADIUS);
      }
    }
    return glow;
  }

  function addFace(x, y, z, face, blockType) {
    if (vertexCount + 4 > maxVertices) return;

    const faceData = FACES[face];
    const color = BlockColors[blockType] || [1, 0, 1];

    let lightMod = 1.0;
    if (face === 'bottom') lightMod = 0.5;
    else if (face === 'north' || face === 'south') lightMod = 0.8;
    else if (face === 'east' || face === 'west') lightMod = 0.7;

    // Height-based brightness: lower blocks are slightly darker, higher are brighter
    // Range: ~0.88 at y=0 to ~1.08 at y=15 (subtle but visible at elevation changes)
    const heightMod = 0.88 + (y / CHUNK_SIZE_Y) * 0.20;

    // Per-block noise: ±4% brightness variation to break up uniform surfaces
    const noiseMod = 0.96 + blockHash(x, y, z) * 0.08;

    // Warm glow from nearby campfires
    const campGlow = campfirePositions.length > 0 ? getCampfireGlow(x, y, z) : 0;

    const aoOffsets = AO_OFFSETS[face];
    const startVertex = vertexCount;

    for (let i = 0; i < 4; i++) {
      const v = faceData.vertices[i];
      const idx = vertexCount * 3;

      positions[idx] = (x + v[0]) * VOXEL_SIZE;
      positions[idx + 1] = (y + v[1]) * VOXEL_SIZE;
      positions[idx + 2] = (z + v[2]) * VOXEL_SIZE;

      normals[idx] = faceData.normal[0];
      normals[idx + 1] = faceData.normal[1];
      normals[idx + 2] = faceData.normal[2];

      // Compute per-vertex AO
      const offsets = aoOffsets[i];
      const s1 = isSolidForAO(x + offsets[0][0], y + offsets[0][1], z + offsets[0][2]);
      const s2 = isSolidForAO(x + offsets[1][0], y + offsets[1][1], z + offsets[1][2]);
      const cn = isSolidForAO(x + offsets[2][0], y + offsets[2][1], z + offsets[2][2]);
      const ao = (s1 && s2) ? 0 : 3 - (s1 + s2 + cn);
      const aoMod = AO_BRIGHTNESS[ao];

      // Campfire blocks glow — skip darkening, boost brightness with flicker
      if (blockType === BlockTypes.CAMPFIRE) {
        const flicker = 0.9 + blockHash(x + i, y, z + i) * 0.2; // 0.9–1.1
        colors[idx] = Math.min(1, 1.2 * flicker);       // bright yellow-white
        colors[idx + 1] = Math.min(1, 0.7 * flicker);
        colors[idx + 2] = Math.min(1, 0.2 * flicker);
        emissive[vertexCount] = 1.0; // fully emissive — stays bright at night
      } else if (blockType === BlockTypes.CORRUPTED_STONE) {
        // Dark purple with vein variation — keeps AO/height darkening
        const vein = blockHash(x + i, y, z + i) * 0.08;
        const finalMod = lightMod * aoMod * heightMod;
        colors[idx] = Math.min(1, (0.12 + vein) * finalMod);
        colors[idx + 1] = Math.min(1, 0.05 * finalMod);
        colors[idx + 2] = Math.min(1, (0.15 + vein) * finalMod);
      } else if (blockType === BlockTypes.CORRUPTED_GRASS) {
        const finalMod = lightMod * aoMod * heightMod * noiseMod;
        colors[idx] = Math.min(1, 0.20 * finalMod);
        colors[idx + 1] = Math.min(1, 0.30 * finalMod);
        colors[idx + 2] = Math.min(1, 0.15 * finalMod);
      } else {
        const finalMod = lightMod * aoMod * heightMod * noiseMod;
        let r = color[0] * finalMod;
        let g = color[1] * finalMod;
        let b = color[2] * finalMod;
        // Blend warm campfire glow onto nearby blocks
        if (campGlow > 0) {
          r = r + campGlow * 0.6;
          g = g + campGlow * 0.3;
          b = b + campGlow * 0.05;
          emissive[vertexCount] = campGlow * 0.7; // partial emissive for warm glow at night
        }
        colors[idx] = Math.min(1, r);
        colors[idx + 1] = Math.min(1, g);
        colors[idx + 2] = Math.min(1, b);
      }

      vertexCount++;
    }

    indices.push(
      startVertex, startVertex + 1, startVertex + 2,
      startVertex, startVertex + 2, startVertex + 3
    );
  }

  for (let y = 0; y < CHUNK_SIZE_Y; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const blockType = blocks[x + (z << 4) + (y << 8)];
        if (blockType === BlockTypes.AIR) continue;

        if (shouldRenderFace(blockType, getBlock(x, y + 1, z))) addFace(x, y, z, 'top', blockType);
        if (shouldRenderFace(blockType, getBlock(x, y - 1, z))) addFace(x, y, z, 'bottom', blockType);
        if (shouldRenderFace(blockType, getBlock(x, y, z + 1))) addFace(x, y, z, 'north', blockType);
        if (shouldRenderFace(blockType, getBlock(x, y, z - 1))) addFace(x, y, z, 'south', blockType);
        if (shouldRenderFace(blockType, getBlock(x + 1, y, z))) addFace(x, y, z, 'east', blockType);
        if (shouldRenderFace(blockType, getBlock(x - 1, y, z))) addFace(x, y, z, 'west', blockType);
      }
    }
  }

  return {
    positions: positions.slice(0, vertexCount * 3),
    normals: normals.slice(0, vertexCount * 3),
    colors: colors.slice(0, vertexCount * 3),
    emissive: emissive.slice(0, vertexCount),
    indices: new Uint32Array(indices),
    vertexCount,
    faceCount: indices.length / 6,
  };
}

// ============================================================================
// LOD MESH BUILDING
// ============================================================================

const LOD_MERGE_FACTORS = [1, 2, 4];

function getDominantBlock(blocks, startX, startY, startZ, size, chunkSize, chunkSizeY) {
  const counts = new Map();
  let maxCount = 0;
  let dominant = BlockTypes.AIR;
  let hasNonAir = false;

  for (let dx = 0; dx < size && startX + dx < chunkSize; dx++) {
    for (let dy = 0; dy < size && startY + dy < chunkSizeY; dy++) {
      for (let dz = 0; dz < size && startZ + dz < chunkSize; dz++) {
        const x = startX + dx;
        const y = startY + dy;
        const z = startZ + dz;
        const index = x + (z << 4) + (y << 8);
        const blockType = blocks[index];

        if (blockType !== BlockTypes.AIR) {
          hasNonAir = true;
          const count = (counts.get(blockType) || 0) + 1;
          counts.set(blockType, count);
          if (count > maxCount) {
            maxCount = count;
            dominant = blockType;
          }
        }
      }
    }
  }
  return hasNonAir ? dominant : BlockTypes.AIR;
}

function generateLODBlocks(sourceBlocks, lodLevel) {
  const mergeFactor = LOD_MERGE_FACTORS[lodLevel];
  const lodSize = Math.ceil(CHUNK_SIZE / mergeFactor);
  const lodSizeY = Math.ceil(CHUNK_SIZE_Y / mergeFactor);
  const lodBlocks = new Uint8Array(lodSize * lodSize * lodSizeY);

  for (let y = 0; y < lodSizeY; y++) {
    for (let z = 0; z < lodSize; z++) {
      for (let x = 0; x < lodSize; x++) {
        const sourceX = x * mergeFactor;
        const sourceY = y * mergeFactor;
        const sourceZ = z * mergeFactor;
        const dominant = getDominantBlock(sourceBlocks, sourceX, sourceY, sourceZ, mergeFactor, CHUNK_SIZE, CHUNK_SIZE_Y);
        const lodIndex = x + (z * lodSize) + (y * lodSize * lodSize);
        lodBlocks[lodIndex] = dominant;
      }
    }
  }
  return { lodBlocks, lodSize, lodSizeY };
}

function buildLODMesh(params) {
  const { blocks, lodLevel } = params;
  const { lodBlocks, lodSize, lodSizeY } = generateLODBlocks(blocks, lodLevel);
  const voxelScale = LOD_MERGE_FACTORS[lodLevel] * VOXEL_SIZE;

  const maxVertices = 8000;
  const positions = new Float32Array(maxVertices * 3);
  const normals = new Float32Array(maxVertices * 3);
  const colors = new Float32Array(maxVertices * 3);
  const emissive = new Float32Array(maxVertices);
  const indices = [];
  let vertexCount = 0;

  function getBlock(x, y, z) {
    if (x < 0 || x >= lodSize || y < 0 || y >= lodSizeY || z < 0 || z >= lodSize) {
      return BlockTypes.AIR;
    }
    return lodBlocks[x + (z * lodSize) + (y * lodSize * lodSize)];
  }

  function shouldRenderFace(blockType, adjacentType) {
    if (blockType === BlockTypes.AIR) return false;
    if (TransparentBlocks.has(adjacentType)) {
      if (blockType === adjacentType) return false;
      return true;
    }
    return false;
  }

  function isSolidForAO(x, y, z) {
    const b = getBlock(x, y, z);
    return b !== BlockTypes.AIR && b !== BlockTypes.WATER && b !== BlockTypes.LEAVES && b !== BlockTypes.ICE && b !== BlockTypes.DEAD_LEAVES;
  }

  const AO_OFFSETS_LOD = {
    top: [
      [[-1,1,0],[0,1,-1],[-1,1,-1]],
      [[1,1,0],[0,1,-1],[1,1,-1]],
      [[1,1,0],[0,1,1],[1,1,1]],
      [[-1,1,0],[0,1,1],[-1,1,1]],
    ],
    bottom: [
      [[-1,-1,0],[0,-1,1],[-1,-1,1]],
      [[1,-1,0],[0,-1,1],[1,-1,1]],
      [[1,-1,0],[0,-1,-1],[1,-1,-1]],
      [[-1,-1,0],[0,-1,-1],[-1,-1,-1]],
    ],
    north: [
      [[-1,0,1],[0,-1,1],[-1,-1,1]],
      [[-1,0,1],[0,1,1],[-1,1,1]],
      [[1,0,1],[0,1,1],[1,1,1]],
      [[1,0,1],[0,-1,1],[1,-1,1]],
    ],
    south: [
      [[1,0,-1],[0,-1,-1],[1,-1,-1]],
      [[1,0,-1],[0,1,-1],[1,1,-1]],
      [[-1,0,-1],[0,1,-1],[-1,1,-1]],
      [[-1,0,-1],[0,-1,-1],[-1,-1,-1]],
    ],
    east: [
      [[1,0,1],[1,-1,0],[1,-1,1]],
      [[1,0,1],[1,1,0],[1,1,1]],
      [[1,0,-1],[1,1,0],[1,1,-1]],
      [[1,0,-1],[1,-1,0],[1,-1,-1]],
    ],
    west: [
      [[-1,0,-1],[-1,-1,0],[-1,-1,-1]],
      [[-1,0,-1],[-1,1,0],[-1,1,-1]],
      [[-1,0,1],[-1,1,0],[-1,1,1]],
      [[-1,0,1],[-1,-1,0],[-1,-1,1]],
    ],
  };

  const AO_BRIGHTNESS_LOD = [0.5, 0.65, 0.8, 1.0];

  function lodBlockHash(x, y, z) {
    let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
    h = ((h ^ (h >> 13)) * 1103515245) | 0;
    return (h & 0x7fffffff) / 0x7fffffff;
  }

  function addFace(x, y, z, face, blockType) {
    if (vertexCount + 4 > maxVertices) return;
    const faceData = FACES[face];
    const color = BlockColors[blockType] || [1, 0, 1];
    let lightMod = 1.0;
    if (face === 'bottom') lightMod = 0.5;
    else if (face === 'north' || face === 'south') lightMod = 0.8;
    else if (face === 'east' || face === 'west') lightMod = 0.7;

    const heightMod = 0.88 + (y / lodSizeY) * 0.20;
    const noiseMod = 0.96 + lodBlockHash(x, y, z) * 0.08;

    const aoOffsets = AO_OFFSETS_LOD[face];
    const startVertex = vertexCount;
    for (let i = 0; i < 4; i++) {
      const v = faceData.vertices[i];
      const idx = vertexCount * 3;
      positions[idx] = (x + v[0]) * voxelScale;
      positions[idx + 1] = (y + v[1]) * voxelScale;
      positions[idx + 2] = (z + v[2]) * voxelScale;
      normals[idx] = faceData.normal[0];
      normals[idx + 1] = faceData.normal[1];
      normals[idx + 2] = faceData.normal[2];

      const offsets = aoOffsets[i];
      const s1 = isSolidForAO(x + offsets[0][0], y + offsets[0][1], z + offsets[0][2]);
      const s2 = isSolidForAO(x + offsets[1][0], y + offsets[1][1], z + offsets[1][2]);
      const cn = isSolidForAO(x + offsets[2][0], y + offsets[2][1], z + offsets[2][2]);
      const ao = (s1 && s2) ? 0 : 3 - (s1 + s2 + cn);

      if (blockType === BlockTypes.CAMPFIRE) {
        const flicker = 0.9 + lodBlockHash(x + i, y, z + i) * 0.2;
        colors[idx] = Math.min(1, 1.2 * flicker);
        colors[idx + 1] = Math.min(1, 0.7 * flicker);
        colors[idx + 2] = Math.min(1, 0.2 * flicker);
        emissive[vertexCount] = 1.0;
      } else if (blockType === BlockTypes.CORRUPTED_STONE) {
        const vein = lodBlockHash(x + i, y, z + i) * 0.08;
        const finalMod = lightMod * AO_BRIGHTNESS_LOD[ao] * heightMod;
        colors[idx] = Math.min(1, (0.12 + vein) * finalMod);
        colors[idx + 1] = Math.min(1, 0.05 * finalMod);
        colors[idx + 2] = Math.min(1, (0.15 + vein) * finalMod);
      } else if (blockType === BlockTypes.CORRUPTED_GRASS) {
        const finalMod = lightMod * AO_BRIGHTNESS_LOD[ao] * heightMod * noiseMod;
        colors[idx] = Math.min(1, 0.20 * finalMod);
        colors[idx + 1] = Math.min(1, 0.30 * finalMod);
        colors[idx + 2] = Math.min(1, 0.15 * finalMod);
      } else {
        const finalMod = lightMod * AO_BRIGHTNESS_LOD[ao] * heightMod * noiseMod;
        colors[idx] = Math.min(1, color[0] * finalMod);
        colors[idx + 1] = Math.min(1, color[1] * finalMod);
        colors[idx + 2] = Math.min(1, color[2] * finalMod);
      }
      vertexCount++;
    }
    indices.push(startVertex, startVertex + 1, startVertex + 2, startVertex, startVertex + 2, startVertex + 3);
  }

  for (let y = 0; y < lodSizeY; y++) {
    for (let z = 0; z < lodSize; z++) {
      for (let x = 0; x < lodSize; x++) {
        const blockType = lodBlocks[x + (z * lodSize) + (y * lodSize * lodSize)];
        if (blockType === BlockTypes.AIR) continue;
        if (shouldRenderFace(blockType, getBlock(x, y + 1, z))) addFace(x, y, z, 'top', blockType);
        if (shouldRenderFace(blockType, getBlock(x, y - 1, z))) addFace(x, y, z, 'bottom', blockType);
        if (shouldRenderFace(blockType, getBlock(x, y, z + 1))) addFace(x, y, z, 'north', blockType);
        if (shouldRenderFace(blockType, getBlock(x, y, z - 1))) addFace(x, y, z, 'south', blockType);
        if (shouldRenderFace(blockType, getBlock(x + 1, y, z))) addFace(x, y, z, 'east', blockType);
        if (shouldRenderFace(blockType, getBlock(x - 1, y, z))) addFace(x, y, z, 'west', blockType);
      }
    }
  }

  return {
    positions: positions.slice(0, vertexCount * 3),
    normals: normals.slice(0, vertexCount * 3),
    colors: colors.slice(0, vertexCount * 3),
    emissive: emissive.slice(0, vertexCount),
    indices: new Uint32Array(indices),
    vertexCount,
    faceCount: indices.length / 6,
    lodLevel,
  };
}

// ============================================================================
// WORKER MESSAGE HANDLING
// ============================================================================

const activeTasks = new Map();

self.onmessage = function(event) {
  var data = event.data;
  var type = data.type;
  var requestId = data.requestId;

  switch (type) {
    case 'generateTerrain':
      handleGenerateTerrain(requestId, data);
      break;
    case 'buildMesh':
      handleBuildMesh(requestId, data);
      break;
    case 'buildLODMesh':
      handleBuildLODMesh(requestId, data);
      break;
    case 'generateAndBuildMesh':
      handleGenerateAndBuildMesh(requestId, data);
      break;
    case 'cancel':
      handleCancel(requestId);
      break;
    default:
      self.postMessage({ type: 'error', requestId: requestId, error: 'Unknown type: ' + type });
  }
};

function handleGenerateTerrain(requestId, data) {
  activeTasks.set(requestId, { cancelled: false });
  try {
    var result = generateTerrain(data);
    var task = activeTasks.get(requestId);
    if (task && task.cancelled) {
      activeTasks.delete(requestId);
      return;
    }
    self.postMessage(
      {
        type: 'terrainComplete',
        requestId: requestId,
        blocks: result.blocks,
        chunkX: result.chunkX,
        chunkZ: result.chunkZ
      },
      [result.blocks.buffer]
    );
  } catch (error) {
    self.postMessage({ type: 'error', requestId: requestId, error: error.message });
  } finally {
    activeTasks.delete(requestId);
  }
}

function handleBuildMesh(requestId, data) {
  activeTasks.set(requestId, { cancelled: false });
  try {
    var result = buildChunkMesh(data);
    var task = activeTasks.get(requestId);
    if (task && task.cancelled) {
      activeTasks.delete(requestId);
      return;
    }
    self.postMessage(
      {
        type: 'meshComplete',
        requestId: requestId,
        positions: result.positions,
        normals: result.normals,
        colors: result.colors,
        indices: result.indices,
        vertexCount: result.vertexCount,
        faceCount: result.faceCount
      },
      [result.positions.buffer, result.normals.buffer, result.colors.buffer, result.indices.buffer]
    );
  } catch (error) {
    self.postMessage({ type: 'error', requestId: requestId, error: error.message });
  } finally {
    activeTasks.delete(requestId);
  }
}

function handleBuildLODMesh(requestId, data) {
  activeTasks.set(requestId, { cancelled: false });
  try {
    var result = buildLODMesh(data);
    var task = activeTasks.get(requestId);
    if (task && task.cancelled) {
      activeTasks.delete(requestId);
      return;
    }
    self.postMessage(
      {
        type: 'lodMeshComplete',
        requestId: requestId,
        positions: result.positions,
        normals: result.normals,
        colors: result.colors,
        indices: result.indices,
        vertexCount: result.vertexCount,
        faceCount: result.faceCount,
        lodLevel: result.lodLevel
      },
      [result.positions.buffer, result.normals.buffer, result.colors.buffer, result.indices.buffer]
    );
  } catch (error) {
    self.postMessage({ type: 'error', requestId: requestId, error: error.message });
  } finally {
    activeTasks.delete(requestId);
  }
}

function handleGenerateAndBuildMesh(requestId, data) {
  activeTasks.set(requestId, { cancelled: false });
  try {
    var terrain = generateTerrain(data);
    var task = activeTasks.get(requestId);
    if (task && task.cancelled) {
      activeTasks.delete(requestId);
      return;
    }
    var mesh = buildChunkMesh({
      blocks: terrain.blocks,
      neighborNorth: data.neighborNorth || null,
      neighborSouth: data.neighborSouth || null,
      neighborEast: data.neighborEast || null,
      neighborWest: data.neighborWest || null
    });
    task = activeTasks.get(requestId);
    if (task && task.cancelled) {
      activeTasks.delete(requestId);
      return;
    }
    self.postMessage(
      {
        type: 'generateAndMeshComplete',
        requestId: requestId,
        chunkX: terrain.chunkX,
        chunkZ: terrain.chunkZ,
        blocks: terrain.blocks,
        positions: mesh.positions,
        normals: mesh.normals,
        colors: mesh.colors,
        indices: mesh.indices,
        vertexCount: mesh.vertexCount,
        faceCount: mesh.faceCount
      },
      [terrain.blocks.buffer, mesh.positions.buffer, mesh.normals.buffer, mesh.colors.buffer, mesh.indices.buffer]
    );
  } catch (error) {
    self.postMessage({ type: 'error', requestId: requestId, error: error.message });
  } finally {
    activeTasks.delete(requestId);
  }
}

function handleCancel(requestId) {
  const task = activeTasks.get(requestId);
  if (task) task.cancelled = true;
}

// Let main thread know worker is ready
self.postMessage({ type: 'ready' });
