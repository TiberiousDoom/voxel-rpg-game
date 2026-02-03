/**
 * WildlifeRenderer.js - Wildlife rendering system
 *
 * Manages rendering of all wildlife animals on the game canvas with:
 * - Sprite-based rendering with fallback to circles
 * - Health bars
 * - Smooth position interpolation
 * - Death animations
 */

import { NPCPositionInterpolator } from './NPCAnimations.js';
import SpriteLoader from './SpriteLoader.js';
import { WILDLIFE_SPRITE_MANIFEST } from '../assets/sprite-manifest.js';

/**
 * Wildlife color map for fallback rendering
 */
const WILDLIFE_COLORS = {
  DEER: '#8B4513', // Saddle brown
  RABBIT: '#D2B48C', // Tan
  SHEEP: '#F5F5DC', // Beige
  BEAR: '#5C4033', // Dark brown
  BOAR: '#696969', // Dim gray
  WOLF: '#808080', // Gray
  default: '#228B22' // Forest green
};

/**
 * Wildlife Renderer Class
 * Manages rendering state and logic for all wildlife
 */
export class WildlifeRenderer {
  /**
   * Initialize Wildlife Renderer
   * @param {Object} config - Renderer configuration
   */
  constructor(config = {}) {
    this.config = {
      tileSize: config.tileSize || 40,
      showHealthBars: config.showHealthBars !== false,
      enableAnimations: config.enableAnimations !== false,
      useSprites: config.useSprites !== false,
      debugMode: config.debugMode || false,
      ...config
    };

    // Position interpolators for each wildlife (wildlifeId -> NPCPositionInterpolator)
    this.positionInterpolators = new Map();

    // Sprite loading
    this.spriteLoader = new SpriteLoader();
    this.spritesLoaded = false;
    this.spriteLoadError = false;
    this.wildlifeSprites = {};

    // Load sprites if enabled
    if (this.config.useSprites) {
      this._loadSprites();
    }

    // Performance tracking
    this.lastRenderTime = 0;
    this.renderCount = 0;
  }

  /**
   * Load wildlife sprites asynchronously
   * @private
   */
  async _loadSprites() {
    try {
      const loadPromises = Object.entries(WILDLIFE_SPRITE_MANIFEST).map(async ([wildlifeType, data]) => {
        try {
          const key = `wildlife_${wildlifeType}`;
          const sprite = await this.spriteLoader.loadSprite(key, data.sprite);
          this.wildlifeSprites[wildlifeType] = {
            image: sprite,
            size: data.size
          };
          return { wildlifeType, success: true };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`[WildlifeRenderer] Failed to load ${wildlifeType} sprite:`, error.message);
          return { wildlifeType, success: false };
        }
      });

      const results = await Promise.all(loadPromises);
      const successCount = results.filter(r => r.success).length;

      if (successCount > 0) {
        this.spritesLoaded = true;
        // eslint-disable-next-line no-console
        console.log(`[WildlifeRenderer] ${successCount}/${results.length} wildlife sprites loaded`);
      } else {
        throw new Error('No wildlife sprites loaded successfully');
      }
    } catch (error) {
      this.spriteLoadError = true;
      // eslint-disable-next-line no-console
      console.warn('[WildlifeRenderer] Failed to load sprites, using circle fallback:', error.message);
    }
  }

  /**
   * Get or create position interpolator for wildlife
   * @private
   * @param {string} wildlifeId - Wildlife ID
   * @param {Object} initialPosition - Initial position
   * @returns {NPCPositionInterpolator} Position interpolator
   */
  _getPositionInterpolator(wildlifeId, initialPosition) {
    if (!this.positionInterpolators.has(wildlifeId)) {
      this.positionInterpolators.set(wildlifeId, new NPCPositionInterpolator(initialPosition));
    }
    return this.positionInterpolators.get(wildlifeId);
  }

  /**
   * Update wildlife positions for smooth interpolation
   * Call this frequently (e.g., in animation frame)
   * @param {Array<Object>} wildlife - Array of wildlife objects
   * @param {number} deltaTime - Time since last update (ms)
   */
  updatePositions(wildlife, deltaTime = 16) {
    for (const animal of wildlife) {
      if (!animal || !animal.id || !animal.position) continue;

      const interpolator = this._getPositionInterpolator(animal.id, animal.position);

      // Update target position if changed
      const currentTarget = interpolator.targetPosition;
      const newPosition = animal.position;

      if (
        currentTarget.x !== newPosition.x ||
        currentTarget.y !== newPosition.y ||
        currentTarget.z !== newPosition.z
      ) {
        interpolator.setTarget(newPosition);
      }

      // Update interpolation
      interpolator.update(deltaTime);
    }
  }

  /**
   * Render all wildlife on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<Object>} wildlife - Array of wildlife objects
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  renderWildlife(ctx, wildlife, worldToCanvas) {
    if (!ctx || !wildlife || !worldToCanvas) return;

    const startTime = performance.now();

    for (const animal of wildlife) {
      if (!animal || !animal.id || !animal.position) continue;

      // Skip dead wildlife (let them fade out in animation)
      if (!animal.alive && animal.deathTime && Date.now() - animal.deathTime > 1000) {
        continue;
      }

      // Get interpolated position
      const interpolator = this._getPositionInterpolator(animal.id, animal.position);
      const renderPosition = interpolator.currentPosition;

      // Convert to canvas coordinates
      const canvasPos = worldToCanvas(renderPosition.x, renderPosition.z);

      // Render wildlife
      this._renderWildlife(ctx, animal, canvasPos, interpolator);

      // Debug visualization if enabled
      if (this.config.debugMode) {
        this._renderDebugInfo(ctx, animal, canvasPos, interpolator);
      }
    }

    this.lastRenderTime = performance.now() - startTime;
    this.renderCount++;
  }

  /**
   * Render a single wildlife animal
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} animal - Wildlife object
   * @param {Object} canvasPos - Canvas position {x, y}
   * @param {NPCPositionInterpolator} interpolator - Position interpolator
   */
  _renderWildlife(ctx, animal, canvasPos, interpolator) {
    const tileSize = this.config.tileSize;

    // Calculate center position
    const centerX = canvasPos.x + tileSize / 2;
    const centerY = canvasPos.y + tileSize / 2;

    // Get wildlife type (uppercase to match manifest keys)
    const wildlifeType = animal.type?.toUpperCase();
    const spriteData = this.wildlifeSprites[wildlifeType];
    const shouldUseSprite = this.config.useSprites && this.spritesLoaded && !this.spriteLoadError && spriteData;

    if (shouldUseSprite) {
      this._renderWildlifeWithSprite(ctx, animal, centerX, centerY, interpolator, spriteData);
    } else {
      this._renderWildlifeWithCircle(ctx, animal, centerX, centerY, interpolator);
    }

    // Draw health bar if damaged
    if (this.config.showHealthBars) {
      this._renderHealthBar(ctx, animal, centerX, centerY);
    }
  }

  /**
   * Render wildlife using sprite
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} animal - Wildlife object
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {NPCPositionInterpolator} interpolator - Position interpolator
   * @param {Object} spriteData - Sprite data { image, size }
   */
  _renderWildlifeWithSprite(ctx, animal, centerX, centerY, interpolator, spriteData) {
    const velocity = interpolator.getVelocity();
    const isMoving = Math.abs(velocity.x) > 0.01 || Math.abs(velocity.z) > 0.01;

    // Death animation - fade out
    let alpha = 1.0;
    if (!animal.alive && animal.deathTime) {
      const timeSinceDeath = Date.now() - animal.deathTime;
      alpha = Math.max(0, 1 - (timeSinceDeath / 1000));
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // Pulsing animation for idle state
    let scale = 1.0;
    if (!isMoving && animal.alive) {
      const pulseSpeed = 1.5;
      const pulseAmount = 0.05;
      scale = 1 + Math.sin(Date.now() / 1000 * pulseSpeed * Math.PI * 2) * pulseAmount;
    }

    // Calculate draw size based on sprite size and scale
    const drawWidth = spriteData.size.width * scale;
    const drawHeight = spriteData.size.height * scale;

    // Flip horizontally based on movement direction
    const flipX = velocity.x < -0.01;

    ctx.translate(centerX, centerY);
    if (flipX) {
      ctx.scale(-1, 1);
    }

    // Draw the sprite centered at position
    ctx.drawImage(
      spriteData.image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();
  }

  /**
   * Render wildlife using circle (fallback)
   * @private
   */
  _renderWildlifeWithCircle(ctx, animal, centerX, centerY, interpolator) {
    const velocity = interpolator.getVelocity();
    const isMoving = Math.abs(velocity.x) > 0.01 || Math.abs(velocity.z) > 0.01;

    // Death animation - fade out
    let alpha = 1.0;
    if (!animal.alive && animal.deathTime) {
      const timeSinceDeath = Date.now() - animal.deathTime;
      alpha = Math.max(0, 1 - (timeSinceDeath / 1000));
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(centerX, centerY);

    // Pulsing animation for idle state
    let scale = 1.0;
    if (!isMoving && animal.alive) {
      const pulseSpeed = 1.5;
      const pulseAmount = 0.05;
      scale = 1 + Math.sin(Date.now() / 1000 * pulseSpeed * Math.PI * 2) * pulseAmount;
    }
    ctx.scale(scale, scale);

    // Draw wildlife circle
    const radius = animal.size || 10;
    const wildlifeType = animal.type?.toUpperCase() || 'default';
    ctx.fillStyle = WILDLIFE_COLORS[wildlifeType] || WILDLIFE_COLORS.default;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw circle outline
    ctx.strokeStyle = animal.alive ? '#000000' : '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw type letter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const typeLetter = animal.type ? animal.type.charAt(0).toUpperCase() : 'W';
    ctx.fillText(typeLetter, 0, 0);

    ctx.restore();
  }

  /**
   * Render health bar for wildlife
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} animal - Wildlife object
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   */
  _renderHealthBar(ctx, animal, centerX, centerY) {
    const health = animal.health || 0;
    const maxHealth = animal.maxHealth || 100;
    const healthPercent = health / maxHealth;

    // Only show if damaged
    if (healthPercent >= 1.0) return;

    const barWidth = 24;
    const barHeight = 4;
    const barX = centerX - barWidth / 2;
    const barY = centerY - (animal.size || 10) - 8;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health fill (green for peaceful wildlife)
    const healthColor = healthPercent > 0.6 ? '#00ff00' :
                       healthPercent > 0.3 ? '#ffff00' :
                       '#ff0000';
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  /**
   * Render debug information
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} animal - Wildlife object
   * @param {Object} canvasPos - Canvas position {x, y}
   * @param {NPCPositionInterpolator} interpolator - Position interpolator
   */
  _renderDebugInfo(ctx, animal, canvasPos, interpolator) {
    const tileSize = this.config.tileSize;
    const centerX = canvasPos.x + tileSize / 2;
    const centerY = canvasPos.y + tileSize / 2;

    // Draw velocity vector
    if (interpolator.isMoving()) {
      const velocity = interpolator.getVelocity();
      const scale = 20;

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + velocity.x * scale,
        centerY + velocity.z * scale
      );
      ctx.stroke();
    }

    // Draw AI state and ID
    ctx.fillStyle = '#000000';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ID: ${animal.id.slice(-6)}`, centerX, centerY - 20);
    ctx.fillText(`State: ${animal.aiState || 'idle'}`, centerX, centerY - 28);
  }

  /**
   * Cleanup resources for removed wildlife
   * @param {string} wildlifeId - Wildlife ID
   */
  removeWildlife(wildlifeId) {
    this.positionInterpolators.delete(wildlifeId);
  }

  /**
   * Clear all wildlife render data
   */
  clear() {
    this.positionInterpolators.clear();
  }

  /**
   * Set debug mode
   * @param {boolean} enabled - Enable debug mode
   */
  setDebugMode(enabled) {
    this.config.debugMode = enabled;
  }

  /**
   * Get renderer statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      wildlifeCount: this.positionInterpolators.size,
      lastRenderTime: this.lastRenderTime.toFixed(2),
      renderCount: this.renderCount,
      debugMode: this.config.debugMode
    };
  }
}

export default WildlifeRenderer;
