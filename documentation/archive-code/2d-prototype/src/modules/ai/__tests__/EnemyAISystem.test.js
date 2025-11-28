/**
 * EnemyAISystem.test.js - Comprehensive tests for Enemy AI System
 */

import {
  EnemyAISystem,
  EnemyState,
  CombatBehavior,
  FormationType,
  FactionRelation,
  ThreatEntry,
  EnemyGroup
} from '../EnemyAISystem.js';

// Mock dependencies
jest.mock('../PathfindingSystem.js', () => ({
  PathfindingSystem: jest.fn().mockImplementation(() => ({
    findPath: jest.fn(() => ({
      success: true,
      path: [{ x: 100, z: 100 }, { x: 200, z: 200 }]
    }))
  })),
  distance: jest.fn((a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2)),
  normalize: jest.fn((v) => {
    const len = Math.sqrt(v.x * v.x + v.z * v.z);
    return len === 0 ? { x: 0, z: 0 } : { x: v.x / len, z: v.z / len };
  })
}));

jest.mock('../PerceptionSystem.js', () => ({
  PerceptionSystem: jest.fn().mockImplementation(() => ({
    setWeather: jest.fn(),
    setNightMode: jest.fn(),
    update: jest.fn()
  }))
}));

jest.mock('../BehaviorTree.js', () => {
  const NodeStatus = {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    RUNNING: 'RUNNING'
  };

  class Blackboard {
    constructor() {
      this.data = new Map();
    }
    get(key) { return this.data.get(key); }
    set(key, value) { this.data.set(key, value); }
  }

  class MockBehaviorTree {
    constructor() {}
    update() { return NodeStatus.SUCCESS; }
  }

  class BehaviorTreeBuilder {
    constructor() { this.tree = new MockBehaviorTree(); }
    selector() { return this; }
    sequence() { return this; }
    check() { return this; }
    action() { return this; }
    end() { return this; }
    build() { return this.tree; }
  }

  return {
    BehaviorTree: MockBehaviorTree,
    BehaviorTreeBuilder,
    Selector: jest.fn(),
    Sequence: jest.fn(),
    Action: jest.fn(),
    Blackboard,
    NodeStatus
  };
});

describe('EnemyAISystem', () => {
  let enemyAI;
  let mockPerceptionSystem;

  beforeEach(() => {
    // Create mock perception system to inject
    mockPerceptionSystem = {
      setWeather: jest.fn(),
      setNightMode: jest.fn(),
      update: jest.fn()
    };

    // Inject mock via options
    enemyAI = new EnemyAISystem({
      perceptionSystem: mockPerceptionSystem
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // ENUMS TESTS
  // ============================================

  describe('Enums', () => {
    test('EnemyState should have all states', () => {
      expect(EnemyState.IDLE).toBe('IDLE');
      expect(EnemyState.PATROL).toBe('PATROL');
      expect(EnemyState.ALERT).toBe('ALERT');
      expect(EnemyState.CHASE).toBe('CHASE');
      expect(EnemyState.ATTACK).toBe('ATTACK');
      expect(EnemyState.FLANK).toBe('FLANK');
      expect(EnemyState.RETREAT).toBe('RETREAT');
      expect(EnemyState.FLEE).toBe('FLEE');
      expect(EnemyState.DEAD).toBe('DEAD');
    });

    test('CombatBehavior should have all behaviors', () => {
      expect(CombatBehavior.AGGRESSIVE).toBe('AGGRESSIVE');
      expect(CombatBehavior.DEFENSIVE).toBe('DEFENSIVE');
      expect(CombatBehavior.TACTICAL).toBe('TACTICAL');
      expect(CombatBehavior.SUPPORT).toBe('SUPPORT');
      expect(CombatBehavior.BERSERKER).toBe('BERSERKER');
    });

    test('FormationType should have all formations', () => {
      expect(FormationType.NONE).toBe('NONE');
      expect(FormationType.LINE).toBe('LINE');
      expect(FormationType.CIRCLE).toBe('CIRCLE');
      expect(FormationType.SURROUND).toBe('SURROUND');
      expect(FormationType.WEDGE).toBe('WEDGE');
      expect(FormationType.PROTECT_LEADER).toBe('PROTECT_LEADER');
    });

    test('FactionRelation should have all relations', () => {
      expect(FactionRelation.HOSTILE).toBe('HOSTILE');
      expect(FactionRelation.NEUTRAL).toBe('NEUTRAL');
      expect(FactionRelation.FRIENDLY).toBe('FRIENDLY');
    });
  });

  // ============================================
  // THREAT ENTRY TESTS
  // ============================================

  describe('ThreatEntry', () => {
    test('should create with initial threat', () => {
      const entry = new ThreatEntry('player', 50);
      expect(entry.targetId).toBe('player');
      expect(entry.threat).toBe(50);
    });

    test('should add threat', () => {
      const entry = new ThreatEntry('player', 10);
      entry.addThreat(20);
      expect(entry.threat).toBe(30);
    });

    test('should decay threat over time', () => {
      const entry = new ThreatEntry('player', 100);
      entry.decay(10, 5000); // 10 per second, 5 seconds
      expect(entry.threat).toBe(50);
    });

    test('should not decay below zero', () => {
      const entry = new ThreatEntry('player', 10);
      entry.decay(100, 5000);
      expect(entry.threat).toBe(0);
    });
  });

  // ============================================
  // ENEMY GROUP TESTS
  // ============================================

  describe('EnemyGroup', () => {
    test('should create with leader', () => {
      const group = new EnemyGroup('leader1');
      expect(group.leaderId).toBe('leader1');
      expect(group.members.has('leader1')).toBe(true);
    });

    test('should add member', () => {
      const group = new EnemyGroup('leader1');
      group.addMember('member1');
      expect(group.members.has('member1')).toBe(true);
      expect(group.size).toBe(2);
    });

    test('should remove member', () => {
      const group = new EnemyGroup('leader1');
      group.addMember('member1');
      group.removeMember('member1');
      expect(group.members.has('member1')).toBe(false);
    });

    test('should transfer leadership when leader removed', () => {
      const group = new EnemyGroup('leader1');
      group.addMember('member1');
      group.removeMember('leader1');
      expect(group.leaderId).toBe('member1');
    });
  });

  // ============================================
  // ENEMY REGISTRATION TESTS
  // ============================================

  describe('Enemy Registration', () => {
    test('should register enemy', () => {
      const result = enemyAI.registerEnemy({
        id: 'enemy1',
        position: { x: 100, z: 100 }
      });

      expect(result).toBe(true);
      expect(enemyAI.getEnemy('enemy1')).not.toBeNull();
    });

    test('should reject invalid enemy', () => {
      expect(enemyAI.registerEnemy(null)).toBe(false);
      expect(enemyAI.registerEnemy({})).toBe(false);
    });

    test('should set default values', () => {
      enemyAI.registerEnemy({ id: 'enemy1' });
      const enemy = enemyAI.getEnemy('enemy1');

      expect(enemy.health).toBe(100);
      expect(enemy.maxHealth).toBe(100);
      expect(enemy.state).toBe(EnemyState.IDLE);
      expect(enemy.alive).toBe(true);
    });

    test('should preserve provided values', () => {
      enemyAI.registerEnemy({
        id: 'enemy1',
        health: 50,
        maxHealth: 200,
        damage: 25
      });
      const enemy = enemyAI.getEnemy('enemy1');

      expect(enemy.health).toBe(50);
      expect(enemy.maxHealth).toBe(200);
      expect(enemy.damage).toBe(25);
    });

    test('should unregister enemy', () => {
      enemyAI.registerEnemy({ id: 'enemy1' });
      enemyAI.unregisterEnemy('enemy1');

      expect(enemyAI.getEnemy('enemy1')).toBeNull();
    });

    test('should update stats on registration', () => {
      enemyAI.registerEnemy({ id: 'enemy1' });
      expect(enemyAI.stats.enemiesManaged).toBe(1);
    });
  });

  // ============================================
  // ENEMY RETRIEVAL TESTS
  // ============================================

  describe('Enemy Retrieval', () => {
    beforeEach(() => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });
      enemyAI.registerEnemy({ id: 'enemy2', health: 0 });
    });

    test('should get all enemies', () => {
      const enemies = enemyAI.getAllEnemies();
      expect(enemies.length).toBe(2);
    });

    test('should get living enemies', () => {
      // Need to update alive status based on health
      const enemy2 = enemyAI.getEnemy('enemy2');
      enemy2.alive = false;

      const living = enemyAI.getLivingEnemies();
      expect(living.length).toBe(1);
      expect(living[0].id).toBe('enemy1');
    });
  });

  // ============================================
  // FACTION RELATION TESTS
  // ============================================

  describe('Faction Relations', () => {
    test('should have default relations', () => {
      expect(enemyAI.getFactionRelation('player', 'monsters')).toBe(FactionRelation.HOSTILE);
      expect(enemyAI.getFactionRelation('player', 'villagers')).toBe(FactionRelation.FRIENDLY);
    });

    test('should set faction relation', () => {
      enemyAI.setFactionRelation('player', 'bandits', FactionRelation.FRIENDLY);
      expect(enemyAI.getFactionRelation('player', 'bandits')).toBe(FactionRelation.FRIENDLY);
    });

    test('should set mutual relation', () => {
      enemyAI.setFactionRelation('custom1', 'custom2', FactionRelation.HOSTILE);
      expect(enemyAI.getFactionRelation('custom2', 'custom1')).toBe(FactionRelation.HOSTILE);
    });

    test('should return FRIENDLY for same faction', () => {
      expect(enemyAI.getFactionRelation('monsters', 'monsters')).toBe(FactionRelation.FRIENDLY);
    });

    test('should check hostility', () => {
      expect(enemyAI.areHostile('player', 'monsters')).toBe(true);
      expect(enemyAI.areHostile('player', 'villagers')).toBe(false);
    });
  });

  // ============================================
  // GROUP MANAGEMENT TESTS
  // ============================================

  describe('Group Management', () => {
    beforeEach(() => {
      enemyAI.registerEnemy({ id: 'leader', position: { x: 100, z: 100 } });
      enemyAI.registerEnemy({ id: 'member1', position: { x: 110, z: 100 } });
      enemyAI.registerEnemy({ id: 'member2', position: { x: 120, z: 100 } });
    });

    test('should create group', () => {
      const groupId = enemyAI.createGroup('leader', ['member1', 'member2']);
      expect(groupId).toBeTruthy();
      expect(enemyAI.groups.has(groupId)).toBe(true);
    });

    test('should set group ID on enemies', () => {
      const groupId = enemyAI.createGroup('leader', ['member1']);

      const leader = enemyAI.getEnemy('leader');
      const member = enemyAI.getEnemy('member1');

      expect(leader.groupId).toBe(groupId);
      expect(member.groupId).toBe(groupId);
    });

    test('should mark leader', () => {
      enemyAI.createGroup('leader', ['member1']);
      const leader = enemyAI.getEnemy('leader');
      const member = enemyAI.getEnemy('member1');

      expect(leader.isLeader).toBe(true);
      expect(member.isLeader).toBe(false);
    });

    test('should add enemy to existing group', () => {
      const groupId = enemyAI.createGroup('leader');
      enemyAI.addToGroup('member1', groupId);

      const group = enemyAI.groups.get(groupId);
      expect(group.members.has('member1')).toBe(true);
    });

    test('should set group formation', () => {
      const groupId = enemyAI.createGroup('leader', ['member1']);
      enemyAI.setGroupFormation(groupId, FormationType.LINE);

      const group = enemyAI.groups.get(groupId);
      expect(group.formation).toBe(FormationType.LINE);
    });

    test('should track active groups in stats', () => {
      enemyAI.createGroup('leader', ['member1']);
      expect(enemyAI.stats.groupsActive).toBe(1);
    });
  });

  // ============================================
  // COORDINATED ATTACK TESTS
  // ============================================

  describe('Coordinated Attack', () => {
    test('should set group target', () => {
      enemyAI.registerEnemy({ id: 'leader', position: { x: 100, z: 100 } });
      enemyAI.registerEnemy({ id: 'member1', position: { x: 110, z: 100 } });

      const groupId = enemyAI.createGroup('leader', ['member1']);
      enemyAI.coordinateGroupAttack(groupId, 'player');

      const group = enemyAI.groups.get(groupId);
      expect(group.targetId).toBe('player');
    });

    test('should set all members to target', () => {
      enemyAI.registerEnemy({ id: 'leader', position: { x: 100, z: 100 } });
      enemyAI.registerEnemy({ id: 'member1', position: { x: 110, z: 100 } });

      const groupId = enemyAI.createGroup('leader', ['member1']);
      enemyAI.coordinateGroupAttack(groupId, 'player');

      const leader = enemyAI.getEnemy('leader');
      const member = enemyAI.getEnemy('member1');

      expect(leader.targetId).toBe('player');
      expect(member.targetId).toBe('player');
    });

    test('should set surround formation', () => {
      enemyAI.registerEnemy({ id: 'leader', position: { x: 100, z: 100 } });
      const groupId = enemyAI.createGroup('leader');
      enemyAI.coordinateGroupAttack(groupId, 'player');

      const group = enemyAI.groups.get(groupId);
      expect(group.formation).toBe(FormationType.SURROUND);
    });
  });

  // ============================================
  // DAMAGE SYSTEM TESTS
  // ============================================

  describe('Damage System', () => {
    test('should deal damage to enemy', () => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });
      enemyAI.dealDamage('enemy1', 30, 'player');

      const enemy = enemyAI.getEnemy('enemy1');
      expect(enemy.health).toBe(70);
    });

    test('should not go below zero health', () => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 50 });
      enemyAI.dealDamage('enemy1', 100, 'player');

      const enemy = enemyAI.getEnemy('enemy1');
      expect(enemy.health).toBe(0);
    });

    test('should mark enemy as dead', () => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 50 });
      enemyAI.dealDamage('enemy1', 100, 'player');

      const enemy = enemyAI.getEnemy('enemy1');
      expect(enemy.alive).toBe(false);
      expect(enemy.state).toBe(EnemyState.DEAD);
    });

    test('should add threat from damage', () => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });
      enemyAI.dealDamage('enemy1', 30, 'player');

      const table = enemyAI.threatTables.get('enemy1');
      expect(table.has('player')).toBe(true);
    });

    test('should set target to attacker', () => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });
      enemyAI.dealDamage('enemy1', 30, 'player');

      const enemy = enemyAI.getEnemy('enemy1');
      expect(enemy.targetId).toBe('player');
    });
  });

  // ============================================
  // THREAT TABLE TESTS
  // ============================================

  describe('Threat Table', () => {
    test('should get highest threat target', () => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });
      enemyAI.dealDamage('enemy1', 30, 'player');
      enemyAI.dealDamage('enemy1', 10, 'npc1');

      const highestThreat = enemyAI.getHighestThreatTarget('enemy1');
      expect(highestThreat).toBe('player');
    });

    test('should return null with no threats', () => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });
      const highestThreat = enemyAI.getHighestThreatTarget('enemy1');
      expect(highestThreat).toBeNull();
    });
  });

  // ============================================
  // GAME STATE TESTS
  // ============================================

  describe('Game State', () => {
    test('should update weather', () => {
      enemyAI.setGameState({ weather: 'RAIN' });
      expect(enemyAI.currentWeather).toBe('RAIN');
    });

    test('should update night mode', () => {
      enemyAI.setGameState({ isNight: true });
      expect(enemyAI.isNight).toBe(true);
    });

    test('should update difficulty multiplier', () => {
      enemyAI.setGameState({ difficultyMultiplier: 1.5 });
      expect(enemyAI.config.difficultyMultiplier).toBe(1.5);
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('Update System', () => {
    test('should update all enemies', () => {
      enemyAI.registerEnemy({
        id: 'enemy1',
        position: { x: 100, z: 100 },
        health: 100
      });

      enemyAI.update(16, {
        player: { position: { x: 500, z: 500 } }
      });

      expect(enemyAI.stats.behaviorsEvaluated).toBeGreaterThan(0);
    });

    test('should skip dead enemies', () => {
      enemyAI.registerEnemy({
        id: 'enemy1',
        position: { x: 100, z: 100 },
        health: 0
      });

      const enemy = enemyAI.getEnemy('enemy1');
      enemy.alive = false;

      const initialEvaluations = enemyAI.stats.behaviorsEvaluated;
      enemyAI.update(16, {});

      // Behavior should not be evaluated for dead enemy
      expect(enemyAI.stats.behaviorsEvaluated).toBe(initialEvaluations);
    });

    test('should decay threat over time', () => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });
      enemyAI.dealDamage('enemy1', 30, 'player');

      const tableBefore = enemyAI.threatTables.get('enemy1');
      const threatBefore = tableBefore.get('player').threat;

      enemyAI.update(5000, {}); // 5 seconds

      const threatAfter = tableBefore.get('player').threat;
      expect(threatAfter).toBeLessThan(threatBefore);
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    test('should add listener', () => {
      const listener = jest.fn();
      enemyAI.addListener(listener);
      expect(enemyAI.listeners).toContain(listener);
    });

    test('should remove listener', () => {
      const listener = jest.fn();
      enemyAI.addListener(listener);
      enemyAI.removeListener(listener);
      expect(enemyAI.listeners).not.toContain(listener);
    });

    test('should emit enemyDamaged event', () => {
      const listener = jest.fn();
      enemyAI.addListener(listener);
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });
      enemyAI.dealDamage('enemy1', 30, 'player');

      expect(listener).toHaveBeenCalledWith('enemyDamaged', expect.objectContaining({
        enemyId: 'enemy1',
        damage: 30,
        sourceId: 'player'
      }));
    });

    test('should emit enemyDied event', () => {
      const listener = jest.fn();
      enemyAI.addListener(listener);
      enemyAI.registerEnemy({ id: 'enemy1', health: 50 });
      enemyAI.dealDamage('enemy1', 100, 'player');

      expect(listener).toHaveBeenCalledWith('enemyDied', expect.objectContaining({
        enemyId: 'enemy1',
        killerId: 'player'
      }));
    });

    test('should handle listener errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorListener = () => { throw new Error('Test'); };
      enemyAI.addListener(errorListener);
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });

      expect(() => {
        enemyAI.dealDamage('enemy1', 10, 'player');
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should get statistics', () => {
      enemyAI.registerEnemy({ id: 'enemy1' });
      const stats = enemyAI.getStatistics();

      expect(stats.enemiesManaged).toBe(1);
      expect(stats).toHaveProperty('behaviorsEvaluated');
      expect(stats).toHaveProperty('groupsActive');
    });

    test('should include living enemies count', () => {
      enemyAI.registerEnemy({ id: 'enemy1', health: 100 });
      enemyAI.registerEnemy({ id: 'enemy2', health: 0 });

      const enemy2 = enemyAI.getEnemy('enemy2');
      enemy2.alive = false;

      const stats = enemyAI.getStatistics();
      expect(stats.livingEnemies).toBe(1);
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      enemyAI.registerEnemy({
        id: 'enemy1',
        position: { x: 100, z: 200 },
        health: 75
      });

      const json = enemyAI.toJSON();
      expect(json.enemies).toHaveProperty('enemy1');
      expect(json.enemies['enemy1'].health).toBe(75);
    });

    test('should serialize groups', () => {
      enemyAI.registerEnemy({ id: 'leader' });
      enemyAI.registerEnemy({ id: 'member1' });
      const groupId = enemyAI.createGroup('leader', ['member1']);

      const json = enemyAI.toJSON();
      expect(json.groups).toHaveProperty(groupId);
    });

    test('should deserialize from JSON', () => {
      const data = {
        enemies: {
          'enemy1': {
            id: 'enemy1',
            type: 'monster',
            faction: 'monsters',
            position: { x: 100, z: 200 },
            health: 75,
            maxHealth: 100,
            state: EnemyState.PATROL,
            alive: true
          }
        },
        groups: {}
      };

      enemyAI.fromJSON(data);

      const enemy = enemyAI.getEnemy('enemy1');
      expect(enemy).not.toBeNull();
      expect(enemy.health).toBe(75);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should handle full combat scenario', () => {
      // Create enemy
      enemyAI.registerEnemy({
        id: 'enemy1',
        position: { x: 100, z: 100 },
        health: 100,
        damage: 10,
        aggroRange: 80
      });

      // Set up game state with player
      const gameState = {
        player: {
          position: { x: 120, z: 100 },
          health: 100
        }
      };

      // Update should detect player
      enemyAI.update(16, gameState);

      // Deal damage to enemy
      enemyAI.dealDamage('enemy1', 30, 'player');

      const enemy = enemyAI.getEnemy('enemy1');
      expect(enemy.health).toBe(70);
      expect(enemy.targetId).toBe('player');
    });

    test('should handle group combat', () => {
      enemyAI.registerEnemy({ id: 'leader', position: { x: 100, z: 100 } });
      enemyAI.registerEnemy({ id: 'member1', position: { x: 110, z: 100 } });
      enemyAI.registerEnemy({ id: 'member2', position: { x: 120, z: 100 } });

      const groupId = enemyAI.createGroup('leader', ['member1', 'member2']);
      enemyAI.setGroupFormation(groupId, FormationType.LINE);
      enemyAI.coordinateGroupAttack(groupId, 'player');

      // All should be targeting player
      expect(enemyAI.getEnemy('leader').targetId).toBe('player');
      expect(enemyAI.getEnemy('member1').targetId).toBe('player');
      expect(enemyAI.getEnemy('member2').targetId).toBe('player');
    });
  });
});
