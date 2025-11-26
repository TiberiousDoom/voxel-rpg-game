/**
 * Voxel Building Module - Complete NPC building system
 *
 * This module provides a unified interface for all voxel building
 * functionality including terrain, stockpiles, construction,
 * hauling, and NPC builder behavior.
 *
 * Part of Phase 9: Module Integration
 *
 * Usage:
 *   import { VoxelBuildingOrchestrator } from './modules/voxel-building';
 *
 *   const voxelBuilding = new VoxelBuildingOrchestrator();
 *   voxelBuilding.initialize({ npcManager, pathfindingService });
 *
 * @module voxel-building
 */

export { VoxelBuildingOrchestrator } from './VoxelBuildingOrchestrator.js';
export { TerrainToVoxelConverter } from './TerrainToVoxelConverter.js';

// Re-export sub-modules for direct access if needed
export * from '../voxel/index.js';
export * from '../stockpile/index.js';
export * from '../construction/index.js';
export * from '../hauling/index.js';
export * from '../building/index.js';
export * from '../jobs/index.js';
