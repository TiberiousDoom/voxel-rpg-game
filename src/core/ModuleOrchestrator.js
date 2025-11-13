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
      morale: 0
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

    for (const module of required) {
      if (!modules[module]) {
        throw new Error(`ModuleOrchestrator missing required module: ${module}`);
      }
    }
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
        moraleMultiplier
      );

      result.production = productionResult.production;

      // ============================================
      // STEP 2: CONSUMPTION PHASE
      // ============================================
      const foodBefore = this.storage.getResource('food');
      const consumptionResult = this.consumption.executeConsumptionTick(foodBefore);

      const foodConsumed = parseFloat(consumptionResult.foodConsumed) || 0;
      // Only remove food if there's actual consumption
      if (foodConsumed > 0) {
        this.storage.removeResource('food', foodConsumed);
      }
      result.consumption = foodConsumed;

      // Check for starvation
      if (consumptionResult.starvationOccurred) {
        for (const npcId of (consumptionResult.npcKilled || [])) {
          this.npcManager.killNPC(npcId);
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

      this.morale.calculateTownMorale({
        npcs: aliveNPCs,
        foodAvailable: this.storage.getResource('food'),
        housingCapacity: housing,
        expansionCount: territoryCount - 1, // First territory doesn't count
        buildingBonus: buildingMoraleBonus
      });

      result.morale = this.morale.getCurrentMorale();
      result.moraleState = this.morale.getMoraleState();

      // ============================================
      // STEP 4: NPC UPDATES
      // ============================================
      this.npcManager.updateAllNPCs(this.tickCount);

      // ============================================
      // STEP 5: STORAGE OVERFLOW CHECK
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
    this.gameState.storage = this.storage.getStorage();
    this.gameState.morale = this.morale.getCurrentMorale();
    this.gameState.population = this.npcManager.getStatistics();
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

    // Check if player has enough resources
    const cost = config.cost || {};
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
      const result = this.npcAssignment.assignNPCToBuilding(npcId, buildingId);

      if (result.success) {
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
   * Auto-assign idle NPCs to buildings
   * @returns {Object} Result object with success status and count
   */
  autoAssignNPCs() {
    try {
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

        // Try to assign the NPC
        const assigned = this.npcAssignment.assignNPC(npc.id, targetBuilding.buildingId);

        if (assigned) {
          assignedCount++;

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
}

export default ModuleOrchestrator;
