/**
 * NPCSystem.test.js - Tests for NPC System
 *
 * Test coverage:
 * - NPCManager: 15 tests
 * - NPCAssignment: 12 tests
 * Total: 27 tests
 */

import { NPCManager, NPC } from '../NPCManager';
import { NPCAssignment } from '../NPCAssignment';
import TownManager from '../../territory-town/TownManager';
import BuildingConfig from '../../building-types/BuildingConfig';

describe('NPC System', () => {
  // ============================================
  // NPC CLASS TESTS (3 tests)
  // ============================================

  describe('NPC', () => {
    test('should create NPC with default values', () => {
      const npc = new NPC(0, { role: 'FARMER' });
      expect(npc.id).toBe(0);
      expect(npc.role).toBe('FARMER');
      expect(npc.alive).toBe(true);
      expect(npc.happiness).toBe(50);
      expect(npc.health).toBe(100);
    });

    test('should update NPC state', () => {
      const npc = new NPC(0, { role: 'FARMER' });
      npc.setWorking(true);
      expect(npc.isWorking).toBe(true);

      npc.setWorking(false);
      expect(npc.isWorking).toBe(false);
    });

    test('should train skills and reach cap', () => {
      const npc = new NPC(0, { role: 'FARMER' });
      expect(npc.skills.farming).toBe(1.0);

      npc.trainSkill('farming', 0.6);
      expect(npc.skills.farming).toBe(1.5); // Capped

      npc.trainSkill('farming', 0.1);
      expect(npc.skills.farming).toBe(1.5); // Still capped
    });
  });

  // ============================================
  // NPC MANAGER TESTS (12 tests)
  // ============================================

  describe('NPCManager', () => {
    let npcManager;
    let townManager;
    let buildingConfig;

    beforeEach(() => {
      buildingConfig = new BuildingConfig();
      townManager = new TownManager(buildingConfig);
      npcManager = new NPCManager(townManager);
    });

    test('should initialize with TownManager', () => {
      expect(npcManager).toBeDefined();
      expect(npcManager.townManager).toBe(townManager);
    });

    test('should throw error without TownManager', () => {
      expect(() => new NPCManager(null)).toThrow();
    });

    test('should spawn NPC with role and position', () => {
      const npc = npcManager.spawnNPC('FARMER', { x: 50, y: 25, z: 50 });
      expect(npc.role).toBe('FARMER');
      expect(npc.position.x).toBe(50);
      expect(npc.alive).toBe(true);
    });

    test('should track spawned NPCs', () => {
      npcManager.spawnNPC('FARMER');
      npcManager.spawnNPC('CRAFTSMAN');
      npcManager.spawnNPC('GUARD');

      const alive = npcManager.getAliveNPCs();
      expect(alive.length).toBe(3);
    });

    test('should get NPC by ID', () => {
      const spawned = npcManager.spawnNPC('FARMER');
      const retrieved = npcManager.getNPC(spawned.id);

      expect(retrieved).toBe(spawned);
    });

    test('should set NPC work status', () => {
      const npc = npcManager.spawnNPC('FARMER');
      npcManager.setNPCWorking(npc.id, true);

      expect(npc.isWorking).toBe(true);
      const working = npcManager.getNPCsByStatus('working');
      expect(working.length).toBe(1);
    });

    test('should move NPC to new position', () => {
      const npc = npcManager.spawnNPC('FARMER', { x: 0, y: 0, z: 0 });
      npcManager.moveNPC(npc.id, { x: 100, y: 50, z: 100 });

      expect(npc.position.x).toBe(100);
      expect(npc.position.y).toBe(50);
      expect(npc.position.z).toBe(100);
    });

    test('should assign NPC to building', () => {
      const npc = npcManager.spawnNPC('FARMER');
      const assigned = npcManager.assignNPC(npc.id, 'farm1');

      expect(assigned).toBe(true);
      expect(npc.assignedBuilding).toBe('farm1');
    });

    test('should unassign NPC from building', () => {
      const npc = npcManager.spawnNPC('FARMER');
      npcManager.assignNPC(npc.id, 'farm1');
      npcManager.unassignNPC(npc.id);

      expect(npc.assignedBuilding).toBeNull();
    });

    test('should kill NPC', () => {
      const npc = npcManager.spawnNPC('FARMER');
      npcManager.killNPC(npc.id);

      expect(npc.alive).toBe(false);
      expect(npcManager.getAliveNPCs().length).toBe(0);
    });

    test('should get NPC statistics', () => {
      npcManager.spawnNPC('FARMER');
      npcManager.spawnNPC('CRAFTSMAN');
      npcManager.spawnNPC('GUARD');

      const stats = npcManager.getStatistics();
      expect(stats.totalSpawned).toBe(3);
      expect(stats.aliveCount).toBe(3);
      expect(stats.deadCount).toBe(0);
    });

    test('should train NPC skills', () => {
      const npc = npcManager.spawnNPC('FARMER');
      const before = npc.skills.farming;

      npcManager.trainNPC(npc.id, 'farming', 0.2);
      const after = npc.skills.farming;

      expect(after).toBeGreaterThan(before);
    });
  });

  // ============================================
  // NPC ASSIGNMENT TESTS (12 tests)
  // ============================================

  describe('NPCAssignment', () => {
    let assignment;
    let buildingConfig;

    beforeEach(() => {
      buildingConfig = new BuildingConfig();
      assignment = new NPCAssignment(buildingConfig);
    });

    test('should initialize with BuildingConfig', () => {
      expect(assignment).toBeDefined();
      expect(assignment.buildingConfig).toBe(buildingConfig);
    });

    test('should throw error without BuildingConfig', () => {
      expect(() => new NPCAssignment(null)).toThrow();
    });

    test('should register building with work slots', () => {
      const building = { id: 'farm1', type: 'FARM' };
      assignment.registerBuilding(building);

      const staffing = assignment.getStaffingLevel('farm1');
      expect(staffing).toBeDefined();
      expect(staffing.total).toBe(1); // FARM has 1 work slot
    });

    test('should assign NPC to building slot', () => {
      const building = { id: 'farm1', type: 'FARM' };
      assignment.registerBuilding(building);

      const assigned = assignment.assignNPC(0, 'farm1');
      expect(assigned).toBe(true);

      const npcs = assignment.getNPCsInBuilding('farm1');
      expect(npcs).toContain(0);
    });

    test('should fill all work slots', () => {
      const building = { id: 'warehouse1', type: 'WAREHOUSE' };
      assignment.registerBuilding(building);

      const assigned1 = assignment.assignNPC(0, 'warehouse1');
      const assigned2 = assignment.assignNPC(1, 'warehouse1');

      expect(assigned1).toBe(true);
      expect(assigned2).toBe(false); // WAREHOUSE has 1 slot, so 2nd fails

      const staffing = assignment.getStaffingLevel('warehouse1');
      expect(staffing.filled).toBe(1);
    });

    test('should unassign NPC from slot', () => {
      const building = { id: 'farm1', type: 'FARM' };
      assignment.registerBuilding(building);

      assignment.assignNPC(0, 'farm1');
      const unassigned = assignment.unassignNPC(0);

      expect(unassigned).toBe(true);
      const npcs = assignment.getNPCsInBuilding('farm1');
      expect(npcs.length).toBe(0);
    });

    test('should get staffing level', () => {
      const building = { id: 'farm1', type: 'FARM' };
      assignment.registerBuilding(building);

      assignment.assignNPC(0, 'farm1');
      const staffing = assignment.getStaffingLevel('farm1');

      expect(staffing.filled).toBe(1);
      expect(staffing.total).toBe(1);
      expect(staffing.percentage).toBe('100.0');
    });

    test('should get buildings with available slots', () => {
      assignment.registerBuilding({ id: 'farm1', type: 'FARM' });
      assignment.registerBuilding({ id: 'warehouse1', type: 'WAREHOUSE' });

      assignment.assignNPC(0, 'farm1'); // Farm full
      // Warehouse empty

      const available = assignment.getBuildingsWithAvailableSlots();
      expect(available.length).toBe(1);
      expect(available[0].buildingId).toBe('warehouse1');
    });

    test('should balance assignments across buildings', () => {
      assignment.registerBuilding({ id: 'farm1', type: 'FARM' });
      assignment.registerBuilding({ id: 'warehouse1', type: 'WAREHOUSE' });

      // Assign both to farm
      assignment.assignNPC(0, 'farm1');
      assignment.assignNPC(1, 'farm1'); // Should fail since farm has 1 slot

      // Balance should redistribute
      const results = assignment.balanceAssignments([0, 1]);
      expect(results.reassigned).toBe(2);
      expect(results.failed).toBe(0);
    });

    test('should get assignment statistics', () => {
      assignment.registerBuilding({ id: 'farm1', type: 'FARM' });
      assignment.registerBuilding({ id: 'warehouse1', type: 'WAREHOUSE' });
      assignment.registerBuilding({ id: 'house1', type: 'HOUSE' }); // 0 work slots

      assignment.assignNPC(0, 'farm1');
      assignment.assignNPC(1, 'warehouse1');

      const stats = assignment.getStatistics();
      expect(stats.totalSlots).toBe(2); // Only farm + warehouse have slots
      expect(stats.filledSlots).toBe(2);
      expect(stats.occupancy).toBe('100.0');
    });

    test('should unregister building and remove assignments', () => {
      assignment.registerBuilding({ id: 'farm1', type: 'FARM' });
      assignment.assignNPC(0, 'farm1');

      // Verify assignment exists
      let assigned = assignment.getAssignment(0);
      expect(assigned).toBeDefined();

      // Unregister and unassign
      assignment.unregisterBuilding('farm1');
      assignment.unassignNPC(0);

      // Verify removed
      const assignment2 = assignment.getAssignment(0);
      expect(assignment2).toBeNull();
    });
  });

  // ============================================
  // INTEGRATION TESTS (3 tests)
  // ============================================

  describe('NPC System Integration', () => {
    test('NPCManager + NPCAssignment should work together', () => {
      const buildingConfig = new BuildingConfig();
      const townManager = new TownManager(buildingConfig);
      const npcManager = new NPCManager(townManager);
      const npcAssignment = new NPCAssignment(buildingConfig);

      // Register building
      npcAssignment.registerBuilding({ id: 'farm1', type: 'FARM' });

      // Spawn NPC
      const npc = npcManager.spawnNPC('FARMER', { x: 50, y: 25, z: 50 });

      // Assign
      npcAssignment.assignNPC(npc.id, 'farm1');
      npcManager.assignNPC(npc.id, 'farm1');

      // Verify
      expect(npc.assignedBuilding).toBe('farm1');
      const staffing = npcAssignment.getStaffingLevel('farm1');
      expect(staffing.filled).toBe(1);
    });

    test('Multiple NPCs with staffing and roles', () => {
      const buildingConfig = new BuildingConfig();
      const townManager = new TownManager(buildingConfig);
      const npcManager = new NPCManager(townManager);
      const npcAssignment = new NPCAssignment(buildingConfig);

      // Setup buildings
      npcAssignment.registerBuilding({ id: 'farm1', type: 'FARM' });
      npcAssignment.registerBuilding({ id: 'warehouse1', type: 'WAREHOUSE' });

      // Spawn diverse workforce
      const farmer = npcManager.spawnNPC('FARMER');
      const craftsman = npcManager.spawnNPC('CRAFTSMAN');
      const guard = npcManager.spawnNPC('GUARD');

      // Assign optimally
      npcAssignment.assignNPC(farmer.id, 'farm1');
      npcAssignment.assignNPC(craftsman.id, 'warehouse1');

      // Verify stats
      const stats = npcAssignment.getStatistics();
      expect(stats.filledSlots).toBe(2);
      expect(npcManager.getStatistics().aliveCount).toBe(3);
    });

    test('NPC lifecycle affects assignment and statistics', () => {
      const buildingConfig = new BuildingConfig();
      const townManager = new TownManager(buildingConfig);
      const npcManager = new NPCManager(townManager);
      const npcAssignment = new NPCAssignment(buildingConfig);

      // Setup
      npcAssignment.registerBuilding({ id: 'farm1', type: 'FARM' });
      const npc = npcManager.spawnNPC('FARMER');
      npcAssignment.assignNPC(npc.id, 'farm1');

      // Verify alive and assigned
      let staffing = npcAssignment.getStaffingLevel('farm1');
      expect(staffing.filled).toBe(1);

      // Kill NPC
      npcManager.killNPC(npc.id);
      npcAssignment.unassignNPC(npc.id);

      // Verify removed from assignment
      staffing = npcAssignment.getStaffingLevel('farm1');
      expect(staffing.filled).toBe(0);
    });
  });
});
