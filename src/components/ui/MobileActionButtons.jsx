/**
 * MobileActionButtons.jsx — On-screen action buttons for touch devices.
 *
 * Provides Jump, Sprint, Interact (E), and Dodge buttons that inject
 * virtual key states into the keyboard system. Only renders on touch devices.
 */

import React, { useState, useCallback, useRef } from 'react';
import { isTouchDevice } from '../../utils/deviceDetection';
import { setVirtualKey } from '../../hooks/useKeyboard';
import useGameStore from '../../stores/useGameStore';

const BUTTON_SIZE = 48;
const GAP = 8;

const containerStyle = {
  position: 'fixed',
  bottom: `max(100px, calc(80px + env(safe-area-inset-bottom, 0px)))`,
  right: `max(12px, env(safe-area-inset-right, 0px))`,
  display: 'grid',
  gridTemplateColumns: `${BUTTON_SIZE}px ${BUTTON_SIZE}px`,
  gap: GAP,
  zIndex: 950,
  pointerEvents: 'auto',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const buttonStyle = {
  width: BUTTON_SIZE,
  height: BUTTON_SIZE,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(20, 15, 30, 0.6)',
  color: 'rgba(255,255,255,0.8)',
  fontSize: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
};

const activeStyle = {
  ...buttonStyle,
  background: 'rgba(80, 60, 140, 0.7)',
  borderColor: 'rgba(160, 120, 220, 0.6)',
};

const MobileActionButtons = () => {
  const [sprintActive, setSprintActive] = useState(false);
  const jumpTimeout = useRef(null);
  const isTouch = isTouchDevice();

  const handleJump = useCallback(() => {
    setVirtualKey('jump', true);
    // Release after one frame (~16ms) so it's a single press
    clearTimeout(jumpTimeout.current);
    jumpTimeout.current = setTimeout(() => setVirtualKey('jump', false), 50);
  }, []);

  const handleSprint = useCallback(() => {
    setSprintActive((prev) => {
      const next = !prev;
      setVirtualKey('run', next);
      return next;
    });
  }, []);

  const handleInteract = useCallback(() => {
    // Call the E-key useBlock handler
    const store = useGameStore.getState();
    if (store.useBlock) {
      store.useBlock();
    }
  }, []);

  const handleDodge = useCallback(() => {
    // Simulate rapid double-tap space for dodge roll
    setVirtualKey('jump', true);
    setTimeout(() => {
      setVirtualKey('jump', false);
      setTimeout(() => {
        setVirtualKey('jump', true);
        setTimeout(() => setVirtualKey('jump', false), 50);
      }, 50);
    }, 50);
  }, []);

  if (!isTouch) return null;

  return (
    <div style={containerStyle}>
      {/* Row 1: Jump + Sprint */}
      <button
        style={buttonStyle}
        onTouchStart={(e) => { e.preventDefault(); handleJump(); }}
        onClick={handleJump}
        aria-label="Jump"
      >
        ⬆
      </button>
      <button
        style={sprintActive ? activeStyle : buttonStyle}
        onTouchStart={(e) => { e.preventDefault(); handleSprint(); }}
        onClick={handleSprint}
        aria-label="Sprint"
      >
        🏃
      </button>

      {/* Row 2: Interact + Dodge */}
      <button
        style={buttonStyle}
        onTouchStart={(e) => { e.preventDefault(); handleInteract(); }}
        onClick={handleInteract}
        aria-label="Interact"
      >
        E
      </button>
      <button
        style={buttonStyle}
        onTouchStart={(e) => { e.preventDefault(); handleDodge(); }}
        onClick={handleDodge}
        aria-label="Dodge"
      >
        💨
      </button>
    </div>
  );
};

export default React.memo(MobileActionButtons);
