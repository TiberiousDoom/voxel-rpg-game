/**
 * SeededRandom.test.js - Unit tests for seeded random number generator
 */

import SeededRandom from '../SeededRandom';

describe('SeededRandom', () => {
  describe('constructor', () => {
    it('should create with specified seed', () => {
      const rng = new SeededRandom(12345);

      expect(rng.seed).toBe(12345);
      expect(rng.initialSeed).toBe(12345);
    });
  });

  describe('next', () => {
    it('should return number between 0 and 1', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should be reproducible with same seed', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRandom(111);
      const rng2 = new SeededRandom(222);

      // Check first 10 values are different
      let allSame = true;
      for (let i = 0; i < 10; i++) {
        if (rng1.next() !== rng2.next()) {
          allSame = false;
          break;
        }
      }

      expect(allSame).toBe(false);
    });
  });

  describe('nextInt', () => {
    it('should return integer in range', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(5, 15);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThanOrEqual(15);
      }
    });

    it('should include min and max values', () => {
      const rng = new SeededRandom(42);
      const values = new Set();

      for (let i = 0; i < 1000; i++) {
        values.add(rng.nextInt(0, 2));
      }

      expect(values.has(0)).toBe(true);
      expect(values.has(1)).toBe(true);
      expect(values.has(2)).toBe(true);
    });

    it('should return single value when min equals max', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 10; i++) {
        expect(rng.nextInt(5, 5)).toBe(5);
      }
    });
  });

  describe('nextFloat', () => {
    it('should return float in range', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextFloat(10.5, 20.5);
        expect(value).toBeGreaterThanOrEqual(10.5);
        expect(value).toBeLessThan(20.5);
      }
    });
  });

  describe('nextBool', () => {
    it('should return boolean', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextBool();
        expect(typeof value).toBe('boolean');
      }
    });

    it('should respect probability', () => {
      const rng = new SeededRandom(42);
      let trueCount = 0;
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        if (rng.nextBool(0.3)) trueCount++;
      }

      // Should be roughly 30% (with some variance)
      const ratio = trueCount / iterations;
      expect(ratio).toBeGreaterThan(0.25);
      expect(ratio).toBeLessThan(0.35);
    });

    it('should always return false with probability 0', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        expect(rng.nextBool(0)).toBe(false);
      }
    });

    it('should always return true with probability 1', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        expect(rng.nextBool(1)).toBe(true);
      }
    });
  });

  describe('pick', () => {
    it('should pick random element from array', () => {
      const rng = new SeededRandom(42);
      const array = ['a', 'b', 'c', 'd', 'e'];
      const picks = new Set();

      for (let i = 0; i < 100; i++) {
        picks.add(rng.pick(array));
      }

      // Should have picked at least a few different elements
      expect(picks.size).toBeGreaterThan(1);
      picks.forEach(pick => {
        expect(array).toContain(pick);
      });
    });

    it('should return undefined for empty array', () => {
      const rng = new SeededRandom(42);

      expect(rng.pick([])).toBeUndefined();
    });

    it('should return undefined for null/undefined', () => {
      const rng = new SeededRandom(42);

      expect(rng.pick(null)).toBeUndefined();
      expect(rng.pick(undefined)).toBeUndefined();
    });

    it('should return single element for single-element array', () => {
      const rng = new SeededRandom(42);

      expect(rng.pick(['only'])).toBe('only');
    });
  });

  describe('shuffle', () => {
    it('should shuffle array in place', () => {
      const rng = new SeededRandom(42);
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array = [...original];

      const result = rng.shuffle(array);

      expect(result).toBe(array); // Same reference
      expect(array).toHaveLength(original.length);

      // Should contain same elements
      expect(array.sort((a, b) => a - b)).toEqual(original);
    });

    it('should be reproducible', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);

      const array1 = [1, 2, 3, 4, 5];
      const array2 = [1, 2, 3, 4, 5];

      rng1.shuffle(array1);
      rng2.shuffle(array2);

      expect(array1).toEqual(array2);
    });

    it('should produce different results with different seeds', () => {
      const rng1 = new SeededRandom(111);
      const rng2 = new SeededRandom(222);

      const array1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      rng1.shuffle(array1);
      rng2.shuffle(array2);

      expect(array1).not.toEqual(array2);
    });
  });

  describe('nextPoint', () => {
    it('should return point in bounds', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const point = rng.nextPoint(10, 20, 30, 40);

        expect(point.x).toBeGreaterThanOrEqual(10);
        expect(point.x).toBeLessThan(20);
        expect(point.y).toBeGreaterThanOrEqual(30);
        expect(point.y).toBeLessThan(40);
      }
    });
  });

  describe('nextGridPoint', () => {
    it('should return integer point in bounds', () => {
      const rng = new SeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const point = rng.nextGridPoint(0, 10, 0, 10);

        expect(Number.isInteger(point.x)).toBe(true);
        expect(Number.isInteger(point.y)).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(10);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('reset', () => {
    it('should reset to initial seed', () => {
      const rng = new SeededRandom(12345);

      // Generate some values
      const values1 = [];
      for (let i = 0; i < 10; i++) {
        values1.push(rng.next());
      }

      // Reset and generate again
      rng.reset();
      const values2 = [];
      for (let i = 0; i < 10; i++) {
        values2.push(rng.next());
      }

      expect(values1).toEqual(values2);
    });
  });

  describe('setSeed', () => {
    it('should set new seed', () => {
      const rng = new SeededRandom(111);

      // Generate some values
      rng.next();
      rng.next();

      // Set new seed
      rng.setSeed(222);

      // Should now produce same sequence as fresh RNG with seed 222
      const rng2 = new SeededRandom(222);

      for (let i = 0; i < 10; i++) {
        expect(rng.next()).toBe(rng2.next());
      }
    });
  });

  describe('state management', () => {
    it('should save and restore state', () => {
      const rng = new SeededRandom(12345);

      // Generate some values
      for (let i = 0; i < 50; i++) {
        rng.next();
      }

      // Save state
      const state = rng.getState();

      // Generate more values
      const values1 = [];
      for (let i = 0; i < 10; i++) {
        values1.push(rng.next());
      }

      // Restore state
      rng.setState(state);

      // Should produce same values again
      const values2 = [];
      for (let i = 0; i < 10; i++) {
        values2.push(rng.next());
      }

      expect(values1).toEqual(values2);
    });
  });
});
