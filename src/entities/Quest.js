/**
 * Quest.js - Quest entity class
 *
 * Quest types:
 * - KILL: Kill specific monsters
 * - COLLECT: Collect specific items
 * - EXPLORE: Discover specific locations
 * - BUILD: Construct specific buildings
 * - TALK: Speak with NPCs
 *
 * Quest states:
 * - AVAILABLE: Can be accepted
 * - ACTIVE: Currently in progress
 * - COMPLETED: Finished
 * - FAILED: Failed (optional)
 */

/**
 * Quest Objective class
 */
export class QuestObjective {
  /**
   * Create a quest objective
   * @param {Object} config - Objective configuration
   */
  constructor(config = {}) {
    this.id = config.id || crypto.randomUUID();
    this.description = config.description || '';
    this.type = config.type || 'KILL'; // KILL, COLLECT, EXPLORE, BUILD, TALK
    this.targetType = config.targetType || null; // Monster type, item type, location name, etc.
    this.targetCount = config.targetCount || 1;
    this.currentCount = config.currentCount || 0;
    this.completed = config.completed || false;
    this.optional = config.optional || false; // Optional objectives
  }

  /**
   * Update objective progress
   * @param {number} amount - Amount to add to progress
   * @returns {boolean} - true if objective completed
   */
  addProgress(amount = 1) {
    this.currentCount = Math.min(this.currentCount + amount, this.targetCount);
    this.completed = this.currentCount >= this.targetCount;
    return this.completed;
  }

  /**
   * Get progress percentage
   * @returns {number} - Progress 0-1
   */
  getProgress() {
    return this.targetCount > 0 ? this.currentCount / this.targetCount : 0;
  }

  /**
   * Reset objective progress
   */
  reset() {
    this.currentCount = 0;
    this.completed = false;
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      description: this.description,
      type: this.type,
      targetType: this.targetType,
      targetCount: this.targetCount,
      currentCount: this.currentCount,
      completed: this.completed,
      optional: this.optional
    };
  }
}

/**
 * Quest class
 */
export class Quest {
  /**
   * Create a quest
   * @param {Object} config - Quest configuration
   */
  constructor(config = {}) {
    // Core identity
    this.id = config.id || crypto.randomUUID();
    this.title = config.title || 'Untitled Quest';
    this.description = config.description || '';
    this.type = config.type || 'KILL'; // Primary quest type

    // Objectives
    this.objectives = (config.objectives || []).map(obj =>
      obj instanceof QuestObjective ? obj : new QuestObjective(obj)
    );

    // Requirements
    this.levelRequirement = config.levelRequirement || 1;
    this.prerequisiteQuests = config.prerequisiteQuests || []; // Quest IDs that must be completed first

    // Rewards
    this.rewards = {
      xp: config.rewards?.xp || 0,
      gold: config.rewards?.gold || 0,
      items: config.rewards?.items || [],
      unlockQuests: config.rewards?.unlockQuests || [] // Quest IDs unlocked on completion
    };

    // State
    this.state = config.state || 'AVAILABLE'; // AVAILABLE, ACTIVE, COMPLETED, FAILED
    this.acceptedAt = config.acceptedAt || null;
    this.completedAt = config.completedAt || null;

    // Quest giver (optional)
    this.questGiver = config.questGiver || null; // NPC ID or name

    // Quest chain info (optional)
    this.chainId = config.chainId || null;
    this.chainIndex = config.chainIndex || null;

    // Metadata
    this.category = config.category || 'MAIN'; // MAIN, SIDE, DAILY, REPEATABLE
    this.repeatable = config.repeatable || false;
    this.timesCompleted = config.timesCompleted || 0;
  }

  /**
   * Check if quest can be accepted
   * @param {number} playerLevel - Current player level
   * @param {Array<string>} completedQuests - List of completed quest IDs
   * @returns {boolean}
   */
  canAccept(playerLevel, completedQuests = []) {
    // Check level requirement
    if (playerLevel < this.levelRequirement) {
      return false;
    }

    // Check prerequisites
    if (this.prerequisiteQuests.length > 0) {
      const hasPrereqs = this.prerequisiteQuests.every(questId =>
        completedQuests.includes(questId)
      );
      if (!hasPrereqs) {
        return false;
      }
    }

    // Check if already active or completed (unless repeatable)
    if (this.state === 'ACTIVE') {
      return false;
    }

    if (this.state === 'COMPLETED' && !this.repeatable) {
      return false;
    }

    return true;
  }

  /**
   * Accept the quest
   */
  accept() {
    if (this.state !== 'AVAILABLE') {
      console.warn(`⚠️ Quest ${this.id} cannot be accepted (current state: ${this.state})`);
      return false;
    }

    this.state = 'ACTIVE';
    this.acceptedAt = Date.now();

    // Reset objectives if repeatable
    if (this.repeatable) {
      this.objectives.forEach(obj => obj.reset());
    }

    // eslint-disable-next-line no-console
    console.log(`✅ Quest accepted: ${this.title}`);
    return true;
  }

  /**
   * Update quest objective progress
   * @param {string} objectiveId - Objective ID
   * @param {number} amount - Amount to add
   * @returns {boolean} - true if quest completed
   */
  updateObjective(objectiveId, amount = 1) {
    const objective = this.objectives.find(obj => obj.id === objectiveId);
    if (!objective) {
      console.warn(`⚠️ Objective ${objectiveId} not found in quest ${this.id}`);
      return false;
    }

    objective.addProgress(amount);

    // Check if all required objectives are complete
    if (this.isComplete()) {
      this.complete();
      return true;
    }

    return false;
  }

  /**
   * Update quest progress by target type
   * @param {string} type - Objective type (KILL, COLLECT, etc.)
   * @param {string} targetType - Target type (e.g., 'SLIME', 'IRON_ORE')
   * @param {number} amount - Amount to add
   * @returns {boolean} - true if quest completed
   */
  updateProgress(type, targetType, amount = 1) {
    let questCompleted = false;

    // Find matching objectives
    const matchingObjectives = this.objectives.filter(
      obj => obj.type === type && obj.targetType === targetType && !obj.completed
    );

    matchingObjectives.forEach(objective => {
      objective.addProgress(amount);
    });

    // Check if quest is complete
    if (this.isComplete()) {
      this.complete();
      questCompleted = true;
    }

    return questCompleted;
  }

  /**
   * Check if all required objectives are complete
   * @returns {boolean}
   */
  isComplete() {
    return this.objectives
      .filter(obj => !obj.optional)
      .every(obj => obj.completed);
  }

  /**
   * Complete the quest
   */
  complete() {
    if (this.state !== 'ACTIVE') {
      console.warn(`⚠️ Quest ${this.id} cannot be completed (current state: ${this.state})`);
      return false;
    }

    this.state = 'COMPLETED';
    this.completedAt = Date.now();
    this.timesCompleted++;

    // eslint-disable-next-line no-console
    console.log(`🎉 Quest completed: ${this.title}`);

    // If repeatable, make available again
    if (this.repeatable) {
      setTimeout(() => {
        this.state = 'AVAILABLE';
        this.objectives.forEach(obj => obj.reset());
      }, 0);
    }

    return true;
  }

  /**
   * Fail the quest
   */
  fail() {
    if (this.state !== 'ACTIVE') {
      return false;
    }

    this.state = 'FAILED';
    // eslint-disable-next-line no-console
    console.log(`❌ Quest failed: ${this.title}`);
    return true;
  }

  /**
   * Abandon the quest
   */
  abandon() {
    if (this.state !== 'ACTIVE') {
      return false;
    }

    this.state = 'AVAILABLE';
    this.acceptedAt = null;
    this.objectives.forEach(obj => obj.reset());

    // eslint-disable-next-line no-console
    console.log(`🚫 Quest abandoned: ${this.title}`);
    return true;
  }

  /**
   * Get overall quest progress
   * @returns {number} - Progress 0-1
   */
  getProgress() {
    if (this.objectives.length === 0) return 0;

    const requiredObjectives = this.objectives.filter(obj => !obj.optional);
    if (requiredObjectives.length === 0) return 1;

    const totalProgress = requiredObjectives.reduce(
      (sum, obj) => sum + obj.getProgress(),
      0
    );

    return totalProgress / requiredObjectives.length;
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type,
      objectives: this.objectives.map(obj => obj.toJSON()),
      levelRequirement: this.levelRequirement,
      prerequisiteQuests: this.prerequisiteQuests,
      rewards: this.rewards,
      state: this.state,
      acceptedAt: this.acceptedAt,
      completedAt: this.completedAt,
      questGiver: this.questGiver,
      chainId: this.chainId,
      chainIndex: this.chainIndex,
      category: this.category,
      repeatable: this.repeatable,
      timesCompleted: this.timesCompleted
    };
  }

  /**
   * Create quest from JSON
   * @param {Object} data - Serialized quest data
   * @returns {Quest}
   */
  static fromJSON(data) {
    return new Quest(data);
  }
}

export default Quest;
