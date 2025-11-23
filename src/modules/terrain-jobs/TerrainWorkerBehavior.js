/**
 * TerrainWorkerBehavior.js - NPC terrain job worker behavior system
 *
 * Phase 4: Terrain Job System
 *
 * Manages NPC interaction with terrain jobs:
 * - Assigns idle NPCs to available terrain jobs
 * - Navigates NPCs to job locations
 * - Updates job progress based on NPC terrain_work skill
 * - Completes jobs and frees up NPCs
 * - Handles multi-worker coordination
 *
 * Usage:
 *   const behavior = new TerrainWorkerBehavior(npcManager, jobQueue);
 *   behavior.update(deltaTime); // Call each frame
 */

import { JOB_STATE } from './TerrainJob.js';

/**
 * Distance threshold for NPC to be considered "at job"
 */
const JOB_ARRIVAL_DISTANCE = 0.5;

/**
 * How often to check for new job assignments (milliseconds)
 */
const JOB_CHECK_INTERVAL = 1000; // 1 second

/**
 * TerrainWorkerBehavior class
 * Manages NPC worker behavior for terrain jobs
 */
export class TerrainWorkerBehavior {
  /**
   * Create terrain worker behavior system
   * @param {NPCManager} npcManager - NPC manager instance
   * @param {TerrainJobQueue} jobQueue - Terrain job queue instance
   */
  constructor(npcManager, jobQueue) {
    this.npcManager = npcManager;
    this.jobQueue = jobQueue;

    // Track NPCs assigned to jobs
    this.npcJobAssignments = new Map(); // npcId -> jobId
    this.jobWorkers = new Map(); // jobId -> Set<npcId>

    // Timing
    this.lastJobCheckTime = 0;
  }

  /**
   * Update worker behavior (call each frame)
   * @param {number} deltaTime - Time elapsed in seconds
   */
  update(deltaTime) {
    const now = Date.now();

    // Check for new job assignments periodically
    if (now - this.lastJobCheckTime > JOB_CHECK_INTERVAL) {
      this.assignIdleWorkersToJobs();
      this.lastJobCheckTime = now;
    }

    // Update workers currently on jobs
    this.updateWorkersOnJobs(deltaTime);
  }

  /**
   * Assign idle workers to available jobs
   * @private
   */
  assignIdleWorkersToJobs() {
    // Get all NPCs
    const npcs = Array.from(this.npcManager.npcs.values());

    // Filter idle NPCs (not assigned to jobs, not on expedition, alive)
    const idleNPCs = npcs.filter(npc =>
      npc.alive &&
      !npc.onExpedition &&
      !this.npcJobAssignments.has(npc.id) &&
      !npc.isResting
    );

    if (idleNPCs.length === 0) return;

    // Get pending/active jobs that can accept more workers
    const availableJobs = this.jobQueue.getAllJobs({
      state: JOB_STATE.PENDING
    }).concat(this.jobQueue.getAllJobs({
      state: JOB_STATE.ACTIVE
    })).filter(job => job.canAcceptWorkers());

    if (availableJobs.length === 0) return;

    // Assign workers to jobs
    for (const npc of idleNPCs) {
      // Find best job for this NPC
      const bestJob = this.jobQueue.getNextJob(
        { x: npc.position.x, z: npc.position.z },
        { terrain_work: npc.skills.terrain_work || 1.0 }
      );

      if (bestJob && bestJob.canAcceptWorkers()) {
        this.assignWorkerToJob(npc, bestJob);
      }
    }
  }

  /**
   * Assign a worker NPC to a job
   * @param {NPC} npc - NPC to assign
   * @param {TerrainJob} job - Job to assign to
   * @private
   */
  assignWorkerToJob(npc, job) {
    // Assign worker to job queue
    const success = this.jobQueue.assignWorker(job.id, npc.id);

    if (success) {
      // Track assignment
      this.npcJobAssignments.set(npc.id, job.id);

      if (!this.jobWorkers.has(job.id)) {
        this.jobWorkers.set(job.id, new Set());
      }
      this.jobWorkers.get(job.id).add(npc.id);

      // Set NPC state
      npc.currentTerrainJob = job.id;
      npc.isWorking = false; // Not yet working (need to arrive first)

      // Get worker position from job
      const workerIndex = job.assignedWorkers.indexOf(npc.id);
      const workerPos = job.getWorkerPosition(workerIndex);

      // Set NPC target position
      npc.targetPosition = {
        x: workerPos.x,
        z: workerPos.z,
        y: npc.position.y // Keep same Y level
      };

      npc.isMoving = true;

      // eslint-disable-next-line no-console
      console.log(`[TerrainWorker] Assigned NPC ${npc.name} (ID:${npc.id}) to job ${job.id} (${job.type})`);
    }
  }

  /**
   * Update NPCs currently working on jobs
   * @param {number} deltaTime - Time elapsed in seconds
   * @private
   */
  updateWorkersOnJobs(deltaTime) {
    const deltaTimeMs = deltaTime * 1000;

    for (const [npcId, jobId] of this.npcJobAssignments.entries()) {
      const npc = this.npcManager.npcs.get(npcId);
      const job = this.jobQueue.getJob(jobId);

      // Cleanup invalid assignments
      if (!npc || !job || job.state === JOB_STATE.COMPLETED || job.state === JOB_STATE.CANCELLED) {
        this.unassignWorkerFromJob(npcId, jobId);
        continue;
      }

      // Check if NPC has arrived at job
      if (npc.isMoving && this.hasNPCArrivedAtJob(npc, job)) {
        npc.isMoving = false;
        npc.isWorking = true;
        // eslint-disable-next-line no-console
        console.log(`[TerrainWorker] NPC ${npc.name} arrived at job ${job.id}`);
      }

      // Update job progress if NPC is working
      if (npc.isWorking && job.state === JOB_STATE.ACTIVE) {
        // Calculate speed multiplier based on NPC terrain_work skill
        const skillLevel = npc.skills.terrain_work || 1.0;
        const workerCount = job.assignedWorkers.length;

        // Speed multiplier: skill level * worker count
        // Multiple workers working together are more efficient
        const speedMultiplier = skillLevel * Math.sqrt(workerCount); // Square root for diminishing returns

        // Update job progress
        this.jobQueue.updateJobProgress(job.id, deltaTimeMs, speedMultiplier);

        // Train terrain_work skill (small gain)
        npc.trainSkill('terrain_work', 0.0001 * deltaTime); // 0.01% per second of work

        // Job completed?
        if (job.state === JOB_STATE.COMPLETED) {
          this.onJobCompleted(job);
        }
      }
    }
  }

  /**
   * Check if NPC has arrived at job location
   * @param {NPC} npc - NPC to check
   * @param {TerrainJob} job - Job to check
   * @returns {boolean} True if arrived
   * @private
   */
  hasNPCArrivedAtJob(npc, job) {
    const workerIndex = job.assignedWorkers.indexOf(npc.id);
    if (workerIndex === -1) return false;

    const workerPos = job.getWorkerPosition(workerIndex);
    const distance = Math.sqrt(
      Math.pow(npc.position.x - workerPos.x, 2) +
      Math.pow(npc.position.z - workerPos.z, 2)
    );

    return distance < JOB_ARRIVAL_DISTANCE;
  }

  /**
   * Handle job completion
   * @param {TerrainJob} job - Completed job
   * @private
   */
  onJobCompleted(job) {
    // eslint-disable-next-line no-console
    console.log(`[TerrainWorker] Job ${job.id} completed!`);

    // Free up all workers on this job
    const workers = this.jobWorkers.get(job.id);
    if (workers) {
      for (const npcId of workers) {
        this.unassignWorkerFromJob(npcId, job.id);
      }
    }
  }

  /**
   * Unassign a worker from a job
   * @param {number} npcId - NPC ID
   * @param {number} jobId - Job ID
   * @private
   */
  unassignWorkerFromJob(npcId, jobId) {
    const npc = this.npcManager.npcs.get(npcId);

    if (npc) {
      npc.currentTerrainJob = null;
      npc.isWorking = false;
      npc.isMoving = false;
      npc.targetPosition = null;
    }

    this.npcJobAssignments.delete(npcId);

    const workers = this.jobWorkers.get(jobId);
    if (workers) {
      workers.delete(npcId);
      if (workers.size === 0) {
        this.jobWorkers.delete(jobId);
      }
    }

    this.jobQueue.removeWorker(jobId, npcId);
  }

  /**
   * Cancel all jobs for an NPC (e.g., when NPC is reassigned)
   * @param {number} npcId - NPC ID
   */
  cancelNPCJobs(npcId) {
    const jobId = this.npcJobAssignments.get(npcId);
    if (jobId) {
      this.unassignWorkerFromJob(npcId, jobId);
    }
  }

  /**
   * Get job statistics
   * @returns {object} Worker statistics
   */
  getStatistics() {
    return {
      workersAssigned: this.npcJobAssignments.size,
      activeJobs: this.jobWorkers.size,
      assignments: Array.from(this.npcJobAssignments.entries()).map(([npcId, jobId]) => ({
        npcId,
        jobId,
        npcName: this.npcManager.npcs.get(npcId)?.name || 'Unknown'
      }))
    };
  }

  /**
   * Serialize worker behavior state for saving
   * @returns {object} Serialized state
   */
  serialize() {
    return {
      npcJobAssignments: Array.from(this.npcJobAssignments.entries()),
      jobWorkers: Array.from(this.jobWorkers.entries()).map(([jobId, workers]) => [
        jobId,
        Array.from(workers)
      ])
    };
  }

  /**
   * Deserialize worker behavior state from save data
   * @param {object} data - Serialized state
   */
  deserialize(data) {
    if (data.npcJobAssignments) {
      this.npcJobAssignments = new Map(data.npcJobAssignments);
    }

    if (data.jobWorkers) {
      this.jobWorkers = new Map(
        data.jobWorkers.map(([jobId, workers]) => [jobId, new Set(workers)])
      );
    }
  }
}
