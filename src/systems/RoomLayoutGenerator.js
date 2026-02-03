/**
 * RoomLayoutGenerator.js - Procedural dungeon room layout generator
 *
 * Generates connected room-based dungeon layouts using:
 * - Grid-based room placement
 * - Minimum Spanning Tree for guaranteed connectivity
 * - Additional connections for exploration variety
 *
 * Supports dungeon types: CAVE, CRYPT, RUINS
 */

import SeededRandom from '../utils/SeededRandom';
import DungeonLayout from '../entities/DungeonLayout';
import { DungeonRoom, ROOM_TYPES, DIRECTIONS, OPPOSITE_DIRECTION } from '../entities/DungeonRoom';

// Dungeon type configurations
const DUNGEON_CONFIGS = {
  CAVE: {
    name: 'Cave',
    minRooms: 8,
    maxRooms: 15,
    branchingFactor: 0.3, // Extra connections beyond MST
    corridorChance: 0.2,
    treasureChance: 0.15,
    monsterTypes: ['CAVE_SPIDER', 'CAVE_BAT', 'CAVE_TROLL'],
    bossType: 'BROOD_MOTHER'
  },
  CRYPT: {
    name: 'Crypt',
    minRooms: 6,
    maxRooms: 12,
    branchingFactor: 0.15, // More linear
    corridorChance: 0.35,
    treasureChance: 0.2,
    monsterTypes: ['ZOMBIE', 'SKELETON', 'WRAITH'],
    bossType: 'NECROMANCER'
  },
  RUINS: {
    name: 'Ruins',
    minRooms: 10,
    maxRooms: 18,
    branchingFactor: 0.4, // More open
    corridorChance: 0.15,
    treasureChance: 0.25,
    monsterTypes: ['GARGOYLE', 'CONSTRUCT', 'GUARDIAN'],
    bossType: 'STONE_GOLEM'
  }
};

// Direction vectors for grid navigation
const DIRECTION_VECTORS = {
  NORTH: { x: 0, y: -1 },
  SOUTH: { x: 0, y: 1 },
  EAST: { x: 1, y: 0 },
  WEST: { x: -1, y: 0 }
};

/**
 * RoomLayoutGenerator class
 */
class RoomLayoutGenerator {
  /**
   * Create a generator with optional seed
   * @param {number} seed - Random seed for reproducibility
   */
  constructor(seed = Date.now()) {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
  }

  /**
   * Generate a complete dungeon layout
   * @param {string} type - Dungeon type (CAVE, CRYPT, RUINS)
   * @param {number} level - Difficulty level (1-10)
   * @returns {DungeonLayout}
   */
  generate(type = 'CAVE', level = 1) {
    // Reset RNG for reproducibility
    this.rng.reset();

    const config = DUNGEON_CONFIGS[type] || DUNGEON_CONFIGS.CAVE;

    // Create layout
    const layout = new DungeonLayout({
      seed: this.seed,
      type,
      level
    });

    // 1. Determine room count based on level
    const roomCount = this._calculateRoomCount(config, level);

    // 2. Generate room positions on grid
    const positions = this._generateRoomPositions(roomCount);

    // 3. Create rooms with types
    const rooms = this._createRooms(positions, config);

    // 4. Add rooms to layout
    rooms.forEach(room => layout.addRoom(room));

    // 5. Connect rooms using MST + extra connections
    this._connectRooms(layout, rooms, config);

    // 6. Place entrance and boss rooms
    this._placeSpecialRooms(layout);

    // 7. Validate layout
    if (!layout.isFullyConnected()) {
      console.warn('[RoomLayoutGenerator] Generated layout is not fully connected, attempting repair');
      this._repairConnectivity(layout);
    }

    return layout;
  }

  /**
   * Calculate room count based on config and level
   * @private
   */
  _calculateRoomCount(config, level) {
    const baseCount = config.minRooms;
    const levelBonus = Math.floor(level / 2);
    const maxCount = config.maxRooms;

    return Math.min(baseCount + levelBonus, maxCount);
  }

  /**
   * Generate grid positions for rooms
   * @private
   */
  _generateRoomPositions(count) {
    const positions = [];
    const occupied = new Set();

    // Grid size based on room count
    const gridSize = Math.ceil(Math.sqrt(count * 2));

    // Start from center
    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);

    // First position at center (for entrance)
    positions.push({ x: centerX, y: centerY });
    occupied.add(`${centerX},${centerY}`);

    // Generate remaining positions using random walk with backtracking
    let attempts = 0;
    const maxAttempts = count * 20;

    while (positions.length < count && attempts < maxAttempts) {
      attempts++;

      // Pick a random existing position to branch from
      const basePos = this.rng.pick(positions);

      // Try random direction
      const direction = this.rng.pick(Object.values(DIRECTION_VECTORS));
      const newX = basePos.x + direction.x;
      const newY = basePos.y + direction.y;
      const key = `${newX},${newY}`;

      // Check bounds and occupation
      if (newX >= 0 && newX < gridSize &&
          newY >= 0 && newY < gridSize &&
          !occupied.has(key)) {
        positions.push({ x: newX, y: newY });
        occupied.add(key);
      }
    }

    return positions;
  }

  /**
   * Create room instances from positions
   * @private
   */
  _createRooms(positions, config) {
    const rooms = [];

    positions.forEach((pos, index) => {
      // Determine room type
      let roomType;

      if (index === 0) {
        roomType = ROOM_TYPES.ENTRANCE;
      } else if (index === positions.length - 1) {
        roomType = ROOM_TYPES.BOSS;
      } else if (this.rng.nextBool(config.treasureChance)) {
        roomType = ROOM_TYPES.TREASURE;
      } else if (this.rng.nextBool(config.corridorChance)) {
        roomType = ROOM_TYPES.CORRIDOR;
      } else {
        roomType = ROOM_TYPES.CHAMBER;
      }

      const room = new DungeonRoom({
        type: roomType,
        gridPosition: { x: pos.x, y: pos.y }
      });

      rooms.push(room);
    });

    return rooms;
  }

  /**
   * Connect rooms using MST algorithm plus extra connections
   * @private
   */
  _connectRooms(layout, rooms, config) {
    if (rooms.length < 2) return;

    // Build edge list with distances
    const edges = [];

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const room1 = rooms[i];
        const room2 = rooms[j];

        // Only connect adjacent rooms (Manhattan distance = 1)
        const dx = Math.abs(room1.gridPosition.x - room2.gridPosition.x);
        const dy = Math.abs(room1.gridPosition.y - room2.gridPosition.y);

        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
          edges.push({
            room1,
            room2,
            weight: this.rng.next() // Random weight for varied layouts
          });
        }
      }
    }

    // Sort edges by weight (Kruskal's algorithm)
    edges.sort((a, b) => a.weight - b.weight);

    // Union-Find for MST
    const parent = new Map();
    rooms.forEach(room => parent.set(room.id, room.id));

    const find = (id) => {
      if (parent.get(id) !== id) {
        parent.set(id, find(parent.get(id)));
      }
      return parent.get(id);
    };

    const union = (id1, id2) => {
      const root1 = find(id1);
      const root2 = find(id2);
      if (root1 !== root2) {
        parent.set(root1, root2);
        return true;
      }
      return false;
    };

    // Build MST
    const mstEdges = [];
    const extraEdges = [];

    for (const edge of edges) {
      if (union(edge.room1.id, edge.room2.id)) {
        mstEdges.push(edge);
      } else {
        extraEdges.push(edge);
      }
    }

    // Add MST connections
    mstEdges.forEach(edge => {
      const direction = this._getDirection(edge.room1.gridPosition, edge.room2.gridPosition);
      if (direction) {
        layout.connectRooms(edge.room1.id, edge.room2.id, direction);
      }
    });

    // Add extra connections for loops
    const extraCount = Math.floor(extraEdges.length * config.branchingFactor);
    this.rng.shuffle(extraEdges);

    for (let i = 0; i < extraCount && i < extraEdges.length; i++) {
      const edge = extraEdges[i];
      const direction = this._getDirection(edge.room1.gridPosition, edge.room2.gridPosition);

      if (direction && !edge.room1.hasConnection(direction)) {
        layout.connectRooms(edge.room1.id, edge.room2.id, direction);
      }
    }
  }

  /**
   * Get direction from one grid position to adjacent position
   * @private
   */
  _getDirection(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (dx === 1 && dy === 0) return DIRECTIONS.EAST;
    if (dx === -1 && dy === 0) return DIRECTIONS.WEST;
    if (dx === 0 && dy === 1) return DIRECTIONS.SOUTH;
    if (dx === 0 && dy === -1) return DIRECTIONS.NORTH;

    return null;
  }

  /**
   * Ensure entrance and boss rooms are properly placed
   * @private
   */
  _placeSpecialRooms(layout) {
    const entrance = layout.getEntranceRoom();
    const boss = layout.getBossRoom();

    // Ensure boss room has only one entrance (for dramatic effect)
    if (boss) {
      const connections = boss.getConnectionDirections();

      if (connections.length > 1) {
        // Keep only the first connection
        const keepDirection = connections[0];

        connections.slice(1).forEach(dir => {
          const connectedId = boss.getConnection(dir);
          if (connectedId) {
            const connectedRoom = layout.getRoom(connectedId);
            if (connectedRoom) {
              connectedRoom.removeConnection(OPPOSITE_DIRECTION[dir]);
            }
          }
          boss.removeConnection(dir);
        });
      }
    }

    // Verify entrance is reachable
    if (entrance && boss) {
      const path = layout.getPathToBoss();
      if (path.length === 0) {
        console.error('[RoomLayoutGenerator] No path from entrance to boss!');
      }
    }
  }

  /**
   * Repair connectivity if layout is disconnected
   * @private
   */
  _repairConnectivity(layout) {
    const rooms = layout.getAllRooms();
    if (rooms.length < 2) return;

    // Find disconnected components
    const visited = new Set();
    const components = [];

    for (const room of rooms) {
      if (!visited.has(room.id)) {
        const component = [];
        const queue = [room];

        while (queue.length > 0) {
          const current = queue.shift();
          if (visited.has(current.id)) continue;

          visited.add(current.id);
          component.push(current);

          for (const neighborId of current.getConnectedRoomIds()) {
            if (!visited.has(neighborId)) {
              const neighbor = layout.getRoom(neighborId);
              if (neighbor) queue.push(neighbor);
            }
          }
        }

        components.push(component);
      }
    }

    // Connect components
    for (let i = 1; i < components.length; i++) {
      const comp1 = components[0];
      const comp2 = components[i];

      // Find closest pair of rooms between components
      let bestDistance = Infinity;
      let bestPair = null;

      for (const room1 of comp1) {
        for (const room2 of comp2) {
          const dx = Math.abs(room1.gridPosition.x - room2.gridPosition.x);
          const dy = Math.abs(room1.gridPosition.y - room2.gridPosition.y);

          // Only consider adjacent rooms
          if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            const dist = dx + dy;
            if (dist < bestDistance) {
              bestDistance = dist;
              bestPair = { room1, room2 };
            }
          }
        }
      }

      if (bestPair) {
        const direction = this._getDirection(
          bestPair.room1.gridPosition,
          bestPair.room2.gridPosition
        );
        if (direction) {
          layout.connectRooms(bestPair.room1.id, bestPair.room2.id, direction);
        }
      }
    }
  }

  /**
   * Populate rooms with enemies
   * @param {DungeonLayout} layout
   * @param {Function} createMonster - Monster factory function
   */
  populateWithEnemies(layout, createMonster) {
    const config = DUNGEON_CONFIGS[layout.type] || DUNGEON_CONFIGS.CAVE;

    layout.getAllRooms().forEach(room => {
      if (room.type === ROOM_TYPES.BOSS) {
        // Spawn boss
        room.spawnEnemies(layout.level, [config.bossType], createMonster);
      } else {
        room.spawnEnemies(layout.level, config.monsterTypes, createMonster);
      }
    });
  }

  /**
   * Get dungeon configuration
   * @param {string} type
   * @returns {Object}
   */
  static getConfig(type) {
    return DUNGEON_CONFIGS[type] || DUNGEON_CONFIGS.CAVE;
  }

  /**
   * Get all dungeon types
   * @returns {string[]}
   */
  static getDungeonTypes() {
    return Object.keys(DUNGEON_CONFIGS);
  }
}

export default RoomLayoutGenerator;
export { RoomLayoutGenerator, DUNGEON_CONFIGS };
