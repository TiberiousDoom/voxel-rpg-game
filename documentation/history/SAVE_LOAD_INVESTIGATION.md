# Save/Load System Investigation Report

## Investigation Date: 2025-11-12

## Executive Summary

The save/load feature has **multiple critical issues** that prevent it from working correctly. The investigation revealed:

1. **localStorage key mismatch** between UI and save manager
2. **Missing API methods** in GameManager
3. **Async/sync mismatch** in the save/load chain
4. **Incomplete UI integration**

---

## Critical Issues Found

### 🔴 **ISSUE #1: localStorage Key Mismatch (CRITICAL)**

**Location:**
- `GameControlBar.jsx:36` vs `BrowserSaveManager.js:86`

**Problem:**
The UI and save manager use **different localStorage key formats**.

**GameControlBar.jsx** (lines 34-39):
```javascript
for (let i = 1; i <= 3; i++) {
  const slotKey = `slot-${i}`;  // ← Checking for 'slot-1', 'slot-2', 'slot-3'
  if (localStorage.getItem(slotKey)) {
    existing.add(slotKey);
  }
}
```

**BrowserSaveManager.js** (lines 26, 86-87):
```javascript
storagePrefix: config.storagePrefix || 'voxel-rpg-',  // Default prefix
...
const storageKey = `${this.config.storagePrefix}save-${slotName}`;
// ← Saves to 'voxel-rpg-save-slot-1', NOT 'slot-1'
```

**Impact:**
- UI never detects saved games
- Load button stays disabled even after saving
- savedSlots Set never updates correctly

**Fix Required:**
Update GameControlBar to check for the correct keys with prefix:
```javascript
const slotKey = `voxel-rpg-save-slot-${i}`;
```

---

### 🔴 **ISSUE #2: Missing getSaveSlots() Method (CRITICAL)**

**Location:**
- `GameManager.js` - method missing
- `useGameManager.js:504-515` - calls non-existent method

**Problem:**
`useGameManager.js` defines a `getSaveSlots()` action that calls:
```javascript
return gameManagerRef.current.getSaveSlots();
```

But `GameManager.js` **does not have a `getSaveSlots()` method**.

**Expected Method:**
```javascript
// GameManager.js - MISSING
getSaveSlots() {
  return this.saveManager.listSaves();
}
```

**Impact:**
- Cannot list available save slots
- UI cannot show which slots have saves
- getSaveSlots action returns undefined

---

### 🔴 **ISSUE #3: Async/Sync Mismatch (HIGH)**

**Location:**
- `BrowserSaveManager.js` - async methods
- `GameManager.js:404-447` - sync wrapper
- `useGameManager.js:458-499` - sync action

**Problem:**
`BrowserSaveManager` uses **async/await** for save/load:
```javascript
async saveGame(orchestrator, engine, slotName, description) { ... }
async loadGame(slotName, orchestrator, engine) { ... }
```

But `GameManager.js` calls them **synchronously**:
```javascript
saveGame(slotName, description = '') {
  const result = this.saveManager.saveGame(  // ← Missing await!
    this.orchestrator,
    this.engine,
    slotName,
    description
  );
  return result;  // Returns Promise, not result!
}
```

And `useGameManager.js` also doesn't await:
```javascript
saveGame: useCallback(
  (slotName = 'autosave', description = '') => {
    const result = gameManagerRef.current.saveGame(slotName, description);
    // ← result is a Promise, not the actual result!
    if (!result.success) {  // This will ALWAYS fail
      setError(result.message);
    }
    return result;
  },
  []
)
```

**Impact:**
- save/load operations never complete properly
- Success/failure detection broken
- UI shows "saved" before operation completes
- Errors not properly caught

**Fix Required:**
Make entire chain async:
```javascript
// GameManager.js
async saveGame(slotName, description = '') {
  const result = await this.saveManager.saveGame(...);
  return result;
}

// useGameManager.js
saveGame: useCallback(
  async (slotName = 'autosave', description = '') => {
    const result = await gameManagerRef.current.saveGame(slotName, description);
    if (!result.success) {
      setError(result.message);
    }
    return result;
  },
  []
)
```

---

### 🟡 **ISSUE #4: GameControlBar localStorage Direct Access (MEDIUM)**

**Location:**
- `GameControlBar.jsx:32-41`

**Problem:**
GameControlBar directly accesses localStorage instead of using the GameManager API:
```javascript
useEffect(() => {
  const existing = new Set();
  for (let i = 1; i <= 3; i++) {
    const slotKey = `slot-${i}`;
    if (localStorage.getItem(slotKey)) {  // ← Direct access
      existing.add(slotKey);
    }
  }
  setSavedSlots(existing);
}, []);
```

**Impact:**
- Bypasses save manager abstraction
- Won't work with IndexedDB saves
- Hardcoded to 3 slots (not flexible)
- Tightly coupled to storage implementation

**Fix Required:**
Use `getSaveSlots` prop passed from GameScreen:
```javascript
useEffect(() => {
  if (getSaveSlots) {
    const saves = getSaveSlots();  // ← Use API
    const slotSet = new Set(saves.map(s => s.slotName));
    setSavedSlots(slotSet);
  }
}, [getSaveSlots]);
```

---

### 🟡 **ISSUE #5: Save Status Not Based on Actual Result (MEDIUM)**

**Location:**
- `GameControlBar.jsx:43-52, 54-67`

**Problem:**
The UI shows save/load status based on **setTimeout**, not actual operation result:
```javascript
const handleSave = () => {
  setSaveStatus('Saving...');
  onSave(selectedSlot);  // ← Fire and forget
  setTimeout(() => {
    setSaveStatus(`✓ Saved to ${selectedSlot}`);  // ← Always shows success
    setTimeout(() => setSaveStatus(''), 2000);
  }, 500);
};
```

**Impact:**
- Shows "success" even if save failed
- No error feedback to user
- Misleading UI

**Fix Required:**
Wait for actual result:
```javascript
const handleSave = async () => {
  setSaveStatus('Saving...');
  const result = await onSave(selectedSlot);  // ← Await result
  if (result.success) {
    setSaveStatus(`✓ Saved to ${selectedSlot}`);
  } else {
    setSaveStatus(`❌ Error: ${result.message}`);
  }
  setTimeout(() => setSaveStatus(''), 2000);
};
```

---

### 🟡 **ISSUE #6: GameStateSerializer May Have Missing Methods (MEDIUM)**

**Location:**
- `GameStateSerializer.js:33-78`

**Problem:**
GameStateSerializer.serialize() calls multiple `_serialize*` methods for each module, but not all may be implemented. Need to verify all serialization methods exist:

**Required methods (from serialize call):**
- `_serializeGrid()` ✅
- `_serializeSpatial()` ✅
- `_serializeTierProgression()` ✅
- `_serializeBuildingEffect()` ✅
- `_serializeStorage()` ❓ Not verified
- `_serializeConsumption()` ❓ Not verified
- `_serializeMorale()` ❓ Not verified
- `_serializeTerritory()` ❓ Not verified
- `_serializeTown()` ❓ Not verified
- `_serializeNPCs()` ❓ Not verified
- `_serializeNPCAssignments()` ❓ Not verified
- `_serializeEngineState()` ❓ Not verified

**Impact:**
- Serialization might throw errors
- Incomplete save data
- Deserialization failures

---

## Root Cause Analysis

The save/load system was designed but **not properly integrated**:

1. **BrowserSaveManager** was created as a browser-compatible replacement for SaveManager
2. **GameManager** was written assuming sync SaveManager API, not async Browser variant
3. **GameControlBar** was written without knowledge of BrowserSaveManager's key format
4. **useGameManager** action wrappers don't handle async properly
5. **No end-to-end testing** was performed

**Result:** Each component works in isolation but fails when integrated.

---

## Data Flow (Current - BROKEN)

```
[User clicks Save button]
     ↓
[GameControlBar.handleSave()]
  - Shows "Saving..." (immediately)
  - Calls onSave(slotName)
  - Shows "✓ Saved" (after 500ms, regardless of result)
     ↓
[useGameManager.actions.saveGame()]
  - Calls gameManager.saveGame(slotName)
  - Gets Promise back (not result!)
  - Checks result.success (Promise has no .success property!)
     ↓
[GameManager.saveGame()]
  - Calls this.saveManager.saveGame() WITHOUT await
  - Returns Promise immediately
     ↓
[BrowserSaveManager.saveGame()] - async
  - Serializes game state
  - Saves to localStorage with prefix 'voxel-rpg-save-'
  - Returns {success, message} eventually
  - But caller already returned!
     ↓
[GameControlBar]
  - Checks localStorage for 'slot-1' (WRONG KEY!)
  - Doesn't find it
  - Keeps Load button disabled
```

---

## Data Flow (Expected - CORRECT)

```
[User clicks Save button]
     ↓
[GameControlBar.handleSave()] - async
  - Shows "Saving..."
  - Awaits onSave(slotName)
  - Gets actual result
  - Shows success or error based on result
     ↓
[useGameManager.actions.saveGame()] - async
  - Awaits gameManager.saveGame(slotName)
  - Gets actual result
  - Returns result to caller
     ↓
[GameManager.saveGame()] - async
  - Awaits this.saveManager.saveGame()
  - Gets {success, message, size, storage}
  - Emits 'game:saved' event
  - Returns result
     ↓
[BrowserSaveManager.saveGame()] - async
  - Serializes game state
  - Saves to 'voxel-rpg-save-slot-1'
  - Saves metadata to 'voxel-rpg-metadata-slot-1'
  - Returns {success: true, message: "Game saved", size: 12345}
     ↓
[GameControlBar]
  - Refreshes save slots using getSaveSlots()
  - Checks localStorage for 'voxel-rpg-save-slot-1' (CORRECT KEY!)
  - Finds it
  - Enables Load button
```

---

## Fix Priority List

### Priority 1 - BLOCKING (Must fix for save/load to work)

1. **Fix async/sync mismatch**
   - Make GameManager.saveGame() async
   - Make GameManager.loadGame() async
   - Update useGameManager actions to await
   - Update GameControlBar handlers to await
   - **Estimated time:** 30 minutes

2. **Fix localStorage key mismatch**
   - Update GameControlBar to use 'voxel-rpg-save-slot-X' format
   - Or pass key format from config
   - **Estimated time:** 10 minutes

3. **Add missing getSaveSlots() method**
   - Add method to GameManager
   - Return this.saveManager.listSaves()
   - **Estimated time:** 5 minutes

### Priority 2 - IMPORTANT (Should fix for proper UX)

4. **Update GameControlBar to use getSaveSlots API**
   - Remove direct localStorage access
   - Use getSaveSlots prop
   - **Estimated time:** 15 minutes

5. **Fix save/load status feedback**
   - Make handlers async
   - Show actual result status
   - **Estimated time:** 10 minutes

### Priority 3 - NICE TO HAVE (Improve robustness)

6. **Verify all serialization methods exist**
   - Check GameStateSerializer has all methods
   - Add missing ones if needed
   - **Estimated time:** 30 minutes

7. **Add error boundaries**
   - Catch and display save/load errors
   - **Estimated time:** 20 minutes

---

## Testing Checklist

After fixes, verify:

- [ ] Can save to slot-1
- [ ] localStorage shows 'voxel-rpg-save-slot-1' key
- [ ] Load button enables after save
- [ ] Can load from slot-1
- [ ] Game state restores correctly
- [ ] Success message shows after save
- [ ] Error message shows if save fails
- [ ] Multiple slots work (slot-1, slot-2, slot-3)
- [ ] Save metadata includes tick, tier, playtime
- [ ] listSaves() returns all saved games

---

## Recommendations

1. **Write integration tests** for save/load flow
2. **Add console logging** at each step for debugging
3. **Use TypeScript** to catch async/await mismatches
4. **Standardize key format** across all components
5. **Document the save system** architecture

---

## Files That Need Changes

1. `src/GameManager.js` - Make save/load async, add getSaveSlots()
2. `src/hooks/useGameManager.js` - Make actions async
3. `src/components/GameControlBar.jsx` - Fix keys, make handlers async
4. `src/components/GameScreen.jsx` - Pass getSaveSlots correctly
5. `src/persistence/GameStateSerializer.js` - Verify all methods exist

---

## Conclusion

The save/load system is **architecturally sound** but has **critical integration bugs**. The core save manager (BrowserSaveManager) works correctly, but the async nature wasn't properly propagated through the call chain, and UI components weren't updated to match the save manager's key format.

**Estimated total fix time:** 2 hours
**Severity:** HIGH - Feature completely non-functional
**Complexity:** MEDIUM - Issues are clear and fixable
