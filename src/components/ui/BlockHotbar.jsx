/**
 * BlockHotbar - UI for selecting block types and toggling placement mode
 */

import React, { useEffect, useRef } from 'react';
import useGameStore from '../../stores/useGameStore';
import { BlockTypes, BlockProperties } from '../../systems/chunks/blockTypes';
import { isTouchDevice } from '../../utils/deviceDetection';
import { getPlacementCost } from '../../data/blockDrops';

/** How many of a block the player can afford to place right now. */
function countPlaceable(blockType, materials) {
  const cost = getPlacementCost(blockType);
  if (!cost) return 0;
  let count = Infinity;
  for (const [mat, qty] of Object.entries(cost)) {
    count = Math.min(count, Math.floor((materials?.[mat] || 0) / qty));
  }
  return Number.isFinite(count) ? count : 0;
}

// Blocks available in the hotbar
const HOTBAR_BLOCKS = [
  BlockTypes.DIRT,
  BlockTypes.GRASS,
  BlockTypes.STONE,
  BlockTypes.SAND,
  BlockTypes.SNOW,
  BlockTypes.WOOD,
  BlockTypes.LEAVES,
  BlockTypes.GRAVEL,
  BlockTypes.COAL_ORE,
  BlockTypes.CAMPFIRE,
];

/**
 * Convert RGB array [0-1] to CSS color
 */
function rgbToCSS(rgb) {
  const r = Math.round(rgb[0] * 255);
  const g = Math.round(rgb[1] * 255);
  const b = Math.round(rgb[2] * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function BlockHotbar() {
  const selectedBlockType = useGameStore((state) => state.selectedBlockType);
  const blockPlacementMode = useGameStore((state) => state.blockPlacementMode);
  const buildMode = useGameStore((state) => state.buildMode);
  const materials = useGameStore((state) => state.inventory.materials);
  const setSelectedBlockType = useGameStore((state) => state.setSelectedBlockType);
  const toggleBlockPlacementMode = useGameStore((state) => state.toggleBlockPlacementMode);
  const isMobile = useRef(isTouchDevice());

  // Keyboard shortcuts (number keys for block selection only)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Number keys to select blocks (when not focused on input)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const keyIndex = parseInt(e.key, 10);
      if (keyIndex >= 1 && keyIndex <= HOTBAR_BLOCKS.length) {
        setSelectedBlockType(HOTBAR_BLOCKS[keyIndex - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedBlockType]);

  // Only show when build mode is active
  if (!buildMode) return null;

  const exitBuildMode = () => useGameStore.getState().setBuildMode(false);

  return (
    <div style={{
      ...styles.container,
      ...(isMobile.current ? { bottom: '10px', maxWidth: '95vw' } : {}),
    }}>
      {/* Mobile: action row with mode toggle + exit */}
      {isMobile.current && (
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          width: '100%',
          justifyContent: 'center',
        }}>
          <button
            style={{
              ...styles.modeButton,
              backgroundColor: blockPlacementMode ? '#4a7c4a' : '#7c4a4a',
              minHeight: '44px',
              minWidth: '100px',
              fontSize: '15px',
            }}
            onClick={toggleBlockPlacementMode}
          >
            {blockPlacementMode ? 'PLACE' : 'MINE'}
          </button>
          <button
            style={{
              ...styles.modeButton,
              backgroundColor: '#cc3333',
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 14px',
              fontSize: '18px',
              lineHeight: 1,
            }}
            onClick={exitBuildMode}
            aria-label="Exit build mode"
          >
            ✕ EXIT
          </button>
        </div>
      )}

      {/* Block slots */}
      <div style={{
        ...styles.slots,
        ...(isMobile.current ? { overflowX: 'auto', maxWidth: '90vw' } : {}),
      }}>
        {HOTBAR_BLOCKS.map((blockType, index) => {
          const props = BlockProperties[blockType];
          const isSelected = selectedBlockType === blockType;
          const slotSize = isMobile.current ? '40px' : '48px';
          const placeable = countPlaceable(blockType, materials);
          const cost = getPlacementCost(blockType) || {};
          const costText = Object.entries(cost).map(([m, q]) => `${q} ${m}`).join(', ');

          return (
            <button
              key={blockType}
              style={{
                ...styles.slot,
                width: slotSize,
                height: slotSize,
                minWidth: slotSize,
                backgroundColor: rgbToCSS(props.color),
                border: isSelected ? '3px solid #fff' : '2px solid #555',
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                opacity: placeable > 0 ? 1 : 0.45,
                position: 'relative',
              }}
              onClick={() => setSelectedBlockType(blockType)}
              title={`${props.name} (${index + 1}) — costs ${costText || 'n/a'}`}
            >
              <span style={styles.countBadge}>{placeable}</span>
              <span style={styles.keyHint}>{index + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        {isMobile.current ? (
          <span>Tap to {blockPlacementMode ? 'place' : 'mine'}</span>
        ) : (
          <>
            <span>Hold left-click to mine</span>
            <span style={styles.separator}>|</span>
            <span>Right-click to place</span>
            <span style={styles.separator}>|</span>
            <span>Tab to exit</span>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    zIndex: 100,
    pointerEvents: 'auto',
  },
  modeButton: {
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
    border: '2px solid #333',
    borderRadius: '6px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  slots: {
    display: 'flex',
    gap: '4px',
    padding: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
  },
  slot: {
    width: '48px',
    height: '48px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: '4px',
    transition: 'transform 0.1s, border 0.1s',
  },
  countBadge: {
    position: 'absolute',
    top: '2px',
    left: '4px',
    fontSize: '10px',
    color: '#fff',
    textShadow: '1px 1px 2px #000',
    fontWeight: 'bold',
  },
  keyHint: {
    fontSize: '10px',
    color: '#fff',
    textShadow: '1px 1px 2px #000',
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: '12px',
    color: '#ccc',
    textShadow: '1px 1px 2px #000',
    display: 'flex',
    gap: '8px',
  },
  separator: {
    color: '#666',
  },
};

export default BlockHotbar;
