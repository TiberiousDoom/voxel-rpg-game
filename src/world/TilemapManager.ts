/**
 * TilemapManager - Manages the 2D tile-based world
 *
 * Handles tile placement, removal, and querying across multiple layers.
 * Integrates with the EventBus for tile change notifications.
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - 5 Layer Standard:
 * - Layer 0 (Background): Decorative, no collision
 * - Layer 1 (Ground): Terrain, floors
 * - Layer 2 (Objects): Furniture, resources, items
 * - Layer 3 (Walls): Structures, barriers
 * - Layer 4 (Foreground): Visual overlays, roofs
 */

const MAX_LAYER = 4; // 5 layers total (0-4)

import type { GameSystem } from '../core/GameEngine';
import { getEventBus } from '../core/EventBus';
import { TileLayer, type Tile, type TileType, type Vector2Int, type Bounds, type GameTime } from '../core/types';
import { getTileRegistry, type TileRegistry } from './TileRegistry';

// ============================================================================
// Types
// ============================================================================

interface TileChange {
  position: Vector2Int;
  layer: TileLayer;
  oldTypeId: string | null;
  newTypeId: string | null;
  timestamp: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

const positionKey = (x: number, y: number, layer: TileLayer): string =>
  `${x},${y},${layer}`;

const parsePositionKey = (key: string): { x: number; y: number; layer: TileLayer } => {
  const [x, y, layer] = key.split(',').map(Number);
  return { x, y, layer: layer as TileLayer };
};

// ============================================================================
// TilemapManager Implementation
// ============================================================================

export class TilemapManager implements GameSystem {
  public readonly name = 'TilemapManager';

  private tiles: Map<string, Tile> = new Map();
  private tileRegistry: TileRegistry;
  private pendingChanges: TileChange[] = [];
  private changeHistory: TileChange[] = [];
  private maxHistorySize = 1000;

  constructor() {
    this.tileRegistry = getTileRegistry();
  }

  /**
   * Initialize the tilemap manager
   */
  public initialize(): void {
    console.log('[TilemapManager] Initialized');
  }

  /**
   * Update - processes pending changes
   */
  public update(_deltaTime: number, _gameTime: GameTime): void {
    // Process any pending tile changes
    this.processPendingChanges();
  }

  /**
   * Set a tile at a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @param typeId - Tile type ID
   * @param variant - Autotile variant (default: 0)
   * @returns true if tile was set successfully
   */
  public setTile(
    x: number,
    y: number,
    layer: TileLayer,
    typeId: string,
    variant = 0
  ): boolean {
    const tileType = this.tileRegistry.get(typeId);
    if (!tileType) {
      console.warn(`[TilemapManager] Unknown tile type: ${typeId}`);
      return false;
    }

    const key = positionKey(x, y, layer);
    const existingTile = this.tiles.get(key);
    const oldTypeId = existingTile?.typeId ?? null;

    // Create new tile
    const tile: Tile = {
      typeId,
      layer,
      position: { x, y },
      variant,
    };

    this.tiles.set(key, tile);

    // Queue change event
    this.pendingChanges.push({
      position: { x, y },
      layer,
      oldTypeId,
      newTypeId: typeId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Remove a tile at a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns The removed tile, or null if no tile existed
   */
  public removeTile(x: number, y: number, layer: TileLayer): Tile | null {
    const key = positionKey(x, y, layer);
    const tile = this.tiles.get(key);

    if (!tile) {
      return null;
    }

    this.tiles.delete(key);

    // Queue change event
    this.pendingChanges.push({
      position: { x, y },
      layer,
      oldTypeId: tile.typeId,
      newTypeId: null,
      timestamp: Date.now(),
    });

    return tile;
  }

  /**
   * Get a tile at a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns The tile, or undefined if no tile exists
   */
  public getTile(x: number, y: number, layer: TileLayer): Tile | undefined {
    return this.tiles.get(positionKey(x, y, layer));
  }

  /**
   * Get the tile type at a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns The tile type, or undefined if no tile exists
   */
  public getTileType(x: number, y: number, layer: TileLayer): TileType | undefined {
    const tile = this.getTile(x, y, layer);
    return tile ? this.tileRegistry.get(tile.typeId) : undefined;
  }

  /**
   * Check if a position has a tile in any layer
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns true if any tile exists at this position
   */
  public hasTile(x: number, y: number): boolean {
    for (let layer = 0; layer <= MAX_LAYER; layer++) {
      if (this.tiles.has(positionKey(x, y, layer as TileLayer))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a position is walkable
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns true if the position can be walked on
   */
  public isWalkable(x: number, y: number): boolean {
    // Check all layers for blocking tiles
    for (let layer = 0; layer <= MAX_LAYER; layer++) {
      const tile = this.getTile(x, y, layer as TileLayer);
      if (tile) {
        const tileType = this.tileRegistry.get(tile.typeId);
        if (tileType && !tileType.walkable) {
          return false;
        }
      }
    }

    // Must have at least a Ground layer tile to be walkable
    // Per 5-layer standard: Layer 1 (Ground) contains terrain/floors
    const ground = this.getTile(x, y, TileLayer.Ground);
    if (!ground) {
      return false; // No ground = not walkable
    }

    const groundType = this.tileRegistry.get(ground.typeId);
    return groundType?.walkable ?? false;
  }

  /**
   * Check if a position is transparent (for light/vision)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns true if light can pass through
   */
  public isTransparent(x: number, y: number): boolean {
    for (let layer = 0; layer <= MAX_LAYER; layer++) {
      const tile = this.getTile(x, y, layer as TileLayer);
      if (tile) {
        const tileType = this.tileRegistry.get(tile.typeId);
        if (tileType && !tileType.transparent) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get all tiles in a rectangular region
   * @param bounds - The region bounds
   * @param layer - Optional specific layer (all layers if not specified)
   * @returns Array of tiles in the region
   */
  public getTilesInRegion(bounds: Bounds, layer?: TileLayer): Tile[] {
    const tiles: Tile[] = [];

    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
        if (layer !== undefined) {
          const tile = this.getTile(x, y, layer);
          if (tile) tiles.push(tile);
        } else {
          for (let l = 0; l <= MAX_LAYER; l++) {
            const tile = this.getTile(x, y, l as TileLayer);
            if (tile) tiles.push(tile);
          }
        }
      }
    }

    return tiles;
  }

  /**
   * Get all tiles at a position (all layers)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Array of tiles at this position
   */
  public getTilesAt(x: number, y: number): Tile[] {
    const tiles: Tile[] = [];

    for (let layer = 0; layer <= MAX_LAYER; layer++) {
      const tile = this.getTile(x, y, layer as TileLayer);
      if (tile) tiles.push(tile);
    }

    return tiles;
  }

  /**
   * Get neighboring tiles (4-connected)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns Object with north, south, east, west tiles
   */
  public getNeighbors4(
    x: number,
    y: number,
    layer: TileLayer
  ): { north?: Tile; south?: Tile; east?: Tile; west?: Tile } {
    return {
      north: this.getTile(x, y - 1, layer),
      south: this.getTile(x, y + 1, layer),
      east: this.getTile(x + 1, y, layer),
      west: this.getTile(x - 1, y, layer),
    };
  }

  /**
   * Get neighboring tiles (8-connected)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns Object with all 8 neighboring tiles
   */
  public getNeighbors8(
    x: number,
    y: number,
    layer: TileLayer
  ): {
    north?: Tile;
    south?: Tile;
    east?: Tile;
    west?: Tile;
    northEast?: Tile;
    northWest?: Tile;
    southEast?: Tile;
    southWest?: Tile;
  } {
    return {
      north: this.getTile(x, y - 1, layer),
      south: this.getTile(x, y + 1, layer),
      east: this.getTile(x + 1, y, layer),
      west: this.getTile(x - 1, y, layer),
      northEast: this.getTile(x + 1, y - 1, layer),
      northWest: this.getTile(x - 1, y - 1, layer),
      southEast: this.getTile(x + 1, y + 1, layer),
      southWest: this.getTile(x - 1, y + 1, layer),
    };
  }

  /**
   * Clear all tiles
   */
  public clear(): void {
    this.tiles.clear();
    this.pendingChanges = [];
  }

  /**
   * Get total tile count
   */
  public getTileCount(): number {
    return this.tiles.size;
  }

  /**
   * Get tile count by layer
   */
  public getTileCountByLayer(layer: TileLayer): number {
    let count = 0;
    for (const key of this.tiles.keys()) {
      if (key.endsWith(`,${layer}`)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get change history
   */
  public getChangeHistory(): readonly TileChange[] {
    return this.changeHistory;
  }

  /**
   * Serialize tilemap state for saving
   */
  public serialize(): Array<{ position: Vector2Int; layer: TileLayer; typeId: string; variant: number }> {
    const data: Array<{ position: Vector2Int; layer: TileLayer; typeId: string; variant: number }> = [];

    for (const tile of this.tiles.values()) {
      data.push({
        position: tile.position,
        layer: tile.layer,
        typeId: tile.typeId,
        variant: tile.variant,
      });
    }

    return data;
  }

  /**
   * Deserialize tilemap state from save data
   */
  public deserialize(
    data: Array<{ position: Vector2Int; layer: TileLayer; typeId: string; variant?: number }>
  ): void {
    this.clear();

    for (const tileData of data) {
      this.setTile(
        tileData.position.x,
        tileData.position.y,
        tileData.layer,
        tileData.typeId,
        tileData.variant ?? 0
      );
    }

    // Clear pending changes from deserialization
    this.pendingChanges = [];
  }

  /**
   * Process pending tile changes and emit events
   */
  private processPendingChanges(): void {
    const eventBus = getEventBus();

    for (const change of this.pendingChanges) {
      eventBus.emit('world:tileChanged', {
        position: change.position,
        layer: change.layer,
        oldTypeId: change.oldTypeId,
        newTypeId: change.newTypeId,
      });

      // Add to history
      this.changeHistory.push(change);

      // Trim history if needed
      if (this.changeHistory.length > this.maxHistorySize) {
        this.changeHistory.shift();
      }
    }

    this.pendingChanges = [];
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.clear();
    console.log('[TilemapManager] Destroyed');
  }
}
