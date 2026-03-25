/**
 * SettlementBridge.js — Bridges the React/Zustand world and the SettlementModule.
 *
 * Reads game state from useGameStore, passes it to the module's tickSettlementCore(),
 * and writes results back to the store.
 */

import useGameStore from '../../stores/useGameStore';

class SettlementBridge {
  constructor(settlementModule) {
    this._module = settlementModule;
    this._chunkAdapter = null;
    this._zoneSeedDone = false;
  }

  /**
   * Set/update the chunk adapter. Called when chunkManager becomes available.
   * @param {Object} chunkManager - Raw chunkManager from the 3D engine
   */
  setChunkAdapter(chunkManager) {
    this._chunkAdapter = {
      iterateChunks: () => chunkManager.chunks.values(),
      getBlock: (wx, wy, wz) => chunkManager.getBlock(wx, wy, wz),
      getRawChunkManager: () => chunkManager,
    };
    this._module.setChunkAdapter(this._chunkAdapter);

    // Seed zones from store into module (for existing saves)
    this._seedZonesToModule();
  }

  /**
   * One-time seed of existing store zones into the module's ZoneManager.
   * Called when chunkAdapter becomes available (game is ready).
   */
  _seedZonesToModule() {
    if (this._zoneSeedDone) return;
    this._zoneSeedDone = true;

    const store = useGameStore.getState();
    const zoneManager = this._module.zoneManager;
    if (!zoneManager || !store.zones) return;

    for (const zone of store.zones) {
      // Skip if already in module (e.g., from deserialization)
      if (zoneManager.getZone(zone.id)) continue;

      zoneManager.createZone({
        type: zone.type,
        bounds: zone.bounds,
      });
    }
  }

  /**
   * Read current game state from useGameStore as a snapshot.
   * @returns {Object} Plain object with fields the module's tickSettlementCore needs
   */
  getGameState() {
    const store = useGameStore.getState();
    return {
      gameState: store.gameState,
      settlement: store.settlement,
      inventory: store.inventory,
      worldTimeElapsed: store.worldTime.elapsed,
    };
  }

  /**
   * Write module results back to useGameStore.
   * Execution order matters — food consumption before NPC updates.
   *
   * @param {Object} results - Return value from settlementModule.tickSettlementCore()
   */
  syncToStore(results) {
    if (!results) return;

    const store = useGameStore.getState();

    // 1. Settlement center (early return if just detected — matches original behavior)
    if (results.campfireCenter) {
      store.setSettlementCenter(results.campfireCenter);
      // Original code returns early after setting center on the frame it's detected
      return;
    }

    // 2. Attractiveness + wall count
    if (results.attractivenessUpdated) {
      store.updateSettlementAttractiveness(results.attractiveness);
      store.updateSettlementTimestamps({
        lastAttractivenessCalc: Date.now(),
        wallCount: results.wallCount,
      });
    }

    // 3. New NPCs from immigration
    if (results.newNPC) {
      store.addSettlementNPC(results.newNPC);
      store.updateSettlementTimestamps({ lastImmigrationCheck: Date.now() });
    }

    // 4. Food consumption BEFORE NPC updates (preserves original ordering)
    if (results.foodConsumptions) {
      for (const { material, qty } of results.foodConsumptions) {
        store.removeMaterial(material, qty);
      }
    }

    // 5. NPC batch updates
    if (results.batchUpdates && Object.keys(results.batchUpdates).length > 0) {
      store.batchUpdateSettlementNPCs(results.batchUpdates);
    }

    // 6. NPC removals
    if (results.removeIds) {
      for (const id of results.removeIds) {
        store.removeSettlementNPC(id);
      }
    }

    // 7. Notifications
    if (results.notifications) {
      for (const n of results.notifications) {
        if (window.addNotification) {
          window.addNotification(n);
        }
      }
    }

    // 8. Timestamps
    if (results.timestamps) {
      store.updateSettlementTimestamps(results.timestamps);
    }
  }
}

export default SettlementBridge;
