/**
 * Persistence Utilities - Foundation Module
 *
 * Handles serialization and deserialization of building data for saving/loading.
 * This ensures consistent save format across the game and prevents data corruption.
 */

import { SAVE_VERSION } from '../../../shared/config';

const SAVE_KEY = 'foundation_buildings';

/**
 * Save building data to localStorage.
 *
 * @param {Object} buildingData - Serialized building data from store
 * @returns {boolean} True if save succeeded
 */
export const saveBuildings = (buildingData) => {
  try {
    const serialized = JSON.stringify(buildingData);
    localStorage.setItem(SAVE_KEY, serialized);
    console.log(`Foundation: Saved ${buildingData.buildings.length} buildings`);
    return true;
  } catch (error) {
    console.error('Foundation: Failed to save buildings', error);
    return false;
  }
};

/**
 * Load building data from localStorage.
 *
 * @returns {Object|null} Deserialized building data, or null if not found
 */
export const loadBuildings = () => {
  try {
    const serialized = localStorage.getItem(SAVE_KEY);
    if (!serialized) {
      console.log('Foundation: No saved buildings found');
      return null;
    }

    const data = JSON.parse(serialized);
    console.log(
      `Foundation: Loaded ${data.buildings?.length || 0} buildings`
    );
    return data;
  } catch (error) {
    console.error('Foundation: Failed to load buildings', error);
    return null;
  }
};

/**
 * Clear all saved building data.
 *
 * @returns {boolean} True if cleared successfully
 */
export const clearSavedBuildings = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
    console.log('Foundation: Cleared saved buildings');
    return true;
  } catch (error) {
    console.error('Foundation: Failed to clear saved buildings', error);
    return false;
  }
};

/**
 * Check if there are saved buildings available.
 *
 * @returns {boolean} True if saved data exists and is valid
 */
export const hasSavedBuildings = () => {
  try {
    const serialized = localStorage.getItem(SAVE_KEY);
    if (!serialized) return false;

    const data = JSON.parse(serialized);
    return data.version === SAVE_VERSION && Array.isArray(data.buildings);
  } catch (error) {
    return false;
  }
};

/**
 * Export buildings to a JSON string for download.
 *
 * Useful for backing up or sharing building layouts.
 *
 * @param {Object} buildingData - Serialized building data
 * @returns {string} JSON string
 */
export const exportBuildingsToJSON = (buildingData) => {
  return JSON.stringify(buildingData, null, 2);
};

/**
 * Import buildings from a JSON string.
 *
 * @param {string} jsonString - JSON data
 * @returns {Object|null} Parsed building data, or null if invalid
 */
export const importBuildingsFromJSON = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);

    // Validate structure
    if (!data.version || !Array.isArray(data.buildings)) {
      console.error('Foundation: Invalid building data format');
      return null;
    }

    if (data.version !== SAVE_VERSION) {
      console.warn(
        `Foundation: Import version ${data.version} may not be compatible`
      );
    }

    return data;
  } catch (error) {
    console.error('Foundation: Failed to parse JSON', error);
    return null;
  }
};

/**
 * Validate building data structure.
 *
 * Ensures loaded data has all required fields.
 *
 * @param {Object} buildingData - Data to validate
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export const validateBuildingData = (buildingData) => {
  const errors = [];

  if (!buildingData) {
    errors.push('Building data is null or undefined');
    return { valid: false, errors };
  }

  if (!buildingData.version) {
    errors.push('Missing version field');
  }

  if (!Array.isArray(buildingData.buildings)) {
    errors.push('buildings field is not an array');
  } else {
    // Validate each building
    buildingData.buildings.forEach((building, index) => {
      if (!building.id) errors.push(`Building ${index}: Missing id`);
      if (!building.type) errors.push(`Building ${index}: Missing type`);
      if (!building.position) {
        errors.push(`Building ${index}: Missing position`);
      } else {
        if (typeof building.position.x !== 'number')
          errors.push(`Building ${index}: Invalid position.x`);
        if (typeof building.position.y !== 'number')
          errors.push(`Building ${index}: Invalid position.y`);
        if (typeof building.position.z !== 'number')
          errors.push(`Building ${index}: Invalid position.z`);
      }
      if (typeof building.rotation !== 'number')
        errors.push(`Building ${index}: Invalid rotation`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Create a backup timestamp.
 *
 * @returns {string} ISO timestamp
 */
export const getBackupTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Compress building data for efficient storage.
 *
 * (Currently just JSON.stringify, but structure is here for future optimization)
 *
 * @param {Object} buildingData - Data to compress
 * @returns {string} Compressed data
 */
export const compressData = (buildingData) => {
  return JSON.stringify(buildingData);
};

/**
 * Decompress building data.
 *
 * @param {string} compressedData - Compressed data string
 * @returns {Object|null} Decompressed data
 */
export const decompressData = (compressedData) => {
  try {
    return JSON.parse(compressedData);
  } catch (error) {
    console.error('Foundation: Failed to decompress data', error);
    return null;
  }
};

/**
 * Migrate building data from older versions.
 *
 * Handles backwards compatibility for save format changes.
 *
 * @param {Object} buildingData - Data to migrate
 * @param {number} fromVersion - Original version
 * @param {number} toVersion - Target version (defaults to SAVE_VERSION)
 * @returns {Object} Migrated data
 */
export const migrateBuildingData = (
  buildingData,
  fromVersion,
  toVersion = SAVE_VERSION
) => {
  let data = { ...buildingData };

  // Add migration steps as versions change
  if (fromVersion < 1) {
    // Example migration
    console.warn('Foundation: Migrating from old save format');
  }

  data.version = toVersion;
  return data;
};
