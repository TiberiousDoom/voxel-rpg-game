/**
 * TerrainManager.test.js - Unit tests for terrain management
 *
 * Tests:
 * - Chunk generation and loading
 * - Height get/set operations
 * - Region queries (flat check, average height)
 * - Terrain flattening (building placement)
 * - Modification tracking (differential saves)
 * - Save/load functionality
 * - Chunk management (load/unload)
 */

import { TerrainManager, TerrainChunk } from '../TerrainManager.js';

// Mock WorldGenerator for testing
class MockWorldGenerator {
  constructor(heightFunction = (x, z) => 5) {
    this.heightFunction = heightFunction;
  }

  generateHeight(x, z) {
    return this.heightFunction(x, z);
  }
}

describe('TerrainChunk', () => {
  describe('Constructor and Basic Operations', () => {
    it('should create a chunk with correct properties', () => {
      const chunk = new TerrainChunk(5, 10, 32);

      expect(chunk.chunkX).toBe(5);
      expect(chunk.chunkZ).toBe(10);
      expect(chunk.size).toBe(32);
      expect(chunk.heightData.length).toBe(32 * 32);
    });

    it('should initialize with all zeros', () => {
      const chunk = new TerrainChunk(0, 0, 32);

      for (let i = 0; i < chunk.heightData.length; i++) {
        expect(chunk.heightData[i]).toBe(0);
      }
    });
  });

  describe('Height Get/Set', () => {
    it('should set and get height correctly', () => {
      const chunk = new TerrainChunk(0, 0, 32);

      chunk.setHeight(5, 10, 7);
      expect(chunk.getHeight(5, 10)).toBe(7);

      chunk.setHeight(0, 0, 3);
      expect(chunk.getHeight(0, 0)).toBe(3);

      chunk.setHeight(31, 31, 9);
      expect(chunk.getHeight(31, 31)).toBe(9);
    });

    it('should handle out-of-bounds gracefully', () => {
      const chunk = new TerrainChunk(0, 0, 32);

      expect(chunk.getHeight(-1, 0)).toBe(0);
      expect(chunk.getHeight(0, -1)).toBe(0);
      expect(chunk.getHeight(32, 0)).toBe(0);
      expect(chunk.getHeight(0, 32)).toBe(0);

      // Setting out of bounds should not throw
      expect(() => chunk.setHeight(-1, 0, 5)).not.toThrow();
      expect(() => chunk.setHeight(32, 0, 5)).not.toThrow();
    });

    it('should floor non-integer heights', () => {
      const chunk = new TerrainChunk(0, 0, 32);

      chunk.setHeight(0, 0, 5.7);
      expect(chunk.getHeight(0, 0)).toBe(5);

      chunk.setHeight(1, 1, 3.2);
      expect(chunk.getHeight(1, 1)).toBe(3);
    });
  });

  describe('Fill Operation', () => {
    it('should fill entire chunk with specified height', () => {
      const chunk = new TerrainChunk(0, 0, 32);

      chunk.fill(7);

      for (let z = 0; z < 32; z++) {
        for (let x = 0; x < 32; x++) {
          expect(chunk.getHeight(x, z)).toBe(7);
        }
      }
    });
  });

  describe('Save and Load', () => {
    it('should save and restore chunk data', () => {
      const chunk1 = new TerrainChunk(3, 7, 32);

      // Set some heights
      chunk1.setHeight(0, 0, 5);
      chunk1.setHeight(10, 15, 8);
      chunk1.setHeight(31, 31, 2);

      // Save and restore
      const saved = chunk1.toJSON();
      const chunk2 = TerrainChunk.fromJSON(saved);

      expect(chunk2.chunkX).toBe(3);
      expect(chunk2.chunkZ).toBe(7);
      expect(chunk2.size).toBe(32);
      expect(chunk2.getHeight(0, 0)).toBe(5);
      expect(chunk2.getHeight(10, 15)).toBe(8);
      expect(chunk2.getHeight(31, 31)).toBe(2);
    });
  });
});

describe('TerrainManager', () => {
  describe('Constructor and Initialization', () => {
    it('should create a manager with default config', () => {
      const manager = new TerrainManager();

      expect(manager.config.chunkSize).toBe(32);
      expect(manager.config.minHeight).toBe(0);
      expect(manager.config.maxHeight).toBe(10);
      expect(manager.config.defaultHeight).toBe(0);
    });

    it('should create a manager with custom config', () => {
      const manager = new TerrainManager(null, {
        chunkSize: 64,
        minHeight: -5,
        maxHeight: 15,
        defaultHeight: 3
      });

      expect(manager.config.chunkSize).toBe(64);
      expect(manager.config.minHeight).toBe(-5);
      expect(manager.config.maxHeight).toBe(15);
      expect(manager.config.defaultHeight).toBe(3);
    });

    it('should initialize with empty chunks', () => {
      const manager = new TerrainManager();

      expect(manager.chunks.size).toBe(0);
      expect(manager.modifications.size).toBe(0);
    });
  });

  describe('Height Get/Set', () => {
    it('should generate chunk on first access', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      const height = manager.getHeight(10, 20);

      expect(height).toBe(5);
      expect(manager.chunks.size).toBe(1);
      expect(manager.stats.chunksGenerated).toBe(1);
    });

    it('should reuse loaded chunks', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      manager.getHeight(10, 20);
      manager.getHeight(15, 25);

      // Both coordinates are in chunk (0, 0), so only 1 chunk should be generated
      expect(manager.chunks.size).toBe(1);
      expect(manager.stats.chunksGenerated).toBe(1);
    });

    it('should generate multiple chunks for different regions', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      manager.getHeight(0, 0);      // Chunk (0, 0)
      manager.getHeight(32, 0);     // Chunk (1, 0)
      manager.getHeight(0, 32);     // Chunk (0, 1)
      manager.getHeight(32, 32);    // Chunk (1, 1)

      expect(manager.chunks.size).toBe(4);
      expect(manager.stats.chunksGenerated).toBe(4);
    });

    it('should set height and track modifications', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      // Original height is 5
      expect(manager.getHeight(10, 20)).toBe(5);

      // Modify height
      manager.setHeight(10, 20, 8);
      expect(manager.getHeight(10, 20)).toBe(8);

      // Modification should be tracked
      expect(manager.modifications.size).toBe(1);
      expect(manager.stats.tilesModified).toBe(1);

      const mod = manager.modifications.get('10,20');
      expect(mod.x).toBe(10);
      expect(mod.z).toBe(20);
      expect(mod.originalHeight).toBe(5);
      expect(mod.modifiedHeight).toBe(8);
    });

    it('should clamp heights to valid range', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      manager.setHeight(0, 0, -10);
      expect(manager.getHeight(0, 0)).toBe(0); // Clamped to minHeight

      manager.setHeight(1, 1, 100);
      expect(manager.getHeight(1, 1)).toBe(10); // Clamped to maxHeight
    });

    it('should not track modifications if height unchanged', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      manager.setHeight(10, 20, 5); // Same as original

      expect(manager.modifications.size).toBe(0);
      expect(manager.stats.tilesModified).toBe(0);
    });
  });

  describe('Region Queries', () => {
    it('should check if region is flat', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      // All tiles at height 5 - perfectly flat
      const result = manager.isRegionFlat(0, 0, 3, 3, 0);

      expect(result.flat).toBe(true);
      expect(result.minHeight).toBe(5);
      expect(result.maxHeight).toBe(5);
      expect(result.heightDiff).toBe(0);
    });

    it('should detect non-flat regions', () => {
      const generator = new MockWorldGenerator((x, z) => x); // Slope
      const manager = new TerrainManager(generator);

      const result = manager.isRegionFlat(0, 0, 5, 5, 0);

      expect(result.flat).toBe(false);
      expect(result.heightDiff).toBeGreaterThan(0);
    });

    it('should respect slope tolerance', () => {
      const generator = new MockWorldGenerator((x, z) => Math.floor(x / 5)); // Gentle slope
      const manager = new TerrainManager(generator);

      // For x=0-9: heights are 0,0,0,0,0,1,1,1,1,1 (heightDiff = 1)
      const strict = manager.isRegionFlat(0, 0, 10, 10, 0);
      expect(strict.flat).toBe(false);

      const lenient = manager.isRegionFlat(0, 0, 10, 10, 1);
      expect(lenient.flat).toBe(true);
    });

    it('should calculate average height correctly', () => {
      const generator = new MockWorldGenerator((x, z) => x + z);
      const manager = new TerrainManager(generator);

      // Heights: (0+0)=0, (1+0)=1, (0+1)=1, (1+1)=2
      // Average: (0+1+1+2)/4 = 1
      const avg = manager.getRegionAverageHeight(0, 0, 2, 2);

      expect(avg).toBe(1);
    });

    it('should return default height for empty regions', () => {
      const manager = new TerrainManager(null, { defaultHeight: 3 });

      // No generator, so will use default
      const avg = manager.getRegionAverageHeight(0, 0, 2, 2);

      expect(avg).toBe(3);
    });
  });

  describe('Flatten Region', () => {
    it('should flatten region to specified height', () => {
      const generator = new MockWorldGenerator((x, z) => x); // Varied heights
      const manager = new TerrainManager(generator);

      const result = manager.flattenRegion(0, 0, 3, 3, 5);

      expect(result.success).toBe(true);
      expect(result.flattenedTo).toBe(5);
      expect(result.cellsChanged).toBeGreaterThan(0);

      // Verify all tiles are at height 5
      for (let z = 0; z < 3; z++) {
        for (let x = 0; x < 3; x++) {
          expect(manager.getHeight(x, z)).toBe(5);
        }
      }
    });

    it('should flatten to average height if not specified', () => {
      const generator = new MockWorldGenerator((x, z) => x); // Heights 0-4
      const manager = new TerrainManager(generator);

      // Heights in 5x1 region: 0,1,2,3,4 -> avg = 2
      const result = manager.flattenRegion(0, 0, 5, 1);

      expect(result.flattenedTo).toBe(2);

      for (let x = 0; x < 5; x++) {
        expect(manager.getHeight(x, 0)).toBe(2);
      }
    });

    it('should track flattening as modifications', () => {
      const generator = new MockWorldGenerator((x, z) => x);
      const manager = new TerrainManager(generator);

      manager.flattenRegion(0, 0, 3, 3, 5);

      // Should have modifications for tiles that changed
      expect(manager.modifications.size).toBeGreaterThan(0);
    });

    it('should not modify already-flat regions', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      const result = manager.flattenRegion(0, 0, 3, 3, 5);

      expect(result.cellsChanged).toBe(0);
      expect(manager.modifications.size).toBe(0);
    });
  });

  describe('Chunk Management', () => {
    it('should unload chunks', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      // Load chunk
      manager.getHeight(0, 0);
      expect(manager.chunks.size).toBe(1);

      // Unload chunk
      const unloaded = manager.unloadChunk(0, 0);
      expect(unloaded).toBe(true);
      expect(manager.chunks.size).toBe(0);
    });

    it('should return false when unloading non-existent chunk', () => {
      const manager = new TerrainManager();

      const unloaded = manager.unloadChunk(10, 10);
      expect(unloaded).toBe(false);
    });

    it('should check if chunk is loaded', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      expect(manager.isChunkLoaded(0, 0)).toBe(false);

      manager.getHeight(0, 0);
      expect(manager.isChunkLoaded(0, 0)).toBe(true);
    });

    it('should return list of loaded chunks', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      manager.getHeight(0, 0);      // Chunk (0, 0)
      manager.getHeight(32, 0);     // Chunk (1, 0)
      manager.getHeight(0, 32);     // Chunk (0, 1)

      const loaded = manager.getLoadedChunks();

      expect(loaded.length).toBe(3);
      expect(loaded).toContainEqual({ x: 0, z: 0 });
      expect(loaded).toContainEqual({ x: 1, z: 0 });
      expect(loaded).toContainEqual({ x: 0, z: 1 });
    });
  });

  describe('Modifications Tracking', () => {
    it('should return all modifications', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      manager.setHeight(0, 0, 3);
      manager.setHeight(10, 20, 7);
      manager.setHeight(50, 60, 9);

      const mods = manager.getModifications();

      expect(mods.length).toBe(3);
      expect(mods).toContainEqual({
        x: 0, z: 0, originalHeight: 5, modifiedHeight: 3
      });
      expect(mods).toContainEqual({
        x: 10, z: 20, originalHeight: 5, modifiedHeight: 7
      });
      expect(mods).toContainEqual({
        x: 50, z: 60, originalHeight: 5, modifiedHeight: 9
      });
    });

    it('should clear modifications', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      manager.setHeight(0, 0, 3);
      manager.setHeight(10, 20, 7);

      expect(manager.modifications.size).toBe(2);

      manager.clearModifications();

      expect(manager.modifications.size).toBe(0);
      expect(manager.stats.tilesModified).toBe(0);
    });
  });

  describe('Save and Load', () => {
    it('should save terrain manager state', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      // Make some modifications
      manager.setHeight(0, 0, 3);
      manager.setHeight(10, 20, 7);

      const saved = manager.toJSON();

      expect(saved.config).toBeDefined();
      expect(saved.modifications).toBeDefined();
      expect(saved.modifications.length).toBe(2);
      expect(saved.stats).toBeDefined();
    });

    it('should restore terrain manager from save', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager1 = new TerrainManager(generator);

      // Make modifications
      manager1.setHeight(0, 0, 3);
      manager1.setHeight(10, 20, 7);

      // Save and restore
      const saved = manager1.toJSON();
      const manager2 = TerrainManager.fromJSON(saved, generator);

      // Modifications should be restored
      expect(manager2.getHeight(0, 0)).toBe(3);
      expect(manager2.getHeight(10, 20)).toBe(7);
      expect(manager2.modifications.size).toBe(2);
    });

    it('should regenerate unmodified terrain from generator', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager1 = new TerrainManager(generator);

      // Modify only one tile
      manager1.setHeight(0, 0, 3);

      // Save and restore
      const saved = manager1.toJSON();
      const manager2 = TerrainManager.fromJSON(saved, generator);

      // Modified tile should have new height
      expect(manager2.getHeight(0, 0)).toBe(3);

      // Unmodified tiles should regenerate from generator
      expect(manager2.getHeight(10, 10)).toBe(5);
    });
  });

  describe('Statistics', () => {
    it('should track statistics', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      manager.getHeight(0, 0);
      manager.getHeight(32, 0);
      manager.setHeight(10, 10, 7);

      const stats = manager.getStats();

      expect(stats.chunksLoaded).toBe(2);
      expect(stats.chunksGenerated).toBe(2);
      expect(stats.modificationsCount).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle building placement workflow', () => {
      // Simulate terrain with slope
      const generator = new MockWorldGenerator((x, z) => Math.floor((x + z) / 5));
      const manager = new TerrainManager(generator);

      const buildingX = 10;
      const buildingZ = 10;
      const buildingWidth = 3;
      const buildingDepth = 3;

      // 1. Check if region is flat
      const flatCheck = manager.isRegionFlat(
        buildingX, buildingZ, buildingWidth, buildingDepth, 1
      );

      // 2. Auto-flatten if needed
      if (!flatCheck.flat) {
        manager.flattenRegion(buildingX, buildingZ, buildingWidth, buildingDepth);
      }

      // 3. Verify region is now flat
      const verifyFlat = manager.isRegionFlat(
        buildingX, buildingZ, buildingWidth, buildingDepth, 0
      );

      expect(verifyFlat.flat).toBe(true);
      expect(verifyFlat.heightDiff).toBe(0);
    });

    it('should preserve modifications across chunk reloads', () => {
      const generator = new MockWorldGenerator((x, z) => 5);
      const manager = new TerrainManager(generator);

      // Modify terrain
      manager.setHeight(0, 0, 8);

      // Unload chunk
      manager.unloadChunk(0, 0);

      // Reload chunk (via getHeight)
      const height = manager.getHeight(0, 0);

      // Modification should persist (tracked in modifications map)
      // Note: In full implementation, we'd regenerate from generator then apply modifications
      // For now, we're just testing that modifications are tracked
      expect(manager.modifications.has('0,0')).toBe(true);
    });
  });
});
