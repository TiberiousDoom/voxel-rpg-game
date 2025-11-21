/**
 * BuildingIntegration.js
 * Integration layer between Construction attribute and building system
 *
 * Handles:
 * - Building cost reduction (-0.5% per point, capped at 50%)
 * - Build speed increases (+1% per point, capped at 3x)
 * - Building durability bonuses (+2 HP per point)
 * - Storage capacity and production rate increases
 * - Soft caps and diminishing returns
 */

/**
 * Calculate building cost with Construction attribute reduction
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {object} Final building costs
 */
export function calculateBuildingCost(building, character) {
  if (!building || !building.baseCost) {
    return building?.baseCost || {};
  }

  if (!character) {
    return building.baseCost;
  }

  const construction = character.attributes?.construction || 0;
  const effectiveConstruction = applySoftCap(construction, 50, 1.0, 0.5);

  // 0.5% cost reduction per point, capped at 50%
  const reduction = Math.min(0.50, effectiveConstruction * 0.005);

  // Apply skill tree bonuses
  const skillReduction = getSkillCostReduction(character);
  const totalReduction = Math.min(0.50, reduction + skillReduction); // Cap at 50% total

  // Calculate reduced costs for each resource
  const finalCost = {};
  for (const [resource, amount] of Object.entries(building.baseCost)) {
    finalCost[resource] = Math.round(amount * (1 - totalReduction) * 100) / 100;
  }

  return finalCost;
}

/**
 * Calculate upgrade cost
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {object} Final upgrade costs
 */
export function calculateUpgradeCost(building, character) {
  // Use same logic as building cost
  const mockBuilding = {
    baseCost: building.upgradeCost || {},
  };

  return calculateBuildingCost(mockBuilding, character);
}

/**
 * Calculate build time with Construction attribute
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {number} Build time in seconds
 */
export function calculateBuildTime(building, character) {
  if (!building) return 0;

  const baseTime = building.baseBuildTime || 0;

  if (baseTime === 0) return 0;
  if (!character) return baseTime;

  const construction = character.attributes?.construction || 0;
  const effectiveConstruction = applySoftCap(construction, 50, 1.0, 0.5);

  // 1% build speed increase per point
  const speedBonus = effectiveConstruction * 0.01;
  let speedMultiplier = 1.0 + speedBonus;

  // Apply skill tree bonuses
  const skillSpeedBonus = getSkillSpeedBonus(character);
  speedMultiplier *= 1.0 + skillSpeedBonus;

  // Cap at 3.0x speed
  speedMultiplier = Math.min(3.0, speedMultiplier);

  const finalTime = baseTime / speedMultiplier;

  return Math.max(1, Math.round(finalTime)); // Minimum 1 second
}

/**
 * Calculate upgrade time
 * @param {number} upgradeTime - Base upgrade time
 * @param {object} character - The character data
 * @returns {number} Final upgrade time in seconds
 */
export function calculateUpgradeTime(upgradeTime, character) {
  const mockBuilding = {
    baseBuildTime: upgradeTime,
  };

  return calculateBuildTime(mockBuilding, character);
}

/**
 * Calculate build time with NPC assistance
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @param {number} npcEfficiency - NPC efficiency multiplier
 * @returns {number} Build time in seconds
 */
export function calculateBuildTimeWithNPC(building, character, npcEfficiency = 1.0) {
  const baseTime = calculateBuildTime(building, character);
  return Math.round(baseTime / npcEfficiency);
}

/**
 * Check if player can build a building type
 * @param {object} buildingType - The building type data
 * @param {object} character - The character data
 * @returns {boolean} True if can build
 */
export function canBuildType(buildingType, character) {
  if (!buildingType.requiredConstructionLevel) {
    return true; // No requirement
  }

  const construction = character?.attributes?.construction || 0;
  return construction >= buildingType.requiredConstructionLevel;
}

/**
 * Calculate building max health with Construction attribute
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {number} Max health
 */
export function calculateBuildingHealth(building, character) {
  if (!building) return 100;

  const baseHealth = building.maxHealth || building.health || 100;

  if (!character) return baseHealth;

  const construction = character.attributes?.construction || 0;
  const effectiveConstruction = applySoftCap(construction, 50, 1.0, 0.5);

  // 2 HP per construction point
  const healthBonus = effectiveConstruction * 2;

  return Math.round(baseHealth + healthBonus);
}

/**
 * Calculate building health with synergies
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {number} Max health with synergies
 */
export function calculateBuildingHealthWithSynergy(building, character) {
  let health = calculateBuildingHealth(building, character);

  // Check for defense building + Endurance synergy
  if (building.category === 'defense' && character?.attributes?.endurance) {
    const endurance = character.attributes.endurance;
    const synergyBonus = endurance * 1; // +1 HP per endurance point for defense buildings
    health += synergyBonus;
  }

  return Math.round(health);
}

/**
 * Calculate building decay rate
 * @param {number} baseDecayRate - Base decay rate (HP per hour)
 * @param {object} character - The character data
 * @returns {number} Final decay rate
 */
export function calculateDecayRate(baseDecayRate, character) {
  if (!character) return baseDecayRate;

  const construction = character.attributes?.construction || 0;
  const effectiveConstruction = applySoftCap(construction, 50, 1.0, 0.5);

  // 0.3% decay reduction per point, capped at 50%
  const reduction = Math.min(0.50, effectiveConstruction * 0.003);

  return baseDecayRate * (1 - reduction);
}

/**
 * Calculate repair amount
 * @param {number} repairAmount - Base repair amount
 * @param {object} character - The character data
 * @returns {number} Final repair amount
 */
export function calculateRepairAmount(repairAmount, character) {
  if (!character) return repairAmount;

  const construction = character.attributes?.construction || 0;
  const effectiveConstruction = applySoftCap(construction, 50, 1.0, 0.5);

  // 1% repair efficiency per point
  const bonus = effectiveConstruction * 0.01;

  return Math.round(repairAmount * (1 + bonus));
}

/**
 * Calculate storage building capacity
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {number} Storage capacity
 */
export function calculateStorageCapacity(building, character) {
  if (!building) return 0;

  const baseCapacity = building.baseCapacity || 0;

  if (!character) return baseCapacity;

  const construction = character.attributes?.construction || 0;
  const effectiveConstruction = applySoftCap(construction, 50, 1.0, 0.5);

  // 1% capacity increase per point
  const bonus = effectiveConstruction * 0.01;

  return Math.round(baseCapacity * (1 + bonus));
}

/**
 * Calculate workshop production rate
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {number} Production rate (items per hour)
 */
export function calculateProductionRate(building, character) {
  if (!building) return 0;

  const baseProduction = building.baseProduction || 0;

  if (!character) return baseProduction;

  const construction = character.attributes?.construction || 0;
  const effectiveConstruction = applySoftCap(construction, 50, 1.0, 0.5);

  // 0.5% production increase per point
  const bonus = effectiveConstruction * 0.005;

  return baseProduction * (1 + bonus);
}

/**
 * Calculate farm yield
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {number} Farm yield per harvest
 */
export function calculateFarmYield(building, character) {
  if (!building) return 0;

  const baseYield = building.baseYield || 0;

  if (!character) return baseYield;

  const construction = character.attributes?.construction || 0;
  const effectiveConstruction = applySoftCap(construction, 50, 1.0, 0.5);

  // 0.5% yield increase per point
  const bonus = effectiveConstruction * 0.005;

  return baseYield * (1 + bonus);
}

/**
 * Calculate max building slots in settlement
 * @param {object} character - The character data
 * @returns {number} Max building slots
 */
export function calculateMaxBuildingSlots(character) {
  const baseSlots = 10;

  if (!character) return baseSlots;

  const construction = character.attributes?.construction || 0;
  const effectiveConstruction = applySoftCap(construction, 50, 1.0, 0.5);

  // 0.2 slots per construction point
  const bonus = effectiveConstruction * 0.2;

  return Math.floor(baseSlots + bonus);
}

/**
 * Calculate building quality tier
 * @param {object} character - The character data
 * @returns {string} Quality tier name
 */
export function calculateBuildingQuality(character) {
  const construction = character?.attributes?.construction || 0;

  if (construction < 21) return 'Basic';
  if (construction < 41) return 'Standard';
  if (construction < 61) return 'Quality';
  if (construction < 81) return 'Superior';
  return 'Masterwork';
}

/**
 * Get quality tier bonuses
 * @param {string} qualityTier - The quality tier
 * @returns {object} Quality bonuses
 */
export function getQualityBonus(qualityTier) {
  const bonuses = {
    Basic: {
      healthMultiplier: 1.0,
      capacityMultiplier: 1.0,
      costMultiplier: 1.0,
      description: 'Basic construction quality',
    },
    Standard: {
      healthMultiplier: 1.1,
      capacityMultiplier: 1.05,
      costMultiplier: 0.98,
      description: 'Standard construction quality',
    },
    Quality: {
      healthMultiplier: 1.2,
      capacityMultiplier: 1.15,
      costMultiplier: 0.95,
      description: 'Well-crafted building with enhanced durability',
    },
    Superior: {
      healthMultiplier: 1.3,
      capacityMultiplier: 1.25,
      costMultiplier: 0.92,
      description: 'Superior craftsmanship with excellent bonuses',
    },
    Masterwork: {
      healthMultiplier: 1.5,
      capacityMultiplier: 1.5,
      costMultiplier: 0.90,
      description: 'Masterwork construction of legendary quality',
    },
  };

  return bonuses[qualityTier] || bonuses.Basic;
}

/**
 * Calculate building cost with synergies
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {object} Final costs with synergies
 */
export function calculateBuildingCostWithSynergy(building, character) {
  let cost = calculateBuildingCost(building, character);

  // Check for settlement building + Leadership synergy
  if (building.category === 'settlement' && character?.attributes?.leadership) {
    const synergyReduction = 0.05; // 5% additional reduction
    cost = Object.fromEntries(
      Object.entries(cost).map(([resource, amount]) => [
        resource,
        Math.round(amount * (1 - synergyReduction) * 100) / 100,
      ])
    );
  }

  return cost;
}

/**
 * Calculate build time with synergies
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {number} Build time with synergies
 */
export function calculateBuildTimeWithSynergy(building, character) {
  let buildTime = calculateBuildTime(building, character);

  // Check for outpost + Exploration synergy
  if (building.category === 'exploration' && character?.attributes?.exploration) {
    const exploration = character.attributes.exploration;
    const synergyBonus = Math.min(0.20, exploration * 0.005); // Max 20% bonus
    buildTime = Math.round(buildTime / (1 + synergyBonus));
  }

  return buildTime;
}

/**
 * Prepare building data for placement
 * @param {object} placementData - Building placement data
 * @param {object} character - The character data
 * @returns {object} Complete building data
 */
export function prepareBuildingData(placementData, character) {
  const buildingType = placementData.type;

  // Mock building for calculation
  const mockBuilding = {
    type: buildingType,
    baseCost: getBuildingBaseCost(buildingType),
    baseBuildTime: getBuildingBaseBuildTime(buildingType),
    maxHealth: getBuildingBaseHealth(buildingType),
  };

  return {
    ...placementData,
    cost: calculateBuildingCost(mockBuilding, character),
    buildTime: calculateBuildTime(mockBuilding, character),
    maxHealth: calculateBuildingHealth(mockBuilding, character),
    quality: calculateBuildingQuality(character),
  };
}

/**
 * Check if player can afford building
 * @param {object} building - The building data
 * @param {object} resources - Available resources
 * @param {object} character - The character data
 * @returns {boolean} True if can afford
 */
export function canAffordBuilding(building, resources, character) {
  const cost = calculateBuildingCost(building, character);

  for (const [resource, amount] of Object.entries(cost)) {
    if ((resources[resource] || 0) < amount) {
      return false;
    }
  }

  return true;
}

/**
 * Deduct building cost from resources
 * @param {object} building - The building data
 * @param {object} resources - Available resources
 * @param {object} character - The character data
 * @returns {object} Remaining resources
 */
export function deductBuildingCost(building, resources, character) {
  const cost = calculateBuildingCost(building, character);
  const remaining = { ...resources };

  for (const [resource, amount] of Object.entries(cost)) {
    remaining[resource] = (remaining[resource] || 0) - amount;
  }

  return remaining;
}

/**
 * Apply construction bonuses to building
 * @param {object} building - The building data
 * @param {object} character - The character data
 * @returns {object} Building with bonuses applied
 */
export function applyConstructionBonuses(building, character) {
  return {
    ...building,
    maxHealth: calculateBuildingHealth(building, character),
    quality: calculateBuildingQuality(character),
    constructionBonus: character?.attributes?.construction || 0,
  };
}

/**
 * Get skill tree cost reduction
 * @param {object} character - The character data
 * @returns {number} Cost reduction percentage
 */
function getSkillCostReduction(character) {
  if (!character?.skills?.activeNodes) return 0;

  let reduction = 0;

  if (character.skills.activeNodes.includes('settlement_efficient_building')) {
    reduction += 0.10; // -10% cost
  }

  if (character.skills.activeNodes.includes('settlement_master_builder')) {
    reduction += 0.15; // -15% cost
  }

  return reduction;
}

/**
 * Get skill tree speed bonus
 * @param {object} character - The character data
 * @returns {number} Speed bonus multiplier
 */
function getSkillSpeedBonus(character) {
  if (!character?.skills?.activeNodes) return 0;

  let bonus = 0;

  if (character.skills.activeNodes.includes('settlement_rapid_construction')) {
    bonus += 0.20; // +20% speed
  }

  if (character.skills.activeNodes.includes('settlement_master_builder')) {
    bonus += 0.10; // +10% speed
  }

  return bonus;
}

/**
 * Get base cost for building type (placeholder)
 * @param {string} type - Building type
 * @returns {object} Base costs
 */
function getBuildingBaseCost(type) {
  const costs = {
    house: { wood: 50, stone: 30, iron: 10 },
    workshop: { wood: 80, stone: 60, iron: 20 },
    warehouse: { wood: 100, stone: 80, iron: 30 },
    farm: { wood: 60, stone: 20 },
  };

  return costs[type] || { wood: 50, stone: 30 };
}

/**
 * Get base build time for building type (placeholder)
 * @param {string} type - Building type
 * @returns {number} Base build time in seconds
 */
function getBuildingBaseBuildTime(type) {
  const times = {
    house: 300,
    workshop: 600,
    warehouse: 900,
    farm: 400,
  };

  return times[type] || 300;
}

/**
 * Get base health for building type (placeholder)
 * @param {string} type - Building type
 * @returns {number} Base health
 */
function getBuildingBaseHealth(type) {
  const health = {
    house: 100,
    workshop: 150,
    warehouse: 200,
    farm: 80,
  };

  return health[type] || 100;
}

/**
 * Get soft cap information
 * @returns {object} Soft cap info
 */
export function getSoftCapInfo() {
  return {
    attribute: 'construction',
    softCapThreshold: 50,
    fullEffectiveness: 1.0,
    reducedEffectiveness: 0.5,
    description: 'Construction gains are halved after 50 points',
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
 * BuildingIntegration object (for test compatibility)
 */
export const BuildingIntegration = {
  calculateBuildingCost,
  calculateUpgradeCost,
  calculateBuildTime,
  calculateUpgradeTime,
  calculateBuildTimeWithNPC,
  canBuildType,
  calculateBuildingHealth,
  calculateBuildingHealthWithSynergy,
  calculateDecayRate,
  calculateRepairAmount,
  calculateStorageCapacity,
  calculateProductionRate,
  calculateFarmYield,
  calculateMaxBuildingSlots,
  calculateBuildingQuality,
  getQualityBonus,
  calculateBuildingCostWithSynergy,
  calculateBuildTimeWithSynergy,
  prepareBuildingData,
  canAffordBuilding,
  deductBuildingCost,
  applyConstructionBonuses,
  getSoftCapInfo,
};
