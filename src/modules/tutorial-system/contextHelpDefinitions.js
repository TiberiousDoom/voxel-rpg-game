/**
 * Context Help Definitions
 *
 * Defines 30+ context-sensitive help tips that trigger based on player actions
 */

/**
 * Get all context help definitions
 * @returns {Array<Object>} Array of help tip definitions
 */
export function getContextHelpDefinitions() {
  return [
    // Building & Territory Help (8 tips)
    {
      id: 'building-placement-failed',
      title: 'Building Placement Failed',
      message: 'Buildings must be placed within your territory (green zone). Expand your territory to build in new areas.',
      triggerType: 'building_placement_failed',
      priority: 'high',
      showOnce: false,
      category: 'building'
    },

    {
      id: 'territory-expansion-info',
      title: 'Territory Expansion',
      message: 'Expanding territory costs resources. Make sure you have enough wood and stone before expanding.',
      triggerType: 'territory_expansion_attempted',
      priority: 'normal',
      showOnce: true,
      category: 'building'
    },

    {
      id: 'building-damaged-info',
      title: 'Building Damaged',
      message: 'Buildings can be damaged by events and disasters. Repair them using resources by selecting the building and clicking "Repair".',
      triggerType: 'building_damaged',
      priority: 'high',
      showOnce: true,
      category: 'building'
    },

    {
      id: 'tier-gate-failed-info',
      title: 'Tier Requirements Not Met',
      message: 'You need specific buildings to reach the next tier. Check the tier requirements panel to see what\'s needed (e.g., 2 farms + 1 house for PERMANENT tier).',
      triggerType: 'tier_gate_failed',
      priority: 'high',
      showOnce: false,
      category: 'building'
    },

    {
      id: 'first-house-tip',
      title: 'Housing Capacity',
      message: 'Tip: Build houses to increase housing capacity. Each house can shelter multiple NPCs.',
      triggerType: 'npc_spawn_no_houses',
      priority: 'high',
      showOnce: true,
      category: 'building'
    },

    {
      id: 'storage-building-tip',
      title: 'Storage Full',
      message: 'Storage at capacity! Resources are being discarded. Build a STORAGE building to increase your storage capacity.',
      triggerType: 'storage_full',
      priority: 'high',
      showOnce: true,
      category: 'building'
    },

    {
      id: 'adjacent-buildings-bonus',
      title: 'Building Adjacency Bonus',
      message: 'Tip: Placing buildings adjacent to each other can provide production bonuses. Try clustering similar buildings together.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.buildingsPlaced >= 3,
      priority: 'low',
      showOnce: true,
      category: 'building'
    },

    {
      id: 'watchtower-info',
      title: 'Watchtower Benefits',
      message: 'Watchtowers reduce the chance of wildfires by 50% and provide early warning for disasters.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.buildingPlaced?.type === 'watchtower',
      priority: 'normal',
      showOnce: true,
      category: 'building'
    },

    // Resource Management Help (7 tips)
    {
      id: 'food-depleted-warning',
      title: 'Food Depleted!',
      message: 'Warning: Food has run out! NPCs are starving. Build more farms or reduce population immediately.',
      triggerType: 'food_depleted',
      priority: 'high',
      showOnce: false,
      category: 'resources'
    },

    {
      id: 'low-food-warning',
      title: 'Low Food Supply',
      message: 'Food is running low. Each NPC consumes 0.5 food per minute. Consider building more farms.',
      triggerType: 'resource_threshold',
      triggerCondition: { resource: 'food', operator: '<', value: 20 },
      priority: 'high',
      showOnce: false,
      category: 'resources'
    },

    {
      id: 'low-wood-warning',
      title: 'Low Wood Supply',
      message: 'Wood is running low. Build campfires or workshops to produce more wood.',
      triggerType: 'resource_threshold',
      triggerCondition: { resource: 'wood', operator: '<', value: 20 },
      priority: 'normal',
      showOnce: false,
      category: 'resources'
    },

    {
      id: 'low-stone-warning',
      title: 'Low Stone Supply',
      message: 'Stone is running low. Build quarries to mine more stone.',
      triggerType: 'resource_threshold',
      triggerCondition: { resource: 'stone', operator: '<', value: 20 },
      priority: 'normal',
      showOnce: false,
      category: 'resources'
    },

    {
      id: 'first-gold-earned',
      title: 'Gold Earned!',
      message: 'You\'ve earned your first gold! Gold is used for advanced buildings and can be traded with merchants.',
      triggerType: 'resource_threshold',
      triggerCondition: { resource: 'gold', operator: '>', value: 0 },
      priority: 'normal',
      showOnce: true,
      category: 'resources'
    },

    {
      id: 'first-essence-earned',
      title: 'Essence Collected',
      message: 'You\'ve collected essence! Essence is a rare resource used for magical buildings and upgrades.',
      triggerType: 'resource_threshold',
      triggerCondition: { resource: 'essence', operator: '>', value: 0 },
      priority: 'normal',
      showOnce: true,
      category: 'resources'
    },

    {
      id: 'resource-balance-tip',
      title: 'Resource Balance',
      message: 'Tip: Maintain a balance between production and consumption. Monitor your resource rates in the statistics panel.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.tickCount === 1000,
      priority: 'low',
      showOnce: true,
      category: 'resources'
    },

    // NPC Management Help (7 tips)
    {
      id: 'npc-died-warning',
      title: 'NPC Died',
      message: 'An NPC has died! Check food production and NPC happiness. Low food or happiness can lead to death.',
      triggerType: 'npc_died',
      priority: 'high',
      showOnce: false,
      category: 'npc'
    },

    {
      id: 'morale-low-warning',
      title: 'Low Morale',
      message: 'Town morale is critically low! Ensure NPCs have food, rest, and shelter. Low morale reduces productivity.',
      triggerType: 'morale_low',
      priority: 'high',
      showOnce: false,
      category: 'npc'
    },

    {
      id: 'first-npc-spawned',
      title: 'First Citizen',
      message: 'Your first citizen has arrived! Assign NPCs to buildings to put them to work and generate resources.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.npcCount === 1,
      priority: 'normal',
      showOnce: true,
      category: 'npc'
    },

    {
      id: 'npc-idle-tip',
      title: 'Idle NPCs',
      message: 'You have idle NPCs. Assign them to buildings to maximize resource production.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.idleNPCCount > 0 && gameState.emptyBuildings > 0,
      priority: 'normal',
      showOnce: false,
      category: 'npc'
    },

    {
      id: 'npc-needs-tip',
      title: 'NPC Needs',
      message: 'NPCs have needs: food, rest, social interaction, and shelter. Satisfy these needs to keep NPCs happy and productive.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.npcCount >= 3,
      priority: 'low',
      showOnce: true,
      category: 'npc'
    },

    {
      id: 'npc-happiness-tip',
      title: 'NPC Happiness',
      message: 'Tip: Happy NPCs are more productive. Monitor individual NPC happiness in the NPC panel.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.npcCount >= 5,
      priority: 'low',
      showOnce: true,
      category: 'npc'
    },

    {
      id: 'population-growth-tip',
      title: 'Population Growth',
      message: 'Your population is growing! Make sure you have enough farms and houses to support them.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.npcCount >= 10,
      priority: 'normal',
      showOnce: true,
      category: 'npc'
    },

    // Events & Disasters Help (5 tips)
    {
      id: 'first-disaster',
      title: 'Disaster Occurred',
      message: 'A disaster has struck! Some disasters can be mitigated with proper buildings (e.g., watchtowers reduce wildfire chance).',
      triggerType: 'disaster_occurred',
      priority: 'high',
      showOnce: true,
      category: 'events'
    },

    {
      id: 'wildfire-mitigation',
      title: 'Wildfire Prevention',
      message: 'Tip: Build watchtowers to reduce wildfire chance by 50%. Stone buildings are immune to fire damage.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.lastDisaster === 'wildfire',
      priority: 'normal',
      showOnce: true,
      category: 'events'
    },

    {
      id: 'flood-mitigation',
      title: 'Flood Prevention',
      message: 'Tip: Build on higher ground to avoid flood damage. Territory on hills is safe from flooding.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.lastDisaster === 'flood',
      priority: 'normal',
      showOnce: true,
      category: 'events'
    },

    {
      id: 'earthquake-mitigation',
      title: 'Earthquake Resistance',
      message: 'Tip: Castle-tier buildings take 50% less earthquake damage. Advance tiers for better disaster resistance.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.lastDisaster === 'earthquake',
      priority: 'normal',
      showOnce: true,
      category: 'events'
    },

    {
      id: 'seasonal-event-tip',
      title: 'Seasonal Events',
      message: 'Seasonal events occur regularly. Plan ahead for winter freeze by stockpiling resources.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.eventsExperienced >= 3,
      priority: 'low',
      showOnce: true,
      category: 'events'
    },

    // Achievements & Progression Help (5 tips)
    {
      id: 'first-achievement',
      title: 'Achievement Unlocked!',
      message: 'Achievement unlocked! Check your achievements panel for rewards and progress tracking.',
      triggerType: 'achievement_unlocked',
      priority: 'normal',
      showOnce: true,
      category: 'progression'
    },

    {
      id: 'tier-survival-info',
      title: 'SURVIVAL Tier',
      message: 'You\'re in SURVIVAL tier. Focus on basic resources (food, wood, stone) and population growth.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.currentTier === 'SURVIVAL' && gameState.tickCount === 100,
      priority: 'low',
      showOnce: true,
      category: 'progression'
    },

    {
      id: 'tier-permanent-reached',
      title: 'PERMANENT Tier Reached!',
      message: 'Congratulations! You\'ve reached PERMANENT tier. New buildings and features are now available.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.tierAdvanced && gameState.currentTier === 'PERMANENT',
      priority: 'high',
      showOnce: true,
      category: 'progression'
    },

    {
      id: 'tier-town-reached',
      title: 'TOWN Tier Reached!',
      message: 'Amazing! You\'ve reached TOWN tier. Advanced NPC management and production buildings unlocked.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.tierAdvanced && gameState.currentTier === 'TOWN',
      priority: 'high',
      showOnce: true,
      category: 'progression'
    },

    {
      id: 'tier-castle-reached',
      title: 'CASTLE Tier Reached!',
      message: 'Incredible! You\'ve reached the maximum tier: CASTLE. All features and buildings are now available.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.tierAdvanced && gameState.currentTier === 'CASTLE',
      priority: 'high',
      showOnce: true,
      category: 'progression'
    },

    // General Gameplay Tips (3 tips)
    {
      id: 'save-game-reminder',
      title: 'Save Your Progress',
      message: 'Tip: Remember to save your game regularly using the save button. Your progress is auto-saved every 5 minutes.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.tickCount === 2000,
      priority: 'low',
      showOnce: true,
      category: 'general'
    },

    {
      id: 'statistics-panel-tip',
      title: 'Statistics Panel',
      message: 'Tip: Check the statistics panel to monitor resource production rates, consumption, and NPC status.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.tickCount === 500,
      priority: 'low',
      showOnce: true,
      category: 'general'
    },

    {
      id: 'game-speed-tip',
      title: 'Game Speed Control',
      message: 'Tip: You can adjust game speed using the speed controls. Slow down to plan carefully or speed up to gather resources faster.',
      triggerType: 'custom',
      triggerCondition: (gameState) => gameState.tickCount === 1500,
      priority: 'low',
      showOnce: true,
      category: 'general'
    }
  ];
}

/**
 * Get help tips by category
 * @param {string} category - Category name
 * @returns {Array<Object>}
 */
export function getHelpTipsByCategory(category) {
  return getContextHelpDefinitions().filter(tip => tip.category === category);
}

/**
 * Get high priority tips
 * @returns {Array<Object>}
 */
export function getHighPriorityTips() {
  return getContextHelpDefinitions().filter(tip => tip.priority === 'high');
}

/**
 * Validate context help definitions
 * @returns {Object} Validation result
 */
export function validateContextHelpDefinitions() {
  const definitions = getContextHelpDefinitions();
  const errors = [];

  // Check for duplicate IDs
  const ids = definitions.map(def => def.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate help tip IDs: ${duplicates.join(', ')}`);
  }

  // Check required fields
  definitions.forEach((def, index) => {
    if (!def.id) errors.push(`Tip ${index} missing ID`);
    if (!def.title) errors.push(`Tip ${index} missing title`);
    if (!def.message) errors.push(`Tip ${index} missing message`);
    if (!def.triggerType) errors.push(`Tip ${index} missing trigger type`);
  });

  return {
    valid: errors.length === 0,
    errors,
    tipCount: definitions.length
  };
}

const contextHelpAPI = {
  getContextHelpDefinitions,
  getHelpTipsByCategory,
  getHighPriorityTips,
  validateContextHelpDefinitions
};

export default contextHelpAPI;
