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

const executeProjectileSpell = (spell, player, store) => {
  const direction = [
    Math.sin(player.facingAngle),
    0,
    Math.cos(player.facingAngle),
  ];

  // Handle burst spells (Arcane Barrage)
  if (spell.burstCount) {
    for (let i = 0; i < spell.burstCount; i++) {
      setTimeout(() => {
        store.addProjectile({
          id: `projectile_${Date.now()}_${i}`,
          position: [player.position[0], player.position[1] + 1, player.position[2]],
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
      id: `projectile_${Date.now()}`,
      position: [player.position[0], player.position[1] + 1, player.position[2]],
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

const executeAOESpell = (spell, player, store) => {
  const now = Date.now();

  store.addParticleEffect({
    id: `aoe_${now}`,
    position: [player.position[0], player.position[1] + 0.5, player.position[2]],
    color: spell.color,
    type: 'burst',
    count: 50,
    radius: spell.aoeRadius,
    spellId: spell.id,
    damage: spell.damage,
    effectType: spell.effectType,
    effectValue: spell.effectValue,
    effectDuration: spell.effectDuration,
    aoeRadius: spell.aoeRadius,
  });

  return { success: true };
};

const executeHealSpell = (spell, player, store) => {
  store.healPlayer(spell.healAmount);
  store.addParticleEffect({
    id: `heal_${Date.now()}`,
    position: [player.position[0], player.position[1] + 1, player.position[2]],
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
    id: `buff_${Date.now()}`,
    position: [player.position[0], player.position[1] + 1, player.position[2]],
    color: spell.color,
    type: 'buff',
    count: 15,
  });

  return { success: true };
};

const executeBeamSpell = (spell, player, store) => {
  // Create beam projectile that travels far
  const direction = [
    Math.sin(player.facingAngle),
    0,
    Math.cos(player.facingAngle),
  ];

  store.addProjectile({
    id: `beam_${Date.now()}`,
    position: [player.position[0], player.position[1] + 1, player.position[2]],
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
