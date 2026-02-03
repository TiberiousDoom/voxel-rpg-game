/**
 * WildlifeAISystem.test.js - Comprehensive tests for Wildlife AI System
 */

import {
  WildlifeAISystem,
  Herd,
  AnimalBehavior,
  ActivityPattern,
  AnimalState
} from '../WildlifeAISystem.js';

// Mock dependencies
jest.mock('../PathfindingSystem.js', () => {
  const mockInstance = {
    findPath: jest.fn(() => ({
      success: true,
      path: [{ x: 100, z: 100 }, { x: 200, z: 200 }]
    }))
  };
  return {
    PathfindingSystem: jest.fn(() => mockInstance),
    distance: jest.fn((a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2)),
    normalize: jest.fn((v) => {
      const len = Math.sqrt(v.x * v.x + v.z * v.z);
      return len === 0 ? { x: 0, z: 0 } : { x: v.x / len, z: v.z / len };
    })
  };
});

jest.mock('../BehaviorTree.js', () => {
  const NodeStatus = {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    RUNNING: 'RUNNING'
  };

  class MockBehaviorTree {
    constructor() {}
    update() { return NodeStatus.SUCCESS; }
  }

  class MockBlackboard {
    constructor() { this.data = new Map(); }
    set(key, value) { this.data.set(key, value); }
    get(key) { return this.data.get(key); }
  }

  class MockBehaviorTreeBuilder {
    constructor() { this.tree = new MockBehaviorTree(); }
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

describe('WildlifeAISystem', () => {
  let wildlifeAI;

  beforeEach(() => {
    wildlifeAI = new WildlifeAISystem();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // ENUMS TESTS
  // ============================================

  describe('Enums', () => {
    test('AnimalBehavior should have all behaviors', () => {
      expect(AnimalBehavior.PASSIVE).toBe('PASSIVE');
      expect(AnimalBehavior.NEUTRAL).toBe('NEUTRAL');
      expect(AnimalBehavior.AGGRESSIVE).toBe('AGGRESSIVE');
      expect(AnimalBehavior.HERD).toBe('HERD');
    });

    test('ActivityPattern should have all patterns', () => {
      expect(ActivityPattern.DIURNAL).toBe('DIURNAL');
      expect(ActivityPattern.NOCTURNAL).toBe('NOCTURNAL');
      expect(ActivityPattern.CREPUSCULAR).toBe('CREPUSCULAR');
      expect(ActivityPattern.ALWAYS).toBe('ALWAYS');
    });

    test('AnimalState should have all states', () => {
      expect(AnimalState.IDLE).toBe('IDLE');
      expect(AnimalState.GRAZING).toBe('GRAZING');
      expect(AnimalState.WANDERING).toBe('WANDERING');
      expect(AnimalState.FLEEING).toBe('FLEEING');
      expect(AnimalState.HUNTING).toBe('HUNTING');
      expect(AnimalState.RESTING).toBe('RESTING');
      expect(AnimalState.FOLLOWING_HERD).toBe('FOLLOWING_HERD');
      expect(AnimalState.DEFENDING_TERRITORY).toBe('DEFENDING_TERRITORY');
      expect(AnimalState.DEAD).toBe('DEAD');
    });
  });

  // ============================================
  // HERD TESTS
  // ============================================

  describe('Herd', () => {
    test('should create herd with leader', () => {
      const herd = new Herd('leader1', 'deer');
      expect(herd.leaderId).toBe('leader1');
      expect(herd.animalType).toBe('deer');
      expect(herd.members.has('leader1')).toBe(true);
    });

    test('should add member', () => {
      const herd = new Herd('leader1', 'deer');
      herd.addMember('member1');
      expect(herd.members.has('member1')).toBe(true);
      expect(herd.size).toBe(2);
    });

    test('should remove member', () => {
      const herd = new Herd('leader1', 'deer');
      herd.addMember('member1');
      herd.removeMember('member1');
      expect(herd.members.has('member1')).toBe(false);
    });

    test('should transfer leadership', () => {
      const herd = new Herd('leader1', 'deer');
      herd.addMember('member1');
      herd.removeMember('leader1');
      expect(herd.leaderId).toBe('member1');
    });
  });

  // ============================================
  // ANIMAL REGISTRATION TESTS
  // ============================================

  describe('Animal Registration', () => {
    test('should register animal', () => {
      const result = wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        position: { x: 100, z: 100 }
      });

      expect(result).toBe(true);
      expect(wildlifeAI.getAnimal('deer1')).not.toBeNull();
    });

    test('should set default values', () => {
      wildlifeAI.registerAnimal({ id: 'animal1', species: 'deer' });
      const animal = wildlifeAI.getAnimal('animal1');

      expect(animal.state).toBe(AnimalState.IDLE);
      expect(animal.alive).toBe(true);
    });

    test('should unregister animal', () => {
      wildlifeAI.registerAnimal({ id: 'deer1', species: 'deer' });
      wildlifeAI.unregisterAnimal('deer1');
      expect(wildlifeAI.getAnimal('deer1')).toBeNull();
    });

    test('should reject invalid animal', () => {
      expect(wildlifeAI.registerAnimal(null)).toBe(false);
      expect(wildlifeAI.registerAnimal({})).toBe(false);
    });
  });

  // ============================================
  // ANIMAL RETRIEVAL TESTS
  // ============================================

  describe('Animal Retrieval', () => {
    beforeEach(() => {
      wildlifeAI.registerAnimal({ id: 'deer1', species: 'deer' });
      wildlifeAI.registerAnimal({ id: 'deer2', species: 'deer' });
      wildlifeAI.registerAnimal({ id: 'wolf1', species: 'wolf' });
    });

    test('should get all animals', () => {
      expect(wildlifeAI.getAllAnimals().length).toBe(3);
    });

    test('should get living animals', () => {
      const deer1 = wildlifeAI.getAnimal('deer1');
      deer1.alive = false;
      deer1.state = AnimalState.DEAD;

      const living = wildlifeAI.getLivingAnimals();
      expect(living.length).toBe(2);
    });
  });

  // ============================================
  // HERD MANAGEMENT TESTS
  // ============================================

  describe('Herd Management', () => {
    beforeEach(() => {
      wildlifeAI.registerAnimal({ id: 'deer1', species: 'deer', position: { x: 100, z: 100 } });
      wildlifeAI.registerAnimal({ id: 'deer2', species: 'deer', position: { x: 110, z: 100 } });
      wildlifeAI.registerAnimal({ id: 'deer3', species: 'deer', position: { x: 120, z: 100 } });
    });

    test('should create herd', () => {
      const herdId = wildlifeAI.createHerd('deer1', ['deer2', 'deer3']);
      expect(herdId).toBeTruthy();
      expect(wildlifeAI.herds.has(herdId)).toBe(true);
    });

    test('should assign herd to animals', () => {
      const herdId = wildlifeAI.createHerd('deer1', ['deer2']);

      const leader = wildlifeAI.getAnimal('deer1');
      const member = wildlifeAI.getAnimal('deer2');

      expect(leader.herdId).toBe(herdId);
      expect(leader.isHerdLeader).toBe(true);
      expect(member.herdId).toBe(herdId);
    });
  });

  // ============================================
  // PREDATOR/PREY TESTS
  // ============================================

  describe('Predator/Prey', () => {
    test('should identify predators', () => {
      wildlifeAI.registerAnimal({
        id: 'wolf1',
        species: 'wolf',
        behavior: AnimalBehavior.AGGRESSIVE
      });

      const animal = wildlifeAI.getAnimal('wolf1');
      expect(animal.behavior).toBe(AnimalBehavior.AGGRESSIVE);
    });

    test('should identify prey', () => {
      wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        behavior: AnimalBehavior.PASSIVE
      });

      const animal = wildlifeAI.getAnimal('deer1');
      expect(animal.behavior).toBe(AnimalBehavior.PASSIVE);
    });
  });

  // ============================================
  // GAME STATE TESTS
  // ============================================

  describe('Game State', () => {
    test('should set game state', () => {
      wildlifeAI.setGameState({ timeOfDay: 12, season: 'SUMMER' });
      expect(wildlifeAI.currentHour).toBe(12);
      expect(wildlifeAI.currentSeason).toBe('SUMMER');
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('Update System', () => {
    test('should update all animals', () => {
      wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        position: { x: 100, z: 100 }
      });

      wildlifeAI.update(16, { player: { position: { x: 500, z: 500 } } });
      // Verify no errors
    });

    test('should skip dead animals', () => {
      wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        position: { x: 100, z: 100 }
      });

      const animal = wildlifeAI.getAnimal('deer1');
      animal.alive = false;
      animal.state = AnimalState.DEAD;

      wildlifeAI.update(16, {});
      // Should not throw
    });
  });

  // ============================================
  // DAMAGE TESTS
  // ============================================

  describe('Damage System', () => {
    beforeEach(() => {
      wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        health: 100,
        maxHealth: 100
      });
    });

    test('should deal damage', () => {
      wildlifeAI.dealDamage('deer1', 30);
      const animal = wildlifeAI.getAnimal('deer1');
      expect(animal.health).toBe(70);
    });

    test('should kill animal at 0 health', () => {
      wildlifeAI.dealDamage('deer1', 150);
      const animal = wildlifeAI.getAnimal('deer1');
      expect(animal.alive).toBe(false);
      expect(animal.state).toBe(AnimalState.DEAD);
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    test('should add listener', () => {
      const listener = jest.fn();
      wildlifeAI.addListener(listener);
      expect(wildlifeAI.listeners).toContain(listener);
    });

    test('should emit animalDied event', () => {
      const listener = jest.fn();
      wildlifeAI.addListener(listener);

      wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        health: 50
      });
      wildlifeAI.dealDamage('deer1', 100);

      expect(listener).toHaveBeenCalledWith('animalDied', expect.objectContaining({
        animalId: 'deer1'
      }));
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should get statistics', () => {
      wildlifeAI.registerAnimal({ id: 'deer1', species: 'deer' });

      const stats = wildlifeAI.getStatistics();
      expect(stats.animalsManaged).toBe(1);
      expect(stats).toHaveProperty('herdsActive');
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        position: { x: 100, z: 200 },
        health: 80
      });

      const json = wildlifeAI.toJSON();
      expect(json.animals).toHaveProperty('deer1');
      expect(json.animals['deer1'].health).toBe(80);
    });

    test('should deserialize from JSON', () => {
      const data = {
        animals: {
          deer1: {
            id: 'deer1',
            species: 'deer',
            position: { x: 100, z: 200 },
            health: 80,
            maxHealth: 100,
            state: AnimalState.GRAZING,
            alive: true
          }
        },
        herds: {}
      };

      wildlifeAI.fromJSON(data);

      const animal = wildlifeAI.getAnimal('deer1');
      expect(animal).not.toBeNull();
      expect(animal.health).toBe(80);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should handle full animal lifecycle', () => {
      wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        position: { x: 100, z: 100 },
        health: 100
      });

      wildlifeAI.update(16, { player: { position: { x: 500, z: 500 } } });

      wildlifeAI.dealDamage('deer1', 30);

      const animal = wildlifeAI.getAnimal('deer1');
      expect(animal.health).toBe(70);
    });

    test('should handle herd creation and management', () => {
      wildlifeAI.registerAnimal({ id: 'deer1', species: 'deer', position: { x: 100, z: 100 } });
      wildlifeAI.registerAnimal({ id: 'deer2', species: 'deer', position: { x: 110, z: 100 } });
      wildlifeAI.registerAnimal({ id: 'deer3', species: 'deer', position: { x: 120, z: 100 } });

      const herdId = wildlifeAI.createHerd('deer1', ['deer2', 'deer3']);

      const stats = wildlifeAI.getStatistics();
      expect(stats.herdsActive).toBe(1);
    });
  });
});
