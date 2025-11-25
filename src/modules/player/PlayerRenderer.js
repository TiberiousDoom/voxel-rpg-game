/**
 * PlayerRenderer.js
 * Renders the player character on 2D canvas
 */

import { useRef } from 'react';
import SpriteLoader from '../../rendering/SpriteLoader.js';
import { PLAYER_SPRITE_MANIFEST } from '../../assets/sprite-manifest.js';

/**
 * Player sprite configuration
 */
const PLAYER_CONFIG = {
  color: '#4A90E2', // Blue
  size: 12, // Pixels (larger than NPCs which are 8px)
  outlineColor: '#FFFFFF',
  outlineWidth: 2,
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  shadowOffset: 2,
};

/**
 * Player renderer class
 */
export class PlayerRenderer {
  constructor(options = {}) {
    this.tileSize = options.tileSize || 40;
    this.showHealthBar = options.showHealthBar !== false;
    this.showStaminaBar = options.showStaminaBar !== false;
    this.showInteractionRadius = options.showInteractionRadius || false;

    // Sprite configuration
    this.config = {
      useSprites: options.useSprites !== false,
      ...options
    };

    // Initialize sprite loader
    this.spriteLoader = new SpriteLoader();
    this.spritesLoaded = false;
    this.spriteLoadError = false;
    this.spriteSheets = {};

    // Animation tracking
    this.animationFrame = 0;
    this.lastAnimationUpdate = 0;
    this.animationSpeed = 150; // ms per frame
    this.previousAnimState = 'idle'; // Track previous state to reset frame on change

    // Load sprites if enabled
    if (this.config.useSprites) {
      this._loadSprites();
    }
  }

  /**
   * Load player sprites asynchronously
   * Gracefully handles loading failures by falling back to circle rendering
   * @private
   */
  async _loadSprites() {
    try {
      const frameWidth = PLAYER_SPRITE_MANIFEST.frameSize.width;
      const frameHeight = PLAYER_SPRITE_MANIFEST.frameSize.height;

      // Load all player sprite sheets (idle, walk, sprint)
      const states = ['idle', 'walk', 'sprint'];
      const loadPromises = states.map(async (state) => {
        try {
          const spritePath = PLAYER_SPRITE_MANIFEST[state];
          const frameCount = PLAYER_SPRITE_MANIFEST.frames[state];
          const key = `player_${state}`;

          // eslint-disable-next-line no-console
          console.log(`[PlayerRenderer] Loading ${state} sprite from ${spritePath}`);

          const spriteSheet = await this.spriteLoader.loadSpriteSheet(
            key,
            spritePath,
            frameWidth,
            frameHeight
          );

          this.spriteSheets[state] = {
            sheet: spriteSheet,
            frameCount: frameCount
          };

          // eslint-disable-next-line no-console
          console.log(`[PlayerRenderer] Successfully loaded ${state} sprite`);
          return { state, success: true };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`[PlayerRenderer] Failed to load ${state} sprite:`, error.message);
          return { state, success: false, error };
        }
      });

      const results = await Promise.all(loadPromises);

      // Check if at least one sprite loaded successfully
      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        this.spritesLoaded = true;
        // eslint-disable-next-line no-console
        console.log(`[PlayerRenderer] ${successCount} sprite(s) loaded successfully`);
      } else {
        throw new Error('No sprites loaded successfully');
      }
    } catch (error) {
      this.spriteLoadError = true;
      // eslint-disable-next-line no-console
      console.warn('[PlayerRenderer] Failed to load sprites, falling back to circle rendering:', error.message);
    }
  }

  /**
   * Render the player on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {PlayerEntity} player - Player entity
   * @param {Function} worldToCanvas - Coordinate conversion function
   */
  renderPlayer(ctx, player, worldToCanvas) {
    if (!player) return;

    const canvasPos = worldToCanvas(player.position.x, player.position.z);
    const centerX = canvasPos.x + this.tileSize / 2;
    const centerY = canvasPos.y + this.tileSize / 2;

    ctx.save();

    // Draw target marker (if tap-to-move is active)
    if (player.targetPosition) {
      this.renderTargetMarker(ctx, player.targetPosition, worldToCanvas);
    }

    // Draw interaction radius (if enabled)
    if (this.showInteractionRadius) {
      this.renderInteractionRadius(ctx, centerX, centerY, player.interactionRadius);
    }

    // Draw shadow
    this.renderShadow(ctx, centerX, centerY);

    // Draw player body
    this.renderBody(ctx, centerX, centerY, player);

    // Draw direction indicator
    this.renderDirectionIndicator(ctx, centerX, centerY, player.facing);

    // Draw health bar
    if (this.showHealthBar) {
      this.renderHealthBar(ctx, centerX, centerY - 15, player.health, player.maxHealth);
    }

    // Draw stamina bar
    if (this.showStaminaBar) {
      this.renderStaminaBar(ctx, centerX, centerY - 10, player.stamina, player.maxStamina);
    }

    // Draw sprint indicator
    if (player.isSprinting) {
      this.renderSprintIndicator(ctx, centerX, centerY);
    }

    ctx.restore();
  }

  /**
   * Render player body (sprite or circle with outline)
   */
  renderBody(ctx, x, y, player) {
    // Determine if we should use sprites
    const shouldUseSprites = this.config.useSprites && this.spritesLoaded && !this.spriteLoadError;

    if (shouldUseSprites) {
      this._renderPlayerWithSprite(ctx, x, y, player);
    } else {
      this._renderPlayerWithCircle(ctx, x, y, player);
    }
  }

  /**
   * Render player using sprite
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {object} player - Player entity
   * @private
   */
  _renderPlayerWithSprite(ctx, x, y, player) {
    // Determine animation state
    const isMoving = player.velocity.x !== 0 || player.velocity.z !== 0;
    let animState = 'idle';

    if (isMoving) {
      animState = player.isSprinting ? 'sprint' : 'walk';
    }

    const spriteData = this.spriteSheets[animState];

    if (!spriteData || !spriteData.sheet) {
      // Sprite not available for this state, fall back to circle
      this._renderPlayerWithCircle(ctx, x, y, player);
      return;
    }

    // Reset animation frame when state changes to prevent out-of-bounds access
    if (animState !== this.previousAnimState) {
      this.animationFrame = 0;
      this.lastAnimationUpdate = Date.now();
      this.previousAnimState = animState;
    }

    // Update animation frame
    const now = Date.now();
    if (now - this.lastAnimationUpdate > this.animationSpeed) {
      this.animationFrame = (this.animationFrame + 1) % spriteData.frameCount;
      this.lastAnimationUpdate = now;
    }

    // Ensure frame index is valid (defensive check)
    const frameIndex = Math.min(this.animationFrame, spriteData.frameCount - 1);

    // Determine if we should flip the sprite based on facing direction
    const flipX = player.facing === 'left';

    // Draw outer glow if sprinting
    if (player.isSprinting) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
      ctx.fill();
    }

    // Draw the sprite
    const drawSize = PLAYER_CONFIG.size * 1.5; // Scale up slightly for visibility

    ctx.save();
    if (flipX) {
      ctx.scale(-1, 1);
      spriteData.sheet.drawFrameFlipped(
        ctx,
        frameIndex,
        -x - drawSize / 2,
        y - drawSize / 2,
        drawSize,
        drawSize,
        true
      );
    } else {
      spriteData.sheet.drawFrameFlipped(
        ctx,
        frameIndex,
        x - drawSize / 2,
        y - drawSize / 2,
        drawSize,
        drawSize,
        false
      );
    }
    ctx.restore();
  }

  /**
   * Render player using circle (fallback)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {object} player - Player entity
   * @private
   */
  _renderPlayerWithCircle(ctx, x, y, player) {
    const radius = PLAYER_CONFIG.size / 2;

    // Pulsing effect when moving
    const isMoving = player.velocity.x !== 0 || player.velocity.z !== 0;
    const pulseScale = isMoving ? 1 + Math.sin(player.animationTime * 10) * 0.1 : 1;

    // Draw outer glow if sprinting
    if (player.isSprinting) {
      ctx.beginPath();
      ctx.arc(x, y, radius * pulseScale * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
      ctx.fill();
    }

    // Draw outline
    ctx.beginPath();
    ctx.arc(x, y, radius * pulseScale, 0, Math.PI * 2);
    ctx.strokeStyle = PLAYER_CONFIG.outlineColor;
    ctx.lineWidth = PLAYER_CONFIG.outlineWidth;
    ctx.stroke();

    // Draw body
    ctx.beginPath();
    ctx.arc(x, y, radius * pulseScale, 0, Math.PI * 2);
    ctx.fillStyle = PLAYER_CONFIG.color;
    ctx.fill();

    // Draw "P" letter for player
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', x, y);
  }

  /**
   * Render direction indicator (small triangle)
   */
  renderDirectionIndicator(ctx, x, y, facing) {
    const offset = PLAYER_CONFIG.size / 2 + 3;
    let dx = 0, dy = 0;

    switch (facing) {
      case 'up':
        dx = 0;
        dy = -offset;
        break;
      case 'down':
        dx = 0;
        dy = offset;
        break;
      case 'left':
        dx = -offset;
        dy = 0;
        break;
      case 'right':
        dx = offset;
        dy = 0;
        break;
      default:
        // Default to down
        dx = 0;
        dy = offset;
        break;
    }

    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }

  /**
   * Render shadow beneath player
   */
  renderShadow(ctx, x, y) {
    ctx.beginPath();
    ctx.ellipse(
      x,
      y + PLAYER_CONFIG.size / 2 + PLAYER_CONFIG.shadowOffset,
      PLAYER_CONFIG.size / 2,
      PLAYER_CONFIG.size / 4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = PLAYER_CONFIG.shadowColor;
    ctx.fill();
  }

  /**
   * Render health bar above player
   */
  renderHealthBar(ctx, x, y, health, maxHealth) {
    const barWidth = 20;
    const barHeight = 3;
    const healthPercent = Math.max(0, Math.min(1, health / maxHealth));

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    // Health fill (color-coded)
    let healthColor = '#4CAF50'; // Green
    if (healthPercent < 0.3) {
      healthColor = '#F44336'; // Red
    } else if (healthPercent < 0.6) {
      healthColor = '#FFC107'; // Yellow
    }

    ctx.fillStyle = healthColor;
    ctx.fillRect(x - barWidth / 2, y, barWidth * healthPercent, barHeight);
  }

  /**
   * Render stamina bar above health bar
   */
  renderStaminaBar(ctx, x, y, stamina, maxStamina) {
    const barWidth = 20;
    const barHeight = 2;
    const staminaPercent = Math.max(0, Math.min(1, stamina / maxStamina));

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    // Stamina fill (yellow)
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x - barWidth / 2, y, barWidth * staminaPercent, barHeight);
  }

  /**
   * Render interaction radius circle
   */
  renderInteractionRadius(ctx, x, y, radius) {
    const radiusPixels = radius * this.tileSize;

    ctx.beginPath();
    ctx.arc(x, y, radiusPixels, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(74, 144, 226, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Render sprint indicator (speed lines)
   */
  renderSprintIndicator(ctx, x, y) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;

    for (let i = 0; i < 3; i++) {
      const offset = i * 5 - 5;
      ctx.beginPath();
      ctx.moveTo(x - 15 + offset, y - 10);
      ctx.lineTo(x - 10 + offset, y - 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - 15 + offset, y);
      ctx.lineTo(x - 10 + offset, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - 15 + offset, y + 10);
      ctx.lineTo(x - 10 + offset, y + 10);
      ctx.stroke();
    }
  }

  /**
   * Render target marker for tap-to-move
   */
  renderTargetMarker(ctx, targetPos, worldToCanvas) {
    const canvasPos = worldToCanvas(targetPos.x, targetPos.z);
    const x = canvasPos.x + this.tileSize / 2;
    const y = canvasPos.y + this.tileSize / 2;

    ctx.save();

    // Pulsing animation
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 4) * 0.2 + 0.8;

    // Draw outer ring
    ctx.beginPath();
    ctx.arc(x, y, 15 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(74, 144, 226, ${0.6 * pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw inner circle
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw crosshair
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x, y + 10);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Create a player renderer hook (React-style)
 */
export function usePlayerRenderer(options = {}) {
  const rendererRef = useRef(null);

  if (!rendererRef.current) {
    rendererRef.current = new PlayerRenderer(options);
  }

  return {
    renderPlayer: (ctx, player, worldToCanvas) => {
      rendererRef.current.renderPlayer(ctx, player, worldToCanvas);
    },
    setOptions: (newOptions) => {
      Object.assign(rendererRef.current, newOptions);
    }
  };
}

// For non-React usage
export function createPlayerRenderer(options) {
  return new PlayerRenderer(options);
}
