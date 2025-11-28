# Prototypes & Performance Testing

This directory contains historical prototype code and performance testing results that were used to validate game systems before implementation into production code.

## 📁 Contents

### 1. Economy Simulator (`economy-simulator/`)
**Date:** November 2025
**Purpose:** Validate production, consumption, and morale systems

**Key Files:**
- `EconomySimulator.js` - Standalone economy simulation
- `ProductionSystem.js` - Production mechanics testing
- `ConsumptionSystem.js` - Consumption mechanics testing
- `MoraleCalculator.js` - Morale system validation
- `ECONOMY_SIMULATOR_REPORT.md` - Test results

**Results:**
- ✅ 60-minute simulation completed successfully
- ✅ Resource balance validated (Food: 1380, Wood: 0, Gold: 620)
- ✅ Morale system working (Production multiplier: 0.9978x)
- ✅ All NPCs survived (3/3 alive)

**Status:** **VALIDATED** - Systems implemented in production code

---

### 2. NPC Pathfinding (`npc-pathfinding/`)
**Date:** November 2025
**Purpose:** Performance test pathfinding algorithms

**Key Files:**
- `NPCPathfinder.js` - Pathfinding implementation
- `NPCMovementSystem.js` - Movement mechanics
- `PathfinderPerformanceTest.js` - Performance benchmarks
- `PATHFINDING_TEST_REPORT.md` - Test results

**Results:**
- ✅ 50 NPCs: 6,262 FPS average (target: 60 FPS) - **104x faster**
- ✅ 100 NPCs: 3,998 FPS average (target: 30 FPS) - **133x faster**
- ✅ Pathfinding time: 0.02ms average
- ✅ Zero stuck recoveries

**Status:** **VALIDATED** - Pathfinding implemented in production (`src/systems/NPCPathfinder.js`)

---

### 3. Aura Testing (`aura-testing/`)
**Date:** November 2025
**Purpose:** Test building aura effects and radius calculations

**Key Files:**
- `AuraRadiusTest.js` - Aura radius testing
- `run-aura-tests.js` - Test runner
- `AURA_TESTING_RESULTS.md` - Test results
- `AURA_PHASE_4_RESULTS.md` - Phase 4 results

**Results:**
- ✅ Aura radius calculations validated
- ✅ Building effect propagation tested
- ✅ Performance benchmarks passed

**Status:** **VALIDATED** - Aura systems implemented in production (`src/modules/building-types/BuildingEffect.js`)

---

### 4. Terrain Height Prototype (`TerrainHeightPrototype.js`)
**Date:** November 2025
**Purpose:** Prototype terrain height generation and visualization

**Status:** **HISTORICAL** - Standalone prototype, not integrated

**Details:**
- 8,381 lines of terrain generation code
- Includes height map generation, smoothing, and visualization
- May be useful reference for future terrain features

---

## 🎯 Purpose of This Directory

These prototypes served crucial roles in development:

1. **Performance Validation**
   - Ensured systems could handle target loads (50-100 NPCs, complex economies)
   - Identified bottlenecks before production implementation
   - Validated algorithmic choices

2. **System Design**
   - Tested mechanics in isolation before integration
   - Validated formulas and calculations
   - Established performance baselines

3. **Historical Record**
   - Documents design decisions
   - Preserves test results for reference
   - Shows evolution of game systems

---

## 📊 Test Results Summary

| System | Test Date | NPCs Tested | Performance | Status |
|--------|-----------|-------------|-------------|--------|
| Economy | Nov 2025 | 3 | Stable over 60 min | ✅ Validated |
| Pathfinding | Nov 2025 | 50-100 | 4000-6000 FPS | ✅ Validated |
| Aura Effects | Nov 2025 | N/A | Passed | ✅ Validated |
| Terrain Height | Nov 2025 | N/A | Not integrated | ⏸️ Historical |

---

## 🔄 Relationship to Production Code

### Economy Systems
**Prototype:** `economy-simulator/`
**Production:** `src/modules/resource-economy/`
- `ProductionTick.js`
- `ConsumptionSystem.js`
- `MoraleCalculator.js`

### Pathfinding
**Prototype:** `npc-pathfinding/`
**Production:** `src/systems/NPCPathfinder.js`

### Aura Effects
**Prototype:** `aura-testing/`
**Production:** `src/modules/building-types/BuildingEffect.js`

---

## 🚀 Running Prototype Tests

While these prototypes are historical, they can still be run for reference:

### Economy Simulator
```bash
cd documentation/prototypes/economy-simulator
node run-simulation.js
```

### NPC Pathfinding
```bash
cd documentation/prototypes/npc-pathfinding
node test-env-setup.js
```

### Aura Testing
```bash
cd documentation/prototypes/aura-testing
node run-aura-tests.js
```

**Note:** These may require dependencies that aren't in the main project. They're preserved for historical reference, not active development.

---

## 📝 Notes for Developers

**When to Create Prototypes:**
1. Testing expensive operations (100+ entities)
2. Validating complex algorithms
3. Performance-critical systems
4. New game mechanics

**Prototype Best Practices:**
1. Keep prototypes in `documentation/prototypes/`
2. Include comprehensive test reports
3. Document test results with metrics
4. Create clear README files
5. Note relationship to production code

**When to Remove Prototypes:**
1. After system is implemented and validated in production
2. After 6+ months with no reference
3. If clearly obsolete

**When to Keep Prototypes:**
1. Performance benchmarks remain relevant
2. Design decisions documented
3. May inform future features
4. Historical value for understanding evolution

---

## 🗂️ Total Lines of Code

- **economy-simulator/**: ~1,200 lines
- **npc-pathfinding/**: ~800 lines
- **aura-testing/**: ~500 lines
- **TerrainHeightPrototype.js**: 8,381 lines
- **Test reports/results**: ~800 lines
- **Total**: ~11,681 lines

---

**Moved from:** `src/prototypes/` (November 2025)
**Reason:** Historical testing artifacts, not production code
**Value:** Performance validation, design decisions, historical record
**Status:** Preserved for reference, not actively maintained
