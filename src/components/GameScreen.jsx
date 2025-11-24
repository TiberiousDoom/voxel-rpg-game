import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import useGameStore from '../stores/useGameStore';
import CompactHeader from './CompactHeader';
import HybridSystemDebugPanel from './HybridSystemDebugPanel';
import GameViewport from './GameViewport';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import HorizontalTabBar from './HorizontalTabBar';
import BuildingInfoPanel from './BuildingInfoPanel';
import AchievementNotification from './AchievementNotification';
import SettlementInventoryUI from './SettlementInventoryUI';
import ModalWrapper from './ModalWrapper';
import BuildMenu from './BuildMenu';
import ResourcePanel from './ResourcePanel';
import NPCPanel from './NPCPanel';
import StatsTab from './tabs/StatsTab';
import AchievementPanel from './AchievementPanel';
import ExpeditionsTab from './tabs/ExpeditionsTab';
import DefenseTab from './tabs/DefenseTab';
import ActionsTab from './tabs/ActionsTab';
import DeveloperTab from './tabs/DeveloperTab';
import CharacterSystemUI from './ui/CharacterSystemUI';
import MobileHamburgerMenu from './MobileHamburgerMenu';
import ActiveSkillBar from './ui/ActiveSkillBar';
import { activeSkillSystem } from '../modules/character/CharacterSystem';
import './GameScreen.css';

/**
 * GameScreen Component - Redesigned compact layout
 * Cleaner, more efficient use of space with debug panel
 * Mobile-optimized with hamburger menu
 */
function GameScreen() {
  const { gameState, actions, isReady, error, isInitializing, gameManager } = useGame();
  const { enemies } = useGameStore(); // Get monsters from useGameStore
  const [selectedBuildingType, setSelectedBuildingType] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('slot-1');
  const [savedSlots, setSavedSlots] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState([]);

  // Detect mobile device
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768 ||
                   ('ontouchstart' in window);

  // Hide debug panels by default on mobile
  const [showDebugPanel, setShowDebugPanel] = useState(!isMobile);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(!isMobile);

  // Clean Mode - Hide all UI for distraction-free gameplay
  const [cleanMode, setCleanMode] = useState(false);

  // Horizontal tab bar state
  const [activeTab, setActiveTab] = useState('resources');
  const [leftCollapsed, setLeftCollapsed] = useState(true);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [showInventory, setShowInventory] = useState(false);

  // Modal menu states
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [showNPCsModal, setShowNPCsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showExpeditionsModal, setShowExpeditionsModal] = useState(false);
  const [showDefenseModal, setShowDefenseModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);

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

  // Update active skill system (cooldowns and buff durations)
  useEffect(() => {
    let lastTime = performance.now();
    let animationFrameId;

    const updateLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Update active skill system
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

  // ESC key handler to cancel building placement
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        // Cancel building placement if active
        if (selectedBuildingType) {
          setSelectedBuildingType(null);
          setToastMessage('🚫 Building placement cancelled');
          setTimeout(() => setToastMessage(null), 3000);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedBuildingType]);
  // Clean Mode keyboard shortcut (` backtick key)
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Toggle clean mode with backtick key
      if (event.key === '`') {
        setCleanMode(prev => !prev);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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

  // Tab navigation - All tabs now open as modals
  const handleTabClick = (tabId, side) => {
    // Map tab IDs to modal state setters
    const modalMap = {
      'inventory': () => setShowInventory(true),
      'build': () => setShowBuildModal(true),
      'resources': () => setShowResourcesModal(true),
      'npcs': () => setShowNPCsModal(true),
      'stats': () => setShowStatsModal(true),
      'achievements': () => setShowAchievementsModal(true),
      'expeditions': () => setShowExpeditionsModal(true),
      'defense': () => setShowDefenseModal(true),
      'actions': () => setShowActionsModal(true),
      'developer': () => setShowDeveloperModal(true)
    };

    // Open corresponding modal
    if (modalMap[tabId]) {
      modalMap[tabId]();
      return;
    }

    // Fallback to sidebar behavior (if needed)
    setActiveTab(tabId);
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
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'npcs', label: 'NPCs', icon: '👥', badge: idleNPCs > 0 ? idleNPCs : null },
    { id: 'stats', label: 'Stats', icon: '📊' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' }
  ];

  const rightTabs = [
    { id: 'build', label: 'Build', icon: '🏗️' },
    { id: 'expeditions', label: 'Expeditions', icon: '⚔️' },
    { id: 'defense', label: 'Defense', icon: '🛡️' },
    { id: 'actions', label: 'Actions', icon: '⚡' },
    { id: 'developer', label: 'Developer', icon: '🛠️' }
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

  // Building legend for mobile menu
  const buildingLegend = {
    'FARM': '#90EE90',
    'HOUSE': '#D2B48C',
    'WAREHOUSE': '#A9A9A9',
    'TOWN_CENTER': '#FFD700',
    'WATCHTOWER': '#8B4513',
    'CAMPFIRE': '#FF8C00'
  };

  return (
    <div className="game-screen compact">
      {/* Mobile Hamburger Menu - Only shown on mobile */}
      {isMobile && (
        <MobileHamburgerMenu
          onOpenResources={() => setShowResourcesModal(true)}
          onOpenNPCs={() => setShowNPCsModal(true)}
          onOpenBuild={() => setShowBuildModal(true)}
          onOpenInventory={() => setShowInventory(true)}
          onOpenStats={() => setShowStatsModal(true)}
          onOpenAchievements={() => setShowAchievementsModal(true)}
          onOpenExpeditions={() => setShowExpeditionsModal(true)}
          onOpenDefense={() => setShowDefenseModal(true)}
          onOpenActions={() => setShowActionsModal(true)}
          onOpenDeveloper={() => setShowDeveloperModal(true)}
          onSave={handleSave}
          onLoad={handleLoad}
          showPerformance={showPerformanceMonitor}
          onTogglePerformance={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
          showDebug={showDebugPanel}
          onToggleDebug={() => setShowDebugPanel(!showDebugPanel)}
          buildingLegend={buildingLegend}
        />
      )}

      {/* Compact Header - Hidden on mobile and in clean mode */}
      {!isMobile && !cleanMode && (
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
      )}

      {/* Horizontal Tab Navigation - Hidden on mobile and in clean mode */}
      {!isMobile && !cleanMode && (
        <HorizontalTabBar
          leftTabs={leftTabs}
          rightTabs={rightTabs}
          activeTab={activeTab}
          onTabClick={handleTabClick}
          leftCollapsed={leftCollapsed}
          rightCollapsed={rightCollapsed}
        />
      )}

      {/* Main Layout - 3 Column */}
      <div className="compact-layout">
        {/* Left Sidebar - Hidden on mobile and in clean mode */}
        {!isMobile && !cleanMode && (
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
        )}

        {/* Center - Game Viewport */}
        <main className={`compact-viewport ${isMobile ? 'mobile-fullscreen' : ''} ${cleanMode ? 'clean-mode-fullscreen' : ''}`}>
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
            monsters={enemies || []}
            gameManager={gameManager}
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
            debugMode={showDebugPanel}
            enablePlayerMovement={true}
            isMobile={isMobile}
            showPerformanceMonitor={showPerformanceMonitor}
            cleanMode={cleanMode}
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

        {/* Right Sidebar - Hidden on mobile and in clean mode */}
        {!isMobile && !cleanMode && (
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
        )}
      </div>

      {/* Debug Panel - Hidden in clean mode */}
      {showDebugPanel && !cleanMode && (
        <HybridSystemDebugPanel
          onClose={() => setShowDebugPanel(false)}
        />
      )}

      {/* Achievement Notifications - Always visible (important notifications) */}
      {newlyUnlockedAchievements.length > 0 && (
        <AchievementNotification
          achievements={newlyUnlockedAchievements}
          onDismiss={() => setNewlyUnlockedAchievements([])}
        />
      )}

      {/* Settlement Inventory */}
      <SettlementInventoryUI
        gameManager={gameManager}
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
      />

      {/* Build Menu Modal */}
      <ModalWrapper
        isOpen={showBuildModal}
        onClose={() => setShowBuildModal(false)}
        title="Build Menu"
        icon="🏗️"
        maxWidth="1200px"
      >
        <BuildMenu
          selectedBuildingType={selectedBuildingType}
          onSelectBuilding={setSelectedBuildingType}
          onSpawnNPC={() => actions.spawnNPC('WORKER')}
          onAdvanceTier={() => {/* Advance tier - to be implemented */}}
          currentTier={gameState.currentTier || 'SURVIVAL'}
          buildingConfig={gameManager?.orchestrator?.buildingConfig}
          placedBuildingCounts={{}}
        />
      </ModalWrapper>

      {/* Resources Modal */}
      <ModalWrapper
        isOpen={showResourcesModal}
        onClose={() => setShowResourcesModal(false)}
        title="Resources"
        icon="💰"
        maxWidth="800px"
      >
        <ResourcePanel
          resources={gameState.resources || {}}
          production={{}}
          consumption={{}}
          capacity={{}}
        />
      </ModalWrapper>

      {/* NPCs Modal */}
      <ModalWrapper
        isOpen={showNPCsModal}
        onClose={() => setShowNPCsModal(false)}
        title="NPCs"
        icon="👥"
        maxWidth="1000px"
      >
        <NPCPanel
          npcs={gameState.npcs || []}
          buildings={gameState.buildings || []}
          onAssignNPC={handleAssignNPC}
          onUnassignNPC={handleUnassignNPC}
          onAutoAssign={handleAutoAssign}
          onSpawnNPC={(role) => actions.spawnNPC(role)}
          maxPopulation={gameState.maxPopulation || 100}
        />
      </ModalWrapper>

      {/* Stats Modal */}
      <ModalWrapper
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        title="Stats"
        icon="📊"
        maxWidth="900px"
      >
        <StatsTab />
      </ModalWrapper>

      {/* Achievements Modal */}
      <ModalWrapper
        isOpen={showAchievementsModal}
        onClose={() => setShowAchievementsModal(false)}
        title="Achievements"
        icon="🏆"
        maxWidth="1000px"
      >
        <AchievementPanel
          achievementSystem={gameManager?.orchestrator?.achievementSystem}
        />
      </ModalWrapper>

      {/* Expeditions Modal */}
      <ModalWrapper
        isOpen={showExpeditionsModal}
        onClose={() => setShowExpeditionsModal(false)}
        title="Expeditions"
        icon="⚔️"
        maxWidth="1100px"
      >
        <ExpeditionsTab />
      </ModalWrapper>

      {/* Defense Modal */}
      <ModalWrapper
        isOpen={showDefenseModal}
        onClose={() => setShowDefenseModal(false)}
        title="Defense"
        icon="🛡️"
        maxWidth="1000px"
      >
        <DefenseTab />
      </ModalWrapper>

      {/* Actions Modal */}
      <ModalWrapper
        isOpen={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        title="Quick Actions"
        icon="⚡"
        maxWidth="700px"
      >
        <ActionsTab
          onSpawnNPC={() => actions.spawnNPC('WORKER')}
          onAdvanceTier={() => {/* Advance tier - to be implemented */}}
          onAutoAssignNPCs={handleAutoAssign}
        />
      </ModalWrapper>

      {/* Developer Modal */}
      <ModalWrapper
        isOpen={showDeveloperModal}
        onClose={() => setShowDeveloperModal(false)}
        title="Developer Tools"
        icon="🛠️"
        maxWidth="600px"
      >
        <DeveloperTab />
      </ModalWrapper>

      {/* Character System UI (Character Sheet + Notifications) - Hidden in clean mode */}
      {!cleanMode && <CharacterSystemUI />}

      {/* Active Skill Bar (Bottom HUD for active skills) - Hidden in clean mode */}
      {!cleanMode && <ActiveSkillBar />}

      {/* Clean Mode Indicator */}
      {cleanMode && (
        <div className="clean-mode-indicator">
          Press <kbd>`</kbd> to exit Clean Mode
        </div>
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
