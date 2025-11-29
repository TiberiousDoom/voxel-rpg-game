# 2D Game Technical Specification

**Last Updated:** 2025-11-28
**Status:** Active
**Purpose:** Technical implementation details for the 2D RPG survival base-building game
**Scope:** This document covers **how** to implement features. For **what/why/when**, see [ROADMAP_2D.md](ROADMAP_2D.md).

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.2 | 2025-11-29 | **Added comprehensive mobile/touch support specs** |
| 1.1 | 2025-11-28 | Consolidated planning docs, aligned terminology, removed timeline estimates |
| 1.0 | 2025-11-28 | Initial technical specification |

---

## Quick Reference

### Document Relationships

| Document | Purpose | Use When |
|----------|---------|----------|
| [VISION_2D.md](VISION_2D.md) | Creative vision, design principles | Understanding **why** decisions are made |
| [ROADMAP_2D.md](ROADMAP_2D.md) | Phase overview, milestones, fundraising | Planning **what** to build and **when** |
| [NPC_SYSTEM_DESIGN_2D.md](NPC_SYSTEM_DESIGN_2D.md) | NPC behavior architecture | Implementing NPC systems |
| This document | Technical specifications | Implementing **how** to build features |

### Core Architecture Components

| Component | Purpose | Reference |
|-----------|---------|-----------|
| BuildingOrchestrator | Central coordinator for all NPC work systems | [NPC_SYSTEM_DESIGN_2D.md](NPC_SYSTEM_DESIGN_2D.md) |
| TilemapManager | Tile placement, layers, autotiling | [Tilemap System](#tilemap-system) |
| TaskManager | Task creation, claiming, execution | [Task System](#task-system) |
| RegionManager | World streaming, region loading | [Region System](#region-system) |

### Tile Layer Standard (5 Layers)

*Per NPC_SYSTEM_DESIGN_2D.md:*

| Layer | Index | Purpose |
|-------|-------|---------|
| Background | 0 | Decorative, no collision |
| Ground | 1 | Terrain, floors |
| Objects | 2 | Furniture, resources, items |
| Walls | 3 | Structures, barriers |
| Foreground | 4 | Visual overlays, roofs |

### Task Types (Standard)

*Per NPC_SYSTEM_DESIGN_2D.md:*

| Type | Description |
|------|-------------|
| MINE | Extract a tile at position |
| HAUL | Move resource from A to B |
| BUILD | Place tile at construction site |
| DELIVER | Bring materials to construction site |

---

## Table of Contents

1. [Technical Architecture](#technical-architecture)
2. [Phase 0: Foundation](#phase-0-foundation)
3. [Phase 1: Playable Prototype](#phase-1-playable-prototype)
4. [Phase 2: Colony Alpha](#phase-2-colony-alpha)
5. [Phase 3: Combat & Threats](#phase-3-combat--threats)
6. [Phase 4: The Companion](#phase-4-the-companion)
7. [Phase 5: Content & Polish](#phase-5-content--polish)
8. [Phase 6: Multiplayer](#phase-6-multiplayer)
9. [Phase 7: Launch Preparation](#phase-7-launch-preparation)
10. [Cross-Cutting Concerns](#cross-cutting-concerns)
11. [Testing Strategy](#testing-strategy)

---

## Technical Architecture

### System Overview

The game uses a layered architecture with the BuildingOrchestrator (per [NPC_SYSTEM_DESIGN_2D.md](NPC_SYSTEM_DESIGN_2D.md)) coordinating NPC work systems.

### BuildingOrchestrator Integration

*Reference: [NPC_SYSTEM_DESIGN_2D.md](NPC_SYSTEM_DESIGN_2D.md) - Architecture Overview*

The BuildingOrchestrator serves as the central coordinator:

**Subsystems managed:**
- TilemapManager (tile world)
- MiningManager (extraction tasks)
- HaulingManager (transport tasks)
- StockpileManager (storage zones)
- ConstructionManager (building tasks)

**Key responsibilities:**
- Initialize and update all subsystems
- Route events between systems
- Provide public API for game code

### Data Structures

#### Tile Definition

```
TileType:
  id: string                    # Unique identifier
  name: string                  # Display name
  layer: int                    # 0-4 per layer standard
  walkable: bool                # Can entities walk here?
  hardness: float               # Mining time multiplier (0 = instant)
  transparent: bool             # Does light pass through?
  drops: ResourceDrop[]         # What drops when mined
  autotileGroup: string         # For visual connections
  buildRequirements: Resource[] # Materials needed to place
```

*Note: This structure aligns with NPC_SYSTEM_DESIGN_2D.md TileType definition.*

#### Entity Definition

```
Entity:
  id: string                    # Unique identifier
  type: EntityType              # NPC, Monster, Player, Item
  position: Vector2             # World position (tile coordinates)
  velocity: Vector2             # Current movement
  facing: Direction             # N, S, E, W
  state: StateMachine           # Current behavior state
  components: Component[]       # ECS-style components
```

#### NPC Definition

*Extends NPC_SYSTEM_DESIGN_2D.md worker definition:*

```
NPC extends Entity:
  name: string                  # Generated name
  personality: PersonalityTraits
  skills: SkillLevels
  needs: NeedLevels             # Hunger, rest, happiness
  currentTask: Task             # What they're doing (MINE, HAUL, BUILD, DELIVER)
  inventory: Inventory
  relationships: Map<NPC, int>  # Social connections
  schedule: DailySchedule       # Work/rest times
```

#### Task Definition

*Per NPC_SYSTEM_DESIGN_2D.md Task Structure:*

```
Task:
  id: string                    # Unique identifier
  type: TaskType                # MINE, HAUL, BUILD, DELIVER
  position: Vector2Int          # Tile coordinates
  priority: int                 # 1-5
  status: TaskStatus            # PENDING, CLAIMED, IN_PROGRESS, COMPLETED
  assignedNpc: NpcId            # Or null
  createdAt: timestamp
  data: type-specific data
```

---

## Phase 0: Foundation

**Goal:** Establish core engine systems
**Reference:** [ROADMAP_2D.md - Phase 0](ROADMAP_2D.md)

### Tilemap System

#### TilemapManager

**Responsibilities:**
- Manage 5 tile layers (per layer standard above)
- Handle tile placement/removal
- Coordinate with autotiling
- Emit tile change events

**Methods:**
- `SetTile(position, layer, tileType)`
- `GetTile(position, layer) → TileType`
- `RemoveTile(position, layer)`
- `GetTilesInRegion(bounds) → Tile[]`
- `IsWalkable(position) → bool`

#### AutotileSystem

**Supported patterns:**
- 4-bit (16 variants) - Simple walls
- 8-bit (47 variants) - Terrain transitions
- Custom rules for special tiles

**Implementation approach:**
1. On tile change, get 4 or 8 neighbors
2. Calculate bitmask from neighbor matching
3. Select variant sprite from atlas
4. Propagate update to affected neighbors

#### Region System

*Note: Called "Region Manager" in NPC_SYSTEM_DESIGN_2D.md performance section.*

**Configuration:**
- Region size: 64x64 tiles
- Load distance: 2 regions in each direction
- Unload distance: 3 regions in each direction

**Responsibilities:**
- Load/unload world regions based on player position
- Serialize region data for save/load
- Handle cross-region entity queries
- Pause tasks in unloaded regions (per NPC_SYSTEM_DESIGN_2D.md)

### Player Controller

**States:**
- Idle
- Walking
- Running
- Interacting
- InMenu
- Combat

**Camera settings:**
- Follow speed: 5.0
- Deadzone: 0.5 units
- Zoom range: 0.5x to 2.0x

### Save/Load System

**Save data structure:**

```
SaveData:
  version: string               # For migrations
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

### Input System

**Default bindings:**

| Action | Keyboard | Gamepad | Touch |
|--------|----------|---------|-------|
| Move | WASD / Arrows | Left Stick | Virtual Joystick |
| Sprint | Shift | Left Trigger | Sprint Button / Double-tap |
| Interact | E | A Button | Tap on target |
| Attack | Left Click | Right Trigger | Attack Button |
| Cancel | Escape | B Button | Back gesture / X Button |
| Inventory | I | Start | Inventory Button |
| Build Menu | B | Select | Build Button |
| Zoom | Scroll / +/- | Right Stick | Pinch Gesture |

### Touch Input System

**Virtual Joystick:**
```
VirtualJoystick:
  position: Vector2              # Screen position (bottom-left default)
  radius: float                  # Touch area radius (80px default)
  innerRadius: float             # Knob radius (30px default)
  deadzone: float                # 0.1 default
  opacity: float                 # 0.5 when not touched, 0.8 when active
  showOnTouch: bool              # Appear where finger touches (true)
```

**Touch Button:**
```
TouchButton:
  position: Vector2              # Screen position
  size: Vector2                  # Minimum 44x44 points
  icon: Sprite
  action: InputAction
  showLabel: bool
  hapticFeedback: bool           # Vibrate on press (optional)
```

**Gesture Support:**
- **Tap:** Select tile, interact with object
- **Double-tap:** Sprint toggle
- **Long-press:** Secondary action (1 second hold)
- **Pinch:** Zoom in/out
- **Two-finger pan:** Pan camera (when zoomed)
- **Drag:** Build placement, inventory drag

**Touch Configuration:**
```
TouchConfig:
  joystickSide: 'left' | 'right'  # Which side for movement
  buttonLayout: 'default' | 'compact' | 'spread'
  sensitivity: float              # 0.5 to 2.0
  hapticEnabled: bool
  showJoystickAlways: bool        # Or only on touch
```

### Responsive UI System

**Breakpoints:**
```
Breakpoints:
  phone: 0-599px                 # Single column, stacked
  phoneLandscape: 600-767px      # Split view
  tablet: 768-1023px             # Side panels
  desktop: 1024px+               # Full layout
```

**UI Scaling:**
```
UIScale:
  phone: 1.25                    # Larger touch targets
  tablet: 1.0                    # Standard
  desktop: 1.0                   # Standard

  minTouchTarget: 44px           # Apple HIG minimum
  preferredTouchTarget: 48px     # Material Design recommended
```

**Responsive Layout:**
- HUD adapts position based on screen size
- Inventory uses grid on tablet/desktop, list on phone
- Panels stack vertically on phone, dock on sides for tablet+
- Action buttons reposition for comfortable thumb reach

### PWA Configuration

**manifest.json:**
```
PWAManifest:
  name: "Voxel RPG"
  short_name: "VoxelRPG"
  display: "fullscreen"
  orientation: "any"             # Support portrait and landscape
  background_color: "#0f0f23"
  theme_color: "#e94560"
  icons: [192x192, 512x512]
  start_url: "/"
  scope: "/"
```

**Service Worker:**
- Cache all game assets for offline play
- Background sync for cloud saves
- Push notifications for events (optional)
- Update notification when new version available

**Mobile Optimizations:**
- Lazy load non-critical assets
- Compress textures for mobile (WebP)
- Reduce particle effects on low-end devices
- Throttle background updates when not focused

### Exit Criteria (Measurable)

- [ ] Player movement: 60 FPS with 1000+ tiles loaded
- [ ] Tile operations: SetTile/GetTile < 1ms
- [ ] Save/load: Complete cycle < 5 seconds for 10 regions
- [ ] Input latency: < 50ms from press to visible response
- [ ] **Touch latency: < 50ms from touch to visible response**
- [ ] **Virtual joystick: Smooth movement, no drift**
- [ ] **Responsive UI: Correct layout on 320px to 2560px screens**
- [ ] **PWA: Installable, works offline**
- [ ] **Mobile performance: 60 FPS on iPhone 12 / Pixel 5 equivalent**
- [ ] All automated unit tests passing

---

## Phase 1: Playable Prototype

**Goal:** Create core survival gameplay loop
**Reference:** [ROADMAP_2D.md - Phase 1](ROADMAP_2D.md)

### World Generation

#### Noise Configuration

| Noise Type | Purpose | Octaves | Scale |
|------------|---------|---------|-------|
| Perlin | Height map | 4 | 0.01 |
| Simplex | Moisture | 3 | 0.015 |
| Voronoi | Biome regions | - | 0.005 |

#### Biome Mapping

*Illustrative logic - actual thresholds require tuning:*

```
# This is illustrative pseudocode, not implementation
DetermineBiome(height, moisture):
  if height < 0.3: return Ocean
  if height < 0.35: return Beach
  if height > 0.75: return Mountains
  if moisture < 0.2: return Desert
  if moisture < 0.4: return Plains
  if moisture < 0.7: return Forest
  return Swamp
```

### Resource System

**Categories:**

| Category | Examples | Gathering Method |
|----------|----------|------------------|
| Raw Materials | Wood, Stone, Fiber | Direct gathering |
| Ores | Iron, Copper, Gold | Mining (hardness-based) |
| Food | Berries, Mushrooms, Meat | Foraging, hunting |
| Special | Monster drops, Portal shards | Combat, exploration |

### Crafting System

**Recipe structure:**

```
Recipe:
  id: string
  inputs: {item: Item, quantity: int, consumed: bool}[]
  output: {item: Item, quantity: int}
  craftTime: float
  requiredStation: StationType  # None for hand-crafting
```

### Survival Mechanics

**Player needs:**

| Need | Decay Rate | Critical Threshold | Effect When Critical |
|------|------------|-------------------|---------------------|
| Health | Via damage | 0 | Death |
| Hunger | 2.0/hour | 20 | Health drain, speed reduction |
| Stamina | Via actions | 0 | Cannot sprint, reduced actions |

### Exit Criteria (Measurable)

- [ ] World generation: < 10 seconds for starting region
- [ ] Biome variety: 5+ distinct biomes in average world
- [ ] Crafting: 20+ recipes functional
- [ ] Survival loop: Player can survive 3+ in-game days without exploits
- [ ] Performance: 60 FPS with full survival systems active

---

## Phase 2: Colony Alpha

**Goal:** Transform solo survival into settlement building with NPCs
**Reference:** [ROADMAP_2D.md - Phase 2](ROADMAP_2D.md), [NPC_SYSTEM_DESIGN_2D.md](NPC_SYSTEM_DESIGN_2D.md)

### NPC Work System

*This section implements the architecture defined in [NPC_SYSTEM_DESIGN_2D.md](NPC_SYSTEM_DESIGN_2D.md).*

#### Worker State Machine

*Per NPC_SYSTEM_DESIGN_2D.md - NPC Worker Behavior:*

| State | Description | Transitions To |
|-------|-------------|----------------|
| IDLE | No task, waiting | SEEKING_TASK |
| SEEKING_TASK | Looking for work | TRAVELING_TO_TASK |
| TRAVELING_TO_TASK | Moving to task | MINING, HAULING, BUILDING |
| MINING | Extracting tile | IDLE (on complete) |
| HAULING_PICKUP | Getting resource | HAULING_DELIVERY |
| HAULING_DELIVERY | Delivering resource | IDLE |
| BUILDING | Placing tile | IDLE |

#### Task Selection

*Illustrative pseudocode per NPC_SYSTEM_DESIGN_2D.md:*

```
# Reference implementation - see NPC_SYSTEM_DESIGN_2D.md for details
FindBestTask(npc):
  availableTasks = GetUnclaimedTasks()
  validTasks = Filter(availableTasks, npc.CanPerform)

  # Score based on distance, priority, preference, skill
  scoredTasks = Score(validTasks, npc)

  return scoredTasks.Best()
```

### Stockpile System

*Per NPC_SYSTEM_DESIGN_2D.md - Stockpile System:*

**Stockpile structure:**

```
Stockpile:
  id: string
  bounds: Rect                  # Area in tiles
  allowedCategories: ResourceCategory[]
  priority: int                 # 1-5
  slots: StockpileSlot[]

StockpileSlot:
  position: Vector2Int
  item: Item
  quantity: int
  reserved: bool                # For active haul tasks
  reservedBy: TaskId
```

**Operations:**
- `FindNearestDeposit(position, resourceType) → StockpileSlot`
- `FindNearestWithdraw(position, resourceType) → StockpileSlot`
- `ReserveSlot(stockpileId, slotIndex)`
- `ReleaseReservation(stockpileId, slotIndex)`

### Construction System

*Per NPC_SYSTEM_DESIGN_2D.md - Construction System:*

**Construction flow:**
1. Player places blueprint → Site created (PLANNED)
2. System generates DELIVER tasks for materials
3. Haulers deliver materials → Site becomes IN_PROGRESS
4. System generates BUILD tasks (respecting build order)
5. Builders place tiles
6. All tiles complete → Site becomes COMPLETED

**Build order for structural integrity:**
1. Foundation/Floor (layer 1)
2. Walls (layer 3)
3. Objects/Furniture (layer 2)
4. Foreground/Roof (layer 4)

### Personality System

**Trait scales (-1 to 1):**

| Trait | Low End | High End | Effect |
|-------|---------|----------|--------|
| Industriousness | Lazy | Hardworking | Work speed ±20% |
| Sociability | Reclusive | Social | Social need decay rate |
| Courage | Cowardly | Brave | Combat willingness |
| Patience | Impatient | Patient | Task abandonment threshold |

### Exit Criteria (Measurable)

- [ ] NPC pathfinding: < 10ms for 100-tile path
- [ ] Task throughput: 50+ tasks/second processing
- [ ] NPC count: 20 NPCs at 60 FPS
- [ ] Stockpile operations: < 1ms for find/reserve
- [ ] Construction: Building completes with correct tile order
- [ ] Idle time: NPCs spend < 10% time idle when tasks available

---

## Phase 3: Combat & Threats

**Goal:** Add meaningful conflict and territory system
**Reference:** [ROADMAP_2D.md - Phase 3](ROADMAP_2D.md)

### Combat System

**Damage formula:**

```
BaseDamage = WeaponDamage + (Strength * 0.5)
Defense = ArmorValue + (Constitution * 0.3)
FinalDamage = max(1, BaseDamage - Defense) * CritMultiplier * StatusModifiers
```

**Attack types:**

| Type | Implementation | Use Case |
|------|----------------|----------|
| Melee | Hitbox in facing direction | Close combat |
| Ranged | Projectile entity spawned | Distance combat |
| Area | Circle/cone check from origin | Spells, explosions |

### Monster AI

**Behavior types:**

| Behavior | Description | Examples |
|----------|-------------|----------|
| Passive | Flees when attacked | Slime, rabbit |
| Neutral | Attacks if provoked | Wolf, boar |
| Aggressive | Attacks on sight | Zombie, skeleton |
| Territorial | Attacks near territory | Spider, bear |

**State machine:**
- IDLE → ALERT (target detected)
- ALERT → COMBAT (if aggressive) or FLEE (if passive/hurt)
- COMBAT → IDLE (target lost) or FLEE (health low)
- FLEE → IDLE (safe distance reached)

### Portal System

**Portal states:**

| State | Behavior |
|-------|----------|
| DORMANT | Not spawning, can activate |
| ACTIVE | Spawning monsters per spawn rate |
| CLOSING | Player attempting to close |
| CLOSED | Defeated, territory reclaimed |
| REOPENING | Monsters attempting to reopen |

**Closing requirements by level:**

| Level | Monster Kill Count | Boss Required |
|-------|-------------------|---------------|
| 1 | 10 | No |
| 2 | 20 | Mini-boss |
| 3 | 30 | Boss |
| 4 | 50 | Elite boss |

### Territory System

**Territory states:**

| State | Effects |
|-------|---------|
| CORRUPTED | Portal active, debuffs, high spawn rate |
| CONTESTED | Portal closed, monsters remain |
| CLAIMED | Safe, building allowed |
| FORTIFIED | Defended, production bonuses |

### Exit Criteria (Measurable)

- [ ] Combat frame time: < 2ms for 20 combatants
- [ ] Hit detection accuracy: 99%+ correct hits registered
- [ ] Monster AI decisions: < 1ms per monster per frame
- [ ] Portal spawn rate: Correct monsters/minute per level
- [ ] Territory transitions: State changes within 1 frame of condition met

---

## Phase 4: The Companion

**Goal:** Implement mystical companion and magic system
**Reference:** [ROADMAP_2D.md - Phase 4](ROADMAP_2D.md), [VISION_2D.md - The Companion Arc](VISION_2D.md)

### Companion System

**Recovery phases:**

| Phase | Trigger | Teaching Available |
|-------|---------|-------------------|
| CRITICAL | Game start | Basic guidance only |
| RECOVERING | First settlement | Tier 1 spells |
| HEALTHY | Close 3 portals | Tier 2-3 spells |
| AWAKENED | Story completion | Tier 4 spells |

**Companion progression links to player progress per [VISION_2D.md](VISION_2D.md).**

### Magic System

**Spell structure:**

```
SpellDefinition:
  id: string
  name: string
  school: MagicSchool          # Light, Fire, Nature, Arcane
  tier: int                    # 1-4
  manaCost: float
  castTime: float
  cooldown: float
  range: float
  effects: SpellEffect[]
```

**Spell tiers and requirements:**

| Tier | Requirement | Example Spells |
|------|-------------|----------------|
| 1 | Companion Phase 2 | Light, Minor Heal |
| 2 | Companion Phase 3 | Fireball, Shield |
| 3 | Close 5 portals | Chain Lightning, Mass Heal |
| 4 | Companion Phase 4 | Time Stop, Resurrection |

### Dialogue System

**Dialogue node structure:**

```
DialogueNode:
  id: string
  speaker: string
  text: string
  choices: DialogueChoice[]
  actions: DialogueAction[]    # Effects on selection
  conditions: Condition[]      # When node is available
```

### Exit Criteria (Measurable)

- [ ] Companion follow: Stays within 5 tiles of player, no stuck states
- [ ] Spell casting: < 100ms from input to effect visible
- [ ] Dialogue flow: No dead-end dialogue states
- [ ] Teaching progression: All spells learnable through normal play
- [ ] Mana balance: Player can cast 5+ spells before depleted at each tier

---

## Phase 5: Content & Polish

**Goal:** Full game experience with narrative content
**Reference:** [ROADMAP_2D.md - Phase 5](ROADMAP_2D.md)

### Quest System

**Quest structure:**

```
Quest:
  id: string
  name: string
  type: QuestType              # Main, Side, Settlement, Daily
  stages: QuestStage[]
  rewards: Reward[]
  prerequisites: Quest[]

QuestStage:
  description: string
  objectives: Objective[]
  onComplete: Action[]
```

**Objective types:**
- COLLECT: Gather X of item
- KILL: Defeat X of enemy type
- BUILD: Construct specific building
- EXPLORE: Discover location
- TALK: Speak with NPC

### Audio System

**Audio categories:**

| Category | Behavior | Examples |
|----------|----------|----------|
| Music | Crossfade on change, duck for SFX | Exploration, combat themes |
| SFX | Polyphonic, distance-based volume | Attacks, UI clicks |
| Ambient | Loop, blend between biomes | Wind, birds, water |

### Exit Criteria (Measurable)

- [ ] Story completable: Main quest start to finish without blockers
- [ ] Quest variety: 30+ unique quests
- [ ] Audio coverage: Sound for all player actions
- [ ] Balance validation: 80%+ playtesters complete tutorial
- [ ] Content hours: 10+ hours of unique content

---

## Phase 6: Multiplayer

**Goal:** Cooperative settlement building
**Reference:** [ROADMAP_2D.md - Phase 6](ROADMAP_2D.md)

### Network Architecture

**Recommended: Client-Server (Player Host)**
- Appropriate for co-op gameplay
- No infrastructure costs
- Simpler than peer-to-peer

### State Synchronization

**Sync priorities:**

| Data Type | Sync Method | Frequency |
|-----------|-------------|-----------|
| Player position | Interpolated | Every frame |
| Combat actions | Immediate, validated | On action |
| World changes | Event-based | On change |
| NPC state | Periodic snapshot | 4x/second |
| UI state | Not synced | - |

### Permission System

**Permission levels:**

| Level | Capabilities |
|-------|-------------|
| Guest | Move, basic interact |
| Member | Build, use stockpiles |
| Trusted | Demolish, assign NPCs |
| Admin | All permissions, kick players |

### Exit Criteria (Measurable)

- [ ] Connection: Host/join works on LAN and internet
- [ ] Latency tolerance: Playable with 200ms ping
- [ ] Player count: 4 players at 60 FPS
- [ ] Desync rate: < 1 desync per hour of play
- [ ] Disconnect handling: Graceful, no data loss

---

## Phase 7: Launch Preparation

**Goal:** Ship-ready game
**Reference:** [ROADMAP_2D.md - Phase 7](ROADMAP_2D.md)

### Quality Assurance

**Test coverage targets:**

| System | Unit Test Coverage | Integration Tests |
|--------|-------------------|-------------------|
| Core engine | 80% | Yes |
| Combat | 70% | Yes |
| NPC behavior | 70% | Yes |
| Save/load | 90% | Yes |
| UI | 50% | Manual |

### Performance Targets

| Metric | Desktop Target | Mobile Target | Measurement Method |
|--------|----------------|---------------|-------------------|
| Frame rate | 60 FPS | 60 FPS | GTX 1060 / iPhone 12 |
| Load time | < 10 seconds | < 15 seconds | Cold start to gameplay |
| Memory | < 2 GB | < 500 MB | Peak during normal play |
| Save size | < 50 MB | < 50 MB | Large world with 20 NPCs |
| **Battery** | N/A | **< 15% per hour** | Active gameplay |
| **Touch latency** | N/A | **< 50ms** | Touch to response |
| **Asset size** | < 200 MB | **< 100 MB** | Total download |

### Platform Builds

| Platform | Format | Notes |
|----------|--------|-------|
| **Web/PWA** | **Static site** | **Primary - works everywhere** |
| Windows | .exe installer, .zip | 32 and 64 bit (Electron wrapper) |
| macOS | .app bundle, .dmg | Signed and notarized |
| Linux | .AppImage, .tar.gz | Tested on Ubuntu LTS |
| **iOS** | **.ipa (App Store)** | **PWA wrapper or Capacitor** |
| **Android** | **.apk, .aab (Play Store)** | **PWA wrapper or Capacitor** |

### Mobile Build Requirements

**iOS:**
- Minimum iOS version: 14.0
- Required capabilities: Game Center (optional), Push (optional)
- App Store screenshots: 6.5" and 5.5" displays
- Privacy nutrition labels

**Android:**
- Minimum SDK: API 26 (Android 8.0)
- Target SDK: Latest stable
- Play Store screenshots: Phone and tablet
- App bundle format required

### Exit Criteria (Measurable)

- [ ] Crash rate: < 1 per 10 hours of play
- [ ] Critical bugs: 0 known
- [ ] Performance: Meets all targets above
- [ ] Platform coverage: All 3 platforms passing smoke tests
- [ ] Store pages: Live with all required assets

---

## Cross-Cutting Concerns

### Accessibility

| Feature | Implementation | Priority |
|---------|---------------|----------|
| Colorblind modes | 3 alternative palettes | High |
| Text scaling | 75% to 200% | High |
| Key rebinding | Full remapping | High |
| **Touch control customization** | **Joystick position, button layout** | **High** |
| Subtitles | All dialogue | High |
| Screen reader | UI descriptions | Medium |
| **Large touch targets** | **Minimum 44pt, adjustable** | **High** |
| **Reduced motion** | **Disable camera shake, reduce animations** | **Medium** |
| **One-handed mode** | **All controls reachable with one hand** | **Medium** |
| **External controller** | **Support Bluetooth controllers on mobile** | **Medium** |

### Localization

**Requirements:**
- All player-visible strings in localization files
- Support for RTL languages
- Date/number formatting per locale
- Font fallbacks for non-Latin scripts

**Initial languages:** English, German, French, Spanish

### Analytics (Optional)

**Tracked metrics:**
- Session length and frequency
- Feature usage rates
- Progression milestones reached
- Performance data (opt-in)

---

## Testing Strategy

### Test Categories

| Type | Coverage | Automation |
|------|----------|------------|
| Unit | Core systems | Fully automated |
| Integration | System interactions | Automated where possible |
| Performance | Frame rate, memory | Automated benchmarks |
| **Mobile Performance** | **Touch, battery, memory** | **Device lab / BrowserStack** |
| Playtest | User experience | Manual, structured |
| **Mobile Playtest** | **Touch UX, screen sizes** | **Manual, device matrix** |

### Testing Schedule

- **Per commit:** Automated unit tests
- **Per feature:** Integration tests
- **Per phase:** Internal playtest (structured feedback form)
- **Pre-milestone:** External playtest (10+ testers)
- **Per phase:** **Mobile device testing (phone + tablet)**

### Mobile Testing Matrix

| Device Category | Examples | Testing Focus |
|-----------------|----------|---------------|
| **Low-end phone** | iPhone SE, Pixel 4a | Performance, memory |
| **Mid-range phone** | iPhone 12, Pixel 6 | Baseline experience |
| **High-end phone** | iPhone 15 Pro, Pixel 8 Pro | Visual quality |
| **Small tablet** | iPad Mini | Layout adaptation |
| **Large tablet** | iPad Pro | Full UI layout |

### Touch Testing Checklist

- [ ] Virtual joystick responds accurately
- [ ] All buttons reachable with thumbs (ergonomics)
- [ ] Pinch zoom works smoothly
- [ ] Tap targets are large enough (44pt+)
- [ ] Long-press timing feels natural
- [ ] No accidental taps during gameplay
- [ ] Landscape and portrait orientations work
- [ ] Split-screen/multitasking doesn't break layout

---

## References

### Planning Documents

- [VISION_2D.md](VISION_2D.md) - Creative vision and design principles
- [ROADMAP_2D.md](ROADMAP_2D.md) - Development phases and milestones
- [NPC_SYSTEM_DESIGN_2D.md](NPC_SYSTEM_DESIGN_2D.md) - NPC behavior architecture (primary reference for Phase 2)

### Archived Reference

- [2D Prototype Archive](../archive-code/2d-prototype/README.md) - Previous implementation for algorithm reference

### Project Standards

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Documentation and contribution guidelines

---

**Document Purpose:** Technical specification for implementation
**Companion Documents:** VISION_2D.md (why), ROADMAP_2D.md (what/when), NPC_SYSTEM_DESIGN_2D.md (NPC details)
