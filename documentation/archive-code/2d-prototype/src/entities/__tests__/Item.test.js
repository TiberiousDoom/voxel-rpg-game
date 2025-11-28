/**
 * Item.test.js - Unit tests for Item entity
 *
 * Tests:
 * - Item creation and initialization
 * - Stat management
 * - Property management
 * - Item comparison
 * - Serialization
 * - Rarity system
 */

import { Item } from '../Item';

describe('Item Entity', () => {
  describe('Item Creation', () => {
    test('should create item with default values', () => {
      const item = new Item();

      expect(item.id).toBeDefined();
      expect(item.name).toBe('Unknown Item');
      expect(item.type).toBe('WEAPON');
      expect(item.rarity).toBe('COMMON');
      expect(item.level).toBe(1);
      expect(item.stats).toEqual({});
      expect(item.properties).toEqual([]);
      expect(item.sellValue).toBe(0);
    });

    test('should create item with custom configuration', () => {
      const config = {
        name: 'Iron Sword',
        type: 'WEAPON',
        rarity: 'UNCOMMON',
        level: 5,
        stats: { damage: 25 },
        properties: [{ name: 'Lifesteal', value: 10 }],
        sellValue: 100
      };

      const item = new Item(config);

      expect(item.name).toBe('Iron Sword');
      expect(item.type).toBe('WEAPON');
      expect(item.rarity).toBe('UNCOMMON');
      expect(item.level).toBe(5);
      expect(item.stats.damage).toBe(25);
      expect(item.properties).toHaveLength(1);
      expect(item.sellValue).toBe(100);
    });

    test('should generate unique IDs', () => {
      const item1 = new Item();
      const item2 = new Item();

      expect(item1.id).not.toBe(item2.id);
    });

    test('should accept custom ID', () => {
      const customId = 'custom-item-123';
      const item = new Item({ id: customId });

      expect(item.id).toBe(customId);
    });
  });

  describe('Primary Stats', () => {
    test('should get primary stat for weapon', () => {
      const item = new Item({
        type: 'WEAPON',
        stats: { damage: 50 }
      });

      expect(item.getPrimaryStat()).toBe(50);
    });

    test('should get primary stat for armor', () => {
      const item = new Item({
        type: 'ARMOR',
        stats: { armor: 30 }
      });

      expect(item.getPrimaryStat()).toBe(30);
    });

    test('should return 0 for missing primary stat', () => {
      const item = new Item({
        type: 'WEAPON',
        stats: { armor: 10 }
      });

      expect(item.getPrimaryStat()).toBe(0);
    });

    test('should get primary stat for accessories', () => {
      const ring = new Item({
        type: 'RING',
        stats: { health: 100 }
      });

      expect(ring.getPrimaryStat()).toBe(100);
    });
  });

  describe('All Stats', () => {
    test('should get all stats as array', () => {
      const item = new Item({
        stats: {
          damage: 50,
          armor: 20,
          health: 100
        }
      });

      const allStats = item.getAllStats();

      expect(allStats).toHaveLength(3);
      expect(allStats).toContainEqual({ stat: 'damage', value: 50 });
      expect(allStats).toContainEqual({ stat: 'armor', value: 20 });
      expect(allStats).toContainEqual({ stat: 'health', value: 100 });
    });

    test('should return empty array for no stats', () => {
      const item = new Item();

      expect(item.getAllStats()).toEqual([]);
    });
  });

  describe('Properties', () => {
    test('should check if item has property', () => {
      const item = new Item({
        properties: [
          { name: 'Lifesteal', value: 10 },
          { name: 'Critical Strike', value: 15 }
        ]
      });

      expect(item.hasProperty('Lifesteal')).toBe(true);
      expect(item.hasProperty('Critical Strike')).toBe(true);
      expect(item.hasProperty('Thorns')).toBe(false);
    });

    test('should get property value', () => {
      const item = new Item({
        properties: [
          { name: 'Lifesteal', value: 10 },
          { name: 'Gold Find', value: 25 }
        ]
      });

      expect(item.getPropertyValue('Lifesteal')).toBe(10);
      expect(item.getPropertyValue('Gold Find')).toBe(25);
      expect(item.getPropertyValue('Unknown')).toBeNull();
    });

    test('should return null for non-existent property', () => {
      const item = new Item();

      expect(item.getPropertyValue('Lifesteal')).toBeNull();
    });
  });

  describe('Item Comparison', () => {
    test('should compare items of same type by primary stat', () => {
      const item1 = new Item({
        type: 'WEAPON',
        stats: { damage: 50 }
      });

      const item2 = new Item({
        type: 'WEAPON',
        stats: { damage: 30 }
      });

      expect(item1.compareWith(item2)).toBeGreaterThan(0);
      expect(item2.compareWith(item1)).toBeLessThan(0);
    });

    test('should compare item with null', () => {
      const item = new Item({
        type: 'WEAPON',
        stats: { damage: 50 }
      });

      expect(item.compareWith(null)).toBe(1);
    });

    test('should return 0 for different item types', () => {
      const weapon = new Item({ type: 'WEAPON' });
      const armor = new Item({ type: 'ARMOR' });

      expect(weapon.compareWith(armor)).toBe(0);
    });

    test('should handle items with equal stats', () => {
      const item1 = new Item({
        type: 'WEAPON',
        stats: { damage: 50 }
      });

      const item2 = new Item({
        type: 'WEAPON',
        stats: { damage: 50 }
      });

      expect(item1.compareWith(item2)).toBe(0);
    });
  });

  describe('Rarity Colors', () => {
    test('should return correct color for each rarity', () => {
      expect(new Item({ rarity: 'COMMON' }).getRarityColor()).toBe('#ffffff');
      expect(new Item({ rarity: 'UNCOMMON' }).getRarityColor()).toBe('#00ff00');
      expect(new Item({ rarity: 'RARE' }).getRarityColor()).toBe('#0088ff');
      expect(new Item({ rarity: 'EPIC' }).getRarityColor()).toBe('#aa00ff');
      expect(new Item({ rarity: 'LEGENDARY' }).getRarityColor()).toBe('#ff8800');
    });

    test('should return common color for unknown rarity', () => {
      const item = new Item({ rarity: 'UNKNOWN' });

      expect(item.getRarityColor()).toBe('#ffffff');
    });
  });

  describe('Description', () => {
    test('should generate item description', () => {
      const item = new Item({
        name: 'Iron Sword',
        type: 'WEAPON',
        rarity: 'RARE',
        level: 5,
        stats: { damage: 50 },
        properties: [
          {
            name: 'Lifesteal',
            description: 'Heal for {value}% of damage dealt',
            value: 10
          }
        ],
        sellValue: 250
      });

      const description = item.getDescription();

      expect(description).toContain('Iron Sword (Level 5)');
      expect(description).toContain('RARE WEAPON');
      expect(description).toContain('+50 damage');
      expect(description).toContain('Heal for 10% of damage dealt');
      expect(description).toContain('Sell Value: 250 gold');
    });

    test('should handle item with no stats', () => {
      const item = new Item({
        name: 'Simple Ring',
        type: 'RING',
        rarity: 'COMMON',
        level: 1,
        sellValue: 10
      });

      const description = item.getDescription();

      expect(description).toContain('Simple Ring');
      expect(description).toContain('Sell Value: 10 gold');
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      const item = new Item({
        name: 'Test Item',
        type: 'WEAPON',
        rarity: 'RARE',
        level: 10,
        stats: { damage: 100 },
        properties: [{ name: 'Lifesteal', value: 15 }],
        sellValue: 500
      });

      const json = item.toJSON();

      expect(json.id).toBe(item.id);
      expect(json.name).toBe('Test Item');
      expect(json.type).toBe('WEAPON');
      expect(json.rarity).toBe('RARE');
      expect(json.level).toBe(10);
      expect(json.stats).toEqual({ damage: 100 });
      expect(json.properties).toEqual([{ name: 'Lifesteal', value: 15 }]);
      expect(json.sellValue).toBe(500);
    });

    test('should deserialize from JSON', () => {
      const json = {
        id: 'test-123',
        name: 'Test Item',
        type: 'ARMOR',
        rarity: 'EPIC',
        level: 15,
        stats: { armor: 200 },
        properties: [],
        sellValue: 1000,
        createdAt: 1234567890
      };

      const item = Item.fromJSON(json);

      expect(item.id).toBe('test-123');
      expect(item.name).toBe('Test Item');
      expect(item.type).toBe('ARMOR');
      expect(item.rarity).toBe('EPIC');
      expect(item.level).toBe(15);
      expect(item.stats.armor).toBe(200);
      expect(item.sellValue).toBe(1000);
    });

    test('should preserve data through serialize-deserialize cycle', () => {
      const original = new Item({
        name: 'Cycle Test',
        type: 'HELMET',
        rarity: 'LEGENDARY',
        level: 20,
        stats: { armor: 500, health: 200 },
        properties: [
          { name: 'Thorns', value: 20 },
          { name: 'Health Regen', value: 5 }
        ],
        sellValue: 5000
      });

      const json = original.toJSON();
      const restored = Item.fromJSON(json);

      expect(restored.name).toBe(original.name);
      expect(restored.type).toBe(original.type);
      expect(restored.rarity).toBe(original.rarity);
      expect(restored.level).toBe(original.level);
      expect(restored.stats).toEqual(original.stats);
      expect(restored.properties).toEqual(original.properties);
      expect(restored.sellValue).toBe(original.sellValue);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty stats object', () => {
      const item = new Item({ stats: {} });

      expect(item.getPrimaryStat()).toBe(0);
      expect(item.getAllStats()).toEqual([]);
    });

    test('should handle empty properties array', () => {
      const item = new Item({ properties: [] });

      expect(item.hasProperty('anything')).toBe(false);
      expect(item.getPropertyValue('anything')).toBeNull();
    });

    test('should handle null values gracefully', () => {
      const item = new Item({
        name: null,
        iconPath: null
      });

      expect(item.name).toBe('Unknown Item');
      expect(item.iconPath).toBeNull();
    });

    test('should handle very high levels', () => {
      const item = new Item({ level: 9999 });

      expect(item.level).toBe(9999);
    });

    test('should handle negative sell values', () => {
      const item = new Item({ sellValue: -100 });

      expect(item.sellValue).toBe(-100);
    });
  });
});
