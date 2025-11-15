# Hybrid Game Implementation Guide

**Last Updated:** 2025-11-15
**Author:** Claude (AI Assistant)
**Status:** Active
**Purpose:** Step-by-step implementation instructions for hybrid game integration with verification checkpoints

---

## Table of Contents

1. [Overview](#overview)
2. [Milestone 1: Foundation (Phases 1-2)](#milestone-1-foundation-phases-1-2)
3. [Milestone 2: Expeditions (Phase 3)](#milestone-2-expeditions-phase-3)
4. [Milestone 3: Defense (Phase 4)](#milestone-3-defense-phase-4)
5. [Milestone 4: Polish (Phases 5-8)](#milestone-4-polish-phases-5-8)
6. [Common Pitfalls](#common-pitfalls)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### How to Use This Guide

This guide provides **detailed, sequential instructions** for implementing the hybrid game integration. Each section includes:

- **Step-by-step tasks** in order of implementation
- **Verification checkpoints** to ensure each step works
- **Dependencies** showing what must be completed first
- **Code snippets** for key implementations
- **Testing instructions** for validation

### Before You Start

**Prerequisites:**
- ✅ Read [HYBRID_GAME_INTEGRATION_PLAN.md](./HYBRID_GAME_INTEGRATION_PLAN.md)
- ✅ Read [HYBRID_CORE_SYSTEMS_SPEC.md](./HYBRID_CORE_SYSTEMS_SPEC.md)
- ✅ Read [HYBRID_NPC_COMBAT_SPEC.md](./HYBRID_NPC_COMBAT_SPEC.md)
- ✅ Understand current codebase architecture
- ✅ Set up development environment with tests running

**Recommended Workflow:**
1. Implement tasks in order
2. Run verification checkpoint after each section
3. Don't skip checkpoints - they catch issues early
4. Commit after each successful checkpoint
5. Move to next section only after verification passes

---

## Milestone 1: Foundation (Phases 1-2)

**Duration:** 18-22 hours
**Goal:** Mode switching works, shared resources/inventory functional, NPCs have combat stats

### Phase 1.1: Unified State Management (2 hours)

#### Task 1.1.1: Create UnifiedGameState Class

**Location:** `src/core/UnifiedGameState.js`

**Steps:**
1. Create new file `src/core/UnifiedGameState.js`
2. Copy the class definition from [HYBRID_CORE_SYSTEMS_SPEC.md](./HYBRID_CORE_SYSTEMS_SPEC.md#unifiedgamestate)
3. Implement the constructor with all properties
4. Implement `getCurrentMode()`, `_setMode()`, `serialize()`, `deserialize()`, `validate()`

**Code Template:**
```javascript
/**
 * UnifiedGameState.js - Central state management for hybrid game
 */
class UnifiedGameState {
  constructor() {
    this.currentMode = 'settlement';
    this.sharedResources = {
      gold: 0,
      essence: 0,
      crystals: 0,
      food: 0,
      wood: 0,
      stone: 0
    };
    // ... (see spec for full implementation)
  }

  // Implement all methods from spec
}

export default UnifiedGameState;
```

**Verification Checkpoint 1.1.1:**
```javascript
// Create test file: src/core/__tests__/UnifiedGameState.test.js
import UnifiedGameState from '../UnifiedGameState';

describe('UnifiedGameState', () => {
  test('initializes with default values', () => {
    const state = new UnifiedGameState();
    expect(state.getCurrentMode()).toBe('settlement');
    expect(state.sharedResources.gold).toBe(0);
  });

  test('validates state correctly', () => {
    const state = new UnifiedGameState();
    const result = state.validate();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('serializes and deserializes', () => {
    const state = new UnifiedGameState();
    state.sharedResources.gold = 100;

    const serialized = state.serialize();
    expect(serialized.sharedResources.gold).toBe(100);

    const newState = new UnifiedGameState();
    newState.deserialize(serialized);
    expect(newState.sharedResources.gold).toBe(100);
  });
});
```

**Run verification:**
```bash
npm test -- UnifiedGameState.test.js
```

**Expected:** All tests pass ✅

**If tests fail:**
- Check that all properties are initialized
- Verify serialize/deserialize creates deep copies
- Check validation logic for edge cases

---

#### Task 1.1.2: Integrate with GameEngine

**Location:** `src/core/GameEngine.js`

**Dependencies:** Task 1.1.1 must be complete

**Steps:**
1. Import UnifiedGameState at top of GameEngine.js
2. Add `this.unifiedState` property in constructor
3. Initialize UnifiedGameState before orchestrator
4. Pass unifiedState to any systems that need it

**Code Changes:**
```javascript
// At top of GameEngine.js
import UnifiedGameState from './UnifiedGameState.js';

// In constructor (before orchestrator initialization)
this.unifiedState = new UnifiedGameState();

// Later in constructor
this.orchestrator = new ModuleOrchestrator(modules, this.unifiedState);
```

**Verification Checkpoint 1.1.2:**
```javascript
// In existing GameEngine.test.js, add:
test('GameEngine initializes with unified state', () => {
  const engine = new GameEngine(orchestrator);
  expect(engine.unifiedState).toBeDefined();
  expect(engine.unifiedState.getCurrentMode()).toBe('settlement');
});
```

**Run verification:**
```bash
npm test -- GameEngine.test.js
```

**Expected:** Test passes, no existing tests break ✅

---

### Phase 1.2: Mode Manager (2 hours)

#### Task 1.2.1: Create ModeManager Class

**Location:** `src/core/ModeManager.js`

**Dependencies:** Task 1.1.2 must be complete

**Steps:**
1. Create new file `src/core/ModeManager.js`
2. Copy class definition from spec
3. Implement constructor with unifiedState, gameEngine, orchestrator
4. Implement `switchMode()`, `_validateTransition()`, `_saveCurrentState()`, `_cleanupMode()`, `_initializeMode()`

**Key Implementation Details:**

**switchMode() must:**
1. Prevent concurrent transitions (check `isTransitioning` flag)
2. Validate transition is allowed
3. Pause game engine
4. Save current state
5. Cleanup current mode
6. Switch mode
7. Initialize new mode
8. Resume game engine
9. Handle errors with rollback

**Code Template:**
```javascript
async switchMode(targetMode, context = {}) {
  if (this.isTransitioning) {
    return { success: false, error: 'Transition already in progress' };
  }

  this.isTransitioning = true;

  try {
    // Validate
    const canTransition = this._validateTransition(targetMode, context);
    if (!canTransition.valid) {
      throw new Error(canTransition.reason);
    }

    // Pause
    this.engine.pause();

    // Save current state
    const currentMode = this.state.getCurrentMode();
    await this._saveCurrentState(currentMode);

    // Cleanup
    await this._cleanupMode(currentMode);

    // Switch
    this.state._setMode(targetMode);

    // Initialize
    await this._initializeMode(targetMode, context);

    // Resume
    this.engine.resume();

    this.isTransitioning = false;
    return { success: true, mode: targetMode };

  } catch (error) {
    // Rollback
    this.isTransitioning = false;
    this.engine.resume();
    return { success: false, error: error.message };
  }
}
```

**Verification Checkpoint 1.2.1:**
```javascript
// src/core/__tests__/ModeManager.test.js
import ModeManager from '../ModeManager';
import UnifiedGameState from '../UnifiedGameState';

describe('ModeManager', () => {
  let state, engine, orchestrator, manager;

  beforeEach(() => {
    state = new UnifiedGameState();
    engine = { pause: jest.fn(), resume: jest.fn() };
    orchestrator = { getGameState: jest.fn(() => ({})) };
    manager = new ModeManager(state, engine, orchestrator);
  });

  test('prevents concurrent transitions', async () => {
    manager.isTransitioning = true;
    const result = await manager.switchMode('expedition', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('already in progress');
  });

  test('validates transitions', async () => {
    const result = await manager.switchMode('invalid', {});
    expect(result.success).toBe(false);
  });

  test('requires expedition hall for settlement→expedition', async () => {
    const result = await manager.switchMode('expedition', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Expedition Hall');
  });

  test('successful transition calls all steps', async () => {
    manager.registerCleanupHandler('settlement', jest.fn());
    manager.registerInitHandler('expedition', jest.fn());

    const result = await manager.switchMode('expedition', {
      expeditionHallId: 'hall1',
      party: ['npc1']
    });

    expect(result.success).toBe(true);
    expect(engine.pause).toHaveBeenCalled();
    expect(engine.resume).toHaveBeenCalled();
    expect(state.getCurrentMode()).toBe('expedition');
  });
});
```

**Run verification:**
```bash
npm test -- ModeManager.test.js
```

**Expected:** All tests pass ✅

---

#### Task 1.2.2: Register Mode Handlers

**Location:** Various game mode files (to be created later)

**Steps:**
1. In GameEngine constructor, register cleanup/init handlers
2. For now, create placeholder handlers
3. Will implement actual handlers in later phases

**Code Changes:**
```javascript
// In GameEngine.js constructor (after ModeManager creation)
this.modeManager = new ModeManager(
  this.unifiedState,
  this,
  this.orchestrator
);

// Register placeholder handlers (will be replaced later)
this.modeManager.registerCleanupHandler('settlement', async () => {
  console.log('Cleaning up settlement mode');
  // Save settlement state
});

this.modeManager.registerCleanupHandler('expedition', async () => {
  console.log('Cleaning up expedition mode');
  // Save expedition progress
});

this.modeManager.registerCleanupHandler('defense', async () => {
  console.log('Cleaning up defense mode');
  // Save defense state
});

this.modeManager.registerInitHandler('settlement', async (context) => {
  console.log('Initializing settlement mode');
  // Load settlement state
});

this.modeManager.registerInitHandler('expedition', async (context) => {
  console.log('Initializing expedition mode', context);
  // Create expedition instance
});

this.modeManager.registerInitHandler('defense', async (context) => {
  console.log('Initializing defense mode', context);
  // Create defense instance
});
```

**Verification Checkpoint 1.2.2:**

**Manual test:**
1. Start game in development mode
2. Open browser console
3. Run: `window.gameEngine.modeManager.switchMode('expedition', { expeditionHallId: 'test', party: ['npc1'] })`
4. Check console for "Cleaning up settlement mode" and "Initializing expedition mode"
5. Verify mode changed: `window.gameEngine.unifiedState.getCurrentMode()` should return "expedition"

**Expected:** Console logs appear, mode switches, no errors ✅

---

### Phase 1.3: Shared Resource Manager (2 hours)

#### Task 1.3.1: Create SharedResourceManager Class

**Location:** `src/shared/SharedResourceManager.js`

**Dependencies:** Task 1.1.2 complete, existing StorageManager

**Steps:**
1. Create directory `src/shared/` if it doesn't exist
2. Create `SharedResourceManager.js`
3. Implement class from spec
4. Integrate with existing StorageManager

**Implementation Notes:**
- SharedResourceManager **extends** StorageManager functionality
- It does NOT replace StorageManager
- It adds cross-mode resource tracking

**Code Template:**
```javascript
/**
 * SharedResourceManager.js - Cross-mode resource management
 */
class SharedResourceManager {
  constructor(storageManager, unifiedState) {
    this.storage = storageManager;
    this.state = unifiedState;
    this.resourceSources = new Map();
  }

  addResourceFromExpedition(resource, amount, expeditionId) {
    // Add to storage
    this.storage.addResource(resource, amount);

    // Update unified state
    if (this.state.sharedResources[resource] !== undefined) {
      this.state.sharedResources[resource] += amount;
    }

    // Track source
    this._trackSource(resource, `expedition:${expeditionId}`, amount);
  }

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

  // ... implement other methods from spec
}

export default SharedResourceManager;
```

**Verification Checkpoint 1.3.1:**
```javascript
// src/shared/__tests__/SharedResourceManager.test.js
import SharedResourceManager from '../SharedResourceManager';
import StorageManager from '../../modules/resource-economy/StorageManager';
import UnifiedGameState from '../../core/UnifiedGameState';

describe('SharedResourceManager', () => {
  let storage, state, manager;

  beforeEach(() => {
    storage = new StorageManager();
    state = new UnifiedGameState();
    manager = new SharedResourceManager(storage, state);
  });

  test('adds resources from expedition', () => {
    manager.addResourceFromExpedition('gold', 100, 'exp1');

    expect(storage.getResource('gold')).toBe(100);
    expect(state.sharedResources.gold).toBe(100);
  });

  test('checks if can afford expedition', () => {
    storage.addResource('gold', 50);
    storage.addResource('food', 20);

    const result1 = manager.canAffordExpedition({ gold: 30, food: 10 });
    expect(result1.canAfford).toBe(true);

    const result2 = manager.canAffordExpedition({ gold: 100, food: 10 });
    expect(result2.canAfford).toBe(false);
    expect(result2.missing.gold).toBe(50);
  });

  test('tracks resource sources', () => {
    manager.addResourceFromExpedition('gold', 100, 'exp1');
    manager.addResourceFromExpedition('gold', 50, 'exp2');

    const stats = manager.getResourceStats();
    expect(stats.sources.gold['expedition:exp1']).toBe(100);
    expect(stats.sources.gold['expedition:exp2']).toBe(50);
  });
});
```

**Run verification:**
```bash
npm test -- SharedResourceManager.test.js
```

**Expected:** All tests pass ✅

---

#### Task 1.3.2: Integrate with ModuleOrchestrator

**Location:** `src/core/ModuleOrchestrator.js`

**Dependencies:** Task 1.3.1 complete

**Steps:**
1. Import SharedResourceManager
2. Create instance in constructor
3. Expose through orchestrator API

**Code Changes:**
```javascript
// At top of ModuleOrchestrator.js
import SharedResourceManager from '../shared/SharedResourceManager.js';

// In constructor (after storage initialization)
this.sharedResources = new SharedResourceManager(
  this.storage,
  gameEngine.unifiedState
);
```

**Verification Checkpoint 1.3.2:**
```javascript
// In existing ModuleOrchestrator.test.js, add:
test('orchestrator has shared resource manager', () => {
  expect(orchestrator.sharedResources).toBeDefined();
  expect(typeof orchestrator.sharedResources.addResourceFromExpedition).toBe('function');
});
```

**Run verification:**
```bash
npm test -- ModuleOrchestrator.test.js
```

**Expected:** Test passes, no existing tests break ✅

---

### Phase 1.4: Shared Inventory Manager (2-3 hours)

#### Task 1.4.1: Create SharedInventoryManager Class

**Location:** `src/shared/SharedInventoryManager.js`

**Dependencies:** Task 1.1.2 complete

**Steps:**
1. Create `SharedInventoryManager.js` in `src/shared/`
2. Implement full class from spec
3. Handle equipment, consumables, materials

**Code Template:**
```javascript
/**
 * SharedInventoryManager.js - Cross-mode inventory management
 */
class SharedInventoryManager {
  constructor(unifiedState) {
    this.state = unifiedState;
    this.nextItemId = 1;
  }

  addEquipment(item) {
    const itemWithId = {
      id: `equip_${this.nextItemId++}`,
      ...item,
      addedAt: Date.now()
    };
    this.state.sharedInventory.equipment.push(itemWithId);
    return itemWithId.id;
  }

  addConsumable(item, quantity = 1) {
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

  // ... implement other methods from spec
}

export default SharedInventoryManager;
```

**Verification Checkpoint 1.4.1:**
```javascript
// src/shared/__tests__/SharedInventoryManager.test.js
import SharedInventoryManager from '../SharedInventoryManager';
import UnifiedGameState from '../../core/UnifiedGameState';

describe('SharedInventoryManager', () => {
  let state, manager;

  beforeEach(() => {
    state = new UnifiedGameState();
    manager = new SharedInventoryManager(state);
  });

  test('adds equipment with unique ID', () => {
    const id1 = manager.addEquipment({ name: 'Sword', damage: 10, type: 'weapon' });
    const id2 = manager.addEquipment({ name: 'Shield', defense: 5, type: 'armor' });

    expect(id1).not.toBe(id2);
    expect(state.sharedInventory.equipment).toHaveLength(2);
  });

  test('stacks consumables of same type', () => {
    manager.addConsumable({ name: 'Potion', heal: 50 }, 3);
    manager.addConsumable({ name: 'Potion', heal: 50 }, 2);

    const potions = state.sharedInventory.consumables.find(c => c.name === 'Potion');
    expect(potions.quantity).toBe(5);
  });

  test('uses consumable and decrements quantity', () => {
    manager.addConsumable({ name: 'Potion', heal: 50 }, 3);
    const item = state.sharedInventory.consumables[0];

    const used = manager.useConsumable(item.id);
    expect(used).toBeTruthy();
    expect(item.quantity).toBe(2);
  });

  test('removes consumable when quantity reaches 0', () => {
    manager.addConsumable({ name: 'Potion', heal: 50 }, 1);
    const item = state.sharedInventory.consumables[0];

    manager.useConsumable(item.id);
    expect(state.sharedInventory.consumables).toHaveLength(0);
  });
});
```

**Run verification:**
```bash
npm test -- SharedInventoryManager.test.js
```

**Expected:** All tests pass ✅

---

#### Task 1.4.2: Integrate with ModuleOrchestrator

**Location:** `src/core/ModuleOrchestrator.js`

**Dependencies:** Task 1.4.1 complete

**Steps:**
1. Import SharedInventoryManager
2. Create instance in constructor
3. Expose through orchestrator API

**Code Changes:**
```javascript
// At top of ModuleOrchestrator.js
import SharedInventoryManager from '../shared/SharedInventoryManager.js';

// In constructor (after sharedResources)
this.sharedInventory = new SharedInventoryManager(
  gameEngine.unifiedState
);
```

**Verification Checkpoint 1.4.2:**

**Integration test:**
```javascript
// In ModuleOrchestrator.test.js
test('can add and retrieve inventory items', () => {
  const itemId = orchestrator.sharedInventory.addEquipment({
    name: 'Test Sword',
    damage: 10,
    type: 'weapon'
  });

  const item = orchestrator.sharedInventory.getItem(itemId);
  expect(item.name).toBe('Test Sword');
  expect(item.damage).toBe(10);
});
```

**Run verification:**
```bash
npm test -- ModuleOrchestrator.test.js
```

**Expected:** Test passes ✅

---

### Phase 1 Complete - Final Verification

**Checkpoint: Phase 1 Complete**

Run all tests:
```bash
npm test
```

**Expected:**
- ✅ All existing tests still pass
- ✅ All new tests pass (UnifiedGameState, ModeManager, SharedResourceManager, SharedInventoryManager)
- ✅ No console errors
- ✅ Game still runs in development mode

**Manual verification:**
1. Start game: `npm start`
2. Open browser console
3. Test mode switching:
   ```javascript
   gameEngine.modeManager.switchMode('expedition', {
     expeditionHallId: 'test',
     party: ['npc1']
   }).then(result => console.log(result))
   ```
4. Verify resources work:
   ```javascript
   gameEngine.orchestrator.sharedResources.addResourceFromExpedition('gold', 100, 'test')
   console.log(gameEngine.unifiedState.sharedResources.gold) // Should be 100
   ```
5. Verify inventory works:
   ```javascript
   gameEngine.orchestrator.sharedInventory.addEquipment({name: 'Sword', damage: 10, type: 'weapon'})
   console.log(gameEngine.orchestrator.sharedInventory.getEquipment())
   ```

**If all verifications pass:** ✅ **Phase 1 is complete! Commit your work:**
```bash
git add src/core/ src/shared/
git commit -m "feat: Implement Phase 1 - Unified state and mode management

- Add UnifiedGameState for cross-mode state
- Add ModeManager for mode switching
- Add SharedResourceManager for cross-mode resources
- Add SharedInventoryManager for cross-mode inventory
- All systems tested and integrated"
```

---

## Continuation Structure

The guide would continue with:

### Phase 2: NPC Combat System (10-12 hours)
- Task 2.1.1: Extend NPC data model with combat stats
- Task 2.1.2: Add combat level progression
- Task 2.2.1: Create NPCSkillSystem class
- Task 2.2.2: Implement skill upgrade logic
- ... (detailed steps for all Phase 2 tasks)

### Milestone 1 Complete Verification
- Full integration test of all Phase 1-2 systems
- Performance benchmarks
- Ready for Phase 3

### Phase 3: Expedition System (12-15 hours)
- ... (detailed steps)

And so on through all milestones.

---

## Common Pitfalls

### 1. Forgetting to Initialize Systems in Order

**Problem:** Creating ModeManager before UnifiedGameState
**Solution:** Always follow dependency order shown in tasks

### 2. Not Deep Copying State

**Problem:** State objects shared across modes causing mutations
**Solution:** Use `JSON.parse(JSON.stringify(obj))` or structured clone

### 3. Skipping Verification Checkpoints

**Problem:** Bugs compound and become hard to debug
**Solution:** Always run verification after each task

### 4. Not Handling Async Properly

**Problem:** Race conditions in mode switching
**Solution:** Use `isTransitioning` flag and proper async/await

### 5. Breaking Existing Tests

**Problem:** New code breaks old functionality
**Solution:** Run full test suite after each phase

---

## Troubleshooting

### Issue: Tests Fail After Adding UnifiedGameState

**Symptoms:** Orchestrator or GameEngine tests failing

**Fix:**
1. Check that UnifiedGameState is properly exported
2. Verify import path is correct
3. Check that constructor doesn't require missing dependencies

### Issue: Mode Switching Throws Errors

**Symptoms:** Errors during `switchMode()` calls

**Debug Steps:**
1. Check validation logic in `_validateTransition()`
2. Verify context object has required fields
3. Check cleanup/init handlers don't throw errors
4. Add logging to each step of `switchMode()`

### Issue: Resources Not Syncing Across Modes

**Symptoms:** Resources added in expedition don't appear in settlement

**Fix:**
1. Verify `syncResources()` is called after mode switch
2. Check that StorageManager and UnifiedGameState stay in sync
3. Verify resource tracking in `_trackSource()`

---

**Document Created:** 2025-11-15
**Version:** 1.0
**Next Document:** Complete implementation guides for Phases 2-8 (to be created as needed)
