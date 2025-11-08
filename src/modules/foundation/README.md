# Foundation Module

The Foundation Module is the authoritative source of truth for all building placements, properties, and state management in the voxel RPG game. It provides a stable, frozen interface that all other modules depend on.

## Quick Start

### Basic Usage

```javascript
// Place a building
import { usePlacement } from '@/modules/foundation';

const { canPlace, placeBuilding } = usePlacement();

// Check if placement is valid
const validation = canPlace({
  buildingType: 'WALL',
  position: { x: 0, y: 1, z: 0 },
  rotation: 0,
});

if (validation.valid) {
  // Place the building
  const building = placeBuilding({
    type: 'WALL',
    position: validation.snappedPosition,
    rotation: validation.snappedRotation,
  });
}
```

### Query Buildings

```javascript
import { useFoundationStore } from '@/modules/foundation';

// Get all buildings
const buildings = useFoundationStore((state) => state.getAllBuildings());

// Get buildings of a specific type
const walls = useFoundationStore((state) => state.getBuildingsByType('WALL'));

// Get buildings in an area
const nearby = useFoundationStore((state) =>
  state.getBuildingsInRadius({ x: 0, y: 0, z: 0 }, 50)
);
```

### Save and Load

```javascript
import { useFoundationPersistence } from '@/modules/foundation';

const { saveGame, loadGame, canLoad } = useFoundationPersistence();

// Save the game
saveGame(); // Returns true/false

// Load the game
if (canLoad()) {
  loadGame();
}
```

## Module Structure

```
src/modules/foundation/
├── components/              # React components for rendering
│   ├── FoundationView.jsx   # Main rendering component
│   └── PlacementPreview.jsx # Preview while placing
├── stores/
│   └── useFoundationStore.js # Zustand store with state management
├── hooks/
│   ├── usePlacement.js      # Main placement hook
│   ├── useBuildingMode.js   # Building mode UI state
│   └── useFoundationPersistence.js # Save/load functionality
├── utils/
│   ├── validator.js         # Placement validation logic
│   ├── buildingRegistry.js  # Building properties and metadata
│   ├── spatialHash.js       # Efficient spatial queries
│   └── persistence.js       # Storage utilities
├── FOUNDATION_MODULE_GUIDE.md # Detailed API documentation
├── INTEGRATION_EXAMPLE.md   # How to integrate with game
├── index.js                 # Module exports
└── README.md               # This file
```

## Key Concepts

### The Building Placement State System

Foundation maintains the authoritative registry of all buildings. When another module needs to know "what's at this position?", they ask Foundation through the public API.

```javascript
// Get building at a position
const building = useFoundationStore((state) =>
  state.getBuildingAtPosition({ x: 5, y: 1, z: 5 })
);
```

### The Validation Layer

All placement rules are enforced through Foundation's validation system. Before placing a building, validation checks:

1. **Grid Bounds** - Is position within the defined grid?
2. **Grid Snap** - Snap position to grid cells
3. **Rotation** - Is rotation valid?
4. **Height** - Is Y position within allowed range?
5. **Collisions** - Does building collide with others?
6. **Spacing** - Does building meet minimum distance requirements?
7. **Capacity** - Is world under maximum building count?

```javascript
const validation = canPlace({
  buildingType: 'WALL',
  position: { x: 0, y: 1, z: 0 },
});

console.log(validation.checks); // See each check result
```

### The Building Properties Registry

Foundation provides convenient access to all building metadata without requiring other modules to import config directly.

```javascript
import { getSummary, getBuildingCosts, getDimensions } from '@/modules/foundation';

const summary = getSummary('WALL');
// {
//   name: 'Wall',
//   description: '...',
//   tier: 'SURVIVAL',
//   hp: 50,
//   buildTime: 5,
//   costs: { gold: 20 },
//   ...
// }
```

### The Coordinate System

Foundation establishes the grid:
- **Cell Size**: 1 unit
- **Grid Dimensions**: 100x100 cells
- **Origin**: (-50, -50) in world space
- **Rotation**: 90-degree snaps only
- **Height Range**: -10 to 50 units

All coordinates are global and consistent across all modules.

### The Interface Contract

Foundation publishes specific method signatures that are frozen and stable:

```
canPlace(placement) -> { valid, checks, reason, snappedPosition, snappedRotation }
placeBuilding(params) -> building | null
removeBuilding(buildingId) -> boolean
getBuildingAtPosition(position) -> building | null
```

Other modules depend on these exact signatures. Changes require team discussion.

### Persistence

Foundation handles all save/load operations. Other modules don't touch the save file directly.

```javascript
const data = serializeBuildings(); // Get data
const success = deserializeBuildings(data); // Load data
```

## API Reference

### useFoundationStore()

Core Zustand store.

**Building Management:**
```javascript
addBuilding(type, position, rotation, properties?)
removeBuilding(buildingId)
updateBuilding(id, updates)
moveBuilding(id, newPosition, newRotation)
```

**Queries:**
```javascript
getBuilding(id)
getAllBuildings()
getBuildingsByType(type)
getBuildingsByStatus(status)
getBuildingsInRadius(position, radius)
getBuildingAtPosition(position, tolerance)
getBuildingCount()
hasBuilding(id)
```

**State Transitions:**
```javascript
transitionBuildingStatus(id, newStatus)
updateBuildProgress(id, progress)
damageBuilding(id, amount)
repairBuilding(id, amount)
```

**Persistence:**
```javascript
serializeBuildings()
deserializeBuildings(data)
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

UI state for building mode.

```javascript
// State
buildingModeActive // boolean
selectedBuildingId // string | null

// Control
enterBuildingMode()
exitBuildingMode()
toggleBuildingMode()

// Selection
selectBuilding(id)
deselectBuilding()
getSelectedBuilding()
```

### useFoundationPersistence()

Save and load functionality.

```javascript
// Core
saveGame() -> boolean
loadGame() -> boolean
newGame()

// Checks
canLoad() -> boolean

// Import/Export
exportAsJSON() -> string
importFromJSON(jsonString) -> boolean
createBackup() -> string

// Info
getStats() -> { totalBuildings, saveVersion, timestamp, hasSave }
```

## Configuration

All constants are defined in `src/shared/config.js`:

- **BUILDING_TYPES** - All building type constants
- **BUILDING_TIERS** - Progression tiers
- **GRID** - Grid dimensions and rules
- **BUILDING_STATUS** - Building states
- **RESOURCE_TYPES** - Available resources
- **BUILDING_PROPERTIES** - Per-building metadata
- **PLACEMENT_CONSTRAINTS** - Placement rules
- **SAVE_VERSION** - Save format version

This shared config is the "Rosetta Stone" that ensures all modules speak the same language.

## Common Patterns

### Check if a position is valid

```javascript
const { canPlace } = usePlacement();

const validation = canPlace({
  buildingType: 'TOWER',
  position: { x: 10, y: 1, z: 10 },
  rotation: 90,
});

if (!validation.valid) {
  console.log('Cannot place:', validation.reason);
}
```

### Get all buildings of a type

```javascript
const { getBuildingsByType } = useFoundationStore();
const towers = getBuildingsByType('TOWER');
```

### Find buildings in an area

```javascript
const { getBuildingsInRadius } = usePlacement();
const nearby = getBuildingsInRadius({ x: 0, y: 0, z: 0 }, 50);
```

### Update building properties

```javascript
const { updateBuilding } = useFoundationStore();
updateBuilding('building_1', {
  status: 'COMPLETE',
  buildProgress: 100,
});
```

### Damage a building

```javascript
const { damageBuilding } = useFoundationStore();
damageBuilding('building_1', 25); // 25 damage
```

## For Other Modules

### Building Types Module (Team 2)

Uses Foundation for:
- Building metadata (costs, HP, dimensions)
- Building type lookup
- UI display information

**Import from Foundation:**
```javascript
import { getSummary, getBuildingCosts, getUnlockedBuildingTypes } from '@/modules/foundation';
```

### Resource Economy Module (Team 3)

Uses Foundation for:
- Building queries (find all storage buildings)
- Building type identification
- Building state transitions

**Import from Foundation:**
```javascript
import { usePlacement, useFoundationStore } from '@/modules/foundation';
```

### Territory & Town Planning Module (Team 4)

Uses Foundation for:
- Area queries (buildings in territory)
- Building count checks
- Building type queries

**Import from Foundation:**
```javascript
import { usePlacement, useFoundationStore } from '@/modules/foundation';
```

## Performance

### Spatial Hash
Foundation uses spatial hashing for efficient area queries. The grid is divided into 5x5 unit cells.

Query performance is O(cells in radius), not O(all buildings).

### Building Limit
Maximum 1000 buildings per world to maintain performance.

### Render Optimization
Use `useMemo` when passing building arrays to components to prevent unnecessary re-renders.

## Testing

### Manual Testing Checklist

- [ ] Place a building at (0, 1, 0)
- [ ] Verify building appears in 3D view
- [ ] Try placing another at same position (should fail)
- [ ] Place building at grid-misaligned position (should snap)
- [ ] Save game and verify buildings persist
- [ ] Load game and verify buildings reappear
- [ ] Query buildings with getBuildingsByType
- [ ] Check collision detection works
- [ ] Verify rotation snapping to 90 degrees

## Troubleshooting

### Buildings not appearing

1. Check FoundationView is added to Experience.jsx
2. Check browser console for errors
3. Verify buildings are being added via usePlacement hook
4. Check RigidBody collider setup

### Validation always fails

1. Check position is within grid bounds (-50 to 50 for X and Z)
2. Check no existing buildings at position
3. Check console for specific failure reason
4. Verify BUILDING_TYPES.WALL exists

### Save/Load issues

1. Check browser localStorage is enabled
2. Check browser console for errors
3. Verify useFoundationPersistence is imported correctly
4. Check SAVE_VERSION matches

## Future Enhancements

- [ ] Animated building construction
- [ ] Building upgrade system
- [ ] Building destruction and debris
- [ ] Building effects (light, particles)
- [ ] LOD (level of detail) rendering
- [ ] Building pathfinding integration

## Documentation

- **FOUNDATION_MODULE_GUIDE.md** - Detailed API and usage guide
- **INTEGRATION_EXAMPLE.md** - How to integrate with your game
- This README - Overview and quick start

## Questions?

Refer to the comprehensive guides in this module directory for detailed information on any aspect of Foundation.
