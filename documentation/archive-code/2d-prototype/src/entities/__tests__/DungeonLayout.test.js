/**
 * DungeonLayout.test.js - Unit tests for DungeonLayout entity
 */

import DungeonLayout from '../DungeonLayout';
import { DungeonRoom, ROOM_TYPES, DIRECTIONS } from '../DungeonRoom';

describe('DungeonLayout', () => {
  describe('constructor', () => {
    it('should create a layout with default values', () => {
      const layout = new DungeonLayout();

      expect(layout.id).toBeDefined();
      expect(layout.seed).toBeDefined();
      expect(layout.type).toBe('CAVE');
      expect(layout.level).toBe(1);
      expect(layout.state).toBe('ACTIVE');
      expect(layout.rooms.size).toBe(0);
    });

    it('should create a layout with specified config', () => {
      const layout = new DungeonLayout({
        seed: 12345,
        type: 'CRYPT',
        level: 5
      });

      expect(layout.seed).toBe(12345);
      expect(layout.type).toBe('CRYPT');
      expect(layout.level).toBe(5);
    });
  });

  describe('room management', () => {
    let layout;

    beforeEach(() => {
      layout = new DungeonLayout();
    });

    it('should add a room', () => {
      const room = new DungeonRoom({ type: ROOM_TYPES.ENTRANCE });

      const result = layout.addRoom(room);

      expect(result).toBe(true);
      expect(layout.rooms.size).toBe(1);
      expect(layout.getRoom(room.id)).toBe(room);
    });

    it('should track entrance room', () => {
      const entrance = new DungeonRoom({ type: ROOM_TYPES.ENTRANCE });
      layout.addRoom(entrance);

      expect(layout.entranceRoomId).toBe(entrance.id);
      expect(layout.getEntranceRoom()).toBe(entrance);
    });

    it('should track boss room', () => {
      const boss = new DungeonRoom({ type: ROOM_TYPES.BOSS });
      layout.addRoom(boss);

      expect(layout.bossRoomId).toBe(boss.id);
      expect(layout.getBossRoom()).toBe(boss);
    });

    it('should track treasure rooms', () => {
      const treasure1 = new DungeonRoom({ type: ROOM_TYPES.TREASURE });
      const treasure2 = new DungeonRoom({ type: ROOM_TYPES.TREASURE });
      layout.addRoom(treasure1);
      layout.addRoom(treasure2);

      expect(layout.treasureRoomIds).toHaveLength(2);
      expect(layout.getTreasureRooms()).toHaveLength(2);
    });

    it('should not add duplicate rooms', () => {
      const room = new DungeonRoom();
      layout.addRoom(room);

      const result = layout.addRoom(room);

      expect(result).toBe(false);
      expect(layout.rooms.size).toBe(1);
    });

    it('should remove a room', () => {
      const room = new DungeonRoom();
      layout.addRoom(room);

      const result = layout.removeRoom(room.id);

      expect(result).toBe(true);
      expect(layout.rooms.size).toBe(0);
    });

    it('should update spatial grid on add', () => {
      const room = new DungeonRoom({ gridPosition: { x: 2, y: 3 } });
      layout.addRoom(room);

      const foundRoom = layout.getRoomAt(2, 3);

      expect(foundRoom).toBe(room);
    });

    it('should update spatial grid on remove', () => {
      const room = new DungeonRoom({ gridPosition: { x: 2, y: 3 } });
      layout.addRoom(room);
      layout.removeRoom(room.id);

      const foundRoom = layout.getRoomAt(2, 3);

      expect(foundRoom).toBeNull();
    });
  });

  describe('room connections', () => {
    let layout;
    let room1;
    let room2;

    beforeEach(() => {
      layout = new DungeonLayout();
      room1 = new DungeonRoom({ gridPosition: { x: 0, y: 0 } });
      room2 = new DungeonRoom({ gridPosition: { x: 1, y: 0 } });
      layout.addRoom(room1);
      layout.addRoom(room2);
    });

    it('should connect two rooms bidirectionally', () => {
      const result = layout.connectRooms(room1.id, room2.id, DIRECTIONS.EAST);

      expect(result).toBe(true);
      expect(room1.hasConnection(DIRECTIONS.EAST)).toBe(true);
      expect(room2.hasConnection(DIRECTIONS.WEST)).toBe(true);
      expect(room1.getConnection(DIRECTIONS.EAST)).toBe(room2.id);
      expect(room2.getConnection(DIRECTIONS.WEST)).toBe(room1.id);
    });

    it('should get room neighbors', () => {
      layout.connectRooms(room1.id, room2.id, DIRECTIONS.EAST);

      const neighbors = layout.getRoomNeighbors(room1.id);

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0]).toBe(room2);
    });

    it('should fail to connect non-existent rooms', () => {
      const result = layout.connectRooms(room1.id, 'fake_room', DIRECTIONS.EAST);

      expect(result).toBe(false);
    });
  });

  describe('pathfinding', () => {
    let layout;
    let entrance;
    let chamber1;
    let chamber2;
    let boss;

    beforeEach(() => {
      layout = new DungeonLayout();

      entrance = new DungeonRoom({ type: ROOM_TYPES.ENTRANCE, gridPosition: { x: 0, y: 0 } });
      chamber1 = new DungeonRoom({ type: ROOM_TYPES.CHAMBER, gridPosition: { x: 1, y: 0 } });
      chamber2 = new DungeonRoom({ type: ROOM_TYPES.CHAMBER, gridPosition: { x: 2, y: 0 } });
      boss = new DungeonRoom({ type: ROOM_TYPES.BOSS, gridPosition: { x: 3, y: 0 } });

      layout.addRoom(entrance);
      layout.addRoom(chamber1);
      layout.addRoom(chamber2);
      layout.addRoom(boss);

      layout.connectRooms(entrance.id, chamber1.id, DIRECTIONS.EAST);
      layout.connectRooms(chamber1.id, chamber2.id, DIRECTIONS.EAST);
      layout.connectRooms(chamber2.id, boss.id, DIRECTIONS.EAST);
    });

    it('should find path between rooms', () => {
      const path = layout.findPath(entrance.id, boss.id);

      expect(path).toHaveLength(4);
      expect(path[0]).toBe(entrance.id);
      expect(path[3]).toBe(boss.id);
    });

    it('should return single room if start equals end', () => {
      const path = layout.findPath(entrance.id, entrance.id);

      expect(path).toHaveLength(1);
      expect(path[0]).toBe(entrance.id);
    });

    it('should return empty array if no path exists', () => {
      const isolated = new DungeonRoom({ gridPosition: { x: 10, y: 10 } });
      layout.addRoom(isolated);

      const path = layout.findPath(entrance.id, isolated.id);

      expect(path).toHaveLength(0);
    });

    it('should get path to boss', () => {
      const path = layout.getPathToBoss();

      expect(path).toHaveLength(4);
      expect(path[0]).toBe(entrance.id);
      expect(path[3]).toBe(boss.id);
    });
  });

  describe('connectivity', () => {
    it('should detect fully connected dungeon', () => {
      const layout = new DungeonLayout();
      const room1 = new DungeonRoom({ gridPosition: { x: 0, y: 0 } });
      const room2 = new DungeonRoom({ gridPosition: { x: 1, y: 0 } });
      const room3 = new DungeonRoom({ gridPosition: { x: 2, y: 0 } });

      layout.addRoom(room1);
      layout.addRoom(room2);
      layout.addRoom(room3);
      layout.connectRooms(room1.id, room2.id, DIRECTIONS.EAST);
      layout.connectRooms(room2.id, room3.id, DIRECTIONS.EAST);

      expect(layout.isFullyConnected()).toBe(true);
    });

    it('should detect disconnected dungeon', () => {
      const layout = new DungeonLayout();
      const room1 = new DungeonRoom({ gridPosition: { x: 0, y: 0 } });
      const room2 = new DungeonRoom({ gridPosition: { x: 1, y: 0 } });
      const isolated = new DungeonRoom({ gridPosition: { x: 10, y: 10 } });

      layout.addRoom(room1);
      layout.addRoom(room2);
      layout.addRoom(isolated);
      layout.connectRooms(room1.id, room2.id, DIRECTIONS.EAST);

      expect(layout.isFullyConnected()).toBe(false);
    });

    it('should return true for empty layout', () => {
      const layout = new DungeonLayout();

      expect(layout.isFullyConnected()).toBe(true);
    });
  });

  describe('statistics', () => {
    let layout;

    beforeEach(() => {
      layout = new DungeonLayout();
      const room1 = new DungeonRoom({ type: ROOM_TYPES.ENTRANCE });
      const room2 = new DungeonRoom({ type: ROOM_TYPES.CHAMBER });
      const room3 = new DungeonRoom({ type: ROOM_TYPES.BOSS });

      layout.addRoom(room1);
      layout.addRoom(room2);
      layout.addRoom(room3);

      room1.explore();
      room1.clearRoom();
    });

    it('should get room count', () => {
      expect(layout.getRoomCount()).toBe(3);
    });

    it('should get explored count', () => {
      expect(layout.getExploredCount()).toBe(1);
    });

    it('should get cleared count', () => {
      expect(layout.getClearedCount()).toBe(1);
    });

    it('should get all rooms', () => {
      const rooms = layout.getAllRooms();

      expect(rooms).toHaveLength(3);
    });
  });

  describe('completion', () => {
    it('should check completion via boss room', () => {
      const layout = new DungeonLayout();
      const boss = new DungeonRoom({ type: ROOM_TYPES.BOSS });
      layout.addRoom(boss);

      expect(layout.isComplete()).toBe(false);

      boss.clearRoom();

      expect(layout.isComplete()).toBe(true);
    });

    it('should mark as completed', () => {
      const layout = new DungeonLayout();

      layout.complete();

      expect(layout.state).toBe('COMPLETED');
      expect(layout.completedAt).toBeDefined();
    });

    it('should mark as abandoned', () => {
      const layout = new DungeonLayout();

      layout.abandon();

      expect(layout.state).toBe('ABANDONED');
    });

    it('should update stats', () => {
      const layout = new DungeonLayout();

      layout.updateStats({ enemiesKilled: 10, treasuresFound: 2 });

      expect(layout.stats.enemiesKilled).toBe(10);
      expect(layout.stats.treasuresFound).toBe(2);
    });
  });

  describe('bounds', () => {
    it('should calculate dungeon bounds', () => {
      const layout = new DungeonLayout();
      const room1 = new DungeonRoom({
        worldBounds: { x: 0, y: 0, width: 100, height: 100 }
      });
      const room2 = new DungeonRoom({
        worldBounds: { x: 200, y: 200, width: 100, height: 100 }
      });

      layout.addRoom(room1);
      layout.addRoom(room2);

      const bounds = layout.getBounds();

      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(300);
      expect(bounds.maxY).toBe(300);
      expect(bounds.width).toBe(300);
      expect(bounds.height).toBe(300);
    });

    it('should return zero bounds for empty layout', () => {
      const layout = new DungeonLayout();

      const bounds = layout.getBounds();

      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });

    it('should find room at world position', () => {
      const layout = new DungeonLayout();
      const room = new DungeonRoom({
        worldBounds: { x: 100, y: 100, width: 200, height: 200 }
      });
      layout.addRoom(room);

      const foundRoom = layout.getRoomAtPosition({ x: 150, y: 150 });

      expect(foundRoom).toBe(room);
    });

    it('should return null for position outside all rooms', () => {
      const layout = new DungeonLayout();
      const room = new DungeonRoom({
        worldBounds: { x: 100, y: 100, width: 200, height: 200 }
      });
      layout.addRoom(room);

      const foundRoom = layout.getRoomAtPosition({ x: 50, y: 50 });

      expect(foundRoom).toBeNull();
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const layout = new DungeonLayout({
        seed: 12345,
        type: 'CAVE',
        level: 3
      });

      const entrance = new DungeonRoom({ type: ROOM_TYPES.ENTRANCE, gridPosition: { x: 0, y: 0 } });
      const boss = new DungeonRoom({ type: ROOM_TYPES.BOSS, gridPosition: { x: 1, y: 0 } });

      layout.addRoom(entrance);
      layout.addRoom(boss);
      layout.connectRooms(entrance.id, boss.id, DIRECTIONS.EAST);

      entrance.explore();

      const json = layout.toJSON();

      expect(json.id).toBe(layout.id);
      expect(json.seed).toBe(12345);
      expect(json.type).toBe('CAVE');
      expect(json.level).toBe(3);
      expect(json.rooms).toHaveLength(2);
      expect(json.entranceRoomId).toBe(entrance.id);
      expect(json.bossRoomId).toBe(boss.id);
    });

    it('should deserialize from JSON', () => {
      const original = new DungeonLayout({
        seed: 12345,
        type: 'CRYPT',
        level: 7
      });

      const entrance = new DungeonRoom({ type: ROOM_TYPES.ENTRANCE, gridPosition: { x: 0, y: 0 } });
      const boss = new DungeonRoom({ type: ROOM_TYPES.BOSS, gridPosition: { x: 1, y: 0 } });

      original.addRoom(entrance);
      original.addRoom(boss);
      original.connectRooms(entrance.id, boss.id, DIRECTIONS.EAST);
      original.complete();

      const json = original.toJSON();
      const restored = DungeonLayout.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.seed).toBe(12345);
      expect(restored.type).toBe('CRYPT');
      expect(restored.level).toBe(7);
      expect(restored.state).toBe('COMPLETED');
      expect(restored.rooms.size).toBe(2);
      expect(restored.entranceRoomId).toBe(entrance.id);
      expect(restored.bossRoomId).toBe(boss.id);
      expect(restored.getRoom(entrance.id)).toBeDefined();
      expect(restored.getRoom(boss.id)).toBeDefined();
    });
  });
});
