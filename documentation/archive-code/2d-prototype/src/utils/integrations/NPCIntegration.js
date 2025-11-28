/**
 * NPCIntegration.js
 * Integration layer between Leadership attribute and NPC system
 *
 * Handles:
 * - NPC efficiency scaling (+1% per leadership point)
 * - NPC happiness bonuses (+0.5% per point)
 * - Settlement capacity increases (+0.5 population per point)
 * - Recruitment cost reduction (-0.5% per point, capped at 40%)
 * - Soft caps and diminishing returns
 */

/**
 * Calculate NPC work efficiency with Leadership attribute
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {number} Efficiency multiplier
 */
export function calculateNPCEfficiency(npc, character) {
  if (!character) return npc?.baseEfficiency || 1.0;

  const leadership = character.attributes?.leadership || 0;
  const effectiveLeadership = applySoftCap(leadership, 50, 1.0, 0.5);

  // Base efficiency
  const baseEfficiency = npc?.baseEfficiency || 1.0;

  // Leadership bonus: 1% per point
  const leadershipBonus = effectiveLeadership * 0.01;

  return baseEfficiency * (1 + leadershipBonus);
}

/**
 * Calculate NPC work speed
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {number} Work speed multiplier
 */
export function calculateNPCWorkSpeed(npc, character) {
  const baseSpeed = npc?.workSpeed || 1.0;
  const efficiency = calculateNPCEfficiency(npc, character);

  return baseSpeed * efficiency;
}

/**
 * Calculate NPC resource gathering rate
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {number} Gathering rate
 */
export function calculateGatheringRate(npc, character) {
  const baseGathering = npc?.skills?.gathering || 0.6;
  const efficiency = calculateNPCEfficiency(npc, character);

  return baseGathering * efficiency;
}

/**
 * Calculate NPC building speed
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {number} Build speed
 */
export function calculateBuildSpeed(npc, character) {
  const baseBuildSkill = npc?.skills?.building || 0.8;
  const efficiency = calculateNPCEfficiency(npc, character);

  return baseBuildSkill * efficiency;
}

/**
 * Calculate happiness bonus from Leadership
 * @param {object} character - The character data
 * @returns {number} Happiness bonus percentage (0-1)
 */
export function calculateHappinessBonus(character) {
  if (!character) return 0;

  const leadership = character.attributes?.leadership || 0;
  const effectiveLeadership = applySoftCap(leadership, 50, 1.0, 0.5);

  // 0.5% happiness increase per leadership point
  return effectiveLeadership * 0.005;
}

/**
 * Calculate NPC morale
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {number} Morale value (0-1+)
 */
export function calculateNPCMorale(npc, character) {
  const baseMorale = npc?.morale || 0.9;
  const happinessBonus = calculateHappinessBonus(character);

  return baseMorale * (1 + happinessBonus);
}

/**
 * Calculate NPC happiness
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {number} Happiness value (0-1, capped)
 */
export function calculateNPCHappiness(npc, character) {
  const baseHappiness = Math.max(0, npc?.happiness || 0.8);
  const happinessBonus = calculateHappinessBonus(character);

  const totalHappiness = baseHappiness * (1 + happinessBonus);

  // Cap at 1.0 (100%)
  return Math.min(1.0, totalHappiness);
}

/**
 * Calculate NPC turnover rate (chance to leave)
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {number} Turnover rate per day (0-1)
 */
export function calculateTurnoverRate(npc, character) {
  const happiness = calculateNPCHappiness(npc, character);
  const baseTurnoverRate = 0.05; // 5% base chance

  // Higher happiness = lower turnover
  const turnoverRate = baseTurnoverRate * (1 - happiness);

  return Math.max(0, turnoverRate);
}

/**
 * Calculate max settlement population
 * @param {object} settlement - The settlement data
 * @param {object} character - The character data
 * @returns {number} Max population
 */
export function calculateMaxPopulation(settlement, character) {
  // Base capacity from housing
  const housingCapacity = settlement?.maxPopulation || 20;

  if (!character) return housingCapacity;

  const leadership = character.attributes?.leadership || 0;
  const effectiveLeadership = applySoftCap(leadership, 50, 1.0, 0.5);

  // Leadership bonus: 0.5 population per point
  const leadershipBonus = effectiveLeadership * 0.5;

  return Math.floor(housingCapacity + leadershipBonus);
}

/**
 * Calculate available population slots
 * @param {object} settlement - The settlement data
 * @param {object} character - The character data
 * @returns {number} Available slots
 */
export function calculateAvailableSlots(settlement, character) {
  const maxPopulation = calculateMaxPopulation(settlement, character);
  const currentPopulation = settlement?.population || 0;

  return Math.max(0, maxPopulation - currentPopulation);
}

/**
 * Calculate NPC recruitment cost
 * @param {number} baseCost - Base recruitment cost
 * @param {object} character - The character data
 * @returns {number} Final recruitment cost
 */
export function calculateRecruitmentCost(baseCost, character) {
  if (!character) return baseCost;

  const leadership = character.attributes?.leadership || 0;
  const effectiveLeadership = applySoftCap(leadership, 50, 1.0, 0.5);

  // 0.5% cost reduction per point, capped at 40%
  const reduction = Math.min(0.40, effectiveLeadership * 0.005);

  return Math.round(baseCost * (1 - reduction));
}

/**
 * Calculate NPC recruitment chance
 * @param {object} character - The character data
 * @returns {number} Recruitment chance per day (0-1)
 */
export function calculateRecruitmentChance(character) {
  const baseChance = 0.10; // 10% per day

  if (!character) return baseChance;

  const leadership = character.attributes?.leadership || 0;
  const effectiveLeadership = applySoftCap(leadership, 50, 1.0, 0.5);

  // 0.3% increase per leadership point
  const bonus = effectiveLeadership * 0.003;

  const totalChance = baseChance + bonus;

  // Cap at 50%
  return Math.min(0.50, totalChance);
}

/**
 * Calculate NPC skill gain rate
 * @param {object} character - The character data
 * @returns {number} Skill gain multiplier
 */
export function calculateSkillGainRate(character) {
  const baseRate = 1.0;

  if (!character) return baseRate;

  const leadership = character.attributes?.leadership || 0;
  const effectiveLeadership = applySoftCap(leadership, 50, 1.0, 0.5);

  // 0.3% faster skill gain per leadership point
  const bonus = effectiveLeadership * 0.003;

  return baseRate + bonus;
}

/**
 * Apply leadership bonus to NPC skill XP gain
 * @param {number} baseXP - Base XP earned
 * @param {object} character - The character data
 * @returns {number} Final XP with leadership bonus
 */
export function applyLeadershipToSkillGain(baseXP, character) {
  const skillGainRate = calculateSkillGainRate(character);
  return baseXP * skillGainRate;
}

/**
 * Calculate training time for new NPC skills
 * @param {number} baseTime - Base training time in seconds
 * @param {object} character - The character data
 * @returns {number} Final training time
 */
export function calculateTrainingTime(baseTime, character) {
  const skillGainRate = calculateSkillGainRate(character);

  // Higher skill gain rate = faster training
  return baseTime / skillGainRate;
}

/**
 * Calculate settlement-wide happiness
 * @param {object} settlement - The settlement data
 * @param {object} character - The character data
 * @returns {number} Settlement happiness (0-1)
 */
export function calculateSettlementHappiness(settlement, character) {
  const baseHappiness = settlement?.happiness || 0.75;
  const happinessBonus = calculateHappinessBonus(character);

  return Math.min(1.0, baseHappiness * (1 + happinessBonus));
}

/**
 * Calculate average NPC happiness across settlement
 * @param {array} npcs - Array of NPCs
 * @param {object} character - The character data
 * @param {object} settlement - The settlement data
 * @returns {number} Average happiness
 */
export function calculateAverageNPCHappiness(npcs, character, settlement) {
  if (!npcs || npcs.length === 0) return 0;

  const totalHappiness = npcs.reduce((sum, npc) => {
    return sum + calculateNPCHappiness(npc, character);
  }, 0);

  return totalHappiness / npcs.length;
}

/**
 * Calculate resource consumption per NPC
 * @param {number} baseConsumption - Base consumption rate
 * @param {object} character - The character data
 * @returns {number} Actual consumption
 */
export function calculateResourceConsumption(baseConsumption, character) {
  const efficiency = calculateNPCEfficiency({ baseEfficiency: 1.0 }, character);

  // More efficient NPCs consume less (they work smarter)
  return baseConsumption / efficiency;
}

/**
 * Calculate specialized NPC efficiency (with attribute synergies)
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {number} Specialized efficiency
 */
export function calculateSpecializedEfficiency(npc, character) {
  const baseEfficiency = calculateNPCEfficiency(npc, character);

  if (!npc?.role || !character?.attributes) {
    return baseEfficiency;
  }

  let synergyBonus = 0;

  // Check for attribute synergies based on NPC role
  switch (npc.role) {
    case 'builder':
      // Leadership + Construction synergy
      synergyBonus = (character.attributes.construction || 0) * 0.005; // +0.5% per construction point
      break;

    case 'scout':
      // Leadership + Exploration synergy
      synergyBonus = (character.attributes.exploration || 0) * 0.005;
      break;

    case 'guard':
      // Leadership + Combat synergy
      synergyBonus = (character.attributes.combat || 0) * 0.005;
      break;

    default:
      synergyBonus = 0;
  }

  // Apply soft cap to synergy bonus
  synergyBonus = Math.min(0.20, synergyBonus); // Cap synergy at 20%

  return baseEfficiency * (1 + synergyBonus);
}

/**
 * Update NPC stats with character bonuses
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {object} Updated NPC data
 */
export function updateNPCStats(npc, character) {
  return {
    ...npc,
    efficiency: calculateNPCEfficiency(npc, character),
    happiness: calculateNPCHappiness(npc, character),
    workSpeed: calculateNPCWorkSpeed(npc, character),
    morale: calculateNPCMorale(npc, character),
  };
}

/**
 * Calculate task completion time for NPC
 * @param {object} task - The task data
 * @param {object} npc - The NPC data
 * @param {object} character - The character data
 * @returns {number} Time in seconds
 */
export function calculateTaskCompletionTime(task, npc, character) {
  const baseDuration = task?.duration || 100;
  const npcSkill = npc?.skills?.building || 1.0;
  const efficiency = calculateNPCEfficiency(npc, character);

  const effectiveSkill = npcSkill * efficiency;

  return baseDuration / effectiveSkill;
}

/**
 * Calculate efficiencies for all NPCs
 * @param {array} npcs - Array of NPCs
 * @param {object} character - The character data
 * @returns {array} Array of efficiency values
 */
export function calculateAllNPCEfficiencies(npcs, character) {
  if (!npcs) return [];

  return npcs.map((npc) => calculateNPCEfficiency(npc, character));
}

/**
 * Get soft cap information for Leadership attribute
 * @returns {object} Soft cap info
 */
export function getSoftCapInfo() {
  return {
    attribute: 'leadership',
    softCapThreshold: 50,
    fullEffectiveness: 1.0,
    reducedEffectiveness: 0.5,
    description: 'Leadership gains are halved after 50 points',
  };
}

/**
 * Apply soft cap to attribute value
 * @param {number} value - Attribute value
 * @param {number} threshold - Soft cap threshold
 * @param {number} fullEffect - Full effectiveness multiplier
 * @param {number} reducedEffect - Reduced effectiveness multiplier
 * @returns {number} Effective attribute value after soft cap
 */
function applySoftCap(value, threshold, fullEffect, reducedEffect) {
  if (value <= threshold) {
    return value * fullEffect;
  }

  const baseValue = threshold * fullEffect;
  const excessValue = (value - threshold) * reducedEffect;

  return baseValue + excessValue;
}

/**
 * NPCIntegration object (for test compatibility)
 */
export const NPCIntegration = {
  calculateNPCEfficiency,
  calculateNPCWorkSpeed,
  calculateGatheringRate,
  calculateBuildSpeed,
  calculateHappinessBonus,
  calculateNPCMorale,
  calculateNPCHappiness,
  calculateTurnoverRate,
  calculateMaxPopulation,
  calculateAvailableSlots,
  calculateRecruitmentCost,
  calculateRecruitmentChance,
  calculateSkillGainRate,
  applyLeadershipToSkillGain,
  calculateTrainingTime,
  calculateSettlementHappiness,
  calculateAverageNPCHappiness,
  calculateResourceConsumption,
  calculateSpecializedEfficiency,
  updateNPCStats,
  calculateTaskCompletionTime,
  calculateAllNPCEfficiencies,
  getSoftCapInfo,
};
