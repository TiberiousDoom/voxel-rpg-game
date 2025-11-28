/**
 * AchievementSystem.js - Core achievement orchestrator
 *
 * Manages:
 * - Achievement registry (all defined achievements)
 * - Progress tracking and updates
 * - Unlock detection and notifications
 * - Reward application
 * - Save/load state persistence
 */

import Achievement from './Achievement.js';
import AchievementTracker from './AchievementTracker.js';
import EventEmitter from 'events';

class AchievementSystem extends EventEmitter {
  /**
   * Initialize achievement system
   * @param {Object} achievementDefinitions - Array of achievement configs
   */
  constructor(achievementDefinitions = []) {
    super();

    // Achievement registry: Map<id, Achievement>
    this.achievements = new Map();

    // Progress tracker
    this.tracker = new AchievementTracker();

    // Notification queue
    this.notificationQueue = [];

    // Statistics
    this.stats = {
      totalAchievements: 0,
      unlockedAchievements: 0,
      totalRewardsApplied: 0
    };

    // Initialize achievements
    this._initializeAchievements(achievementDefinitions);

    // eslint-disable-next-line no-console
    console.log(`AchievementSystem initialized with ${this.stats.totalAchievements} achievements`);
  }

  /**
   * Initialize achievement definitions
   * @param {Array} definitions - Array of achievement configs
   */
  _initializeAchievements(definitions) {
    for (const config of definitions) {
      try {
        const achievement = new Achievement(config);
        this.achievements.set(achievement.id, achievement);
        this.stats.totalAchievements++;
      } catch (error) {
        console.error(`Failed to create achievement ${config.id}:`, error);
      }
    }
  }

  /**
   * Check all achievements for progress updates
   * @param {Object} gameState - Current game state
   * @returns {Array} - Newly unlocked achievements
   */
  checkAchievements(gameState) {
    const newlyUnlocked = [];

    // Update resource totals first
    this.tracker.updateResourceTotals(gameState);

    // Check each achievement
    for (const achievement of this.achievements.values()) {
      if (achievement.isUnlocked) {
        continue; // Skip already unlocked
      }

      // Extract current value for this achievement
      const currentValue = this.tracker.extractConditionValue(achievement, gameState);

      // Update progress and check if newly unlocked
      const justUnlocked = achievement.updateProgress(currentValue);

      if (justUnlocked) {
        newlyUnlocked.push(achievement);
        this._handleAchievementUnlock(achievement);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Handle achievement unlock
   * @param {Achievement} achievement - Newly unlocked achievement
   */
  _handleAchievementUnlock(achievement) {
    // eslint-disable-next-line no-console
    console.log(`🏆 Achievement Unlocked: ${achievement.name}`);

    // Update statistics
    this.stats.unlockedAchievements++;

    // Add to notification queue
    this.notificationQueue.push({
      achievement: achievement,
      timestamp: Date.now()
    });

    // Emit unlock event for UI
    this.emit('achievement:unlocked', {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      reward: achievement.reward
    });

    // Apply reward if applicable
    this._applyReward(achievement);
  }

  /**
   * Apply achievement reward
   * @param {Achievement} achievement - Achievement with reward
   */
  _applyReward(achievement) {
    const { reward } = achievement;

    if (!reward || !reward.type) {
      return; // No reward
    }

    this.stats.totalRewardsApplied++;

    // Emit reward event for game systems to handle
    this.emit('achievement:reward', {
      achievementId: achievement.id,
      rewardType: reward.type,
      rewardValue: reward.value
    });

    // eslint-disable-next-line no-console
    console.log(`💎 Reward applied: ${reward.type} - ${JSON.stringify(reward.value)}`);
  }

  /**
   * Get next notification from queue
   * @returns {Object|null} - Notification or null if queue empty
   */
  popNotification() {
    return this.notificationQueue.shift() || null;
  }

  /**
   * Get all unlocked achievements
   * @returns {Array} - Array of unlocked achievements
   */
  getUnlockedAchievements() {
    return Array.from(this.achievements.values())
      .filter(a => a.isUnlocked)
      .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));
  }

  /**
   * Get achievements in progress (unlocked < 100%)
   * @returns {Array} - Array of in-progress achievements
   */
  getInProgressAchievements() {
    return Array.from(this.achievements.values())
      .filter(a => !a.isUnlocked && a.progress > 0)
      .sort((a, b) => b.progress - a.progress);
  }

  /**
   * Get achievements by category
   * @param {string} category - Achievement category
   * @returns {Array} - Achievements in category
   */
  getAchievementsByCategory(category) {
    return Array.from(this.achievements.values())
      .filter(a => a.category === category)
      .sort((a, b) => {
        // Unlocked first, then by progress
        if (a.isUnlocked && !b.isUnlocked) return -1;
        if (!a.isUnlocked && b.isUnlocked) return 1;
        return b.progress - a.progress;
      });
  }

  /**
   * Get specific achievement by ID
   * @param {string} id - Achievement ID
   * @returns {Achievement|null} - Achievement or null
   */
  getAchievement(id) {
    return this.achievements.get(id) || null;
  }

  /**
   * Get achievement statistics
   * @returns {Object} - Statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      completionPercentage: this.stats.totalAchievements > 0
        ? (this.stats.unlockedAchievements / this.stats.totalAchievements) * 100
        : 0
    };
  }

  /**
   * Record that an event was survived (for achievement tracking)
   * @param {string} eventType - Type of event
   */
  recordEventSurvived(eventType) {
    this.tracker.recordEventSurvived(eventType);
  }

  /**
   * Record NPC death (for achievement tracking)
   * @param {string} causeOfDeath - How NPC died
   */
  recordNPCDeath(causeOfDeath) {
    this.tracker.recordNPCDeath(causeOfDeath);
  }

  /**
   * Record tier reached (for achievement tracking)
   * @param {string} tier - Tier name
   */
  recordTierReached(tier) {
    this.tracker.recordTierReached(tier);
  }

  /**
   * Serialize achievement system state
   * @returns {Object} - Serialized state
   */
  serialize() {
    const achievementsState = {};

    for (const [id, achievement] of this.achievements) {
      achievementsState[id] = achievement.serialize();
    }

    return {
      achievements: achievementsState,
      tracker: this.tracker.serialize(),
      stats: { ...this.stats },
      notificationQueue: this.notificationQueue.map(n => ({
        achievementId: n.achievement.id,
        timestamp: n.timestamp
      }))
    };
  }

  /**
   * Deserialize achievement system state
   * @param {Object} data - Saved state
   */
  deserialize(data) {
    // Restore achievement states
    if (data.achievements) {
      for (const [id, achievementData] of Object.entries(data.achievements)) {
        const achievement = this.achievements.get(id);
        if (achievement) {
          achievement.deserialize(achievementData);
        }
      }
    }

    // Restore tracker state
    if (data.tracker) {
      this.tracker.deserialize(data.tracker);
    }

    // Restore statistics
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }

    // Restore notification queue
    if (data.notificationQueue) {
      this.notificationQueue = data.notificationQueue.map(n => ({
        achievement: this.achievements.get(n.achievementId),
        timestamp: n.timestamp
      })).filter(n => n.achievement); // Filter out missing achievements
    }

    // eslint-disable-next-line no-console
    console.log(`Achievement system state restored: ${this.stats.unlockedAchievements}/${this.stats.totalAchievements} unlocked`);
  }

  /**
   * Reset all achievements (for testing/new game)
   */
  reset() {
    for (const achievement of this.achievements.values()) {
      achievement.isUnlocked = false;
      achievement.unlockedAt = null;
      achievement.progress = 0;
      achievement.condition.current = 0;
    }

    this.tracker = new AchievementTracker();
    this.notificationQueue = [];
    this.stats.unlockedAchievements = 0;
    this.stats.totalRewardsApplied = 0;

    // eslint-disable-next-line no-console
    console.log('Achievement system reset');
  }
}

export default AchievementSystem;
