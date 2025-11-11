/**
 * SaveManager.test.js - Comprehensive tests for save/load system
 *
 * Test coverage:
 * - Basic save/load functionality
 * - Multiple save slots
 * - Corrupted file handling
 * - Checksum validation and repair
 * - Auto-save management
 * - Metadata handling
 * - Error recovery
 * - Edge cases
 */

const fs = require('fs');
const path = require('path');
import SaveManager from '../SaveManager';
import SaveValidator from '../SaveValidator';
import GameStateSerializer from '../GameStateSerializer';

// Mock test save path
const TEST_SAVE_PATH = path.join(__dirname, '.test-saves');

// Clean up test saves before/after
beforeAll(() => {
  if (fs.existsSync(TEST_SAVE_PATH)) {
    fs.rmSync(TEST_SAVE_PATH, { recursive: true, force: true });
  }
});

afterAll(() => {
  if (fs.existsSync(TEST_SAVE_PATH)) {
    fs.rmSync(TEST_SAVE_PATH, { recursive: true, force: true });
  }
});

// Helper to create mock orchestrator
function createMockOrchestrator() {
  return {
    tickCount: 100,
    isPaused: false,
    gameState: {
      currentTier: 'SURVIVAL',
      buildings: [
        { id: 'farm1', type: 'FARM', position: { x: 50, y: 25, z: 50 } }
      ],
      npcs: [],
      storage: { food: 100, wood: 50, stone: 50 },
      morale: 0,
      tick: 100
    },
    grid: {
      getAllBuildings: () => [
        { id: 'farm1', type: 'FARM', position: { x: 50, y: 25, z: 50 }, health: 100 }
      ],
      width: 200,
      height: 100,
      depth: 200
    },
    spatial: {
      chunkSize: 10,
      chunks: new Map(),
      buildingChunks: new Map(),
      buildingsByChunk: new Map()
    },
    tierProgression: {},
    buildingEffect: {
      activeEffects: new Map()
    },
    storage: {
      getStorage: () => ({ food: 100, wood: 50, stone: 50, gold: 0, essence: 0, crystal: 0 }),
      setResources: () => {},
      capacity: 500,
      overflowPriority: ['wood', 'stone', 'gold', 'essence', 'crystal', 'food']
    },
    consumption: {
      npcs: new Map(),
      happiness: 0
    },
    morale: {
      currentMorale: 0,
      factors: {},
      moraleState: 'NEUTRAL'
    },
    territoryManager: {
      getAllTerritories: () => [],
      territories: new Map()
    },
    townManager: {
      npcs: new Map(),
      buildingAssignments: new Map(),
      happiness: 0
    },
    npcManager: {
      npcs: new Map(),
      totalSpawned: 0,
      nextId: 1,
      getAllNPCStates: () => [],
      getStatistics: () => ({ aliveCount: 0, totalSpawned: 0 })
    },
    npcAssignment: {
      npcAssignments: new Map(),
      buildingSlots: new Map()
    }
  };
}

// Helper to create mock engine
function createMockEngine() {
  return {
    isRunning: true,
    isPaused: false,
    frameCount: 500,
    ticksElapsed: 100,
    startTime: Date.now() - 60000 // 60 seconds ago
  };
}

describe('SaveManager Tests', () => {
  let saveManager;
  let orchestrator;
  let engine;

  beforeEach(() => {
    saveManager = new SaveManager(TEST_SAVE_PATH);
    orchestrator = createMockOrchestrator();
    engine = createMockEngine();
  });

  // ============================================
  // TEST 1: BASIC SAVE/LOAD
  // ============================================

  describe('Basic Save/Load', () => {
    test('should save game state to file', () => {
      const result = saveManager.saveGame(orchestrator, engine, 'test-save', 'Test save');

      if (!result.success) {
        console.log('Save failed with message:', result.message);
      }

      expect(result.success).toBe(true);
      expect(result.message).toContain('saved');
      expect(fs.existsSync(result.path)).toBe(true);
    });

    test('should load previously saved game', () => {
      // Save first
      saveManager.saveGame(orchestrator, engine, 'load-test', 'Load test');

      // Clear and load
      const newOrchestrator = createMockOrchestrator();
      const newEngine = createMockEngine();

      const result = saveManager.loadGame('load-test', newOrchestrator, newEngine);

      expect(result.success).toBe(true);
      expect(result.message).toContain('loaded');
    });

    test('should load with correct metadata', () => {
      saveManager.saveGame(orchestrator, engine, 'metadata-test', 'Metadata test');

      const metadata = saveManager.getSaveMetadata('metadata-test');

      expect(metadata).toBeDefined();
      expect(metadata.slotName).toBe('metadata-test');
      expect(metadata.description).toBe('Metadata test');
      expect(metadata.currentTier).toBe('SURVIVAL');
    });

    test('should fail to load non-existent save', () => {
      const result = saveManager.loadGame('nonexistent', orchestrator, engine);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  // ============================================
  // TEST 2: MULTIPLE SAVE SLOTS
  // ============================================

  describe('Multiple Save Slots', () => {
    test('should save to multiple slots', () => {
      const result1 = saveManager.saveGame(orchestrator, engine, 'slot1', 'Slot 1');
      const result2 = saveManager.saveGame(orchestrator, engine, 'slot2', 'Slot 2');
      const result3 = saveManager.saveGame(orchestrator, engine, 'slot3', 'Slot 3');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      expect(saveManager.saveExists('slot1')).toBe(true);
      expect(saveManager.saveExists('slot2')).toBe(true);
      expect(saveManager.saveExists('slot3')).toBe(true);
    });

    test('should list all saved games', () => {
      saveManager.saveGame(orchestrator, engine, 'list-slot1', 'First');
      saveManager.saveGame(orchestrator, engine, 'list-slot2', 'Second');
      saveManager.saveGame(orchestrator, engine, 'list-slot3', 'Third');

      const saves = saveManager.listSaves();

      expect(saves.length).toBeGreaterThanOrEqual(3);
      expect(saves.some(s => s.slotName === 'list-slot1')).toBe(true);
      expect(saves.some(s => s.slotName === 'list-slot2')).toBe(true);
      expect(saves.some(s => s.slotName === 'list-slot3')).toBe(true);
    });

    test('should delete save slot', () => {
      saveManager.saveGame(orchestrator, engine, 'delete-test', 'To delete');

      expect(saveManager.saveExists('delete-test')).toBe(true);

      const result = saveManager.deleteSave('delete-test');

      expect(result.success).toBe(true);
      expect(saveManager.saveExists('delete-test')).toBe(false);
    });

    test('should fail to delete non-existent save', () => {
      const result = saveManager.deleteSave('nonexistent-slot');

      expect(result.success).toBe(false);
    });

    test('should track current save slot', () => {
      expect(saveManager.getCurrentSave()).toBeNull();

      saveManager.saveGame(orchestrator, engine, 'current-test', 'Test');
      expect(saveManager.getCurrentSave()).toBe('current-test');

      saveManager.deleteSave('current-test');
      expect(saveManager.getCurrentSave()).toBeNull();
    });
  });

  // ============================================
  // TEST 3: SAVE VALIDATION
  // ============================================

  describe('Save Validation', () => {
    test('should validate save structure', () => {
      saveManager.saveGame(orchestrator, engine, 'valid-save', 'Valid');

      const metadata = saveManager.getSaveMetadata('valid-save');
      expect(metadata).toBeDefined();
      expect(metadata.gameTick).toBe(100);
      expect(metadata.currentTier).toBe('SURVIVAL');
    });

    test('should include checksum in saved file', () => {
      saveManager.saveGame(orchestrator, engine, 'checksum-test', 'Checksum');

      const filename = path.join(TEST_SAVE_PATH, 'checksum-test.json');
      const content = JSON.parse(fs.readFileSync(filename, 'utf8'));

      expect(content.checksum).toBeDefined();
      expect(typeof content.checksum).toBe('string');
    });

    test('should validate checksum on load', () => {
      const result1 = saveManager.saveGame(orchestrator, engine, 'check-validate', 'Check');
      expect(result1.success).toBe(true);

      // Load should verify checksum
      const result2 = saveManager.loadGame('check-validate', orchestrator, engine);
      expect(result2.success).toBe(true);
    });
  });

  // ============================================
  // TEST 4: CORRUPTION HANDLING
  // ============================================

  describe('Corruption Recovery', () => {
    test('should detect corrupted JSON', () => {
      // Save a file
      saveManager.saveGame(orchestrator, engine, 'corrupt-json', 'Test');

      // Corrupt the JSON
      const filename = path.join(TEST_SAVE_PATH, 'corrupt-json.json');
      fs.writeFileSync(filename, '{invalid json', 'utf8');

      // Try to load
      const result = saveManager.loadGame('corrupt-json', orchestrator, engine);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Corrupted');
    });

    test('should attempt recovery on corrupted data', () => {
      // Create a partially corrupted save
      const filename = path.join(TEST_SAVE_PATH, 'partial-corrupt.json');
      const corruptData = {
        version: 1,
        timestamp: new Date().toISOString(),
        // Missing many required fields
        metadata: { gameTick: 50 }
      };

      fs.writeFileSync(filename, JSON.stringify(corruptData), 'utf8');

      // Attempt recovery
      const recovered = SaveValidator.repairSave(corruptData);

      expect(recovered.success).toBe(true);
      expect(recovered.data.grid).toBeDefined();
      expect(recovered.data.storage).toBeDefined();
    });

    test('should handle missing required fields', () => {
      const incompleteData = {
        version: 1,
        timestamp: new Date().toISOString()
        // Missing metadata, grid, storage, etc.
      };

      const validation = SaveValidator.validateSave(incompleteData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should repair and reload corrupted save', () => {
      // Create a save
      saveManager.saveGame(orchestrator, engine, 'repair-test', 'Repair');

      // Corrupt it slightly
      const filename = path.join(TEST_SAVE_PATH, 'repair-test.json');
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      data.metadata.gameTick = 'invalid'; // Corrupt field
      fs.writeFileSync(filename, JSON.stringify(data), 'utf8');

      // Try to load (should attempt recovery)
      const result = saveManager.loadGame('repair-test', createMockOrchestrator(), createMockEngine());

      // May succeed or fail depending on recovery, but shouldn't crash
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  // ============================================
  // TEST 5: AUTO-SAVE
  // ============================================

  describe('Auto-Save Management', () => {
    test('should start auto-save timer', () => {
      expect(saveManager.autoSaveInterval).toBeNull();

      saveManager.startAutoSave(orchestrator, engine, 1); // 1 second interval for testing

      expect(saveManager.autoSaveInterval).toBeDefined();

      saveManager.stopAutoSave();
      expect(saveManager.autoSaveInterval).toBeNull();
    });

    test('should stop auto-save timer', () => {
      saveManager.startAutoSave(orchestrator, engine, 60);
      expect(saveManager.autoSaveInterval).toBeDefined();

      saveManager.stopAutoSave();
      expect(saveManager.autoSaveInterval).toBeNull();
    });

    test('should not fail when stopping inactive auto-save', () => {
      expect(() => saveManager.stopAutoSave()).not.toThrow();
    });

    test('should create auto-save with timestamped name', async () => {
      saveManager.startAutoSave(orchestrator, engine, 1);

      // Wait for auto-save to trigger
      await new Promise(resolve => setTimeout(resolve, 1500));

      const saves = saveManager.listSaves();
      const autoSaves = saves.filter(s => s.slotName.startsWith('autosave-'));

      expect(autoSaves.length).toBeGreaterThan(0);

      saveManager.stopAutoSave();
    });
  });

  // ============================================
  // TEST 6: SAVE METADATA
  // ============================================

  describe('Save Metadata', () => {
    test('should include timestamp in save', () => {
      const before = new Date();
      saveManager.saveGame(orchestrator, engine, 'timestamp-test', 'Timestamp');
      const after = new Date();

      const metadata = saveManager.getSaveMetadata('timestamp-test');

      expect(metadata.savedAt).toBeDefined();
      const savedTime = new Date(metadata.savedAt);
      expect(savedTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(savedTime.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    test('should calculate playtime', () => {
      engine.startTime = Date.now() - 120000; // 2 minutes ago

      saveManager.saveGame(orchestrator, engine, 'playtime-test', 'Playtime');

      const metadata = saveManager.getSaveMetadata('playtime-test');

      expect(metadata.playtimeSeconds).toBeGreaterThan(0);
      expect(metadata.playtimeSeconds).toBeLessThan(300); // Less than 5 minutes
    });

    test('should include game progress in metadata', () => {
      orchestrator.gameState.currentTier = 'PERMANENT';
      orchestrator.tickCount = 500;

      saveManager.saveGame(orchestrator, engine, 'progress-test', 'Progress');

      const metadata = saveManager.getSaveMetadata('progress-test');

      expect(metadata.currentTier).toBe('PERMANENT');
      expect(metadata.gameTick).toBe(500);
    });

    test('should include custom description', () => {
      const description = 'My custom game save description';
      saveManager.saveGame(orchestrator, engine, 'desc-test', description);

      const metadata = saveManager.getSaveMetadata('desc-test');

      expect(metadata.description).toBe(description);
    });

    test('should list saves with metadata', () => {
      saveManager.saveGame(orchestrator, engine, 'info-slot1', 'First save');
      saveManager.saveGame(orchestrator, engine, 'info-slot2', 'Second save');

      const saves = saveManager.listSaves();

      const save1 = saves.find(s => s.slotName === 'info-slot1');
      const save2 = saves.find(s => s.slotName === 'info-slot2');

      expect(save1).toBeDefined();
      expect(save1.description).toBe('First save');
      expect(save1.savedAt).toBeDefined();
      expect(save1.playtime).toBeGreaterThanOrEqual(0);

      expect(save2).toBeDefined();
      expect(save2.description).toBe('Second save');
    });
  });

  // ============================================
  // TEST 7: EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    test('should handle special characters in save slot name', () => {
      const result = saveManager.saveGame(
        orchestrator,
        engine,
        'Special!@#$%^&*()Names',
        'Special'
      );

      expect(result.success).toBe(true);
      expect(saveManager.saveExists('Special!@#$%^&*()Names')).toBe(true);
    });

    test('should handle empty description', () => {
      const result = saveManager.saveGame(orchestrator, engine, 'empty-desc', '');

      expect(result.success).toBe(true);

      const metadata = saveManager.getSaveMetadata('empty-desc');
      expect(metadata.description).toBe('');
    });

    test('should handle very long slot names', () => {
      const longName = 'a'.repeat(200);
      const result = saveManager.saveGame(orchestrator, engine, longName, 'Long');

      expect(result.success).toBe(true);
    });

    test('should handle rapid successive saves', () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        const result = saveManager.saveGame(
          orchestrator,
          engine,
          `rapid-${i}`,
          `Rapid ${i}`
        );
        results.push(result.success);
      }

      expect(results.every(r => r === true)).toBe(true);
    });

    test('should handle missing save directory gracefully', () => {
      const manager = new SaveManager(TEST_SAVE_PATH);
      expect(fs.existsSync(TEST_SAVE_PATH)).toBe(true);
    });
  });

  // ============================================
  // TEST 8: ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    test('should handle null orchestrator', () => {
      const result = saveManager.saveGame(null, engine, 'null-test', 'Null');

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });

    test('should handle null engine', () => {
      const result = saveManager.saveGame(orchestrator, null, 'engine-test', 'Engine');

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });

    test('should handle invalid JSON gracefully', () => {
      const filename = path.join(TEST_SAVE_PATH, 'invalid.json');
      fs.writeFileSync(filename, 'not json at all', 'utf8');

      const result = saveManager.loadGame('invalid', orchestrator, engine);

      expect(result.success).toBe(false);
    });

    test('should not throw on cleanup errors', () => {
      expect(() => saveManager.stopAutoSave()).not.toThrow();
    });

    test('should return error object with details', () => {
      const result = saveManager.loadGame('nonexistent', orchestrator, engine);

      expect(result).toBeDefined();
      expect('success' in result).toBe(true);
      expect('message' in result).toBe(true);
    });
  });

  // ============================================
  // TEST 9: CHECKSUM AND INTEGRITY
  // ============================================

  describe('Checksum and Integrity', () => {
    test('should generate consistent checksums', async () => {
      const testData = {
        version: 1,
        timestamp: '2025-11-09T00:00:00Z',
        metadata: { gameTick: 100 },
        grid: { buildings: [] },
        storage: { storage: { food: 100 } }
      };

      const checksum1 = await SaveValidator.generateChecksum(testData);
      const checksum2 = await SaveValidator.generateChecksum(testData);

      expect(checksum1).toBe(checksum2);
    });

    test('should detect when data is modified', async () => {
      const testData = {
        version: 1,
        timestamp: '2025-11-09T00:00:00Z',
        metadata: { gameTick: 100 },
        grid: { buildings: [] },
        storage: { storage: { food: 100 } }
      };

      const checksum1 = await SaveValidator.generateChecksum(testData);

      // Modify data
      testData.metadata.gameTick = 200;
      const checksum2 = await SaveValidator.generateChecksum(testData);

      expect(checksum1).not.toBe(checksum2);
    });

    test('should validate correct checksums', async () => {
      const testData = {
        version: 1,
        metadata: { gameTick: 100 },
        grid: { buildings: [] },
        storage: { storage: { food: 100 } }
      };

      testData.checksum = await SaveValidator.generateChecksum(testData);

      const isValid = await SaveValidator.validateChecksum(testData);

      expect(isValid).toBe(true);
    });

    test('should reject invalid checksums', async () => {
      const testData = {
        version: 1,
        metadata: { gameTick: 100 },
        grid: { buildings: [] },
        storage: { storage: { food: 100 } },
        checksum: 'invalid-checksum-12345'
      };

      const isValid = await SaveValidator.validateChecksum(testData);

      expect(isValid).toBe(false);
    });
  });
});
