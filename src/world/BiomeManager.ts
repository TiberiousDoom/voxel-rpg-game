/**
 * BiomeManager - Manages biome definitions and determination
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Phase 1:
 * Biomes are determined by height and moisture values.
 * Required: 5+ distinct biomes in average world.
 */

import { TileLayer } from '@core/types';

// ============================================================================
// Biome Types
// ============================================================================

export enum BiomeType {
  Ocean = 'ocean',
  Beach = 'beach',
  Desert = 'desert',
  Plains = 'plains',
  Forest = 'forest',
  Swamp = 'swamp',
  Mountains = 'mountains',
  Snow = 'snow',
  Tundra = 'tundra',
  Jungle = 'jungle',
}

export interface BiomeDefinition {
  id: BiomeType;
  name: string;
  color: string;               // Debug/minimap color
  groundTile: string;          // Default ground tile type
  decorationTiles: string[];   // Possible decorations (trees, rocks, etc.)
  decorationDensity: number;   // 0-1 chance per tile
  resourceTiles: string[];     // Possible resources (ores, plants)
  resourceDensity: number;     // 0-1 chance per tile
  walkable: boolean;           // Can player walk here?
  buildable: boolean;          // Can player build here?
  hostileSpawnRate: number;    // Monsters per 100 tiles
}

// ============================================================================
// Biome Definitions
// ============================================================================

const BIOME_DEFINITIONS: Map<BiomeType, BiomeDefinition> = new Map([
  [BiomeType.Ocean, {
    id: BiomeType.Ocean,
    name: 'Ocean',
    color: '#1a5276',
    groundTile: 'water_deep',
    decorationTiles: ['seaweed', 'coral'],
    decorationDensity: 0.05,
    resourceTiles: ['fish_spot'],
    resourceDensity: 0.02,
    walkable: false,
    buildable: false,
    hostileSpawnRate: 0.5,
  }],
  [BiomeType.Beach, {
    id: BiomeType.Beach,
    name: 'Beach',
    color: '#f9e79f',
    groundTile: 'sand',
    decorationTiles: ['palm_tree', 'shell', 'driftwood'],
    decorationDensity: 0.08,
    resourceTiles: ['coconut', 'crab'],
    resourceDensity: 0.03,
    walkable: true,
    buildable: true,
    hostileSpawnRate: 0.2,
  }],
  [BiomeType.Desert, {
    id: BiomeType.Desert,
    name: 'Desert',
    color: '#f5b041',
    groundTile: 'sand',
    decorationTiles: ['cactus', 'dead_bush', 'skull'],
    decorationDensity: 0.04,
    resourceTiles: ['iron_ore', 'gold_ore'],
    resourceDensity: 0.02,
    walkable: true,
    buildable: true,
    hostileSpawnRate: 0.8,
  }],
  [BiomeType.Plains, {
    id: BiomeType.Plains,
    name: 'Plains',
    color: '#82e0aa',
    groundTile: 'grass',
    decorationTiles: ['tall_grass', 'flower_red', 'flower_yellow', 'small_rock'],
    decorationDensity: 0.15,
    resourceTiles: ['berry_bush', 'fiber_plant'],
    resourceDensity: 0.05,
    walkable: true,
    buildable: true,
    hostileSpawnRate: 0.3,
  }],
  [BiomeType.Forest, {
    id: BiomeType.Forest,
    name: 'Forest',
    color: '#1e8449',
    groundTile: 'grass',
    decorationTiles: ['tree_oak', 'tree_birch', 'bush', 'mushroom', 'fallen_log'],
    decorationDensity: 0.35,
    resourceTiles: ['wood_log', 'berry_bush', 'mushroom_edible', 'herb'],
    resourceDensity: 0.08,
    walkable: true,
    buildable: true,
    hostileSpawnRate: 0.5,
  }],
  [BiomeType.Swamp, {
    id: BiomeType.Swamp,
    name: 'Swamp',
    color: '#6c7a32',
    groundTile: 'mud',
    decorationTiles: ['dead_tree', 'cattail', 'lily_pad', 'moss_rock'],
    decorationDensity: 0.25,
    resourceTiles: ['slime_mold', 'swamp_herb', 'clay'],
    resourceDensity: 0.06,
    walkable: true,
    buildable: false,
    hostileSpawnRate: 1.0,
  }],
  [BiomeType.Mountains, {
    id: BiomeType.Mountains,
    name: 'Mountains',
    color: '#7f8c8d',
    groundTile: 'stone',
    decorationTiles: ['boulder', 'pine_tree', 'mountain_flower'],
    decorationDensity: 0.12,
    resourceTiles: ['iron_ore', 'copper_ore', 'coal', 'crystal'],
    resourceDensity: 0.1,
    walkable: true,
    buildable: true,
    hostileSpawnRate: 0.6,
  }],
  [BiomeType.Snow, {
    id: BiomeType.Snow,
    name: 'Snow',
    color: '#ecf0f1',
    groundTile: 'snow',
    decorationTiles: ['pine_tree_snowy', 'ice_crystal', 'snowman'],
    decorationDensity: 0.1,
    resourceTiles: ['ice', 'frozen_herb'],
    resourceDensity: 0.03,
    walkable: true,
    buildable: true,
    hostileSpawnRate: 0.4,
  }],
  [BiomeType.Tundra, {
    id: BiomeType.Tundra,
    name: 'Tundra',
    color: '#bdc3c7',
    groundTile: 'frozen_grass',
    decorationTiles: ['dead_bush', 'small_rock', 'lichen'],
    decorationDensity: 0.08,
    resourceTiles: ['fiber_plant', 'flint'],
    resourceDensity: 0.04,
    walkable: true,
    buildable: true,
    hostileSpawnRate: 0.3,
  }],
  [BiomeType.Jungle, {
    id: BiomeType.Jungle,
    name: 'Jungle',
    color: '#145a32',
    groundTile: 'jungle_grass',
    decorationTiles: ['jungle_tree', 'giant_fern', 'vine', 'exotic_flower'],
    decorationDensity: 0.45,
    resourceTiles: ['tropical_fruit', 'rare_herb', 'bamboo'],
    resourceDensity: 0.1,
    walkable: true,
    buildable: false,
    hostileSpawnRate: 1.2,
  }],
]);

// ============================================================================
// Biome Determination Thresholds
// ============================================================================

interface BiomeThresholds {
  heightOcean: number;
  heightBeach: number;
  heightMountain: number;
  heightSnow: number;
  moistureDry: number;
  moistureMedium: number;
  moistureWet: number;
  temperatureCold: number;
  temperatureHot: number;
}

const DEFAULT_THRESHOLDS: BiomeThresholds = {
  heightOcean: 0.3,
  heightBeach: 0.35,
  heightMountain: 0.75,
  heightSnow: 0.85,
  moistureDry: 0.25,
  moistureMedium: 0.5,
  moistureWet: 0.75,
  temperatureCold: 0.3,
  temperatureHot: 0.7,
};

// ============================================================================
// BiomeManager Implementation
// ============================================================================

export class BiomeManager {
  private thresholds: BiomeThresholds;

  constructor(thresholds: Partial<BiomeThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Determine biome based on height, moisture, and temperature
   * @param height - Height value [0, 1] - 0 is lowest, 1 is highest
   * @param moisture - Moisture value [0, 1] - 0 is driest, 1 is wettest
   * @param temperature - Temperature value [0, 1] - 0 is coldest, 1 is hottest
   */
  public determineBiome(
    height: number,
    moisture: number,
    temperature: number = 0.5
  ): BiomeType {
    const t = this.thresholds;

    // Ocean (deep water)
    if (height < t.heightOcean) {
      return BiomeType.Ocean;
    }

    // Beach (transition zone)
    if (height < t.heightBeach) {
      return BiomeType.Beach;
    }

    // Snow peaks
    if (height > t.heightSnow) {
      return BiomeType.Snow;
    }

    // Mountains
    if (height > t.heightMountain) {
      return temperature < t.temperatureCold ? BiomeType.Snow : BiomeType.Mountains;
    }

    // Cold biomes
    if (temperature < t.temperatureCold) {
      return moisture < t.moistureMedium ? BiomeType.Tundra : BiomeType.Snow;
    }

    // Hot biomes
    if (temperature > t.temperatureHot) {
      if (moisture < t.moistureDry) return BiomeType.Desert;
      if (moisture > t.moistureWet) return BiomeType.Jungle;
      return BiomeType.Plains;
    }

    // Temperate biomes (based on moisture)
    if (moisture < t.moistureDry) {
      return BiomeType.Desert;
    }
    if (moisture < t.moistureMedium) {
      return BiomeType.Plains;
    }
    if (moisture < t.moistureWet) {
      return BiomeType.Forest;
    }
    return BiomeType.Swamp;
  }

  /**
   * Get biome definition by type
   */
  public getBiomeDefinition(biome: BiomeType): BiomeDefinition {
    return BIOME_DEFINITIONS.get(biome)!;
  }

  /**
   * Get all biome definitions
   */
  public getAllBiomes(): BiomeDefinition[] {
    return Array.from(BIOME_DEFINITIONS.values());
  }

  /**
   * Check if a biome is walkable
   */
  public isWalkable(biome: BiomeType): boolean {
    return this.getBiomeDefinition(biome).walkable;
  }

  /**
   * Check if a biome is buildable
   */
  public isBuildable(biome: BiomeType): boolean {
    return this.getBiomeDefinition(biome).buildable;
  }

  /**
   * Get ground tile for a biome
   */
  public getGroundTile(biome: BiomeType): string {
    return this.getBiomeDefinition(biome).groundTile;
  }

  /**
   * Get random decoration for a biome (or null based on density)
   */
  public getRandomDecoration(biome: BiomeType, random: number): string | null {
    const def = this.getBiomeDefinition(biome);
    if (random > def.decorationDensity || def.decorationTiles.length === 0) {
      return null;
    }
    const index = Math.floor(random * def.decorationTiles.length / def.decorationDensity);
    return def.decorationTiles[index % def.decorationTiles.length];
  }

  /**
   * Get random resource for a biome (or null based on density)
   */
  public getRandomResource(biome: BiomeType, random: number): string | null {
    const def = this.getBiomeDefinition(biome);
    if (random > def.resourceDensity || def.resourceTiles.length === 0) {
      return null;
    }
    const index = Math.floor(random * def.resourceTiles.length / def.resourceDensity);
    return def.resourceTiles[index % def.resourceTiles.length];
  }

  /**
   * Get spawn rate for hostile creatures in a biome
   */
  public getHostileSpawnRate(biome: BiomeType): number {
    return this.getBiomeDefinition(biome).hostileSpawnRate;
  }
}

// Export singleton instance
let biomeManagerInstance: BiomeManager | null = null;

export function getBiomeManager(): BiomeManager {
  if (!biomeManagerInstance) {
    biomeManagerInstance = new BiomeManager();
  }
  return biomeManagerInstance;
}
