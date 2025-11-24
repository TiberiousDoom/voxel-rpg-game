/**
 * DungeonLayout.js - Dungeon layout container
 *
 * Manages the collection of rooms that make up a dungeon:
 * - Stores all rooms with spatial indexing
 * - Tracks entrance and boss rooms
 * - Provides pathfinding between rooms
 * - Handles serialization for save/load
 */

import { DungeonRoom, ROOM_TYPES, DIRECTIONS, OPPOSITE_DIRECTION } from './DungeonRoom';

/**
 * DungeonLayout class
 */
class DungeonLayout {
  /**
   * Create a new dungeon layout
   * @param {Object} config - Configuration
   * @param {number} config.seed - Random seed for generation
   * @param {string} config.type - Dungeon type (CAVE, CRYPT, RUINS)
   * @param {number} config.level - Difficulty level
   */
  constructor(config = {}) {
    this.id = config.id || `dungeon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.seed = config.seed || Math.floor(Math.random() * 1000000);
    this.type = config.type || 'CAVE';
    this.level = config.level || 1;

    // Room storage
    this.rooms = new Map(); // roomId -> DungeonRoom
    this.roomGrid = new Map(); // "x,y" -> roomId (for spatial lookup)

    // Special rooms
    this.entranceRoomId = null;
    this.bossRoomId = null;
    this.treasureRoomIds = [];

    // Dungeon state
    this.state = 'ACTIVE'; // ACTIVE, COMPLETED, ABANDONED
    this.createdAt = Date.now();
    this.completedAt = null;

    // Statistics
    this.stats = {
      roomsExplored: 0,
      roomsCleared: 0,
      enemiesKilled: 0,
      treasuresFound: 0,
      timeSpent: 0,
      deaths: 0
    };
  }

  /**
   * Add a room to the layout
   * @param {DungeonRoom} room
   * @returns {boolean} Success
   */
  addRoom(room) {
    if (!(room instanceof DungeonRoom)) {
      console.warn('[DungeonLayout] Invalid room object');
      return false;
    }

    if (this.rooms.has(room.id)) {
      console.warn(`[DungeonLayout] Room already exists: ${room.id}`);
      return false;
    }

    // Add to room map
    this.rooms.set(room.id, room);

    // Add to spatial grid
    const gridKey = `${room.gridPosition.x},${room.gridPosition.y}`;
    this.roomGrid.set(gridKey, room.id);

    // Track special rooms
    if (room.type === ROOM_TYPES.ENTRANCE) {
      this.entranceRoomId = room.id;
    } else if (room.type === ROOM_TYPES.BOSS) {
      this.bossRoomId = room.id;
    } else if (room.type === ROOM_TYPES.TREASURE) {
      this.treasureRoomIds.push(room.id);
    }

    return true;
  }

  /**
   * Remove a room from the layout
   * @param {string} roomId
   * @returns {boolean} Success
   */
  removeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove from spatial grid
    const gridKey = `${room.gridPosition.x},${room.gridPosition.y}`;
    this.roomGrid.delete(gridKey);

    // Remove connections from other rooms
    room.getConnectedRoomIds().forEach(connectedId => {
      const connectedRoom = this.rooms.get(connectedId);
      if (connectedRoom) {
        // Find and remove the connection back to this room
        connectedRoom.getConnectionDirections().forEach(dir => {
          if (connectedRoom.getConnection(dir) === roomId) {
            connectedRoom.removeConnection(dir);
          }
        });
      }
    });

    // Remove from room map
    this.rooms.delete(roomId);

    // Update special room references
    if (this.entranceRoomId === roomId) this.entranceRoomId = null;
    if (this.bossRoomId === roomId) this.bossRoomId = null;
    this.treasureRoomIds = this.treasureRoomIds.filter(id => id !== roomId);

    return true;
  }

  /**
   * Get a room by ID
   * @param {string} roomId
   * @returns {DungeonRoom|null}
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Get room at grid position
   * @param {number} gridX
   * @param {number} gridY
   * @returns {DungeonRoom|null}
   */
  getRoomAt(gridX, gridY) {
    const gridKey = `${gridX},${gridY}`;
    const roomId = this.roomGrid.get(gridKey);
    return roomId ? this.rooms.get(roomId) : null;
  }

  /**
   * Get the entrance room
   * @returns {DungeonRoom|null}
   */
  getEntranceRoom() {
    return this.entranceRoomId ? this.rooms.get(this.entranceRoomId) : null;
  }

  /**
   * Get the boss room
   * @returns {DungeonRoom|null}
   */
  getBossRoom() {
    return this.bossRoomId ? this.rooms.get(this.bossRoomId) : null;
  }

  /**
   * Get all treasure rooms
   * @returns {DungeonRoom[]}
   */
  getTreasureRooms() {
    return this.treasureRoomIds.map(id => this.rooms.get(id)).filter(Boolean);
  }

  /**
   * Get neighboring rooms of a room
   * @param {string} roomId
   * @returns {DungeonRoom[]}
   */
  getRoomNeighbors(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return room.getConnectedRoomIds()
      .map(id => this.rooms.get(id))
      .filter(Boolean);
  }

  /**
   * Connect two rooms bidirectionally
   * @param {string} roomId1
   * @param {string} roomId2
   * @param {string} direction - Direction from room1 to room2
   * @returns {boolean} Success
   */
  connectRooms(roomId1, roomId2, direction) {
    const room1 = this.rooms.get(roomId1);
    const room2 = this.rooms.get(roomId2);

    if (!room1 || !room2) {
      console.warn('[DungeonLayout] Cannot connect: room not found');
      return false;
    }

    const oppositeDir = OPPOSITE_DIRECTION[direction];
    if (!oppositeDir) {
      console.warn(`[DungeonLayout] Invalid direction: ${direction}`);
      return false;
    }

    // Create bidirectional connection
    const success1 = room1.addConnection(direction, roomId2);
    const success2 = room2.addConnection(oppositeDir, roomId1);

    return success1 && success2;
  }

  /**
   * Find path from one room to another using BFS
   * @param {string} startRoomId
   * @param {string} endRoomId
   * @returns {string[]} Array of room IDs in path, or empty if no path
   */
  findPath(startRoomId, endRoomId) {
    if (startRoomId === endRoomId) return [startRoomId];

    const visited = new Set();
    const queue = [[startRoomId]];

    while (queue.length > 0) {
      const path = queue.shift();
      const currentId = path[path.length - 1];

      if (currentId === endRoomId) {
        return path;
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const room = this.rooms.get(currentId);
      if (!room) continue;

      for (const neighborId of room.getConnectedRoomIds()) {
        if (!visited.has(neighborId)) {
          queue.push([...path, neighborId]);
        }
      }
    }

    return []; // No path found
  }

  /**
   * Get path from entrance to boss room
   * @returns {string[]}
   */
  getPathToBoss() {
    if (!this.entranceRoomId || !this.bossRoomId) {
      return [];
    }
    return this.findPath(this.entranceRoomId, this.bossRoomId);
  }

  /**
   * Check if all rooms are connected (dungeon is valid)
   * @returns {boolean}
   */
  isFullyConnected() {
    if (this.rooms.size === 0) return true;

    const visited = new Set();
    const startRoom = this.rooms.values().next().value;
    const queue = [startRoom.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const room = this.rooms.get(currentId);
      if (room) {
        for (const neighborId of room.getConnectedRoomIds()) {
          if (!visited.has(neighborId)) {
            queue.push(neighborId);
          }
        }
      }
    }

    return visited.size === this.rooms.size;
  }

  /**
   * Get all rooms as array
   * @returns {DungeonRoom[]}
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * Get total room count
   * @returns {number}
   */
  getRoomCount() {
    return this.rooms.size;
  }

  /**
   * Get explored room count
   * @returns {number}
   */
  getExploredCount() {
    let count = 0;
    this.rooms.forEach(room => {
      if (room.explored) count++;
    });
    return count;
  }

  /**
   * Get cleared room count
   * @returns {number}
   */
  getClearedCount() {
    let count = 0;
    this.rooms.forEach(room => {
      if (room.cleared) count++;
    });
    return count;
  }

  /**
   * Check if dungeon is complete (boss defeated)
   * @returns {boolean}
   */
  isComplete() {
    const bossRoom = this.getBossRoom();
    return bossRoom ? bossRoom.cleared : false;
  }

  /**
   * Mark dungeon as completed
   */
  complete() {
    this.state = 'COMPLETED';
    this.completedAt = Date.now();
    this.stats.timeSpent = this.completedAt - this.createdAt;
  }

  /**
   * Mark dungeon as abandoned
   */
  abandon() {
    this.state = 'ABANDONED';
    this.stats.timeSpent = Date.now() - this.createdAt;
  }

  /**
   * Update statistics
   * @param {Object} updates
   */
  updateStats(updates) {
    Object.assign(this.stats, updates);
  }

  /**
   * Get room that contains a world position
   * @param {Object} position - {x, y} in world coordinates
   * @returns {DungeonRoom|null}
   */
  getRoomAtPosition(position) {
    for (const room of this.rooms.values()) {
      if (room.containsPosition(position)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Get bounds of entire dungeon
   * @returns {Object} {minX, minY, maxX, maxY, width, height}
   */
  getBounds() {
    if (this.rooms.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    this.rooms.forEach(room => {
      const { x, y, width, height } = room.worldBounds;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Serialize layout to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      seed: this.seed,
      type: this.type,
      level: this.level,
      state: this.state,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      entranceRoomId: this.entranceRoomId,
      bossRoomId: this.bossRoomId,
      treasureRoomIds: [...this.treasureRoomIds],
      stats: { ...this.stats },
      rooms: Array.from(this.rooms.values()).map(room => room.toJSON())
    };
  }

  /**
   * Create layout from JSON data
   * @param {Object} data
   * @returns {DungeonLayout}
   */
  static fromJSON(data) {
    const layout = new DungeonLayout({
      id: data.id,
      seed: data.seed,
      type: data.type,
      level: data.level
    });

    layout.state = data.state || 'ACTIVE';
    layout.createdAt = data.createdAt;
    layout.completedAt = data.completedAt;
    layout.stats = data.stats || layout.stats;

    // Reconstruct rooms
    if (data.rooms) {
      data.rooms.forEach(roomData => {
        const room = DungeonRoom.fromJSON(roomData);
        layout.rooms.set(room.id, room);

        // Update spatial grid
        const gridKey = `${room.gridPosition.x},${room.gridPosition.y}`;
        layout.roomGrid.set(gridKey, room.id);
      });
    }

    // Restore special room references
    layout.entranceRoomId = data.entranceRoomId;
    layout.bossRoomId = data.bossRoomId;
    layout.treasureRoomIds = data.treasureRoomIds || [];

    return layout;
  }
}

export default DungeonLayout;
export { DungeonLayout };
