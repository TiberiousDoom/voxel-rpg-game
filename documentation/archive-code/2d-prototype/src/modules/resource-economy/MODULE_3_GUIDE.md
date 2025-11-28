# Module 3: Resource Economy & Crafting - Developer Guide

## Overview

Module 3 is the **economic simulation** of the voxel RPG game. It answers fundamental questions about the game's economy:

- **"How much does this cost?"** - Building costs and crafting material requirements
- **"How long does it take?"** - Construction times and build queues
- **"What resources are stored where?"** - Storage capacity and inventory management
- **"What does this building produce?"** - Production rates for production buildings

## What Module 3 Owns

Module 3 is responsible for:

1. **Building Costs** - Every building has specific resource requirements
   - Example: "A castle costs 500 gold, 100 essence, 200 stone, 50 crystal"
   - Defined in `config.js` and accessed via `buildingRegistry`

2. **Construction Time** - How long each building takes to build
   - Example: "Campfire takes 5 seconds, castle takes 3 minutes"
   - Defined in `config.js`

3. **Build Queues** - Managing multiple constructions at once
   - "You have 3 buildings under construction with this timeline"
   - Managed by `BuildQueueManager`

4. **Crafting Recipes** - Material requirements for crafting items
   - 15 craftable items with specific material needs
   - Database in `craftingRecipes.js`

5. **Resource Storage** - Storage capacity limits
   - Storage buildings provide inventory space
   - Each storage building holds 500 units
   - Personal chests hold 100 units

6. **Production Buildings** - What buildings can produce
   - Configuration of which buildings produce which resources
   - Base production rates (without territory bonuses)

7. **Economic Scaling** - How costs change with progression
   - Early game buildings are cheap
   - Late-game structures (castle tier) are expensive
   - Organized in 4 progression tiers

## What Module 3 Does NOT Own

Module 3 deliberately does NOT own:

1. **Building Definitions** - What buildings exist
   - Module 2 already defines this
   - Module 3 only assigns costs to Module 2's buildings

2. **Building Placement/Validation** - Where buildings can go
   - Foundation module handles this
   - Module 3 doesn't decide placement rules

3. **Territory Bonuses** - Town-level economy effects
   - Module 4 will handle this
   - Example: "Your town generates 10 extra wood per second"
   - Module 3 only knows: "This farm generates 1 wood per second base rate"

4. **NPC Behavior** - How NPCs use resources
   - This is gameplay/AI logic
   - Module 3 just defines the recipes

5. **Building Functionality** - What buildings DO
   - Module 3 defines costs/time
   - Other systems define what buildings actually do

## Architecture

### Core Files

```
src/modules/resource-economy/
├── ResourceEconomyModule.js           # Main public API
├── managers/
│   └── BuildQueueManager.js           # Construction queue management
├── stores/
│   └── useResourceEconomyStore.js     # Zustand store for economy state
├── utils/
│   └── resourceCalculations.js        # Pure functions for economic math
├── config/
│   └── productionBuildings.js         # Production rates and storage capacity
└── MODULE_3_GUIDE.md                  # This file
```

### Key Classes and Stores

#### BuildQueueManager
Manages which buildings are under construction and their progress.

```javascript
import { buildQueueManager } from './managers/BuildQueueManager';

// Add building to queue
buildQueueManager.addToQueue(building);

// Update all progress (call every frame)
const completed = buildQueueManager.updateProgress();

// Get progress of specific building
const progress = buildQueueManager.getProgress(buildingId);
// Returns: { buildingId, progress (0-100), timeRemaining (ms), ... }
```

#### useResourceEconomyStore
Zustand store for all economy state. Use Zustand patterns:

```javascript
import { useResourceEconomyStore } from './stores/useResourceEconomyStore';

// In components
const { startConstruction, getConstructionProgress } = useResourceEconomyStore();

// Get state
const economyState = useResourceEconomyStore.getState();

// Subscribe to changes
useResourceEconomyStore.subscribe(
  (state) => state.storageState,
  (storageState) => console.log('Storage changed:', storageState)
);
```

#### ResourceEconomyModule
Public API for all Module 3 functionality. This is what other modules import.

```javascript
import ResourceEconomyModule from './ResourceEconomyModule';

// Check affordability
const canBuild = ResourceEconomyModule.canBuild(buildingType, inventory);
// Returns: { canBuild, missingResources, costs }

// Start construction
const result = ResourceEconomyModule.startConstruction(building, inventory, foundationStore);
// Returns: { success, buildingId, updatedInventory, buildTime }

// Get costs
const costs = ResourceEconomyModule.getBuildingCosts('WALL');
// Returns: { GOLD: 20 }

// Update progress (call every frame)
const completed = ResourceEconomyModule.updateConstructionProgress(foundationStore);
// Returns: Array of building IDs that just completed
```

## How Module 3 Relates to Other Modules

### Relationship with Foundation (Module 1)

Module 3 **queries** Foundation but does NOT modify buildings directly:

```javascript
// ✅ DO: Query buildings from Foundation
const allBuildings = foundationStore.getAllBuildings();
const buildingType = building.type;

// ❌ DON'T: Directly call Foundation placement methods
// That's Foundation's responsibility

// ✅ DO: Call Foundation's update for status changes
foundationStore.updateBuilding(buildingId, {
  status: BUILDING_STATUS.BUILDING,
});
```

### Relationship with Module 2 (Building Types)

Module 3 imports and uses Module 2's definitions but doesn't create new building concepts:

```javascript
// ✅ DO: Import and use Module 2's building types
import { BUILDING_TYPES, BUILDING_PROPERTIES } from '../../shared/config';

// ✅ DO: Layer costs on top of Module 2's definitions
const costs = BUILDING_PROPERTIES[BUILDING_TYPES.WALL].costs;

// ❌ DON'T: Create your own building concepts
// If Module 2 doesn't define a building, Module 3 can't cost it
```

### Relationship with Module 4 (Territory & Town Planning)

Module 3 provides base rates. Module 4 applies bonuses:

```javascript
// Module 3 knows:
// "This farm generates 1 wood per second base"
const baseProduction = { WOOD: 1 };

// Module 4 will know:
// "Your town is in a forest, so farms are 25% more productive"
const territoryBonus = 1.25;
const finalProduction = baseProduction.WOOD * territoryBonus; // 1.25
```

## Common Usage Patterns

### Pattern 1: Building Placement with Cost Validation

When player clicks to place a building:

```javascript
import ResourceEconomyModule from './ResourceEconomyModule';
import { useGameStore } from './stores/useGameStore';
import { useFoundationStore } from './modules/foundation/stores/useFoundationStore';

// Get current state
const inventory = useGameStore.getState().inventory;
const foundationStore = useFoundationStore.getState();

// Check affordability
const canBuild = ResourceEconomyModule.canBuild('WALL', inventory);
if (!canBuild.canBuild) {
  console.log('Missing resources:', canBuild.missingResources);
  return; // Don't place building
}

// Create building in Foundation (they handle placement validation)
const building = foundationStore.addBuilding('WALL', position, rotation);

// Start construction in Module 3
const result = ResourceEconomyModule.startConstruction(
  building,
  inventory,
  foundationStore
);

if (result.success) {
  // Update player inventory
  useGameStore.getState().inventory = result.updatedInventory;
} else {
  console.error('Failed to start construction:', result.error);
}
```

### Pattern 2: Update Construction Every Frame

In your game loop or update hook:

```javascript
import ResourceEconomyModule from './ResourceEconomyModule';
import { useFoundationStore } from './modules/foundation/stores/useFoundationStore';

// In your animation loop or useEffect with interval
const foundationStore = useFoundationStore.getState();
const completed = ResourceEconomyModule.updateConstructionProgress(foundationStore);

// Handle completed buildings
completed.forEach((buildingId) => {
  console.log(`Building ${buildingId} is complete!`);
  playCompletionSound();
});
```

### Pattern 3: Display Construction Queue UI

```javascript
import { useResourceEconomyStore } from './resource-economy/stores/useResourceEconomyStore';
import ResourceEconomyModule from './resource-economy/ResourceEconomyModule';

// In component
const allConstructing = ResourceEconomyModule.getAllConstructing();
const queueSize = ResourceEconomyModule.getConstructionQueueSize();
const totalTime = ResourceEconomyModule.getTotalConstructionTime();

return (
  <div>
    <p>Buildings under construction: {queueSize}</p>
    <p>Total time remaining: {(totalTime / 1000).toFixed(1)}s</p>
    {allConstructing.map((entry) => {
      const progress = ResourceEconomyModule.getConstructionProgress(entry.buildingId);
      return (
        <div key={entry.buildingId}>
          <p>{entry.type}: {progress.percentComplete.toFixed(1)}%</p>
          <ProgressBar value={progress.progress} max={100} />
        </div>
      );
    })}
  </div>
);
```

### Pattern 4: Crafting an Item

```javascript
import ResourceEconomyModule from './ResourceEconomyModule';
import { useGameStore } from './stores/useGameStore';

const inventory = useGameStore.getState().inventory;

// Check if can craft
const canCraft = ResourceEconomyModule.canCraft('steelSword', inventory);
if (!canCraft.canCraft) {
  console.log('Missing materials:', canCraft.missingMaterials);
  return;
}

// Craft the item (handle in CraftingUI or game system)
const updatedInventory = consumeCraftingMaterials('steelSword', inventory);
useGameStore.getState().inventory = updatedInventory;
useGameStore.getState().addItem(canCraft.recipe);
```

### Pattern 5: Storage Management

```javascript
import ResourceEconomyModule from './ResourceEconomyModule';
import { useFoundationStore } from './modules/foundation/stores/useFoundationStore';

const foundationStore = useFoundationStore.getState();

// Get all storage buildings
const storageBuildings = foundationStore.getBuildingsByType('STORAGE_BUILDING');

// Update storage state
const currentInventory = useGameStore.getState().inventory;
ResourceEconomyModule.updateStorageState(storageBuildings, currentInventory);

// Check storage status
const utilization = ResourceEconomyModule.getStorageUtilization();
const available = ResourceEconomyModule.getAvailableStorage();
const isFull = ResourceEconomyModule.isStorageFull();

console.log(`Storage: ${utilization.toFixed(1)}% full`);
console.log(`Available space: ${available} units`);
```

## Building Costs Reference

All costs defined in `config.js` in `BUILDING_PROPERTIES`:

```javascript
SURVIVAL TIER (Early Game)
- WALL:     20 GOLD
- DOOR:     25 GOLD + 10 WOOD
- CHEST:    15 GOLD + 20 WOOD

PERMANENT TIER
- TOWER:    50 GOLD + 5 ESSENCE
- WATCHTOWER: 75 GOLD + 10 ESSENCE + 20 STONE
- GUARD_POST: 60 GOLD + 8 ESSENCE

TOWN TIER
- CRAFTING_STATION: 75 GOLD + 10 ESSENCE + 5 CRYSTAL
- STORAGE_BUILDING: 100 GOLD + 15 ESSENCE + 30 STONE
- BARRACKS:        120 GOLD + 20 ESSENCE + 40 STONE
- MARKETPLACE:     150 GOLD + 25 ESSENCE + 10 CRYSTAL

CASTLE TIER (Late Game)
- FORTRESS: 300 GOLD + 50 ESSENCE + 100 STONE + 20 CRYSTAL
- CASTLE:   500 GOLD + 100 ESSENCE + 200 STONE + 50 CRYSTAL
```

## Build Times Reference

All times in seconds (defined in `config.js`):

```javascript
SURVIVAL TIER: 5-10 seconds
PERMANENT TIER: 20-30 seconds
TOWN TIER: 35-50 seconds
CASTLE TIER: 120-180 seconds (2-3 minutes)
```

## Storage Capacity Reference

```javascript
CHEST: 100 units per building
STORAGE_BUILDING: 500 units per building

Total capacity = sum of all storage buildings
```

## Key Functions in resourceCalculations.js

```javascript
// Validation
canBuildBuilding(buildingType, inventory)
canCraftItem(recipeId, inventory)

// Cost/material consumption
consumeBuildingCosts(buildingType, inventory)
consumeCraftingMaterials(recipeId, inventory)
refundBuildingCosts(buildingType, inventory)

// Queries
getAffordableBuildings(inventory, buildingTypes)
getDepletedResources(inventory)

// Display helpers
formatResourceAmount(amount)       // 1000 -> "1K"
calculateInventoryValue(inventory) // Total net worth

// Storage
checkStorageCapacity(currentStorage, maxCapacity, resourceToAdd)
```

## State Structure

### useResourceEconomyStore State

```javascript
{
  buildQueue: BuildQueueManager,           // Singleton build queue manager
  pendingConstructions: Map,               // buildingId -> construction data
  storageState: {
    currentUsage: { resource: amount },    // Current inventory
    maxCapacity: number,                   // Total storage capacity
    isFull: boolean,                       // Whether storage is at limit
  },
  economicHistory: {
    buildingsCompleted: number,
    itemsCrafted: number,
    totalResourcesSpent: number,
    buildingStartedAt: timestamp,
  },
}
```

## Integration Checklist

When integrating Module 3 into your components/systems:

- [ ] Import `ResourceEconomyModule` for public API
- [ ] Call `updateConstructionProgress()` every frame
- [ ] Call `updateStorageState()` when storage buildings change
- [ ] Use `canBuild()` before allowing placement
- [ ] Use `canCraft()` before allowing crafting
- [ ] Consume inventory resources with returned `updatedInventory`
- [ ] Handle `buildingCompleted` events
- [ ] Display construction queue UI
- [ ] Display storage capacity UI
- [ ] Handle resource depletion gracefully

## Debugging

### Log all construction activity:

```javascript
const economyStore = useResourceEconomyStore.getState();
console.log('Queue:', economyStore.buildQueue.getAllInQueue());
console.log('Storage:', economyStore.storageState);
console.log('History:', economyStore.economicHistory);
```

### Check building affordability:

```javascript
const result = ResourceEconomyModule.canBuild('CASTLE', inventory);
console.log('Can build CASTLE?', result);
```

### Check crafting:

```javascript
const result = ResourceEconomyModule.canCraft('steelSword', inventory);
console.log('Can craft Steel Sword?', result);
```

## Future Expansion

Module 3 is designed to be extensible for:

1. **Module 4 Integration** - Territory bonuses will multiply production rates
2. **Trading System** - Marketplace functionality (currently skeleton only)
3. **NPC Workers** - NPCs using resources from buildings
4. **Economic Scaling** - Dynamic cost adjustments based on territory growth
5. **Resource Degradation** - Resources decay over time or require maintenance
6. **Economic Events** - Price fluctuations, shortages, surpluses

All of these can be added without breaking the Module 3 API.

## Version History

- **v1.0** (2025) - Initial implementation
  - Core building cost system
  - Build queue management
  - Crafting recipes
  - Storage capacity tracking
  - Production building framework

## Questions?

For questions about Module 3 implementation:
1. Check the test examples in this guide
2. Review the code comments in each file
3. Check the public API in `ResourceEconomyModule.js`
4. Review Module 3's relationship with Foundation and Module 2

---

**Module 3 is part of the larger modular building system. Always coordinate with Module 1 (Foundation) and Module 2 (Building Types) when making changes.**
