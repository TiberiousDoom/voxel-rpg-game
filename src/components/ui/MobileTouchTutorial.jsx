/**
 * MobileTouchTutorial.jsx — One-time overlay teaching touch controls.
 *
 * Shows on first mobile play, stores dismissal in localStorage.
 * Tap anywhere to dismiss.
 */

import React, { useState, useEffect } from 'react';
import { isTouchDevice } from '../../utils/deviceDetection';

const STORAGE_KEY = 'mobileTutorialSeen';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(5, 3, 15, 0.92)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  padding: '20px',
  color: '#d0c8e0',
  fontFamily: 'monospace',
  cursor: 'pointer',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const titleStyle = {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#bb88ff',
  marginBottom: 24,
  textTransform: 'uppercase',
  letterSpacing: 2,
};

const listStyle = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  maxWidth: 320,
  width: '100%',
};

const itemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  fontSize: 15,
  lineHeight: 1.4,
};

const iconStyle = {
  fontSize: 24,
  width: 36,
  textAlign: 'center',
  flexShrink: 0,
};

const dismissStyle = {
  marginTop: 32,
  fontSize: 13,
  color: '#888',
  animation: 'pulse 2s ease-in-out infinite',
};

const TIPS = [
  { icon: '👆', text: 'Tap to move' },
  { icon: '⚔️', text: 'Double-tap enemies to attack' },
  { icon: '🔄', text: 'Drag to rotate camera' },
  { icon: '🔍', text: 'Pinch to zoom in/out' },
  { icon: '⛏️', text: 'Long-press blocks to mine' },
  { icon: '🎮', text: 'Use buttons on the right for Jump, Sprint, Dodge' },
  { icon: '🪄', text: 'Tap the spell button (bottom-right) to select spells' },
];

const MobileTouchTutorial = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isTouchDevice() && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={overlayStyle}
      onClick={dismiss}
      onTouchStart={(e) => { e.preventDefault(); dismiss(); }}
    >
      <div style={titleStyle}>Touch Controls</div>

      <ul style={listStyle}>
        {TIPS.map((tip, i) => (
          <li key={i} style={itemStyle}>
            <span style={iconStyle}>{tip.icon}</span>
            <span>{tip.text}</span>
          </li>
        ))}
      </ul>

      <div style={dismissStyle}>Tap anywhere to start playing</div>
    </div>
  );
};

export default React.memo(MobileTouchTutorial);
