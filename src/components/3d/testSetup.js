/**
 * 3D Component Test Setup
 * Sets up mocks for React Three Fiber, Drei, Rapier, and Three.js
 *
 * Import this file at the top of test files before other imports:
 * import '../testSetup';
 */

// Mock modules - Jest will automatically use files from src/__mocks__/
jest.mock('@react-three/fiber');
jest.mock('@react-three/drei');
jest.mock('@react-three/rapier');
jest.mock('three');

// Mock window properties that Three.js might access
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
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
  HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
      return {
        getExtension: jest.fn(),
        getParameter: jest.fn(() => 16384),
        createShader: jest.fn(() => ({})),
        shaderSource: jest.fn(),
        compileShader: jest.fn(),
        getShaderParameter: jest.fn(() => true),
        createProgram: jest.fn(() => ({})),
        attachShader: jest.fn(),
        linkProgram: jest.fn(),
        getProgramParameter: jest.fn(() => true),
        useProgram: jest.fn(),
        createBuffer: jest.fn(() => ({})),
        bindBuffer: jest.fn(),
        bufferData: jest.fn(),
        enableVertexAttribArray: jest.fn(),
        vertexAttribPointer: jest.fn(),
        drawArrays: jest.fn(),
        viewport: jest.fn(),
        clearColor: jest.fn(),
        clear: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        blendFunc: jest.fn(),
        getUniformLocation: jest.fn(() => ({})),
        uniform1f: jest.fn(),
        uniform2f: jest.fn(),
        uniform3f: jest.fn(),
        uniform4f: jest.fn(),
        uniformMatrix4fv: jest.fn(),
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
