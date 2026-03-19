/**
 * MobileDebugOverlay — Floating toggle button + performance stats for mobile.
 * Shows FPS, draw calls, triangles, chunk count, enemy count, physics info, etc.
 * Only renders on touch devices.
 */

import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../../stores/useGameStore';
import { isTouchDevice } from '../../utils/deviceDetection';

const MobileDebugOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [tick, setTick] = useState(0); // eslint-disable-line no-unused-vars
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), fps: 0 });
  const intervalRef = useRef(null);

  // Only show on touch devices
  const [isTouch] = useState(() => isTouchDevice());

  // FPS counter — runs via requestAnimationFrame
  useEffect(() => {
    if (!isTouch || !visible) return;

    let rafId;
    const countFrame = () => {
      const now = performance.now();
      fpsRef.current.frames++;
      if (now - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.fps = fpsRef.current.frames;
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
      }
      rafId = requestAnimationFrame(countFrame);
    };
    rafId = requestAnimationFrame(countFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isTouch, visible]);

  // Refresh overlay every 500ms
  useEffect(() => {
    if (visible) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 500);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [visible]);

  if (!isTouch) return null;

  const state = useGameStore.getState();
  const ds = state._debugStats;
  const fps = fpsRef.current.fps;
  const chunkCount = state._chunkManager?.chunks?.size || 0;
  const enemyCount = state.enemies?.length || 0;
  const npcCount = state.settlement?.npcs?.length || 0;
  const projectileCount = state.projectiles?.length || 0;
  const riftCount = state.rifts?.length || 0;
  const damageNumCount = state.damageNumbers?.length || 0;
  const lootCount = state.lootDrops?.length || 0;
  const particleCount = state.particleEffects?.length || 0;

  // Determine FPS status
  const fpsColor = fps >= 55 ? '#51cf66' : fps >= 30 ? '#ffc107' : '#ff6b6b';

  return (
    <>
      {/* Toggle button — always visible on mobile */}
      <button
        onClick={() => setVisible((v) => !v)}
        style={{
          position: 'fixed',
          top: '8px',
          right: '8px',
          zIndex: 10001,
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          border: visible ? '2px solid #51cf66' : '2px solid rgba(255,255,255,0.3)',
          backgroundColor: visible ? 'rgba(0, 100, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
          color: '#fff',
          fontSize: '16px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        {visible ? 'X' : 'D'}
      </button>

      {/* Stats panel */}
      {visible && (
        <div style={styles.panel}>
          <div style={styles.header}>Mobile Debug</div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Performance</div>
            <Row label="FPS" value={fps} color={fpsColor} />
            <Row label="Draw Calls" value={ds.drawCalls} color={ds.drawCalls <= 300 ? '#51cf66' : '#ff6b6b'} />
            <Row label="Triangles" value={ds.triangles.toLocaleString()} />
            <Row label="Mesh Rebuild" value={`${ds.meshRebuildMs.toFixed(1)}ms`} />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Scene Objects</div>
            <Row label="Chunks" value={chunkCount} />
            <Row label="Enemies" value={enemyCount} />
            <Row label="NPCs" value={npcCount} />
            <Row label="Rifts" value={riftCount} />
            <Row label="Projectiles" value={projectileCount} />
            <Row label="Loot Drops" value={lootCount} />
            <Row label="Particles" value={particleCount} />
            <Row label="Dmg Numbers" value={damageNumCount} />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Memory</div>
            <Row label="JS Heap" value={
              performance.memory
                ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)}MB / ${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(0)}MB`
                : 'N/A'
            } />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Player</div>
            <Row label="Pos" value={`${state.player.position[0].toFixed(0)}, ${state.player.position[1].toFixed(0)}, ${state.player.position[2].toFixed(0)}`} />
            <Row label="Build Mode" value={state.buildMode ? 'ON' : 'off'} />
          </div>
        </div>
      )}
    </>
  );
};

function Row({ label, value, color }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: color || '#ccc' }}>{String(value)}</span>
    </div>
  );
}

const styles = {
  panel: {
    position: 'fixed',
    top: '52px',
    right: '8px',
    zIndex: 10000,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    color: '#ccc',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    padding: '8px 12px',
    borderRadius: '8px',
    maxWidth: '240px',
    border: '1px solid rgba(255,255,255,0.2)',
    pointerEvents: 'none',
  },
  header: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '13px',
    marginBottom: '4px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    paddingBottom: '3px',
  },
  section: {
    marginTop: '6px',
  },
  sectionTitle: {
    color: '#ffc107',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
  },
  label: {
    color: '#999',
    flexShrink: 0,
  },
  value: {
    textAlign: 'right',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

export default MobileDebugOverlay;
