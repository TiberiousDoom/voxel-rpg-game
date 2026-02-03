/**
 * GameEngine - Central orchestrator for all game systems
 *
 * Manages the game loop, system initialization, and coordinates
 * between all subsystems.
 */

import { EventBus, getEventBus } from './EventBus';
import type { GameConfig, GameTime } from './types';

// ============================================================================
// System Interface
// ============================================================================

export interface GameSystem {
  readonly name: string;
  initialize?(): void | Promise<void>;
  update?(deltaTime: number, gameTime: GameTime): void;
  fixedUpdate?(fixedDeltaTime: number, gameTime: GameTime): void;
  lateUpdate?(deltaTime: number, gameTime: GameTime): void;
  destroy?(): void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: GameConfig = {
  tileSize: 32,
  regionSize: 64,
  loadDistance: 2,
  unloadDistance: 3,
  dayLengthSeconds: 600, // 10 real minutes = 1 game day
};

// ============================================================================
// GameEngine Implementation
// ============================================================================

export class GameEngine {
  private static instance: GameEngine | null = null;

  private config: GameConfig;
  private systems: Map<string, GameSystem> = new Map();
  private systemOrder: string[] = [];
  private eventBus: EventBus;

  private isRunning = false;
  private isPaused = false;
  private lastFrameTime = 0;
  private accumulatedTime = 0;
  private readonly fixedTimeStep = 1 / 60; // 60 Hz fixed update

  private gameTime: GameTime = {
    totalSeconds: 0,
    deltaTime: 0,
    gameHour: 6, // Start at 6 AM
    gameDay: 1,
    isPaused: false,
  };

  private animationFrameId: number | null = null;

  private constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = getEventBus();
  }

  /**
   * Get the singleton GameEngine instance
   */
  public static getInstance(config?: Partial<GameConfig>): GameEngine {
    if (!GameEngine.instance) {
      GameEngine.instance = new GameEngine(config);
    }
    return GameEngine.instance;
  }

  /**
   * Reset the GameEngine (useful for testing)
   */
  public static reset(): void {
    if (GameEngine.instance) {
      GameEngine.instance.stop();
      GameEngine.instance.systems.clear();
      GameEngine.instance.systemOrder = [];
    }
    GameEngine.instance = null;
    EventBus.reset();
  }

  /**
   * Get the game configuration
   */
  public getConfig(): Readonly<GameConfig> {
    return this.config;
  }

  /**
   * Get the current game time
   */
  public getGameTime(): Readonly<GameTime> {
    return this.gameTime;
  }

  /**
   * Register a game system
   * @param system - The system to register
   * @param order - Optional order index (lower = earlier in update loop)
   */
  public registerSystem(system: GameSystem, order?: number): void {
    if (this.systems.has(system.name)) {
      console.warn(`System "${system.name}" is already registered. Skipping.`);
      return;
    }

    this.systems.set(system.name, system);

    if (order !== undefined) {
      // Insert at specific position
      this.systemOrder.splice(order, 0, system.name);
    } else {
      // Append to end
      this.systemOrder.push(system.name);
    }
  }

  /**
   * Unregister a game system
   * @param name - The name of the system to unregister
   */
  public unregisterSystem(name: string): void {
    const system = this.systems.get(name);
    if (system) {
      system.destroy?.();
      this.systems.delete(name);
      this.systemOrder = this.systemOrder.filter(n => n !== name);
    }
  }

  /**
   * Get a registered system by name
   */
  public getSystem<T extends GameSystem>(name: string): T | undefined {
    return this.systems.get(name) as T | undefined;
  }

  /**
   * Initialize all registered systems
   */
  public async initialize(): Promise<void> {
    console.log('[GameEngine] Initializing systems...');

    for (const name of this.systemOrder) {
      const system = this.systems.get(name);
      if (system?.initialize) {
        console.log(`[GameEngine] Initializing ${name}...`);
        await system.initialize();
      }
    }

    console.log('[GameEngine] All systems initialized.');
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('[GameEngine] Game loop is already running.');
      return;
    }

    console.log('[GameEngine] Starting game loop...');
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.eventBus.emit('game:started', {});
    this.loop();
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[GameEngine] Stopping game loop...');
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.eventBus.emit('game:quit', {});
  }

  /**
   * Pause the game
   */
  public pause(): void {
    if (this.isPaused) return;

    this.isPaused = true;
    this.gameTime.isPaused = true;
    this.eventBus.emit('game:paused', {});
    this.eventBus.emit('time:paused', {});
  }

  /**
   * Resume the game
   */
  public resume(): void {
    if (!this.isPaused) return;

    this.isPaused = false;
    this.gameTime.isPaused = false;
    this.lastFrameTime = performance.now(); // Reset to avoid huge delta
    this.eventBus.emit('game:resumed', {});
    this.eventBus.emit('time:resumed', {});
  }

  /**
   * Toggle pause state
   */
  public togglePause(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Check if the game is currently running
   */
  public isGameRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check if the game is currently paused
   */
  public isGamePaused(): boolean {
    return this.isPaused;
  }

  /**
   * Main game loop
   */
  private loop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1); // Cap at 100ms
    this.lastFrameTime = currentTime;

    // Update game time
    this.gameTime.deltaTime = deltaTime;

    if (!this.isPaused) {
      this.gameTime.totalSeconds += deltaTime;
      this.updateGameClock(deltaTime);

      // Process queued events
      this.eventBus.processQueue();

      // Fixed update (physics, etc.)
      this.accumulatedTime += deltaTime;
      while (this.accumulatedTime >= this.fixedTimeStep) {
        this.fixedUpdate(this.fixedTimeStep);
        this.accumulatedTime -= this.fixedTimeStep;
      }

      // Variable update
      this.update(deltaTime);

      // Late update (camera, etc.)
      this.lateUpdate(deltaTime);
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Update game clock (day/night cycle)
   */
  private updateGameClock(deltaTime: number): void {
    const secondsPerGameHour = this.config.dayLengthSeconds / 24;
    const hoursElapsed = deltaTime / secondsPerGameHour;

    const previousHour = Math.floor(this.gameTime.gameHour);
    this.gameTime.gameHour += hoursElapsed;

    // Check for hour change
    const currentHour = Math.floor(this.gameTime.gameHour);
    if (currentHour !== previousHour && currentHour < 24) {
      this.eventBus.emit('time:hourChanged', {
        hour: currentHour,
        day: this.gameTime.gameDay,
      });
    }

    // Check for day change
    if (this.gameTime.gameHour >= 24) {
      this.gameTime.gameHour -= 24;
      this.gameTime.gameDay += 1;
      this.eventBus.emit('time:dayChanged', { day: this.gameTime.gameDay });
      this.eventBus.emit('time:hourChanged', {
        hour: Math.floor(this.gameTime.gameHour),
        day: this.gameTime.gameDay,
      });
    }
  }

  /**
   * Fixed timestep update (for physics, etc.)
   */
  private fixedUpdate(fixedDeltaTime: number): void {
    for (const name of this.systemOrder) {
      const system = this.systems.get(name);
      system?.fixedUpdate?.(fixedDeltaTime, this.gameTime);
    }
  }

  /**
   * Variable timestep update
   */
  private update(deltaTime: number): void {
    for (const name of this.systemOrder) {
      const system = this.systems.get(name);
      system?.update?.(deltaTime, this.gameTime);
    }
  }

  /**
   * Late update (after all systems have updated)
   */
  private lateUpdate(deltaTime: number): void {
    for (const name of this.systemOrder) {
      const system = this.systems.get(name);
      system?.lateUpdate?.(deltaTime, this.gameTime);
    }
  }
}

// Export singleton getter for convenience
export const getGameEngine = (config?: Partial<GameConfig>): GameEngine =>
  GameEngine.getInstance(config);
