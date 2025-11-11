/**
 * GridManager Unit Tests
 * Tests for grid management and building placement
 */

import GridManager from '../GridManager';
import { createTestBuilding } from '../../../test-utils';

describe('GridManager', () => {
  let gridManager;

  beforeEach(() => {
    gridManager = new GridManager();
  });

  describe('Constructor', () => {
    test('creates grid with default size', () => {
      expect(gridManager.gridSize).toBe(100);
      expect(gridManager.gridHeight).toBe(50);
    });

    test('creates grid with custom size', () => {
      const custom = new GridManager(50, 25);
      expect(custom.gridSize).toBe(50);
      expect(custom.gridHeight).toBe(25);
    });

    test('initializes empty collections', () => {
      expect(gridManager.buildings.size).toBe(0);
      expect(gridManager.occupiedCells.size).toBe(0);
    });

    test('initializes statistics', () => {
      expect(gridManager.stats.totalBuildings).toBe(0);
      expect(gridManager.stats.totalOccupiedCells).toBe(0);
    });
  });

  describe('Position Validation', () => {
    test('validates position within bounds', () => {
      const result = gridManager.validateBounds(50, 25, 50);
      expect(result.valid).toBe(true);
    });

    test('rejects negative X coordinate', () => {
      const result = gridManager.validateBounds(-1, 0, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('out of bounds');
    });

    test('rejects X coordinate beyond grid size', () => {
      const result = gridManager.validateBounds(100, 0, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('out of bounds');
    });

    test('rejects non-integer coordinates', () => {
      const result = gridManager.validateBounds(5.5, 0, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('integers');
    });

    test('accepts boundary values', () => {
      expect(gridManager.validateBounds(0, 0, 0).valid).toBe(true);
      expect(gridManager.validateBounds(99, 0, 99).valid).toBe(true);
      expect(gridManager.validateBounds(0, 49, 0).valid).toBe(true);
    });
  });

  describe('Position Key', () => {
    test('generates consistent position keys', () => {
      const key1 = gridManager.positionKey(5, 0, 10);
      const key2 = gridManager.positionKey(5, 0, 10);
      expect(key1).toBe(key2);
      expect(key1).toBe('5,0,10');
    });

    test('generates unique keys for different positions', () => {
      const key1 = gridManager.positionKey(5, 0, 10);
      const key2 = gridManager.positionKey(5, 0, 11);
      expect(key1).not.toBe(key2);
    });
  });

  describe('Building ID Generation', () => {
    test('generates unique building IDs', () => {
      const id1 = gridManager.generateBuildingId();
      const id2 = gridManager.generateBuildingId();

      expect(id1).not.toBe(id2);
      expect(id1).toContain('building_');
      expect(id2).toContain('building_');
    });

    test('increments ID counter', () => {
      const id1 = gridManager.generateBuildingId();
      const id2 = gridManager.generateBuildingId();

      const num1 = parseInt(id1.split('_')[1]);
      const num2 = parseInt(id2.split('_')[1]);

      expect(num2).toBe(num1 + 1);
    });
  });

  describe('Cell Occupancy', () => {
    test('checks if cell is occupied', () => {
      const building = createTestBuilding({
        position: { x: 5, y: 0, z: 5 }
      });

      gridManager.placeBuilding(building);

      expect(gridManager.isCellOccupied(5, 0, 5)).toBe(true);
      expect(gridManager.isCellOccupied(6, 0, 5)).toBe(false);
    });

    test('checks region freedom', () => {
      const result = gridManager.isRegionFree(5, 0, 5, 1, 1, 1);
      expect(result.free).toBe(true);
    });

    test('detects occupied region', () => {
      const building = createTestBuilding({
        position: { x: 5, y: 0, z: 5 }
      });

      gridManager.placeBuilding(building);

      const result = gridManager.isRegionFree(5, 0, 5, 1, 1, 1);
      expect(result.free).toBe(false);
    });
  });

  describe('Building Placement', () => {
    test('places building successfully', () => {
      const building = createTestBuilding({
        position: { x: 5, y: 0, z: 5 }
      });

      const result = gridManager.placeBuilding(building);

      expect(result.success).toBe(true);
      expect(gridManager.buildings.has(result.buildingId)).toBe(true);
    });

    test('prevents placing building at occupied position', () => {
      const building1 = createTestBuilding({
        position: { x: 5, y: 0, z: 5 }
      });
      const building2 = createTestBuilding({
        position: { x: 5, y: 0, z: 5 }
      });

      gridManager.placeBuilding(building1);
      const result = gridManager.placeBuilding(building2);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('prevents placing building out of bounds', () => {
      const building = createTestBuilding({
        position: { x: 150, y: 0, z: 5 }
      });

      const result = gridManager.placeBuilding(building);

      expect(result.success).toBe(false);
      expect(result.error).toContain('out of bounds');
    });

    test('updates statistics after placement', () => {
      const building = createTestBuilding();
      gridManager.placeBuilding(building);

      expect(gridManager.stats.totalBuildings).toBe(1);
    });
  });

  describe('Building Removal', () => {
    test('removes building successfully', () => {
      const building = createTestBuilding();
      const { buildingId } = gridManager.placeBuilding(building);

      const result = gridManager.removeBuilding(buildingId);

      expect(result.success).toBe(true);
      expect(gridManager.buildings.has(buildingId)).toBe(false);
    });

    test('frees cells after removal', () => {
      const building = createTestBuilding({
        position: { x: 5, y: 0, z: 5 }
      });

      const { buildingId } = gridManager.placeBuilding(building);
      gridManager.removeBuilding(buildingId);

      expect(gridManager.isCellOccupied(5, 0, 5)).toBe(false);
    });

    test('handles removing non-existent building', () => {
      const result = gridManager.removeBuilding('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('updates statistics after removal', () => {
      const building = createTestBuilding();
      const { buildingId } = gridManager.placeBuilding(building);
      gridManager.removeBuilding(buildingId);

      expect(gridManager.stats.totalBuildings).toBe(0);
    });
  });

  describe('Building Retrieval', () => {
    test('gets building by ID', () => {
      const building = createTestBuilding();
      const { buildingId } = gridManager.placeBuilding(building);

      const found = gridManager.getBuilding(buildingId);

      expect(found).toBeDefined();
      expect(found.id).toBe(buildingId);
    });

    test('returns undefined for non-existent building', () => {
      const found = gridManager.getBuilding('non-existent');
      expect(found).toBeUndefined();
    });

    test('gets building at position', () => {
      const building = createTestBuilding({
        position: { x: 5, y: 0, z: 5 }
      });

      const { buildingId } = gridManager.placeBuilding(building);

      const found = gridManager.getBuildingAtPosition(5, 0, 5);
      expect(found).toBeDefined();
      expect(found.id).toBe(buildingId);
    });

    test('gets all buildings', () => {
      const building1 = createTestBuilding({ position: { x: 5, y: 0, z: 5 } });
      const building2 = createTestBuilding({ position: { x: 6, y: 0, z: 5 } });

      gridManager.placeBuilding(building1);
      gridManager.placeBuilding(building2);

      const all = gridManager.getAllBuildings();

      expect(all).toHaveLength(2);
    });
  });

  describe('Statistics', () => {
    test('tracks building count', () => {
      expect(gridManager.stats.totalBuildings).toBe(0);

      gridManager.placeBuilding(createTestBuilding({ position: { x: 5, y: 0, z: 5 } }));
      expect(gridManager.stats.totalBuildings).toBe(1);

      gridManager.placeBuilding(createTestBuilding({ position: { x: 6, y: 0, z: 5 } }));
      expect(gridManager.stats.totalBuildings).toBe(2);
    });

    test('tracks occupied cells', () => {
      gridManager.placeBuilding(createTestBuilding({ position: { x: 5, y: 0, z: 5 } }));
      gridManager.placeBuilding(createTestBuilding({ position: { x: 6, y: 0, z: 5 } }));

      expect(gridManager.stats.totalOccupiedCells).toBeGreaterThan(0);
    });
  });
});
