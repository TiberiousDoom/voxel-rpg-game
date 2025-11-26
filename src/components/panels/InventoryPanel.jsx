/**
 * InventoryPanel.jsx - Player inventory panel for new UI system
 *
 * Wraps the existing InventoryUI component with the new panel interface.
 */

import React from 'react';
import InventoryUI from '../InventoryUI';
import './Panel.css';

/**
 * InventoryPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function InventoryPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-inventory">
      <InventoryUI
        gameState={gameState}
        gameActions={gameActions}
        isEmbedded
      />
    </div>
  );
}

export default InventoryPanel;
