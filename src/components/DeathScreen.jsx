/**
 * DeathScreen.jsx
 * Death screen overlay shown when player health reaches 0
 * Provides option to respawn
 */

import React from 'react';
import './DeathScreen.css';

const DeathScreen = ({ onRespawn }) => {
  return (
    <div className="death-screen-overlay">
      <div className="death-screen-content">
        <div className="death-screen-skull">💀</div>
        <h1 className="death-screen-title">YOU DIED</h1>
        <p className="death-screen-message">Your adventure has come to an end...</p>

        <div className="death-screen-actions">
          <button
            className="respawn-button"
            onClick={onRespawn}
          >
            🔄 Respawn
          </button>
        </div>

        <p className="death-screen-hint">
          You will respawn at full health with all your items and progress intact
        </p>
      </div>
    </div>
  );
};

export default DeathScreen;
