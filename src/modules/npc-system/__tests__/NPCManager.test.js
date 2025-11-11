/**
 * NPCManager Unit Tests
 */

import { NPCManager } from '../NPCManager';
import { createTestNPC } from '../../../test-utils';

describe('NPCManager', () => {
  let npcManager;
  let mockTownManager;

  beforeEach(() => {
    mockTownManager = {
      getMaxPopulation: jest.fn().mockReturnValue(100),
      getCurrentTown: jest.fn().mockReturnValue({ name: 'TestTown' })
    };

    npcManager = new NPCManager(mockTownManager);
  });

  describe('Constructor', () => {
    test('initializes with empty NPC collection', () => {
      expect(npcManager.npcs.size).toBe(0);
    });

    test('initializes statistics', () => {
      const stats = npcManager.getStatistics();
      expect(stats.total).toBe(0);
      expect(stats.alive).toBe(0);
    });
  });

  describe('Spawn NPC', () => {
    test('spawns NPC successfully', () => {
      const result = npcManager.spawnNPC();

      expect(result.success).toBe(true);
      expect(result.npcId).toBeDefined();
      expect(npcManager.npcs.size).toBe(1);
    });

    test('assigns unique ID to NPC', () => {
      const result1 = npcManager.spawnNPC();
      const result2 = npcManager.spawnNPC();

      expect(result1.npcId).not.toBe(result2.npcId);
    });

    test('prevents spawning beyond max population', () => {
      mockTownManager.getMaxPopulation.mockReturnValue(2);

      npcManager.spawnNPC();
      npcManager.spawnNPC();
      const result = npcManager.spawnNPC();

      expect(result.success).toBe(false);
      expect(result.error).toContain('population');
    });

    test('updates statistics after spawning', () => {
      npcManager.spawnNPC();

      const stats = npcManager.getStatistics();
      expect(stats.total).toBe(1);
      expect(stats.alive).toBe(1);
    });
  });

  describe('NPC Removal', () => {
    test('removes NPC successfully', () => {
      const { npcId } = npcManager.spawnNPC();
      const result = npcManager.removeNPC(npcId);

      expect(result.success).toBe(true);
      expect(npcManager.npcs.has(npcId)).toBe(false);
    });

    test('handles removing non-existent NPC', () => {
      const result = npcManager.removeNPC('non-existent');

      expect(result.success).toBe(false);
    });

    test('updates statistics after removal', () => {
      const { npcId } = npcManager.spawnNPC();
      npcManager.removeNPC(npcId);

      const stats = npcManager.getStatistics();
      expect(stats.total).toBe(0);
    });
  });

  describe('NPC Retrieval', () => {
    test('gets NPC by ID', () => {
      const { npcId } = npcManager.spawnNPC();
      const npc = npcManager.getNPC(npcId);

      expect(npc).toBeDefined();
      expect(npc.id).toBe(npcId);
    });

    test('returns null for non-existent NPC', () => {
      const npc = npcManager.getNPC('non-existent');
      expect(npc).toBeNull();
    });

    test('gets all NPCs', () => {
      npcManager.spawnNPC();
      npcManager.spawnNPC();

      const all = npcManager.getAllNPCs();
      expect(all).toHaveLength(2);
    });

    test('gets alive NPCs only', () => {
      const { npcId: npc1 } = npcManager.spawnNPC();
      npcManager.spawnNPC();

      const npc = npcManager.getNPC(npc1);
      npc.alive = false;

      const alive = npcManager.getAliveNPCs();
      expect(alive).toHaveLength(1);
    });
  });

  describe('Statistics', () => {
    test('counts total NPCs', () => {
      npcManager.spawnNPC();
      npcManager.spawnNPC();

      const stats = npcManager.getStatistics();
      expect(stats.total).toBe(2);
    });

    test('counts alive NPCs', () => {
      const { npcId } = npcManager.spawnNPC();
      npcManager.spawnNPC();

      const npc = npcManager.getNPC(npcId);
      npc.alive = false;

      const stats = npcManager.getStatistics();
      expect(stats.alive).toBe(1);
      expect(stats.dead).toBe(1);
    });

    test('calculates average happiness', () => {
      const { npcId: npc1 } = npcManager.spawnNPC();
      const { npcId: npc2 } = npcManager.spawnNPC();

      npcManager.getNPC(npc1).happiness = 80;
      npcManager.getNPC(npc2).happiness = 60;

      const stats = npcManager.getStatistics();
      expect(stats.avgHappiness).toBe(70);
    });
  });

  describe('NPC Update', () => {
    test('updates NPC on tick', () => {
      const { npcId } = npcManager.spawnNPC();

      npcManager.tick(100);

      const npc = npcManager.getNPC(npcId);
      expect(npc).toBeDefined();
    });

    test('handles multiple NPCs in tick', () => {
      npcManager.spawnNPC();
      npcManager.spawnNPC();
      npcManager.spawnNPC();

      expect(() => {
        npcManager.tick(100);
      }).not.toThrow();
    });
  });
});
