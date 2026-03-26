/**
 * SurvivalHUD.jsx — Unified survival stats display
 *
 * Shows health, stamina, hunger bars + shelter status.
 * Desktop: top-left column layout.
 * Mobile: top-center row layout with smaller bars.
 */

import React, { useState, useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';
import { isTouchDevice } from '../../utils/deviceDetection';

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' && (window.innerWidth <= 768 || isTouchDevice())
  );
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 768 || isTouchDevice());
    window.addEventListener('resize', check);
    // Re-check after mount (touch detection may not be ready at module load)
    check();
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

function StatBar({ label, value, max, color, flashThreshold, barWidth }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const isLow = flashThreshold && value < flashThreshold;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 16 }}>
      <span style={{
        fontFamily: 'monospace', fontSize: 11, color: 'white',
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)', width: 14, textAlign: 'center',
      }}>{label}</span>
      <div style={{
        width: barWidth, height: 8, backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)',
      }}>
        <div style={{
          width: `${percent}%`, height: '100%', backgroundColor: color,
          borderRadius: 2, transition: 'width 0.3s ease',
          opacity: isLow ? (Math.sin(Date.now() / 200) > 0 ? 1 : 0.5) : 1,
        }} />
      </div>
    </div>
  );
}

const SurvivalHUD = () => {
  const isMobile = useIsMobile();
  const health = useGameStore((s) => s.player.health);
  const maxHealth = useGameStore((s) => s.player.maxHealth);
  const stamina = useGameStore((s) => s.player.stamina);
  const maxStamina = useGameStore((s) => s.player.maxStamina);
  const hunger = useGameStore((s) => s.hunger.current);
  const hungerMax = useGameStore((s) => s.hunger.max);
  const shelterTier = useGameStore((s) => s.shelter.tier);
  const isNight = useGameStore((s) => s.worldTime.isNight);

  const barWidth = isMobile ? 55 : 120;

  return (
    <div style={{
      position: 'fixed',
      top: isMobile ? 8 : 12,
      left: isMobile ? '50%' : 12,
      transform: isMobile ? 'translateX(-50%)' : 'none',
      display: 'flex',
      flexDirection: isMobile ? 'row' : 'column',
      gap: isMobile ? 6 : 4,
      pointerEvents: 'none',
      zIndex: 900,
      userSelect: 'none',
      paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
    }}>
      <StatBar label="♥" value={health} max={maxHealth} color="#cc3333" flashThreshold={25} barWidth={barWidth} />
      <StatBar label="⚡" value={stamina} max={maxStamina} color="#ccaa33" barWidth={barWidth} />
      <StatBar label="☕" value={hunger} max={hungerMax} color="#cc7733" flashThreshold={20} barWidth={barWidth} />

      {!isMobile && (isNight || shelterTier !== 'exposed') && (
        <div style={{
          fontFamily: 'monospace', fontSize: 10, color: 'white',
          backgroundColor: shelterTier === 'exposed' ? 'rgba(180,0,0,0.5)' : 'rgba(0,100,0,0.6)',
          padding: '2px 6px', borderRadius: 3, marginTop: 2,
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        }}>
          {shelterTier === 'full' && '⌂ Sheltered'}
          {shelterTier === 'partial' && '⌂ Partial'}
          {shelterTier === 'exposed' && '⚠ Exposed'}
        </div>
      )}
    </div>
  );
};

export default SurvivalHUD;
