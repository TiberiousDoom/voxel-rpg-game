/**
 * NPCRenderer.js - Core NPC rendering system
 *
 * Manages rendering of all NPCs on the game canvas with:
 * - Smooth position interpolation
 * - Animation frame management
 * - Direction-based sprite flipping
 * - Health bars and status indicators
 * - Pathfinding visualization (debug mode)
 */

import {
  getSpriteForRole,
  getStatusColor,
  getHealthBarColor
} from '../assets/npc-sprites.js';

import {
  getMovementDirection,
  shouldFlipSprite,
  getDirectionBetweenPositions,
  AnimationFrameManager,
  getAnimationFrames,
  NPCPositionInterpolator,
  calculateAnimationSpeed
} from './NPCAnimations.js';

/**
 * NPC Renderer Class
 * Manages rendering state and logic for all NPCs
 */
export class NPCRenderer {
  /**
   * Initialize NPC Renderer
   * @param {Object} config - Renderer configuration
   */
  constructor(config = {}) {
    this.config = {
      tileSize: config.tileSize || 40,
      showHealthBars: config.showHealthBars !== false,
      showRoleBadges: config.showRoleBadges !== false,
      showStatusIndicators: config.showStatusIndicators !== false,
      enableAnimations: config.enableAnimations !== false,
      debugMode: config.debugMode || false,
      ...config
    };

    // Animation managers for each NPC (npcId -> AnimationFrameManager)
    this.animationManagers = new Map();

    // Position interpolators for each NPC (npcId -> NPCPositionInterpolator)
    this.positionInterpolators = new Map();

    // Last known positions for direction calculation
    this.lastPositions = new Map();

    // Performance tracking
    this.lastRenderTime = 0;
    this.renderCount = 0;
  }

  /**
   * Get or create animation manager for NPC
   * @private
   * @param {string} npcId - NPC ID
   * @returns {AnimationFrameManager} Animation manager
   */
  _getAnimationManager(npcId) {
    if (!this.animationManagers.has(npcId)) {
      this.animationManagers.set(npcId, new AnimationFrameManager());
    }
    return this.animationManagers.get(npcId);
  }

  /**
   * Get or create position interpolator for NPC
   * @private
   * @param {string} npcId - NPC ID
   * @param {Object} initialPosition - Initial position
   * @returns {NPCPositionInterpolator} Position interpolator
   */
  _getPositionInterpolator(npcId, initialPosition) {
    if (!this.positionInterpolators.has(npcId)) {
      this.positionInterpolators.set(npcId, new NPCPositionInterpolator(initialPosition));
    }
    return this.positionInterpolators.get(npcId);
  }

  /**
   * Update NPC positions for smooth interpolation
   * Call this frequently (e.g., in animation frame)
   * @param {Array<Object>} npcs - Array of NPC objects
   * @param {number} deltaTime - Time since last update (ms)
   */
  updatePositions(npcs, deltaTime = 16) {
    for (const npc of npcs) {
      if (!npc || !npc.id || !npc.position) continue;

      const interpolator = this._getPositionInterpolator(npc.id, npc.position);

      // Update target position if changed
      const currentTarget = interpolator.targetPosition;
      const newPosition = npc.position;

      if (
        currentTarget.x !== newPosition.x ||
        currentTarget.y !== newPosition.y ||
        currentTarget.z !== newPosition.z
      ) {
        interpolator.setTarget(newPosition);
      }

      // Update interpolation
      interpolator.update(deltaTime);

      // Update animation if enabled
      if (this.config.enableAnimations) {
        const animManager = this._getAnimationManager(npc.id);
        const sprite = getSpriteForRole(npc.role);
        const frameDuration = calculateAnimationSpeed(npc, sprite);
        animManager.setFrameDuration(frameDuration);

        const frames = getAnimationFrames(npc);
        animManager.update(deltaTime, frames);
      }
    }
  }

  /**
   * Render all NPCs on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<Object>} npcs - Array of NPC objects
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  renderNPCs(ctx, npcs, worldToCanvas) {
    if (!ctx || !npcs || !worldToCanvas) return;

    const startTime = performance.now();

    for (const npc of npcs) {
      if (!npc || !npc.id || !npc.position) continue;

      // Skip dead NPCs
      if (npc.alive === false) continue;

      // Get interpolated position
      const interpolator = this._getPositionInterpolator(npc.id, npc.position);
      const renderPosition = interpolator.currentPosition;

      // Convert to canvas coordinates
      const canvasPos = worldToCanvas(renderPosition.x, renderPosition.z);

      // Render NPC
      this._renderNPC(ctx, npc, canvasPos, interpolator);

      // Debug visualization if enabled
      if (this.config.debugMode) {
        this._renderDebugInfo(ctx, npc, canvasPos, interpolator);
      }
    }

    this.lastRenderTime = performance.now() - startTime;
    this.renderCount++;
  }

  /**
   * Render a single NPC
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} npc - NPC object
   * @param {Object} canvasPos - Canvas position {x, y}
   * @param {NPCPositionInterpolator} interpolator - Position interpolator
   */
  _renderNPC(ctx, npc, canvasPos, interpolator) {
    const sprite = getSpriteForRole(npc.role);
    const statusColor = getStatusColor(npc);
    const tileSize = this.config.tileSize;

    // Calculate center position
    const centerX = canvasPos.x + tileSize / 2;
    const centerY = canvasPos.y + tileSize / 2;

    // Get animation frame if enabled
    let frameOffset = { x: 0, y: 0 };
    let frameScale = 1.0;

    if (this.config.enableAnimations) {
      const animManager = this._getAnimationManager(npc.id);
      const frames = getAnimationFrames(npc);
      const currentFrame = animManager.getCurrentFrame(frames);
      frameOffset = currentFrame.offset;
      frameScale = currentFrame.scale;
    }

    // Calculate direction for sprite flipping
    const velocity = interpolator.getVelocity();
    const direction = getMovementDirection(velocity);
    const shouldFlip = shouldFlipSprite(direction);

    // Apply transformations
    ctx.save();
    ctx.translate(centerX + frameOffset.x, centerY + frameOffset.y);
    if (shouldFlip) {
      ctx.scale(-1, 1); // Flip horizontally
    }
    ctx.scale(frameScale, frameScale);

    // Draw NPC circle
    const radius = sprite.size;
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw circle outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw role indicator (letter)
    if (this.config.showRoleBadges) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Un-flip text if sprite is flipped
      if (shouldFlip) {
        ctx.scale(-1, 1);
      }
      ctx.fillText(sprite.letter, 0, 0);
    }

    ctx.restore();

    // Draw health bar if damaged
    if (this.config.showHealthBars) {
      this._renderHealthBar(ctx, npc, centerX, centerY);
    }

    // Draw status indicator if enabled
    if (this.config.showStatusIndicators) {
      this._renderStatusIndicator(ctx, npc, centerX, centerY);
    }
  }

  /**
   * Render health bar for NPC
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} npc - NPC object
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   */
  _renderHealthBar(ctx, npc, centerX, centerY) {
    const health = npc.health || 100;
    const maxHealth = npc.maxHealth || 100;
    const healthPercent = health / maxHealth;

    // Only show if damaged
    if (healthPercent >= 1.0) return;

    const barWidth = 16;
    const barHeight = 3;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 12;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health fill
    ctx.fillStyle = getHealthBarColor(healthPercent);
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }

  /**
   * Render status indicator icon
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} npc - NPC object
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   */
  _renderStatusIndicator(ctx, npc, centerX, centerY) {
    let statusIcon = null;

    // Determine status icon to show
    if (npc.hungry) {
      statusIcon = '🍖'; // Hungry
    } else if (npc.fatigued || npc.isResting) {
      statusIcon = '😴'; // Tired/Resting
    } else if (npc.isWorking || npc.status === 'WORKING') {
      statusIcon = '⚙️'; // Working
    }

    if (!statusIcon) return;

    // Draw status icon above NPC
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(statusIcon, centerX, centerY - 12);
  }

  /**
   * Render debug information
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} npc - NPC object
   * @param {Object} canvasPos - Canvas position {x, y}
   * @param {NPCPositionInterpolator} interpolator - Position interpolator
   */
  _renderDebugInfo(ctx, npc, canvasPos, interpolator) {
    const tileSize = this.config.tileSize;
    const centerX = canvasPos.x + tileSize / 2;
    const centerY = canvasPos.y + tileSize / 2;

    // Draw velocity vector
    if (interpolator.isMoving()) {
      const velocity = interpolator.getVelocity();
      const scale = 20; // Visual scale for velocity vector

      ctx.strokeStyle = '#FF00FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + velocity.x * scale,
        centerY + velocity.z * scale
      );
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(velocity.z, velocity.x);
      const headLength = 5;
      ctx.beginPath();
      ctx.moveTo(
        centerX + velocity.x * scale,
        centerY + velocity.z * scale
      );
      ctx.lineTo(
        centerX + velocity.x * scale - headLength * Math.cos(angle - Math.PI / 6),
        centerY + velocity.z * scale - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        centerX + velocity.x * scale - headLength * Math.cos(angle + Math.PI / 6),
        centerY + velocity.z * scale - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.lineTo(
        centerX + velocity.x * scale,
        centerY + velocity.z * scale
      );
      ctx.fillStyle = '#FF00FF';
      ctx.fill();
    }

    // Draw NPC ID
    ctx.fillStyle = '#000000';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ID: ${npc.id}`, centerX, centerY - 18);
  }

  /**
   * Render pathfinding visualization
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} npc - NPC object with currentPath property
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  renderPathfindingVisualization(ctx, npc, worldToCanvas) {
    if (!this.config.debugMode || !npc.currentPath || npc.currentPath.length === 0) {
      return;
    }

    const tileSize = this.config.tileSize;
    const path = npc.currentPath;

    // Draw path line
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    for (let i = 0; i < path.length; i++) {
      const waypoint = path[i];
      const canvasPos = worldToCanvas(waypoint.x, waypoint.z);
      const centerX = canvasPos.x + tileSize / 2;
      const centerY = canvasPos.y + tileSize / 2;

      if (i === 0) {
        ctx.moveTo(centerX, centerY);
      } else {
        ctx.lineTo(centerX, centerY);
      }
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw waypoint markers
    for (let i = 0; i < path.length; i++) {
      const waypoint = path[i];
      const canvasPos = worldToCanvas(waypoint.x, waypoint.z);
      const centerX = canvasPos.x + tileSize / 2;
      const centerY = canvasPos.y + tileSize / 2;

      // Waypoint circle
      ctx.fillStyle = i === npc.pathIndex ? 'rgba(255, 0, 255, 0.8)' : 'rgba(0, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Waypoint number
      ctx.fillStyle = '#000000';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(i.toString(), centerX, centerY - 6);
    }
  }

  /**
   * Render all pathfinding paths
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<Object>} npcs - Array of NPC objects
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  renderAllPaths(ctx, npcs, worldToCanvas) {
    if (!this.config.debugMode) return;

    for (const npc of npcs) {
      if (npc && npc.alive !== false) {
        this.renderPathfindingVisualization(ctx, npc, worldToCanvas);
      }
    }
  }

  /**
   * Cleanup resources for removed NPC
   * @param {string} npcId - NPC ID
   */
  removeNPC(npcId) {
    this.animationManagers.delete(npcId);
    this.positionInterpolators.delete(npcId);
    this.lastPositions.delete(npcId);
  }

  /**
   * Clear all NPC render data
   */
  clear() {
    this.animationManagers.clear();
    this.positionInterpolators.clear();
    this.lastPositions.clear();
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
      npcCount: this.positionInterpolators.size,
      lastRenderTime: this.lastRenderTime.toFixed(2),
      renderCount: this.renderCount,
      debugMode: this.config.debugMode
    };
  }
}

export default NPCRenderer;
