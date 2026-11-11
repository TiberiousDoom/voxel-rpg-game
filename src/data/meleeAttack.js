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
import { audioManager } from '../utils/AudioManager';
import { getSpellById } from './spells';
import { getEnemyPosition, isEnemyHittable, rollPlayerDamage } from '../systems/combat/enemyHits';

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
  const minDot = Math.cos(CONE_HALF_ANGLE_RAD);

  // Base damage: weapon damage, or the player's (level-scaled) damage, never below bare hands
  const baseDamage = Math.max(getMeleeDamage(store), store.player?.damage || 0);

  let enemiesHit = 0;

  for (const enemy of enemies) {
    if (!isEnemyHittable(store, enemy)) continue;
    // Use the live physics position — store positions are spawn-time only
    const pos = getEnemyPosition(store, enemy);
    if (!pos) continue;

    // Distance check
    const dx = pos[0] - px;
    const dz = pos[2] - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > MELEE_RANGE) continue;

    // Cone angle check — dot product between facing direction and enemy direction
    if (dist > 0.1) {
      const dot = (faceDirX * dx + faceDirZ * dz) / dist;
      if (dot < minDot) continue;
    }

    const handler = store._enemyHandlers?.get(enemy.id);
    if (handler) {
      const { damage } = rollPlayerDamage(store.player, baseDamage);
      handler.takeDamage(damage); // Enemy shows the damage number + knockback
    } else {
      // Legacy Monster instance: store.attackMonster handles crits, numbers, loot
      store.attackMonster(enemy.id);
    }
    enemiesHit++;
  }

  if (enemiesHit > 0) {
    audioManager.play('playerAttack');
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
  const spell = getSpellById(store.activeSpellId);
  if (!spell) return false;
  if (store.player.mana < spell.manaCost) return false;
  const cooldown = store.getSpellCooldown(spell.id);
  if (cooldown > 0) return false;
  return true;
}

export { MELEE_COOLDOWN, MELEE_KNOCKBACK };
