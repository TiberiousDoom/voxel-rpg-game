/**
 * GameSpeedControls.jsx
 * Compact game speed and pause controls for the HUD
 */

import React, { useEffect, useCallback } from 'react';
import useGameStore from '../../stores/useGameStore';

const SPEEDS = [
  { value: 0, label: '||', title: 'Paused' },
  { value: 1, label: '1x', title: 'Normal Speed' },
  { value: 2, label: '2x', title: 'Fast' },
  { value: 3, label: '3x', title: 'Very Fast' },
];

const GameSpeedControls = () => {
  const gameSpeed = useGameStore((s) => s.gameSpeed ?? 1);
  const setGameSpeed = useGameStore((s) => s.setGameSpeed);

  const handleSpeedChange = useCallback((speed) => {
    if (setGameSpeed) {
      setGameSpeed(speed);
    }
  }, [setGameSpeed]);

  // Keyboard shortcuts: [ to slow down, ] to speed up, P to pause/resume
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === '[') {
        const current = gameSpeed || 1;
        const newSpeed = Math.max(0, current - 1);
        handleSpeedChange(newSpeed);
      } else if (e.key === ']') {
        const current = gameSpeed || 1;
        const newSpeed = Math.min(3, current + 1);
        handleSpeedChange(newSpeed);
      } else if (e.key === 'p' || e.key === 'P') {
        if (e.ctrlKey || e.metaKey) return; // Don't intercept Ctrl+P
        handleSpeedChange(gameSpeed === 0 ? 1 : 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameSpeed, handleSpeedChange]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '6px',
        padding: '4px 6px',
        userSelect: 'none',
      }}
    >
      {SPEEDS.map((speed) => (
        <button
          key={speed.value}
          title={`${speed.title} (${speed.value === 0 ? 'P' : speed.value === 1 ? '[/]' : '[/]'})`}
          onClick={() => handleSpeedChange(speed.value)}
          style={{
            backgroundColor: gameSpeed === speed.value ? '#3498db' : 'transparent',
            color: gameSpeed === speed.value ? '#fff' : '#999',
            border: 'none',
            borderRadius: '4px',
            padding: '3px 8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: gameSpeed === speed.value ? 'bold' : 'normal',
            minWidth: '28px',
            transition: 'all 0.15s',
          }}
        >
          {speed.label}
        </button>
      ))}
    </div>
  );
};

export default GameSpeedControls;
