/**
 * DeathScreen.jsx
 * Death screen overlay shown when player health reaches 0
 * Shows death cause and respawn with penalties
 */

import React from 'react';
import './DeathScreen.css';

const DeathScreen = ({ onRespawn, deathCause }) => {
  return (
    <div className="death-screen-overlay">
      <div className="death-screen-content">
        <div className="death-screen-skull">💀</div>
        <h1 className="death-screen-title">YOU DIED</h1>
        {deathCause && (
          <p className="death-screen-message" style={{ fontSize: '1.2rem', color: '#ff8888' }}>
            {deathCause}
          </p>
        )}
        <p className="death-screen-message">Your adventure has come to an end...</p>

        <div className="death-screen-actions">
          <button
            className="respawn-button"
            onClick={onRespawn}
          >
            Respawn
          </button>
        </div>

        <p className="death-screen-hint">
          You will respawn at 50% health with 50% of materials lost
        </p>
      </div>
    </div>
  );
};

export default DeathScreen;
