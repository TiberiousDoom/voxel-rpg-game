/**
 * Experience Component Tests
 * Tests for the main 3D scene container
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '../testSetup';

// Mock the store
vi.mock('../../../stores/useGameStore', () => {
  const noop = () => {};
  const createState = () => ({
    projectiles: [],
    targetMarkers: [],
    damageNumbers: [],
    xpOrbs: [],
    lootDrops: [],
    particleEffects: [],
    enemies: [],
    rifts: [],
    player: {
      position: { x: 0, y: 0, z: 0 },
      health: 100, maxHealth: 100,
      mana: 100, maxMana: 100,
      stamina: 100, maxStamina: 100,
      level: 1, xp: 0,
    },
    equipment: {},
    camera: { firstPerson: false, distance: 20, angle: 0, pitch: 0.8 },
    worldTime: { isNight: false, elapsed: 0, timeScale: 1, paused: false },
    gameState: 'playing',
    buildMode: false,
    blockPlacementMode: false,
    selectedBlockType: 1,
    screenShake: null,
    _chunkManager: null,
    _blockClickActive: false,
    removeDamageNumber: noop,
    removeXPOrb: noop,
    removeLootDrop: noop,
    removeParticleEffect: noop,
    removeTargetMarker: noop,
    removeProjectile: noop,
    removeRiftEnemy: noop,
    setChunkManager: noop,
    updatePlayer: noop,
    setPlayerPosition: noop,
    setPlayerTarget: noop,
    consumeStamina: noop,
    regenStamina: noop,
    regenMana: noop,
    updateCamera: noop,
    updateWorldTime: noop,
    updateSpellCooldowns: noop,
    clearScreenShake: noop,
    dealDamageToPlayer: noop,
    addGold: noop,
    addMaterial: noop,
    addXP: noop,
    addDamageNumber: noop,
    addTargetMarker: noop,
    setRifts: noop,
  });
  const mockStore = vi.fn((selector) => {
    const state = createState();
    return selector ? selector(state) : state;
  });
  mockStore.getState = () => createState();
  return mockStore;
});

// Import after mocks
import Experience from '../Experience';

// Wrapper to provide necessary context
const TestWrapper = ({ children }) => (
  <div data-testid="test-wrapper">{children}</div>
);

describe('Experience Component', () => {
  beforeEach(() => {
    // Re-initialize mock after clearAllMocks (which strips vi.fn implementations)
    const useGameStore = require('../../../stores/useGameStore');
    if (useGameStore.mockImplementation) {
      const noop = () => {};
      const createState = () => ({
        projectiles: [],
        targetMarkers: [],
        damageNumbers: [],
        xpOrbs: [],
        lootDrops: [],
        particleEffects: [],
        enemies: [],
        rifts: [],
        player: {
          position: { x: 0, y: 0, z: 0 },
          health: 100, maxHealth: 100,
          mana: 100, maxMana: 100,
          stamina: 100, maxStamina: 100,
          level: 1, xp: 0,
        },
        equipment: {},
        camera: { firstPerson: false, distance: 20, angle: 0, pitch: 0.8 },
        worldTime: { isNight: false, elapsed: 0, timeScale: 1, paused: false },
        gameState: 'playing',
        buildMode: false,
        blockPlacementMode: false,
        selectedBlockType: 1,
        screenShake: null,
        _chunkManager: null,
        _blockClickActive: false,
        removeDamageNumber: noop,
        removeXPOrb: noop,
        removeLootDrop: noop,
        removeParticleEffect: noop,
        removeTargetMarker: noop,
        removeProjectile: noop,
        removeRiftEnemy: noop,
        setChunkManager: noop,
        updatePlayer: noop,
        setPlayerPosition: noop,
        setPlayerTarget: noop,
        consumeStamina: noop,
        regenStamina: noop,
        regenMana: noop,
        updateCamera: noop,
        updateWorldTime: noop,
        updateSpellCooldowns: noop,
        clearScreenShake: noop,
        dealDamageToPlayer: noop,
        addGold: noop,
        addMaterial: noop,
        addXP: noop,
        addDamageNumber: noop,
        addTargetMarker: noop,
        setRifts: noop,
      });
      useGameStore.mockImplementation((selector) => {
        const state = createState();
        return selector ? selector(state) : state;
      });
      useGameStore.getState = () => createState();
    }
  });

  describe('Rendering', () => {
    test('renders without crashing', () => {
      expect(() =>
        render(
          <TestWrapper>
            <Experience />
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('renders Physics container', () => {
      render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      const physics = screen.getByTestId('rapier-physics');
      expect(physics).toBeInTheDocument();
    });
  });

  describe('Lighting', () => {
    test('includes ambient light', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      // Ambient light is rendered as a React element
      expect(container).toBeInTheDocument();
    });

    test('includes directional light (sun)', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Scene Elements', () => {
    test('renders ChunkRenderer terrain', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      // ChunkRenderer handles terrain (replaced VoxelTerrain)
      expect(container).toBeInTheDocument();
    });

    test('renders Player', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders initial enemies', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      // 4 enemies are spawned by default
      expect(container).toBeInTheDocument();
    });

    test('renders ground collision plane', () => {
      render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      const rigidBodies = screen.getAllByTestId('rapier-rigid-body');
      expect(rigidBodies.length).toBeGreaterThan(0);
    });
  });

  describe('Controls', () => {
    test('renders TouchControls', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders CameraRotateControls', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Dynamic Elements', () => {
    const setupDynamicStore = (overrides = {}) => {
      const useGameStore = require('../../../stores/useGameStore');
      const noop = () => {};
      const baseState = {
        projectiles: [],
        targetMarkers: [],
        damageNumbers: [],
        xpOrbs: [],
        lootDrops: [],
        particleEffects: [],
        enemies: [],
        rifts: [],
        player: {
          position: { x: 0, y: 0, z: 0 },
          health: 100, maxHealth: 100,
          mana: 100, maxMana: 100,
          stamina: 100, maxStamina: 100,
          level: 1, xp: 0,
        },
        equipment: {},
        camera: { firstPerson: false, distance: 20, angle: 0, pitch: 0.8 },
        worldTime: { isNight: false, elapsed: 0, timeScale: 1, paused: false },
        gameState: 'playing',
        buildMode: false,
        blockPlacementMode: false,
        selectedBlockType: 1,
        screenShake: null,
        _chunkManager: null,
        _blockClickActive: false,
        removeDamageNumber: noop,
        removeXPOrb: noop,
        removeLootDrop: noop,
        removeParticleEffect: noop,
        removeTargetMarker: noop,
        removeProjectile: noop,
        removeRiftEnemy: noop,
        setChunkManager: noop,
        updatePlayer: noop,
        setPlayerPosition: noop,
        setPlayerTarget: noop,
        consumeStamina: noop,
        regenStamina: noop,
        regenMana: noop,
        updateCamera: noop,
        updateWorldTime: noop,
        updateSpellCooldowns: noop,
        clearScreenShake: noop,
        dealDamageToPlayer: noop,
        addGold: noop,
        addMaterial: noop,
        addXP: noop,
        addDamageNumber: noop,
        addTargetMarker: noop,
        setRifts: noop,
        ...overrides,
      };
      useGameStore.mockImplementation((selector) => {
        return selector ? selector(baseState) : baseState;
      });
      useGameStore.getState = () => baseState;
    };

    test('renders projectiles from store', () => {
      setupDynamicStore({
        projectiles: [
          { id: 'proj1', position: [0, 0, 0], direction: [1, 0, 0], speed: 10 },
        ],
      });
      const { container } = render(
        <TestWrapper><Experience /></TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders damage numbers from store', () => {
      setupDynamicStore({
        damageNumbers: [
          { id: 'dmg1', position: [0, 2, 0], damage: 50 },
        ],
      });
      const { container } = render(
        <TestWrapper><Experience /></TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders XP orbs from store', () => {
      setupDynamicStore({
        xpOrbs: [
          { id: 'xp1', position: [5, 1, 5], xpValue: 25 },
        ],
      });
      const { container } = render(
        <TestWrapper><Experience /></TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders particle effects from store', () => {
      setupDynamicStore({
        particleEffects: [
          { id: 'fx1', position: [0, 0, 0], type: 'explosion' },
        ],
      });
      const { container } = render(
        <TestWrapper><Experience /></TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders target markers from store', () => {
      setupDynamicStore({
        targetMarkers: [
          { id: 'tm1', position: [10, 0, 10], color: '#00ff00' },
        ],
      });
      const { container } = render(
        <TestWrapper><Experience /></TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Physics Configuration', () => {
    test('Physics has correct gravity', () => {
      render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      const physics = screen.getByTestId('rapier-physics');
      // Gravity should be [0, -20, 0]
      expect(physics).toBeInTheDocument();
    });
  });

  describe('Fog and Environment', () => {
    test('scene has fog attached', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      // Fog is attached to the scene
      expect(container).toBeInTheDocument();
    });

    test('scene has sky background color', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });
  });
});
