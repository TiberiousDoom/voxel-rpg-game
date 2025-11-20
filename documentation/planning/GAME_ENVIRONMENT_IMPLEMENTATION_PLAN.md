# Game Environment Implementation Plan

**Last Updated:** 2025-11-20 (Revised with critical feedback)
**Status:** Active
**Version:** 2.0
**Purpose:** Comprehensive plan for implementing procedurally generated game environment system for 2D settlement RPG

---

## Table of Contents

1. [Overview](#overview)
2. [Critical Amendments (v2.0)](#critical-amendments-v20)
3. [Project Requirements](#project-requirements)
4. [Current State Analysis](#current-state-analysis)
5. [System Architecture](#system-architecture)
6. [Implementation Phases](#implementation-phases)
7. [File Structure](#file-structure)
8. [Technical Specifications](#technical-specifications)
9. [Performance Considerations](#performance-considerations)
10. [Timeline Estimates](#timeline-estimates)
11. [Success Criteria](#success-criteria)
12. [References](#references)

---

## Overview

This plan outlines the implementation of a comprehensive procedurally generated environment system for the Voxel RPG game's primary 2D settlement management mode. The system will transform the current flat 50x50 grid into a rich, varied world with biomes, environmental props, procedural structures, resource nodes, day/night cycles, weather, and interactive terrain.

### Goals

- **Rich Environment**: Diverse biomes, props, and structures for visual variety
- **Procedural Generation**: Infinite replayability with controlled randomness
- **Performance**: Support <10 players on desktop/mobile with large world
- **Player Interaction**: Destructible terrain, resource gathering, environmental mechanics
- **Integration**: Seamless integration with existing grid, rendering, and game systems

### Priorities (In Order) - REVISED v2.0

1. **Terrain + Chunks** - Core foundation system
2. **Props + Resources** - Immediate gameplay value (trees, rocks ARE resource nodes)
3. **Biomes** - Visual variety and exploration
4. **Interactive Terrain** - Player agency (harvesting, terraforming)
5. **Structures** - Exploration incentive (ruins, villages, dungeons)
6. **Day/Night Cycle** - Atmospheric enhancement
7. **Weather** - Polish and immersion
8. **Optimization** - Ongoing throughout, not a final phase

---

## Critical Amendments (v2.0)

**Date:** 2025-11-20
**Reason:** Incorporated expert feedback to improve realism and reduce implementation risks

### Key Changes from v1.0

#### 🔴 **Timeline Adjustments** (Critical)
- **Issue**: Original 12-18 week estimate was overly optimistic
- **Change**: Added 30-40% buffer to all phase estimates
- **New Timeline**: 16-24 weeks for full implementation
- **Rationale**: Accounts for integration complexity, testing, and unforeseen issues

#### 🔴 **Added Phase 0: Integration Planning** (Critical)
- **Issue**: Original plan didn't address how terrain height affects existing systems
- **New Phase**: 1-week prototype phase before main implementation
- **Covers**: Building placement on slopes, NPC pathfinding with height, projectile physics, line-of-sight
- **Rationale**: Validate core assumptions before committing to full implementation

#### 🔴 **Performance Targets Revised** (Critical)
- **Issue**: "1000+ props at 60 FPS" unrealistic for Canvas 2D
- **Old Targets**: 1000+ props desktop, 500 mobile
- **New Targets**: 500 props desktop (60 FPS), 200 props mobile (30 FPS)
- **Added**: Sprite batching and LOD system in Phase 2 (not Phase 8)
- **Rationale**: Conservative targets prevent over-promising, easier to optimize up

#### 🔴 **Chunk Size Increased** (Critical)
- **Issue**: 16x16 chunks too small, causes excessive loading/unloading
- **Old**: 16x16 tiles per chunk
- **New**: 32x32 tiles per chunk
- **Rationale**: Player moving 5 tiles/sec in 16x16 = new chunk every 3 seconds (thrashing)

#### 🟡 **Save System Architecture** (Important)
- **Issue**: Save/load complexity underestimated
- **Added to Phase 1**: Full week dedicated to save system architecture
- **Covers**: Differential saves, compression, multiplayer sync, version migration
- **Rationale**: Save system affects all subsequent phases

#### 🟡 **Biome Generation Approach** (Important)
- **Issue**: Temperature × Moisture lookup creates harsh boundaries
- **Old**: Grid-based temperature/moisture maps
- **New**: Voronoi diagrams with noise-based distortion for irregular shapes
- **Rationale**: Creates more natural, organic biome distributions

#### 🟡 **Resource Nodes Moved Earlier** (Important)
- **Issue**: Resources are core gameplay, shouldn't be in Phase 5
- **Old**: Phase 5 (separate from props)
- **New**: Phase 2 (combined with props - trees/rocks ARE resources)
- **Rationale**: Provides immediate gameplay value, reduces duplication

#### 🟡 **Weather Particle Count** (Important)
- **Issue**: 500 particles excessive for Canvas 2D
- **Old**: 500 desktop, 200 mobile
- **New**: 50-100 max, with particle pooling from start
- **Alternative**: CSS animation overlays instead of particles
- **Rationale**: 500 particles = 30-40% frame budget

#### 🟡 **Structure Generation Simplified** (Important)
- **Issue**: Procedural generation more complex than estimated
- **Old**: Full procedural generation in Phase 4
- **New**: Start with prefab templates, add procedural variation later
- **Covers**: Door alignment, multi-story, interior gen, loot placement
- **Rationale**: Deliver value faster, reduce complexity

#### 🟡 **Day/Night Implementation** (Important)
- **Issue**: Real-time lighting expensive in Canvas 2D
- **Old**: Dynamic lighting and shadow calculations
- **New**: Semi-transparent overlay approach + pre-baked sprite variants
- **Rationale**: Simpler, more performant, achieves same visual effect

#### 🟡 **Testing Strategy Enhanced** (Important)
- **Added**: Automated performance regression tests from Phase 1
- **Added**: Chunk boundary edge case tests
- **Added**: Biome generation determinism tests
- **Added**: Memory leak monitoring
- **Added**: Multiplayer desync scenarios
- **Rationale**: Catch issues early, prevent technical debt

### Things Kept from v1.0 (Done Well) ✅

- ✅ Excellent data model definitions
- ✅ Smart reuse of existing systems (GridManager, SpatialPartitioning)
- ✅ Comprehensive risk assessment
- ✅ Clear success criteria
- ✅ Good technical specifications for noise generation
- ✅ Proper consideration of mobile performance
- ✅ Modular approach and clear phase dependencies

### Summary of Impact

| Aspect | v1.0 | v2.0 | Impact |
|--------|------|------|--------|
| **Timeline** | 12-18 weeks | 16-24 weeks | +30-40% more realistic |
| **Phases** | 8 phases | 9 phases (added Phase 0) | Better risk mitigation |
| **Chunk Size** | 16x16 | 32x32 | Reduced loading overhead |
| **Prop Target** | 1000+ | 500 desktop, 200 mobile | Achievable performance |
| **Resource Nodes** | Phase 5 | Phase 2 (with props) | Earlier gameplay value |
| **Weather Particles** | 500 | 50-100 | 60-80% performance savings |
| **Structure Gen** | Full procedural | Prefabs first | Faster delivery |
| **Day/Night** | Dynamic lighting | Overlay approach | Simpler, performant |

---

## Project Requirements

### Target Specifications

- **Game Mode**: 2D settlement management (primary focus)
- **World Generation**: Procedurally generated with configurable limits
- **Player Count**: <10 players (multiplayer support)
- **World Size**: Large (configurable, chunk-based streaming)
- **Platforms**: Desktop (primary), Mobile (secondary)
- **Performance**: 60 FPS desktop, 30 FPS mobile target

### Functional Requirements

1. **Terrain Generation**
   - Procedural height variation using Perlin/Simplex noise
   - Configurable world size and seed
   - Chunk-based loading/unloading
   - Terrain persistence (save/load)

2. **Biome System**
   - 5+ distinct biomes (Forest, Desert, Plains, Tundra, Swamp, Mountains)
   - Biome blending at boundaries
   - Temperature and moisture-based generation
   - Biome-specific terrain, props, and spawning

3. **Environmental Props**
   - Trees, rocks, bushes, flowers
   - Water bodies (lakes, rivers, ponds)
   - Decorative elements
   - Resource nodes (ore, herbs, gatherable items)

4. **Procedural Structures**
   - Ruins and abandoned buildings
   - NPC villages and settlements
   - Dungeons and caves (entrance markers for 2D mode)
   - Natural formations

5. **Dynamic Systems**
   - Day/night cycle (visual and gameplay effects)
   - Weather system (rain, snow, wind)
   - Seasonal changes (optional)

6. **Interactive Terrain**
   - Destructible environment (trees, rocks)
   - Resource gathering
   - Terrain modification (digging, building)

### Non-Functional Requirements

- **Performance**: Efficient chunk management, spatial partitioning
- **Scalability**: Support growing world without performance degradation
- **Maintainability**: Modular, well-documented code
- **Configurability**: Designers can tweak generation parameters
- **Compatibility**: Works with existing GridManager and game systems

---

## Current State Analysis

### Existing Infrastructure ✅

**Grid System**
- `GridManager.js`: 3D coordinate system (x, y, z), building placement, collision
- `SpatialPartitioning.js`: Chunk-based spatial indexing
- Grid size: 100x50x100 (configurable)
- **Status**: ✅ Solid foundation, ready to extend

**Rendering**
- `GameViewport.jsx`: Canvas-based 2D rendering, 800x600 viewport, camera follow
- Sprite-based rendering for buildings/NPCs
- Grid visualization
- **Status**: ✅ Working, needs terrain/environment layer

**Game Architecture**
- `GameManager.js`: Module orchestration, tick-based loop, event system
- 13+ integrated modules
- **Status**: ✅ Ready for environment module integration

**Asset System**
- Building icons, NPC sprites, sprite manifest
- **Status**: ⚠️ Needs environmental sprites (trees, rocks, terrain)

### Major Gaps ❌

1. **Terrain Generation**: No procedural system (only basic 3D sine wave prototype)
2. **Biome System**: Does not exist
3. **Environmental Props**: No tree/rock/decoration system
4. **Structures**: Only player-placed buildings exist
5. **Scene Management**: No zone/level loading system
6. **Environmental Entities**: No resource nodes or ambient features
7. **Dynamic Systems**: No day/night or weather

### Integration Points

The environment system will integrate with:

- **GridManager**: Terrain height data, occupancy for props/structures
- **SpatialPartitioning**: Chunk-based environment loading
- **GameViewport**: New rendering layer for terrain and environment
- **GameManager**: New EnvironmentModule in module orchestrator
- **GameStore**: New state for world/chunks/biomes
- **Building System**: Terrain height affects building placement
- **NPC System**: Pathfinding considers terrain/obstacles
- **Combat System**: Environmental cover and obstacles

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GameManager                        │
│  ┌────────────────────────────────────────────────┐ │
│  │         ModuleOrchestrator                     │ │
│  │  ┌──────────────────────────────────────────┐ │ │
│  │  │  Foundation (Grid, Spatial)              │ │ │
│  │  ├──────────────────────────────────────────┤ │ │
│  │  │  🌍 Environment Module (NEW)              │ │ │
│  │  │    - WorldGenerator                       │ │ │
│  │  │    - BiomeManager                         │ │ │
│  │  │    - TerrainManager                       │ │ │
│  │  │    - PropManager                          │ │ │
│  │  │    - StructureGenerator                   │ │ │
│  │  │    - EnvironmentRenderer                  │ │ │
│  │  │    - DayNightCycle                        │ │ │
│  │  │    - WeatherSystem                        │ │ │
│  │  ├──────────────────────────────────────────┤ │ │
│  │  │  Buildings, NPCs, Combat, etc.           │ │ │
│  │  └──────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. WorldGenerator
**Responsibilities:**
- Orchestrates overall world generation
- Manages world seed and configuration
- Coordinates terrain, biome, prop, and structure generation
- Handles chunk generation on-demand

**Interfaces:**
```javascript
class WorldGenerator {
  generate(seed, config)         // Generate new world
  generateChunk(chunkX, chunkZ)  // Generate single chunk
  getTerrainHeight(x, z)         // Get height at position
  getBiome(x, z)                 // Get biome at position
  save(worldData)                // Serialize world
  load(worldData)                // Deserialize world
}
```

#### 2. NoiseGenerator
**Responsibilities:**
- Implements Perlin/Simplex noise algorithms
- Provides multi-octave noise functions
- Supports 2D and 3D noise

**Interfaces:**
```javascript
class NoiseGenerator {
  perlin2D(x, y, octaves, persistence, scale)
  simplex2D(x, y, octaves, persistence, scale)
  perlin3D(x, y, z, octaves, persistence, scale)
}
```

#### 3. BiomeManager
**Responsibilities:**
- Defines biome types and properties
- Generates temperature and moisture maps
- Determines biome at any position
- Handles biome blending

**Interfaces:**
```javascript
class BiomeManager {
  getBiomeAt(x, z)                    // Get biome at position
  getBlendedBiomes(x, z)              // Get biomes for blending
  getTemperature(x, z)                // Get temperature value
  getMoisture(x, z)                   // Get moisture value
  getBiomeProperties(biomeType)       // Get biome config
}
```

#### 4. TerrainManager
**Responsibilities:**
- Manages terrain height data
- Handles terrain modification (digging, flattening)
- Integrates with GridManager for height
- Tracks terrain changes for persistence

**Interfaces:**
```javascript
class TerrainManager {
  getHeight(x, z)                     // Get terrain height
  setHeight(x, z, height)             // Modify terrain height
  getTerrainType(x, z)                // Get terrain material
  isWalkable(x, z)                    // Check if terrain is walkable
  modifyTerrain(x, z, type, radius)   // Dig, flatten, etc.
}
```

#### 5. PropManager
**Responsibilities:**
- Places environmental props (trees, rocks, etc.)
- Manages prop lifecycle and removal
- Handles prop-biome associations
- Supports gatherable resource props

**Interfaces:**
```javascript
class PropManager {
  generatePropsForChunk(chunkX, chunkZ)  // Generate props in chunk
  getPropAt(x, z)                        // Get prop at position
  removeProp(propId)                     // Remove prop (harvest/destroy)
  addProp(type, x, z, config)            // Manually add prop
  getPropsInRadius(x, z, radius)         // Query nearby props
}
```

#### 6. StructureGenerator
**Responsibilities:**
- Generates procedural structures (ruins, villages, dungeons)
- Manages structure templates
- Handles structure placement rules
- Prevents structure overlap

**Interfaces:**
```javascript
class StructureGenerator {
  generateStructuresForChunk(chunkX, chunkZ)
  getStructureAt(x, z)
  canPlaceStructure(template, x, z)
  placeStructure(template, x, z)
  getStructuresInRadius(x, z, radius)
}
```

#### 7. ChunkManager
**Responsibilities:**
- Manages chunk loading/unloading
- Tracks active chunks around players
- Handles chunk streaming
- Optimizes memory usage

**Interfaces:**
```javascript
class ChunkManager {
  loadChunk(chunkX, chunkZ)              // Load chunk into memory
  unloadChunk(chunkX, chunkZ)            // Unload chunk from memory
  getActiveChunks()                      // Get currently loaded chunks
  updatePlayerPosition(playerId, x, z)   // Update which chunks to load
  isChunkLoaded(chunkX, chunkZ)          // Check chunk status
}
```

#### 8. EnvironmentRenderer
**Responsibilities:**
- Renders terrain, props, and structures in GameViewport
- Manages terrain layer rendering
- Handles prop sprite rendering
- Supports camera culling

**Interfaces:**
```javascript
class EnvironmentRenderer {
  renderTerrain(ctx, camera)             // Render terrain layer
  renderProps(ctx, camera)               // Render environmental props
  renderStructures(ctx, camera)          // Render structures
  renderWeather(ctx)                     // Render weather effects
  update(deltaTime)                      // Animation updates
}
```

#### 9. DayNightCycle
**Responsibilities:**
- Manages time of day
- Controls lighting and ambiance
- Triggers time-based events
- Supports time acceleration

**Interfaces:**
```javascript
class DayNightCycle {
  update(deltaTime)                      // Advance time
  getCurrentTime()                       // Get time (0-24)
  getAmbientLight()                      // Get current light level
  setTimeScale(scale)                    // Speed up/slow time
  isNight()                              // Check if nighttime
}
```

#### 10. WeatherSystem
**Responsibilities:**
- Manages weather states (clear, rain, snow, storm)
- Weather transitions and effects
- Weather-biome associations
- Gameplay effects (visibility, movement)

**Interfaces:**
```javascript
class WeatherSystem {
  update(deltaTime)                      // Update weather
  getCurrentWeather()                    // Get current weather
  setWeather(type, duration)             // Force weather
  getWeatherIntensity()                  // Get intensity (0-1)
  applyWeatherEffects(entity)            // Apply to entities
}
```

### Data Models

#### World Data
```javascript
{
  seed: Number,              // World generation seed
  size: {                    // World bounds
    width: Number,
    height: Number
  },
  chunks: Map<ChunkKey, Chunk>,  // Loaded chunks
  config: WorldConfig        // Generation parameters
}
```

#### Chunk Data
```javascript
{
  x: Number,                 // Chunk X coordinate
  z: Number,                 // Chunk Z coordinate
  terrain: Array2D<Height>,  // Height map (16x16 default)
  biome: Array2D<BiomeType>, // Biome per tile
  props: Array<Prop>,        // Environmental props
  structures: Array<Structure>, // Placed structures
  modified: Boolean,         // Has terrain been modified
  generated: Boolean         // Has chunk been generated
}
```

#### Biome Definition
```javascript
{
  id: String,                // 'forest', 'desert', etc.
  name: String,              // Display name
  temperature: Number,       // -1 to 1
  moisture: Number,          // -1 to 1
  heightRange: [min, max],   // Typical height range
  terrainColors: {           // Terrain rendering colors
    grass: String,
    dirt: String,
    stone: String
  },
  props: Array<PropSpawnRule>, // What props spawn here
  structures: Array<StructureSpawnRule>,
  monsters: Array<MonsterSpawnRule>,
  musicTheme: String         // Audio theme
}
```

#### Prop Definition
```javascript
{
  id: String,                // Unique prop ID
  type: String,              // 'tree', 'rock', 'bush', etc.
  sprite: String,            // Sprite asset name
  size: {width, height},     // Grid size
  blocking: Boolean,         // Blocks movement
  gatherable: Boolean,       // Can be harvested
  resources: Array<Resource>, // What it drops
  health: Number,            // If destructible
  biomes: Array<String>      // Which biomes it spawns in
}
```

#### Structure Template
```javascript
{
  id: String,                // Template ID
  name: String,              // Display name
  size: {width, height},     // Grid size
  tiles: Array2D<TileData>,  // Structure layout
  spawnRules: {              // Where it can spawn
    biomes: Array<String>,
    minDistance: Number,
    maxPerChunk: Number
  },
  loot: Array<LootTable>,    // What's inside
  npcs: Array<NPCSpawn>      // NPCs that spawn here
}
```

---

## Implementation Phases

### Phase 0: Integration Planning & Prototyping (1 week) - **NEW in v2.0**

**Goal**: Validate core assumptions and prototype terrain integration with existing systems BEFORE full implementation

**Critical Issue Addressed**: Original plan didn't validate how terrain height affects building placement, NPC pathfinding, combat, and line-of-sight. This phase reduces risk by prototyping integration first.

**Tasks**:
1. **Terrain Height Prototype**
   - Create minimal height map (doesn't need to be procedural yet)
   - Simple 10x10 grid with varied heights for testing
   - Render height visually (color-coded or stacked sprites)

2. **Building Placement on Slopes**
   - Prototype building placement validation with height
   - Test: Can buildings be placed on slopes?
   - Test: Auto-flatten terrain under buildings?
   - Test: Minimum/maximum slope requirements?
   - Decision: Flat terrain required, or support elevated buildings?

3. **NPC Pathfinding with Height**
   - Update pathfinding to consider terrain height
   - Test: Can NPCs navigate uphill/downhill?
   - Test: Max slope NPCs can traverse?
   - Test: Pathfinding performance with height data?
   - Decision: A* with height cost, or separate layers?

4. **Combat & Projectiles**
   - Test projectile physics with height differences
   - High ground advantage in combat?
   - Projectiles blocked by terrain elevation?
   - Decision: Simple 2D with height visuals, or true height physics?

5. **Line-of-Sight**
   - Test vision/fog of war with hills blocking view
   - Should hills block vision?
   - Performance impact of LOS calculations?
   - Decision: Implement terrain LOS or keep simple?

6. **Performance Baseline**
   - Measure current FPS without terrain
   - Add height data and measure impact
   - Establish performance budget for terrain features
   - Identify bottlenecks early

7. **Integration Documentation**
   - Document decisions made
   - Document integration points discovered
   - Update Phase 1 plan based on findings
   - Create integration test suite

**Deliverables**:
- ✅ Working prototype with terrain height + existing systems
- ✅ Documented decisions on building/pathfinding/combat integration
- ✅ Performance baseline established
- ✅ Integration test suite created
- ✅ Validated assumptions (or pivot plan based on findings)

**Success Criteria**:
- All integration questions answered
- No major technical blockers discovered
- Performance impact measured and acceptable
- Team confident in Phase 1 approach

**Risks Mitigated**:
- Discovering late that terrain breaks existing systems
- Performance issues discovered after full implementation
- Wasted effort on wrong approach
- Integration complexity underestimated

**Time Investment**: 1 week upfront saves 2-4 weeks of rework later

---

### Phase 1: Core Terrain Generation System (3-4 weeks) - **REVISED v2.0** (was 2-3 weeks)

**Goal**: Establish procedural terrain generation with height variation

**Tasks**:
1. **NoiseGenerator Implementation**
   - Implement Perlin noise algorithm (2D)
   - Implement Simplex noise algorithm (2D, optional 3D)
   - Multi-octave noise functions
   - Unit tests for noise consistency

2. **TerrainManager Implementation**
   - Height data structure (2D array per chunk)
   - Integration with GridManager
   - Terrain height query functions
   - Terrain modification support (digging, flattening)

3. **ChunkManager Implementation**
   - Chunk data structure (32x32 default size) - **REVISED v2.0** (was 16x16)
   - Chunk loading/unloading logic
   - Active chunk tracking based on player positions
   - Memory management and chunk limits
   - Async chunk generation (don't block main thread)

4. **WorldGenerator (Basic)**
   - World seed management
   - Basic terrain generation using noise
   - Chunk generation on-demand
   - World configuration (size, scale, octaves)

5. **Terrain Rendering**
   - New terrain rendering layer in GameViewport
   - Height-based tile coloring (darker = lower elevation)
   - Isometric height representation (optional: stacked tiles)
   - Camera culling for visible chunks only

6. **Save System Architecture** - **NEW in v2.0** (Full week dedicated)
   - Design differential save format (only save changes from procedural baseline)
   - Implement data compression for terrain/chunk data
   - Multiplayer save synchronization strategy
   - Version migration system (handle algorithm changes between versions)
   - Benchmark save/load performance (target: <2 seconds for large world)
   - Test save file size (target: <5 MB for typical world)

7. **Integration**
   - Integrate TerrainManager with GridManager
   - Update building placement to consider height (use Phase 0 decisions)
   - Update NPC pathfinding to consider terrain (use Phase 0 approach)
   - Implement save/load terrain data (using architecture from task 6)
   - Automated integration tests

**Deliverables**:
- ✅ Working procedural terrain generation
- ✅ Visible height variation in 2D viewport
- ✅ Chunk-based streaming working
- ✅ Terrain persists in save files
- ✅ Basic world configuration UI

**Success Criteria**:
- Terrain generates consistently from same seed
- Height variation is visually apparent
- Chunks load/unload smoothly without lag
- Buildings respect terrain height
- 60 FPS maintained with terrain rendering

---

### Phase 2: Biome System (2 weeks) - **REVISED v2.0** (was 1-2 weeks)

**Goal**: Create diverse biomes with different terrain characteristics

**Tasks**:
1. **BiomeManager Implementation** - **REVISED v2.0** (Added Voronoi approach)
   - **Primary**: Voronoi diagram generation with noise-based distortion
   - Voronoi seed point placement (1 per biome region)
   - Biome cell boundary distortion using Perlin noise (irregular shapes)
   - Biome type assignment based on region properties
   - **Fallback**: Temperature × Moisture lookup (if Voronoi proves complex)
   - Biome blending at boundaries with noise distortion

2. **Biome Definitions**
   - Create 6 core biomes:
     - **Plains**: Flat, grassy, moderate temp/moisture
     - **Forest**: Medium height variation, high moisture
     - **Desert**: Low height variation, low moisture, high temp
     - **Tundra**: Low height variation, low temp
     - **Mountains**: High height variation, low temp
     - **Swamp**: Low/flat, very high moisture
   - Configure biome-specific terrain heights
   - Configure biome terrain colors
   - Define biome transition rules

3. **Terrain Integration**
   - Update WorldGenerator to use BiomeManager
   - Biome-based terrain height modifiers
   - Biome-based terrain coloring
   - Smooth biome transitions

4. **Biome Rendering**
   - Color-code terrain by biome
   - Biome-specific terrain textures (if using sprites)
   - Minimap biome visualization

5. **Configuration & Tuning**
   - Biome configuration files (JSON)
   - Balance biome distribution
   - Tune temperature/moisture scales
   - Designer tools for biome testing

**Deliverables**:
- ✅ 6 distinct biomes with unique appearance
- ✅ Smooth biome transitions
- ✅ Biome data in configuration files
- ✅ Biome visualization on minimap

**Success Criteria**:
- Each biome is visually distinct
- Biome distribution is balanced (no huge deserts)
- Transitions are smooth and natural
- Biomes affect terrain height appropriately
- Same seed produces same biomes

---

### Phase 3: Environmental Props & Resources (3-4 weeks) - **REVISED v2.0** (was 2-3 weeks, now includes resources)

**Goal**: Populate the world with trees, rocks, and environmental details - **TREES/ROCKS ARE RESOURCES**

**Key Change**: Resource nodes moved from Phase 5 to Phase 3. Trees = wood, Rocks = stone. They're the same system!

**Tasks**:
1. **PropManager Implementation**
   - Prop data structure
   - Prop placement algorithm (biome-based density)
   - Prop collision detection
   - Prop removal/harvesting
   - Prop persistence (save/load)

2. **Prop Asset Creation** - **REVISED v2.0** (now includes resource nodes)
   - Create/acquire sprites for:
     - **Trees** (3-4 varieties) - **Resource**: Wood
     - **Rocks** (2-3 sizes) - **Resource**: Stone
     - **Ore veins** (Iron, Gold, Crystal) - **Resource**: Ore
     - **Herb patches** (Medicinal, Magical) - **Resource**: Herbs
     - Berry bushes (Food) - **Resource**: Berries
     - Mushroom clusters - **Resource**: Mushrooms
     - Bushes/shrubs (decorative, some harvestable)
     - Flowers/grass clumps (decorative)
     - Water features (ponds, decorative)
   - Create sprite manifest entries
   - Define prop configurations (including resource drop rates)

3. **Biome-Specific Prop Rules**
   - Forest: High tree density, bushes
   - Desert: Cacti, rocks, sparse vegetation
   - Plains: Scattered trees, flowers, grass
   - Tundra: Pine trees, rocks, ice
   - Mountains: Rocks, sparse trees
   - Swamp: Dead trees, reeds, murky water

4. **Prop Placement Algorithm**
   - Poisson disc sampling for natural distribution
   - Density maps based on biome
   - Avoid prop overlap
   - Respect terrain height and slopes
   - Avoid building/structure areas

5. **Prop Rendering** - **REVISED v2.0** (added batching/LOD early)
   - Render props in EnvironmentRenderer
   - **Sprite batching**: Group props by sprite type to reduce draw calls
   - **LOD system**: Simplified sprites for distant props (Phase 3, not Phase 8!)
   - Z-sorting for correct depth (optimize: sort once per frame)
   - Object pooling for prop instances (reuse objects, don't create/destroy)
   - Prop shadows (optional, low priority)
   - Animation for trees/bushes (wind sway - use CSS if possible)

6. **Water Features**
   - Lake/pond generation (low-lying areas)
   - River generation (connect water bodies, optional)
   - Water rendering (animated, blue overlay)
   - Shore detection and rendering

7. **Interactive Props**
   - Click to harvest trees/rocks
   - Drop resources (wood, stone, etc.)
   - Remove prop from world
   - Update spatial partitioning

**Deliverables**:
- ✅ Props populate world appropriately
- ✅ Each biome has distinct vegetation
- ✅ Props are interactive (harvestable)
- ✅ Water features generate naturally
- ✅ Prop sprites and rendering working

**Success Criteria - REVISED v2.0**:
- Props look natural and well-distributed
- No prop overlap or clipping
- **Performance: 500 props on screen at 60 FPS (desktop), 200 props at 30 FPS (mobile)** - **REVISED**
- Sprite batching reduces draw calls by 80%+
- LOD system working for distant props
- Harvesting works smoothly (trees → wood, rocks → stone)
- Resource gathering integrated with inventory
- Props persist correctly in saves

---

### Phase 4: Prefab Structures (2-3 weeks) - **REVISED v2.0** (Prefabs first, procedural later)

**Goal**: Generate ruins, villages, and points of interest using **prefab templates**

**Key Change**: Start with hand-crafted prefab structures, NOT full procedural generation. Procedural variation added later.

**Rationale**: Procedural structure generation is complex (door alignment, multi-story, interiors, loot placement). Deliver value faster with prefabs, iterate to procedural.

**Tasks**:
1. **StructureGenerator Implementation**
   - Structure template system (load from JSON/data files)
   - Structure placement algorithm (find suitable locations)
   - Structure overlap prevention
   - Structure-terrain integration (flatten area under structure)
   - **NOT YET**: Full procedural generation (Phase 4+, post-launch)

2. **Structure Templates (Hand-Crafted Prefabs)** - **REVISED v2.0**
   - Create 5-10 prefab structure templates:
     - Small ruins (2x2, 3x3) - 2 variations each
     - Large ruins (5x5, 7x7) - 2 variations each
     - NPC hut - 3 variations
     - Small village (cluster of 3-5 huts)
     - Resource camp (1-2 variations)
     - Dungeon entrance marker
     - Abandoned tower
     - Stone circle
   - Define structure tile layouts in data files (JSON)
   - Define loot tables per structure type
   - Define NPC spawn points per structure
   - Define door/entrance positions
   - Define interior tiles (if multi-story)

3. **Structure Placement Rules**
   - Minimum distance between structures
   - Biome-specific structure types
   - Structure rarity/density
   - Avoid player spawn areas
   - Terrain suitability checks

4. **Structure Generation**
   - Generate structures during chunk generation
   - Flatten terrain under structures
   - Place structure tiles
   - Spawn loot containers
   - Spawn NPCs (if applicable)

5. **Structure Rendering**
   - Render structure tiles
   - Support multi-tile structures
   - Visual markers for entrances (dungeons)

6. **Structure Interaction**
   - Click to enter buildings
   - Open loot containers
   - Talk to NPCs in structures
   - Structure ownership (villages)

**Deliverables**:
- ✅ Structures generate across world
- ✅ 5+ structure types implemented
- ✅ Structures contain loot and NPCs
- ✅ Biome-appropriate structure types
- ✅ Structures are interactive

**Success Criteria**:
- Structures generate at appropriate density
- No structure overlap
- Structures enhance exploration
- Structures integrate with terrain
- Performance remains at 60 FPS

---

### ~~Phase 5: Resource Nodes System~~ - **MOVED TO PHASE 3** ✅

**This phase has been merged into Phase 3 (Environmental Props & Resources).**

**Rationale**: Trees and rocks ARE resources (wood, stone). Combining props and resources into one phase:
- Reduces duplication (same placement, rendering, harvesting systems)
- Delivers gameplay value earlier
- Simplifies architecture

See **Phase 3** for full resource implementation.

---

### Phase 5: Day/Night Cycle & Weather (2-3 weeks) - **REVISED v2.0** (was Phase 6)

**Goal**: Add dynamic time and weather systems

**Tasks**:
1. **DayNightCycle Implementation**
   - Time tracking (0-24 hour cycle)
   - Configurable day length (e.g., 20 real minutes = 1 game day)
   - Time events (dawn, noon, dusk, night)
   - Event system for time-based triggers

2. **Lighting System - REVISED v2.0 (Overlay Approach)**
   - **Overlay method**: Semi-transparent dark overlay (NOT per-sprite tinting)
   - Sinusoidal darkness calculation (0.0-0.7 opacity)
   - Apply as canvas globalAlpha or CSS overlay
   - **Alternative**: Pre-baked day/night sprite variants (swap sprites)
   - **NOT**: Dynamic lighting per sprite (too expensive for Canvas 2D)
   - Lantern/torch radius for player (optional, light circle around player)
   - Building lights at night (light windows on building sprites)

3. **Day/Night Effects**
   - Visual sky color changes (simple background color transition)
   - Darkness overlay opacity changes (smooth sinusoidal curve)
   - Star/moon rendering at night (simple sprites in sky layer)
   - Time-based NPC schedules (optional - NPCs sleep at night)

4. **WeatherSystem Implementation**
   - Weather states: Clear, Cloudy, Rain, Snow, Storm
   - Weather transitions
   - Weather duration (random, 2-10 minutes)
   - Biome-specific weather (no snow in desert)

5. **Weather Rendering - REVISED v2.0 (Reduced particles)**
   - **Rain particles**: 50-100 MAX (desktop), 30-50 (mobile) - **NOT 500!**
   - **Snow particles**: 50-100 MAX (desktop), 30-50 (mobile)
   - **Particle pooling**: Reuse particle objects, don't create/destroy
   - **Alternative**: CSS rain/snow animation overlays (more performant)
   - **Alternative**: Animated sprite overlays (rain streaks, snow texture)
   - Cloud overlay (translucent, simple sprite or gradient)
   - Lightning flashes (full-screen white flash, no particles)
   - Wind effects (tree sway - reuse from prop rendering Phase 3)

6. **Weather Gameplay Effects**
   - Rain reduces visibility slightly
   - Snow slows movement
   - Storms affect combat accuracy
   - Weather affects NPC behavior

7. **UI Integration**
   - Time display (clock widget)
   - Weather indicator
   - Forecast (optional)

**Deliverables**:
- ✅ Day/night cycle with visible lighting
- ✅ 5 weather types with effects
- ✅ Weather particles rendering
- ✅ Gameplay effects implemented
- ✅ UI shows time and weather

**Success Criteria - REVISED v2.0**:
- Time progresses smoothly
- **Lighting changes are noticeable (overlay method working)**
- **Overlay approach performs well (<2% FPS impact)**
- Weather feels immersive
- **Weather particles perform well (50-100 particles, <3% FPS impact)**
- Weather effects are balanced
- **Total performance impact: <5% FPS** (was correct)

---

### Phase 6: Interactive Terrain (2 weeks) - **REVISED v2.0** (was Phase 7, was 1-2 weeks)

**Goal**: Allow players to modify the environment

**Tasks**:
1. **Terrain Modification System**
   - Dig terrain (lower height)
   - Fill terrain (raise height)
   - Flatten terrain (make level)
   - Terraform tools for players

2. **Modification Rules**
   - Max height limits
   - Min height limits
   - Modification costs (resources/energy)
   - Modification radius

3. **Terrain Modification Rendering**
   - Real-time terrain updates
   - Modified terrain coloring
   - Terrain scars/marks

4. **Environmental Destruction**
   - Chop trees → wood + remove tree
   - Mine rocks → stone + remove rock
   - Harvest bushes → berries + remove bush
   - Prop regeneration over time

5. **Building on Modified Terrain**
   - Buildings require flat terrain
   - Auto-flatten option
   - Terrain restoration on building removal

6. **Persistence**
   - Save terrain modifications
   - Save destroyed props
   - Restore state on load

**Deliverables**:
- ✅ Terrain can be dug/filled/flattened
- ✅ Environmental props are destructible
- ✅ Modifications persist in saves
- ✅ Building placement considers modifications
- ✅ UI tools for terrain modification

**Success Criteria**:
- Terrain modification feels responsive
- Modified terrain renders correctly
- No exploits (infinite resources)
- Performance: modifications don't lag

---

### Phase 7: Final Optimization & Polish (2 weeks) - **REVISED v2.0** (was Phase 8)

**Goal**: Final performance tuning, stability, and visual polish

**IMPORTANT**: Optimization is ONGOING throughout all phases, not just this final phase!
- Phase 1: Async chunk loading, performance baseline
- Phase 3: Sprite batching, LOD, object pooling
- Phase 5: Particle pooling, overlay approach
- Phase 7: Final tuning and polish

**Tasks**:
1. **Performance Profiling & Tuning**
   - Profile rendering performance across all devices
   - Identify and fix remaining bottlenecks
   - **Already Done in Earlier Phases**: Async chunks, sprite batching, LOD, object pooling
   - Spatial indexing optimization (if needed)
   - Texture atlas for sprites (if not already done)

2. **Memory Optimization**
   - Chunk unloading based on distance
   - Texture atlas for sprites
   - Reduce redundant data storage
   - Memory leak testing

3. **Mobile Optimization**
   - Reduce chunk view distance on mobile
   - Lower particle counts
   - Simplified rendering
   - Touch controls for terrain modification

4. **Visual Polish**
   - Ambient animations (birds, butterflies)
   - Environmental sounds (wind, water, birds)
   - Minimap improvements
   - Fog of war (unexplored areas)

5. **Configuration & Balance**
   - World generation presets (Normal, Large, Islands, etc.)
   - Difficulty settings (resource abundance)
   - Designer tools for content creation
   - Debug visualization tools

6. **Comprehensive Testing - REVISED v2.0 (Enhanced)**
   - Load testing (large worlds, 10+ players)
   - Multiplayer sync testing (desync scenarios)
   - Save/load testing (large files, version migration)
   - Edge case handling (world borders, chunk boundaries)
   - **NEW**: Automated performance regression tests
   - **NEW**: Chunk boundary edge case tests
   - **NEW**: Biome generation determinism tests (same seed = same world)
   - **NEW**: Memory leak monitoring (long-running sessions)
   - **NEW**: Automated integration test suite (from Phase 0)

7. **Documentation**
   - Update ARCHITECTURE.md
   - Update DEVELOPMENT_GUIDE.md
   - Create environment system guide
   - Document configuration options

**Deliverables**:
- ✅ 60 FPS desktop, 30 FPS mobile
- ✅ Smooth chunk loading
- ✅ Memory usage optimized
- ✅ Visual and audio polish
- ✅ Complete documentation

**Success Criteria**:
- Performance targets met
- No memory leaks
- Stable multiplayer sync
- Complete and accurate documentation

---

## File Structure

### New Files to Create

```
src/
├── modules/
│   └── environment/                          # New environment module
│       ├── EnvironmentModule.js              # Main module orchestrator
│       ├── WorldGenerator.js                 # World generation orchestration
│       ├── NoiseGenerator.js                 # Perlin/Simplex noise
│       ├── BiomeManager.js                   # Biome generation and lookup
│       ├── TerrainManager.js                 # Terrain height and modification
│       ├── ChunkManager.js                   # Chunk loading/unloading
│       ├── PropManager.js                    # Environmental props
│       ├── StructureGenerator.js             # Procedural structures
│       ├── ResourceNodeManager.js            # Resource gathering nodes
│       ├── DayNightCycle.js                  # Time of day system
│       ├── WeatherSystem.js                  # Weather states and effects
│       └── EnvironmentRenderer.js            # Rendering for environment
│
├── config/
│   └── environment/                          # Configuration files
│       ├── biomes/
│       │   ├── forest.json
│       │   ├── desert.json
│       │   ├── plains.json
│       │   ├── tundra.json
│       │   ├── mountains.json
│       │   └── swamp.json
│       ├── props/
│       │   ├── trees.json
│       │   ├── rocks.json
│       │   ├── vegetation.json
│       │   └── water.json
│       ├── structures/
│       │   ├── ruins.json
│       │   ├── villages.json
│       │   └── dungeons.json
│       ├── resources/
│       │   └── nodes.json
│       ├── weather.json
│       └── world-presets.json                # World gen presets
│
├── assets/
│   └── environment-sprites.js                # Environment sprite manifest
│
├── utils/
│   └── noise/                                # Noise utilities
│       ├── perlin.js
│       └── simplex.js
│
└── stores/
    └── useEnvironmentStore.js                # Environment state management

public/
└── assets/
    └── sprites/
        └── environment/                      # New sprite directory
            ├── trees/
            │   ├── oak.png
            │   ├── pine.png
            │   └── dead-tree.png
            ├── rocks/
            │   ├── small-rock.png
            │   └── large-rock.png
            ├── vegetation/
            │   ├── bush.png
            │   ├── flowers.png
            │   └── grass.png
            ├── water/
            │   └── pond.png
            └── structures/
                ├── ruin-small.png
                ├── ruin-large.png
                └── hut.png

documentation/
└── planning/
    └── GAME_ENVIRONMENT_IMPLEMENTATION_PLAN.md  # This document
```

### Modified Files

```
src/
├── GameManager.js                            # Register EnvironmentModule
├── components/GameViewport.jsx               # Add environment rendering
├── modules/foundation/GridManager.js         # Integrate terrain height
├── stores/useGameStore.js                    # Add environment state
└── config/monsters/                          # Update with biome spawning
```

---

## Technical Specifications

### Noise Generation

**Perlin Noise Parameters**:
- **Octaves**: 4-6 (more = more detail)
- **Persistence**: 0.5 (how much each octave contributes)
- **Lacunarity**: 2.0 (frequency multiplier)
- **Scale**: 0.01-0.05 (lower = larger features)

**Use Cases**:
- Terrain height: 4 octaves, scale 0.02
- Temperature map: 3 octaves, scale 0.01
- Moisture map: 3 octaves, scale 0.015

### Chunk System

**Chunk Size**: 32x32 tiles (configurable) - **REVISED v2.0** (was 16x16)
**Load Radius**: 3 chunks (desktop), 2 chunks (mobile)
**Unload Distance**: 5 chunks
**Max Active Chunks**: 100 (desktop), 50 (mobile)

**Rationale for 32x32**:
- Reduces chunk loading frequency (player at 5 tiles/sec = ~6 seconds per chunk vs 3 seconds with 16x16)
- Fewer chunk boundaries to manage
- Less overhead from chunk generation/loading
- Still granular enough for streaming

**Chunk Coordinates**:
```javascript
chunkX = Math.floor(worldX / CHUNK_SIZE)
chunkZ = Math.floor(worldZ / CHUNK_SIZE)
```

**Chunk Key**: `${chunkX},${chunkZ}`

### Biome Generation - **REVISED v2.0**

**Primary Approach: Voronoi Diagrams** (More natural than grid-based)
```javascript
// Use Voronoi cells with noise-based distortion for irregular biome shapes
// This creates organic, naturalistic biome distributions
// Rather than rigid temperature × moisture grids

// 1. Generate Voronoi seed points (one per biome region)
// 2. Distort cell boundaries with Perlin noise
// 3. Assign biome types based on region properties
// 4. Blend at boundaries for smooth transitions
```

**Fallback: Temperature × Moisture Lookup** (Simpler, but less organic)
```javascript
// Temperature (-1 to 1) × Moisture (-1 to 1) → Biome
const BIOME_TABLE = {
  // Cold
  'cold-dry':    'tundra',
  'cold-wet':    'tundra',
  // Temperate
  'temp-dry':    'plains',
  'temp-wet':    'forest',
  // Hot
  'hot-dry':     'desert',
  'hot-wet':     'swamp',
  // Mountains (high elevation override)
  'mountain':    'mountains'
};
```

**Biome Blending**:
- Sample 4 nearest biomes (or Voronoi neighbors)
- Weighted average based on distance
- Smooth interpolation for colors/heights
- Noise-based distortion for irregular boundaries (not straight lines)

### Prop Placement

**Poisson Disc Sampling**:
- Minimum distance between props: 2-5 tiles
- Attempts per tile: 30
- Faster than pure random, more natural

**Density by Biome**:
- Forest: 0.4 props/tile
- Plains: 0.1 props/tile
- Desert: 0.05 props/tile
- Tundra: 0.1 props/tile
- Mountains: 0.15 props/tile
- Swamp: 0.3 props/tile

### Structure Placement

**Placement Rules**:
- Min distance between structures: 50 tiles
- Max structures per chunk: 1 (large), 3 (small)
- Avoid chunk edges (to prevent cutting)
- Flatten 1-tile border around structure

### Day/Night Cycle - **REVISED v2.0**

**Time Scale**: 1 real minute = 1 game hour (configurable)
**Full Day**: 24 real minutes

**Implementation Approach: Overlay Method** (More performant than dynamic lighting)
```javascript
// Use semi-transparent overlay instead of per-sprite tinting
// Avoids expensive redraw of all sprites

// Overlay opacity calculation (sinusoidal)
const time = getCurrentGameTime(); // 0-24
const darkness = 0.5 - 0.5 * Math.cos((time / 24) * Math.PI * 2);
const maxDarkness = 0.7; // Never completely black
const overlayOpacity = Math.min(darkness, maxDarkness);

// Apply as CSS overlay or canvas globalAlpha
canvas.globalAlpha = overlayOpacity;
ctx.fillStyle = '#000033'; // Dark blue for night
ctx.fillRect(0, 0, canvas.width, canvas.height);
canvas.globalAlpha = 1.0;
```

**Alternative: Pre-baked Sprite Variants**
- Day sprites (normal)
- Night sprites (darker versions)
- Swap sprites based on time of day
- Less flexible but very performant

**Light Levels**:
- Noon (12:00): 0.0 overlay opacity (full brightness)
- Dusk (18:00): 0.4 overlay opacity
- Night (0:00): 0.7 overlay opacity (never completely dark)
- Dawn (6:00): 0.4 overlay opacity

### Weather System

**Weather Probabilities by Biome**:
- Forest: 40% rain, 10% storm
- Desert: 5% rain
- Plains: 30% rain, 5% storm
- Tundra: 50% snow
- Mountains: 40% snow, 15% storm
- Swamp: 60% rain

**Weather Duration**: 2-10 minutes (random)

**Particle Counts - REVISED v2.0**:
- Desktop: 50-100 rain/snow particles MAX (was 500 - unrealistic for Canvas 2D)
- Mobile: 30-50 rain/snow particles MAX (was 200)
- **IMPORTANT**: Use particle pooling from day 1 to reuse objects
- **Alternative**: CSS animations or canvas overlay effects (more performant than particles)

**Rationale**: 500 particles = 30-40% of frame budget in Canvas 2D. Start conservative.

### Performance Budgets

**Frame Time Budget** (60 FPS = 16.67ms):
- Terrain rendering: 4ms
- Prop rendering: 3ms
- Weather particles: 2ms
- Game logic: 5ms
- Rendering other: 2.67ms

**Memory Budget - REVISED v2.0**:
- Chunk data: ~20 KB per chunk (32x32 vs 16x16, was ~10 KB)
- 100 active chunks: ~2 MB (was ~1 MB)
- Props: ~100 bytes per prop
- Target: 500 visible props on screen (desktop)
- Total props in memory: ~5,000 props across loaded chunks = ~500 KB
- Total environment: <5 MB (still achievable)

---

## Performance Considerations

### Rendering Optimization

1. **Chunk Culling**: Only render chunks in viewport
2. **Prop Culling**: Only render props in viewport
3. **Z-Index Sorting**: Sort props once per frame, not per prop
4. **Batch Rendering**: Group props by sprite type
5. **Canvas Layering**: Separate terrain, props, entities into layers

### Memory Management

1. **Chunk Unloading**: Unload chunks >5 chunks away from any player
2. **Prop Pooling**: Reuse prop objects instead of creating new
3. **Texture Atlas**: Combine sprites into single texture
4. **Data Compression**: Use typed arrays for terrain height

### Multiplayer Sync

1. **Chunk Streaming**: Only send chunk data when player approaches
2. **Prop Delta Updates**: Only sync prop changes (destroyed/added)
3. **Terrain Modifications**: Broadcast terrain changes to nearby players
4. **Weather Sync**: Sync weather state, not particles

### Mobile Performance

1. **Reduced View Distance**: 2 chunks vs 3 on desktop
2. **Lower Particle Count**: 200 vs 500
3. **Simplified Rendering**: No shadows, reduced effects
4. **Lower Resolution**: Scale canvas for performance

---

## Timeline Estimates

### Full Implementation Timeline - **REVISED v2.0**

| Phase | Duration (v2.0) | v1.0 Duration | Dependencies | Notes |
|-------|-----------------|---------------|--------------|-------|
| **Phase 0: Integration Planning** | 1 week | (NEW) | None | **NEW** - Validate assumptions first |
| **Phase 1: Core Terrain** | 3-4 weeks | 2-3 weeks | Phase 0 | +1 week for save system architecture |
| **Phase 2: Biomes** | 2 weeks | 1-2 weeks | Phase 1 | Voronoi adds complexity |
| **Phase 3: Props + Resources** | 3-4 weeks | 2-3 weeks | Phase 1, 2 | Now includes resources (was Phase 5) |
| **Phase 4: Prefab Structures** | 2-3 weeks | 2-3 weeks | Phase 1, 2, 3 | Prefabs simplifies vs full procedural |
| ~~**Phase 5: Resources**~~ | (MERGED) | 1-2 weeks | - | **REMOVED** - Merged into Phase 3 |
| **Phase 5: Day/Night/Weather** | 2-3 weeks | 2 weeks | Phase 1, 3 | Was Phase 6, overlay approach |
| **Phase 6: Interactive Terrain** | 2 weeks | 1-2 weeks | Phase 1, 3 | Was Phase 7 |
| **Phase 7: Final Polish** | 2 weeks | 1-2 weeks | All phases | Was Phase 8, optimization ongoing |
| **Total** | **16-24 weeks** | **12-18 weeks** | Sequential + parallel | **+30-40% buffer added** |

**Key Changes**:
- ✅ Added Phase 0 (1 week) - Integration prototyping
- ✅ Extended Phase 1 by 1 week - Save system architecture
- ✅ Removed Phase 5 - Resources merged into Phase 3
- ✅ Total timeline: **16-24 weeks** (was 12-18 weeks) - **+4-6 weeks more realistic**

### Parallel Work Opportunities - **REVISED v2.0**

Some phases can be worked on in parallel:
- Phase 5 (Day/Night) can be developed independently after Phase 1 (low dependency)
- Asset creation can happen parallel to development (sprites, structures)
- Testing can begin early (Phase 1+) with automated tests

**Optimized Timeline**: 14-20 weeks with 2 developers (was 10-14 weeks)

### Milestones - **REVISED v2.0**

**Week 1**:
- ✅ Phase 0 complete: Integration assumptions validated

**Month 1** (Weeks 2-5):
- ✅ Phase 1 complete: Terrain generation + save system working
- ✅ Phase 2 started: Biome implementation underway

**Month 2** (Weeks 6-9):
- ✅ Phase 2 complete: Biomes visually distinct
- ✅ Phase 3 in progress: Props and resources generating

**Month 3** (Weeks 10-13):
- ✅ Phase 3 complete: World populated with props and resources
- ✅ Phase 4 in progress: First structures generating

**Month 4** (Weeks 14-17):
- ✅ Phase 4 complete: Structures working
- ✅ Phase 5 in progress: Day/night and weather

**Month 5** (Weeks 18-21):
- ✅ Phase 5-6 complete: Day/night, weather, interactive terrain
- ✅ Phase 7 in progress: Final optimization and polish

**Month 6** (Weeks 22-24, Buffer):
- ✅ Phase 7 complete: Production ready
- ✅ Testing and bug fixes
- ✅ Documentation complete
- ✅ Buffer for unforeseen issues

---

## Success Criteria

### Technical Success Criteria

- ✅ **Performance**: 60 FPS on desktop, 30 FPS on mobile with full environment
- ✅ **Scalability**: Support worlds with 10,000+ tiles without lag
- ✅ **Multiplayer**: <10 players sync smoothly
- ✅ **Memory**: Environment uses <10 MB memory
- ✅ **Persistence**: All environment data saves/loads correctly
- ✅ **Stability**: No crashes or memory leaks after 1 hour play

### Gameplay Success Criteria

- ✅ **Variety**: 6+ distinct biomes easily recognizable
- ✅ **Exploration**: Players motivated to explore and discover
- ✅ **Interaction**: Environment feels responsive and interactive
- ✅ **Immersion**: Day/night and weather enhance atmosphere
- ✅ **Balance**: Resource distribution supports economy
- ✅ **Replayability**: Different seeds create meaningfully different worlds

### User Experience Success Criteria

- ✅ **Visual Clarity**: Environment doesn't obscure important UI/entities
- ✅ **Readability**: Terrain height is visually clear
- ✅ **Responsiveness**: Interactions (harvesting, digging) feel immediate
- ✅ **Accessibility**: Clear visual indicators for colorblind players
- ✅ **Tutorial**: New players understand environment interactions
- ✅ **Feedback**: Clear feedback for all environmental actions

### Development Success Criteria

- ✅ **Modularity**: Environment system is modular and maintainable
- ✅ **Extensibility**: Easy to add new biomes, props, structures
- ✅ **Configuration**: Designers can configure without code changes
- ✅ **Testing**: Unit tests for core systems (noise, biomes, chunks)
- ✅ **Documentation**: Complete documentation for all systems
- ✅ **Code Quality**: Follows project code standards

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Performance degradation** | High | Medium | Early profiling, performance budgets, optimization phase |
| **Multiplayer sync issues** | High | Medium | Delta updates only, chunk streaming, thorough testing |
| **Memory leaks** | High | Low | Object pooling, proper cleanup, memory profiling |
| **Save file bloat** | Medium | Medium | Data compression, only save modified chunks |
| **Rendering bugs** | Medium | Medium | Extensive testing, fallback rendering modes |

### Content Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Biomes not visually distinct** | Medium | Low | Art direction, community feedback, iteration |
| **World feels empty** | High | Medium | Tune prop density, add ambient life, structures |
| **Resources too abundant/scarce** | Medium | Medium | Balance testing, configurable spawn rates |
| **Structures feel repetitive** | Medium | High | More templates, procedural variation |

### Schedule Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Phase delays** | Medium | Medium | Buffer time in schedule, parallel work |
| **Scope creep** | High | High | Strict phase boundaries, MVP focus first |
| **Asset creation bottleneck** | Medium | Medium | Use placeholder sprites, parallel asset work |
| **Integration issues** | High | Low | Early integration, continuous testing |

---

## Testing Strategy

### Unit Testing

**Test Coverage Goals**: 80%+

**Critical Test Areas**:
- NoiseGenerator: Consistent output for same inputs
- BiomeManager: Correct biome lookup
- ChunkManager: Load/unload logic
- TerrainManager: Height queries and modifications
- PropManager: Placement and removal

### Integration Testing

**Test Scenarios**:
1. Full world generation from seed
2. Chunk loading as player moves
3. Save/load full environment state
4. Multiplayer environment sync
5. Terrain modification + building placement

### Performance Testing

**Benchmarks**:
- Generate 100 chunks: <5 seconds
- Render 1000 props: 60 FPS
- Weather particles: <5% frame time
- Chunk load time: <100ms
- Memory usage: <10 MB

### User Testing

**Playtesting Focus**:
- First impressions (is environment appealing?)
- Exploration motivation (do players explore?)
- Resource discovery (can players find resources?)
- Environmental interactions (intuitive?)
- Performance on various devices

---

## Future Enhancements

### Post-Launch Features

**Phase 9: Advanced Features** (Optional)
- Seasons: Spring/Summer/Fall/Winter transformations
- Environmental hazards: Quicksand, lava, poison gas
- Dynamic events: Forest fires, earthquakes, meteor strikes
- Fauna: Ambient animals (deer, birds, rabbits)
- Advanced water: Flowing rivers, waterfalls, flooding

**Phase 10: Content Expansion** (Optional)
- 5+ additional biomes (Jungle, Volcano, Crystal Caves, etc.)
- 20+ more structures
- Rare/legendary structures (Dragon lairs, Ancient temples)
- Underground layer (caves, mines)
- Sky layer (floating islands, cloud cities)

**Phase 11: Designer Tools** (Optional)
- In-game world editor
- Custom biome creator
- Structure template editor
- World export/import
- Modding support

---

## References

### Internal Documentation

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [CURRENT_STATUS.md](../../CURRENT_STATUS.md) - Current project status
- [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md) - Development patterns
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines

### External Resources

**Procedural Generation**:
- [Perlin Noise](https://en.wikipedia.org/wiki/Perlin_noise)
- [Simplex Noise](https://en.wikipedia.org/wiki/Simplex_noise)
- [Poisson Disc Sampling](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf)

**Biome Generation**:
- [Biome Generation with Voronoi Diagrams](https://www.redblobgames.com/maps/terrain-from-noise/)
- [Temperature & Moisture Based Biomes](https://mewo2.com/notes/terrain/)

**Chunk Systems**:
- [Minecraft Chunk Loading](https://minecraft.fandom.com/wiki/Chunk)
- [Spatial Partitioning](https://gameprogrammingpatterns.com/spatial-partition.html)

**Performance**:
- [Canvas Performance Tips](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Object Pooling Pattern](https://gameprogrammingpatterns.com/object-pool.html)

### Code Examples

**Existing Systems to Reference**:
- `src/modules/foundation/GridManager.js` - Grid and spatial queries
- `src/modules/foundation/SpatialPartitioning.js` - Chunk indexing
- `src/components/GameViewport.jsx` - Rendering pipeline
- `src/GameManager.js` - Module integration pattern
- `src/entities/Monster.js` - Entity system pattern

---

## Version History

- **v2.0** (2025-11-20) - Major revision with expert feedback
  - Added Phase 0: Integration Planning & Prototyping
  - Timeline increased 30-40% (16-24 weeks vs 12-18 weeks)
  - Chunk size increased (32x32 vs 16x16)
  - Performance targets revised (500 props vs 1000+)
  - Biome generation: Voronoi approach added
  - Resources moved to Phase 3 (merged with props)
  - Weather particles reduced (50-100 vs 500)
  - Structure generation: Prefabs first (vs full procedural)
  - Day/night: Overlay approach (vs dynamic lighting)
  - Testing strategy enhanced (automated tests added)
  - Save system architecture added to Phase 1
  - Optimization made ongoing (not just final phase)

- **v1.0** (2025-11-20) - Initial comprehensive plan created
  - All 8 phases detailed
  - Technical specifications defined
  - Timeline and success criteria established
  - Risk assessment completed

---

**Document Created:** 2025-11-20
**Current Version:** 2.0
**Last Revised:** 2025-11-20
**Author:** Environment System Planning Team
