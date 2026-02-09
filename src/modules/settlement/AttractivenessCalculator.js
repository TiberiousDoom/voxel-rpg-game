/**
 * AttractivenessCalculator.js - Settlement attractiveness score for immigration
 *
 * Calculates how appealing the player's settlement is to potential NPC settlers.
 * Score is recalculated each game tick and drives ImmigrationManager decisions.
 *
 * Score components:
 *   +20    campfire/hearth (base attractor)
 *   +5/15/30  per building (Survival/Permanent/Town tier)
 *   +10    per unoccupied housing slot
 *   +0.5   per food unit in stockpile
 *   +10/20 per wall/watchtower
 *   -15    per active rift within 128 blocks
 *   ×0.5–1.5  happiness multiplier
 */

import {
  ATTRACTIVENESS_CAMPFIRE_BONUS,
  ATTRACTIVENESS_PER_SURVIVAL_BUILDING,
  ATTRACTIVENESS_PER_PERMANENT_BUILDING,
  ATTRACTIVENESS_PER_TOWN_BUILDING,
  ATTRACTIVENESS_PER_HOUSING_SLOT,
  ATTRACTIVENESS_PER_FOOD_UNIT,
  ATTRACTIVENESS_PER_WALL,
  ATTRACTIVENESS_PER_WATCHTOWER,
  ATTRACTIVENESS_RIFT_PENALTY,
  ATTRACTIVENESS_HAPPINESS_MIN_MULT,
  ATTRACTIVENESS_HAPPINESS_MAX_MULT,
  ATTRACTIVENESS_RECALC_INTERVAL,
} from '../../data/tuning.js';

class AttractivenessCalculator {
  /**
   * @param {Object} deps
   * @param {Object} deps.storage - StorageManager
   * @param {Object} deps.townManager - TownManager
   * @param {Object} deps.grid - GridManager
   * @param {Object} deps.buildingConfig - BuildingConfig
   * @param {Object} deps.territoryManager - TerritoryManager
   * @param {Object} deps.npcManager - NPCManager
   */
  constructor(deps = {}) {
    this.storage = deps.storage || null;
    this.townManager = deps.townManager || null;
    this.grid = deps.grid || null;
    this.buildingConfig = deps.buildingConfig || null;
    this.territoryManager = deps.territoryManager || null;
    this.npcManager = deps.npcManager || null;

    this._score = 0;
    this._breakdown = {};
    this._lastRecalcTime = 0;
  }

  /**
   * Recalculate the attractiveness score.
   * Called every tick but only fully recalculates every ATTRACTIVENESS_RECALC_INTERVAL seconds.
   *
   * @param {Object} gameState - Current game state from orchestrator
   */
  recalculate(gameState) {
    // Full recalculation (always recalculate for now — interval optimization can come later)
    const breakdown = {
      campfire: 0,
      buildings: 0,
      housing: 0,
      food: 0,
      defense: 0,
      rifts: 0,
      happinessMultiplier: 1.0,
    };

    const buildings = (gameState && gameState.buildings) || [];

    // ── Campfire bonus ──────────────────────────────────────
    const hasCampfire = buildings.some(b =>
      b.type === 'CAMPFIRE' && b.status === 'COMPLETE'
    );
    if (hasCampfire) {
      breakdown.campfire = ATTRACTIVENESS_CAMPFIRE_BONUS;
    }

    // ── Building tier bonuses ───────────────────────────────
    for (const building of buildings) {
      if (building.status !== 'COMPLETE') continue;

      const tier = this._getBuildingTier(building);
      if (tier === 'TOWN' || tier === 'CASTLE') {
        breakdown.buildings += ATTRACTIVENESS_PER_TOWN_BUILDING;
      } else if (tier === 'PERMANENT') {
        breakdown.buildings += ATTRACTIVENESS_PER_PERMANENT_BUILDING;
      } else {
        breakdown.buildings += ATTRACTIVENESS_PER_SURVIVAL_BUILDING;
      }

      // Defense bonuses
      if (building.type === 'WALL') {
        breakdown.defense += ATTRACTIVENESS_PER_WALL;
      } else if (building.type === 'WATCHTOWER') {
        breakdown.defense += ATTRACTIVENESS_PER_WATCHTOWER;
      }
    }

    // ── Housing capacity bonus ──────────────────────────────
    const housingCapacity = this._getHousingCapacity(buildings);
    const populationCount = this._getPopulationCount();
    const availableSlots = Math.max(0, housingCapacity - populationCount);
    breakdown.housing = availableSlots * ATTRACTIVENESS_PER_HOUSING_SLOT;

    // ── Food stockpile bonus ────────────────────────────────
    const foodAmount = this.storage ? this.storage.getResource('food') : 0;
    breakdown.food = foodAmount * ATTRACTIVENESS_PER_FOOD_UNIT;

    // ── Rift penalty ────────────────────────────────────────
    // Count active rifts near settlement (within 128 blocks)
    const riftCount = this._countNearbyRifts(gameState);
    breakdown.rifts = riftCount * ATTRACTIVENESS_RIFT_PENALTY;

    // ── Happiness multiplier ────────────────────────────────
    const avgHappiness = this._getAverageHappiness();
    // Scale from HAPPINESS_MIN_MULT (at 0%) to HAPPINESS_MAX_MULT (at 100%)
    const happinessRatio = avgHappiness / 100;
    breakdown.happinessMultiplier = ATTRACTIVENESS_HAPPINESS_MIN_MULT +
      (ATTRACTIVENESS_HAPPINESS_MAX_MULT - ATTRACTIVENESS_HAPPINESS_MIN_MULT) * happinessRatio;

    // ── Calculate total ─────────────────────────────────────
    const baseScore = breakdown.campfire + breakdown.buildings + breakdown.housing +
      breakdown.food + breakdown.defense + breakdown.rifts;
    this._score = Math.max(0, baseScore * breakdown.happinessMultiplier);
    this._breakdown = breakdown;
  }

  /**
   * Get the current attractiveness score
   * @returns {number}
   */
  getScore() {
    return this._score;
  }

  /**
   * Get the score breakdown for debug/UI
   * @returns {Object}
   */
  getBreakdown() {
    return { ...this._breakdown, total: this._score };
  }

  // ── Private helpers ─────────────────────────────────────────

  _getBuildingTier(building) {
    if (building.tier) return building.tier;
    if (this.buildingConfig) {
      try {
        const config = this.buildingConfig.getConfig(building.type);
        return config.tier || 'SURVIVAL';
      } catch {
        return 'SURVIVAL';
      }
    }
    return 'SURVIVAL';
  }

  _getHousingCapacity(buildings) {
    if (this.townManager && typeof this.townManager.calculateHousingCapacity === 'function') {
      return this.townManager.calculateHousingCapacity(buildings);
    }
    // Fallback: count housing buildings
    let capacity = 0;
    for (const b of buildings) {
      if (b.status !== 'COMPLETE') continue;
      if (b.type === 'SHELTER') capacity += 1;
      else if (b.type === 'HOUSE') capacity += 2;
    }
    return capacity;
  }

  _getPopulationCount() {
    if (this.npcManager) {
      if (typeof this.npcManager.getStatistics === 'function') {
        const stats = this.npcManager.getStatistics();
        return stats.alive || stats.total || 0;
      }
      if (this.npcManager.npcs) {
        return this.npcManager.npcs.size || 0;
      }
    }
    return 0;
  }

  _getAverageHappiness() {
    if (!this.npcManager || !this.npcManager.npcs) return 50; // neutral default

    let total = 0;
    let count = 0;
    for (const npc of this.npcManager.npcs.values()) {
      if (npc.happiness !== undefined) {
        total += npc.happiness;
        count++;
      }
    }
    return count > 0 ? total / count : 50;
  }

  _countNearbyRifts(gameState) {
    // Rift count from game state if available
    if (gameState && typeof gameState.activeRiftCount === 'number') {
      return gameState.activeRiftCount;
    }
    // Default: no rift data available yet
    return 0;
  }
}

export default AttractivenessCalculator;
