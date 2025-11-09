/**
 * TerritoryTown.test.js - Tests for Module 4 Territory & Town
 *
 * Test coverage:
 * - TerritoryManager: 13 tests
 * - TownManager: 12 tests
 * Total: 25 tests
 */

const { TerritoryManager, Territory } = require('../TerritoryManager');
const TownManager = require('../TownManager');
const BuildingConfig = require('../../building-types/BuildingConfig');

describe('Module 4: Territory & Town', () => {
  // ============================================
  // TERRITORY MANAGER TESTS (13 tests)
  // ============================================

  describe('TerritoryManager', () => {
    let territoryManager;
    let buildingConfig;

    beforeEach(() => {
      buildingConfig = new BuildingConfig();
      territoryManager = new TerritoryManager(buildingConfig);
    });

    test('should initialize with BuildingConfig', () => {
      expect(territoryManager).toBeDefined();
      expect(territoryManager.buildingConfig).toBe(buildingConfig);
    });

    test('should throw error without BuildingConfig', () => {
      expect(() => new TerritoryManager(null)).toThrow();
    });

    test('should create initial territory', () => {
      const center = { x: 50, y: 25, z: 50 };
      const territory = territoryManager.createTerritory(center, 'SURVIVAL');

      expect(territory).toBeDefined();
      expect(territory.tier).toBe('SURVIVAL');
      expect(territory.dimension).toBe(25);
    });

    test('should track territory center position', () => {
      const center = { x: 100, y: 30, z: 100 };
      const territory = territoryManager.createTerritory(center, 'SURVIVAL');

      expect(territory.center.x).toBe(100);
      expect(territory.center.y).toBe(30);
      expect(territory.center.z).toBe(100);
    });

    test('should add building to territory', () => {
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const building = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 55, y: 25, z: 55 }
      };

      const added = territoryManager.addBuildingToTerritory(territory.id, building);
      expect(added).toBe(true);
      expect(territory.buildings).toContain('farm1');
    });

    test('should not add building outside territory', () => {
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const building = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 200, y: 25, z: 200 } // Way outside
      };

      const added = territoryManager.addBuildingToTerritory(territory.id, building);
      expect(added).toBe(false);
    });

    test('should remove building from territory', () => {
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const building = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 55, y: 25, z: 55 }
      };

      territoryManager.addBuildingToTerritory(territory.id, building);
      territoryManager.removeBuildingFromTerritory('farm1');

      expect(territory.buildings).not.toContain('farm1');
    });

    test('should expand territory to next tier', () => {
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const resources = { wood: 200, food: 100, stone: 100 };
      const buildings = [
        { id: 'house1', type: 'HOUSE', position: { x: 55, y: 25, z: 55 } },
        { id: 'house2', type: 'HOUSE', position: { x: 45, y: 25, z: 45 } },
        { id: 'farm1', type: 'FARM', position: { x: 55, y: 25, z: 45 } },
        { id: 'farm2', type: 'FARM', position: { x: 45, y: 25, z: 55 } }
      ];

      // Add buildings to territory first
      for (const building of buildings) {
        territoryManager.addBuildingToTerritory(territory.id, building);
      }

      const result = territoryManager.expandTerritory(territory.id, resources, buildings);
      expect(result.success).toBe(true);
      expect(result.newTier).toBe('PERMANENT');
      expect(territory.tier).toBe('PERMANENT');
      expect(territory.dimension).toBe(50);
    });

    test('should prevent expansion without resources', () => {
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const resources = { wood: 10, food: 10, stone: 10 }; // Not enough
      const buildings = [];

      const result = territoryManager.expandTerritory(territory.id, resources, buildings);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Insufficient');
    });

    test('should prevent expansion without required buildings', () => {
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const resources = { wood: 200, food: 100, stone: 100 }; // Enough resources
      const buildings = []; // But no buildings

      const result = territoryManager.expandTerritory(territory.id, resources, buildings);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Need');
    });

    test('should calculate aura coverage percentage', () => {
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const coverage = territory.getAuraCoveragePercent(50);
      expect(coverage).toBeGreaterThan(0);
      expect(coverage).toBeLessThanOrEqual(100);
    });

    test('should get territory statistics', () => {
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const stats = territoryManager.getStatistics(territory.id);

      expect(stats.tier).toBe('SURVIVAL');
      expect(stats.dimension).toBe(25);
      expect(stats.buildingCount).toBe(0);
    });

    test('should find territory for building', () => {
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const building = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 55, y: 25, z: 55 }
      };

      const found = territoryManager.findTerritoryForBuilding(building);
      expect(found).toBe(territory.id);
    });
  });

  // ============================================
  // TOWN MANAGER TESTS (12 tests)
  // ============================================

  describe('TownManager', () => {
    let townManager;
    let buildingConfig;

    beforeEach(() => {
      buildingConfig = new BuildingConfig();
      townManager = new TownManager(buildingConfig);
    });

    test('should initialize with BuildingConfig', () => {
      expect(townManager).toBeDefined();
      expect(townManager.buildingConfig).toBe(buildingConfig);
    });

    test('should throw error without BuildingConfig', () => {
      expect(() => new TownManager(null)).toThrow();
    });

    test('should spawn NPC', () => {
      const npc = townManager.spawnNPC('WORKER');

      expect(npc).toBeDefined();
      expect(npc.id).toBe(0);
      expect(npc.role).toBe('WORKER');
      expect(npc.alive).toBe(true);
    });

    test('should track spawned NPCs', () => {
      townManager.spawnNPC('WORKER');
      townManager.spawnNPC('FARMER');
      townManager.spawnNPC('GUARD');

      const alive = townManager.getAliveNPCs();
      expect(alive.length).toBe(3);
    });

    test('should kill NPC', () => {
      const npc = townManager.spawnNPC('WORKER');
      const killed = townManager.killNPC(npc.id);

      expect(killed).toBe(true);
      expect(npc.alive).toBe(false);
      expect(townManager.getAliveNPCs().length).toBe(0);
    });

    test('should assign NPC to building', () => {
      const npc = townManager.spawnNPC('WORKER');
      const assigned = townManager.assignNPC(npc.id, 'farm1');

      expect(assigned).toBe(true);
      expect(npc.assignedBuilding).toBe('farm1');
    });

    test('should unassign NPC from building', () => {
      const npc = townManager.spawnNPC('WORKER');
      townManager.assignNPC(npc.id, 'farm1');
      const unassigned = townManager.unassignNPC(npc.id);

      expect(unassigned).toBe(true);
      expect(npc.assignedBuilding).toBe(null);
    });

    test('should get NPCs in building', () => {
      const npc1 = townManager.spawnNPC('WORKER');
      const npc2 = townManager.spawnNPC('WORKER');
      const npc3 = townManager.spawnNPC('WORKER');

      townManager.assignNPC(npc1.id, 'farm1');
      townManager.assignNPC(npc2.id, 'farm1');
      townManager.assignNPC(npc3.id, 'farm2');

      const inFarm1 = townManager.getNPCsInBuilding('farm1');
      expect(inFarm1.length).toBe(2);
    });

    test('should update NPC happiness', () => {
      const npc = townManager.spawnNPC('WORKER');
      const initialHappiness = npc.happiness;

      townManager.updateNPCHappiness(npc.id, { food: 100, work: true });
      expect(npc.happiness).not.toBe(initialHappiness);
    });

    test('should calculate housing capacity from buildings', () => {
      const buildings = [
        { id: 'house1', type: 'HOUSE' },
        { id: 'house2', type: 'HOUSE' }
      ];

      const capacity = townManager.calculateHousingCapacity(buildings);
      expect(capacity).toBeGreaterThan(0);
    });

    test('should get town statistics', () => {
      townManager.spawnNPC('WORKER');
      townManager.spawnNPC('FARMER');
      const buildings = [
        { id: 'house1', type: 'HOUSE' },
        { id: 'house2', type: 'HOUSE' }
      ];

      const stats = townManager.getStatistics(buildings);
      expect(stats.population.alive).toBe(2);
      expect(stats.happiness).toBeDefined();
      expect(stats.housing).toBeDefined();
    });

    test('should train NPC to increase skill', () => {
      const npc = townManager.spawnNPC('WORKER');
      const initialSkill = npc.skill;

      const newSkill = townManager.trainNPC(npc.id, 0.1);
      expect(newSkill).toBe(initialSkill + 0.1);
      expect(npc.skill).toBeLessThanOrEqual(1.5); // Capped
    });
  });

  // ============================================
  // INTEGRATION TESTS (5 tests)
  // ============================================

  describe('Module 4: Integration Tests', () => {
    test('TerritoryManager + TownManager should work together', () => {
      const buildingConfig = new BuildingConfig();
      const territoryManager = new TerritoryManager(buildingConfig);
      const townManager = new TownManager(buildingConfig);

      // Create territory
      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');

      // Spawn NPCs
      townManager.spawnNPC('WORKER');
      townManager.spawnNPC('FARMER');

      // Create building in territory
      const building = {
        id: 'farm1',
        type: 'FARM',
        position: { x: 55, y: 25, z: 55 }
      };
      territoryManager.addBuildingToTerritory(territory.id, building);

      // Get stats
      const stats = townManager.getStatistics([building]);
      expect(stats.population.alive).toBe(2);
    });

    test('Territory should contain multiple buildings', () => {
      const buildingConfig = new BuildingConfig();
      const territoryManager = new TerritoryManager(buildingConfig);

      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'TOWN');

      const buildings = [
        { id: 'farm1', type: 'FARM', position: { x: 75, y: 25, z: 75 } },
        { id: 'house1', type: 'HOUSE', position: { x: 60, y: 25, z: 60 } },
        { id: 'warehouse1', type: 'WAREHOUSE', position: { x: 40, y: 25, z: 40 } }
      ];

      for (const building of buildings) {
        territoryManager.addBuildingToTerritory(territory.id, building);
      }

      expect(territory.buildings.length).toBe(3);
    });

    test('Town population affects morale factors', () => {
      const buildingConfig = new BuildingConfig();
      const territoryManager = new TerritoryManager(buildingConfig);
      const townManager = new TownManager(buildingConfig);

      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'TOWN');

      // Spawn NPCs
      const npc1 = townManager.spawnNPC('WORKER');
      const npc2 = townManager.spawnNPC('WORKER');

      // Create housing
      const buildings = [
        { id: 'house1', type: 'HOUSE' },
        { id: 'house2', type: 'HOUSE' }
      ];

      // Get stats - housing should be properly tracked
      const stats = townManager.getStatistics(buildings);
      expect(stats.housing.occupied).toBe(2);
    });

    test('Expansion increases territory size and affects building placement', () => {
      const buildingConfig = new BuildingConfig();
      const territoryManager = new TerritoryManager(buildingConfig);

      const territory = territoryManager.createTerritory({ x: 50, y: 25, z: 50 }, 'SURVIVAL');
      const initialSize = territory.dimension;

      // Create required buildings for expansion
      const resources = { wood: 100, food: 50, stone: 50 };
      const buildings = [
        { id: 'house1', type: 'HOUSE', position: { x: 55, y: 25, z: 55 } },
        { id: 'house2', type: 'HOUSE', position: { x: 45, y: 25, z: 45 } },
        { id: 'farm1', type: 'FARM', position: { x: 55, y: 25, z: 45 } },
        { id: 'farm2', type: 'FARM', position: { x: 45, y: 25, z: 55 } }
      ];

      for (const building of buildings) {
        territoryManager.addBuildingToTerritory(territory.id, building);
      }

      const result = territoryManager.expandTerritory(territory.id, resources, buildings);
      expect(result.success).toBe(true);
      expect(territory.dimension).toBeGreaterThan(initialSize);
    });

    test('Town can manage full NPC lifecycle', () => {
      const buildingConfig = new BuildingConfig();
      const townManager = new TownManager(buildingConfig);

      // Spawn NPCs
      const npc1 = townManager.spawnNPC('WORKER');
      const npc2 = townManager.spawnNPC('FARMER');

      // Assign to buildings
      townManager.assignNPC(npc1.id, 'farm1');
      townManager.assignNPC(npc2.id, 'farm2');

      // Update happiness
      townManager.updateNPCHappiness(npc1.id, { food: 80, work: true });

      // Train
      townManager.trainNPC(npc1.id, 0.1);

      // Kill one
      townManager.killNPC(npc2.id);

      // Get stats
      const stats = townManager.getStatistics([]);
      expect(stats.population.alive).toBe(1);
      expect(stats.population.totalSpawned).toBe(2);
    });
  });
});
