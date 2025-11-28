/**
 * SpringBloomEvent.js - Spring Bloom seasonal event
 *
 * Effect: +20% farm production for 180 seconds
 * Impact: +10 morale
 * Frequency: Every 3 hours
 */

import Event, { EventType } from '../Event.js';

export default class SpringBloomEvent extends Event {
  constructor(config = {}) {
    super({
      name: 'Spring Bloom',
      description: 'Spring has arrived! Farms are flourishing and spirits are high.',
      type: EventType.SEASONAL,
      duration: 180, // 180 seconds
      probability: 1.0, // Always triggers when scheduled
      effects: {
        morale: 10,
        production: { food: 1.2 } // +20% farm production
      },
      ...config
    });

    this.seasonalInterval = 10800; // Trigger every 3 hours (10800 ticks)
    this.productionMultiplier = 1.2; // 20% increase
  }

  /**
   * Called when spring starts
   */
  onStart(gameState) {
    // Apply morale boost
    if (gameState.townManager) {
      gameState.townManager.addMorale(this.effects.morale);
      // eslint-disable-next-line no-console
      console.log(`[Spring Bloom] Applied morale boost: +${this.effects.morale}`);
    }

    // Apply production bonus to farms
    this._applyProductionBonus(gameState);
  }

  /**
   * Called every tick during spring bloom
   */
  onTick(deltaTime, gameState) {
    // Production bonus is persistent, no per-tick effects needed
  }

  /**
   * Called when spring bloom ends
   */
  onEnd(gameState) {
    // Remove production bonus
    this._removeProductionBonus(gameState);

    // eslint-disable-next-line no-console
    console.log('[Spring Bloom] Spring bloom has ended');
  }

  /**
   * Apply production bonus
   * @private
   */
  _applyProductionBonus(gameState) {
    if (!gameState.eventMultipliers) {
      gameState.eventMultipliers = {};
    }
    if (!gameState.eventMultipliers.food) {
      gameState.eventMultipliers.food = 1.0;
    }
    gameState.eventMultipliers.food *= this.productionMultiplier;

    // eslint-disable-next-line no-console
    console.log(`[Spring Bloom] Applied ${this.productionMultiplier}x food production bonus`);
  }

  /**
   * Remove production bonus
   * @private
   */
  _removeProductionBonus(gameState) {
    if (gameState.eventMultipliers && gameState.eventMultipliers.food) {
      gameState.eventMultipliers.food /= this.productionMultiplier;
      // eslint-disable-next-line no-console
      console.log('[Spring Bloom] Removed food production bonus');
    }
  }

  /**
   * Get spring bloom summary
   * @returns {Object} Summary of spring bloom effects
   */
  getSummary() {
    return {
      name: this.name,
      moraleBoost: this.effects.morale,
      productionMultiplier: this.productionMultiplier,
      duration: this.duration
    };
  }
}
