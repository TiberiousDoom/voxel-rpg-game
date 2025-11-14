import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import GameViewport from './GameViewport';
import ResourcePanel from './ResourcePanel';
import NPCPanel from './NPCPanel';
import QuickStats from './QuickStats';
import BuildMenu from './BuildMenu';
import BuildingInfoPanel from './BuildingInfoPanel';
import { Menu, X } from 'lucide-react';
import TierProgressPanel from './TierProgressPanel';
import TutorialOverlay from './TutorialOverlay';
import ContextHelpTooltip from './ContextHelpTooltip';
import AchievementPanel from './AchievementPanel';
import AchievementNotification from './AchievementNotification';
import './GameScreen.css';

/**
 * GameScreen Component
 * Main container for the Voxel RPG Game
 * Mobile-compatible with hamburger menu for sidebars
 */
function GameScreen() {
  const { gameState, actions, isReady, error, isInitializing, gameManager } = useGame();
  const [selectedBuildingType, setSelectedBuildingType] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('slot-1');
  const [savedSlots, setSavedSlots] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [showTierPanel, setShowTierPanel] = useState(false);
  const [tierProgress, setTierProgress] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [fpsStats, setFpsStats] = useState({ current: 60, min: 60, max: 60 });
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState([]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track FPS stats
  useEffect(() => {
    const fps = parseFloat(gameState.fps) || 60;
    setFpsStats(prev => ({
      current: fps,
      min: Math.min(prev.min, fps),
      max: Math.max(prev.max, fps)
    }));
  }, [gameState.fps]);

  // Track newly unlocked achievements (Phase 3C)
  useEffect(() => {
    if (gameState.achievements && gameState.achievements.newlyUnlocked) {
      setNewlyUnlockedAchievements(prev => [
        ...prev,
        ...gameState.achievements.newlyUnlocked
      ]);
    }
  }, [gameState.achievements]);

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

  // Show toast notification
  const showToast = (message, duration = 3000) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), duration);
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

  const handleOpenTierPanel = () => {
    const progress = actions.getTierProgress();
    setTierProgress(progress);
    setShowTierPanel(true);
  };

  const handleAdvanceTier = (targetTier) => {
    const result = actions.advanceTier(targetTier);
    if (result.success) {
      // eslint-disable-next-line no-console
      console.log('[TierProgression] Advanced to tier:', targetTier);
      // Refresh tier progress
      const progress = actions.getTierProgress();
      setTierProgress(progress);
    } else {
      // eslint-disable-next-line no-console
      console.error('[TierProgression] Advance failed:', result.reason);
    }
  };

  return (
    <div className="game-screen">
      <header className="game-header">
        {/* Mobile hamburger menu buttons */}
        {isMobile && (
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="mobile-menu-btn"
            aria-label="Toggle Resources Menu"
            style={{
              background: leftSidebarOpen ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              touchAction: 'manipulation',
            }}
          >
            {leftSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

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
            <span className="fps-counter" title="Current FPS / Min / Max">
              FPS: {fpsStats.current.toFixed(2)} (min: {fpsStats.min.toFixed(2)} / max: {fpsStats.max.toFixed(2)})
            </span>
          </div>
        </div>

        {/* Mobile right hamburger menu button */}
        {isMobile && (
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="mobile-menu-btn"
            aria-label="Toggle Build Menu"
            style={{
              background: rightSidebarOpen ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              touchAction: 'manipulation',
            }}
          >
            {rightSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </header>

      <main className="game-layout">
        {/* Left Sidebar - Resources & NPCs */}
        {/* Mobile: Overlay with backdrop | Desktop: Always visible */}
        {(!isMobile || leftSidebarOpen) && (
          <>
            {/* Mobile backdrop */}
            {isMobile && leftSidebarOpen && (
              <div
                className="mobile-sidebar-backdrop"
                onClick={() => setLeftSidebarOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 999,
                  touchAction: 'manipulation',
                }}
              />
            )}
            <aside
              className={`game-sidebar left-sidebar ${isMobile ? 'mobile-overlay' : ''} ${isMobile && leftSidebarOpen ? 'open' : ''}`}
              style={isMobile ? {
                position: 'fixed',
                left: leftSidebarOpen ? '0' : '-100%',
                top: '60px',
                bottom: '60px',
                width: '280px',
                maxWidth: '80vw',
                zIndex: 1000,
                transition: 'left 0.3s ease',
                overflowY: 'auto',
              } : {}}
            >
              {/* Quick Stats Dashboard */}
              <QuickStats
                resources={gameState.resources || {}}
                npcs={gameState.npcs || []}
                achievementStats={gameManager?.orchestrator?.achievementSystem?.getStatistics()}
                currentTier={gameState.currentTier || 'SURVIVAL'}
              />

              {/* Resource Panel */}
              <ResourcePanel resources={gameState.resources || {}} />

              {/* NPC Panel */}
              <NPCPanel
                npcs={gameState.npcs || []}
                buildings={gameState.buildings || []}
                onAssignNPC={handleAssignNPC}
                onUnassignNPC={handleUnassignNPC}
                onAutoAssign={handleAutoAssign}
              />

              {/* Achievement Panel */}
              {gameManager && gameManager.orchestrator && gameManager.orchestrator.achievementSystem && (
                <AchievementPanel
                  achievementSystem={gameManager.orchestrator.achievementSystem}
                />
              )}
            </aside>
          </>
        )}

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

          {/* Pause Overlay */}
          {gameState.isPaused && (
            <div className="pause-overlay">
              <div className="pause-content">
                <h2>⏸️ PAUSED</h2>
                <p>Click <strong>▶️ Resume</strong> to continue</p>
              </div>
            </div>
          )}

          <GameViewport
            buildings={gameState.buildings || []}
            npcs={gameState.npcs || []}
            selectedBuildingType={selectedBuildingType}
            onPlaceBuilding={(position) => {
              if (selectedBuildingType) {
                const result = actions.placeBuilding(selectedBuildingType, position);
                if (result && !result.success) {
                  showToast(`❌ Cannot place building: ${result.message || 'Invalid location'}`);
                }
                setSelectedBuildingType(null);
              }
            }}
            onBuildingClick={handleBuildingClick}
          />
        </div>

        {/* Right Sidebar - Build Menu */}
        {/* Mobile: Overlay with backdrop | Desktop: Always visible */}
        {(!isMobile || rightSidebarOpen) && (
          <>
            {/* Mobile backdrop */}
            {isMobile && rightSidebarOpen && (
              <div
                className="mobile-sidebar-backdrop"
                onClick={() => setRightSidebarOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 999,
                  touchAction: 'manipulation',
                }}
              />
            )}
            <aside
              className={`game-sidebar right-sidebar ${isMobile ? 'mobile-overlay' : ''} ${isMobile && rightSidebarOpen ? 'open' : ''}`}
              style={isMobile ? {
                position: 'fixed',
                right: rightSidebarOpen ? '0' : '-100%',
                top: '60px',
                bottom: '60px',
                width: '280px',
                maxWidth: '80vw',
                zIndex: 1000,
                transition: 'right 0.3s ease',
                overflowY: 'auto',
              } : {}}
            >
              <BuildMenu
                selectedBuildingType={selectedBuildingType}
                onSelectBuilding={setSelectedBuildingType}
                onSpawnNPC={() => actions.spawnNPC('WORKER')}
                onAdvanceTier={handleOpenTierPanel}
                currentTier={gameState.currentTier || 'SURVIVAL'}
                buildingConfig={gameManager?.orchestrator?.buildingConfig}
              />
            </aside>
          </>
        )}
      </main>

      {/* Error Toast */}
      {error && (
        <div className="error-toast">
          <span>⚠️ {error}</span>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      )}

      {/* Building Info Panel */}
      {selectedBuilding && gameManager && (
        <BuildingInfoPanel
          building={selectedBuilding}
          buildingConfig={gameManager.orchestrator?.buildingConfig}
          resources={gameState.resources || {}}
          onRepair={handleRepair}
          onClose={() => setSelectedBuilding(null)}
        />
      )}

      {/* Tier Progress Panel */}
      {showTierPanel && tierProgress && (
        <TierProgressPanel
          tierProgress={tierProgress}
          onAdvance={handleAdvanceTier}
          onClose={() => setShowTierPanel(false)}
        />
      )}

      {/* Phase 3C: Achievement Notification */}
      {newlyUnlockedAchievements.length > 0 && (
        <AchievementNotification
          achievements={newlyUnlockedAchievements}
          onDismiss={() => setNewlyUnlockedAchievements([])}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}

      {/* Tutorial System Overlay */}
      {gameManager?.orchestrator?.tutorialSystem && (
        <TutorialOverlay tutorialSystem={gameManager.orchestrator.tutorialSystem} />
      )}

      {/* Context-Sensitive Help Tooltips */}
      {gameManager?.orchestrator?.contextHelp && (
        <ContextHelpTooltip contextHelp={gameManager.orchestrator.contextHelp} />
      )}
    </div>
  );
}

export default GameScreen;
