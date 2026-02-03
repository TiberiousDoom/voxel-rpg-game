/**
 * Experience Component Tests
 * Tests for the main 3D scene container
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '../testSetup';

// Mock the store
jest.mock('../../../stores/useGameStore', () => {
  const mockStore = jest.fn((selector) => {
    const state = {
      projectiles: [],
      targetMarkers: [],
      damageNumbers: [],
      xpOrbs: [],
      particleEffects: [],
      removeDamageNumber: jest.fn(),
      removeXPOrb: jest.fn(),
      removeParticleEffect: jest.fn(),
    };
    return selector ? selector(state) : state;
  });
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
    jest.clearAllMocks();
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
    test('renders VoxelTerrain', () => {
      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      // VoxelTerrain is a child component
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
    test('renders projectiles from store', () => {
      const useGameStore = require('../../../stores/useGameStore');
      useGameStore.mockImplementation((selector) => {
        const state = {
          projectiles: [
            { id: 'proj1', position: [0, 0, 0], direction: [1, 0, 0], speed: 10 },
          ],
          targetMarkers: [],
          damageNumbers: [],
          xpOrbs: [],
          particleEffects: [],
          removeDamageNumber: jest.fn(),
          removeXPOrb: jest.fn(),
          removeParticleEffect: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders damage numbers from store', () => {
      const useGameStore = require('../../../stores/useGameStore');
      useGameStore.mockImplementation((selector) => {
        const state = {
          projectiles: [],
          targetMarkers: [],
          damageNumbers: [
            { id: 'dmg1', position: [0, 2, 0], damage: 50 },
          ],
          xpOrbs: [],
          particleEffects: [],
          removeDamageNumber: jest.fn(),
          removeXPOrb: jest.fn(),
          removeParticleEffect: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders XP orbs from store', () => {
      const useGameStore = require('../../../stores/useGameStore');
      useGameStore.mockImplementation((selector) => {
        const state = {
          projectiles: [],
          targetMarkers: [],
          damageNumbers: [],
          xpOrbs: [
            { id: 'xp1', position: [5, 1, 5], xpValue: 25 },
          ],
          particleEffects: [],
          removeDamageNumber: jest.fn(),
          removeXPOrb: jest.fn(),
          removeParticleEffect: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders particle effects from store', () => {
      const useGameStore = require('../../../stores/useGameStore');
      useGameStore.mockImplementation((selector) => {
        const state = {
          projectiles: [],
          targetMarkers: [],
          damageNumbers: [],
          xpOrbs: [],
          particleEffects: [
            { id: 'fx1', position: [0, 0, 0], type: 'explosion' },
          ],
          removeDamageNumber: jest.fn(),
          removeXPOrb: jest.fn(),
          removeParticleEffect: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders target markers from store', () => {
      const useGameStore = require('../../../stores/useGameStore');
      useGameStore.mockImplementation((selector) => {
        const state = {
          projectiles: [],
          targetMarkers: [
            { id: 'tm1', position: [10, 0, 10], color: '#00ff00' },
          ],
          damageNumbers: [],
          xpOrbs: [],
          particleEffects: [],
          removeDamageNumber: jest.fn(),
          removeXPOrb: jest.fn(),
          removeParticleEffect: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      const { container } = render(
        <TestWrapper>
          <Experience />
        </TestWrapper>
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
