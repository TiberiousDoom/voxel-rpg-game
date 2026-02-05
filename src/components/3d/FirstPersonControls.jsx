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

  const updateCamera = useGameStore((state) => state.updateCamera);
  const cameraState = useGameStore((state) => state.camera);

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
    const isLocked = document.pointerLockElement === gl.domElement;
    isLockedRef.current = isLocked;

    updateCamera({ firstPerson: isLocked });
  }, [gl.domElement, updateCamera]);

  // Handle pointer lock error
  const handlePointerLockError = useCallback(() => {
    console.warn('Pointer lock failed');
    isLockedRef.current = false;
    updateCamera({ firstPerson: false });
  }, [updateCamera]);

  // Request pointer lock on click
  const handleClick = useCallback(() => {
    if (!isLockedRef.current && gl.domElement) {
      gl.domElement.requestPointerLock();
    }
  }, [gl.domElement]);

  // Setup event listeners
  useEffect(() => {
    const canvas = gl.domElement;

    // Add event listeners
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    document.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      // Cleanup
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      document.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);

      // Exit pointer lock on unmount
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [gl.domElement, handlePointerLockChange, handlePointerLockError, handleMouseMove, handleClick]);

  return null; // This component doesn't render anything
};

export default FirstPersonControls;
