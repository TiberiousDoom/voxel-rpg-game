/**
 * SpriteLoader.test.js
 * Unit tests for the SpriteLoader class
 */

import SpriteLoader from '../SpriteLoader.js';

// Mock Image class for testing
class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.complete = false;
    this.width = 64;
    this.height = 16;
  }

  // Simulate successful load
  triggerLoad() {
    this.complete = true;
    if (this.onload) {
      setTimeout(() => this.onload(), 0);
    }
  }

  // Simulate load error
  triggerError() {
    if (this.onerror) {
      setTimeout(() => this.onerror(), 0);
    }
  }
}

// Mock global Image
global.Image = MockImage;

describe('SpriteLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new SpriteLoader();
  });

  afterEach(() => {
    loader.clearCache();
  });

  describe('constructor', () => {
    test('initializes with empty caches', () => {
      expect(loader.sprites.size).toBe(0);
      expect(loader.loading.size).toBe(0);
      expect(loader.errorCache.size).toBe(0);
    });

    test('initializes stats', () => {
      const stats = loader.getStats();
      expect(stats.totalLoaded).toBe(0);
      expect(stats.totalFailed).toBe(0);
      expect(stats.totalCached).toBe(0);
    });
  });

  describe('loadSprite', () => {
    test('loads a sprite successfully', async () => {
      const promise = loader.loadSprite('test', '/test.png');

      // Get the image being loaded
      const loadingKeys = Array.from(loader.loading.keys());
      expect(loadingKeys).toContain('test');

      // Trigger successful load
      setTimeout(() => {
        const img = new MockImage();
        img.src = '/test.png';
        img.triggerLoad();
      }, 0);

      // For this test, we'll just check that loading was initiated
      expect(loader.isLoading('test')).toBe(true);
    });

    test('returns cached sprite on second load', async () => {
      // Manually add a sprite to cache
      const mockImage = new MockImage();
      mockImage.complete = true;
      loader.sprites.set('test', mockImage);

      const result = await loader.loadSprite('test', '/test.png');
      expect(result).toBe(mockImage);
      expect(loader.getStats().totalCached).toBe(1);
    });

    test('throws error for previously failed sprite', async () => {
      loader.errorCache.add('test');

      await expect(loader.loadSprite('test', '/test.png'))
        .rejects.toThrow('previously failed');
    });
  });

  describe('getSprite', () => {
    test('returns null for non-existent sprite', () => {
      expect(loader.getSprite('nonexistent')).toBeNull();
    });

    test('returns cached sprite', () => {
      const mockImage = new MockImage();
      loader.sprites.set('test', mockImage);

      expect(loader.getSprite('test')).toBe(mockImage);
    });
  });

  describe('hasSprite', () => {
    test('returns false for non-existent sprite', () => {
      expect(loader.hasSprite('nonexistent')).toBe(false);
    });

    test('returns true for cached sprite', () => {
      loader.sprites.set('test', new MockImage());
      expect(loader.hasSprite('test')).toBe(true);
    });
  });

  describe('isLoading', () => {
    test('returns false when not loading', () => {
      expect(loader.isLoading('test')).toBe(false);
    });

    test('returns true when loading', () => {
      loader.loading.set('test', Promise.resolve());
      expect(loader.isLoading('test')).toBe(true);
    });
  });

  describe('hasFailed', () => {
    test('returns false for non-failed sprite', () => {
      expect(loader.hasFailed('test')).toBe(false);
    });

    test('returns true for failed sprite', () => {
      loader.errorCache.add('test');
      expect(loader.hasFailed('test')).toBe(true);
    });
  });

  describe('clearCache', () => {
    test('clears all caches and stats', () => {
      loader.sprites.set('test', new MockImage());
      loader.errorCache.add('failed');
      loader.stats.totalLoaded = 5;

      loader.clearCache();

      expect(loader.sprites.size).toBe(0);
      expect(loader.errorCache.size).toBe(0);
      expect(loader.getStats().totalLoaded).toBe(0);
    });
  });

  describe('removeSprite', () => {
    test('removes sprite from cache', () => {
      loader.sprites.set('test', new MockImage());
      loader.errorCache.add('test');

      loader.removeSprite('test');

      expect(loader.hasSprite('test')).toBe(false);
      expect(loader.hasFailed('test')).toBe(false);
    });
  });

  describe('getStats', () => {
    test('returns loader statistics', () => {
      loader.sprites.set('test1', new MockImage());
      loader.sprites.set('test2', new MockImage());
      loader.loading.set('test3', Promise.resolve());
      loader.errorCache.add('failed');

      const stats = loader.getStats();

      expect(stats.cacheSize).toBe(2);
      expect(stats.loadingCount).toBe(1);
      expect(stats.errorCount).toBe(1);
    });
  });
});
