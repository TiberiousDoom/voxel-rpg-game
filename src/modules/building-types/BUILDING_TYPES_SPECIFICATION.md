# Module 2: Building Types & Progression System - Technical Specification

## Executive Summary

Module 2 is the single source of truth for:
1. What buildings exist in the game
2. How buildings are organized into progression tiers
3. Structural and placement rules for each building
4. Interconnection constraints and bonuses between buildings
5. Requirements for advancing through progression tiers

This document details the technical architecture, data structures, and integration patterns.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Module 2 Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Building Catalog (constants/buildings.js)           │   │
│  │ - 12 predefined buildings                           │   │
│  │ - 4 progression tiers                               │   │
│  │ - Building metadata (dimensions, properties)        │   │
│  │ - Building categories and descriptions              │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ▲                                    │
│                          │                                    │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │                     Queries API                      │   │
│  ├────────────────────────────────────────────────────┤   │
│  │ - getBuildingById()                                │   │
│  │ - getBuildingsByTier()                             │   │
│  │ - getBuildingsByCategory()                         │   │
│  │ - getAllBuildings()                                │   │
│  └────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Progression Store (stores/useBuildingTypesStore.js) │   │
│  │ - Unlocked tiers                                    │   │
│  │ - Progression points                               │   │
│  │ - User building preferences                        │   │
│  │ - Persistence layer (Zustand)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ▲                                    │
│                          │ (mutations)                        │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │         Tier Advancement Rules                       │   │
│  │    (utils/tierAdvancementRules.js)                  │   │
│  ├────────────────────────────────────────────────────┤   │
│  │ - Define unlock conditions per tier                │   │
│  │ - Validate condition fulfillment                   │   │
│  │ - Calculate progression metrics                    │   │
│  └────────────────────────────────────────────────────┘   │
│                          ▲                                    │
│                          │ (reads)                           │
│                 Cross-Module Data                            │
│         (Foundation, Module 3, etc.)                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Building Interconnection Rules                       │   │
│  │    (utils/interconnectionRules.js)                  │   │
│  ├────────────────────────────────────────────────────┤   │
│  │ - Validate placement against building rules        │   │
│  │ - Calculate efficiency bonuses                     │   │
│  │ - Check building compatibility                     │   │
│  │ - Analyze building pairings                        │   │
│  └────────────────────────────────────────────────────┘   │
│                          ▲                                    │
│                          │                                    │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │    Module Integration Hooks                         │   │
│  │    (utils/moduleIntegration.js)                    │   │
│  ├────────────────────────────────────────────────────┤   │
│  │ - Module 3 (Resource Economy) queries              │   │
│  │ - Module 4 (Territory) queries                     │   │
│  │ - Cross-module validation                          │   │
│  └────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Core Data Structures

### Building Definition Structure

```javascript
{
  // Identity
  id: string,                    // Unique identifier: 'TOWER'
  name: string,                  // Display name: 'Tower'
  description: string,           // Human-readable description

  // Classification
  tier: 'SURVIVAL' | 'PERMANENT' | 'TOWN' | 'CASTLE',
  category: 'DEFENSIVE' | 'STRUCTURE' | 'STORAGE' | etc,

  // Structural Properties
  width: number,                 // Grid cells (1-5)
  height: number,                // Grid cells (1-4)
  depth: number,                 // Grid cells (1-5)
  rotatable: boolean,            // Can rotate after placement
  canRotateOnPlace: boolean,     // Can rotate during placement

  // Placement Constraints
  terrainRequirements: {
    canPlaceOn: string[],        // 'grass', 'dirt', 'stone', 'water'
    cannotPlaceOn: string[],
    minHeightDifference: number, // -2 to 0
    maxHeightDifference: number, // 0 to 3
  },

  // Movement & Collision
  blocksPlayerMovement: boolean,
  blocksNpcMovement: boolean,

  // Progression & Upgrade Paths
  upgradesTo: string | null,     // What this upgrades into
  replacedBy: string | null,     // What can replace this
  children: string[],            // Buildings that depend on this

  // Interconnection Rules
  interconnectionRules: {
    requiresNear: Array<{
      building: string,
      maxDistance: number,       // Grid cells
    }>,
    cannotBeNear: Array<{
      building: string,
      maxDistance: number,
    }>,
    bonusWhen: Array<{
      building: string,
      effect: string,            // 'coverage', 'efficiency', etc
      bonus: number,             // 1.0 = 0%, 1.2 = 20%
    }>,
    worksBestInGroups: boolean, // Bonus per nearby similar building
  },

  // Base Stats (from Foundation/shared config)
  baseHP: number,
  buildTime: number,             // Seconds
}
```

### Tier Definition Structure

```javascript
{
  id: 'SURVIVAL' | 'PERMANENT' | 'TOWN' | 'CASTLE',
  name: string,
  order: number,                 // 0, 1, 2, 3 for progression order
  description: string,
}
```

### Tier Advancement Conditions

```javascript
{
  [tierName]: {
    description: string,
    nextTier: string | null,
    conditions: {
      buildingsRequired: Array<{
        building: string,
        minCount: number,
      }>,
      totalResourcesSpent: number,    // In standardized units
      timeRequired: number,            // Milliseconds
      customCondition: Function | null,
    },
  },
}
```

## State Management Details

### useBuildingTypesStore

**State:**
- `unlockedTiers: string[]` - Array of tier IDs that are unlocked
- `maxTierUnlocked: string` - The highest-order tier unlocked
- `progressionPoints: number` - Progress towards next tier (0-100)
- `maxProgressionPoints: number` - Constant: 100
- `tierUnlockTimestamps: object` - When each tier was unlocked
- `userDisabledBuildingTypes: string[]` - Buildings hidden by player

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `unlockTier(tier)` | Unlock a new tier |
| `addProgressionPoints(points)` | Add progress towards next tier |
| `setProgressionPoints(points)` | Set progress to specific value |
| `disableBuildingType(buildingId)` | Hide building from menu |
| `enableBuildingType(buildingId)` | Show building in menu |
| `toggleBuildingType(buildingId)` | Toggle visibility |
| `isTierUnlocked(tier)` | Query if tier is unlocked |
| `getMaxTierOrder()` | Get highest tier order |
| `getUnlockedTierDefinitions()` | Get all unlocked tier objects |
| `getNextTierToUnlock()` | Get next tier to advance to |
| `getProgressionPercentage()` | Get progress as 0-100 percent |
| `isBuildingAvailable(buildingId)` | Check if buildable |
| `getDisabledBuildingTypes()` | Get hidden buildings |
| `resetProgression()` | Reset to initial state |
| `setProgressionState(state)` | Load saved state |
| `getProgressionState()` | Get state for saving |

**Persistence:**
- Stored in localStorage as `building-types-store`
- Automatically persisted by Zustand middleware
- Version 1 (for future migration support)

## Tier Advancement Logic

### Condition Checking Flow

```
Player attempts to unlock tier
  ↓
checkTierUnlockConditions(tier, progressData)
  ├─ Check building requirements
  │   ├─ Get required buildings: [WALL:3, DOOR:1]
  │   ├─ Count placed buildings of each type
  │   └─ Calculate progress (e.g., 2/3 walls, 1/1 doors)
  │
  ├─ Check resource spending requirement
  │   ├─ Query Module 3 for total spent
  │   ├─ Compare to requirement (e.g., 500 resources)
  │   └─ Calculate progress percentage
  │
  ├─ Check time requirement
  │   ├─ Calculate elapsed time since game start
  │   ├─ Compare to requirement (e.g., 5 minutes)
  │   └─ Calculate progress percentage
  │
  └─ Determine result
      ├─ All conditions met? → canUnlock = true
      ├─ Conditions unmet? → canUnlock = false
      └─ Return detailed progress breakdown

store.unlockTier(tier)  // If canUnlock = true
```

### Building Requirement Validation

```javascript
// For tier unlock, player must have BUILT and KEPT:
buildingsRequired: [
  { building: 'WALL', minCount: 3 },      // 3 walls still standing
  { building: 'DOOR', minCount: 1 },      // 1 door still standing
]

// Checking against Foundation's placed buildings list:
placedBuildings = [
  { type: 'WALL', id: '1', status: 'COMPLETE' },
  { type: 'WALL', id: '2', status: 'COMPLETE' },
  { type: 'WALL', id: '3', status: 'COMPLETE' },
  { type: 'WALL', id: '4', status: 'DAMAGED' },
  { type: 'DOOR', id: '5', status: 'COMPLETE' },
]

// Validation: Count COMPLETE buildings, check minimums
```

### Progressive Tier Unlocking

**Current Design:** Tiers unlock independently based on meeting ALL conditions.

**Future Enhancement:** Could implement gradual tier unlocking:
- SURVIVAL Tier 1 → Tier 2 → Tier 3 (within tier progression)
- Then unlock PERMANENT tier

## Interconnection Rules System

### Requirement Types

**1. Requires Nearby**
```javascript
requiresNear: [
  { building: 'WALL', maxDistance: 5 }
]
// Building cannot be placed if no WALL exists within 5 grid cells
// Validated during placement in Module 4
```

**2. Cannot Be Near**
```javascript
cannotBeNear: [
  { building: 'OTHER_BUILDING', maxDistance: 3 }
]
// Building placement fails if OTHER_BUILDING exists within 3 cells
```

**3. Bonus When**
```javascript
bonusWhen: [
  { building: 'WALL', effect: 'coverage', bonus: 1.2 }
]
// Building gets 20% efficiency boost if WALL exists nearby
// Used by Module 3 for cost/production calculations
```

**4. Works Best In Groups**
```javascript
worksBestInGroups: true
// Building efficiency increases for each nearby building of same type
// Stacking: 1st = no bonus, 2nd = +10%, 3rd = +20%, ... up to 50%
```

### Distance Calculation

Distance uses **Manhattan distance** (grid-aligned, not Euclidean):
```
distance = |x1 - x2| + |y1 - y2| + |z1 - z2|
```

Reasoning: Game uses grid-based movement, Manhattan distance matches pathfinding.

### Validation Flow

```
Module 4 validates building placement
  ↓
validatePlacementInterconnections(buildingId, position, nearbyBuildings)
  │
  ├─ Check requiresNear
  │   ├─ For each required building type
  │   ├─ Count nearby of that type
  │   ├─ Check within maxDistance
  │   └─ Add to missingRequirements if not found
  │
  ├─ Check cannotBeNear
  │   ├─ For each forbidden building type
  │   ├─ Count nearby of that type
  │   ├─ Check within maxDistance
  │   └─ Add to forbiddenConflicts if found
  │
  ├─ Check bonusWhen (warnings only)
  │   ├─ For each potential bonus
  │   ├─ Check if bonus building exists nearby
  │   └─ Add to warnings if missed opportunity
  │
  └─ Return validation result
      ├─ isValid: bool (no missing reqs or conflicts)
      ├─ missingRequirements: string[]
      ├─ forbiddenConflicts: string[]
      └─ warnings: string[]
```

## Module Integration

### Module 2 ↔ Module 3 (Resource Economy)

**Module 2 queries Module 3 for:**
- Building costs (for affordability checks)
- Total resources spent (for tier progression validation)
- Resource values (to normalize costs for balance checking)

**Module 3 queries Module 2 for:**
- Building tier (to validate cost appropriateness)
- Building requirements (to build progression tracking)
- Resource spending thresholds (from tierAdvancementRules)

**Integration Point:**
```javascript
// Module 3 defines costs
const costs = {
  TOWER: { GOLD: 50, WOOD: 5, STONE: 10, ESSENCE: 5, CRYSTAL: 0 }
};

// Module 2 validates cost for tier
validateBuildingCostForTier('TOWER', costs[TOWER], getResourceValue);
// Returns: cost aligns with PERMANENT tier expectations

// Module 2 tells Module 3 what progression spending is needed
getTierProgressionResourceRequirement('PERMANENT');
// Returns: { requiredTotalSpent: 500, description: '...' }
```

### Module 2 ↔ Module 4 (Territory & Town Planning)

**Module 2 queries Module 4 for:**
- Currently placed buildings (for progress checking)
- Territory information (for placement validation)
- Building positions (for interconnection distance calculations)

**Module 4 queries Module 2 for:**
- Building structural properties (for collision)
- Tier availability (to allow/disallow building placement)
- Interconnection rules (to validate placement)
- Building category information (for zoning)

**Integration Point:**
```javascript
// Module 4 checks if tier is unlocked
validateBuildingPlacementByTier('MARKETPLACE', unlockedTiers);
// Returns: can place if TOWN tier is unlocked

// Module 4 gets structural properties
getBuildingStructuralProperties('TOWER');
// Returns: { width: 2, height: 2, depth: 3, blocksPlayer: true, ... }

// Module 4 validates interconnection rules
validatePlacementInterconnections('WATCHTOWER', position, nearbyBuildings);
// Returns: validation result with missing reqs and conflicts
```

### Module 2 ↔ Foundation (Module 1)

**Module 2 queries Foundation for:**
- Placed buildings list (for progression checking)
- Building state (placed, under construction, damaged)
- Building positions (for interconnection calculations)

**Foundation queries Module 2 for:**
- Building definitions (for visual representation)
- Building properties (HP, dimensions)
- Category information (for filtering)

**Important:** Module 2 NEVER calls Foundation mutation methods. It only reads data.

## File Organization

### `constants/buildings.js`
- **Exports:** BUILDING_CATALOG, TIER_DEFINITIONS, BUILDING_CATEGORIES, utility functions
- **Responsibility:** Single source of truth for all building definitions
- **Size:** ~500 lines (12 buildings, detailed properties)
- **Pattern:** Declarative data structure (not imperative code)

### `stores/useBuildingTypesStore.js`
- **Exports:** useBuildingTypesStore (Zustand hook)
- **Responsibility:** Player progression state and persistence
- **Size:** ~300 lines
- **Pattern:** Zustand store with persist middleware
- **Persistence:** localStorage, auto-synced

### `utils/tierAdvancementRules.js`
- **Exports:** TIER_ADVANCEMENT_CONDITIONS, validation functions
- **Responsibility:** Define and validate tier unlock conditions
- **Size:** ~350 lines
- **Pattern:** Condition checking and progress calculation
- **Called by:** Progression UI, tier advancement logic

### `utils/interconnectionRules.js`
- **Exports:** Building relationship queries and validation functions
- **Responsibility:** Validate building placement against interconnection rules
- **Size:** ~400 lines
- **Pattern:** Validation and compatibility checking
- **Called by:** Module 4 during building placement

### `utils/moduleIntegration.js`
- **Exports:** Cross-module integration functions
- **Responsibility:** Interface with Module 3 & 4, provide queries
- **Size:** ~300 lines
- **Pattern:** Integration hooks and data adapters
- **Called by:** Modules 3 & 4

### `index.js`
- **Exports:** All public API exports
- **Responsibility:** Single import point for other modules
- **Pattern:** Barrel export file

## Data Flow Examples

### Example: Unlocking PERMANENT Tier

```javascript
// Step 1: Player builds 3 walls, 1 door, spends 100 resources, plays 5 minutes
// Data exists in Foundation and Module 3

// Step 2: UI calls progression check
const result = checkTierUnlockConditions('PERMANENT', {
  placedBuildings: [3 walls, 1 door],     // From Foundation
  totalResourcesSpent: 100,                // From Module 3
  gameStartTime: 0,
  currentTime: 300000,  // 5 minutes
});

// Step 3: Module 2 calculates
// - Building progress: 3/3 walls ✓, 1/1 door ✓ → 100%
// - Resource progress: 100/100 ✓ → 100%
// - Time progress: 300000/300000 ✓ → 100%
// - canUnlock = true

// Step 4: Store unlocks tier
useBuildingTypesStore().unlockTier('PERMANENT');

// Step 5: Player now has access to TOWER, WATCHTOWER, GUARD_POST
// Next tier unlock requires TOWN tier buildings, etc.
```

### Example: Placing WATCHTOWER with Bonuses

```javascript
// Step 1: Module 4 wants to place WATCHTOWER at position (10, 0, 10)
// Nearby buildings: 5 walls, 2 towers

// Step 2: Check tier availability
validateBuildingPlacementByTier('WATCHTOWER', unlockedTiers);
// PERMANENT tier unlocked? → true

// Step 3: Check interconnection requirements
const validation = validatePlacementInterconnections(
  'WATCHTOWER',
  { x: 10, y: 0, z: 10 },
  [
    { type: 'WALL', position: { x: 10, y: 0, z: 8 } },  // 2 cells away
    { type: 'WALL', position: { x: 10, y: 0, z: 12 } }, // 2 cells away
    { type: 'TOWER', position: { x: 12, y: 0, z: 10 } }, // 2 cells away
  ]
);

// WATCHTOWER requires WALL nearby (maxDistance: 5) → ✓ Found at 2 cells
// validation.isValid = true
// validation.missingRequirements = []
// validation.warnings = []

// Step 4: Calculate efficiency bonus
const bonus = calculateEfficiencyBonus('WATCHTOWER', [...]);
// No bonus buildings defined for WATCHTOWER
// bonus = 1.0 (0% bonus)

// Step 5: Place building
// Module 4 calls Foundation to actually place it
useFoundationStore().addBuilding({
  type: 'WATCHTOWER',
  position: { x: 10, y: 0, z: 10 },
  // ... other properties
});

// Step 6: Module 3 calculates cost
// Cost multiplied by any efficiency bonuses from Module 2
const finalCost = baseCost * bonus;  // 1.0 multiplier
```

## Design Decisions

### 1. Buildings are Declarative Data
**Decision:** Store buildings as data, not code.
**Rationale:**
- Game designers can modify without coding
- Easier to balance and iterate
- Can be exported/analyzed
- Version control friendly

### 2. Four Fixed Tiers
**Decision:** SURVIVAL, PERMANENT, TOWN, CASTLE (not infinite tiers)
**Rationale:**
- Clear progression fantasy: campfire → house → farm → castle
- Manageable number of balance points
- Clear endpoints for planning
- Can add mid-tier buildings later within existing tiers

### 3. Tier Progression is Conditional, Not Sequential
**Decision:** Must meet ALL conditions to unlock tier (not just one)
**Rationale:**
- Ensures players experience breadth of each tier
- Prevents rushing to endgame
- Builds foundation for future content
- Rewards playstyle diversity

### 4. Manhattan Distance for Interconnections
**Decision:** Use grid distance, not Euclidean distance
**Rationale:**
- Matches game's grid-based pathfinding
- More intuitive for players
- Easier to visualize placement radius
- Consistent with terrain system

### 5. Module 2 is Read-Only to Other Modules
**Decision:** Module 2 queries but never mutates other modules' data
**Rationale:**
- Clear separation of concerns
- Prevents circular dependencies
- Easy to test in isolation
- Reduces coupling

### 6. Interconnection Rules are Asymmetric
**Decision:** A building's requirement might not require the other building back
**Rationale:**
- More flexible game design
- Realistic dependencies (e.g., marketplace needs storage, but storage doesn't need marketplace)
- Allows asymmetric bonuses
- Richer strategic depth

## Future Extensions

### 1. Building Upgrade Chains
Currently building relationships are simple (upgradesTo, replacedBy). Could extend to full chains:
```javascript
WALL: {
  upgradesTo: null,
  upgradePaths: [
    { targetBuilding: 'STONE_WALL', requirements: {...} },
    { targetBuilding: 'METAL_WALL', requirements: {...} }
  ]
}
```

### 2. Special Building Mechanics
Could add per-building behavior:
```javascript
MARKETPLACE: {
  specialMechanics: {
    type: 'ECONOMIC',
    generator: { resource: 'GOLD', rate: 1 },
    requiresPopulation: true,
    maxPopulation: 10,
  }
}
```

### 3. Seasonal or Limited Buildings
Could add time-based availability:
```javascript
FESTIVAL_GROUNDS: {
  availableFrom: 'SPRING',
  availableUntil: 'SUMMER',
  tier: 'TOWN',
}
```

### 4. Building Maintenance
Could add degradation over time:
```javascript
baseHP: 100,
maintenanceRate: 0.5,  // HP loss per time unit
maintenanceCost: { WOOD: 5 },  // Cost to repair
```

### 5. Multi-Building Projects
Could require combining multiple buildings for compound effects:
```javascript
TRADING_HUB: {
  requires: [
    { building: 'MARKETPLACE', minCount: 2 },
    { building: 'WAREHOUSE', minCount: 1 }
  ],
  synergy: 1.5,  // 50% bonus to all three buildings
}
```

## Testing Strategy

### Unit Tests
- `tierAdvancementRules.test.js`: Condition checking logic
- `interconnectionRules.test.js`: Distance calculations, validation
- `buildings.test.js`: Building catalog integrity, tier definitions

### Integration Tests
- Cross-module validation with Foundation
- Cross-module validation with Module 3
- Store persistence and loading

### Data Validation Tests
- All buildings have required properties
- No duplicate building IDs
- Tier progression is achievable
- Interconnection rules reference existing buildings

## Performance Considerations

### Optimization Opportunities
1. **Building lookup**: BUILDING_CATALOG is an object, O(1) lookup by ID
2. **Tier filtering**: getBuildingsByTier() uses array filter, could be cached
3. **Interconnection validation**: Distance calculations in tight loops, consider spatial indexing
4. **Store subscriptions**: Zustand only notifies on state changes, minimal overhead

### Scaling Limits
- Current: 12 buildings (constant)
- Could scale to: 100+ buildings without issue
- Interconnection checks: O(n*m) where n=buildings, m=nearby buildings (usually small)
- Tier progression checks: Called occasionally, not per-frame

## Security & Data Integrity

### Immutability
- Building catalog is frozen after initialization
- Store mutations only affect player progression, not buildings
- No way to modify building definitions at runtime

### Validation
- All building IDs are validated before use
- Tier interconnection cycles are prevented
- Store persists to localStorage (not to server, security handled elsewhere)

### Future: Server Sync
When multiplayer is added:
- Building definitions downloaded from server
- Player progression synced to server
- Server validates all tier unlocks (prevents cheating)
- Immutable building catalog prevents client modification
