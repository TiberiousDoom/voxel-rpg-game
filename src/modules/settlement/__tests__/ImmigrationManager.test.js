/**
 * ImmigrationManager.test.js - Unit tests for NPC immigration system
 */

import ImmigrationManager from '../ImmigrationManager.js';
import {
  IMMIGRATION_CHECK_INTERVAL,
  IMMIGRATION_MIN_ATTRACTIVENESS,
  IMMIGRATION_MAX_CHANCE,
  IMMIGRATION_EVALUATION_TIME,
  NPC_MAX_POPULATION_PHASE_2,
} from '../../../data/tuning.js';

describe('ImmigrationManager', () => {
  let manager;
  let mockAttractiveness;
  let mockNpcManager;
  let mockTownManager;
  let mockSettlementModule;

  beforeEach(() => {
    mockAttractiveness = {
      getScore: vi.fn().mockReturnValue(0),
    };
    mockNpcManager = {
      getStatistics: vi.fn().mockReturnValue({ alive: 0, total: 0 }),
      npcs: new Map(),
      spawnNPC: vi.fn().mockReturnValue({ id: 'settler_1', name: 'Test Settler' }),
    };
    mockTownManager = {
      calculateHousingCapacity: vi.fn().mockReturnValue(0),
      getTownCenter: vi.fn().mockReturnValue({ x: 50, y: 0, z: 50 }),
    };
    mockSettlementModule = {
      emit: vi.fn(),
    };

    manager = new ImmigrationManager({
      attractivenessCalculator: mockAttractiveness,
      npcManager: mockNpcManager,
      townManager: mockTownManager,
      settlementModule: mockSettlementModule,
    });
  });

  describe('Initialization', () => {
    test('should initialize with zero state', () => {
      const stats = manager.getStatistics();
      expect(stats.totalArrivals).toBe(0);
      expect(stats.approachingCount).toBe(0);
      expect(stats.checksPerformed).toBe(0);
      expect(stats.checksSucceeded).toBe(0);
      expect(stats.firstSettlerArrived).toBe(false);
    });

    test('should handle missing dependencies', () => {
      const bare = new ImmigrationManager();
      const result = bare.update(1, {});
      expect(result.checked).toBe(false);
    });
  });

  describe('Immigration check timing', () => {
    test('should not check before interval elapses', () => {
      const result = manager.update(IMMIGRATION_CHECK_INTERVAL - 1, {});
      expect(result.checked).toBe(false);
    });

    test('should check when interval elapses', () => {
      const result = manager.update(IMMIGRATION_CHECK_INTERVAL, {});
      expect(result.checked).toBe(true);
    });

    test('should accumulate time across updates', () => {
      manager.update(IMMIGRATION_CHECK_INTERVAL / 2, {});
      const result = manager.update(IMMIGRATION_CHECK_INTERVAL / 2, {});
      expect(result.checked).toBe(true);
    });
  });

  describe('Immigration during rift attacks', () => {
    test('should skip immigration check during rift attack', () => {
      const result = manager.update(IMMIGRATION_CHECK_INTERVAL, { underRiftAttack: true });
      expect(result.checked).toBe(true);
      expect(result.arrived).toBe(false);
      // Check count incremented but no spawn
      expect(manager.getStatistics().checksSucceeded).toBe(0);
    });
  });

  describe('Population cap', () => {
    test('should not spawn when at population cap', () => {
      mockNpcManager.getStatistics.mockReturnValue({ alive: NPC_MAX_POPULATION_PHASE_2 });
      mockAttractiveness.getScore.mockReturnValue(100);

      // Force a check
      manager.update(IMMIGRATION_CHECK_INTERVAL, {});

      expect(manager.getStatistics().checksSucceeded).toBe(0);
    });
  });

  describe('Immigration chance calculation', () => {
    test('should return 0 chance below minimum attractiveness', () => {
      mockAttractiveness.getScore.mockReturnValue(IMMIGRATION_MIN_ATTRACTIVENESS - 1);

      // Use many attempts to verify no spawns happen
      vi.spyOn(Math, 'random').mockReturnValue(0); // Always succeed roll

      manager.update(IMMIGRATION_CHECK_INTERVAL, {});

      expect(manager.getStatistics().checksSucceeded).toBe(0);
      Math.random.mockRestore();
    });

    test('should cap chance at IMMIGRATION_MAX_CHANCE', () => {
      // Very high attractiveness
      mockAttractiveness.getScore.mockReturnValue(10000);

      // Set random just above max chance — should not pass
      vi.spyOn(Math, 'random').mockReturnValue(IMMIGRATION_MAX_CHANCE + 0.01);

      manager.update(IMMIGRATION_CHECK_INTERVAL, {});
      expect(manager.getStatistics().checksSucceeded).toBe(0);

      Math.random.mockRestore();
    });

    test('should succeed immigration roll with sufficient attractiveness', () => {
      mockAttractiveness.getScore.mockReturnValue(100);

      // Guarantee roll succeeds
      vi.spyOn(Math, 'random').mockReturnValue(0);

      manager.update(IMMIGRATION_CHECK_INTERVAL, {});
      expect(manager.getStatistics().checksSucceeded).toBe(1);

      Math.random.mockRestore();
    });
  });

  describe('Pioneer mechanic', () => {
    test('should allow first settler without housing', () => {
      mockAttractiveness.getScore.mockReturnValue(50);
      mockTownManager.calculateHousingCapacity.mockReturnValue(0);

      // Guarantee roll succeeds
      vi.spyOn(Math, 'random').mockReturnValue(0);

      // Trigger immigration check and spawn
      manager.update(IMMIGRATION_CHECK_INTERVAL, {});
      expect(manager.getStatistics().approachingCount).toBe(1);

      Math.random.mockRestore();
    });
  });

  describe('Approaching NPC lifecycle', () => {
    beforeEach(() => {
      mockAttractiveness.getScore.mockReturnValue(100);
      vi.spyOn(Math, 'random').mockReturnValue(0); // Guarantee success
    });

    afterEach(() => {
      Math.random.mockRestore();
    });

    test('should spawn NPC in APPROACHING state', () => {
      manager.update(IMMIGRATION_CHECK_INTERVAL, {});
      expect(manager.getStatistics().approachingCount).toBe(1);
      expect(mockSettlementModule.emit).toHaveBeenCalledWith(
        'npc:approaching',
        expect.objectContaining({ npcId: expect.any(String) })
      );
    });

    test('should transition to EVALUATING after travel time and then join', () => {
      manager.update(IMMIGRATION_CHECK_INTERVAL, {});
      expect(manager.getStatistics().approachingCount).toBe(1);

      // Simulate travel (30 seconds to arrive)
      manager.update(30, {});

      // NPC transitioned to EVALUATING; tick through evaluation time
      manager.update(IMMIGRATION_EVALUATION_TIME + 1, {});

      // First settler should have joined
      const stats = manager.getStatistics();
      expect(stats.totalArrivals).toBe(1);
    });

    test('should call spawnNPC on the npcManager when joining', () => {
      manager.update(IMMIGRATION_CHECK_INTERVAL, {});
      // Travel + evaluation
      manager.update(30, {});
      manager.update(IMMIGRATION_EVALUATION_TIME + 1, {});

      expect(mockNpcManager.spawnNPC).toHaveBeenCalled();
    });

    test('should emit npc:joined event when NPC joins', () => {
      manager.update(IMMIGRATION_CHECK_INTERVAL, {});
      manager.update(30, {});
      manager.update(IMMIGRATION_EVALUATION_TIME + 1, {});

      expect(mockSettlementModule.emit).toHaveBeenCalledWith(
        'npc:joined',
        expect.objectContaining({
          totalArrivals: 1,
        })
      );
    });
  });

  describe('Serialization', () => {
    test('should serialize and deserialize state', () => {
      mockAttractiveness.getScore.mockReturnValue(100);
      vi.spyOn(Math, 'random').mockReturnValue(0);

      // Create some state
      manager.update(IMMIGRATION_CHECK_INTERVAL, {});

      const serialized = manager.serialize();
      expect(serialized.totalArrivals).toBeDefined();
      expect(serialized.checksPerformed).toBeDefined();
      expect(serialized.approachingNPCs).toBeDefined();

      // Create fresh manager and restore
      const newManager = new ImmigrationManager({
        attractivenessCalculator: mockAttractiveness,
        npcManager: mockNpcManager,
        townManager: mockTownManager,
      });
      newManager.deserialize(serialized);

      expect(newManager.getStatistics().checksPerformed).toBe(
        manager.getStatistics().checksPerformed
      );

      Math.random.mockRestore();
    });

    test('should handle null state in deserialize', () => {
      expect(() => manager.deserialize(null)).not.toThrow();
    });
  });
});
