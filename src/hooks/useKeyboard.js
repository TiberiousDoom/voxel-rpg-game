import { useEffect, useRef } from 'react';
import useGameStore from '../stores/useGameStore';

// Key mapping for game controls
const KEYMAP = {
  KeyW: 'forward',
  KeyS: 'backward',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'jump',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Digit1: 'spell1',
  Digit2: 'spell2',
  Digit3: 'spell3',
  Digit4: 'spell4',
  Digit5: 'spell5',
  Digit6: 'spell6',
  Digit0: 'spell0',
  KeyI: 'inventory',
  KeyC: 'crafting',
  KeyK: 'skills',
  KeyB: 'base',
  KeyM: 'map',
  Escape: 'menu',
  KeyE: 'use',
  KeyH: 'potion',
  AltLeft: 'block',
  AltRight: 'block',
};

// Keys that fire a toggle action on keydown (not held state)
const TOGGLE_KEYS = {
  Tab: 'buildMode',
  KeyZ: 'zoneMode',
};

// Shared mutable key state — updated synchronously in event handlers,
// read directly in useFrame (no React render cycle delay).
const _keys = {};

/**
 * Set a virtual key state from on-screen buttons (mobile action buttons).
 * @param {string} action - Key action name (e.g., 'jump', 'run', 'use')
 * @param {boolean} pressed - Whether the key is currently pressed
 */
export function setVirtualKey(action, pressed) {
  _keys[action] = pressed;
}

/**
 * Hook for handling keyboard input in 3D game.
 * Returns a mutable ref whose .current is updated synchronously on key events.
 * Read it inside useFrame for zero-latency input.
 */
export function useKeyboard() {
  const keysRef = useRef(_keys);

  useEffect(() => {
    const onKeyDown = (e) => {
      // Toggle keys fire a store action once on keydown
      const toggle = TOGGLE_KEYS[e.code];
      if (toggle) {
        e.preventDefault();
        if (toggle === 'buildMode') {
          const store = useGameStore.getState();
          if (store.zoneMode) store.setZoneMode(false);
          store.toggleBuildMode();
        }
        if (toggle === 'zoneMode') {
          const store = useGameStore.getState();
          if (store.zoneMode) {
            store.setZoneMode(false);
          } else {
            if (store.buildMode) store.setBuildMode(false);
            store.setZoneMode(true, 'MINING');
          }
        }
        return;
      }

      const action = KEYMAP[e.code];
      if (action) {
        e.preventDefault();
        _keys[action] = true;
      }
    };

    const onKeyUp = (e) => {
      const action = KEYMAP[e.code];
      if (action) {
        e.preventDefault();
        _keys[action] = false;
      }
    };

    // Reset all keys when window loses focus (prevents stuck keys from Alt+Tab etc.)
    const onBlur = () => {
      for (const key in _keys) {
        _keys[key] = false;
      }
    };

    // Add event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return keysRef.current;
}
