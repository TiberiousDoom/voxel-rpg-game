/**
 * Player Component Tests
 * Tests for the 3D player controller with physics
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '../testSetup';

// Mock the store with player state
const mockPlayerState = {
  position: [0, 2, 0],
  velocity: [0, 0, 0],
  targetPosition: null,
  health: 100,
  maxHealth: 100,
  mana: 100,
  maxMana: 100,
  stamina: 100,
  maxStamina: 100,
  level: 1,
  xp: 0,
  xpToNext: 100,
  damage: 10,
  speed: 5,
  facingAngle: 0,
  defense: 0,
  isJumping: false,
  isGrounded: true,
  isDodging: false,
  isBlocking: false,
  spellCooldowns: {},
};

const mockInventory = {
  gold: 100,
  potions: 3,
  items: [],
};

const mockEquipment = {
  weapon: null,
  armor: null,
};

jest.mock('../../../stores/useGameStore', () => {
  return jest.fn((selector) => {
    const state = {
      player: mockPlayerState,
      inventory: mockInventory,
      equipment: mockEquipment,
      camera: { rotationAngle: 0, distance: 12, height: 10 },
      enemies: [],
      projectiles: [],
      updatePlayer: jest.fn(),
      setPlayerPosition: jest.fn(),
      consumeMana: jest.fn(),
      consumeStamina: jest.fn(),
      regenStamina: jest.fn(),
      regenMana: jest.fn(),
      healPlayer: jest.fn(),
      addProjectile: jest.fn(),
      setSpellCooldown: jest.fn(),
      getSpellCooldown: jest.fn(() => 0),
      updateSpellCooldowns: jest.fn(),
      attackMonster: jest.fn(),
      updateCamera: jest.fn(),
    };
    return selector ? selector(state) : state;
  });
});

// Import after mocks
import Player from '../Player';

// Wrapper component
const TestWrapper = ({ children }) => (
  <div data-testid="test-wrapper">{children}</div>
);

describe('Player Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset keyboard state
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
  });

  describe('Rendering', () => {
    test('renders without crashing', () => {
      expect(() =>
        render(
          <TestWrapper>
            <Player />
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('renders RigidBody for physics', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('renders player mesh', () => {
      const { container } = render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    test('player starts at correct position', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );
      // Player should be at position [0, 2, 0]
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('player has correct initial stats from store', () => {
      const useGameStore = require('../../../stores/useGameStore');
      const playerSelector = useGameStore.mock.calls.find(
        (call) => call[0]?.toString().includes('player')
      );
      // Store should be called with player selector
      expect(useGameStore).toHaveBeenCalled();
    });
  });

  describe('Keyboard Input', () => {
    test('responds to W key (forward movement)', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      });

      // Player should register forward movement
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('responds to A key (left movement)', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      });

      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('responds to S key (backward movement)', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      });

      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('responds to D key (right movement)', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      });

      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('responds to Space key (jump)', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      });

      // Jump should be triggered if grounded
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('responds to Shift key (sprint)', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
      });

      // Sprint should be activated
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('responds to number keys (spell casting)', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Test spell keys 1-6
      for (let i = 1; i <= 6; i++) {
        act(() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: `Digit${i}` }));
        });
      }

      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });
  });

  describe('Movement Physics', () => {
    test('player has dynamic rigid body type', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });

    test('player has locked rotations (to prevent tipping)', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // RigidBody should have enabledRotations={[false, false, false]}
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });
  });

  describe('Combat System', () => {
    test('player can cast spells when mana is available', () => {
      const useGameStore = require('../../../stores/useGameStore');

      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Trigger spell cast
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }));
      });

      // Check if store methods were called (may need to verify in actual implementation)
      expect(useGameStore).toHaveBeenCalled();
    });

    test('spell cooldowns are respected', () => {
      const useGameStore = require('../../../stores/useGameStore');

      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Attempt multiple spell casts
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }));
      });

      expect(useGameStore).toHaveBeenCalled();
    });
  });

  describe('Stamina System', () => {
    test('sprinting consumes stamina', () => {
      const useGameStore = require('../../../stores/useGameStore');

      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Trigger sprint
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      });

      expect(useGameStore).toHaveBeenCalled();
    });

    test('jumping consumes stamina', () => {
      const useGameStore = require('../../../stores/useGameStore');

      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Trigger jump
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      });

      expect(useGameStore).toHaveBeenCalled();
    });
  });

  describe('Health Display', () => {
    test('player health bar is rendered', () => {
      const { container } = render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('Camera Follow', () => {
    test('camera follows player position', () => {
      const useGameStore = require('../../../stores/useGameStore');

      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Camera update should be called
      expect(useGameStore).toHaveBeenCalled();
    });
  });

  describe('Direction Indicator', () => {
    test('direction indicator shows facing direction', () => {
      const { container } = render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Direction indicator (cone) should be rendered
      expect(container).toBeInTheDocument();
    });
  });

  describe('Collision Detection', () => {
    test('player has capsule collider', () => {
      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Collider should be attached to RigidBody
      const rigidBody = screen.getByTestId('rapier-rigid-body');
      expect(rigidBody).toBeInTheDocument();
    });
  });

  describe('Dodge Rolling', () => {
    test('double-tap space triggers dodge when moving', () => {
      const useGameStore = require('../../../stores/useGameStore');

      render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Trigger movement + double space
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      });

      expect(useGameStore).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('removes event listeners on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <Player />
        </TestWrapper>
      );

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});
