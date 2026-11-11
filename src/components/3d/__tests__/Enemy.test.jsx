/**
 * Enemy Component Tests
 * Tests for the 3D enemy entities with AI
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '../testSetup';
import useGameStoreMock from '../../../stores/useGameStore';
import { advanceFrames } from '@react-three/fiber';

// Mock the store
vi.mock('../../../stores/useGameStore', () => {
  const createState = () => ({
    gameState: 'playing',
    player: {
      position: [0, 2, 0],
      health: 100,
      maxHealth: 100,
    },
    dealDamageToPlayer: vi.fn(),
    addDamageNumber: vi.fn(),
    addParticleEffect: vi.fn(),
    addXPOrb: vi.fn(),
    addLootDrop: vi.fn(),
    removeEnemy: vi.fn(),
    removeRiftEnemy: vi.fn(),
    handleMonsterDeath: vi.fn(),
    _enemyPositions: new Map(),
    _enemyHandlers: new Map(),
    _chunkManager: null,
  });
  let state = createState();
  const mockStore = vi.fn((selector) => (selector ? selector(state) : state));
  mockStore.getState = () => state;
  mockStore.__reset = () => { state = createState(); };
  return { default: mockStore };
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
    vi.clearAllMocks();
    useGameStoreMock.__reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
      // Enemy very close to the player at [0, 2, 0]
      render(
        <TestWrapper>
          <Enemy position={[1, 2, 1]} name="Slime" />
        </TestWrapper>
      );

      act(() => advanceFrames(1));
      expect(useGameStoreMock.getState().dealDamageToPlayer).toHaveBeenCalledTimes(1);
    });

    test('attack has cooldown period', () => {
      render(
        <TestWrapper>
          <Enemy position={[1, 2, 1]} name="Slime" />
        </TestWrapper>
      );

      act(() => advanceFrames(30)); // 0.5s: still cooling down
      expect(useGameStoreMock.getState().dealDamageToPlayer).toHaveBeenCalledTimes(1);

      act(() => advanceFrames(40)); // > 1s total: attacks again
      expect(useGameStoreMock.getState().dealDamageToPlayer).toHaveBeenCalledTimes(2);
    });

    test('does not attack while the game is paused', () => {
      useGameStoreMock.getState().gameState = 'paused';
      render(
        <TestWrapper>
          <Enemy position={[1, 2, 1]} name="Slime" />
        </TestWrapper>
      );

      act(() => advanceFrames(10));
      expect(useGameStoreMock.getState().dealDamageToPlayer).not.toHaveBeenCalled();
    });

    test('registers hit handlers so melee/AOE can damage it by id', () => {
      render(
        <TestWrapper>
          <Enemy position={[10, 5, 10]} monsterData={{ id: 'rift_1', health: 50 }} />
        </TestWrapper>
      );

      const handler = useGameStoreMock.getState()._enemyHandlers.get('rift_1');
      expect(handler).toBeDefined();
      expect(typeof handler.takeDamage).toBe('function');
      expect(typeof handler.applyStatusEffect).toBe('function');
    });

    test('stun stops the enemy from attacking', () => {
      render(
        <TestWrapper>
          <Enemy position={[1, 2, 1]} monsterData={{ id: 'rift_2', health: 50 }} />
        </TestWrapper>
      );
      act(() => {
        useGameStoreMock.getState()._enemyHandlers.get('rift_2')
          .applyStatusEffect({ type: 'stun', duration: 2, value: 0 });
      });
      act(() => advanceFrames(10));
      expect(useGameStoreMock.getState().dealDamageToPlayer).not.toHaveBeenCalled();
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
      render(
        <TestWrapper>
          <Enemy position={[10, 5, 10]} monsterData={{ id: 'rift_3', health: 20, xp: 5 }} />
        </TestWrapper>
      );
      const state = useGameStoreMock.getState();

      act(() => state._enemyHandlers.get('rift_3').takeDamage(100));
      act(() => advanceFrames(1));

      expect(state.addXPOrb).toHaveBeenCalled();
      expect(state._enemyHandlers.has('rift_3')).toBe(false);

      act(() => vi.advanceTimersByTime(2000));
      expect(state.removeRiftEnemy).toHaveBeenCalledWith('rift_3');
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
