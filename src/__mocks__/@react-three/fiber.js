/**
 * Mock for @react-three/fiber
 * Provides mock implementations for testing 3D components
 */
import React from 'react';

// Mock Canvas component
export const Canvas = ({ children, shadows, ...props }) => (
  <div data-testid="r3f-canvas" {...(shadows ? { shadows: '' } : {})} {...props}>
    {children}
  </div>
);

// Mock useFrame hook
export const useFrame = jest.fn((callback) => {
  // Optionally call with mock state and delta
  // callback({ clock: { elapsedTime: 0 } }, 0.016);
});

// Create a mock canvas element safely
const createMockCanvas = () => {
  if (typeof document !== 'undefined') {
    return document.createElement('canvas');
  }
  return {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: {},
  };
};

// Mock useThree hook - defined as a regular function (not jest.fn) so that
// CRA's resetMocks: true doesn't strip the implementation between tests.
export const useThree = (selector) => {
  const state = {
    camera: {
      position: { x: 0, y: 15, z: 20, set: () => {}, copy: () => {} },
      lookAt: () => {},
      updateProjectionMatrix: () => {},
    },
    scene: {
      add: () => {},
      remove: () => {},
    },
    gl: {
      domElement: createMockCanvas(),
      setSize: () => {},
    },
    size: { width: 800, height: 600 },
    viewport: { width: 800, height: 600 },
    raycaster: {
      setFromCamera: () => {},
      intersectObjects: () => [],
    },
    pointer: { x: 0, y: 0 },
    clock: { elapsedTime: 0 },
  };
  return selector ? selector(state) : state;
};

// Mock extend function
export const extend = jest.fn();

// Mock primitive
export const primitive = 'primitive';

// Mock events
export const events = jest.fn(() => ({}));

// Default export
export default {
  Canvas,
  useFrame,
  useThree,
  extend,
  primitive,
  events,
};
