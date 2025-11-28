# Foundation Module - Complete Implementation Guide

## Overview

The Foundation Module is the authoritative source of truth for all building placements, properties, and state management in the voxel RPG game. It provides a stable, frozen interface that all other modules (Building Types, Resource Economy, Territory & Town Planning) depend on.

## What Foundation Provides

### 1. Building Placement State System
The authoritative registry of where every building exists and its properties. When another module needs to know "what's at this position?", they ask Foundation.

**Key Methods:**
```javascript
const { getAllBuildings, getBuilding, getBuildingAtPosition } = usePlacement();
```

### 2. Placement Validation Layer
Enforces all rules for where buildings can be placed: grid constraints, terrain compatibility, collision detection, spacing requirements.

**Key Methods:**
```javascript
const { canPlace } = usePlacement();
const validation = canPlace({
  buildingType: 'WALL',
  position: { x: 0, y: 0, z: 0 },
  rotation: 0
});
```

### 3. Building Properties Registry
Central record of every building type with immutable properties: type, HP, build time, resource costs, dimensions.

**Key Methods:**
```javascript
import { getPropertyForBuildingType, getBuildingCosts, getDimensions } from '@/modules/foundation';
const props = getPropertyForBuildingType('WALL');
const costs = getBuildingCosts('WALL');
```

### 4. Coordinate System and Grid
Establishes the fundamental coordinate system used by all base-building systems. Defined in `src/shared/config.js` and agreed upon by all teams.

**Key Constants:**
```javascript
import { GRID, BUILDING_TYPES, BUILDING_STATUS } from '@/modules/foundation';
```

### 5. Interface Contract
Frozen method signatures that other modules depend on. Request changes through this document before implementation.

**Signature Examples:**
```
canPlace(placement) -> validation result
placeBuilding(params) -> building object
removeBuilding(buildingId) -> boolean
getBuildingAtPosition(position) -> building object
```

### 6. Persistence Layer Abstraction
Single point of write for building data. Handles save/load without other modules touching save files.

**Key Methods:**
```javascript
const { saveGame, loadGame, canLoad } = useFoundationPersistence();
```

## How to Use Foundation

### For Placement (Building Placement System)

```javascript
import { usePlacement } from '@/modules/foundation';

function PlacementUI() {
  const { canPlace, placeBuilding, removeBuilding } = usePlacement();

  const handlePlaceWall = (position, rotation) => {
    // Check if placement is valid
    const validation = canPlace({
      buildingType: 'WALL',
      position,
      rotation,
    });

    if (!validation.valid) {
      console.log('Invalid placement:', validation.reason);
      return;
    }

    // Place the building
    const building = placeBuilding({
      type: 'WALL',
      position: validation.snappedPosition,
      rotation: validation.snappedRotation,
    });

    console.log('Placed building:', building.id);
  };

  return <div>{/* UI */}</div>;
}
```

### For Building Mode (UI State Management)

```javascript
import { useBuildingMode } from '@/modules/foundation';

function BuildingModeToggle() {
  const { buildingModeActive, toggleBuildingMode, selectBuilding } = useBuildingMode();

  return (
    <div>
      <button onClick={toggleBuildingMode}>
        {buildingModeActive ? 'Exit Building Mode' : 'Enter Building Mode'}
      </button>
    </div>
  );
}
```

### For Querying Buildings (Resource Economy & Territory Planning)

```javascript
import { usePlacement } from '@/modules/foundation';

// Get all storage buildings to calculate storage capacity
const { getBuildingsByType } = useFoundationStore();
const storages = getBuildingsByType('STORAGE_BUILDING');
const totalCapacity = storages.length * 100; // 100 items each

// Get buildings in an area for territory claiming
const { getBuildingsInRadius } = usePlacement();
const buildingsInArea = getBuildingsInRadius({ x: 0, y: 0, z: 0 }, 50);
```

### For Building Properties (Building Types Module)

```javascript
import {
  getPropertyForBuildingType,
  getBuildingCosts,
  getDimensions,
  getSummary,
} from '@/modules/foundation';

const wallProps = getPropertyForBuildingType('WALL');
const costs = getBuildingCosts('WALL'); // { gold: 20 }
const dims = getDimensions('WALL'); // { width: 1, height: 2, depth: 0.2 }
const summary = getSummary('WALL');
```

### For Persistence (Save/Load)

```javascript
import { useFoundationPersistence } from '@/modules/foundation';

function GameMenu() {
  const { saveGame, loadGame, canLoad } = useFoundationPersistence();

  const handleSave = async () => {
    const success = saveGame();
    if (success) console.log('Game saved!');
  };

  const handleLoad = async () => {
    if (canLoad()) {
      const success = loadGame();
      if (success) console.log('Game loaded!');
    }
  };

  return (
    <div>
      <button onClick={handleSave}>Save Game</button>
      <button onClick={handleLoad} disabled={!canLoad()}>Load Game</button>
    </div>
  );
}
```

## Shared Configuration

All modules use the shared config file at `src/shared/config.js`. This is the Rosetta Stone that ensures consistency:

```javascript
import {
  BUILDING_TYPES,      // {WALL, DOOR, TOWER, ...}
  BUILDING_TIERS,      // {SURVIVAL, PERMANENT, TOWN, CASTLE}
  GRID,               // Grid dimensions, cell size, etc.
  BUILDING_STATUS,    // {BLUEPRINT, BUILDING, COMPLETE, DAMAGED, DESTROYED}
  RESOURCE_TYPES,     // {GOLD, WOOD, STONE, ESSENCE, CRYSTAL}
} from '@/shared/config';
```

### Key Config Values

- **Grid Cell Size**: 1 unit (defined in `GRID.CELL_SIZE`)
- **Grid Dimensions**: 100x100 cells (defined in `GRID.GRID_WIDTH`, `GRID.GRID_HEIGHT`)
- **Rotation Snap**: 90 degrees (defined in `GRID.ROTATION_SNAP`)
- **Max Buildings**: 1000 per world (defined in `PLACEMENT_CONSTRAINTS.MAX_BUILDINGS_PER_WORLD`)

### Changing Grid Constants

If another module needs to change grid dimensions:

1. **DO NOT** change it in your own module
2. **DO** discuss in a team meeting
3. **DO** update `src/shared/config.js` and this document
4. **DO** notify other teams of the breaking change

## API Reference

### useFoundationStore()

Core store with building state.

```javascript
// Add a building
addBuilding(type, position, rotation, properties?)

// Query buildings
getBuilding(id)
getAllBuildings()
getBuildingsByType(type)
getBuildingsByStatus(status)
getBuildingsInRadius(position, radius)
getBuildingAtPosition(position, tolerance)
getBuildingCount()
hasBuilding(id)

// Update building
updateBuilding(id, updates)
moveBuilding(id, newPosition, newRotation)
removeBuilding(id)

// Building state transitions
transitionBuildingStatus(id, newStatus)
updateBuildProgress(id, progress)
damageBuilding(id, amount)
repairBuilding(id, amount)

// Persistence
serializeBuildings() -> { version, nextBuildingId, buildings }
deserializeBuildings(data) -> boolean
clearAllBuildings()
rebuildSpatialHash()
```

### usePlacement()

Main hook for placement operations.

```javascript
// Validation
canPlace(placement) -> validation result

// Building management
placeBuilding({type, position, rotation, skipValidation?}) -> building
removeBuilding(buildingId) -> boolean
moveBuilding(buildingId, newPosition, newRotation?) -> boolean

// Queries
getCost(buildingType) -> costs
getProperties(buildingType) -> properties
getBuildingsInArea(position, radius) -> buildings[]
isPositionOccupied(position) -> building | null
getAllBuildings() -> buildings[]
getBuildingCount() -> number
```

### useBuildingMode()

UI state management for building mode.

```javascript
// State
buildingModeActive -> boolean
selectedBuildingId -> string | null

// Mode control
enterBuildingMode() -> void
exitBuildingMode() -> void
toggleBuildingMode() -> void

// Selection
selectBuilding(id) -> void
deselectBuilding() -> void
getSelectedBuilding() -> building | null
getBuilding(id) -> building | null
```

### useFoundationPersistence()

Persistence layer.

```javascript
// Core
saveGame() -> boolean
loadGame() -> boolean
newGame() -> void

// Checks
canLoad() -> boolean

// Import/Export
exportAsJSON() -> string
importFromJSON(jsonString) -> boolean
createBackup() -> string

// Stats
getStats() -> { totalBuildings, saveVersion, timestamp, hasSave }
```

## Validation Process

When placing a building, Foundation runs these checks in order:

1. **Grid Bounds** - Is position within the defined grid?
2. **Grid Snap** - Snap position to grid cells
3. **Rotation** - Is rotation valid?
4. **Height** - Is Y position within allowed range?
5. **Collisions** - Does building collide with others?
6. **Spacing** - Does building meet minimum distance requirements?
7. **Capacity** - Is world under maximum building count?

If any check fails, placement is rejected. Other modules can check `validation.checks` to see which specific checks failed.

## Building State Lifecycle

```
BLUEPRINT (placed, not started)
    ↓
BUILDING (under construction, progress 0-99%)
    ↓
COMPLETE (finished, operational)
    ↓ (if damaged)
DAMAGED (can be repaired)
    ↓ (if destroyed)
DESTROYED (cannot be repaired)
```

## Module Dependencies

**Foundation has NO dependencies on other modules.**

Other modules depend on Foundation:
- **Building Types** depends on Foundation for placement registry
- **Resource Economy** depends on Foundation for building queries and costs
- **Territory & Town Planning** depends on Foundation for area queries and building counts

## Extending Foundation

If another module needs new functionality:

### Option 1: Use Existing Methods
Check if the need can be solved with existing methods. For example, instead of a new method "buildingsInSquare", use "getBuildingsInRadius" and filter.

### Option 2: Request a New Method
Submit a request with:
1. Method signature and description
2. Why existing methods don't work
3. How other modules might use it

### Option 3: Use Store Directly
For advanced queries, other modules can use `useFoundationStore()` directly, but this is less stable as the internal structure might change.

## Performance Considerations

### Spatial Hash
Foundation uses spatial hashing for efficient area queries. Grid cells are 5x5 units.

```javascript
// This query is O(cells in radius), not O(all buildings)
const nearby = getBuildingsInRadius(position, 50);
```

### Building Limit
World is limited to 1000 buildings for performance. Enforce this in Resource Economy module when calculating costs.

```javascript
if (buildingCount >= 1000) {
  console.log('World is at capacity');
}
```

## Troubleshooting

### "Placement validation failed"
Check the validation result's `reason` field for specific failures.

```javascript
const validation = canPlace({...});
console.log(validation.checks); // See which checks failed
```

### "Building not found"
Ensure you're using the correct building ID format: `building_123`

### "Cannot load save"
Check that the save file version matches `SAVE_VERSION` in config.

## Summary

Foundation is the single source of truth for:
- Where buildings are placed
- What buildings exist
- Whether placements are valid
- How building data is saved/loaded

All placement logic goes through Foundation. All building queries go through Foundation. All save/load goes through Foundation.

This prevents conflicts and ensures consistency across all modules.
