/**
 * useWeatherRenderer.js - Weather visual effects renderer
 *
 * Phase 3: Weather/Climate System
 *
 * Renders weather particles (rain, snow, fog) on the game canvas
 *
 * Usage:
 *   const { renderWeather } = useWeatherRenderer();
 *   renderWeather(ctx, weatherSystem);
 */

import { useCallback } from 'react';

/**
 * Weather rendering hook
 * @returns {object} Rendering functions
 */
export const useWeatherRenderer = () => {
  /**
   * Render weather effects (particles)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {WeatherSystem} weatherSystem - Weather system instance
   * @returns {number} Number of particles rendered
   */
  const renderWeather = useCallback((ctx, weatherSystem) => {
    if (!ctx || !weatherSystem) return 0;

    const particles = weatherSystem.getParticles();
    if (particles.length === 0) return 0;

    const effects = weatherSystem.getWeatherEffects();

    ctx.save();

    // Set particle style
    ctx.fillStyle = effects.particleColor || 'rgba(255, 255, 255, 0.8)';
    ctx.globalAlpha = effects.opacity || 0.5;

    // Render each particle
    for (const particle of particles) {
      // Rain: vertical lines
      if (weatherSystem.targetWeather === 'rain' || weatherSystem.targetWeather === 'storm') {
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x + particle.vx * 2, particle.y + effects.particleSpeed * 2);
        ctx.strokeStyle = effects.particleColor;
        ctx.lineWidth = effects.particleSize;
        ctx.stroke();
      }
      // Snow/Fog: circles
      else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, effects.particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    return particles.length;
  }, []);

  /**
   * Render weather overlay (tint/darkening)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {WeatherSystem} weatherSystem - Weather system instance
   */
  const renderWeatherOverlay = useCallback((ctx, weatherSystem) => {
    if (!ctx || !weatherSystem) return;

    const weather = weatherSystem.targetWeather;
    const effects = weatherSystem.getWeatherEffects();

    // Apply weather tint
    if (weather === 'rain' || weather === 'storm') {
      ctx.save();
      ctx.fillStyle = `rgba(50, 100, 150, ${effects.opacity * 0.3})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    } else if (weather === 'fog') {
      ctx.save();
      ctx.fillStyle = `rgba(200, 200, 200, ${effects.opacity * 0.4})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }, []);

  return {
    renderWeather,
    renderWeatherOverlay
  };
};
