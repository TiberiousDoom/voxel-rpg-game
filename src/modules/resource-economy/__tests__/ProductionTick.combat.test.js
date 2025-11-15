/**
 * ProductionTick.combat.test.js - Tests for combat production bonuses
 * Hybrid Game Phase 2: Verify NPCs with combat experience provide production bonuses
 */
import ProductionTick from '../ProductionTick.js';

describe('ProductionTick - Combat Bonuses', () => {
  let productionTick, mockBuildingConfig, mockBuildingEffect, mockStorageManager;

  beforeEach(() => {
    // Mock building config
    mockBuildingConfig = {
      getConfig: jest.fn((type) => ({
        production: { gold: 10 },
        workSlots: 2
      }))
    };

    // Mock building effect (no aura bonuses)
    mockBuildingEffect = {
      getProductionBonusAt: jest.fn(() => 1.0)
    };

    // Mock storage manager
    mockStorageManager = {
      storage: {},
      addResource: jest.fn((resource, amount) => {
        mockStorageManager.storage[resource] = (mockStorageManager.storage[resource] || 0) + amount;
      }),
      checkAndHandleOverflow: jest.fn(() => ({ overflowed: false })),
      getStatus: jest.fn(() => ({}))
    };

    productionTick = new ProductionTick(mockBuildingConfig, mockBuildingEffect, mockStorageManager);
  });

  describe('_getCombatProductionBonus', () => {
    test('returns 1.0 for NPC with no combat stats', () => {
      const npc = { id: 'npc1', name: 'Worker' };

      const bonus = productionTick._getCombatProductionBonus(npc);

      expect(bonus).toBe(1.0);
    });

    test('gives 1% bonus per combat level', () => {
      const npc = {
        id: 'npc1',
        combatLevel: 5, // Level 5 = 4% bonus (5-1) * 0.01
        equipment: {}
      };

      const bonus = productionTick._getCombatProductionBonus(npc);

      expect(bonus).toBe(1.04); // 1.0 + 0.04
    });

    test('gives 0.5% bonus per tier of best equipment', () => {
      const npc = {
        id: 'npc1',
        combatLevel: 1,
        equipment: {
          weapon: { tier: 3 },
          armor: { tier: 2 },
          accessory: { tier: 1 }
        }
      };

      const bonus = productionTick._getCombatProductionBonus(npc);

      expect(bonus).toBe(1.015); // 1.0 + (3 * 0.005)
    });

    test('gives 5% veteran bonus', () => {
      const npc = {
        id: 'npc1',
        combatLevel: 1,
        equipment: {},
        isVeteran: true
      };

      const bonus = productionTick._getCombatProductionBonus(npc);

      expect(bonus).toBe(1.05);
    });

    test('combines all bonuses', () => {
      const npc = {
        id: 'npc1',
        combatLevel: 10, // 9% bonus
        equipment: {
          weapon: { tier: 5 }, // 2.5% bonus
          armor: null,
          accessory: null
        },
        isVeteran: true // 5% bonus
      };

      const bonus = productionTick._getCombatProductionBonus(npc);

      expect(bonus).toBe(1.165); // 1.0 + 0.09 + 0.025 + 0.05
    });

    test('handles missing equipment slots', () => {
      const npc = {
        id: 'npc1',
        combatLevel: 3,
        equipment: {
          weapon: null,
          armor: { tier: 2 },
          accessory: null
        }
      };

      const bonus = productionTick._getCombatProductionBonus(npc);

      expect(bonus).toBe(1.03); // 1.0 + 0.02 (combat) + 0.01 (armor tier 2)
    });
  });

  describe('Combat bonus integration with production', () => {
    test('applies combat bonus to production', () => {
      const building = {
        id: 'building1',
        type: 'FARM',
        state: 'COMPLETE',
        position: { x: 0, y: 0, z: 0 }
      };

      const npc1 = {
        id: 'npc1',
        name: 'Veteran Farmer',
        alive: true,
        combatLevel: 5,
        equipment: { weapon: null, armor: null, accessory: null },
        isVeteran: true,
        skills: { farming: 1.0 }
      };

      const npc2 = {
        id: 'npc2',
        name: 'Rookie Farmer',
        alive: true,
        combatLevel: 1,
        equipment: { weapon: null, armor: null, accessory: null },
        isVeteran: false,
        skills: { farming: 1.0 }
      };

      const npcAssignments = {
        getNPCsInBuilding: jest.fn(() => ['npc1', 'npc2'])
      };

      const npcManager = {
        npcs: new Map([
          ['npc1', npc1],
          ['npc2', npc2]
        ])
      };

      const result = productionTick.executeTick(
        [building],
        npcAssignments,
        npcManager,
        1.0 // morale
      );

      // Expected calculation:
      // NPC1 combat bonus: 1.0 + 0.04 (level 5) + 0.05 (veteran) = 1.09
      // NPC2 combat bonus: 1.0
      // Average combat bonus: (1.09 + 1.0) / 2 = 1.045
      // Base production: 10 gold
      // Staffing multiplier: 2/2 = 1.0
      // Skill bonus: 0.0 (farming skill is 1.0 = no bonus)
      // Aura bonus: 1.0
      // Morale: 1.0
      // Final: 10 * 1.0 * 1.0 * 1.045 * 1.0 * 1.0 = 10.45

      expect(result.buildingResults).toHaveLength(1);
      expect(result.buildingResults[0].combatBonus).toBe('0.045'); // (1.045 - 1.0)
      expect(result.production.gold).toBeCloseTo(10.45, 1);
    });

    test('no bonus with non-combat NPCs', () => {
      const building = {
        id: 'building1',
        type: 'FARM',
        state: 'COMPLETE',
        position: { x: 0, y: 0, z: 0 }
      };

      const npc = {
        id: 'npc1',
        name: 'Regular Farmer',
        alive: true,
        skills: { farming: 1.0 }
        // No combat stats
      };

      const npcAssignments = {
        getNPCsInBuilding: jest.fn(() => ['npc1'])
      };

      const npcManager = {
        npcs: new Map([['npc1', npc]])
      };

      const result = productionTick.executeTick(
        [building],
        npcAssignments,
        npcManager,
        1.0
      );

      expect(result.buildingResults[0].combatBonus).toBe('0.000');
      expect(result.production.gold).toBe(5); // 10 * 0.5 (half staffed) * 1.0
    });

    test('high-level veteran provides significant bonus', () => {
      const building = {
        id: 'building1',
        type: 'FARM',
        state: 'COMPLETE',
        position: { x: 0, y: 0, z: 0 }
      };

      const veteranNPC = {
        id: 'npc1',
        name: 'Master Warrior Farmer',
        alive: true,
        combatLevel: 20, // 19% bonus
        equipment: {
          weapon: { tier: 5 }, // 2.5% bonus
          armor: { tier: 5 },
          accessory: { tier: 5 }
        },
        isVeteran: true, // 5% bonus
        skills: { farming: 1.0 }
      };

      const npcAssignments = {
        getNPCsInBuilding: jest.fn(() => ['npc1'])
      };

      const npcManager = {
        npcs: new Map([['npc1', veteranNPC]])
      };

      const result = productionTick.executeTick(
        [building],
        npcAssignments,
        npcManager,
        1.0
      );

      // Combat bonus: 1.0 + 0.19 + 0.025 + 0.05 = 1.265
      // Production: 10 * 0.5 (half staffed) * 1.265 = 6.325

      expect(result.buildingResults[0].combatBonus).toBe('0.265');
      expect(result.production.gold).toBeCloseTo(6.325, 1);
    });
  });

  describe('Combat bonus with other multipliers', () => {
    test('combines with skill bonus', () => {
      const building = {
        id: 'building1',
        type: 'FARM',
        state: 'COMPLETE',
        position: { x: 0, y: 0, z: 0 }
      };

      const skilledVeteran = {
        id: 'npc1',
        name: 'Skilled Veteran',
        alive: true,
        combatLevel: 5, // 4% combat bonus
        equipment: {},
        isVeteran: true, // 5% combat bonus
        skills: { farming: 1.5 } // 50% skill bonus
      };

      const npcAssignments = {
        getNPCsInBuilding: jest.fn(() => ['npc1'])
      };

      const npcManager = {
        npcs: new Map([['npc1', skilledVeteran]])
      };

      const result = productionTick.executeTick(
        [building],
        npcAssignments,
        npcManager,
        1.0
      );

      // Combat bonus: 1.09
      // Skill bonus: 0.5
      // Production: 10 * 0.5 (half staffed) * (1 + 0.5) * 1.09 = 8.175

      expect(result.production.gold).toBeCloseTo(8.175, 1);
    });
  });
});
