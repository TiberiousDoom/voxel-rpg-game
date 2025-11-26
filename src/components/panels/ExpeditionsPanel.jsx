/**
 * ExpeditionsPanel.jsx - Expeditions panel for new UI system
 *
 * Wraps the existing ExpeditionsTab component with the new panel interface.
 */

import React from 'react';
import ExpeditionsTab from '../tabs/ExpeditionsTab';
import useUIStore from '../../stores/useUIStore';
import './Panel.css';

/**
 * ExpeditionsPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state from GameLayout
 * @param {Object} props.gameActions - Game actions from GameLayout
 */
function ExpeditionsPanel({ gameState, gameActions }) {
  const closePanel = useUIStore((state) => state.closePanel);

  const handleEnterDungeon = () => {
    // Close the panel when entering dungeon
    closePanel();
  };

  return (
    <div className="panel panel-expeditions">
      <ExpeditionsTab onEnterDungeon={handleEnterDungeon} isEmbedded />
    </div>
  );
}

export default ExpeditionsPanel;
