/**
 * Phase 1 System Tests
 *
 * Tests for World Generation, Resources, Inventory, Crafting, and Survival systems
 */

import { describe, it, expect, beforeEach } from 'vitest';

// World Generation
import { NoiseGenerator } from '../world/NoiseGenerator';
import { BiomeManager, BiomeType } from '../world/BiomeManager';
import { WorldGenerator } from '../world/WorldGenerator';

// Resource/Inventory/Crafting
import { ResourceManager, getResourceManager, ResourceCategory } from '../systems/ResourceManager';
import { InventoryManager, getInventoryManager } from '../systems/InventoryManager';
import { CraftingManager, getCraftingManager, CraftingStation } from '../systems/CraftingManager';
import { SurvivalManager, getSurvivalManager } from '../systems/SurvivalManager';

describe('Phase 1: World Generation', () => {
  describe('NoiseGenerator', () => {
    let noise: NoiseGenerator;

    beforeEach(() => {
      noise = new NoiseGenerator(12345);
    });

    it('should generate consistent values for same seed', () => {
      const value1 = noise.perlin2D(10, 20);
      const noise2 = new NoiseGenerator(12345);
      const value2 = noise2.perlin2D(10, 20);
      expect(value1).toBe(value2);
    });

    it('should generate values in range [-1, 1] for perlin2D', () => {
      for (let i = 0; i < 100; i++) {
        const value = noise.perlin2D(i * 10, i * 5);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should generate values in range [0, 1] for perlinFBM', () => {
      for (let i = 0; i < 100; i++) {
        const value = noise.perlinFBM(i * 10, i * 5);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should generate voronoi cell IDs', () => {
      const cellId1 = noise.voronoiCellId(0, 0);
      const cellId2 = noise.voronoiCellId(1000, 1000);
      expect(cellId1).toBeTypeOf('number');
      expect(cellId2).toBeTypeOf('number');
    });
  });

  describe('BiomeManager', () => {
    let biomeManager: BiomeManager;

    beforeEach(() => {
      biomeManager = new BiomeManager();
    });

    it('should have 10 biome types defined', () => {
      const biomes = biomeManager.getAllBiomes();
      expect(biomes.length).toBe(10);
    });

    it('should determine Ocean for low height', () => {
      const biome = biomeManager.determineBiome(0.1, 0.5);
      expect(biome).toBe(BiomeType.Ocean);
    });

    it('should determine Beach for height just above ocean', () => {
      const biome = biomeManager.determineBiome(0.32, 0.5);
      expect(biome).toBe(BiomeType.Beach);
    });

    it('should determine Mountains for high height', () => {
      const biome = biomeManager.determineBiome(0.8, 0.5);
      expect(biome).toBe(BiomeType.Mountains);
    });

    it('should determine Desert for dry conditions', () => {
      const biome = biomeManager.determineBiome(0.5, 0.1);
      expect(biome).toBe(BiomeType.Desert);
    });

    it('should return walkability correctly', () => {
      expect(biomeManager.isWalkable(BiomeType.Ocean)).toBe(false);
      expect(biomeManager.isWalkable(BiomeType.Plains)).toBe(true);
    });
  });

  describe('WorldGenerator', () => {
    let worldGen: WorldGenerator;

    beforeEach(() => {
      worldGen = new WorldGenerator({ seed: 12345 });
    });

    it('should generate a region in reasonable time', () => {
      const start = performance.now();
      const region = worldGen.generateRegion(0, 0);
      const elapsed = performance.now() - start;

      // Spec: < 10 seconds for starting region
      expect(elapsed).toBeLessThan(10000);
      expect(region.tiles.length).toBeGreaterThan(0);
    });

    it('should validate generation with 5+ biomes', () => {
      const validation = worldGen.validateGeneration(1000);

      // Spec: 5+ distinct biomes in average world
      expect(validation.valid).toBe(true);
      expect(validation.biomeCount).toBeGreaterThanOrEqual(5);
    });

    it('should find a suitable spawn point', () => {
      const spawn = worldGen.findSpawnPoint();
      expect(spawn).toHaveProperty('x');
      expect(spawn).toHaveProperty('y');
    });
  });
});

describe('Phase 1: Resource System', () => {
  describe('ResourceManager', () => {
    let resourceManager: ResourceManager;

    beforeEach(() => {
      resourceManager = new ResourceManager();
    });

    it('should have default resources loaded', () => {
      expect(resourceManager.getResourceCount()).toBeGreaterThan(0);
    });

    it('should return resource by ID', () => {
      const wood = resourceManager.getResource('wood');
      expect(wood).toBeDefined();
      expect(wood?.name).toBe('Wood');
    });

    it('should filter resources by category', () => {
      const ores = resourceManager.getResourcesByCategory(ResourceCategory.Ore);
      expect(ores.length).toBeGreaterThan(0);
      ores.forEach(ore => {
        expect(ore.category).toBe(ResourceCategory.Ore);
      });
    });

    it('should identify consumable items', () => {
      expect(resourceManager.isConsumable('berries')).toBe(true);
      expect(resourceManager.isConsumable('wood')).toBe(false);
    });
  });

  describe('InventoryManager', () => {
    let inventory: InventoryManager;

    beforeEach(() => {
      inventory = new InventoryManager({ size: 10 });
    });

    it('should start with empty slots', () => {
      expect(inventory.getEmptySlotCount()).toBe(10);
    });

    it('should add items', () => {
      const remaining = inventory.addItem('wood', 5);
      expect(remaining).toBe(0);
      expect(inventory.getItemCount('wood')).toBe(5);
    });

    it('should stack items up to stack size', () => {
      inventory.addItem('wood', 99);
      inventory.addItem('wood', 10);
      expect(inventory.getItemCount('wood')).toBe(109);
    });

    it('should remove items', () => {
      inventory.addItem('wood', 10);
      const removed = inventory.removeItem('wood', 3);
      expect(removed).toBe(3);
      expect(inventory.getItemCount('wood')).toBe(7);
    });

    it('should check if has items', () => {
      inventory.addItem('stone', 5);
      expect(inventory.hasItem('stone', 5)).toBe(true);
      expect(inventory.hasItem('stone', 10)).toBe(false);
    });

    it('should move items between slots', () => {
      inventory.addItem('wood', 1);
      const result = inventory.moveItem(0, 5);
      expect(result).toBe(true);
      expect(inventory.getSlot(0)?.resourceId).toBeNull();
      expect(inventory.getSlot(5)?.resourceId).toBe('wood');
    });

    it('should serialize and deserialize', () => {
      inventory.addItem('wood', 10);
      inventory.addItem('stone', 5);

      const data = inventory.serialize();
      inventory.clear();
      expect(inventory.getItemCount('wood')).toBe(0);

      inventory.deserialize(data);
      expect(inventory.getItemCount('wood')).toBe(10);
      expect(inventory.getItemCount('stone')).toBe(5);
    });
  });
});

describe('Phase 1: Crafting System', () => {
  describe('CraftingManager', () => {
    let crafting: CraftingManager;
    let inventory: InventoryManager;

    beforeEach(() => {
      crafting = new CraftingManager();
      inventory = new InventoryManager({ size: 30 });
    });

    it('should have 20+ recipes (per spec)', () => {
      expect(crafting.getRecipeCount()).toBeGreaterThanOrEqual(20);
    });

    it('should get recipes by station', () => {
      const handRecipes = crafting.getRecipesForStation(CraftingStation.Hand);
      expect(handRecipes.length).toBeGreaterThan(0);

      const furnaceRecipes = crafting.getRecipesForStation(CraftingStation.Furnace);
      expect(furnaceRecipes.length).toBeGreaterThan(0);
    });

    it('should check if can craft with ingredients', () => {
      inventory.addItem('wood', 1);
      expect(crafting.canCraft('craft_wooden_plank', inventory)).toBe(true);
    });

    it('should not craft without ingredients', () => {
      expect(crafting.canCraft('craft_wooden_plank', inventory)).toBe(false);
    });

    it('should not craft without required station', () => {
      inventory.addItem('iron_ore', 10);
      inventory.addItem('coal', 5);

      // Furnace required, but we only have Hand
      expect(crafting.canCraft('smelt_iron', inventory, CraftingStation.Hand)).toBe(false);

      // With furnace
      expect(crafting.canCraft('smelt_iron', inventory, CraftingStation.Furnace)).toBe(true);
    });

    it('should instant craft and consume ingredients', () => {
      inventory.addItem('wood', 5);

      const result = crafting.instantCraft('craft_wooden_plank', inventory);
      expect(result).toBe(true);
      expect(inventory.getItemCount('wood')).toBe(4); // 5 - 1 used
      expect(inventory.getItemCount('wooden_plank')).toBe(4); // 1 wood = 4 planks
    });

    it('should report missing ingredients', () => {
      inventory.addItem('wood', 1);

      const missing = crafting.getMissingIngredients('craft_stone_pickaxe', inventory);
      expect(missing.length).toBeGreaterThan(0);
      expect(missing.some(m => m.resourceId === 'stone')).toBe(true);
    });
  });
});

describe('Phase 1: Survival System', () => {
  describe('SurvivalManager', () => {
    let survival: SurvivalManager;

    beforeEach(() => {
      survival = new SurvivalManager();
    });

    it('should start with full stats', () => {
      expect(survival.getHealth()).toBe(100);
      expect(survival.getHunger()).toBe(100);
      expect(survival.getStamina()).toBe(100);
    });

    it('should take damage', () => {
      survival.takeDamage(25);
      expect(survival.getHealth()).toBe(75);
    });

    it('should heal', () => {
      survival.takeDamage(50);
      survival.heal(30);
      expect(survival.getHealth()).toBe(80);
    });

    it('should not overheal', () => {
      survival.heal(50);
      expect(survival.getHealth()).toBe(100);
    });

    it('should use stamina', () => {
      const used = survival.useStamina(20);
      expect(used).toBe(true);
      expect(survival.getStamina()).toBe(80);
    });

    it('should not use more stamina than available', () => {
      survival.useStamina(95);
      const used = survival.useStamina(10);
      expect(used).toBe(false);
    });

    it('should restore hunger', () => {
      // Manually reduce hunger
      survival['hunger'] = 50;
      survival.restoreHunger(30);
      expect(survival.getHunger()).toBe(80);
    });

    it('should detect critical hunger', () => {
      survival['hunger'] = 15;
      expect(survival.isHungryCritical()).toBe(true);

      survival['hunger'] = 50;
      expect(survival.isHungryCritical()).toBe(false);
    });

    it('should consume food items', () => {
      survival.takeDamage(30);
      survival['hunger'] = 50;

      const consumed = survival.consume('cooked_meat');
      expect(consumed).toBe(true);
      expect(survival.getHealth()).toBeGreaterThan(70); // Healed
      expect(survival.getHunger()).toBeGreaterThan(50); // Hunger restored
    });

    it('should handle death and respawn', () => {
      survival.takeDamage(100);
      expect(survival.isPlayerDead()).toBe(true);

      survival.respawn();
      expect(survival.isPlayerDead()).toBe(false);
      expect(survival.getHealth()).toBe(100);
    });

    it('should get speed multiplier based on hunger', () => {
      expect(survival.getSpeedMultiplier()).toBe(1.0);

      survival['hunger'] = 10;
      expect(survival.getSpeedMultiplier()).toBe(0.5);
    });
  });
});
