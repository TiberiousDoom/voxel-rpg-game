/**
 * CameraSystem - Smooth camera following for the player
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Camera Settings:
 * - Follow speed: 5.0
 * - Deadzone: 0.5 units
 * - Zoom range: 0.5x to 2.0x
 */

import type { GameSystem } from '@core/GameEngine';
import { getEventBus } from '@core/EventBus';
import type { Vector2, Bounds, GameTime } from '@core/types';

// ============================================================================
// Configuration
// ============================================================================

export interface CameraConfig {
  followSpeed: number;      // How fast camera follows target
  deadzone: number;         // Distance before camera starts moving
  minZoom: number;          // Minimum zoom level
  maxZoom: number;          // Maximum zoom level
  zoomSpeed: number;        // How fast zoom changes
  shakeDecay: number;       // How fast shake diminishes
  viewportWidth: number;    // Viewport width in tiles
  viewportHeight: number;   // Viewport height in tiles
}

const DEFAULT_CONFIG: CameraConfig = {
  followSpeed: 5.0,
  deadzone: 0.5,
  minZoom: 0.5,
  maxZoom: 2.0,
  zoomSpeed: 2.0,
  shakeDecay: 5.0,
  viewportWidth: 20,
  viewportHeight: 15,
};

// ============================================================================
// CameraSystem Implementation
// ============================================================================

export class CameraSystem implements GameSystem {
  public readonly name = 'CameraSystem';

  private config: CameraConfig;
  private position: Vector2 = { x: 0, y: 0 };
  private targetPosition: Vector2 = { x: 0, y: 0 };
  private zoom = 1.0;
  private targetZoom = 1.0;

  // Screen shake
  private shakeIntensity = 0;
  private shakeOffset: Vector2 = { x: 0, y: 0 };

  // Bounds (optional camera limits)
  private bounds: Bounds | null = null;

  constructor(config: Partial<CameraConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the camera system
   */
  public initialize(): void {
    const eventBus = getEventBus();

    // Listen for player movement
    eventBus.on('player:moved', (event) => {
      this.setTarget(event.position.x, event.position.y);
    });

    // Listen for zoom input
    eventBus.on('input:actionPressed', (event) => {
      if (event.action === 'zoomIn') {
        this.zoomIn();
      } else if (event.action === 'zoomOut') {
        this.zoomOut();
      }
    });

    console.log('[CameraSystem] Initialized');
  }

  /**
   * Late update - camera follows after all other updates
   */
  public lateUpdate(deltaTime: number, _gameTime: GameTime): void {
    this.updateFollow(deltaTime);
    this.updateZoom(deltaTime);
    this.updateShake(deltaTime);
  }

  /**
   * Update camera following
   */
  private updateFollow(deltaTime: number): void {
    const { followSpeed, deadzone } = this.config;

    // Calculate distance to target
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only move if outside deadzone
    if (distance > deadzone) {
      // Calculate movement
      const moveAmount = followSpeed * deltaTime;

      if (moveAmount >= distance) {
        // Snap to target if we'd overshoot
        this.position.x = this.targetPosition.x;
        this.position.y = this.targetPosition.y;
      } else {
        // Move toward target
        const ratio = moveAmount / distance;
        this.position.x += dx * ratio;
        this.position.y += dy * ratio;
      }
    }

    // Apply bounds if set
    if (this.bounds) {
      this.clampToBounds();
    }
  }

  /**
   * Update zoom level
   */
  private updateZoom(deltaTime: number): void {
    if (this.zoom !== this.targetZoom) {
      const { zoomSpeed } = this.config;
      const diff = this.targetZoom - this.zoom;
      const change = zoomSpeed * deltaTime;

      if (Math.abs(diff) <= change) {
        this.zoom = this.targetZoom;
      } else {
        this.zoom += Math.sign(diff) * change;
      }
    }
  }

  /**
   * Update screen shake
   */
  private updateShake(deltaTime: number): void {
    if (this.shakeIntensity > 0) {
      // Generate random shake offset
      const angle = Math.random() * Math.PI * 2;
      this.shakeOffset.x = Math.cos(angle) * this.shakeIntensity;
      this.shakeOffset.y = Math.sin(angle) * this.shakeIntensity;

      // Decay shake
      this.shakeIntensity -= this.config.shakeDecay * deltaTime;
      if (this.shakeIntensity < 0) {
        this.shakeIntensity = 0;
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
      }
    }
  }

  /**
   * Clamp camera position to bounds
   */
  private clampToBounds(): void {
    if (!this.bounds) return;

    const halfWidth = this.getViewWidth() / 2;
    const halfHeight = this.getViewHeight() / 2;

    this.position.x = Math.max(
      this.bounds.x + halfWidth,
      Math.min(this.bounds.x + this.bounds.width - halfWidth, this.position.x)
    );

    this.position.y = Math.max(
      this.bounds.y + halfHeight,
      Math.min(this.bounds.y + this.bounds.height - halfHeight, this.position.y)
    );
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Set camera target position
   */
  public setTarget(x: number, y: number): void {
    this.targetPosition.x = x;
    this.targetPosition.y = y;
  }

  /**
   * Immediately snap camera to position
   */
  public snapTo(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.targetPosition.x = x;
    this.targetPosition.y = y;
  }

  /**
   * Get camera position (with shake applied)
   */
  public getPosition(): Readonly<Vector2> {
    return {
      x: this.position.x + this.shakeOffset.x,
      y: this.position.y + this.shakeOffset.y,
    };
  }

  /**
   * Get raw camera position (without shake)
   */
  public getRawPosition(): Readonly<Vector2> {
    return this.position;
  }

  /**
   * Get current zoom level
   */
  public getZoom(): number {
    return this.zoom;
  }

  /**
   * Set zoom level
   */
  public setZoom(zoom: number): void {
    this.targetZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));
  }

  /**
   * Zoom in
   */
  public zoomIn(): void {
    this.setZoom(this.targetZoom * 1.2);
  }

  /**
   * Zoom out
   */
  public zoomOut(): void {
    this.setZoom(this.targetZoom / 1.2);
  }

  /**
   * Add screen shake
   */
  public shake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  /**
   * Set camera bounds
   */
  public setBounds(bounds: Bounds | null): void {
    this.bounds = bounds;
    if (bounds) {
      this.clampToBounds();
    }
  }

  /**
   * Get visible area in world coordinates
   */
  public getViewBounds(): Bounds {
    const halfWidth = this.getViewWidth() / 2;
    const halfHeight = this.getViewHeight() / 2;
    const pos = this.getPosition();

    return {
      x: pos.x - halfWidth,
      y: pos.y - halfHeight,
      width: this.getViewWidth(),
      height: this.getViewHeight(),
    };
  }

  /**
   * Get view width in world units
   */
  public getViewWidth(): number {
    return this.config.viewportWidth / this.zoom;
  }

  /**
   * Get view height in world units
   */
  public getViewHeight(): number {
    return this.config.viewportHeight / this.zoom;
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  public screenToWorld(screenX: number, screenY: number, screenWidth: number, screenHeight: number): Vector2 {
    const pos = this.getPosition();
    const viewWidth = this.getViewWidth();
    const viewHeight = this.getViewHeight();

    return {
      x: pos.x + (screenX / screenWidth - 0.5) * viewWidth,
      y: pos.y + (screenY / screenHeight - 0.5) * viewHeight,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  public worldToScreen(worldX: number, worldY: number, screenWidth: number, screenHeight: number): Vector2 {
    const pos = this.getPosition();
    const viewWidth = this.getViewWidth();
    const viewHeight = this.getViewHeight();

    return {
      x: ((worldX - pos.x) / viewWidth + 0.5) * screenWidth,
      y: ((worldY - pos.y) / viewHeight + 0.5) * screenHeight,
    };
  }

  /**
   * Check if a world position is visible
   */
  public isVisible(worldX: number, worldY: number, margin = 0): boolean {
    const bounds = this.getViewBounds();
    return (
      worldX >= bounds.x - margin &&
      worldX <= bounds.x + bounds.width + margin &&
      worldY >= bounds.y - margin &&
      worldY <= bounds.y + bounds.height + margin
    );
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    console.log('[CameraSystem] Destroyed');
  }
}
