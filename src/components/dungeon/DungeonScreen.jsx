/**
 * DungeonScreen.jsx - Main dungeon gameplay interface
 *
 * Features:
 * - Room visualization with doors
 * - Enemy list with health bars
 * - Combat controls (attack, skills)
 * - Player stats display
 * - Combat log
 * - Mini-map
 * - Navigation between rooms
 */

import React, { useEffect, useCallback, useState } from 'react';
import useDungeonStore from '../../stores/useDungeonStore';
import useGameStore from '../../stores/useGameStore';
import DungeonMiniMap from './DungeonMiniMap';
import DungeonCombatLog from './DungeonCombatLog';
import './DungeonScreen.css';

/**
 * Room type visual configurations
 */
const ROOM_VISUALS = {
  ENTRANCE: { icon: '🚪', color: '#4a6fa5', name: 'Entrance' },
  CORRIDOR: { icon: '🛤️', color: '#5a5a6a', name: 'Corridor' },
  CHAMBER: { icon: '⚔️', color: '#6a4a4a', name: 'Combat Chamber' },
  BOSS: { icon: '💀', color: '#8a2a2a', name: 'Boss Arena' },
  TREASURE: { icon: '💎', color: '#8a7a2a', name: 'Treasure Room' }
};

/**
 * Direction icons
 */
const DIRECTION_ICONS = {
  NORTH: '⬆️',
  SOUTH: '⬇️',
  EAST: '➡️',
  WEST: '⬅️'
};

/**
 * DungeonScreen Component
 */
function DungeonScreen({ onExit, onDeath }) {
  const player = useGameStore((state) => state.player);
  const addXP = useGameStore((state) => state.addXP);
  const addGold = useGameStore((state) => state.addGold);
  const addItem = useGameStore((state) => state.addItem);

  const {
    inDungeon,
    dungeonType,
    dungeonLevel,
    currentRoomId,
    activeDungeon,
    exploredRooms,
    currentEnemies,
    inCombat,
    selectedTargetId,
    dungeonPlayerHealth,
    dungeonPlayerMaxHealth,
    dungeonPlayerMana,
    dungeonPlayerMaxMana,
    bossDefeated,
    collectedXP,
    collectedGold,
    combatLog,
    attackEnemy,
    moveToRoom,
    selectTarget,
    exitDungeon,
    handlePlayerDeath,
    getAvailableDirections,
    getCurrentRoom,
    isPlayerDead,
    healPlayer,
    updateCooldowns
  } = useDungeonStore();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [rewards, setRewards] = useState(null);

  // Get current room data
  const currentRoom = getCurrentRoom();
  const availableDirections = getAvailableDirections();
  const roomVisual = currentRoom ? ROOM_VISUALS[currentRoom.type] : ROOM_VISUALS.CHAMBER;

  // Update cooldowns
  useEffect(() => {
    if (!inDungeon) return;

    let lastTime = performance.now();
    let animationFrameId;

    const updateLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      updateCooldowns(deltaTime);
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [inDungeon, updateCooldowns]);

  // Check for player death
  useEffect(() => {
    if (isPlayerDead()) {
      const deathRewards = handlePlayerDeath();
      setRewards({ ...deathRewards, died: true });
    }
  }, [dungeonPlayerHealth, isPlayerDead, handlePlayerDeath]);

  // Handle attack action
  const handleAttack = useCallback(() => {
    if (!selectedTargetId || isPlayerDead()) return;

    const result = attackEnemy(selectedTargetId, {
      damage: player.damage,
      critChance: player.critChance,
      critDamage: player.critDamage,
      defense: player.defense,
      dodgeChance: player.dodgeChance
    });

    return result;
  }, [selectedTargetId, player, attackEnemy, isPlayerDead]);

  // Handle movement
  const handleMove = useCallback((direction) => {
    if (inCombat) return;
    moveToRoom(direction);
  }, [inCombat, moveToRoom]);

  // Handle exit
  const handleExit = useCallback(() => {
    const dungeonRewards = exitDungeon();

    // Apply rewards to main game state
    if (dungeonRewards.xp > 0) {
      addXP(dungeonRewards.xp);
    }
    if (dungeonRewards.gold > 0) {
      addGold(dungeonRewards.gold);
    }
    dungeonRewards.loot.forEach(item => {
      addItem(item);
    });

    setRewards(dungeonRewards);
  }, [exitDungeon, addXP, addGold, addItem]);

  // Handle close after viewing rewards
  const handleClose = useCallback(() => {
    setRewards(null);
    if (onExit) onExit();
  }, [onExit]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!inDungeon || rewards) return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          if (availableDirections.includes('NORTH')) handleMove('NORTH');
          break;
        case 's':
        case 'arrowdown':
          if (availableDirections.includes('SOUTH')) handleMove('SOUTH');
          break;
        case 'd':
        case 'arrowright':
          if (availableDirections.includes('EAST')) handleMove('EAST');
          break;
        case 'a':
        case 'arrowleft':
          if (availableDirections.includes('WEST')) handleMove('WEST');
          break;
        case ' ':
        case 'enter':
          if (inCombat) handleAttack();
          break;
        case 'tab':
          // Cycle through targets
          e.preventDefault();
          const aliveEnemies = currentEnemies.filter(e => e.alive);
          if (aliveEnemies.length > 0) {
            const currentIndex = aliveEnemies.findIndex(e => e.id === selectedTargetId);
            const nextIndex = (currentIndex + 1) % aliveEnemies.length;
            selectTarget(aliveEnemies[nextIndex].id);
          }
          break;
        case 'escape':
          setShowExitConfirm(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [inDungeon, rewards, availableDirections, handleMove, handleAttack, inCombat, currentEnemies, selectedTargetId, selectTarget]);

  // Show rewards screen
  if (rewards) {
    return (
      <div className="dungeon-screen dungeon-rewards">
        <div className="rewards-container">
          <h2>{rewards.died ? 'You Died!' : (rewards.completed ? 'Dungeon Cleared!' : 'Dungeon Exited')}</h2>

          {rewards.died && (
            <p className="death-message">You lost some of your collected rewards...</p>
          )}

          <div className="rewards-summary">
            <div className="reward-item">
              <span className="reward-icon">✨</span>
              <span className="reward-value">+{rewards.xp} XP</span>
            </div>
            <div className="reward-item">
              <span className="reward-icon">💰</span>
              <span className="reward-value">+{rewards.gold} Gold</span>
            </div>
            {rewards.loot.length > 0 && (
              <div className="reward-item">
                <span className="reward-icon">🎁</span>
                <span className="reward-value">{rewards.loot.length} Items</span>
              </div>
            )}
          </div>

          <div className="rewards-stats">
            <div>Rooms Cleared: {rewards.roomsCleared}</div>
            <div>Enemies Killed: {rewards.enemiesKilled}</div>
            {rewards.bossDefeated && <div className="boss-defeated">Boss Defeated!</div>}
          </div>

          <button className="exit-button" onClick={handleClose}>
            Return to Camp
          </button>
        </div>
      </div>
    );
  }

  // Main dungeon interface
  return (
    <div className="dungeon-screen">
      {/* Header */}
      <div className="dungeon-header">
        <div className="dungeon-title">
          <span className="dungeon-type-icon">{roomVisual.icon}</span>
          <h2>{dungeonType} Dungeon - Level {dungeonLevel}</h2>
        </div>
        <div className="dungeon-progress">
          <span>XP: {collectedXP}</span>
          <span>Gold: {collectedGold}</span>
          {bossDefeated && <span className="boss-indicator">Boss Defeated!</span>}
        </div>
        <button className="exit-btn" onClick={() => setShowExitConfirm(true)}>
          Exit
        </button>
      </div>

      <div className="dungeon-content">
        {/* Left Panel - Mini Map & Navigation */}
        <div className="dungeon-left-panel">
          <DungeonMiniMap
            dungeon={activeDungeon}
            currentRoomId={currentRoomId}
            exploredRooms={exploredRooms}
          />

          {/* Navigation Controls */}
          <div className="navigation-panel">
            <h3>Navigation</h3>
            <div className="nav-grid">
              <div className="nav-row">
                <div className="nav-empty" />
                <button
                  className={`nav-btn ${availableDirections.includes('NORTH') ? 'available' : 'blocked'}`}
                  onClick={() => handleMove('NORTH')}
                  disabled={!availableDirections.includes('NORTH') || inCombat}
                >
                  {DIRECTION_ICONS.NORTH}
                </button>
                <div className="nav-empty" />
              </div>
              <div className="nav-row">
                <button
                  className={`nav-btn ${availableDirections.includes('WEST') ? 'available' : 'blocked'}`}
                  onClick={() => handleMove('WEST')}
                  disabled={!availableDirections.includes('WEST') || inCombat}
                >
                  {DIRECTION_ICONS.WEST}
                </button>
                <div className="nav-center">
                  {roomVisual.icon}
                </div>
                <button
                  className={`nav-btn ${availableDirections.includes('EAST') ? 'available' : 'blocked'}`}
                  onClick={() => handleMove('EAST')}
                  disabled={!availableDirections.includes('EAST') || inCombat}
                >
                  {DIRECTION_ICONS.EAST}
                </button>
              </div>
              <div className="nav-row">
                <div className="nav-empty" />
                <button
                  className={`nav-btn ${availableDirections.includes('SOUTH') ? 'available' : 'blocked'}`}
                  onClick={() => handleMove('SOUTH')}
                  disabled={!availableDirections.includes('SOUTH') || inCombat}
                >
                  {DIRECTION_ICONS.SOUTH}
                </button>
                <div className="nav-empty" />
              </div>
            </div>
            {inCombat && <p className="combat-warning">Clear enemies to move!</p>}
          </div>
        </div>

        {/* Center Panel - Room & Combat */}
        <div className="dungeon-center-panel">
          {/* Room Display */}
          <div className="room-display" style={{ borderColor: roomVisual.color }}>
            <div className="room-header" style={{ backgroundColor: roomVisual.color }}>
              <span className="room-icon">{roomVisual.icon}</span>
              <span className="room-name">{roomVisual.name}</span>
              {currentRoom?.cleared && <span className="cleared-badge">Cleared</span>}
            </div>

            {/* Enemy List */}
            <div className="enemy-list">
              {currentEnemies.length === 0 ? (
                <div className="no-enemies">
                  <p>Room is clear</p>
                  <p className="hint">Use WASD or arrows to move</p>
                </div>
              ) : (
                currentEnemies.map(enemy => (
                  <div
                    key={enemy.id}
                    className={`enemy-card ${!enemy.alive ? 'dead' : ''} ${selectedTargetId === enemy.id ? 'selected' : ''} ${enemy.isBoss ? 'boss' : ''} ${enemy.isElite ? 'elite' : ''}`}
                    onClick={() => enemy.alive && selectTarget(enemy.id)}
                  >
                    <div className="enemy-info">
                      <span className="enemy-name">
                        {enemy.isBoss && '👑 '}
                        {enemy.isElite && '⭐ '}
                        {enemy.name}
                      </span>
                      {enemy.isBoss && (
                        <span className="boss-phase">Phase {enemy.currentPhase}/{enemy.maxPhases}</span>
                      )}
                    </div>
                    <div className="enemy-health-bar">
                      <div
                        className="enemy-health-fill"
                        style={{
                          width: `${(enemy.health / enemy.maxHealth) * 100}%`,
                          backgroundColor: enemy.isBoss ? '#a33' : enemy.isElite ? '#a83' : '#3a3'
                        }}
                      />
                      <span className="enemy-health-text">
                        {enemy.health} / {enemy.maxHealth}
                      </span>
                    </div>
                    {!enemy.alive && <div className="enemy-dead-overlay">DEFEATED</div>}
                  </div>
                ))
              )}
            </div>

            {/* Combat Actions */}
            {inCombat && (
              <div className="combat-actions">
                <button
                  className="attack-btn"
                  onClick={handleAttack}
                  disabled={!selectedTargetId || isPlayerDead()}
                >
                  ⚔️ Attack
                </button>
                <button
                  className="skill-btn"
                  onClick={() => healPlayer(Math.floor(dungeonPlayerMaxHealth * 0.2))}
                  disabled={isPlayerDead()}
                >
                  💚 Heal (20%)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Player Stats & Log */}
        <div className="dungeon-right-panel">
          {/* Player Stats */}
          <div className="player-stats-panel">
            <h3>Your Status</h3>
            <div className="stat-bar health-bar">
              <span className="stat-label">HP</span>
              <div className="bar-container">
                <div
                  className="bar-fill health"
                  style={{ width: `${(dungeonPlayerHealth / dungeonPlayerMaxHealth) * 100}%` }}
                />
                <span className="bar-text">{dungeonPlayerHealth} / {dungeonPlayerMaxHealth}</span>
              </div>
            </div>
            <div className="stat-bar mana-bar">
              <span className="stat-label">MP</span>
              <div className="bar-container">
                <div
                  className="bar-fill mana"
                  style={{ width: `${(dungeonPlayerMana / dungeonPlayerMaxMana) * 100}%` }}
                />
                <span className="bar-text">{dungeonPlayerMana} / {dungeonPlayerMaxMana}</span>
              </div>
            </div>
            <div className="player-combat-stats">
              <div>Damage: {player.damage}</div>
              <div>Defense: {player.defense}</div>
              <div>Crit: {player.critChance}%</div>
            </div>
          </div>

          {/* Combat Log */}
          <DungeonCombatLog logs={combatLog} />
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="modal-overlay">
          <div className="exit-confirm-modal">
            <h3>Exit Dungeon?</h3>
            <p>You will keep your collected rewards:</p>
            <p>XP: {collectedXP} | Gold: {collectedGold}</p>
            <div className="modal-buttons">
              <button className="confirm-btn" onClick={handleExit}>
                Yes, Exit
              </button>
              <button className="cancel-btn" onClick={() => setShowExitConfirm(false)}>
                Keep Exploring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Hint */}
      <div className="controls-hint">
        <span>WASD/Arrows: Move</span>
        <span>Space/Enter: Attack</span>
        <span>Tab: Switch Target</span>
        <span>ESC: Exit</span>
      </div>
    </div>
  );
}

export default DungeonScreen;
