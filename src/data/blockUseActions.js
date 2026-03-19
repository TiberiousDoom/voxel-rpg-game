/**
 * blockUseActions.js — Defines blocks usable with the E key.
 * Harvesting bushes, picking up campfires, etc.
 */

import { BlockTypes } from '../systems/chunks/blockTypes';

export const BLOCK_USE_ACTIONS = {
  [BlockTypes.BERRY_BUSH]: {
    action: 'harvest',
    drops: [{ material: 'berry', min: 1, max: 3 }],
    destroyBlock: true,
  },
  [BlockTypes.CAMPFIRE]: {
    action: 'pickup',
    drops: [{ material: 'wood', min: 2, max: 2 }],
    destroyBlock: true,
  },
};

export function isUsableBlock(blockType) {
  return !!BLOCK_USE_ACTIONS[blockType];
}
