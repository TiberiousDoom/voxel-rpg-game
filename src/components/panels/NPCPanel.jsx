/**
 * NPCPanel.jsx - NPC management panel for new UI system
 *
 * Wraps the existing NPCPanel component with the new panel interface.
 */

import React from 'react';
import NPCPanelLegacy from '../NPCPanel';
import './Panel.css';

/**
 * NPCPanel component (new UI wrapper)
 * @param {Object} props
 * @param {Object} props.gameState - Game state from GameLayout
 * @param {Object} props.gameActions - Game actions from GameLayout
 */
function NPCPanel({ gameState, gameActions }) {
  const {
    npcs = [],
    buildings = [],
    maxPopulation = 100,
  } = gameState || {};

  const {
    handleAssignNPC,
    handleUnassignNPC,
    handleAutoAssign,
    spawnNPC,
  } = gameActions || {};

  return (
    <div className="panel panel-npcs">
      <NPCPanelLegacy
        npcs={npcs}
        buildings={buildings}
        onAssignNPC={handleAssignNPC}
        onUnassignNPC={handleUnassignNPC}
        onAutoAssign={handleAutoAssign}
        onSpawnNPC={(role) => spawnNPC?.(role)}
        maxPopulation={maxPopulation}
        isEmbedded
      />
    </div>
  );
}

export default NPCPanel;
