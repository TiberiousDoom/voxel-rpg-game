/**
 * ExpeditionCombat.jsx - Turn-based combat interface for expeditions
 *
 * Features:
 * - Turn-by-turn combat display
 * - Party member actions
 * - Enemy display with health bars
 * - Combat log
 * - Skill/ability buttons
 * - Auto-combat toggle
 */

import React, { useState, useEffect } from 'react';
import './ExpeditionCombat.css';

function ExpeditionCombat({ combat, party, enemies, onAction, onEndCombat }) {
  const [combatLog, setCombatLog] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [autoCombat, setAutoCombat] = useState(false);

  // Get current turn info (before early return)
  const currentTurn = combat?.currentTurn || 0;
  const isPlayerTurn = combat?.isPlayerTurn || false;
  const activeEntity = combat?.activeEntity;

  // Handle attack action
  const handleAttack = (targetId) => {
    if (!isPlayerTurn) return;

    onAction && onAction({
      type: 'attack',
      actorId: activeEntity,
      targetId: targetId
    });

    setSelectedTarget(null);
  };

  // Add combat events to log
  useEffect(() => {
    if (combat?.lastAction) {
      setCombatLog(prev => [...prev, combat.lastAction].slice(-10)); // Keep last 10
    }
  }, [combat?.lastAction]);

  // Auto-combat logic
  useEffect(() => {
    if (autoCombat && isPlayerTurn && enemies && enemies.length > 0) {
      // Simple AI: attack first available enemy
      const target = enemies.find(e => e.health > 0);
      if (target) {
        setTimeout(() => {
          handleAttack(target.id);
        }, 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCombat, isPlayerTurn, currentTurn]);

  if (!combat || !party || !enemies) {
    return null;
  }

  // Handle skill action (currently disabled, for future use)
  // const handleSkill = (skillId, targetId) => {
  //   if (!isPlayerTurn) return;
  //   onAction && onAction({
  //     type: 'skill',
  //     actorId: activeEntity,
  //     targetId: targetId,
  //     skillId: skillId
  //   });
  //   setSelectedTarget(null);
  // };

  // Handle defend action
  const handleDefend = () => {
    if (!isPlayerTurn) return;

    onAction && onAction({
      type: 'defend',
      actorId: activeEntity
    });
  };

  return (
    <div className="expedition-combat">
      {/* Combat Header */}
      <div className="combat-header">
        <div className="turn-indicator">
          <span className="turn-label">Turn:</span>
          <span className="turn-number">{currentTurn}</span>
        </div>
        <div className={`phase-indicator ${isPlayerTurn ? 'player-turn' : 'enemy-turn'}`}>
          {isPlayerTurn ? '⚔️ Your Turn' : '🛡️ Enemy Turn'}
        </div>
        <div className="auto-combat-toggle">
          <label>
            <input
              type="checkbox"
              checked={autoCombat}
              onChange={(e) => setAutoCombat(e.target.checked)}
            />
            <span>Auto</span>
          </label>
        </div>
      </div>

      <div className="combat-arena">
        {/* Party Side */}
        <div className="party-side">
          <h3 className="side-title">Party</h3>
          <div className="combatants-list">
            {party.map(member => {
              const healthPercent = (member.health / member.maxHealth) * 100;
              const healthColor = healthPercent >= 75 ? '#10b981' : healthPercent >= 50 ? '#f59e0b' : '#ef4444';
              const isActive = activeEntity === member.id && isPlayerTurn;

              return (
                <div
                  key={member.id}
                  className={`combatant-card party-member ${isActive ? 'active' : ''}`}
                >
                  <div className="combatant-header">
                    <span className="combatant-name">{member.name}</span>
                    <span className="combatant-level">Lv.{member.level || 1}</span>
                  </div>
                  <div className="combatant-health-bar">
                    <div
                      className="combatant-health-fill"
                      style={{
                        width: `${healthPercent}%`,
                        backgroundColor: healthColor
                      }}
                    />
                    <span className="combatant-health-text">
                      {Math.floor(member.health)}/{member.maxHealth}
                    </span>
                  </div>
                  <div className="combatant-stats">
                    <span>⚔️ {member.attack || 10}</span>
                    <span>🛡️ {member.defense || 5}</span>
                  </div>
                  {isActive && (
                    <div className="active-indicator">
                      <span>▶</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* VS Divider */}
        <div className="vs-divider">
          <span className="vs-text">VS</span>
        </div>

        {/* Enemy Side */}
        <div className="enemy-side">
          <h3 className="side-title">Enemies</h3>
          <div className="combatants-list">
            {enemies.map(enemy => {
              const healthPercent = (enemy.health / enemy.maxHealth) * 100;
              const healthColor = healthPercent >= 75 ? '#10b981' : healthPercent >= 50 ? '#f59e0b' : '#ef4444';
              const isTargeted = selectedTarget === enemy.id;
              const isActive = activeEntity === enemy.id && !isPlayerTurn;
              const isAlive = enemy.health > 0;

              return (
                <div
                  key={enemy.id}
                  className={`combatant-card enemy ${isTargeted ? 'targeted' : ''} ${isActive ? 'active' : ''} ${!isAlive ? 'defeated' : ''}`}
                  onClick={() => isPlayerTurn && isAlive && setSelectedTarget(enemy.id)}
                >
                  <div className="combatant-header">
                    <span className="combatant-name">{enemy.name || 'Enemy'}</span>
                    <span className="combatant-level">Lv.{enemy.level || 1}</span>
                  </div>
                  <div className="combatant-health-bar">
                    <div
                      className="combatant-health-fill"
                      style={{
                        width: `${healthPercent}%`,
                        backgroundColor: healthColor
                      }}
                    />
                    <span className="combatant-health-text">
                      {Math.floor(enemy.health)}/{enemy.maxHealth}
                    </span>
                  </div>
                  <div className="combatant-stats">
                    <span>⚔️ {enemy.attack || 10}</span>
                    <span>🛡️ {enemy.defense || 5}</span>
                  </div>
                  {isActive && (
                    <div className="active-indicator enemy-indicator">
                      <span>▶</span>
                    </div>
                  )}
                  {!isAlive && (
                    <div className="defeated-overlay">
                      <span>💀</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Panel */}
      {isPlayerTurn && (
        <div className="action-panel">
          <h3 className="panel-title">Actions</h3>
          <div className="action-buttons">
            <button
              className="action-btn attack-btn"
              onClick={() => selectedTarget && handleAttack(selectedTarget)}
              disabled={!selectedTarget}
            >
              <span className="btn-icon">⚔️</span>
              <span>Attack</span>
            </button>
            <button
              className="action-btn defend-btn"
              onClick={handleDefend}
            >
              <span className="btn-icon">🛡️</span>
              <span>Defend</span>
            </button>
            <button
              className="action-btn skill-btn"
              disabled={true}
              title="Skills coming soon"
            >
              <span className="btn-icon">✨</span>
              <span>Skills</span>
            </button>
          </div>
          {selectedTarget && (
            <div className="target-info">
              Target selected: {enemies.find(e => e.id === selectedTarget)?.name}
            </div>
          )}
        </div>
      )}

      {/* Combat Log */}
      <div className="combat-log">
        <h3 className="log-title">Combat Log</h3>
        <div className="log-entries">
          {combatLog.length === 0 ? (
            <div className="log-entry empty">Combat started...</div>
          ) : (
            combatLog.map((entry, index) => (
              <div key={index} className={`log-entry ${entry.type || ''}`}>
                {entry.message || JSON.stringify(entry)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* End Combat Button */}
      {combat.status === 'VICTORY' && (
        <div className="combat-end">
          <div className="victory-banner">
            <h2>🎉 Victory! 🎉</h2>
            <p>Enemies defeated!</p>
          </div>
          <button className="end-combat-btn" onClick={onEndCombat}>
            Continue Expedition
          </button>
        </div>
      )}

      {combat.status === 'DEFEAT' && (
        <div className="combat-end">
          <div className="defeat-banner">
            <h2>💀 Defeat 💀</h2>
            <p>Your party has been defeated...</p>
          </div>
          <button className="end-combat-btn retreat" onClick={onEndCombat}>
            Retreat to Settlement
          </button>
        </div>
      )}
    </div>
  );
}

export default ExpeditionCombat;
