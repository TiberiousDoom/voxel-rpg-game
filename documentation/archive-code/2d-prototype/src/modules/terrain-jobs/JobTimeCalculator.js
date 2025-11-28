/**
 * JobTimeCalculator.js - Calculate terrain job completion times
 *
 * Phase 4: Terrain Job System
 *
 * Calculates how long terrain jobs will take based on:
 * - Terrain type (dirt, stone, water)
 * - Job type (flatten, raise, lower, smooth)
 * - Area size
 *
 * Time requirements (per tile):
 * - Dirt: 1 second
 * - Stone (height > 7): 2 seconds
 * - Water (height ≤ 3): 1.5 seconds
 * - Flatten modifier: 0.8x
 * - Smooth modifier: 0.5x
 */

import { JOB_TYPE } from './TerrainJob';

/**
 * Base time per tile in milliseconds
 */
export const TERRAIN_WORK_TIME = {
  dirt: 1000,      // 1 second per dirt tile
  stone: 2000,     // 2 seconds per stone tile (height > 7)
  water: 1500,     // 1.5 seconds per water tile (height ≤ 3)
  flatten: 0.8,    // Flatten is 80% of base time (easier)
  smooth: 0.5      // Smooth is 50% of base time (just reshaping)
};

/**
 * Terrain type thresholds
 */
const TERRAIN_THRESHOLDS = {
  water: 3,    // Height ≤ 3 is water
  stone: 7     // Height > 7 is stone
};

/**
 * JobTimeCalculator class
 */
export class JobTimeCalculator {
  /**
   * Create a job time calculator
   * @param {TerrainSystem} terrainSystem - Terrain system for height queries
   */
  constructor(terrainSystem) {
    this.terrainSystem = terrainSystem;
  }

  /**
   * Calculate total time for a terrain job
   * @param {TerrainJob} job - Job to calculate time for
   * @returns {number} Estimated time in milliseconds
   */
  calculateJobTime(job) {
    const { area } = job;
    let totalTime = 0;

    // Calculate time for each tile in area
    for (let z = area.z; z < area.z + area.depth; z++) {
      for (let x = area.x; x < area.x + area.width; x++) {
        const tileTime = this.calculateTileTime(x, z, job.type);
        totalTime += tileTime;
      }
    }

    return totalTime;
  }

  /**
   * Calculate time for a single tile
   * @param {number} x - Tile X coordinate
   * @param {number} z - Tile Z coordinate
   * @param {string} jobType - Type of job being performed
   * @returns {number} Time in milliseconds
   */
  calculateTileTime(x, z, jobType) {
    // Get terrain height
    const height = this.terrainSystem.getHeight(x, z);

    // Determine base time based on terrain type
    let baseTime;
    if (height > TERRAIN_THRESHOLDS.stone) {
      baseTime = TERRAIN_WORK_TIME.stone;  // Stone is hardest
    } else if (height <= TERRAIN_THRESHOLDS.water) {
      baseTime = TERRAIN_WORK_TIME.water;  // Water is medium
    } else {
      baseTime = TERRAIN_WORK_TIME.dirt;   // Dirt is easiest
    }

    // Apply job type modifier
    let modifier = 1.0;
    if (jobType === JOB_TYPE.FLATTEN) {
      modifier = TERRAIN_WORK_TIME.flatten;
    } else if (jobType === JOB_TYPE.SMOOTH) {
      modifier = TERRAIN_WORK_TIME.smooth;
    }
    // RAISE and LOWER use full time (1.0x)

    return baseTime * modifier;
  }

  /**
   * Estimate time for a job before creating it
   * Useful for showing estimated time to player
   * @param {string} jobType - Type of job
   * @param {object} area - Job area {x, z, width, depth}
   * @returns {number} Estimated time in milliseconds
   */
  estimateTime(jobType, area) {
    let totalTime = 0;

    for (let z = area.z; z < area.z + area.depth; z++) {
      for (let x = area.x; x < area.x + area.width; x++) {
        const tileTime = this.calculateTileTime(x, z, jobType);
        totalTime += tileTime;
      }
    }

    return totalTime;
  }

  /**
   * Format time in human-readable format
   * @param {number} milliseconds - Time in milliseconds
   * @returns {string} Formatted time string
   */
  static formatTime(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes}m`;
    } else {
      const hours = Math.ceil(seconds / 3600);
      return `${hours}h`;
    }
  }

  /**
   * Get breakdown of time by terrain type
   * Useful for showing detailed estimates
   * @param {object} area - Job area {x, z, width, depth}
   * @returns {object} Time breakdown {dirt, stone, water, total}
   */
  getTimeBreakdown(area) {
    let dirtTiles = 0;
    let stoneTiles = 0;
    let waterTiles = 0;

    for (let z = area.z; z < area.z + area.depth; z++) {
      for (let x = area.x; x < area.x + area.width; x++) {
        const height = this.terrainSystem.getHeight(x, z);

        if (height > TERRAIN_THRESHOLDS.stone) {
          stoneTiles++;
        } else if (height <= TERRAIN_THRESHOLDS.water) {
          waterTiles++;
        } else {
          dirtTiles++;
        }
      }
    }

    return {
      dirtTiles,
      stoneTiles,
      waterTiles,
      dirtTime: dirtTiles * TERRAIN_WORK_TIME.dirt,
      stoneTime: stoneTiles * TERRAIN_WORK_TIME.stone,
      waterTime: waterTiles * TERRAIN_WORK_TIME.water,
      totalTime: (dirtTiles * TERRAIN_WORK_TIME.dirt) +
                 (stoneTiles * TERRAIN_WORK_TIME.stone) +
                 (waterTiles * TERRAIN_WORK_TIME.water)
    };
  }
}
