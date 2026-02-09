import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import {
  CAMERA_MIN_DISTANCE,
  CAMERA_MAX_DISTANCE,
  CAMERA_ROTATION_SENSITIVITY,
  TAP_MAX_DURATION_MS,
  TAP_MAX_DISTANCE_PX,
} from '../../data/tuning';

/**
 * CameraRotateControls — Handles camera orbit with pitch + yaw
 *
 * Desktop: right-click drag rotates horizontally (X) and vertically (Y)
 * Mobile:  1-finger drag rotates (with gesture disambiguation vs tap-to-move)
 *          2-finger pinch zooms in/out
 */
const CameraRotateControls = () => {
  const { gl } = useThree();

  // Desktop right-drag state
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);

  // Mobile single-touch state
  const touchId = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const touchMoved = useRef(false); // true once moved > threshold
  const isTouchRotating = useRef(false);

  // Pinch-to-zoom state
  const pinchStartDist = useRef(0);
  const pinchStartCameraDist = useRef(0);
  const isPinching = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;

    // ── helpers ──────────────────────────────────────
    const getCameraState = () => useGameStore.getState().camera;
    const update = useGameStore.getState().updateCamera;

    const clampPitch = (p) => Math.max(-1.05, Math.min(1.05, p)); // ±60°

    // ── Desktop: right-click drag ───────────────────
    const handleMouseDown = (e) => {
      if (e.button === 2) {
        isDragging.current = true;
        lastMouseX.current = e.clientX;
        lastMouseY.current = e.clientY;
        e.preventDefault();
      }
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const cam = getCameraState();

      const deltaX = e.clientX - lastMouseX.current;
      const deltaY = e.clientY - lastMouseY.current;
      lastMouseX.current = e.clientX;
      lastMouseY.current = e.clientY;

      const sensitivity = CAMERA_ROTATION_SENSITIVITY;
      update({
        rotationAngle: cam.rotationAngle - deltaX * sensitivity,
        pitch: clampPitch(cam.pitch + deltaY * sensitivity),
      });

      e.preventDefault();
    };

    const handleMouseUp = (e) => {
      if (e.button === 2) isDragging.current = false;
    };

    // Cancel drag if window loses focus (Alt+Tab, mouse leaves browser, etc.)
    const handleBlur = () => {
      isDragging.current = false;
    };

    // ── Scroll wheel zoom (desktop) ─────────────────
    const handleWheel = (e) => {
      const cam = getCameraState();
      const newDist = Math.max(
        CAMERA_MIN_DISTANCE,
        Math.min(CAMERA_MAX_DISTANCE, cam.distance + e.deltaY * 0.05)
      );
      update({ distance: newDist });
      e.preventDefault();
    };

    // ── Mobile touch ────────────────────────────────
    const touchDist = (t) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Start pinch-to-zoom (cancel any rotation)
        isPinching.current = true;
        isTouchRotating.current = false;
        touchId.current = null;
        pinchStartDist.current = touchDist(e.touches);
        pinchStartCameraDist.current = getCameraState().distance;
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1 && !isPinching.current) {
        // Record start for gesture disambiguation
        const t = e.touches[0];
        touchId.current = t.identifier;
        touchStartX.current = t.clientX;
        touchStartY.current = t.clientY;
        touchStartTime.current = Date.now();
        touchMoved.current = false;
        isTouchRotating.current = false;
        // Don't preventDefault — let it fall through as a potential tap
      }
    };

    const handleTouchMove = (e) => {
      // Pinch-to-zoom
      if (isPinching.current && e.touches.length === 2) {
        const cam = getCameraState();
        const currentDist = touchDist(e.touches);
        const scale = pinchStartDist.current / currentDist;
        const newDist = Math.max(
          CAMERA_MIN_DISTANCE,
          Math.min(CAMERA_MAX_DISTANCE, pinchStartCameraDist.current * scale)
        );
        update({ distance: newDist });
        e.preventDefault();
        return;
      }

      // Single-finger rotation
      if (e.touches.length === 1 && touchId.current !== null) {
        const t = Array.from(e.touches).find((tt) => tt.identifier === touchId.current);
        if (!t) return;

        const dx = t.clientX - touchStartX.current;
        const dy = t.clientY - touchStartY.current;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!touchMoved.current) {
          const elapsed = Date.now() - touchStartTime.current;
          if (dist > TAP_MAX_DISTANCE_PX || elapsed > TAP_MAX_DURATION_MS) {
            // Commit to rotation
            touchMoved.current = true;
            isTouchRotating.current = true;
          } else {
            return; // Still ambiguous — wait
          }
        }

        if (isTouchRotating.current) {
          const cam = getCameraState();
          const deltaX = t.clientX - touchStartX.current;
          const deltaY = t.clientY - touchStartY.current;
          touchStartX.current = t.clientX;
          touchStartY.current = t.clientY;

          const sensitivity = CAMERA_ROTATION_SENSITIVITY * 1.5; // A bit higher for touch
          update({
            rotationAngle: cam.rotationAngle - deltaX * sensitivity,
            pitch: clampPitch(cam.pitch + deltaY * sensitivity),
          });

          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        isPinching.current = false;
      }
      if (e.touches.length === 0) {
        isTouchRotating.current = false;
        touchId.current = null;
      }
    };

    const handleContextMenu = (e) => {
      // Prevent context menu when right-click-dragging or when right-click is on the canvas
      if (isDragging.current || e.target === canvas) {
        e.preventDefault();
      }
    };

    // ── Register ─────────────────────────────────────
    // mousedown on canvas (only start drag from game area)
    canvas.addEventListener('mousedown', handleMouseDown);
    // mousemove/mouseup on document so drag continues even if cursor leaves canvas
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    // Prevent context menu on document while dragging (covers cursor outside canvas)
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleBlur);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gl]);

  return null;
};

export default CameraRotateControls;
