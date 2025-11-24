# Phase 4: Dungeon System Implementation Plan

**Last Updated:** November 24, 2025
**Author:** Claude (AI Assistant)
**Status:** Draft - Awaiting Review
**Purpose:** Detailed implementation plan for procedural dungeon system

**Related Documents:**
- [Gameplay Features Implementation Plan](GAMEPLAY_FEATURES_IMPLEMENTATION_PLAN.md)
- [Current Status](../../CURRENT_STATUS.md)

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Phase 4A: Dungeon Entity & Room System](#phase-4a-dungeon-entity--room-system)
4. [Phase 4B: Procedural Generator](#phase-4b-procedural-generator)
5. [Phase 4C: Dungeon Encounters](#phase-4c-dungeon-encounters)
6. [Phase 4D: Boss Mechanics](#phase-4d-boss-mechanics)
7. [Phase 4E: Dungeon UI & Integration](#phase-4e-dungeon-ui--integration)
8. [Testing Strategy](#testing-strategy)
9. [Implementation Timeline](#implementation-timeline)
10. [Technical Considerations](#technical-considerations)
11. [Risk Assessment](#risk-assessment)

---

## Overview

### Goals

Phase 4 adds instanced, procedurally-generated dungeons with boss encounters, special loot, and structured progression to the game.

**Core Features:**
- Procedurally generated dungeon layouts
- Room-based dungeon structure
- Dungeon-specific monster encounters
- Boss fights with unique mechanics
- Entrance/exit teleportation system
- Special loot tables for dungeons
- Dungeon completion tracking

**Design Principles:**
- **Replayability** - Every dungeon run feels different
- **Progression** - Dungeons provide meaningful rewards
- **Challenge** - Dungeons are harder than overworld content
- **Accessibility** - Clear entrance/exit mechanics
- **Integration** - Seamlessly connects with existing quest/loot systems

### Success Criteria

**Minimum Viable Product:**
- [ ] 3 dungeon types with different layouts
- [ ] 2 room types (corridor, chamber)
- [ ] Boss encounters at dungeon end
- [ ] Entrance/exit teleportation working
- [ ] Special loot drops from bosses
- [ ] Basic dungeon completion tracking

**Full Implementation:**
- [ ] 5+ dungeon types
- [ ] 5+ room types with variety
- [ ] 3+ boss types with unique mechanics
- [ ] Dungeon quests integration
- [ ] Leaderboard/completion stats
- [ ] Dungeon difficulty scaling

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Game World                           │
│  ┌──────────────┐         ┌─────────────────────────┐  │
│  │   Overworld  │◄────────┤  Dungeon Entrance      │  │
│  │   (Main Map) │  Player │  (Structure/Portal)    │  │
│  └──────────────┘  Clicks └─────────────────────────┘  │
│                         │                               │
│                         ▼                               │
│               ┌──────────────────┐                      │
│               │ Dungeon Instance │                      │
│               └──────────────────┘                      │
│                         │                               │
│        ┌────────────────┼────────────────┐             │
│        ▼                ▼                ▼             │
│  ┌─────────┐     ┌──────────┐    ┌──────────┐        │
│  │ Rooms   │     │ Monsters │    │  Loot    │        │
│  │ Layout  │     │Encounters│    │  Tables  │        │
│  └─────────┘     └──────────┘    └──────────┘        │
│        │                                               │
│        └──────────► Boss Room (End)                    │
│                            │                           │
│                            ▼                           │
│                    ┌──────────────┐                    │
│                    │ Exit Portal  │                    │
│                    └──────────────┘                    │
│                            │                           │
│                            ▼                           │
│                    Return to Overworld                 │
└─────────────────────────────────────────────────────────┘
```

### Core Components

**Entity Layer:**
- `Dungeon` - Dungeon instance with metadata
- `DungeonRoom` - Individual room in dungeon
- `DungeonBoss` - Boss monster with special mechanics
- `DungeonEntrance` - Portal/structure in overworld

**System Layer:**
- `DungeonGenerator` - Procedural generation logic
- `DungeonManager` - Instance lifecycle management
- `DungeonEncounterSystem` - Spawns monsters in rooms
- `BossAI` - Extended AI for boss fights

**Store Layer:**
- `useDungeonStore` - Zustand store for dungeon state

**Renderer Layer:**
- `useDungeonRenderer` - Renders dungeon rooms and layout
- `useBossRenderer` - Special rendering for bosses

---

## Phase 4A: Dungeon Entity & Room System

### Objectives

Create the foundational data structures for dungeons and rooms.

### Implementation Steps

#### 4A.1: Dungeon Entity Class

**File:** `src/entities/Dungeon.js`

**Class Structure:**
```javascript
class Dungeon {
  constructor(config) {
    this.id = uuid();
    this.type = config.type; // 'CAVE', 'CRYPT', 'RUINS', etc.
    this.level = config.level; // Dungeon difficulty level
    this.rooms = []; // Array of DungeonRoom instances
    this.startRoom = null; // Entry room
    this.bossRoom = null; // Final room
    this.layout = null; // Graph structure of rooms
    this.seed = config.seed || Math.random(); // For procedural generation
    this.state = 'ACTIVE'; // ACTIVE, COMPLETED, ABANDONED
    this.createdAt = Date.now();
    this.completedAt = null;
    this.monstersKilled = 0;
    this.deaths = 0;
    this.timeSpent = 0;
  }

  // Methods
  getRoom(roomId)
  getRoomAt(x, y)
  getRoomNeighbors(room)
  isComplete()
  complete()
  toJSON()
  static fromJSON(data)
}
```

**Properties:**
- **Type** - Visual theme and monster types
- **Level** - Difficulty scaling (1-10)
- **Rooms** - Connected room graph
- **Seed** - For reproducible generation
- **State** - Lifecycle tracking
- **Stats** - Completion metrics

#### 4A.2: DungeonRoom Entity Class

**File:** `src/entities/DungeonRoom.js`

**Class Structure:**
```javascript
class DungeonRoom {
  constructor(config) {
    this.id = uuid();
    this.type = config.type; // 'CORRIDOR', 'CHAMBER', 'BOSS', 'TREASURE'
    this.position = config.position; // {x, y} in dungeon grid
    this.size = config.size; // {width, height} in tiles
    this.connections = []; // Array of connected room IDs
    this.doors = []; // Array of {direction, targetRoomId}
    this.monsters = []; // Monster spawn points
    this.loot = []; // Loot spawn points
    this.props = []; // Environmental objects
    this.explored = false;
    this.cleared = false; // All monsters defeated
  }

  // Methods
  addConnection(roomId, direction)
  removeConnection(roomId)
  isAccessibleFrom(roomId)
  spawnMonsters(dungeonLevel)
  clearRoom()
  toJSON()
}
```

**Room Types:**
- **CORRIDOR** - Narrow connecting passage (5x3 tiles)
- **CHAMBER** - Large combat room (10x10 tiles)
- **BOSS** - Final boss arena (15x15 tiles)
- **TREASURE** - Loot room (8x8 tiles)
- **ENTRANCE** - Starting room (8x8 tiles)

#### 4A.3: DungeonEntrance Structure

**File:** `src/entities/structures/DungeonEntrance.js`

**Structure Data:**
```javascript
{
  id: 'dungeon_entrance_1',
  name: 'Cave Entrance',
  type: 'DUNGEON_ENTRANCE',
  position: {x, y, z},
  dungeonType: 'CAVE',
  dungeonLevel: 5,
  requiredLevel: 5,
  active: true,
  cooldown: 0 // Time before can re-enter (ms)
}
```

**Integration:**
- Add to structure system (existing)
- Render in overworld with special icon
- Click to enter dungeon (if requirements met)

#### 4A.4: Testing

**Test File:** `src/entities/__tests__/Dungeon.test.js`

**Test Cases:**
- Dungeon creation with default values
- Room addition and connections
- Room graph traversal
- Dungeon completion state
- JSON serialization/deserialization
- Room neighbor detection
- Boss room identification

**Test File:** `src/entities/__tests__/DungeonRoom.test.js`

**Test Cases:**
- Room creation with all types
- Door connections
- Monster spawn point management
- Room clearing logic
- Exploration state tracking

**Estimated Time:** 6-8 hours

---

## Phase 4B: Procedural Generator

### Objectives

Implement procedural generation algorithm for dungeon layouts.

### Implementation Steps

#### 4B.1: DungeonGenerator System

**File:** `src/systems/DungeonGenerator.js`

**Class Structure:**
```javascript
class DungeonGenerator {
  constructor() {
    this.algorithms = {
      'CAVE': this.generateCave,
      'CRYPT': this.generateCrypt,
      'RUINS': this.generateRuins
    };
  }

  // Main generation method
  generate(type, level, seed) {
    const algorithm = this.algorithms[type];
    return algorithm(level, seed);
  }

  // Generation algorithms
  generateCave(level, seed)
  generateCrypt(level, seed)
  generateRuins(level, seed)

  // Helper methods
  createRoomGrid(width, height)
  connectRooms(rooms)
  placeStartRoom(rooms)
  placeBossRoom(rooms)
  addTreasureRooms(rooms, count)
  validateLayout(dungeon)
  optimizeLayout(dungeon)
}
```

**Generation Algorithms:**

1. **Cave (Organic Layout)**
   - Uses cellular automata for natural caves
   - Irregular room shapes
   - Multiple branching paths
   - 15-25 rooms total

2. **Crypt (Linear Layout)**
   - Mostly linear progression
   - Side rooms for loot
   - Symmetrical design
   - 10-15 rooms total

3. **Ruins (Grid Layout)**
   - Rectangular grid pattern
   - Some rooms blocked/collapsed
   - Multiple paths to boss
   - 20-30 rooms total

#### 4B.2: Room Connection Algorithm

**Algorithm:** Modified Minimum Spanning Tree

```javascript
function connectRooms(rooms) {
  // 1. Create minimum spanning tree for guaranteed connectivity
  const mst = createMST(rooms);

  // 2. Add extra connections for loops (30% of edges)
  const extraConnections = Math.floor(rooms.length * 0.3);
  addRandomConnections(rooms, extraConnections);

  // 3. Ensure boss room only has 1 entrance
  ensureSingleBossEntrance(rooms);

  // 4. Add doors to all connections
  addDoorsToConnections(rooms);

  return rooms;
}
```

**Features:**
- Guaranteed path from start to boss
- Optional loops for exploration
- Dead-end rooms for treasure
- Difficulty increases toward boss

#### 4B.3: Monster Placement

**File:** `src/systems/DungeonEncounterSystem.js`

**Spawn Logic:**
```javascript
function populateDungeon(dungeon, dungeonLevel) {
  dungeon.rooms.forEach(room => {
    if (room.type === 'BOSS') {
      spawnBoss(room, dungeonLevel);
    } else if (room.type === 'TREASURE') {
      spawnTreasureGuard(room, dungeonLevel);
    } else if (room.type === 'CHAMBER') {
      spawnRoomEncounter(room, dungeonLevel);
    }
    // Corridors have no spawns
  });
}

function spawnRoomEncounter(room, level) {
  const roomSize = room.size.width * room.size.height;
  const monsterCount = Math.floor(roomSize / 10); // 1 per 10 tiles

  for (let i = 0; i < monsterCount; i++) {
    const monster = createDungeonMonster(level);
    const position = getRandomPositionInRoom(room);
    room.monsters.push({monster, position});
  }
}
```

**Monster Scaling:**
- Base monster level = dungeon level
- Rooms closer to boss have +1 level
- Boss room monsters are +2 levels
- Elite chance increases with depth

#### 4B.4: Testing

**Test File:** `src/systems/__tests__/DungeonGenerator.test.js`

**Test Cases:**
- Generate all dungeon types
- Verify room connectivity
- Ensure start and boss rooms exist
- Validate room counts
- Test seed reproducibility
- Check for orphaned rooms
- Validate boss room has single entrance

**Estimated Time:** 12-16 hours

---

## Phase 4C: Dungeon Encounters

### Objectives

Implement encounter system for dungeon-specific monster spawns and combat.

### Implementation Steps

#### 4C.1: DungeonEncounterSystem

**File:** `src/systems/DungeonEncounterSystem.js`

**Features:**
- Room-based spawning
- Progressive difficulty
- Special dungeon monsters
- Encounter rewards

#### 4C.2: Dungeon Monster Variants

**New Monster Types:**

1. **Cave Monsters**
   - Cave Spider (Level 3-5) - Poisonous attacks
   - Giant Bat (Level 2-4) - Flying, hard to hit
   - Cave Troll (Level 6-8) - Regenerates health

2. **Crypt Monsters**
   - Zombie (Level 3-5) - Slow but tanky
   - Wraith (Level 5-7) - Ethereal, ignores some armor
   - Lich (Level 8-10) - Casts spells

3. **Ruins Monsters**
   - Gargoyle (Level 4-6) - Stone skin (high armor)
   - Construct (Level 6-8) - Immune to poison
   - Ancient Guardian (Level 8-10) - Elite variant

**File:** `src/config/monsters/dungeon-monsters.json`

#### 4C.3: Room Clearing Mechanics

**Logic:**
```javascript
function updateRoomState(room, monsters) {
  const roomMonsters = monsters.filter(m =>
    isInRoom(m.position, room) && m.alive
  );

  if (roomMonsters.length === 0 && !room.cleared) {
    room.cleared = true;
    onRoomCleared(room);
  }
}

function onRoomCleared(room) {
  // Grant room completion bonus
  grantXP(room.clearXP);

  // Spawn treasure if treasure room
  if (room.type === 'TREASURE') {
    spawnTreasureChest(room);
  }

  // Track progress
  updateDungeonProgress();
}
```

#### 4C.4: Testing

**Test File:** `src/systems/__tests__/DungeonEncounterSystem.test.js`

**Test Cases:**
- Monster spawning in rooms
- Level scaling based on depth
- Room clearing detection
- Treasure room rewards
- Monster AI in dungeons

**Estimated Time:** 8-10 hours

---

## Phase 4D: Boss Mechanics

### Objectives

Implement boss fights with unique mechanics and abilities.

### Implementation Steps

#### 4D.1: DungeonBoss Entity

**File:** `src/entities/DungeonBoss.js`

**Extends:** Monster class

**Additional Properties:**
```javascript
class DungeonBoss extends Monster {
  constructor(type, position, options = {}) {
    super(type, position, options);

    this.bossType = options.bossType;
    this.phases = options.phases || [];
    this.currentPhase = 0;
    this.abilities = options.abilities || [];
    this.abilityCooldowns = {};
    this.enrageTimer = 0;
    this.enrageThreshold = 300000; // 5 minutes
    this.immunities = options.immunities || [];
  }

  // Boss-specific methods
  updatePhase()
  useAbility(abilityName)
  checkEnrage()
  takeDamage(amount) // Override for phase transitions
}
```

#### 4D.2: Boss Types

**1. Cave Boss: Brood Mother (Giant Spider)**
- **Phase 1 (100%-60% HP):** Basic attacks
- **Phase 2 (60%-30% HP):** Summons small spiders
- **Phase 3 (30%-0% HP):** Poison AOE attacks
- **Abilities:**
  - Web Trap: Slows player
  - Venom Spit: Ranged poison attack
  - Spawn Adds: Summons 3 spiderlings

**2. Crypt Boss: Necromancer**
- **Phase 1 (100%-50% HP):** Ranged attacks
- **Phase 2 (50%-0% HP):** Summons undead minions
- **Abilities:**
  - Shadow Bolt: High damage spell
  - Raise Dead: Summons zombies
  - Bone Shield: Temporary invulnerability
  - Life Drain: Heals while damaging player

**3. Ruins Boss: Stone Golem**
- **Phase 1 (100%-60% HP):** Slow melee attacks
- **Phase 2 (60%-30% HP):** Faster attacks, stomp AOE
- **Phase 3 (30%-0% HP):** Berserker mode
- **Abilities:**
  - Ground Slam: AOE damage + stun
  - Rock Throw: Ranged attack
  - Stone Armor: 50% damage reduction
  - Enrage: +50% attack speed when low HP

#### 4D.3: BossAI System

**File:** `src/systems/BossAI.js`

**Extends:** MonsterAI class

**Additional States:**
- ABILITY_CAST - Using special ability
- PHASE_TRANSITION - Changing phases
- SUMMONING - Spawning adds

**Ability System:**
```javascript
function updateBossAI(boss, gameState, deltaTime) {
  // Check phase transition
  const healthPercent = boss.health / boss.maxHealth;
  if (shouldTransitionPhase(boss, healthPercent)) {
    transitionPhase(boss);
  }

  // Check ability cooldowns
  if (canUseAbility(boss)) {
    const ability = selectAbility(boss, gameState);
    useAbility(boss, ability, gameState);
  }

  // Regular AI
  updateMonsterAI(boss, gameState, deltaTime);
}
```

#### 4D.4: Boss Loot Tables

**File:** `src/config/loot/boss-loot.json`

**Guaranteed Drops:**
- Boss-specific unique item (100% drop)
- 2-3 rare/epic items (guaranteed)
- Large gold amount (500-1000)
- Dungeon completion token

**Boss Unique Items:**
```json
{
  "brood_mother_fang": {
    "name": "Brood Mother's Fang",
    "type": "WEAPON",
    "rarity": "LEGENDARY",
    "stats": {
      "damage": 45,
      "critChance": 15,
      "attackSpeed": 1.2
    },
    "properties": [
      {"name": "Poison", "value": 10},
      {"name": "LifeSteal", "value": 5}
    ]
  }
}
```

#### 4D.5: Testing

**Test File:** `src/entities/__tests__/DungeonBoss.test.js`

**Test Cases:**
- Boss creation and stats
- Phase transitions at correct HP
- Ability cooldowns
- Damage taken in different phases
- Boss death and loot

**Estimated Time:** 10-12 hours

---

## Phase 4E: Dungeon UI & Integration

### Objectives

Create UI components and integrate dungeon system with game.

### Implementation Steps

#### 4E.1: Dungeon Store

**File:** `src/stores/useDungeonStore.js`

**State Structure:**
```javascript
{
  activeDungeon: null, // Current dungeon instance
  dungeonHistory: [], // Completed dungeons
  inDungeon: false,
  currentRoom: null,
  exploredRooms: [],
  miniMapRevealed: false,

  // Actions
  enterDungeon(dungeonType, level),
  exitDungeon(),
  moveToRoom(roomId),
  exploreRoom(roomId),
  completeDungeon(),
  abandonDungeon()
}
```

#### 4E.2: Dungeon Entrance UI

**File:** `src/components/dungeon/DungeonEntrance.jsx`

**Features:**
- Display dungeon info (type, level, requirements)
- Show player readiness (level check)
- Enter button with confirmation
- Cooldown timer if recently completed

#### 4E.3: Dungeon HUD

**File:** `src/components/dungeon/DungeonHUD.jsx`

**Components:**
- **Mini-map** - Shows explored rooms and current position
- **Progress Bar** - Rooms cleared / total rooms
- **Exit Button** - Leave dungeon (confirmation required)
- **Boss Warning** - Alert when entering boss room

#### 4E.4: Dungeon Renderer

**File:** `src/rendering/useDungeonRenderer.js`

**Rendering:**
- Render current room with walls/floors
- Render doors to connected rooms
- Highlight unexplored exits
- Show room type indicator
- Render monsters and loot in room

**Camera:**
- Center on current room
- Smooth transitions between rooms
- Zoom in closer than overworld

#### 4E.5: Dungeon Completion UI

**File:** `src/components/dungeon/DungeonComplete.jsx`

**Displays:**
- Completion time
- Monsters killed
- Deaths
- Loot acquired
- XP/Gold earned
- Return to overworld button

#### 4E.6: Integration with Game Loop

**GameViewport Changes:**
- Detect when in dungeon (render dungeon instead of overworld)
- Handle room transitions
- Track player position in room
- Monster spawning per room

**Quest Integration:**
- "Complete X dungeon" objectives
- "Defeat X boss" objectives
- Track dungeon completions

#### 4E.7: Testing

**Test Files:**
- `src/stores/__tests__/useDungeonStore.test.js`
- `src/components/__tests__/DungeonHUD.test.jsx`
- Manual UI testing for all dungeon flows

**Estimated Time:** 10-12 hours

---

## Testing Strategy

### Unit Tests

**Entities:**
- [ ] Dungeon entity (creation, completion, serialization)
- [ ] DungeonRoom entity (connections, clearing, exploration)
- [ ] DungeonBoss entity (phases, abilities, damage)

**Systems:**
- [ ] DungeonGenerator (all dungeon types, reproducibility)
- [ ] DungeonEncounterSystem (spawning, scaling)
- [ ] BossAI (phase transitions, abilities)

**Target Coverage:** 80%+ for all dungeon systems

### Integration Tests

**Test File:** `src/systems/__tests__/DungeonSystem.integration.test.js`

**Scenarios:**
1. **Full Dungeon Run**
   - Generate dungeon
   - Enter dungeon
   - Clear rooms
   - Fight boss
   - Exit dungeon
   - Verify rewards

2. **Boss Fight Mechanics**
   - Enter boss room
   - Trigger phase transitions
   - Test all boss abilities
   - Defeat boss
   - Collect loot

3. **Dungeon Abandonment**
   - Enter dungeon
   - Progress partially
   - Abandon dungeon
   - Verify state cleanup

4. **Quest Integration**
   - Accept dungeon quest
   - Complete dungeon
   - Verify quest progress
   - Claim rewards

### Manual Testing Checklist

**Dungeon Generation:**
- [ ] All 3 dungeon types generate correctly
- [ ] No orphaned rooms
- [ ] Boss room always reachable
- [ ] Layouts feel varied (run 10 times)

**Combat:**
- [ ] Monsters spawn in correct rooms
- [ ] Room clearing works properly
- [ ] Boss phases transition correctly
- [ ] Boss abilities work as intended

**UI/UX:**
- [ ] Entrance UI displays correct info
- [ ] Mini-map updates as rooms explored
- [ ] Exit button works from any room
- [ ] Completion screen shows correct stats

**Performance:**
- [ ] Dungeon generation < 1 second
- [ ] Room transitions smooth (< 100ms)
- [ ] No lag with many monsters in room
- [ ] Memory cleanup on dungeon exit

**Edge Cases:**
- [ ] Player dies in dungeon (respawn outside)
- [ ] Save/load with active dungeon
- [ ] Disconnect during dungeon
- [ ] Re-enter same dungeon entrance

---

## Implementation Timeline

### Phase 4A: Dungeon Entity & Room System
**Duration:** 2 days
**Tasks:**
1. Create Dungeon entity class (4 hours)
2. Create DungeonRoom entity class (3 hours)
3. Create DungeonEntrance structure (2 hours)
4. Write unit tests (3 hours)
5. Documentation (1 hour)

### Phase 4B: Procedural Generator
**Duration:** 3-4 days
**Tasks:**
1. DungeonGenerator system (6 hours)
2. Cave generation algorithm (3 hours)
3. Crypt generation algorithm (3 hours)
4. Ruins generation algorithm (3 hours)
5. Room connection algorithm (4 hours)
6. Monster placement (3 hours)
7. Testing (4 hours)
8. Documentation (2 hours)

### Phase 4C: Dungeon Encounters
**Duration:** 2 days
**Tasks:**
1. DungeonEncounterSystem (4 hours)
2. Dungeon monster variants (4 hours)
3. Room clearing mechanics (3 hours)
4. Testing (3 hours)
5. Documentation (1 hour)

### Phase 4D: Boss Mechanics
**Duration:** 3 days
**Tasks:**
1. DungeonBoss entity (4 hours)
2. Boss type implementations (6 hours)
3. BossAI system (6 hours)
4. Boss loot tables (2 hours)
5. Testing (4 hours)
6. Documentation (2 hours)

### Phase 4E: Dungeon UI & Integration
**Duration:** 3 days
**Tasks:**
1. Dungeon store (3 hours)
2. Entrance UI (3 hours)
3. Dungeon HUD (4 hours)
4. Dungeon renderer (6 hours)
5. Completion UI (2 hours)
6. Game loop integration (4 hours)
7. Testing (4 hours)
8. Documentation (2 hours)

### Testing & Polish
**Duration:** 2 days
**Tasks:**
1. Integration testing (6 hours)
2. Manual testing (4 hours)
3. Bug fixes (4 hours)
4. Performance optimization (2 hours)

**Total Estimated Time:** 15-17 days (120-136 hours)

---

## Technical Considerations

### Performance

**Generation Performance:**
- Dungeon generation must complete < 1 second
- Use Web Worker for generation if needed
- Cache generated layouts for seed

**Runtime Performance:**
- Only render current room + adjacent rooms
- Monster AI only updates for current room
- Unload completed dungeon data on exit

**Memory Management:**
- Clear dungeon instance on exit
- Clean up monster references
- Remove event listeners

### Data Structures

**Room Graph:**
```javascript
// Adjacency list for O(1) neighbor lookup
dungeonLayout = {
  'room_1': ['room_2', 'room_3'],
  'room_2': ['room_1', 'room_4'],
  // ...
}

// Spatial hash for O(1) position lookup
roomPositions = {
  '0,0': 'room_1',
  '1,0': 'room_2',
  '0,1': 'room_3',
  // ...
}
```

**Monster Spawning:**
- Pre-spawn all monsters on dungeon entry
- Monsters inactive until room entered
- Despawn when room cleared

### Save/Load Considerations

**What to Save:**
- Active dungeon ID
- Current room ID
- Explored rooms
- Cleared rooms
- Boss defeated status
- Dungeon seed (for regeneration)
- Time spent
- Monsters killed

**What NOT to Save:**
- Live monster instances (regenerate on load)
- Full room layouts (regenerate from seed)
- Temporary ability cooldowns

### Scalability

**Future Expansion:**
- Multiple dungeon floors (階層)
- Dynamic difficulty adjustment
- Weekly/seasonal dungeons
- Dungeon leaderboards
- Co-op dungeons (multiplayer)

---

## Risk Assessment

### High Risk

**1. Procedural Generation Complexity**
- **Risk:** Generation algorithms are complex and bug-prone
- **Mitigation:**
  - Start with simple algorithms
  - Extensive testing with multiple seeds
  - Visual debugging tools
  - Reference existing algorithms (BSP, Cellular Automata)

**2. Boss Fight Balance**
- **Risk:** Bosses too hard or too easy
- **Mitigation:**
  - Playtesting with different builds
  - Adjustable difficulty modifiers
  - Telemetry for boss fights
  - Iterative balance patches

**3. Performance Issues**
- **Risk:** Too many monsters/objects causes lag
- **Mitigation:**
  - Object pooling for monsters
  - Room-based culling
  - Performance profiling
  - Mobile optimization

### Medium Risk

**4. UI/UX Complexity**
- **Risk:** Dungeon UI clutters screen
- **Mitigation:**
  - Minimalist design
  - Toggle-able UI elements
  - User testing
  - Mobile-friendly controls

**5. Integration Bugs**
- **Risk:** Dungeons break existing systems
- **Mitigation:**
  - Isolated dungeon state
  - Comprehensive integration tests
  - Feature flags for gradual rollout

### Low Risk

**6. Save/Load Issues**
- **Risk:** Dungeon state doesn't persist correctly
- **Mitigation:**
  - Seed-based regeneration
  - Extensive save/load tests
  - Backward compatibility checks

---

## Success Metrics

**Completion Criteria:**
- [ ] All 3 dungeon types generate without errors
- [ ] Boss fights are challenging but fair
- [ ] Dungeon loot is valuable and exciting
- [ ] UI is clear and intuitive
- [ ] Performance maintains 60 FPS
- [ ] 80%+ test coverage
- [ ] Zero critical bugs
- [ ] Positive user feedback

**Post-Launch Metrics:**
- Average dungeon completion time
- Boss fight success rate
- Most popular dungeon type
- Loot satisfaction rating
- Bug reports per 100 runs

---

## Open Questions

1. **Should dungeons scale with player level or be fixed difficulty?**
   - Pro Fixed: Easier to balance, clear progression
   - Pro Scaled: Always relevant content
   - **Recommendation:** Fixed with level requirements

2. **How many times can player attempt same dungeon?**
   - Option A: Unlimited
   - Option B: Once per day
   - Option C: Cooldown timer (1 hour)
   - **Recommendation:** Option C - Cooldown timer

3. **Should dungeons consume resources (keys, tokens)?**
   - Pro Yes: Adds economy, makes dungeons special
   - Pro No: More accessible, better for testing
   - **Recommendation:** No for MVP, add later

4. **Death penalty in dungeons?**
   - Option A: Lose all progress, respawn outside
   - Option B: Respawn at entrance, continue
   - Option C: Respawn in room, small penalty
   - **Recommendation:** Option A - High stakes

5. **Dungeon persistence?**
   - Should dungeons save state between sessions?
   - **Recommendation:** Yes - Save active dungeon state

---

## References

**Procedural Generation:**
- [Procedural Content Generation Wiki](http://pcg.wikidot.com/)
- [Brogue (Roguelike)](https://sites.google.com/site/broguegame/) - Cave generation
- [Spelunky](https://spelunkyworld.com/original.html) - Level generation

**Boss Design:**
- [Hollow Knight](https://www.hollowknight.com/) - Boss phases
- [Dark Souls](https://www.darksouls.jp/) - Boss telegraphing
- [Monster Hunter](https://www.monsterhunter.com/) - Boss patterns

**Dungeon Layout:**
- [TinyKeep Generation](https://www.gamasutra.com/blogs/AAdonaac/20150903/252889/Procedural_Dungeon_Generation_Algorithm.php)
- [Binding of Isaac](https://bindingofisaac.com/) - Room-based dungeons

---

## Version History

- **v1.0** (2025-11-24) - Initial draft by Claude
- Planning for Phase 4 implementation
- Comprehensive system design and timeline

---

**Next Steps:**
1. Review this plan with team/maintainers
2. Prioritize MVP features vs. nice-to-haves
3. Set up development environment for Phase 4
4. Begin implementation with Phase 4A

**Document Status:** Awaiting review and approval before implementation begins.
