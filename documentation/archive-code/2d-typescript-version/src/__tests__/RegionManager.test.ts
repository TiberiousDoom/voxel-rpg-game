/**
 * RegionManager Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RegionManager } from '../world/RegionManager';
import { EventBus } from '../core/EventBus';

describe('RegionManager', () => {
  let manager: RegionManager;

  beforeEach(() => {
    EventBus.reset();
    manager = new RegionManager({
      regionSize: 64,
      loadDistance: 2,
      unloadDistance: 3,
    });
    manager.initialize();
  });

  describe('worldToRegion', () => {
    it('should convert world coordinates to region coordinates', () => {
      expect(manager.worldToRegion(0, 0)).toEqual({ x: 0, y: 0 });
      expect(manager.worldToRegion(63, 63)).toEqual({ x: 0, y: 0 });
      expect(manager.worldToRegion(64, 64)).toEqual({ x: 1, y: 1 });
      expect(manager.worldToRegion(-1, -1)).toEqual({ x: -1, y: -1 });
    });
  });

  describe('regionToWorld', () => {
    it('should convert region coordinates to world coordinates', () => {
      expect(manager.regionToWorld(0, 0)).toEqual({ x: 0, y: 0 });
      expect(manager.regionToWorld(1, 1)).toEqual({ x: 64, y: 64 });
      expect(manager.regionToWorld(-1, -1)).toEqual({ x: -64, y: -64 });
    });
  });

  describe('getRegionId', () => {
    it('should generate consistent region IDs', () => {
      expect(manager.getRegionId(0, 0)).toBe('0,0');
      expect(manager.getRegionId(1, 2)).toBe('1,2');
      expect(manager.getRegionId(-1, -1)).toBe('-1,-1');
    });
  });

  describe('parseRegionId', () => {
    it('should parse region IDs correctly', () => {
      expect(manager.parseRegionId('0,0')).toEqual({ x: 0, y: 0 });
      expect(manager.parseRegionId('1,2')).toEqual({ x: 1, y: 2 });
      expect(manager.parseRegionId('-1,-1')).toEqual({ x: -1, y: -1 });
    });
  });

  describe('loadRegion', () => {
    it('should load a region', () => {
      const region = manager.loadRegion(0, 0);

      expect(region).toBeDefined();
      expect(region.isLoaded).toBe(true);
      expect(manager.isRegionLoaded(0, 0)).toBe(true);
    });

    it('should not duplicate load', () => {
      manager.loadRegion(0, 0);
      const loadedCount1 = manager.getLoadedRegionCount();

      manager.loadRegion(0, 0);
      const loadedCount2 = manager.getLoadedRegionCount();

      expect(loadedCount1).toBe(loadedCount2);
    });
  });

  describe('unloadRegion', () => {
    it('should unload a region', () => {
      manager.loadRegion(0, 0);
      manager.unloadRegion(0, 0);

      expect(manager.isRegionLoaded(0, 0)).toBe(false);
    });

    it('should handle unloading non-existent region', () => {
      expect(() => manager.unloadRegion(999, 999)).not.toThrow();
    });
  });

  describe('getLoadedRegions', () => {
    it('should return all loaded regions', () => {
      manager.loadRegion(0, 0);
      manager.loadRegion(1, 0);
      manager.loadRegion(0, 1);

      const loaded = manager.getLoadedRegions();

      expect(loaded).toHaveLength(3);
    });
  });

  describe('getRegionSize', () => {
    it('should return configured region size', () => {
      expect(manager.getRegionSize()).toBe(64);
    });
  });

  describe('serialize/deserialize region', () => {
    it('should serialize and deserialize region data', () => {
      const region = manager.loadRegion(0, 0);

      // Add some tile data
      region.tiles.set('0,0,1', {
        typeId: 'grass',
        layer: 1,
        position: { x: 0, y: 0 },
        variant: 0,
      });

      const serialized = manager.serializeRegion(0, 0);
      expect(serialized).toBeDefined();
      expect(serialized?.tiles).toHaveLength(1);

      // Clear and deserialize
      manager.clear();

      if (serialized) {
        manager.deserializeRegion(serialized);
        const loaded = manager.getRegion(0, 0);
        expect(loaded?.tiles.size).toBe(1);
      }
    });
  });

  describe('clear', () => {
    it('should clear all regions', () => {
      manager.loadRegion(0, 0);
      manager.loadRegion(1, 1);

      manager.clear();

      expect(manager.getLoadedRegionCount()).toBe(0);
    });
  });
});
