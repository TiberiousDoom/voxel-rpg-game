/**
 * ZoneDesignator.jsx - UI for designating zones in the game world
 *
 * Provides a toolbar for selecting zone types and manages click-drag
 * placement. Integrates with useSettlementStore for state and
 * ZoneManager for zone creation.
 */
import React, { useState, useCallback } from 'react';
import useSettlementStore from '../../stores/useSettlementStore.js';
import { ZONE_TYPES } from '../../modules/settlement/ZoneManager.js';

const ZONE_TYPE_CONFIG = {
  [ZONE_TYPES.MINING]: {
    label: 'Mining',
    color: '#FFA500',
    description: 'NPCs will mine blocks in this area',
    icon: 'M',
  },
  [ZONE_TYPES.STOCKPILE]: {
    label: 'Stockpile',
    color: '#4187FF',
    description: 'Resources are stored here',
    icon: 'S',
  },
  [ZONE_TYPES.FARMING]: {
    label: 'Farming',
    color: '#32CD32',
    description: 'NPCs will plant and harvest crops',
    icon: 'F',
  },
  [ZONE_TYPES.BUILDING]: {
    label: 'Building',
    color: '#FFDC32',
    description: 'Reserved for construction',
    icon: 'B',
  },
  [ZONE_TYPES.RESTRICTED]: {
    label: 'Restricted',
    color: '#DC3232',
    description: 'NPCs will avoid this area',
    icon: 'X',
  },
};

const styles = {
  container: {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    zIndex: 100,
    pointerEvents: 'auto',
  },
  toolbar: {
    display: 'flex',
    gap: '4px',
    background: 'rgba(0, 0, 0, 0.8)',
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  zoneButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '6px 10px',
    border: '2px solid transparent',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: 'monospace',
    minWidth: '56px',
    transition: 'all 0.15s ease',
  },
  zoneButtonActive: {
    border: '2px solid',
    background: 'rgba(255, 255, 255, 0.2)',
  },
  icon: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: '6px 16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    background: 'rgba(220, 50, 50, 0.6)',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  hint: {
    background: 'rgba(0, 0, 0, 0.7)',
    padding: '4px 12px',
    borderRadius: '4px',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
};

/**
 * ZoneDesignator component
 *
 * @param {Object} props
 * @param {Function} props.onCreateZone - Callback when zone is finalized: (type, bounds) => void
 * @param {Function} props.onCancel - Callback when zone designation is cancelled
 * @param {boolean} props.visible - Whether the designator toolbar is visible
 */
function ZoneDesignator({ onCreateZone, onCancel, visible = true }) {
  const {
    zoneDesignatorActive,
    zoneDesignatorType,
    setZoneDesignatorActive,
  } = useSettlementStore();

  const [hoveredType, setHoveredType] = useState(null);

  const handleSelectType = useCallback((type) => {
    if (zoneDesignatorType === type) {
      // Deselect
      setZoneDesignatorActive(false, null);
    } else {
      setZoneDesignatorActive(true, type);
    }
  }, [zoneDesignatorType, setZoneDesignatorActive]);

  const handleCancel = useCallback(() => {
    setZoneDesignatorActive(false, null);
    if (onCancel) onCancel();
  }, [setZoneDesignatorActive, onCancel]);

  if (!visible) return null;

  const activeConfig = zoneDesignatorType ? ZONE_TYPE_CONFIG[zoneDesignatorType] : null;

  return (
    <div style={styles.container}>
      {/* Hint text */}
      {zoneDesignatorActive && activeConfig && (
        <div style={styles.hint}>
          Click and drag to designate a {activeConfig.label.toLowerCase()} zone. Press Escape to cancel.
        </div>
      )}

      {/* Zone type toolbar */}
      <div style={styles.toolbar}>
        {Object.entries(ZONE_TYPE_CONFIG).map(([type, config]) => {
          const isActive = zoneDesignatorType === type;
          const isHovered = hoveredType === type;

          return (
            <button
              key={type}
              style={{
                ...styles.zoneButton,
                ...(isActive ? {
                  ...styles.zoneButtonActive,
                  borderColor: config.color,
                } : {}),
                ...(isHovered && !isActive ? {
                  background: 'rgba(255, 255, 255, 0.15)',
                } : {}),
              }}
              onClick={() => handleSelectType(type)}
              onMouseEnter={() => setHoveredType(type)}
              onMouseLeave={() => setHoveredType(null)}
              title={config.description}
            >
              <div style={{
                ...styles.icon,
                backgroundColor: config.color + (isActive ? '' : '80'),
              }}>
                {config.icon}
              </div>
              <span>{config.label}</span>
            </button>
          );
        })}

        {/* Cancel button when active */}
        {zoneDesignatorActive && (
          <button
            style={styles.cancelButton}
            onClick={handleCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default ZoneDesignator;
