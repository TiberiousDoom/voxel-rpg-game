/**
 * AchievementTracker.js - Tracks achievement progress
 *
 * Responsible for:
 * - Extracting relevant values from game state
 * - Updating achievement progress
 * - Detecting newly unlocked achievements
 * - Managing achievement history
 */

import { ConditionType } from './Achievement.js';

class AchievementTracker {
  /**
   * Initialize achievement tracker
   */
  constructor() {
    // Track game events that occurred
    this.gameEvents = {
      survivedEvents: new Set(), // Set of event types survived
      totalEventsSurvived: 0,
      npcDeaths: 0,
      starvationDeaths: 0,
      startTime: Date.now(),
      tierReachTimes: {} // tier -> timestamp
    };

    // Track resource totals (lifetime accumulated)
    this.resourceTotals = {
      food: 0,
      wood: 0,
      stone: 0,
      gold: 0,
      essence: 0,
      crystals: 0
    };

    // Track previous values for delta calculation
    this.previousResources = {
      food: 0,
      wood: 0,
      stone: 0,
      gold: 0,
      essence: 0,
      crystals: 0
    };
  }

  /**
   * Extract current value for achievement condition from game state
   * @param {Achievement} achievement - Achievement to check
   * @param {Object} gameState - Current game state
   * @returns {*} - Current value for condition
   */
  extractConditionValue(achievement, gameState) {
    const { type, params } = achievement.condition;

    switch (type) {
      case ConditionType.BUILDING_COUNT:
        return this._getBuildingCount(gameState);

      case ConditionType.BUILDING_TYPE_COUNT:
        return this._getBuildingTypeCount(gameState, params.buildingType);

      case ConditionType.BUILDING_TYPES_UNIQUE:
        return this._getUniqueBuildingTypes(gameState);

      case ConditionType.RESOURCE_TOTAL:
        return this._getResourceTotal(params.resourceType);

      case ConditionType.RESOURCE_CURRENT:
        return this._getResourceCurrent(gameState, params.resourceType);

      case ConditionType.STORAGE_FULL:
        return this._isStorageFull(gameState);

      case ConditionType.NPC_COUNT:
        return this._getNPCCount(gameState);

      case ConditionType.NPC_SPAWNED_TOTAL:
        return this._getNPCSpawnedTotal(gameState);

      case ConditionType.NPC_HAPPINESS_ALL:
        return this._areAllNPCsHappy(gameState, achievement.condition.target);

      case ConditionType.NPC_NO_DEATHS:
        return this._hasNoDeathsByTier(params.tier);

      case ConditionType.NO_STARVATION:
        return this._hasNoStarvationByTier(params.tier);

      case ConditionType.TIER_REACHED:
        return this._getTierReached(gameState);

      case ConditionType.TIER_SPEED:
        return this._getTierReachTime(params.tier);

      case ConditionType.EVENT_SURVIVED:
        return this.gameEvents.totalEventsSurvived;

      case ConditionType.EVENT_ALL_TYPES:
        return Array.from(this.gameEvents.survivedEvents);

      default:
        console.warn(`Unknown condition type for tracking: ${type}`);
        return 0;
    }
  }

  /**
   * Update resource totals based on current game state
   * @param {Object} gameState - Current game state with storage
   */
  updateResourceTotals(gameState) {
    if (!gameState.storage) return;

    const resources = ['food', 'wood', 'stone', 'gold', 'essence', 'crystals'];

    for (const resource of resources) {
      const current = gameState.storage.getResource(resource) || 0;
      const previous = this.previousResources[resource];

      // Add delta to total (only count increases, not decreases)
      if (current > previous) {
        const delta = current - previous;
        this.resourceTotals[resource] += delta;
      }

      this.previousResources[resource] = current;
    }
  }

  /**
   * Record that an event was survived
   * @param {string} eventType - Type of event survived
   */
  recordEventSurvived(eventType) {
    this.gameEvents.survivedEvents.add(eventType);
    this.gameEvents.totalEventsSurvived++;
  }

  /**
   * Record NPC death
   * @param {string} causeOfDeath - How NPC died ('starvation', 'disaster', etc.)
   */
  recordNPCDeath(causeOfDeath) {
    this.gameEvents.npcDeaths++;
    if (causeOfDeath === 'starvation') {
      this.gameEvents.starvationDeaths++;
    }
  }

  /**
   * Record tier reached
   * @param {string} tier - Tier name
   */
  recordTierReached(tier) {
    if (!this.gameEvents.tierReachTimes[tier]) {
      const elapsed = (Date.now() - this.gameEvents.startTime) / 1000; // seconds
      this.gameEvents.tierReachTimes[tier] = elapsed;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  _getBuildingCount(gameState) {
    return gameState.buildings ? gameState.buildings.length : 0;
  }

  _getBuildingTypeCount(gameState, buildingType) {
    if (!gameState.buildings) return 0;
    return gameState.buildings.filter(b => b.type === buildingType).length;
  }

  _getUniqueBuildingTypes(gameState) {
    if (!gameState.buildings) return 0;
    const types = new Set(gameState.buildings.map(b => b.type));
    return types.size;
  }

  _getResourceTotal(resourceType) {
    return this.resourceTotals[resourceType] || 0;
  }

  _getResourceCurrent(gameState, resourceType) {
    if (!gameState.storage) return 0;
    return gameState.storage.getResource(resourceType) || 0;
  }

  _isStorageFull(gameState) {
    if (!gameState.storage) return false;
    const total = gameState.storage.getTotalResources();
    const capacity = gameState.storage.capacity;
    return total >= capacity;
  }

  _getNPCCount(gameState) {
    if (!gameState.npcs) return 0;
    return gameState.npcs.filter(npc => npc.alive).length;
  }

  _getNPCSpawnedTotal(gameState) {
    if (!gameState.npcManager || !gameState.npcManager.stats) return 0;
    return gameState.npcManager.stats.totalSpawned || 0;
  }

  _areAllNPCsHappy(gameState, happinessThreshold) {
    if (!gameState.npcs || gameState.npcs.length === 0) return false;

    const aliveNPCs = gameState.npcs.filter(npc => npc.alive);
    if (aliveNPCs.length === 0) return false;

    return aliveNPCs.every(npc => (npc.happiness || 0) >= happinessThreshold);
  }

  _hasNoDeathsByTier(tier) {
    // Check if tier was reached and no deaths occurred by that time
    const tierReached = this.gameEvents.tierReachTimes[tier] !== undefined;
    return tierReached && this.gameEvents.npcDeaths === 0;
  }

  _hasNoStarvationByTier(tier) {
    // Check if tier was reached and no starvation deaths by that time
    const tierReached = this.gameEvents.tierReachTimes[tier] !== undefined;
    return tierReached && this.gameEvents.starvationDeaths === 0;
  }

  _getTierReached(gameState) {
    if (!gameState.currentTier) return null;
    return gameState.currentTier;
  }

  _getTierReachTime(tier) {
    // Returns time in seconds to reach tier (0 if not reached)
    return this.gameEvents.tierReachTimes[tier] || 0;
  }

  /**
   * Serialize tracker state
   * @returns {Object} - Serialized state
   */
  serialize() {
    return {
      gameEvents: {
        survivedEvents: Array.from(this.gameEvents.survivedEvents),
        totalEventsSurvived: this.gameEvents.totalEventsSurvived,
        npcDeaths: this.gameEvents.npcDeaths,
        starvationDeaths: this.gameEvents.starvationDeaths,
        startTime: this.gameEvents.startTime,
        tierReachTimes: { ...this.gameEvents.tierReachTimes }
      },
      resourceTotals: { ...this.resourceTotals },
      previousResources: { ...this.previousResources }
    };
  }

  /**
   * Deserialize tracker state
   * @param {Object} data - Saved state
   */
  deserialize(data) {
    if (data.gameEvents) {
      this.gameEvents.survivedEvents = new Set(data.gameEvents.survivedEvents || []);
      this.gameEvents.totalEventsSurvived = data.gameEvents.totalEventsSurvived || 0;
      this.gameEvents.npcDeaths = data.gameEvents.npcDeaths || 0;
      this.gameEvents.starvationDeaths = data.gameEvents.starvationDeaths || 0;
      this.gameEvents.startTime = data.gameEvents.startTime || Date.now();
      this.gameEvents.tierReachTimes = data.gameEvents.tierReachTimes || {};
    }

    if (data.resourceTotals) {
      this.resourceTotals = { ...this.resourceTotals, ...data.resourceTotals };
    }

    if (data.previousResources) {
      this.previousResources = { ...this.previousResources, ...data.previousResources };
    }
  }
}

export default AchievementTracker;
