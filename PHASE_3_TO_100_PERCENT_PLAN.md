# Phase 3 Improvement Plan: 90% → 100%

**Created:** 2025-11-13
**Current Score:** 90/100
**Target Score:** 100/100
**Estimated Time:** 3-4 days (24-32 hours)

---

## Executive Summary

This plan addresses all identified issues from the comprehensive audit to bring Phase 3 to perfect implementation. The work is organized into 4 priority tiers with clear deliverables and acceptance criteria.

**Current State:**
- Phase 3A: 85/100 - Missing tests, memory leak, no save/load
- Phase 3B: 92/100 - Minor bug, missing UI
- Phase 3C: 95/100 - Rewards not wired, incomplete tests
- Phase 3D: 88/100 - Not connected, missing UI

**Target State:** All phases at 100/100 with full test coverage, no bugs, complete UI integration

---

## Priority 1: Critical Issues (2-3 hours)

### 1.1 Connect Phase 3D Tutorial System ⚠️ CRITICAL
**Current Score Impact:** -12 points
**Target Score Gain:** +12 points
**Time:** 1 hour
**Severity:** HIGH - System exists but not active

**Files to Modify:**
- `src/GameManager.js`

**Implementation:**
```javascript
// In GameManager.js - Add imports
import TutorialSystem from './modules/tutorial-system/TutorialSystem';
import ContextHelp from './modules/tutorial-system/ContextHelp';
import FeatureUnlock from './modules/tutorial-system/FeatureUnlock';
import { tutorialSteps } from './modules/tutorial-system/tutorialSteps';
import { contextHelpDefinitions } from './modules/tutorial-system/contextHelpDefinitions';

// In _createModules() method
const tutorialSystem = new TutorialSystem(tutorialSteps);
const contextHelp = new ContextHelp(contextHelpDefinitions);
const featureUnlock = new FeatureUnlock();

// In return statement
return {
  // ... existing modules ...
  tutorialSystem,
  contextHelp,
  featureUnlock
};
```

**Testing:**
- [ ] Tutorial steps trigger on game events
- [ ] Context help displays on appropriate actions
- [ ] Features unlock at correct progression points
- [ ] Save/load preserves tutorial state

**Acceptance Criteria:**
- TutorialSystem instantiated in GameManager
- Available in ModuleOrchestrator
- First tutorial step appears on new game
- Phase 3D score: 88 → 100

---

### 1.2 Fix Event Cancellation Cleanup Bug
**Current Score Impact:** -8 points
**Target Score Gain:** +8 points
**Time:** 15 minutes
**Severity:** MEDIUM - Potential memory leak

**File to Modify:**
- `src/modules/event-system/EventSystem.js`

**Current Code (Line 202-210):**
```javascript
cancelEvent(eventId) {
  const event = this.getEventById(eventId);
  if (event) {
    event.cancel();  // ❌ Doesn't clean up
    this.activeEvents = this.activeEvents.filter(e => e.id !== eventId);
    this.eventQueue = this.eventQueue.filter(e => e.id !== eventId);
  }
}
```

**Fixed Code:**
```javascript
cancelEvent(eventId) {
  const event = this.getEventById(eventId);
  if (event) {
    // Clean up event effects before cancelling
    if (event.state === 'ACTIVE') {
      const gameState = this.orchestrator ? {
        ...this.orchestrator.gameState,
        gridManager: this.orchestrator.grid,
        storageManager: this.orchestrator.storage,
        townManager: this.orchestrator.townManager,
        npcManager: this.orchestrator.npcManager,
        buildingConfig: this.orchestrator.buildingConfig,
        territoryManager: this.orchestrator.territoryManager
      } : {};

      try {
        event.end(gameState);  // ✅ Proper cleanup
      } catch (err) {
        console.error(`Error ending cancelled event ${eventId}:`, err);
      }
    }

    event.cancel();
    this.activeEvents = this.activeEvents.filter(e => e.id !== eventId);
    this.eventQueue = this.eventQueue.filter(e => e.id !== eventId);
  }
}
```

**Testing:**
- [ ] Cancel active event with production multipliers
- [ ] Verify multipliers are removed
- [ ] Cancel queued event (should not error)
- [ ] Memory profiling shows no leaks

**Acceptance Criteria:**
- Event cleanup called before cancellation
- No multipliers persist after cancel
- Phase 3B score: 92 → 98

---

### 1.3 Wire Achievement Reward System
**Current Score Impact:** -5 points
**Target Score Gain:** +5 points
**Time:** 45 minutes
**Severity:** MEDIUM - Features don't work as designed

**Files to Modify:**
- `src/core/ModuleOrchestrator.js`
- `src/modules/resource-economy/ProductionTick.js`

**Implementation:**

**Step 1: Add Achievement Bonuses to ModuleOrchestrator**
```javascript
// In ModuleOrchestrator constructor
this.achievementBonuses = {
  production: 1.0,
  food: 1.0,
  wood: 1.0,
  stone: 1.0,
  gold: 1.0,
  essence: 1.0,
  crystals: 1.0,
  morale: 1.0,
  storage: 1.0,
  npcHappiness: 1.0,
  npcHealth: 1.0,
  buildingHealth: 1.0
};

// Subscribe to achievement rewards
if (this.achievementSystem) {
  this.achievementSystem.on('achievement:reward', (data) => {
    this._applyAchievementReward(data);
  });
}

/**
 * Apply achievement reward bonuses
 * @private
 */
_applyAchievementReward(rewardData) {
  const { rewardType, rewardValue } = rewardData;

  if (rewardType === 'multiplier') {
    for (const [key, bonus] of Object.entries(rewardValue)) {
      if (key in this.achievementBonuses) {
        this.achievementBonuses[key] += bonus;
        // eslint-disable-next-line no-console
        console.log(`🏆 Achievement bonus applied: ${key} +${(bonus * 100).toFixed(1)}% (total: ${(this.achievementBonuses[key] * 100).toFixed(1)}%)`);
      }
    }
  }
}

/**
 * Get total achievement multiplier for a resource type
 */
getAchievementMultiplier(type) {
  // Apply general production bonus
  let multiplier = this.achievementBonuses.production || 1.0;

  // Apply specific resource bonus if exists
  if (type && type in this.achievementBonuses) {
    multiplier *= this.achievementBonuses[type];
  }

  return multiplier;
}
```

**Step 2: Apply Bonuses in Production**
```javascript
// In ModuleOrchestrator.executeTick() - STEP 1: PRODUCTION PHASE
const productionResult = this.productionTick.tick(
  buildings,
  this.gameState,
  npcAssignmentMap
);

// Apply achievement bonuses to production
const achievementMultiplier = this.getAchievementMultiplier('production');
for (const [resource, amount] of Object.entries(productionResult.production)) {
  // Apply general production bonus
  productionResult.production[resource] = amount * achievementMultiplier;

  // Apply resource-specific bonuses
  const resourceMultiplier = this.getAchievementMultiplier(resource);
  if (resourceMultiplier > 1.0) {
    productionResult.production[resource] *= resourceMultiplier;
  }
}
```

**Step 3: Apply Morale Bonuses**
```javascript
// In ModuleOrchestrator.executeTick() - STEP 3: MORALE PHASE
this.morale.calculateTownMorale({
  npcs: aliveNPCs,
  foodAvailable: this.storage.getResource('food'),
  housingCapacity: housing,
  expansionCount: territoryCount - 1,
  buildingBonus: buildingMoraleBonus,
  achievementBonus: this.achievementBonuses.morale || 1.0  // ✅ Add this
});
```

**Testing:**
- [ ] Unlock "First Steps" achievement (+2% production)
- [ ] Verify production values increase
- [ ] Unlock multiple achievements
- [ ] Verify bonuses stack correctly
- [ ] Check morale bonuses apply

**Acceptance Criteria:**
- Achievement rewards actually modify game values
- Bonuses persist across save/load
- UI shows applied bonuses
- Phase 3C score: 95 → 100

---

## Priority 2: High Priority Testing (8-10 hours)

### 2.1 Create Phase 3A Unit Tests
**Current Score Impact:** -15 points
**Target Score Gain:** +15 points
**Time:** 8 hours
**Severity:** HIGH - 0% test coverage

**Files to Create:**
- `src/modules/npc-system/__tests__/IdleTaskManager.test.js` (~150 lines)
- `src/modules/npc-system/__tests__/NPCNeedsTracker.test.js` (~150 lines)
- `src/modules/npc-system/__tests__/AutonomousDecision.test.js` (~100 lines)

**Test Coverage Targets:**

#### IdleTaskManager.test.js (50 tests)
```javascript
describe('IdleTaskManager', () => {
  describe('Task Assignment', () => {
    - [ ] Should assign WANDER task to idle NPC
    - [ ] Should assign REST task to fatigued NPC (priority)
    - [ ] Should assign SOCIALIZE task to lonely NPC
    - [ ] Should not assign task to working NPC
    - [ ] Should not assign duplicate tasks to same NPC
    - [ ] Should handle NPC without position
  });

  describe('Task Completion', () => {
    - [ ] Should complete WANDER task after duration
    - [ ] Should complete REST task and reduce fatigue
    - [ ] Should complete SOCIALIZE task and increase happiness
    - [ ] Should return completed tasks with rewards
    - [ ] Should remove completed tasks from activeTasks
  });

  describe('Task Progress', () => {
    - [ ] Should update task progress with deltaTime
    - [ ] Should not complete task before duration
    - [ ] Should handle zero deltaTime
    - [ ] Should handle large deltaTime (catch-up)
  });

  describe('Statistics', () => {
    - [ ] Should track total tasks assigned
    - [ ] Should track tasks completed per type
    - [ ] Should track average task duration
    - [ ] Should reset statistics correctly
  });

  describe('Edge Cases', () => {
    - [ ] Should handle NPC death during task
    - [ ] Should handle 100 concurrent tasks (performance)
    - [ ] Should handle invalid NPC ID
    - [ ] Should handle missing grid reference
  });

  describe('Memory Management', () => {
    - [ ] Should not leak tasks for dead NPCs
    - [ ] Should clear activeTasks on reset
    - [ ] Should handle repeated assign/complete cycles
  });
});
```

#### NPCNeedsTracker.test.js (50 tests)
```javascript
describe('NPCNeedsTracker', () => {
  describe('Need Tracking', () => {
    - [ ] Should track FOOD need for NPC
    - [ ] Should track REST need for NPC
    - [ ] Should track SOCIAL need for NPC
    - [ ] Should track SHELTER need for NPC
    - [ ] Should initialize all needs at 100
  });

  describe('Need Decay', () => {
    - [ ] Should decay FOOD at 0.5/min while working
    - [ ] Should decay REST at 1/min while working
    - [ ] Should decay SOCIAL at 0.2/min always
    - [ ] Should decay SHELTER at 0.1/min outside territory
    - [ ] Should not decay SHELTER inside territory
    - [ ] Should handle deltaTime correctly
  });

  describe('Need Satisfaction', () => {
    - [ ] Should satisfy FOOD need when eating
    - [ ] Should satisfy REST need when resting
    - [ ] Should satisfy SOCIAL need when socializing
    - [ ] Should clamp needs at 0-100 range
  });

  describe('Critical Needs', () => {
    - [ ] Should detect critical need (<30%)
    - [ ] Should return NPCs with critical needs
    - [ ] Should prioritize lowest need
  });

  describe('Statistics', () => {
    - [ ] Should track total NPCs monitored
    - [ ] Should track average need levels
    - [ ] Should track critical need alerts
  });

  describe('Serialization', () => {
    - [ ] Should serialize all NPC needs
    - [ ] Should deserialize and restore needs
    - [ ] Should handle missing data gracefully
  });
});
```

#### AutonomousDecision.test.js (40 tests)
```javascript
describe('AutonomousDecision', () => {
  describe('Decision Priority', () => {
    - [ ] Should prioritize EMERGENCY (food < 10)
    - [ ] Should prioritize CRITICAL (rest < 10)
    - [ ] Should prioritize HIGH (any need < 30)
    - [ ] Should prioritize MEDIUM (work assignment)
    - [ ] Should default to LOW (random idle task)
  });

  describe('Work vs Rest Balance', () => {
    - [ ] Should allow work when all needs satisfied
    - [ ] Should refuse work when rest critical
    - [ ] Should refuse work when food critical
    - [ ] Should interrupt work for emergency needs
  });

  describe('Task Selection', () => {
    - [ ] Should select REST when fatigued
    - [ ] Should select SOCIALIZE when lonely
    - [ ] Should select WANDER when all needs met
    - [ ] Should not select tasks for dead NPCs
  });

  describe('Performance', () => {
    - [ ] Should make decision in <1ms per NPC
    - [ ] Should handle 100 NPCs in <100ms
  });
});
```

**Acceptance Criteria:**
- 80%+ code coverage for Phase 3A
- All tests passing
- Performance tests validate <1ms per NPC
- Phase 3A score: 85 → 95

---

### 2.2 Expand Phase 3C Test Coverage
**Current Score Impact:** -3 points
**Target Score Gain:** +3 points
**Time:** 2 hours

**Files to Create:**
- `src/modules/achievement-system/__tests__/Achievement.test.js` (~100 lines)
- `src/modules/achievement-system/__tests__/AchievementTracker.test.js` (~150 lines)

**Test Coverage:**

#### Achievement.test.js
```javascript
describe('Achievement', () => {
  describe('Construction', () => {
    - [ ] Should validate required fields
    - [ ] Should throw on missing id
    - [ ] Should throw on invalid category
    - [ ] Should set default icon
  });

  describe('Progress Tracking', () => {
    - [ ] Should calculate percentage progress
    - [ ] Should detect unlock condition met
    - [ ] Should clamp progress at 100%
    - [ ] Should handle boolean conditions
    - [ ] Should handle numeric conditions
  });

  describe('Progress Description', () => {
    - [ ] Should format building count progress
    - [ ] Should format resource progress
    - [ ] Should format NPC progress
    - [ ] Should format tier progress
    - [ ] Should show "Unlocked!" when complete
  });

  describe('Serialization', () => {
    - [ ] Should serialize only state data
    - [ ] Should deserialize and restore state
    - [ ] Should preserve unlock timestamp
  });
});
```

#### AchievementTracker.test.js
```javascript
describe('AchievementTracker', () => {
  describe('Resource Tracking', () => {
    - [ ] Should track resource increases
    - [ ] Should ignore resource decreases
    - [ ] Should calculate deltas correctly
    - [ ] Should handle negative deltas
  });

  describe('Event Tracking', () => {
    - [ ] Should record unique event types
    - [ ] Should count total events survived
    - [ ] Should track disaster types separately
  });

  describe('NPC Death Tracking', () => {
    - [ ] Should record total deaths
    - [ ] Should separate starvation deaths
    - [ ] Should track death causes
  });

  describe('Tier Tracking', () => {
    - [ ] Should record tier reach time
    - [ ] Should not overwrite existing times
    - [ ] Should calculate elapsed time
  });

  describe('Condition Extraction', () => {
    - [ ] Should extract building count
    - [ ] Should extract resource totals
    - [ ] Should extract NPC statistics
    - [ ] Should handle missing game state
  });
});
```

**Acceptance Criteria:**
- Achievement.test.js: 80%+ coverage
- AchievementTracker.test.js: 80%+ coverage
- All 50 achievement definitions validated
- Phase 3C score: 95 → 98

---

## Priority 3: Medium Priority Features (8-10 hours)

### 3.1 Add Phase 3A Memory Cleanup
**Current Score Impact:** -3 points
**Target Score Gain:** +3 points
**Time:** 1 hour

**File to Modify:**
- `src/modules/npc-system/IdleTaskManager.js`

**Implementation:**
```javascript
/**
 * Remove NPC from task tracking (called when NPC dies)
 * @param {number} npcId - NPC ID to remove
 */
removeNPC(npcId) {
  this.activeTasks.delete(npcId);

  // Clean up statistics
  if (this.stats.npcStats && this.stats.npcStats.has(npcId)) {
    this.stats.npcStats.delete(npcId);
  }

  // eslint-disable-next-line no-console
  console.log(`[IdleTaskManager] Cleaned up tasks for NPC ${npcId}`);
}

/**
 * Clean up inactive tasks (garbage collection)
 * Call periodically to prevent memory buildup
 */
cleanupInactiveTasks() {
  const toRemove = [];

  for (const [npcId, task] of this.activeTasks.entries()) {
    // If task has been active for > 5 minutes, it's probably stuck
    if (task.startTime && (Date.now() - task.startTime) > 300000) {
      toRemove.push(npcId);
    }
  }

  for (const npcId of toRemove) {
    this.activeTasks.delete(npcId);
  }

  if (toRemove.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[IdleTaskManager] Cleaned up ${toRemove.length} stuck tasks`);
  }
}
```

**Integration:**
```javascript
// In ModuleOrchestrator - when NPC dies
if (this.idleTaskManager) {
  this.idleTaskManager.removeNPC(npcId);
}

// In ModuleOrchestrator.executeTick() - periodic cleanup (every 100 ticks)
if (this.tickCount % 100 === 0 && this.idleTaskManager) {
  this.idleTaskManager.cleanupInactiveTasks();
}
```

**Testing:**
- [ ] Spawn 10 NPCs with tasks
- [ ] Kill 5 NPCs
- [ ] Verify activeTasks.size === 5
- [ ] Run for 1000 ticks
- [ ] Verify no memory growth

**Acceptance Criteria:**
- Dead NPCs removed from IdleTaskManager
- No memory leaks after 10,000 ticks
- Phase 3A score: 95 → 98

---

### 3.2 Add Phase 3A Save/Load Support
**Current Score Impact:** -2 points
**Target Score Gain:** +2 points
**Time:** 3 hours

**Files to Modify:**
- `src/modules/npc-system/IdleTaskManager.js`
- `src/modules/npc-system/NPCNeedsTracker.js`
- `src/persistence/GameStateSerializer.js`

**Implementation:**

**Step 1: Add Serialization to IdleTaskManager**
```javascript
/**
 * Serialize idle task manager state
 * @returns {Object} Serialized state
 */
serialize() {
  const tasks = {};
  for (const [npcId, task] of this.activeTasks.entries()) {
    tasks[npcId] = {
      type: task.type,
      startTime: task.startTime,
      duration: task.duration,
      progress: task.progress,
      position: task.targetPosition
    };
  }

  return {
    activeTasks: tasks,
    stats: {
      totalTasksAssigned: this.stats.totalTasksAssigned,
      tasksCompleted: { ...this.stats.tasksCompleted }
    }
  };
}

/**
 * Deserialize idle task manager state
 * @param {Object} data - Saved state
 */
deserialize(data) {
  if (!data) return;

  // Restore active tasks
  if (data.activeTasks) {
    for (const [npcId, taskData] of Object.entries(data.activeTasks)) {
      this.activeTasks.set(parseInt(npcId), {
        type: taskData.type,
        startTime: taskData.startTime,
        duration: taskData.duration,
        progress: taskData.progress,
        targetPosition: taskData.position,
        rewards: this._getRewardsForTask(taskData.type)
      });
    }
  }

  // Restore statistics
  if (data.stats) {
    this.stats.totalTasksAssigned = data.stats.totalTasksAssigned || 0;
    this.stats.tasksCompleted = data.stats.tasksCompleted || {};
  }
}
```

**Step 2: Add Serialization to NPCNeedsTracker**
```javascript
/**
 * Serialize needs tracker state
 * @returns {Object} Serialized state
 */
serialize() {
  const needs = {};
  for (const [npcId, npcNeeds] of this.npcNeeds.entries()) {
    needs[npcId] = {};
    for (const [needType, needData] of Object.entries(npcNeeds)) {
      needs[npcId][needType] = needData.value;
    }
  }

  return {
    npcNeeds: needs,
    stats: { ...this.stats }
  };
}

/**
 * Deserialize needs tracker state
 * @param {Object} data - Saved state
 */
deserialize(data) {
  if (!data) return;

  // Restore NPC needs
  if (data.npcNeeds) {
    for (const [npcId, needs] of Object.entries(data.npcNeeds)) {
      this.npcNeeds.set(parseInt(npcId), {});
      for (const [needType, value] of Object.entries(needs)) {
        this.npcNeeds.get(parseInt(npcId))[needType] = {
          value: value,
          lastUpdate: Date.now()
        };
      }
    }
  }

  // Restore statistics
  if (data.stats) {
    this.stats = { ...this.stats, ...data.stats };
  }
}
```

**Step 3: Integrate into GameStateSerializer**
```javascript
// In GameStateSerializer.serialize()
modules: {
  // ... existing modules ...

  // Phase 3A
  idleTaskManager: orchestrator.idleTaskManager ?
    orchestrator.idleTaskManager.serialize() : null,
  npcNeedsTracker: orchestrator.npcNeedsTracker ?
    orchestrator.npcNeedsTracker.serialize() : null
}

// In GameStateSerializer.deserialize()
if (data.modules.idleTaskManager && orchestrator.idleTaskManager) {
  orchestrator.idleTaskManager.deserialize(data.modules.idleTaskManager);
}

if (data.modules.npcNeedsTracker && orchestrator.npcNeedsTracker) {
  orchestrator.npcNeedsTracker.deserialize(data.modules.npcNeedsTracker);
}
```

**Testing:**
- [ ] Assign tasks to 5 NPCs
- [ ] Set various need levels
- [ ] Save game
- [ ] Reload game
- [ ] Verify tasks still active
- [ ] Verify need levels preserved

**Acceptance Criteria:**
- Active tasks persist across save/load
- NPC needs persist across save/load
- No data loss after multiple save/load cycles
- Phase 3A score: 98 → 100 ✅

---

### 3.3 Create Event System UI Components
**Current Score Impact:** -2 points
**Target Score Gain:** +2 points
**Time:** 4 hours

**Files to Create:**
- `src/components/EventPanel.jsx` (~200 lines)
- `src/components/EventPanel.css` (~150 lines)

**EventPanel.jsx Implementation:**
```javascript
import React, { useState } from 'react';
import { Zap, AlertTriangle, Sun, Gift, X } from 'lucide-react';
import './EventPanel.css';

/**
 * EventPanel Component
 * Displays active events and recent event history
 */
function EventPanel({ activeEvents, eventHistory, onForceCancel }) {
  const [expanded, setExpanded] = useState(true);

  const getEventIcon = (type) => {
    switch (type) {
      case 'DISASTER': return <AlertTriangle size={20} color="#ef4444" />;
      case 'SEASONAL': return <Sun size={20} color="#f59e0b" />;
      case 'POSITIVE': return <Gift size={20} color="#10b981" />;
      default: return <Zap size={20} />;
    }
  };

  const getEventClass = (type) => {
    switch (type) {
      case 'DISASTER': return 'event-disaster';
      case 'SEASONAL': return 'event-seasonal';
      case 'POSITIVE': return 'event-positive';
      default: return 'event-default';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="event-panel">
      <div className="event-panel-header">
        <h3>
          <Zap size={16} /> Events
          {activeEvents.length > 0 && (
            <span className="event-count">{activeEvents.length}</span>
          )}
        </h3>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
        <>
          {/* Active Events */}
          {activeEvents.length > 0 && (
            <div className="active-events">
              <h4>Active</h4>
              {activeEvents.map(event => (
                <div key={event.id} className={`event-card ${getEventClass(event.type)}`}>
                  <div className="event-card-header">
                    {getEventIcon(event.type)}
                    <span className="event-name">{event.name}</span>
                    {onForceCancel && (
                      <button
                        className="event-cancel"
                        onClick={() => onForceCancel(event.id)}
                        title="Cancel event (debug)"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <p className="event-description">{event.description}</p>

                  {/* Time remaining */}
                  <div className="event-timer">
                    <div className="event-timer-bar">
                      <div
                        className="event-timer-fill"
                        style={{
                          width: `${(event.timeRemaining / event.duration) * 100}%`
                        }}
                      />
                    </div>
                    <span className="event-time">
                      {formatTime(event.timeRemaining)} remaining
                    </span>
                  </div>

                  {/* Effects */}
                  {event.effects && (
                    <div className="event-effects">
                      {event.effects.production && (
                        <span className="event-effect">
                          📈 Production {event.effects.production > 0 ? '+' : ''}
                          {(event.effects.production * 100).toFixed(0)}%
                        </span>
                      )}
                      {event.effects.morale && (
                        <span className="event-effect">
                          😊 Morale {event.effects.morale > 0 ? '+' : ''}
                          {event.effects.morale}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No Active Events */}
          {activeEvents.length === 0 && (
            <div className="no-events">
              <p>No active events</p>
            </div>
          )}

          {/* Event History (last 5) */}
          {eventHistory && eventHistory.length > 0 && (
            <div className="event-history">
              <h4>Recent History</h4>
              {eventHistory.slice(-5).reverse().map((item, idx) => (
                <div key={idx} className="history-item">
                  {getEventIcon(item.event.type)}
                  <span>{item.event.name}</span>
                  <span className="history-time">
                    {new Date(item.completedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EventPanel;
```

**Integration in GameScreen.jsx:**
```javascript
import EventPanel from './EventPanel';

// In left sidebar (with ResourcePanel and NPCPanel)
{gameManager && gameManager.orchestrator && gameManager.orchestrator.eventSystem && (
  <div style={{ marginTop: '16px' }}>
    <EventPanel
      activeEvents={gameState.phase3b?.activeEvents || []}
      eventHistory={gameManager.orchestrator.eventSystem.getHistory(5)}
      onForceCancel={(eventId) => {
        gameManager.orchestrator.eventSystem.cancelEvent(eventId);
      }}
    />
  </div>
)}
```

**Testing:**
- [ ] Panel displays active events
- [ ] Timer counts down correctly
- [ ] Effects shown properly
- [ ] Event history updates
- [ ] Cancel button works (debug mode)

**Acceptance Criteria:**
- EventPanel displays active events
- Timer animations smooth
- Mobile responsive
- Phase 3B score: 98 → 100 ✅

---

### 3.4 Create Tutorial UI Components
**Current Score Impact:** -2 points
**Target Score Gain:** +2 points
**Time:** 4 hours

**Files to Modify:**
- `src/components/TutorialOverlay.jsx` (exists, needs update)

**Files to Create:**
- `src/components/TutorialMessage.jsx` (~150 lines)
- `src/components/TutorialHighlight.jsx` (~100 lines)

**TutorialMessage.jsx:**
```javascript
import React from 'react';
import { HelpCircle, ArrowRight, X } from 'lucide-react';
import './TutorialMessage.css';

/**
 * TutorialMessage Component
 * Displays tutorial step with highlighting and instructions
 */
function TutorialMessage({
  step,
  totalSteps,
  onNext,
  onSkip,
  highlightElement
}) {
  return (
    <div className="tutorial-message">
      <div className="tutorial-header">
        <HelpCircle size={20} />
        <span className="tutorial-title">{step.title}</span>
        <button className="tutorial-skip" onClick={onSkip}>
          <X size={16} /> Skip
        </button>
      </div>

      <div className="tutorial-body">
        <p className="tutorial-text">{step.message}</p>

        {step.hint && (
          <div className="tutorial-hint">
            💡 <span>{step.hint}</span>
          </div>
        )}
      </div>

      <div className="tutorial-footer">
        <span className="tutorial-progress">
          Step {step.stepNumber} of {totalSteps}
        </span>

        {step.canProgress && (
          <button className="tutorial-next" onClick={onNext}>
            Next <ArrowRight size={16} />
          </button>
        )}

        {!step.canProgress && (
          <span className="tutorial-waiting">
            Complete the action to continue...
          </span>
        )}
      </div>
    </div>
  );
}

export default TutorialMessage;
```

**Integration in GameScreen.jsx:**
```javascript
import TutorialMessage from './TutorialMessage';

// After viewport
{gameManager &&
 gameManager.orchestrator &&
 gameManager.orchestrator.tutorialSystem &&
 gameManager.orchestrator.tutorialSystem.isActive && (
  <TutorialMessage
    step={gameManager.orchestrator.tutorialSystem.getCurrentStep()}
    totalSteps={gameManager.orchestrator.tutorialSystem.getTotalSteps()}
    onNext={() => gameManager.orchestrator.tutorialSystem.nextStep()}
    onSkip={() => gameManager.orchestrator.tutorialSystem.skipTutorial()}
    highlightElement={gameManager.orchestrator.tutorialSystem.getHighlightTarget()}
  />
)}
```

**Testing:**
- [ ] Tutorial message displays on new game
- [ ] Steps progress correctly
- [ ] Highlighting works
- [ ] Skip button works
- [ ] Mobile responsive

**Acceptance Criteria:**
- Tutorial guides new players through 12 steps
- UI highlights are clear
- Can skip tutorial
- Phase 3D score: 100 ✅

---

## Priority 4: Polish & Optimization (4 hours)

### 4.1 Performance Optimization
**Time:** 2 hours

**Tasks:**
- [ ] Profile Phase 3A with 100 NPCs
- [ ] Optimize need update loops
- [ ] Cache decision tree results
- [ ] Batch task updates
- [ ] Add performance monitoring

**Targets:**
- Phase 3A: <2ms per tick ✅
- Phase 3B: <0.5ms per tick ✅
- Phase 3C: <0.3ms per tick ✅
- Phase 3D: <0.1ms per tick ✅

---

### 4.2 Documentation Polish
**Time:** 1 hour

**Tasks:**
- [ ] Update README with Phase 3 features
- [ ] Add API documentation for each system
- [ ] Create usage examples
- [ ] Document achievement rewards
- [ ] Add troubleshooting guide

---

### 4.3 Integration Testing
**Time:** 1 hour

**Tasks:**
- [ ] Test all 4 phases together
- [ ] Test save/load full Phase 3 state
- [ ] Test achievement unlocking flow
- [ ] Test event survival tracking
- [ ] Test tutorial completion
- [ ] Load test with 100 NPCs + 5 events + 50 achievements

---

## Implementation Timeline

### Day 1: Critical Fixes (3 hours)
- ✅ Morning: Connect Tutorial System (1h)
- ✅ Morning: Fix event cancellation (15m)
- ✅ Morning: Wire achievement rewards (45m)
- ✅ Afternoon: Test critical fixes (1h)

### Day 2: Testing (8-10 hours)
- ✅ Morning: Phase 3A unit tests (4h)
- ✅ Afternoon: Phase 3C expanded tests (2h)
- ✅ Evening: Memory cleanup + save/load (4h)

### Day 3: UI Components (8 hours)
- ✅ Morning: EventPanel UI (4h)
- ✅ Afternoon: Tutorial UI (4h)

### Day 4: Polish (4 hours)
- ✅ Morning: Performance optimization (2h)
- ✅ Afternoon: Documentation + integration testing (2h)

**Total Time:** 23-27 hours (~3-4 days)

---

## Success Criteria

### Phase 3A: 100/100 ✅
- [x] All unit tests passing (80%+ coverage)
- [x] Memory cleanup implemented
- [x] Save/load support complete
- [x] Performance: <2ms per tick with 100 NPCs

### Phase 3B: 100/100 ✅
- [x] Event cancellation bug fixed
- [x] EventPanel UI created and integrated
- [x] All 9 events tested and working
- [x] Performance: <0.5ms per tick

### Phase 3C: 100/100 ✅
- [x] Rewards actually apply to gameplay
- [x] Full test coverage (80%+)
- [x] All 50 achievements unlockable
- [x] UI shows applied bonuses

### Phase 3D: 100/100 ✅
- [x] Connected in GameManager
- [x] Tutorial UI complete
- [x] All 12 steps functional
- [x] Context help active
- [x] Feature unlocking works

### Overall Phase 3: 100/100 ✅
- [x] All systems integrated
- [x] Full test coverage (80%+)
- [x] Complete UI for all features
- [x] Save/load complete
- [x] Performance targets met
- [x] Zero critical bugs
- [x] Documentation complete

---

## Risk Assessment

**Low Risk:**
- Testing tasks (just time-consuming)
- UI component creation (straightforward)
- Documentation updates

**Medium Risk:**
- Achievement reward system (complexity in applying bonuses)
- Memory cleanup (must test thoroughly)
- Save/load integration (state management)

**High Risk:**
- None identified

**Mitigation:**
- Create comprehensive tests first
- Test each integration point separately
- Use feature flags for gradual rollout

---

## Deliverables Checklist

### Code
- [ ] Phase 3A unit tests (400 lines)
- [ ] Phase 3C expanded tests (250 lines)
- [ ] Memory cleanup methods (50 lines)
- [ ] Save/load serialization (150 lines)
- [ ] Event cancellation fix (20 lines)
- [ ] Achievement reward wiring (100 lines)
- [ ] Tutorial connection (50 lines)
- [ ] EventPanel UI (350 lines)
- [ ] Tutorial UI updates (250 lines)

**Total New Code:** ~1,620 lines

### Documentation
- [ ] Updated PHASE_3_AUDIT_REPORT.md
- [ ] API documentation for each system
- [ ] Usage examples
- [ ] README updates

### Tests
- [ ] 140+ new test cases
- [ ] 80%+ coverage for all phases
- [ ] Performance benchmarks
- [ ] Integration test suite

---

## Post-Completion Verification

After completing all tasks, verify:

1. **Run Full Test Suite**
   ```bash
   npm test
   # Target: 100% tests passing, 80%+ coverage
   ```

2. **Performance Test**
   ```bash
   # Start game with 100 NPCs, 5 active events, 50 achievements
   # Monitor: FPS should stay above 50
   # Tick time should be <5ms
   ```

3. **Memory Test**
   ```bash
   # Run game for 10,000 ticks (2.7 hours)
   # Memory should not grow beyond 500MB
   ```

4. **Save/Load Test**
   ```bash
   # Create complex game state
   # Save, reload, verify all state preserved
   # Repeat 10 times
   ```

5. **User Experience Test**
   - [ ] New player completes tutorial
   - [ ] Achievements unlock naturally
   - [ ] Events feel balanced
   - [ ] UI is responsive and clear

---

**Ready to begin Phase 3 perfection! 🚀**
