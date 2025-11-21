/**
 * TerrainJob.js - Terrain modification job data structure
 *
 * Phase 4: Terrain Job System
 *
 * Represents a single terrain modification job that can be worked on by NPCs/player.
 * Jobs are queued, prioritized, and executed over time by workers.
 *
 * Features:
 * - Job types: flatten, raise, lower, smooth
 * - Priority system (1-10)
 * - Progress tracking (0-1)
 * - Worker assignment
 * - Time estimation
 *
 * Usage:
 *   const job = new TerrainJob({
 *     type: 'flatten',
 *     area: { x: 10, z: 10, width: 5, depth: 5 },
 *     priority: 8
 *   });
 */

/**
 * Job types enum
 */
export const JOB_TYPE = {
  FLATTEN: 'flatten',
  RAISE: 'raise',
  LOWER: 'lower',
  SMOOTH: 'smooth'
};

/**
 * Job priority levels
 */
export const JOB_PRIORITY = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  URGENT: 10
};

/**
 * Job states
 */
export const JOB_STATE = {
  PENDING: 'pending',      // Waiting for worker assignment
  ACTIVE: 'active',        // Being worked on
  COMPLETED: 'completed',  // Finished
  CANCELLED: 'cancelled'   // Cancelled by player
};

/**
 * TerrainJob class
 * Represents a single terrain modification job
 */
export class TerrainJob {
  /**
   * Create a terrain job
   * @param {object} options - Job configuration
   * @param {number} options.id - Unique job ID
   * @param {string} options.type - Job type (flatten, raise, lower, smooth)
   * @param {object} options.area - Job area {x, z, width, depth}
   * @param {number} options.priority - Job priority (1-10, default: 5)
   * @param {number} options.targetValue - Target value for raise/lower (optional)
   * @param {number} options.estimatedTime - Estimated completion time in ms (optional)
   */
  constructor(options) {
    // Validate required fields
    if (!options.id) throw new Error('Job ID is required');
    if (!options.type) throw new Error('Job type is required');
    if (!options.area) throw new Error('Job area is required');

    // Basic properties
    this.id = options.id;
    this.type = options.type;
    this.area = {
      x: options.area.x,
      z: options.area.z,
      width: options.area.width,
      depth: options.area.depth
    };

    // Job configuration
    this.priority = options.priority || JOB_PRIORITY.NORMAL;
    this.targetValue = options.targetValue || null;  // For raise/lower: amount

    // Job state
    this.state = JOB_STATE.PENDING;
    this.progress = 0;  // 0-1 (0-100%)

    // Worker tracking
    this.assignedWorkers = [];  // Array of worker IDs
    this.maxWorkers = this.calculateMaxWorkers();

    // Time tracking
    this.estimatedTime = options.estimatedTime || 0;  // Milliseconds
    this.actualTime = 0;  // Milliseconds elapsed
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
  }

  /**
   * Calculate maximum workers for this job based on area size
   * 1 worker per 9 tiles (3x3 area)
   * @returns {number} Maximum number of workers
   */
  calculateMaxWorkers() {
    const area = this.area.width * this.area.depth;
    return Math.max(1, Math.floor(area / 9));
  }

  /**
   * Get center position of job area
   * @returns {object} {x, z} center coordinates
   */
  getCenterPosition() {
    return {
      x: this.area.x + Math.floor(this.area.width / 2),
      z: this.area.z + Math.floor(this.area.depth / 2)
    };
  }

  /**
   * Check if a position is within job area
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @returns {boolean} True if position is in job area
   */
  containsPosition(x, z) {
    return (
      x >= this.area.x &&
      x < this.area.x + this.area.width &&
      z >= this.area.z &&
      z < this.area.z + this.area.depth
    );
  }

  /**
   * Get position for a worker around job perimeter
   * Distributes workers evenly around the job area
   * @param {number} workerIndex - Index of this worker (0-based)
   * @returns {object} {x, z} worker position
   */
  getWorkerPosition(workerIndex) {
    const { area } = this;
    const perimeter = 2 * (area.width + area.depth);
    const spacing = perimeter / this.maxWorkers;
    const position = workerIndex * spacing;

    // Calculate position along perimeter
    if (position < area.width) {
      // Top edge
      return {
        x: area.x + Math.floor(position),
        z: area.z
      };
    } else if (position < area.width + area.depth) {
      // Right edge
      return {
        x: area.x + area.width,
        z: area.z + Math.floor(position - area.width)
      };
    } else if (position < 2 * area.width + area.depth) {
      // Bottom edge
      return {
        x: area.x + area.width - Math.floor(position - area.width - area.depth),
        z: area.z + area.depth
      };
    } else {
      // Left edge
      return {
        x: area.x,
        z: area.z + area.depth - Math.floor(position - 2 * area.width - area.depth)
      };
    }
  }

  /**
   * Assign a worker to this job
   * @param {string} workerId - Worker ID to assign
   * @returns {boolean} True if worker was assigned successfully
   */
  assignWorker(workerId) {
    // Check if job is in a state that can accept workers
    if (this.state === JOB_STATE.COMPLETED || this.state === JOB_STATE.CANCELLED) {
      return false;
    }

    // Check if already at max workers
    if (this.assignedWorkers.length >= this.maxWorkers) {
      return false;
    }

    // Check if worker already assigned
    if (this.assignedWorkers.includes(workerId)) {
      return false;
    }

    // Assign worker
    this.assignedWorkers.push(workerId);

    // Start job if this is first worker
    if (this.assignedWorkers.length === 1 && this.state === JOB_STATE.PENDING) {
      this.state = JOB_STATE.ACTIVE;
      this.startedAt = Date.now();
    }

    return true;
  }

  /**
   * Remove a worker from this job
   * @param {string} workerId - Worker ID to remove
   * @returns {boolean} True if worker was removed successfully
   */
  removeWorker(workerId) {
    const index = this.assignedWorkers.indexOf(workerId);
    if (index === -1) return false;

    this.assignedWorkers.splice(index, 1);

    // If no workers left, pause job
    if (this.assignedWorkers.length === 0 && this.state === JOB_STATE.ACTIVE) {
      this.state = JOB_STATE.PENDING;
    }

    return true;
  }

  /**
   * Update job progress
   * @param {number} deltaTime - Time elapsed in milliseconds
   * @param {number} speedMultiplier - Speed multiplier from all workers (default: 1.0)
   */
  updateProgress(deltaTime, speedMultiplier = 1.0) {
    if (this.state !== JOB_STATE.ACTIVE) return;
    if (this.estimatedTime === 0) return;

    // Progress is based on time / estimated time * speed multiplier
    const progressDelta = (deltaTime / this.estimatedTime) * speedMultiplier;
    this.progress = Math.min(1.0, this.progress + progressDelta);
    this.actualTime += deltaTime;

    // Check if job is complete
    if (this.progress >= 1.0) {
      this.complete();
    }
  }

  /**
   * Mark job as complete
   */
  complete() {
    this.state = JOB_STATE.COMPLETED;
    this.progress = 1.0;
    this.completedAt = Date.now();
  }

  /**
   * Cancel this job
   */
  cancel() {
    this.state = JOB_STATE.CANCELLED;
    this.assignedWorkers = [];
  }

  /**
   * Check if job can accept more workers
   * @returns {boolean} True if more workers can be assigned
   */
  canAcceptWorkers() {
    return (
      (this.state === JOB_STATE.PENDING || this.state === JOB_STATE.ACTIVE) &&
      this.assignedWorkers.length < this.maxWorkers
    );
  }

  /**
   * Get formatted time remaining
   * @returns {string} Time remaining in human-readable format
   */
  getTimeRemaining() {
    if (this.state === JOB_STATE.COMPLETED) return '0s';
    if (this.estimatedTime === 0) return 'Unknown';

    const remaining = this.estimatedTime * (1 - this.progress);
    const seconds = Math.ceil(remaining / 1000);

    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
    return `${Math.ceil(seconds / 3600)}h`;
  }

  /**
   * Serialize job for saving
   * @returns {object} Serialized job data
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      area: this.area,
      priority: this.priority,
      targetValue: this.targetValue,
      state: this.state,
      progress: this.progress,
      assignedWorkers: this.assignedWorkers,
      estimatedTime: this.estimatedTime,
      actualTime: this.actualTime,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }

  /**
   * Deserialize job from save data
   * @param {object} data - Serialized job data
   * @returns {TerrainJob} Deserialized job
   */
  static deserialize(data) {
    const job = new TerrainJob({
      id: data.id,
      type: data.type,
      area: data.area,
      priority: data.priority,
      targetValue: data.targetValue,
      estimatedTime: data.estimatedTime
    });

    job.state = data.state;
    job.progress = data.progress;
    job.assignedWorkers = data.assignedWorkers || [];
    job.actualTime = data.actualTime || 0;
    job.createdAt = data.createdAt;
    job.startedAt = data.startedAt;
    job.completedAt = data.completedAt;

    return job;
  }
}
