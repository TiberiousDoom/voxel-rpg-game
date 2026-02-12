/**
 * PickupTextOverlay — Shows floating "+X material" text when items are picked up.
 * Renders as CSS-animated HTML divs (no WebGL text needed).
 * Each entry floats up and fades out over 2 seconds, then auto-removes.
 */

import React, { useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';

const DURATION = 2000; // ms

const PickupTextOverlay = () => {
  const pickupTexts = useGameStore((state) => state.pickupTexts);
  const removePickupText = useGameStore((state) => state.removePickupText);

  // Auto-remove expired texts
  useEffect(() => {
    if (pickupTexts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      for (const p of pickupTexts) {
        if (now - p.createdAt > DURATION) {
          removePickupText(p.id);
        }
      }
    }, 200);
    return () => clearInterval(timer);
  }, [pickupTexts, removePickupText]);

  if (pickupTexts.length === 0) return null;

  return (
    <div style={styles.container}>
      {pickupTexts.map((p, i) => {
        const age = Date.now() - p.createdAt;
        const progress = Math.min(1, age / DURATION);
        const opacity = 1 - progress;
        const yOffset = progress * 60; // float up 60px

        return (
          <div
            key={p.id}
            style={{
              ...styles.text,
              color: p.color,
              opacity,
              transform: `translateX(-50%) translateY(-${yOffset}px)`,
              bottom: `${280 + i * 28}px`,
            }}
          >
            {p.text}
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    left: '50%',
    bottom: 0,
    zIndex: 100,
    pointerEvents: 'none',
  },
  text: {
    position: 'fixed',
    left: '50%',
    fontFamily: 'monospace',
    fontSize: '18px',
    fontWeight: 'bold',
    textShadow: '0 0 4px #000, 0 0 8px #000, 1px 1px 2px #000',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.1s',
  },
};

export default PickupTextOverlay;
