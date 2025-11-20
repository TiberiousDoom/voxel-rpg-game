/**
 * useTerrainRenderer.js - Terrain rendering hook for GameViewport
 *
 * Renders procedurally generated terrain with:
 * - Color-coded height visualization
 * - Chunk-based rendering with viewport culling
 * - Biome-based coloring (Phase 2+)
 * - Performance optimized for 60 FPS
 *
 * Part of Phase 1: Core Terrain Generation System
 */

import { useCallback, useRef, useMemo } from 'react';

/**
 * Get terrain tile color based on height
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
 * @param {boolean} options.showGrid - Show height values on tiles (default: false)
 * @param {boolean} options.showHeightNumbers - Show numeric height values (default: false)
 * @param {number} options.minHeight - Minimum terrain height (default: 0)
 * @param {number} options.maxHeight - Maximum terrain height (default: 10)
 * @returns {object} Rendering functions
 */
export const useTerrainRenderer = (options = {}) => {
  const {
    tileSize = 40,
    showGrid = false,
    showHeightNumbers = false,
    minHeight = 0,
    maxHeight = 10
  } = options;

  // Cache for tile colors to avoid recalculation
  const colorCacheRef = useRef(new Map());

  /**
   * Get cached color for height value
   */
  const getCachedColor = useCallback((height) => {
    const key = `${height}`;
    if (!colorCacheRef.current.has(key)) {
      colorCacheRef.current.set(key, getHeightColor(height, minHeight, maxHeight));
    }
    return colorCacheRef.current.get(key);
  }, [minHeight, maxHeight]);

  /**
   * Render terrain within viewport bounds
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {TerrainManager} terrainManager - Terrain manager instance
   * @param {function} worldToCanvas - World to canvas coordinate converter
   * @param {object} viewportBounds - Visible area {left, right, top, bottom}
   * @returns {number} Number of tiles rendered
   */
  const renderTerrain = useCallback((ctx, terrainManager, worldToCanvas, viewportBounds) => {
    if (!ctx || !terrainManager || !worldToCanvas) return 0;

    let tilesRendered = 0;

    // Render only visible tiles (viewport culling)
    const startX = Math.max(0, viewportBounds.left);
    const endX = Math.min(terrainManager.config.chunkSize * 100, viewportBounds.right); // Arbitrary large world
    const startZ = Math.max(0, viewportBounds.top);
    const endZ = Math.min(terrainManager.config.chunkSize * 100, viewportBounds.bottom);

    ctx.save();

    // Batch rendering for performance
    // Group tiles by height to minimize fillStyle changes
    const tilesByHeight = new Map();

    for (let z = startZ; z <= endZ; z++) {
      for (let x = startX; x <= endX; x++) {
        const height = terrainManager.getHeight(x, z);

        if (!tilesByHeight.has(height)) {
          tilesByHeight.set(height, []);
        }
        tilesByHeight.get(height).push({ x, z });
      }
    }

    // Render tiles grouped by height (minimizes state changes)
    tilesByHeight.forEach((tiles, height) => {
      const color = getCachedColor(height);
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
  }, [tileSize, showHeightNumbers, getCachedColor]);

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
