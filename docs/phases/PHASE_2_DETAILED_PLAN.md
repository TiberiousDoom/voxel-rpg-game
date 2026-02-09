# Phase 2: Colony Alpha — Detailed Implementation Plan

**Created:** February 9, 2026
**Estimated Duration:** 12-16 weeks
**Status:** Planning
**Prerequisite:** Phase 1 (Survival & Gathering) complete

---

## Lessons from Phase 1

1. **Rift-based spawning replaced zone-based spawning** — anchor new NPC arrival logic to buildings/beacons, not random spawn zones. Spatial origin matters for immersion.
2. **Tuning constants in one file saved enormous iteration time** — continue adding all Phase 2 balance numbers to `src/data/tuning.js`.
3. **Mobile and desktop diverge on interaction** — NPC command UI must be designed for both touch and mouse from the start. No afterthought mobile ports.
4. **IndexedDB persistence works well** — use the same pattern for NPC state, building progress, and stockpile contents.
5. **React state + game tick interplay needs ref-based patterns** — NPC tick logic should read from refs and write to stores, not depend on React render cycles.
6. **Configuration has three homes** — keep a clear boundary between them:
   - `src/shared/config.js` — structural constants (types, enums, dimensions, grid)
   - `src/data/tuning.js` — balance numbers (rates, thresholds, multipliers, decay values)
   - `src/data/buildingBlueprints.js` — block-level building definitions (voxel layouts for construction)
7. **New game systems must register with the ModuleOrchestrator** — Phase 0/1 established the pattern in CLAUDE.md. Any new system that participates in the game tick must be a module, not a standalone system floating in `src/systems/`.

---

## Overview

Phase 2 transforms the solo survival experience into a settlement-building game. By the end, NPCs arrive at the player's settlement, autonomously gather resources, build structures, satisfy their own needs, and form a living community. The player is a participant and leader — not a babysitter.

### Goals
1. NPCs arrive as the settlement grows — attracted by buildings, not spawned arbitrarily
2. NPCs autonomously find and perform work (mining, hauling, building, gathering)
3. Each NPC has a personality, needs, and preferences that affect behavior
4. Stockpile zones let the player organize resource storage
5. Work zones let the player designate mining, farming, and building areas
6. Buildings can be upgraded through tiers (Survival → Permanent → Town)
7. Settlement UI provides at-a-glance management without micromanagement
8. The settlement feels alive — NPCs eat, rest, socialize, and react to the world

### What Success Looks Like
By the end of Phase 2, the player has built a campfire and a few shelters. An NPC wanders in, inspects the settlement, and decides to stay. Over the next few in-game days, more settlers arrive. The player designates a mining zone and a stockpile — NPCs begin mining stone and hauling it to the stockpile without being told. The player places a house blueprint; NPCs fetch materials and build it. At night, NPCs seek shelter. When hungry, they find food. The settlement hums with activity, and the player feels like they're building something real.

### Design Philosophy
From the Vision document:

> *NPCs are companions in building, not tools to be managed.*

Every system in Phase 2 serves this principle. NPCs should:
- Find work without being assigned
- Prioritize sensibly (defense > needs > construction > comfort)
- Communicate their status clearly (thought bubbles, status icons)
- Handle routine tasks independently
- Have lives outside of work (rest, socialize, wander)
- Never stand idle when work exists
- Never require micromanagement for basic tasks

---

## Existing Systems Audit

The codebase already has substantial NPC and settlement infrastructure from the module system. Phase 2 wires these together into a playable experience.

| System | Status | Location | Notes |
|--------|--------|----------|-------|
| NPC lifecycle & spawning | **Functional** | `modules/npc-system/NPCManager.js` | Full NPC entity with attributes, skills, position, needs, personality, combat stats |
| Pathfinding (A*) | **Functional** | `modules/npc-system/PathfindingService.js` | 3D grid navigation, obstacle avoidance, path smoothing |
| NPC needs (food, rest, social, shelter) | **Functional** | `modules/npc-system/NPCNeedsTracker.js` | Decay over time, critical alerts, happiness impact |
| Autonomous decisions | **Functional** | `modules/npc-system/AutonomousDecision.js` | Priority-based action selection |
| NPC commands & formations | **Functional** | `modules/npc-system/NPCCommand.js` | MOVE_TO, FOLLOW, PATROL, RALLY, formations |
| NPC personality & relationships | **Functional** | `modules/npc-system/NPCPersonality.js` | Traits (INDUSTRIOUS, SOCIAL, BRAVE), compatibility |
| NPC visual feedback | **Functional** | `modules/npc-system/NPCVisualFeedback.js` | Thought bubbles, path preview, status indicators |
| Idle tasks | **Functional** | `modules/npc-system/IdleTaskManager.js` | WANDER, REST, SOCIALIZE, INSPECT |
| NPC work assignments | **Basic** | `modules/npc-system/NPCAssignment.js` | Slot allocation, needs expansion |
| Building definitions & tiers | **Functional** | `modules/building-types/BuildingConfig.js` | SURVIVAL→PERMANENT→TOWN→CASTLE, costs, effects |
| Building catalog | **Functional** | `modules/building-types/constants/buildings.js` | WALL, DOOR, CHEST, TOWER, WATCHTOWER, etc. |
| Tier progression | **Functional** | `modules/building-types/TierProgression.js` | Tier requirements and advancement |
| Territory management | **Functional** | `modules/territory-town/TerritoryManager.js` | Territory dimensions, expansion costs |
| Town population management | **Basic** | `modules/territory-town/TownManager.js` | Tracking, assignments, happiness — needs depth |
| Resource economy | **Functional** | `modules/resource-economy/ResourceEconomyModule.js` | Production ticks, consumption, storage |
| Grid & spatial partitioning | **Functional** | `modules/foundation/GridManager.js`, `SpatialPartitioning.js` | 3D grid, chunk-based indexing, radius queries |
| Behavior trees & AI | **Functional** | `modules/ai/NPCBehaviorSystem.js` | Decision trees, personality-driven, daily schedules |
| Companion AI | **Functional** | `modules/ai/CompanionAISystem.js` | Follow, combat assist, gather, command system |
| NPC rendering | **Basic** | `rendering/useNPCRenderer.js` | 2D sprite/marker — needs 3D voxel upgrade |
| NPC UI components | **Basic** | `components/npc/NPCListView.jsx`, `NPCDetailCard.jsx` | List + detail views, need settlement dashboard |
| Zone designation | **Missing** | — | No work zone or stockpile zone system |
| NPC task work loop | **Missing** | — | Autonomous decision system exists but not wired to mine/haul/build tasks |
| Stockpile system | **Missing** | — | StorageManager exists for capacity tracking but no physical stockpile zones |
| NPC arrival/immigration | **Missing** | — | NPCManager can spawn but no attraction/immigration mechanic |
| Settlement overview UI | **Missing** | — | No dashboard for managing the settlement at a glance |

---

## Task Breakdown

### 2.0 Settlement Module Foundation (Week 1)

Before building any settlement subsystem, we need the module shell that integrates with the existing ModuleOrchestrator pattern. All Phase 2 settlement systems live inside this module.

#### 2.0.1 Settlement Module & Orchestrator Registration
**Goal:** Create the settlement module that hosts all Phase 2 subsystems and participates in the game tick lifecycle

**Implementation tasks:**
- [ ] Create `src/modules/settlement/SettlementModule.js`
- [ ] Register module with `ModuleOrchestrator.js` in its constructor
- [ ] Wire up in `GameManager.js` initialization (following CLAUDE.md "Adding New Modules" pattern)
- [ ] Define module lifecycle methods:
  - `initialize()` — create all sub-managers (zone, stockpile, hauling, construction, immigration, housing, task assignment)
  - `update(deltaTime)` — tick sub-managers in correct order
  - `serialize()` / `deserialize()` — delegate to sub-managers for save/load
- [ ] Define inter-module communication points:
  - Settlement → `ResourceEconomyModule`: stockpile deposits/withdrawals sync with global resource tracking
  - Settlement → `NPCManager`: immigration spawns NPCs through NPCManager (not directly)
  - Settlement → `GridManager`: completed constructions registered as buildings
  - Settlement → `TownManager`: population/housing changes forwarded
  - `NPCManager` → Settlement: NPC tick delegates to TaskAssignmentEngine for work decisions
  - `BuildingConfig` → Settlement: building effects and blueprints read from config
- [ ] Sub-manager tick order: Immigration → Zone → Stockpile → Construction → Hauling → TaskAssignment → Housing
- [ ] Add `__tests__/` directory

**Acceptance criteria:**
- [ ] Module registers and receives tick updates from orchestrator
- [ ] All sub-managers accessible through the module
- [ ] Inter-module messages flow correctly
- [ ] Module participates in save/load lifecycle

**Tests:** `SettlementModule.test.js`
- Module initializes all sub-managers
- Tick calls sub-managers in correct order
- Serialize/deserialize round-trips correctly

---

#### 2.0.2 Settlement Store
**Goal:** Dedicated Zustand store for settlement UI state, keeping `useGameStore` focused on core game state

**Implementation tasks:**
- [ ] Create `src/stores/useSettlementStore.js`
- [ ] Store shape:
  ```js
  {
    zones: [],                    // zone list for rendering
    stockpiles: {},               // stockpile contents for UI
    constructionSites: [],        // active construction for UI
    immigrationNextCheck: 0,      // countdown for dashboard
    attractivenessScore: 0,       // current score for debug/dashboard
    settlementAlerts: [],         // alerts for dashboard
    selectedNpcId: null,          // currently selected NPC
    selectedBuildingId: null,     // currently selected building
    dashboardOpen: false,
    zoneDesignatorActive: false,
    zoneDesignatorType: null,
  }
  ```
- [ ] Settlement module writes to this store via refs (not React render cycle)
- [ ] UI components read from this store via hooks

**Acceptance criteria:**
- [ ] Store provides all data needed by settlement UI components
- [ ] Game logic writes to store without triggering React re-renders in game loop
- [ ] UI components reactively update when store changes

---

#### 2.0.3 Performance Baseline Measurement
**Goal:** Measure current frame budget before adding Phase 2 systems, so we know exactly how much headroom exists

**Implementation tasks:**
- [ ] Create a performance test scenario: player in world with terrain loaded, existing systems active
- [ ] Measure average frame time and identify top consumers (terrain, React reconciliation, existing modules)
- [ ] Document available headroom (target: at least 6-8ms free for Phase 2 systems)
- [ ] If headroom is less than 6ms, move pathfinding to Web Worker before proceeding (see 2.5.4)
- [ ] Record baseline in `docs/research/PERFORMANCE_BASELINE.md` (update existing file)

**Acceptance criteria:**
- [ ] Current frame budget documented with breakdown
- [ ] Phase 2 system budget allocation confirmed as feasible
- [ ] Go/no-go decision on pathfinding worker made

---

### 2.1 NPC Arrival & Immigration (Week 1-2)

NPCs don't appear from thin air — they wander in from the wilderness, attracted by the player's settlement. This is the colony equivalent of rift-based spawning: arrivals have a visible, logical origin.

#### 2.1.1 Settlement Attractiveness Score
**Goal:** Calculate how attractive the player's settlement is to potential settlers

**Implementation tasks:**
- [ ] Create `src/modules/settlement/AttractivenessCalculator.js`
- [ ] Calculate score based on:
  - Buildings placed (type and tier weighted): +5 per Survival, +15 per Permanent, +30 per Town
  - Campfire/hearth: +20 (base attractor — "the light that draws them in")
  - Available housing capacity: +10 per unoccupied bed/shelter slot
  - Food stockpile: +5 per 10 food units stored
  - Defensive structures: +10 per wall section, +20 per watchtower
  - Active rifts within 128 blocks: -15 per rift (danger repels settlers)
  - Current population happiness (average): ×0.5 at 0% to ×1.5 at 100%
- [ ] Expose `getAttractivenessScore()` to game systems
- [ ] Store score in game state, recalculate every 60 seconds
- [ ] Add attractiveness to debug overlay

**Tuning constants (in `tuning.js`):**
```
ATTRACTIVENESS_CAMPFIRE_BONUS = 20
ATTRACTIVENESS_PER_SURVIVAL_BUILDING = 5
ATTRACTIVENESS_PER_PERMANENT_BUILDING = 15
ATTRACTIVENESS_PER_TOWN_BUILDING = 30
ATTRACTIVENESS_PER_HOUSING_SLOT = 10
ATTRACTIVENESS_PER_FOOD_UNIT = 0.5       (per unit in stockpile)
ATTRACTIVENESS_PER_WALL = 10
ATTRACTIVENESS_PER_WATCHTOWER = 20
ATTRACTIVENESS_RIFT_PENALTY = -15         (per rift within 128 blocks)
ATTRACTIVENESS_HAPPINESS_MIN_MULT = 0.5
ATTRACTIVENESS_HAPPINESS_MAX_MULT = 1.5
```

**Acceptance criteria:**
- [ ] Score increases when player builds structures
- [ ] Score decreases with nearby rifts
- [ ] Score reflects population happiness
- [ ] Available housing boosts score
- [ ] Score recalculates periodically without performance impact

**Tests:** `AttractivenessCalculator.test.js`
- Empty world returns 0
- Campfire alone returns base bonus
- Multiple buildings stack correctly
- Rift penalty applies
- Happiness multiplier scales correctly

---

#### 2.1.2 NPC Immigration System
**Goal:** NPCs arrive at the settlement based on attractiveness score

**Implementation tasks:**
- [ ] Create `src/modules/settlement/ImmigrationManager.js`
- [ ] Immigration check runs every `IMMIGRATION_CHECK_INTERVAL` seconds (default: 300 = 5 real minutes)
- [ ] Immigration chance per check: `min(attractiveness / 200, 0.8)` (caps at 80%)
- [ ] On successful check, spawn NPC at world edge (64-96 blocks from settlement center)
- [ ] NPC walks toward settlement center over 30-60 seconds (visible approach)
- [ ] On arrival, NPC "evaluates" the settlement for 10 seconds (looks around, thought bubble: "🏠?")
- [ ] NPC joins if attractiveness ≥ `IMMIGRATION_MIN_ATTRACTIVENESS` (default: 25)
- [ ] Housing and population rules:
  - The very first NPC can join without housing (hardy pioneer — sleeps by campfire, -20 happiness)
  - All subsequent NPCs require available housing to join
  - If an NPC arrives and no housing is available: NPC waits 1 in-game day, then leaves if still no housing
  - Population cap: `max(1, housingCapacity)` — first settler is free, rest need beds
  - Hard cap: 20 NPCs for Phase 2 (performance guard)
- [ ] First NPC arrives after placing campfire + any shelter (tutorial trigger) — but the first NPC joins even without shelter
- [ ] Generate NPC with random personality, name, and appearance using `NPCPersonality.js`
- [ ] Announce arrival: toast notification "A new settler has arrived: [Name]!"

**NPC approach behavior:**
```
1. Spawn at random point 64-96 blocks from settlement center
2. Pathfind toward campfire/town center
3. Walk at 0.6× normal speed (cautious approach)
4. On arrival, play "looking around" animation (head turns)
5. Show thought bubble: housing icon with "?"
6. After 10s evaluation:
   a. If first NPC ever → always join (pioneer), show "😊" bubble, notification
   b. If attractiveness >= threshold AND housing available → join, show "😊" bubble, notification
   c. If no housing → show "🏠❌" bubble, wait 1 day
   d. If attractiveness too low → show "😟" bubble, walk away
7. Edge cases:
   - During rift attack: immigration check skipped (NPCs won't approach danger)
   - During night: NPC spawns but waits at edge until dawn to approach
   - Multiple NPCs: max 1 arrival per immigration check (prevent swarm)
```

**Tuning constants:**
```
IMMIGRATION_CHECK_INTERVAL = 300          (seconds between checks)
IMMIGRATION_MIN_ATTRACTIVENESS = 25       (minimum score to join)
IMMIGRATION_MAX_CHANCE = 0.8              (cap on per-check probability)
IMMIGRATION_SPAWN_MIN_DISTANCE = 64       (blocks from center)
IMMIGRATION_SPAWN_MAX_DISTANCE = 96
IMMIGRATION_APPROACH_SPEED_MULT = 0.6
IMMIGRATION_EVALUATION_TIME = 10          (seconds)
IMMIGRATION_HOUSING_WAIT_DAYS = 1         (in-game days before leaving)
NPC_FIRST_SETTLER_FREE = true            (first NPC joins without housing)
NPC_MAX_POPULATION_PHASE_2 = 20          (hard cap for performance)
```

**Acceptance criteria:**
- [ ] First NPC arrives shortly after campfire + shelter built
- [ ] NPCs visibly walk in from the wilderness (not teleported)
- [ ] NPC evaluates settlement before joining
- [ ] Arrival announced via toast notification
- [ ] No arrivals when attractiveness is too low
- [ ] First NPC joins even without housing (pioneer mechanic)
- [ ] Subsequent NPCs require available housing
- [ ] Population hard-capped at 20
- [ ] NPC leaves if no housing becomes available
- [ ] Immigration skipped during active rift attacks
- [ ] NPCs wait at edge until dawn if arriving at night

**Tests:** `ImmigrationManager.test.js`
- Immigration chance scales with attractiveness
- Chance caps at maximum
- Population cap enforced
- NPC spawns at correct distance range
- Low attractiveness prevents immigration
- Housing check works correctly

---

#### 2.1.3 NPC Identity Generation
**Goal:** Each NPC feels unique with a generated name, appearance, and personality

**Implementation tasks:**
- [ ] Create `src/data/npcNames.js` with name pools (first names, surnames, ~100 each)
- [ ] Generate appearance parameters: skin tone (index 0-5), hair color (index 0-7), clothing color (index 0-9)
- [ ] Assign 2-3 personality traits from `NPCPersonality.js` (INDUSTRIOUS, SOCIAL, BRAVE, CAUTIOUS, CREATIVE, etc.)
- [ ] Generate preferred job type based on traits:
  - INDUSTRIOUS → prefers mining/building
  - CREATIVE → prefers building/crafting
  - BRAVE → prefers guarding/combat
  - SOCIAL → prefers trading/hauling
- [ ] Generate base skill levels (0.5-1.5 multiplier per skill: mining, building, combat, gathering)
- [ ] Store all identity data on NPC entity
- [ ] Persist in save/load

**Acceptance criteria:**
- [ ] No two NPCs have the same name in a session
- [ ] Personality traits visibly affect behavior (industrious NPC works faster)
- [ ] Appearance variety is noticeable (different colored voxel models)
- [ ] Identity persists across save/load

---

### 2.2 Zone Designation System (Week 2-3)

Players designate areas for specific purposes. Zones tell NPCs *where* to work — not *how* to work.

#### 2.2.1 Zone Manager
**Goal:** Players can designate rectangular zones for mining, stockpile, farming, and building

**Implementation tasks:**
- [ ] Create `src/modules/settlement/ZoneManager.js`
- [ ] Zone types: `MINING`, `STOCKPILE`, `FARMING`, `BUILDING`, `RESTRICTED`
- [ ] Zone data: `{ id, type, bounds: {min, max}, priority: 1-5, active: boolean }`
- [ ] Zones stored as axis-aligned 3D bounding boxes
- [ ] Zone overlap rules:
  - STOCKPILE zones cannot overlap other STOCKPILE zones
  - MINING zones can overlap (merged into one work area)
  - RESTRICTED zones override all others — NPCs will not pathfind through or work in RESTRICTED zones (use cases: block off dangerous areas near rifts, reserve space for future building, prevent NPCs from entering player's personal area)
- [ ] Maximum zones: 20 per type (performance guard)
- [ ] Persist zones in save/load
- [ ] Expose zone list to game store for rendering and NPC queries

**Acceptance criteria:**
- [ ] Player can create zones of each type
- [ ] Zones persist across save/load
- [ ] Overlap rules enforced
- [ ] Zone limit enforced with user-friendly message
- [ ] Zones queryable by type and position

**Tests:** `ZoneManager.test.js`
- Create/delete zones
- Overlap detection
- Query zones by type
- Query zones containing position
- Zone limit enforcement
- Save/load roundtrip

---

#### 2.2.2 Zone Placement UI
**Goal:** Intuitive UI for designating zones in the 3D world

**Implementation tasks:**
- [ ] Create `src/components/ui/ZoneDesignator.jsx`
- [ ] Enter zone mode via settlement management panel (or hotkey: Z)
- [ ] Zone type selector: toolbar with icons for each zone type
- [ ] Placement: click + drag to define rectangular area on terrain surface
  - First click sets corner 1
  - Drag shows preview rectangle with colored overlay
  - Release sets corner 2
  - Height auto-detected from terrain (surface to surface + 4 blocks for mining)
- [ ] Zone rendering: `PlaneGeometry` meshes with transparent `MeshBasicMaterial` positioned at zone bounds (not instanced voxels — zones are flat ground overlays)
  - Render via dedicated `src/rendering/useZoneRenderer.js` hook (follows existing renderer pattern)
  - MINING: orange (opacity 0.3)
  - STOCKPILE: blue (opacity 0.3)
  - FARMING: green (opacity 0.3)
  - BUILDING: yellow (opacity 0.3)
  - RESTRICTED: red (opacity 0.4, slightly more visible)
- [ ] Right-click zone to adjust priority (1-5) or delete
- [ ] Mobile: tap to start, tap to finish (no drag — two-tap placement)
- [ ] Zone labels floating above the zone ("Mining Zone", "Stockpile A")
- [ ] Zone visibility toggle (show/hide all zone overlays)

**Acceptance criteria:**
- [ ] Click-drag creates a zone with correct bounds
- [ ] Zone preview visible during placement
- [ ] Zone overlay colors match type
- [ ] Can delete zones
- [ ] Can adjust priority
- [ ] Works on both desktop and mobile
- [ ] Zone overlays don't tank FPS (instanced rendering)

---

#### 2.2.3 Mining Zone Behavior
**Goal:** NPCs autonomously mine blocks within designated mining zones

**Implementation tasks:**
- [ ] When a MINING zone is created, scan all non-air blocks within bounds
- [ ] Generate mining tasks for each solid block, prioritized by:
  - Ore blocks first (highest value)
  - Surface blocks before deep blocks (accessibility)
  - Blocks adjacent to air (already exposed faces)
- [ ] NPCs with mining skill claim tasks from the zone's task queue
- [ ] Mining speed affected by NPC skill level and equipped tool
- [ ] Mined blocks drop items (use Phase 1 blockDrops.js)
- [ ] Dropped items generate hauling tasks to nearest STOCKPILE zone
- [ ] Mining tasks regenerate if zone is expanded or new blocks placed within
- [ ] Zone progress indicator: "Mining Zone A: 45/120 blocks mined"

**Acceptance criteria:**
- [ ] NPCs mine blocks within designated mining zone
- [ ] Mining prioritizes valuable blocks
- [ ] Mined resources get hauled to stockpile
- [ ] Zone shows progress
- [ ] Multiple NPCs can work the same zone simultaneously (no conflicts)

---

#### 2.2.4 Farming Zone Behavior
**Goal:** NPCs autonomously plant, tend, and harvest crops in designated farming zones

**Implementation tasks:**
- [ ] FARMING zone requires a completed Farm Plot building within or adjacent to the zone
- [ ] Farm lifecycle per plot tile: `EMPTY → PLANTED → GROWING → READY → HARVESTED → EMPTY`
  - PLANTED: NPC "plants" crop (2 seconds of work)
  - GROWING: automatic timer, `FARM_GROW_TIME` seconds (default: 300 = 5 real minutes)
  - READY: NPC "harvests" crop (2 seconds of work), yields food items
  - HARVESTED: brief cooldown, then returns to EMPTY
- [ ] Farming tasks generated automatically:
  - PLANT tasks for empty tiles
  - HARVEST tasks for ready tiles
  - Tending is passive (no NPC action during GROWING — just a timer)
- [ ] Crop yield: `FARM_HARVEST_YIELD` food units per tile (default: 4)
- [ ] Unattended farms: if no NPC is assigned, crops still grow but harvest sits unharvested. The 25% passive production from open question 10 means: unharvested READY crops auto-collect at 25% rate every `FARM_GROW_TIME` (food appears in nearest stockpile)
- [ ] Farm zone capacity = number of ground tiles in zone
- [ ] Maximum 2 farmer NPCs per farm zone

**Tuning constants:**
```
FARM_GROW_TIME = 300                     (seconds per growth cycle)
FARM_HARVEST_YIELD = 4                   (food per tile per harvest)
FARM_PLANT_TIME = 2                      (seconds to plant)
FARM_HARVEST_TIME = 2                    (seconds to harvest)
FARM_UNATTENDED_RATE = 0.25             (passive collection rate when no farmer)
MAX_FARMERS_PER_ZONE = 2
```

**Acceptance criteria:**
- [ ] NPCs plant and harvest crops autonomously
- [ ] Crops grow over time without NPC intervention
- [ ] Harvested food generates hauling tasks to stockpile
- [ ] Unattended farms produce at reduced rate
- [ ] Farm zone requires adjacent Farm Plot building

**Tests:** `FarmingZone.test.js`
- Farm lifecycle progresses correctly
- Harvest generates correct food yield
- Unattended rate applies correctly
- Task generation for plant/harvest
- Zone requires Farm Plot building

---

### 2.3 Stockpile System (Week 3-4)

Stockpiles are physical locations where resources are stored. They bridge mining/gathering and construction/crafting.

#### 2.3.1 Stockpile Manager
**Goal:** Physical resource storage zones that NPCs deliver to and withdraw from

**Implementation tasks:**
- [ ] Create `src/modules/settlement/StockpileManager.js`
- [ ] Stockpile zone creates a grid of storage slots within its bounds
- [ ] Each slot holds one resource type and quantity (stack limit: 64)
- [ ] Stockpile capacity = number of ground-level blocks in zone × stack limit
- [ ] Resource filter: stockpiles can accept all resources or be filtered (e.g., "wood only")
- [ ] Slot operations:
  - `deposit(stockpileId, resourceType, quantity)` — find matching or empty slot
  - `withdraw(stockpileId, resourceType, quantity)` — find slot with resource
  - `reserve(stockpileId, slotIndex)` — prevent double-booking
  - `release(stockpileId, slotIndex)` — cancel reservation
- [ ] Integrate with `ResourceEconomyModule.js` for global resource tracking
- [ ] Visual: resource items rendered on stockpile ground via dedicated `src/rendering/useStockpileRenderer.js` hook (follows existing renderer pattern, uses instanced meshes per resource type)
- [ ] Persist stockpile contents in save/load

**Stockpile slot layout:**
```
Stockpile (5×3 ground area = 15 slots):
  [Stone:42] [Stone:64] [Wood:30]  [Iron:12]  [Empty]
  [Coal:20]  [Empty]    [Empty]    [Empty]    [Empty]
  [Berry:15] [Meat:8]   [Empty]    [Empty]    [Empty]
```

**Acceptance criteria:**
- [ ] Resources can be deposited and withdrawn
- [ ] Reservation prevents two NPCs claiming same slot
- [ ] Resource items visible on stockpile ground
- [ ] Filtered stockpiles only accept designated resources
- [ ] Capacity limit enforced
- [ ] Contents persist in save/load

**Tests:** `StockpileManager.test.js`
- Deposit adds to correct slot
- Withdraw removes correct amount
- Reservation prevents double-booking
- Filter rejects wrong resource type
- Capacity overflow handled gracefully
- Save/load roundtrip preserves contents

---

#### 2.3.2 Hauling Task System
**Goal:** NPCs autonomously move resources between locations (mine → stockpile → construction site)

**Implementation tasks:**
- [ ] Create `src/modules/settlement/HaulingManager.js`
- [ ] Haul task: `{ id, source: {position, type}, destination: {stockpileId, constructionSiteId}, resourceType, quantity, status, assignedNpc }`
- [ ] Task lifecycle (simplified — 4 states): `PENDING → PICKING_UP → DELIVERING → COMPLETED`
  - PENDING: no NPC assigned yet
  - PICKING_UP: NPC claimed task, pathfinding to source and collecting items
  - DELIVERING: NPC has items, pathfinding to destination and depositing
  - COMPLETED: items delivered, task removed from queue
- [ ] Haul tasks generated automatically by:
  - Mining zone: mined blocks → nearest stockpile
  - Construction site: stockpile → construction site (material delivery)
  - Overflow: full stockpile → stockpile with space
- [ ] NPC carrying capacity: 1 resource stack at a time (fixed for Phase 2 — backpack items deferred to Phase 3)
- [ ] Hauling priority:
  1. Construction materials (keep builders unblocked)
  2. Food (prevent starvation)
  3. Valuable resources (ore, rare drops)
  4. General resources
- [ ] Task timeout: if NPC hasn't completed in 5 minutes, release claim
- [ ] NPC shows carried item visually (small item above head or in hands)

**Acceptance criteria:**
- [ ] NPCs pick up dropped items and deliver to stockpiles
- [ ] NPCs deliver construction materials to building sites
- [ ] Priority system ensures important hauls happen first
- [ ] Task timeout prevents stuck claims
- [ ] Carried item visible on NPC

**Tests:** `HaulingManager.test.js`
- Task generation from mining drops
- Task generation from construction needs
- Priority ordering
- Timeout and release
- NPC claiming prevents double-assignment

---

### 2.4 Construction System (Week 4-6)

NPCs build structures from blueprints placed by the player. This is the beating heart of Phase 2.

#### 2.4.1 Blueprint System
**Goal:** Player places building blueprints that NPCs construct

**Implementation tasks:**
- [ ] Create `src/modules/settlement/BlueprintManager.js`
- [ ] Blueprint definition: `{ id, name, blocks: [{offset, blockType}], requirements: {resourceType: quantity}, buildOrder: [{offset, blockType}], rotatable: boolean }`
- [ ] Blueprint rotation: 90° increments (0°, 90°, 180°, 270°) — uses existing rotation rules in `shared/config.js`
  - Player cycles rotation with R key (or tap rotation button on mobile) during placement
  - Block offsets transformed by rotation matrix before validation and placement
  - Ghost preview updates to show rotated orientation
- [ ] Define blueprints for Phase 2 buildings:
  - **Shelter** (5×4×3): 20 wood — basic housing for 1 NPC
  - **House** (7×5×4): 40 wood, 30 stone — housing for 2 NPCs
  - **Storage Shed** (6×4×3): 30 wood, 10 stone — adds 4 stockpile slots
  - **Workbench Station** (3×3×2): 15 wood, 5 stone — enables advanced crafting
  - **Campfire** (3×1×3): 5 wood, 5 stone — base settlement attractor
  - **Farm Plot** (8×1×8): 10 wood — food production (2 food per in-game day)
  - **Well** (3×3×3): 20 stone — NPC happiness +10
  - **Watchtower** (4×8×4): 30 wood, 40 stone, 10 iron — defense, extends territory view
- [ ] Build order: foundation (y=0) → walls (y=0, edges) → interior → roof (y=max)
- [ ] Blueprint placement in world:
  - Player selects blueprint from building menu
  - Ghost preview shows placement (green = valid, red = invalid)
  - Validation: flat terrain (≤2 block height variance), no overlap with existing buildings, within territory
  - Click/tap to place
  - Blueprint blocks rendered as translucent ghost blocks
- [ ] Construction site created at placement position

**Blueprint validation rules:**
```
1. Terrain under footprint is within 2 blocks of flat
2. No overlap with existing buildings (check GridManager)
3. Within territory bounds (TerritoryManager)
4. No overlap with active rift corruption zones
5. Minimum 2 blocks from other buildings (fire code 😄)
6. Rotation applied to footprint before all above checks
```

**Acceptance criteria:**
- [ ] Player can browse and select building blueprints
- [ ] Ghost preview shows before placement
- [ ] Validation prevents invalid placement (red highlight + reason)
- [ ] Placed blueprint creates construction site with ghost blocks
- [ ] All Phase 2 buildings have correct resource requirements
- [ ] Blueprints can be rotated in 90° increments during placement
- [ ] Rotated blueprints validate correctly against terrain and buildings

**Tests:** `BlueprintManager.test.js`
- Blueprint validation on flat ground succeeds
- Blueprint validation on uneven ground fails
- Overlap detection works
- Territory bounds enforced
- Resource requirements match building config
- Rotation transforms block offsets correctly
- Rotated blueprint validates against terrain

---

#### 2.4.2 Construction Site Management
**Goal:** Track building progress from blueprint to completion

**Implementation tasks:**
- [ ] Create `src/modules/settlement/ConstructionManager.js`
- [ ] Construction site: `{ id, blueprintId, position, status, blocksPlaced, blocksTotal, deliveredMaterials: {}, requiredMaterials: {} }`
- [ ] Site status flow: `PLACED → AWAITING_MATERIALS → IN_PROGRESS → COMPLETE`
- [ ] On site creation:
  1. Calculate required materials from blueprint
  2. Generate hauling tasks for each material type (from nearest stockpile)
  3. Render ghost blocks at each blueprint position
- [ ] Material delivery:
  - NPCs haul materials to construction site
  - Track delivered vs. required per resource type
  - When all materials delivered → status = IN_PROGRESS
- [ ] Block placement:
  - Builder NPCs claim build tasks (one block at a time)
  - Build order: bottom-up, outside-in (foundation, walls, interior, roof)
  - Each block takes `BUILD_TIME_PER_BLOCK` seconds (default: 3)
  - Ghost block becomes solid when placed
  - Builder skill speeds construction: `time = base / (0.5 + npcBuildSkill)`
- [ ] Construction progress bar visible above site
- [ ] On completion:
  - Site becomes a registered building in `GridManager`
  - Building effects activate (housing capacity, production, etc.)
  - Toast notification: "Construction complete: [Building Name]!"
  - NPCs assigned to building begin working

**Construction flow:**
```
Player places blueprint
    → Construction site created (ghost blocks visible)
    → Hauling tasks generated for required materials
    → Haulers deliver materials to site
    → When all materials present → build phase begins
    → Builder NPCs place blocks in build order (bottom → top)
    → Each block: 3 seconds of work → ghost becomes solid
    → Final block placed → building complete
    → Building registered, effects activated
```

**Tuning constants:**
```
BUILD_TIME_PER_BLOCK = 3                 (seconds per block placed)
BUILDER_SKILL_BASE = 0.5                 (minimum skill factor)
MAX_BUILDERS_PER_SITE = 3                (prevent crowding)
CONSTRUCTION_MATERIAL_SEARCH_RADIUS = 128 (blocks to search for stockpiles)
```

**Acceptance criteria:**
- [ ] Construction sites show ghost blocks
- [ ] NPCs haul required materials to site
- [ ] Builder NPCs place blocks in correct order
- [ ] Progress bar shows construction progress
- [ ] Completed building becomes functional
- [ ] Multiple builders can work one site (up to cap)
- [ ] Construction pauses if materials run out

**Tests:** `ConstructionManager.test.js`
- Site creation generates correct material requirements
- Material delivery tracking
- Build order correctness (bottom-up)
- Completion triggers building registration
- Multiple builders don't exceed cap
- Pause when materials exhausted

---

#### 2.4.3 Building Effects & Upgrades
**Goal:** Completed buildings provide tangible gameplay benefits

**Implementation tasks:**
- [ ] Wire `BuildingConfig.js` effects to completed buildings:
  - **Shelter/House**: increases population cap (housing capacity)
  - **Storage Shed**: adds stockpile capacity
  - **Workbench**: enables advanced crafting recipes
  - **Campfire**: settlement attractor, light source, cooking
  - **Farm Plot**: produces food passively (2 food per in-game day when staffed)
  - **Well**: NPC happiness +10 (proximity bonus, 16-block radius)
  - **Watchtower**: extends territory vision, defense bonus, enemy detection range
- [ ] Building aura system: buildings affect nearby area
  - Well: happiness aura (16 blocks)
  - Campfire: warmth aura (10 blocks) — shelter bonus at night
  - Watchtower: detection aura (48 blocks)
- [ ] Tier upgrade path:
  - Shelter (Survival) → House (Permanent): requires 40 wood, 30 stone, 1 builder NPC
  - House (Permanent) → Manor (Town): requires 80 stone, 20 iron, 2 builder NPCs
  - Upgrade is in-place: NPC works on existing building, blocks replaced over time
- [ ] Upgrade UI: click building → "Upgrade" button showing requirements and benefits
- [ ] Partially damaged buildings lose proportional effects

**Acceptance criteria:**
- [ ] Each building type provides its documented effects
- [ ] Auras affect NPCs within radius
- [ ] Buildings can be upgraded to next tier
- [ ] Upgrade visually changes the building (block types change)
- [ ] Damaged buildings have reduced effects

---

### 2.5 NPC Work Loop (Week 5-7)

This section wires the autonomous decision system to the zone/task infrastructure.

#### AI System Authority Hierarchy

Multiple existing AI systems make NPC decisions. To prevent conflicts, they operate in a strict priority chain:

```
1. NPCBehaviorSystem.js  — owns the SCHEDULE (when to work, eat, sleep)
   ↓ during work periods, delegates to:
2. AutonomousDecision.js  — handles INTERRUPTS (critical needs, emergencies)
   ↓ if no interrupt, delegates to:
3. TaskAssignmentEngine.js — resolves WHAT WORK to do (mine, haul, build)
   ↓ only for player-commanded companions:
4. CompanionAISystem.js   — overrides work assignment with player commands
```

- `NPCBehaviorSystem` determines the current schedule phase (work/eat/sleep/social). During work phases, it asks `AutonomousDecision` if any interrupt is needed.
- `AutonomousDecision` checks critical needs and emergencies. If none, it defers to `TaskAssignmentEngine` for work selection.
- `TaskAssignmentEngine` only runs during work periods for idle NPCs. It scores and claims tasks.
- `CompanionAISystem` applies ONLY to NPCs the player has explicitly commanded (follow, stay, etc.) — not to settler NPCs doing autonomous work.

#### 2.5.1 NPC Task Assignment Engine
**Goal:** NPCs autonomously find and perform work from available tasks

**Implementation tasks:**
- [ ] Create `src/modules/settlement/TaskAssignmentEngine.js`
- [ ] Task types: `MINE`, `HAUL`, `BUILD`, `GATHER`, `FARM`, `GUARD`
- [ ] Each game tick (every 2 seconds), for each idle NPC in a work schedule phase:
  1. `NPCBehaviorSystem` confirms NPC is in WORK period
  2. `AutonomousDecision` checks for interrupts (critical needs, emergencies) — if triggered, skip work
  3. Query available tasks from all zones and construction sites
  4. Score each task:
     ```
     score = (priority × 100)
           + (skillMatch × 50)
           - (distance × 1)
           - (personalityMismatch × 20)
           + (varietyBonus × 15)
     ```
  5. Claim highest-scoring task
  6. Pathfind to task location
  7. Execute task (mine, haul, build, etc.)
  8. On completion: release task, return to step 1
- [ ] NPC skill matching:
  - INDUSTRIOUS NPCs get +50% score for mining/building tasks
  - BRAVE NPCs get +50% score for guard tasks
  - SOCIAL NPCs get +25% score for hauling (they like moving around)
- [ ] Variety bonus: NPCs get +15 score for task types they haven't done in the last 3 tasks (prevents over-specialization, keeps NPCs feeling dynamic)
- [ ] Task failure handling:
  - Path blocked → retry with alternate path, then release task
  - Resource unavailable → release task, mark as blocked
  - NPC interrupted (attacked, critical need) → release task gracefully
- [ ] Update `FORMULAS.md` with the task scoring formula and variety bonus

**NPC work state machine:**
```
IDLE
  │ task available
  ▼
EVALUATING_TASKS
  │ best task found
  ▼
TRAVELING_TO_TASK
  │ arrived
  ▼
WORKING (mine / haul / build / gather / farm)
  │ complete or interrupted
  ▼
RETURNING_TO_IDLE
  │
  ▼
IDLE
```

**Acceptance criteria:**
- [ ] Idle NPCs find work within 5 seconds
- [ ] NPCs prioritize critical needs over work
- [ ] Skill matching produces visible specialization (miners mine, builders build)
- [ ] Task conflicts resolved (no two NPCs on same task)
- [ ] Interruptions handled gracefully (NPC resumes after need satisfied)

**Tests:** `TaskAssignmentEngine.test.js`
- Scoring: closer task scores higher (distance penalty)
- Scoring: skill match boosts score
- Scoring: personality match boosts score
- Critical needs override work
- Task claiming prevents double-assignment
- Task release on failure

---

#### 2.5.2 NPC Work Animations & Feedback
**Goal:** NPCs visually communicate what they're doing

**Implementation tasks:**
- [ ] NPC work states have distinct visual feedback:
  - **Mining**: pickaxe swing animation (simple bob), particles at block face
  - **Hauling**: item icon floating above NPC, slightly slower movement
  - **Building**: hammer animation, block placement particles
  - **Gathering**: bend/stand cycle
  - **Idle**: occasional head turn, slow wander
  - **Needs**: hunger icon (🍖), sleep icon (💤), social icon (💬) as thought bubbles
- [ ] Thought bubble system (uses existing `NPCVisualFeedback.js`):
  - Show above NPC head as a small billboard sprite
  - Duration: 3 seconds, fade out
  - Priority: need icons > work status > idle thoughts
- [ ] NPC name label: small text above NPC, visible within 16 blocks
- [ ] Selection highlight: golden outline when player clicks NPC
- [ ] Status bar below name: health bar (red), if NPC is in combat

**Acceptance criteria:**
- [ ] Player can tell what each NPC is doing at a glance
- [ ] Thought bubbles communicate needs clearly
- [ ] Work animations distinguish different task types
- [ ] NPC names visible at reasonable distance
- [ ] Selection highlight makes clicked NPC obvious

---

#### 2.5.3 NPC 3D Voxel Model
**Goal:** Replace 2D sprite NPCs with simple 3D voxel characters

**Implementation tasks:**
- [ ] Create `src/rendering/NPCVoxelModel.js`
- [ ] Simple voxel humanoid: head (2×2×2), body (2×3×2), arms (1×3×1 each), legs (1×3×1 each)
- [ ] Total: ~40 voxels per NPC (low poly for performance)
- [ ] Color from NPC appearance parameters (skin, hair, clothing)
- [ ] Use grouped `Object3D` per NPC with per-limb instanced meshes:
  - One `InstancedMesh` for all NPC heads (same box geometry, different colors via instance color attribute)
  - One for all torsos, one for left arms, one for right arms, one for left legs, one for right legs
  - = 6 draw calls total for ALL NPCs (not per-NPC)
  - Animate by updating each limb's instance matrix (rotation/translation) per frame
  - This avoids custom shaders while keeping draw calls constant regardless of NPC count
- [ ] Simple animations via instance matrix transforms:
  - **Walk**: legs alternate forward/back (rotate around hip), arms counter-swing
  - **Mine**: right arm swings down in arc (rotate around shoulder)
  - **Build**: right arm taps forward (rotate around shoulder)
  - **Idle**: slight whole-body sway (translate Y on root)
- [ ] LOD: beyond 32 blocks, render as colored billboard (existing sprite system)
- [ ] Performance budget: 20 NPCs at <1ms combined render time

**Acceptance criteria:**
- [ ] NPCs render as recognizable voxel humanoids
- [ ] Each NPC has distinct coloring
- [ ] Walk animation plays during movement
- [ ] Work animations play during tasks
- [ ] Performance stays within budget (20 NPCs < 1ms)
- [ ] LOD kicks in at distance

---

#### 2.5.4 Pathfinding Web Worker (Conditional)
**Goal:** Move A* pathfinding off the main thread to maintain frame budget with 8+ NPCs

**Trigger:** Implement this section if the performance baseline (2.0.3) shows less than 6ms of headroom, OR if pathfinding exceeds 2ms during Week 5-6 testing.

**Implementation tasks:**
- [ ] Create `src/systems/workers/PathfindingWorker.js` (follows existing worker infrastructure in `src/systems/workers/`)
- [ ] Worker receives: start position, goal position, grid snapshot (relevant chunks only)
- [ ] Worker returns: path array or failure
- [ ] Async request/response pattern:
  - `requestPath(npcId, start, goal)` → returns Promise
  - NPC continues current activity while path computes
  - On result: NPC begins following new path
- [ ] Stale path handling: if world changes during computation (block mined, building placed), mark path as potentially stale. NPC re-requests if it encounters an unexpected obstacle.
- [ ] Stagger requests: max 2 pathfinding requests in flight per frame (prevent worker saturation)
- [ ] Fallback: if worker fails or takes >500ms, compute simple straight-line path on main thread

**Acceptance criteria:**
- [ ] Pathfinding runs off main thread
- [ ] NPC movement feels responsive (no visible delay for short paths)
- [ ] Stale paths detected and re-requested
- [ ] Frame budget improved by at least 1.5ms with 8 NPCs

---

### 2.6 NPC Needs & Daily Life (Week 7-8)

NPCs aren't just workers — they have needs, schedules, and social lives.

#### 2.6.1 NPC Needs Simulation
**Goal:** NPCs eat, rest, and socialize on their own

**Implementation tasks:**
- [ ] Wire `NPCNeedsTracker.js` into the game tick loop
- [ ] Need decay rates (per real-time minute):
  - FOOD: -2 (full depletion in ~50 minutes)
  - REST: -1.5 (full depletion in ~67 minutes)
  - SOCIAL: -0.5 (full depletion in ~200 minutes)
  - SHELTER: binary — checked at night, satisfied if NPC has assigned housing
- [ ] Need satisfaction behaviors:
  - FOOD < 30: NPC walks to nearest stockpile with food, eats, +50 food need (NPCs eat from stockpiles only — player inventory is separate)
  - REST < 20: NPC walks to assigned housing (or campfire if no housing), sleeps for 2 minutes, +80 rest
  - SOCIAL < 25: NPC walks to nearest other NPC within 20 blocks, "chats" for 30 seconds, both get +20 social
  - SHELTER (night, unsheltered): NPC walks to assigned housing or nearest shelter
- [ ] Need priorities override work:
  - FOOD < 15 → critical, interrupt any task
  - REST < 10 → critical, interrupt any task
  - SOCIAL < 10 → seek social but don't interrupt urgent work
- [ ] NPC happiness = weighted average of need satisfaction:
  - `happiness = (food × 0.35) + (rest × 0.3) + (social × 0.2) + (shelter × 0.15)`
- [ ] Low happiness effects:
  - happiness < 40: work speed -25%
  - happiness < 20: may refuse work, show "😤" thought bubble
  - happiness < 10 for 3+ in-game days: NPC leaves settlement (warning at day 2)

**Tuning constants:**
```
NPC_FOOD_DECAY_PER_MINUTE = 2
NPC_REST_DECAY_PER_MINUTE = 1.5
NPC_SOCIAL_DECAY_PER_MINUTE = 0.5
NPC_FOOD_CRITICAL = 15
NPC_REST_CRITICAL = 10
NPC_SOCIAL_CRITICAL = 10
NPC_FOOD_RESTORE = 50
NPC_REST_RESTORE = 80
NPC_SOCIAL_RESTORE = 20
NPC_REST_DURATION = 120                  (seconds)
NPC_SOCIAL_DURATION = 30                 (seconds)
NPC_UNHAPPY_SPEED_PENALTY = 0.25
NPC_LEAVE_HAPPINESS_THRESHOLD = 10
NPC_LEAVE_DAYS_BEFORE_DEPARTURE = 3
NPC_LEAVE_WARNING_DAYS = 2
```

**Acceptance criteria:**
- [ ] Hungry NPCs seek food autonomously
- [ ] Tired NPCs rest in housing
- [ ] Lonely NPCs seek social interaction
- [ ] NPCs seek shelter at night
- [ ] Critical needs interrupt work
- [ ] Unhappy NPCs work slower
- [ ] Very unhappy NPCs leave (with warning)
- [ ] Need bars visible when NPC selected

**Tests:** `NPCNeeds.test.js`
- Needs decay at correct rate
- Critical threshold triggers behavior change
- Satisfaction restores correct amount
- Happiness calculation is correct
- Departure timer triggers correctly
- Warning precedes departure

---

#### 2.6.2 NPC Daily Schedule (Extend Existing System)
**Goal:** NPCs follow a natural daily rhythm, not 24/7 work

`NPCBehaviorSystem.js` already has a daily schedule system with activity types (SLEEP, WAKE_UP, EAT_BREAKFAST, WORK, BREAK, EAT_LUNCH, SOCIALIZE, EAT_DINNER, LEISURE, RETURN_HOME, SHELTER, FESTIVAL) and personality-driven modifications. **Do not create a parallel schedule — extend the existing one.**

**Implementation tasks:**
- [ ] Wire `NPCBehaviorSystem.js` existing schedule activities to settlement systems:
  - WORK activity → delegates to `TaskAssignmentEngine` (via authority hierarchy above)
  - EAT_BREAKFAST/EAT_LUNCH/EAT_DINNER → NPC walks to stockpile with food, eats
  - SLEEP/RETURN_HOME → NPC walks to assigned housing (via `HousingManager`)
  - SOCIALIZE/LEISURE → uses existing `IdleTaskManager` SOCIALIZE/WANDER tasks
- [ ] Map world time ranges to existing schedule activities (if not already mapped):
  - **Dawn (0.20-0.30)**: WAKE_UP → EAT_BREAKFAST
  - **Morning (0.30-0.50)**: WORK (highest productivity period)
  - **Midday (0.50-0.55)**: EAT_LUNCH, BREAK
  - **Afternoon (0.55-0.70)**: WORK (normal productivity)
  - **Evening (0.70-0.80)**: EAT_DINNER, SOCIALIZE, LEISURE
  - **Night (0.80-0.20)**: RETURN_HOME, SLEEP
- [ ] Wire personality traits from `NPCPersonality.js` to schedule modifiers:
  - INDUSTRIOUS (maps to WORK_ETHIC): extends WORK periods (+0.05 on each side), shorter BREAK
  - SOCIAL (maps to SOCIABILITY): longer SOCIALIZE periods, shorter WORK
  - BRAVE (maps to BRAVERY): patrols during LEISURE instead of wandering
- [ ] Schedule visible in NPC detail card: "Currently: Working (Morning shift)"
- [ ] NPCs don't work during SLEEP period unless emergency (rift attack)
- [ ] Add settlement-specific activities to behavior system if needed: HAUL, MINE, BUILD, FARM (as sub-types of WORK)

**Acceptance criteria:**
- [ ] NPCs follow a daily routine using the existing schedule system
- [ ] Work happens during WORK activity periods
- [ ] NPCs eat at meal activity times
- [ ] NPCs sleep at SLEEP activity time
- [ ] Personality affects schedule timing
- [ ] Emergencies override schedule
- [ ] No duplicate schedule logic — single source of truth in NPCBehaviorSystem

---

#### 2.6.3 NPC Housing Assignment
**Goal:** NPCs have assigned housing that provides shelter and rest benefits

**Implementation tasks:**
- [ ] Create `src/modules/settlement/HousingManager.js`
- [ ] Each housing building has bed slots (Shelter: 1, House: 2, Manor: 4)
- [ ] Auto-assign NPCs to available beds on arrival
- [ ] NPC housing preferences:
  - Prefer housing near workplace
  - Prefer housing near friends (positive relationships)
  - Avoid housing near NPCs they dislike
- [ ] Reassignment: player can manually reassign NPCs to different housing
- [ ] Homeless NPCs: sleep near campfire, -20 happiness penalty, "Homeless" status
- [ ] Housing quality affects rest restoration:
  - Shelter: +60 rest per sleep cycle
  - House: +80 rest per sleep cycle
  - Manor: +100 rest per sleep cycle

**Acceptance criteria:**
- [ ] NPCs auto-assigned to housing on arrival
- [ ] NPCs sleep in assigned housing at night
- [ ] Housing quality affects rest
- [ ] Homeless NPCs suffer happiness penalty
- [ ] Player can reassign housing

---

### 2.7 Settlement Management UI (Week 8-10)

The player needs at-a-glance tools to understand and direct their settlement.

#### 2.7.1 Settlement Dashboard
**Goal:** Overview panel showing settlement status

**Implementation tasks:**
- [ ] Create `src/components/ui/SettlementDashboard.jsx`
- [ ] Open via hotkey (N) or button in HUD
- [ ] Dashboard sections:
  - **Population**: count, capacity, average happiness bar, immigration status
  - **Resources**: stockpile totals per resource type, production/consumption rates
  - **Buildings**: count per type, construction in progress, upgrade opportunities
  - **Alerts**: homeless NPCs, hungry NPCs, stalled construction, unhappy NPCs about to leave
- [ ] Layout: left panel (tabs) + right panel (detail view)
- [ ] Responsive: full screen on mobile, side panel on desktop
- [ ] Close on Escape or clicking outside

**Dashboard layout:**
```
┌────────────────────────────────────────────────┐
│  Settlement Dashboard           [X]            │
├──────────┬─────────────────────────────────────┤
│          │                                     │
│ [👥 Pop] │  Population: 5/8                    │
│ [📦 Res] │  Happiness: ████████░░ 78%          │
│ [🏠 Bld] │  Immigration: Next check in 2:30    │
│ [⚠ Alert]│                                     │
│          │  ┌─────────────────────────────┐    │
│          │  │ Name     Role     Happiness │    │
│          │  │ Aldric   Miner    ██████░ 85│    │
│          │  │ Bria     Builder  █████░░ 70│    │
│          │  │ Corwin   Hauler   ████░░░ 55│    │
│          │  │ Delia    Guard    ███████ 92│    │
│          │  │ Eamon    Farmer   ██████░ 82│    │
│          │  └─────────────────────────────┘    │
│          │                                     │
├──────────┴─────────────────────────────────────┤
│  [Tip: Build more houses to attract settlers]  │
└────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- [ ] Dashboard shows all key settlement stats
- [ ] Alerts highlight problems requiring attention
- [ ] NPC list with sortable columns
- [ ] Works on mobile and desktop
- [ ] Opens/closes smoothly
- [ ] Data updates in real-time while open

---

#### 2.7.2 NPC Detail Panel
**Goal:** Detailed view of individual NPC status

**Implementation tasks:**
- [ ] Create `src/components/ui/NPCDetailPanel.jsx`
- [ ] Opens when clicking an NPC in-world or from the dashboard list
- [ ] Sections:
  - **Identity**: name, personality traits, portrait (colored voxel head)
  - **Needs**: bars for food, rest, social, shelter status
  - **Skills**: mining, building, combat, gathering (0-5 star rating)
  - **Current activity**: what they're doing and where
  - **Schedule**: current phase of daily schedule
  - **Relationships**: liked/disliked NPCs
  - **Housing**: assigned building, quality
- [ ] Actions:
  - "Follow" — NPC follows player for 2 minutes
  - "Go to" — send NPC to a location
  - "Prioritize" — set preferred work type
  - "Reassign Housing" — pick new housing
- [ ] Close on Escape or clicking elsewhere

**Acceptance criteria:**
- [ ] All NPC information visible
- [ ] Need bars update in real-time
- [ ] Actions work correctly
- [ ] Panel accessible from both world click and dashboard
- [ ] Readable on mobile

---

#### 2.7.3 Building Interaction Panel
**Goal:** Click a building to see status and options

**Implementation tasks:**
- [ ] Create `src/components/ui/BuildingPanel.jsx`
- [ ] Opens when clicking a building in-world
- [ ] Shows:
  - Building name, type, tier
  - Health bar (if damageable)
  - Occupants (assigned NPCs)
  - Production rates (if production building)
  - Storage contents (if storage building)
  - Construction progress (if under construction)
- [ ] Actions:
  - "Upgrade" — show upgrade path, requirements, and confirm button
  - "Assign Worker" — select NPC for this building
  - "Demolish" — destroy building (confirmation required, recovers 50% materials)
  - "Repair" — if damaged, show repair cost
- [ ] Construction sites show: materials delivered vs. required, builder count, ETA

**Acceptance criteria:**
- [ ] Building info panel appears on click
- [ ] All relevant data displayed
- [ ] Upgrade path clear with requirements
- [ ] Demolish requires confirmation
- [ ] Construction progress visible with ETA

---

### 2.8 Integration & Balance (Weeks 10-12)

#### 2.8.1 Settlement Gameplay Loop Testing
**Goal:** The full settlement loop works end-to-end

**Integration verification:**
```
Build campfire → First NPC arrives → Designate mining zone → NPC mines →
Haul to stockpile → Place house blueprint → NPCs deliver materials →
NPCs build house → Housing capacity increases → More NPCs arrive →
Settlement grows → Upgrade buildings → Thriving community
```

**Playtest scenarios (run each manually):**
1. **"First Light"** — Build campfire, wait for first NPC. Does NPC arrive within 5 minutes?
2. **"Put Them to Work"** — Designate mining zone with 3 NPCs. Do they all find work within 10 seconds?
3. **"Supply Chain"** — Place house blueprint. Do NPCs mine → haul → build without intervention?
4. **"Needy"** — Let NPC hunger drop to critical. Does NPC seek food autonomously?
5. **"Growing Pains"** — Reach 5 NPCs. Does the settlement function without micromanagement?
6. **"Unhappy Camper"** — Let an NPC become very unhappy. Does the warning system work? Do they leave?
7. **"Nightlife"** — Observe NPCs during night cycle. Do they seek shelter and sleep?
8. **"Rebuild"** — Demolish a building. Do NPCs adjust assignments correctly?

**Tasks:**
- [ ] Verify the complete settlement loop
- [ ] Tune immigration rate (not too fast, not too slow)
- [ ] Tune NPC need decay rates (needs should matter but not dominate)
- [ ] Tune construction speed (satisfying progress, not instant)
- [ ] Tune stockpile capacity (enough for growth, not infinite)
- [ ] Ensure 5+ NPCs don't cause pathfinding congestion
- [ ] Run all 8 playtest scenarios and document results

**Balance targets:**
```
Settlement timeline:
  Day 1-2:    Build campfire, basic shelter. First NPC arrives.
  Day 3-5:    2-3 NPCs, mining zone active, first house under construction.
  Day 6-10:   4-5 NPCs, house complete, farm producing food.
  Day 10-15:  6-8 NPCs, multiple buildings, settlement feels alive.
  Day 15+:    Building upgrades, specialization emerging.

NPC behavior:
  - Idle time: <10% of waking hours
  - Need satisfaction: <25% of total time
  - Work time: >65% of waking hours
  - NPCs should FEEL busy, not stressed
```

**Acceptance criteria:**
- [ ] New player can grow settlement to 5 NPCs within 15 in-game days
- [ ] NPCs work autonomously without player micromanagement
- [ ] No NPC stands idle when work exists
- [ ] Settlement functions during night (NPCs sleep, resume at dawn)
- [ ] No pathfinding deadlocks with 8+ NPCs

---

#### 2.8.2 Save/Load Validation
**Goal:** All Phase 2 systems persist correctly

**Tasks:**
- [ ] NPC identities, positions, need states save/load
- [ ] Zone designations save/load
- [ ] Stockpile contents save/load
- [ ] Construction site progress save/load
- [ ] Building effects restore on load
- [ ] Housing assignments save/load
- [ ] Immigration timer state save/load
- [ ] NPC relationships save/load

**Tests:** `SettlementSaveLoad.test.js`
- Full game state roundtrip with all Phase 2 additions

---

#### 2.8.3 Performance Validation
**Goal:** Phase 2 additions don't degrade performance

**Performance checks:**
- [ ] NPC pathfinding: <2ms per frame for 8 NPCs combined
- [ ] Task assignment engine: <1ms per tick (every 2 seconds)
- [ ] Stockpile rendering: <0.5ms for 4 stockpiles
- [ ] NPC voxel rendering: <1ms for 8 NPCs (instanced)
- [ ] Zone overlay rendering: <0.5ms for 10 zones
- [ ] Need simulation: <0.5ms per tick for 8 NPCs
- [ ] Construction progress: <0.5ms per tick for 3 active sites
- [ ] Total frame budget: still <16ms average
- [ ] Settlement dashboard: opens in <100ms, updates at 2 FPS (not every frame)

---

#### 2.8.4 Tutorial Hints for Settlement
**Goal:** Guide players through first settlement steps

**Implementation tasks:**
- [ ] Add one-time contextual hints (extend Phase 1 hint system):
  - After first shelter built: "Build a campfire to attract settlers"
  - On first NPC approach: "A survivor approaches! They're looking for a safe settlement."
  - On first NPC join: "[Name] has joined your settlement! Press N to open the Settlement Dashboard."
  - When NPC is idle and no zones exist: "Designate a mining zone (Z) to give your settlers work."
  - When resources pile up on ground: "Create a stockpile zone to store resources."
  - When NPC is unhappy: "[Name] is unhappy — check their needs in the Settlement Dashboard (N)."
  - When housing is full: "Build more shelters to attract new settlers."
- [ ] Hints auto-dismiss after 10 seconds
- [ ] Persist shown hints in save/load
- [ ] Add event hooks for hint triggers (settlement systems must emit these events):
  - `ConstructionManager` → emits `building:complete` (for "first shelter built" hint)
  - `ImmigrationManager` → emits `npc:approaching`, `npc:joined` (for approach/join hints)
  - `TaskAssignmentEngine` → emits `npc:idle-no-zones` (for "designate zone" hint)
  - `HousingManager` → emits `housing:full` (for "build more shelters" hint)
  - `NPCNeedsTracker` → emits `npc:unhappy` (for "check needs" hint)

**Acceptance criteria:**
- [ ] New player understands settlement basics through hints
- [ ] Hints trigger at correct moments
- [ ] Hints don't repeat
- [ ] Hints don't obstruct gameplay

---

## Exit Criteria

Phase 2 is **complete** when ALL of the following are true:

### Functional Requirements
- [ ] **NPC immigration:** NPCs arrive attracted by settlement buildings, visible approach
- [ ] **NPC identity:** Each NPC has unique name, personality, appearance
- [ ] **Zone designation:** Player can create mining, stockpile, farming, building zones
- [ ] **Autonomous mining:** NPCs mine blocks in designated mining zones without commands
- [ ] **Hauling system:** NPCs transport resources from mines to stockpiles to construction sites
- [ ] **Stockpile system:** Physical resource storage zones with slot-based inventory
- [ ] **Blueprint placement:** Player can place building blueprints with validation
- [ ] **NPC construction:** NPCs deliver materials and build structures block-by-block
- [ ] **Building effects:** Completed buildings provide housing, storage, production, happiness
- [ ] **Building upgrades:** Buildings can be upgraded to higher tiers
- [ ] **NPC needs:** NPCs eat, rest, socialize autonomously — critical needs interrupt work
- [ ] **Daily schedule:** NPCs follow a day/night routine (work, eat, sleep)
- [ ] **Housing system:** NPCs assigned to housing, sleep there at night
- [ ] **Settlement dashboard:** Overview UI with population, resources, buildings, alerts
- [ ] **NPC detail panel:** Click NPC to see status, needs, skills, actions
- [ ] **Building panel:** Click building to see status, occupants, upgrade options
- [ ] **Settlement loop works:** Campfire → NPC arrives → zones → mine → haul → build → grow
- [ ] **Save/load preserves all settlement state**

### Quality Requirements
- [ ] **60 FPS maintained** with 8 NPCs, 4 stockpiles, 3 construction sites active
- [ ] **No pathfinding deadlocks** — NPCs never permanently stuck
- [ ] **NPCs never idle when work exists** (within 10 seconds of task availability)
- [ ] **Needs don't dominate** — NPCs spend >65% of waking hours working
- [ ] **All new systems have tests** (>70% coverage for logic modules)
- [ ] **All UI readable** on 375px width screen
- [ ] **Settlement dashboard opens in <100ms**
- [ ] **NPC detail panel shows real-time data**

### Player Experience
- [ ] **NPCs feel autonomous** — player sets priorities, NPCs figure out details
- [ ] **First NPC arrival feels exciting** — visible approach, evaluation, notification
- [ ] **Construction is satisfying** — watching NPCs build block-by-block feels rewarding
- [ ] **Settlement feels alive** — NPCs have routines, socialize, react to needs
- [ ] **Growth feels earned** — each new building and NPC represents player achievement
- [ ] **No babysitting required** — player can leave for 5 minutes and settlement functions
- [ ] **Management is optional depth** — game is playable without touching the dashboard
- [ ] **Unhappy NPC departure feels fair** — warning system gives player time to respond

---

## Dependencies

```
2.0 Settlement Module Foundation (MUST be first — everything depends on it)
    ↓
2.1 NPC Immigration (depends on 2.0)
    ↓
2.5 NPC Work Loop (depends on 2.1 for NPCs to exist)

2.0 Settlement Module Foundation
    ↓
2.2 Zone Designation (parallel with 2.1, both depend on 2.0)
    ↓
2.3 Stockpile System (depends on 2.2 for zone infrastructure)
    ↓
2.4 Construction System (depends on 2.2 zones + 2.3 stockpiles for material flow)

2.6 NPC Needs & Daily Life (parallel with 2.4/2.5, depends on 2.1 for NPCs)

2.5 NPC Work Loop (depends on 2.2 + 2.3 + 2.4 for tasks to perform)
    2.5.4 Pathfinding Worker — conditional, based on 2.0.3 baseline results

2.7 Settlement UI (depends on 2.0.2 store + 2.1-2.6 for data, can start with stubs)

2.8 Integration (after all above)
```

**Parallelization opportunities:**
- 2.1 (immigration) and 2.2 (zones) can start simultaneously after 2.0
- 2.6 (needs) can be developed in parallel with 2.4/2.5 (construction/work)
- 2.7 (UI) can start as soon as 2.0.2 (store) is defined and data interfaces exist (week 6-7)

---

## Weekly Milestones

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | **Module Foundation** + Immigration | SettlementModule registered with orchestrator, settlement store, performance baseline, attractiveness calculator |
| 2 | Immigration + Zones | First NPC arrives, zone manager, zone placement UI |
| 3 | Zone UI + Stockpile | Mining zone behavior, farming zone behavior, stockpile slots |
| 4 | Hauling + Blueprint | Hauling tasks, blueprint placement with rotation, ghost blocks |
| 5 | Construction | Material delivery, block-by-block building — **PLAYTEST: does first NPC arrive and work?** |
| 6 | Work Loop + AI Integration | Task assignment engine, AI authority hierarchy wired, pathfinding worker (if needed) |
| 7 | NPC Model + Work Feedback | 3D voxel NPC model, work animations, thought bubbles |
| 8 | NPC Needs + Schedule | Need simulation, daily schedule (extend NPCBehaviorSystem), housing — **PLAYTEST: full settlement loop** |
| 9 | Settlement Dashboard | Dashboard, NPC detail panel, building panel |
| 10 | UI Polish + Mobile | Mobile zone placement, responsive dashboard, tutorial hints |
| 11 | Building Effects + Upgrades | Auras, tier upgrades, production buildings |
| 12-14 | Integration + Balance | All 8 playtest scenarios, performance validation, save/load, tuning |

**Playtest checkpoints are critical.** Test NPC arrival at Week 5 and the full settlement loop at Week 8. Don't wait until Week 12 to discover that NPCs feel lifeless.

---

## New Files Created

```
src/modules/settlement/SettlementModule.js                — module shell, orchestrator registration
src/modules/settlement/__tests__/SettlementModule.test.js
src/modules/settlement/AttractivenessCalculator.js
src/modules/settlement/__tests__/AttractivenessCalculator.test.js
src/modules/settlement/ImmigrationManager.js
src/modules/settlement/__tests__/ImmigrationManager.test.js
src/modules/settlement/ZoneManager.js
src/modules/settlement/__tests__/ZoneManager.test.js
src/modules/settlement/__tests__/FarmingZone.test.js
src/modules/settlement/StockpileManager.js
src/modules/settlement/__tests__/StockpileManager.test.js
src/modules/settlement/HaulingManager.js
src/modules/settlement/__tests__/HaulingManager.test.js
src/modules/settlement/BlueprintManager.js
src/modules/settlement/__tests__/BlueprintManager.test.js
src/modules/settlement/ConstructionManager.js
src/modules/settlement/__tests__/ConstructionManager.test.js
src/modules/settlement/TaskAssignmentEngine.js
src/modules/settlement/__tests__/TaskAssignmentEngine.test.js
src/modules/settlement/HousingManager.js
src/modules/settlement/__tests__/HousingManager.test.js
src/stores/useSettlementStore.js                          — dedicated settlement UI store
src/data/npcNames.js
src/data/buildingBlueprints.js
src/rendering/NPCVoxelModel.js
src/rendering/useZoneRenderer.js                          — zone overlay rendering
src/rendering/useStockpileRenderer.js                     — stockpile item rendering
src/systems/workers/PathfindingWorker.js                  — (conditional, based on perf baseline)
src/components/ui/ZoneDesignator.jsx
src/components/ui/SettlementDashboard.jsx
src/components/ui/NPCDetailPanel.jsx
src/components/ui/BuildingPanel.jsx
```

## Modified Files

```
src/data/tuning.js                           — all Phase 2 balance constants (rates, thresholds, multipliers)
src/core/ModuleOrchestrator.js               — register SettlementModule
src/GameManager.js                           — wire SettlementModule initialization
src/modules/npc-system/NPCManager.js         — wire immigration, task assignment, needs
src/modules/npc-system/NPCNeedsTracker.js    — connect to game tick, food from stockpile
src/modules/npc-system/NPCAssignment.js      — expand for zone-based work assignments
src/modules/npc-system/AutonomousDecision.js — delegate to TaskAssignmentEngine when no interrupt
src/modules/npc-system/NPCVisualFeedback.js  — new thought bubbles for work/needs
src/modules/ai/NPCBehaviorSystem.js          — wire settlement WORK activities into existing schedule
src/modules/building-types/BuildingConfig.js — blueprint block definitions
src/modules/territory-town/TownManager.js    — population growth, housing tracking
src/modules/resource-economy/ResourceEconomyModule.js — stockpile integration
src/modules/resource-economy/StorageManager.js — wire to physical stockpile zones
src/modules/foundation/GridManager.js        — building registration from construction
src/rendering/useNPCRenderer.js              — switch to voxel model, LOD
src/components/npc/NPCListView.jsx           — update for settlement dashboard
src/components/npc/NPCDetailCard.jsx         — expand with needs, actions, schedule
src/persistence/Game3DSaveManager.js         — persist settlement state
src/components/ContextualHints.jsx           — add settlement tutorial hints
docs/FORMULAS.md                             — add Phase 2 task scoring and variety bonus formulas
```

---

## Risk Areas

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| NPC pathfinding congestion with 8+ NPCs | High | Medium | Stagger pathfinding across frames, move to Web Worker if baseline shows <6ms headroom (see 2.5.4) |
| Construction feels too slow / too fast | Medium | High | Expose `BUILD_TIME_PER_BLOCK` in tuning.js, playtest at Week 4 |
| NPCs feel robotic despite personality system | High | Medium | Vary animation timing, add personality-specific idle behaviors, randomize schedules slightly |
| Stockpile rendering with 200+ items | Medium | Medium | Instanced meshes, LOD to icons at distance, cap visible items |
| Task assignment creates unfair specialization | Low | Medium | Variety bonus (+15 for tasks not done in last 3) added to scoring formula in 2.5.1 |
| Zone UI awkward on mobile | Medium | High | Two-tap placement instead of drag, large touch targets, preview before confirm |
| Immigration too fast → food shortage death spiral | Medium | Medium | Cap immigration rate, NPC carries some food on arrival, warn player when food low |
| NPCs wander away from settlement | Low | Medium | Settlement boundary: NPCs don't pathfind beyond territory bounds for work |
| Save file size grows with NPC state | Low | Low | NPC state is lightweight (~1KB per NPC); 20 NPCs = 20KB |
| Behavior tree + needs + schedule interactions produce unexpected emergent behavior | Medium | High | This is partly a feature; add circuit-breaker: if NPC is stuck >30s, reset to idle |
| AI system authority conflicts (4 systems making NPC decisions) | High | Medium | Authority hierarchy defined in 2.5: Schedule → Interrupts → Work → Companion. Each system has clear ownership boundary |

---

## Multiplayer Compatibility Notes

| System | Multiplayer Implication | Design Choice |
|--------|------------------------|---------------|
| NPC state | Server-authoritative NPC list | All NPC logic runs server-side, clients render |
| Zone designation | Per-player or shared | Store as world state, any player can create (permission system in Phase 6) |
| Stockpiles | Shared world resources | Server tracks contents, clients display |
| Construction | Server-authoritative progress | Server runs build ticks, clients see blocks appear |
| Immigration | Server-triggered | Server runs attractiveness + immigration checks |
| NPC commands | Validated server-side | Client sends command, server executes |
| Housing assignment | Shared | Server manages assignments |

No networking code needed yet — ensure single-player assumptions (e.g., `player` singleton) are isolated.

---

## Open Questions

### Resolved (integrated into plan)

1. ~~**NPC carrying capacity**~~ — **Resolved:** 1 stack per NPC, fixed for Phase 2. Backpack items deferred to Phase 3. (See 2.3.2)
4. ~~**Building rotation**~~ — **Resolved:** Yes, 90° increments using existing `shared/config.js` rotation rules. R key to cycle, tap button on mobile. (See 2.4.1)
6. ~~**NPC-player resource sharing**~~ — **Resolved:** NPCs eat from stockpiles. Player inventory is separate and not shared. (See 2.6.1)
7. ~~**Maximum settlement size**~~ — **Resolved:** Hard cap of 20 NPCs for Phase 2 (enforced in `NPC_MAX_POPULATION_PHASE_2` tuning constant). Expandable in Phase 5. (See 2.1.2)
10. ~~**Farm automation**~~ — **Resolved:** Require NPC assignment for full production. Unattended farms auto-collect at 25% rate. (See 2.2.4)

### Still Open (defer to implementation or Phase 3)

2. **Friendly fire** — Can the player accidentally hurt their own NPCs? Probably yes for realism, but add "no friendly fire in settlement" toggle.
3. **NPC death** — Can NPCs die permanently? Yes from monsters. Funeral mechanic? Defer to Phase 3.
5. **Zone visualization toggle** — Should zone overlays be always visible or only in "management mode"? Default: visible, toggleable.
8. **NPC recruitment vs. immigration** — Should the player be able to actively recruit from the overworld? Defer to Phase 3 (trade caravans).
9. **Building decay** — Do buildings deteriorate without maintenance? Not in Phase 2. Consider for Phase 3 with rift corruption.

---

**Ready to start? Create a branch and begin with 2.0.1 SettlementModule — the orchestrator integration that everything else depends on.**
