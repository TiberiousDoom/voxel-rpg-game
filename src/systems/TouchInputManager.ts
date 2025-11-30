/**
 * TouchInputManager - Handles all touch input for mobile devices
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md v1.2 - Touch Input System:
 * - Virtual Joystick for movement
 * - Touch Buttons for actions
 * - Gesture Support (tap, double-tap, long-press, pinch, two-finger pan, drag)
 * - Touch Configuration
 */

import type { GameSystem } from '@core/GameEngine';
import { getEventBus } from '@core/EventBus';
import {
  InputAction,
  GestureType,
  Breakpoint,
  Direction,
  BREAKPOINT_THRESHOLDS,
  UI_SCALE_FACTORS,
  TOUCH_TARGET_SIZES,
} from '@core/types';
import type {
  Vector2,
  GameTime,
  TouchConfig,
  TouchState,
  VirtualJoystickConfig,
  TouchButtonConfig,
  GestureEvent,
  ResponsiveConfig,
  DeviceCapabilities,
} from '@core/types';

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_TOUCH_CONFIG: TouchConfig = {
  enabled: true,
  joystickSide: 'left',
  buttonLayout: 'default',
  sensitivity: 1.0,
  hapticEnabled: true,
  showJoystickAlways: false,
  doubleTapTime: 300,
  longPressTime: 500,
};

const DEFAULT_JOYSTICK_CONFIG: VirtualJoystickConfig = {
  position: { x: 100, y: -100 }, // From bottom-left
  radius: 80,
  innerRadius: 30,
  deadzone: 0.1,
  opacity: 0.5,
  activeOpacity: 0.8,
  showOnTouch: true,
};

// Default touch buttons for right side - these are RELATIVE positions from corner
// x: negative = from right edge, positive = from left edge
// y: negative = from bottom edge
interface ButtonRelativePosition {
  id: string;
  relativeX: number; // Offset from edge (negative = from right)
  relativeY: number; // Offset from bottom (negative = from bottom)
  width: number;
  height: number;
  icon: string;
  label: string;
  action: InputAction;
  showLabel: boolean;
  hapticFeedback: boolean;
}

const BUTTON_DEFINITIONS: ButtonRelativePosition[] = [
  {
    id: 'interact',
    relativeX: -70,
    relativeY: -140,
    width: 56,
    height: 56,
    icon: 'E',
    label: 'Interact',
    action: InputAction.Interact,
    showLabel: false,
    hapticFeedback: true,
  },
  {
    id: 'sprint',
    relativeX: -140,
    relativeY: -140,
    width: 56,
    height: 56,
    icon: '⚡',
    label: 'Sprint',
    action: InputAction.Sprint,
    showLabel: false,
    hapticFeedback: false,
  },
  {
    id: 'inventory',
    relativeX: -70,
    relativeY: -60,
    width: 48,
    height: 48,
    icon: '📦',
    label: 'Inventory',
    action: InputAction.Inventory,
    showLabel: false,
    hapticFeedback: true,
  },
  {
    id: 'build',
    relativeX: -140,
    relativeY: -60,
    width: 48,
    height: 48,
    icon: '🔨',
    label: 'Build',
    action: InputAction.BuildMenu,
    showLabel: false,
    hapticFeedback: true,
  },
];

// Convert definitions to initial button configs
const DEFAULT_TOUCH_BUTTONS: TouchButtonConfig[] = BUTTON_DEFINITIONS.map(def => ({
  id: def.id,
  position: { x: 0, y: 0 }, // Will be calculated in updateButtonPositions
  size: { x: def.width, y: def.height },
  icon: def.icon,
  label: def.label,
  action: def.action,
  showLabel: def.showLabel,
  hapticFeedback: def.hapticFeedback,
}));

// ============================================================================
// TouchInputManager Implementation
// ============================================================================

export class TouchInputManager implements GameSystem {
  public readonly name = 'TouchInputManager';

  // Configuration
  private config: TouchConfig = { ...DEFAULT_TOUCH_CONFIG };
  private joystickConfig: VirtualJoystickConfig = { ...DEFAULT_JOYSTICK_CONFIG };
  private buttons: TouchButtonConfig[] = [...DEFAULT_TOUCH_BUTTONS];

  // Touch state tracking
  private joystickTouch: TouchState | null = null;
  private buttonTouches: Map<string, TouchState> = new Map();
  private gestureTouches: Map<number, TouchState> = new Map();

  // Joystick output
  private joystickInput: Vector2 = { x: 0, y: 0 };
  private joystickActive = false;
  private joystickOrigin: Vector2 = { x: 0, y: 0 };

  // Gesture detection
  private lastTapTime = 0;
  private lastTapPosition: Vector2 = { x: 0, y: 0 };
  private longPressTimer: number | null = null;
  private initialPinchDistance = 0;
  private currentPinchScale = 1;

  // Active actions from touch buttons
  private activeActions: Set<InputAction> = new Set();

  // Responsive state
  private responsiveConfig: ResponsiveConfig = {
    currentBreakpoint: Breakpoint.Desktop,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    uiScale: 1.0,
    isTouch: false,
    isLandscape: window.innerWidth > window.innerHeight,
  };

  // Device capabilities
  private capabilities: DeviceCapabilities = {
    hasTouch: false,
    hasGamepad: false,
    hasMouse: true,
    hasKeyboard: true,
    supportsHaptic: false,
    supportsFullscreen: false,
    isMobile: false,
    isStandalone: false,
  };

  // Screen to world converter
  private screenToWorld: ((screenX: number, screenY: number) => Vector2) | null = null;

  // Canvas reference for rendering
  private canvas: HTMLCanvasElement | null = null;

  /**
   * Initialize the touch input manager
   */
  public initialize(): void {
    this.detectCapabilities();
    this.updateResponsiveConfig();
    this.setupEventListeners();
    this.updateButtonPositions();

    console.log('[TouchInputManager] Initialized', {
      hasTouch: this.capabilities.hasTouch,
      isMobile: this.capabilities.isMobile,
      breakpoint: this.responsiveConfig.currentBreakpoint,
    });
  }

  /**
   * Detect device capabilities
   */
  private detectCapabilities(): void {
    this.capabilities = {
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      hasGamepad: 'getGamepads' in navigator,
      hasMouse: window.matchMedia('(pointer: fine)').matches,
      hasKeyboard: true, // Assume keyboard unless proven otherwise
      supportsHaptic: 'vibrate' in navigator,
      supportsFullscreen: document.fullscreenEnabled || false,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    };

    // Enable touch mode if device has touch
    if (this.capabilities.hasTouch) {
      this.config.enabled = true;
      this.responsiveConfig.isTouch = true;
    }
  }

  /**
   * Update responsive configuration based on screen size
   */
  private updateResponsiveConfig(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    let breakpoint: Breakpoint;
    if (width < BREAKPOINT_THRESHOLDS.phoneLandscape) {
      breakpoint = Breakpoint.Phone;
    } else if (width < BREAKPOINT_THRESHOLDS.tablet) {
      breakpoint = Breakpoint.PhoneLandscape;
    } else if (width < BREAKPOINT_THRESHOLDS.desktop) {
      breakpoint = Breakpoint.Tablet;
    } else {
      breakpoint = Breakpoint.Desktop;
    }

    this.responsiveConfig = {
      currentBreakpoint: breakpoint,
      screenWidth: width,
      screenHeight: height,
      pixelRatio: window.devicePixelRatio || 1,
      uiScale: UI_SCALE_FACTORS[breakpoint],
      isTouch: this.capabilities.hasTouch,
      isLandscape: width > height,
    };

    // Emit breakpoint change event
    const eventBus = getEventBus();
    eventBus.emit('ui:breakpointChanged', { breakpoint, config: this.responsiveConfig });
  }

  /**
   * Update button positions based on screen size and layout
   * Uses BUTTON_DEFINITIONS for original relative positions to avoid mutation issues
   */
  private updateButtonPositions(): void {
    const { screenWidth, screenHeight, uiScale } = this.responsiveConfig;
    const scaledSize = TOUCH_TARGET_SIZES.preferred * uiScale;

    // Get safe area insets for notched devices
    const safeAreaBottom = this.getSafeAreaInset('bottom');
    const safeAreaRight = this.getSafeAreaInset('right');
    const safeAreaLeft = this.getSafeAreaInset('left');

    // Calculate usable area
    const usableHeight = screenHeight - safeAreaBottom;

    // Update joystick position based on side preference
    const joystickPadding = 30 + safeAreaBottom;
    if (this.config.joystickSide === 'left') {
      this.joystickConfig.position = {
        x: this.joystickConfig.radius + 20 + safeAreaLeft,
        y: screenHeight - this.joystickConfig.radius - joystickPadding,
      };
    } else {
      this.joystickConfig.position = {
        x: screenWidth - this.joystickConfig.radius - 20 - safeAreaRight,
        y: screenHeight - this.joystickConfig.radius - joystickPadding,
      };
    }

    // Update button positions using ORIGINAL definitions (not mutated positions)
    const buttonSide = this.config.joystickSide === 'left' ? 'right' : 'left';
    const buttonPadding = 20 + safeAreaBottom;

    this.buttons.forEach((button, index) => {
      const def = BUTTON_DEFINITIONS[index];
      if (!def) return;

      // Calculate scaled size first
      const scaledWidth = Math.max(def.width * uiScale, scaledSize);
      const scaledHeight = Math.max(def.height * uiScale, scaledSize);

      // Calculate absolute position from relative offsets
      let absoluteX: number;
      let absoluteY: number;

      if (buttonSide === 'right') {
        // Buttons on right side: relativeX is offset from right edge
        absoluteX = screenWidth + def.relativeX - safeAreaRight;
        absoluteY = screenHeight + def.relativeY - buttonPadding;
      } else {
        // Buttons on left side: mirror the x position
        absoluteX = -def.relativeX + safeAreaLeft;
        absoluteY = screenHeight + def.relativeY - buttonPadding;
      }

      // Update button with calculated positions and sizes
      button.position = { x: absoluteX, y: absoluteY };
      button.size = { x: scaledWidth, y: scaledHeight };
    });
  }

  /**
   * Get safe area inset value (for notched devices)
   * Uses CSS custom property set by viewport-fit=cover
   */
  private getSafeAreaInset(side: 'top' | 'bottom' | 'left' | 'right'): number {
    // Try to read computed CSS env() value via a properly styled element
    const testEl = document.createElement('div');
    testEl.style.cssText = `
      position: fixed;
      ${side}: 0;
      pointer-events: none;
      visibility: hidden;
      padding-${side}: env(safe-area-inset-${side}, 0px);
    `;
    document.body.appendChild(testEl);
    const computed = window.getComputedStyle(testEl);
    const paddingValue = parseFloat(computed.getPropertyValue(`padding-${side}`)) || 0;
    document.body.removeChild(testEl);
    return paddingValue;
  }

  /**
   * Set up touch event listeners
   */
  private setupEventListeners(): void {
    // Touch events
    window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    window.addEventListener('touchcancel', this.onTouchCancel.bind(this), { passive: false });

    // Resize events for responsive updates
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('orientationchange', this.onOrientationChange.bind(this));

    // Prevent default touch behaviors on game area
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  }

  /**
   * Handle touch start
   */
  private onTouchStart(event: TouchEvent): void {
    if (!this.config.enabled) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const position = { x: touch.clientX, y: touch.clientY };

      // Check if touch is on joystick area
      if (this.isInJoystickArea(position) && !this.joystickTouch) {
        event.preventDefault();
        this.startJoystickTouch(touch);
        continue;
      }

      // Check if touch is on a button
      const button = this.getButtonAtPosition(position);
      if (button) {
        event.preventDefault();
        this.startButtonTouch(touch, button);
        continue;
      }

      // Otherwise, track for gestures
      this.startGestureTouch(touch);
    }

    // Check for multi-touch gestures
    if (event.touches.length === 2) {
      this.startPinchGesture(event.touches[0], event.touches[1]);
    }
  }

  /**
   * Handle touch move
   */
  private onTouchMove(event: TouchEvent): void {
    if (!this.config.enabled) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];

      // Update joystick
      if (this.joystickTouch && this.joystickTouch.identifier === touch.identifier) {
        event.preventDefault();
        this.updateJoystickTouch(touch);
        continue;
      }

      // Update gesture tracking
      const gestureState = this.gestureTouches.get(touch.identifier);
      if (gestureState) {
        gestureState.currentPosition = { x: touch.clientX, y: touch.clientY };

        // Cancel long press if moved too far
        const dx = gestureState.currentPosition.x - gestureState.startPosition.x;
        const dy = gestureState.currentPosition.y - gestureState.startPosition.y;
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          this.cancelLongPress();
        }
      }
    }

    // Update pinch gesture
    if (event.touches.length === 2 && this.initialPinchDistance > 0) {
      event.preventDefault();
      this.updatePinchGesture(event.touches[0], event.touches[1]);
    }
  }

  /**
   * Handle touch end
   */
  private onTouchEnd(event: TouchEvent): void {
    if (!this.config.enabled) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];

      // End joystick touch
      if (this.joystickTouch && this.joystickTouch.identifier === touch.identifier) {
        this.endJoystickTouch();
        continue;
      }

      // End button touch
      for (const [buttonId, state] of this.buttonTouches) {
        if (state.identifier === touch.identifier) {
          this.endButtonTouch(buttonId);
          break;
        }
      }

      // End gesture touch and detect gesture
      const gestureState = this.gestureTouches.get(touch.identifier);
      if (gestureState) {
        this.detectGesture(gestureState, touch);
        this.gestureTouches.delete(touch.identifier);
      }
    }

    // End pinch gesture
    if (event.touches.length < 2) {
      this.endPinchGesture();
    }

    this.cancelLongPress();
  }

  /**
   * Handle touch cancel
   */
  private onTouchCancel(event: TouchEvent): void {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];

      if (this.joystickTouch && this.joystickTouch.identifier === touch.identifier) {
        this.endJoystickTouch();
      }

      for (const [buttonId, state] of this.buttonTouches) {
        if (state.identifier === touch.identifier) {
          this.endButtonTouch(buttonId);
          break;
        }
      }

      this.gestureTouches.delete(touch.identifier);
    }

    this.cancelLongPress();
    this.endPinchGesture();
  }

  /**
   * Handle window resize
   */
  private onResize(): void {
    this.updateResponsiveConfig();
    this.updateButtonPositions();
  }

  /**
   * Handle orientation change
   */
  private onOrientationChange(): void {
    // Delay to allow browser to update dimensions
    setTimeout(() => {
      this.updateResponsiveConfig();
      this.updateButtonPositions();
    }, 100);
  }

  // ============================================================================
  // Joystick Methods
  // ============================================================================

  private isInJoystickArea(position: Vector2): boolean {
    const { x: jx, y: jy } = this.joystickConfig.position;
    const radius = this.joystickConfig.radius * 1.5; // Larger touch area
    const dx = position.x - jx;
    const dy = position.y - jy;
    return dx * dx + dy * dy <= radius * radius;
  }

  private startJoystickTouch(touch: Touch): void {
    const position = { x: touch.clientX, y: touch.clientY };

    this.joystickTouch = {
      active: true,
      identifier: touch.identifier,
      startPosition: { ...position },
      currentPosition: { ...position },
      startTime: performance.now(),
    };

    // If showOnTouch, use touch position as origin
    if (this.joystickConfig.showOnTouch) {
      this.joystickOrigin = { ...position };
    } else {
      this.joystickOrigin = { ...this.joystickConfig.position };
    }

    this.joystickActive = true;
    this.triggerHaptic(10);
  }

  private updateJoystickTouch(touch: Touch): void {
    if (!this.joystickTouch) return;

    this.joystickTouch.currentPosition = { x: touch.clientX, y: touch.clientY };

    // Calculate joystick input
    const dx = this.joystickTouch.currentPosition.x - this.joystickOrigin.x;
    const dy = this.joystickTouch.currentPosition.y - this.joystickOrigin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = this.joystickConfig.radius;

    if (distance > this.joystickConfig.deadzone * maxDistance) {
      const normalizedDistance = Math.min(distance / maxDistance, 1);
      const angle = Math.atan2(dy, dx);

      this.joystickInput = {
        x: Math.cos(angle) * normalizedDistance * this.config.sensitivity,
        y: Math.sin(angle) * normalizedDistance * this.config.sensitivity,
      };
    } else {
      this.joystickInput = { x: 0, y: 0 };
    }

    // Emit joystick event
    const eventBus = getEventBus();
    eventBus.emit('input:touchJoystickMoved', { ...this.joystickInput });
  }

  private endJoystickTouch(): void {
    this.joystickTouch = null;
    this.joystickActive = false;
    this.joystickInput = { x: 0, y: 0 };

    const eventBus = getEventBus();
    eventBus.emit('input:touchJoystickMoved', { x: 0, y: 0 });
  }

  // ============================================================================
  // Button Methods
  // ============================================================================

  private getButtonAtPosition(position: Vector2): TouchButtonConfig | null {
    for (const button of this.buttons) {
      const halfWidth = button.size.x / 2;
      const halfHeight = button.size.y / 2;

      if (
        position.x >= button.position.x - halfWidth &&
        position.x <= button.position.x + halfWidth &&
        position.y >= button.position.y - halfHeight &&
        position.y <= button.position.y + halfHeight
      ) {
        return button;
      }
    }
    return null;
  }

  private startButtonTouch(touch: Touch, button: TouchButtonConfig): void {
    const position = { x: touch.clientX, y: touch.clientY };

    this.buttonTouches.set(button.id, {
      active: true,
      identifier: touch.identifier,
      startPosition: { ...position },
      currentPosition: { ...position },
      startTime: performance.now(),
    });

    // Trigger action
    this.activeActions.add(button.action);

    const eventBus = getEventBus();
    eventBus.emit('input:actionPressed', { action: button.action });

    if (button.hapticFeedback) {
      this.triggerHaptic(15);
    }
  }

  private endButtonTouch(buttonId: string): void {
    const button = this.buttons.find(b => b.id === buttonId);
    if (!button) return;

    this.buttonTouches.delete(buttonId);
    this.activeActions.delete(button.action);

    const eventBus = getEventBus();
    eventBus.emit('input:actionReleased', { action: button.action });
  }

  // ============================================================================
  // Gesture Methods
  // ============================================================================

  private startGestureTouch(touch: Touch): void {
    const position = { x: touch.clientX, y: touch.clientY };

    this.gestureTouches.set(touch.identifier, {
      active: true,
      identifier: touch.identifier,
      startPosition: { ...position },
      currentPosition: { ...position },
      startTime: performance.now(),
    });

    // Start long press timer
    this.longPressTimer = window.setTimeout(() => {
      this.emitGesture({
        type: GestureType.LongPress,
        position,
        duration: this.config.longPressTime,
      });
      this.triggerHaptic(30);
    }, this.config.longPressTime);
  }

  private detectGesture(state: TouchState, touch: Touch): void {
    const now = performance.now();
    const duration = now - state.startTime;
    const position = { x: touch.clientX, y: touch.clientY };

    const dx = position.x - state.startPosition.x;
    const dy = position.y - state.startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If it was a long press, we already handled it
    if (duration >= this.config.longPressTime && distance < 10) {
      return;
    }

    // Check for swipe (fast, long movement)
    if (distance > 50 && duration < 300) {
      const angle = Math.atan2(dy, dx);
      const direction = this.angleToDirection(angle);
      this.emitGesture({
        type: GestureType.Swipe,
        position: state.startPosition,
        delta: { x: dx, y: dy },
        direction,
      });
      return;
    }

    // Check for drag (slow movement)
    if (distance > 20) {
      this.emitGesture({
        type: GestureType.Drag,
        position,
        delta: { x: dx, y: dy },
      });
      return;
    }

    // Check for double tap
    if (now - this.lastTapTime < this.config.doubleTapTime) {
      const tapDx = position.x - this.lastTapPosition.x;
      const tapDy = position.y - this.lastTapPosition.y;
      if (Math.sqrt(tapDx * tapDx + tapDy * tapDy) < 30) {
        this.emitGesture({
          type: GestureType.DoubleTap,
          position,
        });
        this.lastTapTime = 0; // Reset to prevent triple-tap
        this.triggerHaptic(20);
        return;
      }
    }

    // Single tap
    this.emitGesture({
      type: GestureType.Tap,
      position,
    });
    this.lastTapTime = now;
    this.lastTapPosition = { ...position };
  }

  private angleToDirection(angle: number): Direction {
    // Normalize angle to 0-2PI
    const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    if (normalized < Math.PI / 4 || normalized >= Math.PI * 7 / 4) return Direction.East;
    if (normalized < Math.PI * 3 / 4) return Direction.South;
    if (normalized < Math.PI * 5 / 4) return Direction.West;
    return Direction.North;
  }

  private startPinchGesture(touch1: Touch, touch2: Touch): void {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
    this.currentPinchScale = 1;
  }

  private updatePinchGesture(touch1: Touch, touch2: Touch): void {
    if (this.initialPinchDistance === 0) return;

    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);

    this.currentPinchScale = currentDistance / this.initialPinchDistance;

    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;

    this.emitGesture({
      type: GestureType.Pinch,
      position: { x: centerX, y: centerY },
      scale: this.currentPinchScale,
    });
  }

  private endPinchGesture(): void {
    this.initialPinchDistance = 0;
    this.currentPinchScale = 1;
  }

  private cancelLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private emitGesture(gesture: GestureEvent): void {
    // Add world position if converter is available
    if (this.screenToWorld && gesture.position) {
      gesture.worldPosition = this.screenToWorld(gesture.position.x, gesture.position.y);
    }

    const eventBus = getEventBus();
    eventBus.emit('input:gesture', gesture);

    // Handle specific gesture actions
    switch (gesture.type) {
      case GestureType.Tap:
        eventBus.emit('input:touchTap', gesture);
        break;
      case GestureType.DoubleTap:
        // Toggle sprint on double-tap per spec
        eventBus.emit('input:actionPressed', { action: InputAction.Sprint });
        setTimeout(() => {
          eventBus.emit('input:actionReleased', { action: InputAction.Sprint });
        }, 100);
        break;
      case GestureType.Pinch:
        // Zoom on pinch per spec
        if (gesture.scale !== undefined) {
          if (gesture.scale > 1.05) {
            eventBus.emit('input:actionPressed', { action: InputAction.ZoomIn });
            eventBus.emit('input:actionReleased', { action: InputAction.ZoomIn });
          } else if (gesture.scale < 0.95) {
            eventBus.emit('input:actionPressed', { action: InputAction.ZoomOut });
            eventBus.emit('input:actionReleased', { action: InputAction.ZoomOut });
          }
        }
        break;
      case GestureType.LongPress:
        // Secondary action on long press per spec
        eventBus.emit('input:actionPressed', { action: InputAction.Secondary });
        eventBus.emit('input:actionReleased', { action: InputAction.Secondary });
        break;
    }
  }

  // ============================================================================
  // Haptic Feedback
  // ============================================================================

  private triggerHaptic(duration: number): void {
    if (this.config.hapticEnabled && this.capabilities.supportsHaptic) {
      navigator.vibrate(duration);
    }
  }

  // ============================================================================
  // Update & Render
  // ============================================================================

  public update(_deltaTime: number, _gameTime: GameTime): void {
    // Touch input is event-driven, but we can emit continuous joystick state
    if (this.joystickActive && (this.joystickInput.x !== 0 || this.joystickInput.y !== 0)) {
      const eventBus = getEventBus();
      eventBus.emit('input:touchJoystickMoved', { ...this.joystickInput });
    }
  }

  /**
   * Render touch controls to canvas
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.config.enabled || !this.capabilities.hasTouch) return;

    this.renderJoystick(ctx);
    this.renderButtons(ctx);
  }

  private renderJoystick(ctx: CanvasRenderingContext2D): void {
    if (!this.config.showJoystickAlways && !this.joystickActive) return;

    const origin = this.joystickActive ? this.joystickOrigin : this.joystickConfig.position;
    const opacity = this.joystickActive ? this.joystickConfig.activeOpacity : this.joystickConfig.opacity;

    // Outer circle
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, this.joystickConfig.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner knob
    let knobX = origin.x;
    let knobY = origin.y;

    if (this.joystickActive && this.joystickTouch) {
      const dx = this.joystickTouch.currentPosition.x - origin.x;
      const dy = this.joystickTouch.currentPosition.y - origin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = this.joystickConfig.radius;

      if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);
        knobX = origin.x + Math.cos(angle) * maxDistance;
        knobY = origin.y + Math.sin(angle) * maxDistance;
      } else {
        knobX = this.joystickTouch.currentPosition.x;
        knobY = this.joystickTouch.currentPosition.y;
      }
    }

    ctx.beginPath();
    ctx.arc(knobX, knobY, this.joystickConfig.innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fill();
  }

  private renderButtons(ctx: CanvasRenderingContext2D): void {
    const baseOpacity = 0.6;

    for (const button of this.buttons) {
      const isPressed = this.buttonTouches.has(button.id);
      const opacity = isPressed ? 0.9 : baseOpacity;
      const scale = isPressed ? 0.95 : 1;

      const x = button.position.x;
      const y = button.position.y;
      const width = button.size.x * scale;
      const height = button.size.y * scale;

      // Button background
      ctx.beginPath();
      ctx.roundRect(x - width / 2, y - height / 2, width, height, 8);
      ctx.fillStyle = isPressed ? `rgba(233, 69, 96, ${opacity})` : `rgba(255, 255, 255, ${opacity * 0.3})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Button icon
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.font = `${Math.floor(height * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(button.icon, x, y);

      // Button label (if shown)
      if (button.showLabel && button.label) {
        ctx.font = '10px sans-serif';
        ctx.fillText(button.label, x, y + height / 2 + 10);
      }
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get current joystick input (-1 to 1 for each axis)
   */
  public getJoystickInput(): Readonly<Vector2> {
    return this.joystickInput;
  }

  /**
   * Check if joystick is active
   */
  public isJoystickActive(): boolean {
    return this.joystickActive;
  }

  /**
   * Check if a touch action is active
   */
  public isActionActive(action: InputAction): boolean {
    return this.activeActions.has(action);
  }

  /**
   * Get responsive configuration
   */
  public getResponsiveConfig(): Readonly<ResponsiveConfig> {
    return this.responsiveConfig;
  }

  /**
   * Get device capabilities
   */
  public getCapabilities(): Readonly<DeviceCapabilities> {
    return this.capabilities;
  }

  /**
   * Check if touch is enabled and device supports it
   */
  public isTouchEnabled(): boolean {
    return this.config.enabled && this.capabilities.hasTouch;
  }

  /**
   * Set touch configuration
   */
  public setConfig(config: Partial<TouchConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateButtonPositions();
  }

  /**
   * Get current touch configuration
   */
  public getConfig(): Readonly<TouchConfig> {
    return this.config;
  }

  /**
   * Set joystick configuration
   */
  public setJoystickConfig(config: Partial<VirtualJoystickConfig>): void {
    this.joystickConfig = { ...this.joystickConfig, ...config };
    this.updateButtonPositions();
  }

  /**
   * Set screen to world converter for gesture world positions
   */
  public setScreenToWorldConverter(fn: (screenX: number, screenY: number) => Vector2): void {
    this.screenToWorld = fn;
  }

  /**
   * Set canvas reference for rendering
   */
  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    window.removeEventListener('touchstart', this.onTouchStart.bind(this));
    window.removeEventListener('touchmove', this.onTouchMove.bind(this));
    window.removeEventListener('touchend', this.onTouchEnd.bind(this));
    window.removeEventListener('touchcancel', this.onTouchCancel.bind(this));
    window.removeEventListener('resize', this.onResize.bind(this));
    window.removeEventListener('orientationchange', this.onOrientationChange.bind(this));

    this.cancelLongPress();
    this.joystickTouch = null;
    this.buttonTouches.clear();
    this.gestureTouches.clear();
    this.activeActions.clear();

    console.log('[TouchInputManager] Destroyed');
  }
}

// Singleton instance
let touchInputManagerInstance: TouchInputManager | null = null;

export function getTouchInputManager(): TouchInputManager {
  if (!touchInputManagerInstance) {
    touchInputManagerInstance = new TouchInputManager();
  }
  return touchInputManagerInstance;
}
