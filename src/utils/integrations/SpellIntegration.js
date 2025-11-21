/**
 * SpellIntegration.js
 * Integration layer between character attributes and spell system
 *
 * Handles:
 * - Magic attribute affecting spell damage (+2% per point)
 * - Mana cost reduction (0.5% per point, capped at 40%)
 * - Cooldown reduction (0.5% per point, capped at 40%)
 * - Soft caps and diminishing returns
 */

/**
 * Calculate spell damage with Magic attribute scaling
 * @param {object} spell - The spell data
 * @param {object} character - The character data
 * @returns {number} Final spell damage
 */
export function calculateSpellDamage(spell, character) {
  if (!spell || !character) return 0;

  const baseDamage = spell.damage || 0;
  const magic = character.attributes?.magic || 0;

  // Apply soft cap
  const effectiveMagic = applySoftCap(magic, 50, 1.0, 0.5);

  // 2% damage increase per magic point
  const magicBonus = effectiveMagic * 0.02;
  const finalDamage = baseDamage * (1 + magicBonus);

  return finalDamage;
}

/**
 * Calculate mana cost with Magic attribute reduction
 * @param {object} spell - The spell data
 * @param {object} character - The character data
 * @returns {number} Final mana cost
 */
export function calculateManaCost(spell, character) {
  if (!spell) return 0;

  const baseCost = spell.manaCost || 0;
  const magic = character?.attributes?.magic || 0;

  // Apply soft cap
  const effectiveMagic = applySoftCap(magic, 50, 1.0, 0.5);

  // 0.5% mana cost reduction per point, capped at 40%
  const reduction = Math.min(0.40, effectiveMagic * 0.005);
  const finalCost = Math.ceil(baseCost * (1 - reduction));

  return Math.max(1, finalCost); // Minimum 1 mana
}

/**
 * Calculate spell cooldown with Magic attribute reduction
 * @param {object} spell - The spell data
 * @param {object} character - The character data
 * @returns {number} Final cooldown in seconds
 */
export function calculateCooldown(spell, character) {
  if (!spell) return 0;

  const baseCooldown = spell.cooldown || 0;
  const magic = character?.attributes?.magic || 0;

  // Apply soft cap
  const effectiveMagic = applySoftCap(magic, 50, 1.0, 0.5);

  // 0.5% cooldown reduction per point, capped at 40%
  const reduction = Math.min(0.40, effectiveMagic * 0.005);
  const finalCooldown = baseCooldown * (1 - reduction);

  return Math.max(0.5, finalCooldown); // Minimum 0.5s cooldown
}

/**
 * Calculate max mana with Magic attribute
 * @param {object} character - The character data
 * @returns {number} Max mana
 */
export function calculateMaxMana(character) {
  if (!character) return 100;

  const baseMana = 100;
  const magic = character.attributes?.magic || 0;

  // Apply soft cap
  const effectiveMagic = applySoftCap(magic, 50, 1.0, 0.5);

  // 10 mana per magic point
  const magicBonus = effectiveMagic * 10;

  return baseMana + magicBonus;
}

/**
 * Calculate mana regeneration rate with Magic attribute
 * @param {object} character - The character data
 * @returns {number} Mana regen per second
 */
export function calculateManaRegen(character) {
  if (!character) return 10;

  const baseRegen = 10;
  const magic = character.attributes?.magic || 0;

  // Apply soft cap
  const effectiveMagic = applySoftCap(magic, 50, 1.0, 0.5);

  // 0.5 mana/s per magic point
  const magicBonus = effectiveMagic * 0.5;

  return baseRegen + magicBonus;
}

/**
 * Get spell power rating (overall magic effectiveness)
 * @param {object} character - The character data
 * @returns {number} Spell power rating
 */
export function getSpellPower(character) {
  if (!character) return 1.0;

  const magic = character.attributes?.magic || 0;
  const effectiveMagic = applySoftCap(magic, 50, 1.0, 0.5);

  return 1.0 + effectiveMagic * 0.02; // Same as damage scaling
}

/**
 * Check if character can cast spell
 * @param {object} spell - The spell data
 * @param {object} character - The character data
 * @param {object} player - Current player state (health, mana, etc.)
 * @returns {object} { canCast: boolean, reason: string }
 */
export function canCastSpell(spell, character, player) {
  if (!spell) {
    return { canCast: false, reason: 'Invalid spell' };
  }

  if (!player) {
    return { canCast: false, reason: 'Invalid player state' };
  }

  const manaCost = calculateManaCost(spell, character);

  if (player.mana < manaCost) {
    return { canCast: false, reason: `Not enough mana (need ${manaCost}, have ${player.mana})` };
  }

  return { canCast: true, reason: '' };
}

/**
 * Apply spell effects with attribute scaling
 * @param {object} spell - The spell data
 * @param {object} character - The character data
 * @param {object} target - Target of the spell
 * @returns {object} Spell result
 */
export function applySpellEffects(spell, character, target = null) {
  const damage = calculateSpellDamage(spell, character);
  const manaCost = calculateManaCost(spell, character);

  const result = {
    damage,
    manaCost,
    type: spell.type || 'projectile',
    effects: [],
  };

  // Apply different effects based on spell type
  switch (spell.type) {
    case 'heal':
      result.healAmount = damage; // Healing uses same scaling as damage
      result.damage = 0;
      break;

    case 'buff':
      result.buffDuration = spell.duration || 10;
      result.buffStrength = 1.0 + (character.attributes?.magic || 0) * 0.01;
      result.damage = 0;
      break;

    case 'aoe':
      result.radius = spell.radius || 5;
      result.damage = damage;
      break;

    default:
      // Projectile or other damage spell
      result.damage = damage;
  }

  return result;
}

/**
 * Get soft cap information for Magic attribute
 * @returns {object} Soft cap info
 */
export function getSoftCapInfo() {
  return {
    attribute: 'magic',
    softCapThreshold: 50,
    fullEffectiveness: 1.0,
    reducedEffectiveness: 0.5,
    description: 'Magic gains are halved after 50 points',
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
 * SpellIntegration object (for test compatibility)
 */
export const SpellIntegration = {
  calculateSpellDamage,
  calculateManaCost,
  calculateCooldown,
  calculateMaxMana,
  calculateManaRegen,
  getSpellPower,
  canCastSpell,
  applySpellEffects,
  getSoftCapInfo,
};
