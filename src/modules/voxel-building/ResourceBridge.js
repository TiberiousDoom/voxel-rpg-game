/**
 * ResourceBridge.js - Connects voxel resources to game economy
 *
 * Bridges the voxel building system with the existing game
 * inventory and crafting systems.
 *
 * Part of Phase 21: Resource Economy Integration
 */

/**
 * Maps voxel block drops to game item types
 */
export const BLOCK_TO_ITEM_MAP = {
  // Stone materials
  'stone': 'stone',
  'cobblestone': 'stone',

  // Wood materials
  'wood': 'wood',
  'wood_plank': 'wood',

  // Ores
  'coal': 'coal',
  'iron_ore': 'iron_ore',
  'gold_ore': 'gold_ore',
  'crystal': 'crystal',
  'essence': 'essence',

  // Earth materials
  'dirt': 'dirt',
  'sand': 'sand',
  'gravel': 'gravel',
  'clay': 'clay',

  // Building materials
  'brick': 'brick',
  'thatch': 'thatch',
  'glass': 'glass'
};

/**
 * Maps game items to voxel block types for construction
 */
export const ITEM_TO_BLOCK_MAP = {
  'stone': 3,      // BlockType.STONE
  'wood': 31,      // BlockType.WOOD_LOG
  'brick': 56,     // BlockType.BRICK
  'thatch': 57,    // BlockType.THATCH
  'iron_ore': 22,  // BlockType.IRON_ORE
  'gold_ore': 23   // BlockType.GOLD_ORE
};

/**
 * ResourceBridge - Manages resource flow between systems
 */
export class ResourceBridge {
  /**
   * Create resource bridge
   * @param {object} config - Configuration
   */
  constructor(config = {}) {
    this.inventorySystem = config.inventorySystem || null;
    this.craftingSystem = config.craftingSystem || null;
    this.stockpileManager = config.stockpileManager || null;
    this.voxelOrchestrator = config.voxelOrchestrator || null;

    // Statistics
    this.stats = {
      resourcesDeposited: 0,
      resourcesWithdrawn: 0,
      itemsConverted: 0
    };
  }

  /**
   * Set external references
   * @param {object} refs - System references
   */
  setReferences(refs) {
    if (refs.inventorySystem) this.inventorySystem = refs.inventorySystem;
    if (refs.craftingSystem) this.craftingSystem = refs.craftingSystem;
    if (refs.stockpileManager) this.stockpileManager = refs.stockpileManager;
    if (refs.voxelOrchestrator) this.voxelOrchestrator = refs.voxelOrchestrator;
  }

  /**
   * Convert voxel resource drop to game item
   * @param {string} voxelResource - Voxel resource type
   * @returns {string} Game item type
   */
  convertToGameItem(voxelResource) {
    return BLOCK_TO_ITEM_MAP[voxelResource] || voxelResource;
  }

  /**
   * Convert game item to voxel block
   * @param {string} gameItem - Game item type
   * @returns {number} Block type
   */
  convertToBlockType(gameItem) {
    return ITEM_TO_BLOCK_MAP[gameItem] || null;
  }

  /**
   * Deposit mined resources to stockpile and/or inventory
   * @param {string} resourceType - Resource type
   * @param {number} amount - Amount
   * @param {object} position - World position
   * @returns {object} Deposit result
   */
  depositMinedResource(resourceType, amount, position) {
    const gameItem = this.convertToGameItem(resourceType);
    let deposited = 0;
    let inStockpile = 0;
    let onGround = 0;

    // Try to deposit in stockpile first
    if (this.stockpileManager) {
      const stockpile = this.stockpileManager.findNearestStockpile(
        position.x,
        position.y,
        position.z,
        { acceptsResource: gameItem }
      );

      if (stockpile) {
        const spaceAvailable = stockpile.getAvailableSpace(gameItem);
        const toDeposit = Math.min(amount, spaceAvailable);

        if (toDeposit > 0) {
          stockpile.addResource(gameItem, toDeposit);
          inStockpile = toDeposit;
          deposited += toDeposit;
        }
      }
    }

    // Remaining resources drop on ground (create item entity)
    onGround = amount - deposited;

    this.stats.resourcesDeposited += deposited;

    return {
      resourceType: gameItem,
      total: amount,
      inStockpile,
      onGround,
      position
    };
  }

  /**
   * Withdraw resources for construction
   * @param {string} resourceType - Resource type needed
   * @param {number} amount - Amount needed
   * @returns {object} Withdrawal result
   */
  withdrawForConstruction(resourceType, amount) {
    let withdrawn = 0;

    // Try to withdraw from stockpiles
    if (this.stockpileManager) {
      const available = this.stockpileManager.getTotalResource(resourceType);
      const toWithdraw = Math.min(amount, available);

      if (toWithdraw > 0) {
        this.stockpileManager.withdrawResource(resourceType, toWithdraw);
        withdrawn = toWithdraw;
      }
    }

    this.stats.resourcesWithdrawn += withdrawn;

    return {
      resourceType,
      requested: amount,
      withdrawn,
      remaining: amount - withdrawn
    };
  }

  /**
   * Check if resources are available for a blueprint
   * @param {object} blueprint - Blueprint with materials list
   * @returns {object} Availability check result
   */
  checkBlueprintMaterials(blueprint) {
    if (!blueprint || !blueprint.materials) {
      return { available: true, missing: [] };
    }

    const missing = [];

    for (const [material, required] of Object.entries(blueprint.materials)) {
      const available = this.getTotalAvailable(material);

      if (available < required) {
        missing.push({
          material,
          required,
          available,
          deficit: required - available
        });
      }
    }

    return {
      available: missing.length === 0,
      missing
    };
  }

  /**
   * Get total available resources across all stockpiles
   * @param {string} resourceType - Resource type
   * @returns {number} Total available
   */
  getTotalAvailable(resourceType) {
    if (!this.stockpileManager) return 0;
    return this.stockpileManager.getTotalResource(resourceType);
  }

  /**
   * Reserve resources for construction
   * @param {string} siteId - Construction site ID
   * @param {object} materials - Materials to reserve
   * @returns {boolean} Success
   */
  reserveForConstruction(siteId, materials) {
    if (!this.stockpileManager) return false;

    // Check availability first
    for (const [material, amount] of Object.entries(materials)) {
      if (this.getTotalAvailable(material) < amount) {
        return false;
      }
    }

    // Reserve the materials
    for (const [material, amount] of Object.entries(materials)) {
      this.stockpileManager.reserveResource(material, amount, siteId);
    }

    return true;
  }

  /**
   * Release reserved resources (construction cancelled)
   * @param {string} siteId - Construction site ID
   */
  releaseReservation(siteId) {
    if (!this.stockpileManager) return;
    this.stockpileManager.releaseReservation(siteId);
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      stockpileResources: this.stockpileManager?.getAllResources?.() || new Map()
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      resourcesDeposited: 0,
      resourcesWithdrawn: 0,
      itemsConverted: 0
    };
  }
}

export default ResourceBridge;
