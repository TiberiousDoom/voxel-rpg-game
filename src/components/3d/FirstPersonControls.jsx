/**
 * FirstPersonControls - Handles pointer lock and first-person mouse look
 *
 * Press V to toggle first-person mode (pointer lock)
 * Or click canvas while holding V to enter
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
  const wantsFPSMode = useRef(false); // Track if user wants to enter FPS mode

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
    wantsFPSMode.current = false; // Reset the flag

    updateCamera({ firstPerson: isLocked });
  }, [updateCamera]);

  // Request pointer lock - called from click handler
  const requestPointerLockOnCanvas = useCallback(async (canvas) => {
    if (!canvas) return false;

    // Debug: Log canvas info
    console.log('Requesting pointer lock on:', canvas.tagName, canvas.ownerDocument === document);

    try {
      // Try the standard API
      if (canvas.requestPointerLock) {
        await canvas.requestPointerLock();
        return true;
      }
    } catch (error) {
      console.warn('Pointer lock failed:', error.message);

      // If it fails, try updating state manually for a "soft" FPS mode
      // This won't lock the pointer but will switch the camera
      updateCamera({ firstPerson: true });
      return false;
    }
    return false;
  }, [updateCamera]);

  // Handle V key press - toggle or prepare for FPS mode
  const handleKeyDown = useCallback(
    (event) => {
      if (event.code === 'KeyV' && !event.repeat) {
        event.preventDefault();

        // If already in FPS mode, exit
        if (isLockedRef.current || document.pointerLockElement) {
          document.exitPointerLock();
          return;
        }

        // Set flag - next click will enter FPS mode
        // Also try direct request (works in some browsers)
        wantsFPSMode.current = true;

        // Try direct pointer lock (may fail in some browsers)
        const canvas = canvasRef.current || document.querySelector('canvas');
        if (canvas) {
          requestPointerLockOnCanvas(canvas);
        }
      }
    },
    [requestPointerLockOnCanvas]
  );

  // Handle click on canvas - enter FPS mode if V was pressed or directly
  const handleCanvasClick = useCallback(
    async (event) => {
      // If already locked, don't do anything
      if (isLockedRef.current || document.pointerLockElement) return;

      // Get the canvas from the event target
      const canvas = event.target;
      if (canvas && canvas.tagName === 'CANVAS') {
        // Click always enters FPS mode (simpler UX)
        await requestPointerLockOnCanvas(canvas);
      }
    },
    [requestPointerLockOnCanvas]
  );

  // Setup event listeners
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    canvasRef.current = canvas;

    // Add event listeners
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      // Cleanup
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('click', handleCanvasClick);

      // Exit pointer lock on unmount
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [gl.domElement, handlePointerLockChange, handleMouseMove, handleKeyDown, handleCanvasClick]);

  return null; // This component doesn't render anything
};

export default FirstPersonControls;
