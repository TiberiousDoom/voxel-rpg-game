/**
 * EndlessModeHUD.jsx
 * Overlay HUD for Endless mode showing wave info, score, and countdown
 */

import React from 'react';

const EndlessModeHUD = ({ waveData }) => {
  if (!waveData || !waveData.active) return null;

  const { wave, score, timeUntilNextWave, stats } = waveData;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isBossWave = wave > 0 && wave % 5 === 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: '60px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        borderRadius: '8px',
        padding: '10px 14px',
        color: '#eee',
        fontSize: '12px',
        minWidth: '160px',
        border: isBossWave ? '2px solid #e74c3c' : '1px solid #444',
        zIndex: 500,
      }}
    >
      {/* Wave Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px', color: isBossWave ? '#e74c3c' : '#3498db' }}>
          {isBossWave ? '\uD83D\uDC80 BOSS ' : ''}Wave {wave}
        </span>
        <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{score.toLocaleString()}</span>
      </div>

      {/* Next Wave Countdown */}
      <div style={{
        padding: '4px 8px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '4px',
        marginBottom: '6px',
        textAlign: 'center',
      }}>
        <div style={{ color: '#999', fontSize: '10px' }}>NEXT WAVE IN</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: timeUntilNextWave < 30 ? '#e74c3c' : '#fff' }}>
          {formatTime(timeUntilNextWave)}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#999' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Kills</span>
          <span style={{ color: '#ccc' }}>{stats.totalKills}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>NPCs Alive</span>
          <span style={{ color: '#ccc' }}>{stats.npcsAlive}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Time</span>
          <span style={{ color: '#ccc' }}>{formatTime(stats.survivalTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default EndlessModeHUD;
