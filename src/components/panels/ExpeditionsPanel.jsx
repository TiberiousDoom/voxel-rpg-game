/**
 * ExpeditionsPanel.jsx - Expeditions panel for new UI system
 *
 * Wraps the existing ExpeditionsTab component with the new panel interface.
 */

import React from 'react';
import ExpeditionsTab from '../tabs/ExpeditionsTab';
import './Panel.css';

/**
 * ExpeditionsPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function ExpeditionsPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-expeditions">
      <ExpeditionsTab
        gameState={gameState}
        gameActions={gameActions}
        isEmbedded
      />
    </div>
  );
}

export default ExpeditionsPanel;
