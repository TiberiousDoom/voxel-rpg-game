import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import GameViewport from './GameViewport';
import ResourcePanel from './ResourcePanel';
import NPCPanel from './NPCPanel';
import BuildMenu from './BuildMenu';
import GameControlBar from './GameControlBar';
import BuildingInfoPanel from './BuildingInfoPanel';
import './GameScreen.css';

/**
 * GameScreen Component
 * Main container for the Voxel RPG Game
 */
function GameScreen() {
  const { gameState, actions, isReady, error, isInitializing } = useGame();
  const [selectedBuildingType, setSelectedBuildingType] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  
  // Auto-start the game when ready (for testing)
  useEffect(() => {
    if (isReady && !gameState.isRunning && !gameState.isPaused) {
      // eslint-disable-next-line no-console
      console.log('[GameScreen] Auto-starting game for testing...');
      actions.startGame();
    }
  }, [isReady, gameState.isRunning, gameState.isPaused, actions]);

  // Keep selected building in sync with buildings array
  useEffect(() => {
    if (selectedBuilding) {
      const updatedBuilding = gameState.buildings.find(b => b.id === selectedBuilding.id);
      if (updatedBuilding) {
        setSelectedBuilding(updatedBuilding);
      } else {
        // Building was removed
        setSelectedBuilding(null);
      }
    }
  }, [gameState.buildings, selectedBuilding]);

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

  // Handle building selection
  const handleBuildingClick = (building) => {
    setSelectedBuilding(building);
    setSelectedBuildingType(null); // Clear build mode when selecting a building
  };

  // Handle repair
  const handleRepair = (buildingId) => {
    const result = actions.repairBuilding(buildingId);
    if (result.success) {
      // eslint-disable-next-line no-console
      console.log('[BuildingHealth] Repair successful:', result);
      // Update selected building with new health
      const updatedBuilding = gameState.buildings.find(b => b.id === buildingId);
      if (updatedBuilding) {
        setSelectedBuilding(updatedBuilding);
      }
    } else {
      // eslint-disable-next-line no-console
      console.error('[BuildingHealth] Repair failed:', result.error);
    }
  };

  // Handle damage
  const handleDamage = (buildingId, damage) => {
    const result = actions.damageBuilding(buildingId, damage);
    if (result.success) {
      // eslint-disable-next-line no-console
      console.log('[BuildingHealth] Damage applied:', result);
      // Update selected building with new health
      const updatedBuilding = gameState.buildings.find(b => b.id === buildingId);
      if (updatedBuilding) {
        setSelectedBuilding(updatedBuilding);
      }
    } else {
      // eslint-disable-next-line no-console
      console.error('[BuildingHealth] Damage failed:', result.error);
    }
  };

  return (
    <div className="game-screen">
      <header className="game-header">
        <h1>Voxel RPG Game</h1>
        <div className="header-info">
          <span className="tier-badge">
            Tier: {gameState.currentTier || 'SURVIVAL'}
          </span>
          <span className="tick-counter">
            Tick: {gameState.currentTick || 0}
          </span>
          <span className={`status-indicator ${
            gameState.isRunning ? 'running' :
            gameState.isPaused ? 'paused' : 'stopped'
          }`}>
            {gameState.isRunning ? '● Running' :
             gameState.isPaused ? '⏸ Paused' : '⬛ Stopped'}
          </span>
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
            onPlaceBuilding={(position) => {
              if (selectedBuildingType) {
                actions.placeBuilding(selectedBuildingType, position);
                setSelectedBuildingType(null);
              }
            }}
            onBuildingClick={handleBuildingClick}
          />
        </div>

        {/* Right Sidebar - Build Menu */}
        <aside className="game-sidebar right-sidebar">
          <BuildMenu
            selectedBuildingType={selectedBuildingType}
            onSelectBuilding={setSelectedBuildingType}
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

      {/* Building Info Panel */}
      {selectedBuilding && (
        <BuildingInfoPanel
          building={selectedBuilding}
          resources={gameState.resources || {}}
          onRepair={handleRepair}
          onDamage={handleDamage}
          onClose={() => setSelectedBuilding(null)}
        />
      )}
    </div>
  );
}

export default GameScreen;
