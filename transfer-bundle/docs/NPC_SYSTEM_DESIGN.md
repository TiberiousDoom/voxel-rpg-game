# NPC Building System Design

**Last Updated:** November 2025
**Status:** Design Reference
**Purpose:** Architecture and design patterns for the NPC-driven building system

---

## Overview

The NPC Building System enables autonomous NPCs to perform complex building tasks including mining terrain, hauling resources, managing stockpiles, and constructing structures. This document describes the design patterns and architecture—adapt implementation to your chosen engine.

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
│Voxel  │ │Mining  │ │Hauling │ │Stock-  │ │Constr- │
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
- `DesignateMining(position)` - Mark blocks for mining
- `CreateStockpile(bounds)` - Create storage zone
- `StartConstruction(blueprint, position)` - Begin building
- `RegisterWorker(npcId)` - Add NPC to workforce

### Voxel World

Manages the 3D block grid:
- Chunk-based storage for large worlds
- Block type registry with properties
- Block modification events
- Serialization for save/load

**Block Properties:**
```
BlockType:
  - id: string
  - hardness: float (mining time multiplier)
  - drops: ResourceType[] (what you get when mined)
  - transparent: bool
  - solid: bool (collision)
```

---

## NPC Worker Behavior

### State Machine

NPCs use a state machine for voxel work:

```
┌─────────┐
│  IDLE   │◄────────────────────────────────┐
└────┬────┘                                 │
     │ task available                       │
     ▼                                      │
┌──────────────┐                           │
│ SEEKING_TASK │                           │
└──────┬───────┘                           │
       │ task found                        │
       ▼                                   │
┌───────────────────┐                      │
│ TRAVELING_TO_TASK │                      │
└─────────┬─────────┘                      │
          │ arrived                        │
          ▼                                │
    ┌─────┴─────┐                          │
    │           │                          │
    ▼           ▼                          │
┌───────┐ ┌──────────┐ ┌──────────┐       │
│MINING │ │ HAULING  │ │ BUILDING │       │
└───┬───┘ └────┬─────┘ └────┬─────┘       │
    │          │            │              │
    └──────────┴────────────┴──────────────┘
                task complete
```

### Worker States

| State | Description |
|-------|-------------|
| IDLE | No task, waiting for work |
| SEEKING_TASK | Looking for available task |
| TRAVELING_TO_TASK | Moving to task location |
| MINING | Extracting block |
| HAULING_PICKUP | Picking up resource |
| HAULING_DELIVERY | Delivering to stockpile/site |
| BUILDING | Placing block at construction site |

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
  distance = Distance(npc.position, task.position)
  priority = task.priority

  // Lower distance = better, higher priority = better
  return (priority * 100) - distance
```

---

## Task Management

### Task Types

| Type | Description |
|------|-------------|
| MINE | Extract a block at position |
| HAUL | Move resource from A to B |
| BUILD | Place block at construction site |
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
  - position: Vector3
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
  - bounds: rectangular area (x, y, z, width, depth)
  - allowedResources: ResourceType[] (filter)
  - slots: Slot[]
  - capacity: int (total slots)

Slot:
  - position: Vector3 (within stockpile)
  - resource: ResourceType or null
  - amount: int
  - reserved: bool (claimed for pickup/delivery)
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
  - blocks: BlockPlacement[]
  - requirements: {ResourceType: amount}
  - buildOrder: BlockPlacement[] (sorted for structural integrity)

BlockPlacement:
  - offset: Vector3 (relative to blueprint origin)
  - blockType: BlockType
  - rotation: int (0-3)
```

### Construction Site

```
ConstructionSite:
  - id: unique identifier
  - blueprint: Blueprint
  - position: Vector3 (world position)
  - status: SiteStatus
  - blockStatuses: Map<offset, BlockStatus>
  - deliveredMaterials: Map<ResourceType, amount>

SiteStatus: PLANNED | IN_PROGRESS | PAUSED | COMPLETED | CANCELLED

BlockStatus: PENDING | MATERIALS_DELIVERED | IN_PROGRESS | COMPLETED
```

### Construction Flow

1. **Place Blueprint** - Create construction site at position
2. **Validate Placement** - Check terrain, collisions
3. **Generate Delivery Tasks** - For each required material
4. **Haulers Deliver Materials** - From stockpiles to site
5. **Generate Build Tasks** - For each block (in order)
6. **Builders Place Blocks** - Following build order
7. **Complete** - Site becomes actual structure

### Build Order

Blocks must be built in structural order:
1. Foundation (bottom layer, supported by ground)
2. Walls (supported by foundation or lower walls)
3. Floors (supported by walls)
4. Roof (supported by walls/floors)

---

## Mining System

### Mining Designation

Players designate blocks for mining:
- Single block designation
- Region selection (drag to select area)
- Mining patterns (shaft, tunnel, room)

### Mining Task

```
MiningTask:
  - position: Vector3
  - blockType: BlockType
  - hardness: float
  - progress: float (0 to 1)
  - drops: ResourceDrop[]
```

### Mining Flow

1. **Designate** - Player marks blocks for mining
2. **Create Tasks** - Mining tasks generated
3. **NPC Claims** - Worker takes task
4. **Travel** - NPC moves to block
5. **Mine** - Progress based on tool + block hardness
6. **Drop Resources** - Spawn drops at location
7. **Create Haul Tasks** - For dropped resources

### Mining Patterns

Pre-defined mining shapes:
- **Single** - One block
- **Shaft** - 2x2 vertical
- **Tunnel** - 3x2 horizontal
- **Staircase** - Descending stairs
- **Room** - Configurable rectangular space
- **Quarry** - Layer-by-layer open pit

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

### Spatial Indexing

Use spatial data structure for fast queries:
- Grid-based index for entity lookups
- Query by position or region
- Update index when entities move

```
SpatialIndex:
  - cellSize: int (e.g., 16 blocks)
  - cells: Map<cellKey, Set<entityId>>

  QueryNear(position, radius) → Entity[]
  QueryRegion(min, max) → Entity[]
```

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

### Chunk-Based Processing

Only process active chunks:
- Load/unload based on player position
- Pause tasks in unloaded chunks
- Resume when chunk loads

---

## Integration Points

### With Pathfinding

NPCs need paths to tasks:
- Request path to task position
- Handle path failures gracefully
- Recalculate on world changes

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
5. **Structural Integrity** - Buildings can collapse

### Optimization Opportunities

1. **Job System** - Parallel task processing
2. **LOD for Workers** - Simplified behavior when distant
3. **Predictive Loading** - Pre-load chunks along paths
4. **Task Caching** - Avoid recalculating task scores

---

## Summary

The NPC Building System creates autonomous workers through:

1. **Clear task abstraction** - All work is discrete, claimable tasks
2. **State machine behavior** - Predictable NPC actions
3. **Priority-based selection** - Smart task choice
4. **Event-driven coordination** - Loose coupling between systems
5. **Spatial optimization** - Efficient queries for large worlds

The system should feel like NPCs are helpful partners, not tools requiring constant direction.

---

**Document Purpose:** Design reference for implementation
**Adapt For:** Unity, Godot, or other engine
