/**
 * buildings.js — Building type definitions for the construction system (Phase 2.4).
 *
 * Each building is defined by a layer-based voxel blueprint:
 *   - Layers are bottom-to-top (Y axis)
 *   - Each layer string: rows separated by '|', chars = columns (X axis)
 *   - Block char mapping: W=WOOD, S=STONE, I=IRON_ORE, .=AIR
 */

import { BlockTypes } from '../systems/chunks/blockTypes';

const BLOCK_CHAR_MAP = {
  'W': BlockTypes.WOOD,
  'S': BlockTypes.STONE,
  'I': BlockTypes.IRON_ORE,
  '.': BlockTypes.AIR,
};

export const BUILDINGS = [
  {
    id: 'wooden_shelter',
    name: 'Wooden Shelter',
    description: 'A simple wooden cabin. Provides 1 housing slot.',
    size: { width: 3, height: 3, depth: 3 },
    cost: { wood: 25 },
    effects: { housing: 1, attractiveness: 5 },
    layers: [
      'WWW|W.W|WWW',   // Layer 0 (floor)
      'W.W|...|W.W',   // Layer 1 (walls with opening)
      'WWW|WWW|WWW',   // Layer 2 (roof)
    ],
  },
  {
    id: 'stone_house',
    name: 'Stone House',
    description: 'A sturdy stone dwelling. Provides 2 housing slots.',
    size: { width: 4, height: 4, depth: 4 },
    cost: { stone: 40, wood: 10 },
    effects: { housing: 2, attractiveness: 15 },
    layers: [
      'SSSS|S..S|S..S|SSSS',   // Layer 0 (floor)
      'SWWS|W..W|W..W|SWWS',   // Layer 1 (walls)
      'SWWS|W..W|W..W|SWWS',   // Layer 2 (walls)
      'SSSS|SSSS|SSSS|SSSS',   // Layer 3 (roof)
    ],
  },
  {
    id: 'watchtower',
    name: 'Watchtower',
    description: 'A tall stone lookout. Increases settlement visibility.',
    size: { width: 3, height: 6, depth: 3 },
    cost: { stone: 25, iron: 5 },
    effects: { housing: 0, attractiveness: 10 },
    layers: [
      'SSS|SSS|SSS',   // Layer 0 (base)
      'SSS|S.S|SSS',   // Layer 1
      'S.S|...|S.S',   // Layer 2
      'S.S|...|S.S',   // Layer 3
      'SIS|I.I|SIS',   // Layer 4 (iron accents)
      'SSS|SSS|SSS',   // Layer 5 (roof)
    ],
  },
  {
    id: 'storage_shed',
    name: 'Storage Shed',
    description: 'A simple storage building. Keeps materials dry.',
    size: { width: 4, height: 3, depth: 4 },
    cost: { wood: 15, stone: 10 },
    effects: { housing: 0, attractiveness: 5 },
    layers: [
      'WWWW|W..W|W..W|WWWW',   // Layer 0 (floor)
      'WSSW|S..S|S..S|WSSW',   // Layer 1 (walls)
      'WWWW|WWWW|WWWW|WWWW',   // Layer 2 (roof)
    ],
  },
];

/**
 * Get a building definition by its ID.
 */
export function getBuildingById(id) {
  return BUILDINGS.find(b => b.id === id) || null;
}

/**
 * Parse a building's layer strings into a flat array of block positions.
 * Returns [{x, y, z, blockType}] for all non-AIR blocks, sorted bottom-up
 * then front-to-back (Z) then left-to-right (X).
 */
export function parseLayers(building) {
  const blocks = [];

  for (let y = 0; y < building.layers.length; y++) {
    const rows = building.layers[y].split('|');
    for (let z = 0; z < rows.length; z++) {
      for (let x = 0; x < rows[z].length; x++) {
        const ch = rows[z][x];
        const blockType = BLOCK_CHAR_MAP[ch];
        if (blockType !== undefined && blockType !== BlockTypes.AIR) {
          blocks.push({ x, y, z, blockType });
        }
      }
    }
  }

  // Sort: bottom-up (Y), then front-to-back (Z), then left-to-right (X)
  blocks.sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);

  return blocks;
}
