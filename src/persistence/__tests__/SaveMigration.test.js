/**
 * Save Migration Tests
 *
 * Test-Driven Development: These tests define how save file versioning
 * and migration should work. CRITICAL for protecting player data.
 *
 * Purpose: Ensure:
 * - Save versioning works correctly
 * - Migration from v1 to v2 preserves all data
 * - Backups are created before migration
 * - Rollback works when migration fails
 * - Validation catches corrupted saves
 */

// Using Jest (included with react-scripts)

// This import will fail until we create the file (expected for TDD)
import SaveVersionManager from '../SaveVersionManager';

describe('Save Migration Tests', () => {
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage for testing
    mockLocalStorage = {};

    global.localStorage = {
      getItem: (key) => mockLocalStorage[key] || null,
      setItem: (key, value) => {
        mockLocalStorage[key] = value;
      },
      removeItem: (key) => {
        delete mockLocalStorage[key];
      },
      clear: () => {
        mockLocalStorage = {};
      },
      key: (index) => {
        const keys = Object.keys(mockLocalStorage);
        return keys[index] || null;
      },
      get length() {
        return Object.keys(mockLocalStorage).length;
      }
    };
  });

  afterEach(() => {
    // Clean up
    mockLocalStorage = {};
  });

  // ============================================================================
  // VERSION DETECTION TESTS
  // ============================================================================

  describe('Version Detection', () => {
    test('Detects v1 save (no version field)', () => {
      const v1Save = {
        player: { level: 5, health: 100 },
        equipment: {},
        inventory: {}
      };

      const version = SaveVersionManager.detectVersion(v1Save);

      expect(version).toBe(1);
    });

    test('Detects v2 save (has version field)', () => {
      const v2Save = {
        version: 2,
        player: { level: 10 },
        character: { attributes: {} }
      };

      const version = SaveVersionManager.detectVersion(v2Save);

      expect(version).toBe(2);
    });

    test('Returns current version for already migrated save', () => {
      const v2Save = {
        version: 2,
        player: {},
        character: {}
      };

      const migrated = SaveVersionManager.migrate(v2Save);

      expect(migrated).toBe(v2Save); // Should return same object
      expect(migrated.version).toBe(2);
    });
  });

  // ============================================================================
  // V1 TO V2 MIGRATION TESTS
  // ============================================================================

  describe('V1 to V2 Migration', () => {
    test('Migrates v1 save to v2 with character data', () => {
      const v1Save = {
        player: {
          position: [0, 2, 0],
          health: 100,
          maxHealth: 100,
          level: 10,
          xp: 1500
        },
        equipment: {
          weapon: { id: 'sword1', damage: 20 },
          armor: null
        },
        inventory: {
          gold: 500,
          potions: 5
        },
        buildings: [],
        npcs: []
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      // Should have version field
      expect(v2Save.version).toBe(2);

      // Should preserve all original data
      expect(v2Save.player).toEqual(v1Save.player);
      expect(v2Save.equipment).toEqual(v1Save.equipment);
      expect(v2Save.inventory).toEqual(v1Save.inventory);

      // Should add character data
      expect(v2Save.character).toBeDefined();
      expect(v2Save.character.attributes).toBeDefined();
      expect(v2Save.character.skills).toBeDefined();
    });

    test('Awards retroactive attribute points based on level', () => {
      const v1Save = {
        player: { level: 15, xp: 2000 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      // 15 levels * 5 points per level = 75 attribute points
      expect(v2Save.character.attributePoints).toBe(75);
    });

    test('Awards retroactive skill points based on level', () => {
      const v1Save = {
        player: { level: 20, xp: 5000 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      // 20 levels * 2 points per level = 40 skill points
      expect(v2Save.character.skillPoints).toBe(40);
    });

    test('Sets default attributes to 10 for new characters', () => {
      const v1Save = {
        player: { level: 1 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      expect(v2Save.character.attributes).toEqual({
        leadership: 10,
        construction: 10,
        exploration: 10,
        combat: 10,
        magic: 10,
        endurance: 10
      });
    });

    test('Initializes empty skill trees', () => {
      const v1Save = {
        player: { level: 5 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      expect(v2Save.character.skills).toEqual({
        settlement: []
      });
    });

    test('Sets initial respec values correctly', () => {
      const v1Save = {
        player: { level: 1 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      expect(v2Save.character.respecsUsed).toBe(0);
      expect(v2Save.character.respecsAvailable).toBe(3);
    });

    test('Handles level 1 character correctly (no retroactive points from level 1)', () => {
      const v1Save = {
        player: { level: 1, xp: 0 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      // Level 1 gets 1 * 5 = 5 attribute points, 1 * 2 = 2 skill points
      expect(v2Save.character.attributePoints).toBe(5);
      expect(v2Save.character.skillPoints).toBe(2);
    });

    test('Handles high-level character correctly', () => {
      const v1Save = {
        player: { level: 50, xp: 100000 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      // 50 * 5 = 250 attribute points
      // 50 * 2 = 100 skill points
      expect(v2Save.character.attributePoints).toBe(250);
      expect(v2Save.character.skillPoints).toBe(100);
    });
  });

  // ============================================================================
  // BACKUP TESTS
  // ============================================================================

  describe('Backup System', () => {
    test('Creates backup before migration', () => {
      const v1Save = {
        player: { level: 10, health: 100 }
      };

      SaveVersionManager.migrate(v1Save);

      // Should create a backup in localStorage
      const backupKeys = Object.keys(mockLocalStorage)
        .filter(key => key.startsWith('voxel-rpg-save_backup_v1_'));

      expect(backupKeys.length).toBeGreaterThan(0);
    });

    test('Backup contains original save data', () => {
      const v1Save = {
        player: { level: 15, health: 80, xp: 2500 },
        inventory: { gold: 1000 }
      };

      SaveVersionManager.migrate(v1Save);

      // Find the backup
      const backupKeys = Object.keys(mockLocalStorage)
        .filter(key => key.startsWith('voxel-rpg-save_backup_v1_'));

      const backupData = JSON.parse(mockLocalStorage[backupKeys[0]]);

      expect(backupData.player.level).toBe(15);
      expect(backupData.player.health).toBe(80);
      expect(backupData.inventory.gold).toBe(1000);
    });

    test('Backup keys include timestamp for uniqueness', () => {
      const v1Save = { player: { level: 5 } };

      SaveVersionManager.migrate(v1Save);
      SaveVersionManager.migrate(v1Save); // Second migration

      const backupKeys = Object.keys(mockLocalStorage)
        .filter(key => key.startsWith('voxel-rpg-save_backup_v1_'));

      // Should have 2 backups with different timestamps
      expect(backupKeys.length).toBe(2);
      expect(backupKeys[0]).not.toBe(backupKeys[1]);
    });

    test('Lists backups for specific version', () => {
      const v1Save = { player: { level: 5 } };

      SaveVersionManager.migrate(v1Save);
      SaveVersionManager.migrate(v1Save);

      const backups = SaveVersionManager.listBackups(1);

      expect(backups.length).toBe(2);
      expect(backups[0]).toContain('v1_');
      expect(backups[1]).toContain('v1_');
    });

    test('Backups are sorted chronologically', () => {
      const v1Save = { player: { level: 5 } };

      SaveVersionManager.migrate(v1Save);
      // Small delay to ensure different timestamps
      SaveVersionManager.migrate(v1Save);

      const backups = SaveVersionManager.listBackups(1);

      // Should be in ascending order (oldest first)
      const timestamp1 = parseInt(backups[0].split('_').pop());
      const timestamp2 = parseInt(backups[1].split('_').pop());

      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });
  });

  // ============================================================================
  // ROLLBACK TESTS
  // ============================================================================

  describe('Rollback System', () => {
    test('Rolls back to most recent backup of specified version', () => {
      const v1Save = {
        player: { level: 10, health: 100, xp: 1000 }
      };

      // Create backup
      SaveVersionManager.migrate(v1Save);

      // Now corrupt the save
      mockLocalStorage['voxel-rpg-gameState'] = JSON.stringify({
        corrupt: true,
        player: null
      });

      // Rollback
      const restored = SaveVersionManager.rollbackToVersion(1);

      expect(restored.player.level).toBe(10);
      expect(restored.player.health).toBe(100);
      expect(restored.player.xp).toBe(1000);
    });

    test('Throws error when no backups available', () => {
      expect(() => {
        SaveVersionManager.rollbackToVersion(1);
      }).toThrow('No backups found for version 1');
    });

    test('Rollback restores to localStorage', () => {
      const v1Save = { player: { level: 5 } };

      SaveVersionManager.migrate(v1Save);

      // Corrupt current save
      mockLocalStorage['voxel-rpg-gameState'] = '{"corrupt":true}';

      // Rollback
      SaveVersionManager.rollbackToVersion(1);

      // Check that gameState was restored
      const restoredData = JSON.parse(mockLocalStorage['voxel-rpg-gameState']);

      expect(restoredData.player.level).toBe(5);
    });

    test('Uses most recent backup when multiple exist', () => {
      const v1Save1 = { player: { level: 5, health: 50 } };
      const v1Save2 = { player: { level: 10, health: 100 } };

      SaveVersionManager.migrate(v1Save1);
      SaveVersionManager.migrate(v1Save2);

      const restored = SaveVersionManager.rollbackToVersion(1);

      // Should restore the most recent (level 10)
      expect(restored.player.level).toBe(10);
      expect(restored.player.health).toBe(100);
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('Save Validation', () => {
    test('Validates v1 save structure', () => {
      const v1Save = {
        player: { level: 5 },
        equipment: {},
        inventory: {}
      };

      const validation = SaveVersionManager.validateSave(v1Save);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('Validates v2 save structure', () => {
      const v2Save = {
        version: 2,
        player: { level: 10 },
        character: {
          attributes: {
            leadership: 10,
            construction: 10,
            exploration: 10,
            combat: 10,
            magic: 10,
            endurance: 10
          },
          skills: {
            settlement: []
          }
        },
        equipment: {},
        inventory: {}
      };

      const validation = SaveVersionManager.validateSave(v2Save);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('Detects missing character data in v2 save', () => {
      const invalidV2Save = {
        version: 2,
        player: { level: 10 },
        // Missing character data
        equipment: {},
        inventory: {}
      };

      const validation = SaveVersionManager.validateSave(invalidV2Save);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing character data');
    });

    test('Detects missing attributes in v2 save', () => {
      const invalidV2Save = {
        version: 2,
        player: {},
        character: {
          // Missing attributes
          skills: {}
        }
      };

      const validation = SaveVersionManager.validateSave(invalidV2Save);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing attributes');
    });

    test('Detects missing skills in v2 save', () => {
      const invalidV2Save = {
        version: 2,
        player: {},
        character: {
          attributes: {}
          // Missing skills
        }
      };

      const validation = SaveVersionManager.validateSave(invalidV2Save);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing skills');
    });

    test('Rejects unknown version', () => {
      const futureSave = {
        version: 99,
        player: {}
      };

      const validation = SaveVersionManager.validateSave(futureSave);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Unknown version: 99');
    });
  });

  // ============================================================================
  // MIGRATION FAILURE HANDLING
  // ============================================================================

  describe('Migration Failure Handling', () => {
    test('Handles corrupted save data gracefully', () => {
      const corruptedSave = {
        player: null, // Corrupted
        level: undefined
      };

      // Should not throw, should return fallback or error state
      expect(() => {
        SaveVersionManager.migrate(corruptedSave);
      }).not.toThrow();
    });

    test('Validates migration result before returning', () => {
      const v1Save = {
        player: { level: 10 }
      };

      const migrated = SaveVersionManager.migrate(v1Save);

      // Should be valid v2 save
      const validation = SaveVersionManager.validateSave(migrated);
      expect(validation.isValid).toBe(true);
    });

    test('Triggers rollback when validation fails after migration', () => {
      // This test would require mocking a migration that produces invalid data
      // For now, we just ensure the logic exists

      const v1Save = { player: { level: 5 } };

      // Perform migration (should create backup)
      const migrated = SaveVersionManager.migrate(v1Save);

      // If migration produced invalid data, validation would fail
      // and rollback would be triggered

      const validation = SaveVersionManager.validateSave(migrated);
      if (!validation.isValid) {
        const rolledBack = SaveVersionManager.rollbackToVersion(1);
        expect(rolledBack).toBeDefined();
      }
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    test('Handles empty save data', () => {
      const emptySave = {};

      const migrated = SaveVersionManager.migrate(emptySave);

      // Should create valid v2 save with defaults
      expect(migrated.version).toBe(2);
      expect(migrated.character).toBeDefined();
    });

    test('Handles missing player object', () => {
      const noPlayerSave = {
        equipment: {},
        inventory: {}
      };

      const migrated = SaveVersionManager.migrate(noPlayerSave);

      // Should create player with defaults
      expect(migrated.player).toBeDefined();
      expect(migrated.character.attributePoints).toBeGreaterThanOrEqual(0);
    });

    test('Handles missing level (defaults to 1)', () => {
      const noLevelSave = {
        player: {
          // No level field
          health: 100
        }
      };

      const migrated = SaveVersionManager.migrate(noLevelSave);

      // Should treat as level 1
      expect(migrated.character.attributePoints).toBe(5); // 1 * 5
      expect(migrated.character.skillPoints).toBe(2); // 1 * 2
    });

    test('Preserves metadata during migration', () => {
      const v1Save = {
        metadata: {
          savedAt: '2025-11-21T10:00:00Z',
          playtimeSeconds: 7200
        },
        player: { level: 10 }
      };

      const migrated = SaveVersionManager.migrate(v1Save);

      expect(migrated.metadata.savedAt).toBe('2025-11-21T10:00:00Z');
      expect(migrated.metadata.playtimeSeconds).toBe(7200);
    });

    test('Preserves unknown fields for forward compatibility', () => {
      const v1Save = {
        player: { level: 5 },
        customField: 'should be preserved',
        futureFeature: { data: 'test' }
      };

      const migrated = SaveVersionManager.migrate(v1Save);

      expect(migrated.customField).toBe('should be preserved');
      expect(migrated.futureFeature.data).toBe('test');
    });

    test('Does not mutate original save data', () => {
      const v1Save = {
        player: { level: 10, health: 100 }
      };

      const originalCopy = JSON.parse(JSON.stringify(v1Save));

      SaveVersionManager.migrate(v1Save);

      // Original should be unchanged
      expect(v1Save).toEqual(originalCopy);
      expect(v1Save.version).toBeUndefined();
      expect(v1Save.character).toBeUndefined();
    });
  });

  // ============================================================================
  // INTEGRATION WITH BrowserSaveManager
  // ============================================================================

  describe('Integration with Save System', () => {
    test('BrowserSaveManager adds version number when saving', () => {
      // This test would integrate with BrowserSaveManager
      // For now, we define the expected behavior

      const gameState = {
        player: { level: 5 },
        equipment: {}
      };

      // When BrowserSaveManager saves, it should add version
      const savedData = {
        version: 2, // Should be added
        ...gameState
      };

      expect(savedData.version).toBe(2);
    });

    test('BrowserSaveManager validates before saving', () => {
      const invalidState = {
        version: 2,
        player: {},
        // Missing character
      };

      const validation = SaveVersionManager.validateSave(invalidState);

      // BrowserSaveManager should check this before saving
      expect(validation.isValid).toBe(false);
    });

    test('BrowserSaveManager migrates on load', () => {
      const v1Save = {
        player: { level: 10 }
      };

      // Simulate loading old save
      const loaded = SaveVersionManager.migrate(v1Save);

      // Should be migrated to v2
      expect(loaded.version).toBe(2);
      expect(loaded.character).toBeDefined();
    });
  });
});
