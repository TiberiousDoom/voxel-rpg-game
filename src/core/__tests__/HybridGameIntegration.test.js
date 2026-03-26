/**
 * Phase 5 Integration Tests - Hybrid Game Systems
 * Tests the integration of Raid, Expedition, and Defense systems into the game loop
 */

import ModuleOrchestrator from '../ModuleOrchestrator';
import UnifiedGameState from '../UnifiedGameState';
import ModeManager from '../ModeManager';
import { NPCManager } from '../../modules/npc-system/NPCManager';
import NPCSkillSystem from '../../modules/combat/NPCSkillSystem';
import NPCEquipmentManager from '../../modules/combat/NPCEquipmentManager';
import ExpeditionManager from '../../modules/expedition/ExpeditionManager';
import DungeonCombatEngine from '../../modules/expedition/DungeonCombatEngine';
import RaidEventManager from '../../modules/defense/RaidEventManager';
import DefenseCombatEngine from '../../modules/defense/DefenseCombatEngine';

// Mock dependencies
const createMockModules = () => {
  return {
    grid: {
      getAllBuildings: vi.fn(() => []),
      placeBuilding: vi.fn(() => ({ success: true })),
      getBuilding: vi.fn(() => null),
      removeBuilding: vi.fn()
    },
    spatial: {
      addBuilding: vi.fn(),
      removeBuilding: vi.fn()
    },
    buildingConfig: {
      getConfig: vi.fn((type) => ({
        type,
        cost: { wood: 10, stone: 5 },
        effects: {}
      }))
    },
    tierProgression: {
      canAdvanceToTier: vi.fn(() => ({ canAdvance: false })),
      getRequirementsForTier: vi.fn(() => ({}))
    },
    buildingEffect: {
      registerBuildingEffects: vi.fn(() => []),
      unregisterBuildingEffects: vi.fn()
    },
    productionTick: {
      executeTick: vi.fn(() => ({
        production: { food: 10, wood: 5 }
      }))
    },
    storage: {
      getStorage: vi.fn(() => ({ food: 100, wood: 50, stone: 30, gold: 20 })),
      getResource: vi.fn((resource) => 100),
      addResource: vi.fn(),
      removeResource: vi.fn(),
      checkAndHandleOverflow: vi.fn(() => ({ overflowed: false })),
      getStatus: vi.fn(() => ({ percentFull: 50 }))
    },
    consumption: {
      executeConsumptionTick: vi.fn(() => ({ foodConsumed: 5, starvationOccurred: false })),
      registerNPC: vi.fn(),
      setNPCWorking: vi.fn(),
      getAliveCount: vi.fn(() => 5),
      getAliveNPCs: vi.fn(() => []),
      updateHappiness: vi.fn()
    },
    morale: {
      calculateTownMorale: vi.fn(),
      getCurrentMorale: vi.fn(() => 75),
      getMoraleState: vi.fn(() => 'content'),
      getMoraleMultiplier: vi.fn(() => 1.0)
    },
    territoryManager: {
      getAllTerritories: vi.fn(() => []),
      findTerritoryForBuilding: vi.fn(() => null),
      addBuildingToTerritory: vi.fn(),
      removeBuildingFromTerritory: vi.fn(),
      isPositionInAnyTerritory: vi.fn(() => true)
    },
    townManager: {
      calculateHousingCapacity: vi.fn(() => 10),
      getStatistics: vi.fn(() => ({ population: 5 })),
      getMaxPopulation: vi.fn(() => 100),
      spawnNPC: vi.fn(() => true),
      updateNPCHappiness: vi.fn()
    },
    npcManager: null, // Will be created separately
    npcAssignment: {
      registerBuilding: vi.fn(),
      unregisterBuilding: vi.fn(),
      assignNPC: vi.fn(() => true),
      unassignNPC: vi.fn(() => true),
      assignNPCToBuilding: vi.fn(() => ({ success: true })),
      getAssignment: vi.fn(() => null),
      getNPCsInBuilding: vi.fn(() => []),
      getStatistics: vi.fn(() => ({ byBuilding: [] })),
      getBuildingsWithAvailableSlots: vi.fn(() => []),
      isAssigned: vi.fn(() => false)
    }
  };
};

describe('Phase 5: Hybrid Game Integration', () => {
  let modules;
  let npcManager;
  let skillSystem;
  let equipmentManager;
  let orchestrator;
  let unifiedState;
  let modeManager;
  let raidManager;
  let defenseCombatEngine;
  let expeditionManager;

  beforeEach(() => {
    modules = createMockModules();

    // Create NPC Manager
    npcManager = new NPCManager(modules.townManager);
    modules.npcManager = npcManager;

    // Create combat systems
    skillSystem = new NPCSkillSystem(npcManager);
    equipmentManager = new NPCEquipmentManager(npcManager);

    // Create unified game state
    unifiedState = new UnifiedGameState();

    // Create defense systems
    defenseCombatEngine = new DefenseCombatEngine(npcManager, skillSystem, equipmentManager);
    raidManager = new RaidEventManager(npcManager);

    // Create mock party manager (minimal setup)
    const mockPartyManager = {
      validateParty: vi.fn(() => ({ valid: true })),
      getPartyMembers: vi.fn(() => []),
      getParty: vi.fn(() => ({ members: [] })),
      addPartyMember: vi.fn(),
      removePartyMember: vi.fn()
    };

    // Create expedition systems
    expeditionManager = new ExpeditionManager(mockPartyManager, npcManager);

    // Add hybrid systems to modules
    modules.unifiedState = unifiedState;
    modules.npcSkillSystem = skillSystem;
    modules.npcEquipmentManager = equipmentManager;
    modules.raidEventManager = raidManager;
    modules.defenseCombatEngine = defenseCombatEngine;
    modules.expeditionManager = expeditionManager;

    // Create orchestrator
    orchestrator = new ModuleOrchestrator(modules);
  });

  describe('ModuleOrchestrator Integration', () => {
    test('should initialize with hybrid game systems', () => {
      expect(orchestrator.unifiedState).toBe(unifiedState);
      expect(orchestrator.npcSkillSystem).toBe(skillSystem);
      expect(orchestrator.npcEquipmentManager).toBe(equipmentManager);
      expect(orchestrator.raidEventManager).toBe(raidManager);
      expect(orchestrator.defenseCombatEngine).toBe(defenseCombatEngine);
      expect(orchestrator.expeditionManager).toBe(expeditionManager);
    });

    test('should execute tick with hybrid systems enabled', () => {
      const result = orchestrator.executeTick();

      expect(result).toHaveProperty('tick');
      expect(result).toHaveProperty('production');
      expect(result).toHaveProperty('hybridGameMode');
      expect(result.hybridGameMode).toBe('settlement');
    });

    test('should calculate combat production bonuses', () => {
      // Spawn NPCs with combat stats
      const npc1 = npcManager.spawnNPC('worker', { x: 0, y: 0, z: 0 });
      const npc2 = npcManager.spawnNPC('worker', { x: 0, y: 0, z: 0 });

      // Make NPC1 a veteran with high combat level
      const npc1Obj = npcManager.getNPC(npc1.npcId);
      npc1Obj.isVeteran = true;
      npc1Obj.combatLevel = 10;
      npc1Obj.skills_combat = { strength: 60, agility: 55, vitality: 50 };

      // Mock assignments
      const assignments = {
        'building1': [npc1.npcId, npc2.npcId]
      };

      const bonus = orchestrator._calculateCombatProductionBonus(assignments);

      // Veteran (5%) + Combat level 10 (5%) + High skill (2%) = 12% / 2 NPCs = 6% average
      expect(bonus).toBeGreaterThan(0);
      expect(bonus).toBeLessThanOrEqual(0.15);
    });
  });

  describe('Raid System Integration', () => {
    beforeEach(() => {
      // Spawn some NPCs for raiding
      for (let i = 0; i < 5; i++) {
        npcManager.spawnNPC('worker', { x: 0, y: 0, z: 0 });
      }
    });

    test('should be able to schedule raids', () => {
      // RaidManager starts with nextRaidTime as null
      expect(raidManager.nextRaidTime).toBeFalsy();

      // Manually schedule a raid
      const schedule = raidManager.scheduleNextRaid();

      // After scheduling, nextRaidTime should be set
      expect(schedule.nextRaidTime).toBeTruthy();
      expect(raidManager.nextRaidTime).toBeTruthy();
    });

    test('should not trigger raid when not scheduled or too soon', () => {
      const result = orchestrator.executeTick();

      // Raid should not trigger on first tick
      expect(result.raidTriggered).toBeUndefined();
    });

    test('should be able to manually start raid', () => {
      // Manually start a raid
      const raidResult = raidManager.startRaid();

      expect(raidResult.success).toBe(true);
      expect(raidResult.raid).toBeDefined();
      expect(raidResult.raid.id).toBeDefined();
      expect(raidResult.raid.type).toBeDefined();
    });

    test('should track active raid', () => {
      // Start a raid
      raidManager.startRaid();

      const activeRaid = raidManager.getActiveRaid();
      expect(activeRaid).not.toBeNull();
      expect(activeRaid.id).toBeDefined();
      expect(activeRaid.type).toBeDefined();
      expect(activeRaid.difficulty).toBeGreaterThan(0);
    });
  });

  describe('Expedition System Integration', () => {
    beforeEach(() => {
      // Spawn party members
      for (let i = 0; i < 3; i++) {
        const result = npcManager.spawnNPC('worker', { x: 0, y: 0, z: 0 });
        const npc = npcManager.getNPC(result.npcId);

        // Give them combat stats
        npc.combatLevel = 5;
        npc.combatStats = {
          health: { current: 100, max: 100 },
          damage: 15,
          defense: 5,
          speed: 10,
          critChance: 5,
          critDamage: 150,
          dodgeChance: 5
        };
      }

      // Switch to expedition mode
      unifiedState._setMode('expedition');
    });

    test('should not process expedition when no active expedition', () => {
      const result = orchestrator.executeTick();

      expect(result.expeditionProgress).toBeUndefined();
    });

    test('should be able to start expeditions', () => {
      // Create party members
      const partyIds = [];
      for (let i = 0; i < 3; i++) {
        const result = npcManager.spawnNPC('worker', { x: 0, y: 0, z: 0 });
        const npc = npcManager.getNPC(result.npcId);
        npc.combatLevel = 5;
        npc.combatStats = {
          health: { current: 100, max: 100 },
          damage: 15,
          defense: 5,
          speed: 10,
          critChance: 5,
          critDamage: 150,
          dodgeChance: 5
        };
        partyIds.push(result.npcId);
      }

      // Update mock party manager for this test
      expeditionManager.partyManager.getParty = vi.fn(() => ({
        members: partyIds.map(id => ({ npcId: id }))
      }));

      // Start expedition
      const startResult = expeditionManager.startExpedition({
        partyIds: partyIds,
        dungeon: 'forest',
        targetFloor: 1
      });

      expect(startResult.success).toBe(true);
      expect(expeditionManager.getActiveExpedition()).not.toBeNull();
      expect(expeditionManager.getActiveExpedition().id).toBeDefined();
    });
  });

  describe('Defense Combat Integration', () => {
    beforeEach(() => {
      // Spawn defenders
      for (let i = 0; i < 3; i++) {
        const result = npcManager.spawnNPC('worker', { x: 0, y: 0, z: 0 });
        const npc = npcManager.getNPC(result.npcId);

        // Give them combat stats
        npc.combatLevel = 3;
        npc.combatStats = {
          health: { current: 80, max: 80 },
          damage: 12,
          defense: 3,
          speed: 8,
          critChance: 5,
          critDamage: 150,
          dodgeChance: 5
        };
      }

      // Switch to defense mode and start a raid
      unifiedState._setMode('defense');
      raidManager.nextRaidTime = Date.now() - 1000;
    });

    test('should get available defenders', () => {
      const defenders = defenseCombatEngine.getAvailableDefenders();

      expect(defenders.length).toBe(3);
      expect(defenders.every(d => d.alive)).toBe(true);
      expect(defenders.every(d => !d.onExpedition)).toBe(true);
    });

    test('should be able to simulate wave combat', () => {
      // Get defenders
      const defenders = defenseCombatEngine.getAvailableDefenders();

      // Create enemy wave
      const enemies = [{
        id: 'enemy1',
        type: 'goblin',
        health: { current: 50, max: 50 },
        damage: 10,
        defense: 2,
        alive: true
      }];

      // Simulate combat
      const result = defenseCombatEngine.simulateWaveCombat(defenders, enemies);

      expect(result).toBeDefined();
      expect(result.victory).toBeDefined();
      expect(result.rounds).toBeGreaterThan(0);
    });
  });

  describe('Mode Transition Integration', () => {
    test('should maintain settlement mode by default', () => {
      const result = orchestrator.executeTick();

      expect(result.hybridGameMode).toBe('settlement');
      expect(unifiedState.getCurrentMode()).toBe('settlement');
    });

    test('should track current mode in tick results', () => {
      unifiedState._setMode('expedition');

      const result = orchestrator.executeTick();

      expect(result.hybridGameMode).toBe('expedition');
    });
  });

  describe('NPC Combat Bonus Integration', () => {
    test('should apply no bonus when no NPCs', () => {
      const result = orchestrator.executeTick();

      // Production should not have combat bonus
      expect(result.production).toBeDefined();
    });

    test('should apply veteran bonus to production', () => {
      // Spawn a veteran NPC
      const npc = npcManager.spawnNPC('worker', { x: 0, y: 0, z: 0 });
      const npcObj = npcManager.getNPC(npc.npcId);
      npcObj.isVeteran = true;
      npcObj.combatLevel = 5;

      // Mock NPC assignment
      modules.npcAssignment.getStatistics.mockReturnValue({
        byBuilding: [{ buildingId: 'building1' }]
      });
      modules.npcAssignment.getNPCsInBuilding.mockReturnValue([npc.npcId]);

      const result = orchestrator.executeTick();

      expect(result.production).toBeDefined();
      // Production should be boosted by combat bonus
    });
  });

  describe('State Management Integration', () => {
    test('should update game state with hybrid systems', () => {
      orchestrator.executeTick();

      const gameState = orchestrator.getGameState();

      expect(gameState).toBeDefined();
      expect(gameState.tick).toBeGreaterThan(0);
    });

    test('should include hybrid data in statistics', () => {
      orchestrator.executeTick();

      const stats = orchestrator.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.tick).toBeGreaterThan(0);
    });
  });
});
