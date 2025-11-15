/**
 * DefenseCombatEngine.test.js - Tests for defense combat system
 */
import DefenseCombatEngine from '../DefenseCombatEngine.js';
import NPCSkillSystem from '../../combat/NPCSkillSystem.js';
import NPCEquipmentManager from '../../combat/NPCEquipmentManager.js';

describe('DefenseCombatEngine', () => {
  let engine, mockNPCManager, skillSystem, equipmentManager, mockInventory;

  beforeEach(() => {
    mockInventory = {
      addEquipment: jest.fn(),
      removeItem: jest.fn()
    };

    mockNPCManager = {
      npcs: new Map(),
      getNPC: jest.fn((id) => mockNPCManager.npcs.get(id))
    };

    skillSystem = new NPCSkillSystem();
    equipmentManager = new NPCEquipmentManager(mockInventory);

    engine = new DefenseCombatEngine(mockNPCManager, skillSystem, equipmentManager);
  });

  describe('getAvailableDefenders', () => {
    test('returns alive NPCs not on expedition', () => {
      const npc1 = {
        id: 'npc1',
        alive: true,
        onExpedition: false,
        combatStats: { health: { current: 100 } }
      };

      const npc2 = {
        id: 'npc2',
        alive: false, // Dead
        onExpedition: false,
        combatStats: { health: { current: 0 } }
      };

      const npc3 = {
        id: 'npc3',
        alive: true,
        onExpedition: true, // On expedition
        combatStats: { health: { current: 100 } }
      };

      mockNPCManager.npcs.set('npc1', npc1);
      mockNPCManager.npcs.set('npc2', npc2);
      mockNPCManager.npcs.set('npc3', npc3);

      const defenders = engine.getAvailableDefenders();

      expect(defenders).toHaveLength(1);
      expect(defenders[0].id).toBe('npc1');
    });

    test('returns empty array when no NPCs', () => {
      const defenders = engine.getAvailableDefenders();

      expect(defenders).toEqual([]);
    });
  });

  describe('simulateWaveCombat', () => {
    let defenders, enemies;

    beforeEach(() => {
      defenders = [
        {
          id: 'npc1',
          name: 'Defender 1',
          combatStats: {
            health: { current: 150, max: 150 },
            damage: 25,
            defense: 10,
            speed: 3,
            critChance: 10,
            critDamage: 150,
            dodgeChance: 5
          },
          skills_combat: {
            combat: { powerStrike: 0, criticalHit: 0, deadlyBlow: 0 },
            magic: { manaPool: 0, spellPower: 0, fastCasting: 0 },
            defense: { ironSkin: 0, vitality: 0, evasion: 0 },
            utility: { swiftness: 0, fortune: 0, regeneration: 0 }
          },
          equipment: { weapon: null, armor: null, accessory: null }
        },
        {
          id: 'npc2',
          name: 'Defender 2',
          combatStats: {
            health: { current: 120, max: 120 },
            damage: 30,
            defense: 8,
            speed: 2.5,
            critChance: 15,
            critDamage: 175,
            dodgeChance: 10
          },
          skills_combat: {
            combat: { powerStrike: 0, criticalHit: 0, deadlyBlow: 0 },
            magic: { manaPool: 0, spellPower: 0, fastCasting: 0 },
            defense: { ironSkin: 0, vitality: 0, evasion: 0 },
            utility: { swiftness: 0, fortune: 0, regeneration: 0 }
          },
          equipment: { weapon: null, armor: null, accessory: null }
        }
      ];

      enemies = [
        {
          id: 'enemy1',
          type: 'orc',
          health: { current: 120, max: 120 }, // Tougher enemy
          damage: 20,
          defense: 5,
          speed: 2,
          alive: true
        }
      ];
    });

    test('defenders defeat weak enemies', () => {
      const result = engine.simulateWaveCombat(defenders, enemies);

      expect(result.victory).toBe(true);
      expect(result.enemiesKilled).toBe(1);
      expect(result.enemiesRemaining).toBe(0);
    });

    test('updates defender health', () => {
      engine.simulateWaveCombat(defenders, enemies);

      expect(
        defenders[0].combatStats.health.current < 150 ||
        defenders[1].combatStats.health.current < 120
      ).toBe(true);
    });

    test('tracks damage to defenders', () => {
      const result = engine.simulateWaveCombat(defenders, enemies);

      expect(result.defenderDamage).toBeDefined();
      expect(Object.keys(result.defenderDamage).length).toBeGreaterThan(0);
    });

    test('overwhelming enemies defeat defenders', () => {
      const strongEnemies = Array(10).fill(null).map((_, i) => ({
        id: `enemy${i}`,
        type: 'dragon',
        health: { current: 300, max: 300 },
        damage: 50,
        defense: 15,
        speed: 3,
        alive: true
      }));

      const result = engine.simulateWaveCombat(defenders, strongEnemies);

      expect(result.victory).toBe(false);
      expect(result.defendersKilled.length).toBeGreaterThan(0);
    });

    test('enemies attack settlement when defenders down', () => {
      const strongEnemies = [{
        id: 'enemy1',
        type: 'troll',
        health: { current: 500, max: 500 },
        damage: 100,
        defense: 20,
        speed: 3,
        alive: true
      }];

      const result = engine.simulateWaveCombat(defenders, strongEnemies);

      if (!result.victory) {
        expect(result.damageToSettlement).toBeGreaterThan(0);
      }
    });

    test('applies skill bonuses', () => {
      defenders[0].skills_combat.combat.powerStrike = 3;

      const result = engine.simulateWaveCombat(defenders, enemies);

      expect(result.victory).toBe(true);
    });

    test('combat ends after max rounds', () => {
      const immortalEnemies = [{
        id: 'enemy1',
        type: 'immortal',
        health: { current: 999999, max: 999999 },
        damage: 0,
        defense: 999,
        speed: 1,
        alive: true
      }];

      const result = engine.simulateWaveCombat(defenders, immortalEnemies);

      expect(result.rounds).toBeLessThanOrEqual(101);
    });
  });

  describe('healDefenders', () => {
    test('heals defenders by percentage', () => {
      const defenders = [{
        id: 'npc1',
        combatStats: {
          health: { current: 50, max: 100 }
        }
      }];

      engine.healDefenders(defenders, 0.3);

      expect(defenders[0].combatStats.health.current).toBe(80); // 50 + 30
    });

    test('does not exceed max health', () => {
      const defenders = [{
        id: 'npc1',
        combatStats: {
          health: { current: 95, max: 100 }
        }
      }];

      engine.healDefenders(defenders, 0.5);

      expect(defenders[0].combatStats.health.current).toBe(100);
    });

    test('uses default 20% healing', () => {
      const defenders = [{
        id: 'npc1',
        combatStats: {
          health: { current: 50, max: 100 }
        }
      }];

      engine.healDefenders(defenders);

      expect(defenders[0].combatStats.health.current).toBe(70); // 50 + 20
    });

    test('handles NPCs without combat stats', () => {
      const defenders = [{ id: 'npc1' }];

      expect(() => {
        engine.healDefenders(defenders);
      }).not.toThrow();
    });
  });

  describe('getDefenseStats', () => {
    test('calculates defense statistics', () => {
      const defenders = [
        {
          combatStats: {
            health: { max: 150 },
            damage: 25,
            defense: 10,
            speed: 3
          }
        },
        {
          combatStats: {
            health: { max: 120 },
            damage: 30,
            defense: 8,
            speed: 2.5
          }
        }
      ];

      const stats = engine.getDefenseStats(defenders);

      expect(stats.totalDefenders).toBe(2);
      expect(stats.totalHealth).toBe(270);
      expect(stats.totalDamage).toBe(55);
      expect(stats.averageDefense).toBe(9);
      expect(stats.averageSpeed).toBe(2.75);
    });

    test('returns zero stats for empty array', () => {
      const stats = engine.getDefenseStats([]);

      expect(stats.totalDefenders).toBe(0);
      expect(stats.totalHealth).toBe(0);
    });
  });

  describe('settlement health', () => {
    test('gets settlement health', () => {
      expect(engine.getSettlementHealth()).toBe(1000);
    });

    test('sets settlement health', () => {
      engine.setSettlementHealth(500);

      expect(engine.getSettlementHealth()).toBe(500);
    });

    test('caps settlement health at 1000', () => {
      engine.setSettlementHealth(1500);

      expect(engine.getSettlementHealth()).toBe(1000);
    });

    test('prevents negative settlement health', () => {
      engine.setSettlementHealth(-100);

      expect(engine.getSettlementHealth()).toBe(0);
    });

    test('repairs settlement', () => {
      engine.setSettlementHealth(500);
      engine.repairSettlement(200);

      expect(engine.getSettlementHealth()).toBe(700);
    });

    test('repair does not exceed max', () => {
      engine.setSettlementHealth(900);
      engine.repairSettlement(200);

      expect(engine.getSettlementHealth()).toBe(1000);
    });
  });

  describe('Integration', () => {
    test('complete defense scenario', () => {
      // Setup defenders
      const defenders = [
        {
          id: 'npc1',
          combatStats: {
            health: { current: 150, max: 150 },
            damage: 25,
            defense: 10,
            speed: 3,
            critChance: 10,
            critDamage: 150,
            dodgeChance: 5
          },
          skills_combat: {
            combat: { powerStrike: 2, criticalHit: 0, deadlyBlow: 0 },
            magic: { manaPool: 0, spellPower: 0, fastCasting: 0 },
            defense: { ironSkin: 0, vitality: 0, evasion: 0 },
            utility: { swiftness: 0, fortune: 0, regeneration: 0 }
          },
          equipment: { weapon: null, armor: null, accessory: null }
        }
      ];

      // Wave 1
      const wave1Enemies = [
        { id: 'e1', type: 'goblin', health: { current: 50, max: 50 }, damage: 10, defense: 2, alive: true }
      ];

      const result1 = engine.simulateWaveCombat(defenders, wave1Enemies);
      expect(result1.victory).toBe(true);

      // Heal between waves
      engine.healDefenders(defenders, 0.3);

      // Wave 2
      const wave2Enemies = [
        { id: 'e2', type: 'orc', health: { current: 80, max: 80 }, damage: 15, defense: 5, alive: true },
        { id: 'e3', type: 'orc', health: { current: 80, max: 80 }, damage: 15, defense: 5, alive: true }
      ];

      const result2 = engine.simulateWaveCombat(defenders, wave2Enemies);

      // Check final state
      expect(result2.rounds).toBeGreaterThan(0);
      expect(defenders[0].combatStats.health.current).toBeGreaterThan(0);
    });
  });
});
