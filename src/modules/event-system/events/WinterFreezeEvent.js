/**
 * WinterFreezeEvent.js - Winter Freeze seasonal event
 *
 * Effect: -30% all production for 120 seconds
 * Impact: -10 morale, +0.2 food consumption (cold weather)
 * Frequency: Every 2 hours
 */

import Event, { EventType } from '../Event.js';

export default class WinterFreezeEvent extends Event {
  constructor(config = {}) {
    super({
      name: 'Winter Freeze',
      description: 'A harsh winter has arrived. Production slows and NPCs consume more food.',
      type: EventType.SEASONAL,
      duration: 120, // 120 seconds
      probability: 1.0, // Always triggers when scheduled
      effects: {
        morale: -10,
        production: { all: 0.7 } // -30% all production
      },
      ...config
    });

    this.seasonalInterval = 7200; // Trigger every 2 hours (7200 ticks)
    this.productionMultiplier = 0.7; // 30% reduction
    this.consumptionIncrease = 0.2; // +0.2 food consumption per NPC
  }

  /**
   * Called when winter starts
   */
  onStart(gameState) {
    // Apply morale penalty
    if (gameState.townManager) {
      gameState.townManager.addMorale(this.effects.morale);
      // eslint-disable-next-line no-console
      console.log(`[Winter Freeze] Applied morale penalty: ${this.effects.morale}`);
    }

    // Apply production penalty
    this._applyProductionPenalty(gameState);

    // Increase food consumption
    this._increaseConsumption(gameState);
  }

  /**
   * Called every tick during winter
   */
  onTick(deltaTime, gameState) {
    // Effects are persistent, no per-tick updates needed
  }

  /**
   * Called when winter ends
   */
  onEnd(gameState) {
    // Remove production penalty
    this._removeProductionPenalty(gameState);

    // Restore normal consumption
    this._decreaseConsumption(gameState);

    // eslint-disable-next-line no-console
    console.log('[Winter Freeze] Winter has ended');
  }

  /**
   * Apply production penalty
   * @private
   */
  _applyProductionPenalty(gameState) {
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
    console.log(`[Winter Freeze] Applied ${this.productionMultiplier}x production penalty to all resources`);
  }

  /**
   * Remove production penalty
   * @private
   */
  _removeProductionPenalty(gameState) {
    if (!gameState.eventMultipliers) return;

    const productionTypes = ['food', 'wood', 'stone', 'gold', 'essence', 'crystal'];
    for (const type of productionTypes) {
      if (gameState.eventMultipliers[type]) {
        gameState.eventMultipliers[type] /= this.productionMultiplier;
      }
    }

    // eslint-disable-next-line no-console
    console.log('[Winter Freeze] Removed production penalty');
  }

  /**
   * Increase food consumption
   * @private
   */
  _increaseConsumption(gameState) {
    if (!gameState.eventConsumptionModifiers) {
      gameState.eventConsumptionModifiers = { food: 0 };
    }
    gameState.eventConsumptionModifiers.food += this.consumptionIncrease;

    // eslint-disable-next-line no-console
    console.log(`[Winter Freeze] Increased food consumption by ${this.consumptionIncrease}`);
  }

  /**
   * Decrease food consumption (remove penalty)
   * @private
   */
  _decreaseConsumption(gameState) {
    if (gameState.eventConsumptionModifiers) {
      gameState.eventConsumptionModifiers.food -= this.consumptionIncrease;
      // eslint-disable-next-line no-console
      console.log('[Winter Freeze] Restored normal food consumption');
    }
  }

  /**
   * Get winter summary
   * @returns {Object} Summary of winter effects
   */
  getSummary() {
    return {
      name: this.name,
      moralePenalty: this.effects.morale,
      productionMultiplier: this.productionMultiplier,
      consumptionIncrease: this.consumptionIncrease,
      duration: this.duration
    };
  }
}
