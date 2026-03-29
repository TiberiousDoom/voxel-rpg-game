/**
 * KeyboardShortcutsPanel.jsx - Comprehensive keyboard shortcuts help panel
 *
 * Features:
 * - Floating panel with all key assignments
 * - Press ? to toggle
 * - Categorized shortcuts across all game systems
 * - Scrollable grid layout
 */

import React, { useState, useEffect } from 'react';
import './KeyboardShortcutsPanel.css';

const shortcuts = {
  movement: {
    title: 'Movement',
    keys: [
      { key: 'W', description: 'Move forward' },
      { key: 'A', description: 'Move left' },
      { key: 'S', description: 'Move backward' },
      { key: 'D', description: 'Move right' },
      { key: 'Space', description: 'Jump' },
      { key: 'Shift', description: 'Sprint / Run' },
      { key: 'E', description: 'Interact / Use' },
      { key: 'V', description: 'Toggle first-person mode' },
    ],
  },
  camera: {
    title: 'Camera & View',
    keys: [
      { key: '\u2190 \u2191 \u2192 \u2193', description: 'Pan camera' },
      { key: '+ / -', description: 'Zoom in / out' },
      { key: 'PgUp / .', description: 'Go up one Z-level' },
      { key: 'PgDn / ,', description: 'Go down one Z-level' },
      { key: 'Home', description: 'Jump to surface level' },
      { key: 'End', description: 'Jump to lowest level' },
      { key: 'Shift + Scroll', description: 'Navigate Z-levels' },
    ],
  },
  combat: {
    title: 'Combat & Spells',
    keys: [
      { key: '1 \u2013 6', description: 'Activate spell / skill slot' },
      { key: 'Ctrl (hold)', description: 'Open spell wheel' },
      { key: 'Alt', description: 'Block' },
      { key: 'H', description: 'Use health potion' },
      { key: 'Click', description: 'Attack / interact' },
    ],
  },
  building: {
    title: 'Building & Zones',
    keys: [
      { key: 'Tab', description: 'Toggle build mode' },
      { key: 'Z', description: 'Toggle zone mode' },
      { key: '1 \u2013 0', description: 'Select block type (build mode)' },
      { key: 'B', description: 'Toggle build menu / Go to base' },
      { key: 'Delete', description: 'Delete selected building' },
      { key: 'Escape', description: 'Cancel placement' },
    ],
  },
  menus: {
    title: 'Menus & Panels',
    keys: [
      { key: 'I', description: 'Inventory' },
      { key: 'C', description: 'Crafting' },
      { key: 'K', description: 'Skills' },
      { key: 'M', description: 'Map' },
      { key: 'Escape', description: 'Close current panel / Menu' },
      { key: '?', description: 'Toggle this help screen' },
    ],
  },
  gameControls: {
    title: 'Game Controls',
    keys: [
      { key: 'P', description: 'Pause / Resume' },
      { key: '[', description: 'Decrease game speed' },
      { key: ']', description: 'Increase game speed' },
      { key: 'F10', description: 'Pause menu (save / load)' },
      { key: '`', description: 'Toggle clean mode (hide UI)' },
      { key: 'N', description: 'Spawn NPC' },
    ],
  },
  saveLoad: {
    title: 'Save & Load',
    keys: [
      { key: 'S', description: 'Quick save' },
      { key: 'L', description: 'Quick load' },
      { key: 'Ctrl + S', description: 'Save game' },
    ],
  },
  dungeon: {
    title: 'Dungeon',
    keys: [
      { key: '\u2190 \u2191 \u2192 \u2193', description: 'Move in dungeon' },
      { key: 'Tab', description: 'Cycle target' },
      { key: 'Space / Enter', description: 'Attack current target' },
      { key: '1 \u2013 6', description: 'Use dungeon skill' },
      { key: 'Escape', description: 'Exit dungeon' },
    ],
  },
  debug: {
    title: 'Debug & Info',
    keys: [
      { key: 'F3', description: 'Toggle debug overlay' },
      { key: 'D', description: 'Toggle debug panel' },
    ],
  },
};

function KeyboardShortcutsPanel({ isOpen, onClose }) {
  const [internalOpen, setInternalOpen] = useState(isOpen || false);

  useEffect(() => {
    setInternalOpen(isOpen);
  }, [isOpen]);

  // Listen for ? key to toggle
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '?' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const newState = !internalOpen;
        setInternalOpen(newState);
        if (onClose && newState === false) {
          onClose();
        }
      }
      if (e.key === 'Escape' && internalOpen) {
        setInternalOpen(false);
        if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [internalOpen, onClose]);

  if (!internalOpen) {
    return null;
  }

  const handleClose = () => {
    setInternalOpen(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="keyboard-shortcuts-panel-overlay" onClick={handleClose}>
      <div className="keyboard-shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shortcuts-header">
          <h2 className="shortcuts-title">Key Assignments</h2>
          <button className="shortcuts-close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="shortcuts-content">
          {Object.entries(shortcuts).map(([id, category]) => (
            <div key={id} className="shortcuts-section">
              <h3 className="shortcuts-category">{category.title}</h3>
              <div className="shortcuts-list">
                {category.keys.map((shortcut, index) => (
                  <div key={index} className="shortcut-item">
                    <kbd className="shortcut-key">{shortcut.key}</kbd>
                    <span className="shortcut-desc">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shortcuts-footer">
          <p>Press <kbd>?</kbd> anytime to toggle this panel</p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsPanel;
