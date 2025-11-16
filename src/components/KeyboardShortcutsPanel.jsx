/**
 * KeyboardShortcutsPanel.jsx - Keyboard shortcuts help panel
 *
 * Features:
 * - Floating panel
 * - Press ? to toggle
 * - Categorized shortcuts
 * - Visual keyboard layout
 * - Highlight active shortcuts
 * - Customizable bindings (future)
 */

import React, { useState, useEffect } from 'react';
import './KeyboardShortcutsPanel.css';

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

  const shortcuts = {
    general: [
      { key: 'Space', description: 'Pause/Resume game' },
      { key: 'Esc', description: 'Close panels/Cancel selection' },
      { key: '?', description: 'Toggle this help panel' },
      { key: 'D', description: 'Toggle debug panel' }
    ],
    quickActions: [
      { key: '1', description: 'Spawn NPC' },
      { key: '2', description: 'Advance tier' },
      { key: '3', description: 'Start expedition' },
      { key: '4', description: 'View stats' },
      { key: '5', description: 'Show help' }
    ],
    navigation: [
      { key: 'Tab', description: 'Cycle through sidebar tabs' },
      { key: 'Arrow Keys', description: 'Navigate tab buttons' },
      { key: 'Enter', description: 'Select/Activate' },
      { key: 'B', description: 'Focus build menu' }
    ],
    npc: [
      { key: 'N', description: 'Spawn NPC (alternative)' },
      { key: 'A', description: 'Auto-assign all idle NPCs' },
      { key: 'Click', description: 'Select NPC for details' }
    ]
  };

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
          <h2 className="shortcuts-title">⌨️ Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="shortcuts-content">
          {/* General */}
          <div className="shortcuts-section">
            <h3 className="shortcuts-category">General</h3>
            <div className="shortcuts-list">
              {shortcuts.general.map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <kbd className="shortcut-key">{shortcut.key}</kbd>
                  <span className="shortcut-desc">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="shortcuts-section">
            <h3 className="shortcuts-category">Quick Actions</h3>
            <div className="shortcuts-list">
              {shortcuts.quickActions.map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <kbd className="shortcut-key">{shortcut.key}</kbd>
                  <span className="shortcut-desc">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="shortcuts-section">
            <h3 className="shortcuts-category">Navigation</h3>
            <div className="shortcuts-list">
              {shortcuts.navigation.map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <kbd className="shortcut-key">{shortcut.key}</kbd>
                  <span className="shortcut-desc">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NPC Management */}
          <div className="shortcuts-section">
            <h3 className="shortcuts-category">NPC Management</h3>
            <div className="shortcuts-list">
              {shortcuts.npc.map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <kbd className="shortcut-key">{shortcut.key}</kbd>
                  <span className="shortcut-desc">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>
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
