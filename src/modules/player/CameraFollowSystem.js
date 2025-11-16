/**
 * CameraFollowSystem.js
 * Camera system that follows the player character
 *
 * Supports two modes:
 * - FOLLOW: Camera centers on player
 * - FREE: Camera can be panned freely
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Camera modes
 */
export const CAMERA_MODES = {
  FOLLOW: 'FOLLOW',
  FREE: 'FREE',
};

/**
 * Camera follow system
 */
export class CameraFollowSystem {
  constructor(options = {}) {
    this.mode = options.mode || CAMERA_MODES.FOLLOW;
    this.smoothing = options.smoothing !== undefined ? options.smoothing : 0.1; // 0 = instant, 1 = no smoothing
    this.viewportWidth = options.viewportWidth || 400;
    this.viewportHeight = options.viewportHeight || 400;
    this.tileSize = options.tileSize || 40;

    // Camera position (in world coordinates)
    this.position = { x: 0, z: 0 };
    this.targetPosition = { x: 0, z: 0 };

    // Zoom
    this.zoom = 1;
    this.minZoom = 0.5;
    this.maxZoom = 2;
  }

  /**
   * Set camera mode
   */
  setMode(mode) {
    this.mode = mode;
  }

  /**
   * Update camera to follow player
   */
  update(playerPosition, deltaTime) {
    if (this.mode !== CAMERA_MODES.FOLLOW) return;

    // Set target to player position
    this.targetPosition.x = playerPosition.x;
    this.targetPosition.z = playerPosition.z;

    // Smooth camera movement
    if (this.smoothing > 0) {
      const lerp = Math.min(1, (1 - this.smoothing) * deltaTime * 10);
      this.position.x += (this.targetPosition.x - this.position.x) * lerp;
      this.position.z += (this.targetPosition.z - this.position.z) * lerp;
    } else {
      this.position.x = this.targetPosition.x;
      this.position.z = this.targetPosition.z;
    }
  }

  /**
   * Manually pan camera (FREE mode)
   */
  pan(dx, dz) {
    if (this.mode !== CAMERA_MODES.FREE) return;

    this.position.x += dx;
    this.position.z += dz;
    this.targetPosition.x = this.position.x;
    this.targetPosition.z = this.position.z;
  }

  /**
   * Set zoom level
   */
  setZoom(zoom) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
  }

  /**
   * Get camera offset for rendering
   * @returns {object} - {x, z} offset in pixels
   */
  getOffset() {
    const centerX = this.viewportWidth / 2;
    const centerY = this.viewportHeight / 2;

    // Calculate offset to center camera on position
    const offsetX = centerX - this.position.x * this.tileSize * this.zoom;
    const offsetY = centerY - this.position.z * this.tileSize * this.zoom;

    return { x: offsetX, y: offsetY };
  }

  /**
   * Get camera transform for rendering
   */
  getTransform() {
    const offset = this.getOffset();
    return {
      translateX: offset.x,
      translateY: offset.y,
      scale: this.zoom,
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX, screenY) {
    const offset = this.getOffset();

    const worldX = (screenX - offset.x) / (this.tileSize * this.zoom);
    const worldZ = (screenY - offset.y) / (this.tileSize * this.zoom);

    return { x: worldX, z: worldZ };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX, worldZ) {
    const offset = this.getOffset();

    const screenX = worldX * this.tileSize * this.zoom + offset.x;
    const screenY = worldZ * this.tileSize * this.zoom + offset.y;

    return { x: screenX, y: screenY };
  }
}

/**
 * React hook for camera follow system
 */
export function useCameraFollow(player, options = {}) {
  const cameraRef = useRef(null);
  const [cameraMode, setCameraMode] = useState(options.mode || CAMERA_MODES.FOLLOW);
  const lastUpdateRef = useRef(Date.now());

  // Initialize camera
  useEffect(() => {
    cameraRef.current = new CameraFollowSystem({
      ...options,
      mode: cameraMode,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update camera mode when it changes
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.setMode(cameraMode);
    }
  }, [cameraMode]);

  // Update camera position to follow player
  useEffect(() => {
    if (!player || !cameraRef.current) return;

    const updateCamera = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      cameraRef.current.update(player.position, deltaTime);
    };

    const intervalId = setInterval(updateCamera, 16); // ~60 FPS

    return () => clearInterval(intervalId);
  }, [player]);

  // Toggle camera mode (T key)
  const handleToggleMode = useCallback((event) => {
    // Don't interfere with text inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    if (event.key.toLowerCase() === 't') {
      setCameraMode(mode =>
        mode === CAMERA_MODES.FOLLOW ? CAMERA_MODES.FREE : CAMERA_MODES.FOLLOW
      );
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleToggleMode);
    return () => window.removeEventListener('keydown', handleToggleMode);
  }, [handleToggleMode]);

  return {
    camera: cameraRef.current,
    cameraMode,
    setCameraMode,
    getTransform: () => cameraRef.current?.getTransform(),
    getOffset: () => cameraRef.current?.getOffset(),
    screenToWorld: (x, y) => cameraRef.current?.screenToWorld(x, y),
    worldToScreen: (x, z) => cameraRef.current?.worldToScreen(x, z),
  };
}

/**
 * Create a camera follow system (non-React usage)
 */
export function createCameraFollowSystem(options) {
  return new CameraFollowSystem(options);
}
