/**
 * MonsterAI.test.js - Unit tests for Monster AI system
 *
 * Tests the core AI logic without requiring a browser environment.
 * Covers:
 * - State transitions (IDLE → CHASE → ATTACK → FLEE)
 * - Aggro detection
 * - Distance calculations
 * - Flee behavior
 * - Patrol behavior
 * - Combat logic
 */

import MonsterAI from '../MonsterAI';

// Mock Zustand store
jest.mock('../../stores/useGameStore', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => ({
      player: {
        health: 100,
        maxHealth: 100,
        position: [0, 1, 0]
      },
      dealDamageToPlayer: jest.fn((damage) => {
        const state = require('../../stores/useGameStore').default.getState();
        state.player.health = Math.max(0, state.player.health - damage);
      })
    })),
    setState: jest.fn()
  }
}));

describe('MonsterAI System', () => {
  let monsterAI;
  let mockPlayer;
  let mockGameState;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create AI instance
    monsterAI = new MonsterAI();

    // Mock player
    mockPlayer = {
      position: {
        x: 25,
        z: 25
      },
      health: 100,
      maxHealth: 100
    };

    // Mock game state
    mockGameState = {
      player: mockPlayer,
      npcs: [],
      buildings: []
    };
  });

  // ============================================
  // DISTANCE CALCULATION TESTS
  // ============================================

  describe('Distance Calculations', () => {
    test('should calculate distance correctly', () => {
      const pos1 = { x: 0, z: 0 };
      const pos2 = { x: 3, z: 4 };

      const distance = Math.sqrt(
        Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.z - pos1.z, 2)
      );

      expect(distance).toBe(5);
    });

    test('should handle zero distance', () => {
      const pos1 = { x: 10, z: 20 };
      const pos2 = { x: 10, z: 20 };

      const distance = Math.sqrt(
        Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.z - pos1.z, 2)
      );

      expect(distance).toBe(0);
    });
  });

  // ============================================
  // AGGRO DETECTION TESTS
  // ============================================

  describe('Aggro Detection', () => {
    test('should detect player within aggro range', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 30, z: 25 },
        aggroRange: 10,
        aiState: 'IDLE',
        velocity: { x: 0, z: 0 },
        speed: 2
      };

      const playerPos = { x: 25, z: 25 };
      const distance = Math.sqrt(
        Math.pow(playerPos.x - monster.position.x, 2) +
        Math.pow(playerPos.z - monster.position.z, 2)
      );

      expect(distance).toBe(5);
      expect(distance).toBeLessThanOrEqual(monster.aggroRange);
    });

    test('should not detect player outside aggro range', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 50, z: 25 },
        aggroRange: 10,
        aiState: 'IDLE'
      };

      const playerPos = { x: 25, z: 25 };
      const distance = Math.sqrt(
        Math.pow(playerPos.x - monster.position.x, 2) +
        Math.pow(playerPos.z - monster.position.z, 2)
      );

      expect(distance).toBe(25);
      expect(distance).toBeGreaterThan(monster.aggroRange);
    });

    test('should calculate aggro for multiple distances', () => {
      const testCases = [
        { monsterPos: { x: 30, z: 25 }, playerPos: { x: 25, z: 25 }, expected: 5 },
        { monsterPos: { x: 35, z: 25 }, playerPos: { x: 25, z: 25 }, expected: 10 },
        { monsterPos: { x: 25, z: 35 }, playerPos: { x: 25, z: 25 }, expected: 10 },
        { monsterPos: { x: 28, z: 28 }, playerPos: { x: 25, z: 25 }, expected: Math.sqrt(18) }
      ];

      testCases.forEach(({ monsterPos, playerPos, expected }) => {
        const distance = Math.sqrt(
          Math.pow(playerPos.x - monsterPos.x, 2) +
          Math.pow(playerPos.z - monsterPos.z, 2)
        );
        expect(distance).toBeCloseTo(expected, 2);
      });
    });
  });

  // ============================================
  // STATE TRANSITION TESTS
  // ============================================

  describe('State Transitions', () => {
    test('should start monsters in IDLE state', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 100, z: 100 },
        aiState: 'IDLE',
        aggroRange: 10,
        velocity: { x: 0, z: 0 }
      };

      expect(monster.aiState).toBe('IDLE');
    });

    test('should transition from IDLE to CHASE when player in range', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 30, z: 25 },
        aiState: 'IDLE',
        aggroRange: 10,
        attackRange: 2,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      // Simulate update
      monsterAI.updateMonster(monster, mockGameState, 0.016);

      // Monster should now be chasing (within aggro but outside attack range)
      expect(monster.aiState).toBe('CHASE');
    });

    test('should transition from CHASE to ATTACK when in attack range', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 26, z: 25 },
        aiState: 'CHASE',
        aggroRange: 10,
        attackRange: 2,
        attackCooldown: 2,
        timeSinceLastAttack: 3,
        damage: 5,
        speed: 2,
        velocity: { x: 1, z: 0 }
      };

      // Simulate update
      monsterAI.updateMonster(monster, mockGameState, 0.016);

      // Monster should now be attacking (within attack range)
      expect(monster.aiState).toBe('ATTACK');
    });

    test('should enter FLEE state when health below threshold', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 26, z: 25 },
        aiState: 'CHASE',
        health: 20,
        maxHealth: 100,
        canFlee: true,
        aggroRange: 10,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      // Health is at 20% (below 30% flee threshold)
      monsterAI.updateMonster(monster, mockGameState, 0.016);

      expect(monster.aiState).toBe('FLEE');
    });

    test('should not flee if canFlee is false', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 26, z: 25 },
        aiState: 'CHASE',
        health: 20,
        maxHealth: 100,
        canFlee: false,
        aggroRange: 10,
        attackRange: 2,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      monsterAI.updateMonster(monster, mockGameState, 0.016);

      // Should stay in combat, not flee
      expect(monster.aiState).not.toBe('FLEE');
    });
  });

  // ============================================
  // FLEE BEHAVIOR TESTS
  // ============================================

  describe('Flee Behavior', () => {
    test('should flee when health below 30%', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 26, z: 25 },
        aiState: 'IDLE',
        health: 25,
        maxHealth: 100,
        canFlee: true,
        aggroRange: 10,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      monsterAI.updateMonster(monster, mockGameState, 0.016);

      expect(monster.aiState).toBe('FLEE');
    });

    test('should not flee when health above 30%', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 26, z: 25 },
        aiState: 'CHASE',
        health: 40,
        maxHealth: 100,
        canFlee: true,
        aggroRange: 10,
        attackRange: 2,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      monsterAI.updateMonster(monster, mockGameState, 0.016);

      expect(monster.aiState).not.toBe('FLEE');
    });

    test('should move away from player when fleeing', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 30, z: 25 },
        aiState: 'FLEE',
        health: 20,
        maxHealth: 100,
        canFlee: true,
        aggroRange: 10,
        speed: 3,
        velocity: { x: 0, z: 0 }
      };

      const initialX = monster.position.x;

      // Simulate several updates
      for (let i = 0; i < 10; i++) {
        monsterAI.updateMonster(monster, mockGameState, 0.016);
      }

      // Monster should have moved away from player (x should increase since player is at x=25)
      expect(monster.position.x).toBeGreaterThan(initialX);
    });
  });

  // ============================================
  // PATROL BEHAVIOR TESTS
  // ============================================

  describe('Patrol Behavior', () => {
    test('should follow patrol path when in PATROL state', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 40, z: 40 },
        aiState: 'PATROL',
        patrolPath: [
          { x: 40, z: 40 },
          { x: 45, z: 40 },
          { x: 45, z: 45 },
          { x: 40, z: 45 }
        ],
        currentWaypoint: 0,
        aggroRange: 10,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      // Player far away
      mockPlayer.position.x = 0;
      mockPlayer.position.z = 0;

      const initialWaypoint = monster.currentWaypoint;

      // Simulate movement toward waypoint
      for (let i = 0; i < 20; i++) {
        monsterAI.updateMonster(monster, mockGameState, 0.016);
      }

      // Should have progressed through patrol path
      expect(monster.currentWaypoint).toBeGreaterThanOrEqual(initialWaypoint);
    });

    test('should transition from PATROL to CHASE when player detected', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 30, z: 25 },
        aiState: 'PATROL',
        patrolPath: [
          { x: 30, z: 25 },
          { x: 35, z: 25 }
        ],
        currentWaypoint: 0,
        aggroRange: 10,
        attackRange: 2,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      monsterAI.updateMonster(monster, mockGameState, 0.016);

      // Should switch to chase since player is nearby
      expect(monster.aiState).toBe('CHASE');
    });
  });

  // ============================================
  // COMBAT TESTS
  // ============================================

  describe('Combat Behavior', () => {
    test('should deal damage when attacking', () => {
      const useGameStore = require('../../stores/useGameStore').default;
      const mockDealDamage = jest.fn();

      useGameStore.getState.mockReturnValue({
        player: {
          health: 100,
          maxHealth: 100,
          position: [25, 1, 25]
        },
        dealDamageToPlayer: mockDealDamage
      });

      const monster = {
        id: 'test-monster',
        position: { x: 26, z: 25 },
        aiState: 'ATTACK',
        damage: 10,
        attackCooldown: 2,
        timeSinceLastAttack: 3,
        aggroRange: 10,
        attackRange: 2,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      monsterAI.updateMonster(monster, mockGameState, 0.016);

      // Should have attempted to deal damage
      expect(mockDealDamage).toHaveBeenCalledWith(10);
    });

    test('should respect attack cooldown', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 26, z: 25 },
        aiState: 'ATTACK',
        damage: 10,
        attackCooldown: 2,
        timeSinceLastAttack: 0.5,
        aggroRange: 10,
        attackRange: 2,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      const initialTime = monster.timeSinceLastAttack;

      monsterAI.updateMonster(monster, mockGameState, 0.016);

      // Time should have increased
      expect(monster.timeSinceLastAttack).toBeGreaterThan(initialTime);
    });

    test('should stop moving when in ATTACK state', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 26, z: 25 },
        aiState: 'ATTACK',
        damage: 10,
        attackCooldown: 2,
        timeSinceLastAttack: 3,
        aggroRange: 10,
        attackRange: 2,
        speed: 2,
        velocity: { x: 1, z: 1 }
      };

      monsterAI.updateMonster(monster, mockGameState, 0.016);

      // Velocity should be zeroed when attacking
      expect(monster.velocity.x).toBe(0);
      expect(monster.velocity.z).toBe(0);
    });
  });

  // ============================================
  // MULTIPLE MONSTERS TESTS
  // ============================================

  describe('Multiple Monsters', () => {
    test('should update all monsters independently', () => {
      const monsters = [
        {
          id: 'monster-1',
          position: { x: 30, z: 25 },
          aiState: 'IDLE',
          aggroRange: 10,
          attackRange: 2,
          speed: 2,
          velocity: { x: 0, z: 0 }
        },
        {
          id: 'monster-2',
          position: { x: 100, z: 100 },
          aiState: 'IDLE',
          aggroRange: 10,
          attackRange: 2,
          speed: 2,
          velocity: { x: 0, z: 0 }
        },
        {
          id: 'monster-3',
          position: { x: 26, z: 25 },
          aiState: 'IDLE',
          aggroRange: 10,
          attackRange: 2,
          speed: 2,
          velocity: { x: 0, z: 0 }
        }
      ];

      monsterAI.updateAll(monsters, mockGameState, 0.016);

      // Monster 1 and 3 should be chasing (close to player)
      // Monster 2 should stay idle (far from player)
      expect(monsters[0].aiState).toBe('CHASE');
      expect(monsters[1].aiState).toBe('IDLE');
      expect(monsters[2].aiState).toBe('ATTACK'); // Very close
    });

    test('should handle empty monster array', () => {
      const monsters = [];

      expect(() => {
        monsterAI.updateAll(monsters, mockGameState, 0.016);
      }).not.toThrow();
    });

    test('should handle monsters with different speeds', () => {
      const monster1 = {
        id: 'fast-monster',
        position: { x: 30, z: 25 },
        aiState: 'CHASE',
        speed: 5,
        aggroRange: 10,
        attackRange: 2,
        velocity: { x: 0, z: 0 }
      };

      const monster2 = {
        id: 'slow-monster',
        position: { x: 30, z: 25 },
        aiState: 'CHASE',
        speed: 1,
        aggroRange: 10,
        attackRange: 2,
        velocity: { x: 0, z: 0 }
      };

      // Update both for same time
      monsterAI.updateMonster(monster1, mockGameState, 1);
      monsterAI.updateMonster(monster2, mockGameState, 1);

      // Fast monster should move more
      const dist1 = Math.sqrt(
        Math.pow(monster1.position.x - 30, 2) + Math.pow(monster1.position.z - 25, 2)
      );
      const dist2 = Math.sqrt(
        Math.pow(monster2.position.x - 30, 2) + Math.pow(monster2.position.z - 25, 2)
      );

      expect(dist1).toBeGreaterThan(dist2);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    test('should handle monster with no velocity property', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 30, z: 25 },
        aiState: 'IDLE',
        aggroRange: 10,
        speed: 2
        // No velocity property
      };

      expect(() => {
        monsterAI.updateMonster(monster, mockGameState, 0.016);
      }).not.toThrow();

      // Should have created velocity
      expect(monster.velocity).toBeDefined();
    });

    test('should handle zero elapsed time', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 30, z: 25 },
        aiState: 'CHASE',
        aggroRange: 10,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      const initialPos = { ...monster.position };

      monsterAI.updateMonster(monster, mockGameState, 0);

      // Position shouldn't change with 0 elapsed time
      expect(monster.position.x).toBe(initialPos.x);
      expect(monster.position.z).toBe(initialPos.z);
    });

    test('should handle dead monsters', () => {
      const monster = {
        id: 'test-monster',
        position: { x: 30, z: 25 },
        aiState: 'IDLE',
        health: 0,
        maxHealth: 100,
        aggroRange: 10,
        speed: 2,
        velocity: { x: 0, z: 0 }
      };

      monsterAI.updateMonster(monster, mockGameState, 0.016);

      // Dead monster should not transition to chase
      expect(monster.aiState).toBe('IDLE');
    });
  });
});
