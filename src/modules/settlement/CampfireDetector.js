/**
 * CampfireDetector.js — Chunk-scanning utilities for settlement detection.
 *
 * Extracted from SettlementTick.jsx. No store access.
 */

import { BlockTypes, isSolid } from '../../systems/chunks/blockTypes';
import { CHUNK_SIZE, CHUNK_SIZE_Y, VOXEL_SIZE } from '../../systems/chunks/coordinates';

/**
 * Scan loaded chunks for a CAMPFIRE block.
 *
 * @param {Object} chunkAdapter - { iterateChunks() → Iterable<{ x, z, blocks }> }
 * @returns {[number,number,number]|null} World position [x,y,z] or null
 */
export function scanForCampfire(chunkAdapter) {
  for (const chunk of chunkAdapter.iterateChunks()) {
    if (!chunk.blocks) continue;
    for (let y = 0; y < CHUNK_SIZE_Y; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          if (chunk.blocks[x + (z << 4) + (y << 8)] === BlockTypes.CAMPFIRE) {
            const wx = (chunk.x * CHUNK_SIZE + x) * VOXEL_SIZE + VOXEL_SIZE / 2;
            const wy = y * VOXEL_SIZE + VOXEL_SIZE / 2;
            const wz = (chunk.z * CHUNK_SIZE + z) * VOXEL_SIZE + VOXEL_SIZE / 2;
            return [wx, wy, wz];
          }
        }
      }
    }
  }
  return null;
}

/**
 * Find ground level at a world position by scanning from top down.
 *
 * @param {Object} chunkAdapter - { getBlock(wx, wy, wz) → blockId }
 * @param {number} wx - World X coordinate
 * @param {number} wz - World Z coordinate
 * @returns {number} Y coordinate of terrain surface (top of highest solid block)
 */
export function getTerrainYAt(chunkAdapter, wx, wz) {
  for (let vy = CHUNK_SIZE_Y - 1; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkAdapter.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      return (vy + 1) * VOXEL_SIZE;
    }
  }
  return 2; // fallback
}
