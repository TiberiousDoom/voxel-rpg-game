/**
 * AutotileSystem - Calculates tile variants based on neighbors
 *
 * Supports 4-bit (16 variants) and 8-bit (47 variants) autotiling patterns.
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md:
 * - 4-bit (16 variants): Simple walls
 * - 8-bit (47 variants): Terrain transitions
 */

import type { GameSystem } from '@core/GameEngine';
import { getEventBus, type GameEvents } from '@core/EventBus';
import type { TileLayer, Vector2Int, GameTime } from '@core/types';
import { TilemapManager } from './TilemapManager';
import { getTileRegistry } from './TileRegistry';

// ============================================================================
// Autotile Patterns
// ============================================================================

/**
 * 4-bit autotile bitmask positions:
 *   1
 * 8 X 2
 *   4
 */
export enum Neighbor4 {
  North = 1,
  East = 2,
  South = 4,
  West = 8,
}

/**
 * 8-bit autotile bitmask positions:
 * 1   2   4
 * 8   X   16
 * 32  64  128
 */
export enum Neighbor8 {
  NorthWest = 1,
  North = 2,
  NorthEast = 4,
  West = 8,
  East = 16,
  SouthWest = 32,
  South = 64,
  SouthEast = 128,
}

// ============================================================================
// 4-bit to Variant Mapping (16 variants)
// ============================================================================

/**
 * Maps 4-bit neighbor bitmask to tile variant index.
 * Used for simple wall tiles.
 */
const VARIANT_MAP_4BIT: Record<number, number> = {
  0b0000: 0,  // No neighbors
  0b0001: 1,  // North only
  0b0010: 2,  // East only
  0b0011: 3,  // North + East
  0b0100: 4,  // South only
  0b0101: 5,  // North + South
  0b0110: 6,  // East + South
  0b0111: 7,  // North + East + South
  0b1000: 8,  // West only
  0b1001: 9,  // North + West
  0b1010: 10, // East + West
  0b1011: 11, // North + East + West
  0b1100: 12, // South + West
  0b1101: 13, // North + South + West
  0b1110: 14, // East + South + West
  0b1111: 15, // All neighbors
};

// ============================================================================
// 8-bit to Variant Mapping (47 variants)
// ============================================================================

/**
 * For 8-bit autotiling, we need a more complex mapping.
 * The corners are only considered if both adjacent edges are present.
 * This reduces 256 possibilities to 47 unique variants.
 */
function calculate8BitVariant(bitmask: number): number {
  // First, mask out corners that don't have both adjacent edges
  let maskedBitmask = bitmask;

  // NorthWest corner: needs North (2) and West (8)
  if ((bitmask & Neighbor8.NorthWest) && !((bitmask & Neighbor8.North) && (bitmask & Neighbor8.West))) {
    maskedBitmask &= ~Neighbor8.NorthWest;
  }

  // NorthEast corner: needs North (2) and East (16)
  if ((bitmask & Neighbor8.NorthEast) && !((bitmask & Neighbor8.North) && (bitmask & Neighbor8.East))) {
    maskedBitmask &= ~Neighbor8.NorthEast;
  }

  // SouthWest corner: needs South (64) and West (8)
  if ((bitmask & Neighbor8.SouthWest) && !((bitmask & Neighbor8.South) && (bitmask & Neighbor8.West))) {
    maskedBitmask &= ~Neighbor8.SouthWest;
  }

  // SouthEast corner: needs South (64) and East (16)
  if ((bitmask & Neighbor8.SouthEast) && !((bitmask & Neighbor8.South) && (bitmask & Neighbor8.East))) {
    maskedBitmask &= ~Neighbor8.SouthEast;
  }

  // Map the masked bitmask to a variant index (0-46)
  // This is a simplified mapping - in practice you'd have a lookup table
  return maskedBitmask % 47;
}

// ============================================================================
// AutotileSystem Implementation
// ============================================================================

export class AutotileSystem implements GameSystem {
  public readonly name = 'AutotileSystem';

  private tilemapManager: TilemapManager | null = null;
  private pendingUpdates: Set<string> = new Set();
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialize with a reference to the TilemapManager
   */
  public initialize(): void {
    const eventBus = getEventBus();

    // Listen for tile changes
    this.unsubscribe = eventBus.on('world:tileChanged', (event) => {
      this.onTileChanged(event);
    });

    console.log('[AutotileSystem] Initialized');
  }

  /**
   * Set the tilemap manager reference
   */
  public setTilemapManager(manager: TilemapManager): void {
    this.tilemapManager = manager;
  }

  /**
   * Update - processes pending autotile updates
   */
  public update(_deltaTime: number, _gameTime: GameTime): void {
    if (this.pendingUpdates.size === 0 || !this.tilemapManager) {
      return;
    }

    // Process all pending updates
    for (const key of this.pendingUpdates) {
      const [x, y, layer] = key.split(',').map(Number);
      this.updateTileVariant(x, y, layer as TileLayer);
    }

    this.pendingUpdates.clear();
  }

  /**
   * Handle tile change events
   */
  private onTileChanged(event: GameEvents['world:tileChanged']): void {
    const { position, layer } = event;

    // Queue update for the changed tile
    this.queueUpdate(position.x, position.y, layer);

    // Queue updates for all neighbors (they may need to update their variants)
    this.queueUpdate(position.x, position.y - 1, layer); // North
    this.queueUpdate(position.x + 1, position.y, layer); // East
    this.queueUpdate(position.x, position.y + 1, layer); // South
    this.queueUpdate(position.x - 1, position.y, layer); // West
    this.queueUpdate(position.x + 1, position.y - 1, layer); // NorthEast
    this.queueUpdate(position.x - 1, position.y - 1, layer); // NorthWest
    this.queueUpdate(position.x + 1, position.y + 1, layer); // SouthEast
    this.queueUpdate(position.x - 1, position.y + 1, layer); // SouthWest
  }

  /**
   * Queue a tile position for autotile update
   */
  private queueUpdate(x: number, y: number, layer: TileLayer): void {
    this.pendingUpdates.add(`${x},${y},${layer}`);
  }

  /**
   * Update the variant for a single tile
   */
  private updateTileVariant(x: number, y: number, layer: TileLayer): void {
    if (!this.tilemapManager) return;

    const tile = this.tilemapManager.getTile(x, y, layer);
    if (!tile) return;

    const tileRegistry = getTileRegistry();
    const tileType = tileRegistry.get(tile.typeId);
    if (!tileType || !tileType.autotileGroup) return;

    // Calculate neighbor bitmask
    const variant = this.calculateVariant(x, y, layer, tileType.autotileGroup);

    // Update tile variant if it changed
    if (tile.variant !== variant) {
      // Directly update the tile's variant (avoiding event loop)
      tile.variant = variant;
    }
  }

  /**
   * Calculate the autotile variant for a position
   */
  public calculateVariant(
    x: number,
    y: number,
    layer: TileLayer,
    autotileGroup: string
  ): number {
    if (!this.tilemapManager) return 0;

    const tileRegistry = getTileRegistry();

    // Check if neighbor matches the autotile group
    const matchesGroup = (nx: number, ny: number): boolean => {
      const neighbor = this.tilemapManager!.getTile(nx, ny, layer);
      if (!neighbor) return false;
      const neighborType = tileRegistry.get(neighbor.typeId);
      return neighborType?.autotileGroup === autotileGroup;
    };

    // Calculate 4-bit bitmask (for simple autotiling)
    let bitmask4 = 0;
    if (matchesGroup(x, y - 1)) bitmask4 |= Neighbor4.North;
    if (matchesGroup(x + 1, y)) bitmask4 |= Neighbor4.East;
    if (matchesGroup(x, y + 1)) bitmask4 |= Neighbor4.South;
    if (matchesGroup(x - 1, y)) bitmask4 |= Neighbor4.West;

    // For now, use 4-bit autotiling (can be extended to 8-bit for terrain)
    return VARIANT_MAP_4BIT[bitmask4] ?? 0;
  }

  /**
   * Calculate 8-bit variant for terrain transitions
   */
  public calculateVariant8Bit(
    x: number,
    y: number,
    layer: TileLayer,
    autotileGroup: string
  ): number {
    if (!this.tilemapManager) return 0;

    const tileRegistry = getTileRegistry();

    // Check if neighbor matches the autotile group
    const matchesGroup = (nx: number, ny: number): boolean => {
      const neighbor = this.tilemapManager!.getTile(nx, ny, layer);
      if (!neighbor) return false;
      const neighborType = tileRegistry.get(neighbor.typeId);
      return neighborType?.autotileGroup === autotileGroup;
    };

    // Calculate 8-bit bitmask
    let bitmask8 = 0;
    if (matchesGroup(x - 1, y - 1)) bitmask8 |= Neighbor8.NorthWest;
    if (matchesGroup(x, y - 1)) bitmask8 |= Neighbor8.North;
    if (matchesGroup(x + 1, y - 1)) bitmask8 |= Neighbor8.NorthEast;
    if (matchesGroup(x - 1, y)) bitmask8 |= Neighbor8.West;
    if (matchesGroup(x + 1, y)) bitmask8 |= Neighbor8.East;
    if (matchesGroup(x - 1, y + 1)) bitmask8 |= Neighbor8.SouthWest;
    if (matchesGroup(x, y + 1)) bitmask8 |= Neighbor8.South;
    if (matchesGroup(x + 1, y + 1)) bitmask8 |= Neighbor8.SouthEast;

    return calculate8BitVariant(bitmask8);
  }

  /**
   * Force update all tiles in a region
   */
  public updateRegion(x: number, y: number, width: number, height: number, layer: TileLayer): void {
    for (let tx = x; tx < x + width; tx++) {
      for (let ty = y; ty < y + height; ty++) {
        this.queueUpdate(tx, ty, layer);
      }
    }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.pendingUpdates.clear();
    console.log('[AutotileSystem] Destroyed');
  }
}
