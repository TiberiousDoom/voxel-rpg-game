# Hybrid Game Integration Plan
## Old Action RPG + New Settlement Management Game

**Project Goal:** Create a unified hybrid game combining settlement management with action RPG combat through an expedition system.

**Estimated Total Time:** 40-60 hours

---

## Architecture Overview

### Game Modes
1. **Settlement Mode** (Primary) - Current settlement management gameplay
2. **Expedition Mode** (Secondary) - Action RPG combat on expeditions
3. **Defense Mode** (Special) - Defend settlement from raids

### Core Integration Points
- **Shared Resources**: Resources earned in expeditions flow to settlement
- **Shared Inventory**: Equipment and items persist across modes
- **NPC System**: NPCs can be sent on expeditions and provide combat bonuses
- **Mode Switcher**: Seamless transitions at home base

---

## Phase 1: Foundation & Shared Systems (8-10 hours)

### 1.1 Create Unified State Management (2 hours)
- [ ] Create `/src/core/UnifiedGameState.js`
- [ ] Design shared state schema for both modes
- [ ] Add `currentMode` field ('settlement', 'expedition', 'defense')
- [ ] Add `sharedInventory` structure (equipment, consumables, materials)
- [ ] Add `sharedResources` structure (gold, essence, crystals, food, wood, stone)
- [ ] Add `expeditionState` for tracking active expeditions
- [ ] Add `defenseState` for tracking active raids

### 1.2 Create Mode Manager (2 hours)
- [ ] Create `/src/core/ModeManager.js`
- [ ] Implement `switchMode(targetMode, context)` function
- [ ] Implement mode transition validation (can only switch at base)
- [ ] Implement state preservation during mode switch
- [ ] Implement cleanup for previous mode
- [ ] Implement `getCurrentMode()` getter
- [ ] Add event emitters for mode changes

### 1.3 Integrate Shared Resource System (2 hours)
- [ ] Create `/src/shared/SharedResourceManager.js`
- [ ] Extend existing StorageManager for cross-mode access
- [ ] Implement `addResourceFromExpedition(resource, amount)`
- [ ] Implement `canAffordExpedition(requirements)` checker
- [ ] Add resource conversion utilities (expedition loot → settlement resources)
- [ ] Track resource sources (expedition vs settlement production)

### 1.4 Create Shared Inventory System (2-3 hours)
- [ ] Create `/src/shared/SharedInventoryManager.js`
- [ ] Merge old game inventory structure with new game
- [ ] Implement equipment slots (weapon, armor, accessory)
- [ ] Implement consumables management (potions, scrolls)
- [ ] Implement materials management (crafting, essence, crystals)
- [ ] Add `equipItem(item, slot)` function
- [ ] Add `unequipItem(slot)` function
- [ ] Add `useConsumable(itemId)` function
- [ ] Implement persistence across mode switches

---

## Phase 2: NPC Combat System Integration (10-12 hours)

### 2.1 Extend NPC Data Model (2 hours)
- [ ] Update `/src/modules/npc-system/NPCManager.js`
- [ ] Add `combatStats` to NPC schema:
  - `health` (current/max)
  - `damage` (base attack)
  - `defense` (damage reduction)
  - `speed` (movement in combat)
  - `critChance` (%)
  - `critDamage` (%)
  - `dodgeChance` (%)
- [ ] Add `equipment` slots to NPCs (weapon, armor)
- [ ] Add `combatLevel` and `combatXP` fields
- [ ] Add `skills` array for combat skills
- [ ] Implement `levelUpCombat(npcId)` function

### 2.2 Create NPC Skill System (3 hours)
- [ ] Create `/src/modules/combat/NPCSkillSystem.js`
- [ ] Port skill tree from old game (combat, magic, defense, utility)
- [ ] Adapt skills for NPC use (simpler AI-friendly version)
- [ ] Implement skill unlock based on combat level
- [ ] Implement skill application in combat
- [ ] Add skill point allocation (auto or manual)
- [ ] Create skill templates for different NPC roles

### 2.3 Create NPC Party System (3 hours)
- [ ] Create `/src/modules/expedition/NPCPartyManager.js`
- [ ] Implement party composition (max 4 NPCs)
- [ ] Add role assignment (tank, damage, support, utility)
- [ ] Implement party stat calculation (combined bonuses)
- [ ] Add party formation system (positioning)
- [ ] Implement party inventory (shared loot)
- [ ] Add `addToParty(npcId, role)` function
- [ ] Add `removeFromParty(npcId)` function
- [ ] Add `getPartyStats()` aggregator

### 2.4 Create NPC Equipment System (2-3 hours)
- [ ] Create `/src/modules/combat/NPCEquipmentManager.js`
- [ ] Implement equipment for NPCs (uses shared inventory)
- [ ] Add equipment stat modifiers
- [ ] Implement equipment durability
- [ ] Add equipment tier restrictions
- [ ] Implement `equipNPC(npcId, item, slot)` function
- [ ] Add equipment comparison helpers
- [ ] Implement auto-equip for new recruits

### 2.5 Settlement Bonuses from NPCs (1-2 hours)
- [ ] Update `/src/modules/resource-economy/ProductionTick.js`
- [ ] Add combat stat bonuses to production calculations
- [ ] Higher NPC combat level = better production (1% per level)
- [ ] Equipment bonuses apply to building efficiency
- [ ] Add "Veteran" trait after 10 expeditions (+5% all production)

---

## Phase 3: Expedition System (12-15 hours)

### 3.1 Create Expedition Framework (3 hours)
- [ ] Create `/src/modules/expedition/ExpeditionManager.js`
- [ ] Implement expedition generation (difficulty, rewards, duration)
- [ ] Add expedition types (dungeon, wilderness, boss hunt)
- [ ] Implement expedition requirements (party size, level)
- [ ] Add expedition state tracking (preparing, active, completed)
- [ ] Implement `createExpedition(type, difficulty)` function
- [ ] Add `startExpedition(expeditionId, party)` function
- [ ] Implement `completeExpedition(expeditionId, result)` function

### 3.2 Refactor Old Combat System (4-5 hours)
- [ ] Create `/src/modules/combat/CombatEngine.js`
- [ ] Extract combat logic from old game monolithic component
- [ ] Convert to class-based system (not React hooks)
- [ ] Implement combat state management separately from rendering
- [ ] Add NPC party combat (multiple units)
- [ ] Implement AI for party members (basic follow/attack)
- [ ] Add loot drop system integration with shared inventory
- [ ] Optimize performance for larger battles

### 3.3 Create Expedition Game Mode (3-4 hours)
- [ ] Create `/src/modules/expedition/ExpeditionGameMode.js`
- [ ] Implement mode initialization with party
- [ ] Load dungeon/wilderness map from old game
- [ ] Initialize combat engine with party NPCs
- [ ] Implement expedition win/lose conditions
- [ ] Add expedition timer (optional time limit)
- [ ] Implement resource collection during expedition
- [ ] Add return-to-settlement transition

### 3.4 Create Expedition UI (2-3 hours)
- [ ] Create `/src/components/expedition/ExpeditionPrep.jsx`
- [ ] Party selection interface
- [ ] Equipment assignment UI
- [ ] Expedition details and rewards preview
- [ ] Start expedition button with validation
- [ ] Create `/src/components/expedition/ExpeditionHUD.jsx`
- [ ] Health/mana bars for party members
- [ ] Inventory/loot tracker
- [ ] Minimap (optional)
- [ ] Return to base button

### 3.5 Integrate Expedition Rewards (1-2 hours)
- [ ] Create `/src/modules/expedition/ExpeditionRewards.js`
- [ ] Calculate rewards based on difficulty and performance
- [ ] Grant resources to settlement (gold, materials, essence)
- [ ] Grant equipment to shared inventory
- [ ] Grant XP to participating NPCs
- [ ] Update NPC combat stats
- [ ] Apply fatigue/injury to NPCs (needs rest)
- [ ] Trigger achievement checks

---

## Phase 4: Defense/Raid System (8-10 hours)

### 4.1 Create Raid Event System (2-3 hours)
- [ ] Create `/src/modules/events/RaidEventGenerator.js`
- [ ] Extend existing EventSystem for raids
- [ ] Implement raid triggers (random, scripted, story-based)
- [ ] Add raid difficulty scaling (population, tier, wealth)
- [ ] Implement raid types (bandits, monsters, sieges)
- [ ] Add warning system (countdown before raid)
- [ ] Implement `scheduleRaid(type, difficulty, delay)` function

### 4.2 Create Defense Mode (3-4 hours)
- [ ] Create `/src/modules/defense/DefenseGameMode.js`
- [ ] Initialize settlement map for defense
- [ ] Spawn enemy waves from edges
- [ ] Implement NPC guard AI (defend buildings)
- [ ] Add defensive building effects (towers shoot, walls block)
- [ ] Implement player control (command NPCs, cast spells)
- [ ] Add wave progression system
- [ ] Implement win/lose conditions (survive all waves / town destroyed)

### 4.3 Create Defensive Building System (2 hours)
- [ ] Update building configs with defense stats
- [ ] Add `defensePower` to guard towers
- [ ] Add `durability` and `damage` to all buildings
- [ ] Implement building repair system
- [ ] Add defensive bonuses (walls reduce damage by 50%)
- [ ] Implement guard tower targeting AI
- [ ] Add barricades and traps

### 4.4 Create Defense UI (1-2 hours)
- [ ] Create `/src/components/defense/DefenseHUD.jsx`
- [ ] Wave counter and progress
- [ ] Building health indicators
- [ ] Guard status and positioning
- [ ] Enemy spawn indicators
- [ ] Victory/defeat screen with results

---

## Phase 5: Gameplay Integration & Balance (6-8 hours)

### 5.1 Implement Mode Transitions (2 hours)
- [ ] Add base building interaction to enter expedition mode
- [ ] Implement "Expedition Hall" building type
- [ ] Create transition loading screen
- [ ] Preserve settlement tick state during expedition
- [ ] Auto-save before mode switch
- [ ] Implement return transition with rewards summary
- [ ] Add raid alert interruption (force back to settlement)

### 5.2 Resource Flow Balancing (2 hours)
- [ ] Design expedition resource rewards table
- [ ] Balance expedition costs vs rewards
- [ ] Adjust settlement production rates for hybrid gameplay
- [ ] Tune NPC combat progression curve
- [ ] Balance raid difficulty and frequency
- [ ] Create risk/reward matrix for expedition types

### 5.3 Progression Integration (2 hours)
- [ ] Sync tier progression between modes
- [ ] Lock expeditions behind tier gates
- [ ] Require expeditions for tier advancement (gather rare materials)
- [ ] Add expedition-exclusive resources
- [ ] Implement boss expeditions for major tier unlocks
- [ ] Create progression milestones

### 5.4 Tutorial Updates (1-2 hours)
- [ ] Add expedition tutorial steps
- [ ] Add defense tutorial steps
- [ ] Update context help for new systems
- [ ] Add expedition UI hints
- [ ] Update achievement system for combat/expeditions

---

## Phase 6: UI/UX Integration (5-6 hours)

### 6.1 Update Main UI (2 hours)
- [ ] Add mode indicator to main HUD
- [ ] Add expedition button to base UI
- [ ] Add party management panel
- [ ] Update resource display for shared resources
- [ ] Add raid warning notifications
- [ ] Create mode transition animations

### 6.2 Create Expedition Planning UI (2 hours)
- [ ] Create expedition board (shows available expeditions)
- [ ] Party composition interface
- [ ] Equipment loadout screen
- [ ] Supply preparation (potions, food)
- [ ] Expedition preview (difficulty, rewards, risks)
- [ ] Launch expedition button

### 6.3 Create Settlement Defense UI (1-2 hours)
- [ ] Add fortification panel
- [ ] Guard assignment interface
- [ ] Defensive structure placement
- [ ] Raid countdown timer
- [ ] Battle command interface

---

## Phase 7: Persistence & Save System (3-4 hours)

### 7.1 Update Save System (2 hours)
- [ ] Update `/src/persistence/BrowserSaveManager.js`
- [ ] Add expedition state to save data
- [ ] Add NPC combat stats to save data
- [ ] Add shared inventory to save data
- [ ] Add defense state to save data
- [ ] Implement versioning for save compatibility
- [ ] Add migration for old saves

### 7.2 Handle Save/Load Edge Cases (1-2 hours)
- [ ] Handle loading during active expedition
- [ ] Handle loading during active raid
- [ ] Implement autosave before major events
- [ ] Add save validation for corruption
- [ ] Implement save backup system

---

## Phase 8: Testing & Polish (6-8 hours)

### 8.1 Integration Testing (3 hours)
- [ ] Test mode switching (settlement → expedition → settlement)
- [ ] Test resource flow across modes
- [ ] Test NPC assignment during expeditions
- [ ] Test raid interruptions
- [ ] Test save/load in all modes
- [ ] Test equipment persistence
- [ ] Test party composition edge cases

### 8.2 Balance Testing (2 hours)
- [ ] Playtest expedition difficulty curve
- [ ] Test raid frequency and difficulty
- [ ] Verify resource generation rates
- [ ] Test NPC progression speed
- [ ] Balance equipment power levels

### 8.3 Bug Fixing & Polish (2-3 hours)
- [ ] Fix mode transition bugs
- [ ] Fix combat system bugs
- [ ] Fix UI layout issues
- [ ] Fix save/load issues
- [ ] Performance optimization
- [ ] Add loading states
- [ ] Add error handling
- [ ] Polish animations and transitions

---

## Key Files to Create

### New Core Files
- `/src/core/UnifiedGameState.js` - Shared game state
- `/src/core/ModeManager.js` - Mode switching logic
- `/src/shared/SharedResourceManager.js` - Cross-mode resources
- `/src/shared/SharedInventoryManager.js` - Cross-mode inventory

### Combat System Files
- `/src/modules/combat/CombatEngine.js` - Refactored combat
- `/src/modules/combat/NPCSkillSystem.js` - NPC skills
- `/src/modules/combat/NPCEquipmentManager.js` - NPC equipment

### Expedition System Files
- `/src/modules/expedition/ExpeditionManager.js` - Expedition core
- `/src/modules/expedition/NPCPartyManager.js` - Party management
- `/src/modules/expedition/ExpeditionGameMode.js` - Expedition mode
- `/src/modules/expedition/ExpeditionRewards.js` - Reward system

### Defense System Files
- `/src/modules/defense/DefenseGameMode.js` - Defense mode
- `/src/modules/events/RaidEventGenerator.js` - Raid events

### UI Components
- `/src/components/expedition/ExpeditionPrep.jsx` - Expedition prep screen
- `/src/components/expedition/ExpeditionHUD.jsx` - Combat HUD
- `/src/components/defense/DefenseHUD.jsx` - Defense HUD
- `/src/components/shared/ModeIndicator.jsx` - Mode display
- `/src/components/shared/PartyPanel.jsx` - Party management UI

---

## Integration Risks & Mitigations

### Risk 1: Performance Issues
**Mitigation:** Use object pooling for combat entities, limit active NPCs in combat to 20 max

### Risk 2: State Synchronization Bugs
**Mitigation:** Strict state validation on mode switches, comprehensive testing

### Risk 3: Save Data Corruption
**Mitigation:** Save versioning, validation, backups before major changes

### Risk 4: Balancing Complexity
**Mitigation:** Start with conservative values, iterate based on playtesting

### Risk 5: UI Complexity
**Mitigation:** Progressive disclosure, clear mode indicators, comprehensive tutorial

---

## Success Criteria

- [ ] Can switch between settlement and expedition modes seamlessly
- [ ] Resources earned in expeditions appear in settlement
- [ ] NPCs can be assigned to expeditions and return with loot
- [ ] NPC combat stats improve settlement production
- [ ] Raids can be defended in action mode
- [ ] Defensive buildings function in combat
- [ ] All data persists across mode switches and save/load
- [ ] Game runs at 60 FPS in both modes
- [ ] No game-breaking bugs in core gameplay loop

---

## Phased Rollout Strategy

### Milestone 1: Foundation (Phase 1-2) - 18-22 hours
**Deliverable:** Mode switching works, shared resources/inventory functional, NPCs have combat stats

### Milestone 2: Expeditions (Phase 3) - 30-37 hours total
**Deliverable:** Can send NPC parties on expeditions, combat works, rewards flow to settlement

### Milestone 3: Defense (Phase 4) - 38-47 hours total
**Deliverable:** Raids trigger, can defend settlement in action mode

### Milestone 4: Polish (Phase 5-8) - 44-60 hours total
**Deliverable:** Fully integrated, balanced, tested hybrid game

---

## Next Steps

1. Review and approve this plan
2. Set up git branch: `feature/hybrid-game-integration`
3. Start with Phase 1.1: Create UnifiedGameState.js
4. Implement phases sequentially
5. Test after each phase
6. Iterate based on feedback

**Estimated Timeline:** 2-3 weeks full-time or 4-6 weeks part-time
