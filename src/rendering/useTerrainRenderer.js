/**
 * useTerrainRenderer.js - Terrain rendering hook for GameViewport
 *
 * Renders procedurally generated terrain with:
 * - Color-coded height visualization
 * - Biome-based coloring
 * - Chunk-based rendering with viewport culling
 * - Performance optimized for 60 FPS
 *
 * Part of Phase 1: Core Terrain Generation System
 * Enhanced in Phase 2: Biome Visualization
 */

import { useCallback, useRef, useMemo } from 'react';

/**
 * Biome color palette
 * Maps biome types to RGB colors
 */
const BiomeColors = {
  ocean: 'rgb(0, 105, 148)',        // Deep blue
  beach: 'rgb(238, 214, 175)',      // Sandy beige
  plains: 'rgb(124, 252, 0)',       // Bright green
  forest: 'rgb(34, 139, 34)',       // Forest green
  desert: 'rgb(210, 180, 140)',     // Tan
  tundra: 'rgb(230, 230, 250)',     // Light lavender
  mountains: 'rgb(139, 137, 137)',  // Gray
  hills: 'rgb(107, 142, 35)'        // Olive green
};

/**
 * Get terrain tile color based on biome
 *
 * @param {string} biome - Biome type
 * @param {number} height - Height value for shading variation
 * @param {number} minHeight - Minimum height (default: 0)
 * @param {number} maxHeight - Maximum height (default: 10)
 * @returns {string} RGB color string
 */
const getBiomeColor = (biome, height, minHeight = 0, maxHeight = 10) => {
  const baseColor = BiomeColors[biome] || BiomeColors.plains;

  // Add height-based shading for depth (±15% brightness)
  const heightRatio = (height - minHeight) / (maxHeight - minHeight);
  const shadeFactor = 0.85 + (heightRatio * 0.3); // 0.85 to 1.15

  // Parse RGB and apply shading
  const match = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    const r = Math.min(255, Math.floor(parseInt(match[1]) * shadeFactor));
    const g = Math.min(255, Math.floor(parseInt(match[2]) * shadeFactor));
    const b = Math.min(255, Math.floor(parseInt(match[3]) * shadeFactor));
    return `rgb(${r}, ${g}, ${b})`;
  }

  return baseColor;
};

/**
 * Get terrain tile color based on height only (Phase 1 style)
 * Uses green gradient from dark (low) to light (high)
 *
 * @param {number} height - Height value (0-10)
 * @param {number} minHeight - Minimum height in world (default: 0)
 * @param {number} maxHeight - Maximum height in world (default: 10)
 * @returns {string} RGB color string
 */
const getHeightColor = (height, minHeight = 0, maxHeight = 10) => {
  // Normalize height to [0, 1]
  const heightRatio = (height - minHeight) / (maxHeight - minHeight);

  // Green gradient: darker green (low) to lighter green (high)
  // Base: rgb(34, 139, 34) - Forest green
  // Add variation based on height
  const r = Math.floor(34 + heightRatio * 100);   // 34-134
  const g = Math.floor(139 + heightRatio * 80);   // 139-219
  const b = Math.floor(34 + heightRatio * 20);    // 34-54

  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Terrain rendering hook
 * Optimized for mobile and desktop performance
 *
 * @param {object} options - Rendering options
 * @param {number} options.tileSize - Size of each tile in pixels
 * @param {boolean} options.showHeightNumbers - Show numeric height values (default: false)
 * @param {number} options.minHeight - Minimum terrain height (default: 0)
 * @param {number} options.maxHeight - Maximum terrain height (default: 10)
 * @param {string} options.colorMode - 'height' or 'biome' (default: 'biome')
 * @returns {object} Rendering functions
 */
export const useTerrainRenderer = (options = {}) => {
  const {
    tileSize = 40,
    showHeightNumbers = false,
    minHeight = 0,
    maxHeight = 10,
    colorMode = 'biome'  // 'height' or 'biome'
  } = options;

  // Cache for tile colors to avoid recalculation
  const colorCacheRef = useRef(new Map());

  /**
   * Get cached color for tile (height-based or biome-based)
   */
  const getCachedColor = useCallback((height, biome = null) => {
    const key = colorMode === 'biome' ? `${biome}_${height}` : `${height}`;
    if (!colorCacheRef.current.has(key)) {
      const color = colorMode === 'biome' && biome
        ? getBiomeColor(biome, height, minHeight, maxHeight)
        : getHeightColor(height, minHeight, maxHeight);
      colorCacheRef.current.set(key, color);
    }
    return colorCacheRef.current.get(key);
  }, [minHeight, maxHeight, colorMode]);

  /**
   * Render terrain within viewport bounds
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {TerrainManager} terrainManager - Terrain manager instance
   * @param {function} worldToCanvas - World to canvas coordinate converter
   * @param {object} viewportBounds - Visible area {left, right, top, bottom}
   * @param {object} worldGenerator - World generator for biome data (optional)
   * @returns {number} Number of tiles rendered
   */
  const renderTerrain = useCallback((ctx, terrainManager, worldToCanvas, viewportBounds, worldGenerator = null) => {
    if (!ctx || !terrainManager || !worldToCanvas) return 0;

    let tilesRendered = 0;

    // Render only visible tiles (viewport culling)
    const startX = Math.max(0, viewportBounds.left);
    const endX = Math.min(terrainManager.config.chunkSize * 100, viewportBounds.right); // Arbitrary large world
    const startZ = Math.max(0, viewportBounds.top);
    const endZ = Math.min(terrainManager.config.chunkSize * 100, viewportBounds.bottom);

    ctx.save();

    // Batch rendering for performance
    // Group tiles by color key (height or biome+height)
    const tilesByColor = new Map();

    for (let z = startZ; z <= endZ; z++) {
      for (let x = startX; x <= endX; x++) {
        const height = terrainManager.getHeight(x, z);

        // Get biome if in biome mode and worldGenerator available
        let colorKey;
        let color;
        if (colorMode === 'biome' && worldGenerator) {
          const biome = worldGenerator.getBiome(x, z);
          colorKey = `${biome}_${height}`;
          color = getCachedColor(height, biome);
        } else {
          colorKey = `${height}`;
          color = getCachedColor(height);
        }

        if (!tilesByColor.has(colorKey)) {
          tilesByColor.set(colorKey, { color, tiles: [] });
        }
        tilesByColor.get(colorKey).tiles.push({ x, z });
      }
    }

    // Render tiles grouped by color (minimizes state changes)
    tilesByColor.forEach(({ color, tiles }) => {
      ctx.fillStyle = color;

      tiles.forEach(({ x, z }) => {
        const canvasPos = worldToCanvas(x, z);

        // Only render if within canvas bounds (additional culling)
        if (canvasPos.x < -tileSize || canvasPos.y < -tileSize ||
            canvasPos.x > ctx.canvas.width || canvasPos.y > ctx.canvas.height) {
          return;
        }

        ctx.fillRect(canvasPos.x, canvasPos.y, tileSize, tileSize);
        tilesRendered++;

        // Optional: Show height numbers (performance impact)
        if (showHeightNumbers) {
          ctx.save();
          ctx.fillStyle = '#000000';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            height.toString(),
            canvasPos.x + tileSize / 2,
            canvasPos.y + tileSize / 2
          );
          ctx.restore();
        }
      });
    });

    ctx.restore();

    return tilesRendered;
  }, [tileSize, showHeightNumbers, getCachedColor, colorMode]);

  /**
   * Render terrain chunk borders (debug visualization)
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {ChunkManager} chunkManager - Chunk manager instance
   * @param {function} worldToCanvas - World to canvas coordinate converter
   * @param {number} chunkSize - Size of chunks in tiles
   */
  const renderChunkBorders = useCallback((ctx, chunkManager, worldToCanvas, chunkSize = 32) => {
    if (!ctx || !chunkManager || !worldToCanvas) return;

    const activeChunks = chunkManager.getActiveChunks();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;

    activeChunks.forEach(({ x: chunkX, z: chunkZ }) => {
      const worldX = chunkX * chunkSize;
      const worldZ = chunkZ * chunkSize;

      const topLeft = worldToCanvas(worldX, worldZ);
      const bottomRight = worldToCanvas(worldX + chunkSize, worldZ + chunkSize);

      ctx.strokeRect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
      );

      // Draw chunk coordinates
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.font = '12px Arial';
      ctx.fillText(
        `(${chunkX},${chunkZ})`,
        topLeft.x + 5,
        topLeft.y + 15
      );
    });

    ctx.restore();
  }, []);

  /**
   * Render height gradient legend
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - Legend X position
   * @param {number} y - Legend Y position
   * @param {number} width - Legend width
   * @param {number} height - Legend height
   */
  const renderHeightLegend = useCallback((ctx, x, y, width, height) => {
    if (!ctx) return;

    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Terrain Height', x + width / 2, y + 15);

    // Gradient
    const gradientHeight = height - 40;
    const gradientY = y + 25;
    const steps = maxHeight - minHeight + 1;
    const stepHeight = gradientHeight / steps;

    for (let i = 0; i <= steps; i++) {
      const h = minHeight + i;
      const color = getCachedColor(h);
      ctx.fillStyle = color;
      ctx.fillRect(
        x + 10,
        gradientY + (steps - i) * stepHeight,
        width - 20,
        stepHeight + 1
      );
    }

    // Labels
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${maxHeight}`, x + width - 25, gradientY + 5);
    ctx.fillText(`${minHeight}`, x + width - 25, gradientY + gradientHeight);

    ctx.restore();
  }, [minHeight, maxHeight, getCachedColor]);

  // Return memoized functions
  return useMemo(() => ({
    renderTerrain,
    renderChunkBorders,
    renderHeightLegend
  }), [renderTerrain, renderChunkBorders, renderHeightLegend]);
};
