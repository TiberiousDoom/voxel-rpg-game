/**
 * CharacterPanel.jsx - Character sheet panel for new UI system
 *
 * Wraps the existing CharacterSheet component with the new panel interface.
 */

import React from 'react';
import CharacterSheet from '../CharacterSheet';
import './Panel.css';

/**
 * CharacterPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state from GameLayout
 * @param {Object} props.gameActions - Game actions from GameLayout
 */
function CharacterPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-character">
      <CharacterSheet isEmbedded />
    </div>
  );
}

export default CharacterPanel;
