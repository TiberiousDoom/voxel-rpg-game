/**
 * ZoneHotbar - Zone type selector shown when zone mode is active.
 * Fixed bottom-center, dark semi-transparent background.
 */

import React, { useState, useEffect } from 'react';
import useGameStore from '../../stores/useGameStore';
import { ZoneType, ZONE_COLORS } from '../../data/zoneTypes';
import { ZONE_MAX_COUNT } from '../../data/tuning';

const DELETE_TYPE = '__DELETE__';

const ZONE_BUTTONS = [
  { type: ZoneType.MINING, label: 'Mining', icon: '\u26CF' },
  { type: ZoneType.STOCKPILE, label: 'Stockpile', icon: '\uD83D\uDCE6' },
  { type: DELETE_TYPE, label: 'Delete', icon: '\uD83D\uDDD1' },
];

export default function ZoneHotbar() {
  const zoneMode = useGameStore((state) => state.zoneMode);
  const zoneTypeToPlace = useGameStore((state) => state.zoneTypeToPlace);
  const zoneCount = useGameStore((state) => state.zones.length);
  const setZoneMode = useGameStore((state) => state.setZoneMode);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!zoneMode) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? '10px' : '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.75)',
        borderRadius: '10px',
        padding: isMobile ? '8px 12px' : '10px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 200,
        pointerEvents: 'all',
        border: '2px solid rgba(255, 140, 0, 0.5)',
        minWidth: isMobile ? '260px' : '320px',
      }}
    >
      {/* Zone type buttons + close on mobile */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {ZONE_BUTTONS.map(({ type, label, icon }) => {
          const isDelete = type === DELETE_TYPE;
          const colors = isDelete ? { fill: '#cc3333', border: '#ff4444' } : ZONE_COLORS[type];
          const isSelected = zoneTypeToPlace === type;
          return (
            <button
              key={type}
              onClick={() => {
                if (isDelete) {
                  // Toggle delete mode — clear any drag in progress
                  useGameStore.getState().clearZoneDrag();
                  setZoneMode(true, isSelected ? ZoneType.MINING : DELETE_TYPE);
                } else {
                  setZoneMode(true, type);
                }
              }}
              style={{
                background: isSelected ? colors.fill : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: `2px solid ${isSelected ? colors.border : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: '6px',
                padding: isMobile ? '6px 12px' : '8px 16px',
                fontSize: isMobile ? '0.85rem' : '0.95rem',
                fontWeight: isSelected ? 'bold' : 'normal',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                touchAction: 'manipulation',
                minHeight: isMobile ? '44px' : 'auto',
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={() => setZoneMode(false)}
            aria-label="Exit zone mode"
            style={{
              background: '#cc3333',
              color: '#fff',
              border: '2px solid #ff4444',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              touchAction: 'manipulation',
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Zone count */}
      <div style={{
        fontSize: isMobile ? '0.75rem' : '0.8rem',
        color: zoneCount >= ZONE_MAX_COUNT ? '#ff6666' : '#aaaaaa',
      }}>
        {zoneCount}/{ZONE_MAX_COUNT} zones
      </div>

      {/* Instructions */}
      <div style={{
        fontSize: isMobile ? '0.65rem' : '0.7rem',
        color: '#888888',
        textAlign: 'center',
        lineHeight: '1.4',
      }}>
        {isMobile
          ? 'Tap two corners to place zone'
          : 'Click & drag or click two corners | Right-click or Delete tool to remove | Z to exit'
        }
      </div>
    </div>
  );
}
