/**
 * enemyHits.js — Shared helpers for damaging enemies by id.
 *
 * Rift enemies are plain data objects in the store; their health and physics
 * body live inside the Enemy component, which registers hit handlers in
 * `store._enemyHandlers` and live positions in `store._enemyPositions`.
 * Legacy Monster-class enemies (with their own takeDamage/alive) are still
 * supported through store.attackMonster.
 */

/**
 * Get an enemy's current world position as [x, y, z], preferring the live
 * physics position over the (spawn-time) store position.
 */
export function getEnemyPosition(store, enemy) {
  const live = store._enemyPositions?.get(enemy.id);
  if (live) return live;
  const p = enemy.position;
  if (!p) return null;
  if (Array.isArray(p)) return p;
  return [p.x ?? 0, p.y ?? 0, p.z ?? 0];
}

/** Whether an enemy can currently be hit. */
export function isEnemyHittable(store, enemy) {
  if (enemy.alive === false) return false;
  return store._enemyHandlers?.has(enemy.id) || typeof enemy.takeDamage === 'function';
}

/**
 * Roll a critical hit using the player's crit stats.
 * @returns {{ damage: number, isCrit: boolean }}
 */
export function rollPlayerDamage(player, baseDamage) {
  const isCrit = Math.random() * 100 < (player.critChance || 0);
  const mult = isCrit ? (player.critDamage || 150) / 100 : 1;
  return { damage: Math.max(1, Math.round(baseDamage * mult)), isCrit };
}

/**
 * Deal damage to an enemy (and optionally apply a status effect).
 * @returns {boolean} true if the hit landed
 */
export function damageEnemy(store, enemy, amount, statusEffect = null) {
  const handler = store._enemyHandlers?.get(enemy.id);
  if (handler) {
    handler.takeDamage(amount);
    if (statusEffect) handler.applyStatusEffect(statusEffect);
    return true;
  }
  if (typeof enemy.takeDamage === 'function' && enemy.alive !== false) {
    // Legacy Monster instance: store handles crits, loot and AI notifications
    return store.attackMonster(enemy.id);
  }
  return false;
}

/**
 * Collect enemies whose horizontal distance from `center` is within `radius`.
 * @returns {Array<{ enemy: Object, position: number[], distance: number }>}
 */
export function getEnemiesInRadius(store, center, radius) {
  const result = [];
  const r2 = radius * radius;
  for (const enemy of store.enemies || []) {
    if (!isEnemyHittable(store, enemy)) continue;
    const pos = getEnemyPosition(store, enemy);
    if (!pos) continue;
    const dx = pos[0] - center[0];
    const dz = pos[2] - center[2];
    const d2 = dx * dx + dz * dz;
    if (d2 <= r2) result.push({ enemy, position: pos, distance: Math.sqrt(d2) });
  }
  return result;
}
