/**
 * MiningZoneScanner - Scans solid blocks within zone bounds and returns a task list.
 *
 * Pure function: iterates XZ within bounds (step by VOXEL_SIZE), top-down per column.
 * Skips AIR, WATER, CAMPFIRE, BERRY_BUSH, BEDROCK.
 * Returns array of { wx, wy, wz, blockType, status: 'pending' }.
 */

import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../chunks/coordinates';
import { BlockTypes, isSolid } from '../chunks/blockTypes';

const SKIP_BLOCKS = new Set([
  BlockTypes.AIR,
  BlockTypes.WATER,
  BlockTypes.CAMPFIRE,
  BlockTypes.BERRY_BUSH,
  BlockTypes.BEDROCK,
]);

/**
 * Scan a zone's bounds for mineable blocks.
 * @param {{ minX: number, minZ: number, maxX: number, maxZ: number }} bounds
 * @param {Object} chunkManager
 * @returns {Array<{ wx: number, wy: number, wz: number, blockType: number, status: string }>}
 */
export function scanMiningZone(bounds, chunkManager) {
  if (!chunkManager) return [];

  const tasks = [];
  const maxVoxelY = CHUNK_SIZE_Y - 1;

  for (let wx = bounds.minX + VOXEL_SIZE / 2; wx < bounds.maxX; wx += VOXEL_SIZE) {
    for (let wz = bounds.minZ + VOXEL_SIZE / 2; wz < bounds.maxZ; wz += VOXEL_SIZE) {
      // Scan top-down to find blocks
      for (let vy = maxVoxelY; vy >= 0; vy--) {
        const wy = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
        const blockType = chunkManager.getBlock(wx, wy, wz);

        if (blockType === BlockTypes.AIR) continue;
        if (SKIP_BLOCKS.has(blockType)) break; // Hit water/campfire/etc, stop column
        if (!isSolid(blockType)) continue;

        tasks.push({ wx, wy, wz, blockType, status: 'pending' });
        break; // Only top-most solid block per column
      }
    }
  }

  return tasks;
}
