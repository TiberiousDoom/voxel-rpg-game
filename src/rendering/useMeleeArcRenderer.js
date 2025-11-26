/**
 * useMeleeArcRenderer.js - Melee attack arc rendering hook
 *
 * Renders sweeping arc effects for melee attacks
 */

import { useCallback, useRef } from 'react';

/**
 * Hook for rendering melee attack arcs
 * @returns {Object} Renderer functions and arc management
 */
export function useMeleeArcRenderer() {
  const arcsRef = useRef([]);

  /**
   * Create a new melee arc effect
   * @param {Object} playerPos - Player position {x, z}
   * @param {Object} targetPos - Target position {x, z}
   * @param {Object} options - Arc options
   */
  const createArc = useCallback((playerPos, targetPos, options = {}) => {
    // Validate inputs
    if (!playerPos || typeof playerPos.x !== 'number' || typeof playerPos.z !== 'number') {
      console.warn('[MeleeArcRenderer] Invalid playerPos:', playerPos);
      return null;
    }
    if (!targetPos || typeof targetPos.x !== 'number' || typeof targetPos.z !== 'number') {
      console.warn('[MeleeArcRenderer] Invalid targetPos:', targetPos);
      return null;
    }

    const {
      color = '#ffffff',
      duration = 250, // ms
      arcWidth = 1.5, // world units
      arcAngle = Math.PI * 0.6, // 108 degrees sweep
    } = options;

    // Calculate direction to target
    const dx = targetPos.x - playerPos.x;
    const dz = targetPos.z - playerPos.z;
    const angle = Math.atan2(dz, dx);

    const arc = {
      id: Date.now() + Math.random(),
      x: playerPos.x,
      z: playerPos.z,
      angle, // Direction facing
      arcWidth,
      arcAngle,
      color,
      startTime: performance.now(),
      duration,
    };

    arcsRef.current.push(arc);
    return arc;
  }, []);

  /**
   * Render all active melee arcs
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Function} worldToCanvas - World to canvas coordinate converter
   * @param {number} tileSize - Tile size in pixels
   * @param {number} currentTime - Current time from performance.now()
   */
  const renderArcs = useCallback((ctx, worldToCanvas, tileSize, currentTime) => {
    // Safety checks
    if (!ctx || !worldToCanvas || !tileSize) return;

    // Filter out expired arcs
    arcsRef.current = arcsRef.current.filter(arc => {
      if (!arc || !arc.startTime || !arc.duration) return false;
      const age = currentTime - arc.startTime;
      return age < arc.duration;
    });

    // Render each arc
    arcsRef.current.forEach(arc => {
      try {
        const age = currentTime - arc.startTime;
        const progress = age / arc.duration; // 0 to 1

        // Animation: arc sweeps and fades out
        const sweepProgress = Math.min(1, progress * 1.5); // Sweep completes at 66% of duration
        const fadeProgress = Math.max(0, (progress - 0.3) / 0.7); // Fade starts at 30%
        const opacity = 1 - fadeProgress;

        if (opacity <= 0) return;

        // Convert world position to canvas
        const canvasPos = worldToCanvas(arc.x, arc.z);
        if (!canvasPos) return;

        // Offset to center of tile
        const centerX = canvasPos.x + tileSize / 2;
        const centerY = canvasPos.y + tileSize / 2;

        // Arc radius in pixels
        const radius = arc.arcWidth * tileSize;

        // Calculate start and end angles for the sweep
        // Arc sweeps from one side to the other
        const halfArc = arc.arcAngle / 2;
        const baseAngle = arc.angle - Math.PI / 2; // Adjust for canvas coordinates

        // Animate the sweep - start narrow, expand to full arc
        const currentSweep = halfArc * sweepProgress;
        const startAngle = baseAngle - currentSweep;
        const endAngle = baseAngle + currentSweep;

        ctx.save();
        ctx.globalAlpha = opacity * 0.8;

        // Draw multiple arc lines for thickness effect
        const lineWidths = [8, 5, 2];
        const colors = [
          arc.color,
          '#ffffff',
          arc.color,
        ];

        lineWidths.forEach((lineWidth, index) => {
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius - index * 3, startAngle, endAngle);
          ctx.strokeStyle = colors[index];
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.stroke();
        });

        // Draw trailing particles/sparkles along the arc edge
        const particleCount = 5;
        for (let i = 0; i < particleCount; i++) {
          const particleProgress = (sweepProgress - i * 0.1);
          if (particleProgress > 0 && particleProgress < 1) {
            const particleAngle = baseAngle + (particleProgress - 0.5) * arc.arcAngle * sweepProgress;
            const px = centerX + Math.cos(particleAngle) * radius;
            const py = centerY + Math.sin(particleAngle) * radius;

            ctx.beginPath();
            ctx.arc(px, py, 3 - i * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = opacity * (1 - i * 0.15);
            ctx.fill();
          }
        }

        ctx.restore();
      } catch (e) {
        // Silently skip this arc if rendering fails
        console.warn('[MeleeArcRenderer] Error rendering arc:', e.message);
      }
    });
  }, []);

  /**
   * Clear all arcs
   */
  const clearArcs = useCallback(() => {
    arcsRef.current = [];
  }, []);

  /**
   * Get current arc count
   */
  const getArcCount = useCallback(() => {
    return arcsRef.current.length;
  }, []);

  return {
    createArc,
    renderArcs,
    clearArcs,
    getArcCount,
  };
}

export default useMeleeArcRenderer;
