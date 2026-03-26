/**
 * MobileQuickActions.jsx — Floating quick-access buttons for mobile.
 *
 * Provides fast access to Inventory and Build Mode without
 * navigating through the hamburger menu. Only renders on touch devices.
 */

import React from 'react';
import { isTouchDevice } from '../../utils/deviceDetection';
import useGameStore from '../../stores/useGameStore';

const containerStyle = {
  position: 'fixed',
  left: `max(12px, env(safe-area-inset-left, 0px))`,
  bottom: 200,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  zIndex: 950,
  pointerEvents: 'auto',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const buttonStyle = {
  width: 44,
  height: 44,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(20, 15, 30, 0.55)',
  color: 'rgba(255,255,255,0.8)',
  fontSize: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
};

const MobileQuickActions = () => {
  const buildMode = useGameStore((s) => s.buildMode);
  const isTouch = isTouchDevice();

  if (!isTouch) return null;

  const handleInventory = () => {
    // Toggle inventory visibility via store
    const store = useGameStore.getState();
    // InventoryUI listens to a key press — simulate 'I' key toggle
    store.toggleInventory?.();
  };

  const handleBuild = () => {
    const store = useGameStore.getState();
    if (store.zoneMode) store.setZoneMode(false);
    store.toggleBuildMode();
  };

  return (
    <div style={containerStyle}>
      <button
        style={buttonStyle}
        onTouchStart={(e) => { e.preventDefault(); handleInventory(); }}
        onClick={handleInventory}
        aria-label="Inventory"
      >
        🎒
      </button>
      <button
        style={{
          ...buttonStyle,
          background: buildMode
            ? 'rgba(80, 120, 60, 0.7)'
            : 'rgba(20, 15, 30, 0.55)',
          borderColor: buildMode
            ? 'rgba(120, 180, 80, 0.6)'
            : 'rgba(255,255,255,0.15)',
        }}
        onTouchStart={(e) => { e.preventDefault(); handleBuild(); }}
        onClick={handleBuild}
        aria-label="Build Mode"
      >
        🔨
      </button>
    </div>
  );
};

export default React.memo(MobileQuickActions);
