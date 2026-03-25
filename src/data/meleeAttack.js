/**
 * meleeAttack.js — Player melee combat system.
 *
 * Handles cone-based hit detection and damage application for melee attacks.
 * Used as a fallback when spells can't fire (no mana, on cooldown, no spell).
 * Also used when the player explicitly has a melee weapon equipped.
 *
 * Hit detection: cone sweep in the player's facing direction.
 * Damage: weapon damage (if equipped) or MELEE_BASE_DAMAGE (bare hands).
 * Applies knockback to hit enemies.
 */

import {
  MELEE_RANGE,
  MELEE_CONE_ANGLE,
  MELEE_COOLDOWN,
  MELEE_BASE_DAMAGE,
  MELEE_KNOCKBACK,
} from './tuning';

// Convert degrees to radians once
const CONE_HALF_ANGLE_RAD = (MELEE_CONE_ANGLE * Math.PI) / 180;

/**
 * Attempt a melee attack. Returns true if an attack was performed.
 *
 * @param {Object} store - useGameStore.getState()
 * @param {number[]} playerPos - [x, y, z]
 * @param {number} facingAngle - Player's facing direction (radians, from camera yaw)
 * @param {Object[]} enemies - store.enemies array
 * @returns {{ hit: boolean, enemiesHit: number }}
 */
export function performMeleeAttack(store, playerPos, facingAngle, enemies) {
  if (!enemies || enemies.length === 0) {
    return { hit: false, enemiesHit: 0 };
  }

  const px = playerPos[0];
  const pz = playerPos[2];

  // Facing direction as a unit vector
  const faceDirX = Math.sin(facingAngle);
  const faceDirZ = Math.cos(facingAngle);

  let enemiesHit = 0;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (!enemy.position) continue;

    const ex = enemy.position[0] ?? enemy.position.x;
    const ez = enemy.position[2] ?? enemy.position.z;

    // Distance check
    const dx = ex - px;
    const dz = ez - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > MELEE_RANGE) continue;

    // Cone angle check — dot product between facing direction and enemy direction
    if (dist > 0.1) {
      const toEnemyX = dx / dist;
      const toEnemyZ = dz / dist;
      const dot = faceDirX * toEnemyX + faceDirZ * toEnemyZ;
      // dot = cos(angle between facing and enemy direction)
      if (dot < Math.cos(CONE_HALF_ANGLE_RAD)) continue;
    }

    // Hit! Use store.attackMonster which handles damage calc, crits, numbers, loot
    store.attackMonster(enemy.id);
    enemiesHit++;
  }

  return { hit: enemiesHit > 0, enemiesHit };
}

/**
 * Get the melee damage for the current player state.
 * Weapon damage if weapon equipped, otherwise bare hands.
 *
 * @param {Object} store - useGameStore.getState()
 * @returns {number}
 */
export function getMeleeDamage(store) {
  const weapon = store.equipment?.weapon;
  if (weapon && weapon.stats?.damage) {
    return weapon.stats.damage;
  }
  return MELEE_BASE_DAMAGE;
}

/**
 * Check if a spell can be cast (has mana, not on cooldown, spell exists).
 * @param {Object} store
 * @returns {boolean}
 */
export function canCastSpell(store) {
  const { getSpellById } = require('./spells');
  const spell = getSpellById(store.activeSpellId);
  if (!spell) return false;
  if (store.player.mana < spell.manaCost) return false;
  const cooldown = store.getSpellCooldown(spell.id);
  if (cooldown > 0) return false;
  return true;
}

export { MELEE_COOLDOWN, MELEE_KNOCKBACK };
