/**
 * Voxel Module - Core voxel system for block-based world representation
 *
 * This module provides the foundation for a layered 2D voxel system where
 * NPCs can build structures block-by-block.
 *
 * Components:
 * - BlockTypes: Block type definitions and properties
 * - VoxelChunk: 3D chunk storage (32x32x16 blocks)
 * - VoxelWorld: World-level block management and chunk loading
 *
 * Usage:
 *   import { VoxelWorld, BlockType } from './modules/voxel';
 *
 *   const world = new VoxelWorld({ seed: 12345 });
 *   world.setBlock(10, 10, 0, BlockType.STONE);
 */

// Block type definitions
export {
  BlockType,
  BlockCategory,
  BLOCK_PROPERTIES,
  getBlockProperty,
  isBlockSolid,
  isBlockTransparent,
  isBlockWalkable,
  isBlockClimbable,
  getBlockLightLevel,
  getBlockRequiredMaterial,
  getBlockDropItem,
  getBlockName,
  getBlocksByCategory,
  getBuildableBlocks,
  blockTypeToString,
  stringToBlockType
} from './BlockTypes.js';

// Chunk storage
export { VoxelChunk, ChunkRef } from './VoxelChunk.js';

// World management
export { VoxelWorld } from './VoxelWorld.js';
