import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import GameViewport from './GameViewport';
import ResourcePanel from './ResourcePanel';
import NPCPanel from './NPCPanel';
import BuildMenu from './BuildMenu';
import GameControlBar from './GameControlBar';
import './GameScreen.css';

/**
 * GameScreen Component
 * Main container for the Voxel RPG Game
 */
function GameScreen() {
  const { gameState, actions, isReady, error, isInitializing } = useGame();
  const [selectedBuildingType, setSelectedBuildingType] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('slot-1');
  const [savedSlots, setSavedSlots] = useState(new Set());

  // Auto-start the game when ready (for testing)
  useEffect(() => {
    if (isReady && !gameState.isRunning && !gameState.isPaused) {
      // eslint-disable-next-line no-console
      console.log('[GameScreen] Auto-starting game for testing...');
      actions.startGame();
    }
  }, [isReady, gameState.isRunning, gameState.isPaused, actions]);

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

  // NPC Assignment handlers
  const handleAssignNPC = (npcId, buildingId) => {
    actions.assignNPC(npcId, buildingId);
  };

  const handleUnassignNPC = (npcId) => {
    actions.unassignNPC(npcId);
  };

  const handleAutoAssign = () => {
    actions.autoAssignNPCs();
  };

  // Save/Load handlers
  const handleSave = () => {
    actions.saveGame(selectedSlot);
    setSavedSlots(prev => new Set([...prev, selectedSlot]));
  };

  const handleLoad = () => {
    if (savedSlots.has(selectedSlot)) {
      actions.loadGame(selectedSlot);
    }
  };

  // Show loading state
  if (isInitializing) {
    return (
      <div className="game-screen loading">
        <div className="loading-spinner">
          <h1>Initializing Game...</h1>
          <p>Setting up GameManager and loading systems...</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !isReady) {
    return (
      <div className="game-screen error">
        <div className="error-container">
          <h1>Game Initialization Failed</h1>
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()}>
            Reload Game
          </button>
        </div>
      </div>
    );
  }

  // Not ready yet
  if (!isReady) {
    return (
      <div className="game-screen loading">
        <div className="loading-spinner">
          <h1>Waiting for Game...</h1>
          <p>Initializing game systems...</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Game is not running reminder
  const showPlayReminder = !gameState.isRunning && !gameState.isPaused;

  return (
    <div className="game-screen">
      <header className="game-header">
        <h1>Voxel RPG Game</h1>
        <div className="header-controls">
          {/* Save/Load Controls */}
          <div className="header-save-controls">
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="header-slot-selector"
              title="Select save slot"
            >
              <option value="slot-1">Slot 1 {savedSlots.has('slot-1') ? '💾' : ''}</option>
              <option value="slot-2">Slot 2 {savedSlots.has('slot-2') ? '💾' : ''}</option>
              <option value="slot-3">Slot 3 {savedSlots.has('slot-3') ? '💾' : ''}</option>
            </select>
            <button
              onClick={handleSave}
              className="header-save-btn"
              title={`Save to ${selectedSlot}`}
            >
              💾 Save
            </button>
            <button
              onClick={handleLoad}
              className="header-save-btn"
              title={`Load from ${selectedSlot}`}
              disabled={!savedSlots.has(selectedSlot)}
            >
              📂 Load
            </button>
          </div>

          {/* Game Info */}
          <div className="header-info">
            <span className="tier-badge">
              Tier: {gameState.currentTier || 'SURVIVAL'}
            </span>
            <span className={`status-indicator ${
              gameState.isRunning ? 'running' :
              gameState.isPaused ? 'paused' : 'stopped'
            }`}>
              {gameState.isRunning ? '● Running' :
               gameState.isPaused ? '⏸ Paused' : '⬛ Stopped'}
            </span>
            {gameState.isRunning && !gameState.isPaused && (
              <button
                onClick={() => actions.pauseGame()}
                className="header-pause-btn"
                title="Pause game"
              >
                ⏸ Pause
              </button>
            )}
            {gameState.isPaused && (
              <button
                onClick={() => actions.resumeGame()}
                className="header-pause-btn resume"
                title="Resume game"
              >
                ▶️ Resume
              </button>
            )}
            <span className="tick-counter">
              Tick: {gameState.currentTick || 0}
            </span>
          </div>
        </div>
      </header>

      <main className="game-layout">
        {/* Left Sidebar - Resources & NPCs */}
        <aside className="game-sidebar left-sidebar">
          <ResourcePanel resources={gameState.resources || {}} />
          <NPCPanel
            npcs={gameState.npcs || []}
            buildings={gameState.buildings || []}
            onAssignNPC={handleAssignNPC}
            onUnassignNPC={handleUnassignNPC}
            onAutoAssign={handleAutoAssign}
          />
        </aside>

        {/* Center - Game Viewport */}
        <div className="game-viewport-container">
          {/* Play Reminder Banner */}
          {showPlayReminder && (
            <div className="play-reminder-banner">
              <h2>⚠️ Game is Stopped</h2>
              <p>Click the <strong>▶️ PLAY</strong> button below to start!</p>
              <p className="hint">
                Resources won't produce and NPCs won't work until the game is running.
              </p>
            </div>
          )}

          <GameViewport
            buildings={gameState.buildings || []}
            npcs={gameState.npcs || []}
            selectedBuildingType={selectedBuildingType}
            onBuildingPlace={(position) => {
              if (selectedBuildingType) {
                actions.placeBuilding(selectedBuildingType, position);
                setSelectedBuildingType(null);
              }
            }}
          />
        </div>

        {/* Right Sidebar - Build Menu */}
        <aside className="game-sidebar right-sidebar">
          <BuildMenu
            selectedBuildingType={selectedBuildingType}
            onBuildingSelect={setSelectedBuildingType}
            onSpawnNPC={() => actions.spawnNPC('WORKER')}
            onAdvanceTier={() => actions.advanceTier('SETTLEMENT')}
          />
        </aside>
      </main>

      {/* Bottom Control Bar */}
      <footer>
        <GameControlBar
          isRunning={gameState.isRunning}
          isPaused={gameState.isPaused}
          onStart={() => actions.startGame()}
          onStop={() => actions.stopGame()}
          onPause={() => actions.pauseGame()}
          onResume={() => actions.resumeGame()}
          onSave={(slotName) => actions.saveGame(slotName)}
          onLoad={(slotName) => actions.loadGame(slotName)}
          getSaveSlots={actions.getSaveSlots}
        />
      </footer>

      {/* Error Toast */}
      {error && (
        <div className="error-toast">
          <span>⚠️ {error}</span>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      )}
    </div>
  );
}

export default GameScreen;
