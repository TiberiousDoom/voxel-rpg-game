/**
 * useZoneRenderer.js - React hook for rendering zone overlays
 *
 * Renders semi-transparent colored rectangles on the game canvas
 * to visualize designated zones (mining, stockpile, farming, etc.).
 * Follows the same pattern as useBuildingRenderer.
 */

import { useCallback } from 'react';

// Zone type → color mapping
const ZONE_COLORS = {
  MINING: { r: 255, g: 165, b: 0, a: 0.3 },      // Orange
  STOCKPILE: { r: 65, g: 135, b: 255, a: 0.3 },   // Blue
  FARMING: { r: 50, g: 205, b: 50, a: 0.3 },       // Green
  BUILDING: { r: 255, g: 220, b: 50, a: 0.3 },     // Yellow
  RESTRICTED: { r: 220, g: 50, b: 50, a: 0.4 },    // Red (slightly more visible)
};

const ZONE_BORDER_COLORS = {
  MINING: 'rgba(255, 165, 0, 0.7)',
  STOCKPILE: 'rgba(65, 135, 255, 0.7)',
  FARMING: 'rgba(50, 205, 50, 0.7)',
  BUILDING: 'rgba(255, 220, 50, 0.7)',
  RESTRICTED: 'rgba(220, 50, 50, 0.8)',
};

/**
 * Custom hook for zone overlay rendering
 * @returns {Object} Renderer functions
 */
export function useZoneRenderer() {
  /**
   * Render all zone overlays on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array} zones - Array of zone objects from ZoneManager
   * @param {Function} worldToCanvas - Convert world coords (x, z) to canvas coords
   * @param {Object} [viewportBounds] - Optional viewport bounds for culling
   * @returns {number} Number of zones rendered
   */
  const renderZones = useCallback((ctx, zones, worldToCanvas, viewportBounds = null) => {
    if (!ctx || !zones || !zones.length) return 0;

    let renderedCount = 0;

    for (const zone of zones) {
      if (!zone || !zone.active || !zone.bounds) continue;

      const { min, max } = zone.bounds;

      // Viewport culling (using x/z as the ground plane)
      if (viewportBounds) {
        if (max.x < viewportBounds.left || min.x > viewportBounds.right ||
            max.z < viewportBounds.top || min.z > viewportBounds.bottom) {
          continue;
        }
      }

      // Convert zone corners to canvas coordinates
      const topLeft = worldToCanvas(min.x, min.z);
      const bottomRight = worldToCanvas(max.x, max.z);

      const width = bottomRight.x - topLeft.x;
      const height = bottomRight.y - topLeft.y;

      if (Math.abs(width) < 1 || Math.abs(height) < 1) continue;

      // Draw filled overlay
      const color = ZONE_COLORS[zone.type] || ZONE_COLORS.MINING;
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
      ctx.fillRect(topLeft.x, topLeft.y, width, height);

      // Draw border
      ctx.strokeStyle = ZONE_BORDER_COLORS[zone.type] || ZONE_BORDER_COLORS.MINING;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(topLeft.x, topLeft.y, width, height);
      ctx.setLineDash([]);

      // Draw label
      const label = zone.label || zone.type;
      const labelX = topLeft.x + width / 2;
      const labelY = topLeft.y + 14;

      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Label background
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(labelX - textWidth / 2 - 3, labelY - 2, textWidth + 6, 14);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, labelX, labelY);

      renderedCount++;
    }

    return renderedCount;
  }, []);

  /**
   * Render a zone placement preview (during zone designation)
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} start - Start corner { x, z }
   * @param {Object} end - End corner { x, z }
   * @param {string} zoneType - Zone type being placed
   * @param {boolean} isValid - Whether placement is valid
   * @param {Function} worldToCanvas
   */
  const renderPlacementPreview = useCallback((ctx, start, end, zoneType, isValid, worldToCanvas) => {
    if (!ctx || !start || !end) return;

    const topLeft = worldToCanvas(
      Math.min(start.x, end.x),
      Math.min(start.z, end.z)
    );
    const bottomRight = worldToCanvas(
      Math.max(start.x, end.x),
      Math.max(start.z, end.z)
    );

    const width = bottomRight.x - topLeft.x;
    const height = bottomRight.y - topLeft.y;

    if (Math.abs(width) < 1 || Math.abs(height) < 1) return;

    // Preview fill
    const baseColor = isValid
      ? ZONE_COLORS[zoneType] || ZONE_COLORS.MINING
      : { r: 220, g: 50, b: 50, a: 0.3 };

    ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.4)`;
    ctx.fillRect(topLeft.x, topLeft.y, width, height);

    // Preview border (solid, thicker)
    ctx.strokeStyle = isValid
      ? (ZONE_BORDER_COLORS[zoneType] || 'rgba(255, 255, 255, 0.8)')
      : 'rgba(220, 50, 50, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(topLeft.x, topLeft.y, width, height);

    // Size label
    const sizeX = Math.abs(Math.round(end.x - start.x));
    const sizeZ = Math.abs(Math.round(end.z - start.z));
    const sizeLabel = `${sizeX} × ${sizeZ}`;

    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const labelW = ctx.measureText(sizeLabel).width;
    ctx.fillRect(
      topLeft.x + width / 2 - labelW / 2 - 4,
      topLeft.y + height / 2 - 8,
      labelW + 8, 16
    );
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sizeLabel, topLeft.x + width / 2, topLeft.y + height / 2);
  }, []);

  return {
    renderZones,
    renderPlacementPreview,
  };
}

export default useZoneRenderer;
