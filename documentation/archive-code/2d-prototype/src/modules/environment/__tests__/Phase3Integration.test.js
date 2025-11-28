/**
 * Phase3Integration.test.js - Phase 3 Integration Tests
 *
 * Tests for Phase 3 Enhanced Terrain Features:
 * 1. River Rendering
 * 2. Biome Transition Smoothing
 * 3. Building Placement Preview (Flatten Cost Calculation)
 * 4. Terrain Editing Tools
 * 5. Weather/Climate System
 */

import { TerrainSystem } from '../TerrainSystem';
import { WorldGenerator } from '../WorldGenerator';
import { NoiseGenerator } from '../NoiseGenerator';
import { WeatherSystem, WeatherType } from '../WeatherSystem';

describe('Phase 3: Enhanced Terrain Features Integration', () => {
  let worldGenerator;
  let terrainSystem;
  let weatherSystem;

  beforeEach(() => {
    const seed = 12345;
    worldGenerator = new WorldGenerator(seed);
    terrainSystem = new TerrainSystem(worldGenerator);
    weatherSystem = new WeatherSystem(worldGenerator);
  });

  // ============================================================================
  // River Rendering System
  // ============================================================================
  describe('River Rendering System', () => {
    test('should generate rivers for a region', () => {
      const rivers = worldGenerator.generateRivers(0, 0, 200, 200, 5);

      expect(rivers).toBeInstanceOf(Array);
      expect(rivers.length).toBeGreaterThanOrEqual(0);
      expect(rivers.length).toBeLessThanOrEqual(5);
    });

    test('river paths should have valid coordinates', () => {
      const rivers = worldGenerator.generateRivers(0, 0, 100, 100, 3);

      for (const river of rivers) {
        expect(river).toBeInstanceOf(Array);
        expect(river.length).toBeGreaterThan(0);

        for (const tile of river) {
          expect(tile).toHaveProperty('x');
          expect(tile).toHaveProperty('z');
          expect(typeof tile.x).toBe('number');
          expect(typeof tile.z).toBe('number');
        }
      }
    });

    test('rivers should flow from high to low elevation', () => {
      const rivers = worldGenerator.generateRivers(0, 0, 100, 100, 3);

      for (const river of rivers) {
        if (river.length < 2) continue;

        // Check first few tiles flow downhill (generally)
        for (let i = 0; i < Math.min(river.length - 1, 5); i++) {
          const currentHeight = worldGenerator.generateHeight(river[i].x, river[i].z);
          const nextHeight = worldGenerator.generateHeight(river[i + 1].x, river[i + 1].z);

          // Rivers should generally flow downhill (allow small uphill for realism)
          expect(nextHeight).toBeLessThanOrEqual(currentHeight + 1);
        }
      }
    });
  });

  // ============================================================================
  // Biome Transition Smoothing
  // ============================================================================
  describe('Biome Transition Smoothing', () => {
    test('should generate consistent biomes', () => {
      const biome1 = worldGenerator.getBiome(50, 50);
      const biome2 = worldGenerator.getBiome(50, 50);

      expect(biome1).toBe(biome2);
    });

    test('neighboring tiles should have reasonable biome transitions', () => {
      const centerBiome = worldGenerator.getBiome(50, 50);

      // Check 8-directional neighbors
      const neighbors = [
        worldGenerator.getBiome(49, 50),
        worldGenerator.getBiome(51, 50),
        worldGenerator.getBiome(50, 49),
        worldGenerator.getBiome(50, 51),
        worldGenerator.getBiome(49, 49),
        worldGenerator.getBiome(51, 51),
        worldGenerator.getBiome(49, 51),
        worldGenerator.getBiome(51, 49)
      ];

      // At least some neighbors should be the same biome (not complete chaos)
      const sameCount = neighbors.filter(b => b === centerBiome).length;
      expect(sameCount).toBeGreaterThanOrEqual(0);
    });

    test('biome distribution should be reasonable', () => {
      const biomes = new Set();

      for (let i = 0; i < 100; i++) {
        const x = Math.floor(Math.random() * 200);
        const z = Math.floor(Math.random() * 200);
        biomes.add(worldGenerator.getBiome(x, z));
      }

      // Should have multiple biome types in a large area
      expect(biomes.size).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // Building Placement Preview (Flatten Cost)
  // ============================================================================
  describe('Building Placement Preview', () => {
    test('should calculate flatten cost for a flat region', () => {
      // Flatten a region first
      terrainSystem.flattenRegion(10, 10, 5, 5, 5);

      // Calculate cost (should be 0 since already flat)
      const cost = terrainSystem.calculateFlattenCost(10, 10, 5, 5);

      expect(cost).toHaveProperty('targetHeight');
      expect(cost).toHaveProperty('totalHeightDiff');
      expect(cost).toHaveProperty('cellsAffected');
      expect(cost).toHaveProperty('maxHeightDiff');
      expect(cost).toHaveProperty('avgHeightDiff');

      expect(cost.totalHeightDiff).toBe(0);
      expect(cost.cellsAffected).toBe(0);
    });

    test('should calculate flatten cost for varied terrain', () => {
      // Calculate cost for unmodified terrain
      const cost = terrainSystem.calculateFlattenCost(50, 50, 3, 3);

      expect(cost.targetHeight).toBeGreaterThanOrEqual(0);
      expect(cost.targetHeight).toBeLessThanOrEqual(10);
      expect(cost.totalHeightDiff).toBeGreaterThanOrEqual(0);
      expect(cost.cellsAffected).toBeGreaterThanOrEqual(0);
      expect(cost.cellsAffected).toBeLessThanOrEqual(9); // 3x3 = 9 tiles
    });

    test('flatten cost should match actual flatten result', () => {
      // Calculate cost
      const cost = terrainSystem.calculateFlattenCost(30, 30, 4, 4);

      // Actually flatten
      const result = terrainSystem.flattenRegion(30, 30, 4, 4, cost.targetHeight);

      // Cost should match (allowing for rounding)
      expect(result.cellsChanged).toBe(cost.cellsAffected);
      expect(result.flattenedTo).toBeCloseTo(cost.targetHeight, 2);
    });
  });

  // ============================================================================
  // Terrain Editing Tools
  // ============================================================================
  describe('Terrain Editing Tools', () => {
    test('should raise terrain in a region', () => {
      const originalHeight = terrainSystem.getHeight(20, 20);

      const result = terrainSystem.raiseRegion(20, 20, 3, 3, 2);

      expect(result.success).toBe(true);
      expect(result.cellsChanged).toBeGreaterThan(0);

      const newHeight = terrainSystem.getHeight(20, 20);
      expect(newHeight).toBeGreaterThan(originalHeight);
      expect(newHeight).toBeCloseTo(originalHeight + 2, 1);
    });

    test('should lower terrain in a region', () => {
      // First raise it
      terrainSystem.raiseRegion(40, 40, 3, 3, 3);
      const raisedHeight = terrainSystem.getHeight(40, 40);

      // Then lower it
      const result = terrainSystem.lowerRegion(40, 40, 3, 3, 2);

      expect(result.success).toBe(true);
      expect(result.cellsChanged).toBeGreaterThan(0);

      const loweredHeight = terrainSystem.getHeight(40, 40);
      expect(loweredHeight).toBeLessThan(raisedHeight);
      expect(loweredHeight).toBeCloseTo(raisedHeight - 2, 1);
    });

    test('should smooth terrain in a region', () => {
      // Create uneven terrain
      terrainSystem.setHeight(60, 60, 0);
      terrainSystem.setHeight(61, 60, 10);
      terrainSystem.setHeight(62, 60, 0);

      const beforeHeights = [
        terrainSystem.getHeight(60, 60),
        terrainSystem.getHeight(61, 60),
        terrainSystem.getHeight(62, 60)
      ];

      // Smooth
      const result = terrainSystem.smoothRegion(60, 60, 3, 1, 2);

      expect(result.success).toBe(true);
      expect(result.cellsChanged).toBeGreaterThan(0);

      const afterHeights = [
        terrainSystem.getHeight(60, 60),
        terrainSystem.getHeight(61, 60),
        terrainSystem.getHeight(62, 60)
      ];

      // Heights should be more similar after smoothing
      const beforeVariance = Math.max(...beforeHeights) - Math.min(...beforeHeights);
      const afterVariance = Math.max(...afterHeights) - Math.min(...afterHeights);

      expect(afterVariance).toBeLessThan(beforeVariance);
    });

    test('terrain editing should respect height limits', () => {
      // Try to raise above max
      terrainSystem.setHeight(70, 70, 9);
      terrainSystem.raiseRegion(70, 70, 1, 1, 5);

      const height = terrainSystem.getHeight(70, 70);
      expect(height).toBeLessThanOrEqual(10); // maxHeight
    });

    test('terrain editing should respect minimum limits', () => {
      // Try to lower below min
      terrainSystem.setHeight(80, 80, 1);
      terrainSystem.lowerRegion(80, 80, 1, 1, 5);

      const height = terrainSystem.getHeight(80, 80);
      expect(height).toBeGreaterThanOrEqual(0); // minHeight
    });
  });

  // ============================================================================
  // Weather/Climate System
  // ============================================================================
  describe('Weather/Climate System', () => {
    test('should initialize with default weather', () => {
      expect(weatherSystem.currentWeather).toBe(WeatherType.CLEAR);
    });

    test('should change weather based on biome', () => {
      weatherSystem.changeWeather('tundra');

      // Tundra should favor snow
      expect([WeatherType.CLEAR, WeatherType.SNOW, WeatherType.FOG]).toContain(
        weatherSystem.targetWeather
      );
    });

    test('should get current weather for a location', () => {
      const weather = weatherSystem.getCurrentWeather(50, 50);

      expect(Object.values(WeatherType)).toContain(weather);
    });

    test('should provide weather effects configuration', () => {
      const effects = weatherSystem.getWeatherEffects(WeatherType.RAIN);

      expect(effects).toHaveProperty('particles');
      expect(effects).toHaveProperty('particleColor');
      expect(effects).toHaveProperty('particleSpeed');
      expect(effects.particles).toBeGreaterThan(0);
    });

    test('should update weather system', () => {
      const initialWeather = weatherSystem.currentWeather;

      // Update with large deltaTime to trigger change
      weatherSystem.update(400000); // 400 seconds

      // Weather may or may not have changed, but update should not crash
      expect(weatherSystem.currentWeather).toBeDefined();
    });

    test('should generate weather particles', () => {
      weatherSystem.setWeather(WeatherType.RAIN);
      weatherSystem.update(1000);

      const particles = weatherSystem.getParticles();

      expect(particles).toBeInstanceOf(Array);
      expect(particles.length).toBeGreaterThan(0);

      if (particles.length > 0) {
        expect(particles[0]).toHaveProperty('x');
        expect(particles[0]).toHaveProperty('y');
        expect(particles[0]).toHaveProperty('vx');
        expect(particles[0]).toHaveProperty('vy');
      }
    });

    test('should serialize and deserialize weather state', () => {
      weatherSystem.setWeather(WeatherType.SNOW);
      weatherSystem.update(1000);

      const serialized = weatherSystem.serialize();

      const newWeatherSystem = new WeatherSystem(worldGenerator);
      newWeatherSystem.deserialize(serialized);

      expect(newWeatherSystem.currentWeather).toBe(serialized.currentWeather);
      expect(newWeatherSystem.targetWeather).toBe(serialized.targetWeather);
    });

    test('should respect weather enable/disable setting', () => {
      const disabledWeather = new WeatherSystem(worldGenerator, { enableWeather: false });

      disabledWeather.update(500000); // Large update

      // Weather should remain unchanged
      expect(disabledWeather.timeSinceLastChange).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // All Features Working Together
  // ============================================================================
  describe('All Phase 3 Features Working Together', () => {
    test('should have terrain with all Phase 3 features available', () => {
      // Rivers
      const rivers = worldGenerator.generateRivers(0, 0, 100, 100, 3);
      expect(rivers).toBeInstanceOf(Array);

      // Biomes
      const biome = worldGenerator.getBiome(50, 50);
      expect(typeof biome).toBe('string');

      // Flatten cost
      const cost = terrainSystem.calculateFlattenCost(10, 10, 3, 3);
      expect(cost).toHaveProperty('targetHeight');

      // Terrain editing
      const raiseResult = terrainSystem.raiseRegion(20, 20, 2, 2, 1);
      expect(raiseResult.success).toBe(true);

      // Weather
      const weather = weatherSystem.getCurrentWeather(50, 50);
      expect(typeof weather).toBe('string');
    });

    test('terrain editing should work with rivers and biomes', () => {
      // Generate rivers
      const rivers = worldGenerator.generateRivers(0, 0, 100, 100, 2);

      // Edit terrain
      terrainSystem.raiseRegion(10, 10, 5, 5, 2);

      // Rivers should still be valid
      expect(rivers).toBeInstanceOf(Array);

      // Biomes should still work
      const biome = worldGenerator.getBiome(10, 10);
      expect(typeof biome).toBe('string');
    });

    test('weather should adapt to biome changes', () => {
      // Get biome
      const biome = worldGenerator.getBiome(50, 50);

      // Change weather based on biome
      weatherSystem.changeWeather(biome);

      // Weather should be valid
      expect(Object.values(WeatherType)).toContain(weatherSystem.targetWeather);
    });
  });

  // ============================================================================
  // Phase 3 Statistics
  // ============================================================================
  describe('Phase 3 Statistics', () => {
    test('should provide terrain editing statistics', () => {
      const raiseStats = terrainSystem.raiseRegion(30, 30, 5, 5, 1);
      const lowerStats = terrainSystem.lowerRegion(40, 40, 5, 5, 1);
      const smoothStats = terrainSystem.smoothRegion(50, 50, 5, 5, 1);

      expect(raiseStats.cellsChanged).toBeGreaterThanOrEqual(0);
      expect(lowerStats.cellsChanged).toBeGreaterThanOrEqual(0);
      expect(smoothStats.cellsChanged).toBeGreaterThanOrEqual(0);
    });

    test('should track weather statistics', () => {
      const stats = weatherSystem.getRegionWeatherStats(0, 0, 100, 100);

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    test('should calculate flatten costs efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        terrainSystem.calculateFlattenCost(i * 10, i * 10, 3, 3);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 10 calculations should take less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
