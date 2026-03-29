/**
 * bosses.js
 * Boss encounter definitions with phases, special attacks, and loot tables
 */

const BOSSES = {
  goblin_king: {
    id: 'goblin_king',
    name: 'Goblin King Grukk',
    element: 'PHYSICAL',
    baseHealth: 500,
    baseDamage: 25,
    baseDefense: 10,
    critChance: 10,
    xpReward: 500,
    goldReward: 300,
    phases: [
      {
        hpThreshold: 1.0, // Phase 1: 100% - 50% HP
        name: 'Royal Guard',
        behavior: 'SUMMON',
        description: 'Summons goblin minions to fight for him',
        damageMultiplier: 1.0,
        defenseMultiplier: 1.0,
        specialAbility: {
          name: 'Call Reinforcements',
          type: 'SUMMON',
          summonCount: 2,
          summonType: 'goblin',
          cooldown: 3, // rounds
        },
      },
      {
        hpThreshold: 0.5, // Phase 2: below 50% HP
        name: 'Enraged',
        behavior: 'BERSERKER',
        description: 'Enters a berserk rage, dealing double damage',
        damageMultiplier: 2.0,
        defenseMultiplier: 0.5,
        specialAbility: {
          name: 'Frenzy Strike',
          type: 'AOE',
          damageMultiplier: 1.5,
          hitAllTargets: true,
          cooldown: 2,
        },
      },
    ],
    loot: [
      { type: 'weapon', name: "Grukk's Crown Blade", tier: 3, damage: 18, critChance: 5, dropChance: 0.5 },
      { type: 'accessory', name: 'Goblin King Ring', tier: 3, damage: 5, dodgeChance: 3, dropChance: 0.3 },
    ],
  },

  dragon_lord: {
    id: 'dragon_lord',
    name: 'Ignithar the Flame',
    element: 'FIRE',
    baseHealth: 1200,
    baseDamage: 45,
    baseDefense: 25,
    critChance: 15,
    xpReward: 1500,
    goldReward: 800,
    phases: [
      {
        hpThreshold: 1.0, // Phase 1: Fire Breath
        name: 'Inferno',
        behavior: 'RANGED',
        description: 'Breathes fire on the entire party',
        damageMultiplier: 1.0,
        defenseMultiplier: 1.0,
        specialAbility: {
          name: 'Fire Breath',
          type: 'AOE_ELEMENTAL',
          element: 'FIRE',
          damageMultiplier: 0.8,
          hitAllTargets: true,
          statusEffect: { type: 'DOT', damagePerTick: 0.08, duration: 3, name: 'Burning' },
          cooldown: 3,
        },
      },
      {
        hpThreshold: 0.6, // Phase 2: Takes flight
        name: 'Airborne',
        behavior: 'EVASIVE',
        description: 'Takes flight, harder to hit, rains fire from above',
        damageMultiplier: 1.2,
        defenseMultiplier: 1.5,
        specialAbility: {
          name: 'Meteor Rain',
          type: 'AOE_ELEMENTAL',
          element: 'FIRE',
          damageMultiplier: 1.5,
          hitAllTargets: true,
          cooldown: 4,
        },
      },
      {
        hpThreshold: 0.25, // Phase 3: Melee frenzy
        name: 'Desperate Fury',
        behavior: 'BERSERKER',
        description: 'Lands and attacks with claws and tail in a frenzy',
        damageMultiplier: 2.5,
        defenseMultiplier: 0.7,
        specialAbility: {
          name: 'Tail Sweep',
          type: 'AOE',
          damageMultiplier: 2.0,
          hitAllTargets: true,
          statusEffect: { type: 'STUN', duration: 1, name: 'Knocked Down' },
          cooldown: 2,
        },
      },
    ],
    loot: [
      { type: 'weapon', name: 'Dragonfire Blade', tier: 5, damage: 35, critChance: 8, dropChance: 0.3 },
      { type: 'armor', name: 'Dragonscale Plate', tier: 5, defense: 20, healthBonus: 100, dropChance: 0.3 },
      { type: 'accessory', name: 'Heart of Flame', tier: 5, damage: 10, critDamage: 15, dropChance: 0.2 },
    ],
  },

  lich_king: {
    id: 'lich_king',
    name: 'Morathis the Undying',
    element: 'ARCANE',
    baseHealth: 900,
    baseDamage: 35,
    baseDefense: 15,
    critChance: 20,
    xpReward: 1200,
    goldReward: 600,
    phases: [
      {
        hpThreshold: 1.0, // Phase 1: Summon undead
        name: 'Army of the Dead',
        behavior: 'SUMMON',
        description: 'Raises skeletons to protect himself',
        damageMultiplier: 1.0,
        defenseMultiplier: 1.2,
        specialAbility: {
          name: 'Raise Dead',
          type: 'SUMMON',
          summonCount: 3,
          summonType: 'skeleton',
          cooldown: 4,
        },
      },
      {
        hpThreshold: 0.5, // Phase 2: Drain life
        name: 'Soul Harvest',
        behavior: 'DRAIN',
        description: 'Drains life from party members to heal',
        damageMultiplier: 1.3,
        defenseMultiplier: 1.0,
        specialAbility: {
          name: 'Soul Drain',
          type: 'DRAIN',
          damageMultiplier: 0.5,
          healPercent: 0.5, // Heals for 50% of damage dealt
          hitAllTargets: true,
          cooldown: 3,
        },
      },
      {
        hpThreshold: 0.2, // Phase 3: Mass AoE
        name: 'Death Nova',
        behavior: 'CASTER',
        description: 'Unleashes devastating arcane explosions',
        damageMultiplier: 2.0,
        defenseMultiplier: 0.5,
        specialAbility: {
          name: 'Death Nova',
          type: 'AOE_ELEMENTAL',
          element: 'ARCANE',
          damageMultiplier: 2.5,
          hitAllTargets: true,
          statusEffect: { type: 'DEBUFF', damageTakenIncrease: 0.30, duration: 2, name: 'Cursed' },
          cooldown: 2,
        },
      },
    ],
    loot: [
      { type: 'weapon', name: "Lich King's Staff", tier: 4, damage: 25, critChance: 10, dropChance: 0.4 },
      { type: 'armor', name: 'Robes of the Undying', tier: 4, defense: 12, healthBonus: 50, dropChance: 0.35 },
      { type: 'accessory', name: 'Phylactery Shard', tier: 4, damage: 8, dodgeChance: 5, dropChance: 0.25 },
    ],
  },

  frost_giant: {
    id: 'frost_giant',
    name: 'Thundrak Frostborn',
    element: 'ICE',
    baseHealth: 1500,
    baseDamage: 40,
    baseDefense: 30,
    critChance: 8,
    xpReward: 1000,
    goldReward: 500,
    phases: [
      {
        hpThreshold: 1.0,
        name: 'Frozen Fortress',
        behavior: 'TANK',
        description: 'Encases in ice armor, high defense',
        damageMultiplier: 0.8,
        defenseMultiplier: 2.0,
        specialAbility: {
          name: 'Ice Armor',
          type: 'BUFF_SELF',
          defenseBoost: 20,
          duration: 3,
          cooldown: 5,
        },
      },
      {
        hpThreshold: 0.4,
        name: 'Avalanche',
        behavior: 'BERSERKER',
        description: 'Shatters ice armor for devastating attacks',
        damageMultiplier: 2.0,
        defenseMultiplier: 0.8,
        specialAbility: {
          name: 'Avalanche Slam',
          type: 'AOE_ELEMENTAL',
          element: 'ICE',
          damageMultiplier: 2.0,
          hitAllTargets: true,
          statusEffect: { type: 'DEBUFF', speedReduction: 0.60, duration: 2, name: 'Frozen Solid' },
          cooldown: 3,
        },
      },
    ],
    loot: [
      { type: 'weapon', name: 'Frostborn Hammer', tier: 4, damage: 30, critChance: 5, dropChance: 0.4 },
      { type: 'armor', name: 'Glacial Plate', tier: 4, defense: 18, healthBonus: 80, dropChance: 0.35 },
    ],
  },

  storm_serpent: {
    id: 'storm_serpent',
    name: 'Volthax the Storm Serpent',
    element: 'LIGHTNING',
    baseHealth: 800,
    baseDamage: 50,
    baseDefense: 12,
    critChance: 25,
    xpReward: 1100,
    goldReward: 550,
    phases: [
      {
        hpThreshold: 1.0,
        name: 'Static Field',
        behavior: 'RANGED',
        description: 'Charges the air with electricity',
        damageMultiplier: 1.0,
        defenseMultiplier: 1.0,
        specialAbility: {
          name: 'Chain Lightning',
          type: 'AOE_ELEMENTAL',
          element: 'LIGHTNING',
          damageMultiplier: 0.6,
          hitAllTargets: true,
          statusEffect: { type: 'STUN', duration: 1, name: 'Shocked' },
          cooldown: 3,
        },
      },
      {
        hpThreshold: 0.35,
        name: 'Thunderstorm',
        behavior: 'CASTER',
        description: 'Calls down a massive thunderstorm',
        damageMultiplier: 2.5,
        defenseMultiplier: 0.6,
        specialAbility: {
          name: 'Thunder Strike',
          type: 'AOE_ELEMENTAL',
          element: 'LIGHTNING',
          damageMultiplier: 3.0,
          hitAllTargets: true,
          cooldown: 2,
        },
      },
    ],
    loot: [
      { type: 'weapon', name: 'Voltfang', tier: 4, damage: 28, critChance: 12, dropChance: 0.4 },
      { type: 'accessory', name: 'Storm Scale', tier: 4, damage: 10, dodgeChance: 8, dropChance: 0.3 },
    ],
  },
};

/**
 * Get boss definition by ID
 * @param {string} bossId
 * @returns {Object|null}
 */
export function getBoss(bossId) {
  return BOSSES[bossId] || null;
}

/**
 * Get boss for a given dungeon floor (every 5th floor)
 * @param {number} floor
 * @returns {Object|null} Boss definition or null if not a boss floor
 */
export function getBossForFloor(floor) {
  if (floor % 5 !== 0) return null;

  const bossOrder = ['goblin_king', 'frost_giant', 'lich_king', 'storm_serpent', 'dragon_lord'];
  const bossIndex = Math.min(Math.floor(floor / 5) - 1, bossOrder.length - 1);
  const bossId = bossOrder[bossIndex];

  return BOSSES[bossId] || null;
}

/**
 * Get the current phase for a boss based on remaining HP percentage
 * @param {Object} boss - Boss definition
 * @param {number} hpPercent - Current HP as fraction (0-1)
 * @returns {Object} Current phase
 */
export function getCurrentPhase(boss, hpPercent) {
  // Phases are ordered by hpThreshold descending
  // Return the phase with the lowest threshold that the boss has passed
  let currentPhase = boss.phases[0];

  for (const phase of boss.phases) {
    if (hpPercent <= phase.hpThreshold) {
      currentPhase = phase;
    }
  }

  return currentPhase;
}

/**
 * Create a boss enemy instance for combat
 * @param {Object} bossDef - Boss definition
 * @param {number} difficulty - Difficulty multiplier
 * @returns {Object} Boss enemy object ready for DungeonCombatEngine
 */
export function createBossEnemy(bossDef, difficulty = 1) {
  return {
    id: `boss_${bossDef.id}_${Date.now()}`,
    type: bossDef.id,
    name: bossDef.name,
    isBoss: true,
    element: bossDef.element,
    resistances: { [bossDef.element]: 0.50 },
    health: {
      current: Math.floor(bossDef.baseHealth * difficulty),
      max: Math.floor(bossDef.baseHealth * difficulty),
    },
    damage: Math.floor(bossDef.baseDamage * difficulty),
    defense: Math.floor(bossDef.baseDefense * difficulty),
    speed: 3,
    critChance: bossDef.critChance,
    xpReward: Math.floor(bossDef.xpReward * difficulty),
    goldReward: Math.floor(bossDef.goldReward * difficulty),
    phases: bossDef.phases,
    loot: bossDef.loot,
    statusEffects: [],
    specialAbilityCooldowns: {},
  };
}

export default BOSSES;
