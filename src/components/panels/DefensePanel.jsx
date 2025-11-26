/**
 * DefensePanel.jsx - Defense panel for new UI system
 *
 * Wraps the existing DefenseTab component with the new panel interface.
 */

import React from 'react';
import DefenseTab from '../tabs/DefenseTab';
import './Panel.css';

/**
 * DefensePanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function DefensePanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-defense">
      <DefenseTab
        gameState={gameState}
        gameActions={gameActions}
        isEmbedded
      />
    </div>
  );
}

export default DefensePanel;
