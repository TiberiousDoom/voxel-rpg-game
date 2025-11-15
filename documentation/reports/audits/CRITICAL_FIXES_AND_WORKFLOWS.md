# Voxel RPG Game - Critical Fixes & Parallel Workflow Plan

## 🚨 CRITICAL ARCHITECTURE ISSUES - MUST FIX FIRST

This document outlines the implementation strategy for fixing critical architecture issues and implementing planned features using parallel workflows with clear naming and tracking systems.

---

## TABLE OF CONTENTS

1. [Phase 0: Critical Fixes (Sequential - BLOCKERS)](#phase-0-critical-fixes-sequential---blockers)
2. [Workflow Naming & Tracking System](#workflow-naming--tracking-system)
3. [Phase 1: Core Gameplay Loop (Parallel Workflows)](#phase-1-core-gameplay-loop-parallel-workflows)
4. [Phase 2: Economy & Progression (Parallel Workflows)](#phase-2-economy--progression-parallel-workflows)
5. [Best Practices & Standards](#best-practices--standards)
6. [Testing Strategy](#testing-strategy)
7. [Parallel Execution Schedule](#parallel-execution-schedule)

---

## PHASE 0: CRITICAL FIXES (Sequential - BLOCKERS)

**Duration:** ~1.5 hours
**Dependencies:** None
**Must Complete Before:** Any Phase 1 work begins
**Workflow Type:** Sequential (fix order matters)
**Branch:** `claude/fix-critical-architecture-issues-011CUyMZNLn4ivDeVv88unUQ`

### Issue #1: Grid Size Mismatch ⚠️ HIGH PRIORITY (30 min)

**Problem:**
- GameViewport renders 10×10 grid (src/components/GameViewport.jsx:28-29)
- GridManager operates on 100×100 grid (src/modules/foundation/GridManager.js:19)
- config.js specifies 100×100 (src/shared/config.js:62-64)
- Modulo operation in worldToCanvas causes visual overlapping

**Solution:** Reduce world size to match viewport (Option C - simplest for Phase 1)

#### Files to Modify:

**1. `src/modules/foundation/GridManager.js:19`**
```javascript
// BEFORE:
constructor(gridSize = 100, gridHeight = 50) {

// AFTER:
constructor(gridSize = 10, gridHeight = 50) {
```

**2. `src/shared/config.js:62-64`**
```javascript
// BEFORE:
GRID: {
  GRID_WIDTH: 100,
  GRID_HEIGHT: 100,

// AFTER:
GRID: {
  GRID_WIDTH: 10,
  GRID_HEIGHT: 10,
```

**3. Add validation in `GridManager.js:68-86`**
```javascript
validateBounds(x, z, y = null) {
  // Add explicit bounds checking with clear error messages
  if (x < 0 || x >= this.gridSize) {
    throw new Error(`X coordinate ${x} out of bounds [0, ${this.gridSize})`);
  }
  if (z < 0 || z >= this.gridSize) {
    throw new Error(`Z coordinate ${z} out of bounds [0, ${this.gridSize})`);
  }
  // Existing height validation...
}
```

**Verification Steps:**
- [ ] Place building at (9, 25, 9) - should appear at bottom-right corner visually
- [ ] Attempt to place at (10, 25, 10) - should throw clear error
- [ ] Verify config.js GRID_WIDTH matches GameViewport.jsx GRID_WIDTH (both 10)
- [ ] No console errors during placement

---

### Issue #2: NPCs Spawn in Same Location ⚠️ HIGH PRIORITY (20 min)

**Problem:**
- All NPCs spawn at hardcoded position (50, 25, 50) - src/modules/npc-system/NPCManager.js:212
- After modulo 10, all appear at visual position (0, 0)
- NPCs stack on top of each other - invisible population

**Solution:** Random spawn positions within grid bounds (Option A for now)

#### Files to Modify:

**1. `src/components/GameScreen.jsx:114`**
```javascript
// BEFORE:
onSpawnNPC={() => actions.spawnNPC('FARMER')}

// AFTER:
onSpawnNPC={() => {
  const randomPos = {
    x: Math.floor(Math.random() * 10),  // 0-9
    y: 25,
    z: Math.floor(Math.random() * 10)   // 0-9
  };
  actions.spawnNPC('FARMER', randomPos);
}}
```

**2. `src/modules/npc-system/NPCManager.js:212-229`**
```javascript
// BEFORE:
spawnNPC(role, position = { x: 50, y: 25, z: 50 }) {

// AFTER:
spawnNPC(role, position = null) {
  // If no position provided, generate random within bounds
  if (!position) {
    position = {
      x: Math.floor(Math.random() * this.gridManager.gridSize),
      y: 25,
      z: Math.floor(Math.random() * this.gridManager.gridSize)
    };
  }

  // Validate position is within bounds
  if (position.x < 0 || position.x >= this.gridManager.gridSize ||
      position.z < 0 || position.z >= this.gridManager.gridSize) {
    console.warn(`[NPCManager] Spawn position (${position.x}, ${position.z}) out of bounds, using random`);
    position = {
      x: Math.floor(Math.random() * this.gridManager.gridSize),
      y: 25,
      z: Math.floor(Math.random() * this.gridManager.gridSize)
    };
  }

  // Existing spawn logic...
}
```

**3. Pass gridManager reference to NPCManager**
```javascript
// In GameManager initialization (wherever NPCManager is created):
this.npcManager = new NPCManager(
  this.townManager,
  this.gridManager  // Pass grid manager for bounds validation
);

// Update NPCManager constructor:
constructor(townManager, gridManager) {
  this.townManager = townManager;
  this.gridManager = gridManager;
  // ...
}
```

**Verification Steps:**
- [ ] Spawn 5 NPCs - all should appear at different random positions
- [ ] Verify all NPCs are within visible grid (0-9, 0-9)
- [ ] Spawn NPC with explicit position - should use provided position
- [ ] Check console for spawn position logs

---

### Issue #3: "Game Stopped" Banner ⚡ UX IMPROVEMENT (15 min)

**Problem:**
- Users don't realize they need to click Play
- Nothing happens after placing buildings/spawning NPCs
- No visual feedback that game tick loop is not running

**Solution:** Add prominent banner when game is not running

#### Files to Modify:

**1. `src/components/GameScreen.jsx`**

Add styles near top of file:
```javascript
const playReminderStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 1000,
  backgroundColor: 'rgba(255, 193, 7, 0.95)',
  border: '4px solid #ff9800',
  borderRadius: '12px',
  padding: '32px 48px',
  textAlign: 'center',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  animation: 'pulse 2s infinite'
};
```

Add in render, just before GameViewport:
```jsx
{!gameState.isRunning && (
  <div style={playReminderStyle}>
    <h2 style={{ margin: '0 0 16px 0', fontSize: '28px', color: '#000' }}>
      ⚠️ Game is Stopped
    </h2>
    <p style={{ margin: '0', fontSize: '18px', color: '#333' }}>
      Click the <strong>▶️ PLAY</strong> button at the bottom to start!
    </p>
    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
      Resources won't produce and NPCs won't work until the game is running.
    </p>
  </div>
)}
```

**2. `src/index.css` or GameScreen styles**
```css
@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.02); }
}
```

**Verification Steps:**
- [ ] Start game - banner should appear centered
- [ ] Click Play - banner should disappear immediately
- [ ] Pause game - banner should NOT reappear (only for stopped state)
- [ ] Stop game - banner should reappear
- [ ] Banner should pulse subtly

---

### Issue #4: Save Slot Selector ⚡ UX IMPROVEMENT (20 min)

**Problem:**
- Users can't choose save slots
- Clicking Save twice overwrites previous save
- No visibility into which slots have saves
- No metadata display (when saved, what tier, etc.)

**Solution:** Add save slot selector UI with metadata display

#### Files to Modify:

**1. `src/components/GameControlBar.jsx`**
```jsx
import React, { useState, useEffect } from 'react';

const GameControlBar = ({ onStart, onStop, onPause, onResume, onSave, onLoad, isPaused, isRunning }) => {
  const [selectedSlot, setSelectedSlot] = useState('slot-1');
  const [savedSlots, setSavedSlots] = useState(new Set());

  // Check localStorage for existing saves on mount
  useEffect(() => {
    const existing = new Set();
    for (let i = 1; i <= 3; i++) {
      const slotKey = `slot-${i}`;
      if (localStorage.getItem(slotKey)) {
        existing.add(slotKey);
      }
    }
    setSavedSlots(existing);
  }, []);

  const handleSave = () => {
    onSave(selectedSlot);
    setSavedSlots(prev => new Set([...prev, selectedSlot]));
  };

  const handleLoad = () => {
    if (savedSlots.has(selectedSlot)) {
      onLoad(selectedSlot);
    } else {
      alert(`No save found in ${selectedSlot}`);
    }
  };

  return (
    <div className="game-control-bar">
      {/* Existing play/pause buttons */}
      <button onClick={onStart} disabled={isRunning}>
        ▶️ Play
      </button>
      <button onClick={onPause} disabled={!isRunning || isPaused}>
        ⏸️ Pause
      </button>
      <button onClick={onResume} disabled={!isPaused}>
        ⏯️ Resume
      </button>
      <button onClick={onStop} disabled={!isRunning && !isPaused}>
        ⏹️ Stop
      </button>

      {/* Save/Load section */}
      <div className="save-load-section" style={{ display: 'inline-block', marginLeft: '20px' }}>
        <select
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
          className="slot-selector"
          style={{ padding: '8px', marginRight: '8px' }}
        >
          <option value="slot-1">
            Slot 1 {savedSlots.has('slot-1') ? '💾' : '⬜'}
          </option>
          <option value="slot-2">
            Slot 2 {savedSlots.has('slot-2') ? '💾' : '⬜'}
          </option>
          <option value="slot-3">
            Slot 3 {savedSlots.has('slot-3') ? '💾' : '⬜'}
          </option>
        </select>

        <button onClick={handleSave} style={{ marginRight: '8px' }}>
          💾 Save
        </button>

        <button
          onClick={handleLoad}
          disabled={!savedSlots.has(selectedSlot)}
        >
          📂 Load
        </button>
      </div>
    </div>
  );
};

export default GameControlBar;
```

**Verification Steps:**
- [ ] Save to Slot 1 - should show 💾 icon in dropdown
- [ ] Save to Slot 2 - should show 💾 icon in dropdown
- [ ] Switch to Slot 3 (empty) - Load button should be disabled
- [ ] Load from Slot 1 - should restore saved game state
- [ ] Overwrite Slot 1 - should update existing save
- [ ] Icons persist across page refresh

---

### Issue #5: Debounce Interval ⚙️ PERFORMANCE (OPTIONAL - 5 min)

**Problem:**
- 500ms debounce causes noticeable UI delay
- Resources update at tick 5.0s, but UI shows at 5.5s
- Feels sluggish when interacting with game

**Solution:** Reduce to 100-200ms for faster UI updates

#### Files to Modify:

**1. `src/hooks/useGameManager.js:80-103`**
```javascript
// BEFORE:
debounceInterval: config.debounceInterval || 500,

// AFTER:
debounceInterval: config.debounceInterval || 150,  // Faster UI updates
```

**2. `src/shared/config.js` (add debounce config)**
```javascript
// Add to exports:
PERFORMANCE: {
  DEBOUNCE_INTERVAL: 150,  // UI update debounce in ms
  TICK_INTERVAL: 5000,     // Game tick interval in ms
}
```

**Verification Steps:**
- [ ] Start game, watch resource counter - should update within 150ms of tick
- [ ] Monitor console for excessive re-renders - should be minimal
- [ ] Profile with React DevTools - no performance degradation
- [ ] UI feels more responsive

---

## PHASE 0 COMPLETION CHECKLIST

Before proceeding to Phase 1, verify:

- [ ] **Grid Size:** All systems use consistent 10×10 grid
  - [ ] GridManager.gridSize === 10
  - [ ] config.GRID_WIDTH === 10
  - [ ] GameViewport.GRID_WIDTH === 10
- [ ] **NPC Spawning:** NPCs spawn at random valid positions
  - [ ] 5+ NPCs all at different positions
  - [ ] All NPCs within (0-9, 0-9) bounds
- [ ] **Play Button Banner:** Visible when game is stopped
  - [ ] Banner appears on game load
  - [ ] Banner disappears when Play clicked
  - [ ] Banner reappears when Stop clicked
- [ ] **Save Slots:** 3 slots with visual indicators
  - [ ] Can save to each slot independently
  - [ ] Icons show saved vs empty slots
  - [ ] Load button disabled for empty slots
- [ ] **UI Responsiveness:** Updates within 150-200ms
  - [ ] Resource updates feel immediate
  - [ ] No lag when clicking buttons
- [ ] **No Console Errors:** Clean browser console
  - [ ] No errors during placement
  - [ ] No errors during NPC spawn
  - [ ] No errors during save/load

**Estimated Total Time:** 1.5 hours
**Commit Message Template:**
```
fix(P0): Critical architecture fixes for Phase 0

- Align grid size to 10×10 across all systems (GridManager, config, GameViewport)
- Implement random NPC spawn positions with bounds validation
- Add "Game Stopped" banner with pulsing animation for better UX
- Implement save slot selector with 3 slots and visual indicators
- Reduce debounce interval to 150ms for faster UI responsiveness

Fixes critical issues preventing Phase 1 development.
Resolves grid mismatch, NPC stacking, and UX confusion.
```

---

## WORKFLOW NAMING & TRACKING SYSTEM

To manage parallel development effectively, we'll use a structured naming convention and tracking system.

### Branch Naming Convention

```
claude/<workflow-id>-<feature-description>-<session-id>
```

**Format Breakdown:**
- `claude/` - Prefix for all AI-generated branches
- `<workflow-id>` - Phase and letter (P1A, P1B, etc.)
- `<feature-description>` - Kebab-case description
- `<session-id>` - Unique session identifier

**Examples:**
```
claude/P1A-npc-job-assignment-011CUyMZNLn4ivDeVv88unUQ
claude/P1B-resource-production-011CUyMZNLn4ivDeVv88unUQ
claude/P1C-building-health-repair-011CUyMZNLn4ivDeVv88unUQ
claude/P1D-visual-improvements-011CUyMZNLn4ivDeVv88unUQ
claude/P2A-tier-progression-system-011CUyMZNLn4ivDeVv88unUQ
```

---

### Workflow ID System

Format: `P<Phase><Letter>` where:
- **P** = Phase prefix
- **Number** = Phase number (0-4)
- **Letter** = Workflow identifier (A, B, C, D, etc.)

**Phase 0 Workflow IDs:**
- **P0-CRITICAL** - Critical architecture fixes (SEQUENTIAL, NO PARALLELISM)

**Phase 1 Workflow IDs:**
- **P1A** - NPC Job Assignment System
- **P1B** - Resource Production & Consumption
- **P1C** - Building Health & Repair
- **P1D** - Visual Improvements (NPC/Building rendering)

**Phase 2 Workflow IDs:**
- **P2A** - Tier Progression System
- **P2B** - Advanced Building Types
- **P2C** - Territory Expansion
- **P2D** - Save/Load Improvements

**Phase 3 Workflow IDs:**
- **P3A** - NPC Advanced Behaviors (pathfinding, idle tasks)
- **P3B** - Event System (random events, disasters)
- **P3C** - Achievement System
- **P3D** - Tutorial System

**Phase 4 Workflow IDs:**
- **P4A** - Performance Optimization
- **P4B** - Camera/Zoom/Pan System
- **P4C** - Advanced Graphics (shadows, effects)
- **P4D** - Audio Integration (SFX, music)

---

### Workflow Tracking Document

Create `/WORKFLOW_TRACKING.md` with this structure:

```markdown
# Workflow Tracking

Last Updated: 2024-11-10 10:00

## Legend
- 🟢 Ready to Start
- 🟡 In Progress
- 🔴 Blocked
- ✅ Complete
- ⏸️ Paused

---

## Phase 0: Critical Fixes

### P0-CRITICAL: Critical Architecture Fixes
- **Status:** ✅ Complete
- **Branch:** `claude/fix-critical-architecture-issues-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Claude Session (Initial)
- **Dependencies:** None
- **Files Modified:**
  - `src/modules/foundation/GridManager.js`
  - `src/shared/config.js`
  - `src/components/GameScreen.jsx`
  - `src/modules/npc-system/NPCManager.js`
  - `src/components/GameControlBar.jsx`
  - `src/hooks/useGameManager.js`
- **Progress:**
  - [x] Fix grid size mismatch (10×10)
  - [x] Fix NPC spawn positions (random)
  - [x] Add "Game Stopped" banner
  - [x] Add save slot selector
  - [x] Reduce debounce interval
- **Blockers:** None
- **Completed:** 2024-11-10 11:30

---

## Phase 1: Core Gameplay Loop (4 parallel workflows)

### P1A: NPC Job Assignment System
- **Status:** 🟢 Ready to Start
- **Branch:** `claude/P1A-npc-job-assignment-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Session #1
- **Dependencies:** P0 complete ✅
- **Can Run Parallel With:** P1B, P1D
- **Files to Modify:**
  - `src/modules/npc-system/NPCAssignment.js` (new file)
  - `src/modules/npc-system/NPCManager.js`
  - `src/components/GameScreen.jsx`
  - `src/components/NPCPanel.jsx`
- **Progress:**
  - [ ] Design assignment algorithm
  - [ ] Implement assignNPCToBuilding()
  - [ ] Implement unassignNPC()
  - [ ] Implement autoAssign()
  - [ ] Add UI for manual assignment
  - [ ] Integration testing
- **Blockers:** None
- **Est. Duration:** 3 hours
- **Est. Completion:** TBD

### P1B: Resource Production & Consumption
- **Status:** 🟢 Ready to Start
- **Branch:** `claude/P1B-resource-production-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Session #2
- **Dependencies:** P0 complete ✅
- **Can Run Parallel With:** P1A, P1D
- **Files to Modify:**
  - `src/modules/resource-economy/ProductionTick.js`
  - `src/modules/resource-economy/ConsumptionSystem.js`
  - `src/modules/building-types/BuildingConfig.js`
- **Progress:**
  - [ ] Implement NPC-based production multipliers
  - [ ] Add skill-based production bonuses
  - [ ] Implement NPC food consumption
  - [ ] Add starvation mechanics
  - [ ] Balance resource rates
  - [ ] Integration testing
- **Blockers:** None
- **Est. Duration:** 3 hours
- **Est. Completion:** TBD

### P1C: Building Health & Repair
- **Status:** 🟢 Ready to Start
- **Branch:** `claude/P1C-building-health-repair-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Session #3
- **Dependencies:** P0 complete ✅, P1A helpful but not required
- **Can Run Parallel With:** P1D
- **Files to Modify:**
  - `src/modules/foundation/GridManager.js`
  - `src/modules/building-types/BuildingConfig.js`
  - `src/components/BuildingInfoPanel.jsx` (new file)
- **Progress:**
  - [ ] Add health/maxHealth to building entities
  - [ ] Implement damageBuilding() method
  - [ ] Implement repairBuilding() method
  - [ ] Add repair cost configurations
  - [ ] Create BuildingInfoPanel UI component
  - [ ] Add repair resource validation
  - [ ] Integration testing
- **Blockers:** None
- **Est. Duration:** 2 hours
- **Est. Completion:** TBD

### P1D: Visual Improvements
- **Status:** 🟢 Ready to Start
- **Branch:** `claude/P1D-visual-improvements-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Session #4
- **Dependencies:** P0 complete ✅
- **Can Run Parallel With:** P1A, P1B, P1C
- **Files to Modify:**
  - `src/components/GameViewport.jsx`
  - `src/styles/GameViewport.css` (new file)
- **Progress:**
  - [ ] Enhance NPC rendering (color-coded status)
  - [ ] Add NPC role indicators
  - [ ] Add NPC health bars
  - [ ] Enhance building rendering (state-based colors)
  - [ ] Add build progress bars
  - [ ] Add worker count indicators
  - [ ] Add health bars for damaged buildings
- **Blockers:** None
- **Est. Duration:** 2 hours
- **Est. Completion:** TBD

---

## Phase 2: Economy & Progression

### P2A: Tier Progression System
- **Status:** 🔴 Blocked (waiting on P1)
- **Branch:** TBD
- **Dependencies:** Phase 1 complete
- **Can Run Parallel With:** P2D
- **Est. Duration:** 3 hours

### P2B: Advanced Building Types
- **Status:** 🔴 Blocked (waiting on P1)
- **Branch:** TBD
- **Dependencies:** Phase 1 complete
- **Can Run Parallel With:** P2C, P2D
- **Est. Duration:** 3 hours

### P2C: Territory Expansion
- **Status:** 🔴 Blocked (waiting on P1)
- **Branch:** TBD
- **Dependencies:** Phase 1 complete
- **Can Run Parallel With:** P2B, P2D
- **Est. Duration:** 4 hours

### P2D: Save/Load Improvements
- **Status:** 🔴 Blocked (waiting on P1)
- **Branch:** TBD
- **Dependencies:** Phase 1 complete
- **Can Run Parallel With:** P2A, P2B, P2C
- **Est. Duration:** 2 hours

---

## Workflow Dependency Matrix

```
         P1A  P1B  P1C  P1D  P2A  P2B  P2C  P2D
P0        ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
P1A       -    -    -    -    ✓    -    -    -
P1B       -    -    -    -    ✓    ✓    -    -
P1C       -    -    -    -    -    ✓    -    -
P1D       -    -    -    -    -    -    -    -
P2A       -    -    -    -    -    ✓    ✓    -
P2B       -    -    -    -    -    -    -    -
P2C       -    -    -    -    -    -    -    -
P2D       -    -    -    -    -    -    -    -
```

✓ = Row depends on Column

---

## Parallel Execution Capacity

**Maximum Parallel Workflows:**
- **Phase 1:** 4 workflows can run simultaneously (P1A, P1B, P1C, P1D)
- **Phase 2:** 4 workflows can run simultaneously (P2A, P2B, P2C, P2D)

**Recommended Execution:**
1. **Day 1 Morning:** Start P1A + P1B (2 parallel sessions)
2. **Day 1 Afternoon:** Continue P1A + P1B
3. **Day 2 Morning:** Complete P1A + P1B, Start P1C + P1D
4. **Day 2 Afternoon:** Complete P1C + P1D, Integration testing
5. **Day 3:** Phase 2 workflows begin
```

---

### Status Indicators

- 🟢 **Ready to Start** - Dependencies met, can begin immediately
- 🟡 **In Progress** - Currently being developed
- 🔴 **Blocked** - Waiting on dependency or issue resolution
- ✅ **Complete** - Done, tested, and merged
- ⏸️ **Paused** - Temporarily halted (low priority or resource constraint)

---

## PHASE 1: CORE GAMEPLAY LOOP (Parallel Workflows)

**Duration:** ~8-12 hours
**Parallel Workflows:** 4
**Dependencies:** Phase 0 complete
**Integration Point:** After all P1 workflows complete

### Workflow Execution Strategy

**Option A: Staggered Start (Recommended)**
```
Hour 0-3:  P1A + P1B (2 sessions in parallel)
Hour 3-6:  P1A + P1B continue
Hour 6-8:  P1C + P1D (2 sessions in parallel)
Hour 8-10: Integration testing
Hour 10-12: Bug fixes
```

**Option B: All Parallel (Maximum Speed)**
```
Hour 0-3:  P1A + P1B + P1C + P1D (4 sessions in parallel)
Hour 3-6:  Continue all 4
Hour 6-8:  Integration testing
Hour 8-10: Bug fixes
```

**Recommendation:** Use Option A to reduce merge conflicts and allow earlier workflows to inform later ones.

---

### P1A: NPC Job Assignment System (3 hours)

**Branch:** `claude/P1A-npc-job-assignment-011CUyMZNLn4ivDeVv88unUQ`
**Dependencies:** P0 complete
**Can Run Parallel With:** P1B, P1D
**Integration Point:** Required for P1B (production calculations need worker count)

**Files Modified:**
- `src/modules/npc-system/NPCAssignment.js` (NEW - 150 lines)
- `src/modules/npc-system/NPCManager.js` (+50 lines)
- `src/components/GameScreen.jsx` (+30 lines)
- `src/components/NPCPanel.jsx` (+100 lines UI)

**Implementation Steps:**

**Step 1: Create NPCAssignment.js (90 min)**
```javascript
// src/modules/npc-system/NPCAssignment.js

/**
 * Manages NPC work assignments to buildings
 * Handles capacity checking, validation, auto-assignment
 */
class NPCAssignment {
  constructor(npcManager, gridManager) {
    this.npcManager = npcManager;
    this.gridManager = gridManager;
    // Map of buildingId -> Set of npcIds
    this.assignments = new Map();
  }

  /**
   * Assign NPC to a building for work
   * @param {string} npcId - Unique NPC identifier
   * @param {string} buildingId - Unique building identifier
   * @returns {{success: boolean, error?: string}}
   */
  assignNPCToBuilding(npcId, buildingId) {
    // 1. Validate NPC exists
    const npc = this.npcManager.npcs.get(npcId);
    if (!npc) {
      console.error(`[NPCAssignment] NPC ${npcId} not found`);
      return { success: false, error: 'NPC_NOT_FOUND' };
    }

    // 2. Validate building exists
    const building = this.gridManager.buildings.get(buildingId);
    if (!building) {
      console.error(`[NPCAssignment] Building ${buildingId} not found`);
      return { success: false, error: 'BUILDING_NOT_FOUND' };
    }

    // 3. Check building is complete (can't work in blueprint/building)
    if (building.state !== 'COMPLETE') {
      console.warn(`[NPCAssignment] Building ${buildingId} not complete (state: ${building.state})`);
      return { success: false, error: 'BUILDING_NOT_COMPLETE' };
    }

    // 4. Check building capacity
    const capacity = building.properties.npcCapacity || 0;
    if (capacity === 0) {
      console.warn(`[NPCAssignment] Building ${buildingId} has no NPC capacity`);
      return { success: false, error: 'NO_CAPACITY' };
    }

    const currentWorkers = this.assignments.get(buildingId) || new Set();
    if (currentWorkers.size >= capacity) {
      console.warn(`[NPCAssignment] Building ${buildingId} at capacity (${capacity}/${capacity})`);
      return { success: false, error: 'AT_CAPACITY' };
    }

    // 5. Unassign NPC from current building if already assigned
    if (npc.assignedBuilding) {
      console.log(`[NPCAssignment] NPC ${npcId} already assigned to ${npc.assignedBuilding}, unassigning`);
      this.unassignNPC(npcId);
    }

    // 6. Perform assignment
    npc.assignedBuilding = buildingId;
    npc.setWorking(true);
    this.npcManager.moveToWorking(npcId);

    currentWorkers.add(npcId);
    this.assignments.set(buildingId, currentWorkers);

    console.log(`[NPCAssignment] ✅ Assigned NPC ${npcId} (${npc.role}) to building ${buildingId} (${building.type})`);
    return { success: true };
  }

  /**
   * Unassign NPC from current building
   * @param {string} npcId - Unique NPC identifier
   * @returns {boolean} True if unassigned, false if not assigned
   */
  unassignNPC(npcId) {
    const npc = this.npcManager.npcs.get(npcId);
    if (!npc || !npc.assignedBuilding) {
      return false;
    }

    const buildingId = npc.assignedBuilding;
    const workers = this.assignments.get(buildingId);

    if (workers) {
      workers.delete(npcId);
      if (workers.size === 0) {
        this.assignments.delete(buildingId);
      } else {
        this.assignments.set(buildingId, workers);
      }
    }

    npc.assignedBuilding = null;
    npc.setWorking(false);
    this.npcManager.moveToIdle(npcId);

    console.log(`[NPCAssignment] Unassigned NPC ${npcId} from building ${buildingId}`);
    return true;
  }

  /**
   * Auto-assign idle NPCs to understaffed buildings
   * Uses simple greedy algorithm: fill buildings in order
   */
  autoAssign() {
    const idleNPCs = Array.from(this.npcManager.idleNPCs);
    const buildings = Array.from(this.gridManager.buildings.values());

    // Sort buildings by priority (farms first, then production, then others)
    const buildingPriority = {
      'FARM': 1,
      'MINE': 2,
      'LUMBER_MILL': 3,
      'CRAFTING_STATION': 4,
      'MARKETPLACE': 5
    };

    buildings.sort((a, b) => {
      const priorityA = buildingPriority[a.type] || 99;
      const priorityB = buildingPriority[b.type] || 99;
      return priorityA - priorityB;
    });

    let assignedCount = 0;

    for (const building of buildings) {
      if (building.state !== 'COMPLETE') continue;

      const capacity = building.properties.npcCapacity || 0;
      const currentWorkers = this.assignments.get(building.id)?.size || 0;

      if (currentWorkers < capacity && idleNPCs.length > 0) {
        const npcId = idleNPCs.shift();
        const result = this.assignNPCToBuilding(npcId, building.id);
        if (result.success) {
          assignedCount++;
        }
      }
    }

    console.log(`[NPCAssignment] Auto-assigned ${assignedCount} NPCs`);
    return assignedCount;
  }

  /**
   * Get list of workers assigned to a specific building
   * @param {string} buildingId
   * @returns {Array<string>} Array of NPC IDs
   */
  getWorkersForBuilding(buildingId) {
    return Array.from(this.assignments.get(buildingId) || []);
  }

  /**
   * Get building assignment info for display
   * @param {string} buildingId
   * @returns {{capacity: number, current: number, workers: Array}}
   */
  getBuildingAssignmentInfo(buildingId) {
    const building = this.gridManager.buildings.get(buildingId);
    if (!building) return null;

    const capacity = building.properties.npcCapacity || 0;
    const workerIds = this.getWorkersForBuilding(buildingId);
    const workers = workerIds.map(id => this.npcManager.npcs.get(id));

    return {
      capacity,
      current: workerIds.length,
      workers: workers.filter(w => w !== undefined)
    };
  }

  /**
   * Get statistics for all assignments
   */
  getStatistics() {
    return {
      totalAssignments: Array.from(this.assignments.values()).reduce((sum, set) => sum + set.size, 0),
      buildingsStaffed: this.assignments.size,
      idleNPCs: this.npcManager.idleNPCs.size
    };
  }

  /**
   * Clear all assignments (used when building destroyed)
   * @param {string} buildingId
   */
  clearBuildingAssignments(buildingId) {
    const workers = this.assignments.get(buildingId);
    if (!workers) return;

    for (const npcId of workers) {
      const npc = this.npcManager.npcs.get(npcId);
      if (npc) {
        npc.assignedBuilding = null;
        npc.setWorking(false);
        this.npcManager.moveToIdle(npcId);
      }
    }

    this.assignments.delete(buildingId);
    console.log(`[NPCAssignment] Cleared all assignments for building ${buildingId}`);
  }
}

export default NPCAssignment;
```

**Step 2: Integrate with NPCManager (30 min)**
```javascript
// src/modules/npc-system/NPCManager.js

// Add these methods to NPCManager class:

/**
 * Move NPC from idle to working set
 */
moveToWorking(npcId) {
  this.idleNPCs.delete(npcId);
  this.workingNPCs.add(npcId);
  console.log(`[NPCManager] NPC ${npcId} now working`);
}

/**
 * Move NPC to idle set
 */
moveToIdle(npcId) {
  this.workingNPCs.delete(npcId);
  this.restingNPCs.delete(npcId);
  this.idleNPCs.add(npcId);
  console.log(`[NPCManager] NPC ${npcId} now idle`);
}

/**
 * Move NPC to resting set
 */
moveToResting(npcId) {
  this.idleNPCs.delete(npcId);
  this.workingNPCs.delete(npcId);
  this.restingNPCs.add(npcId);
  console.log(`[NPCManager] NPC ${npcId} now resting`);
}
```

**Step 3: Add UI Controls (60 min)**
```jsx
// src/components/NPCPanel.jsx

import React, { useState } from 'react';

const NPCPanel = ({ npcs, buildings, onAssignNPC, onUnassignNPC, onAutoAssign }) => {
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const handleAssign = () => {
    if (selectedNPC && selectedBuilding) {
      onAssignNPC(selectedNPC.id, selectedBuilding.id);
      setSelectedNPC(null);
      setSelectedBuilding(null);
    }
  };

  const handleUnassign = (npcId) => {
    onUnassignNPC(npcId);
  };

  const idleNPCs = npcs.filter(npc => !npc.assignedBuilding);
  const workingNPCs = npcs.filter(npc => npc.assignedBuilding);

  return (
    <div className="npc-panel">
      <h3>NPCs ({npcs.length})</h3>

      <div className="npc-stats">
        <div>
          💤 Idle: {idleNPCs.length}
        </div>
        <div>
          🏢 Working: {workingNPCs.length}
        </div>
      </div>

      <button onClick={onAutoAssign} className="auto-assign-btn">
        ⚡ Auto-Assign All
      </button>

      <h4>Idle NPCs</h4>
      <div className="npc-list">
        {idleNPCs.map(npc => (
          <div
            key={npc.id}
            className={`npc-item ${selectedNPC?.id === npc.id ? 'selected' : ''}`}
            onClick={() => setSelectedNPC(npc)}
          >
            <span className="npc-role">{npc.role}</span>
            <span className="npc-health">❤️ {npc.health}</span>
          </div>
        ))}
      </div>

      <h4>Working NPCs</h4>
      <div className="npc-list">
        {workingNPCs.map(npc => {
          const building = buildings.find(b => b.id === npc.assignedBuilding);
          return (
            <div key={npc.id} className="npc-item working">
              <span className="npc-role">{npc.role}</span>
              <span className="npc-assignment">
                → {building?.type || 'Unknown'}
              </span>
              <button
                onClick={() => handleUnassign(npc.id)}
                className="unassign-btn"
              >
                ✖️
              </button>
            </div>
          );
        })}
      </div>

      {selectedNPC && (
        <div className="assignment-controls">
          <h4>Assign {selectedNPC.role} to:</h4>
          <select
            onChange={(e) => setSelectedBuilding(buildings.find(b => b.id === e.target.value))}
            value={selectedBuilding?.id || ''}
          >
            <option value="">Select building...</option>
            {buildings
              .filter(b => b.state === 'COMPLETE' && (b.properties.npcCapacity || 0) > 0)
              .map(b => {
                const capacity = b.properties.npcCapacity || 0;
                const assigned = workingNPCs.filter(npc => npc.assignedBuilding === b.id).length;
                return (
                  <option key={b.id} value={b.id} disabled={assigned >= capacity}>
                    {b.type} ({assigned}/{capacity})
                  </option>
                );
              })}
          </select>

          <button
            onClick={handleAssign}
            disabled={!selectedBuilding}
            className="assign-btn"
          >
            Assign to {selectedBuilding?.type || '...'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NPCPanel;
```

**Step 4: Wire up GameScreen (30 min)**
```jsx
// src/components/GameScreen.jsx

// Add actions:
const handleAssignNPC = (npcId, buildingId) => {
  actions.assignNPC(npcId, buildingId);
};

const handleUnassignNPC = (npcId) => {
  actions.unassignNPC(npcId);
};

const handleAutoAssign = () => {
  actions.autoAssignNPCs();
};

// Update NPCPanel component:
<NPCPanel
  npcs={gameState.npcs}
  buildings={gameState.buildings}
  onAssignNPC={handleAssignNPC}
  onUnassignNPC={handleUnassignNPC}
  onAutoAssign={handleAutoAssign}
/>
```

**Testing Checklist:**
- [ ] Assign idle NPC to building with capacity - should succeed
- [ ] Attempt to assign NPC to full building - should fail with error message
- [ ] Reassign NPC from one building to another - should unassign from first
- [ ] Unassign NPC - should return to idle list
- [ ] Auto-assign with 3 idle NPCs and 2 understaffed buildings - should fill buildings
- [ ] UI shows correct idle/working counts
- [ ] UI shows assigned building for working NPCs
- [ ] Dropdown shows capacity correctly (2/3, 3/3, etc.)

**Commit Message:**
```
feat(P1A): Implement NPC job assignment system

- Add NPCAssignment class with full assignment logic
- Implement capacity checking and validation
- Add auto-assignment algorithm (priority-based greedy)
- Create NPCPanel UI for manual assignment
- Integrate with NPCManager state tracking
- Add moveToWorking/moveToIdle methods

Features:
- Manual assignment via UI
- Auto-assignment with priority (farms first)
- Capacity enforcement
- Building state validation (only COMPLETE buildings)

Part of Phase 1 core gameplay loop (P1A).
```

---

### P1B: Resource Production & Consumption (3 hours)

**Branch:** `claude/P1B-resource-production-011CUyMZNLn4ivDeVv88unUQ`
**Dependencies:** P0 complete, P1A helpful (to get worker counts)
**Can Run Parallel With:** P1A (if P1A data not yet available, use placeholder worker counts)

**Files Modified:**
- `src/modules/resource-economy/ProductionTick.js`
- `src/modules/resource-economy/ConsumptionSystem.js`
- `src/modules/building-types/BuildingConfig.js`

**Implementation Steps:**

**Step 1: Update ProductionTick.js (90 min)**
```javascript
// src/modules/resource-economy/ProductionTick.js

class ProductionTick {
  constructor(config) {
    this.config = config;
  }

  /**
   * Calculate production for a single building based on NPC staffing
   * @param {Object} building - Building entity
   * @param {Array} assignedNPCs - Array of NPC entities assigned to this building
   * @returns {Object} Resource production amounts
   */
  calculateProduction(building, assignedNPCs) {
    // Base production from building config
    const baseProduction = building.properties.production || {};

    // Calculate staffing multiplier
    const staffingMultiplier = this.calculateStaffingMultiplier(building, assignedNPCs);

    // Calculate skill bonus
    const skillBonus = this.calculateSkillBonus(building, assignedNPCs);

    // Final production = base × staffing × (1 + skillBonus)
    const actualProduction = {};
    for (const [resource, amount] of Object.entries(baseProduction)) {
      actualProduction[resource] = amount * staffingMultiplier * (1 + skillBonus);
    }

    return actualProduction;
  }

  /**
   * Calculate staffing multiplier (0.0 to 1.0)
   * 0 workers = 0% production
   * Full capacity = 100% production
   */
  calculateStaffingMultiplier(building, assignedNPCs) {
    const capacity = building.properties.npcCapacity || 1;
    const actual = assignedNPCs.length;

    // Linear scaling: 0 workers = 0%, 1/2 workers = 50%, 2/2 workers = 100%
    return actual / capacity;
  }

  /**
   * Calculate skill bonus (0.0 to 1.0+)
   * Average skill level of workers provides bonus production
   */
  calculateSkillBonus(building, assignedNPCs) {
    if (assignedNPCs.length === 0) return 0;

    const relevantSkillName = this.getRelevantSkill(building.type);

    const totalSkill = assignedNPCs.reduce((sum, npc) => {
      const skillLevel = npc.skills?.[relevantSkillName] || 0;
      return sum + skillLevel;
    }, 0);

    const averageSkill = totalSkill / assignedNPCs.length;

    // Skill bonus: 0 skill = 0% bonus, 50 skill = 50% bonus, 100 skill = 100% bonus
    return averageSkill / 100;
  }

  /**
   * Map building type to relevant skill
   */
  getRelevantSkill(buildingType) {
    const skillMap = {
      'FARM': 'farming',
      'MINE': 'mining',
      'LUMBER_MILL': 'woodcutting',
      'CRAFTING_STATION': 'crafting',
      'MARKETPLACE': 'trading'
    };

    return skillMap[buildingType] || 'general';
  }

  /**
   * Process production tick for all buildings
   * @param {Array} buildings - All building entities
   * @param {Object} npcAssignments - NPCAssignment instance
   * @param {Object} currentResources - Current resource amounts
   * @returns {Object} Total production this tick
   */
  processTick(buildings, npcAssignments, npcManager) {
    const production = {};

    for (const building of buildings) {
      // Only complete buildings produce
      if (building.state !== 'COMPLETE') continue;

      // Get assigned NPCs
      const workerIds = npcAssignments.getWorkersForBuilding(building.id);
      const workers = workerIds
        .map(id => npcManager.npcs.get(id))
        .filter(npc => npc !== undefined);

      // Calculate production for this building
      const buildingProduction = this.calculateProduction(building, workers);

      // Add to total production
      for (const [resource, amount] of Object.entries(buildingProduction)) {
        production[resource] = (production[resource] || 0) + amount;
      }
    }

    console.log('[ProductionTick] Total production this tick:', production);
    return production;
  }
}

export default ProductionTick;
```

**Step 2: Update ConsumptionSystem.js (60 min)**
```javascript
// src/modules/resource-economy/ConsumptionSystem.js

class ConsumptionSystem {
  constructor(config) {
    this.config = config;
    this.FOOD_PER_NPC = 0.5;  // Each NPC eats 0.5 food per tick
  }

  /**
   * Calculate NPC food consumption
   * @param {Map} npcs - Map of all NPCs
   * @returns {Object} Consumption amounts
   */
  calculateNPCConsumption(npcs) {
    const totalNPCs = npcs.size;

    return {
      food: totalNPCs * this.FOOD_PER_NPC
    };
  }

  /**
   * Calculate building consumption (some buildings consume resources)
   * @param {Array} buildings - All building entities
   * @param {Object} npcAssignments - NPCAssignment instance
   * @param {Object} npcManager - NPCManager instance
   * @returns {Object} Consumption amounts
   */
  calculateBuildingConsumption(buildings, npcAssignments, npcManager) {
    const consumption = {};

    for (const building of buildings) {
      if (building.state !== 'COMPLETE') continue;

      const buildingConsumption = building.properties.consumption || {};

      // Only consume if building is staffed
      const workerIds = npcAssignments.getWorkersForBuilding(building.id);
      if (workerIds.length > 0) {
        for (const [resource, amount] of Object.entries(buildingConsumption)) {
          consumption[resource] = (consumption[resource] || 0) + amount;
        }
      }
    }

    return consumption;
  }

  /**
   * Process consumption tick
   * @param {Map} npcs - All NPCs
   * @param {Array} buildings - All buildings
   * @param {Object} npcAssignments - NPCAssignment instance
   * @param {Object} npcManager - NPCManager instance
   * @param {Object} currentResources - Current resource amounts
   * @returns {{updatedResources: Object, consumption: Object, starvation: boolean}}
   */
  processTick(npcs, buildings, npcAssignments, npcManager, currentResources) {
    const npcConsumption = this.calculateNPCConsumption(npcs);
    const buildingConsumption = this.calculateBuildingConsumption(buildings, npcAssignments, npcManager);

    // Combine consumptions
    const totalConsumption = {};
    for (const [resource, amount] of Object.entries(npcConsumption)) {
      totalConsumption[resource] = amount;
    }
    for (const [resource, amount] of Object.entries(buildingConsumption)) {
      totalConsumption[resource] = (totalConsumption[resource] || 0) + amount;
    }

    // Deduct from resources
    const updatedResources = { ...currentResources };
    for (const [resource, amount] of Object.entries(totalConsumption)) {
      updatedResources[resource] = Math.max(0, (updatedResources[resource] || 0) - amount);
    }

    // Check for starvation
    let starvation = false;
    if (npcConsumption.food > 0 && (currentResources.food || 0) < npcConsumption.food) {
      console.warn('[ConsumptionSystem] ⚠️ STARVATION: Not enough food for NPCs!');
      starvation = true;
      this.handleStarvation(npcs);
    }

    console.log('[ConsumptionSystem] Total consumption this tick:', totalConsumption);

    return {
      updatedResources,
      consumption: totalConsumption,
      starvation
    };
  }

  /**
   * Handle starvation effects
   * Reduces NPC morale and health when food is insufficient
   */
  handleStarvation(npcs) {
    for (const npc of npcs.values()) {
      npc.happiness = Math.max(0, npc.happiness - 10);
      npc.health = Math.max(0, npc.health - 5);

      if (npc.health === 0) {
        console.error(`[ConsumptionSystem] 💀 NPC ${npc.id} died from starvation`);
      }
    }
  }
}

export default ConsumptionSystem;
```

**Step 3: Update Building Configs (30 min)**
```javascript
// src/modules/building-types/BuildingConfig.js

// Add production and consumption data to BUILDING_PROPERTIES

export const BUILDING_PRODUCTION_DATA = {
  FARM: {
    production: { food: 5 },
    consumption: {},
    npcCapacity: 2
  },
  MINE: {
    production: { stone: 3, gold: 1 },
    consumption: { food: 1 },  // Miners need food while working
    npcCapacity: 3
  },
  LUMBER_MILL: {
    production: { wood: 4 },
    consumption: {},
    npcCapacity: 2
  },
  CRAFTING_STATION: {
    production: { tools: 1 },
    consumption: { wood: 2, stone: 1 },  // Consumes materials to craft tools
    npcCapacity: 1
  },
  WALL: {
    production: {},
    consumption: {},
    npcCapacity: 0
  },
  DOOR: {
    production: {},
    consumption: {},
    npcCapacity: 0
  },
  CHEST: {
    production: {},
    consumption: {},
    npcCapacity: 0
  }
};

// Merge this data into BUILDING_PROPERTIES in shared/config.js
```

**Step 4: Integration with GameEngine (30 min)**
```javascript
// In GameEngine or wherever tick processing happens:

tick() {
  // ... existing tick logic

  // Production
  const production = this.productionTick.processTick(
    this.gridManager.buildings,
    this.npcAssignment,  // From P1A
    this.npcManager
  );

  // Consumption
  const consumptionResult = this.consumptionSystem.processTick(
    this.npcManager.npcs,
    this.gridManager.buildings,
    this.npcAssignment,  // From P1A
    this.npcManager,
    this.resources
  );

  // Update resources
  for (const [resource, amount] of Object.entries(production)) {
    this.resources[resource] = (this.resources[resource] || 0) + amount;
  }

  this.resources = consumptionResult.updatedResources;

  // ... rest of tick logic
}
```

**Testing Checklist:**
- [ ] Building with 0 workers produces 0 resources
- [ ] Building with 1/2 workers produces 50% of base production
- [ ] Building with 2/2 workers produces 100% of base production
- [ ] NPC with skill 50 in farming increases farm production by 50%
- [ ] NPC with skill 100 in farming doubles farm production
- [ ] NPCs consume 0.5 food per tick each
- [ ] Starvation (food < 0) reduces NPC happiness by 10
- [ ] Starvation reduces NPC health by 5
- [ ] Building consumption (MINE consumes food, CRAFTING_STATION consumes wood/stone)

**Commit Message:**
```
feat(P1B): Implement resource production and consumption

Production System:
- NPC-based production multipliers (staffing ratio)
- Skill-based production bonuses (0-100% bonus)
- Support for per-building production configs

Consumption System:
- NPC food consumption (0.5 per NPC per tick)
- Building resource consumption (mines, crafting stations)
- Starvation mechanics (reduces happiness and health)

Configuration:
- Add production/consumption data to building configs
- Support for multi-resource production and consumption

Integration:
- Integrate with P1A NPCAssignment for worker counts
- Update GameEngine tick processing

Part of Phase 1 core gameplay loop (P1B).
```

---

### P1C: Building Health & Repair (2 hours)

**Branch:** `claude/P1C-building-health-repair-011CUyMZNLn4ivDeVv88unUQ`
**Dependencies:** P0 complete
**Can Run Parallel With:** P1D

[Continuing with P1C implementation details...]

---

## BEST PRACTICES & STANDARDS

### Code Organization

**1. File Structure**
```
src/
├── modules/              # Game systems (business logic)
│   ├── foundation/       # Grid, spatial, placement
│   ├── building-types/   # Building configs and progression
│   ├── resource-economy/ # Production, consumption
│   ├── npc-system/       # NPC lifecycle, assignment
│   └── territory-town/   # Territory, town management
├── components/           # UI components (React)
├── hooks/                # Custom React hooks
├── context/              # React context providers
├── persistence/          # Save/load logic
├── shared/               # Shared constants and configs
└── utils/                # Utility functions
```

**2. Naming Conventions**
- **Components:** `PascalCase.jsx` (e.g., `GameViewport.jsx`)
- **Modules:** `PascalCase.js` (e.g., `GridManager.js`)
- **Utilities:** `camelCase.js` (e.g., `formatters.js`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `GRID_WIDTH`, `FOOD_PER_NPC`)
- **Functions:** `camelCase` (e.g., `calculateProduction`)
- **Classes:** `PascalCase` (e.g., `NPCAssignment`)

**3. Import Order**
```javascript
// 1. External dependencies
import React, { useState, useEffect } from 'react';

// 2. Internal modules
import GridManager from '../modules/foundation/GridManager';
import NPCAssignment from '../modules/npc-system/NPCAssignment';

// 3. Components
import GameViewport from '../components/GameViewport';
import NPCPanel from '../components/NPCPanel';

// 4. Utilities and configs
import { GRID_WIDTH, FOOD_PER_NPC } from '../shared/config';

// 5. Styles
import './GameScreen.css';
```

---

### Code Quality

**1. Documentation (JSDoc)**
```javascript
/**
 * Assigns an NPC to work at a building
 *
 * @param {string} npcId - The unique ID of the NPC
 * @param {string} buildingId - The unique ID of the building
 * @returns {{success: boolean, error?: string}} Result object
 *
 * @example
 * const result = assignNPCToBuilding('npc-001', 'building-042');
 * if (result.success) {
 *   console.log('Assignment successful');
 * } else {
 *   console.error('Failed:', result.error);
 * }
 */
assignNPCToBuilding(npcId, buildingId) {
  // Implementation...
}
```

**2. Error Handling**
```javascript
// GOOD: Clear error messages with context
if (!npc) {
  console.error(`[NPCAssignment] NPC ${npcId} not found`);
  return { success: false, error: 'NPC_NOT_FOUND' };
}

// BAD: Silent failures
if (!npc) return false;
```

**3. Validation**
```javascript
// Validate inputs early (fail fast)
validateBounds(x, z) {
  if (typeof x !== 'number' || typeof z !== 'number') {
    throw new TypeError('Coordinates must be numbers');
  }

  if (x < 0 || x >= this.gridSize) {
    throw new RangeError(`X coordinate ${x} out of bounds [0, ${this.gridSize})`);
  }

  // ... rest of validation
}
```

**4. Constants Over Magic Numbers**
```javascript
// GOOD
const NPC_FOOD_CONSUMPTION = 0.5;
const STARVATION_HAPPINESS_PENALTY = 10;
const consumption = npcCount * NPC_FOOD_CONSUMPTION;

// BAD
const consumption = npcCount * 0.5;  // What is 0.5?
npc.happiness -= 10;  // Why 10?
```

**5. Console Logging Standards**
```javascript
// Use prefixes for easy filtering
console.log('[GridManager] Placed building at', position);
console.warn('[NPCAssignment] Building at capacity');
console.error('[SaveManager] Failed to save:', error);

// In browser console, can filter by typing: [NPCAssignment]
```

---

### Performance

**1. Memoization**
```javascript
import React, { useMemo } from 'react';

const GameViewport = ({ buildings, npcs }) => {
  const visibleBuildings = useMemo(() => {
    return buildings.filter(b => isInViewport(b));
  }, [buildings]);

  // Use visibleBuildings instead of recalculating every render
};
```

**2. Debouncing State Updates**
```javascript
// Already implemented in useGameManager.js
// Keep debounce between 100-200ms for UI updates
debounceInterval: 150
```

**3. Avoid Re-renders**
```javascript
// Use React.memo for components that don't change often
const NPCPanel = React.memo(({ npcs, buildings }) => {
  // Component code...
});

// Use useCallback for event handlers
const handleAssignNPC = useCallback((npcId, buildingId) => {
  actions.assignNPC(npcId, buildingId);
}, [actions]);
```

---

## TESTING STRATEGY

### Phase 0 Testing (30 minutes)

**1. Grid Size Consistency**
- [ ] Open browser console
- [ ] Place building at (0,0) - should appear at top-left corner
- [ ] Place building at (9,9) - should appear at bottom-right corner
- [ ] Attempt placement at (10,10) - should fail with error message
- [ ] Check console: `GridManager.gridSize` should equal 10

**2. NPC Spawn Positions**
- [ ] Spawn 5 NPCs using spawn button
- [ ] Verify all NPCs appear at different positions (red circles)
- [ ] Check console logs - should show different (x, z) coordinates
- [ ] All NPCs should be within grid bounds (0-9, 0-9)

**3. UI Elements**
- [ ] On game load, "Game Stopped" banner should appear
- [ ] Click Play - banner should disappear
- [ ] Stop game - banner should reappear
- [ ] Save slot selector should show 3 slots (all empty initially)
- [ ] Save to Slot 1 - should show 💾 icon

---

### Phase 1 Integration Test (2 hours)

**Full Gameplay Loop Test:**
```
1. Start new game
2. Place 2 FARM buildings (wait for construction)
3. Spawn 4 NPCs
4. Assign 2 NPCs to each FARM manually
5. Click Play
6. Wait 5 seconds (1 tick)
7. Verify:
   - Food resource increased by ~10 (2 farms × 5 food, with full staffing)
   - Food decreased by 2 (4 NPCs × 0.5 food)
   - Net gain: ~8 food
8. Let game run for 30 seconds
9. Food should be increasing steadily
10. Damage a FARM (if damage trigger implemented)
11. Repair the FARM
12. Save game to Slot 1
13. Load game from Slot 1
14. Verify all state restored (NPCs, buildings, resources)
```

**Edge Case Testing:**
- [ ] Assign NPC to building with no capacity (WALL) - should fail
- [ ] Assign same NPC to 2 buildings - should unassign from first
- [ ] Remove building with assigned NPCs - NPCs should return to idle
- [ ] Run game with 0 food - NPCs should lose happiness and health
- [ ] Let NPC starve to death (health = 0)
- [ ] Repair destroyed building - should fail

---

## PARALLEL EXECUTION SCHEDULE

### Week 1: Phase 0 + Phase 1

**Monday:**
```
08:00-09:30  Phase 0 (Sequential - MUST COMPLETE FIRST)
             - Fix grid size mismatch
             - Fix NPC spawn positions
             - Add game stopped banner
             - Add save slot selector
             - Reduce debounce interval
             - Commit and push

10:00-13:00  Launch P1A + P1B in parallel
             Session #1: P1A (NPC Assignment)
             Session #2: P1B (Resource Production)

14:00-17:00  Continue P1A + P1B
             - Complete implementation
             - Initial testing
             - Commit and push
```

**Tuesday:**
```
08:00-10:00  Complete P1A + P1B
             - Final testing
             - Bug fixes
             - Merge to main

10:00-13:00  Launch P1C + P1D in parallel
             Session #3: P1C (Building Health)
             Session #4: P1D (Visual Improvements)

14:00-17:00  Continue P1C + P1D
             - Complete implementation
             - Initial testing
             - Commit and push
```

**Wednesday:**
```
08:00-10:00  Complete P1C + P1D
             - Final testing
             - Merge to main

10:00-12:00  Phase 1 Integration Testing
             - Full gameplay loop test
             - Edge case testing
             - Performance profiling

13:00-15:00  Bug Fixes
             - Address any integration issues
             - Polish UI/UX

15:00-17:00  Documentation
             - Update WORKFLOW_TRACKING.md
             - Mark Phase 1 complete ✅
```

---

## SUCCESS CRITERIA

### Phase 0 Complete When:
- ✅ All systems use 10×10 grid consistently
- ✅ NPCs spawn at valid random positions
- ✅ UI shows clear "Play" prompt when stopped
- ✅ Save slots working with visual indicators
- ✅ No console errors on fresh start

### Phase 1 Complete When:
- ✅ NPCs can be assigned to buildings manually
- ✅ Auto-assignment fills understaffed buildings
- ✅ Resources produce based on NPC staffing + skills
- ✅ NPCs consume food every tick
- ✅ Starvation reduces happiness and health
- ✅ Buildings can be damaged and repaired
- ✅ Visual feedback for all entity states
- ✅ Full gameplay loop functional end-to-end
- ✅ No critical bugs or console errors

---

## COMMIT MESSAGE TEMPLATES

### Phase 0
```
fix(P0): [Brief description]

- [Change 1]
- [Change 2]
- [Change 3]

Addresses critical architecture issue preventing Phase 1.
```

### Phase 1
```
feat(P1X): [Feature name]

[Detailed description paragraph]

Features:
- [Feature 1]
- [Feature 2]

Implementation:
- [Detail 1]
- [Detail 2]

Testing:
- [Test result 1]
- [Test result 2]

Part of Phase 1 core gameplay loop (P1X).
```

---

## NEXT STEPS

1. ✅ **Review this plan** - Ensure understanding of all workflows
2. ✅ **Create WORKFLOW_TRACKING.md** - Set up tracking document
3. 🟡 **Execute Phase 0** - Fix critical issues (1.5 hours)
4. 🔲 **Begin Phase 1** - Start parallel workflows P1A + P1B
5. 🔲 **Iterate rapidly** - Merge, test, fix, repeat

---

**Ready to begin Phase 0? Let's fix these critical issues! 🚀**
