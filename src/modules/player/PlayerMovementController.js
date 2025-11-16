/**
 * PlayerMovementController.js
 * Handles player movement input and updates player velocity
 */

import { useEffect, useCallback, useRef } from 'react';

/**
 * Movement controller for player entity
 */
export class PlayerMovementController {
  constructor(player) {
    this.player = player;
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      arrowUp: false,
      arrowDown: false,
      arrowLeft: false,
      arrowRight: false,
      shift: false,
    };
  }

  /**
   * Handle key down event
   */
  handleKeyDown(event) {
    const key = event.key.toLowerCase();

    switch (key) {
      case 'w':
        this.keys.w = true;
        break;
      case 'a':
        this.keys.a = true;
        break;
      case 's':
        this.keys.s = true;
        break;
      case 'd':
        this.keys.d = true;
        break;
      case 'arrowup':
        this.keys.arrowUp = true;
        break;
      case 'arrowdown':
        this.keys.arrowDown = true;
        break;
      case 'arrowleft':
        this.keys.arrowLeft = true;
        break;
      case 'arrowright':
        this.keys.arrowRight = true;
        break;
      case 'shift':
        this.keys.shift = true;
        this.player.setSprinting(true);
        break;
      default:
        // Ignore other keys
        return;
    }

    this.updateVelocity();
  }

  /**
   * Handle key up event
   */
  handleKeyUp(event) {
    const key = event.key.toLowerCase();

    switch (key) {
      case 'w':
        this.keys.w = false;
        break;
      case 'a':
        this.keys.a = false;
        break;
      case 's':
        this.keys.s = false;
        break;
      case 'd':
        this.keys.d = false;
        break;
      case 'arrowup':
        this.keys.arrowUp = false;
        break;
      case 'arrowdown':
        this.keys.arrowDown = false;
        break;
      case 'arrowleft':
        this.keys.arrowLeft = false;
        break;
      case 'arrowright':
        this.keys.arrowRight = false;
        break;
      case 'shift':
        this.keys.shift = false;
        this.player.setSprinting(false);
        break;
      default:
        // Ignore other keys
        return;
    }

    this.updateVelocity();
  }

  /**
   * Update player velocity based on current key states
   */
  updateVelocity() {
    let x = 0;
    let z = 0;

    // WASD controls
    if (this.keys.w || this.keys.arrowUp) z -= 1;
    if (this.keys.s || this.keys.arrowDown) z += 1;
    if (this.keys.a || this.keys.arrowLeft) x -= 1;
    if (this.keys.d || this.keys.arrowRight) x += 1;

    // Clear tap-to-move target when using keyboard
    if (x !== 0 || z !== 0) {
      this.player.clearTarget();
    }

    this.player.setVelocity(x, z);
  }

  /**
   * Cleanup - stop all movement
   */
  cleanup() {
    this.player.setVelocity(0, 0);
    this.player.setSprinting(false);
  }
}

/**
 * React hook for player movement controller
 * @param {PlayerEntity} player - Player entity to control
 * @param {boolean} enabled - Whether controls are enabled
 */
export function usePlayerMovement(player, enabled = true) {
  const controllerRef = useRef(null);

  // Initialize controller
  useEffect(() => {
    if (!player) return;

    controllerRef.current = new PlayerMovementController(player);

    return () => {
      if (controllerRef.current) {
        controllerRef.current.cleanup();
      }
    };
  }, [player]);

  // Handle key down
  const handleKeyDown = useCallback((event) => {
    if (!enabled || !controllerRef.current) return;

    // Don't interfere with text inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    controllerRef.current.handleKeyDown(event);
  }, [enabled]);

  // Handle key up
  const handleKeyUp = useCallback((event) => {
    if (!enabled || !controllerRef.current) return;

    // Don't interfere with text inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    controllerRef.current.handleKeyUp(event);
  }, [enabled]);

  // Add event listeners
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  return {
    controller: controllerRef.current
  };
}

/**
 * Create a movement controller (non-React usage)
 */
export function createMovementController(player) {
  return new PlayerMovementController(player);
}
