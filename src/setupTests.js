// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Enable Immer MapSet plugin for Zustand stores
import { enableMapSet } from 'immer';
// Mock IndexedDB for all tests
import 'fake-indexeddb/auto';

enableMapSet();

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
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock crypto.subtle for Web Crypto API in Node.js
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;
}

// Suppress console warnings in tests unless explicitly testing for them
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn((...args) => {
    // Only show warnings that aren't expected
    const message = args[0];
    if (typeof message === 'string') {
      if (message.includes('Warning: ReactDOM.render')) return;
      if (message.includes('Not implemented: HTMLFormElement.prototype.submit')) return;
    }
    originalWarn(...args);
  });

  console.error = jest.fn((...args) => {
    // Only show errors that aren't expected
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
// This must be in beforeEach so it survives jest.clearAllMocks() in afterEach.
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(function () {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: [] })),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      strokeRect: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      createPattern: jest.fn(),
      ellipse: jest.fn(),
      quadraticCurveTo: jest.fn(),
      bezierCurveTo: jest.fn(),
      isPointInPath: jest.fn(),
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
  jest.clearAllMocks();
  jest.clearAllTimers();
});
