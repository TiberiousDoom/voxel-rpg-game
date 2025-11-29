/**
 * PlayerController - Handles player movement and state
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Player Controller:
 * States: Idle, Walking, Running, Interacting, InMenu, Combat
 */

import type { GameSystem } from '@core/GameEngine';
import { getEventBus } from '@core/EventBus';
import { Direction } from '@core/types';
import type { Vector2, GameTime, InputAction } from '@core/types';

// ============================================================================
// Player State
// ============================================================================

export enum PlayerState {
  Idle = 'idle',
  Walking = 'walking',
  Running = 'running',
  Interacting = 'interacting',
  InMenu = 'inMenu',
  Combat = 'combat',
}

// ============================================================================
// Player Configuration
// ============================================================================

export interface PlayerConfig {
  walkSpeed: number;
  runSpeed: number;
  acceleration: number;
  deceleration: number;
}

const DEFAULT_CONFIG: PlayerConfig = {
  walkSpeed: 4,      // Tiles per second
  runSpeed: 7,       // Tiles per second when sprinting
  acceleration: 20,  // How fast to reach max speed
  deceleration: 15,  // How fast to stop
};

// ============================================================================
// PlayerController Implementation
// ============================================================================

export class PlayerController implements GameSystem {
  public readonly name = 'PlayerController';

  private config: PlayerConfig;
  private position: Vector2 = { x: 0, y: 0 };
  private velocity: Vector2 = { x: 0, y: 0 };
  private facing: Direction = Direction.South;
  private state: PlayerState = PlayerState.Idle;

  // Input state
  private moveInput: Vector2 = { x: 0, y: 0 };
  private digitalMoveInput: Vector2 = { x: 0, y: 0 }; // D-pad/keyboard
  private analogMoveInput: Vector2 = { x: 0, y: 0 };  // Left stick
  private isSprinting = false;

  // Collision callback (set by game to check tile walkability)
  private checkWalkable: ((x: number, y: number) => boolean) | null = null;

  constructor(config: Partial<PlayerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the player controller
   */
  public initialize(): void {
    const eventBus = getEventBus();

    // Subscribe to input events
    eventBus.on('input:actionPressed', this.onActionPressed.bind(this));
    eventBus.on('input:actionReleased', this.onActionReleased.bind(this));

    // Subscribe to gamepad analog stick for smooth movement
    eventBus.on('input:leftStickMoved', this.onLeftStickMoved.bind(this));

    console.log('[PlayerController] Initialized');
  }

  /**
   * Set the walkability check function
   */
  public setWalkableCheck(fn: (x: number, y: number) => boolean): void {
    this.checkWalkable = fn;
  }

  /**
   * Handle action pressed events (digital input: keyboard/D-pad)
   */
  private onActionPressed(event: { action: string }): void {
    switch (event.action) {
      case 'moveUp':
        this.digitalMoveInput.y = -1;
        break;
      case 'moveDown':
        this.digitalMoveInput.y = 1;
        break;
      case 'moveLeft':
        this.digitalMoveInput.x = -1;
        break;
      case 'moveRight':
        this.digitalMoveInput.x = 1;
        break;
      case 'sprint':
        this.isSprinting = true;
        break;
      case 'interact':
        this.interact();
        break;
    }
    this.updateCombinedInput();
  }

  /**
   * Handle action released events (digital input: keyboard/D-pad)
   */
  private onActionReleased(event: { action: string }): void {
    switch (event.action) {
      case 'moveUp':
        if (this.digitalMoveInput.y < 0) this.digitalMoveInput.y = 0;
        break;
      case 'moveDown':
        if (this.digitalMoveInput.y > 0) this.digitalMoveInput.y = 0;
        break;
      case 'moveLeft':
        if (this.digitalMoveInput.x < 0) this.digitalMoveInput.x = 0;
        break;
      case 'moveRight':
        if (this.digitalMoveInput.x > 0) this.digitalMoveInput.x = 0;
        break;
      case 'sprint':
        this.isSprinting = false;
        break;
    }
    this.updateCombinedInput();
  }

  /**
   * Handle left stick input (analog input from gamepad)
   */
  private onLeftStickMoved(event: { x: number; y: number }): void {
    this.analogMoveInput = { x: event.x, y: event.y };
    this.updateCombinedInput();
  }

  /**
   * Combine digital and analog input (analog takes priority when active)
   */
  private updateCombinedInput(): void {
    const analogLength = Math.sqrt(
      this.analogMoveInput.x ** 2 + this.analogMoveInput.y ** 2
    );

    // Use analog if active (magnitude > small threshold), otherwise digital
    if (analogLength > 0.1) {
      this.moveInput = { ...this.analogMoveInput };
    } else {
      this.moveInput = { ...this.digitalMoveInput };
    }
  }

  /**
   * Fixed update for physics
   */
  public fixedUpdate(fixedDeltaTime: number, _gameTime: GameTime): void {
    if (this.state === PlayerState.InMenu || this.state === PlayerState.Interacting) {
      return;
    }

    this.updateMovement(fixedDeltaTime);
  }

  /**
   * Update movement physics
   */
  private updateMovement(deltaTime: number): void {
    const { acceleration, deceleration, walkSpeed, runSpeed } = this.config;

    // Normalize input
    let inputX = this.moveInput.x;
    let inputY = this.moveInput.y;
    const inputLength = Math.sqrt(inputX * inputX + inputY * inputY);
    if (inputLength > 1) {
      inputX /= inputLength;
      inputY /= inputLength;
    }

    // Calculate target velocity
    const maxSpeed = this.isSprinting ? runSpeed : walkSpeed;
    const targetVelX = inputX * maxSpeed;
    const targetVelY = inputY * maxSpeed;

    // Apply acceleration/deceleration
    if (inputLength > 0) {
      // Accelerate toward target
      this.velocity.x = this.approach(this.velocity.x, targetVelX, acceleration * deltaTime);
      this.velocity.y = this.approach(this.velocity.y, targetVelY, acceleration * deltaTime);
    } else {
      // Decelerate to stop
      this.velocity.x = this.approach(this.velocity.x, 0, deceleration * deltaTime);
      this.velocity.y = this.approach(this.velocity.y, 0, deceleration * deltaTime);
    }

    // Calculate new position
    const newX = this.position.x + this.velocity.x * deltaTime;
    const newY = this.position.y + this.velocity.y * deltaTime;

    // Check collision (simple tile-based check)
    const canMoveX = this.canMoveTo(newX, this.position.y);
    const canMoveY = this.canMoveTo(this.position.x, newY);

    const oldPosition = { ...this.position };

    if (canMoveX) {
      this.position.x = newX;
    } else {
      this.velocity.x = 0;
    }

    if (canMoveY) {
      this.position.y = newY;
    } else {
      this.velocity.y = 0;
    }

    // Update facing direction
    if (inputLength > 0) {
      this.facing = this.calculateFacing(inputX, inputY);
    }

    // Update state
    this.updateState();

    // Emit movement event if position changed
    if (this.position.x !== oldPosition.x || this.position.y !== oldPosition.y) {
      const eventBus = getEventBus();
      eventBus.emit('player:moved', { position: { ...this.position } });
    }
  }

  /**
   * Check if player can move to a position
   */
  private canMoveTo(x: number, y: number): boolean {
    if (!this.checkWalkable) {
      return true; // No collision check set, allow movement
    }

    // Check the tile at the target position
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);

    return this.checkWalkable(tileX, tileY);
  }

  /**
   * Calculate facing direction from input
   */
  private calculateFacing(inputX: number, inputY: number): Direction {
    // Prioritize vertical movement for diagonal
    if (Math.abs(inputY) >= Math.abs(inputX)) {
      return inputY < 0 ? Direction.North : Direction.South;
    } else {
      return inputX < 0 ? Direction.West : Direction.East;
    }
  }

  /**
   * Update player state based on current conditions
   */
  private updateState(): void {
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);

    if (speed < 0.1) {
      this.state = PlayerState.Idle;
    } else if (this.isSprinting && speed > this.config.walkSpeed * 0.9) {
      this.state = PlayerState.Running;
    } else {
      this.state = PlayerState.Walking;
    }
  }

  /**
   * Handle interaction
   */
  private interact(): void {
    // Calculate the tile in front of the player
    const targetX = Math.floor(this.position.x + this.getFacingOffset().x);
    const targetY = Math.floor(this.position.y + this.getFacingOffset().y);

    const eventBus = getEventBus();
    eventBus.emit('player:interacted', {
      targetId: null,
      position: { x: targetX, y: targetY },
    });
  }

  /**
   * Get the offset for the facing direction
   */
  private getFacingOffset(): Vector2 {
    switch (this.facing) {
      case Direction.North:
        return { x: 0, y: -1 };
      case Direction.South:
        return { x: 0, y: 1 };
      case Direction.East:
        return { x: 1, y: 0 };
      case Direction.West:
        return { x: -1, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }

  /**
   * Approach a target value at a given rate
   */
  private approach(current: number, target: number, rate: number): number {
    if (current < target) {
      return Math.min(current + rate, target);
    } else {
      return Math.max(current - rate, target);
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get current position
   */
  public getPosition(): Readonly<Vector2> {
    return this.position;
  }

  /**
   * Set position (e.g., for teleportation or loading)
   */
  public setPosition(x: number, y: number): void {
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };

    const eventBus = getEventBus();
    eventBus.emit('player:moved', { position: { ...this.position } });
  }

  /**
   * Get current velocity
   */
  public getVelocity(): Readonly<Vector2> {
    return this.velocity;
  }

  /**
   * Get current facing direction
   */
  public getFacing(): Direction {
    return this.facing;
  }

  /**
   * Get current state
   */
  public getState(): PlayerState {
    return this.state;
  }

  /**
   * Set state (e.g., for entering menus)
   */
  public setState(state: PlayerState): void {
    this.state = state;

    // Reset velocity when entering menu/interacting
    if (state === PlayerState.InMenu || state === PlayerState.Interacting) {
      this.velocity = { x: 0, y: 0 };
    }
  }

  /**
   * Check if player is moving
   */
  public isMoving(): boolean {
    return this.state === PlayerState.Walking || this.state === PlayerState.Running;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    console.log('[PlayerController] Destroyed');
  }
}
