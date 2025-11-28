/**
 * TerrainJobQueue.test.js - Unit tests for TerrainJobQueue class
 * Phase 4: Terrain Job System
 */

import { TerrainJobQueue } from '../TerrainJobQueue.js';
import { TerrainJob, JOB_TYPE, JOB_STATE } from '../TerrainJob.js';

// Mock TerrainSystem
class MockTerrainSystem {
  getHeight(x, z) {
    if (x < 5 && z < 5) return 2; // Water
    if (x > 15 && z > 15) return 9; // Stone
    return 5; // Dirt
  }
}

describe('TerrainJobQueue', () => {
  let terrainSystem;
  let jobQueue;

  beforeEach(() => {
    terrainSystem = new MockTerrainSystem();
    jobQueue = new TerrainJobQueue(terrainSystem);
  });

  describe('addJob', () => {
    test('should add a job to the queue', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 5, z: 5, width: 10, depth: 10 },
        priority: 5
      });

      expect(job).toBeInstanceOf(TerrainJob);
      expect(job.type).toBe(JOB_TYPE.FLATTEN);
      expect(jobQueue.getAllJobs().length).toBe(1);
    });

    test('should calculate estimated time automatically', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.RAISE,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      expect(job.estimatedTime).toBeGreaterThan(0);
    });

    test('should add job in PENDING state', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 5, z: 5, width: 10, depth: 10 },
        priority: 5
      });

      expect(job.state).toBe(JOB_STATE.PENDING);
    });
  });

  describe('getJob', () => {
    test('should retrieve a job by ID', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 5, z: 5, width: 10, depth: 10 },
        priority: 5
      });

      const retrieved = jobQueue.getJob(job.id);
      expect(retrieved).toBe(job);
    });

    test('should return null for non-existent job', () => {
      const job = jobQueue.getJob(9999);
      expect(job).toBeNull();
    });
  });

  describe('getAllJobs', () => {
    test('should return all jobs when no filter', () => {
      jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      jobQueue.addJob({
        type: JOB_TYPE.RAISE,
        area: { x: 10, z: 10, width: 5, depth: 5 },
        priority: 7
      });

      const jobs = jobQueue.getAllJobs();
      expect(jobs.length).toBe(2);
    });

    test('should filter jobs by state', () => {
      const job1 = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      const job2 = jobQueue.addJob({
        type: JOB_TYPE.RAISE,
        area: { x: 10, z: 10, width: 5, depth: 5 },
        priority: 7
      });

      jobQueue.assignWorker(job2.id, 1);

      const pendingJobs = jobQueue.getAllJobs({ state: JOB_STATE.PENDING });
      const activeJobs = jobQueue.getAllJobs({ state: JOB_STATE.ACTIVE });

      expect(pendingJobs.length).toBe(1);
      expect(pendingJobs[0].id).toBe(job1.id);
      expect(activeJobs.length).toBe(1);
      expect(activeJobs[0].id).toBe(job2.id);
    });

    test('should filter jobs by type', () => {
      jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      jobQueue.addJob({
        type: JOB_TYPE.RAISE,
        area: { x: 10, z: 10, width: 5, depth: 5 },
        priority: 7
      });

      const flattenJobs = jobQueue.getAllJobs({ type: JOB_TYPE.FLATTEN });
      expect(flattenJobs.length).toBe(1);
      expect(flattenJobs[0].type).toBe(JOB_TYPE.FLATTEN);
    });
  });

  describe('getNextJob', () => {
    test('should return highest priority pending job', () => {
      const lowPriorityJob = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 2
      });

      const highPriorityJob = jobQueue.addJob({
        type: JOB_TYPE.RAISE,
        area: { x: 10, z: 10, width: 5, depth: 5 },
        priority: 9
      });

      const nextJob = jobQueue.getNextJob({ x: 0, z: 0 });
      expect(nextJob.id).toBe(highPriorityJob.id);
    });

    test('should prefer closer jobs when priority is equal', () => {
      const farJob = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 50, z: 50, width: 5, depth: 5 },
        priority: 5
      });

      const nearJob = jobQueue.addJob({
        type: JOB_TYPE.RAISE,
        area: { x: 2, z: 2, width: 5, depth: 5 },
        priority: 5
      });

      const npcPosition = { x: 0, z: 0 };
      const nextJob = jobQueue.getNextJob(npcPosition);
      expect(nextJob.id).toBe(nearJob.id);
    });

    test('should return null when no pending jobs', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      jobQueue.assignWorker(job.id, 1);

      const nextJob = jobQueue.getNextJob({ x: 0, z: 0 });
      expect(nextJob).toBeNull();
    });
  });

  describe('assignWorker', () => {
    test('should assign worker to job', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      const result = jobQueue.assignWorker(job.id, 1);
      expect(result).toBe(true);
      expect(job.assignedWorkers).toContain(1);
      expect(job.state).toBe(JOB_STATE.ACTIVE);
    });

    test('should return false for non-existent job', () => {
      const result = jobQueue.assignWorker(9999, 1);
      expect(result).toBe(false);
    });
  });

  describe('removeWorker', () => {
    test('should remove worker from job', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      jobQueue.assignWorker(job.id, 1);
      jobQueue.assignWorker(job.id, 2);

      const result = jobQueue.removeWorker(job.id, 1);
      expect(result).toBe(true);
      expect(job.assignedWorkers).not.toContain(1);
      expect(job.assignedWorkers).toContain(2);
    });

    test('should return job to PENDING when last worker removed', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      jobQueue.assignWorker(job.id, 1);
      expect(job.state).toBe(JOB_STATE.ACTIVE);

      jobQueue.removeWorker(job.id, 1);
      expect(job.state).toBe(JOB_STATE.PENDING);
    });
  });

  describe('updateJobProgress', () => {
    test('should update job progress', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      jobQueue.assignWorker(job.id, 1);

      const initialProgress = job.progress;
      jobQueue.updateJobProgress(job.id, 1000, 1.0);

      expect(job.progress).toBeGreaterThan(initialProgress);
    });

    test('should return false for non-existent job', () => {
      const result = jobQueue.updateJobProgress(9999, 1000, 1.0);
      expect(result).toBe(false);
    });

    test('should complete job when progress reaches 100%', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 2, depth: 2 }, // Small area for quick completion
        priority: 5
      });

      jobQueue.assignWorker(job.id, 1);

      // Update with massive time to complete instantly
      jobQueue.updateJobProgress(job.id, job.estimatedTime, 1.0);

      expect(job.progress).toBe(1.0);
      expect(job.state).toBe(JOB_STATE.COMPLETED);
    });
  });

  describe('cancelJob', () => {
    test('should cancel a job', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      const result = jobQueue.cancelJob(job.id);
      expect(result).toBe(true);
      expect(job.state).toBe(JOB_STATE.CANCELLED);
    });

    test('should remove workers when cancelling', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      jobQueue.assignWorker(job.id, 1);
      jobQueue.assignWorker(job.id, 2);

      jobQueue.cancelJob(job.id);
      expect(job.assignedWorkers.length).toBe(0);
    });

    test('should return false for non-existent job', () => {
      const result = jobQueue.cancelJob(9999);
      expect(result).toBe(false);
    });
  });

  describe('removeJob', () => {
    test('should remove a job from queue', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      const result = jobQueue.removeJob(job.id);
      expect(result).toBe(true);
      expect(jobQueue.getAllJobs().length).toBe(0);
    });

    test('should return false for non-existent job', () => {
      const result = jobQueue.removeJob(9999);
      expect(result).toBe(false);
    });
  });

  describe('getStatistics', () => {
    test('should return correct statistics', () => {
      // Add pending job
      jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      // Add active job
      const activeJob = jobQueue.addJob({
        type: JOB_TYPE.RAISE,
        area: { x: 10, z: 10, width: 5, depth: 5 },
        priority: 7
      });
      jobQueue.assignWorker(activeJob.id, 1);

      // Add completed job
      const completedJob = jobQueue.addJob({
        type: JOB_TYPE.SMOOTH,
        area: { x: 20, z: 20, width: 2, depth: 2 },
        priority: 3
      });
      jobQueue.assignWorker(completedJob.id, 1);
      jobQueue.updateJobProgress(completedJob.id, completedJob.estimatedTime, 1.0);

      const stats = jobQueue.getStatistics();
      expect(stats.pending).toBe(1);
      expect(stats.active).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.totalJobs).toBe(3);
    });
  });

  describe('serialize and deserialize', () => {
    test('should serialize queue state correctly', () => {
      jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      jobQueue.addJob({
        type: JOB_TYPE.RAISE,
        area: { x: 10, z: 10, width: 5, depth: 5 },
        priority: 7
      });

      const serialized = jobQueue.serialize();
      expect(serialized.jobs).toHaveLength(2);
      expect(serialized.jobs[0].type).toBe(JOB_TYPE.FLATTEN);
      expect(serialized.jobs[1].type).toBe(JOB_TYPE.RAISE);
    });

    test('should deserialize queue state correctly', () => {
      const job1 = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      jobQueue.assignWorker(job1.id, 1);

      const serialized = jobQueue.serialize();

      // Create new queue and deserialize
      const newQueue = new TerrainJobQueue(terrainSystem);
      newQueue.deserialize(serialized);

      const jobs = newQueue.getAllJobs();
      expect(jobs.length).toBe(1);
      expect(jobs[0].type).toBe(JOB_TYPE.FLATTEN);
      expect(jobs[0].assignedWorkers).toContain(1);
      expect(jobs[0].state).toBe(JOB_STATE.ACTIVE);
    });

    test('should maintain job IDs after deserialization', () => {
      const job = jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 5
      });

      const originalId = job.id;
      const serialized = jobQueue.serialize();

      const newQueue = new TerrainJobQueue(terrainSystem);
      newQueue.deserialize(serialized);

      const restored = newQueue.getJob(originalId);
      expect(restored).not.toBeNull();
      expect(restored.id).toBe(originalId);
    });
  });

  describe('priority sorting', () => {
    test('should maintain sorted order when adding jobs', () => {
      jobQueue.addJob({
        type: JOB_TYPE.FLATTEN,
        area: { x: 0, z: 0, width: 5, depth: 5 },
        priority: 3
      });

      jobQueue.addJob({
        type: JOB_TYPE.RAISE,
        area: { x: 10, z: 10, width: 5, depth: 5 },
        priority: 9
      });

      jobQueue.addJob({
        type: JOB_TYPE.LOWER,
        area: { x: 20, z: 20, width: 5, depth: 5 },
        priority: 6
      });

      const pendingJobs = jobQueue.getAllJobs({ state: JOB_STATE.PENDING });

      // Should be sorted by priority (descending)
      expect(pendingJobs[0].priority).toBe(9);
      expect(pendingJobs[1].priority).toBe(6);
      expect(pendingJobs[2].priority).toBe(3);
    });
  });
});
