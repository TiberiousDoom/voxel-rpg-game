/**
 * GameScreen.jsx - Main game container component
 *
 * This is the top-level game container that:
 * - Initializes the game using useGameManager hook
 * - Manages overall layout
 * - Renders all game UI panels
 * - Handles game lifecycle (start/stop/pause)
 */

import React, { useState } from 'react';
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

  // Show loading state
  if (isInitializing) {
    return (
      <div className="game-screen loading">
        <div className="loading-spinner">
          <h1>Initializing Game...</h1>
          <p>Setting up GameManager and loading systems...</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="game-screen">
      <header className="game-header">
        <h1>Voxel RPG Game</h1>
        <div className="header-info">
          <span className="tier-badge">Tier: {gameState.currentTier}</span>
          <span className="tick-counter">Tick: {gameState.currentTick}</span>
          {gameState.isRunning && (
            <span className="status-indicator running">Running</span>
          )}
          {gameState.isPaused && (
            <span className="status-indicator paused">Paused</span>
          )}
          {!gameState.isRunning && (
            <span className="status-indicator stopped">Stopped</span>
          )}
        </div>
      </header>

      <div className="game-layout">
        {/* Left Panel - Resource & NPC Info */}
        <aside className="game-sidebar left-sidebar">
          <ResourcePanel resources={gameState.resources} />
          <NPCPanel population={gameState.population} morale={gameState.morale} />
        </aside>

        {/* Center - Main Game Viewport */}
        <main className="game-viewport-container">
          <GameViewport
            buildings={gameState.buildings}
            npcs={gameState.npcs}
            selectedBuildingType={selectedBuildingType}
            onPlaceBuilding={(type, position) => {
              actions.placeBuilding(type, position);
              setSelectedBuildingType(null);
            }}
            onSelectTile={(position) => {
              // Could be used for selection preview
            }}
          />
        </main>

        {/* Right Panel - Build Menu & Controls */}
        <aside className="game-sidebar right-sidebar">
          <BuildMenu
            selectedBuildingType={selectedBuildingType}
            onSelectBuilding={setSelectedBuildingType}
            onSpawnNPC={() => actions.spawnNPC('FARMER')}
            onAdvanceTier={() => actions.advanceTier()}
          />
        </aside>
      </div>

      {/* Bottom Control Bar */}
      <footer className="game-footer">
        <GameControlBar
          isRunning={gameState.isRunning}
          isPaused={gameState.isPaused}
          onStart={actions.startGame}
          onStop={actions.stopGame}
          onPause={actions.pauseGame}
          onResume={actions.resumeGame}
          onSave={() => actions.saveGame('autosave')}
          onLoad={() => actions.loadGame('autosave')}
        />
      </footer>

      {/* Error Toast (if any) */}
      {error && isReady && (
        <div className="error-toast">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

export default GameScreen;
