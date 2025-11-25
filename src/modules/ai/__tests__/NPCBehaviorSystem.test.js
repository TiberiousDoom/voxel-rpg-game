/**
 * NPCBehaviorSystem.test.js - Comprehensive tests for Enhanced NPC Behavior System
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
    test('PersonalityTraits should have all traits', () => {
      expect(PersonalityTraits.FRIENDLY).toBe('FRIENDLY');
      expect(PersonalityTraits.SHY).toBe('SHY');
      expect(PersonalityTraits.AGGRESSIVE).toBe('AGGRESSIVE');
      expect(PersonalityTraits.HELPFUL).toBe('HELPFUL');
      expect(PersonalityTraits.GREEDY).toBe('GREEDY');
      expect(PersonalityTraits.CURIOUS).toBe('CURIOUS');
    });

    test('ActivityType should have all activities', () => {
      expect(ActivityType.IDLE).toBe('IDLE');
      expect(ActivityType.WORKING).toBe('WORKING');
      expect(ActivityType.EATING).toBe('EATING');
      expect(ActivityType.SLEEPING).toBe('SLEEPING');
      expect(ActivityType.SOCIALIZING).toBe('SOCIALIZING');
      expect(ActivityType.PATROLLING).toBe('PATROLLING');
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
      expect(MemoryEventType.TRADED).toBe('TRADED');
      expect(MemoryEventType.HELPED).toBe('HELPED');
      expect(MemoryEventType.ATTACKED).toBe('ATTACKED');
      expect(MemoryEventType.WITNESSED).toBe('WITNESSED');
    });
  });

  // ============================================
  // NPC MEMORY TESTS
  // ============================================

  describe('NPCMemory', () => {
    let memory;

    beforeEach(() => {
      memory = new NPCMemory('npc1');
    });

    test('should create memory', () => {
      expect(memory.ownerId).toBe('npc1');
    });

    test('should add memory entry', () => {
      memory.addMemory({
        type: MemoryEventType.MET_PLAYER,
        targetId: 'player',
        details: { location: 'market' }
      });

      expect(memory.memories.length).toBe(1);
    });

    test('should get memories by type', () => {
      memory.addMemory({ type: MemoryEventType.MET_PLAYER, targetId: 'player' });
      memory.addMemory({ type: MemoryEventType.TRADED, targetId: 'player' });

      const trades = memory.getMemoriesByType(MemoryEventType.TRADED);
      expect(trades.length).toBe(1);
    });

    test('should get memories by target', () => {
      memory.addMemory({ type: MemoryEventType.MET_PLAYER, targetId: 'player' });
      memory.addMemory({ type: MemoryEventType.MET_PLAYER, targetId: 'npc2' });

      const playerMemories = memory.getMemoriesByTarget('player');
      expect(playerMemories.length).toBe(1);
    });

    test('should forget old memories', () => {
      const oldTimestamp = Date.now() - 100000000;
      memory.memories.push({
        type: MemoryEventType.MET_PLAYER,
        targetId: 'player',
        timestamp: oldTimestamp
      });

      memory.forgetOldMemories(60000);
      expect(memory.memories.length).toBe(0);
    });

    test('should serialize to JSON', () => {
      memory.addMemory({ type: MemoryEventType.MET_PLAYER, targetId: 'player' });
      const json = memory.toJSON();

      expect(json.ownerId).toBe('npc1');
      expect(json.memories.length).toBe(1);
    });
  });

  // ============================================
  // NPC REGISTRATION TESTS
  // ============================================

  describe('NPC Registration', () => {
    test('should register NPC', () => {
      const result = npcBehavior.registerNPC({
        id: 'npc1',
        name: 'Village Elder',
        position: { x: 100, z: 100 }
      });

      expect(result).toBe(true);
      expect(npcBehavior.getNPC('npc1')).not.toBeNull();
    });

    test('should set default values', () => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC' });
      const npc = npcBehavior.getNPC('npc1');

      expect(npc.activity).toBe(ActivityType.IDLE);
      expect(npc.mood).toBeDefined();
      expect(npc.relationships).toBeDefined();
    });

    test('should unregister NPC', () => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC' });
      npcBehavior.unregisterNPC('npc1');

      expect(npcBehavior.getNPC('npc1')).toBeNull();
    });

    test('should reject invalid NPC', () => {
      expect(npcBehavior.registerNPC(null)).toBe(false);
      expect(npcBehavior.registerNPC({})).toBe(false);
    });
  });

  // ============================================
  // NPC RETRIEVAL TESTS
  // ============================================

  describe('NPC Retrieval', () => {
    beforeEach(() => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Guard', profession: 'guard' });
      npcBehavior.registerNPC({ id: 'npc2', name: 'Merchant', profession: 'merchant' });
      npcBehavior.registerNPC({ id: 'npc3', name: 'Farmer', profession: 'farmer' });
    });

    test('should get all NPCs', () => {
      expect(npcBehavior.getAllNPCs().length).toBe(3);
    });

    test('should get NPCs by profession', () => {
      const guards = npcBehavior.getNPCsByProfession('guard');
      expect(guards.length).toBe(1);
    });

    test('should get nearby NPCs', () => {
      const nearby = npcBehavior.getNearbyNPCs({ x: 100, z: 100 }, 200);
      expect(nearby.length).toBe(3);
    });
  });

  // ============================================
  // RELATIONSHIP TESTS
  // ============================================

  describe('Relationships', () => {
    let npc;

    beforeEach(() => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC' });
      npc = npcBehavior.getNPC('npc1');
    });

    test('should set relationship', () => {
      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.FRIEND, 75);

      const relationship = npcBehavior.getRelationship('npc1', 'player');
      expect(relationship.status).toBe(RelationshipStatus.FRIEND);
      expect(relationship.value).toBe(75);
    });

    test('should modify relationship value', () => {
      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.ACQUAINTANCE, 50);
      npcBehavior.modifyRelationship('npc1', 'player', 20);

      const relationship = npcBehavior.getRelationship('npc1', 'player');
      expect(relationship.value).toBe(70);
    });

    test('should auto-update status based on value', () => {
      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.STRANGER, 0);
      npcBehavior.modifyRelationship('npc1', 'player', 80);

      const relationship = npcBehavior.getRelationship('npc1', 'player');
      expect(relationship.status).toBe(RelationshipStatus.FRIEND);
    });

    test('should become enemy on very low relationship', () => {
      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.STRANGER, 50);
      npcBehavior.modifyRelationship('npc1', 'player', -80);

      const relationship = npcBehavior.getRelationship('npc1', 'player');
      expect(relationship.status).toBe(RelationshipStatus.ENEMY);
    });

    test('should get relationship status', () => {
      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.FRIEND, 75);
      expect(npcBehavior.getRelationshipStatus('npc1', 'player')).toBe(RelationshipStatus.FRIEND);
    });

    test('should return STRANGER for unknown relationship', () => {
      expect(npcBehavior.getRelationshipStatus('npc1', 'unknown')).toBe(RelationshipStatus.STRANGER);
    });
  });

  // ============================================
  // PERSONALITY TESTS
  // ============================================

  describe('Personality', () => {
    test('should set personality traits', () => {
      npcBehavior.registerNPC({
        id: 'npc1',
        name: 'Friendly NPC',
        personality: [PersonalityTraits.FRIENDLY, PersonalityTraits.HELPFUL]
      });

      const npc = npcBehavior.getNPC('npc1');
      expect(npc.personality).toContain(PersonalityTraits.FRIENDLY);
      expect(npc.personality).toContain(PersonalityTraits.HELPFUL);
    });

    test('should check if has personality trait', () => {
      npcBehavior.registerNPC({
        id: 'npc1',
        name: 'Test NPC',
        personality: [PersonalityTraits.GREEDY]
      });

      expect(npcBehavior.hasPersonalityTrait('npc1', PersonalityTraits.GREEDY)).toBe(true);
      expect(npcBehavior.hasPersonalityTrait('npc1', PersonalityTraits.FRIENDLY)).toBe(false);
    });
  });

  // ============================================
  // MOOD TESTS
  // ============================================

  describe('Mood System', () => {
    let npc;

    beforeEach(() => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC', mood: 50 });
      npc = npcBehavior.getNPC('npc1');
    });

    test('should modify mood', () => {
      npcBehavior.modifyMood('npc1', 20);
      expect(npc.mood).toBe(70);
    });

    test('should cap mood at 100', () => {
      npcBehavior.modifyMood('npc1', 100);
      expect(npc.mood).toBe(100);
    });

    test('should not go below 0', () => {
      npcBehavior.modifyMood('npc1', -100);
      expect(npc.mood).toBe(0);
    });

    test('should get mood description', () => {
      npc.mood = 80;
      expect(npcBehavior.getMoodDescription('npc1')).toBe('happy');

      npc.mood = 20;
      expect(npcBehavior.getMoodDescription('npc1')).toBe('sad');

      npc.mood = 50;
      expect(npcBehavior.getMoodDescription('npc1')).toBe('neutral');
    });
  });

  // ============================================
  // SCHEDULE TESTS
  // ============================================

  describe('Schedule System', () => {
    test('should set schedule', () => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC' });

      const schedule = [
        { hour: 6, activity: ActivityType.WAKING },
        { hour: 8, activity: ActivityType.WORKING },
        { hour: 12, activity: ActivityType.EATING },
        { hour: 18, activity: ActivityType.SOCIALIZING },
        { hour: 22, activity: ActivityType.SLEEPING }
      ];

      npcBehavior.setSchedule('npc1', schedule);
      const npc = npcBehavior.getNPC('npc1');

      expect(npc.schedule.length).toBe(5);
    });

    test('should get current scheduled activity', () => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC' });
      npcBehavior.setSchedule('npc1', [
        { hour: 0, activity: ActivityType.SLEEPING },
        { hour: 8, activity: ActivityType.WORKING }
      ]);

      npcBehavior.setTimeOfDay(12);
      const activity = npcBehavior.getScheduledActivity('npc1');
      expect(activity).toBe(ActivityType.WORKING);
    });
  });

  // ============================================
  // DIALOGUE TESTS
  // ============================================

  describe('Dialogue System', () => {
    test('should get greeting based on relationship', () => {
      npcBehavior.registerNPC({
        id: 'npc1',
        name: 'Test NPC',
        dialogues: {
          greetings: {
            stranger: 'Who are you?',
            friend: 'Hello, friend!'
          }
        }
      });

      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.STRANGER, 0);
      let greeting = npcBehavior.getGreeting('npc1', 'player');
      expect(greeting).toBe('Who are you?');

      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.FRIEND, 75);
      greeting = npcBehavior.getGreeting('npc1', 'player');
      expect(greeting).toBe('Hello, friend!');
    });

    test('should get dialogue options', () => {
      npcBehavior.registerNPC({
        id: 'npc1',
        name: 'Merchant',
        profession: 'merchant'
      });

      const options = npcBehavior.getDialogueOptions('npc1', 'player');
      expect(Array.isArray(options)).toBe(true);
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('Update System', () => {
    test('should update all NPCs', () => {
      npcBehavior.registerNPC({
        id: 'npc1',
        name: 'Test NPC',
        position: { x: 100, z: 100 }
      });

      const gameState = {
        player: { position: { x: 200, z: 200 } }
      };

      npcBehavior.update(16, gameState);
      // Verify no errors
    });

    test('should update time of day', () => {
      npcBehavior.setTimeOfDay(12);
      expect(npcBehavior.timeOfDay).toBe(12);
    });
  });

  // ============================================
  // INTERACTION TESTS
  // ============================================

  describe('Interaction', () => {
    test('should record interaction in memory', () => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC' });
      npcBehavior.recordInteraction('npc1', 'player', MemoryEventType.MET_PLAYER);

      const npc = npcBehavior.getNPC('npc1');
      const memories = npc.memory.getMemoriesByType(MemoryEventType.MET_PLAYER);
      expect(memories.length).toBe(1);
    });

    test('should affect relationship on interaction', () => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC' });
      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.STRANGER, 0);

      npcBehavior.recordInteraction('npc1', 'player', MemoryEventType.HELPED, {
        relationshipChange: 20
      });

      const relationship = npcBehavior.getRelationship('npc1', 'player');
      expect(relationship.value).toBe(20);
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    test('should add/remove listeners', () => {
      const listener = jest.fn();
      npcBehavior.addListener(listener);
      expect(npcBehavior.listeners).toContain(listener);

      npcBehavior.removeListener(listener);
      expect(npcBehavior.listeners).not.toContain(listener);
    });

    test('should emit relationshipChanged event', () => {
      const listener = jest.fn();
      npcBehavior.addListener(listener);

      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC' });
      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.FRIEND, 75);

      expect(listener).toHaveBeenCalledWith('relationshipChanged', expect.objectContaining({
        npcId: 'npc1',
        targetId: 'player'
      }));
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should get statistics', () => {
      npcBehavior.registerNPC({ id: 'npc1', name: 'Test NPC' });

      const stats = npcBehavior.getStatistics();
      expect(stats.totalNPCs).toBe(1);
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
        mood: 75
      });
      npcBehavior.setRelationship('npc1', 'player', RelationshipStatus.FRIEND, 80);

      const json = npcBehavior.toJSON();
      expect(json.npcs).toHaveProperty('npc1');
      expect(json.npcs['npc1'].mood).toBe(75);
    });

    test('should deserialize from JSON', () => {
      const data = {
        npcs: {
          npc1: {
            id: 'npc1',
            name: 'Test NPC',
            position: { x: 100, z: 200 },
            mood: 60,
            activity: ActivityType.WORKING,
            relationships: {
              player: { status: RelationshipStatus.FRIEND, value: 75 }
            },
            memory: { ownerId: 'npc1', memories: [] }
          }
        }
      };

      npcBehavior.fromJSON(data);

      const npc = npcBehavior.getNPC('npc1');
      expect(npc).not.toBeNull();
      expect(npc.mood).toBe(60);
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
        name: 'Tom the Merchant',
        profession: 'merchant',
        personality: [PersonalityTraits.FRIENDLY, PersonalityTraits.GREEDY],
        position: { x: 100, z: 100 },
        mood: 50
      });

      // Set schedule
      npcBehavior.setSchedule('merchant1', [
        { hour: 8, activity: ActivityType.WORKING },
        { hour: 20, activity: ActivityType.SLEEPING }
      ]);

      // First meeting
      npcBehavior.recordInteraction('merchant1', 'player', MemoryEventType.MET_PLAYER);

      // Trade interaction
      npcBehavior.recordInteraction('merchant1', 'player', MemoryEventType.TRADED, {
        relationshipChange: 10
      });

      // Check relationship improved
      const relationship = npcBehavior.getRelationship('merchant1', 'player');
      expect(relationship.value).toBeGreaterThan(0);

      // Update NPC
      npcBehavior.setTimeOfDay(12);
      npcBehavior.update(16, {
        player: { position: { x: 150, z: 150 } }
      });

      const npc = npcBehavior.getNPC('merchant1');
      expect(npc.activity).toBe(ActivityType.WORKING);
    });
  });
});
