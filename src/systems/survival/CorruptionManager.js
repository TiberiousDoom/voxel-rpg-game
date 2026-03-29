/**
 * CorruptionManager.js — Manages dynamic corruption fade during rift closing.
 *
 * When a rift enters CLOSING state, corruption around it fades from the outer
 * edge inward. Corrupted blocks are replaced with their original types.
 * Dissolving blocks may drop void shards.
 *
 * Corruption fade speed depends on player proximity and NPC defenders.
 */

import { CORRUPTION_REVERSE, isCorrupted } from '../chunks/blockTypes';
import { VOXEL_SIZE } from '../chunks/coordinates';
import {
  CORRUPTION_RADIUS_LIGHT,
  RIFT_VOID_SHARD_DROP_CHANCE,
} from '../../data/tuning';

class CorruptionManager {
  constructor() {
    this._fadeAccum = 0;
    this._fadeInterval = 2; // Process corruption fade every 2 seconds
  }

  /**
   * Tick corruption fade for all closing rifts.
   * Replaces corrupted blocks from the outer edge inward.
   *
   * @param {number} delta - seconds since last call
   * @param {Array} closingRifts - rifts with state === 'CLOSING'
   * @param {Object} chunkManager - for block read/write
   * @param {Object} riftManager - for updating corruptionProgress
   * @param {number[]} playerPos - [x, y, z]
   * @param {number} npcDefenderCount - NPCs near closing rift
   * @returns {{ blocksRestored: number, shardsDropped: number, fullyPurified: string[] }}
   */
  update(delta, closingRifts, chunkManager, riftManager, playerPos, npcDefenderCount = 0) {
    this._fadeAccum += delta;
    if (this._fadeAccum < this._fadeInterval) {
      return { blocksRestored: 0, shardsDropped: 0, fullyPurified: [] };
    }
    this._fadeAccum = 0;

    if (!chunkManager || !closingRifts || closingRifts.length === 0) {
      return { blocksRestored: 0, shardsDropped: 0, fullyPurified: [] };
    }

    let totalRestored = 0;
    let totalShards = 0;
    const fullyPurified = [];

    for (const rift of closingRifts) {
      // Tick the fade progress on the rift
      const progress = riftManager.tickCorruptionFade(
        rift, this._fadeInterval, playerPos, npcDefenderCount
      );

      // Determine current corruption radius based on progress
      // progress 1.0 = full radius, 0.0 = no corruption
      const maxRadius = CORRUPTION_RADIUS_LIGHT * VOXEL_SIZE;
      const currentRadius = maxRadius * progress;

      // Find and restore corrupted blocks between currentRadius and maxRadius
      // (the outer ring that should now be clean)
      const result = this._restoreBlocksInRing(
        chunkManager, rift.x, rift.z, currentRadius, maxRadius
      );

      totalRestored += result.restored;
      totalShards += result.shards;

      // Check if fully purified
      if (progress <= 0) {
        fullyPurified.push(rift.id);
      }
    }

    return {
      blocksRestored: totalRestored,
      shardsDropped: totalShards,
      fullyPurified,
    };
  }

  /**
   * Restore corrupted blocks in a ring between innerRadius and outerRadius
   * around a rift center position.
   *
   * @param {Object} chunkManager
   * @param {number} cx - Rift center world X
   * @param {number} cz - Rift center world Z
   * @param {number} innerRadius - Current corruption edge (blocks inside stay corrupted)
   * @param {number} outerRadius - Original corruption extent
   * @returns {{ restored: number, shards: number }}
   */
  _restoreBlocksInRing(chunkManager, cx, cz, innerRadius, outerRadius) {
    let restored = 0;
    let shards = 0;

    // Scan range in block coordinates, snapped to voxel grid
    const scanBlocks = Math.ceil(outerRadius / VOXEL_SIZE);

    for (let bx = -scanBlocks; bx <= scanBlocks; bx++) {
      for (let bz = -scanBlocks; bz <= scanBlocks; bz++) {
        // World position at voxel grid center (matches corruption generation)
        const wx = Math.floor(cx / VOXEL_SIZE) * VOXEL_SIZE + bx * VOXEL_SIZE;
        const wz = Math.floor(cz / VOXEL_SIZE) * VOXEL_SIZE + bz * VOXEL_SIZE;

        // Distance from rift center in world units
        const ddx = wx - cx;
        const ddz = wz - cz;
        const dist = Math.sqrt(ddx * ddx + ddz * ddz);

        // Restore any corrupted block outside the current corruption edge
        if (dist < innerRadius || dist > outerRadius) continue;

        // Scan the Y column for corrupted blocks
        for (let vy = 0; vy < 32; vy++) {
          const wy = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
          const block = chunkManager.getBlock(wx, wy, wz);

          if (isCorrupted(block)) {
            const originalBlock = CORRUPTION_REVERSE[block];
            if (originalBlock != null) {
              chunkManager.setBlock(wx, wy, wz, originalBlock);
              restored++;

              // Void shard drop chance
              if (Math.random() < RIFT_VOID_SHARD_DROP_CHANCE) {
                shards++;
              }
            }
          }
        }
      }
    }

    return { restored, shards };
  }

  /**
   * Get corruption level near a position (0-100 scale).
   * Counts corrupted blocks in a radius for attractiveness scoring.
   *
   * @param {Object} chunkManager
   * @param {number} x - World X
   * @param {number} z - World Z
   * @param {number} radius - Search radius in world units
   * @returns {number} Corruption level 0-100
   */
  getCorruptionLevel(chunkManager, x, z, radius) {
    if (!chunkManager) return 0;

    let corruptedCount = 0;
    let totalChecked = 0;
    const step = VOXEL_SIZE * 4; // Coarse sampling for performance
    const surfaceY = 10 * VOXEL_SIZE + VOXEL_SIZE / 2; // Check near surface

    for (let dx = -radius; dx <= radius; dx += step) {
      for (let dz = -radius; dz <= radius; dz += step) {
        if (dx * dx + dz * dz > radius * radius) continue;
        totalChecked++;
        const block = chunkManager.getBlock(x + dx, surfaceY, z + dz);
        if (isCorrupted(block)) {
          corruptedCount++;
        }
      }
    }

    if (totalChecked === 0) return 0;
    return Math.round((corruptedCount / totalChecked) * 100);
  }
}

export default CorruptionManager;
