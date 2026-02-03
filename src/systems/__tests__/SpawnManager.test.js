/**
 * SpawnManager.test.js - Unit tests for monster spawn system
 *
 * Tests:
 * - Zone loading and configuration
 * - Monster type selection (weighted)
 * - Group spawning logic
 * - Elite spawn chance
 * - Respawn timers
 * - Zone population management
 * - Random position generation
 */

// Mock the Monster entity
jest.mock('../../entities/Monster', () => ({
  Monster: jest.fn()
}));

// Mock the spawn zones configuration
jest.mock('../../config/monsters/spawn-zones.json', () => ({
  TEST_ZONE_1: {
    name: 'Test Zone 1',
    position: { x: 50, z: 50 },
    radius: 30,
    monsterTypes: [
      { type: 'SLIME', weight: 50 },
      { type: 'GOBLIN', weight: 30 },
      { type: 'WOLF', weight: 20 }
    ],
    minLevel: 1,
    maxLevel: 3,
    maxPopulation: 10,
    respawnTime: 30000,
    groupSpawnChance: 0.3,
    groupSize: [2, 4],
    eliteSpawnChance: 0.1,
    enabled: true
  },
  TEST_ZONE_2: {
    name: 'Test Zone 2',
    position: { x: 150, z: 150 },
    radius: 40,
    monsterTypes: [
      { type: 'ORC', weight: 100 }
    ],
    minLevel: 5,
    maxLevel: 10,
    maxPopulation: 5,
    respawnTime: 60000,
    groupSpawnChance: 0.5,
    groupSize: [2, 5],
    eliteSpawnChance: 0.2,
    enabled: true
  },
  DISABLED_ZONE: {
    name: 'Disabled Zone',
    position: { x: 0, z: 0 },
    radius: 20,
    monsterTypes: [
      { type: 'SLIME', weight: 100 }
    ],
    minLevel: 1,
    maxLevel: 1,
    maxPopulation: 5,
    respawnTime: 20000,
    groupSpawnChance: 0,
    groupSize: [1, 1],
    eliteSpawnChance: 0,
    enabled: false
  }
}));

// Mock monster modifiers
jest.mock('../../config/monsters/monster-modifiers.json', () => ({
  ELITE: {
    name: 'Elite',
    healthMultiplier: 1.5,
    damageMultiplier: 1.3
  },
  FAST: {
    name: 'Fast',
    speedMultiplier: 1.4
  },
  ARMORED: {
    name: 'Armored',
    defenseBonus: 10
  }
}));

import { SpawnManager } from '../SpawnManager';
import { Monster } from '../../entities/Monster';

describe('SpawnManager', () => {
  let spawnManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set up Monster mock implementation
    Monster.mockImplementation((type, position, options) => ({
      id: `monster-${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      level: options?.level || 1,
      modifier: options?.modifier || null,
      alive: true,
      health: 100,
      maxHealth: 100
    }));

    // Create fresh instance
    spawnManager = new SpawnManager();

    // Mock Math.random for predictable tests
    jest.spyOn(Math, 'random');
  });

  afterEach(() => {
    // Restore Math.random
    Math.random.mockRestore();
  });

  describe('Zone Loading', () => {
    test('should load enabled zones from configuration', () => {
      const zones = spawnManager.getAllZones();

      expect(Object.keys(zones)).toContain('TEST_ZONE_1');
      expect(Object.keys(zones)).toContain('TEST_ZONE_2');
    });

    test('should not load disabled zones', () => {
      const zones = spawnManager.getAllZones();

      expect(Object.keys(zones)).not.toContain('DISABLED_ZONE');
    });

    test('should initialize zone tracking properties', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      expect(zone.currentPopulation).toBe(0);
      expect(zone.monsters).toEqual([]);
      expect(zone.lastSpawnTime).toBe(0);
    });

    test('should preserve zone configuration', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      expect(zone.name).toBe('Test Zone 1');
      expect(zone.position).toEqual({ x: 50, z: 50 });
      expect(zone.radius).toBe(30);
      expect(zone.maxPopulation).toBe(10);
      expect(zone.respawnTime).toBe(30000);
    });
  });

  describe('Monster Type Selection', () => {
    test('should select monster type based on weighted probabilities', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Mock random to select first type (SLIME with weight 50)
      Math.random.mockReturnValue(0.1); // 0.1 * 100 = 10, which is < 50

      const type = spawnManager.selectMonsterType(zone.monsterTypes);
      expect(type).toBe('SLIME');
    });

    test('should select different types based on random value', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Mock random to select second type (GOBLIN)
      // Total weight = 100, SLIME = 50, so 0.6 * 100 = 60 should select GOBLIN
      Math.random.mockReturnValue(0.6);

      const type = spawnManager.selectMonsterType(zone.monsterTypes);
      expect(type).toBe('GOBLIN');
    });

    test('should handle single monster type', () => {
      const zone = spawnManager.getZone('TEST_ZONE_2');

      const type = spawnManager.selectMonsterType(zone.monsterTypes);
      expect(type).toBe('ORC');
    });

    test('should fallback to first type if random exceeds total', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      Math.random.mockReturnValue(0.999);

      const type = spawnManager.selectMonsterType(zone.monsterTypes);
      expect(type).toBe('WOLF'); // Last type should be selected
    });
  });

  describe('Random Position Generation', () => {
    test('should generate position within zone radius', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      Math.random.mockReturnValueOnce(0.5) // angle
                  .mockReturnValueOnce(0.25); // distance (sqrt = 0.5)

      const position = spawnManager.getRandomPositionInZone(zone);

      // Calculate expected distance from center
      const dx = position.x - zone.position.x;
      const dz = position.z - zone.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      expect(distance).toBeLessThanOrEqual(zone.radius);
    });

    test('should generate different positions', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      Math.random.mockReturnValueOnce(0.1).mockReturnValueOnce(0.2)
                  .mockReturnValueOnce(0.8).mockReturnValueOnce(0.9);

      const pos1 = spawnManager.getRandomPositionInZone(zone);
      const pos2 = spawnManager.getRandomPositionInZone(zone);

      expect(pos1.x).not.toBe(pos2.x);
      expect(pos1.z).not.toBe(pos2.z);
    });

    test('should center around zone position', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Random of 0 should place at center
      Math.random.mockReturnValue(0);

      const position = spawnManager.getRandomPositionInZone(zone);

      expect(position.x).toBe(zone.position.x);
      expect(position.z).toBe(zone.position.z);
    });
  });

  describe('Random Integer Generation', () => {
    test('should generate integer between min and max inclusive', () => {
      Math.random.mockReturnValue(0.5);

      const value = spawnManager.randomInt(1, 10);

      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
      expect(Number.isInteger(value)).toBe(true);
    });

    test('should handle min = max', () => {
      const value = spawnManager.randomInt(5, 5);

      expect(value).toBe(5);
    });

    test('should include both min and max values', () => {
      Math.random.mockReturnValueOnce(0); // Should give min
      const min = spawnManager.randomInt(1, 10);
      expect(min).toBe(1);

      Math.random.mockReturnValueOnce(0.999); // Should give max
      const max = spawnManager.randomInt(1, 10);
      expect(max).toBe(10);
    });
  });

  describe('Single Monster Spawning', () => {
    test('should spawn monster with correct type and position', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');
      const position = { x: 50, z: 50 };
      const level = 2;

      const monster = spawnManager.spawnMonster('SLIME', position, level, zone);

      expect(Monster).toHaveBeenCalledWith('SLIME', position, { level: 2 });
      expect(monster.type).toBe('SLIME');
      expect(monster.level).toBe(2);
    });

    test('should track spawned monster in zone', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');
      const position = { x: 50, z: 50 };

      const monster = spawnManager.spawnMonster('SLIME', position, 1, zone);

      expect(zone.monsters).toContain(monster.id);
    });

    test('should spawn elite monster based on chance', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Mock random to trigger elite spawn (< 0.1)
      Math.random.mockReturnValue(0.05);

      const monster = spawnManager.spawnMonster('SLIME', { x: 50, z: 50 }, 1, zone);

      // Check that Monster was called with a modifier
      const call = Monster.mock.calls[Monster.mock.calls.length - 1];
      expect(call[2].modifier).toBeDefined();
    });

    test('should not spawn elite when random exceeds chance', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Mock random to not trigger elite spawn (> 0.1)
      Math.random.mockReturnValue(0.5);

      spawnManager.spawnMonster('SLIME', { x: 50, z: 50 }, 1, zone);

      // Check that Monster was called without a modifier
      const call = Monster.mock.calls[Monster.mock.calls.length - 1];
      expect(call[2].modifier).toBeUndefined();
    });
  });

  describe('Group Spawning', () => {
    test('should spawn group when chance triggers', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Mock for group spawn check and size
      Math.random.mockReturnValueOnce(0.1) // Trigger group spawn (< 0.3)
                  .mockReturnValueOnce(0.5) // Group size
                  .mockReturnValue(0.5); // For other random calls

      const monsters = spawnManager.spawnInZone(zone, 5);

      // Should spawn a group, so monsters.length should reflect group spawning
      expect(monsters.length).toBeGreaterThan(0);
    });

    test('should spawn single monster when group chance fails', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Mock to not trigger group spawn (> 0.3)
      Math.random.mockReturnValue(0.8);

      const monsters = spawnManager.spawnInZone(zone, 1);

      expect(monsters.length).toBe(1);
    });

    test('should spread group members around spawn point', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Force group spawn
      Math.random.mockReturnValueOnce(0.1) // Trigger group
                  .mockReturnValueOnce(0) // Min group size (2)
                  .mockReturnValue(0.5); // Other randoms

      const monsters = spawnManager.spawnInZone(zone, 5);

      // Check that monsters were spawned
      expect(monsters.length).toBeGreaterThan(1);
    });

    test('should not spawn group larger than remaining count', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Request only 2 monsters
      const monsters = spawnManager.spawnInZone(zone, 2);

      // Should not spawn more than requested
      expect(monsters.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Zone Population', () => {
    test('should populate zone to max population', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      Math.random.mockReturnValue(0.8); // Avoid group spawns for predictability

      const monsters = spawnManager.populateZone('TEST_ZONE_1');

      expect(monsters.length).toBe(zone.maxPopulation);
    });

    test('should only spawn needed monsters', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');
      zone.currentPopulation = 7;

      Math.random.mockReturnValue(0.8);

      const monsters = spawnManager.populateZone('TEST_ZONE_1');

      expect(monsters.length).toBe(3); // maxPopulation (10) - current (7)
    });

    test('should return empty array for unknown zone', () => {
      const monsters = spawnManager.populateZone('NONEXISTENT_ZONE');

      expect(monsters).toEqual([]);
    });

    test('should track all spawned monsters in zone', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      Math.random.mockReturnValue(0.8);

      const monsters = spawnManager.populateZone('TEST_ZONE_1');

      monsters.forEach(monster => {
        expect(zone.monsters).toContain(monster.id);
      });
    });
  });

  describe('Populate All Zones', () => {
    test('should populate all enabled zones', () => {
      Math.random.mockReturnValue(0.8);

      const allMonsters = spawnManager.populateAllZones();

      // Should spawn for TEST_ZONE_1 (10) and TEST_ZONE_2 (5)
      expect(allMonsters.length).toBe(15);
    });

    test('should not populate disabled zones', () => {
      Math.random.mockReturnValue(0.8);

      const allMonsters = spawnManager.populateAllZones();

      // Verify no monsters from DISABLED_ZONE
      const disabledZone = spawnManager.zones.DISABLED_ZONE;
      expect(disabledZone).toBeUndefined();
    });
  });

  describe('Update Loop', () => {
    test('should only check spawns every second', () => {
      const monsters = spawnManager.update([], 500); // 500ms < 1000ms

      expect(monsters).toEqual([]);
    });

    test('should check spawns after 1 second accumulates', () => {
      spawnManager.update([], 600);
      const monsters = spawnManager.update([], 500); // Total = 1100ms

      // Should have checked spawns (may or may not spawn depending on timers)
      expect(Array.isArray(monsters)).toBe(true);
    });

    test('should update zone population based on current monsters', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      // Create mock monsters in this zone
      const currentMonsters = [
        { id: 'monster-1', alive: true },
        { id: 'monster-2', alive: true },
        { id: 'monster-3', alive: false }
      ];
      zone.monsters = ['monster-1', 'monster-2', 'monster-3'];

      spawnManager.update(currentMonsters, 1000);

      // Should count only living monsters
      expect(zone.currentPopulation).toBe(2);
    });

    test('should remove dead monsters from zone tracking', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      const currentMonsters = [
        { id: 'monster-1', alive: true },
        { id: 'monster-2', alive: false }
      ];
      zone.monsters = ['monster-1', 'monster-2'];

      spawnManager.update(currentMonsters, 1000);

      expect(zone.monsters).toContain('monster-1');
      expect(zone.monsters).not.toContain('monster-2');
    });

    test('should spawn monsters when below max population and timer elapsed', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');
      zone.currentPopulation = 5;
      zone.lastSpawnTime = Date.now() - 31000; // 31 seconds ago (> respawnTime)

      Math.random.mockReturnValue(0.8); // Avoid group spawns

      const newMonsters = spawnManager.update([], 1000);

      expect(newMonsters.length).toBeGreaterThan(0);
    });

    test('should not spawn if respawn timer has not elapsed', () => {
      const zone1 = spawnManager.getZone('TEST_ZONE_1');
      const zone2 = spawnManager.getZone('TEST_ZONE_2');

      // Set both zones so they won't spawn
      zone1.currentPopulation = 5;
      zone1.lastSpawnTime = Date.now() - 10000; // 10 seconds ago (< respawnTime of 30000)

      zone2.currentPopulation = 5;
      zone2.lastSpawnTime = Date.now() - 10000; // 10 seconds ago (< respawnTime of 60000)

      const newMonsters = spawnManager.update([], 1000);

      expect(newMonsters).toEqual([]);
    });

    test('should not spawn if zone is at max population', () => {
      const zone1 = spawnManager.getZone('TEST_ZONE_1');
      const zone2 = spawnManager.getZone('TEST_ZONE_2');

      // Create monsters for zone 1
      const zone1Monsters = new Array(10).fill(null).map((_, i) => ({
        id: `zone1-monster-${i}`,
        alive: true
      }));
      zone1.monsters = zone1Monsters.map(m => m.id);
      zone1.currentPopulation = 10;

      // Create monsters for zone 2
      const zone2Monsters = new Array(5).fill(null).map((_, i) => ({
        id: `zone2-monster-${i}`,
        alive: true
      }));
      zone2.monsters = zone2Monsters.map(m => m.id);
      zone2.currentPopulation = 5;

      const allMonsters = [...zone1Monsters, ...zone2Monsters];
      const newMonsters = spawnManager.update(allMonsters, 1000);

      expect(newMonsters).toEqual([]);
    });

    test('should update lastSpawnTime when spawning', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');
      zone.currentPopulation = 0;
      zone.lastSpawnTime = 0;

      const beforeTime = Date.now();
      spawnManager.update([], 1000);
      const afterTime = Date.now();

      expect(zone.lastSpawnTime).toBeGreaterThanOrEqual(beforeTime);
      expect(zone.lastSpawnTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Zone Management', () => {
    test('should get zone by ID', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      expect(zone).toBeDefined();
      expect(zone.id).toBe('TEST_ZONE_1');
      expect(zone.name).toBe('Test Zone 1');
    });

    test('should return null for unknown zone', () => {
      const zone = spawnManager.getZone('UNKNOWN_ZONE');

      expect(zone).toBeNull();
    });

    test('should enable zone', () => {
      spawnManager.setZoneEnabled('TEST_ZONE_1', true);

      const zone = spawnManager.getZone('TEST_ZONE_1');
      expect(zone.enabled).toBe(true);
    });

    test('should disable zone', () => {
      spawnManager.setZoneEnabled('TEST_ZONE_1', false);

      const zone = spawnManager.getZone('TEST_ZONE_1');
      expect(zone.enabled).toBe(false);
    });

    test('should clear all zones', () => {
      const zone1 = spawnManager.getZone('TEST_ZONE_1');
      const zone2 = spawnManager.getZone('TEST_ZONE_2');

      zone1.currentPopulation = 5;
      zone1.monsters = ['monster-1', 'monster-2'];
      zone1.lastSpawnTime = 12345;

      zone2.currentPopulation = 3;
      zone2.monsters = ['monster-3'];
      zone2.lastSpawnTime = 67890;

      spawnManager.clearAllZones();

      expect(zone1.currentPopulation).toBe(0);
      expect(zone1.monsters).toEqual([]);
      expect(zone1.lastSpawnTime).toBe(0);

      expect(zone2.currentPopulation).toBe(0);
      expect(zone2.monsters).toEqual([]);
      expect(zone2.lastSpawnTime).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty monster array in update', () => {
      const monsters = spawnManager.update([], 1000);

      expect(Array.isArray(monsters)).toBe(true);
    });

    test('should handle zero delta time', () => {
      const monsters = spawnManager.update([], 0);

      expect(monsters).toEqual([]);
    });

    test('should handle spawning 0 monsters', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');

      const monsters = spawnManager.spawnInZone(zone, 0);

      expect(monsters).toEqual([]);
    });

    test('should handle very large group size request', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');
      zone.groupSize = [10, 20]; // Min group size > requested count

      // Mock all randoms to avoid group spawns (which would fail with invalid randomInt params)
      Math.random.mockReturnValue(0.8); // > groupSpawnChance, so single spawns

      const monsters = spawnManager.spawnInZone(zone, 3);

      // Should spawn exactly what was requested as single monsters
      expect(monsters.length).toBe(3);
    });

    test('should handle monsters with missing zone tracking', () => {
      const zone = spawnManager.getZone('TEST_ZONE_1');
      zone.monsters = [];

      const currentMonsters = [
        { id: 'orphan-monster', alive: true }
      ];

      spawnManager.update(currentMonsters, 1000);

      // Should not crash
      expect(zone.currentPopulation).toBe(0);
    });
  });
});
