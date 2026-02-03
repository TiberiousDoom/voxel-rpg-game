/**
 * Mock for @react-three/rapier
 * Provides mock implementations for physics components
 */
import React from 'react';

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
      translation: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
      setTranslation: jest.fn(),
      linvel: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
      setLinvel: jest.fn(),
      applyImpulse: jest.fn(),
      applyForce: jest.fn(),
      setGravityScale: jest.fn(),
      lockRotations: jest.fn(),
      setEnabledRotations: jest.fn(),
      rotation: jest.fn(() => ({ x: 0, y: 0, z: 0, w: 1 })),
      setRotation: jest.fn(),
      resetForces: jest.fn(),
      resetTorques: jest.fn(),
      mass: jest.fn(() => 1),
      setMass: jest.fn(),
      isSleeping: jest.fn(() => false),
      wakeUp: jest.fn(),
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
export const useRapier = jest.fn(() => ({
  world: {
    gravity: { x: 0, y: -9.81, z: 0 },
    timestep: 1 / 60,
    step: jest.fn(),
    createRigidBody: jest.fn(),
    removeRigidBody: jest.fn(),
    createCollider: jest.fn(),
    removeCollider: jest.fn(),
    castRay: jest.fn(() => null),
    intersectionsWithRay: jest.fn(() => []),
  },
  rapier: {
    RigidBodyDesc: {
      dynamic: jest.fn(() => ({})),
      fixed: jest.fn(() => ({})),
      kinematicPositionBased: jest.fn(() => ({})),
    },
    ColliderDesc: {
      cuboid: jest.fn(() => ({})),
      ball: jest.fn(() => ({})),
      capsule: jest.fn(() => ({})),
    },
  },
}));

// Mock vec3 helper
export const vec3 = jest.fn((v) => ({
  x: v?.x || 0,
  y: v?.y || 0,
  z: v?.z || 0,
}));

// Mock quat helper
export const quat = jest.fn((q) => ({
  x: q?.x || 0,
  y: q?.y || 0,
  z: q?.z || 0,
  w: q?.w || 1,
}));

// Mock interactionGroups
export const interactionGroups = jest.fn(() => 0xffffffff);

// Mock collision event types
export const CollisionEnterHandler = jest.fn();
export const CollisionExitHandler = jest.fn();
export const IntersectionEnterHandler = jest.fn();
export const IntersectionExitHandler = jest.fn();

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
