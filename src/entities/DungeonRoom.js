/**
 * DungeonRoom.js - Room entity for dungeon system
 *
 * Represents a single room in a dungeon with:
 * - Type (ENTRANCE, CORRIDOR, CHAMBER, BOSS, TREASURE)
 * - Grid position in dungeon layout
 * - World bounds for rendering
 * - Connections to adjacent rooms via doors
 * - Enemy spawns and loot points
 */

const ROOM_TYPES = {
  ENTRANCE: 'ENTRANCE',
  CORRIDOR: 'CORRIDOR',
  CHAMBER: 'CHAMBER',
  BOSS: 'BOSS',
  TREASURE: 'TREASURE'
};

const DIRECTIONS = {
  NORTH: 'NORTH',
  SOUTH: 'SOUTH',
  EAST: 'EAST',
  WEST: 'WEST'
};

const OPPOSITE_DIRECTION = {
  NORTH: 'SOUTH',
  SOUTH: 'NORTH',
  EAST: 'WEST',
  WEST: 'EAST'
};

// Default room sizes by type (in tiles)
const ROOM_SIZES = {
  ENTRANCE: { width: 8, height: 8 },
  CORRIDOR: { width: 6, height: 4 },
  CHAMBER: { width: 10, height: 10 },
  BOSS: { width: 14, height: 14 },
  TREASURE: { width: 8, height: 8 }
};

/**
 * Generate a unique room ID
 */
function generateRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * DungeonRoom class
 */
class DungeonRoom {
  /**
   * Create a new dungeon room
   * @param {Object} config - Room configuration
   * @param {string} config.id - Optional room ID
   * @param {string} config.type - Room type (ENTRANCE, CORRIDOR, CHAMBER, BOSS, TREASURE)
   * @param {Object} config.gridPosition - Position in dungeon grid {x, y}
   * @param {Object} config.worldBounds - World coordinates {x, y, width, height}
   * @param {number} config.tileSize - Size of each tile in pixels (default 32)
   */
  constructor(config = {}) {
    this.id = config.id || generateRoomId();
    this.type = config.type || ROOM_TYPES.CHAMBER;

    // Grid position in dungeon layout
    this.gridPosition = config.gridPosition || { x: 0, y: 0 };

    // Calculate world bounds from grid position if not provided
    const roomSize = ROOM_SIZES[this.type] || ROOM_SIZES.CHAMBER;
    const tileSize = config.tileSize || 32;

    this.worldBounds = config.worldBounds || {
      x: this.gridPosition.x * (roomSize.width * tileSize + tileSize * 2),
      y: this.gridPosition.y * (roomSize.height * tileSize + tileSize * 2),
      width: roomSize.width * tileSize,
      height: roomSize.height * tileSize
    };

    // Room dimensions in tiles
    this.size = config.size || roomSize;

    // Connections to other rooms (direction -> roomId)
    this.connections = new Map();

    // Doors for each connection
    this.doors = [];

    // Enemies in this room
    this.enemies = [];

    // Loot spawn points
    this.lootPoints = [];

    // Environmental props/decorations
    this.props = [];

    // State
    this.explored = false;
    this.cleared = false;
    this.isActive = false; // Player is currently in this room
  }

  /**
   * Add a connection to another room
   * @param {string} direction - Direction (NORTH, SOUTH, EAST, WEST)
   * @param {string} roomId - ID of the connected room
   * @returns {boolean} Success
   */
  addConnection(direction, roomId) {
    if (!DIRECTIONS[direction]) {
      console.warn(`[DungeonRoom] Invalid direction: ${direction}`);
      return false;
    }

    if (this.connections.has(direction)) {
      console.warn(`[DungeonRoom] Connection already exists for direction: ${direction}`);
      return false;
    }

    this.connections.set(direction, roomId);

    // Add door for this connection
    this._addDoor(direction, roomId);

    return true;
  }

  /**
   * Get the room ID connected in a direction
   * @param {string} direction - Direction to check
   * @returns {string|null} Room ID or null
   */
  getConnection(direction) {
    return this.connections.get(direction) || null;
  }

  /**
   * Check if room has a connection in a direction
   * @param {string} direction - Direction to check
   * @returns {boolean}
   */
  hasConnection(direction) {
    return this.connections.has(direction);
  }

  /**
   * Remove a connection
   * @param {string} direction - Direction to remove
   * @returns {boolean} Success
   */
  removeConnection(direction) {
    if (!this.connections.has(direction)) {
      return false;
    }

    this.connections.delete(direction);
    this.doors = this.doors.filter(d => d.direction !== direction);

    return true;
  }

  /**
   * Get all connected room IDs
   * @returns {string[]}
   */
  getConnectedRoomIds() {
    return Array.from(this.connections.values());
  }

  /**
   * Get all connection directions
   * @returns {string[]}
   */
  getConnectionDirections() {
    return Array.from(this.connections.keys());
  }

  /**
   * Add a door for a connection
   * @private
   */
  _addDoor(direction, targetRoomId) {
    const doorPosition = this._calculateDoorPosition(direction);

    this.doors.push({
      direction,
      targetRoomId,
      position: doorPosition,
      isOpen: true,
      isLocked: false
    });
  }

  /**
   * Calculate door position based on direction
   * @private
   */
  _calculateDoorPosition(direction) {
    const { x, y, width, height } = this.worldBounds;
    const doorSize = 64; // 2 tiles wide

    switch (direction) {
      case DIRECTIONS.NORTH:
        return {
          x: x + (width - doorSize) / 2,
          y: y,
          width: doorSize,
          height: 8
        };
      case DIRECTIONS.SOUTH:
        return {
          x: x + (width - doorSize) / 2,
          y: y + height - 8,
          width: doorSize,
          height: 8
        };
      case DIRECTIONS.EAST:
        return {
          x: x + width - 8,
          y: y + (height - doorSize) / 2,
          width: 8,
          height: doorSize
        };
      case DIRECTIONS.WEST:
        return {
          x: x,
          y: y + (height - doorSize) / 2,
          width: 8,
          height: doorSize
        };
      default:
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  /**
   * Get door by direction
   * @param {string} direction
   * @returns {Object|null}
   */
  getDoor(direction) {
    return this.doors.find(d => d.direction === direction) || null;
  }

  /**
   * Spawn enemies in this room
   * @param {number} dungeonLevel - Dungeon difficulty level
   * @param {string[]} monsterTypes - Available monster types
   * @param {Function} createMonster - Monster factory function
   * @returns {Object[]} Spawned enemies
   */
  spawnEnemies(dungeonLevel, monsterTypes, createMonster) {
    if (this.type === ROOM_TYPES.ENTRANCE || this.type === ROOM_TYPES.CORRIDOR) {
      return []; // No enemies in entrance or corridors
    }

    // Calculate enemy count based on room size
    const roomArea = this.size.width * this.size.height;
    let enemyCount;

    if (this.type === ROOM_TYPES.BOSS) {
      enemyCount = 1; // Just the boss
    } else if (this.type === ROOM_TYPES.TREASURE) {
      enemyCount = Math.floor(roomArea / 20); // Fewer enemies guarding treasure
    } else {
      enemyCount = Math.floor(roomArea / 15); // Standard chamber
    }

    // Spawn enemies at random positions
    this.enemies = [];

    for (let i = 0; i < enemyCount; i++) {
      const monsterType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
      const position = this._getRandomPositionInRoom();

      if (createMonster) {
        const monster = createMonster(monsterType, position, { level: dungeonLevel });
        this.enemies.push(monster);
      } else {
        // Basic enemy placeholder
        this.enemies.push({
          id: `enemy_${this.id}_${i}`,
          type: monsterType,
          position,
          level: dungeonLevel,
          alive: true
        });
      }
    }

    return this.enemies;
  }

  /**
   * Get a random position within the room
   * @private
   */
  _getRandomPositionInRoom() {
    const padding = 32; // Keep enemies away from walls
    return {
      x: this.worldBounds.x + padding + Math.random() * (this.worldBounds.width - padding * 2),
      y: this.worldBounds.y + padding + Math.random() * (this.worldBounds.height - padding * 2)
    };
  }

  /**
   * Add loot point to the room
   * @param {Object} lootPoint - {position, lootTableId}
   */
  addLootPoint(lootPoint) {
    this.lootPoints.push(lootPoint);
  }

  /**
   * Add prop/decoration to the room
   * @param {Object} prop - {type, position, data}
   */
  addProp(prop) {
    this.props.push(prop);
  }

  /**
   * Mark room as explored
   */
  explore() {
    this.explored = true;
  }

  /**
   * Check if room is cleared (all enemies defeated)
   * @returns {boolean}
   */
  checkCleared() {
    if (this.enemies.length === 0) {
      this.cleared = true;
      return true;
    }

    const allDefeated = this.enemies.every(e => !e.alive && e.alive !== undefined);
    if (allDefeated) {
      this.cleared = true;
    }

    return this.cleared;
  }

  /**
   * Mark room as cleared
   */
  clearRoom() {
    this.cleared = true;
    this.enemies = [];
  }

  /**
   * Set room as active (player is in this room)
   * @param {boolean} active
   */
  setActive(active) {
    this.isActive = active;
    if (active && !this.explored) {
      this.explore();
    }
  }

  /**
   * Check if a position is inside this room
   * @param {Object} position - {x, y}
   * @returns {boolean}
   */
  containsPosition(position) {
    const { x, y, width, height } = this.worldBounds;
    return (
      position.x >= x &&
      position.x <= x + width &&
      position.y >= y &&
      position.y <= y + height
    );
  }

  /**
   * Get center position of the room
   * @returns {Object} {x, y}
   */
  getCenter() {
    return {
      x: this.worldBounds.x + this.worldBounds.width / 2,
      y: this.worldBounds.y + this.worldBounds.height / 2
    };
  }

  /**
   * Serialize room to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      gridPosition: { ...this.gridPosition },
      worldBounds: { ...this.worldBounds },
      size: { ...this.size },
      connections: Array.from(this.connections.entries()),
      doors: this.doors.map(d => ({ ...d })),
      explored: this.explored,
      cleared: this.cleared,
      enemyCount: this.enemies.length,
      lootPointCount: this.lootPoints.length
    };
  }

  /**
   * Create room from JSON data
   * @param {Object} data
   * @returns {DungeonRoom}
   */
  static fromJSON(data) {
    const room = new DungeonRoom({
      id: data.id,
      type: data.type,
      gridPosition: data.gridPosition,
      worldBounds: data.worldBounds,
      size: data.size
    });

    // Restore connections
    if (data.connections) {
      data.connections.forEach(([direction, roomId]) => {
        room.connections.set(direction, roomId);
      });
    }

    // Restore doors
    if (data.doors) {
      room.doors = data.doors;
    }

    room.explored = data.explored || false;
    room.cleared = data.cleared || false;

    return room;
  }
}

// Export constants and class
export {
  DungeonRoom,
  ROOM_TYPES,
  DIRECTIONS,
  OPPOSITE_DIRECTION,
  ROOM_SIZES
};

export default DungeonRoom;
