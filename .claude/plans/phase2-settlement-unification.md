# Phase 2 Completion Plan: Unify + Complete Settlement System

## Context

Phase 2 (Colony Alpha) has two parallel settlement implementations that don't communicate:

- **System A** (`src/modules/settlement/`): Clean module architecture with 109 tests, but not connected to the live 3D game
- **System B** (`src/components/3d/SettlementTick.jsx` + friends): Live 3D game with working immigration, voxel NPCs, zones, needs — but monolithic and untested

**Goal**: Unify them — the module system becomes the logic engine, 3D components become thin rendering layers — then complete the missing Phase 2 features (hauling, construction, task assignment, housing, UI).

**End result**: A single 3D game. The modules are headless logic with no visual output. Players see no difference — internals become cleaner, testable, and extensible.

## Key Architecture Decisions

1. **`useGameStore` is the shared store** — 3D components already read from it; `useSettlementStore` stays UI-only (dashboard state, selections)
2. **ChunkAdapter interface** — Modules can't import chunkManager directly. A thin adapter (`getBlock()`, `getTerrainY()`, `iterateChunks()`) is injected at runtime by the bridge
3. **Keep System B's NPC entity shape** — The flat object `{ id, fullName, position: [x,y,z], state, hunger, rest, ... }` is what `SettlerNPC.jsx` renders. Modules produce this shape.
4. **Chunk-scanning attractiveness wins** — `src/systems/settlement/AttractivenessCalculator.js` scans actual voxels, which is better than System A's building-object queries
5. **SettlementModule ref stored on useGameStore** — Since `Experience.jsx` doesn't use `GameManager`, the module ref is stored as `useGameStore._settlementModule` for 3D components to access

## Bridge Pattern

```
SettlementTick.jsx (useFrame, ~60 lines)
  → bridge.getGameState()       // reads useGameStore snapshot
  → settlementModule.update(delta)  // all logic runs here
  → bridge.syncToStore(results)  // writes back to useGameStore

SettlerNPC.jsx ← reads useGameStore.settlement.npcs (rendering only)
ZoneOverlay.jsx ← reads useGameStore.zones (rendering only)
ZoneInteraction.jsx → calls settlementModule.zoneManager methods
```

---

## Implementation Batches

### Batch 1: Create the Bridge (Unify Core Loop)

Extract all logic from `SettlementTick.jsx` (484 lines) into testable modules, replace with ~60-line bridge.

| Action | File | Details |
|--------|------|---------|
| NEW | `src/modules/settlement/SettlementBridge.js` | Reads `useGameStore`, feeds to module, writes results back. Has `setChunkAdapter(chunkManager)`, `getGameState()`, `syncToStore(results)` |
| NEW | `src/modules/settlement/NPCStateMachine.js` | Extract lines 207-468 from SettlementTick.jsx: `tickNPC(npc, delta, context) → { updates, remove?, notifications? }`. Pure function, unit-testable. All states: APPROACHING/EVALUATING/IDLE/WANDERING/EATING/SLEEPING/SOCIALIZING/LEAVING |
| NEW | `src/modules/settlement/CampfireDetector.js` | Extract lines 109-133: `scanForCampfire(chunkAdapter) → [x,y,z] | null` |
| NEW | `src/modules/settlement/ChunkAttractivenessAdapter.js` | Wraps `src/systems/settlement/AttractivenessCalculator.js` (chunk scanner) to fit module interface |
| MODIFY | `src/modules/settlement/SettlementModule.js` | Add NPCStateMachine tick step, accept chunkAdapter dependency, add campfire detection step |
| REWRITE | `src/components/3d/SettlementTick.jsx` | 484 → ~60 lines. Gets module from store, creates bridge, calls `module.update()` in useFrame |
| MODIFY | `src/stores/useGameStore.js` | Add `_settlementModule` field + setter (2 lines) |
| MODIFY | `src/GameManager.js` | Store settlementModule ref on useGameStore after construction (1 line) |
| NEW | `__tests__/NPCStateMachine.test.js` | State transitions, need-based interrupts, departure logic |
| NEW | `__tests__/CampfireDetector.test.js` | Mock chunk data |
| NEW | `__tests__/SettlementBridge.test.js` | Read/write roundtrip |

**Prerequisite** *(added recommendation)*: Before extracting, write characterization tests against current `SettlementTick.jsx` behavior to guard against regressions. At minimum, one integration test covering: place campfire → attractiveness calculated → NPC arrives → evaluates → joins → gets hungry → eats.

**Verification**: Game plays identically — same campfire detection, immigration, NPC behaviors.

---

### Batch 2: Unify Zone System

Route zone creation/deletion through `SettlementModule.zoneManager` instead of direct store mutation.

| Action | File | Details |
|--------|------|---------|
| MODIFY | `src/data/zoneTypes.js` | Add FARMING, BUILDING, RESTRICTED colors + full ZoneType enum |
| MODIFY | `src/components/3d/ZoneInteraction.jsx` | Call `module.zoneManager.createZone()` instead of `store.addZone()`. Get module from `useGameStore._settlementModule` |
| MODIFY | `src/modules/settlement/ZoneManager.js` | Accept 2D bounds format (`{minX,minZ,maxX,maxZ}`), normalize to 3D |
| MODIFY | `src/modules/settlement/MiningZoneBehavior.js` | Accept chunkAdapter, use `scanMiningZone()` from `src/systems/settlement/MiningZoneScanner.js` |
| MODIFY | `src/modules/settlement/SettlementBridge.js` | Add zone sync (module zones → useGameStore.zones with format conversion) |

**Verification**: Zone drag-placement still works, ZoneOverlay renders all 5 types, mining scan works.

---

### Batch 3: Unify Immigration

Immigration logic fully in module, producing store-compatible NPC entities.

| Action | File | Details |
|--------|------|---------|
| MODIFY | `src/modules/settlement/SettlementModule.js` | Swap AttractivenessCalculator for ChunkAttractivenessAdapter |
| MODIFY | `src/modules/settlement/ImmigrationManager.js` | Use `generateNPCIdentity()` from `src/data/npcIdentity.js` (System B's generator). Produce flat NPC shape. Read population count from gameState snapshot. Use chunkAdapter for terrain Y |
| MODIFY | `src/modules/settlement/SettlementBridge.js` | Handle NPC additions from immigration results via `addSettlementNPC()` |

**Verification**: NPCs spawn with correct 3D appearance, walk in, evaluate, join. Population cap works.

---

### Batch 4: Clean SettlerNPC.jsx (Rendering Only)

Move remaining logic out of the 3D renderer.

| Action | File | Details |
|--------|------|---------|
| MODIFY | `src/components/3d/SettlerNPC.jsx` | Remove state transitions (APPROACHING→EVALUATING, WANDERING→IDLE on arrival). Remove `store.removeSettlementNPC()` call. Keep: movement, animation, terrain-following, position writes |
| MODIFY | `src/modules/settlement/NPCStateMachine.js` | Add arrival detection (check distance to targetPosition), handle LEAVING NPC removal |

**Verification**: NPCs still walk, animate, follow terrain. State transitions happen correctly.

---

### Batch 5: Hauling System (NEW)

| Action | File | Details |
|--------|------|---------|
| NEW | `src/modules/settlement/HaulingManager.js` | 4-state lifecycle: PENDING → PICKING_UP → DELIVERING → COMPLETED. Auto-generated from `mining:block-mined` events. Priority: construction > food > valuable > general. 5-min timeout |
| MODIFY | `src/modules/settlement/NPCStateMachine.js` | Add HAULING_PICKUP, HAULING_DELIVER states |
| MODIFY | `src/modules/settlement/SettlementModule.js` | Wire haulingManager, listen for mining events |
| MODIFY | `src/components/3d/SettlerNPC.jsx` | Add hauling status color + carried item visual |
| NEW | `__tests__/HaulingManager.test.js` | Lifecycle, priority, timeout |

**Verification**: Mined blocks generate haul tasks. NPCs pick up and deliver items. Timeouts work.

---

### Batch 6: Construction System (NEW)

| Action | File | Details |
|--------|------|---------|
| NEW | `src/data/buildingBlueprints.js` | 8 building types: Shelter, House, Storage Shed, Workbench, Campfire, Farm Plot, Well, Watchtower. Block layouts, resource costs, bed slots |
| NEW | `src/modules/settlement/BlueprintManager.js` | `placeBlueprint()`, `cancelBlueprint()`, validation (flat terrain, no overlap, territory, spacing), rotation (R key, 90deg) |
| NEW | `src/modules/settlement/ConstructionManager.js` | Site lifecycle: PLACED → AWAITING_MATERIALS → IN_PROGRESS → COMPLETE. Generates hauling tasks for materials. Builder NPCs place blocks at `BUILD_TIME_PER_BLOCK=3s`. Max 3 builders. On complete: place blocks via chunkAdapter, emit event |
| MODIFY | `src/modules/settlement/NPCStateMachine.js` | Add BUILDING state |
| MODIFY | `src/modules/settlement/SettlementModule.js` | Wire both managers |
| NEW | `__tests__/BlueprintManager.test.js` | Validation, placement, rotation |
| NEW | `__tests__/ConstructionManager.test.js` | Lifecycle, material requirements, multi-builder |

**Verification**: Place blueprint, materials hauled, NPCs build, blocks appear on completion.

---

### Batch 7: Task Assignment Engine (NEW)

| Action | File | Details |
|--------|------|---------|
| NEW | `src/modules/settlement/TaskAssignmentEngine.js` | Scores: `(priority×100) + (skillMatch×50) - (distance×1) - (personalityMismatch×20) + (varietyBonus×15)`. Queries mining, farming, hauling, construction for available tasks. Assigns idle NPCs greedily |
| MODIFY | `src/modules/settlement/SettlementModule.js` | Wire as last step in tick order |
| NEW | `__tests__/TaskAssignmentEngine.test.js` | Scoring, assignment, idle NPC selection |

**NPC State Machine note** *(added recommendation)*: By this batch, the state machine has 12+ states (APPROACHING, EVALUATING, IDLE, WANDERING, EATING, SLEEPING, SOCIALIZING, LEAVING, HAULING_PICKUP, HAULING_DELIVER, BUILDING, plus future mining/farming). Evaluate whether to refactor `NPCStateMachine.js` to a table-driven or hierarchical approach (e.g., "WORKING" parent state with task-specific sub-states) to keep it maintainable.

**Verification**: Idle NPCs receive tasks. Priority ordering works. Skill matching influences assignment.

---

### Batch 8: Housing + UI Panels (NEW)

| Action | File | Details |
|--------|------|---------|
| NEW | `src/modules/settlement/HousingManager.js` | Track bed slots from completed buildings (Shelter:1, House:2, Manor:4). Auto-assign on arrival. Homeless penalty: -20 happiness |
| NEW | `src/components/ui/SettlementDashboard.jsx` | Tabs: Population, Resources, Buildings, Alerts. Opens via N hotkey. Reads `useGameStore.settlement` + `useSettlementStore` |
| NEW | `src/components/ui/NPCDetailPanel.jsx` | Needs bars, skills, current task, personality, housing. Actions: Follow, Prioritize |
| NEW | `src/components/ui/BuildingPanel.jsx` | Building info, occupants, construction progress, upgrade/demolish |
| MODIFY | `src/components/ContextualHints.jsx` | 7 settlement tutorial hints |
| MODIFY | `src/data/tuning.js` | Add: BUILD_TIME_PER_BLOCK=3, BUILDER_SKILL_BASE=0.5, MAX_BUILDERS_PER_SITE=3, housing constants. Fix: IMMIGRATION_CHECK_INTERVAL→300, IMMIGRATION_MAX_CHANCE→0.8, APPROACH_SPEED→0.6 |
| NEW | `__tests__/HousingManager.test.js` | Bed tracking, assignment, happiness penalty |

**Verification**: Housing affects happiness. Dashboard shows accurate settlement state. Tutorial hints appear.

---

## Save Format Migration *(added recommendation)*

After Batch 2, zones move from store to module. After Batch 8, housing data is new. Players with existing saves will hit issues.

| When | Action |
|------|--------|
| Batch 1 | Bump save version in `SaveVersionManager.js` |
| Batch 2 | Add migration: extract zone data from old store format into module-serializable format |
| Batch 8 | Add migration: initialize housing data with defaults for existing settlements |

Each migration should be additive — old saves load with sensible defaults, no data loss.

---

## Key Risks

1. **Timing mismatch**: Module ticks at game rate, useFrame at 60fps. Bridge throttles `module.update()` to match tick rate. Movement interpolation stays in `SettlerNPC.jsx` at render frequency.
2. **Existing 109 tests**: ChunkAdapter is optional — if not provided, chunk-dependent features return defaults. All existing tests pass unchanged.
3. **Store write frequency**: SettlerNPC writes position per frame. Use mutable position buffer (`useGameStore._npcPositions`) to avoid Zustand re-renders. Batch-sync to state once per tick.

---

## Verification

After each batch:

```bash
npm test -- --watchAll=false
# All existing tests pass
npm start
# Game launches, settlement features work
```

After all batches:
- Run all 8 playtest scenarios from Phase 2 plan (Section 2.8.1)
- Verify 60fps with 8 NPCs, 4 stockpiles, 3 construction sites
- Verify save/load preserves all settlement state (including migration from old saves)

---

## Critical Files Reference

| File | Role |
|------|------|
| `src/components/3d/SettlementTick.jsx` | Rewrite: 484→60 lines, becomes thin bridge |
| `src/components/3d/SettlerNPC.jsx` | Clean: remove logic, keep rendering |
| `src/components/3d/ZoneInteraction.jsx` | Modify: call module instead of store |
| `src/modules/settlement/SettlementModule.js` | Extend: wire all new sub-managers |
| `src/stores/useGameStore.js` | Add _settlementModule ref |
| `src/systems/settlement/AttractivenessCalculator.js` | Reuse: chunk-scanning version becomes canonical |
| `src/data/npcIdentity.js` | Reuse: System B's NPC generator |
| `src/data/zoneTypes.js` | Extend: add 3 missing zone types |
| `src/data/tuning.js` | Extend + fix: add construction/housing constants, fix immigration values |

---

## Summary

| Batch | Focus | New Files | Modified Files |
|-------|-------|-----------|----------------|
| 1 | Bridge (core unification) | 6 | 4 |
| 2 | Zone unification | 0 | 5 |
| 3 | Immigration unification | 0 | 3 |
| 4 | SettlerNPC cleanup | 0 | 2 |
| 5 | Hauling (new) | 2 | 3 |
| 6 | Construction (new) | 5 | 2 |
| 7 | Task assignment (new) | 2 | 1 |
| 8 | Housing + UI (new) | 5 | 2 |
| **Total** | | **20** | **22** |
