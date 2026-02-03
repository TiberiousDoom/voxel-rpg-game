/**
 * usePlacement Hook - Foundation Module
 *
 * Main hook for building placement functionality.
 * Handles the complete placement workflow: validation, placement, and updates.
 *
 * Usage:
 *   const { canPlace, placeBuilding, removeBuilding } = usePlacement();
 *   const validation = canPlace({ type: 'WALL', position: {x:0,y:0,z:0} });
 *   if (validation.valid) {
 *     placeBuilding({ ... });
 *   }
 */

import { useCallback, useMemo } from 'react';
import { useFoundationStore } from '../stores/useFoundationStore';
import { validatePlacement } from '../utils/validator';
import { getBuildingCosts } from '../utils/buildingRegistry';
import { BUILDING_PROPERTIES } from '../../../shared/config';

export const usePlacement = () => {
  const foundationStore = useFoundationStore();

  /**
   * Check if a building can be placed at a position.
   *
   * Runs all validation checks and returns detailed feedback.
   *
   * @param {Object} placement - Placement proposal
   * @returns {Object} Validation result
   */
  const canPlace = useCallback(
    (placement) => {
      const buildings = foundationStore.getAllBuildings();
      const buildingCount = foundationStore.getBuildingCount();

      return validatePlacement({
        ...placement,
        existingBuildings: buildings,
        currentBuildingCount: buildingCount,
      });
    },
    [foundationStore]
  );

  /**
   * Place a new building in the world.
   *
   * First validates the placement, then creates the building.
   * Returns the created building if successful, null if validation fails.
   *
   * @param {Object} params
   *   {
   *     type: string (required)
   *     position: {x,y,z} (required)
   *     rotation: number (default 0)
   *     skipValidation: boolean (skip checks if true)
   *   }
   * @returns {Object|null} Created building or null if failed
   */
  const placeBuilding = useCallback(
    ({ type, position, rotation = 0, skipValidation = false }) => {
      // Validate unless skipped
      if (!skipValidation) {
        const validation = canPlace({
          buildingType: type,
          position,
          rotation,
        });

        if (!validation.valid) {
          console.warn('Foundation: Placement validation failed', validation);
          return null;
        }

        // Use snapped position and rotation
        position = validation.snappedPosition;
        rotation = validation.snappedRotation;
      }

      // Add building to store
      const building = foundationStore.addBuilding(type, position, rotation);

      console.log(`Foundation: Placed ${type} at (${position.x}, ${position.y}, ${position.z})`);
      return building;
    },
    [canPlace, foundationStore]
  );

  /**
   * Remove a building from the world.
   *
   * @param {string} buildingId - The building to remove
   * @returns {boolean} True if removed successfully
   */
  const removeBuilding = useCallback(
    (buildingId) => {
      const success = foundationStore.removeBuilding(buildingId);
      if (success) {
        console.log(`Foundation: Removed building ${buildingId}`);
      }
      return success;
    },
    [foundationStore]
  );

  /**
   * Move a building to a new position.
   *
   * Validates the new position before moving.
   *
   * @param {string} buildingId - The building to move
   * @param {Object} newPosition - New {x,y,z} position
   * @param {number} newRotation - New rotation (default unchanged)
   * @returns {boolean} True if moved successfully
   */
  const moveBuilding = useCallback(
    (buildingId, newPosition, newRotation = undefined) => {
      const building = foundationStore.getBuilding(buildingId);
      if (!building) return false;

      // Validate new position
      const validation = canPlace({
        buildingType: building.type,
        position: newPosition,
        rotation: newRotation ?? building.rotation,
      });

      if (!validation.valid) {
        console.warn('Foundation: Move validation failed', validation);
        return false;
      }

      const finalRotation = newRotation ?? building.rotation;
      foundationStore.moveBuilding(buildingId, validation.snappedPosition, finalRotation);

      console.log(`Foundation: Moved building ${buildingId}`);
      return true;
    },
    [canPlace, foundationStore]
  );

  /**
   * Get the resource cost to place a building.
   *
   * @param {string} buildingType - The building type
   * @returns {Object} Resource costs
   */
  const getCost = useCallback((buildingType) => {
    return getBuildingCosts(buildingType);
  }, []);

  /**
   * Get building properties.
   *
   * @param {string} buildingType - The building type
   * @returns {Object} Building properties
   */
  const getProperties = useCallback((buildingType) => {
    return BUILDING_PROPERTIES[buildingType];
  }, []);

  /**
   * Query all buildings in an area.
   *
   * @param {Object} position - Center {x,y,z}
   * @param {number} radius - Search radius
   * @returns {Array} Buildings in radius
   */
  const getBuildingsInArea = useCallback(
    (position, radius) => {
      return foundationStore.getBuildingsInRadius(position, radius);
    },
    [foundationStore]
  );

  /**
   * Check if a position is occupied.
   *
   * @param {Object} position - {x,y,z} to check
   * @returns {Object|null} Building at position, or null if empty
   */
  const isPositionOccupied = useCallback(
    (position) => {
      return foundationStore.getBuildingAtPosition(position);
    },
    [foundationStore]
  );

  return {
    // Validation
    canPlace,

    // Building management
    placeBuilding,
    removeBuilding,
    moveBuilding,

    // Queries
    getCost,
    getProperties,
    getBuildingsInArea,
    isPositionOccupied,

    // Store access
    getAllBuildings: foundationStore.getAllBuildings,
    getBuildingCount: foundationStore.getBuildingCount,
  };
};
