/**
 * ActiveSkillSystem.js
 *
 * Manages active skill activation, cooldowns, and temporary buffs
 *
 * Active skills provide temporary powerful effects with cooldowns:
 * - Activation validation (unlocked, off cooldown, sufficient resources)
 * - Cooldown tracking
 * - Buff duration management
 * - Effect application and removal
 */

import skillTreeSystem from './SkillTreeSystem';

class ActiveSkillSystem {
  constructor() {
    // Active skill cooldowns: { skillId: remainingSeconds }
    this.cooldowns = {};

    // Active buffs: { skillId: { duration: remainingSeconds, startTime, ...effectData } }
    this.activeBuffs = {};

    // Event listeners for buff start/end
    this.listeners = {
      onBuffStart: [],
      onBuffEnd: [],
      onCooldownStart: [],
      onCooldownEnd: [],
    };
  }

  /**
   * Check if a skill can be activated
   * @param {Object} character - Character data
   * @param {string} treeId - Skill tree ID
   * @param {string} skillId - Skill ID
   * @returns {Object} { canActivate: boolean, reason: string }
   */
  canActivateSkill(character, treeId, skillId) {
    // Get skill data
    const tree = skillTreeSystem.getTree(treeId);
    if (!tree) {
      return { canActivate: false, reason: 'Invalid skill tree' };
    }

    const skill = this._findSkill(tree, skillId);
    if (!skill) {
      return { canActivate: false, reason: 'Skill not found' };
    }

    // Check if skill is active type
    if (skill.type !== 'active') {
      return { canActivate: false, reason: 'Not an active skill' };
    }

    // Check if skill is unlocked (has points allocated)
    const points = skillTreeSystem.getSkillPoints(character, treeId, skillId);
    if (points === 0) {
      return { canActivate: false, reason: 'Skill not unlocked' };
    }

    // Check cooldown
    const cooldownKey = `${treeId}_${skillId}`;
    if (this.cooldowns[cooldownKey] > 0) {
      const remaining = Math.ceil(this.cooldowns[cooldownKey]);
      return {
        canActivate: false,
        reason: `On cooldown (${remaining}s remaining)`
      };
    }

    // Check if already active
    if (this.activeBuffs[cooldownKey]) {
      return { canActivate: false, reason: 'Already active' };
    }

    return { canActivate: true };
  }

  /**
   * Activate a skill
   * @param {Object} character - Character data
   * @param {string} treeId - Skill tree ID
   * @param {string} skillId - Skill ID
   * @returns {Object} { success: boolean, message: string, buffData?: Object }
   */
  activateSkill(character, treeId, skillId) {
    const validation = this.canActivateSkill(character, treeId, skillId);
    if (!validation.canActivate) {
      return { success: false, message: validation.reason };
    }

    const tree = skillTreeSystem.getTree(treeId);
    const skill = this._findSkill(tree, skillId);

    const cooldownKey = `${treeId}_${skillId}`;
    const activation = skill.activation;

    // Start cooldown
    this.cooldowns[cooldownKey] = activation.cooldown;
    this._notifyListeners('onCooldownStart', { treeId, skillId, cooldown: activation.cooldown });

    // If skill has duration (buff), create active buff
    if (activation.duration > 0) {
      this.activeBuffs[cooldownKey] = {
        treeId,
        skillId,
        skillName: skill.name,
        duration: activation.duration,
        remainingDuration: activation.duration,
        startTime: Date.now(),
        effects: skill.effects || {},
        activation,
      };

      this._notifyListeners('onBuffStart', {
        treeId,
        skillId,
        skillName: skill.name,
        duration: activation.duration,
        effects: skill.effects,
      });
    }

    // If skill is instant effect, apply immediately
    if (activation.duration === 0) {
      // Instant effect skills handled by game systems
      this._notifyListeners('onBuffStart', {
        treeId,
        skillId,
        skillName: skill.name,
        instant: true,
        effects: skill.effects,
      });
    }

    return {
      success: true,
      message: `${skill.name} activated!`,
      buffData: this.activeBuffs[cooldownKey],
      instant: activation.duration === 0,
    };
  }

  /**
   * Update cooldowns and buff durations (called each frame/tick)
   * @param {number} deltaSeconds - Time elapsed since last update
   */
  update(deltaSeconds) {
    // Update cooldowns
    for (const skillKey in this.cooldowns) {
      if (this.cooldowns[skillKey] > 0) {
        this.cooldowns[skillKey] -= deltaSeconds;

        if (this.cooldowns[skillKey] <= 0) {
          this.cooldowns[skillKey] = 0;
          const [treeId, skillId] = skillKey.split('_');
          this._notifyListeners('onCooldownEnd', { treeId, skillId });
        }
      }
    }

    // Update active buffs
    for (const buffKey in this.activeBuffs) {
      const buff = this.activeBuffs[buffKey];
      buff.remainingDuration -= deltaSeconds;

      if (buff.remainingDuration <= 0) {
        // Buff expired
        this._notifyListeners('onBuffEnd', {
          treeId: buff.treeId,
          skillId: buff.skillId,
          skillName: buff.skillName,
        });
        delete this.activeBuffs[buffKey];
      }
    }
  }

  /**
   * Get all active buffs
   * @returns {Array} Active buffs
   */
  getActiveBuffs() {
    return Object.values(this.activeBuffs);
  }

  /**
   * Get aggregated buff effects
   * @returns {Object} Combined effects from all active buffs
   */
  getActiveBuffEffects() {
    const effects = {
      npcEfficiency: 0,
      productionBonus: 0,
      constructionSpeed: 0,
      goldGain: 0,
      resourceProduction: 0,
      allStatsBonus: 0,
    };

    for (const buff of Object.values(this.activeBuffs)) {
      if (buff.effects) {
        // Aggregate buff effects
        for (const [key, value] of Object.entries(buff.effects)) {
          if (effects.hasOwnProperty(key)) {
            effects[key] += value;
          }
        }
      }
    }

    return effects;
  }

  /**
   * Get cooldown remaining for a skill
   * @param {string} treeId - Skill tree ID
   * @param {string} skillId - Skill ID
   * @returns {number} Seconds remaining
   */
  getCooldown(treeId, skillId) {
    const cooldownKey = `${treeId}_${skillId}`;
    return this.cooldowns[cooldownKey] || 0;
  }

  /**
   * Check if a skill is on cooldown
   * @param {string} treeId - Skill tree ID
   * @param {string} skillId - Skill ID
   * @returns {boolean}
   */
  isOnCooldown(treeId, skillId) {
    return this.getCooldown(treeId, skillId) > 0;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Notify listeners of an event
   * @private
   */
  _notifyListeners(event, data) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(data);
      }
    }
  }

  /**
   * Find a skill in a tree by ID
   * @private
   */
  _findSkill(tree, skillId) {
    for (const tier of tree.tiers) {
      for (const skill of tier.skills) {
        if (skill.id === skillId) {
          return skill;
        }
      }
    }
    return null;
  }

  /**
   * Clear all cooldowns and buffs (for testing/reset)
   */
  reset() {
    this.cooldowns = {};
    this.activeBuffs = {};
  }

  /**
   * Serialize state for save/load
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      cooldowns: { ...this.cooldowns },
      activeBuffs: Object.entries(this.activeBuffs).map(([key, buff]) => ({
        key,
        ...buff,
      })),
    };
  }

  /**
   * Deserialize state from save
   * @param {Object} data - Serialized data
   */
  deserialize(data) {
    if (data.cooldowns) {
      this.cooldowns = { ...data.cooldowns };
    }

    if (data.activeBuffs) {
      this.activeBuffs = {};
      for (const buff of data.activeBuffs) {
        const { key, ...buffData } = buff;
        this.activeBuffs[key] = buffData;
      }
    }
  }
}

// Export singleton instance
const activeSkillSystem = new ActiveSkillSystem();
export default activeSkillSystem;
