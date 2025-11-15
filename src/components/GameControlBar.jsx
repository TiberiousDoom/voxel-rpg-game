/**
 * GameControlBar.jsx - Game playback and save controls
 *
 * Controls:
 * - Play/Pause/Stop game
 * - Save/Load game with slot selection
 * - Speed control (future)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { ARIA_LABELS } from '../accessibility/aria-labels';
import './GameControlBar.css';

/**
 * Game control bar component
 */
function GameControlBar({
  isRunning = false,
  isPaused = false,
  onStart = () => {},
  onStop = () => {},
  onPause = () => {},
  onResume = () => {},
  onSave = () => {},
  onLoad = () => {},
  getSaveSlots = null
}) {
  const [saveStatus, setSaveStatus] = useState('');
  const [loadStatus, setLoadStatus] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('slot-1');
  const [savedSlots, setSavedSlots] = useState(new Set());
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Initialize keyboard shortcuts
  const { registerShortcut, unregisterAll } = useKeyboardShortcuts();

  // Load available save slots using API
  const refreshSaveSlots = useCallback(async () => {
    if (!getSaveSlots) return;

    try {
      const saves = await getSaveSlots();
      // Extract slot names from save metadata
      const slotSet = new Set(saves.map(s => s.slotName));
      setSavedSlots(slotSet);
    } catch (err) {
      console.error('Failed to refresh save slots:', err);
    }
  }, [getSaveSlots]);

  // Load save slots on mount
  useEffect(() => {
    refreshSaveSlots();
  }, [refreshSaveSlots]);

  const handleSave = async () => {
    setSaveStatus('Saving...');
    try {
      const result = await onSave(selectedSlot);

      if (result && result.success) {
        setSaveStatus(`✓ Saved to ${selectedSlot}`);
        // Refresh save slots to update indicators
        await refreshSaveSlots();
      } else {
        setSaveStatus(`❌ Error: ${result?.message || 'Unknown error'}`);
      }

      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      setSaveStatus(`❌ Error: ${err.message}`);
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const handleLoad = async () => {
    if (!savedSlots.has(selectedSlot)) {
      setLoadStatus(`❌ No save in ${selectedSlot}`);
      setTimeout(() => setLoadStatus(''), 2000);
      return;
    }

    setLoadStatus('Loading...');
    try {
      const result = await onLoad(selectedSlot);

      if (result && result.success) {
        setLoadStatus(`✓ Loaded from ${selectedSlot}`);
      } else {
        setLoadStatus(`❌ Error: ${result?.message || 'Unknown error'}`);
      }

      setTimeout(() => setLoadStatus(''), 2000);
    } catch (err) {
      setLoadStatus(`❌ Error: ${err.message}`);
      setTimeout(() => setLoadStatus(''), 2000);
    }
  };

  // Register keyboard shortcuts
  useEffect(() => {
    // Pause/Resume shortcut (Space)
    registerShortcut('PAUSE_RESUME', () => {
      if (!isRunning) return; // Only if game is running
      if (isPaused) {
        onResume();
      } else {
        onPause();
      }
    });

    // Save game shortcut (S)
    registerShortcut('SAVE_GAME', () => {
      handleSave();
    });

    // Load game shortcut (L)
    registerShortcut('LOAD_GAME', () => {
      handleLoad();
    });

    // Show shortcuts help (?)
    registerShortcut('SHOW_HELP', () => {
      setShowShortcutsHelp(true);
    });

    // Cleanup on unmount
    return () => {
      unregisterAll();
    };
  }, [registerShortcut, unregisterAll, isRunning, isPaused, onPause, onResume, selectedSlot]);

  return (
    <div className="game-control-bar" role="region" aria-label={ARIA_LABELS.CONTROL_BAR.TITLE}>
      {/* Game Playback Controls */}
      <div className="control-group playback-controls" role="group" aria-label="Game playback controls">
        <h4 className="group-title">Game Control</h4>

        <div className="button-row">
          {!isRunning ? (
            <button
              className="control-btn play-btn"
              onClick={onStart}
              title="Start the game"
              aria-label={ARIA_LABELS.GAME.START}
            >
              <span className="btn-icon" aria-hidden="true">▶️</span>
              <span className="btn-text">Play</span>
            </button>
          ) : isPaused ? (
            <button
              className="control-btn resume-btn"
              onClick={onResume}
              title="Resume the game (Space)"
              aria-label={`${ARIA_LABELS.GAME.RESUME} - Press Space`}
            >
              <span className="btn-icon" aria-hidden="true">▶️</span>
              <span className="btn-text">Resume</span>
            </button>
          ) : (
            <button
              className="control-btn pause-btn"
              onClick={onPause}
              title="Pause the game (Space)"
              aria-label={`${ARIA_LABELS.GAME.PAUSE} - Press Space`}
            >
              <span className="btn-icon" aria-hidden="true">⏸️</span>
              <span className="btn-text">Pause</span>
            </button>
          )}
        </div>
      </div>

      {/* Save/Load Controls */}
      <div className="control-group save-controls" role="group" aria-label="Save and load game">
        <h4 className="group-title">Game Save</h4>

        {/* Slot Selector */}
        <div className="slot-selector">
          <label htmlFor="save-slot">Save Slot:</label>
          <select
            id="save-slot"
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="slot-dropdown"
            aria-label="Select save slot"
          >
            <option value="slot-1" aria-label={`Slot 1 ${savedSlots.has('slot-1') ? 'has saved game' : 'empty'}`}>
              Slot 1 {savedSlots.has('slot-1') ? '💾' : '⬜'}
            </option>
            <option value="slot-2" aria-label={`Slot 2 ${savedSlots.has('slot-2') ? 'has saved game' : 'empty'}`}>
              Slot 2 {savedSlots.has('slot-2') ? '💾' : '⬜'}
            </option>
            <option value="slot-3" aria-label={`Slot 3 ${savedSlots.has('slot-3') ? 'has saved game' : 'empty'}`}>
              Slot 3 {savedSlots.has('slot-3') ? '💾' : '⬜'}
            </option>
          </select>
        </div>

        <div className="button-row">
          <button
            className="control-btn save-btn"
            onClick={handleSave}
            title={`Save current game to ${selectedSlot} (S)`}
            aria-label={`${ARIA_LABELS.GAME.SAVE} to ${selectedSlot} - Press S`}
          >
            <span className="btn-icon" aria-hidden="true">💾</span>
            <span className="btn-text">Save</span>
          </button>

          <button
            className="control-btn load-btn"
            onClick={handleLoad}
            title={`Load saved game from ${selectedSlot} (L)`}
            disabled={!savedSlots.has(selectedSlot)}
            aria-label={`${ARIA_LABELS.GAME.LOAD} from ${selectedSlot} - Press L`}
          >
            <span className="btn-icon" aria-hidden="true">📂</span>
            <span className="btn-text">Load</span>
          </button>
        </div>

        {/* Save Status */}
        {saveStatus && (
          <div className="status-message save-message" role="status" aria-live="polite">{saveStatus}</div>
        )}
        {loadStatus && (
          <div className="status-message load-message" role="status" aria-live="polite">{loadStatus}</div>
        )}
      </div>

      {/* Keyboard Shortcuts Help Button */}
      <div className="control-group shortcuts-help" role="group" aria-label="Help and shortcuts">
        <button
          className="control-btn help-btn"
          onClick={() => setShowShortcutsHelp(true)}
          title="View keyboard shortcuts (?)"
          aria-label={ARIA_LABELS.SHORTCUTS.HELP}
        >
          <span className="btn-icon" aria-hidden="true">❓</span>
          <span className="btn-text">Shortcuts</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
}

export default GameControlBar;
