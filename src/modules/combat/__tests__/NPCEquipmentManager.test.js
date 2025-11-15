/**
 * NPCEquipmentManager.test.js - Tests for NPC equipment system
 */
import NPCEquipmentManager from '../NPCEquipmentManager.js';

describe('NPCEquipmentManager', () => {
  let equipmentManager, mockNPC, mockInventory;

  beforeEach(() => {
    // Mock shared inventory
    mockInventory = {
      equipment: [],
      addEquipment: jest.fn((item) => {
        mockInventory.equipment.push(item);
        return item.id;
      }),
      removeItem: jest.fn((category, itemId) => {
        const index = mockInventory.equipment.findIndex(i => i.id === itemId);
        if (index >= 0) {
          mockInventory.equipment.splice(index, 1);
          return true;
        }
        return false;
      })
    };

    equipmentManager = new NPCEquipmentManager(mockInventory);

    // Create a mock NPC
    mockNPC = {
      id: 'npc1',
      name: 'Test NPC',
      combatLevel: 3,
      combatStats: {
        health: { current: 100, max: 100 },
        damage: 10,
        defense: 0,
        speed: 3,
        critChance: 5,
        critDamage: 150,
        dodgeChance: 5
      },
      equipment: {
        weapon: null,
        armor: null,
        accessory: null
      }
    };
  });

  describe('equipItem', () => {
    test('equips weapon successfully', () => {
      const weapon = {
        id: 'weapon1',
        name: 'Iron Sword',
        type: 'weapon',
        tier: 1,
        damage: 15,
        value: 100,
        durability: { current: 50, max: 50 }
      };

      const result = equipmentManager.equipItem(mockNPC, weapon, 'weapon');

      expect(result.success).toBe(true);
      expect(result.unequipped).toBeNull();
      expect(mockNPC.equipment.weapon).toBe(weapon);
      expect(mockNPC.combatStats.damage).toBe(25); // 10 + 15
    });

    test('equips armor successfully', () => {
      const armor = {
        id: 'armor1',
        name: 'Leather Armor',
        type: 'armor',
        tier: 1,
        defense: 5,
        healthBonus: 20,
        value: 150
      };

      const result = equipmentManager.equipItem(mockNPC, armor, 'armor');

      expect(result.success).toBe(true);
      expect(mockNPC.equipment.armor).toBe(armor);
      expect(mockNPC.combatStats.defense).toBe(5);
      expect(mockNPC.combatStats.health.max).toBe(120); // 100 + 20
    });

    test('unequips previous item when equipping new one', () => {
      const weapon1 = {
        id: 'weapon1',
        name: 'Iron Sword',
        type: 'weapon',
        tier: 1,
        damage: 15
      };

      const weapon2 = {
        id: 'weapon2',
        name: 'Steel Sword',
        type: 'weapon',
        tier: 2,
        damage: 25
      };

      equipmentManager.equipItem(mockNPC, weapon1, 'weapon');
      const result = equipmentManager.equipItem(mockNPC, weapon2, 'weapon');

      expect(result.success).toBe(true);
      expect(result.unequipped).toBe(weapon1);
      expect(mockNPC.equipment.weapon).toBe(weapon2);
      expect(mockNPC.combatStats.damage).toBe(35); // 10 + 25
      expect(mockInventory.addEquipment).toHaveBeenCalledWith(weapon1);
    });

    test('prevents equipping item in wrong slot', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 15
      };

      const result = equipmentManager.equipItem(mockNPC, weapon, 'armor');

      expect(result.success).toBe(false);
      expect(result.error).toContain("doesn't match slot");
    });

    test('prevents equipping item above NPC level', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 5,
        damage: 50
      };

      const result = equipmentManager.equipItem(mockNPC, weapon, 'weapon');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Requires combat level 5');
    });

    test('prevents equipping with invalid slot', () => {
      const item = {
        id: 'item1',
        type: 'weapon',
        tier: 1
      };

      const result = equipmentManager.equipItem(mockNPC, item, 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid slot');
    });

    test('applies all stat bonuses', () => {
      const accessory = {
        id: 'acc1',
        type: 'accessory',
        tier: 1,
        damage: 5,
        defense: 2,
        critChance: 10,
        critDamage: 25,
        dodgeChance: 5,
        healthBonus: 30,
        speedBonus: 0.5
      };

      equipmentManager.equipItem(mockNPC, accessory, 'accessory');

      expect(mockNPC.combatStats.damage).toBe(15);
      expect(mockNPC.combatStats.defense).toBe(2);
      expect(mockNPC.combatStats.critChance).toBe(15);
      expect(mockNPC.combatStats.critDamage).toBe(175);
      expect(mockNPC.combatStats.dodgeChance).toBe(10);
      expect(mockNPC.combatStats.health.max).toBe(130);
      expect(mockNPC.combatStats.speed).toBe(3.5);
    });
  });

  describe('unequipItem', () => {
    test('unequips item successfully', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 15
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      const result = equipmentManager.unequipItem(mockNPC, 'weapon');

      expect(result.success).toBe(true);
      expect(result.item).toBe(weapon);
      expect(mockNPC.equipment.weapon).toBeNull();
      expect(mockNPC.combatStats.damage).toBe(10);
      expect(mockInventory.addEquipment).toHaveBeenCalledWith(weapon);
    });

    test('fails when no item in slot', () => {
      const result = equipmentManager.unequipItem(mockNPC, 'weapon');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No item in slot');
    });

    test('removes all stat bonuses', () => {
      const armor = {
        id: 'armor1',
        type: 'armor',
        tier: 1,
        defense: 10,
        healthBonus: 50
      };

      equipmentManager.equipItem(mockNPC, armor, 'armor');
      equipmentManager.unequipItem(mockNPC, 'armor');

      expect(mockNPC.combatStats.defense).toBe(0);
      expect(mockNPC.combatStats.health.max).toBe(100);
    });
  });

  describe('getEquipmentBonuses', () => {
    test('returns zero bonuses with no equipment', () => {
      const bonuses = equipmentManager.getEquipmentBonuses(mockNPC);

      expect(bonuses.damage).toBe(0);
      expect(bonuses.defense).toBe(0);
      expect(bonuses.critChance).toBe(0);
      expect(bonuses.critDamage).toBe(0);
      expect(bonuses.dodgeChance).toBe(0);
      expect(bonuses.healthBonus).toBe(0);
      expect(bonuses.speedBonus).toBe(0);
    });

    test('calculates bonuses from single item', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 20,
        critChance: 5
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      const bonuses = equipmentManager.getEquipmentBonuses(mockNPC);

      expect(bonuses.damage).toBe(20);
      expect(bonuses.critChance).toBe(5);
    });

    test('sums bonuses from multiple items', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 20
      };

      const armor = {
        id: 'armor1',
        type: 'armor',
        tier: 1,
        defense: 10,
        healthBonus: 30
      };

      const accessory = {
        id: 'acc1',
        type: 'accessory',
        tier: 1,
        damage: 5,
        critChance: 10
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      equipmentManager.equipItem(mockNPC, armor, 'armor');
      equipmentManager.equipItem(mockNPC, accessory, 'accessory');

      const bonuses = equipmentManager.getEquipmentBonuses(mockNPC);

      expect(bonuses.damage).toBe(25);
      expect(bonuses.defense).toBe(10);
      expect(bonuses.healthBonus).toBe(30);
      expect(bonuses.critChance).toBe(10);
    });
  });

  describe('damageEquipment', () => {
    test('damages all equipped items', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 15,
        durability: { current: 50, max: 50 }
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      const brokenItems = equipmentManager.damageEquipment(mockNPC, 10);

      expect(weapon.durability.current).toBe(40);
      expect(brokenItems).toHaveLength(0);
    });

    test('unequips broken items', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 15,
        durability: { current: 5, max: 50 }
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      const brokenItems = equipmentManager.damageEquipment(mockNPC, 10);

      expect(brokenItems).toHaveLength(1);
      expect(brokenItems[0].slot).toBe('weapon');
      expect(brokenItems[0].item.id).toBe('weapon1');
      expect(mockNPC.equipment.weapon).toBeNull();
    });

    test('handles items without durability', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 15
        // No durability
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      const brokenItems = equipmentManager.damageEquipment(mockNPC, 10);

      expect(brokenItems).toHaveLength(0);
      expect(mockNPC.equipment.weapon).toBe(weapon);
    });

    test('damages multiple items at once', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 15,
        durability: { current: 50, max: 50 }
      };

      const armor = {
        id: 'armor1',
        type: 'armor',
        tier: 1,
        defense: 10,
        durability: { current: 3, max: 100 }
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      equipmentManager.equipItem(mockNPC, armor, 'armor');

      const brokenItems = equipmentManager.damageEquipment(mockNPC, 5);

      expect(weapon.durability.current).toBe(45);
      expect(brokenItems).toHaveLength(1);
      expect(brokenItems[0].item.id).toBe('armor1');
    });
  });

  describe('repairEquipment', () => {
    test('fully repairs item', () => {
      const item = {
        id: 'item1',
        durability: { current: 10, max: 50 }
      };

      const result = equipmentManager.repairEquipment(item);

      expect(result.success).toBe(true);
      expect(result.newDurability).toBe(50);
      expect(item.durability.current).toBe(50);
    });

    test('partially repairs item', () => {
      const item = {
        id: 'item1',
        durability: { current: 10, max: 50 }
      };

      const result = equipmentManager.repairEquipment(item, 20);

      expect(result.success).toBe(true);
      expect(result.newDurability).toBe(30);
    });

    test('does not exceed max durability', () => {
      const item = {
        id: 'item1',
        durability: { current: 45, max: 50 }
      };

      const result = equipmentManager.repairEquipment(item, 20);

      expect(result.newDurability).toBe(50);
    });

    test('fails for item without durability', () => {
      const item = { id: 'item1' };

      const result = equipmentManager.repairEquipment(item);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item has no durability');
    });
  });

  describe('getEquipmentSummary', () => {
    test('returns summary with no equipment', () => {
      const summary = equipmentManager.getEquipmentSummary(mockNPC);

      expect(summary.weapon).toBeNull();
      expect(summary.armor).toBeNull();
      expect(summary.accessory).toBeNull();
      expect(summary.totalBonuses.damage).toBe(0);
      expect(summary.equipmentValue).toBe(0);
      expect(summary.avgDurability).toBe(0);
    });

    test('returns summary with full equipment', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 20,
        value: 100,
        durability: { current: 25, max: 50 }
      };

      const armor = {
        id: 'armor1',
        type: 'armor',
        tier: 1,
        defense: 10,
        value: 150,
        durability: { current: 75, max: 100 }
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      equipmentManager.equipItem(mockNPC, armor, 'armor');

      const summary = equipmentManager.getEquipmentSummary(mockNPC);

      expect(summary.weapon).toBe(weapon);
      expect(summary.armor).toBe(armor);
      expect(summary.totalBonuses.damage).toBe(20);
      expect(summary.totalBonuses.defense).toBe(10);
      expect(summary.equipmentValue).toBe(250);
      expect(summary.avgDurability).toBe(62); // (50 + 75) / 2
    });

    test('handles items without durability in average', () => {
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 20,
        value: 100
        // No durability
      };

      const armor = {
        id: 'armor1',
        type: 'armor',
        tier: 1,
        defense: 10,
        value: 150,
        durability: { current: 50, max: 100 }
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      equipmentManager.equipItem(mockNPC, armor, 'armor');

      const summary = equipmentManager.getEquipmentSummary(mockNPC);

      expect(summary.avgDurability).toBe(50); // Only armor counts
    });
  });

  describe('Integration', () => {
    test('complete equipment flow', () => {
      // Equip full set
      const weapon = {
        id: 'weapon1',
        type: 'weapon',
        tier: 1,
        damage: 20,
        value: 100,
        durability: { current: 50, max: 50 }
      };

      const armor = {
        id: 'armor1',
        type: 'armor',
        tier: 2,
        defense: 15,
        healthBonus: 40,
        value: 200,
        durability: { current: 100, max: 100 }
      };

      equipmentManager.equipItem(mockNPC, weapon, 'weapon');
      equipmentManager.equipItem(mockNPC, armor, 'armor');

      expect(mockNPC.combatStats.damage).toBe(30);
      expect(mockNPC.combatStats.defense).toBe(15);
      expect(mockNPC.combatStats.health.max).toBe(140);

      // Damage equipment
      equipmentManager.damageEquipment(mockNPC, 20);
      expect(weapon.durability.current).toBe(30);

      // Get summary
      const summary = equipmentManager.getEquipmentSummary(mockNPC);
      expect(summary.equipmentValue).toBe(300);

      // Unequip
      equipmentManager.unequipItem(mockNPC, 'weapon');
      expect(mockNPC.combatStats.damage).toBe(10);
    });
  });
});
