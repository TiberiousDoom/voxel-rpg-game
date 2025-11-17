/**
 * BuildingRenderer.js - Building rendering system
 *
 * Handles state-based rendering of buildings including:
 * - Different visual states (BLUEPRINT, UNDER_CONSTRUCTION, COMPLETE, DAMAGED, DESTROYED)
 * - Texture overlays and effects
 * - Shadow and depth rendering
 * - Progress indicators
 * - Health bars
 *
 * Part of WF3: Building Rendering & Visual Effects
 */

import {
  getBuildingIcon,
  getBuildingColor,
  getTextureOverlay,
  getShadowEffect,
  // eslint-disable-next-line no-unused-vars -- Reserved for WF3: CSS-based shadow rendering
  generateShadowCSS
} from '../assets/building-icons.js';

/**
 * Building render states
 */
export const RENDER_STATES = {
  BLUEPRINT: 'BLUEPRINT',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION',
  BUILDING: 'BUILDING', // Alias for UNDER_CONSTRUCTION
  COMPLETE: 'COMPLETE',
  COMPLETED: 'COMPLETED', // Alias for COMPLETE
  DAMAGED: 'DAMAGED',
  DESTROYED: 'DESTROYED'
};

/**
 * BuildingRenderer class
 * Provides rendering utilities for buildings in different states
 */
export class BuildingRenderer {
  constructor(options = {}) {
    this.tileSize = options.tileSize || 40;
    this.showHealthBars = options.showHealthBars !== false;
    this.showProgressBars = options.showProgressBars !== false;
    this.showShadows = options.showShadows !== false;
    this.showOverlays = options.showOverlays !== false;

    // Cache for crack patterns to avoid regenerating with random() every frame
    this.crackCache = new Map();
  }

  /**
   * Render a building on a canvas context
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} building - Building object
   * @param {object} canvasPos - Canvas position {x, y}
   * @param {object} options - Rendering options
   */
  renderBuilding(ctx, building, canvasPos, options = {}) {
    if (!building || !building.position) return;

    const state = this.normalizeState(building.state || 'COMPLETE');
    const icon = getBuildingIcon(building.type);
    const color = getBuildingColor(building.type, state);
    const shadow = getShadowEffect(building.type);

    const x = canvasPos.x + 2;
    const y = canvasPos.y + 2;
    const width = this.tileSize - 4;
    const height = this.tileSize - 4;

    // Draw shadow if enabled
    if (this.showShadows && state !== 'BLUEPRINT') {
      this.drawShadow(ctx, x, y, width, height, shadow);
    }

    // Draw building base
    this.drawBuildingBase(ctx, x, y, width, height, color, state);

    // Draw texture overlay if enabled
    if (this.showOverlays) {
      this.drawTextureOverlay(ctx, x, y, width, height, building, state);
    }

    // Draw border
    this.drawBorder(ctx, x, y, width, height, state);

    // Draw health bar if damaged
    if (this.showHealthBars && building.health !== undefined) {
      this.drawHealthBar(ctx, x, y, width, height, building);
    }

    // Draw construction progress bar
    if (this.showProgressBars && (state === 'UNDER_CONSTRUCTION' || state === 'BUILDING')) {
      this.drawProgressBar(ctx, x, y, width, height, building);
    }

    // Draw worker count indicator
    if (building.workerCount && building.workerCount > 0 && state === 'COMPLETE') {
      this.drawWorkerIndicator(ctx, x, y, width, height, building.workerCount);
    }

    // Draw building icon/label
    this.drawBuildingLabel(ctx, x, y, width, height, icon, state);
  }

  /**
   * Normalize building state to standard format
   * @param {string} state - Raw state string
   * @returns {string} Normalized state
   */
  normalizeState(state) {
    const normalized = state.toUpperCase().replace(/\s+/g, '_');
    if (normalized === 'BUILDING') return 'UNDER_CONSTRUCTION';
    if (normalized === 'COMPLETED') return 'COMPLETE';
    return normalized;
  }

  /**
   * Draw building shadow
   */
  drawShadow(ctx, x, y, width, height, shadow) {
    ctx.fillStyle = shadow.color;
    ctx.fillRect(
      x + shadow.offsetX,
      y + shadow.offsetY,
      width,
      height
    );
  }

  /**
   * Draw building base rectangle
   */
  drawBuildingBase(ctx, x, y, width, height, color, state) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
  }

  /**
   * Draw texture overlay for visual effects
   */
  drawTextureOverlay(ctx, x, y, width, height, building, state) {
    const health = building.health || 100;
    const maxHealth = building.maxHealth || 100;
    const healthPercent = health / maxHealth;

    const overlay = getTextureOverlay(state, healthPercent);
    if (!overlay) return;

    // Create pattern overlay using image data manipulation
    // For damaged buildings, draw crack patterns
    if (state === 'DAMAGED' || healthPercent < 1) {
      this.drawCracks(ctx, x, y, width, height, healthPercent, building.id);
    }

    // For blueprint, draw grid pattern
    if (state === 'BLUEPRINT') {
      this.drawBlueprintGrid(ctx, x, y, width, height);
    }

    // For under construction, draw construction pattern
    if (state === 'UNDER_CONSTRUCTION' || state === 'BUILDING') {
      this.drawConstructionPattern(ctx, x, y, width, height);
    }
  }

  /**
   * Draw crack patterns for damaged buildings (with caching)
   */
  drawCracks(ctx, x, y, width, height, healthPercent, buildingId) {
    // Round health percent to nearest 10% to limit cache entries
    const healthBucket = Math.floor(healthPercent * 10) / 10;
    const cacheKey = `${buildingId}_${healthBucket}`;

    // Check cache first
    if (!this.crackCache.has(cacheKey)) {
      // Generate crack pattern once and cache it
      const crackCount = Math.floor((1 - healthPercent) * 5);
      const cracks = [];

      for (let i = 0; i < crackCount; i++) {
        cracks.push({
          startX: Math.random(),
          startY: Math.random(),
          endX: Math.random() - 0.5,
          endY: Math.random() - 0.5
        });
      }

      this.crackCache.set(cacheKey, cracks);

      // Limit cache size to prevent memory leaks
      if (this.crackCache.size > 100) {
        const firstKey = this.crackCache.keys().next().value;
        this.crackCache.delete(firstKey);
      }
    }

    // Draw cached crack pattern
    const cracks = this.crackCache.get(cacheKey);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;

    for (const crack of cracks) {
      const startX = x + crack.startX * width;
      const startY = y + crack.startY * height;
      const endX = startX + crack.endX * width * 0.5;
      const endY = startY + crack.endY * height * 0.5;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  /**
   * Draw blueprint grid pattern
   */
  drawBlueprintGrid(ctx, x, y, width, height) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let i = 0; i <= width; i += 5) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i, y + height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= height; i += 5) {
      ctx.beginPath();
      ctx.moveTo(x, y + i);
      ctx.lineTo(x + width, y + i);
      ctx.stroke();
    }
  }

  /**
   * Draw construction diagonal pattern
   */
  drawConstructionPattern(ctx, x, y, width, height) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    for (let i = -height; i < width; i += 10) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + height, y + height);
      ctx.stroke();
    }
  }

  /**
   * Draw building border
   */
  drawBorder(ctx, x, y, width, height, state) {
    ctx.strokeStyle = state === 'BLUEPRINT' ? '#666666' : '#000000';
    ctx.lineWidth = state === 'BLUEPRINT' ? 1 : 2;

    if (state === 'BLUEPRINT') {
      ctx.setLineDash([5, 3]);
    }

    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]); // Reset dash
  }

  /**
   * Draw health bar for damaged buildings
   */
  drawHealthBar(ctx, x, y, width, height, building) {
    const health = building.health || 100;
    const maxHealth = building.maxHealth || 100;

    if (health >= maxHealth) return;

    const healthPercent = health / maxHealth;
    const barWidth = width - 4;
    const barHeight = 4;
    const barX = x + 2;
    const barY = y + height - 6;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health fill
    const healthColor = healthPercent > 0.5
      ? '#4CAF50'
      : healthPercent > 0.25
        ? '#FF9800'
        : '#F44336';

    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }

  /**
   * Draw construction progress bar
   */
  drawProgressBar(ctx, x, y, width, height, building) {
    const progress = building.constructionProgress || 0;
    const constructionTime = building.constructionTime || 100;
    const progressPercent = Math.min(progress / constructionTime, 1);

    const barWidth = width - 4;
    const barHeight = 4;
    const barX = x + 2;
    const barY = y + 2;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress fill
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(barX, barY, barWidth * progressPercent, barHeight);
  }

  /**
   * Draw worker count indicator
   */
  drawWorkerIndicator(ctx, x, y, width, height, workerCount) {
    const indicatorX = x + width - 6;
    const indicatorY = y + 6;
    const radius = 6;

    // Circle background
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Worker count text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(workerCount, indicatorX, indicatorY);
  }

  /**
   * Draw building label (icon or text)
   */
  drawBuildingLabel(ctx, x, y, width, height, icon, state) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Use emoji icon for better visuals
    ctx.fillStyle = state === 'DESTROYED' ? '#FFFFFF' : '#000000';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon.emoji, centerX, centerY);
  }

  /**
   * Render hover effect
   */
  renderHoverEffect(ctx, canvasPos, buildingType) {
    const x = canvasPos.x + 2;
    const y = canvasPos.y + 2;
    const width = this.tileSize - 4;
    const height = this.tileSize - 4;

    // Glow effect
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFD700';
    ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  /**
   * Render selection effect
   */
  renderSelectionEffect(ctx, canvasPos) {
    const x = canvasPos.x + 2;
    const y = canvasPos.y + 2;
    const width = this.tileSize - 4;
    const height = this.tileSize - 4;

    // Selection ring
    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    ctx.setLineDash([]);
  }

  /**
   * Render placement preview
   */
  renderPlacementPreview(ctx, canvasPos, buildingType, isValid = true) {
    const icon = getBuildingIcon(buildingType);
    const color = icon.colors.preview;

    const x = canvasPos.x + 2;
    const y = canvasPos.y + 2;
    const width = this.tileSize - 4;
    const height = this.tileSize - 4;

    // Preview rectangle with transparency
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, y, width, height);
    ctx.globalAlpha = 1.0;

    // Border indicating validity
    ctx.strokeStyle = isValid ? '#00FF00' : '#FF0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Icon
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon.emoji, x + width / 2, y + height / 2);
  }
}

/**
 * Create a building renderer instance
 * @param {object} options - Renderer options
 * @returns {BuildingRenderer} Renderer instance
 */
export function createBuildingRenderer(options = {}) {
  return new BuildingRenderer(options);
}

/**
 * Default export
 */
export default BuildingRenderer;
