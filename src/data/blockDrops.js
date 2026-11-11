/**
 * blockDrops.js — Defines what materials drop when blocks are mined
 *
 * Format: BlockType → { material, min, max, chance?, bonus?, requiresTier? }
 *   - material: key in inventory.materials
 *   - min/max: quantity range (random)
 *   - chance: probability of dropping (default 1.0)
 *   - bonus: additional rare drop { material, amount, chance }
 *   - requiresTier: minimum TOOL_TIER to get drops (block still breaks without it)
 */

import { BlockTypes } from '../systems/chunks/blockTypes';
import { TOOL_TIER, APPLE_DROP_CHANCE } from './tuning';

export const BLOCK_DROPS = {
  [BlockTypes.STONE]: { material: 'stone', min: 1, max: 1 },
  [BlockTypes.DIRT]: { material: 'dirt', min: 1, max: 1 },
  [BlockTypes.GRASS]: { material: 'dirt', min: 1, max: 1 },
  [BlockTypes.SAND]: { material: 'sand', min: 1, max: 1 },
  [BlockTypes.WOOD]: { material: 'wood', min: 1, max: 2 },
  [BlockTypes.LEAVES]: {
    material: null, // No primary drop
    min: 0,
    max: 0,
    bonus: { material: 'berry', amount: 1, chance: APPLE_DROP_CHANCE },
  },
  [BlockTypes.GRAVEL]: { material: 'stone', min: 1, max: 1 },
  [BlockTypes.COAL_ORE]: {
    material: 'coal',
    min: 1,
    max: 3,
    requiresTier: TOOL_TIER.STONE,
  },
  [BlockTypes.IRON_ORE]: {
    material: 'iron',
    min: 1,
    max: 1,
    requiresTier: TOOL_TIER.IRON,
  },
  [BlockTypes.GOLD_ORE]: {
    material: 'gold_ore',
    min: 1,
    max: 1,
    requiresTier: TOOL_TIER.IRON,
  },
  [BlockTypes.CLAY]: { material: 'clay', min: 1, max: 2 },
  [BlockTypes.SNOW]: { material: 'snow', min: 1, max: 1 },
  [BlockTypes.ICE]: { material: 'ice', min: 1, max: 1 },
  [BlockTypes.BERRY_BUSH]: { material: 'berry', min: 1, max: 3 },
  [BlockTypes.CAMPFIRE]: { material: 'wood', min: 2, max: 2 },
  [BlockTypes.CORRUPTED_STONE]: { material: 'stone', min: 1, max: 1 },
  [BlockTypes.CORRUPTED_GRASS]: { material: 'dirt', min: 1, max: 1 },
};

/**
 * Calculate drops for a mined block.
 * @param {number} blockType - The block type that was mined
 * @param {number} toolTier - The tier of the tool used (0 = bare hands)
 * @returns {Array<{material: string, amount: number}>} drops
 */
export function calculateDrops(blockType, toolTier = 0) {
  const dropDef = BLOCK_DROPS[blockType];
  if (!dropDef) return [];

  const drops = [];

  // Check tool tier requirement
  if (dropDef.requiresTier && toolTier < dropDef.requiresTier) {
    // Block breaks but yields nothing without the right tool
    return [];
  }

  // Primary drop
  if (dropDef.material && dropDef.max > 0) {
    const amount = dropDef.min === dropDef.max
      ? dropDef.min
      : dropDef.min + Math.floor(Math.random() * (dropDef.max - dropDef.min + 1));
    if (amount > 0) {
      drops.push({ material: dropDef.material, amount });
    }
  }

  // Bonus drop (random chance)
  if (dropDef.bonus) {
    if (Math.random() < dropDef.bonus.chance) {
      drops.push({ material: dropDef.bonus.material, amount: dropDef.bonus.amount });
    }
  }

  return drops;
}

/**
 * Materials consumed when PLACING a block (Build mode).
 * Mirrors what mining the block yields so placing then mining is never a
 * net gain. Blocks not listed here cannot be placed from the hotbar.
 */
export const BLOCK_PLACEMENT_COSTS = {
  [BlockTypes.DIRT]: { dirt: 1 },
  [BlockTypes.GRASS]: { dirt: 1 },
  [BlockTypes.STONE]: { stone: 1 },
  [BlockTypes.SAND]: { sand: 1 },
  [BlockTypes.SNOW]: { snow: 1 },
  [BlockTypes.WOOD]: { wood: 1 },
  // Leaves can drop berries when mined, so they cost wood to avoid a free-food loop
  [BlockTypes.LEAVES]: { wood: 1 },
  [BlockTypes.GRAVEL]: { stone: 1 },
  [BlockTypes.COAL_ORE]: { coal: 1 },
  [BlockTypes.CLAY]: { clay: 1 },
  [BlockTypes.ICE]: { ice: 1 },
  [BlockTypes.CAMPFIRE]: { wood: 2 },
};

/**
 * Get the material cost for placing a block, or null if it can't be placed.
 * @param {number} blockType
 * @returns {Object<string, number>|null}
 */
export function getPlacementCost(blockType) {
  return BLOCK_PLACEMENT_COSTS[blockType] || null;
}

/**
 * Check whether an inventory can pay a placement cost.
 * @param {Object<string, number>} materials - inventory.materials
 * @param {Object<string, number>} cost
 * @returns {{ ok: boolean, missing: string|null }}
 */
export function canAffordPlacement(materials, cost) {
  if (!cost) return { ok: false, missing: null };
  for (const [mat, qty] of Object.entries(cost)) {
    if ((materials?.[mat] || 0) < qty) return { ok: false, missing: mat };
  }
  return { ok: true, missing: null };
}
