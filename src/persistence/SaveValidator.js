/**
 * SaveValidator.js - Save file validation and recovery
 *
 * Handles:
 * - Save integrity checks
 * - Corruption detection
 * - Partial recovery of corrupted data
 * - Checksum generation and validation
 */

const crypto = require('crypto');

class SaveValidator {
  /**
   * Required top-level save properties
   */
  static REQUIRED_FIELDS = [
    'version',
    'timestamp',
    'metadata',
    'grid',
    'storage'
  ];

  /**
   * Validate complete save structure
   * @param {Object} data - Save data to validate
   * @returns {Object} {isValid, errors}
   */
  static validateSave(data) {
    const errors = [];

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate version
    if (typeof data.version !== 'number' || data.version < 1) {
      errors.push('Invalid version format');
    }

    // Validate timestamp
    if (typeof data.timestamp !== 'string' || !this._isValidISO8601(data.timestamp)) {
      errors.push('Invalid timestamp format');
    }

    // Validate metadata
    if (!data.metadata || typeof data.metadata !== 'object') {
      errors.push('Invalid metadata object');
    } else {
      const metaErrors = this._validateMetadata(data.metadata);
      errors.push(...metaErrors);
    }

    // Validate grid
    if (!data.grid || !Array.isArray(data.grid.buildings)) {
      errors.push('Invalid grid structure');
    }

    // Validate storage
    if (!data.storage || typeof data.storage !== 'object') {
      errors.push('Invalid storage structure');
    } else {
      const storageErrors = this._validateStorage(data.storage);
      errors.push(...storageErrors);
    }

    // Validate NPCs if present
    if (data.npcs && Array.isArray(data.npcs.npcs)) {
      const npcErrors = this._validateNPCs(data.npcs);
      errors.push(...npcErrors);
    }

    // Validate territory if present
    if (data.territory && Array.isArray(data.territory.territories)) {
      const terrErrors = this._validateTerritories(data.territory);
      errors.push(...terrErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate save metadata
   * @private
   */
  static _validateMetadata(metadata) {
    const errors = [];

    if (typeof metadata.gameTick !== 'number' || metadata.gameTick < 0) {
      errors.push('Invalid gameTick in metadata');
    }

    if (typeof metadata.currentTier !== 'string') {
      errors.push('Invalid currentTier in metadata');
    }

    if (typeof metadata.isPaused !== 'boolean') {
      errors.push('Invalid isPaused in metadata');
    }

    return errors;
  }

  /**
   * Validate storage structure
   * @private
   */
  static _validateStorage(storage) {
    const errors = [];
    const resourceTypes = ['food', 'wood', 'stone', 'gold', 'essence', 'crystal'];

    for (const resource of resourceTypes) {
      if (!(resource in storage.storage)) {
        errors.push(`Missing resource in storage: ${resource}`);
      } else {
        const value = storage.storage[resource];
        if (typeof value !== 'number' || value < 0) {
          errors.push(`Invalid value for resource ${resource}: ${value}`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate NPC data
   * @private
   */
  static _validateNPCs(npcs) {
    const errors = [];

    if (!Array.isArray(npcs.npcs)) {
      errors.push('NPCs is not an array');
      return errors;
    }

    if (typeof npcs.totalSpawned !== 'number' || npcs.totalSpawned < 0) {
      errors.push('Invalid totalSpawned');
    }

    if (typeof npcs.nextId !== 'number' || npcs.nextId < 0) {
      errors.push('Invalid nextId');
    }

    // Validate each NPC
    for (let i = 0; i < npcs.npcs.length; i++) {
      const npc = npcs.npcs[i];

      if (!npc.id || typeof npc.id !== 'string') {
        errors.push(`NPC ${i}: Invalid id`);
      }

      if (typeof npc.alive !== 'boolean') {
        errors.push(`NPC ${npc.id}: Invalid alive status`);
      }

      if (typeof npc.health !== 'number' || npc.health < 0 || npc.health > 100) {
        errors.push(`NPC ${npc.id}: Invalid health (${npc.health})`);
      }
    }

    return errors;
  }

  /**
   * Validate territory data
   * @private
   */
  static _validateTerritories(territory) {
    const errors = [];

    if (!Array.isArray(territory.territories)) {
      errors.push('Territories is not an array');
      return errors;
    }

    for (let i = 0; i < territory.territories.length; i++) {
      const terr = territory.territories[i];

      if (!terr.id || typeof terr.id !== 'string') {
        errors.push(`Territory ${i}: Invalid id`);
      }

      if (typeof terr.radius !== 'number' || terr.radius <= 0) {
        errors.push(`Territory ${terr.id}: Invalid radius`);
      }
    }

    return errors;
  }

  /**
   * Generate checksum for save data
   * @param {Object} data - Save data
   * @returns {string} Checksum
   */
  static generateChecksum(data) {
    // Create a copy without checksum
    const dataCopy = { ...data };
    delete dataCopy.checksum;

    // Generate checksum from critical fields
    const criticalData = JSON.stringify({
      version: dataCopy.version,
      metadata: dataCopy.metadata,
      grid: dataCopy.grid,
      storage: dataCopy.storage,
      npcs: dataCopy.npcs
    });

    return crypto
      .createHash('sha256')
      .update(criticalData)
      .digest('hex');
  }

  /**
   * Validate save checksum
   * @param {Object} data - Save data with checksum
   * @returns {boolean} Is checksum valid
   */
  static validateChecksum(data) {
    if (!data.checksum) {
      // No checksum in file, can't validate
      return true;
    }

    const expectedChecksum = this.generateChecksum(data);
    return expectedChecksum === data.checksum;
  }

  /**
   * Attempt to repair corrupted save data
   * @param {Object} data - Potentially corrupted save data
   * @returns {Object} {success, data}
   */
  static repairSave(data) {
    if (!data || typeof data !== 'object') {
      return { success: false, data: null };
    }

    const repaired = { ...data };

    // Ensure required fields exist
    if (!repaired.version) {
      repaired.version = 1;
    }

    if (!repaired.timestamp) {
      repaired.timestamp = new Date().toISOString();
    }

    // Repair metadata
    if (!repaired.metadata || typeof repaired.metadata !== 'object') {
      repaired.metadata = this._createDefaultMetadata();
    } else {
      repaired.metadata = this._repairMetadata(repaired.metadata);
    }

    // Repair grid
    if (!repaired.grid || !Array.isArray(repaired.grid.buildings)) {
      repaired.grid = { buildings: [], width: 200, height: 100, depth: 200 };
    }

    // Repair storage
    if (!repaired.storage || typeof repaired.storage !== 'object') {
      repaired.storage = this._createDefaultStorage();
    } else {
      repaired.storage = this._repairStorage(repaired.storage);
    }

    // Repair NPCs
    if (!repaired.npcs || !Array.isArray(repaired.npcs.npcs)) {
      repaired.npcs = { npcs: [], totalSpawned: 0, nextId: 1 };
    } else {
      repaired.npcs = this._repairNPCs(repaired.npcs);
    }

    // Repair territory
    if (!repaired.territory || !Array.isArray(repaired.territory.territories)) {
      repaired.territory = { territories: [] };
    } else {
      repaired.territory = this._repairTerritories(repaired.territory);
    }

    // Regenerate checksum
    repaired.checksum = this.generateChecksum(repaired);

    return {
      success: true,
      data: repaired
    };
  }

  /**
   * Create default metadata
   * @private
   */
  static _createDefaultMetadata() {
    return {
      gameTick: 0,
      currentTier: 'SURVIVAL',
      isPaused: false,
      engineRunning: false,
      enginePaused: false,
      slotName: 'recovered',
      description: 'Recovered from corrupted save',
      savedAt: new Date().toISOString(),
      playtimeSeconds: 0
    };
  }

  /**
   * Create default storage
   * @private
   */
  static _createDefaultStorage() {
    return {
      storage: {
        food: 100,
        wood: 50,
        stone: 50,
        gold: 0,
        essence: 0,
        crystal: 0
      },
      capacity: 500,
      overflowPriority: ['wood', 'stone', 'gold', 'essence', 'crystal', 'food']
    };
  }

  /**
   * Repair metadata
   * @private
   */
  static _repairMetadata(metadata) {
    const repaired = { ...metadata };

    if (typeof repaired.gameTick !== 'number') {
      repaired.gameTick = 0;
    }

    if (typeof repaired.currentTier !== 'string') {
      repaired.currentTier = 'SURVIVAL';
    }

    if (typeof repaired.isPaused !== 'boolean') {
      repaired.isPaused = false;
    }

    return repaired;
  }

  /**
   * Repair storage
   * @private
   */
  static _repairStorage(storage) {
    const repaired = { ...storage };
    const defaultStorage = this._createDefaultStorage();

    if (!repaired.storage || typeof repaired.storage !== 'object') {
      repaired.storage = { ...defaultStorage.storage };
    } else {
      // Ensure all resources exist
      for (const [resource, value] of Object.entries(defaultStorage.storage)) {
        if (!(resource in repaired.storage) || typeof repaired.storage[resource] !== 'number') {
          repaired.storage[resource] = value;
        }
      }
    }

    return repaired;
  }

  /**
   * Repair NPC data
   * @private
   */
  static _repairNPCs(npcs) {
    const repaired = { ...npcs };

    if (!Array.isArray(repaired.npcs)) {
      repaired.npcs = [];
    } else {
      // Repair individual NPCs
      repaired.npcs = repaired.npcs.filter(npc => {
        return npc.id && typeof npc.alive === 'boolean' && typeof npc.health === 'number';
      });
    }

    if (typeof repaired.totalSpawned !== 'number') {
      repaired.totalSpawned = repaired.npcs.length;
    }

    if (typeof repaired.nextId !== 'number') {
      repaired.nextId = repaired.npcs.length + 1;
    }

    return repaired;
  }

  /**
   * Repair territory data
   * @private
   */
  static _repairTerritories(territory) {
    const repaired = { ...territory };

    if (!Array.isArray(repaired.territories)) {
      repaired.territories = [];
    } else {
      // Filter to valid territories only
      repaired.territories = repaired.territories.filter(terr => {
        return terr.id && typeof terr.radius === 'number' && terr.radius > 0;
      });
    }

    return repaired;
  }

  /**
   * Validate ISO8601 timestamp
   * @private
   */
  static _isValidISO8601(timestamp) {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Regex.test(timestamp);
  }
}

module.exports = SaveValidator;
