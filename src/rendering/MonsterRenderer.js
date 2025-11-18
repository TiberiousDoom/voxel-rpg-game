/**
 * MonsterRenderer.js - Monster rendering system
 *
 * Manages rendering of all monsters on the game canvas with:
 * - Circle-based rendering (sprites to be added later)
 * - Health bars
 * - Smooth position interpolation
 * - Death animations
 */

import { NPCPositionInterpolator } from './NPCAnimations.js';

/**
 * Monster Renderer Class
 * Manages rendering state and logic for all monsters
 */
export class MonsterRenderer {
  /**
   * Initialize Monster Renderer
   * @param {Object} config - Renderer configuration
   */
  constructor(config = {}) {
    this.config = {
      tileSize: config.tileSize || 40,
      showHealthBars: config.showHealthBars !== false,
      enableAnimations: config.enableAnimations !== false,
      debugMode: config.debugMode || false,
      ...config
    };

    // Position interpolators for each monster (monsterId -> NPCPositionInterpolator)
    this.positionInterpolators = new Map();

    // Performance tracking
    this.lastRenderTime = 0;
    this.renderCount = 0;
  }

  /**
   * Get or create position interpolator for monster
   * @private
   * @param {string} monsterId - Monster ID
   * @param {Object} initialPosition - Initial position
   * @returns {NPCPositionInterpolator} Position interpolator
   */
  _getPositionInterpolator(monsterId, initialPosition) {
    if (!this.positionInterpolators.has(monsterId)) {
      this.positionInterpolators.set(monsterId, new NPCPositionInterpolator(initialPosition));
    }
    return this.positionInterpolators.get(monsterId);
  }

  /**
   * Update monster positions for smooth interpolation
   * Call this frequently (e.g., in animation frame)
   * @param {Array<Object>} monsters - Array of monster objects
   * @param {number} deltaTime - Time since last update (ms)
   */
  updatePositions(monsters, deltaTime = 16) {
    for (const monster of monsters) {
      if (!monster || !monster.id || !monster.position) continue;

      const interpolator = this._getPositionInterpolator(monster.id, monster.position);

      // Update target position if changed
      const currentTarget = interpolator.targetPosition;
      const newPosition = monster.position;

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
   * Render all monsters on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<Object>} monsters - Array of monster objects
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  renderMonsters(ctx, monsters, worldToCanvas) {
    if (!ctx || !monsters || !worldToCanvas) return;

    const startTime = performance.now();

    for (const monster of monsters) {
      if (!monster || !monster.id || !monster.position) continue;

      // Skip dead monsters (let them fade out in animation)
      if (!monster.alive && Date.now() - monster.deathTime > 1000) {
        continue;
      }

      // Get interpolated position
      const interpolator = this._getPositionInterpolator(monster.id, monster.position);
      const renderPosition = interpolator.currentPosition;

      // Convert to canvas coordinates
      const canvasPos = worldToCanvas(renderPosition.x, renderPosition.z);

      // Render monster
      this._renderMonster(ctx, monster, canvasPos, interpolator);

      // Debug visualization if enabled
      if (this.config.debugMode) {
        this._renderDebugInfo(ctx, monster, canvasPos, interpolator);
      }
    }

    this.lastRenderTime = performance.now() - startTime;
    this.renderCount++;
  }

  /**
   * Render a single monster
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} monster - Monster object
   * @param {Object} canvasPos - Canvas position {x, y}
   * @param {NPCPositionInterpolator} interpolator - Position interpolator
   */
  _renderMonster(ctx, monster, canvasPos, interpolator) {
    const tileSize = this.config.tileSize;

    // Calculate center position
    const centerX = canvasPos.x + tileSize / 2;
    const centerY = canvasPos.y + tileSize / 2;

    // Render with circle (sprites will be added later)
    this._renderMonsterWithCircle(ctx, monster, centerX, centerY, interpolator);

    // Draw health bar if damaged
    if (this.config.showHealthBars) {
      this._renderHealthBar(ctx, monster, centerX, centerY);
    }
  }

  /**
   * Render monster using circle
   * @private
   */
  _renderMonsterWithCircle(ctx, monster, centerX, centerY, interpolator) {
    // Calculate direction for facing
    const velocity = interpolator.getVelocity();
    const isMoving = Math.abs(velocity.x) > 0.01 || Math.abs(velocity.z) > 0.01;

    // Death animation - fade out
    let alpha = 1.0;
    if (!monster.alive && monster.deathTime) {
      const timeSinceDeath = Date.now() - monster.deathTime;
      alpha = Math.max(0, 1 - (timeSinceDeath / 1000)); // Fade over 1 second
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(centerX, centerY);

    // Pulsing animation for idle state
    let scale = 1.0;
    if (!isMoving && monster.alive) {
      const pulseSpeed = 2; // Hz
      const pulseAmount = 0.1;
      scale = 1 + Math.sin(Date.now() / 1000 * pulseSpeed * Math.PI * 2) * pulseAmount;
    }
    ctx.scale(scale, scale);

    // Draw monster circle
    const radius = monster.size || 12;
    ctx.fillStyle = monster.tint || monster.color || '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw circle outline
    ctx.strokeStyle = monster.alive ? '#000000' : '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw type letter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const typeLetter = monster.type ? monster.type.charAt(0) : 'M';
    ctx.fillText(typeLetter, 0, 0);

    ctx.restore();
  }

  /**
   * Render health bar for monster
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} monster - Monster object
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   */
  _renderHealthBar(ctx, monster, centerX, centerY) {
    const health = monster.health || 0;
    const maxHealth = monster.maxHealth || 100;
    const healthPercent = health / maxHealth;

    // Only show if damaged or always show for monsters
    if (healthPercent >= 1.0) return;

    const barWidth = 24;
    const barHeight = 4;
    const barX = centerX - barWidth / 2;
    const barY = centerY - (monster.size || 12) - 8;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health fill (red/yellow/green based on health)
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
   * @param {Object} monster - Monster object
   * @param {Object} canvasPos - Canvas position {x, y}
   * @param {NPCPositionInterpolator} interpolator - Position interpolator
   */
  _renderDebugInfo(ctx, monster, canvasPos, interpolator) {
    const tileSize = this.config.tileSize;
    const centerX = canvasPos.x + tileSize / 2;
    const centerY = canvasPos.y + tileSize / 2;

    // Draw velocity vector
    if (interpolator.isMoving()) {
      const velocity = interpolator.getVelocity();
      const scale = 20; // Visual scale for velocity vector

      ctx.strokeStyle = '#ff00ff';
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
    ctx.fillText(`ID: ${monster.id.slice(-6)}`, centerX, centerY - 20);
    ctx.fillText(`State: ${monster.aiState}`, centerX, centerY - 28);
    ctx.fillText(`HP: ${monster.health}/${monster.maxHealth}`, centerX, centerY - 36);
  }

  /**
   * Cleanup resources for removed monster
   * @param {string} monsterId - Monster ID
   */
  removeMonster(monsterId) {
    this.positionInterpolators.delete(monsterId);
  }

  /**
   * Clear all monster render data
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
      monsterCount: this.positionInterpolators.size,
      lastRenderTime: this.lastRenderTime.toFixed(2),
      renderCount: this.renderCount,
      debugMode: this.config.debugMode
    };
  }
}

export default MonsterRenderer;
