/**
 * MaterialCraftingSystem.js - Crafting System for Tools, Weapons, and Equipment
 *
 * Manages the crafting workflow:
 * - Validates material requirements
 * - Consumes materials from inventory
 * - Creates crafted items with quality modifiers
 * - Tracks crafting statistics
 * - Emits events for UI updates
 *
 * Part of Phase 3: Gameplay Mechanics Integration
 *
 * Usage:
 *   const craftingSystem = new MaterialCraftingSystem(gameStore);
 *   const result = craftingSystem.craftItem('ironSword', { tool: equippedTool });
 *   if (result.success) {
 *     // Item crafted and added to inventory
 *   }
 */

import { CRAFTING_RECIPES, canCraft, consumeMaterials } from '../../data/craftingRecipes.js';

/**
 * Crafting result states
 */
export const CRAFT_RESULT = {
  SUCCESS: 'success',
  INSUFFICIENT_MATERIALS: 'insufficient_materials',
  RECIPE_NOT_FOUND: 'recipe_not_found',
  INVALID_RECIPE: 'invalid_recipe',
};

/**
 * Quality tiers for crafted items based on tool quality
 */
export const QUALITY_TIERS = {
  POOR: { name: 'Poor', multiplier: 0.7, color: '#9e9e9e' },
  NORMAL: { name: 'Normal', multiplier: 1.0, color: '#ffffff' },
  GOOD: { name: 'Good', multiplier: 1.2, color: '#4caf50' },
  EXCELLENT: { name: 'Excellent', multiplier: 1.5, color: '#2196f3' },
  MASTERWORK: { name: 'Masterwork', multiplier: 2.0, color: '#9c27b0' },
};

/**
 * MaterialCraftingSystem - Manages item crafting from harvested materials
 */
export class MaterialCraftingSystem {
  /**
   * Create a crafting system
   * @param {object} gameStore - Zustand game store reference
   * @param {object} options - System options
   * @param {number} options.baseCraftTime - Base crafting time in ms (default: 2000)
   * @param {boolean} options.enableQualitySystem - Enable quality modifiers (default: true)
   * @param {boolean} options.enableSkillSystem - Enable skill-based bonuses (default: false)
   */
  constructor(gameStore, options = {}) {
    this.gameStore = gameStore;

    // Configuration
    this.baseCraftTime = options.baseCraftTime || 2000; // 2 seconds default
    this.enableQualitySystem = options.enableQualitySystem !== false;
    this.enableSkillSystem = options.enableSkillSystem || false;

    // Statistics
    this.stats = {
      itemsCrafted: 0,
      totalCraftTime: 0,
      craftsByRecipe: {}, // { recipeId: count }
      craftsByQuality: {}, // { qualityName: count }
      failedCrafts: 0,
    };

    // Event callbacks
    this.callbacks = {
      onCraftStart: null,
      onCraftProgress: null,
      onCraftComplete: null,
      onCraftFailed: null,
    };

    // Active crafting state (for future async crafting)
    this.activeCraft = null;
  }

  /**
   * Check if a recipe can be crafted with current materials
   * @param {string} recipeId - Recipe identifier
   * @returns {object} { canCraft: boolean, missing: { material: amount } }
   */
  canCraftRecipe(recipeId) {
    const recipe = CRAFTING_RECIPES[recipeId];
    if (!recipe) {
      return { canCraft: false, reason: CRAFT_RESULT.RECIPE_NOT_FOUND };
    }

    const inventory = this.gameStore.getState().inventory;
    const hasMaterials = canCraft(recipe, inventory);

    if (!hasMaterials) {
      // Calculate missing materials
      const missing = {};
      for (const [material, required] of Object.entries(recipe.requirements || {})) {
        const available = inventory.materials[material] || 0;
        if (available < required) {
          missing[material] = required - available;
        }
      }
      return {
        canCraft: false,
        reason: CRAFT_RESULT.INSUFFICIENT_MATERIALS,
        missing
      };
    }

    return { canCraft: true };
  }

  /**
   * Craft an item from a recipe
   * @param {string} recipeId - Recipe identifier
   * @param {object} options - Crafting options
   * @param {object} options.tool - Equipped tool (affects quality)
   * @param {number} options.skillLevel - Player crafting skill level (0-100)
   * @returns {object} { success, result, item, quality }
   */
  craftItem(recipeId, options = {}) {
    const recipe = CRAFTING_RECIPES[recipeId];

    // Validate recipe exists
    if (!recipe) {
      this.stats.failedCrafts++;
      this._emitCallback('onCraftFailed', {
        reason: CRAFT_RESULT.RECIPE_NOT_FOUND,
        recipeId
      });
      return {
        success: false,
        result: CRAFT_RESULT.RECIPE_NOT_FOUND
      };
    }

    // Check if player has materials
    const canCraftCheck = this.canCraftRecipe(recipeId);
    if (!canCraftCheck.canCraft) {
      this.stats.failedCrafts++;
      this._emitCallback('onCraftFailed', {
        reason: canCraftCheck.reason,
        recipeId,
        missing: canCraftCheck.missing
      });
      return {
        success: false,
        result: canCraftCheck.reason,
        missing: canCraftCheck.missing
      };
    }

    // Emit craft start event
    this._emitCallback('onCraftStart', { recipeId, recipe });

    // Calculate quality based on tool and skill
    const quality = this._calculateQuality(recipe, options);

    // Create crafted item with quality modifiers
    const craftedItem = this._createCraftedItem(recipe, quality);

    // Consume materials from inventory
    const inventory = this.gameStore.getState().inventory;
    const newMaterials = consumeMaterials(recipe, inventory);

    // Update inventory with consumed materials and new item
    this.gameStore.setState((state) => ({
      inventory: {
        ...state.inventory,
        materials: newMaterials,
        items: [...(state.inventory.items || []), craftedItem],
      },
    }));

    // Update statistics
    this.stats.itemsCrafted++;
    this.stats.craftsByRecipe[recipeId] = (this.stats.craftsByRecipe[recipeId] || 0) + 1;
    this.stats.craftsByQuality[quality.name] = (this.stats.craftsByQuality[quality.name] || 0) + 1;

    // Emit craft complete event
    this._emitCallback('onCraftComplete', {
      recipeId,
      recipe,
      item: craftedItem,
      quality
    });

    return {
      success: true,
      result: CRAFT_RESULT.SUCCESS,
      item: craftedItem,
      quality
    };
  }

  /**
   * Craft multiple items at once (batch crafting)
   * @param {string} recipeId - Recipe identifier
   * @param {number} count - Number of items to craft
   * @param {object} options - Crafting options
   * @returns {object} { success, crafted, failed, items }
   */
  craftMultiple(recipeId, count, options = {}) {
    const results = {
      success: true,
      crafted: 0,
      failed: 0,
      items: [],
      failedReasons: [],
    };

    for (let i = 0; i < count; i++) {
      const result = this.craftItem(recipeId, options);
      if (result.success) {
        results.crafted++;
        results.items.push(result.item);
      } else {
        results.failed++;
        results.failedReasons.push(result.result);
        // Stop if we run out of materials
        if (result.result === CRAFT_RESULT.INSUFFICIENT_MATERIALS) {
          break;
        }
      }
    }

    results.success = results.crafted > 0;
    return results;
  }

  /**
   * Get all craftable recipes based on current materials
   * @returns {array} Array of { recipeId, recipe, canCraft, missing }
   */
  getCraftableRecipes() {
    const recipes = [];

    for (const [recipeId, recipe] of Object.entries(CRAFTING_RECIPES)) {
      const craftCheck = this.canCraftRecipe(recipeId);
      recipes.push({
        recipeId,
        recipe,
        canCraft: craftCheck.canCraft,
        missing: craftCheck.missing || {},
      });
    }

    return recipes;
  }

  /**
   * Get recipes filtered by type
   * @param {string} type - Item type (WEAPON, ARMOR, etc.)
   * @returns {array} Array of { recipeId, recipe, canCraft, missing }
   */
  getRecipesByType(type) {
    return this.getCraftableRecipes().filter(r => r.recipe.type === type);
  }

  /**
   * Calculate item quality based on tool and skill
   * @private
   */
  _calculateQuality(recipe, options = {}) {
    if (!this.enableQualitySystem) {
      return QUALITY_TIERS.NORMAL;
    }

    let qualityScore = 50; // Base 50/100

    // Tool quality modifier (0-30 points)
    if (options.tool && options.tool.craftingBonus) {
      qualityScore += options.tool.craftingBonus;
    }

    // Skill level modifier (0-20 points)
    if (this.enableSkillSystem && options.skillLevel) {
      qualityScore += options.skillLevel * 0.2;
    }

    // Random variance (0-10 points)
    qualityScore += Math.random() * 10;

    // Determine quality tier
    if (qualityScore >= 90) return QUALITY_TIERS.MASTERWORK;
    if (qualityScore >= 75) return QUALITY_TIERS.EXCELLENT;
    if (qualityScore >= 60) return QUALITY_TIERS.GOOD;
    if (qualityScore >= 40) return QUALITY_TIERS.NORMAL;
    return QUALITY_TIERS.POOR;
  }

  /**
   * Create a crafted item instance with quality modifiers
   * @private
   */
  _createCraftedItem(recipe, quality) {
    const item = {
      ...recipe,
      craftedAt: Date.now(),
      quality: quality.name,
      qualityMultiplier: quality.multiplier,
      qualityColor: quality.color,
    };

    // Apply quality multiplier to stats
    if (recipe.stats && quality.multiplier !== 1.0) {
      item.stats = {};
      for (const [stat, value] of Object.entries(recipe.stats)) {
        item.stats[stat] = Math.floor(value * quality.multiplier);
      }
    }

    return item;
  }

  /**
   * Register event callback
   * @param {string} event - Event name (onCraftStart, onCraftComplete, etc.)
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
   * Get crafting statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      averageCraftTime: this.stats.itemsCrafted > 0
        ? this.stats.totalCraftTime / this.stats.itemsCrafted
        : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      itemsCrafted: 0,
      totalCraftTime: 0,
      craftsByRecipe: {},
      craftsByQuality: {},
      failedCrafts: 0,
    };
  }

  /**
   * Serialize state for save/load
   * @returns {object} Serialized state
   */
  serialize() {
    return {
      stats: this.stats,
    };
  }

  /**
   * Deserialize state from save data
   * @param {object} data - Saved state data
   */
  deserialize(data) {
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }
  }
}

export default MaterialCraftingSystem;
