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

    // Auto-dismiss hint after 8 seconds on mobile
    if (isTouchDevice()) {
      const timer = setTimeout(() => setHintDismissed(true), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Mobile: show tap-to-target hint (dismisses after 8 seconds)
  if (isMobile) {
    if (hintDismissed) return null;
    return (
      <div style={hintStyle}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Tap-to-Target Mode</div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>Tap block to select | Tap again to mine/place</div>
        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>Use Tab to switch Mine/Place</div>
      </div>
    );
  }

  // Desktop: show hint when not in first-person mode
  if (!firstPerson) {
    return (
      <div style={hintStyle}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Press V or Click for First-Person Mode</div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>V or Click to enter | ESC to exit | WASD + Mouse</div>
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
