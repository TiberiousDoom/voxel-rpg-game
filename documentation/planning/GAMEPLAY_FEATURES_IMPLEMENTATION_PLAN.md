# Gameplay Features Implementation Plan

**Last Updated:** 2025-11-18
**Status:** Active
**Purpose:** Comprehensive plan for implementing monsters, loot, quests, and dungeons in the voxel RPG game

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Implementation Strategy](#implementation-strategy)
3. [Phase 1: Monster System](#phase-1-monster-system)
4. [Phase 2: Loot System](#phase-2-loot-system)
5. [Phase 3: Quest System](#phase-3-quest-system)
6. [Phase 4: Dungeon System](#phase-4-dungeon-system)
7. [Integration Points](#integration-points)
8. [Technical Considerations](#technical-considerations)
9. [Quality of Life Features](#quality-of-life-features)
10. [Success Metrics](#success-metrics)
11. [Quick Wins](#quick-wins)

---

## Executive Summary

### Overview

This plan outlines the implementation of four major gameplay systems that will transform the voxel RPG from a settlement management game into a hybrid settlement + action RPG experience:

- **Monsters**: Hostile entities with AI behaviors
- **Loot**: Equipment and items with procedural stats
- **Quests**: Goal-driven content with rewards
- **Dungeons**: Instanced procedurally-generated challenges

### Implementation Order

```
Phase 1: Monsters (2-3 weeks)
  ↓
Phase 2: Loot (1-2 weeks)
  ↓
Phase 3: Quests (1-2 weeks)
  ↓
Phase 4: Dungeons (2-4 weeks)
```

**Total Timeline:** 6-11 weeks

### Design Principles

1. **Incremental Development** - Start minimal, add complexity gradually
2. **Reuse Existing Systems** - Leverage NPCRenderer, A* pathfinding, grid system
3. **Data-Driven** - JSON configs for easy balancing
4. **Performance First** - Spatial partitioning, object pooling
5. **Testable** - Debug commands and test modes from day one
6. **Modular Architecture** - Each system independent but integrated

### Key Architecture Decisions

- **State Management**: Extend Zustand with `useMonsterStore`, `useQuestStore`, `useDungeonStore`
- **Rendering**: Reuse canvas 2D rendering with sprite system
- **AI**: Behavior tree with state machine pattern
- **Loot**: Procedural generation with rarity tiers
- **Dungeons**: Procedural room-based generation

---

## Implementation Strategy

### Phase-Based Approach

Each phase follows this pattern:

1. **Minimal Implementation** (Quick Win)
2. **Core Features** (Essential functionality)
3. **Enhancement** (Polish and variety)
4. **Integration** (Connect with other systems)
5. **Testing & Balance** (Debug tools, metrics)

### Incremental Development Example

Instead of building all monster features at once:

```javascript
// Week 1: Minimal viable monster
const monster = {
  id: crypto.randomUUID(),
  type: 'SLIME',
  position: { x: 100, z: 100 },
  health: 30,
  aiState: 'IDLE'
};

// Week 2: Add basic AI
aiStates: ['IDLE', 'CHASE', 'ATTACK']

// Week 3: Add advanced behaviors
aiStates: ['IDLE', 'PATROL', 'CHASE', 'ATTACK', 'FLEE']
```

### Data-Driven Design

All game data in JSON configs for easy balancing without code changes:

```
src/config/
├── monsters/
│   ├── monster-types.json
│   ├── monster-modifiers.json
│   └── spawn-zones.json
├── loot/
│   ├── item-templates.json
│   ├── loot-tables.json
│   └── rarity-config.json
├── quests/
│   ├── quest-definitions.json
│   └── quest-chains.json
└── dungeons/
    ├── dungeon-templates.json
    └── room-templates.json
```

---

## Phase 1: Monster System

**Timeline:** 2-3 weeks
**Dependencies:** None (uses existing systems)

### 1A: Minimal Monster Implementation (Days 1-3)

#### Quick Win Goal
Get a single slime enemy spawning, standing idle, and dying when attacked.

#### Implementation Steps

**Step 1: Monster Entity**
```javascript
// src/entities/Monster.js
export class Monster {
  constructor(type, position) {
    this.id = crypto.randomUUID();
    this.type = type; // 'SLIME'
    this.position = position; // { x, z }
    this.health = MONSTER_STATS[type].health; // 30
    this.maxHealth = this.health;
    this.alive = true;
    this.aiState = 'IDLE';
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.die();
    }
  }

  die() {
    // Drop gold
    // Spawn loot entity
    // Play death animation
    // Remove from game
  }
}
```

**Step 2: Monster Store**
```javascript
// src/stores/useMonsterStore.js
export const useMonsterStore = create((set, get) => ({
  monsters: [],

  spawnMonster: (type, position) => {
    const monster = new Monster(type, position);
    set(state => ({ monsters: [...state.monsters, monster] }));
  },

  removeMonster: (id) => {
    set(state => ({
      monsters: state.monsters.filter(m => m.id !== id)
    }));
  },

  updateMonster: (id, updates) => {
    set(state => ({
      monsters: state.monsters.map(m =>
        m.id === id ? { ...m, ...updates } : m
      )
    }));
  }
}));
```

**Step 3: Monster Renderer**
```javascript
// src/rendering/MonsterRenderer.js (similar to NPCRenderer)
export class MonsterRenderer {
  render(ctx, monster, viewport) {
    if (!monster.alive) return;

    const screenPos = worldToScreen(monster.position, viewport);

    // Draw simple circle for now
    ctx.fillStyle = MONSTER_COLORS[monster.type];
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 16, 0, Math.PI * 2);
    ctx.fill();

    // Draw health bar
    this.renderHealthBar(ctx, monster, screenPos);
  }

  renderHealthBar(ctx, monster, screenPos) {
    const barWidth = 32;
    const barHeight = 4;
    const healthPercent = monster.health / monster.maxHealth;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(screenPos.x - barWidth/2, screenPos.y - 24, barWidth, barHeight);

    // Health
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(screenPos.x - barWidth/2, screenPos.y - 24, barWidth * healthPercent, barHeight);
  }
}
```

**Step 4: Add to Game Loop**
```javascript
// GameViewport.jsx
const monsterRenderer = new MonsterRenderer();

const renderFrame = () => {
  // ... existing rendering

  // Render monsters
  monsters.forEach(monster => {
    monsterRenderer.render(ctx, monster, viewport);
  });
};
```

**Step 5: Debug Command**
```javascript
// Add to window for testing
window.debugSpawnMonster = (type = 'SLIME', x = 100, z = 100) => {
  useMonsterStore.getState().spawnMonster(type, { x, z });
};
```

#### Success Criteria
- ✅ Can spawn slime via console: `debugSpawnMonster('SLIME', 100, 100)`
- ✅ Slime renders as green circle with health bar
- ✅ Clicking slime deals damage (reuse player attack)
- ✅ Slime dies at 0 HP and disappears
- ✅ Gold drops when slime dies

### 1B: Basic AI System (Days 4-7)

#### Goal
Monster chases and attacks player when nearby.

#### AI State Machine

```javascript
// src/systems/MonsterAI.js
export class MonsterAI {
  update(monster, deltaTime, gameState) {
    if (!monster.alive) return;

    const player = gameState.player;
    const distToPlayer = distance(monster.position, player.position);

    switch (monster.aiState) {
      case 'IDLE':
        this.updateIdle(monster, player, distToPlayer);
        break;
      case 'CHASE':
        this.updateChase(monster, player, distToPlayer, deltaTime);
        break;
      case 'ATTACK':
        this.updateAttack(monster, player, distToPlayer, deltaTime);
        break;
    }
  }

  updateIdle(monster, player, distToPlayer) {
    const stats = MONSTER_STATS[monster.type];

    // Detect player
    if (distToPlayer <= stats.aggroRange) {
      monster.aiState = 'CHASE';
      monster.targetId = player.id;
    }
  }

  updateChase(monster, player, distToPlayer, deltaTime) {
    const stats = MONSTER_STATS[monster.type];

    // Check attack range
    if (distToPlayer <= stats.attackRange) {
      monster.aiState = 'ATTACK';
      monster.lastAttackTime = Date.now();
      return;
    }

    // Check aggro range
    if (distToPlayer > stats.aggroRange * 2) {
      monster.aiState = 'IDLE';
      monster.targetId = null;
      return;
    }

    // Move toward player
    const direction = normalize(subtract(player.position, monster.position));
    monster.position.x += direction.x * stats.moveSpeed * deltaTime;
    monster.position.z += direction.z * stats.moveSpeed * deltaTime;

    // Face player
    monster.facingAngle = Math.atan2(direction.z, direction.x);
  }

  updateAttack(monster, player, distToPlayer, deltaTime) {
    const stats = MONSTER_STATS[monster.type];
    const now = Date.now();

    // Check if out of range
    if (distToPlayer > stats.attackRange) {
      monster.aiState = 'CHASE';
      return;
    }

    // Attack cooldown
    const timeSinceAttack = now - (monster.lastAttackTime || 0);
    const attackCooldown = 1000 / stats.attackSpeed; // attackSpeed = attacks per second

    if (timeSinceAttack >= attackCooldown) {
      this.performAttack(monster, player);
      monster.lastAttackTime = now;
    }
  }

  performAttack(monster, player) {
    const stats = MONSTER_STATS[monster.type];

    // Deal damage to player
    player.takeDamage(stats.damage);

    // Play attack animation
    monster.animationState = 'ATTACK';

    // Show damage number
    spawnDamageNumber(player.position, stats.damage, 'normal');
  }
}
```

#### Monster Stats Config

```javascript
// src/config/monsters/monster-types.json
{
  "SLIME": {
    "name": "Slime",
    "health": 30,
    "damage": 5,
    "defense": 0,
    "moveSpeed": 2.0,
    "attackSpeed": 0.5,
    "attackRange": 1.5,
    "aggroRange": 10,
    "xpReward": 10,
    "goldReward": [1, 5],
    "lootTable": "SLIME_COMMON",
    "color": "#00ff00"
  }
}
```

#### Success Criteria
- ✅ Monster stands idle until player approaches
- ✅ Monster chases player when within 10 tiles
- ✅ Monster attacks player when within 1.5 tiles
- ✅ Monster deals 5 damage every 2 seconds
- ✅ Monster stops chasing if player escapes

### 1C: Advanced AI Behaviors (Days 8-10)

#### Add PATROL State

```javascript
updateIdle(monster, player, distToPlayer) {
  const stats = MONSTER_STATS[monster.type];

  // Check for player
  if (distToPlayer <= stats.aggroRange) {
    monster.aiState = 'CHASE';
    return;
  }

  // Start patrol if has patrol path
  if (monster.patrolPath && monster.patrolPath.length > 0) {
    monster.aiState = 'PATROL';
    monster.currentWaypointIndex = 0;
  }
}

updatePatrol(monster, player, distToPlayer, deltaTime) {
  const stats = MONSTER_STATS[monster.type];

  // Check for player
  if (distToPlayer <= stats.aggroRange) {
    monster.aiState = 'CHASE';
    return;
  }

  // Get current waypoint
  const waypoint = monster.patrolPath[monster.currentWaypointIndex];
  const distToWaypoint = distance(monster.position, waypoint);

  // Reached waypoint
  if (distToWaypoint < 1) {
    monster.currentWaypointIndex = (monster.currentWaypointIndex + 1) % monster.patrolPath.length;
    monster.pauseUntil = Date.now() + 2000; // Pause 2 seconds
    return;
  }

  // Wait at waypoint
  if (monster.pauseUntil && Date.now() < monster.pauseUntil) {
    return;
  }

  // Move to waypoint
  const direction = normalize(subtract(waypoint, monster.position));
  monster.position.x += direction.x * stats.moveSpeed * 0.5 * deltaTime; // Half speed when patrolling
  monster.position.z += direction.z * stats.moveSpeed * 0.5 * deltaTime;
}
```

#### Add FLEE State (Low Health Behavior)

```javascript
// In update() check health
if (monster.health / monster.maxHealth < 0.3 && MONSTER_STATS[monster.type].canFlee) {
  if (monster.aiState !== 'FLEE') {
    monster.aiState = 'FLEE';
  }
}

updateFlee(monster, player, distToPlayer, deltaTime) {
  const stats = MONSTER_STATS[monster.type];

  // Flee until safe distance
  if (distToPlayer > stats.aggroRange * 1.5) {
    monster.aiState = 'IDLE';
    return;
  }

  // Move away from player
  const direction = normalize(subtract(monster.position, player.position));
  monster.position.x += direction.x * stats.moveSpeed * 1.2 * deltaTime; // 20% faster when fleeing
  monster.position.z += direction.z * stats.moveSpeed * 1.2 * deltaTime;
}
```

### 1D: Monster Variety (Days 11-14)

#### Monster Types

Implement 5 basic monster types:

**1. Slimes (Level 1-3)**
```json
{
  "SLIME": {
    "health": 30,
    "damage": 5,
    "moveSpeed": 2.0,
    "attackSpeed": 0.5,
    "behavior": "simple",
    "special": null
  },
  "BLUE_SLIME": {
    "health": 40,
    "damage": 4,
    "moveSpeed": 1.5,
    "attackSpeed": 0.4,
    "behavior": "simple",
    "special": "magic_resist",
    "resistances": { "magic": 0.5 }
  },
  "RED_SLIME": {
    "health": 25,
    "damage": 8,
    "moveSpeed": 2.2,
    "attackSpeed": 0.6,
    "behavior": "aggressive",
    "special": "fire_damage",
    "damageType": "fire"
  }
}
```

**2. Goblins (Level 2-5)**
```json
{
  "GOBLIN": {
    "health": 50,
    "damage": 8,
    "moveSpeed": 3.0,
    "attackSpeed": 0.7,
    "behavior": "group",
    "canFlee": true,
    "fleeHealthPercent": 0.3,
    "callForHelp": true,
    "helpRadius": 15
  }
}
```

**3. Wolves (Level 3-6)**
```json
{
  "WOLF": {
    "health": 60,
    "damage": 12,
    "moveSpeed": 4.5,
    "attackSpeed": 1.0,
    "behavior": "pack",
    "packBonus": {
      "damagePerAlly": 2,
      "maxAllies": 3
    }
  }
}
```

**4. Skeletons (Level 4-8)**
```json
{
  "SKELETON": {
    "health": 70,
    "damage": 10,
    "moveSpeed": 2.5,
    "attackSpeed": 0.6,
    "attackRange": 8,
    "behavior": "ranged",
    "rangedAttack": {
      "projectileType": "BONE",
      "projectileSpeed": 10
    },
    "immunities": ["poison", "bleed"]
  }
}
```

**5. Orcs (Level 6-10)**
```json
{
  "ORC": {
    "health": 150,
    "damage": 20,
    "moveSpeed": 2.0,
    "attackSpeed": 0.5,
    "behavior": "berserker",
    "berserkerThreshold": 0.3,
    "berserkerBonus": {
      "damageMultiplier": 1.5,
      "speedMultiplier": 1.3
    }
  }
}
```

#### Monster Modifiers System

Instead of creating dozens of monster types, use modifiers:

```javascript
// src/config/monsters/monster-modifiers.json
{
  "ELITE": {
    "nameSuffix": "Elite",
    "healthMultiplier": 3.0,
    "damageMultiplier": 2.0,
    "xpMultiplier": 5.0,
    "goldMultiplier": 4.0,
    "lootQuality": 2,
    "tint": "#ffaa00"
  },
  "FAST": {
    "nameSuffix": "Swift",
    "healthMultiplier": 0.8,
    "speedMultiplier": 1.5,
    "xpMultiplier": 1.5,
    "tint": "#00ffff"
  },
  "TANK": {
    "nameSuffix": "Armored",
    "healthMultiplier": 2.0,
    "speedMultiplier": 0.7,
    "defenseMultiplier": 2.0,
    "xpMultiplier": 2.0,
    "tint": "#888888"
  },
  "BERSERKER": {
    "nameSuffix": "Berserker",
    "damageMultiplier": 3.0,
    "defenseMultiplier": 0.5,
    "attackSpeedMultiplier": 1.5,
    "xpMultiplier": 2.5,
    "tint": "#ff0000"
  }
}
```

Apply modifiers when spawning:

```javascript
spawnMonster(baseType, position, modifier = null) {
  const baseStats = MONSTER_TYPES[baseType];
  const monster = new Monster(baseType, position);

  if (modifier) {
    const modConfig = MONSTER_MODIFIERS[modifier];
    monster.name = `${modConfig.nameSuffix} ${baseStats.name}`;
    monster.maxHealth *= modConfig.healthMultiplier || 1;
    monster.health = monster.maxHealth;
    monster.damage *= modConfig.damageMultiplier || 1;
    monster.moveSpeed *= modConfig.speedMultiplier || 1;
    monster.xpReward *= modConfig.xpMultiplier || 1;
    monster.goldReward = monster.goldReward.map(x => x * (modConfig.goldMultiplier || 1));
    monster.tint = modConfig.tint;
  }

  return monster;
}

// Creates "Elite Goblin", "Swift Wolf", etc.
```

### 1E: Spawn System (Days 15-17)

#### Spawn Zones

```javascript
// src/config/monsters/spawn-zones.json
{
  "zones": [
    {
      "id": "settlement_outskirts",
      "position": { "x": 200, "z": 200 },
      "radius": 50,
      "monsterTypes": ["SLIME", "WOLF"],
      "minLevel": 1,
      "maxLevel": 3,
      "maxPopulation": 10,
      "respawnInterval": 300,
      "spawnWeight": {
        "SLIME": 0.7,
        "WOLF": 0.3
      }
    },
    {
      "id": "goblin_camp",
      "position": { "x": 400, "z": 300 },
      "radius": 30,
      "monsterTypes": ["GOBLIN"],
      "minLevel": 3,
      "maxLevel": 5,
      "maxPopulation": 8,
      "respawnInterval": 600,
      "groupSpawn": true,
      "groupSize": [2, 4]
    },
    {
      "id": "ancient_ruins",
      "position": { "x": 500, "z": 500 },
      "radius": 40,
      "monsterTypes": ["SKELETON", "ORC"],
      "minLevel": 6,
      "maxLevel": 10,
      "maxPopulation": 15,
      "respawnInterval": 900,
      "spawnWeight": {
        "SKELETON": 0.6,
        "ORC": 0.4
      },
      "eliteChance": 0.1
    }
  ]
}
```

#### Spawn Manager

```javascript
// src/systems/MonsterSpawnManager.js
export class MonsterSpawnManager {
  constructor() {
    this.zones = SPAWN_ZONES.zones;
    this.lastSpawnTime = {};
  }

  update(gameState) {
    const now = Date.now();

    this.zones.forEach(zone => {
      const lastSpawn = this.lastSpawnTime[zone.id] || 0;
      const timeSinceSpawn = (now - lastSpawn) / 1000; // seconds

      // Check if should spawn
      if (timeSinceSpawn >= zone.respawnInterval) {
        // Check population
        const currentPop = this.getZonePopulation(zone, gameState);

        if (currentPop < zone.maxPopulation) {
          this.spawnInZone(zone);
          this.lastSpawnTime[zone.id] = now;
        }
      }
    });
  }

  spawnInZone(zone) {
    const spawnCount = zone.groupSpawn ?
      randomInt(zone.groupSize[0], zone.groupSize[1]) : 1;

    for (let i = 0; i < spawnCount; i++) {
      // Pick monster type
      const monsterType = this.pickMonsterType(zone.monsterTypes, zone.spawnWeight);

      // Pick level
      const level = randomInt(zone.minLevel, zone.maxLevel);

      // Pick modifier
      const modifier = zone.eliteChance && Math.random() < zone.eliteChance ? 'ELITE' : null;

      // Pick position in zone
      const position = this.randomPositionInRadius(zone.position, zone.radius);

      // Spawn monster
      const monster = useMonsterStore.getState().spawnMonster(monsterType, position, modifier);
      monster.level = level;
      monster.homePosition = position;
    }
  }

  getZonePopulation(zone, gameState) {
    return gameState.monsters.filter(m => {
      const dist = distance(m.homePosition, zone.position);
      return dist <= zone.radius;
    }).length;
  }
}
```

#### Success Criteria
- ✅ Monsters spawn automatically in zones
- ✅ Respawn after being killed (5 min timer)
- ✅ Population caps prevent spawning too many
- ✅ Different zones have different monster types
- ✅ Elite monsters spawn occasionally (10% chance in hard zones)

### 1F: Performance Optimization (Days 18-21)

#### Spatial Partitioning

Only update monsters near player:

```javascript
// src/systems/SpatialPartitioning.js
export class SpatialPartitioning {
  constructor(cellSize = 50) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  getCellKey(position) {
    const cellX = Math.floor(position.x / this.cellSize);
    const cellZ = Math.floor(position.z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  insert(entity) {
    const key = this.getCellKey(entity.position);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(entity);
  }

  getEntitiesNear(position, radius) {
    const entities = [];
    const radiusInCells = Math.ceil(radius / this.cellSize);
    const centerCell = {
      x: Math.floor(position.x / this.cellSize),
      z: Math.floor(position.z / this.cellSize)
    };

    for (let x = -radiusInCells; x <= radiusInCells; x++) {
      for (let z = -radiusInCells; z <= radiusInCells; z++) {
        const key = `${centerCell.x + x},${centerCell.z + z}`;
        if (this.grid.has(key)) {
          entities.push(...this.grid.get(key));
        }
      }
    }

    return entities;
  }

  rebuild(entities) {
    this.grid.clear();
    entities.forEach(e => this.insert(e));
  }
}
```

Use in AI update:

```javascript
// Only update monsters within 100 tiles of player
const nearbyMonsters = spatialPartition.getEntitiesNear(player.position, 100);
nearbyMonsters.forEach(monster => {
  monsterAI.update(monster, deltaTime, gameState);
});
```

#### Object Pooling for Projectiles

```javascript
// src/utils/ObjectPool.js
export class ObjectPool {
  constructor(factory, initialSize = 50) {
    this.factory = factory;
    this.available = [];
    this.inUse = new Set();

    // Pre-populate
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire() {
    let obj = this.available.pop();
    if (!obj) {
      obj = this.factory();
    }
    this.inUse.add(obj);
    return obj;
  }

  release(obj) {
    this.inUse.delete(obj);
    this.available.push(obj);
  }
}

// Usage
const projectilePool = new ObjectPool(() => ({
  active: false,
  position: { x: 0, z: 0 },
  velocity: { x: 0, z: 0 },
  damage: 0,
  ownerId: null
}), 100);

function fireProjectile(start, target, damage, ownerId) {
  const projectile = projectilePool.acquire();
  projectile.active = true;
  projectile.position = { ...start };
  projectile.velocity = normalize(subtract(target, start));
  projectile.damage = damage;
  projectile.ownerId = ownerId;
  return projectile;
}
```

#### Performance Targets
- ✅ 60 FPS with 50+ monsters on screen
- ✅ AI updates < 5ms per frame
- ✅ Rendering < 10ms per frame
- ✅ Memory usage stable (no leaks)

---

## Phase 2: Loot System

**Timeline:** 1-2 weeks
**Dependencies:** Phase 1 (monsters to drop loot)

### 2A: Basic Equipment (Days 1-3)

#### Quick Win: Single Equipment Slot

Start with just the weapon slot:

```javascript
// Extend player store
equipment: {
  weapon: null,
  // armor, helmet, etc. come later
},

equipWeapon: (item) => {
  const current = get().equipment.weapon;

  // Unequip current
  if (current) {
    get().addToInventory(current);
    get().removeStats(current);
  }

  // Equip new
  set(state => ({
    equipment: { ...state.equipment, weapon: item }
  }));
  get().applyStats(item);
},

applyStats: (item) => {
  if (item.stats.damage) {
    set(state => ({
      damage: state.damage + item.stats.damage
    }));
  }
}
```

#### Simple Item Structure

```javascript
// src/entities/Item.js
{
  id: 'iron_sword_01',
  name: 'Iron Sword',
  type: 'WEAPON',
  rarity: 'COMMON',
  level: 1,
  stats: {
    damage: 10
  },
  sellValue: 50,
  iconPath: 'assets/icons/weapons/iron_sword.png'
}
```

#### Basic Loot Drop

```javascript
// When monster dies
die() {
  // Drop gold
  const gold = randomInt(...this.goldReward);
  spawnGoldDrop(this.position, gold);

  // 30% chance to drop weapon
  if (Math.random() < 0.3) {
    const weapon = generateBasicWeapon(this.level);
    spawnLootDrop(this.position, weapon);
  }
}

function generateBasicWeapon(level) {
  const baseDamage = 5 + (level * 2);
  return {
    id: crypto.randomUUID(),
    name: `Sword Lv${level}`,
    type: 'WEAPON',
    rarity: 'COMMON',
    level: level,
    stats: { damage: baseDamage },
    sellValue: level * 10
  };
}
```

#### Success Criteria
- ✅ Monsters drop weapons on death
- ✅ Walking over weapon picks it up
- ✅ Can equip weapon from inventory
- ✅ Equipped weapon increases damage stat
- ✅ Visual feedback (loot beam, pickup notification)

### 2B: Rarity System (Days 4-6)

#### Rarity Tiers

```javascript
// src/config/loot/rarity-config.json
{
  "COMMON": {
    "color": "#ffffff",
    "statMultiplier": 1.0,
    "propertyCount": [0, 1],
    "dropChance": 0.70,
    "sellMultiplier": 1.0
  },
  "UNCOMMON": {
    "color": "#00ff00",
    "statMultiplier": 1.3,
    "propertyCount": [1, 2],
    "dropChance": 0.20,
    "sellMultiplier": 2.0
  },
  "RARE": {
    "color": "#0088ff",
    "statMultiplier": 1.8,
    "propertyCount": [2, 3],
    "dropChance": 0.07,
    "sellMultiplier": 5.0
  },
  "EPIC": {
    "color": "#aa00ff",
    "statMultiplier": 2.5,
    "propertyCount": [3, 4],
    "dropChance": 0.025,
    "sellMultiplier": 10.0
  },
  "LEGENDARY": {
    "color": "#ff8800",
    "statMultiplier": 4.0,
    "propertyCount": [4, 5],
    "dropChance": 0.005,
    "sellMultiplier": 50.0,
    "glowEffect": true
  }
}
```

#### Rarity-Based Generation

```javascript
function generateItem(baseType, level) {
  // Roll rarity
  const rarity = rollRarity();
  const rarityConfig = RARITY_CONFIG[rarity];

  // Get base template
  const template = ITEM_TEMPLATES[baseType];

  // Create item
  const item = {
    id: crypto.randomUUID(),
    name: template.name,
    type: baseType,
    rarity: rarity,
    level: level,
    stats: {},
    properties: [],
    iconPath: template.iconPath,
    sellValue: 0
  };

  // Calculate stats
  Object.keys(template.baseStats).forEach(stat => {
    const baseValue = template.baseStats[stat];
    const levelScaling = baseValue * (level * 0.1);
    const rarityScaling = rarityConfig.statMultiplier;
    item.stats[stat] = Math.floor((baseValue + levelScaling) * rarityScaling);
  });

  // Add properties
  const propCount = randomInt(...rarityConfig.propertyCount);
  for (let i = 0; i < propCount; i++) {
    const prop = rollRandomProperty();
    item.properties.push(prop);
  }

  // Generate name
  item.name = generateItemName(item, template);

  // Calculate sell value
  item.sellValue = calculateSellValue(item, rarityConfig);

  return item;
}

function rollRarity() {
  const roll = Math.random();
  let cumulative = 0;

  for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
    cumulative += config.dropChance;
    if (roll <= cumulative) {
      return rarity;
    }
  }

  return 'COMMON';
}
```

#### Item Properties

```javascript
// src/config/loot/item-properties.json
{
  "LIFESTEAL": {
    "name": "Lifesteal",
    "description": "Heal for {value}% of damage dealt",
    "valueRange": [5, 15],
    "format": "percent",
    "applicableTo": ["WEAPON"]
  },
  "CRITICAL_CHANCE": {
    "name": "Critical Strike",
    "description": "+{value}% critical strike chance",
    "valueRange": [5, 20],
    "format": "percent",
    "applicableTo": ["WEAPON", "RING", "AMULET"]
  },
  "EXTRA_GOLD": {
    "name": "Gold Find",
    "description": "+{value}% gold from monsters",
    "valueRange": [10, 30],
    "format": "percent",
    "applicableTo": ["RING", "AMULET"]
  },
  "THORNS": {
    "name": "Thorns",
    "description": "Reflect {value} damage to attackers",
    "valueRange": [5, 20],
    "format": "flat",
    "applicableTo": ["ARMOR", "HELMET"]
  },
  "HEALTH_BONUS": {
    "name": "Vitality",
    "description": "+{value} max health",
    "valueRange": [20, 100],
    "format": "flat",
    "applicableTo": ["ARMOR", "HELMET", "BOOTS"]
  },
  "SPEED_BONUS": {
    "name": "Swiftness",
    "description": "+{value}% movement speed",
    "valueRange": [5, 15],
    "format": "percent",
    "applicableTo": ["BOOTS"]
  }
}
```

### 2C: Loot Tables (Days 7-9)

#### Loot Table System

```javascript
// src/config/loot/loot-tables.json
{
  "SLIME_COMMON": {
    "gold": {
      "min": 1,
      "max": 5
    },
    "xp": {
      "min": 5,
      "max": 10
    },
    "itemDropChance": 0.3,
    "items": [
      {
        "itemType": "MATERIAL",
        "itemId": "SLIME_GEL",
        "weight": 60,
        "quantity": [1, 3]
      },
      {
        "itemType": "CONSUMABLE",
        "itemId": "MINOR_HEALTH_POTION",
        "weight": 30,
        "quantity": [1, 1]
      },
      {
        "itemType": "EQUIPMENT",
        "equipmentType": "WEAPON",
        "weight": 10,
        "level": [1, 3]
      }
    ]
  },

  "GOBLIN_WARRIOR": {
    "gold": { "min": 10, "max": 25 },
    "xp": { "min": 20, "max": 35 },
    "itemDropChance": 0.5,
    "items": [
      {
        "itemType": "EQUIPMENT",
        "equipmentType": "WEAPON",
        "weight": 30,
        "level": [2, 5]
      },
      {
        "itemType": "EQUIPMENT",
        "equipmentType": "ARMOR",
        "weight": 25,
        "level": [2, 5]
      },
      {
        "itemType": "CONSUMABLE",
        "itemId": "HEALTH_POTION",
        "weight": 25,
        "quantity": [1, 2]
      },
      {
        "itemType": "MATERIAL",
        "itemId": "GOBLIN_EAR",
        "weight": 20,
        "quantity": [1, 1]
      }
    ]
  },

  "ELITE_BOSS": {
    "gold": { "min": 100, "max": 300 },
    "xp": { "min": 200, "max": 500 },
    "itemDropChance": 1.0,
    "guaranteedItems": 2,
    "rarityWeights": {
      "COMMON": 0.1,
      "UNCOMMON": 0.3,
      "RARE": 0.4,
      "EPIC": 0.15,
      "LEGENDARY": 0.05
    },
    "items": [
      {
        "itemType": "EQUIPMENT",
        "equipmentType": "ANY",
        "weight": 100,
        "level": [8, 12]
      }
    ]
  }
}
```

#### Loot Roller

```javascript
// src/systems/LootSystem.js
export class LootSystem {
  rollLoot(lootTableId, bonusLuck = 0) {
    const table = LOOT_TABLES[lootTableId];
    const drops = [];

    // Always drop gold and XP
    const gold = randomInt(table.gold.min, table.gold.max);
    const xp = randomInt(table.xp.min, table.xp.max);
    drops.push({ type: 'GOLD', amount: gold });
    drops.push({ type: 'XP', amount: xp });

    // Roll for item drops
    const dropChance = table.itemDropChance + (bonusLuck * 0.01); // +1% per luck
    const guaranteedItems = table.guaranteedItems || 0;

    let itemsToGenerate = guaranteedItems;
    if (Math.random() < dropChance) {
      itemsToGenerate += 1;
    }

    for (let i = 0; i < itemsToGenerate; i++) {
      const item = this.rollItem(table);
      if (item) {
        drops.push({ type: 'ITEM', item: item });
      }
    }

    return drops;
  }

  rollItem(table) {
    // Pick item entry from table
    const entry = this.weightedRandom(table.items, 'weight');

    if (entry.itemType === 'EQUIPMENT') {
      // Generate equipment
      const equipType = entry.equipmentType === 'ANY' ?
        this.randomEquipmentType() : entry.equipmentType;
      const level = randomInt(...entry.level);
      return generateItem(equipType, level);
    } else if (entry.itemType === 'CONSUMABLE') {
      // Return consumable
      const quantity = randomInt(...entry.quantity);
      return {
        ...CONSUMABLE_TEMPLATES[entry.itemId],
        quantity: quantity
      };
    } else if (entry.itemType === 'MATERIAL') {
      // Return material
      const quantity = randomInt(...entry.quantity);
      return {
        ...MATERIAL_TEMPLATES[entry.itemId],
        quantity: quantity
      };
    }
  }

  weightedRandom(items, weightKey) {
    const totalWeight = items.reduce((sum, item) => sum + item[weightKey], 0);
    let roll = Math.random() * totalWeight;

    for (const item of items) {
      roll -= item[weightKey];
      if (roll <= 0) return item;
    }

    return items[items.length - 1];
  }
}
```

### 2D: Full Equipment System (Days 10-14)

#### All Equipment Slots

```javascript
equipment: {
  weapon: null,
  armor: null,
  helmet: null,
  gloves: null,
  boots: null,
  ring1: null,
  ring2: null,
  amulet: null,
  offhand: null
}
```

#### Item Templates

```javascript
// src/config/loot/item-templates.json
{
  "IRON_SWORD": {
    "name": "Iron Sword",
    "type": "WEAPON",
    "subtype": "SWORD",
    "baseStats": {
      "damage": 15
    },
    "allowedProperties": ["LIFESTEAL", "CRITICAL_CHANCE", "ATTACK_SPEED"],
    "iconPath": "assets/icons/weapons/sword.png"
  },
  "IRON_ARMOR": {
    "name": "Iron Armor",
    "type": "ARMOR",
    "baseStats": {
      "defense": 10,
      "health": 50
    },
    "allowedProperties": ["THORNS", "HEALTH_BONUS", "DEFENSE_BONUS"],
    "iconPath": "assets/icons/armor/chest.png"
  },
  "LEATHER_BOOTS": {
    "name": "Leather Boots",
    "type": "BOOTS",
    "baseStats": {
      "defense": 5,
      "moveSpeed": 0.5
    },
    "allowedProperties": ["SPEED_BONUS", "DODGE_CHANCE"],
    "iconPath": "assets/icons/armor/boots.png"
  }
}
```

#### Equipment UI

Create inventory panel with equipment slots:

```jsx
// src/components/InventoryUI.jsx
const InventoryUI = () => {
  const { equipment, inventory } = useGameStore();

  return (
    <div className="inventory-panel">
      <div className="equipment-slots">
        <EquipmentSlot slot="helmet" item={equipment.helmet} />
        <EquipmentSlot slot="amulet" item={equipment.amulet} />
        <EquipmentSlot slot="weapon" item={equipment.weapon} />
        <EquipmentSlot slot="armor" item={equipment.armor} />
        <EquipmentSlot slot="offhand" item={equipment.offhand} />
        <EquipmentSlot slot="gloves" item={equipment.gloves} />
        <EquipmentSlot slot="ring1" item={equipment.ring1} />
        <EquipmentSlot slot="ring2" item={equipment.ring2} />
        <EquipmentSlot slot="boots" item={equipment.boots} />
      </div>

      <div className="inventory-grid">
        {inventory.items.map(item => (
          <ItemIcon
            key={item.id}
            item={item}
            onClick={() => equipItem(item)}
            onRightClick={() => showItemOptions(item)}
          />
        ))}
      </div>

      <div className="player-stats">
        <StatDisplay label="Damage" value={calculateTotalDamage()} />
        <StatDisplay label="Defense" value={calculateTotalDefense()} />
        <StatDisplay label="Health" value={calculateTotalHealth()} />
      </div>
    </div>
  );
};
```

#### Item Comparison Tooltip

```jsx
const ItemTooltip = ({ item, showComparison = false }) => {
  const equippedItem = useGameStore(state => state.equipment[item.type.toLowerCase()]);

  return (
    <div className="item-tooltip" style={{ borderColor: RARITY_CONFIG[item.rarity].color }}>
      <div className="item-name" style={{ color: RARITY_CONFIG[item.rarity].color }}>
        {item.name}
      </div>
      <div className="item-type">{item.type} - Level {item.level}</div>

      <div className="item-stats">
        {Object.entries(item.stats).map(([stat, value]) => (
          <div key={stat}>
            {stat}: {value}
            {showComparison && equippedItem && (
              <span className={value > equippedItem.stats[stat] ? 'upgrade' : 'downgrade'}>
                ({value > equippedItem.stats[stat] ? '+' : ''}{value - (equippedItem.stats[stat] || 0)})
              </span>
            )}
          </div>
        ))}
      </div>

      {item.properties.length > 0 && (
        <div className="item-properties">
          {item.properties.map((prop, i) => (
            <div key={i} className="property">
              {formatProperty(prop)}
            </div>
          ))}
        </div>
      )}

      <div className="item-sell-value">
        Sell Value: {item.sellValue} gold
      </div>
    </div>
  );
};
```

---

## Phase 3: Quest System

**Timeline:** 1-2 weeks
**Dependencies:** Phase 1 (monsters to kill), Phase 2 (items to collect)

### 3A: Basic Quest Framework (Days 1-4)

#### Quick Win: Simple Kill Quest

```javascript
// src/entities/Quest.js
{
  id: 'quest_001',
  title: 'Slime Extermination',
  description: 'The settlement is being overrun by slimes. Clear them out!',
  type: 'KILL',
  objectives: [
    {
      id: 'obj_001',
      description: 'Kill 10 Slimes',
      type: 'KILL',
      targetType: 'SLIME',
      targetCount: 10,
      currentCount: 0,
      completed: false
    }
  ],
  rewards: {
    xp: 100,
    gold: 50,
    items: []
  },
  state: 'AVAILABLE', // AVAILABLE, ACTIVE, COMPLETED
  levelRequirement: 1
}
```

#### Quest Store

```javascript
// src/stores/useQuestStore.js
export const useQuestStore = create((set, get) => ({
  activeQuests: [],
  availableQuests: [],
  completedQuests: [],

  acceptQuest: (questId) => {
    const quest = get().availableQuests.find(q => q.id === questId);
    if (quest) {
      quest.state = 'ACTIVE';
      set(state => ({
        activeQuests: [...state.activeQuests, quest],
        availableQuests: state.availableQuests.filter(q => q.id !== questId)
      }));
    }
  },

  updateObjective: (questId, objectiveId, progress) => {
    set(state => ({
      activeQuests: state.activeQuests.map(quest => {
        if (quest.id === questId) {
          return {
            ...quest,
            objectives: quest.objectives.map(obj => {
              if (obj.id === objectiveId) {
                const currentCount = obj.currentCount + progress;
                return {
                  ...obj,
                  currentCount: currentCount,
                  completed: currentCount >= obj.targetCount
                };
              }
              return obj;
            })
          };
        }
        return quest;
      })
    }));

    // Check if quest is complete
    const quest = get().activeQuests.find(q => q.id === questId);
    if (quest && quest.objectives.every(obj => obj.completed)) {
      get().completeQuest(questId);
    }
  },

  completeQuest: (questId) => {
    const quest = get().activeQuests.find(q => q.id === questId);
    if (quest) {
      // Grant rewards
      const gameStore = useGameStore.getState();
      gameStore.addXP(quest.rewards.xp);
      gameStore.addGold(quest.rewards.gold);
      quest.rewards.items.forEach(item => gameStore.addItem(item));

      // Move to completed
      quest.state = 'COMPLETED';
      set(state => ({
        activeQuests: state.activeQuests.filter(q => q.id !== questId),
        completedQuests: [...state.completedQuests, questId]
      }));

      // Show notification
      showNotification(`Quest Complete: ${quest.title}`, 'success');
    }
  }
}));
```

#### Quest Tracking

Hook into monster kills:

```javascript
// When monster dies
die() {
  // ... existing death logic

  // Update kill quests
  const activeQuests = useQuestStore.getState().activeQuests;
  activeQuests.forEach(quest => {
    quest.objectives.forEach(obj => {
      if (obj.type === 'KILL' && obj.targetType === this.type && !obj.completed) {
        useQuestStore.getState().updateObjective(quest.id, obj.id, 1);
      }
    });
  });
}
```

#### Simple Quest UI

```jsx
// src/components/QuestTracker.jsx
const QuestTracker = () => {
  const activeQuests = useQuestStore(state => state.activeQuests);

  return (
    <div className="quest-tracker">
      {activeQuests.slice(0, 3).map(quest => (
        <div key={quest.id} className="tracked-quest">
          <div className="quest-title">{quest.title}</div>
          {quest.objectives.map(obj => (
            <div key={obj.id} className="objective">
              <input type="checkbox" checked={obj.completed} readOnly />
              <span>{obj.description}: {obj.currentCount}/{obj.targetCount}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

### 3B: Quest Types (Days 5-8)

#### Collection Quests

```javascript
objectives: [
  {
    type: 'COLLECT',
    itemId: 'SLIME_GEL',
    targetCount: 5,
    currentCount: 0
  }
]
```

Track in inventory changes:

```javascript
addItem: (item) => {
  // ... add to inventory

  // Update collection quests
  const activeQuests = useQuestStore.getState().activeQuests;
  activeQuests.forEach(quest => {
    quest.objectives.forEach(obj => {
      if (obj.type === 'COLLECT' && obj.itemId === item.id) {
        const newCount = getInventoryCount(item.id);
        useQuestStore.getState().updateObjective(quest.id, obj.id, newCount - obj.currentCount);
      }
    });
  });
}
```

#### Exploration Quests

```javascript
objectives: [
  {
    type: 'DISCOVER',
    locationId: 'ANCIENT_RUINS',
    discovered: false
  },
  {
    type: 'REACH_POSITION',
    position: { x: 500, z: 500 },
    radius: 5,
    reached: false
  }
]
```

Check in game loop:

```javascript
update(deltaTime) {
  // ... existing updates

  // Check exploration objectives
  const activeQuests = useQuestStore.getState().activeQuests;
  activeQuests.forEach(quest => {
    quest.objectives.forEach(obj => {
      if (obj.type === 'REACH_POSITION' && !obj.reached) {
        const dist = distance(player.position, obj.position);
        if (dist <= obj.radius) {
          obj.reached = true;
          obj.completed = true;
          useQuestStore.getState().checkQuestCompletion(quest.id);
        }
      }
    });
  });
}
```

#### Building Quests (Settlement Integration!)

```javascript
objectives: [
  {
    type: 'BUILD',
    buildingType: 'HOUSE',
    targetCount: 3,
    currentCount: 0
  }
]
```

Track when buildings complete:

```javascript
// In building completion handler
completeBuilding(buildingId) {
  // ... mark building complete

  // Update building quests
  const building = getBuilding(buildingId);
  const activeQuests = useQuestStore.getState().activeQuests;
  activeQuests.forEach(quest => {
    quest.objectives.forEach(obj => {
      if (obj.type === 'BUILD' && obj.buildingType === building.type) {
        useQuestStore.getState().updateObjective(quest.id, obj.id, 1);
      }
    });
  });
}
```

### 3C: Quest Definitions (Days 9-11)

#### Quest Config

```javascript
// src/config/quests/quest-definitions.json
{
  "main_quests": [
    {
      "id": "main_001",
      "title": "First Steps",
      "description": "Learn the basics of survival in this harsh world.",
      "category": "MAIN",
      "levelRequirement": 1,
      "prerequisites": [],
      "type": "KILL",
      "objectives": [
        {
          "type": "KILL",
          "targetType": "SLIME",
          "targetCount": 5,
          "description": "Kill 5 Slimes"
        }
      ],
      "rewards": {
        "xp": 50,
        "gold": 25,
        "items": [
          { "itemId": "IRON_SWORD", "quantity": 1 }
        ]
      },
      "unlocks": ["main_002"]
    },
    {
      "id": "main_002",
      "title": "Growing Settlement",
      "description": "Expand your settlement to house more settlers.",
      "category": "MAIN",
      "levelRequirement": 2,
      "prerequisites": ["main_001"],
      "type": "BUILD",
      "objectives": [
        {
          "type": "BUILD",
          "buildingType": "HOUSE",
          "targetCount": 2,
          "description": "Build 2 Houses"
        }
      ],
      "rewards": {
        "xp": 100,
        "gold": 50,
        "reputation": 50
      },
      "unlocks": ["main_003"]
    }
  ],
  "side_quests": [
    {
      "id": "side_001",
      "title": "Goblin Menace",
      "description": "Goblins have been raiding our trade routes. Eliminate them!",
      "category": "SIDE",
      "levelRequirement": 3,
      "type": "KILL",
      "objectives": [
        {
          "type": "KILL",
          "targetType": "GOBLIN",
          "targetCount": 15,
          "description": "Kill 15 Goblins"
        }
      ],
      "rewards": {
        "xp": 200,
        "gold": 100,
        "items": [
          { "itemType": "EQUIPMENT", "equipmentType": "WEAPON", "level": 5, "rarity": "RARE" }
        ]
      }
    }
  ],
  "daily_quests": [
    {
      "id": "daily_template_01",
      "title": "Daily Hunt",
      "description": "Kill monsters to keep the area safe.",
      "category": "DAILY",
      "type": "KILL",
      "isRepeatable": true,
      "cooldown": 86400,
      "objectives": [
        {
          "type": "KILL",
          "targetType": "ANY",
          "targetCount": 20,
          "description": "Kill 20 monsters"
        }
      ],
      "rewards": {
        "xp": 150,
        "gold": 75
      }
    }
  ]
}
```

#### Quest Manager

```javascript
// src/systems/QuestManager.js
export class QuestManager {
  constructor() {
    this.loadQuests();
  }

  loadQuests() {
    // Load main quests
    const mainQuests = QUEST_DEFINITIONS.main_quests;
    const sideQuests = QUEST_DEFINITIONS.side_quests;

    // Make first main quest available
    const firstQuest = mainQuests[0];
    useQuestStore.getState().makeAvailable(firstQuest);
  }

  checkPrerequisites(quest, completedQuests) {
    return quest.prerequisites.every(prereq =>
      completedQuests.includes(prereq)
    );
  }

  checkLevelRequirement(quest, playerLevel) {
    return playerLevel >= quest.levelRequirement;
  }

  unlockFollowupQuests(completedQuestId) {
    const allQuests = [
      ...QUEST_DEFINITIONS.main_quests,
      ...QUEST_DEFINITIONS.side_quests
    ];

    allQuests.forEach(quest => {
      if (quest.prerequisites && quest.prerequisites.includes(completedQuestId)) {
        const player = useGameStore.getState().player;
        const completedQuests = useQuestStore.getState().completedQuests;

        if (this.checkPrerequisites(quest, completedQuests) &&
            this.checkLevelRequirement(quest, player.level)) {
          useQuestStore.getState().makeAvailable(quest);
        }
      }
    });
  }
}
```

### 3D: Quest UI (Days 12-14)

#### Quest Journal

```jsx
// src/components/QuestJournal.jsx
const QuestJournal = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('active');
  const { activeQuests, availableQuests, completedQuests } = useQuestStore();
  const [selectedQuest, setSelectedQuest] = useState(null);

  if (!isOpen) return null;

  const quests = {
    active: activeQuests,
    available: availableQuests,
    completed: completedQuests.map(id => QUEST_DEFINITIONS.find(q => q.id === id))
  };

  return (
    <div className="quest-journal-modal">
      <div className="journal-header">
        <h2>Quest Journal</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className="journal-tabs">
        <button
          className={tab === 'active' ? 'active' : ''}
          onClick={() => setTab('active')}
        >
          Active ({activeQuests.length})
        </button>
        <button
          className={tab === 'available' ? 'active' : ''}
          onClick={() => setTab('available')}
        >
          Available ({availableQuests.length})
        </button>
        <button
          className={tab === 'completed' ? 'active' : ''}
          onClick={() => setTab('completed')}
        >
          Completed ({completedQuests.length})
        </button>
      </div>

      <div className="journal-content">
        <div className="quest-list">
          {quests[tab].map(quest => (
            <div
              key={quest.id}
              className={`quest-item ${selectedQuest?.id === quest.id ? 'selected' : ''}`}
              onClick={() => setSelectedQuest(quest)}
            >
              <div className="quest-title">{quest.title}</div>
              <div className="quest-category">{quest.category} - Level {quest.levelRequirement}</div>
            </div>
          ))}
        </div>

        <div className="quest-details">
          {selectedQuest ? (
            <>
              <h3>{selectedQuest.title}</h3>
              <div className="quest-description">{selectedQuest.description}</div>

              <div className="quest-objectives">
                <h4>Objectives:</h4>
                {selectedQuest.objectives.map((obj, i) => (
                  <div key={i} className="objective">
                    <input type="checkbox" checked={obj.completed} readOnly />
                    <span>
                      {obj.description}
                      {obj.targetCount && ` (${obj.currentCount || 0}/${obj.targetCount})`}
                    </span>
                  </div>
                ))}
              </div>

              <div className="quest-rewards">
                <h4>Rewards:</h4>
                <ul>
                  {selectedQuest.rewards.xp && <li>XP: {selectedQuest.rewards.xp}</li>}
                  {selectedQuest.rewards.gold && <li>Gold: {selectedQuest.rewards.gold}</li>}
                  {selectedQuest.rewards.items && selectedQuest.rewards.items.map((item, i) => (
                    <li key={i}>{item.name || `Item Level ${item.level}`}</li>
                  ))}
                </ul>
              </div>

              {tab === 'available' && (
                <button
                  className="accept-quest-btn"
                  onClick={() => {
                    useQuestStore.getState().acceptQuest(selectedQuest.id);
                    setTab('active');
                  }}
                >
                  Accept Quest
                </button>
              )}

              {tab === 'active' && selectedQuest.objectives.every(obj => obj.completed) && (
                <button
                  className="complete-quest-btn"
                  onClick={() => {
                    useQuestStore.getState().completeQuest(selectedQuest.id);
                    setTab('completed');
                  }}
                >
                  Turn In Quest
                </button>
              )}
            </>
          ) : (
            <div className="no-selection">Select a quest to view details</div>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

## Phase 4: Dungeon System

**Timeline:** 2-4 weeks
**Dependencies:** All previous phases

### 4A: Dungeon Framework (Days 1-5)

#### Dungeon Entity

```javascript
// src/entities/Dungeon.js
{
  id: 'dungeon_cave_01',
  name: 'Slime Cave',
  type: 'CAVE',
  entrancePosition: { x: 300, z: 300 },
  discovered: false,
  recommendedLevel: 3,
  difficulty: 'NORMAL',

  layout: {
    width: 20,
    height: 20,
    rooms: [],
    connections: [],
    startRoom: 'room_0',
    bossRoom: 'room_5'
  },

  state: 'LOCKED', // LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED
  completionCount: 0,
  firstClearReward: {
    xp: 500,
    gold: 200,
    items: [
      { itemType: 'EQUIPMENT', equipmentType: 'ARMOR', level: 5, rarity: 'RARE' }
    ]
  }
}
```

#### Room Entity

```javascript
{
  id: 'room_0',
  type: 'START',
  position: { x: 0, z: 0 },
  dimensions: { width: 10, height: 10 },

  tiles: [], // 2D array of tile types
  doors: [
    { direction: 'NORTH', locked: false, connectedRoom: 'room_1' }
  ],

  monsters: [],
  loot: [],

  cleared: false,
  visited: false
}
```

#### Dungeon Store

```javascript
// src/stores/useDungeonStore.js
export const useDungeonStore = create((set, get) => ({
  currentDungeon: null,
  currentRoom: null,
  visitedRooms: [],
  startTime: null,

  enterDungeon: (dungeonId) => {
    const dungeon = DUNGEON_TEMPLATES[dungeonId];
    const generatedDungeon = generateDungeon(dungeon);

    // Save game state
    saveGameState();

    // Enter dungeon
    set({
      currentDungeon: generatedDungeon,
      currentRoom: generatedDungeon.layout.rooms[0],
      visitedRooms: [generatedDungeon.layout.rooms[0].id],
      startTime: Date.now()
    });

    // Teleport player
    const startRoom = generatedDungeon.layout.rooms[0];
    useGameStore.getState().setPlayerPosition(startRoom.spawnPoint);

    // Change game mode
    useGameStore.getState().setGameMode('DUNGEON');
  },

  exitDungeon: () => {
    // Return to overworld
    loadGameState();
    set({
      currentDungeon: null,
      currentRoom: null,
      visitedRooms: [],
      startTime: null
    });
    useGameStore.getState().setGameMode('OVERWORLD');
  },

  moveToRoom: (roomId) => {
    const room = get().currentDungeon.layout.rooms.find(r => r.id === roomId);

    set(state => ({
      currentRoom: room,
      visitedRooms: [...state.visitedRooms, roomId]
    }));

    // Spawn monsters if not visited
    if (!get().visitedRooms.includes(roomId)) {
      spawnRoomMonsters(room);
    }
  }
}));
```

### 4B: Procedural Generation (Days 6-12)

#### Dungeon Generator

```javascript
// src/systems/DungeonGenerator.js
export class DungeonGenerator {
  generate(template, difficulty) {
    const dungeon = {
      ...template,
      layout: {
        rooms: [],
        connections: [],
        startRoom: null,
        bossRoom: null
      }
    };

    // Generate room layout
    const rooms = this.generateRoomLayout(template.type, difficulty);
    dungeon.layout.rooms = rooms;
    dungeon.layout.startRoom = rooms[0].id;
    dungeon.layout.bossRoom = rooms[rooms.length - 1].id;

    // Populate rooms
    rooms.forEach(room => {
      this.populateRoom(room, template.type, difficulty);
    });

    return dungeon;
  }

  generateRoomLayout(dungeonType, difficulty) {
    const rooms = [];
    const roomCount = 5 + Math.floor(Math.random() * 5); // 5-10 rooms

    // Create start room
    const startRoom = this.createRoom('START', { x: 0, z: 0 });
    rooms.push(startRoom);

    let currentRoom = startRoom;

    // Generate main path
    for (let i = 1; i < roomCount; i++) {
      const direction = this.randomDirection();
      const position = this.getAdjacentPosition(currentRoom.position, direction);

      const roomType = i === roomCount - 1 ? 'BOSS' :
                       Math.random() < 0.2 ? this.randomSpecialRoomType() :
                       'NORMAL';

      const newRoom = this.createRoom(roomType, position);
      this.connectRooms(currentRoom, newRoom, direction);
      rooms.push(newRoom);

      currentRoom = newRoom;
    }

    // Add branches (treasure rooms, etc.)
    const branchCount = Math.floor(roomCount * 0.3);
    for (let i = 0; i < branchCount; i++) {
      const parentRoom = rooms[Math.floor(Math.random() * (rooms.length - 1))];
      const direction = this.findEmptyDirection(parentRoom, rooms);

      if (direction) {
        const position = this.getAdjacentPosition(parentRoom.position, direction);
        const branchRoom = this.createRoom('TREASURE', position);
        this.connectRooms(parentRoom, branchRoom, direction);
        rooms.push(branchRoom);
      }
    }

    return rooms;
  }

  createRoom(type, position) {
    return {
      id: `room_${crypto.randomUUID()}`,
      type: type,
      position: position,
      dimensions: { width: 10, height: 10 },
      tiles: this.generateRoomTiles(type),
      doors: [],
      monsters: [],
      loot: [],
      cleared: false,
      visited: false,
      spawnPoint: { x: position.x * 10 + 5, z: position.z * 10 + 5 }
    };
  }

  generateRoomTiles(roomType) {
    const width = 10;
    const height = 10;
    const tiles = [];

    for (let z = 0; z < height; z++) {
      tiles[z] = [];
      for (let x = 0; x < width; x++) {
        // Walls on edges
        if (x === 0 || x === width - 1 || z === 0 || z === height - 1) {
          tiles[z][x] = 'WALL';
        } else {
          tiles[z][x] = 'FLOOR';
        }
      }
    }

    return tiles;
  }

  populateRoom(room, dungeonType, difficulty) {
    const monsterTable = DUNGEON_MONSTER_TABLES[dungeonType];

    switch (room.type) {
      case 'NORMAL':
        // Spawn 2-4 monsters
        const monsterCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < monsterCount; i++) {
          const monsterType = this.pickMonsterType(monsterTable);
          room.monsters.push({
            type: monsterType,
            position: this.randomPositionInRoom(room)
          });
        }
        break;

      case 'TREASURE':
        // Spawn loot chest
        room.loot.push({
          type: 'CHEST',
          position: { x: room.spawnPoint.x, z: room.spawnPoint.z },
          lootTable: 'DUNGEON_TREASURE'
        });
        break;

      case 'BOSS':
        // Spawn boss
        const bossType = DUNGEON_BOSS_TABLE[dungeonType];
        room.monsters.push({
          type: bossType,
          position: room.spawnPoint,
          isBoss: true
        });
        break;
    }
  }

  randomDirection() {
    const directions = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  randomSpecialRoomType() {
    const types = ['TREASURE', 'MINIBOSS', 'TRAP'];
    return types[Math.floor(Math.random() * types.length)];
  }

  connectRooms(room1, room2, direction) {
    room1.doors.push({
      direction: direction,
      connectedRoom: room2.id,
      locked: false
    });

    const oppositeDirection = this.getOppositeDirection(direction);
    room2.doors.push({
      direction: oppositeDirection,
      connectedRoom: room1.id,
      locked: false
    });
  }

  getOppositeDirection(direction) {
    const opposites = {
      'NORTH': 'SOUTH',
      'SOUTH': 'NORTH',
      'EAST': 'WEST',
      'WEST': 'EAST'
    };
    return opposites[direction];
  }
}
```

### 4C: Dungeon Mechanics (Days 13-17)

#### Room Transitions

```javascript
// Check for door collision
function checkDoorCollision(player, room) {
  room.doors.forEach(door => {
    const doorPosition = getDoorPosition(room, door.direction);
    const dist = distance(player.position, doorPosition);

    if (dist < 2) {
      // Show interaction prompt
      showPrompt(`Press E to enter`, doorPosition);

      if (input.keyPressed('E')) {
        if (door.locked) {
          showMessage('Door is locked. Find the key!');
        } else {
          useDungeonStore.getState().moveToRoom(door.connectedRoom);
        }
      }
    }
  });
}
```

#### Boss Fight

```javascript
// src/entities/BossMonster.js
export class BossMonster extends Monster {
  constructor(type, position) {
    super(type, position);
    this.isBoss = true;
    this.phases = BOSS_DEFINITIONS[type].phases;
    this.currentPhase = 0;
    this.abilities = BOSS_DEFINITIONS[type].abilities;
    this.lastAbilityTime = {};
  }

  update(deltaTime, gameState) {
    // Check phase transitions
    const healthPercent = this.health / this.maxHealth;
    const nextPhase = this.phases.findIndex(p => healthPercent <= p.healthThreshold && p.index > this.currentPhase);

    if (nextPhase !== -1) {
      this.enterPhase(nextPhase);
    }

    // Use abilities
    const phase = this.phases[this.currentPhase];
    phase.abilities.forEach(abilityName => {
      const ability = this.abilities[abilityName];
      const timeSinceUse = Date.now() - (this.lastAbilityTime[abilityName] || 0);

      if (timeSinceUse >= ability.cooldown * 1000) {
        this.useAbility(abilityName, gameState);
        this.lastAbilityTime[abilityName] = Date.now();
      }
    });

    // Regular AI
    super.update(deltaTime, gameState);
  }

  enterPhase(phaseIndex) {
    this.currentPhase = phaseIndex;
    const phase = this.phases[phaseIndex];

    // Show phase transition
    showBossPhaseTransition(this.name, phaseIndex + 1);

    // Apply phase modifiers
    if (phase.speedMultiplier) {
      this.moveSpeed *= phase.speedMultiplier;
    }
    if (phase.damageMultiplier) {
      this.damage *= phase.damageMultiplier;
    }
  }

  useAbility(abilityName, gameState) {
    const ability = this.abilities[abilityName];

    switch (abilityName) {
      case 'SUMMON_ADDS':
        for (let i = 0; i < ability.count; i++) {
          const position = this.randomNearbyPosition(5);
          useMonsterStore.getState().spawnMonster(ability.summonType, position);
        }
        showMessage(`${this.name} summons reinforcements!`);
        break;

      case 'GROUND_SLAM':
        const player = gameState.player;
        const dist = distance(this.position, player.position);
        if (dist <= ability.radius) {
          player.takeDamage(ability.damage);
          player.applyStatusEffect('STUN', ability.stunDuration);
          spawnAOEEffect(this.position, ability.radius, 'ground-slam');
        }
        break;

      case 'CLEAVE':
        // Arc attack in front of boss
        const targets = getEntitiesInArc(
          this.position,
          this.facingAngle,
          ability.arc,
          ability.range
        );
        targets.forEach(target => {
          target.takeDamage(ability.damage);
        });
        break;
    }
  }
}
```

### 4D: Dungeon Rewards (Days 18-21)

#### Completion

```javascript
completeDungeon() {
  const dungeon = get().currentDungeon;
  const timeTaken = (Date.now() - get().startTime) / 1000; // seconds

  // Calculate rewards
  const baseRewards = dungeon.completionRewards;

  // Time bonus
  const timeBonus = timeTaken < 600 ? 1.5 : // < 10 min
                    timeTaken < 1200 ? 1.2 : // < 20 min
                    1.0;

  // No-death bonus
  const deathCount = useGameStore.getState().dungeonDeaths || 0;
  const deathlessBonus = deathCount === 0 ? 1.5 : 1.0;

  // First clear bonus
  const isFirstClear = dungeon.completionCount === 0;

  const rewards = {
    xp: Math.floor(baseRewards.xp * timeBonus * deathlessBonus),
    gold: Math.floor(baseRewards.gold * timeBonus),
    items: []
  };

  // Roll loot
  const lootSystem = new LootSystem();
  rewards.items = lootSystem.rollLoot(baseRewards.lootTable);

  // First clear rewards
  if (isFirstClear && dungeon.firstClearReward) {
    rewards.xp += dungeon.firstClearReward.xp;
    rewards.gold += dungeon.firstClearReward.gold;
    rewards.items.push(...dungeon.firstClearReward.items);
  }

  // Show completion screen
  showDungeonCompletionScreen({
    dungeonName: dungeon.name,
    timeTaken: formatTime(timeTaken),
    timeBonus: timeBonus,
    deathlessBonus: deathlessBonus,
    isFirstClear: isFirstClear,
    rewards: rewards
  });

  // Grant rewards
  useGameStore.getState().addXP(rewards.xp);
  useGameStore.getState().addGold(rewards.gold);
  rewards.items.forEach(item => useGameStore.getState().addItem(item));

  // Exit dungeon
  setTimeout(() => {
    get().exitDungeon();
  }, 5000);
}
```

#### Completion UI

```jsx
const DungeonCompletionScreen = ({ data }) => {
  return (
    <div className="dungeon-completion-overlay">
      <div className="completion-panel">
        <h1>Dungeon Complete!</h1>
        <h2>{data.dungeonName}</h2>

        <div className="completion-stats">
          <div className="stat">
            <span>Time:</span>
            <span>{data.timeTaken}</span>
          </div>
          {data.timeBonus > 1 && (
            <div className="bonus">Time Bonus: +{Math.floor((data.timeBonus - 1) * 100)}%</div>
          )}
          {data.deathlessBonus > 1 && (
            <div className="bonus">Deathless Bonus: +{Math.floor((data.deathlessBonus - 1) * 100)}%</div>
          )}
          {data.isFirstClear && (
            <div className="first-clear">⭐ FIRST CLEAR ⭐</div>
          )}
        </div>

        <div className="rewards">
          <h3>Rewards</h3>
          <div className="reward-item">
            <span>XP:</span>
            <span className="value">+{data.rewards.xp}</span>
          </div>
          <div className="reward-item">
            <span>Gold:</span>
            <span className="value">+{data.rewards.gold}</span>
          </div>

          <div className="item-rewards">
            {data.rewards.items.map((item, i) => (
              <div key={i} className="item-reward">
                <ItemIcon item={item} />
                <span style={{ color: RARITY_CONFIG[item.rarity].color }}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button className="continue-btn" onClick={() => exitDungeon()}>
          Return to Settlement
        </button>
      </div>
    </div>
  );
};
```

---

## Integration Points

### Monster ↔ Settlement

**Defense Events**
```javascript
// Monsters can attack settlement
function triggerRaidEvent() {
  const raidConfig = {
    waveCount: 3,
    monstersPerWave: 10,
    monsterTypes: ['GOBLIN', 'ORC'],
    targetBuilding: 'TOWN_HALL'
  };

  // Spawn monsters near settlement
  spawnRaidWave(raidConfig);

  // NPCs fight back
  const guards = getNPCsByRole('GUARD');
  guards.forEach(guard => {
    guard.enterCombatMode();
  });
}
```

**Settlement Guards**
```javascript
// Guards auto-attack nearby monsters
update() {
  if (this.role === 'GUARD') {
    const nearbyMonsters = spatialPartition.getEntitiesNear(this.position, 15);

    if (nearbyMonsters.length > 0) {
      this.targetMonster = nearbyMonsters[0];
      this.aiState = 'COMBAT';
    }
  }
}
```

### Loot ↔ Settlement

**Crafting Materials**
```javascript
// Monster drops used in settlement crafting
{
  "SLIME_GEL": {
    "type": "MATERIAL",
    "name": "Slime Gel",
    "usedIn": ["STICKY_TRAP", "ADHESIVE_POTION"],
    "sellValue": 5
  }
}
```

**Settlement Storage**
```javascript
// Can store loot in settlement warehouse
transferToSettlement(items) {
  const warehouse = getBuilding('WAREHOUSE');
  warehouse.storage.items.push(...items);
}
```

### Quests ↔ Everything

**Monster Bounties**
```javascript
{
  "title": "Goblin Bounty",
  "objectives": [
    { "type": "KILL", "targetType": "GOBLIN", "targetCount": 10 }
  ]
}
```

**Dungeon Quests**
```javascript
{
  "title": "Clear the Slime Cave",
  "objectives": [
    { "type": "COMPLETE_DUNGEON", "dungeonId": "SLIME_CAVE" }
  ]
}
```

**Settlement Quests**
```javascript
{
  "title": "Expand the Town",
  "objectives": [
    { "type": "BUILD", "buildingType": "HOUSE", "targetCount": 5 },
    { "type": "REACH_POPULATION", "targetCount": 20 }
  ]
}
```

### Dungeons ↔ NPCs

**Expedition System**
```javascript
// Send NPCs on dungeon runs (reuse ExpeditionManager!)
sendExpedition(dungeonId, npcIds) {
  const expedition = {
    dungeonId: dungeonId,
    npcs: npcIds.map(id => getNPC(id)),
    startTime: Date.now(),
    duration: 3600 // 1 hour
  };

  // NPCs return with loot
  setTimeout(() => {
    const loot = simulateDungeonRun(expedition);
    expedition.npcs.forEach(npc => npc.state = 'IDLE');
    addLootToSettlement(loot);
    showNotification(`Expedition returned with ${loot.items.length} items!`);
  }, expedition.duration * 1000);
}
```

---

## Technical Considerations

### Performance Optimization

#### Spatial Partitioning
```javascript
// Only update entities near player
const ACTIVE_RADIUS = 100; // tiles
const nearbyEntities = spatialGrid.getEntitiesNear(player.position, ACTIVE_RADIUS);

// Update only nearby monsters
nearbyEntities.forEach(entity => {
  if (entity.type === 'MONSTER') {
    monsterAI.update(entity, deltaTime);
  }
});
```

#### Object Pooling
```javascript
// Reuse objects instead of creating new ones
const damageNumberPool = new ObjectPool(() => ({
  value: 0,
  position: { x: 0, z: 0 },
  lifetime: 0,
  active: false
}), 50);

function showDamageNumber(position, damage) {
  const dmgNum = damageNumberPool.acquire();
  dmgNum.value = damage;
  dmgNum.position = { ...position };
  dmgNum.lifetime = 1.0;
  dmgNum.active = true;
}
```

#### Render Culling
```javascript
// Don't render entities outside viewport
const viewport = {
  x: camera.x - screenWidth / 2,
  y: camera.y - screenHeight / 2,
  width: screenWidth,
  height: screenHeight
};

monsters.forEach(monster => {
  if (isInViewport(monster.position, viewport)) {
    monsterRenderer.render(ctx, monster);
  }
});
```

### Save System

#### Dungeon State
```javascript
// Save dungeon progress
saveDungeonState() {
  return {
    dungeonId: currentDungeon.id,
    currentRoom: currentRoom.id,
    visitedRooms: visitedRooms,
    clearedRooms: clearedRooms,
    defeatedMonsters: defeatedMonsters,
    openedChests: openedChests,
    startTime: startTime
  };
}

// Restore on load
loadDungeonState(savedState) {
  const dungeon = generateDungeon(savedState.dungeonId);

  // Restore progress
  savedState.visitedRooms.forEach(roomId => {
    const room = dungeon.rooms.find(r => r.id === roomId);
    room.visited = true;
  });

  savedState.defeatedMonsters.forEach(monsterId => {
    // Don't respawn defeated monsters
  });
}
```

#### Quest Progress
```javascript
// Save quest state
saveQuestState() {
  return {
    activeQuests: activeQuests.map(q => ({
      id: q.id,
      objectives: q.objectives.map(obj => ({
        id: obj.id,
        currentCount: obj.currentCount,
        completed: obj.completed
      }))
    })),
    completedQuests: completedQuests
  };
}
```

### Balance Testing

#### Debug Commands
```javascript
// Monster spawning
window.debug = {
  spawnMonster: (type, count = 1) => {
    for (let i = 0; i < count; i++) {
      const pos = player.position;
      useMonsterStore.getState().spawnMonster(type, {
        x: pos.x + randomInt(-10, 10),
        z: pos.z + randomInt(-10, 10)
      });
    }
  },

  // Loot testing
  giveLoot: (itemType, level, rarity) => {
    const item = generateItem(itemType, level, rarity);
    useGameStore.getState().addItem(item);
  },

  // Quest testing
  completeQuest: (questId) => {
    const quest = useQuestStore.getState().activeQuests.find(q => q.id === questId);
    quest.objectives.forEach(obj => obj.completed = true);
    useQuestStore.getState().completeQuest(questId);
  },

  // Teleport to dungeon
  enterDungeon: (dungeonId) => {
    useDungeonStore.getState().enterDungeon(dungeonId);
  },

  // God mode
  toggleGodMode: () => {
    window.godMode = !window.godMode;
    if (window.godMode) {
      player.takeDamage = () => {}; // No damage
    }
  },

  // Level up
  levelUp: (levels = 1) => {
    for (let i = 0; i < levels; i++) {
      player.xp = player.xpToNextLevel;
      player.checkLevelUp();
    }
  }
};
```

#### Combat Statistics
```javascript
// Track combat stats for balancing
const combatStats = {
  damageDealt: 0,
  damageTaken: 0,
  monstersKilled: {},
  deaths: 0,
  averageCombatDuration: 0,
  dps: 0
};

// Log to console every 60 seconds
setInterval(() => {
  console.log('Combat Stats:', combatStats);
}, 60000);
```

#### Test Arena
```javascript
// Create test area with all monsters
function createTestArena() {
  const arenaCenter = { x: 1000, z: 1000 };
  const monsterTypes = ['SLIME', 'GOBLIN', 'WOLF', 'SKELETON', 'ORC'];

  monsterTypes.forEach((type, i) => {
    const angle = (i / monsterTypes.length) * Math.PI * 2;
    const pos = {
      x: arenaCenter.x + Math.cos(angle) * 20,
      z: arenaCenter.z + Math.sin(angle) * 20
    };

    debug.spawnMonster(type, 1, pos);
  });

  player.position = arenaCenter;
}
```

---

## Quality of Life Features

### Auto-Loot Materials

```javascript
// Auto-pickup common materials
const AUTO_LOOT_MATERIALS = true;

function spawnLootDrop(position, item) {
  if (AUTO_LOOT_MATERIALS && item.type === 'MATERIAL' && item.rarity === 'COMMON') {
    // Directly add to inventory
    useGameStore.getState().addItem(item);
    showPickupNotification(item);
  } else {
    // Create physical loot drop
    const lootDrop = {
      id: crypto.randomUUID(),
      position: position,
      item: item,
      spawnTime: Date.now()
    };
    useGameStore.getState().addLootDrop(lootDrop);
  }
}
```

### Damage Numbers

```javascript
// src/rendering/DamageNumberRenderer.js
export class DamageNumberRenderer {
  constructor() {
    this.damageNumbers = [];
  }

  spawn(position, damage, type = 'normal') {
    this.damageNumbers.push({
      position: { ...position, y: 2 },
      damage: damage,
      type: type,
      lifetime: 1.0,
      velocity: { x: 0, y: 2 }
    });
  }

  update(deltaTime) {
    this.damageNumbers = this.damageNumbers.filter(dmg => {
      dmg.lifetime -= deltaTime;
      dmg.position.y += dmg.velocity.y * deltaTime;
      return dmg.lifetime > 0;
    });
  }

  render(ctx, viewport) {
    this.damageNumbers.forEach(dmg => {
      const screenPos = worldToScreen(dmg.position, viewport);
      const alpha = dmg.lifetime;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';

      // Color by type
      const colors = {
        normal: '#ffffff',
        crit: '#ffff00',
        heal: '#00ff00',
        poison: '#00ff00',
        fire: '#ff6600'
      };
      ctx.fillStyle = colors[dmg.type] || '#ffffff';

      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(Math.floor(dmg.damage), screenPos.x, screenPos.y);
      ctx.fillText(Math.floor(dmg.damage), screenPos.x, screenPos.y);

      ctx.restore();
    });
  }
}
```

### Loot Comparison

```javascript
// Show comparison on hover
function showItemTooltip(item, mousePosition) {
  const equippedItem = useGameStore.getState().equipment[item.type.toLowerCase()];

  const tooltip = (
    <ItemTooltip
      item={item}
      equippedItem={equippedItem}
      showComparison={true}
      position={mousePosition}
    />
  );

  renderTooltip(tooltip);
}

// Color code stat differences
function renderStatComparison(newValue, oldValue) {
  const diff = newValue - oldValue;
  const color = diff > 0 ? '#00ff00' : diff < 0 ? '#ff0000' : '#ffffff';

  return (
    <span style={{ color: color }}>
      {newValue} ({diff > 0 ? '+' : ''}{diff})
    </span>
  );
}
```

### Smart Notifications

```javascript
// Group similar notifications
const notificationManager = {
  notifications: [],
  groupWindow: 2000, // 2 seconds

  add(message, type) {
    const now = Date.now();

    // Check for similar recent notification
    const existing = this.notifications.find(n =>
      n.message === message &&
      now - n.timestamp < this.groupWindow
    );

    if (existing) {
      existing.count++;
      existing.timestamp = now;
    } else {
      this.notifications.push({
        message: message,
        type: type,
        timestamp: now,
        count: 1
      });
    }
  },

  render() {
    return this.notifications.map(n => (
      <Notification key={n.timestamp}>
        {n.message} {n.count > 1 && `(×${n.count})`}
      </Notification>
    ));
  }
};

// Example: "Picked up Slime Gel (×3)" instead of 3 separate notifications
```

### Minimap

```javascript
// src/rendering/MinimapRenderer.js
export class MinimapRenderer {
  render(ctx, viewport, entities) {
    const minimapSize = 150;
    const minimapX = ctx.canvas.width - minimapSize - 10;
    const minimapY = 10;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

    // Scale
    const scale = minimapSize / 200; // 200 tiles visible
    const centerX = minimapX + minimapSize / 2;
    const centerY = minimapY + minimapSize / 2;

    // Render monsters
    entities.monsters.forEach(monster => {
      const relX = (monster.position.x - viewport.centerX) * scale;
      const relY = (monster.position.z - viewport.centerZ) * scale;

      ctx.fillStyle = '#ff0000';
      ctx.fillRect(centerX + relX - 1, centerY + relY - 1, 2, 2);
    });

    // Render NPCs
    entities.npcs.forEach(npc => {
      const relX = (npc.position.x - viewport.centerX) * scale;
      const relY = (npc.position.z - viewport.centerZ) * scale;

      ctx.fillStyle = '#00ff00';
      ctx.fillRect(centerX + relX - 1, centerY + relY - 1, 2, 2);
    });

    // Render player
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
  }
}
```

---

## Success Metrics

### Phase 1: Monster System
- ✅ Can spawn 50+ monsters at 60 FPS
- ✅ AI responds correctly (idle → chase → attack → flee)
- ✅ Monsters drop loot and grant XP
- ✅ Different monster types have distinct behaviors
- ✅ Spawn zones populate and respawn correctly

### Phase 2: Loot System
- ✅ Items generate with appropriate stats for level
- ✅ Rarity system works (correct drop rates)
- ✅ Equipment applies stats to player
- ✅ Inventory management feels smooth (sort, filter, equip)
- ✅ Loot comparison shows useful information

### Phase 3: Quest System
- ✅ Quest completion rate > 80%
- ✅ Objectives track correctly (kills, collection, building)
- ✅ Quest progression unlocks new quests
- ✅ Quest UI is intuitive
- ✅ Rewards feel meaningful

### Phase 4: Dungeon System
- ✅ Dungeon runs take 10-20 minutes
- ✅ Procedural generation creates interesting layouts
- ✅ Boss fights are challenging but fair
- ✅ Rewards justify the effort
- ✅ Players want to replay dungeons

---

## Quick Wins

### Week 1: Basic Monster
**Goal:** Get a single slime enemy working end-to-end

**Tasks:**
1. Create Monster entity (Day 1)
2. Add MonsterRenderer (Day 1)
3. Spawn monster via debug command (Day 1)
4. Implement IDLE and CHASE states (Day 2)
5. Add attack logic (Day 2)
6. Monster drops gold on death (Day 3)

**Success:** Can spawn slime, it chases player, attacks, and drops loot when killed.

### Week 2: Basic Weapon
**Goal:** Single equipment slot with stat bonuses

**Tasks:**
1. Create Item entity (Day 1)
2. Add weapon slot to player (Day 1)
3. Monster drops weapon on death (Day 2)
4. Pickup weapon from ground (Day 2)
5. Equip weapon from inventory (Day 3)
6. Weapon adds damage stat (Day 3)

**Success:** Equipping weapon increases damage, visible in combat.

### Week 3: Simple Quest
**Goal:** One kill quest from start to finish

**Tasks:**
1. Create Quest entity (Day 1)
2. Add quest store (Day 1-2)
3. Track monster kills (Day 2)
4. Create quest UI (Day 3)
5. Grant rewards on completion (Day 3)

**Success:** Can accept quest, kill monsters, track progress, and complete quest.

---

## Development Checklist

### Phase 1: Monsters
- [ ] Monster entity and store
- [ ] Monster renderer (reuse NPC renderer pattern)
- [ ] Basic AI (IDLE, CHASE, ATTACK)
- [ ] Advanced AI (PATROL, FLEE)
- [ ] 5 monster types implemented
- [ ] Monster modifiers system
- [ ] Spawn zones and spawn manager
- [ ] Spatial partitioning optimization
- [ ] Object pooling for projectiles
- [ ] Performance target: 60 FPS with 50+ monsters

### Phase 2: Loot
- [ ] Item entity
- [ ] Basic equipment (weapon slot only)
- [ ] Rarity system (5 tiers)
- [ ] Procedural item generation
- [ ] Item properties system
- [ ] Loot tables
- [ ] All equipment slots (9 slots)
- [ ] Item templates (10+ base items)
- [ ] Inventory UI
- [ ] Item comparison tooltips

### Phase 3: Quests
- [ ] Quest entity and store
- [ ] Quest manager
- [ ] Basic kill quest
- [ ] Collection quest
- [ ] Exploration quest
- [ ] Building quest
- [ ] Quest definitions (10+ quests)
- [ ] Quest chains (prerequisites)
- [ ] Quest journal UI
- [ ] Quest tracker HUD

### Phase 4: Dungeons
- [ ] Dungeon entity and store
- [ ] Room entity
- [ ] Dungeon generator
- [ ] Room population
- [ ] Room transitions
- [ ] Boss monster class
- [ ] Boss abilities
- [ ] Dungeon completion
- [ ] Dungeon rewards
- [ ] Completion UI

### Integration
- [ ] Monsters attack settlement (defense events)
- [ ] Settlement guards fight monsters
- [ ] Monster drops used in settlement
- [ ] Quests integrate with all systems
- [ ] NPCs can go on dungeon expeditions

### Quality of Life
- [ ] Auto-loot materials
- [ ] Damage numbers
- [ ] Loot comparison
- [ ] Smart notifications
- [ ] Minimap
- [ ] Debug commands
- [ ] Combat statistics
- [ ] Test arena

---

## References

**Existing Systems to Reuse:**
- [NPCRenderer](../../src/rendering/NPCRenderer.js) - Pattern for MonsterRenderer
- [NPCPathfinding](../../src/systems/NPCPathfinding.js) - A* pathfinding for monster AI
- [GridManager](../../src/modules/foundation/GridManager.js) - Grid-based positioning
- [SpatialPartitioning](../../src/modules/foundation/SpatialPartitioning.js) - Performance optimization
- [EventSystem](../../src/systems/EventSystem.js) - Event-driven updates
- [ExpeditionManager](../../src/modules/hybrid/ExpeditionManager.js) - Dungeon expeditions

**Documentation:**
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md) - Development patterns
- [CURRENT_STATUS.md](../../CURRENT_STATUS.md) - Project status

---

**Document Created:** 2025-11-18
**Version:** 1.0
**Next Review:** After Phase 1 completion
