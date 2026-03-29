/**
 * ChallengeManager.js
 * Manages challenge mode rules, validation, and completion tracking
 */

import CHALLENGES from '../config/challenges.js';

class ChallengeManager {
  constructor() {
    this.activeChallenge = null;
    this.completedChallenges = {}; // { challengeId: { completedAt, time, attempts } }
    this.startTime = 0;
    this.violations = [];
  }

  /**
   * Start a challenge
   * @param {string} challengeId - Challenge ID from CHALLENGES config
   * @returns {{ success: boolean, challenge: Object|null, error: string|null }}
   */
  startChallenge(challengeId) {
    const challenge = CHALLENGES[challengeId];
    if (!challenge) {
      return { success: false, challenge: null, error: `Unknown challenge: ${challengeId}` };
    }

    this.activeChallenge = { ...challenge };
    this.startTime = Date.now();
    this.violations = [];

    return { success: true, challenge: this.activeChallenge, error: null };
  }

  /**
   * Validate a player action against active challenge rules
   * @param {string} actionType - 'BUILD', 'EXPEDITION', 'RECRUIT_NPC', 'MANUAL_SAVE', 'HEAL'
   * @param {Object} actionData - Action-specific data
   * @returns {{ allowed: boolean, reason: string|null }}
   */
  checkAction(actionType, actionData = {}) {
    if (!this.activeChallenge) {
      return { allowed: true, reason: null };
    }

    const rules = this.activeChallenge.rules;

    // Building restrictions
    if (actionType === 'BUILD' && rules.disableBuildings) {
      if (rules.disableBuildings.includes(actionData.buildingType)) {
        const msg = `Cannot build ${actionData.buildingType} in ${this.activeChallenge.title} challenge`;
        this.violations.push({ type: 'BUILD', detail: msg, timestamp: Date.now() });
        return { allowed: false, reason: msg };
      }
    }

    // Expedition restrictions
    if (actionType === 'EXPEDITION' && rules.disableExpeditions) {
      return { allowed: false, reason: 'Expeditions are disabled in this challenge' };
    }

    // NPC cap
    if (actionType === 'RECRUIT_NPC' && rules.maxNPCs != null) {
      if ((actionData.currentNPCCount || 0) >= rules.maxNPCs) {
        return { allowed: false, reason: `Max ${rules.maxNPCs} NPCs in this challenge` };
      }
    }

    // Manual save restriction
    if (actionType === 'MANUAL_SAVE' && rules.noManualSave) {
      return { allowed: false, reason: 'Manual saving is disabled in this challenge' };
    }

    // Healing restriction
    if (actionType === 'HEAL' && rules.noHealing) {
      return { allowed: false, reason: 'Healing is disabled in this challenge' };
    }

    return { allowed: true, reason: null };
  }

  /**
   * Check if the challenge goal is met
   * @param {Object} gameState - Current game state
   * @returns {boolean}
   */
  isChallengeComplete(gameState = {}) {
    if (!this.activeChallenge) return false;

    const goal = this.activeChallenge.goal;

    if (goal.type === 'BUILD') {
      const buildings = gameState.buildings || [];
      const count = buildings.filter((b) => b.type === goal.targetType && b.status === 'COMPLETE').length;
      return count >= goal.targetCount;
    }

    if (goal.type === 'POPULATION') {
      return (gameState.population || 0) >= goal.targetCount;
    }

    return false;
  }

  /**
   * Check if time limit is exceeded (for speed run)
   * @returns {boolean}
   */
  isTimeLimitExceeded() {
    if (!this.activeChallenge?.rules?.timeLimit) return false;
    const elapsed = (Date.now() - this.startTime) / 1000;
    return elapsed > this.activeChallenge.rules.timeLimit;
  }

  /**
   * Complete the active challenge
   * @returns {Object} Completion result
   */
  completeChallenge() {
    if (!this.activeChallenge) return null;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const result = {
      challengeId: this.activeChallenge.id,
      title: this.activeChallenge.title,
      completionTime: elapsed,
      violations: this.violations.length,
      rewards: this.activeChallenge.rewards,
    };

    // Track completion
    const prevAttempts = this.completedChallenges[this.activeChallenge.id]?.attempts || 0;
    this.completedChallenges[this.activeChallenge.id] = {
      completedAt: Date.now(),
      time: elapsed,
      attempts: prevAttempts + 1,
    };

    this.activeChallenge = null;
    return result;
  }

  /**
   * Fail/abandon the active challenge
   */
  abandonChallenge() {
    this.activeChallenge = null;
    this.violations = [];
  }

  /**
   * Get remaining time for timed challenges
   * @returns {number|null} Seconds remaining
   */
  getRemainingTime() {
    if (!this.activeChallenge?.rules?.timeLimit) return null;
    const elapsed = (Date.now() - this.startTime) / 1000;
    return Math.max(0, this.activeChallenge.rules.timeLimit - elapsed);
  }

  /**
   * Check if a challenge has been completed before
   * @param {string} challengeId
   * @returns {boolean}
   */
  hasCompleted(challengeId) {
    return !!this.completedChallenges[challengeId];
  }

  /**
   * Get completion data for all challenges
   * @returns {Object}
   */
  getCompletionData() {
    return { ...this.completedChallenges };
  }

  /**
   * Get active challenge info
   */
  getActiveChallenge() {
    if (!this.activeChallenge) return null;
    return {
      ...this.activeChallenge,
      elapsed: (Date.now() - this.startTime) / 1000,
      remainingTime: this.getRemainingTime(),
    };
  }

  /**
   * Load saved completion data
   * @param {Object} data - Previously saved completion data
   */
  loadCompletionData(data) {
    if (data && typeof data === 'object') {
      this.completedChallenges = { ...data };
    }
  }

  /**
   * Reset
   */
  reset() {
    this.activeChallenge = null;
    this.startTime = 0;
    this.violations = [];
  }
}

export default ChallengeManager;
