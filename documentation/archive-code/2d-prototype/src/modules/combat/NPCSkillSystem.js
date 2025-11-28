/**
 * NPCSkillSystem - Manages NPC skill progression and bonuses
 */

/**
 * Skill definitions for all NPC skills
 * 4 categories: Combat, Magic, Defense, Utility
 * 12 total skills
 */
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

/**
 * NPCSkillSystem - Manages skill upgrades and bonuses
 */
class NPCSkillSystem {
  constructor() {
    this.skillDefinitions = SKILL_DEFINITIONS;
  }

  /**
   * Get skill definition
   * @param {string} category - Skill category
   * @param {string} skillName - Skill name
   * @returns {Object|null} Skill definition
   */
  getSkillDefinition(category, skillName) {
    return this.skillDefinitions[category]?.[skillName] || null;
  }

  /**
   * Get all skill definitions
   * @returns {Object} All skill definitions
   */
  getAllSkills() {
    return this.skillDefinitions;
  }

  /**
   * Upgrade a skill
   * @param {Object} npc - NPC object
   * @param {string} category - Skill category
   * @param {string} skillName - Skill name
   * @returns {Object} Result { success, error, newLevel, skillPointsRemaining }
   */
  upgradeSkill(npc, category, skillName) {
    const skill = this.skillDefinitions[category]?.[skillName];
    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    // Check if NPC has the skills structure
    if (!npc.skills_combat || !npc.skills_combat[category]) {
      return { success: false, error: 'Invalid skill category' };
    }

    const currentLevel = npc.skills_combat[category][skillName];
    if (currentLevel === undefined) {
      return { success: false, error: 'Skill not found in NPC data' };
    }

    if (currentLevel >= skill.maxLevel) {
      return { success: false, error: 'Skill already max level' };
    }

    if (npc.skillPoints < skill.cost) {
      return { success: false, error: 'Not enough skill points' };
    }

    // Upgrade skill
    npc.skills_combat[category][skillName]++;
    npc.skillPoints -= skill.cost;

    // Apply skill effect
    if (skill.type === 'flat') {
      skill.apply(npc, 1); // Apply one level's worth
    }

    return {
      success: true,
      newLevel: npc.skills_combat[category][skillName],
      skillPointsRemaining: npc.skillPoints
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

    if (!npc.skills_combat) {
      return bonuses;
    }

    // Create a temporary NPC object for calculating bonuses without modifying the real NPC
    const tempNPC = {
      combatStats: { ...npc.combatStats }
    };

    for (const [category, skills] of Object.entries(npc.skills_combat)) {
      for (const [skillName, level] of Object.entries(skills)) {
        if (level === 0) continue;

        const skillDef = this.skillDefinitions[category]?.[skillName];
        if (!skillDef) continue;

        // For percentage-type skills, apply returns an object with bonus values
        if (skillDef.type === 'percentage') {
          const result = skillDef.apply(npc, level);
          Object.assign(bonuses, result);
        } else if (skillDef.type === 'flat') {
          // Some flat skills return runtime bonuses instead of modifying NPC
          // Try calling apply and check if it returns an object
          const result = skillDef.apply(tempNPC, level);
          if (result && typeof result === 'object') {
            Object.assign(bonuses, result);
          }
        }
      }
    }

    return bonuses;
  }

  /**
   * Reset all skills (refund all points)
   * @param {Object} npc - NPC object
   * @returns {number} Total skill points refunded
   */
  resetSkills(npc) {
    if (!npc.skills_combat) {
      return 0;
    }

    let refundedPoints = 0;

    for (const [category, skills] of Object.entries(npc.skills_combat)) {
      for (const [skillName, level] of Object.entries(skills)) {
        const skillDef = this.skillDefinitions[category]?.[skillName];
        if (!skillDef) continue;

        refundedPoints += level * skillDef.cost;
        npc.skills_combat[category][skillName] = 0;
      }
    }

    npc.skillPoints += refundedPoints;

    // Reset stats to base values
    this._resetStatsToBase(npc);

    return refundedPoints;
  }

  /**
   * Reapply all flat skill bonuses
   * Used after resetting or loading
   * @param {Object} npc - NPC object
   */
  reapplySkills(npc) {
    if (!npc.skills_combat) {
      return;
    }

    for (const [category, skills] of Object.entries(npc.skills_combat)) {
      for (const [skillName, level] of Object.entries(skills)) {
        if (level === 0) continue;

        const skillDef = this.skillDefinitions[category]?.[skillName];
        if (!skillDef) continue;

        if (skillDef.type === 'flat') {
          skillDef.apply(npc, level);
        }
      }
    }
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

    // Remove mana if it exists (will be re-added if mana pool skill invested)
    delete npc.combatStats.mana;
  }
}

export default NPCSkillSystem;
export { SKILL_DEFINITIONS };
