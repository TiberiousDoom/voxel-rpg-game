/**
 * Experience Component Tests
 * Renders the scene against the real game store with mocked R3F/Rapier.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '../testSetup';
import useGameStore from '../../../stores/useGameStore';
import Experience from '../Experience';

const renderExperience = () => render(<Experience />);

describe('Experience Component', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.setState({ gameState: 'playing' });
  });

  describe('Rendering', () => {
    test('renders without crashing', () => {
      expect(() => renderExperience()).not.toThrow();
    });

    test('renders the Physics world with game gravity', () => {
      renderExperience();
      const physics = screen.getByTestId('rapier-physics');
      expect(physics).toBeInTheDocument();
      expect(physics.getAttribute('gravity')).toBe('0,-20,0');
    });

    test('renders the Player rigid body', () => {
      renderExperience();
      expect(screen.getByTestId('rapier-capsule-collider')).toBeInTheDocument();
    });
  });

  describe('Pause', () => {
    test('physics is paused while the game is paused', () => {
      renderExperience();
      expect(screen.getByTestId('rapier-physics').getAttribute('data-paused')).toBe('false');

      act(() => {
        useGameStore.setState({ gameState: 'paused' });
      });
      expect(screen.getByTestId('rapier-physics').getAttribute('data-paused')).toBe('true');
    });
  });

  describe('Dynamic Elements', () => {
    test('renders rift enemies from the store', () => {
      renderExperience();
      const before = screen.getAllByTestId('rapier-rigid-body').length;

      act(() => {
        useGameStore.getState().addRiftEnemy({
          id: 'rift_enemy_1', type: 'slime', name: 'Slime', health: 50, position: [5, 10, 5],
        });
      });

      expect(screen.getAllByTestId('rapier-rigid-body').length).toBe(before + 1);
    });

    test('renders projectiles from the store', () => {
      renderExperience();
      const before = screen.getAllByTestId('rapier-rigid-body').length;

      act(() => {
        useGameStore.getState().addProjectile({
          id: 'p1', position: [0, 2, 0], direction: [0, 0, 1], speed: 10, damage: 5,
        });
      });

      expect(screen.getAllByTestId('rapier-rigid-body').length).toBe(before + 1);
    });

    test('small player movements do not re-render the scene', () => {
      const commits = [];
      render(
        <React.Profiler id="scene" onRender={(id, phase) => commits.push(phase)}>
          <Experience />
        </React.Profiler>
      );
      commits.length = 0;

      // Movement within the same chunk/rift-sort cell
      act(() => {
        useGameStore.getState().updatePlayer({ position: [1, 70, 1] });
        useGameStore.getState().updatePlayer({ position: [2, 69, 2] });
      });

      expect(commits).toHaveLength(0);
    });
  });
});
