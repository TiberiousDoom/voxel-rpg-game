# Hybrid Game NPC Combat System - Technical Specification

**Last Updated:** 2025-11-15
**Author:** Claude (AI Assistant)
**Status:** Active
**Purpose:** Detailed technical specifications for NPC combat system (combat stats, skills, equipment, party management)

---

## Table of Contents

1. [Overview](#overview)
2. [NPC Combat Stats](#npc-combat-stats)
3. [NPC Skill System](#npc-skill-system)
4. [NPC Equipment System](#npc-equipment-system)
5. [NPC Party System](#npc-party-system)
6. [Settlement Production Bonuses](#settlement-production-bonuses)
7. [Testing Requirements](#testing-requirements)

---

## Overview

### Purpose

Extend the existing NPC system to support combat capabilities, allowing NPCs to participate in expeditions and provide bonuses to settlement production based on their combat prowess.

### Design Principles

1. **Non-Breaking** - Must not break existing NPC functionality
2. **Progressive** - Combat features unlock gradually
3. **Balanced** - Combat progression complements settlement progression
4. **Persistent** - All combat data persists across saves

### Architecture

```
┌──────────────────────────────────────┐
│         NPCManager (Extended)        │
│  - Existing NPC management           │
│  + Combat stats tracking             │
│  + Combat level progression          │
└────────────┬─────────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───▼──┐  ┌──▼───┐  ┌▼────────┐
│Skills│  │Equip-│  │ Party   │
│System│  │ment  │  │ Manager │
└──────┘  └──────┘  └─────────┘
```

---

## NPC Combat Stats

### Extended NPC Schema

Add to existing NPC object in `src/modules/npc-system/NPCManager.js`:

```javascript
{
  // ... existing NPC properties ...

  // NEW: Combat statistics
  combatStats: {
    health: {
      current: 100,
      max: 100
    },
    damage: 10,           // Base attack damage
    defense: 0,           // Damage reduction
    speed: 3,             // Movement speed in combat
    critChance: 5,        // Critical hit chance (%)
    critDamage: 150,      // Critical damage multiplier (%)
    dodgeChance: 5        // Dodge chance (%)
  },

  // NEW: Combat progression
  combatLevel: 1,
  combatXP: 0,
  combatXPToNext: 100,

  // NEW: Equipment slots
  equipment: {
    weapon: null,         // Weapon item
    armor: null,          // Armor item
    accessory: null       // Accessory item
  },

  // NEW: Skill points and unlocked skills
  skillPoints: 0,
  skills: {
    combat: {
      powerStrike: 0,     // Level 0-5
      criticalHit: 0,     // Level 0-5
      deadlyBlow: 0       // Level 0-3
    },
    magic: {
      manaPool: 0,        // Level 0-5
      spellPower: 0,      // Level 0-5
      fastCasting: 0      // Level 0-3
    },
    defense: {
      ironSkin: 0,        // Level 0-5
      vitality: 0,        // Level 0-5
      evasion: 0          // Level 0-5
    },
    utility: {
      swiftness: 0,       // Level 0-3
      fortune: 0,         // Level 0-5
      regeneration: 0     // Level 0-3
    }
  },

  // NEW: Combat experience
  expeditionCount: 0,     // Number of expeditions completed
  kills: 0,               // Total enemies killed
  damageDealt: 0,         // Total damage dealt
  damageTaken: 0,         // Total damage taken
  isVeteran: false        // True after 10 expeditions
}
```

### Combat Level Progression

```javascript
/**
 * Calculate XP required for next level
 * @param {number} currentLevel - Current level
 * @returns {number} XP required
 */
function calculateXPToNext(currentLevel) {
  return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
}

/**
 * Award combat XP to NPC
 * @param {string} npcId - NPC ID
 * @param {number} xp - XP to award
 */
function awardCombatXP(npcId, xp) {
  const npc = this.getNPC(npcId);
  if (!npc) return;

  npc.combatXP += xp;

  // Check for level up
  while (npc.combatXP >= npc.combatXPToNext) {
    npc.combatXP -= npc.combatXPToNext;
    npc.combatLevel++;
    npc.combatXPToNext = calculateXPToNext(npc.combatLevel);

    // Grant skill points
    npc.skillPoints += 2;

    // Increase base stats
    npc.combatStats.health.max += 20;
    npc.combatStats.health.current = npc.combatStats.health.max;
    npc.combatStats.damage += 5;
    npc.combatStats.speed += 0.1;

    // Emit level up event
    this.emit('npc:levelUp', {
      npcId,
      newLevel: npc.combatLevel,
      skillPoints: npc.skillPoints
    });
  }
}
```

---

## NPC Skill System

### Location

`src/modules/combat/NPCSkillSystem.js`

### Skill Definitions

```javascript
const SKILL_DEFINITIONS = {
  combat: {
    powerStrike: {
      name: 'Power Strike',
      maxLevel: 5,
      cost: 1,              // Skill points per level
      bonus: 5,             // 5% damage per level
      type: 'percentage',
      description: 'Increases damage by 5% per level',
      apply: (npc, level) => {
        // Applied dynamically in damage calculations
        return {
          damageMultiplier: 1 + (level * 0.05)
        };
      }
    },
    criticalHit: {
      name: 'Critical Hit',
      maxLevel: 5,
      cost: 1,
      bonus: 3,             // 3% crit chance per level
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
      bonus: 10,            // 10% crit damage per level
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
      bonus: 20,            // +20 max mana per level
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
      bonus: 10,            // 10% spell damage per level
      type: 'percentage',
      description: 'Increases spell damage by 10% per level',
      apply: (npc, level) => {
        return {
          spellDamageMultiplier: 1 + (level * 0.10)
        };
      }
    },
    fastCasting: {
      name: 'Fast Casting',
      maxLevel: 3,
      cost: 2,
      bonus: 15,            // 15% cooldown reduction per level
      type: 'percentage',
      description: 'Reduces spell cooldowns by 15% per level',
      apply: (npc, level) => {
        return {
          cooldownReduction: level * 0.15
        };
      }
    }
  },

  defense: {
    ironSkin: {
      name: 'Iron Skin',
      maxLevel: 5,
      cost: 1,
      bonus: 2,             // +2 defense per level
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
      bonus: 25,            // +25 max health per level
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
      bonus: 2,             // 2% dodge chance per level
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
      bonus: 0.2,           // +0.2 speed per level
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
      bonus: 15,            // 15% loot bonus per level
      type: 'percentage',
      description: 'Increases gold/loot drops by 15% per level',
      apply: (npc, level) => {
        return {
          lootMultiplier: 1 + (level * 0.15)
        };
      }
    },
    regeneration: {
      name: 'Regeneration',
      maxLevel: 3,
      cost: 2,
      bonus: 0.5,           // 0.5 HP/sec per level
      type: 'flat',
      description: 'Regenerate 0.5 HP per second per level',
      apply: (npc, level) => {
        return {
          healthRegen: level * 0.5
        };
      }
    }
  }
};
```

### NPCSkillSystem Class

```javascript
class NPCSkillSystem {
  constructor() {
    this.skillDefinitions = SKILL_DEFINITIONS;
  }

  /**
   * Upgrade a skill
   * @param {Object} npc - NPC object
   * @param {string} category - Skill category
   * @param {string} skillName - Skill name
   * @returns {Object} Result { success, error }
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

    return { success: true, newLevel: npc.skills[category][skillName] };
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
}

export default NPCSkillSystem;
```

---

## NPC Equipment System

### Location

`src/modules/combat/NPCEquipmentManager.js`

### Equipment Item Schema

```javascript
{
  id: string,              // Unique ID
  name: string,            // Display name
  type: string,            // 'weapon' | 'armor' | 'accessory'
  tier: number,            // 1-5 (tier restriction)

  // Stats
  damage: number,          // For weapons
  defense: number,         // For armor
  critChance: number,      // Optional
  critDamage: number,      // Optional
  dodgeChance: number,     // Optional
  healthBonus: number,     // Optional
  speedBonus: number,      // Optional

  // Metadata
  value: number,           // Gold value
  durability: {
    current: number,
    max: number
  },
  source: string,          // Where it came from
  addedAt: number          // Timestamp
}
```

### NPCEquipmentManager Class

```javascript
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
      return { success: false, error: `Item type ${item.type} doesn't match slot ${slot}` };
    }

    // Check tier restriction
    if (item.tier > npc.combatLevel) {
      return { success: false, error: `Requires combat level ${item.tier}` };
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
        // Emit broken event
        this.emit('equipment:broken', { npcId: npc.id, item });
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

---

## NPC Party System

### Location

`src/modules/expedition/NPCPartyManager.js`

### Party Schema

```javascript
{
  id: string,              // Party ID
  members: [               // Array of party members
    {
      npcId: string,
      role: string,        // 'tank' | 'damage' | 'support' | 'utility'
      position: number     // 0-3 (formation position)
    }
  ],
  leader: string,          // NPC ID of party leader
  formation: string,       // 'balanced' | 'offensive' | 'defensive'
  createdAt: number        // Timestamp
}
```

### NPCPartyManager Class

```javascript
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
}

export default NPCPartyManager;
```

---

## Settlement Production Bonuses

### Integration with ProductionTick

In `src/modules/resource-economy/ProductionTick.js`:

```javascript
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

// In executeTick function
for (const building of buildings) {
  const assignedNPCs = npcAssignments[building.id] || [];

  for (const npcId of assignedNPCs) {
    const npc = npcManager.getNPC(npcId);
    if (!npc || !npc.alive) continue;

    // Apply morale multiplier
    let productionAmount = baseProduction * moraleMultiplier;

    // NEW: Apply combat bonus
    const combatBonus = getCombatProductionBonus(npc);
    productionAmount *= combatBonus;

    // Add to production
    production[resource] = (production[resource] || 0) + productionAmount;
  }
}
```

---

## Testing Requirements

### Unit Tests

**NPC Combat Stats:**
- ✅ Test combat stat initialization
- ✅ Test XP award and level up
- ✅ Test stat increases on level up
- ✅ Test skill point award

**Skill System:**
- ✅ Test skill upgrade
- ✅ Test skill point consumption
- ✅ Test max level enforcement
- ✅ Test skill reset (refund)
- ✅ Test skill bonuses calculation

**Equipment System:**
- ✅ Test equip/unequip item
- ✅ Test stat application
- ✅ Test tier restrictions
- ✅ Test durability damage
- ✅ Test item breakage

**Party System:**
- ✅ Test party creation
- ✅ Test add/remove members
- ✅ Test party size limit
- ✅ Test party validation
- ✅ Test party stats calculation

### Integration Tests

- ✅ Test NPC gains XP after expedition
- ✅ Test skills improve combat performance
- ✅ Test equipment bonuses apply correctly
- ✅ Test party formation affects combat
- ✅ Test combat bonuses improve production
- ✅ Test veteran status after 10 expeditions

---

## References

**Related Documentation:**
- [HYBRID_GAME_INTEGRATION_PLAN.md](./HYBRID_GAME_INTEGRATION_PLAN.md)
- [HYBRID_CORE_SYSTEMS_SPEC.md](./HYBRID_CORE_SYSTEMS_SPEC.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)

**Related Code:**
- `src/modules/npc-system/NPCManager.js`
- `src/modules/resource-economy/ProductionTick.js`

---

**Document Created:** 2025-11-15
**Version:** 1.0
**Dependencies:** Core Systems Spec
