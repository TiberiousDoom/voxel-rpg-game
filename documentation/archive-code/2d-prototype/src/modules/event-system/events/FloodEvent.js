/**
 * FloodEvent.js - Flood disaster event
 *
 * Effect: Damages all buildings in lowland areas (< 10 elevation)
 * Duration: 60 seconds
 * Mitigation: Territory on hills safe, farms take 50% damage
 * Impact: -30 food (spoilage), -15 morale
 */

import Event, { EventType } from '../Event.js';

export default class FloodEvent extends Event {
  constructor(config = {}) {
    super({
      name: 'Flood',
      description: 'Heavy rains have caused flooding in lowland areas! Buildings below elevation 10 are at risk.',
      type: EventType.DISASTER,
      duration: 60, // 60 seconds
      probability: 0.01, // 1% chance per hour
      effects: {
        morale: -15,
        resources: { food: -30 } // Food spoilage
      },
      ...config
    });

    // Track damage dealt
    this.buildingsDamaged = [];
    this.totalDamageDealt = 0;
    this.foodSpoiled = 30;
  }

  /**
   * Called when flood starts
   */
  onStart(gameState) {
    // Apply immediate effects
    this._applyFoodSpoilage(gameState);
    this._applyMoralePenalty(gameState);

    // Damage lowland buildings immediately
    this._damageBuildings(gameState);
  }

  /**
   * Called every tick during flood
   */
  onTick(deltaTime, gameState) {
    // Flood is persistent, no additional effects per tick
    // All damage is dealt at start
  }

  /**
   * Called when flood ends
   */
  onEnd(gameState) {
    // Log flood summary
    // eslint-disable-next-line no-console
    console.log(`Flood damaged ${this.buildingsDamaged.length} buildings, total damage: ${this.totalDamageDealt}`);
  }

  /**
   * Apply food spoilage
   * @private
   */
  _applyFoodSpoilage(gameState) {
    if (!gameState.storageManager) return;

    try {
      const currentFood = gameState.storageManager.getResource('food');
      const spoilage = Math.min(this.foodSpoiled, currentFood);
      gameState.storageManager.removeResource('food', spoilage);

      // eslint-disable-next-line no-console
      console.log(`[Flood] Spoiled ${spoilage} food`);
    } catch (error) {
      console.error('[Flood] Error applying food spoilage:', error);
    }
  }

  /**
   * Apply morale penalty
   * @private
   */
  _applyMoralePenalty(gameState) {
    if (!gameState.townManager) return;

    try {
      gameState.townManager.addMorale(this.effects.morale);
      // eslint-disable-next-line no-console
      console.log(`[Flood] Applied morale penalty: ${this.effects.morale}`);
    } catch (error) {
      console.error('[Flood] Error applying morale penalty:', error);
    }
  }

  /**
   * Damage buildings in lowland areas
   * @private
   */
  _damageBuildings(gameState) {
    if (!gameState.buildings) return;

    const LOWLAND_THRESHOLD = 10; // Y coordinate threshold
    const BASE_DAMAGE = 30; // Base damage to buildings
    const FARM_DAMAGE_MULTIPLIER = 0.5; // Farms take 50% damage (more resilient)

    for (const building of gameState.buildings) {
      // Skip incomplete buildings
      if (building.state !== 'COMPLETE' && building.state !== 'COMPLETED') continue;

      // Check if building is in lowland area
      const elevation = building.position?.y || 0;
      if (elevation >= LOWLAND_THRESHOLD) continue; // Safe on high ground

      // Calculate damage
      let damage = BASE_DAMAGE;
      if (building.type === 'FARM') {
        damage = Math.floor(damage * FARM_DAMAGE_MULTIPLIER);
      }

      // Apply damage
      this._damageBuilding(building, damage, gameState);
    }
  }

  /**
   * Damage a specific building
   * @private
   */
  _damageBuilding(building, damage, gameState) {
    try {
      // Track damage
      this.buildingsDamaged.push({
        id: building.id,
        type: building.type,
        damage: damage,
        elevation: building.position?.y || 0
      });
      this.totalDamageDealt += damage;

      // Apply damage to building
      if (building.health !== undefined) {
        building.health = Math.max(0, (building.health || 100) - damage);

        // Check if building is destroyed
        if (building.health <= 0) {
          this._destroyBuilding(building, gameState);
        }
      }

      // eslint-disable-next-line no-console
      console.log(`[Flood] Damaged ${building.type} (${building.id}) for ${damage} damage`);
    } catch (error) {
      console.error(`[Flood] Error damaging building ${building.id}:`, error);
    }
  }

  /**
   * Destroy a building that took fatal damage
   * @private
   */
  _destroyBuilding(building, gameState) {
    try {
      // Remove building from grid
      if (gameState.gridManager) {
        gameState.gridManager.removeBuilding(building.id);
      }

      // Remove NPC assignments
      if (gameState.npcAssignments) {
        const assignedNPCs = gameState.npcAssignments.getNPCsInBuilding(building.id);
        for (const npcId of assignedNPCs) {
          gameState.npcAssignments.unassignNPC(npcId);
        }
      }

      // eslint-disable-next-line no-console
      console.log(`[Flood] Destroyed building: ${building.type} (${building.id})`);
    } catch (error) {
      console.error(`[Flood] Error destroying building ${building.id}:`, error);
    }
  }

  /**
   * Get flood summary
   * @returns {Object} Summary of flood effects
   */
  getSummary() {
    return {
      name: this.name,
      buildingsDamaged: this.buildingsDamaged.length,
      totalDamage: this.totalDamageDealt,
      foodSpoiled: this.foodSpoiled,
      moraleImpact: this.effects.morale,
      damagedBuildings: this.buildingsDamaged
    };
  }
}
