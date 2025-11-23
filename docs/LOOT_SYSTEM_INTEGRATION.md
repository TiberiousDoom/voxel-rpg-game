# Loot System Integration Guide

Complete guide for integrating the Phase 2 Loot System into your voxel RPG game.

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Game Store Integration](#game-store-integration)
- [Monster Death Integration](#monster-death-integration)
- [Game Loop Integration](#game-loop-integration)
- [UI Integration](#ui-integration)
- [Advanced Usage](#advanced-usage)
- [Testing](#testing)

## Overview

The loot system consists of:
1. **Item Generation** - Procedural items with stats, rarity, and properties
2. **Loot Tables** - Monster-specific drop configurations
3. **Equipment Manager** - 7 equipment slots with stat aggregation
4. **Loot Drop Manager** - Ground loot with pickup mechanics
5. **Store Integration** - Zustand store helpers for seamless integration

## Quick Start

### 1. Monster Death → Loot Drops

When a monster dies, call the store's `handleMonsterDeath` function:

```javascript
import useGameStore from './stores/useGameStore';

// In your combat system
function onMonsterDeath(monster) {
  const handleMonsterDeath = useGameStore.getState().handleMonsterDeath;
  handleMonsterDeath(monster);
}
```

This automatically:
- ✅ Generates loot based on monster type/level
- ✅ Creates ground drops at death position
- ✅ Awards XP to player
- ✅ Removes dead monster after animation

### 2. Game Loop → Loot Pickup

In your game loop, update loot drops each frame:

```javascript
import useGameStore from './stores/useGameStore';

function gameLoop(deltaTime) {
  const player = useGameStore.getState().player;
  const updateLootDrops = useGameStore.getState().updateLootDrops;

  // Check for loot pickup
  updateLootDrops({ x: player.position[0], z: player.position[2] });

  // ... rest of game loop
}
```

This automatically:
- ✅ Detects when player is near loot (2 tile radius)
- ✅ Picks up gold and adds to inventory
- ✅ Auto-equips items if they're upgrades
- ✅ Adds items to inventory if not upgrades
- ✅ Removes picked-up loot from game world

### 3. Equipment Stats

Get aggregated stats from equipment:

```javascript
import useGameStore from './stores/useGameStore';

function getPlayerTotalStats() {
  const getEquipmentStats = useGameStore.getState().getEquipmentStats;
  const player = useGameStore.getState().player;
  const equipStats = getEquipmentStats();

  return {
    totalDamage: player.damage + equipStats.damage,
    totalArmor: player.defense + equipStats.armor,
    totalHealth: player.maxHealth + equipStats.health,
    // ... etc
  };
}
```

## Game Store Integration

### Available Store Functions

The game store (`useGameStore`) now includes:

#### Monster Death
```javascript
handleMonsterDeath(monster)
```
- Creates loot drops at monster position
- Awards XP
- Removes dead monster after delay

#### Loot Pickup
```javascript
updateLootDrops(playerPos)
```
- Updates all loot drops
- Handles pickup when player is in range
- Auto-equips or adds to inventory

#### Equipment Management
```javascript
equipItemWithStats(slot, item)
unequipItemWithStats(slot)
getEquipmentStats()
getEquipmentPowerLevel()
```

### Enhanced Equipment Functions

The store now has stat-aware equipment functions:

```javascript
// Old way (no stat updates)
equipItem('weapon', newSword);

// New way (updates player stats automatically)
equipItemWithStats('weapon', newSword);
```

## Monster Death Integration

### Option 1: Combat System Integration

If you have a combat system, integrate there:

```javascript
// src/systems/CombatSystem.js
import useGameStore from '../stores/useGameStore';

export function handleCombat(player, monster, damage) {
  monster.takeDamage(damage);

  if (!monster.alive) {
    // Monster died - handle loot!
    useGameStore.getState().handleMonsterDeath(monster);
  }
}
```

### Option 2: Monster AI Integration

In MonsterAI system:

```javascript
// src/systems/MonsterAI.js
import useGameStore from '../stores/useGameStore';

export class MonsterAI {
  update(monster, deltaTime) {
    // ... AI logic ...

    // Check if monster just died
    if (!monster.alive && !monster._lootDropped) {
      monster._lootDropped = true; // Prevent duplicate drops
      useGameStore.getState().handleMonsterDeath(monster);
    }
  }
}
```

### Option 3: Direct Integration

In any component that handles combat:

```javascript
// In React component or game logic
const handleAttack = () => {
  const monster = nearbyMonsters[0];
  const killed = monster.takeDamage(playerDamage);

  if (killed) {
    useGameStore.getState().handleMonsterDeath(monster);
  }
};
```

## Game Loop Integration

### React Three Fiber Integration

If using React Three Fiber:

```javascript
// src/components/GameViewport.jsx
import { useFrame } from '@react-three/fiber';
import useGameStore from '../stores/useGameStore';

function GameLoop() {
  useFrame((state, delta) => {
    const player = useGameStore.getState().player;
    const updateLootDrops = useGameStore.getState().updateLootDrops;

    // Update loot drops
    updateLootDrops({
      x: player.position[0],
      z: player.position[2]
    });

    // ... other game updates
  });

  return null;
}
```

### Traditional Game Loop

If using a traditional game loop:

```javascript
// src/GameLoop.js
import useGameStore from './stores/useGameStore';

function update(deltaTime) {
  const state = useGameStore.getState();

  // Update loot drops
  state.updateLootDrops({
    x: state.player.position[0],
    z: state.player.position[2]
  });

  // Update other systems...
}

setInterval(() => update(1000/60), 1000/60); // 60 FPS
```

## UI Integration

### Display Loot Drops

Render loot drops in your game world:

```javascript
// src/components/LootDrops.jsx
import useGameStore from '../stores/useGameStore';

function LootDrops() {
  const lootDrops = useGameStore((state) => state.lootDrops);

  return (
    <>
      {lootDrops.map(drop => (
        <mesh key={drop.id} position={[drop.position.x, 0.5, drop.position.z]}>
          {drop.type === 'GOLD' ? (
            <GoldCoinModel amount={drop.amount} />
          ) : (
            <ItemModel item={drop} rarity={drop.rarity} />
          )}
        </mesh>
      ))}
    </>
  );
}
```

### Equipment UI

Show equipped items:

```javascript
// src/components/EquipmentPanel.jsx
import useGameStore from '../stores/useGameStore';

function EquipmentPanel() {
  const equipment = useGameStore((state) => state.equipment);
  const powerLevel = useGameStore((state) => state.getEquipmentPowerLevel());

  return (
    <div className="equipment-panel">
      <h3>Equipment (Power: {powerLevel})</h3>
      {Object.entries(equipment).map(([slot, item]) => (
        <div key={slot} className="equipment-slot">
          <span>{slot}:</span>
          {item ? (
            <ItemIcon item={item} />
          ) : (
            <span>Empty</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Stat Display

Show total stats including equipment:

```javascript
// src/components/StatsPanel.jsx
import useGameStore from '../stores/useGameStore';

function StatsPanel() {
  const player = useGameStore((state) => state.player);
  const equipStats = useGameStore((state) => state.getEquipmentStats());

  return (
    <div className="stats-panel">
      <div>Damage: {player.damage} (+{equipStats.damage})</div>
      <div>Armor: {player.defense} (+{equipStats.armor})</div>
      <div>Health: {player.maxHealth} (+{equipStats.health})</div>
      <div>Crit Chance: {player.critChance}% (+{equipStats.critChance}%)</div>
    </div>
  );
}
```

## Advanced Usage

### Manual Loot Creation

Create custom loot drops:

```javascript
import { globalLootDropManager } from '../systems/LootIntegration';
import { Item } from '../entities/Item';

// Create a custom item
const specialSword = new Item({
  name: 'Legendary Sword of Destiny',
  type: 'WEAPON',
  rarity: 'LEGENDARY',
  level: 50,
  stats: { damage: 500 },
  properties: [
    { name: 'Critical Strike', value: 25 },
    { name: 'Lifesteal', value: 15 }
  ]
});

// Create drop at specific position
const drop = globalLootDropManager.createDrop({
  type: 'ITEM',
  item: specialSword,
  position: { x: 10, z: 10 }
});
```

### Check Equipment Before Equipping

Manually check if an item is an upgrade:

```javascript
import { globalEquipmentManager } from '../systems/LootIntegration';
import useGameStore from '../stores/useGameStore';

function shouldEquipItem(newItem) {
  const equipment = useGameStore.getState().equipment;
  const slot = globalEquipmentManager.getSlotForItem(newItem, equipment);
  const currentItem = equipment[slot];

  const result = globalEquipmentManager.isUpgrade(newItem, currentItem, equipment);

  if (result.isUpgrade) {
    console.log('This is an upgrade!');
    console.log('Stat differences:', result.statDiff);
    return true;
  }

  return false;
}
```

### Custom Loot Tables

Modify loot generation for specific monsters:

```javascript
import { globalLootDropManager } from '../systems/LootIntegration';

// Before creating drops, customize the loot table
globalLootDropManager.lootTable.generateLoot = (monster) => {
  if (monster.name === 'Boss Dragon') {
    // Boss always drops legendary item
    return {
      gold: 1000,
      items: [
        // Generate legendary item...
      ]
    };
  }

  // Default generation
  return originalGenerateLoot(monster);
};
```

## Testing

### Unit Tests

All core systems have comprehensive tests:

```bash
# Test item generation
npm test -- --testPathPattern="Item.test"

# Test loot generation
npm test -- --testPathPattern="LootGenerator.test"

# Test equipment management
npm test -- --testPathPattern="EquipmentManager.test"

# Test loot drops
npm test -- --testPathPattern="LootDropManager.test"

# Test integration
npm test -- --testPathPattern="LootSystem.integration"
```

### Integration Testing

Test the full flow:

```javascript
// Create a test monster
const monster = new Monster('GOBLIN', { x: 0, z: 0 }, { level: 5 });

// Kill it
monster.takeDamage(monster.health + 100);

// Handle death
const drops = useGameStore.getState().handleMonsterDeath(monster);
console.log(`Created ${drops.length} loot drops`);

// Simulate player approaching
useGameStore.getState().updateLootDrops({ x: 0, z: 0 });
console.log('Loot picked up!');

// Check equipment
const stats = useGameStore.getState().getEquipmentStats();
console.log('Equipment stats:', stats);
```

## Troubleshooting

### Loot not dropping
- Check that `handleMonsterDeath` is being called when monster dies
- Verify monster has a valid loot table in `monster-loot-tables.json`
- Check console for loot generation logs

### Items not auto-equipping
- Verify you're using `equipItemWithStats` not `equipItem`
- Check that the item is actually an upgrade (compare stats)
- Look for logs: "⚔️ Equipped" or "🎒 Added to inventory"

### Player stats not updating
- Use `equipItemWithStats` instead of `equipItem`
- Call `getEquipmentStats()` to verify stat aggregation is working
- Check that base stats are correctly initialized

### Loot not getting picked up
- Verify `updateLootDrops` is being called in game loop
- Check player position is correct (x, z coordinates)
- Default pickup radius is 2 tiles
- Items have 1-second pickup delay

## Performance Considerations

- Loot system handles 100+ simultaneous drops efficiently
- Integration tests verify performance: < 1 second for 100 monster deaths
- Loot drops automatically expire after 60 seconds
- Use `clearAllLootDrops()` when changing zones/levels

## Summary

The loot system is now fully integrated and ready to use:

1. **Monster dies** → `handleMonsterDeath(monster)`
2. **Game loop** → `updateLootDrops(playerPos)`
3. **Automatic**:
   - Loot generation
   - Ground drops
   - Pickup detection
   - Auto-equip upgrades
   - Stat aggregation

Happy looting! 🎮💎
