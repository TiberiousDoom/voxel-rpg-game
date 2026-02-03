/**
 * achievementDefinitions.js - All achievement definitions
 *
 * Contains 50+ achievements across 5 categories:
 * - Building (15 achievements)
 * - Resource (12 achievements)
 * - NPC (10 achievements)
 * - Tier (5 achievements)
 * - Survival (8 achievements)
 */

import { AchievementCategory, ConditionType, RewardType } from './Achievement.js';

/**
 * All achievement definitions
 */
export const achievementDefinitions = [
  // ===== BUILDING ACHIEVEMENTS (15) =====
  {
    id: 'building_first_steps',
    name: 'First Steps',
    description: 'Place your first building',
    icon: '🏗️',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_COUNT,
      target: 1
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.02 } // +2% production
    }
  },
  {
    id: 'building_architect',
    name: 'Architect',
    description: 'Place 10 buildings',
    icon: '🏛️',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_COUNT,
      target: 10
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.03 } // +3% production
    }
  },
  {
    id: 'building_city_planner',
    name: 'City Planner',
    description: 'Place 25 buildings',
    icon: '🏙️',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_COUNT,
      target: 25
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.05 } // +5% production
    }
  },
  {
    id: 'building_metropolis',
    name: 'Metropolis',
    description: 'Place 50 buildings',
    icon: '🌆',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_COUNT,
      target: 50
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.10 } // +10% production
    }
  },
  {
    id: 'building_specialized',
    name: 'Specialized',
    description: 'Place all 8 building types',
    icon: '🎯',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPES_UNIQUE,
      target: 8
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.05 } // +5% production
    }
  },
  {
    id: 'building_farm_network',
    name: 'Farm Network',
    description: 'Have 5 farms simultaneously',
    icon: '🌾',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPE_COUNT,
      target: 5,
      params: { buildingType: 'farm' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { food: 0.05 } // +5% food production
    }
  },
  {
    id: 'building_industrial',
    name: 'Industrial',
    description: 'Have 5 workshops simultaneously',
    icon: '⚒️',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPE_COUNT,
      target: 5,
      params: { buildingType: 'workshop' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.05 } // +5% production
    }
  },
  {
    id: 'building_fortress',
    name: 'Fortress',
    description: 'Have 3 watchtowers simultaneously',
    icon: '🗼',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPE_COUNT,
      target: 3,
      params: { buildingType: 'watchtower' }
    },
    reward: {
      type: RewardType.COSMETIC,
      value: { buildingSkin: 'stone_fortress' }
    }
  },
  {
    id: 'building_housing_boom',
    name: 'Housing Boom',
    description: 'Have 10 houses simultaneously',
    icon: '🏘️',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPE_COUNT,
      target: 10,
      params: { buildingType: 'house' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { morale: 0.05 } // +5% morale
    }
  },
  {
    id: 'building_lumberjack_camp',
    name: 'Lumberjack Camp',
    description: 'Have 5 campfires simultaneously',
    icon: '🔥',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPE_COUNT,
      target: 5,
      params: { buildingType: 'campfire' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { wood: 0.05 } // +5% wood production
    }
  },
  {
    id: 'building_quarry_master',
    name: 'Quarry Master',
    description: 'Have 3 quarries simultaneously',
    icon: '⛏️',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPE_COUNT,
      target: 3,
      params: { buildingType: 'quarry' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { stone: 0.05 } // +5% stone production
    }
  },
  {
    id: 'building_warehouse_manager',
    name: 'Warehouse Manager',
    description: 'Have 3 storage buildings simultaneously',
    icon: '📦',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPE_COUNT,
      target: 3,
      params: { buildingType: 'storage' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { storage: 0.10 } // +10% storage capacity
    }
  },
  {
    id: 'building_temple_devotion',
    name: 'Temple Devotion',
    description: 'Have 2 temples simultaneously',
    icon: '⛪',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPE_COUNT,
      target: 2,
      params: { buildingType: 'temple' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { morale: 0.10 } // +10% morale
    }
  },
  {
    id: 'building_balanced_economy',
    name: 'Balanced Economy',
    description: 'Have at least 2 of each production building',
    icon: '⚖️',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_TYPES_UNIQUE,
      target: 5 // At least 5 types with 2+ each
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.08 } // +8% production
    }
  },
  {
    id: 'building_mega_city',
    name: 'Mega City',
    description: 'Place 100 buildings',
    icon: '🌃',
    category: AchievementCategory.BUILDING,
    condition: {
      type: ConditionType.BUILDING_COUNT,
      target: 100
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.15 } // +15% production
    }
  },

  // ===== RESOURCE ACHIEVEMENTS (12) =====
  {
    id: 'resource_gatherer',
    name: 'Gatherer',
    description: 'Collect 100 food',
    icon: '🍞',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 100,
      params: { resourceType: 'food' }
    },
    reward: {
      type: RewardType.COSMETIC,
      value: { badge: 'gatherer' }
    }
  },
  {
    id: 'resource_hoarder',
    name: 'Hoarder',
    description: 'Collect 1,000 food',
    icon: '🍗',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 1000,
      params: { resourceType: 'food' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { food: 0.03 } // +3% food production
    }
  },
  {
    id: 'resource_tycoon',
    name: 'Tycoon',
    description: 'Collect 10,000 food',
    icon: '🍖',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 10000,
      params: { resourceType: 'food' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { food: 0.10 } // +10% food production
    }
  },
  {
    id: 'resource_lumberjack',
    name: 'Lumberjack',
    description: 'Collect 500 wood',
    icon: '🪵',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 500,
      params: { resourceType: 'wood' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { wood: 0.05 } // +5% wood production
    }
  },
  {
    id: 'resource_mason',
    name: 'Mason',
    description: 'Collect 500 stone',
    icon: '🪨',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 500,
      params: { resourceType: 'stone' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { stone: 0.05 } // +5% stone production
    }
  },
  {
    id: 'resource_wealthy',
    name: 'Wealthy',
    description: 'Collect 1,000 gold',
    icon: '💰',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 1000,
      params: { resourceType: 'gold' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { gold: 0.05 } // +5% gold production
    }
  },
  {
    id: 'resource_mystic',
    name: 'Mystic',
    description: 'Collect 100 essence',
    icon: '✨',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 100,
      params: { resourceType: 'essence' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { essence: 0.10 } // +10% essence production
    }
  },
  {
    id: 'resource_crystallized',
    name: 'Crystallized',
    description: 'Collect 50 crystals',
    icon: '💎',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 50,
      params: { resourceType: 'crystals' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { crystals: 0.10 } // +10% crystal production
    }
  },
  {
    id: 'resource_full_storage',
    name: 'Full Storage',
    description: 'Fill storage to 100% capacity',
    icon: '📦',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.STORAGE_FULL,
      target: true
    },
    reward: {
      type: RewardType.UNLOCK,
      value: { building: 'large_storage' }
    }
  },
  {
    id: 'resource_wood_baron',
    name: 'Wood Baron',
    description: 'Collect 5,000 wood',
    icon: '🌲',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 5000,
      params: { resourceType: 'wood' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { wood: 0.10 } // +10% wood production
    }
  },
  {
    id: 'resource_stone_magnate',
    name: 'Stone Magnate',
    description: 'Collect 5,000 stone',
    icon: '🏔️',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 5000,
      params: { resourceType: 'stone' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { stone: 0.10 } // +10% stone production
    }
  },
  {
    id: 'resource_gold_emperor',
    name: 'Gold Emperor',
    description: 'Collect 10,000 gold',
    icon: '👑',
    category: AchievementCategory.RESOURCE,
    condition: {
      type: ConditionType.RESOURCE_TOTAL,
      target: 10000,
      params: { resourceType: 'gold' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { gold: 0.15 } // +15% gold production
    }
  },

  // ===== NPC ACHIEVEMENTS (10) =====
  {
    id: 'npc_first_citizen',
    name: 'First Citizen',
    description: 'Spawn your first NPC',
    icon: '👤',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_SPAWNED_TOTAL,
      target: 1
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { npcHappiness: 0.02 } // +2% NPC happiness
    }
  },
  {
    id: 'npc_village',
    name: 'Village',
    description: 'Have 10 NPCs alive',
    icon: '🏘️',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_COUNT,
      target: 10
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { npcHappiness: 0.03 } // +3% NPC happiness
    }
  },
  {
    id: 'npc_town',
    name: 'Town',
    description: 'Have 50 NPCs alive',
    icon: '🏙️',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_COUNT,
      target: 50
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { npcHappiness: 0.05 } // +5% NPC happiness
    }
  },
  {
    id: 'npc_city',
    name: 'City',
    description: 'Have 100 NPCs alive',
    icon: '🌆',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_COUNT,
      target: 100
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { npcHappiness: 0.10 } // +10% NPC happiness
    }
  },
  {
    id: 'npc_happy_town',
    name: 'Happy Town',
    description: 'All NPCs above 75 happiness',
    icon: '😊',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_HAPPINESS_ALL,
      target: 75
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.05 } // +5% production
    }
  },
  {
    id: 'npc_no_deaths',
    name: 'Guardian',
    description: 'Reach TOWN tier without any NPC deaths',
    icon: '🛡️',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_NO_DEATHS,
      target: true,
      params: { tier: 'TOWN' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { npcHealth: 0.10 } // +10% NPC health
    }
  },
  {
    id: 'npc_population_boom',
    name: 'Population Boom',
    description: 'Spawn 100 total NPCs',
    icon: '👥',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_SPAWNED_TOTAL,
      target: 100
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { npcHappiness: 0.05 } // +5% NPC happiness
    }
  },
  {
    id: 'npc_thriving_community',
    name: 'Thriving Community',
    description: 'Have 25 NPCs with 80+ happiness',
    icon: '🎉',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_HAPPINESS_ALL,
      target: 80
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { morale: 0.10 } // +10% morale
    }
  },
  {
    id: 'npc_perfect_harmony',
    name: 'Perfect Harmony',
    description: 'All NPCs at 100 happiness',
    icon: '💯',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_HAPPINESS_ALL,
      target: 100
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.20 } // +20% production
    }
  },
  {
    id: 'npc_metropolis',
    name: 'Metropolis',
    description: 'Have 200 NPCs alive',
    icon: '🌃',
    category: AchievementCategory.NPC,
    condition: {
      type: ConditionType.NPC_COUNT,
      target: 200
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.15 } // +15% production
    }
  },

  // ===== TIER PROGRESSION ACHIEVEMENTS (5) =====
  {
    id: 'tier_survivor',
    name: 'Survivor',
    description: 'Reach SURVIVAL tier',
    icon: '🏕️',
    category: AchievementCategory.TIER,
    condition: {
      type: ConditionType.TIER_REACHED,
      target: 'SURVIVAL'
    },
    reward: {
      type: RewardType.COSMETIC,
      value: { badge: 'survivor' }
    }
  },
  {
    id: 'tier_settler',
    name: 'Settler',
    description: 'Reach PERMANENT tier',
    icon: '🏡',
    category: AchievementCategory.TIER,
    condition: {
      type: ConditionType.TIER_REACHED,
      target: 'PERMANENT'
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.05 } // +5% production
    }
  },
  {
    id: 'tier_mayor',
    name: 'Mayor',
    description: 'Reach TOWN tier',
    icon: '🎩',
    category: AchievementCategory.TIER,
    condition: {
      type: ConditionType.TIER_REACHED,
      target: 'TOWN'
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.10 } // +10% production
    }
  },
  {
    id: 'tier_lord',
    name: 'Lord',
    description: 'Reach CASTLE tier',
    icon: '🏰',
    category: AchievementCategory.TIER,
    condition: {
      type: ConditionType.TIER_REACHED,
      target: 'CASTLE'
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.20 } // +20% production
    }
  },
  {
    id: 'tier_speed_runner',
    name: 'Speed Runner',
    description: 'Reach CASTLE tier in under 2 hours',
    icon: '⚡',
    category: AchievementCategory.TIER,
    condition: {
      type: ConditionType.TIER_SPEED,
      target: 7200, // 2 hours in seconds
      params: { tier: 'CASTLE' }
    },
    reward: {
      type: RewardType.COSMETIC,
      value: { badge: 'speed_runner', buildingSkin: 'golden_castle' }
    }
  },

  // ===== SURVIVAL ACHIEVEMENTS (8) =====
  {
    id: 'survival_first_disaster',
    name: 'First Disaster',
    description: 'Survive your first disaster',
    icon: '🌪️',
    category: AchievementCategory.SURVIVAL,
    condition: {
      type: ConditionType.EVENT_SURVIVED,
      target: 1
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { buildingHealth: 0.05 } // +5% building durability
    }
  },
  {
    id: 'survival_fireproof',
    name: 'Fireproof',
    description: 'Survive a wildfire without losing buildings',
    icon: '🔥',
    category: AchievementCategory.SURVIVAL,
    condition: {
      type: ConditionType.EVENT_SURVIVED,
      target: 1,
      params: { eventType: 'wildfire', noBuildingLoss: true }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { buildingHealth: 0.10 } // +10% fire resistance
    }
  },
  {
    id: 'survival_flood_survivor',
    name: 'Flood Survivor',
    description: 'Survive a flood',
    icon: '🌊',
    category: AchievementCategory.SURVIVAL,
    condition: {
      type: ConditionType.EVENT_SURVIVED,
      target: 1,
      params: { eventType: 'flood' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { buildingHealth: 0.05 } // +5% building durability
    }
  },
  {
    id: 'survival_earthquake_resistant',
    name: 'Earthquake Resistant',
    description: 'Survive an earthquake',
    icon: '🏔️',
    category: AchievementCategory.SURVIVAL,
    condition: {
      type: ConditionType.EVENT_SURVIVED,
      target: 1,
      params: { eventType: 'earthquake' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { buildingHealth: 0.05 } // +5% building durability
    }
  },
  {
    id: 'survival_event_master',
    name: 'Event Master',
    description: 'Survive all 3 disaster types',
    icon: '🏅',
    category: AchievementCategory.SURVIVAL,
    condition: {
      type: ConditionType.EVENT_ALL_TYPES,
      target: 3
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { buildingHealth: 0.20 } // +20% building durability
    }
  },
  {
    id: 'survival_no_starvation',
    name: 'Well Fed',
    description: 'Reach TOWN tier without any NPC starvation',
    icon: '🍽️',
    category: AchievementCategory.SURVIVAL,
    condition: {
      type: ConditionType.NO_STARVATION,
      target: true,
      params: { tier: 'TOWN' }
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { food: 0.10 } // +10% food production
    }
  },
  {
    id: 'survival_disaster_veteran',
    name: 'Disaster Veteran',
    description: 'Survive 10 total disasters',
    icon: '🎖️',
    category: AchievementCategory.SURVIVAL,
    condition: {
      type: ConditionType.EVENT_SURVIVED,
      target: 10
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { buildingHealth: 0.15 } // +15% building durability
    }
  },
  {
    id: 'survival_unstoppable',
    name: 'Unstoppable',
    description: 'Survive 25 total disasters',
    icon: '💪',
    category: AchievementCategory.SURVIVAL,
    condition: {
      type: ConditionType.EVENT_SURVIVED,
      target: 25
    },
    reward: {
      type: RewardType.MULTIPLIER,
      value: { production: 0.25 } // +25% production
    }
  }
];

export default achievementDefinitions;
