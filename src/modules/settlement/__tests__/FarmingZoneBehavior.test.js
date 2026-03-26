/**
 * FarmingZoneBehavior.test.js - Tests for farming zone behavior
 */

import FarmingZoneBehavior, { FARM_TILE_STATUS, FARM_TASK_TYPE } from '../FarmingZoneBehavior.js';
import { ZONE_TYPES } from '../ZoneManager.js';
import { FARM_GROW_TIME, FARM_HARVEST_YIELD } from '../../../data/tuning.js';

describe('FarmingZoneBehavior', () => {
  let farming;
  let mockZoneManager;
  let mockSettlementModule;

  const farmZone = {
    id: 'zone_1',
    type: ZONE_TYPES.FARMING,
    active: true,
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
  };

  beforeEach(() => {
    mockSettlementModule = { emit: vi.fn() };
    mockZoneManager = {
      getZone: vi.fn((id) => (id === 'zone_1' ? farmZone : null)),
    };

    farming = new FarmingZoneBehavior({
      zoneManager: mockZoneManager,
      settlementModule: mockSettlementModule,
    });
  });

  // ── Initialization ─────────────────────────────────────────

  describe('Zone initialization', () => {
    test('should initialize tiles for farming zone', () => {
      farming.onZoneCreated(farmZone);

      const status = farming.getZoneStatus('zone_1');
      expect(status).not.toBeNull();
      expect(status.totalTiles).toBe(9); // 3x3
      expect(status.empty).toBe(9);
    });

    test('should ignore non-farming zones', () => {
      farming.onZoneCreated({
        ...farmZone,
        type: ZONE_TYPES.MINING,
      });

      expect(farming.getZoneStatus('zone_1')).toBeNull();
    });

    test('should generate PLANT tasks for empty tiles', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0); // trigger task generation

      const tasks = farming.getAvailableTasks();
      expect(tasks.length).toBe(9);
      expect(tasks.every(t => t.type === FARM_TASK_TYPE.PLANT)).toBe(true);
    });
  });

  // ── Farm Lifecycle ─────────────────────────────────────────

  describe('Farm lifecycle', () => {
    test('should progress from EMPTY → PLANTED → GROWING when plant task completed', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      const task = farming.getAvailableTasks()[0];
      farming.claimTask(task.id, 'npc_1');
      const result = farming.completeTask(task.id);

      expect(result.type).toBe('PLANT');
      expect(mockSettlementModule.emit).toHaveBeenCalledWith(
        'farming:planted',
        expect.objectContaining({ type: 'PLANT' })
      );

      const status = farming.getZoneStatus('zone_1');
      expect(status.growing).toBe(1);
      expect(status.empty).toBe(8);
    });

    test('should progress from GROWING → READY after grow time', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      // Plant one tile
      const task = farming.getAvailableTasks()[0];
      farming.claimTask(task.id, 'npc_1');
      farming.completeTask(task.id);

      // Advance time past grow period
      farming.update(FARM_GROW_TIME + 1);

      const status = farming.getZoneStatus('zone_1');
      expect(status.ready).toBe(1);
      expect(status.growing).toBe(0);
    });

    test('should generate HARVEST task for READY tiles', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      // Plant one tile
      const plantTask = farming.getAvailableTasks()[0];
      farming.claimTask(plantTask.id, 'npc_1');
      farming.completeTask(plantTask.id);

      // Advance time to make it ready
      farming.update(FARM_GROW_TIME + 1);

      const tasks = farming.getAvailableTasks();
      const harvestTasks = tasks.filter(t => t.type === FARM_TASK_TYPE.HARVEST);
      expect(harvestTasks.length).toBe(1);
    });

    test('should yield food when harvest completed', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      // Plant
      const plantTask = farming.getAvailableTasks()[0];
      farming.claimTask(plantTask.id, 'npc_1');
      farming.completeTask(plantTask.id);

      // Grow
      farming.update(FARM_GROW_TIME + 1);

      // Harvest
      const harvestTask = farming.getAvailableTasks().find(t => t.type === FARM_TASK_TYPE.HARVEST);
      farming.claimTask(harvestTask.id, 'npc_1');
      const result = farming.completeTask(harvestTask.id);

      expect(result.type).toBe('HARVEST');
      expect(result.yield).toBe(FARM_HARVEST_YIELD);
    });
  });

  // ── Unattended Auto-Collection ─────────────────────────────

  describe('Unattended farming', () => {
    test('should auto-collect at reduced rate when no farmer assigned', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      // Plant a tile
      const plantTask = farming.getAvailableTasks()[0];
      farming.claimTask(plantTask.id, 'npc_1');
      farming.completeTask(plantTask.id);

      // Grow to READY
      farming.update(FARM_GROW_TIME + 1);

      // Wait another grow cycle (no farmer assigned → auto-collect triggers)
      farming.update(FARM_GROW_TIME + 1);

      expect(mockSettlementModule.emit).toHaveBeenCalledWith(
        'farming:auto-harvest',
        expect.objectContaining({
          zoneId: 'zone_1',
        })
      );
    });
  });

  // ── Task Claiming ──────────────────────────────────────────

  describe('Task claiming', () => {
    test('should enforce max farmers per zone', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      const tasks = farming.getAvailableTasks();

      // Claim tasks up to limit
      farming.claimTask(tasks[0].id, 'npc_1');
      farming.claimTask(tasks[1].id, 'npc_2');

      // Third farmer should be rejected
      const result = farming.claimTask(tasks[2].id, 'npc_3');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Maximum farmers/);
    });

    test('should release task on failure', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      const task = farming.getAvailableTasks()[0];
      farming.claimTask(task.id, 'npc_1');
      farming.releaseTask(task.id);

      // Task should be available again
      const available = farming.getAvailableTasks();
      expect(available.find(t => t.id === task.id)).toBeDefined();
    });

    test('harvest tasks should have higher priority than plant tasks', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      // Plant a tile and grow it
      const plantTask = farming.getAvailableTasks()[0];
      farming.claimTask(plantTask.id, 'npc_1');
      farming.completeTask(plantTask.id);
      farming.update(FARM_GROW_TIME + 1);

      const tasks = farming.getAvailableTasks();
      // First task should be HARVEST
      expect(tasks[0].type).toBe(FARM_TASK_TYPE.HARVEST);
    });
  });

  // ── Zone Deletion ──────────────────────────────────────────

  describe('Zone deletion', () => {
    test('should remove all tiles and tasks when zone deleted', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      expect(farming.getAvailableTasks().length).toBe(9);

      farming.onZoneDeleted({ id: 'zone_1', type: ZONE_TYPES.FARMING });

      expect(farming.getAvailableTasks().length).toBe(0);
      expect(farming.getZoneStatus('zone_1')).toBeNull();
    });
  });

  // ── Serialization ──────────────────────────────────────────

  describe('Serialization', () => {
    test('should round-trip serialize/deserialize', () => {
      farming.onZoneCreated(farmZone);
      farming.update(0);

      // Plant a tile
      const task = farming.getAvailableTasks()[0];
      farming.claimTask(task.id, 'npc_1');
      farming.completeTask(task.id);

      const state = farming.serialize();

      const farming2 = new FarmingZoneBehavior({
        zoneManager: mockZoneManager,
        settlementModule: mockSettlementModule,
      });
      farming2.deserialize(state);

      const status = farming2.getZoneStatus('zone_1');
      expect(status.totalTiles).toBe(9);
      expect(status.growing).toBe(1);
    });
  });
});
