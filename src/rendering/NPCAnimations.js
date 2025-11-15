/**
 * NPCAnimations.js - Animation and interpolation utilities for NPCs
 *
 * Provides:
 * - Smooth position interpolation (lerp) for movement
 * - Animation frame management
 * - Direction calculation for sprite flipping
 * - Animation state transitions
 */

import {
  ANIMATION_STATES,
  WALKING_ANIMATION_FRAMES,
  WORKING_ANIMATION_FRAMES,
  getAnimationState
} from '../assets/npc-sprites.js';

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Linear interpolation between two positions
 * @param {Object} start - Start position {x, y, z}
 * @param {Object} end - End position {x, y, z}
 * @param {number} t - Interpolation factor (0-1)
 * @returns {Object} Interpolated position {x, y, z}
 */
export function lerpPosition(start, end, t) {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    z: lerp(start.z, end.z, t)
  };
}

/**
 * Smooth interpolation with easing
 * Uses smoothstep function for more natural movement
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function smoothLerp(start, end, t) {
  // Smoothstep: 3t² - 2t³
  const smoothT = t * t * (3 - 2 * t);
  return lerp(start, end, smoothT);
}

/**
 * Calculate movement direction from velocity
 * Used for sprite flipping
 * @param {Object} velocity - Velocity vector {x, z}
 * @returns {string} Direction ('left', 'right', 'up', 'down', 'none')
 */
export function getMovementDirection(velocity) {
  if (!velocity || (velocity.x === 0 && velocity.z === 0)) {
    return 'none';
  }

  const absX = Math.abs(velocity.x);
  const absZ = Math.abs(velocity.z);

  // Primary horizontal movement
  if (absX > absZ) {
    return velocity.x > 0 ? 'right' : 'left';
  }

  // Primary vertical movement
  return velocity.z > 0 ? 'down' : 'up';
}

/**
 * Calculate direction between two positions
 * @param {Object} from - Starting position {x, z}
 * @param {Object} to - Target position {x, z}
 * @returns {string} Direction ('left', 'right', 'up', 'down', 'none')
 */
export function getDirectionBetweenPositions(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;

  return getMovementDirection({ x: dx, z: dz });
}

/**
 * Check if sprite should be flipped based on direction
 * @param {string} direction - Movement direction
 * @returns {boolean} True if should flip horizontally
 */
export function shouldFlipSprite(direction) {
  return direction === 'left';
}

/**
 * Animation Frame Manager
 * Manages animation frame cycling and timing
 */
export class AnimationFrameManager {
  constructor() {
    this.currentFrame = 0;
    this.frameTime = 0;
    this.frameDuration = 200; // milliseconds per frame
    this.lastUpdateTime = Date.now();
  }

  /**
   * Update animation frame
   * @param {number} deltaTime - Time since last update (ms)
   * @param {Array} frames - Array of animation frames
   * @returns {number} Current frame index
   */
  update(deltaTime, frames) {
    this.frameTime += deltaTime;

    if (this.frameTime >= this.frameDuration) {
      this.currentFrame = (this.currentFrame + 1) % frames.length;
      this.frameTime = 0;
    }

    return this.currentFrame;
  }

  /**
   * Get current animation frame
   * @param {Array} frames - Array of animation frames
   * @returns {Object} Current frame data
   */
  getCurrentFrame(frames) {
    if (!frames || frames.length === 0) {
      return { offset: { x: 0, y: 0 }, scale: 1.0 };
    }
    return frames[this.currentFrame] || frames[0];
  }

  /**
   * Reset animation to first frame
   */
  reset() {
    this.currentFrame = 0;
    this.frameTime = 0;
  }

  /**
   * Set frame duration (speed)
   * @param {number} duration - Frame duration in milliseconds
   */
  setFrameDuration(duration) {
    this.frameDuration = Math.max(50, duration); // Min 50ms (20fps max)
  }
}

/**
 * Get animation frames for current NPC state
 * @param {Object} npc - NPC object
 * @returns {Array} Animation frames
 */
export function getAnimationFrames(npc) {
  const state = getAnimationState(npc);

  switch (state) {
    case ANIMATION_STATES.WALKING:
      return WALKING_ANIMATION_FRAMES;
    case ANIMATION_STATES.WORKING:
      return WORKING_ANIMATION_FRAMES;
    case ANIMATION_STATES.IDLE:
    case ANIMATION_STATES.RESTING:
    default:
      // No animation for idle/resting
      return [{ offset: { x: 0, y: 0 }, scale: 1.0 }];
  }
}

/**
 * NPC Position Interpolator
 * Manages smooth position transitions for an NPC
 */
export class NPCPositionInterpolator {
  constructor(initialPosition) {
    this.currentPosition = { ...initialPosition };
    this.targetPosition = { ...initialPosition };
    this.interpolationSpeed = 0.15; // 0.1 = slow, 0.3 = fast
    this.isInterpolating = false;
    this.previousPosition = { ...initialPosition };
  }

  /**
   * Set new target position
   * @param {Object} position - Target position {x, y, z}
   */
  setTarget(position) {
    this.previousPosition = { ...this.currentPosition };
    this.targetPosition = { ...position };
    this.isInterpolating = true;
  }

  /**
   * Update interpolation
   * @param {number} deltaTime - Time delta (not used in basic lerp, but available)
   * @returns {Object} Current interpolated position
   */
  update(deltaTime = 1.0) {
    if (!this.isInterpolating) {
      return this.currentPosition;
    }

    // Calculate distance to target
    const dx = this.targetPosition.x - this.currentPosition.x;
    const dy = this.targetPosition.y - this.currentPosition.y;
    const dz = this.targetPosition.z - this.currentPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Stop interpolating if very close
    if (distance < 0.01) {
      this.currentPosition = { ...this.targetPosition };
      this.isInterpolating = false;
      return this.currentPosition;
    }

    // Smooth interpolation
    this.currentPosition.x = lerp(this.currentPosition.x, this.targetPosition.x, this.interpolationSpeed);
    this.currentPosition.y = lerp(this.currentPosition.y, this.targetPosition.y, this.interpolationSpeed);
    this.currentPosition.z = lerp(this.currentPosition.z, this.targetPosition.z, this.interpolationSpeed);

    return this.currentPosition;
  }

  /**
   * Get current velocity (for direction calculation)
   * @returns {Object} Velocity vector {x, y, z}
   */
  getVelocity() {
    return {
      x: this.targetPosition.x - this.currentPosition.x,
      y: this.targetPosition.y - this.currentPosition.y,
      z: this.targetPosition.z - this.currentPosition.z
    };
  }

  /**
   * Check if currently moving
   * @returns {boolean} True if interpolating
   */
  isMoving() {
    return this.isInterpolating;
  }

  /**
   * Teleport to position immediately
   * @param {Object} position - New position {x, y, z}
   */
  teleport(position) {
    this.currentPosition = { ...position };
    this.targetPosition = { ...position };
    this.previousPosition = { ...position };
    this.isInterpolating = false;
  }
}

/**
 * Calculate animation speed based on NPC properties
 * @param {Object} npc - NPC object
 * @param {Object} spriteDefinition - Sprite definition with base animationSpeed
 * @returns {number} Frame duration in milliseconds
 */
export function calculateAnimationSpeed(npc, spriteDefinition) {
  const baseSpeed = spriteDefinition.animationSpeed || 1.0;
  const baseDuration = 200; // Base frame duration in ms

  // Factors that affect animation speed
  let speedMultiplier = baseSpeed;

  // Faster when moving
  if (npc.isMoving) {
    speedMultiplier *= 1.2;
  }

  // Slower when tired/low health
  const health = npc.health || 100;
  const maxHealth = npc.maxHealth || 100;
  const healthPercent = health / maxHealth;

  if (healthPercent < 0.5) {
    speedMultiplier *= 0.7;
  }

  // Calculate final duration (lower = faster)
  return baseDuration / speedMultiplier;
}

export default {
  lerp,
  lerpPosition,
  smoothLerp,
  getMovementDirection,
  getDirectionBetweenPositions,
  shouldFlipSprite,
  AnimationFrameManager,
  getAnimationFrames,
  NPCPositionInterpolator,
  calculateAnimationSpeed,
};
