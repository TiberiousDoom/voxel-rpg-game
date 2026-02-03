/**
 * Mesh Builder - Converts chunk block data to renderable geometry
 *
 * Uses face culling to only generate faces that are visible (adjacent to air).
 * Results in 90%+ vertex reduction compared to naive approach.
 */

// Constants - must match coordinates.js
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

// Transparent blocks (faces against them should be rendered)
const TransparentBlocks = new Set([
  BlockTypes.AIR,
  BlockTypes.WATER,
  BlockTypes.LEAVES,
  BlockTypes.ICE,
]);

// Face definitions: vertices and normals for each face
// Vertices are in local block space (0-1)
const FACES = {
  top: {
    // +Y face
    vertices: [
      [0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]
    ],
    normal: [0, 1, 0],
    ao: [1, 1, 1, 1], // TODO: ambient occlusion
  },
  bottom: {
    // -Y face
    vertices: [
      [0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]
    ],
    normal: [0, -1, 0],
    ao: [1, 1, 1, 1],
  },
  north: {
    // +Z face
    vertices: [
      [0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]
    ],
    normal: [0, 0, 1],
    ao: [1, 1, 1, 1],
  },
  south: {
    // -Z face
    vertices: [
      [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]
    ],
    normal: [0, 0, -1],
    ao: [1, 1, 1, 1],
  },
  east: {
    // +X face
    vertices: [
      [1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]
    ],
    normal: [1, 0, 0],
    ao: [1, 1, 1, 1],
  },
  west: {
    // -X face
    vertices: [
      [0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]
    ],
    normal: [-1, 0, 0],
    ao: [1, 1, 1, 1],
  },
};

/**
 * Build mesh geometry for a chunk
 * @param {Object} params
 * @param {Uint8Array} params.blocks - Chunk block data
 * @param {Uint8Array|null} params.neighborNorth - North neighbor blocks (+Z)
 * @param {Uint8Array|null} params.neighborSouth - South neighbor blocks (-Z)
 * @param {Uint8Array|null} params.neighborEast - East neighbor blocks (+X)
 * @param {Uint8Array|null} params.neighborWest - West neighbor blocks (-X)
 * @returns {Object} Mesh data with positions, normals, colors, indices
 */
export function buildChunkMesh(params) {
  const { blocks, neighborNorth, neighborSouth, neighborEast, neighborWest } = params;

  // Pre-allocate arrays (will trim at end)
  // Worst case: every block has 6 faces, 4 vertices each = 4096 * 6 * 4 = 98304 vertices
  // Typical case: ~5-10% of that
  const maxVertices = 20000;
  const positions = new Float32Array(maxVertices * 3);
  const normals = new Float32Array(maxVertices * 3);
  const colors = new Float32Array(maxVertices * 3);
  const indices = [];

  let vertexCount = 0;

  // Helper to get block at position, including neighbors
  function getBlock(x, y, z) {
    // Out of Y bounds
    if (y < 0 || y >= CHUNK_SIZE_Y) return BlockTypes.AIR;

    // Check X neighbors
    if (x < 0) {
      if (!neighborWest) return BlockTypes.AIR;
      return neighborWest[(CHUNK_SIZE - 1) + (z << 4) + (y << 8)];
    }
    if (x >= CHUNK_SIZE) {
      if (!neighborEast) return BlockTypes.AIR;
      return neighborEast[0 + (z << 4) + (y << 8)];
    }

    // Check Z neighbors
    if (z < 0) {
      if (!neighborSouth) return BlockTypes.AIR;
      return neighborSouth[x + ((CHUNK_SIZE - 1) << 4) + (y << 8)];
    }
    if (z >= CHUNK_SIZE) {
      if (!neighborNorth) return BlockTypes.AIR;
      return neighborNorth[x + (0 << 4) + (y << 8)];
    }

    // In bounds
    return blocks[x + (z << 4) + (y << 8)];
  }

  // Check if a block face should be rendered
  function shouldRenderFace(blockType, adjacentType) {
    // Don't render faces of air blocks
    if (blockType === BlockTypes.AIR) return false;

    // Render face if adjacent block is transparent
    if (TransparentBlocks.has(adjacentType)) {
      // Don't render faces between same transparent blocks (e.g., water-water)
      if (blockType === adjacentType) return false;
      return true;
    }

    return false;
  }

  // Add a face to the mesh
  function addFace(x, y, z, face, blockType) {
    if (vertexCount + 4 > maxVertices) {
      console.warn('Mesh vertex limit reached');
      return;
    }

    const faceData = FACES[face];
    const color = BlockColors[blockType] || [1, 0, 1]; // Magenta for unknown

    // Slight color variation based on face direction (fake lighting)
    let lightMod = 1.0;
    if (face === 'bottom') lightMod = 0.5;
    else if (face === 'north' || face === 'south') lightMod = 0.8;
    else if (face === 'east' || face === 'west') lightMod = 0.7;

    const startVertex = vertexCount;

    // Add 4 vertices for the face
    for (let i = 0; i < 4; i++) {
      const v = faceData.vertices[i];
      const idx = vertexCount * 3;

      // Position (scaled by voxel size)
      positions[idx] = (x + v[0]) * VOXEL_SIZE;
      positions[idx + 1] = (y + v[1]) * VOXEL_SIZE;
      positions[idx + 2] = (z + v[2]) * VOXEL_SIZE;

      // Normal
      normals[idx] = faceData.normal[0];
      normals[idx + 1] = faceData.normal[1];
      normals[idx + 2] = faceData.normal[2];

      // Color with lighting
      colors[idx] = color[0] * lightMod;
      colors[idx + 1] = color[1] * lightMod;
      colors[idx + 2] = color[2] * lightMod;

      vertexCount++;
    }

    // Add indices for two triangles (0,1,2) and (0,2,3)
    indices.push(
      startVertex, startVertex + 1, startVertex + 2,
      startVertex, startVertex + 2, startVertex + 3
    );
  }

  // Iterate through all blocks
  for (let y = 0; y < CHUNK_SIZE_Y; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const blockType = blocks[x + (z << 4) + (y << 8)];

        // Skip air blocks
        if (blockType === BlockTypes.AIR) continue;

        // Check each face
        // Top (+Y)
        if (shouldRenderFace(blockType, getBlock(x, y + 1, z))) {
          addFace(x, y, z, 'top', blockType);
        }

        // Bottom (-Y)
        if (shouldRenderFace(blockType, getBlock(x, y - 1, z))) {
          addFace(x, y, z, 'bottom', blockType);
        }

        // North (+Z)
        if (shouldRenderFace(blockType, getBlock(x, y, z + 1))) {
          addFace(x, y, z, 'north', blockType);
        }

        // South (-Z)
        if (shouldRenderFace(blockType, getBlock(x, y, z - 1))) {
          addFace(x, y, z, 'south', blockType);
        }

        // East (+X)
        if (shouldRenderFace(blockType, getBlock(x + 1, y, z))) {
          addFace(x, y, z, 'east', blockType);
        }

        // West (-X)
        if (shouldRenderFace(blockType, getBlock(x - 1, y, z))) {
          addFace(x, y, z, 'west', blockType);
        }
      }
    }
  }

  // Trim arrays to actual size
  return {
    positions: positions.slice(0, vertexCount * 3),
    normals: normals.slice(0, vertexCount * 3),
    colors: colors.slice(0, vertexCount * 3),
    indices: new Uint32Array(indices),
    vertexCount,
    faceCount: indices.length / 6,
  };
}

/**
 * Build LOD mesh (lower detail)
 * @param {Uint8Array} blocks - Full resolution blocks
 * @param {number} lodLevel - 1 = half res, 2 = quarter res
 * @returns {Object} Mesh data
 */
export function buildLODMesh(blocks, lodLevel) {
  const scale = Math.pow(2, lodLevel);
  const lodSize = CHUNK_SIZE / scale;

  // Create downsampled block data
  const lodBlocks = new Uint8Array(lodSize * lodSize * (CHUNK_SIZE_Y / scale));

  for (let y = 0; y < CHUNK_SIZE_Y / scale; y++) {
    for (let z = 0; z < lodSize; z++) {
      for (let x = 0; x < lodSize; x++) {
        // Sample from the original blocks
        const srcX = x * scale;
        const srcY = y * scale;
        const srcZ = z * scale;

        // Get most common non-air block in the region
        const counts = new Map();
        for (let dy = 0; dy < scale; dy++) {
          for (let dz = 0; dz < scale; dz++) {
            for (let dx = 0; dx < scale; dx++) {
              const block = blocks[(srcX + dx) + ((srcZ + dz) << 4) + ((srcY + dy) << 8)];
              if (block !== BlockTypes.AIR) {
                counts.set(block, (counts.get(block) || 0) + 1);
              }
            }
          }
        }

        let dominant = BlockTypes.AIR;
        let maxCount = 0;
        for (const [block, count] of counts) {
          if (count > maxCount) {
            maxCount = count;
            dominant = block;
          }
        }

        lodBlocks[x + z * lodSize + y * lodSize * lodSize] = dominant;
      }
    }
  }

  // Build mesh with scaled voxel size
  // This is a simplified version - in practice we'd want to properly
  // build the mesh accounting for the larger block size
  return buildChunkMesh({
    blocks: lodBlocks,
    neighborNorth: null,
    neighborSouth: null,
    neighborEast: null,
    neighborWest: null,
  });
}

export default buildChunkMesh;
