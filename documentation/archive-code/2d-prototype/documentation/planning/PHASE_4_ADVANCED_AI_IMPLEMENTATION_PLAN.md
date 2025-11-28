# Phase 4: Advanced AI & Behavior Systems - Implementation Plan

**Last Updated:** 2025-11-25
**Author:** Claude (AI Assistant)
**Status:** Active - In Progress
**Purpose:** Comprehensive implementation plan for Advanced AI & Behavior Systems building on Phase 3 completion

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Existing Systems Analysis](#existing-systems-analysis)
3. [Overview & Goals](#overview--goals)
4. [Core AI Systems Architecture](#core-ai-systems-architecture)
5. [Specialized AI Systems](#specialized-ai-systems)
6. [AI Integration Layers](#ai-integration-layers)
7. [Implementation Plan](#implementation-plan)
8. [Technical Specifications](#technical-specifications)
9. [UI Components](#ui-components)
10. [Benefits & Gameplay Impact](#benefits--gameplay-impact)
11. [Risks & Mitigation](#risks--mitigation)
12. [Success Metrics](#success-metrics)
13. [Future Enhancements](#future-enhancements)
14. [References](#references)

---

## Executive Summary

This document outlines a comprehensive plan to implement **Advanced AI & Behavior Systems** for the 2D voxel RPG game. Building on the completed Phase 3 systems (crafting, weather effects, seasonal events, and structure exploration), this proposal adds intelligent, dynamic AI behaviors that create emergent gameplay experiences.

**Key Metrics:**
- **Estimated Scope:** 7 major AI systems + 2 integration layers
- **Test Coverage Goal:** 90%+ with 400+ comprehensive unit tests
- **Estimated Code:** 8,000-10,000 lines
- **Integration:** Deep integration with all Phase 3 systems

---

## Existing Systems Analysis

### What Already Exists

The following AI-related systems are already implemented and will be **enhanced** rather than replaced:

#### Phase 3A: NPC System (Complete)
**Location:** `src/modules/npc-system/`

| Component | Status | Purpose |
|-----------|--------|---------|
| `AutonomousDecision.js` | ✅ Complete | Priority-based decision making with emergency/critical/low thresholds |
| `NPCNeedsTracker.js` | ✅ Complete | Tracks 4 needs: FOOD, REST, SOCIAL, SHELTER |
| `IdleTaskManager.js` | ✅ Complete | Assigns idle tasks: WANDER, SOCIALIZE, REST, INSPECT |
| `NPCManager.js` | ✅ Complete | Core NPC lifecycle management |
| `PathfindingService.js` | ✅ Complete | Basic NPC pathfinding |

#### Monster AI System
**Location:** `src/systems/MonsterAI.js`

| Feature | Status | Notes |
|---------|--------|-------|
| State Machine | ✅ Complete | IDLE, CHASE, ATTACK, FLEE, DEATH, PATROL |
| Spatial Grid | ✅ Complete | Efficient proximity queries via `SpatialGrid.js` |
| Aggro System | ✅ Complete | Range-based detection and de-aggro |
| Patrol Behavior | ✅ Complete | Waypoint following with pauses |

#### Dungeon System (Phase 4B - Recent)
**Location:** `src/entities/`

| Component | Status | Purpose |
|-----------|--------|---------|
| `DungeonRoom.js` | ✅ Complete | Room entities with connections, enemies, loot |
| `DungeonLayout.js` | ✅ Complete | Room collection with BFS pathfinding |
| `ProceduralDungeonGenerator.js` | ✅ Complete | Procedural dungeon generation |

### What Needs to Be Built

The following systems are **new** and will be implemented:

1. **BehaviorTree.js** - Generic behavior tree architecture (new)
2. **PerceptionSystem.js** - Vision, hearing, memory (new)
3. **NPCBehaviorSystem.js** - Enhanced NPC behaviors building on existing NPC system
4. **EnemyAISystem.js** - Enhanced enemy AI with group tactics
5. **EconomicAISystem.js** - Supply/demand, trading, merchants (new)
6. **WildlifeAISystem.js** - Animal behaviors, herding (new)
7. **CompanionAISystem.js** - Player companions (new)
8. **QuestAISystem.js** - Dynamic quest generation (new)

### Coordinate System Note

This is a **2D top-down game**. All positions use `{x, z}` coordinates where:
- `x` = horizontal position
- `z` = vertical position (not y, for consistency with the codebase)

---

## Overview & Goals

### Primary Objectives

🎯 **Create Dynamic NPCs** - Intelligent characters with daily routines, needs, and personalities
🎯 **Implement Enemy AI** - Advanced combat behaviors, tactics, and faction dynamics
🎯 **Build Economic Systems** - Supply/demand, trading, pricing, and merchant behaviors
🎯 **Enable Emergent Gameplay** - AI-driven events, conflicts, and narrative moments

### Integration with Existing Systems

The Advanced AI systems will integrate deeply with Phase 3 systems (see [Current Status](../../CURRENT_STATUS.md)):

- **Seasonal Events** → NPC behavior changes (festivals, preparation, reactions)
- **Weather Effects** → AI adapts to weather (seeking shelter, indoor activities)
- **Structure Exploration** → NPCs inhabit structures, enemies guard dungeons
- **Crafting System** → NPCs craft items, request materials, trade goods

---

## Core AI Systems Architecture

### 2.1 NPC Behavior System

**File:** `src/modules/ai/NPCBehaviorSystem.js`

#### Features

✅ **Behavior Tree Architecture** - Hierarchical decision-making (Selector, Sequence, Leaf nodes)
✅ **Need-Based AI** - Hunger, fatigue, social needs, safety, comfort
✅ **Daily Schedules** - Time-based activities (work, eat, sleep, socialize)
✅ **Personality Traits** - Brave/Cowardly, Friendly/Hostile, Hardworking/Lazy
✅ **Memory System** - Remember player interactions, locations, events
✅ **Social Relationships** - Friendships, rivalries, family ties

#### Core API

```javascript
export class NPCBehaviorSystem {
  // Behavior tree evaluation
  evaluateBehavior(npc, gameState);

  // Need management
  updateNeeds(npc, deltaTime);
  findNeedSatisfaction(npc, need);

  // Schedule management
  updateSchedule(npc, currentTime);
  transitionActivity(npc, newActivity);

  // Social interactions
  updateRelationships(npc, otherNPCs);
  processConversation(npc, target);

  // Memory and learning
  recordEvent(npc, event);
  recallMemory(npc, eventType);
}
```

#### Behavior Types

- **Work Behaviors** - Farming, crafting, guarding, trading
- **Survival Behaviors** - Eating, sleeping, seeking shelter
- **Social Behaviors** - Conversation, helping, avoiding
- **Recreation Behaviors** - Relaxing, exploring, celebrating

#### Phase 3 Integration Points

- **Weather:** NPCs seek shelter in rain/snow, wear appropriate clothing
- **Seasons:** Activity adjustments (farming in spring, preparing for winter)
- **Events:** Participate in festivals, react to seasonal events
- **Structures:** Navigate buildings, claim homes, work locations

**Test Coverage:** 80+ tests covering behavior tree logic, need systems, scheduling, social dynamics

---

### 2.2 Enemy AI System

**File:** `src/modules/ai/EnemyAISystem.js`

#### Features

✅ **Combat Behaviors** - Aggressive, Defensive, Tactical, Ambush
✅ **Group Tactics** - Formations, flanking, coordinated attacks
✅ **Threat Assessment** - Evaluate danger, choose targets intelligently
✅ **Patrol & Territory** - Guard zones, chase intruders, return to post
✅ **Dynamic Difficulty** - Adapt to player skill level
✅ **Faction System** - Alliances, hostilities, neutral zones

#### Core API

```javascript
export class EnemyAISystem {
  // Combat decision-making
  selectBehavior(enemy, context);
  evaluateThreat(enemy, targets);
  chooseTarget(enemy, visibleTargets);

  // Movement & positioning
  calculateMovement(enemy, target);
  findCover(enemy, position);
  maintainFormation(enemy, allies);

  // Group coordination
  updateGroupTactics(enemies, target);
  coordinateAttack(leader, followers);
  callForHelp(enemy, allies);

  // State management
  updateAggroState(enemy, player);
  transitionCombatState(enemy, newState);
}
```

#### Behavior Profiles

- **Melee Aggressor** - Charge, surround, tank damage
- **Ranged Attacker** - Kite, maintain distance, snipe
- **Support Enemy** - Heal allies, buff, debuff player
- **Boss AI** - Multi-phase fights, special abilities, minion summoning

#### Faction Relations

```javascript
export const FACTION_RELATIONS = {
  player: { bandits: 'hostile', villagers: 'friendly', wildlife: 'neutral' },
  bandits: { player: 'hostile', villagers: 'hostile', wildlife: 'neutral' },
  villagers: { player: 'friendly', bandits: 'hostile', wildlife: 'neutral' },
};
```

#### Phase 3 Integration Points

- **Structures:** Guard temples, dungeons, ruins (tie into StructureInteractionSystem)
- **Weather:** Reduced aggro range in fog, seek cover in storms
- **Seasons:** Different enemy spawns per season
- **Events:** React to seasonal events (aggressive during winter, cautious during festivals)

**Test Coverage:** 70+ tests for combat logic, pathfinding, threat assessment, group tactics

---

### 2.3 Economic AI System

**File:** `src/modules/economy/EconomicAISystem.js`

#### Features

✅ **Supply & Demand** - Dynamic pricing based on availability
✅ **Merchant Behaviors** - Buy low, sell high, stock management
✅ **Trade Routes** - NPCs travel between settlements
✅ **Production Chains** - Resource gathering → crafting → selling
✅ **Market Events** - Shortages, surpluses, price fluctuations
✅ **Bartering System** - Negotiation, haggling, reputation bonuses

#### Core API

```javascript
export class EconomicAISystem {
  // Price management
  calculatePrice(item, location, marketConditions);
  updateSupplyDemand(item, quantity, transaction);

  // Merchant behavior
  decidePurchase(merchant, item, price);
  decideInventory(merchant, marketData);
  negotiatePrice(merchant, player, item, initialPrice);

  // Trade routes
  planTradeRoute(merchant, settlements);
  executeTrade(merchant, sourceLocation, targetLocation);

  // Market simulation
  updateMarket(location, deltaTime);
  simulateEconomy(settlements);
}
```

#### Economic Features

- **Regional Markets** - Each settlement has unique supply/demand
- **Seasonal Prices** - Crops cheaper in harvest season (autumn)
- **Event Impact** - Droughts increase food prices, wars increase weapon prices
- **Reputation System** - Better prices for trusted players

#### Phase 3 Integration Points

- **Crafting:** NPCs use MaterialCraftingSystem to produce goods
- **Seasonal Events:** Prices fluctuate during festivals, harvest seasons
- **Structures:** Villages have markets, trade centers
- **Weather:** Bad weather increases food prices (reduced harvest)

**Test Coverage:** 60+ tests for pricing algorithms, market simulation, merchant logic

---

### 2.4 Pathfinding & Navigation System

**File:** `src/modules/ai/PathfindingSystem.js`

#### Features

✅ **A* Pathfinding** - Efficient shortest path calculation
✅ **Navigation Mesh** - Walkable areas, obstacles, terrain cost
✅ **Dynamic Obstacles** - Avoid other NPCs, structures, hazards
✅ **Formation Movement** - Groups maintain cohesion
✅ **Terrain Awareness** - Avoid water (unless amphibious), prefer roads

#### Core API

```javascript
export class PathfindingSystem {
  // Pathfinding
  findPath(start, goal, options);
  calculateHeuristic(node, goal);
  reconstructPath(cameFrom, current);

  // Navigation mesh
  buildNavMesh(terrainData);
  getWalkableNeighbors(position);
  calculateMovementCost(from, to);

  // Dynamic avoidance
  avoidDynamicObstacles(path, obstacles);
  smoothPath(path);
}
```

#### Phase 3 Integration Points

- **Structures:** Navigate around buildings, enter/exit structures
- **Water:** Avoid water bodies and rivers from WaterBodySystem/RiverSystem
- **Terrain:** Use TerrainSystem height data for pathfinding costs
- **Props:** Avoid large props (trees, rocks) from PropManager

**Test Coverage:** 50+ tests for pathfinding algorithms, edge cases, performance

---

## Specialized AI Systems

### 3.1 Wildlife AI System

**File:** `src/modules/ai/WildlifeAISystem.js`

#### Features

✅ **Natural Behaviors** - Foraging, grazing, hunting, fleeing
✅ **Herd Dynamics** - Flocking, following leaders
✅ **Predator/Prey** - Hunting mechanics, escape behaviors
✅ **Territorial** - Defend nesting areas, mark territory
✅ **Day/Night Cycles** - Nocturnal vs diurnal animals

#### Animal Types

- **Passive** - Deer, rabbits (flee from player)
- **Neutral** - Bears, boars (attack if provoked)
- **Aggressive** - Wolves, big cats (hunt player)
- **Herd Animals** - Sheep, cattle (group movement)

#### Phase 3 Integration

- **MicroBiomes:** Specific animals spawn in specific micro-biomes
- **Seasons:** Migration patterns, hibernation in winter
- **Weather:** Seek shelter during storms
- **Time:** Nocturnal animals active at night only

**Test Coverage:** 40+ tests for animal behaviors, herd dynamics

---

### 3.2 Companion AI System

**File:** `src/modules/ai/CompanionAISystem.js`

#### Features

✅ **Follow Behavior** - Stay near player, navigate obstacles
✅ **Combat Assistance** - Target player's enemies, use abilities
✅ **Utility Actions** - Gather resources, carry items, scout
✅ **Personality** - Unique behaviors per companion type
✅ **Command System** - Stay, follow, attack, defend, gather

#### Companion Types

- **Pet** - Dog, cat (moral support, find items)
- **Mercenary** - Fighter (combat focus)
- **Mage** - Caster (ranged support)
- **Mount** - Horse, wolf (fast travel, storage)

**Test Coverage:** 35+ tests for following logic, combat AI, commands

---

### 3.3 Quest AI System

**File:** `src/modules/ai/QuestAISystem.js`

#### Features

✅ **Dynamic Quest Generation** - Create quests based on game state
✅ **Quest Giver Behavior** - NPCs offer quests, track completion
✅ **Adaptive Objectives** - Quests change based on player actions
✅ **Reputation Impact** - Completing quests affects NPC relationships

#### Quest Types

- **Fetch Quests** - Gather items, deliver to NPC
- **Kill Quests** - Eliminate enemies, clear areas
- **Escort Quests** - Protect NPC to destination
- **Discovery Quests** - Explore structures (ties to StructureInteractionSystem)
- **Crafting Quests** - Create specific items (ties to MaterialCraftingSystem)

**Test Coverage:** 45+ tests for quest generation, state tracking, rewards

---

## AI Integration Layers

### 4.1 Perception System

**File:** `src/modules/ai/PerceptionSystem.js`

#### Features

✅ **Vision System** - Line of sight, view cones, fog of war
✅ **Hearing System** - Detect sounds (combat, movement, speech)
✅ **Memory** - Remember last known positions
✅ **Information Sharing** - NPCs warn allies of threats

#### Weather Integration

- **Fog:** Reduces vision range by 70%
- **Rain/Snow:** Reduces hearing range by 50%
- **Clear Weather:** Normal perception ranges

**Test Coverage:** 30+ tests for LOS calculations, perception ranges

---

### 4.2 Decision-Making Framework

**File:** `src/modules/ai/DecisionSystem.js`

#### Techniques

✅ **Utility-Based AI** - Score actions, choose best
✅ **Behavior Trees** - Hierarchical logic
✅ **State Machines** - Discrete states (idle, patrol, combat, flee)
✅ **Goal-Oriented Action Planning (GOAP)** - Plan action sequences

**Test Coverage:** 40+ tests for decision algorithms

---

## Implementation Plan

### Phase 4.1: Core AI Infrastructure

**Goals:** Core infrastructure for all AI systems

- [ ] Implement A* PathfindingSystem (enhancing existing PathfindingService)
- [ ] Create generic BehaviorTree architecture (Selector, Sequence, Decorator, Leaf nodes)
- [ ] Build PerceptionSystem for vision/hearing with weather integration
- [ ] Integrate with existing TerrainSystem and SpatialGrid

**Deliverables:**
- `src/modules/ai/PathfindingSystem.js` + tests
- `src/modules/ai/BehaviorTree.js` + tests
- `src/modules/ai/PerceptionSystem.js` + tests

---

### Phase 4.2: Enhanced NPC Behavior System

**Goals:** Living, believable NPCs building on existing Phase 3A NPC system

- [ ] Extend NPCBehaviorSystem with behavior tree integration
- [ ] Add personality traits and memory system
- [ ] Create daily activity scheduling with seasonal awareness
- [ ] Integrate with weather/seasonal systems

**Deliverables:**
- `src/modules/ai/NPCBehaviorSystem.js` + tests
- Enhanced NPC data structures with personality and memory
- Schedule definitions

---

### Phase 4.3: Enhanced Enemy AI System

**Goals:** Challenging, tactical enemy encounters building on MonsterAI

- [ ] Implement EnemyAISystem extending MonsterAI
- [ ] Add group tactics and formations
- [ ] Create faction system with relations
- [ ] Integrate with dungeon guarding (DungeonRoom)

**Deliverables:**
- `src/modules/ai/EnemyAISystem.js` + tests
- Faction configuration
- Combat behavior profiles

---

### Phase 4.4: Economic AI System

**Goals:** Dynamic economy with real supply/demand

- [ ] Implement EconomicAISystem with market simulation
- [ ] Build supply/demand pricing with seasonal effects
- [ ] Create merchant behaviors and trade routes
- [ ] Integrate with MaterialCraftingSystem

**Deliverables:**
- `src/modules/ai/EconomicAISystem.js` + tests
- Market data structures
- Merchant AI behaviors

---

### Phase 4.5: Specialized AI Systems

**Goals:** Wildlife, companions, and dynamic quests

- [ ] Implement WildlifeAISystem with predator/prey, herding
- [ ] Create CompanionAISystem with follow, combat, utility behaviors
- [ ] Build QuestAISystem with dynamic generation

**Deliverables:**
- `src/modules/ai/WildlifeAISystem.js` + tests
- `src/modules/ai/CompanionAISystem.js` + tests
- `src/modules/ai/QuestAISystem.js` + tests

---

### Phase 4.6: Integration & Testing

**Goals:** Full integration and comprehensive testing

- [ ] Integration testing across all AI systems
- [ ] Performance profiling and optimization
- [ ] Update documentation

**Deliverables:**
- Complete integration tests
- Performance optimizations
- Updated ARCHITECTURE.md and CURRENT_STATUS.md

---

**Total Estimated Tests:** 400+ comprehensive tests
**Total Lines of Code:** 8,000-10,000 lines

---

## Technical Specifications

### Performance Targets

| Metric | Target |
|--------|--------|
| **Pathfinding** | < 5ms per path (up to 100 tiles) |
| **AI Update Rate** | 30Hz active NPCs, 5Hz distant NPCs |
| **Memory per NPC** | < 100KB (behavior, memory, stats) |
| **Concurrent NPCs** | 100+ NPCs simultaneously @ 60 FPS |

### Integration Points with TerrainSystem

```javascript
// TerrainSystem integration
terrainSystem.getPathfindingSystem();
terrainSystem.getNPCBehaviorSystem();
terrainSystem.getEnemyAISystem();
terrainSystem.getEconomicAISystem();

// Event system callbacks
npcBehaviorSystem.on('onNPCAction', callback);
enemyAISystem.on('onCombatStateChange', callback);
economicAISystem.on('onPriceChange', callback);

// Effect multipliers from seasonal events
const gatheringSpeed = terrainSystem.getEventEffectMultiplier('resourceGathering');
const tradingBonus = terrainSystem.getEventEffectMultiplier('tradingBonus');
```

### Data Structures

**NPC Data:**
```javascript
{
  id: 'npc_001',
  type: 'villager',
  position: { x: 10, z: 20 },
  needs: { hunger: 70, fatigue: 30, social: 50 },
  personality: { bravery: 0.7, friendliness: 0.9, workEthic: 0.6 },
  relationships: { player: 50, npc_002: 80 },
  memory: [...events],
  schedule: [...activities],
  inventory: [...items],
}
```

**Enemy Data:**
```javascript
{
  id: 'enemy_001',
  type: 'bandit',
  faction: 'bandits',
  behavior: 'aggressive',
  targetPosition: { x: 15, z: 25 },
  aggroRange: 10,
  formation: 'surround',
  allies: ['enemy_002', 'enemy_003'],
}
```

**Market Data:**
```javascript
{
  location: 'village_center',
  prices: { wood: 10, iron: 50, food: 5 },
  supply: { wood: 100, iron: 20, food: 200 },
  demand: { wood: 0.8, iron: 1.5, food: 1.0 },
  priceHistory: [...],
}
```

---

## UI Components

### 7.1 NPC Interaction UI

**File:** `src/components/NPCInteractionUI.jsx`

- Dialogue system with choices
- Trading interface with dynamic pricing
- Quest acceptance/turn-in
- Relationship status display
- NPC mood indicator (needs-based)

### 7.2 Enemy AI Visualization (Debug)

**File:** `src/components/EnemyAIDebugPanel.jsx`

- Current behavior state display
- Target information
- Threat level meters
- Formation visualization
- Perception ranges (vision cones)

### 7.3 Economic Dashboard

**File:** `src/components/EconomicDashboard.jsx`

- Price charts over time (line graphs)
- Supply/demand indicators per item
- Trade route visualization (map overlay)
- Market events feed (notifications)

---

## Benefits & Gameplay Impact

### Player Experience

🎮 **Living World** - NPCs feel alive with routines and personalities
🎮 **Strategic Combat** - Enemies use tactics, require player strategy
🎮 **Dynamic Economy** - Prices fluctuate, trading opportunities emerge
🎮 **Emergent Stories** - Unique situations from AI interactions
🎮 **Companion Bonding** - Build relationships with AI allies

### Replayability

- Different NPC personalities each playthrough
- Dynamic faction conflicts
- Varied quest generation
- Economic market fluctuations
- Unpredictable AI decisions

### Integration with Phase 3

| Phase 3 System | AI Integration |
|----------------|----------------|
| **Weather** | NPCs adapt behaviors (shelter, clothing) |
| **Seasons** | Economic cycles, NPC schedules, animal migration |
| **Events** | NPCs participate in festivals, react to threats |
| **Structures** | NPCs inhabit villages, enemies guard dungeons |
| **Crafting** | NPCs craft and trade items, dynamic economy |

---

## Risks & Mitigation

### Performance Risks

⚠️ **Risk:** Too many NPCs cause frame drops
✅ **Mitigation:**
- LOD system (update distant NPCs less frequently)
- Spatial partitioning (only update nearby NPCs)
- Behavior pooling (reuse common behaviors)
- Progressive enhancement (add NPCs gradually)

### Complexity Risks

⚠️ **Risk:** AI behaviors become unpredictable or buggy
✅ **Mitigation:**
- Comprehensive unit testing (600+ tests)
- AI debug visualization tools
- State validation and safety checks
- Gradual rollout with testing at each phase

### Balance Risks

⚠️ **Risk:** AI too easy or too difficult
✅ **Mitigation:**
- Configurable difficulty settings
- Dynamic difficulty adjustment based on player performance
- Extensive playtesting
- Player feedback integration mechanisms

---

## Success Metrics

### Technical Metrics

✅ 90%+ test coverage across all AI systems
✅ < 5ms pathfinding calculations (100 tiles)
✅ Support 100+ concurrent NPCs at 60 FPS
✅ Zero critical AI bugs in production
✅ Memory usage < 100KB per NPC

### Gameplay Metrics

✅ NPCs feel "alive" and believable (player surveys)
✅ Combat AI provides fair challenge (balance testing)
✅ Economy creates meaningful trading opportunities
✅ Emergent gameplay moments occur regularly
✅ Player engagement metrics improve vs Phase 3

---

## Future Enhancements

### Post-Implementation Additions

🚀 **Machine Learning Integration** - Train AI on player behavior patterns
🚀 **Procedural Dialogue** - Generate unique conversations
🚀 **Emotion System** - NPCs express happiness, anger, fear visually
🚀 **Alliance System** - Players form factions with NPCs
🚀 **NPC Progression** - NPCs level up, learn skills over time
🚀 **Reputation Consequences** - World reacts to player choices

---

## References

### Related Documentation

- [Current Status](../../CURRENT_STATUS.md) - Project status and roadmap
- [Architecture](../../ARCHITECTURE.md) - System architecture overview
- [Development Guide](../../DEVELOPMENT_GUIDE.md) - Implementation patterns

### Phase 3 Systems (Prerequisites)

- Seasonal Event System (`src/modules/events/SeasonalEventSystem.js`)
- Structure Interaction System (`src/modules/structures/StructureInteractionSystem.js`)
- Material Crafting System (`src/modules/crafting/MaterialCraftingSystem.js`)
- Weather Gameplay Effects (`src/modules/environment/WeatherGameplayEffects.js`)

### External Resources

- [Behavior Trees in Game AI](https://www.gamedeveloper.com/programming/behavior-trees-for-ai-how-they-work)
- [A* Pathfinding Algorithm](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Utility-Based AI](https://www.gdcvault.com/play/1012410/Improving-AI-Decision-Modeling-Through)

---

**Document Created:** 2025-11-24
**Version:** 1.1 (Updated 2025-11-25 with existing systems analysis)
**Branch:** `claude/implement-advanced-ai-game-011PGq4kArUGh6UJpXRTEtME`
**Review Status:** Active - Implementation in Progress
