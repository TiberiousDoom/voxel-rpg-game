/**
 * ExpeditionsTab.jsx - Expedition management tab
 *
 * Displays:
 * - Party formation interface
 * - Dungeon selection
 * - Active expeditions
 * - Loot history
 */

import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import './ExpeditionsTab.css';

function ExpeditionsTab() {
  const { gameState, gameManager } = useGame();
  const [selectedDungeon, setSelectedDungeon] = useState(null);

  // Get expedition manager
  const expeditionManager = gameManager?.orchestrator?.expeditionManager;

  // Get NPCs available for expeditions
  const npcs = gameState.npcs || [];
  const availableNPCs = npcs.filter(npc =>
    !npc.isDead &&
    npc.status !== 'ON_EXPEDITION' &&
    (npc.health || 100) > 20
  );
  const onExpedition = npcs.filter(npc => npc.status === 'ON_EXPEDITION');

  // Get active expedition info
  const activeExpedition = expeditionManager?.activeExpedition;

  // Dungeon types
  const dungeonTypes = [
    {
      id: 'GOBLIN_CAVE',
      name: 'Goblin Cave',
      icon: '🗻',
      difficulty: 'Easy',
      color: '#10b981',
      recommendedLevel: 1,
      rewards: 'Common loot, Gold'
    },
    {
      id: 'DARK_FOREST',
      name: 'Dark Forest',
      icon: '🌲',
      difficulty: 'Medium',
      color: '#f59e0b',
      recommendedLevel: 3,
      rewards: 'Uncommon equipment'
    },
    {
      id: 'ANCIENT_RUINS',
      name: 'Ancient Ruins',
      icon: '🏛️',
      difficulty: 'Hard',
      color: '#ef4444',
      recommendedLevel: 5,
      rewards: 'Rare artifacts'
    },
    {
      id: 'DRAGON_LAIR',
      name: 'Dragon Lair',
      icon: '🐉',
      difficulty: 'Legendary',
      color: '#a855f7',
      recommendedLevel: 10,
      rewards: 'Epic loot, Legendary items'
    }
  ];

  const handleStartExpedition = () => {
    // This would call the expedition manager to start an expedition
    // gameManager.orchestrator.expeditionManager.startExpedition(dungeonId);
  };

  return (
    <div className="expeditions-tab">
      {/* Active Expedition */}
      {activeExpedition && (
        <div className="expedition-section active">
          <div className="expedition-header">
            <span className="expedition-icon">⚔️</span>
            <h3>Active Expedition</h3>
          </div>
          <div className="active-expedition-info">
            <div className="expedition-status">
              <span className="status-label">Location:</span>
              <span className="status-value">{activeExpedition.dungeonType || 'Unknown'}</span>
            </div>
            <div className="expedition-status">
              <span className="status-label">Party Size:</span>
              <span className="status-value">{onExpedition.length} NPCs</span>
            </div>
            <div className="expedition-status">
              <span className="status-label">Progress:</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${activeExpedition.progress || 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className="party-members">
            {onExpedition.map(npc => (
              <div key={npc.id} className="party-member-card">
                <span className="member-name">{npc.name}</span>
                <span className="member-level">Lv.{npc.combatLevel || 1}</span>
                <div className="member-health">
                  <div
                    className="health-bar"
                    style={{ width: `${(npc.health || 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Party Formation */}
      {!activeExpedition && (
        <div className="expedition-section">
          <div className="expedition-header">
            <span className="expedition-icon">👥</span>
            <h3>Form Party</h3>
          </div>
          <div className="available-npcs">
            {availableNPCs.length === 0 ? (
              <div className="empty-state">
                <p>No NPCs available for expeditions</p>
                <span className="empty-icon">😕</span>
              </div>
            ) : (
              <div className="npc-list">
                {availableNPCs.slice(0, 5).map(npc => (
                  <div key={npc.id} className="npc-card-mini">
                    <div className="npc-info">
                      <span className="npc-name">{npc.name}</span>
                      <span className="npc-level">Lv.{npc.combatLevel || 1}</span>
                    </div>
                    <div className="npc-stats-mini">
                      <span>⚔️ {npc.attack || 10}</span>
                      <span>🛡️ {npc.defense || 5}</span>
                      <span>❤️ {Math.floor(npc.health || 100)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {availableNPCs.length > 5 && (
              <div className="more-npcs">
                +{availableNPCs.length - 5} more available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dungeon Selection */}
      {!activeExpedition && (
        <div className="expedition-section">
          <div className="expedition-header">
            <span className="expedition-icon">🗺️</span>
            <h3>Select Dungeon</h3>
          </div>
          <div className="dungeon-list">
            {dungeonTypes.map(dungeon => (
              <div
                key={dungeon.id}
                className={`dungeon-card ${selectedDungeon === dungeon.id ? 'selected' : ''}`}
                onClick={() => setSelectedDungeon(dungeon.id)}
              >
                <div className="dungeon-header">
                  <span className="dungeon-icon">{dungeon.icon}</span>
                  <div className="dungeon-info">
                    <h4>{dungeon.name}</h4>
                    <span
                      className="dungeon-difficulty"
                      style={{ color: dungeon.color }}
                    >
                      {dungeon.difficulty}
                    </span>
                  </div>
                </div>
                <div className="dungeon-details">
                  <div className="dungeon-stat">
                    <span className="stat-label">Recommended:</span>
                    <span className="stat-value">Lv.{dungeon.recommendedLevel}+</span>
                  </div>
                  <div className="dungeon-rewards">
                    <span className="rewards-label">Rewards:</span>
                    <span className="rewards-value">{dungeon.rewards}</span>
                  </div>
                </div>
                {availableNPCs.length > 0 && (
                  <button
                    className="start-expedition-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartExpedition(dungeon.id);
                    }}
                    disabled={availableNPCs.length === 0}
                  >
                    Start Expedition
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expedition Info */}
      <div className="expedition-section info">
        <div className="expedition-header">
          <span className="expedition-icon">ℹ️</span>
          <h3>Tips</h3>
        </div>
        <div className="expedition-tips">
          <p>• Form a party of healthy NPCs before starting</p>
          <p>• Higher level NPCs have better survival rates</p>
          <p>• Veterans provide combat bonuses</p>
          <p>• Expeditions take time to complete</p>
          <p>• Defeated dungeons yield better loot</p>
        </div>
      </div>
    </div>
  );
}

export default ExpeditionsTab;
