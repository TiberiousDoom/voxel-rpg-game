/**
 * ZoneManager.test.js - Unit tests for zone designation system
 */

import ZoneManager, { ZONE_TYPES, MAX_ZONES_PER_TYPE } from '../ZoneManager.js';

describe('ZoneManager', () => {
  let zoneManager;
  let mockSettlementModule;

  beforeEach(() => {
    mockSettlementModule = {
      emit: jest.fn(),
    };
    zoneManager = new ZoneManager({
      grid: {},
      settlementModule: mockSettlementModule,
    });
  });

  // ── Create / Delete ─────────────────────────────────────────

  describe('Create and delete zones', () => {
    test('should create a zone with valid params', () => {
      const result = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      expect(result.success).toBe(true);
      expect(result.zone).toBeDefined();
      expect(result.zone.type).toBe(ZONE_TYPES.MINING);
      expect(result.zone.active).toBe(true);
      expect(result.zone.priority).toBe(3); // default
    });

    test('should reject invalid zone type', () => {
      const result = zoneManager.createZone({
        type: 'INVALID',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid zone type/);
    });

    test('should reject missing bounds', () => {
      const result = zoneManager.createZone({ type: ZONE_TYPES.MINING });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Bounds/);
    });

    test('should normalize bounds so min < max', () => {
      const result = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 10, y: 5, z: 10 }, max: { x: 0, y: 0, z: 0 } },
      });

      expect(result.success).toBe(true);
      expect(result.zone.bounds.min).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.zone.bounds.max).toEqual({ x: 10, y: 5, z: 10 });
    });

    test('should clamp priority to 1-5', () => {
      const r1 = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
        priority: 0,
      });
      expect(r1.zone.priority).toBe(1);

      const r2 = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 10, y: 0, z: 0 }, max: { x: 15, y: 5, z: 5 } },
        priority: 99,
      });
      expect(r2.zone.priority).toBe(5);
    });

    test('should delete a zone by ID', () => {
      const { zone } = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });

      const result = zoneManager.deleteZone(zone.id);
      expect(result.success).toBe(true);
      expect(zoneManager.getZone(zone.id)).toBeNull();
    });

    test('should return error when deleting non-existent zone', () => {
      const result = zoneManager.deleteZone('zone_999');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/);
    });

    test('should emit events on create and delete', () => {
      const { zone } = zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });
      expect(mockSettlementModule.emit).toHaveBeenCalledWith('zone:created', { zone });

      zoneManager.deleteZone(zone.id);
      expect(mockSettlementModule.emit).toHaveBeenCalledWith('zone:deleted', { zone });
    });

    test('should auto-generate a label if none provided', () => {
      const { zone } = zoneManager.createZone({
        type: ZONE_TYPES.FARMING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });
      expect(zone.label).toBeTruthy();
      expect(zone.label).toContain('Farming');
    });
  });

  // ── Overlap Detection ───────────────────────────────────────

  describe('Overlap detection', () => {
    test('should reject overlapping STOCKPILE zones', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      const result = zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 5, y: 0, z: 5 }, max: { x: 15, y: 5, z: 15 } },
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/cannot overlap/);
    });

    test('should reject overlapping FARMING zones', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.FARMING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      const result = zoneManager.createZone({
        type: ZONE_TYPES.FARMING,
        bounds: { min: { x: 5, y: 0, z: 5 }, max: { x: 15, y: 5, z: 15 } },
      });

      expect(result.success).toBe(false);
    });

    test('should allow overlapping MINING zones', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      const result = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 5, y: 0, z: 5 }, max: { x: 15, y: 5, z: 15 } },
      });

      expect(result.success).toBe(true);
    });

    test('should allow non-overlapping STOCKPILE zones', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });

      const result = zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 10, y: 0, z: 10 }, max: { x: 15, y: 5, z: 15 } },
      });

      expect(result.success).toBe(true);
    });

    test('should allow different zone types to overlap', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      const result = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      expect(result.success).toBe(true);
    });
  });

  // ── Query by Type ───────────────────────────────────────────

  describe('Query zones by type', () => {
    beforeEach(() => {
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 10, y: 0, z: 0 }, max: { x: 15, y: 5, z: 5 } },
      });
      zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 20, y: 0, z: 0 }, max: { x: 25, y: 5, z: 5 } },
      });
    });

    test('should return all zones when no type filter', () => {
      expect(zoneManager.getZones()).toHaveLength(3);
    });

    test('should filter zones by type', () => {
      expect(zoneManager.getZones(ZONE_TYPES.MINING)).toHaveLength(2);
      expect(zoneManager.getZones(ZONE_TYPES.STOCKPILE)).toHaveLength(1);
      expect(zoneManager.getZones(ZONE_TYPES.FARMING)).toHaveLength(0);
    });
  });

  // ── Query by Position ───────────────────────────────────────

  describe('Query zones containing position', () => {
    test('should find zones at a given position', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
        priority: 5,
      });
      zoneManager.createZone({
        type: ZONE_TYPES.RESTRICTED,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
        priority: 3,
      });

      const zones = zoneManager.getZonesAtPosition(5, 2, 5);
      expect(zones).toHaveLength(2);
      // Highest priority first
      expect(zones[0].priority).toBe(5);
    });

    test('should return empty for position outside any zone', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });

      expect(zoneManager.getZonesAtPosition(100, 100, 100)).toHaveLength(0);
    });

    test('should filter by type when querying position', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });
      zoneManager.createZone({
        type: ZONE_TYPES.RESTRICTED,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      const mining = zoneManager.getZonesAtPosition(5, 2, 5, ZONE_TYPES.MINING);
      expect(mining).toHaveLength(1);
      expect(mining[0].type).toBe(ZONE_TYPES.MINING);
    });

    test('should skip inactive zones in position queries', () => {
      const { zone } = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      zoneManager.setZoneActive(zone.id, false);
      expect(zoneManager.getZonesAtPosition(5, 2, 5)).toHaveLength(0);
    });
  });

  // ── isRestricted ────────────────────────────────────────────

  describe('isRestricted', () => {
    test('should return true inside a restricted zone', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.RESTRICTED,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      expect(zoneManager.isRestricted(5, 2, 5)).toBe(true);
    });

    test('should return false outside restricted zones', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.RESTRICTED,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      expect(zoneManager.isRestricted(50, 50, 50)).toBe(false);
    });

    test('should ignore inactive restricted zones', () => {
      const { zone } = zoneManager.createZone({
        type: ZONE_TYPES.RESTRICTED,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
      });

      zoneManager.setZoneActive(zone.id, false);
      expect(zoneManager.isRestricted(5, 2, 5)).toBe(false);
    });
  });

  // ── Zone Limit Enforcement ──────────────────────────────────

  describe('Zone limit enforcement', () => {
    test(`should enforce max ${MAX_ZONES_PER_TYPE} zones per type`, () => {
      // Create max zones (non-overlapping for STOCKPILE)
      for (let i = 0; i < MAX_ZONES_PER_TYPE; i++) {
        const result = zoneManager.createZone({
          type: ZONE_TYPES.STOCKPILE,
          bounds: {
            min: { x: i * 10, y: 0, z: 0 },
            max: { x: i * 10 + 5, y: 5, z: 5 },
          },
        });
        expect(result.success).toBe(true);
      }

      // 21st should fail
      const result = zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 999, y: 0, z: 0 }, max: { x: 1004, y: 5, z: 5 } },
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Maximum/);
    });

    test('should allow zones of different types independently', () => {
      for (let i = 0; i < MAX_ZONES_PER_TYPE; i++) {
        zoneManager.createZone({
          type: ZONE_TYPES.MINING,
          bounds: { min: { x: i * 10, y: 0, z: 0 }, max: { x: i * 10 + 5, y: 5, z: 5 } },
        });
      }

      // Different type should still work
      const result = zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });
      expect(result.success).toBe(true);
    });
  });

  // ── Priority and Active State ───────────────────────────────

  describe('Priority and active state', () => {
    test('should update zone priority', () => {
      const { zone } = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });

      zoneManager.setZonePriority(zone.id, 5);
      expect(zoneManager.getZone(zone.id).priority).toBe(5);
    });

    test('should clamp priority on update', () => {
      const { zone } = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });

      zoneManager.setZonePriority(zone.id, 100);
      expect(zoneManager.getZone(zone.id).priority).toBe(5);
    });

    test('should toggle active state', () => {
      const { zone } = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });

      zoneManager.setZoneActive(zone.id, false);
      expect(zoneManager.getZone(zone.id).active).toBe(false);

      zoneManager.setZoneActive(zone.id, true);
      expect(zoneManager.getZone(zone.id).active).toBe(true);
    });

    test('should return active zones sorted by priority', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
        priority: 1,
      });
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 10, y: 0, z: 0 }, max: { x: 15, y: 5, z: 5 } },
        priority: 5,
      });
      const { zone: inactive } = zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 20, y: 0, z: 0 }, max: { x: 25, y: 5, z: 5 } },
        priority: 3,
      });
      zoneManager.setZoneActive(inactive.id, false);

      const active = zoneManager.getActiveZonesByType(ZONE_TYPES.MINING);
      expect(active).toHaveLength(2);
      expect(active[0].priority).toBe(5);
      expect(active[1].priority).toBe(1);
    });
  });

  // ── Save/Load Roundtrip ─────────────────────────────────────

  describe('Save/load roundtrip', () => {
    test('should serialize and deserialize zones correctly', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
        priority: 4,
        label: 'Main Mine',
      });
      zoneManager.createZone({
        type: ZONE_TYPES.STOCKPILE,
        bounds: { min: { x: 20, y: 0, z: 0 }, max: { x: 30, y: 5, z: 10 } },
        priority: 2,
      });

      const serialized = zoneManager.serialize();

      // Restore into a fresh manager
      const newManager = new ZoneManager({});
      newManager.deserialize(serialized);

      expect(newManager.getZones()).toHaveLength(2);

      const mining = newManager.getZones(ZONE_TYPES.MINING);
      expect(mining).toHaveLength(1);
      expect(mining[0].priority).toBe(4);
      expect(mining[0].label).toBe('Main Mine');
      expect(mining[0].bounds.min).toEqual({ x: 0, y: 0, z: 0 });

      const stockpile = newManager.getZones(ZONE_TYPES.STOCKPILE);
      expect(stockpile).toHaveLength(1);
      expect(stockpile[0].priority).toBe(2);
    });

    test('should preserve nextId so new zones get unique IDs', () => {
      zoneManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } },
      });

      const serialized = zoneManager.serialize();
      const newManager = new ZoneManager({});
      newManager.deserialize(serialized);

      const result = newManager.createZone({
        type: ZONE_TYPES.MINING,
        bounds: { min: { x: 10, y: 0, z: 0 }, max: { x: 15, y: 5, z: 5 } },
      });

      // Should not collide with existing IDs
      const allIds = newManager.getZones().map(z => z.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    test('should handle deserializing null/empty state gracefully', () => {
      zoneManager.deserialize(null);
      expect(zoneManager.getZones()).toHaveLength(0);

      zoneManager.deserialize({});
      expect(zoneManager.getZones()).toHaveLength(0);
    });
  });
});
