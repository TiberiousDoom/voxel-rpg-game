/**
 * 2D RPG Game - Main Entry Point
 *
 * Phase 0 Foundation Systems per 2D_GAME_IMPLEMENTATION_PLAN.md
 */

// Core engine
export * from './core';

// World systems
export * from './world';

// Entities
export * from './entities';

// Game systems
export * from './systems';

// UI
export * from './ui';

// ============================================================================
// Game Initialization
// ============================================================================

import { GameEngine, getGameEngine } from './core';
import { TilemapManager, TileRegistry, AutotileSystem, RegionManager } from './world';
import { PlayerController, CameraSystem } from './entities';
import { InputManager, SaveManager } from './systems';
import { UIManager } from './ui';

/**
 * Initialize and start the game
 */
export async function initializeGame(): Promise<GameEngine> {
  const engine = getGameEngine();

  // Register core systems in order
  const inputManager = new InputManager();
  const tilemapManager = new TilemapManager();
  const autotileSystem = new AutotileSystem();
  const regionManager = new RegionManager();
  const playerController = new PlayerController();
  const cameraSystem = new CameraSystem();
  const saveManager = new SaveManager();
  const uiManager = new UIManager();

  // Connect autotile system to tilemap
  autotileSystem.setTilemapManager(tilemapManager);

  // Connect player to collision check
  playerController.setWalkableCheck((x, y) => tilemapManager.isWalkable(x, y));

  // Connect input to camera
  inputManager.setScreenToWorldConverter((screenX, screenY) => {
    // Placeholder - would use actual screen dimensions
    return cameraSystem.screenToWorld(screenX, screenY, 800, 600);
  });

  // Register systems in update order
  engine.registerSystem(inputManager, 0);
  engine.registerSystem(tilemapManager, 1);
  engine.registerSystem(autotileSystem, 2);
  engine.registerSystem(regionManager, 3);
  engine.registerSystem(playerController, 4);
  engine.registerSystem(cameraSystem, 5);
  engine.registerSystem(saveManager, 6);
  engine.registerSystem(uiManager, 7);

  // Initialize all systems
  await engine.initialize();

  return engine;
}

/**
 * Quick start for development
 */
export async function quickStart(): Promise<void> {
  console.log('Starting 2D RPG Game...');

  const engine = await initializeGame();

  // Set up a basic world for testing
  const tilemapManager = engine.getSystem<TilemapManager>('TilemapManager');
  const playerController = engine.getSystem<PlayerController>('PlayerController');
  const cameraSystem = engine.getSystem<CameraSystem>('CameraSystem');

  if (tilemapManager) {
    // Create a simple starting area
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        tilemapManager.setTile(x, y, 1, 'grass'); // Ground layer
      }
    }

    // Add some trees
    tilemapManager.setTile(5, 5, 2, 'tree');
    tilemapManager.setTile(-3, 2, 2, 'tree');
    tilemapManager.setTile(7, -4, 2, 'tree');

    // Add some rocks
    tilemapManager.setTile(-5, -5, 2, 'rock');
    tilemapManager.setTile(3, -7, 2, 'rock');
  }

  if (playerController) {
    playerController.setPosition(0, 0);
  }

  if (cameraSystem) {
    cameraSystem.snapTo(0, 0);
  }

  // Start the game loop
  engine.start();

  console.log('Game started! Use WASD to move.');
}
