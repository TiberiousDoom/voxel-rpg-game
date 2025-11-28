# Development Guide

**Last Updated:** November 15, 2025
**Purpose:** Consolidated guide for developers working on the Voxel RPG Game

This document consolidates formulas, implementation patterns, architecture decisions, and balance guidelines.

---

## Table of Contents

1. [Game Formulas & Calculations](#game-formulas--calculations)
2. [Architecture Decisions](#architecture-decisions)
3. [Implementation Patterns](#implementation-patterns)
4. [Economy Balance](#economy-balance)
5. [Testing Guidelines](#testing-guidelines)

---

## Game Formulas & Calculations

### Production Tick System

Every 5 seconds, the production system executes:

```pseudocode
FUNCTION productionTick():
  FOR EACH building IN world.buildings:
    IF building.type IN PRODUCTION_BUILDINGS:
      // Step 1: Get base production from building config
      baseRate = BUILDING_CONFIG[building.type].productionRate

      // Step 2: Calculate multipliers (capped at 2.0x hard ceiling)
      multiplier = calculateMultiplier(building)

      // Step 3: Calculate actual production this tick
      productionThisTick = baseRate * multiplier

      // Step 4: Award resources
      resources[building.outputType] += productionThisTick
    END IF
  END FOR

  // Step 5: Apply NPC consumption
  applyNPCConsumption()

  // Step 6: Apply storage overflow
  applyStorageOverflow()
END FUNCTION
```

### Production Multipliers

```pseudocode
FUNCTION calculateMultiplier(building):
  multiplier = 1.0

  // NPC assignment bonus (up to +100%)
  npcBonus = min(building.assignedNPCs * 0.25, 1.0)
  multiplier += npcBonus

  // Tier bonus
  tierBonus = currentTier * 0.1  // +10% per tier
  multiplier += tierBonus

  // Morale bonus/penalty
  moraleMultiplier = (morale - 50) / 100  // ±50% based on morale
  multiplier *= (1.0 + moraleMultiplier)

  // Hard ceiling
  multiplier = min(multiplier, 2.0)

  RETURN multiplier
END FUNCTION
```

### NPC Consumption

```pseudocode
FUNCTION applyNPCConsumption():
  foodConsumption = npcCount * FOOD_PER_NPC_PER_TICK

  IF resources.food >= foodConsumption:
    resources.food -= foodConsumption
    morale = min(morale + 1, 100)
  ELSE:
    // Starvation
    resources.food = 0
    morale = max(morale - 10, 0)
    starvedNPCs = ceil((foodConsumption - resources.food) / FOOD_PER_NPC_PER_TICK)

    // Kill starved NPCs
    FOR i = 1 TO starvedNPCs:
      killRandomNPC("starvation")
    END FOR
  END IF
END FUNCTION
```

### Tier Progression

```pseudocode
FUNCTION checkTierAdvancement():
  requirements = TIER_REQUIREMENTS[nextTier]

  // Check all requirements
  IF resources.food >= requirements.food AND
     resources.wood >= requirements.wood AND
     resources.stone >= requirements.stone AND
     buildingCount >= requirements.buildings AND
     npcCount >= requirements.npcs THEN

    advanceToTier(nextTier)
  END IF
END FUNCTION
```

### Resource Constants

```javascript
FOOD_PER_NPC_PER_TICK = 0.1      // Food consumed per NPC every 5 seconds
BASE_STORAGE_CAPACITY = 100       // Default storage without warehouses
WAREHOUSE_STORAGE_BONUS = 200     // Storage added per warehouse
MAX_STORAGE_CAPACITY = 10000      // Hard cap on storage
```

### Building Production Rates (Per 5-Second Tick)

| Building | Output | Base Rate | With 4 NPCs | Notes |
|----------|--------|-----------|-------------|-------|
| FARM | Food | 1.0 | 2.0 | Primary food source |
| LUMBERYARD | Wood | 0.8 | 1.6 | Wood production |
| QUARRY | Stone | 0.5 | 1.0 | Stone production |
| MINE | Gold | 0.3 | 0.6 | Rare resource |
| WORKSHOP | Goods | 0.4 | 0.8 | Crafted items |

---

## Architecture Decisions

### Decision Log

This section records major architectural decisions made during development.

#### 1. NPC Pathfinding Algorithm
**Date:** Week 1, Prototype Phase
**Status:** ✅ Implemented

**Decision:** Use simple grid-based movement (not A* pathfinding)

**Rationale:**
- A* is O(n log n) per NPC per tick; grid movement is O(n)
- For 50 NPCs: Grid = ~50 ops/sec, A* = ~500 ops/sec
- Early optimization wins without over-engineering
- Better mobile performance

**Implementation:**
- Movement: 1 grid cell per 0.1 seconds
- Collision avoidance: Pick adjacent cell if target blocked
- Stuck detection: Teleport after 3 seconds blocked

**Performance Targets:**
- 50 NPCs: 60 FPS stable
- 100 NPCs: 45-60 FPS
- 200 NPCs: 30 FPS (playable)

#### 2. Four-Module Architecture
**Date:** Week 2, Architecture Review
**Status:** ✅ Implemented

**Decision:** Split game into 4 independent modules

**Modules:**
1. **Foundation** - Building placement and validation
2. **Building Types** - Definitions and tier advancement
3. **Resource Economy** - Production, consumption, economics
4. **Territory** - Territory management and expansion

**Rationale:**
- Clear separation of concerns
- Independent testing
- Easier maintenance
- Scalable architecture

**Files:** See `ARCHITECTURE.md` for full details

#### 3. Browser-Only Architecture (No Backend)
**Date:** Phase 0 Architecture Audit
**Status:** ✅ Implemented

**Decision:** Single-player browser game with localStorage

**Rationale:**
- MVP requires no server infrastructure
- Save files < 100KB (localStorage limit: 5-10MB)
- Tick rate safe for React (5-second ticks)
- Faster development cycle

**Trade-offs:**
- ❌ No multiplayer
- ❌ No cloud saves
- ✅ Zero hosting costs
- ✅ Offline play
- ✅ Privacy by design

#### 4. ModuleOrchestrator Pattern
**Date:** Week 3, Integration Phase
**Status:** ✅ Implemented

**Decision:** Central orchestrator for cross-module operations

**Rationale:**
- Modules remain independent
- Validation in one place
- Prevents circular dependencies
- Clear data flow

**Pattern:**
```javascript
// Modules never call each other directly
// All cross-module operations go through orchestrator

// ❌ BAD: Module 1 calling Module 2
buildingModule.validatePlacement(resourceModule.getResources())

// ✅ GOOD: Orchestrator coordinates
orchestrator.placeBuildingWithResourceCheck(buildingData)
```

#### 5. Event-Driven UI Updates
**Date:** Phase 1.2, React Integration
**Status:** ✅ Implemented

**Decision:** 500ms debounced event-driven state updates

**Rationale:**
- Game ticks every 5 seconds
- React updates every 500ms (10:1 ratio)
- Prevents re-render spam
- Smooth UI without lag

**Implementation:**
```javascript
// Game emits events every tick
gameEngine.on('stateChanged', handleStateChange)

// React hook debounces updates
const [state, setState] = useState()
const debouncedUpdate = useMemo(
  () => debounce(setState, 500),
  []
)
```

#### 6. Phase 3 Systems as Optional Modules
**Date:** Phase 3 Implementation
**Status:** ✅ Implemented

**Decision:** Phase 3A/B/C/D modules are optional for backwards compatibility

**Rationale:**
- Existing saves continue to work
- Gradual feature rollout
- Easier testing/debugging
- Module flags control activation

**Modules:**
- Phase 3A: NPC Advanced Behaviors (needs, idle tasks, autonomous decisions)
- Phase 3B: Event System (disasters, seasonal events, positive events)
- Phase 3C: Achievement System (50 achievements)
- Phase 3D: Tutorial System (12 tutorial steps, context help)

**Integration:** See `ModuleOrchestrator.js` lines 49-63 for optional module registration

---

## Implementation Patterns

### Adding a New Building Type

1. **Define in Building Config** (`src/modules/building-types/constants/buildings.js`):
```javascript
NEW_BUILDING: {
  type: 'NEW_BUILDING',
  displayName: 'New Building',
  tier: 'SETTLEMENT',
  cost: { wood: 50, stone: 20 },
  size: { width: 2, height: 2 },
  productionRate: 1.0,
  maxNPCs: 4,
  buildTime: 10
}
```

2. **Add to Shared Config** (`src/shared/config.js`):
```javascript
BUILDING_PROPERTIES: {
  NEW_BUILDING: {
    hp: 100,
    buildTime: 10,
    category: 'PRODUCTION'
  }
}
```

3. **Update Production System** (if it produces resources):
```javascript
// src/modules/production/ProductionTick.js
if (building.type === 'NEW_BUILDING') {
  const production = calculateProduction(building)
  resources.outputType += production
}
```

4. **Add Tests**:
```javascript
// __tests__/NewBuilding.test.js
describe('NEW_BUILDING', () => {
  it('should produce resources', () => {
    const building = createBuilding('NEW_BUILDING')
    const production = calculateProduction(building)
    expect(production).toBeGreaterThan(0)
  })
})
```

### Adding a New Resource Type

1. **Define Resource**:
```javascript
// src/modules/resource-economy/constants/resources.js
CRYSTAL: {
  type: 'CRYSTAL',
  displayName: 'Crystal',
  baseValue: 100,
  stackSize: 50,
  category: 'RARE'
}
```

2. **Update Initial State**:
```javascript
// src/modules/resource-economy/stores/useResourceEconomyStore.js
resources: {
  // ... existing resources
  crystal: 0
}
```

3. **Add Storage Tracking**:
```javascript
// Update storage capacity calculations
const totalCapacity = BASE_STORAGE + (warehouses * WAREHOUSE_BONUS)
```

### Adding a New NPC Role

1. **Define Role**:
```javascript
// src/modules/npc/constants/roles.js
MINER: {
  role: 'MINER',
  displayName: 'Miner',
  skills: ['mining', 'excavation'],
  preferredBuildings: ['MINE', 'QUARRY'],
  baseEfficiency: 1.0
}
```

2. **Update Assignment Logic**:
```javascript
// src/modules/npc-assignment/NPCAssignment.js
canAssignToBuilding(npc, building) {
  if (building.type === 'MINE' && npc.role === 'MINER') {
    return true
  }
  // ... other checks
}
```

### Save/Load Integration

When adding new systems, ensure serialization:

```javascript
// GameStateSerializer.js
serialize() {
  return {
    version: '1.0',
    timestamp: Date.now(),
    buildings: this.buildings.serialize(),
    resources: this.resources.serialize(),
    npcs: this.npcs.serialize(),
    // Add your new system here
    newSystem: this.newSystem.serialize()
  }
}

deserialize(data) {
  this.buildings.deserialize(data.buildings)
  this.resources.deserialize(data.resources)
  this.npcs.deserialize(data.npcs)
  // Deserialize your new system
  this.newSystem.deserialize(data.newSystem)
}
```

---

## Economy Balance

### Tier Progression Targets

#### SURVIVAL Tier (0-15 minutes)

**Goal:** Tutorial phase. Learn basic building and resource production.

**Starting Resources:**
- Wood: 50
- Stone: 20
- Food: 0

**Progression Requirements:**
- Build 3 buildings
- Reach 20 wood, 10 stone
- Survive 10 minutes

**Key Buildings:**
- CAMPFIRE (free) - Generates wood
- BASIC_SHELTER (20 wood) - Housing
- STORAGE_HUT (100 wood) - +40 storage

**Timeline:**
- 0-2 min: CAMPFIRE produces 120 wood
- 2 min: Build STORAGE_HUT (-100 wood)
- 2-5 min: Accumulate resources
- 5 min: Advance to SETTLEMENT tier

#### SETTLEMENT Tier (15-60 minutes)

**Goal:** Build a thriving settlement with NPCs and production.

**Progression Requirements:**
- 10+ buildings
- 100+ food, 200+ wood, 100+ stone
- 10+ NPCs
- 2+ farms producing food

**Key Buildings:**
- FARM (40 wood) - Food production
- HOUSE (80 wood) - NPC housing
- WAREHOUSE (120 wood, 50 stone) - Storage
- LUMBERYARD (100 wood) - Wood production

**Timeline:**
- 15-30 min: Build farms and houses
- 30-45 min: Expand to 10+ buildings
- 45-60 min: Meet tier requirements
- 60 min: Advance to KINGDOM tier

#### KINGDOM Tier (60+ minutes)

**Goal:** Large-scale settlement management.

**Progression Requirements:**
- 30+ buildings
- 500+ resources of each type
- 30+ NPCs
- Advanced buildings (mines, workshops)

**Key Buildings:**
- MINE (200 wood, 100 stone) - Gold production
- WORKSHOP (150 wood, 80 stone) - Crafting
- CASTLE (500 wood, 300 stone, 200 gold) - Monument

**Endgame:** Manage large settlement, optimize production, achieve high morale

### Production Balance

**Food Economy:**
- 1 NPC consumes 0.1 food/tick (1.2 food/min)
- 1 FARM produces 1.0 food/tick (12 food/min) base
- 1 FARM with 4 NPCs produces 24 food/min
- **Ratio:** 1 farm feeds ~20 NPCs at base, ~40 NPCs when staffed

**Wood Economy:**
- Most buildings cost 40-200 wood
- LUMBERYARD produces 0.8 wood/tick (9.6 wood/min) base
- With NPCs: 19.2 wood/min
- **Build Rate:** 1 staffed LUMBERYARD builds 1 FARM every 2 minutes

**Stone Economy:**
- Advanced buildings need 50-300 stone
- QUARRY produces 0.5 stone/tick (6 stone/min) base
- With NPCs: 12 stone/min
- **Build Rate:** 1 staffed QUARRY builds 1 WAREHOUSE every 4 minutes

### Balance Guidelines

1. **Food should be limiting factor early game** - Forces players to build farms first
2. **Wood should be abundant** - Allows experimentation with building placement
3. **Stone should be rare** - Gates advanced buildings
4. **Gold should be very rare** - Used for special buildings only

---

## Testing Guidelines

### Unit Testing

**Pattern for Module Tests:**
```javascript
describe('ModuleName', () => {
  let module

  beforeEach(() => {
    module = new ModuleName()
  })

  afterEach(() => {
    module.cleanup()
  })

  it('should initialize with default state', () => {
    expect(module.state).toBeDefined()
  })

  it('should handle edge cases', () => {
    // Test edge cases
  })
})
```

**Coverage Targets:**
- Core modules: 80%+ coverage
- Utilities: 90%+ coverage
- UI components: 60%+ coverage

### Integration Testing

**Test Cross-Module Operations:**
```javascript
describe('Building Placement', () => {
  it('should validate resources before placement', () => {
    const orchestrator = new ModuleOrchestrator()

    // Attempt to place building without resources
    const result = orchestrator.placeBuilding({
      type: 'FARM',
      position: { x: 5, y: 5 }
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INSUFFICIENT_RESOURCES')
  })
})
```

### Performance Testing

**Benchmarks:**
```javascript
describe('Performance', () => {
  it('should handle 100 NPCs at 60 FPS', () => {
    const game = createGame({ npcCount: 100 })

    const startTime = performance.now()
    for (let i = 0; i < 60; i++) {
      game.tick()
    }
    const duration = performance.now() - startTime

    expect(duration).toBeLessThan(1000) // 60 ticks in < 1 second
  })
})
```

### Save/Load Testing

**Always test serialization:**
```javascript
describe('Save/Load', () => {
  it('should preserve state after save/load cycle', () => {
    const game1 = createGame()
    game1.placeBuilding({ type: 'FARM', position: { x: 5, y: 5 } })

    const saveData = game1.save()
    const game2 = createGame()
    game2.load(saveData)

    expect(game2.buildings.length).toBe(game1.buildings.length)
    expect(game2.resources.food).toBe(game1.resources.food)
  })
})
```

---

## Common Issues & Solutions

### Issue: NPCs Not Producing Resources

**Symptoms:**
- NPCs assigned but production rate unchanged
- Multiplier stays at 1.0

**Solution:**
- Check NPC assignment in building data
- Verify `assignedNPCs` field is updated
- Ensure production multiplier calculation includes NPC bonus

### Issue: Storage Overflow Not Working

**Symptoms:**
- Resources exceed storage capacity
- No overflow warnings

**Solution:**
- Check storage capacity calculation
- Verify overflow logic runs after production
- Add logging to overflow function

### Issue: Tier Advancement Not Triggering

**Symptoms:**
- All requirements met but tier doesn't advance
- No tier-up notification

**Solution:**
- Log tier requirements vs current state
- Check if tier advancement function is called every tick
- Verify tier requirements match config

### Issue: Save/Load Corrupted

**Symptoms:**
- Game crashes after loading
- Missing buildings/NPCs after load

**Solution:**
- Check save file version matches current version
- Add migration logic for old saves
- Validate save data before loading

---

## File Reference

**Core Architecture:**
- `ARCHITECTURE.md` - Full architecture documentation
- `src/core/GameEngine.js` - Game engine
- `src/core/ModuleOrchestrator.js` - Module coordination

**Modules:**
- `src/modules/foundation/` - Building placement
- `src/modules/building-types/` - Building definitions
- `src/modules/resource-economy/` - Resource management
- `src/modules/territory/` - Territory system
- `src/modules/npc-system/` - NPC management
- `src/modules/production/` - Production system
- `src/modules/event-system/` - Phase 3B events
- `src/modules/achievement-system/` - Phase 3C achievements
- `src/modules/tutorial-system/` - Phase 3D tutorials

**Configuration:**
- `src/shared/config.js` - Single source of truth for game constants

**Persistence:**
- `src/persistence/BrowserSaveManager.js` - Browser-based saves
- `src/persistence/GameStateSerializer.js` - Serialization logic

---

## Version History

- **v1.0** (Nov 15, 2025) - Initial consolidated guide
  - Merged FORMULAS.md, DECISIONS.md, IMPLEMENTATION_GUIDE.md, ECONOMY_BALANCE.md
  - Added testing guidelines
  - Added common issues section

---

**For current project status, see:** `CURRENT_STATUS.md`
**For architecture details, see:** `ARCHITECTURE.md`
**For quick start, see:** `README.md`
