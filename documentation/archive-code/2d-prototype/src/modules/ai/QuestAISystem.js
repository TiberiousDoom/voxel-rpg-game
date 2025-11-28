/**
 * QuestAISystem.js - Dynamic Quest Generation and Management
 *
 * Features:
 * - Dynamic quest generation based on game state
 * - Quest giver behaviors
 * - Adaptive objectives
 * - Reputation impact
 * - Quest chains and prerequisites
 */

/**
 * Quest types
 */
export const QuestType = {
  FETCH: 'FETCH',         // Gather items, deliver to NPC
  KILL: 'KILL',           // Eliminate enemies
  ESCORT: 'ESCORT',       // Protect NPC to destination
  DISCOVER: 'DISCOVER',   // Explore location/structure
  CRAFT: 'CRAFT',         // Create specific items
  TALK: 'TALK',           // Speak to NPC
  DEFEND: 'DEFEND',       // Defend location
  COLLECT: 'COLLECT'      // Collect resources
};

/**
 * Quest difficulty levels
 */
export const QuestDifficulty = {
  EASY: 'EASY',
  NORMAL: 'NORMAL',
  HARD: 'HARD',
  LEGENDARY: 'LEGENDARY'
};

/**
 * Quest states
 */
export const QuestState = {
  AVAILABLE: 'AVAILABLE',     // Can be accepted
  ACTIVE: 'ACTIVE',           // In progress
  COMPLETED: 'COMPLETED',     // Objectives done, needs turn-in
  TURNED_IN: 'TURNED_IN',     // Fully complete
  FAILED: 'FAILED',           // Failed
  EXPIRED: 'EXPIRED'          // Timed out
};

/**
 * Objective types
 */
export const ObjectiveType = {
  COLLECT_ITEM: 'COLLECT_ITEM',
  KILL_ENEMY: 'KILL_ENEMY',
  REACH_LOCATION: 'REACH_LOCATION',
  TALK_TO_NPC: 'TALK_TO_NPC',
  CRAFT_ITEM: 'CRAFT_ITEM',
  SURVIVE_TIME: 'SURVIVE_TIME',
  ESCORT_NPC: 'ESCORT_NPC',
  DEFEND_LOCATION: 'DEFEND_LOCATION'
};

/**
 * Quest objective
 */
class QuestObjective {
  constructor(config = {}) {
    this.id = config.id || `obj_${Date.now()}`;
    this.type = config.type || ObjectiveType.COLLECT_ITEM;
    this.description = config.description || 'Complete objective';

    // Target (what to do)
    this.target = config.target || null; // itemId, enemyType, locationId, npcId
    this.targetCount = config.targetCount || 1;
    this.currentCount = config.currentCount || 0;

    // Optional
    this.optional = config.optional || false;
    this.hidden = config.hidden || false; // Reveal when triggered

    // Location constraint
    this.location = config.location || null;
    this.locationRadius = config.locationRadius || 50;
  }

  /**
   * Update objective progress
   * @param {number} amount - Progress amount
   * @returns {boolean} True if completed
   */
  addProgress(amount = 1) {
    this.currentCount = Math.min(this.targetCount, this.currentCount + amount);
    return this.isComplete();
  }

  /**
   * Check if objective is complete
   * @returns {boolean}
   */
  isComplete() {
    return this.currentCount >= this.targetCount;
  }

  /**
   * Get progress percentage
   * @returns {number} 0-100
   */
  getProgressPercent() {
    return Math.floor((this.currentCount / this.targetCount) * 100);
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      description: this.description,
      target: this.target,
      targetCount: this.targetCount,
      currentCount: this.currentCount,
      optional: this.optional,
      hidden: this.hidden,
      location: this.location,
      locationRadius: this.locationRadius
    };
  }

  static fromJSON(data) {
    return new QuestObjective(data);
  }
}

/**
 * Quest reward
 */
class QuestReward {
  constructor(config = {}) {
    this.gold = config.gold || 0;
    this.experience = config.experience || 0;
    this.items = config.items || []; // [{itemId, quantity}]
    this.reputation = config.reputation || {}; // {npcId: change}
    this.unlocks = config.unlocks || []; // Quest IDs to unlock
  }

  toJSON() {
    return { ...this };
  }

  static fromJSON(data) {
    return new QuestReward(data);
  }
}

/**
 * Quest definition
 */
class Quest {
  constructor(config = {}) {
    this.id = config.id || `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.title = config.title || 'Untitled Quest';
    this.description = config.description || '';
    this.type = config.type || QuestType.FETCH;
    this.difficulty = config.difficulty || QuestDifficulty.NORMAL;

    // Quest giver
    this.giverNpcId = config.giverNpcId || null;
    this.turnInNpcId = config.turnInNpcId || config.giverNpcId || null;

    // State
    this.state = config.state || QuestState.AVAILABLE;

    // Objectives
    this.objectives = (config.objectives || []).map(o =>
      o instanceof QuestObjective ? o : new QuestObjective(o)
    );

    // Rewards
    this.reward = config.reward instanceof QuestReward ?
      config.reward : new QuestReward(config.reward || {});

    // Prerequisites
    this.prerequisites = config.prerequisites || []; // Quest IDs that must be completed
    this.levelRequirement = config.levelRequirement || 1;

    // Time limit (optional)
    this.timeLimit = config.timeLimit || 0; // 0 = no limit, ms
    this.acceptedAt = config.acceptedAt || null;

    // Chain
    this.chainId = config.chainId || null;
    this.chainOrder = config.chainOrder || 0;

    // Flags
    this.repeatable = config.repeatable || false;
    this.autoComplete = config.autoComplete || false; // Complete without turn-in
  }

  /**
   * Accept the quest
   */
  accept() {
    if (this.state !== QuestState.AVAILABLE) return false;
    this.state = QuestState.ACTIVE;
    this.acceptedAt = Date.now();
    return true;
  }

  /**
   * Update objective progress
   * @param {string} objectiveId - Objective ID
   * @param {number} amount - Progress amount
   * @returns {boolean} True if objective completed
   */
  updateObjective(objectiveId, amount = 1) {
    const objective = this.objectives.find(o => o.id === objectiveId);
    if (!objective) return false;

    const wasComplete = objective.isComplete();
    objective.addProgress(amount);

    // Check if all required objectives complete
    if (!wasComplete && this.areObjectivesComplete()) {
      if (this.autoComplete) {
        this.state = QuestState.TURNED_IN;
      } else {
        this.state = QuestState.COMPLETED;
      }
    }

    return !wasComplete && objective.isComplete();
  }

  /**
   * Update progress by target
   * @param {string} type - ObjectiveType
   * @param {string} target - Target identifier
   * @param {number} amount - Progress amount
   * @returns {boolean} True if any objective updated
   */
  updateProgressByTarget(type, target, amount = 1) {
    let updated = false;

    for (const objective of this.objectives) {
      if (objective.type === type && objective.target === target) {
        if (!objective.isComplete()) {
          objective.addProgress(amount);
          updated = true;
        }
      }
    }

    // Check completion
    if (updated && this.areObjectivesComplete()) {
      if (this.autoComplete) {
        this.state = QuestState.TURNED_IN;
      } else {
        this.state = QuestState.COMPLETED;
      }
    }

    return updated;
  }

  /**
   * Check if all required objectives are complete
   * @returns {boolean}
   */
  areObjectivesComplete() {
    return this.objectives
      .filter(o => !o.optional)
      .every(o => o.isComplete());
  }

  /**
   * Turn in quest
   * @returns {QuestReward|null}
   */
  turnIn() {
    if (this.state !== QuestState.COMPLETED) return null;
    this.state = QuestState.TURNED_IN;
    return this.reward;
  }

  /**
   * Fail the quest
   */
  fail() {
    if (this.state === QuestState.ACTIVE) {
      this.state = QuestState.FAILED;
    }
  }

  /**
   * Check if quest has expired
   * @returns {boolean}
   */
  hasExpired() {
    if (!this.timeLimit || !this.acceptedAt) return false;
    return Date.now() - this.acceptedAt > this.timeLimit;
  }

  /**
   * Get overall progress
   * @returns {number} 0-100
   */
  getOverallProgress() {
    const required = this.objectives.filter(o => !o.optional);
    if (required.length === 0) return 100;

    const totalProgress = required.reduce((sum, o) => sum + o.getProgressPercent(), 0);
    return Math.floor(totalProgress / required.length);
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type,
      difficulty: this.difficulty,
      giverNpcId: this.giverNpcId,
      turnInNpcId: this.turnInNpcId,
      state: this.state,
      objectives: this.objectives.map(o => o.toJSON()),
      reward: this.reward.toJSON(),
      prerequisites: this.prerequisites,
      levelRequirement: this.levelRequirement,
      timeLimit: this.timeLimit,
      acceptedAt: this.acceptedAt,
      chainId: this.chainId,
      chainOrder: this.chainOrder,
      repeatable: this.repeatable,
      autoComplete: this.autoComplete
    };
  }

  static fromJSON(data) {
    const quest = new Quest(data);
    quest.objectives = data.objectives.map(o => QuestObjective.fromJSON(o));
    quest.reward = QuestReward.fromJSON(data.reward);
    return quest;
  }
}

/**
 * Quest template for dynamic generation
 */
const QUEST_TEMPLATES = {
  // Fetch quests
  fetch_food: {
    type: QuestType.FETCH,
    titleTemplate: 'Gather {count} {item}',
    descriptionTemplate: 'Help {npc} by gathering {count} {item}.',
    difficulty: QuestDifficulty.EASY,
    objectiveType: ObjectiveType.COLLECT_ITEM,
    items: ['bread', 'meat', 'vegetables', 'fish', 'fruit'],
    countRange: [3, 10],
    baseReward: { gold: 20, experience: 50 }
  },
  fetch_materials: {
    type: QuestType.FETCH,
    titleTemplate: 'Collect {count} {item}',
    descriptionTemplate: 'Gather {count} {item} for {npc}.',
    difficulty: QuestDifficulty.NORMAL,
    objectiveType: ObjectiveType.COLLECT_ITEM,
    items: ['wood', 'stone', 'iron_ore', 'leather'],
    countRange: [5, 20],
    baseReward: { gold: 50, experience: 100 }
  },

  // Kill quests
  kill_monsters: {
    type: QuestType.KILL,
    titleTemplate: 'Eliminate {count} {enemy}',
    descriptionTemplate: 'Clear out {count} {enemy} threatening the area.',
    difficulty: QuestDifficulty.NORMAL,
    objectiveType: ObjectiveType.KILL_ENEMY,
    enemies: ['SLIME', 'GOBLIN', 'WOLF'],
    countRange: [3, 8],
    baseReward: { gold: 80, experience: 150 }
  },
  kill_boss: {
    type: QuestType.KILL,
    titleTemplate: 'Defeat the {enemy}',
    descriptionTemplate: 'A powerful {enemy} has been spotted. Defeat it!',
    difficulty: QuestDifficulty.HARD,
    objectiveType: ObjectiveType.KILL_ENEMY,
    enemies: ['ORC', 'SKELETON'],
    countRange: [1, 1],
    baseReward: { gold: 200, experience: 400 }
  },

  // Discover quests
  discover_location: {
    type: QuestType.DISCOVER,
    titleTemplate: 'Explore the {location}',
    descriptionTemplate: 'Investigate the mysterious {location}.',
    difficulty: QuestDifficulty.NORMAL,
    objectiveType: ObjectiveType.REACH_LOCATION,
    locations: ['ruins', 'cave', 'temple', 'tower'],
    baseReward: { gold: 100, experience: 200 }
  },

  // Craft quests
  craft_item: {
    type: QuestType.CRAFT,
    titleTemplate: 'Craft {count} {item}',
    descriptionTemplate: '{npc} needs {count} {item}. Can you craft them?',
    difficulty: QuestDifficulty.NORMAL,
    objectiveType: ObjectiveType.CRAFT_ITEM,
    items: ['sword', 'pickaxe', 'hammer'],
    countRange: [1, 3],
    baseReward: { gold: 100, experience: 150 }
  }
};

/**
 * QuestAISystem class
 */
export class QuestAISystem {
  /**
   * Create quest AI system
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    // Quest storage
    this.quests = new Map(); // questId -> Quest
    this.questChains = new Map(); // chainId -> [questIds]

    // Player quest tracking
    this.activeQuests = new Set(); // Quest IDs
    this.completedQuests = new Set(); // Quest IDs

    // NPC quest assignments
    this.npcQuests = new Map(); // npcId -> [questIds]

    // Configuration
    this.config = {
      maxActiveQuests: options.maxActiveQuests || 10,
      questGenerationInterval: options.questGenerationInterval || 300000, // 5 min
      questExpirationTime: options.questExpirationTime || 86400000 // 24 hours
    };

    // Templates
    this.templates = { ...QUEST_TEMPLATES, ...options.templates };

    // Current game state
    this.playerLevel = 1;

    // Statistics
    this.stats = {
      questsGenerated: 0,
      questsCompleted: 0,
      questsFailed: 0,
      totalRewardsGiven: 0
    };

    // Event listeners
    this.listeners = [];
  }

  /**
   * Add a quest
   * @param {Object|Quest} questData - Quest data or Quest instance
   * @returns {Quest}
   */
  addQuest(questData) {
    const quest = questData instanceof Quest ? questData : new Quest(questData);
    this.quests.set(quest.id, quest);

    // Track by NPC
    if (quest.giverNpcId) {
      if (!this.npcQuests.has(quest.giverNpcId)) {
        this.npcQuests.set(quest.giverNpcId, []);
      }
      this.npcQuests.get(quest.giverNpcId).push(quest.id);
    }

    // Track chain
    if (quest.chainId) {
      if (!this.questChains.has(quest.chainId)) {
        this.questChains.set(quest.chainId, []);
      }
      this.questChains.get(quest.chainId).push(quest.id);
    }

    return quest;
  }

  /**
   * Get quest by ID
   * @param {string} questId - Quest ID
   * @returns {Quest|null}
   */
  getQuest(questId) {
    return this.quests.get(questId) || null;
  }

  /**
   * Get quests available from NPC
   * @param {string} npcId - NPC ID
   * @returns {Quest[]}
   */
  getQuestsFromNPC(npcId) {
    const questIds = this.npcQuests.get(npcId) || [];
    return questIds
      .map(id => this.quests.get(id))
      .filter(q => q && q.state === QuestState.AVAILABLE)
      .filter(q => this._meetsPrerequisites(q));
  }

  /**
   * Check if player meets quest prerequisites
   * @private
   */
  _meetsPrerequisites(quest) {
    // Level check
    if (this.playerLevel < quest.levelRequirement) return false;

    // Prerequisites check
    for (const prereqId of quest.prerequisites) {
      if (!this.completedQuests.has(prereqId)) return false;
    }

    return true;
  }

  /**
   * Accept a quest
   * @param {string} questId - Quest ID
   * @returns {boolean} Success
   */
  acceptQuest(questId) {
    const quest = this.quests.get(questId);
    if (!quest) return false;

    if (this.activeQuests.size >= this.config.maxActiveQuests) {
      this._emitEvent('questError', { questId, error: 'max_quests_reached' });
      return false;
    }

    if (!this._meetsPrerequisites(quest)) {
      this._emitEvent('questError', { questId, error: 'prerequisites_not_met' });
      return false;
    }

    if (quest.accept()) {
      this.activeQuests.add(questId);
      this._emitEvent('questAccepted', { questId, quest });
      return true;
    }

    return false;
  }

  /**
   * Update quest progress
   * @param {string} type - ObjectiveType
   * @param {string} target - Target identifier
   * @param {number} amount - Progress amount
   */
  updateProgress(type, target, amount = 1) {
    for (const questId of this.activeQuests) {
      const quest = this.quests.get(questId);
      if (!quest || quest.state !== QuestState.ACTIVE) continue;

      const updated = quest.updateProgressByTarget(type, target, amount);

      if (updated) {
        this._emitEvent('questProgress', {
          questId,
          type,
          target,
          progress: quest.getOverallProgress()
        });

        if (quest.state === QuestState.COMPLETED || quest.state === QuestState.TURNED_IN) {
          this._emitEvent('questCompleted', { questId, quest });
        }
      }
    }
  }

  /**
   * Turn in a quest
   * @param {string} questId - Quest ID
   * @returns {QuestReward|null}
   */
  turnInQuest(questId) {
    const quest = this.quests.get(questId);
    if (!quest) return null;

    const reward = quest.turnIn();
    if (reward) {
      this.activeQuests.delete(questId);
      this.completedQuests.add(questId);

      this.stats.questsCompleted++;
      this.stats.totalRewardsGiven += reward.gold;

      this._emitEvent('questTurnedIn', { questId, reward });

      // Unlock next quests in chain
      if (quest.chainId) {
        this._unlockNextInChain(quest);
      }

      // Unlock prerequisite quests
      for (const unlockId of reward.unlocks) {
        const unlockQuest = this.quests.get(unlockId);
        if (unlockQuest && unlockQuest.state === QuestState.AVAILABLE) {
          // Quest is now available
          this._emitEvent('questUnlocked', { questId: unlockId });
        }
      }

      return reward;
    }

    return null;
  }

  /**
   * Abandon a quest
   * @param {string} questId - Quest ID
   */
  abandonQuest(questId) {
    const quest = this.quests.get(questId);
    if (!quest) return;

    quest.fail();
    this.activeQuests.delete(questId);
    this.stats.questsFailed++;

    this._emitEvent('questAbandoned', { questId });

    // Reset quest if repeatable
    if (quest.repeatable) {
      quest.state = QuestState.AVAILABLE;
      quest.objectives.forEach(o => { o.currentCount = 0; });
    }
  }

  /**
   * Unlock next quest in chain
   * @private
   */
  _unlockNextInChain(quest) {
    const chain = this.questChains.get(quest.chainId);
    if (!chain) return;

    const nextIndex = quest.chainOrder + 1;
    for (const questId of chain) {
      const nextQuest = this.quests.get(questId);
      if (nextQuest && nextQuest.chainOrder === nextIndex) {
        // Next quest is now available
        this._emitEvent('questUnlocked', { questId, chainId: quest.chainId });
        break;
      }
    }
  }

  /**
   * Generate a random quest
   * @param {Object} context - Generation context
   * @returns {Quest|null}
   */
  generateQuest(context = {}) {
    const templateKeys = Object.keys(this.templates);
    const templateKey = templateKeys[Math.floor(Math.random() * templateKeys.length)];
    const template = this.templates[templateKey];

    return this._createQuestFromTemplate(template, context);
  }

  /**
   * Create quest from template
   * @private
   */
  _createQuestFromTemplate(template, context) {
    const npcId = context.npcId || null;
    const npcName = context.npcName || 'villager';

    // Select random target
    let target, targetName;
    if (template.items) {
      target = template.items[Math.floor(Math.random() * template.items.length)];
      targetName = target.replace(/_/g, ' ');
    } else if (template.enemies) {
      target = template.enemies[Math.floor(Math.random() * template.enemies.length)];
      targetName = target.toLowerCase();
    } else if (template.locations) {
      target = template.locations[Math.floor(Math.random() * template.locations.length)];
      targetName = target;
    }

    // Determine count
    let count = 1;
    if (template.countRange) {
      const [min, max] = template.countRange;
      count = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Build title and description
    const title = template.titleTemplate
      .replace('{count}', count)
      .replace('{item}', targetName)
      .replace('{enemy}', targetName)
      .replace('{location}', targetName);

    const description = template.descriptionTemplate
      .replace('{count}', count)
      .replace('{item}', targetName)
      .replace('{enemy}', targetName)
      .replace('{location}', targetName)
      .replace('{npc}', npcName);

    // Calculate rewards based on difficulty
    const difficultyMultipliers = {
      [QuestDifficulty.EASY]: 0.5,
      [QuestDifficulty.NORMAL]: 1.0,
      [QuestDifficulty.HARD]: 2.0,
      [QuestDifficulty.LEGENDARY]: 4.0
    };
    const mult = difficultyMultipliers[template.difficulty] || 1.0;

    const reward = new QuestReward({
      gold: Math.floor((template.baseReward?.gold || 50) * mult * count * 0.5),
      experience: Math.floor((template.baseReward?.experience || 100) * mult * count * 0.5)
    });

    // Create objective
    const objective = new QuestObjective({
      type: template.objectiveType,
      description: `${title}`,
      target,
      targetCount: count
    });

    // Create quest
    const quest = new Quest({
      title,
      description,
      type: template.type,
      difficulty: template.difficulty,
      giverNpcId: npcId,
      turnInNpcId: npcId,
      objectives: [objective],
      reward
    });

    this.addQuest(quest);
    this.stats.questsGenerated++;

    this._emitEvent('questGenerated', { questId: quest.id, templateKey: template.type });

    return quest;
  }

  /**
   * Generate quests for an NPC
   * @param {string} npcId - NPC ID
   * @param {string} npcName - NPC name
   * @param {number} count - Number of quests to generate
   */
  generateQuestsForNPC(npcId, npcName, count = 2) {
    const quests = [];
    for (let i = 0; i < count; i++) {
      const quest = this.generateQuest({ npcId, npcName });
      if (quest) quests.push(quest);
    }
    return quests;
  }

  /**
   * Update system (check expirations, etc.)
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime) {
    // Check for expired quests
    for (const questId of this.activeQuests) {
      const quest = this.quests.get(questId);
      if (quest && quest.hasExpired()) {
        quest.state = QuestState.EXPIRED;
        this.activeQuests.delete(questId);
        this.stats.questsFailed++;
        this._emitEvent('questExpired', { questId });
      }
    }
  }

  /**
   * Set player level
   * @param {number} level - Player level
   */
  setPlayerLevel(level) {
    this.playerLevel = level;
  }

  /**
   * Get active quests
   * @returns {Quest[]}
   */
  getActiveQuests() {
    return Array.from(this.activeQuests)
      .map(id => this.quests.get(id))
      .filter(Boolean);
  }

  /**
   * Get quests ready for turn-in
   * @returns {Quest[]}
   */
  getCompletedQuests() {
    return this.getActiveQuests().filter(q => q.state === QuestState.COMPLETED);
  }

  /**
   * Add event listener
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Emit event
   * @private
   */
  _emitEvent(type, data) {
    for (const listener of this.listeners) {
      try {
        listener(type, data);
      } catch (error) {
        console.error('[QuestAISystem] Listener error:', error);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      activeQuestCount: this.activeQuests.size,
      completedQuestCount: this.completedQuests.size,
      totalQuests: this.quests.size
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    const quests = {};
    for (const [id, quest] of this.quests) {
      quests[id] = quest.toJSON();
    }

    return {
      quests,
      activeQuests: Array.from(this.activeQuests),
      completedQuests: Array.from(this.completedQuests),
      playerLevel: this.playerLevel
    };
  }

  /**
   * Load from JSON
   */
  fromJSON(data) {
    this.quests.clear();
    this.npcQuests.clear();
    this.questChains.clear();
    this.activeQuests.clear();
    this.completedQuests.clear();

    if (data.quests) {
      for (const questData of Object.values(data.quests)) {
        const quest = Quest.fromJSON(questData);
        this.addQuest(quest);
      }
    }

    if (data.activeQuests) {
      for (const id of data.activeQuests) {
        this.activeQuests.add(id);
      }
    }

    if (data.completedQuests) {
      for (const id of data.completedQuests) {
        this.completedQuests.add(id);
      }
    }

    this.playerLevel = data.playerLevel || 1;
  }
}

export { Quest, QuestObjective, QuestReward };
export default QuestAISystem;
