# Code Examples

This directory contains example code demonstrating how to integrate various game systems.

## Loot System Integration

**File:** [`LootSystemExample.jsx`](./LootSystemExample.jsx)

**Purpose:** Demonstrates how to integrate the loot system into your game components.

**What it shows:**
1. ✅ How to handle monster death and generate loot
2. ✅ How to update loot drops in the game loop
3. ✅ How to display equipment stats to players
4. ✅ How to render loot drops in the 3D world
5. ✅ How to handle loot pickup

**Usage:**
```javascript
import { CombatExample } from '../documentation/examples/LootSystemExample';

// Use in your component
<CombatExample />
```

**Key Integration Points:**
- `useGameStore` - Access handleMonsterDeath, lootDrops state
- `Monster` entity - Create and manage monsters
- Loot system automatically generates items based on loot tables
- Equipment stats automatically calculated and displayed

**Related Systems:**
- `src/systems/LootIntegration.js` - Core loot system API
- `src/systems/LootDropManager.js` - Manages loot drops in world
- `src/systems/LootGenerator.js` - Generates loot from tables
- `src/entities/Monster.js` - Monster entity with loot tables

---

## Adding More Examples

When adding new example files:

1. **Naming:** Use descriptive names ending in `Example.jsx`
2. **Documentation:** Include clear comments explaining what the example demonstrates
3. **Self-contained:** Examples should be copy-paste ready
4. **README:** Add an entry here describing the example

**Good Example Structure:**
```javascript
/**
 * SystemNameExample.jsx - Brief description
 *
 * Demonstrates:
 * 1. Key feature A
 * 2. Key feature B
 * 3. Key feature C
 */

// Clear, well-commented example code
// That developers can copy directly into their own code
```
