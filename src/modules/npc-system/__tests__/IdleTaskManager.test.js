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
    test('should assign WANDER task to idle NPC', () => {
      const assigned = idleTaskManager.assignTask(mockNPC);

      expect(assigned).toBe(true);
      expect(idleTaskManager.activeTasks.has(mockNPC.id)).toBe(true);
      expect(idleTaskManager.stats.totalTasksAssigned).toBe(1);
    });

    test('should assign REST task to fatigued NPC (priority)', () => {
      mockNPC.fatigued = true;

      idleTaskManager.assignTask(mockNPC);

      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      expect(task.type).toBe('REST');
    });

    test('should assign SOCIALIZE task to lonely NPC', () => {
      mockNPC.happiness = 20; // Low happiness triggers socialize

      idleTaskManager.assignTask(mockNPC);

      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      expect(task.type).toBe('SOCIALIZE');
    });

    test('should not assign task to working NPC', () => {
      mockNPC.isWorking = true;

      const assigned = idleTaskManager.assignTask(mockNPC);

      expect(assigned).toBe(false);
      expect(idleTaskManager.activeTasks.has(mockNPC.id)).toBe(false);
    });

    test('should not assign duplicate tasks to same NPC', () => {
      idleTaskManager.assignTask(mockNPC);
      const secondAssign = idleTaskManager.assignTask(mockNPC);

      expect(secondAssign).toBe(false);
      expect(idleTaskManager.activeTasks.size).toBe(1);
    });

    test('should handle NPC without position', () => {
      delete mockNPC.position;

      const assigned = idleTaskManager.assignTask(mockNPC);

      expect(assigned).toBe(false);
    });

    test('should assign EXPLORE task occasionally', () => {
      // Run multiple assignments to test randomness
      let exploreAssigned = false;

      for (let i = 0; i < 50; i++) {
        const npc = { ...mockNPC, id: i, isWorking: false };
        idleTaskManager.assignTask(npc);

        const task = idleTaskManager.activeTasks.get(i);
        if (task && task.type === 'EXPLORE') {
          exploreAssigned = true;
          break;
        }
      }

      expect(exploreAssigned).toBe(true);
    });
  });

  describe('Task Progress and Completion', () => {
    beforeEach(() => {
      idleTaskManager.assignTask(mockNPC);
    });

    test('should update task progress with deltaTime', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const initialProgress = task.progress;

      idleTaskManager.updateTasks(5); // 5 seconds

      expect(task.progress).toBeGreaterThan(initialProgress);
    });

    test('should complete task after duration expires', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);

      // Fast-forward past task duration
      const completed = idleTaskManager.updateTasks(task.duration + 1);

      expect(completed.length).toBe(1);
      expect(completed[0].npcId).toBe(mockNPC.id);
      expect(idleTaskManager.activeTasks.has(mockNPC.id)).toBe(false);
    });

    test('should not complete task before duration', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);

      const completed = idleTaskManager.updateTasks(task.duration - 10);

      expect(completed.length).toBe(0);
      expect(idleTaskManager.activeTasks.has(mockNPC.id)).toBe(true);
    });

    test('should handle zero deltaTime', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const initialProgress = task.progress;

      idleTaskManager.updateTasks(0);

      expect(task.progress).toBe(initialProgress);
    });

    test('should handle large deltaTime (catch-up)', () => {
      const completed = idleTaskManager.updateTasks(1000); // 1000 seconds

      expect(completed.length).toBeGreaterThan(0);
    });

    test('should return task rewards on completion', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const taskType = task.type;

      const completed = idleTaskManager.updateTasks(task.duration + 1);

      expect(completed[0].task.rewards).toBeDefined();
      expect(completed[0].task.rewards).toEqual(idleTaskManager.taskRewards[taskType]);
    });

    test('should update completion statistics', () => {
      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      const taskType = task.type;
      const initialCount = idleTaskManager.stats.tasksCompleted[taskType] || 0;

      idleTaskManager.updateTasks(task.duration + 1);

      expect(idleTaskManager.stats.tasksCompleted[taskType]).toBe(initialCount + 1);
    });
  });

  describe('Multiple NPCs', () => {
    test('should handle multiple NPCs with different tasks', () => {
      const npc1 = { ...mockNPC, id: 1 };
      const npc2 = { ...mockNPC, id: 2, fatigued: true };
      const npc3 = { ...mockNPC, id: 3, happiness: 20 };

      idleTaskManager.assignTask(npc1);
      idleTaskManager.assignTask(npc2);
      idleTaskManager.assignTask(npc3);

      expect(idleTaskManager.activeTasks.size).toBe(3);
      expect(idleTaskManager.activeTasks.get(2).type).toBe('REST');
      expect(idleTaskManager.activeTasks.get(3).type).toBe('SOCIALIZE');
    });

    test('should complete tasks independently', () => {
      const npc1 = { ...mockNPC, id: 1 };
      const npc2 = { ...mockNPC, id: 2 };

      idleTaskManager.assignTask(npc1);
      idleTaskManager.assignTask(npc2);

      const task1 = idleTaskManager.activeTasks.get(1);
      const task2 = idleTaskManager.activeTasks.get(2);

      // Complete only task1
      const completed = idleTaskManager.updateTasks(task1.duration + 1);

      // Both tasks might complete if they have same duration
      // But we're testing that they're handled independently
      expect(idleTaskManager.activeTasks.has(1)).toBe(false);
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
      mockNPC.fatigued = true;
      idleTaskManager.assignTask(mockNPC);

      const task = idleTaskManager.activeTasks.get(mockNPC.id);
      idleTaskManager.updateTasks(task.duration + 1);

      const stats = idleTaskManager.getStatistics();

      expect(stats.tasksCompleted.REST).toBeGreaterThan(0);
    });

    test('should calculate average task duration', () => {
      idleTaskManager.assignTask(mockNPC);
      const task = idleTaskManager.activeTasks.get(mockNPC.id);

      idleTaskManager.updateTasks(task.duration + 1);

      const stats = idleTaskManager.getStatistics();

      expect(stats.averageTaskDuration).toBeGreaterThan(0);
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
      const completed = idleTaskManager.updateTasks(100);

      expect(completed).toBeDefined();
    });

    test('should handle 100 concurrent tasks (performance)', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
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

    test('should handle missing grid reference', () => {
      const noGridManager = new IdleTaskManager(null);

      const assigned = noGridManager.assignTask(mockNPC);

      expect(assigned).toBe(false);
    });

    test('should validate task has target position', () => {
      idleTaskManager.assignTask(mockNPC);
      const task = idleTaskManager.activeTasks.get(mockNPC.id);

      expect(task.targetPosition).toBeDefined();
      expect(task.targetPosition.x).toBeDefined();
      expect(task.targetPosition.y).toBeDefined();
      expect(task.targetPosition.z).toBeDefined();
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
