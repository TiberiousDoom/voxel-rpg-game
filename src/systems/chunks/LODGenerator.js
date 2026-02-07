/**
 * LODGenerator - Generate lower detail versions of chunks for distant rendering
 *
 * LOD 0: Full detail (16³ blocks)
 * LOD 1: 2x2x2 merged (8³ blocks) - 1/8 detail
 * LOD 2: 4x4x4 merged (4³ blocks) - 1/64 detail
 */

import { CHUNK_SIZE, CHUNK_SIZE_Y } from './coordinates.js';
import { BlockTypes } from './blockTypes.js';

/**
 * Merge factor for each LOD level
 * LOD 1 = 2³ blocks merged, LOD 2 = 4³ blocks merged
 */
export const LOD_MERGE_FACTORS = [1, 2, 4];

/**
 * Get block count at each LOD level
 */
export const LOD_SIZES = [
  CHUNK_SIZE, // LOD 0: 16
  CHUNK_SIZE / 2, // LOD 1: 8
  CHUNK_SIZE / 4, // LOD 2: 4
];

/**
 * Distance thresholds (in chunks) for LOD selection
 * Use Chebyshev distance (max of |dx|, |dz|)
 */
export const LOD_DISTANCES = [
  4,  // LOD 0: 0-4 chunks
  8,  // LOD 1: 5-8 chunks
  16, // LOD 2: 9+ chunks
];

/**
 * Pick dominant block type from a group of blocks
 * Uses frequency counting to find most common non-air block
 *
 * @param {Uint8Array} blocks - Source block data
 * @param {number} startX - Starting X in chunk
 * @param {number} startY - Starting Y in chunk
 * @param {number} startZ - Starting Z in chunk
 * @param {number} size - Size of merge region (2 or 4)
 * @returns {number} Dominant block type
 */
export function getDominantBlock(blocks, startX, startY, startZ, size) {
  const counts = new Map();
  let maxCount = 0;
  let dominant = BlockTypes.AIR;
  let hasNonAir = false;

  for (let dx = 0; dx < size && startX + dx < CHUNK_SIZE; dx++) {
    for (let dy = 0; dy < size && startY + dy < CHUNK_SIZE_Y; dy++) {
      for (let dz = 0; dz < size && startZ + dz < CHUNK_SIZE; dz++) {
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

/**
 * Generate LOD blocks from full-detail blocks
 *
 * @param {Uint8Array} sourceBlocks - Full detail block data (16³)
 * @param {number} lodLevel - LOD level (1 or 2)
 * @returns {Uint8Array} Lower detail block data
 */
export function generateLODBlocks(sourceBlocks, lodLevel) {
  const mergeFactor = LOD_MERGE_FACTORS[lodLevel];
  const lodSize = LOD_SIZES[lodLevel];
  const lodSizeY = Math.ceil(CHUNK_SIZE_Y / mergeFactor);

  const lodBlocks = new Uint8Array(lodSize * lodSize * lodSizeY);

  for (let y = 0; y < lodSizeY; y++) {
    for (let z = 0; z < lodSize; z++) {
      for (let x = 0; x < lodSize; x++) {
        const sourceX = x * mergeFactor;
        const sourceY = y * mergeFactor;
        const sourceZ = z * mergeFactor;

        const dominant = getDominantBlock(
          sourceBlocks,
          sourceX,
          sourceY,
          sourceZ,
          mergeFactor
        );

        const lodIndex = x + (z * lodSize) + (y * lodSize * lodSize);
        lodBlocks[lodIndex] = dominant;
      }
    }
  }

  return lodBlocks;
}

/**
 * Select appropriate LOD level based on distance
 *
 * @param {number} dx - X distance in chunks
 * @param {number} dz - Z distance in chunks
 * @returns {number} LOD level (0, 1, or 2)
 */
export function selectLODLevel(dx, dz) {
  const dist = Math.max(Math.abs(dx), Math.abs(dz)); // Chebyshev distance

  if (dist <= LOD_DISTANCES[0]) return 0;
  if (dist <= LOD_DISTANCES[1]) return 1;
  return 2;
}

/**
 * Calculate voxel size multiplier for LOD level
 *
 * @param {number} lodLevel - LOD level
 * @returns {number} Voxel size multiplier
 */
export function getLODVoxelScale(lodLevel) {
  return LOD_MERGE_FACTORS[lodLevel];
}

const LODGenerator = {
  LOD_MERGE_FACTORS,
  LOD_SIZES,
  LOD_DISTANCES,
  getDominantBlock,
  generateLODBlocks,
  selectLODLevel,
  getLODVoxelScale,
};

export default LODGenerator;
