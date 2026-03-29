/**
 * ComboSystem.js
 * Tracks sequential ability usage and triggers combo effects
 */

import { ELEMENT_TYPES } from './ElementalSystem';

/**
 * Combo definitions - sequential element/ability combinations that trigger bonus effects
 */
const COMBO_DEFINITIONS = [
  {
    id: 'shatter',
    name: 'Shatter',
    description: 'Freeze then strike to shatter frozen enemies',
    sequence: [ELEMENT_TYPES.ICE, ELEMENT_TYPES.PHYSICAL],
    bonusDamageMultiplier: 2.0,
    bonusEffect: { type: 'STUN', duration: 2, name: 'Shattered' },
    icon: '\u2744\uFE0F\uD83D\uDCA5',
  },
  {
    id: 'ignite',
    name: 'Ignite',
    description: 'Double fire attack for massive burn damage',
    sequence: [ELEMENT_TYPES.FIRE, ELEMENT_TYPES.FIRE],
    bonusDamageMultiplier: 1.5,
    bonusEffect: { type: 'DOT', damagePerTick: 0.10, duration: 4, name: 'Inferno' },
    icon: '\uD83D\uDD25\uD83D\uDD25',
  },
  {
    id: 'electrocute',
    name: 'Electrocute',
    description: 'Shock a wet or frozen target for double damage',
    sequence: [ELEMENT_TYPES.ICE, ELEMENT_TYPES.LIGHTNING],
    bonusDamageMultiplier: 2.5,
    bonusEffect: { type: 'STUN', duration: 2, name: 'Electrocuted' },
    icon: '\u2744\uFE0F\u26A1',
  },
  {
    id: 'meltdown',
    name: 'Meltdown',
    description: 'Fire followed by lightning causes an explosive reaction',
    sequence: [ELEMENT_TYPES.FIRE, ELEMENT_TYPES.LIGHTNING],
    bonusDamageMultiplier: 1.75,
    bonusEffect: { type: 'DOT', damagePerTick: 0.08, duration: 3, name: 'Meltdown' },
    icon: '\uD83D\uDD25\u26A1',
  },
  {
    id: 'corrosion',
    name: 'Corrosion',
    description: 'Poison weakens defenses, then arcane pierces through',
    sequence: [ELEMENT_TYPES.POISON, ELEMENT_TYPES.ARCANE],
    bonusDamageMultiplier: 1.8,
    bonusEffect: { type: 'DOT_DEBUFF', damagePerTick: 0.05, defenseReduction: 0.40, duration: 3, name: 'Corroded' },
    icon: '\u2620\uFE0F\uD83D\uDD2E',
  },
  {
    id: 'frostfire',
    name: 'Frostfire',
    description: 'Extreme temperature shift deals massive damage',
    sequence: [ELEMENT_TYPES.FIRE, ELEMENT_TYPES.ICE],
    bonusDamageMultiplier: 2.0,
    bonusEffect: { type: 'DEBUFF', speedReduction: 0.70, duration: 3, name: 'Thermal Shock' },
    icon: '\uD83D\uDD25\u2744\uFE0F',
  },
  {
    id: 'toxic_storm',
    name: 'Toxic Storm',
    description: 'Lightning electrifies poison for area damage',
    sequence: [ELEMENT_TYPES.POISON, ELEMENT_TYPES.LIGHTNING],
    bonusDamageMultiplier: 1.6,
    bonusEffect: { type: 'DOT', damagePerTick: 0.07, duration: 5, name: 'Toxic Storm' },
    icon: '\u2620\uFE0F\u26A1',
  },
  {
    id: 'arcane_shatter',
    name: 'Arcane Shatter',
    description: 'Arcane energy amplifies ice into devastating crystals',
    sequence: [ELEMENT_TYPES.ARCANE, ELEMENT_TYPES.ICE],
    bonusDamageMultiplier: 2.0,
    bonusEffect: { type: 'DEBUFF', damageTakenIncrease: 0.35, duration: 3, name: 'Crystal Prison' },
    icon: '\uD83D\uDD2E\u2744\uFE0F',
  },
  {
    id: 'triple_strike',
    name: 'Triple Strike',
    description: 'Three physical hits in a row triggers a devastating combo',
    sequence: [ELEMENT_TYPES.PHYSICAL, ELEMENT_TYPES.PHYSICAL, ELEMENT_TYPES.PHYSICAL],
    bonusDamageMultiplier: 3.0,
    bonusEffect: { type: 'STUN', duration: 1, name: 'Staggered' },
    icon: '\u2694\uFE0F\u2694\uFE0F\u2694\uFE0F',
  },
  {
    id: 'elemental_overload',
    name: 'Elemental Overload',
    description: 'Three different elements trigger massive explosion',
    sequence: null, // Special: any 3 different non-physical elements
    bonusDamageMultiplier: 2.5,
    bonusEffect: { type: 'DOT', damagePerTick: 0.12, duration: 3, name: 'Overloaded' },
    icon: '\uD83C\uDF0A\uD83D\uDD25\u26A1',
    isSpecial: true,
  },
];

class ComboSystem {
  constructor() {
    // Track recent attacks per party (keyed by entity id)
    this.recentAttacks = new Map();
    this.maxHistory = 5;
  }

  /**
   * Record an attack element for combo tracking
   * @param {string} entityId - Attacker's ID
   * @param {string} element - Element of the attack
   */
  recordAttack(entityId, element) {
    if (!this.recentAttacks.has(entityId)) {
      this.recentAttacks.set(entityId, []);
    }
    const history = this.recentAttacks.get(entityId);
    history.push(element);
    if (history.length > this.maxHistory) {
      history.shift();
    }
  }

  /**
   * Check if a combo has been triggered
   * @param {string} entityId - Attacker's ID
   * @returns {Object|null} Combo definition if triggered, null otherwise
   */
  checkCombo(entityId) {
    const history = this.recentAttacks.get(entityId);
    if (!history || history.length < 2) return null;

    // Check special combos first (elemental overload)
    for (const combo of COMBO_DEFINITIONS) {
      if (combo.isSpecial) {
        if (this._checkSpecialCombo(combo, history)) {
          this._consumeCombo(entityId, 3);
          return combo;
        }
        continue;
      }

      // Check sequence match from the end of history
      const seq = combo.sequence;
      if (history.length < seq.length) continue;

      const recentSlice = history.slice(-seq.length);
      const matches = seq.every((el, i) => recentSlice[i] === el);

      if (matches) {
        this._consumeCombo(entityId, seq.length);
        return combo;
      }
    }

    return null;
  }

  /**
   * Check special combo conditions
   * @private
   */
  _checkSpecialCombo(combo, history) {
    if (combo.id === 'elemental_overload') {
      // Need 3 different non-physical elements in last 3 attacks
      if (history.length < 3) return false;
      const last3 = history.slice(-3);
      const nonPhysical = last3.filter((e) => e !== ELEMENT_TYPES.PHYSICAL);
      if (nonPhysical.length < 3) return false;
      const unique = new Set(nonPhysical);
      return unique.size >= 3;
    }
    return false;
  }

  /**
   * Remove used elements from combo history
   * @private
   */
  _consumeCombo(entityId, count) {
    const history = this.recentAttacks.get(entityId);
    if (history) {
      history.splice(-count, count);
    }
  }

  /**
   * Apply combo bonus to damage
   * @param {number} baseDamage - Damage before combo
   * @param {Object} combo - Combo definition
   * @returns {Object} { damage, comboName, bonusEffect }
   */
  applyCombo(baseDamage, combo) {
    const damage = Math.floor(baseDamage * combo.bonusDamageMultiplier);
    const bonusEffect = combo.bonusEffect
      ? { ...combo.bonusEffect, remainingDuration: combo.bonusEffect.duration }
      : null;

    return {
      damage,
      comboName: combo.name,
      comboIcon: combo.icon,
      bonusEffect,
    };
  }

  /**
   * Get all available combo definitions for UI display
   * @returns {Object[]} Array of combo definitions
   */
  getComboList() {
    return COMBO_DEFINITIONS.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      sequence: c.sequence,
      icon: c.icon,
      bonusDamageMultiplier: c.bonusDamageMultiplier,
    }));
  }

  /**
   * Clear combo history for an entity
   * @param {string} entityId
   */
  clearHistory(entityId) {
    this.recentAttacks.delete(entityId);
  }

  /**
   * Clear all combo history
   */
  reset() {
    this.recentAttacks.clear();
  }
}

// Singleton
const comboSystem = new ComboSystem();
export default comboSystem;
