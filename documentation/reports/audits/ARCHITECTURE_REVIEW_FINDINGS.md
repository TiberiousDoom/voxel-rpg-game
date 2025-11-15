# Voxel RPG Architecture Review - Findings Report

## Executive Summary
The modular architecture has good separation of concerns, but **critical cleanup gaps exist** when buildings are deleted. No cross-module synchronization occurs, creating memory leaks and state inconsistencies.

---

## FINDING 1: No Cross-Module Cleanup on Building Deletion

### Problem
When `useFoundationStore.removeBuilding()` is called, it ONLY:
- Removes from buildings map
- Updates spatial hash
- Clears selectedBuildingId

It does NOT trigger cleanup in dependent modules.

### Files Affected
- `/home/user/voxel-rpg-game/src/modules/foundation/stores/useFoundationStore.js` (lines 103-119)
- `/home/user/voxel-rpg-game/src/modules/foundation/hooks/usePlacement.js` (lines 96-105)

### Evidence
```javascript
// useFoundationStore.js - removeBuilding (lines 103-119)
removeBuilding: (buildingId) => {
  set((state) => {
    const building = state.buildings.get(buildingId);
    if (!building) return state;

    state.buildings.delete(buildingId);
    spatialHash.remove(buildingId, building.position);

    if (state.selectedBuildingId === buildingId) {
      state.selectedBuildingId = null;
    }

    return state;
  });

  return !get().buildings.has(buildingId);
},
```

**Missing Cleanup:**
- No call to cancel/remove from build queue
- No unassignment of NPCs
- No removal from territory tracking
- No cleanup of territory bonuses

---

## FINDING 2: Memory Leak - Build Queue Not Cleaned

### Scenario: Building Destroyed During Construction

**Steps:**
1. Player places WALL building → status = BLUEPRINT
2. Player starts construction → status = BUILDING, added to buildQueue
3. Player destroys building → status = DESTROYED, removeBuilding() called
4. buildQueue still has entry for deleted building

**Impact:**
- Queue entry remains in memory indefinitely
- Construction progress tracked for non-existent building
- Storage leak grows with each destroyed building under construction

### Files Affected
- `/home/user/voxel-rpg-game/src/modules/resource-economy/stores/useResourceEconomyStore.js` (lines 119-134)
- `/home/user/voxel-rpg-game/src/modules/resource-economy/managers/BuildQueueManager.js` (lines 73-76)

### Evidence
```javascript
// useResourceEconomyStore.js - completeConstruction (lines 119-134)
completeConstruction: (buildingId) => {
  set((state) => {
    // Removes from queue
    state.buildQueue.removeFromQueue(buildingId);
    // Removes from pending
    state.pendingConstructions.delete(buildingId);
    // Updates history
    state.economicHistory.buildingsCompleted += 1;
    return state;
  });

  return { success: true };
},
```

**No equivalent cleanup when building is deleted!** Only manual `cancelConstruction()` removes from queue.

---

## FINDING 3: NPCs Remain Assigned to Deleted Buildings

### Scenario: Building with Assigned NPCs Destroyed

**Steps:**
1. Player creates WORKSHOP → status = COMPLETE
2. Player assigns NPC_CRAFTSMAN to workshop
3. Player destroys workshop → removeBuilding() called
4. NPC still has `assignedBuildingId` pointing to deleted building

### Impact
- NPC references non-existent building in Foundation
- `getNPCsInBuilding(buildingId)` returns dangling references
- Statistics calculations include "phantom" workers
- UI shows NPCs assigned to non-existent buildings

### Files Affected
- `/home/user/voxel-rpg-game/src/modules/module4/stores/useNPCSystem.js` (lines 102-115, 128-171)
- No cross-module trigger when buildings deleted

### Evidence
```javascript
// useNPCSystem.js - deleteNPC (lines 102-115)
deleteNPC: (npcId) => {
  set((state) => {
    const npc = state.npcs.get(npcId);
    if (npc && npc.assignedBuildingId) {
      // Only cleans UP if NPC is deleted
      // Doesn't clean WHEN BUILDING is deleted
      const assignments = state.npcAssignments.get(npc.assignedBuildingId) || [];
      state.npcAssignments.set(
        npc.assignedBuildingId,
        assignments.filter((id) => id !== npcId)
      );
    }
    state.npcs.delete(npcId);
    return state;
  });
},
```

**Missing:** No method in NPC system to clean when building is removed.

---

## FINDING 4: Territory Tracking Orphaned Building References

### Scenario: Building Removed from Territory

**Steps:**
1. Territory created with buildingIds array
2. Building placed within territory → added to buildingIds
3. Player destroys building → removeBuilding() called
4. Territory still references deleted building ID

### Impact
- Territory bonuses calculated incorrectly (includes deleted buildings)
- `getTerritoryBuildingIds()` returns IDs that don't exist
- `recalculateBonuses()` filters deleted buildings causing incorrect stats
- `updateTerritoryBounds()` includes ghost buildings

### Files Affected
- `/home/user/voxel-rpg-game/src/modules/module4/stores/useTerritory.js` (lines 246-255)
- No hook when Foundation buildings deleted

### Evidence
```javascript
// useTerritory.js - recalculateBonuses (lines 277-290)
recalculateBonuses: (territoryId, buildings) => {
  set((state) => {
    const territory = state.territories.get(territoryId);
    if (!territory) return state;

    // This filters out deleted buildings on recalculation
    // But orphaned IDs remain in buildingIds array
    const territoryBuildings = buildings.filter((b) => territory.buildingIds.includes(b.id));
    territory.bonuses = calculateTerritoryBonuses(territoryBuildings);
    territory.needsRecalculation = false;
    state.lastBonusCalculation = Date.now();

    return state;
  });
},
```

**Problem:** `removeBuildingFromTerritory()` must be called manually, never happens on deletion.

---

## FINDING 5: Edge Case - Building Placement with Same ID

### Scenario: Rapid Building Creation After Deletion

**Steps:**
1. Create building_1
2. Delete building_1 (ID reusable)
3. Quickly create another building
4. buildQueue still has phantom entry for building_1
5. New building_1 collides with queue entry

### Impact
- Constructor logic doesn't guarantee unique IDs during deletion
- `nextBuildingId` increments regardless of deletion
- Old queue entries corrupt new buildings' progress
- State becomes inconsistent

### Files Affected
- `/home/user/voxel-rpg-game/src/modules/foundation/stores/useFoundationStore.js` (lines 63-92)
- `/home/user/voxel-rpg-game/src/modules/resource-economy/managers/BuildQueueManager.js`

---

## FINDING 6: State Consistency During BLUEPRINT → BUILDING → COMPLETE Transition

### Issue: Incomplete Synchronization

**Current flow:**
1. `BLUEPRINT` state = added to Foundation only
2. `startConstruction()` → transitions to BUILDING, adds to queue
3. `updateConstructionProgress()` → on 100%, marks as COMPLETE

**Problem:** No atomic operation ensures all modules see state transition simultaneously.

**Race Condition:**
- Thread A: reads building status (BUILDING)
- Thread B: updates building status (COMPLETE)
- Thread A: still thinks building is BUILDING
- Multiple modules have inconsistent views

### Files Affected
- `/home/user/voxel-rpg-game/src/modules/resource-economy/ResourceEconomyModule.js` (lines 166-181)
- `/home/user/voxel-rpg-game/src/modules/foundation/stores/useFoundationStore.js` (lines 298-308)

### Evidence
```javascript
// ResourceEconomyModule.js - updateConstructionProgress (lines 166-181)
updateConstructionProgress: (foundationStore) => {
  const economyStore = useResourceEconomyStore.getState();
  const completed = economyStore.updateConstructionProgress();

  // Updates Foundation AFTER Economy store processes
  // Multiple updates = potential race condition
  if (foundationStore && foundationStore.updateBuilding) {
    completed.forEach((buildingId) => {
      foundationStore.updateBuilding(buildingId, {
        status: BUILDING_STATUS.COMPLETE,
        buildProgress: 100,
      });
    });
  }

  return completed;
},
```

---

## FINDING 7: No Unnecessary Data Replication - But Implicit Dependencies

### Issue: No Validation of Queries

Modules query Foundation instead of caching, which is GOOD (no duplication).

**But:** No validation that queried buildings still exist.

### Example:
```javascript
// useTerritory.js - recalculateBonuses (lines 283)
const territoryBuildings = buildings.filter((b) => territory.buildingIds.includes(b.id));
```

If buildingIds has orphaned IDs, the filter masks the problem silently.

---

## FINDING 8: Edge Case Not Handled - Storage Full During Construction

### Scenario: Storage Capacity Exceeded

**Steps:**
1. Storage building destroyed while resources in queue for crafting
2. Storage capacity drops below current usage
3. `updateStorageState()` marks `isFull: true`
4. No mechanism to overflow/refund resources

### Files Affected
- `/home/user/voxel-rpg-game/src/modules/resource-economy/stores/useResourceEconomyStore.js` (lines 246-270)

### Evidence
```javascript
// useResourceEconomyStore.js - updateStorageState (lines 246-270)
updateStorageState: (storageBuildings, currentInventory) => {
  set((state) => {
    const maxCapacity = calculateTotalStorageCapacity(storageBuildings);

    // Calculate current usage
    const usage = {};
    Object.entries(currentInventory).forEach(([resource, amount]) => {
      if (resource !== 'items' && resource !== 'materials') {
        usage[resource] = amount || 0;
      }
    });

    // Calculate if full - but what if current > capacity?
    const totalUsed = Object.values(usage).reduce((a, b) => a + b, 0);
    const isFull = totalUsed >= maxCapacity;
    // No overflow handling!
```

---

## SUMMARY OF ISSUES BY CATEGORY

### Critical Memory Leaks
1. Build queue entries not cleaned when buildings deleted
2. NPC assignments not cleared when buildings deleted
3. Territory building references not removed when buildings deleted

### State Consistency Issues
1. No atomic transitions when buildings change status
2. Multiple modules can have inconsistent view of building state
3. Cross-module queries have no validation

### Unhandled Edge Cases
1. Building destroyed during construction
2. Building destroyed with assigned NPCs
3. Building removed from territory (orphaned reference)
4. Building placed with same ID after deletion
5. Storage overflow when storage buildings destroyed
6. Simultaneous operations causing race conditions

### Missing Orchestration
1. No cleanup coordinator when buildings deleted
2. No listeners/observers for building state changes
3. No cascade cleanup mechanism
4. Manual coordination required between modules (bug-prone)

---

## RECOMMENDATIONS (Priority Order)

### P1 - Critical (Prevents Save Corruption)
1. Implement cascading cleanup in `removeBuilding()`
2. Clean build queue when building deleted
3. Unassign all NPCs when building deleted
4. Remove building from territory tracking

### P2 - High (Prevents Gameplay Issues)
1. Add building ID validation in cross-module queries
2. Implement atomic state transitions
3. Add overflow handling for storage
4. Prevent race conditions with locks/transactions

### P3 - Medium (Code Quality)
1. Add integration tests for deletion scenarios
2. Document module interdependencies
3. Add change listeners for building state
4. Implement cleanup middleware

