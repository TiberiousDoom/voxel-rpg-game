# Modal Z-Index Management Audit (Issue #21)

**Date:** 2025-11-24
**Status:** ⚠️ ISSUES FOUND - Multiple z-index conflicts detected

---

## Executive Summary

**Finding:** Multiple critical UI components share `z-index: 10000`, creating potential overlap conflicts when multiple modals, overlays, or panels are displayed simultaneously.

**Impact:**
- Modals may appear behind other overlays
- Tooltips may be hidden by modals
- Debug tools may be obscured
- Inconsistent stacking behavior across the application

**Risk Level:** Medium - Visual bugs possible, but not game-breaking

---

## Z-Index Hierarchy Analysis

### Current Z-Index Layers

| Layer | Z-Index Range | Usage | Component Count |
|-------|---------------|-------|-----------------|
| **Internal** | 1-10 | BuildingSprite layers, skill trees, internal stacking | ~15 |
| **UI Controls** | 100 | Camera controls, headers, trackers, skill bars | ~8 |
| **Panels** | 1000 | Sidebars, character sheets, tooltips, quest journal | ~12 |
| **High Priority** | 2000-3000 | Settlement UI, stat tooltips, migrations | ~3 |
| **Notifications** | 9999 | Achievements, keyboard hints | ~3 |
| **Critical** | 10000 | **⚠️ CONFLICT ZONE** | **~11 components** |
| **Toast** | 10001 | Toast notifications (correct) | ~1 |

---

## ⚠️ Critical: Z-Index 10000 Conflicts

The following components ALL use `z-index: 10000`, causing potential overlap issues:

### 1. **common/Modal.css** (line 16)
```css
.modal-backdrop {
  z-index: 10000;
}
```
**Type:** Generic modal backdrop (used by KeyboardShortcutsHelp)
**Purpose:** Reusable modal component
**Conflict Risk:** HIGH - Can conflict with any other overlay

---

### 2. **DeathScreen.css** (line 13)
```css
.death-screen {
  z-index: 10000;
}
```
**Type:** Full-screen death overlay
**Purpose:** Player death state
**Conflict Risk:** MEDIUM - Should be exclusive (no other modals when dead)
**Should Be:** Higher than modals (prevents interaction when dead)

---

### 3. **PerformanceMonitor.css** (line 15)
```css
.performance-monitor {
  z-index: 10000;
}
```
**Type:** Debug panel (top-right corner)
**Purpose:** Development/debugging FPS monitor
**Conflict Risk:** LOW - Small panel, but should be above all modals for debugging
**Should Be:** 10500+ (debug tools should always be visible)

---

### 4. **KeyboardShortcutsPanel.css** (line 13)
```css
.keyboard-shortcuts-panel {
  z-index: 10000;
}
```
**Type:** Full-screen keyboard shortcuts overlay
**Purpose:** Display all keyboard shortcuts
**Conflict Risk:** MEDIUM - Another modal using same layer

---

### 5. **NPCPanel.css** (lines 220, 859)
```css
.npc-panel-backdrop {
  z-index: 10000;
}
.npc-assignment-modal {
  z-index: 10000;
}
```
**Type:** NPC management modal
**Purpose:** Assign NPCs to buildings
**Conflict Risk:** HIGH - Modal that can overlap with other modals

---

### 6. **MobileHamburgerMenu.css** (line 10)
```css
.mobile-hamburger-button {
  z-index: 10000;
}
```
**Type:** Mobile navigation button
**Purpose:** Toggle mobile menu
**Conflict Risk:** MEDIUM - Button could be hidden behind modals
**Should Be:** 11000+ (navigation should always be accessible)

---

### 7. **GameScreen.css** (lines 721, 831)
```css
.game-modal-overlay {  /* line 721 */
  z-index: 10000;
}
.game-notification {  /* line 831 */
  z-index: 10000;
}
```
**Type:** Generic game modals and notifications
**Purpose:** Various in-game overlays
**Conflict Risk:** HIGH - Multiple modals in same file using same z-index

---

### 8. **RaidWarning.css** (line 13)
```css
.raid-warning {
  z-index: 10000;
}
```
**Type:** Full-screen raid warning overlay
**Purpose:** Alert player of incoming raid
**Conflict Risk:** MEDIUM - Critical warning, should be above most things
**Should Be:** 10500+ (high-priority game alerts)

---

### 9. **ResourceItem.css** (line 160)
```css
.resource-tooltip-container {
  z-index: 10000;
}
```
**Type:** Tooltip container for resource items
**Purpose:** Show resource details on hover
**Conflict Risk:** HIGH - Tooltips should be ABOVE modals, not at same layer
**Should Be:** 11000+ (tooltips should float above everything)

---

## Z-Index Best Practices Violations

### ❌ Problem 1: No Layering System
**Issue:** All critical overlays use the same z-index (10000)
**Result:** Unpredictable stacking order, depends on DOM order
**Fix:** Establish clear z-index layers with gaps for future additions

### ❌ Problem 2: No Modal Stacking
**Issue:** No system to handle multiple modals open simultaneously
**Result:** Second modal renders at same z-index as first
**Fix:** Implement modal stack tracking with incremental z-index

### ❌ Problem 3: Tooltips at Wrong Layer
**Issue:** Tooltips at 10000, same as modals
**Result:** Tooltips hidden behind modals (unusable when modal open)
**Fix:** Move tooltips to 11000+ layer

### ❌ Problem 4: Debug Tools Not Always Visible
**Issue:** PerformanceMonitor at 10000
**Result:** Can be hidden by modals during debugging
**Fix:** Move debug tools to 12000+ layer

### ❌ Problem 5: Mobile Navigation Obscured
**Issue:** Hamburger menu button at 10000
**Result:** Can be hidden by full-screen modals, trapping user
**Fix:** Move navigation controls to 11000+ layer

---

## Recommended Z-Index Hierarchy

Create a centralized z-index system using CSS variables:

```css
/* src/styles/z-index-layers.css */
:root {
  /* Internal component layers (0-99) */
  --z-buildingsprite: 1;
  --z-internal-high: 10;

  /* UI controls (100-999) */
  --z-ui-controls: 100;
  --z-camera-controls: 100;
  --z-skill-bar: 100;

  /* Panels and sidebars (1000-1999) */
  --z-panels: 1000;
  --z-minimap: 1000;
  --z-character-sheet: 1000;
  --z-quest-journal: 1000;

  /* High-priority UI (2000-2999) */
  --z-settlement-ui: 2000;
  --z-stat-tooltip: 2500;

  /* Notifications (3000-3999) */
  --z-migration-notification: 3000;
  --z-achievement: 3500;

  /* Modals and overlays (10000-10999) */
  --z-modal-backdrop: 10000;
  --z-modal-content: 10001;
  --z-modal-stack-1: 10100;
  --z-modal-stack-2: 10200;
  --z-modal-stack-3: 10300;

  /* Critical game overlays (10500-10599) */
  --z-death-screen: 10500;
  --z-raid-warning: 10550;
  --z-keyboard-shortcuts: 10600;

  /* Tooltips (11000-11999) */
  --z-tooltip: 11000;
  --z-tooltip-resource: 11100;

  /* Navigation (11500-11599) */
  --z-mobile-menu: 11500;
  --z-mobile-hamburger: 11550;

  /* Debug tools (12000+) */
  --z-performance-monitor: 12000;
  --z-debug-overlay: 12100;

  /* Toast notifications (highest, 15000+) */
  --z-toast: 15000;
}
```

---

## Recommended Changes

### Priority 1: Critical Fixes (High Risk)

#### 1. Move Tooltips Above Modals
**Files:** `src/components/resource/ResourceItem.css`

```css
/* BEFORE */
.resource-tooltip-container {
  z-index: 10000;  /* ❌ Same as modals */
}

/* AFTER */
.resource-tooltip-container {
  z-index: 11100;  /* ✅ Above all modals */
}
```

**Also check:**
- `src/components/ui/StatTooltip.css` (currently 2500, move to 11000)
- `src/components/resource/ResourceTooltip.css` (currently 1000, move to 11000)

---

#### 2. Move Debug Tools to Top Layer
**Files:** `src/debug/PerformanceMonitor.css`

```css
/* BEFORE */
.performance-monitor {
  z-index: 10000;  /* ❌ Can be hidden by modals */
}

/* AFTER */
.performance-monitor {
  z-index: 12000;  /* ✅ Always visible for debugging */
}
```

---

#### 3. Elevate Mobile Navigation
**Files:** `src/components/MobileHamburgerMenu.css`

```css
/* BEFORE */
.mobile-hamburger-button {
  z-index: 10000;  /* ❌ Can be hidden by modals */
}

/* AFTER */
.mobile-hamburger-button {
  z-index: 11550;  /* ✅ Above modals, always accessible */
}
```

---

### Priority 2: Game Overlays (Medium Risk)

#### 4. Elevate Critical Game Overlays
These should be above standard modals but below debug tools:

**DeathScreen.css:**
```css
.death-screen {
  z-index: 10500;  /* Above modals, prevents interaction */
}
```

**RaidWarning.css:**
```css
.raid-warning {
  z-index: 10550;  /* Above modals, critical alert */
}
```

---

### Priority 3: Modal Stack System (Long-term)

#### 5. Implement Modal Stack Tracking

Create `src/hooks/useModalStack.js`:

```javascript
import { useState, useCallback, useRef } from 'react';

let globalModalStack = [];
let currentBaseZIndex = 10000;

export function useModalStack() {
  const modalIdRef = useRef(null);
  const [zIndex, setZIndex] = useState(null);

  const registerModal = useCallback(() => {
    const id = Date.now() + Math.random();
    modalIdRef.current = id;

    globalModalStack.push(id);
    const stackIndex = globalModalStack.length - 1;
    const newZIndex = currentBaseZIndex + (stackIndex * 100);

    setZIndex(newZIndex);
    return newZIndex;
  }, []);

  const unregisterModal = useCallback(() => {
    if (modalIdRef.current) {
      const index = globalModalStack.indexOf(modalIdRef.current);
      if (index > -1) {
        globalModalStack.splice(index, 1);
      }
      modalIdRef.current = null;
      setZIndex(null);
    }
  }, []);

  return { registerModal, unregisterModal, zIndex };
}
```

**Update Modal.jsx to use stack:**
```javascript
import { useModalStack } from '../hooks/useModalStack';

function Modal({ isOpen, ... }) {
  const { registerModal, unregisterModal, zIndex } = useModalStack();

  useEffect(() => {
    if (isOpen) {
      registerModal();
      return unregisterModal;
    }
  }, [isOpen, registerModal, unregisterModal]);

  // Apply zIndex to backdrop
  const backdropStyle = zIndex ? { zIndex } : {};

  return createPortal(
    <div className="modal-backdrop" style={backdropStyle}>
      ...
    </div>,
    document.body
  );
}
```

---

## Migration Path

### Phase 1: Quick Fixes (1-2 hours)
1. ✅ Create `src/styles/z-index-layers.css` with CSS variables
2. ✅ Update tooltips to z-index 11000+
3. ✅ Update debug tools to z-index 12000+
4. ✅ Update mobile navigation to z-index 11500+

### Phase 2: Critical Overlays (1 hour)
5. ✅ Update DeathScreen to 10500
6. ✅ Update RaidWarning to 10550
7. ✅ Update KeyboardShortcutsPanel to 10600

### Phase 3: Modal Stack System (3-4 hours)
8. ✅ Implement `useModalStack` hook
9. ✅ Update common/Modal.jsx to use stack
10. ✅ Test multiple modals open simultaneously
11. ✅ Update all other modal components to use stack

### Phase 4: Testing (1 hour)
12. ✅ Test all modal combinations
13. ✅ Test mobile menu with modals open
14. ✅ Test tooltips with modals open
15. ✅ Test debug tools with modals open

**Total Time Estimate:** 6-8 hours

---

## Testing Scenarios

### Test Case 1: Multiple Modals
```
1. Open KeyboardShortcutsPanel (z-index: 10000)
2. Trigger a modal from GameScreen (z-index: 10000)
3. Expected: Second modal should appear above first
4. Current: Both at same layer, order depends on DOM
```

### Test Case 2: Tooltip Over Modal
```
1. Open any modal (z-index: 10000)
2. Hover over resource item (tooltip: z-index: 10000)
3. Expected: Tooltip appears above modal
4. Current: Tooltip hidden behind modal
```

### Test Case 3: Debug During Modal
```
1. Open PerformanceMonitor (z-index: 10000)
2. Open any modal (z-index: 10000)
3. Expected: PerformanceMonitor always visible
4. Current: May be hidden depending on DOM order
```

### Test Case 4: Mobile Navigation Escape
```
1. On mobile, open full-screen modal (z-index: 10000)
2. Try to access hamburger menu (z-index: 10000)
3. Expected: Menu button visible and clickable
4. Current: May be hidden behind modal (user trapped)
```

### Test Case 5: Death Screen Precedence
```
1. Player dies while modal is open
2. Expected: DeathScreen covers everything (prevents interaction)
3. Current: Same z-index as modal, unpredictable order
```

---

## Files Requiring Updates

### High Priority (Must Fix)
- ✅ `src/components/resource/ResourceItem.css` → z-index: 11100
- ✅ `src/components/ui/StatTooltip.css` → z-index: 11000
- ✅ `src/debug/PerformanceMonitor.css` → z-index: 12000
- ✅ `src/components/MobileHamburgerMenu.css` → z-index: 11550

### Medium Priority (Should Fix)
- ✅ `src/components/DeathScreen.css` → z-index: 10500
- ✅ `src/components/modes/defense/RaidWarning.css` → z-index: 10550
- ✅ `src/components/KeyboardShortcutsPanel.css` → z-index: 10600

### Low Priority (Nice to Have)
- ✅ `src/components/common/Modal.css` → implement modal stack system
- ✅ `src/components/NPCPanel.css` → use modal stack
- ✅ `src/components/GameScreen.css` → use modal stack

### Create New Files
- ✅ `src/styles/z-index-layers.css` → centralized z-index variables
- ✅ `src/hooks/useModalStack.js` → modal stacking logic

---

## Risk Assessment

### If Not Fixed

| Issue | Risk | User Impact |
|-------|------|-------------|
| Tooltips hidden | **High** | Users can't see resource info when modals open |
| Debug tools hidden | **Medium** | Developers can't debug modal issues |
| Mobile menu trapped | **High** | Mobile users can't close modals, trapped in UI |
| Multiple modals overlap | **Low** | Rare, but confusing when it happens |
| Death screen conflicts | **Low** | Death screen usually exclusive |

### If Fixed

✅ Predictable UI layering
✅ Tooltips always visible
✅ Debug tools always accessible
✅ Mobile users never trapped
✅ Multiple modals stack properly
✅ Foundation for future UI features

---

## Conclusion

**Status:** ⚠️ ISSUES FOUND

**Summary:**
- 11 components share z-index 10000, causing conflicts
- Tooltips can be hidden by modals (user-facing bug)
- Mobile navigation can be obscured (critical UX bug)
- Debug tools can be hidden (developer experience issue)
- No modal stacking system exists

**Recommendation:**
**Proceed with Phase 1-2 fixes (3-4 hours)** to resolve critical tooltip, navigation, and debug tool issues. Phase 3 (modal stack system) can be deferred if needed.

**Priority:** Medium-High
**Effort:** 3-8 hours depending on scope
**Impact:** Improves UX, prevents user frustration, enables future features

---

**Audit Completed By:** Claude Code
**Date:** 2025-11-24
**Issue:** #21 - Check modal z-index management
**Result:** Multiple conflicts found - Fixes recommended
