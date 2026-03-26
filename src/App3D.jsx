import React, { useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import Experience from './components/3d/Experience';
import GameUI from './components/GameUI';
import SpellWheel from './components/SpellWheel';
import CraftingUI from './components/CraftingUI';
import InventoryUI from './components/InventoryUI';
import BlockHotbar from './components/ui/BlockHotbar';
import ZoneHotbar from './components/ui/ZoneHotbar';
import Crosshair from './components/ui/Crosshair';
import ContextualHints from './components/ContextualHints';
import TestTracker from './components/TestTracker';
import DebugOverlay from './components/ui/DebugOverlay';
import NPCDebugPanel from './components/ui/NPCDebugPanel';
import MobileDebugOverlay from './components/ui/MobileDebugOverlay';
import PickupTextOverlay from './components/ui/PickupTextOverlay';
import PauseMenu from './components/PauseMenu';
import DeathScreen from './components/DeathScreen';
import DialogueUI from './components/ui/DialogueUI';
import MobileActionButtons from './components/ui/MobileActionButtons';
import MobileQuickActions from './components/ui/MobileQuickActions';
import MobileTouchTutorial from './components/ui/MobileTouchTutorial';
import useGameStore from './stores/useGameStore';

/**
 * Main 3D App component
 */
function App3D() {
  const playerHealth = useGameStore((state) => state.player.health);
  const gameState = useGameStore((state) => state.gameState);
  const lastDamageSource = useGameStore((state) => state.lastDamageSource);
  const dialogueActive = useGameStore((state) => state.dialogue.active);
  const dialogueTree = useGameStore((state) => state.dialogue.tree);

  const handleRespawn = useCallback(() => {
    useGameStore.getState().respawnPlayer();
  }, []);

  const isDead = gameState === 'playing' && playerHealth <= 0;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#87ceeb', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}>
      {/* Three.js Canvas */}
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true }}
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

      {/* Spell selection wheel */}
      <SpellWheel />

      {/* Crafting UI */}
      <CraftingUI />

      {/* Inventory UI */}
      <InventoryUI />

      {/* Block selection hotbar */}
      <BlockHotbar />

      {/* Zone type selection hotbar */}
      <ZoneHotbar />

      {/* Crosshair for first-person mode */}
      <Crosshair />

      {/* Floating pickup text (+X material) */}
      <PickupTextOverlay />

      {/* Contextual hints for new players */}
      <ContextualHints />

      {/* Debug overlay (F3 to toggle) */}
      <DebugOverlay />

      {/* NPC debug panel (F4 to toggle) */}
      <NPCDebugPanel />

      {/* Mobile debug overlay (touch button to toggle) */}
      <MobileDebugOverlay />

      {/* Mobile on-screen controls */}
      <MobileActionButtons />
      <MobileQuickActions />

      {/* Mobile touch tutorial (shows once on first mobile play) */}
      <MobileTouchTutorial />

      {/* QA Test Tracker (backtick key to toggle) */}
      <TestTracker />

      {/* Pause menu (F10 to toggle) */}
      <PauseMenu />

      {/* Companion dialogue overlay */}
      {dialogueActive && (
        <DialogueUI
          dialogueTree={dialogueTree}
          onAction={(action) => {
            // Handle dialogue actions (help_companion, etc.)
            if (window.handleDialogueAction) {
              window.handleDialogueAction(action);
            }
          }}
          onClose={() => useGameStore.getState().closeDialogue()}
        />
      )}

      {/* Death screen overlay */}
      {isDead && (
        <DeathScreen onRespawn={handleRespawn} deathCause={lastDamageSource} />
      )}
    </div>
  );
}

export default App3D;
