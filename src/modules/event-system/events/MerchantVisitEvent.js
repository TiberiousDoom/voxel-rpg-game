/**
 * MerchantVisitEvent.js - Merchant Visit positive event
 *
 * Effect: Trade resources (exchange wood for gold 1:2 ratio)
 * Duration: 60 seconds
 * Impact: +15 morale, +50 gold
 * Probability: 5% per hour
 */

import Event, { EventType } from '../Event.js';

export default class MerchantVisitEvent extends Event {
  constructor(config = {}) {
    super({
      name: 'Merchant Visit',
      description: 'A traveling merchant has arrived! Trade resources for gold.',
      type: EventType.POSITIVE,
      duration: 60, // 60 seconds
      probability: 0.05, // 5% chance per hour
      effects: {
        morale: 15,
        resources: { gold: 50 }
      },
      ...config
    });

    this.tradeRatio = { wood: 1, gold: 2 }; // 1 wood = 2 gold
    this.freeGold = 50;
    this.woodTraded = 0;
    this.goldGained = 0;
  }

  /**
   * Called when merchant arrives
   */
  onStart(gameState) {
    // Apply morale boost
    if (gameState.townManager) {
      gameState.townManager.addMorale(this.effects.morale);
      // eslint-disable-next-line no-console
      console.log(`[Merchant Visit] Applied morale boost: +${this.effects.morale}`);
    }

    // Give free gold
    this._giveFreeGold(gameState);

    // Offer trade (automatic for now)
    this._offerTrade(gameState);
  }

  /**
   * Called every tick during merchant visit
   */
  onTick(deltaTime, gameState) {
    // Merchant is present, no per-tick effects
  }

  /**
   * Called when merchant leaves
   */
  onEnd(gameState) {
    // eslint-disable-next-line no-console
    console.log(
      `[Merchant Visit] Merchant left. Traded ${this.woodTraded} wood for ${this.goldGained} gold`
    );
  }

  /**
   * Give free gold to player
   * @private
   */
  _giveFreeGold(gameState) {
    if (!gameState.storageManager) return;

    try {
      gameState.storageManager.addResource('gold', this.freeGold);
      this.goldGained += this.freeGold;
      // eslint-disable-next-line no-console
      console.log(`[Merchant Visit] Received ${this.freeGold} free gold`);
    } catch (error) {
      console.error('[Merchant Visit] Error giving free gold:', error);
    }
  }

  /**
   * Offer trade opportunity
   * @private
   */
  _offerTrade(gameState) {
    if (!gameState.storageManager) return;

    try {
      // Check available wood
      const availableWood = gameState.storageManager.getResource('wood');
      if (availableWood <= 0) {
        // eslint-disable-next-line no-console
        console.log('[Merchant Visit] No wood available to trade');
        return;
      }

      // Trade up to 50 wood (or all available wood)
      const woodToTrade = Math.min(50, availableWood);
      const goldToReceive = woodToTrade * this.tradeRatio.gold;

      // Execute trade
      gameState.storageManager.removeResource('wood', woodToTrade);
      gameState.storageManager.addResource('gold', goldToReceive);

      this.woodTraded = woodToTrade;
      this.goldGained += goldToReceive;

      // eslint-disable-next-line no-console
      console.log(`[Merchant Visit] Traded ${woodToTrade} wood for ${goldToReceive} gold`);
    } catch (error) {
      console.error('[Merchant Visit] Error during trade:', error);
    }
  }

  /**
   * Get merchant visit summary
   * @returns {Object} Summary of merchant visit
   */
  getSummary() {
    return {
      name: this.name,
      moraleBoost: this.effects.morale,
      woodTraded: this.woodTraded,
      goldGained: this.goldGained,
      freeGold: this.freeGold
    };
  }
}
