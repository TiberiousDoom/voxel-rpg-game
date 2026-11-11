/**
 * Mock for @react-three/fiber
 * Provides mock implementations for testing 3D components
 */
import React from 'react';
import * as THREE from 'three';

// Mock Canvas component
export const Canvas = ({ children, shadows, ...props }) => (
  <div data-testid="r3f-canvas" {...(shadows ? { shadows: '' } : {})} {...props}>
    {children}
  </div>
);

// Mock useFrame hook: registers the callback so tests can step frames with
// advanceFrames(). Callbacks are not run automatically.
const frameCallbacks = new Set();

export const useFrame = vi.fn((callback) => {
  const ref = React.useRef(callback);
  ref.current = callback;
  React.useEffect(() => {
    const fn = (state, delta) => ref.current(state, delta);
    frameCallbacks.add(fn);
    return () => frameCallbacks.delete(fn);
  }, []);
});

/**
 * Run all mounted useFrame callbacks `count` times.
 * @param {number} count
 * @param {number} delta - seconds per frame
 */
export function advanceFrames(count = 1, delta = 1 / 60) {
  const state = {
    clock: { elapsedTime: 0 },
    scene: { traverse: () => {} },
    camera: mockCamera,
  };
  for (let i = 0; i < count; i++) {
    state.clock.elapsedTime += delta;
    for (const fn of [...frameCallbacks]) fn(state, delta);
  }
}

// Create a mock canvas element safely
const createMockCanvas = () => {
  if (typeof document !== 'undefined') {
    return document.createElement('canvas');
  }
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: {},
  };
};

// A real camera so components can use getWorldDirection, position.lerp, etc.
const mockCamera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 1000);
mockCamera.position.set(0, 15, 20);

// Mock useThree hook - defined as a regular function (not vi.fn) so that
// CRA's resetMocks: true doesn't strip the implementation between tests.
export const useThree = (selector) => {
  const state = {
    camera: mockCamera,
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
export const extend = vi.fn();

// Mock primitive
export const primitive = 'primitive';

// Mock events
export const events = vi.fn(() => ({}));

// Default export
export default {
  Canvas,
  useFrame,
  useThree,
  extend,
  primitive,
  events,
};
