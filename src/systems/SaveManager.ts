/**
 * SaveManager - Handles game state persistence
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Save System:
 * - JSON serialization
 * - Version migrations
 * - Save slot management
 * - Target: < 5 seconds for 10 regions
 */

import type { GameSystem } from '@core/GameEngine';
import { getEventBus } from '@core/EventBus';
import type { SaveData, SaveMetadata, Vector2, GameTime } from '@core/types';

// ============================================================================
// Constants
// ============================================================================

const SAVE_VERSION = '0.1.0';
const STORAGE_PREFIX = 'voxel_rpg_save_';
const MAX_SAVE_SLOTS = 10;

// ============================================================================
// Save Slot Info
// ============================================================================

export interface SaveSlotInfo {
  slot: string;
  exists: boolean;
  metadata?: SaveMetadata;
}

// ============================================================================
// Serializable Game State Interface
// ============================================================================

export interface GameStateProvider {
  getPlayerPosition(): Vector2;
  getPlayerHealth(): number;
  getPlayerMaxHealth(): number;
  getPlayerInventory(): Array<{ itemId: string; quantity: number }>;
  getWorldSeed(): number;
  getModifiedTiles(): Array<{ position: { x: number; y: number }; layer: number; typeId: string }>;
  getTotalPlaytime(): number;
  getGameDay(): number;
}

export interface GameStateConsumer {
  loadPlayerPosition(position: Vector2): void;
  loadPlayerHealth(current: number, max: number): void;
  loadPlayerInventory(items: Array<{ itemId: string; quantity: number }>): void;
  loadWorldSeed(seed: number): void;
  loadModifiedTiles(tiles: Array<{ position: { x: number; y: number }; layer: number; typeId: string }>): void;
  loadPlaytime(seconds: number): void;
  loadGameDay(day: number): void;
}

// ============================================================================
// SaveManager Implementation
// ============================================================================

export class SaveManager implements GameSystem {
  public readonly name = 'SaveManager';

  private stateProvider: GameStateProvider | null = null;
  private stateConsumer: GameStateConsumer | null = null;
  private autosaveInterval: number | null = null;
  private autosaveSlot = 'autosave';

  /**
   * Initialize the save manager
   */
  public initialize(): void {
    console.log('[SaveManager] Initialized');
  }

  /**
   * Set the game state provider (for saving)
   */
  public setStateProvider(provider: GameStateProvider): void {
    this.stateProvider = provider;
  }

  /**
   * Set the game state consumer (for loading)
   */
  public setStateConsumer(consumer: GameStateConsumer): void {
    this.stateConsumer = consumer;
  }

  /**
   * Get all save slots
   */
  public getSaveSlots(): SaveSlotInfo[] {
    const slots: SaveSlotInfo[] = [];

    // Check numbered slots
    for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
      const slot = `slot${i}`;
      const key = STORAGE_PREFIX + slot;
      const exists = localStorage.getItem(key) !== null;
      const info: SaveSlotInfo = { slot, exists };

      if (exists) {
        try {
          const data = JSON.parse(localStorage.getItem(key)!) as SaveData;
          info.metadata = data.metadata;
        } catch {
          // Invalid save data
        }
      }

      slots.push(info);
    }

    // Check autosave slot
    const autosaveKey = STORAGE_PREFIX + this.autosaveSlot;
    const autosaveExists = localStorage.getItem(autosaveKey) !== null;
    const autosaveInfo: SaveSlotInfo = { slot: this.autosaveSlot, exists: autosaveExists };

    if (autosaveExists) {
      try {
        const data = JSON.parse(localStorage.getItem(autosaveKey)!) as SaveData;
        autosaveInfo.metadata = data.metadata;
      } catch {
        // Invalid save data
      }
    }

    slots.unshift(autosaveInfo);

    return slots;
  }

  /**
   * Save game to a slot
   */
  public async saveGame(slot: string): Promise<boolean> {
    if (!this.stateProvider) {
      console.error('[SaveManager] No state provider set');
      return false;
    }

    const eventBus = getEventBus();
    eventBus.emit('save:started', { slot });

    try {
      const saveData = this.createSaveData(slot);
      const json = JSON.stringify(saveData);
      const key = STORAGE_PREFIX + slot;

      localStorage.setItem(key, json);

      eventBus.emit('save:completed', { slot });
      console.log(`[SaveManager] Game saved to slot "${slot}"`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      eventBus.emit('save:failed', { slot, error: message });
      console.error(`[SaveManager] Save failed:`, error);
      return false;
    }
  }

  /**
   * Load game from a slot
   */
  public async loadGame(slot: string): Promise<boolean> {
    if (!this.stateConsumer) {
      console.error('[SaveManager] No state consumer set');
      return false;
    }

    const eventBus = getEventBus();
    eventBus.emit('load:started', { slot });

    try {
      const key = STORAGE_PREFIX + slot;
      const json = localStorage.getItem(key);

      if (!json) {
        throw new Error(`Save slot "${slot}" not found`);
      }

      const saveData = JSON.parse(json) as SaveData;

      // Check version and migrate if needed
      const migratedData = this.migrateData(saveData);

      // Apply save data to game state
      this.applySaveData(migratedData);

      eventBus.emit('load:completed', { slot });
      console.log(`[SaveManager] Game loaded from slot "${slot}"`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      eventBus.emit('load:failed', { slot, error: message });
      console.error(`[SaveManager] Load failed:`, error);
      return false;
    }
  }

  /**
   * Delete a save slot
   */
  public deleteSave(slot: string): boolean {
    try {
      const key = STORAGE_PREFIX + slot;
      localStorage.removeItem(key);
      console.log(`[SaveManager] Deleted save slot "${slot}"`);
      return true;
    } catch (error) {
      console.error(`[SaveManager] Delete failed:`, error);
      return false;
    }
  }

  /**
   * Check if a save slot exists
   */
  public saveExists(slot: string): boolean {
    const key = STORAGE_PREFIX + slot;
    return localStorage.getItem(key) !== null;
  }

  /**
   * Enable autosave at specified interval (in seconds)
   */
  public enableAutosave(intervalSeconds: number): void {
    this.disableAutosave();
    this.autosaveInterval = window.setInterval(() => {
      this.saveGame(this.autosaveSlot);
    }, intervalSeconds * 1000);
    console.log(`[SaveManager] Autosave enabled every ${intervalSeconds} seconds`);
  }

  /**
   * Disable autosave
   */
  public disableAutosave(): void {
    if (this.autosaveInterval !== null) {
      window.clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
      console.log('[SaveManager] Autosave disabled');
    }
  }

  /**
   * Create save data from current game state
   */
  private createSaveData(slotName: string): SaveData {
    const provider = this.stateProvider!;

    return {
      metadata: {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        playtimeSeconds: provider.getTotalPlaytime(),
        slotName,
      },
      world: {
        seed: provider.getWorldSeed(),
        modifiedTiles: provider.getModifiedTiles(),
      },
      player: {
        position: provider.getPlayerPosition(),
        health: provider.getPlayerHealth(),
        maxHealth: provider.getPlayerMaxHealth(),
        inventory: provider.getPlayerInventory(),
      },
      gameTime: {
        totalSeconds: provider.getTotalPlaytime(),
        gameDay: provider.getGameDay(),
      },
    };
  }

  /**
   * Apply save data to game state
   */
  private applySaveData(data: SaveData): void {
    const consumer = this.stateConsumer!;

    consumer.loadWorldSeed(data.world.seed);
    consumer.loadModifiedTiles(data.world.modifiedTiles);
    consumer.loadPlayerPosition(data.player.position);
    consumer.loadPlayerHealth(data.player.health, data.player.maxHealth);
    consumer.loadPlayerInventory(data.player.inventory);
    consumer.loadPlaytime(data.gameTime.totalSeconds);
    consumer.loadGameDay(data.gameTime.gameDay);
  }

  /**
   * Migrate save data from older versions
   */
  private migrateData(data: SaveData): SaveData {
    // Currently no migrations needed
    // Future migrations would check data.metadata.version and transform as needed
    return data;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.disableAutosave();
    console.log('[SaveManager] Destroyed');
  }
}
