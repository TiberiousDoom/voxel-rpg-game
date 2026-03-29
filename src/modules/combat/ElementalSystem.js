/**
 * ElementalSystem.js
 * Handles elemental damage types, resistances, effectiveness, and status effects
 */

export const ELEMENT_TYPES = {
  PHYSICAL: 'PHYSICAL',
  FIRE: 'FIRE',
  ICE: 'ICE',
  LIGHTNING: 'LIGHTNING',
  POISON: 'POISON',
  ARCANE: 'ARCANE',
};

/**
 * Effectiveness multipliers: attacker element → defender element
 * 1.5 = super effective, 1.0 = neutral, 0.5 = resisted
 */
const EFFECTIVENESS = {
  [ELEMENT_TYPES.FIRE]: {
    [ELEMENT_TYPES.ICE]: 1.5,
    [ELEMENT_TYPES.POISON]: 1.25,
    [ELEMENT_TYPES.FIRE]: 0.5,
    [ELEMENT_TYPES.LIGHTNING]: 1.0,
    [ELEMENT_TYPES.ARCANE]: 1.0,
    [ELEMENT_TYPES.PHYSICAL]: 1.0,
  },
  [ELEMENT_TYPES.ICE]: {
    [ELEMENT_TYPES.LIGHTNING]: 1.5,
    [ELEMENT_TYPES.FIRE]: 0.5,
    [ELEMENT_TYPES.ICE]: 0.5,
    [ELEMENT_TYPES.POISON]: 1.0,
    [ELEMENT_TYPES.ARCANE]: 1.0,
    [ELEMENT_TYPES.PHYSICAL]: 1.0,
  },
  [ELEMENT_TYPES.LIGHTNING]: {
    [ELEMENT_TYPES.POISON]: 1.5,
    [ELEMENT_TYPES.ICE]: 0.5,
    [ELEMENT_TYPES.LIGHTNING]: 0.5,
    [ELEMENT_TYPES.FIRE]: 1.0,
    [ELEMENT_TYPES.ARCANE]: 1.0,
    [ELEMENT_TYPES.PHYSICAL]: 1.0,
  },
  [ELEMENT_TYPES.POISON]: {
    [ELEMENT_TYPES.PHYSICAL]: 1.5,
    [ELEMENT_TYPES.POISON]: 0.5,
    [ELEMENT_TYPES.LIGHTNING]: 0.5,
    [ELEMENT_TYPES.FIRE]: 1.0,
    [ELEMENT_TYPES.ICE]: 1.0,
    [ELEMENT_TYPES.ARCANE]: 1.0,
  },
  [ELEMENT_TYPES.ARCANE]: {
    [ELEMENT_TYPES.FIRE]: 1.25,
    [ELEMENT_TYPES.ICE]: 1.25,
    [ELEMENT_TYPES.LIGHTNING]: 1.25,
    [ELEMENT_TYPES.POISON]: 1.25,
    [ELEMENT_TYPES.ARCANE]: 0.5,
    [ELEMENT_TYPES.PHYSICAL]: 1.0,
  },
  [ELEMENT_TYPES.PHYSICAL]: {
    [ELEMENT_TYPES.FIRE]: 1.0,
    [ELEMENT_TYPES.ICE]: 1.0,
    [ELEMENT_TYPES.LIGHTNING]: 1.0,
    [ELEMENT_TYPES.POISON]: 1.0,
    [ELEMENT_TYPES.ARCANE]: 0.75,
    [ELEMENT_TYPES.PHYSICAL]: 1.0,
  },
};

/**
 * Status effect definitions for each element
 */
const ELEMENT_STATUS_EFFECTS = {
  [ELEMENT_TYPES.FIRE]: {
    name: 'Burn',
    type: 'DOT',
    damagePerTick: 0.05, // 5% of initial damage per tick
    duration: 3, // rounds
    description: 'Takes fire damage each round',
  },
  [ELEMENT_TYPES.ICE]: {
    name: 'Frozen',
    type: 'DEBUFF',
    speedReduction: 0.50, // 50% slower
    duration: 2,
    description: 'Movement and attack speed reduced',
  },
  [ELEMENT_TYPES.LIGHTNING]: {
    name: 'Stunned',
    type: 'STUN',
    skipTurns: 1, // Skip 1 attack round
    duration: 1,
    description: 'Cannot act for 1 round',
  },
  [ELEMENT_TYPES.POISON]: {
    name: 'Poisoned',
    type: 'DOT_DEBUFF',
    damagePerTick: 0.03, // 3% of initial damage per tick
    defenseReduction: 0.20, // 20% defense reduction
    duration: 4,
    description: 'Takes poison damage and has reduced defense',
  },
  [ELEMENT_TYPES.ARCANE]: {
    name: 'Arcane Weakness',
    type: 'DEBUFF',
    damageTakenIncrease: 0.25, // Takes 25% more damage
    duration: 2,
    description: 'Takes increased damage from all sources',
  },
};

/**
 * Enemy type to element mapping
 */
const ENEMY_ELEMENTS = {
  goblin: ELEMENT_TYPES.PHYSICAL,
  skeleton: ELEMENT_TYPES.ARCANE,
  orc: ELEMENT_TYPES.PHYSICAL,
  troll: ELEMENT_TYPES.POISON,
  dragon: ELEMENT_TYPES.FIRE,
  slime: ELEMENT_TYPES.POISON,
  wolf: ELEMENT_TYPES.PHYSICAL,
  wraith: ELEMENT_TYPES.ARCANE,
  elemental_fire: ELEMENT_TYPES.FIRE,
  elemental_ice: ELEMENT_TYPES.ICE,
  elemental_storm: ELEMENT_TYPES.LIGHTNING,
};

class ElementalSystem {
  /**
   * Get effectiveness multiplier for an elemental attack
   * @param {string} attackElement - Attacker's element type
   * @param {string} defenseElement - Defender's element type
   * @returns {number} Damage multiplier (0.5 to 1.5)
   */
  getEffectiveness(attackElement, defenseElement) {
    if (!attackElement || !defenseElement) return 1.0;
    const matrix = EFFECTIVENESS[attackElement];
    if (!matrix) return 1.0;
    return matrix[defenseElement] || 1.0;
  }

  /**
   * Calculate elemental damage with resistances
   * @param {number} baseDamage - Raw damage amount
   * @param {string} attackElement - Element of the attack
   * @param {string} defenderElement - Element of the defender
   * @param {Object} defenderResistances - Resistance values { FIRE: 0.2, ICE: 0.1, ... }
   * @returns {Object} { damage, effectiveness, statusEffect }
   */
  calculateElementalDamage(baseDamage, attackElement, defenderElement, defenderResistances = {}) {
    const effectiveness = this.getEffectiveness(attackElement, defenderElement);
    let damage = baseDamage * effectiveness;

    // Apply resistance (percentage reduction)
    const resistance = defenderResistances[attackElement] || 0;
    damage *= (1 - Math.min(0.75, resistance)); // Cap resistance at 75%

    // Determine if status effect applies (30% chance, higher for super effective)
    let statusEffect = null;
    const statusChance = effectiveness >= 1.25 ? 0.5 : 0.3;
    if (attackElement !== ELEMENT_TYPES.PHYSICAL && Math.random() < statusChance) {
      statusEffect = this.getStatusEffect(attackElement);
    }

    return {
      damage: Math.max(1, Math.floor(damage)),
      effectiveness,
      effectivenessLabel: this.getEffectivenessLabel(effectiveness),
      statusEffect,
    };
  }

  /**
   * Get the status effect for an element
   * @param {string} element - Element type
   * @returns {Object|null} Status effect definition
   */
  getStatusEffect(element) {
    const effect = ELEMENT_STATUS_EFFECTS[element];
    if (!effect) return null;
    return { ...effect, element, remainingDuration: effect.duration };
  }

  /**
   * Apply status effects to a target for one tick/round
   * @param {Object} target - Target with statusEffects array and stats
   * @param {number} initialDamage - The damage that caused the effect (for DOT calc)
   * @returns {Object} { totalDotDamage, expiredEffects }
   */
  processStatusEffects(target, initialDamage = 0) {
    if (!target.statusEffects || target.statusEffects.length === 0) {
      return { totalDotDamage: 0, expiredEffects: [] };
    }

    let totalDotDamage = 0;
    const expiredEffects = [];

    target.statusEffects = target.statusEffects.filter((effect) => {
      // Apply DOT damage
      if (effect.type === 'DOT' || effect.type === 'DOT_DEBUFF') {
        const dotDamage = Math.max(1, Math.floor(initialDamage * effect.damagePerTick));
        totalDotDamage += dotDamage;
      }

      // Decrement duration
      effect.remainingDuration -= 1;

      if (effect.remainingDuration <= 0) {
        expiredEffects.push(effect);
        return false;
      }
      return true;
    });

    return { totalDotDamage, expiredEffects };
  }

  /**
   * Check if target is stunned (cannot act)
   * @param {Object} target - Target with statusEffects
   * @returns {boolean}
   */
  isStunned(target) {
    if (!target.statusEffects) return false;
    return target.statusEffects.some((e) => e.type === 'STUN' && e.remainingDuration > 0);
  }

  /**
   * Get defense modifier from status effects
   * @param {Object} target - Target with statusEffects
   * @returns {number} Defense multiplier (1.0 = no change)
   */
  getDefenseModifier(target) {
    if (!target.statusEffects) return 1.0;
    let modifier = 1.0;
    for (const effect of target.statusEffects) {
      if (effect.defenseReduction) modifier -= effect.defenseReduction;
      if (effect.damageTakenIncrease) modifier -= effect.damageTakenIncrease;
    }
    return Math.max(0.25, modifier);
  }

  /**
   * Get speed modifier from status effects
   * @param {Object} target - Target with statusEffects
   * @returns {number} Speed multiplier
   */
  getSpeedModifier(target) {
    if (!target.statusEffects) return 1.0;
    let modifier = 1.0;
    for (const effect of target.statusEffects) {
      if (effect.speedReduction) modifier -= effect.speedReduction;
    }
    return Math.max(0.1, modifier);
  }

  /**
   * Get element type for an enemy
   * @param {string} enemyType - Enemy type string
   * @returns {string} Element type
   */
  getEnemyElement(enemyType) {
    return ENEMY_ELEMENTS[enemyType] || ELEMENT_TYPES.PHYSICAL;
  }

  /**
   * Generate default resistances for an enemy based on its element
   * @param {string} element - Enemy's element
   * @returns {Object} Resistance map
   */
  generateResistances(element) {
    const resistances = {};
    // Enemies resist their own element by 50%
    resistances[element] = 0.50;
    return resistances;
  }

  /**
   * Get label for effectiveness value
   * @param {number} effectiveness
   * @returns {string}
   */
  getEffectivenessLabel(effectiveness) {
    if (effectiveness >= 1.5) return 'Super Effective!';
    if (effectiveness >= 1.25) return 'Effective';
    if (effectiveness <= 0.5) return 'Resisted';
    if (effectiveness <= 0.75) return 'Not Very Effective';
    return '';
  }
}

// Singleton
const elementalSystem = new ElementalSystem();
export default elementalSystem;
