/**
 * Game3DSaveManager - Save/load system for the 3D voxel game
 *
 * Handles saving:
 * - Player stats, position, inventory, equipment, character progression
 * - World edits: every modified chunk, loaded or not (see ChunkManager.getModifiedChunks)
 * - Settlement, zones, construction sites, world time, unlocked spells, hints
 *
 * Chunk blocks + heightmap are stored as compact ArrayBuffers in IndexedDB.
 * The main state and all chunks of a slot are written in ONE transaction so a
 * save is never half-written, and saves are serialized so an autosave can't
 * interleave with a manual save.
 */

import { Chunk } from '../systems/chunks/Chunk';
import useQuestStore from '../stores/useQuestStore';

const SAVE_VERSION = 6;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Player fields that describe a moment in time, not progress. Not saved.
const TRANSIENT_PLAYER_FIELDS = new Set([
  'velocity', 'targetPosition', 'navPath', 'navPathIndex',
  'isJumping', 'isGrounded', 'isDodging', 'isBlocking', 'isSprinting',
  'isInvincible', 'invincibilityTimer', 'comboCount', 'comboTimer',
  'statusEffects', 'spellCooldowns', 'potionCooldown',
]);

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/**
 * Normalize the `store` argument: accepts the zustand hook (useGameStore) or a
 * plain state object. Returns accessors that always see the latest state.
 */
function resolveStore(store) {
  const api = typeof store?.getState === 'function' ? store : null;
  return {
    getState: () => (api ? api.getState() : store),
    setState: (partial) => {
      if (api) api.setState(partial);
      else Object.assign(store, typeof partial === 'function' ? partial(store) : partial);
    },
  };
}

/**
 * Validate the shape of a loaded save. Saves come from IndexedDB, which the
 * user (or another tab/extension) can edit, so don't trust them blindly.
 * @returns {string[]} errors (empty when valid)
 */
export function validateSaveData(saveData) {
  const errors = [];
  if (!isObject(saveData)) return ['Save data is not an object'];
  if (!isObject(saveData.player)) errors.push('Missing player');
  else {
    if (saveData.player.position !== undefined && !isVec3(saveData.player.position)) {
      errors.push('Invalid player position');
    }
    for (const k of ['health', 'maxHealth', 'level', 'xp']) {
      const v = saveData.player[k];
      if (v !== undefined && !Number.isFinite(v)) errors.push(`Invalid player.${k}`);
    }
  }
  if (!isObject(saveData.inventory)) errors.push('Missing inventory');
  else if (saveData.inventory.materials !== undefined && !isObject(saveData.inventory.materials)) {
    errors.push('Invalid inventory materials');
  }
  for (const k of ['zones', 'constructionSites']) {
    if (saveData[k] != null && !Array.isArray(saveData[k])) errors.push(`Invalid ${k}`);
  }
  if (saveData.settlement != null && !Array.isArray(saveData.settlement.npcs ?? [])) {
    errors.push('Invalid settlement npcs');
  }
  return errors;
}

/** Bring older saves up to the current version. Mutates and returns saveData. */
function migrateSave(saveData) {
  // V1 → V2: hunger + worldTime
  if (!saveData.version || saveData.version < 2) {
    saveData.hunger = saveData.hunger || { current: 100, max: 100, isStarving: false, status: 'well_fed' };
    saveData.worldTime = saveData.worldTime || null; // Let store defaults handle it
    saveData.version = 2;
  }
  // V2 → V3: settlement
  if (saveData.version < 3) {
    saveData.settlement = null;
    saveData.version = 3;
  }
  // V3 → V4: zones
  if (saveData.version < 4) {
    saveData.zones = [];
    saveData.version = 4;
  }
  // V4 → V5: construction sites
  if (saveData.version < 5) {
    saveData.constructionSites = [];
    saveData.version = 5;
  }
  // V5 → V6: unlocked spells, tutorial hints, quests (store defaults apply when absent)
  if (saveData.version < 6) {
    saveData.version = 6;
  }
  return saveData;
}

class Game3DSaveManager {
  constructor() {
    this.autoSaveTimer = null;
    this.lastSaveTime = 0;
    this.db = null;
    this.dbReady = this._initIndexedDB();
    // Serializes save/load/delete so they never interleave
    this._opChain = Promise.resolve();
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

  /** Run `fn` after every previously queued operation has finished. */
  _enqueue(fn) {
    const run = this._opChain.then(fn, fn);
    this._opChain = run.catch(() => {});
    return run;
  }

  /**
   * Save the current game state
   * @param {Object} store - The game store hook (useGameStore) or a state object
   * @param {Object} chunkManager - The chunk manager
   * @param {string} slot - Save slot name
   * @returns {Promise<Object>} Result with success/error
   */
  saveGame(store, chunkManager, slot = 'default') {
    return this._enqueue(() => this._saveGame(store, chunkManager, slot));
  }

  async _saveGame(store, chunkManager, slot) {
    try {
      await this.dbReady;
      const state = resolveStore(store).getState();

      const playerState = {};
      for (const [key, value] of Object.entries(state.player)) {
        if (!TRANSIENT_PLAYER_FIELDS.has(key)) playerState[key] = value;
      }

      const saveData = {
        slot,
        version: SAVE_VERSION,
        savedAt: Date.now(),
        player: playerState,
        inventory: { ...state.inventory },
        equipment: { ...state.equipment },
        character: state.character ? { ...state.character } : null,
        camera: {
          firstPerson: state.camera.firstPerson,
          rotationAngle: state.camera.rotationAngle,
          distance: state.camera.distance,
          height: state.camera.height,
          pitch: state.camera.pitch,
          yaw: state.camera.yaw,
        },
        hunger: state.hunger ? { ...state.hunger } : null,
        worldTime: state.worldTime ? { ...state.worldTime } : null,
        settlement: state.settlement ? {
          npcs: state.settlement.npcs,
          settlementCenter: state.settlement.settlementCenter,
          attractiveness: state.settlement.attractiveness,
          wallCount: state.settlement.wallCount,
        } : null,
        zones: state.zones || [],
        constructionSites: state.constructionSites || [],
        unlockedSpells: state.unlockedSpells || null,
        tutorialHints: state.tutorialHints || null,
        quests: { completedQuestIds: useQuestStore.getState().completedQuestIds || [] },
      };

      const modifiedChunks = chunkManager?.getModifiedChunks ? chunkManager.getModifiedChunks() : [];
      const chunkRecords = modifiedChunks.map((c) => {
        const chunk = new Chunk(c.x, c.z);
        chunk.blocks = c.blocks;
        chunk.rebuildHeightMap();
        return {
          key: `${slot}-${c.key}`,
          slot,
          chunkKey: c.key,
          binaryData: chunk.serializeBinary(), // Compact ArrayBuffer (copies blocks)
          lastModified: c.lastModified,
        };
      });

      // One transaction: main state + replace all of this slot's chunks.
      // Old chunk records are deleted first so edits reverted since the last
      // save don't resurrect on load.
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['saves', 'chunks'], 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Save transaction aborted'));

        tx.objectStore('saves').put(saveData);
        const chunkStore = tx.objectStore('chunks');
        const keysReq = chunkStore.index('slot').getAllKeys(slot);
        keysReq.onsuccess = () => {
          for (const key of keysReq.result) chunkStore.delete(key);
          for (const record of chunkRecords) chunkStore.put(record);
        };
      });

      this.lastSaveTime = Date.now();

      return {
        success: true,
        message: 'Game saved successfully',
        savedAt: new Date().toISOString(),
        chunksSaved: chunkRecords.length,
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
   * Load game state
   * @param {Object} store - The game store hook (useGameStore) or a state object
   * @param {Object} chunkManager - The chunk manager
   * @param {string} slot - Save slot name
   * @returns {Promise<Object>} Result with success/error
   */
  loadGame(store, chunkManager, slot = 'default') {
    return this._enqueue(() => this._loadGame(store, chunkManager, slot));
  }

  async _loadGame(store, chunkManager, slot) {
    try {
      await this.dbReady;
      const { getState, setState } = resolveStore(store);

      const saveData = await new Promise((resolve, reject) => {
        const request = this.db.transaction(['saves'], 'readonly').objectStore('saves').get(slot);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!saveData) {
        return {
          success: false,
          message: `No save found in slot: ${slot}`,
        };
      }

      migrateSave(saveData);

      const errors = validateSaveData(saveData);
      if (errors.length > 0) {
        return {
          success: false,
          message: `Save file is corrupted: ${errors.join(', ')}`,
          errors,
        };
      }

      // Load chunk records before touching the store so a failure leaves the game intact
      const chunkRecords = chunkManager ? await this._readSlotChunks(slot) : [];

      const current = getState();

      // ── Player ──
      const savedPlayer = { ...saveData.player };
      for (const key of TRANSIENT_PLAYER_FIELDS) delete savedPlayer[key];
      const position = savedPlayer.position || current.player.position;
      setState({
        player: {
          ...current.player,
          ...savedPlayer,
          position,
          velocity: [0, 0, 0],
          targetPosition: null,
          navPath: null,
          navPathIndex: 0,
          statusEffects: [],
          spellCooldowns: {},
          isInvincible: false,
          invincibilityTimer: 0,
          isDodging: false,
          isBlocking: false,
        },
        // Move the physics body (Player.jsx consumes this)
        pendingTeleport: [...position],
        lastDamageSource: null,
      });

      // ── Inventory / equipment / character ──
      setState({
        inventory: { ...current.inventory, ...saveData.inventory },
      });
      if (saveData.equipment) setState({ equipment: { ...current.equipment, ...saveData.equipment } });
      if (saveData.character) setState({ character: { ...current.character, ...saveData.character } });

      // ── Camera ──
      if (saveData.camera) setState({ camera: { ...getState().camera, ...saveData.camera } });

      // ── Survival / time ──
      if (saveData.hunger) setState({ hunger: { ...current.hunger, ...saveData.hunger } });
      if (saveData.worldTime) {
        setState({ worldTime: { ...current.worldTime, ...saveData.worldTime, paused: false } });
      }

      // ── Settlement ──
      if (saveData.settlement) {
        // Collect carried items so they can be returned to inventory after state restore
        const lostItems = [];
        // Reset ephemeral work fields on all NPCs
        const npcs = (saveData.settlement.npcs || []).map((npc) => {
          if (npc.carryingItem) {
            lostItems.push(npc.carryingItem);
          }
          return {
            ...npc,
            ...(npc.state?.startsWith('WORKING_') ? { state: 'IDLE', stateTimer: 0 } : {}),
            currentTaskId: null,
            savedTaskId: null,
            workTimer: 0,
            carryingItem: null,
            haulPhase: null,
            thoughtBubble: null,
          };
        });
        setState({
          settlement: {
            ...current.settlement,
            npcs,
            attractiveness: saveData.settlement.attractiveness || 0,
            wallCount: saveData.settlement.wallCount || 0,
            settlementCenter: saveData.settlement.settlementCenter || null,
            lastImmigrationCheck: 0,
            lastAttractivenessCalc: 0,
            lastNeedsUpdate: 0,
          },
        });
        // Return carried items to player inventory
        const addMaterial = getState().addMaterial;
        for (const item of lostItems) {
          if (item.material && item.amount && addMaterial) {
            addMaterial(item.material, item.amount);
          }
        }
      }

      // ── Zones / construction ──
      setState({
        zones: saveData.zones || [],
        constructionSites: saveData.constructionSites || [],
        activeStockpileZoneId: null,
        activeConstructionSiteId: null,
      });

      // ── Progress ──
      if (Array.isArray(saveData.unlockedSpells)) setState({ unlockedSpells: saveData.unlockedSpells });
      if (saveData.tutorialHints?.shownHints) setState({ tutorialHints: saveData.tutorialHints });
      if (Array.isArray(saveData.quests?.completedQuestIds)) {
        useQuestStore.setState({ completedQuestIds: saveData.quests.completedQuestIds });
      }

      // ── World edits ──
      if (chunkManager) {
        this._applyChunks(chunkManager, chunkRecords);
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

  async _readSlotChunks(slot) {
    return new Promise((resolve, reject) => {
      const index = this.db.transaction(['chunks'], 'readonly').objectStore('chunks').index('slot');
      const request = index.getAll(slot);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Convert stored chunk records (binary or legacy JSON) and hand them to the
   * chunk manager, which applies loaded ones now and unloaded ones on load.
   */
  _applyChunks(chunkManager, records) {
    const modified = [];
    for (const record of records) {
      try {
        if (record.binaryData) {
          const restored = Chunk.deserializeBinary(record.binaryData);
          modified.push({ x: restored.x, z: restored.z, blocks: restored.blocks, lastModified: record.lastModified });
        } else if (record.blocks && Number.isFinite(record.x) && Number.isFinite(record.z)) {
          // Legacy JSON array format
          modified.push({ x: record.x, z: record.z, blocks: new Uint8Array(record.blocks), lastModified: record.lastModified });
        }
      } catch (err) {
        console.warn('[Game3DSaveManager] Skipping unreadable chunk record:', record?.key, err);
      }
    }

    if (chunkManager.applyModifiedChunks) {
      chunkManager.applyModifiedChunks(modified);
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
        // eslint-disable-next-line no-console
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

      const saves = await new Promise((resolve, reject) => {
        const request = this.db.transaction(['saves'], 'readonly').objectStore('saves').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return saves.map((save) => ({
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
   * Delete a save (main state + chunks, in one transaction)
   */
  deleteSave(slot) {
    return this._enqueue(async () => {
      try {
        await this.dbReady;
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction(['saves', 'chunks'], 'readwrite');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.objectStore('saves').delete(slot);
          const chunkStore = tx.objectStore('chunks');
          const keysReq = chunkStore.index('slot').getAllKeys(slot);
          keysReq.onsuccess = () => {
            for (const key of keysReq.result) chunkStore.delete(key);
          };
        });
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    });
  }
}

// Singleton instance
export const game3DSaveManager = new Game3DSaveManager();
export default Game3DSaveManager;
