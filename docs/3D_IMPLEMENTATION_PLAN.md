# 3D Implementation Plan

**Created:** February 3, 2026
**Based on:** VISION.md and ROADMAP.md
**Target:** React Three Fiber / Three.js 3D Game
**Philosophy:** Making a fun game, not shipping a product

---

## Planning Approach

This plan provides high-level phase structure. **Each phase requires a detailed implementation plan and exit criteria document before starting.** We won't lock in specifics until we're ready to begin that phase—this keeps us flexible and lets the game evolve organically.

### For Each Phase, Before Starting:
1. Create `docs/phases/PHASE_X_DETAILED_PLAN.md`
2. Define specific tasks with acceptance criteria
3. Identify technical unknowns and research needs
4. Set exit criteria (what "done" looks like)
5. Review what we learned from previous phase

---

## Current State Assessment

### What Already Exists (3D-Ready)

#### 3D Rendering Components ✅
- `VoxelTerrain.jsx` - Instanced mesh terrain rendering
- `Player.jsx` - 3D player with physics
- `Enemy.jsx` - 3D enemy rendering
- `Experience.jsx` - Main 3D scene composition
- `Projectile.jsx`, `DamageNumber.jsx`, `LootDrop.jsx`, `XPOrb.jsx` - Combat visuals
- `ParticleEffect.jsx` - Visual effects
- `CameraRotateControls.jsx`, `TouchControls.jsx` - Input handling
- `WaveManager.jsx` - Enemy wave spawning

#### Game Systems (Reusable from 2D) ✅
- **AI Systems:** BehaviorTree, EnemyAI, NPCBehavior, CompanionAI, Pathfinding, Wildlife
- **Building:** BuilderBehavior, BuildingConfig, TierProgression
- **Combat:** DefenseCombatEngine, RaidEventManager, DungeonCombatEngine
- **Environment:** WorldGenerator, BiomeManager, ChunkManager, WeatherSystem, SeasonalSystem
- **Economy:** Crafting, Loot tables, Material systems
- **Persistence:** SaveSystem (needs 3D adaptation)
- **Events:** EventSystem with various world events
- **Character:** Full attribute/skill system with progression

#### State Management ✅
- Zustand store with player stats, inventory, equipment
- Monster/wildlife management
- Combat mechanics (damage, crits, projectiles)
- Character progression (XP, levels, skill points)

### What Needs Integration/Development

| System | Status | Work Needed |
|--------|--------|-------------|
| Chunk-based rendering | Not started | Critical for performance |
| LOD system | Not started | Critical for large worlds |
| Network architecture | Not started | Design from start for multiplayer |
| Procedural World Gen | Module exists | Integrate with VoxelTerrain |
| Save/Load | Module exists | Adapt for 3D + multiplayer state |
| NPC Settlers | AI exists | 3D rendering, task visuals |
| Portal System | Not started | Core feature |
| The Companion | AI exists | 3D model, teaching system |
| Magic System | Partial | Spell effects, learning system |
| Building Placement | Module exists | 3D placement UI |
| Audio | Not started | Music, SFX |
| Full UI | Partial (HUD) | Menus, inventory screens |
| 3D Assets | Not started | Models, animations (learning required) |

---

## Performance Strategy

### The Challenges We Face

React Three Fiber / Three.js on the web has real limitations we need to design around:

#### 1. Single-Threaded JavaScript
**Problem:** Heavy computation blocks rendering, causing stutters.

**Mitigation Strategy:**
- **Web Workers** for expensive operations:
  - Terrain generation runs in worker, sends results to main thread
  - Pathfinding calculations off main thread
  - Save/Load serialization in worker
- **Time-slicing:** Break large operations into chunks across frames
  - Generate 1 chunk per frame, not all at once
  - Process AI in batches (10 NPCs per frame, not 100)
- **RequestIdleCallback:** Use browser idle time for non-urgent work

#### 2. Garbage Collection Stutters
**Problem:** Creating/destroying objects triggers GC pauses.

**Mitigation Strategy:**
- **Object pooling:** Reuse objects instead of creating new ones
  - Pool for Vector3, Matrix4, Color objects
  - Pool for particles, projectiles, damage numbers
  - Pool for chunk mesh data
- **Avoid allocations in hot paths:**
  - Pre-allocate arrays for render loops
  - Reuse temporary calculation objects
  - Cache frequently accessed computations
- **Typed Arrays:** Use Float32Array, Int32Array for large data sets

#### 3. WebGL Memory Caps
**Problem:** Browsers limit GPU memory; large worlds exceed limits.

**Mitigation Strategy:**
- **Aggressive chunk unloading:** Only keep nearby chunks in GPU memory
- **Texture atlases:** Single texture for all block types
- **Geometry instancing:** Already using InstancedMesh (good!)
- **LOD (Level of Detail):** Distant chunks use simpler geometry
- **Memory budgeting:** Track GPU memory usage, enforce limits

#### 4. No Compute Shaders
**Problem:** Can't offload parallel computation to GPU like native engines.

**Mitigation Strategy:**
- **Accept the limitation:** Some effects won't be possible
- **Simpler alternatives:**
  - Baked lighting instead of real-time GI
  - Particle limits (hundreds, not thousands)
  - Simpler water/weather effects
- **WebGPU future:** Plan architecture to migrate when WebGPU is stable

### Performance Targets

| Metric | Target | How We'll Measure |
|--------|--------|-------------------|
| Frame rate | 60 FPS on mid-range hardware | Browser dev tools, stats.js |
| Frame time | <16ms average, <33ms spikes | Performance profiling |
| Memory | <1GB total, <512MB GPU | Browser task manager |
| Load time | <5s initial, <100ms per chunk | Performance timing API |

---

## Chunk Loading & LOD Strategy

### Chunk System Architecture

```
World
├── ChunkManager (coordinates loading/unloading)
│   ├── ActiveChunks (Map<chunkKey, Chunk>)
│   ├── LoadQueue (priority queue)
│   └── UnloadQueue (chunks marked for removal)
│
├── Chunk (32×32×64 voxels)
│   ├── VoxelData (Uint8Array - block types)
│   ├── HeightMap (optimization for surface)
│   ├── Mesh (Three.js InstancedMesh or merged geometry)
│   ├── LODLevel (0=full, 1=half, 2=quarter)
│   └── State (loading, ready, dirty, unloading)
│
└── ChunkWorker (Web Worker)
    ├── Terrain generation
    ├── Mesh building
    └── Lighting calculation
```

### Loading Strategy

1. **View Distance Rings:**
   - Ring 0 (0-2 chunks): Full detail, all features
   - Ring 1 (2-4 chunks): Full detail, reduced particles
   - Ring 2 (4-8 chunks): LOD level 1 (half resolution)
   - Ring 3 (8-12 chunks): LOD level 2 (quarter resolution)
   - Beyond Ring 3: Not loaded

2. **Priority Loading:**
   - Direction player is facing loads first
   - Chunks player is moving toward prioritized
   - Underground chunks only load when player is underground

3. **Background Loading:**
   - Generate terrain data in Web Worker
   - Build mesh geometry in Web Worker
   - Transfer to main thread via Transferable objects
   - Add to scene during requestIdleCallback

### LOD Implementation

**LOD Level 0 (Full):** Every voxel rendered
- Used for: Player's chunk + immediate neighbors
- Voxel size: 1×1×1

**LOD Level 1 (Half):** 2×2×2 voxel groups merged
- Used for: 2-4 chunks away
- 8× fewer instances
- Pick dominant block type for group

**LOD Level 2 (Quarter):** 4×4×4 voxel groups merged
- Used for: 4-8 chunks away
- 64× fewer instances
- Heightmap-only rendering (surface blocks)

**LOD Level 3 (Impostor):** Flat billboard or very low-poly
- Used for: 8+ chunks away
- Consider: Just render horizon silhouette

### Unloading Strategy

1. **Distance-based:** Chunks beyond view distance queued for unload
2. **Memory pressure:** If approaching memory limit, force unload furthest
3. **Graceful:** Fade out before removing, avoid pop-in
4. **State preservation:** Dirty chunks (player modified) saved before unload

---

## Multiplayer Architecture (Designed From Start)

### Why Design For Multiplayer Early

Adding multiplayer to a single-player game is notoriously difficult. By designing the architecture from the start, we:
- Avoid massive refactoring later
- Keep game state properly separated
- Build with authority/replication in mind
- Can test single-player as "multiplayer with one player"

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Game Instance                         │
├─────────────────────────────────────────────────────────┤
│  AuthoritativeState (source of truth)                   │
│  ├── World state (chunks, entities, time)               │
│  ├── Player states (all players)                        │
│  ├── NPC states                                         │
│  └── Settlement state                                   │
├─────────────────────────────────────────────────────────┤
│  NetworkLayer (abstracted)                              │
│  ├── Single-player: Direct state access                 │
│  ├── Host: State + broadcast to clients                 │
│  └── Client: Receive state, send inputs                 │
├─────────────────────────────────────────────────────────┤
│  LocalPrediction (client-side)                          │
│  ├── Predicted player movement                          │
│  ├── Predicted interactions                             │
│  └── Reconciliation with server state                   │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **State Authority:**
   - Single source of truth for all game state
   - In single-player: local state is authoritative
   - In multiplayer: host's state is authoritative

2. **Input-Based Networking:**
   - Clients send inputs, not state changes
   - Server validates and applies inputs
   - Prevents cheating, ensures consistency

3. **State Replication:**
   - Only replicate what's needed (relevancy)
   - Delta compression (send changes, not full state)
   - Priority system (player actions > distant NPC)

4. **Client Prediction:**
   - Predict own movement locally (feels responsive)
   - Reconcile when server state arrives
   - Roll back and replay if prediction was wrong

### Multiplayer Scope

- **Player count:** 2-4 players (co-op focused)
- **Topology:** Player-hosted (one player is host)
- **Networking:** WebRTC for peer-to-peer, WebSocket fallback
- **Session:** Drop-in/drop-out, host migration if host leaves

### Single-Player Mode

Single-player is just multiplayer with:
- Local player is both client and host
- No network latency simulation needed
- All state access is direct
- Same code paths, easier testing

---

## 3D Asset Creation

### The Challenge

Creating 3D voxel-style characters, creatures, and objects is a skill I need to develop or find help with.

### Options to Explore

1. **Learn It:**
   - MagicaVoxel (free, voxel-focused)
   - Blockbench (free, Minecraft-style)
   - Blender (free, powerful, steep learning curve)
   - Start simple: cube characters, basic animations

2. **Find Collaborators:**
   - Game dev communities (r/gamedev, itch.io forums)
   - Art-focused Discord servers
   - Commission specific pieces

3. **Asset Stores:**
   - Kenney.nl (free voxel assets)
   - itch.io game assets
   - OpenGameArt.org
   - Be careful with licensing

4. **Procedural Generation:**
   - Generate simple creatures from rules
   - Combine modular parts
   - Won't work for everything, but helps

### Asset Pipeline

Whatever the source, we need:
1. Model in voxel format or low-poly
2. Export to GLTF/GLB (Three.js standard)
3. Rig for animation (if animated)
4. Import into React Three Fiber
5. Optimize (texture atlas, LOD variants)

### Starting Point

Begin with placeholder cube characters. Gameplay first, pretty models later. A fun game with cube people is better than a pretty game that isn't fun.

---

## The Phases

### Phase 0: Foundation
**Estimated Duration:** 8-12 weeks
**Focus:** Core architecture that everything else builds on

#### Goals
- Chunk-based world rendering with LOD
- Multiplayer-ready state architecture
- Web Worker integration for performance
- Save/Load system
- Player controller with keyboard + mouse
- Basic inventory system
- Object pooling for GC mitigation

#### Key Deliverables
- Player walks through infinite procedurally generated terrain
- Chunks load/unload based on distance
- Distant terrain renders at lower detail
- Game state saves and loads
- Architecture supports future multiplayer

#### Technical Research Needed
- Web Worker communication patterns
- Three.js InstancedMesh pooling
- Zustand state architecture for multiplayer
- WebRTC/WebSocket library evaluation

*Detailed plan: Create `docs/phases/PHASE_0_DETAILED_PLAN.md` before starting*

---

### Phase 1: Survival & Gathering
**Estimated Duration:** 8-12 weeks
**Focus:** Core survival gameplay loop

#### Goals
- Hunger, health, stamina systems
- Day/night cycle with lighting
- Resource gathering (mining, chopping)
- Basic crafting system
- Simple threats (night monsters)
- Death and respawn

#### Key Deliverables
- Player can survive multiple in-game days
- Crafting tools makes gathering faster
- Night is dangerous, shelter matters
- Core loop is engaging

*Detailed plan: Create `docs/phases/PHASE_1_DETAILED_PLAN.md` before starting*

---

### Phase 2: NPCs & Settlement
**Estimated Duration:** 10-14 weeks
**Focus:** Colony building with autonomous NPCs

#### Goals
- NPC 3D models and rendering
- NPCs join settlement over time
- Personality and mood systems
- Autonomous work (mining, building, hauling)
- Building placement system
- Zone designation
- NPC needs (food, rest, shelter)

#### Key Deliverables
- Settlement grows organically with NPCs
- NPCs feel like individuals, not robots
- Player directs, NPCs execute
- Settlement management is satisfying

#### Asset Needs
- NPC character models (multiple variants)
- Building models (house, workshop, etc.)
- Animation sets (walk, work, idle)

*Detailed plan: Create `docs/phases/PHASE_2_DETAILED_PLAN.md` before starting*

---

### Phase 3: Combat & Portals
**Estimated Duration:** 10-14 weeks
**Focus:** Meaningful conflict and the core threat mechanic

#### Goals
- Enhanced combat (melee, ranged, dodge, block)
- Monster variety with unique behaviors
- Portal system (spawning, closing, reopening)
- Territory and corruption mechanics
- Defensive structures
- NPC guards and military
- Raid events

#### Key Deliverables
- Combat feels impactful and skill-based
- Portals are genuine threats
- Defense building is strategic
- Territory control matters

#### Asset Needs
- Monster models (5+ types)
- Weapon models
- Portal visual effects
- Defensive structure models

*Detailed plan: Create `docs/phases/PHASE_3_DETAILED_PLAN.md` before starting*

---

### Phase 4: The Companion & Magic
**Estimated Duration:** 10-14 weeks
**Focus:** The unique companion relationship and magic system

#### Goals
- Companion NPC with special AI
- Companion recovery arc (wounded → healthy)
- Dialogue system
- Magic learning from companion
- Spell casting with visual effects
- Lore and world mysteries
- Story content (optional engagement)

#### Key Deliverables
- Companion feels like a real character
- Magic is fun to use and learn
- Story adds depth without forcing engagement
- World feels mysterious and worth exploring

#### Asset Needs
- Companion character model (unique design)
- Spell visual effects
- Lore item models
- Dialogue UI

*Detailed plan: Create `docs/phases/PHASE_4_DETAILED_PLAN.md` before starting*

---

### Phase 5: Polish & Content
**Estimated Duration:** 12-16 weeks
**Focus:** Making everything feel good

#### Goals
- Audio (music, SFX, ambient)
- Visual polish (weather, particles, lighting)
- Quest system
- More content (biomes, monsters, items)
- Tutorial and onboarding
- Accessibility options
- Performance optimization pass

#### Key Deliverables
- Game feels polished and complete
- Audio enhances atmosphere
- Plenty of content to explore
- Runs well on target hardware

*Detailed plan: Create `docs/phases/PHASE_5_DETAILED_PLAN.md` before starting*

---

### Phase 6: Multiplayer Implementation
**Estimated Duration:** 12-16 weeks
**Focus:** Activating the multiplayer architecture

#### Goals
- Network layer implementation
- Player synchronization
- Shared settlement mechanics
- Permission system
- Host migration
- Chat and communication
- Testing across network conditions

#### Key Deliverables
- 2-4 players can play together
- Feels responsive despite latency
- Shared settlement works cooperatively
- Drop-in/drop-out is seamless

*Detailed plan: Create `docs/phases/PHASE_6_DETAILED_PLAN.md` before starting*

---

### Phase 7: Release & Beyond
**Estimated Duration:** Ongoing
**Focus:** Sharing the game and continuing development

#### Goals
- Platform builds (web, desktop)
- Store presence (itch.io, Steam)
- Community building
- Bug fixing and updates
- New content based on feedback
- Mod support (maybe)

*Detailed plan: Create as we approach this phase*

---

## Total Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 0: Foundation | 8-12 weeks | 8-12 weeks |
| 1: Survival | 8-12 weeks | 16-24 weeks |
| 2: NPCs | 10-14 weeks | 26-38 weeks |
| 3: Combat | 10-14 weeks | 36-52 weeks |
| 4: Companion | 10-14 weeks | 46-66 weeks |
| 5: Polish | 12-16 weeks | 58-82 weeks |
| 6: Multiplayer | 12-16 weeks | 70-98 weeks |
| 7: Release | Ongoing | — |

**Realistic total: 1.5 - 2 years**

This is a hobby project made for fun. These timelines are loose guides, not deadlines. Some phases might go faster if we're in the zone; some might take longer if life happens. That's fine.

---

## Module Integration Map

```
Existing Modules → 3D Integration Point
─────────────────────────────────────────
WorldGenerator    → ChunkManager → VoxelTerrain chunks
BiomeManager      → Terrain coloring, prop placement
ChunkManager      → New 3D ChunkManager wrapper
SaveSystem        → NetworkState serialization
NPCBehaviorSystem → NPC.jsx (new component)
CompanionAISystem → Companion.jsx (new component)
EnemyAISystem     → Enemy.jsx enhancement
DefenseCombatEngine → Combat system
RaidEventManager  → Wave spawning, multiplayer sync
MaterialCrafting  → CraftingUI.jsx (new)
BuildingConfig    → BuildingPlacer.jsx (new)
EventSystem       → World events, replicated to clients
WeatherSystem     → Visual effects, network synced
```

---

## Automated Testing Strategy

### Testing Philosophy

Tests serve two purposes:
1. **Catch regressions** - Don't break what works
2. **Enable refactoring** - Change code confidently

We're not chasing 100% coverage. We test what matters: game systems, state management, and critical paths. Visual rendering is harder to test automatically—we'll rely on manual playtesting for that.

### Test Categories

#### 1. Unit Tests (Jest)
**What:** Individual functions and classes in isolation
**When:** Run on every commit, must pass to merge
**Coverage Target:** 70%+ for game systems modules

**What to test:**
- Pure functions (damage calculation, pathfinding algorithms)
- State reducers and actions
- Data transformations
- Utility functions

**What NOT to test:**
- React component rendering (use integration tests)
- Third-party library internals
- Simple getters/setters

```
src/
├── modules/
│   ├── ai/__tests__/           ✅ Unit tests
│   ├── combat/__tests__/       ✅ Unit tests
│   ├── crafting/__tests__/     ✅ Unit tests
│   └── ...
```

#### 2. Integration Tests (Jest + React Testing Library)
**What:** Multiple modules working together
**When:** Run on every commit
**Focus:** State flows, system interactions

**Key integration tests:**
- Player takes damage → health updates → UI reflects change
- NPC receives task → pathfinding runs → task completes
- Save game → reload → state matches
- Chunk loads → terrain generates → mesh builds

```javascript
// Example: Combat integration test
test('player attack damages enemy and triggers loot on death', () => {
  const gameState = createTestGameState();
  const enemy = spawnEnemy(gameState, { health: 10 });

  playerAttack(gameState, enemy, { damage: 15 });

  expect(enemy.health).toBe(0);
  expect(enemy.isDead).toBe(true);
  expect(gameState.lootDrops).toHaveLength(1);
});
```

#### 3. Component Tests (React Testing Library)
**What:** React components render correctly and respond to interactions
**When:** Run on every commit
**Focus:** UI behavior, not visual appearance

**What to test:**
- Components render without crashing
- User interactions trigger expected callbacks
- State changes reflect in UI
- Loading/error states display correctly

**Mocking strategy for 3D:**
- Mock `@react-three/fiber` Canvas
- Mock `@react-three/rapier` physics
- Test component logic, not Three.js internals

```javascript
// Example: Inventory component test
test('clicking item shows tooltip', () => {
  render(<InventoryUI items={mockItems} />);

  fireEvent.click(screen.getByText('Iron Sword'));

  expect(screen.getByRole('tooltip')).toHaveTextContent('Damage: 10');
});
```

#### 4. State Management Tests (Zustand)
**What:** Store actions produce correct state changes
**When:** Run on every commit
**Focus:** All state mutations are intentional and correct

```javascript
// Example: Game store test
test('takeDamage reduces health and triggers death at zero', () => {
  const store = createGameStore({ health: 15, maxHealth: 100 });

  store.getState().takeDamage(20);

  expect(store.getState().health).toBe(0);
  expect(store.getState().isDead).toBe(true);
});
```

#### 5. Performance Tests
**What:** Automated benchmarks for critical operations
**When:** Run weekly or before releases
**Focus:** Catch performance regressions

**Benchmarks to track:**
- Chunk generation time (target: <50ms)
- Pathfinding for 100 NPCs (target: <16ms total)
- State serialization for save (target: <100ms)
- Frame time with 50 enemies (target: <16ms)

```javascript
// Example: Performance benchmark
describe('ChunkGenerator performance', () => {
  test('generates chunk within time budget', () => {
    const start = performance.now();

    generateChunk({ x: 0, z: 0 });

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50); // 50ms budget
  });
});
```

#### 6. Snapshot Tests (Limited Use)
**What:** Detect unexpected changes in serialized output
**When:** Run on commit
**Use sparingly:** Only for stable data structures

**Good candidates:**
- Save file format
- Network message format
- Configuration schemas

**Bad candidates:**
- UI components (too brittle)
- Generated terrain (intentionally random)

#### 7. Multiplayer Tests
**What:** Network synchronization and state consistency
**When:** Run on multiplayer-related changes
**Focus:** State stays consistent across simulated clients

**Test scenarios:**
- Two clients see same world state
- Input from client A affects client B's view
- Disconnection/reconnection preserves state
- Conflicting actions resolve consistently

```javascript
// Example: Multiplayer sync test
test('block placement syncs to all clients', async () => {
  const [host, client1, client2] = createTestSession(3);

  host.placeBlock({ x: 10, y: 5, z: 10, type: 'stone' });
  await waitForSync();

  expect(client1.getBlock(10, 5, 10)).toBe('stone');
  expect(client2.getBlock(10, 5, 10)).toBe('stone');
});
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm run lint

  performance:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:perf
      - name: Compare to baseline
        run: npm run perf:compare
```

### Test Scripts in package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern='__tests__/.*\\.test\\.'",
    "test:integration": "jest --testPathPattern='integration'",
    "test:perf": "jest --testPathPattern='perf' --runInBand",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "perf:compare": "node scripts/compare-perf-baseline.js"
  }
}
```

### Test Coverage Targets by Phase

| Phase | Module | Target | Notes |
|-------|--------|--------|-------|
| 0 | ChunkManager | 80% | Critical for everything |
| 0 | State/Store | 80% | Foundation for multiplayer |
| 0 | SaveSystem | 90% | Data loss is unacceptable |
| 1 | Survival systems | 70% | Hunger, health, stamina |
| 1 | Crafting | 70% | Recipe system |
| 2 | NPC AI | 70% | Behavior trees, task system |
| 2 | Building | 70% | Placement, construction |
| 3 | Combat | 80% | Damage, abilities |
| 3 | Portal system | 70% | Spawning, closing |
| 4 | Dialogue | 60% | Less critical |
| 4 | Magic | 70% | Spell effects |
| 6 | Networking | 90% | Must be reliable |

### What We DON'T Automate

Some things are better tested by playing:

- **Visual quality** - Does it look good? (Manual)
- **Fun factor** - Is it enjoyable? (Playtesting)
- **Game feel** - Does combat feel impactful? (Playtesting)
- **Performance perception** - Does it feel smooth? (Manual profiling)
- **Edge cases in 3D** - Physics glitches, camera issues (Manual)

### Test Data and Fixtures

Maintain a set of test fixtures:

```
src/__fixtures__/
├── gameStates/
│   ├── newGame.json         # Fresh start
│   ├── midGame.json         # Settlement with NPCs
│   └── lateGame.json        # Full features unlocked
├── chunks/
│   ├── flatTerrain.json     # Simple test terrain
│   └── complexTerrain.json  # Mountains, caves
├── npcs/
│   └── testNPCs.json        # Various personality types
└── items/
    └── testItems.json       # All item types
```

### Running Tests Locally

```bash
# Run all tests
npm test

# Run specific test file
npm test -- ChunkManager.test.js

# Run tests matching pattern
npm test -- --grep "chunk loading"

# Run with coverage
npm test -- --coverage

# Watch mode during development
npm test -- --watch

# Run performance benchmarks
npm run test:perf
```

### When to Write Tests

1. **Before fixing a bug:** Write a test that fails, then fix
2. **When adding game systems:** Test the logic, not the rendering
3. **When touching state management:** Verify state transitions
4. **When changing save format:** Ensure backwards compatibility
5. **When optimizing:** Benchmark before and after

### Mocking Strategy for 3D Components

Three.js and React Three Fiber are hard to test. Our approach:

```javascript
// src/__mocks__/@react-three/fiber.js
export const Canvas = ({ children }) => <div data-testid="canvas">{children}</div>;
export const useFrame = jest.fn();
export const useThree = () => ({
  camera: { position: { set: jest.fn() } },
  scene: {},
  gl: {}
});

// src/__mocks__/@react-three/rapier.js
export const RigidBody = ({ children }) => <div>{children}</div>;
export const useRapier = () => ({ world: {} });

// src/__mocks__/three.js
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  // ... other methods as needed
}
```

This lets us test component logic without WebGL context.

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WebGL performance limits hit | High | Medium | Aggressive LOD, chunk limits, profiling early |
| Multiplayer complexity explodes | High | Medium | Simple scope (2-4 co-op), design early |
| Asset creation bottleneck | Medium | High | Start simple, placeholder art, learn tools |
| Scope creep | Medium | High | Phase gates, "fun first" focus |
| Burnout | High | Medium | It's for fun—take breaks, no deadlines |
| Browser compatibility issues | Medium | Low | Test across browsers early |
| Three.js breaking changes | Low | Low | Pin versions, test upgrades |

---

## Success Criteria

Not shipping metrics. Not sales numbers. This is for fun.

**The game is successful when:**
- Playing it makes me smile
- I want to show it to friends
- Building a settlement feels satisfying
- Combat feels impactful
- The companion feels like a character I care about
- NPCs feel like individuals
- The world feels alive and worth exploring
- Playing with friends is better than playing alone

---

## Next Steps

1. **Create Phase 0 detailed plan** (`docs/phases/PHASE_0_DETAILED_PLAN.md`)
2. **Research Web Worker patterns** for terrain generation
3. **Prototype chunk loading** in isolation
4. **Design state architecture** for multiplayer readiness
5. **Experiment with MagicaVoxel** for asset creation

---

## References

- [Game Vision](../documentation/archive-code/2d-prototype/docs/VISION.md)
- [Development Roadmap](../documentation/archive-code/2d-prototype/docs/ROADMAP.md)
- [NPC Building System](../documentation/archive-code/2d-prototype/docs/NPC_BUILDING_SYSTEM.md)

---

**Remember: We're making this for fun. If it stops being fun, step back and figure out why.**
