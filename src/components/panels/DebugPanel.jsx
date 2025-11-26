/**
 * DebugPanel.jsx - Debug tools panel for new UI system
 *
 * Wraps the existing UnifiedDebugMenu component with the new panel interface.
 */

import React from 'react';
import UnifiedDebugMenu from '../UnifiedDebugMenu';
import './Panel.css';

/**
 * DebugPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function DebugPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-debug">
      <UnifiedDebugMenu
        gameState={gameState}
        gameActions={gameActions}
        isEmbedded
      />
    </div>
  );
}

export default DebugPanel;
