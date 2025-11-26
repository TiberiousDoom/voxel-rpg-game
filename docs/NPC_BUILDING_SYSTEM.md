# NPC Voxel Building System

A comprehensive system for NPC-driven mining, hauling, construction, and building in the voxel RPG game.

## Overview

The NPC Building System enables autonomous NPCs to perform complex building tasks including mining terrain, hauling resources, managing stockpiles, and constructing structures. The system is designed with a modular architecture that integrates seamlessly with the existing game engine.

## Table of Contents

- [Completed Phases (1-27)](#completed-phases-1-27)
- [Architecture](#architecture)
- [Module Reference](#module-reference)
- [Usage Examples](#usage-examples)
- [Future Development](#future-development)

---

## Completed Phases (1-27)

### Foundation Phases (1-4)

#### Phase 1: VoxelWorld Core
**File:** `src/modules/voxel/VoxelWorld.js`

Core voxel world representation with:
- 3D chunk-based storage system
- Block type management
- Position-to-chunk mapping
- Block get/set operations
- World bounds handling

#### Phase 2: Block Type Registry
**File:** `src/modules/voxel/BlockTypeRegistry.js`

Extensible block type system:
- Block property definitions (hardness, transparency, etc.)
- Resource drop configurations
- Visual properties (colors, textures)
- Mining requirements per block type

#### Phase 3: Chunk Management
**File:** `src/modules/voxel/ChunkManager.js`

Efficient chunk loading/unloading:
- Chunk generation and caching
- Dirty chunk tracking for saves
- Memory-efficient storage
- Chunk serialization/deserialization

#### Phase 4: Block Modification Events
**File:** `src/modules/voxel/BlockEvents.js`

Event system for block changes:
- Block placed/removed events
- Multi-block update batching
- Event listeners for systems integration
- Undo/redo support preparation

### Stockpile System (Phase 5)

**Files:**
- `src/modules/stockpile/Stockpile.js`
- `src/modules/stockpile/StockpileManager.js`

Resource storage and management:
- Configurable storage zones
- Resource type filtering
- Slot-based capacity management
- Priority-based storage selection

### Construction System (Phases 6-7)

#### Phase 6: Blueprint System
**Files:**
- `src/modules/building/Blueprint.js`
- `src/modules/building/BlueprintLibrary.js`

Building template system:
- Multi-block structure definitions
- Material requirements
- Rotation support
- Category organization

#### Phase 7: Construction Sites
**Files:**
- `src/modules/construction/ConstructionSite.js`
- `src/modules/construction/ConstructionManager.js`

Building placement and progress:
- Ghost block visualization
- Material delivery tracking
- Block-by-block construction progress
- Site validation and completion

### Task Management (Phase 8)

**File:** `src/modules/jobs/JobSystem.js`

Work assignment system:
- Task queue management
- NPC assignment logic
- Task priority handling
- Completion callbacks

### Module Integration (Phase 9)

**File:** `src/modules/voxel-building/VoxelBuildingOrchestrator.js`

Central coordinator:
- Subsystem initialization
- Cross-module communication
- Update loop management
- Public API exposure

### Resource Gathering (Phases 10-11)

#### Phase 10: Mining Task Management
**File:** `src/modules/gathering/MiningTask.js`

Individual mining operations:
- Block hardness calculations
- Mining progress tracking
- Tool efficiency modifiers
- Resource yield determination

#### Phase 11: Gathering Manager
**File:** `src/modules/gathering/GatheringManager.js`

Mining orchestration:
- Mining designation handling
- Task availability queries
- NPC assignment for mining
- Region-based designations

### Hauling System (Phases 12-13)

#### Phase 12: Hauling Tasks
**File:** `src/modules/hauling/HaulingTask.js`

Resource transport operations:
- Pickup and delivery coordination
- Inventory capacity handling
- Path-based travel time

#### Phase 13: Hauling Manager
**File:** `src/modules/hauling/HaulingManager.js`

Hauling orchestration:
- Resource drop detection
- Stockpile destination selection
- Task prioritization
- Construction delivery support

### Advanced Construction (Phases 14-15)

#### Phase 14: Multi-Block Structures
Enhanced blueprint capabilities:
- Complex structure support
- Foundation requirements
- Support validation

#### Phase 15: Construction Progress
**File:** `src/modules/construction/BuildingProgress.js`

Detailed build tracking:
- Per-block status tracking
- Material consumption
- Worker assignment
- Completion percentage

### Hauling Integration (Phases 16-17)

#### Phase 16: Construction Delivery
Integration between hauling and construction:
- Material requirement queries
- Delivery task generation
- Priority-based delivery

#### Phase 17: Resource Flow Optimization
End-to-end resource pipeline:
- Mining to stockpile flow
- Stockpile to construction flow
- Automatic task chaining

### NPC AI Integration (Phase 18)

**Files:**
- `src/modules/voxel-building/VoxelWorkerBehavior.js`
- `src/modules/voxel-building/VoxelIdleTasks.js`

NPC work state machine:
- States: IDLE, SEEKING_TASK, TRAVELING, MINING, HAULING, BUILDING
- Task selection logic
- Integration with idle task system
- Autonomous decision making

### Rendering System (Phase 19)

**Files:**
- `src/rendering/useVoxelRenderer.js`
- `src/hooks/useVoxelRenderingLayer.js`

Visual representation:
- Z-level slicing view
- Mining designation overlays
- Ghost block rendering
- Worker status indicators
- Selection highlighting

### Player Interaction (Phase 20)

**File:** `src/hooks/useVoxelInput.js`

Input handling:
- Mouse click-drag selection
- Keyboard shortcuts (M=mine, B=build, S=stockpile)
- Z-level navigation (PageUp/Down, period/comma)
- Right-click to cancel
- Shift+wheel for quick Z-level change

### Resource Economy (Phase 21)

**File:** `src/modules/voxel-building/ResourceBridge.js`

Economy integration:
- Block-to-item mapping
- Resource deposit to inventory
- Construction material withdrawal
- Blueprint material validation

### Advanced Construction (Phase 22)

**File:** `src/modules/voxel-building/StructuralValidator.js`

Structural integrity:
- Foundation checking
- Support type classification
- Collision detection
- Placement validation

### Performance Optimization (Phase 23)

**File:** `src/modules/voxel-building/SpatialIndex.js`

Spatial queries:
- Grid-based entity indexing
- Fast position lookups
- Region queries
- Efficient updates

### Visual Effects (Phase 24)

**File:** `src/effects/VoxelEffects.js`

Particle system:
- Mining debris particles
- Block placement effects
- Construction progress effects
- Dust and sparkle particles

### Quality of Life (Phase 25)

**File:** `src/modules/voxel-building/WorkAreaManager.js`

Work prioritization:
- Priority zones (PAUSED, LOW, NORMAL, HIGH, URGENT)
- Work area types (MINING, CONSTRUCTION, HAULING)
- NPC assignment limits
- Area enable/disable

### Advanced Mining (Phase 26)

**File:** `src/modules/voxel-building/MiningPatterns.js`

Mining features:
- Pattern types: SINGLE, SHAFT, TUNNEL, STAIRCASE, ROOM, STRIP_MINE, QUARRY
- Cave-in mechanics
- Structural support checking
- Auto-dig pattern execution

### Tutorial System (Phase 27)

**File:** `src/modules/voxel-building/BuildingTutorial.js`

Onboarding:
- Step-by-step tutorials
- Interactive guidance
- Contextual tooltips
- Progress tracking

---

## Architecture

```
VoxelBuildingOrchestrator
├── VoxelWorld
│   ├── ChunkManager
│   ├── BlockTypeRegistry
│   └── BlockEvents
├── StockpileManager
│   └── Stockpile[]
├── ConstructionManager
│   ├── BlueprintLibrary
│   └── ConstructionSite[]
├── GatheringManager
│   └── MiningTask[]
├── HaulingManager
│   └── HaulingTask[]
├── VoxelWorkerBehavior
│   └── Worker states & tasks
└── Supporting Systems
    ├── SpatialIndex
    ├── ResourceBridge
    ├── StructuralValidator
    ├── WorkAreaManager
    ├── MiningPatterns
    └── BuildingTutorial
```

---

## Module Reference

### VoxelBuildingOrchestrator

Main entry point for the building system.

```javascript
import { VoxelBuildingOrchestrator } from './modules/voxel-building';

const voxelBuilding = new VoxelBuildingOrchestrator();
voxelBuilding.initialize({
  npcManager: myNpcManager,
  pathfindingService: myPathfinder
});

// Game loop
voxelBuilding.update(deltaTime);
```

### Key Methods

| Method | Description |
|--------|-------------|
| `designateMining(x, y, z)` | Designate single block for mining |
| `designateMiningRegion(min, max)` | Designate area for mining |
| `createStockpile(bounds)` | Create new stockpile zone |
| `startConstruction(blueprintId, position)` | Start building at position |
| `registerVoxelWorker(npcId)` | Register NPC as builder |
| `getAvailableVoxelTask(npc)` | Get work for idle NPC |

---

## Usage Examples

### Basic Mining Setup

```javascript
// Designate a 5x5x3 mining area
voxelBuilding.designateMiningRegion(
  { x: 10, y: 10, z: 0 },
  { x: 14, y: 14, z: 2 }
);

// Register workers
voxelBuilding.registerVoxelWorker('npc-1');
voxelBuilding.registerVoxelWorker('npc-2');
```

### Creating Stockpiles

```javascript
// Stone stockpile
voxelBuilding.createStockpile({
  x: 20, y: 20, z: 0,
  width: 4, depth: 4,
  allowedResources: ['stone', 'cobblestone']
});

// General stockpile
voxelBuilding.createStockpile({
  x: 25, y: 20, z: 0,
  width: 6, depth: 6
});
```

### Building Construction

```javascript
// Start construction from blueprint
voxelBuilding.startConstruction('small_house', { x: 30, y: 30, z: 0 });

// Check construction progress
const sites = voxelBuilding.constructionManager.getActiveSites();
sites.forEach(site => {
  console.log(`${site.name}: ${site.getProgress() * 100}% complete`);
});
```

### Work Priority Management

```javascript
import { WorkAreaManager, WorkPriority, WorkAreaType } from './modules/voxel-building/WorkAreaManager';

const workAreaManager = new WorkAreaManager();

// Create urgent mining zone
workAreaManager.createArea({
  name: 'Priority Mine',
  type: WorkAreaType.MINING,
  bounds: { x: 10, y: 10, z: 0, width: 10, depth: 10, height: 5 },
  priority: WorkPriority.URGENT
});
```

---

## Future Development

### Planned Features

1. **Multi-floor Buildings**
   - Staircase and ramp construction
   - Floor-to-floor connections
   - Elevator/lift systems

2. **Furniture & Decoration**
   - Interior object placement
   - Room designation system
   - Comfort/quality ratings

3. **Defensive Structures**
   - Walls and gates
   - Guard posts
   - Trap placement

4. **Workshop Integration**
   - Workstation blocks
   - Crafting area designation
   - Tool storage

5. **Water & Fluid Systems**
   - Water source blocks
   - Fluid flow simulation
   - Irrigation systems

6. **Electrical/Mechanical**
   - Power generation
   - Wire/pipe routing
   - Machine automation

7. **Save/Load Optimization**
   - Compressed chunk storage
   - Incremental saves
   - Cloud save support

8. **Multiplayer Support**
   - Synchronized building
   - Shared task queues
   - Permission system

### Performance Targets

- Support 100+ active workers
- Handle 1000+ simultaneous tasks
- Maintain 60fps with full visual effects
- Sub-second saves for large worlds

---

## File Structure

```
src/
├── modules/
│   ├── voxel/
│   │   ├── VoxelWorld.js
│   │   ├── BlockTypeRegistry.js
│   │   ├── ChunkManager.js
│   │   ├── BlockEvents.js
│   │   └── index.js
│   ├── stockpile/
│   │   ├── Stockpile.js
│   │   ├── StockpileManager.js
│   │   └── index.js
│   ├── construction/
│   │   ├── ConstructionSite.js
│   │   ├── ConstructionManager.js
│   │   ├── BuildingProgress.js
│   │   └── index.js
│   ├── building/
│   │   ├── Blueprint.js
│   │   ├── BlueprintLibrary.js
│   │   └── index.js
│   ├── hauling/
│   │   ├── HaulingTask.js
│   │   ├── HaulingManager.js
│   │   └── index.js
│   ├── gathering/
│   │   ├── MiningTask.js
│   │   ├── GatheringManager.js
│   │   └── index.js
│   ├── jobs/
│   │   ├── JobSystem.js
│   │   └── index.js
│   └── voxel-building/
│       ├── VoxelBuildingOrchestrator.js
│       ├── TerrainToVoxelConverter.js
│       ├── VoxelWorkerBehavior.js
│       ├── VoxelIdleTasks.js
│       ├── ResourceBridge.js
│       ├── StructuralValidator.js
│       ├── SpatialIndex.js
│       ├── WorkAreaManager.js
│       ├── MiningPatterns.js
│       ├── BuildingTutorial.js
│       └── index.js
├── hooks/
│   ├── useVoxelRenderingLayer.js
│   └── useVoxelInput.js
├── rendering/
│   └── useVoxelRenderer.js
└── effects/
    └── VoxelEffects.js
```

---

## Testing

Run the voxel building tests:

```bash
npm test -- --testPathPattern="voxel-building|gathering"
```

All 56 tests passing as of Phase 27 completion.

---

## Credits

NPC Building System implemented as part of the Voxel RPG Game project.
