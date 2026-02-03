# Phase 0: Foundation - Detailed Implementation Plan

**Created:** February 3, 2026
**Estimated Duration:** 8-12 weeks
**Status:** Planning

---

## Overview

Phase 0 builds the technical foundation that everything else depends on. We're not adding gameplay features yet—we're creating the architecture that makes features possible. This phase is heavy on infrastructure and may feel slow, but getting it right now prevents painful rewrites later.

### Goals
1. Chunk-based world rendering that scales to large worlds
2. State architecture designed for multiplayer from day one
3. Performance foundations (Web Workers, object pooling)
4. Save/Load that works with the new architecture
5. Proper player controls (keyboard + mouse)
6. Basic inventory system

### What Success Looks Like
By the end of Phase 0, we have a player walking through an infinite procedurally generated world. Chunks load and unload smoothly as they move. The game saves and loads correctly. The codebase is ready for multiplayer even though we haven't implemented networking yet.

---

## Task Breakdown

### 0.1 Research & Prototyping (Weeks 1-2)

Before committing to implementations, we need to answer technical questions.

#### 0.1.1 Web Worker Communication Patterns
**Goal:** Understand how to efficiently communicate between main thread and workers

**Research tasks:**
- [ ] Prototype basic worker that generates terrain data
- [ ] Test Transferable objects vs structured clone performance
- [ ] Measure overhead of worker message passing
- [ ] Evaluate Comlink library vs raw postMessage
- [ ] Test SharedArrayBuffer (if available) for chunk data

**Acceptance criteria:**
- [ ] Have working prototype of worker generating chunk data
- [ ] Performance numbers documented for different transfer methods
- [ ] Decision made on communication approach

**Output:** `docs/research/WEB_WORKER_PATTERNS.md`

---

#### 0.1.2 Chunk Data Structure Design
**Goal:** Design optimal data structure for voxel chunk storage

**Research tasks:**
- [ ] Analyze current VoxelTerrain implementation
- [ ] Design chunk coordinate system (chunk keys, local vs world coords)
- [ ] Choose voxel storage format (flat array, 3D array, run-length encoding)
- [ ] Plan heightmap optimization for surface-only queries
- [ ] Design dirty flag system for modified chunks

**Questions to answer:**
- Chunk size: 16³, 32³, or 32×32×64?
- Block type storage: Uint8 (256 types) or Uint16 (65K types)?
- Do we store air blocks or use sparse representation?

**Acceptance criteria:**
- [ ] Chunk data structure documented with rationale
- [ ] Memory usage calculated for different world sizes
- [ ] Coordinate conversion functions designed

**Output:** `docs/research/CHUNK_DATA_STRUCTURE.md`

---

#### 0.1.3 State Architecture for Multiplayer
**Goal:** Design Zustand store structure that supports future multiplayer

**Research tasks:**
- [ ] Analyze current useGameStore structure
- [ ] Design separation between authoritative and predicted state
- [ ] Plan state subscription patterns for network replication
- [ ] Design action/input abstraction layer
- [ ] Evaluate state serialization approaches

**Key decisions:**
- How do we separate "server state" from "client prediction"?
- How do actions get validated before applying?
- How do we handle state rollback for prediction errors?

**Acceptance criteria:**
- [ ] State architecture documented
- [ ] Clear separation between authority and prediction
- [ ] Serialization format designed for network sync

**Output:** `docs/research/MULTIPLAYER_STATE_ARCHITECTURE.md`

---

#### 0.1.4 Three.js Performance Profiling
**Goal:** Understand current performance baseline and bottlenecks

**Research tasks:**
- [ ] Profile current VoxelTerrain with different sizes
- [ ] Measure InstancedMesh limits (how many instances before slowdown?)
- [ ] Test geometry merging vs instancing for chunks
- [ ] Measure memory usage patterns
- [ ] Identify GC pressure points

**Metrics to capture:**
- Frame time at 1K, 5K, 10K, 50K instances
- Memory usage growth patterns
- GC pause frequency and duration

**Acceptance criteria:**
- [ ] Baseline performance numbers documented
- [ ] Bottlenecks identified
- [ ] Decision on instancing vs geometry merging

**Output:** `docs/research/PERFORMANCE_BASELINE.md`

---

### 0.2 Chunk System Core (Weeks 2-4)

#### 0.2.1 ChunkManager Class
**Goal:** Central coordinator for chunk loading, unloading, and state

**Implementation tasks:**
- [ ] Create `src/systems/chunks/ChunkManager.js`
- [ ] Implement chunk coordinate utilities (worldToChunk, chunkToWorld)
- [ ] Create ActiveChunks Map with chunk lifecycle states
- [ ] Implement load queue with priority sorting
- [ ] Implement unload queue with graceful removal
- [ ] Add distance-based chunk relevancy calculation
- [ ] Create chunk state machine (loading → ready → dirty → unloading)

**API design:**
```javascript
class ChunkManager {
  // Core operations
  getChunk(chunkX, chunkZ): Chunk | null
  requestChunk(chunkX, chunkZ, priority): void
  releaseChunk(chunkX, chunkZ): void

  // Bulk operations
  updatePlayerPosition(worldX, worldZ): void  // Triggers load/unload
  getChunksInRange(centerX, centerZ, range): Chunk[]

  // State queries
  isChunkLoaded(chunkX, chunkZ): boolean
  getChunkState(chunkX, chunkZ): ChunkState

  // Lifecycle
  update(deltaTime): void  // Process queues
  dispose(): void
}
```

**Acceptance criteria:**
- [ ] ChunkManager creates and tracks chunks
- [ ] Load queue processes chunks by priority
- [ ] Unload queue removes distant chunks
- [ ] Unit tests for coordinate conversions
- [ ] Unit tests for queue priority ordering

**Tests:**
- `ChunkManager.test.js` - Unit tests for all public methods
- Coordinate conversion edge cases
- Priority queue ordering
- State transitions

---

#### 0.2.2 Chunk Class
**Goal:** Individual chunk data container with voxel storage

**Implementation tasks:**
- [ ] Create `src/systems/chunks/Chunk.js`
- [ ] Implement voxel data storage (Uint8Array or Uint16Array)
- [ ] Add getBlock(localX, localY, localZ) method
- [ ] Add setBlock(localX, localY, localZ, blockType) method
- [ ] Implement heightmap for surface optimization
- [ ] Add dirty flag tracking for modified blocks
- [ ] Implement serialization for save/load

**Data structure:**
```javascript
class Chunk {
  constructor(chunkX, chunkZ) {
    this.x = chunkX;
    this.z = chunkZ;
    this.blocks = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z);
    this.heightMap = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
    this.state = 'empty'; // empty, loading, ready, dirty, unloading
    this.isDirty = false;
    this.mesh = null; // Three.js mesh reference
  }
}
```

**Acceptance criteria:**
- [ ] Block get/set works correctly
- [ ] Heightmap updates when surface blocks change
- [ ] Dirty flag set on modification
- [ ] Serialization produces reproducible output
- [ ] Unit tests for block operations

**Tests:**
- `Chunk.test.js` - Block operations, bounds checking, serialization

---

#### 0.2.3 ChunkWorker - Terrain Generation
**Goal:** Web Worker that generates terrain data off main thread

**Implementation tasks:**
- [ ] Create `src/workers/chunkWorker.js`
- [ ] Port noise generation to worker
- [ ] Implement terrain generation algorithm
- [ ] Add biome-based block type selection
- [ ] Return chunk data via Transferable
- [ ] Handle generation cancellation for obsolete requests

**Worker protocol:**
```javascript
// Main thread → Worker
{ type: 'generate', chunkX, chunkZ, seed }
{ type: 'cancel', chunkX, chunkZ }

// Worker → Main thread
{ type: 'complete', chunkX, chunkZ, blocks: Uint8Array, heightMap: Uint8Array }
{ type: 'error', chunkX, chunkZ, error: string }
```

**Acceptance criteria:**
- [ ] Worker generates terrain without blocking main thread
- [ ] Generated terrain matches seed (reproducible)
- [ ] Cancellation prevents unnecessary work
- [ ] Transfer uses Transferable objects (zero-copy)

**Tests:**
- Worker communication protocol
- Terrain reproducibility with same seed
- Cancellation handling

---

#### 0.2.4 ChunkMeshBuilder
**Goal:** Convert chunk voxel data to Three.js renderable mesh

**Implementation tasks:**
- [ ] Create `src/systems/chunks/ChunkMeshBuilder.js`
- [ ] Implement greedy meshing or naive box generation
- [ ] Support InstancedMesh output for current approach
- [ ] Support merged geometry output (future optimization)
- [ ] Add face culling (don't render faces between solid blocks)
- [ ] Return mesh data for main thread consumption

**Optimization considerations:**
- Only render exposed faces
- Group same-block-type faces where possible
- Consider running in worker for large chunks

**Acceptance criteria:**
- [ ] Mesh builds from chunk data correctly
- [ ] Hidden faces are culled
- [ ] Memory usage is reasonable
- [ ] Build time < 50ms per chunk

**Tests:**
- Mesh vertex count matches expected
- Face culling reduces geometry
- Performance benchmark

---

### 0.3 LOD System (Weeks 4-5)

#### 0.3.1 LOD Level Generation
**Goal:** Generate lower-detail versions of chunks for distant rendering

**Implementation tasks:**
- [ ] Create `src/systems/chunks/LODGenerator.js`
- [ ] Implement LOD level 1: 2×2×2 block merging
- [ ] Implement LOD level 2: 4×4×4 block merging
- [ ] Choose representative block type for merged groups
- [ ] Generate LOD meshes from reduced data

**Algorithm:**
```javascript
// For LOD level 1, merge 2×2×2 blocks into one
// Pick most common non-air block type in the group
// If all air, result is air
function generateLOD1(chunk) {
  const lodBlocks = new Uint8Array(reduced_size);
  for (let x = 0; x < CHUNK_SIZE_X; x += 2) {
    for (let y = 0; y < CHUNK_SIZE_Y; y += 2) {
      for (let z = 0; z < CHUNK_SIZE_Z; z += 2) {
        lodBlocks[lodIndex] = pickDominantBlock(chunk, x, y, z, 2);
      }
    }
  }
  return lodBlocks;
}
```

**Acceptance criteria:**
- [ ] LOD 1 has ~1/8 the blocks of full detail
- [ ] LOD 2 has ~1/64 the blocks of full detail
- [ ] Visual appearance is acceptable at intended distances
- [ ] Generation is fast enough for real-time use

---

#### 0.3.2 LOD Selection and Transitions
**Goal:** Smoothly switch LOD levels based on distance

**Implementation tasks:**
- [ ] Add LOD level tracking to ChunkManager
- [ ] Implement distance-based LOD selection
- [ ] Add hysteresis to prevent LOD thrashing at boundaries
- [ ] Implement cross-fade or pop reduction (optional)
- [ ] Update LOD when player moves

**Distance rings:**
```javascript
const LOD_DISTANCES = {
  0: 64,   // Full detail within 64 units (2 chunks)
  1: 128,  // LOD 1 within 128 units (4 chunks)
  2: 256,  // LOD 2 within 256 units (8 chunks)
  // Beyond: not loaded
};
```

**Acceptance criteria:**
- [ ] LOD transitions happen at correct distances
- [ ] No thrashing when player is at boundary
- [ ] Transitions don't cause visible popping (or it's minimal)

---

### 0.4 Chunk Rendering Integration (Weeks 5-6)

#### 0.4.1 ChunkRenderer Component
**Goal:** React component that renders active chunks

**Implementation tasks:**
- [ ] Create `src/components/3d/ChunkRenderer.jsx`
- [ ] Subscribe to ChunkManager for active chunks
- [ ] Render each chunk's mesh at correct world position
- [ ] Handle chunk mesh updates (when regenerated)
- [ ] Clean up meshes when chunks unload
- [ ] Support LOD mesh swapping

**Component structure:**
```jsx
function ChunkRenderer() {
  const activeChunks = useChunkManager(state => state.activeChunks);

  return (
    <group name="chunks">
      {Array.from(activeChunks.values()).map(chunk => (
        <ChunkMesh key={chunk.key} chunk={chunk} />
      ))}
    </group>
  );
}

function ChunkMesh({ chunk }) {
  const meshRef = useRef();
  // Update mesh when chunk.mesh changes
  // Position at chunk world coordinates
}
```

**Acceptance criteria:**
- [ ] Chunks render at correct positions
- [ ] New chunks appear as they load
- [ ] Old chunks disappear as they unload
- [ ] Mesh updates when chunk is modified
- [ ] No memory leaks on chunk cycling

---

#### 0.4.2 Replace VoxelTerrain with Chunk System
**Goal:** Migrate from single VoxelTerrain to chunk-based rendering

**Implementation tasks:**
- [ ] Create adapter to load existing terrain into chunks
- [ ] Update Experience.jsx to use ChunkRenderer
- [ ] Remove or deprecate VoxelTerrain.jsx
- [ ] Verify visual parity with old system
- [ ] Profile performance comparison

**Acceptance criteria:**
- [ ] Game renders same terrain as before (visually)
- [ ] Performance is equal or better
- [ ] No visual artifacts at chunk boundaries
- [ ] Old VoxelTerrain code removed or archived

---

### 0.5 State Architecture (Weeks 6-7)

#### 0.5.1 Refactor Game Store for Multiplayer
**Goal:** Restructure Zustand store to support authoritative/predicted state

**Implementation tasks:**
- [ ] Analyze current useGameStore.js
- [ ] Create state slice separation (world, players, entities, ui)
- [ ] Implement authoritative state container
- [ ] Implement predicted state for local player
- [ ] Create action dispatch abstraction
- [ ] Add state snapshot capability for rollback

**New store structure:**
```javascript
// Authoritative state - source of truth
const useAuthState = create((set, get) => ({
  world: { chunks: {}, time: 0 },
  players: {},  // All players including local
  entities: {}, // NPCs, monsters, items
  settlement: {},

  // Actions that modify authoritative state
  applyAction(action) { /* validate and apply */ },
}));

// Predicted state - local player only
const usePredictedState = create((set, get) => ({
  localPlayer: { position, velocity, pendingActions },

  // Optimistic updates
  predictAction(action) { /* apply locally */ },
  reconcile(serverState) { /* fix prediction errors */ },
}));

// Combined hook for components
function useGameState(selector) {
  const auth = useAuthState(selector);
  const pred = usePredictedState(selector);
  return mergeState(auth, pred);
}
```

**Acceptance criteria:**
- [ ] State cleanly separated by concern
- [ ] Actions go through validation layer
- [ ] Prediction doesn't corrupt authoritative state
- [ ] State can be serialized for save/network
- [ ] Existing game functionality still works

**Tests:**
- State isolation between auth and predicted
- Action validation
- Serialization roundtrip

---

#### 0.5.2 Action System
**Goal:** Create input→action→state pipeline that works for single and multiplayer

**Implementation tasks:**
- [ ] Define action types and schemas
- [ ] Create action creator functions
- [ ] Implement action validation
- [ ] Create action application logic
- [ ] Add action queue for network buffering

**Action types:**
```javascript
const ActionTypes = {
  PLAYER_MOVE: 'player/move',
  PLAYER_ATTACK: 'player/attack',
  BLOCK_PLACE: 'world/blockPlace',
  BLOCK_BREAK: 'world/blockBreak',
  ITEM_USE: 'inventory/useItem',
  // etc.
};

// Action structure
{
  type: 'world/blockPlace',
  playerId: 'player-123',
  timestamp: 1234567890,
  payload: { x: 10, y: 5, z: 10, blockType: 'stone' },
}
```

**Acceptance criteria:**
- [ ] All game mutations go through actions
- [ ] Actions can be serialized
- [ ] Invalid actions are rejected with reason
- [ ] Action history can be replayed

---

### 0.6 Save/Load System (Weeks 7-8)

#### 0.6.1 Save Format Design
**Goal:** Design save file format that's extensible and efficient

**Implementation tasks:**
- [ ] Design save file structure
- [ ] Choose serialization format (JSON, MessagePack, custom binary)
- [ ] Plan chunk data storage (inline vs separate files)
- [ ] Add version number for migrations
- [ ] Design metadata (save name, timestamp, preview)

**Save structure:**
```javascript
{
  version: 1,
  metadata: {
    name: "My World",
    created: "2026-02-03T...",
    lastPlayed: "2026-02-03T...",
    playTime: 3600, // seconds
    thumbnail: "base64...", // optional
  },
  world: {
    seed: 12345,
    time: 1000,
    weather: "clear",
  },
  player: {
    position: [x, y, z],
    rotation: [x, y, z, w],
    health: 100,
    inventory: [...],
    equipment: {...},
  },
  modifiedChunks: {
    "0,0": { blocks: [...] }, // Only modified chunks
    "1,0": { blocks: [...] },
  },
  entities: [...],
  settlement: {...},
}
```

**Acceptance criteria:**
- [ ] Format documented
- [ ] Version migration strategy defined
- [ ] Save file size reasonable (< 10MB for typical world)

**Output:** `docs/SAVE_FILE_FORMAT.md`

---

#### 0.6.2 SaveManager Implementation
**Goal:** Handle saving and loading game state

**Implementation tasks:**
- [ ] Create `src/systems/SaveManager.js`
- [ ] Implement save to localStorage (web)
- [ ] Implement save to file (Electron future)
- [ ] Implement load with validation
- [ ] Add auto-save functionality
- [ ] Handle save corruption gracefully
- [ ] Run serialization in Web Worker

**API:**
```javascript
class SaveManager {
  async save(slotId: string): Promise<void>
  async load(slotId: string): Promise<GameState>
  async listSaves(): Promise<SaveMetadata[]>
  async deleteSave(slotId: string): Promise<void>
  async exportSave(slotId: string): Promise<Blob>
  async importSave(file: File): Promise<string>
}
```

**Acceptance criteria:**
- [ ] Save completes without frame drops (worker)
- [ ] Load restores exact game state
- [ ] Corrupted saves don't crash game
- [ ] Auto-save triggers periodically
- [ ] Multiple save slots work

**Tests:**
- Save/load roundtrip preserves state
- Corrupted save handling
- Version migration

---

### 0.7 Player Controller (Weeks 8-9)

#### 0.7.1 Keyboard Movement
**Goal:** Add WASD keyboard controls for player movement

**Implementation tasks:**
- [ ] Create `src/systems/input/KeyboardController.js`
- [ ] Capture WASD for movement
- [ ] Capture Space for jump
- [ ] Capture Shift for sprint
- [ ] Convert key state to movement vector
- [ ] Integrate with physics (Rapier)
- [ ] Handle key repeat and release properly

**Key bindings:**
```javascript
const DEFAULT_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE'],
  inventory: ['KeyI', 'Tab'],
};
```

**Acceptance criteria:**
- [ ] WASD moves player smoothly
- [ ] Movement relative to camera direction
- [ ] Jump works with physics
- [ ] Sprint increases speed
- [ ] No stuck keys on focus loss

---

#### 0.7.2 Mouse Look
**Goal:** Mouse controls camera rotation

**Implementation tasks:**
- [ ] Capture mouse movement for camera rotation
- [ ] Implement pointer lock for FPS-style control
- [ ] Add sensitivity settings
- [ ] Clamp vertical rotation (no flipping)
- [ ] Handle pointer lock enter/exit

**Acceptance criteria:**
- [ ] Mouse rotates camera view
- [ ] Pointer lock activates on click
- [ ] ESC exits pointer lock
- [ ] Sensitivity is adjustable
- [ ] Vertical look has limits

---

#### 0.7.3 Block Interaction
**Goal:** Player can break and place blocks

**Implementation tasks:**
- [ ] Implement raycasting from camera
- [ ] Highlight targeted block
- [ ] Left click to break block
- [ ] Right click to place block
- [ ] Add block breaking progress (hold to break)
- [ ] Play break/place feedback

**Acceptance criteria:**
- [ ] Raycast correctly identifies target block
- [ ] Break removes block from chunk
- [ ] Place adds block to chunk
- [ ] Chunk mesh updates after modification
- [ ] Can't place block inside player

---

### 0.8 Basic Inventory (Weeks 9-10)

#### 0.8.1 Inventory Data Structure
**Goal:** Store and manage player items

**Implementation tasks:**
- [ ] Design item data structure
- [ ] Create inventory slots array
- [ ] Implement add/remove/move item functions
- [ ] Add stack combining for stackable items
- [ ] Integrate with game state

**Data structure:**
```javascript
// Item definition
{
  id: 'stone',
  name: 'Stone',
  maxStack: 64,
  category: 'block',
}

// Inventory slot
{
  itemId: 'stone',
  quantity: 32,
}

// Player inventory
{
  slots: Array(36), // 9x4 grid
  hotbar: [0, 1, 2, 3, 4, 5, 6, 7, 8], // indices into slots
  selectedSlot: 0,
}
```

**Acceptance criteria:**
- [ ] Items can be added to inventory
- [ ] Stacks combine correctly
- [ ] Inventory respects slot limits
- [ ] Hotbar selection works

---

#### 0.8.2 Inventory UI
**Goal:** Visual inventory screen

**Implementation tasks:**
- [ ] Create `src/components/ui/InventoryUI.jsx`
- [ ] Render inventory grid
- [ ] Show item icons and quantities
- [ ] Implement drag-and-drop (or click-to-move)
- [ ] Add item tooltips
- [ ] Toggle with I key

**Acceptance criteria:**
- [ ] Inventory opens/closes with I
- [ ] All slots display correctly
- [ ] Items can be moved between slots
- [ ] Tooltips show item info
- [ ] UI pauses game (or not, design decision)

---

### 0.9 Object Pooling (Week 10)

#### 0.9.1 Pool Manager
**Goal:** Reduce GC pressure by reusing objects

**Implementation tasks:**
- [ ] Create `src/systems/pools/PoolManager.js`
- [ ] Implement generic object pool
- [ ] Create pools for Vector3, Matrix4, Color
- [ ] Create pools for chunk mesh data
- [ ] Add pool statistics tracking
- [ ] Integrate pools into hot paths

**API:**
```javascript
class Pool<T> {
  acquire(): T
  release(obj: T): void
  prewarm(count: number): void
  clear(): void
  get stats(): { size, available, inUse }
}

// Usage
const vec3Pool = new Pool(() => new THREE.Vector3());
const v = vec3Pool.acquire();
// use v...
vec3Pool.release(v);
```

**Acceptance criteria:**
- [ ] Pools provide objects without allocation
- [ ] Released objects are reused
- [ ] GC pauses reduced in profiling
- [ ] No object leaks (everything released)

---

### 0.10 Integration & Polish (Weeks 11-12)

#### 0.10.1 System Integration
**Goal:** Ensure all systems work together

**Integration tasks:**
- [ ] ChunkManager + ChunkRenderer working
- [ ] Player controller + physics working
- [ ] Inventory + block placement working
- [ ] Save/Load preserves all state
- [ ] State architecture handles all operations

**Integration tests to write:**
- Player moves through world, chunks load/unload
- Player breaks block, chunk updates, state saves
- Load save, world state matches
- All systems initialize without errors

---

#### 0.10.2 Performance Validation
**Goal:** Ensure we meet performance targets

**Performance tasks:**
- [ ] Profile frame time during gameplay
- [ ] Profile memory usage over time
- [ ] Identify and fix any GC spikes
- [ ] Optimize hot paths if needed
- [ ] Document final performance numbers

**Targets:**
- 60 FPS sustained gameplay
- <16ms frame time average
- <1GB memory usage
- No GC pauses >33ms

---

#### 0.10.3 Bug Fixing & Stabilization
**Goal:** Fix issues found during integration

**Tasks:**
- [ ] Triage and prioritize bugs
- [ ] Fix critical/blocking issues
- [ ] Document known issues for Phase 1
- [ ] Clean up debug code
- [ ] Update documentation

---

## Exit Criteria

Phase 0 is **complete** when ALL of the following are true:

### Functional Requirements

- [ ] **Infinite world:** Player can walk in any direction and terrain generates
- [ ] **Chunk loading:** Chunks load within 2 chunks of player position
- [ ] **Chunk unloading:** Chunks unload beyond view distance, memory is freed
- [ ] **LOD rendering:** Distant chunks render at reduced detail
- [ ] **Block interaction:** Player can break and place blocks with mouse
- [ ] **Keyboard controls:** WASD movement, space jump, mouse look
- [ ] **Inventory:** Player has inventory, can access with I key
- [ ] **Save/Load:** Game can save and load with all state preserved
- [ ] **State architecture:** All mutations go through action system

### Performance Requirements

- [ ] **Frame rate:** 60 FPS on mid-range hardware (GTX 1060 equivalent)
- [ ] **Frame time:** Average <16ms, spikes <33ms
- [ ] **Memory:** <1GB total, <512MB GPU
- [ ] **Chunk load time:** <100ms per chunk
- [ ] **Save time:** <1s for typical world (in worker, non-blocking)
- [ ] **Load time:** <3s for typical world

### Code Quality Requirements

- [ ] **Test coverage:** >70% for new systems (ChunkManager, SaveManager, etc.)
- [ ] **No critical bugs:** Zero known crashes or data loss bugs
- [ ] **Documentation:** All new systems have JSDoc and README
- [ ] **Type safety:** No TypeScript errors (if using TS) or PropTypes warnings

### Architecture Requirements

- [ ] **Multiplayer-ready:** State architecture supports future networking
- [ ] **Worker integration:** Heavy work happens off main thread
- [ ] **Pooling active:** Object pools reduce GC pressure measurably

---

## Risk Areas

### High Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Chunk boundary visual artifacts | Medium | Careful mesh stitching, shared vertices |
| Memory leaks from chunk cycling | High | Strict dispose() calls, memory profiling |
| Worker communication overhead | Medium | Batch messages, use Transferables |
| State architecture too complex | High | Start simple, iterate |

### Medium Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance regression from old system | Medium | Profile before replacing VoxelTerrain |
| Save format needs changing later | Low | Version from start, migration support |
| LOD transitions look bad | Low | Tune distances, add cross-fade if needed |

---

## Dependencies

```
0.1 Research
    ↓
0.2 Chunk System Core ←──────────┐
    ↓                            │
0.3 LOD System                   │
    ↓                            │
0.4 Chunk Rendering Integration  │
                                 │
0.5 State Architecture ──────────┘
    ↓
0.6 Save/Load System

0.7 Player Controller (parallel with 0.4-0.6)
    ↓
0.8 Basic Inventory

0.9 Object Pooling (can happen anytime after 0.2)

0.10 Integration (after all above)
```

---

## Weekly Milestones

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1-2 | Research | Decision documents, prototypes |
| 3-4 | Chunk core | ChunkManager, Chunk, Worker |
| 5 | LOD | LOD generation and selection |
| 6 | Rendering | ChunkRenderer, replace VoxelTerrain |
| 7 | State | Refactored store, action system |
| 8 | Save/Load | SaveManager working |
| 9 | Controls | Keyboard, mouse, block interaction |
| 10 | Inventory | Data and UI |
| 11-12 | Integration | Polish, bugs, performance |

---

## Open Questions

Questions to answer during Phase 0:

1. **Chunk size:** 16³ or 32³ or 32×32×64? (Research will inform)
2. **Geometry approach:** Keep instancing or switch to merged geometry?
3. **Save storage:** localStorage only or IndexedDB for larger saves?
4. **Camera style:** First-person, third-person, or configurable?
5. **Block breaking:** Instant or timed (Minecraft-style)?

---

## Resources Needed

- **Hardware:** Mid-range test machine for performance validation
- **Time:** 8-12 weeks at ~20 hrs/week = 160-240 hours
- **External:** None required (all development work)

---

## Success Checklist

Before marking Phase 0 complete, verify:

```
□ Can walk infinitely in any direction
□ Chunks appear and disappear smoothly
□ Distant terrain is lower detail
□ Can break blocks with left click
□ Can place blocks with right click
□ WASD + mouse controls work
□ Inventory opens with I key
□ Game saves without frame drop
□ Game loads and matches saved state
□ 60 FPS during normal gameplay
□ Memory stays under 1GB
□ All tests pass
□ No known crashes
```

---

**Ready to start? Create a branch and begin with 0.1.1 Web Worker prototyping.**
