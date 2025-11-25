/**
 * DungeonScreen.jsx - Main dungeon exploration screen
 *
 * Combines all dungeon components:
 * - DungeonRenderer for room visualization
 * - DungeonHUD for status display
 * - DungeonMiniMap for navigation
 *
 * Handles:
 * - Room transitions
 * - Combat flow
 * - Retreat functionality
 * - Victory/defeat states
 */

import React, { useCallback, useEffect, useRef, memo } from 'react';
import DungeonRenderer from './DungeonRenderer';
import DungeonHUD from './DungeonHUD';
import DungeonMiniMap from './DungeonMiniMap';
import useDungeonStore, { DUNGEON_STATES } from '../../stores/useDungeonStore';
import useGameStore from '../../stores/useGameStore';

/**
 * DungeonScreen Component
 */
const DungeonScreen = memo(function DungeonScreen({
  onExit,
  dungeonManager
}) {
  const containerRef = useRef(null);

  const {
    status,
    currentRoomId,
    enemies,
    boss,
    transitioningRoom,
    enterRoom,
    startRoomTransition,
    clearRoom,
    markRoomExplored,
    updateBoss,
    defeatBoss,
    removeEnemy,
    recordDamageDealt,
    recordDamageTaken,
    addLoot,
    addGold,
    addXP,
    endDungeon,
    getConnectedRooms,
    getCurrentRoom
  } = useDungeonStore();

  const player = useGameStore(state => state.player);
  const dealDamageToPlayer = useGameStore(state => state.dealDamageToPlayer);

  /**
   * Handle room exit (door click)
   */
  const handleRoomExit = useCallback((direction, targetRoomId) => {
    // Don't allow room exit during combat
    if (status === DUNGEON_STATES.COMBAT || status === DUNGEON_STATES.BOSS_FIGHT) {
      console.log('Cannot leave room during combat!');
      return;
    }

    // Start transition
    startRoomTransition();

    // Simulate transition delay
    setTimeout(() => {
      // Get enemies for the new room (would come from dungeon manager)
      const roomEnemies = dungeonManager?.getEnemiesForRoom?.(targetRoomId) || [];

      enterRoom(targetRoomId, roomEnemies);
      markRoomExplored(targetRoomId);
    }, 500);
  }, [status, startRoomTransition, enterRoom, markRoomExplored, dungeonManager]);

  /**
   * Handle enemy click (attack)
   */
  const handleEnemyClick = useCallback((enemy) => {
    if (!enemy || enemy.health <= 0) return;

    // Calculate player damage
    const damage = player.damage || 10;
    const newHealth = Math.max(0, enemy.health - damage);

    recordDamageDealt(damage);

    if (newHealth <= 0) {
      // Enemy defeated
      removeEnemy(enemy.id);

      // Grant rewards
      const xpReward = enemy.xpReward || 20;
      const goldReward = enemy.goldReward || Math.floor(Math.random() * 10) + 5;

      addXP(xpReward);
      addGold(goldReward);

      // Check for loot drop
      if (Math.random() < 0.3) { // 30% drop chance
        addLoot({
          id: `loot_${Date.now()}`,
          name: 'Monster Drop',
          type: 'material'
        });
      }
    } else {
      // Update enemy health in store
      useDungeonStore.getState().updateEnemy(enemy.id, { health: newHealth });
    }
  }, [player, recordDamageDealt, removeEnemy, addXP, addGold, addLoot]);

  /**
   * Handle boss click (attack)
   */
  const handleBossClick = useCallback((bossData) => {
    if (!bossData || !bossData.alive) return;

    // Calculate player damage
    const damage = player.damage || 10;
    const newHealth = Math.max(0, bossData.health - damage);
    const healthPercent = (newHealth / bossData.maxHealth) * 100;

    recordDamageDealt(damage);

    // Check for phase transition
    let newPhase = bossData.currentPhase || 0;
    if (bossData.phases) {
      for (let i = bossData.phases.length - 1; i >= 0; i--) {
        const phase = bossData.phases[i];
        if (healthPercent / 100 <= phase.healthThreshold) {
          newPhase = Math.max(newPhase, i);
          break;
        }
      }
    }

    if (newHealth <= 0) {
      // Boss defeated!
      const loot = bossData.guaranteedDrops?.map((drop, i) => ({
        id: `boss_loot_${Date.now()}_${i}`,
        name: drop,
        type: 'equipment',
        rarity: 'epic'
      })) || [];

      const xpReward = bossData.xpReward || 500;
      const goldReward = Array.isArray(bossData.goldReward)
        ? Math.floor(Math.random() * (bossData.goldReward[1] - bossData.goldReward[0])) + bossData.goldReward[0]
        : bossData.goldReward || 200;

      defeatBoss(loot, xpReward, goldReward);
    } else {
      // Update boss state
      updateBoss({
        health: newHealth,
        healthPercent,
        phase: newPhase
      });
    }
  }, [player, recordDamageDealt, updateBoss, defeatBoss]);

  /**
   * Handle retreat
   */
  const handleRetreat = useCallback(() => {
    const result = endDungeon(status === DUNGEON_STATES.CLEARED);

    if (onExit) {
      onExit(result);
    }
  }, [status, endDungeon, onExit]);

  /**
   * Enemy AI - simulate enemy attacks
   */
  useEffect(() => {
    if (status !== DUNGEON_STATES.COMBAT && status !== DUNGEON_STATES.BOSS_FIGHT) {
      return;
    }

    const attackInterval = setInterval(() => {
      // Get current enemies
      const currentEnemies = useDungeonStore.getState().enemies;
      const currentBoss = useDungeonStore.getState().boss;

      // Each enemy has chance to attack
      currentEnemies.forEach(enemy => {
        if (enemy.health > 0 && Math.random() < 0.3) {
          const damage = enemy.damage || 5;
          dealDamageToPlayer(damage);
          recordDamageTaken(damage);
        }
      });

      // Boss attacks
      if (currentBoss && currentBoss.alive && Math.random() < 0.4) {
        const damage = currentBoss.damage || 15;
        dealDamageToPlayer(damage);
        recordDamageTaken(damage);
      }
    }, 2000); // Attack every 2 seconds

    return () => clearInterval(attackInterval);
  }, [status, dealDamageToPlayer, recordDamageTaken]);

  /**
   * Keyboard controls
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // WASD or Arrow keys for room navigation
      const connectedRooms = getConnectedRooms();
      const currentRoom = getCurrentRoom();

      if (!currentRoom || status === DUNGEON_STATES.COMBAT || status === DUNGEON_STATES.BOSS_FIGHT) {
        return;
      }

      let direction = null;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          direction = 'NORTH';
          break;
        case 's':
        case 'arrowdown':
          direction = 'SOUTH';
          break;
        case 'd':
        case 'arrowright':
          direction = 'EAST';
          break;
        case 'a':
        case 'arrowleft':
          direction = 'WEST';
          break;
        case 'escape':
          // Open pause/retreat menu
          break;
        default:
          return;
      }

      if (direction && currentRoom.connections) {
        const connections = currentRoom.connections instanceof Map
          ? Object.fromEntries(currentRoom.connections)
          : currentRoom.connections;

        const targetRoomId = connections[direction] || connections[direction.toLowerCase()];

        if (targetRoomId) {
          handleRoomExit(direction, targetRoomId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, getConnectedRooms, getCurrentRoom, handleRoomExit]);

  // Don't render if not in dungeon
  if (status === DUNGEON_STATES.INACTIVE) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0a0a0f',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Main Renderer */}
      <DungeonRenderer
        width={800}
        height={600}
        onRoomExit={handleRoomExit}
        onEnemyClick={handleEnemyClick}
        onBossClick={handleBossClick}
      />

      {/* HUD Overlay */}
      <DungeonHUD onRetreat={handleRetreat} />

      {/* Mini-Map */}
      <DungeonMiniMap position="top-right" />

      {/* Controls Help */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px',
          padding: '8px 16px',
          color: '#94a3b8',
          fontSize: '0.75rem',
          display: 'flex',
          gap: '16px'
        }}
      >
        <span>WASD / Arrows: Move</span>
        <span>Click: Attack</span>
        <span>Click Door: Enter Room</span>
      </div>
    </div>
  );
});

export default DungeonScreen;
