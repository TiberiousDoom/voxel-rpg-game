/**
 * ImmigrationManager.js - NPC arrival system for settlement
 *
 * NPCs arrive based on settlement attractiveness score.
 * Each immigration check runs every IMMIGRATION_CHECK_INTERVAL seconds.
 * Successful checks spawn an NPC at the world edge who walks toward the settlement.
 *
 * Population rules:
 *   - First NPC joins without housing (pioneer mechanic)
 *   - Subsequent NPCs require available housing
 *   - Hard cap: NPC_MAX_POPULATION_PHASE_2
 *   - Immigration skipped during active rift attacks
 *   - Max 1 arrival per check (prevent swarm)
 */

import {
  IMMIGRATION_CHECK_INTERVAL,
  IMMIGRATION_MIN_ATTRACTIVENESS,
  IMMIGRATION_MAX_CHANCE,
  IMMIGRATION_SPAWN_MIN_DISTANCE,
  IMMIGRATION_SPAWN_MAX_DISTANCE,
  IMMIGRATION_APPROACH_SPEED_MULT,
  IMMIGRATION_EVALUATION_TIME,
  IMMIGRATION_HOUSING_WAIT_DAYS,
  NPC_FIRST_SETTLER_FREE,
  NPC_MAX_POPULATION_PHASE_2,
} from '../../data/tuning.js';

/**
 * Immigration state for NPCs that are approaching or evaluating
 * @typedef {Object} ApproachingNPC
 * @property {string} id - Temporary ID until NPC joins
 * @property {'APPROACHING'|'EVALUATING'|'WAITING_FOR_HOUSING'|'JOINING'|'LEAVING'} status
 * @property {Object} spawnPosition - Where NPC spawned at world edge
 * @property {number} evaluationTimer - Seconds remaining in evaluation
 * @property {number} housingWaitTimer - Seconds remaining before leaving (if no housing)
 */

class ImmigrationManager {
  /**
   * @param {Object} deps
   * @param {Object} deps.attractivenessCalculator - AttractivenessCalculator instance
   * @param {Object} deps.npcManager - NPCManager instance
   * @param {Object} deps.townManager - TownManager instance
   * @param {Object} deps.storage - StorageManager instance
   * @param {Object} deps.settlementModule - SettlementModule (for emitting events)
   * @param {Object} deps.identityGenerator - NPCIdentityGenerator instance
   */
  constructor(deps = {}) {
    this.attractivenessCalculator = deps.attractivenessCalculator || null;
    this.npcManager = deps.npcManager || null;
    this.townManager = deps.townManager || null;
    this.storage = deps.storage || null;
    this.settlementModule = deps.settlementModule || null;
    this.identityGenerator = deps.identityGenerator || null;

    // Timing
    this._timeSinceLastCheck = 0;
    this._checkInterval = IMMIGRATION_CHECK_INTERVAL;

    // State
    this._totalArrivals = 0;
    this._approachingNPCs = []; // NPCs in transit to settlement
    this._firstSettlerArrived = false;

    // Statistics
    this._checksPerformed = 0;
    this._checksSucceeded = 0;
    this._rejections = 0;
  }

  /**
   * Update immigration system each tick.
   * @param {number} deltaSeconds - Time since last tick in seconds
   * @param {Object} gameState - Current game state
   * @returns {Object} Immigration tick result
   */
  update(deltaSeconds, gameState) {
    this._timeSinceLastCheck += deltaSeconds;

    const result = {
      checked: false,
      arrived: false,
      npcId: null,
      approachingCount: this._approachingNPCs.length,
    };

    // Update approaching NPCs
    this._updateApproachingNPCs(deltaSeconds, gameState);

    // Check if it's time for an immigration check
    if (this._timeSinceLastCheck >= this._checkInterval) {
      this._timeSinceLastCheck = 0;
      result.checked = true;

      // Skip during rift attacks
      if (gameState && gameState.underRiftAttack) {
        return result;
      }

      this._checksPerformed++;

      // Check if we can accept more NPCs
      if (!this._canAcceptMoreNPCs(gameState)) {
        return result;
      }

      // Roll for immigration
      const score = this.attractivenessCalculator ? this.attractivenessCalculator.getScore() : 0;
      const chance = this._calculateChance(score);

      if (Math.random() < chance) {
        this._checksSucceeded++;
        this._spawnApproachingNPC(gameState);
      }
    }

    return result;
  }

  /**
   * Calculate immigration chance from attractiveness score.
   * @param {number} attractiveness
   * @returns {number} Probability 0–IMMIGRATION_MAX_CHANCE
   */
  _calculateChance(attractiveness) {
    if (attractiveness < IMMIGRATION_MIN_ATTRACTIVENESS) return 0;
    return Math.min(attractiveness / 200, IMMIGRATION_MAX_CHANCE);
  }

  /**
   * Check if the settlement can accept more NPCs.
   * @param {Object} gameState
   * @returns {boolean}
   */
  _canAcceptMoreNPCs(gameState) {
    const currentPop = this._getPopulationCount();
    const approaching = this._approachingNPCs.length;
    const total = currentPop + approaching;

    // Hard cap
    if (total >= NPC_MAX_POPULATION_PHASE_2) return false;

    // First settler is always allowed (if hasn't arrived yet)
    if (!this._firstSettlerArrived && NPC_FIRST_SETTLER_FREE) return true;

    // Check housing capacity
    const housingCapacity = this._getHousingCapacity(gameState);
    if (currentPop >= Math.max(1, housingCapacity)) return false;

    return true;
  }

  /**
   * Spawn an NPC at the world edge to walk toward the settlement.
   * @param {Object} gameState
   */
  _spawnApproachingNPC(gameState) {
    // Generate spawn position at random point around settlement
    const angle = Math.random() * Math.PI * 2;
    const distance = IMMIGRATION_SPAWN_MIN_DISTANCE +
      Math.random() * (IMMIGRATION_SPAWN_MAX_DISTANCE - IMMIGRATION_SPAWN_MIN_DISTANCE);

    // Settlement center (default to origin if not available)
    const center = this._getSettlementCenter(gameState);

    const spawnPosition = {
      x: center.x + Math.cos(angle) * distance,
      y: center.y || 0,
      z: center.z + Math.sin(angle) * distance,
    };

    const approachingNPC = {
      id: `immigrant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'APPROACHING',
      spawnPosition,
      targetPosition: center,
      evaluationTimer: IMMIGRATION_EVALUATION_TIME,
      housingWaitTimer: 0,
      arrivalTime: 0,
    };

    this._approachingNPCs.push(approachingNPC);

    // Emit event for hint system
    if (this.settlementModule) {
      this.settlementModule.emit('npc:approaching', {
        npcId: approachingNPC.id,
        position: spawnPosition,
      });
    }
  }

  /**
   * Update all approaching NPCs (travel, evaluate, join/leave).
   * @param {number} deltaSeconds
   * @param {Object} gameState
   */
  _updateApproachingNPCs(deltaSeconds, gameState) {
    const toRemove = [];

    for (const npc of this._approachingNPCs) {
      switch (npc.status) {
        case 'APPROACHING':
          // Simulate travel (in full implementation, this uses pathfinding)
          npc.arrivalTime += deltaSeconds;
          // Simple arrival check: assume 30-60 seconds travel time
          if (npc.arrivalTime >= 30) {
            npc.status = 'EVALUATING';
          }
          break;

        case 'EVALUATING':
          npc.evaluationTimer -= deltaSeconds;
          if (npc.evaluationTimer <= 0) {
            this._evaluateAndDecide(npc, gameState, toRemove);
          }
          break;

        case 'WAITING_FOR_HOUSING':
          npc.housingWaitTimer += deltaSeconds;
          // Check if housing became available
          if (this._hasAvailableHousing(gameState)) {
            this._acceptNPC(npc, gameState);
            toRemove.push(npc.id);
          }
          // Give up after IMMIGRATION_HOUSING_WAIT_DAYS (in seconds: days * day_length)
          // Approximate: 1 in-game day ≈ 1200 seconds (from tuning.js DAY_LENGTH_SECONDS)
          else if (npc.housingWaitTimer >= IMMIGRATION_HOUSING_WAIT_DAYS * 1200) {
            npc.status = 'LEAVING';
            this._rejections++;
            toRemove.push(npc.id);
          }
          break;

        case 'JOINING':
        case 'LEAVING':
          toRemove.push(npc.id);
          break;
      }
    }

    // Remove completed NPCs
    if (toRemove.length > 0) {
      this._approachingNPCs = this._approachingNPCs.filter(
        npc => !toRemove.includes(npc.id)
      );
    }
  }

  /**
   * Evaluate whether an approaching NPC should join the settlement.
   * @param {Object} npc - ApproachingNPC
   * @param {Object} gameState
   * @param {Array} toRemove - IDs to remove after processing
   */
  _evaluateAndDecide(npc, gameState, toRemove) {
    const score = this.attractivenessCalculator ? this.attractivenessCalculator.getScore() : 0;

    // First settler always joins (pioneer mechanic)
    if (!this._firstSettlerArrived && NPC_FIRST_SETTLER_FREE) {
      this._acceptNPC(npc, gameState);
      this._firstSettlerArrived = true;
      toRemove.push(npc.id);
      return;
    }

    // Score too low — NPC leaves
    if (score < IMMIGRATION_MIN_ATTRACTIVENESS) {
      npc.status = 'LEAVING';
      this._rejections++;
      toRemove.push(npc.id);
      return;
    }

    // Check housing
    if (this._hasAvailableHousing(gameState)) {
      this._acceptNPC(npc, gameState);
      toRemove.push(npc.id);
    } else {
      // No housing — wait
      npc.status = 'WAITING_FOR_HOUSING';
      npc.housingWaitTimer = 0;
    }
  }

  /**
   * Accept an NPC into the settlement — spawn through NPCManager.
   * @param {Object} approachingNPC
   * @param {Object} gameState
   */
  _acceptNPC(approachingNPC, gameState) {
    approachingNPC.status = 'JOINING';
    this._totalArrivals++;

    // Generate unique identity for the new settler
    const identity = this.identityGenerator
      ? this.identityGenerator.generate()
      : null;

    // Spawn actual NPC through NPCManager
    let spawnedNPC = null;
    if (this.npcManager && typeof this.npcManager.spawnNPC === 'function') {
      const center = this._getSettlementCenter(gameState);
      const result = this.npcManager.spawnNPC('settler', center, identity);
      spawnedNPC = result && result.npc ? result.npc : null;
    }

    // Emit events
    const npcName = spawnedNPC ? spawnedNPC.name
      : (identity ? identity.fullName : 'Settler');
    if (this.settlementModule) {
      this.settlementModule.emit('npc:joined', {
        npcId: spawnedNPC ? spawnedNPC.id : approachingNPC.id,
        name: npcName,
        totalArrivals: this._totalArrivals,
      });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────

  _getPopulationCount() {
    if (this.npcManager) {
      if (typeof this.npcManager.getStatistics === 'function') {
        const stats = this.npcManager.getStatistics();
        return stats.alive || stats.total || 0;
      }
      if (this.npcManager.npcs) {
        return this.npcManager.npcs.size || 0;
      }
    }
    return 0;
  }

  _getHousingCapacity(gameState) {
    const buildings = (gameState && gameState.buildings) || [];
    if (this.townManager && typeof this.townManager.calculateHousingCapacity === 'function') {
      return this.townManager.calculateHousingCapacity(buildings);
    }
    return 0;
  }

  _hasAvailableHousing(gameState) {
    const capacity = this._getHousingCapacity(gameState);
    const population = this._getPopulationCount();
    return capacity > population;
  }

  _getSettlementCenter(gameState) {
    // Try to find campfire position as center
    if (gameState && gameState.buildings) {
      const campfire = gameState.buildings.find(b => b.type === 'CAMPFIRE' && b.status === 'COMPLETE');
      if (campfire && campfire.position) return campfire.position;
    }
    // Fallback: territory center or origin
    if (this.townManager && typeof this.townManager.getTownCenter === 'function') {
      const center = this.townManager.getTownCenter();
      if (center) return center;
    }
    return { x: 50, y: 0, z: 50 };
  }

  // ── Serialization ───────────────────────────────────────────

  serialize() {
    return {
      timeSinceLastCheck: this._timeSinceLastCheck,
      totalArrivals: this._totalArrivals,
      firstSettlerArrived: this._firstSettlerArrived,
      approachingNPCs: this._approachingNPCs.map(npc => ({ ...npc })),
      checksPerformed: this._checksPerformed,
      checksSucceeded: this._checksSucceeded,
    };
  }

  deserialize(state) {
    if (!state) return;
    this._timeSinceLastCheck = state.timeSinceLastCheck || 0;
    this._totalArrivals = state.totalArrivals || 0;
    this._firstSettlerArrived = state.firstSettlerArrived || false;
    this._approachingNPCs = (state.approachingNPCs || []).map(npc => ({ ...npc }));
    this._checksPerformed = state.checksPerformed || 0;
    this._checksSucceeded = state.checksSucceeded || 0;
  }

  // ── Statistics ──────────────────────────────────────────────

  getStatistics() {
    return {
      totalArrivals: this._totalArrivals,
      approachingCount: this._approachingNPCs.length,
      checksPerformed: this._checksPerformed,
      checksSucceeded: this._checksSucceeded,
      rejections: this._rejections,
      firstSettlerArrived: this._firstSettlerArrived,
      timeTilNextCheck: Math.max(0, this._checkInterval - this._timeSinceLastCheck),
    };
  }
}

export default ImmigrationManager;
