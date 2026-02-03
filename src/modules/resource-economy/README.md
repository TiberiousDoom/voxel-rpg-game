# Resource Economy Module (Module 3)

## Overview

The Resource Economy Module is the **single source of truth** for all resource-related logic in the game, including resource management, production calculations, and tier progression requirements. This is the economic engine of the game.

**Key Responsibilities**:
- Resource generation and consumption
- Production rate calculations
- Building resource requirements
- **Tier progression economics** (moved from Module 2)
- Resource economy state management

## Module Structure

```
src/modules/resource-economy/
├── README.md (this file)
├── index.js
├── ResourceEconomyModule.js      # Main module class
├── stores/
│   └── useResourceEconomyStore.js   # Resource state management
├── utils/
│   └── resourceCalculations.js      # Core calculations (includes tier progression)
├── managers/
│   └── BuildQueueManager.js         # Building construction queue
├── config/
│   └── productionBuildings.js       # Production building definitions
├── __tests__/
│   └── Module3Integration.test.js   # Integration tests
└── types/
    └── index.js                     # TypeScript/JSDoc types
```

## Core Exports

### From `stores/useResourceEconomyStore.js`

**State Structure**:
```javascript
{
  resources: {
    wood: number,
    stone: number,
    food: number,
    gold: number,
    // ... other resource types
  },
  productionRates: object,    // Current production rates
  consumption: object,         // Current consumption rates
  history: array,             // Resource history for graphs
}
```

**Available Actions**:
- `addResource(type, amount)` - Add resources
- `consumeResource(type, amount)` - Remove resources
- `setProduction(building, rate)` - Set production rate
- `getResourceBalance()` - Get current balance
- `getProductionReport()` - Get production summary

### From `utils/resourceCalculations.js`

This file is the **single source of truth** for tier progression logic (moved from Module 2).

#### Tier Progression Requirements

**TIER_PROGRESSION_REQUIREMENTS**: Complete tier unlock requirements

```javascript
export const TIER_PROGRESSION_REQUIREMENTS = {
  SURVIVAL: {
    description: 'Starting tier - available from the beginning',
    achievedAt: 0,
    nextTier: 'PERMANENT',
    conditions: {
      buildingsRequired: [
        { building: 'WALL', minCount: 3 },
        { building: 'DOOR', minCount: 1 }
      ],
      buildingsPlaced: { WALL: 3, DOOR: 1 },
      totalResourcesSpent: 100,
      timeRequired: 300000, // 5 minutes in milliseconds
      customCondition: null
    }
  },
  PERMANENT: {
    description: 'Tier with permanent structures',
    nextTier: 'TOWN',
    conditions: {
      buildingsRequired: [
        { building: 'WALL', minCount: 5 },
        { building: 'STORAGE', minCount: 2 }
      ],
      buildingsPlaced: { WALL: 5, STORAGE: 2 },
      totalResourcesSpent: 500,
      timeRequired: 1200000, // 20 minutes
      customCondition: null
    }
  },
  TOWN: {
    description: 'Tier with town development',
    nextTier: 'CASTLE',
    conditions: {
      buildingsRequired: [
        { building: 'WALL', minCount: 10 },
        { building: 'RESOURCE_GENERATOR', minCount: 3 }
      ],
      buildingsPlaced: { WALL: 10, RESOURCE_GENERATOR: 3 },
      totalResourcesSpent: 2000,
      timeRequired: 3600000, // 1 hour
      customCondition: null
    }
  },
  CASTLE: {
    description: 'Final tier - maximum development',
    nextTier: null,
    conditions: {
      buildingsRequired: [
        { building: 'WALL', minCount: 20 },
        { building: 'FORGE', minCount: 2 }
      ],
      buildingsPlaced: { WALL: 20, FORGE: 2 },
      totalResourcesSpent: 5000,
      timeRequired: 7200000, // 2 hours
      customCondition: null
    }
  }
}
```

#### Tier Helper Functions

**areBuildingRequirementsMet(tier, placedBuildings)**
```javascript
const requirements = areBuildingRequirementsMet('PERMANENT', {
  WALL: 5,
  STORAGE: 2,
  DOOR: 1
})
// Returns: true
```

**isResourceSpentRequirementMet(tier, totalSpent)**
```javascript
const met = isResourceSpentRequirementMet('PERMANENT', 750)
// Returns: true (tier requires 500, 750 >= 500)
```

**isTimeRequirementMet(tier, elapsedTime)**
```javascript
const met = isTimeRequirementMet('PERMANENT', 1500000)
// Returns: true (tier requires 1200000ms, 1500000 >= 1200000)
```

**checkTierUnlockConditions(tier, progressData)**
```javascript
const result = checkTierUnlockConditions('PERMANENT', {
  placedBuildings: { WALL: 5, STORAGE: 2 },
  totalSpent: 750,
  elapsedTime: 1500000
})
// Returns: { unlocked: true, details: {...} }
```

**getTierProgressionRequirements(tier)**
```javascript
const requirements = getTierProgressionRequirements('TOWN')
// Returns: tier object with all conditions
```

**getTierRequirementsDescription(tier)**
```javascript
const description = getTierRequirementsDescription('PERMANENT')
// Returns: "Build 5 Walls, 2 Storage buildings. Spend 500 resources. Wait 20 minutes."
```

#### Resource Calculation Functions

**checkResourceAvailability(resources)**
```javascript
const available = checkResourceAvailability({
  wood: 50,
  stone: 100
})
// Returns: true if resources exist, false if not enough
```

**consumeResources(resourcesNeeded)**
```javascript
const consumed = consumeResources({
  wood: 30,
  stone: 60
})
// Updates store, returns success status
```

**calculateProduction()**
```javascript
const production = calculateProduction()
// Returns: { wood: 5/min, stone: 3/min, ... }
```

### From `managers/BuildQueueManager.js`

Manages the building construction queue.

```javascript
// Queue a building for construction
queueBuilding(buildingType, duration, resourceCost)

// Get current queue
getQueue()

// Remove from queue
dequeueBuilding(buildingId)

// Get estimated completion time
getEstimatedCompletion(position)
```

### From `config/productionBuildings.js`

Defines which buildings produce which resources.

```javascript
export const PRODUCTION_BUILDINGS = {
  FARM: {
    produces: 'food',
    baseRate: 0.5,
    requiresNPC: true,
    npcMultiplier: 0.1
  },
  QUARRY: {
    produces: 'stone',
    baseRate: 0.3,
    requiresNPC: true,
    npcMultiplier: 0.15
  },
  // ... more buildings
}
```

## Usage Examples

### Checking Resource Availability

```javascript
import { useResourceEconomyStore } from './stores/useResourceEconomyStore.js'

const store = useResourceEconomyStore.getState()
if (store.resources.wood >= 50 && store.resources.stone >= 100) {
  // Can craft building
}
```

### Consuming Resources

```javascript
import { useResourceEconomyStore } from './stores/useResourceEconomyStore.js'

const store = useResourceEconomyStore.getState()
store.consumeResource('wood', 50)
store.consumeResource('stone', 100)
```

### Checking Tier Unlock

```javascript
import {
  checkTierUnlockConditions
} from './utils/resourceCalculations.js'

const progressData = {
  placedBuildings: { WALL: 5, STORAGE: 2 },
  totalSpent: 750,
  elapsedTime: 1500000
}

const result = checkTierUnlockConditions('PERMANENT', progressData)
if (result.unlocked) {
  console.log('Ready to advance to PERMANENT tier!')
}
```

### Getting Tier Requirements

```javascript
import {
  getTierRequirementsDescription
} from './utils/resourceCalculations.js'

const description = getTierRequirementsDescription('TOWN')
console.log(description)
// Output: "Build 10 Walls, 3 Resource Generators. Spend 2000 resources. Wait 1 hour."
```

### Calculating Production

```javascript
import { calculateProduction } from './utils/resourceCalculations.js'

const production = calculateProduction()
console.log(production)
// { wood: 5, stone: 3, food: 2, gold: 1 }
```

## Key Concepts

### Tier Progression System

Tiers represent major game progression milestones:

```
SURVIVAL (Start)
  ├─ Max 10 area territory
  ├─ Max 5 NPCs
  └─ Basic buildings only
         ↓ [Requires: 3 WALL, 1 DOOR, 100 resources, 5 min]

PERMANENT
  ├─ Max 25 area territory
  ├─ Max 15 NPCs
  ├─ Unlocks resource generators
  └─ Allows permanent structures
         ↓ [Requires: 5 WALL, 2 STORAGE, 500 resources, 20 min]

TOWN
  ├─ Max 100 area territory
  ├─ Max 50 NPCs
  ├─ Unlocks advanced buildings
  └─ Town-specific features
         ↓ [Requires: 10 WALL, 3 RESOURCE_GENERATOR, 2000 resources, 1 hour]

CASTLE
  ├─ Max 250 area territory
  ├─ Max 200 NPCs
  └─ All buildings available
```

### Resource Types

The game tracks multiple resource types:

- **Wood**: Building material, from logging
- **Stone**: Building material, from quarrying
- **Food**: Sustains NPCs, from farming
- **Gold**: Trade currency, from mining

Each resource has:
- Current amount
- Production rate (per minute)
- Consumption rate (per minute)
- Storage capacity

### Production System

Buildings generate resources based on:

1. **Building type** - FARM produces food, QUARRY produces stone
2. **Base production rate** - Fixed rate per minute
3. **NPC assignment** - More NPCs = higher production
4. **Building tier** - Higher tiers produce more
5. **Technology bonuses** - (Future feature)

### Tier Progression Flow

```
Player Progress
    ↓
Check Conditions Against TIER_PROGRESSION_REQUIREMENTS
    ├─ Buildings placed match requirements?
    ├─ Resources spent meets threshold?
    ├─ Time elapsed sufficient?
    └─ Custom conditions met?
    ↓
All Conditions Met?
    ├─ YES: Unlock new tier
    │   ├─ Update territory limits
    │   ├─ Unlock new buildings
    │   └─ Enable new features
    └─ NO: Show progress toward next tier
```

## Integration with Other Modules

### With Foundation Module
- Foundation builds buildings
- Module 3 calculates what resources are needed
- Foundation calls Module 3 to validate resource availability

### With Building Types Module (Module 2)
- Module 2 defines building specs
- Module 3 determines resource costs for each tier
- Module 2 re-exports Module 3's tier progression for backwards compatibility

### With Territory Module (Module 4)
- Territory expands based on tier
- Tier progression is controlled by Module 3
- Territory respects tier-based building limits

### With Module Orchestrator
- Orchestrator calls Module 3's tier validation methods
- Module 3 is third in initialization order
- Orchestrator uses Module 3 for cross-module validation

```javascript
orchestrator.validateTierProgression('PERMANENT', progressData)
// Calls Module 3's checkTierUnlockConditions internally
```

## Single Source of Truth

**Tier progression requirements** moved from Module 2 to Module 3 because:

1. **Conceptual Fit**: Tier progression is fundamentally about **economy and resources**
2. **Single Definition**: All tier-related math lives here
3. **Cross-Module Use**: Accessed by Foundation, Territory, and Game systems
4. **Backwards Compatibility**: Module 2 re-exports for existing code

**This ensures**:
- One place to update tier requirements
- No duplicated tier logic
- Clear ownership of economy rules
- Easier testing and maintenance

## Adding New Resource Types

### Step 1: Define Resource

Edit `useResourceEconomyStore.js`:

```javascript
const useResourceEconomyStore = create((set) => ({
  resources: {
    wood: 0,
    stone: 0,
    food: 0,
    gold: 0,
    newResource: 0,  // Add here
  },
  // ... rest of store
}))
```

### Step 2: Add Production Building

Edit `config/productionBuildings.js`:

```javascript
NEW_RESOURCE_BUILDING: {
  produces: 'newResource',
  baseRate: 0.5,
  requiresNPC: true,
  npcMultiplier: 0.1
}
```

### Step 3: Update Calculations

Edit `resourceCalculations.js` if needed:

```javascript
// Update production calculation
// Update consumption calculation
// Update tier requirements if applicable
```

## Adding New Tiers

### Step 1: Add to TIER_PROGRESSION_REQUIREMENTS

Edit `resourceCalculations.js`:

```javascript
export const TIER_PROGRESSION_REQUIREMENTS = {
  // ... existing tiers
  EMPIRE: {
    description: 'Final tier with empire scope',
    nextTier: null,
    conditions: {
      buildingsRequired: [
        { building: 'CASTLE', minCount: 1 },
        { building: 'THRONE_ROOM', minCount: 1 }
      ],
      buildingsPlaced: { CASTLE: 1, THRONE_ROOM: 1 },
      totalResourcesSpent: 10000,
      timeRequired: 14400000, // 4 hours
      customCondition: null
    }
  }
}
```

### Step 2: Update Territory Config

Edit `src/shared/config.js`:

```javascript
TERRITORY_CONFIG: {
  // ... existing tiers
  EMPIRE: {
    maxArea: 2000,
    maxNPCs: 2000,
    allowedBuildings: [...allBuildings],
    upgrades: []
  }
}
```

### Step 3: Update Building Tiers

Edit `src/shared/config.js` TOWN_UPGRADES:

```javascript
WALL: {
  // ... existing tiers
  EMPIRE: {
    npcCapacity: 1000,
    populationCapacity: 10000,
    resources: { stone: 5000, wood: 3000 },
    productionRate: 0
  }
}
```

## Common Patterns

### Getting Tier Description

```javascript
import {
  getTierRequirementsDescription
} from './utils/resourceCalculations.js'

function showTierProgress(currentTier) {
  const description = getTierRequirementsDescription(currentTier)
  console.log(`To reach next tier: ${description}`)
}
```

### Tracking Progress to Next Tier

```javascript
import {
  getTierProgressionRequirements
} from './utils/resourceCalculations.js'

function getTierProgress(currentTier, progressData) {
  const requirements = getTierProgressionRequirements(currentTier)

  return {
    buildingsProgress: progressData.placedBuildings,
    requiredBuildings: requirements.conditions.buildingsRequired,
    resourcesSpent: progressData.totalSpent,
    resourcesNeeded: requirements.conditions.totalResourcesSpent,
    timeElapsed: progressData.elapsedTime,
    timeNeeded: requirements.conditions.timeRequired
  }
}
```

### Managing Build Queue

```javascript
import BuildQueueManager from './managers/BuildQueueManager.js'

const queue = new BuildQueueManager()
queue.queueBuilding('WALL', 60000, { wood: 50, stone: 100 })
queue.queueBuilding('STORAGE', 90000, { wood: 100, stone: 150 })

console.log(queue.getQueue())
// Shows all queued buildings and ETAs
```

## Troubleshooting

### Resources Won't Consume

**Causes**:
- Not enough resources available
- Store not updated
- Consumer didn't call consumeResource

**Debug**:
```javascript
const store = useResourceEconomyStore.getState()
console.log(store.resources) // Check available
console.log(store.consumeResource) // Verify method exists
```

### Tier Won't Unlock

**Causes**:
- Building requirements not met
- Resource spending threshold not reached
- Time requirement not elapsed
- Custom condition failed

**Debug**:
```javascript
const result = checkTierUnlockConditions('PERMANENT', progressData)
console.log(result.details) // See what's missing
```

### Production Not Calculating

**Causes**:
- Building not defined in PRODUCTION_BUILDINGS
- NPC not assigned to production building
- Production rate set to 0

**Debug**:
```javascript
const production = calculateProduction()
console.log(production) // Check all rates
```

## Performance Notes

- **Tier requirements** are static objects, loaded once
- **Production calculations** run on interval (optimized)
- **Resource consumption** updates store (immediate)
- **Build queue** uses efficient queue data structure

## Testing

### Unit Tests

```javascript
test('tier progression requirements are valid', () => {
  const tiers = Object.values(TIER_PROGRESSION_REQUIREMENTS)
  tiers.forEach(tier => {
    expect(tier.description).toBeDefined()
    expect(tier.conditions).toBeDefined()
  })
})

test('tier unlock validation works', () => {
  const result = checkTierUnlockConditions('PERMANENT', {
    placedBuildings: { WALL: 5, STORAGE: 2 },
    totalSpent: 750,
    elapsedTime: 1500000
  })
  expect(result.unlocked).toBe(true)
})
```

### Integration Tests

See `__tests__/Module3Integration.test.js` for full integration test suite.

## References

- **ARCHITECTURE.md**: Overall system design
- **src/shared/README.md**: Shared configuration
- **src/modules/building-types/README.md**: Module 2 (re-exports tier progression)
- **src/modules/module4/README.md**: Module 4 (uses tier progression)
- **src/modules/ModuleOrchestrator.js**: Cross-module coordination
