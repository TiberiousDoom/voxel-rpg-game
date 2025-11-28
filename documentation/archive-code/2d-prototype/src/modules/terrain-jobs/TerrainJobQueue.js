/**
 * TerrainJobQueue.js - Terrain job queue management
 *
 * Phase 4: Terrain Job System
 *
 * Manages the queue of terrain modification jobs.
 * Handles job creation, prioritization, worker assignment, and completion.
 *
 * Features:
 * - Priority-based job sorting
 * - Automatic worker assignment
 * - Job progress tracking
 * - Job history
 *
 * Usage:
 *   const queue = new TerrainJobQueue(terrainSystem);
 *   queue.addJob(job);
 *   const nextJob = queue.getNextJob(workerPosition, workerSkills);
 *   queue.assignWorker(jobId, workerId);
 *   queue.updateJobProgress(jobId, deltaTime, speedMultiplier);
 */

import { TerrainJob, JOB_STATE, JOB_PRIORITY } from './TerrainJob';
import { JobTimeCalculator } from './JobTimeCalculator';

/**
 * TerrainJobQueue class
 * Manages terrain modification jobs
 */
export class TerrainJobQueue {
  /**
   * Create a terrain job queue
   * @param {TerrainSystem} terrainSystem - Terrain system for job execution
   */
  constructor(terrainSystem) {
    this.terrainSystem = terrainSystem;
    this.timeCalculator = new JobTimeCalculator(terrainSystem);

    // Job storage
    this.jobs = new Map();           // All jobs (id -> job)
    this.pendingJobs = [];           // Jobs waiting for workers (sorted by priority)
    this.activeJobs = [];            // Jobs currently being worked on
    this.completedJobs = [];         // Completed job history (last 100)
    this.cancelledJobs = [];         // Cancelled job history (last 50)

    // ID generation
    this.nextJobId = 1;

    // Statistics
    this.stats = {
      totalJobsCreated: 0,
      totalJobsCompleted: 0,
      totalJobsCancelled: 0,
      totalWorkTime: 0
    };
  }

  /**
   * Add a job to the queue
   * @param {TerrainJob} job - Job to add (or job options object)
   * @returns {TerrainJob} The added job
   */
  addJob(job) {
    // If job is just options, create TerrainJob
    if (!(job instanceof TerrainJob)) {
      // Calculate estimated time
      const estimatedTime = this.timeCalculator.calculateJobTime({
        area: job.area,
        type: job.type
      });

      job = new TerrainJob({
        id: this.nextJobId++,
        ...job,
        estimatedTime
      });
    }

    // Store job
    this.jobs.set(job.id, job);
    this.pendingJobs.push(job);
    this.sortPendingJobs();

    // Update stats
    this.stats.totalJobsCreated++;

    return job;
  }

  /**
   * Get a job by ID
   * @param {number} jobId - Job ID
   * @returns {TerrainJob|null} Job or null if not found
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get next available job for a worker
   * Considers priority, distance, and worker skills
   * @param {object} workerPosition - Worker position {x, z}
   * @param {object} workerSkills - Worker skills {terrain_work: level}
   * @returns {TerrainJob|null} Next job or null if none available
   */
  getNextJob(workerPosition, workerSkills = {}) {
    if (this.pendingJobs.length === 0) return null;

    // Score each job based on priority and distance
    const scoredJobs = this.pendingJobs
      .filter(job => job.canAcceptWorkers())
      .map(job => {
        const jobCenter = job.getCenterPosition();
        const distance = Math.sqrt(
          Math.pow(jobCenter.x - workerPosition.x, 2) +
          Math.pow(jobCenter.z - workerPosition.z, 2)
        );

        // Score: priority is primary, distance is secondary
        // Higher priority = higher score
        // Closer distance = higher score
        const priorityScore = job.priority * 100;
        const distanceScore = Math.max(0, 100 - distance);

        return {
          job,
          score: priorityScore + distanceScore,
          distance
        };
      });

    if (scoredJobs.length === 0) return null;

    // Sort by score (descending) and return best job
    scoredJobs.sort((a, b) => b.score - a.score);
    return scoredJobs[0].job;
  }

  /**
   * Assign a worker to a job
   * @param {number} jobId - Job ID
   * @param {string} workerId - Worker ID
   * @returns {boolean} True if assignment successful
   */
  assignWorker(jobId, workerId) {
    const job = this.getJob(jobId);
    if (!job) return false;

    const success = job.assignWorker(workerId);

    if (success) {
      // Move job from pending to active if this is first worker
      if (job.state === JOB_STATE.ACTIVE && !this.activeJobs.includes(job)) {
        const index = this.pendingJobs.indexOf(job);
        if (index !== -1) {
          this.pendingJobs.splice(index, 1);
        }
        this.activeJobs.push(job);
      }
    }

    return success;
  }

  /**
   * Remove a worker from a job
   * @param {number} jobId - Job ID
   * @param {string} workerId - Worker ID
   * @returns {boolean} True if removal successful
   */
  removeWorker(jobId, workerId) {
    const job = this.getJob(jobId);
    if (!job) return false;

    const success = job.removeWorker(workerId);

    if (success && job.state === JOB_STATE.PENDING) {
      // Move job back to pending if all workers removed
      const index = this.activeJobs.indexOf(job);
      if (index !== -1) {
        this.activeJobs.splice(index, 1);
        this.pendingJobs.push(job);
        this.sortPendingJobs();
      }
    }

    return success;
  }

  /**
   * Update job progress
   * @param {number} jobId - Job ID
   * @param {number} deltaTime - Time elapsed in milliseconds
   * @param {number} speedMultiplier - Speed multiplier from worker skills
   */
  updateJobProgress(jobId, deltaTime, speedMultiplier = 1.0) {
    const job = this.getJob(jobId);
    if (!job || job.state !== JOB_STATE.ACTIVE) return;

    job.updateProgress(deltaTime, speedMultiplier);

    // Check if job completed
    if (job.state === JOB_STATE.COMPLETED) {
      this.completeJob(jobId);
    }
  }

  /**
   * Complete a job and execute terrain modification
   * @param {number} jobId - Job ID
   * @returns {boolean} True if completion successful
   */
  completeJob(jobId) {
    const job = this.getJob(jobId);
    if (!job) return false;

    // Execute terrain modification
    const success = this.executeTerrainModification(job);

    if (success) {
      // Move to completed list
      const index = this.activeJobs.indexOf(job);
      if (index !== -1) {
        this.activeJobs.splice(index, 1);
      }

      this.completedJobs.push(job);

      // Keep only last 100 completed jobs
      if (this.completedJobs.length > 100) {
        this.completedJobs.shift();
      }

      // Update stats
      this.stats.totalJobsCompleted++;
      this.stats.totalWorkTime += job.actualTime;

      return true;
    }

    return false;
  }

  /**
   * Cancel a job
   * @param {number} jobId - Job ID
   * @returns {boolean} True if cancellation successful
   */
  cancelJob(jobId) {
    const job = this.getJob(jobId);
    if (!job) return false;

    job.cancel();

    // Remove from pending or active list
    const pendingIndex = this.pendingJobs.indexOf(job);
    if (pendingIndex !== -1) {
      this.pendingJobs.splice(pendingIndex, 1);
    }

    const activeIndex = this.activeJobs.indexOf(job);
    if (activeIndex !== -1) {
      this.activeJobs.splice(activeIndex, 1);
    }

    // Add to cancelled list
    this.cancelledJobs.push(job);

    // Keep only last 50 cancelled jobs
    if (this.cancelledJobs.length > 50) {
      this.cancelledJobs.shift();
    }

    // Update stats
    this.stats.totalJobsCancelled++;

    return true;
  }

  /**
   * Execute terrain modification for a job
   * @param {TerrainJob} job - Job to execute
   * @returns {boolean} True if execution successful
   * @private
   */
  executeTerrainModification(job) {
    const { area, type, targetValue } = job;

    try {
      switch (type) {
        case 'flatten':
          this.terrainSystem.flattenRegion(
            area.x, area.z, area.width, area.depth, targetValue
          );
          break;

        case 'raise':
          this.terrainSystem.raiseRegion(
            area.x, area.z, area.width, area.depth, targetValue || 1
          );
          break;

        case 'lower':
          this.terrainSystem.lowerRegion(
            area.x, area.z, area.width, area.depth, targetValue || 1
          );
          break;

        case 'smooth':
          this.terrainSystem.smoothRegion(
            area.x, area.z, area.width, area.depth, targetValue || 1
          );
          break;

        default:
          console.warn(`Unknown job type: ${type}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error(`Error executing terrain job ${job.id}:`, error);
      return false;
    }
  }

  /**
   * Sort pending jobs by priority (descending) and creation time (ascending)
   * @private
   */
  sortPendingJobs() {
    this.pendingJobs.sort((a, b) => {
      // Primary sort: priority (descending)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Secondary sort: creation time (ascending - older first)
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Change job priority
   * @param {number} jobId - Job ID
   * @param {number} newPriority - New priority (1-10)
   * @returns {boolean} True if priority changed successfully
   */
  changePriority(jobId, newPriority) {
    const job = this.getJob(jobId);
    if (!job) return false;

    job.priority = Math.max(JOB_PRIORITY.LOW, Math.min(JOB_PRIORITY.URGENT, newPriority));

    // Re-sort pending jobs if job is pending
    if (job.state === JOB_STATE.PENDING) {
      this.sortPendingJobs();
    }

    return true;
  }

  /**
   * Get all jobs with optional filtering
   * @param {object} filters - Filter criteria {state, type, priority}
   * @returns {Array<TerrainJob>} Filtered jobs
   */
  getAllJobs(filters = {}) {
    let jobs = Array.from(this.jobs.values());

    if (filters.state) {
      jobs = jobs.filter(job => job.state === filters.state);
    }

    if (filters.type) {
      jobs = jobs.filter(job => job.type === filters.type);
    }

    if (filters.priority) {
      jobs = jobs.filter(job => job.priority === filters.priority);
    }

    return jobs;
  }

  /**
   * Get queue statistics
   * @returns {object} Queue statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      pendingJobsCount: this.pendingJobs.length,
      activeJobsCount: this.activeJobs.length,
      completedJobsCount: this.completedJobs.length,
      cancelledJobsCount: this.cancelledJobs.length,
      totalJobs: this.jobs.size
    };
  }

  /**
   * Clear completed and cancelled job history
   */
  clearHistory() {
    this.completedJobs = [];
    this.cancelledJobs = [];
  }

  /**
   * Serialize queue for saving
   * @returns {object} Serialized queue data
   */
  serialize() {
    return {
      nextJobId: this.nextJobId,
      pendingJobs: this.pendingJobs.map(job => job.serialize()),
      activeJobs: this.activeJobs.map(job => job.serialize()),
      stats: this.stats
    };
  }

  /**
   * Deserialize queue from save data
   * @param {object} data - Serialized queue data
   */
  deserialize(data) {
    this.nextJobId = data.nextJobId || 1;
    this.stats = data.stats || this.stats;

    // Restore pending jobs
    this.pendingJobs = (data.pendingJobs || []).map(jobData => {
      const job = TerrainJob.deserialize(jobData);
      this.jobs.set(job.id, job);
      return job;
    });

    // Restore active jobs
    this.activeJobs = (data.activeJobs || []).map(jobData => {
      const job = TerrainJob.deserialize(jobData);
      this.jobs.set(job.id, job);
      return job;
    });

    this.sortPendingJobs();
  }
}
