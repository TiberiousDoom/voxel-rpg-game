/**
 * Shared Vitest setup for 3D component tests.
 *
 * Replaces @react-three/* (WebGL, WASM physics) with the DOM-based mocks in
 * src/__mocks__ so components can render under jsdom. Import this module first
 * in a test file: vi.mock calls are hoisted and apply to later imports.
 */
vi.mock('@react-three/fiber', () => import('../../__mocks__/@react-three/fiber.jsx'));
vi.mock('@react-three/drei', () => import('../../__mocks__/@react-three/drei.jsx'));
vi.mock('@react-three/rapier', () => import('../../__mocks__/@react-three/rapier.jsx'));

// jsdom has no Web Workers; the chunk system creates a pool on mount
if (typeof globalThis.Worker === 'undefined') {
  globalThis.Worker = class MockWorker {
    constructor() {
      this.onmessage = null;
      this.onerror = null;
    }
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  };
}
