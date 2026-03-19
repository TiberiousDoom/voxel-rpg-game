/**
 * useStockpileRenderer.js - React hook for rendering stockpile contents
 *
 * Renders resource items on stockpile ground as small colored squares.
 * Follows the same canvas-based pattern as useBuildingRenderer.
 */

import { useCallback } from 'react';

// Resource type → display color
const RESOURCE_COLORS = {
  wood: '#8B4513',
  stone: '#808080',
  gold: '#FFD700',
  iron: '#B0B0B0',
  coal: '#333333',
  food: '#228B22',
  essence: '#9B30FF',
  crystal: '#00CED1',
  diamond: '#B9F2FF',
};

// Resource type → short label
const RESOURCE_LABELS = {
  wood: 'W',
  stone: 'S',
  gold: 'G',
  iron: 'Fe',
  coal: 'C',
  food: 'F',
  essence: 'Es',
  crystal: 'Cr',
  diamond: 'D',
};

/**
 * Custom hook for stockpile item rendering
 * @returns {Object} Renderer functions
 */
export function useStockpileRenderer() {
  /**
   * Render stockpile contents on canvas.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} stockpileContents - Map of stockpileId → contents from StockpileManager.getAllContents()
   * @param {Array} zones - Stockpile zones from ZoneManager
   * @param {Function} worldToCanvas - Convert world coords to canvas coords
   * @param {Object} [viewportBounds] - Optional viewport bounds for culling
   * @returns {number} Number of stockpiles rendered
   */
  const renderStockpiles = useCallback((ctx, stockpileContents, zones, worldToCanvas, viewportBounds = null) => {
    if (!ctx || !stockpileContents || !zones) return 0;

    let renderedCount = 0;

    for (const zone of zones) {
      if (!zone || !zone.active || zone.type !== 'STOCKPILE') continue;

      const contents = stockpileContents[zone.id];
      if (!contents || !contents.contents) continue;

      const { min, max } = zone.bounds;

      // Viewport culling
      if (viewportBounds) {
        if (max.x < viewportBounds.left || min.x > viewportBounds.right ||
            max.z < viewportBounds.top || min.z > viewportBounds.bottom) {
          continue;
        }
      }

      // Render resource item indicators within the zone
      const topLeft = worldToCanvas(min.x, min.z);
      const bottomRight = worldToCanvas(max.x, max.z);
      const zoneWidth = bottomRight.x - topLeft.x;
      const zoneHeight = bottomRight.y - topLeft.y;

      // Draw resource summary at center of zone
      const resourceTypes = Object.entries(contents.contents)
        .filter(([, qty]) => qty > 0)
        .sort((a, b) => b[1] - a[1]); // Sort by quantity descending

      if (resourceTypes.length === 0) continue;

      const centerX = topLeft.x + zoneWidth / 2;
      const centerY = topLeft.y + zoneHeight / 2;

      // Draw small colored squares for each resource type
      const itemSize = Math.min(14, Math.max(8, zoneWidth / (resourceTypes.length + 1)));
      const spacing = itemSize + 2;
      const totalWidth = resourceTypes.length * spacing - 2;
      let drawX = centerX - totalWidth / 2;

      for (const [resourceType, quantity] of resourceTypes) {
        const color = RESOURCE_COLORS[resourceType] || '#888888';
        const label = RESOURCE_LABELS[resourceType] || '?';

        // Item square
        ctx.fillStyle = color;
        ctx.fillRect(drawX, centerY - itemSize / 2, itemSize, itemSize);

        // Item border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, centerY - itemSize / 2, itemSize, itemSize);

        // Quantity label below
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${quantity}`, drawX + itemSize / 2, centerY + itemSize / 2 + 2);

        drawX += spacing;
      }

      // Slot usage label
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(
        `${contents.usedSlots}/${contents.totalSlots} slots`,
        centerX,
        centerY - itemSize / 2 - 12
      );

      renderedCount++;
    }

    return renderedCount;
  }, []);

  return {
    renderStockpiles,
  };
}

export default useStockpileRenderer;
