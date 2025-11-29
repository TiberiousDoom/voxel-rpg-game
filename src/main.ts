/**
 * Main entry point for the Voxel RPG game demo
 *
 * This initializes the game engine and renders a playable demo.
 * Integrates all Phase 0/1 systems per 2D_GAME_IMPLEMENTATION_PLAN.md v1.2
 * Including mobile/touch support and responsive canvas.
 */

import { WorldGenerator, BiomeType, getBiomeManager, RegionManager } from './world';
import { getSurvivalManager, getInventoryManager, getCraftingManager, getResourceManager, SaveManager, getTouchInputManager } from './systems';
import { getEventBus } from './core/EventBus';
import { CameraSystem } from './entities/CameraSystem';
import { UIManager } from './ui/UIManager';
import { PanelType, InputAction, GestureType } from './core/types';
import type { GestureEvent } from './core/types';

// ============================================================================
// Player State Enum (matches PlayerController)
// ============================================================================

enum PlayerState {
  Idle = 'idle',
  Walking = 'walking',
  Running = 'running',
  Interacting = 'interacting',
  InMenu = 'inMenu',
}

// ============================================================================
// Game Demo - Integrates all Phase 0/1 systems including mobile
// ============================================================================

class GameDemo {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private worldGen: WorldGenerator;
  private survival = getSurvivalManager();
  private inventory = getInventoryManager();
  private eventBus = getEventBus();
  private touchInput = getTouchInputManager();

  // Integrated systems
  private camera: CameraSystem;
  private regionManager: RegionManager;
  private uiManager: UIManager;
  private saveManager: SaveManager;

  // Player state
  private playerX = 0;
  private playerY = 0;
  private playerSpeed = 5;
  private isSprinting = false;
  private playerState: PlayerState = PlayerState.Idle;
  private worldSeed: number;

  // Camera settings (now managed by CameraSystem)
  private tileSize = 16;

  // Input state
  private keys: Set<string> = new Set();

  // Game time tracking
  private totalPlaytime = 0;
  private gameDay = 1;

  // Biome colors for rendering
  private biomeColors: Record<BiomeType, string> = {
    [BiomeType.Ocean]: '#1a5276',
    [BiomeType.Beach]: '#f9e79f',
    [BiomeType.Desert]: '#f5b041',
    [BiomeType.Plains]: '#82e0aa',
    [BiomeType.Forest]: '#1e8449',
    [BiomeType.Swamp]: '#6c7a32',
    [BiomeType.Mountains]: '#7f8c8d',
    [BiomeType.Snow]: '#ecf0f1',
    [BiomeType.Tundra]: '#bdc3c7',
    [BiomeType.Jungle]: '#145a32',
  };

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    // Set up responsive canvas
    this.setupResponsiveCanvas();

    // Initialize world generator with random seed
    this.worldSeed = Math.floor(Math.random() * 1000000);
    this.worldGen = new WorldGenerator({ seed: this.worldSeed });

    // Initialize Phase 0 systems
    this.camera = new CameraSystem({
      followSpeed: 5.0,
      deadzone: 0.5,
      minZoom: 0.5,
      maxZoom: 2.0,
      viewportWidth: 25,
      viewportHeight: 19,
    });
    this.camera.initialize();
    this.camera.setZoom(2.0);

    this.regionManager = new RegionManager({
      regionSize: 64,
      loadDistance: 2,
      unloadDistance: 3,
    });
    this.regionManager.initialize();

    this.uiManager = new UIManager();
    this.uiManager.initialize();

    this.saveManager = new SaveManager();
    this.saveManager.initialize();

    // Initialize touch input system
    this.touchInput.initialize();
    this.touchInput.setCanvas(this.canvas);

    // Find spawn point
    const spawn = this.worldGen.findSpawnPoint();
    this.playerX = spawn.x;
    this.playerY = spawn.y;

    // Initialize camera at spawn
    this.camera.snapTo(spawn.x, spawn.y);

    // Give starting items
    this.inventory.addItem('wood', 10);
    this.inventory.addItem('stone', 5);
    this.inventory.addItem('berries', 3);

    // Initialize survival manager
    this.survival.initialize();

    // Check for autosave
    if (this.saveManager.saveExists('autosave')) {
      console.log('[GameDemo] Autosave found - press L to load');
    }

    // Enable autosave every 60 seconds
    this.saveManager.enableAutosave(60);

    this.setupInput();
    this.setupTouchInput();
    this.setupSaveSystem();
    this.startGameLoop();

    // Emit game ready event for loading screen
    window.dispatchEvent(new CustomEvent('game-ready'));

    const isMobile = this.touchInput.getCapabilities().isMobile;
    console.log(`[GameDemo] Started with seed ${this.worldSeed}, spawn at (${spawn.x}, ${spawn.y})`);
    if (isMobile) {
      console.log('[GameDemo] Mobile device detected - touch controls enabled');
    } else {
      console.log('[GameDemo] Controls: WASD=Move, Shift=Sprint, E=Interact, I=Inventory, B=Build, ESC=Pause');
      console.log('[GameDemo] Controls: +/-=Zoom, 1=Eat berries, Ctrl+S=Save, Ctrl+L=Load');
    }
  }

  /**
   * Set up responsive canvas that fills the container
   */
  private setupResponsiveCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Set canvas size to container size with device pixel ratio
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;

      // Scale context to account for DPR
      this.ctx.scale(dpr, dpr);

      // Set CSS size
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
    };

    // Initial resize
    resize();

    // Resize on window resize
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => {
      // Delay for orientation change to complete
      setTimeout(resize, 100);
    });
  }

  private setupSaveSystem(): void {
    // Configure save manager with game state provider
    this.saveManager.setStateProvider({
      getPlayerPosition: () => ({ x: this.playerX, y: this.playerY }),
      getPlayerHealth: () => this.survival.getHealth(),
      getPlayerMaxHealth: () => 100,
      getPlayerInventory: () => this.inventory.serialize(),
      getWorldSeed: () => this.worldSeed,
      getModifiedTiles: () => [], // Will be populated when tilemap is modified
      getTotalPlaytime: () => this.totalPlaytime,
      getGameDay: () => this.gameDay,
    });

    // Configure save manager with game state consumer
    this.saveManager.setStateConsumer({
      loadPlayerPosition: (pos) => {
        this.playerX = pos.x;
        this.playerY = pos.y;
        this.camera.snapTo(pos.x, pos.y);
      },
      loadPlayerHealth: (current, _max) => {
        // Note: SurvivalManager doesn't have setHealth, would need to add
        console.log(`[GameDemo] Load health: ${current}`);
      },
      loadPlayerInventory: (items) => {
        this.inventory.clear();
        for (const item of items) {
          this.inventory.addItem(item.itemId, item.quantity);
        }
      },
      loadWorldSeed: (seed) => {
        this.worldSeed = seed;
        this.worldGen = new WorldGenerator({ seed });
      },
      loadModifiedTiles: (_tiles) => {
        // Will apply tile changes when tilemap is integrated
      },
      loadPlaytime: (seconds) => {
        this.totalPlaytime = seconds;
      },
      loadGameDay: (day) => {
        this.gameDay = day;
      },
    });
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      // Don't process input when in menu state (except cancel)
      if (this.playerState === PlayerState.InMenu && e.code !== 'Escape') {
        return;
      }

      this.keys.add(e.code);

      // Handle one-time actions
      switch (e.code) {
        case 'KeyE':
          this.interact();
          break;
        case 'KeyI':
          this.toggleInventory();
          break;
        case 'KeyB':
          this.toggleBuildMenu();
          break;
        case 'Escape':
          this.handleEscape();
          break;
        case 'Digit1':
          this.eatBerries();
          break;
        case 'Equal': // + key
        case 'NumpadAdd':
          this.camera.zoomIn();
          break;
        case 'Minus':
        case 'NumpadSubtract':
          this.camera.zoomOut();
          break;
        case 'KeyS':
          if (e.ctrlKey) {
            e.preventDefault();
            this.quickSave();
          }
          break;
        case 'KeyL':
          if (e.ctrlKey) {
            e.preventDefault();
            this.quickLoad();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  /**
   * Set up touch input event handlers
   */
  private setupTouchInput(): void {
    // Listen for touch actions from TouchInputManager
    this.eventBus.on('input:actionPressed', (event) => {
      const action = event.action as InputAction;
      switch (action) {
        case InputAction.Interact:
          this.interact();
          break;
        case InputAction.Inventory:
          this.toggleInventory();
          break;
        case InputAction.BuildMenu:
          this.toggleBuildMenu();
          break;
        case InputAction.Cancel:
          this.handleEscape();
          break;
        case InputAction.Sprint:
          this.isSprinting = true;
          break;
        case InputAction.ZoomIn:
          this.camera.zoomIn();
          break;
        case InputAction.ZoomOut:
          this.camera.zoomOut();
          break;
      }
    });

    this.eventBus.on('input:actionReleased', (event) => {
      if (event.action === InputAction.Sprint) {
        this.isSprinting = false;
      }
    });

    // Listen for tap gestures for interaction
    this.eventBus.on('input:touchTap', (event: GestureEvent) => {
      if (event.type === GestureType.Tap && this.playerState !== PlayerState.InMenu) {
        // Tap to interact with nearby objects
        this.interact();
      }
    });

    // Listen for gesture events
    this.eventBus.on('input:gesture', (event: GestureEvent) => {
      if (event.type === GestureType.DoubleTap) {
        // Double tap toggles sprint briefly handled by TouchInputManager
      }
    });
  }

  private toggleInventory(): void {
    this.uiManager.togglePanel(PanelType.Inventory, true);
    if (this.uiManager.isPanelOpen(PanelType.Inventory)) {
      this.playerState = PlayerState.InMenu;
      console.log('[GameDemo] Inventory opened');
    } else {
      this.playerState = PlayerState.Idle;
      console.log('[GameDemo] Inventory closed');
    }
  }

  private toggleBuildMenu(): void {
    this.uiManager.togglePanel(PanelType.Build, true);
    if (this.uiManager.isPanelOpen(PanelType.Build)) {
      this.playerState = PlayerState.InMenu;
      console.log('[GameDemo] Build menu opened');
    } else {
      this.playerState = PlayerState.Idle;
      console.log('[GameDemo] Build menu closed');
    }
  }

  private handleEscape(): void {
    // If any modal is open, close it
    if (this.uiManager.hasOpenModal()) {
      this.uiManager.closeTopModal();
      if (!this.uiManager.hasOpenModal()) {
        this.playerState = PlayerState.Idle;
      }
      console.log('[GameDemo] Closed modal');
    } else {
      // Toggle pause menu
      this.uiManager.togglePanel(PanelType.Pause, true);
      if (this.uiManager.isPanelOpen(PanelType.Pause)) {
        this.playerState = PlayerState.InMenu;
        console.log('[GameDemo] Game paused');
      } else {
        this.playerState = PlayerState.Idle;
        console.log('[GameDemo] Game resumed');
      }
    }
  }

  private eatBerries(): void {
    if (this.inventory.hasItem('berries')) {
      this.inventory.removeItem('berries', 1);
      this.survival.consume('berries');
      console.log('[GameDemo] Ate berries');
    }
  }

  private quickSave(): void {
    this.saveManager.saveGame('quicksave');
    console.log('[GameDemo] Quick saved!');
  }

  private quickLoad(): void {
    if (this.saveManager.saveExists('quicksave')) {
      this.saveManager.loadGame('quicksave');
      console.log('[GameDemo] Quick loaded!');
    } else {
      console.log('[GameDemo] No quicksave found');
    }
  }

  private interact(): void {
    const biome = this.worldGen.getBiomeAt(
      Math.floor(this.playerX),
      Math.floor(this.playerY)
    );

    // Gather resources based on biome
    if (biome === BiomeType.Forest) {
      this.inventory.addItem('wood', 1);
      console.log('[GameDemo] Gathered wood');
    } else if (biome === BiomeType.Mountains) {
      this.inventory.addItem('stone', 1);
      console.log('[GameDemo] Gathered stone');
    } else if (biome === BiomeType.Plains) {
      if (Math.random() < 0.3) {
        this.inventory.addItem('berries', 1);
        console.log('[GameDemo] Found berries');
      }
    }
  }

  private startGameLoop(): void {
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      this.update(deltaTime);
      this.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  private update(deltaTime: number): void {
    // Track playtime
    this.totalPlaytime += deltaTime;

    // Skip movement when in menu
    if (this.playerState !== PlayerState.InMenu) {
      this.updateMovement(deltaTime);
    }

    // Update camera with deadzone
    this.camera.setTarget(this.playerX, this.playerY);
    const gameTime = {
      totalSeconds: this.totalPlaytime,
      deltaTime,
      gameHour: 12,
      gameDay: this.gameDay,
      isPaused: this.playerState === PlayerState.InMenu,
    };
    this.camera.lateUpdate(deltaTime, gameTime);

    // Update region manager (for tile streaming)
    this.regionManager.update(deltaTime, gameTime);

    // Update survival (simulated time)
    this.survival.update(deltaTime, gameTime);

    // Update UI manager
    this.uiManager.update(deltaTime, gameTime);

    // Update touch input manager
    this.touchInput.update(deltaTime, gameTime);

    // Update UI display
    this.updateUI();
  }

  private updateMovement(deltaTime: number): void {
    // Handle keyboard movement
    let dx = 0;
    let dy = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;

    // Add touch joystick input
    const touchJoystick = this.touchInput.getJoystickInput();
    if (touchJoystick.x !== 0 || touchJoystick.y !== 0) {
      dx = touchJoystick.x;
      dy = touchJoystick.y;
    }

    // Normalize diagonal movement (only for keyboard input, touch is already normalized)
    if (!this.touchInput.isJoystickActive() && dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    // Sprint - check keyboard and touch
    const keyboardSprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const touchSprint = this.touchInput.isActionActive(InputAction.Sprint);
    this.isSprinting = keyboardSprint || touchSprint || this.isSprinting;

    const speedMultiplier = this.isSprinting && this.survival.canSprint() ? 1.8 : 1;
    const hungerMultiplier = this.survival.getSpeedMultiplier();

    const speed = this.playerSpeed * speedMultiplier * hungerMultiplier;

    // Check walkability
    const newX = this.playerX + dx * speed * deltaTime;
    const newY = this.playerY + dy * speed * deltaTime;

    const biome = this.worldGen.getBiomeAt(Math.floor(newX), Math.floor(newY));
    const biomeManager = getBiomeManager();

    if (biomeManager.isWalkable(biome)) {
      this.playerX = newX;
      this.playerY = newY;

      // Emit player moved event for other systems
      this.eventBus.emit('player:moved', { position: { x: this.playerX, y: this.playerY } });
    }

    // Update player state
    const isMoving = dx !== 0 || dy !== 0;
    if (isMoving) {
      this.playerState = this.isSprinting ? PlayerState.Running : PlayerState.Walking;
    } else {
      this.playerState = PlayerState.Idle;
      // Reset sprint when stopped (for touch toggle)
      if (!keyboardSprint && !touchSprint) {
        this.isSprinting = false;
      }
    }
  }

  private updateUI(): void {
    const healthEl = document.getElementById('health');
    const hungerEl = document.getElementById('hunger');
    const staminaEl = document.getElementById('stamina');

    if (healthEl) healthEl.textContent = Math.floor(this.survival.getHealth()).toString();
    if (hungerEl) hungerEl.textContent = Math.floor(this.survival.getHunger()).toString();
    if (staminaEl) staminaEl.textContent = Math.floor(this.survival.getStamina()).toString();
  }

  private render(): void {
    // Get actual display size (CSS pixels, not canvas pixels)
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    // Reset transform and clear with actual canvas size
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    const width = displayWidth;
    const height = displayHeight;

    const zoom = this.camera.getZoom();
    const scaledTileSize = this.tileSize * zoom;

    // Get camera position (with deadzone applied)
    const cameraPos = this.camera.getPosition();
    const cameraX = cameraPos.x;
    const cameraY = cameraPos.y;

    // Clear
    this.ctx.fillStyle = '#0f0f23';
    this.ctx.fillRect(0, 0, width, height);

    // Calculate visible tiles
    const tilesX = Math.ceil(width / scaledTileSize) + 2;
    const tilesY = Math.ceil(height / scaledTileSize) + 2;

    const startTileX = Math.floor(cameraX - tilesX / 2);
    const startTileY = Math.floor(cameraY - tilesY / 2);

    // Render tiles
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const worldX = startTileX + x;
        const worldY = startTileY + y;

        const biome = this.worldGen.getBiomeAt(worldX, worldY);
        const color = this.biomeColors[biome];

        const screenX = (worldX - cameraX + tilesX / 2) * scaledTileSize;
        const screenY = (worldY - cameraY + tilesY / 2) * scaledTileSize;

        // Draw tile
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          Math.floor(screenX),
          Math.floor(screenY),
          scaledTileSize + 1,
          scaledTileSize + 1
        );

        // Add some detail noise
        const tileHeight = this.worldGen.getHeightAt(worldX, worldY);
        if (tileHeight > 0.6) {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          this.ctx.fillRect(
            Math.floor(screenX),
            Math.floor(screenY),
            scaledTileSize + 1,
            scaledTileSize + 1
          );
        }
      }
    }

    // Draw grid lines (subtle) - only on desktop
    if (!this.touchInput.getCapabilities().isMobile) {
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      this.ctx.lineWidth = 1;
      for (let x = 0; x <= tilesX; x++) {
        const screenX = (x - (cameraX % 1)) * scaledTileSize;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX, 0);
        this.ctx.lineTo(screenX, height);
        this.ctx.stroke();
      }
      for (let y = 0; y <= tilesY; y++) {
        const screenY = (y - (cameraY % 1)) * scaledTileSize;
        this.ctx.beginPath();
        this.ctx.moveTo(0, screenY);
        this.ctx.lineTo(width, screenY);
        this.ctx.stroke();
      }
    }

    // Draw player (center of screen)
    const playerScreenX = width / 2;
    const playerScreenY = height / 2;

    // Player shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(playerScreenX, playerScreenY + 12, 10, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Player body
    this.ctx.fillStyle = '#e94560';
    this.ctx.fillRect(playerScreenX - 8, playerScreenY - 16, 16, 24);

    // Player head
    this.ctx.fillStyle = '#ffeaa7';
    this.ctx.fillRect(playerScreenX - 6, playerScreenY - 24, 12, 10);

    // Direction indicator
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(playerScreenX, playerScreenY - 28, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Sprint effect
    if (this.isSprinting && this.survival.canSprint()) {
      this.ctx.strokeStyle = '#3498db';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(playerScreenX, playerScreenY, 20, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Draw debug info (only on desktop or tablet)
    const breakpoint = this.touchInput.getResponsiveConfig().currentBreakpoint;
    if (breakpoint === 'desktop' || breakpoint === 'tablet') {
      this.renderDebugInfo(width, height, zoom);
    }

    // Draw touch controls (only on touch devices)
    if (this.touchInput.isTouchEnabled()) {
      this.touchInput.render(this.ctx);
    }

    // Draw UI overlays when panels are open
    if (this.uiManager.hasOpenModal()) {
      this.renderModalOverlay(width, height);
    }
  }

  private renderDebugInfo(width: number, height: number, zoom: number): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(
      `Pos: (${Math.floor(this.playerX)}, ${Math.floor(this.playerY)}) | Zoom: ${zoom.toFixed(1)}x | State: ${this.playerState}`,
      10,
      height - 55
    );

    const currentBiome = this.worldGen.getBiomeAt(
      Math.floor(this.playerX),
      Math.floor(this.playerY)
    );
    const regionId = this.regionManager.getRegionId(
      Math.floor(this.playerX / 64),
      Math.floor(this.playerY / 64)
    );
    this.ctx.fillText(`Biome: ${currentBiome} | Region: ${regionId} | Regions Loaded: ${this.regionManager.getLoadedRegionCount()}`, 10, height - 40);
    this.ctx.fillText(
      `Inventory: Wood(${this.inventory.getItemCount('wood')}) Stone(${this.inventory.getItemCount('stone')}) Berries(${this.inventory.getItemCount('berries')})`,
      10,
      height - 25
    );
    this.ctx.fillText(
      `Playtime: ${this.formatPlaytime(this.totalPlaytime)} | Day ${this.gameDay}`,
      10,
      height - 10
    );
  }

  private formatPlaytime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private renderModalOverlay(width: number, height: number): void {
    // Darken background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, width, height);

    // Draw panel name
    const topModal = this.uiManager.getTopModal();
    if (topModal) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(topModal.toUpperCase(), width / 2, height / 2 - 20);

      this.ctx.font = '14px monospace';
      const closeText = this.touchInput.isTouchEnabled() ? 'Tap outside to close' : 'Press ESC to close';
      this.ctx.fillText(closeText, width / 2, height / 2 + 20);
      this.ctx.textAlign = 'left';
    }
  }
}

// ============================================================================
// Initialize
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Voxel RPG] Initializing game demo...');

  // Log system info
  const resourceManager = getResourceManager();
  const craftingManager = getCraftingManager();
  const touchInput = getTouchInputManager();

  console.log(`[Voxel RPG] Resources loaded: ${resourceManager.getResourceCount()}`);
  console.log(`[Voxel RPG] Recipes loaded: ${craftingManager.getRecipeCount()}`);
  console.log(`[Voxel RPG] Touch support: ${touchInput.getCapabilities().hasTouch ? 'Yes' : 'No'}`);
  console.log(`[Voxel RPG] Mobile device: ${touchInput.getCapabilities().isMobile ? 'Yes' : 'No'}`);

  // Start game
  new GameDemo();
});
