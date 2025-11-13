/**
 * WildfireEvent.js - Wildfire disaster event
 *
 * Effect: Destroys random building (10% chance per wooden building)
 * Duration: 30 seconds
 * Mitigation: Stone buildings immune, watchtowers reduce chance by 50%
 * Impact: -20 morale, lose building resources
 */

import Event, { EventType } from '../Event.js';

export default class WildfireEvent extends Event {
  constructor(config = {}) {
    super({
      name: 'Wildfire',
      description: 'A wildfire is spreading through your territory! Wooden buildings are at risk.',
      type: EventType.DISASTER,
      duration: 30, // 30 seconds
      probability: 0.02, // 2% chance per hour
      effects: {
        morale: -20,
        buildings: { damage: 'fire' }
      },
      ...config
    });

    // Buildings destroyed during this event
    this.buildingsDestroyed = [];
    this.buildingsDamaged = [];

    // Watchtower mitigation
    this.hasWatchtower = false;
  }

  /**
   * Called when wildfire starts
   */
  onStart(gameState) {
    // Check for watchtowers (reduce destruction chance)
    if (gameState.buildings) {
      this.hasWatchtower = gameState.buildings.some(b =>
        b.type === 'WATCHTOWER' && (b.state === 'COMPLETE' || b.state === 'COMPLETED')
      );
    }

    // Apply immediate morale penalty
    if (gameState.townManager) {
      gameState.townManager.addMorale(this.effects.morale);
    }
  }

  /**
   * Called every tick during wildfire
   */
  onTick(deltaTime, gameState) {
    // Check buildings every 5 seconds
    if (this.ticksSinceStart % 5 === 0) {
      this._spreadFire(gameState);
    }
  }

  /**
   * Called when wildfire ends
   */
  onEnd(gameState) {
    // Log destruction summary
    if (this.buildingsDestroyed.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Wildfire destroyed ${this.buildingsDestroyed.length} buildings:`, this.buildingsDestroyed);
    }
  }

  /**
   * Spread fire to buildings
   * @private
   */
  _spreadFire(gameState) {
    if (!gameState.buildings || !gameState.gridManager) return;

    // Get all wooden buildings (vulnerable to fire)
    const woodenBuildingTypes = ['CAMPFIRE', 'FARM', 'HOUSE', 'LUMBER_MILL', 'WORKSHOP'];
    const vulnerableBuildings = gameState.buildings.filter(b =>
      woodenBuildingTypes.includes(b.type) &&
      (b.state === 'COMPLETE' || b.state === 'COMPLETED') &&
      !this.buildingsDestroyed.includes(b.id)
    );

    // Calculate destruction chance
    const baseChance = 0.10; // 10% per building check
    const watchtowerReduction = this.hasWatchtower ? 0.5 : 0; // 50% reduction if watchtower exists
    const destructionChance = baseChance * (1 - watchtowerReduction);

    // Roll for each vulnerable building
    for (const building of vulnerableBuildings) {
      const roll = Math.random();
      if (roll < destructionChance) {
        this._destroyBuilding(building, gameState);
      }
    }
  }

  /**
   * Destroy a building
   * @private
   */
  _destroyBuilding(building, gameState) {
    try {
      // Mark as destroyed
      this.buildingsDestroyed.push(building.id);

      // Remove building from grid
      if (gameState.gridManager) {
        gameState.gridManager.removeBuilding(building.id);
      }

      // Update storage (lose some resources)
      if (gameState.storageManager && gameState.buildingConfig) {
        const buildingDef = gameState.buildingConfig.getBuilding(building.type);
        if (buildingDef && buildingDef.cost) {
          // Lose 50% of building cost
          for (const [resource, amount] of Object.entries(buildingDef.cost)) {
            const loss = Math.floor(amount * 0.5);
            gameState.storageManager.removeResource(resource, loss);
          }
        }
      }

      // Remove NPC assignments
      if (gameState.npcAssignments) {
        const assignedNPCs = gameState.npcAssignments.getNPCsInBuilding(building.id);
        for (const npcId of assignedNPCs) {
          gameState.npcAssignments.unassignNPC(npcId);
        }
      }

      // eslint-disable-next-line no-console
      console.log(`[Wildfire] Destroyed building: ${building.type} (${building.id})`);
    } catch (error) {
      console.error(`[Wildfire] Error destroying building ${building.id}:`, error);
    }
  }

  /**
   * Get wildfire summary
   * @returns {Object} Summary of wildfire effects
   */
  getSummary() {
    return {
      name: this.name,
      buildingsDestroyed: this.buildingsDestroyed.length,
      buildingsDamaged: this.buildingsDamaged.length,
      hadWatchtowerMitigation: this.hasWatchtower,
      moraleImpact: this.effects.morale
    };
  }
}
