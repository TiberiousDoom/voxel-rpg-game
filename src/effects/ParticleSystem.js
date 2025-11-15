/**
 * ParticleSystem.js - Particle effect system for visual effects
 *
 * Handles creation, updating, and rendering of particle effects for:
 * - Construction dust/sparks
 * - Resource collection particles
 * - Achievement unlock effects
 * - Other visual effects
 *
 * Part of WF3: Building Rendering & Visual Effects
 */

/**
 * Particle class representing a single particle
 */
class Particle {
  constructor(config) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.vx = config.vx || 0;
    this.vy = config.vy || 0;
    this.life = config.life || 1.0;
    this.maxLife = config.maxLife || 1.0;
    this.size = config.size || 2;
    this.color = config.color || '#FFFFFF';
    this.alpha = config.alpha || 1.0;
    this.gravity = config.gravity || 0;
    this.drag = config.drag || 0.98;
    this.shrink = config.shrink !== undefined ? config.shrink : true;
    this.fade = config.fade !== undefined ? config.fade : true;
  }

  /**
   * Update particle state
   * @param {number} deltaTime - Time since last update (ms)
   * @returns {boolean} True if particle is still alive
   */
  update(deltaTime) {
    // Apply velocity
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    // Apply gravity
    this.vy += this.gravity * deltaTime;

    // Apply drag
    this.vx *= this.drag;
    this.vy *= this.drag;

    // Update life
    this.life -= deltaTime;

    // Update visual properties based on life
    if (this.fade) {
      this.alpha = this.life / this.maxLife;
    }

    if (this.shrink) {
      this.size = (this.life / this.maxLife) * this.size;
    }

    return this.life > 0;
  }

  /**
   * Render particle on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * ParticleSystem class managing multiple particles
 */
export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 1000;
    this.lastUpdate = Date.now();
  }

  /**
   * Add a particle to the system
   * @param {object} config - Particle configuration
   */
  addParticle(config) {
    if (this.particles.length >= this.maxParticles) {
      // Remove oldest particle to make room
      this.particles.shift();
    }

    this.particles.push(new Particle(config));
  }

  /**
   * Add multiple particles at once
   * @param {Array} configs - Array of particle configurations
   */
  addParticles(configs) {
    configs.forEach(config => this.addParticle(config));
  }

  /**
   * Create a burst of particles
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {object} options - Burst options
   */
  createBurst(x, y, options = {}) {
    const count = options.count || 20;
    const speed = options.speed || 0.1;
    const spread = options.spread || Math.PI * 2;
    const color = options.color || '#FFFFFF';
    const size = options.size || 2;
    const life = options.life || 0.5;
    const gravity = options.gravity || 0;

    for (let i = 0; i < count; i++) {
      const angle = (spread / count) * i + (options.angleOffset || 0);
      const velocity = speed * (0.5 + Math.random() * 0.5);

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: size * (0.5 + Math.random() * 0.5),
        color,
        life,
        maxLife: life,
        gravity
      });
    }
  }

  /**
   * Create construction dust effect
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createConstructionDust(x, y) {
    this.createBurst(x, y, {
      count: 15,
      speed: 0.05,
      spread: Math.PI * 2,
      color: '#8B7355',
      size: 3,
      life: 0.8,
      gravity: 0.0001
    });
  }

  /**
   * Create construction sparks effect
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createConstructionSparks(x, y) {
    this.createBurst(x, y, {
      count: 10,
      speed: 0.15,
      spread: Math.PI * 2,
      color: '#FFD700',
      size: 2,
      life: 0.4,
      gravity: 0.0002
    });
  }

  /**
   * Create resource collection particles
   * @param {number} fromX - Starting X position
   * @param {number} fromY - Starting Y position
   * @param {number} toX - Target X position
   * @param {number} toY - Target Y position
   * @param {string} resourceType - Type of resource
   */
  createResourceParticles(fromX, fromY, toX, toY, resourceType = 'GOLD') {
    const colors = {
      GOLD: '#FFD700',
      WOOD: '#8B4513',
      STONE: '#808080',
      ESSENCE: '#9C27B0',
      CRYSTAL: '#00BCD4'
    };

    const color = colors[resourceType] || '#FFFFFF';
    const count = 5;

    for (let i = 0; i < count; i++) {
      const delay = i * 0.05;
      const dx = toX - fromX;
      const dy = toY - fromY;

      setTimeout(() => {
        this.addParticle({
          x: fromX,
          y: fromY,
          vx: dx * 0.002,
          vy: dy * 0.002,
          size: 4,
          color,
          life: 1.0,
          maxLife: 1.0,
          gravity: 0,
          fade: false,
          shrink: false
        });
      }, delay * 1000);
    }
  }

  /**
   * Create achievement unlock effect
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  createAchievementEffect(x, y) {
    // Gold burst
    this.createBurst(x, y, {
      count: 30,
      speed: 0.2,
      spread: Math.PI * 2,
      color: '#FFD700',
      size: 4,
      life: 1.5,
      gravity: 0.00005
    });

    // Secondary sparkles
    setTimeout(() => {
      this.createBurst(x, y, {
        count: 20,
        speed: 0.15,
        spread: Math.PI * 2,
        color: '#FFA500',
        size: 3,
        life: 1.2,
        gravity: 0.00005
      });
    }, 100);

    // Inner stars
    setTimeout(() => {
      this.createBurst(x, y, {
        count: 10,
        speed: 0.1,
        spread: Math.PI * 2,
        color: '#FFFFFF',
        size: 2,
        life: 1.0,
        gravity: 0
      });
    }, 200);
  }

  /**
   * Update all particles
   */
  update() {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
    this.lastUpdate = now;

    // Update and filter out dead particles
    this.particles = this.particles.filter(particle => particle.update(deltaTime));
  }

  /**
   * Render all particles
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    this.particles.forEach(particle => particle.render(ctx));
  }

  /**
   * Clear all particles
   */
  clear() {
    this.particles = [];
  }

  /**
   * Get particle count
   * @returns {number} Number of active particles
   */
  getParticleCount() {
    return this.particles.length;
  }
}

/**
 * Create a particle system instance
 * @returns {ParticleSystem} Particle system instance
 */
export function createParticleSystem() {
  return new ParticleSystem();
}

/**
 * Default export
 */
export default ParticleSystem;
