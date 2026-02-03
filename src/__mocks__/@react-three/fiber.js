/**
 * Mock for @react-three/fiber
 * Provides mock implementations for testing 3D components
 */
import React from 'react';

// Mock Canvas component
export const Canvas = ({ children, ...props }) => (
  <div data-testid="r3f-canvas" {...props}>
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

// Mock useThree hook - returns actual values, not a function
const useThreeMock = () => ({
  camera: {
    position: { x: 0, y: 15, z: 20, set: jest.fn(), copy: jest.fn() },
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn(),
  },
  scene: {
    add: jest.fn(),
    remove: jest.fn(),
  },
  gl: {
    domElement: createMockCanvas(),
    setSize: jest.fn(),
  },
  size: { width: 800, height: 600 },
  viewport: { width: 800, height: 600 },
  raycaster: {
    setFromCamera: jest.fn(),
    intersectObjects: jest.fn(() => []),
  },
  pointer: { x: 0, y: 0 },
  clock: { elapsedTime: 0 },
});

export const useThree = jest.fn(useThreeMock);

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
