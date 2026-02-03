/**
 * DungeonScreen.jsx - Main dungeon gameplay interface with real-time combat
 *
 * Features:
 * - 2D arena view with player and enemy positions
 * - Real-time combat matching overworld mechanics
 * - Floating damage numbers
 * - Enemy AI with movement and attacks
 * - Room navigation between combats
 * - Combat log and mini-map
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import useDungeonStore from '../../stores/useDungeonStore';
import useGameStore from '../../stores/useGameStore';
import { getQuestManager } from '../../systems/QuestManager';
import { audioManager } from '../../utils/AudioManager';
import DungeonMiniMap from './DungeonMiniMap';
import DungeonCombatLog from './DungeonCombatLog';
import DungeonSkillBar from './DungeonSkillBar';
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
 * Enemy sprite icons by type
 */
const ENEMY_ICONS = {
  CAVE_SPIDER: '🕷️',
  CAVE_BAT: '🦇',
  CAVE_TROLL: '👹',
  BROOD_MOTHER: '🕸️',
  FOREST_WOLF: '🐺',
  GOBLIN: '👺',
  ORC_WARRIOR: '⚔️',
  ANCIENT_TREANT: '🌳',
  SKELETON: '💀',
  GHOST: '👻',
  UNDEAD_KNIGHT: '🗡️',
  LICH_LORD: '☠️'
};

/**
 * DamageNumber Component - Floating damage indicator
 */
function DamageNumber({ damage, x, y, type, isCrit, createdAt }) {
  const age = Date.now() - createdAt;
  const maxAge = type === 'boss' ? 2000 : 1500; // Boss abilities show longer
  const progress = Math.min(1, age / maxAge);

  // Float upward and fade out
  const offsetY = progress * (type === 'boss' ? 80 : 60);
  const opacity = 1 - progress;
  let scale = isCrit ? 1.3 : 1;

  let color = '#ff4444'; // Player damage (red)
  let text = `-${damage}`;
  let extraClass = '';

  if (type === 'enemy') {
    color = '#ff8800'; // Enemy damage to player (orange)
  } else if (type === 'boss') {
    color = '#ff3333'; // Boss ability damage (bright red)
    scale = 1.4;
    extraClass = 'boss-ability';
  } else if (type === 'skill') {
    color = '#aa44ff'; // Skill damage (purple)
  } else if (type === 'heal') {
    color = '#44ff44'; // Healing (green)
    text = `+${damage}`;
    extraClass = 'heal';
  } else if (type === 'dodge') {
    color = '#4488ff'; // Dodge (blue)
    text = '';
    extraClass = 'dodge';
  }

  if (isCrit && type !== 'boss') {
    color = '#ffff00'; // Crit (yellow)
    text = `CRIT! -${damage}`;
  }

  return (
    <div
      className={`damage-number ${extraClass}`}
      style={{
        left: x,
        top: y - offsetY,
        opacity,
        transform: `translate(-50%, -50%) scale(${scale})`,
        color,
        textShadow: `0 0 4px ${color}, 0 2px 4px rgba(0,0,0,0.8)`
      }}
    >
      {text}
    </div>
  );
}

/**
 * EnemySprite Component - 2D enemy representation
 */
function EnemySprite({ enemy, isSelected, onClick }) {
  const icon = ENEMY_ICONS[enemy.type] || '👾';
  const healthPercent = (enemy.health / enemy.maxHealth) * 100;

  const isFlashing = enemy.hitFlashTimer > 0;
  const isAttacking = enemy.isAttacking;
  const isPreparingAbility = enemy.pendingAbility && enemy.abilityTimer > 0;

  // Build class list
  const classNames = ['enemy-sprite'];
  if (!enemy.alive) classNames.push('dead');
  if (isFlashing) classNames.push('hit-flash');
  if (isAttacking) classNames.push('attacking');
  if (enemy.isBoss) classNames.push('boss');
  if (enemy.isElite) classNames.push('elite');
  if (isSelected && enemy.alive) classNames.push('selected');
  if (isPreparingAbility) classNames.push('preparing-ability');
  if (enemy.isBuffed) classNames.push('buffed');

  return (
    <div
      className={classNames.join(' ')}
      style={{
        left: enemy.position.x,
        top: enemy.position.y
      }}
      onClick={() => enemy.alive && onClick(enemy.id)}
    >
      {/* Buff indicator */}
      {enemy.isBuffed && (
        <div className="boss-buff-indicator" title="Enraged">🔥</div>
      )}

      {/* Ability warning */}
      {isPreparingAbility && (
        <div className="boss-ability-warning">
          {enemy.pendingAbility.replace(/_/g, ' ').toUpperCase()}!
        </div>
      )}

      <div className="enemy-sprite-icon">{icon}</div>
      <div className="enemy-sprite-name">
        {enemy.isBoss && '👑 '}
        {enemy.isElite && '⭐ '}
        {enemy.name}
      </div>
      <div className="enemy-sprite-health-bar">
        <div
          className="enemy-sprite-health-fill"
          style={{
            width: `${healthPercent}%`,
            backgroundColor: enemy.isBoss ? '#a33' : enemy.isElite ? '#a83' : '#3a3'
          }}
        />
      </div>
      {enemy.isBoss && (
        <div className="enemy-sprite-phase">
          Phase {enemy.currentPhase}/{enemy.maxPhases}
        </div>
      )}
      {!enemy.alive && <div className="enemy-sprite-dead-overlay">DEFEATED</div>}
    </div>
  );
}

/**
 * PlayerSprite Component - 2D player representation
 */
function PlayerSprite({ position, health, maxHealth, attackCooldown, attackSpeed }) {
  const healthPercent = (health / maxHealth) * 100;
  const cooldownPercent = attackCooldown > 0 ? (attackCooldown / (1000 / attackSpeed)) * 100 : 0;

  return (
    <div
      className="player-sprite"
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <div className="player-sprite-icon">⚔️</div>
      <div className="player-sprite-label">You</div>
      <div className="player-sprite-health-bar">
        <div
          className="player-sprite-health-fill"
          style={{ width: `${healthPercent}%` }}
        />
      </div>
      {cooldownPercent > 0 && (
        <div className="player-sprite-cooldown">
          <div
            className="player-sprite-cooldown-fill"
            style={{ width: `${100 - cooldownPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * DungeonScreen Component
 */
function DungeonScreen({ onExit }) {
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
    playerPosition,
    playerAttackCooldown,
    damageNumbers,
    bossDefeated,
    collectedXP,
    collectedGold,
    combatLog,
    isTransitioning,
    attackEnemy,
    moveToRoom,
    movePlayer,
    selectTarget,
    exitDungeon,
    handlePlayerDeath,
    getAvailableDirections,
    getCurrentRoom,
    isPlayerDead,
    update,
    getArenaDimensions
  } = useDungeonStore();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [rewards, setRewards] = useState(null);
  const [keysPressed, setKeysPressed] = useState({});
  const gameLoopRef = useRef(null);
  const lastTimeRef = useRef(performance.now());

  // Get arena dimensions
  const arenaDimensions = getArenaDimensions();

  // Get current room data
  const currentRoom = getCurrentRoom();
  const availableDirections = getAvailableDirections();
  const roomVisual = currentRoom ? ROOM_VISUALS[currentRoom.type] : ROOM_VISUALS.CHAMBER;

  // Main game loop
  useEffect(() => {
    if (!inDungeon || rewards) return;

    const gameLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Update dungeon state (enemy AI, cooldowns, etc.)
      update(deltaTime, {
        damage: player.damage,
        defense: player.defense,
        dodgeChance: player.dodgeChance,
        attackSpeed: player.attackSpeed || 1.0
      });

      // Handle player movement input
      const moveX = (keysPressed['d'] || keysPressed['arrowright'] ? 1 : 0) -
                    (keysPressed['a'] || keysPressed['arrowleft'] ? 1 : 0);
      const moveY = (keysPressed['s'] || keysPressed['arrowdown'] ? 1 : 0) -
                    (keysPressed['w'] || keysPressed['arrowup'] ? 1 : 0);

      if (moveX !== 0 || moveY !== 0) {
        movePlayer(moveX, moveY, deltaTime);
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [inDungeon, rewards, player, update, movePlayer, keysPressed]);

  // Check for player death
  useEffect(() => {
    if (isPlayerDead() && inDungeon && !rewards) {
      const deathRewards = handlePlayerDeath();
      setRewards({ ...deathRewards, died: true });
    }
  }, [dungeonPlayerHealth, isPlayerDead, handlePlayerDeath, inDungeon, rewards]);

  // Handle attack action
  const handleAttack = useCallback(() => {
    if (!selectedTargetId || isPlayerDead()) return;

    const result = attackEnemy(selectedTargetId, {
      damage: player.damage,
      critChance: player.critChance,
      critDamage: player.critDamage,
      defense: player.defense,
      dodgeChance: player.dodgeChance,
      attackSpeed: player.attackSpeed || 1.0
    });

    // Play attack sounds
    if (result && result.success) {
      audioManager.play('playerAttack');
      if (result.isCrit) {
        audioManager.play('criticalHit');
      }
      if (result.enemyKilled) {
        audioManager.play('enemyDeath');
        if (result.lootDropped) {
          audioManager.play('lootDrop');
        }
      }
    }
  }, [selectedTargetId, player, attackEnemy, isPlayerDead]);

  // Handle click on enemy
  const handleEnemyClick = useCallback((enemyId) => {
    selectTarget(enemyId);
    // Also attack if we have a target selected
    if (playerAttackCooldown <= 0) {
      const result = attackEnemy(enemyId, {
        damage: player.damage,
        critChance: player.critChance,
        critDamage: player.critDamage,
        defense: player.defense,
        dodgeChance: player.dodgeChance,
        attackSpeed: player.attackSpeed || 1.0
      });

      // Play attack sounds
      if (result && result.success) {
        audioManager.play('playerAttack');
        if (result.isCrit) {
          audioManager.play('criticalHit');
        }
        if (result.enemyKilled) {
          audioManager.play('enemyDeath');
          if (result.lootDropped) {
            audioManager.play('lootDrop');
          }
        }
      }
    }
  }, [selectTarget, attackEnemy, player, playerAttackCooldown]);

  // Handle movement
  const handleMove = useCallback((direction) => {
    if (inCombat || isTransitioning) return;
    audioManager.play('roomTransition');
    moveToRoom(direction);
  }, [inCombat, isTransitioning, moveToRoom]);

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

    // Track kills for quest progress
    const questManager = getQuestManager();
    if (dungeonRewards.killsByType) {
      Object.entries(dungeonRewards.killsByType).forEach(([monsterType, count]) => {
        for (let i = 0; i < count; i++) {
          questManager.trackKill(monsterType);
        }
      });
    }

    setRewards(dungeonRewards);
  }, [exitDungeon, addXP, addGold, addItem]);

  // Handle close after viewing rewards
  const handleClose = useCallback(() => {
    setRewards(null);
    if (onExit) onExit();
  }, [onExit]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!inDungeon || rewards) return;

      const key = e.key.toLowerCase();
      setKeysPressed(prev => ({ ...prev, [key]: true }));

      // Room navigation (only when not in combat)
      if (!inCombat && !isTransitioning) {
        switch (key) {
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
          default:
            break;
        }
      }

      // Combat controls
      if (inCombat) {
        switch (key) {
          case ' ':
          case 'enter':
            e.preventDefault();
            handleAttack();
            break;
          case 'tab':
            e.preventDefault();
            const aliveEnemies = currentEnemies.filter(e => e.alive);
            if (aliveEnemies.length > 0) {
              const currentIndex = aliveEnemies.findIndex(e => e.id === selectedTargetId);
              const nextIndex = (currentIndex + 1) % aliveEnemies.length;
              selectTarget(aliveEnemies[nextIndex].id);
            }
            break;
          default:
            break;
        }
      }

      if (key === 'escape') {
        setShowExitConfirm(true);
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      setKeysPressed(prev => ({ ...prev, [key]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [inDungeon, rewards, availableDirections, handleMove, handleAttack, inCombat, currentEnemies, selectedTargetId, selectTarget, isTransitioning]);

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

          {/* Navigation Controls (only show when not in combat) */}
          {!inCombat && (
            <div className="navigation-panel">
              <h3>Navigation</h3>
              <div className="nav-grid">
                <div className="nav-row">
                  <div className="nav-empty" />
                  <button
                    className={`nav-btn ${availableDirections.includes('NORTH') ? 'available' : 'blocked'}`}
                    onClick={() => handleMove('NORTH')}
                    disabled={!availableDirections.includes('NORTH') || isTransitioning}
                  >
                    {DIRECTION_ICONS.NORTH}
                  </button>
                  <div className="nav-empty" />
                </div>
                <div className="nav-row">
                  <button
                    className={`nav-btn ${availableDirections.includes('WEST') ? 'available' : 'blocked'}`}
                    onClick={() => handleMove('WEST')}
                    disabled={!availableDirections.includes('WEST') || isTransitioning}
                  >
                    {DIRECTION_ICONS.WEST}
                  </button>
                  <div className="nav-center">
                    {roomVisual.icon}
                  </div>
                  <button
                    className={`nav-btn ${availableDirections.includes('EAST') ? 'available' : 'blocked'}`}
                    onClick={() => handleMove('EAST')}
                    disabled={!availableDirections.includes('EAST') || isTransitioning}
                  >
                    {DIRECTION_ICONS.EAST}
                  </button>
                </div>
                <div className="nav-row">
                  <div className="nav-empty" />
                  <button
                    className={`nav-btn ${availableDirections.includes('SOUTH') ? 'available' : 'blocked'}`}
                    onClick={() => handleMove('SOUTH')}
                    disabled={!availableDirections.includes('SOUTH') || isTransitioning}
                  >
                    {DIRECTION_ICONS.SOUTH}
                  </button>
                  <div className="nav-empty" />
                </div>
              </div>
            </div>
          )}

          {/* Combat instructions when in combat */}
          {inCombat && (
            <div className="combat-instructions">
              <h3>Combat</h3>
              <p>Click enemies to attack</p>
              <p>WASD: Move around</p>
              <p>Space: Attack selected</p>
              <p>Tab: Switch target</p>
            </div>
          )}
        </div>

        {/* Center Panel - Combat Arena */}
        <div className="dungeon-center-panel">
          <div className="room-display" style={{ borderColor: roomVisual.color }}>
            <div className="room-header" style={{ backgroundColor: roomVisual.color }}>
              <span className="room-icon">{roomVisual.icon}</span>
              <span className="room-name">{roomVisual.name}</span>
              {!inCombat && currentRoom?.cleared && <span className="cleared-badge">Cleared</span>}
            </div>

            {/* Combat Arena */}
            <div
              className={`combat-arena ${isTransitioning ? 'transitioning' : ''}`}
              style={{
                width: arenaDimensions.width,
                height: arenaDimensions.height
              }}
            >
              {/* Enemies */}
              {currentEnemies.map(enemy => (
                <EnemySprite
                  key={enemy.id}
                  enemy={enemy}
                  isSelected={selectedTargetId === enemy.id}
                  onClick={handleEnemyClick}
                />
              ))}

              {/* Player */}
              <PlayerSprite
                position={playerPosition}
                health={dungeonPlayerHealth}
                maxHealth={dungeonPlayerMaxHealth}
                attackCooldown={playerAttackCooldown}
                attackSpeed={player.attackSpeed || 1.0}
              />

              {/* Damage Numbers */}
              {damageNumbers.map(dmg => (
                <DamageNumber
                  key={dmg.id}
                  damage={dmg.damage}
                  x={dmg.x}
                  y={dmg.y}
                  type={dmg.type}
                  isCrit={dmg.isCrit}
                  createdAt={dmg.createdAt}
                />
              ))}

              {/* Room clear message */}
              {!inCombat && currentEnemies.length === 0 && (
                <div className="arena-message">
                  <p>Room Clear!</p>
                  <p className="hint">Use WASD or arrows to move to next room</p>
                </div>
              )}

              {/* Transition overlay */}
              {isTransitioning && (
                <div className="transition-overlay">
                  <div className="transition-text">Entering next room...</div>
                </div>
              )}
            </div>
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
                <span className="bar-text">{Math.floor(dungeonPlayerHealth)} / {dungeonPlayerMaxHealth}</span>
              </div>
            </div>
            <div className="stat-bar mana-bar">
              <span className="stat-label">MP</span>
              <div className="bar-container">
                <div
                  className="bar-fill mana"
                  style={{ width: `${(dungeonPlayerMana / dungeonPlayerMaxMana) * 100}%` }}
                />
                <span className="bar-text">{Math.floor(dungeonPlayerMana)} / {dungeonPlayerMaxMana}</span>
              </div>
            </div>
            <div className="player-combat-stats">
              <div>Damage: {player.damage}</div>
              <div>Defense: {player.defense}</div>
              <div>Crit: {player.critChance}%</div>
            </div>

          </div>

          {/* Skill Bar */}
          <DungeonSkillBar />

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
        <span>WASD: {inCombat ? 'Move' : 'Navigate'}</span>
        <span>Click/Space: Attack</span>
        <span>Tab: Switch Target</span>
        <span>ESC: Exit</span>
      </div>
    </div>
  );
}

export default DungeonScreen;
