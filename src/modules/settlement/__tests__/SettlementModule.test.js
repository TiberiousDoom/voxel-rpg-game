/**
 * SettlementModule.test.js - Unit tests for the settlement module coordinator
 */

import SettlementModule from '../SettlementModule.js';

describe('SettlementModule', () => {
  let module;
  let mockDeps;

  beforeEach(() => {
    mockDeps = {
      npcManager: {
        getStatistics: jest.fn().mockReturnValue({ alive: 0, total: 0 }),
        npcs: new Map(),
        spawnNPC: jest.fn().mockReturnValue({ id: 'npc_1', name: 'Test' }),
      },
      storage: {
        getResource: jest.fn().mockReturnValue(0),
      },
      townManager: {
        calculateHousingCapacity: jest.fn().mockReturnValue(0),
        getTownCenter: jest.fn().mockReturnValue({ x: 50, y: 0, z: 50 }),
      },
      grid: {},
      buildingConfig: {
        getConfig: jest.fn().mockReturnValue({ tier: 'SURVIVAL' }),
      },
      territoryManager: {},
    };

    module = new SettlementModule(mockDeps);
  });

  describe('Initialization', () => {
    test('should not be initialized before initialize() is called', () => {
      expect(module.initialized).toBe(false);
      expect(module.attractivenessCalculator).toBeNull();
      expect(module.immigrationManager).toBeNull();
    });

    test('should create sub-managers on initialize()', () => {
      module.initialize();

      expect(module.initialized).toBe(true);
      expect(module.attractivenessCalculator).not.toBeNull();
      expect(module.immigrationManager).not.toBeNull();
    });

    test('should not double-initialize', () => {
      module.initialize();
      const calc = module.attractivenessCalculator;

      module.initialize();
      expect(module.attractivenessCalculator).toBe(calc);
    });
  });

  describe('Update tick', () => {
    beforeEach(() => {
      module.initialize();
    });

    test('should return null settlement result when not initialized', () => {
      const uninitModule = new SettlementModule(mockDeps);
      const result = uninitModule.update(16, {});
      expect(result.settlement).toBeNull();
    });

    test('should increment tick count', () => {
      module.update(16, { buildings: [] });
      module.update(16, { buildings: [] });
      module.update(16, { buildings: [] });

      expect(module.tickCount).toBe(3);
    });

    test('should accumulate elapsed time', () => {
      module.update(1000, { buildings: [] }); // 1 second
      module.update(500, { buildings: [] });  // 0.5 seconds

      expect(module.elapsedTime).toBeCloseTo(1.5);
    });

    test('should return attractiveness score in result', () => {
      const result = module.update(16, {
        buildings: [{ type: 'CAMPFIRE', status: 'COMPLETE' }],
      });

      expect(result.settlement.attractiveness).toBeGreaterThan(0);
    });

    test('should return immigration result', () => {
      const result = module.update(16, { buildings: [] });
      expect(result.settlement.immigration).toBeDefined();
      expect(result.settlement.immigration.checked).toBeDefined();
    });

    test('should catch and report errors', () => {
      // Force an error by making attractivenessCalculator throw
      module.attractivenessCalculator.recalculate = () => {
        throw new Error('test error');
      };

      const result = module.update(16, { buildings: [] });
      expect(result.settlement.errors).toContain('test error');
    });
  });

  describe('Event system', () => {
    test('should emit events to listeners', () => {
      const listener = jest.fn();
      module.on('test:event', listener);

      module.emit('test:event', { foo: 'bar' });

      expect(listener).toHaveBeenCalledWith({ foo: 'bar' });
    });

    test('should support multiple listeners for same event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      module.on('test', listener1);
      module.on('test', listener2);

      module.emit('test', {});

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    test('should not throw when emitting event with no listeners', () => {
      expect(() => module.emit('no:listeners', {})).not.toThrow();
    });

    test('should catch listener errors without breaking', () => {
      module.on('test', () => { throw new Error('bad listener'); });
      module.on('test', jest.fn());

      // Should not throw
      expect(() => module.emit('test', {})).not.toThrow();
    });
  });

  describe('Serialization', () => {
    beforeEach(() => {
      module.initialize();
    });

    test('should serialize state', () => {
      module.update(16, { buildings: [] });

      const state = module.serialize();

      expect(state.tickCount).toBe(1);
      expect(state.elapsedTime).toBeGreaterThan(0);
      expect(state.immigration).toBeDefined();
      expect(typeof state.attractiveness).toBe('number');
    });

    test('should restore from serialized state', () => {
      module.update(16, { buildings: [] });
      module.update(16, { buildings: [] });

      const state = module.serialize();

      const newModule = new SettlementModule(mockDeps);
      newModule.initialize();
      newModule.deserialize(state);

      expect(newModule.tickCount).toBe(2);
    });

    test('should handle null state in deserialize', () => {
      expect(() => module.deserialize(null)).not.toThrow();
    });
  });

  describe('Statistics', () => {
    test('should return statistics before initialization', () => {
      const uninitModule = new SettlementModule(mockDeps);
      const stats = uninitModule.getStatistics();

      expect(stats.initialized).toBe(false);
      expect(stats.tickCount).toBe(0);
    });

    test('should return statistics after initialization', () => {
      module.initialize();
      module.update(16, { buildings: [] });

      const stats = module.getStatistics();

      expect(stats.initialized).toBe(true);
      expect(stats.tickCount).toBe(1);
      expect(typeof stats.attractiveness).toBe('number');
      expect(stats.immigration).toBeDefined();
    });
  });
});
