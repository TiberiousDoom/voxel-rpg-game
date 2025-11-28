/**
 * ExpeditionsTab.jsx - Expedition management tab
 *
 * Displays:
 * - Dungeon entry interface (NEW)
 * - Party formation interface (ExpeditionPrep)
 * - Active expedition HUD (ExpeditionHUD)
 * - Turn-based combat (ExpeditionCombat)
 * - Loot history
 */

import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import useGameStore from '../../stores/useGameStore';
import useDungeonStore from '../../stores/useDungeonStore';
import ExpeditionPrep from '../modes/expedition/ExpeditionPrep';
import ExpeditionHUD from '../modes/expedition/ExpeditionHUD';
import ExpeditionCombat from '../modes/expedition/ExpeditionCombat';
import './ExpeditionsTab.css';

/**
 * Dungeon type definitions
 */
const DUNGEON_TYPES = [
  {
    id: 'CAVE',
    name: 'Cave of Shadows',
    icon: '🕳️',
    description: 'Dark caves filled with spiders and trolls',
    difficulty: 'Normal',
    minLevel: 1,
    recommendedLevel: 3,
    floors: '8-12 rooms',
    rewards: 'Common-Rare gear, Spider Silk'
  },
  {
    id: 'FOREST',
    name: 'Haunted Forest',
    icon: '🌲',
    description: 'A cursed forest with wolves and goblins',
    difficulty: 'Hard',
    minLevel: 5,
    recommendedLevel: 8,
    floors: '10-15 rooms',
    rewards: 'Uncommon-Epic gear, Forest Essence'
  },
  {
    id: 'RUINS',
    name: 'Ancient Ruins',
    icon: '🏛️',
    description: 'Undead-infested ruins of a forgotten civilization',
    difficulty: 'Very Hard',
    minLevel: 10,
    recommendedLevel: 15,
    floors: '12-18 rooms',
    rewards: 'Rare-Legendary gear, Ancient Relics'
  }
];

function ExpeditionsTab({ onEnterDungeon }) {
  const { gameManager, managers } = useGame();
  const player = useGameStore((state) => state.player);
  const { inDungeon, enterDungeon } = useDungeonStore();
  const [expeditionMode, setExpeditionMode] = useState('prep'); // 'prep', 'expedition', 'combat', 'dungeon'
  const [selectedDungeon, setSelectedDungeon] = useState(null);

  // Get expedition manager
  const expeditionManager = managers?.expeditionManager || gameManager?.orchestrator?.expeditionManager;
  const partyManager = managers?.partyManager;

  // Get active expedition info
  const activeExpedition = expeditionManager?.activeExpedition;
  const activeCombat = activeExpedition?.combat;

  // Get party info
  const party = partyManager?.getActiveParty?.() || [];

  // Handlers for expedition lifecycle
  const handleStartExpedition = (config) => {
    if (expeditionManager) {
      // Actually start the expedition with the provided config
      expeditionManager.startExpedition?.(config);
      setExpeditionMode('expedition');
    }
  };

  const handleExpeditionContinue = () => {
    // Continue to next floor or encounter
    if (expeditionManager) {
      expeditionManager.advanceFloor?.();
    }
  };

  const handleExpeditionRetreat = () => {
    if (expeditionManager) {
      expeditionManager.endExpedition?.();
      setExpeditionMode('prep');
    }
  };

  const handleCombatAction = (action) => {
    if (expeditionManager) {
      expeditionManager.processCombatAction?.(action);
    }
  };

  const handleEndCombat = () => {
    // Combat ended, return to expedition HUD
    setExpeditionMode('expedition');
  };

  const handleCancelPrep = () => {
    // User cancelled prep, do nothing
  };

  // Handle entering a dungeon
  const handleEnterDungeon = (dungeonType) => {
    const dungeon = DUNGEON_TYPES.find(d => d.id === dungeonType);
    if (!dungeon) return;

    // Calculate dungeon level based on player level
    const dungeonLevel = Math.max(1, Math.min(player.level, dungeon.recommendedLevel));

    // Enter the dungeon
    const success = enterDungeon(dungeonType, dungeonLevel, {
      health: player.health,
      maxHealth: player.maxHealth,
      mana: player.mana,
      maxMana: player.maxMana,
      damage: player.damage,
      defense: player.defense,
      critChance: player.critChance,
      critDamage: player.critDamage,
      dodgeChance: player.dodgeChance
    });

    if (success && onEnterDungeon) {
      onEnterDungeon();
    }
  };

  // Render dungeon selection interface
  const renderDungeonSelection = () => {
    return (
      <div className="dungeon-selection">
        <div className="expedition-section">
          <div className="expedition-header">
            <span className="expedition-icon">🏰</span>
            <h3>Enter Dungeon</h3>
          </div>

          <div className="dungeon-list">
            {DUNGEON_TYPES.map(dungeon => {
              const isLocked = player.level < dungeon.minLevel;
              const isRecommended = player.level >= dungeon.recommendedLevel;

              return (
                <div
                  key={dungeon.id}
                  className={`dungeon-card ${selectedDungeon === dungeon.id ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => !isLocked && setSelectedDungeon(dungeon.id)}
                >
                  <div className="dungeon-header">
                    <span className="dungeon-icon">{dungeon.icon}</span>
                    <div className="dungeon-info">
                      <h4>{dungeon.name}</h4>
                      <span className={`dungeon-difficulty ${dungeon.difficulty.toLowerCase().replace(' ', '-')}`}>
                        {dungeon.difficulty}
                      </span>
                    </div>
                  </div>

                  <p className="dungeon-description">{dungeon.description}</p>

                  <div className="dungeon-details">
                    <div className="dungeon-stat">
                      <span className="stat-label">Min Level:</span>
                      <span className={`stat-value ${isLocked ? 'locked' : ''}`}>
                        {dungeon.minLevel} {isLocked && `(Need ${dungeon.minLevel - player.level} more)`}
                      </span>
                    </div>
                    <div className="dungeon-stat">
                      <span className="stat-label">Recommended:</span>
                      <span className={`stat-value ${isRecommended ? 'ready' : ''}`}>
                        Level {dungeon.recommendedLevel}
                      </span>
                    </div>
                    <div className="dungeon-stat">
                      <span className="stat-label">Size:</span>
                      <span className="stat-value">{dungeon.floors}</span>
                    </div>
                    <div className="dungeon-rewards">
                      <span className="rewards-label">Rewards:</span>
                      <span className="rewards-value">{dungeon.rewards}</span>
                    </div>
                  </div>

                  {selectedDungeon === dungeon.id && !isLocked && (
                    <button
                      className="start-expedition-btn enter-dungeon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnterDungeon(dungeon.id);
                      }}
                    >
                      ⚔️ Enter Dungeon
                    </button>
                  )}

                  {isLocked && (
                    <div className="dungeon-locked-overlay">
                      🔒 Locked (Level {dungeon.minLevel} required)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Info */}
        <div className="expedition-section info">
          <div className="expedition-header">
            <span className="expedition-icon">📊</span>
            <h3>Your Status</h3>
          </div>
          <div className="player-dungeon-stats">
            <div className="dungeon-stat">
              <span className="stat-label">Level:</span>
              <span className="stat-value">{player.level}</span>
            </div>
            <div className="dungeon-stat">
              <span className="stat-label">Health:</span>
              <span className="stat-value">{player.health}/{player.maxHealth}</span>
            </div>
            <div className="dungeon-stat">
              <span className="stat-label">Damage:</span>
              <span className="stat-value">{player.damage}</span>
            </div>
            <div className="dungeon-stat">
              <span className="stat-label">Defense:</span>
              <span className="stat-value">{player.defense}</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="expedition-section">
          <div className="expedition-header">
            <span className="expedition-icon">💡</span>
            <h3>Tips</h3>
          </div>
          <div className="expedition-tips">
            <p>• Clear all enemies in a room before moving</p>
            <p>• Use WASD or arrow keys to navigate</p>
            <p>• Space/Enter to attack, Tab to switch targets</p>
            <p>• Defeat the boss to complete the dungeon</p>
            <p>• You keep XP and gold even if you retreat!</p>
          </div>
        </div>
      </div>
    );
  };

  // Determine which view to show
  const renderContent = () => {
    // If in dungeon, the DungeonScreen is shown via GameScreen modal
    if (inDungeon) {
      return (
        <div className="in-dungeon-notice">
          <span className="expedition-icon">⚔️</span>
          <p>You are currently in a dungeon!</p>
          <p>Close this panel to return to the dungeon view.</p>
        </div>
      );
    }

    // If there's active combat, show combat interface
    if (activeCombat && expeditionMode === 'combat') {
      return (
        <ExpeditionCombat
          combat={activeCombat}
          party={party}
          enemies={activeCombat.enemies || []}
          onAction={handleCombatAction}
          onEndCombat={handleEndCombat}
        />
      );
    }

    // If there's an active expedition, show expedition HUD
    if (activeExpedition && expeditionMode === 'expedition') {
      return (
        <ExpeditionHUD
          expedition={activeExpedition}
          onRetreat={handleExpeditionRetreat}
          onContinue={handleExpeditionContinue}
        />
      );
    }

    // Default: show dungeon selection and expedition preparation
    return (
      <>
        {renderDungeonSelection()}
        <div className="expedition-divider">
          <span>or</span>
        </div>
        <ExpeditionPrep
          onStart={handleStartExpedition}
          onCancel={handleCancelPrep}
        />
      </>
    );
  };

  return (
    <div className="expeditions-tab">
      {renderContent()}
    </div>
  );
}

export default ExpeditionsTab;
