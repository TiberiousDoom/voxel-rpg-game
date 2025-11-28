/**
 * SaveSystem.js - Terrain save/load system with differential saves
 *
 * Implements efficient save/load for procedurally generated terrain using
 * differential saves (only save modifications from baseline).
 *
 * Part of Phase 1: Core Terrain Generation System
 *
 * Architecture:
 * - Differential saves: Only modified tiles are saved
 * - Run-length encoding: Compress consecutive unchanged tiles
 * - Version migration: Handle save format changes
 * - Multiplayer sync: Chunk-based synchronization
 *
 * Save Format:
 * {
 *   version: 1,
 *   seed: 12345,
 *   worldConfig: {...},
 *   modifications: [
 *     {x, z, height, originalHeight},
 *     ...
 *   ],
 *   metadata: {
 *     savedAt: timestamp,
 *     totalModifications: count
 *   }
 * }
 *
 * Performance Targets:
 * - Save time: <2 seconds for 10,000 modifications
 * - Load time: <2 seconds for 10,000 modifications
 * - File size: <5 MB for typical world
 * - Compression ratio: 80%+ for sparse modifications
 */

export class SaveSystem {
  static VERSION = 1;

  /**
   * Serialize terrain system to JSON
   * Uses differential saves for efficiency
   *
   * @param {TerrainSystem} terrainSystem - Terrain system to save
   * @param {object} options - Save options
   * @returns {object} Serialized data
   */
  static serialize(terrainSystem, options = {}) {
    const {
      includeMetadata = true,
      compress = true
    } = options;

    const startTime = performance.now();

    // Get world generator state
    const worldData = terrainSystem.getWorldGenerator().toJSON();

    // Get terrain modifications (differential save)
    const modifications = terrainSystem.getTerrainManager().getModifications();

    // Build save data
    const saveData = {
      version: SaveSystem.VERSION,
      seed: terrainSystem.seed,
      worldConfig: worldData.config,
      modifications: compress ? SaveSystem.compressModifications(modifications) : modifications
    };

    // Add metadata if requested
    if (includeMetadata) {
      const elapsed = performance.now() - startTime;
      saveData.metadata = {
        savedAt: Date.now(),
        totalModifications: modifications.length,
        compressed: compress,
        saveTime: elapsed,
        systemStats: terrainSystem.getStats()
      };
    }

    return saveData;
  }

  /**
   * Deserialize terrain system from JSON
   * Restores modifications over procedural baseline
   *
   * @param {object} saveData - Serialized save data
   * @param {object} options - Load options
   * @returns {TerrainSystem} Restored terrain system
   */
  static deserialize(saveData, options = {}) {
    const {
      migrateVersion = true
    } = options;

    const startTime = performance.now();

    // Migrate save data if needed
    if (migrateVersion && saveData.version !== SaveSystem.VERSION) {
      saveData = SaveSystem.migrate(saveData, SaveSystem.VERSION);
    }

    // Import TerrainSystem dynamically to avoid circular dependency
    const { TerrainSystem } = require('./TerrainSystem.js');

    // Create terrain system with saved seed and config
    const terrainSystem = new TerrainSystem({
      seed: saveData.seed,
      preset: null, // Don't use preset, use exact config
      ...saveData.worldConfig
    });

    // Restore world generator config
    const { WorldGenerator } = require('./WorldGenerator.js');
    terrainSystem.worldGenerator = WorldGenerator.fromJSON({
      seed: saveData.seed,
      config: saveData.worldConfig
    });

    // Decompress modifications if needed
    const modifications = saveData.metadata?.compressed
      ? SaveSystem.decompressModifications(saveData.modifications)
      : saveData.modifications;

    // Apply modifications to terrain
    const terrainManager = terrainSystem.getTerrainManager();
    modifications.forEach(mod => {
      terrainManager.setHeight(mod.x, mod.z, mod.modifiedHeight);
    });

    const elapsed = performance.now() - startTime;

    // Log performance if metadata exists
    if (saveData.metadata) {
      console.log(`Terrain loaded: ${modifications.length} modifications in ${elapsed.toFixed(2)}ms`);
    }

    return terrainSystem;
  }

  /**
   * Compress modifications using run-length encoding
   * Groups consecutive tiles with same height
   *
   * @param {Array} modifications - Array of modifications
   * @returns {Array} Compressed modifications
   */
  static compressModifications(modifications) {
    if (!modifications || modifications.length === 0) {
      return [];
    }

    // Sort by position for better compression
    const sorted = [...modifications].sort((a, b) => {
      if (a.z !== b.z) return a.z - b.z;
      return a.x - b.x;
    });

    const compressed = [];
    let current = null;

    sorted.forEach(mod => {
      if (!current) {
        current = {
          x: mod.x,
          z: mod.z,
          height: mod.modifiedHeight,
          count: 1
        };
      } else if (
        // Check if this tile is adjacent and same height
        mod.z === current.z &&
        mod.x === current.x + current.count &&
        mod.modifiedHeight === current.height
      ) {
        // Extend run
        current.count++;
      } else {
        // Save current run and start new one
        compressed.push(current);
        current = {
          x: mod.x,
          z: mod.z,
          height: mod.modifiedHeight,
          count: 1
        };
      }
    });

    // Add final run
    if (current) {
      compressed.push(current);
    }

    return compressed;
  }

  /**
   * Decompress run-length encoded modifications
   *
   * @param {Array} compressed - Compressed modifications
   * @returns {Array} Decompressed modifications
   */
  static decompressModifications(compressed) {
    const decompressed = [];

    compressed.forEach(run => {
      for (let i = 0; i < (run.count || 1); i++) {
        decompressed.push({
          x: run.x + i,
          z: run.z,
          modifiedHeight: run.height,
          originalHeight: 0 // Will be regenerated from seed
        });
      }
    });

    return decompressed;
  }

  /**
   * Migrate save data between versions
   *
   * @param {object} saveData - Old save data
   * @param {number} targetVersion - Target version
   * @returns {object} Migrated save data
   */
  static migrate(saveData, targetVersion) {
    let data = { ...saveData };
    const fromVersion = data.version || 1;

    console.log(`Migrating save data from version ${fromVersion} to ${targetVersion}`);

    // Add migration logic here as versions evolve
    // Example:
    // if (fromVersion < 2) {
    //   data = SaveSystem.migrateV1toV2(data);
    // }

    data.version = targetVersion;
    return data;
  }

  /**
   * Export to localStorage
   *
   * @param {TerrainSystem} terrainSystem - Terrain system to save
   * @param {string} key - localStorage key
   * @param {object} options - Save options
   * @returns {boolean} Success
   */
  static saveToLocalStorage(terrainSystem, key = 'terrain_save', options = {}) {
    try {
      const saveData = SaveSystem.serialize(terrainSystem, options);
      const json = JSON.stringify(saveData);

      // Check size (localStorage has ~5-10MB limit)
      const sizeKB = new Blob([json]).size / 1024;
      if (sizeKB > 5000) {
        console.warn(`Save data is large (${sizeKB.toFixed(2)} KB). May exceed localStorage limits.`);
      }

      localStorage.setItem(key, json);
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  /**
   * Import from localStorage
   *
   * @param {string} key - localStorage key
   * @param {object} options - Load options
   * @returns {TerrainSystem|null} Loaded terrain system
   */
  static loadFromLocalStorage(key = 'terrain_save', options = {}) {
    try {
      const json = localStorage.getItem(key);
      if (!json) {
        return null;
      }

      const saveData = JSON.parse(json);
      return SaveSystem.deserialize(saveData, options);
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  /**
   * Export to file (for download)
   *
   * @param {TerrainSystem} terrainSystem - Terrain system to save
   * @param {string} filename - Output filename
   * @param {object} options - Save options
   */
  static exportToFile(terrainSystem, filename = 'terrain_save.json', options = {}) {
    const saveData = SaveSystem.serialize(terrainSystem, options);
    const json = JSON.stringify(saveData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Import from file
   *
   * @param {File} file - Input file
   * @param {object} options - Load options
   * @returns {Promise<TerrainSystem>} Loaded terrain system
   */
  static async importFromFile(file, options = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const saveData = JSON.parse(e.target.result);
          const terrainSystem = SaveSystem.deserialize(saveData, options);
          resolve(terrainSystem);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Get save data statistics
   *
   * @param {TerrainSystem} terrainSystem - Terrain system
   * @returns {object} Statistics
   */
  static getStats(terrainSystem) {
    const uncompressed = SaveSystem.serialize(terrainSystem, { compress: false });
    const compressed = SaveSystem.serialize(terrainSystem, { compress: true });

    const uncompressedSize = new Blob([JSON.stringify(uncompressed)]).size;
    const compressedSize = new Blob([JSON.stringify(compressed)]).size;

    return {
      modifications: uncompressed.modifications.length,
      compressedRuns: compressed.modifications.length,
      compressionRatio: ((1 - compressedSize / uncompressedSize) * 100).toFixed(2) + '%',
      uncompressedSize: (uncompressedSize / 1024).toFixed(2) + ' KB',
      compressedSize: (compressedSize / 1024).toFixed(2) + ' KB',
      savedKB: ((uncompressedSize - compressedSize) / 1024).toFixed(2) + ' KB'
    };
  }

  /**
   * Clear save data from localStorage
   *
   * @param {string} key - localStorage key
   * @returns {boolean} Success
   */
  static clearSave(key = 'terrain_save') {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to clear save:', error);
      return false;
    }
  }

  /**
   * Check if save exists
   *
   * @param {string} key - localStorage key
   * @returns {boolean} True if save exists
   */
  static hasSave(key = 'terrain_save') {
    return localStorage.getItem(key) !== null;
  }
}

/**
 * Multiplayer synchronization helpers
 * For syncing terrain modifications between clients
 */
export class MultiplayerSync {
  /**
   * Create a chunk modification packet
   * Contains all modifications within a chunk
   *
   * @param {TerrainSystem} terrainSystem - Terrain system
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {object} Chunk modification packet
   */
  static createChunkPacket(terrainSystem, chunkX, chunkZ) {
    const chunkSize = terrainSystem.config.chunkSize;
    const modifications = terrainSystem.getTerrainManager().getModifications();

    // Filter modifications for this chunk
    const chunkMods = modifications.filter(mod => {
      const modChunkX = Math.floor(mod.x / chunkSize);
      const modChunkZ = Math.floor(mod.z / chunkSize);
      return modChunkX === chunkX && modChunkZ === chunkZ;
    });

    return {
      chunkX,
      chunkZ,
      modifications: SaveSystem.compressModifications(chunkMods),
      timestamp: Date.now()
    };
  }

  /**
   * Apply chunk modification packet
   *
   * @param {TerrainSystem} terrainSystem - Terrain system
   * @param {object} packet - Chunk modification packet
   */
  static applyChunkPacket(terrainSystem, packet) {
    const modifications = SaveSystem.decompressModifications(packet.modifications);
    const terrainManager = terrainSystem.getTerrainManager();

    modifications.forEach(mod => {
      terrainManager.setHeight(mod.x, mod.z, mod.modifiedHeight);
    });
  }

  /**
   * Create delta packet (modifications since timestamp)
   * For efficient synchronization
   *
   * @param {TerrainSystem} terrainSystem - Terrain system
   * @param {number} sinceTimestamp - Only include modifications after this time
   * @returns {object} Delta packet
   */
  static createDeltaPacket(terrainSystem, sinceTimestamp) {
    // Note: Would need to track modification timestamps in TerrainManager
    // For now, return all modifications
    const modifications = terrainSystem.getTerrainManager().getModifications();

    return {
      modifications: SaveSystem.compressModifications(modifications),
      timestamp: Date.now()
    };
  }
}
