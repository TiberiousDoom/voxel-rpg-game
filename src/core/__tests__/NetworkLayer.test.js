/**
 * NetworkLayer.test.js — Tests for the multiplayer abstraction layer.
 */

import { NetworkLayer, LocalNetworkLayer } from '../NetworkLayer';

// Mock useGameStore
const mockState = {
  gameState: 'playing',
  testAction: jest.fn(),
};

let subscribeCallback = null;
jest.mock('../../stores/useGameStore', () => ({
  __esModule: true,
  default: {
    getState: () => mockState,
    subscribe: (cb) => {
      subscribeCallback = cb;
      return () => { subscribeCallback = null; };
    },
  },
}));

describe('NetworkLayer (abstract)', () => {
  test('isAuthority returns false', () => {
    const layer = new NetworkLayer();
    expect(layer.isAuthority()).toBe(false);
  });

  test('submitAction returns error', () => {
    const layer = new NetworkLayer();
    expect(layer.submitAction({ type: 'test' })).toEqual({
      success: false,
      error: 'Not implemented',
    });
  });

  test('getState returns empty object', () => {
    const layer = new NetworkLayer();
    expect(layer.getState()).toEqual({});
  });

  test('onStateUpdate returns unsubscribe function', () => {
    const layer = new NetworkLayer();
    const unsub = layer.onStateUpdate(() => {});
    expect(typeof unsub).toBe('function');
  });
});

describe('LocalNetworkLayer', () => {
  let layer;

  beforeEach(() => {
    jest.clearAllMocks();
    subscribeCallback = null;
    layer = new LocalNetworkLayer();
  });

  afterEach(() => {
    layer.disconnect();
  });

  test('isAuthority returns true (single-player is always authority)', () => {
    expect(layer.isAuthority()).toBe(true);
  });

  test('submitAction calls matching store action', () => {
    const result = layer.submitAction({ type: 'testAction', payload: 42 });
    expect(result.success).toBe(true);
    expect(mockState.testAction).toHaveBeenCalledWith(42);
  });

  test('submitAction succeeds for unknown action types', () => {
    const result = layer.submitAction({ type: 'unknownAction', payload: {} });
    expect(result.success).toBe(true);
  });

  test('submitAction rejects null/missing type', () => {
    expect(layer.submitAction(null).success).toBe(false);
    expect(layer.submitAction({}).success).toBe(false);
  });

  test('getState returns current store state', () => {
    const state = layer.getState();
    expect(state.gameState).toBe('playing');
  });

  test('onStateUpdate subscribes to store changes', () => {
    const listener = jest.fn();
    layer.onStateUpdate(listener);

    // Simulate store change
    expect(subscribeCallback).not.toBeNull();
    subscribeCallback({ gameState: 'paused' });

    expect(listener).toHaveBeenCalledWith({ gameState: 'paused' });
  });

  test('onStateUpdate unsubscribe removes listener', () => {
    const listener = jest.fn();
    const unsub = layer.onStateUpdate(listener);
    unsub();

    // Store subscription should be cleaned up (no more listeners)
    expect(subscribeCallback).toBeNull();
  });

  test('disconnect cleans up all listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    layer.onStateUpdate(listener1);
    layer.onStateUpdate(listener2);

    layer.disconnect();

    expect(subscribeCallback).toBeNull();
  });

  test('connect is a no-op (does not throw)', () => {
    expect(() => layer.connect()).not.toThrow();
  });
});
