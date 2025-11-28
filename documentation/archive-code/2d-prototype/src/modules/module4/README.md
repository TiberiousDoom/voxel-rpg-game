# Module 4: Territory, Town Planning & Aesthetics

## Overview

Module 4 is the town management and systems layer of the Voxel RPG Game. It zooms out from individual buildings (Module 2) and resource production (Module 3) to manage the territory as a whole, including town-level upgrades, NPC placement, aesthetic systems, and victory conditions.

## Core Responsibilities

Module 4 owns and manages:

### 1. Territory Claiming and Expansion
- **Territory Boundaries**: Define claimed regions with a center point and radius
- **Expansion Mechanics**: Expand territory based on watchtowers, guard posts, fortresses, and castles
- **Territory Validation**: Prevent overlaps and enforce minimum separation between territories
- **Expansion Requirements**: Calculate what buildings are needed to reach a target radius

### 2. Territory-Level Bonuses
- **Vision Range**: Watchtowers and fortifications extend vision range
- **Enemy Spawn Rate**: Defensive structures reduce enemy spawning
- **Defense Rating**: Buildings contribute to town defense
- **Prosperity**: Production buildings increase town prosperity
- **NPC Happiness**: Monuments and castles improve NPC morale
- **Resource Production**: Territory bonuses apply multipliers to base production

### 3. Town-Level Upgrades
- **Cosmetic Upgrades**: Monuments, decorations, visual polish
- **Functional Upgrades**: Better marketplaces, improved storage, enhanced crafting
- **Defensive Upgrades**: City walls, fortified gates, enhanced defenses
- **Upgrade Progression**: Unlock upgrades based on buildings and achievements

### 4. Town Statistics and Status
- **Population Tracking**: Current NPCs and population capacity
- **Happiness Rating**: Aggregate NPC morale and satisfaction
- **Defense Rating**: Combined defensive building power
- **Prosperity Index**: Economic health and growth potential
- **Production Rate**: Territory-wide resource generation multiplier
- **Aesthetic Rating**: Overall town visual appeal

### 5. NPC Placement and Management
- **NPC Roles**: Guards, Traders, Crafters, Scouts, Farmers
- **Building Assignment**: Assign NPCs to specific buildings
- **Patrol Routes**: Set NPCs to patrol between multiple buildings
- **Morale and Productivity**: Track NPC satisfaction and work efficiency
- **Population Limits**: Enforce capacity limits per building type

### 6. Aesthetic Systems
- **Decorative Elements**: Flags, monuments, lighting, gardens
- **Visual Polish**: Street designs, boundary markers, town markers
- **Thematic Consistency**: Coordinate aesthetics with town character
- **Aesthetic Rating**: Measure overall town visual appeal

### 7. Victory and Progression Conditions
- **Building Count Milestones**: "Build 10 structures", "Build 20 structures"
- **Population Milestones**: "Reach 50 NPCs", "Reach 100 NPCs"
- **Territory Expansion**: "Expand territory to 50 cell radius"
- **Building Type Goals**: "Build a Fortress", "Build a Castle"
- **Upgrade Completion**: "Complete 5 town upgrades"
- **Castle Victory**: Ultimate win condition - build a castle

## Core Stores

### useTerritory
Manages all territory-related state and operations.

```javascript
import { useTerritory } from '@/modules/module4';

const store = useTerritory();

// Create a territory
store.createTerritory('My Territory', { x: 0, y: 0, z: 0 });

// Get active territory
const territory = store.getActiveTerritory();

// Expand territory
store.expandTerritory(territoryId, 50, buildings);

// Get bonuses
const bonuses = store.getTerritoryBonuses(territoryId);

// Update bounds based on buildings
store.updateTerritoryBounds(territoryId, buildings);
```

### useTownManagement
Manages town statistics, upgrades, and improvements.

```javascript
import { useTownManagement } from '@/modules/module4';

const store = useTownManagement();

// Create a town
store.createTown('My Town', territoryId);

// Get town statistics
const stats = store.getTownStatistics(townId);
// { population, happiness, defense, prosperity, productionRate, ... }

// Update statistics based on buildings and NPCs
store.updateTownStatistics(townId, buildings, npcs);

// Complete an upgrade
store.completeUpgrade(townId, 'city_wall');

// Check if upgrade is available
const available = store.isUpgradeAvailable(townId, 'city_wall', buildings);
```

### useNPCSystem
Manages NPC creation, assignment, and management.

```javascript
import { useNPCSystem } from '@/modules/module4';

const store = useNPCSystem();

// Create an NPC
store.createNPC('Guard01', 'GUARD');

// Assign NPC to building
store.assignNPCToBuilding(npcId, buildingId, 'BARRACKS');

// Update NPC morale
store.updateNPCMorale(npcId, 80);

// Set patrol route
store.setPatrolRoute(npcId, [buildingId1, buildingId2, buildingId3]);

// Get NPCs in building
const npcsInBuilding = store.getNPCsInBuilding(buildingId);

// Get statistics
const roleCount = store.getNPCCountByRole();
const population = store.getTotalPopulation();
```

### useProgressionSystem
Manages victory conditions and progression tracking.

```javascript
import { useProgressionSystem } from '@/modules/module4';

const store = useProgressionSystem();

// Check victory conditions
store.checkVictoryConditions({
  buildings,
  npcs,
  territoryRadius,
  upgrades,
});

// Complete a condition
store.completeVictoryCondition('basic_settlement');

// Unlock an upgrade
store.unlockUpgrade('fortress_unlock');

// Award achievement
store.awardAchievement('first_watchtower', 'First Watchtower', 'Build your first watchtower');

// Get game state
const progress = store.getOverallProgress();
const hasWon = store.hasWon();
```

## Utility Functions

### Building Classification

```javascript
import {
  classifyBuilding,
  getSuitableNPCRoles,
  getNPCCapacity,
  getTerritoryBonuses,
  getAestheticValue
} from '@/modules/module4';

// Classify a building
const classification = classifyBuilding('WATCHTOWER');
// { isTerritoryControl: true, isNPCAssignable: false, ... }

// Get NPC roles for building
const roles = getSuitableNPCRoles('BARRACKS');
// ['GUARD', 'SCOUT']

// Get NPC capacity
const capacity = getNPCCapacity('BARRACKS'); // 8

// Get bonuses provided by building
const bonuses = getTerritoryBonuses('WATCHTOWER');
// [{ type: 'VISION_RANGE', magnitude: 10, ... }]

// Get aesthetic contribution
const aesthetic = getAestheticValue('CASTLE'); // 100
```

### Territory Validation

```javascript
import {
  calculateMaxTerritoryRadius,
  validateExpansion,
  getExpansionRequirements,
  isPositionInTerritory,
} from '@/modules/module4';

// Calculate max radius based on buildings
const maxRadius = calculateMaxTerritoryRadius(buildings);

// Validate expansion
const validation = validateExpansion(territory, 75, buildings);
if (validation.valid) {
  // Can expand
} else {
  console.log(validation.error);
}

// Get requirements to reach target radius
const requirements = getExpansionRequirements(75, currentBuildings);
// { possible: true, missing: { watchtower: 3 } }

// Check if position is in territory
const inTerritory = isPositionInTerritory(position, center, radius);
```

### Bonus Calculation

```javascript
import {
  calculateTerritoryBonuses,
  calculateTownStatistics,
  applyProductionMultipliers,
  applyDefenseMultipliers,
  calculateTownLevel,
} from '@/modules/module4';

// Calculate bonuses from buildings
const bonuses = calculateTerritoryBonuses(buildings);
// { VISION_RANGE: 10, DEFENSE_RATING: 5, ... }

// Calculate town stats
const stats = calculateTownStatistics(buildings, npcs, upgrades);
// { population, happiness, defense, prosperity, ... }

// Apply multipliers to production
const finalProduction = applyProductionMultipliers(bonuses, 100);
// Base 100 * (1 + bonuses) = adjusted rate

// Apply to defense
const defense = applyDefenseMultipliers(bonuses, 50);

// Get town level
const level = calculateTownLevel(stats);
```

## Integration with Other Modules

### Foundation Module Integration
Module 4 queries Foundation heavily to understand the physical layout:

```javascript
import { useFoundationStore } from '@/modules/foundation';

const foundationStore = useFoundationStore();

// Get buildings in territory area
const buildings = foundationStore.getBuildingsInRadius(
  { x: 0, y: 0, z: 0 },
  territory.radius
);

// Get building by type
const watchtowers = foundationStore.getBuildingsByType('WATCHTOWER');

// Check occupancy before placing NPCs
const occupied = foundationStore.getBuildingAtPosition(position);
```

### Module 2 Integration (Building Types)
Module 4 reads building classifications from Module 2 via config:

```javascript
import { BUILDING_TYPES, BUILDING_PROPERTIES } from '@/shared/config';

// Check if building is available
const properties = BUILDING_PROPERTIES[BUILDING_TYPES.WATCHTOWER];

// Use tier information for progression gates
const tier = properties.tier; // 'PERMANENT', 'TOWN', 'CASTLE'
```

### Module 3 Integration (Resource Economy)
Module 4 reads and applies bonuses to Module 3's outputs:

```javascript
// Module 3 provides: base production = 100 wood/minute
// Module 4 applies: RESOURCE_PRODUCTION bonus = +20%
// Result: 100 * (1 + 0.20) = 120 wood/minute

const baseProduction = 100; // from Module 3
const bonuses = calculateTerritoryBonuses(buildings);
const finalProduction = applyProductionMultipliers(bonuses, baseProduction);
```

## Critical Boundary Rules (Guardrails)

### Module 4 Must NOT
- ❌ Define building types or costs (those are Modules 2 and 3)
- ❌ Modify Foundation's building placement data directly
- ❌ Change how base resource generation works (that's Module 3)
- ❌ Create new tier progressions (that's Module 2)
- ❌ Contradict or bypass Module 3's economic calculations

### What Module 4 DOES Own
- ✅ Territory boundaries and expansion calculations
- ✅ Territory bonuses applied on top of Module 3 values
- ✅ Town-level aggregation and statistics
- ✅ NPC placement within buildings
- ✅ Town upgrades and improvements
- ✅ Aesthetic systems and decorations
- ✅ Victory conditions and progression tracking

## Data Structures

### Territory
```javascript
{
  id: 'territory_1',
  name: 'Home Territory',
  center: { x: 0, y: 0, z: 0 },
  radius: 25,
  maxRadius: 75,
  claimedAtTime: 1699540000000,
  bonuses: { VISION_RANGE: 10, DEFENSE_RATING: 5 },
  buildingIds: ['building_1', 'building_2'],
  active: true,
}
```

### Town
```javascript
{
  id: 'town_1',
  name: 'My Town',
  territoryId: 'territory_1',
  statistics: {
    population: 50,
    happiness: 75,
    defense: 60,
    prosperity: 40,
    productionRate: 1.2,
    totalBuildingCount: 15,
    buildingCounts: { WATCHTOWER: 2, BARRACKS: 1, ... }
  },
  upgrades: { city_wall: { completed: true }, ... },
  aesthetics: { elementCount: 5, aestheticRating: 65 },
  level: 3,
}
```

### NPC
```javascript
{
  id: 'npc_1',
  name: 'Guard01',
  role: 'GUARD',
  assignedBuildingId: 'building_5',
  patrolRoute: [],
  position: { x: 10, y: 0, z: 20 },
  status: 'WORKING',
  morale: 80,
  productivity: 1.0,
}
```

### Victory Condition
```javascript
{
  id: 'basic_settlement',
  type: 'BUILDING_COUNT',
  description: 'Build 10 structures',
  requirements: { buildingCount: 10 },
  completed: false,
  progress: 60,
  reward: 'unlock_town_upgrades',
}
```

## Usage Examples

### Setup: Create Territory and Town
```javascript
import { useTerritory, useTownManagement, useNPCSystem } from '@/modules/module4';

// Create territory
const territoryStore = useTerritory();
territoryStore.createTerritory('My Settlement', { x: 0, y: 0, z: 0 });
const territory = territoryStore.getActiveTerritory();

// Create town in territory
const townStore = useTownManagement();
townStore.createTown('Capital City', territory.id);
const town = townStore.getActiveTown();
```

### Add NPCs to Town
```javascript
const npcStore = useNPCSystem();

// Create NPCs
npcStore.createNPC('Guard01', 'GUARD');
npcStore.createNPC('Trader01', 'TRADER');

// Assign them to buildings
npcStore.assignNPCToBuilding('npc_1', 'building_5', 'BARRACKS');
npcStore.assignNPCToBuilding('npc_2', 'building_6', 'MARKETPLACE');
```

### Complete Town Upgrades
```javascript
const townStore = useTownManagement();

// Check if available
const available = townStore.isUpgradeAvailable('town_1', 'city_wall', buildings);
if (available.available) {
  townStore.completeUpgrade('town_1', 'city_wall');
}
```

### Expand Territory
```javascript
const territoryStore = useTerritory();

// Try to expand
const result = territoryStore.expandTerritory('territory_1', 50, buildings);
if (result.success) {
  console.log('Territory expanded!');
} else {
  console.log('Cannot expand:', result.error);
}

// Check what's needed
const requirements = territoryStore.getExpansionPath('territory_1', 75, buildings);
console.log('Need:', requirements.missing); // { watchtower: 3 }
```

### Track Progression
```javascript
const progressionStore = useProgressionSystem();

// Check victory conditions
progressionStore.checkVictoryConditions({
  buildings,
  npcs,
  territoryRadius: 50,
  upgrades: [{ id: 'city_wall', completed: true }],
});

// Get progress
const overall = progressionStore.getOverallProgress(); // 65%
const conditions = progressionStore.getVictoryConditions();

// Check if won
if (progressionStore.hasWon()) {
  console.log('Victory!');
}
```

## Performance Considerations

- **Bonus Recalculation**: Only recalculate bonuses when buildings change
- **Statistics Updates**: Batch statistics updates to avoid excessive recalculation
- **NPC Management**: Use maps and efficient lookups for NPC assignment queries
- **Spatial Queries**: Leverage Foundation's spatial hash for area queries

## Future Enhancements

- [ ] Territory influence zones (gradual bonus degradation)
- [ ] NPC AI pathfinding and autonomous scheduling
- [ ] Town themes and cosmetic themes
- [ ] Diplomacy system (multiple towns/empires)
- [ ] Town events and disasters
- [ ] Migration and population growth
- [ ] Town specialization (military, trade, agricultural)
- [ ] Seasonal effects and time-based events

## Maintenance Notes

### Adding New Building Bonuses
1. Define bonus type in `types/index.js`
2. Add building mappings in `buildingClassifier.js` → `getTerritoryBonuses()`
3. Add calculation logic in `bonusCalculator.js`
4. Module 2 defines the building itself

### Adding New Upgrades
1. Add to `DEFAULT_UPGRADES` in `useTownManagement.js`
2. Define unlock conditions in `useProgressionSystem.js`
3. Create UI in components

### Adding New Victory Conditions
1. Add to `DEFAULT_VICTORY_CONDITIONS` in `useProgressionSystem.js`
2. Add check logic in `checkVictoryConditions()` method
3. Define rewards in `applyReward()` method
