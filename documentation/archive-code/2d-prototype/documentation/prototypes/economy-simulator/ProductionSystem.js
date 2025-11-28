/**
 * Production System
 *
 * Handles resource production for all buildings.
 * Production occurs every 5 seconds (1 tick).
 *
 * Based on FORMULAS.md section 1: PRODUCTION TICK SYSTEM
 */

class Building {
  constructor(id, type, position, config) {
    this.id = id;
    this.type = type;
    this.position = position;
    this.baseRate = config.productionRate;
    this.resourceType = config.resourceType;

    // Assignment
    this.assignedNPCs = [];
    this.workSlots = config.workSlots;

    // Status
    this.isCompleted = true; // All buildings in test are pre-built
    this.constructionProgress = 100;
  }

  /**
   * Get number of NPCs assigned to this building
   */
  getAssignedNPCCount() {
    return this.assignedNPCs.length;
  }

  /**
   * Check if this building is producing
   */
  isProducing() {
    return this.isCompleted && this.type !== 'STORAGE' && this.type !== 'HOUSE';
  }
}

class ProductionSystem {
  constructor(moraleCalculator) {
    this.buildings = [];
    this.resources = {
      food: 0,
      wood: 0,
      stone: 0,
      gold: 0,
      essence: 0,
      crystal: 0
    };
    this.storageCapacity = 10000; // Default capacity
    this.moraleCalculator = moraleCalculator;

    // Building configuration based on ECONOMY_BALANCE.md
    this.buildingConfigs = {
      CAMPFIRE: {
        productionRate: 5,
        resourceType: 'wood',
        workSlots: 1,
        tier: 'SURVIVAL'
      },
      FARM: {
        productionRate: 1,
        resourceType: 'food',
        workSlots: 2,
        tier: 'PERMANENT'
      },
      WORKSHOP: {
        productionRate: 1,
        resourceType: 'wood', // Can be any crafting resource
        workSlots: 1,
        tier: 'PERMANENT'
      },
      STORAGE: {
        productionRate: 0,
        resourceType: null,
        workSlots: 0,
        tier: 'PERMANENT'
      },
      HOUSE: {
        productionRate: 0,
        resourceType: null,
        workSlots: 0,
        tier: 'PERMANENT'
      },
      MARKETPLACE: {
        productionRate: 0,
        resourceType: null,
        workSlots: 2,
        tier: 'TOWN'
      },
      WATCHTOWER: {
        productionRate: 0,
        resourceType: null,
        workSlots: 0,
        tier: 'PERMANENT'
      }
    };
  }

  /**
   * Create a building
   */
  createBuilding(id, type, position) {
    if (!this.buildingConfigs[type]) {
      throw new Error(`Unknown building type: ${type}`);
    }

    const config = this.buildingConfigs[type];
    const building = new Building(id, type, position, config);
    this.buildings.push(building);
    return building;
  }

  /**
   * Get all buildings of a type
   */
  getBuildingsByType(type) {
    return this.buildings.filter(b => b.type === type);
  }

  /**
   * Assign NPC to building
   */
  assignNPC(npc, building) {
    if (building.getAssignedNPCCount() < building.workSlots) {
      if (!building.assignedNPCs.includes(npc)) {
        building.assignedNPCs.push(npc);
        npc.assignedBuilding = building.id;
        return true;
      }
    }
    return false;
  }

  /**
   * Unassign NPC from building
   */
  unassignNPC(npc, building) {
    const idx = building.assignedNPCs.indexOf(npc);
    if (idx >= 0) {
      building.assignedNPCs.splice(idx, 1);
      npc.assignedBuilding = null;
    }
  }

  /**
   * Calculate multiplier for a building based on formula
   * Order: NPC × Zone × Aura × Tech × Morale (hard cap: 2.0x)
   *
   * For prototype, simplify: NPC × Morale
   */
  calculateMultiplier(building, npcCount, moraleMultiplier) {
    let multiplier = 1.0;

    // NPC Skill Multiplier (max 1.5x, but for test assume novice level = 1.0)
    if (npcCount > 0) {
      // Simple: each NPC adds +25% efficiency, capped at 1.5x
      multiplier = multiplier * Math.min(1.0 + (npcCount * 0.25), 1.5);
    } else {
      // No NPC: 50% efficiency
      multiplier = multiplier * 0.5;
    }

    // Zone Bonus (skip for prototype)

    // Aura Bonus (skip for prototype)

    // Technology Bonus (skip for prototype)

    // Morale Multiplier (±10%, range 0.9 to 1.1)
    multiplier = multiplier * moraleMultiplier;

    // Hard cap at 2.0x
    multiplier = Math.min(multiplier, 2.0);

    return multiplier;
  }

  /**
   * Calculate production for one tick (5 seconds)
   * Returns the amount produced
   */
  calculateProduction(building, npcCount, moraleMultiplier) {
    if (!building.isProducing()) {
      return 0;
    }

    const baseRate = building.baseRate;
    const multiplier = this.calculateMultiplier(building, npcCount, moraleMultiplier);
    const production = baseRate * multiplier;

    return production;
  }

  /**
   * Execute production tick
   * Called once every 5 seconds
   */
  executeProductionTick(moraleMultiplier = 1.0) {
    const tickLog = {
      tick: 'production',
      buildings: {},
      totalProduction: {}
    };

    // For each building, calculate and apply production
    for (const building of this.buildings) {
      if (!building.isProducing()) {
        continue;
      }

      const npcCount = building.getAssignedNPCCount();
      const production = this.calculateProduction(building, npcCount, moraleMultiplier);

      // Award resources
      const resourceType = building.resourceType;
      if (resourceType) {
        this.resources[resourceType] = this.resources[resourceType] + production;

        tickLog.buildings[building.id] = {
          type: building.type,
          npcCount,
          baseRate: building.baseRate,
          production: production.toFixed(2),
          resourceType
        };

        if (!tickLog.totalProduction[resourceType]) {
          tickLog.totalProduction[resourceType] = 0;
        }
        tickLog.totalProduction[resourceType] += production;
      }
    }

    return tickLog;
  }

  /**
   * Check for storage overflow and dump excess
   */
  checkStorageOverflow() {
    const totalUsage = Object.values(this.resources).reduce((sum, val) => sum + val, 0);

    if (totalUsage > this.storageCapacity) {
      const overflow = totalUsage - this.storageCapacity;

      // Dump least valuable resources first
      const priority = ['wood', 'stone', 'food', 'essence', 'crystal', 'gold'];

      let remaining = overflow;
      for (const resourceType of priority) {
        if (remaining <= 0) break;

        const current = this.resources[resourceType];
        if (current > 0) {
          const toDump = Math.min(current, remaining);
          this.resources[resourceType] = current - toDump;
          remaining -= toDump;
        }
      }

      return {
        overflowed: true,
        amountDumped: overflow - remaining,
        remainingOverflow: remaining
      };
    }

    return { overflowed: false };
  }

  /**
   * Get total resource usage
   */
  getTotalResourceUsage() {
    return Object.values(this.resources).reduce((sum, val) => sum + val, 0);
  }

  /**
   * Get resource summary
   */
  getResourceSummary() {
    return {
      ...this.resources,
      totalUsage: this.getTotalResourceUsage(),
      storageCapacity: this.storageCapacity,
      utilization: (this.getTotalResourceUsage() / this.storageCapacity * 100).toFixed(1) + '%'
    };
  }

  /**
   * Add starting resources
   */
  addResources(amount, type = 'gold') {
    if (this.resources.hasOwnProperty(type)) {
      this.resources[type] += amount;
    }
  }

  /**
   * Spend resources
   */
  spendResources(amount, type = 'gold') {
    if (this.resources[type] >= amount) {
      this.resources[type] -= amount;
      return true;
    }
    return false;
  }

  /**
   * Get all buildings
   */
  getAllBuildings() {
    return this.buildings;
  }

  /**
   * Get building by ID
   */
  getBuilding(id) {
    return this.buildings.find(b => b.id === id);
  }

  /**
   * Set storage capacity
   */
  setStorageCapacity(capacity) {
    this.storageCapacity = capacity;
  }
}

module.exports = { ProductionSystem, Building };
