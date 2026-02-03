/**
 * useKeyboardShortcuts.js - Global keyboard shortcuts handler
 *
 * Features:
 * - Global keyboard shortcut system
 * - Configurable key bindings
 * - Context-aware shortcuts (different shortcuts for different contexts)
 * - Prevent shortcuts when typing in inputs
 * - Support for modifier keys (Ctrl, Shift, Alt)
 *
 * Usage:
 * const { registerShortcut, unregisterShortcut, isEnabled } = useKeyboardShortcuts(config);
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Default keyboard shortcuts configuration
 */
export const DEFAULT_SHORTCUTS = {
  // Game controls
  PAUSE_RESUME: { key: ' ', ctrl: false, shift: false, alt: false, description: 'Pause/Resume game' },
  SAVE_GAME: { key: 's', ctrl: false, shift: false, alt: false, description: 'Save game' },
  LOAD_GAME: { key: 'l', ctrl: false, shift: false, alt: false, description: 'Load game' },

  // Building controls
  TOGGLE_BUILD_MODE: { key: 'b', ctrl: false, shift: false, alt: false, description: 'Toggle build mode' },
  DELETE_SELECTED: { key: 'Delete', ctrl: false, shift: false, alt: false, description: 'Delete selected building' },

  // Building type selection (1-8)
  SELECT_BUILDING_1: { key: '1', ctrl: false, shift: false, alt: false, description: 'Select building type 1' },
  SELECT_BUILDING_2: { key: '2', ctrl: false, shift: false, alt: false, description: 'Select building type 2' },
  SELECT_BUILDING_3: { key: '3', ctrl: false, shift: false, alt: false, description: 'Select building type 3' },
  SELECT_BUILDING_4: { key: '4', ctrl: false, shift: false, alt: false, description: 'Select building type 4' },
  SELECT_BUILDING_5: { key: '5', ctrl: false, shift: false, alt: false, description: 'Select building type 5' },
  SELECT_BUILDING_6: { key: '6', ctrl: false, shift: false, alt: false, description: 'Select building type 6' },
  SELECT_BUILDING_7: { key: '7', ctrl: false, shift: false, alt: false, description: 'Select building type 7' },
  SELECT_BUILDING_8: { key: '8', ctrl: false, shift: false, alt: false, description: 'Select building type 8' },

  // NPC controls
  SPAWN_NPC: { key: 'n', ctrl: false, shift: false, alt: false, description: 'Spawn NPC' },

  // Camera controls
  PAN_LEFT: { key: 'ArrowLeft', ctrl: false, shift: false, alt: false, description: 'Pan camera left' },
  PAN_RIGHT: { key: 'ArrowRight', ctrl: false, shift: false, alt: false, description: 'Pan camera right' },
  PAN_UP: { key: 'ArrowUp', ctrl: false, shift: false, alt: false, description: 'Pan camera up' },
  PAN_DOWN: { key: 'ArrowDown', ctrl: false, shift: false, alt: false, description: 'Pan camera down' },
  ZOOM_IN: { key: '+', ctrl: false, shift: false, alt: false, description: 'Zoom in' },
  ZOOM_OUT: { key: '-', ctrl: false, shift: false, alt: false, description: 'Zoom out' },

  // UI controls
  CLOSE_MODAL: { key: 'Escape', ctrl: false, shift: false, alt: false, description: 'Close modal/Cancel' },
  SHOW_HELP: { key: '?', ctrl: false, shift: false, alt: false, description: 'Show keyboard shortcuts help' }
};

/**
 * Elements that should ignore global keyboard shortcuts (when focused)
 */
const IGNORE_ELEMENTS = ['INPUT', 'TEXTAREA', 'SELECT'];

/**
 * Check if an element should ignore keyboard shortcuts
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function shouldIgnoreShortcuts(element) {
  if (!element) return false;

  // Ignore if typing in input/textarea/select
  if (IGNORE_ELEMENTS.includes(element.tagName)) {
    return true;
  }

  // Ignore if element is contentEditable
  if (element.isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Create a shortcut key string for matching
 * @param {KeyboardEvent} event
 * @returns {string}
 */
// eslint-disable-next-line no-unused-vars
function getShortcutKey(event) {
  const parts = [];

  if (event.ctrlKey) parts.push('Ctrl');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');

  // Normalize key
  let key = event.key;

  // Handle space specially
  if (key === ' ') {
    parts.push('Space');
  } else {
    parts.push(key);
  }

  return parts.join('+');
}

/**
 * Match a keyboard event against a shortcut config
 * @param {KeyboardEvent} event
 * @param {Object} shortcutConfig
 * @returns {boolean}
 */
function matchesShortcut(event, shortcutConfig) {
  const { key, ctrl = false, shift = false, alt = false } = shortcutConfig;

  // Check modifiers
  if (event.ctrlKey !== ctrl) return false;
  if (event.shiftKey !== shift) return false;
  if (event.altKey !== alt) return false;

  // Check key (case-insensitive)
  return event.key.toLowerCase() === key.toLowerCase();
}

/**
 * useKeyboardShortcuts - Global keyboard shortcuts hook
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.shortcuts - Custom shortcuts (overrides defaults)
 * @param {boolean} options.enabled - Enable/disable shortcuts globally (default: true)
 * @param {string} options.context - Current context for context-aware shortcuts
 * @returns {Object} Shortcut management API
 */
export function useKeyboardShortcuts(options = {}) {
  const {
    shortcuts = DEFAULT_SHORTCUTS,
    enabled = true,
    context = 'global'
  } = options;

  // Store shortcut handlers
  const handlersRef = useRef(new Map());
  const [isEnabled, setIsEnabled] = useState(enabled);

  /**
   * Register a keyboard shortcut
   * @param {string} shortcutName - Name of the shortcut (from DEFAULT_SHORTCUTS)
   * @param {Function} handler - Handler function to call
   * @param {Object} config - Optional override config for the shortcut
   */
  const registerShortcut = useCallback((shortcutName, handler, config = null) => {
    if (!handler || typeof handler !== 'function') {
      console.warn(`useKeyboardShortcuts: Handler for ${shortcutName} must be a function`);
      return;
    }

    const shortcutConfig = config || shortcuts[shortcutName];
    if (!shortcutConfig) {
      console.warn(`useKeyboardShortcuts: Unknown shortcut ${shortcutName}`);
      return;
    }

    handlersRef.current.set(shortcutName, { handler, config: shortcutConfig });
  }, [shortcuts]);

  /**
   * Unregister a keyboard shortcut
   * @param {string} shortcutName
   */
  const unregisterShortcut = useCallback((shortcutName) => {
    handlersRef.current.delete(shortcutName);
  }, []);

  /**
   * Unregister all shortcuts
   */
  const unregisterAll = useCallback(() => {
    handlersRef.current.clear();
  }, []);

  /**
   * Enable shortcuts
   */
  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  /**
   * Disable shortcuts
   */
  const disable = useCallback(() => {
    setIsEnabled(false);
  }, []);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback((event) => {
    // Don't handle shortcuts if disabled
    if (!isEnabled) return;

    // Don't handle shortcuts when typing in inputs
    if (shouldIgnoreShortcuts(document.activeElement)) {
      return;
    }

    // Check each registered shortcut
    for (const [shortcutName, { handler, config }] of handlersRef.current.entries()) {
      if (matchesShortcut(event, config)) {
        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();

        // Call handler
        handler(event, shortcutName);

        // Only handle first matching shortcut
        break;
      }
    }
  }, [isEnabled]);

  /**
   * Set up global keyboard event listener
   */
  useEffect(() => {
    if (!isEnabled) return;

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isEnabled]);

  /**
   * Update enabled state when options change
   */
  useEffect(() => {
    setIsEnabled(enabled);
  }, [enabled]);

  return {
    // Register/unregister shortcuts
    registerShortcut,
    unregisterShortcut,
    unregisterAll,

    // Enable/disable
    enable,
    disable,
    isEnabled,

    // Shortcuts config
    shortcuts,
    context
  };
}

export default useKeyboardShortcuts;
