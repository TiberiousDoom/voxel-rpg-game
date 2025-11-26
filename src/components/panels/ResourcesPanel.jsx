/**
 * ResourcesPanel.jsx - Resources panel for new UI system
 *
 * Wraps the existing ResourcePanel component with the new panel interface.
 */

import React from 'react';
import ResourcePanel from '../ResourcePanel';
import './Panel.css';

/**
 * ResourcesPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function ResourcesPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-resources">
      <ResourcePanel
        gameState={gameState}
        gameActions={gameActions}
        isEmbedded
      />
    </div>
  );
}

export default ResourcesPanel;
