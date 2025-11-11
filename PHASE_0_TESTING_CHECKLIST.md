# Phase 0 Testing Checklist

## ✅ Core Game Loop

- [ ] Game starts at 60 FPS (verify in browser DevTools Performance tab)
- [ ] Game loop continues running without crashes for 5+ minutes
- [ ] Tick counter increments correctly
- [ ] Game can be stopped and restarted without issues
- [ ] No memory leaks over extended gameplay

---

## ✅ NPC System

### Spawn NPCs
- [ ] Click "Spawn NPC" button multiple times
- [ ] NPCs appear as red dots on the canvas
- [ ] Population counter updates correctly (e.g., "5/10")
- [ ] NPCs spawn without crashing the game
- [ ] Multiple NPCs can exist simultaneously
- [ ] NPCs spawn at different positions (not all stacked)

### NPC Movement (if implemented)
- [ ] NPCs move around the grid
- [ ] NPCs don't overlap with buildings
- [ ] Movement appears smooth at 60 FPS
- [ ] NPCs pathfind correctly

### NPC Statistics
- [ ] Population count accurate in NPCPanel
- [ ] Statistics update immediately when NPC spawns
- [ ] NPC health/happiness displays (if implemented)

---

## ✅ Building System

### Building Selection
- [ ] Click "Build House" - tan/brown preview square appears
- [ ] Click "Build Farm" - green preview square appears
- [ ] Click "Build Warehouse" - gray preview square appears
- [ ] Click "Build Town Center" - gold preview square appears (if available)
- [ ] Preview square follows mouse cursor accurately
- [ ] Preview stays snapped to grid

### Building Placement
- [ ] Click to place building - it stays in place
- [ ] Building doesn't disappear after clicking
- [ ] Building appears immediately (no delay)
- [ ] Can place multiple buildings of same type
- [ ] Can place multiple buildings of different types
- [ ] Cannot place buildings on top of each other
- [ ] Cannot place buildings on occupied tiles
- [ ] Placement validation works correctly

### Building Rendering
- [ ] House renders with correct color (tan/brown)
- [ ] Farm renders with correct color (green)
- [ ] Warehouse renders with correct color (gray)
- [ ] All building types visible and distinguishable
- [ ] Buildings persist after game stop/start
- [ ] Buildings remain visible when hovering over other tiles
- [ ] No visual glitches or flickering

---

## ✅ Mouse Tracking

### Accuracy
- [ ] Preview square appears exactly under mouse cursor
- [ ] No offset between cursor and preview
- [ ] No acceleration (preview doesn't move faster than cursor)
- [ ] Works at left edge of canvas
- [ ] Works at right edge of canvas
- [ ] Works at top edge of canvas
- [ ] Works at bottom edge of canvas
- [ ] Works in center of canvas

### Responsiveness
- [ ] Preview updates smoothly without lag
- [ ] No stuttering when moving mouse quickly
- [ ] Mouse tracking maintains 60 FPS
- [ ] Hover state updates immediately

---

## ✅ Resource System (Basic)

### Resource Display
- [ ] Food resource displays in ResourcePanel
- [ ] Wood resource displays in ResourcePanel
- [ ] Stone resource displays in ResourcePanel
- [ ] Gold resource displays in ResourcePanel
- [ ] Resource values are readable numbers (not NaN or undefined)
- [ ] Resource panel updates when game is running

### Resource Production (if wired up)
- [ ] Farms produce food over time
- [ ] Resource values increase during gameplay
- [ ] Production rate appears reasonable
- [ ] Multiple farms increase production

### Resource Consumption (if wired up)
- [ ] NPCs consume food
- [ ] Resource values decrease appropriately
- [ ] Consumption stops when resources reach zero
- [ ] Building placement costs resources
- [ ] Cannot build without sufficient resources

---

## ✅ Save/Load System

### Saving
- [ ] Click "Save" button - no errors in console
- [ ] Save completes successfully
- [ ] Success message or indicator appears
- [ ] Can save multiple times without crashing
- [ ] Save works with no buildings/NPCs (empty state)
- [ ] Save works with 1 building placed
- [ ] Save works with 10+ buildings placed
- [ ] Save works with 1 NPC spawned
- [ ] Save works with 10+ NPCs spawned
- [ ] Save works with both buildings and NPCs

### Loading
- [ ] Place 5 buildings and 3 NPCs
- [ ] Click "Save" button
- [ ] Refresh the page (F5)
- [ ] Click "Load" button
- [ ] All buildings reappear in correct positions
- [ ] All buildings have correct types/colors
- [ ] All NPCs reappear
- [ ] Population counter restores correctly
- [ ] Resource values restore correctly
- [ ] Game state fully restored

### Persistence
- [ ] Save data persists after browser refresh
- [ ] Save data persists after closing tab
- [ ] Save data persists after browser restart
- [ ] IndexedDB contains save data (check DevTools → Application → IndexedDB)
- [ ] Multiple save slots work (if implemented)
- [ ] Can overwrite existing save

### Error Cases
- [ ] Loading non-existent save shows appropriate message
- [ ] Corrupted save data doesn't crash game
- [ ] Save/Load works in incognito mode

---

## ✅ UI/UX

### Game Controls
- [ ] "Play" button starts the game
- [ ] "Pause" button stops the game
- [ ] "Save" button saves game state
- [ ] "Load" button loads game state
- [ ] Button states reflect game state correctly
- [ ] Disabled buttons appear disabled
- [ ] All buttons are clickable and responsive
- [ ] Button labels are clear and readable

### Build Menu
- [ ] All building types listed
- [ ] Building icons/colors visible
- [ ] Selected building is highlighted
- [ ] Can deselect building
- [ ] Menu doesn't cover game view

### Panels
- [ ] ResourcePanel displays all resources
- [ ] NPCPanel shows population statistics
- [ ] BuildMenu shows all building types
- [ ] No UI elements overlap
- [ ] Text is readable on all backgrounds
- [ ] Layout works at different window sizes
- [ ] No horizontal scrollbar
- [ ] No vertical scrollbar on game area

### Visual Feedback
- [ ] Selected building type is clearly indicated
- [ ] Hover state shows on canvas
- [ ] Building placement gives feedback
- [ ] Save/Load gives success feedback
- [ ] Errors show user-friendly messages

---

## ⚠️ Known Issues to Verify

### Grid Size Mismatch
- [ ] Visual grid is 10×10 but world is 100×100
- [ ] Buildings placed at position (9, 9) work correctly
- [ ] Buildings placed at position (50, 50) work correctly
- [ ] Buildings placed at position (99, 99) work correctly
- [ ] No crashes when placing at high coordinates
- [ ] Buildings wrap correctly (if wrapping is intended)

### NPC Spawn Positions
- [ ] NPCs don't all spawn on same tile
- [ ] NPC spawn positions appear random
- [ ] NPCs spawn on valid tiles (not on buildings)
- [ ] Multiple NPCs don't overlap

### Game Stopped Feedback
- [ ] User can tell when game is running
- [ ] User can tell when game is paused/stopped
- [ ] "Game Stopped" banner shows (if implemented)
- [ ] No confusion about game state

### Resource Consumption
- [ ] Resources are consumed when building
- [ ] Resources are consumed by NPCs
- [ ] Resource system is wired up and working

---

## 🐛 Error Handling

### Browser Console
- [ ] No red errors in console during normal gameplay
- [ ] No warnings about performance
- [ ] No React warnings about missing keys
- [ ] No React warnings about invalid props
- [ ] No "Warning: Can't perform a React state update" messages
- [ ] No "Warning: Each child should have a unique key" messages

### Edge Cases
- [ ] Rapidly clicking buttons doesn't crash
- [ ] Spam-clicking "Spawn NPC" doesn't freeze game
- [ ] Spam-clicking "Save" doesn't cause errors
- [ ] Placing 100+ buildings doesn't drop FPS below 30
- [ ] Spawning 100+ NPCs doesn't drop FPS below 30
- [ ] Save/Load with empty game state works
- [ ] Save/Load with heavily populated game works
- [ ] Switching between building types rapidly works
- [ ] Click-dragging mouse doesn't cause issues

### Recovery
- [ ] Game recovers from errors gracefully
- [ ] Error messages are user-friendly
- [ ] Can continue playing after non-critical error
- [ ] ErrorBoundary catches React errors

---

## 📊 Performance Testing

### FPS Testing
- [ ] Open DevTools → Performance tab
- [ ] Record for 30 seconds during active gameplay
- [ ] Frame rate stays at/near 60 FPS
- [ ] No long tasks (>50ms yellow bars)
- [ ] No frame drops during mouse movement
- [ ] No frame drops during building placement
- [ ] No frame drops during NPC spawning

### Memory Testing
- [ ] Open DevTools → Memory tab
- [ ] Take heap snapshot at start
- [ ] Play for 5 minutes
- [ ] Take another heap snapshot
- [ ] Memory doesn't continuously increase
- [ ] No obvious memory leaks
- [ ] Detached DOM nodes are minimal

### CPU Usage
- [ ] CPU usage reasonable (<50% of one core)
- [ ] No infinite loops
- [ ] Game doesn't slow down other tabs
- [ ] Laptop doesn't overheat during gameplay

### Load Testing
- [ ] Game handles 50+ buildings
- [ ] Game handles 50+ NPCs
- [ ] Game handles 100+ buildings (stress test)
- [ ] Game handles 100+ NPCs (stress test)
- [ ] Performance degrades gracefully under load

---

## 🌐 Browser Compatibility

### Chrome/Edge (Chromium)
- [ ] Game loads successfully
- [ ] All features work
- [ ] Performance is good (60 FPS)
- [ ] No browser-specific errors

### Firefox
- [ ] Game loads successfully
- [ ] All features work
- [ ] Performance is good (60 FPS)
- [ ] No browser-specific errors

### Safari (Mac/iOS)
- [ ] Game loads successfully
- [ ] All features work
- [ ] Performance is acceptable
- [ ] No browser-specific errors

### Mobile Browsers (if supported)
- [ ] Game loads on mobile
- [ ] Touch controls work
- [ ] Performance acceptable on mobile
- [ ] UI adapts to small screen

---

## 🚀 Quick Smoke Test (5 minutes)

Run this sequence to verify core functionality:

1. **Start Fresh**
   - [ ] Clear browser cache
   - [ ] Reload page
   - [ ] Game loads without errors

2. **Spawn NPCs**
   - [ ] Click "Spawn NPC" 3 times
   - [ ] Population shows "3" or "3/X"
   - [ ] 3 red dots appear on canvas

3. **Build Structures**
   - [ ] Click "Build Farm"
   - [ ] Place 2 farms on grid
   - [ ] Click "Build House"
   - [ ] Place 1 house on grid
   - [ ] All buildings stay placed

4. **Save Game**
   - [ ] Click "Save" button
   - [ ] No errors in console
   - [ ] Success message appears

5. **Reload Page**
   - [ ] Press F5 to refresh
   - [ ] Page reloads successfully
   - [ ] Buildings/NPCs not visible yet

6. **Load Game**
   - [ ] Click "Load" button
   - [ ] 2 farms reappear
   - [ ] 1 house reappears
   - [ ] 3 NPCs reappear
   - [ ] Population shows "3"

7. **Run Game**
   - [ ] Click "Play" button
   - [ ] Game runs for 60 seconds
   - [ ] No errors in console
   - [ ] FPS stays at 60

8. **Check Performance**
   - [ ] Open DevTools Performance tab
   - [ ] No red warnings
   - [ ] Frame rate graph shows solid 60 FPS

9. **Final Check**
   - [ ] Console has no red errors
   - [ ] Game is still responsive
   - [ ] All features still working

**If all 9 steps pass → Phase 0 is COMPLETE! ✅**

---

## 📋 Test Results Template

```
Date: _______________
Tester: _______________
Browser: _______________
OS: _______________

Core Game Loop:        ✅ / ⚠️ / ❌
NPC System:            ✅ / ⚠️ / ❌
Building System:       ✅ / ⚠️ / ❌
Mouse Tracking:        ✅ / ⚠️ / ❌
Resource System:       ✅ / ⚠️ / ❌
Save/Load System:      ✅ / ⚠️ / ❌
UI/UX:                 ✅ / ⚠️ / ❌
Known Issues:          ✅ / ⚠️ / ❌
Error Handling:        ✅ / ⚠️ / ❌
Performance:           ✅ / ⚠️ / ❌
Browser Compatibility: ✅ / ⚠️ / ❌

Quick Smoke Test:      ✅ / ❌

Notes:
_________________________________
_________________________________
_________________________________

Blockers:
_________________________________
_________________________________
_________________________________
```

---

## 🎯 Critical Path Items

These MUST pass for Phase 0 completion:

1. ✅ Game runs at 60 FPS
2. ✅ Buildings can be placed and stay visible
3. ✅ NPCs can be spawned and are visible
4. ✅ Population counter updates
5. ✅ Save/Load works correctly
6. ✅ No crashes during normal gameplay
7. ✅ Mouse tracking is accurate
8. ✅ Game can start/stop without issues

If any of these fail, Phase 0 is NOT complete.
