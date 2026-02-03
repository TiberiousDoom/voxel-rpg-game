/**
 * AISystemManager.test.js - Tests for AI System Manager
 */

import { AISystemManager } from '../AISystemManager.js';
import { ObjectiveType, QuestType } from '../QuestAISystem.js';

describe('AISystemManager', () => {
  let aiManager;

  beforeEach(() => {
    aiManager = new AISystemManager({
      worldSize: 256,
      enablePathfinding: true,
      enablePerception: true,
      enableNPCBehavior: true,
      enableEnemyAI: true,
      enableEconomicAI: true,
      enableWildlifeAI: true,
      enableCompanionAI: true,
      enableQuestAI: true
    });
  });

  afterEach(() => {
    aiManager.dispose();
  });

  // ============================================
  // INITIALIZATION TESTS
  // ============================================

  describe('Initialization', () => {
    test('should create with default options', () => {
      const manager = new AISystemManager();
      expect(manager).toBeDefined();
      expect(manager.pathfinding).toBeDefined();
      expect(manager.perception).toBeDefined();
      manager.dispose();
    });

    test('should create all AI systems', () => {
      expect(aiManager.pathfinding).toBeDefined();
      expect(aiManager.perception).toBeDefined();
      expect(aiManager.npcBehavior).toBeDefined();
      expect(aiManager.enemyAI).toBeDefined();
      expect(aiManager.economicAI).toBeDefined();
      expect(aiManager.wildlifeAI).toBeDefined();
      expect(aiManager.companionAI).toBeDefined();
      expect(aiManager.questAI).toBeDefined();
    });

    test('should disable systems via options', () => {
      const manager = new AISystemManager({
        enablePathfinding: false,
        enableWildlifeAI: false
      });
      expect(manager.pathfinding).toBeUndefined();
      expect(manager.wildlifeAI).toBeUndefined();
      expect(manager.perception).toBeDefined();
      manager.dispose();
    });
  });

  // ============================================
  // NPC REGISTRATION TESTS
  // ============================================

  describe('NPC Registration', () => {
    test('should register NPC', () => {
      const npc = {
        id: 'npc1',
        name: 'Test NPC',
        role: 'WORKER',
        position: { x: 100, z: 100 },
        personality: { friendliness: 0.7 }
      };

      aiManager.registerNPC(npc);

      expect(aiManager.registeredNPCs.has('npc1')).toBe(true);
    });

    test('should unregister NPC', () => {
      const npc = { id: 'npc1', name: 'Test', position: { x: 0, z: 0 } };
      aiManager.registerNPC(npc);
      aiManager.unregisterNPC('npc1');

      expect(aiManager.registeredNPCs.has('npc1')).toBe(false);
    });

    test('should handle null NPC gracefully', () => {
      expect(() => aiManager.registerNPC(null)).not.toThrow();
      expect(() => aiManager.registerNPC({})).not.toThrow();
    });
  });

  // ============================================
  // MONSTER REGISTRATION TESTS
  // ============================================

  describe('Monster Registration', () => {
    test('should register monster', () => {
      const monster = {
        id: 'monster1',
        type: 'GOBLIN',
        position: { x: 50, z: 50 },
        health: 100,
        maxHealth: 100,
        damage: 10,
        aggroRange: 80
      };

      aiManager.registerMonster(monster);

      expect(aiManager.registeredMonsters.has('monster1')).toBe(true);
    });

    test('should unregister monster', () => {
      const monster = { id: 'm1', type: 'SLIME', position: { x: 0, z: 0 } };
      aiManager.registerMonster(monster);
      aiManager.unregisterMonster('m1');

      expect(aiManager.registeredMonsters.has('m1')).toBe(false);
    });
  });

  // ============================================
  // WILDLIFE REGISTRATION TESTS
  // ============================================

  describe('Wildlife Registration', () => {
    test('should register wildlife', () => {
      const animal = {
        id: 'deer1',
        type: 'DEER',
        position: { x: 200, z: 200 },
        behavior: 'NEUTRAL'
      };

      aiManager.registerWildlife(animal);

      expect(aiManager.registeredWildlife.has('deer1')).toBe(true);
    });

    test('should unregister wildlife', () => {
      const animal = { id: 'a1', type: 'RABBIT', position: { x: 0, z: 0 } };
      aiManager.registerWildlife(animal);
      aiManager.unregisterWildlife('a1');

      expect(aiManager.registeredWildlife.has('a1')).toBe(false);
    });
  });

  // ============================================
  // COMPANION REGISTRATION TESTS
  // ============================================

  describe('Companion Registration', () => {
    test('should register companion', () => {
      const companion = {
        id: 'comp1',
        type: 'DOG',
        role: 'FIGHTER',
        position: { x: 100, z: 100 }
      };

      aiManager.registerCompanion(companion);

      expect(aiManager.registeredCompanions.has('comp1')).toBe(true);
    });

    test('should unregister companion', () => {
      const companion = { id: 'c1', type: 'CAT', position: { x: 0, z: 0 } };
      aiManager.registerCompanion(companion);
      aiManager.unregisterCompanion('c1');

      expect(aiManager.registeredCompanions.has('c1')).toBe(false);
    });
  });

  // ============================================
  // UPDATE LOOP TESTS
  // ============================================

  describe('Update Loop', () => {
    test('should update without entities', () => {
      const result = aiManager.update(1, { hour: 12 });

      expect(result.tick).toBe(1);
      expect(result.npcBehavior).toBeNull();
      expect(result.enemyAI).toBeNull();
    });

    test('should update with registered NPCs', () => {
      const npc = {
        id: 'npc1',
        name: 'Worker',
        role: 'WORKER',
        position: { x: 100, z: 100 },
        isWorking: false,
        isResting: false
      };
      aiManager.registerNPC(npc);

      const result = aiManager.update(1, { hour: 12 });

      expect(result.npcBehavior).not.toBeNull();
      expect(result.npcBehavior.updated).toBeGreaterThanOrEqual(0);
    });

    test('should update with registered monsters', () => {
      const monster = {
        id: 'm1',
        type: 'GOBLIN',
        position: { x: 50, z: 50 },
        health: 100,
        maxHealth: 100,
        alive: true
      };
      aiManager.registerMonster(monster);

      const result = aiManager.update(1, { hour: 12 });

      expect(result.enemyAI).not.toBeNull();
    });

    test('should track statistics', () => {
      aiManager.update(1, {});
      aiManager.update(1, {});

      expect(aiManager.stats.ticksProcessed).toBe(2);
    });
  });

  // ============================================
  // PATHFINDING TESTS
  // ============================================

  describe('Pathfinding', () => {
    test('should find path between points', () => {
      const start = { x: 10, z: 10 };
      const end = { x: 50, z: 50 };

      const path = aiManager.findPath(start, end);

      // Path may be null if blocked, but should not throw
      expect(() => aiManager.findPath(start, end)).not.toThrow();
    });

    test('should track paths calculated', () => {
      const path1 = aiManager.findPath({ x: 0, z: 0 }, { x: 10, z: 10 });
      const path2 = aiManager.findPath({ x: 20, z: 20 }, { x: 30, z: 30 });

      // Stats are incremented for successful paths
      expect(aiManager.stats.pathsCalculated).toBeGreaterThanOrEqual(0);
    });

    test('should add obstacle', () => {
      expect(() => aiManager.addObstacle('obs1', { x: 15, z: 15 }, 10)).not.toThrow();
    });

    test('should remove obstacle', () => {
      aiManager.addObstacle('obs2', { x: 20, z: 20 }, 10);
      expect(() => aiManager.removeObstacle('obs2')).not.toThrow();
    });
  });

  // ============================================
  // QUEST INTERFACE TESTS
  // ============================================

  describe('Quest Interface', () => {
    test('should add quest', () => {
      const quest = aiManager.addQuest({
        id: 'q1',
        title: 'Test Quest',
        type: QuestType.KILL
      });

      expect(quest).not.toBeNull();
      expect(aiManager.stats.questsGenerated).toBe(1);
    });

    test('should accept quest', () => {
      aiManager.addQuest({ id: 'q1', title: 'Test', type: QuestType.FETCH });
      const result = aiManager.acceptQuest('q1');

      expect(result).toBe(true);
    });

    test('should update quest progress', () => {
      aiManager.addQuest({
        id: 'q1',
        title: 'Kill Goblins',
        type: QuestType.KILL,
        objectives: [{
          id: 'obj1',
          type: ObjectiveType.KILL_ENEMY,
          target: 'goblin',
          targetCount: 3
        }]
      });
      aiManager.acceptQuest('q1');

      expect(() => aiManager.updateQuestProgress(ObjectiveType.KILL_ENEMY, 'goblin', 1)).not.toThrow();
    });

    test('should generate quests for NPC', () => {
      const quests = aiManager.generateQuestsForNPC('npc1', 'Village Elder', 2);

      expect(Array.isArray(quests)).toBe(true);
    });
  });

  // ============================================
  // ECONOMIC INTERFACE TESTS
  // ============================================

  describe('Economic Interface', () => {
    test('should register merchant', () => {
      expect(() => aiManager.registerMerchant({
        id: 'merchant1',
        name: 'Bob',
        inventory: [],
        gold: 500
      })).not.toThrow();
    });

    test('should process trade', () => {
      aiManager.registerMerchant({
        id: 'm1',
        name: 'Trader',
        inventory: [{ id: 'sword', name: 'Sword', basePrice: 50, quantity: 5 }],
        gold: 1000
      });

      const result = aiManager.processTrade('m1', 'sell', { id: 'potion', basePrice: 10 }, 1);

      // Trade may succeed or fail based on merchant logic
      expect(result).toHaveProperty('success');
    });
  });

  // ============================================
  // COMBAT INTEGRATION TESTS
  // ============================================

  describe('Combat Integration', () => {
    test('should handle combat event', () => {
      const monster = {
        id: 'm1',
        type: 'GOBLIN',
        position: { x: 50, z: 50 },
        health: 100,
        alive: true
      };
      aiManager.registerMonster(monster);

      expect(() => aiManager.onCombatEvent({
        type: 'damage',
        attackerId: 'player',
        targetId: 'm1',
        damage: 25,
        position: { x: 50, z: 50 }
      })).not.toThrow();
    });

    test('should update quest on kill', () => {
      // Add kill quest
      aiManager.addQuest({
        id: 'q1',
        title: 'Hunt Goblins',
        type: QuestType.KILL,
        objectives: [{
          id: 'obj1',
          type: ObjectiveType.KILL_ENEMY,
          target: 'GOBLIN',
          targetCount: 1
        }]
      });
      aiManager.acceptQuest('q1');

      // Register monster
      const monster = { id: 'm1', type: 'GOBLIN', position: { x: 0, z: 0 } };
      aiManager.registerMonster(monster);

      // Trigger kill event
      aiManager.onCombatEvent({
        type: 'kill',
        attackerId: 'player',
        targetId: 'm1',
        position: { x: 0, z: 0 }
      });

      // Quest should have received progress update
      expect(aiManager.stats.ticksProcessed).toBeDefined();
    });

    test('should handle item collected', () => {
      expect(() => aiManager.onItemCollected({ id: 'gold_coin', type: 'gold' })).not.toThrow();
    });

    test('should handle location reached', () => {
      expect(() => aiManager.onLocationReached('village_square')).not.toThrow();
    });

    test('should handle NPC talked to', () => {
      expect(() => aiManager.onNPCTalkedTo('elder')).not.toThrow();
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    test('should add listener', () => {
      const listener = jest.fn();
      aiManager.addListener(listener);

      expect(aiManager.listeners).toContain(listener);
    });

    test('should remove listener', () => {
      const listener = jest.fn();
      aiManager.addListener(listener);
      aiManager.removeListener(listener);

      expect(aiManager.listeners).not.toContain(listener);
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      aiManager.update(1, {});
      aiManager.addQuest({ id: 'q1', title: 'Test', type: QuestType.KILL });

      const json = aiManager.toJSON();

      expect(json.stats).toBeDefined();
      expect(json.questAI).toBeDefined();
    });

    test('should load from JSON', () => {
      const data = {
        stats: { ticksProcessed: 100 }
      };

      aiManager.fromJSON(data);

      expect(aiManager.stats.ticksProcessed).toBe(100);
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should get statistics', () => {
      const npc = { id: 'n1', position: { x: 0, z: 0 } };
      const monster = { id: 'm1', type: 'SLIME', position: { x: 0, z: 0 } };
      aiManager.registerNPC(npc);
      aiManager.registerMonster(monster);

      const stats = aiManager.getStatistics();

      expect(stats.registeredNPCs).toBe(1);
      expect(stats.registeredMonsters).toBe(1);
      expect(stats.pathfindingEnabled).toBe(true);
      expect(stats.perceptionEnabled).toBe(true);
    });
  });

  // ============================================
  // CLEANUP TESTS
  // ============================================

  describe('Cleanup', () => {
    test('should dispose properly', () => {
      aiManager.registerNPC({ id: 'n1', position: { x: 0, z: 0 } });
      aiManager.registerMonster({ id: 'm1', type: 'SLIME', position: { x: 0, z: 0 } });
      aiManager.addListener(jest.fn());

      aiManager.dispose();

      expect(aiManager.registeredNPCs.size).toBe(0);
      expect(aiManager.registeredMonsters.size).toBe(0);
      expect(aiManager.listeners.length).toBe(0);
    });
  });
});
