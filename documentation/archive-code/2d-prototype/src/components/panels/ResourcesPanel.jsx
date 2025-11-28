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
 * @param {Object} props.gameState - Game state from GameLayout
 * @param {Object} props.gameActions - Game actions from GameLayout
 */
function ResourcesPanel({ gameState, gameActions }) {
  const { resources = {} } = gameState || {};

  return (
    <div className="panel panel-resources">
      <ResourcePanel
        resources={resources}
        production={{}}
        consumption={{}}
        capacity={{}}
        isEmbedded
      />
    </div>
  );
}

export default ResourcesPanel;
