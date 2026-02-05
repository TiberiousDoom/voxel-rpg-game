/**
 * Crosshair - Simple crosshair for first-person mode
 *
 * Shows crosshair when in first-person (pointer lock) mode
 * Shows hint when not in first-person mode
 */

import React from 'react';
import useGameStore from '../../stores/useGameStore';

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

  // Show hint when not in first-person mode
  if (!firstPerson) {
    return (
      <div style={hintStyle}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Click to enter First-Person Mode</div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>ESC to exit | WASD to move | Mouse to look</div>
      </div>
    );
  }

  const size = 20; // Total crosshair size
  const thickness = 2;
  const gap = 4; // Gap in the center

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
