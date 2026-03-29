/**
 * DynamicQuestGenerator.js
 * Generates quests dynamically based on current game state
 */

const DYNAMIC_QUEST_TEMPLATES = [
  {
    id: 'dynamic_food_shortage',
    trigger: (state) => state.food < 20 && state.farmCount < 2,
    quest: {
      title: 'Harvest Season',
      description: 'Food supplies are running low. Build farms to feed your growing settlement.',
      flavorText: 'Hungry bellies make poor workers. Address the food shortage before morale drops.',
      type: 'BUILD',
      category: 'DAILY',
      objectives: [
        { description: 'Build 2 Farms', type: 'BUILD', targetType: 'FARM', targetCount: 2 },
      ],
      rewards: { xp: 150, gold: 75, items: [] },
    },
  },
  {
    id: 'dynamic_defense_weak',
    trigger: (state) => state.defensiveBuildings < 2 && state.population > 10,
    quest: {
      title: 'Strengthen Defenses',
      description: 'Your settlement is vulnerable to attack. Build defensive structures to protect your people.',
      flavorText: 'The scouts report movement in the hills. Best not to be caught unprepared.',
      type: 'BUILD',
      category: 'DAILY',
      objectives: [
        { description: 'Build a Guard Post', type: 'BUILD', targetType: 'GUARD_POST', targetCount: 1 },
        { description: 'Build 2 Walls', type: 'BUILD', targetType: 'WALL', targetCount: 2 },
      ],
      rewards: { xp: 200, gold: 100, items: [] },
    },
  },
  {
    id: 'dynamic_housing_needed',
    trigger: (state) => state.population > state.housingCapacity * 0.8,
    quest: {
      title: 'Growing Pains',
      description: 'Your settlement is overcrowded. Build more housing to accommodate new settlers.',
      flavorText: 'People are sleeping in the streets. More homes are needed urgently.',
      type: 'BUILD',
      category: 'DAILY',
      objectives: [
        { description: 'Build 3 Houses', type: 'BUILD', targetType: 'HOUSE', targetCount: 3 },
      ],
      rewards: { xp: 175, gold: 90, items: [] },
    },
  },
  {
    id: 'dynamic_monster_surge',
    trigger: (state) => state.nearbyEnemies > 5,
    quest: {
      title: 'Monster Surge',
      description: 'The area around your settlement is swarming with monsters. Clear them out!',
      flavorText: 'Something has agitated the local wildlife. Or worse, the rifts are growing stronger.',
      type: 'KILL',
      category: 'DAILY',
      objectives: [
        { description: 'Defeat 10 monsters', type: 'KILL', targetType: 'ANY', targetCount: 10 },
      ],
      rewards: { xp: 250, gold: 125, items: [] },
    },
  },
  {
    id: 'dynamic_prosperity_low',
    trigger: (state) => state.prosperity < 30 && state.buildingCount > 10,
    quest: {
      title: 'Economic Recovery',
      description: 'Your settlement\'s economy is struggling. Build trade and production buildings.',
      flavorText: 'Gold doesn\'t grow on trees, but a marketplace can make it flow like water.',
      type: 'BUILD',
      category: 'DAILY',
      objectives: [
        { description: 'Build a Marketplace', type: 'BUILD', targetType: 'MARKETPLACE', targetCount: 1 },
      ],
      rewards: { xp: 300, gold: 200, items: [] },
    },
  },
  {
    id: 'dynamic_exploration_call',
    trigger: (state) => state.level >= 3 && state.dungeonFloorsCleared < 3,
    quest: {
      title: 'Call to Adventure',
      description: 'There are dungeons waiting to be explored. Form an expedition party and delve deeper.',
      flavorText: 'Adventure awaits those who dare to seek it. The dungeons hold both treasure and danger.',
      type: 'EXPLORE',
      category: 'DAILY',
      objectives: [
        { description: 'Complete 3 Dungeon Floors', type: 'EXPLORE', targetType: 'DUNGEON_FLOOR', targetCount: 3 },
      ],
      rewards: { xp: 400, gold: 200, items: [] },
    },
  },
  {
    id: 'dynamic_crafting_challenge',
    trigger: (state) => state.level >= 4 && state.craftingStations > 0,
    quest: {
      title: 'Master Craftsman',
      description: 'Your crafting stations are idle. Put them to use and create useful items.',
      flavorText: 'A skilled craftsman can turn raw materials into powerful weapons and armor.',
      type: 'COLLECT',
      category: 'DAILY',
      objectives: [
        { description: 'Craft 5 Items', type: 'COLLECT', targetType: 'CRAFT_ITEM', targetCount: 5 },
      ],
      rewards: { xp: 250, gold: 150, items: [] },
    },
  },
  {
    id: 'dynamic_raid_prepare',
    trigger: (state) => state.raidIncoming && state.defensiveBuildings < 4,
    quest: {
      title: 'Prepare for Battle',
      description: 'A raid is incoming! Quickly build defenses and train your warriors.',
      flavorText: 'The drums of war echo in the distance. You have little time to prepare.',
      type: 'BUILD',
      category: 'DAILY',
      objectives: [
        { description: 'Build 2 Watchtowers', type: 'BUILD', targetType: 'WATCHTOWER', targetCount: 2 },
        { description: 'Defeat 5 enemies to train', type: 'KILL', targetType: 'ANY', targetCount: 5 },
      ],
      rewards: { xp: 350, gold: 175, items: [] },
    },
  },
];

class DynamicQuestGenerator {
  constructor() {
    this.activeDynamicQuest = null;
    this.completedDynamicQuests = new Set();
    this.lastGenerationTime = 0;
    this.generationCooldown = 300000; // 5 minutes
    this.questCounter = 0;
  }

  /**
   * Attempt to generate a dynamic quest based on current game state
   * @param {Object} gameState - Current game state snapshot
   * @returns {Object|null} Generated quest or null if no quest triggered
   */
  generateQuest(gameState) {
    const now = Date.now();

    // Don't generate if one is already active or cooldown hasn't elapsed
    if (this.activeDynamicQuest) return null;
    if (now - this.lastGenerationTime < this.generationCooldown) return null;

    // Check each template for trigger conditions
    for (const template of DYNAMIC_QUEST_TEMPLATES) {
      // Skip recently completed templates (cooldown per template)
      if (this.completedDynamicQuests.has(template.id)) continue;

      try {
        if (template.trigger(gameState)) {
          const quest = this._buildQuest(template);
          this.activeDynamicQuest = quest;
          this.lastGenerationTime = now;
          return quest;
        }
      } catch {
        // Skip templates that error on state access
        continue;
      }
    }

    return null;
  }

  /**
   * Build a quest object from a template
   * @private
   */
  _buildQuest(template) {
    this.questCounter++;
    const questId = `dynamic_${template.id}_${this.questCounter}`;

    return {
      id: questId,
      title: template.quest.title,
      description: template.quest.description,
      flavorText: template.quest.flavorText,
      type: template.quest.type,
      category: template.quest.category,
      levelRequirement: 1,
      objectives: template.quest.objectives.map((obj, i) => ({
        id: `${questId}_obj_${i}`,
        description: obj.description,
        type: obj.type,
        targetType: obj.targetType,
        targetCount: obj.targetCount,
        currentCount: 0,
        completed: false,
      })),
      rewards: { ...template.quest.rewards, unlockQuests: [] },
      state: 'AVAILABLE',
      questGiver: null,
      repeatable: false,
      isDynamic: true,
      templateId: template.id,
    };
  }

  /**
   * Mark the current dynamic quest as completed
   * @param {string} questId - ID of the completed quest
   */
  completeQuest(questId) {
    if (this.activeDynamicQuest && this.activeDynamicQuest.id === questId) {
      this.completedDynamicQuests.add(this.activeDynamicQuest.templateId);
      this.activeDynamicQuest = null;

      // Clear completed set after 10 completions to allow re-triggering
      if (this.completedDynamicQuests.size > 10) {
        this.completedDynamicQuests.clear();
      }
    }
  }

  /**
   * Get the currently active dynamic quest
   * @returns {Object|null}
   */
  getActiveQuest() {
    return this.activeDynamicQuest;
  }

  /**
   * Build a game state snapshot from various game systems
   * @param {Object} params - Various game data sources
   * @returns {Object} Simplified game state for trigger evaluation
   */
  static buildGameState({
    resources = {},
    buildings = [],
    npcs = [],
    enemies = [],
    player = {},
    townStats = {},
    dungeonProgress = {},
  }) {
    const defensive = ['WALL', 'TOWER', 'WATCHTOWER', 'GUARD_POST', 'FORTRESS', 'CASTLE'];
    const buildingTypes = {};
    for (const b of buildings) {
      buildingTypes[b.type] = (buildingTypes[b.type] || 0) + 1;
    }

    return {
      food: resources.FOOD || resources.food || 0,
      wood: resources.WOOD || resources.wood || 0,
      stone: resources.STONE || resources.stone || 0,
      gold: resources.GOLD || resources.gold || 0,
      farmCount: buildingTypes.FARM || 0,
      houseCount: buildingTypes.HOUSE || 0,
      defensiveBuildings: buildings.filter((b) => defensive.includes(b.type)).length,
      buildingCount: buildings.length,
      population: npcs.length,
      housingCapacity: buildings.reduce((sum, b) => sum + (b.populationCapacity || 0), 0),
      nearbyEnemies: enemies.length,
      level: player.level || 1,
      prosperity: townStats.prosperity || 0,
      dungeonFloorsCleared: dungeonProgress.maxFloor || 0,
      craftingStations: buildingTypes.CRAFTING_STATION || 0,
      raidIncoming: false, // Would need raid system integration
    };
  }

  /**
   * Reset the generator
   */
  reset() {
    this.activeDynamicQuest = null;
    this.completedDynamicQuests.clear();
    this.lastGenerationTime = 0;
    this.questCounter = 0;
  }
}

export default DynamicQuestGenerator;
