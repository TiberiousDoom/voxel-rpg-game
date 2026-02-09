# Phase 2 Plan Review & Critique

**Reviewed:** February 9, 2026
**Document:** `docs/phases/PHASE_2_DETAILED_PLAN.md`
**Method:** Cross-referenced plan against actual codebase (all 22+ referenced files verified)

---

## Overall Assessment

The plan is well-structured, thorough, and demonstrates strong awareness of the existing codebase. The existing systems audit is accurate — every referenced file exists and contains what the plan claims. The design philosophy ("NPCs are companions, not tools") is consistent throughout, and the plan sensibly builds on Phase 1 patterns (tuning constants, ref-based ticks, mobile-first design).

That said, there are architectural misalignments, underspecified systems, internal contradictions, and a few technical approaches that will cause problems during implementation.

---

## Critical Issues

### 1. Architecture Violation: `src/systems/settlement/` vs the Module Orchestrator Pattern

**The problem:** All 9 new systems are placed in `src/systems/settlement/`, but the established architecture uses `src/modules/` with a `ModuleOrchestrator` that coordinates 25+ independent modules. The CLAUDE.md explicitly documents this:

```
React UI (GameContext) → useGameManager hook → GameManager → ModuleOrchestrator → Modules
```

The existing `src/systems/` directory contains standalone utilities (BossAI, SpatialGrid, SpawnManager) — not orchestrated game systems. Placing settlement systems there means they won't participate in the ModuleOrchestrator lifecycle, won't receive coordinated tick updates, and won't communicate through the established module messaging pattern.

**Recommendation:** Create `src/modules/settlement/` instead, with a `SettlementModule.js` that registers with the ModuleOrchestrator. Individual managers (ZoneManager, StockpileManager, etc.) can be sub-components of this module. Add a task to CLAUDE.md's "Adding New Modules" section for wiring this up.

### 2. No ModuleOrchestrator Integration Task

**The problem:** The plan never mentions registering new systems with the ModuleOrchestrator. There's no task for:
- Adding the settlement module to the orchestrator's constructor
- Wiring up in GameManager initialization
- Defining the module's tick behavior and message handlers
- Establishing inter-module communication (e.g., settlement ↔ resource-economy, settlement ↔ npc-system)

This is a documented requirement in CLAUDE.md under "Adding New Modules." Without it, the 9 new systems float in isolation from the game's core coordination layer.

**Recommendation:** Add a "2.0 Settlement Module Foundation" task at the start of the plan that creates the module shell, registers it, and defines the integration points before any subsystem work begins.

### 3. Dual Configuration Source of Truth

**The problem:** The plan puts all constants in `src/data/tuning.js`, but CLAUDE.md states `src/shared/config.js` is the "single source of truth for game constants" — building types, tiers, grid configuration, and territory settings are all there. Phase 1 introduced `tuning.js` for balance constants specifically, but the boundary between "configuration" and "tuning" is fuzzy.

Building blueprints (section 2.4.1) define building dimensions, costs, and types — these overlap directly with what's already in `shared/config.js` (BUILDING_TYPES, BUILDING_DIMENSIONS, BUILDING_TIERS). The plan also creates `src/data/buildingBlueprints.js` — a third location for building-related constants.

**Recommendation:** Define a clear rule:
- `shared/config.js` — structural constants (types, dimensions, grid)
- `data/tuning.js` — balance numbers (rates, thresholds, multipliers)
- `data/buildingBlueprints.js` — block-level building definitions (voxel layouts)

Document this boundary explicitly in the plan.

### 4. NPC Population Cap Contradiction

**The problem:** Section 2.1.2 contains conflicting statements:
- `NPC_BASE_POPULATION_CAP = 3` (without housing) — implies 3 NPCs can exist without housing
- `max(3, housingCapacity)` — same implication
- "If settlement has no available housing: NPC waits 1 in-game day, then leaves" — implies NPCs *need* housing
- "Population capped by housing capacity" — implies housing is the limit

Can the first 3 NPCs exist without housing or not? If yes, where do they sleep? If no, the `NPC_BASE_POPULATION_CAP = 3` constant is misleading.

**Recommendation:** Pick one:
- **Option A:** First NPC arrives without housing (sleeps by campfire, happiness penalty). Subsequent NPCs require housing. Cap = `max(1, housingCapacity)`.
- **Option B:** No NPCs without housing. Campfire + shelter is the minimum trigger. Cap = `housingCapacity` strictly.

Option A feels better for the "first NPC arrival" tutorial moment — the first settler is hardy enough to rough it, motivating the player to build shelter.

---

## Significant Issues

### 5. Overlapping AI Systems Without Clear Resolution

**The problem:** The plan creates `TaskAssignmentEngine.js` but three existing systems already handle NPC decision-making:
- `AutonomousDecision.js` — priority-based action selection with EMERGENCY/CRITICAL/HIGH/MEDIUM/LOW priorities
- `NPCBehaviorSystem.js` — behavior trees, daily schedules (SLEEP, WAKE_UP, EAT_BREAKFAST, WORK, BREAK, etc.), personality-driven behavior, long-term memory
- `CompanionAISystem.js` — follow/gather/patrol/defend commands

The plan says to "integrate with TaskAssignmentEngine" in the modified files list but never specifies *how*. Which system is authoritative when they disagree? If `NPCBehaviorSystem` says it's WORK time but `TaskAssignmentEngine` scores a REST task highest, who wins?

**Recommendation:** Define a clear authority hierarchy:
1. `NPCBehaviorSystem` owns the *schedule* (when to work, eat, sleep)
2. `AutonomousDecision` handles *interrupts* (critical needs, emergencies)
3. `TaskAssignmentEngine` resolves *what work to do* during work periods
4. `CompanionAISystem` applies only to player-commanded companions, not settlers

Add an integration diagram showing how these systems hand off control.

### 6. Daily Schedule Duplication

**The problem:** Section 2.6.2 creates a daily schedule system, but `NPCBehaviorSystem.js` already has one with activity types: SLEEP, WAKE_UP, EAT_BREAKFAST, WORK, BREAK, EAT_LUNCH, SOCIALIZE, EAT_DINNER, LEISURE, RETURN_HOME, SHELTER, FESTIVAL. The existing system even has personality-driven schedule modifications.

The plan's schedule (Dawn/Morning/Midday/Afternoon/Evening/Night) overlaps almost entirely with the existing one. Building a second schedule system will cause conflicts.

**Recommendation:** Extend `NPCBehaviorSystem.js`'s existing schedule rather than creating a parallel one. The plan's section 2.6.2 should become "Wire settlement work into existing NPCBehaviorSystem daily schedule" — adding work types as schedule-eligible activities rather than reimplementing scheduling.

### 7. NPCVoxelModel.js — Vertex Offset Animation Is Wrong Approach

**The problem:** The plan says NPC animations use "simple animations via vertex offset" with instanced mesh rendering. This is technically problematic:
- Instanced meshes share geometry — you can't offset individual vertices per instance without custom shader work
- Custom vertex shaders in React Three Fiber require `onBeforeCompile` hacks or raw `ShaderMaterial`, both of which are fragile
- The ~40-voxel humanoid (head, body, arms, legs) needs *limb-level* animation, not vertex-level

**Recommendation:** Use grouped `Object3D` nodes per NPC with separate instanced meshes per limb type:
- One `InstancedMesh` for all NPC heads (same geometry, different colors via instance attribute)
- One for all torsos, one for all left arms, etc.
- Animate by transforming the instance matrices (rotation/translation per limb per frame)
- This gives you limb animation with instancing benefits and no custom shaders

Alternatively, accept simpler animation: just bob the whole NPC mesh up/down while moving, with a tool item appearing/disappearing for work states. This is much cheaper and still readable.

### 8. Missing Web Worker Strategy for Pathfinding

**The problem:** The 3D implementation plan (section on Performance Strategy) emphasizes Web Workers for pathfinding. Phase 2 targets 8+ NPCs each doing A* pathfinding, but the plan only mentions "stagger pathfinding across frames" in the risk table. There's no task for:
- Moving PathfindingService to a Web Worker
- Async pathfinding request/response pattern
- Handling stale paths when world changes during computation

The existing `PathfindingService.js` runs on the main thread. With 8 NPCs pathfinding simultaneously, A* on a 3D grid will easily blow the 2ms budget.

**Recommendation:** Add a task in section 2.5 or an early foundation task to create a pathfinding worker. The existing `src/systems/workers/` directory already has worker infrastructure. This is critical for the 16ms frame budget.

### 9. Farm System Is Underspecified

**The problem:** FARMING is listed as a zone type, Farm Plot is a building, and open question 10 partially addresses farm behavior, but there's no "Farming Zone Behavior" section analogous to "Mining Zone Behavior" (2.2.3). What does a farming NPC actually do? What's the tick-by-tick behavior? How does planting/harvesting work? What crops exist?

The open question answer ("Require NPC assignment for full production, produce at 25% rate unattended") isn't reflected in any implementation task.

**Recommendation:** Either:
- Add a "2.2.4 Farming Zone Behavior" section with the same level of detail as mining
- Or explicitly scope farming out of Phase 2 and remove FARMING from the zone types list, deferring to Phase 3

Half-specifying a system is worse than not including it — it'll get implemented inconsistently.

### 10. Performance Budget Is Tight

**The problem:** The individual system budgets sum to ~6ms:
| System | Budget |
|--------|--------|
| Pathfinding (8 NPCs) | 2.0ms |
| Task assignment | 1.0ms |
| Stockpile rendering (4) | 0.5ms |
| NPC voxel rendering (8) | 1.0ms |
| Zone overlays (10) | 0.5ms |
| Need simulation (8 NPCs) | 0.5ms |
| Construction (3 sites) | 0.5ms |
| **Subtotal** | **6.0ms** |

This leaves 10ms for terrain rendering, React reconciliation, Three.js scene graph traversal, physics, existing module ticks, garbage collection, and browser overhead. Phase 0/1 systems already consume frame time. On mid-range hardware, this will be tight.

**Recommendation:** Add a performance profiling task early (week 2-3) that measures the current frame budget *before* adding Phase 2 systems. Establish the actual headroom available. If it's less than 8ms, the pathfinding worker becomes non-negotiable rather than nice-to-have.

---

## Moderate Issues

### 11. Hauling Task Lifecycle Is Over-Engineered

The 7-state lifecycle (`PENDING → CLAIMED → TRAVELING_TO_PICKUP → PICKING_UP → TRAVELING_TO_DELIVERY → DELIVERING → COMPLETED`) adds complexity without corresponding gameplay benefit. `TRAVELING_TO_PICKUP` and `PICKING_UP` could be a single `PICKING_UP` state (NPC walks there, picks up, done). Same for delivery.

**Recommendation:** Start with 4 states: `PENDING → ACTIVE → DELIVERING → COMPLETED`. Add granularity later if needed for debugging or UI display.

### 12. RESTRICTED Zone Has No Implementation

Listed as a zone type but there are no behavior rules, no NPC avoidance logic, no placement rationale, and no test cases. What is it for? When would a player use it?

**Recommendation:** Either specify it (likely: NPCs won't pathfind through or work in RESTRICTED zones, used to block off dangerous areas or reserve space for future building) or remove it from the initial zone type list.

### 13. Building Rotation Not In Implementation Tasks

Open question 4 says "Should blueprints be rotatable? Yes, 90° increments. Add to 2.4.1." But section 2.4.1 has no rotation task, no rotation in the blueprint data structure, no rotation in the validation rules, and no rotation in the acceptance criteria. The existing `shared/config.js` already defines rotation rules (0/90/180/270 degrees).

**Recommendation:** Add rotation to the blueprint data structure and placement UI in section 2.4.1. The existing config already supports it — just wire it up.

### 14. Open Questions Should Be Resolved Before Implementation

10 open questions are listed but several directly affect implementation design:
- Q1 (carrying capacity) affects hauling task system design
- Q4 (building rotation) affects blueprint system
- Q6 (NPC-player resource sharing) affects stockpile system
- Q7 (max settlement size) affects performance targets and testing
- Q10 (farm automation) affects farming zone implementation

Starting implementation with these unresolved creates rework risk.

**Recommendation:** Resolve Q1, Q4, Q6, Q7, and Q10 before starting. The others (Q2, Q3, Q5, Q8, Q9) can wait.

### 15. Missing FORMULAS.md Update

`NPCAssignment.js` references `FORMULAS.md` for assignment priority formulas. The TaskAssignmentEngine introduces its own scoring formula (`score = (priority × 100) + (skillMatch × 50) - (distance × 1) - (personalityMismatch × 20)`) without referencing or updating FORMULAS.md. This creates a documentation divergence.

**Recommendation:** Add a task to update FORMULAS.md with Phase 2 formulas.

### 16. Stockpile Item Rendering Needs Its Own Hook

The rendering architecture uses specialized hooks (`useVoxelRenderer`, `useTerrainRenderer`, `useNPCRenderer`, etc.). The plan mentions stockpile items as "instanced meshes" but doesn't specify where this rendering code lives. It shouldn't go in StockpileManager (logic/rendering separation). It needs its own `useStockpileRenderer.js` hook or integration into an existing renderer.

**Recommendation:** Add `src/rendering/useStockpileRenderer.js` to the new files list and specify how it integrates with the rendering pipeline.

### 17. "Variety Bonus" Mentioned Only in Risk Table

The risk table identifies "Task assignment creates unfair specialization" and proposes a "variety bonus" for tasks an NPC hasn't done recently. This mitigation is important for the "NPCs feel autonomous" exit criterion but never appears in the TaskAssignmentEngine spec.

**Recommendation:** Add the variety bonus to the scoring formula in section 2.5.1 or explicitly document it as a future tuning knob.

---

## Minor Issues & Suggestions

### 18. Immigration Edge Cases

Not addressed: What happens if all stockpiles are full when a new NPC arrives? What if the settlement is under attack? What about NPCs arriving during night — do they wait until dawn? Can multiple NPCs arrive from the same immigration check?

### 19. 10-14 Week Estimate May Be Optimistic

25 new files, 16 modified files, 9 systems with tests, 3 UI components, a 3D voxel model system, and full integration testing across 8 playtest scenarios. Phase 1 estimated 8-12 weeks for comparable scope. Phase 2 has more cross-system integration, which historically takes longer than estimated.

Consider adding 2-3 weeks of buffer, or identifying what can be cut if time runs short (farming zones, building upgrades, and the NPC voxel model are the most self-contained features to defer).

### 20. Zone Overlay Rendering Approach Unspecified

"Semi-transparent colored overlay on terrain" with "instanced rendering" is vague. Zone overlays are flat quads on the ground surface, not instanced voxels. Consider: simple `PlaneGeometry` meshes with transparent materials positioned at zone bounds, rendered in a dedicated `useZoneRenderer.js` hook.

### 21. Missing Consideration of Existing Store Architecture

The project already has multiple Zustand stores in `src/stores/`. The plan modifies `useGameStore.js` but doesn't specify the state shape changes. With 9 new systems needing state, consider whether a dedicated `useSettlementStore.js` would be cleaner than expanding the existing store.

### 22. Tutorial Hints Should Reference Phase 1 Hint System

Section 2.8.4 says "extend Phase 1 hint system" and `ContextualHints.jsx` exists with priority, cooldown, and show-once logic. Good. But the plan's hint triggers ("After first shelter built", "When NPC is idle and no zones exist") require new event hooks that aren't specified. Add tasks for emitting these events from the relevant systems.

---

## What's Done Well

To be clear about the strengths — there is a lot to like in this plan:

1. **Accurate systems audit** — Every referenced file exists and contains what the plan claims. This shows real diligence.
2. **Tuning constants centralization** — Continuing the Phase 1 pattern of keeping all balance numbers in one file is the right call.
3. **Playtest checkpoints at weeks 4 and 7** — Not waiting until integration phase to discover problems is smart project management.
4. **Concrete acceptance criteria and test specs** — Every section has checkboxes and test case outlines. This makes "done" unambiguous.
5. **Risk table with mitigations** — Realistic about what will go wrong. The "death spiral" risk for immigration is particularly well identified.
6. **Multiplayer compatibility notes** — Forward-thinking without over-engineering. "No networking code yet" is the right call.
7. **Dependency graph with parallelization** — Shows clear understanding of what blocks what and where time can be saved.
8. **Balance targets with a player timeline** — "Day 1-2: campfire + shelter, Day 3-5: 2-3 NPCs" gives implementation a concrete north star.
9. **"NPCs are companions, not tools" philosophy** — This is threaded consistently through every design decision, from autonomous work to need satisfaction to departure warnings.
10. **Mobile-first UI design** — Two-tap zone placement, responsive dashboard, touch targets. Learning from Phase 1's lesson.

---

## Summary of Recommendations

### Must Fix Before Starting
1. Move systems to `src/modules/settlement/` and add ModuleOrchestrator integration
2. Resolve population cap contradiction (section 2.1.2)
3. Define AI system authority hierarchy (TaskAssignment vs AutonomousDecision vs BehaviorSystem)
4. Resolve open questions Q1, Q4, Q6, Q7, Q10

### Should Fix Before Starting
5. Add pathfinding Web Worker task
6. Specify NPC voxel model animation approach correctly (grouped meshes, not vertex offsets)
7. Specify or defer farming zone behavior
8. Add early performance profiling task
9. Clarify config vs tuning vs blueprint data boundaries

### Can Fix During Implementation
10. Simplify hauling task lifecycle
11. Specify RESTRICTED zone behavior
12. Add building rotation to section 2.4.1
13. Add stockpile renderer hook
14. Add FORMULAS.md update task
15. Add variety bonus to TaskAssignmentEngine spec
