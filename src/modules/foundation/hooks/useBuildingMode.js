/**
 * useBuildingMode Hook - Foundation Module
 *
 * Manages building mode state and transitions.
 * Handles entering/exiting building placement mode and selecting buildings.
 *
 * Usage:
 *   const { buildingModeActive, enterBuildingMode, exitBuildingMode } = useBuildingMode();
 *   const { selectedBuilding, selectBuilding } = useBuildingMode();
 */

import { useCallback } from 'react';
import { useFoundationStore } from '../stores/useFoundationStore';

export const useBuildingMode = () => {
  const buildingModeActive = useFoundationStore((state) => state.buildingModeActive);
  const selectedBuildingId = useFoundationStore((state) => state.selectedBuildingId);
  const getSelectedBuilding = useFoundationStore((state) => state.getSelectedBuilding);
  const enterBuildingMode = useFoundationStore((state) => state.enterBuildingMode);
  const exitBuildingMode = useFoundationStore((state) => state.exitBuildingMode);
  const selectBuilding = useFoundationStore((state) => state.selectBuilding);
  const getBuilding = useFoundationStore((state) => state.getBuilding);

  /**
   * Enter building placement mode.
   */
  const onEnterBuildingMode = useCallback(() => {
    enterBuildingMode();
    console.log('Foundation: Entered building mode');
  }, [enterBuildingMode]);

  /**
   * Exit building placement mode.
   */
  const onExitBuildingMode = useCallback(() => {
    exitBuildingMode();
    console.log('Foundation: Exited building mode');
  }, [exitBuildingMode]);

  /**
   * Toggle building mode on/off.
   */
  const toggleBuildingMode = useCallback(() => {
    if (buildingModeActive) {
      onExitBuildingMode();
    } else {
      onEnterBuildingMode();
    }
  }, [buildingModeActive, onEnterBuildingMode, onExitBuildingMode]);

  /**
   * Select a building for editing.
   *
   * @param {string} buildingId - Building to select (or null to deselect)
   */
  const onSelectBuilding = useCallback(
    (buildingId) => {
      selectBuilding(buildingId);
      if (buildingId) {
        console.log(`Foundation: Selected building ${buildingId}`);
      }
    },
    [selectBuilding]
  );

  /**
   * Deselect the currently selected building.
   */
  const deselectBuilding = useCallback(() => {
    selectBuilding(null);
    console.log('Foundation: Deselected building');
  }, [selectBuilding]);

  /**
   * Get the currently selected building object.
   *
   * @returns {Object|null} Selected building or null
   */
  const getSelected = useCallback(() => {
    return getSelectedBuilding();
  }, [getSelectedBuilding]);

  return {
    // State
    buildingModeActive,
    selectedBuildingId,

    // Mode control
    enterBuildingMode: onEnterBuildingMode,
    exitBuildingMode: onExitBuildingMode,
    toggleBuildingMode,

    // Building selection
    selectBuilding: onSelectBuilding,
    deselectBuilding,
    getSelectedBuilding: getSelected,

    // Utilities
    getBuilding,
  };
};
