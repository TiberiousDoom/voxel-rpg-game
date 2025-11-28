/**
 * EquipmentManager.test.js - Tests for equipment and stat aggregation
 *
 * Tests:
 * - Stat aggregation from equipment
 * - Property effect calculation
 * - Upgrade detection
 * - Slot management
 * - Equipment validation
 */

import { EquipmentManager, getSlotForItemType } from '../EquipmentManager';
import { Item } from '../../entities/Item';

describe('EquipmentManager', () => {
  let manager;

  beforeEach(() => {
    manager = new EquipmentManager();
  });

  describe('Stat Aggregation', () => {
    test('should aggregate stats from all equipment', () => {
      const equipment = {
        weapon: new Item({
          type: 'WEAPON',
          stats: { damage: 50 }
        }),
        armor: new Item({
          type: 'ARMOR',
          stats: { armor: 30 }
        }),
        helmet: new Item({
          type: 'HELMET',
          stats: { armor: 15, health: 50 }
        }),
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      const stats = manager.aggregateStats(equipment);

      expect(stats.damage).toBe(50);
      expect(stats.armor).toBe(45); // 30 + 15
      expect(stats.health).toBe(50);
    });

    test('should handle empty equipment', () => {
      const equipment = {
        weapon: null,
        armor: null,
        helmet: null,
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      const stats = manager.aggregateStats(equipment);

      expect(stats.damage).toBe(0);
      expect(stats.armor).toBe(0);
      expect(stats.health).toBe(0);
    });

    test('should aggregate property bonuses', () => {
      const equipment = {
        weapon: new Item({
          type: 'WEAPON',
          stats: { damage: 50 },
          properties: [
            { name: 'Critical Strike', value: 15 },
            { name: 'Haste', value: 20 }
          ]
        }),
        armor: null,
        helmet: null,
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      const stats = manager.aggregateStats(equipment);

      expect(stats.damage).toBe(50);
      expect(stats.critChance).toBe(15);
      expect(stats.attackSpeed).toBe(20);
    });

    test('should stack stats from multiple items', () => {
      const equipment = {
        weapon: new Item({
          stats: { damage: 30 },
          properties: [{ name: 'Critical Strike', value: 10 }]
        }),
        armor: null,
        helmet: null,
        boots: null,
        ring1: new Item({
          stats: { damage: 5 },
          properties: [{ name: 'Critical Strike', value: 8 }]
        }),
        ring2: new Item({
          stats: { damage: 5 },
          properties: [{ name: 'Critical Power', value: 25 }]
        }),
        amulet: null
      };

      const stats = manager.aggregateStats(equipment);

      expect(stats.damage).toBe(40); // 30 + 5 + 5
      expect(stats.critChance).toBe(18); // 10 + 8
      expect(stats.critDamage).toBe(25);
    });
  });

  describe('Property Effects', () => {
    test('should convert Vitality to health', () => {
      const prop = { name: 'Vitality', value: 100 };
      const bonus = manager.getStatBonusFromProperty(prop);

      expect(bonus.health).toBe(100);
    });

    test('should convert Wisdom to mana', () => {
      const prop = { name: 'Wisdom', value: 50 };
      const bonus = manager.getStatBonusFromProperty(prop);

      expect(bonus.mana).toBe(50);
    });

    test('should handle all property types', () => {
      const properties = [
        { name: 'Swiftness', value: 15, expectedStat: 'speed' },
        { name: 'Haste', value: 20, expectedStat: 'attackSpeed' },
        { name: 'Critical Strike', value: 10, expectedStat: 'critChance' },
        { name: 'Critical Power', value: 30, expectedStat: 'critDamage' },
        { name: 'Penetration', value: 12, expectedStat: 'armorPenetration' },
        { name: 'Fortitude', value: 5, expectedStat: 'damageReduction' },
        { name: 'Regeneration', value: 8, expectedStat: 'healthRegen' }
      ];

      properties.forEach(({ name, value, expectedStat }) => {
        const bonus = manager.getStatBonusFromProperty({ name, value });
        expect(bonus[expectedStat]).toBe(value);
      });
    });

    test('should return null for non-stat properties', () => {
      const prop = { name: 'Lifesteal', value: 10 };
      const bonus = manager.getStatBonusFromProperty(prop);

      expect(bonus).toBeNull();
    });

    test('should return null for unknown properties', () => {
      const prop = { name: 'UnknownProp', value: 100 };
      const bonus = manager.getStatBonusFromProperty(prop);

      expect(bonus).toBeNull();
    });
  });

  describe('Special Properties', () => {
    test('should collect all special properties', () => {
      const equipment = {
        weapon: new Item({
          properties: [
            { name: 'Lifesteal', value: 10 },
            { name: 'Critical Strike', value: 15 }
          ]
        }),
        armor: null,
        helmet: null,
        boots: null,
        ring1: new Item({
          properties: [
            { name: 'Gold Find', value: 20 }
          ]
        }),
        ring2: null,
        amulet: null
      };

      const props = manager.getSpecialProperties(equipment);

      expect(props).toHaveLength(3);
      expect(props).toContainEqual({ name: 'Lifesteal', value: 10 });
      expect(props).toContainEqual({ name: 'Critical Strike', value: 15 });
      expect(props).toContainEqual({ name: 'Gold Find', value: 20 });
    });

    test('should stack duplicate properties', () => {
      const equipment = {
        weapon: new Item({
          properties: [{ name: 'Lifesteal', value: 10 }]
        }),
        armor: null,
        helmet: null,
        boots: null,
        ring1: new Item({
          properties: [{ name: 'Lifesteal', value: 5 }]
        }),
        ring2: null,
        amulet: null
      };

      const props = manager.getSpecialProperties(equipment);

      expect(props).toHaveLength(1);
      expect(props[0]).toEqual({ name: 'Lifesteal', value: 15 });
    });
  });

  describe('Upgrade Detection', () => {
    test('should detect upgrade when new item is better', () => {
      const currentItem = new Item({
        type: 'WEAPON',
        stats: { damage: 30 }
      });

      const newItem = new Item({
        type: 'WEAPON',
        stats: { damage: 50 }
      });

      const equipment = { weapon: currentItem };
      const result = manager.isUpgrade(newItem, currentItem, equipment);

      expect(result.isUpgrade).toBe(true);
      expect(result.statDiff.damage).toBe(20);
    });

    test('should detect downgrade when new item is worse', () => {
      const currentItem = new Item({
        type: 'WEAPON',
        stats: { damage: 50 }
      });

      const newItem = new Item({
        type: 'WEAPON',
        stats: { damage: 30 }
      });

      const equipment = { weapon: currentItem };
      const result = manager.isUpgrade(newItem, currentItem, equipment);

      expect(result.isUpgrade).toBe(false);
      expect(result.statDiff.damage).toBe(-20);
    });

    test('should consider empty slot as always upgradable', () => {
      const newItem = new Item({
        type: 'WEAPON',
        stats: { damage: 30 }
      });

      const equipment = { weapon: null };
      const result = manager.isUpgrade(newItem, null, equipment);

      expect(result.isUpgrade).toBe(true);
      expect(result.statDiff.damage).toBe(30);
    });

    test('should handle multi-stat comparisons', () => {
      const currentItem = new Item({
        type: 'ARMOR',
        stats: { armor: 50, health: 100 }
      });

      const newItem = new Item({
        type: 'ARMOR',
        stats: { armor: 40, health: 150 } // Less armor, more health
      });

      const equipment = { armor: currentItem };
      const result = manager.isUpgrade(newItem, currentItem, equipment);

      expect(result.statDiff.armor).toBe(-10);
      expect(result.statDiff.health).toBe(50);
      // One positive, one negative = positive wins
      expect(result.isUpgrade).toBe(true);
    });
  });

  describe('Slot Management', () => {
    test('should get correct slot for item types', () => {
      expect(getSlotForItemType('WEAPON')).toBe('weapon');
      expect(getSlotForItemType('ARMOR')).toBe('armor');
      expect(getSlotForItemType('HELMET')).toBe('helmet');
      expect(getSlotForItemType('BOOTS')).toBe('boots');
      expect(getSlotForItemType('RING')).toBe('ring1');
      expect(getSlotForItemType('AMULET')).toBe('amulet');
    });

    test('should return null for unknown item type', () => {
      expect(getSlotForItemType('INVALID')).toBeNull();
    });

    test('should handle ring slot selection', () => {
      const ring = new Item({ type: 'RING' });

      // Both slots empty
      const equipment1 = { ring1: null, ring2: null };
      expect(manager.getSlotForItem(ring, equipment1)).toBe('ring1');

      // Ring1 occupied
      const equipment2 = { ring1: new Item({ type: 'RING' }), ring2: null };
      expect(manager.getSlotForItem(ring, equipment2)).toBe('ring2');

      // Both occupied (defaults to ring1)
      const equipment3 = {
        ring1: new Item({ type: 'RING' }),
        ring2: new Item({ type: 'RING' })
      };
      expect(manager.getSlotForItem(ring, equipment3)).toBe('ring1');
    });
  });

  describe('Equipment Validation', () => {
    test('should validate correct equipment', () => {
      const equipment = {
        weapon: new Item({ type: 'WEAPON' }),
        armor: new Item({ type: 'ARMOR' }),
        helmet: new Item({ type: 'HELMET' }),
        boots: new Item({ type: 'BOOTS' }),
        ring1: new Item({ type: 'RING' }),
        ring2: new Item({ type: 'RING' }),
        amulet: new Item({ type: 'AMULET' })
      };

      const errors = manager.validateEquipment(equipment);

      expect(errors).toHaveLength(0);
    });

    test('should detect items in wrong slots', () => {
      const equipment = {
        weapon: new Item({ type: 'ARMOR' }), // Wrong type!
        armor: null,
        helmet: null,
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      const errors = manager.validateEquipment(equipment);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('ARMOR');
      expect(errors[0]).toContain('weapon');
    });

    test('should validate ring slots', () => {
      const equipment = {
        weapon: null,
        armor: null,
        helmet: null,
        boots: null,
        ring1: new Item({ type: 'WEAPON' }), // Wrong type!
        ring2: null,
        amulet: null
      };

      const errors = manager.validateEquipment(equipment);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('WEAPON');
      expect(errors[0]).toContain('ring1');
    });
  });

  describe('Power Level', () => {
    test('should calculate total power level', () => {
      const equipment = {
        weapon: new Item({
          stats: { damage: 50 }
        }),
        armor: new Item({
          stats: { armor: 30, health: 100 }
        }),
        helmet: null,
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      const powerLevel = manager.getPowerLevel(equipment);

      expect(powerLevel).toBe(180); // 50 + 30 + 100
    });

    test('should return 0 for empty equipment', () => {
      const equipment = {
        weapon: null,
        armor: null,
        helmet: null,
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      const powerLevel = manager.getPowerLevel(equipment);

      expect(powerLevel).toBe(0);
    });
  });

  describe('Equipment Summary', () => {
    test('should generate complete summary', () => {
      const equipment = {
        weapon: new Item({
          type: 'WEAPON',
          stats: { damage: 50 },
          properties: [{ name: 'Lifesteal', value: 10 }]
        }),
        armor: new Item({
          type: 'ARMOR',
          stats: { armor: 30 }
        }),
        helmet: null,
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      const summary = manager.getSummary(equipment);

      expect(summary.equippedCount).toBe(2);
      expect(summary.totalSlots).toBe(7);
      expect(summary.emptySlots).toBe(5);
      expect(summary.stats.damage).toBe(50);
      expect(summary.stats.armor).toBe(30);
      expect(summary.powerLevel).toBe(80);
      expect(summary.specialProperties).toHaveLength(1);
    });

    test('should handle fully equipped setup', () => {
      const equipment = {
        weapon: new Item({ stats: { damage: 10 } }),
        armor: new Item({ stats: { armor: 10 } }),
        helmet: new Item({ stats: { armor: 10 } }),
        boots: new Item({ stats: { armor: 10 } }),
        ring1: new Item({ stats: { health: 20 } }),
        ring2: new Item({ stats: { health: 20 } }),
        amulet: new Item({ stats: { health: 30 } })
      };

      const summary = manager.getSummary(equipment);

      expect(summary.equippedCount).toBe(7);
      expect(summary.emptySlots).toBe(0);
      expect(summary.powerLevel).toBe(110);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null equipment object', () => {
      const stats = manager.aggregateStats({});

      expect(stats.damage).toBe(0);
    });

    test('should handle items with no stats', () => {
      const equipment = {
        weapon: new Item({ stats: {} }),
        armor: null,
        helmet: null,
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      const stats = manager.aggregateStats(equipment);

      expect(stats.damage).toBe(0);
    });

    test('should handle items with no properties', () => {
      const equipment = {
        weapon: new Item({ properties: [] }),
        armor: null,
        helmet: null,
        boots: null,
        ring1: null,
        ring2: null,
        amulet: null
      };

      const props = manager.getSpecialProperties(equipment);

      expect(props).toHaveLength(0);
    });
  });
});
