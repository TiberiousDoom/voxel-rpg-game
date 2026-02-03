import React from 'react';
import { Play, Pause, Save, FolderOpen, Bug } from 'lucide-react';
import './CompactHeader.css';

/**
 * CompactHeader - Minimal header bar with essential controls
 */
function CompactHeader({
  gameState,
  actions,
  selectedSlot,
  setSelectedSlot,
  savedSlots,
  onSave,
  onLoad,
  onToggleDebug,
  showDebug
}) {
  return (
    <div className="compact-header">
      <div className="compact-header-left">
        <span className="game-title">Voxel RPG</span>
        <span className="tier-indicator">{gameState.currentTier || 'SURVIVAL'}</span>
      </div>

      <div className="compact-header-center">
        <div className="quick-stats">
          <span className="stat">Tick: {gameState.currentTick || 0}</span>
          <span className="stat">Pop: {gameState.population?.aliveCount || 0}</span>
          <span className="stat">Morale: {gameState.morale || 0}</span>
        </div>
      </div>

      <div className="compact-header-right">
        {/* Game Controls */}
        {gameState.isRunning && !gameState.isPaused && (
          <button
            onClick={() => actions.pauseGame()}
            className="header-btn pause"
            title="Pause"
          >
            <Pause size={16} />
          </button>
        )}
        {gameState.isPaused && (
          <button
            onClick={() => actions.resumeGame()}
            className="header-btn play"
            title="Resume"
          >
            <Play size={16} />
          </button>
        )}

        {/* Save/Load */}
        <select
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
          className="slot-select"
          title="Save slot"
        >
          <option value="slot-1">1{savedSlots.has('slot-1') ? '💾' : ''}</option>
          <option value="slot-2">2{savedSlots.has('slot-2') ? '💾' : ''}</option>
          <option value="slot-3">3{savedSlots.has('slot-3') ? '💾' : ''}</option>
        </select>

        <button onClick={onSave} className="header-btn" title="Save">
          <Save size={16} />
        </button>

        <button
          onClick={onLoad}
          className="header-btn"
          title="Load"
          disabled={!savedSlots.has(selectedSlot)}
        >
          <FolderOpen size={16} />
        </button>

        {/* Debug Toggle */}
        <button
          onClick={onToggleDebug}
          className={`header-btn debug-btn ${showDebug ? 'active' : ''}`}
          title="Toggle Debug Panel"
        >
          <Bug size={16} />
        </button>
      </div>
    </div>
  );
}

export default CompactHeader;
