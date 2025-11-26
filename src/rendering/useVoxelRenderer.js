/**
 * useVoxelRenderer.js - Voxel terrain rendering hook with Z-level support
 *
 * Renders the voxel world as layered 2D with:
 * - Current Z-level at full opacity
 * - Levels below faded for depth perception
 * - Ghost blocks for construction blueprints
 * - Block type-based coloring
 *
 * Part of Phase 2: Z-Level Rendering System
 */

import { useCallback, useRef, useMemo } from 'react';
import { BlockType, getBlockProperty, isBlockTransparent, getBlockLightLevel } from '../modules/voxel/BlockTypes.js';

/**
 * Block color palette - maps block types to colors
 * Uses simple flat colors for top-down 2D rendering
 */
const BlockColors = {
  // Terrain
  [BlockType.AIR]: 'transparent',
  [BlockType.DIRT]: 'rgb(139, 90, 43)',
  [BlockType.GRASS]: 'rgb(86, 176, 0)',
  [BlockType.STONE]: 'rgb(128, 128, 128)',
  [BlockType.SAND]: 'rgb(238, 214, 175)',
  [BlockType.GRAVEL]: 'rgb(136, 140, 141)',
  [BlockType.CLAY]: 'rgb(158, 134, 115)',
  [BlockType.SNOW]: 'rgb(250, 250, 255)',
  [BlockType.ICE]: 'rgb(173, 216, 230)',
  [BlockType.MUD]: 'rgb(92, 64, 51)',
  [BlockType.BEDROCK]: 'rgb(50, 50, 50)',

  // Ores
  [BlockType.COAL_ORE]: 'rgb(54, 54, 54)',
  [BlockType.IRON_ORE]: 'rgb(175, 135, 108)',
  [BlockType.GOLD_ORE]: 'rgb(255, 215, 0)',
  [BlockType.CRYSTAL_ORE]: 'rgb(200, 162, 200)',
  [BlockType.ESSENCE_ORE]: 'rgb(138, 43, 226)',

  // Wood
  [BlockType.WOOD_LOG]: 'rgb(101, 67, 33)',
  [BlockType.WOOD_PLANK]: 'rgb(160, 120, 60)',
  [BlockType.WOOD_STAIRS]: 'rgb(160, 120, 60)',
  [BlockType.WOOD_FENCE]: 'rgb(140, 100, 50)',
  [BlockType.WOOD_DOOR]: 'rgb(120, 80, 40)',
  [BlockType.WOOD_TRAPDOOR]: 'rgb(130, 90, 50)',

  // Stone construction
  [BlockType.COBBLESTONE]: 'rgb(100, 100, 100)',
  [BlockType.STONE_BRICK]: 'rgb(120, 120, 120)',
  [BlockType.STONE_STAIRS]: 'rgb(115, 115, 115)',
  [BlockType.STONE_WALL]: 'rgb(110, 110, 110)',
  [BlockType.STONE_SLAB]: 'rgb(125, 125, 125)',
  [BlockType.CARVED_STONE]: 'rgb(140, 140, 140)',
  [BlockType.MOSSY_COBBLESTONE]: 'rgb(80, 110, 80)',

  // Building
  [BlockType.BRICK]: 'rgb(180, 80, 70)',
  [BlockType.THATCH]: 'rgb(218, 190, 127)',
  [BlockType.CLAY_BRICK]: 'rgb(200, 100, 80)',
  [BlockType.REINFORCED_WOOD]: 'rgb(80, 60, 30)',
  [BlockType.REINFORCED_STONE]: 'rgb(80, 80, 90)',

  // Functional
  [BlockType.TORCH]: 'rgb(255, 200, 50)',
  [BlockType.CAMPFIRE]: 'rgb(255, 100, 0)',
  [BlockType.WORKBENCH]: 'rgb(139, 90, 43)',
  [BlockType.FURNACE]: 'rgb(90, 90, 90)',
  [BlockType.CHEST]: 'rgb(150, 100, 50)',
  [BlockType.BED]: 'rgb(180, 60, 60)',
  [BlockType.ANVIL]: 'rgb(70, 70, 70)',
  [BlockType.CAULDRON]: 'rgb(60, 60, 60)',
  [BlockType.BARREL]: 'rgb(110, 70, 40)',
  [BlockType.CRATE]: 'rgb(140, 100, 60)',

  // Farm
  [BlockType.FARMLAND]: 'rgb(100, 70, 40)',
  [BlockType.FARMLAND_WET]: 'rgb(70, 50, 30)',
  [BlockType.CROP_WHEAT]: 'rgb(220, 200, 50)',
  [BlockType.CROP_CARROT]: 'rgb(237, 145, 33)',
  [BlockType.CROP_POTATO]: 'rgb(180, 150, 100)',
  [BlockType.WATER]: 'rgba(30, 144, 255, 0.7)',
  [BlockType.WATER_SOURCE]: 'rgba(0, 105, 200, 0.8)',
  [BlockType.LEAVES]: 'rgb(34, 139, 34)',
  [BlockType.FLOWER]: 'rgb(255, 100, 150)',
  [BlockType.TALL_GRASS]: 'rgb(60, 150, 60)',

  // Decoration
  [BlockType.CARPET]: 'rgb(200, 50, 50)',
  [BlockType.BANNER]: 'rgb(200, 200, 50)',
  [BlockType.PAINTING]: 'rgb(150, 100, 50)',
  [BlockType.SHELF]: 'rgb(140, 100, 60)',
  [BlockType.TABLE]: 'rgb(130, 90, 50)',
  [BlockType.CHAIR]: 'rgb(120, 80, 40)',
  [BlockType.WINDOW]: 'rgba(200, 230, 255, 0.5)',
  [BlockType.GLASS]: 'rgba(200, 230, 255, 0.3)',

  // Navigation
  [BlockType.STAIRS_UP]: 'rgb(140, 140, 140)',
  [BlockType.STAIRS_DOWN]: 'rgb(100, 100, 100)',
  [BlockType.RAMP_NORTH]: 'rgb(120, 120, 120)',
  [BlockType.RAMP_SOUTH]: 'rgb(120, 120, 120)',
  [BlockType.RAMP_EAST]: 'rgb(120, 120, 120)',
  [BlockType.RAMP_WEST]: 'rgb(120, 120, 120)',
  [BlockType.LADDER]: 'rgb(160, 120, 60)',

  // Special
  [BlockType.CONSTRUCTION_MARKER]: 'rgba(100, 200, 255, 0.4)',
  [BlockType.STOCKPILE_MARKER]: 'rgba(255, 200, 100, 0.3)',
  [BlockType.DESIGNATION_MARKER]: 'rgba(255, 100, 100, 0.3)',
  [BlockType.INVALID]: 'rgb(255, 0, 255)'
};

/**
 * Get color for a block type with optional shading
 * @param {number} blockType - Block type
 * @param {number} z - Z-level for shading
 * @param {number} maxZ - Max Z-level
 * @returns {string} CSS color
 */
const getBlockColor = (blockType, z = 0, maxZ = 16) => {
  const baseColor = BlockColors[blockType] || BlockColors[BlockType.INVALID];

  // Don't shade transparent blocks or special blocks
  if (baseColor === 'transparent' || blockType >= 241) {
    return baseColor;
  }

  // Apply subtle height-based shading (higher = brighter)
  const shadeFactor = 0.8 + (z / maxZ) * 0.4;  // 0.8 to 1.2

  // Parse and shade the color
  const rgbMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const rgbaMatch = baseColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);

  if (rgbMatch) {
    const r = Math.min(255, Math.floor(parseInt(rgbMatch[1]) * shadeFactor));
    const g = Math.min(255, Math.floor(parseInt(rgbMatch[2]) * shadeFactor));
    const b = Math.min(255, Math.floor(parseInt(rgbMatch[3]) * shadeFactor));
    return `rgb(${r}, ${g}, ${b})`;
  }

  if (rgbaMatch) {
    const r = Math.min(255, Math.floor(parseInt(rgbaMatch[1]) * shadeFactor));
    const g = Math.min(255, Math.floor(parseInt(rgbaMatch[2]) * shadeFactor));
    const b = Math.min(255, Math.floor(parseInt(rgbaMatch[3]) * shadeFactor));
    return `rgba(${r}, ${g}, ${b}, ${rgbaMatch[4]})`;
  }

  return baseColor;
};

/**
 * Voxel rendering hook
 * Renders layered 2D view of voxel world
 *
 * @param {object} options - Rendering options
 * @returns {object} Rendering functions
 */
export const useVoxelRenderer = (options = {}) => {
  const {
    tileSize = 40,
    layersBelowVisible = 1,       // How many layers below to show
    belowLayerOpacity = 0.3,      // Opacity of layers below
    showBlockBorders = false,     // Show grid lines between blocks
    showLightSources = true,      // Highlight light-emitting blocks
    ghostBlockOpacity = 0.4       // Opacity for construction ghost blocks
  } = options;

  // Color cache for performance
  const colorCacheRef = useRef(new Map());

  /**
   * Get cached block color
   */
  const getCachedBlockColor = useCallback((blockType, z, maxZ) => {
    const key = `${blockType}_${z}_${maxZ}`;
    if (!colorCacheRef.current.has(key)) {
      colorCacheRef.current.set(key, getBlockColor(blockType, z, maxZ));
    }
    return colorCacheRef.current.get(key);
  }, []);

  /**
   * Render a single Z-layer of the voxel world
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {VoxelWorld} voxelWorld - Voxel world instance
   * @param {function} worldToCanvas - Coordinate converter
   * @param {object} viewportBounds - Visible area
   * @param {number} z - Z-level to render
   * @param {number} opacity - Layer opacity (1.0 for current, less for below)
   * @returns {number} Number of blocks rendered
   */
  const renderLayer = useCallback((ctx, voxelWorld, worldToCanvas, viewportBounds, z, opacity = 1.0) => {
    if (!ctx || !voxelWorld || !worldToCanvas) return 0;

    let blocksRendered = 0;
    const maxZ = voxelWorld.config.chunkSizeZ;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Render visible area
    const startX = Math.floor(viewportBounds.left);
    const endX = Math.ceil(viewportBounds.right);
    const startY = Math.floor(viewportBounds.top);
    const endY = Math.ceil(viewportBounds.bottom);

    // Group blocks by color for batch rendering
    const blocksByColor = new Map();

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const blockType = voxelWorld.getBlock(x, y, z);

        // Skip air blocks
        if (blockType === BlockType.AIR) continue;

        const color = getCachedBlockColor(blockType, z, maxZ);
        if (color === 'transparent') continue;

        if (!blocksByColor.has(color)) {
          blocksByColor.set(color, []);
        }
        blocksByColor.get(color).push({ x, y, blockType });
      }
    }

    // Render blocks grouped by color
    blocksByColor.forEach((blocks, color) => {
      ctx.fillStyle = color;

      blocks.forEach(({ x, y, blockType }) => {
        const canvasPos = worldToCanvas(x, y);

        // Viewport culling
        if (canvasPos.x < -tileSize || canvasPos.y < -tileSize ||
            canvasPos.x > ctx.canvas.width || canvasPos.y > ctx.canvas.height) {
          return;
        }

        ctx.fillRect(canvasPos.x, canvasPos.y, tileSize, tileSize);
        blocksRendered++;

        // Show block borders if enabled
        if (showBlockBorders) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(canvasPos.x, canvasPos.y, tileSize, tileSize);
        }

        // Highlight light sources
        if (showLightSources) {
          const lightLevel = getBlockLightLevel(blockType);
          if (lightLevel > 0) {
            const glowRadius = (lightLevel / 15) * tileSize;
            const gradient = ctx.createRadialGradient(
              canvasPos.x + tileSize / 2,
              canvasPos.y + tileSize / 2,
              0,
              canvasPos.x + tileSize / 2,
              canvasPos.y + tileSize / 2,
              glowRadius
            );
            gradient.addColorStop(0, `rgba(255, 255, 200, ${0.3 * (lightLevel / 15)})`);
            gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(
              canvasPos.x + tileSize / 2 - glowRadius,
              canvasPos.y + tileSize / 2 - glowRadius,
              glowRadius * 2,
              glowRadius * 2
            );
          }
        }
      });
    });

    ctx.restore();
    return blocksRendered;
  }, [tileSize, getCachedBlockColor, showBlockBorders, showLightSources]);

  /**
   * Render the voxel world at the current Z-level with layers below
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {VoxelWorld} voxelWorld - Voxel world instance
   * @param {function} worldToCanvas - Coordinate converter
   * @param {object} viewportBounds - Visible area {left, right, top, bottom}
   * @param {number} currentZ - Current Z-level being viewed
   * @returns {number} Total blocks rendered
   */
  const renderVoxelWorld = useCallback((ctx, voxelWorld, worldToCanvas, viewportBounds, currentZ) => {
    if (!ctx || !voxelWorld || !worldToCanvas) return 0;

    let totalRendered = 0;

    // Render layers below (faded)
    for (let z = Math.max(0, currentZ - layersBelowVisible); z < currentZ; z++) {
      const layerDepth = currentZ - z;
      const opacity = belowLayerOpacity / layerDepth;
      totalRendered += renderLayer(ctx, voxelWorld, worldToCanvas, viewportBounds, z, opacity);
    }

    // Render current layer (full opacity)
    totalRendered += renderLayer(ctx, voxelWorld, worldToCanvas, viewportBounds, currentZ, 1.0);

    return totalRendered;
  }, [renderLayer, layersBelowVisible, belowLayerOpacity]);

  /**
   * Render ghost/blueprint blocks for construction sites
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<{x, y, z, blockType, status}>} ghostBlocks - Ghost blocks to render
   * @param {function} worldToCanvas - Coordinate converter
   * @param {number} currentZ - Current Z-level
   * @returns {number} Blocks rendered
   */
  const renderGhostBlocks = useCallback((ctx, ghostBlocks, worldToCanvas, currentZ) => {
    if (!ctx || !ghostBlocks || ghostBlocks.length === 0) return 0;

    ctx.save();
    let rendered = 0;

    ghostBlocks.forEach(({ x, y, z, blockType, status }) => {
      // Only render ghosts on current Z-level or one above
      if (z < currentZ || z > currentZ + 1) return;

      const canvasPos = worldToCanvas(x, y);

      // Skip if outside viewport
      if (canvasPos.x < -tileSize || canvasPos.y < -tileSize ||
          canvasPos.x > ctx.canvas.width || canvasPos.y > ctx.canvas.height) {
        return;
      }

      // Color based on construction status
      let ghostColor;
      switch (status) {
        case 'pending':
          ghostColor = 'rgba(255, 100, 100, 0.4)';  // Red - missing materials
          break;
        case 'materials_reserved':
          ghostColor = 'rgba(255, 200, 100, 0.4)';  // Yellow - materials reserved
          break;
        case 'materials_delivered':
          ghostColor = 'rgba(100, 255, 100, 0.4)';  // Green - ready to build
          break;
        default:
          ghostColor = 'rgba(100, 200, 255, 0.4)';  // Blue - default
      }

      ctx.globalAlpha = z === currentZ ? ghostBlockOpacity : ghostBlockOpacity * 0.5;
      ctx.fillStyle = ghostColor;
      ctx.fillRect(canvasPos.x, canvasPos.y, tileSize, tileSize);

      // Draw dashed border
      ctx.strokeStyle = ghostColor.replace('0.4', '0.8');
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(canvasPos.x + 1, canvasPos.y + 1, tileSize - 2, tileSize - 2);
      ctx.setLineDash([]);

      rendered++;
    });

    ctx.restore();
    return rendered;
  }, [tileSize, ghostBlockOpacity]);

  /**
   * Render stockpile zone overlays
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<{bounds, allowedResources, slots}>} stockpiles - Stockpile data
   * @param {function} worldToCanvas - Coordinate converter
   * @param {number} currentZ - Current Z-level
   */
  const renderStockpileZones = useCallback((ctx, stockpiles, worldToCanvas, currentZ) => {
    if (!ctx || !stockpiles || stockpiles.length === 0) return;

    ctx.save();

    stockpiles.forEach(stockpile => {
      const { bounds } = stockpile;

      // Only render stockpiles on current Z-level
      if (bounds.z !== currentZ) return;

      const topLeft = worldToCanvas(bounds.x, bounds.y);
      const bottomRight = worldToCanvas(bounds.x + bounds.width, bounds.y + bounds.depth);

      // Fill zone with transparent overlay
      ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
      ctx.fillRect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
      );

      // Draw border
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
      );
      ctx.setLineDash([]);

      // Draw stockpile icon/label
      ctx.fillStyle = 'rgba(255, 200, 100, 0.8)';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('STOCKPILE', topLeft.x + 4, topLeft.y + 14);
    });

    ctx.restore();
  }, []);

  /**
   * Render Z-level indicator UI
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} currentZ - Current Z-level
   * @param {number} maxZ - Maximum Z-level
   * @param {number} x - X position on canvas
   * @param {number} y - Y position on canvas
   */
  const renderZLevelIndicator = useCallback((ctx, currentZ, maxZ, x, y) => {
    if (!ctx) return;

    ctx.save();

    const indicatorWidth = 60;
    const indicatorHeight = 150;
    const levelHeight = indicatorHeight / maxZ;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(x, y, indicatorWidth, indicatorHeight + 40, 8);
    ctx.fill();

    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Z-LEVEL', x + indicatorWidth / 2, y + 15);

    // Current level display
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`${currentZ}`, x + indicatorWidth / 2, y + 35);

    // Level bar
    const barX = x + 15;
    const barY = y + 45;
    const barWidth = indicatorWidth - 30;

    // Background bar
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.fillRect(barX, barY, barWidth, indicatorHeight);

    // Level markers
    for (let z = 0; z < maxZ; z++) {
      const markerY = barY + indicatorHeight - (z + 1) * levelHeight;

      // Current level highlight
      if (z === currentZ) {
        ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.fillRect(barX, markerY, barWidth, levelHeight);
      }

      // Level line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(barX, markerY);
      ctx.lineTo(barX + barWidth, markerY);
      ctx.stroke();
    }

    // Arrow indicator for current level
    const arrowY = barY + indicatorHeight - (currentZ + 0.5) * levelHeight;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(barX - 8, arrowY);
    ctx.lineTo(barX - 2, arrowY - 5);
    ctx.lineTo(barX - 2, arrowY + 5);
    ctx.closePath();
    ctx.fill();

    // Controls hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[ / ] to change', x + indicatorWidth / 2, y + indicatorHeight + 55);

    ctx.restore();
  }, []);

  /**
   * Render navigation indicators (stairs, ladders)
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {VoxelWorld} voxelWorld - Voxel world instance
   * @param {function} worldToCanvas - Coordinate converter
   * @param {object} viewportBounds - Visible area
   * @param {number} currentZ - Current Z-level
   */
  const renderNavigationIndicators = useCallback((ctx, voxelWorld, worldToCanvas, viewportBounds, currentZ) => {
    if (!ctx || !voxelWorld) return;

    ctx.save();

    const startX = Math.floor(viewportBounds.left);
    const endX = Math.ceil(viewportBounds.right);
    const startY = Math.floor(viewportBounds.top);
    const endY = Math.ceil(viewportBounds.bottom);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const blockType = voxelWorld.getBlock(x, y, currentZ);

        // Check for navigation blocks
        if (blockType === BlockType.STAIRS_UP || blockType === BlockType.LADDER) {
          const canvasPos = worldToCanvas(x, y);

          // Draw up arrow
          ctx.fillStyle = 'rgba(100, 255, 100, 0.8)';
          ctx.beginPath();
          ctx.moveTo(canvasPos.x + tileSize / 2, canvasPos.y + 5);
          ctx.lineTo(canvasPos.x + tileSize - 5, canvasPos.y + tileSize / 2);
          ctx.lineTo(canvasPos.x + 5, canvasPos.y + tileSize / 2);
          ctx.closePath();
          ctx.fill();
        }

        if (blockType === BlockType.STAIRS_DOWN) {
          const canvasPos = worldToCanvas(x, y);

          // Draw down arrow
          ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
          ctx.beginPath();
          ctx.moveTo(canvasPos.x + tileSize / 2, canvasPos.y + tileSize - 5);
          ctx.lineTo(canvasPos.x + tileSize - 5, canvasPos.y + tileSize / 2);
          ctx.lineTo(canvasPos.x + 5, canvasPos.y + tileSize / 2);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }, [tileSize]);

  /**
   * Render mining designation overlays
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<{x, y, z, progress, assigned}>} designations - Mining designations
   * @param {function} worldToCanvas - Coordinate converter
   * @param {number} currentZ - Current Z-level
   */
  const renderMiningDesignations = useCallback((ctx, designations, worldToCanvas, currentZ) => {
    if (!ctx || !designations || designations.length === 0) return;

    ctx.save();

    designations.forEach(({ x, y, z, progress, assigned }) => {
      // Only render on current Z-level
      if (z !== currentZ) return;

      const canvasPos = worldToCanvas(x, y);

      // Skip if outside viewport
      if (canvasPos.x < -tileSize || canvasPos.y < -tileSize ||
          canvasPos.x > ctx.canvas.width || canvasPos.y > ctx.canvas.height) {
        return;
      }

      // Base overlay - mining designation
      ctx.fillStyle = assigned
        ? 'rgba(255, 150, 50, 0.3)'   // Orange if assigned
        : 'rgba(255, 100, 100, 0.3)'; // Red if pending
      ctx.fillRect(canvasPos.x, canvasPos.y, tileSize, tileSize);

      // X mark for mining
      ctx.strokeStyle = assigned ? 'rgba(255, 150, 50, 0.8)' : 'rgba(255, 100, 100, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvasPos.x + 4, canvasPos.y + 4);
      ctx.lineTo(canvasPos.x + tileSize - 4, canvasPos.y + tileSize - 4);
      ctx.moveTo(canvasPos.x + tileSize - 4, canvasPos.y + 4);
      ctx.lineTo(canvasPos.x + 4, canvasPos.y + tileSize - 4);
      ctx.stroke();

      // Progress bar if mining in progress
      if (progress > 0 && progress < 1) {
        const barHeight = 4;
        const barWidth = tileSize - 8;
        const progressWidth = barWidth * progress;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(canvasPos.x + 4, canvasPos.y + tileSize - 8, barWidth, barHeight);

        // Progress fill
        ctx.fillStyle = 'rgba(100, 255, 100, 0.8)';
        ctx.fillRect(canvasPos.x + 4, canvasPos.y + tileSize - 8, progressWidth, barHeight);
      }
    });

    ctx.restore();
  }, [tileSize]);

  /**
   * Render NPC work indicators
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<{x, y, z, state, npcId}>} workers - Worker data
   * @param {function} worldToCanvas - Coordinate converter
   * @param {number} currentZ - Current Z-level
   */
  const renderWorkerIndicators = useCallback((ctx, workers, worldToCanvas, currentZ) => {
    if (!ctx || !workers || workers.length === 0) return;

    ctx.save();

    workers.forEach(({ x, y, z, state, taskType }) => {
      // Only render on current Z-level
      if (z !== currentZ) return;

      const canvasPos = worldToCanvas(x, y);

      // Skip if outside viewport
      if (canvasPos.x < -tileSize || canvasPos.y < -tileSize ||
          canvasPos.x > ctx.canvas.width || canvasPos.y > ctx.canvas.height) {
        return;
      }

      // Work state indicator
      let iconColor, iconText;
      switch (taskType) {
        case 'mining':
          iconColor = 'rgba(255, 200, 50, 0.9)';
          iconText = '⛏';
          break;
        case 'building':
          iconColor = 'rgba(100, 200, 255, 0.9)';
          iconText = '🔨';
          break;
        case 'hauling':
          iconColor = 'rgba(200, 150, 100, 0.9)';
          iconText = '📦';
          break;
        default:
          return;
      }

      // Draw work indicator above the block
      ctx.fillStyle = iconColor;
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(iconText, canvasPos.x + tileSize / 2, canvasPos.y - 4);
    });

    ctx.restore();
  }, [tileSize]);

  /**
   * Render block selection/hover highlight
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} selection - Selection data {x, y, z}
   * @param {function} worldToCanvas - Coordinate converter
   * @param {number} currentZ - Current Z-level
   * @param {string} mode - Selection mode (select, mine, build, stockpile)
   */
  const renderBlockSelection = useCallback((ctx, selection, worldToCanvas, currentZ, mode = 'select') => {
    if (!ctx || !selection) return;
    if (selection.z !== currentZ) return;

    const canvasPos = worldToCanvas(selection.x, selection.y);

    ctx.save();

    // Color based on mode
    let selectionColor;
    switch (mode) {
      case 'mine':
        selectionColor = 'rgba(255, 100, 100, 0.6)';
        break;
      case 'build':
        selectionColor = 'rgba(100, 200, 255, 0.6)';
        break;
      case 'stockpile':
        selectionColor = 'rgba(255, 200, 100, 0.6)';
        break;
      default:
        selectionColor = 'rgba(255, 255, 255, 0.4)';
    }

    // Fill
    ctx.fillStyle = selectionColor;
    ctx.fillRect(canvasPos.x, canvasPos.y, tileSize, tileSize);

    // Border
    ctx.strokeStyle = selectionColor.replace('0.6', '1.0').replace('0.4', '0.8');
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasPos.x + 1, canvasPos.y + 1, tileSize - 2, tileSize - 2);

    ctx.restore();
  }, [tileSize]);

  /**
   * Render region selection (drag select)
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} start - Start position {x, y}
   * @param {object} end - End position {x, y}
   * @param {function} worldToCanvas - Coordinate converter
   * @param {string} mode - Selection mode
   */
  const renderRegionSelection = useCallback((ctx, start, end, worldToCanvas, mode = 'select') => {
    if (!ctx || !start || !end) return;

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const topLeft = worldToCanvas(minX, minY);
    const bottomRight = worldToCanvas(maxX + 1, maxY + 1);

    ctx.save();

    // Color based on mode
    let fillColor, strokeColor;
    switch (mode) {
      case 'mine':
        fillColor = 'rgba(255, 100, 100, 0.2)';
        strokeColor = 'rgba(255, 100, 100, 0.8)';
        break;
      case 'build':
        fillColor = 'rgba(100, 200, 255, 0.2)';
        strokeColor = 'rgba(100, 200, 255, 0.8)';
        break;
      case 'stockpile':
        fillColor = 'rgba(255, 200, 100, 0.2)';
        strokeColor = 'rgba(255, 200, 100, 0.8)';
        break;
      default:
        fillColor = 'rgba(255, 255, 255, 0.2)';
        strokeColor = 'rgba(255, 255, 255, 0.6)';
    }

    // Fill
    ctx.fillStyle = fillColor;
    ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);

    // Border
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.setLineDash([]);

    // Dimensions label
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${width} x ${height}`,
      (topLeft.x + bottomRight.x) / 2,
      topLeft.y - 5
    );

    ctx.restore();
  }, []);

  // Return memoized rendering functions
  return useMemo(() => ({
    renderLayer,
    renderVoxelWorld,
    renderGhostBlocks,
    renderStockpileZones,
    renderZLevelIndicator,
    renderNavigationIndicators,
    renderMiningDesignations,
    renderWorkerIndicators,
    renderBlockSelection,
    renderRegionSelection
  }), [
    renderLayer,
    renderVoxelWorld,
    renderGhostBlocks,
    renderStockpileZones,
    renderZLevelIndicator,
    renderNavigationIndicators,
    renderMiningDesignations,
    renderWorkerIndicators,
    renderBlockSelection,
    renderRegionSelection
  ]);
};

export { BlockColors, getBlockColor };
