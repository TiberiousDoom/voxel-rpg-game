/**
 * Bonus Calculator
 *
 * Calculates territory and town bonuses based on buildings and upgrades.
 * Module 4 applies these bonuses but Module 3 is the source of truth for base generation.
 */

import { getTerritoryBonuses } from './buildingClassifier';
import { BONUS_TYPES } from '../types/index';

/**
 * Calculate all territory bonuses from buildings
 * @param {Object[]} buildings - Array of buildings in territory
 * @returns {Object} Aggregated bonuses by type
 */
export function calculateTerritoryBonuses(buildings) {
  const bonuses = {
    [BONUS_TYPES.VISION_RANGE]: 0,
    [BONUS_TYPES.ENEMY_SPAWN_RATE]: 0,
    [BONUS_TYPES.DEFENSE_RATING]: 0,
    [BONUS_TYPES.PROSPERITY]: 0,
    [BONUS_TYPES.NPC_HAPPINESS]: 0,
    [BONUS_TYPES.RESOURCE_PRODUCTION]: 0,
  };

  // Aggregate bonuses from completed buildings
  for (const building of buildings) {
    // Only count completed buildings for bonuses
    if (building.status !== 'COMPLETE') continue;

    const buildingBonuses = getTerritoryBonuses(building.type);
    for (const bonus of buildingBonuses) {
      if (!bonuses[bonus.type]) {
        bonuses[bonus.type] = 0;
      }
      bonuses[bonus.type] += bonus.magnitude;
    }
  }

  return bonuses;
}

/**
 * Calculate town statistics from buildings and NPCs
 * @param {Object[]} buildings - Array of buildings in town
 * @param {Object[]} npcs - Array of NPCs in town
 * @param {Object} upgrades - Town upgrades status
 * @returns {Object} Town statistics
 */
export function calculateTownStatistics(buildings, npcs, upgrades = {}) {
  // Count building types
  const buildingCounts = {};
  let totalBuildingCount = 0;
  let populationCapacity = 0;
  let aestheticValue = 0;

  for (const building of buildings) {
    buildingCounts[building.type] = (buildingCounts[building.type] || 0) + 1;
    totalBuildingCount++;

    if (building.status === 'COMPLETE') {
      // This would call Module 4's building classifier
      // For now, we keep it simple
    }
  }

  // Calculate population metrics
  const population = npcs.length;
  const npcMorale = npcs.length > 0
    ? Math.round(npcs.reduce((sum, npc) => sum + npc.morale, 0) / npcs.length)
    : 100;

  // Defense calculation: based on defensive buildings count
  const defensiveBuildings = buildings.filter((b) => {
    const defensive = ['WALL', 'TOWER', 'WATCHTOWER', 'GUARD_POST', 'FORTRESS', 'CASTLE'];
    return defensive.includes(b.type) && b.status === 'COMPLETE';
  });
  const defenseRating = Math.min(100, defensiveBuildings.length * 15);

  // Prosperity: based on production buildings and marketplace
  const productionBuildings = buildings.filter((b) => {
    const production = ['CRAFTING_STATION', 'MARKETPLACE', 'STORAGE_BUILDING'];
    return production.includes(b.type) && b.status === 'COMPLETE';
  });
  const prosperity = Math.min(100, productionBuildings.length * 20 + (upgrades.marketplaceUpgrade ? 10 : 0));

  // Production rate: based on completed production buildings
  const productionRate = productionBuildings.length > 0 ? 1 + productionBuildings.length * 0.1 : 1;

  return {
    population,
    happiness: npcMorale,
    defense: defenseRating,
    prosperity,
    productionRate,
    totalBuildingCount,
    buildingCounts,
    populationCapacity,
  };
}

/**
 * Calculate NPC morale based on town conditions
 * @param {number} townHappiness - Town happiness percentage (0-100)
 * @param {number} townDefense - Town defense percentage (0-100)
 * @param {number} townProsperity - Town prosperity percentage (0-100)
 * @returns {number} Morale value (0-100)
 */
export function calculateNPCMorale(townHappiness, townDefense, townProsperity) {
  // Weighted average of town conditions
  const morale = (townHappiness * 0.5 + townDefense * 0.25 + townProsperity * 0.25);
  return Math.round(Math.max(0, Math.min(100, morale)));
}

/**
 * Calculate resource production multiplier from bonuses
 * Module 3 provides the base, Module 4 applies territory multipliers
 * @param {Object} bonuses - Territory bonuses
 * @param {number} baseProduction - Base production rate from Module 3
 * @returns {number} Final production rate with bonuses applied
 */
export function applyProductionMultipliers(bonuses, baseProduction = 1) {
  let multiplier = baseProduction;

  // Resource production bonuses are applied as percentage increases
  if (bonuses[BONUS_TYPES.RESOURCE_PRODUCTION]) {
    const percentageBonus = bonuses[BONUS_TYPES.RESOURCE_PRODUCTION] / 100;
    multiplier *= (1 + percentageBonus);
  }

  // Prosperity also affects production slightly
  if (bonuses[BONUS_TYPES.PROSPERITY]) {
    const percentageBonus = bonuses[BONUS_TYPES.PROSPERITY] / 100;
    multiplier *= (1 + percentageBonus * 0.1); // Prosperity has 10% of its effect on production
  }

  return multiplier;
}

/**
 * Calculate defense rating from bonuses
 * @param {Object} bonuses - Territory bonuses
 * @param {number} baseDefense - Base defense value
 * @returns {number} Final defense value
 */
export function applyDefenseMultipliers(bonuses, baseDefense = 50) {
  let defense = baseDefense;

  // Defense rating is additive from bonuses
  if (bonuses[BONUS_TYPES.DEFENSE_RATING]) {
    defense += bonuses[BONUS_TYPES.DEFENSE_RATING];
  }

  // Cap at 100
  return Math.min(100, Math.max(0, defense));
}

/**
 * Calculate enemy spawn rate modifier
 * Lower values = fewer enemies spawn
 * @param {Object} bonuses - Territory bonuses
 * @param {number} baseSpawnRate - Base spawn rate (1.0 = normal)
 * @returns {number} Modified spawn rate
 */
export function applySpawnRateModifiers(bonuses, baseSpawnRate = 1.0) {
  let spawnRate = baseSpawnRate;

  // Enemy spawn rate is a percentage reduction
  if (bonuses[BONUS_TYPES.ENEMY_SPAWN_RATE]) {
    const percentageChange = bonuses[BONUS_TYPES.ENEMY_SPAWN_RATE] / 100;
    spawnRate *= (1 + percentageChange); // Negative percentage = fewer enemies
  }

  // Prevent spawn rate from going below 10% (some enemies always spawn)
  return Math.max(0.1, spawnRate);
}

/**
 * Calculate vision range bonus
 * @param {Object} bonuses - Territory bonuses
 * @param {number} baseVisionRange - Base vision range
 * @returns {number} Final vision range
 */
export function applyVisionRangeBonus(bonuses, baseVisionRange = 30) {
  return baseVisionRange + (bonuses[BONUS_TYPES.VISION_RANGE] || 0);
}

/**
 * Calculate total town level based on statistics
 * Used for progression tracking
 * @param {Object} statistics - Town statistics
 * @returns {number} Town level (1-10)
 */
export function calculateTownLevel(statistics) {
  // Town level increases with:
  // - Total buildings (25% weight)
  // - Population (25% weight)
  // - Defense (25% weight)
  // - Prosperity (25% weight)

  const buildingScore = Math.min(statistics.totalBuildingCount / 10, 1);
  const populationScore = Math.min(statistics.population / 100, 1);
  const defenseScore = statistics.defense / 100;
  const prosperityScore = statistics.prosperity / 100;

  const combinedScore = (buildingScore + populationScore + defenseScore + prosperityScore) / 4;
  const level = Math.floor(combinedScore * 10) + 1;

  return Math.min(10, Math.max(1, level));
}

/**
 * Calculate aesthetic rating based on buildings
 * @param {Object[]} buildings - Array of buildings
 * @returns {number} Aesthetic rating (0-100)
 */
export function calculateAestheticRating(buildings) {
  const aestheticValues = {
    CASTLE: 100,
    FORTRESS: 80,
    MARKETPLACE: 70,
    CRAFTING_STATION: 50,
    BARRACKS: 40,
    GUARD_POST: 30,
    WATCHTOWER: 35,
    STORAGE_BUILDING: 25,
    TOWER: 20,
    WALL: 10,
    DOOR: 5,
    CHEST: 5,
  };

  let totalAesthetic = 0;
  let completedCount = 0;

  for (const building of buildings) {
    if (building.status === 'COMPLETE') {
      totalAesthetic += aestheticValues[building.type] || 0;
      completedCount++;
    }
  }

  if (completedCount === 0) return 0;

  // Normalize to 0-100 scale
  const averageAesthetic = totalAesthetic / completedCount;
  return Math.round(Math.min(100, averageAesthetic));
}
