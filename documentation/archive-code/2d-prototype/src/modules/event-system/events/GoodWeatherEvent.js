/**
 * GoodWeatherEvent.js - Good Weather positive event
 *
 * Effect: +10% all production for 120 seconds
 * Impact: +5 morale
 * Probability: 10% per hour
 */

import Event, { EventType } from '../Event.js';

export default class GoodWeatherEvent extends Event {
  constructor(config = {}) {
    super({
      name: 'Good Weather',
      description: 'Perfect weather conditions boost productivity across your settlement!',
      type: EventType.POSITIVE,
      duration: 120, // 120 seconds
      probability: 0.10, // 10% chance per hour
      effects: {
        morale: 5,
        production: { all: 1.1 } // +10% all production
      },
      ...config
    });

    this.productionMultiplier = 1.1; // 10% increase
  }

  /**
   * Called when good weather starts
   */
  onStart(gameState) {
    // Apply morale boost
    if (gameState.townManager) {
      gameState.townManager.addMorale(this.effects.morale);
      // eslint-disable-next-line no-console
      console.log(`[Good Weather] Applied morale boost: +${this.effects.morale}`);
    }

    // Apply production bonus
    this._applyProductionBonus(gameState);
  }

  /**
   * Called every tick during good weather
   */
  onTick(deltaTime, gameState) {
    // Production bonus is persistent, no per-tick effects needed
  }

  /**
   * Called when good weather ends
   */
  onEnd(gameState) {
    // Remove production bonus
    this._removeProductionBonus(gameState);

    // eslint-disable-next-line no-console
    console.log('[Good Weather] Good weather has ended');
  }

  /**
   * Apply production bonus
   * @private
   */
  _applyProductionBonus(gameState) {
    if (!gameState.eventMultipliers) {
      gameState.eventMultipliers = {};
    }

    // Apply to all production types
    const productionTypes = ['food', 'wood', 'stone', 'gold', 'essence', 'crystal'];
    for (const type of productionTypes) {
      if (!gameState.eventMultipliers[type]) {
        gameState.eventMultipliers[type] = 1.0;
      }
      gameState.eventMultipliers[type] *= this.productionMultiplier;
    }

    // eslint-disable-next-line no-console
    console.log(`[Good Weather] Applied ${this.productionMultiplier}x production bonus to all resources`);
  }

  /**
   * Remove production bonus
   * @private
   */
  _removeProductionBonus(gameState) {
    if (!gameState.eventMultipliers) return;

    const productionTypes = ['food', 'wood', 'stone', 'gold', 'essence', 'crystal'];
    for (const type of productionTypes) {
      if (gameState.eventMultipliers[type]) {
        gameState.eventMultipliers[type] /= this.productionMultiplier;
      }
    }

    // eslint-disable-next-line no-console
    console.log('[Good Weather] Removed production bonus');
  }

  /**
   * Get good weather summary
   * @returns {Object} Summary of good weather effects
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
