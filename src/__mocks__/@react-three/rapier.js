/**
 * Mock for @react-three/rapier
 * Provides mock implementations for physics components
 */
import React from 'react';
import { vi } from 'vitest';

// Mock Physics context
export const Physics = ({ children, ...props }) => (
  <div data-testid="rapier-physics" {...props}>
    {children}
  </div>
);

// Mock RigidBody component
export const RigidBody = React.forwardRef(({ children, ...props }, ref) => {
  const mockRef = {
    current: {
      translation: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
      setTranslation: vi.fn(),
      linvel: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
      setLinvel: vi.fn(),
      applyImpulse: vi.fn(),
      applyForce: vi.fn(),
      setGravityScale: vi.fn(),
      lockRotations: vi.fn(),
      setEnabledRotations: vi.fn(),
      rotation: vi.fn(() => ({ x: 0, y: 0, z: 0, w: 1 })),
      setRotation: vi.fn(),
      resetForces: vi.fn(),
      resetTorques: vi.fn(),
      mass: vi.fn(() => 1),
      setMass: vi.fn(),
      isSleeping: vi.fn(() => false),
      wakeUp: vi.fn(),
    },
  };

  // Allow external ref to access mock methods
  if (ref) {
    if (typeof ref === 'function') {
      ref(mockRef.current);
    } else {
      ref.current = mockRef.current;
    }
  }

  return (
    <group data-testid="rapier-rigid-body" {...props}>
      {children}
    </group>
  );
});

RigidBody.displayName = 'RigidBody';

// Mock CuboidCollider
export const CuboidCollider = (props) => (
  <div data-testid="rapier-cuboid-collider" {...props} />
);

// Mock BallCollider
export const BallCollider = (props) => (
  <div data-testid="rapier-ball-collider" {...props} />
);

// Mock CapsuleCollider
export const CapsuleCollider = (props) => (
  <div data-testid="rapier-capsule-collider" {...props} />
);

// Mock useRapier hook
export const useRapier = vi.fn(() => ({
  world: {
    gravity: { x: 0, y: -9.81, z: 0 },
    timestep: 1 / 60,
    step: vi.fn(),
    createRigidBody: vi.fn(),
    removeRigidBody: vi.fn(),
    createCollider: vi.fn(),
    removeCollider: vi.fn(),
    castRay: vi.fn(() => null),
    intersectionsWithRay: vi.fn(() => []),
  },
  rapier: {
    RigidBodyDesc: {
      dynamic: vi.fn(() => ({})),
      fixed: vi.fn(() => ({})),
      kinematicPositionBased: vi.fn(() => ({})),
    },
    ColliderDesc: {
      cuboid: vi.fn(() => ({})),
      ball: vi.fn(() => ({})),
      capsule: vi.fn(() => ({})),
    },
  },
}));

// Mock vec3 helper
export const vec3 = vi.fn((v) => ({
  x: v?.x || 0,
  y: v?.y || 0,
  z: v?.z || 0,
}));

// Mock quat helper
export const quat = vi.fn((q) => ({
  x: q?.x || 0,
  y: q?.y || 0,
  z: q?.z || 0,
  w: q?.w || 1,
}));

// Mock interactionGroups
export const interactionGroups = vi.fn(() => 0xffffffff);

// Mock collision event types
export const CollisionEnterHandler = vi.fn();
export const CollisionExitHandler = vi.fn();
export const IntersectionEnterHandler = vi.fn();
export const IntersectionExitHandler = vi.fn();

// Default export
export default {
  Physics,
  RigidBody,
  CuboidCollider,
  BallCollider,
  CapsuleCollider,
  useRapier,
  vec3,
  quat,
  interactionGroups,
};
