/**
 * Test Utilities
 * Shared helpers and utilities for testing
 */

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<void>}
 */
export async function waitFor(condition, timeout = 5000, interval = 50) {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout exceeded');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Create a mock event emitter callback
 * @returns {jest.Mock & {calls: Array, lastCall: any}}
 */
export function createMockCallback() {
  const mock = jest.fn();
  mock.calls = [];
  mock.lastCall = null;

  const wrappedMock = (...args) => {
    mock.calls.push(args);
    mock.lastCall = args;
    return mock(...args);
  };

  Object.assign(wrappedMock, mock);
  return wrappedMock;
}

/**
 * Create a test building
 * @param {Object} overrides - Override default properties
 * @returns {Object}
 */
export function createTestBuilding(overrides = {}) {
  return {
    id: `building-${Math.random().toString(36).substr(2, 9)}`,
    type: 'FARM',
    position: { x: 5, y: 0, z: 5 },
    active: true,
    ...overrides
  };
}

/**
 * Create a test NPC
 * @param {Object} overrides - Override default properties
 * @returns {Object}
 */
export function createTestNPC(overrides = {}) {
  return {
    id: `npc-${Math.random().toString(36).substr(2, 9)}`,
    position: { x: 3, y: 0, z: 3 },
    alive: true,
    health: 100,
    happiness: 80,
    ...overrides
  };
}

/**
 * Create test game state
 * @param {Object} overrides - Override default properties
 * @returns {Object}
 */
export function createTestGameState(overrides = {}) {
  return {
    buildings: [],
    npcs: [],
    resources: {
      food: 100,
      wood: 50,
      stone: 25,
      gold: 10
    },
    tick: 0,
    ...overrides
  };
}

/**
 * Mock requestAnimationFrame for testing
 */
export function mockAnimationFrame() {
  let callbacks = [];
  let frameId = 0;

  global.requestAnimationFrame = jest.fn((callback) => {
    const id = ++frameId;
    callbacks.push({ id, callback });
    return id;
  });

  global.cancelAnimationFrame = jest.fn((id) => {
    callbacks = callbacks.filter(cb => cb.id !== id);
  });

  const tick = () => {
    const currentCallbacks = [...callbacks];
    callbacks = [];
    currentCallbacks.forEach(({ callback }) => callback(performance.now()));
  };

  return { tick, reset: () => { callbacks = []; frameId = 0; } };
}

/**
 * Mock performance.now() for consistent timing tests
 */
export function mockPerformanceNow() {
  let now = 0;

  const originalNow = performance.now.bind(performance);

  performance.now = jest.fn(() => now);

  const advance = (ms) => {
    now += ms;
  };

  const reset = () => {
    now = 0;
    performance.now = originalNow;
  };

  return { advance, reset, get: () => now };
}

/**
 * Suppress console warnings/errors in tests
 * @param {Function} fn - Test function
 */
export async function suppressConsole(fn) {
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = jest.fn();
  console.error = jest.fn();

  try {
    await fn();
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
}

/**
 * Measure execution time
 * @param {Function} fn - Function to measure
 * @returns {Promise<{result: any, duration: number}>}
 */
export async function measureTime(fn) {
  const startTime = performance.now();
  const result = await fn();
  const duration = performance.now() - startTime;

  return { result, duration };
}

/**
 * Create a test position
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {{x: number, y: number, z: number}}
 */
export function createPosition(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

/**
 * Assert that a function throws an error
 * @param {Function} fn - Function that should throw
 * @param {string|RegExp} errorMatch - Expected error message pattern
 */
export async function expectToThrow(fn, errorMatch) {
  let error = null;

  try {
    await fn();
  } catch (e) {
    error = e;
  }

  if (!error) {
    throw new Error('Expected function to throw an error');
  }

  if (errorMatch) {
    if (typeof errorMatch === 'string') {
      if (!error.message.includes(errorMatch)) {
        throw new Error(`Expected error message to include "${errorMatch}", got "${error.message}"`);
      }
    } else if (errorMatch instanceof RegExp) {
      if (!errorMatch.test(error.message)) {
        throw new Error(`Expected error message to match ${errorMatch}, got "${error.message}"`);
      }
    }
  }
}

/**
 * Create a spy on an object method
 * @param {Object} obj
 * @param {string} method
 * @returns {jest.SpyInstance}
 */
export function spyOn(obj, method) {
  const spy = jest.spyOn(obj, method);
  return spy;
}
