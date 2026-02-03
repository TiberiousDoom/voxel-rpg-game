/**
 * KeyboardShortcutHints.jsx
 * Displays keyboard shortcut hints for the user
 */

import React, { useState, useEffect } from 'react';
import './KeyboardShortcutHints.css';

const KeyboardShortcutHints = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed
    const dismissed = localStorage.getItem('keyboard-hints-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('keyboard-hints-dismissed', 'true');
    setIsVisible(false);
    setIsDismissed(true);
  };

  const handleToggle = () => {
    setIsVisible(!isVisible);
  };

  if (isDismissed && !isVisible) {
    return (
      <button
        className="keyboard-hints-toggle"
        onClick={handleToggle}
        title="Show Keyboard Shortcuts"
      >
        ⌨️
      </button>
    );
  }

  return (
    <div className={`keyboard-hints ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="keyboard-hints-header">
        <h3>⌨️ Keyboard Shortcuts</h3>
        <button
          className="keyboard-hints-close"
          onClick={handleDismiss}
          title="Dismiss (can reopen with ⌨️ button)"
        >
          ×
        </button>
      </div>
      <div className="keyboard-hints-content">
        <div className="shortcut-row">
          <kbd>C</kbd>
          <span>Character Sheet (Attributes & Skills)</span>
        </div>
        <div className="shortcut-row">
          <kbd>I</kbd>
          <span>Inventory</span>
        </div>
        <div className="shortcut-row">
          <kbd>ESC</kbd>
          <span>Close Modals</span>
        </div>
        <div className="shortcut-row">
          <kbd>`</kbd>
          <span>Toggle Clean Mode</span>
        </div>
        <div className="shortcut-row">
          <kbd>T</kbd>
          <span>Toggle Camera Mode</span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutHints;
