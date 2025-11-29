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
import { GamepadButton, GamepadAxis } from '@core/types';

// ============================================================================
// Default Bindings
// ============================================================================

/**
 * Default input bindings per 2D_GAME_IMPLEMENTATION_PLAN.md:
 * | Action    | Keyboard       | Gamepad          |
 * |-----------|----------------|------------------|
 * | Move      | WASD / Arrows  | Left Stick       |
 * | Sprint    | Shift          | Left Trigger     |
 * | Interact  | E              | A Button         |
 * | Attack    | Left Click     | Right Trigger    |
 * | Cancel    | Escape         | B Button         |
 * | Inventory | I              | Start            |
 * | Build Menu| B              | Select           |
 */
const DEFAULT_BINDINGS: InputBinding[] = [
  // Movement (D-pad also supported for digital input)
  { action: 'moveUp' as InputAction, keys: ['KeyW', 'ArrowUp'], gamepadButtons: [GamepadButton.DPadUp] },
  { action: 'moveDown' as InputAction, keys: ['KeyS', 'ArrowDown'], gamepadButtons: [GamepadButton.DPadDown] },
  { action: 'moveLeft' as InputAction, keys: ['KeyA', 'ArrowLeft'], gamepadButtons: [GamepadButton.DPadLeft] },
  { action: 'moveRight' as InputAction, keys: ['KeyD', 'ArrowRight'], gamepadButtons: [GamepadButton.DPadRight] },
  // Actions
  { action: 'sprint' as InputAction, keys: ['ShiftLeft', 'ShiftRight'], gamepadButtons: [GamepadButton.LeftTrigger] },
  { action: 'interact' as InputAction, keys: ['KeyE'], gamepadButtons: [GamepadButton.A] },
  { action: 'attack' as InputAction, keys: [], mouseButtons: [0], gamepadButtons: [GamepadButton.RightTrigger] },
  { action: 'secondary' as InputAction, keys: [], mouseButtons: [2], gamepadButtons: [GamepadButton.RightBumper] },
  { action: 'cancel' as InputAction, keys: ['Escape'], gamepadButtons: [GamepadButton.B] },
  { action: 'inventory' as InputAction, keys: ['KeyI'], gamepadButtons: [GamepadButton.Start] },
  { action: 'buildMenu' as InputAction, keys: ['KeyB'], gamepadButtons: [GamepadButton.Select] },
  { action: 'pause' as InputAction, keys: ['KeyP', 'Escape'], gamepadButtons: [GamepadButton.Start] },
  // Zoom (bumpers on gamepad)
  { action: 'zoomIn' as InputAction, keys: ['Equal', 'NumpadAdd'], gamepadButtons: [GamepadButton.Y] },
  { action: 'zoomOut' as InputAction, keys: ['Minus', 'NumpadSubtract'], gamepadButtons: [GamepadButton.X] },
  // Quick slots (no gamepad equivalent - use radial menu instead)
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

// Gamepad configuration
const GAMEPAD_CONFIG = {
  deadzone: 0.15,           // Stick deadzone to prevent drift
  triggerThreshold: 0.5,    // Trigger activation threshold
};

// ============================================================================
// InputManager Implementation
// ============================================================================

export class InputManager implements GameSystem {
  public readonly name = 'InputManager';

  private bindings: InputBinding[] = [];
  private keyToAction: Map<string, InputAction[]> = new Map();
  private mouseButtonToAction: Map<number, InputAction[]> = new Map();
  private gamepadButtonToAction: Map<number, InputAction[]> = new Map();

  // Current input state
  private pressedKeys: Set<string> = new Set();
  private pressedMouseButtons: Set<number> = new Set();
  private pressedGamepadButtons: Set<number> = new Set();
  private activeActions: Set<InputAction> = new Set();

  // Mouse state
  private mousePosition: Vector2 = { x: 0, y: 0 };
  private mouseWorldPosition: Vector2 = { x: 0, y: 0 };

  // Gamepad state
  private activeGamepadIndex: number | null = null;
  private leftStickInput: Vector2 = { x: 0, y: 0 };
  private rightStickInput: Vector2 = { x: 0, y: 0 };
  private gamepadConnected = false;

  // Screen to world converter (set by game)
  private screenToWorld: ((screenX: number, screenY: number) => Vector2) | null = null;

  /**
   * Initialize the input manager
   */
  public initialize(): void {
    // Load default bindings
    this.setBindings(DEFAULT_BINDINGS);

    // Set up keyboard/mouse event listeners
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('contextmenu', this.onContextMenu.bind(this));
    window.addEventListener('blur', this.onBlur.bind(this));

    // Set up gamepad event listeners
    window.addEventListener('gamepadconnected', this.onGamepadConnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected.bind(this));

    // Check for already-connected gamepads
    this.detectGamepads();

    console.log('[InputManager] Initialized');
  }

  /**
   * Update - polls gamepad state (Gamepad API requires polling)
   */
  public update(_deltaTime: number, _gameTime: GameTime): void {
    this.pollGamepad();
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
    this.gamepadButtonToAction.clear();

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

      // Map gamepad buttons to actions
      if (binding.gamepadButtons) {
        for (const button of binding.gamepadButtons) {
          const actions = this.gamepadButtonToAction.get(button) ?? [];
          actions.push(binding.action);
          this.gamepadButtonToAction.set(button, actions);
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
    this.pressedGamepadButtons.clear();
    this.activeActions.clear();
    this.leftStickInput = { x: 0, y: 0 };
    this.rightStickInput = { x: 0, y: 0 };
  }

  // ============================================================================
  // Gamepad Methods
  // ============================================================================

  /**
   * Handle gamepad connected event
   */
  private onGamepadConnected(event: GamepadEvent): void {
    console.log(`[InputManager] Gamepad connected: ${event.gamepad.id}`);
    this.activeGamepadIndex = event.gamepad.index;
    this.gamepadConnected = true;

    const eventBus = getEventBus();
    eventBus.emit('input:gamepadConnected', {
      index: event.gamepad.index,
      id: event.gamepad.id
    });
  }

  /**
   * Handle gamepad disconnected event
   */
  private onGamepadDisconnected(event: GamepadEvent): void {
    console.log(`[InputManager] Gamepad disconnected: ${event.gamepad.id}`);

    if (this.activeGamepadIndex === event.gamepad.index) {
      this.activeGamepadIndex = null;
      this.gamepadConnected = false;
      this.pressedGamepadButtons.clear();
      this.leftStickInput = { x: 0, y: 0 };
      this.rightStickInput = { x: 0, y: 0 };

      // Try to find another connected gamepad
      this.detectGamepads();
    }

    const eventBus = getEventBus();
    eventBus.emit('input:gamepadDisconnected', {
      index: event.gamepad.index,
      id: event.gamepad.id
    });
  }

  /**
   * Detect already-connected gamepads
   */
  private detectGamepads(): void {
    const gamepads = navigator.getGamepads();
    for (const gamepad of gamepads) {
      if (gamepad) {
        this.activeGamepadIndex = gamepad.index;
        this.gamepadConnected = true;
        console.log(`[InputManager] Found gamepad: ${gamepad.id}`);
        break;
      }
    }
  }

  /**
   * Poll gamepad state (called every frame)
   */
  private pollGamepad(): void {
    if (this.activeGamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.activeGamepadIndex];

    if (!gamepad) {
      this.activeGamepadIndex = null;
      this.gamepadConnected = false;
      return;
    }

    // Poll buttons
    this.pollGamepadButtons(gamepad);

    // Poll analog sticks
    this.pollGamepadSticks(gamepad);
  }

  /**
   * Poll gamepad buttons
   */
  private pollGamepadButtons(gamepad: Gamepad): void {
    const eventBus = getEventBus();

    for (let i = 0; i < gamepad.buttons.length; i++) {
      const button = gamepad.buttons[i];
      const isPressed = button.pressed || button.value > GAMEPAD_CONFIG.triggerThreshold;
      const wasPressed = this.pressedGamepadButtons.has(i);

      if (isPressed && !wasPressed) {
        // Button pressed
        this.pressedGamepadButtons.add(i);

        const actions = this.gamepadButtonToAction.get(i);
        if (actions) {
          for (const action of actions) {
            if (!this.activeActions.has(action)) {
              this.activeActions.add(action);
              eventBus.emit('input:actionPressed', { action });
            }
          }
        }
      } else if (!isPressed && wasPressed) {
        // Button released
        this.pressedGamepadButtons.delete(i);

        const actions = this.gamepadButtonToAction.get(i);
        if (actions) {
          for (const action of actions) {
            if (!this.isActionStillPressed(action)) {
              this.activeActions.delete(action);
              eventBus.emit('input:actionReleased', { action });
            }
          }
        }
      }
    }
  }

  /**
   * Poll gamepad analog sticks
   */
  private pollGamepadSticks(gamepad: Gamepad): void {
    const { deadzone } = GAMEPAD_CONFIG;

    // Left stick
    let leftX = gamepad.axes[GamepadAxis.LeftStickX] ?? 0;
    let leftY = gamepad.axes[GamepadAxis.LeftStickY] ?? 0;

    // Apply deadzone
    if (Math.abs(leftX) < deadzone) leftX = 0;
    if (Math.abs(leftY) < deadzone) leftY = 0;

    // Update left stick input
    const oldLeftX = this.leftStickInput.x;
    const oldLeftY = this.leftStickInput.y;
    this.leftStickInput = { x: leftX, y: leftY };

    // Emit stick moved event if changed significantly
    if (Math.abs(leftX - oldLeftX) > 0.01 || Math.abs(leftY - oldLeftY) > 0.01) {
      const eventBus = getEventBus();
      eventBus.emit('input:leftStickMoved', { x: leftX, y: leftY });
    }

    // Right stick
    let rightX = gamepad.axes[GamepadAxis.RightStickX] ?? 0;
    let rightY = gamepad.axes[GamepadAxis.RightStickY] ?? 0;

    if (Math.abs(rightX) < deadzone) rightX = 0;
    if (Math.abs(rightY) < deadzone) rightY = 0;

    const oldRightX = this.rightStickInput.x;
    const oldRightY = this.rightStickInput.y;
    this.rightStickInput = { x: rightX, y: rightY };

    if (Math.abs(rightX - oldRightX) > 0.01 || Math.abs(rightY - oldRightY) > 0.01) {
      const eventBus = getEventBus();
      eventBus.emit('input:rightStickMoved', { x: rightX, y: rightY });
    }
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

    // Check gamepad buttons
    if (binding.gamepadButtons) {
      for (const button of binding.gamepadButtons) {
        if (this.pressedGamepadButtons.has(button)) {
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

  // ============================================================================
  // Gamepad Public API
  // ============================================================================

  /**
   * Check if a gamepad is connected
   */
  public isGamepadConnected(): boolean {
    return this.gamepadConnected;
  }

  /**
   * Get left stick input (-1 to 1 for each axis)
   */
  public getLeftStick(): Readonly<Vector2> {
    return this.leftStickInput;
  }

  /**
   * Get right stick input (-1 to 1 for each axis)
   */
  public getRightStick(): Readonly<Vector2> {
    return this.rightStickInput;
  }

  /**
   * Check if a gamepad button is currently pressed
   */
  public isGamepadButtonPressed(button: number): boolean {
    return this.pressedGamepadButtons.has(button);
  }

  /**
   * Get the active gamepad (if any)
   */
  public getActiveGamepad(): Gamepad | null {
    if (this.activeGamepadIndex === null) return null;
    const gamepads = navigator.getGamepads();
    return gamepads[this.activeGamepadIndex] ?? null;
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
    window.removeEventListener('gamepadconnected', this.onGamepadConnected.bind(this));
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected.bind(this));

    this.pressedKeys.clear();
    this.pressedMouseButtons.clear();
    this.pressedGamepadButtons.clear();
    this.activeActions.clear();

    console.log('[InputManager] Destroyed');
  }
}
