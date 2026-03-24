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
  ATTRACT_RECALC_INTERVAL,
  IMMIGRATION_THRESHOLD,
  IMMIGRATION_THRESHOLD_PER_NPC,
  IMMIGRATION_SPAWN_MIN_DIST,
  IMMIGRATION_SPAWN_MAX_DIST,
  IMMIGRATION_MAX_NPCS,
  NPC_NEEDS_TICK_INTERVAL,
} from '../../data/tuning.js';

import AttractivenessCalculator from './AttractivenessCalculator.js';
import ImmigrationManager from './ImmigrationManager.js';
import NPCIdentityGenerator from './NPCIdentityGenerator.js';
import ZoneManager from './ZoneManager.js';
import MiningZoneBehavior from './MiningZoneBehavior.js';
import FarmingZoneBehavior from './FarmingZoneBehavior.js';
import StockpileManager from './StockpileManager.js';
import ChunkAttractivenessAdapter from './ChunkAttractivenessAdapter.js';
import { scanForCampfire, getTerrainYAt } from './CampfireDetector.js';
import { tickNPC } from './NPCStateMachine.js';
import { generateNPCIdentity } from '../../data/npcIdentity.js';

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

    // ── Core tick state (used by tickSettlementCore, driven by bridge) ──
    this.chunkAdapter = null;
    this.chunkAttractiveness = null;
    this.settlementCenter = null;
    this._warnedNPCs = new Set();
    this._npcIdCounter = 0;
    this._campfireAccum = 0;
    this._attractAccum = 0;
    this._immigrationAccum = 0;
    this._needsAccum = 0;

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

    // Chunk-based attractiveness calculator (used by tickSettlementCore)
    this.chunkAttractiveness = new ChunkAttractivenessAdapter();

    this.initialized = true;
  }

  /**
   * Set the chunk adapter for campfire detection and chunk-based attractiveness.
   * Called by SettlementBridge when chunkManager becomes available.
   * @param {Object} adapter - { iterateChunks(), getBlock(), getRawChunkManager() }
   */
  setChunkAdapter(adapter) {
    this.chunkAdapter = adapter;
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

  // ── Core Settlement Tick (driven by SettlementBridge) ──────

  /**
   * Tick campfire detection, attractiveness, immigration, and NPC state machines.
   * Called every frame by the bridge; internal accumulators gate actual work.
   *
   * This is SEPARATE from update() which handles zones/mining/farming/stockpiles
   * via the ModuleOrchestrator.
   *
   * @param {number} deltaSeconds - Frame delta in seconds (from useFrame)
   * @param {Object} storeSnapshot - { settlement, inventory, worldTimeElapsed }
   * @returns {Object} Results for the bridge to sync back to the store
   */
  tickSettlementCore(deltaSeconds, storeSnapshot) {
    if (!this.initialized || !this.chunkAdapter) {
      return null;
    }

    const settlement = storeSnapshot.settlement;
    const results = {
      campfireCenter: null,
      attractiveness: 0,
      wallCount: 0,
      attractivenessUpdated: false,
      newNPC: null,
      batchUpdates: {},
      removeIds: [],
      notifications: [],
      foodConsumptions: [],
      timestamps: {},
    };

    // ── Step 0: Campfire detection (every 5s, until center found) ──
    if (!this.settlementCenter) {
      this._campfireAccum += deltaSeconds;
      if (this._campfireAccum >= 5) {
        this._campfireAccum = 0;
        const found = scanForCampfire(this.chunkAdapter);
        if (found) {
          this.settlementCenter = found;
          results.campfireCenter = found;
          return results; // Early return — matches original behavior
        }
      }
      return results; // No center yet — skip everything else
    }

    const center = this.settlementCenter;

    // ── Step 1: Attractiveness recalc ──
    this._attractAccum += deltaSeconds;
    if (this._attractAccum >= ATTRACT_RECALC_INTERVAL) {
      this._attractAccum = 0;
      this.chunkAttractiveness.recalculate(center, this.chunkAdapter, storeSnapshot);
      results.attractiveness = this.chunkAttractiveness.getScore();
      results.wallCount = this.chunkAttractiveness.getWallCount();
      results.attractivenessUpdated = true;
    }

    // Use latest attractiveness (from this frame or previously cached)
    const currentAttractiveness = results.attractivenessUpdated
      ? results.attractiveness
      : settlement.attractiveness;
    const currentWallCount = results.attractivenessUpdated
      ? results.wallCount
      : (settlement.wallCount || 0);

    // ── Step 2: Immigration check ──
    this._immigrationAccum += deltaSeconds;
    if (this._immigrationAccum >= IMMIGRATION_CHECK_INTERVAL) {
      this._immigrationAccum = 0;
      const npcCount = settlement.npcs.length;
      const threshold = IMMIGRATION_THRESHOLD + npcCount * IMMIGRATION_THRESHOLD_PER_NPC;
      const housingSlots = Math.floor(currentWallCount / 25);
      const maxNPCs = Math.min(IMMIGRATION_MAX_NPCS, Math.max(3, housingSlots));

      if (currentAttractiveness >= threshold && npcCount < maxNPCs) {
        const angle = Math.random() * Math.PI * 2;
        const dist = IMMIGRATION_SPAWN_MIN_DIST +
          Math.random() * (IMMIGRATION_SPAWN_MAX_DIST - IMMIGRATION_SPAWN_MIN_DIST);
        const spawnX = center[0] + Math.cos(angle) * dist;
        const spawnZ = center[2] + Math.sin(angle) * dist;
        const spawnY = getTerrainYAt(this.chunkAdapter, spawnX, spawnZ);

        const seed = Date.now() ^ (++this._npcIdCounter * 2654435761);
        const identity = generateNPCIdentity(seed);

        results.newNPC = {
          id: `npc_${Date.now()}_${this._npcIdCounter}`,
          ...identity,
          position: [spawnX, spawnY, spawnZ],
          targetPosition: [...center],
          facingAngle: 0,
          state: 'APPROACHING',
          stateTimer: 0,
          hunger: 80,
          rest: 80,
          social: 80,
          happiness: 65,
          unhappyDays: 0,
          dayCheckpoint: storeSnapshot.worldTimeElapsed,
          currentJob: null,
          arrivedAtSettlement: false,
        };
      }
      results.timestamps.lastImmigrationCheck = Date.now();
    }

    // ── Step 3: NPC state machine tick ──
    this._needsAccum += deltaSeconds;
    if (this._needsAccum >= NPC_NEEDS_TICK_INTERVAL) {
      const tickDelta = this._needsAccum;
      this._needsAccum = 0;

      const context = {
        center,
        attractiveness: currentAttractiveness,
        npcs: settlement.npcs,
        inventory: storeSnapshot.inventory,
        worldTimeElapsed: storeSnapshot.worldTimeElapsed,
        warnedNPCs: this._warnedNPCs,
      };

      for (const npc of settlement.npcs) {
        const { updates, remove, notifications, consumeFood } = tickNPC(npc, tickDelta, context);

        if (remove) {
          results.removeIds.push(npc.id);
        } else {
          results.batchUpdates[npc.id] = updates;
        }

        if (notifications && notifications.length > 0) {
          results.notifications.push(...notifications);
        }

        if (consumeFood) {
          results.foodConsumptions.push(consumeFood);
        }
      }

      results.timestamps.lastNeedsUpdate = Date.now();
    }

    return results;
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
      // Core tick state
      settlementCenter: this.settlementCenter,
      npcIdCounter: this._npcIdCounter,
      warnedNPCs: Array.from(this._warnedNPCs),
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
    // Core tick state
    if (state.settlementCenter) {
      this.settlementCenter = state.settlementCenter;
    }
    if (state.npcIdCounter != null) {
      this._npcIdCounter = state.npcIdCounter;
    }
    if (state.warnedNPCs) {
      this._warnedNPCs = new Set(state.warnedNPCs);
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
