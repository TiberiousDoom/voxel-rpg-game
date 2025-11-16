/**
 * RaidWarning.jsx - Warning system for incoming raids
 *
 * Features:
 * - Prominent warning overlay
 * - Countdown timer
 * - Raid difficulty and type display
 * - Preparation suggestions
 * - Quick action buttons
 * - Defense readiness indicator
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../../../context/GameContext';
import './RaidWarning.css';

function RaidWarning({ raid, onPrepare, onDismiss }) {
  const { gameState } = useGame();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Calculate time remaining
  useEffect(() => {
    if (raid?.startTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, raid.startTime - now);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [raid?.startTime]);

  // Get raid information
  const raidType = raid?.type || 'GOBLIN_RAID';
  const difficulty = raid?.config?.difficulty || 'NORMAL';
  const waveCount = raid?.config?.waves || 3;
  const estimatedEnemies = raid?.config?.enemiesPerWave ? raid.config.enemiesPerWave * waveCount : waveCount * 5;

  // Get defense readiness
  const defenders = (gameState.npcs || []).filter(npc =>
    npc.role === 'defender' || npc.isDefending
  );
  const defenderCount = defenders.length;
  const avgDefenderLevel = defenders.length > 0
    ? defenders.reduce((sum, d) => sum + (d.combatLevel || 1), 0) / defenders.length
    : 0;

  const settlementHealth = gameState.settlementHealth || 1000;
  const maxSettlementHealth = 1000;

  // Calculate readiness score
  const defenderScore = Math.min(100, (defenderCount / 5) * 100);
  const levelScore = Math.min(100, (avgDefenderLevel / 5) * 100);
  const healthScore = (settlementHealth / maxSettlementHealth) * 100;
  const readiness = (defenderScore * 0.5) + (levelScore * 0.3) + (healthScore * 0.2);

  // Get readiness status
  const getReadinessStatus = (score) => {
    if (score >= 80) return { label: 'Excellent', color: '#10b981', icon: '✓' };
    if (score >= 60) return { label: 'Good', color: '#60a5fa', icon: '●' };
    if (score >= 40) return { label: 'Fair', color: '#f59e0b', icon: '⚠' };
    return { label: 'Poor', color: '#ef4444', icon: '✗' };
  };

  const readinessStatus = getReadinessStatus(readiness);

  // Get difficulty color
  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'EASY': return '#10b981';
      case 'NORMAL': return '#60a5fa';
      case 'HARD': return '#f59e0b';
      case 'NIGHTMARE': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  // Format time remaining
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get raid type info
  const getRaidTypeInfo = (type) => {
    switch (type) {
      case 'GOBLIN_RAID':
        return { name: 'Goblin Raid', icon: '👺', description: 'A band of goblins approaches!' };
      case 'ORC_RAID':
        return { name: 'Orc Warband', icon: '👹', description: 'Orcs march toward the settlement!' };
      case 'UNDEAD_RAID':
        return { name: 'Undead Horde', icon: '💀', description: 'The dead rise to attack!' };
      case 'DRAGON_RAID':
        return { name: 'Dragon Attack', icon: '🐉', description: 'A mighty dragon descends!' };
      default:
        return { name: 'Unknown Raid', icon: '⚔️', description: 'Enemies approach!' };
    }
  };

  const raidInfo = getRaidTypeInfo(raidType);

  if (!raid || !isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className="raid-warning-overlay">
      <div className="raid-warning-panel">
        {/* Alert Header */}
        <div className="warning-header">
          <div className="warning-icon-pulse">
            <span className="warning-icon">⚠️</span>
          </div>
          <h2 className="warning-title">RAID ALERT</h2>
          <button className="warning-close" onClick={handleDismiss} aria-label="Dismiss">
            ✕
          </button>
        </div>

        {/* Raid Info */}
        <div className="raid-info-section">
          <div className="raid-type-display">
            <span className="raid-type-icon">{raidInfo.icon}</span>
            <div className="raid-type-info">
              <h3 className="raid-type-name">{raidInfo.name}</h3>
              <p className="raid-type-desc">{raidInfo.description}</p>
            </div>
          </div>

          <div className="raid-details">
            <div className="detail-item">
              <span className="detail-label">Difficulty</span>
              <span
                className="detail-value difficulty"
                style={{ color: getDifficultyColor(difficulty) }}
              >
                {difficulty}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Waves</span>
              <span className="detail-value">{waveCount}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Est. Enemies</span>
              <span className="detail-value">{estimatedEnemies}</span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="countdown-section">
          <div className="countdown-label">Raid starts in:</div>
          <div className="countdown-timer">
            {timeRemaining > 0 ? formatTime(timeRemaining) : 'INCOMING!'}
          </div>
          <div className="countdown-bar">
            <div
              className="countdown-fill"
              style={{
                width: raid.warningDuration
                  ? `${100 - (timeRemaining / raid.warningDuration) * 100}%`
                  : '100%'
              }}
            />
          </div>
        </div>

        {/* Defense Readiness */}
        <div className="readiness-section">
          <div className="readiness-header">
            <h3>Defense Readiness</h3>
            <div
              className="readiness-badge"
              style={{ borderColor: readinessStatus.color, color: readinessStatus.color }}
            >
              {readinessStatus.icon} {readinessStatus.label}
            </div>
          </div>

          <div className="readiness-bar">
            <div
              className="readiness-fill"
              style={{
                width: `${readiness}%`,
                backgroundColor: readinessStatus.color
              }}
            />
            <span className="readiness-percent">{Math.floor(readiness)}%</span>
          </div>

          <div className="readiness-stats">
            <div className="readiness-stat">
              <span className="stat-icon">🛡️</span>
              <span className="stat-text">{defenderCount} Defenders</span>
            </div>
            <div className="readiness-stat">
              <span className="stat-icon">⚔️</span>
              <span className="stat-text">Avg Lv.{avgDefenderLevel.toFixed(1)}</span>
            </div>
            <div className="readiness-stat">
              <span className="stat-icon">🏰</span>
              <span className="stat-text">{Math.floor((settlementHealth / maxSettlementHealth) * 100)}% Health</span>
            </div>
          </div>
        </div>

        {/* Preparation Tips */}
        <div className="preparation-tips">
          <h4 className="tips-title">💡 Preparation Tips</h4>
          <ul className="tips-list">
            {defenderCount < 3 && (
              <li className="tip-item warning">
                ⚠️ Assign more NPCs to defense roles
              </li>
            )}
            {avgDefenderLevel < 3 && (
              <li className="tip-item warning">
                ⚠️ Train defenders to increase combat level
              </li>
            )}
            {settlementHealth < 800 && (
              <li className="tip-item warning">
                ⚠️ Repair settlement before the raid
              </li>
            )}
            {readiness >= 60 && (
              <li className="tip-item success">
                ✓ Your defenses are prepared
              </li>
            )}
            <li className="tip-item">
              💪 Higher combat levels improve defense
            </li>
            <li className="tip-item">
              🏰 Settlement health affects raid outcome
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="warning-actions">
          <button
            className="action-btn prepare-btn"
            onClick={onPrepare}
          >
            <span className="btn-icon">🛡️</span>
            <span>Prepare Defenses</span>
          </button>
          <button
            className="action-btn acknowledge-btn"
            onClick={handleDismiss}
          >
            <span className="btn-icon">✓</span>
            <span>Acknowledged</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default RaidWarning;
