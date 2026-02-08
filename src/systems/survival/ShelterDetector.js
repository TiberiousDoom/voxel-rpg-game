/**
 * ShelterDetector.js — Detects if the player is inside a sheltered area
 *
 * Uses raycasts in 6 directions to check for enclosure.
 * Full shelter: roof + 4 walls (or underground)
 * Partial shelter: roof + 3 walls
 * Exposed: no roof or < 3 walls
 */

import { isSolid } from '../chunks/blockTypes';
import { VOXEL_SIZE } from '../chunks/coordinates';
import {
  SHELTER_RAY_RANGE_UP,
  SHELTER_RAY_RANGE_HORIZ,
} from '../../data/tuning';

/**
 * Check if there's a solid block along a direction from a position
 * @param {object} chunkManager
 * @param {number} startX - World position X
 * @param {number} startY - World position Y
 * @param {number} startZ - World position Z
 * @param {number} dx - Direction X (0 or ±1)
 * @param {number} dy - Direction Y (0 or ±1)
 * @param {number} dz - Direction Z (0 or ±1)
 * @param {number} maxBlocks - Max number of blocks to check
 * @returns {boolean} true if a solid block was found
 */
function hasSolidInDirection(chunkManager, startX, startY, startZ, dx, dy, dz, maxBlocks) {
  for (let i = 1; i <= maxBlocks; i++) {
    const wx = startX + dx * i * VOXEL_SIZE;
    const wy = startY + dy * i * VOXEL_SIZE;
    const wz = startZ + dz * i * VOXEL_SIZE;
    const blockType = chunkManager.getBlock(wx, wy, wz);
    if (isSolid(blockType)) return true;
  }
  return false;
}

/**
 * Check shelter status at the player's position.
 * @param {number[]} playerPos - [x, y, z] world position
 * @param {object} chunkManager - ChunkManager with getBlock()
 * @returns {{ isFullShelter: boolean, isPartialShelter: boolean, isExposed: boolean, tier: string }}
 */
export function checkShelter(playerPos, chunkManager) {
  if (!chunkManager || !playerPos) {
    return { isFullShelter: false, isPartialShelter: false, isExposed: true, tier: 'exposed' };
  }

  // Convert player world pos to block center
  const px = Math.floor(playerPos[0] / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
  const py = Math.floor(playerPos[1] / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;
  const pz = Math.floor(playerPos[2] / VOXEL_SIZE) * VOXEL_SIZE + VOXEL_SIZE / 2;

  // Check roof (solid block above within range)
  const hasRoof = hasSolidInDirection(chunkManager, px, py, pz, 0, 1, 0, SHELTER_RAY_RANGE_UP);

  // Check floor below (for underground detection)
  const hasFloor = hasSolidInDirection(chunkManager, px, py, pz, 0, -1, 0, 2);

  // Check 4 cardinal walls
  const hasNorth = hasSolidInDirection(chunkManager, px, py, pz, 0, 0, 1, SHELTER_RAY_RANGE_HORIZ);
  const hasSouth = hasSolidInDirection(chunkManager, px, py, pz, 0, 0, -1, SHELTER_RAY_RANGE_HORIZ);
  const hasEast = hasSolidInDirection(chunkManager, px, py, pz, 1, 0, 0, SHELTER_RAY_RANGE_HORIZ);
  const hasWest = hasSolidInDirection(chunkManager, px, py, pz, -1, 0, 0, SHELTER_RAY_RANGE_HORIZ);

  const wallCount = [hasNorth, hasSouth, hasEast, hasWest].filter(Boolean).length;

  // Underground = solid above AND below → full shelter
  if (hasRoof && hasFloor && wallCount >= 2) {
    return { isFullShelter: true, isPartialShelter: false, isExposed: false, tier: 'full' };
  }

  // Full shelter: roof + 4 walls
  if (hasRoof && wallCount >= 4) {
    return { isFullShelter: true, isPartialShelter: false, isExposed: false, tier: 'full' };
  }

  // Partial shelter: roof + 3 walls
  if (hasRoof && wallCount >= 3) {
    return { isFullShelter: false, isPartialShelter: true, isExposed: false, tier: 'partial' };
  }

  // Exposed
  return { isFullShelter: false, isPartialShelter: false, isExposed: true, tier: 'exposed' };
}
