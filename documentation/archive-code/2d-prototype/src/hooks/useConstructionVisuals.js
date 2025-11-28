/**
 * useConstructionVisuals.js - Visual feedback for voxel construction system
 *
 * Provides visual indicators for:
 * - Ghost blocks (blueprint preview)
 * - Construction progress overlays
 * - Mining designations
 * - NPC carrying indicators
 * - Stockpile zone highlights
 *
 * Part of Phase 16: Visual Feedback
 */

import { useMemo, useCallback } from 'react';
import { BlockType } from '../modules/voxel/BlockTypes.js';

/**
 * Colors for visual feedback
 */
const COLORS = {
  // Ghost blocks (blueprint preview)
  ghostValid: 'rgba(100, 200, 100, 0.4)',
  ghostInvalid: 'rgba(200, 100, 100, 0.4)',
  ghostPending: 'rgba(100, 100, 200, 0.4)',

  // Construction progress
  constructionProgress: 'rgba(255, 200, 50, 0.6)',
  constructionComplete: 'rgba(100, 255, 100, 0.5)',

  // Mining designations
  miningDesignation: 'rgba(200, 150, 50, 0.5)',
  miningActive: 'rgba(255, 200, 100, 0.6)',

  // Stockpile zones
  stockpileZone: 'rgba(100, 150, 255, 0.3)',
  stockpileSelected: 'rgba(100, 150, 255, 0.5)',
  stockpileFull: 'rgba(255, 150, 100, 0.4)',

  // NPC indicators
  npcCarrying: 'rgba(255, 200, 100, 0.8)',
  npcBuilding: 'rgba(100, 200, 255, 0.8)',
  npcMining: 'rgba(200, 150, 100, 0.8)',

  // Z-level indicators
  zLevelBelow: 'rgba(100, 100, 100, 0.3)',
  zLevelCurrent: 'rgba(255, 255, 255, 0)',
  zLevelAbove: 'rgba(200, 200, 255, 0.2)'
};

/**
 * Block preview styles
 */
const BLOCK_PREVIEW_STYLES = {
  [BlockType.WOOD_PLANK]: { color: '#8B4513', label: 'Wood' },
  [BlockType.STONE_BRICK]: { color: '#808080', label: 'Stone' },
  [BlockType.COBBLESTONE]: { color: '#696969', label: 'Cobble' },
  [BlockType.DIRT]: { color: '#8B5A2B', label: 'Dirt' },
  [BlockType.GRASS]: { color: '#228B22', label: 'Grass' },
  [BlockType.SAND]: { color: '#F4A460', label: 'Sand' },
  [BlockType.THATCH]: { color: '#DAA520', label: 'Thatch' },
  [BlockType.TORCH]: { color: '#FFA500', label: 'Torch' },
  default: { color: '#CCCCCC', label: 'Block' }
};

/**
 * Generate ghost block visuals for blueprint preview
 * @param {object} blueprint - Blueprint being previewed
 * @param {object} position - Placement position {x, y, z}
 * @param {boolean} isValid - Whether placement is valid
 * @returns {Array} Array of ghost block render data
 */
export function generateGhostBlocks(blueprint, position, isValid) {
  if (!blueprint || !position) return [];

  const ghostBlocks = [];

  for (const block of blueprint.blocks || []) {
    const worldX = position.x + block.x;
    const worldY = position.y + block.y;
    const worldZ = position.z + block.z;

    const style = BLOCK_PREVIEW_STYLES[block.type] || BLOCK_PREVIEW_STYLES.default;

    ghostBlocks.push({
      id: `ghost-${worldX}-${worldY}-${worldZ}`,
      x: worldX,
      y: worldY,
      z: worldZ,
      blockType: block.type,
      color: isValid ? COLORS.ghostValid : COLORS.ghostInvalid,
      blockColor: style.color,
      label: style.label,
      opacity: 0.5,
      isGhost: true
    });
  }

  return ghostBlocks;
}

/**
 * Generate construction progress visuals
 * @param {Array} constructionSites - Active construction sites
 * @param {number} currentZ - Current Z-level being viewed
 * @returns {Array} Array of progress indicator render data
 */
export function generateConstructionProgress(constructionSites, currentZ) {
  if (!constructionSites || constructionSites.length === 0) return [];

  const progressIndicators = [];

  for (const site of constructionSites) {
    // Get blocks at current Z-level
    const blocksAtLevel = site.getBlocksAtLevel?.(currentZ) || [];

    for (const block of blocksAtLevel) {
      const progress = block.progress || 0;
      const isComplete = progress >= 1;

      progressIndicators.push({
        id: `progress-${site.id}-${block.x}-${block.y}-${block.z}`,
        x: block.x,
        y: block.y,
        z: block.z,
        progress: progress,
        color: isComplete ? COLORS.constructionComplete : COLORS.constructionProgress,
        opacity: 0.3 + (progress * 0.4),
        showProgress: !isComplete,
        blockType: block.type
      });
    }
  }

  return progressIndicators;
}

/**
 * Generate mining designation visuals
 * @param {Array} miningTasks - Mining tasks from GatheringManager
 * @param {number} currentZ - Current Z-level being viewed
 * @returns {Array} Array of mining designation render data
 */
export function generateMiningDesignations(miningTasks, currentZ) {
  if (!miningTasks || miningTasks.length === 0) return [];

  const designations = [];

  for (const task of miningTasks) {
    if (task.position.z !== currentZ) continue;

    const isActive = task.status === 'mining' || task.status === 'assigned';

    designations.push({
      id: `mining-${task.id}`,
      x: task.position.x,
      y: task.position.y,
      z: task.position.z,
      color: isActive ? COLORS.miningActive : COLORS.miningDesignation,
      progress: task.getProgress?.() || 0,
      isActive: isActive,
      blockType: task.blockType
    });
  }

  return designations;
}

/**
 * Generate stockpile zone visuals
 * @param {Array} stockpiles - Stockpile data
 * @param {string} selectedId - Currently selected stockpile ID
 * @param {number} currentZ - Current Z-level being viewed
 * @returns {Array} Array of stockpile zone render data
 */
export function generateStockpileZones(stockpiles, selectedId, currentZ) {
  if (!stockpiles || stockpiles.length === 0) return [];

  const zones = [];

  for (const stockpile of stockpiles) {
    // Only show stockpiles at current Z-level (or if they span multiple levels)
    const position = stockpile.position || { x: 0, y: 0, z: 0 };
    if (position.z !== currentZ) continue;

    const isSelected = stockpile.id === selectedId;
    const isFull = stockpile.isFull?.() || false;

    let color = COLORS.stockpileZone;
    if (isSelected) color = COLORS.stockpileSelected;
    if (isFull) color = COLORS.stockpileFull;

    zones.push({
      id: `stockpile-${stockpile.id}`,
      x: position.x,
      y: position.y,
      z: position.z,
      width: stockpile.width || 3,
      height: stockpile.height || 3,
      color: color,
      isSelected: isSelected,
      isFull: isFull,
      name: stockpile.name || 'Stockpile'
    });
  }

  return zones;
}

/**
 * Generate NPC carrying indicators
 * @param {Array} npcs - NPC data with carrying state
 * @param {number} currentZ - Current Z-level being viewed
 * @returns {Array} Array of NPC indicator render data
 */
export function generateNPCIndicators(npcs, currentZ) {
  if (!npcs || npcs.length === 0) return [];

  const indicators = [];

  for (const npc of npcs) {
    const position = npc.position || { x: 0, y: 0, z: 0 };

    // Only show NPCs at or near current Z-level
    if (Math.abs(position.z - currentZ) > 1) continue;

    // Determine indicator type
    let indicatorColor = null;
    let indicatorType = null;

    if (npc.isCarrying) {
      indicatorColor = COLORS.npcCarrying;
      indicatorType = 'carrying';
    } else if (npc.isBuilding) {
      indicatorColor = COLORS.npcBuilding;
      indicatorType = 'building';
    } else if (npc.isMining) {
      indicatorColor = COLORS.npcMining;
      indicatorType = 'mining';
    }

    if (indicatorColor) {
      indicators.push({
        id: `npc-indicator-${npc.id}`,
        npcId: npc.id,
        x: position.x,
        y: position.y,
        z: position.z,
        color: indicatorColor,
        type: indicatorType,
        resource: npc.carryingResource,
        opacity: position.z === currentZ ? 1 : 0.5
      });
    }
  }

  return indicators;
}

/**
 * Hook: useConstructionVisuals
 * Combines all visual feedback into a single hook
 *
 * @param {object} params - Parameters
 * @param {object} params.blueprint - Blueprint being previewed (optional)
 * @param {object} params.placementPosition - Placement position (optional)
 * @param {boolean} params.placementValid - Whether placement is valid
 * @param {Array} params.constructionSites - Active construction sites
 * @param {Array} params.miningTasks - Active mining tasks
 * @param {Array} params.stockpiles - Stockpile data
 * @param {string} params.selectedStockpileId - Selected stockpile ID
 * @param {Array} params.npcs - NPC data
 * @param {number} params.currentZLevel - Current Z-level being viewed
 * @returns {object} Visual feedback data
 */
export function useConstructionVisuals({
  blueprint = null,
  placementPosition = null,
  placementValid = true,
  constructionSites = [],
  miningTasks = [],
  stockpiles = [],
  selectedStockpileId = null,
  npcs = [],
  currentZLevel = 0
}) {
  // Generate ghost blocks for blueprint preview
  const ghostBlocks = useMemo(() => {
    if (!blueprint || !placementPosition) return [];
    return generateGhostBlocks(blueprint, placementPosition, placementValid);
  }, [blueprint, placementPosition, placementValid]);

  // Generate construction progress indicators
  const constructionProgress = useMemo(() => {
    return generateConstructionProgress(constructionSites, currentZLevel);
  }, [constructionSites, currentZLevel]);

  // Generate mining designations
  const miningDesignations = useMemo(() => {
    return generateMiningDesignations(miningTasks, currentZLevel);
  }, [miningTasks, currentZLevel]);

  // Generate stockpile zones
  const stockpileZones = useMemo(() => {
    return generateStockpileZones(stockpiles, selectedStockpileId, currentZLevel);
  }, [stockpiles, selectedStockpileId, currentZLevel]);

  // Generate NPC indicators
  const npcIndicators = useMemo(() => {
    return generateNPCIndicators(npcs, currentZLevel);
  }, [npcs, currentZLevel]);

  // Utility to get color for Z-level fade
  const getZLevelColor = useCallback((z) => {
    if (z < currentZLevel) return COLORS.zLevelBelow;
    if (z > currentZLevel) return COLORS.zLevelAbove;
    return COLORS.zLevelCurrent;
  }, [currentZLevel]);

  return {
    ghostBlocks,
    constructionProgress,
    miningDesignations,
    stockpileZones,
    npcIndicators,
    getZLevelColor,
    colors: COLORS
  };
}

export default useConstructionVisuals;
