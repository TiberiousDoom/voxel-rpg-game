# Phase 4: Dungeon System Implementation Plan

**Last Updated:** November 24, 2025
**Author:** Claude (AI Assistant)
**Status:** REVISED - Ready for Implementation
**Purpose:** Detailed implementation plan for procedural dungeon system

**Related Documents:**
- [Gameplay Features Implementation Plan](GAMEPLAY_FEATURES_IMPLEMENTATION_PLAN.md)
- [Current Status](../../CURRENT_STATUS.md)

---

## Revision Notes (Nov 24, 2025)

**Key Changes from Original Draft:**
1. **Leverages existing systems** - DungeonCombatEngine, ExpeditionManager, Monster.js already exist
2. **Reduced scope for MVP** - Start with 1 dungeon type, extend later
3. **Realistic time estimates** - Adjusted based on existing infrastructure
4. **2D Canvas rendering** - Plan now properly targets 2D rendering (not 3D voxel)
5. **Clearer integration points** - Explicit mapping to existing codebase

---

## Table of Contents

1. [Existing Systems Audit](#existing-systems-audit)
2. [Overview](#overview)
3. [Phase 4A: Room-Based Layout System](#phase-4a-room-based-layout-system)
4. [Phase 4B: Procedural Generator Enhancement](#phase-4b-procedural-generator-enhancement)
5. [Phase 4C: Boss Mechanics](#phase-4c-boss-mechanics)
6. [Phase 4D: Dungeon UI & Rendering](#phase-4d-dungeon-ui--rendering)
7. [Phase 4E: Integration & Polish](#phase-4e-integration--polish)
8. [Testing Strategy](#testing-strategy)
9. [Implementation Timeline](#implementation-timeline)
10. [Risk Assessment](#risk-assessment)

---

## Existing Systems Audit

### ✅ Already Implemented (Leverage These)

| System | File | Capabilities |
|--------|------|--------------|
| **DungeonCombatEngine** | `src/modules/expedition/DungeonCombatEngine.js` | Floor generation, enemy scaling, combat simulation |
| **ExpeditionManager** | `src/modules/expedition/ExpeditionManager.js` | Expedition lifecycle, party management, state tracking |
| **Monster Entity** | `src/entities/Monster.js` | Full monster with health, AI states, level scaling, modifiers, loot tables |
| **MonsterAI** | `src/systems/MonsterAI.js` | AI states: IDLE, PATROL, CHASE, ATTACK, FLEE, DEATH |
| **LootTable** | `src/systems/LootTable.js` | Loot table definitions |
| **LootGenerator** | `src/systems/LootGenerator.js` | Item generation from tables |
| **LootDropManager** | `src/systems/LootDropManager.js` | Drop spawning and pickup |
| **QuestManager** | `src/systems/QuestManager.js` | Quest tracking and rewards |
| **Quest Entity** | `src/entities/Quest.js` | Quest structure |
| **SpawnManager** | `src/systems/SpawnManager.js` | Entity spawning |
| **SpatialGrid** | `src/systems/SpatialGrid.js` | Spatial partitioning |
| **MonsterRenderer** | `src/rendering/MonsterRenderer.js` | 2D monster rendering |

### 🔨 Needs Implementation (Phase 4 Focus)

| Component | Purpose |
|-----------|---------|
| **DungeonRoom** | Room entity with connections, doors, props |
| **RoomLayoutGenerator** | Procedural room-based layouts (not just floors) |
| **BossMonster** | Extended Monster with phases, abilities |
| **DungeonRenderer** | 2D canvas room rendering |
| **DungeonStore** | Zustand store for dungeon state |
| **DungeonHUD** | Mini-map, progress, boss health bar |

---

## Overview

### Goals

Phase 4 enhances the existing expedition system with **visual room-based dungeons** and **boss fights with unique mechanics**.

**Core Features (MVP):**
- Visual room-based dungeon layouts (not just floor numbers)
- Room exploration with doors and connections
- Boss fights with phase transitions
- Mini-map showing explored rooms
- Special boss loot drops

**Deferred to Phase 4.5:**
- Multiple dungeon types (start with Cave only)
- Additional bosses (start with 1)
- Dungeon keys/tokens economy
- Leaderboards

### Success Criteria (MVP)

- [ ] Cave dungeon generates 10-15 connected rooms
- [ ] Rooms render on 2D canvas with doors
- [ ] Player can navigate between rooms
- [ ] Boss room has phase-based fight
- [ ] Mini-map shows explored rooms
- [ ] Boss drops unique loot
- [ ] 60 FPS maintained during dungeon

---

## Phase 4A: Room-Based Layout System

### Objectives

Create room entities and layout data structures that extend the existing floor-based system.

### 4A.1: DungeonRoom Entity

**File:** `src/entities/DungeonRoom.js`

**Extends:** None (new entity)

```javascript
class DungeonRoom {
  constructor(config) {
    this.id = config.id || uuid();
    this.type = config.type; // 'ENTRANCE', 'CORRIDOR', 'CHAMBER', 'BOSS', 'TREASURE'
    this.gridPosition = config.gridPosition; // {x, y} in dungeon grid
    this.worldBounds = config.worldBounds; // {x, y, width, height} in world coords
    this.connections = new Map(); // direction -> roomId
    this.doors = []; // {direction: 'NORTH'|'SOUTH'|'EAST'|'WEST', targetRoomId, position}
    this.enemies = []; // Enemy instances (from Monster.js)
    this.lootPoints = []; // {position, lootTableId}
    this.props = []; // Environmental decorations
    this.explored = false;
    this.cleared = false;
  }

  // Methods
  addConnection(direction, roomId)
  getConnection(direction)
  hasConnection(direction)
  spawnEnemies(dungeonLevel, monsterTypes)
  clearRoom()
  toJSON()
  static fromJSON(data)
}
```

**Room Types:**
| Type | Size (tiles) | Purpose |
|------|--------------|---------|
| ENTRANCE | 8x8 | Starting room, safe zone |
| CORRIDOR | 6x4 | Connecting passage |
| CHAMBER | 10x10 | Combat encounter |
| BOSS | 14x14 | Final boss arena |
| TREASURE | 8x8 | Loot room (optional) |

### 4A.2: DungeonLayout Class

**File:** `src/entities/DungeonLayout.js`

```javascript
class DungeonLayout {
  constructor(seed) {
    this.seed = seed;
    this.rooms = new Map(); // roomId -> DungeonRoom
    this.roomGrid = new Map(); // "x,y" -> roomId
    this.entranceRoom = null;
    this.bossRoom = null;
  }

  // Methods
  addRoom(room)
  getRoom(roomId)
  getRoomAt(gridX, gridY)
  getRoomNeighbors(roomId)
  getPathToBoss() // Returns array of roomIds
  toJSON()
  static fromJSON(data)
}
```

### 4A.3: Integration with Existing Systems

**Enhance DungeonCombatEngine:**
```javascript
// Add to DungeonCombatEngine.js
generateRoomLayout(dungeonType, level, seed) {
  const generator = new RoomLayoutGenerator(seed);
  return generator.generate(dungeonType, level);
}
```

**Estimated Time:** 4-6 hours

---

## Phase 4B: Procedural Generator Enhancement

### Objectives

Create room-based procedural generation that produces connected layouts.

### 4B.1: RoomLayoutGenerator

**File:** `src/systems/RoomLayoutGenerator.js`

**Algorithm: Binary Space Partition + Room Placement**

```javascript
class RoomLayoutGenerator {
  constructor(seed) {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
  }

  generate(type, level) {
    // 1. Determine room count based on level
    const roomCount = 8 + Math.floor(level / 2); // 8-15 rooms

    // 2. Generate room positions using BSP
    const positions = this._generatePositions(roomCount);

    // 3. Create rooms with types
    const rooms = this._createRooms(positions, level);

    // 4. Connect rooms using MST
    this._connectRooms(rooms);

    // 5. Place entrance and boss rooms
    this._placeSpecialRooms(rooms);

    // 6. Populate with enemies
    this._populateRooms(rooms, type, level);

    return new DungeonLayout(this.seed, rooms);
  }

  _generatePositions(count) {
    // Grid-based placement with some randomness
    const positions = [];
    const gridSize = Math.ceil(Math.sqrt(count * 2));
    // ... BSP algorithm
    return positions;
  }

  _connectRooms(rooms) {
    // Minimum Spanning Tree for guaranteed connectivity
    // Add 20% extra connections for loops
  }

  _populateRooms(rooms, type, level) {
    const monsterTypes = DUNGEON_MONSTER_TYPES[type]; // e.g., ['SPIDER', 'BAT', 'TROLL']

    rooms.forEach(room => {
      if (room.type === 'CHAMBER') {
        room.spawnEnemies(level, monsterTypes);
      } else if (room.type === 'BOSS') {
        room.spawnBoss(level, type);
      }
    });
  }
}
```

### 4B.2: Dungeon Monster Config

**File:** `src/config/monsters/dungeon-monsters.json`

```json
{
  "CAVE_SPIDER": {
    "name": "Cave Spider",
    "health": 40,
    "maxHealth": 40,
    "damage": 8,
    "defense": 2,
    "moveSpeed": 3.5,
    "attackSpeed": 1.2,
    "attackRange": 1.5,
    "aggroRange": 6,
    "xpReward": 25,
    "goldReward": [5, 15],
    "lootTable": "cave_spider_loot",
    "abilities": ["POISON_BITE"],
    "color": "#4a0080"
  },
  "CAVE_BAT": { ... },
  "CAVE_TROLL": { ... }
}
```

### 4B.3: Seed-Based Reproducibility

```javascript
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    // Mulberry32 algorithm
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
```

**Estimated Time:** 8-10 hours

---

## Phase 4C: Boss Mechanics

### Objectives

Create boss monsters with phase transitions and unique abilities.

### 4C.1: BossMonster Entity

**File:** `src/entities/BossMonster.js`

**Extends:** Monster class

```javascript
import { Monster } from './Monster';

class BossMonster extends Monster {
  constructor(type, position, options = {}) {
    super(type, position, options);

    // Boss-specific properties
    this.isBoss = true;
    this.phases = options.phases || [];
    this.currentPhase = 0;
    this.abilities = options.abilities || [];
    this.abilityCooldowns = new Map();
    this.phaseTransitions = options.phaseTransitions || [0.6, 0.3]; // HP %
    this.enraged = false;
  }

  takeDamage(amount) {
    super.takeDamage(amount);
    this._checkPhaseTransition();
  }

  _checkPhaseTransition() {
    const hpPercent = this.health / this.maxHealth;
    const nextPhase = this.currentPhase + 1;

    if (nextPhase < this.phases.length &&
        hpPercent <= this.phaseTransitions[this.currentPhase]) {
      this._transitionToPhase(nextPhase);
    }
  }

  _transitionToPhase(phase) {
    this.currentPhase = phase;
    const phaseData = this.phases[phase];

    // Apply phase modifiers
    if (phaseData.damageMultiplier) {
      this.damage *= phaseData.damageMultiplier;
    }
    if (phaseData.speedMultiplier) {
      this.moveSpeed *= phaseData.speedMultiplier;
    }

    // Trigger phase ability
    if (phaseData.onEnterAbility) {
      this.useAbility(phaseData.onEnterAbility);
    }

    this.emit('phase:transition', { phase, bossId: this.id });
  }

  useAbility(abilityName) {
    const ability = this.abilities.find(a => a.name === abilityName);
    if (!ability) return false;

    const cooldown = this.abilityCooldowns.get(abilityName) || 0;
    if (Date.now() < cooldown) return false;

    // Execute ability
    ability.execute(this);
    this.abilityCooldowns.set(abilityName, Date.now() + ability.cooldown);

    this.emit('ability:used', { ability: abilityName, bossId: this.id });
    return true;
  }
}
```

### 4C.2: MVP Boss - Brood Mother (Cave)

**File:** `src/config/bosses/brood-mother.json`

```json
{
  "type": "BROOD_MOTHER",
  "name": "Brood Mother",
  "baseStats": {
    "health": 500,
    "maxHealth": 500,
    "damage": 25,
    "defense": 10,
    "moveSpeed": 2,
    "attackSpeed": 0.8,
    "attackRange": 2,
    "aggroRange": 15
  },
  "phases": [
    {
      "name": "Normal",
      "abilities": ["VENOM_SPIT", "WEB_TRAP"]
    },
    {
      "name": "Swarm",
      "hpThreshold": 0.6,
      "damageMultiplier": 1.2,
      "onEnterAbility": "SPAWN_SPIDERLINGS",
      "abilities": ["VENOM_SPIT", "WEB_TRAP", "SPAWN_SPIDERLINGS"]
    },
    {
      "name": "Frenzy",
      "hpThreshold": 0.3,
      "damageMultiplier": 1.5,
      "speedMultiplier": 1.3,
      "abilities": ["POISON_NOVA", "SPAWN_SPIDERLINGS"]
    }
  ],
  "abilities": {
    "VENOM_SPIT": {
      "damage": 15,
      "range": 8,
      "cooldown": 3000,
      "effect": "POISON",
      "poisonDamage": 5,
      "poisonDuration": 5000
    },
    "WEB_TRAP": {
      "range": 6,
      "cooldown": 8000,
      "effect": "SLOW",
      "slowAmount": 0.5,
      "duration": 3000
    },
    "SPAWN_SPIDERLINGS": {
      "cooldown": 15000,
      "spawnCount": 3,
      "spawnType": "CAVE_SPIDER"
    },
    "POISON_NOVA": {
      "damage": 30,
      "radius": 5,
      "cooldown": 20000,
      "effect": "POISON"
    }
  },
  "loot": {
    "guaranteed": ["BROOD_MOTHER_FANG"],
    "table": "boss_cave_loot",
    "goldReward": [200, 500]
  }
}
```

### 4C.3: BossAI Extension

**File:** `src/systems/BossAI.js`

```javascript
import { MonsterAI } from './MonsterAI';

class BossAI extends MonsterAI {
  constructor(boss, gameState) {
    super(boss, gameState);
    this.boss = boss;
    this.abilityTimer = 0;
  }

  update(deltaTime) {
    // Check for ability usage
    this.abilityTimer += deltaTime;

    if (this.abilityTimer >= 2000) { // Check every 2 seconds
      this._tryUseAbility();
      this.abilityTimer = 0;
    }

    // Standard AI behavior
    super.update(deltaTime);
  }

  _tryUseAbility() {
    const phase = this.boss.phases[this.boss.currentPhase];
    if (!phase || !phase.abilities) return;

    // Prioritize abilities based on situation
    for (const abilityName of phase.abilities) {
      if (this.boss.useAbility(abilityName)) {
        break; // Only use one ability per check
      }
    }
  }
}
```

**Estimated Time:** 8-10 hours

---

## Phase 4D: Dungeon UI & Rendering

### Objectives

Create 2D canvas rendering for dungeon rooms and UI components.

### 4D.1: DungeonRenderer

**File:** `src/rendering/DungeonRenderer.js`

```javascript
class DungeonRenderer {
  constructor(ctx, options = {}) {
    this.ctx = ctx;
    this.tileSize = options.tileSize || 32;
    this.currentRoom = null;
    this.transitionProgress = 0;
  }

  render(dungeon, currentRoomId, camera) {
    const room = dungeon.getRoom(currentRoomId);
    if (!room) return;

    // Clear and set camera
    this.ctx.save();
    this.ctx.translate(-camera.x, -camera.y);

    // Render room
    this._renderFloor(room);
    this._renderWalls(room);
    this._renderDoors(room);
    this._renderProps(room);

    this.ctx.restore();
  }

  _renderFloor(room) {
    const { x, y, width, height } = room.worldBounds;

    // Tiled floor pattern
    this.ctx.fillStyle = '#2a2a3d';
    this.ctx.fillRect(x, y, width, height);

    // Grid lines
    this.ctx.strokeStyle = '#3a3a4d';
    this.ctx.lineWidth = 1;
    for (let tx = 0; tx < width; tx += this.tileSize) {
      for (let ty = 0; ty < height; ty += this.tileSize) {
        this.ctx.strokeRect(x + tx, y + ty, this.tileSize, this.tileSize);
      }
    }
  }

  _renderWalls(room) {
    const { x, y, width, height } = room.worldBounds;

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = '#4a4a6a';

    // Draw walls where there are no doors
    ['NORTH', 'SOUTH', 'EAST', 'WEST'].forEach(dir => {
      if (!room.hasConnection(dir)) {
        this._drawWall(room, dir);
      }
    });
  }

  _renderDoors(room) {
    room.doors.forEach(door => {
      this._drawDoor(room, door);
    });
  }

  _drawDoor(room, door) {
    const { x, y, width, height } = room.worldBounds;
    const doorWidth = this.tileSize * 2;

    this.ctx.fillStyle = door.isOpen ? '#4a6a4a' : '#6a4a4a';

    // Position based on direction
    let dx, dy, dw, dh;
    switch (door.direction) {
      case 'NORTH':
        dx = x + (width - doorWidth) / 2;
        dy = y - 4;
        dw = doorWidth;
        dh = 8;
        break;
      // ... other directions
    }

    this.ctx.fillRect(dx, dy, dw, dh);
  }
}
```

### 4D.2: DungeonStore (Zustand)

**File:** `src/stores/useDungeonStore.js`

```javascript
import { create } from 'zustand';

const useDungeonStore = create((set, get) => ({
  // State
  activeDungeon: null,
  currentRoomId: null,
  exploredRooms: new Set(),
  inDungeon: false,
  bossDefeated: false,

  // Actions
  enterDungeon: (dungeonLayout) => {
    set({
      activeDungeon: dungeonLayout,
      currentRoomId: dungeonLayout.entranceRoom.id,
      exploredRooms: new Set([dungeonLayout.entranceRoom.id]),
      inDungeon: true,
      bossDefeated: false
    });
  },

  moveToRoom: (roomId) => {
    const { activeDungeon, currentRoomId, exploredRooms } = get();
    const currentRoom = activeDungeon.getRoom(currentRoomId);

    // Validate connection exists
    if (!currentRoom.connections.has(roomId)) {
      return false;
    }

    // Mark as explored
    exploredRooms.add(roomId);

    set({
      currentRoomId: roomId,
      exploredRooms: new Set(exploredRooms)
    });

    return true;
  },

  exitDungeon: () => {
    set({
      activeDungeon: null,
      currentRoomId: null,
      exploredRooms: new Set(),
      inDungeon: false
    });
  },

  setBossDefeated: () => {
    set({ bossDefeated: true });
  }
}));

export default useDungeonStore;
```

### 4D.3: DungeonHUD Component

**File:** `src/components/dungeon/DungeonHUD.jsx`

```jsx
import React, { memo } from 'react';
import useDungeonStore from '../../stores/useDungeonStore';
import DungeonMiniMap from './DungeonMiniMap';
import BossHealthBar from './BossHealthBar';
import './DungeonHUD.css';

const DungeonHUD = memo(function DungeonHUD({ boss }) {
  const { activeDungeon, currentRoomId, exploredRooms, bossDefeated } = useDungeonStore();

  if (!activeDungeon) return null;

  const currentRoom = activeDungeon.getRoom(currentRoomId);
  const progress = exploredRooms.size / activeDungeon.rooms.size;

  return (
    <div className="dungeon-hud">
      {/* Mini-map */}
      <DungeonMiniMap
        dungeon={activeDungeon}
        currentRoomId={currentRoomId}
        exploredRooms={exploredRooms}
      />

      {/* Progress */}
      <div className="dungeon-progress">
        <div className="progress-label">Explored</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="progress-text">
          {exploredRooms.size} / {activeDungeon.rooms.size}
        </div>
      </div>

      {/* Current room info */}
      <div className="room-info">
        <span className="room-type">{currentRoom.type}</span>
        {currentRoom.cleared && <span className="cleared-badge">✓ Cleared</span>}
      </div>

      {/* Boss health bar (when in boss room) */}
      {currentRoom.type === 'BOSS' && boss && !bossDefeated && (
        <BossHealthBar boss={boss} />
      )}

      {/* Exit button */}
      <button className="exit-dungeon-btn" onClick={() => {/* confirm exit */}}>
        Exit Dungeon
      </button>
    </div>
  );
});

export default DungeonHUD;
```

### 4D.4: DungeonMiniMap Component

**File:** `src/components/dungeon/DungeonMiniMap.jsx`

```jsx
import React, { memo, useMemo } from 'react';
import './DungeonMiniMap.css';

const ROOM_SIZE = 12;
const ROOM_GAP = 4;

const DungeonMiniMap = memo(function DungeonMiniMap({
  dungeon,
  currentRoomId,
  exploredRooms
}) {
  const roomPositions = useMemo(() => {
    const positions = [];
    dungeon.rooms.forEach((room, id) => {
      positions.push({
        id,
        x: room.gridPosition.x * (ROOM_SIZE + ROOM_GAP),
        y: room.gridPosition.y * (ROOM_SIZE + ROOM_GAP),
        type: room.type,
        explored: exploredRooms.has(id),
        current: id === currentRoomId
      });
    });
    return positions;
  }, [dungeon, currentRoomId, exploredRooms]);

  return (
    <div className="dungeon-minimap">
      <svg viewBox="-20 -20 200 200">
        {roomPositions.map(room => (
          <rect
            key={room.id}
            x={room.x}
            y={room.y}
            width={ROOM_SIZE}
            height={ROOM_SIZE}
            className={`
              minimap-room
              ${room.explored ? 'explored' : 'hidden'}
              ${room.current ? 'current' : ''}
              ${room.type.toLowerCase()}
            `}
          />
        ))}
      </svg>
    </div>
  );
});

export default DungeonMiniMap;
```

**Estimated Time:** 10-12 hours

---

## Phase 4E: Integration & Polish

### Objectives

Integrate dungeon system with existing game loop and polish UX.

### 4E.1: GameViewport Integration

**Modify:** `src/components/GameViewport.jsx`

```javascript
// Add dungeon rendering mode
const { inDungeon, activeDungeon, currentRoomId } = useDungeonStore();

// In render loop:
if (inDungeon && activeDungeon) {
  dungeonRenderer.render(activeDungeon, currentRoomId, camera);
  monsterRenderer.renderDungeonMonsters(activeDungeon.getRoom(currentRoomId).enemies);
} else {
  // Normal overworld rendering
  renderOverworld();
}
```

### 4E.2: Dungeon Entrance Structure

**Add to building config:**

```json
{
  "DUNGEON_ENTRANCE_CAVE": {
    "name": "Cave Entrance",
    "icon": "🕳️",
    "description": "A dark cave entrance. Dangerous creatures lurk within.",
    "category": "SPECIAL",
    "tier": "PERMANENT",
    "cost": {},
    "isInteractable": true,
    "interactionType": "ENTER_DUNGEON",
    "dungeonConfig": {
      "type": "CAVE",
      "minLevel": 3,
      "maxLevel": 10
    }
  }
}
```

### 4E.3: Quest Integration

**Add dungeon quest objectives:**

```javascript
// In QuestManager
registerDungeonObjectives() {
  this.registerObjectiveType('COMPLETE_DUNGEON', {
    check: (quest, gameState) => {
      return gameState.dungeonCompletions.some(
        d => d.type === quest.objective.dungeonType
      );
    }
  });

  this.registerObjectiveType('DEFEAT_BOSS', {
    check: (quest, gameState) => {
      return gameState.bossKills.includes(quest.objective.bossType);
    }
  });
}
```

### 4E.4: Save/Load Support

**Add to GameStateSerializer:**

```javascript
serializeDungeonState(dungeonStore) {
  const state = dungeonStore.getState();
  if (!state.inDungeon) return null;

  return {
    seed: state.activeDungeon.seed,
    type: state.activeDungeon.type,
    level: state.activeDungeon.level,
    currentRoomId: state.currentRoomId,
    exploredRooms: Array.from(state.exploredRooms),
    clearedRooms: Array.from(state.activeDungeon.rooms.values())
      .filter(r => r.cleared)
      .map(r => r.id),
    bossDefeated: state.bossDefeated
  };
}

deserializeDungeonState(data) {
  if (!data) return;

  // Regenerate dungeon from seed
  const generator = new RoomLayoutGenerator(data.seed);
  const dungeon = generator.generate(data.type, data.level);

  // Restore state
  data.exploredRooms.forEach(id => dungeon.getRoom(id).explored = true);
  data.clearedRooms.forEach(id => dungeon.getRoom(id).cleared = true);

  useDungeonStore.setState({
    activeDungeon: dungeon,
    currentRoomId: data.currentRoomId,
    exploredRooms: new Set(data.exploredRooms),
    inDungeon: true,
    bossDefeated: data.bossDefeated
  });
}
```

**Estimated Time:** 6-8 hours

---

## Testing Strategy

### Unit Tests

| Component | Test File | Coverage Target |
|-----------|-----------|-----------------|
| DungeonRoom | `src/entities/__tests__/DungeonRoom.test.js` | 90% |
| DungeonLayout | `src/entities/__tests__/DungeonLayout.test.js` | 90% |
| BossMonster | `src/entities/__tests__/BossMonster.test.js` | 85% |
| RoomLayoutGenerator | `src/systems/__tests__/RoomLayoutGenerator.test.js` | 85% |
| BossAI | `src/systems/__tests__/BossAI.test.js` | 80% |

### Integration Tests

**File:** `src/__tests__/integration/dungeon-system.test.js`

```javascript
describe('Dungeon System Integration', () => {
  it('should generate dungeon and navigate rooms', () => {
    // Generate dungeon
    // Enter dungeon
    // Move through rooms
    // Clear enemies
    // Reach boss room
    // Defeat boss
    // Exit with loot
  });

  it('should save and load dungeon state', () => {
    // Start dungeon
    // Explore some rooms
    // Save state
    // Load state
    // Verify progress preserved
  });
});
```

### Manual Testing Checklist

- [ ] Cave dungeon generates without errors
- [ ] All rooms are reachable from entrance
- [ ] Boss room is always last room
- [ ] Mini-map updates correctly
- [ ] Room transitions are smooth
- [ ] Boss phase transitions work
- [ ] Boss abilities trigger correctly
- [ ] Loot drops on boss death
- [ ] Exit returns to overworld
- [ ] Save/load preserves dungeon state

---

## Implementation Timeline

### Phase 4A: Room-Based Layout System
**Duration:** 1 day (6 hours)
- DungeonRoom entity (2h)
- DungeonLayout class (2h)
- Unit tests (2h)

### Phase 4B: Procedural Generator
**Duration:** 1.5 days (10 hours)
- RoomLayoutGenerator (4h)
- Room connection algorithm (3h)
- Monster population (2h)
- Tests (1h)

### Phase 4C: Boss Mechanics
**Duration:** 1.5 days (10 hours)
- BossMonster entity (3h)
- Brood Mother config (2h)
- BossAI system (3h)
- Tests (2h)

### Phase 4D: UI & Rendering
**Duration:** 2 days (12 hours)
- DungeonRenderer (4h)
- DungeonStore (2h)
- DungeonHUD + MiniMap (4h)
- CSS styling (2h)

### Phase 4E: Integration & Polish
**Duration:** 1 day (8 hours)
- GameViewport integration (3h)
- Quest integration (2h)
- Save/load support (2h)
- Bug fixes (1h)

**Total Estimated Time:** 7-8 days (~46 hours)

---

## Risk Assessment

### High Risk

**1. Room Layout Generation Bugs**
- **Mitigation:** Start with simple grid-based generation, add complexity later
- **Mitigation:** Visual debugging tool to inspect generated layouts

**2. Boss Fight Balance**
- **Mitigation:** Start with easy boss, tune based on testing
- **Mitigation:** Add difficulty slider for testing

### Medium Risk

**3. Performance with Many Rooms**
- **Mitigation:** Only render current room + adjacent
- **Mitigation:** Pool monster instances

**4. State Management Complexity**
- **Mitigation:** Clear separation between dungeon and overworld state
- **Mitigation:** Comprehensive state reset on dungeon exit

### Low Risk

**5. UI Clutter**
- **Mitigation:** Minimalist design, toggle-able elements

---

## Open Questions (Decisions Needed)

1. **Room transition style?**
   - Option A: Instant teleport (simpler)
   - Option B: Animated walk-through door (nicer UX)
   - **Recommendation:** Start with Option A, add B later

2. **Death in dungeon?**
   - Option A: Respawn outside, lose progress
   - Option B: Respawn at entrance, continue
   - **Recommendation:** Option A for challenge

3. **Dungeon re-entry?**
   - Option A: Same layout if re-enter quickly
   - Option B: Always new layout
   - **Recommendation:** Option B for variety

---

## Success Metrics

**MVP Complete When:**
- [x] Cave dungeon generates 10-15 connected rooms
- [ ] Player can navigate between rooms via doors
- [ ] Enemies spawn in chambers and cleared on defeat
- [ ] Boss has 3 phases with abilities
- [ ] Mini-map shows explored rooms
- [ ] Boss drops unique loot
- [ ] Performance: 60 FPS maintained

---

**Document Status:** REVISED - Ready for implementation
**Next Step:** Begin Phase 4A implementation
