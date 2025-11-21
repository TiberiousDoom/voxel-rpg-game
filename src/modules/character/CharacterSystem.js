/**
 * CharacterSystem.js
 * Core character system with attributes and skill trees
 *
 * This module extends the game store with character progression functionality:
 * - 6 attributes: Leadership, Construction, Exploration, Combat, Magic, Endurance
 * - Attribute point allocation (5 points per level)
 * - Skill tree system (2 skill points per level)
 * - Derived stat calculations
 */

import { CombatIntegration } from '../../utils/integrations/CombatIntegration';
import { SpellIntegration } from '../../utils/integrations/SpellIntegration';

/**
 * Default character data structure
 */
export const getDefaultCharacterData = () => ({
  attributes: {
    leadership: 0,
    construction: 0,
    exploration: 0,
    combat: 0,
    magic: 0,
    endurance: 0,
  },
  attributePoints: 0,
  skills: {
    activeNodes: [],      // Array of unlocked skill node IDs
    unlockedNodes: [],    // Array of all unlocked nodes (including inactive ones for respec)
  },
  skillPoints: 0,
  totalAttributesSpent: 0,
  totalSkillsSpent: 0,
});

/**
 * Calculate total attribute points spent
 * @param {object} attributes - The character attributes
 * @returns {number} Total points spent
 */
export const calculateTotalAttributesSpent = (attributes) => {
  return Object.values(attributes).reduce((sum, value) => sum + value, 0);
};

/**
 * Calculate total skill points spent
 * @param {object} skills - The character skills
 * @returns {number} Total points spent
 */
export const calculateTotalSkillsSpent = (skills) => {
  return skills.activeNodes?.length || 0;
};

/**
 * Validate attribute allocation
 * @param {object} character - The character data
 * @param {string} attribute - The attribute to allocate
 * @returns {object} { valid: boolean, error: string }
 */
export const validateAttributeAllocation = (character, attribute) => {
  // Check if attribute exists
  const validAttributes = ['leadership', 'construction', 'exploration', 'combat', 'magic', 'endurance'];
  if (!validAttributes.includes(attribute)) {
    return { valid: false, error: `Invalid attribute: ${attribute}` };
  }

  // Check if points available
  if (character.attributePoints <= 0) {
    return { valid: false, error: 'No attribute points available' };
  }

  // Check if attribute at max (100)
  if (character.attributes[attribute] >= 100) {
    return { valid: false, error: `${attribute} is already at maximum (100)` };
  }

  return { valid: true, error: '' };
};

/**
 * Allocate attribute point
 * @param {object} character - The character data
 * @param {string} attribute - The attribute to allocate
 * @returns {object} Updated character data
 */
export const allocateAttributePoint = (character, attribute) => {
  const validation = validateAttributeAllocation(character, attribute);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    ...character,
    attributes: {
      ...character.attributes,
      [attribute]: character.attributes[attribute] + 1,
    },
    attributePoints: character.attributePoints - 1,
    totalAttributesSpent: calculateTotalAttributesSpent({
      ...character.attributes,
      [attribute]: character.attributes[attribute] + 1,
    }),
  };
};

/**
 * Deallocate attribute point (for respec)
 * @param {object} character - The character data
 * @param {string} attribute - The attribute to deallocate
 * @returns {object} Updated character data
 */
export const deallocateAttributePoint = (character, attribute) => {
  if (character.attributes[attribute] <= 0) {
    throw new Error(`Cannot deallocate ${attribute}: already at 0`);
  }

  return {
    ...character,
    attributes: {
      ...character.attributes,
      [attribute]: character.attributes[attribute] - 1,
    },
    attributePoints: character.attributePoints + 1,
    totalAttributesSpent: calculateTotalAttributesSpent({
      ...character.attributes,
      [attribute]: character.attributes[attribute] - 1,
    }),
  };
};

/**
 * Reset all attributes (respec)
 * @param {object} character - The character data
 * @returns {object} Updated character data
 */
export const resetAttributes = (character) => {
  const totalSpent = calculateTotalAttributesSpent(character.attributes);

  return {
    ...character,
    attributes: {
      leadership: 0,
      construction: 0,
      exploration: 0,
      combat: 0,
      magic: 0,
      endurance: 0,
    },
    attributePoints: character.attributePoints + totalSpent,
    totalAttributesSpent: 0,
  };
};

/**
 * Grant attribute and skill points on level up
 * @param {object} character - The character data
 * @param {number} newLevel - The new player level
 * @returns {object} Updated character data
 */
export const grantLevelUpPoints = (character, newLevel) => {
  return {
    ...character,
    attributePoints: character.attributePoints + 5, // 5 attribute points per level
    skillPoints: character.skillPoints + 2,         // 2 skill points per level
  };
};

/**
 * Calculate derived stats from character attributes
 * @param {object} character - The character data
 * @param {object} player - Current player state
 * @param {object} equipment - Current equipment
 * @returns {object} Derived stats
 */
export const calculateDerivedStats = (character, player, equipment = {}) => {
  // Combine character and player data for integration functions
  const fullCharacter = {
    ...character,
    level: player.level,
    position: player.position,
    isBlocking: player.isBlocking,
  };

  // Calculate all derived stats using integration APIs
  const stats = {
    // Combat & Endurance (from CombatIntegration)
    maxHealth: CombatIntegration.calculateMaxHealth(fullCharacter),
    healthRegen: CombatIntegration.calculateHealthRegen(fullCharacter, false),
    maxStamina: CombatIntegration.calculateMaxStamina(fullCharacter),
    staminaRegen: CombatIntegration.calculateStaminaRegen(fullCharacter),
    sprintCost: CombatIntegration.calculateSprintCost(fullCharacter),
    damage: CombatIntegration.calculateDamage(fullCharacter, equipment),
    critChance: CombatIntegration.calculateCritChance(fullCharacter),
    attackSpeed: CombatIntegration.calculateAttackSpeed(fullCharacter, equipment),
    defense: CombatIntegration.calculateDefense(fullCharacter, equipment),
    elementalResistance: CombatIntegration.calculateElementalResistance(fullCharacter),

    // Magic (from SpellIntegration)
    maxMana: SpellIntegration.calculateMaxMana(fullCharacter),
    manaRegen: SpellIntegration.calculateManaRegen(fullCharacter),
    spellPower: SpellIntegration.getSpellPower(fullCharacter),

    // Exploration
    speed: 5 + (character.attributes.exploration * 0.1), // +0.1 speed per exploration point
    gatheringSpeed: 1.0 + (character.attributes.exploration * 0.01), // +1% gathering speed
    rareFindChance: character.attributes.exploration * 0.002, // +0.2% rare find per point

    // Base stats (preserved from old system)
    critDamage: 150, // 1.5x multiplier
    dodgeChance: 5,  // Base 5%
    maxRage: 100,
  };

  return stats;
};

/**
 * Get attribute description
 * @param {string} attribute - The attribute name
 * @returns {object} Attribute info
 */
export const getAttributeInfo = (attribute) => {
  const info = {
    leadership: {
      name: 'Leadership',
      icon: '👑',
      color: '#FFD700',
      description: 'Improves NPC efficiency, settlement capacity, and recruitment',
      effects: [
        '+1% NPC work efficiency',
        '+0.5% NPC happiness',
        '+0.5 max settlement population',
        '-0.5% recruitment cost (max 40%)',
      ],
      softCap: 50,
    },
    construction: {
      name: 'Construction',
      icon: '🔨',
      color: '#8B4513',
      description: 'Reduces building costs, increases build speed and durability',
      effects: [
        '-0.5% building costs (max 50%)',
        '+1% build speed (max 3x)',
        '+2 building HP',
        '+1% storage capacity',
      ],
      softCap: 50,
    },
    exploration: {
      name: 'Exploration',
      icon: '🧭',
      color: '#4CAF50',
      description: 'Improves movement speed, gathering, and discovery',
      effects: [
        '+0.1 movement speed',
        '+1% gathering speed',
        '+0.2% rare item find chance',
        'Unlocks distant regions',
      ],
      softCap: 50,
    },
    combat: {
      name: 'Combat',
      icon: '⚔️',
      color: '#F44336',
      description: 'Increases damage, critical strike chance, and attack speed',
      effects: [
        '+1.5 base damage',
        '+0.3% critical strike chance (max 50%)',
        '+0.5% attack speed (max 3x)',
        'Unlocks combat skills',
      ],
      softCap: 50,
    },
    magic: {
      name: 'Magic',
      icon: '✨',
      color: '#9C27B0',
      description: 'Boosts spell damage, mana pool, and reduces costs',
      effects: [
        '+2% spell damage',
        '+10 max mana',
        '+0.5 mana regeneration',
        '-0.5% spell costs (max 40%)',
      ],
      softCap: 50,
    },
    endurance: {
      name: 'Endurance',
      icon: '🛡️',
      color: '#2196F3',
      description: 'Increases health, stamina, defense, and resistances',
      effects: [
        '+15 max health',
        '+0.3 health regeneration',
        '+5 max stamina',
        '+0.5 defense',
        '+0.2% elemental resistance (max 75%)',
      ],
      softCap: 50,
    },
  };

  return info[attribute] || null;
};

/**
 * Get all attribute infos
 * @returns {object} All attribute information
 */
export const getAllAttributeInfos = () => {
  return {
    leadership: getAttributeInfo('leadership'),
    construction: getAttributeInfo('construction'),
    exploration: getAttributeInfo('exploration'),
    combat: getAttributeInfo('combat'),
    magic: getAttributeInfo('magic'),
    endurance: getAttributeInfo('endurance'),
  };
};

/**
 * Character system action creators for Zustand store
 * These will be added to the game store
 */
export const createCharacterActions = (set, get) => ({
  // Allocate attribute point
  allocateAttribute: (attribute) => {
    set((state) => {
      try {
        const updatedCharacter = allocateAttributePoint(state.character, attribute);
        return { character: updatedCharacter };
      } catch (error) {
        console.error('Failed to allocate attribute:', error.message);
        return state;
      }
    });
  },

  // Deallocate attribute point (for respec UI)
  deallocateAttribute: (attribute) => {
    set((state) => {
      try {
        const updatedCharacter = deallocateAttributePoint(state.character, attribute);
        return { character: updatedCharacter };
      } catch (error) {
        console.error('Failed to deallocate attribute:', error.message);
        return state;
      }
    });
  },

  // Reset all attributes (costs resources, TODO: add cost)
  resetAllAttributes: () => {
    set((state) => {
      const updatedCharacter = resetAttributes(state.character);
      return { character: updatedCharacter };
    });
  },

  // Get current derived stats
  getDerivedStats: () => {
    const state = get();
    return calculateDerivedStats(state.character, state.player, state.equipment);
  },

  // Unlock skill node
  unlockSkillNode: (nodeId) => {
    set((state) => {
      if (state.character.skillPoints <= 0) {
        console.error('No skill points available');
        return state;
      }

      if (state.character.skills.activeNodes.includes(nodeId)) {
        console.error('Node already unlocked');
        return state;
      }

      return {
        character: {
          ...state.character,
          skills: {
            ...state.character.skills,
            activeNodes: [...state.character.skills.activeNodes, nodeId],
            unlockedNodes: [...new Set([...state.character.skills.unlockedNodes, nodeId])],
          },
          skillPoints: state.character.skillPoints - 1,
          totalSkillsSpent: state.character.skills.activeNodes.length + 1,
        },
      };
    });
  },

  // Reset skill tree (for respec)
  resetSkillTree: () => {
    set((state) => {
      const pointsToRefund = state.character.skills.activeNodes.length;

      return {
        character: {
          ...state.character,
          skills: {
            activeNodes: [],
            unlockedNodes: state.character.skills.unlockedNodes, // Keep history for respec discounts
          },
          skillPoints: state.character.skillPoints + pointsToRefund,
          totalSkillsSpent: 0,
        },
      };
    });
  },

  // Grant retroactive points (used during save migration)
  grantRetroactivePoints: (attributePoints, skillPoints) => {
    set((state) => ({
      character: {
        ...state.character,
        attributePoints: state.character.attributePoints + attributePoints,
        skillPoints: state.character.skillPoints + skillPoints,
      },
    }));
  },
});
