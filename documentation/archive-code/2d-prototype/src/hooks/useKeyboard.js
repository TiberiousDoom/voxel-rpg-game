import { useEffect, useState } from 'react';

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
  KeyQ: 'spellQ',
  KeyE: 'spellE',
  KeyR: 'spellR',
  KeyF: 'spellF',
  KeyT: 'spellT',
  KeyI: 'inventory',
  KeyC: 'crafting',
  KeyK: 'skills',
  KeyB: 'base',
  KeyM: 'map',
  Escape: 'menu',
  KeyP: 'potion',
  AltLeft: 'block',
  AltRight: 'block',
};

/**
 * Hook for handling keyboard input in 3D game
 * @returns {Object} Object with boolean values for each action
 */
export function useKeyboard() {
  const [keys, setKeys] = useState({});

  useEffect(() => {
    const onKeyDown = (e) => {
      const action = KEYMAP[e.code];
      if (action) {
        e.preventDefault();
        setKeys((prev) => ({ ...prev, [action]: true }));
      }
    };

    const onKeyUp = (e) => {
      const action = KEYMAP[e.code];
      if (action) {
        e.preventDefault();
        setKeys((prev) => ({ ...prev, [action]: false }));
      }
    };

    // Add event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return keys;
}

/**
 * Hook for getting movement direction from keyboard input
 * @returns {[number, number, number]} [x, y, z] direction vector
 */
export function useMovementKeys() {
  const keys = useKeyboard();

  const direction = [0, 0, 0];

  if (keys.forward) direction[2] -= 1;
  if (keys.backward) direction[2] += 1;
  if (keys.left) direction[0] -= 1;
  if (keys.right) direction[0] += 1;

  return direction;
}
