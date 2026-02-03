/**
 * propDefinitions.js - Environmental Prop Definitions
 *
 * Defines all prop types with their properties, sprites, resources, and behavior.
 * Used by PropManager for prop creation and interaction.
 *
 * Part of Phase 3: Environmental Props & Resources
 */

/**
 * Prop type definitions
 * Each prop includes:
 * - sprite: Sprite asset name
 * - health: Hit points (durability)
 * - width/height: Grid size
 * - harvestable: Can be harvested for resources
 * - resources: What it drops when harvested
 * - blocking: Blocks movement/building
 */
export const propDefinitions = {
  // === TREES ===
  tree_oak: {
    sprite: 'tree_oak',
    health: 120,
    width: 1,
    height: 2,
    harvestable: true,
    blocking: true,
    scaleRange: [1.5, 2.0], // Trees are larger
    resources: [
      { type: 'wood', min: 5, max: 10 },
      { type: 'seed', min: 0, max: 2 }
    ]
  },

  tree_pine: {
    sprite: 'tree_pine',
    health: 100,
    width: 1,
    height: 2,
    harvestable: true,
    blocking: true,
    scaleRange: [1.5, 2.0],
    resources: [
      { type: 'wood', min: 4, max: 8 },
      { type: 'resin', min: 1, max: 3 }
    ]
  },

  tree_birch: {
    sprite: 'tree_birch',
    health: 90,
    width: 1,
    height: 2,
    harvestable: true,
    blocking: true,
    scaleRange: [1.5, 1.9],
    resources: [
      { type: 'wood', min: 4, max: 7 }
    ]
  },

  tree_dead: {
    sprite: 'tree_dead',
    health: 60,
    width: 1,
    height: 2,
    harvestable: true,
    blocking: true,
    scaleRange: [1.3, 1.8],
    resources: [
      { type: 'wood', min: 2, max: 5 }
    ]
  },

  tree_swamp: {
    sprite: 'tree_swamp',
    health: 110,
    width: 1,
    height: 2,
    harvestable: true,
    blocking: true,
    scaleRange: [1.4, 1.9],
    resources: [
      { type: 'wood', min: 3, max: 6 },
      { type: 'moss', min: 1, max: 2 }
    ]
  },

  // === ROCKS ===
  rock_small: {
    sprite: 'rock_small',
    health: 100,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.3, 0.6], // Small rocks vary in size
    resources: [
      { type: 'stone', min: 3, max: 6 }
    ]
  },

  rock_large: {
    sprite: 'rock_large',
    health: 180,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.7, 1.0], // Large rocks are bigger
    resources: [
      { type: 'stone', min: 6, max: 12 }
    ]
  },

  rock_moss: {
    sprite: 'rock_moss',
    health: 110,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.4, 0.8],
    resources: [
      { type: 'stone', min: 3, max: 7 },
      { type: 'moss', min: 1, max: 2 }
    ]
  },

  rock_ice: {
    sprite: 'rock_ice',
    health: 80,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.3, 0.7],
    resources: [
      { type: 'stone', min: 2, max: 5 },
      { type: 'ice', min: 2, max: 4 }
    ]
  },

  rock_desert: {
    sprite: 'rock_desert',
    health: 120,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.4, 0.9],
    resources: [
      { type: 'stone', min: 4, max: 8 },
      { type: 'sand', min: 2, max: 4 }
    ]
  },

  // === ORE VEINS ===
  ore_iron: {
    sprite: 'ore_iron',
    health: 200,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.5, 0.8],
    resources: [
      { type: 'iron_ore', min: 2, max: 5 },
      { type: 'stone', min: 1, max: 3 }
    ]
  },

  ore_gold: {
    sprite: 'ore_gold',
    health: 250,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.4, 0.7],
    resources: [
      { type: 'gold_ore', min: 1, max: 3 },
      { type: 'stone', min: 2, max: 4 }
    ]
  },

  ore_crystal: {
    sprite: 'ore_crystal',
    health: 300,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.4, 0.7],
    resources: [
      { type: 'crystal', min: 1, max: 2 },
      { type: 'essence', min: 1, max: 3 }
    ]
  },

  // === BUSHES & PLANTS ===
  bush: {
    sprite: 'bush',
    health: 30,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.5, 0.8],
    resources: []
  },

  bush_berry: {
    sprite: 'bush_berry',
    health: 35,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.5, 0.8],
    resources: [
      { type: 'berry', min: 2, max: 5 }
    ]
  },

  bush_dead: {
    sprite: 'bush_dead',
    health: 15,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.4, 0.7],
    resources: [
      { type: 'wood', min: 1, max: 2 }
    ]
  },

  // === HERBS ===
  herb_medicinal: {
    sprite: 'herb_medicinal',
    health: 10,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.2, 0.4],
    resources: [
      { type: 'medicinal_herb', min: 1, max: 3 }
    ]
  },

  herb_magical: {
    sprite: 'herb_magical',
    health: 12,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.2, 0.4],
    resources: [
      { type: 'magical_herb', min: 1, max: 2 },
      { type: 'essence', min: 0, max: 1 }
    ]
  },

  // === MUSHROOMS (small) ===
  mushroom_red: {
    sprite: 'mushroom_red',
    health: 8,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.15, 0.25], // Mushrooms are tiny
    resources: [
      { type: 'mushroom', min: 1, max: 2 }
    ]
  },

  mushroom_brown: {
    sprite: 'mushroom_brown',
    health: 8,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.15, 0.25],
    resources: [
      { type: 'mushroom', min: 1, max: 2 }
    ]
  },

  mushroom_poison: {
    sprite: 'mushroom_poison',
    health: 8,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.15, 0.25],
    resources: [
      { type: 'poison_mushroom', min: 1, max: 2 }
    ]
  },

  mushroom_glowing: {
    sprite: 'mushroom_glowing',
    health: 10,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.18, 0.28], // Glowing ones slightly bigger
    resources: [
      { type: 'glowing_mushroom', min: 1, max: 2 },
      { type: 'essence', min: 0, max: 1 }
    ]
  },

  // === FLOWERS ===
  flower_wildflower: {
    sprite: 'flower_wildflower',
    health: 5,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.2, 0.35],
    resources: [
      { type: 'flower', min: 1, max: 1 }
    ]
  },

  flower_daisy: {
    sprite: 'flower_daisy',
    health: 5,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.2, 0.35],
    resources: [
      { type: 'flower', min: 1, max: 1 }
    ]
  },

  // === CACTI (Desert) ===
  cactus_saguaro: {
    sprite: 'cactus_saguaro',
    health: 80,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [1.2, 1.8], // Tall cacti
    resources: [
      { type: 'cactus_flesh', min: 2, max: 5 },
      { type: 'water', min: 1, max: 2 }
    ]
  },

  cactus_barrel: {
    sprite: 'cactus_barrel',
    health: 60,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.5, 0.8], // Barrel cacti are smaller
    resources: [
      { type: 'cactus_flesh', min: 1, max: 3 },
      { type: 'water', min: 1, max: 2 }
    ]
  },

  // === WATER PLANTS ===
  reed_cattail: {
    sprite: 'reed_cattail',
    health: 15,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.6, 1.0],
    resources: [
      { type: 'reed', min: 1, max: 3 }
    ]
  },

  lily_water: {
    sprite: 'lily_water',
    health: 5,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.3, 0.5],
    resources: [
      { type: 'lily_pad', min: 1, max: 1 }
    ]
  },

  // === DECORATIVE (Non-harvestable) ===
  grass_clump: {
    sprite: 'grass_clump',
    health: 5,
    width: 1,
    height: 1,
    harvestable: false,
    blocking: false,
    scaleRange: [0.2, 0.4],
    resources: []
  },

  vine_hanging: {
    sprite: 'vine_hanging',
    health: 10,
    width: 1,
    height: 1,
    harvestable: false,
    blocking: false,
    scaleRange: [0.5, 0.9],
    resources: []
  },

  bones_skeleton: {
    sprite: 'bones_skeleton',
    health: 20,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.4, 0.7],
    resources: [
      { type: 'bone', min: 1, max: 3 }
    ]
  },

  log_fallen: {
    sprite: 'log_fallen',
    health: 40,
    width: 2,
    height: 1,
    harvestable: true,
    blocking: true,
    scaleRange: [0.8, 1.2],
    resources: [
      { type: 'wood', min: 3, max: 6 }
    ]
  },

  ice_crystal: {
    sprite: 'ice_crystal',
    health: 50,
    width: 1,
    height: 1,
    harvestable: true,
    blocking: false,
    scaleRange: [0.4, 0.7],
    resources: [
      { type: 'ice_crystal', min: 1, max: 2 },
      { type: 'essence', min: 0, max: 1 }
    ]
  }
};

/**
 * Get prop definition by ID
 */
export function getPropDefinition(propId) {
  return propDefinitions[propId] || null;
}

/**
 * Get all prop IDs
 */
export function getAllPropIds() {
  return Object.keys(propDefinitions);
}

/**
 * Get harvestable props
 */
export function getHarvestableProps() {
  return Object.entries(propDefinitions)
    .filter(([_, def]) => def.harvestable)
    .map(([id, _]) => id);
}

/**
 * Get props by type
 */
export function getPropsByType(type) {
  return Object.entries(propDefinitions)
    .filter(([id, _]) => id.startsWith(type + '_'))
    .reduce((acc, [id, def]) => {
      acc[id] = def;
      return acc;
    }, {});
}

export default propDefinitions;
