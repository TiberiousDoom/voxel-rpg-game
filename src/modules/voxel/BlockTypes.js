/**
 * BlockTypes.js - Block type definitions for the voxel system
 *
 * Defines all block types, their properties, and material requirements.
 * Blocks are the fundamental building units in the voxel world.
 *
 * Part of Phase 1: Voxel Data Architecture
 *
 * Features:
 * - Block type enumeration (stored as uint8 for memory efficiency)
 * - Block properties (solid, transparent, walkable, etc.)
 * - Material mappings (what resources are needed to craft/place blocks)
 * - Block categories for filtering and UI organization
 *
 * Usage:
 *   import { BlockType, BLOCK_PROPERTIES, getBlockProperty } from './BlockTypes';
 *   const isSolid = getBlockProperty(BlockType.STONE, 'solid'); // true
 */

/**
 * Block type enumeration
 * Values are uint8 (0-255) for memory efficiency in chunk storage
 */
export const BlockType = {
  // Air/empty (0)
  AIR: 0,

  // Natural terrain blocks (1-20)
  DIRT: 1,
  GRASS: 2,
  STONE: 3,
  SAND: 4,
  GRAVEL: 5,
  CLAY: 6,
  SNOW: 7,
  ICE: 8,
  MUD: 9,
  BEDROCK: 10,

  // Ore blocks (21-30)
  COAL_ORE: 21,
  IRON_ORE: 22,
  GOLD_ORE: 23,
  CRYSTAL_ORE: 24,
  ESSENCE_ORE: 25,

  // Wood blocks (31-40)
  WOOD_LOG: 31,
  WOOD_PLANK: 32,
  WOOD_STAIRS: 33,
  WOOD_FENCE: 34,
  WOOD_DOOR: 35,
  WOOD_TRAPDOOR: 36,

  // Stone construction blocks (41-55)
  COBBLESTONE: 41,
  STONE_BRICK: 42,
  STONE_STAIRS: 43,
  STONE_WALL: 44,
  STONE_SLAB: 45,
  CARVED_STONE: 46,
  MOSSY_COBBLESTONE: 47,

  // Building materials (56-70)
  BRICK: 56,
  THATCH: 57,
  CLAY_BRICK: 58,
  REINFORCED_WOOD: 59,
  REINFORCED_STONE: 60,

  // Functional blocks (71-90)
  TORCH: 71,
  CAMPFIRE: 72,
  WORKBENCH: 73,
  FURNACE: 74,
  CHEST: 75,
  BED: 76,
  ANVIL: 77,
  CAULDRON: 78,
  BARREL: 79,
  CRATE: 80,

  // Farm/nature blocks (91-110)
  FARMLAND: 91,
  FARMLAND_WET: 92,
  CROP_WHEAT: 93,
  CROP_CARROT: 94,
  CROP_POTATO: 95,
  WATER: 96,
  WATER_SOURCE: 97,
  LEAVES: 98,
  FLOWER: 99,
  TALL_GRASS: 100,

  // Decoration blocks (111-130)
  CARPET: 111,
  BANNER: 112,
  PAINTING: 113,
  SHELF: 114,
  TABLE: 115,
  CHAIR: 116,
  WINDOW: 117,
  GLASS: 118,

  // Stairs/ramps for Z-level navigation (131-140)
  STAIRS_UP: 131,
  STAIRS_DOWN: 132,
  RAMP_NORTH: 133,
  RAMP_SOUTH: 134,
  RAMP_EAST: 135,
  RAMP_WEST: 136,
  LADDER: 137,

  // Special/marker blocks (241-255)
  CONSTRUCTION_MARKER: 241,  // Ghost block for blueprints
  STOCKPILE_MARKER: 242,     // Stockpile zone indicator
  DESIGNATION_MARKER: 243,   // Mining/digging designation
  INVALID: 255               // Invalid/error block
};

/**
 * Block categories for organization and filtering
 */
export const BlockCategory = {
  TERRAIN: 'terrain',
  ORE: 'ore',
  WOOD: 'wood',
  STONE_CONSTRUCTION: 'stone_construction',
  BUILDING: 'building',
  FUNCTIONAL: 'functional',
  FARM: 'farm',
  DECORATION: 'decoration',
  NAVIGATION: 'navigation',
  SPECIAL: 'special'
};

/**
 * Block properties - defines behavior and characteristics of each block type
 *
 * Properties:
 * - solid: Blocks movement and building placement
 * - transparent: Light passes through (affects rendering)
 * - walkable: NPCs can walk on top (floor blocks)
 * - climbable: NPCs can traverse vertically (stairs, ladders)
 * - breakable: Can be destroyed/mined
 * - flammable: Can catch fire
 * - liquid: Flows and behaves as liquid
 * - lightLevel: Light emitted (0-15)
 * - hardness: Time to break (higher = longer)
 * - category: Block category for filtering
 * - dropItem: What resource item drops when broken
 * - requiredMaterial: Resource needed to place this block
 * - requiredAmount: Amount of resource needed (default 1)
 */
export const BLOCK_PROPERTIES = {
  [BlockType.AIR]: {
    name: 'Air',
    solid: false,
    transparent: true,
    walkable: false,
    climbable: false,
    breakable: false,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 0,
    category: BlockCategory.SPECIAL,
    dropItem: null,
    requiredMaterial: null
  },

  // Natural terrain
  [BlockType.DIRT]: {
    name: 'Dirt',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.TERRAIN,
    dropItem: 'dirt',
    requiredMaterial: 'dirt'
  },

  [BlockType.GRASS]: {
    name: 'Grass',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.TERRAIN,
    dropItem: 'dirt',
    requiredMaterial: 'dirt'
  },

  [BlockType.STONE]: {
    name: 'Stone',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 5,
    category: BlockCategory.TERRAIN,
    dropItem: 'stone',
    requiredMaterial: 'stone'
  },

  [BlockType.SAND]: {
    name: 'Sand',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.TERRAIN,
    dropItem: 'sand',
    requiredMaterial: 'sand'
  },

  [BlockType.GRAVEL]: {
    name: 'Gravel',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.TERRAIN,
    dropItem: 'gravel',
    requiredMaterial: 'gravel'
  },

  [BlockType.BEDROCK]: {
    name: 'Bedrock',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: false,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: Infinity,
    category: BlockCategory.TERRAIN,
    dropItem: null,
    requiredMaterial: null
  },

  // Ore blocks
  [BlockType.COAL_ORE]: {
    name: 'Coal Ore',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 4,
    category: BlockCategory.ORE,
    dropItem: 'coal',
    requiredMaterial: null
  },

  [BlockType.IRON_ORE]: {
    name: 'Iron Ore',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 6,
    category: BlockCategory.ORE,
    dropItem: 'iron_ore',
    requiredMaterial: null
  },

  [BlockType.GOLD_ORE]: {
    name: 'Gold Ore',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 7,
    category: BlockCategory.ORE,
    dropItem: 'gold_ore',
    requiredMaterial: null
  },

  [BlockType.CRYSTAL_ORE]: {
    name: 'Crystal Ore',
    solid: true,
    transparent: true,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 3,
    hardness: 8,
    category: BlockCategory.ORE,
    dropItem: 'crystal',
    requiredMaterial: null
  },

  [BlockType.ESSENCE_ORE]: {
    name: 'Essence Ore',
    solid: true,
    transparent: true,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 5,
    hardness: 10,
    category: BlockCategory.ORE,
    dropItem: 'essence',
    requiredMaterial: null
  },

  // Wood blocks
  [BlockType.WOOD_LOG]: {
    name: 'Wood Log',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 3,
    category: BlockCategory.WOOD,
    dropItem: 'wood',
    requiredMaterial: 'wood'
  },

  [BlockType.WOOD_PLANK]: {
    name: 'Wood Plank',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 2,
    category: BlockCategory.WOOD,
    dropItem: 'wood',
    requiredMaterial: 'wood'
  },

  [BlockType.WOOD_STAIRS]: {
    name: 'Wood Stairs',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: true,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 2,
    category: BlockCategory.WOOD,
    dropItem: 'wood',
    requiredMaterial: 'wood'
  },

  [BlockType.WOOD_FENCE]: {
    name: 'Wood Fence',
    solid: true,
    transparent: true,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 2,
    category: BlockCategory.WOOD,
    dropItem: 'wood',
    requiredMaterial: 'wood'
  },

  [BlockType.WOOD_DOOR]: {
    name: 'Wood Door',
    solid: true,
    transparent: false,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 2,
    category: BlockCategory.WOOD,
    dropItem: 'wood',
    requiredMaterial: 'wood',
    requiredAmount: 2,
    interactable: true
  },

  // Stone construction
  [BlockType.COBBLESTONE]: {
    name: 'Cobblestone',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 4,
    category: BlockCategory.STONE_CONSTRUCTION,
    dropItem: 'stone',
    requiredMaterial: 'stone'
  },

  [BlockType.STONE_BRICK]: {
    name: 'Stone Brick',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 5,
    category: BlockCategory.STONE_CONSTRUCTION,
    dropItem: 'stone',
    requiredMaterial: 'stone'
  },

  [BlockType.STONE_STAIRS]: {
    name: 'Stone Stairs',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: true,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 4,
    category: BlockCategory.STONE_CONSTRUCTION,
    dropItem: 'stone',
    requiredMaterial: 'stone'
  },

  [BlockType.STONE_WALL]: {
    name: 'Stone Wall',
    solid: true,
    transparent: true,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 5,
    category: BlockCategory.STONE_CONSTRUCTION,
    dropItem: 'stone',
    requiredMaterial: 'stone'
  },

  // Building materials
  [BlockType.BRICK]: {
    name: 'Brick',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 4,
    category: BlockCategory.BUILDING,
    dropItem: 'brick',
    requiredMaterial: 'brick'
  },

  [BlockType.THATCH]: {
    name: 'Thatch',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.BUILDING,
    dropItem: 'thatch',
    requiredMaterial: 'thatch'
  },

  // Functional blocks
  [BlockType.TORCH]: {
    name: 'Torch',
    solid: false,
    transparent: true,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 14,
    hardness: 0,
    category: BlockCategory.FUNCTIONAL,
    dropItem: 'torch',
    requiredMaterial: 'wood'
  },

  [BlockType.CAMPFIRE]: {
    name: 'Campfire',
    solid: false,
    transparent: true,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 15,
    hardness: 1,
    category: BlockCategory.FUNCTIONAL,
    dropItem: 'wood',
    requiredMaterial: 'wood',
    requiredAmount: 3
  },

  [BlockType.WORKBENCH]: {
    name: 'Workbench',
    solid: true,
    transparent: false,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 2,
    category: BlockCategory.FUNCTIONAL,
    dropItem: 'wood',
    requiredMaterial: 'wood',
    requiredAmount: 4,
    interactable: true
  },

  [BlockType.FURNACE]: {
    name: 'Furnace',
    solid: true,
    transparent: false,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 4,
    category: BlockCategory.FUNCTIONAL,
    dropItem: 'stone',
    requiredMaterial: 'stone',
    requiredAmount: 8,
    interactable: true
  },

  [BlockType.CHEST]: {
    name: 'Chest',
    solid: true,
    transparent: false,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 2,
    category: BlockCategory.FUNCTIONAL,
    dropItem: 'wood',
    requiredMaterial: 'wood',
    requiredAmount: 8,
    interactable: true,
    hasInventory: true
  },

  [BlockType.BED]: {
    name: 'Bed',
    solid: true,
    transparent: false,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.FUNCTIONAL,
    dropItem: 'wood',
    requiredMaterial: 'wood',
    requiredAmount: 3,
    interactable: true,
    multiBlock: { width: 1, depth: 2, height: 1 }
  },

  // Farm blocks
  [BlockType.FARMLAND]: {
    name: 'Farmland',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.FARM,
    dropItem: 'dirt',
    requiredMaterial: 'dirt'
  },

  [BlockType.WATER]: {
    name: 'Water',
    solid: false,
    transparent: true,
    walkable: false,
    climbable: false,
    breakable: false,
    flammable: false,
    liquid: true,
    lightLevel: 0,
    hardness: 0,
    category: BlockCategory.FARM,
    dropItem: null,
    requiredMaterial: null
  },

  [BlockType.WATER_SOURCE]: {
    name: 'Water Source',
    solid: false,
    transparent: true,
    walkable: false,
    climbable: false,
    breakable: false,
    flammable: false,
    liquid: true,
    lightLevel: 0,
    hardness: 0,
    category: BlockCategory.FARM,
    dropItem: null,
    requiredMaterial: null
  },

  // Navigation blocks
  [BlockType.STAIRS_UP]: {
    name: 'Stairs Up',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: true,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 3,
    category: BlockCategory.NAVIGATION,
    dropItem: 'stone',
    requiredMaterial: 'stone',
    requiredAmount: 2,
    connectsZLevel: 1  // Connects to Z+1
  },

  [BlockType.STAIRS_DOWN]: {
    name: 'Stairs Down',
    solid: true,
    transparent: false,
    walkable: true,
    climbable: true,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 3,
    category: BlockCategory.NAVIGATION,
    dropItem: 'stone',
    requiredMaterial: 'stone',
    requiredAmount: 2,
    connectsZLevel: -1  // Connects to Z-1
  },

  [BlockType.LADDER]: {
    name: 'Ladder',
    solid: false,
    transparent: true,
    walkable: false,
    climbable: true,
    breakable: true,
    flammable: true,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.NAVIGATION,
    dropItem: 'wood',
    requiredMaterial: 'wood',
    connectsZLevel: 1  // Bidirectional vertical movement
  },

  // Decoration
  [BlockType.GLASS]: {
    name: 'Glass',
    solid: true,
    transparent: true,
    walkable: true,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.DECORATION,
    dropItem: null,  // Glass breaks, doesn't drop
    requiredMaterial: 'sand'
  },

  [BlockType.WINDOW]: {
    name: 'Window',
    solid: true,
    transparent: true,
    walkable: false,
    climbable: false,
    breakable: true,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 1,
    category: BlockCategory.DECORATION,
    dropItem: null,
    requiredMaterial: 'glass'
  },

  // Special blocks
  [BlockType.CONSTRUCTION_MARKER]: {
    name: 'Construction Marker',
    solid: false,
    transparent: true,
    walkable: true,
    climbable: false,
    breakable: false,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 0,
    category: BlockCategory.SPECIAL,
    dropItem: null,
    requiredMaterial: null,
    isGhost: true
  },

  [BlockType.STOCKPILE_MARKER]: {
    name: 'Stockpile Marker',
    solid: false,
    transparent: true,
    walkable: true,
    climbable: false,
    breakable: false,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: 0,
    category: BlockCategory.SPECIAL,
    dropItem: null,
    requiredMaterial: null,
    isGhost: true
  },

  [BlockType.INVALID]: {
    name: 'Invalid',
    solid: true,
    transparent: false,
    walkable: false,
    climbable: false,
    breakable: false,
    flammable: false,
    liquid: false,
    lightLevel: 0,
    hardness: Infinity,
    category: BlockCategory.SPECIAL,
    dropItem: null,
    requiredMaterial: null
  }
};

/**
 * Get a property of a block type
 * @param {number} blockType - Block type ID
 * @param {string} property - Property name
 * @param {*} defaultValue - Default value if property not found
 * @returns {*} Property value
 */
export function getBlockProperty(blockType, property, defaultValue = null) {
  const props = BLOCK_PROPERTIES[blockType];
  if (!props) {
    return defaultValue;
  }
  return props[property] !== undefined ? props[property] : defaultValue;
}

/**
 * Check if a block type is solid
 * @param {number} blockType - Block type ID
 * @returns {boolean}
 */
export function isBlockSolid(blockType) {
  return getBlockProperty(blockType, 'solid', false);
}

/**
 * Check if a block type is transparent
 * @param {number} blockType - Block type ID
 * @returns {boolean}
 */
export function isBlockTransparent(blockType) {
  return getBlockProperty(blockType, 'transparent', true);
}

/**
 * Check if a block type is walkable (floor)
 * @param {number} blockType - Block type ID
 * @returns {boolean}
 */
export function isBlockWalkable(blockType) {
  return getBlockProperty(blockType, 'walkable', false);
}

/**
 * Check if a block type is climbable (stairs, ladders)
 * @param {number} blockType - Block type ID
 * @returns {boolean}
 */
export function isBlockClimbable(blockType) {
  return getBlockProperty(blockType, 'climbable', false);
}

/**
 * Get the light level emitted by a block
 * @param {number} blockType - Block type ID
 * @returns {number} Light level (0-15)
 */
export function getBlockLightLevel(blockType) {
  return getBlockProperty(blockType, 'lightLevel', 0);
}

/**
 * Get the resource required to place a block
 * @param {number} blockType - Block type ID
 * @returns {{material: string, amount: number} | null}
 */
export function getBlockRequiredMaterial(blockType) {
  const material = getBlockProperty(blockType, 'requiredMaterial', null);
  if (!material) return null;

  const amount = getBlockProperty(blockType, 'requiredAmount', 1);
  return { material, amount };
}

/**
 * Get what a block drops when broken
 * @param {number} blockType - Block type ID
 * @returns {string | null} Resource type that drops
 */
export function getBlockDropItem(blockType) {
  return getBlockProperty(blockType, 'dropItem', null);
}

/**
 * Get block name for display
 * @param {number} blockType - Block type ID
 * @returns {string}
 */
export function getBlockName(blockType) {
  return getBlockProperty(blockType, 'name', 'Unknown');
}

/**
 * Get all blocks in a category
 * @param {string} category - Category from BlockCategory
 * @returns {Array<{type: number, name: string, props: object}>}
 */
export function getBlocksByCategory(category) {
  const blocks = [];
  for (const [typeStr, props] of Object.entries(BLOCK_PROPERTIES)) {
    if (props.category === category) {
      blocks.push({
        type: parseInt(typeStr),
        name: props.name,
        props
      });
    }
  }
  return blocks;
}

/**
 * Get all buildable blocks (blocks that can be placed by players/NPCs)
 * @returns {Array<{type: number, name: string, props: object}>}
 */
export function getBuildableBlocks() {
  const blocks = [];
  for (const [typeStr, props] of Object.entries(BLOCK_PROPERTIES)) {
    if (props.requiredMaterial && !props.isGhost) {
      blocks.push({
        type: parseInt(typeStr),
        name: props.name,
        props
      });
    }
  }
  return blocks;
}

/**
 * Convert block type ID to string key
 * @param {number} blockType - Block type ID
 * @returns {string | null}
 */
export function blockTypeToString(blockType) {
  for (const [key, value] of Object.entries(BlockType)) {
    if (value === blockType) {
      return key;
    }
  }
  return null;
}

/**
 * Convert string key to block type ID
 * @param {string} key - Block type key (e.g., 'STONE')
 * @returns {number}
 */
export function stringToBlockType(key) {
  return BlockType[key] !== undefined ? BlockType[key] : BlockType.INVALID;
}
