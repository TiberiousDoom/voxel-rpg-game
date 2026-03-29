/**
 * challenges.js
 * Challenge mode definitions for endgame content
 */

const CHALLENGES = {
  PACIFIST: {
    id: 'PACIFIST',
    title: 'Pacifist',
    description: 'Build a Castle without any military buildings. Prove that peace is the answer.',
    icon: '\u2622\uFE0F',
    rules: {
      disableBuildings: ['BARRACKS', 'GUARD_POST', 'FORTRESS'],
      disableExpeditions: true,
    },
    goal: {
      type: 'BUILD',
      targetType: 'CASTLE',
      targetCount: 1,
      description: 'Build a Castle without military buildings',
    },
    difficulty: 'HARD',
    rewards: { title: 'Peacekeeper', xpBonus: 500 },
  },

  SPEED_RUN: {
    id: 'SPEED_RUN',
    title: 'Speed Run',
    description: 'Build a Castle within 60 minutes. Every second counts!',
    icon: '\u23F1\uFE0F',
    rules: {
      timeLimit: 3600, // 60 minutes in seconds
    },
    goal: {
      type: 'BUILD',
      targetType: 'CASTLE',
      targetCount: 1,
      description: 'Build a Castle in under 60 minutes',
    },
    difficulty: 'MEDIUM',
    rewards: { title: 'Speed Builder', xpBonus: 300 },
  },

  NO_FARMS: {
    id: 'NO_FARMS',
    title: 'No Farms',
    description: 'Reach a population of 30 without building any farms. Get creative with food sources.',
    icon: '\uD83D\uDEAB',
    rules: {
      disableBuildings: ['FARM'],
    },
    goal: {
      type: 'POPULATION',
      targetCount: 30,
      description: 'Reach population 30 without farms',
    },
    difficulty: 'HARD',
    rewards: { title: 'Hunter-Gatherer', xpBonus: 400 },
  },

  LONE_WOLF: {
    id: 'LONE_WOLF',
    title: 'Lone Wolf',
    description: 'Build a Castle with a maximum of 5 NPCs. Quality over quantity.',
    icon: '\uD83D\uDC3A',
    rules: {
      maxNPCs: 5,
    },
    goal: {
      type: 'BUILD',
      targetType: 'CASTLE',
      targetCount: 1,
      description: 'Build a Castle with max 5 NPCs',
    },
    difficulty: 'HARD',
    rewards: { title: 'Lone Wolf', xpBonus: 450 },
  },

  HARDCORE: {
    id: 'HARDCORE',
    title: 'Hardcore',
    description: 'NPCs that die stay dead. No healing buildings. One life for the player. Build a Castle to win.',
    icon: '\uD83D\uDC80',
    rules: {
      npcPermadeath: true,
      noHealing: true,
      singleLife: true,
    },
    goal: {
      type: 'BUILD',
      targetType: 'CASTLE',
      targetCount: 1,
      description: 'Build a Castle - no respawns',
    },
    difficulty: 'EXTREME',
    rewards: { title: 'Undying', xpBonus: 750 },
  },

  IRON_MAN: {
    id: 'IRON_MAN',
    title: 'Iron Man',
    description: 'Complete the game with auto-save only. No manual saves, no going back.',
    icon: '\uD83D\uDEE1\uFE0F',
    rules: {
      noManualSave: true,
      autoSaveOnly: true,
      singleSlot: true,
    },
    goal: {
      type: 'BUILD',
      targetType: 'CASTLE',
      targetCount: 1,
      description: 'Complete the game with no manual saves',
    },
    difficulty: 'EXTREME',
    rewards: { title: 'Iron Will', xpBonus: 600 },
  },
};

export const getChallengeById = (id) => CHALLENGES[id] || null;
export const getAllChallenges = () => Object.values(CHALLENGES);
export const getChallengeIds = () => Object.keys(CHALLENGES);

export default CHALLENGES;
