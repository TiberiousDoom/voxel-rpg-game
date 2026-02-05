/**
 * FirstPersonControls - Handles pointer lock and first-person mouse look
 *
 * Press V to toggle first-person mode
 * In first-person: mouse controls camera (requires pointer lock)
 * ESC or V to exit first-person mode
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

  // Store canvas reference once gl is ready
  useEffect(() => {
    if (gl && gl.domElement) {
      canvasRef.current = gl.domElement;
    }
  }, [gl]);

  // Handle mouse movement - only works with pointer lock
  const handleMouseMove = useCallback(
    (event) => {
      // Only handle mouse movement when pointer is locked
      if (!isLockedRef.current) return;

      const { movementX, movementY } = event;
      const currentCamera = useGameStore.getState().camera;

      const newYaw = currentCamera.yaw - movementX * MOUSE_SENSITIVITY;
      let newPitch = currentCamera.pitch - movementY * MOUSE_SENSITIVITY;
      newPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, newPitch));

      updateCamera({ yaw: newYaw, pitch: newPitch });
    },
    [updateCamera]
  );

  // Handle pointer lock change events
  const handlePointerLockChange = useCallback(() => {
    const lockedElement = document.pointerLockElement;
    const isLocked = lockedElement && lockedElement.tagName === 'CANVAS';
    isLockedRef.current = isLocked;

    // Exit first-person mode when pointer lock is lost
    if (!isLocked) {
      updateCamera({ firstPerson: false });
    }
  }, [updateCamera]);

  // Handle V key press - toggle first-person mode
  const handleKeyDown = useCallback(
    (event) => {
      if (event.code === 'KeyV' && !event.repeat) {
        event.preventDefault();

        const currentFirstPerson = useGameStore.getState().camera.firstPerson;

        // If already in FPS mode, exit
        if (currentFirstPerson) {
          isLockedRef.current = false;
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          updateCamera({ firstPerson: false });
          return;
        }

        // Enter FPS mode - request pointer lock
        const canvas = canvasRef.current || document.querySelector('canvas');

        if (canvas && canvas.requestPointerLock) {
          try {
            const result = canvas.requestPointerLock();
            if (result && typeof result.then === 'function') {
              result.then(() => {
                updateCamera({ firstPerson: true });
              }).catch(() => {
                // Pointer lock failed - stay in third-person
                console.warn('Pointer lock not available');
              });
            } else {
              // Old API - check if lock succeeded after a tick
              setTimeout(() => {
                if (document.pointerLockElement === canvas) {
                  updateCamera({ firstPerson: true });
                }
              }, 100);
            }
          } catch {
            // Pointer lock failed
            console.warn('Pointer lock not available');
          }
        }
      }
    },
    [updateCamera]
  );

  // Setup event listeners
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    canvasRef.current = canvas;

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);

      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [gl.domElement, handlePointerLockChange, handleMouseMove, handleKeyDown]);

  return null;
};

export default FirstPersonControls;
