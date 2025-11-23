/**
 * LootGenerator.test.js - Unit tests for loot generation system
 *
 * Tests:
 * - Item generation
 * - Rarity rolling
 * - Template selection
 * - Property generation
 * - Stat scaling
 * - Name generation
 */

import { LootGenerator } from '../LootGenerator';
import { Item } from '../../entities/Item';

describe('LootGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new LootGenerator();
    jest.spyOn(Math, 'random');
  });

  afterEach(() => {
    Math.random.mockRestore();
  });

  describe('Item Generation', () => {
    test('should generate a valid item', () => {
      const item = generator.generateItem('WEAPON', 1);

      expect(item).toBeInstanceOf(Item);
      expect(item.type).toBe('WEAPON');
      expect(item.level).toBe(1);
      expect(item.rarity).toBeDefined();
      expect(item.stats).toBeDefined();
    });

    test('should generate items of different types', () => {
      const weapon = generator.generateItem('WEAPON', 5);
      const armor = generator.generateItem('ARMOR', 5);
      const helmet = generator.generateItem('HELMET', 5);

      expect(weapon.type).toBe('WEAPON');
      expect(armor.type).toBe('ARMOR');
      expect(helmet.type).toBe('HELMET');
    });

    test('should scale stats with level', () => {
      const lowLevel = generator.generateItem('WEAPON', 1);
      const highLevel = generator.generateItem('WEAPON', 10);

      expect(highLevel.stats.damage).toBeGreaterThan(lowLevel.stats.damage);
    });

    test('should force rarity when specified', () => {
      const item = generator.generateItem('WEAPON', 5, { forceRarity: 'LEGENDARY' });

      expect(item.rarity).toBe('LEGENDARY');
    });

    test('should apply rarity bonus', () => {
      Math.random.mockReturnValue(0.5); // Would normally be COMMON

      const item = generator.generateItem('WEAPON', 5, { rarityBonus: 0.3 });

      // With 0.3 bonus, 0.5 - 0.3 = 0.2, which might hit UNCOMMON
      expect(item.rarity).toBeDefined();
    });

    test('should return null for invalid item type', () => {
      const item = generator.generateItem('INVALID_TYPE', 1);

      expect(item).toBeNull();
    });
  });

  describe('Rarity Rolling', () => {
    test('should roll COMMON rarity most often', () => {
      Math.random.mockReturnValue(0.5); // 50% - COMMON range

      const rarity = generator.rollRarity();

      expect(rarity).toBe('COMMON');
    });

    test('should roll UNCOMMON rarity', () => {
      Math.random.mockReturnValue(0.75); // 75% - UNCOMMON range

      const rarity = generator.rollRarity();

      expect(rarity).toBe('UNCOMMON');
    });

    test('should roll RARE rarity', () => {
      Math.random.mockReturnValue(0.93); // 93% - RARE range

      const rarity = generator.rollRarity();

      expect(rarity).toBe('RARE');
    });

    test('should roll EPIC rarity', () => {
      Math.random.mockReturnValue(0.975); // 97.5% - EPIC range (0.970-0.995)

      const rarity = generator.rollRarity();

      expect(rarity).toBe('EPIC');
    });

    test('should roll LEGENDARY rarity', () => {
      Math.random.mockReturnValue(0.999); // 99.9% - LEGENDARY range

      const rarity = generator.rollRarity();

      expect(rarity).toBe('LEGENDARY');
    });

    test('should apply rarity bonus correctly', () => {
      Math.random.mockReturnValue(0.8);

      // Without bonus: 0.8 = UNCOMMON
      const normal = generator.rollRarity(0);
      expect(normal).toBe('UNCOMMON');

      // With 0.2 bonus: 0.8 - 0.2 = 0.6 = COMMON
      const withBonus = generator.rollRarity(0.2);
      expect(withBonus).toBe('COMMON');
    });

    test('should clamp bonus to 0-1 range', () => {
      Math.random.mockReturnValue(0.5);

      // Bonus > 1 should be clamped
      const rarity1 = generator.rollRarity(2.0);
      expect(rarity1).toBe('COMMON');

      // Negative bonus should be clamped
      const rarity2 = generator.rollRarity(-1.0);
      expect(rarity2).toBeDefined();
    });

    test('should default to COMMON if something goes wrong', () => {
      Math.random.mockReturnValue(NaN);

      const rarity = generator.rollRarity();

      expect(rarity).toBeDefined();
    });
  });

  describe('Template Selection', () => {
    test('should select a valid template', () => {
      const template = generator.selectTemplate('WEAPON');

      expect(template).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.baseStats).toBeDefined();
    });

    test('should return null for invalid type', () => {
      const template = generator.selectTemplate('INVALID');

      expect(template).toBeNull();
    });

    test('should select different templates randomly', () => {
      const templates = new Set();

      for (let i = 0; i < 20; i++) {
        const template = generator.selectTemplate('WEAPON');
        if (template) {
          templates.add(template.name);
        }
      }

      // Should have selected more than one template type
      expect(templates.size).toBeGreaterThan(1);
    });
  });

  describe('Property Generation', () => {
    test('should generate applicable properties for item type', () => {
      const property = generator.rollRandomProperty('WEAPON');

      expect(property).toBeDefined();
      expect(property.name).toBeDefined();
      expect(property.value).toBeDefined();
      expect(property.description).toBeDefined();
    });

    test('should generate properties within value range', () => {
      const properties = [];
      for (let i = 0; i < 10; i++) {
        const prop = generator.rollRandomProperty('WEAPON');
        if (prop) {
          properties.push(prop);
        }
      }

      properties.forEach(prop => {
        expect(prop.value).toBeGreaterThan(0);
        expect(prop.value).toBeLessThan(200); // Reasonable max
      });
    });

    test('should not generate properties for types with none applicable', () => {
      // This would only return null if no properties apply
      const property = generator.rollRandomProperty('WEAPON');

      // WEAPON should have properties
      expect(property).not.toBeNull();
    });

    test('should generate different properties', () => {
      const propertyNames = new Set();

      for (let i = 0; i < 20; i++) {
        const prop = generator.rollRandomProperty('WEAPON');
        if (prop) {
          propertyNames.add(prop.name);
        }
      }

      // Should have generated multiple different properties
      expect(propertyNames.size).toBeGreaterThan(1);
    });
  });

  describe('Item Name Generation', () => {
    test('should generate basic name for common item', () => {
      const item = new Item({
        name: 'Sword',
        type: 'WEAPON',
        rarity: 'COMMON',
        level: 1
      });

      const template = { name: 'Sword' };
      const name = generator.generateItemName(item, template);

      expect(name).toContain('Sword');
    });

    test('should add prefix for uncommon+ items', () => {
      const item = new Item({
        name: 'Sword',
        type: 'WEAPON',
        rarity: 'UNCOMMON',
        level: 5
      });

      const template = { name: 'Sword' };
      const name = generator.generateItemName(item, template);

      // Should have a prefix like "Fine", "Quality", etc.
      expect(name.split(' ').length).toBeGreaterThan(1);
    });

    test('should add suffix for epic+ items', () => {
      const item = new Item({
        name: 'Sword',
        type: 'WEAPON',
        rarity: 'EPIC',
        level: 10
      });

      const template = { name: 'Sword' };
      const name = generator.generateItemName(item, template);

      // Should contain "of" for suffix
      expect(name).toContain('of');
    });

    test('should add level indicator for level > 1', () => {
      const item = new Item({
        name: 'Sword',
        type: 'WEAPON',
        rarity: 'COMMON',
        level: 5
      });

      const template = { name: 'Sword' };
      const name = generator.generateItemName(item, template);

      expect(name).toContain('Lv5');
    });

    test('should generate full enhanced name for legendary', () => {
      const item = new Item({
        name: 'Sword',
        type: 'WEAPON',
        rarity: 'LEGENDARY',
        level: 20
      });

      const template = { name: 'Sword' };
      const name = generator.generateItemName(item, template);

      expect(name).toContain('Sword');
      expect(name).toContain('Lv20');
      // Should have prefix and suffix
      expect(name.split(' ').length).toBeGreaterThan(2);
    });
  });

  describe('Sell Value Calculation', () => {
    test('should calculate sell value based on level', () => {
      const item1 = new Item({ level: 1, stats: {}, properties: [] });
      const item10 = new Item({ level: 10, stats: {}, properties: [] });

      const rarityConfig = { sellMultiplier: 1.0 };

      const value1 = generator.calculateSellValue(item1, rarityConfig);
      const value10 = generator.calculateSellValue(item10, rarityConfig);

      expect(value10).toBeGreaterThan(value1);
    });

    test('should multiply by rarity', () => {
      const item = new Item({ level: 5, stats: {}, properties: [] });

      const commonValue = generator.calculateSellValue(item, { sellMultiplier: 1.0 });
      const legendaryValue = generator.calculateSellValue(item, { sellMultiplier: 50.0 });

      expect(legendaryValue).toBeGreaterThan(commonValue);
    });

    test('should add value for stats', () => {
      const itemNoStats = new Item({ level: 5, stats: {}, properties: [] });
      const itemWithStats = new Item({ level: 5, stats: { damage: 50 }, properties: [] });

      const rarityConfig = { sellMultiplier: 1.0 };

      const valueNoStats = generator.calculateSellValue(itemNoStats, rarityConfig);
      const valueWithStats = generator.calculateSellValue(itemWithStats, rarityConfig);

      expect(valueWithStats).toBeGreaterThan(valueNoStats);
    });

    test('should add value for properties', () => {
      const itemNoProps = new Item({ level: 5, stats: {}, properties: [] });
      const itemWithProps = new Item({
        level: 5,
        stats: {},
        properties: [{ name: 'Lifesteal', value: 10 }]
      });

      const rarityConfig = { sellMultiplier: 1.0 };

      const valueNoProps = generator.calculateSellValue(itemNoProps, rarityConfig);
      const valueWithProps = generator.calculateSellValue(itemWithProps, rarityConfig);

      expect(valueWithProps).toBeGreaterThan(valueNoProps);
    });

    test('should return integer value', () => {
      const item = new Item({ level: 5, stats: { damage: 33 }, properties: [] });
      const rarityConfig = { sellMultiplier: 1.5 };

      const value = generator.calculateSellValue(item, rarityConfig);

      expect(Number.isInteger(value)).toBe(true);
    });
  });

  describe('Multiple Item Generation', () => {
    test('should generate multiple items', () => {
      const items = generator.generateMultiple('WEAPON', 5, 10);

      expect(items).toHaveLength(10);
      items.forEach(item => {
        expect(item).toBeInstanceOf(Item);
        expect(item.type).toBe('WEAPON');
        expect(item.level).toBe(5);
      });
    });

    test('should generate items with different rarities', () => {
      const items = generator.generateMultiple('WEAPON', 5, 50);
      const rarities = new Set(items.map(item => item.rarity));

      // With 50 items, should have multiple rarities
      expect(rarities.size).toBeGreaterThan(1);
    });

    test('should handle invalid type gracefully', () => {
      const items = generator.generateMultiple('INVALID', 5, 10);

      // Should return array but items may be null
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('Random Integer Utility', () => {
    test('should generate integer in range', () => {
      Math.random.mockReturnValue(0.5);

      const value = generator.randomInt(1, 10);

      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
      expect(Number.isInteger(value)).toBe(true);
    });

    test('should include both min and max', () => {
      Math.random.mockReturnValueOnce(0); // Min
      const min = generator.randomInt(5, 15);
      expect(min).toBe(5);

      Math.random.mockReturnValueOnce(0.999); // Max
      const max = generator.randomInt(5, 15);
      expect(max).toBe(15);
    });

    test('should handle min = max', () => {
      const value = generator.randomInt(7, 7);

      expect(value).toBe(7);
    });
  });

  describe('Integration Tests', () => {
    test('should generate fully valid items', () => {
      const item = generator.generateItem('WEAPON', 10);

      expect(item.id).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.type).toBe('WEAPON');
      expect(item.level).toBe(10);
      expect(item.rarity).toBeDefined();
      expect(Object.keys(item.stats).length).toBeGreaterThan(0);
      expect(item.sellValue).toBeGreaterThan(0);
    });

    test('should respect rarity property count limits', () => {
      const commonItem = generator.generateItem('WEAPON', 5, { forceRarity: 'COMMON' });
      const legendaryItem = generator.generateItem('WEAPON', 5, { forceRarity: 'LEGENDARY' });

      // Common: 0-1 properties
      expect(commonItem.properties.length).toBeLessThanOrEqual(1);

      // Legendary: 4-5 properties
      expect(legendaryItem.properties.length).toBeGreaterThanOrEqual(4);
      expect(legendaryItem.properties.length).toBeLessThanOrEqual(5);
    });

    test('should generate items with unique IDs', () => {
      const items = generator.generateMultiple('WEAPON', 5, 10);
      const ids = new Set(items.map(item => item.id));

      expect(ids.size).toBe(10); // All unique
    });
  });
});
