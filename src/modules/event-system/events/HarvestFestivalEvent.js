/**
 * HarvestFestivalEvent.js - Harvest Festival seasonal event
 *
 * Effect: +50% food production for 60 seconds
 * Impact: +20 morale, NPCs idle during festival
 * Frequency: Every 720 ticks (1 hour)
 */

import Event, { EventType } from '../Event.js';

export default class HarvestFestivalEvent extends Event {
  constructor(config = {}) {
    super({
      name: 'Harvest Festival',
      description: 'The town celebrates a bountiful harvest! Food production increased.',
      type: EventType.SEASONAL,
      duration: 60, // 60 seconds
      probability: 1.0, // Always triggers when scheduled
      effects: {
        morale: 20,
        production: { food: 1.5 } // +50% food production
      },
      ...config
    });

    this.seasonalInterval = 3600; // Trigger every hour (3600 ticks)
    this.productionMultiplier = 1.5;
  }

  /**
   * Called when festival starts
   */
  onStart(gameState) {
    // Apply morale boost
    if (gameState.townManager) {
      gameState.townManager.addMorale(this.effects.morale);
      // eslint-disable-next-line no-console
      console.log(`[Harvest Festival] Applied morale boost: +${this.effects.morale}`);
    }

    // Apply production multiplier
    if (gameState.productionTick || gameState.buildingEffect) {
      this._applyProductionBonus(gameState);
    }
  }

  /**
   * Called every tick during festival
   */
  onTick(deltaTime, gameState) {
    // Production bonus is persistent, no per-tick effects needed
  }

  /**
   * Called when festival ends
   */
  onEnd(gameState) {
    // Remove production multiplier
    if (gameState.productionTick || gameState.buildingEffect) {
      this._removeProductionBonus(gameState);
    }

    // eslint-disable-next-line no-console
    console.log('[Harvest Festival] Festival ended');
  }

  /**
   * Apply production bonus
   * @private
   */
  _applyProductionBonus(gameState) {
    // Note: This is a simplified implementation
    // In a real implementation, you'd integrate with the production system
    // to apply a temporary multiplier to food production

    // Store the multiplier in game state for ProductionTick to use
    if (!gameState.eventMultipliers) {
      gameState.eventMultipliers = {};
    }
    if (!gameState.eventMultipliers.food) {
      gameState.eventMultipliers.food = 1.0;
    }
    gameState.eventMultipliers.food *= this.productionMultiplier;

    // eslint-disable-next-line no-console
    console.log(`[Harvest Festival] Applied ${this.productionMultiplier}x food production bonus`);
  }

  /**
   * Remove production bonus
   * @private
   */
  _removeProductionBonus(gameState) {
    if (gameState.eventMultipliers && gameState.eventMultipliers.food) {
      gameState.eventMultipliers.food /= this.productionMultiplier;
      // eslint-disable-next-line no-console
      console.log('[Harvest Festival] Removed food production bonus');
    }
  }

  /**
   * Get festival summary
   * @returns {Object} Summary of festival effects
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
