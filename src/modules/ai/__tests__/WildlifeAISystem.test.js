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
      expect(AnimalBehavior.AGGRESSIVE).toBe('AGGRESSIVE');
      expect(AnimalBehavior.SKITTISH).toBe('SKITTISH');
      expect(AnimalBehavior.TERRITORIAL).toBe('TERRITORIAL');
      expect(AnimalBehavior.PREDATOR).toBe('PREDATOR');
      expect(AnimalBehavior.PREY).toBe('PREY');
    });

    test('ActivityPattern should have all patterns', () => {
      expect(ActivityPattern.DIURNAL).toBe('DIURNAL');
      expect(ActivityPattern.NOCTURNAL).toBe('NOCTURNAL');
      expect(ActivityPattern.CREPUSCULAR).toBe('CREPUSCULAR');
    });

    test('AnimalState should have all states', () => {
      expect(AnimalState.IDLE).toBe('IDLE');
      expect(AnimalState.GRAZING).toBe('GRAZING');
      expect(AnimalState.WANDERING).toBe('WANDERING');
      expect(AnimalState.FLEEING).toBe('FLEEING');
      expect(AnimalState.HUNTING).toBe('HUNTING');
      expect(AnimalState.SLEEPING).toBe('SLEEPING');
    });
  });

  // ============================================
  // HERD TESTS
  // ============================================

  describe('Herd', () => {
    test('should create herd with leader', () => {
      const herd = new Herd('leader1', 'deer');
      expect(herd.leaderId).toBe('leader1');
      expect(herd.species).toBe('deer');
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
      wildlifeAI.registerAnimal({ id: 'deer1', species: 'deer' });
      const animal = wildlifeAI.getAnimal('deer1');

      expect(animal.state).toBe(AnimalState.IDLE);
      expect(animal.alive).toBe(true);
      expect(animal.behavior).toBeDefined();
    });

    test('should unregister animal', () => {
      wildlifeAI.registerAnimal({ id: 'deer1', species: 'deer' });
      wildlifeAI.unregisterAnimal('deer1');
      expect(wildlifeAI.getAnimal('deer1')).toBeNull();
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

    test('should get animals by species', () => {
      const deer = wildlifeAI.getAnimalsBySpecies('deer');
      expect(deer.length).toBe(2);
    });

    test('should get living animals', () => {
      const deer2 = wildlifeAI.getAnimal('deer2');
      deer2.alive = false;

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
      const deer1 = wildlifeAI.getAnimal('deer1');
      const deer2 = wildlifeAI.getAnimal('deer2');

      expect(deer1.herdId).toBe(herdId);
      expect(deer2.herdId).toBe(herdId);
    });

    test('should add animal to herd', () => {
      const herdId = wildlifeAI.createHerd('deer1');
      wildlifeAI.addToHerd('deer2', herdId);

      const herd = wildlifeAI.herds.get(herdId);
      expect(herd.members.has('deer2')).toBe(true);
    });

    test('should get nearby animals for herding', () => {
      const nearby = wildlifeAI.getNearbyAnimals(
        { x: 100, z: 100 },
        50,
        'deer'
      );
      expect(nearby.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // BEHAVIOR TESTS
  // ============================================

  describe('Animal Behaviors', () => {
    test('should set flee target', () => {
      wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        behavior: AnimalBehavior.SKITTISH,
        position: { x: 100, z: 100 }
      });

      wildlifeAI.triggerFlee('deer1', { x: 50, z: 50 });
      const animal = wildlifeAI.getAnimal('deer1');

      expect(animal.state).toBe(AnimalState.FLEEING);
    });

    test('should determine if animal is active', () => {
      wildlifeAI.registerAnimal({
        id: 'deer1',
        species: 'deer',
        activityPattern: ActivityPattern.DIURNAL
      });

      wildlifeAI.setTimeOfDay(12); // Noon
      expect(wildlifeAI.isAnimalActive('deer1')).toBe(true);

      wildlifeAI.setTimeOfDay(0); // Midnight
      expect(wildlifeAI.isAnimalActive('deer1')).toBe(false);
    });

    test('should calculate flee direction', () => {
      const fleeDir = wildlifeAI._calculateFleeDirection(
        { x: 100, z: 100 },
        { x: 50, z: 50 }
      );

      // Should flee away from threat
      expect(fleeDir.x).toBeGreaterThan(0);
      expect(fleeDir.z).toBeGreaterThan(0);
    });
  });

  // ============================================
  // FLOCKING BEHAVIOR TESTS
  // ============================================

  describe('Flocking Behavior', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        wildlifeAI.registerAnimal({
          id: `bird${i}`,
          species: 'bird',
          position: { x: 100 + i * 10, z: 100 + i * 10 },
          velocity: { x: 1, z: 0 }
        });
      }
    });

    test('should calculate separation force', () => {
      const animal = wildlifeAI.getAnimal('bird0');
      const neighbors = wildlifeAI.getNearbyAnimals(animal.position, 50, 'bird');

      const separation = wildlifeAI._calculateSeparation(animal, neighbors);
      expect(separation).toHaveProperty('x');
      expect(separation).toHaveProperty('z');
    });

    test('should calculate alignment force', () => {
      const animal = wildlifeAI.getAnimal('bird0');
      const neighbors = wildlifeAI.getNearbyAnimals(animal.position, 50, 'bird');

      const alignment = wildlifeAI._calculateAlignment(animal, neighbors);
      expect(alignment).toHaveProperty('x');
      expect(alignment).toHaveProperty('z');
    });

    test('should calculate cohesion force', () => {
      const animal = wildlifeAI.getAnimal('bird0');
      const neighbors = wildlifeAI.getNearbyAnimals(animal.position, 50, 'bird');

      const cohesion = wildlifeAI._calculateCohesion(animal, neighbors);
      expect(cohesion).toHaveProperty('x');
      expect(cohesion).toHaveProperty('z');
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
        behavior: AnimalBehavior.PREDATOR
      });

      const animal = wildlifeAI.getAnimal('wolf1');
      expect(animal.behavior).toBe(AnimalBehavior.PREDATOR);
    });

    test('should identify prey', () => {
      wildlifeAI.registerAnimal({
        id: 'rabbit1',
        species: 'rabbit',
        behavior: AnimalBehavior.PREY
      });

      const animal = wildlifeAI.getAnimal('rabbit1');
      expect(animal.behavior).toBe(AnimalBehavior.PREY);
    });
  });

  // ============================================
  // TIME OF DAY TESTS
  // ============================================

  describe('Time of Day', () => {
    test('should set time of day', () => {
      wildlifeAI.setTimeOfDay(18);
      expect(wildlifeAI.timeOfDay).toBe(18);
    });

    test('should determine day/night', () => {
      wildlifeAI.setTimeOfDay(12);
      expect(wildlifeAI.isDay()).toBe(true);

      wildlifeAI.setTimeOfDay(0);
      expect(wildlifeAI.isDay()).toBe(false);
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

      wildlifeAI.update(16, {});
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
      animal.state = AnimalState.IDLE;

      wildlifeAI.update(16, {});
      // State should not change
      expect(animal.state).toBe(AnimalState.IDLE);
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    test('should add/remove listeners', () => {
      const listener = jest.fn();
      wildlifeAI.addListener(listener);
      expect(wildlifeAI.listeners).toContain(listener);

      wildlifeAI.removeListener(listener);
      expect(wildlifeAI.listeners).not.toContain(listener);
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should get statistics', () => {
      wildlifeAI.registerAnimal({ id: 'deer1', species: 'deer' });
      wildlifeAI.createHerd('deer1');

      const stats = wildlifeAI.getStatistics();
      expect(stats.totalAnimals).toBe(1);
      expect(stats.activeHerds).toBe(1);
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
        position: { x: 100, z: 200 }
      });

      const json = wildlifeAI.toJSON();
      expect(json.animals).toHaveProperty('deer1');
    });

    test('should deserialize from JSON', () => {
      const data = {
        animals: {
          deer1: {
            id: 'deer1',
            species: 'deer',
            position: { x: 100, z: 200 },
            state: AnimalState.GRAZING,
            alive: true
          }
        },
        herds: {}
      };

      wildlifeAI.fromJSON(data);

      const animal = wildlifeAI.getAnimal('deer1');
      expect(animal).not.toBeNull();
      expect(animal.state).toBe(AnimalState.GRAZING);
    });
  });
});
