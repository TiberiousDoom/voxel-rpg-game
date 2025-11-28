# Foundation Module - Integration Example

This document shows how to integrate the Foundation Module into the existing game Experience component.

## Step 1: Add Foundation to Experience.jsx

In `src/components/3d/Experience.jsx`, add the import:

```javascript
import { FoundationView } from '../../modules/foundation/components/FoundationView';
```

Then add the component to the Physics section where the TODO comment is:

```jsx
{/* TODO: Add interactable objects */}

{/* Foundation buildings */}
<FoundationView />
```

Complete example for the Physics section:

```jsx
<Physics gravity={[0, -20, 0]}>
  <Suspense fallback={null}>
    {/* Terrain - visual only */}
    <VoxelTerrain size={40} voxelSize={2} />

    {/* Ground plane - provides collision */}
    <RigidBody type="fixed" colliders="cuboid" position={[0, 0, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[200, 1, 200]} />
        <meshStandardMaterial color="#228b22" transparent opacity={0} />
      </mesh>
    </RigidBody>

    {/* Player */}
    <Player />

    {/* Enemies - spawn a few for testing */}
    <Enemy position={[10, 5, 10]} name="Slime" />
    <Enemy position={[-15, 5, 8]} name="Goblin" />
    <Enemy position={[8, 5, -12]} name="Orc" />
    <Enemy position={[-10, 5, -15]} name="Skeleton" />

    {/* Projectiles - inside physics for collision detection */}
    {projectiles.map((proj) => (
      <Projectile key={proj.id} {...proj} />
    ))}

    {/* XP Orbs */}
    {xpOrbs.map((orb) => (
      <XPOrb key={orb.id} {...orb} onCollect={removeXPOrb} />
    ))}

    {/* Foundation buildings */}
    <FoundationView />
  </Suspense>
</Physics>
```

## Step 2: Create a Building Placement UI Component

Create a new file `src/components/UI/BuildingPlacer.jsx`:

```jsx
import React, { useState } from 'react';
import { usePlacement } from '../../modules/foundation';
import { BUILDING_TYPES } from '../../shared/config';

export const BuildingPlacer = () => {
  const { canPlace, placeBuilding } = usePlacement();
  const [selectedType, setSelectedType] = useState(BUILDING_TYPES.WALL);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState(0);
  const [validation, setValidation] = useState(null);

  const handleCheckPlacement = () => {
    const result = canPlace({
      buildingType: selectedType,
      position,
      rotation,
    });
    setValidation(result);
  };

  const handlePlace = () => {
    const result = placeBuilding({
      type: selectedType,
      position,
      rotation,
    });

    if (result) {
      console.log('Building placed:', result);
    } else {
      console.log('Placement failed');
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}>
      <h2>Building Placer</h2>

      <div>
        <label>Building Type:</label>
        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
          {Object.entries(BUILDING_TYPES).map(([key, value]) => (
            <option key={value} value={value}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Position:</label>
        <input
          type="number"
          placeholder="X"
          value={position.x}
          onChange={(e) => setPosition({ ...position, x: parseFloat(e.target.value) })}
        />
        <input
          type="number"
          placeholder="Y"
          value={position.y}
          onChange={(e) => setPosition({ ...position, y: parseFloat(e.target.value) })}
        />
        <input
          type="number"
          placeholder="Z"
          value={position.z}
          onChange={(e) => setPosition({ ...position, z: parseFloat(e.target.value) })}
        />
      </div>

      <div>
        <label>Rotation (degrees): </label>
        <input
          type="number"
          value={rotation}
          onChange={(e) => setRotation(parseFloat(e.target.value))}
        />
      </div>

      <button onClick={handleCheckPlacement}>Check Placement</button>
      <button onClick={handlePlace}>Place Building</button>

      {validation && (
        <div>
          <h3>Validation Result:</h3>
          <p>Valid: {validation.valid ? 'Yes' : 'No'}</p>
          <p>Reason: {validation.reason}</p>
          {validation.checks && (
            <ul>
              {validation.checks.map((check) => (
                <li key={check.name}>
                  {check.name}: {check.valid ? '✓' : '✗'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
```

Add to `src/components/UI/GameUI.jsx`:

```jsx
import { BuildingPlacer } from './BuildingPlacer';

export const GameUI = () => {
  return (
    <div>
      {/* ... existing UI ... */}
      <BuildingPlacer />
    </div>
  );
};
```

## Step 3: Add Save/Load to Game Menu

In your game menu component:

```jsx
import { useFoundationPersistence } from '../../modules/foundation';

export const GameMenu = () => {
  const { saveGame, loadGame, canLoad } = useFoundationPersistence();

  const handleSaveGame = () => {
    const success = saveGame();
    if (success) {
      alert('Game saved!');
    } else {
      alert('Save failed!');
    }
  };

  const handleLoadGame = () => {
    if (canLoad()) {
      const success = loadGame();
      if (success) {
        alert('Game loaded!');
      } else {
        alert('Load failed!');
      }
    }
  };

  return (
    <div className="menu">
      <button onClick={handleSaveGame}>Save Game</button>
      <button onClick={handleLoadGame} disabled={!canLoad()}>
        Load Game
      </button>
    </div>
  );
};
```

## Step 4: Test the Integration

1. **Place a building manually:**
   - Open the BuildingPlacer UI
   - Select WALL
   - Set position to (0, 1, 0)
   - Click "Check Placement" to validate
   - Click "Place Building" to place it
   - You should see a gray box appear in the 3D scene

2. **Test collision detection:**
   - Try to place another building at the exact same position
   - Validation should fail with "Collides with existing WALL"

3. **Test grid snapping:**
   - Set position to (0.3, 1.7, 0.5)
   - Click "Check Placement"
   - Notice snappedPosition becomes (0, 2, 0)
   - Rotation snaps to nearest 90 degrees

4. **Test persistence:**
   - Place a few buildings
   - Click "Save Game"
   - Refresh the page
   - Click "Load Game"
   - Buildings should reappear

## Using Foundation in Other Modules

### Building Types Module (Team 2)

```javascript
import { usePlacement } from '@/modules/foundation';
import { getBuildingTier, getSummary } from '@/modules/foundation';

function BuildingTypePanel() {
  const { getCost } = usePlacement();

  const summary = getSummary('WALL');
  const cost = getCost('WALL');

  return (
    <div>
      <h3>{summary.name}</h3>
      <p>{summary.description}</p>
      <p>Tier: {summary.tier}</p>
      <p>HP: {summary.hp}</p>
      <p>Cost: {JSON.stringify(cost)}</p>
    </div>
  );
}
```

### Resource Economy Module (Team 3)

```javascript
import { useFoundationStore } from '@/modules/foundation';

function ResourceManagement() {
  const { getBuildingsByType } = useFoundationStore();

  // Calculate total storage capacity
  const storages = getBuildingsByType('STORAGE_BUILDING');
  const totalCapacity = storages.length * 100;

  return <div>Total Storage: {totalCapacity}</div>;
}
```

### Territory & Town Planning Module (Team 4)

```javascript
import { usePlacement } from '@/modules/foundation';

function TerritoryControl() {
  const { getBuildingsInArea } = usePlacement();

  // Check how many buildings in territory
  const buildingsInTerritory = getBuildingsInArea(
    { x: 0, y: 0, z: 0 },
    50 // 50 unit radius
  );

  return (
    <div>
      Buildings in territory: {buildingsInTerritory.length}
    </div>
  );
}
```

## Common Patterns

### Query a single building

```javascript
import { useFoundationStore } from '@/modules/foundation';

const building = useFoundationStore((state) => state.getBuilding('building_1'));
if (building) {
  console.log(`Building type: ${building.type}`);
}
```

### Check if position is occupied

```javascript
import { usePlacement } from '@/modules/foundation';

const { isPositionOccupied } = usePlacement();
const occupied = isPositionOccupied({ x: 0, y: 1, z: 0 });
```

### Get all buildings of a type

```javascript
import { useFoundationStore } from '@/modules/foundation';

const walls = useFoundationStore((state) =>
  state.getBuildingsByType('WALL')
);
```

### Validate before placing

```javascript
import { usePlacement } from '@/modules/foundation';

const { canPlace } = usePlacement();

const validation = canPlace({
  buildingType: 'TOWER',
  position: { x: 10, y: 1, z: 10 },
  rotation: 0,
});

if (validation.valid) {
  // Safe to place
} else {
  console.log('Cannot place:', validation.reason);
}
```

## Next Steps

1. **Implement Building Types Module (Team 2)**
   - Create building type components
   - Use Foundation's buildingRegistry for properties
   - Add UI for viewing building stats

2. **Implement Resource Economy Module (Team 3)**
   - Create resource management system
   - Check Foundation for building queries
   - Integrate with player inventory

3. **Implement Territory & Town Planning Module (Team 4)**
   - Create territory system
   - Use Foundation for area queries
   - Implement NPC placement on buildings

## Troubleshooting

### Buildings not appearing
- Check that FoundationView is added to Experience.jsx
- Check browser console for errors
- Verify buildings are being added to store via BuildingPlacer

### Validation always fails
- Check that position is within grid bounds (0-100 for both X and Z)
- Check that no buildings already exist at that position
- Check console for specific validation failure reason

### Save/Load not working
- Check browser localStorage is enabled
- Check browser console for errors
- Verify useFoundationPersistence hook is imported correctly
