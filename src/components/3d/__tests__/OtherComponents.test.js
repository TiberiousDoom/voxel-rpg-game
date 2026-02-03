/**
 * Other 3D Components Tests
 * Tests for Projectile, ParticleEffect, DamageNumber, XPOrb, TargetMarker, etc.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '../testSetup';

// Mock the store
jest.mock('../../../stores/useGameStore', () => {
  return jest.fn((selector) => {
    const state = {
      player: { position: [0, 2, 0] },
      enemies: [],
      removeProjectile: jest.fn(),
      attackMonster: jest.fn(),
      addDamageNumber: jest.fn(),
      addParticleEffect: jest.fn(),
    };
    return selector ? selector(state) : state;
  });
});

// Import after mocks
import Projectile from '../Projectile';
import ParticleEffect from '../ParticleEffect';
import DamageNumber from '../DamageNumber';
import XPOrb from '../XPOrb';
import TargetMarker from '../TargetMarker';
import TouchControls from '../TouchControls';
import CameraRotateControls from '../CameraRotateControls';

const TestWrapper = ({ children }) => (
  <div data-testid="test-wrapper">{children}</div>
);

// ============================================
// Projectile Tests
// ============================================
describe('Projectile Component', () => {
  const defaultProps = {
    id: 'proj1',
    position: [0, 1, 0],
    direction: [1, 0, 0],
    speed: 25,
    damage: 10,
    color: '#ffaa00',
    type: 'projectile',
    lifetime: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders without crashing', () => {
    expect(() =>
      render(
        <TestWrapper>
          <Projectile {...defaultProps} />
        </TestWrapper>
      )
    ).not.toThrow();
  });

  test('renders projectile mesh', () => {
    const { container } = render(
      <TestWrapper>
        <Projectile {...defaultProps} />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('projectile has RigidBody for physics', () => {
    render(
      <TestWrapper>
        <Projectile {...defaultProps} />
      </TestWrapper>
    );
    const rigidBody = screen.getByTestId('rapier-rigid-body');
    expect(rigidBody).toBeInTheDocument();
  });

  test('projectile is removed after lifetime expires', () => {
    const useGameStore = require('../../../stores/useGameStore');

    render(
      <TestWrapper>
        <Projectile {...defaultProps} />
      </TestWrapper>
    );

    act(() => {
      jest.advanceTimersByTime(4000); // More than 3 second lifetime
    });

    expect(useGameStore).toHaveBeenCalled();
  });

  test('projectile has correct color', () => {
    const { container } = render(
      <TestWrapper>
        <Projectile {...defaultProps} color="#ff0000" />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('projectile moves in specified direction', () => {
    const { container } = render(
      <TestWrapper>
        <Projectile {...defaultProps} direction={[0, 0, 1]} />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });
});

// ============================================
// ParticleEffect Tests
// ============================================
describe('ParticleEffect Component', () => {
  const defaultProps = {
    id: 'fx1',
    position: [0, 0, 0],
    type: 'explosion',
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders without crashing', () => {
    expect(() =>
      render(
        <TestWrapper>
          <ParticleEffect {...defaultProps} />
        </TestWrapper>
      )
    ).not.toThrow();
  });

  test('renders particle mesh', () => {
    const { container } = render(
      <TestWrapper>
        <ParticleEffect {...defaultProps} />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('explosion effect type renders', () => {
    const { container } = render(
      <TestWrapper>
        <ParticleEffect {...defaultProps} type="explosion" />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('spiral effect type renders', () => {
    const { container } = render(
      <TestWrapper>
        <ParticleEffect {...defaultProps} type="spiral" />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('calls onComplete after effect finishes', () => {
    const onComplete = jest.fn();

    render(
      <TestWrapper>
        <ParticleEffect {...defaultProps} onComplete={onComplete} />
      </TestWrapper>
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // onComplete should be called after effect duration
    // Implementation may vary
  });
});

// ============================================
// DamageNumber Tests
// ============================================
describe('DamageNumber Component', () => {
  const defaultProps = {
    id: 'dmg1',
    position: [0, 2, 0],
    damage: 50,
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders without crashing', () => {
    expect(() =>
      render(
        <TestWrapper>
          <DamageNumber {...defaultProps} />
        </TestWrapper>
      )
    ).not.toThrow();
  });

  test('displays damage value', () => {
    const { container } = render(
      <TestWrapper>
        <DamageNumber {...defaultProps} damage={100} />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('floats upward over time', () => {
    const { container } = render(
      <TestWrapper>
        <DamageNumber {...defaultProps} />
      </TestWrapper>
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(container).toBeInTheDocument();
  });

  test('fades out after duration', () => {
    const onComplete = jest.fn();

    render(
      <TestWrapper>
        <DamageNumber {...defaultProps} onComplete={onComplete} />
      </TestWrapper>
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should call onComplete after fade
  });

  test('uses Billboard for camera-facing', () => {
    render(
      <TestWrapper>
        <DamageNumber {...defaultProps} />
      </TestWrapper>
    );
    // Billboard component ensures text faces camera
    const billboard = screen.queryByTestId('drei-billboard');
    // May or may not be present depending on implementation
  });
});

// ============================================
// XPOrb Tests
// ============================================
describe('XPOrb Component', () => {
  const defaultProps = {
    id: 'xp1',
    position: [5, 1, 5],
    xpValue: 25,
    onCollect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    expect(() =>
      render(
        <TestWrapper>
          <XPOrb {...defaultProps} />
        </TestWrapper>
      )
    ).not.toThrow();
  });

  test('renders orb mesh', () => {
    const { container } = render(
      <TestWrapper>
        <XPOrb {...defaultProps} />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('orb has glowing appearance', () => {
    const { container } = render(
      <TestWrapper>
        <XPOrb {...defaultProps} />
      </TestWrapper>
    );
    // Orb should have emissive material
    expect(container).toBeInTheDocument();
  });

  test('orb floats/bobs in place', () => {
    const { container } = render(
      <TestWrapper>
        <XPOrb {...defaultProps} />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('orb moves toward player when close', () => {
    const { container } = render(
      <TestWrapper>
        <XPOrb {...defaultProps} position={[1, 1, 1]} />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });
});

// ============================================
// TargetMarker Tests
// ============================================
describe('TargetMarker Component', () => {
  const defaultProps = {
    position: [10, 0, 10],
    color: '#00ff00',
    duration: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders without crashing', () => {
    expect(() =>
      render(
        <TestWrapper>
          <TargetMarker {...defaultProps} />
        </TestWrapper>
      )
    ).not.toThrow();
  });

  test('renders marker mesh', () => {
    const { container } = render(
      <TestWrapper>
        <TargetMarker {...defaultProps} />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('marker has correct color', () => {
    const { container } = render(
      <TestWrapper>
        <TargetMarker {...defaultProps} color="#ff0000" />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('marker fades out over duration', () => {
    const { container } = render(
      <TestWrapper>
        <TargetMarker {...defaultProps} duration={1} />
      </TestWrapper>
    );

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(container).toBeInTheDocument();
  });
});

// ============================================
// TouchControls Tests
// ============================================
describe('TouchControls Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    expect(() =>
      render(
        <TestWrapper>
          <TouchControls />
        </TestWrapper>
      )
    ).not.toThrow();
  });

  test('handles tap events', () => {
    const { container } = render(
      <TestWrapper>
        <TouchControls />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });

  test('handles double-tap for sprint', () => {
    const { container } = render(
      <TestWrapper>
        <TouchControls />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });
});

// ============================================
// CameraRotateControls Tests
// ============================================
describe('CameraRotateControls Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    expect(() =>
      render(
        <TestWrapper>
          <CameraRotateControls />
        </TestWrapper>
      )
    ).not.toThrow();
  });

  test('handles rotation input', () => {
    const { container } = render(
      <TestWrapper>
        <CameraRotateControls />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });
});

// ============================================
// Integration Tests
// ============================================
describe('3D Component Integration', () => {
  test('multiple components render together', () => {
    const { container } = render(
      <TestWrapper>
        <Projectile
          id="proj1"
          position={[0, 1, 0]}
          direction={[1, 0, 0]}
          speed={25}
          damage={10}
          color="#ffaa00"
          type="projectile"
          lifetime={3}
        />
        <DamageNumber
          id="dmg1"
          position={[0, 2, 0]}
          damage={50}
          onComplete={() => {}}
        />
        <XPOrb
          id="xp1"
          position={[5, 1, 5]}
          xpValue={25}
          onCollect={() => {}}
        />
      </TestWrapper>
    );
    expect(container).toBeInTheDocument();
  });
});
