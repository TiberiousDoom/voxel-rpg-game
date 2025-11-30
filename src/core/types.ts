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
  gamepadButtons?: number[];  // Standard Gamepad API button indices
}

// ============================================================================
// Gamepad Types
// Per 2D_GAME_IMPLEMENTATION_PLAN.md - Input System (Gamepad Support)
// ============================================================================

/**
 * Standard Gamepad button indices (W3C Gamepad API)
 * https://w3c.github.io/gamepad/#remapping
 */
export enum GamepadButton {
  A = 0,            // Bottom button (A on Xbox, X on PlayStation)
  B = 1,            // Right button (B on Xbox, Circle on PlayStation)
  X = 2,            // Left button (X on Xbox, Square on PlayStation)
  Y = 3,            // Top button (Y on Xbox, Triangle on PlayStation)
  LeftBumper = 4,   // Left shoulder button (LB/L1)
  RightBumper = 5,  // Right shoulder button (RB/R1)
  LeftTrigger = 6,  // Left trigger (LT/L2)
  RightTrigger = 7, // Right trigger (RT/R2)
  Select = 8,       // Back/Select/Share
  Start = 9,        // Start/Menu/Options
  LeftStick = 10,   // Left stick pressed (L3)
  RightStick = 11,  // Right stick pressed (R3)
  DPadUp = 12,      // D-pad up
  DPadDown = 13,    // D-pad down
  DPadLeft = 14,    // D-pad left
  DPadRight = 15,   // D-pad right
  Home = 16,        // Home/Guide button
}

/**
 * Standard Gamepad axes
 */
export enum GamepadAxis {
  LeftStickX = 0,   // Left stick horizontal (-1 left, 1 right)
  LeftStickY = 1,   // Left stick vertical (-1 up, 1 down)
  RightStickX = 2,  // Right stick horizontal
  RightStickY = 3,  // Right stick vertical
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

// ============================================================================
// Touch Input Types
// Per 2D_GAME_IMPLEMENTATION_PLAN.md v1.2 - Touch Input System
// ============================================================================

/**
 * Virtual Joystick Configuration
 * Per spec: position, radius (80px), innerRadius (30px), deadzone (0.1), opacity
 */
export interface VirtualJoystickConfig {
  position: Vector2;              // Screen position (bottom-left default)
  radius: number;                 // Touch area radius (80px default)
  innerRadius: number;            // Knob radius (30px default)
  deadzone: number;               // 0.1 default
  opacity: number;                // 0.5 when not touched, 0.8 when active
  activeOpacity: number;          // Opacity when touched
  showOnTouch: boolean;           // Appear where finger touches (true)
}

/**
 * Touch Button Configuration
 * Per spec: position, size (min 44x44), icon, action, hapticFeedback
 */
export interface TouchButtonConfig {
  id: string;
  position: Vector2;              // Screen position
  size: Vector2;                  // Minimum 44x44 points
  icon: string;                   // Icon name/path
  label?: string;                 // Optional label text
  action: InputAction;            // Action to trigger
  showLabel: boolean;
  hapticFeedback: boolean;        // Vibrate on press (optional)
}

/**
 * Gesture types supported
 * Per spec: tap, double-tap, long-press, pinch, two-finger pan, drag
 */
export enum GestureType {
  Tap = 'tap',
  DoubleTap = 'doubleTap',
  LongPress = 'longPress',
  Pinch = 'pinch',
  TwoFingerPan = 'twoFingerPan',
  Drag = 'drag',
  Swipe = 'swipe',
}

/**
 * Gesture event data
 */
export interface GestureEvent {
  type: GestureType;
  position: Vector2;              // Screen position
  worldPosition?: Vector2;        // World position (if available)
  scale?: number;                 // For pinch gesture (1.0 = no change)
  delta?: Vector2;                // For pan/drag gestures
  direction?: Direction;          // For swipe gestures
  duration?: number;              // For long-press (ms held)
}

/**
 * Touch Configuration
 * Per spec: joystickSide, buttonLayout, sensitivity, hapticEnabled
 */
export interface TouchConfig {
  enabled: boolean;               // Whether touch controls are enabled
  joystickSide: 'left' | 'right'; // Which side for movement
  buttonLayout: 'default' | 'compact' | 'spread';
  sensitivity: number;            // 0.5 to 2.0
  hapticEnabled: boolean;
  showJoystickAlways: boolean;    // Or only on touch
  doubleTapTime: number;          // Max ms between taps for double-tap
  longPressTime: number;          // Ms to hold for long-press
}

/**
 * Touch state tracking
 */
export interface TouchState {
  active: boolean;
  identifier: number;
  startPosition: Vector2;
  currentPosition: Vector2;
  startTime: number;
}

// ============================================================================
// Responsive UI Types
// Per 2D_GAME_IMPLEMENTATION_PLAN.md v1.2 - Responsive UI System
// ============================================================================

/**
 * Screen breakpoints
 * Per spec: phone (0-599), phoneLandscape (600-767), tablet (768-1023), desktop (1024+)
 */
export enum Breakpoint {
  Phone = 'phone',
  PhoneLandscape = 'phoneLandscape',
  Tablet = 'tablet',
  Desktop = 'desktop',
}

/**
 * Breakpoint thresholds in pixels
 */
export const BREAKPOINT_THRESHOLDS = {
  phone: 0,
  phoneLandscape: 600,
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * UI Scale factors per breakpoint
 * Per spec: phone 1.25, tablet/desktop 1.0
 */
export const UI_SCALE_FACTORS = {
  phone: 1.25,
  phoneLandscape: 1.1,
  tablet: 1.0,
  desktop: 1.0,
} as const;

/**
 * Touch target sizes
 * Per spec: min 44px, preferred 48px
 */
export const TOUCH_TARGET_SIZES = {
  minimum: 44,
  preferred: 48,
} as const;

/**
 * Responsive UI Configuration
 */
export interface ResponsiveConfig {
  currentBreakpoint: Breakpoint;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  uiScale: number;
  isTouch: boolean;
  isLandscape: boolean;
}

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  hasTouch: boolean;
  hasGamepad: boolean;
  hasMouse: boolean;
  hasKeyboard: boolean;
  supportsHaptic: boolean;
  supportsFullscreen: boolean;
  isMobile: boolean;
  isStandalone: boolean;          // PWA installed
}
