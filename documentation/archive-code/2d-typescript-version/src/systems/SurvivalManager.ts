/**
 * SurvivalManager - Manages player survival mechanics
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Phase 1 Survival Mechanics:
 * - Health: Via damage, 0 = death
 * - Hunger: 2.0/hour decay, 20 critical = health drain, speed reduction
 * - Stamina: Via actions, 0 = cannot sprint, reduced actions
 */

import type { GameSystem } from '@core/GameEngine';
import { getEventBus } from '@core/EventBus';
import type { GameTime } from '@core/types';
import { getResourceManager } from './ResourceManager';

// ============================================================================
// Survival Configuration
// ============================================================================

export interface SurvivalConfig {
  maxHealth: number;
  maxHunger: number;
  maxStamina: number;

  hungerDecayRate: number;     // Per game hour
  staminaRegenRate: number;    // Per second when resting
  hungerCritical: number;      // Below this, negative effects apply
  staminaCritical: number;     // Below this, cannot sprint

  hungerHealthDrain: number;   // Health lost per second when critical
  hungerSpeedPenalty: number;  // Speed multiplier when hungry (0.5 = 50%)

  sprintStaminaCost: number;   // Stamina per second while sprinting
  attackStaminaCost: number;   // Stamina per attack
  mineStaminaCost: number;     // Stamina per mining action
}

const DEFAULT_CONFIG: SurvivalConfig = {
  maxHealth: 100,
  maxHunger: 100,
  maxStamina: 100,

  hungerDecayRate: 2.0,
  staminaRegenRate: 10,
  hungerCritical: 20,
  staminaCritical: 10,

  hungerHealthDrain: 1,
  hungerSpeedPenalty: 0.5,

  sprintStaminaCost: 15,
  attackStaminaCost: 10,
  mineStaminaCost: 5,
};

// ============================================================================
// Player Stats
// ============================================================================

export interface PlayerStats {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  stamina: number;
  maxStamina: number;
}

// ============================================================================
// SurvivalManager Implementation
// ============================================================================

export class SurvivalManager implements GameSystem {
  public readonly name = 'SurvivalManager';

  private config: SurvivalConfig;
  private health: number;
  private hunger: number;
  private stamina: number;
  private isResting: boolean = false;
  private isSprinting: boolean = false;
  private isDead: boolean = false;

  // Accumulator for hunger decay (tracks fractional game hours)
  private hungerAccumulator: number = 0;

  constructor(config: Partial<SurvivalConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.health = this.config.maxHealth;
    this.hunger = this.config.maxHunger;
    this.stamina = this.config.maxStamina;
  }

  /**
   * Initialize the survival manager
   */
  public initialize(): void {
    const eventBus = getEventBus();

    // Listen for sprint state changes
    eventBus.on('input:actionPressed', (event) => {
      if (event.action === 'sprint') {
        this.isSprinting = true;
      }
    });

    eventBus.on('input:actionReleased', (event) => {
      if (event.action === 'sprint') {
        this.isSprinting = false;
      }
    });

    console.log('[SurvivalManager] Initialized');
  }

  /**
   * Update survival mechanics each frame
   */
  public update(deltaTime: number, gameTime: GameTime): void {
    if (this.isDead) return;

    // Update hunger based on game time
    this.updateHunger(deltaTime, gameTime);

    // Update stamina
    this.updateStamina(deltaTime);

    // Apply critical hunger effects
    this.applyCriticalEffects(deltaTime);
  }

  /**
   * Update hunger decay
   */
  private updateHunger(deltaTime: number, gameTime: GameTime): void {
    // Convert real time to game hours (assuming 1 game hour = 1 minute real time)
    const gameHoursPerSecond = 1 / 60; // 1 hour per 60 real seconds
    this.hungerAccumulator += deltaTime * gameHoursPerSecond * this.config.hungerDecayRate;

    // Apply accumulated hunger decay
    if (this.hungerAccumulator >= 1) {
      const decay = Math.floor(this.hungerAccumulator);
      this.hunger = Math.max(0, this.hunger - decay);
      this.hungerAccumulator -= decay;
    }
  }

  /**
   * Update stamina (drain if sprinting, regen if resting)
   */
  private updateStamina(deltaTime: number): void {
    if (this.isSprinting && this.stamina > 0) {
      this.stamina = Math.max(0, this.stamina - this.config.sprintStaminaCost * deltaTime);
    } else if (!this.isSprinting && this.stamina < this.config.maxStamina) {
      // Regen rate is reduced if hungry
      const regenMultiplier = this.isHungryCritical() ? 0.5 : 1.0;
      this.stamina = Math.min(
        this.config.maxStamina,
        this.stamina + this.config.staminaRegenRate * deltaTime * regenMultiplier
      );
    }
  }

  /**
   * Apply effects when survival stats are critical
   */
  private applyCriticalEffects(deltaTime: number): void {
    // Health drain from starvation
    if (this.isHungryCritical()) {
      this.takeDamage(this.config.hungerHealthDrain * deltaTime, 'starvation');
    }
  }

  // ==========================================================================
  // Public API - Health
  // ==========================================================================

  /**
   * Get current health
   */
  public getHealth(): number {
    return this.health;
  }

  /**
   * Get max health
   */
  public getMaxHealth(): number {
    return this.config.maxHealth;
  }

  /**
   * Take damage
   */
  public takeDamage(amount: number, source: string = 'unknown'): void {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);

    const eventBus = getEventBus();
    eventBus.emit('entity:damaged', {
      entityId: 'player',
      amount,
      sourceId: source,
    });

    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Heal the player
   */
  public heal(amount: number): void {
    if (this.isDead) return;

    const oldHealth = this.health;
    this.health = Math.min(this.config.maxHealth, this.health + amount);
    const healed = this.health - oldHealth;

    if (healed > 0) {
      const eventBus = getEventBus();
      eventBus.emit('entity:healed', {
        entityId: 'player',
        amount: healed,
      });
    }
  }

  /**
   * Check if player is dead
   */
  public isPlayerDead(): boolean {
    return this.isDead;
  }

  /**
   * Handle player death
   */
  private die(): void {
    this.isDead = true;
    const eventBus = getEventBus();
    eventBus.emit('entity:died', {
      entityId: 'player',
      killerId: null,
    });
  }

  /**
   * Respawn player (reset stats)
   */
  public respawn(): void {
    this.health = this.config.maxHealth;
    this.hunger = this.config.maxHunger;
    this.stamina = this.config.maxStamina;
    this.isDead = false;
    this.hungerAccumulator = 0;
  }

  // ==========================================================================
  // Public API - Hunger
  // ==========================================================================

  /**
   * Get current hunger
   */
  public getHunger(): number {
    return this.hunger;
  }

  /**
   * Get max hunger
   */
  public getMaxHunger(): number {
    return this.config.maxHunger;
  }

  /**
   * Check if hunger is critical
   */
  public isHungryCritical(): boolean {
    return this.hunger <= this.config.hungerCritical;
  }

  /**
   * Restore hunger (eating)
   */
  public restoreHunger(amount: number): void {
    this.hunger = Math.min(this.config.maxHunger, this.hunger + amount);
  }

  /**
   * Get speed multiplier based on hunger
   */
  public getSpeedMultiplier(): number {
    return this.isHungryCritical() ? this.config.hungerSpeedPenalty : 1.0;
  }

  // ==========================================================================
  // Public API - Stamina
  // ==========================================================================

  /**
   * Get current stamina
   */
  public getStamina(): number {
    return this.stamina;
  }

  /**
   * Get max stamina
   */
  public getMaxStamina(): number {
    return this.config.maxStamina;
  }

  /**
   * Check if stamina is critical
   */
  public isStaminaCritical(): boolean {
    return this.stamina <= this.config.staminaCritical;
  }

  /**
   * Check if player can sprint
   */
  public canSprint(): boolean {
    return this.stamina > this.config.staminaCritical;
  }

  /**
   * Use stamina for an action
   * Returns true if action was possible
   */
  public useStamina(amount: number): boolean {
    if (this.stamina < amount) return false;
    this.stamina -= amount;
    return true;
  }

  /**
   * Use stamina for attack
   */
  public useAttackStamina(): boolean {
    return this.useStamina(this.config.attackStaminaCost);
  }

  /**
   * Use stamina for mining
   */
  public useMineStamina(): boolean {
    return this.useStamina(this.config.mineStaminaCost);
  }

  // ==========================================================================
  // Public API - Consumables
  // ==========================================================================

  /**
   * Consume a food/consumable item
   * Returns true if consumed successfully
   */
  public consume(resourceId: string): boolean {
    const resourceManager = getResourceManager();
    const resource = resourceManager.getResource(resourceId);

    if (!resource) return false;
    if (!resourceManager.isConsumable(resourceId)) return false;

    // Apply effects
    if (resource.healAmount) {
      if (resource.healAmount > 0) {
        this.heal(resource.healAmount);
      } else {
        this.takeDamage(-resource.healAmount, 'food_poisoning');
      }
    }

    if (resource.hungerRestore) {
      this.restoreHunger(resource.hungerRestore);
    }

    return true;
  }

  // ==========================================================================
  // Stats Summary
  // ==========================================================================

  /**
   * Get all player stats
   */
  public getStats(): PlayerStats {
    return {
      health: this.health,
      maxHealth: this.config.maxHealth,
      hunger: this.hunger,
      maxHunger: this.config.maxHunger,
      stamina: this.stamina,
      maxStamina: this.config.maxStamina,
    };
  }

  /**
   * Set stats (for loading saves)
   */
  public setStats(stats: Partial<PlayerStats>): void {
    if (stats.health !== undefined) this.health = stats.health;
    if (stats.hunger !== undefined) this.hunger = stats.hunger;
    if (stats.stamina !== undefined) this.stamina = stats.stamina;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    console.log('[SurvivalManager] Destroyed');
  }
}

// ============================================================================
// Singleton Access
// ============================================================================

let survivalManagerInstance: SurvivalManager | null = null;

export function getSurvivalManager(): SurvivalManager {
  if (!survivalManagerInstance) {
    survivalManagerInstance = new SurvivalManager();
  }
  return survivalManagerInstance;
}
