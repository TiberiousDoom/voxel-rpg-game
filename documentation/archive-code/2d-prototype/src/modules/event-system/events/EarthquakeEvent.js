/**
 * EarthquakeEvent.js - Earthquake disaster event
 *
 * Effect: All buildings take 20-50 damage
 * Duration: Instant (one-time damage)
 * Mitigation: Castle tier buildings take 50% less damage
 * Impact: -40 morale, possible building destruction
 */

import Event, { EventType } from '../Event.js';

export default class EarthquakeEvent extends Event {
  constructor(config = {}) {
    super({
      name: 'Earthquake',
      description: 'An earthquake shakes your territory! All buildings are taking damage!',
      type: EventType.DISASTER,
      duration: 5, // Short duration, damage is instant
      probability: 0.005, // 0.5% chance per hour (rare)
      effects: {
        morale: -40, // Severe morale impact
        buildings: { damage: 'structural' }
      },
      ...config
    });

    // Track damage dealt
    this.buildingsDamaged = [];
    this.buildingsDestroyed = [];
    this.totalDamageDealt = 0;
  }

  /**
   * Called when earthquake starts
   */
  onStart(gameState) {
    // Apply immediate effects
    this._applyMoralePenalty(gameState);

    // Damage all buildings immediately
    this._damageAllBuildings(gameState);
  }

  /**
   * Called every tick during earthquake
   */
  onTick(deltaTime, gameState) {
    // Earthquake damage is instant, no per-tick effects
  }

  /**
   * Called when earthquake ends
   */
  onEnd(gameState) {
    // Log earthquake summary
    // eslint-disable-next-line no-console
    console.log(
      `Earthquake damaged ${this.buildingsDamaged.length} buildings, ` +
      `destroyed ${this.buildingsDestroyed.length} buildings, ` +
      `total damage: ${this.totalDamageDealt}`
    );
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
      console.log(`[Earthquake] Applied morale penalty: ${this.effects.morale}`);
    } catch (error) {
      console.error('[Earthquake] Error applying morale penalty:', error);
    }
  }

  /**
   * Damage all buildings
   * @private
   */
  _damageAllBuildings(gameState) {
    if (!gameState.buildings) return;

    const MIN_DAMAGE = 20;
    const MAX_DAMAGE = 50;
    const CASTLE_TIER_BUILDINGS = ['CASTLE', 'FORTRESS', 'CITADEL', 'KEEP'];

    for (const building of gameState.buildings) {
      // Skip incomplete buildings
      if (building.state !== 'COMPLETE' && building.state !== 'COMPLETED') continue;

      // Calculate random damage
      let damage = Math.floor(Math.random() * (MAX_DAMAGE - MIN_DAMAGE + 1)) + MIN_DAMAGE;

      // Apply mitigation for castle-tier buildings
      if (CASTLE_TIER_BUILDINGS.includes(building.type)) {
        damage = Math.floor(damage * 0.5); // 50% damage reduction
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
      // Initialize health if not set
      if (building.health === undefined) {
        building.health = 100;
      }

      // Track damage
      const damageRecord = {
        id: building.id,
        type: building.type,
        damage: damage,
        healthBefore: building.health
      };

      // Apply damage
      building.health = Math.max(0, building.health - damage);
      damageRecord.healthAfter = building.health;

      this.buildingsDamaged.push(damageRecord);
      this.totalDamageDealt += damage;

      // Check if building is destroyed
      if (building.health <= 0) {
        this._destroyBuilding(building, gameState);
      }

      // eslint-disable-next-line no-console
      console.log(
        `[Earthquake] Damaged ${building.type} (${building.id}) for ${damage} damage ` +
        `(${damageRecord.healthBefore} -> ${damageRecord.healthAfter})`
      );
    } catch (error) {
      console.error(`[Earthquake] Error damaging building ${building.id}:`, error);
    }
  }

  /**
   * Destroy a building that took fatal damage
   * @private
   */
  _destroyBuilding(building, gameState) {
    try {
      this.buildingsDestroyed.push(building.id);

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

      // Update storage (lose some resources)
      if (gameState.storageManager && gameState.buildingConfig) {
        const buildingDef = gameState.buildingConfig.getBuilding(building.type);
        if (buildingDef && buildingDef.cost) {
          // Lose 30% of building cost
          for (const [resource, amount] of Object.entries(buildingDef.cost)) {
            const loss = Math.floor(amount * 0.3);
            gameState.storageManager.removeResource(resource, loss);
          }
        }
      }

      // eslint-disable-next-line no-console
      console.log(`[Earthquake] Destroyed building: ${building.type} (${building.id})`);
    } catch (error) {
      console.error(`[Earthquake] Error destroying building ${building.id}:`, error);
    }
  }

  /**
   * Get earthquake summary
   * @returns {Object} Summary of earthquake effects
   */
  getSummary() {
    return {
      name: this.name,
      buildingsDamaged: this.buildingsDamaged.length,
      buildingsDestroyed: this.buildingsDestroyed.length,
      totalDamage: this.totalDamageDealt,
      moraleImpact: this.effects.morale,
      damageDetails: this.buildingsDamaged,
      destroyedBuildings: this.buildingsDestroyed
    };
  }
}
