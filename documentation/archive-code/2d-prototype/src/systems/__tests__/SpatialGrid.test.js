/**
 * SpatialGrid.test.js - Unit tests for spatial partitioning system
 *
 * Tests:
 * - Cell key generation
 * - Entity insertion and removal
 * - Position updates and cell changes
 * - Nearby entity queries
 * - Grid statistics
 */

import { SpatialGrid } from '../SpatialGrid';

describe('SpatialGrid', () => {
  let grid;

  beforeEach(() => {
    // Create a small grid for testing (100x100 world, 10x10 cells)
    grid = new SpatialGrid(10, 100);
  });

  describe('Cell Key Generation', () => {
    test('should generate correct cell key for position', () => {
      expect(grid.getCellKey(0, 0)).toBe('0,0');
      expect(grid.getCellKey(5, 5)).toBe('0,0');
      expect(grid.getCellKey(9, 9)).toBe('0,0');
      expect(grid.getCellKey(10, 10)).toBe('1,1');
      expect(grid.getCellKey(25, 35)).toBe('2,3');
    });

    test('should handle negative positions', () => {
      expect(grid.getCellKey(-5, -5)).toBe('-1,-1');
      expect(grid.getCellKey(-15, 5)).toBe('-2,0');
    });

    test('should handle large positions', () => {
      expect(grid.getCellKey(100, 100)).toBe('10,10');
      expect(grid.getCellKey(999, 999)).toBe('99,99');
    });
  });

  describe('Entity Insertion', () => {
    test('should insert entity into correct cell', () => {
      grid.insert('entity1', 5, 5);

      const cell = grid.getCell(5, 5);
      expect(cell.has('entity1')).toBe(true);
    });

    test('should insert multiple entities into same cell', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 6, 6);
      grid.insert('entity3', 8, 8);

      const cell = grid.getCell(5, 5);
      expect(cell.size).toBe(3);
      expect(cell.has('entity1')).toBe(true);
      expect(cell.has('entity2')).toBe(true);
      expect(cell.has('entity3')).toBe(true);
    });

    test('should insert entities into different cells', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 15, 15);

      const cell1 = grid.getCell(5, 5);
      const cell2 = grid.getCell(15, 15);

      expect(cell1.has('entity1')).toBe(true);
      expect(cell1.has('entity2')).toBe(false);
      expect(cell2.has('entity2')).toBe(true);
      expect(cell2.has('entity1')).toBe(false);
    });

    test('should track entity cell mapping', () => {
      grid.insert('entity1', 5, 5);

      expect(grid.entityCells.get('entity1')).toBe('0,0');
    });
  });

  describe('Entity Removal', () => {
    test('should remove entity from grid', () => {
      grid.insert('entity1', 5, 5);
      grid.remove('entity1');

      const cell = grid.getCell(5, 5);
      expect(cell.has('entity1')).toBe(false);
    });

    test('should clean up empty cells', () => {
      grid.insert('entity1', 5, 5);
      grid.remove('entity1');

      expect(grid.cells.has('0,0')).toBe(false);
    });

    test('should not affect other entities in same cell', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 6, 6);
      grid.remove('entity1');

      const cell = grid.getCell(5, 5);
      expect(cell.has('entity1')).toBe(false);
      expect(cell.has('entity2')).toBe(true);
    });

    test('should handle removing non-existent entity', () => {
      expect(() => grid.remove('nonexistent')).not.toThrow();
    });

    test('should clean up entity tracking', () => {
      grid.insert('entity1', 5, 5);
      grid.remove('entity1');

      expect(grid.entityCells.has('entity1')).toBe(false);
    });
  });

  describe('Entity Updates', () => {
    test('should update entity position within same cell', () => {
      grid.insert('entity1', 5, 5);
      grid.update('entity1', 6, 6); // Still in cell 0,0

      const cell = grid.getCell(6, 6);
      expect(cell.has('entity1')).toBe(true);
      expect(grid.entityCells.get('entity1')).toBe('0,0');
    });

    test('should move entity to new cell', () => {
      grid.insert('entity1', 5, 5);
      grid.update('entity1', 15, 15); // Move to cell 1,1

      const oldCell = grid.getCell(5, 5);
      const newCell = grid.getCell(15, 15);

      expect(oldCell.has('entity1')).toBe(false);
      expect(newCell.has('entity1')).toBe(true);
      expect(grid.entityCells.get('entity1')).toBe('1,1');
    });

    test('should clean up empty cell after move', () => {
      grid.insert('entity1', 5, 5);
      grid.update('entity1', 15, 15);

      expect(grid.cells.has('0,0')).toBe(false);
    });

    test('should handle multiple position updates', () => {
      grid.insert('entity1', 5, 5);
      grid.update('entity1', 15, 15);
      grid.update('entity1', 25, 25);
      grid.update('entity1', 5, 5);

      const cell = grid.getCell(5, 5);
      expect(cell.has('entity1')).toBe(true);
    });
  });

  describe('Nearby Queries', () => {
    beforeEach(() => {
      // Set up a grid with entities
      grid.insert('center', 50, 50);    // Cell 5,5
      grid.insert('north', 50, 60);     // Cell 5,6
      grid.insert('south', 50, 40);     // Cell 5,4
      grid.insert('east', 60, 50);      // Cell 6,5
      grid.insert('west', 40, 50);      // Cell 4,5
      grid.insert('far', 90, 90);       // Cell 9,9
    });

    test('should find entities in same cell', () => {
      const nearby = grid.getNearby(50, 50, 5);

      expect(nearby.has('center')).toBe(true);
    });

    test('should find entities in adjacent cells', () => {
      const nearby = grid.getNearby(50, 50, 15);

      expect(nearby.has('center')).toBe(true);
      expect(nearby.has('north')).toBe(true);
      expect(nearby.has('south')).toBe(true);
      expect(nearby.has('east')).toBe(true);
      expect(nearby.has('west')).toBe(true);
    });

    test('should not find distant entities', () => {
      const nearby = grid.getNearby(50, 50, 15);

      expect(nearby.has('far')).toBe(false);
    });

    test('should handle radius larger than world', () => {
      const nearby = grid.getNearby(50, 50, 1000);

      expect(nearby.size).toBe(6);
    });

    test('should handle zero radius', () => {
      const nearby = grid.getNearby(50, 50, 0);

      // Should return entities in same cell
      expect(nearby.has('center')).toBe(true);
    });

    test('should handle queries at world edge', () => {
      grid.insert('edge', 0, 0);
      const nearby = grid.getNearby(0, 0, 5);

      expect(nearby.has('edge')).toBe(true);
    });

    test('should handle empty cells', () => {
      const nearby = grid.getNearby(500, 500, 10);

      expect(nearby.size).toBe(0);
    });
  });

  describe('Grid Clearing and Rebuilding', () => {
    test('should clear all entities', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 15, 15);
      grid.insert('entity3', 25, 25);

      grid.clear();

      expect(grid.cells.size).toBe(0);
      expect(grid.entityCells.size).toBe(0);
    });

    test('should rebuild from entity array', () => {
      const entities = [
        { id: 'entity1', position: { x: 5, z: 5 } },
        { id: 'entity2', position: { x: 15, z: 15 } },
        { id: 'entity3', position: { x: 25, z: 25 } }
      ];

      grid.rebuild(entities);

      expect(grid.entityCells.size).toBe(3);
      expect(grid.getCell(5, 5).has('entity1')).toBe(true);
      expect(grid.getCell(15, 15).has('entity2')).toBe(true);
      expect(grid.getCell(25, 25).has('entity3')).toBe(true);
    });

    test('should handle rebuild with empty array', () => {
      grid.insert('entity1', 5, 5);
      grid.rebuild([]);

      expect(grid.cells.size).toBe(0);
      expect(grid.entityCells.size).toBe(0);
    });

    test('should handle rebuild with invalid entities', () => {
      const entities = [
        { id: 'entity1', position: { x: 5, z: 5 } },
        null,
        { id: 'entity3' }, // Missing position
        { position: { x: 15, z: 15 } }, // Missing id
      ];

      grid.rebuild(entities);

      expect(grid.entityCells.size).toBe(1);
      expect(grid.getCell(5, 5).has('entity1')).toBe(true);
    });
  });

  describe('Grid Statistics', () => {
    test('should return stats for empty grid', () => {
      const stats = grid.getStats();

      expect(stats.totalEntities).toBe(0);
      expect(stats.occupiedCells).toBe(0);
      expect(stats.totalCells).toBe(100); // 10x10 grid
      expect(stats.avgEntitiesPerCell).toBe(0);
    });

    test('should return stats for populated grid', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 6, 6);
      grid.insert('entity3', 15, 15);

      const stats = grid.getStats();

      expect(stats.totalEntities).toBe(3);
      expect(stats.occupiedCells).toBe(2); // 2 cells occupied
      expect(stats.avgEntitiesPerCell).toBe('1.50');
    });

    test('should calculate utilization percentage', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 15, 15);

      const stats = grid.getStats();

      expect(stats.utilization).toBe('2.00%'); // 2 out of 100 cells
    });
  });

  describe('Edge Cases', () => {
    test('should handle fractional positions', () => {
      grid.insert('entity1', 5.7, 5.3);

      const cell = grid.getCell(5.7, 5.3);
      expect(cell.has('entity1')).toBe(true);
    });

    test('should handle exactly on cell boundary', () => {
      grid.insert('entity1', 10, 10);
      grid.insert('entity2', 10.0, 10.0);

      const cell = grid.getCell(10, 10);
      expect(cell.has('entity1')).toBe(true);
      expect(cell.has('entity2')).toBe(true);
    });

    test('should handle very large entity IDs', () => {
      const longId = 'entity-' + '1'.repeat(1000);
      grid.insert(longId, 5, 5);

      expect(grid.getCell(5, 5).has(longId)).toBe(true);
    });

    test('should handle duplicate insertions', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity1', 5, 5);

      const cell = grid.getCell(5, 5);
      expect(cell.size).toBe(1); // Set prevents duplicates
    });

    test('should handle very small cell size', () => {
      const smallGrid = new SpatialGrid(1, 100);
      smallGrid.insert('entity1', 5.5, 5.5);

      const cell = smallGrid.getCell(5.5, 5.5);
      expect(cell.has('entity1')).toBe(true);
    });

    test('should handle very large cell size', () => {
      const largeGrid = new SpatialGrid(1000, 1000);
      largeGrid.insert('entity1', 5, 5);
      largeGrid.insert('entity2', 995, 995);

      const cell = largeGrid.getCell(5, 5);
      expect(cell.size).toBe(2); // Both in same cell
    });
  });

  describe('Performance Characteristics', () => {
    test('should handle many entities efficiently', () => {
      const startTime = performance.now();

      // Insert 1000 entities
      for (let i = 0; i < 1000; i++) {
        grid.insert(`entity${i}`, Math.random() * 100, Math.random() * 100);
      }

      const insertTime = performance.now() - startTime;

      expect(insertTime).toBeLessThan(100); // Should be fast
      expect(grid.entityCells.size).toBe(1000);
    });

    test('should query nearby entities efficiently', () => {
      // Populate grid with many entities
      for (let i = 0; i < 1000; i++) {
        grid.insert(`entity${i}`, Math.random() * 100, Math.random() * 100);
      }

      const startTime = performance.now();

      // Query 100 times
      for (let i = 0; i < 100; i++) {
        grid.getNearby(50, 50, 20);
      }

      const queryTime = performance.now() - startTime;

      expect(queryTime).toBeLessThan(50); // Should be fast
    });

    test('should update positions efficiently', () => {
      // Insert entities
      for (let i = 0; i < 100; i++) {
        grid.insert(`entity${i}`, i, i);
      }

      const startTime = performance.now();

      // Update all entities
      for (let i = 0; i < 100; i++) {
        grid.update(`entity${i}`, i + 10, i + 10);
      }

      const updateTime = performance.now() - startTime;

      expect(updateTime).toBeLessThan(20); // Should be fast
    });
  });
});
