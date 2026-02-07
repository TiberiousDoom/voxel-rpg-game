/**
 * WorkerPool - Manages a pool of Web Workers for parallel processing
 *
 * Distributes work across multiple workers and handles communication.
 */

/**
 * Generate unique request IDs
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * WorkerPool class
 */
export class WorkerPool {
  /**
   * Create a new worker pool
   * @param {string|URL} workerScript - Path to worker script
   * @param {number} poolSize - Number of workers (default: CPU cores, max 4)
   */
  constructor(workerScript, poolSize = null) {
    this.workerScript = workerScript;
    this.poolSize = poolSize ?? Math.min(navigator.hardwareConcurrency || 4, 4);

    this.workers = [];
    this.available = [];
    this.pending = new Map(); // requestId -> { resolve, reject, worker }
    this.queue = []; // Tasks waiting for available worker
    this.terminated = false;

    // Track consecutive errors to prevent infinite respawn loops
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 3;

    // Initialize workers
    this.initializeWorkers();
  }

  /**
   * Initialize the worker pool
   */
  initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      this.addWorker();
    }
  }

  /**
   * Add a worker to the pool
   */
  addWorker() {
    const worker = new Worker(this.workerScript);

    worker.onmessage = (event) => this.handleMessage(worker, event);
    worker.onerror = (error) => this.handleError(worker, error);

    this.workers.push(worker);
    this.available.push(worker);
  }

  /**
   * Handle message from worker
   */
  handleMessage(worker, event) {
    const { type, requestId, ...data } = event.data;

    // Worker ready message - reset error counter since a worker initialized successfully
    if (type === 'ready') {
      this.consecutiveErrors = 0;
      return;
    }

    // Successful message means workers are healthy
    this.consecutiveErrors = 0;

    // Find pending request
    const pending = this.pending.get(requestId);
    if (!pending) {
      console.warn(`Received response for unknown request: ${requestId}`);
      return;
    }

    // Clean up and release worker
    this.pending.delete(requestId);
    this.releaseWorker(worker);

    // Handle response
    if (type === 'error') {
      pending.reject(new Error(data.error));
    } else {
      pending.resolve(data);
    }
  }

  /**
   * Handle worker error
   */
  handleError(worker, error) {
    // Extract useful info from ErrorEvent
    const message = error.message || 'Unknown error';
    const filename = error.filename || '';
    const lineno = error.lineno || 0;
    console.error(`Worker error: ${message}` + (filename ? ` (${filename}:${lineno})` : ''));

    // Reject all pending tasks for this worker
    for (const [requestId, pending] of this.pending) {
      if (pending.worker === worker) {
        pending.reject(new Error(`Worker crashed: ${message}`));
        this.pending.delete(requestId);
      }
    }

    // Replace crashed worker (with respawn limit to prevent infinite loops)
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
      const availIndex = this.available.indexOf(worker);
      if (availIndex !== -1) {
        this.available.splice(availIndex, 1);
      }

      this.consecutiveErrors++;
      if (!this.terminated && this.consecutiveErrors < this.maxConsecutiveErrors) {
        this.addWorker();
      } else if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error(`Worker pool: ${this.consecutiveErrors} consecutive errors, stopping respawn. ${this.workers.length} workers remaining.`);
      }
    }
  }

  /**
   * Acquire an available worker
   * @returns {Worker|null}
   */
  acquireWorker() {
    if (this.available.length > 0) {
      return this.available.pop();
    }
    return null;
  }

  /**
   * Release a worker back to the pool
   */
  releaseWorker(worker) {
    if (!this.terminated && this.workers.includes(worker)) {
      this.available.push(worker);

      // Process queued tasks
      this.processQueue();
    }
  }

  /**
   * Process queued tasks
   */
  processQueue() {
    while (this.queue.length > 0 && this.available.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      this.executeImmediate(task, resolve, reject);
    }
  }

  /**
   * Execute a task on an available worker
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} Result from worker
   */
  execute(task) {
    return new Promise((resolve, reject) => {
      if (this.terminated) {
        reject(new Error('Worker pool has been terminated'));
        return;
      }

      const worker = this.acquireWorker();

      if (worker) {
        this.executeImmediate(task, resolve, reject, worker);
      } else {
        // Queue the task
        this.queue.push({ task, resolve, reject });
      }
    });
  }

  /**
   * Execute task immediately on a worker
   */
  executeImmediate(task, resolve, reject, worker = null) {
    if (!worker) {
      worker = this.acquireWorker();
      if (!worker) {
        this.queue.push({ task, resolve, reject });
        return;
      }
    }

    const requestId = generateRequestId();

    this.pending.set(requestId, { resolve, reject, worker });

    try {
      // Create message manually to avoid Babel spread operator transpilation
      const message = Object.assign({}, task, { requestId: requestId });
      worker.postMessage(message);
    } catch (error) {
      this.pending.delete(requestId);
      this.releaseWorker(worker);
      reject(error);
    }
  }

  /**
   * Execute multiple tasks in parallel
   * @param {Array<Object>} tasks - Tasks to execute
   * @returns {Promise<Array<Object>>} Results from all tasks
   */
  executeAll(tasks) {
    return Promise.all(tasks.map(task => this.execute(task)));
  }

  /**
   * Cancel a pending request
   * @param {string} requestId
   */
  cancel(requestId) {
    const pending = this.pending.get(requestId);
    if (pending) {
      pending.worker.postMessage({ type: 'cancel', requestId });
      pending.reject(new Error('Task cancelled'));
      this.pending.delete(requestId);
      this.releaseWorker(pending.worker);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.poolSize,
      available: this.available.length,
      busy: this.workers.length - this.available.length,
      pending: this.pending.size,
      queued: this.queue.length,
    };
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.terminated = true;

    // Reject all pending and queued tasks
    for (const pending of this.pending.values()) {
      pending.reject(new Error('Worker pool terminated'));
    }
    this.pending.clear();

    for (const queued of this.queue) {
      queued.reject(new Error('Worker pool terminated'));
    }
    this.queue = [];

    // Terminate workers
    for (const worker of this.workers) {
      worker.terminate();
    }

    this.workers = [];
    this.available = [];
  }
}

export default WorkerPool;
