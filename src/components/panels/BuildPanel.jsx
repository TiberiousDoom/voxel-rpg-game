/**
 * BuildPanel.jsx - Building menu panel for new UI system
 *
 * Wraps the existing BuildMenu component with the new panel interface.
 * This is a migration wrapper - can be gradually replaced with
 * a fully redesigned component.
 */

import React from 'react';
import BuildMenu from '../BuildMenu';
import './Panel.css';

/**
 * BuildPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function BuildPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-build">
      <BuildMenu
        gameState={gameState}
        gameActions={gameActions}
        isEmbedded
      />
    </div>
  );
}

export default BuildPanel;
