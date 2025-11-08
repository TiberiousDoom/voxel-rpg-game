# Shared Configuration & Foundation

## Overview

The `shared/` directory contains the **single source of truth** for game-wide configuration and constants. This prevents data duplication and ensures consistency across all modules.

## File Structure

```
src/shared/
├── README.md
└── config.js
```

## config.js

Central configuration file containing all game-wide constants and rules.

### Sections

#### 1. TERRITORY_CONFIG
Defines territory expansion rules for each tier.

**Structure**:
```javascript
TERRITORY_CONFIG: {
  SURVIVAL: {
    maxArea: 10,
    maxNPCs: 5,
    allowedBuildings: ['WALL', 'DOOR', 'STORAGE'],
    upgrades: ['PERMANENT']
  },
  PERMANENT: {
    maxArea: 25,
    maxNPCs: 15,
    allowedBuildings: ['WALL', 'DOOR', 'STORAGE', 'RESOURCE_GENERATOR'],
    upgrades: ['TOWN']
  },
  TOWN: {
    maxArea: 100,
    maxNPCs: 50,
    allowedBuildings: [...],
    upgrades: ['CASTLE']
  },
  CASTLE: {
    maxArea: 250,
    maxNPCs: 200,
    allowedBuildings: [...],
    upgrades: []
  }
}
```

**Used By**:
- Module 4 (Territory Management)
- Territory validator for checking expansion rules

#### 2. TOWN_UPGRADES
Defines all building types and their upgrade tiers.

**Structure**:
```javascript
TOWN_UPGRADES: {
  WALL: {
    name: 'Wall',
    description: 'Basic defensive structure',
    category: 'DEFENSE',
    tiers: {
      SURVIVAL: {
        npcCapacity: 1,
        populationCapacity: 5,
        resources: { stone: 50, wood: 20 },
        productionRate: 0
      },
      PERMANENT: {
        npcCapacity: 2,
        populationCapacity: 10,
        resources: { stone: 100, wood: 50 },
        productionRate: 0
      },
      // ... TOWN and CASTLE tiers
    }
  },
  // ... 11 more building types
}
```

**Building Types Included**:
- WALL - Defensive structure
- DOOR - Access point
- STORAGE - Resource storage
- RESOURCE_GENERATOR - Production
- FARM - Food production
- QUARRY - Stone production
- LOGGING_CAMP - Wood production
- BARRACKS - Military training
- HOSPITAL - Health support
- TAVERN - Entertainment/morale
- SCHOOL - Research/knowledge
- FORGE - Equipment crafting

**Tier System**:
- SURVIVAL: Basic capabilities
- PERMANENT: Enhanced features
- TOWN: Major expansion
- CASTLE: Maximum capabilities

**Used By**:
- Module 4 (Town Management) for upgrades
- UI components for building information
- Validators for tier requirements

### Usage Examples

#### Accessing Territory Configuration
```javascript
import { TERRITORY_CONFIG } from '../../shared/config.js'

const survivalMaxArea = TERRITORY_CONFIG.SURVIVAL.maxArea // 10
const permanentMaxNPCs = TERRITORY_CONFIG.PERMANENT.maxNPCs // 15
```

#### Accessing Building Definitions
```javascript
import { TOWN_UPGRADES } from '../../shared/config.js'

const wallDef = TOWN_UPGRADES.WALL
const wallSurvivalCost = TOWN_UPGRADES.WALL.tiers.SURVIVAL.resources
// { stone: 50, wood: 20 }
```

#### Getting Building Tier Info
```javascript
import { TOWN_UPGRADES } from '../../shared/config.js'

function getBuildingCapacities(buildingType, tier) {
  const building = TOWN_UPGRADES[buildingType]
  const tierData = building.tiers[tier]

  return {
    npc: tierData.npcCapacity,
    population: tierData.populationCapacity
  }
}
```

### Adding New Configuration

When adding new game-wide constants:

1. **Add to config.js** with clear structure and documentation
2. **Document section** with examples
3. **Keep related data together** (e.g., all tier-related data in one section)
4. **Use consistent naming** (see Naming Conventions below)

### Consistency Principles

#### 1. Single Definition
Each configuration item is defined exactly once. Other modules import and use it.

❌ **Bad**: Duplicate WALL definition in two modules
```javascript
// Module 2
const WALL_DEFINITION = { ... }

// Module 4
const WALL_DEFINITION = { ... } // DUPLICATION!
```

✅ **Good**: Single definition in shared/config.js
```javascript
// shared/config.js
TOWN_UPGRADES: { WALL: { ... } }

// Module 2 and 4
import { TOWN_UPGRADES } from './shared/config.js'
const wallDef = TOWN_UPGRADES.WALL
```

#### 2. Re-exports for Backwards Compatibility
When moving config between modules, re-export from the old location:

```javascript
// tierAdvancementRules.js (Module 2) - Old location
import { TIER_PROGRESSION_REQUIREMENTS } from '../resource-economy/utils/resourceCalculations.js'
export { TIER_PROGRESSION_REQUIREMENTS as TIER_ADVANCEMENT_CONDITIONS }

// Now old code still works:
import { TIER_ADVANCEMENT_CONDITIONS } from './modules/building-types/utils/tierAdvancementRules.js'
```

#### 3. Version-Controlled Config
All configuration is version-controlled in git. Configuration changes go through normal code review process.

### Module Dependencies on Shared Config

```
Module 4 (Territory)
  ├─ imports TERRITORY_CONFIG
  └─ imports TOWN_UPGRADES

Module 3 (Resources)
  └─ [Will import resource-related config in future phases]

Module 2 (Building Types)
  ├─ imports TOWN_UPGRADES (via Module 3 re-export for compatibility)
  └─ references building definitions

Foundation
  ├─ imports TOWN_UPGRADES for building validation
  └─ imports building capacity definitions
```

## Adding New Buildings

To add a new building type:

1. **Update TOWN_UPGRADES in config.js**:
   ```javascript
   NEW_BUILDING: {
     name: 'New Building',
     description: 'What it does',
     category: 'CATEGORY', // DEFENSE, PRODUCTION, etc.
     tiers: {
       SURVIVAL: {
         npcCapacity: 1,
         populationCapacity: 5,
         resources: { /* costs */ },
         productionRate: 0 // if applicable
       },
       // ... other tiers
     }
   }
   ```

2. **Update TERRITORY_CONFIG if needed**:
   ```javascript
   SURVIVAL: {
     allowedBuildings: ['WALL', 'DOOR', 'STORAGE', 'NEW_BUILDING'],
     // ...
   }
   ```

3. **Add to Building Types module** (`src/modules/building-types/constants/buildings.js`)

4. **Update validators** if new rules apply

5. **Test across modules** via Module Orchestrator

## Adding New Tiers

To add a new tier (e.g., EMPIRE tier after CASTLE):

1. **Add tier to all buildings in TOWN_UPGRADES**:
   ```javascript
   EMPIRE: {
     npcCapacity: 500,
     populationCapacity: 5000,
     resources: { /* ... */ },
     productionRate: 2.5
   }
   ```

2. **Update TERRITORY_CONFIG**:
   ```javascript
   EMPIRE: {
     maxArea: 1000,
     maxNPCs: 1000,
     allowedBuildings: [...],
     upgrades: [] // or next tier if multi-tier
   }
   ```

3. **Add to TIER_PROGRESSION_REQUIREMENTS** in Module 3

4. **Update UI** to display new tier

## Naming Conventions

- **Configuration objects**: `UPPER_SNAKE_CASE` (e.g., `TERRITORY_CONFIG`, `TOWN_UPGRADES`)
- **Building types**: `UPPER_SNAKE_CASE` (e.g., `WALL`, `RESOURCE_GENERATOR`)
- **Tiers**: `UPPER_SNAKE_CASE` (e.g., `SURVIVAL`, `PERMANENT`, `TOWN`, `CASTLE`)
- **Categories**: `UPPER_SNAKE_CASE` (e.g., `DEFENSE`, `PRODUCTION`, `SUPPORT`)
- **Properties**: `camelCase` (e.g., `npcCapacity`, `populationCapacity`, `maxArea`)

## Validation

Configuration is validated when:

1. **Modules initialize** - through ModuleOrchestrator
2. **Validators execute** - checking against config definitions
3. **UI renders** - accessing defined buildings and tiers

Invalid configuration will cause:
- Initialization errors with clear messages
- Validation failures during gameplay
- Build errors if syntax is broken

## Performance

Configuration is:
- **Loaded at app startup** (not dynamically loaded)
- **Read-only after initialization** (no runtime modification)
- **Optimized for fast lookups** (object keys for O(1) access)

## Future Extensions

As the game grows, additional sections may be added:

```javascript
RESOURCE_TYPES = { /* ... */ }
CRAFTING_RECIPES = { /* ... */ }
NPC_CLASSES = { /* ... */ }
ACHIEVEMENT_DEFINITIONS = { /* ... */ }
```

All follow the same principle: single definition, imported where needed, version-controlled, validated at startup.

## References

- Main ARCHITECTURE.md for overview
- Module READMEs for module-specific usage
- See each module's imports for concrete usage examples
