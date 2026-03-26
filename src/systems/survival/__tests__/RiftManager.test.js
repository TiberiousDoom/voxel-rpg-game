/**
 * RiftManager.test.js — Tests for rift closing mechanic.
 */

import { RiftManager, RiftState } from '../RiftManager';

// Mock tuning imports
vi.mock('../../../data/tuning', () => ({
  RIFT_DENSITY: 0.25,
  RIFT_MIN_SPAWN_DISTANCE: 96,
  RIFT_MIN_SEPARATION: 128,
  RIFT_SPAWN_RADIUS: 12,
  RIFT_SPAWN_INTERVAL_DAY: 120,
  RIFT_SPAWN_INTERVAL_DUSK: 60,
  RIFT_SPAWN_INTERVAL_NIGHT: 20,
  RIFT_POP_CAP_DAY: 3,
  RIFT_POP_CAP_NIGHT: 8,
  RIFT_ACTIVE_RANGE: 80,
  RIFT_NOCTURNAL_DAMAGE_MULT: 1.5,
  RIFT_NOCTURNAL_SPEED_MULT: 1.25,
  RIFT_CLOSE_RANGE: 8,
  RIFT_ANCHOR_HEALTH: 100,
  RIFT_ANCHOR_ENEMY_DAMAGE: 10,
  RIFT_CORRUPTION_FADE_SPEED: 0.02,
  RIFT_FADE_PROXIMITY_RANGE: 32,
  RIFT_FADE_MIN_SPEED_MULT: 0.05,
  RIFT_NPC_DEFENDER_SPEED_BONUS: 0.5,
  RIFT_WOUNDED_SPAWN_MULT: 0.5,
  RIFT_CHAIN_REACTION_RANGE: 200,
  RIFT_CHAIN_SPAWN_BOOST: 1.5,
  RIFT_REINFORCEMENT_INTERVAL: 15,
  RIFT_REINFORCEMENT_COUNT_BASE: 2,
  RIFT_REINFORCEMENT_ESCALATION: 1,
  RIFT_VOID_SHARD_DROP_CHANCE: 0.3,
  RIFT_DORMANT_DURATION: 300,
}));

describe('RiftManager — Rift Closing', () => {
  let rm;

  beforeEach(() => {
    rm = new RiftManager(42, [0, 0, 0]);
    // Ensure at least one rift exists for testing
    if (rm.rifts.length === 0) {
      rm.rifts.push({
        id: 'rift-0',
        x: 200, z: 200,
        spawnedMonsterIds: [],
        lastSpawnTime: 0,
        isDormant: false,
        dormantUntil: 0,
        state: RiftState.ACTIVE,
        anchorHealth: 0,
        corruptionProgress: 1.0,
        lastReinforcementTime: 0,
      });
    }
  });

  describe('beginClosing', () => {
    test('transitions rift from ACTIVE to CLOSING', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.ACTIVE;
      rift.spawnedMonsterIds = [];

      const result = rm.beginClosing(rift.id, 100);
      expect(result).toBe(true);
      expect(rift.state).toBe(RiftState.CLOSING);
      expect(rift.anchorHealth).toBe(100);
    });

    test('rejects if rift has spawned monsters', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.ACTIVE;
      rift.spawnedMonsterIds = ['mob-1'];

      expect(rm.beginClosing(rift.id, 100)).toBe(false);
      expect(rift.state).toBe(RiftState.ACTIVE);
    });

    test('rejects if rift is not ACTIVE', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.CLOSING;

      expect(rm.beginClosing(rift.id, 100)).toBe(false);
    });

    test('applies chain reaction boost to nearby active rifts', () => {
      const rift1 = rm.rifts[0];
      rift1.state = RiftState.ACTIVE;
      rift1.spawnedMonsterIds = [];

      // Add a nearby rift
      rm.rifts.push({
        id: 'rift-1',
        x: rift1.x + 50, z: rift1.z,
        state: RiftState.ACTIVE,
        spawnedMonsterIds: [],
        lastSpawnTime: 0,
        isDormant: false,
        dormantUntil: 0,
        anchorHealth: 0,
        corruptionProgress: 1.0,
        lastReinforcementTime: 0,
      });

      rm.beginClosing(rift1.id, 100);
      expect(rm.rifts[1]._chainBoost).toBe(1.5);
    });
  });

  describe('damageAnchor', () => {
    test('reduces anchor health', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.CLOSING;
      rift.anchorHealth = 100;

      const result = rm.damageAnchor(rift.id, 25);
      expect(result.destroyed).toBe(false);
      expect(rift.anchorHealth).toBe(75);
    });

    test('transitions to WOUNDED when health reaches 0', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.CLOSING;
      rift.anchorHealth = 10;

      const result = rm.damageAnchor(rift.id, 15);
      expect(result.destroyed).toBe(true);
      expect(rift.state).toBe(RiftState.WOUNDED);
      expect(rift.anchorHealth).toBe(0);
    });

    test('does nothing if rift is not CLOSING', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.ACTIVE;

      const result = rm.damageAnchor(rift.id, 50);
      expect(result.destroyed).toBe(false);
    });
  });

  describe('resumeClosing', () => {
    test('transitions WOUNDED back to CLOSING', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.WOUNDED;
      rift.spawnedMonsterIds = [];
      rift.corruptionProgress = 0.5;

      expect(rm.resumeClosing(rift.id, 200)).toBe(true);
      expect(rift.state).toBe(RiftState.CLOSING);
      expect(rift.anchorHealth).toBe(100);
      expect(rift.corruptionProgress).toBe(0.5); // Progress preserved
    });

    test('rejects if rift has monsters', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.WOUNDED;
      rift.spawnedMonsterIds = ['mob-1'];

      expect(rm.resumeClosing(rift.id, 200)).toBe(false);
    });
  });

  describe('tickCorruptionFade', () => {
    test('reduces corruptionProgress when player is nearby', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.CLOSING;
      rift.corruptionProgress = 1.0;

      const result = rm.tickCorruptionFade(rift, 10, [rift.x, 0, rift.z]);
      expect(result).toBeLessThan(1.0);
    });

    test('fades slower when player is far away', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.CLOSING;

      // Close player
      rift.corruptionProgress = 1.0;
      const close = rm.tickCorruptionFade(rift, 10, [rift.x, 0, rift.z]);

      // Far player
      rift.corruptionProgress = 1.0;
      const far = rm.tickCorruptionFade(rift, 10, [rift.x + 500, 0, rift.z + 500]);

      expect(close).toBeLessThan(far); // Close player = more fade = lower progress
    });

    test('NPC defenders increase fade speed', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.CLOSING;

      rift.corruptionProgress = 1.0;
      const noNPCs = rm.tickCorruptionFade(rift, 10, [rift.x, 0, rift.z], 0);

      rift.corruptionProgress = 1.0;
      const withNPCs = rm.tickCorruptionFade(rift, 10, [rift.x, 0, rift.z], 3);

      expect(withNPCs).toBeLessThan(noNPCs);
    });

    test('clamps at 0', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.CLOSING;
      rift.corruptionProgress = 0.001;

      const result = rm.tickCorruptionFade(rift, 100, [rift.x, 0, rift.z]);
      expect(result).toBe(0);
    });

    test('does nothing if not CLOSING', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.ACTIVE;
      rift.corruptionProgress = 1.0;

      const result = rm.tickCorruptionFade(rift, 10, [rift.x, 0, rift.z]);
      expect(result).toBe(1.0);
    });
  });

  describe('closeRift', () => {
    test('permanently closes rift', () => {
      const rift = rm.rifts[0];
      rift.state = RiftState.CLOSING;
      rift.spawnedMonsterIds = ['mob-1'];

      rm.closeRift(rift.id);
      expect(rift.state).toBe(RiftState.CLOSED);
      expect(rift.corruptionProgress).toBe(0);
      expect(rift.spawnedMonsterIds).toEqual([]);
    });
  });

  describe('getClosingRifts', () => {
    test('returns only CLOSING rifts', () => {
      rm.rifts[0].state = RiftState.CLOSING;
      rm.rifts.push({
        ...rm.rifts[0],
        id: 'rift-other',
        state: RiftState.ACTIVE,
      });

      const closing = rm.getClosingRifts();
      expect(closing).toHaveLength(1);
      expect(closing[0].id).toBe(rm.rifts[0].id);
    });
  });

  describe('getNearestRifts', () => {
    test('excludes CLOSED rifts', () => {
      rm.rifts[0].state = RiftState.CLOSED;
      const nearest = rm.getNearestRifts([0, 0, 0], 10);
      expect(nearest.find(r => r.id === rm.rifts[0].id)).toBeUndefined();
    });

    test('includes state info', () => {
      rm.rifts[0].state = RiftState.CLOSING;
      rm.rifts[0].corruptionProgress = 0.5;
      rm.rifts[0].anchorHealth = 75;

      const nearest = rm.getNearestRifts([0, 0, 0], 10);
      const rift = nearest.find(r => r.id === rm.rifts[0].id);
      expect(rift).toBeDefined();
      expect(rift.state).toBe('CLOSING');
      expect(rift.corruptionProgress).toBe(0.5);
      expect(rift.anchorHealth).toBe(75);
    });
  });

  describe('update (spawn suppression)', () => {
    test('CLOSED rifts do not spawn monsters', () => {
      rm.rifts[0].state = RiftState.CLOSED;
      rm.rifts[0].lastSpawnTime = 0;

      const spawns = rm.update(1000, [rm.rifts[0].x, 0, rm.rifts[0].z], {
        period: 'night', isNight: true,
      }, new Set());

      expect(spawns).toHaveLength(0);
    });

    test('CLOSING rifts do not spawn normally', () => {
      rm.rifts[0].state = RiftState.CLOSING;
      rm.rifts[0].lastSpawnTime = 0;

      const spawns = rm.update(1000, [rm.rifts[0].x, 0, rm.rifts[0].z], {
        period: 'night', isNight: true,
      }, new Set());

      expect(spawns).toHaveLength(0);
    });
  });

  describe('getReinforcementSpawns', () => {
    test('returns reinforcements from nearby active rifts', () => {
      const closingRift = rm.rifts[0];
      closingRift.state = RiftState.CLOSING;
      closingRift.corruptionProgress = 0.8;
      closingRift.lastReinforcementTime = 0;

      // Add a nearby active rift as reinforcement source
      rm.rifts.push({
        id: 'rift-source',
        x: closingRift.x + 50, z: closingRift.z,
        state: RiftState.ACTIVE,
        spawnedMonsterIds: [],
        lastSpawnTime: 0,
        isDormant: false,
        dormantUntil: 0,
        anchorHealth: 0,
        corruptionProgress: 1.0,
        lastReinforcementTime: 0,
      });

      const spawns = rm.getReinforcementSpawns(closingRift, 100);
      expect(spawns.length).toBeGreaterThan(0);
      expect(spawns[0].targetPosition).toBeDefined();
      expect(spawns[0].targetPosition[0]).toBe(closingRift.x);
    });

    test('returns empty if no nearby active rifts', () => {
      const closingRift = rm.rifts[0];
      closingRift.state = RiftState.CLOSING;
      closingRift.lastReinforcementTime = 0;

      // No other rifts
      rm.rifts = [closingRift];

      const spawns = rm.getReinforcementSpawns(closingRift, 100);
      expect(spawns).toHaveLength(0);
    });

    test('escalates enemy types as corruption decreases', () => {
      const closingRift = rm.rifts[0];
      closingRift.state = RiftState.CLOSING;
      closingRift.lastReinforcementTime = 0;

      rm.rifts.push({
        id: 'rift-source',
        x: closingRift.x + 50, z: closingRift.z,
        state: RiftState.ACTIVE,
        spawnedMonsterIds: [],
        lastSpawnTime: 0,
        isDormant: false,
        dormantUntil: 0,
        anchorHealth: 0,
        corruptionProgress: 1.0,
        lastReinforcementTime: 0,
      });

      // Low corruption = elites
      closingRift.corruptionProgress = 0.1;
      const spawns = rm.getReinforcementSpawns(closingRift, 100);
      // Elites should have boosted stats
      const hasElite = spawns.some(s => s.monsterData.name.includes('Elite'));
      expect(hasElite).toBe(true);
    });

    test('respects reinforcement interval', () => {
      const closingRift = rm.rifts[0];
      closingRift.state = RiftState.CLOSING;
      closingRift.lastReinforcementTime = 95; // 5s ago

      rm.rifts.push({
        id: 'rift-source',
        x: closingRift.x + 50, z: closingRift.z,
        state: RiftState.ACTIVE,
        spawnedMonsterIds: [],
        lastSpawnTime: 0,
        isDormant: false,
        dormantUntil: 0,
        anchorHealth: 0,
        corruptionProgress: 1.0,
        lastReinforcementTime: 0,
      });

      // Only 5s since last reinforcement, interval is 15s
      const spawns = rm.getReinforcementSpawns(closingRift, 100);
      expect(spawns).toHaveLength(0);
    });
  });
});
