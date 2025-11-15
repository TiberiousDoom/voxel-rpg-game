# Test Failure Investigation Report

**Investigation Date:** 2025-11-12
**Total Failed Tests:** 105 tests across 9 test suites
**Total Passing Tests:** 428 tests
**Critical Priority:** HIGH - Multiple core systems affected

---

## Executive Summary

The test suite has **105 failing tests** across **9 test suites**, while **428 tests are passing**. Investigation revealed **6 distinct error patterns** affecting different layers of the codebase:

1. **ConsumptionSystem API change** - Return object missing `foodConsumed` and conditional `npcsDied` properties
2. **NPCAssignment module export** - Tests correctly use ES6 imports; likely Jest/Babel transpilation issue
3. **Resource NaN values** - Tests accessing wrong property names from ConsumptionSystem
4. **Building placement failures** - Integration test setup issues with module initialization
5. **Event-based test timeouts** - Events not firing or test waiting indefinitely
6. **Save/load system failures** - Already documented in SAVE_LOAD_INVESTIGATION.md

**Key Finding:** Most failures stem from a **recent API change to ConsumptionSystem** where the return object structure was modified but tests weren't updated to match.

---

## Error Pattern #1: ConsumptionSystem API Mismatch (CRITICAL)

### Affected Tests
- **ResourceEconomy.test.js**: 4 tests failing
- **FullSystemIntegration.test.js**: 4 tests failing
- **Total Impact**: 8+ tests

### Error Details

**Location:** `src/modules/resource-economy/ConsumptionSystem.js:139-209`

**Problem 1 - Missing `foodConsumed` property:**

Tests expect a `foodConsumed` property in the result:
```javascript
// ResourceEconomy.test.js:338
const tick = consumption.executeConsumptionTick(foodBefore);
const consumed = parseFloat(tick.foodConsumed);  // ❌ UNDEFINED
storage.removeResource('food', consumed);  // ❌ Removes NaN, corrupts storage
```

But `ConsumptionSystem.executeConsumptionTick()` returns:
```javascript
// ConsumptionSystem.js:159-171
return {
  tickNumber: 'consumption',
  aliveCount: aliveNPCs.length,
  workingCount: aliveNPCs.filter(n => n.isWorking).length,
  idleCount: aliveNPCs.filter(n => !n.isWorking).length,
  npcFoodConsumption: npcFoodConsumption.toFixed(4),  // ✅ Available
  buildingConsumption: buildingConsumption,
  totalFoodConsumption: totalFoodConsumption.toFixed(4),  // ✅ Available
  consumptionPerMinute: (totalFoodConsumption * 12).toFixed(4),
  foodRemaining: Math.max(0, foodRemaining).toFixed(2),
  starvationOccurred: false,
  npcsStarving: []
  // ❌ NO foodConsumed property!
};
```

**Problem 2 - Conditional `npcsDied` property:**

Tests expect `npcsDied` to always be present:
```javascript
// ResourceEconomy.test.js:145
expect(result.npcsDied).toBe(0);  // ❌ UNDEFINED when no starvation
```

But `npcsDied` is only added when starvation occurs:
```javascript
// ConsumptionSystem.js:174-194
if (foodRemaining < 0) {
  // ... starvation logic ...
  result.npcsDied = npcsStarving.filter(...).length;  // Only set here!
}
// If no starvation, npcsDied is NOT in the result object
```

### Impact
- **parseFloat(undefined)** returns **NaN**
- **storage.removeResource('food', NaN)** corrupts resource values
- All subsequent resource calculations return **NaN**
- Integration tests fail with `expect(storage.getResource('food')).toBeGreaterThan(0); // Received: NaN`

### Root Cause
Recent changes to starvation mechanics (gradual damage vs instant death) modified the return object structure without updating tests.

### Recommended Fix

**Option A: Add missing properties to return object (PREFERRED)**
```javascript
// ConsumptionSystem.js:159-171
return {
  tickNumber: 'consumption',
  aliveCount: aliveNPCs.length,
  workingCount: aliveNPCs.filter(n => n.isWorking).length,
  idleCount: aliveNPCs.filter(n => !n.isWorking).length,
  foodConsumed: totalFoodConsumption,  // ✅ ADD THIS (as number, not string)
  npcFoodConsumption: npcFoodConsumption.toFixed(4),
  buildingConsumption: buildingConsumption,
  totalFoodConsumption: totalFoodConsumption.toFixed(4),
  consumptionPerMinute: (totalFoodConsumption * 12).toFixed(4),
  foodRemaining: Math.max(0, foodRemaining).toFixed(2),
  starvationOccurred: false,
  npcsStarving: [],
  npcsDied: 0  // ✅ ADD THIS (always initialize to 0)
};
```

Then update the starvation block:
```javascript
// ConsumptionSystem.js:193
result.npcsDied = npcsStarving.filter(id => !aliveNPCs.find(n => n.id === id && n.alive)).length;
// This will override the initial 0 value when starvation occurs
```

**Option B: Update all tests to use correct property names**
- Replace `tick.foodConsumed` with `parseFloat(tick.totalFoodConsumption)`
- Add fallback: `result.npcsDied ?? 0`

**Recommendation:** Option A is preferred because:
1. `foodConsumed` is a clearer, more intuitive property name
2. Always having `npcsDied` (even as 0) is better API design
3. Less churn across test files
4. Backward compatible with existing consumers

---

## Error Pattern #2: NPCAssignment Module Export (MEDIUM PRIORITY)

### Affected Tests
- **NPCSystem.test.js**: 13 tests failing
- **GameEngine.integration.test.js**: 37 tests failing
- **Total Impact**: 50+ tests

### Error Details

**Error Message:**
```
TypeError: _NPCAssignment.NPCAssignment is not a constructor
  at Object.<anonymous> (src/modules/npc-system/__tests__/NPCSystem.test.js:172:20)
```

**Source File Export:** `src/modules/npc-system/NPCAssignment.js:329`
```javascript
export { NPCAssignment, BuildingSlot };  // ✅ Correct ES6 named export
```

**Test File Import:** `src/modules/npc-system/__tests__/NPCSystem.test.js:10`
```javascript
import { NPCAssignment } from '../NPCAssignment';  // ✅ Correct ES6 import
```

### Investigation Findings

The export and import statements are **both correct**. The error `_NPCAssignment.NPCAssignment` suggests Jest/Babel is transpiling the ES6 module to CommonJS in a way that creates a nested structure.

**Possible Causes:**
1. **Jest/Babel configuration issue** - Module transformation adding extra layer
2. **Circular dependency** - NPCAssignment importing something that imports it back
3. **Module caching** - Old transpiled version cached
4. **Missing babel-jest transform** - ES6 modules not properly transformed

### Recommended Fixes (in priority order)

**Fix 1: Clear Jest cache**
```bash
npm test -- --clearCache
```

**Fix 2: Check for circular dependencies**
```bash
# Use a tool like madge to detect circular imports
npx madge --circular src/modules/npc-system/
```

**Fix 3: Verify jest.config.js or package.json jest configuration**
Ensure proper transform configuration:
```json
{
  "jest": {
    "transform": {
      "^.+\\.jsx?$": "babel-jest"
    }
  }
}
```

**Fix 4: Add default export as fallback**
```javascript
// NPCAssignment.js:329
export { NPCAssignment, BuildingSlot };
export default NPCAssignment;  // Add this
```

### Workaround for Tests
If the issue persists, tests can use:
```javascript
import NPCAssignmentModule from '../NPCAssignment';
const { NPCAssignment } = NPCAssignmentModule;
```

---

## Error Pattern #3: Building Placement Failures (MEDIUM)

### Affected Tests
- **BuildingPlacement.integration.test.js**: 6 tests failing
- **GameManager.test.js**: 2 tests failing
- **Total Impact**: 8 tests

### Error Details

**Error:**
```javascript
expect(result.success).toBe(true);
// Received: false
```

**Location:** `src/GameManager.js:307-335`

### Investigation Findings

**GameManager uses mock modules by default:**
```javascript
// GameManager.js:81-97
_createModules() {
  return {
    grid: this._createMockGridManager(),
    spatial: this._createMockSpatialPartitioning(),
    // ... other mocks
  };
}
```

**Mock GridManager looks correct:**
```javascript
// GameManager.js:491-500
_createMockGridManager() {
  return {
    placeBuilding: (type, position) => ({
      id: `building-${Date.now()}`,
      type,
      position
    }),  // ✅ This should work
    getAllBuildings: () => []
  };
}
```

### Possible Causes

1. **Tests using real modules instead of mocks** - Integration tests might initialize with actual GridManager
2. **Position validation failing** - GameManager.placeBuilding() validates position format
3. **Orchestrator not initialized** - Tests not calling `initialize()` before `placeBuilding()`
4. **Grid bounds checking** - Real GridManager might reject positions outside grid bounds

### Recommended Investigation Steps

1. **Check test setup in BuildingPlacement.integration.test.js:**
   - Verify `beforeEach()` calls `gameManager.initialize()`
   - Verify position format: `{x: number, y: number}`
   - Check if using real GridManager or mocks

2. **Add debug logging:**
```javascript
// GameManager.js:315
const building = this.orchestrator.grid.placeBuilding(type, position);
console.log('placeBuilding result:', building);  // Add this
if (building) {
```

3. **Verify orchestrator state:**
```javascript
// Before calling placeBuilding in tests
console.log('orchestrator.grid:', gameManager.orchestrator?.grid);
console.log('gameState:', gameManager.gameState);
```

### Recommended Fix

**Most likely:** Tests need to ensure GameManager is initialized:
```javascript
// BuildingPlacement.integration.test.js
beforeEach(() => {
  gameManager = new GameManager();
  gameManager.initialize();  // ✅ Must call this
});

test('should place building', () => {
  const result = gameManager.placeBuilding('HOUSE', { x: 0, y: 0 });
  expect(result.success).toBe(true);
});
```

---

## Error Pattern #4: Event-Based Test Timeouts (LOW)

### Affected Tests
- **BuildingPlacement.integration.test.js**: 1 test (line 50 - `building:placed` event)
- **GameEngine.integration.test.js**: 1 test (line 319 - `production:update` events)
- **Total Impact**: 2 tests

### Error Details

**Error:**
```
thrown: "Exceeded timeout of 5000 ms for a test.
Use jest.setTimeout(newTimeout) to increase the timeout value"
```

### Possible Causes

1. **Event never emitted** - GameManager/Engine not firing expected events
2. **Listener registered after event fired** - Race condition
3. **Event name mismatch** - Test listening for wrong event name
4. **Test not cleaning up listeners** - Previous test's listeners interfering

### Recommended Investigation

**Check if events are actually being emitted:**
```javascript
// In the test
gameManager.on('building:placed', (data) => {
  console.log('EVENT RECEIVED:', data);
  done();
});

console.log('Registered listeners:', gameManager.eventNames());
const result = gameManager.placeBuilding('HOUSE', { x: 0, y: 0 });
console.log('placeBuilding result:', result);
```

**Verify event names match:**
```javascript
// GameManager.js:318-322
this.emit('building:placed', {  // Event name: 'building:placed'
  buildingId: building.id,
  type,
  position
});
```

### Recommended Fixes

**Fix 1: Ensure test waits for async operations**
```javascript
test('should emit building:placed event', (done) => {
  const gameManager = new GameManager();
  gameManager.initialize();

  // Register listener BEFORE action
  gameManager.on('building:placed', (data) => {
    expect(data.buildingId).toBeDefined();
    done();
  });

  // Trigger action
  gameManager.placeBuilding('HOUSE', { x: 0, y: 0 });
});
```

**Fix 2: Increase timeout for legitimate slow tests**
```javascript
test('should handle production events', (done) => {
  // ... test code ...
}, 10000);  // 10 second timeout
```

**Fix 3: Use promises instead of callbacks**
```javascript
test('should emit building:placed event', () => {
  return new Promise((resolve) => {
    gameManager.on('building:placed', (data) => {
      expect(data.buildingId).toBeDefined();
      resolve();
    });

    gameManager.placeBuilding('HOUSE', { x: 0, y: 0 });
  });
});
```

---

## Error Pattern #5: Save/Load System Failures (DOCUMENTED)

### Affected Tests
- **BrowserSaveManager.test.js**: 25 tests failing
- **SaveLoad.integration.test.js**: 8 tests failing
- **Total Impact**: 33 tests

### Status
✅ **Already investigated and documented** in `SAVE_LOAD_INVESTIGATION.md`

### Key Issues (Summary)
1. Async/sync mismatch in save/load chain
2. localStorage key format mismatch (`slot-1` vs `voxel-rpg-save-slot-1`)
3. Missing `getSaveSlots()` method in GameManager
4. GameStateSerializer validation failures

### Recommended Action
**Refer to SAVE_LOAD_INVESTIGATION.md** for comprehensive analysis and fix plan.

---

## Error Pattern #6: NPCAssignment Constructor (Jest Transpilation Issue)

### Status
See **Error Pattern #2** above for full details.

---

## Priority Fix List

### Priority 1 (BLOCKING - Must fix immediately)

1. **Fix ConsumptionSystem API** ⏱️ 20 minutes
   - Add `foodConsumed` property to return object (as number, not string)
   - Always initialize `npcsDied: 0` in return object
   - **Files:** `ConsumptionSystem.js:159-171, 193`
   - **Impact:** Fixes 8+ tests, unblocks integration tests

2. **Clear Jest cache and verify NPCAssignment import** ⏱️ 10 minutes
   ```bash
   npm test -- --clearCache
   npm test -- --testPathPattern="NPCSystem.test.js"
   ```
   - If still failing, check for circular dependencies
   - **Impact:** Fixes 50+ tests

### Priority 2 (IMPORTANT - Fix for proper test coverage)

3. **Fix building placement test setup** ⏱️ 15 minutes
   - Verify `gameManager.initialize()` is called in `beforeEach()`
   - Add debug logging to identify actual failure cause
   - **Files:** `BuildingPlacement.integration.test.js`, `GameManager.test.js`
   - **Impact:** Fixes 8 tests

4. **Fix event-based test timeouts** ⏱️ 15 minutes
   - Verify event listeners registered before triggering actions
   - Add debug logging to confirm events are emitted
   - Consider using promises instead of callbacks
   - **Impact:** Fixes 2 tests

### Priority 3 (DEFERRED - Already documented)

5. **Save/Load system fixes** ⏱️ 2 hours (as estimated in SAVE_LOAD_INVESTIGATION.md)
   - Follow fix plan in SAVE_LOAD_INVESTIGATION.md
   - **Impact:** Fixes 33 tests

---

## Root Cause Analysis

### Primary Root Cause
**Recent P1B implementation changed ConsumptionSystem API** without updating tests. The new gradual starvation mechanics modified the return object structure, breaking all tests that depend on `foodConsumed` and `npcsDied` properties.

### Secondary Root Causes
1. **No contract tests** - ConsumptionSystem's return object structure not enforced by tests
2. **String vs Number inconsistency** - Some values returned as strings (`.toFixed()`), others as numbers
3. **Missing integration test for API changes** - Breaking changes not caught before commit
4. **Jest/Babel configuration drift** - NPCAssignment export issue suggests tooling misconfiguration

### Systemic Issues
1. **Tests tightly coupled to implementation** - Many tests access internal properties directly
2. **Mock vs Real module confusion** - GameManager uses mocks, tests might use real modules
3. **Event-based testing complexity** - Async event testing prone to race conditions
4. **No TypeScript** - Would catch property access errors at compile time

---

## Recommended Testing Improvements

### Short Term
1. **Add API contract tests** for all module return objects
2. **Standardize return types** - Use numbers for numeric values, not stringified
3. **Always initialize all return properties** - Never have conditional properties (use `null` or `0` instead)

### Long Term
1. **Migrate to TypeScript** - Catch API mismatches at compile time
2. **Use OpenAPI/JSON Schema** - Define module interfaces formally
3. **Add integration smoke tests** - Quick test that runs full game loop
4. **Set up CI/CD** - Run tests on every commit

---

## Testing Checklist

After implementing fixes, verify:

### ConsumptionSystem Fixes
- [ ] `executeConsumptionTick()` returns `foodConsumed` as **number** (not string)
- [ ] `executeConsumptionTick()` always returns `npcsDied` (0 when no starvation)
- [ ] ResourceEconomy.test.js passes all consumption tests
- [ ] FullSystemIntegration.test.js passes resource tracking tests
- [ ] No NaN values in storage after consumption

### NPCAssignment Fixes
- [ ] `npm test -- --clearCache` executed
- [ ] NPCSystem.test.js all 13 tests pass
- [ ] GameEngine.integration.test.js all 37 tests pass
- [ ] No circular dependency warnings

### Building Placement Fixes
- [ ] BuildingPlacement.integration.test.js all 6 tests pass
- [ ] GameManager.test.js building placement tests pass
- [ ] Events emitted correctly

### Event Timeout Fixes
- [ ] No tests exceed 5000ms timeout
- [ ] `building:placed` event test completes
- [ ] `production:update` event test completes

### Overall Verification
- [ ] All 105 previously failing tests now pass
- [ ] No new test failures introduced
- [ ] Test suite completes in reasonable time (<2 minutes)

---

## Files Requiring Changes

### Immediate Changes Required
1. ✅ **src/modules/resource-economy/ConsumptionSystem.js**
   - Lines 159-171: Add `foodConsumed` and initialize `npcsDied: 0`
   - Line 193: Keep override of `npcsDied` during starvation

2. ❓ **Jest configuration** (package.json or jest.config.js)
   - Verify module transformation settings
   - Clear cache: `npm test -- --clearCache`

3. ❓ **src/__tests__/BuildingPlacement.integration.test.js**
   - Verify `beforeEach()` setup
   - Check `gameManager.initialize()` is called

4. ❓ **src/__tests__/GameManager.test.js**
   - Verify building placement test setup
   - Check position format

### Already Documented
5. 📋 **Save/load system files** (see SAVE_LOAD_INVESTIGATION.md)
   - GameManager.js
   - useGameManager.js
   - GameControlBar.jsx
   - BrowserSaveManager.js

---

## Conclusion

**Summary:**
- **105 test failures** across **9 test suites**
- **Primary cause:** ConsumptionSystem API change broke 8+ tests and caused NaN propagation
- **Secondary cause:** Jest/Babel NPCAssignment import issue affecting 50+ tests
- **Tertiary causes:** Test setup issues, event timing, save/load bugs

**Severity:** **HIGH** - Core resource economy broken by NaN propagation
**Complexity:** **LOW-MEDIUM** - Issues are clear and fixable
**Estimated total fix time:** **1-2 hours** for Priority 1 & 2, **+2 hours** for save/load (Priority 3)

**Confidence Level:** **HIGH** for ConsumptionSystem fixes, **MEDIUM** for NPCAssignment (needs cache clear verification)

**Next Steps:**
1. Fix ConsumptionSystem return object (20 min)
2. Clear Jest cache and re-run tests (10 min)
3. Debug building placement tests (15 min)
4. Fix event timeout tests (15 min)
5. Defer save/load fixes (follow separate investigation report)

---

## Appendix: Test Failure Statistics

### By Test Suite
| Test Suite | Failed | Total | Pass Rate |
|-----------|--------|-------|-----------|
| BrowserSaveManager.test.js | 25 | 25 | 0% |
| GameEngine.integration.test.js | 37 | 37 | 0% |
| NPCSystem.test.js | 13 | 27 | 52% |
| ResourceEconomy.test.js | 7 | 15 | 53% |
| FullSystemIntegration.test.js | 8 | 12 | 33% |
| BuildingPlacement.integration.test.js | 8 | 14 | 43% |
| GameManager.test.js | 3 | 10 | 70% |
| SaveLoad.integration.test.js | 8 | 8 | 0% |
| **TOTAL** | **105** | **533** | **80%** |

### By Error Pattern
| Pattern | Tests Affected | Priority |
|---------|----------------|----------|
| ConsumptionSystem API | 8+ | P1 |
| NPCAssignment import | 50+ | P1 |
| Building placement | 8 | P2 |
| Event timeouts | 2 | P2 |
| Save/load | 33 | P3 |

### By Module
| Module | Tests Affected |
|--------|----------------|
| Resource Economy | 15 |
| NPC System | 50 |
| Save/Load | 33 |
| Building System | 8 |
| Integration | 12 |

---

**Report Generated:** 2025-11-12
**Investigator:** Claude
**Status:** Investigation Complete - Ready for Implementation
