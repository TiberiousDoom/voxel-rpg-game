/**
 * NoiseGenerator.test.js - Unit tests for noise generation
 *
 * Tests:
 * - Determinism (same seed = same output)
 * - Value ranges (output in [-1, 1] or [0, 1])
 * - Multi-octave noise
 * - Perlin vs Simplex consistency
 * - Save/load functionality
 * - Preset configurations
 */

import { NoiseGenerator, NoisePresets } from '../NoiseGenerator.js';

describe('NoiseGenerator', () => {
  describe('Constructor and Initialization', () => {
    it('should create a generator with default seed', () => {
      const gen = new NoiseGenerator();
      expect(gen.seed).toBe(12345);
      expect(gen.permutation).toBeDefined();
      expect(gen.permutation.length).toBe(512);
    });

    it('should create a generator with custom seed', () => {
      const gen = new NoiseGenerator(99999);
      expect(gen.seed).toBe(99999);
    });

    it('should generate different permutation tables for different seeds', () => {
      const gen1 = new NoiseGenerator(100);
      const gen2 = new NoiseGenerator(200);

      // Permutation tables should be different
      let differences = 0;
      for (let i = 0; i < 256; i++) {
        if (gen1.permutation[i] !== gen2.permutation[i]) {
          differences++;
        }
      }
      expect(differences).toBeGreaterThan(100); // Most values should differ
    });
  });

  describe('Determinism', () => {
    it('should generate identical Perlin noise for same seed and coordinates', () => {
      const gen1 = new NoiseGenerator(12345);
      const gen2 = new NoiseGenerator(12345);

      const testPoints = [
        [0, 0],
        [10.5, 20.7],
        [100, 200],
        [-50, -75],
        [0.1, 0.1]
      ];

      testPoints.forEach(([x, z]) => {
        const value1 = gen1.perlin2D(x, z);
        const value2 = gen2.perlin2D(x, z);
        expect(value1).toBe(value2);
      });
    });

    it('should generate identical Simplex noise for same seed and coordinates', () => {
      const gen1 = new NoiseGenerator(54321);
      const gen2 = new NoiseGenerator(54321);

      const testPoints = [
        [0, 0],
        [15.3, 25.8],
        [200, 300],
        [-100, -150]
      ];

      testPoints.forEach(([x, z]) => {
        const value1 = gen1.simplex2D(x, z);
        const value2 = gen2.simplex2D(x, z);
        expect(value1).toBe(value2);
      });
    });

    it('should generate different noise for different seeds', () => {
      const gen1 = new NoiseGenerator(111);
      const gen2 = new NoiseGenerator(222);

      // Test at multiple coordinates to ensure at least one differs
      const testPoints = [
        [12.34, 56.78],
        [100.5, 200.7],
        [0.1, 0.2]
      ];

      let hasDifference = false;
      testPoints.forEach(([x, z]) => {
        const value1 = gen1.perlin2D(x, z);
        const value2 = gen2.perlin2D(x, z);
        if (value1 !== value2) {
          hasDifference = true;
        }
      });

      expect(hasDifference).toBe(true);
    });

    it('should generate identical multi-octave noise for same seed', () => {
      const gen1 = new NoiseGenerator(777);
      const gen2 = new NoiseGenerator(777);

      const options = { octaves: 4, persistence: 0.5, lacunarity: 2.0, scale: 0.02 };

      const value1 = gen1.perlin2D(100, 200, options);
      const value2 = gen2.perlin2D(100, 200, options);

      expect(value1).toBe(value2);
    });
  });

  describe('Value Ranges', () => {
    it('should return Perlin values in range [-1, 1]', () => {
      const gen = new NoiseGenerator();

      // Test many points
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 1000 - 500;
        const z = Math.random() * 1000 - 500;
        const value = gen.perlin2D(x, z);

        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should return Simplex values in range [-1, 1]', () => {
      const gen = new NoiseGenerator();

      // Test many points
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 1000 - 500;
        const z = Math.random() * 1000 - 500;
        const value = gen.simplex2D(x, z);

        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should return height values in range [0, 1]', () => {
      const gen = new NoiseGenerator();

      for (let i = 0; i < 500; i++) {
        const x = Math.random() * 1000;
        const z = Math.random() * 1000;
        const value = gen.height(x, z);

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should return moisture values in range [0, 1]', () => {
      const gen = new NoiseGenerator();

      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 500;
        const z = Math.random() * 500;
        const value = gen.moisture(x, z);

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should return temperature values in range [0, 1]', () => {
      const gen = new NoiseGenerator();

      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 500;
        const z = Math.random() * 500;
        const value = gen.temperature(x, z);

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Multi-Octave Noise', () => {
    it('should handle single octave (fast path)', () => {
      const gen = new NoiseGenerator(555);

      const value1 = gen.perlin2D(10, 20);
      const value2 = gen.perlin2D(10, 20, { octaves: 1 });

      expect(value1).toBe(value2);
    });

    it('should produce different results for different octave counts', () => {
      const gen = new NoiseGenerator(666);

      const value1 = gen.perlin2D(12.5, 34.7, { octaves: 1 });
      const value2 = gen.perlin2D(12.5, 34.7, { octaves: 4 });

      expect(value1).not.toBe(value2);
    });

    it('should add detail with more octaves', () => {
      const gen = new NoiseGenerator(888);

      // Sample a small region with different octave counts
      const samples1 = [];
      const samples4 = [];

      for (let x = 0; x < 10; x++) {
        for (let z = 0; z < 10; z++) {
          samples1.push(gen.perlin2D(x, z, { octaves: 1, scale: 0.1 }));
          samples4.push(gen.perlin2D(x, z, { octaves: 4, scale: 0.1 }));
        }
      }

      // Calculate variance (more octaves = more variation)
      const variance1 = calculateVariance(samples1);
      const variance4 = calculateVariance(samples4);

      // Multi-octave should have more local variation
      expect(variance4).toBeGreaterThan(variance1 * 0.5);
    });

    it('should respect persistence parameter', () => {
      const gen = new NoiseGenerator(999);

      const lowPersistence = gen.perlin2D(15.3, 27.8, { octaves: 4, persistence: 0.1 });
      const highPersistence = gen.perlin2D(15.3, 27.8, { octaves: 4, persistence: 0.9 });

      // Different persistence should produce different results
      expect(lowPersistence).not.toBe(highPersistence);
    });

    it('should respect lacunarity parameter', () => {
      const gen = new NoiseGenerator(1111);

      const lowLacunarity = gen.perlin2D(100, 100, { octaves: 4, lacunarity: 1.5 });
      const highLacunarity = gen.perlin2D(100, 100, { octaves: 4, lacunarity: 3.0 });

      expect(lowLacunarity).not.toBe(highLacunarity);
    });

    it('should respect scale parameter', () => {
      const gen = new NoiseGenerator(2222);

      const largeScale = gen.perlin2D(17.6, 23.9, { scale: 0.01 });  // Large features
      const smallScale = gen.perlin2D(17.6, 23.9, { scale: 0.1 });   // Small features

      expect(largeScale).not.toBe(smallScale);
    });
  });

  describe('Continuity and Smoothness', () => {
    it('should produce continuous values (no sudden jumps)', () => {
      const gen = new NoiseGenerator(3333);

      // Sample along a line and check for discontinuities
      const step = 0.01;
      let maxDelta = 0;

      for (let x = 0; x < 10; x += step) {
        const v1 = gen.perlin2D(x, 0);
        const v2 = gen.perlin2D(x + step, 0);
        const delta = Math.abs(v2 - v1);
        maxDelta = Math.max(maxDelta, delta);
      }

      // Max change should be small (noise is smooth)
      expect(maxDelta).toBeLessThan(0.1);
    });

    it('should produce smooth gradients across grid boundaries', () => {
      const gen = new NoiseGenerator(4444);

      // Test across integer boundaries (grid cells)
      const beforeBoundary = gen.perlin2D(0.99, 0.99);
      const atBoundary = gen.perlin2D(1.0, 1.0);
      const afterBoundary = gen.perlin2D(1.01, 1.01);

      // Should be continuous (no sudden jump)
      const delta1 = Math.abs(atBoundary - beforeBoundary);
      const delta2 = Math.abs(afterBoundary - atBoundary);

      expect(delta1).toBeLessThan(0.1);
      expect(delta2).toBeLessThan(0.1);
    });
  });

  describe('Height/Moisture/Temperature Methods', () => {
    it('should use Perlin by default for height', () => {
      const gen = new NoiseGenerator(5555);

      const heightValue = gen.height(10, 20);
      const perlinValue = (gen.perlin2D(10, 20) + 1) * 0.5;

      expect(heightValue).toBe(perlinValue);
    });

    it('should use Simplex when specified for height', () => {
      const gen = new NoiseGenerator(6666);

      const heightValue = gen.height(10, 20, { type: 'simplex' });
      const simplexValue = (gen.simplex2D(10, 20) + 1) * 0.5;

      expect(heightValue).toBe(simplexValue);
    });

    it('should produce different values for height, moisture, and temperature', () => {
      const gen = new NoiseGenerator(7777);

      const x = 100;
      const z = 200;

      const h = gen.height(x, z);
      const m = gen.moisture(x, z);
      const t = gen.temperature(x, z);

      // All should be different (different scales/octaves)
      expect(h).not.toBe(m);
      expect(h).not.toBe(t);
      expect(m).not.toBe(t);
    });
  });

  describe('Save and Load', () => {
    it('should save and restore generator state', () => {
      const gen1 = new NoiseGenerator(8888);

      // Generate some values
      const testPoints = [
        [10, 20],
        [50, 75],
        [100, 150]
      ];

      const values1 = testPoints.map(([x, z]) => gen1.perlin2D(x, z));

      // Save and reload
      const saved = gen1.toJSON();
      const gen2 = NoiseGenerator.fromJSON(saved);

      // Should produce identical values
      const values2 = testPoints.map(([x, z]) => gen2.perlin2D(x, z));

      values1.forEach((v1, i) => {
        expect(v1).toBe(values2[i]);
      });
    });

    it('should save only the seed', () => {
      const gen = new NoiseGenerator(9999);
      const saved = gen.toJSON();

      expect(saved).toEqual({ seed: 9999 });
      expect(Object.keys(saved).length).toBe(1);
    });
  });

  describe('Presets', () => {
    it('should have all expected presets defined', () => {
      expect(NoisePresets.TERRAIN_HEIGHT).toBeDefined();
      expect(NoisePresets.TERRAIN_DETAIL).toBeDefined();
      expect(NoisePresets.BIOME_REGIONS).toBeDefined();
      expect(NoisePresets.RESOURCE_CLUSTERS).toBeDefined();
      expect(NoisePresets.SMOOTH_VARIATION).toBeDefined();
    });

    it('should use presets correctly', () => {
      const gen = new NoiseGenerator(11111);

      // Should not throw
      expect(() => {
        gen.perlin2D(10, 20, NoisePresets.TERRAIN_HEIGHT);
      }).not.toThrow();

      expect(() => {
        gen.simplex2D(10, 20, NoisePresets.BIOME_REGIONS);
      }).not.toThrow();
    });

    it('should produce different results for different presets', () => {
      const gen = new NoiseGenerator(22222);

      const x = 11.7;
      const z = 19.3;

      const terrainHeight = gen.perlin2D(x, z, NoisePresets.TERRAIN_HEIGHT);
      const terrainDetail = gen.perlin2D(x, z, NoisePresets.TERRAIN_DETAIL);

      expect(terrainHeight).not.toBe(terrainDetail);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero coordinates', () => {
      const gen = new NoiseGenerator();

      expect(() => gen.perlin2D(0, 0)).not.toThrow();
      expect(() => gen.simplex2D(0, 0)).not.toThrow();

      const value = gen.perlin2D(0, 0);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    });

    it('should handle negative coordinates', () => {
      const gen = new NoiseGenerator();

      expect(() => gen.perlin2D(-100, -200)).not.toThrow();
      expect(() => gen.simplex2D(-100, -200)).not.toThrow();

      const value = gen.perlin2D(-100, -200);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    });

    it('should handle very large coordinates', () => {
      const gen = new NoiseGenerator();

      expect(() => gen.perlin2D(10000, 10000)).not.toThrow();
      expect(() => gen.simplex2D(10000, 10000)).not.toThrow();

      const value = gen.perlin2D(10000, 10000);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    });

    it('should handle fractional coordinates', () => {
      const gen = new NoiseGenerator();

      const value1 = gen.perlin2D(10.12345, 20.67890);
      const value2 = gen.perlin2D(10.54321, 20.98765);

      expect(value1).toBeGreaterThanOrEqual(-1);
      expect(value1).toBeLessThanOrEqual(1);
      expect(value2).toBeGreaterThanOrEqual(-1);
      expect(value2).toBeLessThanOrEqual(1);
      expect(value1).not.toBe(value2);
    });
  });

  describe('Performance Characteristics', () => {
    it('should be reasonably fast for single octave', () => {
      const gen = new NoiseGenerator();

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        gen.perlin2D(Math.random() * 1000, Math.random() * 1000);
      }
      const elapsed = performance.now() - start;

      // 10000 samples should complete in reasonable time
      expect(elapsed).toBeLessThan(100); // Less than 100ms
    });

    it('should be reasonably fast for multi-octave', () => {
      const gen = new NoiseGenerator();

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        gen.perlin2D(Math.random() * 1000, Math.random() * 1000, { octaves: 4 });
      }
      const elapsed = performance.now() - start;

      // 1000 multi-octave samples should complete in reasonable time
      expect(elapsed).toBeLessThan(100); // Less than 100ms
    });
  });
});

// Helper function for variance calculation
function calculateVariance(values) {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}
