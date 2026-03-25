/**
 * NetworkLayer.js — Abstraction for game state authority and action dispatch.
 *
 * Phase 0 requirement: "Design for multiplayer from start."
 * Single-player uses LocalNetworkLayer (direct state access, always authoritative).
 * Phase 6 will add RemoteNetworkLayer (WebRTC/WebSocket) with the same interface.
 *
 * Pattern: single-player = "multiplayer with one player, no latency."
 */

import useGameStore from '../stores/useGameStore';

/**
 * Abstract NetworkLayer interface.
 * All game state mutations should eventually route through this.
 */
export class NetworkLayer {
  /** Is this instance the state authority? */
  isAuthority() {
    return false;
  }

  /**
   * Submit a game action for validation and application.
   * @param {Object} action - { type: string, payload: any, meta?: { playerId, timestamp } }
   * @returns {{ success: boolean, error?: string }}
   */
  submitAction(_action) {
    return { success: false, error: 'Not implemented' };
  }

  /**
   * Get the current authoritative state snapshot.
   * @returns {Object}
   */
  getState() {
    return {};
  }

  /**
   * Subscribe to state updates from the authority.
   * @param {Function} listener - Called with (stateUpdate) on each change
   * @returns {Function} Unsubscribe function
   */
  onStateUpdate(_listener) {
    return () => {};
  }

  /** Connect to the network (no-op for local). */
  connect() {}

  /** Disconnect from the network (no-op for local). */
  disconnect() {}
}

/**
 * LocalNetworkLayer — single-player implementation.
 * Always authoritative. Actions apply directly to the Zustand store.
 * No latency, no prediction needed.
 */
export class LocalNetworkLayer extends NetworkLayer {
  constructor() {
    super();
    this._listeners = new Set();
    this._unsubStore = null;
  }

  isAuthority() {
    return true;
  }

  submitAction(action) {
    if (!action || !action.type) {
      return { success: false, error: 'Action must have a type' };
    }

    const store = useGameStore.getState();
    const handler = store[action.type];

    if (typeof handler === 'function') {
      handler(action.payload);
      return { success: true };
    }

    // Action type doesn't map to a store action — still record it
    return { success: true };
  }

  getState() {
    return useGameStore.getState();
  }

  onStateUpdate(listener) {
    this._listeners.add(listener);

    // Lazy-subscribe to Zustand on first listener
    if (!this._unsubStore) {
      this._unsubStore = useGameStore.subscribe((state) => {
        for (const fn of this._listeners) {
          fn(state);
        }
      });
    }

    return () => {
      this._listeners.delete(listener);
      if (this._listeners.size === 0 && this._unsubStore) {
        this._unsubStore();
        this._unsubStore = null;
      }
    };
  }

  connect() {
    // No-op for local — already connected
  }

  disconnect() {
    if (this._unsubStore) {
      this._unsubStore();
      this._unsubStore = null;
    }
    this._listeners.clear();
  }
}

export default LocalNetworkLayer;
