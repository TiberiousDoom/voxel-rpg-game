# 3D Implementation Plan

**Created:** February 3, 2026
**Based on:** VISION.md and ROADMAP.md
**Target:** React Three Fiber / Three.js 3D Game

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
| Procedural World Gen | Module exists | Integrate with VoxelTerrain |
| Save/Load | Module exists | Adapt for 3D state |
| NPC Settlers | AI exists | 3D rendering, task visuals |
| Portal System | Not started | Core feature |
| The Companion | AI exists | 3D model, teaching system |
| Magic System | Partial | Spell effects, learning system |
| Building Placement | Module exists | 3D placement UI |
| Audio | Not started | Music, SFX |
| Full UI | Partial (HUD) | Menus, inventory screens |

---

## Phase 0: Foundation Completion (Current)

**Goal:** Ensure core 3D systems are stable and connected to existing modules

**Duration:** 2-4 weeks

### Tasks

#### 0.1 Terrain & World Integration
- [ ] Connect `VoxelTerrain` to `WorldGenerator` module for procedural generation
- [ ] Implement biome-based coloring (use `BiomeManager`)
- [ ] Add chunk loading/unloading for performance
- [ ] Integrate height-based block types (grass, dirt, stone, bedrock)

#### 0.2 Save/Load System
- [ ] Adapt `SaveSystem` module for 3D player position
- [ ] Save/restore terrain modifications
- [ ] Save enemy states and spawns
- [ ] Save player progression and inventory
- [ ] Implement auto-save

#### 0.3 Player Controller Polish
- [ ] WASD keyboard movement (currently tap-to-move)
- [ ] Jump with collision detection
- [ ] Block interaction (break/place)
- [ ] Smooth camera follow

#### 0.4 Basic Inventory UI
- [ ] Inventory screen (items grid)
- [ ] Equipment slots display
- [ ] Item tooltips
- [ ] Drag-and-drop equipping

### Exit Criteria
- Player can walk through procedurally generated terrain
- Game saves and loads correctly
- Basic inventory management works

---

## Phase 1: Playable Prototype

**Goal:** Core survival gameplay loop
**Duration:** 6-8 weeks

### 1.1 World Generation (Weeks 1-2)
- [ ] Noise-based procedural terrain (integrate `NoiseGenerator`)
- [ ] Multiple biomes with distinct appearances
  - Forest (trees, grass)
  - Plains (rolling hills)
  - Mountains (steep terrain, caves)
  - Desert (sand, cacti)
- [ ] Resource distribution (ore veins, trees, rocks)
- [ ] World seed system for reproducible worlds
- [ ] Water bodies (rivers, lakes from `WaterBodySystem`)

### 1.2 Survival Mechanics (Weeks 3-4)
- [ ] Hunger system
  - Hunger bar depletes over time
  - Eating food restores hunger
  - Starvation damages health
- [ ] Health regeneration tied to hunger
- [ ] Stamina for sprinting/combat (already partial)
- [ ] Death and respawn system (already partial)
- [ ] Day/night cycle (integrate `SeasonalSystem`)
  - Visual lighting changes
  - Monsters more active at night

### 1.3 Resource Gathering (Weeks 5-6)
- [ ] Mining blocks (hold click to break)
- [ ] Block drops as items
- [ ] Tree chopping
- [ ] Resource collection particles
- [ ] Tool effectiveness (pickaxe mines faster than hands)

### 1.4 Crafting System (Weeks 7-8)
- [ ] Crafting UI screen
- [ ] Recipe discovery
- [ ] Basic tools: pickaxe, axe, sword, shovel
- [ ] Basic building blocks: wooden planks, stone bricks
- [ ] Workbench mechanic (advanced recipes require workbench)
- [ ] Integrate existing `MaterialCraftingSystem`

### Deliverable
> Player spawns in a procedurally generated world. They gather resources, craft tools, build a shelter, and survive the night when monsters emerge.

---

## Phase 2: Colony Alpha

**Goal:** NPC settlement building
**Duration:** 6-8 weeks

### 2.1 NPC Settlers (Weeks 1-2)
- [ ] 3D NPC model/mesh
- [ ] NPC spawning (attracted by settlement size)
- [ ] NPC idle animations
- [ ] NPC nameplate/health bar
- [ ] Integrate `NPCBehaviorSystem` for autonomous work

### 2.2 Personality System (Weeks 3-4)
- [ ] Personality traits (hardworking, lazy, brave, timid)
- [ ] Trait effects on behavior
- [ ] NPC preferences (job types, social)
- [ ] Simple dialogue when interacted with
- [ ] Mood system (happy, content, unhappy)

### 2.3 Autonomous Work (Weeks 5-6)
- [ ] Task finding (NPCs seek work automatically)
- [ ] Mining tasks (integrate `MiningTask` module)
- [ ] Hauling tasks (move items to stockpiles)
- [ ] Building tasks (construct player blueprints)
- [ ] Guard tasks (patrol and defend)
- [ ] Farming tasks (plant, tend, harvest)

### 2.4 Settlement Management (Weeks 7-8)
- [ ] Stockpile zones (designate storage areas)
- [ ] Zone types: mining, farming, storage
- [ ] Building placement system (3D blueprints)
- [ ] Building types: house, storage, workshop, barracks
- [ ] NPC housing assignment
- [ ] Settlement stats overlay

### Deliverable
> Player establishes a settlement. NPCs arrive over time, each with distinct personalities. The settlement grows as NPCs autonomously mine, build, and manage resources.

---

## Phase 3: Combat & Threats

**Goal:** Meaningful conflict and portal system
**Duration:** 6-8 weeks

### 3.1 Enhanced Combat (Weeks 1-2)
- [ ] Melee combat combos
- [ ] Ranged weapons (bow, crossbow)
- [ ] Dodging/rolling (already partial)
- [ ] Blocking with shields
- [ ] Combat animations
- [ ] Integrate `DefenseCombatEngine`

### 3.2 Monster Variety (Weeks 3-4)
- [ ] Monster types with unique behaviors
  - Zombie (slow, swarm)
  - Skeleton (ranged)
  - Spider (fast, climbing)
  - Golem (slow, tanky)
  - Wraith (phase through walls)
- [ ] Boss monsters
- [ ] Monster 3D models (voxel-style)
- [ ] Enhance `EnemyAISystem` behaviors

### 3.3 Portal System (Weeks 5-6)
- [ ] Portal 3D model (swirling vortex effect)
- [ ] Portal spawning monsters over time
- [ ] Portal levels (difficulty tiers)
- [ ] Portal closing mechanic (damage core, ritual)
- [ ] Portal reopening if undefended
- [ ] Corruption visual effect around portals

### 3.4 Territory & Defense (Weeks 7-8)
- [ ] Territory claiming system
- [ ] Corruption spread from portals
- [ ] Defensive structures: walls, gates, towers
- [ ] Guard posts with NPC defenders
- [ ] Raid events (integrate `RaidEventManager`)
- [ ] Territory map overlay

### Deliverable
> Player's settlement is threatened by a nearby portal. They build defenses, train guards, and assault the portal to close it. Undefended portals reopen.

---

## Phase 4: The Companion

**Goal:** Magic system and companion narrative
**Duration:** 6-8 weeks

### 4.1 Companion Implementation (Weeks 1-2)
- [ ] Unique companion 3D model
- [ ] Companion follows player
- [ ] Companion has recovery states (wounded → recovering → healthy)
- [ ] Companion healing tied to settlement progress
- [ ] Integrate `CompanionAISystem`

### 4.2 Dialogue System (Weeks 3-4)
- [ ] Dialogue UI (speech bubbles or panel)
- [ ] Conversation trees
- [ ] Companion lore revelations
- [ ] Triggered dialogue (events, milestones)
- [ ] Relationship tracking

### 4.3 Magic System (Weeks 5-6)
- [ ] Spell learning (companion teaches)
- [ ] Spell types:
  - Light (illumination)
  - Heal (restore health)
  - Fireball (ranged damage)
  - Shield (protection)
  - Telekinesis (move objects)
- [ ] Spell casting animations/effects
- [ ] Mana costs and cooldowns (already partial)
- [ ] Spell progression/upgrades

### 4.4 Story Hooks (Weeks 7-8)
- [ ] Lore items (discoverable journals, ruins)
- [ ] World mysteries (ancient structures)
- [ ] Companion backstory revelations
- [ ] Optional story quests
- [ ] Quest tracking UI

### Deliverable
> Player discovers and rescues the wounded companion. As the settlement grows, the companion heals and teaches magic. Fragments of world history are revealed through dialogue.

---

## Phase 5: Content & Polish

**Goal:** Complete single-player experience
**Duration:** 8-12 weeks

### 5.1 Audio Implementation (Weeks 1-3)
- [ ] Background music (biome-specific)
- [ ] Combat music
- [ ] Ambient sounds (birds, wind, water)
- [ ] UI sounds (clicks, notifications)
- [ ] Combat sounds (hits, spells, monster sounds)
- [ ] NPC voice clips

### 5.2 Visual Polish (Weeks 4-6)
- [ ] Weather effects (rain, snow, fog)
- [ ] Day/night lighting
- [ ] Particle effects enhancement
- [ ] Animation polish
- [ ] Post-processing (bloom, color grading)
- [ ] Performance optimization

### 5.3 Quest System (Weeks 7-9)
- [ ] Quest types: kill, collect, build, explore
- [ ] Quest givers (companion, NPCs)
- [ ] Quest rewards
- [ ] Main story questline (optional)
- [ ] Side quests
- [ ] Quest journal UI

### 5.4 Game Balance (Weeks 10-12)
- [ ] Difficulty settings
- [ ] Progression curve tuning
- [ ] Combat balance
- [ ] Economy balance
- [ ] Tutorial/onboarding
- [ ] Accessibility options

### Deliverable
> Complete single-player experience with full audio, polished visuals, quest content, and balanced gameplay.

---

## Phase 6: Multiplayer (Optional)

**Goal:** Cooperative play
**Duration:** 8-12 weeks

### Technical Requirements
- [ ] Network architecture decision (WebSocket, WebRTC)
- [ ] State synchronization
- [ ] Lag compensation
- [ ] Conflict resolution

### Features
- [ ] 2-4 player co-op
- [ ] Shared settlement
- [ ] Permission system
- [ ] Drop-in/drop-out
- [ ] Chat system

---

## Phase 7: Launch Preparation

**Goal:** Release-ready game
**Duration:** 6-8 weeks

### Tasks
- [ ] Comprehensive QA testing
- [ ] Bug fixing sprint
- [ ] Performance optimization
- [ ] Platform builds (web, desktop via Electron)
- [ ] Store page creation
- [ ] Marketing materials
- [ ] Press kit
- [ ] Launch trailer

---

## Technical Priorities

### Immediate (Phase 0)
1. **WorldGenerator → VoxelTerrain integration** - Connect existing terrain generation to 3D rendering
2. **SaveSystem adaptation** - Enable persistence for 3D game state
3. **Keyboard controls** - Add WASD movement option

### Short-term (Phase 1)
1. **Chunk-based rendering** - Performance for large worlds
2. **Block interaction** - Mining and placing blocks
3. **Crafting UI** - Connect existing system to 3D interface

### Medium-term (Phases 2-3)
1. **NPC 3D rendering** - Visual representation of settlers
2. **Building placement** - 3D blueprint system
3. **Portal effects** - Core threat mechanic

### Long-term (Phases 4-5)
1. **Magic VFX** - Spell casting visuals
2. **Audio engine** - Music and sound effects
3. **Quest system** - Narrative content delivery

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance with many voxels | High | Chunk loading, LOD, instancing (already using) |
| Three.js memory limits | Medium | Chunk unloading, texture atlasing |
| Complex NPC pathfinding in 3D | High | Navmesh, hierarchical pathfinding |
| Scope creep | High | Strict phase gates, MVP per phase |
| AI system integration | Medium | Thorough testing, fallback behaviors |

---

## Success Metrics Per Phase

| Phase | Key Metric |
|-------|------------|
| 0 | Game saves/loads, procedural terrain renders |
| 1 | Player survives 3 in-game days |
| 2 | 5+ NPCs work autonomously |
| 3 | Player closes first portal |
| 4 | Player learns 3+ spells from companion |
| 5 | 10+ hour complete playthrough |

---

## Module Integration Map

```
Existing Modules → 3D Integration Point
─────────────────────────────────────────
WorldGenerator    → VoxelTerrain.jsx
BiomeManager      → Terrain coloring
ChunkManager      → Dynamic loading
SaveSystem        → Game state persistence
NPCBehaviorSystem → NPC.jsx (new)
CompanionAISystem → Companion.jsx (new)
EnemyAISystem     → Enemy.jsx
DefenseCombatEngine → Combat system
RaidEventManager  → Wave spawning
MaterialCrafting  → CraftingUI.jsx (new)
BuildingConfig    → BuildingPlacer.jsx (new)
EventSystem       → World events
WeatherSystem     → Visual effects
```

---

## Recommended Starting Point

Begin with **Phase 0.1: Terrain & World Integration** since:
1. The `VoxelTerrain` component just got fixed (colors working)
2. `WorldGenerator` module already exists
3. This provides immediate visual progress
4. Foundation for all future features

First task: Create a bridge between `WorldGenerator.generateChunk()` and `VoxelTerrain`'s voxel data format.
