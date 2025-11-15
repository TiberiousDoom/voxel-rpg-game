/**
 * ExpeditionManager.js - Manages expedition lifecycle and state
 */
import EventEmitter from 'events';

class ExpeditionManager extends EventEmitter {
  constructor(partyManager, npcManager) {
    super();
    this.partyManager = partyManager;
    this.npcManager = npcManager;
    this.activeExpedition = null;
    this.expeditionHistory = [];
  }

  /**
   * Start a new expedition
   * @param {Object} config - Expedition configuration
   * @returns {Object} Result { success, error, expedition }
   */
  startExpedition(config) {
    // Validate party
    const validation = this.partyManager.validateParty();
    if (!validation.valid) {
      return {
        success: false,
        error: `Party validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Check no active expedition
    if (this.activeExpedition) {
      return {
        success: false,
        error: 'Expedition already in progress'
      };
    }

    // Create expedition
    this.activeExpedition = {
      id: `expedition_${Date.now()}`,
      party: this.partyManager.getParty(),
      config: {
        difficulty: config.difficulty || 1,
        dungeonType: config.dungeonType || 'cave',
        expectedDuration: config.expectedDuration || 300000, // 5 minutes
        ...config
      },
      state: {
        currentFloor: 1,
        maxFloor: config.maxFloor || 5,
        enemiesKilled: 0,
        goldEarned: 0,
        itemsFound: [],
        startTime: Date.now(),
        endTime: null
      },
      status: 'active'
    };

    // Mark NPCs as on expedition
    for (const member of this.activeExpedition.party.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (npc) {
        npc.onExpedition = true;
      }
    }

    this.emit('expedition:started', {
      expeditionId: this.activeExpedition.id,
      party: this.activeExpedition.party
    });

    return {
      success: true,
      expedition: this.activeExpedition
    };
  }

  /**
   * Update expedition state
   * @param {Object} updates - State updates
   */
  updateExpedition(updates) {
    if (!this.activeExpedition) return;

    Object.assign(this.activeExpedition.state, updates);

    this.emit('expedition:updated', {
      expeditionId: this.activeExpedition.id,
      updates
    });
  }

  /**
   * Complete expedition (win)
   * @param {Object} results - Final results
   * @returns {Object} Results
   */
  completeExpedition(results = {}) {
    if (!this.activeExpedition) {
      return { success: false, error: 'No active expedition' };
    }

    this.activeExpedition.state.endTime = Date.now();
    this.activeExpedition.status = 'completed';

    // Award XP to party members
    const xpPerMember = results.totalXP || 100;
    for (const member of this.activeExpedition.party.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (npc) {
        this.npcManager.awardCombatXP(member.npcId, xpPerMember);
        npc.expeditionCount++;
        npc.kills += results.enemiesKilled || 0;
        npc.onExpedition = false;

        // Check veteran status
        this.npcManager.checkVeteranStatus(member.npcId);
      }
    }

    // Save to history
    this.expeditionHistory.push({ ...this.activeExpedition });

    this.emit('expedition:completed', {
      expeditionId: this.activeExpedition.id,
      results
    });

    const completedExpedition = this.activeExpedition;
    this.activeExpedition = null;

    return {
      success: true,
      expedition: completedExpedition,
      results
    };
  }

  /**
   * Fail expedition (party wiped)
   * @param {Object} results - Failure details
   * @returns {Object} Results
   */
  failExpedition(results = {}) {
    if (!this.activeExpedition) {
      return { success: false, error: 'No active expedition' };
    }

    this.activeExpedition.state.endTime = Date.now();
    this.activeExpedition.status = 'failed';

    // Mark NPCs as no longer on expedition
    for (const member of this.activeExpedition.party.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (npc) {
        npc.onExpedition = false;

        // Apply injury/death based on config
        if (results.permaDeath && Math.random() < 0.2) {
          npc.alive = false;
        } else {
          // Injury: reduce health, temporary stat debuff
          npc.combatStats.health.current = Math.max(
            1,
            npc.combatStats.health.current * 0.5
          );
        }
      }
    }

    // Save to history
    this.expeditionHistory.push({ ...this.activeExpedition });

    this.emit('expedition:failed', {
      expeditionId: this.activeExpedition.id,
      results
    });

    const failedExpedition = this.activeExpedition;
    this.activeExpedition = null;

    return {
      success: true,
      expedition: failedExpedition,
      results
    };
  }

  /**
   * Abandon expedition (retreat)
   * @returns {Object} Results
   */
  abandonExpedition() {
    if (!this.activeExpedition) {
      return { success: false, error: 'No active expedition' };
    }

    this.activeExpedition.state.endTime = Date.now();
    this.activeExpedition.status = 'abandoned';

    // Mark NPCs as no longer on expedition (no injuries)
    for (const member of this.activeExpedition.party.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (npc) {
        npc.onExpedition = false;
      }
    }

    // Save to history
    this.expeditionHistory.push({ ...this.activeExpedition });

    this.emit('expedition:abandoned', {
      expeditionId: this.activeExpedition.id
    });

    const abandonedExpedition = this.activeExpedition;
    this.activeExpedition = null;

    return {
      success: true,
      expedition: abandonedExpedition
    };
  }

  /**
   * Get active expedition
   * @returns {Object|null} Active expedition
   */
  getActiveExpedition() {
    return this.activeExpedition;
  }

  /**
   * Get expedition history
   * @returns {Array} Past expeditions
   */
  getHistory() {
    return [...this.expeditionHistory];
  }

  /**
   * Get expedition statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const stats = {
      totalExpeditions: this.expeditionHistory.length,
      completed: 0,
      failed: 0,
      abandoned: 0,
      totalEnemiesKilled: 0,
      totalGoldEarned: 0,
      totalItemsFound: 0
    };

    for (const expedition of this.expeditionHistory) {
      if (expedition.status === 'completed') stats.completed++;
      if (expedition.status === 'failed') stats.failed++;
      if (expedition.status === 'abandoned') stats.abandoned++;

      stats.totalEnemiesKilled += expedition.state.enemiesKilled || 0;
      stats.totalGoldEarned += expedition.state.goldEarned || 0;
      stats.totalItemsFound += expedition.state.itemsFound?.length || 0;
    }

    return stats;
  }

  /**
   * Check if party can start expedition
   * @returns {Object} { canStart, reason }
   */
  canStartExpedition() {
    if (this.activeExpedition) {
      return {
        canStart: false,
        reason: 'Expedition already in progress'
      };
    }

    const validation = this.partyManager.validateParty();
    if (!validation.valid) {
      return {
        canStart: false,
        reason: validation.errors.join(', ')
      };
    }

    return { canStart: true };
  }
}

export default ExpeditionManager;
