/**
 * SettlementModule.js - Central coordinator for Phase 2 settlement systems
 *
 * Hosts all settlement subsystems and integrates with the ModuleOrchestrator.
 * Sub-managers are ticked in a strict order each game tick:
 *   Immigration → Zone → Stockpile → Construction → Hauling → TaskAssignment → Housing
 *
 * Inter-module communication:
 *   Settlement → ResourceEconomyModule: stockpile deposits/withdrawals
 *   Settlement → NPCManager: immigration spawns NPCs through NPCManager
 *   Settlement → GridManager: completed constructions registered as buildings
 *   Settlement → TownManager: population/housing changes forwarded
 *   NPCManager → Settlement: NPC tick delegates to TaskAssignment for work decisions
 *   BuildingConfig → Settlement: building effects and blueprints read from config
 */

import {
  IMMIGRATION_CHECK_INTERVAL,
  ATTRACTIVENESS_CAMPFIRE_BONUS,
} from '../../data/tuning.js';

import AttractivenessCalculator from './AttractivenessCalculator.js';
import ImmigrationManager from './ImmigrationManager.js';
import NPCIdentityGenerator from './NPCIdentityGenerator.js';
import ZoneManager from './ZoneManager.js';
import MiningZoneBehavior from './MiningZoneBehavior.js';
import FarmingZoneBehavior from './FarmingZoneBehavior.js';
import StockpileManager from './StockpileManager.js';

class SettlementModule {
  /**
   * @param {Object} deps - Module dependencies from GameManager
   * @param {Object} deps.npcManager - NPCManager instance
   * @param {Object} deps.storage - StorageManager instance
   * @param {Object} deps.townManager - TownManager instance
   * @param {Object} deps.grid - GridManager instance
   * @param {Object} deps.buildingConfig - BuildingConfig instance
   * @param {Object} deps.territoryManager - TerritoryManager instance
   * @param {Object} deps.npcNeedsTracker - NPCNeedsTracker instance (optional)
   */
  constructor(deps = {}) {
    this.npcManager = deps.npcManager || null;
    this.storage = deps.storage || null;
    this.townManager = deps.townManager || null;
    this.grid = deps.grid || null;
    this.buildingConfig = deps.buildingConfig || null;
    this.territoryManager = deps.territoryManager || null;
    this.npcNeedsTracker = deps.npcNeedsTracker || null;

    // Sub-managers (created in initialize)
    this.attractivenessCalculator = null;
    this.immigrationManager = null;
    this.identityGenerator = null;
    this.zoneManager = null;
    this.miningBehavior = null;
    this.farmingBehavior = null;
    this.stockpileManager = null;
    // Future sub-managers (Phase 2 weeks 4-8):
    // this.haulingManager = null;
    // this.constructionManager = null;
    // this.blueprintManager = null;
    // this.taskAssignmentEngine = null;
    // this.housingManager = null;

    // Timing
    this.tickCount = 0;
    this.elapsedTime = 0; // total seconds elapsed

    // Event listeners
    this._eventListeners = new Map();

    this.initialized = false;
  }

  /**
   * Initialize all sub-managers. Called after orchestrator is constructed.
   */
  initialize() {
    if (this.initialized) return;

    this.attractivenessCalculator = new AttractivenessCalculator({
      storage: this.storage,
      townManager: this.townManager,
      grid: this.grid,
      buildingConfig: this.buildingConfig,
      territoryManager: this.territoryManager,
      npcManager: this.npcManager,
    });

    this.identityGenerator = new NPCIdentityGenerator();

    // Register existing NPC names so they aren't reused
    if (this.npcManager && this.npcManager.npcs) {
      for (const npc of this.npcManager.npcs.values()) {
        if (npc.name) this.identityGenerator.registerName(npc.name);
      }
    }

    this.immigrationManager = new ImmigrationManager({
      attractivenessCalculator: this.attractivenessCalculator,
      npcManager: this.npcManager,
      townManager: this.townManager,
      storage: this.storage,
      settlementModule: this,
      identityGenerator: this.identityGenerator,
    });

    this.zoneManager = new ZoneManager({
      grid: this.grid,
      settlementModule: this,
    });

    this.miningBehavior = new MiningZoneBehavior({
      zoneManager: this.zoneManager,
      grid: this.grid,
      settlementModule: this,
    });

    this.farmingBehavior = new FarmingZoneBehavior({
      zoneManager: this.zoneManager,
      settlementModule: this,
    });

    this.stockpileManager = new StockpileManager({
      zoneManager: this.zoneManager,
      storage: this.storage,
      settlementModule: this,
    });

    // Wire zone events to sub-managers
    this.on('zone:created', ({ zone }) => {
      this.miningBehavior.onZoneCreated(zone);
      this.farmingBehavior.onZoneCreated(zone);
      this.stockpileManager.onZoneCreated(zone);
    });
    this.on('zone:deleted', ({ zone }) => {
      this.miningBehavior.onZoneDeleted(zone);
      this.farmingBehavior.onZoneDeleted(zone);
      this.stockpileManager.onZoneDeleted(zone);
    });

    this.initialized = true;
  }

  /**
   * Update all settlement sub-managers for one game tick.
   * Called from ModuleOrchestrator.executeTick() in Step 4.8.
   *
   * @param {number} deltaTime - Time since last tick in milliseconds
   * @param {Object} gameState - Current game state from orchestrator
   * @returns {Object} Settlement tick results
   */
  update(deltaTime, gameState) {
    if (!this.initialized) return { settlement: null };

    const deltaSeconds = deltaTime / 1000;
    this.tickCount++;
    this.elapsedTime += deltaSeconds;

    const result = {
      settlement: {
        tick: this.tickCount,
        attractiveness: 0,
        immigration: null,
        errors: [],
      }
    };

    try {
      // ── Step 1: Immigration ──────────────────────────────
      // Recalculate attractiveness and check for new arrivals
      this.attractivenessCalculator.recalculate(gameState);
      result.settlement.attractiveness = this.attractivenessCalculator.getScore();

      const immigrationResult = this.immigrationManager.update(deltaSeconds, gameState);
      result.settlement.immigration = immigrationResult;

      // ── Step 2: Zone ──────────────────────────────────────
      const zoneResult = this.zoneManager.update(deltaSeconds, gameState);
      result.settlement.zones = zoneResult;

      // ── Step 2b: Zone Behaviors ────────────────────────────
      const miningResult = this.miningBehavior.update(deltaSeconds);
      result.settlement.mining = miningResult;

      const farmingResult = this.farmingBehavior.update(deltaSeconds);
      result.settlement.farming = farmingResult;

      // ── Step 3: Stockpile ─────────────────────────────────
      const stockpileResult = this.stockpileManager.update(deltaSeconds);
      result.settlement.stockpiles = stockpileResult;

      // Future steps (uncomment as sub-managers are implemented):
      // ── Step 4: Construction ──────────────────────────────
      // ── Step 5: Hauling ───────────────────────────────────
      // ── Step 6: Task Assignment ───────────────────────────
      // ── Step 7: Housing ───────────────────────────────────

    } catch (err) {
      console.error('[SettlementModule] Tick error:', err);
      result.settlement.errors.push(err.message);
    }

    return result;
  }

  // ── Event System ────────────────────────────────────────────

  /**
   * Emit a settlement event (used by sub-managers for hint triggers, etc.)
   * @param {string} eventName
   * @param {Object} data
   */
  emit(eventName, data) {
    const listeners = this._eventListeners.get(eventName);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[SettlementModule] Event listener error for '${eventName}':`, err);
        }
      }
    }
  }

  /**
   * Subscribe to a settlement event
   * @param {string} eventName
   * @param {Function} callback
   */
  on(eventName, callback) {
    if (!this._eventListeners.has(eventName)) {
      this._eventListeners.set(eventName, []);
    }
    this._eventListeners.get(eventName).push(callback);
  }

  // ── Serialization ───────────────────────────────────────────

  /**
   * Serialize settlement state for save
   * @returns {Object} Serializable settlement state
   */
  serialize() {
    return {
      tickCount: this.tickCount,
      elapsedTime: this.elapsedTime,
      immigration: this.immigrationManager ? this.immigrationManager.serialize() : null,
      attractiveness: this.attractivenessCalculator ? this.attractivenessCalculator.getScore() : 0,
      identityGenerator: this.identityGenerator ? this.identityGenerator.serialize() : null,
      zones: this.zoneManager ? this.zoneManager.serialize() : null,
      mining: this.miningBehavior ? this.miningBehavior.serialize() : null,
      farming: this.farmingBehavior ? this.farmingBehavior.serialize() : null,
      stockpiles: this.stockpileManager ? this.stockpileManager.serialize() : null,
    };
  }

  /**
   * Restore settlement state from save
   * @param {Object} state - Previously serialized state
   */
  deserialize(state) {
    if (!state) return;

    this.tickCount = state.tickCount || 0;
    this.elapsedTime = state.elapsedTime || 0;

    if (state.immigration && this.immigrationManager) {
      this.immigrationManager.deserialize(state.immigration);
    }
    if (state.identityGenerator && this.identityGenerator) {
      this.identityGenerator.deserialize(state.identityGenerator);
    }
    if (state.zones && this.zoneManager) {
      this.zoneManager.deserialize(state.zones);
    }
    if (state.mining && this.miningBehavior) {
      this.miningBehavior.deserialize(state.mining);
    }
    if (state.farming && this.farmingBehavior) {
      this.farmingBehavior.deserialize(state.farming);
    }
    if (state.stockpiles && this.stockpileManager) {
      this.stockpileManager.deserialize(state.stockpiles);
    }
  }

  // ── Statistics ──────────────────────────────────────────────

  getStatistics() {
    return {
      tickCount: this.tickCount,
      attractiveness: this.attractivenessCalculator ? this.attractivenessCalculator.getScore() : 0,
      immigration: this.immigrationManager ? this.immigrationManager.getStatistics() : null,
      zones: this.zoneManager ? { total: this.zoneManager.zones.size } : null,
      mining: this.miningBehavior ? { totalTasks: this.miningBehavior.tasks.size } : null,
      farming: this.farmingBehavior ? { totalTasks: this.farmingBehavior.tasks.size } : null,
      stockpiles: this.stockpileManager ? { total: this.stockpileManager.stockpiles.size } : null,
      initialized: this.initialized,
    };
  }
}

export default SettlementModule;
