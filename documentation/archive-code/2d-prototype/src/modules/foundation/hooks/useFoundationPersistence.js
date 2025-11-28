/**
 * useFoundationPersistence Hook - Foundation Module
 *
 * Manages saving and loading of building data.
 * Handles persistence to localStorage and serialization.
 *
 * Usage:
 *   const { saveGame, loadGame, canLoad } = useFoundationPersistence();
 *   saveGame();
 *   if (canLoad()) { loadGame(); }
 */

import { useCallback } from 'react';
import { useFoundationStore } from '../stores/useFoundationStore';
import * as persistence from '../utils/persistence';

export const useFoundationPersistence = () => {
  const serializeBuildings = useFoundationStore((state) => state.serializeBuildings);
  const deserializeBuildings = useFoundationStore((state) => state.deserializeBuildings);
  const clearAllBuildings = useFoundationStore((state) => state.clearAllBuildings);

  /**
   * Save all buildings to storage.
   *
   * @returns {boolean} True if save succeeded
   */
  const saveGame = useCallback(() => {
    try {
      const buildingData = serializeBuildings();
      const success = persistence.saveBuildings(buildingData);

      if (success) {
        console.log('Foundation: Game saved successfully');
      }

      return success;
    } catch (error) {
      console.error('Foundation: Failed to save game', error);
      return false;
    }
  }, [serializeBuildings]);

  /**
   * Load all buildings from storage.
   *
   * @returns {boolean} True if load succeeded
   */
  const loadGame = useCallback(() => {
    try {
      const buildingData = persistence.loadBuildings();

      if (!buildingData) {
        console.warn('Foundation: No saved game found');
        return false;
      }

      // Validate before loading
      const validation = persistence.validateBuildingData(buildingData);
      if (!validation.valid) {
        console.error('Foundation: Save file validation failed', validation.errors);
        return false;
      }

      // Load into store
      const success = deserializeBuildings(buildingData);

      if (success) {
        console.log('Foundation: Game loaded successfully');
      }

      return success;
    } catch (error) {
      console.error('Foundation: Failed to load game', error);
      return false;
    }
  }, [deserializeBuildings]);

  /**
   * Check if there's a valid save to load.
   *
   * @returns {boolean} True if a valid save exists
   */
  const canLoad = useCallback(() => {
    return persistence.hasSavedBuildings();
  }, []);

  /**
   * Start a new game (clear all buildings).
   */
  const newGame = useCallback(() => {
    clearAllBuildings();
    persistence.clearSavedBuildings();
    console.log('Foundation: New game started');
  }, [clearAllBuildings]);

  /**
   * Export buildings as JSON for backup.
   *
   * @returns {string} JSON string of building data
   */
  const exportAsJSON = useCallback(() => {
    const buildingData = serializeBuildings();
    return persistence.exportBuildingsToJSON(buildingData);
  }, [serializeBuildings]);

  /**
   * Import buildings from JSON.
   *
   * @param {string} jsonString - JSON data to import
   * @returns {boolean} True if import succeeded
   */
  const importFromJSON = useCallback(
    (jsonString) => {
      try {
        const buildingData = persistence.importBuildingsFromJSON(jsonString);

        if (!buildingData) {
          return false;
        }

        // Validate before importing
        const validation = persistence.validateBuildingData(buildingData);
        if (!validation.valid) {
          console.error('Foundation: Import validation failed', validation.errors);
          return false;
        }

        // Load into store
        const success = deserializeBuildings(buildingData);

        if (success) {
          console.log('Foundation: Buildings imported successfully');
        }

        return success;
      } catch (error) {
        console.error('Foundation: Failed to import buildings', error);
        return false;
      }
    },
    [deserializeBuildings]
  );

  /**
   * Get building statistics.
   *
   * @returns {Object} Statistics object
   */
  const getStats = useCallback(() => {
    const buildingData = serializeBuildings();
    return {
      totalBuildings: buildingData.buildings.length,
      saveVersion: buildingData.version,
      timestamp: new Date().toISOString(),
      hasSave: persistence.hasSavedBuildings(),
    };
  }, [serializeBuildings]);

  /**
   * Backup current save to a new slot.
   *
   * This creates an export that the user can save locally.
   *
   * @returns {string} Backed up JSON data
   */
  const createBackup = useCallback(() => {
    return exportAsJSON();
  }, [exportAsJSON]);

  return {
    // Core save/load
    saveGame,
    loadGame,
    newGame,

    // Checks
    canLoad,

    // Import/export
    exportAsJSON,
    importFromJSON,
    createBackup,

    // Stats
    getStats,
  };
};
