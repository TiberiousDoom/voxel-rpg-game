import React, { useCallback, lazy, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Experience from './components/3d/Experience';
import GameUI from './components/GameUI';
import SpellWheel from './components/SpellWheel';
import BlockHotbar from './components/ui/BlockHotbar';
import ZoneHotbar from './components/ui/ZoneHotbar';
import Crosshair from './components/ui/Crosshair';
import ContextualHints from './components/ContextualHints';
import StockpilePanel from './components/ui/StockpilePanel';
import ConstructionPanel from './components/ui/ConstructionPanel';
import PickupTextOverlay from './components/ui/PickupTextOverlay';
import PauseMenu from './components/PauseMenu';
import MobileActionButtons from './components/ui/MobileActionButtons';
import MobileTouchTutorial from './components/ui/MobileTouchTutorial';
import VirtualJoystick from './components/ui/VirtualJoystick';
import NotificationSystem from './components/notifications/NotificationSystem';
import { DEBUG_TOOLS_ENABLED } from './utils/debugFlags';
import useGameStore from './stores/useGameStore';

// Panels that aren't needed for the first frame are code-split into their own chunks
const CraftingUI = lazy(() => import('./components/CraftingUI'));
const InventoryUI = lazy(() => import('./components/InventoryUI'));
const BuildingCatalog = lazy(() => import('./components/ui/BuildingCatalog'));
const KeyboardShortcutsPanel = lazy(() => import('./components/KeyboardShortcutsPanel'));
const DeathScreen = lazy(() => import('./components/DeathScreen'));
const DialogueUI = lazy(() => import('./components/ui/DialogueUI'));

// Developer / QA tools: only loaded when enabled (dev builds or ?debug=1)
const TestTracker = DEBUG_TOOLS_ENABLED ? lazy(() => import('./components/TestTracker')) : null;
const DevOverlay = DEBUG_TOOLS_ENABLED ? lazy(() => import('./components/dev/DevOverlay')) : null;

/**
 * Main 3D App component
 */
function App3D() {
  const playerHealth = useGameStore((state) => state.player.health);
  const gameState = useGameStore((state) => state.gameState);
  const lastDamageSource = useGameStore((state) => state.lastDamageSource);
  const dialogueActive = useGameStore((state) => state.dialogue.active);
  const dialogueTree = useGameStore((state) => state.dialogue.tree);
  const dialogueOnAction = useGameStore((state) => state.dialogue.onAction);

  const handleRespawn = useCallback(() => {
    useGameStore.getState().respawnPlayer();
  }, []);

  const isDead = gameState === 'playing' && playerHealth <= 0;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87ceeb', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}>
      {/* Three.js Canvas */}
      <Canvas
        shadows
        // preserveDrawingBuffer is only needed for QA tracker screenshots and costs performance
        gl={{ preserveDrawingBuffer: DEBUG_TOOLS_ENABLED }}
        camera={{
          fov: 60,
          near: 0.1,
          far: 1000,
          position: [0, 15, 20],
        }}
      >
        {/* Main 3D scene */}
        <Experience />

      </Canvas>

      {/* HTML UI overlay */}
      <GameUI />

      {/* Toast notifications (window.addNotification) */}
      <NotificationSystem />

      {/* Spell selection wheel */}
      <SpellWheel />

      {/* Block selection hotbar */}
      <BlockHotbar />

      {/* Zone type selection hotbar */}
      <ZoneHotbar />

      {/* Stockpile deposit/withdraw panel */}
      <StockpilePanel />

      {/* Construction material delivery panel (E key) */}
      <ConstructionPanel />

      {/* Crosshair for first-person mode */}
      <Crosshair />

      {/* Floating pickup text (+X material) */}
      <PickupTextOverlay />

      {/* Contextual hints for new players */}
      <ContextualHints />

      {/* Mobile on-screen controls */}
      <VirtualJoystick />
      <MobileActionButtons />

      {/* Mobile touch tutorial (shows once on first mobile play) */}
      <MobileTouchTutorial />

      {/* Pause menu (F10 to toggle) */}
      <PauseMenu />

      <Suspense fallback={null}>
        {/* Crafting UI */}
        <CraftingUI />

        {/* Inventory UI */}
        <InventoryUI />

        {/* Building catalog (B key) */}
        <BuildingCatalog />

        {/* Key assignments help (? to toggle) */}
        <KeyboardShortcutsPanel />

        {/* Developer tools: F3 dev overlay (DEV button on touch), ` QA tracker */}
        {DevOverlay && <DevOverlay />}
        {TestTracker && <TestTracker />}

        {/* Companion dialogue overlay */}
        {dialogueActive && (
          <DialogueUI
            dialogueTree={dialogueTree}
            onAction={(action) => dialogueOnAction?.(action)}
            onClose={() => useGameStore.getState().closeDialogue()}
          />
        )}

        {/* Death screen overlay */}
        {isDead && (
          <DeathScreen onRespawn={handleRespawn} deathCause={lastDamageSource} />
        )}
      </Suspense>
    </div>
  );
}

export default App3D;
