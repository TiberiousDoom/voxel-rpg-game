import React, { useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import Experience from './components/3d/Experience';
import GameUI from './components/GameUI';
import SpellWheel from './components/SpellWheel';
import CraftingUI from './components/CraftingUI';
import InventoryUI from './components/InventoryUI';
import BlockHotbar from './components/ui/BlockHotbar';
import Crosshair from './components/ui/Crosshair';
import ContextualHints from './components/ContextualHints';
import TestTracker from './components/TestTracker';
import DeathScreen from './components/DeathScreen';
import useGameStore from './stores/useGameStore';

/**
 * Main 3D App component
 */
function App3D() {
  const playerHealth = useGameStore((state) => state.player.health);
  const gameState = useGameStore((state) => state.gameState);
  const lastDamageSource = useGameStore((state) => state.lastDamageSource);

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

        {/* Performance stats (FPS, MS, MB) */}
        <Stats />
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

      {/* Crosshair for first-person mode */}
      <Crosshair />

      {/* Contextual hints for new players */}
      <ContextualHints />

      {/* QA Test Tracker (backtick key to toggle) */}
      <TestTracker />

      {/* Death screen overlay */}
      {isDead && (
        <DeathScreen onRespawn={handleRespawn} deathCause={lastDamageSource} />
      )}
    </div>
  );
}

export default App3D;
