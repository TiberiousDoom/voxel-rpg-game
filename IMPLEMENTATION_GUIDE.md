# Architecture Fixes Implementation Guide

This guide provides step-by-step instructions for implementing all remaining architecture fixes from the comprehensive review.

## Completed Fixes ✅

- [x] Cascade cleanup on building deletion (prevents memory leaks)
- [x] Building classifications consolidated to shared/config.js
- [x] Module 4 buildingClassifier updated to use shared config

## Remaining Fixes (Priority Order)

### Phase 1: Quick Wins (High Impact, Low Effort)

#### 1.1 Fix HP/BuildTime Data Mismatches
**Status**: Critical data inconsistency
**Files Affected**: `src/shared/config.js` (BUILDING_PROPERTIES)
**Duration**: 30 minutes

**Current Issue**: 8 of 12 buildings have mismatched HP/buildTime values between shared config and Module 2.

**Fix Steps**:
1. Verify correct values for each building (check Module 2 vs shared config)
2. Correct the values in BUILDING_PROPERTIES in shared/config.js
3. Ensure Module 2's buildings.js references shared config, not hardcoded values

**Verification**:
- Verify all HP values are positive
- Verify buildTime values match expected construction difficulty

---

#### 1.2 Add Validation to NPC Patrol Routes
**Status**: Edge case not handled
**File**: `src/modules/module4/stores/useNPCSystem.js` (setPatrolRoute method)
**Duration**: 1-2 hours

**Current Issue**: `setPatrolRoute()` accepts any building IDs without validation. If buildings are deleted, NPCs patrol invalid locations.

**Fix Steps**:
1. Update `setPatrolRoute()` to validate all building IDs exist
2. Filter out any deleted buildings from patrol route
3. Return validation error if route is empty after filtering

**Code Pattern**:
```javascript
setPatrolRoute: (npcId, buildingIds) => {
  // NEW: Validate building existence
  const invalidIds = buildingIds.filter(id => !foundationStore.hasBuilding(id));
  if (invalidIds.length > 0) {
    console.warn(`Invalid building IDs in patrol route: ${invalidIds}`);
    return false;
  }

  // Existing code...
}
```

---

#### 1.3 Fix populationCapacity Calculation
**Status**: Town stats always return 0 population capacity
**File**: `src/modules/module4/utils/bonusCalculator.js` (calculateTownStatistics)
**Duration**: 30 minutes

**Current Issue**: Population capacity initialized to 0, never calculated.

**Fix Steps**:
1. In `calculateTownStatistics()`, iterate through buildings
2. For each NPC-assignable building, sum up NPC capacities
3. Multiply by any town-level population bonuses

**Code Pattern**:
```javascript
// Inside calculateTownStatistics
let populationCapacity = 0;
const foundationStore = useFoundationStore.getState();
const buildings = foundationStore.getAllBuildings();

buildings.forEach(building => {
  const capacity = getNPCCapacity(building.type);
  if (capacity > 0) {
    populationCapacity += capacity;
  }
});

const stats = {
  populationCapacity,
  // ... other stats
};
```

---

### Phase 2: Architecture Consolidation (Medium Effort)

#### 2.1 Move Territory Expansion Rules to Shared Config
**Status**: Constants scattered across 3 files
**Files Affected**:
- `src/shared/config.js` (add TERRITORY_CONFIG section)
- `src/modules/module4/utils/territoryValidator.js` (remove hardcoded values)
- `src/modules/module4/stores/useTerritory.js` (import from config)
**Duration**: 2-3 hours

**Current Issue**: Territory rules hardcoded locally in multiple locations.

**Fix Steps**:

1. **Add to `src/shared/config.js`** (after BUILDING_CLASSIFICATIONS):
```javascript
// ============================================================================
// TERRITORY AND TOWN CONFIGURATION
// ============================================================================
// Rules for territory expansion and town growth

export const TERRITORY_CONFIG = {
  // Base territory radius in grid cells
  BASE_RADIUS: 10,

  // Radius expansion per control building placed
  RADIUS_PER_CONTROL_BUILDING: 2,

  // Maximum territory radius
  MAX_TERRITORY_RADIUS: 50,

  // Radius bonuses from specific buildings
  BUILDING_RADIUS_BONUSES: {
    [BUILDING_TYPES.WATCHTOWER]: 0.15,     // 15% bonus
    [BUILDING_TYPES.FORTRESS]: 0.3,        // 30% bonus
    [BUILDING_TYPES.CASTLE]: 0.5,          // 50% bonus
  },

  // Territory expansion cost in resources
  TERRITORY_EXPANSION_COST: {
    [RESOURCE_TYPES.GOLD]: 100,
    [RESOURCE_TYPES.STONE]: 50,
  },

  // How often to recalculate territory (frames)
  RECALCULATION_FREQUENCY: 60,
};
```

2. **Update `src/modules/module4/utils/territoryValidator.js`**:
   - Replace all hardcoded constants with imports from TERRITORY_CONFIG
   - Example: `import { TERRITORY_CONFIG } from '../../../shared/config'`
   - Replace `const BASE_RADIUS = 10;` with `const { BASE_RADIUS } = TERRITORY_CONFIG;`

3. **Update `src/modules/module4/stores/useTerritory.js`**:
   - Import TERRITORY_CONFIG where needed
   - Replace any hardcoded values with config references

**Verification**:
- Territory expands correctly with control buildings
- Bonuses apply correctly
- Maximum radius enforced

---

#### 2.2 Move Town Upgrade Definitions to Shared Config
**Status**: Hardcoded in Module 4 store
**File**: `src/modules/module4/stores/useTownManagement.js`
**Duration**: 1-2 hours

**Current Issue**: 5 upgrade definitions with costs and build times hardcoded.

**Fix Steps**:

1. **Add to `src/shared/config.js`** (in TERRITORY_CONFIG section):
```javascript
// Town upgrades that increase capability
TOWN_UPGRADES: {
  POPULATION: {
    id: 'POPULATION',
    name: 'Population Growth',
    description: 'Increase town population capacity',
    costs: { [RESOURCE_TYPES.GOLD]: 500 },
    buildTime: 60,  // seconds
    effects: {
      populationCapacity: 50,  // Additional population slots
    },
  },
  PRODUCTION: {
    id: 'PRODUCTION',
    name: 'Production Efficiency',
    description: 'Increase resource production',
    costs: { [RESOURCE_TYPES.GOLD]: 400, [RESOURCE_TYPES.ESSENCE]: 50 },
    buildTime: 45,
    effects: {
      productionMultiplier: 1.1,  // 10% increase
    },
  },
  // ... Add other 3 upgrades following same pattern
},
```

2. **Update `src/modules/module4/stores/useTownManagement.js`**:
   - Replace local TOWN_UPGRADES constant with import from config
   - Update any references to use imported config

**Verification**:
- Upgrades cost correct resources
- Build times are accurate
- Effects apply correctly

---

#### 2.3 Add NPC/Population Capacities to BUILDING_PROPERTIES
**Status**: Defined in wrong module (Module 4 instead of shared config)
**Files Affected**:
- `src/shared/config.js` (add capacity fields to BUILDING_PROPERTIES)
- `src/modules/module4/utils/buildingClassifier.js` (remove local definitions)
**Duration**: 1-2 hours

**Current Issue**: Building capacities for NPCs and population defined in Module 4.

**Fix Steps**:

1. **Add fields to each building in `BUILDING_PROPERTIES` in shared/config.js**:
```javascript
[BUILDING_TYPES.BARRACKS]: {
  tier: BUILDING_TIERS.TOWN,
  hp: 120,
  buildTime: 45,
  costs: { [RESOURCE_TYPES.GOLD]: 150, [RESOURCE_TYPES.STONE]: 50 },
  npcCapacity: 4,        // NEW: Can assign up to 4 NPCs
  populationCapacity: 10, // NEW: Houses 10 population units
  colors: { ... },
},
// Repeat for all 12 building types
```

2. **Query from shared config in Module 4**:
   - Remove `getNPCCapacity()` function from buildingClassifier.js
   - Create in a new utility: `getBuildingCapacity(buildingType, capacityType)`
   - Example: `getBuildingCapacity(BUILDING_TYPES.BARRACKS, 'npc')` → 4

**Verification**:
- All buildings have capacity fields
- Module 2 and Module 4 use same capacity values
- No inconsistencies between modules

---

### Phase 3: Module Integration (Higher Effort)

#### 3.1 Move Module 2 Economy Thresholds to Module 3
**Status**: Architectural violation
**Files Affected**:
- `src/modules/building-types/utils/tierAdvancementRules.js` (move constants)
- `src/modules/resource-economy/utils/resourceCalculations.js` (receive constants)
- `src/shared/config.js` (optional: centralize if needed)
**Duration**: 4-6 hours

**Current Issue**: Tier progression resource requirements defined in Module 2, should be in Module 3.

**Fix Steps**:

1. **In `tierAdvancementRules.js`**, replace hardcoded thresholds:
```javascript
// BEFORE:
const TIER_ADVANCEMENT_CONDITIONS = {
  SURVIVAL_TO_PERMANENT: {
    type: 'resourceThreshold',
    totalResourcesSpent: 100,
  },
  // ...
};

// AFTER: Import from Module 3
import { getTierProgressionRequirements } from '../../resource-economy/utils/resourceCalculations';

// Use getTierProgressionRequirements() instead
```

2. **In Module 3**, create centralized tier progression requirements:
```javascript
// In src/modules/resource-economy/utils/resourceCalculations.js

export const TIER_PROGRESSION_REQUIREMENTS = {
  SURVIVAL_TO_PERMANENT: 100,  // Total resources to spend
  PERMANENT_TO_TOWN: 500,
  TOWN_TO_CASTLE: 2000,
};

export function getTierProgressionRequirements(currentTier) {
  const key = `${currentTier}_TO_NEXT`;
  return TIER_PROGRESSION_REQUIREMENTS[key] || 0;
}
```

3. **Update Module 2** to query Module 3:
```javascript
export const checkTierUnlockConditions = (tier, economyData) => {
  const required = getTierProgressionRequirements(tier);
  return economyData.totalResourcesSpent >= required;
};
```

**Verification**:
- Tier progression checks query Module 3
- No duplicate thresholds
- Module 2 doesn't encode economy values

---

#### 3.2 Create Module Orchestration Layer
**Status**: Missing (modules operate in isolation)
**Files Affected**: `src/App.js` OR create `src/modules/ModuleOrchestrator.js`
**Duration**: 2-3 hours

**Current Issue**: Modules don't interact. Building placement doesn't trigger validation checks.

**Fix Steps**:

1. **Create `src/modules/ModuleOrchestrator.js`**:
```javascript
/**
 * Module Orchestrator - Coordinates interactions between the 4 modules
 * Ensures modules are initialized and properly communicate
 */

import { useFoundationStore } from './foundation/stores/useFoundationStore';
import { useBuildingTypesStore } from './building-types/stores/useBuildingTypesStore';
import { useResourceEconomyStore } from './resource-economy/stores/useResourceEconomyStore';
import { useTerritory } from './module4/stores/useTerritory';

export const ModuleOrchestrator = {
  /**
   * Validate building placement across all modules
   */
  validatePlacement: (buildingType, position, inventory) => {
    // 1. Foundation: Check physical placement rules
    const foundationCheck = validatePlacement({
      buildingType,
      position,
      existingBuildings: useFoundationStore.getState().getAllBuildings(),
    });

    if (!foundationCheck.valid) {
      return { valid: false, reason: foundationCheck.reason };
    }

    // 2. Module 2: Check tier requirements
    const buildingTypesStore = useBuildingTypesStore.getState();
    if (!buildingTypesStore.canBuildByTier(buildingType)) {
      return { valid: false, reason: 'Building type not unlocked for current tier' };
    }

    // 3. Module 3: Check affordability
    const economyStore = useResourceEconomyStore.getState();
    if (!economyStore.canAfford(buildingType, inventory)) {
      return { valid: false, reason: 'Insufficient resources' };
    }

    // 4. Module 4: Check territory placement rules
    const territoryStore = useTerritory.getState();
    if (!territoryStore.isInTerritory(position)) {
      return { valid: false, reason: 'Position outside territory' };
    }

    return { valid: true, reason: 'Placement approved' };
  },

  /**
   * Execute building placement across all modules
   */
  placeBuilding: (buildingType, position, inventory) => {
    // Validate first
    const validation = ModuleOrchestrator.validatePlacement(buildingType, position, inventory);
    if (!validation.valid) {
      return validation;
    }

    try {
      // 1. Foundation places building
      const building = useFoundationStore.getState().addBuilding(buildingType, position, 0);

      // 2. Module 3 starts construction
      useResourceEconomyStore.getState().startConstruction(building, inventory);

      // 3. Module 4 updates territory
      useTerritory.getState().addBuildingToTerritory(null, building.id);

      return { valid: true, buildingId: building.id };
    } catch (error) {
      return { valid: false, reason: `Placement error: ${error.message}` };
    }
  },

  /**
   * Initialize all modules with dependencies
   */
  initializeModules: () => {
    // Ensure all stores are accessible
    useFoundationStore.getState();
    useBuildingTypesStore.getState();
    useResourceEconomyStore.getState();
    useTerritory.getState();
  },
};
```

2. **In App.js**, initialize orchestrator:
```javascript
// At app startup
import { ModuleOrchestrator } from './modules/ModuleOrchestrator';

function App() {
  useEffect(() => {
    ModuleOrchestrator.initializeModules();
  }, []);

  // Use ModuleOrchestrator for all building operations
  const handlePlaceBuilding = (buildingType, position) => {
    const result = ModuleOrchestrator.placeBuilding(
      buildingType,
      position,
      gameStore.inventory
    );

    if (!result.valid) {
      showError(result.reason);
      return;
    }

    // Building placed successfully
  };

  // ... rest of App code
}
```

**Verification**:
- Building placement validates through all modules
- Modules receive valid data
- No bypassing of validation

---

### Phase 4: Documentation (Low Effort, High Value)

#### 4.1 Create ARCHITECTURE.md
**File**: `src/ARCHITECTURE.md` (or root ARCHITECTURE.md)
**Duration**: 1-2 hours

**Content Structure**:
```markdown
# Voxel RPG Game - Four-Module Architecture

## Overview
- What the system does
- Why 4-module approach
- Visual dependency diagram

## Module 1: Foundation
- Responsibilities
- Key exports
- Example usage

## Module 2: Building Types & Progression
- Responsibilities
- Key exports
- Example usage

## Module 3: Resource Economy
- Responsibilities
- Key exports
- Example usage

## Module 4: Territory & Town Planning
- Responsibilities
- Key exports
- Example usage

## Shared Config
- Single source of truth
- What goes where
- How to add new constants

## Integration Guide
- How modules interact
- Using ModuleOrchestrator
- Adding new features across modules

## Best Practices
- Where to add new code
- Module boundaries
- Testing strategy
```

---

#### 4.2 Create Module 3 README
**File**: `src/modules/resource-economy/README.md`
**Duration**: 1-2 hours

**Content**: Follow same pattern as other module READMEs
- Quick start
- Module structure
- Key concepts
- API reference
- Integration examples
- Performance notes

---

### Phase 5: Testing & Validation

#### 5.1 Create Integration Tests
**File**: `src/__tests__/modules.integration.test.js`
**Duration**: 2-3 hours

**Test Coverage**:
- Building placement validates through all modules
- Resource consumption happens on placement
- Tier progression updates correctly
- Cascade cleanup removes all references
- NPC assignment to deleted buildings handled
- Territory bonuses apply correctly
- Storage overflow prevented

**Test Pattern**:
```javascript
describe('Module Integration', () => {
  test('Building placement validates through all modules', () => {
    const orchestrator = ModuleOrchestrator;
    const result = orchestrator.validatePlacement(
      BUILDING_TYPES.BARRACKS,
      { x: 0, y: 0, z: 0 },
      { gold: 1000 }
    );

    expect(result.valid).toBe(true);
  });

  test('Cascade cleanup removes NPC assignments', () => {
    // Place building, assign NPC, delete building
    // Verify NPC is unassigned
  });

  // ... more tests
});
```

---

## Implementation Checklist

### Phase 1 - Quick Wins
- [ ] Fix HP/buildTime mismatches
- [ ] Add patrol route validation
- [ ] Fix population capacity calculation

### Phase 2 - Consolidation
- [ ] Move territory rules to shared config
- [ ] Move town upgrade definitions to shared config
- [ ] Add NPC/population capacities to BUILDING_PROPERTIES

### Phase 3 - Integration
- [ ] Move Module 2 economy thresholds to Module 3
- [ ] Create ModuleOrchestrator
- [ ] Update App.js to use orchestrator

### Phase 4 - Documentation
- [ ] Create ARCHITECTURE.md
- [ ] Create Module 3 README

### Phase 5 - Testing
- [ ] Create integration tests
- [ ] Manual testing of all fixes
- [ ] Performance validation

---

## Success Criteria

After all fixes are implemented:
- ✅ No hardcoded values scattered across multiple files
- ✅ Single source of truth for all constants (shared/config.js)
- ✅ Modules properly orchestrated and validated
- ✅ No memory leaks on building deletion
- ✅ Complete documentation of architecture
- ✅ All edge cases handled
- ✅ Integration tests passing

---

## Questions / Issues

If implementation questions arise:
1. Check the original ARCHITECTURE_REVIEW.md for context
2. Review the module-level READMEs for pattern examples
3. Check existing Module 3 implementation (demonstrates best practices)

---

**Last Updated**: 2025-11-08
**Status**: Implementation Guide v1.0
