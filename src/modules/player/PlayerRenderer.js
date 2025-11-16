/**
 * PlayerRenderer.js
 * Renders the player character on 2D canvas
 */

import { useRef } from 'react';

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
   * Render player body (circle with outline)
   */
  renderBody(ctx, x, y, player) {
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
}

/**
 * Create a player renderer hook (React-style)
 */
export function usePlayerRenderer(options = {}) {
  const rendererRef = React.useRef(null);

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
