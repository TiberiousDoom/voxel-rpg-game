/**
 * GatheringManager.test.js - Tests for resource gathering system
 *
 * Tests mining task creation, assignment, and completion.
 *
 * Part of Phase 17: Integration Tests
 */

import { GatheringManager } from '../GatheringManager.js';
import { MiningTask, MiningTaskStatus, MiningPriority } from '../MiningTask.js';
import { BlockType } from '../../voxel/BlockTypes.js';

describe('MiningTask', () => {
  describe('Creation', () => {
    test('should create with default values', () => {
      const task = new MiningTask({
        x: 10,
        y: 20,
        z: 5,
        blockType: BlockType.STONE
      });

      expect(task.id).toBeDefined();
      expect(task.position.x).toBe(10);
      expect(task.position.y).toBe(20);
      expect(task.position.z).toBe(5);
      expect(task.blockType).toBe(BlockType.STONE);
      expect(task.status).toBe(MiningTaskStatus.PENDING);
    });

    test('should calculate mining time based on block type', () => {
      const stoneTask = new MiningTask({ blockType: BlockType.STONE });
      const dirtTask = new MiningTask({ blockType: BlockType.DIRT });

      // Stone should take longer than dirt
      expect(stoneTask.totalMiningTime).toBeGreaterThan(dirtTask.totalMiningTime);
    });

    test('should apply tool modifier to mining time', () => {
      const normalTask = new MiningTask({ blockType: BlockType.STONE, toolModifier: 1.0 });
      const fastTask = new MiningTask({ blockType: BlockType.STONE, toolModifier: 2.0 });

      expect(fastTask.totalMiningTime).toBeLessThan(normalTask.totalMiningTime);
    });
  });

  describe('Assignment', () => {
    test('should assign to NPC', () => {
      const task = new MiningTask({ blockType: BlockType.DIRT });

      const result = task.assign('npc-1');
      expect(result).toBe(true);
      expect(task.assignedNpcId).toBe('npc-1');
      expect(task.status).toBe(MiningTaskStatus.ASSIGNED);
    });

    test('should not assign if not pending', () => {
      const task = new MiningTask({ blockType: BlockType.DIRT });
      task.assign('npc-1');

      const result = task.assign('npc-2');
      expect(result).toBe(false);
      expect(task.assignedNpcId).toBe('npc-1');
    });
  });

  describe('Progress', () => {
    test('should track mining progress', () => {
      const task = new MiningTask({ blockType: BlockType.DIRT });
      task.assign('npc-1');
      task.startTraveling();
      task.startMining();

      task.updateProgress(5);
      expect(task.miningProgress).toBe(5);
      expect(task.getProgress()).toBeGreaterThan(0);
    });

    test('should complete when progress reaches total', () => {
      const task = new MiningTask({ blockType: BlockType.DIRT });
      task.assign('npc-1');
      task.startTraveling();
      task.startMining();

      const complete = task.updateProgress(task.totalMiningTime);
      expect(complete).toBe(true);
      expect(task.status).toBe(MiningTaskStatus.COMPLETED);
    });

    test('should return time remaining', () => {
      const task = new MiningTask({ blockType: BlockType.DIRT });
      task.assign('npc-1');
      task.startTraveling();
      task.startMining();

      const halfTime = task.totalMiningTime / 2;
      task.updateProgress(halfTime);

      expect(task.getTimeRemaining()).toBeCloseTo(halfTime, 0);
    });
  });

  describe('Cancellation', () => {
    test('should cancel task', () => {
      const task = new MiningTask({ blockType: BlockType.STONE });
      task.cancel();

      expect(task.status).toBe(MiningTaskStatus.CANCELLED);
    });

    test('should unassign task', () => {
      const task = new MiningTask({ blockType: BlockType.STONE });
      task.assign('npc-1');
      task.unassign();

      expect(task.assignedNpcId).toBeNull();
      expect(task.status).toBe(MiningTaskStatus.PENDING);
      expect(task.miningProgress).toBe(0);
    });
  });

  describe('Serialization', () => {
    test('should export to JSON', () => {
      const task = new MiningTask({
        x: 5,
        y: 10,
        z: 2,
        blockType: BlockType.IRON_ORE,
        priority: MiningPriority.HIGH
      });

      const json = task.toJSON();

      expect(json.id).toBe(task.id);
      expect(json.position.x).toBe(5);
      expect(json.blockType).toBe(BlockType.IRON_ORE);
      expect(json.priority).toBe(MiningPriority.HIGH);
    });

    test('should restore from JSON', () => {
      const original = new MiningTask({
        x: 3,
        y: 6,
        z: 1,
        blockType: BlockType.GOLD_ORE
      });
      original.assign('npc-5');

      const json = original.toJSON();
      const restored = MiningTask.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.position.x).toBe(3);
      expect(restored.assignedNpcId).toBe('npc-5');
    });
  });
});

describe('GatheringManager', () => {
  let manager;
  let mockVoxelWorld;

  beforeEach(() => {
    mockVoxelWorld = {
      getBlock: jest.fn((x, y, z) => BlockType.STONE),
      setBlock: jest.fn(() => true)
    };

    manager = new GatheringManager({
      voxelWorld: mockVoxelWorld,
      autoCreateHaulTask: false
    });
  });

  afterEach(() => {
    manager.reset();
  });

  describe('Designating Mining', () => {
    test('should designate block for mining', () => {
      const task = manager.designateMining(5, 5, 0);

      expect(task).toBeDefined();
      expect(task.position.x).toBe(5);
      expect(task.position.y).toBe(5);
      expect(task.position.z).toBe(0);
    });

    test('should not duplicate designation at same position', () => {
      const task1 = manager.designateMining(10, 10, 0);
      const task2 = manager.designateMining(10, 10, 0);

      expect(task1).toBeDefined();
      expect(task2).toBeNull();
    });

    test('should designate region for mining', () => {
      const tasks = manager.designateMiningRegion(
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 2, z: 0 }
      );

      expect(tasks.length).toBe(9); // 3x3 region
    });

    test('should update statistics on designation', () => {
      manager.designateMining(0, 0, 0);
      manager.designateMining(1, 0, 0);

      expect(manager.stats.tasksCreated).toBe(2);
    });
  });

  describe('Task Assignment', () => {
    test('should get available task for NPC', () => {
      manager.designateMining(5, 5, 0);

      const task = manager.getAvailableTask('npc-1', { x: 0, y: 0, z: 0 });
      expect(task).toBeDefined();
    });

    test('should assign task to NPC', () => {
      const task = manager.designateMining(5, 5, 0);

      const result = manager.assignTask(task.id, 'npc-1');
      expect(result).toBe(true);
    });

    test('should return same task for already-assigned NPC', () => {
      const task = manager.designateMining(5, 5, 0);
      manager.assignTask(task.id, 'npc-1');

      const returned = manager.getAvailableTask('npc-1', { x: 0, y: 0, z: 0 });
      expect(returned.id).toBe(task.id);
    });
  });

  describe('Mining Progress', () => {
    test('should update mining progress', () => {
      const task = manager.designateMining(5, 5, 0);
      manager.assignTask(task.id, 'npc-1');
      task.startTraveling();
      task.startMining();

      const result = manager.updateMiningProgress(task.id, 5);
      expect(result).toBeNull(); // Not complete yet
      expect(task.miningProgress).toBe(5);
    });

    test('should complete mining and return resources', () => {
      const task = manager.designateMining(5, 5, 0);
      manager.assignTask(task.id, 'npc-1');
      task.startTraveling();
      task.startMining();

      const result = manager.updateMiningProgress(task.id, task.totalMiningTime);

      expect(result).toBeDefined();
      expect(result.resources).toBeDefined();
      expect(result.position).toEqual({ x: 5, y: 5, z: 0 });
    });

    test('should remove block on completion', () => {
      const task = manager.designateMining(5, 5, 0);
      manager.assignTask(task.id, 'npc-1');
      task.startTraveling();
      task.startMining();

      manager.updateMiningProgress(task.id, task.totalMiningTime);

      expect(mockVoxelWorld.setBlock).toHaveBeenCalledWith(5, 5, 0, 0);
    });

    test('should update statistics on completion', () => {
      const task = manager.designateMining(5, 5, 0);
      manager.assignTask(task.id, 'npc-1');
      task.startTraveling();
      task.startMining();

      manager.updateMiningProgress(task.id, task.totalMiningTime);

      expect(manager.stats.blocksMinedTotal).toBe(1);
      expect(manager.stats.tasksCompleted).toBe(1);
    });
  });

  describe('Task Cancellation', () => {
    test('should cancel mining by position', () => {
      manager.designateMining(5, 5, 0);

      const result = manager.cancelMining(5, 5, 0);
      expect(result).toBe(true);
      expect(manager.stats.tasksCancelled).toBe(1);
    });

    test('should cancel task by ID', () => {
      const task = manager.designateMining(5, 5, 0);

      const result = manager.cancelTask(task.id);
      expect(result).toBe(true);
    });

    test('should unassign NPC on cancellation', () => {
      const task = manager.designateMining(5, 5, 0);
      manager.assignTask(task.id, 'npc-1');

      manager.cancelTask(task.id);

      const newTask = manager.getAvailableTask('npc-1', { x: 0, y: 0, z: 0 });
      expect(newTask).toBeNull();
    });
  });

  describe('Task Queries', () => {
    test('should get task at position', () => {
      const task = manager.designateMining(5, 5, 0);

      const found = manager.getTaskAtPosition(5, 5, 0);
      expect(found.id).toBe(task.id);
    });

    test('should get pending tasks', () => {
      manager.designateMining(0, 0, 0);
      manager.designateMining(1, 0, 0);
      manager.designateMining(2, 0, 0);

      const pending = manager.getPendingTasks();
      expect(pending.length).toBe(3);
    });

    test('should get active tasks', () => {
      const task = manager.designateMining(5, 5, 0);
      manager.assignTask(task.id, 'npc-1');

      const active = manager.getActiveTasks();
      expect(active.length).toBe(1);
    });
  });

  describe('State Management', () => {
    test('should enable/disable manager', () => {
      manager.setEnabled(false);
      expect(manager.enabled).toBe(false);

      manager.setEnabled(true);
      expect(manager.enabled).toBe(true);
    });

    test('should export to JSON', () => {
      manager.designateMining(5, 5, 0);
      manager.designateMining(10, 10, 0);

      const json = manager.toJSON();

      expect(json.tasks.length).toBe(2);
      expect(json.stats).toBeDefined();
    });

    test('should import from JSON', () => {
      manager.designateMining(5, 5, 0);
      const json = manager.toJSON();

      manager.reset();
      manager.fromJSON(json);

      const task = manager.getTaskAtPosition(5, 5, 0);
      expect(task).toBeDefined();
    });

    test('should reset state', () => {
      manager.designateMining(5, 5, 0);
      manager.reset();

      expect(manager.miningTasks.size).toBe(0);
      expect(manager.stats.tasksCreated).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('should return comprehensive stats', () => {
      manager.designateMining(0, 0, 0);
      manager.designateMining(1, 0, 0);

      const stats = manager.getStats();

      expect(stats.tasksCreated).toBe(2);
      expect(stats.pendingTasks).toBe(2);
      expect(stats.activeTasks).toBe(0);
      expect(stats.totalTasks).toBe(2);
    });
  });
});
