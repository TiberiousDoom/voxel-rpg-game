/**
 * NPCBehaviorSystem.test.js - Tests for Enhanced NPC Behavior System
 */

import {
  NPCBehaviorSystem,
  NPCMemory,
  PersonalityTraits,
  ActivityType,
  RelationshipStatus,
  MemoryEventType
} from '../NPCBehaviorSystem.js';

// Mock dependencies
jest.mock('../BehaviorTree.js', () => {
  const NodeStatus = { SUCCESS: 'SUCCESS', FAILURE: 'FAILURE', RUNNING: 'RUNNING' };

  class MockBehaviorTree {
    constructor() {}
    update() { return NodeStatus.SUCCESS; }
    reset() {}
  }

  class MockBlackboard {
    constructor() { this.data = new Map(); }
    set(key, value) { this.data.set(key, value); }
    get(key) { return this.data.get(key); }
    has(key) { return this.data.has(key); }
  }

  class MockBehaviorTreeBuilder {
    constructor() {
      this.tree = new MockBehaviorTree();
    }
    selector() { return this; }
    sequence() { return this; }
    action() { return this; }
    check() { return this; }
    end() { return this; }
    build() { return this.tree; }
  }

  return {
    BehaviorTree: MockBehaviorTree,
    BehaviorTreeBuilder: MockBehaviorTreeBuilder,
    Blackboard: MockBlackboard,
    NodeStatus
  };
});

jest.mock('../PathfindingSystem.js', () => {
  const mockInstance = {
    findPath: jest.fn(() => ({
      success: true,
      path: [{ x: 100, z: 100 }, { x: 200, z: 200 }]
    }))
  };
  return {
    PathfindingSystem: jest.fn(() => mockInstance),
    distance: jest.fn((a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2))
  };
});

describe('NPCBehaviorSystem', () => {
  let npcBehavior;

  beforeEach(() => {
    npcBehavior = new NPCBehaviorSystem();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // ENUMS TESTS
  // ============================================

  describe('Enums', () => {
    test('PersonalityTraits should have trait types', () => {
      expect(PersonalityTraits.BRAVERY).toBe('bravery');
      expect(PersonalityTraits.FRIENDLINESS).toBe('friendliness');
      expect(PersonalityTraits.WORK_ETHIC).toBe('workEthic');
      expect(PersonalityTraits.CURIOSITY).toBe('curiosity');
      expect(PersonalityTraits.SOCIABILITY).toBe('sociability');
    });

    test('ActivityType should have all activities', () => {
      expect(ActivityType.SLEEP).toBe('SLEEP');
      expect(ActivityType.WORK).toBe('WORK');
      expect(ActivityType.EAT_BREAKFAST).toBe('EAT_BREAKFAST');
      expect(ActivityType.SOCIALIZE).toBe('SOCIALIZE');
    });

    test('RelationshipStatus should have all statuses', () => {
      expect(RelationshipStatus.STRANGER).toBe('STRANGER');
      expect(RelationshipStatus.ACQUAINTANCE).toBe('ACQUAINTANCE');
      expect(RelationshipStatus.FRIEND).toBe('FRIEND');
      expect(RelationshipStatus.RIVAL).toBe('RIVAL');
      expect(RelationshipStatus.ENEMY).toBe('ENEMY');
    });

    test('MemoryEventType should have all types', () => {
      expect(MemoryEventType.MET_PLAYER).toBe('MET_PLAYER');
      expect(MemoryEventType.HELPED_BY_PLAYER).toBe('HELPED_BY_PLAYER');
      expect(MemoryEventType.ATTACKED_BY_PLAYER).toBe('ATTACKED_BY_PLAYER');
      expect(MemoryEventType.TRADE_WITH_PLAYER).toBe('TRADE_WITH_PLAYER');
    });
  });

  // ============================================
  // NPCMemory TESTS
  // ============================================

  describe('NPCMemory', () => {
    test('should create memory', () => {
      const memory = new NPCMemory(MemoryEventType.MET_PLAYER, {
        targetId: 'player',
        importance: 5
      });

      expect(memory.eventType).toBe(MemoryEventType.MET_PLAYER);
      expect(memory.data.targetId).toBe('player');
      expect(memory.importance).toBe(5);
    });

    test('should calculate age', () => {
      const memory = new NPCMemory(MemoryEventType.MET_PLAYER, {});
      expect(memory.getAge()).toBeGreaterThanOrEqual(0);
    });

    test('should track recalls', () => {
      const memory = new NPCMemory(MemoryEventType.MET_PLAYER, {});
      memory.recall();
      memory.recall();
      expect(memory.recalled).toBe(2);
    });

    test('should serialize to JSON', () => {
      const memory = new NPCMemory(MemoryEventType.MET_PLAYER, { test: true });
      const json = memory.toJSON();
      expect(json.eventType).toBe(MemoryEventType.MET_PLAYER);
      expect(json.data.test).toBe(true);
    });

    test('should deserialize from JSON', () => {
      const data = {
        eventType: MemoryEventType.TRADE_WITH_PLAYER,
        data: { amount: 100 },
        timestamp: Date.now(),
        importance: 3,
        recalled: 1
      };
      const memory = NPCMemory.fromJSON(data);
      expect(memory.eventType).toBe(MemoryEventType.TRADE_WITH_PLAYER);
    });
  });

  // ============================================
  // NPC REGISTRATION TESTS
  // ============================================

  describe('NPC Registration', () => {
    test('should register NPC', () => {
      const result = npcBehavior.registerNPC({
        id: 'npc1',
        name: 'Test NPC',
        position: { x: 100, z: 100 }
      });

      expect(result).toBe(true);
      expect(npcBehavior.getNPC('npc1')).not.toBeNull();
    });

    test('should reject invalid NPC', () => {
      expect(npcBehavior.registerNPC(null)).toBe(false);
      expect(npcBehavior.registerNPC({})).toBe(false);
    });

    test('should unregister NPC', () => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test' });
      npcBehavior.unregisterNPC('npc1');
      expect(npcBehavior.getNPC('npc1')).toBeNull();
    });
  });

  // ============================================
  // NPC RETRIEVAL TESTS
  // ============================================

  describe('NPC Retrieval', () => {
    beforeEach(() => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'NPC1' });
      npcBehavior.registerNPC({ id: 'npc2', name: 'NPC2' });
    });

    test('should get all NPCs', () => {
      expect(npcBehavior.getAllNPCs().length).toBe(2);
    });

    test('should return null for unknown NPC', () => {
      expect(npcBehavior.getNPC('unknown')).toBeNull();
    });
  });

  // ============================================
  // RELATIONSHIP TESTS
  // ============================================

  describe('Relationships', () => {
    beforeEach(() => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'NPC1' });
      npcBehavior.registerNPC({ id: 'npc2', name: 'NPC2' });
    });

    test('should get relationship value', () => {
      const value = npcBehavior.getRelationship('npc1', 'npc2');
      expect(typeof value).toBe('number');
    });

    test('should modify relationship', () => {
      npcBehavior.modifyRelationship('npc1', 'npc2', 20);
      const value = npcBehavior.getRelationship('npc1', 'npc2');
      expect(value).toBe(20);
    });

    test('should cap relationship at 100', () => {
      npcBehavior.modifyRelationship('npc1', 'npc2', 200);
      const value = npcBehavior.getRelationship('npc1', 'npc2');
      expect(value).toBeLessThanOrEqual(100);
    });

    test('should cap relationship at -100', () => {
      npcBehavior.modifyRelationship('npc1', 'npc2', -200);
      const value = npcBehavior.getRelationship('npc1', 'npc2');
      expect(value).toBeGreaterThanOrEqual(-100);
    });

    test('should get relationship status', () => {
      expect(npcBehavior.getRelationshipStatus(0)).toBe(RelationshipStatus.STRANGER);
      expect(npcBehavior.getRelationshipStatus(50)).toBe(RelationshipStatus.FRIEND);
      expect(npcBehavior.getRelationshipStatus(-60)).toBe(RelationshipStatus.ENEMY);
    });
  });

  // ============================================
  // MEMORY TESTS
  // ============================================

  describe('Memory System', () => {
    beforeEach(() => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'NPC1' });
    });

    test('should add memory', () => {
      npcBehavior.addMemory('npc1', MemoryEventType.MET_PLAYER, {
        targetId: 'player'
      });

      const memories = npcBehavior.getMemories('npc1');
      expect(memories.length).toBe(1);
    });

    test('should filter memories by type', () => {
      npcBehavior.addMemory('npc1', MemoryEventType.MET_PLAYER, {});
      npcBehavior.addMemory('npc1', MemoryEventType.TRADE_WITH_PLAYER, {});

      const tradeMemories = npcBehavior.getMemories('npc1', {
        eventType: MemoryEventType.TRADE_WITH_PLAYER
      });
      expect(tradeMemories.length).toBe(1);
    });
  });

  // ============================================
  // GAME STATE TESTS
  // ============================================

  describe('Game State', () => {
    test('should update game state', () => {
      npcBehavior.setGameState({
        hour: 14,
        season: 'WINTER'
      });
      expect(npcBehavior.currentHour).toBe(14);
      expect(npcBehavior.currentSeason).toBe('WINTER');
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('Update System', () => {
    test('should update all NPCs', () => {
      npcBehavior.registerNPC({
        id: 'npc1',
        name: 'NPC1',
        position: { x: 100, z: 100 }
      });

      npcBehavior.update(16, {
        player: { position: { x: 200, z: 200 } }
      });
      // Verify no errors
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    test('should add listener', () => {
      const listener = jest.fn();
      npcBehavior.addListener(listener);
      expect(npcBehavior.listeners).toContain(listener);
    });

    test('should remove listener', () => {
      const listener = jest.fn();
      npcBehavior.addListener(listener);
      npcBehavior.removeListener(listener);
      expect(npcBehavior.listeners).not.toContain(listener);
    });

    test('should emit memoryCreated event', () => {
      const listener = jest.fn();
      npcBehavior.addListener(listener);

      npcBehavior.registerNPC({ id: 'npc1', name: 'NPC1' });
      npcBehavior.addMemory('npc1', MemoryEventType.MET_PLAYER, {});

      expect(listener).toHaveBeenCalledWith('memoryCreated', expect.objectContaining({
        npcId: 'npc1',
        eventType: MemoryEventType.MET_PLAYER
      }));
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      npcBehavior.registerNPC({
        id: 'npc1',
        name: 'Test NPC',
        position: { x: 100, z: 200 }
      });

      const json = npcBehavior.toJSON();
      expect(json.npcs).toHaveProperty('npc1');
    });

    test('should deserialize from JSON', () => {
      const data = {
        npcs: {
          npc1: {
            id: 'npc1',
            name: 'Restored NPC',
            position: { x: 100, z: 200 },
            personality: {},
            alive: true
          }
        },
        relationships: {},
        memories: {}
      };

      npcBehavior.fromJSON(data);

      const npc = npcBehavior.getNPC('npc1');
      expect(npc).not.toBeNull();
      expect(npc.name).toBe('Restored NPC');
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should handle full NPC lifecycle', () => {
      // Register NPC
      npcBehavior.registerNPC({
        id: 'merchant1',
        name: 'Merchant',
        position: { x: 100, z: 100 }
      });

      // Add memory
      npcBehavior.addMemory('merchant1', MemoryEventType.TRADE_WITH_PLAYER, {
        amount: 50
      });

      // Update
      npcBehavior.update(16, {
        player: { position: { x: 150, z: 150 } }
      });

      // Verify state
      const npc = npcBehavior.getNPC('merchant1');
      expect(npc).not.toBeNull();

      const memories = npcBehavior.getMemories('merchant1');
      expect(memories.length).toBeGreaterThan(0);
    });
  });
});
