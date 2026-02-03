/**
 * NPCAnimations.test.js - Unit tests for NPCAnimations
 */

import {
  lerp,
  lerpPosition,
  smoothLerp,
  getMovementDirection,
  getDirectionBetweenPositions,
  shouldFlipSprite,
  AnimationFrameManager,
  NPCPositionInterpolator,
  calculateAnimationSpeed
} from '../NPCAnimations.js';

describe('NPCAnimations', () => {
  describe('lerp', () => {
    test('should interpolate between two values', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(5, 15, 0.5)).toBe(10);
    });

    test('should handle negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
      expect(lerp(-5, -2, 0.5)).toBe(-3.5);
    });
  });

  describe('lerpPosition', () => {
    test('should interpolate between two positions', () => {
      const start = { x: 0, y: 0, z: 0 };
      const end = { x: 10, y: 10, z: 10 };

      const mid = lerpPosition(start, end, 0.5);
      expect(mid.x).toBe(5);
      expect(mid.y).toBe(5);
      expect(mid.z).toBe(5);
    });

    test('should return start position at t=0', () => {
      const start = { x: 5, y: 5, z: 5 };
      const end = { x: 10, y: 10, z: 10 };

      const result = lerpPosition(start, end, 0);
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
      expect(result.z).toBe(5);
    });
  });

  describe('smoothLerp', () => {
    test('should provide smooth interpolation', () => {
      const result = smoothLerp(0, 10, 0.5);
      expect(result).toBeGreaterThanOrEqual(4);
      expect(result).toBeLessThanOrEqual(6);
    });

    test('should be smoother than linear at endpoints', () => {
      const linearMid = lerp(0, 10, 0.5);
      const smoothMid = smoothLerp(0, 10, 0.5);

      // Smooth should be same as linear at 0.5
      expect(Math.abs(linearMid - smoothMid)).toBeLessThan(1);

      // But different at 0.25 and 0.75
      const linear25 = lerp(0, 10, 0.25);
      const smooth25 = smoothLerp(0, 10, 0.25);
      expect(Math.abs(linear25 - smooth25)).toBeGreaterThan(0);
    });
  });

  describe('getMovementDirection', () => {
    test('should detect rightward movement', () => {
      expect(getMovementDirection({ x: 5, z: 0 })).toBe('right');
      expect(getMovementDirection({ x: 1, z: 0.5 })).toBe('right');
    });

    test('should detect leftward movement', () => {
      expect(getMovementDirection({ x: -5, z: 0 })).toBe('left');
      expect(getMovementDirection({ x: -1, z: 0.5 })).toBe('left');
    });

    test('should detect upward movement', () => {
      expect(getMovementDirection({ x: 0, z: -5 })).toBe('up');
      expect(getMovementDirection({ x: 0.5, z: -1 })).toBe('up');
    });

    test('should detect downward movement', () => {
      expect(getMovementDirection({ x: 0, z: 5 })).toBe('down');
      expect(getMovementDirection({ x: 0.5, z: 1 })).toBe('down');
    });

    test('should return none for no movement', () => {
      expect(getMovementDirection({ x: 0, z: 0 })).toBe('none');
      expect(getMovementDirection(null)).toBe('none');
    });
  });

  describe('getDirectionBetweenPositions', () => {
    test('should calculate direction between positions', () => {
      const from = { x: 5, z: 5 };

      expect(getDirectionBetweenPositions(from, { x: 10, z: 5 })).toBe('right');
      expect(getDirectionBetweenPositions(from, { x: 0, z: 5 })).toBe('left');
      expect(getDirectionBetweenPositions(from, { x: 5, z: 0 })).toBe('up');
      expect(getDirectionBetweenPositions(from, { x: 5, z: 10 })).toBe('down');
    });
  });

  describe('shouldFlipSprite', () => {
    test('should flip for leftward movement', () => {
      expect(shouldFlipSprite('left')).toBe(true);
    });

    test('should not flip for other directions', () => {
      expect(shouldFlipSprite('right')).toBe(false);
      expect(shouldFlipSprite('up')).toBe(false);
      expect(shouldFlipSprite('down')).toBe(false);
      expect(shouldFlipSprite('none')).toBe(false);
    });
  });

  describe('AnimationFrameManager', () => {
    test('should initialize with frame 0', () => {
      const manager = new AnimationFrameManager();
      expect(manager.currentFrame).toBe(0);
      expect(manager.frameTime).toBe(0);
    });

    test('should update frame after duration', () => {
      const manager = new AnimationFrameManager();
      const frames = [
        { offset: { x: 0, y: 0 }, scale: 1.0 },
        { offset: { x: 0, y: -1 }, scale: 0.95 }
      ];

      // Advance time
      manager.update(250, frames); // More than default 200ms
      expect(manager.currentFrame).toBe(1);

      // Advance more
      manager.update(250, frames);
      expect(manager.currentFrame).toBe(0); // Wrapped around
    });

    test('should not update before duration', () => {
      const manager = new AnimationFrameManager();
      const frames = [
        { offset: { x: 0, y: 0 }, scale: 1.0 },
        { offset: { x: 0, y: -1 }, scale: 0.95 }
      ];

      manager.update(100, frames); // Less than 200ms
      expect(manager.currentFrame).toBe(0);
    });

    test('should reset to frame 0', () => {
      const manager = new AnimationFrameManager();
      manager.currentFrame = 5;
      manager.frameTime = 100;

      manager.reset();
      expect(manager.currentFrame).toBe(0);
      expect(manager.frameTime).toBe(0);
    });

    test('should set frame duration', () => {
      const manager = new AnimationFrameManager();
      manager.setFrameDuration(100);
      expect(manager.frameDuration).toBe(100);
    });

    test('should enforce minimum frame duration', () => {
      const manager = new AnimationFrameManager();
      manager.setFrameDuration(10); // Too low
      expect(manager.frameDuration).toBe(50); // Clamped to minimum
    });
  });

  describe('NPCPositionInterpolator', () => {
    test('should initialize at given position', () => {
      const interpolator = new NPCPositionInterpolator({ x: 5, y: 0, z: 5 });

      expect(interpolator.currentPosition.x).toBe(5);
      expect(interpolator.currentPosition.z).toBe(5);
      expect(interpolator.isInterpolating).toBe(false);
    });

    test('should set target position', () => {
      const interpolator = new NPCPositionInterpolator({ x: 5, y: 0, z: 5 });

      interpolator.setTarget({ x: 10, y: 0, z: 10 });

      expect(interpolator.targetPosition.x).toBe(10);
      expect(interpolator.targetPosition.z).toBe(10);
      expect(interpolator.isInterpolating).toBe(true);
    });

    test('should interpolate toward target', () => {
      const interpolator = new NPCPositionInterpolator({ x: 0, y: 0, z: 0 });
      interpolator.setTarget({ x: 10, y: 0, z: 10 });

      const pos1 = interpolator.update();
      const pos2 = interpolator.update();

      // Should move toward target
      expect(pos2.x).toBeGreaterThan(pos1.x);
      expect(pos2.z).toBeGreaterThan(pos1.z);
      expect(pos2.x).toBeLessThan(10);
      expect(pos2.z).toBeLessThan(10);
    });

    test('should stop interpolating when close to target', () => {
      const interpolator = new NPCPositionInterpolator({ x: 9.99, y: 0, z: 9.99 });
      interpolator.setTarget({ x: 10, y: 0, z: 10 });

      interpolator.update();

      expect(interpolator.isInterpolating).toBe(false);
      expect(interpolator.currentPosition.x).toBe(10);
      expect(interpolator.currentPosition.z).toBe(10);
    });

    test('should teleport without interpolation', () => {
      const interpolator = new NPCPositionInterpolator({ x: 0, y: 0, z: 0 });
      interpolator.setTarget({ x: 5, y: 0, z: 5 });

      interpolator.teleport({ x: 10, y: 0, z: 10 });

      expect(interpolator.currentPosition.x).toBe(10);
      expect(interpolator.currentPosition.z).toBe(10);
      expect(interpolator.isInterpolating).toBe(false);
    });

    test('should calculate velocity', () => {
      const interpolator = new NPCPositionInterpolator({ x: 0, y: 0, z: 0 });
      interpolator.setTarget({ x: 10, y: 0, z: 10 });

      const velocity = interpolator.getVelocity();

      expect(velocity.x).toBeGreaterThan(0);
      expect(velocity.z).toBeGreaterThan(0);
    });

    test('should report if moving', () => {
      const interpolator = new NPCPositionInterpolator({ x: 0, y: 0, z: 0 });

      expect(interpolator.isMoving()).toBe(false);

      interpolator.setTarget({ x: 10, y: 0, z: 10 });

      expect(interpolator.isMoving()).toBe(true);
    });
  });

  describe('calculateAnimationSpeed', () => {
    const baseSpriteDefinition = {
      animationSpeed: 1.0
    };

    test('should use base speed for healthy idle NPC', () => {
      const npc = {
        health: 100,
        maxHealth: 100,
        isMoving: false
      };

      const speed = calculateAnimationSpeed(npc, baseSpriteDefinition);
      expect(speed).toBe(200); // base duration
    });

    test('should be faster when moving', () => {
      const idleNPC = {
        health: 100,
        maxHealth: 100,
        isMoving: false
      };

      const movingNPC = {
        health: 100,
        maxHealth: 100,
        isMoving: true
      };

      const idleSpeed = calculateAnimationSpeed(idleNPC, baseSpriteDefinition);
      const movingSpeed = calculateAnimationSpeed(movingNPC, baseSpriteDefinition);

      expect(movingSpeed).toBeLessThan(idleSpeed); // Lower duration = faster
    });

    test('should be slower when low health', () => {
      const healthyNPC = {
        health: 100,
        maxHealth: 100,
        isMoving: false
      };

      const damagedNPC = {
        health: 30,
        maxHealth: 100,
        isMoving: false
      };

      const healthySpeed = calculateAnimationSpeed(healthyNPC, baseSpriteDefinition);
      const damagedSpeed = calculateAnimationSpeed(damagedNPC, baseSpriteDefinition);

      expect(damagedSpeed).toBeGreaterThan(healthySpeed); // Higher duration = slower
    });
  });
});
