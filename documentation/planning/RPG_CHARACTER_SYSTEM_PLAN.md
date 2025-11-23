# RPG Character System Implementation Plan

**Last Updated:** 2025-11-21
**Version:** 2.0 (Revised with Claude Opus feedback)
**Status:** Active - Planning Phase
**Purpose:** Comprehensive plan to enhance the player character system with full RPG features including character menus, skills, inventory, stats, progression, and customization

---

## 🎯 Executive Summary - MVP Focus

### Critical Feedback Integration

This plan has been **significantly revised** based on expert feedback to:
- ✅ **Reduce scope by 50%** - Focus on MVP first, iterate later
- ✅ **Add Phase 0** - Integration audit before building
- ✅ **Game-specific attributes** - Aligned with settlement/exploration gameplay
- ✅ **Simplified active abilities** - Max 8 instead of 15+
- ✅ **Fixed scaling** - Linear progression instead of exponential
- ✅ **Save versioning** - Migration strategy from day one
- ✅ **Performance budgets** - Clear optimization targets

### Revised Vision: Ship MVP, Then Iterate

**MVP Goals (First Release):**
- Core attribute system (6 game-specific attributes)
- Single skill tree (30 nodes, Settlement focus)
- Basic character sheet UI
- Simplified progression (no classes, no sets, no sockets)
- Working save/load with versioning

**Post-MVP (Future Updates):**
- Additional skill trees (Explorer, Combat)
- Equipment sets and sockets
- Character customization
- Class specializations
- Advanced features

### Why This Approach?

> "Your players would rather have 30 amazing skills than 90 mediocre ones."

**Benefits:**
- Faster time to market (4-5 weeks vs 13 weeks)
- Validate core systems early
- Gather player feedback
- Iterate based on real usage
- Avoid over-engineering

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Claude Opus Feedback Summary](#claude-opus-feedback-summary)
3. [Phase 0: Integration Audit](#phase-0-integration-audit)
4. [Current State Analysis](#current-state-analysis)
5. [Gap Analysis](#gap-analysis)
6. [Revised Attribute System](#revised-attribute-system)
7. [Revised Skill Trees](#revised-skill-trees)
8. [MVP Features](#mvp-features)
9. [Post-MVP Features](#post-mvp-features)
10. [Technical Architecture](#technical-architecture)
11. [Save Versioning Strategy](#save-versioning-strategy)
12. [Performance Budgets](#performance-budgets)
13. [Revised Balance](#revised-balance)
14. [Revised Timeline](#revised-timeline)
15. [Testing Strategy](#testing-strategy)
16. [Risk Mitigation](#risk-mitigation)

---

## Claude Opus Feedback Summary

### 🔴 Critical Issues Addressed

1. **Integration Complexity Underestimated** ✅ FIXED
   - Added Phase 0: Integration Audit (1 week)
   - Mapped all system touchpoints
   - Created migration strategy

2. **Generic Attributes** ✅ FIXED
   - Replaced STR/DEX/INT with game-specific attributes
   - Leadership, Construction, Exploration, Combat, Magic, Endurance
   - Tied to settlement building and exploration

3. **Misaligned Skill Trees** ✅ FIXED
   - Replaced Combat/Magic/Utility with Settlement/Explorer/Combat
   - Aligned with core gameplay pillars
   - MVP focuses on Settlement tree only

4. **Too Many Active Abilities** ✅ FIXED
   - Reduced from 15+ to max 8 active abilities
   - Modified existing spells instead of adding more
   - Combo system for complexity

5. **Exponential Scaling** ✅ FIXED
   - Changed to linear base + percentage bonuses
   - Level 1: 10 dmg → Level 50: 50 base + 100% = 100 dmg (10x, not 40x)
   - More sustainable long-term

6. **Skill Point Scarcity** ✅ FIXED
   - Increased to 2 points per level
   - ~100 points by level 50
   - Can meaningfully invest in multiple trees

### 🟡 Important Improvements Made

7. **Save File Migration** ✅ ADDRESSED
   - Versioned save system implemented first
   - Backup and rollback strategy
   - Recovery mode for corrupted saves

8. **Performance Budgets** ✅ ADDED
   - Stat calculation: <5ms
   - Skill tree render: <16ms
   - Character sheet: <8ms

### 🟢 Enhancements Added

9. **Skill Loadouts** ✅ ADDED
10. **Skill Preview Mode** ✅ ADDED
11. **Progression Visualization** ✅ ADDED

---

## Phase 0: Integration Audit (Week 1)

### Why Phase 0?

**Problem:** Existing systems (spells, equipment, combat, NPCs) need deep integration with new character system. Underestimating this = technical debt and bugs.

**Solution:** Spend 1 week auditing, mapping, and planning integration BEFORE writing code.

### Integration Audit Checklist

#### 1. **Map All Touchpoints** (2 days)

**System Inventory:**
```
Current Systems Requiring Integration:
├── Spell System (src/data/spells.js)
│   ├── Damage calculations (needs Magic attribute scaling)
│   ├── Mana costs (needs skill modifiers)
│   └── Cooldowns (needs skill reduction)
│
├── Equipment System (src/utils/equipmentStats.js)
│   ├── Stat bonuses (needs attribute requirements)
│   ├── getTotalStats() (needs attribute integration)
│   └── Equipment slots (needs level requirements)
│
├── Combat System (src/components/3d/Player.jsx)
│   ├── Damage calculation (needs Combat/Magic attributes)
│   ├── Health/stamina (needs Endurance attribute)
│   ├── Crit/dodge (needs derived stat formulas)
│   └── Status effects (needs skill tree modifiers)
│
├── NPC System (src/modules/npc-system/)
│   ├── NPC efficiency (needs Leadership attribute)
│   ├── NPC happiness (needs Leadership skills)
│   └── NPC combat stats (needs player buff skills)
│
├── Building System (src/modules/foundation/)
│   ├── Placement speed (needs Construction attribute)
│   ├── Building costs (needs Construction skills)
│   └── Building limits (needs skill tree unlocks)
│
├── Resource System (src/modules/resource-economy/)
│   ├── Gathering speed (needs Exploration attribute)
│   ├── Resource bonuses (needs skill modifiers)
│   └── Production rates (needs Leadership/Construction)
│
└── Save System (src/persistence/)
    ├── Schema changes (needs versioning)
    ├── Migration strategy (needs backward compatibility)
    └── Validation (needs new character data)
```

**Deliverable:** Integration map document with all touchpoints identified.

#### 2. **Create Integration Tests First** (1 day)

**Test-Driven Integration:**
```javascript
// Write tests BEFORE implementing
describe('Attribute Integration Tests', () => {
  test('Magic attribute scales spell damage', () => {
    const player = createPlayer({ magic: 50 });
    const spellDamage = calculateSpellDamage('fireball', player);
    expect(spellDamage).toBe(20 + (20 * 0.50)); // 30 damage
  });

  test('Leadership attribute affects NPC efficiency', () => {
    const player = createPlayer({ leadership: 40 });
    const npcBonus = calculateNPCEfficiency(player);
    expect(npcBonus).toBe(1.40); // 140% efficiency
  });

  test('Construction attribute reduces building costs', () => {
    const player = createPlayer({ construction: 60 });
    const cost = calculateBuildingCost('FARM', player);
    expect(cost.wood).toBe(100 * 0.70); // 30% discount
  });
});
```

**Deliverable:** Integration test suite (failing tests = acceptance criteria).

#### 3. **Design Migration Strategy** (1 day)

**Save File Version Management:**
```javascript
// Version 1 (Current)
{
  player: {
    health: 100,
    stamina: 100,
    level: 5,
    xp: 450
  }
}

// Version 2 (With Character System)
{
  version: 2,
  player: {
    health: 100, // unchanged
    stamina: 100, // unchanged
    level: 5, // unchanged
    xp: 450 // unchanged
  },
  character: {
    attributes: {
      leadership: 10,
      construction: 10,
      exploration: 10,
      combat: 10,
      magic: 10,
      endurance: 10
    },
    skillPoints: 10, // Awarded retroactively
    attributePoints: 25, // 5 per level
    skills: {
      settlement: []
    }
  }
}

// Migration function
function migrateV1ToV2(saveData) {
  if (saveData.version === 2) return saveData;

  // Award retroactive points based on level
  const retroactiveSkillPoints = saveData.player.level * 2;
  const retroactiveAttributePoints = saveData.player.level * 5;

  return {
    version: 2,
    player: saveData.player,
    character: {
      attributes: {
        leadership: 10,
        construction: 10,
        exploration: 10,
        combat: 10,
        magic: 10,
        endurance: 10
      },
      skillPoints: retroactiveSkillPoints,
      attributePoints: retroactiveAttributePoints,
      skills: { settlement: [] }
    }
  };
}
```

**Deliverable:** Complete migration strategy with rollback plan.

#### 4. **API Design** (1 day)

**Define Clean Integration APIs:**
```javascript
// AttributeSystem API
class AttributeSystem {
  calculateDerivedStat(statName, attributes) { }
  getAttributeBonus(attributeName, value) { }
  validateAttributeAllocation(character, attribute, points) { }
}

// Integration with existing systems
class CombatIntegration {
  static applyAttributesToCombat(player, attributes) {
    // Modify existing combat calculations
    player.damage += attributes.combat * 2;
    player.maxHealth += attributes.endurance * 15;
    player.critChance += attributes.combat * 0.3;
  }
}

class SpellIntegration {
  static applyAttributesToSpells(spell, attributes) {
    // Modify spell calculations
    spell.damage += spell.damage * (attributes.magic * 0.02);
    spell.cooldown *= (1 - (attributes.magic * 0.005));
  }
}
```

**Deliverable:** API specification document.

#### 5. **Risk Assessment** (1 day)

**Integration Risks:**
| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing combat | High | Feature flags, gradual rollout |
| Save file corruption | Critical | Backup system, recovery mode |
| Performance regression | Medium | Performance budgets, profiling |
| Balance issues | Medium | Configurable multipliers |
| NPC system conflicts | Medium | Integration tests, careful API design |

**Deliverable:** Risk mitigation plan.

### Phase 0 Deliverables

✅ Integration map document
✅ Failing integration tests (TDD)
✅ Migration strategy with rollback
✅ API specification
✅ Risk mitigation plan

**Time Investment:** 1 week
**Payoff:** Avoid 2-4 weeks of refactoring and debugging later

---

## Current State Analysis

### Existing Player Systems

#### 1. Player Entity (`src/modules/player/PlayerEntity.js`)
**Current Features:**
- Basic position and movement (2D grid-based)
- Health: 100/100
- Stamina: 100/100
- Movement speed with sprint modifier
- Interaction radius
- Basic serialization for save/load

**Integration Needs:**
- Add attribute scaling to health/stamina
- Add derived stats calculation
- Integrate with new character manager

#### 2. 3D Player Component (`src/components/3d/Player.jsx`)
**Current Features:**
- Full 3D movement with physics
- Health, mana, stamina management
- Level and XP tracking (level 1, 0/100 XP)
- Basic stats: damage (10), speed (5), defense (0)
- Advanced combat stats: crit chance (5%), crit damage (150%), dodge (5%)
- Equipment integration via `getTotalStats()`
- Spell system integration (11+ spells)
- Combat mechanics: sprint, dodge, block, combo system
- Status effects array
- Rage system (0/100)

**Integration Needs:**
- Replace flat stats with attribute-derived stats
- Add skill tree modifier application
- Update damage calculations with new formulas

#### 3. Game Store (`src/stores/useGameStore.js`)
**Current Features:**
- Player state management
- Equipment slots: weapon, armor, helmet, gloves, boots, ring1, ring2, amulet, offhand
- Inventory: gold, essence, crystals, potions, items array, materials
- XP and leveling system
- Skill points (not used yet)

**Integration Needs:**
- Add character state section
- Add attribute management actions
- Add skill tree state

#### 4. Spell System (`src/data/spells.js`)
**Current Features:**
- 11+ spells across 4 categories
- Mana costs and cooldowns
- Status effects system
- Keyboard shortcuts (1-6, Q, E, R, F, T)

**Integration Needs:**
- Add Magic attribute scaling
- Add skill tree modifiers
- Simplify to 8 spells max (or modify existing instead of adding)

---

## Gap Analysis

### Critical Missing Features

#### 1. **Attribute System** 🔴 CRITICAL
**What's Missing:**
- No core attributes aligned with gameplay
- No attribute points on level up
- No attribute-based stat scaling

**Impact:** Very High
**MVP Status:** ✅ INCLUDED

#### 2. **Skill Tree System** 🔴 CRITICAL
**What's Missing:**
- No skill tree system
- Skill points accumulate but aren't usable
- No passive abilities
- No active ability unlocks

**Impact:** Very High
**MVP Status:** ✅ INCLUDED (Settlement tree only)

#### 3. **Character Sheet/Menu** 🔴 CRITICAL
**What's Missing:**
- No comprehensive character stats screen
- No way to view total stats with bonuses
- No attribute allocation UI

**Impact:** High
**MVP Status:** ✅ INCLUDED (Basic version)

#### 4. **Save Versioning** 🔴 CRITICAL
**What's Missing:**
- No save file version management
- No migration system
- No backward compatibility

**Impact:** Critical
**MVP Status:** ✅ INCLUDED (Must be first)

#### 5. **Enhanced Inventory** 🟡 NICE TO HAVE
**What's Missing:**
- No item categories/tabs
- No item filtering/sorting
- No item comparison

**Impact:** Medium
**MVP Status:** ❌ POST-MVP

#### 6. **Equipment Sets & Sockets** 🟡 NICE TO HAVE
**What's Missing:**
- No equipment set bonuses
- No item socket system
- No item upgrading

**Impact:** Medium
**MVP Status:** ❌ POST-MVP

#### 7. **Character Customization** 🟡 NICE TO HAVE
**What's Missing:**
- No character creation screen
- No appearance customization
- No class selection

**Impact:** Low-Medium
**MVP Status:** ❌ POST-MVP

---

## Revised Attribute System

### Game-Specific Attributes (Not Generic RPG)

**Design Philosophy:** Attributes should reflect your game's unique features (settlement building + dungeon exploration + combat), not generic D&D stats.

#### The 6 Core Attributes

**1. Leadership (LED)**
- **Primary:** NPC efficiency, NPC happiness
- **Secondary:** Max NPCs, settlement production
- **Settlement Impact:** Direct boost to your core gameplay loop

**Per Point Bonuses:**
```javascript
+1% NPC work efficiency
+0.5% NPC happiness
+0.1 max NPC capacity (every 10 points = +1 NPC)
+1% settlement-wide production
```

**Why This Attribute?**
- Directly impacts settlement building (core pillar)
- Makes NPCs more effective (your workforce)
- Scales with gameplay progression

---

**2. Construction (CON)**
- **Primary:** Building speed, building cost reduction
- **Secondary:** Building durability, unlock advanced blueprints
- **Settlement Impact:** Makes base building more efficient

**Per Point Bonuses:**
```javascript
+2% building placement speed
+1% building cost reduction (caps at 30%)
+0.5% building health/durability
Unlocks: Advanced buildings at thresholds
```

**Why This Attribute?**
- Directly impacts building gameplay
- Resource efficiency matters
- Enables build variety

---

**3. Exploration (EXP)**
- **Primary:** Resource discovery, movement speed
- **Secondary:** Map reveal range, loot quality
- **Dungeon Impact:** Better exploration and resource gathering

**Per Point Bonuses:**
```javascript
+1% movement speed
+2% resource gathering speed
+1% chance to find rare resources
+0.5% map reveal range
```

**Why This Attribute?**
- Supports exploration pillar
- Ties to resource economy
- Encourages map exploration

---

**4. Combat (CMB)**
- **Primary:** Physical damage, defense
- **Secondary:** Crit chance, attack speed
- **Combat Impact:** Direct damage increase

**Per Point Bonuses:**
```javascript
+1.5 physical damage
+0.5 defense
+0.2% crit chance
+1% attack speed
```

**Why This Attribute?**
- Simple combat scaling
- Applies to melee and ranged
- Affects both offense and defense

---

**5. Magic (MAG)**
- **Primary:** Spell damage, mana pool
- **Secondary:** Mana regen, spell cooldown
- **Magic Impact:** Spell effectiveness

**Per Point Bonuses:**
```javascript
+2% spell damage
+8 max mana
+0.5 mana regen per second
+0.5% cooldown reduction (caps at 40%)
```

**Why This Attribute?**
- Existing spell system integration
- Enables magic builds
- Balanced with Combat attribute

---

**6. Endurance (END)**
- **Primary:** Max health, stamina
- **Secondary:** Health regen, stamina regen, resistances
- **Survival Impact:** Survivability for all builds

**Per Point Bonuses:**
```javascript
+15 max health
+5 max stamina
+0.3 health regen per second
+0.5% resistance to all damage
```

**Why This Attribute?**
- Universal survivability
- Enables tank builds
- Supports all playstyles

---

### Attribute Allocation

**Points per Level:** 5 points
**Starting Points:** 10 in each attribute (60 total)
**Level 50 Total:** 60 + (49 × 5) = 305 points

**Soft Caps (Diminishing Returns):**
```javascript
0-50 points:   100% effectiveness
51-100 points: 75% effectiveness
101-150 points: 50% effectiveness
151+ points:   25% effectiveness

// Example: Leadership at 120
actualBonus = (50 * 1.0) + (50 * 0.75) + (20 * 0.5)
            = 50 + 37.5 + 10
            = 97.5 (instead of 120 with no diminishing returns)
```

**Why Soft Caps?**
- Encourages balanced builds
- Prevents single-stat stacking
- Makes replayability more interesting

### Attribute Respec

**Cost Structure:**
```javascript
1st respec: 500 gold
2nd respec: 2,000 gold + 10 essence
3rd respec: 5,000 gold + 50 essence + 5 crystals
4th+ respec: 10,000 gold + 100 essence + 10 crystals

Max respecs: 5 per character
```

**Alternative: Free Respec Until Level 20**
- Lets new players experiment
- Locked in after level 20 (committed build)

---

### Derived Stats Formulas

```javascript
// Health
maxHealth = 100 + (endurance * 15);
healthRegen = 0.5 + (endurance * 0.3);

// Mana
maxMana = 100 + (magic * 8);
manaRegen = 1.0 + (magic * 0.5);

// Stamina
maxStamina = 100 + (endurance * 5);
staminaRegen = 2.0 + (endurance * 0.2);

// Damage
physicalDamage = baseWeaponDamage + (combat * 1.5);
spellDamage = baseSpellDamage * (1 + (magic * 0.02));

// Defense
defense = baseArmorDefense + (combat * 0.5) + (endurance * 0.3);

// Speed
movementSpeed = 5.0 + (exploration * 0.1);
attackSpeed = 1.0 + (combat * 0.01);

// Crit
critChance = 5.0 + (combat * 0.2) + (exploration * 0.1);
critDamage = 150 + (combat * 0.5);

// NPC bonuses
npcEfficiency = 1.0 + (leadership * 0.01);
npcHappiness = 50 + (leadership * 0.5);

// Building bonuses
buildingSpeed = 1.0 + (construction * 0.02);
buildingCostReduction = Math.min(0.30, construction * 0.01); // Cap at 30%

// Resource bonuses
resourceGatherSpeed = 1.0 + (exploration * 0.02);
resourceFindBonus = exploration * 0.01;
```

---

## Revised Skill Trees

### Design Philosophy: Align with Gameplay Pillars

**Your Game's Core Pillars:**
1. **Settlement Building** - Base construction, NPC management, resource economy
2. **Dungeon Exploration** - Procedural dungeons, loot, survival challenges
3. **Monster Combat** - Action combat, spells, equipment progression

**New Skill Tree Structure:**
1. **Settlement Tree** - Building, NPCs, economy (MVP focus)
2. **Explorer Tree** - Dungeons, loot, survival (Post-MVP)
3. **Combat Tree** - Damage, defense, abilities (Post-MVP)

---

### Settlement Tree (MVP - 30 Nodes)

**Theme:** Master of building, NPCs, and resource management

#### Tier 1: Foundation (Level 1-10)

**Passive Skills (1 point each):**

1. **Efficient Builder**
   - +10% building placement speed
   - Prerequisite: None

2. **Resource Management**
   - +10% resource gathering speed
   - Prerequisite: None

3. **Inspiring Leader**
   - +5% NPC work efficiency
   - Prerequisite: None

4. **Careful Planning**
   - -10% building costs
   - Prerequisite: None

5. **Quick Learner**
   - +10% XP gain
   - Prerequisite: None

---

#### Tier 2: Specialization (Level 11-20, requires 5 points in tree)

**Passive Skills (2 points each):**

6. **Master Builder**
   - +25% building speed, unlock rapid placement mode
   - Prerequisite: Efficient Builder

7. **Prospector**
   - +20% rare resource discovery chance
   - Prerequisite: Resource Management

8. **Natural Leader**
   - +10% NPC efficiency, +10% NPC happiness
   - Prerequisite: Inspiring Leader

9. **Economic Genius**
   - +15% gold from all sources
   - Prerequisite: Careful Planning

10. **Scholar**
    - +15% XP, unlock research bonuses
    - Prerequisite: Quick Learner

**Active Skills (2 points each):**

11. **Rally Cry** (Active)
    - All NPCs +30% productivity for 30 seconds
    - Cost: 50 stamina | Cooldown: 60s
    - Prerequisite: Natural Leader

12. **Instant Repair** (Active)
    - Instantly repair all damaged buildings
    - Cost: 100 gold | Cooldown: 120s
    - Prerequisite: Master Builder

---

#### Tier 3: Mastery (Level 21-35, requires 15 points in tree)

**Passive Skills (3 points each):**

13. **Architectural Genius**
    - Unlock Tier 3 building upgrades
    - Buildings can have +2 NPC slots
    - Prerequisite: Master Builder

14. **Resource Empire**
    - +50% resource production from all buildings
    - Prerequisite: Prospector

15. **Charismatic**
    - Max NPC capacity +5
    - NPCs level up 50% faster
    - Prerequisite: Natural Leader

16. **Trade Master**
    - Unlock special merchant trades
    - Sell items for +25% value
    - Prerequisite: Economic Genius

17. **Lore Master**
    - Unlock all research immediately
    - +25% XP from exploration
    - Prerequisite: Scholar

**Active Skills (3 points each):**

18. **Mass Production** (Active)
    - Double all resource gains for 20 seconds
    - Cost: 80 stamina | Cooldown: 180s
    - Prerequisite: Resource Empire

19. **Kingdom's Blessing** (Active)
    - All settlement bonuses doubled for 30 seconds
    - Cost: 100 stamina | Cooldown: 300s
    - Prerequisite: Charismatic

---

#### Tier 4: Legendary (Level 36-50, requires 25 points in tree)

**Passive Skills (4 points each):**

20. **Master of All Trades**
    - +10% to ALL stats per 5 buildings placed
    - Cap: +50% at 25 buildings
    - Prerequisite: Architectural Genius

21. **Abundant Harvest**
    - Resource nodes never deplete
    - +100% resource gathering speed
    - Prerequisite: Resource Empire

22. **Legendary Leader**
    - NPCs gain +50% efficiency
    - NPCs cannot die from starvation
    - Prerequisite: Charismatic

23. **Economic Powerhouse**
    - Gain 1% of total gold as passive income every minute
    - Prerequisite: Trade Master

24. **Sage**
    - All buildings provide +10% XP when near them
    - Unlock sage-tier research
    - Prerequisite: Lore Master

**Active Skills (4 points each):**

25. **Instant Fortress** (Ultimate)
    - Place 5 buildings instantly for free
    - Cooldown: 600s (once per 10 minutes)
    - Prerequisite: Master of All Trades

26. **Golden Age** (Ultimate)
    - 60 seconds: Free building placement, double resources, max NPC efficiency
    - Cooldown: 900s (once per 15 minutes)
    - Prerequisite: Economic Powerhouse

---

#### Tier 5: Capstone (Level 50, requires 40 points in tree)

**Choose ONE:**

27. **Civilization** (Capstone)
    - Unlock city-tier buildings
    - Permanent +100% to all settlement stats
    - All buildings provide unique bonuses
    - Passive income doubled
    - Prerequisite: 40 points in Settlement tree

28. **Empire Builder** (Capstone)
    - Unlock empire management features
    - Can have 2 settlements simultaneously
    - Resources shared across settlements
    - +200% building efficiency
    - Prerequisite: 40 points in Settlement tree

---

### Explorer Tree (POST-MVP - 30 Nodes)

**Theme:** Master of dungeons, loot, and survival

**Why Post-MVP?**
- Depends on dungeon system being implemented
- Requires loot system enhancements
- Settlement tree provides enough depth for MVP

**Preview Skills:**
- Dungeon sense (reveals map)
- Loot finder (better drops)
- Trap detection
- Survival instincts (less damage in dungeons)
- Treasure hunter (rare item bonuses)
- Dungeon mastery ultimate

---

### Combat Tree (POST-MVP - 30 Nodes)

**Theme:** Master of damage, defense, and abilities

**Why Post-MVP?**
- Combat system already functional
- Spell system already robust
- Settlement tree more unique to your game

**Preview Skills:**
- Weapon specializations
- Spell enhancements (modify existing spells)
- Defense masteries
- Critical strike bonuses
- Ultimate abilities (God Mode, Avatar of War, etc.)

---

### Skill Point Economy

**Acquisition:**
- **Per Level:** 2 points (increased from 1)
- **Major Quests:** 1-2 points
- **Achievements:** 1 point (select achievements only)
- **Total by Level 50:** ~100 points

**Spending:**
- Tier 1: 1 point per skill
- Tier 2: 2 points per skill
- Tier 3: 3 points per skill
- Tier 4: 4 points per skill
- Tier 5: 5 points (capstone)

**Can You Max One Tree?**
```
Settlement Tree: 30 skills
Cost = (5 * 1) + (7 * 2) + (7 * 3) + (9 * 4) + (2 * 5)
    = 5 + 14 + 21 + 36 + 10
    = 86 points

Yes! With 100 points, you can max one tree + invest in another.
```

---

### Active Ability Limit: 8 Maximum

**Current Problem:** 15+ new abilities + 11 existing spells = 26+ hotkeys = cognitive overload

**Solution: Modify, Don't Add**

**8 Active Ability Slots:**
1. **Slot 1-6:** Existing spells (11 spells reduced to 6 core spells)
2. **Slot Q:** Skill tree ability slot 1
3. **Slot E:** Skill tree ability slot 2

**Skill Tree Actives Modify Existing Spells:**
```javascript
// Instead of adding "Whirlwind" as new ability...
// Modify existing spell
{
  skillId: 'rallyCry',
  type: 'active',
  activationKey: 'Q',
  name: 'Rally Cry',
  description: 'Buff NPCs +30% productivity',
  cost: 50, // stamina
  cooldown: 60
}

// Instead of adding 15 new hotkeys, only Q and E for settlement skills
```

**Why This Works:**
- Fits existing control scheme
- No hotkey bloat
- Settlement skills don't need combat hotkeys
- Clean separation: 1-6 = combat, Q/E = utility

---

## MVP Features (First Release)

### MVP Scope: Core Systems Only

**Goal:** Validate character progression adds fun, then iterate.

**Timeline:** 4-5 weeks (vs 13 weeks for full plan)

### Included in MVP

#### ✅ 1. Attribute System (Full)
- All 6 attributes (Leadership, Construction, Exploration, Combat, Magic, Endurance)
- Attribute allocation on level up (5 points per level)
- Derived stat calculations
- Save/load support

#### ✅ 2. Settlement Skill Tree (30 nodes)
- Complete Settlement tree with 30 skills
- Tier 1-5 progression
- Active abilities (Rally Cry, Instant Repair, Mass Production, etc.)
- Skill point allocation UI

#### ✅ 3. Basic Character Sheet
- View all attributes
- View derived stats
- Allocate attribute points
- View skill tree
- Allocate skill points
- Keyboard shortcut ('C' key)

#### ✅ 4. Save Versioning System
- Version management (v1 → v2 migration)
- Backward compatibility
- Rollback support
- Recovery mode

#### ✅ 5. Core Integrations
- Attributes affect combat stats
- Attributes affect NPC efficiency
- Attributes affect building speed
- Skills modify gameplay
- Equipment still works with new system

#### ✅ 6. Performance Optimization
- Stat calculation caching
- Efficient skill tree rendering
- Optimized UI updates
- Performance budgets met

### What's MVP vs Post-MVP?

| Feature | MVP | Post-MVP |
|---------|-----|----------|
| Attribute system | ✅ Full | - |
| Settlement tree | ✅ 30 nodes | - |
| Explorer tree | ❌ | ✅ 30 nodes |
| Combat tree | ❌ | ✅ 30 nodes |
| Character sheet | ✅ Basic | ✅ Enhanced |
| Skill tree UI | ✅ One tree | ✅ Three trees |
| Inventory tabs | ❌ | ✅ Full |
| Item rarity | ❌ | ✅ 6 tiers |
| Equipment sets | ❌ | ✅ 15 sets |
| Socket system | ❌ | ✅ Full |
| Item upgrading | ❌ | ✅ +1 to +10 |
| Character creator | ❌ | ✅ Full |
| Appearance editor | ❌ | ✅ Full |
| Class system | ❌ | ✅ 5 classes |
| Skill loadouts | ❌ | ✅ Full |
| Skill preview | ❌ | ✅ Full |

---

## Post-MVP Features (Future Updates)

### Post-MVP Phase 1: Additional Skill Trees (3 weeks)

**Explorer Tree (30 nodes):**
- Dungeon navigation skills
- Loot quality bonuses
- Survival abilities
- Trap detection
- Treasure hunting
- Ultimate: Dungeon Master ability

**Combat Tree (30 nodes):**
- Weapon masteries
- Spell modifications
- Defense abilities
- Critical strike bonuses
- Combo enhancements
- Ultimate: God Mode ability

### Post-MVP Phase 2: Equipment Enhancements (2 weeks)

**Equipment Sets:**
- 15 equipment sets across themes
- 2/4/5 piece bonuses
- Set bonus UI indicators

**Socket System:**
- 7 gem types (Ruby, Sapphire, Topaz, Emerald, Amethyst, Diamond, Onyx)
- 5 gem tiers
- Socket operations (add, insert, remove, upgrade)

**Item Upgrading:**
- +1 to +10 upgrade levels
- Exponential cost scaling
- Visual upgrade indicators

### Post-MVP Phase 3: Enhanced Inventory (1 week)

**Inventory Improvements:**
- Tabbed organization (Equipment, Consumables, Materials, Quest, Junk)
- Item filtering and sorting
- Item comparison tooltips
- Quick-slot system (1-6 hotkeys for consumables)
- Item rarity visual indicators

### Post-MVP Phase 4: Character Customization (2 weeks)

**Character Creation:**
- Name selection
- Appearance customization (8 skin tones, 12 hairstyles, 10 colors, 8 facial features)
- Starting class selection (5 classes)
- Background selection (flavor bonuses)

**In-Game Customization:**
- Barber building for appearance changes
- Title system from achievements
- Character rename tokens

### Post-MVP Phase 5: Advanced Features (2 weeks)

**Skill Loadouts:**
- Save/load skill configurations
- Quick-swap between builds
- Preset sharing (future: community builds)

**Skill Preview Mode:**
- Training dummy to test skills
- Skill simulator before allocation
- "Try before you buy" feature

**Progression Visualization:**
- Character timeline
- Build evolution graph
- Stats over time charts

---

## Technical Architecture

### Module Structure

```
src/
├── modules/
│   └── character/
│       ├── AttributeSystem.js          # Core attribute logic
│       ├── CharacterManager.js         # Main character controller
│       ├── SkillTreeSystem.js          # Skill tree logic
│       ├── SkillNode.js                # Individual skill node
│       ├── SkillActivation.js          # Active skill execution
│       ├── PassiveEffects.js           # Passive skill effects
│       ├── DerivedStatsCalculator.js   # Stat formulas (NEW)
│       ├── SaveVersionManager.js       # Save versioning (NEW)
│       ├── CharacterData.js            # Data schemas
│       └── __tests__/                  # Unit tests
│
├── components/
│   └── character/
│       ├── CharacterSheet.jsx          # Main character UI
│       ├── AttributePanel.jsx          # Attribute allocation
│       ├── StatsDisplay.jsx            # Stat breakdown
│       ├── SkillTreeUI.jsx             # Skill tree interface
│       ├── SkillNode.jsx               # Skill node component
│       └── SkillTooltip.jsx            # Skill descriptions
│
├── data/
│   ├── skillTrees/
│   │   ├── settlementTree.json         # MVP tree
│   │   ├── explorerTree.json           # Post-MVP
│   │   └── combatTree.json             # Post-MVP
│   └── attributes/
│       └── attributeDefinitions.js     # Attribute formulas
│
└── utils/
    ├── integrations/
    │   ├── CombatIntegration.js        # Combat system bridge
    │   ├── SpellIntegration.js         # Spell system bridge
    │   ├── NPCIntegration.js           # NPC system bridge
    │   └── BuildingIntegration.js      # Building system bridge
    └── performance/
        └── StatCache.js                # Performance optimization
```

---

### Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│            Character Manager (New)                  │
│  - Manages attributes, skills, progression          │
│  - Calculates derived stats                         │
│  - Applies passive effects                          │
└──────────────┬──────────────────────────────────────┘
               │
         Integration Layer
               │
     ┌─────────┼─────────┬──────────┬────────────┐
     │         │         │          │            │
     ▼         ▼         ▼          ▼            ▼
┌─────────┐ ┌──────┐ ┌──────┐ ┌─────────┐ ┌─────────┐
│ Combat  │ │Spells│ │ NPCs │ │Building │ │Resource │
│ System  │ │      │ │      │ │ System  │ │ System  │
└─────────┘ └──────┘ └──────┘ └─────────┘ └─────────┘
│           │        │          │           │
└───────────┴────────┴──────────┴───────────┘
                     │
                     ▼
           ┌─────────────────┐
           │   Game Store    │
           │   (Zustand)     │
           └─────────────────┘
```

---

### Data Flow: Attribute → Derived Stat → Combat

```javascript
// 1. Player levels up
onLevelUp() {
  player.level++;
  player.attributePoints += 5;
  player.skillPoints += 2;
  player.xp = 0;
  player.xpToNext = calculateXPForLevel(player.level + 1);
}

// 2. Player allocates attributes
allocateAttribute('leadership', 5);
// → Updates character.attributes.leadership
// → Triggers stat recalculation

// 3. Derived stats calculated
function calculateDerivedStats(attributes, skills, equipment) {
  const cache = getStatCache(attributes, skills, equipment);
  if (cache.valid) return cache.stats;

  const stats = {
    maxHealth: 100 + (attributes.endurance * 15),
    maxMana: 100 + (attributes.magic * 8),
    physicalDamage: baseWeapon + (attributes.combat * 1.5),
    npcEfficiency: 1.0 + (attributes.leadership * 0.01),
    buildingSpeed: 1.0 + (attributes.construction * 0.02),
    // ... all other stats
  };

  // Apply passive skill bonuses
  stats.npcEfficiency *= (1 + getSkillBonus('inspiringLeader'));

  // Apply equipment bonuses
  stats.maxHealth += equipment.armor.healthBonus;

  updateStatCache(attributes, skills, equipment, stats);
  return stats;
}

// 4. Combat uses derived stats
function dealDamage(enemy) {
  const stats = player.derivedStats;
  let damage = stats.physicalDamage;

  // Check crit
  if (Math.random() * 100 < stats.critChance) {
    damage *= (stats.critDamage / 100);
  }

  // Apply skill modifiers
  if (hasSkill('powerStrike')) {
    damage *= 1.10;
  }

  enemy.health -= damage;
}

// 5. Building placement uses derived stats
function placeBuilding(buildingType) {
  const stats = player.derivedStats;

  // Apply construction speed
  const placementTime = basePlacementTime / stats.buildingSpeed;

  // Apply cost reduction
  const cost = baseCost * (1 - stats.buildingCostReduction);

  // Place building
  createBuilding(buildingType, cost, placementTime);
}
```

---

## Save Versioning Strategy

### Critical: Implement Save Versioning FIRST

**Why First?**
- Protects existing player saves
- Enables safe iteration
- Allows rollback if needed
- Required for any data structure changes

### Version Management System

```javascript
// src/persistence/SaveVersionManager.js

const CURRENT_VERSION = 2;

const SAVE_VERSIONS = {
  1: {
    description: 'Original save format (pre-character system)',
    schema: {
      player: { health, stamina, level, xp, position, ... },
      equipment: { ... },
      inventory: { ... },
      buildings: [ ... ],
      npcs: [ ... ]
    }
  },
  2: {
    description: 'Character system (attributes, skills)',
    schema: {
      version: 2,
      player: { health, stamina, level, xp, position, ... },
      character: {
        attributes: { leadership, construction, ... },
        skillPoints, attributePoints,
        skills: { settlement: [...] }
      },
      equipment: { ... },
      inventory: { ... },
      buildings: [ ... ],
      npcs: [ ... ]
    }
  }
};

class SaveVersionManager {
  static migrate(saveData) {
    const currentVersion = saveData.version || 1;

    if (currentVersion === CURRENT_VERSION) {
      return saveData;
    }

    // Backup original save
    this.backupSave(saveData, currentVersion);

    // Perform migrations
    let migrated = saveData;
    for (let v = currentVersion; v < CURRENT_VERSION; v++) {
      migrated = this.migrateVersion(migrated, v, v + 1);
    }

    return migrated;
  }

  static migrateVersion(data, fromVersion, toVersion) {
    console.log(`Migrating save from v${fromVersion} to v${toVersion}`);

    if (fromVersion === 1 && toVersion === 2) {
      return this.migrateV1ToV2(data);
    }

    throw new Error(`Unknown migration path: v${fromVersion} → v${toVersion}`);
  }

  static migrateV1ToV2(oldSave) {
    // Calculate retroactive points based on player level
    const level = oldSave.player.level;
    const retroAttributePoints = level * 5;
    const retroSkillPoints = level * 2;

    return {
      version: 2,
      player: oldSave.player,
      character: {
        attributes: {
          leadership: 10,
          construction: 10,
          exploration: 10,
          combat: 10,
          magic: 10,
          endurance: 10
        },
        attributePoints: retroAttributePoints,
        skillPoints: retroSkillPoints,
        skills: {
          settlement: []
        },
        respecsUsed: 0,
        respecsAvailable: 3
      },
      equipment: oldSave.equipment,
      inventory: oldSave.inventory,
      buildings: oldSave.buildings,
      npcs: oldSave.npcs
    };
  }

  static backupSave(saveData, version) {
    const timestamp = Date.now();
    const backupKey = `save_backup_v${version}_${timestamp}`;
    localStorage.setItem(backupKey, JSON.stringify(saveData));
    console.log(`Save backed up to ${backupKey}`);
  }

  static rollbackToVersion(version) {
    // Find most recent backup of specified version
    const backups = this.listBackups(version);
    if (backups.length === 0) {
      throw new Error(`No backups found for version ${version}`);
    }

    const latestBackup = backups[backups.length - 1];
    const backupData = JSON.parse(localStorage.getItem(latestBackup));

    // Restore backup
    localStorage.setItem('gameState', JSON.stringify(backupData));
    console.log(`Rolled back to ${latestBackup}`);

    return backupData;
  }

  static listBackups(version) {
    const keys = Object.keys(localStorage);
    return keys
      .filter(key => key.startsWith(`save_backup_v${version}_`))
      .sort();
  }

  static validateSave(saveData) {
    const version = saveData.version || 1;
    const schema = SAVE_VERSIONS[version];

    if (!schema) {
      throw new Error(`Unknown save version: ${version}`);
    }

    // Validate required fields exist
    if (version === 2) {
      if (!saveData.character) return false;
      if (!saveData.character.attributes) return false;
      if (!saveData.character.skills) return false;
    }

    return true;
  }
}

export default SaveVersionManager;
```

### Save/Load Integration

```javascript
// In BrowserSaveManager or equivalent
import SaveVersionManager from './SaveVersionManager';

function loadGame() {
  const saveData = JSON.parse(localStorage.getItem('gameState'));

  if (!saveData) {
    return null; // No save found
  }

  // Validate save
  if (!SaveVersionManager.validateSave(saveData)) {
    console.error('Invalid save file');
    return null;
  }

  // Migrate if needed
  const migrated = SaveVersionManager.migrate(saveData);

  // Verify migration succeeded
  if (!SaveVersionManager.validateSave(migrated)) {
    console.error('Migration failed');
    // Attempt rollback
    return SaveVersionManager.rollbackToVersion(saveData.version || 1);
  }

  return migrated;
}

function saveGame(gameState) {
  // Add version number
  const versionedState = {
    ...gameState,
    version: CURRENT_VERSION
  };

  // Backup current save before overwriting
  const existing = localStorage.getItem('gameState');
  if (existing) {
    const parsed = JSON.parse(existing);
    SaveVersionManager.backupSave(parsed, parsed.version || 1);
  }

  // Save new state
  localStorage.setItem('gameState', JSON.stringify(versionedState));
}
```

### Recovery Mode

```javascript
// Add recovery UI for corrupted saves
function enterRecoveryMode() {
  console.warn('Entering recovery mode');

  // List all backups
  const allBackups = [];
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('save_backup_')) {
      const data = JSON.parse(localStorage.getItem(key));
      allBackups.push({
        key,
        version: data.version || 1,
        level: data.player.level,
        timestamp: key.split('_').pop()
      });
    }
  });

  // Show recovery UI
  showRecoveryUI(allBackups);
}

function showRecoveryUI(backups) {
  // UI to select backup to restore
  // User can choose which backup to load
  // Includes preview of backup data (level, playtime, etc.)
}
```

---

## Performance Budgets

### Performance Requirements

**Goal:** Character system should add <5% overhead to game performance.

#### Stat Calculation Budget

**Target:** <5ms per calculation

```javascript
// Benchmark stat calculation
function benchmarkStatCalculation() {
  const start = performance.now();

  for (let i = 0; i < 1000; i++) {
    calculateDerivedStats(mockAttributes, mockSkills, mockEquipment);
  }

  const end = performance.now();
  const avgTime = (end - start) / 1000;

  console.log(`Stat calculation: ${avgTime}ms per call`);
  // Target: <5ms
}
```

**Optimization Strategy:**
- Cache derived stats
- Only recalculate on changes
- Use memoization

```javascript
// Stat caching
class StatCache {
  constructor() {
    this.cache = new Map();
  }

  getCacheKey(attributes, skills, equipment) {
    // Create hash of inputs
    return JSON.stringify({ attributes, skills, equipment });
  }

  get(attributes, skills, equipment) {
    const key = this.getCacheKey(attributes, skills, equipment);
    return this.cache.get(key);
  }

  set(attributes, skills, equipment, stats) {
    const key = this.getCacheKey(attributes, skills, equipment);
    this.cache.set(key, {
      stats,
      timestamp: Date.now()
    });
  }

  invalidate() {
    this.cache.clear();
  }
}

const statCache = new StatCache();

function calculateDerivedStats(attributes, skills, equipment) {
  // Check cache first
  const cached = statCache.get(attributes, skills, equipment);
  if (cached && (Date.now() - cached.timestamp) < 1000) {
    return cached.stats;
  }

  // Calculate stats
  const stats = {
    // ... calculations
  };

  // Cache result
  statCache.set(attributes, skills, equipment, stats);

  return stats;
}
```

---

#### UI Render Budget

**Character Sheet:** <8ms to open/render
**Skill Tree:** <16ms (one frame at 60fps)

```javascript
// Benchmark UI rendering
function benchmarkUIRender() {
  const start = performance.now();

  // Render character sheet
  render(<CharacterSheet player={mockPlayer} />);

  const end = performance.now();
  console.log(`Character sheet render: ${end - start}ms`);
  // Target: <8ms
}
```

**Optimization Strategy:**
- Lazy load skill tree components
- Virtual scrolling for long lists
- React.memo for expensive components
- Debounce stat updates

```javascript
// Optimized skill tree rendering
const SkillTreeUI = React.memo(({ tree, allocatedSkills }) => {
  // Only re-render when tree or skills change
  return (
    <div className="skill-tree">
      {tree.tiers.map(tier => (
        <SkillTier
          key={tier.id}
          tier={tier}
          allocatedSkills={allocatedSkills}
        />
      ))}
    </div>
  );
});

// Lazy load skill tree data
const SkillTreeContainer = () => {
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    // Load tree data asynchronously
    import('../data/skillTrees/settlementTree.json')
      .then(data => setTreeData(data));
  }, []);

  if (!treeData) return <LoadingSpinner />;

  return <SkillTreeUI tree={treeData} />;
};
```

---

#### Memory Budget

**Target:** <20MB additional memory for character system

```javascript
// Monitor memory usage
function monitorMemory() {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize / 1024 / 1024;
    console.log(`Memory usage: ${used.toFixed(2)} MB`);
  }
}

// Log memory before and after character system initialization
monitorMemory(); // Before
initializeCharacterSystem();
monitorMemory(); // After
// Target: <20MB increase
```

**Optimization Strategy:**
- Unload unused tree data
- Clear stat cache periodically
- Optimize JSON data structures

---

### Performance Monitoring

```javascript
// Add performance tracking
class PerformanceMonitor {
  static trackOperation(name, operation) {
    const start = performance.now();
    const result = operation();
    const end = performance.now();

    const duration = end - start;

    // Log if exceeds budget
    const budgets = {
      'stat_calculation': 5,
      'ui_render': 8,
      'skill_allocation': 10
    };

    if (duration > budgets[name]) {
      console.warn(`Performance warning: ${name} took ${duration}ms (budget: ${budgets[name]}ms)`);
    }

    return result;
  }
}

// Usage
const stats = PerformanceMonitor.trackOperation('stat_calculation', () => {
  return calculateDerivedStats(attributes, skills, equipment);
});
```

---

## Revised Balance

### Fixed: Linear Scaling Instead of Exponential

**Problem with Original Plan:**
```
Level 1:  10-20 damage
Level 50: 500-800 damage

Issue: 40x increase = extreme number inflation
- Early game items become worthless
- Enemy scaling must match (numbers get huge)
- Hard to balance
```

**New Linear + Percentage Scaling:**
```
Level 1:  10 base damage
Level 10: 15 base damage + 30% from skills = 19.5 damage (2x)
Level 25: 25 base damage + 80% from skills = 45 damage (4.5x)
Level 50: 50 base damage + 150% from skills = 125 damage (12.5x)

Much more manageable! 12.5x instead of 40x.
```

### Damage Scaling Formula

```javascript
function calculateDamage(player) {
  // 1. Base damage (grows linearly with level)
  const baseDamage = 10 + (player.level * 0.8);
  // Level 1: 10.8
  // Level 25: 30
  // Level 50: 50

  // 2. Attribute scaling (additive)
  const attributeBonus = player.attributes.combat * 1.5;
  // 50 combat = +75 damage

  // 3. Equipment scaling (additive)
  const equipmentBonus = player.equipment.weapon.damage;
  // Weapon damage: 10-50 depending on tier

  // 4. Skill multipliers (percentage)
  let skillMultiplier = 1.0;
  if (hasSkill('powerStrike', 5)) {
    skillMultiplier += 0.20; // +20%
  }
  if (hasSkill('weaponMastery', 3)) {
    skillMultiplier += 0.15; // +15%
  }
  // Max skill bonuses: ~150% (2.5x multiplier)

  // 5. Final damage
  const finalDamage = (baseDamage + attributeBonus + equipmentBonus) * skillMultiplier;

  return finalDamage;
}

// Examples:
// Level 1 (10 combat, no weapon, no skills):
// (10.8 + 15 + 0) * 1.0 = 25.8 damage

// Level 25 (40 combat, 25 weapon, some skills):
// (30 + 60 + 25) * 1.35 = 155 damage

// Level 50 (80 combat, 50 weapon, max skills):
// (50 + 120 + 50) * 1.50 = 330 damage

// Total scaling: 25 → 330 = 13.2x (much better than 40x!)
```

### Enemy Scaling

**Enemies scale similarly:**
```javascript
function createEnemy(type, playerLevel) {
  const baseStats = ENEMY_TYPES[type];

  // Scale with player level (0.8x multiplier)
  const scaledHealth = baseStats.health + (playerLevel * baseStats.health * 0.02);
  const scaledDamage = baseStats.damage + (playerLevel * baseStats.damage * 0.02);

  return {
    ...baseStats,
    health: scaledHealth,
    damage: scaledDamage,
    level: playerLevel
  };
}

// Example: Slime
// Level 1:  30 HP, 5 damage
// Level 25: 45 HP, 7.5 damage
// Level 50: 60 HP, 10 damage

// Boss enemies: 3-5x player stats
// Elite enemies: 2x player stats
// Normal enemies: 0.8-1.2x player stats
```

### Attribute Scaling Curves

```javascript
// Soft caps for diminishing returns
function getAttributeBonus(attributeName, value) {
  let effectiveValue;

  if (value <= 50) {
    effectiveValue = value; // 100% effective
  } else if (value <= 100) {
    effectiveValue = 50 + (value - 50) * 0.75; // 75% effective
  } else if (value <= 150) {
    effectiveValue = 87.5 + (value - 100) * 0.50; // 50% effective
  } else {
    effectiveValue = 112.5 + (value - 150) * 0.25; // 25% effective
  }

  return effectiveValue;
}

// Example: Leadership at 120
// 50 at 100% = 50
// 50 at 75% = 37.5
// 20 at 50% = 10
// Total: 97.5 effective (instead of 120 with no diminishing returns)

// This encourages balanced builds instead of single-stat stacking
```

### XP Curve

```javascript
function calculateXPForLevel(level) {
  // Smooth exponential curve
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

// Level requirements:
// Level 2:  100 XP
// Level 5:  175 XP
// Level 10: 404 XP
// Level 20: 1,637 XP
// Level 30: 6,621 XP
// Level 40: 26,786 XP
// Level 50: 108,366 XP

// Total XP to reach level 50: ~500,000 XP
```

### Resource Costs Scaling

```javascript
// Buildings scale with tier, not level
const BUILDING_COSTS = {
  FARM: {
    TIER1: { wood: 50, stone: 20 },
    TIER2: { wood: 150, stone: 80, gold: 100 },
    TIER3: { wood: 400, stone: 250, gold: 500, essence: 10 }
  }
};

// Attribute bonuses reduce costs
function calculateBuildingCost(buildingType, tier, player) {
  const baseCost = BUILDING_COSTS[buildingType][tier];
  const reduction = Math.min(0.30, player.attributes.construction * 0.01);

  const finalCost = {};
  for (const [resource, amount] of Object.entries(baseCost)) {
    finalCost[resource] = Math.floor(amount * (1 - reduction));
  }

  return finalCost;
}

// Example: Tier 2 Farm with 60 Construction
// Base: 150 wood, 80 stone, 100 gold
// Reduction: 30% (capped)
// Final: 105 wood, 56 stone, 70 gold
```

---

## Revised Timeline

### MVP Timeline: 4-5 Weeks

```
Phase 0: Integration Audit         (Week 1)
  ↓
Phase 1: Core Attributes            (Week 2)
  ↓
Phase 2: Settlement Skill Tree      (Week 3)
  ↓
Phase 3: Character UI               (Week 4)
  ↓
Phase 4: Testing & Polish           (Week 5)
  ↓
=== MVP RELEASE ===
```

### Detailed MVP Phase Breakdown

#### Phase 0: Integration Audit (Week 1)
**Days 1-2:** Map all touchpoints
**Day 3:** Write integration tests
**Day 4:** Design migration strategy
**Day 5:** API design and risk assessment

**Deliverables:**
- ✅ Integration map
- ✅ Integration test suite (failing tests)
- ✅ Save version manager
- ✅ API specifications

---

#### Phase 1: Core Attributes (Week 2)
**Days 1-2:** Attribute system backend
**Day 3:** Derived stats calculator
**Day 4:** Integration with existing systems
**Day 5:** Save/load with versioning

**Files Created:**
- `src/modules/character/AttributeSystem.js`
- `src/modules/character/DerivedStatsCalculator.js`
- `src/persistence/SaveVersionManager.js`
- `src/utils/integrations/CombatIntegration.js`
- `src/utils/integrations/NPCIntegration.js`

**Deliverables:**
- ✅ 6 attributes working
- ✅ Stat calculations correct
- ✅ Save v1 → v2 migration working
- ✅ Integration tests passing

---

#### Phase 2: Settlement Skill Tree (Week 3)
**Days 1-2:** Skill tree system backend
**Day 3:** Passive skill effects
**Day 4:** Active skill activation
**Day 5:** Skill data (JSON)

**Files Created:**
- `src/modules/character/SkillTreeSystem.js`
- `src/modules/character/SkillNode.js`
- `src/modules/character/PassiveEffects.js`
- `src/modules/character/SkillActivation.js`
- `src/data/skillTrees/settlementTree.json`

**Deliverables:**
- ✅ 30 settlement skills defined
- ✅ Passive effects applying
- ✅ Active skills working (Rally Cry, etc.)
- ✅ Skill point allocation logic

---

#### Phase 3: Character UI (Week 4)
**Days 1-2:** Character sheet component
**Day 3:** Attribute allocation UI
**Day 4:** Skill tree visualization
**Day 5:** Polish and mobile responsiveness

**Files Created:**
- `src/components/character/CharacterSheet.jsx`
- `src/components/character/AttributePanel.jsx`
- `src/components/character/StatsDisplay.jsx`
- `src/components/character/SkillTreeUI.jsx`
- `src/styles/CharacterSheet.css`

**Deliverables:**
- ✅ Character sheet UI (press 'C')
- ✅ Attribute allocation interface
- ✅ Skill tree interface
- ✅ Stat tooltips
- ✅ Mobile-responsive design

---

#### Phase 4: Testing & Polish (Week 5)
**Days 1-2:** Bug fixing
**Day 3:** Balance testing
**Day 4:** Performance optimization
**Day 5:** Documentation and tutorial updates

**Deliverables:**
- ✅ All integration tests passing
- ✅ Performance budgets met
- ✅ Balance feels good
- ✅ Tutorial updated for character system
- ✅ Documentation complete

---

### Post-MVP Timeline

**Post-MVP Phase 1:** Explorer + Combat Trees (3 weeks)
**Post-MVP Phase 2:** Equipment Enhancements (2 weeks)
**Post-MVP Phase 3:** Enhanced Inventory (1 week)
**Post-MVP Phase 4:** Character Customization (2 weeks)
**Post-MVP Phase 5:** Advanced Features (2 weeks)

**Total Post-MVP:** 10 weeks

**Grand Total:** 5 weeks (MVP) + 10 weeks (Post-MVP) = 15 weeks

---

## Testing Strategy

### Test-Driven Integration (Phase 0)

**Write integration tests FIRST:**

```javascript
// src/modules/character/__tests__/AttributeIntegration.test.js

describe('Attribute System Integration', () => {
  test('Leadership attribute increases NPC efficiency', () => {
    const player = createPlayer();
    player.character.attributes.leadership = 50;

    const npc = createNPC();
    const efficiency = calculateNPCEfficiency(npc, player);

    expect(efficiency).toBe(1.50); // 150% efficiency
  });

  test('Construction attribute reduces building costs', () => {
    const player = createPlayer();
    player.character.attributes.construction = 60;

    const cost = calculateBuildingCost('FARM', player);

    // Base cost: 100 wood
    // 60 construction = 30% reduction (capped)
    expect(cost.wood).toBe(70);
  });

  test('Combat attribute scales physical damage', () => {
    const player = createPlayer();
    player.character.attributes.combat = 40;

    const damage = calculatePhysicalDamage(player);

    // Base: 10 + (40 * 1.5) = 70
    expect(damage).toBe(70);
  });

  test('Magic attribute scales spell damage', () => {
    const player = createPlayer();
    player.character.attributes.magic = 50;

    const spell = { baseDamage: 20 };
    const damage = calculateSpellDamage(spell, player);

    // 20 * (1 + (50 * 0.02)) = 20 * 2.0 = 40
    expect(damage).toBe(40);
  });
});
```

### Unit Tests

```javascript
// src/modules/character/__tests__/AttributeSystem.test.js

describe('AttributeSystem', () => {
  test('allocates attribute points correctly', () => {
    const character = createCharacter();
    const attributeSystem = new AttributeSystem(character);

    attributeSystem.allocate('leadership', 5);

    expect(character.attributes.leadership).toBe(15); // 10 + 5
    expect(character.attributePoints).toBe(0); // 5 - 5
  });

  test('prevents over-allocation', () => {
    const character = createCharacter();
    character.attributePoints = 3;
    const attributeSystem = new AttributeSystem(character);

    expect(() => {
      attributeSystem.allocate('combat', 5);
    }).toThrow('Not enough attribute points');
  });

  test('applies soft caps correctly', () => {
    const character = createCharacter();
    character.attributes.strength = 120;

    const effectiveValue = getAttributeBonus('strength', 120);

    // 50 * 1.0 + 50 * 0.75 + 20 * 0.50 = 97.5
    expect(effectiveValue).toBe(97.5);
  });

  test('calculates derived stats correctly', () => {
    const character = createCharacter();
    character.attributes.endurance = 50;

    const maxHealth = calculateMaxHealth(character.attributes);

    // 100 + (50 * 15) = 850
    expect(maxHealth).toBe(850);
  });
});
```

### Skill Tree Tests

```javascript
// src/modules/character/__tests__/SkillTreeSystem.test.js

describe('SkillTreeSystem', () => {
  test('allocates skill points correctly', () => {
    const character = createCharacter();
    character.skillPoints = 5;
    const skillTree = new SkillTreeSystem(character);

    skillTree.allocateSkill('settlement', 'efficientBuilder', 1);

    expect(character.skills.settlement).toContainEqual({
      id: 'efficientBuilder',
      points: 1
    });
    expect(character.skillPoints).toBe(4);
  });

  test('validates prerequisites', () => {
    const character = createCharacter();
    const skillTree = new SkillTreeSystem(character);

    // Try to allocate tier 2 skill without prerequisites
    expect(() => {
      skillTree.allocateSkill('settlement', 'masterBuilder', 2);
    }).toThrow('Prerequisites not met');
  });

  test('validates tier requirements', () => {
    const character = createCharacter();
    character.level = 5; // Too low for tier 2
    const skillTree = new SkillTreeSystem(character);

    expect(() => {
      skillTree.allocateSkill('settlement', 'masterBuilder', 2);
    }).toThrow('Level too low for this skill');
  });

  test('applies passive skill effects', () => {
    const character = createCharacter();
    const skillTree = new SkillTreeSystem(character);

    skillTree.allocateSkill('settlement', 'inspiringLeader', 1);

    const npcEfficiency = calculateNPCEfficiency(character);

    // Base 1.0 + 5% from skill = 1.05
    expect(npcEfficiency).toBe(1.05);
  });
});
```

### Save Migration Tests

```javascript
// src/persistence/__tests__/SaveVersionManager.test.js

describe('SaveVersionManager', () => {
  test('migrates v1 to v2 correctly', () => {
    const v1Save = {
      player: { level: 10, health: 100, xp: 1000 }
    };

    const v2Save = SaveVersionManager.migrate(v1Save);

    expect(v2Save.version).toBe(2);
    expect(v2Save.character).toBeDefined();
    expect(v2Save.character.attributePoints).toBe(50); // 10 levels * 5 points
    expect(v2Save.character.skillPoints).toBe(20); // 10 levels * 2 points
  });

  test('backs up save before migration', () => {
    const v1Save = {
      player: { level: 5, health: 100 }
    };

    SaveVersionManager.migrate(v1Save);

    const backups = SaveVersionManager.listBackups(1);
    expect(backups.length).toBeGreaterThan(0);
  });

  test('validates save structure', () => {
    const validSave = {
      version: 2,
      character: { attributes: {}, skills: {} }
    };

    const isValid = SaveVersionManager.validateSave(validSave);
    expect(isValid).toBe(true);
  });

  test('rolls back to previous version', () => {
    const v1Save = { player: { level: 5 } };
    SaveVersionManager.backupSave(v1Save, 1);

    const rolledBack = SaveVersionManager.rollbackToVersion(1);

    expect(rolledBack.player.level).toBe(5);
  });
});
```

### Performance Tests

```javascript
// src/modules/character/__tests__/Performance.test.js

describe('Performance Tests', () => {
  test('stat calculation completes in <5ms', () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      calculateDerivedStats(mockAttributes, mockSkills, mockEquipment);
    }

    const end = performance.now();
    const avgTime = (end - start) / 1000;

    expect(avgTime).toBeLessThan(5);
  });

  test('skill tree render completes in <16ms', () => {
    const start = performance.now();

    render(<SkillTreeUI tree={mockTree} />);

    const end = performance.now();
    const renderTime = end - start;

    expect(renderTime).toBeLessThan(16);
  });

  test('character sheet opens in <8ms', () => {
    const start = performance.now();

    render(<CharacterSheet player={mockPlayer} />);

    const end = performance.now();
    const renderTime = end - start;

    expect(renderTime).toBeLessThan(8);
  });
});
```

---

## Risk Mitigation

### Technical Risks & Solutions

#### Risk 1: Breaking Existing Combat
**Severity:** High
**Probability:** Medium

**Mitigation:**
- Feature flag: `ENABLE_CHARACTER_SYSTEM=false` in config
- Gradual rollout: Enable for testing, disable for production initially
- Integration tests catch regressions
- Keep old stat calculations as fallback

**Contingency:**
- Immediate rollback via feature flag
- Revert to pre-character system build
- Restore saves from backups

---

#### Risk 2: Save File Corruption
**Severity:** Critical
**Probability:** Low

**Mitigation:**
- Save versioning system (Phase 0)
- Automatic backups before every save
- Validation before and after migration
- Recovery mode UI

**Contingency:**
- Recovery mode lists all backups
- Manual restore from backup
- Support tool to fix corrupted saves

---

#### Risk 3: Performance Regression
**Severity:** Medium
**Probability:** Low

**Mitigation:**
- Performance budgets defined upfront
- Stat caching system
- Performance tests in CI/CD
- Profiling during development

**Contingency:**
- Identify bottlenecks with profiler
- Optimize hot paths
- Disable expensive features if needed

---

#### Risk 4: Balance Issues
**Severity:** Medium
**Probability:** High

**Mitigation:**
- Data-driven configs (easy to adjust)
- Balance testing with varied builds
- Community beta testing
- Configurable multipliers

**Contingency:**
- Hot-fix config values without code changes
- Respec tokens for affected players
- Balance patch within 48 hours

---

#### Risk 5: Scope Creep
**Severity:** High
**Probability:** High

**Mitigation:**
- MVP scope clearly defined
- Feature lock after Phase 0
- Post-MVP roadmap for additional features
- Regular progress reviews

**Contingency:**
- Cut non-MVP features ruthlessly
- Ship MVP first, iterate later
- Prioritize based on player feedback

---

### UX Risks & Solutions

#### Risk 6: Complexity Overwhelm
**Severity:** High
**Probability:** Medium

**Mitigation:**
- Progressive unlocking (skills unlock as you level)
- Enhanced tutorial system
- Tooltips on everything
- Recommended builds for new players

**Contingency:**
- Add "Simple Mode" toggle (auto-allocate points)
- In-game build guides
- Community build library

---

#### Risk 7: Mobile UX Issues
**Severity:** Medium
**Probability:** Medium

**Mitigation:**
- Mobile-first design
- Touch-friendly UI elements
- Simplified mobile layouts
- Early mobile testing

**Contingency:**
- Separate mobile skill tree UI
- Swipe gestures for navigation
- Bottom-sheet menus

---

## Missing Features (Added)

### Feature 1: Skill Loadouts

**Description:** Save and quickly swap between different skill configurations.

**Use Cases:**
- Dungeon build (Explorer tree focused)
- Boss fight build (Combat tree focused)
- Settlement build (Settlement tree focused)
- Hybrid builds

**Implementation (Post-MVP):**
```javascript
// Skill loadout system
class SkillLoadoutManager {
  saveLoadout(name, character) {
    const loadout = {
      name,
      attributes: { ...character.attributes },
      skills: { ...character.skills },
      timestamp: Date.now()
    };

    character.loadouts = character.loadouts || [];
    character.loadouts.push(loadout);

    return loadout;
  }

  loadLoadout(character, loadoutName) {
    const loadout = character.loadouts.find(l => l.name === loadoutName);
    if (!loadout) throw new Error('Loadout not found');

    // Calculate respec cost
    const cost = this.calculateRespecCost(character);

    // Apply loadout
    character.attributes = { ...loadout.attributes };
    character.skills = { ...loadout.skills };

    // Recalculate derived stats
    recalculateStats(character);

    return loadout;
  }

  shareLoadout(loadout) {
    // Generate shareable code
    const compressed = compressLoadout(loadout);
    const code = encodeBase64(compressed);
    return code;
  }

  importLoadout(code) {
    const compressed = decodeBase64(code);
    const loadout = decompressLoadout(compressed);
    return loadout;
  }
}
```

**UI:**
- Loadout manager in character sheet
- Quick-swap dropdown (Ctrl+1, Ctrl+2, Ctrl+3 for hotkeys)
- Share/import via code
- Community build library (future)

---

### Feature 2: Skill Preview Mode

**Description:** Test skills before committing points.

**Implementation (Post-MVP):**
```javascript
// Training dummy system
class TrainingDummy {
  constructor() {
    this.health = 1000;
    this.maxHealth = 1000;
    this.damageLog = [];
  }

  reset() {
    this.health = this.maxHealth;
    this.damageLog = [];
  }

  takeDamage(damage, source) {
    this.health -= damage;
    this.damageLog.push({
      damage,
      source,
      timestamp: Date.now()
    });
  }

  getDPS() {
    if (this.damageLog.length === 0) return 0;

    const firstHit = this.damageLog[0].timestamp;
    const lastHit = this.damageLog[this.damageLog.length - 1].timestamp;
    const duration = (lastHit - firstHit) / 1000;

    const totalDamage = this.damageLog.reduce((sum, hit) => sum + hit.damage, 0);

    return totalDamage / duration;
  }
}

// Skill simulator
class SkillSimulator {
  previewSkill(character, skillId, points) {
    // Create temporary character with skill allocated
    const tempCharacter = cloneDeep(character);
    allocateSkill(tempCharacter, skillId, points);

    // Calculate stats with skill
    const statsWithSkill = calculateDerivedStats(tempCharacter);

    // Calculate stats without skill
    const statsWithout = calculateDerivedStats(character);

    // Show difference
    return {
      statsWithSkill,
      statsWithout,
      difference: calculateDifference(statsWithSkill, statsWithout)
    };
  }
}
```

**UI:**
- Training dummy building in settlement
- Skill preview tooltip (shows stats with/without skill)
- DPS meter
- Skill comparison mode

---

### Feature 3: Progression Visualization

**Description:** Show players their character's journey over time.

**Implementation (Post-MVP):**
```javascript
// Track character progression
class ProgressionTracker {
  constructor(character) {
    this.character = character;
    this.snapshots = [];
  }

  takeSnapshot() {
    const snapshot = {
      level: this.character.level,
      attributes: { ...this.character.attributes },
      skills: { ...this.character.skills },
      stats: calculateDerivedStats(this.character),
      timestamp: Date.now()
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  getProgressionGraph(statName) {
    return this.snapshots.map(snapshot => ({
      level: snapshot.level,
      value: snapshot.stats[statName],
      timestamp: snapshot.timestamp
    }));
  }

  getBuildEvolution() {
    return this.snapshots.map(snapshot => ({
      level: snapshot.level,
      attributes: snapshot.attributes,
      skills: snapshot.skills,
      timestamp: snapshot.timestamp
    }));
  }
}
```

**UI:**
- Progression tab in character sheet
- Timeline visualization
- Stat graphs (damage, health, etc. over time)
- Build evolution tree
- Milestones and achievements

**Visualizations:**
- Line graph: Stat values over time
- Radar chart: Attribute distribution at different levels
- Tree diagram: Skill allocation history
- Heatmap: Most-used abilities

---

## Conclusion: Ship MVP, Then Iterate

### Why This Approach Works

**Benefits of MVP-First:**
1. **Faster Validation** - Test core systems with real players
2. **Reduced Risk** - Smaller scope = fewer bugs
3. **Player Feedback** - Learn what players actually want
4. **Iterative Improvement** - Add features based on data
5. **Avoid Over-Engineering** - Build what's needed, not what's imagined

### MVP Success Criteria

**Shipping MVP if:**
- ✅ Attributes affect gameplay meaningfully
- ✅ Settlement skill tree provides 10+ hours of progression
- ✅ Character sheet UI is intuitive
- ✅ Save/load works flawlessly
- ✅ Performance budgets met
- ✅ No critical bugs

### Post-MVP Roadmap Priority

**Based on Player Feedback:**
1. If players love settlement building → Expand Settlement tree first
2. If players want more combat depth → Add Combat tree
3. If players want exploration → Add Explorer tree
4. If players want customization → Add appearance system

**Data-Driven Decisions:**
- Track which skills are most used
- Monitor respec frequency
- Measure engagement with skill tree
- Survey players on desired features

---

## Final Thoughts

This revised plan addresses all major concerns from Claude Opus:
- ✅ **Reduced scope by 50%** - MVP in 5 weeks instead of 13
- ✅ **Added Phase 0** - Integration audit prevents technical debt
- ✅ **Game-specific attributes** - Aligned with settlement/exploration gameplay
- ✅ **Simplified abilities** - Max 8 active abilities
- ✅ **Fixed scaling** - Linear + percentage instead of exponential
- ✅ **Save versioning** - Protected player data from day one
- ✅ **Performance budgets** - Clear optimization targets
- ✅ **Missing features added** - Loadouts, preview mode, progression viz

**Key Philosophy:**
> "Ship 30 amazing skills instead of 90 mediocre ones."

**Next Steps:**
1. Review and approve revised plan
2. Start Phase 0: Integration Audit
3. Build MVP (Weeks 1-5)
4. Gather player feedback
5. Iterate based on data

---

## Appendix: Quick Reference

### MVP Scope Summary

**Included:**
- 6 game-specific attributes
- Settlement skill tree (30 nodes)
- Basic character sheet UI
- Save versioning system
- Core integrations

**Excluded (Post-MVP):**
- Explorer and Combat trees
- Equipment sets and sockets
- Item rarity tiers
- Character customization
- Class system
- Advanced features

### Timeline Summary

**MVP:** 5 weeks
**Post-MVP:** 10 weeks (optional, iterative)
**Total:** 5-15 weeks depending on scope

### Performance Budget Summary

- Stat calculation: <5ms
- Character sheet render: <8ms
- Skill tree render: <16ms
- Memory overhead: <20MB

### Contact & Review

**Document Status:** ✅ Ready for Review (v2.0 with Claude Opus feedback)
**Next Review Date:** Upon MVP completion
**Maintained By:** Development Team

For questions or feedback on this revised plan, open a GitHub Discussion or Issue.

---

## Version History

- **v1.0** (2025-11-21) - Initial plan created
- **v2.0** (2025-11-21) - Major revision incorporating Claude Opus feedback
  - Reduced scope to MVP-first approach
  - Added Phase 0: Integration Audit
  - Redesigned attributes (game-specific)
  - Redesigned skill trees (gameplay-aligned)
  - Simplified active abilities (8 max)
  - Fixed exponential scaling
  - Added save versioning strategy
  - Added performance budgets
  - Added missing features (loadouts, preview, visualization)

---

**Last Updated:** 2025-11-21
**Version:** 2.0 (Claude Opus Revision)
**Status:** 🟢 Ready for Implementation
