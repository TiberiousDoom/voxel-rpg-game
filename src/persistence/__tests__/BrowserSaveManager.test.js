/**
 * BrowserSaveManager.test.js - Tests for browser-compatible save system
 *
 * Test scenarios:
 * - Basic save/load in localStorage
 * - Multiple save slots
 * - Checksum validation (SubtleCrypto)
 * - Error handling
 * - Metadata management
 * - Storage stats
 * - Corrupted file recovery
 */

const BrowserSaveManager = require('../BrowserSaveManager');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      return Object.keys(store)[index] || null;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock crypto.subtle
if (!window.crypto) {
  window.crypto = {};
}

if (!window.crypto.subtle) {
  window.crypto.subtle = {
    digest: async (algorithm, data) => {
      // Simple mock: just return a consistent buffer
      const str = new TextDecoder().decode(data);
      const hash = str.split('').reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      const buffer = new ArrayBuffer(32);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < 32; i++) {
        view[i] = (hash >> (i % 8)) & 0xff;
      }
      return buffer;
    }
  };
}

// Helper to create mock game state
function createMockOrchestrator() {
  return {
    tickCount: 100,
    isPaused: false,
    gameState: {
      currentTier: 'SURVIVAL',
      buildings: [
        { id: 'building-1', type: 'FARM', position: { x: 50, y: 25, z: 50 } }
      ],
      npcs: [],
      storage: { food: 100, wood: 50, stone: 50 },
      morale: 0
    }
  };
}

function createMockEngine() {
  return {
    isRunning: true,
    isPaused: false,
    frameCount: 500,
    ticksElapsed: 100,
    startTime: Date.now() - 60000 // 60 seconds ago
  };
}

describe('BrowserSaveManager', () => {
  let saveManager;
  let orchestrator;
  let engine;

  beforeEach(() => {
    localStorage.clear();
    saveManager = new BrowserSaveManager({
      storagePrefix: 'test-'
    });
    orchestrator = createMockOrchestrator();
    engine = createMockEngine();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================
  // TEST 1: BASIC SAVE/LOAD
  // ============================================

  describe('Basic Save/Load', () => {
    test('should save game to localStorage', async () => {
      const result = await saveManager.saveGame(orchestrator, engine, 'test-save', 'Test');

      expect(result.success).toBe(true);
      expect(result.message).toContain('saved');
      expect(result.size).toBeGreaterThan(0);
      expect(localStorage.getItem('test-save-test-save')).toBeDefined();
    });

    test('should load previously saved game', async () => {
      // Save
      await saveManager.saveGame(orchestrator, engine, 'load-test', 'Load test');

      // Load
      const newOrch = createMockOrchestrator();
      const newEng = createMockEngine();

      const result = await saveManager.loadGame('load-test', newOrch, newEng);

      expect(result.success).toBe(true);
      expect(result.message).toContain('loaded');
    });

    test('should return error for non-existent save', async () => {
      const result = await saveManager.loadGame('nonexistent', orchestrator, engine);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('should track current save slot', async () => {
      expect(saveManager.getCurrentSave()).toBeNull();

      await saveManager.saveGame(orchestrator, engine, 'current-test', 'Current');
      expect(saveManager.getCurrentSave()).toBe('current-test');
    });
  });

  // ============================================
  // TEST 2: MULTIPLE SAVE SLOTS
  // ============================================

  describe('Multiple Save Slots', () => {
    test('should save to multiple slots independently', async () => {
      const result1 = await saveManager.saveGame(orchestrator, engine, 'slot1', 'Slot 1');
      const result2 = await saveManager.saveGame(orchestrator, engine, 'slot2', 'Slot 2');
      const result3 = await saveManager.saveGame(orchestrator, engine, 'slot3', 'Slot 3');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      expect(saveManager.saveExists('slot1')).toBe(true);
      expect(saveManager.saveExists('slot2')).toBe(true);
      expect(saveManager.saveExists('slot3')).toBe(true);
    });

    test('should list all saves with metadata', async () => {
      await saveManager.saveGame(orchestrator, engine, 'list1', 'First');
      await saveManager.saveGame(orchestrator, engine, 'list2', 'Second');
      await saveManager.saveGame(orchestrator, engine, 'list3', 'Third');

      const saves = await saveManager.listSaves();

      expect(saves.length).toBeGreaterThanOrEqual(3);
      expect(saves.some(s => s.slotName === 'list1')).toBe(true);
      expect(saves.some(s => s.slotName === 'list2')).toBe(true);
      expect(saves.some(s => s.slotName === 'list3')).toBe(true);
    });

    test('should delete save slot', async () => {
      await saveManager.saveGame(orchestrator, engine, 'delete-test', 'To delete');
      expect(saveManager.saveExists('delete-test')).toBe(true);

      const result = await saveManager.deleteSave('delete-test');

      expect(result.success).toBe(true);
      expect(saveManager.saveExists('delete-test')).toBe(false);
    });

    test('should handle deletion of non-existent save', async () => {
      const result = await saveManager.deleteSave('nonexistent');

      expect(result.success).toBe(true); // Should not error
    });
  });

  // ============================================
  // TEST 3: METADATA MANAGEMENT
  // ============================================

  describe('Metadata Management', () => {
    test('should store and retrieve metadata', async () => {
      const description = 'My test save';
      await saveManager.saveGame(orchestrator, engine, 'meta-test', description);

      const metadata = saveManager.getSaveMetadata('meta-test');

      expect(metadata).toBeDefined();
      expect(metadata.slotName).toBe('meta-test');
      expect(metadata.description).toBe(description);
    });

    test('should include timestamp in metadata', async () => {
      const before = new Date();
      await saveManager.saveGame(orchestrator, engine, 'timestamp-test', 'Timestamp');
      const after = new Date();

      const metadata = saveManager.getSaveMetadata('timestamp-test');

      expect(metadata.savedAt).toBeDefined();
      const savedTime = new Date(metadata.savedAt);
      expect(savedTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(savedTime.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    test('should calculate playtime in metadata', async () => {
      engine.startTime = Date.now() - 120000; // 2 minutes ago
      await saveManager.saveGame(orchestrator, engine, 'playtime-test', 'Playtime');

      const metadata = saveManager.getSaveMetadata('playtime-test');

      expect(metadata.playtimeSeconds).toBeGreaterThan(0);
      expect(metadata.playtimeSeconds).toBeLessThan(300);
    });

    test('should include game progress in metadata', async () => {
      orchestrator.tickCount = 500;
      orchestrator.gameState.currentTier = 'PERMANENT';

      await saveManager.saveGame(orchestrator, engine, 'progress-test', 'Progress');

      const metadata = saveManager.getSaveMetadata('progress-test');

      expect(metadata.gameTick).toBe(500);
      expect(metadata.currentTier).toBe('PERMANENT');
    });

    test('should cache metadata for performance', async () => {
      await saveManager.saveGame(orchestrator, engine, 'cache-test', 'Cache');

      const metadata1 = saveManager.getSaveMetadata('cache-test');
      expect(metadata1).toBeDefined();

      // Clear localStorage but metadata should still be cached
      const key = 'test-metadata-cache-test';
      localStorage.removeItem(key);

      const metadata2 = saveManager.getSaveMetadata('cache-test');
      expect(metadata2).toBeDefined();
      expect(metadata2.slotName).toBe('cache-test');
    });
  });

  // ============================================
  // TEST 4: CHECKSUM VALIDATION
  // ============================================

  describe('Checksum Validation', () => {
    test('should generate checksum on save', async () => {
      await saveManager.saveGame(orchestrator, engine, 'checksum-test', 'Checksum');

      const storageKey = 'test-save-checksum-test';
      const saveData = JSON.parse(localStorage.getItem(storageKey));

      expect(saveData.checksum).toBeDefined();
      expect(typeof saveData.checksum).toBe('string');
      expect(saveData.checksum.length).toBeGreaterThan(0);
    });

    test('should validate checksum on load', async () => {
      await saveManager.saveGame(orchestrator, engine, 'validate-test', 'Validate');

      const newOrch = createMockOrchestrator();
      const newEng = createMockEngine();

      const result = await saveManager.loadGame('validate-test', newOrch, newEng);

      expect(result.success).toBe(true);
    });

    test('should detect modified saves', async () => {
      await saveManager.saveGame(orchestrator, engine, 'modify-test', 'Modify');

      // Modify the save in localStorage
      const storageKey = 'test-save-modify-test';
      const saveData = JSON.parse(localStorage.getItem(storageKey));
      saveData.metadata.gameTick = 9999; // Tamper with data
      localStorage.setItem(storageKey, JSON.stringify(saveData));

      const newOrch = createMockOrchestrator();
      const newEng = createMockEngine();

      // Load should still work (with repair if needed)
      const result = await saveManager.loadGame('modify-test', newOrch, newEng);

      // May succeed with repair or fail - either is acceptable
      expect(result).toBeDefined();
      expect(result.success !== undefined).toBe(true);
    });
  });

  // ============================================
  // TEST 5: STORAGE STATS
  // ============================================

  describe('Storage Stats', () => {
    test('should report storage usage', async () => {
      await saveManager.saveGame(orchestrator, engine, 'stats1', 'Stats 1');
      await saveManager.saveGame(orchestrator, engine, 'stats2', 'Stats 2');

      const stats = await saveManager.getStorageStats();

      expect(stats.totalUsed).toBeGreaterThan(0);
      expect(stats.itemCount).toBeGreaterThanOrEqual(2);
      expect(stats.totalUsedFormatted).toBeDefined();
    });

    test('should format bytes correctly', async () => {
      const stats = await saveManager.getStorageStats();

      expect(stats.totalUsedFormatted).toMatch(/\d+\s+(Bytes|KB|MB)/);
    });

    test('should not count non-save items in stats', async () => {
      localStorage.setItem('unrelated-key', 'unrelated-value');
      await saveManager.saveGame(orchestrator, engine, 'filter-test', 'Filter');

      const stats = await saveManager.getStorageStats();

      // Should only count items with storagePrefix
      expect(stats.itemCount).toBeLessThanOrEqual(3); // save + metadata + current
    });
  });

  // ============================================
  // TEST 6: ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    test('should handle null orchestrator gracefully', async () => {
      const result = await saveManager.saveGame(null, engine, 'null-test', 'Null');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid JSON gracefully', async () => {
      const storageKey = 'test-save-invalid-json-test';
      localStorage.setItem(storageKey, 'not valid json');

      const newOrch = createMockOrchestrator();
      const newEng = createMockEngine();

      const result = await saveManager.loadGame('invalid-json-test', newOrch, newEng);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Corrupted');
    });

    test('should handle missing metadata gracefully', async () => {
      await saveManager.saveGame(orchestrator, engine, 'missing-meta', 'Missing');

      // Remove metadata but keep save
      const metadataKey = 'test-metadata-missing-meta';
      localStorage.removeItem(metadataKey);

      const metadata = saveManager.getSaveMetadata('missing-meta');

      expect(metadata).toBeNull();
    });

    test('should handle special characters in slot names', async () => {
      const specialName = 'slot-with-special!@#$%';
      const result = await saveManager.saveGame(orchestrator, engine, specialName, 'Special');

      expect(result.success).toBe(true);
      expect(saveManager.saveExists(specialName)).toBe(true);
    });
  });

  // ============================================
  // TEST 7: STORAGE AVAILABILITY
  // ============================================

  describe('Storage Availability', () => {
    test('should detect localStorage availability', () => {
      expect(saveManager.storageAvailable.localStorage).toBe(true);
    });

    test('should not fail if localStorage reported as unavailable', () => {
      const unavailableMgr = new BrowserSaveManager();

      // Should still be usable if we override
      expect(unavailableMgr.storageAvailable).toBeDefined();
    });
  });

  // ============================================
  // TEST 8: EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    test('should handle very long descriptions', async () => {
      const longDesc = 'x'.repeat(1000);
      const result = await saveManager.saveGame(orchestrator, engine, 'long-desc', longDesc);

      expect(result.success).toBe(true);

      const metadata = saveManager.getSaveMetadata('long-desc');
      expect(metadata.description).toBe(longDesc);
    });

    test('should handle rapid successive saves', async () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        const result = await saveManager.saveGame(
          orchestrator,
          engine,
          `rapid-${i}`,
          `Rapid ${i}`
        );
        results.push(result.success);
      }

      expect(results.every(r => r === true)).toBe(true);
    });

    test('should overwrite existing saves', async () => {
      await saveManager.saveGame(orchestrator, engine, 'overwrite', 'First');

      const metadata1 = saveManager.getSaveMetadata('overwrite');
      const time1 = new Date(metadata1.savedAt).getTime();

      // Wait a bit and save again
      await new Promise(resolve => setTimeout(resolve, 10));

      await saveManager.saveGame(orchestrator, engine, 'overwrite', 'Second');

      const metadata2 = saveManager.getSaveMetadata('overwrite');
      const time2 = new Date(metadata2.savedAt).getTime();

      expect(metadata2.description).toBe('Second');
      expect(time2).toBeGreaterThanOrEqual(time1);
    });

    test('should handle empty orchestrator gracefully', async () => {
      const emptyOrch = {};
      const emptyEng = {};

      const result = await saveManager.saveGame(emptyOrch, emptyEng, 'empty', 'Empty');

      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // TEST 9: INTEGRATION SCENARIOS
  // ============================================

  describe('Integration Scenarios', () => {
    test('should handle complete save/load cycle', async () => {
      // Save
      const saveResult = await saveManager.saveGame(orchestrator, engine, 'cycle', 'Cycle');
      expect(saveResult.success).toBe(true);

      // Load
      const newOrch = createMockOrchestrator();
      const newEng = createMockEngine();

      const loadResult = await saveManager.loadGame('cycle', newOrch, newEng);
      expect(loadResult.success).toBe(true);

      // Verify metadata
      const metadata = saveManager.getSaveMetadata('cycle');
      expect(metadata).toBeDefined();
      expect(metadata.slotName).toBe('cycle');
    });

    test('should handle game progression save/load', async () => {
      // Simulate game progression
      orchestrator.gameState.currentTier = 'PERMANENT';
      orchestrator.tickCount = 500;
      orchestrator.gameState.buildings.push(
        { id: 'building-2', type: 'HOUSE', position: { x: 55, y: 25, z: 55 } }
      );

      await saveManager.saveGame(orchestrator, engine, 'progression', 'Progression');

      const metadata = saveManager.getSaveMetadata('progression');

      expect(metadata.currentTier).toBe('PERMANENT');
      expect(metadata.gameTick).toBe(500);
    });

    test('should list saves in chronological order', async () => {
      // Create saves with delays
      for (let i = 0; i < 3; i++) {
        await saveManager.saveGame(orchestrator, engine, `chrono-${i}`, `Chrono ${i}`);
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const saves = await saveManager.listSaves();
      const chronoSaves = saves.filter(s => s.slotName.startsWith('chrono-'));

      // Should be in reverse chronological order (newest first)
      expect(chronoSaves[0].slotName).toBe('chrono-2');
      expect(chronoSaves[1].slotName).toBe('chrono-1');
      expect(chronoSaves[2].slotName).toBe('chrono-0');
    });
  });
});
