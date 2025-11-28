# Module 2: Building Types & Progression System

The Building Types module is the "game designer's document in code form." It defines every building that will exist in the game, how buildings progress through tiers, interconnection rules between buildings, and validation logic for tier advancement.

## Overview

Module 2 owns the complete catalog of buildings and the progression fantasy:
- **Survival tier**: Campfire, basic walls and doors (early game)
- **Permanent tier**: Towers, watchtowers, guard posts (mid game)
- **Town tier**: Crafting stations, warehouses, marketplaces (late game)
- **Castle tier**: Fortresses and castles (endgame)

Module 2 is **read-only** regarding other modules' data. It provides metadata and queries that other modules depend on, but doesn't place buildings or manage resources.

## What Module 2 Owns

### 1. Building Definitions
Each building in `BUILDING_CATALOG` specifies:
- **Identity**: Name, description, visual sprite reference
- **Tier Classification**: What progression tier it belongs to
- **Structural Properties**: Dimensions (width, height, depth), rotation rules, terrain requirements
- **Interconnection Rules**: Dependencies on other buildings, bonus conditions

### 2. Tier System
Four progression tiers define the player's building advancement:
- **SURVIVAL**: Basic structures (walls, doors, chests)
- **PERMANENT**: Established buildings (towers, watchtowers, guard posts)
- **TOWN**: Economic/production buildings (crafting stations, warehouses, marketplaces)
- **CASTLE**: Grand structures (fortresses, castles)

### 3. Progression Logic
- **Tier Unlock Conditions**: What must be achieved to unlock the next tier
- **Progression Tracking**: Which tiers are unlocked, progression points towards next tier
- **Advancement Rules**: Buildings built, resources spent, time played

### 4. Interconnection Rules
Buildings can:
- **Require nearby buildings** (e.g., watchtower needs walls nearby)
- **Forbid nearby buildings** (e.g., certain structures can't be adjacent)
- **Gain bonuses** from nearby buildings (e.g., tower gets efficiency boost from walls)
- **Work best in groups** (e.g., chests and warehouses)

## What Module 2 Does NOT Own

### Module 3 (Resource Economy) Owns:
- Resource costs for buildings
- Resource production and consumption
- Economic systems and trading

### Module 4 (Territory & Town Planning) Owns:
- Territory system and expansion
- NPC placement and population
- Actual building placement logic
- Town zoning and planning

### Foundation Module Owns:
- Building placement on the map
- Building state and persistence
- Building damage/repair mechanics
- Map coordinate system

### Rendering Layer Owns:
- Visual representation of buildings
- Animations and visual effects
- Sprite loading and management

## Module Structure

```
src/modules/building-types/
├── index.js                          # Public API exports
├── README.md                         # This file
├── constants/
│   └── buildings.js                 # Building catalog definitions
├── stores/
│   └── useBuildingTypesStore.js     # Zustand store for tier progression
├── utils/
│   ├── tierAdvancementRules.js      # Tier unlock validation logic
│   ├── interconnectionRules.js      # Building relationship system
│   └── moduleIntegration.js         # Integration hooks for Modules 3 & 4
└── hooks/
    └── (future) useBuildingUI.js    # UI-specific hooks
```

## Key Concepts

### Building Structure Example

```javascript
TOWER: {
  id: 'TOWER',
  name: 'Tower',
  tier: 'PERMANENT',
  category: 'DEFENSIVE',

  // Structural properties
  width: 2,
  height: 2,
  depth: 3,
  rotatable: false,

  // Placement constraints
  terrainRequirements: {
    canPlaceOn: ['grass', 'dirt', 'stone'],
    cannotPlaceOn: ['water'],
  },

  // Movement blocking
  blocksPlayerMovement: true,
  blocksNpcMovement: true,

  // Progression
  upgradesTo: null,
  replacedBy: 'WATCHTOWER',  // Can be replaced

  // Relationships with other buildings
  interconnectionRules: {
    requiresNear: [],
    cannotBeNear: [],
    bonusWhen: [
      { building: 'WALL', effect: 'coverage', bonus: 1.2 }
    ],
    worksBestInGroups: true,
  },
}
```

### Tier Progression Example

Players start with SURVIVAL tier unlocked. To unlock PERMANENT tier:

```javascript
SURVIVAL: {
  conditions: {
    buildingsRequired: [
      { building: 'WALL', minCount: 3 },
      { building: 'DOOR', minCount: 1 },
    ],
    totalResourcesSpent: 100,
    timeRequired: 300000,  // 5 minutes
  }
}
```

Players must:
1. Build at least 3 walls and 1 door
2. Spend at least 100 resources
3. Have played for at least 5 minutes

## API Reference

### Querying Building Information

```javascript
import { getBuildingById, getBuildingsByTier } from 'src/modules/building-types';

// Get specific building
const tower = getBuildingById('TOWER');

// Get all buildings in a tier
const permanentBuildings = getBuildingsByTier('PERMANENT');
```

### Tier Progression Store

```javascript
import { useBuildingTypesStore } from 'src/modules/building-types';

const store = useBuildingTypesStore();

// Check tier unlock status
store.isTierUnlocked('TOWN');
store.getMaxTierOrder();

// Add progression
store.addProgressionPoints(10);

// Get next tier to unlock
const nextTier = store.getNextTierToUnlock();
```

### Tier Unlock Validation

```javascript
import { checkTierUnlockConditions } from 'src/modules/building-types';

const result = checkTierUnlockConditions('TOWN', {
  placedBuildings: [/* from Foundation */],
  totalResourcesSpent: 1500,  // From Module 3
  gameStartTime: 1234567890,
  currentTime: Date.now(),
});

// result.canUnlock: boolean
// result.progress: { buildings, resources, time }
// result.details: ["Missing: 1x MARKETPLACE", ...]
```

### Building Interconnections

```javascript
import {
  validatePlacementInterconnections,
  calculateEfficiencyBonus,
  getBuildingPairings,
} from 'src/modules/building-types';

// Validate building placement
const validation = validatePlacementInterconnections(
  'WATCHTOWER',
  { x: 5, y: 2, z: 10 },
  nearbyBuildings
);

// Check if placement is valid
if (!validation.isValid) {
  console.log(validation.missingRequirements);
  console.log(validation.forbiddenConflicts);
}

// Calculate efficiency bonus
const bonus = calculateEfficiencyBonus('TOWER', nearbyBuildings);
// Returns 1.2 (20% bonus) if near walls

// Get building pairings
const pairings = getBuildingPairings();
// Returns [{building1: 'TOWER', building2: 'WALL', bonus: 1.2, ...}]
```

### Module 3 & 4 Integration

```javascript
import {
  validateBuildingPlacementByTier,
  getTierProgressionResourceRequirement,
  validateTierUnlockCrossPlatform,
} from 'src/modules/building-types';

// Module 4 checks if building tier is unlocked
const canPlace = validateBuildingPlacementByTier('CASTLE', unlockedTiers);

// Module 3 gets resource requirement for tier progression
const requirement = getTierProgressionResourceRequirement('TOWN');
// Returns { requiredTotalSpent: 2000, description: '...' }

// Full validation across all modules
const tierValidation = validateTierUnlockCrossPlatform('TOWN', {
  foundationStore: foundationStore,
  resourceEconomyData: { totalResourcesSpent: 2000 },
  currentTime: Date.now(),
  gameStartTime: 0,
});
```

## Integration Examples

### Example 1: Check if Player Can Build Tower

```javascript
import { useBuildingTypesStore } from 'src/modules/building-types';
import { validateBuildingPlacementByTier } from 'src/modules/building-types';

const buildingTypesStore = useBuildingTypesStore();
const unlockedTiers = buildingTypesStore.unlockedTiers;

const result = validateBuildingPlacementByTier('TOWER', unlockedTiers);

if (result.canPlace) {
  // Module 4 can proceed with placement
  placeBuilding('TOWER', position);
} else {
  // Show error: "PERMANENT tier is not yet unlocked"
  showError(result.reason);
}
```

### Example 2: Calculate Tier Unlock Progress

```javascript
import {
  useBuildingTypesStore,
  checkTierUnlockConditions
} from 'src/modules/building-types';
import { useFoundationStore } from 'src/modules/foundation';
import { useResourceEconomyStore } from 'src/modules/resource-economy';

function updateTierProgress() {
  const buildingTypes = useBuildingTypesStore();
  const foundation = useFoundationStore();
  const economy = useResourceEconomyStore();

  const validation = checkTierUnlockConditions('PERMANENT', {
    placedBuildings: foundation.getPlacedBuildings(),
    totalResourcesSpent: economy.getTotalResourcesSpent(),
    gameStartTime: 0,
    currentTime: Date.now(),
  });

  if (validation.canUnlock) {
    buildingTypes.unlockTier('PERMANENT');
  }

  // Display progress to UI
  return {
    canUnlock: validation.canUnlock,
    progress: validation.progress,
    details: validation.details,
  };
}
```

### Example 3: Validate Watchtower Placement

```javascript
import {
  validatePlacementInterconnections,
  calculateEfficiencyBonus
} from 'src/modules/building-types';

function canPlaceWatchtower(position, nearbyBuildings) {
  const validation = validatePlacementInterconnections(
    'WATCHTOWER',
    position,
    nearbyBuildings
  );

  // Check interconnection requirements
  if (!validation.isValid) {
    return {
      canPlace: false,
      errors: validation.missingRequirements,
      conflicts: validation.forbiddenConflicts,
    };
  }

  // Calculate efficiency boost
  const bonus = calculateEfficiencyBonus('WATCHTOWER', nearbyBuildings);

  return {
    canPlace: true,
    warnings: validation.warnings,
    efficiencyBonus: bonus,
    bonusPercentage: Math.round((bonus - 1) * 100),
  };
}
```

## Data Persistence

Building type progression state is persisted via `useBuildingTypesStore`:

```javascript
const store = useBuildingTypesStore();

// Get state for saving
const saveData = store.getProgressionState();
// { unlockedTiers, maxTierUnlocked, progressionPoints, ... }

// Load state on game start
store.setProgressionState(loadedSaveData);

// Reset to initial state
store.resetProgression();
```

## Design Philosophy

### Read-Only Access to Other Modules
Module 2 **queries** Foundation and Resource Economy but never **modifies** their data:
- "What buildings are placed?" (from Foundation)
- "What resources have been spent?" (from Resource Economy)
- "Is this tier complete?" (calculation in Module 2)

### Clear Module Boundaries
- **Module 1 (Foundation)**: WHERE buildings are placed
- **Module 2 (Building Types)**: WHAT buildings exist and HOW they progress
- **Module 3 (Resource Economy)**: COST of buildings
- **Module 4 (Territory & Town Planning)**: RULES for where/when buildings can be placed

### Data-Driven Design
All building properties are declarative data, not imperative code. This makes:
- Game designers can add/modify buildings without coding
- Systems are consistent and predictable
- Data can be exported/analyzed
- Balancing is centralized

## Future Enhancements

- [ ] Building upgrade chains (e.g., WALL → STONE_WALL → METAL_WALL)
- [ ] Special building abilities and unique mechanics
- [ ] Building maintenance and degradation
- [ ] Seasonal buildings or limited-time structures
- [ ] NPC building preferences and population tracking
- [ ] Building decoration and customization
- [ ] Production chains between buildings
- [ ] Trading routes between buildings

## See Also

- [Foundation Module Guide](../foundation/FOUNDATION_MODULE_GUIDE.md) - Building placement and state
- [Resource Economy Module](../resource-economy/README.md) - Building costs and economics
- [Territory & Town Planning Module](../territory-planning/README.md) - Placement rules and town layout
