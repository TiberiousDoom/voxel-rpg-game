/**
 * IdleTask.js - Individual idle task definition
 *
 * Represents a single task that an NPC can perform when idle (not working).
 * Tasks have types, durations, priorities, and rewards.
 */

/**
 * Idle task types
 */
export const IdleTaskType = {
  WANDER: 'WANDER',         // Random movement within territory
  SOCIALIZE: 'SOCIALIZE',   // Interact with nearby NPC
  REST: 'REST',             // Stand still and recover fatigue
  INSPECT: 'INSPECT'        // Move to building and examine it
};

/**
 * Task priority levels (higher = more urgent)
 */
export const TaskPriority = {
  LOW: 1,      // WANDER, INSPECT
  MEDIUM: 2,   // SOCIALIZE
  HIGH: 3      // REST (when fatigued)
};

/**
 * IdleTask class
 */
export class IdleTask {
  /**
   * Create an idle task
   * @param {string} type - Task type (from IdleTaskType)
   * @param {Object} data - Task-specific data
   */
  constructor(type, data = {}) {
    this.id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.data = data;

    // Task timing
    this.startTime = null;
    this.duration = this._calculateDuration(type);
    this.completedAt = null;

    // Task status
    this.isActive = false;
    this.isComplete = false;
    this.isCancelled = false;

    // Task priority
    this.priority = this._calculatePriority(type, data);

    // Task rewards
    this.rewards = this._calculateRewards(type);
  }

  /**
   * Calculate task duration based on type
   * @param {string} type - Task type
   * @returns {number} Duration in milliseconds
   */
  _calculateDuration(type) {
    switch (type) {
      case IdleTaskType.WANDER:
        return 5000 + Math.random() * 10000; // 5-15 seconds

      case IdleTaskType.SOCIALIZE:
        return 10000 + Math.random() * 10000; // 10-20 seconds

      case IdleTaskType.REST:
        return 15000 + Math.random() * 15000; // 15-30 seconds

      case IdleTaskType.INSPECT:
        return 5000 + Math.random() * 5000; // 5-10 seconds

      default:
        return 10000; // 10 seconds default
    }
  }

  /**
   * Calculate task priority
   * @param {string} type - Task type
   * @param {Object} data - Task data
   * @returns {number} Priority value
   */
  _calculatePriority(type, data) {
    switch (type) {
      case IdleTaskType.REST:
        // REST priority increases with fatigue
        const fatigue = data.npcFatigue || 0;
        if (fatigue > 70) return TaskPriority.HIGH;
        if (fatigue > 40) return TaskPriority.MEDIUM;
        return TaskPriority.LOW;

      case IdleTaskType.SOCIALIZE:
        // SOCIALIZE is medium priority
        const social = data.npcSocialNeed || 50;
        if (social < 30) return TaskPriority.HIGH;
        return TaskPriority.MEDIUM;

      case IdleTaskType.WANDER:
      case IdleTaskType.INSPECT:
      default:
        return TaskPriority.LOW;
    }
  }

  /**
   * Calculate task rewards
   * @param {string} type - Task type
   * @returns {Object} Rewards object
   */
  _calculateRewards(type) {
    switch (type) {
      case IdleTaskType.SOCIALIZE:
        return {
          happiness: 1,
          socialNeed: 10
        };

      case IdleTaskType.REST:
        return {
          fatigue: -20,  // Reduce fatigue
          restNeed: 15
        };

      case IdleTaskType.WANDER:
        return {
          happiness: 0.5,
          restNeed: 2
        };

      case IdleTaskType.INSPECT:
        return {
          happiness: 0.5
        };

      default:
        return {};
    }
  }

  /**
   * Start the task
   */
  start() {
    if (this.isActive || this.isComplete || this.isCancelled) {
      return false;
    }

    this.isActive = true;
    this.startTime = Date.now();
    return true;
  }

  /**
   * Update task progress
   * @param {number} currentTime - Current timestamp
   * @returns {boolean} True if task completed
   */
  update(currentTime) {
    if (!this.isActive || this.isComplete || this.isCancelled) {
      return this.isComplete;
    }

    const elapsed = currentTime - this.startTime;

    if (elapsed >= this.duration) {
      this.complete(currentTime);
      return true;
    }

    return false;
  }

  /**
   * Complete the task
   * @param {number} currentTime - Current timestamp
   */
  complete(currentTime) {
    if (this.isComplete || this.isCancelled) {
      return;
    }

    this.isActive = false;
    this.isComplete = true;
    this.completedAt = currentTime || Date.now();
  }

  /**
   * Cancel the task
   */
  cancel() {
    if (this.isComplete || this.isCancelled) {
      return false;
    }

    this.isActive = false;
    this.isCancelled = true;
    return true;
  }

  /**
   * Get remaining time
   * @param {number} currentTime - Current timestamp
   * @returns {number} Remaining time in milliseconds
   */
  getRemainingTime(currentTime) {
    if (!this.isActive || this.isComplete || this.isCancelled) {
      return 0;
    }

    const elapsed = currentTime - this.startTime;
    return Math.max(0, this.duration - elapsed);
  }

  /**
   * Get progress percentage
   * @param {number} currentTime - Current timestamp
   * @returns {number} Progress 0-100
   */
  getProgress(currentTime) {
    if (!this.isActive || !this.startTime) {
      return 0;
    }

    if (this.isComplete) {
      return 100;
    }

    const elapsed = currentTime - this.startTime;
    return Math.min(100, (elapsed / this.duration) * 100);
  }

  /**
   * Get task summary
   * @returns {Object} Task summary
   */
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      priority: this.priority,
      duration: this.duration,
      isActive: this.isActive,
      isComplete: this.isComplete,
      isCancelled: this.isCancelled,
      progress: this.getProgress(Date.now()),
      rewards: this.rewards
    };
  }
}

export default IdleTask;
