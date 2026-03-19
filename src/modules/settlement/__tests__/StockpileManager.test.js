/**
 * StockpileManager.test.js - Tests for physical stockpile system
 */

import StockpileManager from '../StockpileManager.js';
import { ZONE_TYPES } from '../ZoneManager.js';
import { STOCKPILE_STACK_LIMIT } from '../../../data/tuning.js';

describe('StockpileManager', () => {
  let stockpile;
  let mockZoneManager;
  let mockStorage;
  let mockSettlementModule;

  const stockpileZone = {
    id: 'zone_1',
    type: ZONE_TYPES.STOCKPILE,
    active: true,
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 1, z: 3 } },
  };

  beforeEach(() => {
    mockSettlementModule = { emit: jest.fn() };
    mockStorage = {
      addResource: jest.fn(),
      removeResource: jest.fn(),
    };
    mockZoneManager = {
      getZone: jest.fn((id) => (id === 'zone_1' ? stockpileZone : null)),
    };

    stockpile = new StockpileManager({
      zoneManager: mockZoneManager,
      storage: mockStorage,
      settlementModule: mockSettlementModule,
    });
  });

  // ── Initialization ─────────────────────────────────────────

  describe('Initialization', () => {
    test('should initialize slots for a stockpile zone', () => {
      stockpile.onZoneCreated(stockpileZone);

      const contents = stockpile.getStockpileContents('zone_1');
      expect(contents).not.toBeNull();
      expect(contents.totalSlots).toBe(9); // 3x3 ground area
      expect(contents.usedSlots).toBe(0);
    });

    test('should ignore non-stockpile zones', () => {
      stockpile.onZoneCreated({
        ...stockpileZone,
        type: ZONE_TYPES.MINING,
      });
      expect(stockpile.getStockpileContents('zone_1')).toBeNull();
    });
  });

  // ── Deposit ────────────────────────────────────────────────

  describe('Deposit', () => {
    beforeEach(() => {
      stockpile.onZoneCreated(stockpileZone);
    });

    test('should deposit resources into empty slot', () => {
      const result = stockpile.deposit('zone_1', 'wood', 10);

      expect(result.success).toBe(true);
      expect(result.deposited).toBe(10);

      const contents = stockpile.getStockpileContents('zone_1');
      expect(contents.contents.wood).toBe(10);
      expect(contents.usedSlots).toBe(1);
    });

    test('should stack resources in existing slot', () => {
      stockpile.deposit('zone_1', 'wood', 30);
      stockpile.deposit('zone_1', 'wood', 20);

      const contents = stockpile.getStockpileContents('zone_1');
      expect(contents.contents.wood).toBe(50);
      expect(contents.usedSlots).toBe(1); // same slot
    });

    test('should overflow to new slot when stack limit reached', () => {
      stockpile.deposit('zone_1', 'wood', STOCKPILE_STACK_LIMIT);
      stockpile.deposit('zone_1', 'wood', 10);

      const contents = stockpile.getStockpileContents('zone_1');
      expect(contents.contents.wood).toBe(STOCKPILE_STACK_LIMIT + 10);
      expect(contents.usedSlots).toBe(2);
    });

    test('should fail when stockpile is full', () => {
      // Fill all 9 slots
      for (let i = 0; i < 9; i++) {
        stockpile.deposit('zone_1', `resource_${i}`, STOCKPILE_STACK_LIMIT);
      }

      const result = stockpile.deposit('zone_1', 'extra', 1);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/full/i);
    });

    test('should sync with global storage on deposit', () => {
      stockpile.deposit('zone_1', 'wood', 10);
      expect(mockStorage.addResource).toHaveBeenCalledWith('wood', 10);
    });

    test('should emit deposit event', () => {
      stockpile.deposit('zone_1', 'wood', 10);
      expect(mockSettlementModule.emit).toHaveBeenCalledWith(
        'stockpile:deposit',
        expect.objectContaining({
          stockpileId: 'zone_1',
          resourceType: 'wood',
          quantity: 10,
        })
      );
    });

    test('should reject invalid quantity', () => {
      const result = stockpile.deposit('zone_1', 'wood', 0);
      expect(result.success).toBe(false);
    });

    test('should reject deposits not matching filter', () => {
      stockpile.setFilter('zone_1', 'stone');
      const result = stockpile.deposit('zone_1', 'wood', 10);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/only accepts/);
    });
  });

  // ── Withdraw ───────────────────────────────────────────────

  describe('Withdraw', () => {
    beforeEach(() => {
      stockpile.onZoneCreated(stockpileZone);
      stockpile.deposit('zone_1', 'wood', 50);
    });

    test('should withdraw resources', () => {
      const result = stockpile.withdraw('zone_1', 'wood', 20);
      expect(result.success).toBe(true);
      expect(result.withdrawn).toBe(20);

      const contents = stockpile.getStockpileContents('zone_1');
      expect(contents.contents.wood).toBe(30);
    });

    test('should withdraw partial amount if insufficient', () => {
      const result = stockpile.withdraw('zone_1', 'wood', 100);
      expect(result.success).toBe(true);
      expect(result.withdrawn).toBe(50);
    });

    test('should clear slot when emptied', () => {
      stockpile.withdraw('zone_1', 'wood', 50);
      const contents = stockpile.getStockpileContents('zone_1');
      expect(contents.usedSlots).toBe(0);
    });

    test('should fail when resource not available', () => {
      const result = stockpile.withdraw('zone_1', 'stone', 10);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No stone/);
    });

    test('should sync with global storage on withdraw', () => {
      stockpile.withdraw('zone_1', 'wood', 10);
      expect(mockStorage.removeResource).toHaveBeenCalledWith('wood', 10);
    });
  });

  // ── Reservation ────────────────────────────────────────────

  describe('Reservation', () => {
    beforeEach(() => {
      stockpile.onZoneCreated(stockpileZone);
    });

    test('should reserve a slot', () => {
      const result = stockpile.reserve('zone_1', 0, 'npc_1');
      expect(result.success).toBe(true);
    });

    test('should not allow double reservation', () => {
      stockpile.reserve('zone_1', 0, 'npc_1');
      const result = stockpile.reserve('zone_1', 0, 'npc_2');
      expect(result.success).toBe(false);
    });

    test('should skip reserved slots during deposit', () => {
      stockpile.reserve('zone_1', 0, 'npc_1');
      stockpile.deposit('zone_1', 'wood', 10);

      // Wood should go to slot 1, not slot 0
      const contents = stockpile.getStockpileContents('zone_1');
      expect(contents.contents.wood).toBe(10);
    });

    test('should release a reservation', () => {
      stockpile.reserve('zone_1', 0, 'npc_1');
      stockpile.release('zone_1', 0);

      const result = stockpile.reserve('zone_1', 0, 'npc_2');
      expect(result.success).toBe(true);
    });
  });

  // ── Queries ────────────────────────────────────────────────

  describe('Queries', () => {
    beforeEach(() => {
      stockpile.onZoneCreated(stockpileZone);
      stockpile.deposit('zone_1', 'wood', 30);
      stockpile.deposit('zone_1', 'stone', 20);
    });

    test('should get total resource across stockpiles', () => {
      expect(stockpile.getTotalResource('wood')).toBe(30);
      expect(stockpile.getTotalResource('stone')).toBe(20);
      expect(stockpile.getTotalResource('gold')).toBe(0);
    });

    test('should find nearest stockpile with space', () => {
      const result = stockpile.findNearestWithSpace(
        { x: 5, y: 0, z: 5 },
        'iron'
      );
      expect(result).not.toBeNull();
      expect(result.stockpileId).toBe('zone_1');
      expect(result.distance).toBeGreaterThan(0);
    });

    test('should find nearest stockpile with specific resource', () => {
      const result = stockpile.findNearestWithResource(
        { x: 5, y: 0, z: 5 },
        'wood',
        10
      );
      expect(result).not.toBeNull();
      expect(result.stockpileId).toBe('zone_1');
    });

    test('should return null when no stockpile has the resource', () => {
      const result = stockpile.findNearestWithResource(
        { x: 5, y: 0, z: 5 },
        'gold',
        1
      );
      expect(result).toBeNull();
    });

    test('should get all contents summary', () => {
      const all = stockpile.getAllContents();
      expect(all.zone_1).toBeDefined();
      expect(all.zone_1.contents.wood).toBe(30);
    });
  });

  // ── Filter ─────────────────────────────────────────────────

  describe('Filter', () => {
    beforeEach(() => {
      stockpile.onZoneCreated(stockpileZone);
    });

    test('should accept all resources when filter is null', () => {
      expect(stockpile.deposit('zone_1', 'wood', 10).success).toBe(true);
      expect(stockpile.deposit('zone_1', 'stone', 10).success).toBe(true);
    });

    test('should only accept filtered resource when filter set', () => {
      stockpile.setFilter('zone_1', 'wood');
      expect(stockpile.deposit('zone_1', 'wood', 10).success).toBe(true);
      expect(stockpile.deposit('zone_1', 'stone', 10).success).toBe(false);
    });
  });

  // ── Zone Deletion ──────────────────────────────────────────

  describe('Zone deletion', () => {
    test('should remove stockpile data when zone deleted', () => {
      stockpile.onZoneCreated(stockpileZone);
      stockpile.deposit('zone_1', 'wood', 10);

      stockpile.onZoneDeleted({ id: 'zone_1', type: ZONE_TYPES.STOCKPILE });

      expect(stockpile.getStockpileContents('zone_1')).toBeNull();
    });
  });

  // ── Serialization ──────────────────────────────────────────

  describe('Serialization', () => {
    test('should round-trip serialize/deserialize', () => {
      stockpile.onZoneCreated(stockpileZone);
      stockpile.deposit('zone_1', 'wood', 30);
      stockpile.deposit('zone_1', 'stone', 20);
      stockpile.setFilter('zone_1', 'wood');

      const state = stockpile.serialize();

      const stockpile2 = new StockpileManager({
        zoneManager: mockZoneManager,
        storage: mockStorage,
        settlementModule: mockSettlementModule,
      });
      stockpile2.deserialize(state);

      const contents = stockpile2.getStockpileContents('zone_1');
      expect(contents.contents.wood).toBe(30);
      expect(contents.contents.stone).toBe(20);
      expect(contents.filter).toBe('wood');
    });

    test('should not persist reservations', () => {
      stockpile.onZoneCreated(stockpileZone);
      stockpile.reserve('zone_1', 0, 'npc_1');

      const state = stockpile.serialize();

      const stockpile2 = new StockpileManager({
        zoneManager: mockZoneManager,
        storage: mockStorage,
        settlementModule: mockSettlementModule,
      });
      stockpile2.deserialize(state);

      // Should be able to reserve slot 0 (not preserved)
      const result = stockpile2.reserve('zone_1', 0, 'npc_2');
      expect(result.success).toBe(true);
    });
  });
});
