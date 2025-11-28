/**
 * DebugPanel.jsx - Debug tools panel for new UI system
 *
 * Provides developer/debug tools within the panel system.
 */

import React from 'react';
import DeveloperTab from '../tabs/DeveloperTab';
import './Panel.css';

/**
 * DebugPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state from GameLayout
 * @param {Object} props.gameActions - Game actions from GameLayout
 */
function DebugPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-debug">
      <DeveloperTab isEmbedded />
    </div>
  );
}

export default DebugPanel;
