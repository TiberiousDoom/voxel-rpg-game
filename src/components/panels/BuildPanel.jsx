/**
 * BuildPanel.jsx - Building menu panel for new UI system
 *
 * Wraps the existing BuildMenu component with the new panel interface.
 */

import React from 'react';
import BuildMenu from '../BuildMenu';
import './Panel.css';

/**
 * BuildPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state from GameLayout
 * @param {Object} props.gameActions - Game actions from GameLayout
 */
function BuildPanel({ gameState, gameActions }) {
  const {
    selectedBuildingType,
    currentTier = 'SURVIVAL',
    gameManager,
  } = gameState || {};

  const {
    setSelectedBuildingType,
    spawnNPC,
  } = gameActions || {};

  return (
    <div className="panel panel-build">
      <BuildMenu
        selectedBuildingType={selectedBuildingType}
        onSelectBuilding={setSelectedBuildingType}
        onSpawnNPC={() => spawnNPC?.('WORKER')}
        onAdvanceTier={() => {/* TODO: Implement tier advancement */}}
        currentTier={currentTier}
        buildingConfig={gameManager?.orchestrator?.buildingConfig}
        placedBuildingCounts={{}}
        isEmbedded
      />
    </div>
  );
}

export default BuildPanel;
