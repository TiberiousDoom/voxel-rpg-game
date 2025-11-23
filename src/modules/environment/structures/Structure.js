/**
 * Structure.js
 * Represents a structure instance in the world (ruin, hut, village, etc.)
 *
 * Phase 3D: Structure Generation
 */

/**
 * Structure class - Represents a placed structure in the world
 */
export class Structure {
  constructor(id, templateId, template, position, rotation = 0) {
    this.id = id; // Unique structure ID
    this.templateId = templateId; // Template this was created from
    this.template = template; // Reference to structure template
    this.position = position; // {x, z} world coordinates (bottom-left corner)
    this.rotation = rotation; // 0, 90, 180, 270 degrees
    this.width = template.width;
    this.height = template.height;
    this.tiles = this.rotateTiles(template.tiles, rotation);
    this.lootSpawned = false; // Track if loot has been spawned
    this.npcsSpawned = false; // Track if NPCs have been spawned
    this.discoveredBy = new Set(); // Player IDs who discovered this
    this.createdAt = Date.now();
  }

  /**
   * Rotate tile layout based on rotation angle
   * @private
   */
  rotateTiles(tiles, rotation) {
    if (rotation === 0) return [...tiles];

    const width = this.template.width;
    const height = this.template.height;
    const rotated = [];

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const srcIndex = row * width + col;
        let destIndex;

        switch (rotation) {
          case 90:
            destIndex = col * height + (height - 1 - row);
            break;
          case 180:
            destIndex = (height - 1 - row) * width + (width - 1 - col);
            break;
          case 270:
            destIndex = (width - 1 - col) * height + row;
            break;
          default:
            destIndex = srcIndex;
        }

        rotated[destIndex] = tiles[srcIndex];
      }
    }

    return rotated;
  }

  /**
   * Get tile at local coordinates
   * @param {number} localX - X coordinate relative to structure origin
   * @param {number} localZ - Z coordinate relative to structure origin
   * @returns {object|null} Tile data or null
   */
  getTileAt(localX, localZ) {
    if (localX < 0 || localX >= this.width || localZ < 0 || localZ >= this.height) {
      return null;
    }

    const index = localZ * this.width + localX;
    return this.tiles[index] || null;
  }

  /**
   * Get world coordinates for a local structure position
   * @param {number} localX - Local X coordinate
   * @param {number} localZ - Local Z coordinate
   * @returns {object} {x, z} in world coordinates
   */
  localToWorld(localX, localZ) {
    return {
      x: this.position.x + localX,
      z: this.position.z + localZ,
    };
  }

  /**
   * Get local coordinates from world position
   * @param {number} worldX - World X coordinate
   * @param {number} worldZ - World Z coordinate
   * @returns {object|null} {x, z} in local coordinates or null if outside
   */
  worldToLocal(worldX, worldZ) {
    const localX = worldX - this.position.x;
    const localZ = worldZ - this.position.z;

    if (localX < 0 || localX >= this.width || localZ < 0 || localZ >= this.height) {
      return null;
    }

    return { x: localX, z: localZ };
  }

  /**
   * Check if world position is inside structure bounds
   * @param {number} worldX - World X coordinate
   * @param {number} worldZ - World Z coordinate
   * @returns {boolean}
   */
  containsPosition(worldX, worldZ) {
    return (
      worldX >= this.position.x &&
      worldX < this.position.x + this.width &&
      worldZ >= this.position.z &&
      worldZ < this.position.z + this.height
    );
  }

  /**
   * Get all loot spawn points (world coordinates)
   * @returns {Array} Array of {x, z, lootTable}
   */
  getLootSpawnPoints() {
    if (!this.template.lootSpawns) return [];

    return this.template.lootSpawns.map(spawn => {
      const worldPos = this.localToWorld(spawn.x, spawn.z);
      return {
        ...worldPos,
        lootTable: spawn.lootTable || 'default',
        chance: spawn.chance || 1.0,
      };
    });
  }

  /**
   * Get all NPC spawn points (world coordinates)
   * @returns {Array} Array of {x, z, npcType, behavior}
   */
  getNPCSpawnPoints() {
    if (!this.template.npcSpawns) return [];

    return this.template.npcSpawns.map(spawn => {
      const worldPos = this.localToWorld(spawn.x, spawn.z);
      return {
        ...worldPos,
        npcType: spawn.npcType || 'villager',
        behavior: spawn.behavior || 'idle',
        faction: spawn.faction || 'neutral',
      };
    });
  }

  /**
   * Get entrance position (world coordinates)
   * @returns {object|null} {x, z} or null if no entrance
   */
  getEntrancePosition() {
    if (!this.template.entrance) return null;

    return this.localToWorld(this.template.entrance.x, this.template.entrance.z);
  }

  /**
   * Mark structure as discovered by player
   * @param {string} playerId - Player ID
   */
  discoverBy(playerId) {
    this.discoveredBy.add(playerId);
  }

  /**
   * Check if discovered by player
   * @param {string} playerId - Player ID
   * @returns {boolean}
   */
  isDiscoveredBy(playerId) {
    return this.discoveredBy.has(playerId);
  }

  /**
   * Get structure bounds (for collision/overlap detection)
   * @returns {object} {left, top, right, bottom}
   */
  getBounds() {
    return {
      left: this.position.x,
      top: this.position.z,
      right: this.position.x + this.width,
      bottom: this.position.z + this.height,
    };
  }

  /**
   * Serialize structure for saving
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      templateId: this.templateId,
      position: this.position,
      rotation: this.rotation,
      lootSpawned: this.lootSpawned,
      npcsSpawned: this.npcsSpawned,
      discoveredBy: Array.from(this.discoveredBy),
      createdAt: this.createdAt,
    };
  }

  /**
   * Deserialize structure from saved data
   * @param {object} data - Saved structure data
   * @param {object} template - Structure template
   * @returns {Structure}
   */
  static fromJSON(data, template) {
    const structure = new Structure(
      data.id,
      data.templateId,
      template,
      data.position,
      data.rotation
    );

    structure.lootSpawned = data.lootSpawned || false;
    structure.npcsSpawned = data.npcsSpawned || false;
    structure.discoveredBy = new Set(data.discoveredBy || []);
    structure.createdAt = data.createdAt || Date.now();

    return structure;
  }
}

export default Structure;
