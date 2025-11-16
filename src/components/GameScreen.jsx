import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import CompactHeader from './CompactHeader';
import HybridSystemDebugPanel from './HybridSystemDebugPanel';
import GameViewport from './GameViewport';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import HorizontalTabBar from './HorizontalTabBar';
import BuildingInfoPanel from './BuildingInfoPanel';
import AchievementNotification from './AchievementNotification';
import './GameScreen.css';

/**
 * GameScreen Component - Redesigned compact layout
 * Cleaner, more efficient use of space with debug panel
 */
function GameScreen() {
  const { gameState, actions, isReady, error, isInitializing, gameManager } = useGame();
  const [selectedBuildingType, setSelectedBuildingType] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('slot-1');
  const [savedSlots, setSavedSlots] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(true);

  // Horizontal tab bar state
  const [activeTab, setActiveTab] = useState('resources');
  const [leftCollapsed, setLeftCollapsed] = useState(true);
  const [rightCollapsed, setRightCollapsed] = useState(true);

  // Auto-start game
  useEffect(() => {
    if (isReady && !gameState.isRunning && !gameState.isPaused) {
      actions.startGame();
    }
  }, [isReady, gameState.isRunning, gameState.isPaused, actions]);

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

  // Event handlers
  const handleAssignNPC = (npcId, buildingId) => {
    actions.assignNPC(npcId, buildingId);
  };

  const handleUnassignNPC = (npcId) => {
    actions.unassignNPC(npcId);
  };

  const handleAutoAssign = () => {
    actions.autoAssignNPCs();
  };

  const handleBuildingClick = (building) => {
    setSelectedBuilding(building);
  };

  const handleRemoveBuilding = () => {
    if (selectedBuilding) {
      actions.removeBuilding(selectedBuilding.id);
      setSelectedBuilding(null);
    }
  };

  const handleSave = () => {
    actions.saveGame(selectedSlot);
    setSavedSlots(prev => new Set(prev).add(selectedSlot));
    showToast(`💾 Saved to ${selectedSlot}`);
  };

  const handleLoad = () => {
    actions.loadGame(selectedSlot);
    showToast(`📂 Loaded from ${selectedSlot}`);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tab navigation
  const handleTabClick = (tabId, side) => {
    setActiveTab(tabId);

    // Expand the clicked sidebar, collapse the other
    if (side === 'left') {
      setLeftCollapsed(false);
      setRightCollapsed(true);
    } else {
      setRightCollapsed(false);
      setLeftCollapsed(true);
    }
  };

  // Calculate idle NPCs for badge
  const idleNPCs = (gameState.npcs || []).filter(npc =>
    !npc.isDead && !npc.building
  ).length;

  // Define tabs
  const leftTabs = [
    { id: 'resources', label: 'Resources', icon: '💰' },
    { id: 'npcs', label: 'NPCs', icon: '👥', badge: idleNPCs > 0 ? idleNPCs : null },
    { id: 'stats', label: 'Stats', icon: '📊' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' }
  ];

  const rightTabs = [
    { id: 'build', label: 'Build', icon: '🏗️' },
    { id: 'expeditions', label: 'Expeditions', icon: '⚔️' },
    { id: 'defense', label: 'Defense', icon: '🛡️' },
    { id: 'actions', label: 'Actions', icon: '⚡' }
  ];

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

  return (
    <div className="game-screen compact">
      {/* Compact Header */}
      <CompactHeader
        gameState={gameState}
        actions={actions}
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        savedSlots={savedSlots}
        onSave={handleSave}
        onLoad={handleLoad}
        onToggleDebug={() => setShowDebugPanel(!showDebugPanel)}
        showDebug={showDebugPanel}
      />

      {/* Horizontal Tab Navigation */}
      <HorizontalTabBar
        leftTabs={leftTabs}
        rightTabs={rightTabs}
        activeTab={activeTab}
        onTabClick={handleTabClick}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
      />

      {/* Main Layout - 3 Column */}
      <div className="compact-layout">
        {/* Left Sidebar - Tabbed Navigation */}
        <aside className="compact-sidebar left">
          <LeftSidebar
            resources={gameState.resources || {}}
            npcs={gameState.npcs || []}
            buildings={gameState.buildings || []}
            onAssignNPC={handleAssignNPC}
            onUnassignNPC={handleUnassignNPC}
            onAutoAssign={handleAutoAssign}
            activeTab={activeTab}
            collapsed={leftCollapsed}
            onCollapse={() => setLeftCollapsed(true)}
          />
        </aside>

        {/* Center - Game Viewport */}
        <main className="compact-viewport">
          {gameState.isPaused && (
            <div className="pause-overlay">
              <div className="pause-content">
                <h2>⏸️ PAUSED</h2>
                <p>Click Resume to continue</p>
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
                  showToast(`❌ ${result.message || 'Cannot place building'}`);
                }
                setSelectedBuildingType(null);
              }
            }}
            onBuildingClick={handleBuildingClick}
            enablePlayerMovement={true}
          />

          {/* Selected Building Info */}
          {selectedBuilding && (
            <BuildingInfoPanel
              building={selectedBuilding}
              onClose={() => setSelectedBuilding(null)}
              onRemove={handleRemoveBuilding}
              gameManager={gameManager}
            />
          )}
        </main>

        {/* Right Sidebar - Tabbed Navigation */}
        <aside className="compact-sidebar right">
          <RightSidebar
            selectedBuildingType={selectedBuildingType}
            onSelectBuilding={setSelectedBuildingType}
            onSpawnNPC={() => actions.spawnNPC('WORKER')}
            onAdvanceTier={() => {/* Advance tier - to be implemented */}}
            onAutoAssignNPCs={handleAutoAssign}
            currentTier={gameState.currentTier || 'SURVIVAL'}
            buildingConfig={gameManager?.orchestrator?.buildingConfig}
            placedBuildingCounts={{}}
            activeTab={activeTab}
            collapsed={rightCollapsed}
            onCollapse={() => setRightCollapsed(true)}
          />
        </aside>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <HybridSystemDebugPanel
          onClose={() => setShowDebugPanel(false)}
        />
      )}

      {/* Achievement Notifications */}
      {newlyUnlockedAchievements.length > 0 && (
        <AchievementNotification
          achievements={newlyUnlockedAchievements}
          onDismiss={() => setNewlyUnlockedAchievements([])}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default GameScreen;
