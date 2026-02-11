/**
 * AttractivenessCalculator — Scores how appealing the settlement is to immigrants.
 *
 * Scans loaded chunks near settlement center for campfires, structural blocks, etc.
 */

import { BlockTypes } from '../chunks/blockTypes';
import { CHUNK_SIZE, CHUNK_SIZE_Y, VOXEL_SIZE, worldToChunk } from '../chunks/coordinates';
import {
  ATTRACT_CAMPFIRE_SCORE,
  ATTRACT_WALL_SCORE,
  ATTRACT_WALL_CAP,
  ATTRACT_FOOD_SCORE,
  ATTRACT_FOOD_CAP,
  ATTRACT_RIFT_PENALTY,
  ATTRACT_SCAN_RADIUS,
} from '../../data/tuning';

// Block types that count as player-placed structural blocks
const STRUCTURAL_BLOCKS = new Set([
  BlockTypes.STONE,
  BlockTypes.DIRT,
  BlockTypes.WOOD,
  BlockTypes.SAND,
  BlockTypes.GRAVEL,
  BlockTypes.CLAY,
]);

// Food materials in inventory
const FOOD_MATERIALS = ['berry', 'meat'];

/**
 * Calculate settlement attractiveness score.
 * @param {number[]} center - [x, y, z] world position of settlement center
 * @param {Object} chunkManager - ChunkManager instance
 * @param {Object} gameState - Current zustand state snapshot
 * @returns {number} Attractiveness score (>= 0)
 */
export function calculateAttractiveness(center, chunkManager, gameState) {
  if (!center || !chunkManager) return 0;

  const [cx, , cz] = center;
  let campfireScore = 0;
  let wallCount = 0;

  // Convert scan radius from world units to chunk radius
  const scanChunkRadius = Math.ceil(ATTRACT_SCAN_RADIUS / (CHUNK_SIZE * VOXEL_SIZE));
  const { chunkX: centerCX, chunkZ: centerCZ } = worldToChunk(cx, cz);

  // Iterate loaded chunks within scan radius
  for (const [, chunk] of chunkManager.chunks) {
    // Check if chunk is within scan radius
    const dcx = chunk.x - centerCX;
    const dcz = chunk.z - centerCZ;
    if (Math.abs(dcx) > scanChunkRadius || Math.abs(dcz) > scanChunkRadius) continue;

    if (!chunk.blocks) continue;

    // Scan all blocks in chunk
    for (let y = 0; y < CHUNK_SIZE_Y; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const blockType = chunk.blocks[x + (z << 4) + (y << 8)];

          if (blockType === BlockTypes.CAMPFIRE) {
            campfireScore += ATTRACT_CAMPFIRE_SCORE;
          } else if (STRUCTURAL_BLOCKS.has(blockType) && chunk.lastModified > 0) {
            // Only count structural blocks in modified chunks (likely player-placed)
            wallCount++;
          }
        }
      }
    }
  }

  // Cap wall score
  const wallScore = Math.min(wallCount, ATTRACT_WALL_CAP) * ATTRACT_WALL_SCORE;

  // Food bonus from inventory
  let foodCount = 0;
  if (gameState.inventory?.materials) {
    for (const mat of FOOD_MATERIALS) {
      foodCount += gameState.inventory.materials[mat] || 0;
    }
  }
  const foodScore = Math.min(foodCount, ATTRACT_FOOD_CAP) * ATTRACT_FOOD_SCORE;

  // Rift penalty
  let riftPenalty = 0;
  if (gameState.rifts) {
    for (const rift of gameState.rifts) {
      const dx = rift.x - cx;
      const dz = rift.z - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= ATTRACT_SCAN_RADIUS) {
        riftPenalty += ATTRACT_RIFT_PENALTY;
      }
    }
  }

  return Math.max(0, campfireScore + wallScore + foodScore + riftPenalty);
}
