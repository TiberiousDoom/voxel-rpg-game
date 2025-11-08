/**
 * Crafting Recipes Database
 * Defines all craftable items, their requirements, and stats
 */

export const ITEM_TYPES = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  HELMET: 'helmet',
  GLOVES: 'gloves',
  BOOTS: 'boots',
  RING: 'ring',
  AMULET: 'amulet',
  OFFHAND: 'offhand',
  CONSUMABLE: 'consumable',
  MATERIAL: 'material',
};

export const RARITY = {
  COMMON: { name: 'Common', color: '#ffffff' },
  UNCOMMON: { name: 'Uncommon', color: '#00ff00' },
  RARE: { name: 'Rare', color: '#0088ff' },
  EPIC: { name: 'Epic', color: '#aa00ff' },
  LEGENDARY: { name: 'Legendary', color: '#ff8800' },
};

export const CRAFTING_RECIPES = {
  // Weapons
  ironSword: {
    id: 'ironSword',
    name: 'Iron Sword',
    type: ITEM_TYPES.WEAPON,
    rarity: RARITY.COMMON,
    description: 'A sturdy iron blade',
    requirements: {
      iron: 5,
      wood: 2,
    },
    stats: {
      damage: 5,
      critChance: 2,
    },
    icon: '⚔️',
  },
  steelSword: {
    id: 'steelSword',
    name: 'Steel Sword',
    type: ITEM_TYPES.WEAPON,
    rarity: RARITY.UNCOMMON,
    description: 'A refined steel blade with superior edge',
    requirements: {
      iron: 10,
      crystal: 2,
      wood: 3,
    },
    stats: {
      damage: 10,
      critChance: 5,
      critDamage: 10,
    },
    icon: '⚔️',
  },
  crystalSword: {
    id: 'crystalSword',
    name: 'Crystal Sword',
    type: ITEM_TYPES.WEAPON,
    rarity: RARITY.RARE,
    description: 'A magical blade infused with crystal energy',
    requirements: {
      iron: 15,
      crystal: 8,
      essence: 3,
    },
    stats: {
      damage: 20,
      critChance: 10,
      critDamage: 25,
    },
    icon: '⚔️',
  },

  // Armor
  leatherArmor: {
    id: 'leatherArmor',
    name: 'Leather Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: RARITY.COMMON,
    description: 'Light leather protection',
    requirements: {
      leather: 8,
      wood: 2,
    },
    stats: {
      defense: 5,
      maxHealth: 10,
    },
    icon: '🛡️',
  },
  ironArmor: {
    id: 'ironArmor',
    name: 'Iron Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: RARITY.UNCOMMON,
    description: 'Heavy iron plate armor',
    requirements: {
      iron: 12,
      leather: 5,
    },
    stats: {
      defense: 10,
      maxHealth: 25,
    },
    icon: '🛡️',
  },
  crystalArmor: {
    id: 'crystalArmor',
    name: 'Crystal Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: RARITY.EPIC,
    description: 'Enchanted armor with crystal reinforcement',
    requirements: {
      iron: 20,
      crystal: 10,
      essence: 5,
    },
    stats: {
      defense: 20,
      maxHealth: 50,
      maxMana: 20,
    },
    icon: '🛡️',
  },

  // Helmets
  ironHelmet: {
    id: 'ironHelmet',
    name: 'Iron Helmet',
    type: ITEM_TYPES.HELMET,
    rarity: RARITY.COMMON,
    description: 'An iron helmet for head protection',
    requirements: {
      iron: 4,
      leather: 2,
    },
    stats: {
      defense: 3,
      maxHealth: 5,
    },
    icon: '⛑️',
  },

  // Rings
  ironRing: {
    id: 'ironRing',
    name: 'Iron Ring',
    type: ITEM_TYPES.RING,
    rarity: RARITY.COMMON,
    description: 'A simple iron ring',
    requirements: {
      iron: 2,
    },
    stats: {
      damage: 2,
    },
    icon: '💍',
  },
  crystalRing: {
    id: 'crystalRing',
    name: 'Crystal Ring',
    type: ITEM_TYPES.RING,
    rarity: RARITY.RARE,
    description: 'A ring with a glowing crystal',
    requirements: {
      iron: 3,
      crystal: 5,
    },
    stats: {
      damage: 5,
      maxMana: 15,
      critChance: 3,
    },
    icon: '💍',
  },

  // Consumables
  healthPotion: {
    id: 'healthPotion',
    name: 'Health Potion',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: RARITY.COMMON,
    description: 'Restores 50 health',
    requirements: {
      essence: 1,
      wood: 1,
    },
    effect: {
      type: 'heal',
      value: 50,
    },
    icon: '🧪',
  },
  manaPotion: {
    id: 'manaPotion',
    name: 'Mana Potion',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: RARITY.COMMON,
    description: 'Restores 50 mana',
    requirements: {
      essence: 2,
      crystal: 1,
    },
    effect: {
      type: 'mana',
      value: 50,
    },
    icon: '🧪',
  },
  ragePotion: {
    id: 'ragePotion',
    name: 'Rage Potion',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: RARITY.UNCOMMON,
    description: 'Instantly fills rage meter',
    requirements: {
      essence: 3,
      crystal: 2,
    },
    effect: {
      type: 'rage',
      value: 100,
    },
    icon: '🧪',
  },
};

// Helper function to get all recipes by category
export const getRecipesByType = (type) => {
  return Object.values(CRAFTING_RECIPES).filter((recipe) => recipe.type === type);
};

// Helper function to check if player can craft an item
export const canCraft = (recipe, inventory) => {
  if (!recipe.requirements) return true;

  for (const [material, required] of Object.entries(recipe.requirements)) {
    const available = inventory.materials[material] || 0;
    if (available < required) {
      return false;
    }
  }
  return true;
};

// Helper function to consume materials for crafting
export const consumeMaterials = (recipe, inventory) => {
  const newMaterials = { ...inventory.materials };

  for (const [material, required] of Object.entries(recipe.requirements)) {
    newMaterials[material] = (newMaterials[material] || 0) - required;
  }

  return newMaterials;
};
