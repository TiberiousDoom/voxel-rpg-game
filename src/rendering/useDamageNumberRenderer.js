/**
 * useDamageNumberRenderer.js - Damage number rendering hook
 *
 * Renders floating damage numbers above entities
 */

import { useCallback } from 'react';

/**
 * Hook for rendering damage numbers
 * @param {Object} options - Renderer options
 * @param {number} options.tileSize - Size of each tile in pixels
 * @returns {Object} Renderer functions
 */
export function useDamageNumberRenderer(options = {}) {
  const { tileSize = 32 } = options;

  /**
   * Render all damage numbers
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array} damageNumbers - Array of damage number objects
   * @param {Function} worldToCanvas - World to canvas coordinate converter
   * @param {number} currentTime - Current time in ms (performance.now())
   */
  const renderDamageNumbers = useCallback((ctx, damageNumbers, worldToCanvas, currentTime) => {
    if (!damageNumbers || damageNumbers.length === 0) return;

    damageNumbers.forEach(damageNum => {
      // Calculate age and opacity
      const age = currentTime - (damageNum.id || currentTime);
      const maxAge = 1500; // 1.5 seconds lifetime

      if (age > maxAge) {
        // Will be cleaned up by game loop
        return;
      }

      const opacity = Math.max(0, 1 - (age / maxAge));
      const rise = age * 0.05; // Float upward

      // Convert world position to canvas
      const canvasPos = worldToCanvas(damageNum.x, damageNum.z);

      // Apply rise effect
      const y = canvasPos.y - rise;

      // Determine color and size based on damage type
      let color = '#ffffff';
      let fontSize = 20;

      if (damageNum.isCrit) {
        color = '#ffff00'; // Yellow for crits
        fontSize = 28;
      } else if (damageNum.type === 'player') {
        color = '#ff4444'; // Red for player damage to monsters
        fontSize = 22;
      } else if (damageNum.type === 'enemy') {
        color = '#ff8800'; // Orange for enemy damage to player
        fontSize = 20;
      } else if (damageNum.type === 'heal') {
        color = '#00ff00'; // Green for healing
        fontSize = 18;
      }

      // Apply opacity
      ctx.globalAlpha = opacity;

      // Draw shadow for readability
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText(damageNum.damage.toString(), canvasPos.x + 2, y + 2);

      // Draw damage text
      ctx.fillStyle = color;
      ctx.fillText(damageNum.damage.toString(), canvasPos.x, y);

      // Add "CRIT!" text for critical hits
      if (damageNum.isCrit) {
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#ffff00';
        ctx.fillText('CRIT!', canvasPos.x, y - 20);
      }

      // Reset alpha
      ctx.globalAlpha = 1.0;
    });
  }, []); // tileSize not used in callback

  return {
    renderDamageNumbers
  };
}

export default useDamageNumberRenderer;
