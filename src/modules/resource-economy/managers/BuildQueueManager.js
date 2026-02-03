/**
 * Build Queue Manager - Module 3: Resource Economy
 *
 * Manages the construction queue for buildings.
 * Tracks which buildings are being constructed, their progress, and timing.
 *
 * Responsibilities:
 * - Maintain a queue of buildings under construction
 * - Update build progress based on elapsed time
 * - Transition buildings from BUILDING to COMPLETE status
 * - Query construction status and remaining time
 *
 * Relationship with Foundation:
 * - Queries Foundation to get building information
 * - Updates building progress in Foundation
 * - Does NOT place buildings (Foundation does that)
 * - Does NOT define building costs (config.js does that)
 *
 * Relationship with Module 3:
 * - Part of the Resource Economy module
 * - Uses building costs from config.js via buildingRegistry
 * - Stores queue state in ResourceEconomyStore
 */

import { getBuildTime } from '../../foundation/utils/buildingRegistry';
import { BUILDING_STATUS } from '../../../shared/config';

/**
 * Build Queue Manager - Singleton class for managing building construction
 */
export class BuildQueueManager {
  constructor() {
    this.queue = new Map(); // buildingId -> { buildingId, type, startTime, buildTime, progress }
  }

  /**
   * Add a building to the construction queue.
   * Called when a building transitions from BLUEPRINT to BUILDING.
   *
   * @param {Object} building - Building object from Foundation
   * @returns {boolean} True if successfully added to queue
   */
  addToQueue(building) {
    if (!building || !building.id) {
      console.warn('[BuildQueueManager] Invalid building object');
      return false;
    }

    const buildTime = getBuildTime(building.type);
    if (buildTime <= 0) {
      console.warn(`[BuildQueueManager] Building type ${building.type} has invalid build time`);
      return false;
    }

    const queueEntry = {
      buildingId: building.id,
      type: building.type,
      startTime: Date.now(),
      buildTime: buildTime * 1000, // Convert seconds to milliseconds
      progress: 0,
    };

    this.queue.set(building.id, queueEntry);
    return true;
  }

  /**
   * Remove a building from the construction queue.
   * Called when a building is removed, destroyed, or completes.
   *
   * @param {string} buildingId - The building to remove from queue
   * @returns {boolean} True if building was in queue
   */
  removeFromQueue(buildingId) {
    return this.queue.delete(buildingId);
  }

  /**
   * Update construction progress for all buildings in the queue.
   * Call this regularly (e.g., every frame) to advance construction.
   *
   * @returns {Array} Array of building IDs that completed construction
   */
  updateProgress() {
    const completedBuildings = [];
    const currentTime = Date.now();

    for (const [buildingId, entry] of this.queue.entries()) {
      const elapsedTime = currentTime - entry.startTime;
      const progress = Math.min(100, (elapsedTime / entry.buildTime) * 100);

      entry.progress = progress;

      // If building is complete, mark it for completion
      if (progress >= 100) {
        completedBuildings.push(buildingId);
        this.removeFromQueue(buildingId);
      }
    }

    return completedBuildings;
  }

  /**
   * Get the current progress of a building under construction.
   *
   * @param {string} buildingId - The building to query
   * @returns {Object|null} { buildingId, progress (0-100), timeRemaining (ms) } or null if not in queue
   */
  getProgress(buildingId) {
    const entry = this.queue.get(buildingId);
    if (!entry) return null;

    const currentTime = Date.now();
    const elapsedTime = currentTime - entry.startTime;
    const timeRemaining = Math.max(0, entry.buildTime - elapsedTime);

    return {
      buildingId,
      progress: entry.progress,
      timeRemaining,
      totalTime: entry.buildTime,
      percentComplete: (entry.progress / 100) * 100,
    };
  }

  /**
   * Get all buildings currently in the construction queue.
   *
   * @returns {Array} Array of queue entries
   */
  getAllInQueue() {
    return Array.from(this.queue.values());
  }

  /**
   * Check if a specific building is in the construction queue.
   *
   * @param {string} buildingId - The building to check
   * @returns {boolean} True if building is under construction
   */
  isInQueue(buildingId) {
    return this.queue.has(buildingId);
  }

  /**
   * Get the number of buildings currently under construction.
   *
   * @returns {number} Queue size
   */
  getQueueSize() {
    return this.queue.size;
  }

  /**
   * Clear the entire queue.
   * Use with caution - typically only called on game reset.
   */
  clear() {
    this.queue.clear();
  }

  /**
   * Get the total time remaining for all buildings in queue (in milliseconds).
   *
   * @returns {number} Sum of all remaining construction times
   */
  getTotalTimeRemaining() {
    let total = 0;
    const currentTime = Date.now();

    for (const entry of this.queue.values()) {
      const elapsedTime = currentTime - entry.startTime;
      const timeRemaining = Math.max(0, entry.buildTime - elapsedTime);
      total += timeRemaining;
    }

    return total;
  }
}

// Create singleton instance
export const buildQueueManager = new BuildQueueManager();
