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
  TOOL: 'tool', // Harvesting tools
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

  // === HARVESTING TOOLS ===
  // Tools improve harvesting speed and yield from environmental props

  stoneAxe: {
    id: 'stoneAxe',
    name: 'Stone Axe',
    type: ITEM_TYPES.TOOL,
    rarity: RARITY.COMMON,
    description: 'A crude stone axe for chopping wood',
    requirements: {
      wood: 3,
      stone: 5,
    },
    stats: {
      harvestSpeed: 1.2, // 20% faster harvesting
      woodYield: 1.1, // 10% more wood
    },
    craftingBonus: 5, // Bonus to crafting quality when equipped
    icon: '🪓',
  },

  stonePickaxe: {
    id: 'stonePickaxe',
    name: 'Stone Pickaxe',
    type: ITEM_TYPES.TOOL,
    rarity: RARITY.COMMON,
    description: 'A stone pickaxe for mining rocks and ore',
    requirements: {
      wood: 3,
      stone: 5,
    },
    stats: {
      harvestSpeed: 1.2,
      stoneYield: 1.1,
      oreYield: 1.1,
      toolTier: 2,
    },
    craftingBonus: 5,
    icon: '⛏️',
  },

  ironAxe: {
    id: 'ironAxe',
    name: 'Iron Axe',
    type: ITEM_TYPES.TOOL,
    rarity: RARITY.UNCOMMON,
    description: 'A sturdy iron axe for efficient logging',
    requirements: {
      iron: 4,
      wood: 2,
      stone: 1,
    },
    stats: {
      harvestSpeed: 1.5,
      woodYield: 1.3,
    },
    craftingBonus: 10,
    icon: '🪓',
  },

  ironPickaxe: {
    id: 'ironPickaxe',
    name: 'Iron Pickaxe',
    type: ITEM_TYPES.TOOL,
    rarity: RARITY.UNCOMMON,
    description: 'An iron pickaxe for productive mining',
    requirements: {
      iron: 4,
      wood: 2,
      stone: 1,
    },
    stats: {
      harvestSpeed: 1.5,
      stoneYield: 1.3,
      oreYield: 1.3,
      toolTier: 3,
    },
    craftingBonus: 10,
    icon: '⛏️',
  },

  steelAxe: {
    id: 'steelAxe',
    name: 'Steel Axe',
    type: ITEM_TYPES.TOOL,
    rarity: RARITY.RARE,
    description: 'A masterwork steel axe for expert foresters',
    requirements: {
      iron: 8,
      wood: 3,
      crystal: 2,
    },
    stats: {
      harvestSpeed: 2.0,
      woodYield: 1.5,
    },
    craftingBonus: 20,
    icon: '🪓',
  },

  steelPickaxe: {
    id: 'steelPickaxe',
    name: 'Steel Pickaxe',
    type: ITEM_TYPES.TOOL,
    rarity: RARITY.RARE,
    description: 'A superior steel pickaxe for master miners',
    requirements: {
      iron: 8,
      wood: 3,
      crystal: 2,
    },
    stats: {
      harvestSpeed: 2.0,
      stoneYield: 1.5,
      oreYield: 1.5,
      toolTier: 4,
    },
    craftingBonus: 20,
    icon: '⛏️',
  },

  // === BASIC WEAPONS ===

  woodenClub: {
    id: 'woodenClub',
    name: 'Wooden Club',
    type: ITEM_TYPES.WEAPON,
    rarity: RARITY.COMMON,
    description: 'A simple wooden club',
    requirements: {
      wood: 5,
    },
    stats: {
      damage: 3,
      critChance: 1,
    },
    icon: '🏏',
  },

  stoneSword: {
    id: 'stoneSword',
    name: 'Stone Sword',
    type: ITEM_TYPES.WEAPON,
    rarity: RARITY.COMMON,
    description: 'A crude blade made from sharpened stone',
    requirements: {
      wood: 2,
      stone: 6,
    },
    stats: {
      damage: 4,
      critChance: 2,
    },
    icon: '⚔️',
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

  // === HERBAL CONSUMABLES ===
  // Made from harvested herbs, berries, and mushrooms

  herbalSalve: {
    id: 'herbalSalve',
    name: 'Herbal Salve',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: RARITY.COMMON,
    description: 'A healing salve made from herbs',
    requirements: {
      herb: 3,
      fiber: 1,
    },
    effect: {
      type: 'heal',
      value: 30,
    },
    icon: '🌿',
  },

  berryJam: {
    id: 'berryJam',
    name: 'Berry Jam',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: RARITY.COMMON,
    description: 'Sweet jam that restores 15 hunger',
    requirements: {
      berry: 3,
    },
    effect: {
      type: 'food',
      value: 15,
    },
    icon: '🫐',
  },

  cookedMeat: {
    id: 'cookedMeat',
    name: 'Cooked Meat',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: RARITY.COMMON,
    description: 'Well-cooked meat that restores 35 hunger',
    requirements: {
      meat: 2,
      wood: 1,
    },
    effect: {
      type: 'food',
      value: 35,
    },
    icon: '🍖',
  },

  mushroomStew: {
    id: 'mushroomStew',
    name: 'Mushroom Stew',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: RARITY.COMMON,
    description: 'A nourishing stew that restores 30 hunger',
    requirements: {
      mushroom: 4,
      herb: 1,
      wood: 1,
    },
    effect: {
      type: 'food',
      value: 30,
    },
    icon: '🍄',
  },

  crystalElixir: {
    id: 'crystalElixir',
    name: 'Crystal Elixir',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: RARITY.RARE,
    description: 'A powerful elixir that boosts all stats',
    requirements: {
      crystal: 3,
      herb: 5,
      berry: 3,
    },
    effect: {
      type: 'allStatsBoost',
      value: 10,
      duration: 600, // 10 minutes
    },
    icon: '✨',
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
