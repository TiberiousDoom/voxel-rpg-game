/**
 * CraftingPanel.jsx - Crafting panel for new UI system
 *
 * Wraps the existing CraftingUI component with the new panel interface.
 */

import React from 'react';
import CraftingUI from '../CraftingUI';
import './Panel.css';

/**
 * CraftingPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state from GameLayout
 * @param {Object} props.gameActions - Game actions from GameLayout
 */
function CraftingPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-crafting">
      <CraftingUI isEmbedded />
    </div>
  );
}

export default CraftingPanel;
