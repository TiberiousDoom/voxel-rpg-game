/**
 * Game3DSaveManager - Save/load system for the 3D voxel game
 *
 * Handles saving:
 * - Player position, health, inventory
 * - Modified chunks (only dirty chunks, not generated terrain)
 * - Game progress
 *
 * Uses binary serialization for chunk data to minimize main-thread overhead.
 * Chunk blocks + heightmap are stored as compact ArrayBuffers in IndexedDB.
 */

import { Chunk } from '../systems/chunks/Chunk';

// eslint-disable-next-line no-unused-vars
const SAVE_KEY = 'voxel3d-save';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

class Game3DSaveManager {
  constructor() {
    this.autoSaveTimer = null;
    this.lastSaveTime = 0;
    this.db = null;
    this.dbReady = this._initIndexedDB();
  }

  async _initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('voxel3d-saves', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for main game state
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'slot' });
        }

        // Store for chunk data (keyed by chunk coordinate)
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'key' });
          chunkStore.createIndex('slot', 'slot', { unique: false });
        }
      };
    });
  }

  /**
   * Save the current game state
   * @param {Object} store - The game store (Zustand)
   * @param {Object} chunkManager - The chunk manager
   * @param {string} slot - Save slot name
   * @returns {Promise<Object>} Result with success/error
   */
  async saveGame(store, chunkManager, slot = 'default') {
    try {
      await this.dbReady;
      const state = store.getState ? store.getState() : store;

      // Extract player state
      const playerState = {
        position: state.player.position,
        health: state.player.health,
        maxHealth: state.player.maxHealth,
        mana: state.player.mana,
        maxMana: state.player.maxMana,
        stamina: state.player.stamina,
        level: state.player.level,
        xp: state.player.xp,
        xpToNext: state.player.xpToNext,
        damage: state.player.damage,
        defense: state.player.defense,
      };

      // Extract inventory
      const inventoryState = {
        gold: state.inventory.gold,
        essence: state.inventory.essence,
        crystals: state.inventory.crystals,
        potions: state.inventory.potions,
        items: state.inventory.items,
        materials: state.inventory.materials,
      };

      // Extract equipment
      const equipmentState = { ...state.equipment };

      // Character progress
      const characterState = state.character ? { ...state.character } : null;

      // Camera state
      const cameraState = {
        firstPerson: state.camera.firstPerson,
        rotationAngle: state.camera.rotationAngle,
        distance: state.camera.distance,
        height: state.camera.height,
      };

      // Main save data
      const saveData = {
        slot,
        version: 1,
        savedAt: Date.now(),
        player: playerState,
        inventory: inventoryState,
        equipment: equipmentState,
        character: characterState,
        camera: cameraState,
      };

      // Save main state
      const transaction = this.db.transaction(['saves'], 'readwrite');
      const store_db = transaction.objectStore('saves');

      await new Promise((resolve, reject) => {
        const request = store_db.put(saveData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Save modified chunks
      if (chunkManager) {
        await this._saveModifiedChunks(chunkManager, slot);
      }

      this.lastSaveTime = Date.now();

      return {
        success: true,
        message: 'Game saved successfully',
        savedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to save game:', error);
      return {
        success: false,
        message: `Save failed: ${error.message}`,
        error,
      };
    }
  }

  /**
   * Save modified chunks to IndexedDB using binary serialization.
   * Stores chunk data as compact ArrayBuffers (~4.3KB each) instead of
   * JSON arrays (~16KB each), reducing both serialization time and storage.
   */
  async _saveModifiedChunks(chunkManager, slot) {
    if (!chunkManager.chunks) return;

    const transaction = this.db.transaction(['chunks'], 'readwrite');
    const store = transaction.objectStore('chunks');

    const promises = [];

    for (const [key, chunk] of chunkManager.chunks) {
      if (chunk.isDirty || chunk.lastModified > 0) {
        const chunkData = {
          key: `${slot}-${key}`,
          slot,
          chunkKey: key,
          binaryData: chunk.serializeBinary(), // Compact ArrayBuffer
          lastModified: chunk.lastModified,
        };

        promises.push(new Promise((resolve, reject) => {
          const request = store.put(chunkData);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Load game state
   * @param {Object} store - The game store
   * @param {Object} chunkManager - The chunk manager
   * @param {string} slot - Save slot name
   * @returns {Promise<Object>} Result with success/error
   */
  async loadGame(store, chunkManager, slot = 'default') {
    try {
      await this.dbReady;

      const transaction = this.db.transaction(['saves'], 'readonly');
      const store_db = transaction.objectStore('saves');

      const saveData = await new Promise((resolve, reject) => {
        const request = store_db.get(slot);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!saveData) {
        return {
          success: false,
          message: `No save found in slot: ${slot}`,
        };
      }

      // Restore player state
      if (store.updatePlayer) {
        store.updatePlayer(saveData.player);
      }

      // Restore inventory
      if (store.setState) {
        store.setState({ inventory: saveData.inventory });
      }

      // Restore equipment
      if (saveData.equipment && store.setState) {
        store.setState({ equipment: saveData.equipment });
      }

      // Restore camera
      if (saveData.camera && store.updateCamera) {
        store.updateCamera(saveData.camera);
      }

      // Load modified chunks
      if (chunkManager) {
        await this._loadModifiedChunks(chunkManager, slot);
      }

      return {
        success: true,
        message: 'Game loaded successfully',
        savedAt: new Date(saveData.savedAt).toISOString(),
      };
    } catch (error) {
      console.error('Failed to load game:', error);
      return {
        success: false,
        message: `Load failed: ${error.message}`,
        error,
      };
    }
  }

  /**
   * Load modified chunks from IndexedDB using binary deserialization.
   * Supports both binary format (new) and legacy JSON array format.
   */
  async _loadModifiedChunks(chunkManager, slot) {
    const transaction = this.db.transaction(['chunks'], 'readonly');
    const store = transaction.objectStore('chunks');
    const index = store.index('slot');

    const chunks = await new Promise((resolve, reject) => {
      const request = index.getAll(slot);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Apply saved chunk data
    for (const chunkData of chunks) {
      if (chunkData.binaryData) {
        // New binary format
        const restored = Chunk.deserializeBinary(chunkData.binaryData);
        const chunk = chunkManager.getChunk(restored.x, restored.z);
        if (chunk) {
          chunk.blocks = restored.blocks;
          chunk.heightMap = restored.heightMap;
          chunk.lastModified = chunkData.lastModified;
          chunk.meshDirty = true;
        }
      } else if (chunkData.blocks) {
        // Legacy JSON array format
        const chunk = chunkManager.getChunk(chunkData.x, chunkData.z);
        if (chunk) {
          chunk.blocks = new Uint8Array(chunkData.blocks);
          chunk.heightMap = new Uint8Array(chunkData.heightMap);
          chunk.lastModified = chunkData.lastModified;
          chunk.meshDirty = true;
        }
      }
    }
  }

  /**
   * Start auto-save timer
   */
  startAutoSave(store, chunkManager, slot = 'autosave') {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      const result = await this.saveGame(store, chunkManager, slot);
      if (result.success) {
        console.log('[AutoSave] Game saved automatically');
      }
    }, AUTO_SAVE_INTERVAL);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * List available saves
   */
  async listSaves() {
    try {
      await this.dbReady;

      const transaction = this.db.transaction(['saves'], 'readonly');
      const store = transaction.objectStore('saves');

      const saves = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return saves.map(save => ({
        slot: save.slot,
        savedAt: new Date(save.savedAt).toISOString(),
        playerLevel: save.player?.level || 1,
        version: save.version,
      }));
    } catch (error) {
      console.error('Failed to list saves:', error);
      return [];
    }
  }

  /**
   * Delete a save
   */
  async deleteSave(slot) {
    try {
      await this.dbReady;

      // Delete main save
      const saveTx = this.db.transaction(['saves'], 'readwrite');
      const saveStore = saveTx.objectStore('saves');
      await new Promise((resolve, reject) => {
        const request = saveStore.delete(slot);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Delete associated chunks
      const chunkTx = this.db.transaction(['chunks'], 'readwrite');
      const chunkStore = chunkTx.objectStore('chunks');
      const index = chunkStore.index('slot');

      const chunks = await new Promise((resolve, reject) => {
        const request = index.getAllKeys(slot);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      for (const key of chunks) {
        chunkStore.delete(key);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }
}

// Singleton instance
export const game3DSaveManager = new Game3DSaveManager();
export default Game3DSaveManager;
