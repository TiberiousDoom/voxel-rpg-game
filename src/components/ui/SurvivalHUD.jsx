/**
 * SurvivalHUD.jsx — Unified survival stats display
 *
 * Shows health, stamina, hunger bars + shelter status.
 * Positioned top-left. Compact, readable, doesn't obstruct gameplay.
 */

import React from 'react';
import useGameStore from '../../stores/useGameStore';

const containerStyle = {
  position: 'fixed',
  top: 12,
  left: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  pointerEvents: 'none',
  zIndex: 900,
  userSelect: 'none',
};

const barContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: 18,
};

const labelStyle = {
  fontFamily: 'monospace',
  fontSize: 11,
  color: 'white',
  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
  width: 14,
  textAlign: 'center',
};

const barOuterStyle = {
  width: 120,
  height: 10,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  borderRadius: 3,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.15)',
};

const shelterBadgeStyle = {
  fontFamily: 'monospace',
  fontSize: 10,
  color: 'white',
  backgroundColor: 'rgba(0, 100, 0, 0.6)',
  padding: '2px 6px',
  borderRadius: 3,
  marginTop: 2,
  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
};

const exposedBadgeStyle = {
  ...shelterBadgeStyle,
  backgroundColor: 'rgba(180, 0, 0, 0.5)',
};

function StatBar({ label, value, max, color, flashThreshold }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const isLow = flashThreshold && value < flashThreshold;

  return (
    <div style={barContainerStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={barOuterStyle}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 2,
            transition: 'width 0.3s ease',
            opacity: isLow ? (Math.sin(Date.now() / 200) > 0 ? 1 : 0.5) : 1,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color: isLow ? '#ff6666' : 'rgba(255,255,255,0.7)',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
          width: 30,
        }}
      >
        {Math.ceil(value)}
      </span>
    </div>
  );
}

const SurvivalHUD = () => {
  const health = useGameStore((s) => s.player.health);
  const maxHealth = useGameStore((s) => s.player.maxHealth);
  const stamina = useGameStore((s) => s.player.stamina);
  const maxStamina = useGameStore((s) => s.player.maxStamina);
  const hunger = useGameStore((s) => s.hunger.current);
  const hungerMax = useGameStore((s) => s.hunger.max);
  const shelterTier = useGameStore((s) => s.shelter.tier);
  const isNight = useGameStore((s) => s.worldTime.isNight);

  return (
    <div style={containerStyle}>
      <StatBar label="\u2665" value={health} max={maxHealth} color="#cc3333" flashThreshold={25} />
      <StatBar label="\u26A1" value={stamina} max={maxStamina} color="#ccaa33" />
      <StatBar label="\u2615" value={hunger} max={hungerMax} color="#cc7733" flashThreshold={20} />

      {/* Shelter indicator — only show at night or when sheltered */}
      {(isNight || shelterTier !== 'exposed') && (
        <div
          style={
            shelterTier === 'exposed' ? exposedBadgeStyle : shelterBadgeStyle
          }
        >
          {shelterTier === 'full' && '\u2302 Sheltered'}
          {shelterTier === 'partial' && '\u2302 Partial Shelter'}
          {shelterTier === 'exposed' && '\u26A0 Exposed'}
        </div>
      )}
    </div>
  );
};

export default SurvivalHUD;
