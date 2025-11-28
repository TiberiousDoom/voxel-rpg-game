/**
 * Construction Module - Blueprint-based building system
 *
 * This module enables NPC-driven construction of structures:
 * - Blueprint definitions for structures
 * - Construction site tracking and progress
 * - Integration with hauling and building jobs
 *
 * Components:
 * - Blueprint: Structure template with block layout
 * - ConstructionSite: Active construction progress tracking
 * - ConstructionManager: Central management of all construction
 *
 * Usage:
 *   import { ConstructionManager, Blueprint, createBlueprint } from './modules/construction';
 *
 *   const manager = new ConstructionManager({ voxelWorld });
 *   manager.registerBlueprint(myBlueprint);
 *   const site = manager.placeBlueprint('wooden_house', { x: 10, y: 10, z: 0 });
 */

export {
  Blueprint,
  BlueprintBlock,
  BlueprintCategory,
  BlueprintTier,
  BlueprintBuilder,
  createBlueprint
} from './Blueprint.js';

export {
  ConstructionSite,
  ConstructionBlock,
  BlockStatus,
  SiteStatus
} from './ConstructionSite.js';

export { ConstructionManager } from './ConstructionManager.js';
