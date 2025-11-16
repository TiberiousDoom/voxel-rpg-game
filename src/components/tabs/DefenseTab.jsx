/**
 * DefenseTab.jsx - Settlement defense tab
 *
 * Displays:
 * - Settlement health
 * - Defender stats
 * - Raid schedule and countdown
 * - Defense history
 */

import React from 'react';
import { useGame } from '../../context/GameContext';
import './DefenseTab.css';

function DefenseTab() {
  const { gameState, gameManager } = useGame();

  // Get raid manager
  const raidManager = gameManager?.orchestrator?.raidEventManager;

  // Get settlement health
  const settlementHealth = gameState.settlementHealth || 1000;
  const maxSettlementHealth = 1000;
  const healthPercent = (settlementHealth / maxSettlementHealth) * 100;

  // Get defender stats
  const npcs = gameState.npcs || [];
  const defenders = npcs.filter(npc => !npc.isDead && npc.status !== 'ON_EXPEDITION');
  const totalDefenders = defenders.length;
  const avgDefenderLevel = defenders.reduce((sum, npc) => sum + (npc.combatLevel || 1), 0) / (defenders.length || 1);
  const totalDefensePower = defenders.reduce((sum, npc) => sum + (npc.defense || 5), 0);

  // Get raid info
  const activeRaid = raidManager?.activeRaid;
  const nextRaidTime = raidManager?.nextRaidTime;
  const raidHistory = raidManager?.raidHistory || [];

  // Calculate time until next raid
  const getTimeUntilRaid = () => {
    if (!nextRaidTime) return 'Unknown';
    const now = Date.now();
    const diff = nextRaidTime - now;
    if (diff <= 0) return 'Imminent!';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Raid types
  const raidTypes = {
    goblin: { name: 'Goblin Raiders', icon: '👺', color: '#f59e0b' },
    orc: { name: 'Orc Warband', icon: '👹', color: '#ef4444' },
    undead: { name: 'Undead Horde', icon: '💀', color: '#8b5cf6' },
    troll: { name: 'Troll Marauders', icon: '👿', color: '#dc2626' },
    dragon: { name: 'Dragon Attack', icon: '🐉', color: '#a855f7' }
  };

  // Get health color
  const getHealthColor = (percent) => {
    if (percent >= 80) return '#10b981';
    if (percent >= 60) return '#3b82f6';
    if (percent >= 40) return '#f59e0b';
    if (percent >= 20) return '#ef4444';
    return '#dc2626';
  };

  const healthColor = getHealthColor(healthPercent);

  return (
    <div className="defense-tab">
      {/* Settlement Health */}
      <div className="defense-section">
        <div className="defense-header">
          <span className="defense-icon">🏰</span>
          <h3>Settlement Health</h3>
        </div>
        <div className="health-display">
          <div className="health-bar-large">
            <div
              className="health-fill-large"
              style={{
                width: `${healthPercent}%`,
                background: healthColor
              }}
            />
          </div>
          <div className="health-info">
            <span className="health-value" style={{ color: healthColor }}>
              {Math.floor(settlementHealth)} / {maxSettlementHealth}
            </span>
            <span className="health-percent">{healthPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Defender Stats */}
      <div className="defense-section">
        <div className="defense-header">
          <span className="defense-icon">🛡️</span>
          <h3>Defenders</h3>
        </div>
        <div className="defender-stats">
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <div className="stat-info">
              <span className="stat-label">Total Defenders</span>
              <span className="stat-value">{totalDefenders}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⚡</span>
            <div className="stat-info">
              <span className="stat-label">Avg Level</span>
              <span className="stat-value">{avgDefenderLevel.toFixed(1)}</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🛡️</span>
            <div className="stat-info">
              <span className="stat-label">Defense Power</span>
              <span className="stat-value">{totalDefensePower}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Raid */}
      {activeRaid && (
        <div className="defense-section active-raid">
          <div className="defense-header">
            <span className="defense-icon">⚔️</span>
            <h3>Active Raid!</h3>
          </div>
          <div className="raid-info">
            <div className="raid-type">
              <span className="raid-icon">
                {raidTypes[activeRaid.type]?.icon || '👺'}
              </span>
              <span className="raid-name">
                {raidTypes[activeRaid.type]?.name || 'Unknown Raiders'}
              </span>
            </div>
            <div className="raid-wave">
              Wave {activeRaid.currentWave || 1} / {activeRaid.totalWaves || 5}
            </div>
            <div className="raid-difficulty">
              Difficulty: <span className="difficulty-value">{activeRaid.difficulty || 'Medium'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Raid Schedule */}
      {!activeRaid && (
        <div className="defense-section">
          <div className="defense-header">
            <span className="defense-icon">⏱️</span>
            <h3>Next Raid</h3>
          </div>
          <div className="raid-schedule">
            <div className="countdown-display">
              <span className="countdown-label">Time Until Raid:</span>
              <span className="countdown-value">{getTimeUntilRaid()}</span>
            </div>
            <div className="raid-warning">
              <p>⚠️ Prepare your defenses!</p>
              <p className="warning-subtext">
                Ensure NPCs are equipped and settlement health is high
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Defense Tips */}
      <div className="defense-section info">
        <div className="defense-header">
          <span className="defense-icon">💡</span>
          <h3>Defense Tips</h3>
        </div>
        <div className="defense-tips">
          <p>• Keep settlement health above 50%</p>
          <p>• More defenders = stronger defense</p>
          <p>• Veterans provide combat bonuses</p>
          <p>• Equipment improves defender stats</p>
          <p>• Raids increase in difficulty over time</p>
        </div>
      </div>

      {/* Raid History */}
      {raidHistory.length > 0 && (
        <div className="defense-section">
          <div className="defense-header">
            <span className="defense-icon">📜</span>
            <h3>Recent Raids</h3>
          </div>
          <div className="raid-history">
            {raidHistory.slice(-3).reverse().map((raid, index) => (
              <div key={index} className={`history-item ${raid.victory ? 'victory' : 'defeat'}`}>
                <span className="history-icon">
                  {raid.victory ? '✅' : '❌'}
                </span>
                <div className="history-info">
                  <span className="history-type">
                    {raidTypes[raid.type]?.name || 'Unknown'}
                  </span>
                  <span className="history-result">
                    {raid.victory ? 'Victory' : 'Defeat'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DefenseTab;
