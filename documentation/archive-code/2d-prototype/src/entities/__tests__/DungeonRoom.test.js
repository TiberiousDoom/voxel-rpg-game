/**
 * DungeonRoom.test.js - Unit tests for DungeonRoom entity
 */

import { DungeonRoom, ROOM_TYPES, DIRECTIONS, OPPOSITE_DIRECTION, ROOM_SIZES } from '../DungeonRoom';

describe('DungeonRoom', () => {
  describe('constructor', () => {
    it('should create a room with default values', () => {
      const room = new DungeonRoom();

      expect(room.id).toBeDefined();
      expect(room.type).toBe(ROOM_TYPES.CHAMBER);
      expect(room.gridPosition).toEqual({ x: 0, y: 0 });
      expect(room.explored).toBe(false);
      expect(room.cleared).toBe(false);
      expect(room.enemies).toEqual([]);
      expect(room.connections.size).toBe(0);
    });

    it('should create a room with specified type', () => {
      const room = new DungeonRoom({ type: ROOM_TYPES.BOSS });

      expect(room.type).toBe(ROOM_TYPES.BOSS);
      expect(room.size).toEqual(ROOM_SIZES.BOSS);
    });

    it('should create a room with specified grid position', () => {
      const room = new DungeonRoom({
        type: ROOM_TYPES.CHAMBER,
        gridPosition: { x: 3, y: 5 }
      });

      expect(room.gridPosition).toEqual({ x: 3, y: 5 });
    });

    it('should calculate world bounds from grid position', () => {
      const room = new DungeonRoom({
        type: ROOM_TYPES.CHAMBER,
        gridPosition: { x: 0, y: 0 }
      });

      expect(room.worldBounds).toBeDefined();
      expect(room.worldBounds.width).toBeGreaterThan(0);
      expect(room.worldBounds.height).toBeGreaterThan(0);
    });
  });

  describe('connections', () => {
    it('should add a connection', () => {
      const room = new DungeonRoom();
      const targetRoomId = 'room_target';

      const result = room.addConnection(DIRECTIONS.NORTH, targetRoomId);

      expect(result).toBe(true);
      expect(room.hasConnection(DIRECTIONS.NORTH)).toBe(true);
      expect(room.getConnection(DIRECTIONS.NORTH)).toBe(targetRoomId);
    });

    it('should not add duplicate connections', () => {
      const room = new DungeonRoom();

      room.addConnection(DIRECTIONS.NORTH, 'room_1');
      const result = room.addConnection(DIRECTIONS.NORTH, 'room_2');

      expect(result).toBe(false);
      expect(room.getConnection(DIRECTIONS.NORTH)).toBe('room_1');
    });

    it('should reject invalid directions', () => {
      const room = new DungeonRoom();

      const result = room.addConnection('INVALID', 'room_1');

      expect(result).toBe(false);
    });

    it('should remove a connection', () => {
      const room = new DungeonRoom();
      room.addConnection(DIRECTIONS.NORTH, 'room_1');

      const result = room.removeConnection(DIRECTIONS.NORTH);

      expect(result).toBe(true);
      expect(room.hasConnection(DIRECTIONS.NORTH)).toBe(false);
    });

    it('should return all connected room IDs', () => {
      const room = new DungeonRoom();
      room.addConnection(DIRECTIONS.NORTH, 'room_1');
      room.addConnection(DIRECTIONS.EAST, 'room_2');
      room.addConnection(DIRECTIONS.SOUTH, 'room_3');

      const connectedIds = room.getConnectedRoomIds();

      expect(connectedIds).toHaveLength(3);
      expect(connectedIds).toContain('room_1');
      expect(connectedIds).toContain('room_2');
      expect(connectedIds).toContain('room_3');
    });

    it('should add doors when adding connections', () => {
      const room = new DungeonRoom();
      room.addConnection(DIRECTIONS.NORTH, 'room_1');

      expect(room.doors).toHaveLength(1);
      expect(room.doors[0].direction).toBe(DIRECTIONS.NORTH);
      expect(room.doors[0].targetRoomId).toBe('room_1');
    });
  });

  describe('doors', () => {
    it('should get door by direction', () => {
      const room = new DungeonRoom();
      room.addConnection(DIRECTIONS.WEST, 'room_1');

      const door = room.getDoor(DIRECTIONS.WEST);

      expect(door).toBeDefined();
      expect(door.direction).toBe(DIRECTIONS.WEST);
      expect(door.isOpen).toBe(true);
    });

    it('should return null for non-existent door', () => {
      const room = new DungeonRoom();

      const door = room.getDoor(DIRECTIONS.NORTH);

      expect(door).toBeNull();
    });
  });

  describe('enemies', () => {
    it('should spawn enemies in chamber rooms', () => {
      const room = new DungeonRoom({ type: ROOM_TYPES.CHAMBER });
      const monsterTypes = ['SPIDER', 'BAT'];

      const enemies = room.spawnEnemies(5, monsterTypes);

      expect(enemies.length).toBeGreaterThan(0);
      expect(room.enemies.length).toBe(enemies.length);
    });

    it('should not spawn enemies in entrance rooms', () => {
      const room = new DungeonRoom({ type: ROOM_TYPES.ENTRANCE });
      const monsterTypes = ['SPIDER', 'BAT'];

      const enemies = room.spawnEnemies(5, monsterTypes);

      expect(enemies.length).toBe(0);
    });

    it('should not spawn enemies in corridor rooms', () => {
      const room = new DungeonRoom({ type: ROOM_TYPES.CORRIDOR });
      const monsterTypes = ['SPIDER', 'BAT'];

      const enemies = room.spawnEnemies(5, monsterTypes);

      expect(enemies.length).toBe(0);
    });

    it('should spawn only 1 enemy in boss rooms', () => {
      const room = new DungeonRoom({ type: ROOM_TYPES.BOSS });
      const monsterTypes = ['BOSS_SPIDER'];

      const enemies = room.spawnEnemies(10, monsterTypes);

      expect(enemies.length).toBe(1);
    });

    it('should use custom monster factory', () => {
      const room = new DungeonRoom({ type: ROOM_TYPES.CHAMBER });
      const monsterTypes = ['SPIDER'];
      const createMonster = jest.fn((type, position, options) => ({
        id: `custom_${Date.now()}`,
        type,
        position,
        level: options.level,
        custom: true
      }));

      room.spawnEnemies(5, monsterTypes, createMonster);

      expect(createMonster).toHaveBeenCalled();
      expect(room.enemies[0].custom).toBe(true);
    });
  });

  describe('state', () => {
    it('should mark room as explored', () => {
      const room = new DungeonRoom();

      room.explore();

      expect(room.explored).toBe(true);
    });

    it('should clear room', () => {
      const room = new DungeonRoom();
      room.enemies = [{ id: 'e1', alive: false }];

      room.clearRoom();

      expect(room.cleared).toBe(true);
      expect(room.enemies.length).toBe(0);
    });

    it('should check cleared status correctly', () => {
      const room = new DungeonRoom();
      room.enemies = [
        { id: 'e1', alive: false },
        { id: 'e2', alive: false }
      ];

      const isCleared = room.checkCleared();

      expect(isCleared).toBe(true);
      expect(room.cleared).toBe(true);
    });

    it('should not be cleared if enemies are alive', () => {
      const room = new DungeonRoom();
      room.enemies = [
        { id: 'e1', alive: false },
        { id: 'e2', alive: true }
      ];

      const isCleared = room.checkCleared();

      expect(isCleared).toBe(false);
      expect(room.cleared).toBe(false);
    });

    it('should set active and auto-explore', () => {
      const room = new DungeonRoom();

      room.setActive(true);

      expect(room.isActive).toBe(true);
      expect(room.explored).toBe(true);
    });
  });

  describe('position helpers', () => {
    it('should check if position is inside room', () => {
      const room = new DungeonRoom({
        worldBounds: { x: 100, y: 100, width: 200, height: 200 }
      });

      expect(room.containsPosition({ x: 150, y: 150 })).toBe(true);
      expect(room.containsPosition({ x: 50, y: 50 })).toBe(false);
      expect(room.containsPosition({ x: 350, y: 350 })).toBe(false);
    });

    it('should get room center', () => {
      const room = new DungeonRoom({
        worldBounds: { x: 100, y: 100, width: 200, height: 200 }
      });

      const center = room.getCenter();

      expect(center.x).toBe(200);
      expect(center.y).toBe(200);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const room = new DungeonRoom({
        type: ROOM_TYPES.CHAMBER,
        gridPosition: { x: 2, y: 3 }
      });
      room.addConnection(DIRECTIONS.NORTH, 'room_1');
      room.explore();

      const json = room.toJSON();

      expect(json.id).toBe(room.id);
      expect(json.type).toBe(ROOM_TYPES.CHAMBER);
      expect(json.gridPosition).toEqual({ x: 2, y: 3 });
      expect(json.explored).toBe(true);
      expect(json.connections).toHaveLength(1);
    });

    it('should deserialize from JSON', () => {
      const original = new DungeonRoom({
        type: ROOM_TYPES.BOSS,
        gridPosition: { x: 5, y: 5 }
      });
      original.addConnection(DIRECTIONS.SOUTH, 'room_entrance');
      original.explore();
      original.clearRoom();

      const json = original.toJSON();
      const restored = DungeonRoom.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.type).toBe(ROOM_TYPES.BOSS);
      expect(restored.gridPosition).toEqual({ x: 5, y: 5 });
      expect(restored.explored).toBe(true);
      expect(restored.cleared).toBe(true);
      expect(restored.connections.size).toBe(1);
    });
  });
});

describe('Constants', () => {
  it('should have all room types', () => {
    expect(ROOM_TYPES.ENTRANCE).toBe('ENTRANCE');
    expect(ROOM_TYPES.CORRIDOR).toBe('CORRIDOR');
    expect(ROOM_TYPES.CHAMBER).toBe('CHAMBER');
    expect(ROOM_TYPES.BOSS).toBe('BOSS');
    expect(ROOM_TYPES.TREASURE).toBe('TREASURE');
  });

  it('should have all directions', () => {
    expect(DIRECTIONS.NORTH).toBe('NORTH');
    expect(DIRECTIONS.SOUTH).toBe('SOUTH');
    expect(DIRECTIONS.EAST).toBe('EAST');
    expect(DIRECTIONS.WEST).toBe('WEST');
  });

  it('should have correct opposite directions', () => {
    expect(OPPOSITE_DIRECTION.NORTH).toBe('SOUTH');
    expect(OPPOSITE_DIRECTION.SOUTH).toBe('NORTH');
    expect(OPPOSITE_DIRECTION.EAST).toBe('WEST');
    expect(OPPOSITE_DIRECTION.WEST).toBe('EAST');
  });

  it('should have sizes for all room types', () => {
    Object.values(ROOM_TYPES).forEach(type => {
      expect(ROOM_SIZES[type]).toBeDefined();
      expect(ROOM_SIZES[type].width).toBeGreaterThan(0);
      expect(ROOM_SIZES[type].height).toBeGreaterThan(0);
    });
  });
});
