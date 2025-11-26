/**
 * StatsPanel.jsx - Statistics panel for new UI system
 *
 * Wraps the existing StatsTab component with the new panel interface.
 */

import React from 'react';
import StatsTab from '../tabs/StatsTab';
import './Panel.css';

/**
 * StatsPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function StatsPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-stats">
      <StatsTab
        gameState={gameState}
        gameActions={gameActions}
        isEmbedded
      />
    </div>
  );
}

export default StatsPanel;
