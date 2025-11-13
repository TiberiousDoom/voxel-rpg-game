/**
 * GameControlBar.jsx - Game playback and save controls
 *
 * Controls:
 * - Play/Pause/Stop game
 * - Save/Load game with slot selection
 * - Speed control (future)
 */

import React, { useState, useEffect, useCallback } from 'react';
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

  return (
    <div className="game-control-bar">
      {/* Game Playback Controls */}
      <div className="control-group playback-controls">
        <h4 className="group-title">Game Control</h4>

        <div className="button-row">
          {!isRunning ? (
            <button
              className="control-btn play-btn"
              onClick={onStart}
              title="Start the game"
            >
              <span className="btn-icon">▶️</span>
              <span className="btn-text">Play</span>
            </button>
          ) : isPaused ? (
            <button
              className="control-btn resume-btn"
              onClick={onResume}
              title="Resume the game"
            >
              <span className="btn-icon">▶️</span>
              <span className="btn-text">Resume</span>
            </button>
          ) : (
            <button
              className="control-btn pause-btn"
              onClick={onPause}
              title="Pause the game"
            >
              <span className="btn-icon">⏸️</span>
              <span className="btn-text">Pause</span>
            </button>
          )}
        </div>
      </div>

      {/* Save/Load Controls */}
      <div className="control-group save-controls">
        <h4 className="group-title">Game Save</h4>

        {/* Slot Selector */}
        <div className="slot-selector">
          <label htmlFor="save-slot">Save Slot:</label>
          <select
            id="save-slot"
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="slot-dropdown"
          >
            <option value="slot-1">
              Slot 1 {savedSlots.has('slot-1') ? '💾' : '⬜'}
            </option>
            <option value="slot-2">
              Slot 2 {savedSlots.has('slot-2') ? '💾' : '⬜'}
            </option>
            <option value="slot-3">
              Slot 3 {savedSlots.has('slot-3') ? '💾' : '⬜'}
            </option>
          </select>
        </div>

        <div className="button-row">
          <button
            className="control-btn save-btn"
            onClick={handleSave}
            title={`Save current game to ${selectedSlot}`}
          >
            <span className="btn-icon">💾</span>
            <span className="btn-text">Save</span>
          </button>

          <button
            className="control-btn load-btn"
            onClick={handleLoad}
            title={`Load saved game from ${selectedSlot}`}
            disabled={!savedSlots.has(selectedSlot)}
          >
            <span className="btn-icon">📂</span>
            <span className="btn-text">Load</span>
          </button>
        </div>

        {/* Save Status */}
        {saveStatus && (
          <div className="status-message save-message">{saveStatus}</div>
        )}
        {loadStatus && (
          <div className="status-message load-message">{loadStatus}</div>
        )}
      </div>

    </div>
  );
}

export default GameControlBar;
