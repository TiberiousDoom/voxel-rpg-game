/**
 * DungeonRenderer.jsx - Main dungeon visualization component
 *
 * Features:
 * - Room visualization with walls, floor, and doors
 * - Player rendering
 * - Enemy rendering
 * - Boss rendering with effects
 * - Combat effects and animations
 * - Room transitions
 */

import React, { useRef, useEffect, useCallback, memo } from 'react';
import useDungeonStore, { DUNGEON_STATES } from '../../stores/useDungeonStore';
import useGameStore from '../../stores/useGameStore';

/**
 * Colors for room types
 */
const ROOM_FLOOR_COLORS = {
  ENTRANCE: '#2d3a2d',
  CORRIDOR: '#2a2a3a',
  CHAMBER: '#2a2a3a',
  BOSS: '#3a2a2a',
  TREASURE: '#3a3a2a',
  default: '#2a2a3a'
};

const ROOM_WALL_COLORS = {
  ENTRANCE: '#4a5a4a',
  CORRIDOR: '#4a4a5a',
  CHAMBER: '#4a4a5a',
  BOSS: '#5a4a4a',
  TREASURE: '#5a5a4a',
  default: '#4a4a5a'
};

/**
 * Render settings
 */
const TILE_SIZE = 32;
const ROOM_WIDTH = 15;  // tiles
const ROOM_HEIGHT = 11; // tiles

/**
 * DungeonRenderer Component
 */
const DungeonRenderer = memo(function DungeonRenderer({
  width = 800,
  height = 600,
  onRoomExit,
  onEnemyClick,
  onBossClick
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  const {
    status,
    currentRoomId,
    rooms,
    enemies,
    boss,
    playerPosition,
    playerFacing,
    transitioningRoom,
    getCurrentRoom
  } = useDungeonStore();

  const player = useGameStore(state => state.player);
  const currentRoom = getCurrentRoom();

  /**
   * Draw the dungeon
   */
  const draw = useCallback((ctx, deltaTime) => {
    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    if (status === DUNGEON_STATES.INACTIVE || !currentRoom) {
      // Draw "no dungeon" message
      ctx.fillStyle = '#4a4a5a';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No active dungeon', width / 2, height / 2);
      return;
    }

    // Calculate viewport offset (center room)
    const roomPixelWidth = ROOM_WIDTH * TILE_SIZE;
    const roomPixelHeight = ROOM_HEIGHT * TILE_SIZE;
    const offsetX = (width - roomPixelWidth) / 2;
    const offsetY = (height - roomPixelHeight) / 2;

    // Save context state
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Draw room transition effect
    if (transitioningRoom) {
      ctx.globalAlpha = 0.5;
    }

    // Draw room
    drawRoom(ctx, currentRoom);

    // Draw doors
    drawDoors(ctx, currentRoom);

    // Draw enemies
    enemies.forEach((enemy, index) => {
      drawEnemy(ctx, enemy, deltaTime, index);
    });

    // Draw boss
    if (boss && status === DUNGEON_STATES.BOSS_FIGHT) {
      drawBoss(ctx, boss, deltaTime);
    }

    // Draw player
    drawPlayer(ctx, playerPosition, playerFacing, deltaTime);

    // Restore context
    ctx.restore();

    // Draw transition overlay
    if (transitioningRoom) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Entering room...', width / 2, height / 2);
    }

  }, [status, currentRoom, enemies, boss, playerPosition, playerFacing, transitioningRoom, width, height]);

  /**
   * Draw room floor and walls
   */
  const drawRoom = (ctx, room) => {
    const floorColor = ROOM_FLOOR_COLORS[room.type] || ROOM_FLOOR_COLORS.default;
    const wallColor = ROOM_WALL_COLORS[room.type] || ROOM_WALL_COLORS.default;

    // Draw floor
    ctx.fillStyle = floorColor;
    ctx.fillRect(TILE_SIZE, TILE_SIZE, (ROOM_WIDTH - 2) * TILE_SIZE, (ROOM_HEIGHT - 2) * TILE_SIZE);

    // Draw floor pattern
    ctx.strokeStyle = '#1a1a2a';
    ctx.lineWidth = 1;
    for (let x = 1; x < ROOM_WIDTH - 1; x++) {
      for (let y = 1; y < ROOM_HEIGHT - 1; y++) {
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw walls
    ctx.fillStyle = wallColor;

    // Top wall
    ctx.fillRect(0, 0, ROOM_WIDTH * TILE_SIZE, TILE_SIZE);

    // Bottom wall
    ctx.fillRect(0, (ROOM_HEIGHT - 1) * TILE_SIZE, ROOM_WIDTH * TILE_SIZE, TILE_SIZE);

    // Left wall
    ctx.fillRect(0, 0, TILE_SIZE, ROOM_HEIGHT * TILE_SIZE);

    // Right wall
    ctx.fillRect((ROOM_WIDTH - 1) * TILE_SIZE, 0, TILE_SIZE, ROOM_HEIGHT * TILE_SIZE);

    // Wall texture
    ctx.strokeStyle = '#3a3a4a';
    ctx.lineWidth = 2;

    // Horizontal brick lines
    for (let y = 0; y < ROOM_HEIGHT; y++) {
      if (y === 0 || y === ROOM_HEIGHT - 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE + TILE_SIZE / 2);
        ctx.lineTo(ROOM_WIDTH * TILE_SIZE, y * TILE_SIZE + TILE_SIZE / 2);
        ctx.stroke();
      }
    }

    // Add room decorations based on type
    if (room.type === 'BOSS') {
      // Ominous glow
      const gradient = ctx.createRadialGradient(
        (ROOM_WIDTH * TILE_SIZE) / 2, (ROOM_HEIGHT * TILE_SIZE) / 2, 0,
        (ROOM_WIDTH * TILE_SIZE) / 2, (ROOM_HEIGHT * TILE_SIZE) / 2, 200
      );
      gradient.addColorStop(0, 'rgba(220, 38, 38, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, ROOM_WIDTH * TILE_SIZE, ROOM_HEIGHT * TILE_SIZE);
    } else if (room.type === 'TREASURE') {
      // Golden glow
      const gradient = ctx.createRadialGradient(
        (ROOM_WIDTH * TILE_SIZE) / 2, (ROOM_HEIGHT * TILE_SIZE) / 2, 0,
        (ROOM_WIDTH * TILE_SIZE) / 2, (ROOM_HEIGHT * TILE_SIZE) / 2, 150
      );
      gradient.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, ROOM_WIDTH * TILE_SIZE, ROOM_HEIGHT * TILE_SIZE);
    }
  };

  /**
   * Draw doors
   */
  const drawDoors = (ctx, room) => {
    const connections = room.connections;
    if (!connections) return;

    // Get connection directions
    const dirs = connections instanceof Map
      ? Array.from(connections.keys())
      : Object.keys(connections);

    dirs.forEach(direction => {
      let doorX, doorY, doorWidth, doorHeight;

      switch (direction) {
        case 'NORTH':
        case 'north':
          doorX = ((ROOM_WIDTH - 2) / 2) * TILE_SIZE;
          doorY = 0;
          doorWidth = TILE_SIZE * 2;
          doorHeight = TILE_SIZE;
          break;
        case 'SOUTH':
        case 'south':
          doorX = ((ROOM_WIDTH - 2) / 2) * TILE_SIZE;
          doorY = (ROOM_HEIGHT - 1) * TILE_SIZE;
          doorWidth = TILE_SIZE * 2;
          doorHeight = TILE_SIZE;
          break;
        case 'EAST':
        case 'east':
          doorX = (ROOM_WIDTH - 1) * TILE_SIZE;
          doorY = ((ROOM_HEIGHT - 2) / 2) * TILE_SIZE;
          doorWidth = TILE_SIZE;
          doorHeight = TILE_SIZE * 2;
          break;
        case 'WEST':
        case 'west':
          doorX = 0;
          doorY = ((ROOM_HEIGHT - 2) / 2) * TILE_SIZE;
          doorWidth = TILE_SIZE;
          doorHeight = TILE_SIZE * 2;
          break;
        default:
          return;
      }

      // Draw door frame
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(doorX, doorY, doorWidth, doorHeight);

      // Draw door opening
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(doorX + 4, doorY + 4, doorWidth - 8, doorHeight - 8);

      // Door glow
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(doorX + 2, doorY + 2, doorWidth - 4, doorHeight - 4);
    });
  };

  /**
   * Draw player
   */
  const drawPlayer = (ctx, position, facing, deltaTime) => {
    const x = TILE_SIZE + (position.x || ROOM_WIDTH / 2 - 1) * TILE_SIZE + TILE_SIZE / 2;
    const y = TILE_SIZE + (position.y || ROOM_HEIGHT / 2 - 1) * TILE_SIZE + TILE_SIZE / 2;
    const radius = TILE_SIZE * 0.4;

    // Player shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + radius + 4, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player body
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Player highlight
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Player border
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Direction indicator
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(facing) * radius * 0.5,
      y + Math.sin(facing) * radius * 0.5,
      4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  };

  /**
   * Draw enemy
   */
  const drawEnemy = (ctx, enemy, deltaTime, index) => {
    // Distribute enemies in room
    const gridX = (index % 3) + 2;
    const gridY = Math.floor(index / 3) + 2;

    const x = gridX * TILE_SIZE + TILE_SIZE / 2;
    const y = gridY * TILE_SIZE + TILE_SIZE / 2;
    const radius = TILE_SIZE * 0.35;

    // Health percent
    const healthPercent = (enemy.health || 100) / (enemy.maxHealth || 100);

    // Enemy shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + radius + 3, radius * 0.7, radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Enemy body
    ctx.fillStyle = enemy.color || '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Enemy border
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Health bar
    const hpBarWidth = TILE_SIZE * 0.8;
    const hpBarHeight = 4;
    const hpBarX = x - hpBarWidth / 2;
    const hpBarY = y - radius - 10;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    ctx.fillStyle = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * healthPercent, hpBarHeight);
  };

  /**
   * Draw boss
   */
  const drawBoss = (ctx, boss, deltaTime) => {
    const x = (ROOM_WIDTH * TILE_SIZE) / 2;
    const y = TILE_SIZE * 3;
    const size = boss.size || 3;
    const radius = TILE_SIZE * size * 0.3;

    // Boss shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + radius + 5, radius * 0.9, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boss aura (pulsing)
    const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(147, 51, 234, ${0.2 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Boss body
    ctx.fillStyle = boss.color || '#7c3aed';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Boss highlights
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Boss border
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Enraged effect
    if (boss.enraged) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Boss name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name || 'Boss', x, y + radius + 25);
  };

  /**
   * Animation loop
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const animate = (time) => {
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      draw(ctx, deltaTime);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  /**
   * Handle canvas click
   */
  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate room offset
    const roomPixelWidth = ROOM_WIDTH * TILE_SIZE;
    const roomPixelHeight = ROOM_HEIGHT * TILE_SIZE;
    const offsetX = (width - roomPixelWidth) / 2;
    const offsetY = (height - roomPixelHeight) / 2;

    // Convert to room coordinates
    const roomX = clickX - offsetX;
    const roomY = clickY - offsetY;

    // Check door clicks
    const connections = currentRoom?.connections;
    if (connections && onRoomExit) {
      const dirs = connections instanceof Map
        ? Array.from(connections.entries())
        : Object.entries(connections);

      for (const [direction, roomId] of dirs) {
        let doorX, doorY, doorWidth, doorHeight;

        switch (direction.toUpperCase()) {
          case 'NORTH':
            doorX = ((ROOM_WIDTH - 2) / 2) * TILE_SIZE;
            doorY = 0;
            doorWidth = TILE_SIZE * 2;
            doorHeight = TILE_SIZE;
            break;
          case 'SOUTH':
            doorX = ((ROOM_WIDTH - 2) / 2) * TILE_SIZE;
            doorY = (ROOM_HEIGHT - 1) * TILE_SIZE;
            doorWidth = TILE_SIZE * 2;
            doorHeight = TILE_SIZE;
            break;
          case 'EAST':
            doorX = (ROOM_WIDTH - 1) * TILE_SIZE;
            doorY = ((ROOM_HEIGHT - 2) / 2) * TILE_SIZE;
            doorWidth = TILE_SIZE;
            doorHeight = TILE_SIZE * 2;
            break;
          case 'WEST':
            doorX = 0;
            doorY = ((ROOM_HEIGHT - 2) / 2) * TILE_SIZE;
            doorWidth = TILE_SIZE;
            doorHeight = TILE_SIZE * 2;
            break;
          default:
            continue;
        }

        if (
          roomX >= doorX && roomX <= doorX + doorWidth &&
          roomY >= doorY && roomY <= doorY + doorHeight
        ) {
          onRoomExit(direction, roomId);
          return;
        }
      }
    }

    // Check enemy clicks
    if (onEnemyClick && enemies.length > 0) {
      for (let i = 0; i < enemies.length; i++) {
        const gridX = (i % 3) + 2;
        const gridY = Math.floor(i / 3) + 2;
        const ex = gridX * TILE_SIZE + TILE_SIZE / 2;
        const ey = gridY * TILE_SIZE + TILE_SIZE / 2;
        const radius = TILE_SIZE * 0.35;

        const dist = Math.sqrt((roomX - ex) ** 2 + (roomY - ey) ** 2);
        if (dist <= radius) {
          onEnemyClick(enemies[i]);
          return;
        }
      }
    }

    // Check boss click
    if (onBossClick && boss) {
      const bx = (ROOM_WIDTH * TILE_SIZE) / 2;
      const by = TILE_SIZE * 3;
      const size = boss.size || 3;
      const radius = TILE_SIZE * size * 0.3;

      const dist = Math.sqrt((roomX - bx) ** 2 + (roomY - by) ** 2);
      if (dist <= radius) {
        onBossClick(boss);
      }
    }
  }, [currentRoom, enemies, boss, width, height, onRoomExit, onEnemyClick, onBossClick]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      style={{
        display: 'block',
        cursor: 'pointer',
        imageRendering: 'pixelated'
      }}
    />
  );
});

export default DungeonRenderer;
