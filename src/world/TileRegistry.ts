/**
 * TileRegistry - Manages tile type definitions
 *
 * Central registry for all tile types with their properties.
 */

import { TileLayer, type TileType, type ResourceDrop } from '../core/types';

// ============================================================================
// Default Tile Types
// ============================================================================

const createTileType = (
  id: string,
  name: string,
  layer: TileLayer,
  options: Partial<Omit<TileType, 'id' | 'name' | 'layer'>> = {}
): TileType => ({
  id,
  name,
  layer,
  walkable: options.walkable ?? true,
  hardness: options.hardness ?? 1,
  transparent: options.transparent ?? true,
  drops: options.drops ?? [],
  autotileGroup: options.autotileGroup ?? null,
  buildRequirements: options.buildRequirements ?? [],
});

// ============================================================================
// TileRegistry Implementation
// ============================================================================

export class TileRegistry {
  private static instance: TileRegistry | null = null;
  private tiles: Map<string, TileType> = new Map();

  private constructor() {
    this.registerDefaultTiles();
  }

  /**
   * Get the singleton TileRegistry instance
   */
  public static getInstance(): TileRegistry {
    if (!TileRegistry.instance) {
      TileRegistry.instance = new TileRegistry();
    }
    return TileRegistry.instance;
  }

  /**
   * Reset the registry (useful for testing)
   */
  public static reset(): void {
    TileRegistry.instance = null;
  }

  /**
   * Register a new tile type
   */
  public register(tile: TileType): void {
    if (this.tiles.has(tile.id)) {
      console.warn(`Tile type "${tile.id}" is already registered. Overwriting.`);
    }
    this.tiles.set(tile.id, tile);
  }

  /**
   * Get a tile type by ID
   */
  public get(id: string): TileType | undefined {
    return this.tiles.get(id);
  }

  /**
   * Check if a tile type exists
   */
  public has(id: string): boolean {
    return this.tiles.has(id);
  }

  /**
   * Get all tile types
   */
  public getAll(): TileType[] {
    return Array.from(this.tiles.values());
  }

  /**
   * Get all tile types in a specific layer
   */
  public getByLayer(layer: TileLayer): TileType[] {
    return this.getAll().filter(t => t.layer === layer);
  }

  /**
   * Get all tile types in an autotile group
   */
  public getByAutotileGroup(group: string): TileType[] {
    return this.getAll().filter(t => t.autotileGroup === group);
  }

  /**
   * Register default tile types for the game
   * Per 2D_GAME_IMPLEMENTATION_PLAN.md - 5 Layer Standard:
   * - Layer 0 (Background): Decorative, no collision
   * - Layer 1 (Ground): Terrain, floors
   * - Layer 2 (Objects): Furniture, resources, items
   * - Layer 3 (Walls): Structures, barriers
   * - Layer 4 (Foreground): Visual overlays, roofs
   */
  private registerDefaultTiles(): void {
    // Background Layer (Layer 0) - Decorative, no collision
    // Used for visual decorations under terrain

    // Ground Layer (Layer 1) - Terrain, Floors
    this.register(createTileType('grass', 'Grass', TileLayer.Ground, {
      autotileGroup: 'grass',
      drops: [{ resourceId: 'fiber', minAmount: 0, maxAmount: 1, chance: 0.1 }],
    }));

    this.register(createTileType('dirt', 'Dirt', TileLayer.Ground, {
      autotileGroup: 'dirt',
      hardness: 0.8,
    }));

    this.register(createTileType('sand', 'Sand', TileLayer.Ground, {
      autotileGroup: 'sand',
      hardness: 0.5,
    }));

    this.register(createTileType('water', 'Water', TileLayer.Ground, {
      walkable: false,
      autotileGroup: 'water',
      hardness: -1, // Unbreakable
    }));

    this.register(createTileType('deep_water', 'Deep Water', TileLayer.Ground, {
      walkable: false,
      autotileGroup: 'water',
      hardness: -1,
    }));

    this.register(createTileType('stone_floor', 'Stone Floor', TileLayer.Ground, {
      autotileGroup: 'stone',
      hardness: 2,
      drops: [{ resourceId: 'stone', minAmount: 1, maxAmount: 2, chance: 0.5 }],
    }));

    this.register(createTileType('wooden_floor', 'Wooden Floor', TileLayer.Ground, {
      autotileGroup: 'wood_floor',
      hardness: 1,
      buildRequirements: [{ resourceId: 'wood', amount: 2 }],
      drops: [{ resourceId: 'wood', minAmount: 1, maxAmount: 2, chance: 0.8 }],
    }));

    this.register(createTileType('stone_path', 'Stone Path', TileLayer.Ground, {
      autotileGroup: 'stone_path',
      hardness: 1.5,
      buildRequirements: [{ resourceId: 'stone', amount: 2 }],
      drops: [{ resourceId: 'stone', minAmount: 1, maxAmount: 2, chance: 0.8 }],
    }));

    // Objects Layer (Layer 2) - Furniture, Resources, Items
    this.register(createTileType('tree', 'Tree', TileLayer.Objects, {
      walkable: false,
      hardness: 3,
      drops: [
        { resourceId: 'wood', minAmount: 3, maxAmount: 6, chance: 1 },
        { resourceId: 'stick', minAmount: 1, maxAmount: 3, chance: 0.5 },
      ],
    }));

    this.register(createTileType('rock', 'Rock', TileLayer.Objects, {
      walkable: false,
      hardness: 4,
      drops: [
        { resourceId: 'stone', minAmount: 2, maxAmount: 5, chance: 1 },
        { resourceId: 'flint', minAmount: 0, maxAmount: 1, chance: 0.2 },
      ],
    }));

    this.register(createTileType('iron_ore', 'Iron Ore', TileLayer.Objects, {
      walkable: false,
      hardness: 5,
      drops: [
        { resourceId: 'iron_ore', minAmount: 1, maxAmount: 3, chance: 1 },
        { resourceId: 'stone', minAmount: 1, maxAmount: 2, chance: 0.5 },
      ],
    }));

    this.register(createTileType('bush', 'Bush', TileLayer.Objects, {
      walkable: true,
      hardness: 0.5,
      drops: [
        { resourceId: 'fiber', minAmount: 1, maxAmount: 2, chance: 0.8 },
        { resourceId: 'berries', minAmount: 0, maxAmount: 2, chance: 0.3 },
      ],
    }));

    this.register(createTileType('chest', 'Chest', TileLayer.Objects, {
      walkable: false,
      hardness: 1,
      buildRequirements: [{ resourceId: 'wood', amount: 15 }],
    }));

    this.register(createTileType('workbench', 'Workbench', TileLayer.Objects, {
      walkable: false,
      hardness: 1.5,
      buildRequirements: [{ resourceId: 'wood', amount: 20 }],
    }));

    this.register(createTileType('campfire', 'Campfire', TileLayer.Objects, {
      walkable: false,
      hardness: 1,
      buildRequirements: [
        { resourceId: 'wood', amount: 5 },
        { resourceId: 'stone', amount: 3 },
      ],
    }));

    this.register(createTileType('bed', 'Bed', TileLayer.Objects, {
      walkable: false,
      hardness: 1,
      buildRequirements: [
        { resourceId: 'wood', amount: 10 },
        { resourceId: 'fiber', amount: 5 },
      ],
    }));

    // Walls Layer (Layer 3) - Structures, Barriers
    this.register(createTileType('wooden_wall', 'Wooden Wall', TileLayer.Walls, {
      walkable: false,
      transparent: false,
      autotileGroup: 'wood_wall',
      hardness: 2,
      buildRequirements: [{ resourceId: 'wood', amount: 5 }],
      drops: [{ resourceId: 'wood', minAmount: 2, maxAmount: 4, chance: 0.9 }],
    }));

    this.register(createTileType('stone_wall', 'Stone Wall', TileLayer.Walls, {
      walkable: false,
      transparent: false,
      autotileGroup: 'stone_wall',
      hardness: 4,
      buildRequirements: [{ resourceId: 'stone', amount: 8 }],
      drops: [{ resourceId: 'stone', minAmount: 3, maxAmount: 6, chance: 0.9 }],
    }));

    // Foreground Layer (Layer 4) - Visual overlays, roofs
    this.register(createTileType('roof_wood', 'Wooden Roof', TileLayer.Foreground, {
      walkable: true, // Player walks under it
      transparent: false,
      autotileGroup: 'roof_wood',
      hardness: 1,
      buildRequirements: [{ resourceId: 'wood', amount: 3 }],
    }));
  }
}

// Export singleton getter for convenience
export const getTileRegistry = (): TileRegistry => TileRegistry.getInstance();
