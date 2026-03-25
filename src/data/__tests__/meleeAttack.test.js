/**
 * meleeAttack.test.js — Tests for player melee combat system.
 */

import { performMeleeAttack, getMeleeDamage } from '../meleeAttack';

jest.mock('../tuning', () => ({
  MELEE_RANGE: 3.5,
  MELEE_CONE_ANGLE: 60,
  MELEE_COOLDOWN: 0.5,
  MELEE_BASE_DAMAGE: 5,
  MELEE_KNOCKBACK: 6,
}));

function makeStore(overrides = {}) {
  return {
    attackMonster: jest.fn(),
    equipment: { weapon: null },
    ...overrides,
  };
}

function makeEnemy(overrides = {}) {
  return {
    id: 'enemy_1',
    alive: true,
    position: [2, 0, 2],
    ...overrides,
  };
}

describe('performMeleeAttack', () => {
  test('hits enemy within range and cone', () => {
    const store = makeStore();
    // Player at origin, facing +Z (angle 0), enemy at [0, 0, 2] (directly ahead)
    const result = performMeleeAttack(store, [0, 0, 0], 0, [makeEnemy({ position: [0, 0, 2] })]);
    expect(result.hit).toBe(true);
    expect(result.enemiesHit).toBe(1);
    expect(store.attackMonster).toHaveBeenCalledWith('enemy_1');
  });

  test('misses enemy outside range', () => {
    const store = makeStore();
    // Enemy at 10 units away (beyond MELEE_RANGE of 3.5)
    const result = performMeleeAttack(store, [0, 0, 0], 0, [makeEnemy({ position: [0, 0, 10] })]);
    expect(result.hit).toBe(false);
    expect(store.attackMonster).not.toHaveBeenCalled();
  });

  test('misses enemy outside cone angle', () => {
    const store = makeStore();
    // Player facing +Z (angle 0), enemy is directly behind at [0, 0, -2]
    const result = performMeleeAttack(store, [0, 0, 0], 0, [makeEnemy({ position: [0, 0, -2] })]);
    expect(result.hit).toBe(false);
    expect(store.attackMonster).not.toHaveBeenCalled();
  });

  test('hits enemy at cone edge (within 60 degrees)', () => {
    const store = makeStore();
    // Player facing +Z (angle 0), enemy at ~45 degrees to the right (within 60 deg cone)
    const result = performMeleeAttack(store, [0, 0, 0], 0, [makeEnemy({ position: [2, 0, 2] })]);
    expect(result.hit).toBe(true);
  });

  test('hits multiple enemies in one swing', () => {
    const store = makeStore();
    const enemies = [
      makeEnemy({ id: 'e1', position: [0, 0, 2] }),
      makeEnemy({ id: 'e2', position: [1, 0, 2] }),
    ];
    const result = performMeleeAttack(store, [0, 0, 0], 0, enemies);
    expect(result.enemiesHit).toBe(2);
    expect(store.attackMonster).toHaveBeenCalledTimes(2);
  });

  test('skips dead enemies', () => {
    const store = makeStore();
    const result = performMeleeAttack(store, [0, 0, 0], 0, [makeEnemy({ alive: false, position: [0, 0, 2] })]);
    expect(result.hit).toBe(false);
  });

  test('returns no hit when no enemies', () => {
    const store = makeStore();
    expect(performMeleeAttack(store, [0, 0, 0], 0, []).hit).toBe(false);
    expect(performMeleeAttack(store, [0, 0, 0], 0, null).hit).toBe(false);
  });

  test('works with {x, y, z} position format', () => {
    const store = makeStore();
    const result = performMeleeAttack(store, [0, 0, 0], 0, [
      makeEnemy({ position: { x: 0, y: 0, z: 2 } }),
    ]);
    // Should handle object position format (from Enemy.jsx which uses {x,y,z})
    expect(result.hit).toBe(true);
  });

  test('handles facing different directions', () => {
    const store = makeStore();
    // Facing -Z (angle = PI), enemy at [0, 0, -2] (now in front)
    const result = performMeleeAttack(store, [0, 0, 0], Math.PI, [makeEnemy({ position: [0, 0, -2] })]);
    expect(result.hit).toBe(true);
  });
});

describe('getMeleeDamage', () => {
  test('returns base damage with no weapon', () => {
    expect(getMeleeDamage({ equipment: { weapon: null } })).toBe(5);
  });

  test('returns weapon damage when weapon equipped', () => {
    expect(getMeleeDamage({ equipment: { weapon: { stats: { damage: 25 } } } })).toBe(25);
  });

  test('returns base damage when weapon has no damage stat', () => {
    expect(getMeleeDamage({ equipment: { weapon: { stats: {} } } })).toBe(5);
  });
});
