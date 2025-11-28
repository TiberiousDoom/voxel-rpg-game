/**
 * KeyboardShortcutsHelp.jsx - Keyboard shortcuts help modal
 *
 * Displays a modal with all available keyboard shortcuts organized by category.
 * Accessible and provides a quick reference for users.
 *
 * Usage:
 * import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
 *
 * <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
 */

import React from 'react';
import Modal from './common/Modal';
import { DEFAULT_SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { ARIA_LABELS } from '../accessibility/aria-labels';
import './KeyboardShortcutsHelp.css';

/**
 * Format a key for display (e.g., ' ' -> 'Space', 'ArrowLeft' -> '←')
 * @param {string} key
 * @returns {string}
 */
function formatKey(key) {
  const keyMap = {
    ' ': 'Space',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'Escape': 'Esc',
    'Delete': 'Del'
  };

  return keyMap[key] || key.toUpperCase();
}

/**
 * Format a shortcut config for display
 * @param {Object} shortcutConfig
 * @returns {string}
 */
function formatShortcut(shortcutConfig) {
  const { key, ctrl, shift, alt } = shortcutConfig;
  const parts = [];

  if (ctrl) parts.push('Ctrl');
  if (shift) parts.push('Shift');
  if (alt) parts.push('Alt');
  parts.push(formatKey(key));

  return parts.join(' + ');
}

/**
 * Organize shortcuts by category
 */
function organizeShortcuts(shortcuts) {
  const categories = {
    'Game Controls': [],
    'Building': [],
    'NPCs': [],
    'Camera': [],
    'UI': []
  };

  Object.entries(shortcuts).forEach(([name, config]) => {
    const shortcut = {
      name,
      keys: formatShortcut(config),
      description: config.description
    };

    // Categorize shortcuts
    if (name.includes('PAUSE') || name.includes('SAVE') || name.includes('LOAD')) {
      categories['Game Controls'].push(shortcut);
    } else if (name.includes('BUILD') || name.includes('SELECT_BUILDING') || name.includes('DELETE')) {
      categories['Building'].push(shortcut);
    } else if (name.includes('NPC')) {
      categories['NPCs'].push(shortcut);
    } else if (name.includes('PAN') || name.includes('ZOOM')) {
      categories['Camera'].push(shortcut);
    } else {
      categories['UI'].push(shortcut);
    }
  });

  return categories;
}

/**
 * KeyboardShortcutsHelp component
 */
function KeyboardShortcutsHelp({ isOpen = false, onClose = () => {} }) {
  const categories = organizeShortcuts(DEFAULT_SHORTCUTS);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="large"
      className="keyboard-shortcuts-help"
      aria-label={ARIA_LABELS.SHORTCUTS.HELP_DIALOG_TITLE}
    >
      <div className="shortcuts-help-content">
        <p className="shortcuts-help-intro">
          Use these keyboard shortcuts to navigate and control the game more efficiently.
        </p>

        <div className="shortcuts-categories">
          {Object.entries(categories).map(([categoryName, shortcuts]) => {
            // Skip empty categories
            if (shortcuts.length === 0) return null;

            return (
              <section key={categoryName} className="shortcuts-category">
                <h3 className="shortcuts-category-title">{categoryName}</h3>
                <div className="shortcuts-list">
                  {shortcuts.map(({ name, keys, description }) => (
                    <div key={name} className="shortcut-item">
                      <kbd className="shortcut-keys" aria-label={`Shortcut: ${keys}`}>
                        {keys}
                      </kbd>
                      <span className="shortcut-description">{description}</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="shortcuts-help-footer">
          <p className="shortcuts-help-note">
            <strong>Note:</strong> Keyboard shortcuts are disabled when typing in input fields.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default KeyboardShortcutsHelp;
