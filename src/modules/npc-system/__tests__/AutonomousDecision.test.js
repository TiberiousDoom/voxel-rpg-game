/**
 * AutonomousDecision.test.js - Unit tests for Autonomous Decision Making
 */

import AutonomousDecision, { DecisionType, DecisionPriority } from '../AutonomousDecision.js';
import NPCNeedsTracker from '../NPCNeedsTracker.js';
import IdleTaskManager from '../IdleTaskManager.js';
import GridManager from '../../foundation/GridManager.js';
import { NeedType } from '../NPCNeed.js';
import { IdleTaskType } from '../IdleTask.js';

describe('AutonomousDecision', () => {
  let autonomousDecision;
  let needsTracker;
  let idleTaskManager;
  let mockGrid;
  let mockNPC;

  beforeEach(() => {
    // Create dependencies
    mockGrid = new GridManager({ gridSize: 100, gridHeight: 50 });
    needsTracker = new NPCNeedsTracker();
    idleTaskManager = new IdleTaskManager(mockGrid);

    autonomousDecision = new AutonomousDecision(needsTracker, idleTaskManager);

    // Create mock NPC
    mockNPC = {
      id: 'npc1',
      position: { x: 5, y: 25, z: 5 },
      isWorking: false,
      assignedBuilding: null,
      health: 100,
      alive: true
    };

    // Register NPC in needs tracker
    needsTracker.registerNPC(mockNPC.id, {
      food: 80,
      rest: 80,
      social: 70,
      shelter: 90
    });
  });

  describe('Initialization', () => {
    test('should initialize with required dependencies', () => {
      expect(autonomousDecision.needsTracker).toBeDefined();
      expect(autonomousDecision.idleTaskManager).toBeDefined();
    });

    test('should throw error if dependencies are missing', () => {
      expect(() => {
        new AutonomousDecision(null, idleTaskManager);
      }).toThrow('AutonomousDecision requires NPCNeedsTracker and IdleTaskManager');

      expect(() => {
        new AutonomousDecision(needsTracker, null);
      }).toThrow('AutonomousDecision requires NPCNeedsTracker and IdleTaskManager');
    });

    test('should have correct configuration', () => {
      expect(autonomousDecision.config.emergencyThreshold).toBe(10);
      expect(autonomousDecision.config.criticalThreshold).toBe(20);
      expect(autonomousDecision.config.lowThreshold).toBe(30);
      expect(autonomousDecision.config.satisfiedThreshold).toBe(60);
      expect(autonomousDecision.config.workRefusalThreshold).toBe(15);
    });

    test('should initialize statistics', () => {
      expect(autonomousDecision.stats.totalDecisions).toBe(0);
      expect(autonomousDecision.stats.emergencyInterrupts).toBe(0);
      expect(autonomousDecision.stats.workRefusals).toBe(0);
    });
  });

  describe('Decision Making Priority', () => {
    test('should prioritize emergency needs over all else', () => {
      needsTracker.registerNPC('npc2', { food: 5 }); // Emergency
      const npc = { id: 'npc2', isWorking: true };

      const decision = autonomousDecision.decideAction(npc, { hasWorkOffer: true });

      expect(decision.type).toBe(DecisionType.EMERGENCY);
      expect(decision.priority).toBe(DecisionPriority.EMERGENCY);
      expect(decision.action).toBe('SEEK_FOOD');
    });

    test('should refuse work if needs are critical', () => {
      needsTracker.registerNPC('npc3', { rest: 10 }); // Too exhausted
      const npc = { id: 'npc3', isWorking: false };

      const decision = autonomousDecision.decideAction(npc, { hasWorkOffer: true });

      expect(decision.type).toBe(DecisionType.SATISFY_NEED);
      expect(decision.action).toBe(IdleTaskType.REST);
      expect(autonomousDecision.stats.workRefusals).toBe(1);
    });

    test('should accept work if needs are satisfied', () => {
      const decision = autonomousDecision.decideAction(mockNPC, { hasWorkOffer: true });

      expect(decision.type).toBe(DecisionType.WORK);
      expect(decision.action).toBe('ACCEPT_WORK');
    });

    test('should continue working if already working', () => {
      mockNPC.isWorking = true;

      const decision = autonomousDecision.decideAction(mockNPC);

      expect(decision.type).toBe(DecisionType.CONTINUE);
      expect(decision.action).toBe('KEEP_WORKING');
    });

    test('should continue idle task if one is active', () => {
      idleTaskManager.assignTask(mockNPC);

      const decision = autonomousDecision.decideAction(mockNPC);

      expect(decision.type).toBe(DecisionType.CONTINUE);
      expect(decision.action).toBe('CONTINUE_TASK');
    });

    test('should assign idle task if nothing else to do', () => {
      const decision = autonomousDecision.decideAction(mockNPC);

      expect(decision.type).toBe(DecisionType.IDLE_TASK);
      expect([IdleTaskType.WANDER, IdleTaskType.INSPECT, IdleTaskType.REST, IdleTaskType.SOCIALIZE])
        .toContain(decision.action);
    });
  });

  describe('Emergency Needs', () => {
    test('should trigger emergency for food < 10', () => {
      needsTracker.registerNPC('npc4', { food: 8 });
      const npc = { id: 'npc4' };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.EMERGENCY);
      expect(decision.action).toBe('SEEK_FOOD');
      expect(decision.priority).toBe(DecisionPriority.EMERGENCY);
    });

    test('should trigger emergency for rest < 10', () => {
      needsTracker.registerNPC('npc5', { rest: 7 });
      const npc = { id: 'npc5' };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.EMERGENCY);
      expect(decision.action).toBe(IdleTaskType.REST);
    });

    test('should trigger emergency for social < 10', () => {
      needsTracker.registerNPC('npc6', { social: 9 });
      const npc = { id: 'npc6' };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.EMERGENCY);
      expect(decision.action).toBe(IdleTaskType.SOCIALIZE);
    });

    test('should trigger emergency for shelter < 10', () => {
      needsTracker.registerNPC('npc7', { shelter: 6 });
      const npc = { id: 'npc7' };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.EMERGENCY);
      expect(decision.action).toBe('SEEK_SHELTER');
    });

    test('should trigger emergency for critical health', () => {
      const npc = { id: mockNPC.id, health: 15 };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.EMERGENCY);
      expect(decision.action).toBe('SEEK_HEALING');
    });

    test('should track emergency interrupts', () => {
      needsTracker.registerNPC('npc8', { food: 5 });
      const npc = { id: 'npc8' };

      autonomousDecision.decideAction(npc);

      expect(autonomousDecision.stats.emergencyInterrupts).toBe(1);
    });
  });

  describe('Work Evaluation', () => {
    test('should accept work when all needs satisfied', () => {
      const decision = autonomousDecision.decideAction(mockNPC, { hasWorkOffer: true });

      expect(decision.type).toBe(DecisionType.WORK);
      expect(decision.action).toBe('ACCEPT_WORK');
      expect(decision.reason).toContain('can work');
    });

    test('should refuse work when rest < 15', () => {
      needsTracker.registerNPC('npc9', { rest: 12 });
      const npc = { id: 'npc9' };

      const decision = autonomousDecision.decideAction(npc, { hasWorkOffer: true });

      expect(decision.type).toBe(DecisionType.SATISFY_NEED);
      expect(decision.action).toBe(IdleTaskType.REST);
      expect(decision.reason).toContain('Too exhausted');
    });

    test('should refuse work when any need is critical (< 20)', () => {
      needsTracker.registerNPC('npc10', { food: 18, rest: 80 });
      const npc = { id: 'npc10' };

      const decision = autonomousDecision.decideAction(npc, { hasWorkOffer: true });

      expect(decision.type).toBe(DecisionType.SATISFY_NEED);
      expect(decision.action).toBe('SEEK_FOOD');
      expect(decision.priority).toBe(DecisionPriority.CRITICAL);
    });

    test('should track work refusals', () => {
      needsTracker.registerNPC('npc11', { rest: 10 });
      const npc = { id: 'npc11' };

      autonomousDecision.decideAction(npc, { hasWorkOffer: true });

      expect(autonomousDecision.stats.workRefusals).toBe(1);
    });

    test('should accept work at rest threshold boundary (15)', () => {
      needsTracker.registerNPC('npc12', { rest: 16 });
      const npc = { id: 'npc12' };

      const decision = autonomousDecision.decideAction(npc, { hasWorkOffer: true });

      expect(decision.type).toBe(DecisionType.WORK);
    });
  });

  describe('Need Satisfaction', () => {
    test('should satisfy lowest need when idle', () => {
      needsTracker.registerNPC('npc13', {
        food: 80,
        rest: 25, // Lowest
        social: 70,
        shelter: 90
      });
      const npc = { id: 'npc13', isWorking: false };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.SATISFY_NEED);
      expect(decision.action).toBe(IdleTaskType.REST);
    });

    test('should not take action if all needs above threshold (30)', () => {
      needsTracker.registerNPC('npc14', {
        food: 80,
        rest: 70,
        social: 65,
        shelter: 90
      });
      const npc = { id: 'npc14', isWorking: false };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.IDLE_TASK);
    });

    test('should satisfy social need when low', () => {
      needsTracker.registerNPC('npc15', {
        food: 80,
        rest: 70,
        social: 25, // Low
        shelter: 90
      });
      const npc = { id: 'npc15' };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.SATISFY_NEED);
      expect(decision.action).toBe(IdleTaskType.SOCIALIZE);
    });

    test('should satisfy food need when low', () => {
      needsTracker.registerNPC('npc16', {
        food: 28, // Low
        rest: 80,
        social: 70,
        shelter: 90
      });
      const npc = { id: 'npc16' };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.SATISFY_NEED);
      expect(decision.action).toBe('SEEK_FOOD');
    });
  });

  describe('Idle Task Selection', () => {
    test('should prefer REST when rest need < 50', () => {
      needsTracker.registerNPC('npc17', {
        food: 80,
        rest: 45, // Moderate but < 50
        social: 70,
        shelter: 90
      });
      const npc = { id: 'npc17' };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.IDLE_TASK);
      expect(decision.action).toBe(IdleTaskType.REST);
    });

    test('should prefer SOCIALIZE when social need < 50', () => {
      needsTracker.registerNPC('npc18', {
        food: 80,
        rest: 70,
        social: 45, // Moderate but < 50
        shelter: 90
      });
      const npc = { id: 'npc18' };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.IDLE_TASK);
      expect(decision.action).toBe(IdleTaskType.SOCIALIZE);
    });

    test('should select WANDER or INSPECT when all needs high', () => {
      needsTracker.registerNPC('npc19', {
        food: 90,
        rest: 85,
        social: 80,
        shelter: 95
      });
      const npc = { id: 'npc19' };

      const decision = autonomousDecision.decideAction(npc);

      expect(decision.type).toBe(DecisionType.IDLE_TASK);
      expect([IdleTaskType.WANDER, IdleTaskType.INSPECT]).toContain(decision.action);
    });

    test('should vary between WANDER and INSPECT (randomness)', () => {
      const actions = new Set();

      for (let i = 0; i < 30; i++) {
        needsTracker.registerNPC(`npc${20 + i}`, {
          food: 90,
          rest: 85,
          social: 80,
          shelter: 95
        });
        const npc = { id: `npc${20 + i}` };

        const decision = autonomousDecision.decideAction(npc);
        actions.add(decision.action);
      }

      // Should have both actions over 30 tries
      expect(actions.size).toBeGreaterThan(1);
    });
  });

  describe('Decision Interrupts', () => {
    test('should interrupt for EMERGENCY decisions', () => {
      const emergencyDecision = {
        type: DecisionType.EMERGENCY,
        priority: DecisionPriority.EMERGENCY
      };

      const shouldInterrupt = autonomousDecision.shouldInterrupt(emergencyDecision, mockNPC);

      expect(shouldInterrupt).toBe(true);
    });

    test('should interrupt for CRITICAL priority when working', () => {
      const criticalDecision = {
        type: DecisionType.SATISFY_NEED,
        priority: DecisionPriority.CRITICAL
      };
      mockNPC.isWorking = true;

      const shouldInterrupt = autonomousDecision.shouldInterrupt(criticalDecision, mockNPC);

      expect(shouldInterrupt).toBe(true);
    });

    test('should not interrupt if NPC is idle', () => {
      const criticalDecision = {
        type: DecisionType.SATISFY_NEED,
        priority: DecisionPriority.CRITICAL
      };
      mockNPC.isWorking = false;
      mockNPC.assignedBuilding = null;

      const shouldInterrupt = autonomousDecision.shouldInterrupt(criticalDecision, mockNPC);

      expect(shouldInterrupt).toBe(false);
    });

    test('should not interrupt for low priority decisions', () => {
      const lowDecision = {
        type: DecisionType.IDLE_TASK,
        priority: DecisionPriority.LOW
      };
      mockNPC.isWorking = true;

      const shouldInterrupt = autonomousDecision.shouldInterrupt(lowDecision, mockNPC);

      expect(shouldInterrupt).toBe(false);
    });

    test('should return false for null decision', () => {
      const shouldInterrupt = autonomousDecision.shouldInterrupt(null, mockNPC);

      expect(shouldInterrupt).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should track total decisions', () => {
      autonomousDecision.decideAction(mockNPC);
      autonomousDecision.decideAction(mockNPC);
      autonomousDecision.decideAction(mockNPC);

      const stats = autonomousDecision.getStatistics();

      expect(stats.totalDecisions).toBe(3);
    });

    test('should track decisions by type', () => {
      autonomousDecision.decideAction(mockNPC, { hasWorkOffer: true });

      const stats = autonomousDecision.getStatistics();

      expect(stats.decisionsByType[DecisionType.WORK]).toBe(1);
    });

    test('should calculate emergency rate', () => {
      needsTracker.registerNPC('npc50', { food: 5 });
      needsTracker.registerNPC('npc51', { food: 80 });

      autonomousDecision.decideAction({ id: 'npc50' });
      autonomousDecision.decideAction({ id: 'npc51' });

      const stats = autonomousDecision.getStatistics();

      expect(stats.emergencyRate).toBe('50.0'); // 1 emergency out of 2
    });

    test('should calculate work refusal rate', () => {
      needsTracker.registerNPC('npc52', { rest: 10 });
      needsTracker.registerNPC('npc53', { rest: 80 });

      autonomousDecision.decideAction({ id: 'npc52' }, { hasWorkOffer: true });
      autonomousDecision.decideAction({ id: 'npc53' }, { hasWorkOffer: true });

      const stats = autonomousDecision.getStatistics();

      expect(stats.workRefusalRate).toBe('50.0'); // 1 refusal out of 2
    });

    test('should reset statistics', () => {
      autonomousDecision.decideAction(mockNPC);
      autonomousDecision.decideAction(mockNPC);

      autonomousDecision.resetStatistics();

      const stats = autonomousDecision.getStatistics();

      expect(stats.totalDecisions).toBe(0);
      expect(stats.emergencyInterrupts).toBe(0);
      expect(stats.workRefusals).toBe(0);
      expect(Object.keys(stats.decisionsByType).length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle NPC without ID', () => {
      const decision = autonomousDecision.decideAction({});

      expect(decision).toBeNull();
    });

    test('should handle null NPC', () => {
      const decision = autonomousDecision.decideAction(null);

      expect(decision).toBeNull();
    });

    test('should handle NPC not registered in needs tracker', () => {
      const unregisteredNPC = { id: 'unregistered', isWorking: false };

      const decision = autonomousDecision.decideAction(unregisteredNPC);

      expect(decision).toBeDefined();
      expect(decision.type).toBe(DecisionType.IDLE_TASK);
    });

    test('should default to accepting work if no needs data', () => {
      const unregisteredNPC = { id: 'unregistered' };

      const decision = autonomousDecision.decideAction(unregisteredNPC, { hasWorkOffer: true });

      expect(decision.type).toBe(DecisionType.WORK);
      expect(decision.action).toBe('ACCEPT_WORK');
    });

    test('should include timestamp in all decisions', () => {
      const decision = autonomousDecision.decideAction(mockNPC);

      expect(decision.timestamp).toBeDefined();
      expect(typeof decision.timestamp).toBe('number');
    });

    test('should include reason in all decisions', () => {
      const decision = autonomousDecision.decideAction(mockNPC);

      expect(decision.reason).toBeDefined();
      expect(typeof decision.reason).toBe('string');
    });

    test('should handle NPC with assigned building', () => {
      mockNPC.assignedBuilding = 'building1';
      mockNPC.isWorking = false;

      const decision = autonomousDecision.decideAction(mockNPC);

      expect(decision.type).toBe(DecisionType.CONTINUE);
      expect(decision.action).toBe('KEEP_WORKING');
    });

    test('should handle performance with many decisions', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        autonomousDecision.decideAction(mockNPC);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Should process 1000 decisions in < 100ms
      expect(autonomousDecision.stats.totalDecisions).toBe(1000);
    });
  });

  describe('Decision Context', () => {
    test('should respect hasWorkOffer context', () => {
      const withWork = autonomousDecision.decideAction(mockNPC, { hasWorkOffer: true });
      const withoutWork = autonomousDecision.decideAction(mockNPC, { hasWorkOffer: false });

      expect(withWork.type).toBe(DecisionType.WORK);
      expect(withoutWork.type).not.toBe(DecisionType.WORK);
    });

    test('should handle empty context object', () => {
      const decision = autonomousDecision.decideAction(mockNPC, {});

      expect(decision).toBeDefined();
    });

    test('should handle missing context (undefined)', () => {
      const decision = autonomousDecision.decideAction(mockNPC);

      expect(decision).toBeDefined();
    });
  });
});
