/**
 * BlockHotbar - UI for selecting block types and toggling placement mode
 */

import React, { useEffect, useRef } from 'react';
import useGameStore from '../../stores/useGameStore';
import { BlockTypes, BlockProperties } from '../../systems/chunks/blockTypes';
import { isTouchDevice } from '../../utils/deviceDetection';

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

  return (
    <div style={styles.container}>
      {/* Top row: Mode toggle + Close button for mobile */}
      {isMobile.current && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            style={{
              ...styles.modeButton,
              backgroundColor: blockPlacementMode ? '#4a7c4a' : '#7c4a4a',
              flex: 1,
            }}
            onClick={toggleBlockPlacementMode}
          >
            {blockPlacementMode ? 'PLACE' : 'MINE'}
          </button>
          <button
            style={{
              ...styles.modeButton,
              backgroundColor: '#cc3333',
              padding: '8px 14px',
              fontSize: '16px',
            }}
            onClick={() => useGameStore.getState().setBuildMode(false)}
            aria-label="Exit build mode"
          >
            ✕
          </button>
        </div>
      )}

      {/* Block slots */}
      <div style={styles.slots}>
        {HOTBAR_BLOCKS.map((blockType, index) => {
          const props = BlockProperties[blockType];
          const isSelected = selectedBlockType === blockType;

          return (
            <button
              key={blockType}
              style={{
                ...styles.slot,
                backgroundColor: rgbToCSS(props.color),
                border: isSelected ? '3px solid #fff' : '2px solid #555',
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
              }}
              onClick={() => setSelectedBlockType(blockType)}
              title={`${props.name} (${index + 1})`}
            >
              <span style={styles.keyHint}>{index + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        {isMobile.current ? (
          <>
            <span>Tap to {blockPlacementMode ? 'place' : 'mine'}</span>
          </>
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
