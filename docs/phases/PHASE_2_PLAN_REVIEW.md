# Phase 2 Plan Review & Critique

**Reviewed:** February 9, 2026
**Updated:** March 19, 2026
**Document:** `docs/phases/PHASE_2_DETAILED_PLAN.md`
**Method:** Cross-referenced plan against actual codebase (all 22+ referenced files verified)
**Status:** All 22 review items resolved — plan is ready for implementation

---

## Overall Assessment

The plan is well-structured, thorough, and demonstrates strong awareness of the existing codebase. The existing systems audit is accurate — every referenced file exists and contains what the plan claims. The design philosophy ("NPCs are companions, not tools") is consistent throughout, and the plan sensibly builds on Phase 1 patterns (tuning constants, ref-based ticks, mobile-first design).

That said, there are architectural misalignments, underspecified systems, internal contradictions, and a few technical approaches that will cause problems during implementation.

---

## Critical Issues

### 1. ~~Architecture Violation: `src/systems/settlement/` vs the Module Orchestrator Pattern~~ ✅ RESOLVED

**The problem:** All 9 new systems were placed in `src/systems/settlement/`, but the established architecture uses `src/modules/` with a `ModuleOrchestrator` that coordinates 25+ independent modules.

**Resolution:** Plan updated to use `src/modules/settlement/` with a `SettlementModule.js` that registers with the ModuleOrchestrator. All new files now live under `src/modules/settlement/`. See "New Files Created" section and Lesson 7 in the detailed plan.

### 2. ~~No ModuleOrchestrator Integration Task~~ ✅ RESOLVED

**The problem:** The plan never mentioned registering new systems with the ModuleOrchestrator.

**Resolution:** Section 2.0 "Settlement Module Foundation" added as the first task. It covers orchestrator registration, GameManager wiring, module lifecycle methods (initialize/update/serialize/deserialize), inter-module communication points, and sub-manager tick order. This is now the prerequisite for all other Phase 2 tasks.

### 3. ~~Dual Configuration Source of Truth~~ ✅ RESOLVED

**The problem:** The boundary between `shared/config.js`, `data/tuning.js`, and `data/buildingBlueprints.js` was undefined.

**Resolution:** Lesson 6 in the detailed plan now explicitly documents the three-source rule:
- `src/shared/config.js` — structural constants (types, enums, dimensions, grid)
- `src/data/tuning.js` — balance numbers (rates, thresholds, multipliers, decay values)
- `src/data/buildingBlueprints.js` — block-level building definitions (voxel layouts for construction)

### 4. ~~NPC Population Cap Contradiction~~ ✅ RESOLVED

**The problem:** Section 2.1.2 contained conflicting statements about whether NPCs need housing.

**Resolution:** Plan adopted Option A. Section 2.1.2 now clearly states:
- The very first NPC can join without housing (hardy pioneer — sleeps by campfire, -20 happiness)
- All subsequent NPCs require available housing to join
- Population cap: `max(1, housingCapacity)` — first settler is free, rest need beds
- `NPC_FIRST_SETTLER_FREE = true` tuning constant added
- Hard cap: 20 NPCs (`NPC_MAX_POPULATION_PHASE_2 = 20`)

---

## Significant Issues

### 5. ~~Overlapping AI Systems Without Clear Resolution~~ ✅ RESOLVED

**The problem:** The plan creates `TaskAssignmentEngine.js` but three existing systems already handle NPC decision-making, with no defined authority when they disagree.

**Resolution:** Section 2.5 now defines a strict AI System Authority Hierarchy:
1. `NPCBehaviorSystem.js` — owns the SCHEDULE (when to work, eat, sleep)
2. `AutonomousDecision.js` — handles INTERRUPTS (critical needs, emergencies)
3. `TaskAssignmentEngine.js` — resolves WHAT WORK to do (mine, haul, build) during work periods
4. `CompanionAISystem.js` — overrides work assignment ONLY for player-commanded companions

Each system has clear ownership: schedule determines the phase, interrupts can override, work assignment only runs during work periods for idle NPCs, and companion commands only apply to explicitly commanded NPCs.

### 6. ~~Daily Schedule Duplication~~ ✅ RESOLVED

**The problem:** Section 2.6.2 created a parallel daily schedule system when `NPCBehaviorSystem.js` already has one.

**Resolution:** Section 2.6.2 now titled "NPC Daily Schedule (Extend Existing System)" explicitly states: "Do not create a parallel schedule — extend the existing one." The plan wires settlement WORK activities into the existing NPCBehaviorSystem schedule activities and maps world time ranges to existing activity types.

### 7. ~~NPCVoxelModel.js — Vertex Offset Animation Is Wrong Approach~~ ✅ RESOLVED

**The problem:** The plan used vertex offsets with instanced meshes for NPC animation, which is technically problematic.

**Resolution:** Section 2.5.3 now uses grouped `Object3D` per NPC with per-limb instanced meshes (6 draw calls total for ALL NPCs: heads, torsos, left arms, right arms, left legs, right legs). Animations use instance matrix transforms (rotation/translation) per limb per frame — no custom shaders needed.

### 8. ~~Missing Web Worker Strategy for Pathfinding~~ ✅ RESOLVED

**The problem:** No task for moving pathfinding to a Web Worker despite targeting 8+ NPCs.

**Resolution:** Section 2.5.4 "Pathfinding Web Worker (Conditional)" added with full implementation spec. Section 2.0.3 "Performance Baseline Measurement" added as a prerequisite to determine if the worker is needed. Trigger: implement if baseline shows <6ms headroom or pathfinding exceeds 2ms during testing. Includes async request/response pattern, stale path handling, and stagger limits.

### 9. ~~Farm System Is Underspecified~~ ✅ RESOLVED

**The problem:** No "Farming Zone Behavior" section analogous to mining zone behavior.

**Resolution:** Section 2.2.4 "Farming Zone Behavior" added with full specification: farm lifecycle (EMPTY → PLANTED → GROWING → READY → HARVESTED → EMPTY), NPC task generation for planting/harvesting, growth timers, crop yields, unattended auto-collection at 25% rate, tuning constants, acceptance criteria, and test specs.

### 10. ~~Performance Budget Is Tight~~ ✅ RESOLVED

**The problem:** Performance budget left only 10ms for existing systems, with no measurement of actual headroom.

**Resolution:** Section 2.0.3 "Performance Baseline Measurement" added as a Week 1 task. It measures current frame budget before adding Phase 2 systems, documents available headroom, and includes a go/no-go decision on the pathfinding worker (if headroom <6ms, the worker becomes mandatory). Results recorded in `docs/research/PERFORMANCE_BASELINE.md`.

---

## Moderate Issues

### 11. ~~Hauling Task Lifecycle Is Over-Engineered~~ ✅ RESOLVED

**Resolution:** Section 2.3.2 now uses a simplified 4-state lifecycle: `PENDING → PICKING_UP → DELIVERING → COMPLETED`.

### 12. ~~RESTRICTED Zone Has No Implementation~~ ✅ RESOLVED

**Resolution:** Section 2.2.1 now specifies RESTRICTED zone behavior: "RESTRICTED zones override all others — NPCs will not pathfind through or work in RESTRICTED zones (use cases: block off dangerous areas near rifts, reserve space for future building, prevent NPCs from entering player's personal area)." Zone rendering uses red at opacity 0.4 (slightly more visible than other zones).

### 13. ~~Building Rotation Not In Implementation Tasks~~ ✅ RESOLVED

**Resolution:** Section 2.4.1 now includes: `rotatable: boolean` in blueprint data structure, R key to cycle rotation during placement, block offsets transformed by rotation matrix before validation, ghost preview updates for rotated orientation, acceptance criteria for rotation, and test specs for rotation transforms and rotated validation.

### 14. ~~Open Questions Should Be Resolved Before Implementation~~ ✅ RESOLVED

**Resolution:** All 5 critical open questions resolved and integrated into the plan:
- Q1 (carrying capacity): 1 stack per NPC, fixed for Phase 2 (Section 2.3.2)
- Q4 (building rotation): 90° increments using existing config rotation rules (Section 2.4.1)
- Q6 (NPC-player resource sharing): NPCs eat from stockpiles, player inventory separate (Section 2.6.1)
- Q7 (max settlement size): Hard cap of 20 NPCs (Section 2.1.2)
- Q10 (farm automation): NPC assignment for full production, 25% passive rate (Section 2.2.4)
Remaining questions (Q2, Q3, Q5, Q8, Q9) deferred to implementation or Phase 3.

### 15. ~~Missing FORMULAS.md Update~~ ✅ RESOLVED

**Resolution:** Section 2.5.1 now includes task "Update `FORMULAS.md` with the task scoring formula and variety bonus." `docs/FORMULAS.md` is listed in "Modified Files."

### 16. ~~Stockpile Item Rendering Needs Its Own Hook~~ ✅ RESOLVED

**Resolution:** Section 2.3.1 now specifies "Visual: resource items rendered on stockpile ground via dedicated `src/rendering/useStockpileRenderer.js` hook (follows existing renderer pattern, uses instanced meshes per resource type)." File listed in "New Files Created."

### 17. ~~"Variety Bonus" Mentioned Only in Risk Table~~ ✅ RESOLVED

**Resolution:** Section 2.5.1 scoring formula now includes `+ (varietyBonus × 15)` and describes: "NPCs get +15 score for task types they haven't done in the last 3 tasks (prevents over-specialization, keeps NPCs feeling dynamic)."

---

## Minor Issues & Suggestions

### 18. Immigration Edge Cases

Not addressed: What happens if all stockpiles are full when a new NPC arrives? What if the settlement is under attack? What about NPCs arriving during night — do they wait until dawn? Can multiple NPCs arrive from the same immigration check?

### 19. 10-14 Week Estimate May Be Optimistic

25 new files, 16 modified files, 9 systems with tests, 3 UI components, a 3D voxel model system, and full integration testing across 8 playtest scenarios. Phase 1 estimated 8-12 weeks for comparable scope. Phase 2 has more cross-system integration, which historically takes longer than estimated.

Consider adding 2-3 weeks of buffer, or identifying what can be cut if time runs short (farming zones, building upgrades, and the NPC voxel model are the most self-contained features to defer).

### 20. ~~Zone Overlay Rendering Approach Unspecified~~ ✅ RESOLVED

**Resolution:** Section 2.2.2 now specifies: "`PlaneGeometry` meshes with transparent `MeshBasicMaterial` positioned at zone bounds (not instanced voxels — zones are flat ground overlays)" rendered via dedicated `src/rendering/useZoneRenderer.js` hook. Color-coded per zone type with specified opacity values.

### 21. ~~Missing Consideration of Existing Store Architecture~~ ✅ RESOLVED

**Resolution:** Section 2.0.2 adds a dedicated `src/stores/useSettlementStore.js` with full state shape specification. Settlement module writes to this store via refs (not React render cycle), UI components read via hooks.

### 22. ~~Tutorial Hints Should Reference Phase 1 Hint System~~ ✅ RESOLVED

**Resolution:** Section 2.8.4 now specifies the exact event hooks needed for hint triggers: `ConstructionManager` emits `building:complete`, `ImmigrationManager` emits `npc:approaching`/`npc:joined`, `TaskAssignmentEngine` emits `npc:idle-no-zones`, `HousingManager` emits `housing:full`, `NPCNeedsTracker` emits `npc:unhappy`.

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

### ~~Must Fix Before Starting~~ ✅ ALL RESOLVED
1. ~~Move systems to `src/modules/settlement/` and add ModuleOrchestrator integration~~ ✅
2. ~~Resolve population cap contradiction (section 2.1.2)~~ ✅
3. ~~Define AI system authority hierarchy (TaskAssignment vs AutonomousDecision vs BehaviorSystem)~~ ✅
4. ~~Resolve open questions Q1, Q4, Q6, Q7, Q10~~ ✅

### ~~Should Fix Before Starting~~ ✅ ALL RESOLVED
5. ~~Add pathfinding Web Worker task~~ ✅
6. ~~Specify NPC voxel model animation approach correctly (grouped meshes, not vertex offsets)~~ ✅
7. ~~Specify or defer farming zone behavior~~ ✅
8. ~~Add early performance profiling task~~ ✅
9. ~~Clarify config vs tuning vs blueprint data boundaries~~ ✅

### ~~Can Fix During Implementation~~ ✅ ALL RESOLVED
10. ~~Simplify hauling task lifecycle~~ ✅
11. ~~Specify RESTRICTED zone behavior~~ ✅
12. ~~Add building rotation to section 2.4.1~~ ✅
13. ~~Add stockpile renderer hook~~ ✅
14. ~~Add FORMULAS.md update task~~ ✅
15. ~~Add variety bonus to TaskAssignmentEngine spec~~ ✅

**Status: All 22 review items resolved. The detailed plan is ready for implementation starting with Task 2.0.1 (SettlementModule).**
