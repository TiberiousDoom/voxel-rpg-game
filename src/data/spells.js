import { damageEnemy, getEnemiesInRadius, getEnemyPosition, isEnemyHittable, rollPlayerDamage } from '../systems/combat/enemyHits';
import { Flame, Zap, Snowflake, Wind, Heart, Shield, Wand2, Cloud, Zap as Lightning, Droplets, Skull } from 'lucide-react';

/**
 * Expanded Magic System - Spell Database
 *
 * Spell Categories:
 * - Damage: Direct damage spells
 * - Control: CC and utility spells
 * - Support: Healing and buffs
 * - Status: Debuff spells
 */

export const SPELL_CATEGORIES = {
  DAMAGE: 'damage',
  CONTROL: 'control',
  SUPPORT: 'support',
  STATUS: 'status',
};

export const SPELL_TYPES = {
  PROJECTILE: 'projectile',      // Single projectile
  AOE: 'aoe',                      // Area of effect explosion
  BEAM: 'beam',                    // Channeled beam
  BUFF: 'buff',                    // Self-buff
  HEAL: 'heal',                    // Healing spell
  DEBUFF: 'debuff',                // Enemy debuff
};

export const STATUS_EFFECTS = {
  STUN: 'stun',           // 0.5s immobilization
  FREEZE: 'freeze',       // 50% slow
  POISON: 'poison',       // Damage over time
  BURN: 'burn',           // Increased damage taken
  SLOW: 'slow',           // 30% slow
  SHIELD: 'shield',       // Damage reduction
  HASTE: 'haste',         // 30% speed boost
};

/**
 * Core Spell Definitions
 *
 * Common properties:
 * - name: Display name
 * - icon: Lucide icon component
 * - color: Hex color code
 * - category: Spell category (damage, control, support, status)
 * - type: Spell type (projectile, aoe, beam, buff, heal, debuff)
 * - manaCost: Mana consumed
 * - cooldown: Cooldown in seconds
 * - damage: Base damage (0 for non-damage spells)
 * - speed: Projectile speed (0 for non-projectile)
 * - range: Maximum range
 * - key: Keyboard shortcut (1-0)
 *
 * Type-specific properties:
 * - aoeRadius: AOE blast radius
 * - duration: Effect duration in seconds
 * - effectType: Status effect type
 * - effectValue: Effect magnitude (damage per tick, % slow, etc)
 * - healAmount: Amount healed
 * - buffAmount: Buff value
 */

export const SPELLS = [
  // ==== TIER 1: BASIC DAMAGE SPELLS ====
  {
    id: 'fireball',
    name: 'Fireball',
    icon: Flame,
    color: '#ff6b00',
    category: SPELL_CATEGORIES.DAMAGE,
    type: SPELL_TYPES.PROJECTILE,
    manaCost: 20,
    cooldown: 0.5,
    damage: 20,
    speed: 20,
    range: 100,
    key: '1',
    description: 'Launch a fireball that explodes on impact.',
  },
  {
    id: 'lightning',
    name: 'Lightning Bolt',
    icon: Zap,
    color: '#00bfff',
    category: SPELL_CATEGORIES.DAMAGE,
    type: SPELL_TYPES.PROJECTILE,
    manaCost: 30,
    cooldown: 0.8,
    damage: 40,
    speed: 30,
    range: 100,
    key: '2',
    description: 'Fast lightning projectile with high damage.',
  },
  {
    id: 'iceShard',
    name: 'Ice Shard',
    icon: Snowflake,
    color: '#a8dadc',
    category: SPELL_CATEGORIES.DAMAGE,
    type: SPELL_TYPES.PROJECTILE,
    manaCost: 25,
    cooldown: 0.6,
    damage: 25,
    speed: 25,
    range: 100,
    key: '3',
    description: 'Frozen shard that slows enemies on hit.',
    effectType: STATUS_EFFECTS.FREEZE,
    effectValue: 0.5,
    effectDuration: 3,
  },
  {
    id: 'windBlast',
    name: 'Wind Blast',
    icon: Wind,
    color: '#90e0ef',
    category: SPELL_CATEGORIES.CONTROL,
    type: SPELL_TYPES.PROJECTILE,
    manaCost: 15,
    cooldown: 0.4,
    damage: 15,
    speed: 35,
    range: 100,
    key: '4',
    description: 'Fast wind projectile with knockback effect.',
  },

  // ==== TIER 2: ENHANCED DAMAGE SPELLS ====
  {
    id: 'meteor',
    name: 'Meteor',
    icon: Flame,
    color: '#ff4500',
    category: SPELL_CATEGORIES.DAMAGE,
    type: SPELL_TYPES.AOE,
    manaCost: 50,
    cooldown: 2,
    damage: 50,
    speed: 15,
    range: 100,
    aoeRadius: 8,
    key: '5',
    description: 'Summon a meteor that explodes in a large area.',
  },
  {
    id: 'chainLightning',
    name: 'Chain Lightning',
    icon: Lightning,
    color: '#0099ff',
    category: SPELL_CATEGORIES.DAMAGE,
    type: SPELL_TYPES.PROJECTILE,
    manaCost: 40,
    cooldown: 1.2,
    damage: 35,
    speed: 28,
    range: 100,
    key: '6',
    description: 'Lightning that chains to nearby enemies.',
    chainCount: 3,
    chainRange: 15,
  },
  {
    id: 'poisonCloud',
    name: 'Poison Cloud',
    icon: Cloud,
    color: '#8b00ff',
    category: SPELL_CATEGORIES.STATUS,
    type: SPELL_TYPES.AOE,
    manaCost: 35,
    cooldown: 1.5,
    damage: 10,
    speed: 12,
    range: 80,
    aoeRadius: 6,
    key: '7',
    description: 'Toxic cloud that deals poison damage over time.',
    effectType: STATUS_EFFECTS.POISON,
    effectValue: 5,
    effectDuration: 5,
  },
  {
    id: 'frostNova',
    name: 'Frost Nova',
    icon: Snowflake,
    color: '#6ee7ff',
    category: SPELL_CATEGORIES.CONTROL,
    type: SPELL_TYPES.AOE,
    manaCost: 45,
    cooldown: 2,
    damage: 30,
    speed: 0,
    range: 15,
    aoeRadius: 12,
    key: '8',
    description: 'Freeze all nearby enemies in place.',
    effectType: STATUS_EFFECTS.STUN,
    effectDuration: 2,
  },

  // ==== TIER 3: SUPPORT & HEALING ====
  {
    id: 'heal',
    name: 'Heal',
    icon: Heart,
    color: '#ff69b4',
    category: SPELL_CATEGORIES.SUPPORT,
    type: SPELL_TYPES.HEAL,
    manaCost: 30,
    cooldown: 1,
    damage: 0,
    speed: 0,
    range: 0,
    key: '9',
    description: 'Restore your health.',
    healAmount: 50,
  },
  {
    id: 'shield',
    name: 'Shield Spell',
    icon: Shield,
    color: '#ffd700',
    category: SPELL_CATEGORIES.SUPPORT,
    type: SPELL_TYPES.BUFF,
    manaCost: 40,
    cooldown: 1.5,
    damage: 0,
    speed: 0,
    range: 0,
    key: '0',
    description: 'Create a protective shield that absorbs damage.',
    effectType: STATUS_EFFECTS.SHIELD,
    effectValue: 30,
    effectDuration: 8,
  },
  {
    id: 'haste',
    name: 'Haste',
    icon: Wind,
    color: '#00ff00',
    category: SPELL_CATEGORIES.SUPPORT,
    type: SPELL_TYPES.BUFF,
    manaCost: 25,
    cooldown: 2,
    damage: 0,
    speed: 0,
    range: 0,
    key: 'q',
    description: 'Increase your movement and attack speed.',
    effectType: STATUS_EFFECTS.HASTE,
    effectValue: 1.3,
    effectDuration: 6,
  },

  // ==== TIER 4: ADVANCED SPELLS ====
  {
    id: 'inferno',
    name: 'Inferno',
    icon: Flame,
    color: '#ff0000',
    category: SPELL_CATEGORIES.DAMAGE,
    type: SPELL_TYPES.AOE,
    manaCost: 60,
    cooldown: 3,
    damage: 60,
    speed: 0,
    range: 12,
    aoeRadius: 15,
    key: 'e',
    description: 'Unleash a massive fire explosion around you.',
    effectType: STATUS_EFFECTS.BURN,
    effectValue: 8,
    effectDuration: 4,
  },
  {
    id: 'arcaneBarrage',
    name: 'Arcane Barrage',
    icon: Wand2,
    color: '#9966ff',
    category: SPELL_CATEGORIES.DAMAGE,
    type: SPELL_TYPES.PROJECTILE,
    manaCost: 35,
    cooldown: 0.7,
    damage: 18,
    speed: 25,
    range: 100,
    key: 'r',
    description: 'Fire multiple arcane bolts in sequence.',
    burstCount: 3,
    burstDelay: 0.15,
  },
  {
    id: 'waterjet',
    name: 'Water Jet',
    icon: Droplets,
    color: '#4da6ff',
    category: SPELL_CATEGORIES.CONTROL,
    type: SPELL_TYPES.PROJECTILE,
    manaCost: 32,
    cooldown: 1,
    damage: 28,
    speed: 24,
    range: 100,
    key: 'f',
    description: 'Pressurized water that knocks enemies back.',
  },

  // ==== ULTIMATE/SIGNATURE SPELLS ====
  {
    id: 'deathRay',
    name: 'Death Ray',
    icon: Skull,
    color: '#000000',
    category: SPELL_CATEGORIES.DAMAGE,
    type: SPELL_TYPES.BEAM,
    manaCost: 80,
    cooldown: 5,
    damage: 100,
    speed: 0,
    range: 150,
    key: 't',
    description: 'Unleash a devastating beam of pure destruction.',
    duration: 1.5,
    beamWidth: 2,
  },
];

// Helper functions
export const getSpellById = (id) => SPELLS.find(s => s.id === id);

export const getSpellsByCategory = (category) =>
  SPELLS.filter(s => s.category === category);

export const getSpellsByType = (type) =>
  SPELLS.filter(s => s.type === type);

export const getSpellByKey = (key) =>
  SPELLS.find(s => s.key === key);

// Unique projectile/effect IDs (Date.now() alone collides when two casts land in one frame)
let _spellEntityCounter = 0;
const nextSpellEntityId = (prefix) => `${prefix}_${Date.now()}_${++_spellEntityCounter}`;

// Fallback distance for targeted AOE spells (meteor, poison cloud) with no enemy in sight
const AOE_DEFAULT_TARGET_DISTANCE = 10;

/**
 * Spell execution pipeline
 */
export const executeSpell = (spell, player, store) => {
  // Validate mana
  if (player.mana < spell.manaCost) {
    return { success: false, error: 'Not enough mana' };
  }

  // Validate cooldown (checked elsewhere)

  // Consume mana
  store.consumeMana(spell.manaCost);

  // Execute based on type
  switch (spell.type) {
    case SPELL_TYPES.PROJECTILE:
      return executeProjectileSpell(spell, player, store);
    case SPELL_TYPES.AOE:
      return executeAOESpell(spell, player, store);
    case SPELL_TYPES.HEAL:
      return executeHealSpell(spell, player, store);
    case SPELL_TYPES.BUFF:
      return executeBuffSpell(spell, player, store);
    case SPELL_TYPES.BEAM:
      return executeBeamSpell(spell, player, store);
    default:
      return { success: false, error: 'Unknown spell type' };
  }
};

/**
 * Calculate pitch angle to aim at the nearest enemy in the player's facing direction.
 * Returns 0 if no suitable target found (shoots horizontal as fallback).
 */
function calcAutoAimPitch(player, store) {
  const state = store.getState ? store.getState() : store;
  const enemies = state.enemies;
  if (!enemies || enemies.length === 0) return 0;

  // Use live physics positions (updated each frame by Enemy.jsx)
  const livePositions = state._enemyPositions;

  const yaw = player.facingAngle;
  const fwdX = Math.sin(yaw);
  const fwdZ = Math.cos(yaw);
  const castY = player.position[1] + 1.5; // spell origin height

  let bestDist = Infinity;
  let bestPitch = 0;

  for (const enemy of enemies) {
    // Prefer live physics position, fall back to store position
    const pos = (livePositions && livePositions.get(enemy.id)) || enemy.position;
    if (!pos) continue;
    const dx = pos[0] - player.position[0];
    const dz = pos[2] - player.position[2];
    const horizDist = Math.sqrt(dx * dx + dz * dz);
    if (horizDist < 1 || horizDist > 60) continue;

    // Check if enemy is roughly in facing direction (within ~60° cone)
    const dot = (dx * fwdX + dz * fwdZ) / horizDist;
    if (dot < 0.5) continue;

    if (horizDist < bestDist) {
      bestDist = horizDist;
      // Aim at enemy center (position + ~1 unit up for body center)
      const dy = (pos[1] + 1) - castY;
      bestPitch = Math.atan2(dy, horizDist);
    }
  }

  return bestPitch;
}

const executeProjectileSpell = (spell, player, store) => {
  const camera = store.camera || (store.getState ? store.getState().camera : null);
  let direction;

  if (player.aimTarget) {
    // Aim at a specific world position (click/tap target)
    const dx = player.aimTarget[0] - player.position[0];
    const dy = player.aimTarget[1] - (player.position[1] + 1.5);
    const dz = player.aimTarget[2] - player.position[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    direction = [dx / len, dy / len, dz / len];
  } else {
    // Fall back to facing angle + auto-aim pitch
    const pitch = camera?.firstPerson ? (camera.pitch || 0) : calcAutoAimPitch(player, store);
    const yaw = player.facingAngle;
    direction = [
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ];
  }

  // Spawn projectile 2 units ahead of the player to clear the collider
  const spawnOffset = 2;
  const spawnPos = [
    player.position[0] + direction[0] * spawnOffset,
    player.position[1] + 1.5 + direction[1] * spawnOffset,
    player.position[2] + direction[2] * spawnOffset,
  ];

  // Handle burst spells (Arcane Barrage)
  if (spell.burstCount) {
    for (let i = 0; i < spell.burstCount; i++) {
      setTimeout(() => {
        store.addProjectile({
          id: nextSpellEntityId('projectile'),
          position: spawnPos,
          direction,
          speed: spell.speed,
          damage: spell.damage,
          color: spell.color,
          spellId: spell.id,
          effectType: spell.effectType,
          effectValue: spell.effectValue,
          effectDuration: spell.effectDuration,
          aoeRadius: spell.aoeRadius,
          type: spell.type,
        });
      }, i * (spell.burstDelay * 1000));
    }
  } else {
    store.addProjectile({
      id: nextSpellEntityId('projectile'),
      position: spawnPos,
      direction,
      speed: spell.speed,
      damage: spell.damage,
      color: spell.color,
      spellId: spell.id,
      effectType: spell.effectType,
      effectValue: spell.effectValue,
      effectDuration: spell.effectDuration,
      aoeRadius: spell.aoeRadius,
      type: spell.type,
    });
  }

  return { success: true };
};

/**
 * Pick the centre of an AOE spell.
 * - Self-centred spells (speed 0: frost nova, inferno) explode on the player.
 * - Targeted spells (meteor, poison cloud) hit the click/tap target, else the
 *   nearest enemy in the facing cone within range, else a point ahead.
 */
function getAOECenter(spell, player, state) {
  if (!spell.speed) return [player.position[0], player.position[1], player.position[2]];
  if (player.aimTarget) return player.aimTarget;

  const fwdX = Math.sin(player.facingAngle);
  const fwdZ = Math.cos(player.facingAngle);
  let best = null;
  let bestDist = Infinity;
  for (const enemy of state.enemies || []) {
    if (!isEnemyHittable(state, enemy)) continue;
    const pos = getEnemyPosition(state, enemy);
    if (!pos) continue;
    const dx = pos[0] - player.position[0];
    const dz = pos[2] - player.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.5 || dist > (spell.range || 50)) continue;
    if ((dx * fwdX + dz * fwdZ) / dist < 0.5) continue; // ~60° cone
    if (dist < bestDist) {
      bestDist = dist;
      best = pos;
    }
  }
  if (best) return best;
  return [
    player.position[0] + fwdX * AOE_DEFAULT_TARGET_DISTANCE,
    player.position[1],
    player.position[2] + fwdZ * AOE_DEFAULT_TARGET_DISTANCE,
  ];
}

const executeAOESpell = (spell, player, store) => {
  const state = store.getState ? store.getState() : store;
  const center = getAOECenter(spell, player, state);
  const radius = spell.aoeRadius || 5;

  // Damage + status effect on every enemy inside the blast radius
  const statusEffect = spell.effectType
    ? { type: spell.effectType, duration: spell.effectDuration || spell.duration || 0, value: spell.effectValue || 0 }
    : null;
  const targets = getEnemiesInRadius(state, center, radius);
  for (const { enemy } of targets) {
    const { damage } = rollPlayerDamage(state.player, spell.damage || 0);
    if (spell.damage > 0) {
      damageEnemy(state, enemy, damage, statusEffect);
    } else if (statusEffect) {
      state._enemyHandlers?.get(enemy.id)?.applyStatusEffect(statusEffect);
    }
  }
  if (targets.length > 0 && spell.damage > 0) {
    store.triggerScreenShake?.(Math.min(0.3 + spell.damage / 150, 0.8), 0.25);
  }

  store.addParticleEffect({
    id: nextSpellEntityId('aoe'),
    position: [center[0], center[1] + 0.5, center[2]],
    color: spell.color,
    type: 'burst',
    count: 50,
    radius,
    spellId: spell.id,
  });

  return { success: true, hits: targets.length };
};

const executeHealSpell = (spell, player, store) => {
  store.healPlayer(spell.healAmount);
  store.addParticleEffect({
    id: nextSpellEntityId('heal'),
    position: [player.position[0], player.position[1] + 2.5, player.position[2]],
    color: spell.color,
    type: 'heal',
    count: 20,
  });

  return { success: true };
};

const executeBuffSpell = (spell, player, store) => {
  store.addStatusEffect({
    type: spell.effectType,
    duration: spell.effectDuration,
    value: spell.effectValue,
    spellId: spell.id,
  });

  store.addParticleEffect({
    id: nextSpellEntityId('buff'),
    position: [player.position[0], player.position[1] + 2.5, player.position[2]],
    color: spell.color,
    type: 'buff',
    count: 15,
  });

  return { success: true };
};

const executeBeamSpell = (spell, player, store) => {
  // Create beam projectile that travels far
  const camera = store.camera || (store.getState ? store.getState().camera : null);
  const pitch = camera?.firstPerson ? (camera.pitch || 0) : calcAutoAimPitch(player, store);
  const yaw = player.facingAngle;
  const direction = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];

  // Spawn beam 2 units ahead to clear player collider
  const spawnOffset = 2;
  store.addProjectile({
    id: nextSpellEntityId('beam'),
    position: [
      player.position[0] + direction[0] * spawnOffset,
      player.position[1] + 1.5 + direction[1] * spawnOffset,
      player.position[2] + direction[2] * spawnOffset,
    ],
    direction,
    speed: 50,
    damage: spell.damage,
    color: spell.color,
    spellId: spell.id,
    type: SPELL_TYPES.BEAM,
    beamWidth: spell.beamWidth,
    lifetime: spell.duration,
  });

  return { success: true };
};

export default SPELLS;
