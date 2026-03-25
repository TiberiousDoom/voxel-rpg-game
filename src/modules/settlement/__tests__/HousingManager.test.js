/**
 * HousingManager.test.js — Tests for housing assignment and tracking.
 */

import HousingManager from '../HousingManager';

describe('HousingManager', () => {
  let manager;

  beforeEach(() => {
    manager = new HousingManager();
  });

  describe('Building registration', () => {
    test('registers a building with capacity', () => {
      manager.registerBuilding('house_1', 2);
      expect(manager.getTotalCapacity()).toBe(2);
    });

    test('ignores duplicate registration', () => {
      manager.registerBuilding('house_1', 2);
      manager.registerBuilding('house_1', 5); // should be ignored
      expect(manager.getTotalCapacity()).toBe(2);
    });

    test('removes building and evicts occupants', () => {
      manager.registerBuilding('house_1', 2);
      manager.assignNPC('npc_1');
      manager.assignNPC('npc_2');
      expect(manager.getTotalOccupied()).toBe(2);

      manager.removeBuilding('house_1');
      expect(manager.getTotalCapacity()).toBe(0);
      expect(manager.getTotalOccupied()).toBe(0);
      expect(manager.getAssignment('npc_1')).toBeNull();
    });
  });

  describe('NPC assignment', () => {
    test('assigns NPC to building with space', () => {
      manager.registerBuilding('house_1', 2);
      expect(manager.assignNPC('npc_1')).toBe(true);
      expect(manager.getAssignment('npc_1')).toBe('house_1');
    });

    test('returns false when no space available', () => {
      manager.registerBuilding('house_1', 1);
      manager.assignNPC('npc_1');
      expect(manager.assignNPC('npc_2')).toBe(false);
      expect(manager.getAssignment('npc_2')).toBeNull();
    });

    test('assigns to next building when first is full', () => {
      manager.registerBuilding('house_1', 1);
      manager.registerBuilding('house_2', 2);
      manager.assignNPC('npc_1'); // → house_1
      manager.assignNPC('npc_2'); // → house_2
      expect(manager.getAssignment('npc_1')).toBe('house_1');
      expect(manager.getAssignment('npc_2')).toBe('house_2');
    });

    test('skips already-assigned NPC', () => {
      manager.registerBuilding('house_1', 2);
      manager.assignNPC('npc_1');
      expect(manager.assignNPC('npc_1')).toBe(true); // no-op, returns true
      expect(manager.getTotalOccupied()).toBe(1);
    });

    test('unassigns NPC', () => {
      manager.registerBuilding('house_1', 2);
      manager.assignNPC('npc_1');
      manager.unassignNPC('npc_1');
      expect(manager.getAssignment('npc_1')).toBeNull();
      expect(manager.getTotalOccupied()).toBe(0);
    });
  });

  describe('Occupancy queries', () => {
    test('getOccupancy returns correct info', () => {
      manager.registerBuilding('house_1', 2);
      manager.assignNPC('npc_1');
      const info = manager.getOccupancy('house_1');
      expect(info.capacity).toBe(2);
      expect(info.occupied).toBe(1);
      expect(info.occupants).toEqual(['npc_1']);
    });

    test('getOccupancy returns null for unknown building', () => {
      expect(manager.getOccupancy('unknown')).toBeNull();
    });

    test('getTotalCapacity sums all buildings', () => {
      manager.registerBuilding('shelter_1', 1);
      manager.registerBuilding('house_1', 2);
      expect(manager.getTotalCapacity()).toBe(3);
    });

    test('getHomelessCount calculates correctly', () => {
      manager.registerBuilding('house_1', 2);
      expect(manager.getHomelessCount(5)).toBe(3);
      expect(manager.getHomelessCount(1)).toBe(0);
    });
  });

  describe('Happiness penalty', () => {
    test('returns 0 for housed NPC', () => {
      manager.registerBuilding('house_1', 2);
      manager.assignNPC('npc_1');
      expect(manager.getHappinessPenalty('npc_1')).toBe(0);
    });

    test('returns negative penalty for homeless NPC', () => {
      expect(manager.getHappinessPenalty('npc_1')).toBe(-20);
    });
  });

  describe('Serialization', () => {
    test('serialize and deserialize roundtrip', () => {
      manager.registerBuilding('house_1', 2);
      manager.registerBuilding('shelter_1', 1);
      manager.assignNPC('npc_1');
      manager.assignNPC('npc_2');

      const data = manager.serialize();
      const manager2 = new HousingManager();
      manager2.deserialize(data);

      expect(manager2.getTotalCapacity()).toBe(3);
      expect(manager2.getTotalOccupied()).toBe(2);
      expect(manager2.getAssignment('npc_1')).toBe('house_1');
      expect(manager2.getAssignment('npc_2')).toBe('house_1');
    });

    test('handles null deserialization', () => {
      manager.deserialize(null);
      expect(manager.getTotalCapacity()).toBe(0);
    });
  });
});
