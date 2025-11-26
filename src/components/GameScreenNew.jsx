/**
 * GameScreenNew.jsx - New UI system implementation
 *
 * Uses the redesigned UI architecture with:
 * - GameLayout (TopBar + SlidePanel + BottomNavigation)
 * - Centralized UI state via useUIStore
 * - Unified panel system
 *
 * Maintains compatibility with existing game systems.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import useGameStore from '../stores/useGameStore';
import useDungeonStore from '../stores/useDungeonStore';
import useUIStore, { PANEL_TYPES } from '../stores/useUIStore';

// New Layout System
import { GameLayout } from './layout';

// Game Viewport and overlays
import GameViewport from './GameViewport';
import BuildingInfoPanel from './BuildingInfoPanel';
import DeathScreen from './DeathScreen';
import DungeonScreen from './dungeon/DungeonScreen';

// Notifications
import AchievementNotification from './AchievementNotification';
import NotificationSystem from './notifications/NotificationSystem';

// Character system
import CharacterSystemUI from './ui/CharacterSystemUI';
import ActiveSkillBar from './ui/ActiveSkillBar';
import { activeSkillSystem } from '../modules/character/CharacterSystem';

import './GameScreen.css';

/**
 * GameScreenNew Component - New UI architecture
 */
function GameScreenNew() {
  const { gameState, actions, isReady, error, isInitializing, gameManager } = useGame();
  const { enemies, player } = useGameStore();
  const respawnPlayer = useGameStore((state) => state.respawnPlayer);
  const inDungeon = useDungeonStore((state) => state.inDungeon);

  // UI Store
  const {
    isCleanMode,
    isDebugMode,
    selectedBuildingId,
    setSelectedBuilding: setSelectedBuildingInStore,
    closePanel,
  } = useUIStore();

  // Local state for game-specific UI
  const [selectedBuildingType, setSelectedBuildingType] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState([]);
  const [showDeathScreen, setShowDeathScreen] = useState(false);
  const [showDungeonScreen, setShowDungeonScreen] = useState(false);

  // Save/Load state
  const [selectedSlot, setSelectedSlot] = useState('slot-1');
  const [savedSlots, setSavedSlots] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Detect mobile device
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768 ||
                   ('ontouchstart' in window);

  // Auto-start game
  useEffect(() => {
    if (isReady && !gameState.isRunning && !gameState.isPaused) {
      actions.startGame();
    }
  }, [isReady, gameState.isRunning, gameState.isPaused, actions]);

  // Check for player death
  useEffect(() => {
    if (player && player.health <= 0 && !showDeathScreen) {
      setShowDeathScreen(true);
    }
  }, [player, showDeathScreen]);

  // Show dungeon screen when entering dungeon
  useEffect(() => {
    if (inDungeon && !showDungeonScreen) {
      setShowDungeonScreen(true);
      closePanel();
    } else if (!inDungeon && showDungeonScreen) {
      setShowDungeonScreen(false);
    }
  }, [inDungeon, showDungeonScreen, closePanel]);

  // Check for existing saves
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

  // Sync selected building
  useEffect(() => {
    if (selectedBuilding) {
      const updatedBuilding = gameState.buildings.find(b => b.id === selectedBuilding.id);
      if (updatedBuilding) {
        setSelectedBuilding(updatedBuilding);
      } else {
        setSelectedBuilding(null);
      }
    }
  }, [gameState.buildings, selectedBuilding]);

  // Track achievements
  useEffect(() => {
    if (gameState.achievements && gameState.achievements.newlyUnlocked) {
      setNewlyUnlockedAchievements(prev => [
        ...prev,
        ...gameState.achievements.newlyUnlocked
      ]);
    }
  }, [gameState.achievements]);

  // Update active skill system
  useEffect(() => {
    let lastTime = performance.now();
    let animationFrameId;

    const updateLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (activeSkillSystem && !gameState.isPaused) {
        activeSkillSystem.update(deltaTime);
      }

      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameState.isPaused]);

  // ESC key handler for building placement
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && selectedBuildingType) {
        setSelectedBuildingType(null);
        showToast('Building placement cancelled');
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedBuildingType]);

  // Event handlers
  const handleRespawn = useCallback(() => {
    respawnPlayer();
    setShowDeathScreen(false);
  }, [respawnPlayer]);

  const handleExitDungeon = useCallback(() => {
    setShowDungeonScreen(false);
  }, []);

  const handleBuildingClick = useCallback((building) => {
    setSelectedBuilding(building);
    setSelectedBuildingInStore(building?.id || null);
  }, [setSelectedBuildingInStore]);

  const handleRemoveBuilding = useCallback(() => {
    if (selectedBuilding) {
      actions.removeBuilding(selectedBuilding.id);
      setSelectedBuilding(null);
      setSelectedBuildingInStore(null);
    }
  }, [selectedBuilding, actions, setSelectedBuildingInStore]);

  const handlePlaceBuilding = useCallback((position) => {
    if (selectedBuildingType) {
      const result = actions.placeBuilding(selectedBuildingType, position);
      if (result && !result.success) {
        showToast(result.message || 'Cannot place building');
      }
      setSelectedBuildingType(null);
    }
  }, [selectedBuildingType, actions]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await actions.saveGame(selectedSlot);
      setSavedSlots(prev => new Set(prev).add(selectedSlot));
      showToast(`Saved to ${selectedSlot}`);
    } catch (err) {
      showToast('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [actions, selectedSlot]);

  const handleTogglePause = useCallback(() => {
    if (gameState.isPaused) {
      actions.resumeGame();
    } else {
      actions.pauseGame();
    }
  }, [gameState.isPaused, actions]);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // NPC handlers
  const handleAssignNPC = useCallback((npcId, buildingId) => {
    actions.assignNPC(npcId, buildingId);
  }, [actions]);

  const handleUnassignNPC = useCallback((npcId) => {
    actions.unassignNPC(npcId);
  }, [actions]);

  const handleAutoAssign = useCallback(() => {
    actions.autoAssignNPCs();
  }, [actions]);

  // Loading state
  if (isInitializing) {
    return (
      <div className="game-screen loading">
        <div className="loading-spinner">
          <h1>Initializing Game...</h1>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="game-screen error">
        <div className="error-container">
          <h1>Error</h1>
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()}>Reload Game</button>
        </div>
      </div>
    );
  }

  // Prepare game state and actions for panels
  const panelGameState = {
    ...gameState,
    selectedBuildingType,
    selectedBuilding,
    gameManager,
    isMobile,
    player,
    enemies,
    inDungeon,
  };

  const panelActions = {
    ...actions,
    setSelectedBuildingType,
    handleAssignNPC,
    handleUnassignNPC,
    handleAutoAssign,
    handleBuildingClick,
    showToast,
  };

  return (
    <GameLayout
      gameName={gameState.settlementName || 'Voxel RPG'}
      isPaused={gameState.isPaused}
      onTogglePause={handleTogglePause}
      onSave={handleSave}
      isSaving={isSaving}
      gameState={panelGameState}
      gameActions={panelActions}
    >
      {/* Game Viewport */}
      {gameState.isPaused && (
        <div className="pause-overlay">
          <div className="pause-content">
            <h2>PAUSED</h2>
            <p>Press Space or click Resume to continue</p>
          </div>
        </div>
      )}

      <GameViewport
        buildings={gameState.buildings || []}
        npcs={gameState.npcs || []}
        monsters={enemies || []}
        gameManager={gameManager}
        selectedBuildingType={selectedBuildingType}
        onPlaceBuilding={handlePlaceBuilding}
        onBuildingClick={handleBuildingClick}
        debugMode={isDebugMode}
        enablePlayerMovement={true}
        isMobile={isMobile}
        showPerformanceMonitor={isDebugMode}
        cleanMode={isCleanMode}
      />

      {/* Selected Building Info - Overlay on viewport */}
      {selectedBuilding && !isCleanMode && (
        <BuildingInfoPanel
          building={selectedBuilding}
          onClose={() => {
            setSelectedBuilding(null);
            setSelectedBuildingInStore(null);
          }}
          onRemove={handleRemoveBuilding}
          gameManager={gameManager}
        />
      )}

      {/* Character System UI - Hidden in clean mode */}
      {!isCleanMode && <CharacterSystemUI />}

      {/* Active Skill Bar - Hidden in clean mode */}
      {!isCleanMode && <ActiveSkillBar />}

      {/* Achievement Notifications */}
      {newlyUnlockedAchievements.length > 0 && (
        <AchievementNotification
          achievements={newlyUnlockedAchievements}
          onDismiss={() => setNewlyUnlockedAchievements([])}
        />
      )}

      {/* Global Notification System */}
      <NotificationSystem />

      {/* Dungeon Screen - Full screen overlay */}
      {showDungeonScreen && inDungeon && (
        <div className="dungeon-overlay">
          <DungeonScreen onExit={handleExitDungeon} />
        </div>
      )}

      {/* Death Screen - Highest priority */}
      {showDeathScreen && <DeathScreen onRespawn={handleRespawn} />}

      {/* Toast */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}
    </GameLayout>
  );
}

export default GameScreenNew;
