/**
 * 3D Component Test Setup
 * Sets up mocks for React Three Fiber, Drei, Rapier, and Three.js
 *
 * Import this file at the top of test files before other imports:
 * import '../testSetup';
 */
import { vi } from 'vitest';

// Mock modules — vitest auto-loads matching files from src/__mocks__/
vi.mock('@react-three/fiber');
vi.mock('@react-three/drei');
vi.mock('@react-three/rapier');
vi.mock('three');

// Mock useChunkSystem to avoid import.meta.url syntax error in Jest.
// Uses regular functions (not vi.fn) so CRA's resetMocks: true doesn't
// strip the implementation between tests.
vi.mock('../../hooks/useChunkSystem', () => {
  const mockReturn = () => ({
    isReady: false,
    chunkManager: null,
    workerPool: null,
    updatePlayerPosition: () => {},
    chunks: new Map(),
    getBlock: () => 0,
    setBlock: () => {},
    ready: false,
  });
  return {
    useChunkSystem: mockReturn,
    __esModule: true,
    default: mockReturn,
  };
});

// Mock window properties that Three.js might access
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock WebGL context
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
      return {
        getExtension: vi.fn(),
        getParameter: vi.fn(() => 16384),
        createShader: vi.fn(() => ({})),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        createProgram: vi.fn(() => ({})),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => true),
        useProgram: vi.fn(),
        createBuffer: vi.fn(() => ({})),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        drawArrays: vi.fn(),
        viewport: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        blendFunc: vi.fn(),
        getUniformLocation: vi.fn(() => ({})),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniformMatrix4fv: vi.fn(),
      };
    }
    return null;
  });
}

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  // Filter out React Three Fiber warnings
  if (args[0]?.includes?.('THREE') || args[0]?.includes?.('R3F')) {
    return;
  }
  originalWarn(...args);
};
