# Hybrid Game Integration Plan

**Last Updated:** 2025-11-15
**Author:** Claude (AI Assistant)
**Status:** Active
**Purpose:** Comprehensive plan to integrate old action RPG combat with new settlement management game

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Phase Breakdown](#phase-breakdown)
4. [File Structure](#file-structure)
5. [Risk Mitigation](#risk-mitigation)
6. [Success Criteria](#success-criteria)
7. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

### Project Goal

Create a unified hybrid game combining settlement management (current game) with action RPG combat (old game) through an expedition and defense system.

### Key Features

- **Mode Switching** - Seamlessly switch between settlement, expedition, and defense modes
- **Shared Resources** - Resources earned in expeditions flow to settlement
- **NPC Combat System** - NPCs gain combat stats, equipment, and skills
- **Expedition System** - Send NPC parties on dungeon runs for loot
- **Raid Defense** - Defend settlement from attacks in action mode
- **Cross-Mode Bonuses** - Combat-leveled NPCs boost settlement production

### Estimated Effort

**40-60 hours** total across 8 phases

---

## Architecture Overview

### Game Modes

| Mode | Type | Description |
|------|------|-------------|
| **Settlement** | Primary | Current settlement management gameplay |
| **Expedition** | Secondary | Action RPG combat on expeditions with NPC party |
| **Defense** | Special Event | Tower defense-style raid defense |

### Core Integration Points

```
┌─────────────────────────────────────────────────┐
│           Unified Game State                    │
│  (Resources, Inventory, NPCs, Buildings)        │
└─────────────────┬───────────────────────────────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
┌────▼─────┐ ┌───▼────┐ ┌────▼─────┐
│Settlement│ │Expedition│ │ Defense  │
│   Mode   │ │  Mode   │ │   Mode   │
└──────────┘ └─────────┘ └──────────┘
     │            │            │
     └────────────┼────────────┘
                  │
     ┌────────────▼────────────┐
     │  Shared Resource Flow   │
     │  Shared Inventory       │
     │  NPC Combat Stats       │
     └─────────────────────────┘
```

### Data Flow

**Settlement → Expedition:**
1. Select party (4 NPCs max)
2. Assign equipment from shared inventory
3. Select expedition type and difficulty
4. Enter combat mode with party

**Expedition → Settlement:**
1. Complete expedition (win/lose)
2. Loot added to shared inventory
3. Resources added to storage
4. NPCs gain combat XP/levels
5. NPCs may be injured/fatigued
6. Return to settlement mode

**Raid → Defense → Settlement:**
1. Raid warning notification
2. Auto-switch to defense mode
3. Fight waves of enemies
4. Defend buildings and NPCs
5. Victory/defeat results
6. Repair damaged buildings
7. Return to settlement

---

## Phase Breakdown

### Phase 1: Foundation & Shared Systems (8-10 hours)

**Goal:** Create the infrastructure for mode switching and shared resources

#### 1.1 Unified State Management (2 hours)

**File:** `src/core/UnifiedGameState.js`

```javascript
class UnifiedGameState {
  constructor() {
    this.currentMode = 'settlement'; // 'settlement' | 'expedition' | 'defense'
    this.sharedResources = {
      gold: 0,
      essence: 0,
      crystals: 0,
      food: 0,
      wood: 0,
      stone: 0
    };
    this.sharedInventory = {
      equipment: [],
      consumables: [],
      materials: []
    };
    this.expeditionState = null;
    this.defenseState = null;
  }
}
```

**Tasks:**
- [ ] Design shared state schema
- [ ] Add `currentMode` tracking
- [ ] Add `sharedInventory` structure
- [ ] Add `sharedResources` structure
- [ ] Add `expeditionState` for active expeditions
- [ ] Add `defenseState` for active raids

#### 1.2 Mode Manager (2 hours)

**File:** `src/core/ModeManager.js`

**Tasks:**
- [ ] Implement `switchMode(targetMode, context)` function
- [ ] Implement mode transition validation (can only switch at base)
- [ ] Implement state preservation during mode switch
- [ ] Implement cleanup for previous mode
- [ ] Implement `getCurrentMode()` getter
- [ ] Add event emitters for mode changes

#### 1.3 Shared Resource System (2 hours)

**File:** `src/shared/SharedResourceManager.js`

**Tasks:**
- [ ] Extend existing StorageManager for cross-mode access
- [ ] Implement `addResourceFromExpedition(resource, amount)`
- [ ] Implement `canAffordExpedition(requirements)` checker
- [ ] Add resource conversion utilities
- [ ] Track resource sources (expedition vs production)

#### 1.4 Shared Inventory System (2-3 hours)

**File:** `src/shared/SharedInventoryManager.js`

**Tasks:**
- [ ] Merge old game inventory with new game structure
- [ ] Implement equipment slots (weapon, armor, accessory)
- [ ] Implement consumables management (potions, scrolls)
- [ ] Implement materials management
- [ ] Add `equipItem(item, slot)` function
- [ ] Add `unequipItem(slot)` function
- [ ] Add `useConsumable(itemId)` function
- [ ] Implement persistence across mode switches

---

### Phase 2: NPC Combat System Integration (10-12 hours)

**Goal:** Transform NPCs from workers into combat-capable units

#### 2.1 Extend NPC Data Model (2 hours)

**File:** `src/modules/npc-system/NPCManager.js`

**New NPC Properties:**
```javascript
{
  // Existing properties...
  combatStats: {
    health: { current: 100, max: 100 },
    damage: 10,
    defense: 0,
    speed: 3,
    critChance: 5,
    critDamage: 150,
    dodgeChance: 5
  },
  equipment: {
    weapon: null,
    armor: null,
    accessory: null
  },
  combatLevel: 1,
  combatXP: 0,
  skills: [],
  expeditionCount: 0
}
```

**Tasks:**
- [ ] Add `combatStats` to NPC schema
- [ ] Add `equipment` slots to NPCs
- [ ] Add `combatLevel` and `combatXP` fields
- [ ] Add `skills` array for combat skills
- [ ] Add `expeditionCount` tracker
- [ ] Implement `levelUpCombat(npcId)` function

#### 2.2 NPC Skill System (3 hours)

**File:** `src/modules/combat/NPCSkillSystem.js`

**Skill Categories:**
- Combat: Power Strike, Critical Hit, Deadly Blow
- Magic: Mana Pool, Spell Power, Fast Casting
- Defense: Iron Skin, Vitality, Evasion
- Utility: Swiftness, Fortune, Regeneration

**Tasks:**
- [ ] Port skill tree from old game
- [ ] Adapt skills for NPC use (AI-friendly)
- [ ] Implement skill unlock based on combat level
- [ ] Implement skill application in combat
- [ ] Add skill point allocation system
- [ ] Create skill templates for different roles

#### 2.3 NPC Party System (3 hours)

**File:** `src/modules/expedition/NPCPartyManager.js`

**Tasks:**
- [ ] Implement party composition (max 4 NPCs)
- [ ] Add role assignment (tank, damage, support, utility)
- [ ] Implement party stat calculation (combined bonuses)
- [ ] Add party formation system (positioning)
- [ ] Implement party inventory (shared loot)
- [ ] Add `addToParty(npcId, role)` function
- [ ] Add `removeFromParty(npcId)` function
- [ ] Add `getPartyStats()` aggregator

#### 2.4 NPC Equipment System (2-3 hours)

**File:** `src/modules/combat/NPCEquipmentManager.js`

**Tasks:**
- [ ] Implement equipment for NPCs (uses shared inventory)
- [ ] Add equipment stat modifiers
- [ ] Implement equipment durability
- [ ] Add equipment tier restrictions
- [ ] Implement `equipNPC(npcId, item, slot)` function
- [ ] Add equipment comparison helpers
- [ ] Implement auto-equip for new recruits

#### 2.5 Settlement Bonuses from NPCs (1-2 hours)

**File:** `src/modules/resource-economy/ProductionTick.js`

**Tasks:**
- [ ] Add combat stat bonuses to production calculations
- [ ] Higher NPC combat level = better production (1% per level)
- [ ] Equipment bonuses apply to building efficiency
- [ ] Add "Veteran" trait after 10 expeditions (+5% production)

---

### Phase 3: Expedition System (12-15 hours)

**Goal:** Implement full dungeon-crawling expedition gameplay

#### 3.1 Expedition Framework (3 hours)

**File:** `src/modules/expedition/ExpeditionManager.js`

**Expedition Types:**
- **Dungeon Crawl** - Clear enemies, collect loot
- **Wilderness Patrol** - Explore, gather resources
- **Boss Hunt** - High risk, high reward

**Tasks:**
- [ ] Implement expedition generation (difficulty, rewards, duration)
- [ ] Add expedition types with different mechanics
- [ ] Implement expedition requirements (party size, level)
- [ ] Add expedition state tracking
- [ ] Implement `createExpedition(type, difficulty)` function
- [ ] Add `startExpedition(expeditionId, party)` function
- [ ] Implement `completeExpedition(expeditionId, result)` function

#### 3.2 Refactor Combat System (4-5 hours)

**File:** `src/modules/combat/CombatEngine.js`

**Tasks:**
- [ ] Extract combat logic from old game monolithic component
- [ ] Convert to class-based system (not React hooks)
- [ ] Implement combat state management separately from rendering
- [ ] Add NPC party combat (multiple controllable units)
- [ ] Implement AI for party members (basic follow/attack)
- [ ] Add loot drop system integration
- [ ] Optimize performance for larger battles

#### 3.3 Expedition Game Mode (3-4 hours)

**File:** `src/modules/expedition/ExpeditionGameMode.js`

**Tasks:**
- [ ] Implement mode initialization with party
- [ ] Load dungeon/wilderness map from old game
- [ ] Initialize combat engine with party NPCs
- [ ] Implement expedition win/lose conditions
- [ ] Add expedition timer (optional time limit)
- [ ] Implement resource collection during expedition
- [ ] Add return-to-settlement transition

#### 3.4 Expedition UI (2-3 hours)

**Files:**
- `src/components/expedition/ExpeditionPrep.jsx`
- `src/components/expedition/ExpeditionHUD.jsx`

**Tasks:**
- [ ] Create party selection interface
- [ ] Create equipment assignment UI
- [ ] Create expedition details and rewards preview
- [ ] Add start expedition button with validation
- [ ] Create health/mana bars for party members
- [ ] Create inventory/loot tracker
- [ ] Add minimap (optional)
- [ ] Add return to base button

#### 3.5 Expedition Rewards (1-2 hours)

**File:** `src/modules/expedition/ExpeditionRewards.js`

**Tasks:**
- [ ] Calculate rewards based on difficulty and performance
- [ ] Grant resources to settlement
- [ ] Grant equipment to shared inventory
- [ ] Grant XP to participating NPCs
- [ ] Update NPC combat stats
- [ ] Apply fatigue/injury to NPCs
- [ ] Trigger achievement checks

---

### Phase 4: Defense/Raid System (8-10 hours)

**Goal:** Add tower defense gameplay to protect settlement

#### 4.1 Raid Event System (2-3 hours)

**File:** `src/modules/events/RaidEventGenerator.js`

**Tasks:**
- [ ] Extend existing EventSystem for raids
- [ ] Implement raid triggers (random, scripted, story-based)
- [ ] Add raid difficulty scaling (population, tier, wealth)
- [ ] Implement raid types (bandits, monsters, sieges)
- [ ] Add warning system (countdown before raid)
- [ ] Implement `scheduleRaid(type, difficulty, delay)` function

#### 4.2 Defense Mode (3-4 hours)

**File:** `src/modules/defense/DefenseGameMode.js`

**Tasks:**
- [ ] Initialize settlement map for defense
- [ ] Spawn enemy waves from edges
- [ ] Implement NPC guard AI (defend buildings)
- [ ] Add defensive building effects (towers shoot, walls block)
- [ ] Implement player control (command NPCs, cast spells)
- [ ] Add wave progression system
- [ ] Implement win/lose conditions

#### 4.3 Defensive Buildings (2 hours)

**Tasks:**
- [ ] Update building configs with defense stats
- [ ] Add `defensePower` to guard towers
- [ ] Add `durability` and `damage` to all buildings
- [ ] Implement building repair system
- [ ] Add defensive bonuses (walls reduce damage by 50%)
- [ ] Implement guard tower targeting AI
- [ ] Add barricades and traps

#### 4.4 Defense UI (1-2 hours)

**File:** `src/components/defense/DefenseHUD.jsx`

**Tasks:**
- [ ] Create wave counter and progress bar
- [ ] Add building health indicators
- [ ] Show guard status and positioning
- [ ] Add enemy spawn indicators
- [ ] Create victory/defeat screen with results

---

### Phase 5: Gameplay Integration & Balance (6-8 hours)

**Goal:** Make all systems work together smoothly

#### 5.1 Mode Transitions (2 hours)

**Tasks:**
- [ ] Add base building interaction to enter expedition mode
- [ ] Implement "Expedition Hall" building type
- [ ] Create transition loading screen
- [ ] Preserve settlement tick state during expedition
- [ ] Auto-save before mode switch
- [ ] Implement return transition with rewards summary
- [ ] Add raid alert interruption

#### 5.2 Resource Flow Balancing (2 hours)

**Tasks:**
- [ ] Design expedition resource rewards table
- [ ] Balance expedition costs vs rewards
- [ ] Adjust settlement production rates
- [ ] Tune NPC combat progression curve
- [ ] Balance raid difficulty and frequency
- [ ] Create risk/reward matrix

#### 5.3 Progression Integration (2 hours)

**Tasks:**
- [ ] Sync tier progression between modes
- [ ] Lock expeditions behind tier gates
- [ ] Require expeditions for tier advancement
- [ ] Add expedition-exclusive resources
- [ ] Implement boss expeditions for tier unlocks
- [ ] Create progression milestones

#### 5.4 Tutorial Updates (1-2 hours)

**Tasks:**
- [ ] Add expedition tutorial steps
- [ ] Add defense tutorial steps
- [ ] Update context help for new systems
- [ ] Add expedition UI hints
- [ ] Update achievement system

---

### Phase 6: UI/UX Integration (5-6 hours)

**Goal:** Create intuitive interfaces for all new systems

#### 6.1 Main UI Updates (2 hours)

**Tasks:**
- [ ] Add mode indicator to main HUD
- [ ] Add expedition button to base UI
- [ ] Add party management panel
- [ ] Update resource display for shared resources
- [ ] Add raid warning notifications
- [ ] Create mode transition animations

#### 6.2 Expedition Planning UI (2 hours)

**Tasks:**
- [ ] Create expedition board (shows available expeditions)
- [ ] Create party composition interface
- [ ] Create equipment loadout screen
- [ ] Add supply preparation panel
- [ ] Add expedition preview panel
- [ ] Add launch expedition button

#### 6.3 Settlement Defense UI (1-2 hours)

**Tasks:**
- [ ] Add fortification panel
- [ ] Create guard assignment interface
- [ ] Add defensive structure placement UI
- [ ] Create raid countdown timer
- [ ] Add battle command interface

---

### Phase 7: Persistence & Save System (3-4 hours)

**Goal:** Ensure all data persists correctly

#### 7.1 Update Save System (2 hours)

**File:** `src/persistence/BrowserSaveManager.js`

**Tasks:**
- [ ] Add expedition state to save data
- [ ] Add NPC combat stats to save data
- [ ] Add shared inventory to save data
- [ ] Add defense state to save data
- [ ] Implement versioning for save compatibility
- [ ] Add migration for old saves

#### 7.2 Edge Cases (1-2 hours)

**Tasks:**
- [ ] Handle loading during active expedition
- [ ] Handle loading during active raid
- [ ] Implement autosave before major events
- [ ] Add save validation for corruption
- [ ] Implement save backup system

---

### Phase 8: Testing & Polish (6-8 hours)

**Goal:** Ensure everything works perfectly

#### 8.1 Integration Testing (3 hours)

**Tasks:**
- [ ] Test mode switching (all combinations)
- [ ] Test resource flow across modes
- [ ] Test NPC assignment during expeditions
- [ ] Test raid interruptions
- [ ] Test save/load in all modes
- [ ] Test equipment persistence
- [ ] Test party composition edge cases

#### 8.2 Balance Testing (2 hours)

**Tasks:**
- [ ] Playtest expedition difficulty curve
- [ ] Test raid frequency and difficulty
- [ ] Verify resource generation rates
- [ ] Test NPC progression speed
- [ ] Balance equipment power levels

#### 8.3 Bug Fixing & Polish (2-3 hours)

**Tasks:**
- [ ] Fix mode transition bugs
- [ ] Fix combat system bugs
- [ ] Fix UI layout issues
- [ ] Fix save/load issues
- [ ] Performance optimization
- [ ] Add loading states
- [ ] Add error handling
- [ ] Polish animations and transitions

---

## File Structure

### New Core Files

```
src/
├── core/
│   ├── UnifiedGameState.js          # Shared game state
│   └── ModeManager.js                # Mode switching logic
├── shared/
│   ├── SharedResourceManager.js     # Cross-mode resources
│   └── SharedInventoryManager.js    # Cross-mode inventory
├── modules/
│   ├── combat/
│   │   ├── CombatEngine.js          # Refactored combat
│   │   ├── NPCSkillSystem.js        # NPC skills
│   │   └── NPCEquipmentManager.js   # NPC equipment
│   ├── expedition/
│   │   ├── ExpeditionManager.js     # Expedition core
│   │   ├── NPCPartyManager.js       # Party management
│   │   ├── ExpeditionGameMode.js    # Expedition mode
│   │   └── ExpeditionRewards.js     # Reward system
│   ├── defense/
│   │   └── DefenseGameMode.js       # Defense mode
│   └── events/
│       └── RaidEventGenerator.js    # Raid events
└── components/
    ├── expedition/
    │   ├── ExpeditionPrep.jsx       # Prep screen
    │   └── ExpeditionHUD.jsx        # Combat HUD
    ├── defense/
    │   └── DefenseHUD.jsx           # Defense HUD
    └── shared/
        ├── ModeIndicator.jsx        # Mode display
        └── PartyPanel.jsx           # Party management UI
```

**Total New Files:** 17

---

## Risk Mitigation

### Risk 1: Performance Issues

**Symptoms:** Frame drops during combat, UI lag

**Mitigation:**
- Use object pooling for combat entities
- Limit active NPCs in combat to 20 max
- Implement spatial partitioning for collision detection
- Use RequestAnimationFrame for smooth rendering
- Profile and optimize hot code paths

### Risk 2: State Synchronization Bugs

**Symptoms:** Resources disappearing, NPCs lost between modes

**Mitigation:**
- Strict state validation on mode switches
- Deep copy state objects during transitions
- Comprehensive integration tests
- Transaction-based state updates
- Rollback mechanism for failed transitions

### Risk 3: Save Data Corruption

**Symptoms:** Game crashes on load, lost progress

**Mitigation:**
- Save versioning with migration paths
- Validation before writing saves
- Backup saves before major changes
- Checksum verification on load
- Recovery mode for corrupted saves

### Risk 4: Balancing Complexity

**Symptoms:** Too easy/hard, broken progression

**Mitigation:**
- Start with conservative values
- Iterate based on playtesting
- Track metrics (win rate, time to complete)
- Difficulty tiers for different player skill levels
- Tunable parameters for easy adjustment

### Risk 5: UI Complexity

**Symptoms:** Confusing interfaces, unclear mechanics

**Mitigation:**
- Progressive disclosure (show features as unlocked)
- Clear mode indicators
- Comprehensive tutorial system
- Context-sensitive help
- User testing and feedback

---

## Success Criteria

The integration is complete when all of these criteria are met:

### Functional Requirements

- ✅ Can switch between settlement, expedition, and defense modes
- ✅ Resources earned in expeditions appear in settlement
- ✅ Inventory items persist across modes
- ✅ NPCs can be assigned to expeditions and return with loot
- ✅ NPC combat stats improve settlement production
- ✅ Raids can be defended in action mode
- ✅ Defensive buildings function in combat
- ✅ All data persists across mode switches
- ✅ All data persists across save/load cycles

### Performance Requirements

- ✅ Game runs at 60 FPS in settlement mode
- ✅ Game runs at 60 FPS in expedition mode (with party of 4)
- ✅ Game runs at 60 FPS in defense mode (with 10 guards, 20 enemies)
- ✅ Mode transitions complete in < 2 seconds
- ✅ Save/load operations complete in < 1 second

### Quality Requirements

- ✅ No game-breaking bugs in core gameplay loop
- ✅ No data loss during mode switches
- ✅ No crashes during combat
- ✅ All UI elements are responsive and accessible
- ✅ Tutorial covers all new systems

### Balance Requirements

- ✅ Expeditions provide meaningful rewards without breaking economy
- ✅ Combat difficulty scales appropriately with NPC level
- ✅ Raids are challenging but beatable
- ✅ Progression feels satisfying (not too slow or fast)
- ✅ All game modes feel rewarding

---

## Timeline & Milestones

### Milestone 1: Foundation (Phases 1-2)
**Duration:** 18-22 hours
**Deliverable:** Mode switching works, shared resources/inventory functional, NPCs have combat stats

**Critical Path:**
1. UnifiedGameState → ModeManager → Mode transitions working
2. SharedResourceManager → Resource flow working
3. NPC combat stats → Equipment system → NPC party system

### Milestone 2: Expeditions (Phase 3)
**Duration:** +12-15 hours (30-37 hours total)
**Deliverable:** Can send NPC parties on expeditions, combat works, rewards flow to settlement

**Critical Path:**
1. ExpeditionManager → CombatEngine refactor → Expedition mode working
2. Expedition UI → Party combat → Loot system
3. Integration with settlement → Reward flow working

### Milestone 3: Defense (Phase 4)
**Duration:** +8-10 hours (38-47 hours total)
**Deliverable:** Raids trigger, can defend settlement in action mode

**Critical Path:**
1. RaidEventGenerator → Defense mode → Wave system
2. Defensive buildings → Guard AI → Combat integration
3. Defense UI → Victory/defeat conditions

### Milestone 4: Polish (Phases 5-8)
**Duration:** +6-20 hours (44-60 hours total)
**Deliverable:** Fully integrated, balanced, tested hybrid game

**Critical Path:**
1. Mode transitions → Resource balancing → Progression integration
2. UI/UX polish → Tutorial updates
3. Save system updates → Testing → Bug fixes

### Phased Rollout Strategy

**Week 1-2:** Milestones 1-2 (Foundation + Expeditions)
**Week 3:** Milestone 3 (Defense)
**Week 4:** Milestone 4 (Polish)

**Recommended Approach:** Implement sequentially, test after each milestone

---

## References

**Related Documentation:**
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - System architecture
- [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md) - Development patterns
- [CURRENT_STATUS.md](../../CURRENT_STATUS.md) - Current project status

**Old Game Source:**
- `src/Older App files/App(functional-Craft-Skills.js` - Old RPG combat system
- `src/Older App files/App(Oldest).js` - Original action RPG

**New Game Core:**
- `src/core/GameEngine.js` - Main game loop
- `src/core/ModuleOrchestrator.js` - Module coordinator
- `src/modules/npc-system/` - NPC system

---

**Document Created:** 2025-11-15
**Version:** 1.0
**Estimated Completion:** 2-4 weeks (part-time) or 1-1.5 weeks (full-time)
