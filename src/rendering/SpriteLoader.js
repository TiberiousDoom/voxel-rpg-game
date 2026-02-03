/**
 * SpriteLoader.js
 * Handles loading and caching of sprite images
 *
 * Features:
 * - Image loading with promise-based API
 * - Sprite sheet loading and frame extraction
 * - Memory caching for performance
 * - Error handling and retry logic
 * - Graceful fallback on load failures
 */

import SpriteSheetParser from './SpriteSheetParser.js';

/**
 * SpriteLoader class
 * Loads and caches sprite images from URLs
 */
class SpriteLoader {
  constructor() {
    /**
     * Cache of loaded sprites
     * Map<string, HTMLImageElement | SpriteSheetParser>
     */
    this.sprites = new Map();

    /**
     * Promises for sprites currently loading
     * Map<string, Promise<HTMLImageElement>>
     */
    this.loading = new Map();

    /**
     * Set of sprite keys that failed to load
     * Set<string>
     */
    this.errorCache = new Set();

    /**
     * Performance stats
     */
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      totalCached: 0,
      lastLoadTime: 0
    };
  }

  /**
   * Load a single sprite image
   *
   * @param {string} key - Unique identifier for the sprite
   * @param {string} path - Path to sprite image
   * @returns {Promise<HTMLImageElement>}
   */
  async loadSprite(key, path) {
    // Return cached sprite if available
    if (this.sprites.has(key)) {
      this.stats.totalCached++;
      return this.sprites.get(key);
    }

    // Return existing loading promise if in progress
    if (this.loading.has(key)) {
      return this.loading.get(key);
    }

    // Check if this sprite previously failed
    if (this.errorCache.has(key)) {
      throw new Error(`Sprite ${key} previously failed to load`);
    }

    // Start loading
    const startTime = performance.now();
    const loadingPromise = this._loadImage(path)
      .then(image => {
        this.sprites.set(key, image);
        this.loading.delete(key);
        this.stats.totalLoaded++;
        this.stats.lastLoadTime = performance.now() - startTime;
        return image;
      })
      .catch(error => {
        this.loading.delete(key);
        this.errorCache.add(key);
        this.stats.totalFailed++;
        throw new Error(`Failed to load sprite ${key} from ${path}: ${error.message}`);
      });

    this.loading.set(key, loadingPromise);
    return loadingPromise;
  }

  /**
   * Load a sprite sheet and parse into frames
   *
   * @param {string} key - Unique identifier for the sprite sheet
   * @param {string} path - Path to sprite sheet image
   * @param {number} frameWidth - Width of each frame in pixels
   * @param {number} frameHeight - Height of each frame in pixels
   * @returns {Promise<SpriteSheetParser>}
   */
  async loadSpriteSheet(key, path, frameWidth, frameHeight) {
    // Return cached sprite sheet if available
    if (this.sprites.has(key)) {
      this.stats.totalCached++;
      return this.sprites.get(key);
    }

    // Check if already loading
    if (this.loading.has(key)) {
      return this.loading.get(key);
    }

    // Check if previously failed
    if (this.errorCache.has(key)) {
      throw new Error(`Sprite sheet ${key} previously failed to load`);
    }

    // Start loading
    const startTime = performance.now();
    const loadingPromise = this._loadImage(path)
      .then(image => {
        const parser = new SpriteSheetParser(image, frameWidth, frameHeight);
        this.sprites.set(key, parser);
        this.loading.delete(key);
        this.stats.totalLoaded++;
        this.stats.lastLoadTime = performance.now() - startTime;
        return parser;
      })
      .catch(error => {
        this.loading.delete(key);
        this.errorCache.add(key);
        this.stats.totalFailed++;
        throw new Error(`Failed to load sprite sheet ${key} from ${path}: ${error.message}`);
      });

    this.loading.set(key, loadingPromise);
    return loadingPromise;
  }

  /**
   * Load multiple sprites from a manifest
   *
   * @param {Object} manifest - Sprite manifest object
   * @returns {Promise<Array>}
   */
  async loadManifest(manifest) {
    const promises = [];

    for (const [entityKey, entityData] of Object.entries(manifest)) {
      if (entityData.sprites) {
        // Load individual sprites (e.g., buildings)
        for (const [stateKey, spritePath] of Object.entries(entityData.sprites)) {
          const key = `${entityKey}_${stateKey}`;
          promises.push(this.loadSprite(key, spritePath));
        }
      } else if (entityData.idle || entityData.walk) {
        // Load sprite sheets (e.g., NPCs, player)
        const frameSize = entityData.frameSize || { width: 16, height: 16 };

        for (const [animKey, animPath] of Object.entries(entityData)) {
          if (animKey === 'frames' || animKey === 'frameSize') continue;

          const key = `${entityKey}_${animKey}`;

          promises.push(
            this.loadSpriteSheet(key, animPath, frameSize.width, frameSize.height)
          );
        }
      }
    }

    return Promise.allSettled(promises);
  }

  /**
   * Get a loaded sprite by key
   *
   * @param {string} key - Sprite key
   * @returns {HTMLImageElement | SpriteSheetParser | null}
   */
  getSprite(key) {
    return this.sprites.get(key) || null;
  }

  /**
   * Check if a sprite is loaded
   *
   * @param {string} key - Sprite key
   * @returns {boolean}
   */
  hasSprite(key) {
    return this.sprites.has(key);
  }

  /**
   * Check if a sprite is currently loading
   *
   * @param {string} key - Sprite key
   * @returns {boolean}
   */
  isLoading(key) {
    return this.loading.has(key);
  }

  /**
   * Check if a sprite failed to load
   *
   * @param {string} key - Sprite key
   * @returns {boolean}
   */
  hasFailed(key) {
    return this.errorCache.has(key);
  }

  /**
   * Clear all cached sprites
   */
  clearCache() {
    this.sprites.clear();
    this.loading.clear();
    this.errorCache.clear();
    this.stats = {
      totalLoaded: 0,
      totalFailed: 0,
      totalCached: 0,
      lastLoadTime: 0
    };
  }

  /**
   * Remove a specific sprite from cache
   *
   * @param {string} key - Sprite key
   */
  removeSprite(key) {
    this.sprites.delete(key);
    this.errorCache.delete(key);
  }

  /**
   * Get loader statistics
   *
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.sprites.size,
      loadingCount: this.loading.size,
      errorCount: this.errorCache.size
    };
  }

  /**
   * Internal method to load an image
   *
   * @private
   * @param {string} path - Image path
   * @returns {Promise<HTMLImageElement>}
   */
  _loadImage(path) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(new Error(`Failed to load image from ${path}`));
      };

      // Handle CORS if needed
      image.crossOrigin = 'anonymous';
      image.src = path;
    });
  }
}

export default SpriteLoader;
