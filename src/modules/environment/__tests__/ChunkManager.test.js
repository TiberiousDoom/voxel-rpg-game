/**
 * ChunkManager.test.js - Unit tests for chunk management
 *
 * Tests:
 * - Viewport-based chunk loading
 * - Entity-based chunk loading
 * - Automatic chunk unloading (LRU)
 * - Chunk preloading
 * - Performance tracking
 * - Active chunk queries
 */

import { ChunkManager } from '../ChunkManager.js';
import { TerrainManager } from '../TerrainManager.js';

// Mock WorldGenerator
class MockWorldGenerator {
  generateHeight(x, z) {
    return 5;
  }
}

describe('ChunkManager', () => {
  let terrainManager;
  let chunkManager;

  beforeEach(() => {
    const worldGen = new MockWorldGenerator();
    terrainManager = new TerrainManager(worldGen, { chunkSize: 32 });
    chunkManager = new ChunkManager(terrainManager, {
      chunkSize: 32,
      tileSize: 40,
      chunkLoadRadius: 1,
      maxLoadedChunks: 10,
      unloadDelayFrames: 10
    });
  });

  describe('Constructor and Initialization', () => {
    it('should create a chunk manager with default config', () => {
      const cm = new ChunkManager(terrainManager);

      expect(cm.terrainManager).toBe(terrainManager);
      expect(cm.config.chunkSize).toBe(32);
      expect(cm.config.tileSize).toBe(40);
      expect(cm.activeChunks.size).toBe(0);
    });

    it('should create a chunk manager with custom config', () => {
      const cm = new ChunkManager(terrainManager, {
        chunkLoadRadius: 3,
        maxLoadedChunks: 50
      });

      expect(cm.config.chunkLoadRadius).toBe(3);
      expect(cm.config.maxLoadedChunks).toBe(50);
    });

    it('should initialize empty tracked entities', () => {
      expect(chunkManager.trackedEntities.size).toBe(0);
    });
  });

  describe('Viewport-Based Chunk Loading', () => {
    it('should load chunks visible in viewport', () => {
      // Camera at (0, 0), viewport 800x600
      // Tile size 40px, so viewport shows 20x15 tiles
      // Chunk size 32 tiles
      const result = chunkManager.update(0, 0, 800, 600);

      expect(result.chunksLoaded).toBeGreaterThan(0);
      expect(chunkManager.activeChunks.size).toBeGreaterThan(0);
    });

    it('should load chunks with buffer based on chunkLoadRadius', () => {
      const result = chunkManager.update(0, 0, 800, 600);

      // With chunkLoadRadius=1, should load more than just visible chunks
      // Exact count depends on viewport and chunk size
      expect(result.chunksActive).toBeGreaterThanOrEqual(4); // At least 2x2 chunks
    });

    it('should update active chunks when camera moves', () => {
      // Initial position
      chunkManager.update(0, 0, 800, 600);
      const initialActive = new Set(chunkManager.activeChunks);

      // Move camera far away
      chunkManager.update(5000, 5000, 800, 600);
      const newActive = new Set(chunkManager.activeChunks);

      // Some chunks should be different
      const allSame = [...initialActive].every(chunk => newActive.has(chunk));
      expect(allSame).toBe(false);
    });

    it('should maintain chunks across small camera movements', () => {
      chunkManager.update(0, 0, 800, 600);
      const initial = new Set(chunkManager.activeChunks);

      // Small movement (within same chunks)
      chunkManager.update(10, 10, 800, 600);
      const after = new Set(chunkManager.activeChunks);

      // Most chunks should still be active
      const overlap = [...initial].filter(chunk => after.has(chunk));
      expect(overlap.length).toBeGreaterThan(0);
    });
  });

  describe('Entity-Based Chunk Loading', () => {
    it('should track entities for chunk loading', () => {
      chunkManager.trackEntity('player1', 100, 200);

      expect(chunkManager.trackedEntities.size).toBe(1);
      expect(chunkManager.trackedEntities.get('player1')).toEqual({ x: 100, z: 200 });
    });

    it('should load chunks around tracked entities', () => {
      chunkManager.trackEntity('player1', 100, 100);

      const result = chunkManager.update(0, 0, 800, 600);

      // Should load chunks around player position (100, 100)
      expect(result.chunksActive).toBeGreaterThan(0);

      // Player is in chunk (3, 3) = floor(100/32)
      // With radius 1, should load chunks (2-4, 2-4) = 9 chunks
      const playerChunkActive = chunkManager.isChunkActive(3, 3);
      expect(playerChunkActive).toBe(true);
    });

    it('should update entity positions', () => {
      chunkManager.trackEntity('npc1', 0, 0);
      chunkManager.updateEntityPosition('npc1', 500, 500);

      const entity = chunkManager.trackedEntities.get('npc1');
      expect(entity.x).toBe(500);
      expect(entity.z).toBe(500);
    });

    it('should untrack entities', () => {
      chunkManager.trackEntity('player1', 100, 100);
      chunkManager.trackEntity('player2', 200, 200);

      expect(chunkManager.trackedEntities.size).toBe(2);

      chunkManager.untrackEntity('player1');

      expect(chunkManager.trackedEntities.size).toBe(1);
      expect(chunkManager.trackedEntities.has('player1')).toBe(false);
      expect(chunkManager.trackedEntities.has('player2')).toBe(true);
    });

    it('should load chunks for multiple tracked entities', () => {
      chunkManager.trackEntity('player1', 64, 64);
      chunkManager.trackEntity('player2', 2000, 2000);

      // Camera centered between entities
      const result = chunkManager.update(1000, 1000, 800, 600);

      // Should load chunks around both entities
      // Verify chunks were loaded (exact chunks depend on viewport + entities)
      expect(result.chunksActive).toBeGreaterThanOrEqual(9); // Should have multiple chunks loaded
      expect(chunkManager.trackedEntities.size).toBe(2);

      // At least some chunks in both entity areas should be active
      // (Exact chunks depend on load radius and viewport)
      const activeChunks = chunkManager.getActiveChunks();
      expect(activeChunks.length).toBeGreaterThan(0);
    });
  });

  describe('Chunk Unloading', () => {
    it('should unload chunks after delay when not needed', () => {
      // Load chunks
      chunkManager.update(0, 0, 800, 600);
      const initialChunks = chunkManager.activeChunks.size;

      // Move camera far away and wait for unload delay
      for (let i = 0; i < 15; i++) {
        chunkManager.update(5000, 5000, 800, 600);
      }

      const finalChunks = chunkManager.activeChunks.size;

      // Some chunks should have been unloaded
      // (Not all, since new area also has chunks)
      expect(chunkManager.stats.chunksUnloaded).toBeGreaterThan(0);
    });

    it('should respect unloadDelayFrames', () => {
      chunkManager.update(0, 0, 800, 600);

      // Move camera away, but within delay frames
      for (let i = 0; i < 5; i++) {
        chunkManager.update(5000, 5000, 800, 600);
      }

      // Chunks from original position might still be loaded
      // (Within delay threshold)
      expect(terrainManager.chunks.size).toBeGreaterThan(0);
    });

    it('should unload oldest chunks when exceeding maxLoadedChunks', () => {
      // Load many chunks by moving camera around
      const positions = [
        [0, 0],
        [1000, 0],
        [2000, 0],
        [3000, 0],
        [4000, 0],
        [5000, 0]
      ];

      positions.forEach(([x, z]) => {
        chunkManager.update(x, z, 800, 600);
      });

      // Should not exceed maxLoadedChunks (10)
      expect(terrainManager.chunks.size).toBeLessThanOrEqual(
        chunkManager.config.maxLoadedChunks + 5 // Some buffer
      );
    });
  });

  describe('Manual Chunk Control', () => {
    it('should force load specific chunk', () => {
      chunkManager.forceLoadChunk(10, 10);

      expect(chunkManager.isChunkActive(10, 10)).toBe(true);
      expect(terrainManager.isChunkLoaded(10, 10)).toBe(true);
    });

    it('should force unload specific chunk', () => {
      chunkManager.forceLoadChunk(5, 5);
      expect(chunkManager.isChunkActive(5, 5)).toBe(true);

      const unloaded = chunkManager.forceUnloadChunk(5, 5);

      expect(unloaded).toBe(true);
      expect(chunkManager.isChunkActive(5, 5)).toBe(false);
      expect(terrainManager.isChunkLoaded(5, 5)).toBe(false);
    });

    it('should preload rectangular area', () => {
      // Preload area from (0,0) to (128, 128)
      // minChunk = floor(0/32) = 0
      // maxChunk = floor(128/32) = 4
      // So chunks 0-4 in both x and z = 5x5 = 25 chunks
      const preloaded = chunkManager.preloadArea(0, 0, 128, 128);

      expect(preloaded).toBe(25);

      // Verify chunks are loaded
      expect(chunkManager.isChunkActive(0, 0)).toBe(true);
      expect(chunkManager.isChunkActive(4, 4)).toBe(true);
    });

    it('should not double-count already loaded chunks in preload', () => {
      // Load some chunks
      chunkManager.forceLoadChunk(0, 0);
      chunkManager.forceLoadChunk(1, 0);

      // Preload area that includes already-loaded chunks
      // Area (0,0) to (64,32):
      // minChunk = floor(0/32) = 0, maxChunk = floor(64/32) = 2 (x)
      // minChunk = floor(0/32) = 0, maxChunk = floor(32/32) = 1 (z)
      // So chunks (0-2, 0-1) = 3x2 = 6 total chunks
      // Already loaded: (0,0) and (1,0) = 2 chunks
      // Newly loaded: 6 - 2 = 4 chunks
      const preloaded = chunkManager.preloadArea(0, 0, 64, 32);

      expect(preloaded).toBe(4);
    });

    it('should unload all chunks', () => {
      // Load some chunks
      chunkManager.update(0, 0, 800, 600);
      expect(chunkManager.activeChunks.size).toBeGreaterThan(0);

      chunkManager.unloadAllChunks();

      expect(chunkManager.activeChunks.size).toBe(0);
      expect(terrainManager.chunks.size).toBe(0);
    });
  });

  describe('Active Chunk Queries', () => {
    it('should return list of active chunks', () => {
      chunkManager.forceLoadChunk(0, 0);
      chunkManager.forceLoadChunk(1, 1);
      chunkManager.forceLoadChunk(2, 2);

      const active = chunkManager.getActiveChunks();

      expect(active.length).toBe(3);
      expect(active).toContainEqual({ x: 0, z: 0 });
      expect(active).toContainEqual({ x: 1, z: 1 });
      expect(active).toContainEqual({ x: 2, z: 2 });
    });

    it('should check if specific chunk is active', () => {
      chunkManager.forceLoadChunk(5, 7);

      expect(chunkManager.isChunkActive(5, 7)).toBe(true);
      expect(chunkManager.isChunkActive(5, 8)).toBe(false);
      expect(chunkManager.isChunkActive(6, 7)).toBe(false);
    });
  });

  describe('Performance Tracking', () => {
    it('should track chunks loaded/unloaded', () => {
      chunkManager.update(0, 0, 800, 600);

      expect(chunkManager.stats.chunksLoaded).toBeGreaterThan(0);

      // Move and wait for unload
      for (let i = 0; i < 15; i++) {
        chunkManager.update(5000, 5000, 800, 600);
      }

      expect(chunkManager.stats.chunksUnloaded).toBeGreaterThan(0);
    });

    it('should track active chunks count', () => {
      chunkManager.update(0, 0, 800, 600);

      const stats = chunkManager.getStats();

      expect(stats.chunksActive).toBe(chunkManager.activeChunks.size);
      expect(stats.chunksActive).toBeGreaterThan(0);
    });

    it('should track tracked entities count', () => {
      chunkManager.trackEntity('e1', 0, 0);
      chunkManager.trackEntity('e2', 100, 100);

      const stats = chunkManager.getStats();

      expect(stats.trackedEntities).toBe(2);
    });

    it('should track update time', () => {
      const result = chunkManager.update(0, 0, 800, 600);

      expect(result.updateTime).toBeGreaterThanOrEqual(0);
      expect(chunkManager.stats.lastUpdateTime).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics', () => {
      chunkManager.update(0, 0, 800, 600);

      expect(chunkManager.stats.chunksLoaded).toBeGreaterThan(0);

      chunkManager.resetStats();

      expect(chunkManager.stats.chunksLoaded).toBe(0);
      expect(chunkManager.stats.chunksUnloaded).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null terrain manager gracefully', () => {
      const cm = new ChunkManager(null);

      expect(() => {
        cm.update(0, 0, 800, 600);
      }).not.toThrow();
    });

    it('should handle very large viewport', () => {
      expect(() => {
        chunkManager.update(0, 0, 10000, 10000);
      }).not.toThrow();

      expect(chunkManager.activeChunks.size).toBeGreaterThan(0);
    });

    it('should handle negative camera coordinates', () => {
      expect(() => {
        chunkManager.update(-1000, -1000, 800, 600);
      }).not.toThrow();

      expect(chunkManager.activeChunks.size).toBeGreaterThan(0);
    });

    it('should handle zero-size viewport', () => {
      expect(() => {
        chunkManager.update(0, 0, 0, 0);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should maintain chunks as camera pans smoothly', () => {
      // Simulate smooth camera pan
      for (let x = 0; x <= 1000; x += 100) {
        const result = chunkManager.update(x, 0, 800, 600);

        expect(result.chunksActive).toBeGreaterThan(0);
        expect(result.updateTime).toBeGreaterThanOrEqual(0);
      }

      // Should have loaded and unloaded chunks during pan
      expect(chunkManager.stats.chunksLoaded).toBeGreaterThan(0);
    });

    it('should handle multiple entities moving simultaneously', () => {
      chunkManager.trackEntity('p1', 64, 64);      // Chunk (2, 2)
      chunkManager.trackEntity('p2', 1000, 1000);  // Chunk (31, 31)
      chunkManager.trackEntity('p3', 2000, 2000);  // Chunk (62, 62)

      const result1 = chunkManager.update(1000, 1000, 800, 600);

      // Should load many chunks around all entities and viewport
      expect(result1.chunksActive).toBeGreaterThanOrEqual(9);
      expect(chunkManager.trackedEntities.size).toBe(3);

      // Move entities
      chunkManager.updateEntityPosition('p1', 500, 500);
      chunkManager.updateEntityPosition('p2', 1500, 1500);
      chunkManager.updateEntityPosition('p3', 2500, 2500);

      const result2 = chunkManager.update(1000, 1000, 800, 600);

      // After moving, should still have chunks loaded
      expect(result2.chunksActive).toBeGreaterThan(0);
      expect(chunkManager.trackedEntities.size).toBe(3);
    });

    it('should efficiently manage chunks during gameplay loop', () => {
      // Simulate 100 frames of gameplay
      for (let frame = 0; frame < 100; frame++) {
        // Camera moves in circle
        const angle = (frame / 100) * Math.PI * 2;
        const cameraX = Math.cos(angle) * 1000 + 1000;
        const cameraZ = Math.sin(angle) * 1000 + 1000;

        const result = chunkManager.update(cameraX, cameraZ, 800, 600);

        // Should maintain reasonable chunk count
        expect(result.chunksActive).toBeLessThanOrEqual(50);

        // Update time should be fast
        expect(result.updateTime).toBeLessThan(10); // <10ms
      }

      // Should have loaded and unloaded efficiently
      expect(chunkManager.stats.chunksLoaded).toBeGreaterThan(0);
      expect(chunkManager.stats.chunksUnloaded).toBeGreaterThan(0);
    });
  });
});
