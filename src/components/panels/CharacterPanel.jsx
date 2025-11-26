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
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function CharacterPanel({ gameState, gameActions }) {
  return (
    <div className="panel panel-character">
      <CharacterSheet
        gameState={gameState}
        gameActions={gameActions}
        isEmbedded
      />
    </div>
  );
}

export default CharacterPanel;
