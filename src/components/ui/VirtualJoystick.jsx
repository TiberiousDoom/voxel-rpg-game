/**
 * VirtualJoystick.jsx — Touch-based virtual joystick for mobile movement.
 *
 * Renders a fixed joystick in the bottom-left corner. Writes to the same
 * _keys object as keyboard input via setVirtualKey(). Camera-relative
 * movement is handled by Player.jsx (already converts keys to camera space).
 *
 * Push to edge = auto-sprint. Only renders on touch devices.
 */

import React, { useState, useRef, useCallback } from 'react';
import { isTouchDevice } from '../../utils/deviceDetection';
import { setVirtualKey } from '../../hooks/useKeyboard';

const BASE_SIZE = 120;
const THUMB_SIZE = 48;
const DEAD_ZONE = 0.25;
const SPRINT_THRESHOLD = 0.8;

const containerStyle = {
  position: 'fixed',
  bottom: `max(20px, env(safe-area-inset-bottom, 0px))`,
  left: `max(20px, env(safe-area-inset-left, 0px))`,
  width: BASE_SIZE + 40, // Touch zone larger than visual
  height: BASE_SIZE + 40,
  zIndex: 960,
  pointerEvents: 'auto',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const baseStyle = {
  position: 'absolute',
  bottom: 20,
  left: 20,
  width: BASE_SIZE,
  height: BASE_SIZE,
  borderRadius: '50%',
  background: 'rgba(20, 15, 30, 0.4)',
  border: '2px solid rgba(255, 255, 255, 0.15)',
};

const thumbBaseStyle = {
  position: 'absolute',
  width: THUMB_SIZE,
  height: THUMB_SIZE,
  borderRadius: '50%',
  background: 'rgba(100, 80, 160, 0.6)',
  border: '2px solid rgba(200, 180, 255, 0.4)',
  transform: 'translate(-50%, -50%)',
  transition: 'none',
};

const VirtualJoystick = () => {
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const touchIdRef = useRef(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const isTouch = isTouchDevice();

  const releaseAllKeys = useCallback(() => {
    setVirtualKey('forward', false);
    setVirtualKey('backward', false);
    setVirtualKey('left', false);
    setVirtualKey('right', false);
    setVirtualKey('run', false);
  }, []);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (touchIdRef.current !== null) return; // Already tracking a touch

    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;

    // Center = middle of the base circle
    const rect = e.currentTarget.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + 20 + BASE_SIZE / 2,
      y: rect.top + 20 + BASE_SIZE / 2,
    };

    setActive(true);
    setThumbPos({ x: 0, y: 0 });
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== touchIdRef.current) continue;

      const dx = touch.clientX - centerRef.current.x;
      const dy = touch.clientY - centerRef.current.y;
      const maxRadius = BASE_SIZE / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const magnitude = Math.min(1, dist / maxRadius);

      // Clamp thumb to base radius
      const clampedX = magnitude > 0 ? (dx / dist) * Math.min(dist, maxRadius) : 0;
      const clampedY = magnitude > 0 ? (dy / dist) * Math.min(dist, maxRadius) : 0;
      setThumbPos({ x: clampedX, y: clampedY });

      // Normalize to -1..1 range
      const nx = clampedX / maxRadius;
      const ny = clampedY / maxRadius;

      // Set keys based on joystick position (with dead zone)
      setVirtualKey('forward', ny < -DEAD_ZONE);
      setVirtualKey('backward', ny > DEAD_ZONE);
      setVirtualKey('left', nx < -DEAD_ZONE);
      setVirtualKey('right', nx > DEAD_ZONE);

      // Auto-sprint when pushed to edge
      setVirtualKey('run', magnitude > SPRINT_THRESHOLD);
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setActive(false);
        setThumbPos({ x: 0, y: 0 });
        releaseAllKeys();
        break;
      }
    }
  }, [releaseAllKeys]);

  if (!isTouch) return null;

  const thumbCenterX = 20 + BASE_SIZE / 2 + thumbPos.x;
  const thumbCenterY = 20 + BASE_SIZE / 2 + thumbPos.y;

  return (
    <div
      style={containerStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Base circle */}
      <div style={{
        ...baseStyle,
        borderColor: active ? 'rgba(160, 140, 220, 0.4)' : 'rgba(255, 255, 255, 0.15)',
      }} />

      {/* Thumb stick */}
      <div style={{
        ...thumbBaseStyle,
        left: thumbCenterX,
        top: thumbCenterY,
        background: active ? 'rgba(140, 100, 220, 0.7)' : 'rgba(100, 80, 160, 0.6)',
        borderColor: active ? 'rgba(220, 200, 255, 0.5)' : 'rgba(200, 180, 255, 0.4)',
      }} />
    </div>
  );
};

export default React.memo(VirtualJoystick);
