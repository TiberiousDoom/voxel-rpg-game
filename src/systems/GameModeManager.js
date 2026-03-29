/**
 * GameModeManager.js
 * Central manager for all game modes (Normal, NG+, Endless, Sandbox, Challenge)
 */

import CHALLENGES from '../config/challenges.js';

export const GAME_MODES = {
  NORMAL: 'NORMAL',
  NEW_GAME_PLUS: 'NEW_GAME_PLUS',
  ENDLESS: 'ENDLESS',
  SANDBOX: 'SANDBOX',
  CHALLENGE: 'CHALLENGE',
};

const MODE_DEFAULTS = {
  [GAME_MODES.NORMAL]: {
    resourceMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    costMultiplier: 1,
    xpMultiplier: 1,
    unlimitedResources: false,
    disableEnemies: false,
    allUnlocked: false,
  },
  [GAME_MODES.NEW_GAME_PLUS]: {
    resourceMultiplier: 1,
    enemyHealthMultiplier: 1.5,
    enemyDamageMultiplier: 1.3,
    costMultiplier: 1.25,
    xpMultiplier: 1.5,
    unlimitedResources: false,
    disableEnemies: false,
    allUnlocked: false,
  },
  [GAME_MODES.ENDLESS]: {
    resourceMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    costMultiplier: 1,
    xpMultiplier: 1.2,
    unlimitedResources: false,
    disableEnemies: false,
    allUnlocked: false,
  },
  [GAME_MODES.SANDBOX]: {
    resourceMultiplier: 999,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    costMultiplier: 0,
    xpMultiplier: 1,
    unlimitedResources: true,
    disableEnemies: true,
    allUnlocked: true,
  },
  [GAME_MODES.CHALLENGE]: {
    resourceMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    costMultiplier: 1,
    xpMultiplier: 1,
    unlimitedResources: false,
    disableEnemies: false,
    allUnlocked: false,
  },
};

class GameModeManager {
  constructor() {
    this.currentMode = GAME_MODES.NORMAL;
    this.modifiers = { ...MODE_DEFAULTS[GAME_MODES.NORMAL] };
    this.challengeId = null;
    this.challengeRules = null;
    this.ngPlusCycle = 0;
    this.modeOptions = {};
    this.startTime = Date.now();
  }

  /**
   * Set the game mode with optional configuration
   * @param {string} mode - One of GAME_MODES
   * @param {Object} options - Mode-specific options
   */
  setMode(mode, options = {}) {
    if (!GAME_MODES[mode]) return false;

    this.currentMode = mode;
    this.modeOptions = options;
    this.modifiers = { ...MODE_DEFAULTS[mode] };
    this.startTime = Date.now();

    if (mode === GAME_MODES.NEW_GAME_PLUS) {
      this.ngPlusCycle = options.cycle || 1;
      this._applyNGPlusScaling();
    }

    if (mode === GAME_MODES.CHALLENGE && options.challengeId) {
      this.challengeId = options.challengeId;
      this.challengeRules = CHALLENGES[options.challengeId]?.rules || null;
    }

    if (mode === GAME_MODES.SANDBOX) {
      if (options.enableEnemies) {
        this.modifiers.disableEnemies = false;
      }
    }

    return true;
  }

  /**
   * Apply NG+ difficulty scaling per cycle
   * @private
   */
  _applyNGPlusScaling() {
    const cycle = this.ngPlusCycle;
    this.modifiers.enemyHealthMultiplier = Math.min(5, 1 + cycle * 0.5);
    this.modifiers.enemyDamageMultiplier = Math.min(4, 1 + cycle * 0.3);
    this.modifiers.costMultiplier = Math.min(2, 1 + cycle * 0.25);
    this.modifiers.xpMultiplier = 1 + cycle * 0.25;
  }

  /**
   * Get current modifiers for other systems to query
   * @returns {Object}
   */
  getModifiers() {
    return { ...this.modifiers };
  }

  /**
   * Check if an action is allowed under current challenge rules
   * @param {string} actionType - e.g., 'BUILD', 'EXPEDITION', 'SAVE'
   * @param {Object} actionData - Action-specific data
   * @returns {{ allowed: boolean, reason: string|null }}
   */
  checkAction(actionType, actionData = {}) {
    if (this.currentMode !== GAME_MODES.CHALLENGE || !this.challengeRules) {
      return { allowed: true, reason: null };
    }

    const rules = this.challengeRules;

    if (actionType === 'BUILD' && rules.disableBuildings) {
      if (rules.disableBuildings.includes(actionData.buildingType)) {
        return { allowed: false, reason: `${actionData.buildingType} is disabled in this challenge` };
      }
    }

    if (actionType === 'EXPEDITION' && rules.disableExpeditions) {
      return { allowed: false, reason: 'Expeditions are disabled in this challenge' };
    }

    if (actionType === 'RECRUIT_NPC' && rules.maxNPCs != null) {
      if ((actionData.currentNPCs || 0) >= rules.maxNPCs) {
        return { allowed: false, reason: `Maximum ${rules.maxNPCs} NPCs allowed in this challenge` };
      }
    }

    if (actionType === 'MANUAL_SAVE' && rules.noManualSave) {
      return { allowed: false, reason: 'Manual saving is disabled in this challenge' };
    }

    return { allowed: true, reason: null };
  }

  /**
   * Check if time limit has been exceeded (for speed run challenges)
   * @returns {boolean}
   */
  isTimeLimitExceeded() {
    if (!this.challengeRules?.timeLimit) return false;
    const elapsed = (Date.now() - this.startTime) / 1000;
    return elapsed > this.challengeRules.timeLimit;
  }

  /**
   * Get remaining time for timed challenges
   * @returns {number|null} Seconds remaining, or null if no time limit
   */
  getRemainingTime() {
    if (!this.challengeRules?.timeLimit) return null;
    const elapsed = (Date.now() - this.startTime) / 1000;
    return Math.max(0, this.challengeRules.timeLimit - elapsed);
  }

  /**
   * Get current mode info
   */
  getModeInfo() {
    return {
      mode: this.currentMode,
      ngPlusCycle: this.ngPlusCycle,
      challengeId: this.challengeId,
      modifiers: this.getModifiers(),
      elapsedTime: (Date.now() - this.startTime) / 1000,
    };
  }

  /**
   * Reset to normal mode
   */
  reset() {
    this.currentMode = GAME_MODES.NORMAL;
    this.modifiers = { ...MODE_DEFAULTS[GAME_MODES.NORMAL] };
    this.challengeId = null;
    this.challengeRules = null;
    this.ngPlusCycle = 0;
    this.modeOptions = {};
    this.startTime = Date.now();
  }
}

export default GameModeManager;
