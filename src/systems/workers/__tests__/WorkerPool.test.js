import { WorkerPool } from '../WorkerPool';

// Mock Worker class
class MockWorker {
  constructor(script) {
    this.script = script;
    this.onmessage = null;
    this.onerror = null;
    this.terminated = false;
    this.messages = [];

    // Simulate 'ready' message on next tick
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: { type: 'ready' } });
      }
    }, 0);
  }

  postMessage(data) {
    this.messages.push(data);
    // Simulate successful response on next tick
    setTimeout(() => {
      if (this.onmessage && !this.terminated) {
        this.onmessage({
          data: {
            type: 'meshComplete',
            requestId: data.requestId,
            positions: new Float32Array(0),
            normals: new Float32Array(0),
            colors: new Float32Array(0),
            indices: new Uint32Array(0),
            vertexCount: 0,
            faceCount: 0,
          },
        });
      }
    }, 10);
  }

  terminate() {
    this.terminated = true;
  }
}

// Install mock
const originalWorker = globalThis.Worker;

beforeAll(() => {
  globalThis.Worker = MockWorker;
});

afterAll(() => {
  globalThis.Worker = originalWorker;
});

describe('WorkerPool', () => {
  let pool;

  beforeEach(() => {
    pool = new WorkerPool('/fake-worker.js', 2);
  });

  afterEach(() => {
    pool.terminate();
  });

  describe('constructor', () => {
    it('creates specified number of workers', () => {
      expect(pool.workers).toHaveLength(2);
    });

    it('all workers start as available', () => {
      expect(pool.available).toHaveLength(2);
    });

    it('starts with no pending or queued tasks', () => {
      expect(pool.pending.size).toBe(0);
      expect(pool.queue).toHaveLength(0);
    });

    it('initializes error tracking', () => {
      expect(pool.consecutiveErrors).toBe(0);
      expect(pool.maxConsecutiveErrors).toBe(3);
    });
  });

  describe('execute', () => {
    it('sends task to an available worker', async () => {
      const result = await pool.execute({ type: 'buildMesh', blocks: [] });
      expect(result).toBeDefined();
      expect(result.vertexCount).toBe(0);
    });

    it('queues task when no workers available', () => {
      // Acquire all workers
      const w1 = pool.acquireWorker();
      const w2 = pool.acquireWorker();
      expect(pool.available).toHaveLength(0);

      // This should queue
      const promise = pool.execute({ type: 'buildMesh' });
      expect(pool.queue).toHaveLength(1);

      // Release worker to process queue
      pool.releaseWorker(w1);
      pool.releaseWorker(w2);

      return promise;
    });

    it('rejects when pool is terminated', async () => {
      pool.terminate();
      await expect(pool.execute({ type: 'buildMesh' })).rejects.toThrow(
        'Worker pool has been terminated'
      );
    });
  });

  describe('executeAll', () => {
    it('executes multiple tasks in parallel', async () => {
      const tasks = [
        { type: 'buildMesh', blocks: [] },
        { type: 'buildMesh', blocks: [] },
      ];
      const results = await pool.executeAll(tasks);
      expect(results).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('tracks consecutive errors', () => {
      const worker = pool.workers[0];
      pool.handleError(worker, { message: 'Test error' });
      expect(pool.consecutiveErrors).toBe(1);
    });

    it('respawns worker on error within limit', () => {
      const initialCount = pool.workers.length;
      const worker = pool.workers[0];
      pool.handleError(worker, { message: 'Test error' });
      // Should replace the failed worker
      expect(pool.workers.length).toBe(initialCount);
    });

    it('stops respawning after max consecutive errors', () => {
      for (let i = 0; i < 3; i++) {
        const worker = pool.workers[0];
        pool.handleError(worker, { message: `Error ${i}` });
      }
      expect(pool.consecutiveErrors).toBe(3);
      // Should have fewer workers now
      expect(pool.workers.length).toBeLessThan(2);
    });

    it('resets error counter on successful message', async () => {
      pool.consecutiveErrors = 2;
      const result = await pool.execute({ type: 'buildMesh' });
      expect(pool.consecutiveErrors).toBe(0);
    });

    it('rejects pending tasks for crashed worker', () => {
      const worker = pool.acquireWorker();
      const requestId = 'test-123';
      let rejected = false;

      pool.pending.set(requestId, {
        resolve: () => {},
        reject: () => { rejected = true; },
        worker,
      });

      pool.handleError(worker, { message: 'crash' });
      expect(rejected).toBe(true);
      expect(pool.pending.has(requestId)).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns pool statistics', () => {
      const stats = pool.getStats();
      expect(stats.poolSize).toBe(2);
      expect(stats.available).toBe(2);
      expect(stats.busy).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.queued).toBe(0);
    });
  });

  describe('terminate', () => {
    it('marks pool as terminated', () => {
      pool.terminate();
      expect(pool.terminated).toBe(true);
    });

    it('terminates all workers', () => {
      const workers = [...pool.workers];
      pool.terminate();
      workers.forEach((w) => expect(w.terminated).toBe(true));
      expect(pool.workers).toHaveLength(0);
    });

    it('rejects pending tasks', () => {
      let rejected = false;
      pool.pending.set('test', {
        resolve: () => {},
        reject: () => { rejected = true; },
        worker: pool.workers[0],
      });

      pool.terminate();
      expect(rejected).toBe(true);
    });

    it('rejects queued tasks', () => {
      let rejected = false;
      pool.queue.push({
        task: {},
        resolve: () => {},
        reject: () => { rejected = true; },
      });

      pool.terminate();
      expect(rejected).toBe(true);
    });
  });
});
