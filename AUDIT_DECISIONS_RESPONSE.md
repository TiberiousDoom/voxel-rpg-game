# Audit Decisions - Detailed Response & Action Plans

**Date:** 2025-11-24
**Status:** Analysis Complete - Awaiting Approval to Proceed

---

## Part 1: Explanations for Unclear Issues

### Issue #5: MeasureSaveSize.js & QuickSizeMeasure.js

**What are these files?**

These are **Node.js measurement scripts** (not used in the browser game):

1. **MeasureSaveSize.js** (158 lines)
   - **Purpose:** Measures save file sizes with realistic game state
   - **Usage:** `node src/utils/MeasureSaveSize.js`
   - **What it does:**
     - Creates actual game instances (small/medium/large/very large)
     - Serializes game state using GameStateSerializer
     - Measures JSON size for different scenarios
     - Provides storage recommendations (localStorage vs IndexedDB)

2. **QuickSizeMeasure.js** (173 lines)
   - **Purpose:** Simpler save size measurement with mock data
   - **Usage:** `node src/utils/QuickSizeMeasure.js`
   - **What it does:**
     - Creates mock game state without dependencies
     - Faster than MeasureSaveSize (doesn't instantiate real modules)
     - Provides storage capacity estimates

**Are they used?**
- Not imported by any browser code
- Only mentioned in documentation
- Utility scripts for development/analysis

**Recommendation:**
These are useful **development tools** but should be moved to a `tools/` or `scripts/` directory rather than `src/utils/` since they're not part of the game code.

**✅ ACTION: Move to /tools/analysis/** (keeps them available for developers)

---

### Issue #13: Component Index Incomplete

**What is this issue?**

The file `src/components/index.js` only exports 8 components:
```javascript
export { default as GameScreen } from './GameScreen';
export { default as GameViewport } from './GameViewport';
export { default as ResourcePanel } from './ResourcePanel';
export { default as NPCPanel } from './NPCPanel';
export { default as BuildMenu } from './BuildMenu';
export { default as GameControlBar } from './GameControlBar';
export { default as TutorialOverlay } from './TutorialOverlay';
export { default as ContextHelpTooltip } from './ContextHelpTooltip';
```

But there are **80+ components** in `src/components/`!

**Why is this a problem?**
- Inconsistent import patterns across the codebase
- Some files import from index.js: `import { GameScreen } from '../components'`
- Most files import directly: `import GameScreen from '../components/GameScreen'`
- The index file serves no real purpose if incomplete

**Options:**

1. **Complete the index** (export all 80+ components)
   - Pros: Single import source, cleaner imports
   - Cons: Maintenance burden, potential circular dependencies

2. **Remove the index entirely** (recommended)
   - Pros: Explicit imports, no maintenance
   - Cons: Need to update 8 existing imports

3. **Keep index for commonly used components only**
   - Current state - works fine

**✅ RECOMMENDATION: Keep as-is** (no action needed - it's not causing issues)

---

### Issue #14: Duplicate/Redundant Notification Components

**Analysis of notification components:**

I found **3 different notification components**:

1. **src/components/notifications/Notification.jsx**
   - **Purpose:** Individual notification item component
   - **Props:** `notification`, `index`, `onDismiss`
   - **Used by:** NotificationSystem
   - **Features:** Auto-dismiss timer, progress bar, types (success/error/warning/info)

2. **src/components/common/Notification.jsx**
   - **Purpose:** Individual notification item component (appears to be a duplicate!)
   - **Props:** Same as above
   - **Used by:** Toast system
   - **Features:** Very similar to #1

3. **src/components/AchievementNotification.jsx**
   - **Purpose:** **Specialized** achievement popup
   - **Props:** `achievements` (array), `onDismiss`
   - **Features:** Displays achievement cards with rewards, different styling

**Are they duplicates?**

- ✅ **AchievementNotification** is NOT a duplicate - it's specialized for achievements
- ❌ **Notification.jsx** appears in TWO locations with similar functionality:
  - `notifications/Notification.jsx`
  - `common/Notification.jsx`

**Verification needed:** Check if these two files have different implementations or are true duplicates.

**✅ ACTION PLAN:**
1. Compare both Notification.jsx files line-by-line
2. If duplicates: Keep one (probably `common/`), delete the other
3. If different: Rename to clarify purpose (e.g., `NotificationItem.jsx` vs `ToastNotification.jsx`)

---

### Issue #21: Modal Z-Index Management

**What is this issue?**

With **10+ modals** in GameScreen, there's a risk of overlapping z-index values causing modals to appear in wrong order.

**Example problem scenario:**
```
BuildModal z-index: 1000
StatsModal z-index: 1000  ← Opens on top of BuildModal
User expects StatsModal on top, but z-index conflict causes issues
```

**What is a "modal stack manager"?**

A system that tracks which modals are open and assigns z-index dynamically:

```javascript
const modalStack = [];  // ['build', 'stats', 'inventory']
const getZIndex = (modalId) => 1000 + modalStack.indexOf(modalId);
```

**Current state:**
- All modals use ModalWrapper component
- ModalWrapper likely has a fixed z-index
- No tracking of open modals

**Is this actually a problem?**

Need to check:
1. Does ModalWrapper already handle z-index properly?
2. Can multiple modals be open simultaneously?
3. Are there reported issues with modal layering?

**✅ ACTION: Inspect ModalWrapper** to see if z-index is already managed

---

## Part 2: Approved Deletions

### Issue #8: Delete Older App Files ✅

**Files to delete:**
```
src/Older App files/App(Oldest).js          (1,126 lines)
src/Older App files/App(old).js              (581 lines)
src/Older App files/App(functional-Craft-Skills.js  (1,538 lines)
```

**Total:** 3,245 lines

**Impact:** ~3% bundle size reduction

---

### Issue #9: Delete Backup Files ✅

**Files to delete:**
```
src/App.js.backup                 (2,003 lines)
src/App(latest-broken).js         (1,750 lines)
```

**Total:** 3,753 lines

**Impact:** ~3-4% bundle size reduction

---

## Part 3: Integration Plans

### Issue #1: EquipmentStatsIntegration.js - Integration Plan

**Current status:** 200 lines, 6 exported functions, **NEVER imported**

**Functions:**
1. `recalculateStatsAfterEquipmentChange(gameStore)`
2. `createEnhancedEquipmentActions(gameStore)`
3. `setupEquipmentStatsWatcher(gameStore)`
4. `compareStatsWithItem(currentEquipment, slot, newItem, character, player)`
5. `formatStatDifference(statName, difference)`
6. `getEquipmentBonusSummary(equipment, character, player)`

**Purpose:** Bridge between equipment system and character stats

**Integration Plan:**

**Step 1: Verify current equipment handling** (1 hour)
- [ ] Check how equipment changes currently update stats
- [ ] Find where equipment is equipped/unequipped
- [ ] Verify if stats recalculate properly

**Step 2: Integrate stat recalculation** (2 hours)
- [ ] Import in equipment system
- [ ] Call `recalculateStatsAfterEquipmentChange()` when equipment changes
- [ ] Test with various equipment types

**Step 3: Add UI enhancements** (2 hours)
- [ ] Use `compareStatsWithItem()` in inventory tooltips
- [ ] Show stat differences when hovering over equipment
- [ ] Use `formatStatDifference()` for red/green stat changes

**Step 4: Add stat watcher** (1 hour)
- [ ] Call `setupEquipmentStatsWatcher()` on game init
- [ ] Test automatic stat updates

**Total estimate:** 6 hours

**Files to modify:**
- `src/systems/EquipmentManager.js` - Add recalculation calls
- `src/components/InventoryUI.jsx` - Add stat comparison tooltips
- `src/stores/useGameStore.js` - Add watcher setup

---

### Issue #2: ObjectPool.js - Integration Plan

**Current status:** 45 lines, used only in backup files

**Purpose:** Memory optimization for frequently created/destroyed objects (projectiles, particles)

**Why use object pooling?**
- Creating/destroying many objects causes garbage collection pauses
- Pooling reuses objects = less GC = better performance
- Especially important for particle effects with 100+ particles

**Integration candidates:**
1. **Spell projectiles** - Created/destroyed frequently
2. **Particle effects** - Hundreds per second
3. **Damage numbers** - Created on every hit
4. **Loot drops** - Created when monsters die

**Integration Plan:**

**Step 1: Integrate with spell projectiles** (2 hours)
```javascript
// In SpellSystem or CombatSystem
import { ObjectPool } from '../utils/ObjectPool';

const projectilePool = new ObjectPool(
  () => ({ position: {x:0,y:0}, velocity: {x:0,y:0}, active: false }),
  (proj, data) => {
    proj.position = data.position;
    proj.velocity = data.velocity;
    proj.active = true;
  },
  50 // Initial pool size
);

// When casting spell:
const projectile = projectilePool.acquire({
  position: {x: player.x, y: player.y},
  velocity: {x: targetX, y: targetY}
});

// When projectile hits:
projectilePool.release(projectile);
```

**Step 2: Integrate with particle system** (2 hours)
- [ ] Add pool to ConstructionEffect.jsx
- [ ] Add pool to spell visual effects
- [ ] Measure performance improvement

**Step 3: Damage numbers pooling** (1 hour)
- [ ] Pool damage number objects in GameViewport
- [ ] Release after animation complete

**Total estimate:** 5 hours

**Expected performance gain:** 10-15% in heavy combat scenarios

---

### Issue #3: SpatialHash.js - Verification & Integration Plan

**Current status:** Used in `useFoundationStore.js` only

**What is SpatialHash?**
A spatial partitioning data structure for fast collision detection:

```
Instead of checking all entities against all entities (O(n²)):
Grid[0,0] = [entity1, entity2]
Grid[1,0] = [entity3]
Grid[1,1] = [entity4, entity5]

Only check entities in same/neighboring cells (O(n))
```

**Verification Step 1: Check current usage**
```bash
grep -r "SpatialHash" src/ --exclude-dir=Older
```

**If used in foundation system:**
- ✅ Keep as-is, it's being used

**If NOT actively used:**
- Integrate for collision detection in:
  1. Monster aggro detection (check nearby monsters)
  2. Building placement (check nearby buildings)
  3. NPC pathfinding (check obstacles)

**Integration Plan (if not used):**

**Step 1: Integrate with MonsterAI** (3 hours)
```javascript
// In MonsterAI.js
import { SpatialHash } from '../utils/SpatialHash';

this.spatialHash = new SpatialHash(cellSize = 10);

// Every frame:
this.spatialHash.clear();
monsters.forEach(m => this.spatialHash.insert(m.position, m));

// Check aggro:
const nearbyMonsters = this.spatialHash.query(player.position, aggroRange);
```

**Step 2: Benchmark performance** (1 hour)
- [ ] Measure before/after with 50+ monsters
- [ ] Verify FPS improvement

**Total estimate:** 4 hours

---

### Issue #6: LootSystemExample.jsx - Move to Documentation

**Action:** Create example documentation from code

**Plan:**

**Step 1: Extract to markdown** (30 min)
```markdown
# Loot System Integration Example

## Overview
This guide shows how to integrate the loot system into your game components.

## 1. Handle Monster Death
[code from LootSystemExample.jsx]

## 2. Update Loot Drops
[code from LootSystemExample.jsx]

## 3. Display Equipment Stats
[code from LootSystemExample.jsx]
```

**Step 2: Move to docs/** (15 min)
- [ ] Create `docs/examples/loot-system-integration.md`
- [ ] Delete `src/examples/LootSystemExample.jsx`

**Total estimate:** 45 minutes

---

### Issue #7: Prototype Directories - Check Implementation Status

**Prototypes found:**
1. `src/prototypes/aura-testing/` (6 files)
2. `src/prototypes/economy-simulator/` (7 files)
3. `src/prototypes/npc-pathfinding/` (6 files)

**Investigation Plan:**

**Step 1: Aura Testing** (30 min)
- [ ] Search for "aura" in active codebase
- [ ] Check if aura system is implemented in building effects
- [ ] If YES: Archive prototype
- [ ] If NO: Propose integration plan

**Step 2: Economy Simulator** (30 min)
- [ ] Check if economy/resource systems match simulator
- [ ] Files: `EconomySimulator.js`, `ProductionSystem.js`, `ConsumptionSystem.js`
- [ ] If implemented: Archive
- [ ] If not: Determine if still needed

**Step 3: NPC Pathfinding** (30 min)
- [ ] Check if NPCs use pathfinding
- [ ] Files: `NPCPathfinder.js`, `NPCMovementSystem.js`
- [ ] If implemented: Archive
- [ ] If not: Integration needed?

**For each prototype:**
```
IF implemented → Move to /archive/prototypes/
IF not implemented & needed → Create integration plan
IF not needed → Delete
```

**Total estimate:** 90 minutes investigation + integration plans

---

### Issue #10 & #11: Structure Exploration System

**Two-part investigation:**

**Part A: Check if backend exists**
```bash
grep -r "getStructureInteractionSystem" src/
grep -r "StructureInteractionSystem" src/
grep -r "structure.*exploration" src/ -i
```

**Part B: Integration plan based on findings**

**Scenario 1: Backend EXISTS**
- **Action:** Wire up StructureExplorationUI component
- **Plan:**
  1. Import in GameScreen.jsx
  2. Add modal state for structure exploration
  3. Connect to terrain system
  4. Test structure discovery flow
- **Estimate:** 3-4 hours

**Scenario 2: Backend DOES NOT EXIST**
- **Action:** Implement structure system from scratch
- **Plan:**
  1. Design structure data model (temples, ruins, dungeons, etc.)
  2. Create StructureInteractionSystem.js
  3. Add to TerrainSystem
  4. Integrate StructureExplorationUI
  5. Add structure generation to terrain
  6. Test discovery mechanics
- **Estimate:** 16-20 hours (full feature implementation)

**I'll investigate this now and provide specific plan...**

---

### Issue #12: Partial Implementations (TODOs)

**Found TODOs:**

1. **src/GameManager.js:6**
   ```javascript
   // TODO: Wire ModeManager after GameEngine creation
   ```

2. **src/components/GameViewport.jsx:554-569**
   ```javascript
   resources: [], // TODO: Add resources when implemented
   // TODO: Open NPC dialog/interaction panel
   // TODO: Implement resource gathering
   // TODO: Open chest inventory panel
   ```

3. **src/components/3d/Enemy.jsx:132**
   ```javascript
   // TODO: Remove enemy after death animation
   ```

4. **src/components/3d/LootDrop.jsx:36,47**
   ```javascript
   // TODO: Call parent to remove
   ```

**Integration Plan:**

**TODO 1: ModeManager Integration** (2 hours)
- [ ] Check if ModeManager is being used elsewhere
- [ ] Uncomment the import
- [ ] Wire up after GameEngine creation
- [ ] Test mode switching

**TODO 2: GameViewport Interactions** (6 hours)
- [ ] Implement resource gathering system
- [ ] Create NPC dialog panel component
- [ ] Create chest inventory UI
- [ ] Wire up click handlers

**TODO 3: Enemy Death Cleanup** (1 hour)
- [ ] Already implemented? Check current code
- [ ] If not: Add removal after fade animation

**TODO 4: LootDrop Removal** (1 hour)
- [ ] Connect to parent removal function
- [ ] Test loot pickup flow

**Total estimate:** 10 hours

---

## Part 4: UI/UX Refactoring Plans

### Issue #16: Consolidate Modal Management

**Current:** 10+ boolean states for modals
**Target:** Single modal router with state machine

**Refactoring Plan:**

**Step 1: Create ModalManager hook** (3 hours)
```javascript
// src/hooks/useModalManager.js
export function useModalManager() {
  const [activeModal, setActiveModal] = useState(null);
  const [modalProps, setModalProps] = useState({});

  const openModal = (modalId, props = {}) => {
    setActiveModal(modalId);
    setModalProps(props);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalProps({});
  };

  return { activeModal, modalProps, openModal, closeModal };
}
```

**Step 2: Refactor GameScreen.jsx** (4 hours)
```javascript
// Instead of:
const [showBuildModal, setShowBuildModal] = useState(false);
const [showStatsModal, setShowStatsModal] = useState(false);
// ... 10 more states

// Use:
const { activeModal, openModal, closeModal } = useModalManager();

// Render:
{activeModal === 'build' && <BuildMenu onClose={closeModal} />}
{activeModal === 'stats' && <StatsTab onClose={closeModal} />}
```

**Step 3: Create modal constants** (1 hour)
```javascript
export const MODALS = {
  BUILD: 'build',
  STATS: 'stats',
  INVENTORY: 'inventory',
  // ... etc
};
```

**Step 4: Test all modal flows** (2 hours)

**Total estimate:** 10 hours

**Benefits:**
- Cleaner code (10 states → 1)
- Easier modal management
- Better modal history tracking
- Simpler z-index management

---

### Issue #17: Single Responsive Component

**Current:** Separate implementations for desktop (sidebars) and mobile (modals)

**Target:** Adaptive components that respond to screen size

**Plan:**

**Step 1: Create ResponsivePanel component** (4 hours)
```javascript
function ResponsivePanel({ children, title, icon }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return <ModalWrapper {...}>{children}</ModalWrapper>;
  }

  return <Sidebar {...}>{children}</Sidebar>;
}
```

**Step 2: Replace duplicated content** (6 hours)
- [ ] Refactor ResourcePanel to use ResponsivePanel
- [ ] Refactor NPCPanel to use ResponsivePanel
- [ ] Refactor BuildMenu to use ResponsivePanel
- [ ] Remove mobile-specific modal code
- [ ] Test on mobile and desktop

**Total estimate:** 10 hours

---

### Issue #18: Complete Menu Redesign

**This is a MAJOR refactoring** that needs careful planning.

**Current problems:**
- Too many nested modals
- Inconsistent navigation
- Important features buried 3-4 clicks deep
- Mobile menu overwhelming

**Proposed new structure:**

**Main HUD (always visible):**
```
┌─────────────────────────────────┐
│ ❤️ 100  🔮 50  ⚡ 75           │  <- Health, Mana, Stamina
│ 💰 Wood: 500  Stone: 300      │  <- Key resources
│ [Build] [Inventory] [Character]│  <- Quick actions
└─────────────────────────────────┘
```

**Primary Navigation (1 click):**
- Build Menu
- Inventory
- Character Sheet
- Crafting
- Map/Minimap

**Secondary Navigation (2 clicks):**
- Stats (from Character Sheet)
- Skills (from Character Sheet)
- Achievements (from Character Sheet)
- NPCs (from Map or separate tab)
- Defense (from Build Menu or separate)

**Design principles:**
1. Most common actions = 1 click
2. Related features grouped together
3. No more than 2-click depth for any feature
4. Mobile: Hamburger menu with same 1-2 click depth

**Implementation plan:**

**Phase 1: Design & Wireframes** (4 hours)
- [ ] Create wireframes for new layout
- [ ] User flow diagrams
- [ ] Get feedback/approval

**Phase 2: Create new components** (16 hours)
- [ ] MainHUD component
- [ ] QuickActionBar component
- [ ] Refactored navigation

**Phase 3: Migrate existing content** (20 hours)
- [ ] Move content to new structure
- [ ] Update all component references
- [ ] Remove old modals

**Phase 4: Testing & Polish** (10 hours)
- [ ] Test all navigation paths
- [ ] Mobile testing
- [ ] UX improvements

**Total estimate:** 50 hours (major refactor)

**Recommendation:** Break into smaller phases, tackle incrementally

---

### Issue #19: Consolidate Stat Displays

**Current locations:**
- CompactHeader (health, mana, resources)
- QuickStats component
- StatsTab (full stats)
- CharacterSystemUI (character sheet)
- ActiveSkillBar (skill cooldowns)

**Proposed consolidation:**

**Tier 1: HUD (always visible)**
- Health, Mana, Stamina bars
- Current level & XP bar
- 3-4 most important resources

**Tier 2: Character Panel (1 click)**
- All character stats
- Equipment stats
- Skill tree

**Tier 3: Detailed Stats (2 clicks from character panel)**
- Full stat breakdown
- Buff/debuff details
- Stat calculations

**Implementation:** (6 hours)
- [ ] Create unified StatDisplay component
- [ ] Remove redundant displays
- [ ] Update HUD with consolidated stats

---

### Issue #20: Single Resource Display

**Current:** Resources shown in multiple places with different formats

**Plan:** (4 hours)
- [ ] Create ResourceDisplay component
- [ ] Show summary in HUD (top 5 resources)
- [ ] Expandable detailed view
- [ ] Remove redundant displays

---

### Issue #23: Building Placement Menu Issue

**Problem:** Build menu blocks viewport, making placement difficult

**Solutions:**

**Option 1: Collapsible menu** (2 hours)
- [ ] Add collapse/expand button to Build Menu
- [ ] Auto-collapse when building selected
- [ ] Show small toolbar with selected building

**Option 2: Side panel** (3 hours)
- [ ] Move Build Menu to sidebar
- [ ] Keeps viewport clear
- [ ] Better UX for placement

**Option 3: Quick build toolbar** (4 hours)
- [ ] Favorites/recent buildings in small toolbar
- [ ] Full menu in modal/sidebar
- [ ] Best of both worlds

**Recommendation:** Option 1 (quickest, least disruptive)

---

### Issue #24: Central Keyboard Shortcut Manager

**Current:** Shortcuts defined in multiple components, potential conflicts

**Plan:**

**Step 1: Create ShortcutManager** (4 hours)
```javascript
// src/managers/ShortcutManager.js
export class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  register(key, callback, description) {
    if (this.shortcuts.has(key)) {
      console.warn(`Shortcut conflict: ${key} already registered`);
    }
    this.shortcuts.set(key, { callback, description });
  }

  unregister(key) {
    this.shortcuts.delete(key);
  }

  handleKeyDown(e) {
    const shortcut = this.shortcuts.get(e.key);
    if (shortcut) {
      e.preventDefault();
      shortcut.callback();
    }
  }
}
```

**Step 2: Migrate existing shortcuts** (6 hours)
- [ ] Find all keyboard event listeners
- [ ] Register with ShortcutManager
- [ ] Remove old listeners

**Step 3: Add shortcut help UI** (2 hours)
- [ ] Display all registered shortcuts
- [ ] Accessible via '?' key

**Total estimate:** 12 hours

---

## Part 5: Entity Definitions Audit (Issue #15)

**Scope:** Verify all monsters, loot, spells are actually used

**Plan:**

**Step 1: Monster Types Audit** (2 hours)
```bash
# Find all defined monster types
grep -r "SLIME\|GOBLIN\|ORC\|SKELETON" src/config/monsters/

# Find where they're spawned
grep -r "spawnMonster\|new Monster" src/
```

**Step 2: Loot Tables Audit** (2 hours)
```bash
# Find all loot definitions
grep -r "lootTable\|dropTable" src/config/loot/

# Find where loot is generated
grep -r "generateLoot\|dropLoot" src/
```

**Step 3: Spell Definitions Audit** (2 hours)
```bash
# Find all spell definitions
grep -r "FIREBALL\|HEAL\|LIGHTNING" src/data/spells.js

# Find where spells are cast
grep -r "castSpell\|useSpell" src/
```

**Step 4: Remove unused definitions** (2 hours)
- [ ] Delete unused monster types
- [ ] Delete unused loot tables
- [ ] Delete unused spell definitions

**Total estimate:** 8 hours

**Output:** Report of used vs unused entities

---

## Part 6: Mobile Testing Routine (Issue #22)

**Comprehensive Mobile Testing Plan:**

**Hardware Testing:**

**Required devices:**
1. iOS device (iPhone/iPad)
2. Android device (phone/tablet)
3. Desktop browser with DevTools mobile emulation

**Test Cases:**

**1. Touch Controls** (30 min per device)
- [ ] Player movement with virtual joystick
- [ ] Building placement with touch
- [ ] Menu navigation
- [ ] Spell casting
- [ ] Pinch to zoom (if applicable)

**2. UI Responsiveness** (20 min per device)
- [ ] All menus fit on screen
- [ ] Text is readable (minimum 14px)
- [ ] Buttons are tappable (minimum 44x44px)
- [ ] No horizontal scrolling
- [ ] Modals don't overflow

**3. Performance** (15 min per device)
- [ ] 30+ FPS during gameplay
- [ ] No lag when opening menus
- [ ] Smooth scrolling in lists
- [ ] Memory usage acceptable

**4. Orientation** (10 min per device)
- [ ] Landscape mode works
- [ ] Portrait mode works
- [ ] Rotation transition smooth

**5. Network** (10 min per device)
- [ ] Game loads on 3G/4G
- [ ] Save/load works offline
- [ ] No excessive data usage

**Automated Testing Tools:**

**BrowserStack/LambdaTest:**
```javascript
// Run automated tests on real devices
npm run test:mobile
```

**Lighthouse Mobile Audit:**
```bash
lighthouse https://your-game.com --preset=mobile --view
```

**Manual Testing Checklist:**

```markdown
## Device: [iPhone 13 / Galaxy S21 / etc]
## OS: [iOS 15 / Android 12 / etc]

### Touch Controls
- [ ] Movement smooth and responsive
- [ ] Double-tap works
- [ ] Long-press works
- [ ] Multi-touch gestures

### UI/UX
- [ ] All text readable without zooming
- [ ] Buttons easily tappable
- [ ] No UI elements cut off
- [ ] Hamburger menu accessible

### Performance
- [ ] FPS: [measured]
- [ ] Load time: [measured]
- [ ] Memory usage: [measured]
- [ ] Battery drain: [acceptable/high]

### Issues Found:
1. [describe issue]
2. [describe issue]
```

**Testing Schedule:**

**Week 1:**
- Day 1-2: iOS testing
- Day 3-4: Android testing
- Day 5: Browser emulation testing

**Week 2:**
- Fix identified issues

**Week 3:**
- Regression testing on all devices

**Total estimate:** 20-25 hours initial testing + fixes

---

## Part 7: Performance Optimization Plans (Issues #28-33)

### Issue #28: Game Loop Profiling

**Plan:**

**Step 1: Add profiling instrumentation** (2 hours)
```javascript
// In GameEngine.js
const profiler = {
  ticks: [],
  frames: []
};

// Measure tick time
const tickStart = performance.now();
this._executeTick();
const tickTime = performance.now() - tickStart;
profiler.ticks.push(tickTime);
```

**Step 2: Profile during gameplay** (1 hour)
- [ ] Play for 10 minutes
- [ ] Record tick times
- [ ] Identify slowest systems

**Step 3: Optimize bottlenecks** (variable based on findings)
- [ ] Optimize slowest game loop sections
- [ ] Target <16ms per frame

---

### Issue #29: Canvas Rendering Optimization

**Plan:**

**Step 1: Implement dirty rectangles** (6 hours)
- [ ] Use existing DirtyRectRenderer
- [ ] Track changed regions
- [ ] Only redraw dirty areas
- [ ] Expected improvement: 50-70% reduction in draw calls

**Step 2: Layer canvases** (4 hours)
- [ ] Static background layer
- [ ] Dynamic entities layer
- [ ] UI layer
- [ ] Only redraw changed layers

**Step 3: Batch rendering** (3 hours)
- [ ] Group similar draw operations
- [ ] Reduce context state changes
- [ ] Use sprite sheets

**Total estimate:** 13 hours

---

### Issue #30: Monster AI Performance

**Plan:**

**Step 1: Spatial partitioning** (4 hours)
- [ ] Use SpatialHash for monster positions
- [ ] Only check nearby monsters for aggro
- [ ] Expected improvement: O(n²) → O(n)

**Step 2: Stagger AI updates** (3 hours)
- [ ] Update 1/3 of monsters per frame
- [ ] Round-robin scheduling
- [ ] 3x reduction in AI cost per frame

**Step 3: Distance-based LOD** (2 hours)
- [ ] Far monsters: simple AI
- [ ] Near monsters: full AI
- [ ] Adjustable based on monster count

**Total estimate:** 9 hours

---

### Issue #31: React Re-render Optimization

**Plan:**

**Step 1: Add React DevTools Profiler** (1 hour)
- [ ] Record gameplay session
- [ ] Identify components with unnecessary re-renders

**Step 2: Add React.memo** (4 hours)
- [ ] Wrap expensive components
- [ ] Priority: NPCPanel, ResourcePanel, BuildMenu

**Step 3: Add useMemo/useCallback** (3 hours)
- [ ] Memoize expensive calculations
- [ ] Memoize event handlers

**Step 4: Split large components** (4 hours)
- [ ] GameScreen is 665 lines - too large
- [ ] Split into smaller components
- [ ] Reduce re-render scope

**Total estimate:** 12 hours

---

### Issue #32: Inline Function Optimization

**Plan:** (3 hours)
- [ ] Find inline functions in render methods
- [ ] Extract to useCallback
- [ ] Test performance improvement

---

### Issue #33: State Management Review

**Current:** Mixed Zustand + Context + Local state

**Plan:**

**Step 1: Document state strategy** (2 hours)
- [ ] When to use Zustand (global game state)
- [ ] When to use Context (React-specific state)
- [ ] When to use local state (component-only)

**Step 2: Audit current usage** (3 hours)
- [ ] Find inconsistencies
- [ ] Consolidate where beneficial

**Step 3: Refactor if needed** (variable)

**Total estimate:** 5+ hours

---

## Summary of Time Estimates

| Category | Est. Hours |
|----------|-----------|
| **Deletions** | 1 |
| **Utility Integrations** | 15 |
| **Prototype Investigation** | 2 |
| **Structure System** | 3-20 |
| **TODO Completions** | 10 |
| **UI/UX Refactors** | 100+ |
| **Entity Audit** | 8 |
| **Mobile Testing** | 25 |
| **Performance** | 45 |
| **Total** | **209-226 hours** |

---

## Recommended Prioritization

### Phase 1: Quick Wins (1 week)
1. ✅ Delete dead code (#8, #9) - 1 hour
2. ✅ Entity audit (#15) - 8 hours
3. ✅ Notification component audit (#14) - 2 hours
4. ✅ Modal z-index check (#21) - 1 hour
5. ✅ Building menu UX (#23) - 2 hours

**Total:** ~14 hours

### Phase 2: Integrations (2 weeks)
1. EquipmentStatsIntegration (#1) - 6 hours
2. ObjectPool for particles (#2) - 5 hours
3. Verify SpatialHash (#3) - 1 hour
4. Structure system check (#11) - 3 hours
5. Complete TODOs (#12) - 10 hours

**Total:** ~25 hours

### Phase 3: Performance (2 weeks)
1. Game loop profiling (#28) - 3 hours
2. Canvas optimization (#29) - 13 hours
3. Monster AI optimization (#30) - 9 hours
4. React optimization (#31) - 12 hours

**Total:** ~37 hours

### Phase 4: UI/UX Refactor (4-6 weeks)
1. Modal consolidation (#16) - 10 hours
2. Responsive components (#17) - 10 hours
3. Stat consolidation (#19, #20) - 10 hours
4. Keyboard shortcuts (#24) - 12 hours
5. Menu redesign (#18) - 50 hours

**Total:** ~92 hours

---

## Ready to Proceed?

I'm ready to execute on any of these plans. Which should I tackle first?

**Recommended starting points:**
1. **Quick deletions** (#8, #9) - Clean up codebase immediately
2. **Entity audit** (#15) - Understand what's actually used
3. **Structure system check** (#11) - Determine integration needs
4. **Performance profiling** (#28) - Identify real bottlenecks

Let me know which direction you'd like to go! 🚀
