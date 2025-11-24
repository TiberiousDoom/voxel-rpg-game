# Merge Conflict Resolution Guide

**Branch**: `claude/character-development-review-01RwdH2am2WAs1Rcu6ysr91v`
**Target**: `main`
**Date**: 2025-11-24

---

## Conflict Summary

When merging this bug-fix branch into `main`, there is **ONE** merge conflict in `src/components/GameScreen.jsx`.

### Conflict Location

**File**: `src/components/GameScreen.jsx` (around line 140)

**Root Cause**: Both branches added a keyboard event handler after the game loop useEffect:
- **Main branch**: Added Clean Mode toggle (backtick key)
- **Bug-fix branch**: Added ESC key handler for building placement cancellation

---

## Resolution Steps

### Option 1: Automatic Resolution (Recommended)

```bash
# Start the merge
git checkout main
git merge claude/character-development-review-01RwdH2am2WAs1Rcu6ysr91v

# Conflict will appear in GameScreen.jsx
# Edit the file to keep BOTH handlers (see below)

# Stage the resolved file
git add src/components/GameScreen.jsx

# Complete the merge
git commit
```

### Option 2: Manual Resolution

Open `src/components/GameScreen.jsx` and find the conflict markers:

```javascript
<<<<<<< HEAD
  // Clean Mode keyboard shortcut (` backtick key)
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Toggle clean mode with backtick key
      if (event.key === '`') {
        setCleanMode(prev => !prev);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
=======
  // ESC key handler to cancel building placement
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        // Cancel building placement if active
        if (selectedBuildingType) {
          setSelectedBuildingType(null);
          setToastMessage('🚫 Building placement cancelled');
          setTimeout(() => setToastMessage(null), 3000);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedBuildingType]);
>>>>>>> claude/character-development-review-01RwdH2am2WAs1Rcu6ysr91v
```

**Replace with** (keep BOTH handlers):

```javascript
  // ESC key handler to cancel building placement
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        // Cancel building placement if active
        if (selectedBuildingType) {
          setSelectedBuildingType(null);
          setToastMessage('🚫 Building placement cancelled');
          setTimeout(() => setToastMessage(null), 3000);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedBuildingType]);

  // Clean Mode keyboard shortcut (` backtick key)
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Toggle clean mode with backtick key
      if (event.key === '`') {
        setCleanMode(prev => !prev);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
```

---

## Why Keep Both Handlers?

Both keyboard handlers serve **different, non-overlapping purposes**:

1. **ESC Handler** (from bug-fix branch):
   - Cancels building placement mode
   - Fixes reported bug where users got stuck in placement mode
   - Only fires when `selectedBuildingType` is active
   - Critical bug fix for gameplay

2. **Clean Mode Handler** (from main branch):
   - Toggles clean mode UI (hides all HUD elements)
   - Existing feature in main branch
   - No conditional logic - always available
   - Enhances user experience

**These handlers don't conflict** - they listen for different keys and serve different purposes.

---

## Verification

After resolving the conflict:

1. **Build the project**:
   ```bash
   npm run build
   ```
   Expected: Compilation succeeds (warnings about source maps are OK)

2. **Test ESC handler**:
   - Start the game
   - Enter building placement mode (select a building)
   - Press ESC
   - Expected: Placement mode cancels, toast appears

3. **Test Clean Mode handler**:
   - Press backtick (`` ` ``) key
   - Expected: All UI panels hide/show

4. **Run tests** (optional):
   ```bash
   npm test
   ```

---

## Other Files Changed

The following files merge **cleanly without conflicts**:

- ✅ `src/components/GameViewport.jsx` - Added `gameManager` prop for real-time NPC positions
- ✅ `src/components/tabs/ExpeditionsTab.jsx` - Fixed Start Expedition button
- ✅ `src/config/monsters/monster-types.json` - Reduced aggro ranges
- ✅ `BUG_FIXES_SUMMARY.md` - New documentation file
- ✅ `BUG_REPORT.md` - New documentation file

---

## Summary of Bug Fixes in This Branch

This branch contains the following bug fixes ready to merge:

1. ✅ **Farm Placement Stuck Mode** - Added ESC key handler
2. ✅ **NPC Movement** - Real-time position fetching (60 FPS)
3. ✅ **Monster Aggro Range** - Reduced by 50%
4. ✅ **Start Expedition Button** - Added missing function call
5. 🔍 **Terrain Tools Rendering** - Investigated (not fixed in this PR)

---

## Commit Message Template

```
Merge bug-fix branch: Resolve runtime issues

Merged claude/character-development-review-01RwdH2am2WAs1Rcu6ysr91v

Bug fixes included:
- Building placement can now be cancelled with ESC key
- NPCs move smoothly to assigned buildings (60 FPS updates)
- Monster aggro ranges reduced for better balance
- Start Expedition button now functional

Conflict resolution:
- GameScreen.jsx: Kept both keyboard handlers (ESC + Clean Mode)
- Both handlers serve different purposes and coexist without issues

Commits included:
- 528cda0 Fix isMobile undefined
- 7c3c81b Fix farm placement stuck mode
- c3fb790 Fix NPC movement rendering
- 511edab Fix monster aggro and expedition button
```

---

## Questions?

If you encounter any issues during the merge:

1. Check that both keyboard handlers are present in the resolved file
2. Verify the build completes successfully
3. Test both ESC and backtick key functionality
4. Review the git diff to ensure no code was accidentally removed

**Tested**: Merge conflict resolution tested successfully on 2025-11-24
**Status**: Ready to merge into main
