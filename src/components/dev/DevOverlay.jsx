/**
 * DevOverlay — unified developer overlay (replaces the old F3 debug overlay,
 * F4 NPC panel and mobile debug overlay).
 *
 * Controls
 *   F3            cycle: closed → full panel → mini perf strip → closed
 *   F4            open the Settlement tab
 *   DEV button    (touch devices) open/close
 *
 * Tabs
 *   Perf        frame-time graph (avg / p95 / max vs. 60 fps budget), GPU stats,
 *               chunks, workers, entity counts — colored against the roadmap targets
 *   Player      live stats, status effects, cheats (heal, god mode, items, XP, teleports)
 *   World       time of day / speed, rifts, enemies (spawn, kill), quick save/load
 *   Settlement  overview, zones, NPC cards with needs, Phase 2 checks
 *
 * The panel re-renders at REFRESH_MS; frame timings are sampled with rAF into a
 * ring buffer (see frameSampler.js), so the overlay itself stays cheap.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useGameStore from '../../stores/useGameStore';
import { isTouchDevice } from '../../utils/deviceDetection';
import { worldToChunk } from '../../systems/chunks/coordinates';
import { DEBUG_TIME_SCALES, IMMIGRATION_MAX_NPCS } from '../../data/tuning';
import { subscribeFrameSampler, getFrameTimes, getFrameStats } from './frameSampler';
import * as dev from './devActions';

const REFRESH_MS = 250;
const STORAGE_KEY = 'voxel-dev-overlay';
const TABS = ['perf', 'player', 'world', 'settlement'];
const TAB_LABELS = { perf: 'Perf', player: 'Player', world: 'World', settlement: 'Settlement' };

// Roadmap performance targets (docs/3D_IMPLEMENTATION_PLAN.md, Phase 0 exit criteria)
const BUDGET = {
  frameMs: 1000 / 60,
  spikeMs: 1000 / 30,
  drawCalls: 300,
  triangles: 500000,
  meshRebuildMs: 16,
  heapMB: 1024,
};

const C = {
  ok: '#51cf66',
  warn: '#ffc107',
  bad: '#ff6b6b',
  dim: '#8a8f98',
  text: '#d7dae0',
  accent: '#5cc8ff',
};

const NPC_STATE_COLORS = {
  APPROACHING: '#ffcc00', EVALUATING: '#00cccc', IDLE: '#aaaaaa', WANDERING: '#88aaff',
  EATING: '#66cc66', SLEEPING: '#9966cc', SOCIALIZING: '#ff88cc', LEAVING: '#ff4444',
  WORKING_MINE: '#ff8800', WORKING_HAUL: '#ffcc00', WORKING_BUILD: '#ff8800',
};

function loadPrefs() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        mode: ['closed', 'full', 'mini'].includes(p.mode) ? p.mode : 'closed',
        tab: TABS.includes(p.tab) ? p.tab : 'perf',
      };
    }
  } catch {
    // storage unavailable
  }
  return { mode: 'closed', tab: 'perf' };
}

function savePrefs(prefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable
  }
}

const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '–');
const fmtInt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString() : '–');
const level = (value, good, bad, higherIsBetter = false) => {
  if (!Number.isFinite(value)) return C.dim;
  if (higherIsBetter) return value >= good ? C.ok : value >= bad ? C.warn : C.bad;
  return value <= good ? C.ok : value <= bad ? C.warn : C.bad;
};

// ─── Small building blocks ──────────────────────────────────────────────────

function Row({ label, value, color, title }) {
  return (
    <div style={s.row} title={title}>
      <span style={s.label}>{label}</span>
      <span style={{ ...s.value, color: color || C.text }}>{value}</span>
    </div>
  );
}

function Section({ title, right, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>
        <span>{title}</span>
        {right && <span style={{ color: C.dim, fontWeight: 'normal' }}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

function Btn({ children, onClick, active, title, danger }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        ...s.btn,
        ...(active ? s.btnActive : null),
        ...(danger ? { borderColor: 'rgba(255,107,107,0.5)', color: '#ffb3b3' } : null),
      }}
    >
      {children}
    </button>
  );
}

function Bar({ value, max = 100, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={s.barBg}>
      <div style={{ ...s.barFill, width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

/** Frame-time sparkline with 16.7 ms / 33.3 ms budget lines. */
function FrameGraph({ times, height = 44 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext?.('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const maxMs = 50;
    const y = (ms) => h - (Math.min(ms, maxMs) / maxMs) * h;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, 0, w, h);

    // Budget lines
    ctx.strokeStyle = 'rgba(81,207,102,0.5)';
    ctx.beginPath();
    ctx.moveTo(0, y(BUDGET.frameMs));
    ctx.lineTo(w, y(BUDGET.frameMs));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,107,107,0.5)';
    ctx.beginPath();
    ctx.moveTo(0, y(BUDGET.spikeMs));
    ctx.lineTo(w, y(BUDGET.spikeMs));
    ctx.stroke();

    // Bars, newest on the right
    const n = times.length;
    const barW = w / Math.max(n, 1);
    for (let i = 0; i < n; i++) {
      const t = times[i];
      ctx.fillStyle = t > BUDGET.spikeMs ? C.bad : t > BUDGET.frameMs + 1 ? C.warn : C.ok;
      ctx.fillRect(i * barW, y(t), Math.max(1, barW - 0.5), h - y(t));
    }
  }, [times]);

  return (
    <canvas
      ref={ref}
      width={240}
      height={height}
      style={{ width: '100%', height, display: 'block', borderRadius: 3 }}
      aria-label="Frame time graph"
    />
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function PerfTab({ state, frame, times }) {
  const ds = state._debugStats || {};
  const cm = state._chunkManager;
  const chunkStats = cm?.getStats?.() || {};
  const poolStats = cm?.workerPool?.getStats?.() || null;
  const heap = typeof performance !== 'undefined' && performance.memory
    ? performance.memory.usedJSHeapSize / (1024 * 1024)
    : null;

  return (
    <>
      <Section title="Frame time" right={`${frame.samples} frames`}>
        <FrameGraph times={times} />
        <div style={s.statGrid}>
          <Stat label="FPS" value={fmt(frame.fps)} color={level(frame.fps, 55, 30, true)} />
          <Stat label="avg" value={`${fmt(frame.avg, 1)}ms`} color={level(frame.avg, BUDGET.frameMs + 0.5, BUDGET.spikeMs)} />
          <Stat label="p95" value={`${fmt(frame.p95, 1)}ms`} color={level(frame.p95, BUDGET.frameMs + 2, BUDGET.spikeMs)} />
          <Stat label="max" value={`${fmt(frame.max, 0)}ms`} color={level(frame.max, BUDGET.spikeMs, 100)} />
        </div>
        <Row
          label="Long frames (>33ms)"
          value={frame.longFrames}
          color={frame.longFrames === 0 ? C.ok : frame.longFrames < 5 ? C.warn : C.bad}
        />
      </Section>

      <Section title="Rendering">
        <Row label="Draw calls" value={fmtInt(ds.drawCalls)} color={level(ds.drawCalls, BUDGET.drawCalls, BUDGET.drawCalls * 2)} title={`target ≤ ${BUDGET.drawCalls}`} />
        <Row label="Triangles" value={fmtInt(ds.triangles)} color={level(ds.triangles, BUDGET.triangles, BUDGET.triangles * 2)} title={`target ≤ ${BUDGET.triangles.toLocaleString()}`} />
        <Row label="Geometries / textures" value={`${fmtInt(ds.geometries)} / ${fmtInt(ds.textures)}`} />
        <Row label="Shader programs" value={fmtInt(ds.programs)} />
        <Row label="Last mesh rebuild" value={`${fmt(ds.meshRebuildMs, 1)}ms (${fmtInt(ds.meshRebuilds)} total)`} color={level(ds.meshRebuildMs, BUDGET.meshRebuildMs, BUDGET.meshRebuildMs * 3)} />
        {heap !== null && (
          <Row label="JS heap" value={`${fmt(heap, 0)} MB`} color={level(heap, BUDGET.heapMB / 2, BUDGET.heapMB)} />
        )}
      </Section>

      <Section title="Chunks & workers">
        <Row label="Active chunks" value={fmtInt(chunkStats.activeChunks)} />
        <Row label="Loading / queued" value={`${fmtInt(chunkStats.loadingCount)} / ${fmtInt(chunkStats.loadQueueSize)}`} color={chunkStats.loadQueueSize > 20 ? C.warn : C.text} />
        <Row label="Mesh rebuild queue" value={fmtInt(chunkStats.meshRebuildQueue)} />
        <Row label="Edited chunks cached" value={fmtInt(cm?.modifiedChunkCache?.size)} />
        <Row label="Load time (manager)" value={`${fmt(chunkStats.lastUpdateTime, 2)}ms`} />
        {poolStats && (
          <Row
            label="Workers busy / queued"
            value={`${poolStats.busy}/${poolStats.poolSize} · ${poolStats.queued}`}
            color={cm.workerPool.exhausted ? C.bad : C.text}
          />
        )}
      </Section>

      <Section title="Entities">
        <div style={s.statGrid}>
          <Stat label="enemies" value={state.enemies.length} />
          <Stat label="NPCs" value={state.settlement.npcs.length} />
          <Stat label="wildlife" value={state.wildlife.length} />
          <Stat label="rifts" value={state.rifts.length} />
          <Stat label="projectiles" value={state.projectiles.length} />
          <Stat label="particles" value={state.particleEffects.length} />
          <Stat label="dmg nums" value={state.damageNumbers.length} />
          <Stat label="loot" value={state.lootDrops.length + state.xpOrbs.length} />
        </div>
      </Section>
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={s.stat}>
      <div style={{ ...s.statValue, color: color || C.text }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

function PlayerTab({ state }) {
  const { player, hunger, shelter, camera } = state;
  const pos = player.position;
  const { chunkX, chunkZ } = worldToChunk(pos[0], pos[2]);
  const ds = state._debugStats || {};

  return (
    <>
      <Section title="Position">
        <Row label="World" value={`${fmt(pos[0], 1)}, ${fmt(pos[1], 1)}, ${fmt(pos[2], 1)}`} />
        <Row label="Chunk" value={`${chunkX}, ${chunkZ}`} />
        <Row label="Facing" value={`${fmt(((player.facingAngle || 0) * 180) / Math.PI, 0)}°`} />
        <Row label="Camera" value={camera.firstPerson ? 'first person' : `third person, ${fmt(camera.distance, 0)}u`} />
      </Section>

      <Section title="Vitals">
        <VitalRow label="Health" value={player.health} max={player.maxHealth} color="#ff6b6b" />
        <VitalRow label="Mana" value={player.mana} max={player.maxMana} color="#5cc8ff" />
        <VitalRow label="Stamina" value={player.stamina} max={player.maxStamina} color="#51cf66" />
        <VitalRow label={`Hunger (${hunger.status})`} value={hunger.current} max={hunger.max} color="#f0a050" />
        <Row label="Level / XP" value={`${player.level} · ${fmtInt(player.xp)} / ${fmtInt(player.xpToNext)}`} />
        <Row label="Damage / defense" value={`${fmt(player.damage)} / ${fmt(player.defense)}`} />
        <Row label="Shelter" value={shelter.tier} color={shelter.isFullShelter ? C.ok : shelter.isPartialShelter ? C.warn : C.dim} />
        <Row label="Invincible" value={player.isInvincible ? `yes (${fmt(player.invincibilityTimer, 1)}s)` : 'no'} />
        <Row label="E cooldown" value={ds.useKeyCooldownLeft > 0 ? `${ds.useKeyCooldownLeft}ms` : 'ready'} />
      </Section>

      <Section title="Status effects" right={String(player.statusEffects?.length || 0)}>
        {(player.statusEffects || []).length === 0 && <div style={s.empty}>none</div>}
        {(player.statusEffects || []).map((e) => (
          <Row key={e.type} label={e.type} value={`${fmt(e.duration, 1)}s · ${fmt(e.value, 1)}`} color={C.accent} />
        ))}
      </Section>

      <Section title="Cheats">
        <div style={s.btnRow}>
          <Btn onClick={dev.healFull}>Heal full</Btn>
          <Btn active={state._devGodMode} onClick={() => dev.setGodMode(!state._devGodMode)} title="Ignore all damage">
            God mode {state._devGodMode ? 'ON' : 'off'}
          </Btn>
          <Btn onClick={() => dev.giveMaterials(50)}>+50 materials</Btn>
          <Btn onClick={() => dev.giveXP(500)}>+500 XP</Btn>
        </div>
        <div style={s.btnRow}>
          <Btn onClick={dev.teleportToSpawn}>To spawn</Btn>
          <Btn onClick={dev.teleportToSettlement} title="Requires a campfire">To settlement</Btn>
          <Btn onClick={dev.teleportToNearestRift}>To nearest rift</Btn>
        </div>
      </Section>
    </>
  );
}

function VitalRow({ label, value, max, color }) {
  return (
    <div style={s.vitalRow}>
      <span style={{ ...s.label, width: 108 }}>{label}</span>
      <Bar value={value} max={max} color={color} />
      <span style={{ ...s.value, width: 64 }}>{fmt(value)}/{fmt(max)}</span>
    </div>
  );
}

function WorldTab({ state, onStatus }) {
  const wt = state.worldTime;
  const p = state.player.position;
  const rifts = [...state.rifts]
    .map((r) => ({ ...r, dist: Math.hypot(r.x - p[0], r.z - p[2]) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 6);

  const runSave = async (fn, label) => {
    onStatus(`${label}…`);
    const result = await fn();
    onStatus(result?.success ? `${label}: done` : `${label} failed: ${result?.message || 'unknown error'}`);
  };

  return (
    <>
      <Section title="Time">
        <Row label="Now" value={`Day ${wt.dayNumber} ${String(wt.hour).padStart(2, '0')}:${String(wt.minute).padStart(2, '0')} (${wt.period})`} />
        <Row label="Status" value={wt.paused ? 'paused' : `×${wt.timeScale}`} color={wt.paused ? C.warn : C.text} />
        <div style={s.btnRow}>
          {DEBUG_TIME_SCALES.map((scale) => (
            <Btn key={scale} active={wt.timeScale === scale} onClick={() => dev.setTimeScale(scale)}>
              {scale === 0 ? 'Stop' : `×${scale}`}
            </Btn>
          ))}
        </div>
        <div style={s.btnRow}>
          <Btn onClick={() => dev.jumpToHour(6)}>Dawn</Btn>
          <Btn onClick={() => dev.jumpToHour(12)}>Noon</Btn>
          <Btn onClick={() => dev.jumpToHour(18)}>Dusk</Btn>
          <Btn onClick={() => dev.jumpToHour(0)}>Midnight</Btn>
        </div>
      </Section>

      <Section title="Enemies" right={`${state.enemies.length} alive`}>
        <div style={s.btnRow}>
          {Object.keys(dev.MONSTER_TYPES).map((type) => (
            <Btn key={type} onClick={() => dev.spawnEnemy(type)} title={`Spawn a ${dev.MONSTER_TYPES[type].name} in front of you`}>
              + {type}
            </Btn>
          ))}
        </div>
        <div style={s.btnRow}>
          <Btn danger onClick={() => onStatus(`Killed ${dev.killAllEnemies()} enemies`)}>Kill all</Btn>
          <Btn onClick={dev.clearEffects}>Clear effects &amp; loot</Btn>
        </div>
      </Section>

      <Section title="Rifts" right={`${state.rifts.length} total`}>
        {rifts.length === 0 && <div style={s.empty}>none</div>}
        {rifts.map((r) => (
          <Row
            key={r.id}
            label={`${r.id} · ${fmt(r.dist, 0)}u`}
            value={`${r.state || 'ACTIVE'}${r.corruptionProgress != null ? ` · ${fmt(r.corruptionProgress * 100)}%` : ''}`}
            color={r.state === 'CLOSED' ? C.ok : r.state === 'CLOSING' ? C.warn : C.text}
          />
        ))}
      </Section>

      <Section title="Save">
        <div style={s.btnRow}>
          <Btn onClick={() => runSave(dev.quickSave, 'Quick save')}>Quick save</Btn>
          <Btn onClick={() => runSave(dev.quickLoad, 'Quick load')}>Quick load</Btn>
        </div>
        <div style={s.empty}>Uses its own slot ({dev.DEV_SAVE_SLOT}); doesn&apos;t touch your normal save.</div>
      </Section>
    </>
  );
}

function SettlementTab({ state }) {
  const { settlement, zones, constructionSites } = state;
  const npcs = settlement.npcs;
  const center = settlement.settlementCenter;
  const [expanded, setExpanded] = useState(null);

  const checks = [
    ['Settlement center set', center !== null],
    ['Attractiveness ≥ 20', settlement.attractiveness >= 20],
    ['NPC spawned', npcs.length > 0],
    ['NPC arrived (idle/working)', npcs.some((n) => n.arrivedAtSettlement)],
    ['NPC eating', npcs.some((n) => n.state === 'EATING')],
    ['NPC sleeping', npcs.some((n) => n.state === 'SLEEPING')],
    ['NPC working', npcs.some((n) => n.state?.startsWith('WORKING_'))],
    ['Mining zone placed', zones.some((z) => z.type === 'MINING')],
    ['Stockpile zone placed', zones.some((z) => z.type === 'STOCKPILE')],
    ['Construction site placed', constructionSites.length > 0],
    ['Building completed', constructionSites.some((c) => c.status === 'COMPLETE')],
    [`Pop cap respected (≤ ${IMMIGRATION_MAX_NPCS})`, npcs.length <= IMMIGRATION_MAX_NPCS],
  ];
  const passCount = checks.filter(([, pass]) => pass).length;

  return (
    <>
      <Section title="Overview">
        <Row label="Center" value={center ? `${fmt(center[0])}, ${fmt(center[1])}, ${fmt(center[2])}` : 'none — place a campfire'} color={center ? C.ok : C.dim} />
        <Row label="Attractiveness" value={fmt(settlement.attractiveness)} color={level(settlement.attractiveness, 20, 10, true)} />
        <Row label="Wall blocks" value={fmtInt(settlement.wallCount)} />
        <Row label="NPCs" value={`${npcs.length} / ${IMMIGRATION_MAX_NPCS}`} />
        <Row label="Zones / sites" value={`${zones.length} / ${constructionSites.length}`} />
      </Section>

      <Section title="NPCs" right={npcs.length ? 'tap to expand' : null}>
        {npcs.length === 0 && <div style={s.empty}>No NPCs yet.</div>}
        {npcs.map((npc) => {
          const open = expanded === npc.id;
          return (
            <div key={npc.id} style={s.npcCard}>
              <button type="button" style={s.npcHeader} onClick={() => setExpanded(open ? null : npc.id)}>
                <span style={{ color: C.text }}>{npc.firstName} {npc.surname}</span>
                <span style={{ color: NPC_STATE_COLORS[npc.state] || C.text }}>{npc.state}</span>
              </button>
              <div style={s.needs}>
                <NeedMini label="H" value={npc.hunger ?? 80} />
                <NeedMini label="R" value={npc.rest ?? 80} />
                <NeedMini label="S" value={npc.social ?? 80} />
                <NeedMini label="☺" value={npc.happiness ?? 65} />
              </div>
              {open && (
                <div style={{ marginTop: 4 }}>
                  <Row label="Personality / job" value={`${npc.personality || '?'} / ${npc.preferredJob || '?'}`} />
                  <Row label="Position" value={npc.position.map((v) => fmt(v)).join(', ')} />
                  <Row label="Task" value={npc.currentTaskId || '—'} />
                  <Row label="Carrying" value={npc.carryingItem ? `${npc.carryingItem.amount} ${npc.carryingItem.material}` : '—'} />
                  <Row label="Unhappy days" value={npc.unhappyDays || 0} color={(npc.unhappyDays || 0) > 0 ? C.bad : C.text} />
                  {npc.skills && (
                    <Row
                      label="Skills"
                      value={Object.entries(npc.skills).map(([k, v]) => `${k[0].toUpperCase()}${fmt(v * 100)}`).join(' ')}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Section>

      <Section title="Zones">
        {zones.length === 0 && <div style={s.empty}>No zones (Z to create).</div>}
        {zones.map((z) => (
          <Row
            key={z.id}
            label={z.type}
            value={`${fmt(Math.abs(z.bounds.maxX - z.bounds.minX))}×${fmt(Math.abs(z.bounds.maxZ - z.bounds.minZ))}${z.storage ? ` · ${z.storage.usedCapacity}/${z.storage.capacity}` : ''}${z.miningTasks ? ` · ${z.miningTasks.length} tasks` : ''}`}
          />
        ))}
      </Section>

      <Section title="Phase 2 checks" right={`${passCount}/${checks.length}`}>
        {checks.map(([label, pass]) => (
          <Row key={label} label={label} value={pass ? '✓' : '✗'} color={pass ? C.ok : C.bad} />
        ))}
      </Section>
    </>
  );
}

function NeedMini({ label, value }) {
  const color = value <= 20 ? C.bad : value <= 40 ? C.warn : C.ok;
  return (
    <div style={s.needMini} title={`${label}: ${fmt(value)}`}>
      <span style={{ color: C.dim, width: 12 }}>{label}</span>
      <Bar value={value} color={color} />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

const DevOverlay = () => {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [, setTick] = useState(0);
  const [status, setStatus] = useState(null);
  const [isTouch] = useState(() => isTouchDevice());
  const statusTimer = useRef(null);
  const { mode, tab } = prefs;

  const update = useCallback((next) => {
    setPrefs((prev) => {
      const merged = { ...prev, ...next };
      savePrefs(merged);
      return merged;
    });
  }, []);

  const showStatus = useCallback((text) => {
    setStatus(text);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 3000);
  }, []);
  useEffect(() => () => clearTimeout(statusTimer.current), []);

  // F3 cycles closed → full → mini → closed; F4 jumps to the settlement tab
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'F3') {
        e.preventDefault();
        setPrefs((prev) => {
          const nextMode = prev.mode === 'closed' ? 'full' : prev.mode === 'full' ? 'mini' : 'closed';
          const merged = { ...prev, mode: nextMode };
          savePrefs(merged);
          return merged;
        });
      } else if (e.code === 'F4') {
        e.preventDefault();
        update({ mode: 'full', tab: 'settlement' });
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [update]);

  // Sample frames and refresh while open
  useEffect(() => {
    if (mode === 'closed') return undefined;
    const unsubscribe = subscribeFrameSampler();
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => {
      clearInterval(id);
      unsubscribe();
    };
  }, [mode]);

  // Keep clicks/taps/wheel on the overlay from reaching the game
  const stop = (e) => e.stopPropagation();
  const shield = {
    onPointerDown: stop, onPointerUp: stop, onMouseDown: stop, onMouseUp: stop,
    onClick: stop, onContextMenu: stop, onWheel: stop, onTouchStart: stop, onTouchEnd: stop,
  };

  const toggleButton = isTouch ? (
    <button
      type="button"
      aria-label={mode === 'closed' ? 'Open dev overlay' : 'Close dev overlay'}
      {...shield}
      onClick={(e) => {
        e.stopPropagation();
        update({ mode: mode === 'closed' ? 'full' : 'closed' });
      }}
      style={{ ...s.touchToggle, ...(mode !== 'closed' ? s.touchToggleOn : null) }}
    >
      DEV
    </button>
  ) : null;

  if (mode === 'closed') return toggleButton;

  const state = useGameStore.getState();
  const times = getFrameTimes();
  const frame = getFrameStats(times);
  const narrow = typeof window !== 'undefined' && window.innerWidth < 600;

  if (mode === 'mini') {
    const ds = state._debugStats || {};
    return (
      <>
        {toggleButton}
        <div style={{ ...s.mini, ...(isTouch ? { top: 112 } : null) }} {...shield} data-testid="dev-overlay-mini">
          <div style={s.miniStats}>
            <span style={{ color: level(frame.fps, 55, 30, true), fontWeight: 'bold' }}>{fmt(frame.fps)} fps</span>
            <span style={{ color: level(frame.p95, BUDGET.frameMs + 2, BUDGET.spikeMs) }}>p95 {fmt(frame.p95, 1)}ms</span>
            <span style={{ color: C.dim }}>{fmtInt(ds.drawCalls)} dc</span>
            <span style={{ color: C.dim }}>{fmtInt(state._chunkManager?.chunks?.size)} ch</span>
          </div>
          <FrameGraph times={times} height={28} />
          <button type="button" style={s.miniExpand} onClick={() => update({ mode: 'full' })} title="Expand (F3)">
            ⤢
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {toggleButton}
      <div
        style={{ ...s.panel, ...(narrow ? s.panelNarrow : null), ...(isTouch && !narrow ? { top: 112 } : null) }}
        role="dialog"
        aria-label="Developer overlay"
        data-testid="dev-overlay"
        {...shield}
      >
        <div style={s.header}>
          <span style={s.title}>DEV</span>
          <span style={{ color: level(frame.fps, 55, 30, true), fontWeight: 'bold' }}>{fmt(frame.fps)} fps</span>
          <span style={{ flex: 1 }} />
          <Btn onClick={() => update({ mode: 'mini' })} title="Mini perf strip (F3)">Mini</Btn>
          <Btn onClick={() => update({ mode: 'closed' })} title="Close (F3)">✕</Btn>
        </div>
        <div style={s.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => update({ tab: t })}
              style={{ ...s.tab, ...(tab === t ? s.tabActive : null) }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <div style={s.body}>
          {tab === 'perf' && <PerfTab state={state} frame={frame} times={times} />}
          {tab === 'player' && <PlayerTab state={state} />}
          {tab === 'world' && <WorldTab state={state} onStatus={showStatus} />}
          {tab === 'settlement' && <SettlementTab state={state} />}
        </div>
        {status && <div style={s.status} role="status">{status}</div>}
        <div style={s.footer}>F3 cycle · F4 settlement · ` QA tracker</div>
      </div>
    </>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const s = {
  panel: {
    position: 'fixed',
    top: 8,
    right: 8,
    width: 340,
    maxHeight: 'calc(100vh - 16px)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10000,
    background: 'rgba(14, 17, 23, 0.94)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    color: C.text,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 11,
    lineHeight: 1.45,
    pointerEvents: 'auto',
    backdropFilter: 'blur(4px)',
  },
  panelNarrow: {
    top: 'auto',
    bottom: 0,
    left: 0,
    right: 0,
    width: 'auto',
    maxHeight: '60vh',
    borderRadius: '10px 10px 0 0',
    fontSize: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  title: { color: C.accent, fontWeight: 'bold', letterSpacing: 1 },
  tabs: { display: 'flex', gap: 2, padding: '4px 6px 0' },
  tab: {
    flex: 1,
    padding: '6px 4px',
    minHeight: 30,
    background: 'transparent',
    borderWidth: '0 0 2px 0',
    borderStyle: 'solid',
    borderColor: 'transparent',
    color: C.dim,
    font: 'inherit',
    cursor: 'pointer',
  },
  tabActive: { color: C.text, borderColor: `transparent transparent ${C.accent} transparent` },
  body: { overflowY: 'auto', padding: '4px 10px 8px', flex: 1 },
  section: { marginTop: 8 },
  sectionTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#f5c451',
    fontWeight: 'bold',
    marginBottom: 3,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  row: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  label: { color: C.dim, flexShrink: 0 },
  value: { textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, margin: '6px 0' },
  stat: { background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '3px 4px', textAlign: 'center' },
  statValue: { fontSize: 13, fontWeight: 'bold' },
  statLabel: { color: C.dim, fontSize: 9 },
  btnRow: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  btn: {
    padding: '5px 8px',
    minHeight: 28,
    background: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    color: C.text,
    font: 'inherit',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  btnActive: { background: 'rgba(92,200,255,0.2)', borderColor: C.accent, color: '#fff' },
  barBg: { flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  vitalRow: { display: 'flex', alignItems: 'center', gap: 6 },
  empty: { color: C.dim, fontStyle: 'italic' },
  npcCard: { borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4px 0' },
  npcHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    background: 'none',
    border: 'none',
    padding: 0,
    font: 'inherit',
    cursor: 'pointer',
    textAlign: 'left',
  },
  needs: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 2 },
  needMini: { display: 'flex', alignItems: 'center', gap: 3 },
  status: {
    margin: '0 8px 6px',
    padding: '4px 6px',
    borderRadius: 4,
    background: 'rgba(92,200,255,0.12)',
    color: C.text,
  },
  footer: {
    padding: '4px 8px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    color: C.dim,
    fontSize: 10,
  },
  mini: {
    position: 'fixed',
    top: 8,
    right: 8,
    width: 220,
    zIndex: 10000,
    padding: '4px 6px 6px',
    background: 'rgba(14, 17, 23, 0.88)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: C.text,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 11,
    pointerEvents: 'auto',
  },
  miniStats: { display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 3, paddingRight: 18 },
  miniExpand: {
    position: 'absolute',
    top: 2,
    right: 4,
    background: 'none',
    border: 'none',
    color: C.dim,
    cursor: 'pointer',
    fontSize: 13,
  },
  touchToggle: {
    position: 'fixed',
    top: 64, // below the time / gold HUD in the top-right corner
    right: 8,
    zIndex: 10001,
    width: 44,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.3)',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    touchAction: 'manipulation',
  },
  touchToggleOn: { borderColor: C.accent, background: 'rgba(0,60,90,0.85)' },
};

export default DevOverlay;
