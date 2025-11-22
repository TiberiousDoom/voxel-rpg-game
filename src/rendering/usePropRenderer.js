/**
 * usePropRenderer.js - Prop Rendering Hook
 *
 * Renders environmental props (trees, rocks, etc.) on canvas with:
 * - Sprite batching (group by type for performance)
 * - LOD (Level of Detail) system
 * - Z-sorting for correct depth
 * - Viewport culling
 *
 * Part of Phase 3: Environmental Props & Resources
 */

import { useCallback, useMemo } from 'react';

/**
 * LOD (Level of Detail) thresholds
 */
const LOD_LEVELS = {
  FULL: 0,      // Full detail: 0-20 tiles away
  SIMPLE: 1,    // Simplified: 20-40 tiles away
  HIDDEN: 2     // Hidden: > 40 tiles away
};

const LOD_DISTANCES = {
  FULL_MAX: 20,
  SIMPLE_MAX: 40
};

/**
 * Placeholder colors for props (until sprites are loaded)
 * These provide visual feedback during development
 */
const PROP_COLORS = {
  // Trees
  tree: '#228B22',           // Forest green
  tree_oak: '#8B4513',       // Saddle brown
  tree_pine: '#2F4F2F',      // Dark slate gray
  tree_birch: '#F5DEB3',     // Wheat
  tree_dead: '#696969',      // Dim gray
  tree_swamp: '#556B2F',     // Dark olive green

  // Rocks
  rock: '#808080',           // Gray
  rock_small: '#A9A9A9',     // Dark gray
  rock_large: '#696969',     // Dim gray
  rock_moss: '#6B8E23',      // Olive drab
  rock_ice: '#B0E0E6',       // Powder blue
  rock_desert: '#D2B48C',    // Tan

  // Ore veins
  ore_vein: '#C0C0C0',       // Silver
  ore_iron: '#B87333',       // Copper
  ore_gold: '#FFD700',       // Gold
  ore_crystal: '#9370DB',    // Medium purple

  // Vegetation
  bush: '#90EE90',           // Light green
  bush_berry: '#DC143C',     // Crimson
  bush_dead: '#8B7355',      // Burlywood
  herb: '#32CD32',           // Lime green
  herb_medicinal: '#00FA9A', // Medium spring green
  herb_magical: '#9370DB',   // Medium purple
  mushroom: '#FF6347',       // Tomato
  mushroom_red: '#FF0000',   // Red
  mushroom_brown: '#8B4513', // Saddle brown
  mushroom_poison: '#9400D3',// Dark violet
  mushroom_glowing: '#00FFFF',// Cyan
  flower: '#FF69B4',         // Hot pink
  flower_wildflower: '#FFB6C1',// Light pink
  flower_daisy: '#FFFFFF',   // White

  // Desert
  cactus: '#7CFC00',         // Lawn green
  cactus_saguaro: '#228B22', // Forest green
  cactus_barrel: '#32CD32',  // Lime green

  // Water plants
  reed: '#8FBC8F',           // Dark sea green
  reed_cattail: '#6B8E23',   // Olive drab
  lily: '#FFB6C1',           // Light pink
  lily_water: '#FF69B4',     // Hot pink

  // Decorative
  grass_clump: '#7CFC00',    // Lawn green
  vine: '#228B22',           // Forest green
  vine_hanging: '#556B2F',   // Dark olive green
  bones: '#F5F5DC',          // Beige
  bones_skeleton: '#FFFAF0', // Floral white
  log_fallen: '#8B4513',     // Saddle brown
  ice_crystal: '#87CEEB'     // Sky blue
};

/**
 * Get color for a prop variant
 * @private
 */
const getPropColor = (variant) => {
  return PROP_COLORS[variant] || PROP_COLORS.rock || '#888888';
};

/**
 * Calculate LOD level based on distance from camera
 * @private
 */
const calculateLOD = (propX, propZ, cameraX, cameraZ, tileSize) => {
  const dx = propX * tileSize - cameraX;
  const dz = propZ * tileSize - cameraZ;
  const distanceTiles = Math.sqrt(dx * dx + dz * dz) / tileSize;

  if (distanceTiles <= LOD_DISTANCES.FULL_MAX) {
    return LOD_LEVELS.FULL;
  } else if (distanceTiles <= LOD_DISTANCES.SIMPLE_MAX) {
    return LOD_LEVELS.SIMPLE;
  } else {
    return LOD_LEVELS.HIDDEN;
  }
};

/**
 * Prop rendering hook
 *
 * @param {object} options - Rendering options
 * @param {number} options.tileSize - Size of each tile in pixels
 * @param {boolean} options.enableLOD - Enable LOD system (default: true)
 * @param {boolean} options.enableBatching - Enable sprite batching (default: true)
 * @param {boolean} options.showPropHealth - Show health bars (default: false)
 * @returns {object} Rendering functions
 */
export const usePropRenderer = (options = {}) => {
  const {
    tileSize = 40,
    enableLOD = true,
    enableBatching = true,
    showPropHealth = false
  } = options;

  /**
   * Render props within viewport
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<Prop>} props - Props to render
   * @param {function} worldToCanvas - World to canvas coordinate converter
   * @param {object} camera - Camera position {x, z}
   * @param {object} viewportBounds - Visible area {left, right, top, bottom}
   * @returns {object} Rendering statistics
   */
  const renderProps = useCallback((ctx, props, worldToCanvas, camera, viewportBounds) => {
    if (!ctx || !props || props.length === 0 || !worldToCanvas) {
      return { propsRendered: 0, propsCulled: 0 };
    }

    let propsRendered = 0;
    let propsCulled = 0;

    ctx.save();

    // Step 1: Filter and sort props
    const visibleProps = [];

    for (const prop of props) {
      // Viewport culling
      if (prop.x < viewportBounds.left || prop.x > viewportBounds.right ||
          prop.z < viewportBounds.top || prop.z > viewportBounds.bottom) {
        propsCulled++;
        continue;
      }

      // LOD culling (if enabled)
      if (enableLOD) {
        const lod = calculateLOD(prop.x, prop.z, camera.x, camera.z, tileSize);
        if (lod === LOD_LEVELS.HIDDEN) {
          propsCulled++;
          continue;
        }
        prop._lod = lod; // Cache LOD level
      } else {
        prop._lod = LOD_LEVELS.FULL;
      }

      // Calculate canvas position and depth (for Z-sorting)
      const canvasPos = worldToCanvas(prop.x, prop.z);
      prop._canvasX = canvasPos.x;
      prop._canvasY = canvasPos.y;
      prop._depth = prop.z; // Z-coordinate for depth sorting

      visibleProps.push(prop);
    }

    // Step 2: Z-sort props (back to front for correct depth)
    visibleProps.sort((a, b) => a._depth - b._depth);

    // Step 3: Batch props by variant (if enabled)
    if (enableBatching) {
      const batches = new Map();

      for (const prop of visibleProps) {
        const batchKey = `${prop.variant}_${prop._lod}`;
        if (!batches.has(batchKey)) {
          batches.set(batchKey, []);
        }
        batches.get(batchKey).push(prop);
      }

      // Render batches (maintains Z-order within each variant)
      for (const [batchKey, batchProps] of batches.entries()) {
        const [variant, lod] = batchKey.split('_');
        const lodLevel = parseInt(lod);

        for (const prop of batchProps) {
          renderProp(ctx, prop, variant, lodLevel, showPropHealth);
          propsRendered++;
        }
      }
    } else {
      // Render props individually (no batching)
      for (const prop of visibleProps) {
        renderProp(ctx, prop, prop.variant, prop._lod, showPropHealth);
        propsRendered++;
      }
    }

    ctx.restore();

    return {
      propsRendered,
      propsCulled,
      totalProps: props.length
    };
  }, [tileSize, enableLOD, enableBatching, showPropHealth]);

  /**
   * Render a single prop
   * @private
   */
  const renderProp = (ctx, prop, variant, lod, showHealth) => {
    const x = prop._canvasX;
    const y = prop._canvasY;

    // Get prop color (placeholder until sprites are implemented)
    const color = getPropColor(variant);

    // Render based on LOD level
    if (lod === LOD_LEVELS.FULL) {
      // Full detail rendering
      renderFullDetailProp(ctx, x, y, tileSize, color, prop, showHealth);
    } else {
      // Simplified rendering (LOD_LEVELS.SIMPLE)
      renderSimpleProp(ctx, x, y, tileSize, color);
    }
  };

  /**
   * Render prop in full detail
   * @private
   */
  const renderFullDetailProp = (ctx, x, y, size, color, prop, showHealth) => {
    ctx.fillStyle = color;

    // Different shapes based on prop type
    const type = prop.type;

    if (type === 'tree' || type.startsWith('tree_')) {
      // Tree: trunk + canopy
      // Trunk
      ctx.fillStyle = '#8B4513'; // Brown
      ctx.fillRect(x + size * 0.4, y + size * 0.5, size * 0.2, size * 0.5);

      // Canopy
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + size * 0.5, y + size * 0.3, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'rock' || type.startsWith('rock_') || type.startsWith('ore_')) {
      // Rock/Ore: irregular polygon
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.5, y + size * 0.2);
      ctx.lineTo(x + size * 0.8, y + size * 0.5);
      ctx.lineTo(x + size * 0.7, y + size * 0.9);
      ctx.lineTo(x + size * 0.3, y + size * 0.9);
      ctx.lineTo(x + size * 0.2, y + size * 0.5);
      ctx.closePath();
      ctx.fill();

      // Add shine for ore veins
      if (type.startsWith('ore_')) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x + size * 0.6, y + size * 0.4, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'bush' || type.startsWith('bush_')) {
      // Bush: cluster of circles
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + size * 0.3, y + size * 0.6, size * 0.2, 0, Math.PI * 2);
      ctx.arc(x + size * 0.7, y + size * 0.6, size * 0.2, 0, Math.PI * 2);
      ctx.arc(x + size * 0.5, y + size * 0.4, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'cactus' || type.startsWith('cactus_')) {
      // Cactus: vertical bars
      ctx.fillStyle = color;
      ctx.fillRect(x + size * 0.4, y + size * 0.3, size * 0.2, size * 0.6);
      ctx.fillRect(x + size * 0.2, y + size * 0.5, size * 0.15, size * 0.3);
      ctx.fillRect(x + size * 0.65, y + size * 0.5, size * 0.15, size * 0.3);
    } else if (type === 'mushroom' || type.startsWith('mushroom_')) {
      // Mushroom: cap + stem
      // Stem
      ctx.fillStyle = '#F5DEB3'; // Wheat
      ctx.fillRect(x + size * 0.45, y + size * 0.5, size * 0.1, size * 0.4);

      // Cap
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x + size * 0.5, y + size * 0.5, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow effect for glowing mushrooms
      if (prop.variant === 'mushroom_glowing') {
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.ellipse(x + size * 0.5, y + size * 0.5, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else {
      // Default: simple circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Show health bar (if enabled)
    if (showHealth && prop.harvestable) {
      renderHealthBar(ctx, x, y, size, prop.health, prop.maxHealth);
    }

    // Outline (for visibility)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
  };

  /**
   * Render prop in simplified LOD
   * @private
   */
  const renderSimpleProp = (ctx, x, y, size, color) => {
    // Simple colored square
    ctx.fillStyle = color;
    ctx.fillRect(x + size * 0.25, y + size * 0.25, size * 0.5, size * 0.5);
  };

  /**
   * Render health bar above prop
   * @private
   */
  const renderHealthBar = (ctx, x, y, size, health, maxHealth) => {
    const barWidth = size * 0.8;
    const barHeight = 4;
    const barX = x + size * 0.1;
    const barY = y - 8;
    const healthRatio = health / maxHealth;

    // Background
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

    // Border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  };

  /**
   * Render prop highlights (for selection, interaction)
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Prop} prop - Prop to highlight
   * @param {function} worldToCanvas - World to canvas coordinate converter
   * @param {string} highlightColor - Highlight color (default: yellow)
   */
  const renderPropHighlight = useCallback((ctx, prop, worldToCanvas, highlightColor = 'rgba(255, 255, 0, 0.5)') => {
    if (!ctx || !prop || !worldToCanvas) return;

    const canvasPos = worldToCanvas(prop.x, prop.z);

    ctx.save();
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(canvasPos.x, canvasPos.y, tileSize, tileSize);

    // Pulsing effect
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.lineWidth = 6;
    ctx.strokeRect(
      canvasPos.x - 3,
      canvasPos.y - 3,
      tileSize + 6,
      tileSize + 6
    );
    ctx.restore();
  }, [tileSize]);

  /**
   * Render LOD debug info
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} stats - Rendering statistics
   * @param {number} x - X position for debug text
   * @param {number} y - Y position for debug text
   */
  const renderDebugInfo = useCallback((ctx, stats, x = 10, y = 10) => {
    if (!ctx || !stats) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, 200, 80);

    ctx.fillStyle = '#00FF00';
    ctx.font = '12px monospace';
    ctx.fillText(`Props Rendered: ${stats.propsRendered}`, x + 10, y + 20);
    ctx.fillText(`Props Culled: ${stats.propsCulled}`, x + 10, y + 40);
    ctx.fillText(`Total Props: ${stats.totalProps}`, x + 10, y + 60);
    ctx.restore();
  }, []);

  return useMemo(() => ({
    renderProps,
    renderPropHighlight,
    renderDebugInfo
  }), [renderProps, renderPropHighlight, renderDebugInfo]);
};
