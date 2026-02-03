# Performance Baseline & Targets

**Created:** February 3, 2026
**Status:** Research Complete
**Purpose:** Establish current performance metrics and optimization targets

---

## Overview

Before building the chunk system, we need to understand our current performance baseline and set targets. This document profiles the existing `VoxelTerrain` component and establishes benchmarks for the new system.

---

## Current Implementation Analysis

### VoxelTerrain.jsx (Current)

```javascript
// Current approach: InstancedMesh with all voxels
const VoxelTerrain = ({ size = 50, voxelSize = 2 }) => {
  // Generates terrain for entire size×size area
  // Each voxel = 1 instance
  // All instances created on mount
};
```

**Problems identified:**
1. All terrain generated at once (blocking)
2. No chunk loading/unloading
3. Every block is an instance (even underground)
4. No face culling (hidden faces rendered)
5. No LOD for distant terrain

### Estimated Current Performance

With `size=50`, `voxelSize=2`:
- Grid: 50×50 = 2,500 columns
- Average height: ~5 blocks per column
- Total blocks: ~12,500 instances
- Vertices per instance: 36 (6 faces × 6 vertices)
- Total vertices: ~450,000

**Estimated metrics (unverified):**
| Metric | Estimated Value |
|--------|-----------------|
| Initial generation | 50-200ms |
| Memory (geometry) | ~20-50MB |
| Draw calls | 1 |
| Frame time | 5-15ms |

---

## Target Performance

### Frame Time Budget

At 60 FPS, we have 16.67ms per frame:

| Component | Budget | Notes |
|-----------|--------|-------|
| Rendering (Three.js) | 8ms | Main render loop |
| Game logic | 3ms | Physics, AI, state |
| React reconciliation | 2ms | Component updates |
| Input handling | 1ms | Keyboard, mouse |
| Chunk management | 2ms | Load/unload processing |
| **Total** | **16ms** | Leaves ~0.5ms margin |

### Performance Targets

| Metric | Target | Stretch Goal |
|--------|--------|--------------|
| Frame rate | 60 FPS | 60 FPS locked |
| Frame time (avg) | <16ms | <12ms |
| Frame time (max spike) | <33ms | <20ms |
| Memory (total) | <1GB | <512MB |
| Memory (GPU) | <512MB | <256MB |
| Chunk load time | <100ms | <50ms |
| Initial load | <5s | <3s |
| Save time | <1s (non-blocking) | <500ms |

### View Distance Targets

| View Distance | Chunks Loaded | Target FPS |
|---------------|---------------|------------|
| 4 chunks (64 blocks) | ~80 | 60 |
| 8 chunks (128 blocks) | ~290 | 60 |
| 12 chunks (192 blocks) | ~625 | 45-60 |
| 16 chunks (256 blocks) | ~1100 | 30-45 |

---

## Profiling Methodology

### Tools

1. **Browser DevTools Performance tab** - Frame timing, call stacks
2. **Chrome Memory profiler** - Heap snapshots, allocation tracking
3. **stats.js** - Real-time FPS/MS/MB overlay
4. **Three.js built-in stats** - Draw calls, triangles, geometries
5. **React DevTools Profiler** - Component render times

### Stats.js Integration

```javascript
// src/components/3d/PerformanceStats.jsx
import { useEffect, useRef } from 'react';
import Stats from 'stats.js';

export function PerformanceStats() {
  const statsRef = useRef();

  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb

    // Position in corner
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '0';
    stats.dom.style.left = '0';
    document.body.appendChild(stats.dom);

    statsRef.current = stats;

    const animate = () => {
      stats.begin();
      // Rendered by Three.js
      stats.end();
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      document.body.removeChild(stats.dom);
    };
  }, []);

  return null;
}
```

### Three.js Renderer Stats

```javascript
// src/hooks/useRendererStats.js
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export function useRendererStats() {
  const { gl } = useThree();

  useEffect(() => {
    const logStats = () => {
      const info = gl.info;
      console.log('Render stats:', {
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      });
    };

    const interval = setInterval(logStats, 5000);
    return () => clearInterval(interval);
  }, [gl]);
}
```

---

## Benchmark Tests

### 1. Terrain Generation Benchmark

```javascript
// src/__benchmarks__/terrainGeneration.bench.js

import { generateChunkTerrain } from '../workers/terrainGenerator';

describe('Terrain Generation', () => {
  test('16³ chunk generation time', () => {
    const times = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      generateChunkTerrain({ chunkX: i, chunkZ: 0, seed: 12345 });
      times.push(performance.now() - start);
    }

    const avg = times.reduce((a, b) => a + b) / times.length;
    const max = Math.max(...times);

    console.log(`Chunk generation: avg=${avg.toFixed(2)}ms, max=${max.toFixed(2)}ms`);

    expect(avg).toBeLessThan(50); // Target: <50ms average
    expect(max).toBeLessThan(100); // Target: <100ms max
  });
});
```

### 2. Mesh Building Benchmark

```javascript
// src/__benchmarks__/meshBuilding.bench.js

import { buildChunkMesh } from '../workers/meshBuilder';
import { Chunk } from '../systems/chunks/Chunk';

describe('Mesh Building', () => {
  test('16³ chunk mesh build time', () => {
    // Create a chunk with varied terrain
    const chunk = new Chunk(0, 0);
    fillChunkWithTerrain(chunk);

    const times = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      buildChunkMesh(chunk, {});
      times.push(performance.now() - start);
    }

    const avg = times.reduce((a, b) => a + b) / times.length;

    console.log(`Mesh build: avg=${avg.toFixed(2)}ms`);

    expect(avg).toBeLessThan(30); // Target: <30ms average
  });

  test('mesh vertex count is reasonable', () => {
    const chunk = new Chunk(0, 0);
    fillChunkWithTerrain(chunk);

    const mesh = buildChunkMesh(chunk, {});

    // With face culling, should be much less than worst case
    // Worst case: 16³ × 6 faces × 4 vertices = 98,304
    // Expected with culling: 2,000-10,000
    expect(mesh.positions.length / 3).toBeLessThan(15000);

    console.log(`Vertices: ${mesh.positions.length / 3}`);
  });
});
```

### 3. Memory Benchmark

```javascript
// src/__benchmarks__/memory.bench.js

describe('Memory Usage', () => {
  test('chunk memory footprint', () => {
    const before = performance.memory?.usedJSHeapSize || 0;

    const chunks = [];
    for (let i = 0; i < 100; i++) {
      chunks.push(new Chunk(i, 0));
    }

    const after = performance.memory?.usedJSHeapSize || 0;
    const perChunk = (after - before) / 100;

    console.log(`Memory per chunk: ${(perChunk / 1024).toFixed(2)}KB`);

    // Target: <10KB per chunk (data only, no mesh)
    expect(perChunk).toBeLessThan(10 * 1024);
  });
});
```

### 4. Frame Time Benchmark

```javascript
// src/__benchmarks__/frameTime.bench.js

describe('Frame Time', () => {
  test('maintains 60fps with 100 chunks', async () => {
    const frameTimes = [];

    // Measure 300 frames
    for (let i = 0; i < 300; i++) {
      const start = performance.now();

      // Simulate frame work
      updateChunks();
      updateEntities();
      // Rendering handled by Three.js

      await nextFrame();

      frameTimes.push(performance.now() - start);
    }

    const avg = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
    const p95 = percentile(frameTimes, 95);
    const max = Math.max(...frameTimes);

    console.log(`Frame time: avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, max=${max.toFixed(2)}ms`);

    expect(avg).toBeLessThan(16);
    expect(p95).toBeLessThan(20);
    expect(max).toBeLessThan(33);
  });
});
```

---

## Optimization Strategies

### 1. Chunk Loading Optimization

```javascript
// Time-sliced chunk loading
class ChunkLoader {
  constructor() {
    this.loadQueue = [];
    this.maxLoadTimePerFrame = 8; // ms
  }

  update() {
    const frameStart = performance.now();

    while (this.loadQueue.length > 0) {
      // Check time budget
      if (performance.now() - frameStart > this.maxLoadTimePerFrame) {
        break; // Continue next frame
      }

      const chunk = this.loadQueue.shift();
      this.loadChunk(chunk);
    }
  }
}
```

### 2. Object Pooling

```javascript
// Pool commonly allocated objects
class Vector3Pool {
  constructor(initialSize = 100) {
    this.pool = [];
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(new THREE.Vector3());
    }
    this.index = 0;
  }

  acquire() {
    if (this.index >= this.pool.length) {
      this.pool.push(new THREE.Vector3());
    }
    return this.pool[this.index++];
  }

  reset() {
    this.index = 0;
  }
}

// Use in hot paths
const vecPool = new Vector3Pool();

function processChunks() {
  vecPool.reset(); // Start of frame

  for (const chunk of activeChunks) {
    const pos = vecPool.acquire();
    pos.set(chunk.x, 0, chunk.z);
    // Use pos...
  }
}
```

### 3. Frustum Culling

```javascript
// Don't process chunks outside camera view
function getVisibleChunks(camera, allChunks) {
  const frustum = new THREE.Frustum();
  const matrix = new THREE.Matrix4();

  matrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(matrix);

  return allChunks.filter(chunk => {
    const box = chunk.boundingBox;
    return frustum.intersectsBox(box);
  });
}
```

### 4. Geometry Merging Batching

```javascript
// Batch geometry updates
class ChunkMeshManager {
  constructor() {
    this.pendingUpdates = new Set();
    this.updateBudget = 2; // chunks per frame
  }

  markForUpdate(chunkKey) {
    this.pendingUpdates.add(chunkKey);
  }

  update() {
    let updated = 0;

    for (const key of this.pendingUpdates) {
      if (updated >= this.updateBudget) break;

      this.rebuildChunkMesh(key);
      this.pendingUpdates.delete(key);
      updated++;
    }
  }
}
```

---

## Hardware Targets

### Minimum Specs

| Component | Requirement |
|-----------|-------------|
| CPU | Dual-core 2GHz |
| RAM | 4GB |
| GPU | WebGL 2.0 capable |
| Browser | Chrome 80+, Firefox 75+, Safari 14+ |

### Recommended Specs

| Component | Requirement |
|-----------|-------------|
| CPU | Quad-core 3GHz |
| RAM | 8GB |
| GPU | Dedicated GPU (GTX 1060 equivalent) |
| Browser | Latest Chrome/Firefox |

### Mobile Considerations

| Platform | Target FPS | View Distance |
|----------|------------|---------------|
| High-end phone | 30 | 4 chunks |
| Mid-range phone | 30 | 2-3 chunks |
| Tablet | 30-60 | 4-6 chunks |

---

## Monitoring in Production

### Performance Metrics to Track

```javascript
// src/systems/telemetry.js

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameTime: [],
      chunkLoadTime: [],
      memoryUsage: [],
    };
  }

  recordFrameTime(ms) {
    this.metrics.frameTime.push(ms);
    if (this.metrics.frameTime.length > 300) {
      this.metrics.frameTime.shift();
    }
  }

  getAverageFrameTime() {
    const times = this.metrics.frameTime;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  get95thPercentileFrameTime() {
    const sorted = [...this.metrics.frameTime].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  logSummary() {
    console.log('Performance Summary:', {
      avgFrameTime: this.getAverageFrameTime().toFixed(2) + 'ms',
      p95FrameTime: this.get95thPercentileFrameTime().toFixed(2) + 'ms',
      fps: (1000 / this.getAverageFrameTime()).toFixed(1),
    });
  }
}

export const perfMonitor = new PerformanceMonitor();
```

---

## Additional Design Decisions

### Camera: Both First and Third Person

Support both camera modes with smooth transitions:

```javascript
// Camera configuration
const CAMERA_MODES = {
  FIRST_PERSON: {
    offset: { x: 0, y: 1.6, z: 0 },  // Eye height
    fov: 75,
    minDistance: 0,
    maxDistance: 0,
  },
  THIRD_PERSON: {
    offset: { x: 0, y: 2, z: -5 },  // Behind and above
    fov: 60,
    minDistance: 2,
    maxDistance: 10,
  },
};

// Toggle with a key (e.g., V)
function toggleCameraMode() {
  currentMode = currentMode === 'FIRST_PERSON' ? 'THIRD_PERSON' : 'FIRST_PERSON';
  // Smooth lerp to new position
}
```

### Block Breaking: Timed (Minecraft-style)

Block breaking takes time based on tool and block type:

```javascript
// Block hardness values (seconds to break with bare hands)
const BLOCK_HARDNESS = {
  DIRT: 0.5,
  GRASS: 0.6,
  STONE: 1.5,
  WOOD: 2.0,
  // ...
};

// Tool effectiveness multipliers
const TOOL_EFFECTIVENESS = {
  HAND: 1.0,
  WOOD_PICKAXE: 2.0,
  STONE_PICKAXE: 4.0,
  IRON_PICKAXE: 6.0,
  // ...
};

// Calculate break time
function getBreakTime(blockType, toolType) {
  const hardness = BLOCK_HARDNESS[blockType] || 1.0;
  const effectiveness = TOOL_EFFECTIVENESS[toolType] || 1.0;
  return hardness / effectiveness;
}

// Breaking state
class BlockBreaker {
  constructor() {
    this.targetBlock = null;
    this.progress = 0;
    this.breakTime = 0;
  }

  startBreaking(block, tool) {
    this.targetBlock = block;
    this.progress = 0;
    this.breakTime = getBreakTime(block.type, tool);
  }

  update(deltaTime) {
    if (!this.targetBlock) return;

    this.progress += deltaTime;

    // Visual feedback: crack overlay at 25%, 50%, 75%
    const percent = this.progress / this.breakTime;
    this.updateBreakOverlay(percent);

    if (this.progress >= this.breakTime) {
      this.completeBreak();
    }
  }

  completeBreak() {
    // Remove block, spawn item drop
    dispatcher.dispatch({
      type: ActionTypes.WORLD_BREAK_BLOCK,
      payload: {
        chunkKey: this.targetBlock.chunkKey,
        x: this.targetBlock.x,
        y: this.targetBlock.y,
        z: this.targetBlock.z,
      },
    });

    this.targetBlock = null;
    this.progress = 0;
  }

  cancelBreaking() {
    this.targetBlock = null;
    this.progress = 0;
    this.clearBreakOverlay();
  }
}
```

---

## Summary

### Current vs Target

| Metric | Current (Est.) | Target |
|--------|----------------|--------|
| Frame time | 5-15ms | <16ms avg |
| Max spike | Unknown | <33ms |
| Chunk load | N/A | <100ms |
| Memory | ~50MB | <512MB |
| View distance | Fixed 50 | 8+ chunks |

### Key Optimizations Planned

1. **Chunk-based loading** - Only load nearby terrain
2. **Merged geometry** - Face culling, fewer vertices
3. **LOD system** - Simpler meshes for distant chunks
4. **Web Workers** - Off-thread generation
5. **Object pooling** - Reduce GC pressure
6. **Time slicing** - Spread work across frames

### Next Steps

1. Run baseline profiling on current VoxelTerrain
2. Document actual numbers (not estimates)
3. Set up automated performance regression tests
4. Implement chunk system with performance tracking
5. Compare before/after metrics
