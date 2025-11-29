/**
 * RegionManager - Manages world streaming by regions
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md:
 * - Region size: 64x64 tiles
 * - Load distance: 2 regions in each direction
 * - Unload distance: 3 regions in each direction
 * - Pause tasks in unloaded regions
 */

import type { GameSystem } from '@core/GameEngine';
import { getEventBus } from '@core/EventBus';
import type { Vector2, Vector2Int, GameTime, Tile, TileLayer } from '@core/types';

// ============================================================================
// Configuration
// ============================================================================

export interface RegionConfig {
  regionSize: number;      // Tiles per region side
  loadDistance: number;    // Regions to load around player
  unloadDistance: number;  // Regions to unload beyond this
}

const DEFAULT_CONFIG: RegionConfig = {
  regionSize: 64,
  loadDistance: 2,
  unloadDistance: 3,
};

// ============================================================================
// Region Data Structure
// ============================================================================

export interface RegionData {
  id: string;
  position: Vector2Int;      // Region coordinates (not tile coordinates)
  tiles: Map<string, Tile>;  // Tiles within this region
  isLoaded: boolean;
  lastAccessTime: number;
}

// ============================================================================
// RegionManager Implementation
// ============================================================================

export class RegionManager implements GameSystem {
  public readonly name = 'RegionManager';

  private config: RegionConfig;
  private regions: Map<string, RegionData> = new Map();
  private loadedRegions: Set<string> = new Set();
  private playerPosition: Vector2 = { x: 0, y: 0 };
  private lastPlayerRegion: Vector2Int = { x: 0, y: 0 };

  constructor(config: Partial<RegionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the region manager
   */
  public initialize(): void {
    const eventBus = getEventBus();

    // Listen for player movement to update regions
    eventBus.on('player:moved', (event) => {
      this.playerPosition = event.position;
    });

    console.log('[RegionManager] Initialized with config:', this.config);
  }

  /**
   * Update - check if regions need to be loaded/unloaded
   */
  public update(_deltaTime: number, _gameTime: GameTime): void {
    const currentRegion = this.worldToRegion(this.playerPosition.x, this.playerPosition.y);

    // Only update regions if player moved to a new region
    if (currentRegion.x !== this.lastPlayerRegion.x || currentRegion.y !== this.lastPlayerRegion.y) {
      this.updateLoadedRegions(currentRegion);
      this.lastPlayerRegion = currentRegion;
    }
  }

  /**
   * Convert world coordinates to region coordinates
   */
  public worldToRegion(worldX: number, worldY: number): Vector2Int {
    return {
      x: Math.floor(worldX / this.config.regionSize),
      y: Math.floor(worldY / this.config.regionSize),
    };
  }

  /**
   * Convert region coordinates to world coordinates (top-left corner)
   */
  public regionToWorld(regionX: number, regionY: number): Vector2Int {
    return {
      x: regionX * this.config.regionSize,
      y: regionY * this.config.regionSize,
    };
  }

  /**
   * Get region ID from region coordinates
   */
  public getRegionId(regionX: number, regionY: number): string {
    return `${regionX},${regionY}`;
  }

  /**
   * Parse region ID to coordinates
   */
  public parseRegionId(id: string): Vector2Int {
    const [x, y] = id.split(',').map(Number);
    return { x, y };
  }

  /**
   * Check if a region is currently loaded
   */
  public isRegionLoaded(regionX: number, regionY: number): boolean {
    return this.loadedRegions.has(this.getRegionId(regionX, regionY));
  }

  /**
   * Get a region by coordinates
   */
  public getRegion(regionX: number, regionY: number): RegionData | undefined {
    return this.regions.get(this.getRegionId(regionX, regionY));
  }

  /**
   * Get or create a region
   */
  public getOrCreateRegion(regionX: number, regionY: number): RegionData {
    const id = this.getRegionId(regionX, regionY);
    let region = this.regions.get(id);

    if (!region) {
      region = {
        id,
        position: { x: regionX, y: regionY },
        tiles: new Map(),
        isLoaded: false,
        lastAccessTime: Date.now(),
      };
      this.regions.set(id, region);
    }

    return region;
  }

  /**
   * Load a region
   */
  public loadRegion(regionX: number, regionY: number): RegionData {
    const region = this.getOrCreateRegion(regionX, regionY);

    if (!region.isLoaded) {
      region.isLoaded = true;
      region.lastAccessTime = Date.now();
      this.loadedRegions.add(region.id);

      const eventBus = getEventBus();
      eventBus.emit('world:regionLoaded', {
        regionId: region.id,
        position: region.position,
      });

      console.log(`[RegionManager] Loaded region ${region.id}`);
    }

    return region;
  }

  /**
   * Unload a region
   */
  public unloadRegion(regionX: number, regionY: number): void {
    const id = this.getRegionId(regionX, regionY);
    const region = this.regions.get(id);

    if (region && region.isLoaded) {
      region.isLoaded = false;
      this.loadedRegions.delete(id);

      const eventBus = getEventBus();
      eventBus.emit('world:regionUnloaded', { regionId: id });

      console.log(`[RegionManager] Unloaded region ${id}`);
    }
  }

  /**
   * Update which regions are loaded based on player position
   */
  private updateLoadedRegions(playerRegion: Vector2Int): void {
    const { loadDistance, unloadDistance } = this.config;

    // Determine which regions should be loaded
    const shouldBeLoaded = new Set<string>();
    for (let dx = -loadDistance; dx <= loadDistance; dx++) {
      for (let dy = -loadDistance; dy <= loadDistance; dy++) {
        const regionX = playerRegion.x + dx;
        const regionY = playerRegion.y + dy;
        shouldBeLoaded.add(this.getRegionId(regionX, regionY));
      }
    }

    // Load new regions
    for (const id of shouldBeLoaded) {
      if (!this.loadedRegions.has(id)) {
        const { x, y } = this.parseRegionId(id);
        this.loadRegion(x, y);
      }
    }

    // Unload distant regions
    for (const id of this.loadedRegions) {
      const { x, y } = this.parseRegionId(id);
      const dx = Math.abs(x - playerRegion.x);
      const dy = Math.abs(y - playerRegion.y);

      if (dx > unloadDistance || dy > unloadDistance) {
        this.unloadRegion(x, y);
      }
    }
  }

  /**
   * Get all currently loaded regions
   */
  public getLoadedRegions(): RegionData[] {
    const regions: RegionData[] = [];
    for (const id of this.loadedRegions) {
      const region = this.regions.get(id);
      if (region) {
        regions.push(region);
      }
    }
    return regions;
  }

  /**
   * Get the number of loaded regions
   */
  public getLoadedRegionCount(): number {
    return this.loadedRegions.size;
  }

  /**
   * Set tile data in a region
   */
  public setRegionTile(
    worldX: number,
    worldY: number,
    layer: TileLayer,
    tile: Tile
  ): void {
    const regionCoords = this.worldToRegion(worldX, worldY);
    const region = this.getOrCreateRegion(regionCoords.x, regionCoords.y);

    // Calculate local position within region
    const localX = worldX - regionCoords.x * this.config.regionSize;
    const localY = worldY - regionCoords.y * this.config.regionSize;
    const key = `${localX},${localY},${layer}`;

    region.tiles.set(key, tile);
    region.lastAccessTime = Date.now();
  }

  /**
   * Get tile data from a region
   */
  public getRegionTile(
    worldX: number,
    worldY: number,
    layer: TileLayer
  ): Tile | undefined {
    const regionCoords = this.worldToRegion(worldX, worldY);
    const region = this.regions.get(this.getRegionId(regionCoords.x, regionCoords.y));

    if (!region) return undefined;

    const localX = worldX - regionCoords.x * this.config.regionSize;
    const localY = worldY - regionCoords.y * this.config.regionSize;
    const key = `${localX},${localY},${layer}`;

    region.lastAccessTime = Date.now();
    return region.tiles.get(key);
  }

  /**
   * Serialize a region for saving
   */
  public serializeRegion(regionX: number, regionY: number): {
    id: string;
    position: Vector2Int;
    tiles: Array<{ key: string; tile: Tile }>;
  } | null {
    const region = this.getRegion(regionX, regionY);
    if (!region) return null;

    const tiles: Array<{ key: string; tile: Tile }> = [];
    for (const [key, tile] of region.tiles) {
      tiles.push({ key, tile });
    }

    return {
      id: region.id,
      position: region.position,
      tiles,
    };
  }

  /**
   * Deserialize a region from save data
   */
  public deserializeRegion(data: {
    id: string;
    position: Vector2Int;
    tiles: Array<{ key: string; tile: Tile }>;
  }): void {
    const region = this.getOrCreateRegion(data.position.x, data.position.y);

    region.tiles.clear();
    for (const { key, tile } of data.tiles) {
      region.tiles.set(key, tile);
    }
  }

  /**
   * Clear all regions
   */
  public clear(): void {
    this.regions.clear();
    this.loadedRegions.clear();
    this.lastPlayerRegion = { x: 0, y: 0 };
  }

  /**
   * Get region size
   */
  public getRegionSize(): number {
    return this.config.regionSize;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.clear();
    console.log('[RegionManager] Destroyed');
  }
}
