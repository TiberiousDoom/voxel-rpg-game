/**
 * JobManager.js - Central job coordination system
 *
 * The JobManager coordinates all construction-related jobs across the game,
 * managing job creation, prioritization, assignment, and completion tracking.
 *
 * Part of Phase 7: Job Management System
 *
 * Features:
 * - Unified job queue for all work types
 * - Priority-based job scheduling
 * - NPC assignment and load balancing
 * - Job dependencies (e.g., haul before build)
 * - Progress tracking and statistics
 */

/**
 * Job types
 */
export const JobType = {
  HAUL: 'haul',
  BUILD: 'build',
  MINE: 'mine',
  HARVEST: 'harvest',
  CRAFT: 'craft'
};

/**
 * Job status
 */
export const JobStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Job priority levels
 */
export const JobPriority = {
  LOWEST: 1,
  LOW: 2,
  NORMAL: 3,
  HIGH: 4,
  URGENT: 5,
  CRITICAL: 6
};

/**
 * Job - Represents a single unit of work
 */
export class Job {
  static nextId = 1;

  /**
   * Create a job
   * @param {object} config - Job configuration
   */
  constructor(config = {}) {
    this.id = config.id || `job_${Job.nextId++}`;
    this.type = config.type || JobType.BUILD;
    this.priority = config.priority || JobPriority.NORMAL;

    // Location info
    this.position = config.position ? { ...config.position } : null;
    this.targetId = config.targetId || null;  // Site ID, stockpile ID, etc.

    // Work details
    this.workRequired = config.workRequired || 1.0;  // Total work units needed
    this.workCompleted = 0;
    this.resourceType = config.resourceType || null;
    this.quantity = config.quantity || 1;

    // Assignment
    this.status = JobStatus.PENDING;
    this.assignedNpcId = null;
    this.reservedResources = [];

    // Dependencies
    this.dependsOn = new Set(config.dependsOn || []);  // Job IDs this depends on
    this.dependents = new Set();  // Job IDs that depend on this

    // Timing
    this.createdAt = Date.now();
    this.assignedAt = null;
    this.startedAt = null;
    this.completedAt = null;

    // Metadata
    this.metadata = config.metadata || {};

    // Callbacks
    this.onComplete = config.onComplete || null;
    this.onFail = config.onFail || null;
  }

  /**
   * Check if job can be started (dependencies met)
   * @param {Map<string, Job>} allJobs - All jobs in system
   * @returns {boolean}
   */
  canStart(allJobs) {
    for (const depId of this.dependsOn) {
      const dep = allJobs.get(depId);
      if (dep && dep.status !== JobStatus.COMPLETED) {
        return false;
      }
    }
    return true;
  }

  /**
   * Assign job to an NPC
   * @param {string} npcId
   * @returns {boolean}
   */
  assign(npcId) {
    if (this.status !== JobStatus.PENDING) {
      return false;
    }

    this.assignedNpcId = npcId;
    this.status = JobStatus.ASSIGNED;
    this.assignedAt = Date.now();
    return true;
  }

  /**
   * Start the job
   * @returns {boolean}
   */
  start() {
    if (this.status !== JobStatus.ASSIGNED) {
      return false;
    }

    this.status = JobStatus.IN_PROGRESS;
    this.startedAt = Date.now();
    return true;
  }

  /**
   * Add work progress
   * @param {number} amount - Work units completed
   * @returns {boolean} True if job is now complete
   */
  addProgress(amount) {
    if (this.status !== JobStatus.IN_PROGRESS) {
      return false;
    }

    this.workCompleted += amount;

    if (this.workCompleted >= this.workRequired) {
      this.complete();
      return true;
    }

    return false;
  }

  /**
   * Get progress percentage
   * @returns {number} 0-100
   */
  getProgress() {
    if (this.workRequired === 0) return 100;
    return Math.min(100, (this.workCompleted / this.workRequired) * 100);
  }

  /**
   * Complete the job
   */
  complete() {
    this.status = JobStatus.COMPLETED;
    this.completedAt = Date.now();

    if (this.onComplete) {
      this.onComplete(this);
    }
  }

  /**
   * Fail the job
   * @param {string} reason
   */
  fail(reason) {
    this.status = JobStatus.FAILED;
    this.failReason = reason;
    this.completedAt = Date.now();

    if (this.onFail) {
      this.onFail(this, reason);
    }
  }

  /**
   * Cancel the job
   * @param {string} reason
   */
  cancel(reason = 'Cancelled') {
    this.status = JobStatus.CANCELLED;
    this.cancelReason = reason;
    this.completedAt = Date.now();
  }

  /**
   * Unassign job from NPC
   */
  unassign() {
    this.assignedNpcId = null;
    this.status = JobStatus.PENDING;
    this.assignedAt = null;
    this.startedAt = null;
    this.workCompleted = 0;
  }

  /**
   * Check if job is in a terminal state
   * @returns {boolean}
   */
  isTerminal() {
    return this.status === JobStatus.COMPLETED ||
           this.status === JobStatus.FAILED ||
           this.status === JobStatus.CANCELLED;
  }

  /**
   * Export job data
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      priority: this.priority,
      position: this.position,
      targetId: this.targetId,
      workRequired: this.workRequired,
      workCompleted: this.workCompleted,
      resourceType: this.resourceType,
      quantity: this.quantity,
      status: this.status,
      assignedNpcId: this.assignedNpcId,
      dependsOn: Array.from(this.dependsOn),
      createdAt: this.createdAt,
      assignedAt: this.assignedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      metadata: this.metadata
    };
  }

  /**
   * Import job data
   * @param {object} data
   * @returns {Job}
   */
  static fromJSON(data) {
    const job = new Job({
      id: data.id,
      type: data.type,
      priority: data.priority,
      position: data.position,
      targetId: data.targetId,
      workRequired: data.workRequired,
      resourceType: data.resourceType,
      quantity: data.quantity,
      dependsOn: data.dependsOn,
      metadata: data.metadata
    });

    job.status = data.status;
    job.assignedNpcId = data.assignedNpcId;
    job.workCompleted = data.workCompleted || 0;
    job.createdAt = data.createdAt;
    job.assignedAt = data.assignedAt;
    job.startedAt = data.startedAt;
    job.completedAt = data.completedAt;

    return job;
  }
}

/**
 * JobManager - Central coordinator for all jobs
 */
export class JobManager {
  /**
   * Create a job manager
   * @param {object} config - Configuration options
   */
  constructor(config = {}) {
    // Job storage
    this.jobs = new Map();              // jobId -> Job
    this.npcJobs = new Map();           // npcId -> Set<jobId>
    this.siteJobs = new Map();          // siteId -> Set<jobId>
    this.pendingJobs = [];              // Jobs waiting for assignment

    // Configuration
    this.maxJobsPerNpc = config.maxJobsPerNpc || 1;
    this.jobScanInterval = config.jobScanInterval || 1.0;  // seconds
    this.maxPendingJobs = config.maxPendingJobs || 1000;

    // External managers
    this.constructionManager = config.constructionManager || null;
    this.stockpileManager = config.stockpileManager || null;
    this.haulingManager = config.haulingManager || null;

    // State
    this.enabled = true;
    this.timeSinceLastScan = 0;

    // Statistics
    this.stats = {
      totalJobsCreated: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      totalJobsCancelled: 0,
      jobsByType: {}
    };
  }

  /**
   * Set external manager references
   * @param {object} managers
   */
  setManagers(managers) {
    if (managers.constructionManager) {
      this.constructionManager = managers.constructionManager;
    }
    if (managers.stockpileManager) {
      this.stockpileManager = managers.stockpileManager;
    }
    if (managers.haulingManager) {
      this.haulingManager = managers.haulingManager;
    }
  }

  /**
   * Update the job system
   * @param {number} deltaTime - Time elapsed in seconds
   * @param {object} gameState - Current game state
   */
  update(deltaTime, gameState) {
    if (!this.enabled) return;

    // Periodic scan for new jobs
    this.timeSinceLastScan += deltaTime;
    if (this.timeSinceLastScan >= this.jobScanInterval) {
      this._scanForNewJobs();
      this.timeSinceLastScan = 0;
    }

    // Update job progress
    this._updateJobs(deltaTime, gameState);

    // Clean up old completed jobs
    this._cleanupJobs();
  }

  /**
   * Scan for new jobs from construction sites
   * @private
   */
  _scanForNewJobs() {
    if (!this.constructionManager) return;

    const sites = this.constructionManager.getActiveSites();

    for (const site of sites) {
      // Skip if we already have max jobs for this site
      const siteJobCount = this.siteJobs.get(site.id)?.size || 0;
      if (siteJobCount >= 20) continue;  // Max 20 jobs per site

      // Get material needs (creates haul jobs)
      const materialNeeds = site.getMaterialNeeds();
      for (const need of materialNeeds) {
        if (siteJobCount >= 20) break;

        const existingJob = this._findExistingJob(
          JobType.HAUL,
          site.id,
          need.blockKey
        );

        if (!existingJob) {
          this.createJob({
            type: JobType.HAUL,
            priority: this._sitePriorityToJobPriority(site.priority),
            position: need.position,
            targetId: site.id,
            resourceType: need.resourceType,
            quantity: need.quantity,
            workRequired: 5.0,  // Travel + pickup + travel + dropoff
            metadata: {
              siteId: site.id,
              blockKey: need.blockKey
            }
          });
        }
      }

      // Get blocks ready to build (creates build jobs)
      const readyBlocks = site.getBlocksReadyToBuild();
      for (const block of readyBlocks) {
        const existingJob = this._findExistingJob(
          JobType.BUILD,
          site.id,
          block.key
        );

        if (!existingJob) {
          this.createJob({
            type: JobType.BUILD,
            priority: this._sitePriorityToJobPriority(site.priority),
            position: block.position,
            targetId: site.id,
            workRequired: 2.0,  // 2 seconds per block
            metadata: {
              siteId: site.id,
              blockKey: block.key,
              blockType: block.blockType
            }
          });
        }
      }
    }
  }

  /**
   * Find an existing job matching criteria
   * @private
   */
  _findExistingJob(type, targetId, blockKey) {
    for (const job of this.jobs.values()) {
      if (job.isTerminal()) continue;

      if (job.type === type &&
          job.targetId === targetId &&
          job.metadata?.blockKey === blockKey) {
        return job;
      }
    }
    return null;
  }

  /**
   * Convert site priority to job priority
   * @private
   */
  _sitePriorityToJobPriority(sitePriority) {
    if (sitePriority >= 80) return JobPriority.CRITICAL;
    if (sitePriority >= 60) return JobPriority.URGENT;
    if (sitePriority >= 40) return JobPriority.HIGH;
    if (sitePriority >= 20) return JobPriority.NORMAL;
    return JobPriority.LOW;
  }

  /**
   * Create a new job
   * @param {object} config - Job configuration
   * @returns {Job}
   */
  createJob(config) {
    if (this.pendingJobs.length >= this.maxPendingJobs) {
      return null;
    }

    const job = new Job({
      ...config,
      onComplete: (j) => this._handleJobComplete(j),
      onFail: (j, reason) => this._handleJobFail(j, reason)
    });

    this.jobs.set(job.id, job);
    this.pendingJobs.push(job);

    // Track by site
    if (job.targetId) {
      if (!this.siteJobs.has(job.targetId)) {
        this.siteJobs.set(job.targetId, new Set());
      }
      this.siteJobs.get(job.targetId).add(job.id);
    }

    // Update stats
    this.stats.totalJobsCreated++;
    this.stats.jobsByType[job.type] = (this.stats.jobsByType[job.type] || 0) + 1;

    return job;
  }

  /**
   * Request a job for an NPC
   * @param {string} npcId - NPC identifier
   * @param {object} npcPosition - NPC's current position
   * @param {string[]} allowedTypes - Job types NPC can do
   * @returns {Job | null}
   */
  requestJob(npcId, npcPosition, allowedTypes = null) {
    // Check if NPC already has max jobs
    const npcJobSet = this.npcJobs.get(npcId);
    if (npcJobSet && npcJobSet.size >= this.maxJobsPerNpc) {
      // Return existing job
      for (const jobId of npcJobSet) {
        const job = this.jobs.get(jobId);
        if (job && !job.isTerminal()) {
          return job;
        }
      }
    }

    // Find best pending job
    const job = this._findBestJob(npcId, npcPosition, allowedTypes);
    if (!job) return null;

    // Assign to NPC
    if (this._assignJob(job, npcId)) {
      return job;
    }

    return null;
  }

  /**
   * Find the best pending job for an NPC
   * @private
   */
  _findBestJob(npcId, npcPosition, allowedTypes) {
    // Filter available jobs
    const available = this.pendingJobs.filter(job => {
      // Must be pending
      if (job.status !== JobStatus.PENDING) return false;

      // Must match type filter
      if (allowedTypes && !allowedTypes.includes(job.type)) return false;

      // Dependencies must be met
      if (!job.canStart(this.jobs)) return false;

      return true;
    });

    if (available.length === 0) return null;

    // Score jobs by priority and distance
    const scored = available.map(job => {
      const distance = npcPosition && job.position ?
        this._calculateDistance(npcPosition, job.position) : 0;

      return {
        job,
        score: (job.priority * 1000) - distance
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.job || null;
  }

  /**
   * Assign a job to an NPC
   * @private
   */
  _assignJob(job, npcId) {
    if (!job.assign(npcId)) {
      return false;
    }

    // Remove from pending
    const index = this.pendingJobs.indexOf(job);
    if (index >= 0) {
      this.pendingJobs.splice(index, 1);
    }

    // Track NPC assignment
    if (!this.npcJobs.has(npcId)) {
      this.npcJobs.set(npcId, new Set());
    }
    this.npcJobs.get(npcId).add(job.id);

    return true;
  }

  /**
   * Calculate distance between positions
   * @private
   */
  _calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Update active jobs
   * @private
   */
  _updateJobs(deltaTime, gameState) {
    // Jobs are primarily updated by the BuilderManager/HaulingManager
    // This handles timeout and cleanup
    const now = Date.now();

    for (const job of this.jobs.values()) {
      if (job.isTerminal()) continue;

      // Check for stale assignments (NPC might have been removed)
      if (job.assignedNpcId && job.status === JobStatus.ASSIGNED) {
        const npc = gameState?.npcs?.get?.(job.assignedNpcId);
        if (!npc) {
          // NPC no longer exists, unassign job
          this._unassignJob(job);
        } else if (job.assignedAt && (now - job.assignedAt) > 300000) {
          // Job assigned for > 5 minutes without starting, unassign
          this._unassignJob(job);
        }
      }
    }
  }

  /**
   * Unassign a job and return it to pending
   * @private
   */
  _unassignJob(job) {
    const npcId = job.assignedNpcId;

    job.unassign();

    // Remove from NPC tracking
    if (npcId) {
      const npcJobSet = this.npcJobs.get(npcId);
      if (npcJobSet) {
        npcJobSet.delete(job.id);
      }
    }

    // Return to pending
    this.pendingJobs.push(job);
  }

  /**
   * Clean up old completed jobs
   * @private
   */
  _cleanupJobs() {
    const now = Date.now();
    const toRemove = [];

    for (const [id, job] of this.jobs) {
      if (job.isTerminal() && job.completedAt) {
        // Remove jobs completed more than 60 seconds ago
        if ((now - job.completedAt) > 60000) {
          toRemove.push(id);
        }
      }
    }

    for (const id of toRemove) {
      const job = this.jobs.get(id);
      if (job) {
        // Clean up tracking
        if (job.targetId) {
          this.siteJobs.get(job.targetId)?.delete(id);
        }
        if (job.assignedNpcId) {
          this.npcJobs.get(job.assignedNpcId)?.delete(id);
        }
      }
      this.jobs.delete(id);
    }
  }

  /**
   * Handle job completion
   * @private
   */
  _handleJobComplete(job) {
    this.stats.totalJobsCompleted++;

    // Remove from NPC tracking
    if (job.assignedNpcId) {
      this.npcJobs.get(job.assignedNpcId)?.delete(job.id);
    }

    // Check dependents
    for (const depId of job.dependents) {
      const dep = this.jobs.get(depId);
      if (dep) {
        dep.dependsOn.delete(job.id);
      }
    }
  }

  /**
   * Handle job failure
   * @private
   */
  _handleJobFail(job, reason) {
    this.stats.totalJobsFailed++;

    // Remove from NPC tracking
    if (job.assignedNpcId) {
      this.npcJobs.get(job.assignedNpcId)?.delete(job.id);
    }
  }

  /**
   * Cancel a job
   * @param {string} jobId
   * @param {string} reason
   * @returns {boolean}
   */
  cancelJob(jobId, reason = 'Cancelled') {
    const job = this.jobs.get(jobId);
    if (!job || job.isTerminal()) {
      return false;
    }

    job.cancel(reason);
    this.stats.totalJobsCancelled++;

    // Remove from pending
    const pendingIndex = this.pendingJobs.indexOf(job);
    if (pendingIndex >= 0) {
      this.pendingJobs.splice(pendingIndex, 1);
    }

    // Remove from NPC tracking
    if (job.assignedNpcId) {
      this.npcJobs.get(job.assignedNpcId)?.delete(job.id);
    }

    return true;
  }

  /**
   * Cancel all jobs for a site
   * @param {string} siteId
   * @returns {number} Number of jobs cancelled
   */
  cancelSiteJobs(siteId) {
    const jobIds = this.siteJobs.get(siteId);
    if (!jobIds) return 0;

    let cancelled = 0;
    for (const jobId of jobIds) {
      if (this.cancelJob(jobId, 'Site cancelled')) {
        cancelled++;
      }
    }

    return cancelled;
  }

  /**
   * Cancel all jobs for an NPC
   * @param {string} npcId
   * @returns {number} Number of jobs cancelled
   */
  cancelNpcJobs(npcId) {
    const jobIds = this.npcJobs.get(npcId);
    if (!jobIds) return 0;

    let cancelled = 0;
    for (const jobId of Array.from(jobIds)) {
      const job = this.jobs.get(jobId);
      if (job && !job.isTerminal()) {
        this._unassignJob(job);
        cancelled++;
      }
    }

    this.npcJobs.delete(npcId);
    return cancelled;
  }

  /**
   * Get job by ID
   * @param {string} jobId
   * @returns {Job | null}
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all pending jobs
   * @returns {Job[]}
   */
  getPendingJobs() {
    return [...this.pendingJobs];
  }

  /**
   * Get jobs by type
   * @param {string} type - Job type
   * @returns {Job[]}
   */
  getJobsByType(type) {
    return Array.from(this.jobs.values())
      .filter(j => j.type === type && !j.isTerminal());
  }

  /**
   * Get jobs for a site
   * @param {string} siteId
   * @returns {Job[]}
   */
  getJobsForSite(siteId) {
    const jobIds = this.siteJobs.get(siteId);
    if (!jobIds) return [];

    return Array.from(jobIds)
      .map(id => this.jobs.get(id))
      .filter(j => j && !j.isTerminal());
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      pendingJobs: this.pendingJobs.length,
      activeJobs: Array.from(this.jobs.values())
        .filter(j => j.status === JobStatus.IN_PROGRESS).length,
      totalJobs: this.jobs.size,
      assignedNpcs: this.npcJobs.size
    };
  }

  /**
   * Enable/disable the job system
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Export manager state
   * @returns {object}
   */
  toJSON() {
    return {
      jobs: Array.from(this.jobs.values())
        .filter(j => !j.isTerminal())
        .map(j => j.toJSON()),
      npcJobs: Object.fromEntries(
        Array.from(this.npcJobs.entries())
          .map(([k, v]) => [k, Array.from(v)])
      ),
      siteJobs: Object.fromEntries(
        Array.from(this.siteJobs.entries())
          .map(([k, v]) => [k, Array.from(v)])
      ),
      stats: this.stats,
      enabled: this.enabled
    };
  }

  /**
   * Import manager state
   * @param {object} data
   */
  fromJSON(data) {
    this.jobs.clear();
    this.pendingJobs = [];
    this.npcJobs.clear();
    this.siteJobs.clear();

    // Restore jobs
    if (data.jobs) {
      for (const jobData of data.jobs) {
        const job = Job.fromJSON(jobData);
        job.onComplete = (j) => this._handleJobComplete(j);
        job.onFail = (j, reason) => this._handleJobFail(j, reason);
        this.jobs.set(job.id, job);

        if (job.status === JobStatus.PENDING) {
          this.pendingJobs.push(job);
        }
      }
    }

    // Restore NPC assignments
    if (data.npcJobs) {
      for (const [npcId, jobIds] of Object.entries(data.npcJobs)) {
        this.npcJobs.set(npcId, new Set(jobIds));
      }
    }

    // Restore site tracking
    if (data.siteJobs) {
      for (const [siteId, jobIds] of Object.entries(data.siteJobs)) {
        this.siteJobs.set(siteId, new Set(jobIds));
      }
    }

    // Restore stats
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }

    this.enabled = data.enabled !== false;
  }
}
