/**
 * Block type definitions and utilities
 */

// Block type IDs (0-255 for Uint8Array storage)
export const BlockTypes = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  SAND: 4,
  WATER: 5,
  WOOD: 6,
  LEAVES: 7,
  BEDROCK: 8,
  GRAVEL: 9,
  COAL_ORE: 10,
  IRON_ORE: 11,
  GOLD_ORE: 12,
  CLAY: 13,
  SNOW: 14,
  ICE: 15,
};

// Block properties
export const BlockProperties = {
  [BlockTypes.AIR]: {
    name: 'Air',
    solid: false,
    transparent: true,
    color: [0, 0, 0],
  },
  [BlockTypes.STONE]: {
    name: 'Stone',
    solid: true,
    transparent: false,
    color: [0.5, 0.5, 0.5],
    hardness: 1.5,
  },
  [BlockTypes.DIRT]: {
    name: 'Dirt',
    solid: true,
    transparent: false,
    color: [0.545, 0.271, 0.075],
    hardness: 0.5,
  },
  [BlockTypes.GRASS]: {
    name: 'Grass',
    solid: true,
    transparent: false,
    color: [0.133, 0.545, 0.133],
    hardness: 0.6,
  },
  [BlockTypes.SAND]: {
    name: 'Sand',
    solid: true,
    transparent: false,
    color: [0.76, 0.7, 0.5],
    hardness: 0.5,
  },
  [BlockTypes.WATER]: {
    name: 'Water',
    solid: false,
    transparent: true,
    color: [0.2, 0.4, 0.8],
  },
  [BlockTypes.WOOD]: {
    name: 'Wood',
    solid: true,
    transparent: false,
    color: [0.545, 0.353, 0.169],
    hardness: 2.0,
  },
  [BlockTypes.LEAVES]: {
    name: 'Leaves',
    solid: true,
    transparent: true,
    color: [0.2, 0.6, 0.2],
    hardness: 0.2,
  },
  [BlockTypes.BEDROCK]: {
    name: 'Bedrock',
    solid: true,
    transparent: false,
    color: [0.2, 0.2, 0.2],
    hardness: Infinity,
  },
  [BlockTypes.GRAVEL]: {
    name: 'Gravel',
    solid: true,
    transparent: false,
    color: [0.5, 0.5, 0.55],
    hardness: 0.6,
  },
  [BlockTypes.COAL_ORE]: {
    name: 'Coal Ore',
    solid: true,
    transparent: false,
    color: [0.3, 0.3, 0.3],
    hardness: 3.0,
  },
  [BlockTypes.IRON_ORE]: {
    name: 'Iron Ore',
    solid: true,
    transparent: false,
    color: [0.6, 0.5, 0.45],
    hardness: 3.0,
  },
  [BlockTypes.GOLD_ORE]: {
    name: 'Gold Ore',
    solid: true,
    transparent: false,
    color: [0.8, 0.7, 0.2],
    hardness: 3.0,
  },
  [BlockTypes.CLAY]: {
    name: 'Clay',
    solid: true,
    transparent: false,
    color: [0.6, 0.6, 0.65],
    hardness: 0.6,
  },
  [BlockTypes.SNOW]: {
    name: 'Snow',
    solid: true,
    transparent: false,
    color: [0.95, 0.95, 0.98],
    hardness: 0.2,
  },
  [BlockTypes.ICE]: {
    name: 'Ice',
    solid: true,
    transparent: true,
    color: [0.7, 0.85, 0.95],
    hardness: 0.5,
  },
};

/**
 * Check if a block type is solid (blocks movement/light)
 */
export function isSolid(blockType) {
  const props = BlockProperties[blockType];
  return props ? props.solid : false;
}

/**
 * Check if a block type is transparent
 */
export function isTransparent(blockType) {
  const props = BlockProperties[blockType];
  return props ? props.transparent : true;
}

/**
 * Get block color as RGB array [0-1]
 */
export function getBlockColor(blockType) {
  const props = BlockProperties[blockType];
  return props ? props.color : [1, 0, 1]; // Magenta for unknown
}

/**
 * Get block hardness (time to break with bare hands)
 */
export function getBlockHardness(blockType) {
  const props = BlockProperties[blockType];
  return props?.hardness ?? 1.0;
}
