/**
 * Monster.test.js - Unit tests for Monster entity
 *
 * Tests monster creation, configuration, and stats.
 */

import Monster from '../Monster';

describe('Monster Entity', () => {
  // ============================================
  // MONSTER CREATION TESTS
  // ============================================

  describe('Monster Creation', () => {
    test('should create monster with default values', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.type).toBe('SLIME');
      expect(monster.position.x).toBe(10);
      expect(monster.position.z).toBe(10);
      expect(monster.level).toBe(1);
      expect(monster.aiState).toBe('IDLE');
      expect(monster.health).toBeGreaterThan(0);
      expect(monster.alive).toBe(true);
    });

    test('should create monster at different positions', () => {
      const monster1 = new Monster('SLIME', { x: 5, z: 5 }, { level: 1 });
      const monster2 = new Monster('SLIME', { x: 50, z: 50 }, { level: 1 });

      expect(monster1.position.x).toBe(5);
      expect(monster1.position.z).toBe(5);
      expect(monster2.position.x).toBe(50);
      expect(monster2.position.z).toBe(50);
    });

    test('should have unique IDs', () => {
      const monster1 = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });
      const monster2 = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster1.id).not.toBe(monster2.id);
    });

    test('should initialize with velocity at zero', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.velocity).toBeDefined();
      expect(monster.velocity.x).toBe(0);
      expect(monster.velocity.z).toBe(0);
    });
  });

  // ============================================
  // MONSTER STATS TESTS
  // ============================================

  describe('Monster Stats', () => {
    test('should have health stat', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.health).toBeGreaterThan(0);
      expect(monster.maxHealth).toBeGreaterThan(0);
      expect(monster.health).toBe(monster.maxHealth);
    });

    test('should have damage stat', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.damage).toBeGreaterThan(0);
    });

    test('should have move speed stat', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.moveSpeed).toBeGreaterThan(0);
    });

    test('should have aggro range', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.aggroRange).toBeGreaterThan(0);
    });

    test('should have attack range', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.attackRange).toBeGreaterThan(0);
    });

    test('should have attack speed', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.attackSpeed).toBeGreaterThan(0);
      expect(monster.lastAttackTime).toBe(0);
    });
  });

  // ============================================
  // MONSTER TYPES TESTS
  // ============================================

  describe('Monster Types', () => {
    const monsterTypes = ['SLIME', 'GOBLIN', 'WOLF', 'SKELETON', 'ORC'];

    monsterTypes.forEach(type => {
      test(`should create ${type} monster`, () => {
        const monster = new Monster(type, { x: 10, z: 10 }, { level: 1 });

        expect(monster.type).toBe(type);
        expect(monster.health).toBeGreaterThan(0);
        expect(monster.damage).toBeGreaterThan(0);
      });
    });

    test('should have different stats for different types', () => {
      const slime = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });
      const goblin = new Monster('GOBLIN', { x: 10, z: 10 }, { level: 1 });

      // Different monster types should have different stats
      expect(slime.health).not.toBe(goblin.health);
    });
  });

  // ============================================
  // MONSTER LEVEL TESTS
  // ============================================

  describe('Monster Levels', () => {
    test('should create monsters at different levels', () => {
      const level1 = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });
      const level5 = new Monster('SLIME', { x: 10, z: 10 }, { level: 5 });

      expect(level1.level).toBe(1);
      expect(level5.level).toBe(5);
    });

    test('higher level monsters should be stronger', () => {
      const level1 = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });
      const level5 = new Monster('SLIME', { x: 10, z: 10 }, { level: 5 });

      expect(level5.maxHealth).toBeGreaterThan(level1.maxHealth);
      expect(level5.damage).toBeGreaterThan(level1.damage);
    });
  });

  // ============================================
  // MONSTER BEHAVIOR FLAGS TESTS
  // ============================================

  describe('Monster Behavior Flags', () => {
    test('GOBLIN should have canFlee flag', () => {
      const goblin = new Monster('GOBLIN', { x: 10, z: 10 }, { level: 1 });

      expect(goblin.canFlee).toBe(true);
    });

    test('SLIME should not flee', () => {
      const slime = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(slime.canFlee).toBe(false);
    });

    test('should track alive state', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.alive).toBe(true);
    });
  });

  // ============================================
  // MONSTER DAMAGE TESTS
  // ============================================

  describe('Monster Damage', () => {
    test('should take damage', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });
      const initialHealth = monster.health;

      monster.health -= 10;

      expect(monster.health).toBe(initialHealth - 10);
      expect(monster.health).toBeGreaterThan(0);
    });

    test('health can reach 0', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      monster.health = 0;

      expect(monster.health).toBe(0);
    });

    test('can set health to any value', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      monster.health = 50;

      expect(monster.health).toBe(50);
    });
  });

  // ============================================
  // PATROL TESTS
  // ============================================

  describe('Patrol Behavior', () => {
    test('should support patrol path via options', () => {
      const patrolPath = [
        { x: 10, z: 10 },
        { x: 15, z: 10 },
        { x: 15, z: 15 },
        { x: 10, z: 15 }
      ];

      const monster = new Monster('GOBLIN', { x: 10, z: 10 }, { level: 1, patrolPath });

      expect(monster.patrolPath).toBeDefined();
      expect(monster.patrolPath.length).toBe(4);
      expect(monster.currentWaypointIndex).toBe(0);
    });

    test('should have null patrol path by default', () => {
      const monster = new Monster('GOBLIN', { x: 10, z: 10 }, { level: 1 });

      expect(monster.patrolPath).toBeNull();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    test('should default to level 1', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 });

      expect(monster.level).toBe(1);
      expect(monster.health).toBeGreaterThan(0);
    });

    test('should handle very high levels', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 100 });

      expect(monster.level).toBe(100);
      expect(monster.maxHealth).toBeGreaterThan(0);
    });

    test('should handle negative position', () => {
      const monster = new Monster('SLIME', { x: -10, z: -10 }, { level: 1 });

      expect(monster.position.x).toBe(-10);
      expect(monster.position.z).toBe(-10);
    });

    test('should initialize lastAttackTime to 0', () => {
      const monster = new Monster('SLIME', { x: 10, z: 10 }, { level: 1 });

      expect(monster.lastAttackTime).toBe(0);
    });
  });
});
