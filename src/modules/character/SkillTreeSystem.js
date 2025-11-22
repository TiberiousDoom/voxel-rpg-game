/**
 * SkillTreeSystem.js
 * Manages skill tree allocation, validation, and effect calculation
 *
 * Features:
 * - Load skill tree definitions from JSON
 * - Validate skill allocations (prerequisites, tier requirements, points)
 * - Calculate total passive effects from allocated skills
 * - Track active skill unlocks
 * - Handle skill respec
 */

import settlementTreeData from '../../data/skillTrees/settlementTree.json';

/**
 * SkillTreeSystem - Main skill tree manager
 */
export class SkillTreeSystem {
  constructor() {
    this.trees = {
      settlement: settlementTreeData,
      // Future: explorer, combat trees
    };
  }

  /**
   * Get skill tree data
   * @param {string} treeId - Tree identifier
   * @returns {object} Tree data
   */
  getTree(treeId) {
    return this.trees[treeId];
  }

  /**
   * Get all available trees
   * @returns {object} All trees
   */
  getAllTrees() {
    return this.trees;
  }

  /**
   * Find a skill by ID in a tree
   * @param {string} treeId - Tree identifier
   * @param {string} skillId - Skill identifier
   * @returns {object|null} Skill data or null
   */
  findSkill(treeId, skillId) {
    const tree = this.getTree(treeId);
    if (!tree) return null;

    for (const tier of tree.tiers) {
      const skill = tier.skills.find(s => s.id === skillId);
      if (skill) {
        return { ...skill, tier: tier.tier };
      }
    }

    return null;
  }

  /**
   * Check if player can allocate a skill
   * @param {object} character - Character data
   * @param {string} treeId - Tree identifier
   * @param {string} skillId - Skill identifier
   * @returns {object} { canAllocate: boolean, reason: string }
   */
  canAllocateSkill(character, treeId, skillId) {
    const skill = this.findSkill(treeId, skillId);
    if (!skill) {
      return { canAllocate: false, reason: 'Skill not found' };
    }

    // Check if skill already maxed
    const currentPoints = this.getSkillPoints(character, treeId, skillId);
    if (currentPoints >= skill.maxPoints) {
      return { canAllocate: false, reason: 'Skill already maxed' };
    }

    // Check if player has enough skill points
    if (character.skillPoints < skill.pointCost) {
      return { canAllocate: false, reason: `Need ${skill.pointCost} skill points` };
    }

    // Check level requirement
    const tree = this.getTree(treeId);
    const tierData = tree.tiers.find(t => t.tier === skill.tier);
    if (character.level < tierData.levelRequirement) {
      return {
        canAllocate: false,
        reason: `Requires level ${tierData.levelRequirement}`
      };
    }

    // Check points in tree requirement
    const pointsInTree = this.getTotalPointsInTree(character, treeId);
    if (pointsInTree < tierData.minPointsInTree) {
      return {
        canAllocate: false,
        reason: `Requires ${tierData.minPointsInTree} points in ${tree.name}`
      };
    }

    // Check prerequisites
    if (skill.prerequisites && skill.prerequisites.length > 0) {
      for (const prereqId of skill.prerequisites) {
        const prereqPoints = this.getSkillPoints(character, treeId, prereqId);
        const prereqSkill = this.findSkill(treeId, prereqId);
        if (!prereqSkill || prereqPoints < prereqSkill.maxPoints) {
          return {
            canAllocate: false,
            reason: `Requires ${prereqSkill?.name || prereqId} (max points)`
          };
        }
      }
    }

    // Check mutually exclusive skills (capstones)
    if (skill.mutuallyExclusiveWith) {
      for (const exclusiveId of skill.mutuallyExclusiveWith) {
        const exclusivePoints = this.getSkillPoints(character, treeId, exclusiveId);
        if (exclusivePoints > 0) {
          const exclusiveSkill = this.findSkill(treeId, exclusiveId);
          return {
            canAllocate: false,
            reason: `Cannot choose with ${exclusiveSkill?.name || exclusiveId}`
          };
        }
      }
    }

    return { canAllocate: true };
  }

  /**
   * Allocate a skill point
   * @param {object} character - Character data (will be mutated)
   * @param {string} treeId - Tree identifier
   * @param {string} skillId - Skill identifier
   * @returns {object} { success: boolean, message: string }
   */
  allocateSkill(character, treeId, skillId) {
    const validation = this.canAllocateSkill(character, treeId, skillId);
    if (!validation.canAllocate) {
      return { success: false, message: validation.reason };
    }

    const skill = this.findSkill(treeId, skillId);
    if (!skill) {
      return { success: false, message: 'Skill not found' };
    }

    // Initialize skills structure if needed
    if (!character.skills) {
      character.skills = {};
    }
    if (!character.skills[treeId]) {
      character.skills[treeId] = {};
    }

    // Allocate point
    const currentPoints = character.skills[treeId][skillId] || 0;
    character.skills[treeId][skillId] = currentPoints + 1;
    character.skillPoints -= skill.pointCost;

    return {
      success: true,
      message: `Allocated 1 point to ${skill.name}`,
      newPoints: character.skills[treeId][skillId]
    };
  }

  /**
   * Deallocate a skill point (for respec)
   * @param {object} character - Character data (will be mutated)
   * @param {string} treeId - Tree identifier
   * @param {string} skillId - Skill identifier
   * @returns {object} { success: boolean, message: string }
   */
  deallocateSkill(character, treeId, skillId) {
    const currentPoints = this.getSkillPoints(character, treeId, skillId);
    if (currentPoints === 0) {
      return { success: false, message: 'Skill has no points allocated' };
    }

    const skill = this.findSkill(treeId, skillId);
    if (!skill) {
      return { success: false, message: 'Skill not found' };
    }

    // Check if other skills depend on this (prerequisites)
    const dependentSkills = this.getDependentSkills(character, treeId, skillId);
    if (dependentSkills.length > 0 && currentPoints === 1) {
      return {
        success: false,
        message: `Other skills depend on this: ${dependentSkills.join(', ')}`
      };
    }

    // Deallocate point
    character.skills[treeId][skillId] = currentPoints - 1;
    character.skillPoints += skill.pointCost;

    // Clean up if 0 points
    if (character.skills[treeId][skillId] === 0) {
      delete character.skills[treeId][skillId];
    }

    return {
      success: true,
      message: `Removed 1 point from ${skill.name}`,
      newPoints: character.skills[treeId][skillId] || 0
    };
  }

  /**
   * Get current points allocated to a skill
   * @param {object} character - Character data
   * @param {string} treeId - Tree identifier
   * @param {string} skillId - Skill identifier
   * @returns {number} Points allocated
   */
  getSkillPoints(character, treeId, skillId) {
    if (!character.skills || !character.skills[treeId]) {
      return 0;
    }
    return character.skills[treeId][skillId] || 0;
  }

  /**
   * Get total points allocated in a tree
   * @param {object} character - Character data
   * @param {string} treeId - Tree identifier
   * @returns {number} Total points in tree
   */
  getTotalPointsInTree(character, treeId) {
    if (!character.skills || !character.skills[treeId]) {
      return 0;
    }

    let total = 0;
    const treeSkills = character.skills[treeId];
    for (const skillId in treeSkills) {
      const points = treeSkills[skillId];
      const skill = this.findSkill(treeId, skillId);
      if (skill) {
        // Each point costs skill.pointCost worth
        total += points;
      }
    }

    return total;
  }

  /**
   * Get skills that depend on this skill (have it as prerequisite)
   * @param {object} character - Character data
   * @param {string} treeId - Tree identifier
   * @param {string} skillId - Skill identifier
   * @returns {string[]} Array of dependent skill names
   */
  getDependentSkills(character, treeId, skillId) {
    const tree = this.getTree(treeId);
    if (!tree) return [];

    const dependent = [];

    for (const tier of tree.tiers) {
      for (const skill of tier.skills) {
        // Check if this skill has points AND depends on skillId
        if (skill.prerequisites && skill.prerequisites.includes(skillId)) {
          const points = this.getSkillPoints(character, treeId, skill.id);
          if (points > 0) {
            dependent.push(skill.name);
          }
        }
      }
    }

    return dependent;
  }

  /**
   * Calculate total passive effects from all allocated skills
   * @param {object} character - Character data
   * @returns {object} Aggregated effects
   */
  calculatePassiveEffects(character) {
    const effects = {
      // Building effects
      buildingSpeed: 0,
      buildingCostReduction: 0,
      buildingNPCSlots: 0,
      buildingEfficiency: 0,
      buildingXPBonus: 0,

      // NPC effects
      npcEfficiency: 0,
      npcHappiness: 0,
      npcLevelSpeed: 0,
      maxNPCBonus: 0,
      npcImmortalFromHunger: false,

      // Resource effects
      gatheringSpeed: 0,
      rareResourceChance: 0,
      resourceProduction: 0,
      infiniteResources: false,

      // Economy effects
      goldGain: 0,
      sellValueBonus: 0,
      passiveIncomeRate: 0,
      passiveIncomeMultiplier: 1.0,

      // XP effects
      xpGain: 0,
      explorationXP: 0,

      // Settlement effects
      settlementStatsMultiplier: 1.0,

      // Stats per building
      allStatsPerBuilding: 0,
      maxBuildingsForBonus: 0,

      // Unlocks
      rapidPlacement: false,
      researchBonus: false,
      unlockTier3Buildings: false,
      unlockMerchantTrades: false,
      unlockAllResearch: false,
      unlockCityBuildings: false,
      unlockSageResearch: false,
      buildingsHaveUniqueBonus: false,

      // Settlements
      maxSettlements: 1,
      sharedResources: false
    };

    if (!character.skills) {
      return effects;
    }

    // Process each tree
    for (const treeId in character.skills) {
      const treeSkills = character.skills[treeId];

      for (const skillId in treeSkills) {
        const points = treeSkills[skillId];
        if (points === 0) continue;

        const skill = this.findSkill(treeId, skillId);
        if (!skill || skill.type === 'active') continue; // Skip active skills

        // Aggregate effects
        if (skill.effects) {
          for (const effectKey in skill.effects) {
            const effectValue = skill.effects[effectKey];

            // Handle boolean effects
            if (typeof effectValue === 'boolean') {
              effects[effectKey] = effectValue;
            }
            // Handle numeric effects (additive)
            else if (typeof effectValue === 'number') {
              if (!effects[effectKey]) effects[effectKey] = 0;
              effects[effectKey] += effectValue * points;
            }
          }
        }
      }
    }

    return effects;
  }

  /**
   * Get all active skills that are unlocked
   * @param {object} character - Character data
   * @returns {array} Array of active skill data with activation info
   */
  getActiveSkills(character) {
    const activeSkills = [];

    if (!character.skills) {
      return activeSkills;
    }

    for (const treeId in character.skills) {
      const treeSkills = character.skills[treeId];

      for (const skillId in treeSkills) {
        const points = treeSkills[skillId];
        if (points === 0) continue;

        const skill = this.findSkill(treeId, skillId);
        if (!skill || skill.type !== 'active') continue;

        activeSkills.push({
          id: skill.id,
          treeId,
          name: skill.name,
          description: skill.description,
          icon: skill.icon,
          activation: skill.activation,
          points
        });
      }
    }

    return activeSkills;
  }

  /**
   * Respec all skills in a tree
   * @param {object} character - Character data (will be mutated)
   * @param {string} treeId - Tree identifier
   * @returns {object} { success: boolean, pointsRefunded: number }
   */
  respecTree(character, treeId) {
    if (!character.skills || !character.skills[treeId]) {
      return { success: true, pointsRefunded: 0 };
    }

    let pointsRefunded = 0;
    const treeSkills = { ...character.skills[treeId] };

    for (const skillId in treeSkills) {
      const points = treeSkills[skillId];
      const skill = this.findSkill(treeId, skillId);
      if (skill) {
        pointsRefunded += skill.pointCost * points;
      }
    }

    // Clear all skills in tree
    character.skills[treeId] = {};
    character.skillPoints += pointsRefunded;

    return { success: true, pointsRefunded };
  }

  /**
   * Respec all skills
   * @param {object} character - Character data (will be mutated)
   * @returns {object} { success: boolean, pointsRefunded: number }
   */
  respecAll(character) {
    if (!character.skills) {
      return { success: true, pointsRefunded: 0 };
    }

    let totalPointsRefunded = 0;

    for (const treeId in character.skills) {
      const result = this.respecTree(character, treeId);
      totalPointsRefunded += result.pointsRefunded;
    }

    return { success: true, pointsRefunded: totalPointsRefunded };
  }
}

// Singleton instance
const skillTreeSystem = new SkillTreeSystem();

export default skillTreeSystem;
