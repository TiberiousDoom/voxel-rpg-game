/**
 * Player Component Tests
 * Drives the real game store with mocked R3F/Rapier and steps frames manually.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '../testSetup';
import { advanceFrames } from '@react-three/fiber';
import useGameStore from '../../../stores/useGameStore';
import { JUMP_STAMINA_COST } from '../../../data/tuning';
import Player from '../Player';

const press = (code) => document.dispatchEvent(new KeyboardEvent('keydown', { code }));
const release = (code) => document.dispatchEvent(new KeyboardEvent('keyup', { code }));
const step = (n = 1, delta = 1 / 60) => act(() => advanceFrames(n, delta));
const player = () => useGameStore.getState().player;

describe('Player Component', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.setState({ gameState: 'playing' });
  });

  afterEach(() => {
    // Releases every held key (useKeyboard resets on blur)
    window.dispatchEvent(new Event('blur'));
  });

  describe('Rendering', () => {
    test('renders a dynamic rigid body with a capsule collider', () => {
      render(<Player />);
      const body = screen.getByTestId('rapier-rigid-body');
      expect(body.getAttribute('type')).toBe('dynamic');
      expect(screen.getByTestId('rapier-capsule-collider')).toBeInTheDocument();
    });

    test('unmounts cleanly', () => {
      const { unmount } = render(<Player />);
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Frame updates', () => {
    test('writes the physics position back to the store', () => {
      render(<Player />);
      step();
      expect(player().position).toEqual([0, 70, 0]);
    });

    test('does nothing while paused', () => {
      render(<Player />);
      useGameStore.getState().updatePlayer({ stamina: 50 });
      useGameStore.setState({ gameState: 'paused' });
      step(30);
      expect(player().stamina).toBe(50);
    });

    test('consumes a teleport request by moving the physics body', () => {
      render(<Player />);
      act(() => useGameStore.getState().teleportPlayer([40, 30, -12]));
      step(); // consumes the request
      expect(useGameStore.getState().pendingTeleport).toBeNull();
      step(); // writes the new body position back
      expect(player().position).toEqual([40, 30, -12]);
    });
  });

  describe('Stamina', () => {
    test('sprinting drains stamina', () => {
      render(<Player />);
      press('ShiftLeft');
      press('KeyW');
      step(30);
      expect(player().stamina).toBeLessThan(100);
      expect(player().isSprinting).toBe(true);
    });

    test('jumping costs stamina', () => {
      render(<Player />);
      useGameStore.getState().updatePlayer({ stamina: 50 });
      press('Space');
      step();
      expect(player().stamina).toBeLessThan(50 - JUMP_STAMINA_COST + 1);
    });
  });

  describe('Spells', () => {
    test('casting spends mana, spawns a projectile and starts the cooldown', () => {
      render(<Player />);
      press('Digit1'); // fireball
      step();
      release('Digit1');

      const s = useGameStore.getState();
      expect(s.projectiles).toHaveLength(1);
      expect(s.player.mana).toBeLessThan(100);
      expect(s.getSpellCooldown('fireball')).toBeGreaterThan(0);

      // Cooldown blocks an immediate re-cast
      press('Digit1');
      step();
      expect(useGameStore.getState().projectiles).toHaveLength(1);
    });
  });

  describe('Buffs', () => {
    test('expire over time', () => {
      render(<Player />);
      useGameStore.getState().addStatusEffect({ type: 'haste', duration: 0.5, value: 1.3 });
      step(20); // ~0.33s
      expect(player().statusEffects).toHaveLength(1);
      step(20);
      expect(player().statusEffects).toHaveLength(0);
    });
  });

  describe('Dodge roll', () => {
    test('ending a dodge keeps respawn protection active', () => {
      render(<Player />);
      useGameStore.getState().updatePlayer({ isInvincible: true, invincibilityTimer: 5 });
      press('KeyW');
      press('Space');
      step();
      release('Space');
      press('Space'); // double tap → dodge
      step();
      release('Space');
      step(30); // dodge (0.3s) is over
      expect(player().isInvincible).toBe(true);
    });
  });

  describe('Camera', () => {
    test('third-person camera moves toward the player', async () => {
      const { useThree } = await import('@react-three/fiber');
      const camera = useThree().camera;
      camera.position.set(500, 500, 500);
      render(<Player />);
      step(10);
      expect(camera.position.distanceTo({ x: 0, y: 70, z: 0 })).toBeLessThan(800);
    });
  });
});
