# Voxel RPG Game - Architecture Documentation

## Overview

The Voxel RPG Game uses a **four-module architecture** designed for scalability, maintainability, and clear separation of concerns. This document provides a comprehensive guide to understanding, extending, and maintaining the architecture.

## Table of Contents

1. [Architecture Layers](#architecture-layers)
2. [Four-Module Architecture](#four-module-architecture)
3. [Module Orchestrator Pattern](#module-orchestrator-pattern)
4. [Single Source of Truth](#single-source-of-truth)
5. [Data Flow](#data-flow)
6. [Extension Guide](#extension-guide)
7. [Naming Conventions](#naming-conventions)

---

## Architecture Layers

The application follows a layered architecture:

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer (React)                  │
│          Components, Views, User Interactions       │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│              State Management (Zustand)             │
│       Stores: Game State, Resources, NPCs, etc.     │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│           Module Orchestrator                       │
│    Coordinates cross-module operations & validation │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│        Four Game Modules (Business Logic)           │
│  Foundation │ Building Types │ Resources │ Territory│
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│      Shared Configuration & Utilities               │
│     src/shared/config.js - Single Source of Truth   │
└─────────────────────────────────────────────────────┘
```

---

## Four-Module Architecture

The game is divided into four independent modules, each responsible for a specific aspect of the game:

### 1. **Foundation Module** (Core Building Block)
- **Location**: `src/modules/foundation/`
- **Responsibility**: Core placement system, building validation, spatial organization
- **Key Files**:
  - `stores/useFoundationStore.js` - Building state management
  - `utils/validator.js` - Building placement and validation logic
  - `hooks/useBuildingMode.js` - Building mode interaction
  - `hooks/usePlacement.js` - Placement mechanics
  - `hooks/useFoundationPersistence.js` - Data persistence

**Core Exports**:
- `getBuilding(id)` - Retrieve building by ID
- `addBuilding(buildingData)` - Add building with validation
- `removeBuilding(id)` - Remove building from game
- `validatePlacement(buildingData)` - Check if placement is valid

---

### 2. **Building Types Module** (Module 2)
- **Location**: `src/modules/building-types/`
- **Responsibility**: Building definitions, types, tier advancement rules
- **Key Files**:
  - `constants/buildings.js` - Building type definitions
  - `stores/useBuildingTypesStore.js` - Building type state
  - `utils/tierAdvancementRules.js` - Tier progression logic (re-exports from Module 3)
  - `utils/interconnectionRules.js` - Building dependencies
  - `utils/moduleIntegration.js` - Integration patterns

**Core Exports**:
- `getBuildingDefinition(buildingType)` - Get building specs
- `getTierDefinition(tier)` - Get tier requirements
- `checkTierUnlockConditions(tier, progressData)` - Validate tier unlock
- `TIER_ADVANCEMENT_CONDITIONS` - Tier progression requirements (backwards compatible alias)

---

### 3. **Resource Economy Module** (Module 3)
- **Location**: `src/modules/resource-economy/`
- **Responsibility**: Resources, production, consumption, tier progression economics
- **Key Files**:
  - `stores/useResourceEconomyStore.js` - Resource state management
  - `utils/resourceCalculations.js` - Production, consumption, tier requirements
  - `managers/BuildQueueManager.js` - Building queue management
  - `config/productionBuildings.js` - Production building definitions

**Core Exports**:
- `checkResourceAvailability(resources)` - Verify resource availability
- `consumeResources(resources)` - Deduct resources
- `calculateProduction()` - Compute production rates
- `TIER_PROGRESSION_REQUIREMENTS` - Tier unlock conditions and helper functions
- Helper Functions:
  - `areBuildingRequirementsMet(tier, placedBuildings)` - Check tier building requirements
  - `isResourceSpentRequirementMet(tier, totalSpent)` - Check resource spending requirement
  - `isTimeRequirementMet(tier, elapsedTime)` - Check time requirement

**Single Source of Truth**: This module owns all tier progression logic and resource economy rules.

---

### 4. **Territory & Town Planning Module** (Module 4)
- **Location**: `src/modules/module4/`
- **Responsibility**: Territory management, town upgrades, NPC assignment, progression tracking
- **Key Files**:
  - `stores/useTerritory.js` - Territory state
  - `stores/useTownManagement.js` - Town upgrade state
  - `stores/useNPCSystem.js` - NPC management
  - `stores/useProgressionSystem.js` - Overall progression tracking
  - `utils/territoryValidator.js` - Territory validation
  - `utils/buildingClassifier.js` - Building classification for territory rules

**Core Exports**:
- `createTerritory(territoryData)` - Create new territory
- `assignNPC(npc, location)` - Assign NPC to building/location
- `upgradeBuilding(buildingId, upgradeTier)` - Upgrade building to next tier
- `validateTerritoryRules()` - Validate territory configuration
- Access to `TERRITORY_CONFIG`, `TOWN_UPGRADES` from shared config

---

## Module Orchestrator Pattern

The `ModuleOrchestrator` class (`src/modules/ModuleOrchestrator.js`) provides centralized coordination between all four modules.

### Purpose
- **Module Registration**: Validates that modules implement required interfaces
- **Initialization Orchestration**: Ensures modules initialize in proper dependency order
- **Cross-Module Validation**: Validates operations across module boundaries
- **Operation Coordination**: Coordinates complex operations affecting multiple modules

### Core Methods

```javascript
// Register a module with the orchestrator
orchestrator.registerModule(moduleName, moduleExports)

// Initialize all modules in dependency order
const result = orchestrator.initializeModules()

// Validate building placement across all modules
orchestrator.validateBuildingPlacement(buildingData)

// Validate tier progression requirements
orchestrator.validateTierProgression(tier, progressData)

// Coordinate building construction across modules
orchestrator.processBuildingConstruction(buildingData)

// Get orchestrator status and health report
orchestrator.getStatus()
```

### Module Initialization Order

The orchestrator enforces this initialization sequence:

```
1. Foundation Module
   ↓
2. Building Types Module (Module 2)
   ↓
3. Resource Economy Module (Module 3)
   ↓
4. Territory & Town Planning Module (Module 4)
```

This order respects dependencies: Territory management depends on resources, which depend on building types, which depend on foundation.

---

## Single Source of Truth

Configuration and constants are centralized in `src/shared/config.js` to prevent duplication and ensure consistency.

### Centralized Configuration

**TERRITORY_CONFIG**: Expansion rules for each tier
- `SURVIVAL`: Basic territory rules
- `PERMANENT`: Expanded boundaries
- `TOWN`: Large territory with upgrades
- `CASTLE`: Maximum territory with all features

**TOWN_UPGRADES**: Building upgrade definitions
- All 12 building types
- Their upgrade tiers (SURVIVAL → PERMANENT → TOWN → CASTLE)
- Resource costs for upgrades
- NPC and population capacity for each tier

### Sharing Pattern

Modules import from `shared/config.js`:
```javascript
import { TERRITORY_CONFIG, TOWN_UPGRADES } from '../../shared/config.js'
```

Module 2 (Building Types) re-exports Module 3 (Resource Economy) definitions for backwards compatibility:
```javascript
// In tierAdvancementRules.js (Module 2)
import { TIER_PROGRESSION_REQUIREMENTS as TIER_ADVANCEMENT_CONDITIONS } from '../resource-economy/utils/resourceCalculations.js'
export { TIER_ADVANCEMENT_CONDITIONS }
```

This maintains the single source of truth while supporting gradual migration to the new architecture.

---

## Data Flow

### Building Construction Workflow

```
User Action (Build Button)
    ↓
InventoryUI / CraftingUI Component
    ↓
Module Orchestrator.processBuildingConstruction()
    ├─→ Foundation: validatePlacement()
    ├─→ Module 2: checkBuildingType()
    ├─→ Module 3: consumeResources()
    └─→ Module 4: assignToTerritory()
    ↓
useGameStore: Update inventory, buildings, resources
    ↓
Re-render Components
```

### Tier Progression Workflow

```
Player Action (Unlock Next Tier)
    ↓
useProgressionSystem Store
    ↓
Module Orchestrator.validateTierProgression()
    ├─→ Module 3: checkTierUnlockConditions()
    │   ├─→ Check building requirements
    │   ├─→ Check resource spending
    │   └─→ Check time elapsed
    └─→ Return unlock status
    ↓
Update player tier
    ↓
Unlock new features/buildings
```

---

## Extension Guide

### Adding a New Building Type

1. **Define in shared/config.js**:
   ```javascript
   TOWN_UPGRADES: {
     NEW_BUILDING: {
       name: 'New Building',
       description: 'Description',
       tiers: {
         SURVIVAL: { npcCapacity: 1, populationCapacity: 5, cost: 50 },
         // ... other tiers
       }
     }
   }
   ```

2. **Add to Building Types definitions** (`src/modules/building-types/constants/buildings.js`):
   ```javascript
   export const BUILDING_TYPES = {
     NEW_BUILDING: {
       name: 'New Building',
       type: 'category',
       tier: 'SURVIVAL',
       // ... properties
     }
   }
   ```

3. **Update validators** if new rules apply

4. **Test through Module Orchestrator**:
   ```javascript
   orchestrator.validateBuildingPlacement({
     buildingType: 'NEW_BUILDING',
     // ... other data
   })
   ```

### Adding a New Tier

1. **Add to TIER_PROGRESSION_REQUIREMENTS** (Module 3, `resourceCalculations.js`):
   ```javascript
   TIER_PROGRESSION_REQUIREMENTS: {
     NEW_TIER: {
       description: 'Description',
       nextTier: null, // if final tier
       conditions: {
         buildingsRequired: [...],
         buildingsPlaced: {...},
         totalResourcesSpent: 1000,
         timeRequired: 7200000, // milliseconds
       }
     }
   }
   ```

2. **Update TERRITORY_CONFIG** if territory rules change

3. **Update TOWN_UPGRADES** if building upgrades reach new tier

### Adding Module Dependencies

1. **Implement required interface** in new module
2. **Register with orchestrator**:
   ```javascript
   orchestrator.registerModule('NEW_MODULE', moduleExports)
   ```
3. **Orchestrator validates interface automatically**
4. **Update initialization order if needed**

---

## Naming Conventions

### File Organization

- **Stores**: `use<Feature>Store.js` (e.g., `useResourceEconomyStore.js`)
- **Utilities**: `<function>.js` (e.g., `resourceCalculations.js`)
- **Managers**: `<Name>Manager.js` (e.g., `BuildQueueManager.js`)
- **Components**: `<ComponentName>.jsx`
- **Hooks**: `use<Feature>.js` in `hooks/` directory
- **Config**: `<feature>.js` in `config/` directory
- **Types**: `index.js` in `types/` directory

### Variable Naming

- **Store methods**: `camelCase` (e.g., `addBuilding`, `consumeResources`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `TIER_PROGRESSION_REQUIREMENTS`)
- **Private functions**: Prefixed with `_` or kept in utilities (e.g., `_validateTerritoryBounds`)
- **React hooks**: `use<Feature>` (e.g., `useBuildingMode`)

### Store Selector Pattern

Avoid hook-like names for store methods to prevent React ESLint violations:

❌ **Avoid**:
```javascript
const useConsumable = useGameStore((state) => state.useConsumable)
```

✅ **Use**:
```javascript
const consumeItem = useGameStore((state) => state.consumeItem)
```

---

## Key Design Principles

### 1. **Modularity**
Each module is independent with clear boundaries. Modules communicate through the Orchestrator.

### 2. **Single Responsibility**
Each module handles one aspect: Foundation (placement), Building Types (definitions), Resources (economy), Territory (management).

### 3. **Single Source of Truth**
- Tier progression rules live in Module 3 (Resource Economy)
- Configuration lives in `shared/config.js`
- No data duplication across modules

### 4. **Clear Interfaces**
Each module exports a clear set of methods and constants. The Orchestrator validates these.

### 5. **Backwards Compatibility**
When moving code between modules (e.g., TIER_ADVANCEMENT_CONDITIONS), old imports still work through re-exports.

### 6. **Dependency Order**
Modules initialize in order: Foundation → Module 2 → Module 3 → Module 4

---

## Testing Patterns

### Unit Tests
Test individual module functions in isolation:
```javascript
import { checkTierUnlockConditions } from '../utils/resourceCalculations'

test('validates tier unlock conditions', () => {
  const conditions = checkTierUnlockConditions('PERMANENT', {
    placedBuildings: { WALL: 3 },
    totalSpent: 100,
    elapsedTime: 300000
  })
  expect(conditions.unlocked).toBe(true)
})
```

### Integration Tests
Test module interactions through Orchestrator:
```javascript
test('building construction validates across modules', () => {
  const result = orchestrator.validateBuildingPlacement({
    buildingType: 'WALL',
    position: { x: 0, y: 0 }
  })
  expect(result.valid).toBe(true)
})
```

---

## Performance Considerations

- **Zustand stores** are optimized for selective rendering (only subscribe to needed state)
- **Resource calculations** are memoized for heavy computations
- **Validator functions** fail fast to minimize processing
- **Module initialization** happens once at app startup

---

## Migration Path

The architecture has been implemented in phases:

1. **Phase 1**: Consolidated building data in Foundation
2. **Phase 2**: Centralized configuration in `shared/config.js`
3. **Phase 3**: Created Module Orchestrator for coordination
4. **Phase 4**: Documentation and testing
5. **Phase 5+**: Gradual migration of remaining legacy code

Backwards compatibility is maintained throughout, allowing gradual refactoring.

---

## Troubleshooting

### Module Not Found
- Verify module path in `src/modules/`
- Check that `index.js` exports required methods
- Ensure module is registered with Orchestrator

### State Not Updating
- Verify Zustand store selector is correct
- Check that store actions are called correctly
- Review module initialization order

### Validation Failures
- Check Orchestrator error logs: `orchestrator.getStatus()`
- Review module interface requirements
- Verify required methods are exported

---

## References

- See individual module READMEs for module-specific documentation
- Review `IMPLEMENTATION_GUIDE.md` for phase-by-phase implementation details
- Check `ARCHITECTURE_REVIEW.md` for detailed analysis of the refactoring process
