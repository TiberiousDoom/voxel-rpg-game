/**
 * ParticleSystem Unit Tests
 * Tests for particle effect system
 *
 * Part of WF3: Building Rendering & Visual Effects
 */

import { ParticleSystem, createParticleSystem } from '../ParticleSystem.js';

describe('ParticleSystem', () => {
  let particleSystem;
  let mockCtx;

  beforeEach(() => {
    particleSystem = new ParticleSystem();

    // Mock canvas context
    mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      fillStyle: '',
      globalAlpha: 1
    };

    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('initializes empty particle array', () => {
      expect(particleSystem.particles).toEqual([]);
    });

    test('sets max particles limit', () => {
      expect(particleSystem.maxParticles).toBe(1000);
    });

    test('initializes lastUpdate timestamp', () => {
      expect(particleSystem.lastUpdate).toBeDefined();
    });
  });

  describe('addParticle', () => {
    test('adds particle to system', () => {
      particleSystem.addParticle({
        x: 10,
        y: 20,
        vx: 1,
        vy: 1,
        life: 1.0
      });

      expect(particleSystem.particles.length).toBe(1);
      expect(particleSystem.particles[0].x).toBe(10);
      expect(particleSystem.particles[0].y).toBe(20);
    });

    test('respects max particle limit', () => {
      particleSystem.maxParticles = 5;

      // Add 10 particles
      for (let i = 0; i < 10; i++) {
        particleSystem.addParticle({ x: i, y: i, life: 1.0 });
      }

      // Should only have 5 particles (oldest removed)
      expect(particleSystem.particles.length).toBe(5);
    });

    test('sets default values for missing properties', () => {
      particleSystem.addParticle({ life: 1.0 });

      const particle = particleSystem.particles[0];
      expect(particle.x).toBe(0);
      expect(particle.y).toBe(0);
      expect(particle.vx).toBe(0);
      expect(particle.vy).toBe(0);
    });
  });

  describe('addParticles', () => {
    test('adds multiple particles at once', () => {
      const configs = [
        { x: 0, y: 0, life: 1.0 },
        { x: 10, y: 10, life: 1.0 },
        { x: 20, y: 20, life: 1.0 }
      ];

      particleSystem.addParticles(configs);
      expect(particleSystem.particles.length).toBe(3);
    });
  });

  describe('createBurst', () => {
    test('creates burst with default count', () => {
      particleSystem.createBurst(100, 100);
      expect(particleSystem.particles.length).toBe(20); // Default count
    });

    test('creates burst with custom count', () => {
      particleSystem.createBurst(100, 100, { count: 10 });
      expect(particleSystem.particles.length).toBe(10);
    });

    test('distributes particles in radial pattern', () => {
      particleSystem.createBurst(100, 100, { count: 8, speed: 1 });

      // Check that particles have velocity in different directions
      const velocities = particleSystem.particles.map(p => ({ vx: p.vx, vy: p.vy }));
      const uniqueDirections = new Set(velocities.map(v => Math.atan2(v.vy, v.vx)));

      expect(uniqueDirections.size).toBeGreaterThan(1);
    });

    test('applies custom properties to burst particles', () => {
      particleSystem.createBurst(100, 100, {
        count: 5,
        color: '#FF0000',
        size: 10,
        life: 2.0
      });

      particleSystem.particles.forEach(particle => {
        expect(particle.color).toBe('#FF0000');
        expect(particle.life).toBeCloseTo(2.0, 1);
      });
    });
  });

  describe('createConstructionDust', () => {
    test('creates dust particles', () => {
      particleSystem.createConstructionDust(100, 100);
      expect(particleSystem.particles.length).toBe(15);
    });

    test('dust particles have earth-tone color', () => {
      particleSystem.createConstructionDust(100, 100);
      const particle = particleSystem.particles[0];
      expect(particle.color).toBe('#8B7355');
    });
  });

  describe('createConstructionSparks', () => {
    test('creates spark particles', () => {
      particleSystem.createConstructionSparks(100, 100);
      expect(particleSystem.particles.length).toBe(10);
    });

    test('sparks have golden color', () => {
      particleSystem.createConstructionSparks(100, 100);
      const particle = particleSystem.particles[0];
      expect(particle.color).toBe('#FFD700');
    });
  });

  describe('createResourceParticles', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('creates resource particles over time', () => {
      particleSystem.createResourceParticles(0, 0, 100, 100, 'GOLD');

      // Initially should have 1 particle
      expect(particleSystem.particles.length).toBe(1);

      // Advance time and check for more particles
      jest.advanceTimersByTime(100);
      expect(particleSystem.particles.length).toBeGreaterThan(1);
    });

    test('uses correct color for resource type', () => {
      particleSystem.createResourceParticles(0, 0, 100, 100, 'GOLD');
      jest.advanceTimersByTime(0);

      const particle = particleSystem.particles[0];
      expect(particle.color).toBe('#FFD700');
    });
  });

  describe('createAchievementEffect', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('creates multi-layered burst effect', () => {
      particleSystem.createAchievementEffect(100, 100);

      // Should have initial gold burst
      expect(particleSystem.particles.length).toBeGreaterThan(0);

      // Advance timers to trigger delayed bursts
      jest.advanceTimersByTime(250);

      // Should have more particles from delayed bursts
      expect(particleSystem.particles.length).toBeGreaterThan(30);
    });
  });

  describe('update', () => {
    test('updates particle positions', () => {
      particleSystem.addParticle({
        x: 0,
        y: 0,
        vx: 1,
        vy: 1,
        life: 1.0,
        maxLife: 1.0
      });

      const initialX = particleSystem.particles[0].x;

      // Advance time
      Date.now.mockReturnValue(2000); // 1 second later
      particleSystem.update();

      expect(particleSystem.particles[0].x).not.toBe(initialX);
    });

    test('removes dead particles', () => {
      particleSystem.addParticle({
        x: 0,
        y: 0,
        life: 0.01,
        maxLife: 1.0
      });

      expect(particleSystem.particles.length).toBe(1);

      // Advance time enough to kill particle
      Date.now.mockReturnValue(2000);
      particleSystem.update();

      expect(particleSystem.particles.length).toBe(0);
    });

    test('applies gravity to particles', () => {
      particleSystem.addParticle({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        gravity: 0.01,
        life: 10.0,
        maxLife: 10.0
      });

      const initialVy = particleSystem.particles[0].vy;

      Date.now.mockReturnValue(1100);
      particleSystem.update();

      expect(particleSystem.particles[0].vy).toBeGreaterThan(initialVy);
    });

    test('applies drag to velocity', () => {
      particleSystem.addParticle({
        x: 0,
        y: 0,
        vx: 10,
        vy: 10,
        drag: 0.9,
        life: 10.0,
        maxLife: 10.0
      });

      const initialVx = particleSystem.particles[0].vx;

      Date.now.mockReturnValue(1100);
      particleSystem.update();

      expect(Math.abs(particleSystem.particles[0].vx)).toBeLessThan(Math.abs(initialVx));
    });
  });

  describe('render', () => {
    test('renders all particles', () => {
      particleSystem.addParticle({ x: 10, y: 10, life: 1.0, size: 5 });
      particleSystem.addParticle({ x: 20, y: 20, life: 1.0, size: 5 });

      particleSystem.render(mockCtx);

      expect(mockCtx.arc).toHaveBeenCalledTimes(2);
      expect(mockCtx.fill).toHaveBeenCalledTimes(2);
    });

    test('applies alpha to particles', () => {
      particleSystem.addParticle({
        x: 10,
        y: 10,
        life: 1.0,
        alpha: 0.5,
        size: 5
      });

      particleSystem.render(mockCtx);

      expect(mockCtx.globalAlpha).toBe(0.5);
    });
  });

  describe('clear', () => {
    test('removes all particles', () => {
      particleSystem.addParticles([
        { x: 0, y: 0, life: 1.0 },
        { x: 10, y: 10, life: 1.0 },
        { x: 20, y: 20, life: 1.0 }
      ]);

      expect(particleSystem.particles.length).toBe(3);

      particleSystem.clear();

      expect(particleSystem.particles.length).toBe(0);
    });
  });

  describe('getParticleCount', () => {
    test('returns correct particle count', () => {
      expect(particleSystem.getParticleCount()).toBe(0);

      particleSystem.addParticle({ life: 1.0 });
      expect(particleSystem.getParticleCount()).toBe(1);

      particleSystem.addParticle({ life: 1.0 });
      particleSystem.addParticle({ life: 1.0 });
      expect(particleSystem.getParticleCount()).toBe(3);
    });
  });

  describe('createParticleSystem factory', () => {
    test('creates new particle system instance', () => {
      const system = createParticleSystem();
      expect(system).toBeInstanceOf(ParticleSystem);
      expect(system.particles).toEqual([]);
    });
  });
});
