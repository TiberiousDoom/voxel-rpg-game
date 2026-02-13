/**
 * NPCDebugPanel — F4 to toggle. Dedicated panel for monitoring NPC state
 * and Phase 2 acceptance criteria in real time.
 */

import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../../stores/useGameStore';

const STATE_COLORS = {
  APPROACHING: '#ffcc00',
  EVALUATING: '#00cccc',
  IDLE: '#aaaaaa',
  WANDERING: '#88aaff',
  EATING: '#66cc66',
  SLEEPING: '#9966cc',
  SOCIALIZING: '#ff88cc',
  LEAVING: '#ff4444',
  WORKING: '#ff8800',
};

const NEED_THRESHOLDS = { critical: 20, low: 40 };

function needColor(value) {
  if (value <= NEED_THRESHOLDS.critical) return '#ff4444';
  if (value <= NEED_THRESHOLDS.low) return '#ffaa44';
  return '#51cf66';
}

function happinessColor(value) {
  if (value < 20) return '#ff4444';
  if (value < 40) return '#ffaa44';
  if (value < 60) return '#ffcc00';
  return '#51cf66';
}

function NeedBar({ label, value, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = needColor(value);
  return (
    <div style={styles.needRow}>
      <span style={styles.needLabel}>{label}</span>
      <div style={styles.barBg}>
        <div style={{ ...styles.barFill, width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span style={{ ...styles.needValue, color }}>{value.toFixed(0)}</span>
    </div>
  );
}

function NPCCard({ npc, index }) {
  const stateColor = STATE_COLORS[npc.state] || '#ccc';
  const pos = npc.position;

  return (
    <div style={styles.npcCard}>
      <div style={styles.npcHeader}>
        <span style={styles.npcName}>
          #{index + 1} {npc.firstName} {npc.surname}
        </span>
        <span style={{ ...styles.npcState, color: stateColor }}>
          {npc.state}
        </span>
      </div>

      <div style={styles.npcMeta}>
        <span>Personality: <b style={{ color: '#ddd' }}>{npc.personality || '?'}</b></span>
        <span>Job: <b style={{ color: '#ddd' }}>{npc.preferredJob || '?'}</b></span>
      </div>

      <div style={styles.npcMeta}>
        <span>Pos: {pos[0].toFixed(0)}, {pos[1].toFixed(0)}, {pos[2].toFixed(0)}</span>
        <span>Arrived: {npc.arrivedAtSettlement ? 'Yes' : 'No'}</span>
      </div>

      <NeedBar label="HUN" value={npc.hunger ?? 80} />
      <NeedBar label="RST" value={npc.rest ?? 80} />
      <NeedBar label="SOC" value={npc.social ?? 80} />

      <div style={styles.npcMeta}>
        <span>
          Happiness:{' '}
          <b style={{ color: happinessColor(npc.happiness ?? 65) }}>
            {(npc.happiness ?? 65).toFixed(0)}%
          </b>
        </span>
        <span>Unhappy Days: <b style={{ color: (npc.unhappyDays || 0) > 0 ? '#ff6b6b' : '#ccc' }}>{npc.unhappyDays || 0}</b></span>
      </div>

      {npc.skills && (
        <div style={styles.skillRow}>
          <SkillDot label="G" value={npc.skills.gathering} />
          <SkillDot label="M" value={npc.skills.mining} />
          <SkillDot label="B" value={npc.skills.building} />
          <SkillDot label="C" value={npc.skills.combat} />
        </div>
      )}
    </div>
  );
}

function SkillDot({ label, value }) {
  const stars = Math.round(value * 5);
  return (
    <span style={styles.skillDot}>
      {label}:{'*'.repeat(stars)}{'_'.repeat(5 - stars)}
    </span>
  );
}

function CriteriaCheck({ label, pass }) {
  return (
    <div style={styles.criteriaRow}>
      <span style={{ color: pass ? '#51cf66' : '#ff6b6b' }}>
        {pass ? 'PASS' : 'FAIL'}
      </span>
      <span style={styles.criteriaLabel}>{label}</span>
    </div>
  );
}

const NPCDebugPanel = () => {
  const [visible, setVisible] = useState(false);
  const [, setTick] = useState(0);
  const intervalRef = useRef(null);

  // F4 toggle
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'F4') {
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
  const { settlement, zones, worldTime } = state;
  const npcs = settlement.npcs;
  const center = settlement.settlementCenter;

  // Phase 2 acceptance criteria checks
  const checks = {
    'Settlement center set': center !== null,
    'Attractiveness >= 20': settlement.attractiveness >= 20,
    'NPC spawned': npcs.length > 0,
    'NPC arrived (IDLE)': npcs.some((n) => n.state === 'IDLE'),
    'NPC eating': npcs.some((n) => n.state === 'EATING'),
    'NPC sleeping': npcs.some((n) => n.state === 'SLEEPING'),
    'NPC wandering': npcs.some((n) => n.state === 'WANDERING'),
    'NPC evaluating': npcs.some((n) => n.state === 'EVALUATING'),
    'NPC socializing': npcs.some((n) => n.state === 'SOCIALIZING'),
    'NPC leaving': npcs.some((n) => n.state === 'LEAVING'),
    'Happiness tracked': npcs.some((n) => typeof n.happiness === 'number'),
    'Housing cap (walls)': settlement.wallCount > 0,
    'Mining zone placed': zones.some((z) => z.type === 'MINING'),
    'Stockpile zone placed': zones.some((z) => z.type === 'STOCKPILE'),
    'Zone has mining tasks': zones.some((z) => z.miningTasks && z.miningTasks.length > 0),
    'Pop cap respected': npcs.length <= 5,
  };

  const passCount = Object.values(checks).filter(Boolean).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>NPC Debug (F4)</div>

      {/* Settlement overview */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Settlement</div>
        <div style={styles.row}>
          <span style={styles.label}>Center</span>
          <span style={styles.value}>
            {center ? `${center[0].toFixed(0)}, ${center[1].toFixed(0)}, ${center[2].toFixed(0)}` : 'none'}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Attractiveness</span>
          <span style={{ ...styles.value, color: settlement.attractiveness >= 20 ? '#51cf66' : '#ffaa44' }}>
            {settlement.attractiveness}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Wall Count</span>
          <span style={styles.value}>{settlement.wallCount || 0}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>NPCs</span>
          <span style={styles.value}>{npcs.length} / 5</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>Time</span>
          <span style={styles.value}>
            Day {worldTime.dayNumber} {String(worldTime.hour).padStart(2, '0')}:{String(worldTime.minute).padStart(2, '0')} ({worldTime.period})
          </span>
        </div>
      </div>

      {/* Zones */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Zones ({zones.length})</div>
        {zones.length === 0 && (
          <div style={{ color: '#666', fontSize: '10px' }}>No zones. Press Z to create.</div>
        )}
        {zones.map((z) => (
          <div key={z.id} style={styles.row}>
            <span style={{ color: z.type === 'MINING' ? '#ff8c00' : '#4488ff' }}>
              {z.type}
            </span>
            <span style={styles.value}>
              {Math.abs(z.bounds.maxX - z.bounds.minX).toFixed(0)}x{Math.abs(z.bounds.maxZ - z.bounds.minZ).toFixed(0)}
              {z.miningTasks ? ` (${z.miningTasks.length} tasks)` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* NPC cards */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>NPCs ({npcs.length})</div>
        {npcs.length === 0 && (
          <div style={{ color: '#666', fontSize: '10px' }}>No NPCs yet. Place a campfire to attract settlers.</div>
        )}
        <div style={styles.npcList}>
          {npcs.map((npc, i) => (
            <NPCCard key={npc.id} npc={npc} index={i} />
          ))}
        </div>
      </div>

      {/* Acceptance criteria */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          Phase 2 Checks ({passCount}/{Object.keys(checks).length})
        </div>
        {Object.entries(checks).map(([label, pass]) => (
          <CriteriaCheck key={label} label={label} pass={pass} />
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: '52px',
    right: '4px',
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    color: '#ccc',
    fontFamily: 'monospace',
    fontSize: '10px',
    lineHeight: '1.4',
    padding: '6px 10px',
    borderRadius: '4px',
    pointerEvents: 'auto',
    maxWidth: '340px',
    maxHeight: 'calc(100vh - 60px)',
    overflowY: 'auto',
    border: '1px solid rgba(255,140,0,0.4)',
  },
  header: {
    color: '#ff8c00',
    fontWeight: 'bold',
    fontSize: '12px',
    marginBottom: '4px',
    borderBottom: '1px solid rgba(255,140,0,0.3)',
    paddingBottom: '2px',
  },
  section: {
    marginTop: '6px',
  },
  sectionTitle: {
    color: '#ffc107',
    fontWeight: 'bold',
    fontSize: '10px',
    marginBottom: '2px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    lineHeight: '1.5',
  },
  label: {
    color: '#999',
    flexShrink: 0,
  },
  value: {
    color: '#ccc',
    textAlign: 'right',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  npcList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  npcCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    padding: '4px 6px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  npcHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  },
  npcName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '10px',
  },
  npcState: {
    fontWeight: 'bold',
    fontSize: '9px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  npcMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    color: '#888',
    fontSize: '9px',
  },
  needRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    height: '12px',
  },
  needLabel: {
    color: '#888',
    fontSize: '9px',
    width: '22px',
    flexShrink: 0,
  },
  barBg: {
    flex: 1,
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  needValue: {
    fontSize: '9px',
    width: '24px',
    textAlign: 'right',
    flexShrink: 0,
  },
  skillRow: {
    display: 'flex',
    gap: '6px',
    color: '#777',
    fontSize: '9px',
    marginTop: '1px',
  },
  skillDot: {
    letterSpacing: '-0.5px',
  },
  criteriaRow: {
    display: 'flex',
    gap: '6px',
    fontSize: '9px',
    lineHeight: '1.5',
  },
  criteriaLabel: {
    color: '#aaa',
  },
};

export default NPCDebugPanel;
