/**
 * GameControlBar.jsx - Game playback and save controls
 *
 * Controls:
 * - Play/Pause/Stop game
 * - Save/Load game with slot selection
 * - Speed control (future)
 */

import React, { useState, useEffect } from 'react';
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
  onLoad = () => {}
}) {
  const [saveStatus, setSaveStatus] = useState('');
  const [loadStatus, setLoadStatus] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('slot-1');
  const [savedSlots, setSavedSlots] = useState(new Set());

  // Check localStorage for existing saves on mount
  useEffect(() => {
    const existing = new Set();
    for (let i = 1; i <= 3; i++) {
      const slotKey = `slot-${i}`;
      if (localStorage.getItem(slotKey)) {
        existing.add(slotKey);
      }
    }
    setSavedSlots(existing);
  }, []);

  const handleSave = () => {
    setSaveStatus('Saving...');
    onSave(selectedSlot);  // Pass slot ID to save action
    setTimeout(() => {
      setSaveStatus(`✓ Saved to ${selectedSlot}`);
      // Update saved slots set
      setSavedSlots(prev => new Set([...prev, selectedSlot]));
      setTimeout(() => setSaveStatus(''), 2000);
    }, 500);
  };

  const handleLoad = () => {
    if (!savedSlots.has(selectedSlot)) {
      setLoadStatus(`❌ No save in ${selectedSlot}`);
      setTimeout(() => setLoadStatus(''), 2000);
      return;
    }

    setLoadStatus('Loading...');
    onLoad(selectedSlot);  // Pass slot ID to load action
    setTimeout(() => {
      setLoadStatus(`✓ Loaded from ${selectedSlot}`);
      setTimeout(() => setLoadStatus(''), 2000);
    }, 500);
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

          <button
            className="control-btn stop-btn"
            onClick={onStop}
            title="Stop the game"
            disabled={!isRunning && !isPaused}
          >
            <span className="btn-icon">⏹️</span>
            <span className="btn-text">Stop</span>
          </button>
        </div>

        {/* Game Status */}
        <div className="game-status">
          {isRunning && !isPaused && (
            <span className="status-indicator running">
              <span className="pulse-dot" /> Playing
            </span>
          )}
          {isPaused && (
            <span className="status-indicator paused">
              <span className="pulse-dot" /> Paused
            </span>
          )}
          {!isRunning && (
            <span className="status-indicator stopped">
              <span className="pulse-dot" /> Stopped
            </span>
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

      {/* Speed Control (Future) */}
      <div className="control-group speed-control">
        <h4 className="group-title">Speed (1x)</h4>
        <p className="speed-note">Speed control coming soon...</p>
      </div>

      {/* Help Text */}
      <div className="control-info">
        <p className="info-text">
          💡 <strong>Tip:</strong> The game runs in real-time. Click Play to start!
        </p>
      </div>
    </div>
  );
}

export default GameControlBar;
