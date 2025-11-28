/**
 * StructureInteractionSystem.js - Structure exploration and interaction
 *
 * Manages player interactions with structures:
 * - Loot chest spawning and collection
 * - Interactive elements (doors, puzzles)
 * - Structure discovery and tracking
 * - Rewards and loot distribution
 *
 * Part of Phase 3: Gameplay Mechanics Integration
 *
 * Usage:
 *   const interactions = new StructureInteractionSystem(structureGenerator, lootSystem);
 *   interactions.exploreSt

ructure(structureId, player);
 */

import { LootTableSystem } from '../environment/structures/LootTableSystem.js';

/**
 * Structure exploration states
 */
export const EXPLORATION_STATE = {
  UNDISCOVERED: 'undiscovered',
  DISCOVERED: 'discovered',
  EXPLORED: 'explored',
  CLEARED: 'cleared',
};

/**
 * Loot chest types
 */
export const CHEST_TYPE = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
};

/**
 * Structure type to loot table mapping
 */
const STRUCTURE_LOOT_TABLES = {
  temple: ['ruins_rare', 'monument_rare'],
  ruins: ['ruins_common', 'ruins_rare'],
  tower: ['tower_rare'],
  dungeon: ['ruins_rare', 'tower_rare'],
  shrine: ['monument_rare'],
  village: ['dwelling_common', 'camp_supplies'],
  camp: ['camp_supplies', 'camp_tools'],
  fort: ['camp_tools', 'ruins_common'],
};

/**
 * StructureInteractionSystem - Manages structure exploration
 */
export class StructureInteractionSystem {
  /**
   * Create structure interaction system
   * @param {object} structureGenerator - StructureGenerator instance
   * @param {object} options - Configuration options
   */
  constructor(structureGenerator, options = {}) {
    this.structureGenerator = structureGenerator;
    this.lootSystem = new LootTableSystem();

    // Configuration
    this.config = {
      minChestsPerStructure: options.minChestsPerStructure || 1,
      maxChestsPerStructure: options.maxChestsPerStructure || 3,
      interactionRadius: options.interactionRadius || 2, // tiles
      respawnTime: options.respawnTime || 3600000, // 1 hour default
      enableRespawn: options.enableRespawn !== false,
      ...options,
    };

    // Structure exploration state (structureId -> state data)
    this.explorationStates = new Map();

    // Loot chests (chestId -> chest data)
    this.lootChests = new Map();

    // Player interaction state
    this.playerInteractions = new Map(); // playerId -> { currentChest, interactingWith }

    // Event callbacks
    this.callbacks = {
      onStructureDiscovered: null,
      onChestOpened: null,
      onLootCollected: null,
      onStructureCleared: null,
    };

    // Statistics
    this.stats = {
      structuresDiscovered: 0,
      structuresExplored: 0,
      chestsOpened: 0,
      totalLootCollected: {},
    };

    this.nextChestId = 0;
  }

  /**
   * Discover a structure (first time player approaches)
   * @param {string} structureId - Structure identifier
   * @param {object} player - Player entity
   * @returns {object} Discovery result
   */
  discoverStructure(structureId, player) {
    const structure = this.structureGenerator.structuresById.get(structureId);
    if (!structure) {
      return { success: false, reason: 'structure_not_found' };
    }

    // Check if already discovered
    if (this.explorationStates.has(structureId)) {
      return { success: false, reason: 'already_discovered', state: this.explorationStates.get(structureId) };
    }

    // Create exploration state
    const state = {
      structureId,
      structureType: structure.type,
      discoveredAt: Date.now(),
      discoveredBy: player.id || 'player',
      explorationState: EXPLORATION_STATE.DISCOVERED,
      chestsOpened: 0,
      totalChests: 0,
      lootCollected: [],
    };

    // Generate loot chests for this structure
    this._generateChestsForStructure(structure, state);

    this.explorationStates.set(structureId, state);
    this.stats.structuresDiscovered++;

    // Emit discovery event
    this._emitCallback('onStructureDiscovered', {
      structure,
      state,
      player,
    });

    return {
      success: true,
      state,
      chestCount: state.totalChests,
    };
  }

  /**
   * Generate loot chests for a structure
   * @private
   */
  _generateChestsForStructure(structure, state) {
    const chestCount = this.config.minChestsPerStructure +
      Math.floor(Math.random() * (this.config.maxChestsPerStructure - this.config.minChestsPerStructure + 1));

    state.totalChests = chestCount;

    // Get loot tables for this structure type
    const lootTables = STRUCTURE_LOOT_TABLES[structure.type] || ['ruins_common'];

    for (let i = 0; i < chestCount; i++) {
      // Random position within structure bounds
      const chest = {
        id: `chest_${this.nextChestId++}`,
        structureId: structure.id,
        position: this._getRandomPositionInStructure(structure),
        lootTable: lootTables[Math.floor(Math.random() * lootTables.length)],
        opened: false,
        loot: null, // Generated when opened
        type: this._determineChestType(structure.type),
      };

      this.lootChests.set(chest.id, chest);
    }
  }

  /**
   * Get random position within structure bounds
   * @private
   */
  _getRandomPositionInStructure(structure) {
    const template = structure.template;
    const width = template.size?.width || 5;
    const depth = template.size?.depth || 5;

    return {
      x: structure.position.x + Math.random() * width - width / 2,
      z: structure.position.z + Math.random() * depth - depth / 2,
    };
  }

  /**
   * Determine chest type based on structure
   * @private
   */
  _determineChestType(structureType) {
    const typeChances = {
      temple: [CHEST_TYPE.RARE, CHEST_TYPE.EPIC, CHEST_TYPE.LEGENDARY],
      dungeon: [CHEST_TYPE.RARE, CHEST_TYPE.EPIC],
      ruins: [CHEST_TYPE.COMMON, CHEST_TYPE.RARE],
      tower: [CHEST_TYPE.RARE, CHEST_TYPE.EPIC],
      shrine: [CHEST_TYPE.RARE],
      village: [CHEST_TYPE.COMMON],
      camp: [CHEST_TYPE.COMMON],
      fort: [CHEST_TYPE.COMMON, CHEST_TYPE.RARE],
    };

    const types = typeChances[structureType] || [CHEST_TYPE.COMMON];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Interact with loot chest
   * @param {string} chestId - Chest identifier
   * @param {object} player - Player entity
   * @returns {object} Interaction result
   */
  openChest(chestId, player) {
    const chest = this.lootChests.get(chestId);
    if (!chest) {
      return { success: false, reason: 'chest_not_found' };
    }

    if (chest.opened) {
      return { success: false, reason: 'already_opened' };
    }

    // Check distance
    const distance = this._getDistance(player.position, chest.position);
    if (distance > this.config.interactionRadius) {
      return { success: false, reason: 'too_far', distance };
    }

    // Generate loot from table
    chest.loot = this.lootSystem.generateLoot(chest.lootTable);
    chest.opened = true;
    chest.openedAt = Date.now();
    chest.openedBy = player.id || 'player';

    // Update structure state
    const state = this.explorationStates.get(chest.structureId);
    if (state) {
      state.chestsOpened++;
      state.lootCollected.push(...chest.loot);

      // Check if structure is fully explored
      if (state.chestsOpened >= state.totalChests) {
        state.explorationState = EXPLORATION_STATE.CLEARED;
        this.stats.structuresExplored++;

        this._emitCallback('onStructureCleared', {
          structureId: chest.structureId,
          state,
          player,
        });
      }
    }

    // Update statistics
    this.stats.chestsOpened++;
    for (const item of chest.loot) {
      this.stats.totalLootCollected[item.type] = (this.stats.totalLootCollected[item.type] || 0) + item.amount;
    }

    // Emit events
    this._emitCallback('onChestOpened', {
      chest,
      player,
    });

    this._emitCallback('onLootCollected', {
      chest,
      loot: chest.loot,
      player,
    });

    return {
      success: true,
      loot: chest.loot,
      chest,
    };
  }

  /**
   * Get nearby chests
   * @param {object} position - World position {x, z}
   * @param {number} radius - Search radius
   * @returns {array} Array of nearby chests
   */
  getNearbyChests(position, radius) {
    const nearby = [];

    for (const chest of this.lootChests.values()) {
      const distance = this._getDistance(position, chest.position);
      if (distance <= radius) {
        nearby.push({
          ...chest,
          distance,
        });
      }
    }

    return nearby.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get chests in a structure
   * @param {string} structureId - Structure identifier
   * @returns {array} Array of chests
   */
  getStructureChests(structureId) {
    const chests = [];

    for (const chest of this.lootChests.values()) {
      if (chest.structureId === structureId) {
        chests.push(chest);
      }
    }

    return chests;
  }

  /**
   * Get structure exploration state
   * @param {string} structureId - Structure identifier
   * @returns {object|null} Exploration state or null
   */
  getExplorationState(structureId) {
    return this.explorationStates.get(structureId) || null;
  }

  /**
   * Calculate distance between two positions
   * @private
   */
  _getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Register event callback
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  /**
   * Emit callback event
   * @private
   */
  _emitCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event](data);
    }
  }

  /**
   * Get statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      totalChests: this.lootChests.size,
      chestsRemaining: Array.from(this.lootChests.values()).filter(c => !c.opened).length,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      structuresDiscovered: 0,
      structuresExplored: 0,
      chestsOpened: 0,
      totalLootCollected: {},
    };
  }

  /**
   * Serialize state for save/load
   * @returns {object} Serialized state
   */
  serialize() {
    return {
      explorationStates: Array.from(this.explorationStates.entries()),
      lootChests: Array.from(this.lootChests.entries()),
      stats: this.stats,
      nextChestId: this.nextChestId,
    };
  }

  /**
   * Deserialize state from save data
   * @param {object} data - Saved state data
   */
  deserialize(data) {
    if (data.explorationStates) {
      this.explorationStates = new Map(data.explorationStates);
    }
    if (data.lootChests) {
      this.lootChests = new Map(data.lootChests);
    }
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
    if (data.nextChestId !== undefined) {
      this.nextChestId = data.nextChestId;
    }
  }
}

export default StructureInteractionSystem;
