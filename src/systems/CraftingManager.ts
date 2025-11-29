/**
 * CraftingManager - Manages crafting recipes and crafting operations
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Phase 1:
 * Requires 20+ recipes functional
 */

import { getEventBus } from '@core/EventBus';
import { getInventoryManager, InventoryManager } from './InventoryManager';

// ============================================================================
// Crafting Types
// ============================================================================

export enum CraftingStation {
  Hand = 'hand',           // No station required
  Workbench = 'workbench',
  Furnace = 'furnace',
  Anvil = 'anvil',
  Alchemy = 'alchemy',
  Loom = 'loom',
}

export interface RecipeIngredient {
  resourceId: string;
  quantity: number;
  consumed: boolean;  // If false, item is a tool/catalyst
}

export interface RecipeOutput {
  resourceId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  inputs: RecipeIngredient[];
  outputs: RecipeOutput[];
  craftTime: number;         // Seconds to craft
  requiredStation: CraftingStation;
  skillRequired?: string;    // Future: skill requirements
  skillLevel?: number;
}

// ============================================================================
// Default Recipes (20+ per spec requirement)
// ============================================================================

const DEFAULT_RECIPES: Recipe[] = [
  // ===== HAND CRAFTING (No station) =====
  {
    id: 'craft_wooden_plank',
    name: 'Wooden Plank',
    description: 'Process wood into planks',
    inputs: [{ resourceId: 'wood', quantity: 1, consumed: true }],
    outputs: [{ resourceId: 'wooden_plank', quantity: 4 }],
    craftTime: 2,
    requiredStation: CraftingStation.Hand,
  },
  {
    id: 'craft_rope',
    name: 'Rope',
    description: 'Weave fibers into rope',
    inputs: [{ resourceId: 'fiber', quantity: 5, consumed: true }],
    outputs: [{ resourceId: 'rope', quantity: 1 }],
    craftTime: 3,
    requiredStation: CraftingStation.Hand,
  },
  {
    id: 'craft_bandage',
    name: 'Bandage',
    description: 'Create a simple bandage',
    inputs: [{ resourceId: 'cloth', quantity: 2, consumed: true }],
    outputs: [{ resourceId: 'bandage', quantity: 1 }],
    craftTime: 2,
    requiredStation: CraftingStation.Hand,
  },
  {
    id: 'craft_wooden_sword',
    name: 'Wooden Sword',
    description: 'Carve a basic wooden sword',
    inputs: [
      { resourceId: 'wood', quantity: 3, consumed: true },
      { resourceId: 'fiber', quantity: 2, consumed: true },
    ],
    outputs: [{ resourceId: 'wooden_sword', quantity: 1 }],
    craftTime: 5,
    requiredStation: CraftingStation.Hand,
  },
  {
    id: 'craft_arrow',
    name: 'Arrows',
    description: 'Craft a bundle of arrows',
    inputs: [
      { resourceId: 'wood', quantity: 1, consumed: true },
      { resourceId: 'stone', quantity: 1, consumed: true },
      { resourceId: 'fiber', quantity: 1, consumed: true },
    ],
    outputs: [{ resourceId: 'arrow', quantity: 10 }],
    craftTime: 4,
    requiredStation: CraftingStation.Hand,
  },

  // ===== WORKBENCH RECIPES =====
  {
    id: 'craft_stone_pickaxe',
    name: 'Stone Pickaxe',
    description: 'Craft a stone mining tool',
    inputs: [
      { resourceId: 'wood', quantity: 2, consumed: true },
      { resourceId: 'stone', quantity: 3, consumed: true },
      { resourceId: 'fiber', quantity: 2, consumed: true },
    ],
    outputs: [{ resourceId: 'stone_pickaxe', quantity: 1 }],
    craftTime: 5,
    requiredStation: CraftingStation.Workbench,
  },
  {
    id: 'craft_stone_axe',
    name: 'Stone Axe',
    description: 'Craft a stone woodcutting tool',
    inputs: [
      { resourceId: 'wood', quantity: 2, consumed: true },
      { resourceId: 'stone', quantity: 3, consumed: true },
      { resourceId: 'fiber', quantity: 2, consumed: true },
    ],
    outputs: [{ resourceId: 'stone_axe', quantity: 1 }],
    craftTime: 5,
    requiredStation: CraftingStation.Workbench,
  },
  {
    id: 'craft_stone_sword',
    name: 'Stone Sword',
    description: 'Craft a stone blade',
    inputs: [
      { resourceId: 'wood', quantity: 1, consumed: true },
      { resourceId: 'stone', quantity: 4, consumed: true },
      { resourceId: 'fiber', quantity: 2, consumed: true },
    ],
    outputs: [{ resourceId: 'stone_sword', quantity: 1 }],
    craftTime: 6,
    requiredStation: CraftingStation.Workbench,
  },
  {
    id: 'craft_bow',
    name: 'Wooden Bow',
    description: 'Craft a hunting bow',
    inputs: [
      { resourceId: 'wood', quantity: 3, consumed: true },
      { resourceId: 'fiber', quantity: 5, consumed: true },
    ],
    outputs: [{ resourceId: 'bow', quantity: 1 }],
    craftTime: 8,
    requiredStation: CraftingStation.Workbench,
  },
  {
    id: 'craft_stone_brick',
    name: 'Stone Bricks',
    description: 'Cut stone into building bricks',
    inputs: [{ resourceId: 'stone', quantity: 2, consumed: true }],
    outputs: [{ resourceId: 'stone_brick', quantity: 4 }],
    craftTime: 4,
    requiredStation: CraftingStation.Workbench,
  },

  // ===== FURNACE RECIPES =====
  {
    id: 'smelt_iron',
    name: 'Iron Ingot',
    description: 'Smelt iron ore into an ingot',
    inputs: [
      { resourceId: 'iron_ore', quantity: 2, consumed: true },
      { resourceId: 'coal', quantity: 1, consumed: true },
    ],
    outputs: [{ resourceId: 'iron_ingot', quantity: 1 }],
    craftTime: 10,
    requiredStation: CraftingStation.Furnace,
  },
  {
    id: 'smelt_copper',
    name: 'Copper Ingot',
    description: 'Smelt copper ore into an ingot',
    inputs: [
      { resourceId: 'copper_ore', quantity: 2, consumed: true },
      { resourceId: 'coal', quantity: 1, consumed: true },
    ],
    outputs: [{ resourceId: 'copper_ingot', quantity: 1 }],
    craftTime: 8,
    requiredStation: CraftingStation.Furnace,
  },
  {
    id: 'smelt_gold',
    name: 'Gold Ingot',
    description: 'Smelt gold ore into an ingot',
    inputs: [
      { resourceId: 'gold_ore', quantity: 2, consumed: true },
      { resourceId: 'coal', quantity: 1, consumed: true },
    ],
    outputs: [{ resourceId: 'gold_ingot', quantity: 1 }],
    craftTime: 12,
    requiredStation: CraftingStation.Furnace,
  },
  {
    id: 'cook_meat',
    name: 'Cooked Meat',
    description: 'Cook raw meat',
    inputs: [
      { resourceId: 'raw_meat', quantity: 1, consumed: true },
      { resourceId: 'coal', quantity: 1, consumed: true },
    ],
    outputs: [{ resourceId: 'cooked_meat', quantity: 1 }],
    craftTime: 5,
    requiredStation: CraftingStation.Furnace,
  },
  {
    id: 'bake_bread',
    name: 'Bread',
    description: 'Bake bread from fiber (wheat)',
    inputs: [
      { resourceId: 'fiber', quantity: 3, consumed: true },
      { resourceId: 'coal', quantity: 1, consumed: true },
    ],
    outputs: [{ resourceId: 'bread', quantity: 1 }],
    craftTime: 6,
    requiredStation: CraftingStation.Furnace,
  },

  // ===== ANVIL RECIPES =====
  {
    id: 'craft_iron_pickaxe',
    name: 'Iron Pickaxe',
    description: 'Forge an iron mining tool',
    inputs: [
      { resourceId: 'iron_ingot', quantity: 3, consumed: true },
      { resourceId: 'wood', quantity: 2, consumed: true },
    ],
    outputs: [{ resourceId: 'iron_pickaxe', quantity: 1 }],
    craftTime: 10,
    requiredStation: CraftingStation.Anvil,
  },
  {
    id: 'craft_iron_axe',
    name: 'Iron Axe',
    description: 'Forge an iron woodcutting tool',
    inputs: [
      { resourceId: 'iron_ingot', quantity: 3, consumed: true },
      { resourceId: 'wood', quantity: 2, consumed: true },
    ],
    outputs: [{ resourceId: 'iron_axe', quantity: 1 }],
    craftTime: 10,
    requiredStation: CraftingStation.Anvil,
  },
  {
    id: 'craft_iron_sword',
    name: 'Iron Sword',
    description: 'Forge an iron blade',
    inputs: [
      { resourceId: 'iron_ingot', quantity: 4, consumed: true },
      { resourceId: 'wood', quantity: 1, consumed: true },
      { resourceId: 'leather', quantity: 1, consumed: true },
    ],
    outputs: [{ resourceId: 'iron_sword', quantity: 1 }],
    craftTime: 12,
    requiredStation: CraftingStation.Anvil,
  },

  // ===== LOOM RECIPES =====
  {
    id: 'craft_cloth',
    name: 'Cloth',
    description: 'Weave fibers into cloth',
    inputs: [{ resourceId: 'fiber', quantity: 4, consumed: true }],
    outputs: [{ resourceId: 'cloth', quantity: 1 }],
    craftTime: 5,
    requiredStation: CraftingStation.Loom,
  },

  // ===== ALCHEMY RECIPES =====
  {
    id: 'brew_health_potion',
    name: 'Health Potion',
    description: 'Brew a healing potion',
    inputs: [
      { resourceId: 'mushroom', quantity: 3, consumed: true },
      { resourceId: 'berries', quantity: 2, consumed: true },
      { resourceId: 'monster_essence', quantity: 1, consumed: true },
    ],
    outputs: [{ resourceId: 'health_potion', quantity: 1 }],
    craftTime: 15,
    requiredStation: CraftingStation.Alchemy,
  },
];

// ============================================================================
// CraftingManager Implementation
// ============================================================================

export class CraftingManager {
  private recipes: Map<string, Recipe> = new Map();
  private activeCrafts: Map<string, { recipe: Recipe; startTime: number; stationId: string }> = new Map();

  constructor() {
    // Register default recipes
    for (const recipe of DEFAULT_RECIPES) {
      this.registerRecipe(recipe);
    }
  }

  /**
   * Register a new recipe
   */
  public registerRecipe(recipe: Recipe): void {
    this.recipes.set(recipe.id, recipe);
  }

  /**
   * Get a recipe by ID
   */
  public getRecipe(id: string): Recipe | undefined {
    return this.recipes.get(id);
  }

  /**
   * Get all recipes
   */
  public getAllRecipes(): Recipe[] {
    return Array.from(this.recipes.values());
  }

  /**
   * Get recipes for a specific station
   */
  public getRecipesForStation(station: CraftingStation): Recipe[] {
    return this.getAllRecipes().filter(r => r.requiredStation === station);
  }

  /**
   * Get recipe count (should be 20+ per spec)
   */
  public getRecipeCount(): number {
    return this.recipes.size;
  }

  /**
   * Check if player can craft a recipe
   */
  public canCraft(
    recipeId: string,
    inventory: InventoryManager,
    availableStation: CraftingStation = CraftingStation.Hand
  ): boolean {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return false;

    // Check station requirement
    if (recipe.requiredStation !== CraftingStation.Hand &&
        recipe.requiredStation !== availableStation) {
      return false;
    }

    // Check ingredients
    for (const input of recipe.inputs) {
      if (!inventory.hasItem(input.resourceId, input.quantity)) {
        return false;
      }
    }

    // Check output space
    for (const output of recipe.outputs) {
      if (!inventory.hasSpace(output.resourceId, output.quantity)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get missing ingredients for a recipe
   */
  public getMissingIngredients(
    recipeId: string,
    inventory: InventoryManager
  ): Array<{ resourceId: string; have: number; need: number }> {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return [];

    const missing: Array<{ resourceId: string; have: number; need: number }> = [];

    for (const input of recipe.inputs) {
      const have = inventory.getItemCount(input.resourceId);
      if (have < input.quantity) {
        missing.push({
          resourceId: input.resourceId,
          have,
          need: input.quantity,
        });
      }
    }

    return missing;
  }

  /**
   * Start crafting a recipe (for timed crafting)
   */
  public startCraft(
    recipeId: string,
    inventory: InventoryManager,
    stationId: string = 'hand'
  ): string | null {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return null;

    // Consume ingredients
    for (const input of recipe.inputs) {
      if (input.consumed) {
        inventory.removeItem(input.resourceId, input.quantity);
      }
    }

    const craftId = `${recipeId}_${Date.now()}`;
    this.activeCrafts.set(craftId, {
      recipe,
      startTime: Date.now(),
      stationId,
    });

    return craftId;
  }

  /**
   * Check if a craft is complete
   */
  public isCraftComplete(craftId: string): boolean {
    const craft = this.activeCrafts.get(craftId);
    if (!craft) return false;

    const elapsed = (Date.now() - craft.startTime) / 1000;
    return elapsed >= craft.recipe.craftTime;
  }

  /**
   * Get craft progress (0-1)
   */
  public getCraftProgress(craftId: string): number {
    const craft = this.activeCrafts.get(craftId);
    if (!craft) return 0;

    const elapsed = (Date.now() - craft.startTime) / 1000;
    return Math.min(1, elapsed / craft.recipe.craftTime);
  }

  /**
   * Complete a craft and receive outputs
   */
  public completeCraft(craftId: string, inventory: InventoryManager): boolean {
    const craft = this.activeCrafts.get(craftId);
    if (!craft || !this.isCraftComplete(craftId)) return false;

    // Give outputs
    for (const output of craft.recipe.outputs) {
      inventory.addItem(output.resourceId, output.quantity);
    }

    this.activeCrafts.delete(craftId);
    return true;
  }

  /**
   * Cancel an active craft (ingredients are lost)
   */
  public cancelCraft(craftId: string): boolean {
    return this.activeCrafts.delete(craftId);
  }

  /**
   * Instant craft (for simple recipes or testing)
   */
  public instantCraft(
    recipeId: string,
    inventory: InventoryManager,
    station: CraftingStation = CraftingStation.Hand
  ): boolean {
    if (!this.canCraft(recipeId, inventory, station)) return false;

    const recipe = this.getRecipe(recipeId)!;

    // Consume ingredients
    for (const input of recipe.inputs) {
      if (input.consumed) {
        inventory.removeItem(input.resourceId, input.quantity);
      }
    }

    // Give outputs
    for (const output of recipe.outputs) {
      inventory.addItem(output.resourceId, output.quantity);
    }

    return true;
  }

  /**
   * Get all craftable recipes with current inventory
   */
  public getCraftableRecipes(
    inventory: InventoryManager,
    station: CraftingStation = CraftingStation.Hand
  ): Recipe[] {
    return this.getAllRecipes().filter(recipe =>
      this.canCraft(recipe.id, inventory, station)
    );
  }
}

// ============================================================================
// Singleton Access
// ============================================================================

let craftingManagerInstance: CraftingManager | null = null;

export function getCraftingManager(): CraftingManager {
  if (!craftingManagerInstance) {
    craftingManagerInstance = new CraftingManager();
  }
  return craftingManagerInstance;
}
