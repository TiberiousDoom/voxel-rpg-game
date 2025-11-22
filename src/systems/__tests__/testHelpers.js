/**
 * Helper to create a test monster with all required properties
 */
function createTestMonster(overrides = {}) {
  return {
    id: 'test-monster',
    name: 'Test Monster',
    position: { x: 0, z: 0 },
    aiState: 'IDLE',
    health: 100,
    maxHealth: 100,
    aggroRange: 10,
    attackRange: 2,
    moveSpeed: 2,
    attackSpeed: 0.5,
    lastAttackTime: 0,
    damage: 5,
    velocity: { x: 0, z: 0 },
    alive: true,
    canFlee: false,
    fleeHealthPercent: 0.3,
    ...overrides
  };
}

module.exports = { createTestMonster };
