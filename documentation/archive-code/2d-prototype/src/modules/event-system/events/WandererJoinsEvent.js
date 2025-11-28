/**
 * WandererJoinsEvent.js - Wanderer Joins positive event
 *
 * Effect: Free NPC spawns
 * Impact: +10 morale, +1 population
 * Probability: 3% per hour
 */

import Event, { EventType } from '../Event.js';

export default class WandererJoinsEvent extends Event {
  constructor(config = {}) {
    super({
      name: 'Wanderer Joins',
      description: 'A wanderer has been impressed by your settlement and wishes to join!',
      type: EventType.POSITIVE,
      duration: 5, // Instant event, short duration
      probability: 0.03, // 3% chance per hour
      effects: {
        morale: 10,
        npcs: { count: 1 }
      },
      conditions: {
        minPopulation: 1 // Need at least 1 NPC already
      },
      ...config
    });

    this.npcSpawned = false;
    this.npcId = null;
  }

  /**
   * Called when wanderer arrives
   */
  onStart(gameState) {
    // Apply morale boost
    if (gameState.townManager) {
      gameState.townManager.addMorale(this.effects.morale);
      // eslint-disable-next-line no-console
      console.log(`[Wanderer Joins] Applied morale boost: +${this.effects.morale}`);
    }

    // Spawn free NPC
    this._spawnWanderer(gameState);
  }

  /**
   * Called every tick
   */
  onTick(deltaTime, gameState) {
    // Instant event, no per-tick effects
  }

  /**
   * Called when event ends
   */
  onEnd(gameState) {
    if (this.npcSpawned) {
      // eslint-disable-next-line no-console
      console.log(`[Wanderer Joins] Wanderer successfully joined the settlement`);
    }
  }

  /**
   * Spawn wanderer as new NPC
   * @private
   */
  _spawnWanderer(gameState) {
    if (!gameState.npcManager) {
      console.error('[Wanderer Joins] NPCManager not available');
      return;
    }

    try {
      // Check if there's housing capacity
      const hasCapacity = this._checkHousingCapacity(gameState);
      if (!hasCapacity) {
        // eslint-disable-next-line no-console
        console.log('[Wanderer Joins] No housing capacity available, wanderer cannot join');
        return;
      }

      // Spawn NPC at territory center
      const spawnPosition = this._getSpawnPosition(gameState);
      const npc = gameState.npcManager.spawnNPC({
        position: spawnPosition,
        name: this._generateWandererName()
      });

      if (npc) {
        this.npcSpawned = true;
        this.npcId = npc.id;

        // Update population count if TownManager exists
        if (gameState.townManager) {
          gameState.townManager.updatePopulation();
        }

        // eslint-disable-next-line no-console
        console.log(`[Wanderer Joins] Spawned wanderer: ${npc.name} (${npc.id})`);
      }
    } catch (error) {
      console.error('[Wanderer Joins] Error spawning wanderer:', error);
    }
  }

  /**
   * Check if there's housing capacity
   * @private
   */
  _checkHousingCapacity(gameState) {
    if (!gameState.townManager) return true; // Allow if we can't check

    try {
      const population = gameState.npcManager?.npcs?.size || 0;
      const capacity = gameState.townManager.getHousingCapacity?.() || Infinity;
      return population < capacity;
    } catch (error) {
      console.error('[Wanderer Joins] Error checking housing capacity:', error);
      return true; // Allow on error
    }
  }

  /**
   * Get spawn position for wanderer
   * @private
   */
  _getSpawnPosition(gameState) {
    // Try to spawn at territory center
    if (gameState.territoryManager) {
      const territories = gameState.territoryManager.getAllTerritories?.();
      if (territories && territories.length > 0) {
        const mainTerritory = territories[0];
        return { ...mainTerritory.center };
      }
    }

    // Default spawn position
    return { x: 50, y: 0, z: 50 };
  }

  /**
   * Generate random wanderer name
   * @private
   */
  _generateWandererName() {
    const firstNames = [
      'Alex', 'Blake', 'Casey', 'Drew', 'Ellis', 'Finn', 'Gray', 'Harper',
      'Jordan', 'Logan', 'Morgan', 'Quinn', 'Riley', 'Sage', 'Taylor', 'Vale'
    ];
    const lastNames = [
      'Smith', 'Jones', 'Brown', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas',
      'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson'
    ];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return `${firstName} ${lastName} the Wanderer`;
  }

  /**
   * Get wanderer joins summary
   * @returns {Object} Summary of event
   */
  getSummary() {
    return {
      name: this.name,
      moraleBoost: this.effects.morale,
      npcSpawned: this.npcSpawned,
      npcId: this.npcId
    };
  }
}
