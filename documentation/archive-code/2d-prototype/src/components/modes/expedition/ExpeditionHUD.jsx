/**
 * ExpeditionHUD.jsx - Active expedition heads-up display
 *
 * Features:
 * - Floor progress indicator
 * - Party member status (health, buffs, debuffs)
 * - Mini-map of current floor
 * - Combat indicator
 * - Loot counter
 * - Retreat option
 */

import React from 'react';
import { useGame } from '../../../context/GameContext';
import './ExpeditionHUD.css';

function ExpeditionHUD({ expedition, onRetreat, onContinue }) {
  const { gameManager } = useGame();

  if (!expedition) {
    return null;
  }

  const npcManager = gameManager?.orchestrator?.npcManager;

  // Get party members
  const partyMembers = (expedition.party?.members || []).map(member => {
    const npc = npcManager?.getNPC(member.npcId);
    return { ...member, npc };
  }).filter(m => m.npc);

  // Calculate expedition progress
  const currentFloor = expedition.currentFloor || 1;
  const maxFloor = expedition.config?.maxFloor || 5;
  const progress = (currentFloor / maxFloor) * 100;

  // Get expedition stats
  const totalLoot = expedition.loot?.length || 0;
  const enemiesDefeated = expedition.stats?.enemiesDefeated || 0;

  // Check if in combat
  const inCombat = expedition.status === 'IN_COMBAT';

  // Get overall party health
  const totalHealth = partyMembers.reduce((sum, m) => sum + (m.npc.health || 0), 0);
  const maxTotalHealth = partyMembers.length * 100;
  const partyHealthPercent = (totalHealth / maxTotalHealth) * 100;
  const partyHealthColor = partyHealthPercent >= 75 ? '#10b981' : partyHealthPercent >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="expedition-hud">
      {/* Top Bar: Floor Progress */}
      <div className="expedition-top-bar">
        <div className="floor-progress">
          <div className="floor-info">
            <span className="floor-icon">🗺️</span>
            <span className="floor-text">Floor {currentFloor} / {maxFloor}</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {inCombat && (
          <div className="combat-indicator">
            <span className="combat-icon">⚔️</span>
            <span className="combat-text">Combat!</span>
          </div>
        )}

        <div className="expedition-stats">
          <div className="stat-item">
            <span className="stat-icon">👹</span>
            <span className="stat-value">{enemiesDefeated}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">💰</span>
            <span className="stat-value">{totalLoot}</span>
          </div>
        </div>
      </div>

      {/* Party Status */}
      <div className="party-status-panel">
        <h3 className="panel-title">Party Status</h3>

        {/* Overall Party Health */}
        <div className="party-overall-health">
          <span className="health-label">Party Health</span>
          <div className="health-bar-large">
            <div
              className="health-fill-large"
              style={{
                width: `${partyHealthPercent}%`,
                backgroundColor: partyHealthColor
              }}
            />
            <span className="health-text">
              {Math.floor(totalHealth)} / {maxTotalHealth}
            </span>
          </div>
        </div>

        {/* Individual Party Members */}
        <div className="party-members-list">
          {partyMembers.map(member => {
            const npc = member.npc;
            const health = npc.health || 100;
            const maxHealth = 100;
            const healthPercent = (health / maxHealth) * 100;
            const healthColor = healthPercent >= 75 ? '#10b981' : healthPercent >= 50 ? '#f59e0b' : '#ef4444';

            return (
              <div key={npc.id} className="party-member-status">
                <div className="member-header">
                  <span className="member-name">{npc.name}</span>
                  <span className="member-level">Lv.{npc.combatLevel || 1}</span>
                </div>
                <div className="member-health-bar">
                  <div
                    className="member-health-fill"
                    style={{
                      width: `${healthPercent}%`,
                      backgroundColor: healthColor
                    }}
                  />
                  <span className="member-health-text">
                    {Math.floor(health)}/{maxHealth}
                  </span>
                </div>
                <div className="member-stats">
                  <span className="stat">⚔️ {npc.attack || 10}</span>
                  <span className="stat">🛡️ {npc.defense || 5}</span>
                  <span className="stat">⚡ {npc.speed || 10}</span>
                </div>
                {npc.buffs && npc.buffs.length > 0 && (
                  <div className="member-buffs">
                    {npc.buffs.map((buff, i) => (
                      <span key={i} className="buff-icon" title={buff.name}>
                        {buff.icon || '✨'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="expedition-actions">
        {!inCombat && (
          <>
            <button
              className="action-btn continue-btn"
              onClick={onContinue}
            >
              <span className="btn-icon">▶️</span>
              <span>Continue</span>
            </button>
            <button
              className="action-btn retreat-btn"
              onClick={onRetreat}
            >
              <span className="btn-icon">🏃</span>
              <span>Retreat</span>
            </button>
          </>
        )}
      </div>

      {/* Mini-Map (Placeholder) */}
      <div className="mini-map">
        <div className="mini-map-grid">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`mini-map-tile ${i === 4 ? 'current' : ''} ${i > currentFloor - 1 ? 'unexplored' : 'explored'}`}
            >
              {i === 4 ? '👥' : i < currentFloor - 1 ? '✓' : '?'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExpeditionHUD;
