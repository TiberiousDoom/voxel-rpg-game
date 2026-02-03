/**
 * SaveManager.js - Game save/load file management
 *
 * Handles:
 * - Saving game state to files
 * - Loading saved game states
 * - Managing multiple save slots
 * - Save metadata (playtime, progress, etc.)
 * - Error handling and recovery
 */

const fs = require('fs');
const path = require('path');
const GameStateSerializer = require('./GameStateSerializer').default || require('./GameStateSerializer');
const SaveValidator = require('./SaveValidator').default || require('./SaveValidator');

class SaveManager {
  /**
   * Initialize SaveManager
   * @param {string} savePath - Directory for save files (default: ./.saves)
   */
  constructor(savePath = './.saves') {
    this.savePath = savePath;
    this.maxSaves = 10;
    this.currentSave = null;
    this.autoSaveInterval = null;

    // Ensure save directory exists
    this._ensureSaveDirectory();
  }

  /**
   * Save game state to file
   * @param {ModuleOrchestrator} orchestrator - Game orchestrator
   * @param {GameEngine} engine - Game engine
   * @param {string} slotName - Save slot name
   * @param {string} description - Save description
   * @returns {Object} {success, message, path}
   */
  saveGame(orchestrator, engine, slotName = 'autosave', description = '') {
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
          playtimeSeconds: this._calculatePlaytime(orchestrator, engine)
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

      // Add checksum for integrity
      saveData.checksum = SaveValidator.generateChecksum(saveData);

      // Write to file
      const filename = this._getSaveFilePath(slotName);
      const jsonData = JSON.stringify(saveData, null, 2);
      fs.writeFileSync(filename, jsonData, 'utf8');

      this.currentSave = slotName;

      return {
        success: true,
        message: `Game saved to slot: ${slotName}`,
        path: filename,
        size: jsonData.length
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
   * Load game state from file
   * @param {string} slotName - Save slot name
   * @param {ModuleOrchestrator} orchestrator - Orchestrator to restore into
   * @param {GameEngine} engine - Engine to restore into
   * @returns {Object} {success, message, errors}
   */
  loadGame(slotName, orchestrator, engine) {
    try {
      const filename = this._getSaveFilePath(slotName);

      // Check file exists
      if (!fs.existsSync(filename)) {
        return {
          success: false,
          message: `Save file not found: ${slotName}`
        };
      }

      // Read file
      const jsonData = fs.readFileSync(filename, 'utf8');
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
      const checksumValid = SaveValidator.validateChecksum(saveData);
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
   * @returns {Object} {success, message}
   */
  deleteSave(slotName) {
    try {
      const filename = this._getSaveFilePath(slotName);

      if (!fs.existsSync(filename)) {
        return {
          success: false,
          message: `Save file not found: ${slotName}`
        };
      }

      fs.unlinkSync(filename);

      if (this.currentSave === slotName) {
        this.currentSave = null;
      }

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
   * List all available saves
   * @returns {Array} Array of save metadata
   */
  listSaves() {
    try {
      if (!fs.existsSync(this.savePath)) {
        return [];
      }

      const files = fs.readdirSync(this.savePath);
      const saves = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filename = path.join(this.savePath, file);
          const jsonData = fs.readFileSync(filename, 'utf8');
          const saveData = JSON.parse(jsonData);

          saves.push({
            slotName: saveData.metadata?.slotName || file,
            description: saveData.metadata?.description || 'No description',
            savedAt: saveData.metadata?.savedAt,
            playtime: saveData.metadata?.playtimeSeconds || 0,
            currentTier: saveData.metadata?.currentTier,
            tick: saveData.metadata?.gameTick,
            fileSize: fs.statSync(filename).size,
            valid: SaveValidator.validateChecksum(saveData)
          });
        } catch (err) {
          // Skip invalid saves
        }
      }

      return saves.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    } catch (err) {
      return [];
    }
  }

  /**
   * Start auto-save timer
   * @param {ModuleOrchestrator} orchestrator - Game orchestrator
   * @param {GameEngine} engine - Game engine
   * @param {number} intervalSeconds - Auto-save interval in seconds
   */
  startAutoSave(orchestrator, engine, intervalSeconds = 300) {
    // Stop existing auto-save
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      this.saveGame(
        orchestrator,
        engine,
        `autosave-${timestamp}`,
        'Auto-save'
      );

      // Clean up old auto-saves (keep only last 10)
      this._cleanupOldAutoSaves();
    }, intervalSeconds * 1000);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
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
   * Check if save exists
   * @param {string} slotName - Save slot name
   * @returns {boolean}
   */
  saveExists(slotName) {
    return fs.existsSync(this._getSaveFilePath(slotName));
  }

  /**
   * Get save metadata
   * @param {string} slotName - Save slot name
   * @returns {Object} Save metadata or null
   */
  getSaveMetadata(slotName) {
    try {
      const filename = this._getSaveFilePath(slotName);

      if (!fs.existsSync(filename)) {
        return null;
      }

      const jsonData = fs.readFileSync(filename, 'utf8');
      const saveData = JSON.parse(jsonData);

      return saveData.metadata || null;
    } catch (err) {
      return null;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Ensure save directory exists
   * @private
   */
  _ensureSaveDirectory() {
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }
  }

  /**
   * Get full save file path
   * @private
   */
  _getSaveFilePath(slotName) {
    // Sanitize slot name
    const safeName = slotName.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    return path.join(this.savePath, `${safeName}.json`);
  }

  /**
   * Calculate playtime in seconds
   * @private
   */
  _calculatePlaytime(orchestrator, engine) {
    if (!engine.startTime) {
      return 0;
    }

    const elapsedMs = Date.now() - engine.startTime;
    return Math.floor(elapsedMs / 1000);
  }

  /**
   * Clean up old auto-save files
   * @private
   */
  _cleanupOldAutoSaves() {
    try {
      const saves = this.listSaves();
      const autoSaves = saves.filter(s => s.slotName.startsWith('autosave-'));

      if (autoSaves.length > this.maxSaves) {
        const toDelete = autoSaves.slice(this.maxSaves);

        for (const save of toDelete) {
          this.deleteSave(save.slotName);
        }
      }
    } catch (err) {
      // Silently fail on cleanup
    }
  }
}


export default SaveManager;
