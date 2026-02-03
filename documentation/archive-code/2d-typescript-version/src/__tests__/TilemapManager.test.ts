/**
 * TilemapManager Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TilemapManager } from '../world/TilemapManager';
import { TileRegistry } from '../world/TileRegistry';
import { EventBus } from '../core/EventBus';
import { TileLayer } from '../core/types';

describe('TilemapManager', () => {
  let manager: TilemapManager;

  beforeEach(() => {
    TileRegistry.reset();
    EventBus.reset();
    manager = new TilemapManager();
    manager.initialize();
  });

  describe('setTile', () => {
    it('should set a tile at a position', () => {
      const result = manager.setTile(0, 0, TileLayer.Ground, 'grass');
      expect(result).toBe(true);
    });

    it('should return false for unknown tile type', () => {
      const result = manager.setTile(0, 0, TileLayer.Ground, 'unknown_tile');
      expect(result).toBe(false);
    });

    it('should overwrite existing tile', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'grass');
      manager.setTile(0, 0, TileLayer.Ground, 'dirt');

      const tile = manager.getTile(0, 0, TileLayer.Ground);
      expect(tile?.typeId).toBe('dirt');
    });
  });

  describe('getTile', () => {
    it('should return tile at position', () => {
      manager.setTile(5, 10, TileLayer.Ground, 'grass');

      const tile = manager.getTile(5, 10, TileLayer.Ground);
      expect(tile).toBeDefined();
      expect(tile?.typeId).toBe('grass');
      expect(tile?.position).toEqual({ x: 5, y: 10 });
    });

    it('should return undefined for empty position', () => {
      const tile = manager.getTile(999, 999, TileLayer.Ground);
      expect(tile).toBeUndefined();
    });
  });

  describe('removeTile', () => {
    it('should remove and return tile', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'grass');

      const removed = manager.removeTile(0, 0, TileLayer.Ground);
      expect(removed).toBeDefined();
      expect(removed?.typeId).toBe('grass');

      const tile = manager.getTile(0, 0, TileLayer.Ground);
      expect(tile).toBeUndefined();
    });

    it('should return null for non-existent tile', () => {
      const removed = manager.removeTile(999, 999, TileLayer.Ground);
      expect(removed).toBeNull();
    });
  });

  describe('hasTile', () => {
    it('should return true if any tile exists', () => {
      manager.setTile(0, 0, TileLayer.Objects, 'tree');
      expect(manager.hasTile(0, 0)).toBe(true);
    });

    it('should return false if no tile exists', () => {
      expect(manager.hasTile(999, 999)).toBe(false);
    });
  });

  describe('isWalkable', () => {
    it('should return true for walkable ground tile', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'grass');
      expect(manager.isWalkable(0, 0)).toBe(true);
    });

    it('should return false if no ground tile', () => {
      expect(manager.isWalkable(0, 0)).toBe(false);
    });

    it('should return false if blocking object on ground', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'grass');
      manager.setTile(0, 0, TileLayer.Objects, 'tree');
      expect(manager.isWalkable(0, 0)).toBe(false);
    });

    it('should return false for water', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'water');
      expect(manager.isWalkable(0, 0)).toBe(false);
    });
  });

  describe('getTilesAt', () => {
    it('should return all tiles at position', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'grass');
      manager.setTile(0, 0, TileLayer.Objects, 'bush');

      const tiles = manager.getTilesAt(0, 0);
      expect(tiles).toHaveLength(2);
    });

    it('should return empty array for empty position', () => {
      const tiles = manager.getTilesAt(999, 999);
      expect(tiles).toHaveLength(0);
    });
  });

  describe('getTilesInRegion', () => {
    it('should return tiles in bounds', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'grass');
      manager.setTile(1, 1, TileLayer.Ground, 'dirt');
      manager.setTile(5, 5, TileLayer.Ground, 'sand');

      const tiles = manager.getTilesInRegion({ x: 0, y: 0, width: 3, height: 3 });
      expect(tiles).toHaveLength(2); // Only 0,0 and 1,1 are in bounds
    });

    it('should filter by layer', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'grass');
      manager.setTile(0, 0, TileLayer.Objects, 'bush');

      const groundTiles = manager.getTilesInRegion({ x: 0, y: 0, width: 1, height: 1 }, TileLayer.Ground);
      expect(groundTiles).toHaveLength(1);
    });
  });

  describe('getNeighbors4', () => {
    it('should return adjacent tiles', () => {
      manager.setTile(0, -1, TileLayer.Ground, 'grass'); // North
      manager.setTile(1, 0, TileLayer.Ground, 'grass');  // East
      manager.setTile(0, 1, TileLayer.Ground, 'grass');  // South
      manager.setTile(-1, 0, TileLayer.Ground, 'grass'); // West

      const neighbors = manager.getNeighbors4(0, 0, TileLayer.Ground);

      expect(neighbors.north).toBeDefined();
      expect(neighbors.east).toBeDefined();
      expect(neighbors.south).toBeDefined();
      expect(neighbors.west).toBeDefined();
    });
  });

  describe('serialize/deserialize', () => {
    it('should serialize and deserialize correctly', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'grass');
      manager.setTile(1, 1, TileLayer.Objects, 'tree');

      const data = manager.serialize();
      expect(data).toHaveLength(2);

      manager.clear();
      expect(manager.getTileCount()).toBe(0);

      manager.deserialize(data);
      expect(manager.getTileCount()).toBe(2);
      expect(manager.getTile(0, 0, TileLayer.Ground)?.typeId).toBe('grass');
      expect(manager.getTile(1, 1, TileLayer.Objects)?.typeId).toBe('tree');
    });
  });

  describe('getTileCount', () => {
    it('should return correct count', () => {
      expect(manager.getTileCount()).toBe(0);

      manager.setTile(0, 0, TileLayer.Ground, 'grass');
      expect(manager.getTileCount()).toBe(1);

      manager.setTile(1, 1, TileLayer.Ground, 'grass');
      expect(manager.getTileCount()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all tiles', () => {
      manager.setTile(0, 0, TileLayer.Ground, 'grass');
      manager.setTile(1, 1, TileLayer.Ground, 'grass');

      manager.clear();

      expect(manager.getTileCount()).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle 1000+ tiles efficiently', () => {
      const start = performance.now();

      // Set 1000 tiles
      for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 32; y++) {
          manager.setTile(x, y, TileLayer.Ground, 'grass');
        }
      }

      const setTime = performance.now() - start;

      // Get 1000 tiles
      const getStart = performance.now();
      for (let x = 0; x < 32; x++) {
        for (let y = 0; y < 32; y++) {
          manager.getTile(x, y, TileLayer.Ground);
        }
      }
      const getTime = performance.now() - getStart;

      // Per implementation plan: SetTile/GetTile < 1ms total
      // We're testing 1024 operations, so total should be reasonable
      expect(setTime).toBeLessThan(100); // 100ms for 1024 sets
      expect(getTime).toBeLessThan(100); // 100ms for 1024 gets

      console.log(`Set 1024 tiles: ${setTime.toFixed(2)}ms`);
      console.log(`Get 1024 tiles: ${getTime.toFixed(2)}ms`);
    });
  });
});
