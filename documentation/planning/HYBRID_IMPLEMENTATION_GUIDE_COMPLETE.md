# Hybrid Game Implementation Guide - Complete Edition

**Last Updated:** 2025-11-15
**Author:** Claude (AI Assistant)
**Status:** Active
**Purpose:** Complete step-by-step implementation instructions for hybrid game integration with verification checkpoints for all 8 phases

---

## Table of Contents

1. [Overview](#overview)
2. [Milestone 1: Foundation](#milestone-1-foundation-phases-1-2)
   - [Phase 1: Core Systems](#phase-1-core-systems)
   - [Phase 2: NPC Combat System](#phase-2-npc-combat-system-10-12-hours)
3. [Milestone 2: Expeditions](#milestone-2-expeditions-phase-3)
   - [Phase 3: Expedition System](#phase-3-expedition-system-12-15-hours)
4. [Milestone 3: Defense](#milestone-3-defense-phase-4)
   - [Phase 4: Defense/Raid System](#phase-4-defenseraid-system-8-10-hours)
5. [Milestone 4: Polish](#milestone-4-polish-phases-5-8)
   - [Phase 5: Gameplay Integration](#phase-5-gameplay-integration--balance-6-8-hours)
   - [Phase 6: UI/UX Integration](#phase-6-uiux-integration-5-6-hours)
   - [Phase 7: Persistence](#phase-7-persistence--save-system-3-4-hours)
   - [Phase 8: Testing & Polish](#phase-8-testing--polish-6-8-hours)
6. [Common Pitfalls](#common-pitfalls)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### How to Use This Guide

This guide provides **complete, sequential instructions** for implementing the hybrid game integration. Each section includes:

- **Step-by-step tasks** in order of implementation
- **Verification checkpoints** to ensure each step works
- **Dependencies** showing what must be completed first
- **Code snippets** for key implementations
- **Testing instructions** for validation

### Before You Start

**Prerequisites:**
- ✅ Read [HYBRID_GAME_INTEGRATION_PLAN.md](./HYBRID_GAME_INTEGRATION_PLAN.md)
- ✅ Read [HYBRID_CORE_SYSTEMS_SPEC.md](./HYBRID_CORE_SYSTEMS_SPEC.md)
- ✅ Read [HYBRID_NPC_COMBAT_SPEC.md](./HYBRID_NPC_COMBAT_SPEC.md)
- ✅ Understand current codebase architecture
- ✅ Set up development environment with tests running

**Recommended Workflow:**
1. Implement tasks in order
2. Run verification checkpoint after each section
3. Don't skip checkpoints - they catch issues early
4. Commit after each successful checkpoint
5. Move to next section only after verification passes

---

## Milestone 1: Foundation (Phases 1-2)

**Duration:** 18-22 hours
**Goal:** Mode switching works, shared resources/inventory functional, NPCs have combat stats

---

## Phase 1: Core Systems (8-10 hours)

[Phase 1 implementation remains the same as previous version - see lines 1-752 of original document]

---

## Phase 2: NPC Combat System (10-12 hours)

**Goal:** Transform NPCs from workers into combat-capable units

**Dependencies:** Phase 1 complete

### Phase 2.1: Extend NPC Data Model (2 hours)

#### Task 2.1.1: Add Combat Stats to NPC Schema

**Location:** `src/modules/npc-system/NPCManager.js`

**Dependencies:** Phase 1 complete

**Steps:**
1. Open `src/modules/npc-system/NPCManager.js`
2. Find the `spawnNPC()` method where NPCs are initialized
3. Add combat stats to the NPC initialization object
4. Add default combat values for new NPCs

**Code Changes:**
```javascript
// In NPCManager.js, update the NPC initialization in spawnNPC()

spawnNPC(role, position) {
  const npcId = `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const npc = {
    id: npcId,
    name: this._generateName(),
    role,
    position: position || { x: 500, y: 500 },
    alive: true,
    happiness: 100,
    health: 100,
    // ... existing properties ...

    // NEW: Combat statistics
    combatStats: {
      health: {
        current: 100,
        max: 100
      },
      damage: 10,
      defense: 0,
      speed: 3,
      critChance: 5,
      critDamage: 150,
      dodgeChance: 5
    },

    // NEW: Combat progression
    combatLevel: 1,
    combatXP: 0,
    combatXPToNext: 100,

    // NEW: Equipment slots
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    },

    // NEW: Skills
    skillPoints: 0,
    skills: {
      combat: {
        powerStrike: 0,
        criticalHit: 0,
        deadlyBlow: 0
      },
      magic: {
        manaPool: 0,
        spellPower: 0,
        fastCasting: 0
      },
      defense: {
        ironSkin: 0,
        vitality: 0,
        evasion: 0
      },
      utility: {
        swiftness: 0,
        fortune: 0,
        regeneration: 0
      }
    },

    // NEW: Combat tracking
    expeditionCount: 0,
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
    isVeteran: false
  };

  this.npcs.set(npcId, npc);
  return { success: true, npcId, npc };
}
```

**Verification Checkpoint 2.1.1:**
```javascript
// In src/modules/npc-system/__tests__/NPCManager.test.js, add:

describe('NPC Combat Stats', () => {
  test('new NPC has combat stats initialized', () => {
    const result = npcManager.spawnNPC('worker', { x: 100, y: 100 });
    const npc = npcManager.getNPC(result.npcId);

    expect(npc.combatStats).toBeDefined();
    expect(npc.combatStats.health.current).toBe(100);
    expect(npc.combatStats.damage).toBe(10);
    expect(npc.combatLevel).toBe(1);
    expect(npc.combatXP).toBe(0);
  });

  test('new NPC has empty equipment slots', () => {
    const result = npcManager.spawnNPC('worker', { x: 100, y: 100 });
    const npc = npcManager.getNPC(result.npcId);

    expect(npc.equipment.weapon).toBeNull();
    expect(npc.equipment.armor).toBeNull();
    expect(npc.equipment.accessory).toBeNull();
  });

  test('new NPC has skill tree initialized', () => {
    const result = npcManager.spawnNPC('worker', { x: 100, y: 100 });
    const npc = npcManager.getNPC(result.npcId);

    expect(npc.skills.combat.powerStrike).toBe(0);
    expect(npc.skillPoints).toBe(0);
  });
});
```

**Run verification:**
```bash
npm test -- NPCManager.test.js
```

**Expected:** All tests pass, existing NPC tests still pass ✅

---

#### Task 2.1.2: Add Combat Level Progression Methods

**Location:** `src/modules/npc-system/NPCManager.js`

**Dependencies:** Task 2.1.1 complete

**Steps:**
1. Add helper method to calculate XP required for next level
2. Add method to award combat XP
3. Add method to level up combat stats
4. Emit events for level ups

**Code to Add:**
```javascript
// Add to NPCManager class

/**
 * Calculate XP required for next combat level
 * @param {number} currentLevel - Current combat level
 * @returns {number} XP required
 */
calculateCombatXPToNext(currentLevel) {
  return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
}

/**
 * Award combat XP to NPC
 * @param {string} npcId - NPC ID
 * @param {number} xp - XP to award
 */
awardCombatXP(npcId, xp) {
  const npc = this.getNPC(npcId);
  if (!npc || !npc.alive) return;

  npc.combatXP += xp;

  // Check for level up
  while (npc.combatXP >= npc.combatXPToNext) {
    npc.combatXP -= npc.combatXPToNext;
    this._levelUpCombat(npc);
  }
}

/**
 * Level up NPC combat stats
 * @private
 */
_levelUpCombat(npc) {
  npc.combatLevel++;
  npc.combatXPToNext = this.calculateCombatXPToNext(npc.combatLevel);

  // Grant skill points
  npc.skillPoints += 2;

  // Increase base stats
  npc.combatStats.health.max += 20;
  npc.combatStats.health.current = npc.combatStats.health.max;
  npc.combatStats.damage += 5;
  npc.combatStats.speed += 0.1;

  // Emit level up event
  this.emit('npc:combatLevelUp', {
    npcId: npc.id,
    newLevel: npc.combatLevel,
    skillPoints: npc.skillPoints
  });

  console.log(`${npc.name} reached combat level ${npc.combatLevel}!`);
}

/**
 * Check if NPC should become veteran (10+ expeditions)
 * @param {string} npcId - NPC ID
 */
checkVeteranStatus(npcId) {
  const npc = this.getNPC(npcId);
  if (!npc) return;

  if (!npc.isVeteran && npc.expeditionCount >= 10) {
    npc.isVeteran = true;
    this.emit('npc:becameVeteran', { npcId: npc.id });
    console.log(`${npc.name} is now a veteran!`);
  }
}
```

**Verification Checkpoint 2.1.2:**
```javascript
// Add to NPCManager.test.js

describe('Combat XP and Leveling', () => {
  let npc;

  beforeEach(() => {
    const result = npcManager.spawnNPC('worker', { x: 100, y: 100 });
    npc = npcManager.getNPC(result.npcId);
  });

  test('awards combat XP', () => {
    npcManager.awardCombatXP(npc.id, 50);
    expect(npc.combatXP).toBe(50);
    expect(npc.combatLevel).toBe(1); // Not enough to level up
  });

  test('levels up when XP threshold reached', () => {
    npcManager.awardCombatXP(npc.id, 100); // Exactly enough for level 2

    expect(npc.combatLevel).toBe(2);
    expect(npc.combatXP).toBe(0);
    expect(npc.skillPoints).toBe(2);
    expect(npc.combatStats.health.max).toBe(120); // 100 + 20
    expect(npc.combatStats.damage).toBe(15); // 10 + 5
  });

  test('handles multiple level ups from single XP award', () => {
    npcManager.awardCombatXP(npc.id, 500); // Enough for multiple levels

    expect(npc.combatLevel).toBeGreaterThan(1);
    expect(npc.skillPoints).toBeGreaterThan(0);
  });

  test('marks NPC as veteran after 10 expeditions', () => {
    npc.expeditionCount = 9;
    expect(npc.isVeteran).toBe(false);

    npc.expeditionCount = 10;
    npcManager.checkVeteranStatus(npc.id);
    expect(npc.isVeteran).toBe(true);
  });
});
```

**Run verification:**
```bash
npm test -- NPCManager.test.js
```

**Expected:** All tests pass ✅

---

### Phase 2.2: NPC Skill System (3 hours)

#### Task 2.2.1: Create NPCSkillSystem Class

**Location:** `src/modules/combat/NPCSkillSystem.js`

**Dependencies:** Task 2.1.2 complete

**Steps:**
1. Create directory `src/modules/combat/` if it doesn't exist
2. Create `NPCSkillSystem.js`
3. Define skill definitions from spec
4. Implement skill upgrade logic

**Code Template:**
```javascript
/**
 * NPCSkillSystem.js - NPC combat skill management
 */

const SKILL_DEFINITIONS = {
  combat: {
    powerStrike: {
      name: 'Power Strike',
      maxLevel: 5,
      cost: 1,
      bonus: 5,
      type: 'percentage',
      description: 'Increases damage by 5% per level',
      apply: (npc, level) => {
        return { damageMultiplier: 1 + (level * 0.05) };
      }
    },
    criticalHit: {
      name: 'Critical Hit',
      maxLevel: 5,
      cost: 1,
      bonus: 3,
      type: 'flat',
      description: 'Increases critical hit chance by 3% per level',
      apply: (npc, level) => {
        npc.combatStats.critChance += level * 3;
      }
    },
    deadlyBlow: {
      name: 'Deadly Blow',
      maxLevel: 3,
      cost: 2,
      bonus: 10,
      type: 'flat',
      description: 'Increases critical damage by 10% per level',
      apply: (npc, level) => {
        npc.combatStats.critDamage += level * 10;
      }
    }
  },

  magic: {
    manaPool: {
      name: 'Mana Pool',
      maxLevel: 5,
      cost: 1,
      bonus: 20,
      type: 'flat',
      description: 'Increases maximum mana by 20 per level',
      apply: (npc, level) => {
        if (!npc.combatStats.mana) {
          npc.combatStats.mana = { current: 100, max: 100 };
        }
        npc.combatStats.mana.max += level * 20;
        npc.combatStats.mana.current = npc.combatStats.mana.max;
      }
    },
    spellPower: {
      name: 'Spell Power',
      maxLevel: 5,
      cost: 1,
      bonus: 10,
      type: 'percentage',
      description: 'Increases spell damage by 10% per level',
      apply: (npc, level) => {
        return { spellDamageMultiplier: 1 + (level * 0.10) };
      }
    },
    fastCasting: {
      name: 'Fast Casting',
      maxLevel: 3,
      cost: 2,
      bonus: 15,
      type: 'percentage',
      description: 'Reduces spell cooldowns by 15% per level',
      apply: (npc, level) => {
        return { cooldownReduction: level * 0.15 };
      }
    }
  },

  defense: {
    ironSkin: {
      name: 'Iron Skin',
      maxLevel: 5,
      cost: 1,
      bonus: 2,
      type: 'flat',
      description: 'Increases defense by 2 per level',
      apply: (npc, level) => {
        npc.combatStats.defense += level * 2;
      }
    },
    vitality: {
      name: 'Vitality',
      maxLevel: 5,
      cost: 1,
      bonus: 25,
      type: 'flat',
      description: 'Increases maximum health by 25 per level',
      apply: (npc, level) => {
        npc.combatStats.health.max += level * 25;
      }
    },
    evasion: {
      name: 'Evasion',
      maxLevel: 5,
      cost: 1,
      bonus: 2,
      type: 'flat',
      description: 'Increases dodge chance by 2% per level',
      apply: (npc, level) => {
        npc.combatStats.dodgeChance += level * 2;
      }
    }
  },

  utility: {
    swiftness: {
      name: 'Swiftness',
      maxLevel: 3,
      cost: 2,
      bonus: 0.2,
      type: 'flat',
      description: 'Increases movement speed by 0.2 per level',
      apply: (npc, level) => {
        npc.combatStats.speed += level * 0.2;
      }
    },
    fortune: {
      name: 'Fortune',
      maxLevel: 5,
      cost: 1,
      bonus: 15,
      type: 'percentage',
      description: 'Increases gold/loot drops by 15% per level',
      apply: (npc, level) => {
        return { lootMultiplier: 1 + (level * 0.15) };
      }
    },
    regeneration: {
      name: 'Regeneration',
      maxLevel: 3,
      cost: 2,
      bonus: 0.5,
      type: 'flat',
      description: 'Regenerate 0.5 HP per second per level',
      apply: (npc, level) => {
        return { healthRegen: level * 0.5 };
      }
    }
  }
};

class NPCSkillSystem {
  constructor() {
    this.skillDefinitions = SKILL_DEFINITIONS;
  }

  /**
   * Upgrade a skill
   * @param {Object} npc - NPC object
   * @param {string} category - Skill category
   * @param {string} skillName - Skill name
   * @returns {Object} Result { success, error, newLevel }
   */
  upgradeSkill(npc, category, skillName) {
    const skill = this.skillDefinitions[category]?.[skillName];
    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    const currentLevel = npc.skills[category][skillName];
    if (currentLevel >= skill.maxLevel) {
      return { success: false, error: 'Skill already max level' };
    }

    if (npc.skillPoints < skill.cost) {
      return { success: false, error: 'Not enough skill points' };
    }

    // Upgrade skill
    npc.skills[category][skillName]++;
    npc.skillPoints -= skill.cost;

    // Apply skill effect
    if (skill.type === 'flat') {
      skill.apply(npc, 1); // Apply one level's worth
    }

    return {
      success: true,
      newLevel: npc.skills[category][skillName]
    };
  }

  /**
   * Get total skill bonuses for NPC
   * @param {Object} npc - NPC object
   * @returns {Object} Bonuses
   */
  getSkillBonuses(npc) {
    const bonuses = {
      damageMultiplier: 1,
      spellDamageMultiplier: 1,
      cooldownReduction: 0,
      lootMultiplier: 1,
      healthRegen: 0
    };

    for (const [category, skills] of Object.entries(npc.skills)) {
      for (const [skillName, level] of Object.entries(skills)) {
        if (level === 0) continue;

        const skillDef = this.skillDefinitions[category][skillName];
        if (skillDef.type === 'percentage') {
          const result = skillDef.apply(npc, level);
          Object.assign(bonuses, result);
        }
      }
    }

    return bonuses;
  }

  /**
   * Reset all skills (refund all points)
   * @param {Object} npc - NPC object
   */
  resetSkills(npc) {
    let refundedPoints = 0;

    for (const [category, skills] of Object.entries(npc.skills)) {
      for (const [skillName, level] of Object.entries(skills)) {
        const skillDef = this.skillDefinitions[category][skillName];
        refundedPoints += level * skillDef.cost;
        npc.skills[category][skillName] = 0;
      }
    }

    npc.skillPoints += refundedPoints;

    // Reset stats to base values
    this._resetStatsToBase(npc);
  }

  /**
   * Reset NPC stats to base values (based on level)
   * @private
   */
  _resetStatsToBase(npc) {
    npc.combatStats.health.max = 100 + (npc.combatLevel - 1) * 20;
    npc.combatStats.damage = 10 + (npc.combatLevel - 1) * 5;
    npc.combatStats.defense = 0;
    npc.combatStats.speed = 3 + (npc.combatLevel - 1) * 0.1;
    npc.combatStats.critChance = 5;
    npc.combatStats.critDamage = 150;
    npc.combatStats.dodgeChance = 5;
  }

  /**
   * Get skill definition
   * @param {string} category - Skill category
   * @param {string} skillName - Skill name
   * @returns {Object} Skill definition
   */
  getSkillDefinition(category, skillName) {
    return this.skillDefinitions[category]?.[skillName];
  }
}

export default NPCSkillSystem;
```

**Verification Checkpoint 2.2.1:**
```javascript
// src/modules/combat/__tests__/NPCSkillSystem.test.js
import NPCSkillSystem from '../NPCSkillSystem';

describe('NPCSkillSystem', () => {
  let skillSystem, npc;

  beforeEach(() => {
    skillSystem = new NPCSkillSystem();
    npc = {
      skillPoints: 5,
      skills: {
        combat: { powerStrike: 0, criticalHit: 0, deadlyBlow: 0 },
        magic: { manaPool: 0, spellPower: 0, fastCasting: 0 },
        defense: { ironSkin: 0, vitality: 0, evasion: 0 },
        utility: { swiftness: 0, fortune: 0, regeneration: 0 }
      },
      combatStats: {
        health: { current: 100, max: 100 },
        damage: 10,
        defense: 0,
        speed: 3,
        critChance: 5,
        critDamage: 150,
        dodgeChance: 5
      },
      combatLevel: 1
    };
  });

  test('upgrades skill successfully', () => {
    const result = skillSystem.upgradeSkill(npc, 'combat', 'powerStrike');

    expect(result.success).toBe(true);
    expect(result.newLevel).toBe(1);
    expect(npc.skills.combat.powerStrike).toBe(1);
    expect(npc.skillPoints).toBe(4);
  });

  test('prevents upgrade without enough skill points', () => {
    npc.skillPoints = 0;
    const result = skillSystem.upgradeSkill(npc, 'combat', 'powerStrike');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not enough skill points');
  });

  test('prevents upgrade beyond max level', () => {
    npc.skills.combat.powerStrike = 5; // Max level
    const result = skillSystem.upgradeSkill(npc, 'combat', 'powerStrike');

    expect(result.success).toBe(false);
    expect(result.error).toContain('max level');
  });

  test('applies flat stat bonuses immediately', () => {
    skillSystem.upgradeSkill(npc, 'defense', 'ironSkin');
    expect(npc.combatStats.defense).toBe(2); // 0 + 2

    skillSystem.upgradeSkill(npc, 'defense', 'ironSkin');
    expect(npc.combatStats.defense).toBe(4); // 2 + 2
  });

  test('calculates percentage bonuses correctly', () => {
    npc.skills.combat.powerStrike = 3;
    const bonuses = skillSystem.getSkillBonuses(npc);

    expect(bonuses.damageMultiplier).toBe(1.15); // 1 + (3 * 0.05)
  });

  test('resets skills and refunds points', () => {
    skillSystem.upgradeSkill(npc, 'combat', 'powerStrike'); // Cost 1
    skillSystem.upgradeSkill(npc, 'defense', 'ironSkin'); // Cost 1

    expect(npc.skillPoints).toBe(3); // 5 - 2

    skillSystem.resetSkills(npc);

    expect(npc.skillPoints).toBe(5); // Refunded
    expect(npc.skills.combat.powerStrike).toBe(0);
    expect(npc.skills.defense.ironSkin).toBe(0);
  });
});
```

**Run verification:**
```bash
npm test -- NPCSkillSystem.test.js
```

**Expected:** All tests pass ✅

---

#### Task 2.2.2: Integrate Skill System with NPCManager

**Location:** `src/modules/npc-system/NPCManager.js`

**Dependencies:** Task 2.2.1 complete

**Steps:**
1. Import NPCSkillSystem
2. Create instance in constructor
3. Add methods to upgrade NPC skills

**Code Changes:**
```javascript
// At top of NPCManager.js
import NPCSkillSystem from '../combat/NPCSkillSystem.js';

// In constructor
this.skillSystem = new NPCSkillSystem();

// Add methods
/**
 * Upgrade NPC skill
 * @param {string} npcId - NPC ID
 * @param {string} category - Skill category
 * @param {string} skillName - Skill name
 * @returns {Object} Result
 */
upgradeNPCSkill(npcId, category, skillName) {
  const npc = this.getNPC(npcId);
  if (!npc) {
    return { success: false, error: 'NPC not found' };
  }

  return this.skillSystem.upgradeSkill(npc, category, skillName);
}

/**
 * Get NPC skill bonuses
 * @param {string} npcId - NPC ID
 * @returns {Object} Bonuses
 */
getNPCSkillBonuses(npcId) {
  const npc = this.getNPC(npcId);
  if (!npc) return null;

  return this.skillSystem.getSkillBonuses(npc);
}

/**
 * Reset NPC skills
 * @param {string} npcId - NPC ID
 */
resetNPCSkills(npcId) {
  const npc = this.getNPC(npcId);
  if (!npc) return;

  this.skillSystem.resetSkills(npc);
}
```

**Verification Checkpoint 2.2.2:**
```javascript
// Add to NPCManager.test.js

describe('NPC Skill Integration', () => {
  let npc;

  beforeEach(() => {
    const result = npcManager.spawnNPC('worker', { x: 100, y: 100 });
    npc = npcManager.getNPC(result.npcId);
    npc.skillPoints = 5;
  });

  test('upgrades NPC skill through manager', () => {
    const result = npcManager.upgradeNPCSkill(npc.id, 'combat', 'powerStrike');

    expect(result.success).toBe(true);
    expect(npc.skills.combat.powerStrike).toBe(1);
  });

  test('gets NPC skill bonuses', () => {
    npc.skills.combat.powerStrike = 2;
    const bonuses = npcManager.getNPCSkillBonuses(npc.id);

    expect(bonuses.damageMultiplier).toBe(1.10);
  });
});
```

**Run verification:**
```bash
npm test -- NPCManager.test.js
```

**Expected:** All tests pass ✅

---

### Phase 2.3: NPC Equipment System (2-3 hours)

#### Task 2.3.1: Create NPCEquipmentManager Class

**Location:** `src/modules/combat/NPCEquipmentManager.js`

**Dependencies:** Phase 1.4 complete (SharedInventoryManager exists)

**Steps:**
1. Create `NPCEquipmentManager.js` in `src/modules/combat/`
2. Implement equip/unequip methods
3. Handle stat application
4. Track durability

**Code Template:**
```javascript
/**
 * NPCEquipmentManager.js - NPC equipment management
 */
class NPCEquipmentManager {
  constructor(sharedInventory) {
    this.sharedInventory = sharedInventory;
  }

  /**
   * Equip item to NPC
   * @param {Object} npc - NPC object
   * @param {Object} item - Equipment item
   * @param {string} slot - 'weapon' | 'armor' | 'accessory'
   * @returns {Object} Result { success, error, unequipped }
   */
  equipItem(npc, item, slot) {
    // Validate slot
    if (!['weapon', 'armor', 'accessory'].includes(slot)) {
      return { success: false, error: 'Invalid slot' };
    }

    // Validate item type matches slot
    if (item.type !== slot) {
      return {
        success: false,
        error: `Item type ${item.type} doesn't match slot ${slot}`
      };
    }

    // Check tier restriction
    if (item.tier && item.tier > npc.combatLevel) {
      return {
        success: false,
        error: `Requires combat level ${item.tier}`
      };
    }

    // Unequip current item (if any)
    const currentItem = npc.equipment[slot];
    if (currentItem) {
      this._unapplyStats(npc, currentItem);
      this.sharedInventory.addEquipment(currentItem);
    }

    // Equip new item
    npc.equipment[slot] = item;
    this._applyStats(npc, item);

    // Remove from shared inventory
    this.sharedInventory.removeItem('equipment', item.id);

    return {
      success: true,
      unequipped: currentItem || null
    };
  }

  /**
   * Unequip item from NPC
   * @param {Object} npc - NPC object
   * @param {string} slot - Equipment slot
   * @returns {Object} Result { success, item }
   */
  unequipItem(npc, slot) {
    const item = npc.equipment[slot];
    if (!item) {
      return { success: false, error: 'No item in slot' };
    }

    // Remove stats
    this._unapplyStats(npc, item);

    // Clear slot
    npc.equipment[slot] = null;

    // Return to shared inventory
    this.sharedInventory.addEquipment(item);

    return { success: true, item };
  }

  /**
   * Get total equipment bonuses
   * @param {Object} npc - NPC object
   * @returns {Object} Bonuses
   */
  getEquipmentBonuses(npc) {
    const bonuses = {
      damage: 0,
      defense: 0,
      critChance: 0,
      critDamage: 0,
      dodgeChance: 0,
      healthBonus: 0,
      speedBonus: 0
    };

    for (const slot of ['weapon', 'armor', 'accessory']) {
      const item = npc.equipment[slot];
      if (!item) continue;

      bonuses.damage += item.damage || 0;
      bonuses.defense += item.defense || 0;
      bonuses.critChance += item.critChance || 0;
      bonuses.critDamage += item.critDamage || 0;
      bonuses.dodgeChance += item.dodgeChance || 0;
      bonuses.healthBonus += item.healthBonus || 0;
      bonuses.speedBonus += item.speedBonus || 0;
    }

    return bonuses;
  }

  /**
   * Damage equipment durability
   * @param {Object} npc - NPC object
   * @param {number} amount - Durability loss
   */
  damageEquipment(npc, amount = 1) {
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const item = npc.equipment[slot];
      if (!item || !item.durability) continue;

      item.durability.current -= amount;

      // Item broken
      if (item.durability.current <= 0) {
        this.unequipItem(npc, slot);
        console.log(`${npc.name}'s ${item.name} broke!`);
      }
    }
  }

  /**
   * Apply equipment stats to NPC
   * @private
   */
  _applyStats(npc, item) {
    npc.combatStats.damage += item.damage || 0;
    npc.combatStats.defense += item.defense || 0;
    npc.combatStats.critChance += item.critChance || 0;
    npc.combatStats.critDamage += item.critDamage || 0;
    npc.combatStats.dodgeChance += item.dodgeChance || 0;
    npc.combatStats.health.max += item.healthBonus || 0;
    npc.combatStats.speed += item.speedBonus || 0;
  }

  /**
   * Remove equipment stats from NPC
   * @private
   */
  _unapplyStats(npc, item) {
    npc.combatStats.damage -= item.damage || 0;
    npc.combatStats.defense -= item.defense || 0;
    npc.combatStats.critChance -= item.critChance || 0;
    npc.combatStats.critDamage -= item.critDamage || 0;
    npc.combatStats.dodgeChance -= item.dodgeChance || 0;
    npc.combatStats.health.max -= item.healthBonus || 0;
    npc.combatStats.speed -= item.speedBonus || 0;
  }
}

export default NPCEquipmentManager;
```

**Verification Checkpoint 2.3.1:**
```javascript
// src/modules/combat/__tests__/NPCEquipmentManager.test.js
import NPCEquipmentManager from '../NPCEquipmentManager';
import SharedInventoryManager from '../../../shared/SharedInventoryManager';
import UnifiedGameState from '../../../core/UnifiedGameState';

describe('NPCEquipmentManager', () => {
  let manager, inventory, npc;

  beforeEach(() => {
    const state = new UnifiedGameState();
    inventory = new SharedInventoryManager(state);
    manager = new NPCEquipmentManager(inventory);

    npc = {
      id: 'npc1',
      name: 'Test NPC',
      combatLevel: 5,
      equipment: { weapon: null, armor: null, accessory: null },
      combatStats: {
        damage: 10,
        defense: 0,
        critChance: 5,
        critDamage: 150,
        dodgeChance: 5,
        health: { current: 100, max: 100 },
        speed: 3
      }
    };
  });

  test('equips weapon successfully', () => {
    const weapon = {
      id: 'sword1',
      name: 'Iron Sword',
      type: 'weapon',
      tier: 1,
      damage: 15
    };

    inventory.addEquipment(weapon);
    const result = manager.equipItem(npc, weapon, 'weapon');

    expect(result.success).toBe(true);
    expect(npc.equipment.weapon).toBe(weapon);
    expect(npc.combatStats.damage).toBe(25); // 10 + 15
  });

  test('prevents equipping item above NPC level', () => {
    const weapon = {
      id: 'sword1',
      name: 'Legendary Sword',
      type: 'weapon',
      tier: 10,
      damage: 50
    };

    const result = manager.equipItem(npc, weapon, 'weapon');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Requires combat level 10');
  });

  test('unequips current item when equipping new one', () => {
    const weapon1 = {
      id: 'sword1',
      name: 'Iron Sword',
      type: 'weapon',
      tier: 1,
      damage: 15
    };

    const weapon2 = {
      id: 'sword2',
      name: 'Steel Sword',
      type: 'weapon',
      tier: 2,
      damage: 25
    };

    inventory.addEquipment(weapon1);
    inventory.addEquipment(weapon2);

    manager.equipItem(npc, weapon1, 'weapon');
    expect(npc.combatStats.damage).toBe(25); // 10 + 15

    const result = manager.equipItem(npc, weapon2, 'weapon');

    expect(result.success).toBe(true);
    expect(result.unequipped).toBe(weapon1);
    expect(npc.combatStats.damage).toBe(35); // 10 + 25
  });

  test('calculates total equipment bonuses', () => {
    const weapon = {
      id: 'w1',
      type: 'weapon',
      damage: 15,
      critChance: 5
    };
    const armor = {
      id: 'a1',
      type: 'armor',
      defense: 10,
      healthBonus: 20
    };

    npc.equipment.weapon = weapon;
    npc.equipment.armor = armor;

    const bonuses = manager.getEquipmentBonuses(npc);

    expect(bonuses.damage).toBe(15);
    expect(bonuses.defense).toBe(10);
    expect(bonuses.critChance).toBe(5);
    expect(bonuses.healthBonus).toBe(20);
  });

  test('damages equipment durability', () => {
    const weapon = {
      id: 'sword1',
      name: 'Iron Sword',
      type: 'weapon',
      damage: 15,
      durability: { current: 10, max: 10 }
    };

    npc.equipment.weapon = weapon;

    manager.damageEquipment(npc, 5);
    expect(weapon.durability.current).toBe(5);

    manager.damageEquipment(npc, 10);
    expect(npc.equipment.weapon).toBeNull(); // Broke and unequipped
  });
});
```

**Run verification:**
```bash
npm test -- NPCEquipmentManager.test.js
```

**Expected:** All tests pass ✅

---

### Phase 2.4: NPC Party System (3 hours)

#### Task 2.4.1: Create NPCPartyManager Class

**Location:** `src/modules/expedition/NPCPartyManager.js`

**Dependencies:** Task 2.3.1 complete

**Steps:**
1. Create directory `src/modules/expedition/` if it doesn't exist
2. Create `NPCPartyManager.js`
3. Implement party management logic
4. Add validation

**Code Template:**
```javascript
/**
 * NPCPartyManager.js - NPC party composition and management
 */
class NPCPartyManager {
  constructor(npcManager) {
    this.npcManager = npcManager;
    this.maxPartySize = 4;
    this.currentParty = null;
  }

  /**
   * Create a new party
   * @returns {Object} Party object
   */
  createParty() {
    this.currentParty = {
      id: `party_${Date.now()}`,
      members: [],
      leader: null,
      formation: 'balanced',
      createdAt: Date.now()
    };

    return this.currentParty;
  }

  /**
   * Add NPC to party
   * @param {string} npcId - NPC ID
   * @param {string} role - Party role
   * @returns {Object} Result { success, error }
   */
  addToParty(npcId, role) {
    if (!this.currentParty) {
      return { success: false, error: 'No active party' };
    }

    if (this.currentParty.members.length >= this.maxPartySize) {
      return { success: false, error: 'Party is full' };
    }

    const npc = this.npcManager.getNPC(npcId);
    if (!npc) {
      return { success: false, error: 'NPC not found' };
    }

    if (!npc.alive) {
      return { success: false, error: 'NPC is dead' };
    }

    // Check if already in party
    if (this.currentParty.members.some(m => m.npcId === npcId)) {
      return { success: false, error: 'NPC already in party' };
    }

    // Add to party
    this.currentParty.members.push({
      npcId,
      role,
      position: this.currentParty.members.length
    });

    // Set leader if first member
    if (this.currentParty.members.length === 1) {
      this.currentParty.leader = npcId;
    }

    return { success: true };
  }

  /**
   * Remove NPC from party
   * @param {string} npcId - NPC ID
   * @returns {Object} Result { success }
   */
  removeFromParty(npcId) {
    if (!this.currentParty) {
      return { success: false, error: 'No active party' };
    }

    const index = this.currentParty.members.findIndex(m => m.npcId === npcId);
    if (index === -1) {
      return { success: false, error: 'NPC not in party' };
    }

    this.currentParty.members.splice(index, 1);

    // Update positions
    this.currentParty.members.forEach((member, idx) => {
      member.position = idx;
    });

    // Update leader if needed
    if (this.currentParty.leader === npcId && this.currentParty.members.length > 0) {
      this.currentParty.leader = this.currentParty.members[0].npcId;
    }

    return { success: true };
  }

  /**
   * Get party statistics
   * @returns {Object} Stats
   */
  getPartyStats() {
    if (!this.currentParty || this.currentParty.members.length === 0) {
      return null;
    }

    const stats = {
      totalHealth: 0,
      totalDamage: 0,
      averageDefense: 0,
      averageSpeed: 0,
      critChance: 0,
      dodgeChance: 0,
      memberCount: this.currentParty.members.length
    };

    for (const member of this.currentParty.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (!npc) continue;

      stats.totalHealth += npc.combatStats.health.max;
      stats.totalDamage += npc.combatStats.damage;
      stats.averageDefense += npc.combatStats.defense;
      stats.averageSpeed += npc.combatStats.speed;
      stats.critChance += npc.combatStats.critChance;
      stats.dodgeChance += npc.combatStats.dodgeChance;
    }

    stats.averageDefense /= stats.memberCount;
    stats.averageSpeed /= stats.memberCount;
    stats.critChance /= stats.memberCount;
    stats.dodgeChance /= stats.memberCount;

    return stats;
  }

  /**
   * Validate party is ready for expedition
   * @returns {Object} { valid, errors }
   */
  validateParty() {
    const errors = [];

    if (!this.currentParty) {
      errors.push('No party created');
      return { valid: false, errors };
    }

    if (this.currentParty.members.length === 0) {
      errors.push('Party is empty');
    }

    if (this.currentParty.members.length > this.maxPartySize) {
      errors.push(`Party size exceeds maximum (${this.maxPartySize})`);
    }

    // Check all NPCs are alive and available
    for (const member of this.currentParty.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (!npc) {
        errors.push(`NPC ${member.npcId} not found`);
        continue;
      }

      if (!npc.alive) {
        errors.push(`${npc.name} is dead`);
      }

      if (npc.combatStats.health.current <= 0) {
        errors.push(`${npc.name} has no health`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get current party
   * @returns {Object} Party or null
   */
  getParty() {
    return this.currentParty;
  }

  /**
   * Clear current party
   */
  clearParty() {
    this.currentParty = null;
  }
}

export default NPCPartyManager;
```

**Verification Checkpoint 2.4.1:**
```javascript
// src/modules/expedition/__tests__/NPCPartyManager.test.js
import NPCPartyManager from '../NPCPartyManager';

describe('NPCPartyManager', () => {
  let partyManager, npcManager, npc1, npc2;

  beforeEach(() => {
    // Mock NPCManager
    npcManager = {
      npcs: new Map(),
      getNPC: jest.fn((id) => npcManager.npcs.get(id))
    };

    // Create test NPCs
    npc1 = {
      id: 'npc1',
      name: 'Fighter',
      alive: true,
      combatStats: {
        health: { current: 100, max: 100 },
        damage: 20,
        defense: 5,
        speed: 3,
        critChance: 10,
        dodgeChance: 5
      }
    };

    npc2 = {
      id: 'npc2',
      name: 'Mage',
      alive: true,
      combatStats: {
        health: { current: 80, max: 80 },
        damage: 30,
        defense: 2,
        speed: 4,
        critChance: 5,
        dodgeChance: 8
      }
    };

    npcManager.npcs.set('npc1', npc1);
    npcManager.npcs.set('npc2', npc2);

    partyManager = new NPCPartyManager(npcManager);
  });

  test('creates a new party', () => {
    const party = partyManager.createParty();

    expect(party).toBeDefined();
    expect(party.members).toHaveLength(0);
    expect(party.leader).toBeNull();
  });

  test('adds NPC to party', () => {
    partyManager.createParty();
    const result = partyManager.addToParty('npc1', 'tank');

    expect(result.success).toBe(true);
    expect(partyManager.currentParty.members).toHaveLength(1);
    expect(partyManager.currentParty.leader).toBe('npc1');
  });

  test('prevents adding more than max party size', () => {
    partyManager.createParty();
    partyManager.maxPartySize = 2;

    partyManager.addToParty('npc1', 'tank');
    partyManager.addToParty('npc2', 'damage');

    const result = partyManager.addToParty('npc3', 'support');

    expect(result.success).toBe(false);
    expect(result.error).toContain('full');
  });

  test('prevents adding same NPC twice', () => {
    partyManager.createParty();
    partyManager.addToParty('npc1', 'tank');

    const result = partyManager.addToParty('npc1', 'damage');

    expect(result.success).toBe(false);
    expect(result.error).toContain('already in party');
  });

  test('removes NPC from party', () => {
    partyManager.createParty();
    partyManager.addToParty('npc1', 'tank');
    partyManager.addToParty('npc2', 'damage');

    const result = partyManager.removeFromParty('npc1');

    expect(result.success).toBe(true);
    expect(partyManager.currentParty.members).toHaveLength(1);
    expect(partyManager.currentParty.leader).toBe('npc2'); // Leader changed
  });

  test('calculates party stats correctly', () => {
    partyManager.createParty();
    partyManager.addToParty('npc1', 'tank');
    partyManager.addToParty('npc2', 'damage');

    const stats = partyManager.getPartyStats();

    expect(stats.totalHealth).toBe(180); // 100 + 80
    expect(stats.totalDamage).toBe(50); // 20 + 30
    expect(stats.averageDefense).toBe(3.5); // (5 + 2) / 2
    expect(stats.memberCount).toBe(2);
  });

  test('validates party successfully', () => {
    partyManager.createParty();
    partyManager.addToParty('npc1', 'tank');

    const validation = partyManager.validateParty();

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('validates party with dead NPC fails', () => {
    partyManager.createParty();
    partyManager.addToParty('npc1', 'tank');
    npc1.alive = false;

    const validation = partyManager.validateParty();

    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('dead'))).toBe(true);
  });
});
```

**Run verification:**
```bash
npm test -- NPCPartyManager.test.js
```

**Expected:** All tests pass ✅

---

### Phase 2.5: Settlement Production Bonuses (1-2 hours)

#### Task 2.5.1: Add Combat Bonuses to ProductionTick

**Location:** `src/modules/resource-economy/ProductionTick.js`

**Dependencies:** Phase 2 tasks 1-4 complete

**Steps:**
1. Open `ProductionTick.js`
2. Add helper function to calculate combat production bonus
3. Apply combat bonus to production calculations

**Code Changes:**
```javascript
// Add at top of ProductionTick.js (outside class)

/**
 * Calculate production multiplier from NPC combat stats
 * @param {Object} npc - NPC object
 * @returns {number} Multiplier (1.0 = no bonus)
 */
function getCombatProductionBonus(npc) {
  let multiplier = 1.0;

  // Combat level bonus (1% per level)
  if (npc.combatLevel) {
    multiplier += (npc.combatLevel - 1) * 0.01;
  }

  // Equipment bonus (0.5% per tier of best equipment)
  const bestTier = Math.max(
    npc.equipment?.weapon?.tier || 0,
    npc.equipment?.armor?.tier || 0,
    npc.equipment?.accessory?.tier || 0
  );
  multiplier += bestTier * 0.005;

  // Veteran bonus (5% after 10 expeditions)
  if (npc.isVeteran) {
    multiplier += 0.05;
  }

  return multiplier;
}

// In executeTick method, modify NPC production loop:

executeTick(buildings, npcAssignments, npcManager, moraleMultiplier, gameState) {
  const production = {};

  for (const building of buildings) {
    const config = this.buildingConfig.getConfig(building.type);
    if (!config.production) continue;

    const assignedNPCs = npcAssignments[building.id] || [];

    for (const npcId of assignedNPCs) {
      const npc = npcManager.getNPC(npcId);
      if (!npc || !npc.alive) continue;

      for (const [resource, baseAmount] of Object.entries(config.production)) {
        // Apply morale multiplier
        let productionAmount = baseAmount * moraleMultiplier;

        // NEW: Apply combat bonus
        const combatBonus = getCombatProductionBonus(npc);
        productionAmount *= combatBonus;

        // Add to total production
        production[resource] = (production[resource] || 0) + productionAmount;
      }
    }
  }

  return { production, tick: Date.now() };
}
```

**Verification Checkpoint 2.5.1:**
```javascript
// Add to ProductionTick.test.js

describe('Combat Production Bonuses', () => {
  let productionTick, npcManager, building, npc;

  beforeEach(() => {
    // Setup mocks
    productionTick = new ProductionTick(buildingConfig);

    building = {
      id: 'farm1',
      type: 'FARM',
      position: { x: 100, y: 100 }
    };

    npc = {
      id: 'npc1',
      alive: true,
      combatLevel: 1,
      equipment: {
        weapon: null,
        armor: null,
        accessory: null
      },
      isVeteran: false
    };

    npcManager = {
      getNPC: jest.fn(() => npc)
    };
  });

  test('applies combat level bonus to production', () => {
    npc.combatLevel = 5; // +4% bonus

    const result = productionTick.executeTick(
      [building],
      { farm1: ['npc1'] },
      npcManager,
      1.0,
      {}
    );

    // Base production = 5, with 4% bonus = 5.2
    expect(result.production.food).toBeCloseTo(5.2, 1);
  });

  test('applies equipment tier bonus to production', () => {
    npc.equipment.weapon = { tier: 3, damage: 20 };

    const result = productionTick.executeTick(
      [building],
      { farm1: ['npc1'] },
      npcManager,
      1.0,
      {}
    );

    // Base production = 5, with 1.5% bonus (3 * 0.5%) = 5.075
    expect(result.production.food).toBeCloseTo(5.075, 2);
  });

  test('applies veteran bonus to production', () => {
    npc.isVeteran = true;

    const result = productionTick.executeTick(
      [building],
      { farm1: ['npc1'] },
      npcManager,
      1.0,
      {}
    );

    // Base production = 5, with 5% veteran bonus = 5.25
    expect(result.production.food).toBeCloseTo(5.25, 2);
  });

  test('stacks all combat bonuses', () => {
    npc.combatLevel = 10; // +9%
    npc.equipment.weapon = { tier: 5, damage: 50 }; // +2.5%
    npc.isVeteran = true; // +5%

    const result = productionTick.executeTick(
      [building],
      { farm1: ['npc1'] },
      npcManager,
      1.0,
      {}
    );

    // Base production = 5, total bonus = 16.5%, result = 5.825
    expect(result.production.food).toBeCloseTo(5.825, 2);
  });
});
```

**Run verification:**
```bash
npm test -- ProductionTick.test.js
```

**Expected:** All tests pass ✅

---

### Phase 2 Complete - Final Verification

**Checkpoint: Phase 2 Complete**

**Run all tests:**
```bash
npm test
```

**Expected:**
- ✅ All existing tests still pass
- ✅ All Phase 2 tests pass (combat stats, skills, equipment, party, production bonuses)
- ✅ No console errors

**Manual verification:**
1. Start game: `npm start`
2. Open browser console
3. Test NPC combat stats:
   ```javascript
   // Spawn NPC
   const result = await gameEngine.orchestrator.spawnNPC('worker', {x: 100, y: 100})
   const npc = gameEngine.orchestrator.npcManager.getNPC(result.npcId)

   // Check combat stats
   console.log(npc.combatStats) // Should have health, damage, etc.
   console.log(npc.combatLevel) // Should be 1
   ```

4. Test combat leveling:
   ```javascript
   gameEngine.orchestrator.npcManager.awardCombatXP(npc.id, 100)
   console.log(npc.combatLevel) // Should be 2
   console.log(npc.skillPoints) // Should be 2
   ```

5. Test skill system:
   ```javascript
   gameEngine.orchestrator.npcManager.upgradeNPCSkill(npc.id, 'combat', 'powerStrike')
   console.log(npc.skills.combat.powerStrike) // Should be 1
   console.log(npc.skillPoints) // Should be 1
   ```

6. Test equipment:
   ```javascript
   const weapon = {name: 'Sword', type: 'weapon', tier: 1, damage: 15}
   gameEngine.orchestrator.sharedInventory.addEquipment(weapon)
   // Equipment system will be fully tested in UI phase
   ```

**If all verifications pass:** ✅ **Phase 2 is complete! Commit your work:**
```bash
git add src/modules/npc-system/ src/modules/combat/ src/modules/expedition/ src/modules/resource-economy/
git commit -m "feat: Implement Phase 2 - NPC Combat System

- Add combat stats to NPC data model
- Implement combat level progression and XP system
- Create NPCSkillSystem with 12 skills across 4 categories
- Create NPCEquipmentManager for weapons, armor, accessories
- Create NPCPartyManager for expedition party composition
- Add combat bonuses to settlement production (1% per level, 5% veteran)
- All systems fully tested (30+ new tests)
- Integrated with existing NPC and production systems"
```

---

**Milestone 1 Complete!** 🎉

You've now completed:
- ✅ Phase 1: Core Systems (UnifiedGameState, ModeManager, SharedResources, SharedInventory)
- ✅ Phase 2: NPC Combat System (Stats, Levels, Skills, Equipment, Parties, Production Bonuses)

**Next:** Continue to [Phase 3: Expedition System](#phase-3-expedition-system-12-15-hours) to build the actual combat/dungeon gameplay.

---

## Phase 3: Expedition System (12-15 hours)

**Goal:** Build action RPG gameplay where NPC parties explore dungeons

**Dependencies:** Phase 2 complete (NPC combat system, party system)

---

### Phase 3.1: Expedition Framework (3 hours)

#### Task 3.1.1: Create ExpeditionManager Class

**Location:** `src/modules/expedition/ExpeditionManager.js`

**Dependencies:** Phase 2.4 complete (NPCPartyManager exists)

**Steps:**
1. Create `ExpeditionManager.js` in `src/modules/expedition/`
2. Implement expedition state tracking
3. Add expedition lifecycle management
4. Integrate with NPCPartyManager

**Code Template:**
```javascript
/**
 * ExpeditionManager.js - Manages expedition lifecycle and state
 */
import EventEmitter from 'events';

class ExpeditionManager extends EventEmitter {
  constructor(partyManager, npcManager) {
    super();
    this.partyManager = partyManager;
    this.npcManager = npcManager;
    this.activeExpedition = null;
    this.expeditionHistory = [];
  }

  /**
   * Start a new expedition
   * @param {Object} config - Expedition configuration
   * @returns {Object} Result { success, error, expedition }
   */
  startExpedition(config) {
    // Validate party
    const validation = this.partyManager.validateParty();
    if (!validation.valid) {
      return {
        success: false,
        error: `Party validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Check no active expedition
    if (this.activeExpedition) {
      return {
        success: false,
        error: 'Expedition already in progress'
      };
    }

    // Create expedition
    this.activeExpedition = {
      id: `expedition_${Date.now()}`,
      party: this.partyManager.getParty(),
      config: {
        difficulty: config.difficulty || 1,
        dungeonType: config.dungeonType || 'cave',
        expectedDuration: config.expectedDuration || 300000, // 5 minutes
        ...config
      },
      state: {
        currentFloor: 1,
        maxFloor: config.maxFloor || 5,
        enemiesKilled: 0,
        goldEarned: 0,
        itemsFound: [],
        startTime: Date.now(),
        endTime: null
      },
      status: 'active'
    };

    // Mark NPCs as on expedition
    for (const member of this.activeExpedition.party.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (npc) {
        npc.onExpedition = true;
      }
    }

    this.emit('expedition:started', {
      expeditionId: this.activeExpedition.id,
      party: this.activeExpedition.party
    });

    return {
      success: true,
      expedition: this.activeExpedition
    };
  }

  /**
   * Update expedition state
   * @param {Object} updates - State updates
   */
  updateExpedition(updates) {
    if (!this.activeExpedition) return;

    Object.assign(this.activeExpedition.state, updates);

    this.emit('expedition:updated', {
      expeditionId: this.activeExpedition.id,
      updates
    });
  }

  /**
   * Complete expedition (win)
   * @param {Object} results - Final results
   * @returns {Object} Results
   */
  completeExpedition(results) {
    if (!this.activeExpedition) {
      return { success: false, error: 'No active expedition' };
    }

    this.activeExpedition.state.endTime = Date.now();
    this.activeExpedition.status = 'completed';

    // Award XP to party members
    const xpPerMember = results.totalXP || 100;
    for (const member of this.activeExpedition.party.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (npc) {
        this.npcManager.awardCombatXP(member.npcId, xpPerMember);
        npc.expeditionCount++;
        npc.kills += results.enemiesKilled || 0;
        npc.onExpedition = false;

        // Check veteran status
        this.npcManager.checkVeteranStatus(member.npcId);
      }
    }

    // Save to history
    this.expeditionHistory.push({ ...this.activeExpedition });

    this.emit('expedition:completed', {
      expeditionId: this.activeExpedition.id,
      results
    });

    const completedExpedition = this.activeExpedition;
    this.activeExpedition = null;

    return {
      success: true,
      expedition: completedExpedition,
      results
    };
  }

  /**
   * Fail expedition (party wiped)
   * @param {Object} results - Failure details
   * @returns {Object} Results
   */
  failExpedition(results) {
    if (!this.activeExpedition) {
      return { success: false, error: 'No active expedition' };
    }

    this.activeExpedition.state.endTime = Date.now();
    this.activeExpedition.status = 'failed';

    // Mark NPCs as no longer on expedition
    for (const member of this.activeExpedition.party.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (npc) {
        npc.onExpedition = false;

        // Apply injury/death based on config
        if (results.permaDeath && Math.random() < 0.2) {
          npc.alive = false;
        } else {
          // Injury: reduce health, temporary stat debuff
          npc.combatStats.health.current = Math.max(
            1,
            npc.combatStats.health.current * 0.5
          );
        }
      }
    }

    // Save to history
    this.expeditionHistory.push({ ...this.activeExpedition });

    this.emit('expedition:failed', {
      expeditionId: this.activeExpedition.id,
      results
    });

    const failedExpedition = this.activeExpedition;
    this.activeExpedition = null;

    return {
      success: true,
      expedition: failedExpedition,
      results
    };
  }

  /**
   * Get active expedition
   * @returns {Object|null} Active expedition
   */
  getActiveExpedition() {
    return this.activeExpedition;
  }

  /**
   * Get expedition history
   * @returns {Array} Past expeditions
   */
  getHistory() {
    return this.expeditionHistory;
  }

  /**
   * Check if party can start expedition
   * @returns {Object} { canStart, reason }
   */
  canStartExpedition() {
    if (this.activeExpedition) {
      return {
        canStart: false,
        reason: 'Expedition already in progress'
      };
    }

    const validation = this.partyManager.validateParty();
    if (!validation.valid) {
      return {
        canStart: false,
        reason: validation.errors.join(', ')
      };
    }

    return { canStart: true };
  }
}

export default ExpeditionManager;
```

**Verification Checkpoint 3.1.1:**
```javascript
// src/modules/expedition/__tests__/ExpeditionManager.test.js
import ExpeditionManager from '../ExpeditionManager';
import NPCPartyManager from '../NPCPartyManager';

describe('ExpeditionManager', () => {
  let expeditionManager, partyManager, npcManager, npc1, npc2;

  beforeEach(() => {
    // Mock NPCManager
    npcManager = {
      npcs: new Map(),
      getNPC: jest.fn((id) => npcManager.npcs.get(id)),
      awardCombatXP: jest.fn(),
      checkVeteranStatus: jest.fn()
    };

    // Create test NPCs
    npc1 = {
      id: 'npc1',
      name: 'Fighter',
      alive: true,
      onExpedition: false,
      expeditionCount: 0,
      kills: 0,
      combatStats: {
        health: { current: 100, max: 100 },
        damage: 20
      }
    };

    npc2 = {
      id: 'npc2',
      name: 'Mage',
      alive: true,
      onExpedition: false,
      expeditionCount: 0,
      kills: 0,
      combatStats: {
        health: { current: 80, max: 80 },
        damage: 30
      }
    };

    npcManager.npcs.set('npc1', npc1);
    npcManager.npcs.set('npc2', npc2);

    partyManager = new NPCPartyManager(npcManager);
    expeditionManager = new ExpeditionManager(partyManager, npcManager);

    // Create party
    partyManager.createParty();
    partyManager.addToParty('npc1', 'tank');
    partyManager.addToParty('npc2', 'damage');
  });

  test('starts expedition successfully', () => {
    const result = expeditionManager.startExpedition({
      difficulty: 1,
      dungeonType: 'cave',
      maxFloor: 3
    });

    expect(result.success).toBe(true);
    expect(result.expedition).toBeDefined();
    expect(result.expedition.status).toBe('active');
    expect(npc1.onExpedition).toBe(true);
    expect(npc2.onExpedition).toBe(true);
  });

  test('prevents starting expedition without party', () => {
    partyManager.clearParty();

    const result = expeditionManager.startExpedition({
      difficulty: 1
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('validation failed');
  });

  test('prevents starting multiple expeditions', () => {
    expeditionManager.startExpedition({ difficulty: 1 });

    const result = expeditionManager.startExpedition({ difficulty: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('already in progress');
  });

  test('completes expedition and awards XP', () => {
    expeditionManager.startExpedition({ difficulty: 1 });

    const result = expeditionManager.completeExpedition({
      totalXP: 200,
      enemiesKilled: 15
    });

    expect(result.success).toBe(true);
    expect(npcManager.awardCombatXP).toHaveBeenCalledWith('npc1', 200);
    expect(npcManager.awardCombatXP).toHaveBeenCalledWith('npc2', 200);
    expect(npc1.expeditionCount).toBe(1);
    expect(npc1.kills).toBe(15);
    expect(npc1.onExpedition).toBe(false);
  });

  test('fails expedition and injures NPCs', () => {
    expeditionManager.startExpedition({ difficulty: 1 });

    const result = expeditionManager.failExpedition({
      permaDeath: false
    });

    expect(result.success).toBe(true);
    expect(result.expedition.status).toBe('failed');
    expect(npc1.combatStats.health.current).toBeLessThan(100);
    expect(npc1.onExpedition).toBe(false);
  });

  test('tracks expedition history', () => {
    expeditionManager.startExpedition({ difficulty: 1 });
    expeditionManager.completeExpedition({ totalXP: 100 });

    const history = expeditionManager.getHistory();

    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('completed');
  });

  test('checks if can start expedition', () => {
    let check = expeditionManager.canStartExpedition();
    expect(check.canStart).toBe(true);

    expeditionManager.startExpedition({ difficulty: 1 });

    check = expeditionManager.canStartExpedition();
    expect(check.canStart).toBe(false);
  });
});
```

**Run verification:**
```bash
npm test -- ExpeditionManager.test.js
```

**Expected:** All tests pass ✅

---

#### Task 3.1.2: Create Dungeon Generator

**Location:** `src/modules/expedition/DungeonGenerator.js`

**Dependencies:** Task 3.1.1 complete

**Steps:**
1. Create `DungeonGenerator.js`
2. Implement procedural dungeon generation
3. Add enemy spawning logic
4. Add loot placement

**Code Template:**
```javascript
/**
 * DungeonGenerator.js - Procedural dungeon generation
 */
class DungeonGenerator {
  constructor() {
    this.dungeonTypes = {
      cave: {
        enemyTypes: ['goblin', 'bat', 'spider'],
        lootChance: 0.3,
        bossChance: 0.1
      },
      ruins: {
        enemyTypes: ['skeleton', 'ghost', 'zombie'],
        lootChance: 0.4,
        bossChance: 0.15
      },
      fortress: {
        enemyTypes: ['knight', 'archer', 'mage'],
        lootChance: 0.5,
        bossChance: 0.2
      }
    };
  }

  /**
   * Generate dungeon floor
   * @param {Object} config - Generation config
   * @returns {Object} Dungeon floor data
   */
  generateFloor(config) {
    const {
      floorNumber = 1,
      dungeonType = 'cave',
      difficulty = 1,
      width = 800,
      height = 600
    } = config;

    const typeConfig = this.dungeonTypes[dungeonType] || this.dungeonTypes.cave;

    // Generate rooms
    const rooms = this._generateRooms(width, height, floorNumber);

    // Generate corridors
    const corridors = this._generateCorridors(rooms);

    // Spawn enemies
    const enemies = this._spawnEnemies(
      rooms,
      typeConfig,
      difficulty,
      floorNumber
    );

    // Place loot
    const loot = this._placeLoot(rooms, typeConfig, floorNumber);

    // Place stairs
    const stairs = {
      position: rooms[rooms.length - 1].center,
      type: 'down'
    };

    return {
      floorNumber,
      dungeonType,
      difficulty,
      width,
      height,
      rooms,
      corridors,
      enemies,
      loot,
      stairs,
      spawnPoint: rooms[0].center
    };
  }

  /**
   * Generate rooms
   * @private
   */
  _generateRooms(width, height, floorNumber) {
    const roomCount = 4 + Math.floor(floorNumber * 1.5);
    const rooms = [];

    for (let i = 0; i < roomCount; i++) {
      const roomWidth = 80 + Math.random() * 120;
      const roomHeight = 80 + Math.random() * 120;

      const room = {
        id: `room_${i}`,
        x: Math.random() * (width - roomWidth),
        y: Math.random() * (height - roomHeight),
        width: roomWidth,
        height: roomHeight,
        center: {
          x: 0,
          y: 0
        }
      };

      room.center.x = room.x + room.width / 2;
      room.center.y = room.y + room.height / 2;

      rooms.push(room);
    }

    return rooms;
  }

  /**
   * Generate corridors between rooms
   * @private
   */
  _generateCorridors(rooms) {
    const corridors = [];

    for (let i = 0; i < rooms.length - 1; i++) {
      const room1 = rooms[i];
      const room2 = rooms[i + 1];

      corridors.push({
        from: room1.center,
        to: room2.center,
        width: 40
      });
    }

    return corridors;
  }

  /**
   * Spawn enemies
   * @private
   */
  _spawnEnemies(rooms, typeConfig, difficulty, floorNumber) {
    const enemies = [];
    const enemiesPerRoom = 2 + Math.floor(difficulty * floorNumber * 0.5);

    // Skip first room (spawn room)
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];

      for (let j = 0; j < enemiesPerRoom; j++) {
        const enemyType =
          typeConfig.enemyTypes[
            Math.floor(Math.random() * typeConfig.enemyTypes.length)
          ];

        enemies.push({
          id: `enemy_${i}_${j}`,
          type: enemyType,
          position: {
            x: room.x + Math.random() * room.width,
            y: room.y + Math.random() * room.height
          },
          level: difficulty + Math.floor(floorNumber / 2),
          stats: this._generateEnemyStats(
            enemyType,
            difficulty + Math.floor(floorNumber / 2)
          )
        });
      }

      // Chance for boss in last room
      if (i === rooms.length - 1 && Math.random() < typeConfig.bossChance) {
        enemies.push({
          id: `boss_${i}`,
          type: `${typeConfig.enemyTypes[0]}_boss`,
          position: room.center,
          level: difficulty + floorNumber,
          isBoss: true,
          stats: this._generateEnemyStats(
            'boss',
            difficulty + floorNumber,
            2.5
          )
        });
      }
    }

    return enemies;
  }

  /**
   * Generate enemy stats
   * @private
   */
  _generateEnemyStats(type, level, multiplier = 1) {
    return {
      health: {
        current: Math.floor(50 * level * multiplier),
        max: Math.floor(50 * level * multiplier)
      },
      damage: Math.floor(5 * level * multiplier),
      defense: Math.floor(2 * level * multiplier),
      speed: 2 + Math.random(),
      xpReward: Math.floor(20 * level * multiplier),
      goldReward: Math.floor(10 * level * multiplier)
    };
  }

  /**
   * Place loot
   * @private
   */
  _placeLoot(rooms, typeConfig, floorNumber) {
    const loot = [];

    for (const room of rooms) {
      if (Math.random() < typeConfig.lootChance) {
        loot.push({
          id: `loot_${room.id}`,
          position: {
            x: room.x + Math.random() * room.width,
            y: room.y + Math.random() * room.height
          },
          tier: Math.min(5, Math.ceil(floorNumber / 2)),
          type: ['weapon', 'armor', 'accessory'][Math.floor(Math.random() * 3)]
        });
      }
    }

    return loot;
  }
}

export default DungeonGenerator;
```

**Verification Checkpoint 3.1.2:**
```javascript
// src/modules/expedition/__tests__/DungeonGenerator.test.js
import DungeonGenerator from '../DungeonGenerator';

describe('DungeonGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new DungeonGenerator();
  });

  test('generates dungeon floor', () => {
    const floor = generator.generateFloor({
      floorNumber: 1,
      dungeonType: 'cave',
      difficulty: 1
    });

    expect(floor).toBeDefined();
    expect(floor.rooms.length).toBeGreaterThan(0);
    expect(floor.enemies.length).toBeGreaterThan(0);
    expect(floor.spawnPoint).toBeDefined();
    expect(floor.stairs).toBeDefined();
  });

  test('scales enemies with floor number', () => {
    const floor1 = generator.generateFloor({ floorNumber: 1, difficulty: 1 });
    const floor5 = generator.generateFloor({ floorNumber: 5, difficulty: 1 });

    expect(floor5.enemies.length).toBeGreaterThan(floor1.enemies.length);
    expect(floor5.enemies[0].level).toBeGreaterThan(floor1.enemies[0].level);
  });

  test('generates loot based on type', () => {
    const floor = generator.generateFloor({
      floorNumber: 3,
      dungeonType: 'fortress',
      difficulty: 2
    });

    expect(floor.loot.length).toBeGreaterThan(0);
    expect(floor.loot[0].tier).toBeLessThanOrEqual(5);
  });

  test('connects rooms with corridors', () => {
    const floor = generator.generateFloor({ floorNumber: 1 });

    expect(floor.corridors.length).toBe(floor.rooms.length - 1);
    expect(floor.corridors[0].from).toBeDefined();
    expect(floor.corridors[0].to).toBeDefined();
  });

  test('places spawn point in first room', () => {
    const floor = generator.generateFloor({ floorNumber: 1 });

    expect(floor.spawnPoint).toEqual(floor.rooms[0].center);
  });
});
```

**Run verification:**
```bash
npm test -- DungeonGenerator.test.js
```

**Expected:** All tests pass ✅

---

### Phase 3.2: Refactor Combat System (4-5 hours)

#### Task 3.2.1: Create CombatEngine Class

**Location:** `src/modules/expedition/CombatEngine.js`

**Dependencies:** Phase 2 complete

**Steps:**
1. Extract combat logic from old game files
2. Create modern CombatEngine class
3. Support NPC party combat
4. Add combat events

**Code Template:**
```javascript
/**
 * CombatEngine.js - Core combat mechanics
 */
import EventEmitter from 'events';

class CombatEngine extends EventEmitter {
  constructor() {
    super();
    this.combatLog = [];
  }

  /**
   * Calculate damage for an attack
   * @param {Object} attacker - Attacking entity
   * @param {Object} defender - Defending entity
   * @param {Object} bonuses - Skill/equipment bonuses
   * @returns {Object} Damage result
   */
  calculateDamage(attacker, defender, bonuses = {}) {
    let baseDamage = attacker.combatStats.damage;

    // Apply damage multipliers from skills
    if (bonuses.damageMultiplier) {
      baseDamage *= bonuses.damageMultiplier;
    }

    // Check for critical hit
    const critRoll = Math.random() * 100;
    const isCrit = critRoll < attacker.combatStats.critChance;

    if (isCrit) {
      baseDamage *= attacker.combatStats.critDamage / 100;
    }

    // Apply defender's defense
    const defense = defender.combatStats.defense;
    const damageReduction = defense / (defense + 100); // Diminishing returns formula
    let finalDamage = Math.max(1, Math.floor(baseDamage * (1 - damageReduction)));

    // Check for dodge
    const dodgeRoll = Math.random() * 100;
    const isDodge = dodgeRoll < defender.combatStats.dodgeChance;

    if (isDodge) {
      finalDamage = 0;
    }

    return {
      damage: finalDamage,
      isCrit,
      isDodge,
      baseDamage,
      defenseReduction: baseDamage - finalDamage
    };
  }

  /**
   * Execute attack
   * @param {Object} attacker - Attacking entity
   * @param {Object} defender - Defending entity
   * @param {Object} bonuses - Bonuses
   * @returns {Object} Attack result
   */
  executeAttack(attacker, defender, bonuses = {}) {
    const result = this.calculateDamage(attacker, defender, bonuses);

    // Apply damage
    defender.combatStats.health.current = Math.max(
      0,
      defender.combatStats.health.current - result.damage
    );

    // Track damage dealt
    if (attacker.damageDealt !== undefined) {
      attacker.damageDealt += result.damage;
    }
    if (defender.damageTaken !== undefined) {
      defender.damageTaken += result.damage;
    }

    // Check if defender died
    const died = defender.combatStats.health.current === 0;

    // Log combat event
    this.combatLog.push({
      timestamp: Date.now(),
      attacker: attacker.id || attacker.name,
      defender: defender.id || defender.name,
      ...result,
      died
    });

    // Emit event
    this.emit('combat:attack', {
      attacker,
      defender,
      result: { ...result, died }
    });

    return { ...result, died };
  }

  /**
   * Execute party vs enemy combat turn
   * @param {Array} party - Array of NPCs
   * @param {Array} enemies - Array of enemies
   * @param {Object} skillSystem - Skill system for bonuses
   * @returns {Object} Turn results
   */
  executeTurn(party, enemies, skillSystem) {
    const results = {
      partyAttacks: [],
      enemyAttacks: [],
      enemiesKilled: [],
      partyMembersKilled: []
    };

    // Party attacks (sorted by speed)
    const sortedParty = [...party].sort(
      (a, b) => b.combatStats.speed - a.combatStats.speed
    );

    for (const npc of sortedParty) {
      if (npc.combatStats.health.current <= 0) continue;

      // Find living enemy
      const livingEnemies = enemies.filter(e => e.stats.health.current > 0);
      if (livingEnemies.length === 0) break;

      const target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];

      // Get skill bonuses
      const bonuses = skillSystem ? skillSystem.getSkillBonuses(npc) : {};

      // Execute attack
      const attackResult = this.executeAttack(npc, target, bonuses);
      results.partyAttacks.push({
        attacker: npc,
        target,
        result: attackResult
      });

      if (attackResult.died) {
        results.enemiesKilled.push(target);
        if (npc.kills !== undefined) npc.kills++;
      }
    }

    // Enemy attacks
    const livingEnemies = enemies.filter(e => e.stats.health.current > 0);
    const sortedEnemies = [...livingEnemies].sort(
      (a, b) => b.stats.speed - a.stats.speed
    );

    for (const enemy of sortedEnemies) {
      // Find living party member
      const livingParty = party.filter(n => n.combatStats.health.current > 0);
      if (livingParty.length === 0) break;

      const target = livingParty[Math.floor(Math.random() * livingParty.length)];

      // Enemy uses stats instead of combatStats
      const enemyAsAttacker = {
        ...enemy,
        combatStats: enemy.stats
      };
      const attackResult = this.executeAttack(enemyAsAttacker, target, {});

      results.enemyAttacks.push({
        attacker: enemy,
        target,
        result: attackResult
      });

      if (attackResult.died) {
        results.partyMembersKilled.push(target);
      }
    }

    return results;
  }

  /**
   * Check if combat is over
   * @param {Array} party - Party members
   * @param {Array} enemies - Enemies
   * @returns {Object} { isOver, winner }
   */
  checkCombatEnd(party, enemies) {
    const partyAlive = party.some(n => n.combatStats.health.current > 0);
    const enemiesAlive = enemies.some(e => e.stats.health.current > 0);

    if (!partyAlive) {
      return { isOver: true, winner: 'enemies' };
    }

    if (!enemiesAlive) {
      return { isOver: true, winner: 'party' };
    }

    return { isOver: false, winner: null };
  }

  /**
   * Get combat log
   * @returns {Array} Combat log entries
   */
  getCombatLog() {
    return this.combatLog;
  }

  /**
   * Clear combat log
   */
  clearLog() {
    this.combatLog = [];
  }
}

export default CombatEngine;
```

**Verification Checkpoint 3.2.1:**
```javascript
// src/modules/expedition/__tests__/CombatEngine.test.js
import CombatEngine from '../CombatEngine';

describe('CombatEngine', () => {
  let combat, attacker, defender;

  beforeEach(() => {
    combat = new CombatEngine();

    attacker = {
      id: 'npc1',
      name: 'Fighter',
      combatStats: {
        damage: 20,
        critChance: 10,
        critDamage: 150,
        speed: 5
      },
      damageDealt: 0
    };

    defender = {
      id: 'enemy1',
      name: 'Goblin',
      combatStats: {
        health: { current: 100, max: 100 },
        defense: 5,
        dodgeChance: 5,
        speed: 3
      },
      damageTaken: 0
    };
  });

  test('calculates basic damage', () => {
    const result = combat.calculateDamage(attacker, defender);

    expect(result.damage).toBeGreaterThan(0);
    expect(result.damage).toBeLessThan(attacker.combatStats.damage);
    expect(result.defenseReduction).toBeGreaterThan(0);
  });

  test('applies critical hits', () => {
    attacker.combatStats.critChance = 100; // Always crit

    const result = combat.calculateDamage(attacker, defender);

    expect(result.isCrit).toBe(true);
    expect(result.damage).toBeGreaterThan(result.baseDamage);
  });

  test('applies dodge', () => {
    defender.combatStats.dodgeChance = 100; // Always dodge

    const result = combat.calculateDamage(attacker, defender);

    expect(result.isDodge).toBe(true);
    expect(result.damage).toBe(0);
  });

  test('executes attack and reduces health', () => {
    const initialHealth = defender.combatStats.health.current;

    const result = combat.executeAttack(attacker, defender);

    expect(defender.combatStats.health.current).toBeLessThan(initialHealth);
    expect(result.died).toBe(false);
  });

  test('detects when defender dies', () => {
    defender.combatStats.health.current = 1;

    const result = combat.executeAttack(attacker, defender);

    expect(defender.combatStats.health.current).toBe(0);
    expect(result.died).toBe(true);
  });

  test('executes combat turn', () => {
    const party = [
      {
        id: 'npc1',
        combatStats: {
          damage: 20,
          health: { current: 100, max: 100 },
          critChance: 5,
          critDamage: 150,
          defense: 5,
          dodgeChance: 5,
          speed: 5
        },
        damageDealt: 0,
        kills: 0
      }
    ];

    const enemies = [
      {
        id: 'enemy1',
        stats: {
          damage: 10,
          health: { current: 50, max: 50 },
          critChance: 0,
          critDamage: 100,
          defense: 0,
          dodgeChance: 0,
          speed: 3
        }
      }
    ];

    const results = combat.executeTurn(party, enemies, null);

    expect(results.partyAttacks.length).toBe(1);
    expect(results.enemyAttacks.length).toBeGreaterThanOrEqual(0);
  });

  test('checks combat end conditions', () => {
    const party = [
      { combatStats: { health: { current: 0 } } }
    ];
    const enemies = [
      { stats: { health: { current: 50 } } }
    ];

    const result = combat.checkCombatEnd(party, enemies);

    expect(result.isOver).toBe(true);
    expect(result.winner).toBe('enemies');
  });
});
```

**Run verification:**
```bash
npm test -- CombatEngine.test.js
```

**Expected:** All tests pass ✅

---

### Phase 3.3: Expedition Game Mode (3-4 hours)

#### Task 3.3.1: Create ExpeditionGameMode Class

**Location:** `src/modules/expedition/ExpeditionGameMode.js`

**Dependencies:** Tasks 3.1.1, 3.1.2, 3.2.1 complete

**Steps:**
1. Create game mode class
2. Integrate dungeon generation
3. Integrate combat engine
4. Handle player movement and interactions

**Code Template:**
```javascript
/**
 * ExpeditionGameMode.js - Expedition gameplay mode
 */
import EventEmitter from 'events';

class ExpeditionGameMode extends EventEmitter {
  constructor(expeditionManager, dungeonGenerator, combatEngine, npcManager, skillSystem) {
    super();
    this.expeditionManager = expeditionManager;
    this.dungeonGenerator = dungeonGenerator;
    this.combatEngine = combatEngine;
    this.npcManager = npcManager;
    this.skillSystem = skillSystem;

    this.currentFloor = null;
    this.playerPosition = { x: 0, y: 0 };
    this.activeCombat = null;
    this.collectedLoot = [];
  }

  /**
   * Initialize expedition mode
   * @param {Object} expeditionConfig - Expedition configuration
   * @returns {Object} Result
   */
  async initialize(expeditionConfig) {
    // Start expedition
    const result = this.expeditionManager.startExpedition(expeditionConfig);
    if (!result.success) {
      return result;
    }

    // Generate first floor
    this.currentFloor = this.dungeonGenerator.generateFloor({
      floorNumber: 1,
      dungeonType: expeditionConfig.dungeonType || 'cave',
      difficulty: expeditionConfig.difficulty || 1
    });

    // Set player position at spawn
    this.playerPosition = { ...this.currentFloor.spawnPoint };

    this.emit('expedition:initialized', {
      expedition: result.expedition,
      floor: this.currentFloor
    });

    return {
      success: true,
      expedition: result.expedition,
      floor: this.currentFloor
    };
  }

  /**
   * Update player position
   * @param {Object} newPosition - { x, y }
   */
  updatePosition(newPosition) {
    this.playerPosition = newPosition;

    // Check for enemy encounters
    this._checkEnemyEncounter();

    // Check for loot pickup
    this._checkLootPickup();

    // Check for stairs interaction
    this._checkStairsInteraction();

    this.emit('player:moved', {
      position: this.playerPosition
    });
  }

  /**
   * Start combat encounter
   * @param {Array} enemies - Enemy group
   * @returns {Object} Combat state
   */
  startCombat(enemies) {
    if (this.activeCombat) {
      return { success: false, error: 'Combat already active' };
    }

    // Get party members
    const expedition = this.expeditionManager.getActiveExpedition();
    if (!expedition) {
      return { success: false, error: 'No active expedition' };
    }

    const party = expedition.party.members
      .map(m => this.npcManager.getNPC(m.npcId))
      .filter(npc => npc && npc.alive);

    this.activeCombat = {
      party,
      enemies,
      turn: 0,
      log: []
    };

    this.combatEngine.clearLog();

    this.emit('combat:started', {
      party,
      enemies
    });

    return {
      success: true,
      combat: this.activeCombat
    };
  }

  /**
   * Execute combat turn
   * @returns {Object} Turn results
   */
  executeCombatTurn() {
    if (!this.activeCombat) {
      return { success: false, error: 'No active combat' };
    }

    this.activeCombat.turn++;

    const results = this.combatEngine.executeTurn(
      this.activeCombat.party,
      this.activeCombat.enemies,
      this.skillSystem
    );

    this.activeCombat.log.push(results);

    // Check if combat is over
    const endCheck = this.combatEngine.checkCombatEnd(
      this.activeCombat.party,
      this.activeCombat.enemies
    );

    if (endCheck.isOver) {
      this._endCombat(endCheck.winner);
    }

    this.emit('combat:turn', {
      turn: this.activeCombat.turn,
      results,
      endCheck
    });

    return {
      success: true,
      results,
      endCheck
    };
  }

  /**
   * Descend to next floor
   * @returns {Object} Result
   */
  descendFloor() {
    const expedition = this.expeditionManager.getActiveExpedition();
    if (!expedition) {
      return { success: false, error: 'No active expedition' };
    }

    const nextFloor = expedition.state.currentFloor + 1;

    if (nextFloor > expedition.config.maxFloor) {
      // Expedition complete!
      return this._completeExpedition();
    }

    // Generate next floor
    this.currentFloor = this.dungeonGenerator.generateFloor({
      floorNumber: nextFloor,
      dungeonType: expedition.config.dungeonType,
      difficulty: expedition.config.difficulty
    });

    // Update expedition state
    this.expeditionManager.updateExpedition({
      currentFloor: nextFloor
    });

    // Reset position
    this.playerPosition = { ...this.currentFloor.spawnPoint };

    this.emit('floor:changed', {
      floorNumber: nextFloor,
      floor: this.currentFloor
    });

    return {
      success: true,
      floor: this.currentFloor
    };
  }

  /**
   * Check for enemy encounter
   * @private
   */
  _checkEnemyEncounter() {
    if (this.activeCombat) return;

    const nearbyEnemies = this.currentFloor.enemies.filter(enemy => {
      if (enemy.stats.health.current <= 0) return false;

      const dx = enemy.position.x - this.playerPosition.x;
      const dy = enemy.position.y - this.playerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance < 50; // Encounter range
    });

    if (nearbyEnemies.length > 0) {
      this.startCombat(nearbyEnemies);
    }
  }

  /**
   * Check for loot pickup
   * @private
   */
  _checkLootPickup() {
    const nearbyLoot = this.currentFloor.loot.filter(item => {
      const dx = item.position.x - this.playerPosition.x;
      const dy = item.position.y - this.playerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance < 30; // Pickup range
    });

    for (const item of nearbyLoot) {
      this.collectedLoot.push(item);
      this.currentFloor.loot = this.currentFloor.loot.filter(l => l.id !== item.id);

      this.emit('loot:collected', { item });
    }
  }

  /**
   * Check for stairs interaction
   * @private
   */
  _checkStairsInteraction() {
    const dx = this.currentFloor.stairs.position.x - this.playerPosition.x;
    const dy = this.currentFloor.stairs.position.y - this.playerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 40) {
      this.emit('stairs:nearby');
    }
  }

  /**
   * End combat
   * @private
   */
  _endCombat(winner) {
    if (winner === 'party') {
      // Award XP and gold
      const totalXP = this.activeCombat.enemies.reduce(
        (sum, e) => sum + (e.stats.xpReward || 0),
        0
      );
      const totalGold = this.activeCombat.enemies.reduce(
        (sum, e) => sum + (e.stats.goldReward || 0),
        0
      );

      this.expeditionManager.updateExpedition({
        enemiesKilled:
          (this.expeditionManager.activeExpedition.state.enemiesKilled || 0) +
          this.activeCombat.enemies.length,
        goldEarned:
          (this.expeditionManager.activeExpedition.state.goldEarned || 0) +
          totalGold
      });

      this.emit('combat:victory', {
        xp: totalXP,
        gold: totalGold
      });
    } else {
      // Party wiped
      this._failExpedition();
    }

    this.activeCombat = null;
  }

  /**
   * Complete expedition
   * @private
   */
  _completeExpedition() {
    const expedition = this.expeditionManager.getActiveExpedition();

    const results = {
      totalXP: expedition.state.enemiesKilled * 20,
      goldEarned: expedition.state.goldEarned,
      itemsFound: this.collectedLoot,
      floorsCompleted: expedition.config.maxFloor
    };

    this.expeditionManager.completeExpedition(results);

    this.emit('expedition:completed', { results });

    return {
      success: true,
      completed: true,
      results
    };
  }

  /**
   * Fail expedition
   * @private
   */
  _failExpedition() {
    this.expeditionManager.failExpedition({
      permaDeath: false,
      floor: this.currentFloor.floorNumber
    });

    this.emit('expedition:failed');
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return {
      floor: this.currentFloor,
      position: this.playerPosition,
      combat: this.activeCombat,
      loot: this.collectedLoot,
      expedition: this.expeditionManager.getActiveExpedition()
    };
  }
}

export default ExpeditionGameMode;
```

**Verification Checkpoint 3.3.1:**
```javascript
// src/modules/expedition/__tests__/ExpeditionGameMode.test.js
import ExpeditionGameMode from '../ExpeditionGameMode';
import ExpeditionManager from '../ExpeditionManager';
import DungeonGenerator from '../DungeonGenerator';
import CombatEngine from '../CombatEngine';
import NPCPartyManager from '../NPCPartyManager';
import NPCSkillSystem from '../../combat/NPCSkillSystem';

describe('ExpeditionGameMode', () => {
  let gameMode, expeditionManager, partyManager, npcManager;

  beforeEach(() => {
    // Setup mocks
    npcManager = {
      npcs: new Map(),
      getNPC: jest.fn((id) => npcManager.npcs.get(id)),
      awardCombatXP: jest.fn(),
      checkVeteranStatus: jest.fn()
    };

    const npc1 = {
      id: 'npc1',
      name: 'Fighter',
      alive: true,
      combatStats: {
        damage: 20,
        health: { current: 100, max: 100 },
        defense: 5,
        critChance: 10,
        critDamage: 150,
        dodgeChance: 5,
        speed: 5
      },
      skills: {
        combat: { powerStrike: 0, criticalHit: 0, deadlyBlow: 0 },
        magic: { manaPool: 0, spellPower: 0, fastCasting: 0 },
        defense: { ironSkin: 0, vitality: 0, evasion: 0 },
        utility: { swiftness: 0, fortune: 0, regeneration: 0 }
      }
    };

    npcManager.npcs.set('npc1', npc1);

    partyManager = new NPCPartyManager(npcManager);
    partyManager.createParty();
    partyManager.addToParty('npc1', 'tank');

    expeditionManager = new ExpeditionManager(partyManager, npcManager);
    const dungeonGenerator = new DungeonGenerator();
    const combatEngine = new CombatEngine();
    const skillSystem = new NPCSkillSystem();

    gameMode = new ExpeditionGameMode(
      expeditionManager,
      dungeonGenerator,
      combatEngine,
      npcManager,
      skillSystem
    );
  });

  test('initializes expedition mode', async () => {
    const result = await gameMode.initialize({
      difficulty: 1,
      dungeonType: 'cave',
      maxFloor: 3
    });

    expect(result.success).toBe(true);
    expect(result.floor).toBeDefined();
    expect(gameMode.currentFloor).toBeDefined();
  });

  test('updates player position', async () => {
    await gameMode.initialize({ difficulty: 1, maxFloor: 3 });

    gameMode.updatePosition({ x: 100, y: 100 });

    expect(gameMode.playerPosition).toEqual({ x: 100, y: 100 });
  });

  test('starts combat encounter', async () => {
    await gameMode.initialize({ difficulty: 1, maxFloor: 3 });

    const enemies = [
      {
        id: 'enemy1',
        stats: {
          health: { current: 50, max: 50 },
          damage: 10,
          defense: 0,
          critChance: 0,
          critDamage: 100,
          dodgeChance: 0,
          speed: 3
        }
      }
    ];

    const result = gameMode.startCombat(enemies);

    expect(result.success).toBe(true);
    expect(gameMode.activeCombat).toBeDefined();
    expect(gameMode.activeCombat.party.length).toBe(1);
  });

  test('executes combat turn', async () => {
    await gameMode.initialize({ difficulty: 1, maxFloor: 3 });

    const enemies = [
      {
        id: 'enemy1',
        stats: {
          health: { current: 50, max: 50 },
          damage: 10,
          defense: 0,
          critChance: 0,
          critDamage: 100,
          dodgeChance: 0,
          speed: 3,
          xpReward: 20,
          goldReward: 10
        }
      }
    ];

    gameMode.startCombat(enemies);
    const result = gameMode.executeCombatTurn();

    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    expect(gameMode.activeCombat.turn).toBe(1);
  });

  test('descends to next floor', async () => {
    await gameMode.initialize({ difficulty: 1, maxFloor: 3 });

    const result = gameMode.descendFloor();

    expect(result.success).toBe(true);
    expect(result.floor.floorNumber).toBe(2);
  });

  test('completes expedition on final floor', async () => {
    await gameMode.initialize({ difficulty: 1, maxFloor: 1 });

    const result = gameMode.descendFloor();

    expect(result.completed).toBe(true);
    expect(result.results).toBeDefined();
  });
});
```

**Run verification:**
```bash
npm test -- ExpeditionGameMode.test.js
```

**Expected:** All tests pass ✅

---

### Phase 3.4: Expedition UI (2-3 hours)

*Note: UI implementation details will be added in Phase 6 (UI/UX Integration). This section focuses on React component structure.*

#### Task 3.4.1: Create ExpeditionPrep Component

**Location:** `src/components/modes/expedition/ExpeditionPrep.jsx`

**Code outline (detailed implementation in Phase 6):**
```javascript
/**
 * ExpeditionPrep.jsx - Expedition preparation UI
 */
import React, { useState } from 'react';

function ExpeditionPrep({ partyManager, npcManager, onStart }) {
  // Party selection
  // Equipment management
  // Difficulty selection
  // Start button

  return (
    <div className="expedition-prep">
      {/* Implementation in Phase 6 */}
    </div>
  );
}

export default ExpeditionPrep;
```

#### Task 3.4.2: Create ExpeditionHUD Component

**Location:** `src/components/modes/expedition/ExpeditionHUD.jsx`

**Code outline (detailed implementation in Phase 6):**
```javascript
/**
 * ExpeditionHUD.jsx - Expedition gameplay HUD
 */
import React from 'react';

function ExpeditionHUD({ gameMode, party, floor }) {
  // Party health bars
  // Minimap
  // Combat log
  // Floor info

  return (
    <div className="expedition-hud">
      {/* Implementation in Phase 6 */}
    </div>
  );
}

export default ExpeditionHUD;
```

---

### Phase 3.5: Expedition Rewards (1-2 hours)

#### Task 3.5.1: Create Expedition Rewards System

**Location:** `src/modules/expedition/ExpeditionRewards.js`

**Code Template:**
```javascript
/**
 * ExpeditionRewards.js - Calculate and distribute expedition rewards
 */
class ExpeditionRewards {
  constructor(sharedResourceManager, sharedInventoryManager) {
    this.sharedResources = sharedResourceManager;
    this.sharedInventory = sharedInventoryManager;
  }

  /**
   * Calculate rewards based on expedition performance
   * @param {Object} expeditionResults - Expedition results
   * @returns {Object} Rewards
   */
  calculateRewards(expeditionResults) {
    const rewards = {
      resources: {},
      equipment: [],
      xp: 0,
      gold: 0
    };

    // Base rewards
    rewards.xp = expeditionResults.enemiesKilled * 20;
    rewards.gold = expeditionResults.goldEarned || 0;

    // Floor completion bonus
    const floorBonus = expeditionResults.floorsCompleted * 50;
    rewards.gold += floorBonus;

    // Convert items to equipment
    rewards.equipment = expeditionResults.itemsFound || [];

    // Convert gold to resources (gold -> settlement resources)
    rewards.resources.gold = rewards.gold;

    // Bonus resources based on difficulty
    const difficulty = expeditionResults.difficulty || 1;
    rewards.resources.wood = Math.floor(10 * difficulty);
    rewards.resources.stone = Math.floor(5 * difficulty);

    return rewards;
  }

  /**
   * Distribute rewards to shared systems
   * @param {Object} rewards - Calculated rewards
   * @returns {Object} Distribution result
   */
  distributeRewards(rewards) {
    // Add resources
    for (const [resource, amount] of Object.entries(rewards.resources)) {
      this.sharedResources.addResource(resource, amount);
    }

    // Add equipment to shared inventory
    for (const item of rewards.equipment) {
      this.sharedInventory.addEquipment(item);
    }

    return {
      success: true,
      distributed: rewards
    };
  }

  /**
   * Generate loot item
   * @param {number} tier - Item tier (1-5)
   * @param {string} type - Item type
   * @returns {Object} Generated item
   */
  generateLootItem(tier, type) {
    const itemNames = {
      weapon: ['Sword', 'Axe', 'Spear', 'Dagger', 'Mace'],
      armor: ['Helmet', 'Chestplate', 'Greaves', 'Shield', 'Boots'],
      accessory: ['Ring', 'Amulet', 'Belt', 'Cloak', 'Bracers']
    };

    const tierPrefixes = ['Crude', 'Iron', 'Steel', 'Mithril', 'Legendary'];

    const baseName = itemNames[type][Math.floor(Math.random() * itemNames[type].length)];
    const prefix = tierPrefixes[Math.min(tier - 1, 4)];

    const item = {
      id: `${type}_${Date.now()}_${Math.random()}`,
      name: `${prefix} ${baseName}`,
      type,
      tier,
      durability: {
        current: 100 * tier,
        max: 100 * tier
      }
    };

    // Add stats based on type and tier
    if (type === 'weapon') {
      item.damage = 10 * tier;
      item.critChance = tier;
    } else if (type === 'armor') {
      item.defense = 5 * tier;
      item.healthBonus = 20 * tier;
    } else if (type === 'accessory') {
      item.critDamage = 10 * tier;
      item.dodgeChance = 2 * tier;
    }

    return item;
  }
}

export default ExpeditionRewards;
```

**Verification Checkpoint 3.5.1:**
```javascript
// src/modules/expedition/__tests__/ExpeditionRewards.test.js
import ExpeditionRewards from '../ExpeditionRewards';

describe('ExpeditionRewards', () => {
  let rewards, sharedResources, sharedInventory;

  beforeEach(() => {
    sharedResources = {
      addResource: jest.fn()
    };

    sharedInventory = {
      addEquipment: jest.fn()
    };

    rewards = new ExpeditionRewards(sharedResources, sharedInventory);
  });

  test('calculates basic rewards', () => {
    const result = rewards.calculateRewards({
      enemiesKilled: 10,
      goldEarned: 100,
      floorsCompleted: 3,
      itemsFound: [],
      difficulty: 1
    });

    expect(result.xp).toBe(200); // 10 * 20
    expect(result.gold).toBe(250); // 100 + (3 * 50)
    expect(result.resources.wood).toBe(10);
    expect(result.resources.stone).toBe(5);
  });

  test('scales rewards with difficulty', () => {
    const result = rewards.calculateRewards({
      enemiesKilled: 5,
      goldEarned: 50,
      floorsCompleted: 1,
      itemsFound: [],
      difficulty: 3
    });

    expect(result.resources.wood).toBe(30); // 10 * 3
    expect(result.resources.stone).toBe(15); // 5 * 3
  });

  test('distributes rewards to shared systems', () => {
    const rewardData = {
      resources: { gold: 100, wood: 50 },
      equipment: [
        { id: 'sword1', name: 'Iron Sword', type: 'weapon' }
      ]
    };

    const result = rewards.distributeRewards(rewardData);

    expect(result.success).toBe(true);
    expect(sharedResources.addResource).toHaveBeenCalledWith('gold', 100);
    expect(sharedResources.addResource).toHaveBeenCalledWith('wood', 50);
    expect(sharedInventory.addEquipment).toHaveBeenCalledWith(
      rewardData.equipment[0]
    );
  });

  test('generates loot items', () => {
    const weapon = rewards.generateLootItem(3, 'weapon');

    expect(weapon.type).toBe('weapon');
    expect(weapon.tier).toBe(3);
    expect(weapon.damage).toBe(30); // 10 * 3
    expect(weapon.name).toContain('Steel');
  });

  test('scales item stats with tier', () => {
    const tier1 = rewards.generateLootItem(1, 'armor');
    const tier5 = rewards.generateLootItem(5, 'armor');

    expect(tier5.defense).toBeGreaterThan(tier1.defense);
    expect(tier5.healthBonus).toBeGreaterThan(tier1.healthBonus);
  });
});
```

**Run verification:**
```bash
npm test -- ExpeditionRewards.test.js
```

**Expected:** All tests pass ✅

---

### Phase 3 Complete - Final Verification

**Checkpoint: Phase 3 Complete**

**Run all tests:**
```bash
npm test
```

**Expected:**
- ✅ All existing tests still pass
- ✅ All Phase 3 tests pass (expedition manager, dungeon generation, combat engine, game mode, rewards)
- ✅ No console errors

**Manual verification:**
1. Create test script to verify expedition flow:
   ```javascript
   // In browser console after starting game
   const partyManager = gameEngine.orchestrator.partyManager;
   const expeditionManager = gameEngine.orchestrator.expeditionManager;

   // Create party
   partyManager.createParty();
   partyManager.addToParty('npc1', 'tank');

   // Start expedition
   const result = expeditionManager.startExpedition({
     difficulty: 1,
     dungeonType: 'cave',
     maxFloor: 3
   });

   console.log('Expedition started:', result);
   ```

**If all verifications pass:** ✅ **Phase 3 is complete! Commit your work:**
```bash
git add src/modules/expedition/
git commit -m "feat: Implement Phase 3 - Expedition System

- Create ExpeditionManager for expedition lifecycle
- Implement DungeonGenerator with procedural generation
- Create CombatEngine with party vs enemy combat
- Build ExpeditionGameMode for gameplay loop
- Add ExpeditionRewards system
- Full test coverage (40+ new tests)
- Integrated with NPC party and combat systems"
```

---

**Milestone 2 Complete!** 🎉

You've now completed:
- ✅ Phase 1: Core Systems
- ✅ Phase 2: NPC Combat System
- ✅ Phase 3: Expedition System

**Next:** Continue to [Phase 4: Defense/Raid System](#phase-4-defenseraid-system-8-10-hours)

---

## Phase 4: Defense/Raid System (8-10 hours)

**Goal:** Tower defense-style settlement protection against enemy raids

**Dependencies:** Phase 2 complete (NPC combat system), Phase 3 complete (combat engine)

---

### Phase 4.1: Raid Event System (3 hours)

#### Task 4.1.1: Create RaidEventManager Class

**Location:** `src/modules/defense/RaidEventManager.js`

**Dependencies:** Phase 3.2 complete (CombatEngine exists)

**Steps:**
1. Create directory `src/modules/defense/` if it doesn't exist
2. Create `RaidEventManager.js`
3. Implement raid generation and scheduling
4. Add raid difficulty scaling

**Code Template:**
```javascript
/**
 * RaidEventManager.js - Manage raid events on settlement
 */
import EventEmitter from 'events';

class RaidEventManager extends EventEmitter {
  constructor(settlementManager, npcManager) {
    super();
    this.settlementManager = settlementManager;
    this.npcManager = npcManager;

    this.activeRaid = null;
    this.raidHistory = [];
    this.nextRaidTime = null;
    this.raidIntervalBase = 600000; // 10 minutes
  }

  /**
   * Schedule next raid event
   */
  scheduleNextRaid() {
    // Calculate next raid time based on settlement progress
    const settlementLevel = this.settlementManager.getLevel();
    const variance = Math.random() * 0.3 + 0.85; // 85-115% of base

    const interval = Math.floor(this.raidIntervalBase * variance);
    this.nextRaidTime = Date.now() + interval;

    this.emit('raid:scheduled', {
      time: this.nextRaidTime,
      interval
    });
  }

  /**
   * Check if raid should trigger
   * @returns {boolean} Should trigger
   */
  shouldTriggerRaid() {
    if (this.activeRaid) return false;
    if (!this.nextRaidTime) return false;

    return Date.now() >= this.nextRaidTime;
  }

  /**
   * Start raid event
   * @returns {Object} Result { success, raid }
   */
  startRaid() {
    if (this.activeRaid) {
      return { success: false, error: 'Raid already active' };
    }

    const difficulty = this._calculateRaidDifficulty();
    const raidType = this._selectRaidType(difficulty);

    this.activeRaid = {
      id: `raid_${Date.now()}`,
      type: raidType,
      difficulty,
      startTime: Date.now(),
      endTime: null,
      status: 'active',
      waves: this._generateWaves(raidType, difficulty),
      currentWave: 0,
      enemiesSpawned: [],
      enemiesKilled: 0,
      damageToSettlement: 0,
      defendersKilled: []
    };

    this.emit('raid:started', {
      raidId: this.activeRaid.id,
      raid: this.activeRaid
    });

    return {
      success: true,
      raid: this.activeRaid
    };
  }

  /**
   * Spawn next wave
   * @returns {Object} Wave data
   */
  spawnNextWave() {
    if (!this.activeRaid) {
      return { success: false, error: 'No active raid' };
    }

    if (this.activeRaid.currentWave >= this.activeRaid.waves.length) {
      return { success: false, error: 'No more waves' };
    }

    const wave = this.activeRaid.waves[this.activeRaid.currentWave];
    const enemies = [];

    // Spawn enemies from wave definition
    for (const enemyDef of wave.enemies) {
      const enemy = this._createEnemy(
        enemyDef.type,
        enemyDef.level,
        wave.spawnPosition
      );
      enemies.push(enemy);
      this.activeRaid.enemiesSpawned.push(enemy);
    }

    this.activeRaid.currentWave++;

    this.emit('raid:waveSpawned', {
      waveNumber: this.activeRaid.currentWave,
      enemies
    });

    return {
      success: true,
      wave,
      enemies
    };
  }

  /**
   * Complete raid (victory)
   * @returns {Object} Result
   */
  completeRaid() {
    if (!this.activeRaid) {
      return { success: false, error: 'No active raid' };
    }

    this.activeRaid.endTime = Date.now();
    this.activeRaid.status = 'victory';

    const rewards = this._calculateRewards();

    // Save to history
    this.raidHistory.push({ ...this.activeRaid, rewards });

    this.emit('raid:completed', {
      raidId: this.activeRaid.id,
      rewards
    });

    this.activeRaid = null;
    this.scheduleNextRaid();

    return {
      success: true,
      rewards
    };
  }

  /**
   * Fail raid (settlement overrun)
   * @returns {Object} Result
   */
  failRaid() {
    if (!this.activeRaid) {
      return { success: false, error: 'No active raid' };
    }

    this.activeRaid.endTime = Date.now();
    this.activeRaid.status = 'defeat';

    // Apply settlement damage penalties
    const penalties = this._calculatePenalties();

    // Save to history
    this.raidHistory.push({ ...this.activeRaid, penalties });

    this.emit('raid:failed', {
      raidId: this.activeRaid.id,
      penalties
    });

    this.activeRaid = null;
    this.scheduleNextRaid();

    return {
      success: true,
      penalties
    };
  }

  /**
   * Update raid statistics
   * @param {Object} updates - Stat updates
   */
  updateRaidStats(updates) {
    if (!this.activeRaid) return;

    Object.assign(this.activeRaid, updates);
  }

  /**
   * Get active raid
   * @returns {Object|null} Active raid
   */
  getActiveRaid() {
    return this.activeRaid;
  }

  /**
   * Calculate raid difficulty based on settlement progress
   * @private
   * @returns {number} Difficulty (1-10)
   */
  _calculateRaidDifficulty() {
    const level = this.settlementManager.getLevel();
    const population = this.npcManager.getAllNPCs().length;

    // Scale difficulty with settlement progress
    const baseDifficulty = Math.floor(level / 2) + 1;
    const populationBonus = Math.floor(population / 5);

    return Math.min(10, baseDifficulty + populationBonus);
  }

  /**
   * Select raid type based on difficulty
   * @private
   */
  _selectRaidType(difficulty) {
    const types = [
      { name: 'goblin_raid', minDiff: 1, maxDiff: 3 },
      { name: 'orc_raid', minDiff: 3, maxDiff: 6 },
      { name: 'undead_siege', minDiff: 5, maxDiff: 8 },
      { name: 'dragon_attack', minDiff: 8, maxDiff: 10 }
    ];

    const validTypes = types.filter(
      t => difficulty >= t.minDiff && difficulty <= t.maxDiff
    );

    return validTypes[Math.floor(Math.random() * validTypes.length)].name;
  }

  /**
   * Generate raid waves
   * @private
   */
  _generateWaves(raidType, difficulty) {
    const waveCount = 3 + Math.floor(difficulty / 2);
    const waves = [];

    for (let i = 0; i < waveCount; i++) {
      const enemyCount = 3 + Math.floor(i * difficulty * 0.5);
      const enemies = [];

      for (let j = 0; j < enemyCount; j++) {
        enemies.push({
          type: raidType.split('_')[0], // 'goblin', 'orc', etc.
          level: difficulty + Math.floor(i / 2)
        });
      }

      waves.push({
        number: i + 1,
        enemies,
        spawnPosition: this._getSpawnPosition(i)
      });
    }

    return waves;
  }

  /**
   * Get spawn position for wave
   * @private
   */
  _getSpawnPosition(waveIndex) {
    const positions = [
      { x: 0, y: 300 },      // West
      { x: 800, y: 300 },    // East
      { x: 400, y: 0 },      // North
      { x: 400, y: 600 }     // South
    ];

    return positions[waveIndex % positions.length];
  }

  /**
   * Create enemy instance
   * @private
   */
  _createEnemy(type, level, spawnPosition) {
    return {
      id: `enemy_${Date.now()}_${Math.random()}`,
      type,
      level,
      position: { ...spawnPosition },
      stats: {
        health: {
          current: 50 * level,
          max: 50 * level
        },
        damage: 5 * level,
        defense: 2 * level,
        speed: 2 + Math.random(),
        critChance: 0,
        critDamage: 100,
        dodgeChance: 0
      }
    };
  }

  /**
   * Calculate raid victory rewards
   * @private
   */
  _calculateRewards() {
    const difficulty = this.activeRaid.difficulty;

    return {
      gold: 100 * difficulty,
      experience: 50 * difficulty,
      reputation: 10 * difficulty
    };
  }

  /**
   * Calculate raid defeat penalties
   * @private
   */
  _calculatePenalties() {
    const damagePercent = this.activeRaid.damageToSettlement / 100;

    return {
      resourceLoss: Math.floor(damagePercent * 20), // Percent
      moraleDecrease: Math.floor(damagePercent * 10),
      buildingDamage: this.activeRaid.damageToSettlement
    };
  }
}

export default RaidEventManager;
```

**Verification Checkpoint 4.1.1:**
```javascript
// src/modules/defense/__tests__/RaidEventManager.test.js
import RaidEventManager from '../RaidEventManager';

describe('RaidEventManager', () => {
  let raidManager, settlementManager, npcManager;

  beforeEach(() => {
    settlementManager = {
      getLevel: jest.fn(() => 5)
    };

    npcManager = {
      getAllNPCs: jest.fn(() => Array(10).fill({}))
    };

    raidManager = new RaidEventManager(settlementManager, npcManager);
  });

  test('schedules next raid', () => {
    raidManager.scheduleNextRaid();

    expect(raidManager.nextRaidTime).toBeGreaterThan(Date.now());
  });

  test('starts raid event', () => {
    const result = raidManager.startRaid();

    expect(result.success).toBe(true);
    expect(result.raid).toBeDefined();
    expect(result.raid.waves.length).toBeGreaterThan(0);
  });

  test('prevents multiple simultaneous raids', () => {
    raidManager.startRaid();

    const result = raidManager.startRaid();

    expect(result.success).toBe(false);
    expect(result.error).toContain('already active');
  });

  test('spawns waves', () => {
    raidManager.startRaid();

    const result = raidManager.spawnNextWave();

    expect(result.success).toBe(true);
    expect(result.enemies.length).toBeGreaterThan(0);
    expect(raidManager.activeRaid.currentWave).toBe(1);
  });

  test('completes raid successfully', () => {
    raidManager.startRaid();

    const result = raidManager.completeRaid();

    expect(result.success).toBe(true);
    expect(result.rewards).toBeDefined();
    expect(result.rewards.gold).toBeGreaterThan(0);
    expect(raidManager.activeRaid).toBeNull();
  });

  test('fails raid and applies penalties', () => {
    raidManager.startRaid();
    raidManager.activeRaid.damageToSettlement = 50;

    const result = raidManager.failRaid();

    expect(result.success).toBe(true);
    expect(result.penalties).toBeDefined();
    expect(result.penalties.resourceLoss).toBeGreaterThan(0);
  });

  test('scales difficulty with settlement level', () => {
    settlementManager.getLevel.mockReturnValue(10);

    raidManager.startRaid();

    expect(raidManager.activeRaid.difficulty).toBeGreaterThan(5);
  });
});
```

**Run verification:**
```bash
npm test -- RaidEventManager.test.js
```

**Expected:** All tests pass ✅

---

### Phase 4.2: Defense Game Mode (3-4 hours)

#### Task 4.2.1: Create DefenseGameMode Class

**Location:** `src/modules/defense/DefenseGameMode.js`

**Dependencies:** Task 4.1.1 complete, Phase 3.2.1 complete (CombatEngine)

**Code Template:**
```javascript
/**
 * DefenseGameMode.js - Tower defense gameplay mode
 */
import EventEmitter from 'events';

class DefenseGameMode extends EventEmitter {
  constructor(raidEventManager, combatEngine, npcManager, buildingManager) {
    super();
    this.raidEventManager = raidEventManager;
    this.combatEngine = combatEngine;
    this.npcManager = npcManager;
    this.buildingManager = buildingManager;

    this.defendingNPCs = [];
    this.defensiveBuildings = [];
    this.activeCombats = [];
  }

  /**
   * Initialize defense mode
   * @returns {Object} Result
   */
  initialize() {
    const result = this.raidEventManager.startRaid();
    if (!result.success) {
      return result;
    }

    // Assign NPCs to defense
    this._assignDefenders();

    // Identify defensive buildings
    this._identifyDefensiveBuildings();

    this.emit('defense:initialized', {
      raid: result.raid,
      defenders: this.defendingNPCs,
      buildings: this.defensiveBuildings
    });

    return {
      success: true,
      raid: result.raid
    };
  }

  /**
   * Start next wave
   * @returns {Object} Result
   */
  startNextWave() {
    const result = this.raidEventManager.spawnNextWave();
    if (!result.success) {
      return result;
    }

    this.emit('defense:waveStarted', {
      wave: result.wave,
      enemies: result.enemies
    });

    return result;
  }

  /**
   * Update defense tick (called each game loop)
   * @param {number} deltaTime - Time since last update
   */
  updateDefense(deltaTime) {
    const raid = this.raidEventManager.getActiveRaid();
    if (!raid) return;

    const currentEnemies = this._getLivingEnemies();

    // Check for combat initiation
    this._checkCombatInitiation(currentEnemies);

    // Update active combats
    this._updateActiveCombats(deltaTime);

    // Check if enemies reached settlement center
    this._checkSettlementDamage(currentEnemies);

    // Check win/lose conditions
    this._checkDefenseEnd();

    this.emit('defense:updated', {
      enemies: currentEnemies.length,
      combats: this.activeCombats.length
    });
  }

  /**
   * Manually assign NPC to defense
   * @param {string} npcId - NPC ID
   * @param {Object} position - Defense position
   * @returns {Object} Result
   */
  assignDefender(npcId, position) {
    const npc = this.npcManager.getNPC(npcId);
    if (!npc || !npc.alive) {
      return { success: false, error: 'Invalid NPC' };
    }

    // Remove from any existing assignment
    this.defendingNPCs = this.defendingNPCs.filter(d => d.npcId !== npcId);

    // Add to defenders
    this.defendingNPCs.push({
      npcId,
      position,
      assignedAt: Date.now()
    });

    return { success: true };
  }

  /**
   * Get living enemies
   * @private
   */
  _getLivingEnemies() {
    const raid = this.raidEventManager.getActiveRaid();
    if (!raid) return [];

    return raid.enemiesSpawned.filter(e => e.stats.health.current > 0);
  }

  /**
   * Assign NPCs to defense automatically
   * @private
   */
  _assignDefenders() {
    const allNPCs = this.npcManager.getAllNPCs();

    // Only assign NPCs not on expedition
    const availableNPCs = allNPCs.filter(npc =>
      npc.alive && !npc.onExpedition
    );

    // Assign highest level combat NPCs
    const defenders = availableNPCs
      .sort((a, b) => (b.combatLevel || 1) - (a.combatLevel || 1))
      .slice(0, Math.min(8, availableNPCs.length)); // Max 8 defenders

    this.defendingNPCs = defenders.map((npc, index) => ({
      npcId: npc.id,
      position: this._getDefensePosition(index),
      assignedAt: Date.now()
    }));
  }

  /**
   * Get defense position for defender
   * @private
   */
  _getDefensePosition(index) {
    const positions = [
      { x: 200, y: 300 },
      { x: 600, y: 300 },
      { x: 300, y: 200 },
      { x: 500, y: 200 },
      { x: 300, y: 400 },
      { x: 500, y: 400 },
      { x: 400, y: 150 },
      { x: 400, y: 450 }
    ];

    return positions[index % positions.length];
  }

  /**
   * Identify defensive buildings
   * @private
   */
  _identifyDefensiveBuildings() {
    const buildings = this.buildingManager.getAllBuildings();

    // Filter for defensive buildings (walls, towers, etc.)
    this.defensiveBuildings = buildings.filter(b =>
      ['WALL', 'TOWER', 'GATE', 'BARRICADE'].includes(b.type)
    );
  }

  /**
   * Check for combat initiation
   * @private
   */
  _checkCombatInitiation(enemies) {
    for (const enemy of enemies) {
      // Skip if already in combat
      if (this.activeCombats.some(c => c.enemies.includes(enemy))) {
        continue;
      }

      // Find nearest defender
      const nearestDefender = this._findNearestDefender(enemy.position);

      if (nearestDefender && nearestDefender.distance < 100) {
        this._startCombat(nearestDefender.npc, [enemy]);
      }
    }
  }

  /**
   * Find nearest defender to position
   * @private
   */
  _findNearestDefender(position) {
    let nearest = null;
    let minDistance = Infinity;

    for (const defender of this.defendingNPCs) {
      const npc = this.npcManager.getNPC(defender.npcId);
      if (!npc || npc.combatStats.health.current <= 0) continue;

      const dx = defender.position.x - position.x;
      const dy = defender.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = { npc, distance };
      }
    }

    return nearest;
  }

  /**
   * Start combat between defender and enemies
   * @private
   */
  _startCombat(npc, enemies) {
    const combat = {
      id: `combat_${Date.now()}_${Math.random()}`,
      defender: npc,
      enemies,
      turn: 0,
      startTime: Date.now()
    };

    this.activeCombats.push(combat);

    this.emit('defense:combatStarted', {
      combatId: combat.id,
      defender: npc,
      enemies
    });
  }

  /**
   * Update active combats
   * @private
   */
  _updateActiveCombats(deltaTime) {
    const completedCombats = [];

    for (const combat of this.activeCombats) {
      combat.turn++;

      // Execute combat turn
      const results = this.combatEngine.executeTurn(
        [combat.defender],
        combat.enemies,
        this.npcManager.skillSystem
      );

      // Check if combat ended
      const endCheck = this.combatEngine.checkCombatEnd(
        [combat.defender],
        combat.enemies
      );

      if (endCheck.isOver) {
        if (endCheck.winner === 'party') {
          // Defender won
          this.raidEventManager.updateRaidStats({
            enemiesKilled: this.raidEventManager.activeRaid.enemiesKilled +
                          combat.enemies.length
          });
        } else {
          // Defender died
          this.raidEventManager.activeRaid.defendersKilled.push(combat.defender);
        }

        completedCombats.push(combat.id);

        this.emit('defense:combatEnded', {
          combatId: combat.id,
          winner: endCheck.winner
        });
      }
    }

    // Remove completed combats
    this.activeCombats = this.activeCombats.filter(
      c => !completedCombats.includes(c.id)
    );
  }

  /**
   * Check if enemies damaged settlement
   * @private
   */
  _checkSettlementDamage(enemies) {
    const settlementCenter = { x: 400, y: 300 };
    const damageRadius = 50;

    for (const enemy of enemies) {
      const dx = enemy.position.x - settlementCenter.x;
      const dy = enemy.position.y - settlementCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < damageRadius) {
        // Enemy reached center, apply damage
        const damage = enemy.stats.damage || 10;

        this.raidEventManager.updateRaidStats({
          damageToSettlement:
            this.raidEventManager.activeRaid.damageToSettlement + damage
        });

        // Remove enemy
        enemy.stats.health.current = 0;

        this.emit('defense:settlementDamaged', {
          damage,
          totalDamage: this.raidEventManager.activeRaid.damageToSettlement
        });
      }
    }
  }

  /**
   * Check if defense should end
   * @private
   */
  _checkDefenseEnd() {
    const raid = this.raidEventManager.getActiveRaid();
    if (!raid) return;

    const livingEnemies = this._getLivingEnemies();
    const allWavesSpawned = raid.currentWave >= raid.waves.length;

    // Victory: all waves spawned and all enemies dead
    if (allWavesSpawned && livingEnemies.length === 0) {
      this._endDefense(true);
      return;
    }

    // Defeat: all defenders dead or too much settlement damage
    const livingDefenders = this.defendingNPCs.filter(d => {
      const npc = this.npcManager.getNPC(d.npcId);
      return npc && npc.combatStats.health.current > 0;
    });

    if (livingDefenders.length === 0 || raid.damageToSettlement > 500) {
      this._endDefense(false);
    }
  }

  /**
   * End defense mode
   * @private
   */
  _endDefense(victory) {
    if (victory) {
      const result = this.raidEventManager.completeRaid();

      this.emit('defense:victory', {
        rewards: result.rewards
      });
    } else {
      const result = this.raidEventManager.failRaid();

      this.emit('defense:defeat', {
        penalties: result.penalties
      });
    }

    this.defendingNPCs = [];
    this.activeCombats = [];
  }
}

export default DefenseGameMode;
```

**Verification Checkpoint 4.2.1:**
```javascript
// src/modules/defense/__tests__/DefenseGameMode.test.js
import DefenseGameMode from '../DefenseGameMode';
import RaidEventManager from '../RaidEventManager';
import CombatEngine from '../../expedition/CombatEngine';

describe('DefenseGameMode', () => {
  let defenseMode, raidManager, npcManager, buildingManager;

  beforeEach(() => {
    const settlementManager = {
      getLevel: jest.fn(() => 5)
    };

    const npc1 = {
      id: 'npc1',
      name: 'Defender',
      alive: true,
      onExpedition: false,
      combatLevel: 5,
      combatStats: {
        damage: 20,
        health: { current: 100, max: 100 },
        defense: 5,
        critChance: 10,
        critDamage: 150,
        dodgeChance: 5,
        speed: 5
      }
    };

    npcManager = {
      npcs: new Map([['npc1', npc1]]),
      getNPC: jest.fn((id) => npcManager.npcs.get(id)),
      getAllNPCs: jest.fn(() => [npc1]),
      skillSystem: {
        getSkillBonuses: jest.fn(() => ({}))
      }
    };

    buildingManager = {
      getAllBuildings: jest.fn(() => [
        { id: 'b1', type: 'WALL' },
        { id: 'b2', type: 'TOWER' }
      ])
    };

    raidManager = new RaidEventManager(settlementManager, npcManager);
    const combatEngine = new CombatEngine();

    defenseMode = new DefenseGameMode(
      raidManager,
      combatEngine,
      npcManager,
      buildingManager
    );
  });

  test('initializes defense mode', () => {
    const result = defenseMode.initialize();

    expect(result.success).toBe(true);
    expect(result.raid).toBeDefined();
    expect(defenseMode.defendingNPCs.length).toBeGreaterThan(0);
  });

  test('assigns NPCs as defenders', () => {
    defenseMode.initialize();

    expect(defenseMode.defendingNPCs).toHaveLength(1);
    expect(defenseMode.defendingNPCs[0].npcId).toBe('npc1');
    expect(defenseMode.defendingNPCs[0].position).toBeDefined();
  });

  test('identifies defensive buildings', () => {
    defenseMode.initialize();

    expect(defenseMode.defensiveBuildings).toHaveLength(2);
    expect(defenseMode.defensiveBuildings[0].type).toBe('WALL');
  });

  test('starts next wave', () => {
    defenseMode.initialize();

    const result = defenseMode.startNextWave();

    expect(result.success).toBe(true);
    expect(result.enemies.length).toBeGreaterThan(0);
  });

  test('manually assigns defender to position', () => {
    const result = defenseMode.assignDefender('npc1', { x: 100, y: 100 });

    expect(result.success).toBe(true);
    expect(defenseMode.defendingNPCs.some(d =>
      d.npcId === 'npc1' && d.position.x === 100
    )).toBe(true);
  });
});
```

**Run verification:**
```bash
npm test -- DefenseGameMode.test.js
```

**Expected:** All tests pass ✅

---

### Phase 4.3: Defense UI Components (2-3 hours)

*Note: Full UI implementation in Phase 6. Component outlines here.*

#### Task 4.3.1: Create DefenseHUD Component

**Location:** `src/components/modes/defense/DefenseHUD.jsx`

**Code outline:**
```javascript
/**
 * DefenseHUD.jsx - Defense mode HUD
 */
import React from 'react';

function DefenseHUD({ defenseMode, raid }) {
  // Wave counter
  // Defender health bars
  // Enemy count
  // Settlement health
  // Mini-map with positions

  return (
    <div className="defense-hud">
      {/* Implementation in Phase 6 */}
    </div>
  );
}

export default DefenseHUD;
```

---

### Phase 4 Complete - Final Verification

**Checkpoint: Phase 4 Complete**

**Run all tests:**
```bash
npm test
```

**Expected:**
- ✅ All Phase 4 tests pass (raid manager, defense mode)
- ✅ Existing tests still pass
- ✅ No console errors

**Manual verification:**
1. Test raid scheduling and triggering
2. Verify defenders are assigned correctly
3. Check combat during raids

**If all verifications pass:** ✅ **Phase 4 is complete! Commit your work:**
```bash
git add src/modules/defense/
git commit -m "feat: Implement Phase 4 - Defense/Raid System

- Create RaidEventManager with wave-based raids
- Implement DefenseGameMode for tower defense gameplay
- Auto-assign NPCs as defenders
- Track settlement damage and raid outcomes
- Full test coverage (15+ new tests)"
```

---

**Milestone 3 Complete!** 🎉

You've now completed:
- ✅ Phase 1: Core Systems
- ✅ Phase 2: NPC Combat System
- ✅ Phase 3: Expedition System
- ✅ Phase 4: Defense/Raid System

**Next:** Continue to [Phase 5: Gameplay Integration](#phase-5-gameplay-integration--balance-6-8-hours)

---

## Phase 5: Gameplay Integration & Balance (6-8 hours)

**Goal:** Integrate all systems with existing game engine and balance mechanics

**Dependencies:** Phases 1-4 complete

---

### Phase 5.1: Integrate with GameEngine (2-3 hours)

#### Task 5.1.1: Update ModuleOrchestrator

**Location:** `src/core/ModuleOrchestrator.js`

**Steps:**
1. Add new managers to orchestrator
2. Wire up mode switching
3. Integrate with existing modules

**Code Changes:**
```javascript
// Add imports
import UnifiedGameState from '../shared/UnifiedGameState.js';
import ModeManager from '../shared/ModeManager.js';
import SharedResourceManager from '../shared/SharedResourceManager.js';
import SharedInventoryManager from '../shared/SharedInventoryManager.js';
import NPCSkillSystem from '../modules/combat/NPCSkillSystem.js';
import NPCEquipmentManager from '../modules/combat/NPCEquipmentManager.js';
import NPCPartyManager from '../modules/expedition/NPCPartyManager.js';
import ExpeditionManager from '../modules/expedition/ExpeditionManager.js';
import ExpeditionGameMode from '../modules/expedition/ExpeditionGameMode.js';
import DungeonGenerator from '../modules/expedition/DungeonGenerator.js';
import CombatEngine from '../modules/expedition/CombatEngine.js';
import ExpeditionRewards from '../modules/expedition/ExpeditionRewards.js';
import RaidEventManager from '../modules/defense/RaidEventManager.js';
import DefenseGameMode from '../modules/defense/DefenseGameMode.js';

// In constructor, initialize new systems
this.unifiedState = new UnifiedGameState();
this.modeManager = new ModeManager(this.unifiedState);
this.sharedResources = new SharedResourceManager(this.unifiedState);
this.sharedInventory = new SharedInventoryManager(this.unifiedState);

// Add to NPC system
this.npcManager.skillSystem = new NPCSkillSystem();
this.npcEquipment = new NPCEquipmentManager(this.sharedInventory);

// Expedition systems
this.partyManager = new NPCPartyManager(this.npcManager);
this.expeditionManager = new ExpeditionManager(this.partyManager, this.npcManager);
this.dungeonGenerator = new DungeonGenerator();
this.combatEngine = new CombatEngine();
this.expeditionRewards = new ExpeditionRewards(this.sharedResources, this.sharedInventory);
this.expeditionMode = new ExpeditionGameMode(
  this.expeditionManager,
  this.dungeonGenerator,
  this.combatEngine,
  this.npcManager,
  this.npcManager.skillSystem
);

// Defense systems
this.raidManager = new RaidEventManager(this.settlementManager, this.npcManager);
this.defenseMode = new DefenseGameMode(
  this.raidManager,
  this.combatEngine,
  this.npcManager,
  this.buildingManager
);

// Start in settlement mode
this.modeManager.switchMode('settlement');
```

**Verification:** Check that all systems initialize without errors.

---

### Phase 5.2: Balance Game Mechanics (3-4 hours)

#### Task 5.2.1: Balance Combat Stats

**Create:** `src/config/CombatBalance.js`

```javascript
/**
 * Combat balance configuration
 */
export const COMBAT_BALANCE = {
  // NPC stat scaling
  npcBaseHealth: 100,
  npcHealthPerLevel: 20,
  npcBaseDamage: 10,
  npcDamagePerLevel: 5,

  // XP scaling
  xpForLevelUp: (level) => Math.floor(100 * Math.pow(1.5, level - 1)),

  // Expedition difficulty
  expeditionDifficultyMultiplier: {
    easy: 0.7,
    normal: 1.0,
    hard: 1.5,
    nightmare: 2.0
  },

  // Raid difficulty
  raidDifficultyByLevel: (settlementLevel) => Math.min(10, Math.floor(settlementLevel / 2) + 1),

  // Production bonuses
  combatLevelBonus: 0.01,  // 1% per level
  equipmentTierBonus: 0.005, // 0.5% per tier
  veteranBonus: 0.05        // 5% flat
};
```

#### Task 5.2.2: Balance Resource Economy

**Steps:**
1. Adjust expedition reward amounts
2. Balance raid penalties
3. Tune production multipliers

---

### Phase 5.3: Mode Switching Integration (1-2 hours)

#### Task 5.3.1: Add Mode Switch UI Trigger

**Location:** `src/components/ui/ModeSelector.jsx`

```javascript
import React from 'react';

function ModeSelector({ modeManager, currentMode, onModeChange }) {
  const handleSwitch = (newMode) => {
    const result = modeManager.switchMode(newMode);
    if (result.success) {
      onModeChange(newMode);
    }
  };

  return (
    <div className="mode-selector">
      <button
        onClick={() => handleSwitch('settlement')}
        disabled={currentMode === 'settlement'}
      >
        Settlement
      </button>
      <button
        onClick={() => handleSwitch('expedition')}
        disabled={currentMode === 'expedition'}
      >
        Expedition
      </button>
      <button
        onClick={() => handleSwitch('defense')}
        disabled={currentMode === 'defense'}
      >
        Defense
      </button>
    </div>
  );
}

export default ModeSelector;
```

---

### Phase 5 Complete

**Commit:**
```bash
git add .
git commit -m "feat: Phase 5 - Gameplay Integration & Balance

- Integrate all new systems with ModuleOrchestrator
- Add combat and economy balance configuration
- Implement mode switching UI
- Wire up all managers and game modes"
```

---

## Phase 6: UI/UX Integration (5-6 hours)

**Goal:** Complete UI components for all game modes

**Dependencies:** Phases 1-5 complete

---

### Phase 6.1: Expedition UI (2 hours)

#### Complete ExpeditionPrep.jsx

**Location:** `src/components/modes/expedition/ExpeditionPrep.jsx`

```javascript
import React, { useState, useEffect } from 'react';

function ExpeditionPrep({ partyManager, npcManager, expeditionManager, onStart }) {
  const [availableNPCs, setAvailableNPCs] = useState([]);
  const [party, setParty] = useState([]);
  const [difficulty, setDifficulty] = useState(1);
  const [dungeonType, setDungeonType] = useState('cave');

  useEffect(() => {
    const npcs = npcManager.getAllNPCs().filter(npc =>
      npc.alive && !npc.onExpedition
    );
    setAvailableNPCs(npcs);

    partyManager.createParty();
  }, [npcManager, partyManager]);

  const addToParty = (npc) => {
    if (party.length >= 4) return;

    const result = partyManager.addToParty(npc.id, 'damage');
    if (result.success) {
      setParty([...party, npc]);
    }
  };

  const removeFromParty = (npc) => {
    partyManager.removeFromParty(npc.id);
    setParty(party.filter(p => p.id !== npc.id));
  };

  const startExpedition = () => {
    const result = expeditionManager.startExpedition({
      difficulty,
      dungeonType,
      maxFloor: 5
    });

    if (result.success) {
      onStart(result.expedition);
    }
  };

  return (
    <div className="expedition-prep">
      <h2>Prepare Expedition</h2>

      <div className="party-selection">
        <h3>Party ({party.length}/4)</h3>
        {party.map(npc => (
          <div key={npc.id} className="party-member">
            {npc.name} - Lv{npc.combatLevel}
            <button onClick={() => removeFromParty(npc)}>Remove</button>
          </div>
        ))}
      </div>

      <div className="available-npcs">
        <h3>Available NPCs</h3>
        {availableNPCs.filter(npc => !party.includes(npc)).map(npc => (
          <div key={npc.id} className="npc-option">
            {npc.name} - Lv{npc.combatLevel}
            <button onClick={() => addToParty(npc)}>Add</button>
          </div>
        ))}
      </div>

      <div className="expedition-settings">
        <label>
          Difficulty:
          <select value={difficulty} onChange={(e) => setDifficulty(+e.target.value)}>
            <option value={1}>Easy</option>
            <option value={2}>Normal</option>
            <option value={3}>Hard</option>
          </select>
        </label>

        <label>
          Dungeon Type:
          <select value={dungeonType} onChange={(e) => setDungeonType(e.target.value)}>
            <option value="cave">Cave</option>
            <option value="ruins">Ruins</option>
            <option value="fortress">Fortress</option>
          </select>
        </label>
      </div>

      <button
        onClick={startExpedition}
        disabled={party.length === 0}
      >
        Start Expedition
      </button>
    </div>
  );
}

export default ExpeditionPrep;
```

#### Complete ExpeditionHUD.jsx

**Location:** `src/components/modes/expedition/ExpeditionHUD.jsx`

```javascript
import React from 'react';

function ExpeditionHUD({ gameMode, combatActive }) {
  const state = gameMode.getState();

  return (
    <div className="expedition-hud">
      <div className="floor-info">
        Floor {state.floor?.floorNumber} / {state.expedition?.config.maxFloor}
      </div>

      <div className="party-status">
        {state.expedition?.party.members.map(member => {
          const npc = gameMode.npcManager.getNPC(member.npcId);
          if (!npc) return null;

          return (
            <div key={npc.id} className="party-member-hud">
              <div className="name">{npc.name}</div>
              <div className="health-bar">
                <div
                  className="health-fill"
                  style={{
                    width: `${(npc.combatStats.health.current / npc.combatStats.health.max) * 100}%`
                  }}
                />
                <span>{npc.combatStats.health.current}/{npc.combatStats.health.max}</span>
              </div>
            </div>
          );
        })}
      </div>

      {combatActive && state.combat && (
        <div className="combat-log">
          <h3>Combat - Turn {state.combat.turn}</h3>
          <div className="enemies">
            Enemies: {state.combat.enemies.filter(e => e.stats.health.current > 0).length}
          </div>
        </div>
      )}

      <div className="loot-collected">
        Items Found: {state.loot?.length || 0}
      </div>
    </div>
  );
}

export default ExpeditionHUD;
```

---

### Phase 6.2: Defense UI (2 hours)

#### Complete DefenseHUD.jsx

**Location:** `src/components/modes/defense/DefenseHUD.jsx`

```javascript
import React from 'react';

function DefenseHUD({ defenseMode, raid }) {
  if (!raid) return null;

  return (
    <div className="defense-hud">
      <div className="wave-info">
        Wave {raid.currentWave} / {raid.waves.length}
      </div>

      <div className="settlement-health">
        <div className="health-bar">
          <div
            className="health-fill"
            style={{ width: `${Math.max(0, 100 - raid.damageToSettlement / 5)}%` }}
          />
        </div>
        Damage: {raid.damageToSettlement}/500
      </div>

      <div className="defenders">
        <h3>Defenders</h3>
        {defenseMode.defendingNPCs.map(defender => {
          const npc = defenseMode.npcManager.getNPC(defender.npcId);
          if (!npc) return null;

          return (
            <div key={npc.id} className="defender-status">
              {npc.name}: {npc.combatStats.health.current}/{npc.combatStats.health.max}
            </div>
          );
        })}
      </div>

      <div className="enemies-remaining">
        Enemies: {raid.enemiesSpawned.filter(e => e.stats.health.current > 0).length}
      </div>

      <div className="stats">
        <div>Killed: {raid.enemiesKilled}</div>
        <div>Defenders Lost: {raid.defendersKilled.length}</div>
      </div>
    </div>
  );
}

export default DefenseHUD;
```

---

### Phase 6.3: NPC Management UI (1-2 hours)

#### Create NPCSkillPanel.jsx

**Location:** `src/components/ui/NPCSkillPanel.jsx`

```javascript
import React from 'react';

function NPCSkillPanel({ npc, npcManager, onSkillUpgrade }) {
  if (!npc || npc.skillPoints === 0) return null;

  const upgradeSkill = (category, skillName) => {
    const result = npcManager.upgradeNPCSkill(npc.id, category, skillName);
    if (result.success) {
      onSkillUpgrade();
    }
  };

  return (
    <div className="npc-skill-panel">
      <h3>{npc.name} - Skill Points: {npc.skillPoints}</h3>

      {Object.entries(npc.skills).map(([category, skills]) => (
        <div key={category} className="skill-category">
          <h4>{category.toUpperCase()}</h4>
          {Object.entries(skills).map(([skillName, level]) => {
            const skillDef = npcManager.skillSystem.getSkillDefinition(category, skillName);
            if (!skillDef) return null;

            return (
              <div key={skillName} className="skill">
                <span>{skillDef.name} ({level}/{skillDef.maxLevel})</span>
                <button
                  onClick={() => upgradeSkill(category, skillName)}
                  disabled={level >= skillDef.maxLevel || npc.skillPoints < skillDef.cost}
                >
                  Upgrade ({skillDef.cost} pt)
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default NPCSkillPanel;
```

---

### Phase 6 Complete

**Commit:**
```bash
git add src/components/
git commit -m "feat: Phase 6 - UI/UX Integration

- Complete expedition preparation UI
- Implement expedition and defense HUDs
- Add NPC skill management panel
- Party health bars and status displays"
```

---

## Phase 7: Persistence & Save System (3-4 hours)

**Goal:** Extend save system for hybrid game data

**Dependencies:** Phases 1-6 complete

---

### Phase 7.1: Extend BrowserSaveManager (2-3 hours)

**Location:** `src/storage/BrowserSaveManager.js`

**Steps:**
1. Add hybrid game state to save data
2. Serialize/deserialize new systems
3. Handle versioning

**Code Changes:**
```javascript
// Add to save() method
save(slotId) {
  const saveData = {
    version: '2.0.0', // Increment version
    timestamp: Date.now(),

    // Existing data
    buildings: this.buildingManager.serialize(),
    npcs: this.npcManager.serialize(),
    resources: this.storageManager.serialize(),

    // NEW: Hybrid game data
    unifiedState: this.orchestrator.unifiedState.serialize(),
    currentMode: this.orchestrator.modeManager.getCurrentMode(),
    expeditionHistory: this.orchestrator.expeditionManager.getHistory(),
    raidHistory: this.orchestrator.raidManager.raidHistory,
    sharedInventory: this.orchestrator.sharedInventory.getAllItems()
  };

  localStorage.setItem(`save_${slotId}`, JSON.stringify(saveData));
  return { success: true };
}

// Add to load() method
load(slotId) {
  const data = JSON.parse(localStorage.getItem(`save_${slotId}`));
  if (!data) return { success: false };

  // Load existing systems
  this.buildingManager.deserialize(data.buildings);
  this.npcManager.deserialize(data.npcs);
  this.storageManager.deserialize(data.resources);

  // NEW: Load hybrid game data
  if (data.version >= '2.0.0') {
    this.orchestrator.unifiedState.deserialize(data.unifiedState);
    this.orchestrator.modeManager.switchMode(data.currentMode);
    this.orchestrator.expeditionManager.expeditionHistory = data.expeditionHistory || [];
    this.orchestrator.raidManager.raidHistory = data.raidHistory || [];

    // Restore shared inventory
    if (data.sharedInventory) {
      data.sharedInventory.forEach(item => {
        this.orchestrator.sharedInventory.addEquipment(item);
      });
    }
  }

  return { success: true };
}
```

**Verification:**
1. Save game in settlement mode
2. Save game after expedition
3. Load and verify all data restored

---

### Phase 7 Complete

**Commit:**
```bash
git add src/storage/
git commit -m "feat: Phase 7 - Persistence & Save System

- Extend BrowserSaveManager for hybrid game state
- Save/load expedition and raid history
- Persist shared inventory and resources
- Version migration support"
```

---

## Phase 8: Testing & Polish (6-8 hours)

**Goal:** Comprehensive testing and bug fixes

**Dependencies:** Phases 1-7 complete

---

### Phase 8.1: Integration Testing (3-4 hours)

#### Create integration test suite

**Location:** `src/__tests__/integration/HybridGameIntegration.test.js`

```javascript
import ModuleOrchestrator from '../../core/ModuleOrchestrator';

describe('Hybrid Game Integration', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new ModuleOrchestrator();
    orchestrator.initialize();
  });

  test('full expedition flow', async () => {
    // Spawn NPCs
    const npc1 = orchestrator.npcManager.spawnNPC('worker', {x: 100, y: 100});

    // Create party
    orchestrator.partyManager.createParty();
    orchestrator.partyManager.addToParty(npc1.npcId, 'tank');

    // Start expedition
    const expedition = orchestrator.expeditionManager.startExpedition({
      difficulty: 1,
      maxFloor: 2
    });

    expect(expedition.success).toBe(true);

    // Switch to expedition mode
    const modeSwitch = orchestrator.modeManager.switchMode('expedition');
    expect(modeSwitch.success).toBe(true);

    // Complete expedition
    const completion = orchestrator.expeditionManager.completeExpedition({
      totalXP: 100,
      enemiesKilled: 5,
      goldEarned: 50,
      floorsCompleted: 2
    });

    expect(completion.success).toBe(true);

    // Verify NPC gained XP
    const npc = orchestrator.npcManager.getNPC(npc1.npcId);
    expect(npc.combatXP).toBeGreaterThan(0);
  });

  test('raid defense flow', () => {
    // Spawn defender
    const npc1 = orchestrator.npcManager.spawnNPC('worker', {x: 100, y: 100});

    // Start raid
    const raid = orchestrator.raidManager.startRaid();
    expect(raid.success).toBe(true);

    // Initialize defense
    const defense = orchestrator.defenseMode.initialize();
    expect(defense.success).toBe(true);
    expect(orchestrator.defenseMode.defendingNPCs.length).toBeGreaterThan(0);

    // Complete raid
    const completion = orchestrator.raidManager.completeRaid();
    expect(completion.success).toBe(true);
    expect(completion.rewards).toBeDefined();
  });

  test('mode switching preserves state', () => {
    // Settlement mode
    orchestrator.sharedResources.addResource('wood', 100);

    // Switch to expedition
    orchestrator.modeManager.switchMode('expedition');

    // Switch back
    orchestrator.modeManager.switchMode('settlement');

    // Verify resources preserved
    expect(orchestrator.sharedResources.getResource('wood')).toBe(100);
  });
});
```

**Run tests:**
```bash
npm test -- HybridGameIntegration.test.js
```

---

### Phase 8.2: Manual Testing Checklist (2-3 hours)

**Test each feature systematically:**

- [ ] Settlement mode works as before
- [ ] Can create NPC party (min 1, max 4 members)
- [ ] Can start expedition
- [ ] Expedition combat functions correctly
- [ ] NPCs gain XP and level up
- [ ] Skills can be upgraded
- [ ] Equipment can be equipped/unequipped
- [ ] Expedition rewards distributed correctly
- [ ] Raid events trigger
- [ ] Defense mode assigns defenders
- [ ] Raid waves spawn correctly
- [ ] Settlement damage tracked
- [ ] Raid rewards/penalties applied
- [ ] Mode switching works smoothly
- [ ] Shared resources work across modes
- [ ] Save/load preserves all data
- [ ] No console errors during gameplay
- [ ] Performance acceptable (60 FPS)

---

### Phase 8.3: Bug Fixes & Polish (1-2 hours)

**Common issues to check:**
1. NPC state corruption during mode switch
2. Combat stats not updating correctly
3. Equipment bonuses not applying
4. Save data corruption
5. UI rendering issues
6. Event listener memory leaks

---

### Phase 8 Complete - Final Verification

**Full game test:**
1. Start new game
2. Build settlement
3. Spawn 4 NPCs
4. Start expedition → Complete successfully
5. Trigger raid → Defend settlement
6. Upgrade NPC skills
7. Equip items
8. Save game
9. Load game → Verify all state restored
10. Play for 30 minutes → No errors

**If all tests pass:** ✅ **IMPLEMENTATION COMPLETE!**

**Final commit:**
```bash
git add .
git commit -m "feat: Phase 8 - Testing & Polish

- Add comprehensive integration tests
- Complete manual testing checklist
- Fix all critical bugs
- Performance optimization
- Ready for production"
```

---

## 🎉 Implementation Complete!

All 8 phases are now complete. You have successfully implemented:

✅ **Phase 1:** Core Systems (UnifiedGameState, ModeManager, SharedResources)
✅ **Phase 2:** NPC Combat System (Stats, Skills, Equipment, Parties)
✅ **Phase 3:** Expedition System (Dungeons, Combat, Rewards)
✅ **Phase 4:** Defense/Raid System (Waves, Defenders, Settlement Protection)
✅ **Phase 5:** Gameplay Integration (Balance, Mode Switching)
✅ **Phase 6:** UI/UX (Expedition Prep, HUDs, Skill Management)
✅ **Phase 7:** Persistence (Extended Save System)
✅ **Phase 8:** Testing & Polish (Integration Tests, Bug Fixes)

**Total Time Estimate:** 40-60 hours
**Total Tests Added:** 100+ tests
**Lines of Code:** ~8,000+ lines

---

## Common Pitfalls

1. **Forgot to initialize system** - Always check ModuleOrchestrator initialization
2. **State not persisting** - Verify serialize/deserialize methods
3. **Combat stats wrong** - Check skill/equipment bonuses applied correctly
4. **NPCs stuck on expedition** - Clear `onExpedition` flag on completion
5. **Memory leaks** - Remove event listeners on mode switch
6. **Save corruption** - Always increment version on schema changes

---

## Troubleshooting

### "Cannot read property of undefined"
- Check that all managers initialized before use
- Verify NPCs exist before accessing combat stats

### "Mode switch failed"
- Check current mode state saved correctly
- Verify no active raids/expeditions blocking switch

### "Tests failing"
- Clear localStorage between tests
- Mock all dependencies properly
- Check test isolation

### "Performance issues"
- Limit active combats per frame
- Batch UI updates
- Use React.memo for expensive components

---

**Document Status:** Complete ✅
**Last Updated:** 2025-11-15
**Version:** 3.0 (All Phases Complete)
