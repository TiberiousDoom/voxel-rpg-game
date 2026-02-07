# Save File Format

**Version:** 1
**Storage:** IndexedDB (`voxel3d-saves` database)
**Implementation:** `src/persistence/Game3DSaveManager.js`

---

## Database Schema

### Object Store: `saves`

Stores main game state per save slot.

**Key path:** `slot` (string)

```javascript
{
  slot: "default",          // Save slot identifier
  version: 1,               // Format version for migrations
  savedAt: 1707000000000,   // Unix timestamp (ms)
  player: {
    position: [x, y, z],    // World position (float)
    health: 100,
    maxHealth: 100,
    mana: 100,
    maxMana: 100,
    stamina: 100,
    level: 1,
    xp: 0,
    xpToNext: 100,
    damage: 10,
    defense: 0,
  },
  inventory: {
    gold: 100,
    essence: 5,
    crystals: 3,
    potions: 3,
    items: [],               // Array of item objects
    materials: {             // Material name -> quantity
      wood: 10,
      iron: 5,
    },
  },
  equipment: {
    weapon: null,            // Item object or null
    armor: null,
    helmet: null,
    gloves: null,
    boots: null,
    ring1: null,
    ring2: null,
    amulet: null,
    offhand: null,
  },
  character: { ... },        // Character system data (attributes, skills)
  camera: {
    firstPerson: false,
    rotationAngle: 0,
    distance: 12,
    height: 10,
  },
}
```

### Object Store: `chunks`

Stores modified chunk data. Only chunks that have been changed by the player are saved; unmodified terrain is regenerated from the world seed.

**Key path:** `key` (string, format: `{slot}-{chunkX},{chunkZ}`)
**Index:** `slot` (non-unique)

#### Binary Format (Current)

```javascript
{
  key: "default-3,-2",      // "{slot}-{chunkKey}"
  slot: "default",
  chunkKey: "3,-2",
  binaryData: ArrayBuffer,  // Compact binary chunk data (4,360 bytes)
  lastModified: 1707000000000,
}
```

**Binary layout** (`binaryData` ArrayBuffer, 4,360 bytes total):

| Offset | Size | Type | Description |
|--------|------|------|-------------|
| 0 | 4 | Int32LE | Chunk X coordinate |
| 4 | 4 | Int32LE | Chunk Z coordinate |
| 8 | 4,096 | Uint8[4096] | Block data (16x16x16, XZY order) |
| 4,104 | 256 | Uint8[256] | Heightmap (16x16) |

Block index formula: `x + (z * 16) + (y * 256)` (XZY order for cache-friendly horizontal iteration).

#### Legacy JSON Format (Backward Compatible)

Older saves may use JSON arrays instead of binary:

```javascript
{
  key: "default-3,-2",
  slot: "default",
  chunkKey: "3,-2",
  x: 3,
  z: -2,
  blocks: [0, 0, 1, 3, ...],    // Array<number> length 4096
  heightMap: [0, 5, 6, ...],     // Array<number> length 256
  lastModified: 1707000000000,
}
```

The load system detects format by checking for the `binaryData` field.

---

## Block Types

Block type IDs stored in the blocks array:

| ID | Type |
|----|------|
| 0 | AIR |
| 1 | STONE |
| 2 | DIRT |
| 3 | GRASS |
| 4 | SAND |
| 5 | WATER |
| 6 | WOOD |
| 7 | LEAVES |
| 8 | BEDROCK |
| 9 | GRAVEL |
| 10 | COAL_ORE |
| 11 | IRON_ORE |
| 12 | GOLD_ORE |
| 13 | CLAY |
| 14 | SNOW |
| 15 | ICE |

---

## Save Slots

- `"default"` - Manual save slot
- `"autosave"` - Auto-save (every 30 seconds)
- Custom slot names supported

---

## Size Estimates

| Component | Size per Unit | Typical Count | Total |
|-----------|--------------|---------------|-------|
| Main state | ~2 KB | 1 | 2 KB |
| Chunk (binary) | 4.4 KB | 50-200 modified | 220-880 KB |
| Chunk (legacy JSON) | ~16 KB | 50-200 modified | 800 KB - 3.2 MB |

Typical save: **< 1 MB** (binary format).

---

## Version Migration

The `version` field in the save data supports future migrations. When loading:

1. Read `version` from save data
2. If version < current, apply migration functions sequentially
3. Save migrated data back

No migrations exist yet (version 1 is current).
