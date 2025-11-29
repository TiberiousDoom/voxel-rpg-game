# NPC Building System Design (2D)

**Last Updated:** November 2025
**Status:** Design Reference
**Purpose:** Architecture and design patterns for the NPC-driven building system in 2D

---

## Overview

The NPC Building System enables autonomous NPCs to perform complex building tasks including mining terrain, hauling resources, managing stockpiles, and constructing structures. This document describes the design patterns and architecture for 2D tile-based games—adapt implementation to your chosen engine.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Systems](#core-systems)
3. [NPC Worker Behavior](#npc-worker-behavior)
4. [Task Management](#task-management)
5. [Stockpile System](#stockpile-system)
6. [Construction System](#construction-system)
7. [Mining System](#mining-system)
8. [Hauling System](#hauling-system)
9. [Performance Considerations](#performance-considerations)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              Building Orchestrator                  │
│       Central coordinator for all subsystems        │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────┼──────────┬──────────┬──────────┐
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌───────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Tile   │ │Mining  │ │Hauling │ │Stock-  │ │Constr- │
│World  │ │Manager │ │Manager │ │pile    │ │uction  │
│       │ │        │ │        │ │Manager │ │Manager │
└───────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

### Design Principles

1. **Modular Systems** - Each system operates independently but coordinates through the orchestrator
2. **Task-Based** - All work is represented as discrete tasks that NPCs can claim
3. **Event-Driven** - Systems communicate through events, reducing coupling
4. **Autonomous NPCs** - NPCs find and execute tasks without micromanagement

---

## Core Systems

### Building Orchestrator

Central coordinator that:
- Initializes and manages all subsystems
- Routes events between systems
- Provides public API for game code
- Runs update loop for all systems

**Key Responsibilities:**
- `Initialize()` - Set up all subsystems
- `Update(deltaTime)` - Tick all systems
- `DesignateMining(position)` - Mark tiles for mining
- `CreateStockpile(bounds)` - Create storage zone
- `StartConstruction(blueprint, position)` - Begin building
- `RegisterWorker(npcId)` - Add NPC to workforce

### Tile World (2D)

Manages the 2D tile grid:
- Region-based storage for large worlds
- Tile type registry with properties
- Tile modification events
- Multi-layer support (ground, objects, walls)
- Serialization for save/load

**Tile Properties:**
```
TileType:
  - id: string
  - hardness: float (mining time multiplier)
  - drops: ResourceType[] (what you get when mined)
  - walkable: bool (can NPCs walk on this?)
  - layer: TileLayer (ground, object, wall, etc.)
  - autotileGroup: string (for visual connections)
```

**Tile Layers:**
```
Layers (bottom to top):
├── Background  - Decorative, no collision
├── Ground      - Terrain, floors
├── Objects     - Furniture, resources, items
├── Walls       - Structures, barriers
└── Foreground  - Visual overlays
```

---

## NPC Worker Behavior

### State Machine

NPCs use a state machine for tile-based work:

```
┌─────────┐
│  IDLE   │◄────────────────────────────────────┐
└────┬────┘                                     │
     │ task available                           │
     ▼                                          │
┌──────────────┐                               │
│ SEEKING_TASK │                               │
└──────┬───────┘                               │
       │ task found                            │
       ▼                                       │
┌───────────────────┐                          │
│ TRAVELING_TO_TASK │                          │
└─────────┬─────────┘                          │
          │ arrived                            │
          ▼                                    │
    ┌─────┴─────┐                              │
    │           │                              │
    ▼           ▼                              │
┌───────┐ ┌──────────┐ ┌──────────┐           │
│MINING │ │ HAULING  │ │ BUILDING │           │
└───┬───┘ └────┬─────┘ └────┬─────┘           │
    │          │            │                  │
    └──────────┴────────────┴──────────────────┘
                task complete
```

### Worker States

| State | Description |
|-------|-------------|
| IDLE | No task, waiting for work |
| SEEKING_TASK | Looking for available task |
| TRAVELING_TO_TASK | Moving to task location |
| MINING | Extracting tile |
| HAULING_PICKUP | Picking up resource |
| HAULING_DELIVERY | Delivering to stockpile/site |
| BUILDING | Placing tile at construction site |

### Task Selection Logic

NPCs choose tasks based on:
1. **Distance** - Prefer closer tasks
2. **Priority** - Respect work area priorities
3. **Capability** - Only take tasks they can do
4. **Availability** - Task not claimed by another NPC

```
FindBestTask(npc):
  availableTasks = GetUnclaimedTasks()
  scoredTasks = []

  for task in availableTasks:
    if not npc.CanDo(task): continue

    score = CalculateScore(npc, task)
    scoredTasks.Add((task, score))

  return scoredTasks.SortByScore().First()

CalculateScore(npc, task):
  distance = ManhattanDistance(npc.position, task.position)
  priority = task.priority

  // Lower distance = better, higher priority = better
  return (priority * 100) - distance
```

---

## Task Management

### Task Types

| Type | Description |
|------|-------------|
| MINE | Extract a tile at position |
| HAUL | Move resource from A to B |
| BUILD | Place tile at construction site |
| DELIVER | Bring materials to construction site |

### Task Lifecycle

```
PENDING → CLAIMED → IN_PROGRESS → COMPLETED
                 ↘ CANCELLED
                 ↘ FAILED
```

### Task Structure

```
Task:
  - id: unique identifier
  - type: TaskType
  - position: Vector2Int (tile coordinates)
  - priority: int (1-5)
  - status: TaskStatus
  - assignedNpc: NpcId or null
  - createdAt: timestamp
  - data: type-specific data
```

### Task Queue

- Tasks stored in priority queue
- NPCs query for available tasks
- Claiming prevents double-assignment
- Timeout releases uncompleted claims

---

## Stockpile System

### Stockpile Structure

```
Stockpile:
  - id: unique identifier
  - bounds: rectangular area (x, y, width, height)
  - allowedResources: ResourceType[] (filter)
  - slots: Slot[]
  - capacity: int (total slots)

Slot:
  - position: Vector2Int (within stockpile)
  - resource: ResourceType or null
  - amount: int
  - reserved: bool (claimed for pickup/delivery)
```

### Visual Representation

```
Stockpile Example (5x3):
┌───────────────────────┐
│ [S] [S] [S] [S] [S]   │
│ [S] [S] [S] [S] [S]   │
│ [S] [S] [S] [S] [S]   │
└───────────────────────┘
[S] = Slot (can hold one resource stack)
```

### Stockpile Operations

**Deposit:**
1. Find stockpile accepting resource type
2. Find empty or matching slot
3. Reserve slot
4. NPC delivers resource
5. Update slot, release reservation

**Withdraw:**
1. Find stockpile with resource
2. Reserve slot with resource
3. NPC picks up resource
4. Clear slot, release reservation

### Stockpile Manager

Coordinates all stockpiles:
- `FindNearestDeposit(position, resourceType)` - Where to put resource
- `FindNearestWithdraw(position, resourceType)` - Where to get resource
- `ReserveSlot(stockpileId, slotIndex)` - Claim for operation
- `ReleaseReservation(stockpileId, slotIndex)` - Release claim

---

## Construction System

### Blueprint Structure

```
Blueprint:
  - id: unique identifier
  - name: display name
  - tiles: TilePlacement[]
  - requirements: {ResourceType: amount}
  - buildOrder: TilePlacement[] (sorted for structural integrity)

TilePlacement:
  - offset: Vector2Int (relative to blueprint origin)
  - tileType: TileType
  - layer: TileLayer
```

### Blueprint Example

```
Simple House Blueprint (7x5):
┌─────────────────────────────┐
│   [W][W][R][R][R][W][W]     │  W = Wall, R = Roof
│   [W][.][.][.][.][.][W]     │  . = Floor
│   [W][.][.][.][.][.][W]     │  D = Door
│   [W][.][.][.][.][.][W]     │
│   [W][W][W][D][W][W][W]     │
└─────────────────────────────┘
```

### Construction Site

```
ConstructionSite:
  - id: unique identifier
  - blueprint: Blueprint
  - position: Vector2Int (world position)
  - status: SiteStatus
  - tileStatuses: Map<offset, TileStatus>
  - deliveredMaterials: Map<ResourceType, amount>

SiteStatus: PLANNED | IN_PROGRESS | PAUSED | COMPLETED | CANCELLED

TileStatus: PENDING | MATERIALS_DELIVERED | IN_PROGRESS | COMPLETED
```

### Construction Flow

1. **Place Blueprint** - Create construction site at position
2. **Validate Placement** - Check terrain, collisions
3. **Generate Delivery Tasks** - For each required material
4. **Haulers Deliver Materials** - From stockpiles to site
5. **Generate Build Tasks** - For each tile (in order)
6. **Builders Place Tiles** - Following build order
7. **Complete** - Site becomes actual structure

### Build Order (2D)

Tiles must be built in logical order:
1. **Foundation/Floor** - Base layer first
2. **Walls** - Exterior and interior walls
3. **Furniture/Objects** - Interior items
4. **Roof** (if applicable) - Top layer last

---

## Mining System

### Mining Designation

Players designate tiles for mining:
- Single tile designation
- Region selection (drag to select area)
- Mining patterns (corridor, room, shaft)

### Mining Task

```
MiningTask:
  - position: Vector2Int
  - tileType: TileType
  - hardness: float
  - progress: float (0 to 1)
  - drops: ResourceDrop[]
```

### Mining Flow

1. **Designate** - Player marks tiles for mining
2. **Create Tasks** - Mining tasks generated
3. **NPC Claims** - Worker takes task
4. **Travel** - NPC moves to tile (adjacent position)
5. **Mine** - Progress based on tool + tile hardness
6. **Drop Resources** - Spawn drops at location
7. **Create Haul Tasks** - For dropped resources

### Mining Patterns (2D)

Pre-defined mining shapes:
- **Single** - One tile
- **Corridor** - 1-3 tiles wide horizontal/vertical
- **Room** - Rectangular area
- **Stairs** - Diagonal pattern (for side-view games)
- **Strip Mine** - Parallel corridors

```
Mining Pattern Examples:

Corridor (1x10):        Room (5x5):           Strip Mine:
[X][X][X][X][X]...      [X][X][X][X][X]       [X][.][.][X][.][.]
                        [X][X][X][X][X]       [X][.][.][X][.][.]
                        [X][X][X][X][X]       [X][.][.][X][.][.]
                        [X][X][X][X][X]       [X][.][.][X][.][.]
                        [X][X][X][X][X]
```

---

## Hauling System

### Haul Task

```
HaulTask:
  - source: {position, stockpileId?, slotIndex?}
  - destination: {position, stockpileId?, constructionSiteId?}
  - resourceType: ResourceType
  - amount: int
  - status: HaulStatus

HaulStatus: PENDING | TRAVELING_TO_PICKUP | PICKING_UP |
            TRAVELING_TO_DELIVERY | DELIVERING | COMPLETED
```

### Hauling Flow

1. **Task Created** - From mining drops or construction needs
2. **NPC Claims** - Hauler takes task
3. **Travel to Source** - Move to pickup location
4. **Pick Up** - Add to NPC inventory
5. **Travel to Destination** - Move to delivery location
6. **Deliver** - Remove from inventory, add to stockpile/site

### Priority

Hauling priorities:
1. **Construction materials** - Keep builders working
2. **Perishables** - Food before it spoils
3. **Valuable resources** - Ore, rare materials
4. **General** - Everything else

---

## Performance Considerations

### Spatial Indexing (2D Grid)

Use spatial data structure for fast queries:
- Grid-based index for entity lookups
- Query by position or region
- Update index when entities move

```
SpatialIndex2D:
  - cellSize: int (e.g., 16 tiles)
  - cells: Map<Vector2Int, Set<entityId>>

  QueryNear(position, radius) → Entity[]
  QueryRegion(min, max) → Entity[]
  GetEntitiesInCell(cellPos) → Entity[]
```

### 2D-Specific Optimizations

**Tilemap Batching:**
- Group tile renders by layer
- Use texture atlases for tiles
- Only redraw changed regions

**Pathfinding:**
- A* with grid heuristic (Manhattan distance)
- Cache paths for common routes
- Use jump point search for large open areas
- Consider flow fields for many NPCs

**Collision:**
- Simple AABB for tile collision
- Spatial hash for entity-entity collision
- Skip collision for non-solid tiles

### Task Batching

Don't update every task every frame:
- Spread updates across frames
- Priority-based update frequency
- Skip distant/inactive tasks

### Object Pooling

Reuse frequently created objects:
- Task objects
- Pathfinding requests
- Visual indicators
- Particle effects

### Region-Based Processing

Only process active regions:
- Load/unload based on player position
- Pause tasks in unloaded regions
- Resume when region loads

```
Region System:
┌─────┬─────┬─────┬─────┐
│     │     │ [P] │     │  P = Player
├─────┼─────┼─────┼─────┤
│     │ [A] │ [A] │ [A] │  A = Active (loaded)
├─────┼─────┼─────┼─────┤
│     │ [A] │ [A] │ [A] │
├─────┼─────┼─────┼─────┤
│     │     │     │     │
└─────┴─────┴─────┴─────┘
```

---

## Integration Points

### With Pathfinding

NPCs need paths to tasks:
- Request path to task position (or adjacent tile)
- Handle path failures gracefully
- Recalculate on world changes
- Cache frequent paths

**2D Pathfinding Options:**
- A* (standard grid pathfinding)
- Jump Point Search (faster for uniform grids)
- Hierarchical pathfinding (for large worlds)
- Flow fields (for many NPCs to same destination)

### With Inventory

NPCs carry resources:
- Check capacity before hauling
- Update inventory on pickup/delivery
- Handle full inventory

### With Combat

Workers respond to threats:
- Flee when attacked
- Drop tasks temporarily
- Resume when safe

### With Save/Load

Persist system state:
- All task queues
- Stockpile contents
- Construction site progress
- NPC assignments

---

## Future Enhancements

### Planned Features

1. **Work Areas** - Priority zones for focused work
2. **Scheduling** - Work shifts, rest periods
3. **Skill System** - NPCs improve at tasks
4. **Tool Requirements** - Better tools = faster work
5. **Blueprint Rotation** - Place buildings in different orientations

### Optimization Opportunities

1. **Job System** - Parallel task processing
2. **LOD for Workers** - Simplified behavior when off-screen
3. **Predictive Loading** - Pre-load regions along paths
4. **Task Caching** - Avoid recalculating task scores

---

## 2D-Specific Considerations

### Top-Down vs Side-View

**Top-Down:**
- All tiles visible from above
- Simpler layering (ground → objects → roofs)
- 4 or 8 directional movement
- Easier construction visualization

**Side-View (Platformer-style):**
- Gravity affects entities and items
- Building has structural concerns
- Ladder/rope mechanics for vertical movement
- Can see cross-sections of buildings

### Tile Adjacency

For autotiling and construction:
```
Neighbors (4-connected):     Neighbors (8-connected):
      [N]                    [NW][N][NE]
   [W][X][E]                 [W ][X][E ]
      [S]                    [SW][S][SE]
```

### Visual Depth (Top-Down)

Create depth in top-down 2D:
- Y-sorting for entities and objects
- Shadow layers
- Overlay tiles for roofs
- Transparency for walls when player behind

---

## Summary

The NPC Building System creates autonomous workers through:

1. **Clear task abstraction** - All work is discrete, claimable tasks
2. **State machine behavior** - Predictable NPC actions
3. **Priority-based selection** - Smart task choice
4. **Event-driven coordination** - Loose coupling between systems
5. **Grid optimization** - Efficient queries for 2D tile worlds

The system should feel like NPCs are helpful partners, not tools requiring constant direction.

---

**Document Purpose:** Design reference for 2D implementation
**Adapt For:** Unity 2D, Godot, or other 2D engine
