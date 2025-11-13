/**
 * ConsumptionSystem.js - NPC food consumption and management
 *
 * Handles:
 * - NPC food consumption based on work status
 * - Starvation detection and NPC death
 * - Happiness tracking
 * - Morale updates
 *
 * Based on FORMULAS.md section 5: NPC FOOD CONSUMPTION
 * - Working: 0.5 food/min
 * - Idle: 0.1 food/min
 */

class ConsumptionSystem {
  /**
   * Initialize consumption system
   */
  constructor() {
    this.npcConsumptionData = new Map(); // npcId -> {isWorking, happiness, morale}
    this.consumptionStats = {
      totalConsumed: 0,
      npcsDead: 0,
      starvationEvents: []
    };
  }

  /**
   * Register an NPC in the consumption system
   * @param {string} npcId - Unique NPC ID
   * @param {boolean} isWorking - Whether NPC is currently working
   */
  registerNPC(npcId, isWorking = false) {
    if (!this.npcConsumptionData.has(npcId)) {
      this.npcConsumptionData.set(npcId, {
        id: npcId,
        isWorking: isWorking,
        happiness: 50,
        morale: 0,
        alive: true
      });
    }
  }

  /**
   * Set NPC work status
   * @param {string} npcId - NPC ID
   * @param {boolean} isWorking - Working status
   */
  setNPCWorking(npcId, isWorking) {
    if (this.npcConsumptionData.has(npcId)) {
      this.npcConsumptionData.get(npcId).isWorking = isWorking;
    }
  }

  /**
   * Get all alive NPCs
   * @returns {Array<Object>} Array of alive NPC data
   */
  getAliveNPCs() {
    const alive = [];
    for (const npc of this.npcConsumptionData.values()) {
      if (npc.alive) {
        alive.push(npc);
      }
    }
    return alive;
  }

  /**
   * Calculate food consumption per tick (5 seconds)
   *
   * 1 minute = 12 ticks
   * Working: 0.5 food/min = 0.5/12 per tick = 0.04167
   * Idle: 0.1 food/min = 0.1/12 per tick = 0.00833
   *
   * @param {string} npcId - NPC ID
   * @returns {number} Food consumption for this tick
   */
  calculateConsumption(npcId) {
    const npc = this.npcConsumptionData.get(npcId);
    if (!npc || !npc.alive) {
      return 0;
    }

    // 5 seconds = 1/12 minute
    if (npc.isWorking) {
      return 0.5 / 12.0; // 0.04167 food per tick
    } else {
      return 0.1 / 12.0; // 0.00833 food per tick
    }
  }

  /**
   * Calculate building consumption (some buildings consume resources)
   * @private
   * @param {Array} buildings - All building entities
   * @param {Object} npcAssignments - NPCAssignment instance
   * @returns {Object} Consumption amounts by resource type
   */
  _calculateBuildingConsumption(buildings, npcAssignments) {
    const consumption = {};

    for (const building of buildings) {
      // Only complete buildings consume
      if (building.state !== 'COMPLETE' && building.state !== 'COMPLETED') continue;

      // Get building config consumption data
      const buildingConsumption = building.properties?.consumption || {};

      // Only consume if building is staffed
      const workerIds = npcAssignments.getNPCsInBuilding(building.id);
      if (workerIds.length > 0) {
        for (const [resource, amount] of Object.entries(buildingConsumption)) {
          consumption[resource] = (consumption[resource] || 0) + amount;
        }
      }
    }

    return consumption;
  }

  /**
   * Execute consumption tick
   * Calculates total consumption and applies starvation if needed
   *
   * @param {number} foodAvailable - Food currently in storage
   * @param {Array} buildings - All building entities (optional)
   * @param {Object} npcAssignments - NPCAssignment instance (optional)
   * @returns {Object} {
   *   foodConsumed: amount consumed,
   *   buildingConsumption: resources consumed by buildings,
   *   foodRemaining: amount left after consumption,
   *   aliveCount: number of alive NPCs,
   *   starvationOccurred: boolean,
   *   npcsStarving: array of NPC IDs affected by starvation
   * }
   */
  executeConsumptionTick(foodAvailable, buildings = [], npcAssignments = null) {
    const aliveNPCs = this.getAliveNPCs();

    // If no NPCs, don't consume anything
    if (aliveNPCs.length === 0) {
      return {
        tickNumber: 'consumption',
        aliveCount: 0,
        workingCount: 0,
        idleCount: 0,
        foodConsumed: 0,
        npcsDied: 0,
        npcFoodConsumption: '0.0000',
        buildingConsumption: {},
        totalFoodConsumption: '0.0000',
        consumptionPerMinute: '0.0000',
        foodRemaining: foodAvailable.toFixed(2),
        starvationOccurred: false,
        npcsStarving: []
      };
    }

    // Calculate NPC food consumption
    let npcFoodConsumption = 0;
    for (const npc of aliveNPCs) {
      npcFoodConsumption += this.calculateConsumption(npc.id);
    }

    // Calculate building consumption (if buildings and assignments provided)
    let buildingConsumption = {};
    if (buildings.length > 0 && npcAssignments) {
      buildingConsumption = this._calculateBuildingConsumption(buildings, npcAssignments);
    }

    const totalFoodConsumption = npcFoodConsumption + (buildingConsumption.food || 0);

    // Apply consumption
    const foodRemaining = foodAvailable - totalFoodConsumption;

    const result = {
      tickNumber: 'consumption',
      aliveCount: aliveNPCs.length,
      workingCount: aliveNPCs.filter(n => n.isWorking).length,
      idleCount: aliveNPCs.filter(n => !n.isWorking).length,
      foodConsumed: totalFoodConsumption,  // Add for test compatibility (as number)
      npcsDied: 0,  // Always initialize, will be overridden if starvation occurs
      npcFoodConsumption: npcFoodConsumption.toFixed(4),
      buildingConsumption: buildingConsumption,
      totalFoodConsumption: totalFoodConsumption.toFixed(4),
      consumptionPerMinute: (totalFoodConsumption * 12).toFixed(4),
      foodRemaining: Math.max(0, foodRemaining).toFixed(2),
      starvationOccurred: false,
      npcsStarving: []
    };

    // Check for starvation
    if (foodRemaining < 0) {
      result.starvationOccurred = true;
      result.foodShortage = Math.abs(foodRemaining).toFixed(2);

      // Apply gradual starvation damage to all NPCs (spec: happiness -10, health -5)
      const npcsStarving = [];
      for (const npc of aliveNPCs) {
        npc.happiness = Math.max(0, npc.happiness - 10);
        npc.health = Math.max(0, npc.health - 5);
        npcsStarving.push(npc.id);

        if (npc.health === 0) {
          npc.alive = false;
          this.consumptionStats.npcsDead++;
          console.error(`[ConsumptionSystem] 💀 NPC ${npc.id} died from starvation`);
        }
      }

      result.npcsStarving = npcsStarving;
      result.npcsDied = npcsStarving.filter(id => !aliveNPCs.find(n => n.id === id && n.alive)).length;
      result.foodRemaining = 0; // All food consumed

      const starvationEvent = {
        timestamp: new Date().toISOString(),
        tickNumber: this.consumptionStats.starvationEvents.length,
        foodShortage: Math.abs(foodRemaining).toFixed(2),
        npcsAffected: npcsStarving.length
      };
      this.consumptionStats.starvationEvents.push(starvationEvent);

      console.warn(`[ConsumptionSystem] ⚠️ STARVATION: ${npcsStarving.length} NPCs starving (happiness -10, health -5)`);
    }

    this.consumptionStats.totalConsumed += totalFoodConsumption;
    return result;
  }

  /**
   * Update NPC happiness based on food availability
   * Used for morale calculations
   *
   * @param {number} foodPerNPC - Average food per NPC
   */
  updateHappiness(foodPerNPC) {
    const aliveNPCs = this.getAliveNPCs();

    for (const npc of aliveNPCs) {
      // Start with base
      npc.happiness = 50;

      // Food bonus/penalty
      if (foodPerNPC > 50) {
        npc.happiness += 5; // Plenty of food
      } else if (foodPerNPC > 10) {
        npc.happiness += 0; // Normal
      } else if (foodPerNPC > 1) {
        npc.happiness -= 3; // Low food
      } else {
        npc.happiness -= 10; // Starving
      }

      // Working bonus
      if (npc.isWorking) {
        npc.happiness += 2; // Productive
      } else {
        npc.happiness -= 1; // Idle
      }

      // Clamp happiness to 0-100
      npc.happiness = Math.max(0, Math.min(100, npc.happiness));

      // Convert happiness to morale (-100 to +100)
      npc.morale = (npc.happiness - 50) * 2.0;
    }
  }

  /**
   * Get consumption statistics
   * @returns {Object} Stats about consumption
   */
  getConsumptionStats() {
    const aliveNPCs = this.getAliveNPCs();
    const workingCount = aliveNPCs.filter(n => n.isWorking).length;
    const idleCount = aliveNPCs.filter(n => !n.isWorking).length;

    // Calculate per-tick consumption
    const workingConsumption = workingCount * (0.5 / 12.0);
    const idleConsumption = idleCount * (0.1 / 12.0);
    const totalPerTick = workingConsumption + idleConsumption;

    // Convert to per-minute for readability
    const totalPerMinute = totalPerTick * 12.0;

    return {
      aliveCount: aliveNPCs.length,
      workingCount: workingCount,
      idleCount: idleCount,
      consumptionPerTick: totalPerTick.toFixed(4),
      consumptionPerMinute: totalPerMinute.toFixed(4),
      totalConsumedSoFar: this.consumptionStats.totalConsumed.toFixed(2),
      totalNPCsDead: this.consumptionStats.npcsDead,
      starvationEventCount: this.consumptionStats.starvationEvents.length,
      averageHappiness: aliveNPCs.length > 0
        ? (aliveNPCs.reduce((sum, n) => sum + n.happiness, 0) / aliveNPCs.length).toFixed(1)
        : 0,
      averageMorale: aliveNPCs.length > 0
        ? (aliveNPCs.reduce((sum, n) => sum + n.morale, 0) / aliveNPCs.length).toFixed(1)
        : 0
    };
  }

  /**
   * Get NPC data
   * @param {string} npcId - NPC ID
   * @returns {Object} NPC data
   */
  getNPC(npcId) {
    return this.npcConsumptionData.get(npcId) || null;
  }

  /**
   * Get count of alive NPCs
   * @returns {number} Count
   */
  getAliveCount() {
    return this.getAliveNPCs().length;
  }

  /**
   * Remove NPC from system
   * @param {string} npcId - NPC ID
   */
  removeNPC(npcId) {
    this.npcConsumptionData.delete(npcId);
  }

  /**
   * Get total NPC count (alive and dead)
   * @returns {number} Total NPCs
   */
  getTotalNPCCount() {
    return this.npcConsumptionData.size;
  }
}

export default ConsumptionSystem;
