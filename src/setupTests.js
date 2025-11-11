// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock IndexedDB for all tests
import 'fake-indexeddb/auto';

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

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});
