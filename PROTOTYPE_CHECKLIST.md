# Week 1 Prototype Validation Checklist

## Overview

This checklist defines the specific tasks for Week 1 of the Voxel RPG Game prototype. The goal is to validate the core systems before full implementation begins.

**Week 1 Phases:**
1. **Phase 1**: Pre-coding documents (this checklist + ECONOMY_BALANCE.md + DECISIONS.md + FORMULAS.md + MIGRATION.md) ✅ COMPLETE
2. **Phase 2**: NPC Pathfinding Prototype
3. **Phase 3**: Economy Simulator
4. **Phase 4**: Aura Radius Testing

---

## Phase 2: NPC Pathfinding Prototype

**Goal**: Validate that 50 NPCs can move smoothly without FPS drops. Target: 60 FPS with 50 NPCs, 30 FPS with 100 NPCs.

**Deliverable**: A standalone prototype with grid-based movement system.

### Implementation Tasks

- [ ] **Create NPC Movement System**
  - [ ] Grid-based pathfinding (O(n) complexity, not A*)
  - [ ] 0.1 second movement ticks
  - [ ] NPCs move 1 cell per tick
  - [ ] Simple collision avoidance (stop if blocked)

- [ ] **Create Test Environment**
  - [ ] 25×25×25 voxel grid
  - [ ] 5 buildings placed at corners
  - [ ] Spawn 50 NPCs at random positions
  - [ ] NPCs wander between buildings (via pathfinding)

- [ ] **Performance Measurement**
  - [ ] Record FPS every frame
  - [ ] Measure average FPS over 60 seconds
  - [ ] Measure pathfinding time per tick
  - [ ] Measure memory usage

- [ ] **Stuck Detection & Recovery**
  - [ ] Detect NPC stuck > 3 seconds
  - [ ] Teleport to building (emergency recovery)
  - [ ] Log stuck events for analysis

- [ ] **Test Cases**
  - [ ] [ ] Spawn 50 NPCs: FPS should stay ≥ 50 (target: 60)
  - [ ] [ ] Spawn 100 NPCs: FPS should stay ≥ 25 (target: 30)
  - [ ] [ ] No pathfinding should take > 50ms
  - [ ] [ ] Stuck detection works (NPC recovers after 3s)
  - [ ] [ ] NPCs don't collide (visual clipping OK for proto)
  - [ ] [ ] Memory usage < 500MB with 100 NPCs

### Success Criteria

**Must Pass** (prototype cannot proceed without):
- [ ] 50 NPCs run at 60 FPS average
- [ ] Pathfinding time < 50ms per tick
- [ ] No stack overflow or crashes with 100 NPCs

**Should Pass** (preferred but not blocking):
- [ ] 100 NPCs run at 30 FPS average
- [ ] Stuck recovery works smoothly
- [ ] NPCs have simple animation/visual feedback

### Files to Create

```
src/prototypes/
├── npc-pathfinding/
│   ├── NPCMovementSystem.js          // Grid movement + pathfinding
│   ├── NPCPathfinder.js               // Pathfinding algorithm
│   ├── PathfinderPerformanceTest.js  // FPS/timing measurements
│   ├── test-env-setup.js              // Create 25×25×25 grid + 5 buildings
│   └── NPC_PATHFINDING_RESULTS.md    // Results and analysis
```

### Acceptance

**Phase 2 is complete when:**
- [ ] 50 NPCs pathfinding test passes
- [ ] FPS measurements recorded
- [ ] Results documented in NPC_PATHFINDING_RESULTS.md
- [ ] Code reviewed for production readiness

---

## Phase 3: Economy Simulator

**Goal**: Validate the production and consumption formulas work correctly. Simulate 1 in-game hour of SURVIVAL tier and verify:
1. Production rate matches ECONOMY_BALANCE.md
2. Economy doesn't crash (runaway or collapse)
3. Morale calculation works correctly

**Deliverable**: A standalone economy simulator with hardcoded buildings and resources.

### Implementation Tasks

- [ ] **Create Production System**
  - [ ] 5-second production tick
  - [ ] Base production rates (CAMPFIRE, FARM, WORKSHOP)
  - [ ] Multiplier stacking (with 2.0x cap)
  - [ ] Resource accumulation
  - [ ] Storage overflow detection

- [ ] **Create Consumption System**
  - [ ] NPC food consumption (0.5 food/min working)
  - [ ] Starvation death simulation
  - [ ] Hunger tracking

- [ ] **Create Test Economy**
  - [ ] CAMPFIRE (5 wood/tick)
  - [ ] 2 FAR Ms (1 food/tick each)
  - [ ] 1 WORKSHOP (1 item/tick)
  - [ ] 3 NPCs
  - [ ] Starting resources: 620 gold

- [ ] **Simulation Loop**
  - [ ] Run 1 in-game hour (720 production ticks × 5s = 3600s real time)
  - [ ] Every 10 ticks (50 seconds), log state
  - [ ] Record: resources, NPC morale, storage usage, production rate

- [ ] **Test Cases**
  - [ ] [ ] CAMPFIRE produces 5 wood/tick (validate base rate)
  - [ ] [ ] 2 FAR Ms with 3 NPCs produce ~1.44 food/min (with assignment bonus)
  - [ ] [ ] NPC consumption = 1.5 food/min (3 NPCs × 0.5 each)
  - [ ] [ ] Net food = positive (not starving)
  - [ ] [ ] Morale stays stable (50-60 range)
  - [ ] [ ] Storage doesn't overflow (cap at 2000)
  - [ ] [ ] No crashes or infinite loops

- [ ] **Validation Against ECONOMY_BALANCE.md**
  - [ ] [ ] Wood production in SURVIVAL phase matches spreadsheet
  - [ ] [ ] Food production matches FARM rate expectations
  - [ ] [ ] NPC consumption matches 0.5 food/min formula
  - [ ] [ ] Net resources after 1 hour match projections (±10% tolerance)

### Success Criteria

**Must Pass**:
- [ ] Simulator runs for full 1 in-game hour without crash
- [ ] Production/consumption match FORMULAS.md calculations
- [ ] Morale calculation produces valid output
- [ ] Final resource count matches projections (±10%)

**Should Pass**:
- [ ] Visual graphs show resource trends
- [ ] NPC happiness tracked and logged
- [ ] Storage warnings trigger correctly

### Files to Create

```
src/prototypes/
├── economy-simulator/
│   ├── EconomySimulator.js           // Main simulation loop
│   ├── ProductionSystem.js           // 5s tick production
│   ├── ConsumptionSystem.js          // NPC consumption
│   ├── MoraleCalculator.js           // Morale tracking
│   ├── test-economy-setup.js         // 5 buildings + 3 NPCs
│   ├── simulate-1-hour.js            // Run full hour simulation
│   └── ECONOMY_SIMULATOR_RESULTS.md  // Results and graphs
```

### Acceptance

**Phase 3 is complete when:**
- [ ] Simulator completes 1 in-game hour
- [ ] All production/consumption values logged
- [ ] Results within 10% of ECONOMY_BALANCE.md projections
- [ ] Detailed results documented with graphs
- [ ] Code reviewed for production readiness

---

## Phase 4: Aura Radius Testing

**Goal**: Validate that the 50-cell aura radius bonus is balanced (not overpowered).

**Deliverable**: Manual test results documenting aura effects at various distances.

### Manual Testing Tasks

- [ ] **Setup Test Scenario**
  - [ ] Create 25×25×25 voxel grid
  - [ ] Place 1 Town Center at (12, 5, 12) - territory center
  - [ ] Place 10 FAR Ms in a ring at 10-50 cells distance
  - [ ] Record starting position and distance of each farm

- [ ] **Test 1: Aura Coverage**
  - [ ] Activate Town Center aura (50-cell radius, +5% production)
  - [ ] Measure distance to each farm: `distance = sqrt((x-cx)² + (y-cy)² + (z-cz)²)`
  - [ ] Mark which farms are within 50 cells (get +5% bonus)
  - [ ] Mark which farms are outside (no bonus)
  - [ ] Expected: ~7-8 farms get bonus, ~2-3 don't

- [ ] **Test 2: Production Comparison**
  - [ ] Without aura: All 10 FAR Ms produce 1.0 food/tick each = 10 food/tick
  - [ ] With aura: 8 FAR Ms × 1.05 bonus = 8.4 food/tick, 2 FAR Ms × 1.0 = 2.0 food/tick = 10.4 total
  - [ ] Aura benefit: +4% overall production (minimal, not OP)
  - [ ] Expected: Aura is nice bonus, not game-breaking

- [ ] **Test 3: Multiplier Stacking with Aura**
  - [ ] Place farm at 25 cells (within aura)
  - [ ] Apply all 5 multipliers:
    - [ ] NPC skill (trained) = 1.25x
    - [ ] Zone bonus (agricultural) = 1.15x
    - [ ] Aura (Town Center) = 1.05x
    - [ ] Technology (basic) = 1.1x
    - [ ] Morale (good) = 1.05x
  - [ ] Calculate: 1.25 × 1.15 × 1.05 × 1.1 × 1.05 = 1.60x
  - [ ] But hard cap at 2.0x: result = 1.60x (under cap, OK)
  - [ ] Expected: Aura stacking is balanced, 1.5-2.0x range

- [ ] **Test 4: Distance Edge Cases**
  - [ ] Place farm exactly at 50 cells: Should get aura
  - [ ] Place farm at 50.1 cells: Should NOT get aura
  - [ ] Validate distance calculation correctness

### Test Results to Record

```
Test 1: Aura Coverage
├─ Farm A: distance=10.0 → within aura ✓
├─ Farm B: distance=25.5 → within aura ✓
├─ Farm C: distance=50.0 → within aura ✓ (edge case)
├─ Farm D: distance=50.1 → outside aura ✗
├─ Farm E: distance=35.2 → within aura ✓
├─ Farm F: distance=60.0 → outside aura ✗
├─ Farm G: distance=48.5 → within aura ✓
├─ Farm H: distance=52.3 → outside aura ✗
├─ Farm I: distance=40.0 → within aura ✓
└─ Farm J: distance=45.0 → within aura ✓

Summary: 7/10 farms within aura (70%)
Aura benefit: +3.5% overall production
Verdict: BALANCED ✓

Test 2: Production Comparison
├─ Base production: 10.0 food/tick
├─ With aura: 10.35 food/tick
└─ Aura benefit: +3.5% (small, not OP)

Test 3: Multiplier Stacking
├─ NPC skill: 1.25x
├─ Zone bonus: 1.15x
├─ Aura: 1.05x
├─ Technology: 1.1x
├─ Morale: 1.05x
├─ Raw product: 1.25 × 1.15 × 1.05 × 1.1 × 1.05 = 1.60x
├─ Hard cap: 2.0x
└─ Final multiplier: 1.60x (under cap, OK)

Test 4: Distance Edge Cases
├─ 50.0 cells: within aura ✓
├─ 50.1 cells: outside aura ✓
└─ Distance calculation: CORRECT ✓
```

### Success Criteria

**Must Pass**:
- [ ] Aura radius is 50 cells (distance formula correct)
- [ ] Aura provides +5% production bonus (not more)
- [ ] Aura doesn't break hard multiplier cap (1.60x < 2.0x)
- [ ] Edge cases handled correctly (50.0 inside, 50.1 outside)

**Should Pass**:
- [ ] Aura benefit is meaningful but small (+3-5%)
- [ ] Aura incentivizes building Town Centers but isn't required
- [ ] Multiple auras capped correctly (only strongest applies)

### Acceptance

**Phase 4 is complete when:**
- [ ] All 4 test cases documented with results
- [ ] Verdict: Aura radius is balanced or needs adjustment
- [ ] If adjustment needed: Document recommendation in AURA_TESTING_RESULTS.md
- [ ] Code readiness: Aura distance calculation tested and verified

### Files to Create

```
src/prototypes/
├── aura-testing/
│   ├── AURA_TESTING_RESULTS.md  // Test results + verdict
│   └── test-data.json            // Positions and distances
```

---

## Week 1 Summary

### Deliverables

1. ✅ **ECONOMY_BALANCE.md** - Tier progression timelines and balance validation
2. ✅ **DECISIONS.md** - 10 major architectural decisions documented
3. ✅ **FORMULAS.md** - All calculation formulas in pseudocode
4. ✅ **MIGRATION.md** - Save/load versioning and migration strategy
5. ✅ **PROTOTYPE_CHECKLIST.md** - This document
6. ⏳ **Phase 2 Results**: NPC_PATHFINDING_RESULTS.md
7. ⏳ **Phase 3 Results**: ECONOMY_SIMULATOR_RESULTS.md
8. ⏳ **Phase 4 Results**: AURA_TESTING_RESULTS.md

### Phase Dependencies

```
Phase 1 (Pre-coding documents) COMPLETE
    ↓
Phase 2 (NPC Pathfinding) → NPC_PATHFINDING_RESULTS.md
    ↓
Phase 3 (Economy Simulator) → ECONOMY_SIMULATOR_RESULTS.md (uses NPC data from Phase 2)
    ↓
Phase 4 (Aura Testing) → AURA_TESTING_RESULTS.md (manual, can run in parallel)
```

### Go/No-Go Decision

**All phases must pass before proceeding to full implementation.**

**Go Criteria:**
- [ ] Phase 2: 50 NPCs at 60 FPS
- [ ] Phase 3: Economy stable, no crashes
- [ ] Phase 4: Aura balanced, not OP

**No-Go Triggers:**
- [ ] Phase 2: FPS drops below 40 with 50 NPCs → reconsider pathfinding algorithm
- [ ] Phase 3: Economy crashes or starves out → adjust consumption/production rates
- [ ] Phase 4: Aura overpowered (> 10% benefit) → reduce aura radius or bonus

### Post-Week-1 Roadmap

If all Week 1 phases pass:

**Week 2-3: Core Module Implementation**
- Foundation module (building placement) - already done
- Module 2 (building types and properties)
- Module 3 (resource economy and tier progression)
- Module 4 (territory and town management)

**Week 4: Integration & Polish**
- ModuleOrchestrator validation
- Cross-module testing
- Performance optimization
- Save/load testing

**Week 5+: Extended Systems**
- NPC skill progression
- Technology tree
- Building effects and auras
- Victory conditions and progression tracking
- UI/UX polish

---

## Notes for Week 1 Execution

### File Organization

Keep prototypes isolated from main game code:

```
src/
├── prototypes/          # Week 1 prototypes (can be deleted after validation)
│   ├── npc-pathfinding/
│   ├── economy-simulator/
│   └── aura-testing/
├── modules/             # Production game code (to be implemented)
├── shared/              # Already complete
├── stores/              # Already complete
└── components/          # UI (to be implemented)
```

### Running Each Phase

```bash
# Phase 2: NPC Pathfinding
npm test -- src/prototypes/npc-pathfinding/PathfinderPerformanceTest.js

# Phase 3: Economy Simulator
npm run src/prototypes/economy-simulator/simulate-1-hour.js

# Phase 4: Aura Testing
# Manual test - document results in AURA_TESTING_RESULTS.md
```

### Performance Monitoring

Use browser DevTools for profiling:
- Chrome DevTools → Performance tab
- Record 60 seconds of gameplay
- Check:
  - FPS graph (target: 60)
  - CPU time per frame (target: < 16ms)
  - Memory usage (target: < 500MB)
  - Garbage collection frequency (target: < 1 per second)

### Documentation

After each phase, create a results document:

```markdown
# [Phase Name] Results

## Summary
- Status: PASS/FAIL/NEEDS_ADJUSTMENT
- Key metrics: [values]

## Test Results
- Test 1: PASS/FAIL
- Test 2: PASS/FAIL

## Issues Found
- Issue 1: [description + impact]

## Recommendations
- Recommendation 1: [specific change if needed]
```

### Rollback Strategy

If a phase fails:
1. Document the failure and root cause
2. Identify adjustment needed
3. Update DECISIONS.md or FORMULAS.md if needed
4. Re-run phase to validate fix
5. Do NOT proceed until phase passes

---

## Execution Start

**Phase 1 Status**: ✅ COMPLETE
- ECONOMY_BALANCE.md: ✅
- DECISIONS.md: ✅
- FORMULAS.md: ✅
- MIGRATION.md: ✅
- PROTOTYPE_CHECKLIST.md: ✅

**Next**: Begin Phase 2 (NPC Pathfinding Prototype)

**Estimated Time**:
- Phase 2: 4-6 hours (NPC system + testing)
- Phase 3: 3-4 hours (simulator + validation)
- Phase 4: 1-2 hours (manual testing + documentation)
- **Total Week 1**: ~10-12 hours

**Start Date**: [Today]
**Target Completion**: [7 days from start]
