/**
 * SaveSystem.test.js - Unit tests for terrain save/load system
 *
 * Tests:
 * - Serialization/deserialization
 * - Differential saves
 * - Run-length compression
 * - Version migration
 * - localStorage integration
 * - File import/export
 * - Performance targets
 */

import { SaveSystem, MultiplayerSync } from '../SaveSystem.js';
import { TerrainSystem } from '../TerrainSystem.js';

describe('SaveSystem', () => {
  let terrainSystem;

  beforeEach(() => {
    // Create test terrain system
    terrainSystem = new TerrainSystem({
      seed: 12345,
      preset: 'DEFAULT',
      chunkSize: 32
    });
  });

  describe('Serialization', () => {
    it('should serialize terrain system to JSON', () => {
      const saveData = SaveSystem.serialize(terrainSystem);

      expect(saveData.version).toBe(SaveSystem.VERSION);
      expect(saveData.seed).toBe(12345);
      expect(saveData.worldConfig).toBeDefined();
      expect(saveData.modifications).toBeDefined();
      expect(Array.isArray(saveData.modifications)).toBe(true);
    });

    it('should include metadata when requested', () => {
      const saveData = SaveSystem.serialize(terrainSystem, { includeMetadata: true });

      expect(saveData.metadata).toBeDefined();
      expect(saveData.metadata.savedAt).toBeDefined();
      expect(saveData.metadata.totalModifications).toBeDefined();
      expect(saveData.metadata.saveTime).toBeDefined();
    });

    it('should serialize only modifications (differential save)', () => {
      // Check original heights and set to different values
      const originalHeight1 = terrainSystem.getHeight(10, 20);
      const originalHeight2 = terrainSystem.getHeight(15, 25);
      const originalHeight3 = terrainSystem.getHeight(20, 30);

      // Set to definitely different values (10 = max height, unlikely to be procedurally generated)
      terrainSystem.setHeight(10, 20, originalHeight1 === 10 ? 0 : 10);
      terrainSystem.setHeight(15, 25, originalHeight2 === 10 ? 0 : 10);
      terrainSystem.setHeight(20, 30, originalHeight3 === 10 ? 0 : 10);

      const saveData = SaveSystem.serialize(terrainSystem, { compress: false });

      expect(saveData.modifications.length).toBe(3);
    });

    it('should not include unmodified tiles', () => {
      // Don't modify anything
      const saveData = SaveSystem.serialize(terrainSystem);

      expect(saveData.modifications.length).toBe(0);
    });
  });

  describe('Deserialization', () => {
    it('should deserialize terrain system from JSON', () => {
      // Modify terrain
      terrainSystem.setHeight(10, 20, 5);
      terrainSystem.setHeight(15, 25, 7);

      // Save
      const saveData = SaveSystem.serialize(terrainSystem);

      // Load into new system
      const loaded = SaveSystem.deserialize(saveData);

      expect(loaded.seed).toBe(12345);
      expect(loaded.getHeight(10, 20)).toBe(5);
      expect(loaded.getHeight(15, 25)).toBe(7);
    });

    it('should restore modifications over procedural baseline', () => {
      // Modify terrain
      terrainSystem.setHeight(5, 5, 9);

      // Save and load
      const saveData = SaveSystem.serialize(terrainSystem);
      const loaded = SaveSystem.deserialize(saveData);

      // Modified tile should have saved height
      expect(loaded.getHeight(5, 5)).toBe(9);

      // Unmodified tiles should regenerate from seed
      const originalHeight = terrainSystem.getHeight(100, 100);
      const loadedHeight = loaded.getHeight(100, 100);
      expect(loadedHeight).toBe(originalHeight);
    });
  });

  describe('Compression', () => {
    it('should compress consecutive modifications', () => {
      // Create a horizontal line of modifications
      for (let x = 0; x < 10; x++) {
        terrainSystem.setHeight(x, 5, 7);
      }

      const uncompressed = SaveSystem.serialize(terrainSystem, { compress: false });
      const compressed = SaveSystem.serialize(terrainSystem, { compress: true });

      expect(uncompressed.modifications.length).toBe(10);
      expect(compressed.modifications.length).toBe(1); // Single run
      expect(compressed.modifications[0].count).toBe(10);
    });

    it('should compress multiple runs correctly', () => {
      // Create two separate runs with definite height changes
      // Use height 10 (max) which is unlikely to be procedurally generated at low coordinates
      for (let x = 0; x < 5; x++) {
        terrainSystem.setHeight(x, 0, 10);
      }
      for (let x = 10; x < 15; x++) {
        terrainSystem.setHeight(x, 0, 10);
      }

      const compressed = SaveSystem.serialize(terrainSystem, { compress: true });

      expect(compressed.modifications.length).toBe(2);
      expect(compressed.modifications[0].count).toBe(5);
      expect(compressed.modifications[1].count).toBe(5);
    });

    it('should decompress modifications correctly', () => {
      // Create modifications
      for (let x = 0; x < 10; x++) {
        terrainSystem.setHeight(x, 5, 7);
      }

      // Save with compression and load
      const compressed = SaveSystem.serialize(terrainSystem, { compress: true });
      const decompressed = SaveSystem.decompressModifications(compressed.modifications);

      expect(decompressed.length).toBe(10);
      decompressed.forEach(mod => {
        expect(mod.modifiedHeight).toBe(7);
        expect(mod.z).toBe(5);
      });
    });

    it('should achieve good compression ratio for sparse modifications', () => {
      // Scatter modifications (not consecutive) using max height
      terrainSystem.setHeight(0, 0, 10);
      terrainSystem.setHeight(50, 50, 10);
      terrainSystem.setHeight(100, 100, 10);

      const stats = SaveSystem.getStats(terrainSystem);

      // Should have 3 modifications (sparse)
      expect(stats.modifications).toBe(3);
      expect(stats.compressedRuns).toBe(3);
    });

    it('should achieve excellent compression for consecutive modifications', () => {
      // Create large consecutive area using max height (10) to ensure changes
      for (let z = 0; z < 10; z++) {
        for (let x = 0; x < 10; x++) {
          terrainSystem.setHeight(x, z, 10);
        }
      }

      const stats = SaveSystem.getStats(terrainSystem);

      // Should have 100 modifications
      expect(stats.modifications).toBe(100);
      // Should compress to 10 runs (one per row)
      expect(stats.compressedRuns).toBe(10);

      // Compression ratio should be excellent
      const ratio = parseFloat(stats.compressionRatio);
      expect(ratio).toBeGreaterThan(50); // At least 50% compression
    });
  });

  describe('Version Migration', () => {
    it('should migrate old save data to current version', () => {
      const oldSaveData = {
        version: 1,
        seed: 12345,
        worldConfig: {},
        modifications: []
      };

      const migrated = SaveSystem.migrate(oldSaveData, SaveSystem.VERSION);

      expect(migrated.version).toBe(SaveSystem.VERSION);
    });

    it('should handle migration during deserialization', () => {
      const oldSaveData = {
        version: 1,
        seed: 12345,
        worldConfig: {},
        modifications: []
      };

      expect(() => {
        SaveSystem.deserialize(oldSaveData, { migrateVersion: true });
      }).not.toThrow();
    });
  });

  describe('LocalStorage Integration', () => {
    const TEST_KEY = 'test_terrain_save';

    afterEach(() => {
      localStorage.removeItem(TEST_KEY);
    });

    it('should save to localStorage', () => {
      terrainSystem.setHeight(10, 20, 5);

      const success = SaveSystem.saveToLocalStorage(terrainSystem, TEST_KEY);

      expect(success).toBe(true);
      expect(localStorage.getItem(TEST_KEY)).not.toBeNull();
    });

    it('should load from localStorage', () => {
      terrainSystem.setHeight(10, 20, 5);
      SaveSystem.saveToLocalStorage(terrainSystem, TEST_KEY);

      const loaded = SaveSystem.loadFromLocalStorage(TEST_KEY);

      expect(loaded).not.toBeNull();
      expect(loaded.getHeight(10, 20)).toBe(5);
    });

    it('should return null if no save exists', () => {
      const loaded = SaveSystem.loadFromLocalStorage('nonexistent_key');

      expect(loaded).toBeNull();
    });

    it('should check if save exists', () => {
      expect(SaveSystem.hasSave(TEST_KEY)).toBe(false);

      SaveSystem.saveToLocalStorage(terrainSystem, TEST_KEY);

      expect(SaveSystem.hasSave(TEST_KEY)).toBe(true);
    });

    it('should clear save data', () => {
      SaveSystem.saveToLocalStorage(terrainSystem, TEST_KEY);
      expect(SaveSystem.hasSave(TEST_KEY)).toBe(true);

      const cleared = SaveSystem.clearSave(TEST_KEY);

      expect(cleared).toBe(true);
      expect(SaveSystem.hasSave(TEST_KEY)).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should provide save statistics', () => {
      // Create some modifications using max height
      for (let x = 0; x < 20; x++) {
        terrainSystem.setHeight(x, 0, 10);
      }

      const stats = SaveSystem.getStats(terrainSystem);

      expect(stats.modifications).toBe(20);
      expect(stats.compressedRuns).toBeDefined();
      expect(stats.compressionRatio).toBeDefined();
      expect(stats.uncompressedSize).toBeDefined();
      expect(stats.compressedSize).toBeDefined();
      expect(stats.savedKB).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should save large world quickly (<2 seconds for 10k modifications)', () => {
      // Create 10,000 modifications
      for (let i = 0; i < 10000; i++) {
        const x = i % 100;
        const z = Math.floor(i / 100);
        terrainSystem.setHeight(x, z, 5);
      }

      const startTime = performance.now();
      const saveData = SaveSystem.serialize(terrainSystem);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(2000); // Less than 2 seconds
      expect(saveData.modifications.length).toBeGreaterThan(0);
    });

    it('should load large world quickly (<2 seconds for 10k modifications)', () => {
      // Create 10,000 modifications
      for (let i = 0; i < 10000; i++) {
        const x = i % 100;
        const z = Math.floor(i / 100);
        terrainSystem.setHeight(x, z, 5);
      }

      const saveData = SaveSystem.serialize(terrainSystem);

      const startTime = performance.now();
      const loaded = SaveSystem.deserialize(saveData);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(2000); // Less than 2 seconds
      expect(loaded).not.toBeNull();
    });

    it('should produce small file sizes (<5 MB for typical world)', () => {
      // Create 1,000 scattered modifications (typical world)
      for (let i = 0; i < 1000; i++) {
        const x = Math.floor(Math.random() * 500);
        const z = Math.floor(Math.random() * 500);
        terrainSystem.setHeight(x, z, Math.floor(Math.random() * 10));
      }

      const saveData = SaveSystem.serialize(terrainSystem);
      const json = JSON.stringify(saveData);
      const sizeKB = new Blob([json]).size / 1024;

      expect(sizeKB).toBeLessThan(5000); // Less than 5 MB
    });
  });

  describe('Round-trip Consistency', () => {
    it('should maintain data integrity after save/load cycle', () => {
      // Create varied modifications
      terrainSystem.setHeight(10, 20, 5);
      terrainSystem.setHeight(50, 75, 8);
      terrainSystem.setHeight(100, 150, 2);

      // Save and load
      const saveData = SaveSystem.serialize(terrainSystem);
      const loaded = SaveSystem.deserialize(saveData);

      // Verify all modifications preserved
      expect(loaded.getHeight(10, 20)).toBe(5);
      expect(loaded.getHeight(50, 75)).toBe(8);
      expect(loaded.getHeight(100, 150)).toBe(2);

      // Verify procedural generation still works for unmodified tiles
      const original = terrainSystem.getHeight(200, 200);
      const restored = loaded.getHeight(200, 200);
      expect(restored).toBe(original);
    });

    it('should handle multiple save/load cycles', () => {
      // Initial modifications
      terrainSystem.setHeight(10, 10, 5);

      // First cycle
      let saveData = SaveSystem.serialize(terrainSystem);
      let loaded = SaveSystem.deserialize(saveData);

      // Second modification
      loaded.setHeight(20, 20, 7);

      // Second cycle
      saveData = SaveSystem.serialize(loaded);
      loaded = SaveSystem.deserialize(saveData);

      // Both modifications should be preserved
      expect(loaded.getHeight(10, 10)).toBe(5);
      expect(loaded.getHeight(20, 20)).toBe(7);
    });
  });
});

describe('MultiplayerSync', () => {
  let terrainSystem;

  beforeEach(() => {
    terrainSystem = new TerrainSystem({
      seed: 12345,
      chunkSize: 32
    });
  });

  describe('Chunk Packets', () => {
    it('should create chunk modification packet', () => {
      // Modify terrain in chunk (0, 0)
      terrainSystem.setHeight(5, 10, 7);
      terrainSystem.setHeight(8, 12, 5);

      const packet = MultiplayerSync.createChunkPacket(terrainSystem, 0, 0);

      expect(packet.chunkX).toBe(0);
      expect(packet.chunkZ).toBe(0);
      expect(packet.modifications).toBeDefined();
      expect(packet.timestamp).toBeDefined();
    });

    it('should filter modifications by chunk', () => {
      // Modify terrain in different chunks
      terrainSystem.setHeight(5, 5, 7);    // Chunk (0, 0)
      terrainSystem.setHeight(50, 50, 3);  // Chunk (1, 1)

      const packet00 = MultiplayerSync.createChunkPacket(terrainSystem, 0, 0);
      const packet11 = MultiplayerSync.createChunkPacket(terrainSystem, 1, 1);

      // Each packet should only contain modifications for its chunk
      const mods00 = SaveSystem.decompressModifications(packet00.modifications);
      const mods11 = SaveSystem.decompressModifications(packet11.modifications);

      expect(mods00.length).toBe(1);
      expect(mods11.length).toBe(1);
    });

    it('should apply chunk modification packet', () => {
      // Create packet from one system
      terrainSystem.setHeight(10, 10, 8);
      const packet = MultiplayerSync.createChunkPacket(terrainSystem, 0, 0);

      // Apply to another system
      const other = new TerrainSystem({ seed: 12345, chunkSize: 32 });
      MultiplayerSync.applyChunkPacket(other, packet);

      expect(other.getHeight(10, 10)).toBe(8);
    });
  });

  describe('Delta Packets', () => {
    it('should create delta packet', () => {
      terrainSystem.setHeight(10, 20, 5);
      terrainSystem.setHeight(15, 25, 7);

      const delta = MultiplayerSync.createDeltaPacket(terrainSystem, 0);

      expect(delta.modifications).toBeDefined();
      expect(delta.timestamp).toBeDefined();
    });
  });
});
