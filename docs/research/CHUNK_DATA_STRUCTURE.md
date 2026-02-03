# Chunk Data Structure Design

**Created:** February 3, 2026
**Status:** Research Complete
**Decision:** 16³ chunks with Uint8Array storage, merged geometry rendering

---

## Overview

Chunks are the fundamental unit of world storage and rendering. This document defines the data structures, coordinate systems, and rendering approach.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chunk size | 16×16×16 | Balance of granularity and performance |
| Block storage | Uint8Array (256 types) | Sufficient variety, memory efficient |
| Rendering | Merged geometry | Far better performance than instancing |
| Coordinate system | Y-up, chunk origin at corner | Standard convention |

---

## Chunk Size: 16³

### Why 16³?

| Size | Blocks | Memory | Pros | Cons |
|------|--------|--------|------|------|
| 8³ | 512 | 0.5KB | Fast updates, fine granularity | Too many chunks, overhead |
| **16³** | 4,096 | 4KB | Good balance, Minecraft standard | — |
| 32³ | 32,768 | 32KB | Fewer chunks | Slow updates, coarse loading |
| 32×32×64 | 65,536 | 64KB | Tall worlds | Asymmetric, complex |

**16³ is the sweet spot:**
- 4KB per chunk fits nicely in memory
- Small enough for fast mesh rebuilds when blocks change
- Large enough that chunk count stays manageable
- Matches Minecraft, lots of reference implementations

### World Scale

With 16³ chunks:
- 100×100 chunk area = 1,600×1,600 blocks (plenty large)
- View distance of 8 chunks = 128 blocks visible
- At 2-unit voxels = 256 world units visible

---

## Block Storage

### Data Type: Uint8Array

```javascript
// 256 block types (0-255)
const BLOCK_TYPES = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  SAND: 4,
  WATER: 5,
  WOOD: 6,
  LEAVES: 7,
  // ... up to 255
};
```

**Why Uint8 (256 types)?**
- 256 types is plenty for our game
- 4KB per chunk (16×16×16 bytes)
- If we need more later, can upgrade to Uint16Array (65K types, 8KB/chunk)

### Array Layout: Flat with XZY Order

```javascript
// Index calculation: x + z * 16 + y * 256
function blockIndex(x, y, z) {
  return x + (z << 4) + (y << 8);  // Bit shifts for speed
}

// Equivalent to: x + z * 16 + y * 16 * 16
```

**Why XZY order?**
- Y (height) changes least frequently when iterating surfaces
- Horizontal slices are contiguous in memory
- Good cache locality for surface operations

### Chunk Class

```javascript
// src/systems/chunks/Chunk.js

const CHUNK_SIZE = 16;
const CHUNK_SIZE_SQ = CHUNK_SIZE * CHUNK_SIZE;
const CHUNK_SIZE_CUBED = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

export class Chunk {
  constructor(chunkX, chunkZ) {
    // Chunk coordinates (not world coordinates)
    this.x = chunkX;
    this.z = chunkZ;

    // Block data - flat Uint8Array
    this.blocks = new Uint8Array(CHUNK_SIZE_CUBED);

    // Heightmap for fast surface queries (16x16)
    this.heightMap = new Uint8Array(CHUNK_SIZE_SQ);

    // State tracking
    this.state = 'empty';  // empty, loading, ready, dirty, unloading
    this.isDirty = false;
    this.lastModified = 0;

    // Rendering
    this.mesh = null;
    this.lodLevel = 0;

    // Neighbors (for seamless meshing)
    this.neighbors = {
      north: null,  // +Z
      south: null,  // -Z
      east: null,   // +X
      west: null,   // -X
    };
  }

  // Convert local coords to array index
  static index(x, y, z) {
    return x + (z << 4) + (y << 8);
  }

  // Get block at local coordinates
  getBlock(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE ||
        y < 0 || y >= CHUNK_SIZE ||
        z < 0 || z >= CHUNK_SIZE) {
      return 0; // AIR for out of bounds
    }
    return this.blocks[Chunk.index(x, y, z)];
  }

  // Set block at local coordinates
  setBlock(x, y, z, blockType) {
    if (x < 0 || x >= CHUNK_SIZE ||
        y < 0 || y >= CHUNK_SIZE ||
        z < 0 || z >= CHUNK_SIZE) {
      return false;
    }

    const index = Chunk.index(x, y, z);
    const oldBlock = this.blocks[index];

    if (oldBlock !== blockType) {
      this.blocks[index] = blockType;
      this.isDirty = true;
      this.lastModified = Date.now();

      // Update heightmap
      this.updateHeightMap(x, z);

      return true;
    }
    return false;
  }

  // Update heightmap for a column
  updateHeightMap(x, z) {
    const hmIndex = x + z * CHUNK_SIZE;
    let height = 0;

    for (let y = CHUNK_SIZE - 1; y >= 0; y--) {
      if (this.blocks[Chunk.index(x, y, z)] !== 0) {
        height = y + 1;
        break;
      }
    }

    this.heightMap[hmIndex] = height;
  }

  // Rebuild entire heightmap
  rebuildHeightMap() {
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        this.updateHeightMap(x, z);
      }
    }
  }

  // Get highest solid block in column
  getHeight(x, z) {
    return this.heightMap[x + z * CHUNK_SIZE];
  }

  // Serialization for save/network
  serialize() {
    return {
      x: this.x,
      z: this.z,
      blocks: this.blocks,  // Uint8Array, will need encoding for JSON
      heightMap: this.heightMap,
    };
  }

  // Deserialization
  static deserialize(data) {
    const chunk = new Chunk(data.x, data.z);
    chunk.blocks = new Uint8Array(data.blocks);
    chunk.heightMap = new Uint8Array(data.heightMap);
    chunk.state = 'ready';
    return chunk;
  }

  // Cleanup
  dispose() {
    if (this.mesh) {
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
      this.mesh = null;
    }
    this.blocks = null;
    this.heightMap = null;
  }
}
```

---

## Coordinate Systems

### Three Coordinate Spaces

```
World Coordinates (float)
├── Used by: Player position, physics, rendering
├── Range: Unlimited (centered on origin)
└── Example: (34.5, 12.0, -17.25)

Chunk Coordinates (int)
├── Used by: ChunkManager, storage keys
├── Range: Unlimited integers
└── Example: (2, -2) for chunk at world X=32-47, Z=-32 to -17

Local Coordinates (int, 0-15)
├── Used by: Block access within chunk
├── Range: 0 to CHUNK_SIZE-1 (0-15)
└── Example: (2, 12, 1) for block within chunk
```

### Conversion Functions

```javascript
// src/systems/chunks/coordinates.js

export const CHUNK_SIZE = 16;
export const VOXEL_SIZE = 2;  // World units per voxel

// World position → Chunk coordinates
export function worldToChunk(worldX, worldZ) {
  return {
    chunkX: Math.floor(worldX / (CHUNK_SIZE * VOXEL_SIZE)),
    chunkZ: Math.floor(worldZ / (CHUNK_SIZE * VOXEL_SIZE)),
  };
}

// World position → Local block coordinates within chunk
export function worldToLocal(worldX, worldY, worldZ) {
  // Convert to voxel space first
  const voxelX = Math.floor(worldX / VOXEL_SIZE);
  const voxelY = Math.floor(worldY / VOXEL_SIZE);
  const voxelZ = Math.floor(worldZ / VOXEL_SIZE);

  // Then to local (handle negative correctly)
  return {
    x: ((voxelX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    y: Math.max(0, Math.min(CHUNK_SIZE - 1, voxelY)),
    z: ((voxelZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
  };
}

// Chunk + Local → World position (block center)
export function localToWorld(chunkX, chunkZ, localX, localY, localZ) {
  return {
    x: (chunkX * CHUNK_SIZE + localX) * VOXEL_SIZE + VOXEL_SIZE / 2,
    y: localY * VOXEL_SIZE + VOXEL_SIZE / 2,
    z: (chunkZ * CHUNK_SIZE + localZ) * VOXEL_SIZE + VOXEL_SIZE / 2,
  };
}

// Create chunk key for Map storage
export function chunkKey(chunkX, chunkZ) {
  return `${chunkX},${chunkZ}`;
}

// Parse chunk key back to coordinates
export function parseChunkKey(key) {
  const [x, z] = key.split(',').map(Number);
  return { chunkX: x, chunkZ: z };
}
```

---

## Rendering: Merged Geometry

### Why Merged Geometry Over Instancing

**Current approach (Instancing):**
```javascript
// Each block = 1 instance = 36 vertices (6 faces × 6 vertices)
// 16³ chunk = 4,096 instances × 36 = 147,456 vertices
// Most faces are hidden (underground or against neighbors)
```

**Better approach (Merged Geometry):**
```javascript
// Only render exposed faces
// Merge adjacent same-type faces (greedy meshing)
// Typical chunk: 500-2000 faces instead of 24,576
// 90%+ vertex reduction
```

### Comparison

| Metric | Instancing | Merged Geometry |
|--------|------------|-----------------|
| Vertex count (16³) | ~150K | ~5K-20K |
| Draw calls | 1 | 1 |
| Update cost | Cheap | Rebuild mesh |
| Memory | High | Low |
| Face culling | No | Yes |
| Used by | Simple demos | Real voxel games |

**Recommendation:** Use merged geometry with simple face culling. Add greedy meshing later if needed.

### Simple Face Culling

Only render faces that are exposed to air:

```javascript
// src/workers/meshBuilder.js

export function buildChunkMesh(chunk, neighbors) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];

  let vertexIndex = 0;

  for (let y = 0; y < CHUNK_SIZE; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const block = chunk.getBlock(x, y, z);
        if (block === 0) continue;  // Skip air

        const color = getBlockColor(block);

        // Check each face
        // Top (+Y)
        if (isAir(chunk, neighbors, x, y + 1, z)) {
          addFace(positions, normals, colors, indices,
            x, y, z, 'top', color, vertexIndex);
          vertexIndex += 4;
        }

        // Bottom (-Y)
        if (isAir(chunk, neighbors, x, y - 1, z)) {
          addFace(positions, normals, colors, indices,
            x, y, z, 'bottom', color, vertexIndex);
          vertexIndex += 4;
        }

        // North (+Z)
        if (isAir(chunk, neighbors, x, y, z + 1)) {
          addFace(positions, normals, colors, indices,
            x, y, z, 'north', color, vertexIndex);
          vertexIndex += 4;
        }

        // South (-Z)
        if (isAir(chunk, neighbors, x, y, z - 1)) {
          addFace(positions, normals, colors, indices,
            x, y, z, 'south', color, vertexIndex);
          vertexIndex += 4;
        }

        // East (+X)
        if (isAir(chunk, neighbors, x + 1, y, z)) {
          addFace(positions, normals, colors, indices,
            x, y, z, 'east', color, vertexIndex);
          vertexIndex += 4;
        }

        // West (-X)
        if (isAir(chunk, neighbors, x - 1, y, z)) {
          addFace(positions, normals, colors, indices,
            x, y, z, 'west', color, vertexIndex);
          vertexIndex += 4;
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  };
}

function isAir(chunk, neighbors, x, y, z) {
  // Handle crossing chunk boundaries
  if (x < 0) return neighbors.west?.getBlock(CHUNK_SIZE - 1, y, z) === 0 ?? true;
  if (x >= CHUNK_SIZE) return neighbors.east?.getBlock(0, y, z) === 0 ?? true;
  if (z < 0) return neighbors.south?.getBlock(x, y, CHUNK_SIZE - 1) === 0 ?? true;
  if (z >= CHUNK_SIZE) return neighbors.north?.getBlock(x, y, 0) === 0 ?? true;
  if (y < 0 || y >= CHUNK_SIZE) return true;

  return chunk.getBlock(x, y, z) === 0;
}

function addFace(positions, normals, colors, indices, x, y, z, face, color, startIndex) {
  // Face vertex positions relative to block
  const faceData = FACE_VERTICES[face];

  for (const vertex of faceData.vertices) {
    positions.push(
      (x + vertex[0]) * VOXEL_SIZE,
      (y + vertex[1]) * VOXEL_SIZE,
      (z + vertex[2]) * VOXEL_SIZE
    );
    normals.push(...faceData.normal);
    colors.push(color.r, color.g, color.b);
  }

  // Two triangles per face (0,1,2) and (2,3,0)
  indices.push(
    startIndex, startIndex + 1, startIndex + 2,
    startIndex + 2, startIndex + 3, startIndex
  );
}

const FACE_VERTICES = {
  top: {
    vertices: [[0,1,0], [1,1,0], [1,1,1], [0,1,1]],
    normal: [0, 1, 0]
  },
  bottom: {
    vertices: [[0,0,1], [1,0,1], [1,0,0], [0,0,0]],
    normal: [0, -1, 0]
  },
  north: {
    vertices: [[0,0,1], [0,1,1], [1,1,1], [1,0,1]],
    normal: [0, 0, 1]
  },
  south: {
    vertices: [[1,0,0], [1,1,0], [0,1,0], [0,0,0]],
    normal: [0, 0, -1]
  },
  east: {
    vertices: [[1,0,1], [1,1,1], [1,1,0], [1,0,0]],
    normal: [1, 0, 0]
  },
  west: {
    vertices: [[0,0,0], [0,1,0], [0,1,1], [0,0,1]],
    normal: [-1, 0, 0]
  }
};
```

### Creating Three.js Mesh

```javascript
// src/systems/chunks/ChunkMesh.js

export function createChunkMesh(meshData, chunkX, chunkZ) {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position',
    new THREE.BufferAttribute(meshData.positions, 3));
  geometry.setAttribute('normal',
    new THREE.BufferAttribute(meshData.normals, 3));
  geometry.setAttribute('color',
    new THREE.BufferAttribute(meshData.colors, 3));
  geometry.setIndex(
    new THREE.BufferAttribute(meshData.indices, 1));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Position mesh at chunk world origin
  mesh.position.set(
    chunkX * CHUNK_SIZE * VOXEL_SIZE,
    0,
    chunkZ * CHUNK_SIZE * VOXEL_SIZE
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}
```

---

## LOD Data Structures

### LOD Levels

| Level | Block Size | Blocks per Chunk | Vertices |
|-------|------------|------------------|----------|
| 0 (Full) | 1×1×1 | 4,096 | ~5-20K |
| 1 (Half) | 2×2×2 | 512 | ~1-5K |
| 2 (Quarter) | 4×4×4 | 64 | ~100-500 |

### LOD Chunk Data

```javascript
// Store multiple LOD levels per chunk
class ChunkLOD {
  constructor(chunk) {
    this.levels = [
      chunk.blocks,  // LOD 0: original data
      this.generateLOD1(chunk.blocks),  // LOD 1: 2x2x2 merged
      this.generateLOD2(chunk.blocks),  // LOD 2: 4x4x4 merged
    ];
  }

  generateLOD1(blocks) {
    const lodSize = CHUNK_SIZE / 2;  // 8
    const lod = new Uint8Array(lodSize * lodSize * lodSize);

    for (let y = 0; y < lodSize; y++) {
      for (let z = 0; z < lodSize; z++) {
        for (let x = 0; x < lodSize; x++) {
          lod[x + z * lodSize + y * lodSize * lodSize] =
            this.sampleBlock(blocks, x * 2, y * 2, z * 2, 2);
        }
      }
    }

    return lod;
  }

  generateLOD2(blocks) {
    const lodSize = CHUNK_SIZE / 4;  // 4
    const lod = new Uint8Array(lodSize * lodSize * lodSize);

    for (let y = 0; y < lodSize; y++) {
      for (let z = 0; z < lodSize; z++) {
        for (let x = 0; x < lodSize; x++) {
          lod[x + z * lodSize + y * lodSize * lodSize] =
            this.sampleBlock(blocks, x * 4, y * 4, z * 4, 4);
        }
      }
    }

    return lod;
  }

  // Sample NxNxN region, return most common non-air block
  sampleBlock(blocks, startX, startY, startZ, size) {
    const counts = new Map();

    for (let dy = 0; dy < size; dy++) {
      for (let dz = 0; dz < size; dz++) {
        for (let dx = 0; dx < size; dx++) {
          const block = blocks[
            (startX + dx) +
            (startZ + dz) * CHUNK_SIZE +
            (startY + dy) * CHUNK_SIZE * CHUNK_SIZE
          ];

          if (block !== 0) {  // Skip air
            counts.set(block, (counts.get(block) || 0) + 1);
          }
        }
      }
    }

    if (counts.size === 0) return 0;  // All air

    // Return most common
    let maxCount = 0;
    let maxBlock = 0;
    for (const [block, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        maxBlock = block;
      }
    }

    return maxBlock;
  }
}
```

---

## Memory Budget

### Per-Chunk Memory

| Component | Size |
|-----------|------|
| Block data (16³ Uint8) | 4 KB |
| Heightmap (16² Uint8) | 256 B |
| LOD 1 data (8³) | 512 B |
| LOD 2 data (4³) | 64 B |
| Mesh geometry (est.) | 20-100 KB |
| **Total per chunk** | **~25-105 KB** |

### World Memory

| View Distance | Chunks Loaded | Memory |
|---------------|---------------|--------|
| 4 chunks | 81 (9×9) | 2-8 MB |
| 8 chunks | 289 (17×17) | 7-30 MB |
| 12 chunks | 625 (25×25) | 15-65 MB |

**Conclusion:** Memory is manageable. We can support 8+ chunk view distance easily.

---

## Dirty Flag System

Track which chunks need mesh rebuilds:

```javascript
class ChunkManager {
  constructor() {
    this.dirtyChunks = new Set();  // Chunk keys needing rebuild
  }

  markDirty(chunkX, chunkZ) {
    this.dirtyChunks.add(chunkKey(chunkX, chunkZ));

    // Also mark neighbors dirty (for seamless edges)
    this.dirtyChunks.add(chunkKey(chunkX + 1, chunkZ));
    this.dirtyChunks.add(chunkKey(chunkX - 1, chunkZ));
    this.dirtyChunks.add(chunkKey(chunkX, chunkZ + 1));
    this.dirtyChunks.add(chunkKey(chunkX, chunkZ - 1));
  }

  processDirtyChunks(maxPerFrame = 2) {
    let processed = 0;

    for (const key of this.dirtyChunks) {
      if (processed >= maxPerFrame) break;

      const chunk = this.getChunk(key);
      if (chunk && chunk.state === 'ready') {
        this.rebuildChunkMesh(chunk);
        this.dirtyChunks.delete(key);
        processed++;
      }
    }
  }
}
```

---

## Summary

### Data Structures

1. **Chunk**: 16×16×16 Uint8Array + heightmap + mesh reference
2. **ChunkManager**: Map of active chunks, load/unload queues
3. **ChunkLOD**: Multi-resolution block data for distance rendering

### Key Functions

1. `worldToChunk()`: Convert world position to chunk coordinates
2. `worldToLocal()`: Convert world position to local block coordinates
3. `buildChunkMesh()`: Generate merged geometry from block data
4. `generateLOD()`: Create lower-resolution chunk data

### Files to Create

1. `src/systems/chunks/Chunk.js` - Chunk data class
2. `src/systems/chunks/ChunkManager.js` - Chunk lifecycle management
3. `src/systems/chunks/coordinates.js` - Coordinate conversion utilities
4. `src/systems/chunks/ChunkLOD.js` - LOD generation
5. `src/workers/meshBuilder.js` - Mesh generation (runs in worker)
6. `src/components/3d/ChunkMesh.jsx` - React Three Fiber chunk rendering
