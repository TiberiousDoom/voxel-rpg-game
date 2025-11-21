# RPG Character System Implementation Plan

**Last Updated:** 2025-11-21
**Status:** Active - Planning Phase
**Purpose:** Comprehensive plan to enhance the player character system with full RPG features including character menus, skills, inventory, stats, progression, and customization

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Gap Analysis](#gap-analysis)
4. [Proposed Features](#proposed-features)
5. [Implementation Phases](#implementation-phases)
6. [Technical Architecture](#technical-architecture)
7. [Integration Points](#integration-points)
8. [UI/UX Design](#uiux-design)
9. [Data Structures](#data-structures)
10. [Balance Considerations](#balance-considerations)
11. [Testing Strategy](#testing-strategy)
12. [Timeline & Resources](#timeline--resources)

---

## Executive Summary

### Vision

Transform the player character from a basic entity with health/stamina into a deep, customizable RPG character with:
- **Character Sheet** - Detailed stats, attributes, and progression
- **Skill Trees** - Multiple progression paths and build diversity
- **Enhanced Inventory** - Comprehensive item management with categories
- **Equipment System** - Full gear slots with set bonuses
- **Character Customization** - Visual appearance and naming
- **Attribute System** - Core stats affecting gameplay (STR, DEX, INT, etc.)
- **Class System** - Optional specializations with unique abilities

### Goals

1. **Depth** - Provide meaningful character progression choices
2. **Replayability** - Enable different character builds and playstyles
3. **Integration** - Seamlessly integrate with existing settlement/combat systems
4. **Accessibility** - Maintain ease of use while adding complexity
5. **Performance** - Ensure no impact on game performance

### Timeline Overview

```
Phase 1: Foundation Systems (2-3 weeks)
  ↓
Phase 2: Character Menus & UI (2 weeks)
  ↓
Phase 3: Skill Trees (3-4 weeks)
  ↓
Phase 4: Enhanced Inventory (1-2 weeks)
  ↓
Phase 5: Polish & Balance (1-2 weeks)
```

**Total Estimated Time:** 9-13 weeks

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

**Strengths:**
- Clean, simple architecture
- Good foundation for expansion
- Proper collision detection

**Limitations:**
- No level/XP system integration
- No stat scaling
- Limited to health/stamina

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

**Strengths:**
- Comprehensive combat integration
- Equipment stat bonuses working
- Advanced mechanics (dodge, block, combo)
- Spell casting system

**Limitations:**
- Stats are flat values with no attribute scaling
- No skill trees or progression paths
- Limited build diversity
- No character customization

#### 3. Game Store (`src/stores/useGameStore.js`)
**Current Features:**
- Player state management
- Equipment slots: weapon, armor, helmet, gloves, boots, ring1, ring2, amulet, offhand
- Inventory: gold, essence, crystals, potions, items array, materials
- XP and leveling system
- Skill points (not used yet)

**Strengths:**
- Well-structured state management
- Equipment system ready for expansion
- Skill points placeholder exists

**Limitations:**
- Skill points not connected to any system
- No attribute system
- Basic inventory structure
- No character sheet data

#### 4. Spell System (`src/data/spells.js`)
**Current Features:**
- 11+ spells across 4 categories (damage, control, support, status)
- Mana costs and cooldowns
- Status effects system
- Keyboard shortcuts (1-6, Q, E, R, F, T)

**Strengths:**
- Well-designed spell variety
- Good categorization
- Working cooldown system

**Limitations:**
- No spell unlocking/progression
- No spell upgrading
- Not tied to character build

#### 5. Equipment & Inventory (`src/components/InventoryUI.jsx`, `src/utils/equipmentStats.js`)
**Current Features:**
- Equipment management UI
- Item equipping/unequipping
- Equipment stat calculation
- Mobile-responsive design

**Strengths:**
- Functional equipment system
- Good UI foundation

**Limitations:**
- Basic inventory categorization
- No item comparison
- No equipment sets
- Limited item filtering/sorting

### Existing Related Systems

#### Achievement System
- 50 achievements across 5 categories
- Reward system (not fully connected)
- Could integrate with character milestones

#### Tutorial System
- 12-step tutorial
- Context-sensitive help
- Could guide character progression

#### Event System
- Random/seasonal events
- Could tie into character challenges/quests

---

## Gap Analysis

### Critical Missing Features

#### 1. **Attribute System** 🔴 CRITICAL
**What's Missing:**
- No core attributes (Strength, Dexterity, Intelligence, Vitality, Wisdom, Luck)
- No attribute points on level up
- No attribute-based stat scaling
- No attribute requirements for equipment

**Impact:** High
- Limits build diversity
- No meaningful stat choices
- Equipment feels generic

#### 2. **Skill Trees** 🔴 CRITICAL
**What's Missing:**
- No skill tree system
- Skill points accumulate but aren't usable
- No passive abilities
- No active ability unlocks
- No build specialization

**Impact:** Very High
- No character progression depth
- No replayability incentive
- Limited playstyle variety

#### 3. **Character Sheet/Menu** 🔴 CRITICAL
**What's Missing:**
- No comprehensive character stats screen
- No way to view total stats with bonuses
- No attribute allocation UI
- No character overview

**Impact:** High
- Players can't see their build
- No way to make informed decisions
- Poor user experience

#### 4. **Enhanced Inventory System** 🟡 HIGH PRIORITY
**What's Missing:**
- No item categories/tabs
- No item filtering
- No item comparison tooltips
- No quick-slot system
- Limited inventory space management

**Impact:** Medium-High
- Poor inventory management UX
- Difficult to find items
- No way to compare gear

#### 5. **Character Customization** 🟡 HIGH PRIORITY
**What's Missing:**
- No character creation screen
- No character naming
- No visual customization
- No class selection

**Impact:** Medium
- Less player connection to character
- No character identity
- Limited RPG feel

#### 6. **Equipment Enhancements** 🟢 MEDIUM PRIORITY
**What's Missing:**
- No equipment sets with bonuses
- No item rarity tiers (common, rare, epic, legendary)
- No equipment upgrade system
- No gem/socket system
- No equipment durability

**Impact:** Medium
- Less equipment variety
- Limited itemization depth
- No long-term equipment goals

#### 7. **Class/Specialization System** 🟢 MEDIUM PRIORITY
**What's Missing:**
- No class selection
- No class-specific abilities
- No hybrid builds
- No multiclassing

**Impact:** Medium
- Less build identity
- Fewer progression paths
- Reduced replayability

---

## Proposed Features

### Feature 1: Attribute System

#### Core Attributes

**Primary Attributes (6 total):**

1. **Strength (STR)**
   - Primary: Melee damage
   - Secondary: Carry capacity, building placement speed
   - Per point: +2 melee damage, +5 carry weight

2. **Dexterity (DEX)**
   - Primary: Attack speed, dodge chance
   - Secondary: Ranged damage, crit chance
   - Per point: +2% attack speed, +0.5% dodge, +1 ranged damage

3. **Intelligence (INT)**
   - Primary: Spell damage, mana pool
   - Secondary: Crafting quality, research speed
   - Per point: +5% spell damage, +10 max mana

4. **Vitality (VIT)**
   - Primary: Max health, health regen
   - Secondary: Stamina, resistance
   - Per point: +20 max health, +0.5 health regen/sec

5. **Wisdom (WIS)**
   - Primary: Mana regen, cooldown reduction
   - Secondary: XP gain, resource gathering bonus
   - Per point: +1 mana regen/sec, +2% XP gain

6. **Luck (LCK)**
   - Primary: Crit chance, loot quality
   - Secondary: Dodge chance, rare event chance
   - Per point: +0.5% crit chance, +1% better loot

**Attribute Point Allocation:**
- 5 points per level
- Starting stats: 10 in each attribute
- Max stat cap: 200 per attribute
- Respec option: Costs gold/essence (limited uses per tier)

**Derived Stats Formula:**
```javascript
// Example calculations
maxHealth = 100 + (vitality * 20);
maxMana = 100 + (intelligence * 10);
maxStamina = 100 + (vitality * 5);
meleeDamage = baseDamage + (strength * 2);
spellDamage = baseDamage + (baseDamage * intelligence * 0.05);
critChance = 5 + (dexterity * 0.5) + (luck * 0.5);
dodgeChance = 5 + (dexterity * 0.5) + (luck * 0.3);
```

---

### Feature 2: Skill Tree System

#### Overview
Three major skill trees with 30-40 nodes each:

1. **Combat Tree** - Warrior-focused abilities
2. **Magic Tree** - Spellcaster-focused abilities
3. **Utility Tree** - Settlement/support abilities

#### Skill Tree Structure

**Tier System:**
- **Tier 1** (Level 1-10): Basic passive bonuses
- **Tier 2** (Level 11-20): Enhanced passives + minor actives
- **Tier 3** (Level 21-35): Major passives + powerful actives
- **Tier 4** (Level 36-50): Elite abilities + ultimate skills
- **Tier 5** (Level 50+): Capstone abilities (one per tree)

#### Combat Tree (Warrior Path)

**Tier 1 Skills (Cost: 1 point each):**
1. **Power Strike** - +10% melee damage
2. **Tough Skin** - +5% damage reduction
3. **Weapon Mastery** - +5% attack speed
4. **Battle Rage** - Gain 5 rage per enemy kill
5. **Shield Training** - +15% block effectiveness

**Tier 2 Skills (Cost: 2 points each, requires 5 points in tree):**
6. **Whirlwind** (Active) - Spin attack hitting all nearby enemies (Cost: 30 stamina, CD: 8s)
7. **Berserker Rage** (Passive) - +1% damage per 10 rage
8. **Fortified Defense** - +10% max health
9. **Cleave** - Attacks hit 1 additional enemy
10. **War Cry** (Active) - Buff nearby NPCs +20% damage for 10s (Cost: 40 stamina, CD: 30s)

**Tier 3 Skills (Cost: 3 points each, requires 15 points in tree):**
11. **Execute** (Active) - Deal 300% damage to enemies below 30% health (Cost: 50 stamina, CD: 15s)
12. **Unbreakable** (Passive) - Become immune to stuns and slows
13. **Blood Thirst** - Heal 5% max HP per kill
14. **Champion's Might** - +25% damage when at full health
15. **Ground Slam** (Active) - AOE stun for 2s (Cost: 60 stamina, CD: 20s)

**Tier 4 Skills (Cost: 4 points each, requires 30 points in tree):**
16. **Avatar of War** (Ultimate) - 10s buff: +50% damage, +30% speed, immune to CC (Cost: 100 stamina, CD: 60s)
17. **Weapon Master** - Can dual-wield or use any weapon type
18. **Undying Fury** - Survive lethal damage once per 2 minutes
19. **Titan Strength** - Carry 2x capacity, +30% damage
20. **Rally** (Active) - Fully heal all nearby NPCs (Cost: 80 stamina, CD: 90s)

**Tier 5 Capstone (Cost: 5 points, requires 45 points in tree):**
21. **God of War** - Permanent +50% combat stats, unlock Divine Fury ability

#### Magic Tree (Mage Path)

**Tier 1 Skills:**
1. **Arcane Knowledge** - +10% spell damage
2. **Mana Flow** - +5 mana regen per second
3. **Spell Efficiency** - -10% mana costs
4. **Quick Cast** - -10% spell cooldowns
5. **Magic Shield** - Gain 50 shield after casting (5s duration)

**Tier 2 Skills:**
6. **Fireball Mastery** - Fireball explodes in larger AOE
7. **Ice Armor** (Active) - +30% damage reduction, slow attackers (Cost: 40 mana, CD: 30s)
8. **Lightning Reflexes** - Lightning Bolt chains to 2 targets
9. **Spell Focus** - Critical spells deal +50% damage
10. **Arcane Missiles** (Active) - Barrage of 5 missiles (Cost: 50 mana, CD: 12s)

**Tier 3 Skills:**
11. **Elemental Master** - All elemental damage +25%
12. **Meteor Storm** (Active) - Rain fire AOE (Cost: 80 mana, CD: 25s)
13. **Mana Shield** - Convert 50% damage to mana drain
14. **Time Warp** (Active) - Reduce all cooldowns by 50% for 5s (Cost: 60 mana, CD: 45s)
15. **Spell Weaving** - Casting 3 spells in 5s grants +30% spell damage for 8s

**Tier 4 Skills:**
16. **Archmage** (Ultimate) - 15s: Free spells, instant cast (Cost: 150 mana, CD: 90s)
17. **Omniscient** - See all enemies on map, +20% damage to marked targets
18. **Elemental Fusion** - Combine elements for new spell effects
19. **Astral Projection** - Teleport anywhere on map (Cost: 100 mana, CD: 60s)
20. **Black Hole** (Active) - Suck all enemies to a point, stun 3s (Cost: 120 mana, CD: 90s)

**Tier 5 Capstone:**
21. **Arcane Ascension** - Permanent +100% mana pool, unlock Reality Tear ultimate

#### Utility Tree (Builder/Support Path)

**Tier 1 Skills:**
1. **Fast Hands** - +10% building placement speed
2. **Resourceful** - +10% resource gathering
3. **Town Planning** - Buildings cost 10% less
4. **Negotiator** - Merchants offer 15% better prices
5. **Green Thumb** - Farms produce +15% food

**Tier 2 Skills:**
6. **Master Builder** - Place buildings 2x faster
7. **Gold Rush** (Passive) - +20% gold from all sources
8. **NPC Training** - NPCs level up 25% faster
9. **Inspiring Presence** (Active) - All NPCs +30% productivity for 30s (Cost: 40 stamina, CD: 60s)
10. **Scavenger** - Find extra materials when gathering

**Tier 3 Skills:**
11. **Town Hall Upgrade** - Unlock tier upgrades for all buildings
12. **Mass Production** - All production buildings +25% output
13. **Kingdom's Blessing** (Active) - Double all resource gains for 20s (Cost: 60 stamina, CD: 120s)
14. **Architect** - Can place unique building blueprints
15. **Trade Master** - Unlock special merchant trades

**Tier 4 Skills:**
16. **Empire Builder** (Ultimate) - 30s: Free building placement, instant construction (CD: 180s)
17. **Legendary Craftsman** - Craft legendary tier items
18. **Settlement Guardian** - All buildings +50% defense
19. **Abundant Harvest** - Resource nodes never deplete
20. **Master of All** - Gain +10% to ALL stats per 5 buildings placed

**Tier 5 Capstone:**
21. **Civilization** - Unlock city-level buildings, permanent +100% settlement stats

#### Skill Point Acquisition
- **Per Level:** 1 skill point
- **Quests:** 1-3 skill points for major quests
- **Achievements:** 1 skill point for specific achievements
- **Rare Events:** Chance for bonus skill points
- **Total Available:** ~100 points by max level (can't max all trees)

---

### Feature 3: Character Sheet & Menus

#### Main Character Menu (Press 'C')

**Tabs:**
1. **Character** - Stats and attributes
2. **Skills** - Skill tree interface
3. **Equipment** - Gear management (already exists, enhance)
4. **Inventory** - Items (already exists, enhance)
5. **Achievements** - Progress tracking (already exists)
6. **Crafting** - Recipe management (already exists)

#### Character Stats Tab Layout

**Left Panel - Core Stats:**
```
=== CHARACTER SHEET ===

Name: [Editable]
Level: 42
XP: 8,450 / 10,000 (84%)
Class: Battle Mage

=== ATTRIBUTES ===
Strength:     45 (+15 equipment)
Dexterity:    38 (+8 equipment)
Intelligence: 52 (+20 equipment)
Vitality:     40 (+12 equipment)
Wisdom:       35 (+5 equipment)
Luck:         28 (+3 equipment)

Available Points: 5
[Allocate Points] [Reset ($500)]
```

**Center Panel - Derived Stats:**
```
=== COMBAT STATS ===
Health:      900 / 900
Mana:        620 / 620
Stamina:     300 / 300

Damage:      85 (62 base + 23 equipment)
Spell Power: 286 (150 base + 136 int scaling)
Defense:     42 (30 equipment + 12 skills)
Attack Speed: 1.45 (base 1.0 + 45% bonus)

Crit Chance:  24.5%
Crit Damage:  210%
Dodge Chance: 19%
Block Chance: 15%

=== RESISTANCES ===
Fire:     25%
Ice:      15%
Lightning: 20%
Physical: 30%
```

**Right Panel - Secondary Stats:**
```
=== UTILITY STATS ===
Movement Speed:   6.2
Interaction Range: 2.5
Carry Capacity:   325 / 400

Resource Bonus:   +35%
Building Speed:   +40%
XP Gain:          +18%
Gold Find:        +25%
Loot Quality:     +14%

=== SKILL TREES ===
Combat:  32 / 50 points
Magic:   18 / 50 points
Utility: 12 / 50 points

Unspent: 3 points
[Manage Skills]
```

---

### Feature 4: Enhanced Inventory System

#### Inventory Organization

**Tab Structure:**
1. **All** - View everything
2. **Equipment** - Weapons, armor, accessories
3. **Consumables** - Potions, food, scrolls
4. **Materials** - Crafting resources, essence, crystals
5. **Quest** - Quest items and special items
6. **Junk** - Vendor trash

#### New Inventory Features

**Item Slots:**
- Base capacity: 30 slots
- Increased by +5 per 10 Strength
- Max capacity: 100 slots
- Stackable items (materials, consumables)

**Item Comparison:**
```
[Hovering over new item shows comparison]

Iron Sword          vs    Steel Sword
+25 Damage                +40 Damage    [+15]
+5 STR                    +8 STR        [+3]
5% Crit                   8% Crit       [+3%]
                          +15% Attack   [NEW]
Value: 50g                Value: 150g
[EQUIPPED]                [Better] [Equip]
```

**Filtering & Sorting:**
- Filter by: Rarity, Level, Type, Usability
- Sort by: Name, Value, Level, Recently Acquired
- Quick-filter buttons for common searches

**Item Rarity Tiers:**
1. **Common** (White) - Basic items
2. **Uncommon** (Green) - 1-2 bonus stats
3. **Rare** (Blue) - 2-3 bonus stats, higher values
4. **Epic** (Purple) - 3-4 bonus stats, unique effects
5. **Legendary** (Orange) - 4-5 bonus stats, powerful effects
6. **Mythic** (Red) - 5-6 bonus stats, game-changing effects

**Quick-Slot System:**
- 6 quick slots (1-6 keys)
- Assign consumables or items
- Use without opening inventory
- Visual cooldown indicators

---

### Feature 5: Character Customization

#### Character Creation Screen (New Game)

**Step 1: Identity**
- Character Name (15 char max)
- Appearance Selection:
  - Skin tone (8 options)
  - Hair style (12 options)
  - Hair color (10 options)
  - Facial features (8 options)
  - Body type (3 options)

**Step 2: Starting Class (Optional)**
- **Warrior** - Starts with +5 STR, +5 VIT, basic sword, light armor
- **Mage** - Starts with +5 INT, +5 WIS, basic staff, robes, 2 extra spells
- **Scout** - Starts with +5 DEX, +5 LCK, basic bow, leather armor
- **Builder** - Starts with +10 VIT, +200 starting resources, basic tools
- **Balanced** - Even distribution, no bonuses, most flexible

**Step 3: Background (Flavor/Minor Bonuses)**
- **Noble** - Start with +500 gold, +10% merchant prices
- **Soldier** - Start with better weapon, +5% damage
- **Scholar** - Start with +10% XP gain, 1 research unlocked
- **Commoner** - No bonuses, +1 extra skill point at start

#### In-Game Customization

**Appearance Changes:**
- Visit "Barber" building to change hair/appearance
- Costs gold (50-200g)
- Unlimited changes

**Character Rename:**
- Rare item or achievement reward
- Limited uses (1-3 times per playthrough)

**Title System:**
- Earn titles from achievements
- Display title above character name
- Examples: "Dragonslayer", "Master Builder", "Archmage", "The Wealthy"

---

### Feature 6: Equipment Enhancements

#### Equipment Set System

**Set Bonuses (Example: "Warrior's Valor Set"):**
```
Warrior's Helm (2/5 pieces equipped)
Warrior's Chest (+20% health regen)
Warrior's Gauntlets
Warrior's Greaves
Warrior's Shield (4/5 pieces equipped)
                (+50 max health, +10% damage)

Set Bonuses:
(2) +20% health regeneration
(4) +50 max health, +10% damage
(5) +100 max health, gain "Warrior's Fury" ability
```

**Equipment Set Categories:**
- **Combat Sets** (5 sets) - Warrior, Berserker, Guardian, Duelist, Paladin
- **Magic Sets** (5 sets) - Archmage, Pyromancer, Cryomancer, Storm Caller, Necromancer
- **Utility Sets** (3 sets) - Builder's Pride, Merchant's Fortune, Explorer's Endurance
- **Hybrid Sets** (3 sets) - Battle Mage, Spell Blade, Arcane Warrior

#### Item Socket System

**Socket Types:**
- **Weapon Sockets** (1-3 sockets) - Damage, effects, procs
- **Armor Sockets** (1-2 sockets) - Defense, resistance, utility
- **Accessory Sockets** (1 socket) - Special effects

**Gem Types:**
1. **Ruby** - +Fire damage, +Fire resistance
2. **Sapphire** - +Ice damage, +Ice resistance
3. **Topaz** - +Lightning damage, +Lightning resistance
4. **Emerald** - +Health, +Health regen
5. **Amethyst** - +Mana, +Mana regen
6. **Diamond** - +All stats, +XP gain
7. **Onyx** - +Critical chance, +Critical damage

**Socket Operations:**
- **Add Socket** - Use socketing tool + resources (expensive)
- **Insert Gem** - Place gem in socket (permanent until removed)
- **Remove Gem** - Extract gem (costs gold, may destroy gem)
- **Upgrade Gem** - Combine 3 gems → next tier gem

**Gem Tiers:**
- Tier 1: +5% bonus
- Tier 2: +10% bonus
- Tier 3: +15% bonus
- Tier 4: +25% bonus
- Tier 5: +40% bonus

#### Equipment Upgrade System

**Upgrade Mechanics:**
- Upgrade items +1 to +10
- Each upgrade: +10% base stats
- Costs scale exponentially
- Requires materials + gold
- Higher tiers more expensive

**Upgrade Formula:**
```javascript
// Cost per upgrade level
const upgradeCost = baseValue * level * 2;
const materialsNeeded = {
  wood: 10 * level,
  iron: 5 * level,
  essence: level > 5 ? (level - 5) * 2 : 0,
  crystal: level > 8 ? (level - 8) : 0
};

// Stat bonus
const statBonus = baseStats * (1 + (upgradeLevel * 0.1));
```

**Visual Indicators:**
- +1 to +3: Normal glow
- +4 to +6: Enhanced glow + sparkles
- +7 to +9: Bright glow + particles
- +10: Radiant glow + special effect

---

### Feature 7: Class Specialization System (Optional)

#### Class Selection

**When Available:**
- Level 10: Choose primary class
- Level 30: Choose secondary class (hybrid build)
- Can respec classes at level milestones (20, 40, 60)

**Primary Classes (Choose 1 at Level 10):**

1. **Warrior**
   - +10% melee damage
   - +5% health
   - Unlock: Shield Bash ability
   - Combat tree skills 20% cheaper

2. **Mage**
   - +15% spell damage
   - +10% mana pool
   - Unlock: Arcane Blast ability
   - Magic tree skills 20% cheaper

3. **Ranger**
   - +10% ranged damage
   - +10% movement speed
   - Unlock: Multi-Shot ability
   - +15% critical chance

4. **Builder**
   - +25% building speed
   - +20% resource gathering
   - Unlock: Instant Build ability (1/day)
   - Utility tree skills 20% cheaper

5. **Hybrid**
   - +5% to all stats
   - No specialization bonuses
   - Can access all skill tree capstones
   - Most flexible build

**Secondary Classes (Choose 1 at Level 30):**
- Adds 50% of chosen class bonuses
- Enables "hybrid" abilities
- Examples: Battle Mage (Warrior + Mage), Spell Blade (Ranger + Mage)

---

## Implementation Phases

### Phase 1: Foundation Systems (Weeks 1-3)

#### Week 1: Attribute System
**Tasks:**
1. Create `AttributeSystem.js` class
   - Attribute storage and calculations
   - Derived stat formulas
   - Point allocation logic
2. Update `useGameStore` with attribute state
3. Add attribute calculations to player stats
4. Implement attribute scaling for combat
5. Add serialization for save/load

**Deliverables:**
- Working attribute system backend
- Stats properly scale with attributes
- Save/load support
- Unit tests for calculations

**Files to Create/Modify:**
- `src/modules/character/AttributeSystem.js` (NEW)
- `src/stores/useGameStore.js` (MODIFY)
- `src/components/3d/Player.jsx` (MODIFY)
- `src/modules/player/PlayerEntity.js` (MODIFY)

#### Week 2: Character Data Structure
**Tasks:**
1. Design comprehensive character data schema
2. Implement `CharacterManager.js`
3. Add character creation flow
4. Update serialization system
5. Migration for existing saves

**Deliverables:**
- Character manager system
- Save/load with full character data
- Backward compatibility with old saves

**Files to Create:**
- `src/modules/character/CharacterManager.js`
- `src/modules/character/CharacterData.js`
- `src/modules/character/migrations/v1-to-v2.js`

#### Week 3: Skill Tree Backend
**Tasks:**
1. Create `SkillTreeSystem.js`
2. Define all skill tree nodes (JSON)
3. Implement skill point allocation
4. Add skill prerequisites checking
5. Create skill effect application system

**Deliverables:**
- Skill tree data structure
- Skill allocation backend
- Passive skill effects working
- Save/load support

**Files to Create:**
- `src/modules/character/SkillTreeSystem.js`
- `src/modules/character/SkillNode.js`
- `src/data/skillTrees/combatTree.json`
- `src/data/skillTrees/magicTree.json`
- `src/data/skillTrees/utilityTree.json`

---

### Phase 2: Character Menus & UI (Weeks 4-5)

#### Week 4: Character Sheet UI
**Tasks:**
1. Create `CharacterSheet.jsx` component
2. Design stats display layout
3. Implement attribute allocation UI
4. Add stat tooltips and explanations
5. Mobile-responsive design

**Deliverables:**
- Character sheet UI
- Attribute allocation interface
- Stat breakdown tooltips
- Keyboard shortcut ('C' to open)

**Files to Create:**
- `src/components/character/CharacterSheet.jsx`
- `src/components/character/AttributePanel.jsx`
- `src/components/character/StatsDisplay.jsx`
- `src/styles/CharacterSheet.css`

#### Week 5: Skill Tree UI
**Tasks:**
1. Create `SkillTreeUI.jsx` component
2. Implement interactive skill tree visualization
3. Add skill node tooltips
4. Implement point allocation UI
5. Add visual feedback (unlocked/locked states)
6. Create skill preview system

**Deliverables:**
- Interactive skill tree UI
- Skill allocation interface
- Visual skill tree paths
- Skill descriptions and requirements

**Files to Create:**
- `src/components/character/SkillTreeUI.jsx`
- `src/components/character/SkillNode.jsx`
- `src/components/character/SkillTooltip.jsx`
- `src/styles/SkillTree.css`

---

### Phase 3: Enhanced Skill Trees (Weeks 6-9)

#### Week 6-7: Active Skills Implementation
**Tasks:**
1. Implement all active skill abilities
2. Create skill activation system
3. Add cooldown tracking per skill
4. Implement skill hotkeys
5. Add skill visual effects
6. Balance mana/stamina costs

**Deliverables:**
- All 15+ active skills working
- Skill cooldown system
- Visual effects for skills
- Skill hotkey bindings

**Files to Create/Modify:**
- `src/modules/character/SkillActivation.js`
- `src/data/skills/activeSkills.js`
- `src/components/effects/SkillEffects.jsx`

#### Week 8: Passive Skills Implementation
**Tasks:**
1. Implement all passive skill effects
2. Add stat modification system
3. Create buff/debuff application
4. Add passive effect stacking
5. Implement condition-based passives

**Deliverables:**
- All 50+ passive skills working
- Stat calculation with passives
- Conditional passive triggers

**Files to Create:**
- `src/modules/character/PassiveEffects.js`
- `src/data/skills/passiveSkills.js`

#### Week 9: Ultimate Skills & Capstones
**Tasks:**
1. Implement capstone abilities
2. Add ultimate skill mechanics
3. Create special visual effects
4. Add achievement triggers for capstones
5. Balance ultimate abilities

**Deliverables:**
- 3 capstone abilities
- Ultimate skill system
- Special effects and animations

---

### Phase 4: Enhanced Inventory (Weeks 10-11)

#### Week 10: Inventory Improvements
**Tasks:**
1. Implement item categorization
2. Add inventory tabs
3. Create item filtering system
4. Add item sorting options
5. Implement quick-slots
6. Add item comparison tooltips

**Deliverables:**
- Enhanced inventory UI
- Tabbed organization
- Filtering and sorting
- Quick-slot system

**Files to Modify:**
- `src/components/InventoryUI.jsx`
- `src/stores/useGameStore.js`
- `src/styles/InventoryUI.css`

#### Week 11: Item Enhancements
**Tasks:**
1. Implement item rarity system
2. Add equipment set bonuses
3. Create socket system
4. Implement gem crafting
5. Add item upgrade system
6. Create visual rarity indicators

**Deliverables:**
- Item rarity tiers
- Set bonus system
- Socket and gem system
- Item upgrading

**Files to Create:**
- `src/modules/items/RaritySystem.js`
- `src/modules/items/SetBonuses.js`
- `src/modules/items/SocketSystem.js`
- `src/modules/items/ItemUpgrade.js`

---

### Phase 5: Polish & Balance (Weeks 12-13)

#### Week 12: Character Customization
**Tasks:**
1. Create character creation screen
2. Implement appearance customization
3. Add class selection UI
4. Create character naming system
5. Add title system
6. Implement respec system

**Deliverables:**
- Character creation flow
- Appearance customization
- Class selection
- Title system

**Files to Create:**
- `src/components/character/CharacterCreation.jsx`
- `src/components/character/AppearanceEditor.jsx`
- `src/components/character/ClassSelection.jsx`

#### Week 13: Final Polish
**Tasks:**
1. Balance all skills and stats
2. Performance optimization
3. Add achievement integrations
4. Create tutorial updates
5. Fix bugs and edge cases
6. Write documentation
7. Comprehensive testing

**Deliverables:**
- Balanced gameplay
- Bug-free experience
- Updated tutorials
- Complete documentation

---

## Technical Architecture

### Module Structure

```
src/
├── modules/
│   └── character/
│       ├── AttributeSystem.js       # Attribute management
│       ├── CharacterManager.js      # Main character controller
│       ├── SkillTreeSystem.js       # Skill tree logic
│       ├── SkillNode.js             # Individual skill nodes
│       ├── SkillActivation.js       # Active skill execution
│       ├── PassiveEffects.js        # Passive skill effects
│       ├── CharacterData.js         # Data schemas
│       └── __tests__/               # Unit tests
├── components/
│   └── character/
│       ├── CharacterSheet.jsx       # Main character UI
│       ├── AttributePanel.jsx       # Attribute allocation
│       ├── StatsDisplay.jsx         # Stat breakdown
│       ├── SkillTreeUI.jsx          # Skill tree interface
│       ├── SkillNode.jsx            # Skill node component
│       ├── SkillTooltip.jsx         # Skill descriptions
│       ├── CharacterCreation.jsx    # Character creator
│       ├── AppearanceEditor.jsx     # Appearance customization
│       └── ClassSelection.jsx       # Class picker
├── data/
│   ├── skillTrees/
│   │   ├── combatTree.json
│   │   ├── magicTree.json
│   │   └── utilityTree.json
│   ├── skills/
│   │   ├── activeSkills.js
│   │   └── passiveSkills.js
│   └── classes/
│       └── classDefinitions.js
└── styles/
    ├── CharacterSheet.css
    └── SkillTree.css
```

### Integration with Existing Systems

#### Game Store Integration
```javascript
// Extend useGameStore
{
  // New character state
  character: {
    name: 'Hero',
    level: 1,
    xp: 0,
    attributes: {
      strength: 10,
      dexterity: 10,
      intelligence: 10,
      vitality: 10,
      wisdom: 10,
      luck: 10,
    },
    skillPoints: 0,
    attributePoints: 0,
    skills: {
      combat: [],    // Allocated skill IDs
      magic: [],
      utility: []
    },
    class: null,      // Primary class
    subClass: null,   // Secondary class
    appearance: {},   // Customization data
    titles: [],       // Earned titles
    activeTitle: null
  },

  // Actions
  allocateAttribute: (attribute, points) => { ... },
  allocateSkill: (tree, skillId, points) => { ... },
  resetSkills: () => { ... },
  resetAttributes: () => { ... },
  setClass: (className) => { ... },
  // ...
}
```

#### Combat System Integration
```javascript
// Modify damage calculation
const calculateDamage = (player, equipment, skills) => {
  const attributes = player.character.attributes;

  // Base damage from equipment
  let damage = getTotalStats(player, equipment).damage;

  // Add attribute scaling
  damage += attributes.strength * 2; // STR scaling

  // Add passive skill bonuses
  const combatBonus = getSkillBonus('combat', 'damage');
  damage *= (1 + combatBonus);

  // Add class bonuses
  if (player.character.class === 'Warrior') {
    damage *= 1.1;
  }

  return damage;
};
```

#### Spell System Integration
```javascript
// Modify spell damage calculation
const calculateSpellDamage = (spell, player) => {
  const attributes = player.character.attributes;

  let damage = spell.damage;

  // Intelligence scaling
  damage += damage * (attributes.intelligence * 0.05);

  // Magic tree passive bonuses
  const magicBonus = getSkillBonus('magic', 'spellDamage');
  damage *= (1 + magicBonus);

  // Check for unlocked spell upgrades
  if (hasSkill('fireballMastery')) {
    // Apply mastery bonuses
  }

  return damage;
};
```

#### Achievement Integration
```javascript
// Award skill points for achievements
onAchievementUnlock: (achievementId) => {
  if (achievement.rewards.skillPoints) {
    addSkillPoints(achievement.rewards.skillPoints);
  }
}
```

---

## Data Structures

### Character Data Schema

```javascript
const CharacterSchema = {
  // Identity
  id: 'uuid-v4',
  name: 'Hero',
  createdAt: 1700000000000,
  playTime: 3600000, // milliseconds

  // Progression
  level: 42,
  xp: 8450,
  xpToNext: 10000,

  // Points
  skillPoints: 3,
  attributePoints: 5,

  // Attributes
  attributes: {
    strength: 45,
    dexterity: 38,
    intelligence: 52,
    vitality: 40,
    wisdom: 35,
    luck: 28
  },

  // Classes
  primaryClass: 'Mage',
  secondaryClass: 'Warrior',

  // Skills (allocated nodes)
  skills: {
    combat: [
      { id: 'powerStrike', points: 3, unlocked: true },
      { id: 'whirlwind', points: 1, unlocked: true }
    ],
    magic: [
      { id: 'arcaneKnowledge', points: 5, unlocked: true },
      { id: 'fireball mastery', points: 1, unlocked: true }
    ],
    utility: []
  },

  // Appearance
  appearance: {
    skinTone: 2,
    hairStyle: 5,
    hairColor: 3,
    facialFeatures: 1,
    bodyType: 1
  },

  // Titles
  titles: ['Dragonslayer', 'Archmage'],
  activeTitle: 'Archmage',

  // Stats snapshot (for quick access)
  cachedStats: {
    maxHealth: 900,
    maxMana: 620,
    maxStamina: 300,
    damage: 85,
    defense: 42,
    // ... other derived stats
  },

  // Meta
  respecsUsed: 1,
  respecsAvailable: 2
};
```

### Skill Node Schema

```javascript
const SkillNodeSchema = {
  id: 'powerStrike',
  name: 'Power Strike',
  description: 'Increases your melee damage',
  tree: 'combat',
  tier: 1,

  // Requirements
  requires: {
    level: 1,
    pointsInTree: 0,
    prerequisites: [], // Other skill IDs
    attributes: {
      strength: 15 // Optional
    }
  },

  // Cost
  maxPoints: 5,
  costPerPoint: 1,

  // Effects
  type: 'passive', // 'passive' | 'active'
  effects: [
    {
      type: 'stat_bonus',
      stat: 'meleeDamage',
      value: 10,
      valuePerPoint: 2, // +2% per additional point
      valueType: 'percent' // 'percent' | 'flat'
    }
  ],

  // Active skill properties (if applicable)
  active: {
    cooldown: 10,
    manaCost: 0,
    staminaCost: 30,
    castTime: 0,
    range: 5,
    aoe: false
  },

  // Visual
  icon: 'sword-icon',
  color: '#ff6b6b',
  position: { x: 100, y: 50 } // Position in skill tree UI
};
```

### Equipment Set Schema

```javascript
const EquipmentSetSchema = {
  id: 'warriorsValor',
  name: "Warrior's Valor Set",
  description: 'A legendary set worn by ancient warriors',

  pieces: [
    { slot: 'helmet', itemId: 'warriorsHelm' },
    { slot: 'armor', itemId: 'warriorsChest' },
    { slot: 'gloves', itemId: 'warriorsGauntlets' },
    { slot: 'boots', itemId: 'warriorsGreaves' },
    { slot: 'offhand', itemId: 'warriorsShield' }
  ],

  bonuses: [
    {
      piecesRequired: 2,
      effects: [
        { stat: 'healthRegen', value: 20, valueType: 'percent' }
      ]
    },
    {
      piecesRequired: 4,
      effects: [
        { stat: 'maxHealth', value: 50, valueType: 'flat' },
        { stat: 'damage', value: 10, valueType: 'percent' }
      ]
    },
    {
      piecesRequired: 5,
      effects: [
        { stat: 'maxHealth', value: 100, valueType: 'flat' },
        { type: 'ability', abilityId: 'warriorsFury' }
      ]
    }
  ]
};
```

---

## Balance Considerations

### Attribute Point Economy

**Points per Level:** 5
**Total Points by Level 50:** 245 points
**Starting Points:** 60 (10 in each attribute)
**Final Distribution Example:** 305 total points

**Soft Caps:**
- 50 points: Diminishing returns start
- 100 points: 50% effectiveness
- 150+ points: 25% effectiveness

**Respec Costs:**
- First respec: 500 gold
- Second respec: 2,000 gold + 10 essence
- Third respec: 5,000 gold + 50 essence + 5 crystals
- Limit: 5 respecs per tier

### Skill Point Economy

**Points per Level:** 1
**Bonus Sources:**
- Major quests: 1-3 points
- Achievements: 1 point each (~20 available)
- Events: Rare chance for 1 point

**Total Available (Level 50):** ~70-80 points
**Maximum Spent:** Cannot max all trees (forces choices)

### Combat Balance Targets

**Damage Scaling:**
- Level 1: 10-20 damage
- Level 10: 50-80 damage
- Level 25: 150-250 damage
- Level 50: 500-800 damage

**Health Scaling:**
- Level 1: 100 HP
- Level 10: 300-400 HP
- Level 25: 700-1000 HP
- Level 50: 1500-2500 HP

**Enemy Difficulty Scaling:**
- Enemies scale with player level
- Boss enemies: 3-5x player HP
- Elite enemies: 2x player HP
- Normal enemies: 0.5-1x player HP

### Skill Power Budget

**Tier 1 Skills:** 10-20% power budget
**Tier 2 Skills:** 25-35% power budget
**Tier 3 Skills:** 40-50% power budget
**Tier 4 Skills:** 60-75% power budget
**Tier 5 Capstones:** 100% power budget (game-changing)

**Active vs Passive:**
- Active skills: Higher power, gated by cooldowns
- Passive skills: Lower power, always active
- Ultimate skills: Extreme power, long cooldowns (60-180s)

---

## UI/UX Design

### Character Sheet Design

**Layout Philosophy:**
- **Left Panel:** Character identity and attributes (input)
- **Center Panel:** Derived stats (calculated output)
- **Right Panel:** Secondary stats and progression

**Design Principles:**
1. **Clarity** - Clear stat names and values
2. **Feedback** - Immediate visual feedback on changes
3. **Tooltips** - Explain everything with hover tooltips
4. **Comparison** - Show before/after for changes
5. **Mobile-First** - Responsive design for all screen sizes

### Skill Tree Design

**Visual Style:**
- Node-based tree structure
- Connected paths showing progression
- Color coding by tree (red=combat, blue=magic, green=utility)
- Locked/unlocked visual states
- Animated selection effects

**Interaction Design:**
- **Click** - Select skill node
- **Hover** - Show detailed tooltip
- **Right-click** - Refund point (if possible)
- **Shift-click** - Allocate multiple points
- **Path highlighting** - Show available paths from current position

**Mobile Considerations:**
- Pinch to zoom
- Tap for tooltip
- Long-press for multi-allocation
- Bottom drawer for skill details

### Inventory UI Improvements

**Visual Improvements:**
- Item rarity color coding
- Set item highlighting
- Socket visualization
- Upgrade level indicators (+1, +2, etc.)
- Quick visual comparison icons

**Interaction Improvements:**
- **Drag-and-drop** - Equip/unequip items
- **Quick equip** - Double-click to equip
- **Quick use** - Right-click consumables
- **Quick sell** - Shift-click for vendor trash
- **Lock items** - Prevent accidental deletion

---

## Testing Strategy

### Unit Tests

**Attribute System Tests:**
```javascript
describe('AttributeSystem', () => {
  test('calculates derived stats correctly', () => {
    const attrs = { strength: 50, dexterity: 30, ... };
    const stats = calculateDerivedStats(attrs);
    expect(stats.meleeDamage).toBe(110); // 10 base + (50 * 2)
  });

  test('respects soft caps', () => {
    const attrs = { strength: 150, ... };
    const bonus = getAttributeBonus('strength', 150);
    expect(bonus).toBeLessThan(150 * 2); // Diminishing returns
  });

  test('allocates points correctly', () => {
    const character = createCharacter();
    allocateAttribute(character, 'strength', 5);
    expect(character.attributes.strength).toBe(15);
    expect(character.attributePoints).toBe(0);
  });
});
```

**Skill Tree Tests:**
```javascript
describe('SkillTreeSystem', () => {
  test('validates prerequisites', () => {
    const canAllocate = checkSkillRequirements('whirlwind', character);
    expect(canAllocate).toBe(false); // Requires 5 points in combat tree
  });

  test('applies passive effects', () => {
    allocateSkill(character, 'powerStrike', 3);
    const damage = calculateMeleeDamage(character);
    expect(damage).toBeGreaterThan(baseDamage);
  });

  test('tracks skill points correctly', () => {
    const initialPoints = character.skillPoints;
    allocateSkill(character, 'arcaneKnowledge', 1);
    expect(character.skillPoints).toBe(initialPoints - 1);
  });
});
```

### Integration Tests

**Combat Integration:**
- Test attribute scaling in combat
- Test passive skill bonuses apply
- Test active skills execute correctly
- Test ultimate abilities work

**UI Integration:**
- Test character sheet displays correctly
- Test skill allocation UI works
- Test stat recalculation on changes
- Test save/load preserves character data

### Manual Testing Checklist

**Character Progression:**
- [ ] Level up awards correct points
- [ ] Attributes allocate correctly
- [ ] Skills allocate correctly
- [ ] Stats calculate correctly
- [ ] Respecs work properly

**UI/UX:**
- [ ] Character sheet opens (C key)
- [ ] Skill tree navigates smoothly
- [ ] Tooltips display correctly
- [ ] Mobile layout works
- [ ] Performance is acceptable

**Balance:**
- [ ] Early game feels balanced
- [ ] Mid game progression smooth
- [ ] Late game not overpowered
- [ ] Skill choices feel meaningful
- [ ] No obvious exploits

---

## Timeline & Resources

### Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Foundation | 2-3 weeks | None |
| Phase 2: Menus & UI | 2 weeks | Phase 1 complete |
| Phase 3: Skill Trees | 3-4 weeks | Phase 1 complete |
| Phase 4: Inventory | 1-2 weeks | Phase 1 complete |
| Phase 5: Polish | 1-2 weeks | All phases complete |
| **Total** | **9-13 weeks** | - |

### Resource Requirements

**Developer Time:**
- Backend systems: 4-5 weeks
- UI development: 3-4 weeks
- Balance/testing: 2-3 weeks
- **Total:** 9-12 weeks full-time

**Assets Needed:**
- Skill tree icons: 100+ icons
- UI layouts: 5-6 screens
- Sound effects: 20+ sounds (skill activation, levelup, etc.)
- Particle effects: 10+ effects

**External Dependencies:**
- None (uses existing systems)

### Milestones

**Milestone 1: Attributes Working (Week 3)**
- Attributes allocatable
- Stats scale with attributes
- Save/load working

**Milestone 2: UI Complete (Week 5)**
- Character sheet functional
- Skill tree UI working
- All menus accessible

**Milestone 3: Skills Complete (Week 9)**
- All skills implemented
- Passive effects working
- Active skills functional

**Milestone 4: Feature Complete (Week 11)**
- Inventory enhanced
- Sets and sockets working
- All features integrated

**Milestone 5: Release Ready (Week 13)**
- Balanced gameplay
- Bugs fixed
- Documentation complete

---

## Success Metrics

### Player Engagement Metrics

**Primary Metrics:**
- Average play session length: +30%
- Player retention (7-day): +25%
- Number of characters created per player: 2+

**Secondary Metrics:**
- Skill tree exploration rate: 80%+ of players allocate skills
- Character sheet open rate: 90%+ of players view stats
- Respec usage: 30%+ of players respec at least once

### Feature Adoption Metrics

**Attribute System:**
- 95%+ of players allocate attributes
- Average time to first allocation: <5 minutes
- Attribute respecs per player: 0.5 average

**Skill Trees:**
- 90%+ of players allocate skills
- Average skills unlocked per playthrough: 25-30
- Most popular tree: Track and analyze
- Capstone reach rate: 40%+ of players

**Inventory System:**
- Item comparison usage: 70%+ of players
- Quick-slot usage: 60%+ of players
- Set bonus achievement: 30%+ of players

### Technical Metrics

**Performance:**
- Character sheet load time: <100ms
- Skill tree render time: <50ms
- Stat calculation time: <10ms
- Memory overhead: <20MB

**Quality:**
- Bug reports: <5 critical bugs at launch
- Test coverage: 80%+ for character systems
- Save/load success rate: 99.9%+

---

## Risk Assessment & Mitigation

### Technical Risks

**Risk 1: Performance Impact**
- **Severity:** Medium
- **Probability:** Low
- **Mitigation:** Profile early, optimize calculations, cache derived stats
- **Contingency:** Implement lazy loading for UI components

**Risk 2: Save File Compatibility**
- **Severity:** High
- **Probability:** Medium
- **Mitigation:** Implement migration system, extensive testing
- **Contingency:** Provide manual save conversion tool

**Risk 3: Balance Issues**
- **Severity:** Medium
- **Probability:** High
- **Mitigation:** Extensive playtesting, data-driven configs
- **Contingency:** Hot-fix system for quick balance adjustments

### Scope Risks

**Risk 4: Feature Creep**
- **Severity:** High
- **Probability:** High
- **Mitigation:** Strict feature lock after Phase 1, MVP approach
- **Contingency:** Move additional features to post-launch updates

**Risk 5: Timeline Overrun**
- **Severity:** Medium
- **Probability:** Medium
- **Mitigation:** Buffer time in estimates, weekly progress reviews
- **Contingency:** Cut optional features (class system, item sockets)

### UX Risks

**Risk 6: Complexity Overwhelm**
- **Severity:** High
- **Probability:** Medium
- **Mitigation:** Progressive unlocking, enhanced tutorial system
- **Contingency:** Add "simplified mode" toggle

**Risk 7: Mobile UX Issues**
- **Severity:** Medium
- **Probability:** Medium
- **Mitigation:** Mobile-first design, early mobile testing
- **Contingency:** Separate mobile UI layout

---

## Next Steps

### Immediate Actions (Before Implementation)

1. **Review & Approve Plan** (1 day)
   - Stakeholder review
   - Feedback incorporation
   - Final approval

2. **Create Detailed Specs** (2-3 days)
   - Detailed attribute formulas
   - Complete skill tree definitions
   - UI mockups and wireframes

3. **Setup Development Environment** (1 day)
   - Create feature branch
   - Setup test framework
   - Create placeholder files

4. **Begin Phase 1** (Week 1)
   - Start with AttributeSystem.js
   - Update game store
   - Write unit tests

### Long-Term Roadmap

**Post-Launch Enhancements:**
- Talent presets/"builds" sharing
- Cloud save for character data
- Leaderboards by build type
- Seasonal skill tree modifications
- New skill trees (exploration, crafting, etc.)
- Advanced class system (prestige classes)

---

## Appendix

### Reference Links

**Current Architecture:**
- See [ARCHITECTURE.md](../../ARCHITECTURE.md)
- See [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)

**Related Systems:**
- Equipment system: `src/utils/equipmentStats.js`
- Spell system: `src/data/spells.js`
- Inventory UI: `src/components/InventoryUI.jsx`
- Player entity: `src/modules/player/PlayerEntity.js`

**Similar Implementations:**
- Diablo 3 skill system (inspiration)
- Path of Exile skill tree (complexity reference)
- World of Warcraft talent trees (UX reference)

### Glossary

- **Attribute:** Core character stat (STR, DEX, INT, VIT, WIS, LCK)
- **Derived Stat:** Calculated stat based on attributes (health, damage, etc.)
- **Skill Node:** Individual skill in skill tree
- **Skill Point:** Currency for unlocking skills
- **Capstone:** Final, powerful skill in each tree
- **Respec:** Reset character points for reallocation
- **Set Bonus:** Bonus for equipping multiple pieces of same equipment set

---

## Version History

- **v1.0** (2025-11-21) - Initial plan created
- Future versions will be tracked here

---

**Document Status:** ✅ Ready for Review
**Next Review Date:** Upon implementation start
**Maintained By:** Development Team

For questions or suggestions, open a GitHub Discussion or Issue.
