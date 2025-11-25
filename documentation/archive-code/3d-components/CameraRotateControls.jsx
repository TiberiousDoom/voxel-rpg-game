import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';

/**
 * CameraRotateControls - Handles camera rotation with right-mouse drag
 */
const CameraRotateControls = () => {
  const { gl } = useThree();
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isTouchRotating = useRef(false);

  const updateCamera = useGameStore((state) => state.updateCamera);
  const camera = useGameStore((state) => state.camera);

  useEffect(() => {
    const canvas = gl.domElement;

    // Mouse down handler
    const handleMouseDown = (e) => {
      if (e.button === 2) { // Right mouse button
        isDragging.current = true;
        lastMouseX.current = e.clientX;
        e.preventDefault();
      }
    };

    // Mouse move handler
    const handleMouseMove = (e) => {
      if (isDragging.current) {
        const deltaX = e.clientX - lastMouseX.current;
        lastMouseX.current = e.clientX;

        // Update camera rotation (negative for natural rotation direction)
        const rotationSpeed = 0.005;
        updateCamera({
          rotationAngle: camera.rotationAngle - deltaX * rotationSpeed,
        });

        e.preventDefault();
      }
    };

    // Mouse up handler
    const handleMouseUp = (e) => {
      if (e.button === 2) {
        isDragging.current = false;
      }
    };

    // Touch start handler - for mobile swipe rotation
    const handleTouchStart = (e) => {
      // Two-finger touch for rotation
      if (e.touches.length === 2) {
        isTouchRotating.current = true;
        touchStartX.current = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        touchStartY.current = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        e.preventDefault();
      }
    };

    // Touch move handler
    const handleTouchMove = (e) => {
      if (isTouchRotating.current && e.touches.length === 2) {
        const currentX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const deltaX = currentX - touchStartX.current;
        touchStartX.current = currentX;

        // Update camera rotation
        const rotationSpeed = 0.01;
        updateCamera({
          rotationAngle: camera.rotationAngle - deltaX * rotationSpeed,
        });

        e.preventDefault();
      }
    };

    // Touch end handler
    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        isTouchRotating.current = false;
      }
    };

    // Context menu handler (disable right-click menu)
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('contextmenu', handleContextMenu);

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl, updateCamera, camera.rotationAngle]);

  return null; // This component doesn't render anything
};

export default CameraRotateControls;
