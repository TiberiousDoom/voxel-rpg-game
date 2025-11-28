# 2D Game Implementation Plan

**Last Updated:** November 2025
**Status:** Active
**Purpose:** Comprehensive technical implementation plan for the 2D RPG survival base-building game

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Technical Architecture](#technical-architecture)
4. [Phase 0: Foundation](#phase-0-foundation)
5. [Phase 1: Playable Prototype](#phase-1-playable-prototype)
6. [Phase 2: Colony Alpha](#phase-2-colony-alpha)
7. [Phase 3: Combat & Threats](#phase-3-combat--threats)
8. [Phase 4: The Companion](#phase-4-the-companion)
9. [Phase 5: Content & Polish](#phase-5-content--polish)
10. [Phase 6: Multiplayer](#phase-6-multiplayer)
11. [Phase 7: Launch Preparation](#phase-7-launch-preparation)
12. [Cross-Cutting Concerns](#cross-cutting-concerns)
13. [Testing Strategy](#testing-strategy)
14. [Risk Mitigation](#risk-mitigation)
15. [Success Criteria](#success-criteria)

---

## Executive Summary

### Vision
> *Rise from ruin. Build something worth protecting. You're not alone.*

This document provides a detailed technical implementation plan for a 2D RPG survival base-building game where players rebuild civilization with the help of autonomous NPCs in a world torn by divine conflict.

### Core Experience
- **Primary Feeling:** Satisfaction through achievement
- **Gameplay Focus:** Building, growing settlements, reclaiming territory
- **Unique Selling Point:** Autonomous NPCs that feel like companions, not tools

### Technology Decision

| Option | Recommendation | Rationale |
|--------|---------------|-----------|
| **Unity 2D** | ★★★★★ Primary | Mature ecosystem, excellent 2D support, broad platform reach |
| **Godot 4** | ★★★★☆ Alternative | Free/open source, native 2D, growing community |

### Timeline Summary

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 0 | 2-3 months | Technical foundation |
| Phase 1 | 2-3 months | Playable survival demo |
| Phase 2 | 2-3 months | Colony management demo |
| Phase 3 | 2-3 months | Combat and defense demo |
| Phase 4 | 2-3 months | Story and magic demo |
| Phase 5 | 3-4 months | Feature-complete single-player |
| Phase 6 | 2-3 months | Multiplayer beta |
| Phase 7 | 2-3 months | Launch-ready 1.0 |

**Total: 17-24 months**

---

## Project Overview

### Core Pillars (Priority Order)

1. **Build** - Transform wilderness into fortified village, tile by tile
2. **Grow** - Attract NPCs with personalities who live and work alongside you
3. **Reclaim** - Close portals, clear monsters, take back the world
4. **Choose** - Engage story when you want; sandbox is always there
5. **Connect** - Play solo or build together with friends

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| NPCs feel helpful, never a chore | Autonomous task finding, smart defaults |
| Player is participant, not just manager | Direct gameplay alongside delegation |
| Progression feels earned | Meaningful achievements gate advancement |
| World feels alive | NPCs have schedules, weather affects gameplay |
| Complexity is discoverable | Start simple, reveal depth over time |

### Reference Games

| Game | What We Learn |
|------|---------------|
| **Terraria** | 2D exploration, progression, boss battles |
| **Rimworld** | Autonomous colonist behavior, simulation depth |
| **Stardew Valley** | Charm, NPC relationships, accessibility |
| **Dwarf Fortress** | NPC autonomy, emergent behavior |

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Game Application                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Render    │  │    Input    │  │    Audio    │             │
│  │   System    │  │   System    │  │   System    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                      │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │                 Game Engine                     │              │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │              │
│  │  │ Entity  │ │  Event  │ │  State  │          │              │
│  │  │ Manager │ │   Bus   │ │ Manager │          │              │
│  │  └─────────┘ └─────────┘ └─────────┘          │              │
│  └──────────────────┬────────────────────────────┘              │
│                     │                                            │
│  ┌──────────────────┴────────────────────────────┐              │
│  │              Game Systems Layer                │              │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │              │
│  │  │  NPC   │ │Building│ │ Combat │ │  Quest │ │              │
│  │  │ System │ │ System │ │ System │ │ System │ │              │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ │              │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │              │
│  │  │Resource│ │ Portal │ │ Magic  │ │Companion│ │              │
│  │  │ System │ │ System │ │ System │ │ System │ │              │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ │              │
│  └──────────────────┬────────────────────────────┘              │
│                     │                                            │
│  ┌──────────────────┴────────────────────────────┐              │
│  │                World Layer                     │              │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐         │              │
│  │  │ Tilemap │ │ Region  │ │Pathfind │         │              │
│  │  │ Manager │ │ Manager │ │  Grid   │         │              │
│  │  └─────────┘ └─────────┘ └─────────┘         │              │
│  └───────────────────────────────────────────────┘              │
│                                                                  │
│  ┌───────────────────────────────────────────────┐              │
│  │              Data Layer                        │              │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐         │              │
│  │  │  Save   │ │  Config │ │  Asset  │         │              │
│  │  │ Manager │ │ Manager │ │ Manager │         │              │
│  │  └─────────┘ └─────────┘ └─────────┘         │              │
│  └───────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Tilemap Architecture

```
Tile Layers (bottom to top):
┌─────────────────────────────────────┐
│  Layer 5: Foreground (overlays)     │  ← Roofs, weather effects
├─────────────────────────────────────┤
│  Layer 4: Entities (NPCs, monsters) │  ← Y-sorted sprites
├─────────────────────────────────────┤
│  Layer 3: Objects (furniture)       │  ← Interactable items
├─────────────────────────────────────┤
│  Layer 2: Walls (structures)        │  ← Building walls, barriers
├─────────────────────────────────────┤
│  Layer 1: Ground (floors, paths)    │  ← Walkable surfaces
├─────────────────────────────────────┤
│  Layer 0: Background (terrain)      │  ← Grass, dirt, water
└─────────────────────────────────────┘
```

### Data Structures

#### Tile Definition
```
TileType:
  id: string                    # Unique identifier
  name: string                  # Display name
  layer: int                    # Which layer (0-5)
  walkable: bool                # Can entities walk here?
  hardness: float               # Mining time multiplier (0 = instant)
  transparent: bool             # Does light pass through?
  drops: ResourceDrop[]         # What drops when mined
  autotileGroup: string         # For visual connections
  buildRequirements: Resource[] # Materials needed to place
```

#### Entity Definition
```
Entity:
  id: string                    # Unique identifier
  type: EntityType              # NPC, Monster, Player, Item
  position: Vector2             # World position
  velocity: Vector2             # Current movement
  facing: Direction             # N, S, E, W
  state: StateMachine           # Current behavior state
  components: Component[]       # ECS-style components
```

#### NPC Definition
```
NPC extends Entity:
  name: string                  # Generated name
  personality: PersonalityTraits
  skills: SkillLevels
  needs: NeedLevels             # Hunger, rest, happiness
  currentTask: Task             # What they're doing
  inventory: Inventory
  relationships: Map<NPC, int>  # Social connections
  schedule: DailySchedule       # Work/rest times
```

### Event System

```
Core Events:
├── World Events
│   ├── TilePlaced(position, tileType)
│   ├── TileRemoved(position)
│   ├── RegionLoaded(regionId)
│   └── RegionUnloaded(regionId)
├── Entity Events
│   ├── EntitySpawned(entity)
│   ├── EntityDespawned(entity)
│   ├── EntityMoved(entity, from, to)
│   └── EntityDamaged(entity, amount, source)
├── NPC Events
│   ├── TaskStarted(npc, task)
│   ├── TaskCompleted(npc, task)
│   ├── NeedCritical(npc, needType)
│   └── RelationshipChanged(npc1, npc2, delta)
├── Building Events
│   ├── ConstructionStarted(site)
│   ├── ConstructionProgress(site, percent)
│   ├── ConstructionCompleted(site)
│   └── BuildingDestroyed(building)
├── Combat Events
│   ├── CombatStarted(entities)
│   ├── AttackPerformed(attacker, target, damage)
│   ├── EntityKilled(entity, killer)
│   └── CombatEnded(result)
└── Portal Events
    ├── PortalDiscovered(portal)
    ├── PortalActivated(portal)
    ├── PortalClosed(portal)
    └── TerritoryReclaimed(region)
```

---

## Phase 0: Foundation

**Duration:** 2-3 months
**Goal:** Establish core engine systems

### 0.1 Project Setup

#### Tasks
| Task | Description | Priority |
|------|-------------|----------|
| Project structure | Create folder hierarchy, configure build | Critical |
| Version control | Git setup, branching strategy, CI/CD | Critical |
| Engine configuration | Unity/Godot project settings | Critical |
| Asset pipeline | Import settings for sprites, audio | High |
| Code standards | Linting, formatting, documentation | High |

#### Folder Structure
```
project/
├── Assets/                     # Unity: All assets
│   ├── Sprites/
│   │   ├── Tiles/
│   │   ├── NPCs/
│   │   ├── Monsters/
│   │   ├── Buildings/
│   │   ├── Items/
│   │   └── UI/
│   ├── Audio/
│   │   ├── Music/
│   │   ├── SFX/
│   │   └── Ambient/
│   ├── Prefabs/
│   ├── Scenes/
│   ├── Scripts/
│   │   ├── Core/              # Engine systems
│   │   ├── World/             # Tilemap, regions
│   │   ├── Entities/          # Player, NPCs, monsters
│   │   ├── Systems/           # Game systems
│   │   ├── UI/                # User interface
│   │   └── Data/              # ScriptableObjects
│   ├── Data/
│   │   ├── Tiles/
│   │   ├── Items/
│   │   ├── Recipes/
│   │   └── NPCs/
│   └── Resources/             # Runtime-loaded assets
├── Packages/                   # Package dependencies
├── ProjectSettings/            # Engine settings
└── Documentation/
```

### 0.2 Tilemap System

#### Core Components

**TilemapManager**
```
Responsibilities:
- Manage multiple tile layers
- Handle tile placement/removal
- Coordinate with autotiling
- Emit tile change events

Methods:
- SetTile(position, layer, tileType)
- GetTile(position, layer) → TileType
- RemoveTile(position, layer)
- GetTilesInRegion(bounds) → Tile[]
- IsWalkable(position) → bool
```

**AutotileSystem**
```
Responsibilities:
- Calculate tile variants based on neighbors
- Update adjacent tiles when tile changes
- Support multiple autotile patterns

Patterns Supported:
- 4-bit (16 variants) - Simple walls
- 8-bit (47 variants) - Terrain transitions
- Custom rules for special tiles
```

**RegionManager**
```
Responsibilities:
- Load/unload world regions
- Stream regions based on player position
- Manage region boundaries
- Handle cross-region entities

Region Size: 64x64 tiles (configurable)
Load Distance: 2 regions in each direction
Unload Distance: 3 regions in each direction
```

#### Implementation Steps

1. **Week 1-2: Basic Tilemap**
   - [ ] Create TilemapManager class
   - [ ] Implement SetTile/GetTile operations
   - [ ] Create tile layer rendering
   - [ ] Add tile type registry
   - [ ] Test: Place and remove tiles

2. **Week 3-4: Autotiling**
   - [ ] Implement 4-bit autotiling for walls
   - [ ] Implement 8-bit autotiling for terrain
   - [ ] Create tile variant atlases
   - [ ] Add neighbor update propagation
   - [ ] Test: Terrain blends correctly

3. **Week 5-6: Region System**
   - [ ] Create RegionManager class
   - [ ] Implement region loading/unloading
   - [ ] Add region serialization
   - [ ] Handle cross-region queries
   - [ ] Test: Walk across region boundaries

### 0.3 Player Controller

#### Components

**PlayerController**
```
Responsibilities:
- Handle input for movement
- Manage player state machine
- Coordinate with animation system
- Handle tile interactions

States:
- Idle
- Walking
- Running
- Interacting
- InMenu
- Combat
```

**PlayerCamera**
```
Responsibilities:
- Follow player smoothly
- Handle camera bounds
- Support zoom levels
- Shake effects for impacts

Settings:
- Follow Speed: 5.0
- Deadzone: 0.5 units
- Min Zoom: 0.5x
- Max Zoom: 2.0x
```

#### Implementation Steps

1. **Week 1: Movement**
   - [ ] Create PlayerController class
   - [ ] Implement 8-directional movement
   - [ ] Add collision detection with tiles
   - [ ] Create player state machine
   - [ ] Test: Player moves and collides

2. **Week 2: Camera & Polish**
   - [ ] Implement smooth camera follow
   - [ ] Add camera bounds clamping
   - [ ] Create zoom functionality
   - [ ] Add movement animations
   - [ ] Test: Camera feels responsive

### 0.4 Save/Load System

#### Architecture

```
SaveSystem:
├── SaveManager
│   ├── CreateSave(slot) → SaveData
│   ├── LoadSave(slot) → GameState
│   ├── DeleteSave(slot)
│   └── GetSaveSlots() → SaveSlot[]
├── Serializers
│   ├── WorldSerializer
│   ├── EntitySerializer
│   ├── PlayerSerializer
│   └── SystemSerializer
└── Migration
    ├── VersionDetector
    └── MigrationPipeline
```

**Save Data Structure**
```
SaveData:
  version: string               # Save format version
  timestamp: DateTime
  playtime: TimeSpan
  world:
    seed: int
    regions: RegionData[]
    modifiedTiles: TileChange[]
  player:
    position: Vector2
    health: float
    inventory: Item[]
    skills: SkillData
  npcs: NPCData[]
  buildings: BuildingData[]
  quests: QuestProgress[]
  settings: GameSettings
```

#### Implementation Steps

1. **Week 1: Core Save System**
   - [ ] Create SaveManager class
   - [ ] Implement JSON serialization
   - [ ] Create save slot management
   - [ ] Add autosave functionality
   - [ ] Test: Save and load basic data

2. **Week 2: Full Serialization**
   - [ ] Serialize world state
   - [ ] Serialize entity positions
   - [ ] Serialize inventory/progress
   - [ ] Add version migrations
   - [ ] Test: Full game state persists

### 0.5 Input System

#### Input Mapping

```
Default Bindings:
├── Movement
│   ├── Move: WASD / Arrow Keys / Left Stick
│   └── Sprint: Shift / Left Trigger
├── Actions
│   ├── Interact: E / A Button
│   ├── Attack: Left Click / Right Trigger
│   ├── Secondary: Right Click / Left Bumper
│   └── Cancel: Escape / B Button
├── UI
│   ├── Inventory: I / Start
│   ├── Build Menu: B / Select
│   ├── Pause: Escape / Start
│   └── Quick Slots: 1-9 / D-Pad
└── Camera
    ├── Zoom In: Scroll Up / Right Bumper
    └── Zoom Out: Scroll Down / Left Bumper
```

#### Implementation Steps

1. **Week 1: Input System**
   - [ ] Create InputManager class
   - [ ] Implement keyboard input
   - [ ] Add mouse input
   - [ ] Create input rebinding UI
   - [ ] Test: All inputs work

2. **Week 2: Controller Support**
   - [ ] Add gamepad input
   - [ ] Implement input switching
   - [ ] Add input icons (KB/Controller)
   - [ ] Test: Seamless input switching

### 0.6 UI Framework

#### Core UI Components

```
UI System:
├── UIManager
│   ├── ShowPanel(panelType)
│   ├── HidePanel(panelType)
│   ├── PushModal(modal)
│   └── PopModal()
├── Panels
│   ├── HUDPanel (always visible)
│   ├── InventoryPanel
│   ├── BuildPanel
│   ├── NPCPanel
│   ├── SettingsPanel
│   └── PausePanel
└── Common Components
    ├── Button
    ├── Tooltip
    ├── ProgressBar
    ├── ItemSlot
    └── TabContainer
```

#### Implementation Steps

1. **Week 1: Core UI**
   - [ ] Create UIManager class
   - [ ] Implement panel system
   - [ ] Create common UI components
   - [ ] Add tooltip system
   - [ ] Test: Panels open/close

2. **Week 2: HUD**
   - [ ] Create health/hunger bars
   - [ ] Add quick action slots
   - [ ] Create minimap frame
   - [ ] Add resource counters
   - [ ] Test: HUD displays correctly

### Phase 0 Exit Criteria

- [ ] Player can move through tile-based world
- [ ] Tiles can be placed and removed
- [ ] Camera follows player smoothly
- [ ] Game state saves and loads correctly
- [ ] Basic UI framework functional
- [ ] Input works for keyboard and controller

---

## Phase 1: Playable Prototype

**Duration:** 2-3 months
**Goal:** Create core survival gameplay loop
**Milestone:** "Proof of Concept" demo

### 1.1 World Generation

#### Procedural Generation System

```
WorldGenerator:
├── NoiseGenerator
│   ├── Perlin noise for terrain height
│   ├── Simplex noise for moisture
│   └── Voronoi for biome regions
├── BiomeMapper
│   ├── DetermineBiome(height, moisture)
│   └── ApplyBiomeRules(region)
├── FeaturePlacer
│   ├── PlaceTrees(density, biome)
│   ├── PlaceOres(rarity, depth)
│   ├── PlaceWater(heightThreshold)
│   └── PlaceStructures(frequency)
└── SpawnPointSelector
    └── FindSafeSpawn(criteria)
```

#### Biome Definitions

| Biome | Height | Moisture | Features |
|-------|--------|----------|----------|
| Ocean | < 0.3 | Any | Water, fish, coral |
| Beach | 0.3-0.35 | Any | Sand, shells, driftwood |
| Plains | 0.35-0.6 | < 0.4 | Grass, flowers, rabbits |
| Forest | 0.35-0.6 | 0.4-0.7 | Trees, bushes, deer |
| Swamp | 0.35-0.5 | > 0.7 | Mud, reeds, frogs |
| Hills | 0.6-0.75 | Any | Stone, ore, goats |
| Mountains | > 0.75 | Any | Rock, snow, caves |
| Desert | 0.35-0.6 | < 0.2 | Sand, cacti, scorpions |

#### Implementation Steps

1. **Week 1-2: Terrain Generation**
   - [ ] Implement noise generators
   - [ ] Create height map generation
   - [ ] Add moisture map generation
   - [ ] Combine into biome map
   - [ ] Test: Varied terrain generates

2. **Week 3-4: Feature Placement**
   - [ ] Place trees by biome rules
   - [ ] Place ore deposits
   - [ ] Add water bodies
   - [ ] Place environmental props
   - [ ] Test: Features appear correctly

3. **Week 5: Polish & Seed System**
   - [ ] Implement world seeds
   - [ ] Add generation parameters
   - [ ] Create preview system
   - [ ] Optimize generation speed
   - [ ] Test: Seeds reproduce worlds

### 1.2 Resource Gathering

#### Resource Types

```
Resource Categories:
├── Raw Materials
│   ├── Wood (from trees)
│   ├── Stone (from rocks)
│   ├── Fiber (from plants)
│   └── Clay (from riverbanks)
├── Ores
│   ├── Iron Ore
│   ├── Copper Ore
│   ├── Gold Ore
│   └── Crystal
├── Food
│   ├── Berries
│   ├── Mushrooms
│   ├── Meat (from hunting)
│   └── Fish (from water)
└── Special
    ├── Monster Drops
    ├── Portal Shards
    └── Ancient Artifacts
```

#### Gathering System

```
GatheringSystem:
  - DetectGatherableInRange(position, radius)
  - StartGathering(entity, target)
  - ProcessGatheringTick(deltaTime)
  - CompleteGathering(entity, target)
  - DropResources(position, drops)

GatheringAction:
  target: GatherableObject
  progress: float (0-1)
  tool: ToolType (affects speed)
  gatherer: Entity
```

#### Implementation Steps

1. **Week 1: Gatherable Objects**
   - [ ] Create Gatherable component
   - [ ] Implement tree gathering
   - [ ] Implement rock mining
   - [ ] Add plant harvesting
   - [ ] Test: Resources drop from sources

2. **Week 2: Tools & Efficiency**
   - [ ] Create tool types (axe, pickaxe, etc.)
   - [ ] Implement tool efficiency modifiers
   - [ ] Add tool durability
   - [ ] Create gathering animations
   - [ ] Test: Tools affect gathering speed

### 1.3 Inventory System

#### Data Structure

```
Inventory:
  slots: InventorySlot[]
  maxSlots: int

InventorySlot:
  item: Item
  quantity: int

Item:
  id: string
  name: string
  category: ItemCategory
  maxStack: int
  icon: Sprite
  properties: ItemProperties
```

#### Inventory Operations

```
InventoryManager:
  - AddItem(item, quantity) → remaining
  - RemoveItem(item, quantity) → success
  - HasItem(item, quantity) → bool
  - GetItemCount(item) → int
  - SwapSlots(slot1, slot2)
  - SplitStack(slot, amount)
  - MergeStacks(source, target)
```

#### Implementation Steps

1. **Week 1: Core Inventory**
   - [ ] Create Inventory class
   - [ ] Implement add/remove operations
   - [ ] Create item definitions
   - [ ] Add stack management
   - [ ] Test: Items stack correctly

2. **Week 2: Inventory UI**
   - [ ] Create inventory grid UI
   - [ ] Implement drag-and-drop
   - [ ] Add item tooltips
   - [ ] Create quick-use slots
   - [ ] Test: UI interactions work

### 1.4 Crafting System

#### Recipe Structure

```
Recipe:
  id: string
  name: string
  category: CraftingCategory
  inputs: RecipeInput[]
  output: RecipeOutput
  craftTime: float
  requiredStation: StationType
  unlockedBy: UnlockCondition

RecipeInput:
  item: Item
  quantity: int
  consumed: bool (some recipes use but don't consume)

RecipeOutput:
  item: Item
  quantity: int
  qualityRange: (min, max)
```

#### Crafting Categories

| Category | Station Required | Example Items |
|----------|------------------|---------------|
| Basic | None (hands) | Wooden tools, torches |
| Workbench | Workbench | Stone tools, simple furniture |
| Forge | Forge + Fuel | Metal tools, weapons |
| Alchemy | Alchemy Station | Potions, enchantments |
| Advanced | Workshop | Complex machinery |

#### Implementation Steps

1. **Week 1: Recipe System**
   - [ ] Create Recipe data structure
   - [ ] Implement recipe registry
   - [ ] Create crafting logic
   - [ ] Add station requirements
   - [ ] Test: Items craft correctly

2. **Week 2: Crafting UI**
   - [ ] Create recipe browser
   - [ ] Show craftable/uncraftable states
   - [ ] Add recipe search/filter
   - [ ] Create crafting queue
   - [ ] Test: UI shows correct info

### 1.5 Survival Mechanics

#### Player Needs

```
SurvivalNeeds:
  health:
    current: float
    max: float
    regenRate: float (when fed)

  hunger:
    current: float (100 = full)
    decayRate: float (per game hour)
    starvationThreshold: 0
    starvationDamage: float

  stamina:
    current: float
    max: float
    regenRate: float
    sprintCost: float
```

#### Environmental Hazards

| Hazard | Effect | Mitigation |
|--------|--------|------------|
| Darkness | Monsters spawn more | Torches, campfires |
| Cold | Stamina drain | Shelter, warm clothes |
| Heat | Thirst (future) | Shade, water |
| Rain | Slower movement | Shelter, raincoat |

#### Implementation Steps

1. **Week 1: Health & Hunger**
   - [ ] Create SurvivalSystem
   - [ ] Implement hunger decay
   - [ ] Add health regeneration
   - [ ] Create food consumption
   - [ ] Test: Player needs food

2. **Week 2: Environmental Effects**
   - [ ] Add day/night cycle
   - [ ] Implement light levels
   - [ ] Add temperature (basic)
   - [ ] Create status effect UI
   - [ ] Test: Environment affects player

### 1.6 Basic Building

#### Building Placement

```
BuildingSystem:
  - EnterBuildMode(blueprintId)
  - ShowPlacementPreview(position)
  - ValidatePlacement(position) → PlacementResult
  - PlaceBuilding(position, rotation)
  - CancelBuildMode()

PlacementResult:
  valid: bool
  reason: string (if invalid)
  resourcesAvailable: bool
  terrainSuitable: bool
  noCollisions: bool
```

#### Starter Buildings

| Building | Cost | Function |
|----------|------|----------|
| Campfire | 5 Wood, 3 Stone | Light, warmth, cooking |
| Workbench | 20 Wood | Basic crafting |
| Storage Chest | 15 Wood | 20 item slots |
| Wooden Wall | 5 Wood | Defense, room creation |
| Wooden Door | 8 Wood | Controllable access |
| Bed | 10 Wood, 5 Fiber | Respawn point, rest |

#### Implementation Steps

1. **Week 1: Placement System**
   - [ ] Create BuildingSystem
   - [ ] Implement placement preview
   - [ ] Add placement validation
   - [ ] Create resource consumption
   - [ ] Test: Buildings place correctly

2. **Week 2: Building Functions**
   - [ ] Implement campfire (light + cooking)
   - [ ] Create workbench (crafting station)
   - [ ] Add storage chest (extra inventory)
   - [ ] Implement bed (respawn)
   - [ ] Test: Buildings function

### 1.7 Day/Night & Basic Threats

#### Time System

```
TimeSystem:
  gameTime: float (0-24 hours)
  dayLength: float (real seconds per game day)

  Dawn: 5:00-7:00
  Day: 7:00-18:00
  Dusk: 18:00-20:00
  Night: 20:00-5:00

Events:
  - OnHourChanged(hour)
  - OnDayPhaseChanged(phase)
  - OnNewDay(day)
```

#### Monster Spawning

```
BasicSpawnSystem:
  - SpawnRadius: 30-50 tiles from player
  - DespawnRadius: 60 tiles from player
  - MaxMonsters: 10 (night), 3 (day)
  - SpawnCooldown: 30 seconds

SpawnRules:
  - Night: Any dark area outside light
  - Day: Only in caves/dungeons
  - Near portals: Always (proximity based)
```

#### Starter Monsters

| Monster | Health | Damage | Behavior | Drops |
|---------|--------|--------|----------|-------|
| Slime | 20 | 5 | Passive until attacked | Gel |
| Zombie | 40 | 10 | Aggressive at night | Rotten flesh |
| Skeleton | 30 | 15 | Aggressive, ranged | Bones, arrows |

#### Implementation Steps

1. **Week 1: Time & Lighting**
   - [ ] Create TimeSystem
   - [ ] Implement day/night cycle
   - [ ] Add dynamic lighting
   - [ ] Create light sources
   - [ ] Test: Day/night transitions

2. **Week 2: Monster Spawning**
   - [ ] Create SpawnSystem
   - [ ] Implement spawn rules
   - [ ] Create basic monster AI
   - [ ] Add monster prefabs
   - [ ] Test: Monsters spawn at night

3. **Week 3: Basic Combat**
   - [ ] Create CombatSystem
   - [ ] Implement player attacks
   - [ ] Add monster attacks
   - [ ] Create damage numbers
   - [ ] Test: Combat works

### Phase 1 Exit Criteria

- [ ] Procedural world generates with biomes
- [ ] Player can gather resources
- [ ] Inventory and crafting functional
- [ ] Hunger system requires food gathering
- [ ] Day/night cycle with monster spawns
- [ ] Basic combat allows survival
- [ ] Can build shelter and basic structures
- [ ] Save/load preserves all progress

---

## Phase 2: Colony Alpha

**Duration:** 2-3 months
**Goal:** Transform solo survival into settlement building with NPCs
**Milestone:** "Settlement Simulation" demo

### 2.1 NPC Spawning & Attraction

#### Settlement Attraction System

```
SettlementAttraction:
  factors:
    - Housing availability (beds)
    - Food supply (days of food)
    - Safety (walls, defenses)
    - Amenities (crafting stations)
    - Reputation (quests completed)

  attractionScore = sum(factor * weight)
  spawnChance = attractionScore / threshold
  checkInterval = 1 game day
```

#### NPC Arrival

| Requirement | NPCs Attracted |
|-------------|----------------|
| 1 bed, campfire | 1st settler |
| 3 beds, workbench | 2nd settler |
| 5 beds, walls | 3rd settler |
| Per 2 beds after | +1 settler (max 20) |

#### Implementation Steps

1. **Week 1: Attraction System**
   - [ ] Create AttractionCalculator
   - [ ] Track settlement statistics
   - [ ] Implement spawn chance
   - [ ] Create arrival events
   - [ ] Test: NPCs arrive over time

2. **Week 2: NPC Initialization**
   - [ ] Generate NPC names
   - [ ] Assign random traits
   - [ ] Set initial skills
   - [ ] Create arrival animation
   - [ ] Test: NPCs are unique

### 2.2 NPC Personality System

#### Personality Traits

```
PersonalityTraits:
  // Core traits (scale -1 to 1)
  industriousness: float    # Lazy ↔ Hardworking
  sociability: float        # Reclusive ↔ Social
  courage: float            # Cowardly ↔ Brave
  patience: float           # Impatient ↔ Patient

  // Preferences (affects happiness)
  preferredWork: WorkType[]
  dislikedWork: WorkType[]
  hobbies: Hobby[]
```

#### Trait Effects

| Trait | Effect |
|-------|--------|
| High Industriousness | +20% work speed, less breaks |
| Low Industriousness | -20% work speed, more breaks |
| High Sociability | Mood boost from interactions |
| Low Sociability | Needs less social, more alone time |
| High Courage | Will fight threats, guards |
| Low Courage | Flees from danger, avoids combat |

#### Implementation Steps

1. **Week 1: Trait System**
   - [ ] Create PersonalityTraits class
   - [ ] Implement trait generation
   - [ ] Add trait effects to behavior
   - [ ] Create trait UI display
   - [ ] Test: Traits affect behavior

2. **Week 2: Preferences**
   - [ ] Add work preferences
   - [ ] Implement hobby system
   - [ ] Create preference matching
   - [ ] Add happiness modifiers
   - [ ] Test: NPCs prefer certain work

### 2.3 NPC Needs System

#### Need Types

```
NPCNeeds:
  hunger:
    current: float (0-100)
    decayRate: 2.0 per hour
    criticalThreshold: 20

  rest:
    current: float (0-100)
    decayRate: 1.5 per hour
    criticalThreshold: 15

  happiness:
    current: float (0-100)
    factors: HappinessFactor[]

  social:
    current: float (0-100)
    decayRate: 0.5 per hour (modified by sociability)
```

#### Happiness Factors

| Factor | Effect |
|--------|--------|
| Good housing | +10 |
| Poor housing | -10 |
| Well fed | +5 |
| Hungry | -15 |
| Doing preferred work | +10 |
| Doing disliked work | -10 |
| Social needs met | +5 |
| Lonely | -10 |
| Recent danger | -5 to -20 |
| Settlement prospering | +5 |

#### Implementation Steps

1. **Week 1: Basic Needs**
   - [ ] Create NPCNeedsSystem
   - [ ] Implement hunger/rest decay
   - [ ] Add need satisfaction behaviors
   - [ ] Create need priority logic
   - [ ] Test: NPCs seek food/rest

2. **Week 2: Happiness System**
   - [ ] Implement happiness calculation
   - [ ] Add happiness factors
   - [ ] Create mood display
   - [ ] Add unhappiness consequences
   - [ ] Test: Happiness affects behavior

### 2.4 Autonomous Work System

#### Task Finding Algorithm

```
FindBestTask(npc):
  availableTasks = GetUnclaimedTasks()
  validTasks = Filter(availableTasks, npc.CanPerform)

  scoredTasks = []
  for task in validTasks:
    score = CalculateTaskScore(npc, task)
    scoredTasks.Add((task, score))

  return scoredTasks.OrderByDescending(score).First()

CalculateTaskScore(npc, task):
  baseScore = task.priority * 100
  distancePenalty = Distance(npc.position, task.position) * 2
  preferenceBonus = npc.Prefers(task.type) ? 50 : 0
  skillBonus = npc.GetSkill(task.type) * 10

  return baseScore - distancePenalty + preferenceBonus + skillBonus
```

#### Work Types

| Work Type | Tasks | Required Skill |
|-----------|-------|----------------|
| Mining | Mine designated tiles | Mining |
| Logging | Chop marked trees | Woodcutting |
| Hauling | Move items to stockpiles | None |
| Building | Construct at build sites | Construction |
| Farming | Plant, tend, harvest | Farming |
| Cooking | Prepare meals | Cooking |
| Crafting | Use workstations | Varies |
| Guarding | Patrol, defend | Combat |

#### Implementation Steps

1. **Week 1: Task System**
   - [ ] Create TaskManager
   - [ ] Implement task creation
   - [ ] Add task claiming
   - [ ] Create task execution
   - [ ] Test: Tasks complete correctly

2. **Week 2: Work Assignment**
   - [ ] Implement FindBestTask
   - [ ] Add work priorities
   - [ ] Create work scheduling
   - [ ] Add skill effects
   - [ ] Test: NPCs choose work smartly

3. **Week 3: Specialized Work**
   - [ ] Implement mining tasks
   - [ ] Add construction tasks
   - [ ] Create hauling tasks
   - [ ] Add farming tasks
   - [ ] Test: All work types function

### 2.5 Stockpile System

#### Stockpile Definition

```
Stockpile:
  id: string
  bounds: Rect
  allowedCategories: ResourceCategory[]
  priority: int (1-5)
  slots: StockpileSlot[]

StockpileSlot:
  position: Vector2Int
  item: Item
  quantity: int
  reserved: bool
  reservedBy: TaskId
```

#### Stockpile Operations

```
StockpileManager:
  - CreateStockpile(bounds, categories)
  - DeleteStockpile(id)
  - FindDepositSlot(item) → StockpileSlot
  - FindWithdrawSlot(item) → StockpileSlot
  - ReserveSlot(slot, taskId)
  - ReleaseReservation(slot)
  - GetTotalStorage(item) → int
```

#### Implementation Steps

1. **Week 1: Stockpile Core**
   - [ ] Create Stockpile class
   - [ ] Implement stockpile zones
   - [ ] Add item filtering
   - [ ] Create slot management
   - [ ] Test: Items store in stockpiles

2. **Week 2: Hauling Integration**
   - [ ] Create haul tasks for drops
   - [ ] Implement deposit logic
   - [ ] Add withdrawal logic
   - [ ] Create priority system
   - [ ] Test: NPCs haul automatically

### 2.6 Construction System

#### Blueprint System

```
Blueprint:
  id: string
  name: string
  size: Vector2Int
  tiles: TilePlacement[]
  requirements: ResourceRequirement[]
  buildOrder: int[] (tile indices)

ConstructionSite:
  blueprint: Blueprint
  position: Vector2Int
  status: ConstructionStatus
  deliveredMaterials: Map<Item, int>
  progress: Map<int, float> (per tile)
```

#### Construction Flow

```
1. Player places blueprint → Site created (PLANNED)
2. System generates delivery tasks for materials
3. Haulers deliver materials → Site becomes IN_PROGRESS
4. System generates build tasks (in order)
5. Builders place tiles (respecting build order)
6. All tiles complete → Site becomes COMPLETED
7. Site converts to actual building
```

#### Implementation Steps

1. **Week 1: Blueprint System**
   - [ ] Create Blueprint data structure
   - [ ] Implement blueprint placement
   - [ ] Add placement validation
   - [ ] Create construction site
   - [ ] Test: Blueprints place correctly

2. **Week 2: Construction Tasks**
   - [ ] Generate delivery tasks
   - [ ] Generate build tasks
   - [ ] Implement build order
   - [ ] Track construction progress
   - [ ] Test: NPCs build structures

3. **Week 3: Building Completion**
   - [ ] Convert sites to buildings
   - [ ] Activate building functions
   - [ ] Add construction animations
   - [ ] Create construction UI
   - [ ] Test: Buildings complete and work

### 2.7 Zone Designation

#### Zone Types

| Zone | Purpose | Behavior |
|------|---------|----------|
| Stockpile | Store resources | Haulers deposit items |
| Farm | Grow crops | Farmers plant/harvest |
| Mining | Extract resources | Miners dig tiles |
| Logging | Harvest trees | Loggers cut trees |
| Restricted | No entry | NPCs avoid area |
| Meeting | Socializing | NPCs gather here |

#### Implementation Steps

1. **Week 1: Zone System**
   - [ ] Create ZoneManager
   - [ ] Implement zone painting
   - [ ] Add zone types
   - [ ] Create zone UI
   - [ ] Test: Zones designate correctly

2. **Week 2: Zone Behaviors**
   - [ ] Mining zones generate tasks
   - [ ] Farm zones track plots
   - [ ] Restricted zones block pathing
   - [ ] Meeting zones attract idle NPCs
   - [ ] Test: Zones affect behavior

### Phase 2 Exit Criteria

- [ ] NPCs arrive based on settlement quality
- [ ] NPCs have unique personalities
- [ ] NPCs autonomously find and perform work
- [ ] Stockpile system organizes resources
- [ ] Construction system builds structures
- [ ] Zone designation controls work areas
- [ ] NPC needs (hunger, rest, happiness) functional
- [ ] Save/load preserves NPC state

---

## Phase 3: Combat & Threats

**Duration:** 2-3 months
**Goal:** Add meaningful conflict and territory system
**Milestone:** "Reclaim the World" demo

### 3.1 Combat System

#### Combat Architecture

```
CombatSystem:
├── DamageCalculator
│   ├── CalculateDamage(attacker, defender, attack)
│   ├── ApplyDefense(damage, defense)
│   └── ApplyModifiers(damage, modifiers)
├── AttackExecutor
│   ├── MeleeAttack(attacker, target)
│   ├── RangedAttack(attacker, target, projectile)
│   └── AreaAttack(attacker, center, radius)
├── HitDetection
│   ├── CheckMeleeHit(attacker, target, range)
│   ├── CheckProjectileHit(projectile, targets)
│   └── GetEntitiesInArea(center, radius)
└── StatusEffects
    ├── ApplyEffect(target, effect)
    ├── RemoveEffect(target, effect)
    └── ProcessEffects(deltaTime)
```

#### Damage Formula

```
BaseDamage = WeaponDamage + (Strength * 0.5)
Defense = ArmorValue + (Constitution * 0.3)
FinalDamage = max(1, BaseDamage - Defense) * CritMultiplier * StatusModifiers
```

#### Implementation Steps

1. **Week 1: Damage System**
   - [ ] Create DamageCalculator
   - [ ] Implement stat-based damage
   - [ ] Add defense calculations
   - [ ] Create critical hits
   - [ ] Test: Damage calculates correctly

2. **Week 2: Attack Types**
   - [ ] Implement melee attacks
   - [ ] Add ranged attacks
   - [ ] Create projectile system
   - [ ] Add area attacks
   - [ ] Test: All attack types work

3. **Week 3: Status Effects**
   - [ ] Create StatusEffect system
   - [ ] Implement poison, burn, slow
   - [ ] Add effect visuals
   - [ ] Create effect UI
   - [ ] Test: Effects apply correctly

### 3.2 Player Combat

#### Player Combat Abilities

```
PlayerCombat:
  primaryAttack: Attack (bound to left click)
  secondaryAttack: Attack (bound to right click)
  dodgeRoll: Ability (invincibility frames)
  block: Ability (damage reduction while held)

  comboCooldown: float
  dodgeCooldown: float
  staminaCost: Map<Action, float>
```

#### Weapon Types

| Type | Speed | Range | Special |
|------|-------|-------|---------|
| Sword | Medium | Short | Combo attacks |
| Axe | Slow | Short | Bonus vs structures |
| Spear | Medium | Medium | Thrust attack |
| Bow | Slow | Long | Charge for damage |
| Staff | Medium | Medium | Magic scaling |

#### Implementation Steps

1. **Week 1: Basic Combat**
   - [ ] Create PlayerCombatController
   - [ ] Implement attack input
   - [ ] Add weapon switching
   - [ ] Create attack animations
   - [ ] Test: Player can attack

2. **Week 2: Advanced Combat**
   - [ ] Add dodge roll
   - [ ] Implement blocking
   - [ ] Create combo system
   - [ ] Add stamina costs
   - [ ] Test: Combat feels responsive

### 3.3 NPC Combat

#### Guard Behavior

```
GuardAI:
  states:
    - Patrol: Walk between patrol points
    - Alert: Investigate threat
    - Combat: Engage enemy
    - Retreat: Return when threat gone

  patrolRoute: Vector2[]
  alertRange: 10 tiles
  combatRange: 8 tiles
  retreatThreshold: 0.2 health
```

#### Combat Roles

| Role | Behavior | Equipment |
|------|----------|-----------|
| Guard | Melee, defensive | Sword + Shield |
| Archer | Ranged, kiting | Bow + Light armor |
| Healer | Support, stays back | Staff + Robes |

#### Implementation Steps

1. **Week 1: NPC Combat AI**
   - [ ] Create CombatAI component
   - [ ] Implement threat detection
   - [ ] Add target selection
   - [ ] Create attack behavior
   - [ ] Test: NPCs fight threats

2. **Week 2: Guard System**
   - [ ] Create Guard role
   - [ ] Implement patrol routes
   - [ ] Add alert states
   - [ ] Create guard stations
   - [ ] Test: Guards patrol and respond

### 3.4 Monster AI

#### Monster Behavior Types

```
MonsterBehaviors:
  - Passive: Flees when attacked (slime, rabbit)
  - Neutral: Attacks if provoked (wolf, boar)
  - Aggressive: Attacks on sight (zombie, skeleton)
  - Territorial: Attacks near territory (spider, bear)
  - Hunter: Stalks then attacks (shadow, wraith)
```

#### Monster State Machine

```
MonsterStateMachine:
  Idle:
    - Wander randomly
    - Check for targets in range
    → Alert (if target found)

  Alert:
    - Face target
    - Decide fight or flee
    → Combat (if aggressive)
    → Flee (if passive/hurt)

  Combat:
    - Move toward target
    - Attack when in range
    - Use abilities
    → Idle (if target lost)
    → Flee (if health low)

  Flee:
    - Move away from threat
    - Don't attack
    → Idle (if safe)
```

#### Implementation Steps

1. **Week 1: Monster AI Core**
   - [ ] Create MonsterAI component
   - [ ] Implement state machine
   - [ ] Add behavior types
   - [ ] Create target tracking
   - [ ] Test: Monsters behave correctly

2. **Week 2: Monster Variety**
   - [ ] Create unique monster types
   - [ ] Add special abilities
   - [ ] Implement boss monsters
   - [ ] Add monster spawn rules
   - [ ] Test: Monster variety works

### 3.5 Portal System

#### Portal Definition

```
Portal:
  id: string
  position: Vector2
  type: PortalType
  level: int (difficulty)
  status: PortalStatus
  corruptionRadius: float
  spawnRate: float
  maxMonsters: int
  closingRequirements: ClosingRequirements

PortalStatus:
  - DORMANT: Not spawning, can activate
  - ACTIVE: Spawning monsters
  - CLOSING: Player attempting to close
  - CLOSED: Defeated, territory reclaimed
  - REOPENING: Monsters trying to reopen
```

#### Portal Levels

| Level | Difficulty | Monsters | Close Requirement |
|-------|------------|----------|-------------------|
| 1 | Easy | Slimes, Zombies | Kill 10 monsters |
| 2 | Medium | Skeletons, Wolves | Kill 20 + mini-boss |
| 3 | Hard | Orcs, Spiders | Kill 30 + boss |
| 4 | Very Hard | Demons, Dragons | Kill 50 + elite boss |

#### Implementation Steps

1. **Week 1: Portal Core**
   - [ ] Create Portal entity
   - [ ] Implement spawn behavior
   - [ ] Add corruption spread
   - [ ] Create closing mechanic
   - [ ] Test: Portals spawn monsters

2. **Week 2: Portal Progression**
   - [ ] Add portal levels
   - [ ] Create boss spawns
   - [ ] Implement closing rewards
   - [ ] Add territory reclamation
   - [ ] Test: Closing portals works

### 3.6 Territory Control

#### Territory System

```
TerritorySystem:
  regions: Map<RegionId, TerritoryStatus>

TerritoryStatus:
  - CORRUPTED: Portal active, high danger
  - CONTESTED: Portal closed, monsters remain
  - CLAIMED: Safe, can build
  - FORTIFIED: Defended, bonuses apply

TransitionRules:
  CORRUPTED → CONTESTED: Close portal
  CONTESTED → CLAIMED: Clear remaining monsters
  CLAIMED → FORTIFIED: Build defenses
  FORTIFIED → CLAIMED: Defenses destroyed
  CLAIMED → CONTESTED: Portal reopens
```

#### Implementation Steps

1. **Week 1: Territory System**
   - [ ] Create TerritoryManager
   - [ ] Implement region status
   - [ ] Add status transitions
   - [ ] Create territory UI
   - [ ] Test: Territory status changes

2. **Week 2: Territory Effects**
   - [ ] Corrupted: Debuffs, monster spawns
   - [ ] Claimed: Building allowed
   - [ ] Fortified: Production bonuses
   - [ ] Add territory map
   - [ ] Test: Territory affects gameplay

### 3.7 Defensive Structures

#### Defense Buildings

| Building | Cost | Function | HP |
|----------|------|----------|-----|
| Wooden Wall | 10 Wood | Blocks pathing | 100 |
| Stone Wall | 20 Stone | Stronger block | 300 |
| Gate | 30 Wood/Stone | Controlled access | 150/450 |
| Watchtower | 50 Wood, 30 Stone | Extends vision, archer post | 200 |
| Spike Trap | 20 Wood, 10 Iron | Damages enemies | 50 |
| Ballista | 100 Wood, 50 Iron | Auto-attacks enemies | 300 |

#### Implementation Steps

1. **Week 1: Defensive Buildings**
   - [ ] Create wall building system
   - [ ] Implement gates
   - [ ] Add watchtowers
   - [ ] Create trap system
   - [ ] Test: Defenses block enemies

2. **Week 2: Active Defenses**
   - [ ] Implement ballista AI
   - [ ] Add arrow towers
   - [ ] Create trap triggers
   - [ ] Add repair mechanics
   - [ ] Test: Defenses attack enemies

### Phase 3 Exit Criteria

- [ ] Player combat is responsive and satisfying
- [ ] NPCs can fight and defend settlement
- [ ] Multiple monster types with unique behaviors
- [ ] Portal system with spawning and closing
- [ ] Territory control with status effects
- [ ] Defensive structures protect settlement
- [ ] Combat balancing feels fair
- [ ] Save/load preserves combat state

---

## Phase 4: The Companion

**Duration:** 2-3 months
**Goal:** Implement mystical companion and magic system
**Milestone:** "Rise Together" demo

### 4.1 Companion System

#### Companion Entity

```
Companion:
  // Core
  id: string
  name: string
  position: Vector2

  // Recovery state
  health: float (0-100)
  recoveryPhase: RecoveryPhase
  powerLevel: float

  // Relationship
  trust: float (0-100)
  conversationsHad: int
  secretsRevealed: int

  // Abilities
  abilities: CompanionAbility[]
  passiveBonuses: PassiveBonus[]

RecoveryPhase:
  - CRITICAL: Phase 1, barely functional
  - RECOVERING: Phase 2, regaining strength
  - HEALTHY: Phase 3, full power
  - AWAKENED: Phase 4, unlocked memories
```

#### Companion Progression

| Phase | Trigger | Companion State | Player Benefits |
|-------|---------|-----------------|-----------------|
| 1 | Game start | Wounded, limited | Basic guidance |
| 2 | First settlement | Recovering | Basic magic teaching |
| 3 | Close 3 portals | Healthy | Advanced magic |
| 4 | Story completion | Awakened | Master magic, lore |

#### Implementation Steps

1. **Week 1: Companion Core**
   - [ ] Create Companion entity
   - [ ] Implement recovery system
   - [ ] Add companion following
   - [ ] Create companion UI
   - [ ] Test: Companion follows player

2. **Week 2: Companion Progression**
   - [ ] Implement recovery phases
   - [ ] Add progression triggers
   - [ ] Create phase transitions
   - [ ] Add companion abilities
   - [ ] Test: Companion grows stronger

### 4.2 Dialogue System

#### Dialogue Architecture

```
DialogueSystem:
├── DialogueManager
│   ├── StartConversation(npcId)
│   ├── SelectChoice(choiceIndex)
│   ├── EndConversation()
│   └── GetCurrentNode() → DialogueNode
├── DialogueData
│   ├── nodes: Map<nodeId, DialogueNode>
│   ├── startNode: nodeId
│   └── conditions: DialogueCondition[]
└── DialogueUI
    ├── ShowDialogue(node)
    ├── ShowChoices(choices)
    └── HideDialogue()

DialogueNode:
  id: string
  speaker: string
  text: string
  choices: DialogueChoice[]
  actions: DialogueAction[]
  conditions: Condition[]

DialogueChoice:
  text: string
  nextNode: nodeId
  conditions: Condition[]
  consequences: Consequence[]
```

#### Implementation Steps

1. **Week 1: Dialogue Core**
   - [ ] Create DialogueManager
   - [ ] Implement dialogue flow
   - [ ] Add choice handling
   - [ ] Create dialogue UI
   - [ ] Test: Conversations work

2. **Week 2: Companion Dialogue**
   - [ ] Write companion dialogue
   - [ ] Add relationship effects
   - [ ] Create lore reveals
   - [ ] Add teaching dialogues
   - [ ] Test: Companion conversations

### 4.3 Magic System

#### Magic Architecture

```
MagicSystem:
├── SpellRegistry
│   └── spells: Map<spellId, SpellDefinition>
├── SpellCaster
│   ├── CastSpell(caster, spell, target)
│   ├── CheckRequirements(caster, spell)
│   └── ApplySpellEffects(spell, target)
├── ManaSystem
│   ├── current: float
│   ├── max: float
│   └── regenRate: float
└── SpellBook
    └── learnedSpells: Spell[]

SpellDefinition:
  id: string
  name: string
  description: string
  school: MagicSchool
  tier: int (1-4)
  manaCost: float
  castTime: float
  cooldown: float
  range: float
  effects: SpellEffect[]
```

#### Magic Schools

| School | Focus | Example Spells |
|--------|-------|----------------|
| Light | Healing, protection | Heal, Shield, Purify |
| Fire | Damage, burning | Fireball, Flame Wave |
| Nature | Growth, terrain | Grow Plants, Entangle |
| Arcane | Utility, teleport | Blink, Slow Time |

#### Spell Tiers

| Tier | Requirement | Examples |
|------|-------------|----------|
| 1 | Companion Phase 2 | Light, Minor Heal |
| 2 | Companion Phase 3 | Fireball, Shield |
| 3 | Close 5 portals | Chain Lightning, Mass Heal |
| 4 | Companion Phase 4 | Time Stop, Resurrection |

#### Implementation Steps

1. **Week 1: Magic Core**
   - [ ] Create MagicSystem
   - [ ] Implement mana system
   - [ ] Add spell casting
   - [ ] Create spell effects
   - [ ] Test: Spells cast correctly

2. **Week 2: Spell Variety**
   - [ ] Create healing spells
   - [ ] Add damage spells
   - [ ] Implement utility spells
   - [ ] Create spell visuals
   - [ ] Test: Spell variety works

3. **Week 3: Magic Progression**
   - [ ] Implement spell learning
   - [ ] Add companion teaching
   - [ ] Create spell book UI
   - [ ] Balance mana costs
   - [ ] Test: Magic progression works

### 4.4 Teaching Mechanic

#### Teaching System

```
TeachingSystem:
  availableLessons: Lesson[]
  completedLessons: Lesson[]
  currentLesson: Lesson

Lesson:
  id: string
  spell: Spell
  requirements: LessonRequirement[]
  dialogueTree: DialogueTree
  practiceRequired: bool

TeachingFlow:
  1. Companion offers lesson (based on recovery)
  2. Player initiates dialogue
  3. Companion explains spell
  4. Player practices (tutorial)
  5. Spell added to spellbook
```

#### Implementation Steps

1. **Week 1: Teaching System**
   - [ ] Create TeachingSystem
   - [ ] Implement lesson flow
   - [ ] Add practice mode
   - [ ] Create teaching dialogue
   - [ ] Test: Can learn spells

2. **Week 2: Teaching Content**
   - [ ] Create all lesson content
   - [ ] Add practice challenges
   - [ ] Implement unlock sequence
   - [ ] Polish teaching UI
   - [ ] Test: Learning feels good

### 4.5 Story Hooks

#### Lore Discovery

```
LoreSystem:
  discoveredLore: Set<LoreId>
  loreItems: LoreItem[]

LoreItem:
  id: string
  title: string
  content: string
  discoveryMethod: DiscoveryMethod
  unlocksDialogue: DialogueId

DiscoveryMethod:
  - EXPLORE: Find in world
  - COMPANION: Companion reveals
  - QUEST: Complete quest
  - ITEM: Examine special item
```

#### Story Mysteries

| Mystery | Hints | Revelation |
|---------|-------|------------|
| Cataclysm cause | Scattered tablets | Companion's memory |
| Companion's identity | Companion dialogue | Phase 4 revelation |
| Portal origin | Portal exploration | Major portal boss |
| World's fate | Multiple sources | Endgame content |

#### Implementation Steps

1. **Week 1: Lore System**
   - [ ] Create LoreSystem
   - [ ] Implement lore discovery
   - [ ] Add lore UI (journal)
   - [ ] Create lore items
   - [ ] Test: Lore discoverable

2. **Week 2: Story Integration**
   - [ ] Write lore content
   - [ ] Add companion story
   - [ ] Create mystery breadcrumbs
   - [ ] Implement revelations
   - [ ] Test: Story engages

### Phase 4 Exit Criteria

- [ ] Companion follows and recovers
- [ ] Dialogue system with choices
- [ ] Magic system with multiple spells
- [ ] Teaching mechanic for learning spells
- [ ] Lore discovery system
- [ ] Companion progression through phases
- [ ] Story hooks engage player
- [ ] Save/load preserves companion state

---

## Phase 5: Content & Polish

**Duration:** 3-4 months
**Goal:** Full game experience with narrative content
**Milestone:** "Early Access Ready" build

### 5.1 Full Narrative

#### Story Structure

```
MainStory:
  Act 1: Survival & Discovery
    - Tutorial/introduction
    - Find companion
    - Establish settlement

  Act 2: Growth & Understanding
    - Learn about cataclysm
    - Close regional portals
    - Companion recovers

  Act 3: Revelation & Choice
    - Discover truth
    - Face major portal
    - Companion's fate choice

  Epilogue: (varies by choice)
    - Settlement flourishes
    - World begins healing
```

#### Implementation Steps

1. **Week 1-2: Act 1 Content**
   - [ ] Write Act 1 dialogue
   - [ ] Create tutorial sequence
   - [ ] Add companion introduction
   - [ ] Test: Act 1 plays through

2. **Week 3-4: Act 2 Content**
   - [ ] Write Act 2 dialogue
   - [ ] Create lore discoveries
   - [ ] Add story quests
   - [ ] Test: Act 2 plays through

3. **Week 5-6: Act 3 Content**
   - [ ] Write Act 3 dialogue
   - [ ] Create climax content
   - [ ] Implement choices
   - [ ] Add epilogue
   - [ ] Test: Full story complete

### 5.2 Quest System

#### Quest Types

| Type | Description | Example |
|------|-------------|---------|
| Main | Story progression | "Close the Northern Portal" |
| Side | Optional content | "Help the traveling merchant" |
| Settlement | Colony goals | "Build a watchtower" |
| Daily | Repeatable | "Gather 50 wood" |
| Discovery | Exploration | "Find the ancient ruins" |

#### Quest Structure

```
Quest:
  id: string
  name: string
  description: string
  type: QuestType
  stages: QuestStage[]
  rewards: Reward[]
  prerequisites: Quest[]

QuestStage:
  description: string
  objectives: Objective[]
  onComplete: Action[]

Objective:
  type: ObjectiveType
  target: string
  required: int
  current: int
```

#### Implementation Steps

1. **Week 1: Quest System**
   - [ ] Create QuestManager
   - [ ] Implement quest tracking
   - [ ] Add objective types
   - [ ] Create quest UI
   - [ ] Test: Quests track progress

2. **Week 2-3: Quest Content**
   - [ ] Create main quests
   - [ ] Add side quests
   - [ ] Create settlement quests
   - [ ] Add discovery quests
   - [ ] Test: Quest variety

### 5.3 Audio Implementation

#### Audio Categories

```
AudioSystem:
├── Music
│   ├── MenuTheme
│   ├── ExplorationThemes[]
│   ├── CombatThemes[]
│   ├── SettlementThemes[]
│   └── BossThemes[]
├── SFX
│   ├── UI (clicks, opens)
│   ├── Combat (hits, spells)
│   ├── Environment (footsteps, ambient)
│   └── Building (hammering, completion)
└── Ambient
    ├── BiomeAmbience[]
    ├── WeatherSounds[]
    └── TimeOfDaySounds[]
```

#### Implementation Steps

1. **Week 1: Audio System**
   - [ ] Create AudioManager
   - [ ] Implement music system
   - [ ] Add SFX system
   - [ ] Create ambient system
   - [ ] Test: Audio plays correctly

2. **Week 2: Audio Content**
   - [ ] Add placeholder music
   - [ ] Implement SFX
   - [ ] Add ambient sounds
   - [ ] Create audio settings
   - [ ] Test: Audio atmosphere

### 5.4 Visual Polish

#### Visual Improvements

| Category | Improvements |
|----------|--------------|
| Animations | Smooth transitions, more frames |
| Particles | Combat effects, ambient particles |
| Lighting | Dynamic shadows, light sources |
| Weather | Rain, snow, fog effects |
| UI | Animations, polish, feedback |

#### Implementation Steps

1. **Week 1: Animation Polish**
   - [ ] Add animation transitions
   - [ ] Create more animation frames
   - [ ] Add idle variations
   - [ ] Polish combat animations
   - [ ] Test: Animations smooth

2. **Week 2: Effects**
   - [ ] Add particle effects
   - [ ] Create weather effects
   - [ ] Implement lighting improvements
   - [ ] Add screen effects
   - [ ] Test: Visual polish

### 5.5 Balance Pass

#### Balance Areas

| Area | Parameters | Goal |
|------|------------|------|
| Combat | Damage, health, speed | Fair challenge |
| Economy | Resource rates, costs | Meaningful choices |
| Progression | XP curves, unlocks | Satisfying pace |
| NPCs | Efficiency, needs decay | Helpful, not OP |
| Difficulty | Enemy scaling | Adjustable |

#### Implementation Steps

1. **Week 1: Data Analysis**
   - [ ] Implement metrics logging
   - [ ] Analyze playtest data
   - [ ] Identify problem areas
   - [ ] Create balance spreadsheet
   - [ ] Document findings

2. **Week 2: Balance Adjustments**
   - [ ] Adjust combat balance
   - [ ] Tune economy
   - [ ] Fix progression issues
   - [ ] Test difficulty levels
   - [ ] Validate changes

### 5.6 Tutorial Completion

#### Tutorial Stages

| Stage | Teaches | Trigger |
|-------|---------|---------|
| Movement | WASD, camera | Game start |
| Gathering | Resource collection | First resource |
| Crafting | Recipe system | Has materials |
| Building | Placement | Has building materials |
| Combat | Attacks, dodge | First enemy |
| NPCs | Settlement basics | First NPC arrives |
| Magic | Spell casting | Companion teaches |

#### Implementation Steps

1. **Week 1: Tutorial System**
   - [ ] Create TutorialManager
   - [ ] Implement hint triggers
   - [ ] Add skip option
   - [ ] Create tutorial UI
   - [ ] Test: Tutorial guides

2. **Week 2: Tutorial Content**
   - [ ] Write all tutorial text
   - [ ] Create tutorial markers
   - [ ] Add contextual hints
   - [ ] Polish tutorial flow
   - [ ] Test: New players succeed

### Phase 5 Exit Criteria

- [ ] Full narrative playable
- [ ] Quest system with variety
- [ ] Audio atmosphere complete
- [ ] Visual polish implemented
- [ ] Game balance validated
- [ ] Tutorial teaches effectively
- [ ] 10+ hours of content
- [ ] Ready for Early Access

---

## Phase 6: Multiplayer

**Duration:** 2-3 months
**Goal:** Cooperative settlement building
**Milestone:** Multiplayer beta

### 6.1 Network Architecture

#### Architecture Decision

```
Options:
1. Client-Server (Dedicated)
   + Authoritative, cheat-resistant
   + Scales to many players
   - Requires server hosting

2. Client-Server (Player Host)
   + No infrastructure needed
   + Lower latency for host
   - Host advantage

3. Peer-to-Peer
   + No server needed
   + Equal for all players
   - Complex state sync
   - NAT traversal issues

Recommendation: Client-Server (Player Host)
- Appropriate for co-op gameplay
- Simpler to implement
- No infrastructure costs
```

### 6.2 State Synchronization

#### Sync Categories

| Category | Sync Method | Priority |
|----------|-------------|----------|
| Player position | Frequent, interpolated | High |
| Combat actions | Immediate, validated | High |
| World changes | Event-based | Medium |
| NPC state | Periodic snapshot | Medium |
| UI state | Not synced | N/A |

### 6.3 Implementation Steps

1. **Week 1-2: Network Core**
   - [ ] Choose networking library
   - [ ] Implement host/join
   - [ ] Add player sync
   - [ ] Create connection UI
   - [ ] Test: Players connect

2. **Week 3-4: Game Sync**
   - [ ] Sync world state
   - [ ] Sync entities
   - [ ] Sync combat
   - [ ] Handle disconnection
   - [ ] Test: State stays synced

3. **Week 5-6: Permissions**
   - [ ] Implement build permissions
   - [ ] Add role system
   - [ ] Create admin controls
   - [ ] Test multiplayer scenarios

### Phase 6 Exit Criteria

- [ ] Players can host/join games
- [ ] World state synchronizes
- [ ] Combat works in multiplayer
- [ ] Permissions system functional
- [ ] Handles 4+ players
- [ ] Network performance acceptable

---

## Phase 7: Launch Preparation

**Duration:** 2-3 months
**Goal:** Ship-ready game
**Milestone:** Version 1.0

### 7.1 QA & Bug Fixing

- [ ] Full regression testing
- [ ] Platform testing (Win/Mac/Linux)
- [ ] Performance profiling
- [ ] Memory leak testing
- [ ] Save compatibility testing

### 7.2 Performance Optimization

- [ ] Profile all systems
- [ ] Optimize render pipeline
- [ ] Reduce memory usage
- [ ] Improve load times
- [ ] Target: 60 FPS on mid-range hardware

### 7.3 Platform Builds

- [ ] Windows build (32/64 bit)
- [ ] macOS build
- [ ] Linux build
- [ ] Create installers
- [ ] Test on multiple configurations

### 7.4 Store Presence

- [ ] Steam store page
- [ ] Store description
- [ ] Screenshots (10+)
- [ ] Trailer video
- [ ] Demo build (optional)

### 7.5 Marketing Materials

- [ ] Launch trailer
- [ ] Press kit
- [ ] Social media assets
- [ ] Review copies preparation

### Phase 7 Exit Criteria

- [ ] No critical bugs
- [ ] Performance targets met
- [ ] All platform builds working
- [ ] Store pages live
- [ ] Marketing materials ready
- [ ] Launch day prepared

---

## Cross-Cutting Concerns

### Accessibility

| Feature | Implementation |
|---------|----------------|
| Colorblind modes | Alternative color palettes |
| Text scaling | Adjustable UI scale |
| Key rebinding | Full remapping support |
| Subtitles | All dialogue captioned |
| Screen reader | UI element descriptions |

### Localization

```
Localization System:
- All strings in localization files
- Support for RTL languages
- Date/number formatting
- Font fallbacks for character sets
- Initial: English, German, French, Spanish
```

### Analytics

```
Tracked Metrics:
- Session length
- Feature usage
- Progression milestones
- Death causes
- NPC behavior patterns
- Performance data
```

### Modding Support (Future)

```
Moddable Content:
- Item definitions
- Recipe definitions
- NPC templates
- Building blueprints
- Quest definitions
- Dialogue trees
```

---

## Testing Strategy

### Test Categories

| Type | Coverage | Automation |
|------|----------|------------|
| Unit Tests | Core systems | Full |
| Integration Tests | System interactions | Partial |
| Playtest | User experience | Manual |
| Performance Tests | Frame rate, memory | Automated |
| Regression Tests | Previous bugs | Automated |

### Testing Schedule

- **Daily:** Automated unit tests
- **Weekly:** Integration test suite
- **Bi-weekly:** Internal playtest
- **Monthly:** External playtest
- **Per-phase:** Full regression

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | High | High | Strict phase gates, MVP focus |
| Performance issues | Medium | High | Profile early and often |
| Save corruption | Low | Critical | Robust serialization, backups |
| Multiplayer complexity | High | Medium | Design single-player first |
| Burnout | Medium | High | Sustainable pace, milestones |

---

## Success Criteria

### Development Metrics

| Metric | Target |
|--------|--------|
| Build stability | < 1 crash per hour |
| Frame rate | 60 FPS on mid-range |
| Load time | < 10 seconds |
| Save size | < 50 MB |
| Test coverage | > 70% core systems |

### Launch Metrics

| Metric | Target |
|--------|--------|
| Steam reviews | 80%+ positive |
| Day 1 sales | 10-20% of wishlists |
| Refund rate | < 10% |
| Average playtime | 15+ hours |

---

## References

- [Game Vision (2D)](../../planning/VISION_2D.md)
- [Development Roadmap (2D)](../../planning/ROADMAP_2D.md)
- [NPC System Design (2D)](../../planning/NPC_SYSTEM_DESIGN_2D.md)
- [Archived 2D Prototype](../archive-code/2d-prototype/README.md)

---

**Document Created:** November 2025
**Version:** 1.0
