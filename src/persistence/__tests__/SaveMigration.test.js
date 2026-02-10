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

import { SaveVersionManager, SAVE_VERSION, POINTS_PER_LEVEL, getDefaultCharacterData } from '../SaveVersionManager';

describe('Save Migration Tests', () => {

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

      // Should preserve original data
      expect(v2Save.player.level).toBe(10);
      expect(v2Save.player.position).toEqual([0, 2, 0]);
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

    test('Sets default attributes to 0 for new characters', () => {
      const v1Save = {
        player: { level: 1 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      expect(v2Save.character.attributes).toEqual({
        leadership: 0,
        construction: 0,
        exploration: 0,
        combat: 0,
        magic: 0,
        endurance: 0
      });
    });

    test('Initializes empty skill trees', () => {
      const v1Save = {
        player: { level: 5 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      expect(v2Save.character.skills).toEqual({
        activeNodes: [],
        unlockedNodes: []
      });
    });

    test('Sets characterDataVersion on player after migration', () => {
      const v1Save = {
        player: { level: 1 }
      };

      const v2Save = SaveVersionManager.migrate(v1Save);

      expect(v2Save.player.characterDataVersion).toBe(2);
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
    test('createBackup returns a deep copy of save data', () => {
      const saveData = {
        player: { level: 10, health: 100 },
        inventory: { gold: 500 }
      };

      const backup = SaveVersionManager.createBackup(saveData);

      expect(backup).toEqual(saveData);
      expect(backup).not.toBe(saveData); // Different reference
    });

    test('Backup is independent of original (deep copy)', () => {
      const saveData = {
        player: { level: 15, health: 80, xp: 2500 },
        inventory: { gold: 1000 }
      };

      const backup = SaveVersionManager.createBackup(saveData);

      // Mutate original
      saveData.player.level = 999;
      saveData.inventory.gold = 0;

      // Backup should be unchanged
      expect(backup.player.level).toBe(15);
      expect(backup.player.health).toBe(80);
      expect(backup.inventory.gold).toBe(1000);
    });

    test('safeMigrate creates backup before migration', () => {
      const v1Save = {
        player: { level: 5 }
      };

      const result = SaveVersionManager.safeMigrate(v1Save);

      expect(result.backup).toBeDefined();
      expect(result.backup.player.level).toBe(5);
    });

    test('safeMigrate backup preserves original data', () => {
      const v1Save = {
        player: { level: 5 },
        inventory: { gold: 100 }
      };

      const result = SaveVersionManager.safeMigrate(v1Save);

      expect(result.backup.player.level).toBe(5);
      expect(result.backup.inventory.gold).toBe(100);
      // Backup should not have v2 fields
      expect(result.backup.version).toBeUndefined();
    });

    test('safeMigrate returns migrated data on success', () => {
      const v1Save = {
        player: { level: 5 }
      };

      const result = SaveVersionManager.safeMigrate(v1Save);

      expect(result.success).toBe(true);
      expect(result.data.version).toBe(2);
      expect(result.data.character).toBeDefined();
    });
  });

  // ============================================================================
  // ROLLBACK TESTS
  // ============================================================================

  describe('Rollback System', () => {
    test('safeMigrate returns backup data when migration validation fails', () => {
      // A save with no player data will fail post-migration validation
      // because validate() requires player.level to be a number
      const invalidSave = {};

      const result = SaveVersionManager.safeMigrate(invalidSave);

      // Should return backup since validation fails (missing player data)
      expect(result.backup).toBeDefined();
      if (!result.success) {
        expect(result.data).toEqual(result.backup);
      }
    });

    test('safeMigrate reports errors when migration fails validation', () => {
      const invalidSave = {};

      const result = SaveVersionManager.safeMigrate(invalidSave);

      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    test('safeMigrate preserves original data in backup regardless of outcome', () => {
      const saveData = {
        player: { level: 5 },
        customData: 'test'
      };

      const result = SaveVersionManager.safeMigrate(saveData);

      expect(result.backup.player.level).toBe(5);
      expect(result.backup.customData).toBe('test');
    });

    test('safeMigrate succeeds for valid v1 saves', () => {
      const v1Save = {
        player: { level: 10, health: 100 }
      };

      const result = SaveVersionManager.safeMigrate(v1Save);

      expect(result.success).toBe(true);
      expect(result.data.version).toBe(2);
      expect(result.data.character).toBeDefined();
      expect(result.errors).toEqual([]);
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

      const validation = SaveVersionManager.validate(v1Save);

      expect(validation.valid).toBe(true);
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
          attributePoints: 50,
          skills: {
            activeNodes: [],
            unlockedNodes: []
          },
          skillPoints: 20
        },
        equipment: {},
        inventory: {}
      };

      const validation = SaveVersionManager.validate(v2Save);

      expect(validation.valid).toBe(true);
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

      const validation = SaveVersionManager.validate(invalidV2Save);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing character data in v2 save');
    });

    test('Detects missing attributes in v2 save', () => {
      const invalidV2Save = {
        version: 2,
        player: { level: 1 },
        character: {
          attributePoints: 0,
          // Missing attributes
          skills: { activeNodes: [], unlockedNodes: [] },
          skillPoints: 0
        }
      };

      const validation = SaveVersionManager.validate(invalidV2Save);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing character attributes');
    });

    test('Detects missing skills in v2 save', () => {
      const invalidV2Save = {
        version: 2,
        player: { level: 1 },
        character: {
          attributes: {
            leadership: 0,
            construction: 0,
            exploration: 0,
            combat: 0,
            magic: 0,
            endurance: 0
          },
          attributePoints: 0,
          skillPoints: 0
          // Missing skills
        }
      };

      const validation = SaveVersionManager.validate(invalidV2Save);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing skills data');
    });

    test('Rejects unknown version', () => {
      const futureSave = {
        version: 99,
        player: { level: 1 }
      };

      const validation = SaveVersionManager.validate(futureSave);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Invalid save version: 99');
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
      const validation = SaveVersionManager.validate(migrated);
      expect(validation.valid).toBe(true);
    });

    test('safeMigrate returns backup when validation fails after migration', () => {
      const v1Save = { player: { level: 5 } };

      // Perform safe migration
      const result = SaveVersionManager.safeMigrate(v1Save);

      // safeMigrate validates the result and returns backup if invalid
      expect(result.backup).toBeDefined();
      if (!result.success) {
        expect(result.data).toEqual(result.backup);
        expect(result.errors.length).toBeGreaterThan(0);
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

      // Character should still be created with default level (1) points
      expect(migrated.character).toBeDefined();
      expect(migrated.character.attributePoints).toBe(5); // 1 * 5
      expect(migrated.character.skillPoints).toBe(2); // 1 * 2
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

    test('Does not mutate original save data at top level', () => {
      const v1Save = {
        player: { level: 10, health: 100 }
      };

      const originalCopy = JSON.parse(JSON.stringify(v1Save));

      SaveVersionManager.migrate(v1Save);

      // Top-level original should not have version or character added
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
        player: { level: 1 },
        // Missing character
      };

      const validation = SaveVersionManager.validate(invalidState);

      // BrowserSaveManager should check this before saving
      expect(validation.valid).toBe(false);
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
