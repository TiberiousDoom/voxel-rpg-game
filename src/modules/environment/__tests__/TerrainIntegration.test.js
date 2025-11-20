/**
 * TerrainIntegration.test.js - Integration tests for complete terrain system
 *
 * Tests the full terrain system integration:
 * - TerrainSystem (main integration class)
 * - Component interaction (WorldGenerator + TerrainManager + ChunkManager)
 * - Save/load integration
 * - Building placement integration (TerrainAwarePlacement)
 * - Performance with realistic workloads
 *
 * Part of Phase 1: Core Terrain Generation System
 */

import { TerrainSystem } from '../TerrainSystem.js';
import { SaveSystem } from '../SaveSystem.js';
import { TerrainAwarePlacement } from '../../foundation/TerrainAwarePlacement.js';
import GridManager from '../../foundation/GridManager.js';

describe('TerrainSystem Integration', () => {
  let terrainSystem;

  beforeEach(() => {
    terrainSystem = new TerrainSystem({
      seed: 12345,
      preset: 'DEFAULT',
      chunkSize: 32,
      tileSize: 40,
      chunkLoadRadius: 2,
      maxLoadedChunks: 100
    });
  });

  describe('Basic Integration', () => {
    it('should initialize with all components', () => {
      expect(terrainSystem).toBeDefined();
      expect(terrainSystem.worldGenerator).toBeDefined();
      expect(terrainSystem.terrainManager).toBeDefined();
      expect(terrainSystem.chunkManager).toBeDefined();
      expect(terrainSystem.seed).toBe(12345);
    });

    it('should provide unified access to all terrain operations', () => {
      // Height operations
      const height = terrainSystem.getHeight(10, 20);
      expect(height).toBeGreaterThanOrEqual(0);
      expect(height).toBeLessThanOrEqual(10);

      terrainSystem.setHeight(10, 20, 7);
      expect(terrainSystem.getHeight(10, 20)).toBe(7);

      // Biome operations
      const biome = terrainSystem.getBiome(10, 20);
      expect(biome).toBeDefined();
      expect(typeof biome).toBe('string');
    });

    it('should handle viewport updates correctly', () => {
      const result = terrainSystem.update(0, 0, 800, 600);

      expect(result).toBeDefined();
      expect(result.chunksLoaded).toBeDefined();
      expect(result.chunksUnloaded).toBeDefined();
      expect(result.chunksActive).toBeDefined();
      expect(result.updateTime).toBeDefined();
    });

    it('should track statistics across all components', () => {
      terrainSystem.update(0, 0, 800, 600);
      terrainSystem.setHeight(5, 5, 8);

      const stats = terrainSystem.getStats();

      expect(stats.terrain).toBeDefined();
      expect(stats.chunks).toBeDefined();
      expect(stats.world).toBeDefined();
      expect(stats.system).toBeDefined();
    });
  });

  describe('Region Operations', () => {
    it('should check if region is flat', () => {
      const flatCheck = terrainSystem.isRegionFlat(0, 0, 5, 5, 1);

      expect(flatCheck).toBeDefined();
      expect(flatCheck.flat).toBeDefined();
      expect(flatCheck.minHeight).toBeDefined();
      expect(flatCheck.maxHeight).toBeDefined();
      expect(flatCheck.heightDiff).toBeDefined();
    });

    it('should flatten region for building placement', () => {
      const flattenResult = terrainSystem.flattenRegion(10, 10, 3, 3);

      expect(flattenResult.success).toBe(true);
      expect(flattenResult.cellsChanged).toBeDefined();
      expect(flattenResult.flattenedTo).toBeDefined();

      // Verify region is now flat
      const flatCheck = terrainSystem.isRegionFlat(10, 10, 3, 3, 0);
      expect(flatCheck.flat).toBe(true);
      expect(flatCheck.heightDiff).toBe(0);
    });

    it('should flatten to average height by default', () => {
      const avgHeight = terrainSystem.terrainManager.getRegionAverageHeight(20, 20, 4, 4);
      const flattenResult = terrainSystem.flattenRegion(20, 20, 4, 4);

      expect(flattenResult.flattenedTo).toBeCloseTo(avgHeight, 0);

      // All tiles in region should be at average height
      for (let z = 20; z < 24; z++) {
        for (let x = 20; x < 24; x++) {
          expect(terrainSystem.getHeight(x, z)).toBe(Math.round(avgHeight));
        }
      }
    });

    it('should flatten to specific target height', () => {
      const targetHeight = 5;
      const flattenResult = terrainSystem.flattenRegion(30, 30, 5, 5, targetHeight);

      expect(flattenResult.flattenedTo).toBe(targetHeight);

      // All tiles should be at target height
      for (let z = 30; z < 35; z++) {
        for (let x = 30; x < 35; x++) {
          expect(terrainSystem.getHeight(x, z)).toBe(targetHeight);
        }
      }
    });
  });

  describe('Entity Tracking', () => {
    it('should track entities for chunk loading', () => {
      terrainSystem.trackEntity('player1', 50, 50);
      terrainSystem.update(0, 0, 800, 600);

      const stats = terrainSystem.getStats();
      expect(stats.chunks.trackedEntities).toBe(1);
    });

    it('should update entity positions', () => {
      terrainSystem.trackEntity('player1', 50, 50);
      terrainSystem.updateEntityPosition('player1', 100, 100);

      const stats = terrainSystem.getStats();
      expect(stats.chunks.trackedEntities).toBe(1);
    });

    it('should untrack entities', () => {
      terrainSystem.trackEntity('player1', 50, 50);
      terrainSystem.untrackEntity('player1');

      const stats = terrainSystem.getStats();
      expect(stats.chunks.trackedEntities).toBe(0);
    });
  });

  describe('Save/Load Integration', () => {
    it('should serialize to JSON', () => {
      terrainSystem.setHeight(10, 20, 7);
      terrainSystem.setHeight(15, 25, 8);

      const json = terrainSystem.toJSON();

      expect(json.seed).toBe(12345);
      expect(json.config).toBeDefined();
      expect(json.worldGenerator).toBeDefined();
      expect(json.terrainManager).toBeDefined();
    });

    it('should deserialize from JSON', () => {
      terrainSystem.setHeight(10, 20, 7);
      terrainSystem.setHeight(15, 25, 8);

      const json = terrainSystem.toJSON();
      const restored = TerrainSystem.fromJSON(json);

      expect(restored.seed).toBe(12345);
      expect(restored.getHeight(10, 20)).toBe(7);
      expect(restored.getHeight(15, 25)).toBe(8);
    });

    it('should maintain deterministic generation after restore', () => {
      // Get some unmodified heights
      const height1 = terrainSystem.getHeight(100, 100);
      const height2 = terrainSystem.getHeight(200, 200);
      const height3 = terrainSystem.getHeight(300, 300);

      // Modify some other tiles
      terrainSystem.setHeight(50, 50, 9);

      // Save and restore
      const json = terrainSystem.toJSON();
      const restored = TerrainSystem.fromJSON(json);

      // Unmodified tiles should regenerate identically
      expect(restored.getHeight(100, 100)).toBe(height1);
      expect(restored.getHeight(200, 200)).toBe(height2);
      expect(restored.getHeight(300, 300)).toBe(height3);

      // Modified tile should have saved value
      expect(restored.getHeight(50, 50)).toBe(9);
    });

    it('should integrate with SaveSystem', () => {
      terrainSystem.setHeight(10, 20, 7);
      terrainSystem.setHeight(15, 25, 8);

      const saveData = SaveSystem.serialize(terrainSystem);
      const restored = SaveSystem.deserialize(saveData);

      expect(restored.seed).toBe(12345);
      expect(restored.getHeight(10, 20)).toBe(7);
      expect(restored.getHeight(15, 25)).toBe(8);
    });

    it('should handle large save/load cycles', () => {
      // Create 1,000 scattered modifications
      for (let i = 0; i < 1000; i++) {
        const x = Math.floor(Math.random() * 500);
        const z = Math.floor(Math.random() * 500);
        terrainSystem.setHeight(x, z, Math.floor(Math.random() * 10));
      }

      const saveData = SaveSystem.serialize(terrainSystem);
      const restored = SaveSystem.deserialize(saveData);

      // Verify modification count
      const originalStats = terrainSystem.getStats();
      const restoredStats = restored.getStats();

      expect(restoredStats.terrain.modifications).toBe(originalStats.terrain.modifications);
    });
  });

  describe('Chunk Loading and Culling', () => {
    it('should load chunks based on viewport', () => {
      // Viewport at origin (0, 0) with size 800x600
      const result = terrainSystem.update(0, 0, 800, 600);

      expect(result.chunksActive).toBeGreaterThan(0);
      expect(result.chunksLoaded).toBeGreaterThan(0);
    });

    it('should unload chunks when moving viewport', () => {
      // Load chunks at origin
      terrainSystem.update(0, 0, 800, 600);
      const initialActive = terrainSystem.getStats().chunks.chunksActive;

      // Move far away (chunks at origin should unload)
      // Note: Chunks have a delay before unloading (60 frames by default)
      // So we need to update multiple times to trigger unloading
      for (let i = 0; i < 65; i++) {
        terrainSystem.update(5000, 5000, 800, 600);
      }

      const stats = terrainSystem.getStats();
      // Verify chunks were unloaded (fewer active chunks than initially)
      expect(stats.chunks.chunksUnloaded).toBeGreaterThan(0);
    });

    it('should respect max loaded chunks limit', () => {
      // Move around to load many chunks
      for (let i = 0; i < 20; i++) {
        const x = i * 1000;
        const z = i * 1000;
        terrainSystem.update(x, z, 800, 600);
      }

      const stats = terrainSystem.getStats();
      expect(stats.chunks.chunksActive).toBeLessThanOrEqual(100); // maxLoadedChunks
    });

    it('should generate terrain on-demand for new chunks', () => {
      // Access tile in far-away chunk
      const height = terrainSystem.getHeight(1000, 1000);

      expect(height).toBeGreaterThanOrEqual(0);
      expect(height).toBeLessThanOrEqual(10);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid viewport updates efficiently', () => {
      const updates = 60; // Simulate 60 FPS for 1 second
      const times = [];

      for (let i = 0; i < updates; i++) {
        const startTime = performance.now();
        terrainSystem.update(i * 10, i * 10, 800, 600);
        const elapsed = performance.now() - startTime;
        times.push(elapsed);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      // Average should be well under frame budget
      expect(avgTime).toBeLessThan(10); // <10ms average
      expect(maxTime).toBeLessThan(150); // <150ms max spike (test environment overhead)
    });

    it('should handle large number of modifications efficiently', () => {
      const startTime = performance.now();

      // Create 5,000 modifications
      for (let i = 0; i < 5000; i++) {
        const x = i % 100;
        const z = Math.floor(i / 100);
        terrainSystem.setHeight(x, z, 5);
      }

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000); // <1 second for 5k modifications
    });

    it('should maintain performance with mixed operations', () => {
      const startTime = performance.now();

      // Mixed workload
      for (let i = 0; i < 100; i++) {
        // Viewport update
        terrainSystem.update(i * 100, i * 100, 800, 600);

        // Height queries
        for (let j = 0; j < 10; j++) {
          terrainSystem.getHeight(i + j, i + j);
        }

        // Modifications
        terrainSystem.setHeight(i, i, 7);

        // Region operations
        if (i % 10 === 0) {
          terrainSystem.isRegionFlat(i, i, 5, 5, 1);
        }
      }

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(2000); // <2 seconds for mixed workload
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinates gracefully', () => {
      // Negative coordinates should clamp or wrap
      expect(() => {
        terrainSystem.getHeight(-10, -10);
      }).not.toThrow();
    });

    it('should handle invalid height values', () => {
      // Should clamp to valid range
      terrainSystem.setHeight(10, 10, 100);
      const height = terrainSystem.getHeight(10, 10);

      expect(height).toBeGreaterThanOrEqual(0);
      expect(height).toBeLessThanOrEqual(10);
    });

    it('should handle corrupted save data gracefully', () => {
      const badData = {
        seed: 12345,
        config: {},
        worldGenerator: null, // Corrupted
        terrainManager: null  // Corrupted
      };

      expect(() => {
        TerrainSystem.fromJSON(badData);
      }).toThrow();
    });
  });
});

describe('TerrainAwarePlacement Integration', () => {
  let terrainSystem;
  let gridManager;
  let placement;

  beforeEach(() => {
    terrainSystem = new TerrainSystem({
      seed: 12345,
      chunkSize: 32
    });

    gridManager = new GridManager(200, 50); // gridSize, gridHeight

    placement = new TerrainAwarePlacement(gridManager, terrainSystem, {
      autoFlatten: true,
      maxSlopeTolerance: 1
    });
  });

  describe('Building Placement with Terrain', () => {
    it('should place building with auto-flatten', () => {
      const building = {
        id: 'test-building-1',
        type: 'TOWN_CENTER',
        position: { x: 10, z: 10 },
        dimensions: { width: 3, depth: 3, height: 2 }
      };

      const result = placement.placeBuilding(building);

      expect(result.success).toBe(true);
      expect(result.buildingId).toBe('test-building-1');
      expect(result.flattenedTo).toBeDefined();

      // Verify terrain was flattened (use tolerance 1 since flattening uses integer heights)
      const flatCheck = terrainSystem.isRegionFlat(10, 10, 3, 3, 1);
      expect(flatCheck.flat).toBe(true);
      expect(flatCheck.heightDiff).toBeLessThanOrEqual(1);
    });

    it('should set building elevation to flattened height', () => {
      const building = {
        id: 'test-building-2',
        type: 'BARRACKS',
        position: { x: 20, z: 20 },
        dimensions: { width: 2, depth: 2, height: 2 }
      };

      const result = placement.placeBuilding(building);

      expect(result.success).toBe(true);
      expect(building.position.y).toBe(result.flattenedTo);
    });

    it('should reject placement if terrain too steep and auto-flatten disabled', () => {
      // Disable auto-flatten
      placement.setAutoFlatten(false);

      // Create steep terrain
      terrainSystem.setHeight(30, 30, 0);
      terrainSystem.setHeight(31, 30, 5);
      terrainSystem.setHeight(32, 30, 10);

      const building = {
        id: 'test-building-3',
        type: 'TOWER',
        position: { x: 30, z: 30 },
        dimensions: { width: 3, depth: 3, height: 3 }
      };

      const result = placement.placeBuilding(building);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too steep');
    });

    it('should check placement feasibility before building', () => {
      const canPlace = placement.canPlaceBuilding(
        { x: 40, z: 40 },
        { width: 2, depth: 2, height: 2 }
      );

      expect(canPlace.canPlace).toBeDefined();
      expect(canPlace.terrainInfo).toBeDefined();
    });

    it('should indicate when terrain will be flattened', () => {
      // Create non-flat terrain
      terrainSystem.setHeight(50, 50, 2);
      terrainSystem.setHeight(51, 50, 5);

      const canPlace = placement.canPlaceBuilding(
        { x: 50, z: 50 },
        { width: 2, depth: 2, height: 2 }
      );

      expect(canPlace.canPlace).toBe(true);
      expect(canPlace.willFlattenTerrain).toBe(true);
    });

    it('should work without terrain system (graceful degradation)', () => {
      const placementNoTerrain = new TerrainAwarePlacement(gridManager, null);

      const building = {
        id: 'test-building-4',
        type: 'FARM',
        position: { x: 60, z: 60 },
        dimensions: { width: 2, depth: 2, height: 1 }
      };

      const result = placementNoTerrain.placeBuilding(building);

      expect(result.success).toBe(true);
      expect(result.terrainModified).toBe(false);
      expect(building.position.y).toBe(0); // Default elevation
    });

    it('should get terrain info for building footprint', () => {
      const info = placement.getTerrainInfo(70, 70, 4, 4);

      expect(info.hasTerrainSystem).toBe(true);
      expect(info.flat).toBeDefined();
      expect(info.avgHeight).toBeDefined();
      expect(info.minHeight).toBeDefined();
      expect(info.maxHeight).toBeDefined();
      expect(info.heightDiff).toBeDefined();
    });

    it('should handle multiple buildings with terrain modification', () => {
      const buildings = [
        {
          id: 'building-1',
          type: 'HOUSE',
          position: { x: 80, z: 80 },
          dimensions: { width: 2, depth: 2, height: 2 }
        },
        {
          id: 'building-2',
          type: 'HOUSE',
          position: { x: 85, z: 80 },
          dimensions: { width: 2, depth: 2, height: 2 }
        },
        {
          id: 'building-3',
          type: 'HOUSE',
          position: { x: 90, z: 80 },
          dimensions: { width: 2, depth: 2, height: 2 }
        }
      ];

      const results = buildings.map(b => placement.placeBuilding(b));

      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.terrainModified !== undefined)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should allow changing auto-flatten setting', () => {
      expect(placement.getConfig().autoFlatten).toBe(true);

      placement.setAutoFlatten(false);

      expect(placement.getConfig().autoFlatten).toBe(false);
    });

    it('should allow overriding config per placement', () => {
      const building = {
        id: 'test-override',
        type: 'TOWER',
        position: { x: 100, z: 100 },
        dimensions: { width: 2, depth: 2, height: 3 }
      };

      // Override auto-flatten for this placement only
      const result = placement.placeBuilding(building, { autoFlatten: false, requireFlat: false });

      expect(result.success).toBe(true);
      expect(placement.getConfig().autoFlatten).toBe(true); // Config unchanged
    });
  });
});

describe('Full End-to-End Workflow', () => {
  it('should handle complete game session workflow', () => {
    // 1. Initialize terrain system
    const terrain = new TerrainSystem({ seed: 99999, chunkSize: 32 });

    // 2. Simulate player exploring world (viewport updates)
    for (let i = 0; i < 10; i++) {
      terrain.update(i * 200, i * 200, 800, 600);
    }

    // 3. Track player entity
    terrain.trackEntity('player', 100, 100);

    // 4. Initialize building system
    const grid = new GridManager(200, 50); // gridSize, gridHeight
    const placement = new TerrainAwarePlacement(grid, terrain);

    // 5. Place several buildings
    const buildings = [
      { id: 'tc', type: 'TOWN_CENTER', position: { x: 50, z: 50 }, dimensions: { width: 4, depth: 4, height: 3 } },
      { id: 'b1', type: 'BARRACKS', position: { x: 60, z: 50 }, dimensions: { width: 3, depth: 3, height: 2 } },
      { id: 'f1', type: 'FARM', position: { x: 50, z: 60 }, dimensions: { width: 2, depth: 2, height: 1 } }
    ];

    buildings.forEach(b => {
      const result = placement.placeBuilding(b);
      expect(result.success).toBe(true);
    });

    // 6. Make manual terrain modifications
    terrain.setHeight(100, 100, 8);
    terrain.setHeight(101, 100, 8);
    terrain.flattenRegion(120, 120, 5, 5, 3);

    // 7. Save game state
    const saveData = SaveSystem.serialize(terrain);
    expect(saveData.modifications.length).toBeGreaterThan(0);

    // 8. Simulate game restart - load from save
    const restored = SaveSystem.deserialize(saveData);

    // 9. Verify terrain state restored correctly
    expect(restored.getHeight(100, 100)).toBe(8);
    expect(restored.getHeight(101, 100)).toBe(8);
    expect(restored.getHeight(120, 120)).toBe(3);

    // 10. Verify deterministic generation still works
    const originalHeight = terrain.getHeight(500, 500); // Unmodified tile
    const restoredHeight = restored.getHeight(500, 500);
    expect(restoredHeight).toBe(originalHeight);

    // 11. Continue gameplay after restore
    restored.update(0, 0, 800, 600);
    restored.setHeight(200, 200, 9);

    expect(restored.getHeight(200, 200)).toBe(9);
  });
});
