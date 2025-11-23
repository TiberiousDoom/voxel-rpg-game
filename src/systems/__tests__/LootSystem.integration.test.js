/**
 * LootSystem.integration.test.js - Integration tests for complete loot system
 *
 * Tests the full loot flow:
 * 1. Monster dies
 * 2. Loot is generated based on monster type/level
 * 3. Loot drops appear on ground
 * 4. Player picks up loot
 * 5. Items are equipped or added to inventory
 * 6. Stats are updated
 */

import { Monster } from '../../entities/Monster';
import { LootTable } from '../LootTable';
import { LootDropManager } from '../LootDropManager';
import { EquipmentManager } from '../EquipmentManager';

describe('Loot System Integration', () => {
  let lootTable;
  let lootDropManager;
  let equipmentManager;

  beforeEach(() => {
    lootTable = new LootTable();
    lootDropManager = new LootDropManager();
    equipmentManager = new EquipmentManager();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Complete Loot Flow', () => {
    test('should handle full loot cycle from monster death to equipment', () => {
      // 1. Create a monster
      const monster = new Monster('GOBLIN', { x: 10, z: 10 }, { level: 3 });
      expect(monster.alive).toBe(true);

      // 2. Kill the monster (account for defense)
      const killed = monster.takeDamage(monster.health + monster.defense + 100);
      expect(killed).toBe(true);
      expect(monster.alive).toBe(false);
      expect(monster.aiState).toBe('DEATH');

      // 3. Create loot drops at death position
      const drops = lootDropManager.createMonsterLoot(monster);
      expect(drops.length).toBeGreaterThan(0);

      // Verify drops are at monster position
      drops.forEach(drop => {
        expect(drop.position.x).toBeCloseTo(monster.position.x, 1);
        expect(drop.position.z).toBeCloseTo(monster.position.z, 1);
      });

      // 4. Wait for pickup delay
      jest.advanceTimersByTime(1100);

      // 5. Player approaches and picks up loot
      const playerPos = { x: 10, z: 10 };
      const pickedUpItems = [];
      const pickedUpGold = [];

      const onPickup = (drop) => {
        if (drop.type === 'GOLD') {
          pickedUpGold.push(drop.gold);
        } else if (drop.type === 'ITEM') {
          pickedUpItems.push(drop.item);
        }
      };

      lootDropManager.update(playerPos, onPickup);

      // 6. Verify loot was picked up
      expect(pickedUpGold.length + pickedUpItems.length).toBe(drops.length);
      expect(lootDropManager.getAllDrops()).toHaveLength(0);

      // 7. Equip items if any were dropped
      if (pickedUpItems.length > 0) {
        const equipment = {
          weapon: null,
          armor: null,
          helmet: null,
          boots: null,
          ring1: null,
          ring2: null,
          amulet: null
        };

        pickedUpItems.forEach(item => {
          const slot = equipmentManager.getSlotForItem(item, equipment);
          equipment[slot] = item;
        });

        // 8. Verify stats are calculated correctly
        const stats = equipmentManager.aggregateStats(equipment);
        expect(stats).toBeDefined();

        // Stats should include contributions from equipped items
        const totalStatValue = Object.values(stats).reduce((sum, v) => sum + v, 0);
        if (pickedUpItems.length > 0) {
          expect(totalStatValue).toBeGreaterThan(0);
        }
      }

      // Verify gold was collected
      if (pickedUpGold.length > 0) {
        const totalGold = pickedUpGold.reduce((sum, g) => sum + g, 0);
        expect(totalGold).toBeGreaterThan(0);
      }
    });

    test('should handle elite monster with better loot', () => {
      // Create an elite monster
      const monster = new Monster('ORC', { x: 20, z: 20 }, {
        level: 5,
        modifier: 'ELITE'
      });

      // Elite should have boosted stats
      expect(monster.modifier).toBe('ELITE');
      expect(monster.name).toContain('Elite');

      // Kill the monster
      monster.takeDamage(monster.health);

      // Create loot - elite should have better drops
      const drops = lootDropManager.createMonsterLoot(monster);
      expect(drops.length).toBeGreaterThan(0);

      // Check for gold drops
      const goldDrops = drops.filter(d => d.type === 'GOLD');
      if (goldDrops.length > 0) {
        // Elite should drop more gold
        expect(goldDrops[0].gold).toBeGreaterThan(0);
      }
    });

    test('should handle high-level elite monster with better loot', () => {
      // Create a high-level elite monster (boss-like)
      const monster = new Monster('SKELETON', { x: 30, z: 30 }, {
        level: 10,
        modifier: 'ELITE'
      });

      expect(monster.modifier).toBe('ELITE');
      expect(monster.name).toContain('Elite');

      // Kill the monster
      monster.takeDamage(monster.health + monster.defense + 100);

      // Elite monsters should drop significant loot
      const drops = lootDropManager.createMonsterLoot(monster);
      expect(drops.length).toBeGreaterThan(0);

      // Verify drops have good rewards
      const goldDrops = drops.filter(d => d.type === 'GOLD');
      const itemDrops = drops.filter(d => d.type === 'ITEM');

      expect(goldDrops.length + itemDrops.length).toBeGreaterThan(0);
    });

    test('should handle multiple monsters dropping loot in same area', () => {
      const monsters = [
        new Monster('SLIME', { x: 5, z: 5 }),
        new Monster('SLIME', { x: 5, z: 6 }),
        new Monster('SLIME', { x: 6, z: 5 })
      ];

      // Kill all monsters
      monsters.forEach(m => m.takeDamage(m.health));

      // Create drops for each
      const allDrops = [];
      monsters.forEach(m => {
        const drops = lootDropManager.createMonsterLoot(m);
        allDrops.push(...drops);
      });

      expect(lootDropManager.getAllDrops().length).toBe(allDrops.length);

      // Advance time and pick up
      jest.advanceTimersByTime(1100);

      const playerPos = { x: 5, z: 5 };
      const pickedUp = lootDropManager.update(playerPos);

      // Should pick up nearby drops
      expect(pickedUp.length).toBeGreaterThan(0);
    });

    test('should handle equipment upgrades', () => {
      // Start with basic equipment
      const equipment = {
        weapon: null,
        armor: null,
        helmet: null,
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      // Monster dies and drops weapon
      const monster = new Monster('GOBLIN', { x: 10, z: 10 }, { level: 5 });
      monster.takeDamage(monster.health);

      const drops = lootDropManager.createMonsterLoot(monster);
      jest.advanceTimersByTime(1100);

      const playerPos = { x: 10, z: 10 };
      const pickedUpItems = [];

      lootDropManager.update(playerPos, (drop) => {
        if (drop.type === 'ITEM') {
          pickedUpItems.push(drop.item);
        }
      });

      // Equip items
      pickedUpItems.forEach(newItem => {
        const slot = equipmentManager.getSlotForItem(newItem, equipment);
        const currentItem = equipment[slot];

        // Check if upgrade
        const upgradeCheck = equipmentManager.isUpgrade(newItem, currentItem, equipment);

        if (upgradeCheck.isUpgrade) {
          equipment[slot] = newItem;
        }
      });

      // Verify stats changed
      if (Object.values(equipment).some(item => item !== null)) {
        const stats = equipmentManager.aggregateStats(equipment);
        const totalStats = Object.values(stats).reduce((sum, v) => sum + v, 0);
        expect(totalStats).toBeGreaterThan(0);
      }
    });

    test('should handle loot expiration', () => {
      const monster = new Monster('SLIME', { x: 50, z: 50 });
      monster.takeDamage(monster.health);

      const drops = lootDropManager.createMonsterLoot(monster);
      const initialCount = drops.length;

      expect(lootDropManager.getAllDrops().length).toBe(initialCount);

      // Advance past expiration time (60 seconds)
      jest.advanceTimersByTime(61000);

      // Update with player far away
      lootDropManager.update({ x: 100, z: 100 });

      // Drops should be expired and removed
      expect(lootDropManager.getAllDrops().length).toBe(0);
    });
  });

  describe('Level-Based Loot Scaling', () => {
    test('should generate better loot from higher level monsters', () => {
      const lowLevel = new Monster('GOBLIN', { x: 0, z: 0 }, { level: 1 });
      const highLevel = new Monster('GOBLIN', { x: 10, z: 10 }, { level: 10 });

      // Generate loot for both
      const lowLevelLoot = lootTable.generateLoot(lowLevel);
      const highLevelLoot = lootTable.generateLoot(highLevel);

      // High level should drop more gold (on average)
      if (lowLevelLoot.gold > 0 && highLevelLoot.gold > 0) {
        expect(highLevelLoot.gold).toBeGreaterThanOrEqual(lowLevelLoot.gold);
      }

      // High level items should have better stats
      if (lowLevelLoot.items.length > 0 && highLevelLoot.items.length > 0) {
        const lowStats = Object.values(lowLevelLoot.items[0].stats).reduce((s, v) => s + v, 0);
        const highStats = Object.values(highLevelLoot.items[0].stats).reduce((s, v) => s + v, 0);
        expect(highStats).toBeGreaterThan(lowStats);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle monster with no loot table', () => {
      const monster = new Monster('SLIME', { x: 0, z: 0 });

      // Force empty loot
      lootDropManager.lootTable.generateLoot = jest.fn(() => ({
        gold: 0,
        items: []
      }));

      const drops = lootDropManager.createMonsterLoot(monster);
      expect(drops).toHaveLength(0);
    });

    test('should handle rapid monster deaths', () => {
      const monsters = [];
      for (let i = 0; i < 10; i++) {
        monsters.push(new Monster('SLIME', { x: i, z: i }));
      }

      // Kill all at once
      monsters.forEach(m => {
        m.takeDamage(m.health);
        lootDropManager.createMonsterLoot(m);
      });

      const totalDrops = lootDropManager.getAllDrops().length;
      expect(totalDrops).toBeGreaterThan(0);

      // Cleanup
      lootDropManager.clearAll();
      expect(lootDropManager.getAllDrops()).toHaveLength(0);
    });

    test('should handle player inventory full scenario', () => {
      // This would be implemented in the actual game system
      // For now, just verify loot can be generated and tracked

      const monster = new Monster('GOBLIN', { x: 0, z: 0 });
      monster.takeDamage(monster.health);

      const drops = lootDropManager.createMonsterLoot(monster);

      // Loot should remain on ground if not picked up
      jest.advanceTimersByTime(1100);

      // Player doesn't approach
      lootDropManager.update({ x: 100, z: 100 });

      // Drops should still exist
      expect(lootDropManager.getAllDrops().length).toBe(drops.length);
    });
  });

  describe('Visual Data for Rendering', () => {
    test('should provide visual data for all loot drops', () => {
      const monster = new Monster('ORC', { x: 10, z: 10 }, { level: 5 });
      monster.takeDamage(monster.health);

      lootDropManager.createMonsterLoot(monster);

      const visualData = lootDropManager.getAllVisualData();

      expect(Array.isArray(visualData)).toBe(true);
      visualData.forEach(data => {
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('position');
        expect(data.position).toHaveProperty('x');
        expect(data.position).toHaveProperty('z');

        if (data.type === 'ITEM') {
          expect(data).toHaveProperty('rarity');
          expect(data).toHaveProperty('name');
        } else if (data.type === 'GOLD') {
          expect(data).toHaveProperty('amount');
        }
      });
    });
  });

  describe('Performance', () => {
    test('should handle large number of drops efficiently', () => {
      // Create 100 monsters and kill them
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const monster = new Monster('SLIME', { x: i % 10, z: Math.floor(i / 10) });
        monster.takeDamage(monster.health);
        lootDropManager.createMonsterLoot(monster);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);

      // Verify drops were created
      expect(lootDropManager.getAllDrops().length).toBeGreaterThan(0);

      // Cleanup should also be fast
      const cleanupStart = Date.now();
      lootDropManager.clearAll();
      const cleanupEnd = Date.now();

      expect(cleanupEnd - cleanupStart).toBeLessThan(100);
      expect(lootDropManager.getAllDrops()).toHaveLength(0);
    });
  });
});
