/**
 * BrowserSaveManager.js - Browser-compatible game save/load system
 *
 * Uses localStorage instead of fs for file I/O
 * Async API to avoid blocking the game loop
 * Fallback to IndexedDB for large saves (future-proofing)
 *
 * Storage Strategy:
 * - Saves < 100KB: Use localStorage (fast, synchronous)
 * - Saves > 100KB: Use IndexedDB (async, unlimited size)
 * - Metadata: Always in localStorage for fast listing
 */

const GameStateSerializer = require('./GameStateSerializer');
const SaveValidator = require('./SaveValidator');

class BrowserSaveManager {
  /**
   * Initialize browser save manager
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      maxLocalStorageSaveSize: config.maxLocalStorageSaveSize || 100 * 1024, // 100KB
      maxAutoSaves: config.maxAutoSaves || 5,
      storagePrefix: config.storagePrefix || 'voxel-rpg-',
      useIndexedDB: config.useIndexedDB !== false,
      ...config
    };

    this.storageAvailable = {
      localStorage: this._checkLocalStorage(),
      indexedDB: this._checkIndexedDB()
    };

    this.currentSave = localStorage.getItem(`${this.config.storagePrefix}current-slot`) || null;
    this.dbPromise = this.storageAvailable.indexedDB ? this._initIndexedDB() : null;

    // Cache for save metadata (to avoid parsing every time)
    this.metadataCache = new Map();
  }

  /**
   * Save game state asynchronously
   * @param {ModuleOrchestrator} orchestrator - Game orchestrator
   * @param {GameEngine} engine - Game engine
   * @param {string} slotName - Save slot name
   * @param {string} description - Save description
   * @returns {Promise<Object>} {success, message, path, size}
   */
  async saveGame(orchestrator, engine, slotName = 'autosave', description = '') {
    try {
      // Serialize game state
      const gameState = GameStateSerializer.serialize(orchestrator, engine);

      // Add metadata
      const saveData = {
        ...gameState,
        metadata: {
          ...gameState.metadata,
          slotName,
          description,
          savedAt: new Date().toISOString(),
          playtimeSeconds: this._calculatePlaytime(engine)
        }
      };

      // Validate before saving
      const validation = SaveValidator.validateSave(saveData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Save validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Generate checksum using SubtleCrypto
      const checksum = await this._generateChecksum(saveData);
      saveData.checksum = checksum;

      // Convert to JSON
      const jsonData = JSON.stringify(saveData);
      const dataSize = new TextEncoder().encode(jsonData).length;

      // Choose storage backend
      const storageKey = `${this.config.storagePrefix}save-${slotName}`;
      const metadataKey = `${this.config.storagePrefix}metadata-${slotName}`;

      if (dataSize < this.config.maxLocalStorageSaveSize) {
        // Use localStorage for small saves
        try {
          localStorage.setItem(storageKey, jsonData);
          localStorage.setItem(
            metadataKey,
            JSON.stringify(saveData.metadata)
          );
        } catch (err) {
          if (err.name === 'QuotaExceededError') {
            // localStorage full, try IndexedDB
            if (this.storageAvailable.indexedDB) {
              return await this._saveToIndexedDB(slotName, saveData, jsonData);
            }
            return {
              success: false,
              message: 'Storage quota exceeded and IndexedDB unavailable'
            };
          }
          throw err;
        }
      } else {
        // Use IndexedDB for large saves
        if (this.storageAvailable.indexedDB) {
          return await this._saveToIndexedDB(slotName, saveData, jsonData);
        }
        return {
          success: false,
          message: `Save too large (${(dataSize / 1024).toFixed(1)}KB) for localStorage and IndexedDB unavailable`
        };
      }

      this.currentSave = slotName;
      localStorage.setItem(`${this.config.storagePrefix}current-slot`, slotName);

      // Update metadata cache
      this.metadataCache.set(slotName, saveData.metadata);

      return {
        success: true,
        message: `Game saved to slot: ${slotName}`,
        size: dataSize,
        sizeFormatted: this._formatBytes(dataSize),
        storage: 'localStorage'
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to save game: ${err.message}`,
        error: err
      };
    }
  }

  /**
   * Load game state asynchronously
   * @param {string} slotName - Save slot name
   * @param {ModuleOrchestrator} orchestrator - Orchestrator to restore into
   * @param {GameEngine} engine - Engine to restore into
   * @returns {Promise<Object>} {success, message, errors, metadata}
   */
  async loadGame(slotName, orchestrator, engine) {
    try {
      const storageKey = `${this.config.storagePrefix}save-${slotName}`;

      // Try localStorage first
      let jsonData = localStorage.getItem(storageKey);

      // If not in localStorage, try IndexedDB
      if (!jsonData && this.storageAvailable.indexedDB) {
        const result = await this._loadFromIndexedDB(slotName);
        if (result) {
          jsonData = result;
        }
      }

      if (!jsonData) {
        return {
          success: false,
          message: `Save file not found: ${slotName}`
        };
      }

      // Parse JSON
      let saveData;
      try {
        saveData = JSON.parse(jsonData);
      } catch (err) {
        return {
          success: false,
          message: `Corrupted save file: ${err.message}`,
          recovered: false
        };
      }

      // Validate checksum
      const checksumValid = await this._validateChecksum(saveData);
      if (!checksumValid) {
        // Try to recover
        const recovered = SaveValidator.repairSave(saveData);
        if (!recovered.success) {
          return {
            success: false,
            message: 'Save file corrupted and could not be repaired',
            recovered: false
          };
        }
        saveData = recovered.data;
      }

      // Validate structure
      const validation = SaveValidator.validateSave(saveData);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Save validation failed: ${validation.errors.join(', ')}`,
          errors: validation.errors
        };
      }

      // Deserialize into modules
      const deserialization = GameStateSerializer.deserialize(
        saveData,
        orchestrator,
        engine
      );

      if (!deserialization.success) {
        return {
          success: false,
          message: 'Failed to restore game state',
          errors: deserialization.errors || [deserialization.error]
        };
      }

      this.currentSave = slotName;
      localStorage.setItem(`${this.config.storagePrefix}current-slot`, slotName);

      // Cache metadata
      this.metadataCache.set(slotName, saveData.metadata);

      return {
        success: true,
        message: `Game loaded from slot: ${slotName}`,
        metadata: saveData.metadata
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to load game: ${err.message}`,
        error: err
      };
    }
  }

  /**
   * Delete save slot
   * @param {string} slotName - Save slot to delete
   * @returns {Promise<Object>} {success, message}
   */
  async deleteSave(slotName) {
    try {
      const storageKey = `${this.config.storagePrefix}save-${slotName}`;
      const metadataKey = `${this.config.storagePrefix}metadata-${slotName}`;

      // Delete from localStorage
      localStorage.removeItem(storageKey);
      localStorage.removeItem(metadataKey);

      // Delete from IndexedDB if available
      if (this.storageAvailable.indexedDB) {
        const db = await this.dbPromise;
        if (db) {
          const tx = db.transaction('saves', 'readwrite');
          await tx.objectStore('saves').delete(slotName);
        }
      }

      if (this.currentSave === slotName) {
        this.currentSave = null;
        localStorage.removeItem(`${this.config.storagePrefix}current-slot`);
      }

      this.metadataCache.delete(slotName);

      return {
        success: true,
        message: `Deleted save slot: ${slotName}`
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to delete save: ${err.message}`,
        error: err
      };
    }
  }

  /**
   * List all available saves with metadata
   * @returns {Promise<Array>} Array of save metadata
   */
  async listSaves() {
    const saves = [];

    // Get all saves from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (!key.startsWith(`${this.config.storagePrefix}metadata-`)) continue;

      try {
        const slotName = key.substring(`${this.config.storagePrefix}metadata-`.length);
        const metadataJson = localStorage.getItem(key);
        const metadata = JSON.parse(metadataJson);

        const storageKey = `${this.config.storagePrefix}save-${slotName}`;
        const saveData = localStorage.getItem(storageKey);
        const size = saveData ? new TextEncoder().encode(saveData).length : 0;

        saves.push({
          slotName,
          description: metadata.description || 'No description',
          savedAt: metadata.savedAt,
          playtime: metadata.playtimeSeconds || 0,
          currentTier: metadata.currentTier,
          tick: metadata.gameTick,
          fileSize: size,
          storage: 'localStorage',
          valid: true
        });
      } catch (err) {
        // Skip invalid entries
      }
    }

    // Get IndexedDB saves if available
    if (this.storageAvailable.indexedDB) {
      try {
        const db = await this.dbPromise;
        if (db) {
          const tx = db.transaction('saves', 'readonly');
          const store = tx.objectStore('saves');
          const allSaves = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          for (const save of allSaves) {
            saves.push({
              slotName: save.slot,
              description: save.metadata?.description || 'No description',
              savedAt: save.metadata?.savedAt,
              playtime: save.metadata?.playtimeSeconds || 0,
              currentTier: save.metadata?.currentTier,
              tick: save.metadata?.gameTick,
              fileSize: save.data.length,
              storage: 'indexedDB',
              valid: true
            });
          }
        }
      } catch (err) {
        // IndexedDB not available, continue with localStorage only
      }
    }

    // Sort by saved date (newest first)
    saves.sort((a, b) => {
      const dateA = new Date(a.savedAt || 0);
      const dateB = new Date(b.savedAt || 0);
      return dateB - dateA;
    });

    return saves;
  }

  /**
   * Check if save exists
   * @param {string} slotName - Save slot name
   * @returns {boolean}
   */
  saveExists(slotName) {
    const storageKey = `${this.config.storagePrefix}save-${slotName}`;
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Get save metadata
   * @param {string} slotName - Save slot name
   * @returns {Object} Save metadata or null
   */
  getSaveMetadata(slotName) {
    // Check cache first
    if (this.metadataCache.has(slotName)) {
      return this.metadataCache.get(slotName);
    }

    // Check localStorage
    const metadataKey = `${this.config.storagePrefix}metadata-${slotName}`;
    const metadataJson = localStorage.getItem(metadataKey);

    if (!metadataJson) return null;

    try {
      const metadata = JSON.parse(metadataJson);
      this.metadataCache.set(slotName, metadata);
      return metadata;
    } catch (err) {
      return null;
    }
  }

  /**
   * Get current save slot
   * @returns {string} Current save slot name or null
   */
  getCurrentSave() {
    return this.currentSave;
  }

  /**
   * Get storage stats
   * @returns {Promise<Object>} Storage usage information
   */
  async getStorageStats() {
    let totalUsed = 0;
    let itemCount = 0;

    // Calculate localStorage usage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.config.storagePrefix)) {
        const value = localStorage.getItem(key);
        totalUsed += new TextEncoder().encode(value).length;
        itemCount++;
      }
    }

    const stats = {
      totalUsed,
      totalUsedFormatted: this._formatBytes(totalUsed),
      itemCount,
      storage: 'localStorage'
    };

    // Add quota info if available
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        stats.quota = estimate.quota;
        stats.available = estimate.quota - estimate.usage;
        stats.percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);
      } catch (err) {
        // Quota API not available
      }
    }

    return stats;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Check if localStorage is available
   * @private
   */
  _checkLocalStorage() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Check if IndexedDB is available
   * @private
   */
  _checkIndexedDB() {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Initialize IndexedDB database
   * @private
   */
  async _initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('voxel-rpg-saves', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'slot' });
        }
      };
    });
  }

  /**
   * Save to IndexedDB
   * @private
   */
  async _saveToIndexedDB(slotName, saveData, jsonData) {
    try {
      const db = await this.dbPromise;
      if (!db) {
        return {
          success: false,
          message: 'IndexedDB not available'
        };
      }

      const tx = db.transaction('saves', 'readwrite');
      const store = tx.objectStore('saves');

      await new Promise((resolve, reject) => {
        const request = store.put({
          slot: slotName,
          data: jsonData,
          metadata: saveData.metadata,
          timestamp: Date.now()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      return {
        success: true,
        message: `Game saved to slot: ${slotName}`,
        size: new TextEncoder().encode(jsonData).length,
        storage: 'indexedDB'
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to save to IndexedDB: ${err.message}`,
        error: err
      };
    }
  }

  /**
   * Load from IndexedDB
   * @private
   */
  async _loadFromIndexedDB(slotName) {
    try {
      const db = await this.dbPromise;
      if (!db) return null;

      const tx = db.transaction('saves', 'readonly');
      const store = tx.objectStore('saves');

      return new Promise((resolve, reject) => {
        const request = store.get(slotName);
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Generate checksum using SubtleCrypto
   * @private
   */
  async _generateChecksum(data) {
    try {
      // Create deterministic data for checksum
      const criticalData = JSON.stringify({
        version: data.version,
        metadata: data.metadata,
        grid: data.grid,
        storage: data.storage,
        npcs: data.npcs
      });

      // Use SubtleCrypto for SHA-256 hash
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(criticalData);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

      // Convert buffer to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      // Fallback if SubtleCrypto not available (shouldn't happen in modern browsers)
      console.warn('SubtleCrypto not available, using simple hash');
      return Math.random().toString(36).substring(2, 15);
    }
  }

  /**
   * Validate checksum using SubtleCrypto
   * @private
   */
  async _validateChecksum(data) {
    if (!data.checksum) {
      return true; // No checksum, can't validate
    }

    const expectedChecksum = await this._generateChecksum(data);
    return expectedChecksum === data.checksum;
  }

  /**
   * Calculate playtime in seconds
   * @private
   */
  _calculatePlaytime(engine) {
    if (!engine.startTime) {
      return 0;
    }

    const elapsedMs = Date.now() - engine.startTime;
    return Math.floor(elapsedMs / 1000);
  }

  /**
   * Format bytes to human-readable string
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = BrowserSaveManager;
