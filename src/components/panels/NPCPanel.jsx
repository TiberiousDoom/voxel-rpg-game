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
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function NPCPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-npcs">
      <NPCPanelLegacy
        gameState={gameState}
        gameActions={gameActions}
        isEmbedded
      />
    </div>
  );
}

export default NPCPanel;
