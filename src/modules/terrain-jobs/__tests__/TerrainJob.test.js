/**
 * TerrainJob.test.js - Unit tests for TerrainJob class
 * Phase 4: Terrain Job System
 */

import { TerrainJob, JOB_TYPE, JOB_STATE, PRIORITY_LEVELS, MAX_WORKERS } from '../TerrainJob.js';

describe('TerrainJob', () => {
  describe('constructor', () => {
    test('should create a job with required parameters', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 5, z: 5, width: 10, depth: 10 },
        priority: 5
      });

      expect(job.id).toBeDefined();
      expect(job.type).toBe(JOB_TYPE.FLATTEN);
      expect(job.area).toEqual({ x: 5, z: 5, width: 10, depth: 10 });
      expect(job.priority).toBe(5);
      expect(job.state).toBe(JOB_STATE.PENDING);
      expect(job.progress).toBe(0);
      expect(job.assignedWorkers).toEqual([]);
    });

    test('should clamp priority to valid range', () => {
      const lowJob = new TerrainJob({
        type: JOB_TYPE.RAISE,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: -5
      });
      expect(lowJob.priority).toBe(1);

      const highJob = new TerrainJob({
        type: JOB_TYPE.RAISE,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 100
      });
      expect(highJob.priority).toBe(10);
    });

    test('should generate unique IDs', () => {
      const job1 = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      const job2 = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      expect(job1.id).not.toBe(job2.id);
    });
  });

  describe('assignWorker', () => {
    test('should assign a worker to the job', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      const result = job.assignWorker(1);
      expect(result).toBe(true);
      expect(job.assignedWorkers).toContain(1);
      expect(job.assignedWorkers.length).toBe(1);
    });

    test('should not assign duplicate workers', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      job.assignWorker(1);
      const result = job.assignWorker(1);

      expect(result).toBe(false);
      expect(job.assignedWorkers.length).toBe(1);
    });

    test('should not assign workers beyond max capacity', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      // Assign max workers
      for (let i = 0; i < MAX_WORKERS; i++) {
        job.assignWorker(i);
      }

      // Try to assign one more
      const result = job.assignWorker(MAX_WORKERS + 1);
      expect(result).toBe(false);
      expect(job.assignedWorkers.length).toBe(MAX_WORKERS);
    });

    test('should transition from PENDING to ACTIVE when first worker assigned', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      expect(job.state).toBe(JOB_STATE.PENDING);
      job.assignWorker(1);
      expect(job.state).toBe(JOB_STATE.ACTIVE);
    });
  });

  describe('removeWorker', () => {
    test('should remove an assigned worker', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      job.assignWorker(1);
      job.assignWorker(2);

      const result = job.removeWorker(1);
      expect(result).toBe(true);
      expect(job.assignedWorkers).not.toContain(1);
      expect(job.assignedWorkers).toContain(2);
    });

    test('should return false when removing non-assigned worker', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      const result = job.removeWorker(999);
      expect(result).toBe(false);
    });

    test('should transition from ACTIVE to PENDING when last worker removed', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      job.assignWorker(1);
      expect(job.state).toBe(JOB_STATE.ACTIVE);

      job.removeWorker(1);
      expect(job.state).toBe(JOB_STATE.PENDING);
    });
  });

  describe('updateProgress', () => {
    test('should update progress correctly', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5,
        estimatedTime: 10000
      });

      job.assignWorker(1);

      // Update with 1 second worth of work at 1x speed
      job.updateProgress(1000, 1.0);

      expect(job.elapsedTime).toBe(1000);
      expect(job.progress).toBeCloseTo(0.1); // 1000 / 10000 = 0.1
    });

    test('should cap progress at 1.0', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5,
        estimatedTime: 1000
      });

      job.assignWorker(1);
      job.updateProgress(2000, 1.0);

      expect(job.progress).toBe(1.0);
      expect(job.elapsedTime).toBe(2000); // Still tracks actual time
    });

    test('should apply speed multiplier correctly', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5,
        estimatedTime: 10000
      });

      job.assignWorker(1);

      // 2x speed multiplier doubles progress
      job.updateProgress(1000, 2.0);

      expect(job.progress).toBeCloseTo(0.2); // (1000 * 2.0) / 10000 = 0.2
    });

    test('should transition to COMPLETED when progress reaches 100%', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5,
        estimatedTime: 1000
      });

      job.assignWorker(1);
      expect(job.state).toBe(JOB_STATE.ACTIVE);

      job.updateProgress(1000, 1.0);
      expect(job.progress).toBe(1.0);
      expect(job.state).toBe(JOB_STATE.COMPLETED);
    });
  });

  describe('cancel', () => {
    test('should cancel a pending job', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      job.cancel();
      expect(job.state).toBe(JOB_STATE.CANCELLED);
    });

    test('should cancel an active job', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      job.assignWorker(1);
      job.cancel();

      expect(job.state).toBe(JOB_STATE.CANCELLED);
    });

    test('should not cancel a completed job', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5,
        estimatedTime: 1000
      });

      job.assignWorker(1);
      job.updateProgress(1000, 1.0);
      expect(job.state).toBe(JOB_STATE.COMPLETED);

      job.cancel();
      expect(job.state).toBe(JOB_STATE.COMPLETED); // Stays completed
    });
  });

  describe('getWorkerPosition', () => {
    test('should return positions around job area perimeter', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 10, z: 10, width: 10, depth: 10 },
        priority: 5
      });

      const pos0 = job.getWorkerPosition(0);
      const pos1 = job.getWorkerPosition(1);

      // Should be different positions
      expect(pos0).not.toEqual(pos1);

      // Should be near the job area
      expect(pos0.x).toBeGreaterThanOrEqual(9);
      expect(pos0.x).toBeLessThanOrEqual(21);
      expect(pos0.z).toBeGreaterThanOrEqual(9);
      expect(pos0.z).toBeLessThanOrEqual(21);
    });

    test('should distribute workers evenly around perimeter', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 10, z: 10, width: 10, depth: 10 },
        priority: 5
      });

      const positions = [];
      for (let i = 0; i < 4; i++) {
        positions.push(job.getWorkerPosition(i));
      }

      // All positions should be unique
      const uniquePositions = new Set(positions.map(p => `${p.x},${p.z}`));
      expect(uniquePositions.size).toBe(4);
    });
  });

  describe('canAcceptWorkers', () => {
    test('should return true when workers can be assigned', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      expect(job.canAcceptWorkers()).toBe(true);
    });

    test('should return false when job is completed', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5,
        estimatedTime: 1000
      });

      job.assignWorker(1);
      job.updateProgress(1000, 1.0);

      expect(job.canAcceptWorkers()).toBe(false);
    });

    test('should return false when job is cancelled', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      job.cancel();
      expect(job.canAcceptWorkers()).toBe(false);
    });

    test('should return false when max workers reached', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      for (let i = 0; i < MAX_WORKERS; i++) {
        job.assignWorker(i);
      }

      expect(job.canAcceptWorkers()).toBe(false);
    });
  });

  describe('serialize and deserialize', () => {
    test('should serialize job state correctly', () => {
      const job = new TerrainJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 5, z: 5, width: 10, depth: 10 },
        priority: 7,
        estimatedTime: 5000
      });

      job.assignWorker(1);
      job.assignWorker(2);
      job.updateProgress(1000, 1.0);

      const serialized = job.serialize();

      expect(serialized.id).toBe(job.id);
      expect(serialized.type).toBe(JOB_TYPE.FLATTEN);
      expect(serialized.area).toEqual({ x: 5, z: 5, width: 10, depth: 10 });
      expect(serialized.priority).toBe(7);
      expect(serialized.state).toBe(JOB_STATE.ACTIVE);
      expect(serialized.progress).toBeCloseTo(0.2);
      expect(serialized.assignedWorkers).toEqual([1, 2]);
    });

    test('should deserialize job state correctly', () => {
      const data = {
        id: 123,
        type: JOB_TYPE.RAISE,
        area: { x: 3, z: 3, width: 8, depth: 8 },
        priority: 9,
        state: JOB_STATE.ACTIVE,
        progress: 0.5,
        elapsedTime: 2500,
        estimatedTime: 5000,
        assignedWorkers: [1, 2, 3],
        createdAt: Date.now()
      };

      const job = TerrainJob.deserialize(data);

      expect(job.id).toBe(123);
      expect(job.type).toBe(JOB_TYPE.RAISE);
      expect(job.area).toEqual({ x: 3, z: 3, width: 8, depth: 8 });
      expect(job.priority).toBe(9);
      expect(job.state).toBe(JOB_STATE.ACTIVE);
      expect(job.progress).toBe(0.5);
      expect(job.elapsedTime).toBe(2500);
      expect(job.estimatedTime).toBe(5000);
      expect(job.assignedWorkers).toEqual([1, 2, 3]);
    });

    test('should round-trip serialize/deserialize correctly', () => {
      const original = new TerrainJob({
        type: JOB_TYPE.SMOOTH,
        area: { x: 1, z: 1, width: 5, depth: 5 },
        priority: 3,
        estimatedTime: 3000
      });

      original.assignWorker(5);
      original.updateProgress(900, 1.0);

      const serialized = original.serialize();
      const restored = TerrainJob.deserialize(serialized);

      expect(restored.id).toBe(original.id);
      expect(restored.type).toBe(original.type);
      expect(restored.area).toEqual(original.area);
      expect(restored.priority).toBe(original.priority);
      expect(restored.state).toBe(original.state);
      expect(restored.progress).toBeCloseTo(original.progress);
      expect(restored.assignedWorkers).toEqual(original.assignedWorkers);
    });
  });
});
