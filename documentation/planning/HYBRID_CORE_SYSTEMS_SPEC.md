# Hybrid Game Core Systems - Technical Specification

**Last Updated:** 2025-11-15
**Author:** Claude (AI Assistant)
**Status:** Active
**Purpose:** Detailed technical specifications for core hybrid game systems (UnifiedGameState, ModeManager, SharedResourceManager, SharedInventoryManager)

---

## Table of Contents

1. [Overview](#overview)
2. [UnifiedGameState](#unifiedgamestate)
3. [ModeManager](#modemanager)
4. [SharedResourceManager](#sharedresourcemanager)
5. [SharedInventoryManager](#sharedinventorymanager)
6. [Integration Points](#integration-points)
7. [Testing Requirements](#testing-requirements)

---

## Overview

### Purpose

These core systems provide the foundation for switching between Settlement, Expedition, and Defense game modes while maintaining consistent state and data flow.

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│       UnifiedGameState                      │
│  - currentMode: string                      │
│  - sharedResources: Object                  │
│  - sharedInventory: Object                  │
│  - expeditionState: Object | null           │
│  - defenseState: Object | null              │
└─────────────────┬───────────────────────────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
┌────▼──────┐ ┌──▼────────┐ ┌─▼──────────┐
│   Mode    │ │  Shared   │ │  Shared    │
│  Manager  │ │ Resources │ │ Inventory  │
└───────────┘ └───────────┘ └────────────┘
```

### Dependencies

- Existing `StorageManager` (for resource storage)
- Existing `GameEngine` (for tick coordination)
- Existing `ModuleOrchestrator` (for system coordination)

---

## UnifiedGameState

### Location

`src/core/UnifiedGameState.js`

### Class Definition

```javascript
/**
 * UnifiedGameState - Central state management for hybrid game
 * Maintains state across Settlement, Expedition, and Defense modes
 */
class UnifiedGameState {
  constructor() {
    // Current game mode
    this.currentMode = 'settlement'; // 'settlement' | 'expedition' | 'defense'

    // Shared resources (cross-mode)
    this.sharedResources = {
      gold: 0,
      essence: 0,
      crystals: 0,
      food: 0,
      wood: 0,
      stone: 0
    };

    // Shared inventory (cross-mode)
    this.sharedInventory = {
      equipment: [],      // Weapons, armor, accessories
      consumables: [],    // Potions, scrolls
      materials: []       // Crafting materials
    };

    // Expedition state (null when not on expedition)
    this.expeditionState = null;

    // Defense state (null when not defending)
    this.defenseState = null;

    // Settlement state (always maintained)
    this.settlementState = {
      buildings: [],
      npcs: [],
      tick: 0,
      morale: 0
    };
  }

  /**
   * Get current game mode
   * @returns {string} Current mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Set game mode (use ModeManager instead)
   * @param {string} mode - New mode
   * @private
   */
  _setMode(mode) {
    if (!['settlement', 'expedition', 'defense'].includes(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }
    this.currentMode = mode;
  }

  /**
   * Serialize state for persistence
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      currentMode: this.currentMode,
      sharedResources: { ...this.sharedResources },
      sharedInventory: {
        equipment: [...this.sharedInventory.equipment],
        consumables: [...this.sharedInventory.consumables],
        materials: [...this.sharedInventory.materials]
      },
      expeditionState: this.expeditionState ? { ...this.expeditionState } : null,
      defenseState: this.defenseState ? { ...this.defenseState } : null,
      settlementState: { ...this.settlementState }
    };
  }

  /**
   * Deserialize state from persistence
   * @param {Object} data - Serialized state
   */
  deserialize(data) {
    this.currentMode = data.currentMode || 'settlement';
    this.sharedResources = data.sharedResources || {};
    this.sharedInventory = data.sharedInventory || { equipment: [], consumables: [], materials: [] };
    this.expeditionState = data.expeditionState || null;
    this.defenseState = data.defenseState || null;
    this.settlementState = data.settlementState || {};
  }

  /**
   * Validate state integrity
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    // Validate mode
    if (!['settlement', 'expedition', 'defense'].includes(this.currentMode)) {
      errors.push(`Invalid mode: ${this.currentMode}`);
    }

    // Validate resources
    for (const [resource, amount] of Object.entries(this.sharedResources)) {
      if (typeof amount !== 'number' || amount < 0) {
        errors.push(`Invalid resource ${resource}: ${amount}`);
      }
    }

    // Validate inventory
    if (!Array.isArray(this.sharedInventory.equipment)) {
      errors.push('Equipment must be an array');
    }
    if (!Array.isArray(this.sharedInventory.consumables)) {
      errors.push('Consumables must be an array');
    }
    if (!Array.isArray(this.sharedInventory.materials)) {
      errors.push('Materials must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default UnifiedGameState;
```

### Data Schema

#### Expedition State
```javascript
{
  id: string,              // Unique expedition ID
  type: string,            // 'dungeon' | 'wilderness' | 'boss'
  difficulty: number,      // 1-5
  party: string[],         // Array of NPC IDs
  startTime: number,       // Timestamp
  dungeon: {
    map: Object,           // Dungeon layout
    enemies: Array,        // Active enemies
    loot: Array,           // Collected loot
    bossDefeated: boolean
  },
  playerPosition: {x, y},
  combatLog: Array         // Combat events
}
```

#### Defense State
```javascript
{
  id: string,              // Unique raid ID
  type: string,            // 'bandits' | 'monsters' | 'siege'
  difficulty: number,      // 1-5
  wave: number,            // Current wave (1-5)
  enemies: Array,          // Active enemies
  guards: string[],        // Array of NPC IDs defending
  buildingHealth: Map,     // Map<buildingId, health>
  startTime: number,       // Timestamp
  waveTimer: number        // Seconds until next wave
}
```

---

## ModeManager

### Location

`src/core/ModeManager.js`

### Class Definition

```javascript
/**
 * ModeManager - Handles transitions between game modes
 * Ensures clean state preservation and restoration
 */
class ModeManager {
  constructor(unifiedState, gameEngine, orchestrator) {
    this.state = unifiedState;
    this.engine = gameEngine;
    this.orchestrator = orchestrator;

    // Mode-specific cleanup functions
    this.cleanupHandlers = new Map();

    // Mode-specific initialization functions
    this.initHandlers = new Map();

    // Transition locks
    this.isTransitioning = false;
    this.transitionQueue = [];
  }

  /**
   * Register cleanup handler for a mode
   * @param {string} mode - Mode name
   * @param {Function} handler - Cleanup function
   */
  registerCleanupHandler(mode, handler) {
    this.cleanupHandlers.set(mode, handler);
  }

  /**
   * Register initialization handler for a mode
   * @param {string} mode - Mode name
   * @param {Function} handler - Init function
   */
  registerInitHandler(mode, handler) {
    this.initHandlers.set(mode, handler);
  }

  /**
   * Switch to a different game mode
   * @param {string} targetMode - Target mode
   * @param {Object} context - Mode-specific context
   * @returns {Promise<Object>} Result { success, mode, error }
   */
  async switchMode(targetMode, context = {}) {
    // Prevent concurrent transitions
    if (this.isTransitioning) {
      return { success: false, error: 'Transition already in progress' };
    }

    // Validate target mode
    if (!['settlement', 'expedition', 'defense'].includes(targetMode)) {
      return { success: false, error: `Invalid mode: ${targetMode}` };
    }

    // Check if already in target mode
    if (this.state.getCurrentMode() === targetMode) {
      return { success: true, mode: targetMode };
    }

    this.isTransitioning = true;

    try {
      // Step 1: Validate transition
      const canTransition = this._validateTransition(targetMode, context);
      if (!canTransition.valid) {
        throw new Error(canTransition.reason);
      }

      // Step 2: Pause game engine
      this.engine.pause();

      // Step 3: Save current state
      const currentMode = this.state.getCurrentMode();
      await this._saveCurrentState(currentMode);

      // Step 4: Cleanup current mode
      await this._cleanupMode(currentMode);

      // Step 5: Switch mode
      this.state._setMode(targetMode);

      // Step 6: Initialize new mode
      await this._initializeMode(targetMode, context);

      // Step 7: Resume game engine
      this.engine.resume();

      this.isTransitioning = false;

      return { success: true, mode: targetMode };

    } catch (error) {
      // Rollback on failure
      this.isTransitioning = false;
      this.engine.resume();

      console.error('Mode transition failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate if transition is allowed
   * @private
   */
  _validateTransition(targetMode, context) {
    const currentMode = this.state.getCurrentMode();

    // Settlement → Expedition: Must be at Expedition Hall
    if (currentMode === 'settlement' && targetMode === 'expedition') {
      if (!context.expeditionHallId) {
        return { valid: false, reason: 'Must be at Expedition Hall' };
      }
      if (!context.party || context.party.length === 0) {
        return { valid: false, reason: 'Must have a party' };
      }
    }

    // Settlement → Defense: Automatic (raid triggered)
    if (currentMode === 'settlement' && targetMode === 'defense') {
      if (!context.raidId) {
        return { valid: false, reason: 'No active raid' };
      }
    }

    // Expedition → Settlement: Must complete or abandon expedition
    if (currentMode === 'expedition' && targetMode === 'settlement') {
      if (!context.completed && !context.abandoned) {
        return { valid: false, reason: 'Expedition not completed' };
      }
    }

    // Defense → Settlement: Must complete defense
    if (currentMode === 'defense' && targetMode === 'settlement') {
      if (!context.defenseComplete) {
        return { valid: false, reason: 'Defense not complete' };
      }
    }

    return { valid: true };
  }

  /**
   * Save current mode state
   * @private
   */
  async _saveCurrentState(mode) {
    switch (mode) {
      case 'settlement':
        this.state.settlementState = this.orchestrator.getGameState();
        break;
      case 'expedition':
        // Expedition state is already in unifiedState
        break;
      case 'defense':
        // Defense state is already in unifiedState
        break;
    }
  }

  /**
   * Cleanup current mode
   * @private
   */
  async _cleanupMode(mode) {
    const handler = this.cleanupHandlers.get(mode);
    if (handler) {
      await handler();
    }
  }

  /**
   * Initialize new mode
   * @private
   */
  async _initializeMode(mode, context) {
    const handler = this.initHandlers.get(mode);
    if (handler) {
      await handler(context);
    }
  }

  /**
   * Get current mode
   * @returns {string} Current mode
   */
  getCurrentMode() {
    return this.state.getCurrentMode();
  }

  /**
   * Check if transition is in progress
   * @returns {boolean}
   */
  isInTransition() {
    return this.isTransitioning;
  }
}

export default ModeManager;
```

### Mode Transition Matrix

| From / To | Settlement | Expedition | Defense |
|-----------|-----------|-----------|---------|
| **Settlement** | N/A | ✅ At Expedition Hall | ✅ Raid triggered |
| **Expedition** | ✅ Complete/Abandon | N/A | ❌ Not allowed |
| **Defense** | ✅ Victory/Defeat | ❌ Not allowed | N/A |

---

## SharedResourceManager

### Location

`src/shared/SharedResourceManager.js`

### Class Definition

```javascript
/**
 * SharedResourceManager - Manages resources across game modes
 * Extends StorageManager functionality
 */
class SharedResourceManager {
  constructor(storageManager, unifiedState) {
    this.storage = storageManager;
    this.state = unifiedState;

    // Track resource sources
    this.resourceSources = new Map(); // Map<resource, Map<source, amount>>
  }

  /**
   * Add resources from expedition
   * @param {string} resource - Resource type
   * @param {number} amount - Amount to add
   * @param {string} expeditionId - Source expedition ID
   */
  addResourceFromExpedition(resource, amount, expeditionId) {
    // Add to storage
    this.storage.addResource(resource, amount);

    // Update shared state
    if (this.state.sharedResources[resource] !== undefined) {
      this.state.sharedResources[resource] += amount;
    }

    // Track source
    this._trackSource(resource, `expedition:${expeditionId}`, amount);
  }

  /**
   * Check if can afford expedition requirements
   * @param {Object} requirements - { resource: amount }
   * @returns {Object} { canAfford: boolean, missing: Object }
   */
  canAffordExpedition(requirements) {
    const missing = {};
    let canAfford = true;

    for (const [resource, required] of Object.entries(requirements)) {
      const available = this.storage.getResource(resource);
      if (available < required) {
        canAfford = false;
        missing[resource] = required - available;
      }
    }

    return { canAfford, missing };
  }

  /**
   * Consume resources for expedition
   * @param {Object} requirements - { resource: amount }
   * @returns {boolean} Success
   */
  consumeForExpedition(requirements) {
    const check = this.canAffordExpedition(requirements);
    if (!check.canAfford) {
      return false;
    }

    for (const [resource, amount] of Object.entries(requirements)) {
      this.storage.removeResource(resource, amount);
      if (this.state.sharedResources[resource] !== undefined) {
        this.state.sharedResources[resource] -= amount;
      }
    }

    return true;
  }

  /**
   * Sync resources from storage to unified state
   */
  syncResources() {
    const resources = this.storage.getStorage();
    for (const [resource, amount] of Object.entries(resources)) {
      if (this.state.sharedResources[resource] !== undefined) {
        this.state.sharedResources[resource] = amount;
      }
    }
  }

  /**
   * Get resource statistics
   * @returns {Object} Stats by source
   */
  getResourceStats() {
    const stats = {
      total: { ...this.state.sharedResources },
      sources: {}
    };

    for (const [resource, sources] of this.resourceSources.entries()) {
      stats.sources[resource] = Object.fromEntries(sources);
    }

    return stats;
  }

  /**
   * Track resource source
   * @private
   */
  _trackSource(resource, source, amount) {
    if (!this.resourceSources.has(resource)) {
      this.resourceSources.set(resource, new Map());
    }
    const sources = this.resourceSources.get(resource);
    const current = sources.get(source) || 0;
    sources.set(source, current + amount);
  }
}

export default SharedResourceManager;
```

---

## SharedInventoryManager

### Location

`src/shared/SharedInventoryManager.js`

### Class Definition

```javascript
/**
 * SharedInventoryManager - Manages equipment and items across modes
 */
class SharedInventoryManager {
  constructor(unifiedState) {
    this.state = unifiedState;

    // Item ID counter
    this.nextItemId = 1;
  }

  /**
   * Add equipment to inventory
   * @param {Object} item - Equipment item
   * @returns {string} Item ID
   */
  addEquipment(item) {
    const itemWithId = {
      id: `equip_${this.nextItemId++}`,
      ...item,
      addedAt: Date.now()
    };

    this.state.sharedInventory.equipment.push(itemWithId);
    return itemWithId.id;
  }

  /**
   * Add consumable to inventory
   * @param {Object} item - Consumable item
   * @param {number} quantity - Quantity to add
   */
  addConsumable(item, quantity = 1) {
    // Check if we already have this consumable
    const existing = this.state.sharedInventory.consumables.find(
      c => c.name === item.name
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      this.state.sharedInventory.consumables.push({
        id: `cons_${this.nextItemId++}`,
        ...item,
        quantity,
        addedAt: Date.now()
      });
    }
  }

  /**
   * Add material to inventory
   * @param {string} material - Material type
   * @param {number} quantity - Quantity to add
   */
  addMaterial(material, quantity) {
    const existing = this.state.sharedInventory.materials.find(
      m => m.type === material
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      this.state.sharedInventory.materials.push({
        id: `mat_${this.nextItemId++}`,
        type: material,
        quantity,
        addedAt: Date.now()
      });
    }
  }

  /**
   * Remove item from inventory
   * @param {string} category - 'equipment' | 'consumables' | 'materials'
   * @param {string} itemId - Item ID
   * @returns {boolean} Success
   */
  removeItem(category, itemId) {
    const items = this.state.sharedInventory[category];
    const index = items.findIndex(item => item.id === itemId);

    if (index >= 0) {
      items.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Use consumable
   * @param {string} itemId - Consumable ID
   * @returns {Object} Item used (or null if not found)
   */
  useConsumable(itemId) {
    const consumable = this.state.sharedInventory.consumables.find(
      c => c.id === itemId
    );

    if (!consumable) return null;

    consumable.quantity--;

    if (consumable.quantity <= 0) {
      this.removeItem('consumables', itemId);
    }

    return consumable;
  }

  /**
   * Get all equipment
   * @returns {Array} Equipment items
   */
  getEquipment() {
    return [...this.state.sharedInventory.equipment];
  }

  /**
   * Get all consumables
   * @returns {Array} Consumable items
   */
  getConsumables() {
    return [...this.state.sharedInventory.consumables];
  }

  /**
   * Get all materials
   * @returns {Array} Material items
   */
  getMaterials() {
    return [...this.state.sharedInventory.materials];
  }

  /**
   * Get item by ID
   * @param {string} itemId - Item ID
   * @returns {Object} Item (or null if not found)
   */
  getItem(itemId) {
    for (const category of ['equipment', 'consumables', 'materials']) {
      const item = this.state.sharedInventory[category].find(
        i => i.id === itemId
      );
      if (item) return item;
    }
    return null;
  }

  /**
   * Get inventory statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      equipmentCount: this.state.sharedInventory.equipment.length,
      consumableCount: this.state.sharedInventory.consumables.reduce(
        (sum, c) => sum + c.quantity, 0
      ),
      materialCount: this.state.sharedInventory.materials.reduce(
        (sum, m) => sum + m.quantity, 0
      ),
      totalValue: this._calculateTotalValue()
    };
  }

  /**
   * Calculate total inventory value
   * @private
   */
  _calculateTotalValue() {
    let total = 0;

    for (const item of this.state.sharedInventory.equipment) {
      total += item.value || 0;
    }

    for (const item of this.state.sharedInventory.consumables) {
      total += (item.value || 0) * item.quantity;
    }

    for (const item of this.state.sharedInventory.materials) {
      total += (item.value || 0) * item.quantity;
    }

    return total;
  }
}

export default SharedInventoryManager;
```

---

## Integration Points

### With GameEngine

```javascript
// In GameEngine.js
import ModeManager from './ModeManager.js';
import UnifiedGameState from './UnifiedGameState.js';

// During initialization
this.unifiedState = new UnifiedGameState();
this.modeManager = new ModeManager(
  this.unifiedState,
  this,
  this.orchestrator
);
```

### With ModuleOrchestrator

```javascript
// In ModuleOrchestrator.js
import SharedResourceManager from '../shared/SharedResourceManager.js';
import SharedInventoryManager from '../shared/SharedInventoryManager.js';

// During initialization
this.sharedResources = new SharedResourceManager(
  this.storage,
  gameEngine.unifiedState
);
this.sharedInventory = new SharedInventoryManager(
  gameEngine.unifiedState
);
```

### With React Components

```javascript
// In GameScreen.jsx
import { useGameMode } from '../hooks/useGameMode';

function GameScreen() {
  const { currentMode, switchMode } = useGameMode();

  return (
    <div>
      {currentMode === 'settlement' && <SettlementView />}
      {currentMode === 'expedition' && <ExpeditionView />}
      {currentMode === 'defense' && <DefenseView />}
    </div>
  );
}
```

---

## Testing Requirements

### Unit Tests

**UnifiedGameState:**
- ✅ Test state initialization
- ✅ Test mode validation
- ✅ Test serialize/deserialize
- ✅ Test state validation
- ✅ Test resource limits

**ModeManager:**
- ✅ Test mode switching (all combinations)
- ✅ Test transition validation
- ✅ Test transition rollback on failure
- ✅ Test concurrent transition prevention
- ✅ Test cleanup/init handlers

**SharedResourceManager:**
- ✅ Test resource addition from expedition
- ✅ Test resource consumption for expedition
- ✅ Test can-afford checking
- ✅ Test resource source tracking
- ✅ Test sync with storage

**SharedInventoryManager:**
- ✅ Test add/remove equipment
- ✅ Test add/use consumables
- ✅ Test material management
- ✅ Test inventory stats
- ✅ Test item lookup

### Integration Tests

- ✅ Test full mode transition (settlement → expedition → settlement)
- ✅ Test resource flow (expedition rewards → settlement storage)
- ✅ Test inventory persistence across mode switch
- ✅ Test save/load with all modes
- ✅ Test mode transition during active game tick

### Performance Tests

- ✅ Mode switch completes in < 2 seconds
- ✅ State serialization < 100ms
- ✅ Inventory operations < 10ms
- ✅ Resource checks < 1ms

---

## References

**Related Documentation:**
- [HYBRID_GAME_INTEGRATION_PLAN.md](./HYBRID_GAME_INTEGRATION_PLAN.md) - Overall integration plan
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md) - Development patterns

**Related Code:**
- `src/core/GameEngine.js` - Game engine
- `src/core/ModuleOrchestrator.js` - Module orchestrator
- `src/modules/resource-economy/StorageManager.js` - Resource storage

---

**Document Created:** 2025-11-15
**Version:** 1.0
**Next Steps:** Implement UnifiedGameState, then ModeManager
