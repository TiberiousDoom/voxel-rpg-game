/**
 * FirstPersonControls - Handles pointer lock and first-person mouse look
 *
 * Press V to toggle first-person mode
 * In first-person: mouse controls camera (with pointer lock if available)
 * In first-person without pointer lock: right-drag to look around
 * ESC or V to exit first-person mode
 */

import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';

// Sensitivity settings
const MOUSE_SENSITIVITY = 0.002;
const DRAG_SENSITIVITY = 0.005;
const PITCH_LIMIT = Math.PI / 2 - 0.1; // Slightly less than 90 degrees

const FirstPersonControls = () => {
  const { gl } = useThree();
  const isLockedRef = useRef(false);
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const softFPSMode = useRef(false); // FPS mode without pointer lock

  const updateCamera = useGameStore((state) => state.updateCamera);
  const cameraState = useGameStore((state) => state.camera);

  // Store canvas reference once gl is ready
  useEffect(() => {
    if (gl && gl.domElement) {
      canvasRef.current = gl.domElement;
    }
  }, [gl]);

  // Handle mouse movement - works for both pointer lock and drag mode
  const handleMouseMove = useCallback(
    (event) => {
      const firstPerson = useGameStore.getState().camera.firstPerson;

      // In pointer lock mode
      if (isLockedRef.current) {
        const { movementX, movementY } = event;
        const currentCamera = useGameStore.getState().camera;

        const newYaw = currentCamera.yaw - movementX * MOUSE_SENSITIVITY;
        let newPitch = currentCamera.pitch - movementY * MOUSE_SENSITIVITY;
        newPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, newPitch));

        updateCamera({ yaw: newYaw, pitch: newPitch });
        return;
      }

      // In soft FPS mode with dragging
      if (firstPerson && isDraggingRef.current) {
        const { movementX, movementY } = event;
        const currentCamera = useGameStore.getState().camera;

        const newYaw = currentCamera.yaw - movementX * DRAG_SENSITIVITY;
        let newPitch = currentCamera.pitch - movementY * DRAG_SENSITIVITY;
        newPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, newPitch));

        updateCamera({ yaw: newYaw, pitch: newPitch });
      }
    },
    [updateCamera]
  );

  // Handle pointer lock change events
  const handlePointerLockChange = useCallback(() => {
    const lockedElement = document.pointerLockElement;
    const isLocked = lockedElement && lockedElement.tagName === 'CANVAS';
    isLockedRef.current = isLocked;

    // If we lost pointer lock but were in soft FPS mode, stay in FPS mode
    if (!isLocked && !softFPSMode.current) {
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
          softFPSMode.current = false;
          isLockedRef.current = false;
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          updateCamera({ firstPerson: false });
          return;
        }

        // Enter FPS mode
        const canvas = canvasRef.current || document.querySelector('canvas');

        // Try pointer lock first
        if (canvas && canvas.requestPointerLock) {
          try {
            const result = canvas.requestPointerLock();
            if (result && typeof result.then === 'function') {
              result.then(() => {
                softFPSMode.current = false;
                updateCamera({ firstPerson: true });
              }).catch(() => {
                // Pointer lock failed, use soft mode
                console.log('Pointer lock unavailable, using soft FPS mode');
                softFPSMode.current = true;
                updateCamera({ firstPerson: true });
              });
            } else {
              // Old API - check if lock succeeded after a tick
              setTimeout(() => {
                if (document.pointerLockElement === canvas) {
                  softFPSMode.current = false;
                } else {
                  softFPSMode.current = true;
                }
                updateCamera({ firstPerson: true });
              }, 100);
            }
          } catch {
            // Pointer lock failed, use soft mode
            softFPSMode.current = true;
            updateCamera({ firstPerson: true });
          }
        } else {
          // No pointer lock support, use soft mode
          softFPSMode.current = true;
          updateCamera({ firstPerson: true });
        }
      }
    },
    [updateCamera]
  );

  // Handle mouse down for drag-to-look in soft FPS mode
  const handleMouseDown = useCallback((event) => {
    const firstPerson = useGameStore.getState().camera.firstPerson;
    // Right mouse button or left button in soft FPS mode
    if (firstPerson && softFPSMode.current && event.button === 0) {
      isDraggingRef.current = true;
    }
  }, []);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Setup event listeners
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    canvasRef.current = canvas;

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);

      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [gl.domElement, handlePointerLockChange, handleMouseMove, handleKeyDown, handleMouseDown, handleMouseUp]);

  return null;
};

export default FirstPersonControls;
