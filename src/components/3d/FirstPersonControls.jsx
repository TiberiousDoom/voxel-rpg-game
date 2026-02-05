/**
 * FirstPersonControls - Handles pointer lock and first-person mouse look
 *
 * Click canvas to enter first-person mode (pointer lock)
 * ESC to exit pointer lock
 * Mouse movement controls camera pitch and yaw
 */

import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';

// Sensitivity settings
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI / 2 - 0.1; // Slightly less than 90 degrees

const FirstPersonControls = () => {
  const { gl } = useThree();
  const isLockedRef = useRef(false);
  const canvasRef = useRef(null);

  const updateCamera = useGameStore((state) => state.updateCamera);
  const cameraState = useGameStore((state) => state.camera);

  // Store canvas reference once gl is ready
  useEffect(() => {
    if (gl && gl.domElement) {
      canvasRef.current = gl.domElement;
    }
  }, [gl]);

  // Handle mouse movement when pointer is locked
  const handleMouseMove = useCallback(
    (event) => {
      if (!isLockedRef.current) return;

      const { movementX, movementY } = event;

      // Update yaw (horizontal) and pitch (vertical)
      const newYaw = cameraState.yaw - movementX * MOUSE_SENSITIVITY;
      let newPitch = cameraState.pitch - movementY * MOUSE_SENSITIVITY;

      // Clamp pitch to prevent flipping
      newPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, newPitch));

      updateCamera({
        yaw: newYaw,
        pitch: newPitch,
      });
    },
    [cameraState.yaw, cameraState.pitch, updateCamera]
  );

  // Handle pointer lock change events
  const handlePointerLockChange = useCallback(() => {
    // Check if pointer is locked to any canvas
    const lockedElement = document.pointerLockElement;
    const isLocked = lockedElement && lockedElement.tagName === 'CANVAS';
    isLockedRef.current = isLocked;

    updateCamera({ firstPerson: isLocked });
  }, [updateCamera]);

  // Get the actual canvas element from the document
  const getCanvasElement = useCallback(() => {
    // First try our cached reference
    if (canvasRef.current && canvasRef.current.ownerDocument === document) {
      return canvasRef.current;
    }
    // Fallback: query the canvas directly from DOM
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvasRef.current = canvas;
      return canvas;
    }
    return null;
  }, []);

  // Request pointer lock on click - using Promise API for better error handling
  const handleClick = useCallback(async () => {
    // Get the actual canvas element
    const canvas = getCanvasElement();
    if (!canvas) {
      console.warn('Canvas element not found');
      return;
    }

    // Check if already locked
    if (isLockedRef.current || document.pointerLockElement === canvas) return;

    // Ensure document is focused
    if (!document.hasFocus()) {
      window.focus();
    }

    try {
      // Use the Promise-based API if available
      if (canvas.requestPointerLock) {
        const result = canvas.requestPointerLock();
        // Handle both Promise and non-Promise implementations
        if (result && result.catch) {
          await result;
        }
      }
    } catch (error) {
      console.warn('Pointer lock request failed:', error.message || error);
      // Don't update state on error - let user try again
    }
  }, [getCanvasElement]);

  // Setup event listeners
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    canvasRef.current = canvas;

    // Add event listeners
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      // Cleanup
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);

      // Exit pointer lock on unmount
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [gl.domElement, handlePointerLockChange, handleMouseMove, handleClick]);

  return null; // This component doesn't render anything
};

export default FirstPersonControls;
