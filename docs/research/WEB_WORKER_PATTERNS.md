# Web Worker Communication Patterns

**Created:** February 3, 2026
**Status:** Research Complete
**Decision:** Use dedicated workers with Transferable objects

---

## Overview

Web Workers allow us to run JavaScript off the main thread, preventing terrain generation and other heavy computations from blocking rendering. This document outlines our approach to worker communication.

---

## Why We Need Workers

### The Problem
The main thread must maintain 60 FPS (16.67ms per frame). Heavy operations block the thread:

| Operation | Typical Time | Frames Blocked |
|-----------|--------------|----------------|
| Generate 16³ chunk terrain | 5-15ms | 1 |
| Generate 32³ chunk terrain | 20-50ms | 1-3 |
| Build chunk mesh | 10-30ms | 1-2 |
| Pathfinding (complex) | 5-20ms | 1 |
| Save serialization | 50-200ms | 3-12 |

Running these on the main thread causes visible stutters.

### The Solution
Move expensive operations to Web Workers:
- Terrain generation
- Mesh geometry building
- Pathfinding calculations
- Save/Load serialization

---

## Communication Methods Evaluated

### 1. Structured Clone (Default)
```javascript
// Main thread
worker.postMessage({ type: 'generate', chunkX: 0, chunkZ: 0 });

// Worker receives copy of data
```

**Pros:**
- Simple, works with most data types
- No special handling needed

**Cons:**
- Data is copied (slow for large arrays)
- Memory doubles during transfer

**Use for:** Small messages, configuration, commands

### 2. Transferable Objects (Recommended)
```javascript
// Worker creates data
const blocks = new Uint8Array(16 * 16 * 16);
// ... fill blocks ...

// Transfer ownership to main thread (zero-copy)
self.postMessage(
  { type: 'complete', chunkX, chunkZ, blocks },
  [blocks.buffer]  // Transfer list
);
// blocks is now unusable in worker
```

**Pros:**
- Zero-copy transfer (instant, regardless of size)
- No memory duplication
- Works with ArrayBuffer, MessagePort, ImageBitmap

**Cons:**
- Original reference becomes unusable
- Only works with specific types

**Use for:** Chunk data (Uint8Array), mesh vertex data (Float32Array)

### 3. SharedArrayBuffer
```javascript
// Main thread creates shared memory
const sharedBuffer = new SharedArrayBuffer(16 * 16 * 16);
const blocks = new Uint8Array(sharedBuffer);

// Worker can read/write same memory
worker.postMessage({ blocks });
```

**Pros:**
- True shared memory, no transfer needed
- Can update in-place

**Cons:**
- Requires COOP/COEP headers (security)
- Needs Atomics for synchronization
- More complex to reason about
- Not available in all contexts

**Use for:** Future optimization if needed, not initial implementation

### 4. Comlink Library
```javascript
// Wraps worker in proxy, looks like async function calls
import { wrap } from 'comlink';

const api = wrap(new Worker('./chunkWorker.js'));
const result = await api.generateChunk(0, 0);
```

**Pros:**
- Clean API, feels like regular async code
- Handles Transferables automatically
- Good TypeScript support

**Cons:**
- Additional dependency
- Slight overhead
- Magic can hide performance issues

**Decision:** Don't use initially. Our worker protocol is simple enough without it. Consider later if worker API grows complex.

---

## Chosen Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Main Thread                          │
├─────────────────────────────────────────────────────────┤
│  ChunkManager                                           │
│  ├── WorkerPool (2-4 workers)                          │
│  ├── RequestQueue (pending chunk requests)             │
│  └── ResultHandler (processes completed chunks)        │
└─────────────────────────────────────────────────────────┘
                          │
            postMessage (command + small data)
            Transferable (large arrays)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Chunk Workers                         │
├─────────────────────────────────────────────────────────┤
│  ChunkWorker #1     ChunkWorker #2     ChunkWorker #3  │
│  ├── Terrain Gen    ├── Terrain Gen    ├── Terrain Gen │
│  └── Mesh Build     └── Mesh Build     └── Mesh Build  │
└─────────────────────────────────────────────────────────┘
```

### Worker Pool

Use multiple workers to parallelize chunk generation:

```javascript
// src/systems/workers/WorkerPool.js
class WorkerPool {
  constructor(workerScript, poolSize = navigator.hardwareConcurrency || 4) {
    this.workers = [];
    this.available = [];
    this.pending = new Map(); // requestId -> { resolve, reject }

    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript, { type: 'module' });
      worker.onmessage = (e) => this.handleMessage(worker, e);
      worker.onerror = (e) => this.handleError(worker, e);
      this.workers.push(worker);
      this.available.push(worker);
    }
  }

  async execute(task) {
    const worker = await this.acquireWorker();
    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject, worker });
      worker.postMessage({ ...task, requestId });
    });
  }

  handleMessage(worker, event) {
    const { requestId, ...result } = event.data;
    const pending = this.pending.get(requestId);
    if (pending) {
      this.pending.delete(requestId);
      this.releaseWorker(pending.worker);
      pending.resolve(result);
    }
  }

  // ... acquireWorker, releaseWorker, terminate
}
```

### Message Protocol

#### Main → Worker

```javascript
// Generate terrain for a chunk
{
  type: 'generateTerrain',
  requestId: 'uuid',
  chunkX: 0,
  chunkZ: 0,
  seed: 12345,
  biomeParams: { /* biome configuration */ }
}

// Build mesh from chunk data
{
  type: 'buildMesh',
  requestId: 'uuid',
  blocks: Uint8Array,        // Transferred
  neighborData: { ... },      // For seamless edges
  lodLevel: 0
}

// Cancel pending request
{
  type: 'cancel',
  requestId: 'uuid'
}
```

#### Worker → Main

```javascript
// Terrain generation complete
{
  type: 'terrainComplete',
  requestId: 'uuid',
  blocks: Uint8Array,         // Transferred back
  heightMap: Uint8Array,      // Transferred
}

// Mesh build complete
{
  type: 'meshComplete',
  requestId: 'uuid',
  positions: Float32Array,    // Transferred
  normals: Float32Array,      // Transferred
  colors: Float32Array,       // Transferred
  indices: Uint32Array,       // Transferred
}

// Error occurred
{
  type: 'error',
  requestId: 'uuid',
  error: 'Description of what went wrong'
}

// Progress update (for long operations)
{
  type: 'progress',
  requestId: 'uuid',
  percent: 50
}
```

### Chunk Worker Implementation

```javascript
// src/workers/chunkWorker.js
import { generateTerrain } from './terrainGenerator.js';
import { buildMesh } from './meshBuilder.js';

const activeTasks = new Map();

self.onmessage = async (event) => {
  const { type, requestId, ...params } = event.data;

  switch (type) {
    case 'generateTerrain': {
      activeTasks.set(requestId, { cancelled: false });

      try {
        const result = await generateTerrain(params, activeTasks.get(requestId));

        if (!activeTasks.get(requestId)?.cancelled) {
          self.postMessage(
            { type: 'terrainComplete', requestId, ...result },
            [result.blocks.buffer, result.heightMap.buffer]
          );
        }
      } catch (error) {
        self.postMessage({ type: 'error', requestId, error: error.message });
      } finally {
        activeTasks.delete(requestId);
      }
      break;
    }

    case 'buildMesh': {
      activeTasks.set(requestId, { cancelled: false });

      try {
        const result = buildMesh(params);

        self.postMessage(
          { type: 'meshComplete', requestId, ...result },
          [
            result.positions.buffer,
            result.normals.buffer,
            result.colors.buffer,
            result.indices.buffer
          ]
        );
      } catch (error) {
        self.postMessage({ type: 'error', requestId, error: error.message });
      } finally {
        activeTasks.delete(requestId);
      }
      break;
    }

    case 'cancel': {
      const task = activeTasks.get(requestId);
      if (task) {
        task.cancelled = true;
      }
      break;
    }
  }
};
```

---

## Performance Considerations

### Transfer Size Benchmarks

| Data | Size | Structured Clone | Transferable |
|------|------|------------------|--------------|
| 16³ Uint8Array | 4KB | ~0.1ms | ~0.01ms |
| 32³ Uint8Array | 32KB | ~0.5ms | ~0.01ms |
| Mesh (10K verts) | ~480KB | ~5ms | ~0.01ms |
| Mesh (50K verts) | ~2.4MB | ~25ms | ~0.01ms |

**Conclusion:** Always use Transferable for arrays larger than ~1KB.

### Worker Count

```javascript
// Recommended: Match CPU cores, cap at 4
const workerCount = Math.min(navigator.hardwareConcurrency || 4, 4);
```

More workers = more parallel generation, but:
- Each worker uses memory
- Too many causes context switching overhead
- 4 is usually optimal for chunk generation

### Message Batching

For many small operations, batch messages:

```javascript
// Instead of:
for (const chunk of chunks) {
  worker.postMessage({ type: 'generate', chunk });
}

// Do:
worker.postMessage({ type: 'generateBatch', chunks });
```

---

## Error Handling

```javascript
// WorkerPool error handling
worker.onerror = (error) => {
  console.error('Worker error:', error);

  // Reject all pending tasks for this worker
  for (const [requestId, task] of this.pending) {
    if (task.worker === worker) {
      task.reject(new Error('Worker crashed'));
      this.pending.delete(requestId);
    }
  }

  // Replace crashed worker
  const index = this.workers.indexOf(worker);
  this.workers[index] = new Worker(this.workerScript, { type: 'module' });
};
```

---

## Integration with React

```javascript
// src/hooks/useChunkWorker.js
import { useEffect, useRef, useCallback } from 'react';
import { WorkerPool } from '../systems/workers/WorkerPool';

export function useChunkWorker() {
  const poolRef = useRef(null);

  useEffect(() => {
    poolRef.current = new WorkerPool(
      new URL('../workers/chunkWorker.js', import.meta.url),
      4
    );

    return () => {
      poolRef.current?.terminate();
    };
  }, []);

  const generateChunk = useCallback(async (chunkX, chunkZ, seed) => {
    if (!poolRef.current) throw new Error('Worker pool not initialized');

    return poolRef.current.execute({
      type: 'generateTerrain',
      chunkX,
      chunkZ,
      seed
    });
  }, []);

  return { generateChunk };
}
```

---

## Testing Workers

Workers are tricky to test. Approaches:

### 1. Mock Workers in Unit Tests
```javascript
// __mocks__/chunkWorker.js
class MockWorker {
  constructor() {
    this.onmessage = null;
  }
  postMessage(data) {
    // Simulate async response
    setTimeout(() => {
      this.onmessage?.({
        data: { type: 'terrainComplete', requestId: data.requestId, blocks: new Uint8Array(4096) }
      });
    }, 0);
  }
  terminate() {}
}
global.Worker = MockWorker;
```

### 2. Test Worker Logic Separately
```javascript
// terrainGenerator.test.js
import { generateTerrain } from './terrainGenerator';

test('generates terrain with correct dimensions', () => {
  const result = generateTerrain({ chunkX: 0, chunkZ: 0, seed: 123 });
  expect(result.blocks.length).toBe(16 * 16 * 16);
});
```

### 3. Integration Tests with Real Workers
```javascript
// Use actual workers in integration tests
test('worker pool generates chunks in parallel', async () => {
  const pool = new WorkerPool('./chunkWorker.js', 2);

  const results = await Promise.all([
    pool.execute({ type: 'generateTerrain', chunkX: 0, chunkZ: 0, seed: 1 }),
    pool.execute({ type: 'generateTerrain', chunkX: 1, chunkZ: 0, seed: 1 }),
  ]);

  expect(results).toHaveLength(2);
  pool.terminate();
});
```

---

## Summary

| Decision | Choice |
|----------|--------|
| Communication method | Transferable objects |
| Worker count | 2-4 (based on CPU cores) |
| Library | None (raw postMessage) |
| Shared memory | Not initially |
| Batching | For small frequent operations |

### Files to Create

1. `src/systems/workers/WorkerPool.js` - Worker management
2. `src/workers/chunkWorker.js` - Chunk generation worker
3. `src/workers/terrainGenerator.js` - Terrain generation logic
4. `src/workers/meshBuilder.js` - Mesh building logic
5. `src/hooks/useChunkWorker.js` - React integration
