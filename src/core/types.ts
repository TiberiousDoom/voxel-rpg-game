/**
 * Core type definitions for the 2D RPG game engine
 */

// ============================================================================
// Vector Types
// ============================================================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector2Int {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Direction & Facing
// ============================================================================

export enum Direction {
  North = 'N',
  South = 'S',
  East = 'E',
  West = 'W',
  NorthEast = 'NE',
  NorthWest = 'NW',
  SouthEast = 'SE',
  SouthWest = 'SW',
}

// ============================================================================
// Entity Types
// ============================================================================

export enum EntityType {
  Player = 'player',
  NPC = 'npc',
  Monster = 'monster',
  Item = 'item',
  Projectile = 'projectile',
}

// ============================================================================
// Tile Types
// Per 2D_GAME_IMPLEMENTATION_PLAN.md - 5 Layer Standard
// ============================================================================

export enum TileLayer {
  Background = 0, // Decorative, no collision
  Ground = 1,     // Terrain, floors
  Objects = 2,    // Furniture, resources, items
  Walls = 3,      // Structures, barriers
  Foreground = 4, // Visual overlays, roofs
}

export interface ResourceDrop {
  resourceId: string;
  minAmount: number;
  maxAmount: number;
  chance: number; // 0-1
}

export interface TileType {
  id: string;
  name: string;
  layer: TileLayer;
  walkable: boolean;
  hardness: number; // Mining time multiplier (0 = instant, -1 = unbreakable)
  transparent: boolean;
  drops: ResourceDrop[];
  autotileGroup: string | null;
  buildRequirements: { resourceId: string; amount: number }[];
}

export interface Tile {
  typeId: string;
  layer: TileLayer;
  position: Vector2Int;
  variant: number; // Autotile variant index
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Component System (ECS-lite)
// ============================================================================

export interface Component {
  readonly type: string;
}

export interface Entity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  facing: Direction;
  components: Map<string, Component>;
  active: boolean;
}

// ============================================================================
// Game State
// ============================================================================

export interface GameTime {
  totalSeconds: number;
  deltaTime: number;
  gameHour: number; // 0-24
  gameDay: number;
  isPaused: boolean;
}

export interface GameConfig {
  tileSize: number;
  regionSize: number; // Tiles per region side
  loadDistance: number; // Regions to load around player
  unloadDistance: number; // Regions to unload
  dayLengthSeconds: number; // Real seconds per game day
}

// ============================================================================
// Save Data
// ============================================================================

export interface SaveMetadata {
  version: string;
  timestamp: number;
  playtimeSeconds: number;
  slotName: string;
}

export interface SaveData {
  metadata: SaveMetadata;
  world: {
    seed: number;
    modifiedTiles: Array<{
      position: Vector2Int;
      layer: TileLayer;
      typeId: string;
    }>;
  };
  player: {
    position: Vector2;
    health: number;
    maxHealth: number;
    inventory: Array<{ itemId: string; quantity: number }>;
  };
  gameTime: {
    totalSeconds: number;
    gameDay: number;
  };
}

// ============================================================================
// Input Types
// ============================================================================

export enum InputAction {
  MoveUp = 'moveUp',
  MoveDown = 'moveDown',
  MoveLeft = 'moveLeft',
  MoveRight = 'moveRight',
  Sprint = 'sprint',
  Interact = 'interact',
  Attack = 'attack',
  Secondary = 'secondary',
  Cancel = 'cancel',
  Inventory = 'inventory',
  BuildMenu = 'buildMenu',
  Pause = 'pause',
  ZoomIn = 'zoomIn',
  ZoomOut = 'zoomOut',
  QuickSlot1 = 'quickSlot1',
  QuickSlot2 = 'quickSlot2',
  QuickSlot3 = 'quickSlot3',
  QuickSlot4 = 'quickSlot4',
  QuickSlot5 = 'quickSlot5',
  QuickSlot6 = 'quickSlot6',
  QuickSlot7 = 'quickSlot7',
  QuickSlot8 = 'quickSlot8',
  QuickSlot9 = 'quickSlot9',
}

export interface InputBinding {
  action: InputAction;
  keys: string[];
  mouseButtons?: number[];
}

// ============================================================================
// UI Types
// ============================================================================

export enum PanelType {
  HUD = 'hud',
  Inventory = 'inventory',
  Build = 'build',
  NPC = 'npc',
  Settings = 'settings',
  Pause = 'pause',
}

export interface UIState {
  activePanels: Set<PanelType>;
  modalStack: PanelType[];
  tooltipContent: string | null;
  tooltipPosition: Vector2 | null;
}
