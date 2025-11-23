/**
 * useWaterRenderer.js
 * Renders water bodies, rivers, and water effects
 *
 * Phase 3B: Water Features Enhancement
 *
 * Features:
 * - Water body rendering with depth-based colors
 * - River rendering with flow direction
 * - Water reflections (simplified)
 * - Ripple and wave effects
 * - Shore rendering
 */

import { useCallback, useMemo } from 'react';

/**
 * Water color palette based on depth
 */
const WATER_COLORS = {
  shallow: '#87CEEB',  // Light blue
  medium: '#4682B4',   // Steel blue
  deep: '#1E3A8A',     // Dark blue
  hot_spring: '#FF6B35', // Orange (hot)
  river: '#5FA8D3',    // River blue
};

/**
 * Hook for rendering water
 */
export const useWaterRenderer = (options = {}) => {
  const {
    tileSize = 40,
    showReflections = true,
    showRipples = true,
    showShore = true,
    animationSpeed = 1.0,
  } = options;

  /**
   * Get water color based on depth
   */
  const getWaterColor = useCallback((depth, type = 'lake') => {
    if (type === 'hot_spring') {
      return WATER_COLORS.hot_spring;
    }

    if (depth < 1) {
      return WATER_COLORS.shallow;
    } else if (depth < 2) {
      return WATER_COLORS.medium;
    } else {
      return WATER_COLORS.deep;
    }
  }, []);

  /**
   * Render water bodies (lakes, ponds, pools)
   */
  const renderWaterBodies = useCallback((ctx, waterBodies, worldToCanvas, time = 0) => {
    let rendered = 0;

    for (const waterBody of waterBodies) {
      const centerPos = worldToCanvas(waterBody.position.x, waterBody.position.z);

      // Calculate water color based on depth
      const baseColor = getWaterColor(waterBody.depth, waterBody.type);

      // Draw water circle with radial gradient
      ctx.save();

      const gradient = ctx.createRadialGradient(
        centerPos.x, centerPos.y, 0,
        centerPos.x, centerPos.y, waterBody.radius * tileSize
      );

      // Parse color and create gradient
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(0.7, baseColor);

      // Darker at edges
      const darkerColor = adjustBrightness(baseColor, -20);
      gradient.addColorStop(1, darkerColor);

      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.arc(centerPos.x, centerPos.y, waterBody.radius * tileSize, 0, Math.PI * 2);
      ctx.fill();

      // Add animated ripples if enabled
      if (showRipples) {
        renderRipples(ctx, centerPos.x, centerPos.y, waterBody.radius * tileSize, time);
      }

      // Render shore if enabled and available
      if (showShore && waterBody.shore && waterBody.shore.length > 0) {
        renderShore(ctx, waterBody.shore, worldToCanvas, tileSize);
      }

      ctx.restore();
      rendered++;
    }

    return { waterBodiesRendered: rendered };
  }, [getWaterColor, showRipples, showShore, tileSize]);

  /**
   * Render rivers
   */
  const renderRivers = useCallback((ctx, rivers, worldToCanvas, time = 0) => {
    let rendered = 0;

    for (const river of rivers) {
      if (river.segments.length < 2) continue;

      ctx.save();
      ctx.strokeStyle = WATER_COLORS.river;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw river path
      ctx.beginPath();

      for (let i = 0; i < river.segments.length; i++) {
        const segment = river.segments[i];
        const canvasPos = worldToCanvas(segment.x, segment.z);

        ctx.lineWidth = segment.width * tileSize;

        if (i === 0) {
          ctx.moveTo(canvasPos.x, canvasPos.y);
        } else {
          ctx.lineTo(canvasPos.x, canvasPos.y);
        }
      }

      ctx.stroke();

      // Add flow direction indicators (animated dots)
      if (time) {
        renderFlowIndicators(ctx, river, worldToCanvas, tileSize, time);
      }

      ctx.restore();
      rendered++;
    }

    return { riversRendered: rendered };
  }, [tileSize]);

  /**
   * Render water reflections (simplified)
   */
  const renderReflections = useCallback((ctx, waterBodies, worldToCanvas) => {
    if (!showReflections) return;

    for (const waterBody of waterBodies) {
      const centerPos = worldToCanvas(waterBody.position.x, waterBody.position.z);

      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';

      // Simple shine effect
      const shineRadius = waterBody.radius * tileSize * 0.3;
      ctx.beginPath();
      ctx.arc(
        centerPos.x - shineRadius * 0.3,
        centerPos.y - shineRadius * 0.3,
        shineRadius,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
    }
  }, [showReflections, tileSize]);

  /**
   * Render water surface effects
   */
  const renderWaterSurface = useCallback((ctx, x, z, worldToCanvas, time = 0) => {
    const canvasPos = worldToCanvas(x, z);

    // Animated wave pattern
    const waveOffset = Math.sin(time * 0.001 + x * 0.1 + z * 0.1) * 2;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(canvasPos.x, canvasPos.y + waveOffset);
    ctx.lineTo(canvasPos.x + tileSize, canvasPos.y + waveOffset);
    ctx.stroke();

    ctx.restore();
  }, [tileSize]);

  return {
    renderWaterBodies,
    renderRivers,
    renderReflections,
    renderWaterSurface,
    getWaterColor,
  };
};

/**
 * Render animated ripples
 */
function renderRipples(ctx, centerX, centerY, maxRadius, time) {
  const numRipples = 3;
  const rippleSpeed = 0.001;

  for (let i = 0; i < numRipples; i++) {
    const phase = (i / numRipples) * Math.PI * 2;
    const rippleProgress = ((time * rippleSpeed + phase) % 1);
    const rippleRadius = maxRadius * rippleProgress;
    const rippleAlpha = 1 - rippleProgress;

    ctx.save();
    ctx.globalAlpha = rippleAlpha * 0.3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Render shore
 */
function renderShore(ctx, shore, worldToCanvas, tileSize) {
  ctx.save();
  ctx.fillStyle = '#D2B48C'; // Sandy color
  ctx.strokeStyle = '#C2A47C';
  ctx.lineWidth = tileSize * 0.2;

  ctx.beginPath();

  for (let i = 0; i < shore.length; i++) {
    const point = shore[i];
    const canvasPos = worldToCanvas(point.x, point.z);

    if (i === 0) {
      ctx.moveTo(canvasPos.x, canvasPos.y);
    } else {
      ctx.lineTo(canvasPos.x, canvasPos.y);
    }
  }

  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Render flow direction indicators for rivers
 */
function renderFlowIndicators(ctx, river, worldToCanvas, tileSize, time) {
  const flowSpeed = 0.002;
  const dotSpacing = 10; // One dot every N segments

  for (let i = 0; i < river.segments.length; i += dotSpacing) {
    const segment = river.segments[i];
    const canvasPos = worldToCanvas(segment.x, segment.z);

    // Animated offset along flow direction
    const offset = ((time * flowSpeed * segment.flow) % 1) * tileSize;

    // Get next segment for direction
    const nextSegment = river.segments[Math.min(i + 1, river.segments.length - 1)];
    const dx = nextSegment.x - segment.x;
    const dz = nextSegment.z - segment.z;
    const angle = Math.atan2(dz, dx);

    const dotX = canvasPos.x + Math.cos(angle) * offset;
    const dotY = canvasPos.y + Math.sin(angle) * offset;

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    ctx.beginPath();
    ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Adjust color brightness
 */
function adjustBrightness(hexColor, percent) {
  const num = parseInt(hexColor.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));

  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export default useWaterRenderer;
