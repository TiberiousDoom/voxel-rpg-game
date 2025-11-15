/**
 * UnifiedGameState - Central state management for hybrid game
 * Maintains state across Settlement, Expedition, and Defense modes
 */
class UnifiedGameState {
  constructor() {
    // Current game mode
    this.currentMode = 'settlement'; // 'settlement' | 'expedition' | 'defense'

    // Shared resources (cross-mode)
    this.sharedResources = {
      gold: 0,
      essence: 0,
      crystals: 0,
      food: 0,
      wood: 0,
      stone: 0
    };

    // Shared inventory (cross-mode)
    this.sharedInventory = {
      equipment: [],      // Weapons, armor, accessories
      consumables: [],    // Potions, scrolls
      materials: []       // Crafting materials
    };

    // Expedition state (null when not on expedition)
    this.expeditionState = null;

    // Defense state (null when not defending)
    this.defenseState = null;

    // Settlement state (always maintained)
    this.settlementState = {
      buildings: [],
      npcs: [],
      tick: 0,
      morale: 0
    };
  }

  /**
   * Get current game mode
   * @returns {string} Current mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Set game mode (use ModeManager instead)
   * @param {string} mode - New mode
   * @private
   */
  _setMode(mode) {
    if (!['settlement', 'expedition', 'defense'].includes(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }
    this.currentMode = mode;
  }

  /**
   * Serialize state for persistence
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      currentMode: this.currentMode,
      sharedResources: { ...this.sharedResources },
      sharedInventory: {
        equipment: [...this.sharedInventory.equipment],
        consumables: [...this.sharedInventory.consumables],
        materials: [...this.sharedInventory.materials]
      },
      expeditionState: this.expeditionState ? { ...this.expeditionState } : null,
      defenseState: this.defenseState ? { ...this.defenseState } : null,
      settlementState: { ...this.settlementState }
    };
  }

  /**
   * Deserialize state from persistence
   * @param {Object} data - Serialized state
   */
  deserialize(data) {
    this.currentMode = data.currentMode || 'settlement';
    this.sharedResources = data.sharedResources || {};
    this.sharedInventory = data.sharedInventory || { equipment: [], consumables: [], materials: [] };
    this.expeditionState = data.expeditionState || null;
    this.defenseState = data.defenseState || null;
    this.settlementState = data.settlementState || {};
  }

  /**
   * Validate state integrity
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    // Validate mode
    if (!['settlement', 'expedition', 'defense'].includes(this.currentMode)) {
      errors.push(`Invalid mode: ${this.currentMode}`);
    }

    // Validate resources
    for (const [resource, amount] of Object.entries(this.sharedResources)) {
      if (typeof amount !== 'number' || amount < 0) {
        errors.push(`Invalid resource ${resource}: ${amount}`);
      }
    }

    // Validate inventory
    if (!Array.isArray(this.sharedInventory.equipment)) {
      errors.push('Equipment must be an array');
    }
    if (!Array.isArray(this.sharedInventory.consumables)) {
      errors.push('Consumables must be an array');
    }
    if (!Array.isArray(this.sharedInventory.materials)) {
      errors.push('Materials must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default UnifiedGameState;
