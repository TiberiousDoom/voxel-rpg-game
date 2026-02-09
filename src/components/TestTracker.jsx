import React, { useState, useEffect, useRef, useCallback } from 'react';
import useGameStore from '../stores/useGameStore';

/**
 * QA Test Tracker overlay — toggled with the backtick (`) key.
 * Displays real-time game stats useful for testing and debugging.
 */
const TestTracker = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [fps, setFps] = useState(0);
  const frameTimestamps = useRef([]);

  // Keyboard toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }
      if (e.key === '`') {
        setIsVisible((prev) => !prev);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // FPS tracking
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      const now = performance.now();
      frameTimestamps.current.push(now);
      // Keep last 60 samples
      if (frameTimestamps.current.length > 60) {
        frameTimestamps.current.shift();
      }
      if (frameTimestamps.current.length >= 2) {
        const oldest = frameTimestamps.current[0];
        const newest = frameTimestamps.current[frameTimestamps.current.length - 1];
        const elapsed = (newest - oldest) / 1000;
        setFps(Math.round(frameTimestamps.current.length / elapsed));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Game state selectors
  const player = useGameStore((state) => state.player);
  const enemies = useGameStore((state) => state.enemies);
  const wildlife = useGameStore((state) => state.wildlife);
  const projectiles = useGameStore((state) => state.projectiles);
  const lootDrops = useGameStore((state) => state.lootDrops);
  const worldTime = useGameStore((state) => state.worldTime);
  const gameState = useGameStore((state) => state.gameState);
  const buildMode = useGameStore((state) => state.buildMode);
  const inventory = useGameStore((state) => state.inventory);
  const hunger = useGameStore((state) => state.hunger);

  const formatPos = useCallback((pos) => {
    if (!pos) return '—';
    return `${pos[0]?.toFixed(1)}, ${pos[1]?.toFixed(1)}, ${pos[2]?.toFixed(1)}`;
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#0f0',
        padding: '10px 14px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        pointerEvents: 'none',
        lineHeight: 1.6,
        minWidth: '220px',
        border: '1px solid rgba(0, 255, 0, 0.3)',
        userSelect: 'none',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#0f0', fontSize: '13px' }}>
        QA Test Tracker
      </div>
      <div style={{ borderBottom: '1px solid rgba(0,255,0,0.2)', marginBottom: '4px' }} />

      {/* Performance */}
      <div>FPS: {fps}</div>
      <div>State: {gameState}</div>
      <div style={{ borderBottom: '1px solid rgba(0,255,0,0.2)', margin: '4px 0' }} />

      {/* Player */}
      <div style={{ color: '#6f6', fontWeight: 'bold' }}>Player</div>
      <div>Pos: {formatPos(player.position)}</div>
      <div>HP: {player.health}/{player.maxHealth}</div>
      <div>MP: {Math.round(player.mana)}/{player.maxMana}</div>
      <div>Stamina: {Math.round(player.stamina)}/{player.maxStamina}</div>
      <div>Level: {player.level} (XP: {player.xp}/{player.xpToNext})</div>
      <div>Hunger: {Math.round(hunger.current)}/{hunger.max}</div>
      <div style={{ borderBottom: '1px solid rgba(0,255,0,0.2)', margin: '4px 0' }} />

      {/* World */}
      <div style={{ color: '#6f6', fontWeight: 'bold' }}>World</div>
      <div>Day: {worldTime.dayNumber} | {worldTime.period} {worldTime.hour}:{String(worldTime.minute).padStart(2, '0')}</div>
      <div>Build Mode: {buildMode ? 'ON' : 'OFF'}</div>
      <div style={{ borderBottom: '1px solid rgba(0,255,0,0.2)', margin: '4px 0' }} />

      {/* Entities */}
      <div style={{ color: '#6f6', fontWeight: 'bold' }}>Entities</div>
      <div>Enemies: {enemies.length}</div>
      <div>Wildlife: {wildlife.length}</div>
      <div>Projectiles: {projectiles.length}</div>
      <div>Loot Drops: {lootDrops.length}</div>
      <div style={{ borderBottom: '1px solid rgba(0,255,0,0.2)', margin: '4px 0' }} />

      {/* Inventory */}
      <div style={{ color: '#6f6', fontWeight: 'bold' }}>Inventory</div>
      <div>Gold: {inventory.gold} | Essence: {inventory.essence}</div>
      <div>Items: {inventory.items?.length ?? 0}</div>

      <div style={{ marginTop: '6px', color: '#888', fontSize: '10px' }}>Press ` to close</div>
    </div>
  );
};

export default TestTracker;
