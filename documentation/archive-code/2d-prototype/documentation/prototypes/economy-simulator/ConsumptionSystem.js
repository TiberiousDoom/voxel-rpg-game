/**
 * Consumption System
 *
 * Handles NPC food consumption and starvation mechanics.
 *
 * Based on FORMULAS.md section 5: NPC FOOD CONSUMPTION
 * - Working NPCs consume 0.5 food/min
 * - Idle NPCs consume 0.1 food/min
 * - Starvation: kills NPCs when food < 0
 */

class NPC {
  constructor(id, role = 'WORKER') {
    this.id = id;
    this.role = role;
    this.happiness = 50;
    this.morale = 50;
    this.isWorking = false;
    this.assignedBuilding = null;
    this.alive = true;
    this.starvationCounter = 0; // Frames since last meal
  }

  /**
   * Mark this NPC as working
   */
  setWorking(building) {
    this.assignedBuilding = building;
    this.isWorking = true;
  }

  /**
   * Mark as idle
   */
  setIdle() {
    this.assignedBuilding = null;
    this.isWorking = false;
  }

  /**
   * Get morale multiplier based on current happiness
   */
  getMoraleMultiplier() {
    // -100 to +100 morale = 0.9x to 1.1x production
    return 1.0 + (this.morale / 1000.0);
  }
}

class ConsumptionSystem {
  constructor() {
    this.npcs = [];
    this.npcIdCounter = 0;
    this.totalFoodConsumed = 0;
    this.totalNPCsStarved = 0;
    this.starvationEvents = [];
  }

  /**
   * Create an NPC
   */
  createNPC(role = 'WORKER') {
    const id = this.npcIdCounter++;
    const npc = new NPC(id, role);
    this.npcs.push(npc);
    return npc;
  }

  /**
   * Get NPC by ID
   */
  getNPC(id) {
    return this.npcs.find(n => n.id === id);
  }

  /**
   * Get all alive NPCs
   */
  getAliveNPCs() {
    return this.npcs.filter(n => n.alive);
  }

  /**
   * Kill an NPC
   */
  killNPC(npc) {
    npc.alive = false;
  }

  /**
   * Calculate food consumption for this tick (5 seconds = 1/12 minute)
   *
   * Working: 0.5 food/min → 0.5/12 per tick = 0.04167
   * Idle: 0.1 food/min → 0.1/12 per tick = 0.00833
   */
  calculateConsumption(npc) {
    if (!npc.alive) {
      return 0;
    }

    if (npc.isWorking) {
      return 0.5 / 12.0; // 0.04167 per tick
    } else {
      return 0.1 / 12.0; // 0.00833 per tick
    }
  }

  /**
   * Apply consumption tick
   * Returns consumption details and starvation events
   */
  applyConsumptionTick(foodAvailable) {
    const tickLog = {
      npcsAlive: this.getAliveNPCs().length,
      workingCount: this.npcs.filter(n => n.alive && n.isWorking).length,
      idleCount: this.npcs.filter(n => n.alive && !n.isWorking).length,
      totalConsumption: 0,
      starvationEvents: [],
      foodRemaining: foodAvailable
    };

    // Calculate total consumption
    let totalConsumption = 0;
    for (const npc of this.getAliveNPCs()) {
      totalConsumption += this.calculateConsumption(npc);
    }

    tickLog.totalConsumption = totalConsumption.toFixed(4);
    this.totalFoodConsumed += totalConsumption;

    // Check for starvation
    foodAvailable -= totalConsumption;
    tickLog.foodRemaining = Math.max(0, foodAvailable).toFixed(2);

    if (foodAvailable < 0) {
      // Starvation event
      const starvationEvent = {
        description: 'Food shortage detected',
        foodShortage: Math.abs(foodAvailable).toFixed(2),
        npcsAlive: this.getAliveNPCs().length,
        npcsDying: 0
      };

      // Calculate how many NPCs die
      const foodPerNPC = 0.5 / 12.0; // Working rate (assume all working)
      const deathCount = Math.ceil(Math.abs(foodAvailable) / foodPerNPC);

      // Kill random NPCs
      const aliveNPCs = this.getAliveNPCs();
      for (let i = 0; i < Math.min(deathCount, aliveNPCs.length); i++) {
        const randomIdx = Math.floor(Math.random() * aliveNPCs.length);
        const victim = aliveNPCs[randomIdx];
        this.killNPC(victim);
        aliveNPCs.splice(randomIdx, 1);
        starvationEvent.npcsDying++;
        this.totalNPCsStarved++;
      }

      tickLog.starvationEvents.push(starvationEvent);
      this.starvationEvents.push(starvationEvent);
      foodAvailable = 0; // Food depleted
    }

    return {
      log: tickLog,
      foodRemaining: Math.max(0, foodAvailable)
    };
  }

  /**
   * Update NPC happiness based on food availability
   */
  updateHappiness(foodPerNPC) {
    for (const npc of this.getAliveNPCs()) {
      // Base happiness
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

      // Clamp happiness
      npc.happiness = Math.max(0, Math.min(100, npc.happiness));

      // Update morale from happiness
      npc.morale = (npc.happiness - 50) * 2.0; // -100 to +100
    }
  }

  /**
   * Get consumption statistics
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
      workingCount,
      idleCount,
      consumptionPerTick: totalPerTick.toFixed(4),
      consumptionPerMinute: totalPerMinute.toFixed(4),
      totalConsumedSoFar: this.totalFoodConsumed.toFixed(2),
      totalStarved: this.totalNPCsStarved,
      averageHappiness: aliveNPCs.length > 0
        ? (aliveNPCs.reduce((sum, n) => sum + n.happiness, 0) / aliveNPCs.length).toFixed(1)
        : 0,
      averageMorale: aliveNPCs.length > 0
        ? (aliveNPCs.reduce((sum, n) => sum + n.morale, 0) / aliveNPCs.length).toFixed(1)
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.totalFoodConsumed = 0;
    this.totalNPCsStarved = 0;
    this.starvationEvents = [];
  }
}

module.exports = { ConsumptionSystem, NPC };
