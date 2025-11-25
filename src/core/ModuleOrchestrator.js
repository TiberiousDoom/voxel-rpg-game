/**
 * ModuleOrchestrator.js - Central coordinator for all game modules
 *
 * Manages:
 * - Module initialization and interdependencies
 * - Data flow between modules
 * - Tick coordination across all systems
 * - State synchronization
 *
 * Orchestrates:
 * - Module 1: Foundation (GridManager, SpatialPartitioning)
 * - Module 2: Building Types (BuildingConfig, TierProgression, BuildingEffect)
 * - Module 3: Resource Economy (ProductionTick, StorageManager, ConsumptionSystem, MoraleCalculator)
 * - Module 4: Territory & Town (TerritoryManager, TownManager)
 * - NPC System (NPCManager, NPCAssignment)
 */

import { BuildingIntegration } from '../utils/integrations/BuildingIntegration.js';
import { calculateDerivedStats, activeSkillSystem } from '../modules/character/CharacterSystem.js';

class ModuleOrchestrator {
  /**
   * Initialize orchestrator with all modules
   * @param {Object} modules - All initialized modules
   */
  constructor(modules) {
    this.validateModules(modules);

    // Foundation (Module 1)
    this.grid = modules.grid;
    this.spatial = modules.spatial;

    // Building Types (Module 2)
    this.buildingConfig = modules.buildingConfig;
    this.tierProgression = modules.tierProgression;
    this.buildingEffect = modules.buildingEffect;

    // Resource Economy (Module 3)
    this.productionTick = modules.productionTick;
    this.storage = modules.storage;
    this.consumption = modules.consumption;
    this.morale = modules.morale;

    // Territory & Town (Module 4)
    this.territoryManager = modules.territoryManager;
    this.townManager = modules.townManager;

    // NPC System
    this.npcManager = modules.npcManager;
    this.npcAssignment = modules.npcAssignment;

    // Phase 3D: Tutorial System (optional)
    this.tutorialSystem = modules.tutorialSystem || null;
    this.contextHelp = modules.contextHelp || null;
    this.featureUnlock = modules.featureUnlock || null;
    // Phase 3A: NPC Advanced Behaviors (optional)
    this.idleTaskManager = modules.idleTaskManager || null;
    this.npcNeedsTracker = modules.npcNeedsTracker || null;
    this.autonomousDecision = modules.autonomousDecision || null;

    // Phase 3C: Achievement System (optional)
    this.achievementSystem = modules.achievementSystem || null;
    // Phase 3A: NPC Advanced Behaviors
    this.idleTaskManager = modules.idleTaskManager;
    this.npcNeedsTracker = modules.npcNeedsTracker;
    this.autonomousDecision = modules.autonomousDecision;

    // Phase 3B: Event System
    this.eventSystem = modules.eventSystem;
    // Set orchestrator reference for event system
    if (this.eventSystem) {
      this.eventSystem.orchestrator = this;
    }

    // Phase 3C: Set orchestrator reference for NPC manager (achievement tracking)
    if (this.npcManager && this.npcManager.setOrchestrator) {
      this.npcManager.setOrchestrator(this);
    }

    // Hybrid Game: Core Systems
    this.unifiedState = modules.unifiedState || null;
    this.modeManager = modules.modeManager || null;
    this.sharedResources = modules.sharedResources || null;
    this.sharedInventory = modules.sharedInventory || null;

    // Hybrid Game: Combat Systems (Phase 2)
    this.npcSkillSystem = modules.npcSkillSystem || null;
    this.npcEquipmentManager = modules.npcEquipmentManager || null;

    // Hybrid Game: Expedition System (Phase 3)
    this.expeditionManager = modules.expeditionManager || null;
    this.dungeonCombatEngine = modules.dungeonCombatEngine || null;

    // Hybrid Game: Defense System (Phase 4)
    this.raidEventManager = modules.raidEventManager || null;
    this.defenseCombatEngine = modules.defenseCombatEngine || null;

    // Phase 4: Terrain Job System
    this.terrainSystem = modules.terrainSystem || null;
    this.jobTimeCalculator = modules.jobTimeCalculator || null;
    this.terrainJobQueue = modules.terrainJobQueue || null;
    this.terrainWorkerBehavior = modules.terrainWorkerBehavior || null;

    // Phase 3C: Achievement bonuses (multiplicative)
    this.achievementBonuses = {
      production: 1.0,
      food: 1.0,
      wood: 1.0,
      stone: 1.0,
      gold: 1.0,
      essence: 1.0,
      crystals: 1.0,
      morale: 1.0,
      storage: 1.0,
      npcHappiness: 1.0,
      npcHealth: 1.0,
      buildingHealth: 1.0
    };

    // Subscribe to achievement reward events
    if (this.achievementSystem) {
      this.achievementSystem.on('achievement:reward', (data) => {
        this._applyAchievementReward(data);
      });
    }

    // Character System Integration: Reference to character for Construction bonuses
    this.character = null;

    // Game state
    this.tickCount = 0;
    this.isPaused = false;
    this.gameState = {
      currentTier: 'SURVIVAL',
      territories: [],
      buildings: [],
      npcs: [],
      production: {},
      consumption: 0,
      morale: 0,
      // Phase 3B: Event multipliers
      eventMultipliers: {},
      eventConsumptionModifiers: { food: 0 }
    };

    // Performance tracking
    this.tickMetrics = {
      totalTicks: 0,
      averageTickTime: 0,
      slowestTick: 0,
      tickTimes: []
    };
  }

  /**
   * Validate all required modules are present
   * @private
   */
  validateModules(modules) {
    const required = [
      'grid', 'spatial', 'buildingConfig', 'tierProgression', 'buildingEffect',
      'productionTick', 'storage', 'consumption', 'morale',
      'territoryManager', 'townManager', 'npcManager', 'npcAssignment'
    ];

    // Phase 3A & 3B modules are optional for backwards compatibility
    const optional = [
      'idleTaskManager', 'npcNeedsTracker', 'autonomousDecision',
      'eventSystem'
    ];

    for (const module of required) {
      if (!modules[module]) {
        throw new Error(`ModuleOrchestrator missing required module: ${module}`);
      }
    }

    // Log warnings for missing optional modules
    for (const module of optional) {
      if (!modules[module]) {
        console.warn(`ModuleOrchestrator: Optional module '${module}' not provided`);
      }
    }
  }

  /**
   * Set character reference (for Construction attribute bonuses)
   * @param {object} character - Character data with attributes
   */
  setCharacter(character) {
    this.character = character;
  }

  /**
   * Execute one complete game tick
   * Coordinates all systems in proper order:
   * 1. Production
   * 2. Consumption
   * 3. Morale
   * 4. NPC Updates
   * 5. Territory/Tier Checks
   *
   * @returns {Object} Tick result with all updates
   */
  executeTick() {
    const tickStart = performance.now();

    if (this.isPaused) {
      return { paused: true, tick: this.tickCount };
    }

    this.tickCount++;
    const result = {
      tick: this.tickCount,
      timestamp: new Date().toISOString(),
      production: {},
      consumption: 0,
      morale: 0,
      errors: []
    };

    try {
      // ============================================
      // STEP 1: PRODUCTION PHASE
      // ============================================
      const npcAssignments = this._buildNPCAssignmentMap();
      const moraleMultiplier = this.morale.getMoraleMultiplier();

      const productionResult = this.productionTick.executeTick(
        this.gameState.buildings,
        npcAssignments,
        this.npcManager,
        moraleMultiplier,
        this.gameState
      );

      // Phase 3C: Apply achievement bonuses to production
      for (const [resource, amount] of Object.entries(productionResult.production)) {
        // Apply general production bonus
        let finalAmount = amount * this.getAchievementMultiplier('production');

        // Apply resource-specific bonuses
        const resourceMultiplier = this.achievementBonuses[resource] || 1.0;
        finalAmount *= resourceMultiplier;

        // Phase 5: Apply NPC combat bonuses to production
        // Veterans and high-level NPCs provide production bonuses
        if (this.npcSkillSystem) {
          const combatBonus = this._calculateCombatProductionBonus(npcAssignments);
          finalAmount *= (1 + combatBonus);
        }

        productionResult.production[resource] = finalAmount;
      }

      result.production = productionResult.production;

      // ============================================
      // STEP 2: CONSUMPTION PHASE
      // ============================================
      const foodBefore = this.storage.getResource('food');
      const consumptionResult = this.consumption.executeConsumptionTick(
        foodBefore,
        this.gameState.buildings,
        this.npcAssignment,
        this.gameState
      );

      const foodConsumed = parseFloat(consumptionResult.foodConsumed) || 0;
      // Only remove food if there's actual consumption
      if (foodConsumed > 0) {
        this.storage.removeResource('food', foodConsumed);
      }
      result.consumption = foodConsumed;

      // Check for starvation
      if (consumptionResult.starvationOccurred) {
        for (const npcId of (consumptionResult.npcKilled || [])) {
          this.npcManager.killNPC(npcId, 'starvation'); // Phase 3C: Pass cause of death
          this.npcAssignment.unassignNPC(npcId);
        }
        result.starvationEvents = consumptionResult.npcKilled?.length || 0;
      }

      // ============================================
      // STEP 3: MORALE PHASE
      // ============================================
      this.consumption.updateHappiness(
        this.storage.getResource('food') / this.consumption.getAliveCount()
      );

      const aliveNPCs = this.consumption.getAliveNPCs();
      const housing = this.townManager.calculateHousingCapacity(this.gameState.buildings);
      const territoryCount = this.territoryManager.getAllTerritories().length;

      // Calculate building morale bonuses
      let buildingMoraleBonus = 0;
      for (const building of this.gameState.buildings) {
        try {
          const config = this.buildingConfig.getConfig(building.type);
          if (config.effects && config.effects.moraleBonus) {
            buildingMoraleBonus += config.effects.moraleBonus;
          }
        } catch (err) {
          // Building type not found, skip
        }
      }

      // Phase 3C: Apply achievement morale bonus to building bonuses
      const totalMoraleBonus = buildingMoraleBonus * this.achievementBonuses.morale;

      this.morale.calculateTownMorale({
        npcs: aliveNPCs,
        foodAvailable: this.storage.getResource('food'),
        housingCapacity: housing,
        expansionCount: territoryCount - 1, // First territory doesn't count
        buildingBonus: totalMoraleBonus
      });

      result.morale = this.morale.getCurrentMorale();
      result.moraleState = this.morale.getMoraleState();

      // ============================================
      // STEP 4: NPC UPDATES
      // ============================================
      // Update buildings map for NPC movement targeting
      this.npcManager.updateBuildingsMap(this.gameState.buildings);

      this.npcManager.updateAllNPCs(this.tickCount);

      // ============================================
      // STEP 4.5: PHASE 3A - NPC ADVANCED BEHAVIORS
      // ============================================
      if (this.npcNeedsTracker && this.idleTaskManager && this.autonomousDecision) {
        // Build NPC state map for needs tracking
        const npcStates = {};
        for (const npc of this.npcManager.npcs.values()) {
          npcStates[npc.id] = {
            isWorking: npc.isWorking || this.npcAssignment.getAssignment(npc.id) !== null,
            isResting: npc.isResting || false,
            isSocializing: false, // Will be set by idle task
            isInsideTerritory: this.territoryManager.isPositionInAnyTerritory(npc.position)
          };
        }

        // Update NPC needs (decay over time)
        const deltaTime = 1000; // 1 second per tick
        this.npcNeedsTracker.updateAllNeeds(deltaTime, npcStates);

        // Update idle tasks
        const completedTasks = this.idleTaskManager.updateTasks(deltaTime);

        // Apply task rewards to NPCs
        for (const { npcId, task } of completedTasks) {
          const rewards = task.rewards;
          if (rewards) {
            // Apply happiness change
            if (rewards.happiness) {
              const npc = this.npcManager.getNPC(npcId);
              if (npc) {
                npc.happiness = Math.min(100, npc.happiness + rewards.happiness);
              }
            }

            // Apply need satisfaction
            if (rewards.socialNeed) {
              this.npcNeedsTracker.satisfyNeed(npcId, 'SOCIAL', rewards.socialNeed);
            }
            if (rewards.restNeed) {
              this.npcNeedsTracker.satisfyNeed(npcId, 'REST', rewards.restNeed);
            }
            if (rewards.fatigue) {
              // Reduce fatigue (negative value)
              const npc = this.npcManager.getNPC(npcId);
              if (npc && npc.fatigued) {
                npc.fatigued = false; // Clear fatigue flag
              }
            }
          }
        }

        // Assign idle tasks to NPCs without tasks
        for (const npc of this.npcManager.npcs.values()) {
          if (!npc.isWorking && !npc.assignedBuilding && !this.idleTaskManager.hasActiveTask(npc.id)) {
            this.idleTaskManager.assignTask(npc);
          }
        }

        result.phase3a = {
          needsTracked: this.npcNeedsTracker.getStatistics().totalNPCsTracked,
          criticalNeeds: this.npcNeedsTracker.getAllCriticalNPCs().length,
          tasksCompleted: completedTasks.length,
          activeTasks: this.idleTaskManager.getStatistics().activeTasks
        };
      }

      // ============================================
      // STEP 4.6: PHASE 3B - EVENT SYSTEM
      // ============================================
      if (this.eventSystem) {
        // Check if new events should trigger
        const eventGameState = {
          ...this.gameState,
          buildings: this.gameState.buildings,
          population: this.npcManager.npcs.size,
          gridManager: this.grid,
          storageManager: this.storage,
          townManager: this.townManager,
          npcManager: this.npcManager,
          npcAssignments: this.npcAssignment,
          buildingConfig: this.buildingConfig,
          territoryManager: this.territoryManager
        };

        this.eventSystem.checkEventTriggers(this.tickCount, eventGameState);

        // Update active events (deltaTime = 1 second per tick)
        this.eventSystem.updateActiveEvents(1, eventGameState);

        // Get event system stats and notifications
        const activeEvents = this.eventSystem.getActiveEvents();
        const notifications = this.eventSystem.getPendingNotifications();

        result.phase3b = {
          activeEvents: activeEvents.map(event => ({
            id: event.id,
            name: event.name,
            type: event.type,
            description: event.description,
            timeRemaining: Math.max(0, event.duration - (event.elapsedTime || 0)),
            effects: event.effects
          })),
          queuedEvents: this.eventSystem.eventQueue.length,
          totalEventsTriggered: this.eventSystem.stats.totalEventsTriggered,
          notifications: notifications
        };
      }

      // ============================================
      // STEP 5: PHASE 5 - HYBRID GAME SYSTEMS
      // ============================================
      if (this.unifiedState) {
        // Only process if we have hybrid systems enabled
        const currentMode = this.unifiedState.getCurrentMode();

        // ============================================
        // RAID SYSTEM (Settlement Mode)
        // ============================================
        if (currentMode === 'settlement' && this.raidEventManager) {
          // Check if raid should trigger
          if (this.raidEventManager.shouldTriggerRaid()) {
            const raidResult = this.raidEventManager.startRaid();

            if (raidResult.success) {
              result.raidTriggered = {
                raidId: raidResult.raid.id,
                raidType: raidResult.raid.type,
                difficulty: raidResult.raid.difficulty
              };

              // Auto-switch to defense mode
              if (this.modeManager) {
                this.modeManager.switchMode('defense', {
                  raidId: raidResult.raid.id
                });
              }
            }
          }

          // Schedule next raid if not scheduled
          if (!this.raidEventManager.nextRaidTime) {
            this.raidEventManager.scheduleNextRaid();
          }
        }

        // ============================================
        // EXPEDITION SYSTEM (Expedition Mode)
        // ============================================
        if (currentMode === 'expedition' && this.expeditionManager) {
          const activeExpedition = this.expeditionManager.getActiveExpedition();

          if (activeExpedition) {
            // Progress expedition (1 second per tick = 5 seconds)
            const progressResult = this.expeditionManager.progressExpedition(5);

            result.expeditionProgress = {
              expeditionId: activeExpedition.id,
              currentFloor: activeExpedition.currentFloor,
              roomsExplored: progressResult.roomsExplored,
              combatOccurred: progressResult.combatOccurred
            };

            // Check if expedition completed
            if (progressResult.completed || progressResult.failed) {
              result.expeditionComplete = {
                success: progressResult.completed,
                rewards: progressResult.rewards,
                casualties: progressResult.casualties
              };

              // Auto-switch back to settlement mode
              if (this.modeManager) {
                this.modeManager.switchMode('settlement', {
                  completed: progressResult.completed,
                  abandoned: progressResult.failed
                });
              }
            }
          }
        }

        // ============================================
        // DEFENSE SYSTEM (Defense Mode)
        // ============================================
        if (currentMode === 'defense' && this.raidEventManager && this.defenseCombatEngine) {
          const activeRaid = this.raidEventManager.getActiveRaid();

          if (activeRaid) {
            // Spawn next wave if ready
            if (activeRaid.currentWave < activeRaid.totalWaves) {
              const waveResult = this.raidEventManager.spawnNextWave();

              if (waveResult.success) {
                // Get defenders
                const defenders = this.defenseCombatEngine.getAvailableDefenders();

                // Simulate wave combat
                const combatResult = this.defenseCombatEngine.simulateWaveCombat(
                  defenders,
                  waveResult.enemies
                );

                // Update raid stats
                this.raidEventManager.updateRaidStats({
                  enemiesKilled: combatResult.enemiesKilled,
                  defendersKilled: combatResult.defendersKilled.length,
                  damageToSettlement: combatResult.damageToSettlement
                });

                result.waveCombat = {
                  waveNumber: activeRaid.currentWave,
                  victory: combatResult.victory,
                  enemiesKilled: combatResult.enemiesKilled,
                  defendersLost: combatResult.defendersKilled.length
                };

                // Heal defenders between waves
                if (combatResult.victory) {
                  this.defenseCombatEngine.healDefenders(defenders, 0.2);
                }
              }
            } else {
              // All waves complete - determine raid outcome
              const raidComplete = activeRaid.stats.defendersKilled === 0;

              if (raidComplete) {
                const completeResult = this.raidEventManager.completeRaid();
                result.raidComplete = {
                  success: true,
                  rewards: completeResult.rewards
                };
              } else {
                const failResult = this.raidEventManager.failRaid();
                result.raidFailed = {
                  penalties: failResult.penalties
                };
              }

              // Auto-switch back to settlement mode
              if (this.modeManager) {
                this.modeManager.switchMode('settlement', {
                  defenseComplete: true
                });
              }
            }
          }
        }

        result.hybridGameMode = currentMode;
      }

      // ============================================
      // STEP 6: STORAGE OVERFLOW CHECK
      // ============================================
      const overflowResult = this.storage.checkAndHandleOverflow();
      if (overflowResult.overflowed) {
        result.overflow = {
          amountDumped: overflowResult.amountDumped,
          reason: 'Storage capacity exceeded'
        };
      }

      // ============================================
      // STEP 6: STATE UPDATE
      // ============================================
      this._updateGameState();

      // ============================================
      // STEP 6.5: PHASE 3D - TUTORIAL SYSTEM
      // ============================================
      if (this.tutorialSystem && this.tutorialSystem.flowManager.isActive) {
        // Build tutorial-specific game state
        const tutorialGameState = this._buildTutorialGameState();

        // Update tutorial progress
        this.tutorialSystem.update(tutorialGameState);

        result.tutorialActive = true;
        result.tutorialStep = this.tutorialSystem.flowManager.currentStepIndex;
      }

      // Check context help triggers
      if (this.contextHelp && this.contextHelp.enabled) {
        const helpGameState = this._buildHelpGameState();
        const triggeredTips = this.contextHelp.checkTriggers(helpGameState);

        if (triggeredTips.length > 0) {
          result.contextHelpTriggered = triggeredTips.map(tip => tip.id);
        }
      }

      // Check feature unlocks
      if (this.featureUnlock && this.featureUnlock.enabled) {
        const unlockGameState = this._buildUnlockGameState();
        const newlyUnlocked = this.featureUnlock.checkUnlocks(unlockGameState);

        if (newlyUnlocked.length > 0) {
          result.featuresUnlocked = newlyUnlocked;
        }
      }

      // ============================================
      // STEP 6.5: PHASE 3C - ACHIEVEMENT TRACKING
      // ============================================
      if (this.achievementSystem) {
        const newlyUnlocked = this.achievementSystem.checkAchievements(this.gameState);
        if (newlyUnlocked.length > 0) {
          result.achievements = {
            newlyUnlocked: newlyUnlocked.map(a => ({
              id: a.id,
              name: a.name,
              description: a.description,
              icon: a.icon,
              reward: a.reward
            }))
          };
        }
      }

      // ============================================
      // STEP 7: PERFORMANCE TRACKING
      // ============================================
      const tickTime = performance.now() - tickStart;
      this._trackTickPerformance(tickTime);
      result.tickTimeMs = tickTime.toFixed(2);

    } catch (err) {
      result.errors.push(`Tick ${this.tickCount} error: ${err.message}`);
    }

    return result;
  }

  /**
   * Build NPC assignment map from all systems
   * @private
   */
  _buildNPCAssignmentMap() {
    const map = {};
    const stats = this.npcAssignment.getStatistics();

    for (const building of stats.byBuilding) {
      map[building.buildingId] = this.npcAssignment.getNPCsInBuilding(building.buildingId);
    }

    return map;
  }

  /**
   * Update game state from all modules
   * @private
   */
  _updateGameState() {
    this.gameState.tick = this.tickCount;
    this.gameState.territories = this.territoryManager.getAllTerritories().map(t => t.id);
    this.gameState.buildings = this.grid.getAllBuildings().map(b => ({
      id: b.id,
      type: b.type,
      position: b.position
    }));
    this.gameState.npcs = this.npcManager.getAllNPCStates();
    this.gameState.storage = this.storage; // Full storage reference for achievement tracking
    this.gameState.morale = this.morale.getCurrentMorale();
    this.gameState.population = this.npcManager.getStatistics();
    this.gameState.currentTier = this.gameState.currentTier || 'SURVIVAL'; // Current tier
    this.gameState.npcManager = this.npcManager; // NPC manager reference for achievement tracking

    // Calculate and include skill effects from character system
    if (this.character && this.player) {
      const derivedStats = calculateDerivedStats(this.character, this.player, this.equipment || {});
      const passiveEffects = derivedStats.skillEffects || {};

      // Get active buff effects
      const activeBuffEffects = activeSkillSystem.getActiveBuffEffects();

      // Merge passive and active effects
      this.gameState.skillEffects = {};
      for (const key in passiveEffects) {
        this.gameState.skillEffects[key] = passiveEffects[key];
      }
      for (const key in activeBuffEffects) {
        this.gameState.skillEffects[key] = (this.gameState.skillEffects[key] || 0) + activeBuffEffects[key];
      }
    } else {
      this.gameState.skillEffects = {};
    }
  }

  /**
   * Track tick performance metrics
   * @private
   */
  _trackTickPerformance(tickTime) {
    this.tickMetrics.totalTicks++;
    this.tickMetrics.tickTimes.push(tickTime);

    if (tickTime > this.tickMetrics.slowestTick) {
      this.tickMetrics.slowestTick = tickTime;
    }

    // Keep last 60 ticks for rolling average
    if (this.tickMetrics.tickTimes.length > 60) {
      this.tickMetrics.tickTimes.shift();
    }

    const sum = this.tickMetrics.tickTimes.reduce((a, b) => a + b, 0);
    this.tickMetrics.averageTickTime = (sum / this.tickMetrics.tickTimes.length).toFixed(2);
  }

  /**
   * Attempt tier advancement
   * @param {string} targetTier - Target tier to advance to
   * @returns {Object} {success, reason, newTier}
   */
  advanceTier(targetTier) {
    const resources = this.storage.getStorage();
    const buildings = this.gameState.buildings;

    const result = this.tierProgression.canAdvanceToTier(
      targetTier,
      buildings,
      resources,
      this.gameState.currentTier
    );

    if (result.canAdvance) {
      // Consume resources
      const requirements = this.tierProgression.getRequirementsForTier(targetTier);
      const resourceCost = requirements.resourceRequirements || {};

      for (const [resource, amount] of Object.entries(resourceCost)) {
        this.storage.removeResource(resource, amount);
      }

      this.gameState.currentTier = targetTier;

      // Phase 3C: Record tier reached for achievements
      if (this.achievementSystem) {
        this.achievementSystem.recordTierReached(targetTier);
      }

      return {
        success: true,
        newTier: targetTier,
        resourcesSpent: resourceCost
      };
    }

    return {
      success: false,
      reason: result.reason,
      missingRequirements: result.missingRequirements
    };
  }

  /**
   * Expand territory
   * @param {string} territoryId - Territory to expand
   * @returns {Object} Expansion result
   */
  expandTerritory(territoryId) {
    const territory = this.territoryManager.getTerritory(territoryId);
    if (!territory) {
      return { success: false, reason: 'Territory not found' };
    }

    const resources = this.storage.getStorage();
    const buildings = this.gameState.buildings;

    const result = this.territoryManager.expandTerritory(territoryId, resources, buildings);

    if (result.success) {
      // Consume resources
      const nextTier = result.newTier;
      const cost = this.territoryManager.getExpansionCost(nextTier);
      for (const [resource, amount] of Object.entries(cost)) {
        if (resource !== 'buildingsRequired') {
          this.storage.removeResource(resource, amount);
        }
      }
    }

    return result;
  }

  /**
   * Place building on grid
   * @param {Object} building - Building to place
   * @returns {Object} Placement result
   */
  placeBuilding(building) {
    // Validate building has required fields
    if (!building || !building.type) {
      return { success: false, message: 'Building missing type' };
    }

    // Validate with BuildingConfig and get cost
    let config;
    try {
      config = this.buildingConfig.getConfig(building.type);
      if (!config) {
        return { success: false, message: `Unknown building type: ${building.type}` };
      }
    } catch (err) {
      return { success: false, message: `BuildingConfig error: ${err.message}` };
    }

    // Calculate building cost with Construction bonuses
    const baseCost = config.cost || {};
    const cost = this.character
      ? BuildingIntegration.calculateBuildingCost(
          { baseCost, type: building.type, category: config.category },
          this.character
        )
      : baseCost;

    // Apply Construction bonuses to building properties
    if (this.character) {
      building.maxHealth = BuildingIntegration.calculateBuildingHealth(
        { maxHealth: config.health || 100 },
        this.character
      );
      building.health = building.maxHealth;
      building.constructionBonus = this.character.attributes?.construction || 0;
      building.quality = BuildingIntegration.calculateBuildingQuality(this.character);
    } else {
      building.maxHealth = config.health || 100;
      building.health = building.maxHealth;
    }

    // Check if player has enough resources
    const currentResources = this.storage.getStorage();

    for (const [resource, amount] of Object.entries(cost)) {
      if (amount > 0) {
        const available = currentResources[resource] || 0;
        if (available < amount) {
          return {
            success: false,
            message: `Not enough ${resource}. Need ${amount}, have ${available}`
          };
        }
      }
    }

    // Consume resources
    for (const [resource, amount] of Object.entries(cost)) {
      if (amount > 0) {
        this.storage.removeResource(resource, amount);
      }
    }

    // Place on grid
    const gridResult = this.grid.placeBuilding(building);
    if (!gridResult.success) {
      // Refund resources if placement failed
      for (const [resource, amount] of Object.entries(cost)) {
        if (amount > 0) {
          this.storage.addResource(resource, amount);
        }
      }
      return gridResult;
    }

    // Add to spatial index
    this.spatial.addBuilding(building);

    // Register effects
    const effectIds = this.buildingEffect.registerBuildingEffects(building);

    // Register work slots
    this.npcAssignment.registerBuilding(building);

    // Add to territory
    const territory = this.territoryManager.findTerritoryForBuilding(building);
    if (territory) {
      this.territoryManager.addBuildingToTerritory(territory, building);
    }

    // Update game state immediately for UI reactivity
    this._updateGameState();

    return {
      success: true,
      buildingId: building.id,
      effects: effectIds
    };
  }

  /**
   * Remove building
   * @param {string} buildingId - Building to remove
   */
  removeBuilding(buildingId) {
    const building = this.grid.getBuilding(buildingId);
    if (!building) return false;

    // Remove from grid
    this.grid.removeBuilding(buildingId);

    // Remove from spatial
    this.spatial.removeBuilding(buildingId);

    // Remove effects
    this.buildingEffect.unregisterBuildingEffects(buildingId);

    // Remove work slots
    this.npcAssignment.unregisterBuilding(buildingId);

    // Remove from territory
    this.territoryManager.removeBuildingFromTerritory(buildingId);

    // Unassign NPCs
    const npcs = this.npcAssignment.getNPCsInBuilding(buildingId);
    for (const npcId of npcs) {
      this.npcManager.unassignNPC(npcId);
    }

    // Update game state immediately for UI reactivity
    this._updateGameState();

    return true;
  }

  /**
   * Spawn NPC
   * @param {string} role - NPC role
   * @param {Object} position - Starting position
   * @returns {Object} Result object with success status
   */
  spawnNPC(role, position) {
    try {
      const result = this.npcManager.spawnNPC(role, position);

      if (!result.success) {
        return { success: false, message: result.error || 'Failed to spawn NPC' };
      }

      // townManager.spawnNPC is already called by npcManager.spawnNPC
      // so we don't need to call it again here
      this.consumption.registerNPC(result.npcId, false);

      // Phase 3A: Register NPC with needs tracker
      if (this.npcNeedsTracker) {
        this.npcNeedsTracker.registerNPC(result.npcId, {
          food: 100,
          rest: 100,
          social: 50,
          shelter: 100
        });
      }

      // Update game state immediately for UI reactivity
      this._updateGameState();

      return {
        success: true,
        npcId: result.npcId,
        npc: result.npc
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Assign NPC to building
   * @param {string} npcId - NPC ID
   * @param {string} buildingId - Building ID
   * @returns {Object} Result object with success status
   */
  assignNPC(npcId, buildingId) {
    try {
      // Update buildings map to ensure we have latest building positions
      this.npcManager.updateBuildingsMap(this.gameState.buildings);

      // assignNPC returns boolean, wrap in result object
      const assigned = this.npcAssignment.assignNPC(npcId, buildingId);
      const result = { success: assigned };

      if (result.success) {
        // Set NPC movement to the building (this triggers movement)
        this.npcManager.assignNPC(npcId, buildingId);

        // Update ConsumptionSystem to mark NPC as working
        this.consumption.setNPCWorking(npcId, true);

        // Update game state immediately for UI reactivity
        this._updateGameState();
      }

      return result;
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Unassign NPC from building
   * @param {string} npcId - NPC ID
   * @returns {Object} Result object with success status
   */
  unassignNPC(npcId) {
    try {
      const wasUnassigned = this.npcAssignment.unassignNPC(npcId);

      // Clear NPC movement state (stops moving to building)
      this.npcManager.unassignNPC(npcId);

      // Update ConsumptionSystem to mark NPC as idle
      this.consumption.setNPCWorking(npcId, false);

      // Update game state immediately for UI reactivity
      this._updateGameState();

      return { success: wasUnassigned };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Alias for assignNPC - for backward compatibility with existing code
   * @param {string} npcId - NPC ID
   * @param {string} buildingId - Building ID
   * @returns {Object} Result object with success status
   */
  assignNPCToBuilding(npcId, buildingId) {
    return this.assignNPC(npcId, buildingId);
  }

  /**
   * Auto-assign idle NPCs to buildings
   * @returns {Object} Result object with success status and count
   */
  autoAssignNPCs() {
    try {
      // Update buildings map first to ensure we have latest building positions
      this.npcManager.updateBuildingsMap(this.gameState.buildings);

      let assignedCount = 0;

      // Get all idle NPCs (not currently assigned)
      const allNPCs = Array.from(this.npcManager.npcs.values());
      const idleNPCs = allNPCs.filter(npc => {
        const assignment = this.npcAssignment.getAssignment(npc.id);
        return npc.alive && !assignment;
      });

      // Get buildings with available slots
      const buildingsWithSlots = this.npcAssignment.getBuildingsWithAvailableSlots();

      // Sort buildings by most available slots first (prioritize understaffed buildings)
      buildingsWithSlots.sort((a, b) => b.availableSlots - a.availableSlots);

      // Assign idle NPCs to buildings with available slots
      for (const npc of idleNPCs) {
        if (buildingsWithSlots.length === 0) break;

        // Find the building with most available slots
        const targetBuilding = buildingsWithSlots[0];

        // Try to assign the NPC (this handles the data structure)
        const assigned = this.npcAssignment.assignNPC(npc.id, targetBuilding.buildingId);

        if (assigned) {
          assignedCount++;

          // Set NPC movement to the building (this triggers movement)
          this.npcManager.assignNPC(npc.id, targetBuilding.buildingId);

          // Update NPC state
          this.npcManager.moveToWorking(npc.id);

          // Update consumption system
          this.consumption.setNPCWorking(npc.id, true);

          // Update available slots count
          targetBuilding.availableSlots--;

          // Remove building from list if full
          if (targetBuilding.availableSlots <= 0) {
            buildingsWithSlots.shift();
          }
        }
      }

      // Update game state immediately for UI reactivity
      this._updateGameState();

      return { success: true, assignedCount };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Pause game
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume game
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Get game statistics
   */
  getStatistics() {
    return {
      tick: this.tickCount,
      currentTier: this.gameState.currentTier,
      paused: this.isPaused,
      buildings: this.gameState.buildings.length,
      npcs: this.npcManager.getStatistics(),
      storage: this.storage.getStatus(),
      morale: this.morale.getMoraleState(),
      population: this.townManager.getStatistics(this.gameState.buildings),
      performance: this.tickMetrics
    };
  }

  /**
   * Get game state
   */
  getGameState() {
    return { ...this.gameState };
  }

  /**
   * Add resources to storage
   * @param {Object} resources - Resources to add {food, wood, stone, gold, etc.}
   */
  addResources(resources) {
    if (!resources || typeof resources !== 'object') {
      return { success: false, message: 'Invalid resources object' };
    }

    for (const [resource, amount] of Object.entries(resources)) {
      if (amount > 0) {
        this.storage.addResource(resource, amount);
      }
    }

    return { success: true };
  }

  /**
   * Validate building placement without actually placing
   * @param {Object} building - Building to validate
   * @returns {Object} Validation result
   */
  validateBuildingPlacement(building) {
    if (!building || !building.type || !building.position) {
      return { success: false, message: 'Building missing required fields' };
    }

    // Check if position is within grid bounds
    const gridSize = this.grid.gridSize || 128;
    const { x, z } = building.position;
    if (x < 0 || x >= gridSize || z < 0 || z >= gridSize) {
      return { success: false, message: 'Position out of bounds' };
    }

    // Check if position is occupied
    const occupied = this.grid.isPositionOccupied(building.position);
    if (occupied) {
      return { success: false, message: 'Position already occupied' };
    }

    return { success: true };
  }

  /**
   * Process building construction (checks resources and places building)
   * @param {Object} buildingRequest - Building construction request
   * @returns {Object} Construction result
   */
  async processBuildingConstruction(buildingRequest) {
    if (!buildingRequest || !buildingRequest.type) {
      return { success: false, message: 'Invalid building request' };
    }

    // Validate building type
    let config;
    try {
      config = this.buildingConfig.getConfig(buildingRequest.type);
      if (!config) {
        return { success: false, message: `Unknown building type: ${buildingRequest.type}` };
      }
    } catch (err) {
      return { success: false, message: `BuildingConfig error: ${err.message}` };
    }

    // Create building object
    const building = {
      id: buildingRequest.id || `${buildingRequest.type.toLowerCase()}_${Date.now()}`,
      type: buildingRequest.type,
      position: buildingRequest.position || { x: 0, y: 0, z: 0 },
      tier: buildingRequest.tier || this.gameState.currentTier,
      state: 'CONSTRUCTION',
      constructionProgress: 0
    };

    // Place the building using existing placeBuilding method
    const result = this.placeBuilding(building);

    return result;
  }

  // ============================================
  // PHASE 3D: TUTORIAL SYSTEM HELPER METHODS
  // ============================================

  /**
   * Build game state object for tutorial system
   * @private
   * @returns {Object} Tutorial-specific game state
   */
  _buildTutorialGameState() {
    return {
      // Track actions (set by notification methods)
      buildingPlaced: this._lastBuildingPlaced || null,
      buttonClicked: this._lastButtonClicked || null,
      npcSpawned: this._lastNPCSpawned || false,
      npcAssigned: this._lastNPCAssigned || false,
      territoryExpanded: this._lastTerritoryExpanded || false,

      // Clear one-time flags after reading
      _clear: () => {
        this._lastBuildingPlaced = null;
        this._lastButtonClicked = null;
        this._lastNPCSpawned = false;
        this._lastNPCAssigned = false;
        this._lastTerritoryExpanded = false;
      }
    };
  }

  /**
   * Build game state object for context help system
   * @private
   * @returns {Object} Context help game state
   */
  _buildHelpGameState() {
    const stats = this.npcManager.getStatistics();
    const storage = this.storage.getStatus();

    return {
      // Building tracking
      buildingPlacementFailed: this._buildingPlacementFailed || false,
      buildingsPlaced: this.gameState.buildings.length,
      emptyBuildings: this._getEmptyBuildingsCount(),
      buildingDamaged: this._buildingDamaged || false,
      buildingPlaced: this._lastBuildingPlaced || null,

      // Resource tracking
      food: this.storage.getResource('food'),
      wood: this.storage.getResource('wood'),
      stone: this.storage.getResource('stone'),
      gold: this.storage.getResource('gold'),
      essence: this.storage.getResource('essence'),
      storagePercentage: storage.percentFull,

      // NPC tracking
      npcCount: stats.alive,
      idleNPCCount: stats.idle || 0,
      npcSpawnAttempted: this._npcSpawnAttempted || false,
      housingCapacity: this.townManager.calculateHousingCapacity(this.gameState.buildings),
      npcDied: this._npcDied || false,
      morale: this.gameState.morale,

      // Tier and progression
      currentTier: this.gameState.currentTier,
      tierGateCheckFailed: this._tierGateCheckFailed || false,
      tierAdvanced: this._tierAdvanced || false,

      // Territory
      territoryExpansionAttempted: this._territoryExpansionAttempted || false,

      // Events and achievements
      disasterOccurred: this._disasterOccurred || false,
      lastDisaster: this._lastDisaster || null,
      eventsExperienced: this._eventsExperienced || 0,
      achievementUnlocked: this._achievementUnlocked || false,

      // Game progress
      tickCount: this.tickCount
    };
  }

  /**
   * Build game state object for feature unlock system
   * @private
   * @returns {Object} Feature unlock game state
   */
  _buildUnlockGameState() {
    return {
      tutorialStarted: this.tutorialSystem?.flowManager.isActive || false,
      tutorialStepCompleted: this._lastTutorialStepCompleted || null,
      tutorialCompleted: this.tutorialSystem?.hasCompletedTutorial || false,
      currentTier: this.gameState.currentTier,
      achievementUnlocked: this._lastAchievementUnlocked || null,
      buildingsPlaced: this.gameState.buildings.length
    };
  }

  /**
   * Get count of empty buildings (with available NPC slots)
   * @private
   */
  _getEmptyBuildingsCount() {
    const buildingsWithSlots = this.npcAssignment.getBuildingsWithAvailableSlots();
    return buildingsWithSlots.length;
  }

  /**
   * Notify tutorial system of building placement
   * @param {Object} building - Placed building
   */
  notifyBuildingPlaced(building) {
    this._lastBuildingPlaced = building;

    if (this.tutorialSystem) {
      this.tutorialSystem.notifyAction('buildingPlaced', building);
    }
  }

  /**
   * Notify tutorial system of building placement failure
   */
  notifyBuildingPlacementFailed() {
    this._buildingPlacementFailed = true;
  }

  /**
   * Notify tutorial system of button click
   * @param {string} buttonId - Button identifier
   */
  notifyButtonClicked(buttonId) {
    this._lastButtonClicked = buttonId;

    if (this.tutorialSystem) {
      this.tutorialSystem.notifyAction('buttonClicked', buttonId);
    }
  }

  /**
   * Notify tutorial system of NPC spawn
   */
  notifyNPCSpawned() {
    this._lastNPCSpawned = true;
    this._npcSpawnAttempted = true;

    if (this.tutorialSystem) {
      this.tutorialSystem.notifyAction('npcSpawned', true);
    }
  }

  /**
   * Notify tutorial system of NPC assignment
   */
  notifyNPCAssigned() {
    this._lastNPCAssigned = true;

    if (this.tutorialSystem) {
      this.tutorialSystem.notifyAction('npcAssigned', true);
    }
  }

  /**
   * Notify tutorial system of territory expansion
   */
  notifyTerritoryExpanded() {
    this._lastTerritoryExpanded = true;
    this._territoryExpansionAttempted = true;

    if (this.tutorialSystem) {
      this.tutorialSystem.notifyAction('territoryExpanded', true);
    }
  }

  /**
   * Notify of tutorial step completion
   * @param {string} stepId - Completed step ID
   */
  notifyTutorialStepCompleted(stepId) {
    this._lastTutorialStepCompleted = stepId;
  }

  /**
   * Notify of building damage
   */
  notifyBuildingDamaged() {
    this._buildingDamaged = true;
  }

  /**
   * Notify of NPC death
   */
  notifyNPCDied() {
    this._npcDied = true;
  }

  /**
   * Notify of tier gate check failure
   */
  notifyTierGateCheckFailed() {
    this._tierGateCheckFailed = true;
  }

  /**
   * Notify of tier advancement
   * @param {string} newTier - New tier reached
   */
  notifyTierAdvanced(newTier) {
    this._tierAdvanced = true;
    this.gameState.currentTier = newTier;
  }

  /**
   * Notify of disaster event
   * @param {string} disasterType - Type of disaster
   */
  notifyDisasterOccurred(disasterType) {
    this._disasterOccurred = true;
    this._lastDisaster = disasterType;
    this._eventsExperienced = (this._eventsExperienced || 0) + 1;
  }

  /**
   * Notify of achievement unlock
   * @param {string} achievementId - Achievement ID
   */
  notifyAchievementUnlocked(achievementId) {
    this._achievementUnlocked = true;
    this._lastAchievementUnlocked = achievementId;
  }

  /**
   * Apply achievement reward bonuses
   * @private
   * @param {Object} rewardData - Reward data from achievement system
   */
  _applyAchievementReward(rewardData) {
    const { rewardType, rewardValue, achievementId, achievementName } = rewardData;
    const displayName = achievementName || achievementId || 'Unknown';

    if (rewardType === 'multiplier') {
      for (const [key, bonus] of Object.entries(rewardValue)) {
        if (key in this.achievementBonuses) {
          this.achievementBonuses[key] += bonus;
          // eslint-disable-next-line no-console
          console.log(
            `🏆 Achievement "${displayName}" bonus applied: ` +
            `${key} +${(bonus * 100).toFixed(1)}% ` +
            `(total: ${((this.achievementBonuses[key] - 1) * 100).toFixed(1)}%)`
          );
        }
      }
    }
    // Other reward types (unlock, cosmetic) are handled by UI
  }

  /**
   * Get total achievement multiplier for a resource or stat type
   * @param {string} type - Resource/stat type
   * @returns {number} Total multiplier (1.0 = no bonus)
   */
  getAchievementMultiplier(type) {
    // For specific resource types (food, wood, stone, etc.), use their specific bonus
    // For general 'production', use the production bonus
    // This avoids double-applying the production bonus
    if (type && type !== 'production' && type in this.achievementBonuses) {
      // For specific resources: general production bonus * specific resource bonus
      return (this.achievementBonuses.production || 1.0) * (this.achievementBonuses[type] || 1.0);
    }

    // For 'production' type, just return the production bonus (avoid double-applying)
    return this.achievementBonuses.production || 1.0;
  }

  /**
   * Calculate production bonus from NPC combat stats
   * Veterans and high-level NPCs provide production bonuses
   * @private
   * @param {Object} npcAssignments - Map of building IDs to assigned NPCs
   * @returns {number} Production bonus multiplier (0.0 - 1.0)
   */
  _calculateCombatProductionBonus(npcAssignments) {
    if (!this.npcManager || !this.npcSkillSystem) {
      return 0;
    }

    let totalBonus = 0;
    let npcCount = 0;

    for (const npcIds of Object.values(npcAssignments)) {
      for (const npcId of npcIds) {
        const npc = this.npcManager.getNPC(npcId);
        if (!npc || !npc.alive) continue;

        npcCount++;

        // Veteran bonus: +5% production
        if (npc.isVeteran) {
          totalBonus += 0.05;
        }

        // Combat level bonus: +1% per 2 levels
        if (npc.combatLevel) {
          totalBonus += (npc.combatLevel * 0.005);
        }

        // High skill bonus: +2% if any combat skill > 50
        if (npc.skills_combat) {
          const hasHighSkill = Object.values(npc.skills_combat).some(level => level > 50);
          if (hasHighSkill) {
            totalBonus += 0.02;
          }
        }
      }
    }

    // Average bonus across all working NPCs (max 15% total)
    const averageBonus = npcCount > 0 ? totalBonus / npcCount : 0;
    return Math.min(0.15, averageBonus);
  }
}

export default ModuleOrchestrator;
