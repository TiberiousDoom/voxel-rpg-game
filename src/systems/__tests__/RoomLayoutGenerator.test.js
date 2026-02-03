/**
 * RoomLayoutGenerator.test.js - Unit tests for procedural dungeon generation
 */

import RoomLayoutGenerator, { DUNGEON_CONFIGS } from '../RoomLayoutGenerator';
import { ROOM_TYPES } from '../../entities/DungeonRoom';

describe('RoomLayoutGenerator', () => {
  describe('constructor', () => {
    it('should create generator with default seed', () => {
      const generator = new RoomLayoutGenerator();

      expect(generator.seed).toBeDefined();
      expect(generator.rng).toBeDefined();
    });

    it('should create generator with specified seed', () => {
      const generator = new RoomLayoutGenerator(12345);

      expect(generator.seed).toBe(12345);
    });
  });

  describe('generate', () => {
    it('should generate a dungeon layout', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 1);

      expect(layout).toBeDefined();
      expect(layout.type).toBe('CAVE');
      expect(layout.level).toBe(1);
      expect(layout.getRoomCount()).toBeGreaterThan(0);
    });

    it('should generate entrance and boss rooms', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 1);

      expect(layout.getEntranceRoom()).toBeDefined();
      expect(layout.getBossRoom()).toBeDefined();
      expect(layout.getEntranceRoom().type).toBe(ROOM_TYPES.ENTRANCE);
      expect(layout.getBossRoom().type).toBe(ROOM_TYPES.BOSS);
    });

    it('should create connected rooms', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 1);

      expect(layout.isFullyConnected()).toBe(true);
    });

    it('should have path from entrance to boss', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 5);

      const path = layout.getPathToBoss();

      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toBe(layout.entranceRoomId);
      expect(path[path.length - 1]).toBe(layout.bossRoomId);
    });

    it('should generate more rooms at higher levels', () => {
      const generator1 = new RoomLayoutGenerator(42);
      const generator2 = new RoomLayoutGenerator(42);

      const layoutLow = generator1.generate('CAVE', 1);
      const layoutHigh = generator2.generate('CAVE', 10);

      expect(layoutHigh.getRoomCount()).toBeGreaterThanOrEqual(layoutLow.getRoomCount());
    });

    it('should be reproducible with same seed', () => {
      const generator1 = new RoomLayoutGenerator(12345);
      const generator2 = new RoomLayoutGenerator(12345);

      const layout1 = generator1.generate('CAVE', 5);
      const layout2 = generator2.generate('CAVE', 5);

      expect(layout1.getRoomCount()).toBe(layout2.getRoomCount());

      // Check room positions match
      const rooms1 = layout1.getAllRooms();
      const rooms2 = layout2.getAllRooms();

      rooms1.forEach((room, index) => {
        expect(room.gridPosition).toEqual(rooms2[index].gridPosition);
        expect(room.type).toBe(rooms2[index].type);
      });
    });

    it('should generate different layouts with different seeds', () => {
      const generator1 = new RoomLayoutGenerator(111);
      const generator2 = new RoomLayoutGenerator(222);

      const layout1 = generator1.generate('CAVE', 5);
      const layout2 = generator2.generate('CAVE', 5);

      // Very unlikely to have exact same layout
      const rooms1 = layout1.getAllRooms().map(r => `${r.gridPosition.x},${r.gridPosition.y}`).sort().join('|');
      const rooms2 = layout2.getAllRooms().map(r => `${r.gridPosition.x},${r.gridPosition.y}`).sort().join('|');

      expect(rooms1).not.toBe(rooms2);
    });
  });

  describe('dungeon types', () => {
    it('should generate CAVE dungeons', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 5);

      expect(layout.type).toBe('CAVE');
      expect(layout.getRoomCount()).toBeGreaterThanOrEqual(DUNGEON_CONFIGS.CAVE.minRooms);
      expect(layout.getRoomCount()).toBeLessThanOrEqual(DUNGEON_CONFIGS.CAVE.maxRooms);
    });

    it('should generate CRYPT dungeons', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CRYPT', 5);

      expect(layout.type).toBe('CRYPT');
      expect(layout.getRoomCount()).toBeGreaterThanOrEqual(DUNGEON_CONFIGS.CRYPT.minRooms);
      expect(layout.getRoomCount()).toBeLessThanOrEqual(DUNGEON_CONFIGS.CRYPT.maxRooms);
    });

    it('should generate RUINS dungeons', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('RUINS', 5);

      expect(layout.type).toBe('RUINS');
      expect(layout.getRoomCount()).toBeGreaterThanOrEqual(DUNGEON_CONFIGS.RUINS.minRooms);
      expect(layout.getRoomCount()).toBeLessThanOrEqual(DUNGEON_CONFIGS.RUINS.maxRooms);
    });

    it('should fallback to CAVE for unknown types', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('UNKNOWN', 5);

      expect(layout.getRoomCount()).toBeGreaterThanOrEqual(DUNGEON_CONFIGS.CAVE.minRooms);
    });
  });

  describe('room types', () => {
    it('should include various room types', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 5);

      const rooms = layout.getAllRooms();
      const types = new Set(rooms.map(r => r.type));

      expect(types.has(ROOM_TYPES.ENTRANCE)).toBe(true);
      expect(types.has(ROOM_TYPES.BOSS)).toBe(true);
      // Chamber should be present in most dungeons
      expect(types.has(ROOM_TYPES.CHAMBER) || types.has(ROOM_TYPES.CORRIDOR)).toBe(true);
    });

    it('should have exactly one entrance', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 5);

      const entrances = layout.getAllRooms().filter(r => r.type === ROOM_TYPES.ENTRANCE);

      expect(entrances.length).toBe(1);
    });

    it('should have exactly one boss room', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 5);

      const bossRooms = layout.getAllRooms().filter(r => r.type === ROOM_TYPES.BOSS);

      expect(bossRooms.length).toBe(1);
    });
  });

  describe('connectivity', () => {
    it('should ensure boss room has limited entrances', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 5);

      const bossRoom = layout.getBossRoom();
      const connections = bossRoom.getConnectionDirections();

      // Boss room should have exactly 1 entrance
      expect(connections.length).toBe(1);
    });

    it('should create bidirectional connections', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 3);

      const rooms = layout.getAllRooms();

      rooms.forEach(room => {
        room.getConnectionDirections().forEach(dir => {
          const connectedId = room.getConnection(dir);
          const connectedRoom = layout.getRoom(connectedId);

          expect(connectedRoom).toBeDefined();
          expect(connectedRoom.getConnectedRoomIds()).toContain(room.id);
        });
      });
    });

    it('should have all rooms reachable from entrance', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 5);

      const entrance = layout.getEntranceRoom();
      const rooms = layout.getAllRooms();

      rooms.forEach(room => {
        if (room.id !== entrance.id) {
          const path = layout.findPath(entrance.id, room.id);
          expect(path.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('populateWithEnemies', () => {
    it('should populate rooms with enemies', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 5);

      const mockCreateMonster = jest.fn((type, position, options) => ({
        id: `mock_${Date.now()}_${Math.random()}`,
        type,
        position,
        level: options.level,
        alive: true
      }));

      generator.populateWithEnemies(layout, mockCreateMonster);

      expect(mockCreateMonster).toHaveBeenCalled();

      // Check chambers have enemies
      const chambers = layout.getAllRooms().filter(r => r.type === ROOM_TYPES.CHAMBER);
      chambers.forEach(chamber => {
        expect(chamber.enemies.length).toBeGreaterThan(0);
      });
    });

    it('should not populate entrance with enemies', () => {
      const generator = new RoomLayoutGenerator(42);
      const layout = generator.generate('CAVE', 5);

      generator.populateWithEnemies(layout, () => ({ id: 'test', alive: true }));

      const entrance = layout.getEntranceRoom();
      expect(entrance.enemies.length).toBe(0);
    });
  });

  describe('static methods', () => {
    it('should get dungeon config', () => {
      const config = RoomLayoutGenerator.getConfig('CAVE');

      expect(config).toBeDefined();
      expect(config.name).toBe('Cave');
      expect(config.minRooms).toBeDefined();
      expect(config.monsterTypes).toBeDefined();
    });

    it('should get all dungeon types', () => {
      const types = RoomLayoutGenerator.getDungeonTypes();

      expect(types).toContain('CAVE');
      expect(types).toContain('CRYPT');
      expect(types).toContain('RUINS');
    });
  });

  describe('stress testing', () => {
    it('should generate many dungeons without errors', () => {
      for (let i = 0; i < 50; i++) {
        const generator = new RoomLayoutGenerator(i * 1000);
        const type = ['CAVE', 'CRYPT', 'RUINS'][i % 3];
        const level = (i % 10) + 1;

        const layout = generator.generate(type, level);

        expect(layout.isFullyConnected()).toBe(true);
        expect(layout.getEntranceRoom()).toBeDefined();
        expect(layout.getBossRoom()).toBeDefined();
        expect(layout.getPathToBoss().length).toBeGreaterThan(0);
      }
    });
  });
});

describe('DUNGEON_CONFIGS', () => {
  it('should have valid configs for all types', () => {
    Object.entries(DUNGEON_CONFIGS).forEach(([type, config]) => {
      expect(config.name).toBeDefined();
      expect(config.minRooms).toBeGreaterThan(0);
      expect(config.maxRooms).toBeGreaterThanOrEqual(config.minRooms);
      expect(config.branchingFactor).toBeGreaterThanOrEqual(0);
      expect(config.branchingFactor).toBeLessThanOrEqual(1);
      expect(config.corridorChance).toBeGreaterThanOrEqual(0);
      expect(config.treasureChance).toBeGreaterThanOrEqual(0);
      expect(config.monsterTypes).toBeDefined();
      expect(config.monsterTypes.length).toBeGreaterThan(0);
      expect(config.bossType).toBeDefined();
    });
  });
});
