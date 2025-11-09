/**
 * TownManager.js - Town population and management system
 *
 * Manages:
 * - NPC population tracking
 * - Housing capacity calculation
 * - NPC assignments to buildings
 * - Town statistics and reporting
 * - Population growth and needs
 *
 * Town progression tied to tier:
 * - SURVIVAL: 1-5 NPCs
 * - PERMANENT: 5-20 NPCs
 * - TOWN: 20-100 NPCs
 * - CASTLE: 100+ NPCs
 */

class TownManager {
  /**
   * Initialize town manager
   * @param {BuildingConfig} buildingConfig - Building configurations
   */
  constructor(buildingConfig) {
    if (!buildingConfig) {
      throw new Error('TownManager requires BuildingConfig');
    }

    this.buildingConfig = buildingConfig;

    // NPC population
    this.npcs = new Map(); // npcId -> {id, name, role, building, happiness, morale}
    this.npcIdCounter = 0;

    // Building assignments
    this.buildingAssignments = new Map(); // buildingId -> [npcIds]

    // Town statistics
    this.stats = {
      totalNPCsSpawned: 0,
      totalNPCsDead: 0,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Spawn an NPC
   * @param {string} role - NPC role (WORKER, FARMER, GUARD, etc)
   * @returns {Object} Created NPC
   */
  spawnNPC(role = 'WORKER') {
    const npcId = this.npcIdCounter++;

    const npc = {
      id: npcId,
      name: `${role}#${npcId}`,
      role: role,
      assignedBuilding: null,
      happiness: 50,
      morale: 0,
      skill: 1.0, // Skill multiplier starts at 1.0
      alive: true,
      spawnedAt: new Date().toISOString()
    };

    this.npcs.set(npcId, npc);
    this.stats.totalNPCsSpawned++;

    return npc;
  }

  /**
   * Kill an NPC
   * @param {number} npcId - NPC ID
   * @returns {boolean} True if NPC was alive
   */
  killNPC(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.alive) {
      return false;
    }

    // Remove from building assignment
    if (npc.assignedBuilding) {
      this.unassignNPC(npcId);
    }

    npc.alive = false;
    this.stats.totalNPCsDead++;
    return true;
  }

  /**
   * Assign NPC to building
   * @param {number} npcId - NPC ID
   * @param {string} buildingId - Building ID
   * @returns {boolean} True if assigned
   */
  assignNPC(npcId, buildingId) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.alive) {
      return false;
    }

    // Unassign from previous building
    if (npc.assignedBuilding) {
      this.unassignNPC(npcId);
    }

    // Assign to new building
    npc.assignedBuilding = buildingId;
    if (!this.buildingAssignments.has(buildingId)) {
      this.buildingAssignments.set(buildingId, []);
    }
    this.buildingAssignments.get(buildingId).push(npcId);

    return true;
  }

  /**
   * Unassign NPC from building
   * @param {number} npcId - NPC ID
   * @returns {boolean} True if was assigned
   */
  unassignNPC(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.assignedBuilding) {
      return false;
    }

    const buildingId = npc.assignedBuilding;
    const assigned = this.buildingAssignments.get(buildingId) || [];
    const idx = assigned.indexOf(npcId);

    if (idx >= 0) {
      assigned.splice(idx, 1);
    }

    npc.assignedBuilding = null;
    return true;
  }

  /**
   * Get NPC
   * @param {number} npcId - NPC ID
   * @returns {Object|null} NPC or null
   */
  getNPC(npcId) {
    return this.npcs.get(npcId) || null;
  }

  /**
   * Get alive NPCs
   * @returns {Array<Object>} Array of alive NPCs
   */
  getAliveNPCs() {
    const alive = [];
    for (const npc of this.npcs.values()) {
      if (npc.alive) {
        alive.push(npc);
      }
    }
    return alive;
  }

  /**
   * Get NPCs assigned to building
   * @param {string} buildingId - Building ID
   * @returns {Array<Object>} NPCs in building
   */
  getNPCsInBuilding(buildingId) {
    const npcIds = this.buildingAssignments.get(buildingId) || [];
    const npcs = [];

    for (const npcId of npcIds) {
      const npc = this.npcs.get(npcId);
      if (npc && npc.alive) {
        npcs.push(npc);
      }
    }

    return npcs;
  }

  /**
   * Calculate housing capacity from buildings
   * @param {Array<Object>} buildings - Buildings to check
   * @returns {number} Total housing slots
   */
  calculateHousingCapacity(buildings) {
    let capacity = 0;

    for (const building of buildings) {
      try {
        const config = this.buildingConfig.getConfig(building.type);
        if (config.effects && config.effects.housingCapacity) {
          capacity += config.effects.housingCapacity;
        }
      } catch (e) {
        // Building type not found, skip
      }
    }

    return capacity;
  }

  /**
   * Get occupancy ratio
   * @param {Array<Object>} buildings - Buildings with housing
   * @returns {number} Occupancy percentage 0-100
   */
  getOccupancyRatio(buildings) {
    const aliveCount = this.getAliveNPCs().length;
    const capacity = this.calculateHousingCapacity(buildings);

    if (capacity === 0) {
      return aliveCount > 0 ? 100 : 0; // Overcrowded if any NPCs, no housing
    }

    return (aliveCount / capacity) * 100;
  }

  /**
   * Update NPC happiness
   * @param {number} npcId - NPC ID
   * @param {Object} factors - {food, housing, work, morale}
   */
  updateNPCHappiness(npcId, factors = {}) {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      return;
    }

    let happiness = 50; // Base

    // Food factor (0-100 scale)
    if (factors.food !== undefined) {
      happiness += (factors.food - 50) * 0.1; // -5 to +5 impact
    }

    // Housing factor
    if (factors.housing !== undefined) {
      happiness += (factors.housing - 50) * 0.08; // -4 to +4 impact
    }

    // Work factor
    if (factors.work !== undefined) {
      happiness += factors.work ? 3 : -2; // Working is good
    }

    // Morale multiplier
    if (factors.morale !== undefined) {
      happiness += factors.morale * 0.05; // -5 to +5 from morale
    }

    // Clamp happiness
    npc.happiness = Math.max(0, Math.min(100, happiness));

    // Update morale from happiness
    npc.morale = (npc.happiness - 50) * 2.0; // -100 to +100
  }

  /**
   * Train NPC (increase skill level)
   * @param {number} npcId - NPC ID
   * @param {number} skillGain - Amount to increase skill
   * @returns {number} New skill level
   */
  trainNPC(npcId, skillGain = 0.01) {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      return 0;
    }

    npc.skill = Math.min(npc.skill + skillGain, 1.5); // Cap at 1.5x
    return npc.skill;
  }

  /**
   * Get town statistics
   * @param {Array<Object>} buildings - All buildings (for housing calc)
   * @returns {Object} Town stats
   */
  getStatistics(buildings = []) {
    const aliveNPCs = this.getAliveNPCs();
    const avgHappiness = aliveNPCs.length > 0
      ? aliveNPCs.reduce((sum, n) => sum + n.happiness, 0) / aliveNPCs.length
      : 0;

    const avgMorale = aliveNPCs.length > 0
      ? aliveNPCs.reduce((sum, n) => sum + n.morale, 0) / aliveNPCs.length
      : 0;

    const housingCapacity = this.calculateHousingCapacity(buildings);

    return {
      population: {
        alive: aliveNPCs.length,
        dead: this.stats.totalNPCsDead,
        totalSpawned: this.stats.totalNPCsSpawned,
        averageSkill: aliveNPCs.length > 0
          ? (aliveNPCs.reduce((sum, n) => sum + n.skill, 0) / aliveNPCs.length).toFixed(2)
          : 0
      },
      happiness: {
        average: avgHappiness.toFixed(1),
        min: aliveNPCs.length > 0 ? Math.min(...aliveNPCs.map(n => n.happiness)) : 0,
        max: aliveNPCs.length > 0 ? Math.max(...aliveNPCs.map(n => n.happiness)) : 0
      },
      morale: {
        average: avgMorale.toFixed(1),
        min: aliveNPCs.length > 0 ? Math.min(...aliveNPCs.map(n => n.morale)) : 0,
        max: aliveNPCs.length > 0 ? Math.max(...aliveNPCs.map(n => n.morale)) : 0
      },
      housing: {
        capacity: housingCapacity,
        occupied: aliveNPCs.length,
        occupancyPercent: (this.getOccupancyRatio(buildings)).toFixed(1)
      },
      createdAt: this.stats.createdAt
    };
  }

  /**
   * Get NPC role distribution
   * @returns {Object} Role -> count mapping
   */
  getRoleDistribution() {
    const distribution = {};
    const aliveNPCs = this.getAliveNPCs();

    for (const npc of aliveNPCs) {
      distribution[npc.role] = (distribution[npc.role] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Get average skill level
   * @returns {number} Average skill
   */
  getAverageSkill() {
    const aliveNPCs = this.getAliveNPCs();
    if (aliveNPCs.length === 0) {
      return 1.0;
    }

    const sum = aliveNPCs.reduce((total, npc) => total + npc.skill, 0);
    return sum / aliveNPCs.length;
  }

  /**
   * Clear all data (for testing)
   */
  reset() {
    this.npcs.clear();
    this.buildingAssignments.clear();
    this.npcIdCounter = 0;
    this.stats = {
      totalNPCsSpawned: 0,
      totalNPCsDead: 0,
      createdAt: new Date().toISOString()
    };
  }
}

export default TownManager;
