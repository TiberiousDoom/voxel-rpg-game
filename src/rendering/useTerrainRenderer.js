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
 * Water rendering constants
 */
const WaterColor = 'rgba(30, 144, 255, 0.7)';  // Dodger blue with transparency
const DeepWaterColor = 'rgba(0, 105, 148, 0.8)';  // Deeper blue
const WaterLevel = 3;  // Tiles at or below this height are underwater

/**
 * River rendering constants (Phase 3)
 */
const RiverColor = 'rgba(64, 164, 223, 0.85)';  // Bright flowing water blue
const RiverWidth = 2;  // Pixels wider than standard tile for visibility

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
 * Blend biome colors at boundaries for smooth transitions (Phase 3)
 *
 * @param {number} x - Tile X coordinate
 * @param {number} z - Tile Z coordinate
 * @param {string} centerBiome - Center tile biome
 * @param {number} height - Height value for shading
 * @param {object} worldGenerator - World generator for biome queries
 * @param {number} minHeight - Minimum height
 * @param {number} maxHeight - Maximum height
 * @param {number} blendRadius - Radius for blending (default: 2)
 * @returns {string} Blended RGB color string
 */
const getBlendedBiomeColor = (x, z, centerBiome, height, worldGenerator, minHeight = 0, maxHeight = 10, blendRadius = 2) => {
  if (!worldGenerator) {
    return getBiomeColor(centerBiome, height, minHeight, maxHeight);
  }

  // Sample surrounding tiles (4-directional neighbors)
  const neighbors = [
    { dx: -1, dz: 0 },  // Left
    { dx: 1, dz: 0 },   // Right
    { dx: 0, dz: -1 },  // Top
    { dx: 0, dz: 1 }    // Bottom
  ];

  // Collect biomes of neighbors within blend radius
  const neighborBiomes = [];
  for (const { dx, dz } of neighbors) {
    for (let dist = 1; dist <= blendRadius; dist++) {
      const nx = x + dx * dist;
      const nz = z + dz * dist;
      try {
        const neighborBiome = worldGenerator.getBiome(nx, nz);
        if (neighborBiome !== centerBiome) {
          neighborBiomes.push({ biome: neighborBiome, distance: dist });
        }
      } catch (e) {
        // Ignore out-of-bounds tiles
      }
    }
  }

  // If no different biomes nearby, return regular color (no blending needed)
  if (neighborBiomes.length === 0) {
    return getBiomeColor(centerBiome, height, minHeight, maxHeight);
  }

  // Parse center biome color
  const centerColor = getBiomeColor(centerBiome, height, minHeight, maxHeight);
  const centerMatch = centerColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!centerMatch) return centerColor;

  let r = parseInt(centerMatch[1]);
  let g = parseInt(centerMatch[2]);
  let b = parseInt(centerMatch[3]);
  let totalWeight = 1.0;  // Center tile weight

  // Blend with neighbor biomes (closer neighbors have more influence)
  for (const { biome, distance } of neighborBiomes) {
    const neighborColor = getBiomeColor(biome, height, minHeight, maxHeight);
    const neighborMatch = neighborColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (neighborMatch) {
      // Weight decreases with distance (1/distance)
      const weight = 1.0 / (distance * distance * 2);  // Reduced influence for smoother blending
      r += parseInt(neighborMatch[1]) * weight;
      g += parseInt(neighborMatch[2]) * weight;
      b += parseInt(neighborMatch[3]) * weight;
      totalWeight += weight;
    }
  }

  // Normalize by total weight
  r = Math.min(255, Math.floor(r / totalWeight));
  g = Math.min(255, Math.floor(g / totalWeight));
  b = Math.min(255, Math.floor(b / totalWeight));

  return `rgb(${r}, ${g}, ${b})`;
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
 * @param {boolean} options.blendBiomes - Enable biome color blending at boundaries (Phase 3, default: true)
 * @returns {object} Rendering functions
 */
export const useTerrainRenderer = (options = {}) => {
  const {
    tileSize = 40,
    showHeightNumbers = false,
    minHeight = 0,
    maxHeight = 10,
    colorMode = 'biome',  // 'height' or 'biome'
    blendBiomes = true    // Enable biome blending (Phase 3)
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

    // Phase 3: Biome blending mode (per-tile rendering for smooth transitions)
    if (colorMode === 'biome' && blendBiomes && worldGenerator) {
      for (let z = startZ; z <= endZ; z++) {
        for (let x = startX; x <= endX; x++) {
          const height = terrainManager.getHeight(x, z);
          const biome = worldGenerator.getBiome(x, z);

          // Get blended color at biome boundaries
          const color = getBlendedBiomeColor(x, z, biome, height, worldGenerator, minHeight, maxHeight);

          const canvasPos = worldToCanvas(x, z);

          // Only render if within canvas bounds
          if (canvasPos.x < -tileSize || canvasPos.y < -tileSize ||
              canvasPos.x > ctx.canvas.width || canvasPos.y > ctx.canvas.height) {
            continue;
          }

          ctx.fillStyle = color;
          ctx.fillRect(canvasPos.x, canvasPos.y, tileSize, tileSize);
          tilesRendered++;

          // Optional: Show height numbers (performance impact)
          if (showHeightNumbers) {
            ctx.fillStyle = '#000000';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(height.toFixed(1), canvasPos.x + tileSize / 2, canvasPos.y + tileSize / 2 + 3);
          }
        }
      }
    } else {
      // Batch rendering for performance (original Phase 1/2 behavior)
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
            tilesByColor.set(colorKey, { color, height, tiles: [] });
          }
          tilesByColor.get(colorKey).tiles.push({ x, z });
        }
      }

      // Render tiles grouped by color (minimizes state changes)
      tilesByColor.forEach(({ color, height, tiles }) => {
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
    }

    ctx.restore();

    return tilesRendered;
  }, [tileSize, showHeightNumbers, getCachedColor, colorMode, blendBiomes, minHeight, maxHeight]);

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

  /**
   * Render water overlay on terrain
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {TerrainManager} terrainManager - Terrain manager instance
   * @param {function} worldToCanvas - World to canvas coordinate converter
   * @param {object} viewportBounds - Visible area {left, right, top, bottom}
   * @returns {number} Number of water tiles rendered
   */
  const renderWater = useCallback((ctx, terrainManager, worldToCanvas, viewportBounds) => {
    if (!ctx || !terrainManager || !worldToCanvas) return 0;

    let waterTilesRendered = 0;

    // Render only visible tiles (viewport culling)
    const startX = Math.max(0, viewportBounds.left);
    const endX = Math.min(terrainManager.config.chunkSize * 100, viewportBounds.right);
    const startZ = Math.max(0, viewportBounds.top);
    const endZ = Math.min(terrainManager.config.chunkSize * 100, viewportBounds.bottom);

    ctx.save();

    // Batch water tiles by depth for performance
    const shallowWaterTiles = [];
    const deepWaterTiles = [];

    for (let z = startZ; z <= endZ; z++) {
      for (let x = startX; x <= endX; x++) {
        const height = terrainManager.getHeight(x, z);

        // Render water if below water level
        if (height <= WaterLevel) {
          const canvasPos = worldToCanvas(x, z);

          // Skip if outside canvas bounds
          if (canvasPos.x < -tileSize || canvasPos.y < -tileSize ||
              canvasPos.x > ctx.canvas.width || canvasPos.y > ctx.canvas.height) {
            continue;
          }

          // Categorize by depth
          if (height <= 1) {
            deepWaterTiles.push(canvasPos);
          } else {
            shallowWaterTiles.push(canvasPos);
          }
        }
      }
    }

    // Render deep water (darker blue)
    if (deepWaterTiles.length > 0) {
      ctx.fillStyle = DeepWaterColor;
      deepWaterTiles.forEach(pos => {
        ctx.fillRect(pos.x, pos.y, tileSize, tileSize);
        waterTilesRendered++;
      });
    }

    // Render shallow water (lighter blue)
    if (shallowWaterTiles.length > 0) {
      ctx.fillStyle = WaterColor;
      shallowWaterTiles.forEach(pos => {
        ctx.fillRect(pos.x, pos.y, tileSize, tileSize);
        waterTilesRendered++;
      });
    }

    ctx.restore();

    return waterTilesRendered;
  }, [tileSize]);

  /**
   * Render rivers on terrain (Phase 3)
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<Array<{x, z}>>} rivers - Array of river paths
   * @param {function} worldToCanvas - World to canvas coordinate converter
   * @param {object} viewportBounds - Visible area {left, right, top, bottom}
   * @returns {number} Number of river tiles rendered
   */
  const renderRivers = useCallback((ctx, rivers, worldToCanvas, viewportBounds) => {
    if (!ctx || !rivers || rivers.length === 0 || !worldToCanvas) return 0;

    let riverTilesRendered = 0;

    ctx.save();
    ctx.fillStyle = RiverColor;

    // Render each river path
    for (const riverPath of rivers) {
      if (!riverPath || riverPath.length === 0) continue;

      for (const tile of riverPath) {
        // Only render visible tiles (viewport culling)
        if (tile.x < viewportBounds.left || tile.x > viewportBounds.right ||
            tile.z < viewportBounds.top || tile.z > viewportBounds.bottom) {
          continue;
        }

        const canvasPos = worldToCanvas(tile.x, tile.z);

        // Skip if outside canvas bounds
        if (canvasPos.x < -tileSize || canvasPos.y < -tileSize ||
            canvasPos.x > ctx.canvas.width || canvasPos.y > ctx.canvas.height) {
          continue;
        }

        // Render river tile slightly larger for visibility
        ctx.fillRect(
          canvasPos.x - RiverWidth / 2,
          canvasPos.y - RiverWidth / 2,
          tileSize + RiverWidth,
          tileSize + RiverWidth
        );
        riverTilesRendered++;
      }
    }

    ctx.restore();

    return riverTilesRendered;
  }, [tileSize]);

  // Return memoized functions
  return useMemo(() => ({
    renderTerrain,
    renderWater,
    renderRivers,
    renderChunkBorders,
    renderHeightLegend
  }), [renderTerrain, renderWater, renderRivers, renderChunkBorders, renderHeightLegend]);
};
