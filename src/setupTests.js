// Vitest test setup — custom matchers, polyfills, and global mocks
import '@testing-library/jest-dom/vitest';

// Enable Immer MapSet plugin for Zustand stores
import { enableMapSet } from 'immer';
// Mock IndexedDB for all tests
import 'fake-indexeddb/auto';

enableMapSet();

// Alias jest → vi for backwards compatibility with existing test files
// (vitest globals mode provides vi.fn, vi.mock, etc. but not jest.fn)
if (typeof globalThis.jest === 'undefined' && typeof globalThis.vi !== 'undefined') {
  globalThis.jest = globalThis.vi;
}

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 16);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock performance.now if not available
if (!global.performance) {
  global.performance = {};
}

if (!global.performance.now) {
  global.performance.now = () => Date.now();
}

// Mock TextEncoder and TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = await import('node:util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock crypto.subtle for Web Crypto API in Node.js
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = await import('node:crypto');
  global.crypto = webcrypto;
}

// Suppress console warnings in tests unless explicitly testing for them
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = vi.fn((...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      if (message.includes('Warning: ReactDOM.render')) return;
      if (message.includes('Not implemented: HTMLFormElement.prototype.submit')) return;
    }
    originalWarn(...args);
  });

  console.error = vi.fn((...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      if (message.includes('Warning: ReactDOM.render')) return;
      if (message.includes('Not implemented: HTMLFormElement.prototype.submit')) return;
    }
    originalError(...args);
  });
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Mock HTMLCanvasElement.getContext for JSDOM (which returns null for '2d').
// This must be in beforeEach so it survives vi.clearAllMocks() in afterEach.
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(function () {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: [] })),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      strokeRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createPattern: vi.fn(),
      ellipse: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      isPointInPath: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      canvas: this,
    };
  });
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});
