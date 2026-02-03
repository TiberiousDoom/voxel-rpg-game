/**
 * DungeonCombatEngine.test.js - Tests for dungeon and combat system
 */
import DungeonCombatEngine from '../DungeonCombatEngine.js';
import NPCSkillSystem from '../../combat/NPCSkillSystem.js';
import NPCEquipmentManager from '../../combat/NPCEquipmentManager.js';

describe('DungeonCombatEngine', () => {
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

    engine = new DungeonCombatEngine(mockNPCManager, skillSystem, equipmentManager);
  });

  describe('generateFloor', () => {
    test('generates floor with enemies', () => {
      const floor = engine.generateFloor(1, 1);

      expect(floor.floor).toBe(1);
      expect(floor.enemies).toBeDefined();
      expect(floor.enemies.length).toBeGreaterThan(0);
      expect(floor.treasureChests).toBeGreaterThanOrEqual(1);
      expect(floor.exitFound).toBe(false);
    });

    test('scales enemy count with floor number', () => {
      const floor1 = engine.generateFloor(1, 1);
      const floor5 = engine.generateFloor(5, 1);

      expect(floor5.enemies.length).toBeGreaterThan(floor1.enemies.length);
    });

    test('enemies have required properties', () => {
      const floor = engine.generateFloor(1, 1);
      const enemy = floor.enemies[0];

      expect(enemy).toHaveProperty('id');
      expect(enemy).toHaveProperty('type');
      expect(enemy).toHaveProperty('health');
      expect(enemy).toHaveProperty('damage');
      expect(enemy).toHaveProperty('defense');
      expect(enemy).toHaveProperty('xpReward');
      expect(enemy).toHaveProperty('goldReward');
    });

    test('higher difficulty increases enemy stats', () => {
      const floorEasy = engine.generateFloor(1, 1);
      const floorHard = engine.generateFloor(1, 5);

      expect(floorHard.enemies[0].health.max).toBeGreaterThan(floorEasy.enemies[0].health.max);
      expect(floorHard.enemies[0].damage).toBeGreaterThan(floorEasy.enemies[0].damage);
    });
  });

  describe('simulateCombat', () => {
    let npc1, npc2, party;

    beforeEach(() => {
      npc1 = {
        id: 'npc1',
        name: 'Fighter',
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
        equipment: { weapon: null, armor: null, accessory: null },
        damageDealt: 0,
        damageTaken: 0
      };

      npc2 = {
        id: 'npc2',
        name: 'Mage',
        combatStats: {
          health: { current: 100, max: 100 },
          damage: 35,
          defense: 5,
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
        equipment: { weapon: null, armor: null, accessory: null },
        damageDealt: 0,
        damageTaken: 0
      };

      mockNPCManager.npcs.set('npc1', npc1);
      mockNPCManager.npcs.set('npc2', npc2);

      party = [
        { npcId: 'npc1', role: 'tank' },
        { npcId: 'npc2', role: 'damage' }
      ];
    });

    test('party defeats weak enemies', () => {
      const enemies = [{
        id: 'enemy1',
        type: 'goblin',
        health: { current: 30, max: 30 },
        damage: 5,
        defense: 0,
        speed: 2,
        critChance: 5,
        xpReward: 20,
        goldReward: 10
      }];

      const result = engine.simulateCombat(party, enemies);

      expect(result.victory).toBe(true);
      expect(result.enemiesKilled).toBe(1);
      expect(result.totalXP).toBe(20);
      expect(result.totalGold).toBe(10);
    });

    test('combat updates NPC health', () => {
      const enemies = [{
        id: 'enemy1',
        type: 'orc',
        health: { current: 120, max: 120 }, // Tankier enemy
        damage: 15,
        defense: 5,
        speed: 2,
        critChance: 5,
        xpReward: 20,
        goldReward: 10
      }];

      const initialHealth1 = npc1.combatStats.health.current;
      const initialHealth2 = npc2.combatStats.health.current;
      const result = engine.simulateCombat(party, enemies);

      expect(result.victory).toBe(true);
      // At least one NPC should have taken damage
      expect(
        npc1.combatStats.health.current < initialHealth1 ||
        npc2.combatStats.health.current < initialHealth2
      ).toBe(true);
    });

    test('tracks party damage taken', () => {
      const enemies = [{
        id: 'enemy1',
        type: 'orc',
        health: { current: 100, max: 100 }, // Tankier enemy
        damage: 20,
        defense: 5,
        speed: 2,
        critChance: 5,
        xpReward: 20,
        goldReward: 10
      }];

      const result = engine.simulateCombat(party, enemies);

      expect(result.partyDamage).toBeDefined();
      expect(Object.keys(result.partyDamage).length).toBeGreaterThan(0);
    });

    test('party can be defeated', () => {
      // Create overwhelming enemies
      const enemies = [
        {
          id: 'enemy1',
          type: 'dragon',
          health: { current: 500, max: 500 },
          damage: 100,
          defense: 20,
          speed: 4,
          critChance: 20,
          xpReward: 200,
          goldReward: 100
        }
      ];

      const result = engine.simulateCombat(party, enemies);

      expect(result.victory).toBe(false);
      expect(result.casualties.length).toBeGreaterThan(0);
    });

    test('applies skill bonuses to damage', () => {
      // Give NPC power strike skill
      npc1.skills_combat.combat.powerStrike = 3; // 15% damage bonus

      const enemies = [{
        id: 'enemy1',
        type: 'goblin',
        health: { current: 50, max: 50 },
        damage: 5,
        defense: 0,
        speed: 2,
        critChance: 5,
        xpReward: 20,
        goldReward: 10
      }];

      const result = engine.simulateCombat(party, enemies);

      expect(result.victory).toBe(true);
      expect(npc1.damageDealt).toBeGreaterThan(0);
    });

    test('combat ends after max rounds', () => {
      // Create unkillable enemy
      const enemies = [{
        id: 'enemy1',
        type: 'immortal',
        health: { current: 999999, max: 999999 },
        damage: 0,
        defense: 999,
        speed: 1,
        critChance: 0,
        xpReward: 0,
        goldReward: 0
      }];

      const result = engine.simulateCombat(party, enemies);

      expect(result.rounds).toBeLessThanOrEqual(101);
    });
  });

  describe('processFloorCompletion', () => {
    test('generates rewards from combat and treasures', () => {
      const floorData = {
        floor: 3,
        treasureChests: 2
      };

      const combatResult = {
        totalGold: 50,
        totalXP: 100
      };

      const rewards = engine.processFloorCompletion(floorData, combatResult);

      expect(rewards.gold).toBeGreaterThan(combatResult.totalGold);
      expect(rewards.xp).toBe(combatResult.totalXP);
      expect(rewards.items).toBeDefined();
    });

    test('higher floors give better rewards', () => {
      const floor1Rewards = engine.processFloorCompletion(
        { floor: 1, treasureChests: 1 },
        { totalGold: 10, totalXP: 20 }
      );

      const floor5Rewards = engine.processFloorCompletion(
        { floor: 5, treasureChests: 1 },
        { totalGold: 10, totalXP: 20 }
      );

      expect(floor5Rewards.gold).toBeGreaterThan(floor1Rewards.gold);
    });
  });

  describe('item generation', () => {
    test('generates items with correct tiers', () => {
      const floor2Item = engine._generateItem(2);
      const floor8Item = engine._generateItem(8);

      expect(floor2Item.tier).toBe(1);
      expect(floor8Item.tier).toBe(4);
    });

    test('weapons have damage stats', () => {
      const item = engine._generateItem(4);
      // Keep generating until we get a weapon
      let weapon = item;
      for (let i = 0; i < 20 && weapon.type !== 'weapon'; i++) {
        weapon = engine._generateItem(4);
      }

      if (weapon.type === 'weapon') {
        expect(weapon.damage).toBeGreaterThan(0);
        expect(weapon.critChance).toBeDefined();
      }
    });

    test('armor has defense stats', () => {
      let armor;
      for (let i = 0; i < 20; i++) {
        const item = engine._generateItem(4);
        if (item.type === 'armor') {
          armor = item;
          break;
        }
      }

      if (armor) {
        expect(armor.defense).toBeGreaterThan(0);
        expect(armor.healthBonus).toBeDefined();
      }
    });
  });

  describe('healParty', () => {
    let npc, party;

    beforeEach(() => {
      npc = {
        id: 'npc1',
        combatStats: {
          health: { current: 50, max: 100 }
        }
      };

      mockNPCManager.npcs.set('npc1', npc);
      party = [{ npcId: 'npc1', role: 'tank' }];
    });

    test('heals party members', () => {
      engine.healParty(party, 0.5);

      expect(npc.combatStats.health.current).toBe(100); // 50 + 50% of 100 = 100 (capped at max)
    });

    test('does not exceed max health', () => {
      npc.combatStats.health.current = 95;

      engine.healParty(party, 0.5);

      expect(npc.combatStats.health.current).toBe(100);
    });

    test('uses default 30% healing', () => {
      engine.healParty(party);

      expect(npc.combatStats.health.current).toBe(80); // 50 + 30% of 100
    });
  });

  describe('Integration', () => {
    test('complete dungeon floor flow', () => {
      // Create party
      const npc = {
        id: 'npc1',
        combatStats: {
          health: { current: 150, max: 150 },
          damage: 30,
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
        equipment: { weapon: null, armor: null, accessory: null },
        damageDealt: 0,
        damageTaken: 0
      };

      mockNPCManager.npcs.set('npc1', npc);
      const party = [{ npcId: 'npc1', role: 'tank' }];

      // Generate floor
      const floor = engine.generateFloor(1, 1);
      expect(floor.enemies.length).toBeGreaterThan(0);

      // Simulate combat
      const combatResult = engine.simulateCombat(party, floor.enemies);
      expect(combatResult.rounds).toBeGreaterThan(0);

      // Process rewards
      const rewards = engine.processFloorCompletion(floor, combatResult);
      expect(rewards.gold).toBeGreaterThan(0);
      expect(rewards.xp).toBeGreaterThan(0);

      // Heal party
      engine.healParty(party, 0.3);
      expect(npc.combatStats.health.current).toBeGreaterThan(0);
    });
  });
});
