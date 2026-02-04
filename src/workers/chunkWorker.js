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
};

// Transparent blocks
const TransparentBlocks = new Set([
  BlockTypes.AIR,
  BlockTypes.WATER,
  BlockTypes.LEAVES,
  BlockTypes.ICE,
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
// TERRAIN GENERATION
// ============================================================================

function generateTerrain(params) {
  const { chunkX, chunkZ, seed } = params;
  const noise = new SimplexNoise(seed);
  const random = new SeededRandom(seed + chunkX * 31337 + chunkZ * 7919);
  const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE_Y);

  // Terrain parameters - keep surface low enough to be visible from player position (y=2)
  // Surface will be at block y = baseHeight ± heightVariation = 1-3 blocks = 2-6 world units
  const seaLevel = 0;
  const baseHeight = 1;
  const heightVariation = 2;

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
    }
  }

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

  function addFace(x, y, z, face, blockType) {
    if (vertexCount + 4 > maxVertices) return;

    const faceData = FACES[face];
    const color = BlockColors[blockType] || [1, 0, 1];

    let lightMod = 1.0;
    if (face === 'bottom') lightMod = 0.5;
    else if (face === 'north' || face === 'south') lightMod = 0.8;
    else if (face === 'east' || face === 'west') lightMod = 0.7;

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

      colors[idx] = color[0] * lightMod;
      colors[idx + 1] = color[1] * lightMod;
      colors[idx + 2] = color[2] * lightMod;

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
    indices: new Uint32Array(indices),
    vertexCount,
    faceCount: indices.length / 6,
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
