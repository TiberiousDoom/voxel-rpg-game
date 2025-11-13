/**
 * GameStateSerializer.js - Serialization layer for complete game state
 *
 * Handles conversion of all 13 modules to JSON format and restoration
 * Supports versioning and migration for save file compatibility
 *
 * Serializes:
 * - Module 1: Foundation (GridManager, SpatialPartitioning)
 * - Module 2: Building Types (BuildingConfig, TierProgression, BuildingEffect)
 * - Module 3: Resource Economy (StorageManager, ConsumptionSystem, MoraleCalculator)
 * - Module 4: Territory & Town (TerritoryManager, TownManager)
 * - NPC System (NPCManager, NPCAssignment)
 * - Engine State (ModuleOrchestrator, GameEngine)
 */

class GameStateSerializer {
  // Current serialization format version
  static VERSION = 1;

  /**
   * Version change log
   */
  static VERSION_HISTORY = {
    1: 'Initial save format with all 13 modules'
  };

  /**
   * Serialize complete game state to JSON object
   * @param {ModuleOrchestrator} orchestrator - Game orchestrator with all modules
   * @param {GameEngine} engine - Game engine
   * @returns {Object} Serialized game state
   */
  static serialize(orchestrator, engine) {
    if (!orchestrator) {
      throw new Error('GameStateSerializer requires ModuleOrchestrator');
    }
    if (!engine) {
      throw new Error('GameStateSerializer requires GameEngine');
    }

    const state = {
      version: this.VERSION,
      timestamp: new Date().toISOString(),
      metadata: {
        gameTick: orchestrator.tickCount,
        currentTier: orchestrator.gameState.currentTier,
        isPaused: orchestrator.isPaused,
        engineRunning: engine.isRunning,
        enginePaused: engine.isPaused
      },

      // Module 1: Foundation
      grid: this._serializeGrid(orchestrator.grid),
      spatial: this._serializeSpatial(orchestrator.spatial),

      // Module 2: Building Types
      tierProgression: this._serializeTierProgression(orchestrator.tierProgression),
      buildingEffect: this._serializeBuildingEffect(orchestrator.buildingEffect),

      // Module 3: Resource Economy
      storage: this._serializeStorage(orchestrator.storage),
      consumption: this._serializeConsumption(orchestrator.consumption),
      morale: this._serializeMorale(orchestrator.morale),

      // Module 4: Territory & Town
      territory: this._serializeTerritory(orchestrator.territoryManager),
      town: this._serializeTown(orchestrator.townManager),

      // NPC System
      npcs: this._serializeNPCs(orchestrator.npcManager),
      npcAssignments: this._serializeNPCAssignments(orchestrator.npcAssignment),

      // Phase 3C: Achievement System
      achievements: orchestrator.achievementSystem ? this._serializeAchievements(orchestrator.achievementSystem) : null,
      // Phase 3B: Event System
      eventSystem: orchestrator.eventSystem ? this._serializeEventSystem(orchestrator.eventSystem) : null,

      // Engine state
      engineState: this._serializeEngineState(orchestrator.gameState, engine)
    };

    return state;
  }

  /**
   * Deserialize game state from JSON and restore all modules
   * @param {Object} data - Serialized game state
   * @param {ModuleOrchestrator} orchestrator - Game orchestrator to restore into
   * @param {GameEngine} engine - Game engine to restore into
   * @returns {Object} {success, errors}
   */
  static deserialize(data, orchestrator, engine) {
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'Invalid save data format'
      };
    }

    const errors = [];

    try {
      // Version check
      if (data.version !== this.VERSION) {
        errors.push(`Save version ${data.version} differs from current ${this.VERSION}`);
        // Don't fail yet - try to migrate/load anyway
      }

      // Restore all modules
      this._deserializeGrid(data.grid, orchestrator.grid, errors);
      this._deserializeSpatial(data.spatial, orchestrator.spatial, errors);
      this._deserializeTierProgression(data.tierProgression, orchestrator.tierProgression, errors);
      this._deserializeBuildingEffect(data.buildingEffect, orchestrator.buildingEffect, errors);
      this._deserializeStorage(data.storage, orchestrator.storage, errors);
      this._deserializeConsumption(data.consumption, orchestrator.consumption, errors);
      this._deserializeMorale(data.morale, orchestrator.morale, errors);
      this._deserializeTerritory(data.territory, orchestrator.territoryManager, errors);
      this._deserializeTown(data.town, orchestrator.townManager, errors);
      this._deserializeNPCs(data.npcs, orchestrator.npcManager, errors);
      this._deserializeNPCAssignments(data.npcAssignments, orchestrator.npcAssignment, errors);
      this._deserializeAchievements(data.achievements, orchestrator.achievementSystem, errors);

      // Phase 3B: Event System
      if (data.eventSystem && orchestrator.eventSystem) {
        this._deserializeEventSystem(data.eventSystem, orchestrator.eventSystem, errors);
      }

      this._deserializeEngineState(data.engineState, orchestrator, engine, errors);

      // Validate consistency
      this._validateConsistency(orchestrator, errors);

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (err) {
      return {
        success: false,
        error: `Deserialization failed: ${err.message}`,
        details: err.stack
      };
    }
  }

  // ============================================
  // GRID SERIALIZATION
  // ============================================

  static _serializeGrid(grid) {
    return {
      buildings: grid.getAllBuildings().map(b => ({
        id: b.id,
        type: b.type,
        position: { ...b.position },
        health: b.health
      })),
      width: grid.width,
      height: grid.height,
      depth: grid.depth
    };
  }

  static _deserializeGrid(data, grid, errors) {
    if (!data || !data.buildings) return;

    try {
      // Clear existing buildings
      grid.grid.clear();
      grid.occupiedCells.clear();

      // Restore buildings
      for (const building of data.buildings) {
        grid.placeBuilding({
          id: building.id,
          type: building.type,
          position: building.position,
          health: building.health
        });
      }
    } catch (err) {
      errors.push(`Grid deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // SPATIAL PARTITIONING SERIALIZATION
  // ============================================

  static _serializeSpatial(spatial) {
    return {
      chunkSize: spatial.chunkSize,
      chunks: spatial.chunks ? Array.from(spatial.chunks.entries()).map(([key, buildingIds]) => ({
        key,
        buildingIds: Array.from(buildingIds)
      })) : [],
      buildingChunks: spatial.buildingChunks ? Array.from(spatial.buildingChunks.entries()).map(([buildingId, chunkKeys]) => ({
        buildingId,
        chunkKeys: Array.from(chunkKeys)
      })) : []
    };
  }

  static _deserializeSpatial(data, spatial, errors) {
    if (!data) return;

    try {
      if (data.chunks) {
        spatial.chunks.clear();
        for (const chunk of data.chunks) {
          spatial.chunks.set(chunk.key, new Set(chunk.buildingIds));
        }
      }

      if (data.buildingChunks) {
        spatial.buildingChunks.clear();
        for (const mapping of data.buildingChunks) {
          spatial.buildingChunks.set(mapping.buildingId, new Set(mapping.chunkKeys));
        }
      }
    } catch (err) {
      errors.push(`Spatial deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // TIER PROGRESSION SERIALIZATION
  // ============================================

  static _serializeTierProgression(tierProgression) {
    return {
      // TierProgression is mostly static config, but track current progression
      placeholder: true
    };
  }

  static _deserializeTierProgression(data, tierProgression, errors) {
    // TierProgression is config-based, nothing to restore
  }

  // ============================================
  // BUILDING EFFECT SERIALIZATION
  // ============================================

  static _serializeBuildingEffect(buildingEffect) {
    return {
      activeEffects: buildingEffect.activeEffects ? Array.from(buildingEffect.activeEffects.entries()).map(([id, effect]) => ({
        id,
        building: effect.building ? { id: effect.building.id, type: effect.building.type } : null,
        type: effect.type,
        strength: effect.strength
      })) : []
    };
  }

  static _deserializeBuildingEffect(data, buildingEffect, errors) {
    if (!data || !data.activeEffects) return;

    try {
      buildingEffect.activeEffects.clear();

      // Restore active effects (will be recomputed when buildings are placed)
      for (const effect of data.activeEffects) {
        buildingEffect.activeEffects.set(effect.id, {
          building: effect.building,
          type: effect.type,
          strength: effect.strength
        });
      }
    } catch (err) {
      errors.push(`BuildingEffect deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // STORAGE SERIALIZATION
  // ============================================

  static _serializeStorage(storage) {
    return {
      storage: { ...storage.getStorage() },
      capacity: storage.capacity,
      overflowPriority: storage.overflowPriority ? [...storage.overflowPriority] : []
    };
  }

  static _deserializeStorage(data, storage, errors) {
    if (!data || !data.storage) return;

    try {
      storage.setResources(data.storage);
      if (data.capacity) {
        storage.capacity = data.capacity;
      }
      if (data.overflowPriority) {
        storage.overflowPriority = [...data.overflowPriority];
      }
    } catch (err) {
      errors.push(`Storage deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // CONSUMPTION SERIALIZATION
  // ============================================

  static _serializeConsumption(consumption) {
    return {
      npcs: consumption.npcs ? Array.from(consumption.npcs.entries()).map(([id, npc]) => ({
        id,
        alive: npc.alive,
        status: npc.status
      })) : [],
      happiness: consumption.happiness,
      foodPerTick: consumption.foodPerTick
    };
  }

  static _deserializeConsumption(data, consumption, errors) {
    if (!data || !data.npcs) return;

    try {
      consumption.npcs.clear();

      for (const npc of data.npcs) {
        consumption.npcs.set(npc.id, {
          alive: npc.alive,
          status: npc.status
        });
      }

      if (data.happiness !== undefined) {
        consumption.happiness = data.happiness;
      }
    } catch (err) {
      errors.push(`Consumption deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // MORALE SERIALIZATION
  // ============================================

  static _serializeMorale(morale) {
    return {
      currentMorale: morale.currentMorale,
      factors: morale.factors ? { ...morale.factors } : {},
      moraleState: morale.moraleState
    };
  }

  static _deserializeMorale(data, morale, errors) {
    if (!data) return;

    try {
      if (data.currentMorale !== undefined) {
        morale.currentMorale = data.currentMorale;
      }
      if (data.factors) {
        morale.factors = { ...data.factors };
      }
      if (data.moraleState) {
        morale.moraleState = data.moraleState;
      }
    } catch (err) {
      errors.push(`Morale deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // TERRITORY SERIALIZATION
  // ============================================

  static _serializeTerritory(territoryManager) {
    const territories = territoryManager.getAllTerritories();
    return {
      territories: territories.map(t => ({
        id: t.id,
        tier: t.tier,
        center: { ...t.center },
        radius: t.radius,
        buildings: [...t.buildings],
        expansionCount: t.expansionCount
      }))
    };
  }

  static _deserializeTerritory(data, territoryManager, errors) {
    if (!data || !data.territories) return;

    try {
      territoryManager.territories.clear();

      for (const terr of data.territories) {
        const territory = {
          id: terr.id,
          tier: terr.tier,
          center: { ...terr.center },
          radius: terr.radius,
          buildings: new Set(terr.buildings),
          expansionCount: terr.expansionCount
        };
        territoryManager.territories.set(terr.id, territory);
      }
    } catch (err) {
      errors.push(`Territory deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // TOWN SERIALIZATION
  // ============================================

  static _serializeTown(townManager) {
    return {
      npcs: townManager.npcs ? Array.from(townManager.npcs.entries()).map(([id, count]) => ({ id, count })) : [],
      buildingAssignments: townManager.buildingAssignments ? Array.from(townManager.buildingAssignments.entries()).map(([building, npcs]) => ({
        building,
        npcs: [...npcs]
      })) : [],
      happiness: townManager.happiness
    };
  }

  static _deserializeTown(data, townManager, errors) {
    if (!data) return;

    try {
      if (data.npcs) {
        townManager.npcs.clear();
        for (const npc of data.npcs) {
          townManager.npcs.set(npc.id, npc.count);
        }
      }

      if (data.buildingAssignments) {
        townManager.buildingAssignments.clear();
        for (const assign of data.buildingAssignments) {
          townManager.buildingAssignments.set(assign.building, new Set(assign.npcs));
        }
      }

      if (data.happiness !== undefined) {
        townManager.happiness = data.happiness;
      }
    } catch (err) {
      errors.push(`Town deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // NPC SERIALIZATION
  // ============================================

  static _serializeNPCs(npcManager) {
    const npcs = npcManager.getAllNPCStates();
    return {
      npcs: npcs.map(npc => ({
        id: npc.id,
        name: npc.name,
        role: npc.role,
        alive: npc.alive,
        health: npc.health,
        happiness: npc.happiness,
        morale: npc.morale,
        position: npc.position ? { ...npc.position } : null,
        skills: npc.skills ? { ...npc.skills } : {},
        assignedBuilding: npc.assignedBuilding,
        status: npc.status
      })),
      totalSpawned: npcManager.stats?.totalSpawned || 0,
      nextId: npcManager.npcIdCounter || 0
    };
  }

  static _deserializeNPCs(data, npcManager, errors) {
    if (!data || !data.npcs) return;

    try {
      npcManager.npcs.clear();

      for (const npc of data.npcs) {
        npcManager.npcs.set(npc.id, {
          id: npc.id,
          name: npc.name,
          role: npc.role,
          alive: npc.alive,
          health: npc.health,
          happiness: npc.happiness,
          morale: npc.morale,
          position: npc.position,
          skills: { ...npc.skills },
          assignedBuilding: npc.assignedBuilding,
          status: npc.status
        });
      }

      if (data.totalSpawned !== undefined) {
        npcManager.stats.totalSpawned = data.totalSpawned;
      }
      if (data.nextId !== undefined) {
        npcManager.npcIdCounter = data.nextId;
      }
    } catch (err) {
      errors.push(`NPC deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // NPC ASSIGNMENT SERIALIZATION
  // ============================================

  static _serializeNPCAssignments(npcAssignment) {
    return {
      npcAssignments: npcAssignment.npcAssignments ? Array.from(npcAssignment.npcAssignments.entries()).map(([id, assignment]) => ({
        id,
        buildingId: assignment.buildingId,
        slotId: assignment.slotId
      })) : [],
      slots: npcAssignment.slots ? Array.from(npcAssignment.slots.entries()).map(([buildingId, slots]) => ({
        buildingId,
        slots: slots.map(s => ({ slotId: s.slotId, assignedNPC: s.assignedNPC }))
      })) : []
    };
  }

  static _deserializeNPCAssignments(data, npcAssignment, errors) {
    if (!data) return;

    try {
      if (data.npcAssignments) {
        npcAssignment.npcAssignments.clear();
        for (const assign of data.npcAssignments) {
          npcAssignment.npcAssignments.set(assign.id, {
            building: assign.building,
            slot: assign.slot
          });
        }
      }

      if (data.buildingSlots) {
        npcAssignment.buildingSlots.clear();
        for (const building of data.buildingSlots) {
          const slots = building.slots.map(s => ({
            id: s.id,
            occupied: s.occupied,
            npcId: s.npcId
          }));
          npcAssignment.buildingSlots.set(building.building, slots);
        }
      }
    } catch (err) {
      errors.push(`NPC Assignment deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // PHASE 3C: ACHIEVEMENT SYSTEM SERIALIZATION
  // ============================================

  static _serializeAchievements(achievementSystem) {
    return achievementSystem.serialize();
  }

  static _deserializeAchievements(data, achievementSystem, errors) {
    if (!data || !achievementSystem) return;

    try {
      achievementSystem.deserialize(data);
    } catch (err) {
      errors.push(`Achievement system deserialization error: ${err.message}`);
  // EVENT SYSTEM SERIALIZATION (Phase 3B)
  // ============================================

  static _serializeEventSystem(eventSystem) {
    return {
      stats: eventSystem.stats,
      eventHistory: eventSystem.eventHistory,
      scheduler: eventSystem.scheduler.serialize(),
      // Note: We don't serialize active events or queue - they will restart on load
      activeEventCount: eventSystem.activeEvents.length,
      queuedEventCount: eventSystem.eventQueue.length
    };
  }

  static _deserializeEventSystem(data, eventSystem, errors) {
    if (!data) return;

    try {
      // Restore stats
      if (data.stats) {
        eventSystem.stats = { ...data.stats };
      }

      // Restore event history
      if (data.eventHistory) {
        eventSystem.eventHistory = [...data.eventHistory];
      }

      // Restore scheduler state
      if (data.scheduler) {
        eventSystem.scheduler.deserialize(data.scheduler);
      }

      // Note: Active events and queue are not restored
      // Events will naturally trigger again based on scheduler state
    } catch (err) {
      errors.push(`Event System deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // ENGINE STATE SERIALIZATION
  // ============================================

  static _serializeEngineState(gameState, engine) {
    return {
      currentTier: gameState.currentTier,
      buildings: gameState.buildings ? [...gameState.buildings] : [],
      npcs: gameState.npcs ? [...gameState.npcs] : [],
      storage: gameState.storage ? { ...gameState.storage } : {},
      morale: gameState.morale,
      tick: gameState.tick,
      frameCount: engine.frameCount,
      ticksElapsed: engine.ticksElapsed
    };
  }

  static _deserializeEngineState(data, orchestrator, engine, errors) {
    if (!data) return;

    try {
      if (data.currentTier) {
        orchestrator.gameState.currentTier = data.currentTier;
      }
      if (data.tick !== undefined) {
        orchestrator.tickCount = data.tick;
      }
    } catch (err) {
      errors.push(`Engine state deserialization error: ${err.message}`);
    }
  }

  // ============================================
  // CONSISTENCY VALIDATION
  // ============================================

  static _validateConsistency(orchestrator, errors) {
    try {
      // Validate building count
      const buildings = orchestrator.grid.getAllBuildings();
      const npcStats = orchestrator.npcManager.getStatistics();

      // Basic sanity checks
      if (!Array.isArray(buildings)) {
        errors.push('Invalid building list after deserialization');
      }

      if (npcStats.aliveCount < 0 || npcStats.totalSpawned < npcStats.aliveCount) {
        errors.push('Inconsistent NPC counts after deserialization');
      }

      // Validate storage
      const storage = orchestrator.storage.getStorage();
      for (const [resource, amount] of Object.entries(storage)) {
        if (typeof amount !== 'number' || amount < 0) {
          errors.push(`Invalid storage value for ${resource}: ${amount}`);
        }
      }
    } catch (err) {
      errors.push(`Consistency validation error: ${err.message}`);
    }
  }

  /**
   * Get serialization version
   * @returns {number} Current version
   */
  static getVersion() {
    return this.VERSION;
  }

  /**
   * Get version history
   * @returns {Object} Version history with descriptions
   */
  static getVersionHistory() {
    return this.VERSION_HISTORY;
  }
}

export default GameStateSerializer;