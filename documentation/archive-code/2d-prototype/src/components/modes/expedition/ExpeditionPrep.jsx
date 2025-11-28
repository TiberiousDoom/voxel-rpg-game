/**
 * ExpeditionPrep.jsx - Interactive party formation and expedition preparation
 *
 * Features:
 * - Drag-and-drop party formation (up to 4 NPCs)
 * - NPC filtering by combat readiness
 * - Difficulty and dungeon type selection
 * - Party composition analysis
 * - Equipment check
 * - Start expedition button
 */

import React, { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import './ExpeditionPrep.css';

function ExpeditionPrep({ onStart, onCancel }) {
  const { gameState, gameManager } = useGame();

  const [party, setParty] = useState([]);
  const [difficulty, setDifficulty] = useState('NORMAL');
  const [dungeonType, setDungeonType] = useState('GOBLIN_CAVE');
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Get managers
  const partyManager = gameManager?.orchestrator?.npcPartyManager;
  const expeditionManager = gameManager?.orchestrator?.expeditionManager;

  // Get available NPCs (alive, not on expedition, decent health)
  const availableNPCs = (gameState.npcs || []).filter(npc =>
    !npc.isDead &&
    npc.status !== 'ON_EXPEDITION' &&
    (npc.health || 100) > 20
  );

  // Dungeon types configuration
  const dungeonTypes = {
    GOBLIN_CAVE: {
      name: 'Goblin Cave',
      icon: '🗻',
      difficulty: 'Easy',
      recommendedLevel: 1,
      description: 'A cave infested with goblins. Good for beginners.',
      rewards: 'Common loot, Gold'
    },
    DARK_FOREST: {
      name: 'Dark Forest',
      icon: '🌲',
      difficulty: 'Medium',
      recommendedLevel: 3,
      description: 'Dangerous forest with wild creatures and bandits.',
      rewards: 'Uncommon equipment, Herbs'
    },
    ANCIENT_RUINS: {
      name: 'Ancient Ruins',
      icon: '🏛️',
      difficulty: 'Hard',
      recommendedLevel: 5,
      description: 'Ancient temple filled with undead guardians.',
      rewards: 'Rare artifacts, Enchanted items'
    },
    DRAGON_LAIR: {
      name: 'Dragon Lair',
      icon: '🐉',
      difficulty: 'Legendary',
      recommendedLevel: 10,
      description: 'The lair of a mighty dragon. Extreme danger!',
      rewards: 'Epic loot, Legendary weapons'
    }
  };

  const difficultySettings = {
    EASY: { multiplier: 0.7, label: 'Easy', color: '#10b981' },
    NORMAL: { multiplier: 1.0, label: 'Normal', color: '#3b82f6' },
    HARD: { multiplier: 1.5, label: 'Hard', color: '#f59e0b' },
    NIGHTMARE: { multiplier: 2.0, label: 'Nightmare', color: '#ef4444' }
  };

  // Add NPC to party
  const addToParty = (npc) => {
    if (party.length >= 4) {
      alert('Party is full! Maximum 4 members.');
      return;
    }

    if (party.find(p => p.id === npc.id)) {
      return; // Already in party
    }

    setParty([...party, npc]);
  };

  // Remove NPC from party
  const removeFromParty = (npcId) => {
    setParty(party.filter(p => p.id !== npcId));
  };

  // Calculate party stats
  const getPartyStats = () => {
    if (party.length === 0) return { avgLevel: 0, totalHP: 0, totalDamage: 0, totalDefense: 0 };

    const avgLevel = party.reduce((sum, npc) => sum + (npc.combatLevel || 1), 0) / party.length;
    const totalHP = party.reduce((sum, npc) => sum + (npc.health || 100), 0);
    const totalDamage = party.reduce((sum, npc) => sum + (npc.attack || 10), 0);
    const totalDefense = party.reduce((sum, npc) => sum + (npc.defense || 5), 0);

    return { avgLevel, totalHP, totalDamage, totalDefense };
  };

  const partyStats = getPartyStats();

  // Start expedition
  const handleStartExpedition = () => {
    if (party.length === 0) {
      alert('You need at least one NPC in your party!');
      return;
    }

    // Create party in party manager
    if (partyManager) {
      partyManager.createParty();
      party.forEach(npc => {
        partyManager.addToParty(npc.id, 'damage'); // Default role
      });
    }

    // Start expedition
    if (expeditionManager) {
      const result = expeditionManager.startExpedition({
        difficulty: difficultySettings[difficulty].multiplier,
        dungeonType,
        maxFloor: 5
      });

      if (result.success && onStart) {
        onStart(result.expedition);
      }
    }
  };

  // Get NPC display info
  const getNPCDisplayInfo = (npc) => {
    const level = npc.combatLevel || 1;
    const health = npc.health || 100;
    const healthPercent = health;
    const healthColor = healthPercent >= 75 ? '#10b981' : healthPercent >= 50 ? '#f59e0b' : '#ef4444';

    return { level, health, healthPercent, healthColor };
  };

  return (
    <div className="expedition-prep">
      {/* Header */}
      <div className="expedition-prep-header">
        <h2>🗺️ Prepare Expedition</h2>
        <button className="cancel-btn" onClick={onCancel}>✕</button>
      </div>

      <div className="expedition-prep-content">
        {/* Left: Party Formation */}
        <div className="party-section">
          <h3>Party Formation ({party.length}/4)</h3>

          {/* Party Slots */}
          <div className="party-slots">
            {[0, 1, 2, 3].map(slotIndex => {
              const npc = party[slotIndex];

              return (
                <div
                  key={slotIndex}
                  className={`party-slot ${npc ? 'filled' : 'empty'} ${selectedSlot === slotIndex ? 'selected' : ''}`}
                  onClick={() => setSelectedSlot(slotIndex)}
                >
                  {npc ? (
                    <>
                      <div className="slot-npc-info">
                        <div className="slot-npc-header">
                          <span className="slot-npc-name">{npc.name}</span>
                          <button
                            className="remove-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromParty(npc.id);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="slot-npc-level">Lv.{getNPCDisplayInfo(npc).level}</div>
                        <div className="slot-health-bar">
                          <div
                            className="slot-health-fill"
                            style={{
                              width: `${getNPCDisplayInfo(npc).healthPercent}%`,
                              backgroundColor: getNPCDisplayInfo(npc).healthColor
                            }}
                          />
                          <span className="slot-health-text">
                            {Math.floor(getNPCDisplayInfo(npc).health)} HP
                          </span>
                        </div>
                        <div className="slot-stats">
                          <span>⚔️ {npc.attack || 10}</span>
                          <span>🛡️ {npc.defense || 5}</span>
                          <span>⚡ {npc.speed || 10}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-slot-content">
                      <span className="empty-icon">+</span>
                      <span className="empty-text">Empty Slot</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Party Stats Summary */}
          {party.length > 0 && (
            <div className="party-stats-summary">
              <h4>Party Statistics</h4>
              <div className="stat-row">
                <span>Avg Level:</span>
                <span className="stat-value">{partyStats.avgLevel.toFixed(1)}</span>
              </div>
              <div className="stat-row">
                <span>Total HP:</span>
                <span className="stat-value">{Math.floor(partyStats.totalHP)}</span>
              </div>
              <div className="stat-row">
                <span>Total Damage:</span>
                <span className="stat-value">{partyStats.totalDamage}</span>
              </div>
              <div className="stat-row">
                <span>Total Defense:</span>
                <span className="stat-value">{partyStats.totalDefense}</span>
              </div>
            </div>
          )}
        </div>

        {/* Center: Dungeon Selection */}
        <div className="dungeon-section">
          <h3>Select Dungeon</h3>
          <div className="dungeon-list">
            {Object.entries(dungeonTypes).map(([key, dungeon]) => (
              <div
                key={key}
                className={`dungeon-option ${dungeonType === key ? 'selected' : ''}`}
                onClick={() => setDungeonType(key)}
              >
                <div className="dungeon-icon">{dungeon.icon}</div>
                <div className="dungeon-info">
                  <h4>{dungeon.name}</h4>
                  <p className="dungeon-difficulty">{dungeon.difficulty}</p>
                  <p className="dungeon-desc">{dungeon.description}</p>
                  <p className="dungeon-recommended">Recommended: Lv.{dungeon.recommendedLevel}+</p>
                  <p className="dungeon-rewards">Rewards: {dungeon.rewards}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Difficulty Selector */}
          <div className="difficulty-selector">
            <h4>Difficulty</h4>
            <div className="difficulty-buttons">
              {Object.entries(difficultySettings).map(([key, setting]) => (
                <button
                  key={key}
                  className={`difficulty-btn ${difficulty === key ? 'selected' : ''}`}
                  onClick={() => setDifficulty(key)}
                  style={{
                    borderColor: difficulty === key ? setting.color : 'transparent',
                    color: difficulty === key ? setting.color : '#e2e8f0'
                  }}
                >
                  {setting.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Available NPCs */}
        <div className="available-npcs-section">
          <h3>Available NPCs ({availableNPCs.length})</h3>
          <div className="npc-list">
            {availableNPCs.length === 0 ? (
              <div className="no-npcs">
                <p>No NPCs available for expeditions</p>
                <p className="hint">NPCs must be alive and have &gt;20% health</p>
              </div>
            ) : (
              availableNPCs.map(npc => {
                const isInParty = party.find(p => p.id === npc.id);
                const info = getNPCDisplayInfo(npc);

                return (
                  <div
                    key={npc.id}
                    className={`npc-card ${isInParty ? 'in-party' : ''}`}
                    onClick={() => !isInParty && addToParty(npc)}
                  >
                    <div className="npc-card-header">
                      <span className="npc-card-name">{npc.name}</span>
                      <span className="npc-card-level">Lv.{info.level}</span>
                    </div>
                    <div className="npc-card-health">
                      <div
                        className="npc-card-health-fill"
                        style={{
                          width: `${info.healthPercent}%`,
                          backgroundColor: info.healthColor
                        }}
                      />
                    </div>
                    <div className="npc-card-stats">
                      <span>⚔️{npc.attack || 10}</span>
                      <span>🛡️{npc.defense || 5}</span>
                      <span>⚡{npc.speed || 10}</span>
                    </div>
                    {isInParty && <div className="in-party-badge">In Party</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer: Action Buttons */}
      <div className="expedition-prep-footer">
        <button
          className="start-expedition-btn"
          onClick={handleStartExpedition}
          disabled={party.length === 0}
        >
          <span className="btn-icon">⚔️</span>
          <span>Start Expedition</span>
        </button>
      </div>
    </div>
  );
}

export default ExpeditionPrep;
