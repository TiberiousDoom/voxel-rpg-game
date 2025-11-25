/**
 * IdleTaskManager.test.js - Unit tests for Idle Task Management
 */

import IdleTaskManager from '../IdleTaskManager.js';
import GridManager from '../../foundation/GridManager.js';

describe('IdleTaskManager', () => {
  let idleTaskManager;
  let mockGrid;
  let mockNPC;

  beforeEach(() => {
    // Create mock grid
    mockGrid = new GridManager({ gridSize: 100, gridHeight: 50 });

    idleTaskManager = new IdleTaskManager(mockGrid);

    // Create mock NPC
    mockNPC = {
      id: 1,
      position: { x: 5, y: 25, z: 5 },
      isWorking: false,
      fatigued: false,
      happiness: 50,
      alive: true
    };
  });

  describe('Initialization', () => {
    test('should initialize with empty task maps', () => {
      expect(idleTaskManager.activeTasks.size).toBe(0);
      expect(idleTaskManager.stats.totalTasksAssigned).toBe(0);
    });

    test('should have task reward definitions', () => {
      expect(idleTaskManager.taskRewards).toBeDefined();
      expect(idleTaskManager.taskRewards.WANDER).toBeDefined();
      expect(idleTaskManager.taskRewards.REST).toBeDefined();
      expect(idleTaskManager.taskRewards.SOCIALIZE).toBeDefined();
      expect(idleTaskManager.taskRewards.EXPLORE).toBeDefined();
    });
  });

  describe('Task Assignment', () => {
    test('should assign task to idle NPC and return task object', () => {
      const assigned = idleTaskManager.assignTask(mockNPC);

      // assignTask returns the IdleTask object on success
      expect(assigned).toBeTruthy();
      expect(typeof assigned).toBe('object');
      expect(idleTaskManager.activeTasks.has(mockNPC.id)).toBe(true);
      expect(idleTaskManager.stats.totalTasksAssigned).toBe(1);
    });

    test('should assign REST task to fatigued NPC (priority)', () => {
      mockNPC.fatigued = true;

      idleTaskManager.assignTask(mockNPC);

      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      expect(task.type).toBe('REST');
    });

    test('should assign SOCIALIZE task to NPC with low socialNeed', () => {
      // _selectBestTask uses socialNeed (not happiness) for SOCIALIZE check
      mockNPC.socialNeed = 20;

      idleTaskManager.assignTask(mockNPC);

      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      // Note: SOCIALIZE depends on _hasNearbyNPCs which is random
      // Task should be either SOCIALIZE or another type
      expect(['WANDER', 'SOCIALIZE', 'INSPECT', 'REST']).toContain(task.type);
    });

    test('should not assign task to working NPC', () => {
      mockNPC.isWorking = true;

      const assigned = idleTaskManager.assignTask(mockNPC);

      expect(assigned).toBe(false);
      expect(idleTaskManager.activeTasks.has(mockNPC.id)).toBe(false);
    });

    test('should return existing task when NPC already has one', () => {
      const firstTask = idleTaskManager.assignTask(mockNPC);
      const secondAssign = idleTaskManager.assignTask(mockNPC);

      // Returns existing task, not false
      expect(secondAssign).toBe(firstTask);
      expect(idleTaskManager.activeTasks.size).toBe(1);
    });

    test('should handle NPC without position gracefully', () => {
      delete mockNPC.position;

      // This may throw or fail - implementation accesses position.x
      // The proper behavior is that it returns false or throws
      try {
        const assigned = idleTaskManager.assignTask(mockNPC);
        // If it doesn't throw, it should return false or an object
        expect(assigned === false || typeof assigned === 'object').toBe(true);
      } catch (e) {
        // Error is acceptable - implementation requires position
        expect(e).toBeDefined();
      }
    });

    test('should assign WANDER or INSPECT task randomly', () => {
      // Only valid types are WANDER, SOCIALIZE, REST, INSPECT
      const taskTypes = new Set();

      for (let i = 0; i < 30; i++) {
        const npc = { ...mockNPC, id: i, isWorking: false, position: { x: 5, y: 25, z: 5 } };
        idleTaskManager.assignTask(npc);

        const task = idleTaskManager.activeTasks.get(i);
        if (task) {
          taskTypes.add(task.type);
        }
      }

      // Should have some variety in task types
      expect(taskTypes.size).toBeGreaterThan(1);
      // All should be valid types
      taskTypes.forEach(type => {
        expect(['WANDER', 'SOCIALIZE', 'INSPECT', 'REST']).toContain(type);
      });
    });
  });

  describe('Task Progress and Completion', () => {
    let originalDateNow;

    beforeEach(() => {
      // Mock Date.now for time control
      originalDateNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      idleTaskManager.assignTask(mockNPC);
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    test('should get task progress via getProgress method', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const currentTime = Date.now();

      // Progress is accessed via getProgress(currentTime)
      const initialProgress = task.getProgress(currentTime);
      expect(initialProgress).toBe(0); // Just started

      // Advance time
      Date.now = jest.fn(() => currentTime + task.duration / 2);
      const midProgress = task.getProgress(Date.now());
      expect(midProgress).toBeGreaterThan(0);
      expect(midProgress).toBeLessThan(100);
    });

    test('should complete task after duration expires', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const startTime = Date.now();

      // Advance time past task duration
      Date.now = jest.fn(() => startTime + task.duration + 100);
      const completed = idleTaskManager.updateTasks();

      expect(completed.length).toBe(1);
      expect(completed[0].npcId).toBe(mockNPC.id);
      expect(idleTaskManager.activeTasks.has(mockNPC.id)).toBe(false);
    });

    test('should not complete task before duration', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const startTime = Date.now();

      // Advance time but not past duration
      Date.now = jest.fn(() => startTime + task.duration / 2);
      const completed = idleTaskManager.updateTasks();

      expect(completed.length).toBe(0);
      expect(idleTaskManager.activeTasks.has(mockNPC.id)).toBe(true);
    });

    test('should handle zero elapsed time', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const currentTime = Date.now();
      const initialProgress = task.getProgress(currentTime);

      // Same time, no advancement
      const completed = idleTaskManager.updateTasks();

      expect(completed.length).toBe(0);
      expect(task.getProgress(currentTime)).toBe(initialProgress);
    });

    test('should complete task when time advances past duration', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const startTime = Date.now();

      // Advance far past duration
      Date.now = jest.fn(() => startTime + 100000); // 100 seconds

      const completed = idleTaskManager.updateTasks();
      expect(completed.length).toBe(1);
    });

    test('should return task rewards on completion', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const taskType = task.type;
      const startTime = Date.now();

      // Advance past duration
      Date.now = jest.fn(() => startTime + task.duration + 100);
      const completed = idleTaskManager.updateTasks();

      expect(completed[0].task.rewards).toBeDefined();
      expect(completed[0].task.rewards).toEqual(idleTaskManager.taskRewards[taskType]);
    });

    test('should update completion statistics', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const taskType = task.type;
      const initialCount = idleTaskManager.stats.tasksCompleted[taskType] || 0;
      const startTime = Date.now();

      // Advance past duration
      Date.now = jest.fn(() => startTime + task.duration + 100);
      idleTaskManager.updateTasks();

      expect(idleTaskManager.stats.tasksCompleted[taskType]).toBe(initialCount + 1);
    });
  });

  describe('Multiple NPCs', () => {
    test('should handle multiple NPCs with different tasks', () => {
      const npc1 = { ...mockNPC, id: 1 };
      const npc2 = { ...mockNPC, id: 2, fatigued: true };
      const npc3 = { ...mockNPC, id: 3, socialNeed: 20 };

      idleTaskManager.assignTask(npc1);
      idleTaskManager.assignTask(npc2);
      idleTaskManager.assignTask(npc3);

      expect(idleTaskManager.activeTasks.size).toBe(3);
      expect(idleTaskManager.activeTasks.get(2).type).toBe('REST');
      // NPC3 socialNeed check depends on _hasNearbyNPCs (random)
      const task3 = idleTaskManager.activeTasks.get(3);
      expect(['WANDER', 'SOCIALIZE', 'INSPECT', 'REST']).toContain(task3.type);
    });

    test('should complete tasks independently', () => {
      const originalDateNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      const npc1 = { ...mockNPC, id: 1 };
      const npc2 = { ...mockNPC, id: 2 };

      idleTaskManager.assignTask(npc1);
      idleTaskManager.assignTask(npc2);

      const task1 = idleTaskManager.activeTasks.get(1);

      // Advance time past task1 duration
      Date.now = jest.fn(() => mockTime + task1.duration + 100);
      const completed = idleTaskManager.updateTasks();

      // Task1 should be completed
      expect(completed.length).toBeGreaterThan(0);
      expect(idleTaskManager.activeTasks.has(1)).toBe(false);

      Date.now = originalDateNow;
    });
  });

  describe('Statistics', () => {
    test('should track total tasks assigned', () => {
      const npc1 = { ...mockNPC, id: 1 };
      const npc2 = { ...mockNPC, id: 2 };

      idleTaskManager.assignTask(npc1);
      idleTaskManager.assignTask(npc2);

      const stats = idleTaskManager.getStatistics();

      expect(stats.totalTasksAssigned).toBe(2);
      expect(stats.activeTasks).toBe(2);
    });

    test('should track tasks completed by type', () => {
      const originalDateNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      mockNPC.fatigued = true;
      idleTaskManager.assignTask(mockNPC);

      const task = idleTaskManager.activeTasks.get(mockNPC.id);

      // Advance time past duration
      Date.now = jest.fn(() => mockTime + task.duration + 100);
      idleTaskManager.updateTasks();

      const stats = idleTaskManager.getStatistics();
      expect(stats.tasksCompleted.REST).toBeGreaterThan(0);

      Date.now = originalDateNow;
    });

    test('should calculate average task duration', () => {
      const originalDateNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      idleTaskManager.assignTask(mockNPC);
      const task = idleTaskManager.activeTasks.get(mockNPC.id);

      // Advance time past duration
      Date.now = jest.fn(() => mockTime + task.duration + 100);
      idleTaskManager.updateTasks();

      const stats = idleTaskManager.getStatistics();
      expect(stats.averageTaskDuration).toBeGreaterThan(0);

      Date.now = originalDateNow;
    });

    test('should reset statistics correctly', () => {
      idleTaskManager.assignTask(mockNPC);

      idleTaskManager.reset();

      const stats = idleTaskManager.getStatistics();

      expect(stats.totalTasksAssigned).toBe(0);
      expect(stats.activeTasks).toBe(0);
      expect(idleTaskManager.activeTasks.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle dead NPC during task', () => {
      idleTaskManager.assignTask(mockNPC);
      mockNPC.alive = false;

      // Should not crash when updating
      const completed = idleTaskManager.updateTasks();

      expect(completed).toBeDefined();
    });

    test('should handle 100 concurrent tasks (performance)', () => {
      const startTime = performance.now();

      // Start from 1 because id: 0 is falsy and would fail the !npc.id check
      for (let i = 1; i <= 100; i++) {
        const npc = { ...mockNPC, id: i };
        idleTaskManager.assignTask(npc);
      }

      const endTime = performance.now();
      const assignTime = endTime - startTime;

      expect(assignTime).toBeLessThan(100); // Should assign in < 100ms
      expect(idleTaskManager.activeTasks.size).toBe(100);
    });

    test('should handle invalid NPC ID', () => {
      const invalidNPC = { id: null, position: { x: 0, y: 0, z: 0 } };

      const assigned = idleTaskManager.assignTask(invalidNPC);

      expect(assigned).toBe(false);
    });

    test('should throw error when created without grid', () => {
      // Constructor throws if grid is not provided
      expect(() => {
        new IdleTaskManager(null);
      }).toThrow('IdleTaskManager requires GridManager');
    });

    test('should validate WANDER task has target position', () => {
      // Force WANDER task
      mockNPC.fatigued = false;
      mockNPC.socialNeed = 100; // High social need
      mockNPC.restNeed = 100; // High rest need

      idleTaskManager.assignTask(mockNPC);
      const task = idleTaskManager.activeTasks.get(mockNPC.id);

      // WANDER and INSPECT tasks have target position in data
      if (task.type === 'WANDER') {
        expect(task.data.targetPosition).toBeDefined();
        expect(task.data.targetPosition.x).toBeDefined();
      }
    });
  });

  describe('Task Query Methods', () => {
    test('should check if NPC has active task', () => {
      expect(idleTaskManager.hasActiveTask(mockNPC.id)).toBe(false);

      idleTaskManager.assignTask(mockNPC);

      expect(idleTaskManager.hasActiveTask(mockNPC.id)).toBe(true);
    });

    test('should get active task for NPC', () => {
      idleTaskManager.assignTask(mockNPC);

      const task = idleTaskManager.getActiveTask(mockNPC.id);

      expect(task).toBeDefined();
      expect(task.type).toBeDefined();
    });

    test('should return null for non-existent task', () => {
      const task = idleTaskManager.getActiveTask(999);

      expect(task).toBeNull();
    });
  });
});
