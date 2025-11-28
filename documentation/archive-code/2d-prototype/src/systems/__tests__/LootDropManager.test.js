/**
 * LootDropManager.test.js - Tests for loot drop system
 *
 * Tests:
 * - Loot drop creation from monsters
 * - Pickup detection
 * - Drop expiration
 * - Position management
 * - Visual data
 */

import { LootDropManager, LootDrop } from '../LootDropManager';
import { Item } from '../../entities/Item';

describe('LootDropManager', () => {
  let manager;

  beforeEach(() => {
    manager = new LootDropManager();

    // Mock the lootTable.generateLoot method
    manager.lootTable.generateLoot = jest.fn((monster) => ({
      gold: 50,
      items: [
        new Item({ name: 'Test Sword', type: 'WEAPON', stats: { damage: 30 } })
      ]
    }));

    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Monster Loot Creation', () => {
    test('should create gold drop from monster', () => {
      const monster = {
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      };

      const drops = manager.createMonsterLoot(monster);

      expect(drops.length).toBeGreaterThan(0);
      const goldDrop = drops.find(d => d.type === 'GOLD');
      expect(goldDrop).toBeDefined();
      expect(goldDrop.gold).toBe(50);
      expect(goldDrop.position).toEqual({ x: 10, z: 10 });
    });

    test('should create item drops from monster', () => {
      const monster = {
        name: 'Goblin',
        type: 'GOBLIN',
        level: 3,
        position: { x: 20, z: 20 }
      };

      const drops = manager.createMonsterLoot(monster);

      const itemDrops = drops.filter(d => d.type === 'ITEM');
      expect(itemDrops.length).toBeGreaterThan(0);
      expect(itemDrops[0].item).toBeDefined();
    });

    test('should offset multiple items', () => {
      const monster = {
        name: 'Boss',
        type: 'ORC',
        level: 10,
        position: { x: 50, z: 50 }
      };

      const drops = manager.createMonsterLoot(monster);
      const itemDrops = drops.filter(d => d.type === 'ITEM');

      if (itemDrops.length > 1) {
        // Items should have different positions
        const pos1 = itemDrops[0].position;
        const pos2 = itemDrops[1].position;
        expect(pos1.x).not.toBe(pos2.x);
      }
    });

    test('should add drops to manager list', () => {
      const monster = {
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      };

      const initialCount = manager.getAllDrops().length;
      manager.createMonsterLoot(monster);
      const newCount = manager.getAllDrops().length;

      expect(newCount).toBeGreaterThan(initialCount);
    });
  });

  describe('LootDrop Class', () => {
    test('should create loot drop with default values', () => {
      const drop = new LootDrop({
        type: 'GOLD',
        position: { x: 0, z: 0 },
        gold: 100
      });

      expect(drop.id).toBeDefined();
      expect(drop.type).toBe('GOLD');
      expect(drop.gold).toBe(100);
      expect(drop.canPickup).toBe(false); // Starts false, becomes true after delay
    });

    test('should enable pickup after delay', () => {
      const drop = new LootDrop({
        type: 'GOLD',
        position: { x: 0, z: 0 },
        gold: 50,
        autoPickupDelay: 100
      });

      expect(drop.canPickup).toBe(false);

      jest.advanceTimersByTime(150);

      expect(drop.canPickup).toBe(true);
    });

    test('should check if expired', () => {
      const drop = new LootDrop({
        type: 'GOLD',
        position: { x: 0, z: 0 },
        gold: 50,
        lifetime: 1000
      });

      expect(drop.isExpired()).toBe(false);

      jest.advanceTimersByTime(1100);

      expect(drop.isExpired()).toBe(true);
    });

    test('should check pickup range', () => {
      const drop = new LootDrop({
        type: 'GOLD',
        position: { x: 10, z: 10 },
        gold: 50,
        pickupRadius: 2,
        autoPickupDelay: 0
      });

      // Enable pickup
      jest.advanceTimersByTime(100);

      // In range
      expect(drop.isInPickupRange({ x: 11, z: 11 })).toBe(true);

      // Out of range
      expect(drop.isInPickupRange({ x: 20, z: 20 })).toBe(false);
    });

    test('should not be pickupable before delay', () => {
      const drop = new LootDrop({
        type: 'GOLD',
        position: { x: 10, z: 10 },
        gold: 50,
        pickupRadius: 2,
        autoPickupDelay: 1000
      });

      // Player right on top of it
      expect(drop.isInPickupRange({ x: 10, z: 10 })).toBe(false);

      // After delay
      jest.advanceTimersByTime(1100);
      expect(drop.isInPickupRange({ x: 10, z: 10 })).toBe(true);
    });

    test('should get visual data', () => {
      const item = new Item({
        name: 'Epic Sword',
        type: 'WEAPON',
        rarity: 'EPIC'
      });

      const drop = new LootDrop({
        type: 'ITEM',
        position: { x: 5, z: 5 },
        item: item
      });

      const visual = drop.getVisualData();

      expect(visual.type).toBe('ITEM');
      expect(visual.position).toEqual({ x: 5, z: 5 });
      expect(visual.rarity).toBe('EPIC');
      expect(visual.name).toBe('Epic Sword');
    });
  });

  describe('Drop Updates', () => {
    test('should detect pickup when player in range', () => {
      const monster = {
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      };

      manager.createMonsterLoot(monster);

      // Enable pickup
      jest.advanceTimersByTime(1100);

      const playerPos = { x: 10, z: 10 };
      const pickedUp = manager.update(playerPos);

      expect(pickedUp.length).toBeGreaterThan(0);
    });

    test('should call onPickup callback', () => {
      const monster = {
        name: 'Goblin',
        type: 'GOBLIN',
        level: 2,
        position: { x: 15, z: 15 }
      };

      manager.createMonsterLoot(monster);
      jest.advanceTimersByTime(1100);

      const onPickup = jest.fn();
      const playerPos = { x: 15, z: 15 };

      manager.update(playerPos, onPickup);

      expect(onPickup).toHaveBeenCalled();
    });

    test('should remove expired drops', () => {
      const monster = {
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      };

      manager.createMonsterLoot(monster);
      const initialCount = manager.getAllDrops().length;

      // Advance past expiration time (60 seconds default)
      jest.advanceTimersByTime(61000);

      const playerPos = { x: 100, z: 100 }; // Far away
      manager.update(playerPos);

      const newCount = manager.getAllDrops().length;
      expect(newCount).toBeLessThan(initialCount);
    });

    test('should not pickup drops out of range', () => {
      const monster = {
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      };

      manager.createMonsterLoot(monster);
      jest.advanceTimersByTime(1100);

      const playerPos = { x: 100, z: 100 }; // Far away
      const pickedUp = manager.update(playerPos);

      expect(pickedUp).toHaveLength(0);
    });
  });

  describe('Drop Queries', () => {
    test('should get drops near position', () => {
      manager.createMonsterLoot({
        name: 'Slime1',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      });

      manager.createMonsterLoot({
        name: 'Slime2',
        type: 'SLIME',
        level: 1,
        position: { x: 50, z: 50 }
      });

      const nearDrops = manager.getDropsNear({ x: 10, z: 10 }, 5);

      expect(nearDrops.length).toBeGreaterThan(0);
      nearDrops.forEach(drop => {
        const dx = drop.position.x - 10;
        const dz = drop.position.z - 10;
        const distance = Math.sqrt(dx * dx + dz * dz);
        expect(distance).toBeLessThanOrEqual(5);
      });
    });

    test('should get all drops', () => {
      manager.createMonsterLoot({
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      });

      const allDrops = manager.getAllDrops();

      expect(allDrops.length).toBeGreaterThan(0);
      expect(Array.isArray(allDrops)).toBe(true);
    });

    test('should get visual data for all drops', () => {
      manager.createMonsterLoot({
        name: 'Goblin',
        type: 'GOBLIN',
        level: 3,
        position: { x: 20, z: 20 }
      });

      const visualData = manager.getAllVisualData();

      expect(Array.isArray(visualData)).toBe(true);
      expect(visualData.length).toBeGreaterThan(0);
      expect(visualData[0]).toHaveProperty('id');
      expect(visualData[0]).toHaveProperty('type');
      expect(visualData[0]).toHaveProperty('position');
    });
  });

  describe('Drop Management', () => {
    test('should remove specific drop', () => {
      manager.createMonsterLoot({
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      });

      const drops = manager.getAllDrops();
      const dropId = drops[0].id;

      const removed = manager.removeDrop(dropId);

      expect(removed).toBe(true);
      expect(manager.getAllDrops()).not.toContain(drops[0]);
    });

    test('should return false when removing non-existent drop', () => {
      const removed = manager.removeDrop('non-existent-id');

      expect(removed).toBe(false);
    });

    test('should clear all drops', () => {
      manager.createMonsterLoot({
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      });

      manager.clearAll();

      expect(manager.getAllDrops()).toHaveLength(0);
    });
  });

  describe('Drop Statistics', () => {
    test('should get accurate statistics', () => {
      manager.createMonsterLoot({
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      });

      const stats = manager.getStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.gold + stats.items).toBe(stats.total);
      expect(typeof stats.expiringSoon).toBe('number');
    });

    test('should track expiring drops', () => {
      manager.createMonsterLoot({
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      });

      // Advance to near expiration (default 60s, expiringSoon = < 10s)
      jest.advanceTimersByTime(55000);

      const stats = manager.getStats();

      expect(stats.expiringSoon).toBeGreaterThan(0);
    });

    test('should return zero stats for empty manager', () => {
      const stats = manager.getStats();

      expect(stats.total).toBe(0);
      expect(stats.gold).toBe(0);
      expect(stats.items).toBe(0);
    });
  });

  describe('Position Offset', () => {
    test('should return zero offset for single drop', () => {
      const offset = manager.getDropOffset(0, 1);

      expect(offset.x).toBe(0);
      expect(offset.z).toBe(0);
    });

    test('should distribute multiple drops in circle', () => {
      const offsets = [];
      const count = 4;

      for (let i = 0; i < count; i++) {
        offsets.push(manager.getDropOffset(i, count));
      }

      // Should have different positions
      const uniqueX = new Set(offsets.map(o => o.x.toFixed(2)));
      expect(uniqueX.size).toBeGreaterThan(1);
    });

    test('should maintain consistent radius', () => {
      const offset = manager.getDropOffset(0, 4);
      const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z);

      expect(radius).toBeCloseTo(1.5, 1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle monster with no loot', () => {
      // Mock to return no loot
      manager.lootTable.generateLoot = jest.fn(() => ({
        gold: 0,
        items: []
      }));

      const monster = {
        name: 'Poor Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      };

      const drops = manager.createMonsterLoot(monster);

      expect(drops).toHaveLength(0);
    });

    test('should handle rapid updates', () => {
      manager.createMonsterLoot({
        name: 'Slime',
        type: 'SLIME',
        level: 1,
        position: { x: 10, z: 10 }
      });

      jest.advanceTimersByTime(1100);

      const playerPos = { x: 100, z: 100 };

      // Multiple rapid updates
      for (let i = 0; i < 10; i++) {
        manager.update(playerPos);
      }

      // Should still have drops (not picked up, not expired)
      expect(manager.getAllDrops().length).toBeGreaterThan(0);
    });

    test('should handle pickup of all drops at once', () => {
      manager.createMonsterLoot({
        name: 'Rich Boss',
        type: 'ORC',
        level: 10,
        position: { x: 10, z: 10 }
      });

      jest.advanceTimersByTime(1100);

      const playerPos = { x: 10, z: 10 };
      const pickedUp = manager.update(playerPos);

      expect(pickedUp.length).toBeGreaterThan(0);
      expect(manager.getAllDrops().length).toBe(0);
    });
  });
});
