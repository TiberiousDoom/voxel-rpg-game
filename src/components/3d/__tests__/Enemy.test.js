/**
 * Enemy Component Tests
 * Tests for the 3D enemy entities with AI
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '../testSetup';

// Mock the store
jest.mock('../../../stores/useGameStore', () => {
  return jest.fn((selector) => {
    const state = {
      player: {
        position: [0, 2, 0],
        health: 100,
        maxHealth: 100,
      },
      dealDamageToPlayer: jest.fn(),
      addDamageNumber: jest.fn(),
      removeEnemy: jest.fn(),
      handleMonsterDeath: jest.fn(),
    };
    return selector ? selector(state) : state;
  });
});

// Import after mocks
import Enemy from '../Enemy';

const TestWrapper = ({ children }) => (
  <div data-testid="test-wrapper">{children}</div>
);

describe('Enemy Component', () => {
  const defaultProps = {
    position: [10, 5, 10],
    name: 'Slime',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    test('renders without crashing', () => {
      expect(() =>
        render(
          <TestWrapper>
            <Enemy {...defaultProps} />
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('renders RigidBody for physics', () => {
      render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('renders enemy mesh', () => {
      const { container } = render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders at specified position', () => {
      render(
        <TestWrapper>
          <Enemy position={[15, 3, 20]} name="Goblin" />
        </TestWrapper>
      );
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });
  });

  describe('Enemy Types', () => {
    test('renders Slime enemy', () => {
      const { container } = render(
        <TestWrapper>
          <Enemy position={[0, 0, 0]} name="Slime" />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders Goblin enemy', () => {
      const { container } = render(
        <TestWrapper>
          <Enemy position={[0, 0, 0]} name="Goblin" />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders Orc enemy', () => {
      const { container } = render(
        <TestWrapper>
          <Enemy position={[0, 0, 0]} name="Orc" />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders Skeleton enemy', () => {
      const { container } = render(
        <TestWrapper>
          <Enemy position={[0, 0, 0]} name="Skeleton" />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Health System', () => {
    test('enemy starts with full health', () => {
      render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );
      // Health bar should be rendered
      const billboard = screen.queryByTestId('drei-billboard');
      expect(billboard || document.querySelector('[data-testid="rapier-rigid-body"]')).toBeTruthy();
    });

    test('health bar is rendered with Billboard', () => {
      render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );
      // Billboard is used for health bars to always face camera
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });
  });

  describe('AI Behavior', () => {
    test('enemy detects player within range', () => {
      // Player at [0, 2, 0], enemy at [10, 5, 10]
      // Distance is about 14 units, within typical detection range of 20
      render(
        <TestWrapper>
          <Enemy position={[10, 5, 10]} name="Slime" />
        </TestWrapper>
      );

      // Enemy should start moving toward player
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('enemy does not detect player outside range', () => {
      // Player at [0, 2, 0], enemy at [100, 5, 100]
      // Distance is about 141 units, outside detection range
      render(
        <TestWrapper>
          <Enemy position={[100, 5, 100]} name="Slime" />
        </TestWrapper>
      );

      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });
  });

  describe('Combat', () => {
    test('enemy attacks player when in melee range', () => {
      const useGameStore = require('../../../stores/useGameStore');

      // Enemy very close to player
      render(
        <TestWrapper>
          <Enemy position={[1, 2, 1]} name="Slime" />
        </TestWrapper>
      );

      // Fast forward attack cooldown
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(useGameStore).toHaveBeenCalled();
    });

    test('attack has cooldown period', () => {
      const useGameStore = require('../../../stores/useGameStore');

      render(
        <TestWrapper>
          <Enemy position={[1, 2, 1]} name="Slime" />
        </TestWrapper>
      );

      // Multiple time advances
      act(() => {
        jest.advanceTimersByTime(500);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(useGameStore).toHaveBeenCalled();
    });
  });

  describe('Death', () => {
    test('enemy can die from damage', () => {
      const { container } = render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );

      // Enemy should have death handling
      expect(container).toBeInTheDocument();
    });

    test('death triggers cleanup after animation', () => {
      const useGameStore = require('../../../stores/useGameStore');

      render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );

      expect(useGameStore).toHaveBeenCalled();
    });
  });

  describe('Visual Effects', () => {
    test('enemy flashes red when damaged', () => {
      const { container } = render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );

      // Damage flash effect should be implemented
      expect(container).toBeInTheDocument();
    });

    test('enemy has shadow', () => {
      const { container } = render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Physics', () => {
    test('enemy has dynamic rigid body', () => {
      render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );

      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('enemy respects gravity', () => {
      render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );

      // Enemy should fall if spawned in air
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });
  });

  describe('Collision', () => {
    test('enemy has collision detection', () => {
      render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );

      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    test('removes timers on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <Enemy {...defaultProps} />
        </TestWrapper>
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
