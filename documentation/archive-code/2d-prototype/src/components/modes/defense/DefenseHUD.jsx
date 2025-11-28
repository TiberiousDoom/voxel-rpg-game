/**
 * DefenseHUD.jsx - Real-time defense HUD for raid events
 *
 * Features:
 * - Settlement health display
 * - Active defenders status
 * - Enemy wave information
 * - Defense effectiveness metrics
 * - Tower/wall status
 * - Real-time combat updates
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../../../context/GameContext';
import './DefenseHUD.css';

function DefenseHUD({ raid, onRetreat, onEndDefense }) {
  const { gameState } = useGame();
  const [combatLog, setCombatLog] = useState([]);
  const [waveProgress, setWaveProgress] = useState(0);

  // Get settlement health
  const settlementHealth = gameState.settlementHealth || 1000;
  const maxSettlementHealth = 1000;
  const healthPercent = (settlementHealth / maxSettlementHealth) * 100;

  // Get active defenders
  const defenders = (gameState.npcs || []).filter(npc =>
    npc.role === 'defender' || npc.isDefending
  );

  // Get raid information
  const currentWave = raid?.currentWave || 1;
  const totalWaves = raid?.config?.waves || 3;
  const enemiesRemaining = raid?.enemies?.filter(e => e.health > 0).length || 0;
  const enemiesDefeated = raid?.enemiesDefeated || 0;
  const raidDifficulty = raid?.config?.difficulty || 'NORMAL';

  // Calculate wave progress
  useEffect(() => {
    if (raid?.waveStatus) {
      const total = raid.waveStatus.total || 1;
      const remaining = raid.waveStatus.remaining || 0;
      const defeated = total - remaining;
      setWaveProgress((defeated / total) * 100);
    }
  }, [raid?.waveStatus]);

  // Add combat events to log
  useEffect(() => {
    if (raid?.lastEvent) {
      setCombatLog(prev => [...prev, raid.lastEvent].slice(-15)); // Keep last 15
    }
  }, [raid?.lastEvent]);

  // Calculate defense stats
  const totalDefenders = defenders.length;
  const activeDefenders = defenders.filter(d => d.health > 0).length;
  const avgDefenderHealth = defenders.length > 0
    ? defenders.reduce((sum, d) => sum + (d.health || 0), 0) / defenders.length
    : 0;
  const defenseEffectiveness = Math.min(100, (activeDefenders / Math.max(1, enemiesRemaining)) * 100);

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'EASY': return '#10b981';
      case 'NORMAL': return '#60a5fa';
      case 'HARD': return '#f59e0b';
      case 'NIGHTMARE': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  if (!raid) {
    return null;
  }

  return (
    <div className="defense-hud">
      {/* Header */}
      <div className="defense-header">
        <div className="raid-info">
          <h2 className="raid-title">🛡️ Defending Settlement</h2>
          <div className="difficulty-badge" style={{ borderColor: getDifficultyColor(raidDifficulty) }}>
            <span style={{ color: getDifficultyColor(raidDifficulty) }}>
              {raidDifficulty}
            </span>
          </div>
        </div>
        <div className="wave-counter">
          <span className="wave-label">Wave</span>
          <span className="wave-number">{currentWave}/{totalWaves}</span>
        </div>
      </div>

      {/* Settlement Health */}
      <div className="settlement-status">
        <div className="status-header">
          <h3>🏰 Settlement Health</h3>
          <span className="health-value">{Math.floor(settlementHealth)} / {maxSettlementHealth}</span>
        </div>
        <div className="health-bar">
          <div
            className="health-fill"
            style={{
              width: `${healthPercent}%`,
              backgroundColor: healthPercent >= 75 ? '#10b981' : healthPercent >= 50 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
        <div className="health-status">
          <span className={`status-indicator ${healthPercent >= 75 ? 'good' : healthPercent >= 50 ? 'warning' : 'critical'}`}>
            {healthPercent >= 75 ? '● Strong' : healthPercent >= 50 ? '● Damaged' : '● Critical'}
          </span>
        </div>
      </div>

      {/* Wave Progress */}
      <div className="wave-progress-section">
        <div className="progress-header">
          <h3>Wave Progress</h3>
          <span className="enemies-count">
            {enemiesRemaining} remaining
          </span>
        </div>
        <div className="wave-bar">
          <div
            className="wave-fill"
            style={{ width: `${waveProgress}%` }}
          />
        </div>
        <div className="wave-stats">
          <span className="stat-item">
            <span className="stat-icon">💀</span>
            <span>{enemiesDefeated} defeated</span>
          </span>
          <span className="stat-item">
            <span className="stat-icon">⚔️</span>
            <span>{Math.floor(defenseEffectiveness)}% effective</span>
          </span>
        </div>
      </div>

      <div className="defense-content">
        {/* Active Defenders */}
        <div className="defenders-section">
          <div className="section-header">
            <h3>Active Defenders</h3>
            <span className="defender-count">
              {activeDefenders}/{totalDefenders}
            </span>
          </div>
          <div className="defenders-list">
            {defenders.length === 0 ? (
              <div className="no-defenders">
                <p>⚠️ No defenders assigned!</p>
                <p className="warning-text">Assign NPCs to defense roles</p>
              </div>
            ) : (
              defenders.map(defender => {
                const defenderHealthPercent = ((defender.health || 0) / (defender.maxHealth || 100)) * 100;
                const healthColor = defenderHealthPercent >= 75 ? '#10b981' :
                                   defenderHealthPercent >= 50 ? '#f59e0b' : '#ef4444';
                const isAlive = defenderHealthPercent > 0;

                return (
                  <div
                    key={defender.id}
                    className={`defender-card ${!isAlive ? 'defeated' : ''}`}
                  >
                    <div className="defender-info">
                      <span className="defender-name">{defender.name}</span>
                      <span className="defender-level">Lv.{defender.combatLevel || 1}</span>
                    </div>
                    <div className="defender-health-bar">
                      <div
                        className="defender-health-fill"
                        style={{
                          width: `${defenderHealthPercent}%`,
                          backgroundColor: healthColor
                        }}
                      />
                      <span className="defender-health-text">
                        {Math.floor(defender.health || 0)}/{defender.maxHealth || 100}
                      </span>
                    </div>
                    <div className="defender-stats">
                      <span title="Attack">⚔️ {defender.attack || 10}</span>
                      <span title="Defense">🛡️ {defender.defense || 5}</span>
                    </div>
                    {!isAlive && (
                      <div className="defeated-badge">💀 Down</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Combat Log */}
        <div className="combat-log-section">
          <h3 className="log-title">Combat Log</h3>
          <div className="log-entries">
            {combatLog.length === 0 ? (
              <div className="log-entry empty">Raid in progress...</div>
            ) : (
              combatLog.map((entry, index) => (
                <div key={index} className={`log-entry ${entry.type || ''}`}>
                  <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
                  <span className="log-message">{entry.message || JSON.stringify(entry)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Defense Actions */}
      <div className="defense-actions">
        {raid.status === 'IN_PROGRESS' ? (
          <button
            className="action-btn retreat-btn"
            onClick={onRetreat}
            title="Retreat and take heavy losses"
          >
            <span className="btn-icon">🏃</span>
            <span>Retreat</span>
          </button>
        ) : raid.status === 'VICTORY' ? (
          <div className="defense-result victory">
            <div className="result-banner">
              <h2>🎉 Raid Repelled! 🎉</h2>
              <p>The settlement stands strong!</p>
            </div>
            <button className="action-btn continue-btn" onClick={onEndDefense}>
              Continue
            </button>
          </div>
        ) : raid.status === 'DEFEAT' ? (
          <div className="defense-result defeat">
            <div className="result-banner">
              <h2>💀 Settlement Overrun 💀</h2>
              <p>The raiders have breached your defenses...</p>
            </div>
            <button className="action-btn continue-btn" onClick={onEndDefense}>
              Assess Damage
            </button>
          </div>
        ) : null}
      </div>

      {/* Stats Summary */}
      <div className="stats-summary">
        <div className="stat-box">
          <span className="stat-label">Avg Defender HP</span>
          <span className="stat-value">{Math.floor(avgDefenderHealth)}%</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Enemies Defeated</span>
          <span className="stat-value">{enemiesDefeated}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Defense Rating</span>
          <span className="stat-value">{Math.floor(defenseEffectiveness)}%</span>
        </div>
      </div>
    </div>
  );
}

export default DefenseHUD;
