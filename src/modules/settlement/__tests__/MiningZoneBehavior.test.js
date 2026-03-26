/**
 * MiningZoneBehavior.test.js - Tests for mining zone task generation and management
 */

import MiningZoneBehavior, { MINING_TASK_STATUS } from '../MiningZoneBehavior.js';
import { ZONE_TYPES } from '../ZoneManager.js';

describe('MiningZoneBehavior', () => {
  let mining;
  let mockZoneManager;
  let mockGrid;
  let mockSettlementModule;

  // Simple 3x1x3 block grid (all stone, one ore)
  const makeGrid = () => {
    const blocks = {};
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        blocks[`${x},0,${z}`] = 'stone';
      }
    }
    blocks['1,0,1'] = 'iron_ore';
    return {
      getBlockAt: (x, y, z) => blocks[`${x},${y},${z}`] || null,
    };
  };

  beforeEach(() => {
    mockGrid = makeGrid();
    mockSettlementModule = { emit: vi.fn() };
    mockZoneManager = {
      getZone: vi.fn((id) => ({
        id,
        type: ZONE_TYPES.MINING,
        active: true,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      })),
      getActiveZonesByType: vi.fn(() => []),
    };

    mining = new MiningZoneBehavior({
      zoneManager: mockZoneManager,
      grid: mockGrid,
      settlementModule: mockSettlementModule,
    });
  });

  // ── Task Generation ────────────────────────────────────────

  describe('Task generation', () => {
    test('should generate tasks when mining zone is created', () => {
      const zone = {
        id: 'zone_1',
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      };

      mining.onZoneCreated(zone);

      const tasks = mining.getAvailableTasks();
      expect(tasks.length).toBe(9); // 3x3 grid, all solid blocks
    });

    test('should ignore non-mining zones', () => {
      const zone = {
        id: 'zone_1',
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      };

      mining.onZoneCreated(zone);

      const tasks = mining.getAvailableTasks();
      expect(tasks.length).toBe(0);
    });

    test('should prioritize ore blocks over stone', () => {
      const zone = {
        id: 'zone_1',
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      };

      mining.onZoneCreated(zone);

      const tasks = mining.getAvailableTasks();
      // Iron ore should be first (highest priority)
      expect(tasks[0].blockType).toBe('iron_ore');
    });

    test('should track zone progress', () => {
      const zone = {
        id: 'zone_1',
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      };

      mining.onZoneCreated(zone);

      const progress = mining.getZoneProgress('zone_1');
      expect(progress).not.toBeNull();
      expect(progress.totalBlocks).toBe(9);
      expect(progress.minedBlocks).toBe(0);
    });
  });

  // ── Task Claiming ──────────────────────────────────────────

  describe('Task claiming', () => {
    let taskId;

    beforeEach(() => {
      mining.onZoneCreated({
        id: 'zone_1',
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      });
      taskId = mining.getAvailableTasks()[0].id;
    });

    test('should claim an available task', () => {
      const result = mining.claimTask(taskId, 'npc_1');
      expect(result.success).toBe(true);
    });

    test('should not allow double-claiming', () => {
      mining.claimTask(taskId, 'npc_1');
      const result = mining.claimTask(taskId, 'npc_2');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already claimed/);
    });

    test('claimed tasks should not appear in available list', () => {
      mining.claimTask(taskId, 'npc_1');
      const available = mining.getAvailableTasks();
      expect(available.find(t => t.id === taskId)).toBeUndefined();
    });

    test('should release a claimed task', () => {
      mining.claimTask(taskId, 'npc_1');
      mining.releaseTask(taskId);

      const available = mining.getAvailableTasks();
      expect(available.find(t => t.id === taskId)).toBeDefined();
    });
  });

  // ── Task Completion ────────────────────────────────────────

  describe('Task completion', () => {
    test('should complete a task and update progress', () => {
      mining.onZoneCreated({
        id: 'zone_1',
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      });

      const taskId = mining.getAvailableTasks()[0].id;
      mining.claimTask(taskId, 'npc_1');
      const result = mining.completeTask(taskId);

      expect(result).not.toBeNull();
      expect(result.blockType).toBeDefined();
      expect(result.position).toBeDefined();
      expect(result.zoneId).toBe('zone_1');

      const progress = mining.getZoneProgress('zone_1');
      expect(progress.minedBlocks).toBe(1);
    });

    test('should emit event on block mined', () => {
      mining.onZoneCreated({
        id: 'zone_1',
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      });

      const taskId = mining.getAvailableTasks()[0].id;
      mining.claimTask(taskId, 'npc_1');
      mining.completeTask(taskId);

      expect(mockSettlementModule.emit).toHaveBeenCalledWith(
        'mining:block-mined',
        expect.objectContaining({ zoneId: 'zone_1' })
      );
    });
  });

  // ── Zone Deletion ──────────────────────────────────────────

  describe('Zone deletion', () => {
    test('should remove all tasks when zone deleted', () => {
      mining.onZoneCreated({
        id: 'zone_1',
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      });

      expect(mining.getAvailableTasks().length).toBe(9);

      mining.onZoneDeleted({ id: 'zone_1', type: ZONE_TYPES.MINING });

      expect(mining.getAvailableTasks().length).toBe(0);
      expect(mining.getZoneProgress('zone_1')).toBeNull();
    });
  });

  // ── Mine Time Calculation ──────────────────────────────────

  describe('Mine time calculation', () => {
    test('should calculate mine time based on skill', () => {
      const time1 = mining.getMineTime(1);
      const time2 = mining.getMineTime(3);
      // Higher skill = faster mining
      expect(time2).toBeLessThan(time1);
    });

    test('should handle zero skill', () => {
      const time = mining.getMineTime(0);
      expect(time).toBeGreaterThan(0);
      expect(isFinite(time)).toBe(true);
    });
  });

  // ── Serialization ──────────────────────────────────────────

  describe('Serialization', () => {
    test('should round-trip serialize/deserialize', () => {
      mining.onZoneCreated({
        id: 'zone_1',
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
      });

      const taskId = mining.getAvailableTasks()[0].id;
      mining.claimTask(taskId, 'npc_1');
      mining.completeTask(taskId);

      const state = mining.serialize();

      const mining2 = new MiningZoneBehavior({
        zoneManager: mockZoneManager,
        grid: mockGrid,
        settlementModule: mockSettlementModule,
      });
      mining2.deserialize(state);

      expect(mining2.tasks.size).toBe(mining.tasks.size);
      const progress = mining2.getZoneProgress('zone_1');
      expect(progress.minedBlocks).toBe(1);
    });
  });
});
