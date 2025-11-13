/**
 * NPCNeedsTracker.js - Tracks needs for all NPCs
 *
 * Handles:
 * - Need registration for NPCs
 * - Need updates (decay over time)
 * - Need satisfaction detection
 * - Happiness impact calculation
 * - Critical need alerts
 */

import { NPCNeed, NeedType } from './NPCNeed.js';

class NPCNeedsTracker {
  /**
   * Initialize needs tracker
   */
  constructor() {
    // NPC needs storage: Map<npcId, Map<needType, NPCNeed>>
    this.npcNeeds = new Map();

    // Critical need alerts
    this.criticalAlerts = new Map(); // npcId -> [needTypes]

    // Configuration
    this.config = {
      updateInterval: 1000, // Update needs every second
      happinessUpdateInterval: 60000, // Update happiness every minute
      alertCooldown: 30000 // 30 seconds between alerts for same NPC
    };

    // Timing
    this.lastUpdateTime = Date.now();
    this.lastHappinessUpdate = Date.now();

    // Statistics
    this.stats = {
      totalNPCsTracked: 0,
      totalNeedsUpdated: 0,
      totalCriticalEvents: 0,
      needDistribution: {}
    };
  }

  /**
   * Register an NPC in the needs tracker
   * @param {string} npcId - NPC ID
   * @param {Object} initialValues - Initial need values
   */
  registerNPC(npcId, initialValues = {}) {
    if (this.npcNeeds.has(npcId)) {
      return false;
    }

    const needs = new Map();

    // Create all 4 need types
    needs.set(NeedType.FOOD, new NPCNeed(NeedType.FOOD, initialValues.food || 100));
    needs.set(NeedType.REST, new NPCNeed(NeedType.REST, initialValues.rest || 100));
    needs.set(NeedType.SOCIAL, new NPCNeed(NeedType.SOCIAL, initialValues.social || 50));
    needs.set(NeedType.SHELTER, new NPCNeed(NeedType.SHELTER, initialValues.shelter || 100));

    this.npcNeeds.set(npcId, needs);
    this.stats.totalNPCsTracked++;

    return true;
  }

  /**
   * Unregister an NPC from needs tracking
   * @param {string} npcId - NPC ID
   */
  unregisterNPC(npcId) {
    const removed = this.npcNeeds.delete(npcId);
    if (removed) {
      this.criticalAlerts.delete(npcId);
    }
    return removed;
  }

  /**
   * Update all NPC needs
   * @param {number} deltaTime - Time elapsed in milliseconds
   * @param {Object} npcStates - Map<npcId, npcState>
   */
  updateAllNeeds(deltaTime, npcStates = {}) {
    const currentTime = Date.now();

    for (const [npcId, needs] of this.npcNeeds.entries()) {
      const npcState = npcStates[npcId] || {};
      this._updateNPCNeeds(npcId, needs, deltaTime, npcState);
    }

    this.lastUpdateTime = currentTime;
    this.stats.totalNeedsUpdated += this.npcNeeds.size * 4;
  }

  /**
   * Update needs for a single NPC
   * @param {string} npcId - NPC ID
   * @param {Map} needs - NPC needs map
   * @param {number} deltaTime - Time elapsed
   * @param {Object} state - NPC state
   */
  _updateNPCNeeds(npcId, needs, deltaTime, state) {
    const criticalNeeds = [];

    for (const [needType, need] of needs.entries()) {
      // Update need value
      need.update(deltaTime, state);

      // Check for critical needs
      if (need.isCritical()) {
        criticalNeeds.push(needType);
        this.stats.totalCriticalEvents++;
      }

      // Update need distribution stats
      const level = need.getLevel();
      if (!this.stats.needDistribution[needType]) {
        this.stats.needDistribution[needType] = {};
      }
      if (!this.stats.needDistribution[needType][level]) {
        this.stats.needDistribution[needType][level] = 0;
      }
      this.stats.needDistribution[needType][level]++;
    }

    // Update critical alerts
    if (criticalNeeds.length > 0) {
      this.criticalAlerts.set(npcId, criticalNeeds);
    } else {
      this.criticalAlerts.delete(npcId);
    }
  }

  /**
   * Get needs for an NPC
   * @param {string} npcId - NPC ID
   * @returns {Map<string, NPCNeed>|null} Needs map or null
   */
  getNeeds(npcId) {
    return this.npcNeeds.get(npcId) || null;
  }

  /**
   * Get specific need for an NPC
   * @param {string} npcId - NPC ID
   * @param {string} needType - Need type
   * @returns {NPCNeed|null} Need or null
   */
  getNeed(npcId, needType) {
    const needs = this.npcNeeds.get(npcId);
    return needs ? needs.get(needType) : null;
  }

  /**
   * Satisfy a specific need
   * @param {string} npcId - NPC ID
   * @param {string} needType - Need type
   * @param {number} amount - Amount to satisfy
   * @returns {boolean} True if need was satisfied
   */
  satisfyNeed(npcId, needType, amount) {
    const need = this.getNeed(npcId, needType);
    if (!need) {
      return false;
    }

    need.satisfy(amount);
    return true;
  }

  /**
   * Get lowest need for an NPC
   * @param {string} npcId - NPC ID
   * @returns {Object|null} {type, need, value} or null
   */
  getLowestNeed(npcId) {
    const needs = this.npcNeeds.get(npcId);
    if (!needs) {
      return null;
    }

    let lowestNeed = null;
    let lowestValue = 100;

    for (const [needType, need] of needs.entries()) {
      if (need.value < lowestValue) {
        lowestValue = need.value;
        lowestNeed = { type: needType, need, value: need.value };
      }
    }

    return lowestNeed;
  }

  /**
   * Get critical needs for an NPC
   * @param {string} npcId - NPC ID
   * @returns {Array<string>} Array of critical need types
   */
  getCriticalNeeds(npcId) {
    return this.criticalAlerts.get(npcId) || [];
  }

  /**
   * Check if NPC has any critical needs
   * @param {string} npcId - NPC ID
   * @returns {boolean} True if has critical needs
   */
  hasCriticalNeeds(npcId) {
    return this.criticalAlerts.has(npcId);
  }

  /**
   * Calculate happiness impact from all needs
   * @param {string} npcId - NPC ID
   * @returns {number} Happiness modifier per hour
   */
  calculateHappinessImpact(npcId) {
    const needs = this.npcNeeds.get(npcId);
    if (!needs) {
      return 0;
    }

    let totalImpact = 0;
    let allNeedsSatisfied = true;

    for (const need of needs.values()) {
      totalImpact += need.getHappinessImpact();

      if (!need.isSatisfied()) {
        allNeedsSatisfied = false;
      }
    }

    // Bonus if all needs are satisfied (above 60)
    if (allNeedsSatisfied && needs.size === 4) {
      totalImpact += 5; // +5 bonus happiness/hour
    }

    return totalImpact;
  }

  /**
   * Get needs summary for an NPC
   * @param {string} npcId - NPC ID
   * @returns {Object|null} Needs summary or null
   */
  getNeedsSummary(npcId) {
    const needs = this.npcNeeds.get(npcId);
    if (!needs) {
      return null;
    }

    const summary = {
      npcId,
      needs: {},
      criticalNeeds: this.getCriticalNeeds(npcId),
      lowestNeed: this.getLowestNeed(npcId),
      happinessImpact: this.calculateHappinessImpact(npcId),
      allSatisfied: true
    };

    for (const [needType, need] of needs.entries()) {
      summary.needs[needType] = need.getSummary();
      if (!need.isSatisfied()) {
        summary.allSatisfied = false;
      }
    }

    return summary;
  }

  /**
   * Get all NPCs with critical needs
   * @returns {Array<string>} Array of NPC IDs
   */
  getAllCriticalNPCs() {
    return Array.from(this.criticalAlerts.keys());
  }

  /**
   * Get statistics
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      totalNPCsTracked: this.npcNeeds.size,
      totalNeedsUpdated: this.stats.totalNeedsUpdated,
      totalCriticalEvents: this.stats.totalCriticalEvents,
      npcWithCriticalNeeds: this.criticalAlerts.size,
      needDistribution: { ...this.stats.needDistribution }
    };
  }

  /**
   * Reset all needs for an NPC
   * @param {string} npcId - NPC ID
   * @param {Object} values - Values to reset to
   */
  resetNPCNeeds(npcId, values = {}) {
    const needs = this.npcNeeds.get(npcId);
    if (!needs) {
      return false;
    }

    for (const [needType, need] of needs.entries()) {
      const value = values[needType] || 50;
      need.reset(value);
    }

    this.criticalAlerts.delete(npcId);
    return true;
  }

  /**
   * Clear all needs tracking
   */
  clearAll() {
    this.npcNeeds.clear();
    this.criticalAlerts.clear();
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalNPCsTracked: this.npcNeeds.size,
      totalNeedsUpdated: 0,
      totalCriticalEvents: 0,
      needDistribution: {}
    };
  }
}

export default NPCNeedsTracker;
