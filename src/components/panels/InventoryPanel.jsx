/**
 * InventoryPanel.jsx - Settlement inventory panel for new UI system
 *
 * Wraps the existing SettlementInventoryUI component with the new panel interface.
 */

import React from 'react';
import SettlementInventoryUI from '../SettlementInventoryUI';
import './Panel.css';

/**
 * InventoryPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state from GameLayout
 * @param {Object} props.gameActions - Game actions from GameLayout
 */
function InventoryPanel({ gameState, gameActions }) {
  const { gameManager } = gameState || {};

  return (
    <div className="panel panel-inventory">
      <SettlementInventoryUI
        gameManager={gameManager}
        isOpen={true}
        onClose={() => {}}
        isEmbedded
      />
    </div>
  );
}

export default InventoryPanel;
