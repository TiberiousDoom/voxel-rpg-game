/**
 * NPCStateMachine.test.js — Tests for the pure NPC state machine extracted
 * from SettlementTick.jsx.
 */

import {
  tickNPC,
  getIdleTimerRange,
  getWanderRadiusMult,
  getSocialDecayMult,
  getPersonalityHappinessBonus,
} from '../NPCStateMachine';

// ── Helper: build a default NPC and context ───────────────────

function makeNPC(overrides = {}) {
  return {
    id: 'npc_1',
    fullName: 'Test Settler',
    personality: 'stoic',
    position: [50, 2, 50],
    targetPosition: null,
    facingAngle: 0,
    state: 'IDLE',
    stateTimer: 0,
    hunger: 80,
    rest: 80,
    social: 80,
    happiness: 65,
    unhappyDays: 0,
    dayCheckpoint: 0,
    currentJob: null,
    arrivedAtSettlement: true,
    eatingRestore: 0,
    _hungryWarned: false,
    ...overrides,
  };
}

function makeContext(overrides = {}) {
  return {
    center: [50, 2, 50],
    attractiveness: 30,
    npcs: [],
    inventory: { materials: { meat: 5, berry: 10 } },
    worldTimeElapsed: 100,
    warnedNPCs: new Set(),
    ...overrides,
  };
}

// ── Personality helpers ───────────────────────────────────────

describe('Personality helpers', () => {
  test('getIdleTimerRange returns correct ranges', () => {
    expect(getIdleTimerRange('diligent')).toEqual([3, 8]);
    expect(getIdleTimerRange('lazy')).toEqual([10, 20]);
    expect(getIdleTimerRange('curious')).toEqual([3, 8]);
    expect(getIdleTimerRange('stoic')).toEqual([5, 15]);
    expect(getIdleTimerRange('unknown')).toEqual([5, 15]);
  });

  test('getWanderRadiusMult returns correct multipliers', () => {
    expect(getWanderRadiusMult('brave')).toBe(2.0);
    expect(getWanderRadiusMult('cautious')).toBe(0.5);
    expect(getWanderRadiusMult('stoic')).toBe(1.0);
  });

  test('getSocialDecayMult returns 0.5 for stoic, 1.0 otherwise', () => {
    expect(getSocialDecayMult('stoic')).toBe(0.5);
    expect(getSocialDecayMult('cheerful')).toBe(1.0);
  });

  test('getPersonalityHappinessBonus returns correct bonuses', () => {
    expect(getPersonalityHappinessBonus('cheerful')).toBe(10);
    expect(getPersonalityHappinessBonus('grumpy')).toBe(-10);
    expect(getPersonalityHappinessBonus('stoic')).toBe(0);
  });
});

// ── Needs decay ──────────────────────────────────────────────

describe('Needs decay', () => {
  test('hunger decays at NPC_HUNGER_DECAY_RATE per second', () => {
    const npc = makeNPC({ hunger: 80 });
    const { updates } = tickNPC(npc, 2, makeContext());
    // 80 - 0.5 * 2 = 79
    expect(updates.hunger).toBeCloseTo(79, 1);
  });

  test('rest decays at NPC_REST_DECAY_RATE per second', () => {
    const npc = makeNPC({ rest: 80 });
    const { updates } = tickNPC(npc, 2, makeContext());
    // 80 - 0.35 * 2 = 79.3
    expect(updates.rest).toBeCloseTo(79.3, 1);
  });

  test('social decays at NPC_SOCIAL_DECAY_RATE * socialDecayMult per second', () => {
    const npc = makeNPC({ social: 80, personality: 'stoic' });
    const { updates } = tickNPC(npc, 2, makeContext());
    // 80 - 0.15 * 0.5 * 2 = 79.85
    expect(updates.social).toBeCloseTo(79.85, 2);
  });

  test('social decays faster for non-stoic personalities', () => {
    const npc = makeNPC({ social: 80, personality: 'cheerful' });
    const { updates } = tickNPC(npc, 2, makeContext());
    // 80 - 0.15 * 1.0 * 2 = 79.7
    expect(updates.social).toBeCloseTo(79.7, 2);
  });

  test('needs are clamped to 0-100 range', () => {
    const npc = makeNPC({ hunger: 0.1, rest: 0.1, social: 0.1 });
    const { updates } = tickNPC(npc, 100, makeContext());
    expect(updates.hunger).toBe(0);
    expect(updates.rest).toBe(0);
    expect(updates.social).toBe(0);
  });
});

// ── Happiness formula ────────────────────────────────────────

describe('Happiness formula', () => {
  test('calculates happiness with correct weights', () => {
    const npc = makeNPC({ hunger: 100, rest: 100, social: 100, personality: 'stoic' });
    const { updates } = tickNPC(npc, 0.01, makeContext());
    // ~(100*0.35 + 100*0.3 + 100*0.2 + 15 + 0) = 100 (clamped)
    expect(updates.happiness).toBeCloseTo(100, 0);
  });

  test('cheerful personality adds +10 happiness', () => {
    const base = makeNPC({ hunger: 50, rest: 50, social: 50, personality: 'cheerful' });
    const cheerful = tickNPC(base, 0.01, makeContext());
    const stoic = tickNPC(makeNPC({ hunger: 50, rest: 50, social: 50, personality: 'stoic' }), 0.01, makeContext());
    expect(cheerful.updates.happiness - stoic.updates.happiness).toBeCloseTo(10, 0);
  });

  test('grumpy personality subtracts 10 happiness', () => {
    const base = makeNPC({ hunger: 50, rest: 50, social: 50, personality: 'grumpy' });
    const grumpy = tickNPC(base, 0.01, makeContext());
    const stoic = tickNPC(makeNPC({ hunger: 50, rest: 50, social: 50, personality: 'stoic' }), 0.01, makeContext());
    expect(grumpy.updates.happiness - stoic.updates.happiness).toBeCloseTo(-10, 0);
  });

  test('happiness is clamped to 0-100', () => {
    const npc = makeNPC({ hunger: 0, rest: 0, social: 0, personality: 'grumpy' });
    const { updates } = tickNPC(npc, 0.01, makeContext());
    expect(updates.happiness).toBeGreaterThanOrEqual(0);
  });
});

// ── APPROACHING state ────────────────────────────────────────

describe('APPROACHING state', () => {
  test('increments stateTimer', () => {
    const npc = makeNPC({ state: 'APPROACHING', stateTimer: 10 });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.stateTimer).toBe(12);
  });

  test('transitions to LEAVING after 60s', () => {
    const npc = makeNPC({ state: 'APPROACHING', stateTimer: 59 });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.state).toBe('LEAVING');
    expect(updates.stateTimer).toBe(0);
    expect(updates.targetPosition).toBeDefined();
  });

  test('does not decay needs while APPROACHING', () => {
    const npc = makeNPC({ state: 'APPROACHING', hunger: 80 });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.hunger).toBeUndefined();
  });
});

// ── LEAVING state ────────────────────────────────────────────

describe('LEAVING state', () => {
  test('increments stateTimer', () => {
    const npc = makeNPC({ state: 'LEAVING', stateTimer: 10 });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.stateTimer).toBe(12);
  });

  test('returns remove: true after 30s', () => {
    const npc = makeNPC({ state: 'LEAVING', stateTimer: 29 });
    const result = tickNPC(npc, 2, makeContext());
    expect(result.remove).toBe(true);
  });

  test('does not return remove before 30s', () => {
    const npc = makeNPC({ state: 'LEAVING', stateTimer: 10 });
    const result = tickNPC(npc, 2, makeContext());
    expect(result.remove).toBeUndefined();
  });
});

// ── EVALUATING state ─────────────────────────────────────────

describe('EVALUATING state', () => {
  test('joins settlement when attractiveness >= threshold after duration', () => {
    const npc = makeNPC({ state: 'EVALUATING', stateTimer: 7 });
    const ctx = makeContext({ attractiveness: 30 });
    const { updates, notifications } = tickNPC(npc, 2, ctx);
    expect(updates.state).toBe('IDLE');
    expect(updates.stateTimer).toBe(0);
    expect(notifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'success', title: 'New Settler!' })])
    );
  });

  test('rejects and leaves when attractiveness < threshold', () => {
    const npc = makeNPC({ state: 'EVALUATING', stateTimer: 7 });
    const ctx = makeContext({ attractiveness: 5 });
    const { updates, notifications } = tickNPC(npc, 2, ctx);
    expect(updates.state).toBe('LEAVING');
    expect(updates.targetPosition).toBeDefined();
    expect(notifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'warning', title: 'Settler Rejected' })])
    );
  });

  test('stays EVALUATING before duration expires', () => {
    const npc = makeNPC({ state: 'EVALUATING', stateTimer: 2 });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.state).toBeUndefined(); // no state change
    expect(updates.stateTimer).toBe(4);
  });
});

// ── IDLE → EATING ────────────────────────────────────────────

describe('IDLE → EATING', () => {
  test('transitions to EATING when hunger < critical and food available', () => {
    const npc = makeNPC({ state: 'IDLE', hunger: 10 });
    const { updates, consumeFood } = tickNPC(npc, 2, makeContext());
    expect(updates.state).toBe('EATING');
    expect(updates.eatingRestore).toBeDefined();
    expect(consumeFood).toBeDefined();
    expect(consumeFood.qty).toBe(1);
  });

  test('prefers meat over berry (priority order)', () => {
    const npc = makeNPC({ state: 'IDLE', hunger: 10 });
    const { consumeFood } = tickNPC(npc, 2, makeContext({ inventory: { materials: { meat: 1, berry: 5 } } }));
    expect(consumeFood.material).toBe('meat');
  });

  test('falls back to berry when no meat', () => {
    const npc = makeNPC({ state: 'IDLE', hunger: 10 });
    const { consumeFood } = tickNPC(npc, 2, makeContext({ inventory: { materials: { berry: 5 } } }));
    expect(consumeFood.material).toBe('berry');
  });

  test('stays IDLE and warns when no food available', () => {
    const npc = makeNPC({ state: 'IDLE', hunger: 10, _hungryWarned: false });
    const ctx = makeContext({ inventory: { materials: {} } });
    const { updates, notifications, consumeFood } = tickNPC(npc, 2, ctx);
    expect(updates.state).toBeUndefined(); // stays IDLE
    expect(consumeFood).toBeUndefined();
    expect(updates._hungryWarned).toBe(true);
    expect(notifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'No Food' })])
    );
  });
});

// ── IDLE → SLEEPING ──────────────────────────────────────────

describe('IDLE → SLEEPING', () => {
  test('transitions to SLEEPING when rest < critical', () => {
    const npc = makeNPC({ state: 'IDLE', hunger: 80, rest: 10 });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.state).toBe('SLEEPING');
    expect(updates.stateTimer).toBe(0);
  });

  test('hunger takes priority over rest', () => {
    const npc = makeNPC({ state: 'IDLE', hunger: 10, rest: 10 });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.state).toBe('EATING'); // hunger first
  });
});

// ── IDLE → SOCIALIZING ───────────────────────────────────────

describe('IDLE → SOCIALIZING', () => {
  test('transitions to SOCIALIZING when social < critical and neighbor nearby', () => {
    const neighbor = makeNPC({ id: 'npc_2', position: [55, 2, 50], state: 'IDLE' });
    const npc = makeNPC({ state: 'IDLE', hunger: 80, rest: 80, social: 10 });
    const ctx = makeContext({ npcs: [npc, neighbor] });
    const { updates } = tickNPC(npc, 2, ctx);
    expect(updates.state).toBe('SOCIALIZING');
    expect(updates.targetPosition).toEqual(neighbor.position);
  });

  test('stays IDLE when social is low but no neighbor within 20 units', () => {
    const farNeighbor = makeNPC({ id: 'npc_2', position: [100, 2, 100], state: 'IDLE' });
    const npc = makeNPC({ state: 'IDLE', hunger: 80, rest: 80, social: 10 });
    const ctx = makeContext({ npcs: [npc, farNeighbor] });
    const { updates } = tickNPC(npc, 2, ctx);
    // Should not transition to SOCIALIZING (no neighbor within 20 units)
    // May wander or stay idle depending on timer
    expect(updates.state !== 'SOCIALIZING').toBe(true);
  });

  test('does not socialize with APPROACHING or LEAVING NPCs', () => {
    const leaving = makeNPC({ id: 'npc_2', position: [55, 2, 50], state: 'LEAVING' });
    const npc = makeNPC({ state: 'IDLE', hunger: 80, rest: 80, social: 10 });
    const ctx = makeContext({ npcs: [npc, leaving] });
    const { updates } = tickNPC(npc, 2, ctx);
    expect(updates.state !== 'SOCIALIZING').toBe(true);
  });
});

// ── EATING → IDLE ────────────────────────────────────────────

describe('EATING → IDLE', () => {
  test('restores hunger over eating duration and transitions to IDLE', () => {
    const npc = makeNPC({ state: 'EATING', stateTimer: 2, eatingRestore: 15, hunger: 10 });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.state).toBe('IDLE');
    expect(updates.stateTimer).toBe(0);
    expect(updates.hunger).toBeGreaterThan(10); // some restoration happened
  });

  test('hunger increases by (restore/duration)*tickDelta', () => {
    const npc = makeNPC({ state: 'EATING', stateTimer: 0, eatingRestore: 15, hunger: 10 });
    const { updates } = tickNPC(npc, 1, makeContext());
    // hunger decayed first: 10 - 0.5*1 = 9.5, then restored: 9.5 + (15/3)*1 = 14.5
    expect(updates.hunger).toBeCloseTo(14.5, 1);
  });
});

// ── SLEEPING → IDLE ──────────────────────────────────────────

describe('SLEEPING → IDLE', () => {
  test('restores rest at 8/sec and transitions to IDLE at rest >= 80', () => {
    const npc = makeNPC({ state: 'SLEEPING', rest: 72, stateTimer: 0 });
    const { updates } = tickNPC(npc, 2, makeContext());
    // rest decayed: 72 - 0.35*2 = 71.3, then restored: 71.3 + 8*2 = 87.3
    expect(updates.rest).toBeGreaterThanOrEqual(80);
    expect(updates.state).toBe('IDLE');
  });

  test('stays SLEEPING when rest < 80', () => {
    const npc = makeNPC({ state: 'SLEEPING', rest: 50, stateTimer: 0 });
    const { updates } = tickNPC(npc, 1, makeContext());
    // rest decayed: 50 - 0.35*1 = 49.65, restored: 49.65 + 8*1 = 57.65
    expect(updates.rest).toBeLessThan(80);
    expect(updates.state).toBeUndefined(); // stays SLEEPING
  });
});

// ── SOCIALIZING → IDLE ───────────────────────────────────────

describe('SOCIALIZING → IDLE', () => {
  test('transitions to IDLE after NPC_SOCIAL_DURATION', () => {
    const npc = makeNPC({ state: 'SOCIALIZING', stateTimer: 14, social: 50 });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.state).toBe('IDLE');
    expect(updates.stateTimer).toBe(0);
    expect(updates.targetPosition).toBeNull();
  });

  test('restores social during socializing', () => {
    const npc = makeNPC({ state: 'SOCIALIZING', stateTimer: 0, social: 50 });
    const { updates } = tickNPC(npc, 2, makeContext());
    // social decayed: 50 - 0.15*0.5*2 = 49.85, restored: 49.85 + (20/15)*2 ≈ 52.52
    expect(updates.social).toBeGreaterThan(50);
  });
});

// ── WANDERING → IDLE ─────────────────────────────────────────

describe('WANDERING → IDLE', () => {
  test('transitions to IDLE after 15s', () => {
    const npc = makeNPC({ state: 'WANDERING', stateTimer: 14, targetPosition: [60, 2, 60] });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.state).toBe('IDLE');
    expect(updates.stateTimer).toBe(0);
    expect(updates.targetPosition).toBeNull();
  });

  test('transitions to IDLE when no target position', () => {
    const npc = makeNPC({ state: 'WANDERING', stateTimer: 2, targetPosition: null });
    const { updates } = tickNPC(npc, 2, makeContext());
    expect(updates.state).toBe('IDLE');
  });
});

// ── Unhappy day tracking & departure ─────────────────────────

describe('Unhappy day tracking', () => {
  test('increments unhappyDays when happiness < threshold at day boundary', () => {
    const npc = makeNPC({
      state: 'IDLE',
      hunger: 0,
      rest: 0,
      social: 0,
      personality: 'grumpy',
      dayCheckpoint: 0,
      unhappyDays: 0,
    });
    const ctx = makeContext({ worldTimeElapsed: 1200 }); // DAY_LENGTH_SECONDS
    const { updates } = tickNPC(npc, 2, ctx);
    expect(updates.unhappyDays).toBe(1);
    expect(updates.dayCheckpoint).toBe(1200);
  });

  test('decrements unhappyDays when happiness >= threshold', () => {
    const npc = makeNPC({
      state: 'IDLE',
      hunger: 80,
      rest: 80,
      social: 80,
      dayCheckpoint: 0,
      unhappyDays: 2,
    });
    const ctx = makeContext({ worldTimeElapsed: 1200 });
    const { updates } = tickNPC(npc, 2, ctx);
    expect(updates.unhappyDays).toBe(1);
  });

  test('emits warning at NPC_LEAVE_WARNING_DAYS', () => {
    const warnedNPCs = new Set();
    const npc = makeNPC({
      state: 'IDLE',
      hunger: 0,
      rest: 0,
      social: 0,
      personality: 'grumpy',
      dayCheckpoint: 0,
      unhappyDays: 1, // will become 2 after this tick
    });
    const ctx = makeContext({ worldTimeElapsed: 1200, warnedNPCs });
    const { notifications } = tickNPC(npc, 2, ctx);
    expect(notifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Unhappy Settler' })])
    );
    expect(warnedNPCs.has('npc_1')).toBe(true);
  });

  test('NPC departs at NPC_LEAVE_DEPARTURE_DAYS', () => {
    const npc = makeNPC({
      state: 'IDLE',
      hunger: 0,
      rest: 0,
      social: 0,
      personality: 'grumpy',
      dayCheckpoint: 0,
      unhappyDays: 2, // will become 3 after this tick
    });
    const ctx = makeContext({ worldTimeElapsed: 1200 });
    const { updates, notifications } = tickNPC(npc, 2, ctx);
    expect(updates.state).toBe('LEAVING');
    expect(updates.targetPosition).toBeDefined();
    expect(notifications).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Settler Leaving' })])
    );
  });

  test('does not check unhappy days before day boundary', () => {
    const npc = makeNPC({
      state: 'IDLE',
      hunger: 0,
      rest: 0,
      social: 0,
      dayCheckpoint: 0,
      unhappyDays: 0,
    });
    const ctx = makeContext({ worldTimeElapsed: 500 }); // < DAY_LENGTH_SECONDS
    const { updates } = tickNPC(npc, 2, ctx);
    expect(updates.unhappyDays).toBeUndefined();
  });
});
