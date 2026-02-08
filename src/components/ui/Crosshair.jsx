/**
 * Crosshair - Simple crosshair for first-person mode
 *
 * Desktop: Shows crosshair in first-person mode, hint when not
 * Mobile: Shows tap-to-target hint (no crosshair needed)
 */

import React, { useState, useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';
import { isTouchDevice } from '../../utils/deviceDetection';

const crosshairStyle = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
  zIndex: 1000,
};

const crosshairLineStyle = {
  position: 'absolute',
  backgroundColor: 'white',
  boxShadow: '0 0 2px black',
};

const hintStyle = {
  position: 'fixed',
  top: '45%',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  padding: '12px 20px',
  borderRadius: '8px',
  fontFamily: 'sans-serif',
  fontSize: '14px',
  textAlign: 'center',
  pointerEvents: 'none',
  zIndex: 1000,
};

const Crosshair = () => {
  const firstPerson = useGameStore((state) => state.camera.firstPerson);
  const [isMobile, setIsMobile] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  // Check for mobile on mount
  useEffect(() => {
    setIsMobile(isTouchDevice());
  }, []);

  // Auto-dismiss all hints after 6 seconds
  useEffect(() => {
    if (isMobile || firstPerson) return;
    setHintDismissed(false);
    const timer = setTimeout(() => setHintDismissed(true), 6000);
    return () => clearTimeout(timer);
  }, [isMobile, firstPerson]);

  // Mobile: no crosshair or hint needed (controls hint is in GameUI)
  if (isMobile) {
    return null;
  }

  // Desktop third-person: show brief toast hint, then auto-dismiss
  if (!firstPerson) {
    if (hintDismissed) return null;
    return (
      <div style={{
        ...hintStyle,
        transition: 'opacity 0.5s',
        opacity: 1,
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Press V for First-Person Mode</div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>V to toggle | WASD to move | Drag to look</div>
      </div>
    );
  }

  // Desktop first-person: show crosshair
  const size = 20;
  const thickness = 2;
  const gap = 4;

  return (
    <div style={crosshairStyle}>
      {/* Top */}
      <div
        style={{
          ...crosshairLineStyle,
          width: thickness,
          height: (size - gap) / 2,
          left: -thickness / 2,
          top: -size / 2,
        }}
      />
      {/* Bottom */}
      <div
        style={{
          ...crosshairLineStyle,
          width: thickness,
          height: (size - gap) / 2,
          left: -thickness / 2,
          bottom: -size / 2,
        }}
      />
      {/* Left */}
      <div
        style={{
          ...crosshairLineStyle,
          width: (size - gap) / 2,
          height: thickness,
          top: -thickness / 2,
          left: -size / 2,
        }}
      />
      {/* Right */}
      <div
        style={{
          ...crosshairLineStyle,
          width: (size - gap) / 2,
          height: thickness,
          top: -thickness / 2,
          right: -size / 2,
        }}
      />
      {/* Center dot */}
      <div
        style={{
          position: 'absolute',
          width: 2,
          height: 2,
          backgroundColor: 'white',
          borderRadius: '50%',
          left: -1,
          top: -1,
          boxShadow: '0 0 2px black',
        }}
      />
    </div>
  );
};

export default Crosshair;
