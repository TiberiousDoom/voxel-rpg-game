/**
 * useCameraControls.js - React hook for camera controls
 *
 * Features:
 * - Camera position state management
 * - Zoom level management
 * - Pan, zoom, and reset functions
 * - Smooth transitions
 * - Bounds checking
 * - Change callbacks
 *
 * Usage:
 * const {
 *   position,
 *   zoom,
 *   pan,
 *   setZoom,
 *   resetCamera,
 *   centerOn
 * } = useCameraControls(options);
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Default camera options
 */
const DEFAULT_OPTIONS = {
  initialPosition: { x: 0, y: 0 },
  initialZoom: 1.0,
  minZoom: 0.5,
  maxZoom: 3.0,
  panSpeed: 1.0,
  zoomSpeed: 0.1,
  smoothTransitions: true,
  transitionDuration: 300, // ms
  onCameraChange: () => {}
};

/**
 * useCameraControls hook - Manages camera state and controls
 * @param {Object} options - Configuration options
 * @param {Object} options.initialPosition - Initial camera position {x, y}
 * @param {number} options.initialZoom - Initial zoom level
 * @param {number} options.minZoom - Minimum zoom level
 * @param {number} options.maxZoom - Maximum zoom level
 * @param {number} options.panSpeed - Pan speed multiplier
 * @param {number} options.zoomSpeed - Zoom speed multiplier
 * @param {boolean} options.smoothTransitions - Enable smooth transitions
 * @param {number} options.transitionDuration - Transition duration in ms
 * @param {Function} options.onCameraChange - Callback when camera changes
 * @returns {Object} Camera state and controls
 */
export function useCameraControls(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Camera state
  const [position, setPosition] = useState(opts.initialPosition);
  const [zoom, setZoomState] = useState(opts.initialZoom);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for smooth transitions
  const animationFrameRef = useRef(null);
  const targetPositionRef = useRef(opts.initialPosition);
  const targetZoomRef = useRef(opts.initialZoom);

  /**
   * Trigger camera change callback
   */
  const triggerChange = useCallback((newPosition, newZoom) => {
    opts.onCameraChange({
      position: newPosition,
      zoom: newZoom
    });
  }, [opts]);

  /**
   * Clamp zoom to valid range
   */
  const clampZoom = useCallback((value) => {
    return Math.max(opts.minZoom, Math.min(opts.maxZoom, value));
  }, [opts.minZoom, opts.maxZoom]);

  /**
   * Smooth transition animation
   */
  const animateToTarget = useCallback(() => {
    const startTime = Date.now();
    const startPosition = { ...position };
    const startZoom = zoom;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / opts.transitionDuration, 1);

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);

      const newPosition = {
        x: startPosition.x + (targetPositionRef.current.x - startPosition.x) * eased,
        y: startPosition.y + (targetPositionRef.current.y - startPosition.y) * eased
      };

      const newZoom = startZoom + (targetZoomRef.current - startZoom) * eased;

      setPosition(newPosition);
      setZoomState(newZoom);
      triggerChange(newPosition, newZoom);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [position, zoom, opts.transitionDuration, triggerChange]);

  /**
   * Pan camera to new position
   * @param {Object} newPosition - New position {x, y}
   * @param {boolean} smooth - Use smooth transition (default: false)
   */
  const pan = useCallback((newPosition, smooth = false) => {
    if (smooth && opts.smoothTransitions) {
      targetPositionRef.current = newPosition;
      animateToTarget();
    } else {
      setPosition(newPosition);
      triggerChange(newPosition, zoom);
    }
  }, [zoom, opts.smoothTransitions, animateToTarget, triggerChange]);

  /**
   * Set zoom level
   * @param {number} newZoom - New zoom level
   * @param {boolean} smooth - Use smooth transition (default: false)
   */
  const setZoom = useCallback((newZoom, smooth = false) => {
    const clampedZoom = clampZoom(newZoom);

    if (smooth && opts.smoothTransitions) {
      targetZoomRef.current = clampedZoom;
      animateToTarget();
    } else {
      setZoomState(clampedZoom);
      triggerChange(position, clampedZoom);
    }
  }, [position, clampZoom, opts.smoothTransitions, animateToTarget, triggerChange]);

  /**
   * Reset camera to initial position and zoom
   */
  const resetCamera = useCallback(() => {
    pan(opts.initialPosition, true);
    setZoom(opts.initialZoom, true);
  }, [opts.initialPosition, opts.initialZoom, pan, setZoom]);

  /**
   * Center camera on a specific position
   * @param {Object} targetPosition - Position to center on {x, y}
   */
  const centerOn = useCallback((targetPosition) => {
    pan(targetPosition, true);
  }, [pan]);

  /**
   * Zoom to fit a specific area
   * @param {Object} bounds - Bounds {x, y, width, height}
   * @param {number} padding - Padding around bounds (default: 0.1)
   */
  const zoomToFit = useCallback((bounds, padding = 0.1) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const scaleX = viewportWidth / (bounds.width * (1 + padding));
    const scaleY = viewportHeight / (bounds.height * (1 + padding));
    const newZoom = clampZoom(Math.min(scaleX, scaleY));

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    pan({ x: centerX, y: centerY }, true);
    setZoom(newZoom, true);
  }, [clampZoom, pan, setZoom]);

  /**
   * Relative pan (delta movement)
   * @param {Object} delta - Delta movement {x, y}
   */
  const panBy = useCallback((delta) => {
    const newPosition = {
      x: position.x + delta.x * opts.panSpeed,
      y: position.y + delta.y * opts.panSpeed
    };
    pan(newPosition);
  }, [position, opts.panSpeed, pan]);

  /**
   * Relative zoom (delta zoom)
   * @param {number} delta - Delta zoom amount
   */
  const zoomBy = useCallback((delta) => {
    const newZoom = zoom + delta * opts.zoomSpeed;
    setZoom(newZoom);
  }, [zoom, opts.zoomSpeed, setZoom]);

  /**
   * Get camera bounds (visible area in world coordinates)
   * @returns {Object} Bounds {x, y, width, height}
   */
  const getBounds = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const worldWidth = viewportWidth / zoom;
    const worldHeight = viewportHeight / zoom;

    return {
      x: position.x - worldWidth / 2,
      y: position.y - worldHeight / 2,
      width: worldWidth,
      height: worldHeight
    };
  }, [position, zoom]);

  /**
   * Check if a point is visible in viewport
   * @param {Object} point - Point {x, y}
   * @returns {boolean} True if visible
   */
  const isVisible = useCallback((point) => {
    const bounds = getBounds();
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }, [getBounds]);

  /**
   * Convert screen coordinates to world coordinates
   * @param {Object} screenPos - Screen position {x, y}
   * @returns {Object} World position {x, y}
   */
  const screenToWorld = useCallback((screenPos) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    return {
      x: (screenPos.x - viewportWidth / 2) / zoom + position.x,
      y: (screenPos.y - viewportHeight / 2) / zoom + position.y
    };
  }, [position, zoom]);

  /**
   * Convert world coordinates to screen coordinates
   * @param {Object} worldPos - World position {x, y}
   * @returns {Object} Screen position {x, y}
   */
  const worldToScreen = useCallback((worldPos) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    return {
      x: (worldPos.x - position.x) * zoom + viewportWidth / 2,
      y: (worldPos.y - position.y) * zoom + viewportHeight / 2
    };
  }, [position, zoom]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    // State
    position,
    zoom,
    isDragging,
    setIsDragging,

    // Basic controls
    pan,
    setZoom,
    resetCamera,
    centerOn,

    // Advanced controls
    panBy,
    zoomBy,
    zoomToFit,

    // Utilities
    getBounds,
    isVisible,
    screenToWorld,
    worldToScreen
  };
}

export default useCameraControls;
