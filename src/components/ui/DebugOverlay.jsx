/**
 * DebugOverlay — F3 to toggle. Shows live game state values for QA testing.
 * Positioned top-left, below the drei Stats panel.
 */

import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../../stores/useGameStore';

const DebugOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [tick, setTick] = useState(0); // eslint-disable-line no-unused-vars
  const intervalRef = useRef(null);

  // F3 toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Refresh every 500ms when visible
  useEffect(() => {
    if (visible) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 500);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [visible]);

  if (!visible) return null;

  const state = useGameStore.getState();
  const { player, settlement, worldTime, hunger, shelter, enemies, rifts, buildMode } = state;

  const pos = player.position;
  const center = settlement.settlementCenter;
  const npcCount = settlement.npcs.length;

  const npcSummary = settlement.npcs.map((n) => ({
    name: n.firstName,
    state: n.state,
    hunger: n.hunger?.toFixed(0),
    rest: n.rest?.toFixed(0),
    arrived: n.arrivedAtSettlement,
  }));

  return (
    <div style={styles.container}>
      <div style={styles.header}>Debug (F3)</div>

      <Section title="Player">
        <Row label="Pos" value={`${pos[0].toFixed(1)}, ${pos[1].toFixed(1)}, ${pos[2].toFixed(1)}`} />
        <Row label="HP" value={`${player.health.toFixed(0)} / ${player.maxHealth}`} />
        <Row label="Hunger" value={`${hunger.current.toFixed(1)} (${hunger.status})`} />
        <Row label="Stamina" value={player.stamina.toFixed(0)} />
        <Row label="Build Mode" value={buildMode ? 'ON' : 'off'} highlight={buildMode} />
        <Row label="Shelter" value={shelter.tier} />
      </Section>

      <Section title="World">
        <Row label="Time" value={`Day ${worldTime.dayNumber} ${String(worldTime.hour).padStart(2, '0')}:${String(worldTime.minute).padStart(2, '0')}`} />
        <Row label="Period" value={worldTime.period} />
        <Row label="Enemies" value={enemies.length} />
        <Row label="Rifts" value={rifts.length} />
      </Section>

      <Section title="Settlement">
        <Row label="Center" value={center ? `${center[0].toFixed(0)}, ${center[1].toFixed(0)}, ${center[2].toFixed(0)}` : 'none'} highlight={!!center} />
        <Row label="Attractiveness" value={settlement.attractiveness} highlight={settlement.attractiveness >= 10} />
        <Row label="NPCs" value={`${npcCount} / 5`} />
        {npcSummary.map((n, i) => (
          <Row key={i} label={`  ${n.name}`} value={`${n.state} H:${n.hunger} R:${n.rest}${n.arrived ? '' : ' (en route)'}`} />
        ))}
      </Section>

      <Section title="Inventory (food)">
        <Row label="Berry" value={state.inventory.materials.berry || 0} />
        <Row label="Meat" value={state.inventory.materials.meat || 0} />
        <Row label="Wood" value={state.inventory.materials.wood || 0} />
        <Row label="Stone" value={state.inventory.materials.stone || 0} />
      </Section>
    </div>
  );
};

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: highlight ? '#51cf66' : '#ccc' }}>
        {String(value)}
      </span>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: '52px', // below drei Stats panel
    left: '4px',
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ccc',
    fontFamily: 'monospace',
    fontSize: '11px',
    lineHeight: '1.4',
    padding: '6px 10px',
    borderRadius: '4px',
    pointerEvents: 'none',
    maxWidth: '320px',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  header: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '12px',
    marginBottom: '4px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    paddingBottom: '2px',
  },
  section: {
    marginTop: '4px',
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

export default DebugOverlay;
