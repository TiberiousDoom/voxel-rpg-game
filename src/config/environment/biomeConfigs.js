/**
 * biomeConfigs.js - Biome Configuration Loader
 *
 * Loads and exports all biome configurations from JSON files.
 * Used by BiomeManager to initialize biome properties.
 *
 * Part of Phase 2: Biome System
 *
 * Usage:
 *   import { biomeConfigs, getBiomeConfig } from './biomeConfigs.js';
 *   const plainsConfig = getBiomeConfig('plains');
 */

import plainsConfig from './biomes/plains.json';
import forestConfig from './biomes/forest.json';
import desertConfig from './biomes/desert.json';
import tundraConfig from './biomes/tundra.json';
import mountainsConfig from './biomes/mountains.json';
import swampConfig from './biomes/swamp.json';

/**
 * All biome configurations indexed by biome ID
 */
export const biomeConfigs = {
  plains: plainsConfig,
  forest: forestConfig,
  desert: desertConfig,
  tundra: tundraConfig,
  mountains: mountainsConfig,
  swamp: swampConfig
};

/**
 * Get a specific biome configuration by ID
 * @param {string} biomeId - Biome ID ('plains', 'forest', etc.)
 * @returns {object|null} Biome configuration or null if not found
 */
export function getBiomeConfig(biomeId) {
  return biomeConfigs[biomeId] || null;
}

/**
 * Get all available biome IDs
 * @returns {Array<string>} Array of biome IDs
 */
export function getAllBiomeIds() {
  return Object.keys(biomeConfigs);
}

/**
 * Check if a biome ID exists
 * @param {string} biomeId - Biome ID to check
 * @returns {boolean} True if biome exists
 */
export function biomeExists(biomeId) {
  return biomeId in biomeConfigs;
}

/**
 * Get biome names mapped to IDs
 * @returns {object} Map of biome ID to name
 */
export function getBiomeNames() {
  const names = {};
  for (const [id, config] of Object.entries(biomeConfigs)) {
    names[id] = config.name;
  }
  return names;
}

/**
 * Get biomes by temperature range
 * @param {number} minTemp - Minimum temperature (-1 to 1)
 * @param {number} maxTemp - Maximum temperature (-1 to 1)
 * @returns {Array<object>} Array of biome configs matching range
 */
export function getBiomesByTemperature(minTemp, maxTemp) {
  return Object.values(biomeConfigs).filter(
    config => config.temperature >= minTemp && config.temperature <= maxTemp
  );
}

/**
 * Get biomes by moisture range
 * @param {number} minMoisture - Minimum moisture (-1 to 1)
 * @param {number} maxMoisture - Maximum moisture (-1 to 1)
 * @returns {Array<object>} Array of biome configs matching range
 */
export function getBiomesByMoisture(minMoisture, maxMoisture) {
  return Object.values(biomeConfigs).filter(
    config => config.moisture >= minMoisture && config.moisture <= maxMoisture
  );
}

/**
 * Default export for convenience
 */
export default biomeConfigs;
