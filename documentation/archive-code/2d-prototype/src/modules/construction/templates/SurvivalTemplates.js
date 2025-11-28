/**
 * SurvivalTemplates.js - Survival tier building blueprints
 *
 * Basic structures available from the start of the game.
 * Low resource requirements, quick to build.
 */

import { createBlueprint, BlueprintCategory, BlueprintTier } from '../Blueprint.js';
import { BlockType } from '../../voxel/BlockTypes.js';

/**
 * Simple Campfire - 1x1, provides warmth and light
 */
export const CampfireBlueprint = createBlueprint()
  .id('campfire')
  .name('Campfire')
  .description('A simple fire pit for warmth and cooking')
  .category(BlueprintCategory.INFRASTRUCTURE)
  .tier(BlueprintTier.SURVIVAL)
  .addBlock(0, 0, 0, BlockType.CAMPFIRE)
  .build();

/**
 * Basic Shelter - 3x3x2, simple roof over head
 */
export const BasicShelterBlueprint = createBlueprint()
  .id('basic_shelter')
  .name('Basic Shelter')
  .description('A simple lean-to shelter providing basic protection')
  .category(BlueprintCategory.HOUSING)
  .tier(BlueprintTier.SURVIVAL)
  // Floor
  .fillFloor(0, 0, 0, 2, 2, BlockType.WOOD_PLANK)
  // Back wall
  .addBlock(0, 2, 1, BlockType.WOOD_LOG)
  .addBlock(1, 2, 1, BlockType.WOOD_LOG)
  .addBlock(2, 2, 1, BlockType.WOOD_LOG)
  // Side walls (partial)
  .addBlock(0, 1, 1, BlockType.WOOD_LOG)
  .addBlock(2, 1, 1, BlockType.WOOD_LOG)
  // Roof (thatch)
  .addBlock(0, 1, 2, BlockType.THATCH)
  .addBlock(1, 1, 2, BlockType.THATCH)
  .addBlock(2, 1, 2, BlockType.THATCH)
  .addBlock(0, 2, 2, BlockType.THATCH)
  .addBlock(1, 2, 2, BlockType.THATCH)
  .addBlock(2, 2, 2, BlockType.THATCH)
  .addEntryPoint(1, 0, 0)
  .build();

/**
 * Storage Chest - 1x1, basic item storage
 */
export const StorageChestBlueprint = createBlueprint()
  .id('storage_chest')
  .name('Storage Chest')
  .description('A wooden chest for storing items')
  .category(BlueprintCategory.STORAGE)
  .tier(BlueprintTier.SURVIVAL)
  .addBlock(0, 0, 0, BlockType.CHEST)
  .storageCapacity(100)
  .build();

/**
 * Wooden Fence Section - 3x1, for enclosures
 */
export const WoodenFenceBlueprint = createBlueprint()
  .id('wooden_fence')
  .name('Wooden Fence')
  .description('A section of wooden fencing')
  .category(BlueprintCategory.DEFENSE)
  .tier(BlueprintTier.SURVIVAL)
  .addBlock(0, 0, 0, BlockType.WOOD_FENCE)
  .addBlock(1, 0, 0, BlockType.WOOD_FENCE)
  .addBlock(2, 0, 0, BlockType.WOOD_FENCE)
  .build();

/**
 * Workbench Station - 2x2, crafting area
 */
export const WorkbenchBlueprint = createBlueprint()
  .id('workbench_station')
  .name('Workbench Station')
  .description('A crafting station for basic items')
  .category(BlueprintCategory.PRODUCTION)
  .tier(BlueprintTier.SURVIVAL)
  .addBlock(0, 0, 0, BlockType.WOOD_PLANK)
  .addBlock(1, 0, 0, BlockType.WOOD_PLANK)
  .addBlock(0, 1, 0, BlockType.WORKBENCH)
  .addBlock(1, 1, 0, BlockType.CHEST)
  .addWorkSlot(0, 0, 0)
  .storageCapacity(50)
  .build();

/**
 * Ladder (up) - 1x1x3, vertical navigation
 */
export const LadderBlueprint = createBlueprint()
  .id('ladder_up')
  .name('Ladder')
  .description('A ladder for climbing between Z-levels')
  .category(BlueprintCategory.INFRASTRUCTURE)
  .tier(BlueprintTier.SURVIVAL)
  .addBlock(0, 0, 0, BlockType.LADDER)
  .addBlock(0, 0, 1, BlockType.LADDER)
  .addBlock(0, 0, 2, BlockType.LADDER)
  .build();

/**
 * Get all survival tier blueprints
 * @returns {Array<Blueprint>}
 */
export function getSurvivalBlueprints() {
  return [
    CampfireBlueprint,
    BasicShelterBlueprint,
    StorageChestBlueprint,
    WoodenFenceBlueprint,
    WorkbenchBlueprint,
    LadderBlueprint
  ];
}
