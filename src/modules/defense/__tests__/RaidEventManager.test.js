/**
 * RaidEventManager.test.js - Tests for raid event management
 */
import RaidEventManager from '../RaidEventManager.js';

describe('RaidEventManager', () => {
  let raidManager, mockNPCManager;

  beforeEach(() => {
    mockNPCManager = {
      npcs: new Map(),
      getAllNPCs: jest.fn(() => Array.from(mockNPCManager.npcs.values()))
    };

    // Add mock NPCs
    for (let i = 0; i < 10; i++) {
      mockNPCManager.npcs.set(`npc${i}`, {
        id: `npc${i}`,
        name: `NPC ${i}`,
        alive: true
      });
    }

    raidManager = new RaidEventManager(mockNPCManager);
  });

  describe('scheduleNextRaid', () => {
    test('schedules next raid', () => {
      const result = raidManager.scheduleNextRaid();

      expect(result.nextRaidTime).toBeGreaterThan(Date.now());
      expect(result.interval).toBeGreaterThan(0);
      expect(raidManager.nextRaidTime).toBe(result.nextRaidTime);
    });

    test('accepts custom interval', () => {
      const customInterval = 60000; // 1 minute
      const result = raidManager.scheduleNextRaid(customInterval);

      expect(result.interval).toBe(customInterval);
    });

    test('emits raid:scheduled event', () => {
      const listener = jest.fn();
      raidManager.on('raid:scheduled', listener);

      raidManager.scheduleNextRaid();

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toHaveProperty('time');
      expect(listener.mock.calls[0][0]).toHaveProperty('interval');
    });
  });

  describe('shouldTriggerRaid', () => {
    test('returns false when no raid scheduled', () => {
      expect(raidManager.shouldTriggerRaid()).toBe(false);
    });

    test('returns false when raid time not reached', () => {
      raidManager.scheduleNextRaid(999999);

      expect(raidManager.shouldTriggerRaid()).toBe(false);
    });

    test('returns true when raid time reached', () => {
      raidManager.nextRaidTime = Date.now() - 1000; // 1 second ago

      expect(raidManager.shouldTriggerRaid()).toBe(true);
    });

    test('returns false when raid already active', () => {
      raidManager.nextRaidTime = Date.now() - 1000;
      raidManager.startRaid();

      expect(raidManager.shouldTriggerRaid()).toBe(false);
    });
  });

  describe('startRaid', () => {
    test('starts raid successfully', () => {
      const result = raidManager.startRaid();

      expect(result.success).toBe(true);
      expect(result.raid).toBeDefined();
      expect(result.raid.id).toContain('raid_');
      expect(result.raid.status).toBe('active');
      expect(result.raid.waves).toBeDefined();
      expect(result.raid.waves.length).toBeGreaterThan(0);
    });

    test('uses provided difficulty', () => {
      const result = raidManager.startRaid({ difficulty: 5 });

      expect(result.raid.difficulty).toBe(5);
    });

    test('uses provided type', () => {
      const result = raidManager.startRaid({ type: 'dragon_assault' });

      expect(result.raid.type).toBe('dragon_assault');
    });

    test('calculates difficulty from population', () => {
      const result = raidManager.startRaid();

      expect(result.raid.difficulty).toBeGreaterThanOrEqual(1);
      expect(result.raid.difficulty).toBeLessThanOrEqual(10);
    });

    test('prevents starting when raid active', () => {
      raidManager.startRaid();
      const result = raidManager.startRaid();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Raid already active');
    });

    test('emits raid:started event', () => {
      const listener = jest.fn();
      raidManager.on('raid:started', listener);

      raidManager.startRaid();

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toHaveProperty('raidId');
    });
  });

  describe('spawnNextWave', () => {
    beforeEach(() => {
      raidManager.startRaid({ difficulty: 2 });
    });

    test('spawns wave successfully', () => {
      const result = raidManager.spawnNextWave();

      expect(result.success).toBe(true);
      expect(result.wave).toBeDefined();
      expect(result.enemies).toBeDefined();
      expect(result.enemies.length).toBeGreaterThan(0);
    });

    test('increments current wave', () => {
      const initialWave = raidManager.activeRaid.currentWave;

      raidManager.spawnNextWave();

      expect(raidManager.activeRaid.currentWave).toBe(initialWave + 1);
    });

    test('enemies have required properties', () => {
      const result = raidManager.spawnNextWave();
      const enemy = result.enemies[0];

      expect(enemy).toHaveProperty('id');
      expect(enemy).toHaveProperty('type');
      expect(enemy).toHaveProperty('health');
      expect(enemy).toHaveProperty('damage');
      expect(enemy).toHaveProperty('alive');
    });

    test('fails when no active raid', () => {
      raidManager.activeRaid = null;

      const result = raidManager.spawnNextWave();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active raid');
    });

    test('fails when no more waves', () => {
      // Spawn all waves
      while (raidManager.activeRaid.currentWave < raidManager.activeRaid.waves.length) {
        raidManager.spawnNextWave();
      }

      const result = raidManager.spawnNextWave();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No more waves');
    });

    test('emits raid:waveSpawned event', () => {
      const listener = jest.fn();
      raidManager.on('raid:waveSpawned', listener);

      raidManager.spawnNextWave();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('updateRaidStats', () => {
    beforeEach(() => {
      raidManager.startRaid();
    });

    test('updates raid statistics', () => {
      raidManager.updateRaidStats({
        enemiesKilled: 5,
        damageToSettlement: 100
      });

      expect(raidManager.activeRaid.enemiesKilled).toBe(5);
      expect(raidManager.activeRaid.damageToSettlement).toBe(100);
    });

    test('does nothing when no active raid', () => {
      raidManager.activeRaid = null;

      expect(() => {
        raidManager.updateRaidStats({ enemiesKilled: 5 });
      }).not.toThrow();
    });
  });

  describe('completeRaid', () => {
    beforeEach(() => {
      raidManager.startRaid({ difficulty: 3 });
      raidManager.updateRaidStats({ enemiesKilled: 10 });
    });

    test('completes raid successfully', () => {
      const result = raidManager.completeRaid();

      expect(result.success).toBe(true);
      expect(result.raid.status).toBe('victory');
      expect(result.raid.endTime).toBeDefined();
      expect(result.rewards).toBeDefined();
    });

    test('calculates rewards', () => {
      const result = raidManager.completeRaid();

      expect(result.rewards.gold).toBeGreaterThan(0);
      expect(result.rewards.xp).toBeGreaterThan(0);
      expect(result.rewards.items).toBeGreaterThanOrEqual(0);
    });

    test('saves to history', () => {
      raidManager.completeRaid();

      expect(raidManager.raidHistory).toHaveLength(1);
      expect(raidManager.raidHistory[0].status).toBe('victory');
    });

    test('clears active raid', () => {
      raidManager.completeRaid();

      expect(raidManager.activeRaid).toBeNull();
    });

    test('schedules next raid', () => {
      raidManager.completeRaid();

      expect(raidManager.nextRaidTime).toBeGreaterThan(Date.now());
    });

    test('emits raid:completed event', () => {
      const listener = jest.fn();
      raidManager.on('raid:completed', listener);

      raidManager.completeRaid();

      expect(listener).toHaveBeenCalled();
    });

    test('fails when no active raid', () => {
      raidManager.activeRaid = null;

      const result = raidManager.completeRaid();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active raid');
    });
  });

  describe('failRaid', () => {
    beforeEach(() => {
      raidManager.startRaid({ difficulty: 3 });
      raidManager.updateRaidStats({ damageToSettlement: 200 });
    });

    test('fails raid successfully', () => {
      const result = raidManager.failRaid();

      expect(result.success).toBe(true);
      expect(result.raid.status).toBe('defeat');
      expect(result.raid.endTime).toBeDefined();
      expect(result.penalties).toBeDefined();
    });

    test('calculates penalties', () => {
      const result = raidManager.failRaid();

      expect(result.penalties.resourceLoss).toBeGreaterThan(0);
      expect(result.penalties.moraleDebuff).toBe(0.1);
    });

    test('saves to history', () => {
      raidManager.failRaid();

      expect(raidManager.raidHistory).toHaveLength(1);
      expect(raidManager.raidHistory[0].status).toBe('defeat');
    });

    test('clears active raid', () => {
      raidManager.failRaid();

      expect(raidManager.activeRaid).toBeNull();
    });

    test('schedules next raid', () => {
      raidManager.failRaid();

      expect(raidManager.nextRaidTime).toBeGreaterThan(Date.now());
    });

    test('emits raid:failed event', () => {
      const listener = jest.fn();
      raidManager.on('raid:failed', listener);

      raidManager.failRaid();

      expect(listener).toHaveBeenCalled();
    });

    test('fails when no active raid', () => {
      raidManager.activeRaid = null;

      const result = raidManager.failRaid();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active raid');
    });
  });

  describe('getActiveRaid', () => {
    test('returns active raid', () => {
      raidManager.startRaid();

      const raid = raidManager.getActiveRaid();

      expect(raid).toBeDefined();
      expect(raid.status).toBe('active');
    });

    test('returns null when no active raid', () => {
      const raid = raidManager.getActiveRaid();

      expect(raid).toBeNull();
    });
  });

  describe('getRaidHistory', () => {
    test('returns empty array initially', () => {
      const history = raidManager.getRaidHistory();

      expect(history).toEqual([]);
    });

    test('returns raid history', () => {
      raidManager.startRaid();
      raidManager.completeRaid();

      raidManager.startRaid();
      raidManager.failRaid();

      const history = raidManager.getRaidHistory();

      expect(history).toHaveLength(2);
      expect(history[0].status).toBe('victory');
      expect(history[1].status).toBe('defeat');
    });

    test('returns copy of history', () => {
      raidManager.startRaid();
      raidManager.completeRaid();

      const history1 = raidManager.getRaidHistory();
      const history2 = raidManager.getRaidHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe('getStatistics', () => {
    test('returns zero statistics initially', () => {
      const stats = raidManager.getStatistics();

      expect(stats.totalRaids).toBe(0);
      expect(stats.victories).toBe(0);
      expect(stats.defeats).toBe(0);
    });

    test('calculates statistics correctly', () => {
      // Victory
      raidManager.startRaid();
      raidManager.updateRaidStats({ enemiesKilled: 10 });
      raidManager.completeRaid();

      // Defeat
      raidManager.startRaid();
      raidManager.updateRaidStats({ damageToSettlement: 100, defendersKilled: ['npc1'] });
      raidManager.failRaid();

      const stats = raidManager.getStatistics();

      expect(stats.totalRaids).toBe(2);
      expect(stats.victories).toBe(1);
      expect(stats.defeats).toBe(1);
      expect(stats.totalEnemiesKilled).toBe(10);
      expect(stats.totalDamageToSettlement).toBe(100);
      expect(stats.totalDefendersKilled).toBe(1);
    });
  });

  describe('Integration', () => {
    test('complete raid flow', () => {
      // Schedule raid in the past so it triggers immediately
      raidManager.nextRaidTime = Date.now() - 1000;
      expect(raidManager.shouldTriggerRaid()).toBe(true);

      // Start
      const startResult = raidManager.startRaid({ difficulty: 2 });
      expect(startResult.success).toBe(true);

      // Spawn waves
      const wave1 = raidManager.spawnNextWave();
      expect(wave1.success).toBe(true);

      const wave2 = raidManager.spawnNextWave();
      expect(wave2.success).toBe(true);

      // Update stats
      raidManager.updateRaidStats({
        enemiesKilled: 15,
        damageToSettlement: 50
      });

      // Complete
      const completeResult = raidManager.completeRaid();
      expect(completeResult.success).toBe(true);
      expect(completeResult.rewards).toBeDefined();

      // Verify
      expect(raidManager.activeRaid).toBeNull();
      expect(raidManager.raidHistory).toHaveLength(1);
      expect(raidManager.nextRaidTime).toBeGreaterThan(Date.now());
    });
  });
});
