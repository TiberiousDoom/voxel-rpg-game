/**
 * NPCPanel.jsx - Display NPC information
 *
 * Shows:
 * - Population (alive count / total spawned)
 * - Current morale
 * - Morale state indicator
 */

import React from 'react';
import './NPCPanel.css';

/**
 * NPC info panel component
 */
function NPCPanel({ population = {}, morale = 0 }) {
  const aliveCount = population.aliveCount || 0;
  const totalSpawned = population.totalSpawned || 0;

  /**
   * Get morale color and state label
   */
  const getMoraleState = (value) => {
    if (value < -50) return { label: 'Miserable', color: '#FF0000', emoji: '😢' };
    if (value < -25) return { label: 'Upset', color: '#FF6B6B', emoji: '😠' };
    if (value < 0) return { label: 'Unhappy', color: '#FFA500', emoji: '😕' };
    if (value === 0) return { label: 'Neutral', color: '#FFD700', emoji: '😐' };
    if (value <= 25) return { label: 'Happy', color: '#90EE90', emoji: '🙂' };
    return { label: 'Thrilled', color: '#00FF00', emoji: '😄' };
  };

  const moraleState = getMoraleState(morale);
  const moralePercent = Math.max(0, Math.min(100, (morale + 100) / 2));

  return (
    <div className="npc-panel">
      <h3 className="panel-title">Population & Morale</h3>

      {/* Population Stats */}
      <div className="population-section">
        <div className="stat-item">
          <label>Population:</label>
          <div className="stat-value">
            <span className="alive-count">{aliveCount}</span>
            <span className="separator">/</span>
            <span className="total-count">{totalSpawned}</span>
          </div>
        </div>
        <div className="population-bar">
          <div
            className="population-fill"
            style={{
              width: totalSpawned > 0 ? (aliveCount / totalSpawned) * 100 : 0 + '%'
            }}
          />
        </div>
        <p className="stat-label">
          {totalSpawned === 0
            ? 'No NPCs spawned yet'
            : `${Math.round((aliveCount / totalSpawned) * 100)}% alive`}
        </p>
      </div>

      {/* Morale Stats */}
      <div className="morale-section">
        <div className="morale-header">
          <label>Morale:</label>
          <span className="morale-emoji">{moraleState.emoji}</span>
        </div>

        <div className="morale-value" style={{ color: moraleState.color }}>
          {morale > 0 ? '+' : ''}{morale}
        </div>

        <div className="morale-bar">
          <div
            className="morale-fill"
            style={{
              width: moralePercent + '%',
              backgroundColor: moraleState.color
            }}
          />
        </div>

        <p className="morale-state" style={{ color: moraleState.color }}>
          {moraleState.label}
        </p>

        <div className="morale-info">
          <p className="info-text">
            Morale affects NPC efficiency and happiness. Keep your population
            happy by ensuring they have adequate resources and assignments.
          </p>
        </div>
      </div>

      <div className="npc-footer">
        <div className="stat-hint">
          <strong>Tip:</strong> Spawn more NPCs from the Build Menu to expand your
          settlement
        </div>
      </div>
    </div>
  );
}

export default NPCPanel;
