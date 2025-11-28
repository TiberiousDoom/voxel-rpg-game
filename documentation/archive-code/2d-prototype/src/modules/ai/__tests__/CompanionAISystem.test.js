/**
 * CompanionAISystem.test.js - Comprehensive tests for Companion AI System
 */

import {
  CompanionAISystem,
  CompanionType,
  CompanionCommand,
  CompanionState
} from '../CompanionAISystem.js';

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
    Blackboard,
    NodeStatus
  };
});

describe('CompanionAISystem', () => {
  let companionAI;

  beforeEach(() => {
    companionAI = new CompanionAISystem();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // ENUMS TESTS
  // ============================================

  describe('Enums', () => {
    test('CompanionType should have all types', () => {
      expect(CompanionType.PET).toBe('PET');
      expect(CompanionType.MERCENARY).toBe('MERCENARY');
      expect(CompanionType.MAGE).toBe('MAGE');
      expect(CompanionType.MOUNT).toBe('MOUNT');
      expect(CompanionType.GATHERER).toBe('GATHERER');
    });

    test('CompanionCommand should have all commands', () => {
      expect(CompanionCommand.FOLLOW).toBe('FOLLOW');
      expect(CompanionCommand.STAY).toBe('STAY');
      expect(CompanionCommand.ATTACK).toBe('ATTACK');
      expect(CompanionCommand.DEFEND).toBe('DEFEND');
      expect(CompanionCommand.GATHER).toBe('GATHER');
      expect(CompanionCommand.SCOUT).toBe('SCOUT');
      expect(CompanionCommand.PATROL).toBe('PATROL');
      expect(CompanionCommand.RETURN).toBe('RETURN');
    });

    test('CompanionState should have all states', () => {
      expect(CompanionState.IDLE).toBe('IDLE');
      expect(CompanionState.FOLLOWING).toBe('FOLLOWING');
      expect(CompanionState.STAYING).toBe('STAYING');
      expect(CompanionState.ATTACKING).toBe('ATTACKING');
      expect(CompanionState.DEFENDING).toBe('DEFENDING');
      expect(CompanionState.GATHERING).toBe('GATHERING');
      expect(CompanionState.SCOUTING).toBe('SCOUTING');
      expect(CompanionState.RESTING).toBe('RESTING');
      expect(CompanionState.DEAD).toBe('DEAD');
    });
  });

  // ============================================
  // COMPANION REGISTRATION TESTS
  // ============================================

  describe('Companion Registration', () => {
    test('should register companion', () => {
      const result = companionAI.registerCompanion({
        id: 'companion1',
        name: 'Wolf',
        type: CompanionType.PET,
        position: { x: 100, z: 100 }
      });

      expect(result).toBe(true);
      expect(companionAI.getCompanion('companion1')).not.toBeNull();
    });

    test('should set default values', () => {
      companionAI.registerCompanion({ id: 'companion1', name: 'Wolf' });
      const companion = companionAI.getCompanion('companion1');

      expect(companion.state).toBe(CompanionState.IDLE);
      expect(companion.command).toBe(CompanionCommand.FOLLOW);
      expect(companion.bondLevel).toBeDefined();
      expect(companion.alive).toBe(true);
    });

    test('should unregister companion', () => {
      companionAI.registerCompanion({ id: 'companion1', name: 'Wolf' });
      companionAI.unregisterCompanion('companion1');
      expect(companionAI.getCompanion('companion1')).toBeNull();
    });

    test('should reject invalid companion', () => {
      expect(companionAI.registerCompanion(null)).toBe(false);
      expect(companionAI.registerCompanion({})).toBe(false);
    });
  });

  // ============================================
  // COMPANION RETRIEVAL TESTS
  // ============================================

  describe('Companion Retrieval', () => {
    beforeEach(() => {
      companionAI.registerCompanion({ id: 'c1', name: 'Wolf', type: CompanionType.PET });
      companionAI.registerCompanion({ id: 'c2', name: 'Guard', type: CompanionType.MERCENARY });
    });

    test('should get all companions', () => {
      expect(companionAI.getAllCompanions().length).toBe(2);
    });

    test('should get active companion after setting', () => {
      companionAI.setActiveCompanion('c1');
      const active = companionAI.getActiveCompanion();
      expect(active).not.toBeNull();
      expect(active.id).toBe('c1');
    });

    test('should return null if no active companion', () => {
      expect(companionAI.getActiveCompanion()).toBeNull();
    });
  });

  // ============================================
  // ACTIVE COMPANION TESTS
  // ============================================

  describe('Active Companion', () => {
    beforeEach(() => {
      companionAI.registerCompanion({ id: 'c1', name: 'Wolf', type: CompanionType.PET });
      companionAI.registerCompanion({ id: 'c2', name: 'Guard', type: CompanionType.MERCENARY });
    });

    test('should set active companion', () => {
      const result = companionAI.setActiveCompanion('c1');
      expect(result).toBe(true);
      expect(companionAI.getActiveCompanion().id).toBe('c1');
    });

    test('should fail to set non-existent companion', () => {
      const result = companionAI.setActiveCompanion('unknown');
      expect(result).toBe(false);
    });

    test('should switch active companion', () => {
      companionAI.setActiveCompanion('c1');
      companionAI.setActiveCompanion('c2');
      expect(companionAI.getActiveCompanion().id).toBe('c2');
    });

    test('previous companion should stay when switching', () => {
      companionAI.setActiveCompanion('c1');
      companionAI.setActiveCompanion('c2');

      const prev = companionAI.getCompanion('c1');
      expect(prev.command).toBe(CompanionCommand.STAY);
      expect(prev.state).toBe(CompanionState.STAYING);
    });
  });

  // ============================================
  // COMMAND TESTS
  // ============================================

  describe('Commands', () => {
    let companion;

    beforeEach(() => {
      companionAI.registerCompanion({
        id: 'companion1',
        name: 'Wolf',
        type: CompanionType.PET,
        position: { x: 100, z: 100 }
      });
      companion = companionAI.getCompanion('companion1');
    });

    test('should issue follow command', () => {
      companionAI.issueCommand('companion1', CompanionCommand.FOLLOW);
      expect(companion.command).toBe(CompanionCommand.FOLLOW);
      expect(companion.state).toBe(CompanionState.FOLLOWING);
    });

    test('should issue stay command', () => {
      companionAI.issueCommand('companion1', CompanionCommand.STAY);
      expect(companion.command).toBe(CompanionCommand.STAY);
      expect(companion.state).toBe(CompanionState.STAYING);
    });

    test('should fail attack for non-combat companion', () => {
      // PET type is not combat capable by default
      const result = companionAI.issueCommand('companion1', CompanionCommand.ATTACK, { targetId: 'enemy1' });
      expect(result).toBe(false);
    });

    test('should issue attack command for combat companion', () => {
      companionAI.registerCompanion({
        id: 'merc1',
        name: 'Guard',
        type: CompanionType.MERCENARY
      });

      const result = companionAI.issueCommand('merc1', CompanionCommand.ATTACK, { targetId: 'enemy1' });
      expect(result).toBe(true);

      const merc = companionAI.getCompanion('merc1');
      expect(merc.command).toBe(CompanionCommand.ATTACK);
      expect(merc.state).toBe(CompanionState.ATTACKING);
    });

    test('should issue defend command', () => {
      companionAI.issueCommand('companion1', CompanionCommand.DEFEND);
      expect(companion.command).toBe(CompanionCommand.DEFEND);
      expect(companion.state).toBe(CompanionState.DEFENDING);
    });

    test('should fail gather command for non-gatherer', () => {
      const result = companionAI.issueCommand('companion1', CompanionCommand.GATHER);
      expect(result).toBe(false);
    });

    test('should issue gather command for gatherer', () => {
      companionAI.registerCompanion({
        id: 'gatherer1',
        name: 'Collector',
        type: CompanionType.GATHERER
      });

      const result = companionAI.issueCommand('gatherer1', CompanionCommand.GATHER);
      expect(result).toBe(true);

      const gatherer = companionAI.getCompanion('gatherer1');
      expect(gatherer.state).toBe(CompanionState.GATHERING);
    });

    test('should issue scout command for capable companion', () => {
      // PET can scout
      const result = companionAI.issueCommand('companion1', CompanionCommand.SCOUT, {
        position: { x: 200, z: 200 }
      });
      expect(result).toBe(true);
      expect(companion.state).toBe(CompanionState.SCOUTING);
    });

    test('should fail for unknown companion', () => {
      const result = companionAI.issueCommand('unknown', CompanionCommand.FOLLOW);
      expect(result).toBe(false);
    });
  });

  // ============================================
  // DAMAGE/HEALTH TESTS
  // ============================================

  describe('Damage System', () => {
    let companion;

    beforeEach(() => {
      companionAI.registerCompanion({
        id: 'merc1',
        name: 'Guard',
        type: CompanionType.MERCENARY,
        health: 100,
        maxHealth: 100
      });
      companion = companionAI.getCompanion('merc1');
    });

    test('should deal damage to companion', () => {
      companionAI.dealDamage('merc1', 20);
      expect(companion.health).toBe(80);
    });

    test('should not go below 0 health', () => {
      companionAI.dealDamage('merc1', 200);
      expect(companion.health).toBe(0);
    });

    test('should kill companion at 0 health', () => {
      companionAI.dealDamage('merc1', 100);
      expect(companion.alive).toBe(false);
      expect(companion.state).toBe(CompanionState.DEAD);
    });

    test('should heal companion', () => {
      companion.health = 50;
      companionAI.healCompanion('merc1', 30);
      expect(companion.health).toBe(80);
    });

    test('should not exceed max health', () => {
      companionAI.healCompanion('merc1', 50);
      expect(companion.health).toBe(100);
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('Update System', () => {
    test('should update all companions', () => {
      companionAI.registerCompanion({
        id: 'companion1',
        name: 'Wolf',
        position: { x: 100, z: 100 }
      });

      const gameState = {
        player: { position: { x: 200, z: 200 }, facingAngle: 0 }
      };

      companionAI.update(16, gameState);
      // Verify no errors
    });

    test('should skip dead companions', () => {
      companionAI.registerCompanion({
        id: 'companion1',
        name: 'Wolf'
      });

      const companion = companionAI.getCompanion('companion1');
      companion.alive = false;

      companionAI.update(16, {});
      // Should not throw
    });
  });

  // ============================================
  // MOVEMENT TESTS
  // ============================================

  describe('Movement', () => {
    test('should follow player', () => {
      companionAI.registerCompanion({
        id: 'companion1',
        name: 'Wolf',
        position: { x: 100, z: 100 }
      });
      companionAI.issueCommand('companion1', CompanionCommand.FOLLOW);

      const gameState = {
        player: { position: { x: 200, z: 200 }, facingAngle: 0 }
      };

      companionAI.update(100, gameState);

      const companion = companionAI.getCompanion('companion1');
      expect(companion.state).toBe(CompanionState.FOLLOWING);
    });

    test('should calculate follow distance', () => {
      companionAI.registerCompanion({
        id: 'companion1',
        name: 'Wolf',
        position: { x: 100, z: 100 },
        followDistance: 50
      });

      const companion = companionAI.getCompanion('companion1');
      expect(companion.followDistance).toBe(50);
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    test('should add listeners', () => {
      const listener = jest.fn();
      companionAI.addListener(listener);
      expect(companionAI.listeners).toContain(listener);
    });

    test('should emit commandIssued event', () => {
      const listener = jest.fn();
      companionAI.addListener(listener);

      companionAI.registerCompanion({ id: 'c1', name: 'Wolf' });
      companionAI.issueCommand('c1', CompanionCommand.STAY);

      expect(listener).toHaveBeenCalledWith('commandIssued', expect.objectContaining({
        companionId: 'c1',
        command: CompanionCommand.STAY
      }));
    });

    test('should emit companionDamaged event', () => {
      const listener = jest.fn();
      companionAI.addListener(listener);

      companionAI.registerCompanion({
        id: 'c1',
        name: 'Wolf',
        type: CompanionType.MERCENARY,
        health: 100
      });
      companionAI.dealDamage('c1', 20);

      expect(listener).toHaveBeenCalledWith('companionDamaged', expect.objectContaining({
        companionId: 'c1',
        damage: 20
      }));
    });

    test('should emit companionDied event', () => {
      const listener = jest.fn();
      companionAI.addListener(listener);

      companionAI.registerCompanion({
        id: 'c1',
        name: 'Wolf',
        type: CompanionType.MERCENARY,
        health: 50
      });
      companionAI.dealDamage('c1', 100);

      expect(listener).toHaveBeenCalledWith('companionDied', expect.objectContaining({
        companionId: 'c1'
      }));
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should get statistics', () => {
      companionAI.registerCompanion({ id: 'c1', name: 'Wolf' });

      const stats = companionAI.getStatistics();
      expect(stats.companionsManaged).toBe(1);
    });

    test('should track commands executed', () => {
      companionAI.registerCompanion({ id: 'c1', name: 'Wolf' });
      companionAI.issueCommand('c1', CompanionCommand.FOLLOW);
      companionAI.issueCommand('c1', CompanionCommand.STAY);

      const stats = companionAI.getStatistics();
      expect(stats.commandsExecuted).toBe(2);
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      companionAI.registerCompanion({
        id: 'companion1',
        name: 'Wolf',
        type: CompanionType.PET,
        bondLevel: 75
      });

      const json = companionAI.toJSON();
      expect(json.companions).toHaveProperty('companion1');
      expect(json.companions['companion1'].bondLevel).toBe(75);
    });

    test('should deserialize from JSON', () => {
      const data = {
        companions: {
          companion1: {
            id: 'companion1',
            name: 'Wolf',
            type: CompanionType.PET,
            position: { x: 100, z: 200 },
            state: CompanionState.FOLLOWING,
            bondLevel: 80,
            alive: true
          }
        }
      };

      companionAI.fromJSON(data);

      const companion = companionAI.getCompanion('companion1');
      expect(companion).not.toBeNull();
      expect(companion.bondLevel).toBe(80);
    });

    test('should serialize active companion id', () => {
      companionAI.registerCompanion({ id: 'c1', name: 'Wolf' });
      companionAI.setActiveCompanion('c1');

      const json = companionAI.toJSON();
      expect(json.activeCompanionId).toBe('c1');
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should handle full companion lifecycle', () => {
      // Register companion
      companionAI.registerCompanion({
        id: 'wolf1',
        name: 'Luna',
        type: CompanionType.PET,
        position: { x: 100, z: 100 },
        bondLevel: 50
      });

      // Set as active
      companionAI.setActiveCompanion('wolf1');

      // Issue follow command
      companionAI.issueCommand('wolf1', CompanionCommand.FOLLOW);

      // Update with player position
      companionAI.update(16, {
        player: { position: { x: 150, z: 150 }, facingAngle: 0 }
      });

      const companion = companionAI.getCompanion('wolf1');
      expect(companion.bondLevel).toBe(50);
      expect(companion.state).toBe(CompanionState.FOLLOWING);
    });

    test('should handle combat companion', () => {
      companionAI.registerCompanion({
        id: 'merc1',
        name: 'Guard',
        type: CompanionType.MERCENARY,
        position: { x: 100, z: 100 }
      });

      companionAI.issueCommand('merc1', CompanionCommand.ATTACK, { targetId: 'enemy1' });

      const companion = companionAI.getCompanion('merc1');
      expect(companion.combatCapable).toBe(true);
      expect(companion.state).toBe(CompanionState.ATTACKING);
      expect(companion.targetId).toBe('enemy1');
    });
  });
});
