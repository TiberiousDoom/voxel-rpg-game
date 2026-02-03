/**
 * GameLayout.jsx - Main layout orchestrator for the new UI system
 *
 * This component replaces the complex modal-based layout with a unified
 * SlidePanel approach. It coordinates:
 * - TopBar header
 * - Game viewport area
 * - SlidePanel for all menus
 * - BottomNavigation tabs
 * - Keyboard shortcuts
 */

import React, { useEffect, useCallback, lazy, Suspense } from 'react';
import TopBar from './TopBar';
import BottomNavigation from './BottomNavigation';
import SlidePanel from './SlidePanel';
import useUIStore, { PANEL_TYPES, PANEL_HEIGHTS } from '../../stores/useUIStore';
import './GameLayout.css';

// Lazy load panel content components for code splitting
const BuildPanel = lazy(() => import('../panels/BuildPanel'));
const InventoryPanel = lazy(() => import('../panels/InventoryPanel'));
const NPCPanel = lazy(() => import('../panels/NPCPanel'));
const ResourcesPanel = lazy(() => import('../panels/ResourcesPanel'));
const CraftingPanel = lazy(() => import('../panels/CraftingPanel'));
const QuestsPanel = lazy(() => import('../panels/QuestsPanel'));
const StatsPanel = lazy(() => import('../panels/StatsPanel'));
const SettingsPanel = lazy(() => import('../panels/SettingsPanel'));
const CharacterPanel = lazy(() => import('../panels/CharacterPanel'));
const ExpeditionsPanel = lazy(() => import('../panels/ExpeditionsPanel'));
const DefensePanel = lazy(() => import('../panels/DefensePanel'));
const DebugPanel = lazy(() => import('../panels/DebugPanel'));
const StockpilePanel = lazy(() => import('../panels/StockpilePanel'));
const ConstructionPanel = lazy(() => import('../panels/ConstructionPanel'));

/**
 * Panel title mapping
 */
const PANEL_TITLES = {
  [PANEL_TYPES.BUILD]: 'Build',
  [PANEL_TYPES.INVENTORY]: 'Inventory',
  [PANEL_TYPES.NPCS]: 'NPCs',
  [PANEL_TYPES.RESOURCES]: 'Resources',
  [PANEL_TYPES.CRAFTING]: 'Crafting',
  [PANEL_TYPES.QUESTS]: 'Quests',
  [PANEL_TYPES.STATS]: 'Statistics',
  [PANEL_TYPES.SETTINGS]: 'Settings',
  [PANEL_TYPES.CHARACTER]: 'Character',
  [PANEL_TYPES.EXPEDITIONS]: 'Expeditions',
  [PANEL_TYPES.DEFENSE]: 'Defense',
  [PANEL_TYPES.DEBUG]: 'Debug Tools',
  [PANEL_TYPES.STOCKPILE]: 'Stockpiles',
  [PANEL_TYPES.CONSTRUCTION]: 'Construction',
};

/**
 * Panel loading fallback
 */
function PanelLoading() {
  return (
    <div className="panel-loading">
      <div className="panel-loading-spinner" />
      <span>Loading...</span>
    </div>
  );
}

/**
 * Renders the appropriate panel content based on active panel
 */
function PanelContent({ panelId, ...props }) {
  switch (panelId) {
    case PANEL_TYPES.BUILD:
      return <BuildPanel {...props} />;
    case PANEL_TYPES.INVENTORY:
      return <InventoryPanel {...props} />;
    case PANEL_TYPES.NPCS:
      return <NPCPanel {...props} />;
    case PANEL_TYPES.RESOURCES:
      return <ResourcesPanel {...props} />;
    case PANEL_TYPES.CRAFTING:
      return <CraftingPanel {...props} />;
    case PANEL_TYPES.QUESTS:
      return <QuestsPanel {...props} />;
    case PANEL_TYPES.STATS:
      return <StatsPanel {...props} />;
    case PANEL_TYPES.SETTINGS:
      return <SettingsPanel {...props} />;
    case PANEL_TYPES.CHARACTER:
      return <CharacterPanel {...props} />;
    case PANEL_TYPES.EXPEDITIONS:
      return <ExpeditionsPanel {...props} />;
    case PANEL_TYPES.DEFENSE:
      return <DefensePanel {...props} />;
    case PANEL_TYPES.DEBUG:
      return <DebugPanel {...props} />;
    case PANEL_TYPES.STOCKPILE:
      return <StockpilePanel {...props} />;
    case PANEL_TYPES.CONSTRUCTION:
      return <ConstructionPanel {...props} />;
    default:
      return <div className="panel-empty">Panel not found</div>;
  }
}

/**
 * GameLayout component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Game viewport content
 * @param {string} props.gameName - Game/settlement name
 * @param {boolean} props.isPaused - Game paused state
 * @param {Function} props.onTogglePause - Pause toggle handler
 * @param {Function} props.onSave - Save game handler
 * @param {boolean} props.isSaving - Save in progress
 * @param {Object} props.gameState - Game state for panels
 * @param {Object} props.gameActions - Game actions for panels
 */
function GameLayout({
  children,
  gameName,
  isPaused,
  onTogglePause,
  onSave,
  isSaving,
  gameState,
  gameActions,
}) {
  const {
    activePanel,
    panelHeight,
    closePanel,
    setPanelHeight,
    isCleanMode,
    handleKeyboardShortcut,
  } = useUIStore();

  // Global keyboard shortcut handler
  const handleKeyDown = useCallback((e) => {
    // Don't handle if typing in an input
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.isContentEditable
    ) {
      return;
    }

    // Handle UI shortcuts
    if (handleKeyboardShortcut(e.key)) {
      e.preventDefault();
      return;
    }

    // Space for pause
    if (e.key === ' ' && onTogglePause) {
      e.preventDefault();
      onTogglePause();
    }

    // Ctrl+S for save
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && onSave) {
      e.preventDefault();
      onSave();
    }
  }, [handleKeyboardShortcut, onTogglePause, onSave]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={`game-layout ${isCleanMode ? 'game-layout-clean' : ''}`}>
      {/* Top Bar */}
      <TopBar
        gameName={gameName}
        isPaused={isPaused}
        onTogglePause={onTogglePause}
        onSave={onSave}
        isSaving={isSaving}
      />

      {/* Main Viewport Area */}
      <main className="game-layout-viewport">
        {children}
      </main>

      {/* Slide Panel */}
      {activePanel && (
        <SlidePanel
          isOpen={!!activePanel}
          onClose={closePanel}
          height={panelHeight}
          onHeightChange={setPanelHeight}
          title={PANEL_TITLES[activePanel]}
          showDragHandle
        >
          <Suspense fallback={<PanelLoading />}>
            <PanelContent
              panelId={activePanel}
              gameState={gameState}
              gameActions={gameActions}
            />
          </Suspense>
        </SlidePanel>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

export default GameLayout;
