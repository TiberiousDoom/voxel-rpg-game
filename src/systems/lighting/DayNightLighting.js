/**
 * DayNightLighting.js — Pure logic for day/night lighting calculations
 *
 * No React, no Three.js — just math. Takes timeOfDay (0–1) and returns
 * light intensities, colors, sun position, sky color, and fog color.
 *
 * Lighting is composed multiplicatively:
 *   finalIntensity = baseLighting(timeOfDay) × weatherModifier × shelterModifier
 */

import {
  SUNRISE_START,
  SUNRISE_END,
  SUNSET_START,
  SUNSET_END,
  LIGHT_AMBIENT_NIGHT,
  LIGHT_AMBIENT_DAY,
  LIGHT_DIRECTIONAL_NIGHT,
  LIGHT_DIRECTIONAL_DAY,
} from '../../data/tuning.js';

/**
 * Smoothly interpolate between values using smoothstep.
 * @param {number} edge0 - Start of transition
 * @param {number} edge1 - End of transition
 * @param {number} x - Input value
 * @returns {number} 0–1
 */
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Linearly interpolate between two values.
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Linearly interpolate between two hex color strings.
 * @param {string} color1 - Hex color e.g. '#ff0000'
 * @param {string} color2 - Hex color e.g. '#0000ff'
 * @param {number} t - 0–1
 * @returns {string} Hex color
 */
function lerpColor(color1, color2, t) {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));

  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/**
 * Calculate the "daylight factor" — 0 at night, 1 at full day,
 * with smooth transitions at sunrise/sunset.
 * @param {number} timeOfDay - 0.0–1.0
 * @returns {number} 0.0–1.0
 */
export function getDaylightFactor(timeOfDay) {
  const t = timeOfDay;

  // Sunrise ramp: 0 → 1
  if (t >= SUNRISE_START && t <= SUNRISE_END) {
    return smoothstep(SUNRISE_START, SUNRISE_END, t);
  }
  // Full day
  if (t > SUNRISE_END && t < SUNSET_START) {
    return 1.0;
  }
  // Sunset ramp: 1 → 0
  if (t >= SUNSET_START && t <= SUNSET_END) {
    return 1.0 - smoothstep(SUNSET_START, SUNSET_END, t);
  }
  // Night
  return 0.0;
}

/**
 * Get ambient light intensity for a given time of day.
 * @param {number} timeOfDay - 0.0–1.0
 * @returns {number} Light intensity
 */
export function getAmbientIntensity(timeOfDay) {
  const factor = getDaylightFactor(timeOfDay);
  return lerp(LIGHT_AMBIENT_NIGHT, LIGHT_AMBIENT_DAY, factor);
}

/**
 * Get directional (sun) light intensity.
 * @param {number} timeOfDay - 0.0–1.0
 * @returns {number} Light intensity
 */
export function getDirectionalIntensity(timeOfDay) {
  const factor = getDaylightFactor(timeOfDay);
  return lerp(LIGHT_DIRECTIONAL_NIGHT, LIGHT_DIRECTIONAL_DAY, factor);
}

/**
 * Get sun position for directional light.
 * Sun arcs east→overhead→west during day, below horizon at night.
 * @param {number} timeOfDay - 0.0–1.0
 * @returns {{ x: number, y: number, z: number }}
 */
export function getSunPosition(timeOfDay) {
  // Map timeOfDay to sun angle: 0.25 (sunrise) → 0.75 (sunset)
  // Angle 0 = east horizon, π/2 = overhead, π = west horizon
  const dayFraction = (timeOfDay - SUNRISE_START) / (SUNSET_END - SUNRISE_START);
  const angle = Math.PI * Math.max(0, Math.min(1, dayFraction));

  // Sun moves in XY plane; Z stays fixed
  const x = Math.cos(angle) * 50;
  const y = Math.sin(angle) * 50;
  const z = 25;

  return { x, y: Math.max(-10, y), z };
}

/**
 * Sky color keyframes. Returns interpolated hex color.
 * @param {number} timeOfDay - 0.0–1.0
 * @returns {string} Hex color
 */
export function getSkyColor(timeOfDay) {
  const t = timeOfDay;

  // Define color stops: [timeOfDay, color]
  const stops = [
    [0.00, '#0a0a2e'], // midnight
    [0.15, '#0a0a2e'], // deep night
    [0.20, '#1a1a3e'], // pre-dawn
    [0.25, '#ff7744'], // sunrise peak
    [0.30, '#87ceeb'], // morning
    [0.50, '#87ceeb'], // noon
    [0.70, '#87ceeb'], // afternoon
    [0.75, '#ff6633'], // sunset peak
    [0.80, '#2a1a3e'], // dusk
    [0.85, '#0a0a2e'], // night
    [1.00, '#0a0a2e'], // midnight
  ];

  // Find the two surrounding stops
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const frac = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return lerpColor(c0, c1, frac);
    }
  }

  return '#0a0a2e'; // fallback: night
}

/**
 * Fog color — matches sky but slightly desaturated.
 * @param {number} timeOfDay - 0.0–1.0
 * @returns {string} Hex color
 */
export function getFogColor(timeOfDay) {
  // Fog color matches sky to prevent horizon mismatch
  return getSkyColor(timeOfDay);
}

/**
 * Ambient light color (warm at sunrise/sunset, cool at night, white at noon).
 * @param {number} timeOfDay - 0.0–1.0
 * @returns {string} Hex color
 */
export function getAmbientColor(timeOfDay) {
  const t = timeOfDay;

  // Night: cool blue
  if (t < SUNRISE_START || t >= SUNSET_END) {
    return '#334466';
  }
  // Sunrise transition: warm orange → white
  if (t >= SUNRISE_START && t < SUNRISE_END) {
    const f = smoothstep(SUNRISE_START, SUNRISE_END, t);
    return lerpColor('#ff9966', '#ffffff', f);
  }
  // Day: white
  if (t >= SUNRISE_END && t < SUNSET_START) {
    return '#ffffff';
  }
  // Sunset transition: white → warm orange
  if (t >= SUNSET_START && t < SUNSET_END) {
    const f = smoothstep(SUNSET_START, SUNSET_END, t);
    return lerpColor('#ffffff', '#ff9966', f);
  }

  return '#ffffff';
}

/**
 * Get all lighting parameters for a given time of day.
 * Apply weather and shelter modifiers externally.
 * @param {number} timeOfDay - 0.0–1.0
 * @returns {{ ambientIntensity: number, ambientColor: string, directionalIntensity: number, sunPosition: {x,y,z}, skyColor: string, fogColor: string, daylightFactor: number }}
 */
export function getLightingState(timeOfDay) {
  return {
    ambientIntensity: getAmbientIntensity(timeOfDay),
    ambientColor: getAmbientColor(timeOfDay),
    directionalIntensity: getDirectionalIntensity(timeOfDay),
    sunPosition: getSunPosition(timeOfDay),
    skyColor: getSkyColor(timeOfDay),
    fogColor: getFogColor(timeOfDay),
    daylightFactor: getDaylightFactor(timeOfDay),
  };
}
