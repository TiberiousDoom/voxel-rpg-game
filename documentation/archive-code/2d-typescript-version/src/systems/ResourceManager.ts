/**
 * ResourceManager - Manages resource definitions and items
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Phase 1 Resource System:
 * Categories: Raw Materials, Ores, Food, Special
 */

// ============================================================================
// Resource Categories
// ============================================================================

export enum ResourceCategory {
  RawMaterial = 'raw_material',
  Ore = 'ore',
  Food = 'food',
  Tool = 'tool',
  Weapon = 'weapon',
  Armor = 'armor',
  Building = 'building',
  Special = 'special',
  Consumable = 'consumable',
}

// ============================================================================
// Resource Definition
// ============================================================================

export interface ResourceDefinition {
  id: string;
  name: string;
  description: string;
  category: ResourceCategory;
  stackSize: number;           // Max stack size (1 for non-stackable)
  value: number;               // Base trade value
  weight: number;              // Weight per unit
  durability?: number;         // For tools/weapons/armor (undefined = indestructible)
  damage?: number;             // For weapons
  protection?: number;         // For armor
  healAmount?: number;         // For food/consumables
  hungerRestore?: number;      // For food
  icon?: string;               // Icon asset path
}

// ============================================================================
// Default Resources
// ============================================================================

const DEFAULT_RESOURCES: ResourceDefinition[] = [
  // Raw Materials
  {
    id: 'wood',
    name: 'Wood',
    description: 'Basic building material gathered from trees',
    category: ResourceCategory.RawMaterial,
    stackSize: 99,
    value: 2,
    weight: 1,
  },
  {
    id: 'stone',
    name: 'Stone',
    description: 'Common stone for building and tools',
    category: ResourceCategory.RawMaterial,
    stackSize: 99,
    value: 1,
    weight: 2,
  },
  {
    id: 'fiber',
    name: 'Plant Fiber',
    description: 'Flexible plant material for crafting',
    category: ResourceCategory.RawMaterial,
    stackSize: 99,
    value: 1,
    weight: 0.2,
  },
  {
    id: 'clay',
    name: 'Clay',
    description: 'Moldable earth for pottery and bricks',
    category: ResourceCategory.RawMaterial,
    stackSize: 50,
    value: 2,
    weight: 1.5,
  },
  {
    id: 'leather',
    name: 'Leather',
    description: 'Tanned animal hide',
    category: ResourceCategory.RawMaterial,
    stackSize: 50,
    value: 5,
    weight: 0.5,
  },
  {
    id: 'cloth',
    name: 'Cloth',
    description: 'Woven fabric from plant fibers',
    category: ResourceCategory.RawMaterial,
    stackSize: 50,
    value: 4,
    weight: 0.3,
  },

  // Ores
  {
    id: 'iron_ore',
    name: 'Iron Ore',
    description: 'Raw iron ore, needs smelting',
    category: ResourceCategory.Ore,
    stackSize: 50,
    value: 5,
    weight: 3,
  },
  {
    id: 'copper_ore',
    name: 'Copper Ore',
    description: 'Raw copper ore, needs smelting',
    category: ResourceCategory.Ore,
    stackSize: 50,
    value: 3,
    weight: 2.5,
  },
  {
    id: 'gold_ore',
    name: 'Gold Ore',
    description: 'Precious gold ore, needs smelting',
    category: ResourceCategory.Ore,
    stackSize: 30,
    value: 20,
    weight: 4,
  },
  {
    id: 'coal',
    name: 'Coal',
    description: 'Fuel for smelting and crafting',
    category: ResourceCategory.Ore,
    stackSize: 50,
    value: 2,
    weight: 1,
  },
  {
    id: 'iron_ingot',
    name: 'Iron Ingot',
    description: 'Smelted iron, ready for crafting',
    category: ResourceCategory.RawMaterial,
    stackSize: 50,
    value: 10,
    weight: 2,
  },
  {
    id: 'copper_ingot',
    name: 'Copper Ingot',
    description: 'Smelted copper, ready for crafting',
    category: ResourceCategory.RawMaterial,
    stackSize: 50,
    value: 6,
    weight: 1.5,
  },
  {
    id: 'gold_ingot',
    name: 'Gold Ingot',
    description: 'Smelted gold, valuable and beautiful',
    category: ResourceCategory.RawMaterial,
    stackSize: 30,
    value: 40,
    weight: 3,
  },

  // Food
  {
    id: 'berries',
    name: 'Berries',
    description: 'Wild berries, slightly restores hunger',
    category: ResourceCategory.Food,
    stackSize: 20,
    value: 1,
    weight: 0.1,
    hungerRestore: 5,
    healAmount: 0,
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    description: 'Edible forest mushroom',
    category: ResourceCategory.Food,
    stackSize: 20,
    value: 2,
    weight: 0.1,
    hungerRestore: 8,
    healAmount: 0,
  },
  {
    id: 'raw_meat',
    name: 'Raw Meat',
    description: 'Uncooked meat, should be cooked before eating',
    category: ResourceCategory.Food,
    stackSize: 10,
    value: 5,
    weight: 0.5,
    hungerRestore: 10,
    healAmount: -5, // Raw meat is bad for you
  },
  {
    id: 'cooked_meat',
    name: 'Cooked Meat',
    description: 'Well-cooked meat, restores hunger and health',
    category: ResourceCategory.Food,
    stackSize: 10,
    value: 10,
    weight: 0.4,
    hungerRestore: 25,
    healAmount: 10,
  },
  {
    id: 'bread',
    name: 'Bread',
    description: 'Baked bread, a staple food',
    category: ResourceCategory.Food,
    stackSize: 20,
    value: 8,
    weight: 0.2,
    hungerRestore: 20,
    healAmount: 0,
  },
  {
    id: 'apple',
    name: 'Apple',
    description: 'Fresh apple from a tree',
    category: ResourceCategory.Food,
    stackSize: 20,
    value: 3,
    weight: 0.2,
    hungerRestore: 10,
    healAmount: 2,
  },
  {
    id: 'fish',
    name: 'Cooked Fish',
    description: 'Freshly caught and cooked fish',
    category: ResourceCategory.Food,
    stackSize: 10,
    value: 12,
    weight: 0.4,
    hungerRestore: 30,
    healAmount: 5,
  },

  // Tools
  {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    description: 'Basic mining tool',
    category: ResourceCategory.Tool,
    stackSize: 1,
    value: 15,
    weight: 3,
    durability: 100,
    damage: 5,
  },
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    description: 'Sturdy mining tool',
    category: ResourceCategory.Tool,
    stackSize: 1,
    value: 50,
    weight: 4,
    durability: 250,
    damage: 8,
  },
  {
    id: 'stone_axe',
    name: 'Stone Axe',
    description: 'Basic woodcutting tool',
    category: ResourceCategory.Tool,
    stackSize: 1,
    value: 15,
    weight: 2.5,
    durability: 100,
    damage: 8,
  },
  {
    id: 'iron_axe',
    name: 'Iron Axe',
    description: 'Sturdy woodcutting tool',
    category: ResourceCategory.Tool,
    stackSize: 1,
    value: 50,
    weight: 3.5,
    durability: 250,
    damage: 12,
  },

  // Weapons
  {
    id: 'wooden_sword',
    name: 'Wooden Sword',
    description: 'A basic wooden sword',
    category: ResourceCategory.Weapon,
    stackSize: 1,
    value: 10,
    weight: 1.5,
    durability: 50,
    damage: 10,
  },
  {
    id: 'stone_sword',
    name: 'Stone Sword',
    description: 'A crude stone blade',
    category: ResourceCategory.Weapon,
    stackSize: 1,
    value: 20,
    weight: 3,
    durability: 100,
    damage: 15,
  },
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'A sturdy iron blade',
    category: ResourceCategory.Weapon,
    stackSize: 1,
    value: 75,
    weight: 2.5,
    durability: 300,
    damage: 25,
  },
  {
    id: 'bow',
    name: 'Wooden Bow',
    description: 'A ranged weapon for hunting',
    category: ResourceCategory.Weapon,
    stackSize: 1,
    value: 30,
    weight: 1,
    durability: 150,
    damage: 20,
  },
  {
    id: 'arrow',
    name: 'Arrow',
    description: 'Ammunition for bows',
    category: ResourceCategory.Weapon,
    stackSize: 50,
    value: 1,
    weight: 0.1,
    damage: 5,
  },

  // Consumables
  {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'Restores health when consumed',
    category: ResourceCategory.Consumable,
    stackSize: 10,
    value: 25,
    weight: 0.5,
    healAmount: 50,
  },
  {
    id: 'bandage',
    name: 'Bandage',
    description: 'Stops bleeding and heals minor wounds',
    category: ResourceCategory.Consumable,
    stackSize: 20,
    value: 5,
    weight: 0.1,
    healAmount: 15,
  },

  // Building Materials
  {
    id: 'wooden_plank',
    name: 'Wooden Plank',
    description: 'Processed wood for building',
    category: ResourceCategory.Building,
    stackSize: 50,
    value: 5,
    weight: 1,
  },
  {
    id: 'stone_brick',
    name: 'Stone Brick',
    description: 'Cut stone for sturdy construction',
    category: ResourceCategory.Building,
    stackSize: 50,
    value: 4,
    weight: 2,
  },
  {
    id: 'rope',
    name: 'Rope',
    description: 'Woven rope for building and crafting',
    category: ResourceCategory.Building,
    stackSize: 30,
    value: 6,
    weight: 0.5,
  },

  // Special
  {
    id: 'portal_shard',
    name: 'Portal Shard',
    description: 'A mysterious crystal from a closed portal',
    category: ResourceCategory.Special,
    stackSize: 10,
    value: 100,
    weight: 0.3,
  },
  {
    id: 'monster_essence',
    name: 'Monster Essence',
    description: 'Magical essence dropped by monsters',
    category: ResourceCategory.Special,
    stackSize: 50,
    value: 15,
    weight: 0.1,
  },
];

// ============================================================================
// ResourceManager Implementation
// ============================================================================

export class ResourceManager {
  private resources: Map<string, ResourceDefinition> = new Map();

  constructor() {
    // Register default resources
    for (const resource of DEFAULT_RESOURCES) {
      this.registerResource(resource);
    }
  }

  /**
   * Register a new resource
   */
  public registerResource(resource: ResourceDefinition): void {
    this.resources.set(resource.id, resource);
  }

  /**
   * Get a resource by ID
   */
  public getResource(id: string): ResourceDefinition | undefined {
    return this.resources.get(id);
  }

  /**
   * Get all resources
   */
  public getAllResources(): ResourceDefinition[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get resources by category
   */
  public getResourcesByCategory(category: ResourceCategory): ResourceDefinition[] {
    return this.getAllResources().filter(r => r.category === category);
  }

  /**
   * Check if a resource exists
   */
  public hasResource(id: string): boolean {
    return this.resources.has(id);
  }

  /**
   * Get resource count
   */
  public getResourceCount(): number {
    return this.resources.size;
  }

  /**
   * Check if resource is stackable
   */
  public isStackable(id: string): boolean {
    const resource = this.getResource(id);
    return resource ? resource.stackSize > 1 : false;
  }

  /**
   * Get max stack size for a resource
   */
  public getStackSize(id: string): number {
    const resource = this.getResource(id);
    return resource?.stackSize ?? 1;
  }

  /**
   * Check if resource is consumable (food or consumable)
   */
  public isConsumable(id: string): boolean {
    const resource = this.getResource(id);
    if (!resource) return false;
    return resource.category === ResourceCategory.Food ||
           resource.category === ResourceCategory.Consumable;
  }

  /**
   * Check if resource is a weapon
   */
  public isWeapon(id: string): boolean {
    const resource = this.getResource(id);
    return resource?.category === ResourceCategory.Weapon;
  }

  /**
   * Check if resource is a tool
   */
  public isTool(id: string): boolean {
    const resource = this.getResource(id);
    return resource?.category === ResourceCategory.Tool;
  }
}

// ============================================================================
// Singleton Access
// ============================================================================

let resourceManagerInstance: ResourceManager | null = null;

export function getResourceManager(): ResourceManager {
  if (!resourceManagerInstance) {
    resourceManagerInstance = new ResourceManager();
  }
  return resourceManagerInstance;
}
