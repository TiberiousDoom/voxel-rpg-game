/**
 * InputManager - Handles keyboard, mouse, and gamepad input
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Input System:
 * - Default bindings for keyboard and gamepad
 * - Rebindable keys
 * - Target: < 50ms input latency
 */

import type { GameSystem } from '@core/GameEngine';
import { getEventBus } from '@core/EventBus';
import type { InputAction, InputBinding, Vector2, GameTime } from '@core/types';

// ============================================================================
// Default Bindings
// ============================================================================

const DEFAULT_BINDINGS: InputBinding[] = [
  { action: 'moveUp' as InputAction, keys: ['KeyW', 'ArrowUp'] },
  { action: 'moveDown' as InputAction, keys: ['KeyS', 'ArrowDown'] },
  { action: 'moveLeft' as InputAction, keys: ['KeyA', 'ArrowLeft'] },
  { action: 'moveRight' as InputAction, keys: ['KeyD', 'ArrowRight'] },
  { action: 'sprint' as InputAction, keys: ['ShiftLeft', 'ShiftRight'] },
  { action: 'interact' as InputAction, keys: ['KeyE'] },
  { action: 'attack' as InputAction, keys: [], mouseButtons: [0] }, // Left click
  { action: 'secondary' as InputAction, keys: [], mouseButtons: [2] }, // Right click
  { action: 'cancel' as InputAction, keys: ['Escape'] },
  { action: 'inventory' as InputAction, keys: ['KeyI'] },
  { action: 'buildMenu' as InputAction, keys: ['KeyB'] },
  { action: 'pause' as InputAction, keys: ['KeyP', 'Escape'] },
  { action: 'zoomIn' as InputAction, keys: ['Equal', 'NumpadAdd'] },
  { action: 'zoomOut' as InputAction, keys: ['Minus', 'NumpadSubtract'] },
  { action: 'quickSlot1' as InputAction, keys: ['Digit1', 'Numpad1'] },
  { action: 'quickSlot2' as InputAction, keys: ['Digit2', 'Numpad2'] },
  { action: 'quickSlot3' as InputAction, keys: ['Digit3', 'Numpad3'] },
  { action: 'quickSlot4' as InputAction, keys: ['Digit4', 'Numpad4'] },
  { action: 'quickSlot5' as InputAction, keys: ['Digit5', 'Numpad5'] },
  { action: 'quickSlot6' as InputAction, keys: ['Digit6', 'Numpad6'] },
  { action: 'quickSlot7' as InputAction, keys: ['Digit7', 'Numpad7'] },
  { action: 'quickSlot8' as InputAction, keys: ['Digit8', 'Numpad8'] },
  { action: 'quickSlot9' as InputAction, keys: ['Digit9', 'Numpad9'] },
];

// ============================================================================
// InputManager Implementation
// ============================================================================

export class InputManager implements GameSystem {
  public readonly name = 'InputManager';

  private bindings: InputBinding[] = [];
  private keyToAction: Map<string, InputAction[]> = new Map();
  private mouseButtonToAction: Map<number, InputAction[]> = new Map();

  // Current input state
  private pressedKeys: Set<string> = new Set();
  private pressedMouseButtons: Set<number> = new Set();
  private activeActions: Set<InputAction> = new Set();

  // Mouse state
  private mousePosition: Vector2 = { x: 0, y: 0 };
  private mouseWorldPosition: Vector2 = { x: 0, y: 0 };

  // Screen to world converter (set by game)
  private screenToWorld: ((screenX: number, screenY: number) => Vector2) | null = null;

  /**
   * Initialize the input manager
   */
  public initialize(): void {
    // Load default bindings
    this.setBindings(DEFAULT_BINDINGS);

    // Set up event listeners
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('contextmenu', this.onContextMenu.bind(this));
    window.addEventListener('blur', this.onBlur.bind(this));

    console.log('[InputManager] Initialized');
  }

  /**
   * Set input bindings
   */
  public setBindings(bindings: InputBinding[]): void {
    this.bindings = [...bindings];
    this.rebuildBindingMaps();
  }

  /**
   * Get current bindings
   */
  public getBindings(): readonly InputBinding[] {
    return this.bindings;
  }

  /**
   * Rebind a key for an action
   */
  public rebindKey(action: InputAction, oldKey: string, newKey: string): void {
    const binding = this.bindings.find(b => b.action === action);
    if (binding) {
      const index = binding.keys.indexOf(oldKey);
      if (index !== -1) {
        binding.keys[index] = newKey;
        this.rebuildBindingMaps();
      }
    }
  }

  /**
   * Set screen to world conversion function
   */
  public setScreenToWorldConverter(fn: (screenX: number, screenY: number) => Vector2): void {
    this.screenToWorld = fn;
  }

  /**
   * Rebuild the key/button to action maps
   */
  private rebuildBindingMaps(): void {
    this.keyToAction.clear();
    this.mouseButtonToAction.clear();

    for (const binding of this.bindings) {
      // Map keys to actions
      for (const key of binding.keys) {
        const actions = this.keyToAction.get(key) ?? [];
        actions.push(binding.action);
        this.keyToAction.set(key, actions);
      }

      // Map mouse buttons to actions
      if (binding.mouseButtons) {
        for (const button of binding.mouseButtons) {
          const actions = this.mouseButtonToAction.get(button) ?? [];
          actions.push(binding.action);
          this.mouseButtonToAction.set(button, actions);
        }
      }
    }
  }

  /**
   * Handle key down event
   */
  private onKeyDown(event: KeyboardEvent): void {
    // Ignore if typing in an input field
    if (this.isTypingInInput(event)) {
      return;
    }

    const key = event.code;

    if (this.pressedKeys.has(key)) {
      return; // Already pressed, ignore repeat
    }

    this.pressedKeys.add(key);

    // Trigger actions for this key
    const actions = this.keyToAction.get(key);
    if (actions) {
      const eventBus = getEventBus();
      for (const action of actions) {
        if (!this.activeActions.has(action)) {
          this.activeActions.add(action);
          eventBus.emit('input:actionPressed', { action });
        }
      }
    }
  }

  /**
   * Handle key up event
   */
  private onKeyUp(event: KeyboardEvent): void {
    const key = event.code;
    this.pressedKeys.delete(key);

    // Check if actions should be released
    const actions = this.keyToAction.get(key);
    if (actions) {
      const eventBus = getEventBus();
      for (const action of actions) {
        // Only release if no other bound keys are still pressed
        if (!this.isActionStillPressed(action)) {
          this.activeActions.delete(action);
          eventBus.emit('input:actionReleased', { action });
        }
      }
    }
  }

  /**
   * Handle mouse down event
   */
  private onMouseDown(event: MouseEvent): void {
    const button = event.button;
    this.pressedMouseButtons.add(button);

    const eventBus = getEventBus();

    // Emit click event
    eventBus.emit('input:mouseClicked', {
      button,
      position: { ...this.mousePosition },
      worldPosition: { ...this.mouseWorldPosition },
    });

    // Trigger actions for this button
    const actions = this.mouseButtonToAction.get(button);
    if (actions) {
      for (const action of actions) {
        if (!this.activeActions.has(action)) {
          this.activeActions.add(action);
          eventBus.emit('input:actionPressed', { action });
        }
      }
    }
  }

  /**
   * Handle mouse up event
   */
  private onMouseUp(event: MouseEvent): void {
    const button = event.button;
    this.pressedMouseButtons.delete(button);

    // Check if actions should be released
    const actions = this.mouseButtonToAction.get(button);
    if (actions) {
      const eventBus = getEventBus();
      for (const action of actions) {
        if (!this.isActionStillPressed(action)) {
          this.activeActions.delete(action);
          eventBus.emit('input:actionReleased', { action });
        }
      }
    }
  }

  /**
   * Handle mouse move event
   */
  private onMouseMove(event: MouseEvent): void {
    this.mousePosition = { x: event.clientX, y: event.clientY };

    // Calculate world position if converter is set
    if (this.screenToWorld) {
      this.mouseWorldPosition = this.screenToWorld(event.clientX, event.clientY);
    }

    const eventBus = getEventBus();
    eventBus.emit('input:mouseMoved', {
      position: { ...this.mousePosition },
      worldPosition: { ...this.mouseWorldPosition },
    });
  }

  /**
   * Handle context menu (prevent default right-click menu)
   */
  private onContextMenu(event: Event): void {
    event.preventDefault();
  }

  /**
   * Handle window blur (release all keys)
   */
  private onBlur(): void {
    const eventBus = getEventBus();

    // Release all active actions
    for (const action of this.activeActions) {
      eventBus.emit('input:actionReleased', { action });
    }

    this.pressedKeys.clear();
    this.pressedMouseButtons.clear();
    this.activeActions.clear();
  }

  /**
   * Check if an action is still pressed by any bound key/button
   */
  private isActionStillPressed(action: InputAction): boolean {
    const binding = this.bindings.find(b => b.action === action);
    if (!binding) return false;

    // Check keys
    for (const key of binding.keys) {
      if (this.pressedKeys.has(key)) {
        return true;
      }
    }

    // Check mouse buttons
    if (binding.mouseButtons) {
      for (const button of binding.mouseButtons) {
        if (this.pressedMouseButtons.has(button)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user is typing in an input field
   */
  private isTypingInInput(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Check if an action is currently active
   */
  public isActionActive(action: InputAction): boolean {
    return this.activeActions.has(action);
  }

  /**
   * Check if a key is currently pressed
   */
  public isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key);
  }

  /**
   * Check if a mouse button is currently pressed
   */
  public isMouseButtonPressed(button: number): boolean {
    return this.pressedMouseButtons.has(button);
  }

  /**
   * Get mouse position in screen coordinates
   */
  public getMousePosition(): Readonly<Vector2> {
    return this.mousePosition;
  }

  /**
   * Get mouse position in world coordinates
   */
  public getMouseWorldPosition(): Readonly<Vector2> {
    return this.mouseWorldPosition;
  }

  /**
   * Get all currently active actions
   */
  public getActiveActions(): ReadonlySet<InputAction> {
    return this.activeActions;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    window.removeEventListener('blur', this.onBlur.bind(this));

    this.pressedKeys.clear();
    this.pressedMouseButtons.clear();
    this.activeActions.clear();

    console.log('[InputManager] Destroyed');
  }
}
