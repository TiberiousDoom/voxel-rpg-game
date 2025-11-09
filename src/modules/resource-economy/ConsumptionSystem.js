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
   * Execute consumption tick
   * Calculates total consumption and applies starvation if needed
   *
   * @param {number} foodAvailable - Food currently in storage
   * @returns {Object} {
   *   foodConsumed: amount consumed,
   *   foodRemaining: amount left after consumption,
   *   aliveCount: number of alive NPCs,
   *   starvationOccurred: boolean,
   *   npcsDied: number of NPCs that died
   * }
   */
  executeConsumptionTick(foodAvailable) {
    const aliveNPCs = this.getAliveNPCs();
    let totalConsumption = 0;

    // Calculate total consumption
    for (const npc of aliveNPCs) {
      totalConsumption += this.calculateConsumption(npc.id);
    }

    // Apply consumption
    const foodRemaining = foodAvailable - totalConsumption;

    const result = {
      tickNumber: 'consumption',
      aliveCount: aliveNPCs.length,
      workingCount: aliveNPCs.filter(n => n.isWorking).length,
      idleCount: aliveNPCs.filter(n => !n.isWorking).length,
      consumptionPerTick: totalConsumption.toFixed(4),
      consumptionPerMinute: (totalConsumption * 12).toFixed(4),
      foodConsumed: totalConsumption.toFixed(2),
      foodRemaining: Math.max(0, foodRemaining).toFixed(2),
      starvationOccurred: false,
      npcsDied: 0
    };

    // Check for starvation
    if (foodRemaining < 0) {
      result.starvationOccurred = true;

      // Calculate how many NPCs die
      const shortage = Math.abs(foodRemaining);
      const foodPerNPC = 0.5 / 12.0; // Assume all working (worst case)
      let npcsToDie = Math.ceil(shortage / foodPerNPC);
      npcsToDie = Math.min(npcsToDie, aliveNPCs.length);

      // Kill random NPCs
      const toKill = [];
      for (let i = 0; i < npcsToDie && aliveNPCs.length > 0; i++) {
        const randomIdx = Math.floor(Math.random() * aliveNPCs.length);
        const victim = aliveNPCs[randomIdx];
        victim.alive = false;
        toKill.push(victim.id);
        aliveNPCs.splice(randomIdx, 1);
      }

      result.npcsDied = toKill.length;
      result.npcKilled = toKill;
      result.foodRemaining = 0; // All food consumed
      this.consumptionStats.npcsDead += toKill.length;

      const starvationEvent = {
        timestamp: new Date().toISOString(),
        tickNumber: this.consumptionStats.starvationEvents.length,
        foodShortage: shortage.toFixed(2),
        npcsDied: toKill.length
      };
      this.consumptionStats.starvationEvents.push(starvationEvent);
    }

    this.consumptionStats.totalConsumed += totalConsumption;
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
