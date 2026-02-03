# Tutorial System - Phase 3D

Player onboarding and guidance system for Voxel RPG.

## Overview

The Tutorial System provides comprehensive player onboarding through:
- **Tutorial Flow**: 12-step guided tutorial for new players
- **Context Help**: 34+ context-sensitive help tips
- **Feature Unlock**: Progressive feature disclosure to prevent overwhelm

## Components

### TutorialSystem
Main orchestrator for the tutorial experience.

```javascript
import TutorialSystem from './tutorial-system/TutorialSystem.js';

const tutorialSystem = new TutorialSystem();

// Start tutorial
tutorialSystem.start();

// Update each game tick
tutorialSystem.update(gameState);

// Notify of player actions
tutorialSystem.notifyAction('buildingPlaced', { type: 'campfire' });

// Get current state for UI
const state = tutorialSystem.getState();
```

### TutorialFlowManager
Manages step progression through the tutorial.

```javascript
import TutorialFlowManager from './tutorial-system/TutorialFlowManager.js';

const flowManager = new TutorialFlowManager(steps);

// Start flow
flowManager.start();

// Advance to next step
flowManager.nextStep();

// Check step completion
flowManager.checkStepCompletion(gameState);
```

### TutorialStep
Defines individual tutorial steps.

```javascript
import TutorialStep from './tutorial-system/TutorialStep.js';

const step = new TutorialStep({
  id: 'place-building',
  title: 'Place Your First Building',
  message: 'Click CAMPFIRE, then click the grid',
  highlightElement: '.build-button-campfire',
  blockInput: true,
  completionCondition: {
    type: 'building_placed',
    target: 'campfire'
  }
});
```

### ContextHelp
Provides context-sensitive help based on game state.

```javascript
import ContextHelp from './tutorial-system/ContextHelp.js';
import { getContextHelpDefinitions } from './tutorial-system/contextHelpDefinitions.js';

const contextHelp = new ContextHelp(getContextHelpDefinitions());

// Check for triggered tips
const triggeredTips = contextHelp.checkTriggers(gameState);

// Listen for tips
contextHelp.onTipTriggered((tip) => {
  console.log(`Tip: ${tip.title} - ${tip.message}`);
});
```

### FeatureUnlock
Progressive feature unlocking system.

```javascript
import FeatureUnlock from './tutorial-system/FeatureUnlock.js';

const featureUnlock = new FeatureUnlock();

// Check unlocks based on game state
const newlyUnlocked = featureUnlock.checkUnlocks(gameState);

// Check if feature is unlocked
if (featureUnlock.isFeatureUnlocked('building-farm')) {
  // Show farm in build menu
}
```

## Tutorial Steps

The tutorial includes 12 steps:

1. **Welcome** - Introduction to the game
2. **Place Building** - Place first campfire
3. **Resources** - Understand resource production
4. **Build Farm** - Place a farm for food
5. **Spawn NPC** - Create first citizen
6. **Assign NPC** - Assign NPC to farm
7. **Food Production** - Understanding consumption
8. **Build House** - Place housing for NPCs
9. **Territory** - Understanding territory boundaries
10. **Expand Territory** - Grow settlement area
11. **Tier Progression** - Learn about tier gates
12. **Tutorial Complete** - Finish tutorial

## Context Help Tips

34+ context-sensitive help tips organized by category:

- **Building & Territory** (8 tips)
- **Resource Management** (7 tips)
- **NPC Management** (7 tips)
- **Events & Disasters** (5 tips)
- **Achievements & Progression** (5 tips)
- **General Gameplay** (3 tips)

## Feature Unlock Flow

Progressive unlock stages:

1. **Tutorial Start**: Only campfire visible
2. **Tutorial Progress**: Farm, NPC spawn, house unlock
3. **Tutorial Complete**: All SURVIVAL tier buildings
4. **PERMANENT Tier**: Advanced build options
5. **TOWN Tier**: NPC management panel
6. **CASTLE Tier**: All features unlocked

## Integration

### With ModuleOrchestrator

```javascript
// In ModuleOrchestrator.js
import TutorialSystem from './tutorial-system/TutorialSystem.js';
import ContextHelp from './tutorial-system/ContextHelp.js';
import FeatureUnlock from './tutorial-system/FeatureUnlock.js';
import { getContextHelpDefinitions } from './tutorial-system/contextHelpDefinitions.js';

// Initialize
this.tutorialSystem = new TutorialSystem(this);
this.contextHelp = new ContextHelp(getContextHelpDefinitions());
this.featureUnlock = new FeatureUnlock();

// In game tick
executeTick(tickCount) {
  // Update tutorial
  if (this.tutorialSystem.isActive) {
    this.tutorialSystem.update(gameState);
  }

  // Check context help
  const triggeredTips = this.contextHelp.checkTriggers(gameState);

  // Check feature unlocks
  const newlyUnlocked = this.featureUnlock.checkUnlocks(gameState);
}
```

### With Save/Load System

```javascript
// Save
const saveData = {
  tutorial: this.tutorialSystem.serialize(),
  contextHelp: this.contextHelp.serialize(),
  featureUnlock: this.featureUnlock.serialize()
};

// Load
this.tutorialSystem.deserialize(saveData.tutorial);
this.contextHelp.deserialize(saveData.contextHelp);
this.featureUnlock.deserialize(saveData.featureUnlock);
```

### With UI Components

```javascript
// React component example
import { TutorialSystem } from './modules/tutorial-system';

function TutorialOverlay() {
  const [tutorialState, setTutorialState] = useState(null);

  useEffect(() => {
    tutorialSystem.onUIUpdate((state) => {
      setTutorialState(state);
    });
  }, []);

  if (!tutorialState?.isActive) return null;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-message">
        <h3>{tutorialState.currentStep.title}</h3>
        <p>{tutorialState.currentStep.message}</p>
        <div className="progress">
          Step {tutorialState.stepNumber} of {tutorialState.totalSteps}
        </div>
      </div>
    </div>
  );
}
```

## Testing

Run tests:

```bash
npm test -- --testPathPattern="tutorial-system"
```

All components have comprehensive unit tests with 70%+ coverage.

## Configuration

### Disable Tutorial
```javascript
tutorialSystem.disable();
```

### Skip Tutorial
```javascript
tutorialSystem.skipTutorial();
```

### Disable Feature Unlock
```javascript
featureUnlock.disable(); // Unlocks all features
```

### Disable Context Help
```javascript
contextHelp.disable();
```

## Events

All components emit events for UI integration:

```javascript
// Tutorial events
tutorialSystem.onUIUpdate((state) => { /* ... */ });

// Context help events
contextHelp.onTipTriggered((tip) => { /* ... */ });

// Feature unlock events
featureUnlock.onFeatureUnlock((feature) => { /* ... */ });
```

## Performance

- Tutorial system: Negligible impact (only active during tutorial)
- Context help: < 1ms per game tick
- Feature unlock: < 1ms per check
- Total impact: < 1 FPS on low-end devices

## Files

```
src/modules/tutorial-system/
├── TutorialSystem.js (280 lines)
├── TutorialStep.js (90 lines)
├── TutorialFlowManager.js (200 lines)
├── tutorialSteps.js (300 lines)
├── ContextHelp.js (180 lines)
├── contextHelpDefinitions.js (400 lines)
├── FeatureUnlock.js (150 lines)
├── index.js
├── README.md
└── __tests__/
    ├── TutorialSystem.test.js (150 lines)
    ├── ContextHelp.test.js (100 lines)
    └── FeatureUnlock.test.js (80 lines)
```

**Total:** ~1,930 lines of code + 330 lines of tests

## Success Criteria ✅

- [x] Tutorial guides players through 12 steps
- [x] Context help provides 34+ tips
- [x] Progressive unlock prevents UI overwhelm
- [x] All systems save/load correctly
- [x] Comprehensive unit tests
- [x] Clean integration with game systems

## Future Enhancements

- Video tutorial integration
- Multi-language support for tutorials
- Adaptive tutorial difficulty
- Tutorial analytics tracking
- Custom tutorial creation tools
