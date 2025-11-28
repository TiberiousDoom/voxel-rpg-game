/**
 * useLootDropRenderer.js - Renders loot drops on canvas
 *
 * Renders:
 * - Gold coins (yellow circles)
 * - Item drops (colored by rarity)
 * - Pickup radius indicators
 * - Floating animation
 */

import { useCallback } from 'react';

// Rarity colors matching Item class
const RARITY_COLORS = {
  COMMON: '#9d9d9d',
  UNCOMMON: '#1eff00',
  RARE: '#0070dd',
  EPIC: '#a335ee',
  LEGENDARY: '#ff8000'
};

/**
 * Hook for rendering loot drops
 * @param {Object} options - Rendering options
 * @returns {Object} - Render functions
 */
export function useLootDropRenderer(options = {}) {
  const {
    tileSize = 40,
    showPickupRadius = false,
    enableAnimation = true,
    debugMode = false
  } = options;

  /**
   * Render all loot drops
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array} lootDrops - Array of loot drop visual data
   * @param {Function} worldToCanvas - Convert world coords to canvas coords
   * @param {number} time - Current time for animation
   */
  const renderLootDrops = useCallback((ctx, lootDrops, worldToCanvas, time = 0) => {
    if (!ctx || !lootDrops || lootDrops.length === 0) return;

    lootDrops.forEach(drop => {
      const canvasPos = worldToCanvas(drop.position.x, drop.position.z);

      // Floating animation
      const floatOffset = enableAnimation ? Math.sin(time * 0.003 + drop.position.x) * 3 : 0;
      const y = canvasPos.y - tileSize / 2 + floatOffset;

      // Draw pickup radius (optional)
      if (showPickupRadius) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const radiusInPixels = (drop.pickupRadius || 2) * tileSize;
        ctx.arc(canvasPos.x, y, radiusInPixels, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (drop.type === 'GOLD') {
        // Render gold coin
        renderGoldCoin(ctx, canvasPos.x, y, tileSize, time);

        // Show amount
        ctx.save();
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(`${drop.amount}g`, canvasPos.x, y + tileSize / 2 + 5);
        ctx.fillText(`${drop.amount}g`, canvasPos.x, y + tileSize / 2 + 5);
        ctx.restore();
      } else if (drop.type === 'ITEM') {
        // Render item
        renderItem(ctx, canvasPos.x, y, tileSize, drop.rarity);

        // Show item name
        if (debugMode) {
          ctx.save();
          ctx.fillStyle = RARITY_COLORS[drop.rarity] || '#fff';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.strokeText(drop.name, canvasPos.x, y + tileSize / 2 + 5);
          ctx.fillText(drop.name, canvasPos.x, y + tileSize / 2 + 5);
          ctx.restore();
        }
      }

      // Debug: Show drop ID
      if (debugMode) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(drop.id.slice(-4), canvasPos.x, y - tileSize / 2 - 5);
        ctx.restore();
      }
    });
  }, [tileSize, showPickupRadius, enableAnimation, debugMode]);

  return {
    renderLootDrops
  };
}

/**
 * Render a gold coin
 */
function renderGoldCoin(ctx, x, y, size, time) {
  ctx.save();

  // Glow effect
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
  gradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Coin body
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(x, y, size / 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Shine effect
  ctx.fillStyle = '#FFF8DC';
  ctx.beginPath();
  ctx.arc(x - size / 12, y - size / 12, size / 8, 0, Math.PI * 2);
  ctx.fill();

  // Spinning animation (optional)
  const spinAngle = (time * 0.002) % (Math.PI * 2);
  const spinScale = Math.abs(Math.cos(spinAngle));

  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, size / 3 * spinScale, size / 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Render an item based on rarity
 */
function renderItem(ctx, x, y, size, rarity) {
  ctx.save();

  const color = RARITY_COLORS[rarity] || '#9d9d9d';

  // Glow effect based on rarity
  const glowSize = size / 2 + (rarity === 'LEGENDARY' ? 10 : rarity === 'EPIC' ? 7 : 5);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
  gradient.addColorStop(0, `${color}80`);
  gradient.addColorStop(0.7, `${color}40`);
  gradient.addColorStop(1, `${color}00`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glowSize, 0, Math.PI * 2);
  ctx.fill();

  // Item body (diamond shape)
  ctx.fillStyle = color;
  ctx.strokeStyle = darkenColor(color);
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x, y - size / 3);
  ctx.lineTo(x + size / 4, y);
  ctx.lineTo(x, y + size / 3);
  ctx.lineTo(x - size / 4, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner detail
  ctx.fillStyle = lightenColor(color);
  ctx.beginPath();
  ctx.moveTo(x, y - size / 6);
  ctx.lineTo(x + size / 8, y);
  ctx.lineTo(x, y + size / 6);
  ctx.lineTo(x - size / 8, y);
  ctx.closePath();
  ctx.fill();

  // Sparkle effect for high rarity
  if (rarity === 'LEGENDARY' || rarity === 'EPIC') {
    ctx.fillStyle = '#FFF';
    const sparkles = rarity === 'LEGENDARY' ? 4 : 3;

    for (let i = 0; i < sparkles; i++) {
      const angle = (i / sparkles) * Math.PI * 2;
      const dist = size / 3;
      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist;

      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Darken a hex color
 */
function darkenColor(hex) {
  const factor = 0.6;
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Lighten a hex color
 */
function lightenColor(hex) {
  const factor = 1.5;
  const r = Math.min(255, Math.floor(parseInt(hex.slice(1, 3), 16) * factor));
  const g = Math.min(255, Math.floor(parseInt(hex.slice(3, 5), 16) * factor));
  const b = Math.min(255, Math.floor(parseInt(hex.slice(5, 7), 16) * factor));
  return `rgb(${r}, ${g}, ${b})`;
}

export default useLootDropRenderer;
