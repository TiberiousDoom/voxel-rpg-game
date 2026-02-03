/**
 * PlayerEntity.js
 * Core player entity for 2D RPG mode
 *
 * Manages player state, position, movement, and stats
 */

// eslint-disable-next-line no-unused-vars
import { GRID } from '../../shared/config.js';

/**
 * Player entity class
 */
export class PlayerEntity {
  constructor(initialPosition = { x: 25, z: 25 }) {
    // Position and movement
    this.position = { ...initialPosition };
    this.velocity = { x: 0, z: 0 };
    this.facing = 'down'; // Direction: 'up', 'down', 'left', 'right'

    // Tap-to-move
    this.targetPosition = null; // Target position for tap-to-move
    this.moveThreshold = 0.2; // How close to target before stopping

    // Movement stats
    this.baseSpeed = 3; // Grid cells per second (matches NPC speed)
    this.sprintMultiplier = 2;
    this.isSprinting = false;

    // Player stats (synced with game store)
    this.health = 100;
    this.maxHealth = 100;
    this.stamina = 100;
    this.maxStamina = 100;

    // Interaction
    this.interactionRadius = 1.5; // Grid cells

    // Collision
    this.collisionRadius = 0.4; // Grid cells

    // Animation
    this.animationFrame = 0;
    this.animationTime = 0;
  }

  /**
   * Get current speed based on sprint state
   */
  getCurrentSpeed() {
    return this.baseSpeed * (this.isSprinting ? this.sprintMultiplier : 1);
  }

  /**
   * Update player position based on velocity
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (deltaTime <= 0) return;

    // Handle tap-to-move if target is set
    if (this.targetPosition) {
      this.updateTapToMove(deltaTime);
    }

    const speed = this.getCurrentSpeed();

    // Apply velocity (no bounds checking for infinite world)
    this.position.x += this.velocity.x * speed * deltaTime;
    this.position.z += this.velocity.z * speed * deltaTime;

    // Update facing direction based on velocity
    if (this.velocity.x !== 0 || this.velocity.z !== 0) {
      if (Math.abs(this.velocity.x) > Math.abs(this.velocity.z)) {
        this.facing = this.velocity.x > 0 ? 'right' : 'left';
      } else {
        this.facing = this.velocity.z > 0 ? 'down' : 'up';
      }

      // Update animation
      this.animationTime += deltaTime;
      if (this.animationTime >= 0.15) { // 150ms per frame
        this.animationFrame = (this.animationFrame + 1) % 4;
        this.animationTime = 0;
      }
    } else {
      this.animationFrame = 0;
      this.animationTime = 0;
    }

    // Drain stamina when sprinting
    if (this.isSprinting && (this.velocity.x !== 0 || this.velocity.z !== 0)) {
      this.stamina = Math.max(0, this.stamina - 20 * deltaTime);
      if (this.stamina === 0) {
        this.isSprinting = false; // Stop sprinting when out of stamina
      }
    } else {
      // Regenerate stamina when not sprinting
      this.stamina = Math.min(this.maxStamina, this.stamina + 10 * deltaTime);
    }
  }

  /**
   * Set player velocity based on input
   * @param {number} x - X velocity (-1 to 1)
   * @param {number} z - Z velocity (-1 to 1)
   */
  setVelocity(x, z) {
    // Normalize diagonal movement (prevent faster movement)
    const magnitude = Math.sqrt(x * x + z * z);
    if (magnitude > 0) {
      this.velocity.x = x / magnitude;
      this.velocity.z = z / magnitude;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }
  }

  /**
   * Toggle sprint state
   * @param {boolean} sprinting - Whether to sprint
   */
  setSprinting(sprinting) {
    if (sprinting && this.stamina > 0) {
      this.isSprinting = true;
    } else {
      this.isSprinting = false;
    }
  }

  /**
   * Check if an object is within interaction range
   * @param {object} targetPosition - Position with {x, z}
   * @returns {boolean}
   */
  isInInteractionRange(targetPosition) {
    const dx = this.position.x - targetPosition.x;
    const dz = this.position.z - targetPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance <= this.interactionRadius;
  }

  /**
   * Check collision with a building
   * @param {object} building - Building with position and dimensions
   * @returns {boolean}
   */
  checkBuildingCollision(building) {
    if (!building || !building.position) return false;

    const bx = building.position.x;
    const bz = building.position.z;

    // Simple circle-square collision
    const dx = this.position.x - bx;
    const dz = this.position.z - bz;
    const distance = Math.sqrt(dx * dx + dz * dz);

    return distance < (this.collisionRadius + 0.5); // 0.5 = half building size
  }

  /**
   * Set target position for tap-to-move
   * @param {object} target - Target position {x, z}
   */
  setTargetPosition(target) {
    if (!target) {
      this.targetPosition = null;
      return;
    }

    // No bounds checking for infinite world
    this.targetPosition = { x: target.x, z: target.z };
  }

  /**
   * Update movement toward target position
   * @param {number} deltaTime - Time since last update
   */
  updateTapToMove(deltaTime) {
    if (!this.targetPosition) return;

    const dx = this.targetPosition.x - this.position.x;
    const dz = this.targetPosition.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // If close enough to target, stop
    if (distance < this.moveThreshold) {
      this.targetPosition = null;
      this.setVelocity(0, 0);
      return;
    }

    // Set velocity toward target
    this.setVelocity(dx / distance, dz / distance);
  }

  /**
   * Clear target position (called when using keyboard controls)
   */
  clearTarget() {
    this.targetPosition = null;
  }

  /**
   * Serialize player state for saving
   */
  serialize() {
    return {
      position: { ...this.position },
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      facing: this.facing
    };
  }

  /**
   * Restore player state from save
   */
  deserialize(data) {
    if (data.position) this.position = { ...data.position };
    if (data.health !== undefined) this.health = data.health;
    if (data.maxHealth !== undefined) this.maxHealth = data.maxHealth;
    if (data.stamina !== undefined) this.stamina = data.stamina;
    if (data.maxStamina !== undefined) this.maxStamina = data.maxStamina;
    if (data.facing) this.facing = data.facing;
  }
}

/**
 * Create a new player entity
 * @param {object} initialPosition - Starting position {x, z}
 * @returns {PlayerEntity}
 */
export function createPlayer(initialPosition) {
  return new PlayerEntity(initialPosition);
}
