/**
 * useBiomeTransitionRenderer.js
 * Renders smooth visual transitions between biomes
 *
 * Phase 3C: Advanced Biome Features
 *
 * Features:
 * - Color interpolation between multiple biomes
 * - Transition zone overlays
 * - Biome-specific particle effects
 * - Gradient rendering at boundaries
 */

import { useCallback, useMemo } from 'react';

/**
 * Interpolate between colors based on weights
 * @param {Array<{biome: string, weight: number}>} blendedBiomes - Biome blend data
 * @param {object} biomeConfigs - Biome color configurations
 * @returns {string} Blended color (hex)
 */
export function blendBiomeColors(blendedBiomes, biomeConfigs) {
  if (!blendedBiomes || blendedBiomes.length === 0) {
    return '#88AA88'; // Default green
  }

  // Single biome - no blending needed
  if (blendedBiomes.length === 1 || blendedBiomes[0].weight > 0.95) {
    const biomeConfig = biomeConfigs[blendedBiomes[0].biome];
    return biomeConfig?.color || '#88AA88';
  }

  // Blend multiple biomes
  let r = 0, g = 0, b = 0;

  for (const { biome, weight } of blendedBiomes) {
    const biomeConfig = biomeConfigs[biome];
    if (!biomeConfig || !biomeConfig.color) continue;

    const color = biomeConfig.color;
    const rgb = hexToRgb(color);

    r += rgb.r * weight;
    g += rgb.g * weight;
    b += rgb.b * weight;
  }

  return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 136, g: 170, b: 136 };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Hook for rendering biome transitions
 */
export const useBiomeTransitionRenderer = (options = {}) => {
  const {
    showTransitionOverlay = false,
    transitionThreshold = 0.7, // Show overlay if primary biome < 70%
    overlayOpacity = 0.15,
  } = options;

  /**
   * Render transition overlay at biome boundaries
   * Creates a visual gradient effect
   */
  const renderTransitionOverlay = useCallback((ctx, x, z, blendedBiomes, worldToCanvas, tileSize) => {
    if (!showTransitionOverlay || !blendedBiomes || blendedBiomes.length < 2) {
      return;
    }

    // Only show overlay if we're in a transition zone (primary biome < threshold)
    if (blendedBiomes[0].weight >= transitionThreshold) {
      return;
    }

    const canvasPos = worldToCanvas(x, z);

    // Create radial gradient for smooth transition
    const gradient = ctx.createRadialGradient(
      canvasPos.x + tileSize / 2,
      canvasPos.y + tileSize / 2,
      0,
      canvasPos.x + tileSize / 2,
      canvasPos.y + tileSize / 2,
      tileSize * 1.5
    );

    // Add colors from blended biomes
    gradient.addColorStop(0, `rgba(255, 255, 255, ${overlayOpacity})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(canvasPos.x, canvasPos.y, tileSize, tileSize);
  }, [showTransitionOverlay, transitionThreshold, overlayOpacity]);

  /**
   * Get transition zone strength (0-1)
   * 0 = pure biome, 1 = maximum transition
   */
  const getTransitionStrength = useCallback((blendedBiomes) => {
    if (!blendedBiomes || blendedBiomes.length < 2) {
      return 0;
    }

    // Transition strength is inverse of primary biome weight
    return 1 - blendedBiomes[0].weight;
  }, []);

  /**
   * Render transition zone indicators (debug mode)
   */
  const renderTransitionDebug = useCallback((ctx, x, z, blendedBiomes, worldToCanvas, tileSize, biomeConfigs) => {
    if (!blendedBiomes || blendedBiomes.length < 2) return;

    const canvasPos = worldToCanvas(x, z);
    const strength = getTransitionStrength(blendedBiomes);

    if (strength < 0.1) return; // Skip if minimal transition

    // Draw transition indicator
    ctx.save();

    // Border color based on transition strength
    ctx.strokeStyle = `rgba(255, 255, 0, ${strength})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasPos.x + 1, canvasPos.y + 1, tileSize - 2, tileSize - 2);

    // Show biome weights (top 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';

    const text = blendedBiomes.slice(0, 2)
      .map(b => `${b.biome.substring(0, 3)}:${(b.weight * 100).toFixed(0)}%`)
      .join(' ');

    ctx.fillText(text, canvasPos.x + tileSize / 2, canvasPos.y + tileSize / 2);

    ctx.restore();
  }, [getTransitionStrength]);

  /**
   * Get biome-specific particle effects for transitions
   */
  const getTransitionParticles = useCallback((blendedBiomes) => {
    if (!blendedBiomes || blendedBiomes.length < 2) {
      return [];
    }

    const particles = [];

    // Add particles based on biome combinations
    const primary = blendedBiomes[0].biome;
    const secondary = blendedBiomes[1].biome;

    // Desert → Forest/Plains: Dust particles
    if ((primary === 'desert' && (secondary === 'forest' || secondary === 'plains')) ||
        (secondary === 'desert' && (primary === 'forest' || primary === 'plains'))) {
      particles.push({
        type: 'dust',
        color: '#D2B48C',
        density: 0.2,
        speed: 0.5
      });
    }

    // Ocean → Beach: Water spray
    if ((primary === 'ocean' && secondary === 'beach') ||
        (secondary === 'ocean' && primary === 'beach')) {
      particles.push({
        type: 'spray',
        color: '#ADD8E6',
        density: 0.3,
        speed: 0.8
      });
    }

    // Tundra → Forest/Plains: Snow particles
    if ((primary === 'tundra' && (secondary === 'forest' || secondary === 'plains')) ||
        (secondary === 'tundra' && (primary === 'forest' || primary === 'plains'))) {
      particles.push({
        type: 'snow',
        color: '#FFFFFF',
        density: 0.15,
        speed: 0.3
      });
    }

    return particles;
  }, []);

  return {
    blendBiomeColors,
    renderTransitionOverlay,
    renderTransitionDebug,
    getTransitionStrength,
    getTransitionParticles,
  };
};

export default useBiomeTransitionRenderer;
