/**
 * Main entry point for the Voxel RPG game demo
 *
 * This initializes the game engine and renders a playable demo.
 */

import { WorldGenerator, BiomeType, getBiomeManager } from './world';
import { getSurvivalManager, getInventoryManager, getCraftingManager, getResourceManager } from './systems';
import { getEventBus } from './core/EventBus';

// ============================================================================
// Game Demo
// ============================================================================

class GameDemo {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private worldGen: WorldGenerator;
  private survival = getSurvivalManager();
  private inventory = getInventoryManager();

  // Player state
  private playerX = 0;
  private playerY = 0;
  private playerSpeed = 5;
  private isSprinting = false;

  // Camera
  private cameraX = 0;
  private cameraY = 0;
  private tileSize = 16;
  private zoom = 2;

  // Input state
  private keys: Set<string> = new Set();

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

    // Initialize world generator with random seed
    const seed = Math.floor(Math.random() * 1000000);
    this.worldGen = new WorldGenerator({ seed });

    // Find spawn point
    const spawn = this.worldGen.findSpawnPoint();
    this.playerX = spawn.x;
    this.playerY = spawn.y;

    // Give starting items
    this.inventory.addItem('wood', 10);
    this.inventory.addItem('stone', 5);
    this.inventory.addItem('berries', 3);

    // Initialize survival manager
    this.survival.initialize();

    this.setupInput();
    this.startGameLoop();

    console.log(`[GameDemo] Started with seed ${seed}, spawn at (${spawn.x}, ${spawn.y})`);
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      // Handle one-time actions
      if (e.code === 'KeyE') {
        this.interact();
      }
      if (e.code === 'Digit1') {
        // Eat berries
        if (this.inventory.hasItem('berries')) {
          this.inventory.removeItem('berries', 1);
          this.survival.consume('berries');
          console.log('[GameDemo] Ate berries');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
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
    // Handle movement
    let dx = 0;
    let dy = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    // Sprint
    this.isSprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
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
    }

    // Update camera
    this.cameraX = this.playerX;
    this.cameraY = this.playerY;

    // Update survival (simulated time)
    this.survival.update(deltaTime, {
      totalSeconds: 0,
      deltaTime,
      gameHour: 12,
      gameDay: 1,
      isPaused: false,
    });

    // Update UI
    this.updateUI();
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
    const { width, height } = this.canvas;
    const scaledTileSize = this.tileSize * this.zoom;

    // Clear
    this.ctx.fillStyle = '#0f0f23';
    this.ctx.fillRect(0, 0, width, height);

    // Calculate visible tiles
    const tilesX = Math.ceil(width / scaledTileSize) + 2;
    const tilesY = Math.ceil(height / scaledTileSize) + 2;

    const startTileX = Math.floor(this.cameraX - tilesX / 2);
    const startTileY = Math.floor(this.cameraY - tilesY / 2);

    // Render tiles
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const worldX = startTileX + x;
        const worldY = startTileY + y;

        const biome = this.worldGen.getBiomeAt(worldX, worldY);
        const color = this.biomeColors[biome];

        const screenX = (worldX - this.cameraX + tilesX / 2) * scaledTileSize;
        const screenY = (worldY - this.cameraY + tilesY / 2) * scaledTileSize;

        // Draw tile
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          Math.floor(screenX),
          Math.floor(screenY),
          scaledTileSize + 1,
          scaledTileSize + 1
        );

        // Add some detail noise
        const height = this.worldGen.getHeightAt(worldX, worldY);
        if (height > 0.6) {
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

    // Draw grid lines (subtle)
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= tilesX; x++) {
      const screenX = (x - (this.cameraX % 1)) * scaledTileSize;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= tilesY; y++) {
      const screenY = (y - (this.cameraY % 1)) * scaledTileSize;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(width, screenY);
      this.ctx.stroke();
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

    // Draw coordinates
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(
      `Pos: (${Math.floor(this.playerX)}, ${Math.floor(this.playerY)})`,
      10,
      height - 40
    );

    const currentBiome = this.worldGen.getBiomeAt(
      Math.floor(this.playerX),
      Math.floor(this.playerY)
    );
    this.ctx.fillText(`Biome: ${currentBiome}`, 10, height - 25);
    this.ctx.fillText(
      `Inventory: Wood(${this.inventory.getItemCount('wood')}) Stone(${this.inventory.getItemCount('stone')}) Berries(${this.inventory.getItemCount('berries')})`,
      10,
      height - 10
    );
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

  console.log(`[Voxel RPG] Resources loaded: ${resourceManager.getResourceCount()}`);
  console.log(`[Voxel RPG] Recipes loaded: ${craftingManager.getRecipeCount()}`);

  // Start game
  new GameDemo();
});
