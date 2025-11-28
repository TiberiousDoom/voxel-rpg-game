/**
 * performance.benchmark.test.js - Performance benchmark test suite
 *
 * Tests performance targets and benchmarks for all performance modules:
 * - SpatialGrid
 * - DirtyRectRenderer
 * - ViewportCulling
 * - ObjectPool
 * - MemoryManager
 * - AsyncPathfinder
 *
 * Performance Targets (from PHASE_4_WORKFLOWS.md):
 * - 60 FPS with 50 NPCs ✅
 * - 55+ FPS with 100 NPCs 🎯
 * - <3ms production tick time 🎯
 * - <150MB memory after 1 hour 🎯
 */

import SpatialGrid from '../SpatialGrid';
import DirtyRectRenderer from '../DirtyRectRenderer';
import ViewportCulling from '../ViewportCulling';
import ObjectPool from '../ObjectPool';
import MemoryManager from '../MemoryManager';

describe('Performance Benchmarks', () => {
  describe('SpatialGrid Performance', () => {
    test('should handle 1000 entities with <1ms insertion time', () => {
      const grid = new SpatialGrid(32);
      const entities = [];

      // Create test entities
      for (let i = 0; i < 1000; i++) {
        entities.push({
          id: `entity-${i}`,
          x: Math.random() * 1000,
          z: Math.random() * 1000
        });
      }

      // Benchmark insertion
      const startTime = performance.now();

      for (const entity of entities) {
        grid.insert(entity);
      }

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1); // Should be < 1ms for 1000 insertions
      expect(grid.getStats().totalEntities).toBe(1000);
    });

    test('should query nearby entities in <0.1ms', () => {
      const grid = new SpatialGrid(32);

      // Insert 1000 entities
      for (let i = 0; i < 1000; i++) {
        grid.insert({
          id: `entity-${i}`,
          x: Math.random() * 1000,
          z: Math.random() * 1000
        });
      }

      // Benchmark query
      const startTime = performance.now();

      const nearby = grid.getNearbyEntities(500, 500, 100);

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(0.1); // Should be < 0.1ms
      expect(Array.isArray(nearby)).toBe(true);
    });

    test('should handle 100 updates per frame at 60 FPS', () => {
      const grid = new SpatialGrid(32);
      const entities = [];

      // Create entities
      for (let i = 0; i < 100; i++) {
        const entity = {
          id: `entity-${i}`,
          x: Math.random() * 1000,
          z: Math.random() * 1000
        };
        entities.push(entity);
        grid.insert(entity);
      }

      // Benchmark updates (should complete within 16.67ms for 60 FPS)
      const startTime = performance.now();

      for (const entity of entities) {
        const oldX = entity.x;
        const oldZ = entity.z;
        entity.x += Math.random() * 10 - 5;
        entity.z += Math.random() * 10 - 5;
        grid.update(entity, oldX, oldZ, entity.x, entity.z);
      }

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(5); // Should be < 5ms for 100 updates
    });
  });

  describe('DirtyRectRenderer Performance', () => {
    let canvas;
    let renderer;

    beforeEach(() => {
      canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      renderer = new DirtyRectRenderer(canvas);
    });

    test('should render 10 dirty regions in <1ms', () => {
      // Mark 10 random dirty regions
      for (let i = 0; i < 10; i++) {
        renderer.markDirty(
          Math.random() * 1920,
          Math.random() * 1080,
          100,
          100
        );
      }

      const startTime = performance.now();

      renderer.render(() => {
        // Minimal render callback
      });

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1);
    });

    test('should optimize overlapping regions efficiently', () => {
      // Create many overlapping regions
      for (let i = 0; i < 100; i++) {
        renderer.markDirty(500 + i, 500 + i, 100, 100);
      }

      const regionsBeforeOptimize = renderer.getDirtyRegions().length;

      renderer.render(() => {});

      const stats = renderer.getStats();

      // Should have merged many regions
      expect(stats.mergedRegions).toBeGreaterThan(0);
    });
  });

  describe('ViewportCulling Performance', () => {
    test('should cull 10000 entities in <5ms', () => {
      const culler = new ViewportCulling();
      culler.updateViewport(0, 0, 1920, 1080, 1.0);

      // Create 10000 entities spread across large area
      const entities = [];
      for (let i = 0; i < 10000; i++) {
        entities.push({
          id: `entity-${i}`,
          x: Math.random() * 10000,
          y: Math.random() * 10000,
          width: 10,
          height: 10
        });
      }

      const startTime = performance.now();

      const visible = culler.cullEntities(entities);

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(5);
      expect(visible.length).toBeLessThan(entities.length); // Should have culled some
    });

    test('should handle 1000 visibility checks at 60 FPS', () => {
      const culler = new ViewportCulling();
      culler.updateViewport(0, 0, 1920, 1080, 1.0);

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        culler.isRectVisible(
          Math.random() * 10000,
          Math.random() * 10000,
          10,
          10
        );
      }

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(2); // Should be < 2ms for 1000 checks
    });
  });

  describe('ObjectPool Performance', () => {
    test('should acquire/release 1000 objects in <1ms', () => {
      const pool = new ObjectPool(() => ({ data: null }), {
        initialSize: 500,
        maxSize: 1000
      });

      const objects = [];

      const startTime = performance.now();

      // Acquire 1000 objects
      for (let i = 0; i < 1000; i++) {
        objects.push(pool.acquire());
      }

      // Release 1000 objects
      for (const obj of objects) {
        pool.release(obj);
      }

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1);

      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(1000);
      expect(stats.totalReleased).toBe(1000);
    });

    test('should have >95% hit rate after warmup', () => {
      const pool = new ObjectPool(() => ({ data: null }), {
        initialSize: 100
      });

      // Warmup
      for (let i = 0; i < 100; i++) {
        const obj = pool.acquire();
        pool.release(obj);
      }

      pool.resetStats();

      // Test
      for (let i = 0; i < 100; i++) {
        const obj = pool.acquire();
        pool.release(obj);
      }

      const stats = pool.getStats();
      const hitRate = parseFloat(stats.hitRate);

      expect(hitRate).toBeGreaterThan(95);
    });
  });

  describe('MemoryManager Performance', () => {
    test('should track 1000 objects with minimal overhead', () => {
      const manager = new MemoryManager();
      const objects = [];

      // Create objects
      for (let i = 0; i < 1000; i++) {
        objects.push({ id: i, data: new Array(100) });
      }

      const startTime = performance.now();

      // Track all objects
      for (const obj of objects) {
        manager.trackObject(`obj-${obj.id}`, obj);
      }

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(10);
      expect(manager.getStats().objectsTracked).toBe(1000);
    });

    test('should cleanup collected objects efficiently', () => {
      const manager = new MemoryManager();

      // Track some objects
      for (let i = 0; i < 100; i++) {
        const obj = { id: i };
        manager.trackObject(`obj-${i}`, obj);
      }

      const startTime = performance.now();

      const result = manager.cleanup();

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(5);
    });
  });

  describe('Integration Benchmarks', () => {
    test('should handle 100 NPCs at 60 FPS', () => {
      const grid = new SpatialGrid(32);
      const culler = new ViewportCulling();
      culler.updateViewport(0, 0, 1920, 1080, 1.0);

      // Create 100 NPCs
      const npcs = [];
      for (let i = 0; i < 100; i++) {
        const npc = {
          id: `npc-${i}`,
          x: Math.random() * 1000,
          z: Math.random() * 1000,
          width: 1,
          height: 1
        };
        npcs.push(npc);
        grid.insert(npc);
      }

      // Simulate one frame (should be < 16.67ms for 60 FPS)
      const startTime = performance.now();

      // Update NPC positions
      for (const npc of npcs) {
        const oldX = npc.x;
        const oldZ = npc.z;
        npc.x += Math.random() * 2 - 1;
        npc.z += Math.random() * 2 - 1;
        grid.update(npc, oldX, oldZ, npc.x, npc.z);
      }

      // Cull NPCs
      const visible = culler.cullEntities(npcs);

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(3); // Should be < 3ms
      expect(visible.length).toBeGreaterThan(0);
    });

    test('should maintain performance with 500 particles', () => {
      const particlePool = new ObjectPool(() => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 1.0,
        reset() {
          this.x = 0;
          this.y = 0;
          this.vx = 0;
          this.vy = 0;
          this.life = 1.0;
        }
      }), {
        initialSize: 500,
        maxSize: 1000
      });

      const activeParticles = [];

      const startTime = performance.now();

      // Spawn 500 particles
      for (let i = 0; i < 500; i++) {
        const particle = particlePool.acquire();
        particle.x = Math.random() * 1000;
        particle.y = Math.random() * 1000;
        particle.vx = Math.random() * 10 - 5;
        particle.vy = Math.random() * 10 - 5;
        activeParticles.push(particle);
      }

      // Update particles
      for (const particle of activeParticles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.01;
      }

      // Release dead particles
      const toRelease = activeParticles.filter(p => p.life <= 0);
      for (const particle of toRelease) {
        particlePool.release(particle);
      }

      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(2); // Should be < 2ms
    });
  });

  describe('Performance Regression Tests', () => {
    test('SpatialGrid should not degrade with repeated use', () => {
      const grid = new SpatialGrid(32);
      const times = [];

      // Run 10 iterations
      for (let iteration = 0; iteration < 10; iteration++) {
        grid.clear();

        const startTime = performance.now();

        // Insert 100 entities
        for (let i = 0; i < 100; i++) {
          grid.insert({
            id: `entity-${iteration}-${i}`,
            x: Math.random() * 1000,
            z: Math.random() * 1000
          });
        }

        times.push(performance.now() - startTime);
      }

      // Check that performance doesn't degrade
      const firstHalf = times.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const secondHalf = times.slice(5, 10).reduce((a, b) => a + b, 0) / 5;

      // Second half should not be more than 20% slower
      expect(secondHalf).toBeLessThan(firstHalf * 1.2);
    });

    test('ObjectPool should maintain stable performance', () => {
      const pool = new ObjectPool(() => ({ data: [] }), {
        initialSize: 100
      });

      const times = [];

      for (let iteration = 0; iteration < 10; iteration++) {
        const startTime = performance.now();

        const objects = [];
        for (let i = 0; i < 100; i++) {
          objects.push(pool.acquire());
        }
        for (const obj of objects) {
          pool.release(obj);
        }

        times.push(performance.now() - startTime);
      }

      // Performance should remain stable
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avg)));

      expect(maxDeviation).toBeLessThan(avg * 0.5); // Max 50% deviation
    });
  });
});
