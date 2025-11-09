/**
 * Foundation Module Tests
 *
 * Comprehensive test suite for GridManager, BuildingFactory, and SpatialPartitioning
 * Total: 30+ tests covering all core functionality
 */

const GridManager = require('../GridManager');
const BuildingFactory = require('../BuildingFactory');
const SpatialPartitioning = require('../SpatialPartitioning');

// ============================================================================
// GRIDMANAGER TESTS
// ============================================================================

describe('GridManager', () => {
  let grid;

  beforeEach(() => {
    grid = new GridManager(25, 15);
  });

  describe('Initialization', () => {
    test('should initialize with correct dimensions', () => {
      expect(grid.gridSize).toBe(25);
      expect(grid.gridHeight).toBe(15);
      expect(grid.buildings.size).toBe(0);
      expect(grid.occupiedCells.size).toBe(0);
    });

    test('should generate unique IDs', () => {
      const id1 = grid.generateBuildingId();
      const id2 = grid.generateBuildingId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/building_\d+/);
    });
  });

  describe('Bounds Validation', () => {
    test('should validate bounds correctly', () => {
      const valid = grid.validateBounds(10, 5, 10);
      expect(valid.valid).toBe(true);
    });

    test('should reject out of bounds X', () => {
      const result = grid.validateBounds(30, 5, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('X position');
    });

    test('should reject negative coordinates', () => {
      const result = grid.validateBounds(-1, 5, 10);
      expect(result.valid).toBe(false);
    });

    test('should reject non-integer coordinates', () => {
      const result = grid.validateBounds(10.5, 5, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('integers');
    });
  });

  describe('Cell Occupancy', () => {
    test('should detect unoccupied cells', () => {
      expect(grid.isCellOccupied(5, 5, 5)).toBe(false);
    });

    test('should mark cells as occupied after placement', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      grid.placeBuilding(building);
      expect(grid.isCellOccupied(5, 5, 5)).toBe(true);
    });
  });

  describe('Region Validation', () => {
    test('should validate free regions', () => {
      const result = grid.isRegionFree(5, 5, 5, 3, 2, 3);
      expect(result.free).toBe(true);
    });

    test('should detect occupied regions', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 2, height: 2, depth: 2 },
      };
      grid.placeBuilding(building);

      const result = grid.isRegionFree(5, 5, 5, 2, 2, 2);
      expect(result.free).toBe(false);
    });

    test('should handle regions extending beyond bounds', () => {
      const result = grid.isRegionFree(20, 10, 20, 10, 10, 10);
      expect(result.free).toBe(false);
      expect(result.occupiedCells.length).toBeGreaterThan(0);
    });
  });

  describe('Building Placement', () => {
    test('should place building successfully', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      const result = grid.placeBuilding(building);
      expect(result.success).toBe(true);
      expect(result.buildingId).toBeDefined();
      expect(grid.buildings.size).toBe(1);
    });

    test('should reject placement on occupied cells', () => {
      const building1 = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 2, height: 1, depth: 2 },
      };
      grid.placeBuilding(building1);

      const building2 = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      const result = grid.placeBuilding(building2);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not free');
    });

    test('should generate IDs if not provided', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      const result = grid.placeBuilding(building);
      expect(result.buildingId).toMatch(/building_\d+/);
    });

    test('should handle multi-cell buildings', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 3, height: 2, depth: 3 },
      };
      const result = grid.placeBuilding(building);
      expect(result.success).toBe(true);
      expect(grid.occupiedCells.size).toBe(3 * 2 * 3);
    });
  });

  describe('Building Retrieval', () => {
    test('should retrieve building by ID', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      const result = grid.placeBuilding(building);
      const retrieved = grid.getBuilding(result.buildingId);
      expect(retrieved).toBeDefined();
      expect(retrieved.position.x).toBe(5);
    });

    test('should return null for non-existent building', () => {
      const building = grid.getBuilding('nonexistent');
      expect(building).toBeNull();
    });

    test('should get building at position', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      grid.placeBuilding(building);
      const retrieved = grid.getBuildingAt(5, 5, 5);
      expect(retrieved).toBeDefined();
    });

    test('should get all buildings', () => {
      const building1 = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      const building2 = {
        position: { x: 10, y: 10, z: 10 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      grid.placeBuilding(building1);
      grid.placeBuilding(building2);
      const all = grid.getAllBuildings();
      expect(all.length).toBe(2);
    });
  });

  describe('Building Removal', () => {
    test('should remove building successfully', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      const result = grid.placeBuilding(building);
      const removeResult = grid.removeBuilding(result.buildingId);
      expect(removeResult.success).toBe(true);
      expect(grid.buildings.size).toBe(0);
      expect(grid.occupiedCells.size).toBe(0);
    });

    test('should fail to remove non-existent building', () => {
      const result = grid.removeBuilding('nonexistent');
      expect(result.success).toBe(false);
    });

    test('should free cells after removal', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 2, height: 2, depth: 2 },
      };
      const result = grid.placeBuilding(building);
      expect(grid.occupiedCells.size).toBe(8);

      grid.removeBuilding(result.buildingId);
      expect(grid.occupiedCells.size).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics correctly', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 2, height: 2, depth: 2 },
      };
      grid.placeBuilding(building);
      const stats = grid.getStatistics();
      expect(stats.totalBuildings).toBe(1);
      expect(stats.occupiedCells).toBe(8);
      expect(stats.percentageOccupied).toBeDefined();
    });
  });

  describe('Integrity Validation', () => {
    test('should detect integrity errors', () => {
      const building = {
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      grid.placeBuilding(building);
      const integrity = grid.validateIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.errors).toBeUndefined();
    });
  });
});

// ============================================================================
// BUILDINGFACTORY TESTS
// ============================================================================

describe('BuildingFactory', () => {
  let factory;
  const mockConfigs = {
    FARM: {
      type: 'FARM',
      tier: 'PERMANENT',
      cost: { gold: 100 },
      dimensions: { width: 2, height: 1, depth: 2 },
      maxHealth: 100,
      baseProductionRate: 1,
    },
    HOUSE: {
      type: 'HOUSE',
      tier: 'SURVIVAL',
      cost: { gold: 50 },
      dimensions: { width: 1, height: 2, depth: 1 },
      maxHealth: 75,
    },
  };

  beforeEach(() => {
    factory = new BuildingFactory(JSON.parse(JSON.stringify(mockConfigs)));
  });

  describe('Configuration Management', () => {
    test('should register building configs', () => {
      expect(factory.hasConfig('FARM')).toBe(true);
    });

    test('should retrieve configs', () => {
      const config = factory.getConfig('FARM');
      expect(config.type).toBe('FARM');
    });

    test('should return null for unknown type', () => {
      const config = factory.getConfig('UNKNOWN');
      expect(config).toBeNull();
    });
  });

  describe('Building Creation', () => {
    test('should create building from template', () => {
      const building = factory.createBuilding('FARM', 5, 5, 5);
      expect(building).toBeDefined();
      expect(building.type).toBe('FARM');
      expect(building.position.x).toBe(5);
    });

    test('should initialize default properties', () => {
      const building = factory.createBuilding('FARM', 5, 5, 5);
      expect(building.status).toBe('BLUEPRINT');
      expect(building.constructionProgress).toBe(0);
      expect(building.health).toBe(100);
      expect(building.createdAt).toBeDefined();
    });

    test('should apply overrides', () => {
      const building = factory.createBuilding('FARM', 5, 5, 5, { status: 'COMPLETED' });
      expect(building.status).toBe('COMPLETED');
    });

    test('should return null for unknown type', () => {
      const building = factory.createBuilding('UNKNOWN', 5, 5, 5);
      expect(building).toBeNull();
    });
  });

  describe('Batch Creation', () => {
    test('should create multiple buildings', () => {
      const positions = [
        { x: 5, y: 5, z: 5 },
        { x: 10, y: 10, z: 10 },
        { x: 15, y: 15, z: 15 },
      ];
      const buildings = factory.createBuildings('FARM', positions);
      expect(buildings.length).toBe(3);
    });
  });

  describe('Building Cloning', () => {
    test('should clone building to new position', () => {
      const original = factory.createBuilding('FARM', 5, 5, 5);
      const cloned = factory.cloneBuilding(original, 10, 10, 10);
      expect(cloned.position.x).toBe(10);
      expect(cloned.type).toBe('FARM');
      expect(cloned.id).toBeUndefined();
    });
  });

  describe('Validation', () => {
    test('should validate correct building', () => {
      const building = factory.createBuilding('FARM', 5, 5, 5);
      const result = factory.validateBuilding(building);
      expect(result.valid).toBe(true);
    });

    test('should detect missing type', () => {
      const building = { position: { x: 5, y: 5, z: 5 } };
      const result = factory.validateBuilding(building);
      expect(result.valid).toBe(false);
    });

    test('should detect invalid status', () => {
      const building = factory.createBuilding('FARM', 5, 5, 5);
      building.status = 'INVALID_STATUS';
      const result = factory.validateBuilding(building);
      expect(result.valid).toBe(false);
    });
  });

  describe('Registry Operations', () => {
    test('should get all registered types', () => {
      const types = factory.getRegisteredTypes();
      expect(types).toContain('FARM');
      expect(types).toContain('HOUSE');
    });
  });
});

// ============================================================================
// SPATIALPARTITIONING TESTS
// ============================================================================

describe('SpatialPartitioning', () => {
  let spatial;
  let buildings;

  beforeEach(() => {
    spatial = new SpatialPartitioning(50, 30, 10);
    buildings = [
      {
        id: 'b1',
        position: { x: 5, y: 5, z: 5 },
        dimensions: { width: 1, height: 1, depth: 1 },
      },
      {
        id: 'b2',
        position: { x: 15, y: 15, z: 15 },
        dimensions: { width: 1, height: 1, depth: 1 },
      },
      {
        id: 'b3',
        position: { x: 25, y: 15, z: 25 },
        dimensions: { width: 2, height: 2, depth: 2 },
      },
    ];

    for (const building of buildings) {
      spatial.addBuilding(building);
    }
  });

  describe('Chunk Calculations', () => {
    test('should calculate chunk coordinates', () => {
      const coords = spatial.getChunkCoords(5, 5, 5);
      expect(coords.chunkX).toBe(0);
      expect(coords.chunkY).toBe(0);
      expect(coords.chunkZ).toBe(0);
    });

    test('should handle different chunks', () => {
      const coords1 = spatial.getChunkCoords(5, 5, 5);
      const coords2 = spatial.getChunkCoords(15, 15, 15);
      expect(coords1.chunkX).not.toBe(coords2.chunkX);
    });
  });

  describe('Building Management', () => {
    test('should add building to partitioning', () => {
      const newBuilding = {
        id: 'b4',
        position: { x: 30, y: 20, z: 30 },
        dimensions: { width: 1, height: 1, depth: 1 },
      };
      spatial.addBuilding(newBuilding);
      expect(spatial.buildingChunks.has('b4')).toBe(true);
    });

    test('should remove building from partitioning', () => {
      spatial.removeBuilding('b1');
      expect(spatial.buildingChunks.has('b1')).toBe(false);
    });

    test('should update building position', () => {
      const building = buildings[0];
      building.position = { x: 20, y: 20, z: 20 };
      spatial.updateBuilding(building);
      expect(spatial.buildingChunks.get('b1')).toBeDefined();
    });
  });

  describe('Chunk Queries', () => {
    test('should get buildings in chunk', () => {
      const buildingIds = spatial.getBuildingsInChunk(0, 0, 0);
      expect(buildingIds.has('b1')).toBe(true);
    });

    test('should get buildings in adjacent chunks', () => {
      const buildingIds = spatial.getBuildingsInAdjacentChunks(0, 0, 0);
      expect(buildingIds.size).toBeGreaterThan(0);
    });
  });

  describe('Radius Queries', () => {
    test('should find buildings within radius', () => {
      const result = spatial.queryRadius(5, 5, 5, 10, buildings);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].building.id).toBe('b1');
    });

    test('should return buildings sorted by distance', () => {
      const result = spatial.queryRadius(10, 10, 10, 50, buildings);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].distance).toBeGreaterThanOrEqual(result[i - 1].distance);
      }
    });
  });

  describe('Region Queries', () => {
    test('should find buildings in region', () => {
      const result = spatial.queryRegion(0, 0, 0, 20, 20, 20, buildings);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle non-overlapping regions', () => {
      const result = spatial.queryRegion(40, 20, 40, 49, 25, 49, buildings);
      expect(result.length).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics', () => {
      const stats = spatial.getStatistics();
      expect(stats.totalChunks).toBeGreaterThan(0);
      expect(stats.totalBuildings).toBeGreaterThan(0);
      expect(stats.maxChunkSize).toBeGreaterThan(0);
    });
  });
});
