/**
 * CombatIntegration.js
 * Integration layer between character attributes and combat system
 *
 * Handles:
 * - Combat attribute: damage, crit chance, attack speed
 * - Endurance attribute: health, stamina, defense, resistance
 * - Soft caps and diminishing returns
 */

/**
 * Calculate player damage with Combat attribute
 * @param {object} character - The character data
 * @param {object} equipment - The equipment data
 * @returns {number} Final damage
 */
export function calculateDamage(character, equipment = {}) {
  if (!character) return 0;

  const level = character.level || 1;
  const combat = character.attributes?.combat || 0;

  // Apply soft cap to combat
  const effectiveCombat = applySoftCap(combat, 50, 1.0, 0.5);

  // Base damage scales with level
  const baseDamage = 10 + level * 0.8;

  // Combat attribute bonus: 1.5 damage per point
  const combatBonus = effectiveCombat * 1.5;

  // Equipment bonus
  const equipmentBonus = equipment?.weapon?.damage || 0;

  // Skill multiplier (from skill tree)
  const skillMultiplier = getSkillDamageMultiplier(character);

  const totalDamage = (baseDamage + combatBonus + equipmentBonus) * skillMultiplier;

  return Math.max(1, totalDamage);
}

/**
 * Calculate critical strike chance
 * @param {object} character - The character data
 * @returns {number} Crit chance (0-1)
 */
export function calculateCritChance(character) {
  if (!character) return 0.05;

  const combat = character.attributes?.combat || 0;
  const effectiveCombat = applySoftCap(combat, 50, 1.0, 0.5);

  // Base crit: 5%
  // Combat bonus: 0.3% per point
  const baseCrit = 0.05;
  const combatBonus = effectiveCombat * 0.003;

  const totalCrit = baseCrit + combatBonus;

  // Cap at 50%
  return Math.min(0.50, totalCrit);
}

/**
 * Apply critical hit multiplier
 * @param {number} baseDamage - Base damage
 * @returns {number} Critical damage
 */
export function applyCriticalHit(baseDamage) {
  return baseDamage * 2.0;
}

/**
 * Calculate attack speed multiplier
 * @param {object} character - The character data
 * @param {object} equipment - The equipment data
 * @returns {number} Attack speed multiplier
 */
export function calculateAttackSpeed(character, equipment = {}) {
  if (!character) return 1.0;

  const combat = character.attributes?.combat || 0;
  const effectiveCombat = applySoftCap(combat, 50, 1.0, 0.5);

  // Base attack speed from weapon (or unarmed)
  const baseSpeed = equipment?.weapon?.attackSpeed || 0.8; // Unarmed is slower

  // Combat bonus: 0.5% per point
  const speedBonus = effectiveCombat * 0.005;
  const speedMultiplier = 1.0 + speedBonus;

  const totalSpeed = baseSpeed * speedMultiplier;

  // Cap at 3.0x base
  return Math.min(totalSpeed, baseSpeed * 3.0);
}

/**
 * Calculate max health with Endurance attribute
 * @param {object} character - The character data
 * @returns {number} Max health
 */
export function calculateMaxHealth(character) {
  if (!character) return 100;

  const endurance = character.attributes?.endurance || 0;
  const effectiveEndurance = applySoftCap(endurance, 50, 1.0, 0.5);

  // Base health: 100
  // Endurance bonus: 15 HP per point
  const baseHealth = 100;
  const enduranceBonus = effectiveEndurance * 15;

  return baseHealth + enduranceBonus;
}

/**
 * Calculate health regeneration rate
 * @param {object} character - The character data
 * @param {boolean} inCombat - Whether player is in combat
 * @returns {number} Health regen per second
 */
export function calculateHealthRegen(character, inCombat = false) {
  if (inCombat) return 0; // No regen in combat

  if (!character) return 0.5;

  const endurance = character.attributes?.endurance || 0;
  const effectiveEndurance = applySoftCap(endurance, 50, 1.0, 0.5);

  // Base regen: 0.5 HP/s
  // Endurance bonus: 0.3 HP/s per point
  const baseRegen = 0.5;
  const enduranceBonus = effectiveEndurance * 0.3;

  return baseRegen + enduranceBonus;
}

/**
 * Calculate max stamina with Endurance attribute
 * @param {object} character - The character data
 * @returns {number} Max stamina
 */
export function calculateMaxStamina(character) {
  if (!character) return 100;

  const endurance = character.attributes?.endurance || 0;
  const effectiveEndurance = applySoftCap(endurance, 50, 1.0, 0.5);

  // Base stamina: 100
  // Endurance bonus: 5 stamina per point
  const baseStamina = 100;
  const enduranceBonus = effectiveEndurance * 5;

  return baseStamina + enduranceBonus;
}

/**
 * Calculate stamina regeneration rate
 * @param {object} character - The character data
 * @returns {number} Stamina regen per second
 */
export function calculateStaminaRegen(character) {
  if (!character) return 30;

  const endurance = character.attributes?.endurance || 0;
  const effectiveEndurance = applySoftCap(endurance, 50, 1.0, 0.5);

  // Base regen: 30 per second
  // Endurance bonus: 0.2 per second per point
  const baseRegen = 30;
  const enduranceBonus = effectiveEndurance * 0.2;

  return baseRegen + enduranceBonus;
}

/**
 * Calculate sprint stamina cost
 * @param {object} character - The character data
 * @returns {number} Stamina cost per second
 */
export function calculateSprintCost(character) {
  if (!character) return 20;

  const endurance = character.attributes?.endurance || 0;
  const effectiveEndurance = applySoftCap(endurance, 50, 1.0, 0.5);

  // Base cost: 20 per second
  // Endurance reduction: 0.1% per point
  const baseCost = 20;
  const reduction = effectiveEndurance * 0.001;

  return baseCost * (1 - reduction);
}

/**
 * Calculate defense rating
 * @param {object} character - The character data
 * @param {object} equipment - The equipment data
 * @returns {number} Total defense
 */
export function calculateDefense(character, equipment = {}) {
  if (!character) return 0;

  const endurance = character.attributes?.endurance || 0;
  const effectiveEndurance = applySoftCap(endurance, 50, 1.0, 0.5);

  // Base defense: 0
  // Endurance bonus: 0.5 defense per point
  const enduranceBonus = effectiveEndurance * 0.5;

  // Equipment bonus
  const equipmentBonus = equipment?.armor?.defense || 0;

  let totalDefense = enduranceBonus + equipmentBonus;

  // Blocking multiplies defense by 2.0
  if (character.isBlocking) {
    totalDefense *= 2.0;
  }

  return totalDefense;
}

/**
 * Calculate defense damage reduction percentage
 * @param {number} defense - Defense value
 * @returns {number} Damage reduction (0-1)
 */
export function calculateDefenseReduction(defense) {
  // Formula: defense / (defense + 100)
  // This creates diminishing returns
  return defense / (defense + 100);
}

/**
 * Apply defense to incoming damage
 * @param {number} incomingDamage - Raw damage
 * @param {number} defense - Defense value
 * @returns {number} Final damage after defense
 */
export function applyDefense(incomingDamage, defense) {
  const reduction = calculateDefenseReduction(defense);
  const finalDamage = incomingDamage * (1 - reduction);

  // Always deal at least 1 damage
  return Math.max(1, finalDamage);
}

/**
 * Calculate elemental resistance
 * @param {object} character - The character data
 * @returns {number} Resistance percentage (0-1)
 */
export function calculateElementalResistance(character) {
  if (!character) return 0;

  const endurance = character.attributes?.endurance || 0;
  const effectiveEndurance = applySoftCap(endurance, 50, 1.0, 0.5);

  // 0.2% resistance per endurance point
  const resistance = effectiveEndurance * 0.002;

  // Cap at 75%
  return Math.min(0.75, resistance);
}

/**
 * Apply elemental resistance to damage
 * @param {number} elementalDamage - Raw elemental damage
 * @param {number} resistance - Resistance percentage
 * @returns {number} Final damage after resistance
 */
export function applyElementalResistance(elementalDamage, resistance) {
  return elementalDamage * (1 - resistance);
}

/**
 * Calculate final damage dealt to enemy
 * @param {object} character - The character data
 * @param {object} equipment - The equipment data
 * @param {object} enemy - The enemy data
 * @returns {number} Final damage
 */
export function calculateFinalDamage(character, equipment, enemy) {
  const playerDamage = calculateDamage(character, equipment);
  const enemyDefense = enemy?.defense || 0;

  return applyDefense(playerDamage, enemyDefense);
}

/**
 * Execute an attack and return result
 * @param {object} character - The character data
 * @param {object} enemy - The enemy data
 * @param {object} equipment - The equipment data
 * @returns {object} Attack result
 */
export function executeAttack(character, enemy, equipment = {}) {
  const baseDamage = calculateDamage(character, equipment);
  const critChance = calculateCritChance(character);
  const isCritical = Math.random() < critChance;

  let damage = baseDamage;
  if (isCritical) {
    damage = applyCriticalHit(damage);
  }

  const finalDamage = applyDefense(damage, enemy?.defense || 0);

  return {
    damage: baseDamage,
    isCritical,
    finalDamage: Math.round(finalDamage),
  };
}

/**
 * Calculate combat effectiveness rating
 * @param {object} character - The character data
 * @param {object} equipment - The equipment data
 * @returns {number} Combat effectiveness score
 */
export function calculateCombatEffectiveness(character, equipment = {}) {
  const damage = calculateDamage(character, equipment);
  const defense = calculateDefense(character, equipment);
  const health = calculateMaxHealth(character);

  // Effectiveness formula: weighted combination
  return damage * 10 + defense * 5 + health / 10;
}

/**
 * Get total stats (for integration with existing getTotalStats)
 * @param {object} character - The character data
 * @param {object} equipment - The equipment data
 * @returns {object} All derived stats
 */
export function getTotalStats(character, equipment = {}) {
  return {
    maxHealth: calculateMaxHealth(character),
    healthRegen: calculateHealthRegen(character),
    maxStamina: calculateMaxStamina(character),
    staminaRegen: calculateStaminaRegen(character),
    damage: calculateDamage(character, equipment),
    defense: calculateDefense(character, equipment),
    critChance: calculateCritChance(character),
    attackSpeed: calculateAttackSpeed(character, equipment),
    elementalResistance: calculateElementalResistance(character),
    speed: character?.attributes?.exploration ? 5 + character.attributes.exploration * 0.1 : 5,
  };
}

/**
 * Get skill damage multiplier from skill tree
 * @param {object} character - The character data
 * @returns {number} Damage multiplier
 */
function getSkillDamageMultiplier(character) {
  if (!character?.skills?.activeNodes) return 1.0;

  let multiplier = 1.0;

  // Check for damage-boosting skills
  if (character.skills.activeNodes.includes('combat_power_strike')) {
    multiplier += 0.15; // +15% damage
  }

  return multiplier;
}

/**
 * Get soft cap information
 * @param {string} attribute - 'combat' or 'endurance'
 * @returns {object} Soft cap info
 */
export function getSoftCapInfo(attribute) {
  return {
    attribute,
    softCapThreshold: 50,
    fullEffectiveness: 1.0,
    reducedEffectiveness: 0.5,
    description: `${attribute.charAt(0).toUpperCase() + attribute.slice(1)} gains are halved after 50 points`,
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
 * CombatIntegration object (for test compatibility)
 */
export const CombatIntegration = {
  calculateDamage,
  calculateCritChance,
  applyCriticalHit,
  calculateAttackSpeed,
  calculateMaxHealth,
  calculateHealthRegen,
  calculateMaxStamina,
  calculateStaminaRegen,
  calculateSprintCost,
  calculateDefense,
  calculateDefenseReduction,
  applyDefense,
  calculateElementalResistance,
  applyElementalResistance,
  calculateFinalDamage,
  executeAttack,
  calculateCombatEffectiveness,
  getTotalStats,
  getSoftCapInfo,
};
