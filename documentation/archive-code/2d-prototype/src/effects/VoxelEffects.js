/**
 * VoxelEffects.js - Visual effects for voxel building system
 *
 * Provides particle effects and animations for:
 * - Mining debris
 * - Block placement
 * - Construction progress
 *
 * Part of Phase 24: Visual Polish & Effects
 */

/**
 * Particle types
 */
export const ParticleType = {
  DEBRIS: 'debris',
  DUST: 'dust',
  SPARKLE: 'sparkle',
  SMOKE: 'smoke'
};

/**
 * VoxelEffects - Manages visual effects for voxel operations
 */
export class VoxelEffects {
  /**
   * Create effects manager
   * @param {object} config - Configuration
   */
  constructor(config = {}) {
    this.particles = [];
    this.maxParticles = config.maxParticles || 500;
    this.enabled = config.enabled !== false;

    // Effect settings
    this.debrisCount = config.debrisCount || 6;
    this.dustCount = config.dustCount || 8;
    this.particleLife = config.particleLife || 60; // frames
  }

  /**
   * Spawn mining debris effect
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z (for color)
   * @param {string} color - Block color
   */
  spawnMiningDebris(x, y, z, color = 'rgb(128, 128, 128)') {
    if (!this.enabled) return;

    for (let i = 0; i < this.debrisCount; i++) {
      this._addParticle({
        type: ParticleType.DEBRIS,
        x: x + 0.5,
        y: y + 0.5,
        z,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        vz: Math.random() * 2,
        size: 3 + Math.random() * 4,
        color,
        life: this.particleLife,
        gravity: 0.15,
        friction: 0.98
      });
    }

    // Add dust cloud
    for (let i = 0; i < this.dustCount; i++) {
      this._addParticle({
        type: ParticleType.DUST,
        x: x + 0.5 + (Math.random() - 0.5) * 0.5,
        y: y + 0.5 + (Math.random() - 0.5) * 0.5,
        z,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        vz: Math.random() * 0.5,
        size: 8 + Math.random() * 12,
        color: 'rgba(180, 160, 140, 0.6)',
        life: this.particleLife * 1.5,
        gravity: -0.02, // Floats up
        friction: 0.95,
        fadeOut: true
      });
    }
  }

  /**
   * Spawn block placement effect
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z
   * @param {string} color - Block color
   */
  spawnPlacementEffect(x, y, z, color = 'rgb(100, 200, 255)') {
    if (!this.enabled) return;

    // Sparkle effect
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      this._addParticle({
        type: ParticleType.SPARKLE,
        x: x + 0.5,
        y: y + 0.5,
        z,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        vz: 0.5,
        size: 4 + Math.random() * 3,
        color,
        life: 30,
        gravity: 0,
        friction: 0.92,
        fadeOut: true
      });
    }

    // Center pop
    this._addParticle({
      type: ParticleType.SPARKLE,
      x: x + 0.5,
      y: y + 0.5,
      z,
      vx: 0,
      vy: 0,
      vz: 1,
      size: 20,
      color: 'rgba(255, 255, 255, 0.8)',
      life: 15,
      gravity: 0,
      friction: 1,
      fadeOut: true,
      shrink: true
    });
  }

  /**
   * Spawn construction progress effect
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} z - World Z
   */
  spawnConstructionEffect(x, y, z) {
    if (!this.enabled) return;

    // Smoke/steam effect
    this._addParticle({
      type: ParticleType.SMOKE,
      x: x + 0.5 + (Math.random() - 0.5) * 0.3,
      y: y + 0.5 + (Math.random() - 0.5) * 0.3,
      z,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      vz: 0.3 + Math.random() * 0.3,
      size: 6 + Math.random() * 6,
      color: 'rgba(200, 200, 200, 0.4)',
      life: 45,
      gravity: -0.03,
      friction: 0.97,
      fadeOut: true,
      grow: true
    });
  }

  /**
   * Add particle to system
   * @private
   */
  _addParticle(particle) {
    if (this.particles.length >= this.maxParticles) {
      // Remove oldest particle
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  /**
   * Update all particles
   * @param {number} deltaTime - Frame delta
   */
  update(deltaTime = 1) {
    if (!this.enabled) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Apply physics
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vz -= p.gravity * deltaTime;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vz *= p.friction;

      // Age particle
      p.life -= deltaTime;

      // Handle special effects
      if (p.fadeOut) {
        p.alpha = Math.max(0, p.life / this.particleLife);
      }
      if (p.shrink) {
        p.currentSize = p.size * (p.life / this.particleLife);
      }
      if (p.grow) {
        p.currentSize = p.size * (1 + (1 - p.life / this.particleLife) * 0.5);
      }

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render particles
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {function} worldToCanvas - Coordinate converter
   * @param {number} currentZ - Current Z-level
   * @param {number} tileSize - Tile size in pixels
   */
  render(ctx, worldToCanvas, currentZ, tileSize = 40) {
    if (!this.enabled || !ctx) return;

    ctx.save();

    for (const p of this.particles) {
      // Only render particles near current Z-level
      if (Math.abs(p.z - currentZ) > 2) continue;

      const canvasPos = worldToCanvas(p.x, p.y);
      const zOffset = (p.vz || 0) * 10; // Visual height offset

      const size = p.currentSize || p.size;
      const alpha = p.alpha !== undefined ? p.alpha : 1;

      ctx.globalAlpha = alpha * (1 - Math.abs(p.z - currentZ) * 0.3);

      switch (p.type) {
        case ParticleType.DEBRIS:
          ctx.fillStyle = p.color;
          ctx.fillRect(
            canvasPos.x - size / 2,
            canvasPos.y - size / 2 - zOffset,
            size,
            size
          );
          break;

        case ParticleType.DUST:
        case ParticleType.SMOKE:
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(
            canvasPos.x,
            canvasPos.y - zOffset,
            size,
            0,
            Math.PI * 2
          );
          ctx.fill();
          break;

        case ParticleType.SPARKLE:
          ctx.fillStyle = p.color;
          // Star shape
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const x = canvasPos.x + Math.cos(angle) * size;
            const y = canvasPos.y - zOffset + Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          break;
      }
    }

    ctx.restore();
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = [];
  }

  /**
   * Enable/disable effects
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Get particle count
   * @returns {number}
   */
  getParticleCount() {
    return this.particles.length;
  }
}

export default VoxelEffects;
