# Workflow Tracking

**Last Updated:** 2024-11-10 10:00
**Current Phase:** Phase 0 (Critical Fixes)

---

## Legend

- 🟢 **Ready to Start** - Dependencies met, can begin immediately
- 🟡 **In Progress** - Currently being developed
- 🔴 **Blocked** - Waiting on dependency or issue resolution
- ✅ **Complete** - Done, tested, and merged
- ⏸️ **Paused** - Temporarily halted (low priority or resource constraint)

---

## Phase 0: Critical Fixes (Sequential - BLOCKERS)

### P0-CRITICAL: Critical Architecture Fixes
- **Status:** 🟡 In Progress
- **Branch:** `claude/fix-critical-architecture-issues-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Claude Session (Initial)
- **Type:** Sequential (must complete before Phase 1)
- **Dependencies:** None
- **Est. Duration:** 1.5 hours
- **Files to Modify:**
  - `src/modules/foundation/GridManager.js`
  - `src/shared/config.js`
  - `src/components/GameScreen.jsx`
  - `src/modules/npc-system/NPCManager.js`
  - `src/components/GameControlBar.jsx`
  - `src/hooks/useGameManager.js`

**Progress:**
- [ ] Issue #1: Fix grid size mismatch (30 min)
  - [ ] Update GridManager.js gridSize to 10
  - [ ] Update config.js GRID_WIDTH/HEIGHT to 10
  - [ ] Add validation to validateBounds()
  - [ ] Test building placement at edges
- [ ] Issue #2: Fix NPC spawn positions (20 min)
  - [ ] Update GameScreen.jsx spawn handler (random position)
  - [ ] Update NPCManager.js default position (random + validation)
  - [ ] Pass gridManager reference to NPCManager
  - [ ] Test spawning 5+ NPCs
- [ ] Issue #3: Add "Game Stopped" banner (15 min)
  - [ ] Add banner component to GameScreen.jsx
  - [ ] Add pulse animation CSS
  - [ ] Test banner visibility (stopped vs running)
- [ ] Issue #4: Add save slot selector (20 min)
  - [ ] Update GameControlBar.jsx with slot dropdown
  - [ ] Add save slot detection (localStorage)
  - [ ] Add icons for saved vs empty slots
  - [ ] Test save/load across 3 slots
- [ ] Issue #5: Reduce debounce interval (5 min) - OPTIONAL
  - [ ] Update useGameManager.js debounce to 150ms
  - [ ] Update config.js PERFORMANCE settings
  - [ ] Test UI responsiveness

**Blockers:** None

**Completion Criteria:**
- [ ] All systems use 10×10 grid
- [ ] NPCs spawn at different random positions
- [ ] "Game Stopped" banner appears/disappears correctly
- [ ] 3 save slots with visual indicators
- [ ] No console errors
- [ ] Committed and pushed to branch

**Est. Completion:** 2024-11-10 13:00

---

## Phase 1: Core Gameplay Loop (4 Parallel Workflows)

### P1A: NPC Job Assignment System
- **Status:** 🔴 Blocked (waiting on P0)
- **Branch:** `claude/P1A-npc-job-assignment-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Session #1 (TBD)
- **Type:** Parallel
- **Dependencies:** P0 complete ✅
- **Can Run Parallel With:** P1B, P1D
- **Integration Dependency:** P1B needs P1A for worker counts
- **Est. Duration:** 3 hours
- **Files to Modify:**
  - `src/modules/npc-system/NPCAssignment.js` (NEW - 200 lines)
  - `src/modules/npc-system/NPCManager.js` (+50 lines)
  - `src/components/GameScreen.jsx` (+30 lines)
  - `src/components/NPCPanel.jsx` (+120 lines UI)

**Progress:**
- [ ] Step 1: Create NPCAssignment.js class (90 min)
  - [ ] assignNPCToBuilding() method
  - [ ] unassignNPC() method
  - [ ] autoAssign() method
  - [ ] Validation logic (capacity, building state)
  - [ ] Worker tracking (Map<buildingId, Set<npcId>>)
- [ ] Step 2: Integrate with NPCManager (30 min)
  - [ ] moveToWorking() method
  - [ ] moveToIdle() method
  - [ ] moveToResting() method
- [ ] Step 3: Add UI controls (60 min)
  - [ ] NPCPanel component with idle/working lists
  - [ ] Assignment dropdown (building selector)
  - [ ] Auto-assign button
  - [ ] Unassign buttons for working NPCs
- [ ] Step 4: Wire up GameScreen (30 min)
  - [ ] handleAssignNPC action
  - [ ] handleUnassignNPC action
  - [ ] handleAutoAssign action

**Testing Checklist:**
- [ ] Assign idle NPC to building with capacity
- [ ] Attempt assign to full building (should fail)
- [ ] Reassign NPC from one building to another
- [ ] Unassign NPC (should return to idle)
- [ ] Auto-assign fills understaffed buildings
- [ ] UI shows correct idle/working counts

**Blockers:** P0 must be complete

**Est. Start:** 2024-11-10 13:00
**Est. Completion:** 2024-11-10 16:00

---

### P1B: Resource Production & Consumption
- **Status:** 🔴 Blocked (waiting on P0)
- **Branch:** `claude/P1B-resource-production-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Session #2 (TBD)
- **Type:** Parallel
- **Dependencies:** P0 complete ✅, P1A helpful (can use placeholders if not ready)
- **Can Run Parallel With:** P1A, P1D
- **Est. Duration:** 3 hours
- **Files to Modify:**
  - `src/modules/resource-economy/ProductionTick.js`
  - `src/modules/resource-economy/ConsumptionSystem.js`
  - `src/modules/building-types/BuildingConfig.js`

**Progress:**
- [ ] Step 1: Update ProductionTick.js (90 min)
  - [ ] calculateProduction() method
  - [ ] calculateStaffingMultiplier() method
  - [ ] calculateSkillBonus() method
  - [ ] getRelevantSkill() mapping
  - [ ] processTick() integration
- [ ] Step 2: Update ConsumptionSystem.js (60 min)
  - [ ] calculateNPCConsumption() method
  - [ ] calculateBuildingConsumption() method
  - [ ] processTick() integration
  - [ ] handleStarvation() method
- [ ] Step 3: Update Building Configs (30 min)
  - [ ] Add BUILDING_PRODUCTION_DATA
  - [ ] Add production/consumption to each building type
  - [ ] Merge into shared/config.js
- [ ] Step 4: Integration with GameEngine (30 min)
  - [ ] Update tick() method
  - [ ] Call production/consumption systems
  - [ ] Update resources based on production/consumption

**Testing Checklist:**
- [ ] Building with 0 workers produces 0 resources
- [ ] Building with 1/2 workers produces 50% resources
- [ ] Building with 2/2 workers produces 100% resources
- [ ] NPC skill levels increase production correctly
- [ ] NPCs consume 0.5 food per tick
- [ ] Starvation reduces happiness and health

**Blockers:** P0 must be complete

**Est. Start:** 2024-11-10 13:00
**Est. Completion:** 2024-11-10 16:00

---

### P1C: Building Health & Repair
- **Status:** 🔴 Blocked (waiting on P0)
- **Branch:** `claude/P1C-building-health-repair-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Session #3 (TBD)
- **Type:** Parallel
- **Dependencies:** P0 complete ✅, P1A helpful but not required
- **Can Run Parallel With:** P1D
- **Est. Duration:** 2 hours
- **Files to Modify:**
  - `src/modules/foundation/GridManager.js`
  - `src/modules/building-types/BuildingConfig.js`
  - `src/components/BuildingInfoPanel.jsx` (NEW)

**Progress:**
- [ ] Step 1: Add health system to buildings (60 min)
  - [ ] Add health/maxHealth to building entities
  - [ ] damageBuilding() method
  - [ ] repairBuilding() method
  - [ ] State transitions (COMPLETE → DAMAGED → DESTROYED)
- [ ] Step 2: Add repair costs to config (20 min)
  - [ ] REPAIR_COSTS configuration
  - [ ] REPAIR_AMOUNT constant
  - [ ] Integrate into BuildingConfig.js
- [ ] Step 3: Create BuildingInfoPanel UI (40 min)
  - [ ] Health bar display
  - [ ] Repair button with cost display
  - [ ] State indicators (damaged, destroyed)
  - [ ] Resource validation for repairs

**Testing Checklist:**
- [ ] Building takes damage, health decreases
- [ ] Building at <50% HP shows as DAMAGED
- [ ] Building at 0 HP shows as DESTROYED
- [ ] Repair increases health correctly
- [ ] Repair deducts correct resources
- [ ] Can't repair without resources
- [ ] UI shows health bar correctly

**Blockers:** P0 must be complete

**Est. Start:** 2024-11-10 16:00
**Est. Completion:** 2024-11-10 18:00

---

### P1D: Visual Improvements
- **Status:** 🔴 Blocked (waiting on P0)
- **Branch:** `claude/P1D-visual-improvements-011CUyMZNLn4ivDeVv88unUQ`
- **Owner:** Session #4 (TBD)
- **Type:** Parallel
- **Dependencies:** P0 complete ✅
- **Can Run Parallel With:** P1A, P1B, P1C
- **Est. Duration:** 2 hours
- **Files to Modify:**
  - `src/components/GameViewport.jsx`
  - `src/styles/GameViewport.css` (NEW)

**Progress:**
- [ ] Step 1: Enhance NPC rendering (60 min)
  - [ ] Color-coded NPC status (working=green, idle=yellow, low health=red)
  - [ ] Role indicators (first letter of role)
  - [ ] Health bars for damaged NPCs
- [ ] Step 2: Enhance building rendering (60 min)
  - [ ] State-based colors (blueprint, building, damaged, destroyed)
  - [ ] Build progress bars
  - [ ] Health bars for damaged buildings
  - [ ] Worker count indicators
  - [ ] Helper methods (hexToRGBA, darkenColor)

**Testing Checklist:**
- [ ] NPCs show green when working, yellow when idle
- [ ] NPCs show first letter of role
- [ ] NPCs show health bar when damaged
- [ ] Buildings show as outlined when blueprint
- [ ] Buildings fade in as build progress increases
- [ ] Buildings darken when damaged
- [ ] Buildings show black when destroyed
- [ ] Buildings show worker count indicator

**Blockers:** P0 must be complete

**Est. Start:** 2024-11-10 16:00
**Est. Completion:** 2024-11-10 18:00

---

## Phase 1 Integration & Testing

### Integration Testing
- **Status:** 🔴 Blocked (waiting on P1A-P1D)
- **Type:** Sequential (after all P1 workflows complete)
- **Est. Duration:** 2 hours

**Test Plan:**
1. Full gameplay loop test (place buildings, spawn NPCs, assign, produce, consume)
2. Edge case testing (starvation, capacity limits, state transitions)
3. Performance profiling (React DevTools, 60 FPS target)
4. Cross-workflow integration (assignments + production + visuals)

**Completion Criteria:**
- [ ] Full gameplay loop works end-to-end
- [ ] No critical bugs or console errors
- [ ] Performance acceptable (no lag)
- [ ] All P1 workflows merged to main

---

## Phase 2: Economy & Progression (4 Parallel Workflows)

### P2A: Tier Progression System
- **Status:** 🔴 Blocked (waiting on Phase 1)
- **Branch:** TBD
- **Dependencies:** Phase 1 complete ✅
- **Can Run Parallel With:** P2D
- **Est. Duration:** 3 hours

### P2B: Advanced Building Types
- **Status:** 🔴 Blocked (waiting on Phase 1)
- **Branch:** TBD
- **Dependencies:** Phase 1 complete ✅
- **Can Run Parallel With:** P2C, P2D
- **Est. Duration:** 3 hours

### P2C: Territory Expansion
- **Status:** 🔴 Blocked (waiting on Phase 1)
- **Branch:** TBD
- **Dependencies:** Phase 1 complete ✅
- **Can Run Parallel With:** P2B, P2D
- **Est. Duration:** 4 hours

### P2D: Save/Load Improvements
- **Status:** 🔴 Blocked (waiting on Phase 1)
- **Branch:** TBD
- **Dependencies:** Phase 1 complete ✅
- **Can Run Parallel With:** P2A, P2B, P2C
- **Est. Duration:** 2 hours

---

## Workflow Dependency Matrix

```
         P0   P1A  P1B  P1C  P1D  P2A  P2B  P2C  P2D
P0        -    ✓    ✓    ✓    ✓    ✓    ✓    ✓    ✓
P1A       -    -    ~    -    -    ✓    -    -    -
P1B       -    ~    -    -    -    ✓    ✓    -    -
P1C       -    -    -    -    -    -    ✓    -    -
P1D       -    -    -    -    -    -    -    -    -
P2A       -    -    -    -    -    -    ✓    ✓    -
P2B       -    -    -    -    -    -    -    -    -
P2C       -    -    -    -    -    -    -    -    -
P2D       -    -    -    -    -    -    -    -    -
```

**Legend:**
- ✓ = Hard dependency (row requires column)
- ~ = Soft dependency (helpful but not required, can use placeholders)
- - = No dependency

---

## Parallel Execution Capacity

**Maximum Parallel Workflows:**
- **Phase 0:** 1 workflow (sequential only)
- **Phase 1:** 4 workflows simultaneously (P1A, P1B, P1C, P1D)
  - **Wave 1:** P1A + P1B (2 parallel)
  - **Wave 2:** P1C + P1D (2 parallel)
- **Phase 2:** 4 workflows simultaneously (P2A, P2B, P2C, P2D)

**Recommended Execution Schedule:**

**Week 1:**
```
Monday:
  08:00-09:30  P0 (Sequential)
  10:00-13:00  P1A + P1B (Parallel Wave 1)
  14:00-17:00  P1A + P1B continue

Tuesday:
  08:00-10:00  Complete P1A + P1B
  10:00-13:00  P1C + P1D (Parallel Wave 2)
  14:00-17:00  P1C + P1D continue

Wednesday:
  08:00-10:00  Complete P1C + P1D
  10:00-12:00  Integration Testing
  13:00-15:00  Bug Fixes
  15:00-17:00  Documentation, Phase 1 ✅
```

---

## Current Status Summary

**Phase 0:** 🟡 In Progress (0/5 issues complete)
- Grid size mismatch: ⬜ Not started
- NPC spawn positions: ⬜ Not started
- Game stopped banner: ⬜ Not started
- Save slot selector: ⬜ Not started
- Debounce interval: ⬜ Not started

**Phase 1:** 🔴 Blocked (waiting on P0)
- P1A: NPC Assignment ⬜ Not started
- P1B: Resource Production ⬜ Not started
- P1C: Building Health ⬜ Not started
- P1D: Visual Improvements ⬜ Not started

**Phase 2:** 🔴 Blocked (waiting on Phase 1)

---

## Notes

**Last Session:** Created WORKFLOW_TRACKING.md and CRITICAL_FIXES_AND_WORKFLOWS.md
**Next Action:** Begin Phase 0 critical fixes
**Blockers:** None
**Concerns:** None yet

---

**Track updates here as workflows progress. Update status, completion dates, and blockers regularly.**
