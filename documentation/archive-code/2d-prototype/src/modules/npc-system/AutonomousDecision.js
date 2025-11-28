/**
 * AutonomousDecision.js - AI decision-making for NPCs
 *
 * Handles:
 * - Priority-based action selection
 * - Critical need interrupts
 * - Work/rest balance
 * - Intelligent task assignment
 */

import { NeedType } from './NPCNeed.js';
import { IdleTaskType } from './IdleTask.js';

/**
 * Decision types
 */
export const DecisionType = {
  EMERGENCY: 'EMERGENCY',       // Critical need (food < 10, rest < 10, health < 20)
  SATISFY_NEED: 'SATISFY_NEED', // Normal need satisfaction (need < 30)
  WORK: 'WORK',                 // Accept work assignment
  IDLE_TASK: 'IDLE_TASK',       // Perform idle task
  CONTINUE: 'CONTINUE'          // Continue current activity
};

/**
 * Decision priority levels
 */
export const DecisionPriority = {
  EMERGENCY: 100,     // Must interrupt current task
  CRITICAL: 75,       // Should interrupt if safe
  HIGH: 50,           // Important but can wait
  MEDIUM: 25,         // Normal priority
  LOW: 10             // Nice to have
};

/**
 * AutonomousDecision utility class
 */
class AutonomousDecision {
  /**
   * Initialize autonomous decision system
   * @param {NPCNeedsTracker} needsTracker - Needs tracking system
   * @param {IdleTaskManager} idleTaskManager - Idle task management
   */
  constructor(needsTracker, idleTaskManager) {
    if (!needsTracker || !idleTaskManager) {
      throw new Error('AutonomousDecision requires NPCNeedsTracker and IdleTaskManager');
    }

    this.needsTracker = needsTracker;
    this.idleTaskManager = idleTaskManager;

    // Decision configuration
    this.config = {
      emergencyThreshold: 10,    // Need value triggering emergency
      criticalThreshold: 20,     // Need value triggering critical action
      lowThreshold: 30,          // Need value triggering normal action
      satisfiedThreshold: 60,    // Need value considered satisfied
      workRefusalThreshold: 15   // Won't accept work if REST below this
    };

    // Statistics
    this.stats = {
      totalDecisions: 0,
      decisionsByType: {},
      emergencyInterrupts: 0,
      workRefusals: 0
    };
  }

  /**
   * Decide what action an NPC should take
   * @param {Object} npc - NPC object
   * @param {Object} context - Decision context (isAssignable, hasWorkOffer, etc.)
   * @returns {Object} Decision {type, action, priority, reason}
   */
  decideAction(npc, context = {}) {
    if (!npc || !npc.id) {
      return null;
    }

    this.stats.totalDecisions++;

    // Get NPC needs
    const needsSummary = this.needsTracker.getNeedsSummary(npc.id);
    if (!needsSummary) {
      // NPC not registered in needs system, default to WORK or IDLE
      return context.hasWorkOffer ?
        this._createDecision(DecisionType.WORK, 'ACCEPT_WORK', DecisionPriority.MEDIUM, 'No needs data') :
        this._createDecision(DecisionType.IDLE_TASK, IdleTaskType.WANDER, DecisionPriority.LOW, 'Default action');
    }

    // Priority 1: Check for EMERGENCY needs (interrupt current task)
    const emergencyDecision = this._checkEmergencyNeeds(npc, needsSummary);
    if (emergencyDecision) {
      this.stats.emergencyInterrupts++;
      return emergencyDecision;
    }

    // Priority 2: Check if NPC should refuse work due to exhaustion
    if (context.hasWorkOffer) {
      const workDecision = this._evaluateWorkOffer(npc, needsSummary);
      if (workDecision.type === DecisionType.SATISFY_NEED) {
        this.stats.workRefusals++;
      }
      return workDecision;
    }

    // Priority 3: If NPC is idle, check if any needs require attention
    const needDecision = this._checkNeedsForAction(npc, needsSummary);
    if (needDecision) {
      return needDecision;
    }

    // Priority 4: If working, continue working (unless interrupted above)
    if (npc.isWorking || npc.assignedBuilding) {
      return this._createDecision(
        DecisionType.CONTINUE,
        'KEEP_WORKING',
        DecisionPriority.MEDIUM,
        'All needs satisfied, continue working'
      );
    }

    // Priority 5: If has active idle task, continue it
    if (this.idleTaskManager.hasActiveTask(npc.id)) {
      return this._createDecision(
        DecisionType.CONTINUE,
        'CONTINUE_TASK',
        DecisionPriority.LOW,
        'Continue current idle task'
      );
    }

    // Priority 6: Assign new idle task
    const idleTaskType = this._selectIdleTask(npc, needsSummary);
    return this._createDecision(
      DecisionType.IDLE_TASK,
      idleTaskType,
      DecisionPriority.LOW,
      'All needs satisfied, perform idle activity'
    );
  }

  /**
   * Check for emergency needs (critical level)
   * @param {Object} npc - NPC object
   * @param {Object} needsSummary - Needs summary
   * @returns {Object|null} Decision or null
   */
  _checkEmergencyNeeds(npc, needsSummary) {
    // Check health (if implemented)
    if (npc.health && npc.health < 20) {
      return this._createDecision(
        DecisionType.EMERGENCY,
        'SEEK_HEALING',
        DecisionPriority.EMERGENCY,
        `Critical health: ${npc.health}`
      );
    }

    // Check for critical needs
    for (const [needType, needData] of Object.entries(needsSummary.needs)) {
      if (needData.value < this.config.emergencyThreshold) {
        return this._createDecision(
          DecisionType.EMERGENCY,
          this._getNeedAction(needType),
          DecisionPriority.EMERGENCY,
          `Emergency: ${needType} at ${needData.value.toFixed(1)}`
        );
      }
    }

    return null;
  }

  /**
   * Evaluate if NPC should accept work offer
   * @param {Object} npc - NPC object
   * @param {Object} needsSummary - Needs summary
   * @returns {Object} Decision
   */
  _evaluateWorkOffer(npc, needsSummary) {
    const restNeed = needsSummary.needs[NeedType.REST];

    // Refuse work if too exhausted
    if (restNeed && restNeed.value < this.config.workRefusalThreshold) {
      return this._createDecision(
        DecisionType.SATISFY_NEED,
        IdleTaskType.REST,
        DecisionPriority.HIGH,
        `Too exhausted to work (REST: ${restNeed.value.toFixed(1)})`
      );
    }

    // Check if any other critical needs
    for (const [needType, needData] of Object.entries(needsSummary.needs)) {
      if (needData.value < this.config.criticalThreshold) {
        return this._createDecision(
          DecisionType.SATISFY_NEED,
          this._getNeedAction(needType),
          DecisionPriority.CRITICAL,
          `Must satisfy ${needType} first (${needData.value.toFixed(1)})`
        );
      }
    }

    // Accept work
    return this._createDecision(
      DecisionType.WORK,
      'ACCEPT_WORK',
      DecisionPriority.MEDIUM,
      'Needs satisfied, can work'
    );
  }

  /**
   * Check if any needs require action when idle
   * @param {Object} npc - NPC object
   * @param {Object} needsSummary - Needs summary
   * @returns {Object|null} Decision or null
   */
  _checkNeedsForAction(npc, needsSummary) {
    // Find lowest need
    const lowestNeed = needsSummary.lowestNeed;
    if (!lowestNeed) {
      return null;
    }

    // If lowest need is below threshold, satisfy it
    if (lowestNeed.value < this.config.lowThreshold) {
      return this._createDecision(
        DecisionType.SATISFY_NEED,
        this._getNeedAction(lowestNeed.type),
        DecisionPriority.HIGH,
        `${lowestNeed.type} low (${lowestNeed.value.toFixed(1)})`
      );
    }

    return null;
  }

  /**
   * Select appropriate idle task based on needs
   * @param {Object} npc - NPC object
   * @param {Object} needsSummary - Needs summary
   * @returns {string} Idle task type
   */
  _selectIdleTask(npc, needsSummary) {
    // Prefer REST if rest need is moderate
    const restNeed = needsSummary.needs[NeedType.REST];
    if (restNeed && restNeed.value < 50) {
      return IdleTaskType.REST;
    }

    // Prefer SOCIALIZE if social need is moderate
    const socialNeed = needsSummary.needs[NeedType.SOCIAL];
    if (socialNeed && socialNeed.value < 50) {
      return IdleTaskType.SOCIALIZE;
    }

    // Random between WANDER and INSPECT
    return Math.random() < 0.6 ? IdleTaskType.WANDER : IdleTaskType.INSPECT;
  }

  /**
   * Get action to satisfy a specific need
   * @param {string} needType - Need type
   * @returns {string} Action to take
   */
  _getNeedAction(needType) {
    switch (needType) {
      case NeedType.FOOD:
        return 'SEEK_FOOD';

      case NeedType.REST:
        return IdleTaskType.REST;

      case NeedType.SOCIAL:
        return IdleTaskType.SOCIALIZE;

      case NeedType.SHELTER:
        return 'SEEK_SHELTER';

      default:
        return IdleTaskType.WANDER;
    }
  }

  /**
   * Create a decision object
   * @param {string} type - Decision type
   * @param {string} action - Specific action
   * @param {number} priority - Priority value
   * @param {string} reason - Decision reason
   * @returns {Object} Decision object
   */
  _createDecision(type, action, priority, reason) {
    const decision = {
      type,
      action,
      priority,
      reason,
      timestamp: Date.now()
    };

    // Track statistics
    if (!this.stats.decisionsByType[type]) {
      this.stats.decisionsByType[type] = 0;
    }
    this.stats.decisionsByType[type]++;

    return decision;
  }

  /**
   * Check if decision should interrupt current activity
   * @param {Object} decision - Decision object
   * @param {Object} npc - NPC object
   * @returns {boolean} True if should interrupt
   */
  shouldInterrupt(decision, npc) {
    if (!decision) {
      return false;
    }

    // EMERGENCY always interrupts
    if (decision.type === DecisionType.EMERGENCY) {
      return true;
    }

    // If NPC is idle, no interruption needed
    if (!npc.isWorking && !npc.assignedBuilding) {
      return false;
    }

    // CRITICAL decisions interrupt work
    if (decision.priority >= DecisionPriority.CRITICAL) {
      return true;
    }

    return false;
  }

  /**
   * Get decision statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      totalDecisions: this.stats.totalDecisions,
      decisionsByType: { ...this.stats.decisionsByType },
      emergencyInterrupts: this.stats.emergencyInterrupts,
      workRefusals: this.stats.workRefusals,
      emergencyRate: this.stats.totalDecisions > 0 ?
        (this.stats.emergencyInterrupts / this.stats.totalDecisions * 100).toFixed(1) : 0,
      workRefusalRate: this.stats.totalDecisions > 0 ?
        (this.stats.workRefusals / this.stats.totalDecisions * 100).toFixed(1) : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalDecisions: 0,
      decisionsByType: {},
      emergencyInterrupts: 0,
      workRefusals: 0
    };
  }
}

export default AutonomousDecision;
