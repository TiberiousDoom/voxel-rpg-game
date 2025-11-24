/**
 * MaterialCraftingSystem.test.js - Unit tests for crafting system
 *
 * Tests:
 * - Recipe validation and checking
 * - Item crafting with material consumption
 * - Quality system and modifiers
 * - Batch crafting
 * - Statistics tracking
 * - Event callbacks
 * - Serialization/deserialization
 */

import { MaterialCraftingSystem, CRAFT_RESULT, QUALITY_TIERS } from '../MaterialCraftingSystem.js';
import { CRAFTING_RECIPES, ITEM_TYPES } from '../../../data/craftingRecipes.js';

/**
 * Mock game store for testing
 */
const createMockStore = (initialState = {}) => {
  let state = {
    inventory: {
      gold: 100,
      items: [],
      materials: {
        wood: 20,
        iron: 15,
        leather: 10,
        crystal: 5,
        essence: 5,
      },
    },
    ...initialState,
  };

  return {
    getState: () => state,
    setState: (updater) => {
      if (typeof updater === 'function') {
        state = { ...state, ...updater(state) };
      } else {
        state = { ...state, ...updater };
      }
    },
  };
};

describe('MaterialCraftingSystem', () => {
  describe('Constructor', () => {
    test('creates system with default options', () => {
      const store = createMockStore();
      const system = new MaterialCraftingSystem(store);

      expect(system.gameStore).toBe(store);
      expect(system.baseCraftTime).toBe(2000);
      expect(system.enableQualitySystem).toBe(true);
      expect(system.enableSkillSystem).toBe(false);
      expect(system.stats.itemsCrafted).toBe(0);
    });

    test('creates system with custom options', () => {
      const store = createMockStore();
      const system = new MaterialCraftingSystem(store, {
        baseCraftTime: 1000,
        enableQualitySystem: false,
        enableSkillSystem: true,
      });

      expect(system.baseCraftTime).toBe(1000);
      expect(system.enableQualitySystem).toBe(false);
      expect(system.enableSkillSystem).toBe(true);
    });

    test('initializes empty statistics', () => {
      const store = createMockStore();
      const system = new MaterialCraftingSystem(store);

      expect(system.stats).toEqual({
        itemsCrafted: 0,
        totalCraftTime: 0,
        craftsByRecipe: {},
        craftsByQuality: {},
        failedCrafts: 0,
      });
    });
  });

  describe('canCraftRecipe()', () => {
    test('returns true when player has sufficient materials', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 10, wood: 5 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const result = system.canCraftRecipe('ironSword');

      expect(result.canCraft).toBe(true);
    });

    test('returns false when player lacks materials', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 2, wood: 1 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const result = system.canCraftRecipe('ironSword');

      expect(result.canCraft).toBe(false);
      expect(result.reason).toBe(CRAFT_RESULT.INSUFFICIENT_MATERIALS);
      expect(result.missing).toEqual({ iron: 3, wood: 1 });
    });

    test('returns false for non-existent recipe', () => {
      const store = createMockStore();
      const system = new MaterialCraftingSystem(store);

      const result = system.canCraftRecipe('nonExistentRecipe');

      expect(result.canCraft).toBe(false);
      expect(result.reason).toBe(CRAFT_RESULT.RECIPE_NOT_FOUND);
    });

    test('calculates missing materials correctly', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 3, wood: 0, leather: 0 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const result = system.canCraftRecipe('leatherArmor'); // Requires leather: 8, wood: 2

      expect(result.canCraft).toBe(false);
      expect(result.missing).toEqual({ leather: 8, wood: 2 });
    });
  });

  describe('craftItem()', () => {
    test('successfully crafts item with sufficient materials', () => {
      const store = createMockStore({
        inventory: {
          items: [],
          materials: { iron: 10, wood: 5 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const result = system.craftItem('ironSword');

      expect(result.success).toBe(true);
      expect(result.result).toBe(CRAFT_RESULT.SUCCESS);
      expect(result.item).toBeDefined();
      expect(result.item.id).toBe('ironSword');
      expect(result.item.quality).toBeDefined();
    });

    test('consumes materials from inventory', () => {
      const store = createMockStore({
        inventory: {
          items: [],
          materials: { iron: 10, wood: 5 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword'); // Requires iron: 5, wood: 2

      const materials = store.getState().inventory.materials;
      expect(materials.iron).toBe(5);
      expect(materials.wood).toBe(3);
    });

    test('adds crafted item to inventory', () => {
      const store = createMockStore({
        inventory: {
          items: [],
          materials: { iron: 10, wood: 5 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword');

      const items = store.getState().inventory.items;
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('ironSword');
    });

    test('fails when recipe not found', () => {
      const store = createMockStore();
      const system = new MaterialCraftingSystem(store);

      const result = system.craftItem('nonExistentRecipe');

      expect(result.success).toBe(false);
      expect(result.result).toBe(CRAFT_RESULT.RECIPE_NOT_FOUND);
    });

    test('fails when insufficient materials', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 2, wood: 1 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const result = system.craftItem('ironSword');

      expect(result.success).toBe(false);
      expect(result.result).toBe(CRAFT_RESULT.INSUFFICIENT_MATERIALS);
      expect(result.missing).toBeDefined();
    });

    test('updates crafting statistics on success', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 10, wood: 5 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword');

      expect(system.stats.itemsCrafted).toBe(1);
      expect(system.stats.craftsByRecipe['ironSword']).toBe(1);
      expect(system.stats.failedCrafts).toBe(0);
    });

    test('updates failed craft statistics on failure', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 1, wood: 1 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword');

      expect(system.stats.itemsCrafted).toBe(0);
      expect(system.stats.failedCrafts).toBe(1);
    });

    test('crafted item includes timestamp', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 10, wood: 5 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const before = Date.now();
      const result = system.craftItem('ironSword');
      const after = Date.now();

      expect(result.item.craftedAt).toBeGreaterThanOrEqual(before);
      expect(result.item.craftedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('Quality System', () => {
    test('applies quality multiplier to item stats', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50, crystal: 50, essence: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      // Craft multiple times to get different qualities
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(system.craftItem('ironSword'));
      }

      // At least one should have modified stats due to quality
      const hasQualityVariance = results.some(r =>
        r.item.stats.damage !== CRAFTING_RECIPES.ironSword.stats.damage
      );
      expect(hasQualityVariance).toBe(true);
    });

    test('tool crafting bonus improves quality', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      // Craft without tool
      const withoutTool = system.craftItem('ironSword');

      // Reset materials
      store.setState({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });

      // Craft with high-quality tool
      const withTool = system.craftItem('ironSword', {
        tool: { craftingBonus: 30 },
      });

      // Tool bonus should generally produce better or equal quality
      expect(withTool.quality.multiplier).toBeGreaterThanOrEqual(withoutTool.quality.multiplier);
    });

    test('disables quality system when configured', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 10, wood: 5 },
        },
      });
      const system = new MaterialCraftingSystem(store, {
        enableQualitySystem: false,
      });

      const result = system.craftItem('ironSword');

      expect(result.quality).toBe(QUALITY_TIERS.NORMAL);
      expect(result.item.qualityMultiplier).toBe(1.0);
    });

    test('skill level improves quality when enabled', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store, {
        enableSkillSystem: true,
      });

      // Craft with low skill
      const lowSkill = system.craftItem('ironSword', { skillLevel: 10 });

      // Reset materials
      store.setState({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });

      // Craft with high skill
      const highSkill = system.craftItem('ironSword', { skillLevel: 100 });

      // Higher skill should generally produce better or equal quality
      expect(highSkill.quality.multiplier).toBeGreaterThanOrEqual(lowSkill.quality.multiplier);
    });
  });

  describe('craftMultiple()', () => {
    test('crafts multiple items successfully', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 20, wood: 10 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const result = system.craftMultiple('ironSword', 3);

      expect(result.success).toBe(true);
      expect(result.crafted).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.items.length).toBe(3);
    });

    test('stops when materials run out', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 12, wood: 6 }, // Enough for 2 swords (5 iron, 2 wood each)
        },
      });
      const system = new MaterialCraftingSystem(store);

      const result = system.craftMultiple('ironSword', 5);

      expect(result.crafted).toBe(2);
      expect(result.failed).toBe(1);
    });

    test('returns empty array when no materials', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 0, wood: 0 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const result = system.craftMultiple('ironSword', 3);

      expect(result.success).toBe(false);
      expect(result.crafted).toBe(0);
      expect(result.items.length).toBe(0);
    });
  });

  describe('getCraftableRecipes()', () => {
    test('returns all recipes with craftability status', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 100, wood: 100, leather: 100, crystal: 100, essence: 100 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const recipes = system.getCraftableRecipes();

      expect(recipes.length).toBeGreaterThan(0);
      expect(recipes[0]).toHaveProperty('recipeId');
      expect(recipes[0]).toHaveProperty('recipe');
      expect(recipes[0]).toHaveProperty('canCraft');
      expect(recipes[0]).toHaveProperty('missing');
    });

    test('correctly identifies craftable vs non-craftable', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 10, wood: 5, leather: 0 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const recipes = system.getCraftableRecipes();

      // Iron sword should be craftable (iron: 5, wood: 2)
      const ironSword = recipes.find(r => r.recipeId === 'ironSword');
      expect(ironSword.canCraft).toBe(true);

      // Leather armor should not be craftable (leather: 8, wood: 2)
      const leatherArmor = recipes.find(r => r.recipeId === 'leatherArmor');
      expect(leatherArmor.canCraft).toBe(false);
      expect(leatherArmor.missing).toHaveProperty('leather');
    });
  });

  describe('getRecipesByType()', () => {
    test('filters recipes by type', () => {
      const store = createMockStore();
      const system = new MaterialCraftingSystem(store);

      const weapons = system.getRecipesByType(ITEM_TYPES.WEAPON);

      expect(weapons.length).toBeGreaterThan(0);
      weapons.forEach(r => {
        expect(r.recipe.type).toBe(ITEM_TYPES.WEAPON);
      });
    });

    test('returns empty array for type with no recipes', () => {
      const store = createMockStore();
      const system = new MaterialCraftingSystem(store);

      const boots = system.getRecipesByType(ITEM_TYPES.BOOTS);

      // No boot recipes defined yet
      expect(boots.length).toBe(0);
    });
  });

  describe('Event Callbacks', () => {
    test('emits onCraftStart event', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 10, wood: 5 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const callback = jest.fn();
      system.on('onCraftStart', callback);

      system.craftItem('ironSword');

      expect(callback).toHaveBeenCalledWith({
        recipeId: 'ironSword',
        recipe: CRAFTING_RECIPES.ironSword,
      });
    });

    test('emits onCraftComplete event', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 10, wood: 5 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const callback = jest.fn();
      system.on('onCraftComplete', callback);

      system.craftItem('ironSword');

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toHaveProperty('recipeId', 'ironSword');
      expect(callback.mock.calls[0][0]).toHaveProperty('item');
      expect(callback.mock.calls[0][0]).toHaveProperty('quality');
    });

    test('emits onCraftFailed event on insufficient materials', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 1, wood: 1 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      const callback = jest.fn();
      system.on('onCraftFailed', callback);

      system.craftItem('ironSword');

      expect(callback).toHaveBeenCalledWith({
        reason: CRAFT_RESULT.INSUFFICIENT_MATERIALS,
        recipeId: 'ironSword',
        missing: { iron: 4, wood: 1 },
      });
    });

    test('emits onCraftFailed event on invalid recipe', () => {
      const store = createMockStore();
      const system = new MaterialCraftingSystem(store);

      const callback = jest.fn();
      system.on('onCraftFailed', callback);

      system.craftItem('invalidRecipe');

      expect(callback).toHaveBeenCalledWith({
        reason: CRAFT_RESULT.RECIPE_NOT_FOUND,
        recipeId: 'invalidRecipe',
      });
    });
  });

  describe('Statistics', () => {
    test('tracks items crafted', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword');
      system.craftItem('ironSword');
      system.craftItem('ironSword');

      expect(system.stats.itemsCrafted).toBe(3);
    });

    test('tracks crafts by recipe', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50, leather: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword');
      system.craftItem('ironSword');
      system.craftItem('leatherArmor');

      expect(system.stats.craftsByRecipe['ironSword']).toBe(2);
      expect(system.stats.craftsByRecipe['leatherArmor']).toBe(1);
    });

    test('tracks crafts by quality', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      // Craft multiple to get various qualities
      for (let i = 0; i < 5; i++) {
        system.craftItem('ironSword');
      }

      const qualityStats = system.stats.craftsByQuality;
      const totalQualityCrafts = Object.values(qualityStats).reduce((a, b) => a + b, 0);

      expect(totalQualityCrafts).toBe(5);
    });

    test('resets statistics', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword');
      system.resetStats();

      expect(system.stats.itemsCrafted).toBe(0);
      expect(system.stats.craftsByRecipe).toEqual({});
      expect(system.stats.failedCrafts).toBe(0);
    });

    test('getStats returns calculated averages', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword');

      const stats = system.getStats();
      expect(stats).toHaveProperty('averageCraftTime');
      expect(stats.itemsCrafted).toBe(1);
    });
  });

  describe('Serialization', () => {
    test('serializes system state', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword');
      system.craftItem('ironSword');

      const serialized = system.serialize();

      expect(serialized).toHaveProperty('stats');
      expect(serialized.stats.itemsCrafted).toBe(2);
    });

    test('deserializes system state', () => {
      const store = createMockStore();
      const system = new MaterialCraftingSystem(store);

      const savedData = {
        stats: {
          itemsCrafted: 10,
          totalCraftTime: 20000,
          craftsByRecipe: { ironSword: 5 },
          craftsByQuality: { Normal: 8, Good: 2 },
          failedCrafts: 2,
        },
      };

      system.deserialize(savedData);

      expect(system.stats.itemsCrafted).toBe(10);
      expect(system.stats.craftsByRecipe['ironSword']).toBe(5);
    });

    test('serialize/deserialize round-trip preserves data', () => {
      const store = createMockStore({
        inventory: {
          materials: { iron: 50, wood: 50 },
        },
      });
      const system = new MaterialCraftingSystem(store);

      system.craftItem('ironSword');
      system.craftItem('ironSword');

      const serialized = system.serialize();
      const newSystem = new MaterialCraftingSystem(store);
      newSystem.deserialize(serialized);

      expect(newSystem.stats.itemsCrafted).toBe(system.stats.itemsCrafted);
      expect(newSystem.stats.craftsByRecipe).toEqual(system.stats.craftsByRecipe);
    });
  });
});
