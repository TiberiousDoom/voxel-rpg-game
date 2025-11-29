/**
 * WorldGenerator - Procedural world generation
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Phase 1:
 * - Noise-based terrain generation
 * - Biome determination from height/moisture
 * - Target: < 10 seconds for starting region
 * - 5+ distinct biomes in average world
 */

import { NoiseGenerator, NOISE_CONFIGS } from './NoiseGenerator';
import { BiomeManager, BiomeType, getBiomeManager } from './BiomeManager';
import { TileLayer } from '@core/types';

// ============================================================================
// World Generation Config
// ============================================================================

export interface WorldGenConfig {
  seed: number;
  regionSize: number;              // Tiles per region (should match RegionManager)
  seaLevel: number;                // Height below which is water
  temperatureLatitudeScale: number; // How temperature varies with Y
  spawnAreaSize: number;           // Safe starting area radius
}

const DEFAULT_CONFIG: WorldGenConfig = {
  seed: Date.now(),
  regionSize: 64,
  seaLevel: 0.35,
  temperatureLatitudeScale: 0.001,
  spawnAreaSize: 32,
};

// ============================================================================
// Generated Tile Data
// ============================================================================

export interface GeneratedTile {
  x: number;
  y: number;
  layer: TileLayer;
  tileId: string;
  biome: BiomeType;
}

export interface GeneratedRegion {
  regionX: number;
  regionY: number;
  tiles: GeneratedTile[];
  biomeDistribution: Map<BiomeType, number>;
  generationTimeMs: number;
}

// ============================================================================
// WorldGenerator Implementation
// ============================================================================

export class WorldGenerator {
  private config: WorldGenConfig;
  private noise: NoiseGenerator;
  private biomeManager: BiomeManager;

  constructor(config: Partial<WorldGenConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.noise = new NoiseGenerator(this.config.seed);
    this.biomeManager = getBiomeManager();
  }

  /**
   * Get the world seed
   */
  public getSeed(): number {
    return this.config.seed;
  }

  /**
   * Generate a region at the specified region coordinates
   */
  public generateRegion(regionX: number, regionY: number): GeneratedRegion {
    const startTime = performance.now();
    const tiles: GeneratedTile[] = [];
    const biomeDistribution = new Map<BiomeType, number>();
    const { regionSize } = this.config;

    // Calculate world coordinates for this region
    const worldStartX = regionX * regionSize;
    const worldStartY = regionY * regionSize;

    // Generate each tile in the region
    for (let localX = 0; localX < regionSize; localX++) {
      for (let localY = 0; localY < regionSize; localY++) {
        const worldX = worldStartX + localX;
        const worldY = worldStartY + localY;

        const generatedTiles = this.generateTile(worldX, worldY);
        tiles.push(...generatedTiles);

        // Track biome distribution
        if (generatedTiles.length > 0) {
          const biome = generatedTiles[0].biome;
          biomeDistribution.set(biome, (biomeDistribution.get(biome) ?? 0) + 1);
        }
      }
    }

    const generationTimeMs = performance.now() - startTime;

    return {
      regionX,
      regionY,
      tiles,
      biomeDistribution,
      generationTimeMs,
    };
  }

  /**
   * Generate tiles at a specific world coordinate
   * Returns tiles for all relevant layers
   */
  public generateTile(worldX: number, worldY: number): GeneratedTile[] {
    const tiles: GeneratedTile[] = [];

    // Generate noise values
    const height = this.noise.perlinFBM(worldX, worldY, NOISE_CONFIGS.height);
    const moisture = this.noise.simplexFBM(worldX, worldY, NOISE_CONFIGS.moisture);
    const temperature = this.getTemperature(worldX, worldY);

    // Determine biome
    const biome = this.biomeManager.determineBiome(height, moisture, temperature);
    const biomeDef = this.biomeManager.getBiomeDefinition(biome);

    // Ground layer (always present)
    tiles.push({
      x: worldX,
      y: worldY,
      layer: TileLayer.Ground,
      tileId: biomeDef.groundTile,
      biome,
    });

    // Generate decoration/object layer based on biome
    const decorationRandom = this.noise.perlin2D(worldX * 0.5 + 1000, worldY * 0.5) * 0.5 + 0.5;
    const decoration = this.biomeManager.getRandomDecoration(biome, decorationRandom);
    if (decoration) {
      tiles.push({
        x: worldX,
        y: worldY,
        layer: TileLayer.Objects,
        tileId: decoration,
        biome,
      });
    }

    // Generate resources (separate noise channel)
    const resourceRandom = this.noise.simplex2D(worldX * 0.3 + 2000, worldY * 0.3) * 0.5 + 0.5;
    const resource = this.biomeManager.getRandomResource(biome, resourceRandom);
    if (resource && !decoration) {
      // Only place resource if no decoration
      tiles.push({
        x: worldX,
        y: worldY,
        layer: TileLayer.Objects,
        tileId: resource,
        biome,
      });
    }

    return tiles;
  }

  /**
   * Get temperature at a world position
   * Temperature varies with Y coordinate to simulate latitude
   */
  private getTemperature(worldX: number, worldY: number): number {
    const { temperatureLatitudeScale } = this.config;

    // Base temperature from noise
    const baseTemp = this.noise.simplexFBM(
      worldX + 5000,
      worldY + 5000,
      NOISE_CONFIGS.temperature
    );

    // Latitude effect (colder at higher Y values, simulating going north)
    const latitudeEffect = 1 - Math.abs(worldY * temperatureLatitudeScale);

    // Altitude effect (colder at higher elevations)
    const height = this.noise.perlinFBM(worldX, worldY, NOISE_CONFIGS.height);
    const altitudeEffect = 1 - Math.max(0, (height - 0.5) * 0.5);

    return Math.max(0, Math.min(1, baseTemp * 0.5 + latitudeEffect * 0.3 + altitudeEffect * 0.2));
  }

  /**
   * Get spawn point (safe starting location)
   */
  public findSpawnPoint(): { x: number; y: number } {
    const { spawnAreaSize } = this.config;

    // Search for a suitable spawn point near origin
    for (let radius = 0; radius < 100; radius += 5) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const x = Math.round(Math.cos(angle) * radius);
        const y = Math.round(Math.sin(angle) * radius);

        if (this.isSuitableSpawn(x, y)) {
          return { x, y };
        }
      }
    }

    // Fallback to origin
    return { x: 0, y: 0 };
  }

  /**
   * Check if a location is suitable for spawning
   */
  private isSuitableSpawn(x: number, y: number): boolean {
    const tiles = this.generateTile(x, y);
    if (tiles.length === 0) return false;

    const biome = tiles[0].biome;

    // Must be walkable and buildable
    if (!this.biomeManager.isWalkable(biome)) return false;
    if (!this.biomeManager.isBuildable(biome)) return false;

    // Prefer low hostile spawn rate
    if (this.biomeManager.getHostileSpawnRate(biome) > 0.5) return false;

    // Prefer plains or forest (good starting biomes)
    return biome === BiomeType.Plains || biome === BiomeType.Forest;
  }

  /**
   * Get the biome at a world position
   */
  public getBiomeAt(worldX: number, worldY: number): BiomeType {
    const height = this.noise.perlinFBM(worldX, worldY, NOISE_CONFIGS.height);
    const moisture = this.noise.simplexFBM(worldX, worldY, NOISE_CONFIGS.moisture);
    const temperature = this.getTemperature(worldX, worldY);

    return this.biomeManager.determineBiome(height, moisture, temperature);
  }

  /**
   * Get height at a world position (for pathfinding, etc.)
   */
  public getHeightAt(worldX: number, worldY: number): number {
    return this.noise.perlinFBM(worldX, worldY, NOISE_CONFIGS.height);
  }

  /**
   * Check if position is above water
   */
  public isLand(worldX: number, worldY: number): boolean {
    return this.getHeightAt(worldX, worldY) >= this.config.seaLevel;
  }

  /**
   * Validate world generation (for testing)
   * Generates a sample area and checks biome diversity
   */
  public validateGeneration(sampleSize: number = 1000): {
    valid: boolean;
    biomeCount: number;
    biomeCounts: Map<BiomeType, number>;
    averageGenerationTime: number;
  } {
    const biomeCounts = new Map<BiomeType, number>();
    let totalTime = 0;
    const samples = Math.sqrt(sampleSize);

    for (let i = 0; i < samples; i++) {
      for (let j = 0; j < samples; j++) {
        const x = (i - samples / 2) * 10;
        const y = (j - samples / 2) * 10;

        const start = performance.now();
        const biome = this.getBiomeAt(x, y);
        totalTime += performance.now() - start;

        biomeCounts.set(biome, (biomeCounts.get(biome) ?? 0) + 1);
      }
    }

    const biomeCount = biomeCounts.size;
    const valid = biomeCount >= 5; // Spec requires 5+ distinct biomes

    return {
      valid,
      biomeCount,
      biomeCounts,
      averageGenerationTime: totalTime / sampleSize,
    };
  }
}

// ============================================================================
// Singleton Access
// ============================================================================

let worldGeneratorInstance: WorldGenerator | null = null;

export function getWorldGenerator(seed?: number): WorldGenerator {
  if (!worldGeneratorInstance || seed !== undefined) {
    worldGeneratorInstance = new WorldGenerator(seed !== undefined ? { seed } : {});
  }
  return worldGeneratorInstance;
}

export function resetWorldGenerator(): void {
  worldGeneratorInstance = null;
}
