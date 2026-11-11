/**
 * devActions.js — Cheats and world controls used by the dev overlay.
 * Plain functions over the game store so they can be unit tested.
 */

import useGameStore from '../../stores/useGameStore';
import { DAY_LENGTH_SECONDS } from '../../data/tuning';
import { MONSTER_TYPES } from '../../systems/survival/RiftManager';
import { game3DSaveManager } from '../../persistence/Game3DSaveManager';

export const DEV_SAVE_SLOT = 'dev-quicksave';

const DEV_MATERIALS = [
  'wood', 'stone', 'dirt', 'sand', 'clay', 'coal', 'iron', 'gold_ore',
  'snow', 'ice', 'berry', 'meat', 'fiber', 'leather', 'bone', 'crystal',
];

let _devEnemyCounter = 0;

const store = () => useGameStore.getState();

/** Restore health, mana, stamina and hunger to full. */
export function healFull() {
  const s = store();
  s.updatePlayer({
    health: s.player.maxHealth,
    mana: s.player.maxMana,
    stamina: s.player.maxStamina,
  });
  s.updateHunger({ current: s.hunger.max, isStarving: false, status: 'well_fed' });
}

export function setGodMode(enabled) {
  store().setDevGodMode(enabled);
}

/** Add `amount` of every common material. */
export function giveMaterials(amount = 50) {
  const s = store();
  for (const mat of DEV_MATERIALS) s.addMaterial(mat, amount);
}

export function giveXP(amount = 500) {
  store().addXP(amount);
}

export function teleportTo(position) {
  if (!position) return false;
  store().teleportPlayer(position);
  return true;
}

/** Teleport above the settlement campfire, if there is one. */
export function teleportToSettlement() {
  const c = store().settlement.settlementCenter;
  return c ? teleportTo([c[0] + 3, c[1] + 6, c[2] + 3]) : false;
}

/** Teleport next to the nearest rift (drops in from above). */
export function teleportToNearestRift() {
  const s = store();
  const p = s.player.position;
  let best = null;
  let bestD = Infinity;
  for (const r of s.rifts) {
    const d = (r.x - p[0]) ** 2 + (r.z - p[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best ? teleportTo([best.x + 8, 70, best.z + 8]) : false;
}

export function teleportToSpawn() {
  return teleportTo([0, 70, 0]);
}

/** Kill every live enemy through its registered hit handler. */
export function killAllEnemies() {
  const handlers = store()._enemyHandlers;
  let killed = 0;
  for (const handler of handlers.values()) {
    handler.takeDamage(1e9);
    killed++;
  }
  return killed;
}

/** Spawn a rift monster of `type` a few units in front of the player. */
export function spawnEnemy(type = 'slime') {
  const template = MONSTER_TYPES[type];
  if (!template) return null;
  const s = store();
  const p = s.player.position;
  const yaw = s.player.facingAngle || 0;
  const id = `dev_${type}_${Date.now()}_${++_devEnemyCounter}`;
  s.addRiftEnemy({
    id,
    type,
    name: template.name,
    health: template.health,
    maxHealth: template.health,
    damage: template.damage,
    speed: template.speed,
    color: template.color,
    xp: template.xp,
    position: [p[0] + Math.sin(yaw) * 6, p[1] + 3, p[2] + Math.cos(yaw) * 6],
  });
  return id;
}

/** Remove transient effects (projectiles, particles, numbers, loot). */
export function clearEffects() {
  useGameStore.setState({
    projectiles: [],
    particleEffects: [],
    damageNumbers: [],
    targetMarkers: [],
    lootDrops: [],
    xpOrbs: [],
    pickupTexts: [],
  });
}

export function setTimeScale(scale) {
  store().setTimeScale(scale);
}

/** Jump to `hour` (0–24) on the current in-game day. */
export function jumpToHour(hour) {
  const s = store();
  const day = Math.max(1, s.worldTime.dayNumber || 1);
  const elapsed = (day - 1) * DAY_LENGTH_SECONDS + (hour / 24) * DAY_LENGTH_SECONDS;
  s.updateWorldTime({ elapsed });
}

export function quickSave() {
  const s = store();
  return game3DSaveManager.saveGame(useGameStore, s._chunkManager, DEV_SAVE_SLOT);
}

export function quickLoad() {
  const s = store();
  return game3DSaveManager.loadGame(useGameStore, s._chunkManager, DEV_SAVE_SLOT);
}

export { MONSTER_TYPES };
