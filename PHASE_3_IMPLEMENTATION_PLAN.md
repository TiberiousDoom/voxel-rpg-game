# Phase 3 Implementation Plan - Advanced Features

**Created:** 2025-11-12
**Status:** Planning Phase
**Prerequisites:** Phase 1 & 2 Complete ✅
**Target Duration:** 10-12 days (2 weeks)

---

## Executive Summary

Phase 3 introduces advanced gameplay features that enhance player engagement and game depth. This phase builds on the solid foundation established in Phases 1-2, adding NPC intelligence, dynamic events, player progression tracking, and onboarding.

### Phase 3 Components

1. **P3A: NPC Advanced Behaviors** (4 days) - Intelligent NPC actions and needs
2. **P3B: Event System** (3 days) - Dynamic world events and challenges
3. **P3C: Achievement System** (2 days) - Player progression and rewards
4. **P3D: Tutorial System** (3 days) - Player onboarding and guidance

**Total Estimated Time:** 12 days

---

## Current State Assessment

### What We Have (Phase 1 & 2 Complete)

✅ **Core Systems:**
- GridManager with real implementation
- BuildingConfig with all building types
- TierProgression with tier gates
- TerritoryManager with expansion
- NPCManager with full NPC lifecycle
- ConsumptionSystem with food tracking
- StorageManager with capacity management
- Save/Load system functional

✅ **Validated Prototypes:**
- NPC pathfinding: 100 NPCs @ 3,997 FPS (Phase 2 results)
- Economy simulation: Balanced production/consumption (Phase 3 results)
- Spatial partitioning: Efficient queries

✅ **Game Mechanics:**
- Building placement with validation
- Resource production and consumption
- Tier advancement (SURVIVAL → PERMANENT → TOWN → CASTLE)
- Territory expansion
- NPC spawning and assignment

### What We Need (Phase 3 Scope)

❌ **Advanced NPC Behaviors:**
- Idle task system (wander, socialize, rest)
- NPC needs beyond food (rest, social, shelter)
- Autonomous decision-making

❌ **Dynamic Events:**
- Random event system
- Natural disasters (fire, flood, earthquake)
- Seasonal events (harvest festival, winter freeze)

❌ **Progression Tracking:**
- Achievement definitions and tracking
- Milestone detection
- Reward system

❌ **Player Guidance:**
- Tutorial flow system
- Context-sensitive help
- Progressive feature unlocking

---

## P3A: NPC Advanced Behaviors

**Goal:** Make NPCs feel alive and autonomous with intelligent behaviors and needs beyond basic work/food.

**Duration:** 4 days
**Priority:** HIGH (foundation for future AI features)

### Architecture Overview

```
NPCBehaviorSystem (orchestrator)
├── IdleTaskManager (assigns idle activities)
├── NPCNeedsTracker (tracks rest, social, shelter)
├── AutonomousDecision (AI decision-making)
└── NPCActivityLogger (debug/stats)
```

### Tasks Breakdown

#### Task 3A.1: Idle Task System (1.5 days)

**Goal:** NPCs perform meaningful activities when not working

**Implementation:**
- [ ] Create `IdleTaskManager.js` class
  - Priority queue of idle tasks (rest > social > wander)
  - Task duration tracking (5-30 seconds per task)
  - Task completion and rewards (slight happiness boost)

- [ ] Define idle task types:
  - **WANDER**: Random movement within territory (5-15 seconds)
  - **SOCIALIZE**: Find nearby NPC and interact (10-20 seconds, +1 happiness)
  - **REST**: Stand still and recover fatigue (15-30 seconds, -10 fatigue)
  - **INSPECT**: Move to building and "inspect" it (5-10 seconds)

- [ ] Integrate with NPCManager:
  - When NPC unassigned from building → assign idle task
  - When NPC completes idle task → assign new idle task
  - When NPC assigned to building → cancel idle task

**Success Criteria:**
- [ ] Idle NPCs are always doing something (never just standing)
- [ ] Smooth transitions between idle tasks
- [ ] NPCs prefer high-priority tasks (rest when fatigued)
- [ ] No performance degradation with 100 NPCs doing idle tasks

**Files to Create:**
```
src/modules/npc-system/
├── IdleTaskManager.js       (200 lines)
├── IdleTask.js              (50 lines, task definition)
└── __tests__/
    └── IdleTaskManager.test.js (100 lines)
```

**Estimate:** 1.5 days
**Dependencies:** NPCManager (exists), NPCPathfinder (exists)
**Risk:** Medium - Task prioritization logic could be complex

---

#### Task 3A.2: NPC Needs System (1.5 days)

**Goal:** NPCs have needs beyond food (rest, social interaction, shelter)

**Implementation:**
- [ ] Create `NPCNeedsTracker.js` class
  - Track 4 need types: Food, Rest, Social, Shelter
  - Each need has value 0-100 (100 = fully satisfied)
  - Needs decay over time (different rates per need)

- [ ] Need definitions:
  - **Food**: Decreases 0.5/min (existing consumption system)
  - **Rest**: Decreases 1/min while working, recovers 2/min while resting
  - **Social**: Decreases 0.2/min, recovers 5 per social interaction
  - **Shelter**: Decreases 0.1/min outside territory, constant inside territory

- [ ] Need satisfaction logic:
  - If Food < 20: NPC seeks food (existing system)
  - If Rest < 30: NPC assigns IDLE_REST task (high priority)
  - If Social < 40: NPC assigns IDLE_SOCIALIZE task (medium priority)
  - If Shelter < 50: NPC moves toward nearest house/building

- [ ] Happiness impact:
  - All needs > 60: +5 happiness/hour
  - Any need < 40: -3 happiness/hour per low need
  - Any need < 20: -10 happiness/hour (critical)

**Success Criteria:**
- [ ] All 4 needs tracked independently per NPC
- [ ] Needs decay at correct rates
- [ ] NPCs autonomously satisfy needs (rest when tired, socialize when lonely)
- [ ] Happiness properly reflects need satisfaction
- [ ] No crashes with 100 NPCs tracking needs

**Files to Create:**
```
src/modules/npc-system/
├── NPCNeedsTracker.js       (250 lines)
├── NPCNeed.js               (80 lines, need definition)
└── __tests__/
    └── NPCNeedsTracker.test.js (120 lines)
```

**Estimate:** 1.5 days
**Dependencies:** NPCManager, ConsumptionSystem, IdleTaskManager
**Risk:** Medium - Need balancing may require iteration

---

#### Task 3A.3: Autonomous Decision System (1 day)

**Goal:** NPCs make intelligent decisions based on current state and needs

**Implementation:**
- [ ] Create `AutonomousDecision.js` utility
  - Decision tree evaluator
  - Priority-based action selection
  - Interrupt handling (critical needs override current task)

- [ ] Decision tree structure:
  ```
  Critical Needs (interrupt current task):
  ├── Food < 10 → Seek food immediately
  ├── Rest < 10 → Rest immediately
  └── Health < 20 → Seek shelter/healing

  Normal Needs (when idle):
  ├── Any need < 30 → Satisfy lowest need first
  ├── No critical needs → Accept work assignment
  └── All needs satisfied → Perform random idle task
  ```

- [ ] Integration points:
  - NPCManager calls `decideAction(npc)` every tick
  - Returns action: WORK, IDLE_TASK, SATISFY_NEED, EMERGENCY
  - ModuleOrchestrator respects NPC decisions (can't force exhausted NPC to work)

**Success Criteria:**
- [ ] NPCs prioritize critical needs over work
- [ ] NPCs balance work and rest automatically
- [ ] Decision system performs well (< 1ms per 100 NPCs)
- [ ] No NPCs stuck in indecision loops

**Files to Create:**
```
src/modules/npc-system/
├── AutonomousDecision.js    (180 lines)
└── __tests__/
    └── AutonomousDecision.test.js (100 lines)
```

**Estimate:** 1 day
**Dependencies:** NPCNeedsTracker, IdleTaskManager
**Risk:** Low - Decision tree is straightforward logic

---

### P3A Summary

**Total Time:** 4 days
**Total Lines of Code:** ~1,180 lines (code) + ~320 lines (tests)
**Integration Points:** NPCManager, ModuleOrchestrator, ConsumptionSystem

**Go/No-Go Criteria:**
- ✅ All 4 tasks complete and tested
- ✅ 100 NPCs with full behavior system run at 60 FPS
- ✅ NPCs visibly perform different activities
- ✅ Needs system balanced (NPCs survive without micromanagement)

**Risk Mitigation:**
- Test with 10 NPCs first, then scale to 100
- Profile decision-making performance early
- Create visual debug overlay to observe NPC behavior

---

## P3B: Event System

**Goal:** Add dynamic, unpredictable events that challenge players and keep gameplay fresh.

**Duration:** 3 days
**Priority:** MEDIUM (adds replay value and challenge)

### Architecture Overview

```
EventSystem (orchestrator)
├── EventScheduler (decides when events trigger)
├── EventLibrary (event definitions)
├── EventExecutor (applies event effects)
└── EventLogger (history and notifications)
```

### Tasks Breakdown

#### Task 3B.1: Event Framework (1 day)

**Goal:** Create reusable event system architecture

**Implementation:**
- [ ] Create `EventSystem.js` core class
  - Event queue (upcoming events)
  - Active event tracking (currently happening)
  - Event history (past events)
  - Event notification system (UI integration)

- [ ] Create `Event.js` base class:
  ```javascript
  class Event {
    id: string             // Unique ID
    name: string           // Display name
    description: string    // What's happening
    type: enum             // RANDOM, SEASONAL, DISASTER, POSITIVE
    duration: number       // How long it lasts (seconds)
    probability: number    // Chance to trigger per hour (0-1)
    effects: {             // What it does
      resources: {},       // Resource changes
      buildings: {},       // Building effects
      npcs: {},           // NPC effects
      morale: number      // Morale change
    }
    onStart: function()    // Event begins
    onTick: function()     // Every 5 seconds during event
    onEnd: function()      // Event concludes
  }
  ```

- [ ] Create `EventScheduler.js`:
  - Roll for events every in-game hour (720 ticks)
  - Check event probability and conditions
  - Trigger events that pass roll
  - Prevent simultaneous conflicting events

**Success Criteria:**
- [ ] Events can be queued, triggered, and resolved
- [ ] Event system runs independently of game tick
- [ ] Multiple events can be active simultaneously (if compatible)
- [ ] Event history preserved for statistics

**Files to Create:**
```
src/modules/event-system/
├── EventSystem.js           (220 lines)
├── Event.js                 (100 lines)
├── EventScheduler.js        (150 lines)
└── __tests__/
    └── EventSystem.test.js  (120 lines)
```

**Estimate:** 1 day
**Dependencies:** ModuleOrchestrator (for applying effects)
**Risk:** Low - Event system is modular and isolated

---

#### Task 3B.2: Natural Disaster Events (1 day)

**Goal:** Implement 3 disaster types that challenge resource management

**Implementation:**
- [ ] **WILDFIRE Event** (probability: 2% per hour)
  - Effect: Destroys random building (10% chance per wooden building)
  - Duration: 30 seconds
  - Mitigation: Stone buildings immune, watchtowers reduce chance by 50%
  - Impact: -20 morale, lose building resources

- [ ] **FLOOD Event** (probability: 1% per hour)
  - Effect: Damages all buildings in lowland areas (< 10 elevation)
  - Duration: 60 seconds
  - Mitigation: Territory on hills safe, farms take 50% damage
  - Impact: -30 food (spoilage), -15 morale

- [ ] **EARTHQUAKE Event** (probability: 0.5% per hour)
  - Effect: All buildings take 20-50 damage
  - Duration: Instant (one-time damage)
  - Mitigation: Castle tier buildings take 50% less damage
  - Impact: -40 morale, possible building destruction

- [ ] Create disaster notification system:
  - Warning message 10 seconds before event
  - Event progress indicator during event
  - Summary of damage after event

**Success Criteria:**
- [ ] All 3 disaster types functional
- [ ] Disasters happen at correct probability (can force trigger for testing)
- [ ] Building damage calculated correctly
- [ ] Players receive clear notifications
- [ ] Game recoverable after disaster (not instant death)

**Files to Create:**
```
src/modules/event-system/events/
├── WildfireEvent.js         (120 lines)
├── FloodEvent.js            (130 lines)
├── EarthquakeEvent.js       (110 lines)
└── __tests__/
    ├── WildfireEvent.test.js  (80 lines)
    ├── FloodEvent.test.js     (80 lines)
    └── EarthquakeEvent.test.js (80 lines)
```

**Estimate:** 1 day
**Dependencies:** EventSystem, GridManager (building damage)
**Risk:** Medium - Disaster balance critical (too harsh = unfun)

---

#### Task 3B.3: Seasonal & Positive Events (1 day)

**Goal:** Implement positive and seasonal events for variety

**Implementation:**
- [ ] **Seasonal Events:**
  - **HARVEST_FESTIVAL** (every 720 ticks = 1 hour)
    - Effect: +50% food production for 60 seconds
    - Impact: +20 morale, NPCs idle during festival

  - **WINTER_FREEZE** (every 2 hours)
    - Effect: -30% all production for 120 seconds
    - Impact: -10 morale, +0.2 food consumption (cold weather)

  - **SPRING_BLOOM** (every 3 hours)
    - Effect: +20% farm production for 180 seconds
    - Impact: +10 morale

- [ ] **Random Positive Events:**
  - **MERCHANT_VISIT** (5% per hour)
    - Effect: Trade resources (exchange wood for gold 1:2 ratio)
    - Duration: 60 seconds
    - Impact: +15 morale, +50 gold

  - **GOOD_WEATHER** (10% per hour)
    - Effect: +10% all production for 120 seconds
    - Impact: +5 morale

  - **WANDERER_JOINS** (3% per hour)
    - Effect: Free NPC spawns
    - Impact: +10 morale, +1 population

**Success Criteria:**
- [ ] Seasonal events trigger at correct intervals
- [ ] Positive events provide meaningful benefits
- [ ] Event effects stack correctly with existing multipliers (respect 2.0x cap)
- [ ] Players feel rewarded, not overwhelmed

**Files to Create:**
```
src/modules/event-system/events/
├── HarvestFestivalEvent.js   (100 lines)
├── WinterFreezeEvent.js      (100 lines)
├── SpringBloomEvent.js       (90 lines)
├── MerchantVisitEvent.js     (110 lines)
├── GoodWeatherEvent.js       (80 lines)
├── WandererJoinsEvent.js     (90 lines)
└── __tests__/
    └── PositiveEvents.test.js (150 lines)
```

**Estimate:** 1 day
**Dependencies:** EventSystem, ProductionTick (for production bonuses)
**Risk:** Low - Positive events have less balance risk

---

### P3B Summary

**Total Time:** 3 days
**Total Lines of Code:** ~1,570 lines (code) + ~590 lines (tests)
**Integration Points:** ModuleOrchestrator, ProductionTick, GridManager

**Event Balance Matrix:**

| Event Type | Frequency | Impact | Player Control |
|------------|-----------|--------|----------------|
| Wildfire | 2%/hour | High negative | Mitigation via buildings |
| Flood | 1%/hour | Medium negative | Mitigation via terrain |
| Earthquake | 0.5%/hour | High negative | Mitigation via tier |
| Harvest Festival | Every 1 hour | High positive | None (free bonus) |
| Winter Freeze | Every 2 hours | Medium negative | Stockpile resources |
| Merchant Visit | 5%/hour | Medium positive | Player chooses to trade |

**Go/No-Go Criteria:**
- ✅ All 9 event types implemented and tested
- ✅ Event system runs without impacting FPS
- ✅ Events feel fair and balanced (not frustrating)
- ✅ Clear UI notifications for all events

---

## P3C: Achievement System

**Goal:** Track player milestones and reward progression.

**Duration:** 2 days
**Priority:** LOW (nice-to-have, not blocking)

### Architecture Overview

```
AchievementSystem
├── AchievementDefinitions (50+ achievements)
├── AchievementTracker (progress tracking)
├── AchievementNotifier (UI notifications)
└── AchievementRewards (unlock bonuses)
```

### Tasks Breakdown

#### Task 3C.1: Achievement Framework (1 day)

**Goal:** Create achievement tracking and notification system

**Implementation:**
- [ ] Create `AchievementSystem.js` core class
  - Achievement registry (all defined achievements)
  - Progress tracking (partially complete achievements)
  - Completion detection (trigger when conditions met)
  - Unlock notifications (show popup to player)

- [ ] Create `Achievement.js` definition:
  ```javascript
  class Achievement {
    id: string              // Unique ID
    name: string            // Display name
    description: string     // How to unlock
    icon: string            // Icon path
    category: enum          // BUILDING, RESOURCE, NPC, TIER, SURVIVAL
    condition: {            // What triggers it
      type: string,         // 'building_count', 'resource_total', etc.
      target: any,          // Target value
      current: any          // Current progress
    }
    reward: {               // What you get
      type: string,         // 'multiplier', 'unlock', 'cosmetic'
      value: any            // Reward value
    }
    isUnlocked: boolean
    unlockedAt: timestamp
  }
  ```

- [ ] Integration with game systems:
  - Hook into ModuleOrchestrator tick to check achievement conditions
  - Listen for game events (building placed, tier advanced, etc.)
  - Update achievement progress in real-time
  - Trigger notification when achievement unlocked

**Success Criteria:**
- [ ] Achievement progress updates correctly
- [ ] Achievements unlock exactly once
- [ ] Notifications display properly
- [ ] Achievement state persists in save files

**Files to Create:**
```
src/modules/achievement-system/
├── AchievementSystem.js     (220 lines)
├── Achievement.js           (80 lines)
├── AchievementTracker.js    (150 lines)
└── __tests__/
    └── AchievementSystem.test.js (120 lines)
```

**Estimate:** 1 day
**Dependencies:** ModuleOrchestrator, SaveManager
**Risk:** Low - Achievement system is self-contained

---

#### Task 3C.2: Achievement Definitions & Rewards (1 day)

**Goal:** Define 50+ meaningful achievements with rewards

**Implementation:**
- [ ] **Building Achievements** (15 achievements)
  - First Steps: Place your first building (reward: +2% production)
  - Architect: Place 10 buildings
  - City Planner: Place 25 buildings
  - Metropolis: Place 50 buildings
  - Specialized: Place all 8 building types
  - Farm Network: Have 5 farms simultaneously
  - Industrial: Have 5 workshops simultaneously
  - Fortress: Have 3 watchtowers simultaneously
  - etc.

- [ ] **Resource Achievements** (12 achievements)
  - Gatherer: Collect 100 food
  - Hoarder: Collect 1000 food
  - Tycoon: Collect 10,000 food
  - Lumberjack: Collect 500 wood
  - Mason: Collect 500 stone
  - Wealthy: Collect 1000 gold
  - Mystic: Collect 100 essence
  - Crystallized: Collect 50 crystals
  - Full Storage: Fill storage to 100%
  - etc.

- [ ] **NPC Achievements** (10 achievements)
  - First Citizen: Spawn your first NPC
  - Village: Have 10 NPCs alive
  - Town: Have 50 NPCs alive
  - City: Have 100 NPCs alive
  - Happy Town: All NPCs above 75 happiness
  - No Deaths: Reach tier TOWN without any NPC deaths
  - Master Trainer: Have 5 NPCs with max skills
  - etc.

- [ ] **Tier Progression Achievements** (5 achievements)
  - Survivor: Reach SURVIVAL tier (auto-unlock)
  - Settler: Reach PERMANENT tier
  - Mayor: Reach TOWN tier
  - Lord: Reach CASTLE tier
  - Speed Runner: Reach CASTLE in under 2 hours

- [ ] **Survival Achievements** (8 achievements)
  - First Disaster: Survive your first disaster
  - Fireproof: Survive a wildfire without losing buildings
  - Flood Survivor: Survive a flood
  - Earthquake Resistant: Survive an earthquake
  - Event Master: Survive all 3 disaster types
  - No Starvation: Reach tier TOWN without any NPC starvation
  - etc.

- [ ] Define rewards:
  - Tier 1 achievements: +1-2% production multiplier
  - Tier 2 achievements: +3-5% production multiplier
  - Tier 3 achievements: Unlock special building variant
  - Tier 4 achievements: Cosmetic rewards (building skins)

**Success Criteria:**
- [ ] 50+ achievements defined
- [ ] Each achievement has clear unlock condition
- [ ] Rewards are meaningful but not overpowered
- [ ] Achievement categories cover all gameplay aspects
- [ ] Achievements encourage different playstyles

**Files to Create:**
```
src/modules/achievement-system/
├── achievementDefinitions.js  (500 lines, all 50+ achievements)
└── __tests__/
    └── achievementDefinitions.test.js (150 lines)
```

**Estimate:** 1 day
**Dependencies:** AchievementSystem
**Risk:** Low - Definitions are data, not complex logic

---

### P3C Summary

**Total Time:** 2 days
**Total Lines of Code:** ~950 lines (code) + ~270 lines (tests)
**Integration Points:** ModuleOrchestrator, SaveManager

**Achievement Distribution:**
- Building: 15 achievements (30%)
- Resource: 12 achievements (24%)
- NPC: 10 achievements (20%)
- Tier: 5 achievements (10%)
- Survival: 8 achievements (16%)
- **Total: 50 achievements**

**Go/No-Go Criteria:**
- ✅ Achievement system functional
- ✅ At least 30 achievements defined
- ✅ Achievements unlock correctly
- ✅ Notifications display properly

---

## P3D: Tutorial System

**Goal:** Onboard new players with interactive, context-sensitive guidance.

**Duration:** 3 days
**Priority:** HIGH (critical for player retention)

### Architecture Overview

```
TutorialSystem
├── TutorialFlowManager (step progression)
├── TutorialSteps (step definitions)
├── ContextHelp (context-sensitive tips)
└── FeatureUnlock (progressive disclosure)
```

### Tasks Breakdown

#### Task 3D.1: Tutorial Flow System (1.5 days)

**Goal:** Create step-by-step guided tutorial

**Implementation:**
- [ ] Create `TutorialSystem.js` core class
  - Step sequencing (linear progression)
  - Step completion detection (player performed action)
  - UI highlighting (point to buttons/areas)
  - Blocking overlay (prevent off-script actions)

- [ ] Create `TutorialStep.js` definition:
  ```javascript
  class TutorialStep {
    id: string                  // Unique ID
    title: string               // Step title
    message: string             // Instruction text
    highlightElement: string    // CSS selector to highlight
    blockInput: boolean         // Block other inputs
    completionCondition: {      // What advances to next step
      type: string,             // 'building_placed', 'button_clicked', etc.
      target: any               // Target value
    }
    onStart: function()         // Step begins
    onComplete: function()      // Step completes
  }
  ```

- [ ] Create tutorial flow (12 steps):
  1. **Welcome**: "Welcome to Voxel RPG! Let's build your first settlement."
  2. **Place Building**: "Click the CAMPFIRE button, then click the grid to place it."
  3. **Resources**: "Great! The campfire produces wood. Watch your resources increase."
  4. **Build Farm**: "You'll need food for NPCs. Place a FARM next to the campfire."
  5. **Spawn NPC**: "Click 'Spawn NPC' to add your first citizen."
  6. **Assign NPC**: "Click the farm, then click 'Assign NPC' to put your citizen to work."
  7. **Food Production**: "Your NPC is now producing food! NPCs consume 0.5 food/min."
  8. **Build House**: "NPCs need shelter. Place a HOUSE nearby."
  9. **Territory**: "Buildings must be within your territory (green area)."
  10. **Expand Territory**: "Click 'Expand Territory' to grow your settlement."
  11. **Tier Progression**: "Unlock new buildings by reaching tier gates. Check requirements."
  12. **You're Ready**: "Tutorial complete! Continue building your civilization."

- [ ] Integration points:
  - Disable tutorial steps until previous step complete
  - Highlight UI elements with animated border
  - Show tutorial overlay with arrow pointing to element
  - Block clicks outside tutorial flow

**Success Criteria:**
- [ ] All 12 tutorial steps work sequentially
- [ ] Players cannot skip ahead or get stuck
- [ ] UI highlighting is clear and visible
- [ ] Tutorial can be disabled (for returning players)
- [ ] Tutorial state saves if player quits mid-tutorial

**Files to Create:**
```
src/modules/tutorial-system/
├── TutorialSystem.js         (280 lines)
├── TutorialStep.js           (90 lines)
├── TutorialFlowManager.js    (200 lines)
├── tutorialSteps.js          (300 lines, all 12 steps)
└── __tests__/
    └── TutorialSystem.test.js (150 lines)
```

**Estimate:** 1.5 days
**Dependencies:** UI components (GameScreen, BuildMenu, etc.)
**Risk:** Medium - UI integration can be tricky

---

#### Task 3D.2: Context-Sensitive Help (1 day)

**Goal:** Provide help tooltips based on player actions

**Implementation:**
- [ ] Create `ContextHelp.js` system
  - Help trigger detection (player hovers/clicks something)
  - Relevant tip retrieval (show appropriate help)
  - Help history tracking (don't repeat same tip)
  - Dismissal tracking (user can hide tips)

- [ ] Define context help triggers (30+ tips):
  - **First building placement failure**: "Buildings must be placed within your territory (green zone)."
  - **First NPC spawn with no houses**: "Tip: Build houses to increase housing capacity."
  - **Food reaches 0**: "Warning: NPCs are starving! Build more farms or reduce population."
  - **Storage at 100%**: "Storage full! Resources are being discarded. Build a STORAGE building."
  - **First tier gate failure**: "You need 2 farms and 1 house to reach PERMANENT tier. Check the tier requirements."
  - **First building damage**: "Buildings can be damaged by events. Repair them using resources."
  - **First NPC death**: "An NPC died! Check food production and NPC happiness."
  - **Morale below -50**: "Town morale is low! Ensure NPCs have food, rest, and shelter."
  - **No idle tasks available**: "All NPCs are working! Consider building more production buildings."
  - **First territory expansion**: "Expanding territory costs resources. Make sure you have enough wood and stone."
  - **First achievement unlock**: "Achievement unlocked! Check your achievements for rewards."
  - **First disaster event**: "A disaster occurred! Some disasters can be mitigated with proper buildings."
  - etc.

- [ ] UI integration:
  - Show help tooltip near relevant UI element
  - Toast notification for important warnings
  - Help icon in header that opens full help menu
  - Search functionality for help topics

**Success Criteria:**
- [ ] Context help triggers at correct moments
- [ ] Help messages are clear and actionable
- [ ] Players can disable context help
- [ ] Help doesn't spam or annoy experienced players
- [ ] All 30+ tips defined and tested

**Files to Create:**
```
src/modules/tutorial-system/
├── ContextHelp.js            (180 lines)
├── contextHelpDefinitions.js (400 lines, all 30+ tips)
└── __tests__/
    └── ContextHelp.test.js   (100 lines)
```

**Estimate:** 1 day
**Dependencies:** TutorialSystem, game state monitoring
**Risk:** Low - Context help is independent from core systems

---

#### Task 3D.3: Progressive Feature Unlock (0.5 days)

**Goal:** Reveal UI features gradually to avoid overwhelming new players

**Implementation:**
- [ ] Create `FeatureUnlock.js` system
  - Feature registry (all unlockable UI features)
  - Unlock condition checking (tutorial step, tier, achievement)
  - UI element visibility control (show/hide features)

- [ ] Define progressive unlock flow:
  - **Tutorial Start**: Only CAMPFIRE visible in build menu
  - **Tutorial Step 4**: FARM unlocked
  - **Tutorial Step 8**: HOUSE unlocked
  - **Tutorial Step 10**: Territory expansion button visible
  - **Tutorial Complete**: All SURVIVAL tier buildings visible
  - **PERMANENT Tier**: Advanced build menu options
  - **TOWN Tier**: NPC management panel
  - **CASTLE Tier**: All advanced features

- [ ] Hide features until unlocked:
  - Build menu shows only unlocked buildings
  - Control buttons show only unlocked actions
  - Statistics panel shows only relevant stats
  - Settings show only unlocked options

**Success Criteria:**
- [ ] New players see minimal UI (not overwhelming)
- [ ] Features unlock at appropriate progression points
- [ ] Unlock notifications are clear
- [ ] Experienced players can skip unlock system (unlock all if tutorial disabled)

**Files to Create:**
```
src/modules/tutorial-system/
├── FeatureUnlock.js          (150 lines)
└── __tests__/
    └── FeatureUnlock.test.js (80 lines)
```

**Estimate:** 0.5 days
**Dependencies:** TutorialSystem, UI components
**Risk:** Low - Feature unlock is mostly UI visibility toggles

---

### P3D Summary

**Total Time:** 3 days
**Total Lines of Code:** ~1,600 lines (code) + ~330 lines (tests)
**Integration Points:** UI components (GameScreen, BuildMenu, Header), SaveManager

**Tutorial Coverage:**
- Core mechanics: Building placement, resource management, NPC spawning
- Advanced mechanics: Territory expansion, tier progression, assignments
- Troubleshooting: Common errors, warnings, recovery
- Progressive disclosure: 4 unlock stages (Tutorial → SURVIVAL → PERMANENT → TOWN → CASTLE)

**Go/No-Go Criteria:**
- ✅ Tutorial system functional and complete
- ✅ All 12 tutorial steps work
- ✅ Context help provides 30+ tips
- ✅ Feature unlock prevents overwhelm
- ✅ New player can complete tutorial without confusion

---

## Phase 3 Integration & Dependencies

### Dependency Chain

```
Phase 2 Complete (NPCManager, ConsumptionSystem, etc.)
    ↓
P3A: NPC Advanced Behaviors
    ↓ (IdleTaskManager, NPCNeedsTracker)
P3B: Event System (uses NPC needs for event effects)
    ↓ (parallel)
    ├─ P3C: Achievement System (tracks events survived)
    └─ P3D: Tutorial System (references all systems)
```

### Module Integration Points

| Phase 3 Module | Depends On | Used By |
|----------------|------------|---------|
| IdleTaskManager | NPCManager, NPCPathfinder | AutonomousDecision |
| NPCNeedsTracker | NPCManager, ConsumptionSystem | AutonomousDecision |
| AutonomousDecision | IdleTaskManager, NPCNeedsTracker | ModuleOrchestrator |
| EventSystem | ModuleOrchestrator | AchievementSystem |
| AchievementSystem | ModuleOrchestrator, SaveManager | UI components |
| TutorialSystem | All game systems | UI components |

### Critical Path

**Longest path:** P3A (4 days) → P3B (3 days) → P3D (3 days) = **10 days**

**Parallel work opportunities:**
- P3C (Achievement System) can be developed in parallel with P3B (Event System)
- Context help definitions can be written while tutorial flow is being coded
- Event definitions can be written while event framework is being coded

### Performance Impact Assessment

| System | Expected FPS Impact | Mitigation |
|--------|-------------------|------------|
| Idle Tasks | -5 FPS with 100 NPCs | Use efficient task queue, limit task recalculation to once per second |
| NPC Needs | -8 FPS with 100 NPCs | Batch need updates, calculate only for alive NPCs |
| Event System | -1 FPS | Events are infrequent, no per-frame calculations |
| Achievements | < 1 FPS | Check conditions only on relevant events, not every frame |
| Tutorial | 0 FPS | Tutorial only runs at start, then disabled |

**Total Expected Impact:** -14 FPS worst case
**Acceptable:** Yes (current: 3,997 FPS with 100 NPCs → 3,983 FPS after Phase 3)

---

## Testing Strategy

### Unit Tests (Required)

Each module must have comprehensive unit tests:

- **P3A Tests:**
  - IdleTaskManager: Task assignment, prioritization, completion
  - NPCNeedsTracker: Need decay, satisfaction, critical thresholds
  - AutonomousDecision: Decision tree logic, priority evaluation

- **P3B Tests:**
  - EventSystem: Event scheduling, triggering, resolution
  - Individual events: Effect application, duration, cleanup
  - Event conflicts: Prevent incompatible simultaneous events

- **P3C Tests:**
  - AchievementSystem: Progress tracking, unlock detection
  - Achievement rewards: Bonus application, multiplier stacking

- **P3D Tests:**
  - TutorialSystem: Step progression, completion detection
  - ContextHelp: Trigger detection, message display
  - FeatureUnlock: Unlock conditions, UI visibility

**Target Coverage:** 70% code coverage minimum

### Integration Tests (Required)

Test cross-module interactions:

- [ ] NPC with low rest need → assigns IDLE_REST task → rest need increases
- [ ] Disaster event → buildings damaged → achievement "First Disaster" unlocks
- [ ] Tutorial step → place building → next step unlocks
- [ ] NPC needs all satisfied → happiness increases → achievement "Happy Town" progress updates

### Performance Tests (Required)

Validate performance with Phase 3 features:

- [ ] 100 NPCs with idle tasks, needs tracking, autonomous decisions: FPS > 50
- [ ] 3 simultaneous events active: No FPS drop
- [ ] Achievement system checking 50 achievements: < 1ms per check
- [ ] Tutorial system with UI highlighting: No visual glitches

### User Acceptance Tests (Recommended)

Real gameplay validation:

- [ ] New player completes tutorial without confusion
- [ ] Disaster events feel challenging but fair
- [ ] NPCs appear intelligent and autonomous (not robotic)
- [ ] Achievements unlock at satisfying moments

---

## Risk Assessment

### High Risk Items

1. **NPC Autonomous Behavior Performance** (P3A)
   - Risk: Decision-making for 100 NPCs might be slow
   - Mitigation: Batch decision updates (10 NPCs per frame), cache decisions
   - Contingency: Reduce decision frequency to once per 5 seconds instead of per frame
   - Buffer: +1 day

2. **Tutorial Integration Complexity** (P3D)
   - Risk: UI highlighting and flow control might conflict with existing UI
   - Mitigation: Use non-intrusive overlay system, test early
   - Contingency: Simplify tutorial to text-only prompts (no highlighting)
   - Buffer: +0.5 days

### Medium Risk Items

1. **Event Balance** (P3B)
   - Risk: Disasters might be too harsh or too easy
   - Mitigation: Extensive playtesting, adjustable difficulty settings
   - Contingency: Add difficulty slider for event frequency/severity
   - Buffer: +0.5 days

2. **NPC Needs Balance** (P3A)
   - Risk: Need decay rates might be incorrect, causing constant need satisfaction
   - Mitigation: Use prototype-validated rates, iterate based on playtesting
   - Contingency: Add need decay multiplier setting
   - Buffer: +0.5 days

### Low Risk Items

1. **Achievement Definitions** (P3C)
   - Risk: Minimal - achievements are data, not complex logic
   - Mitigation: Define achievements in JSON for easy tweaking
   - Contingency: Ship with fewer achievements (30 instead of 50)

2. **Context Help Messages** (P3D)
   - Risk: Minimal - help text is static content
   - Mitigation: Review all messages for clarity
   - Contingency: Add help messages incrementally based on user feedback

---

## Timeline & Milestones

### Week 1 (Days 1-5): P3A + P3B

**Days 1-4: P3A - NPC Advanced Behaviors**
- Day 1: IdleTaskManager implementation
- Day 2: IdleTaskManager testing + NPCNeedsTracker start
- Day 3: NPCNeedsTracker completion + AutonomousDecision start
- Day 4: AutonomousDecision completion + P3A integration testing

**Day 5: P3B Start - Event Framework**
- Event system architecture
- Event scheduling implementation

**Milestone 1 Checkpoint (End of Day 4):**
- ✅ NPCs perform idle tasks when not working
- ✅ NPCs track and satisfy 4 needs
- ✅ NPCs make autonomous decisions
- ✅ 100 NPCs with full behavior run at 60 FPS

---

### Week 2 (Days 6-10): P3B + P3C + P3D

**Days 6-7: P3B - Event Implementation**
- Day 6: Natural disaster events (wildfire, flood, earthquake)
- Day 7: Seasonal & positive events

**Days 8-9: P3C - Achievement System**
- Day 8: Achievement framework + tracking
- Day 9: Achievement definitions + rewards

**Days 10-12: P3D - Tutorial System**
- Day 10: Tutorial flow system + steps 1-6
- Day 11: Tutorial steps 7-12 + context help
- Day 12: Feature unlock + tutorial polish

**Milestone 2 Checkpoint (End of Day 7):**
- ✅ Event system functional
- ✅ All 9 event types implemented
- ✅ Events balanced and tested

**Milestone 3 Checkpoint (End of Day 9):**
- ✅ Achievement system tracking progress
- ✅ 50+ achievements defined
- ✅ Achievements unlock correctly

**Milestone 4 Checkpoint (End of Day 12):**
- ✅ Tutorial guides new players through first session
- ✅ Context help provides 30+ tips
- ✅ Progressive feature unlock works

---

## File Structure

```
src/modules/
├── npc-system/
│   ├── NPCManager.js (existing)
│   ├── NPCPathfinder.js (existing)
│   ├── NPCAssignment.js (existing)
│   ├── IdleTaskManager.js (NEW - P3A)
│   ├── IdleTask.js (NEW - P3A)
│   ├── NPCNeedsTracker.js (NEW - P3A)
│   ├── NPCNeed.js (NEW - P3A)
│   ├── AutonomousDecision.js (NEW - P3A)
│   └── __tests__/
│       ├── IdleTaskManager.test.js (NEW)
│       ├── NPCNeedsTracker.test.js (NEW)
│       └── AutonomousDecision.test.js (NEW)
│
├── event-system/ (NEW - P3B)
│   ├── EventSystem.js
│   ├── Event.js
│   ├── EventScheduler.js
│   ├── events/
│   │   ├── WildfireEvent.js
│   │   ├── FloodEvent.js
│   │   ├── EarthquakeEvent.js
│   │   ├── HarvestFestivalEvent.js
│   │   ├── WinterFreezeEvent.js
│   │   ├── SpringBloomEvent.js
│   │   ├── MerchantVisitEvent.js
│   │   ├── GoodWeatherEvent.js
│   │   └── WandererJoinsEvent.js
│   └── __tests__/
│       ├── EventSystem.test.js
│       ├── WildfireEvent.test.js
│       ├── FloodEvent.test.js
│       ├── EarthquakeEvent.test.js
│       └── PositiveEvents.test.js
│
├── achievement-system/ (NEW - P3C)
│   ├── AchievementSystem.js
│   ├── Achievement.js
│   ├── AchievementTracker.js
│   ├── achievementDefinitions.js
│   └── __tests__/
│       ├── AchievementSystem.test.js
│       └── achievementDefinitions.test.js
│
└── tutorial-system/ (NEW - P3D)
    ├── TutorialSystem.js
    ├── TutorialStep.js
    ├── TutorialFlowManager.js
    ├── tutorialSteps.js
    ├── ContextHelp.js
    ├── contextHelpDefinitions.js
    ├── FeatureUnlock.js
    └── __tests__/
        ├── TutorialSystem.test.js
        ├── ContextHelp.test.js
        └── FeatureUnlock.test.js
```

**Total New Files:** 36 files
**Total New Code:** ~5,300 lines (production) + ~1,510 lines (tests)

---

## Success Criteria for Phase 3

Phase 3 is complete when ALL criteria are met:

### Functional Criteria
- ✅ NPCs perform autonomous behaviors (idle tasks, need satisfaction)
- ✅ Event system triggers all 9 event types correctly
- ✅ Achievement system tracks 50+ achievements
- ✅ Tutorial system guides new players through 12 steps
- ✅ Context help provides 30+ contextual tips
- ✅ Progressive feature unlock prevents UI overwhelm

### Performance Criteria
- ✅ 100 NPCs with full Phase 3 features: FPS ≥ 50
- ✅ Event system: < 1ms per event check
- ✅ Achievement system: < 1ms per achievement check
- ✅ Tutorial system: No visual glitches or lag

### Quality Criteria
- ✅ 70%+ code test coverage
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ No critical bugs or crashes

### User Experience Criteria
- ✅ New player completes tutorial in < 10 minutes
- ✅ Disaster events feel fair and recoverable
- ✅ Achievements unlock at satisfying moments
- ✅ NPCs appear intelligent (not repetitive/robotic)

---

## Post-Phase 3 Integration

### ModuleOrchestrator Updates Required

```javascript
// GameManager.js or ModuleOrchestrator.js
_createModules() {
  // ... existing modules ...

  // Phase 3A: NPC Behaviors
  const idleTaskManager = new IdleTaskManager(grid);
  const npcNeedsTracker = new NPCNeedsTracker();
  const autonomousDecision = new AutonomousDecision(
    npcNeedsTracker,
    idleTaskManager
  );

  // Phase 3B: Events
  const eventSystem = new EventSystem(this);

  // Phase 3C: Achievements
  const achievementSystem = new AchievementSystem(this);

  // Phase 3D: Tutorial
  const tutorialSystem = new TutorialSystem(this);

  return {
    // ... existing modules ...
    idleTaskManager,
    npcNeedsTracker,
    autonomousDecision,
    eventSystem,
    achievementSystem,
    tutorialSystem
  };
}

executeTick(tickCount) {
  // ... existing tick logic ...

  // Phase 3A: Update NPC behaviors
  this.npcNeedsTracker.updateAllNeeds(deltaTime);
  this.idleTaskManager.updateTasks(deltaTime);

  // Phase 3B: Check for events
  this.eventSystem.checkEventTriggers(tickCount);
  this.eventSystem.updateActiveEvents(deltaTime);

  // Phase 3C: Check achievement progress
  this.achievementSystem.checkAchievements(this.gameState);

  // Phase 3D: Update tutorial progress (if active)
  if (this.tutorialSystem.isActive) {
    this.tutorialSystem.checkStepCompletion(this.gameState);
  }
}
```

### Save/Load System Updates

Add Phase 3 state to save files:

```javascript
// GameStateSerializer.js
serialize(orchestrator) {
  return {
    // ... existing save data ...

    // Phase 3 data
    idleTasks: this._serializeIdleTasks(orchestrator.idleTaskManager),
    npcNeeds: this._serializeNPCNeeds(orchestrator.npcNeedsTracker),
    events: this._serializeEvents(orchestrator.eventSystem),
    achievements: this._serializeAchievements(orchestrator.achievementSystem),
    tutorial: this._serializeTutorial(orchestrator.tutorialSystem)
  };
}
```

---

## Budget Summary

### Time Budget

| Component | Estimate | Buffer | Total |
|-----------|----------|--------|-------|
| P3A: NPC Behaviors | 4 days | +1 day | 5 days |
| P3B: Event System | 3 days | +0.5 days | 3.5 days |
| P3C: Achievement System | 2 days | 0 | 2 days |
| P3D: Tutorial System | 3 days | +0.5 days | 3.5 days |
| **Total** | **12 days** | **+2 days** | **14 days** |

**Best Case:** 12 days
**Realistic Case:** 13-14 days (with minor issues)
**Worst Case:** 16-17 days (with major issues)

### Code Budget

| Component | Production | Tests | Total |
|-----------|-----------|-------|-------|
| P3A: NPC Behaviors | 1,180 lines | 320 lines | 1,500 lines |
| P3B: Event System | 1,570 lines | 590 lines | 2,160 lines |
| P3C: Achievement System | 950 lines | 270 lines | 1,220 lines |
| P3D: Tutorial System | 1,600 lines | 330 lines | 1,930 lines |
| **Total** | **5,300 lines** | **1,510 lines** | **6,810 lines** |

---

## Next Steps

### Immediate Actions (Before Phase 3 Starts)

1. ✅ **Review this plan** - Stakeholder approval
2. ✅ **Prioritize components** - Confirm P3A → P3B → P3C+P3D order
3. ⏳ **Set up test environment** - Ensure testing infrastructure ready
4. ⏳ **Create Phase 3 branch** - `git checkout -b phase-3-advanced-features`
5. ⏳ **Create module directories** - Set up folder structure

### Day 1 Kickoff (P3A Start)

1. Create `src/modules/npc-system/IdleTaskManager.js`
2. Define idle task types (WANDER, SOCIALIZE, REST, INSPECT)
3. Implement task queue and prioritization
4. Write unit tests for IdleTaskManager
5. Integrate with NPCManager

### Go/No-Go Decision Points

**Before P3B (End of P3A):**
- [ ] NPCs perform idle tasks correctly?
- [ ] NPCs track and satisfy needs?
- [ ] Performance acceptable (60 FPS with 100 NPCs)?
- **Decision:** Proceed to P3B or fix P3A issues

**Before P3C (End of P3B):**
- [ ] Event system functional?
- [ ] All 9 events implemented?
- [ ] Events feel balanced?
- **Decision:** Proceed to P3C or adjust event balance

**Before P3D (End of P3C):**
- [ ] Achievement system tracking correctly?
- [ ] 50+ achievements defined?
- **Decision:** Proceed to P3D or add more achievements

**Phase 3 Complete (End of P3D):**
- [ ] Tutorial guides new players?
- [ ] All success criteria met?
- **Decision:** Merge to main or iterate on issues

---

## Conclusion

Phase 3 represents a significant expansion of the game's depth and player engagement systems. By adding intelligent NPC behaviors, dynamic events, progression tracking, and player onboarding, we transform the game from a functional prototype into an engaging, polished experience.

**Key Deliverables:**
- ✅ Autonomous NPCs with needs and idle behaviors
- ✅ 9 dynamic events (3 disasters, 6 positive/seasonal)
- ✅ 50+ achievements with meaningful rewards
- ✅ 12-step tutorial with context-sensitive help

**Impact:**
- **Replayability:** Events and achievements encourage multiple playthroughs
- **Engagement:** Intelligent NPCs feel more alive and interesting
- **Retention:** Tutorial reduces new player drop-off
- **Polish:** Phase 3 elevates game from "functional" to "fun"

**Ready to Begin:** Phase 3 planning complete. Awaiting approval to start implementation.

---

**Plan Created By:** Claude
**Date:** 2025-11-12
**Estimated Completion:** 12-14 days from start
**Confidence Level:** High (based on successful Phase 1 & 2 execution)
