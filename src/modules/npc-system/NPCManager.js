/**
 * NPCManager.js - NPC lifecycle and state management
 *
 * Manages:
 * - NPC creation, deletion, and lifecycle
 * - NPC attributes (skills, happiness, morale)
 * - NPC movement and position tracking
 * - NPC interaction with town systems
 *
 * Integrates with:
 * - TownManager (population tracking)
 * - NPCAssignment (work assignments)
 * - GridManager (position validation)
 * - ConsumptionSystem (food needs)
 */

class NPC {
  /**
   * Create an NPC
   * @param {number} id - Unique NPC ID
   * @param {Object} data - NPC data
   */
  constructor(id, data) {
    this.id = id;
    this.name = data.name || `NPC#${id}`;
    this.role = data.role || 'WORKER';

    // Attributes
    this.skills = {
      farming: 1.0,
      crafting: 1.0,
      defense: 1.0,
      general: 1.0
    };
    this.happiness = data.happiness || 50;
    this.morale = data.morale || 0;
    this.health = 100;
    this.maxHealth = 100;

    // State
    this.position = data.position || { x: 0, y: 0, z: 0 };
    this.assignedBuilding = null;
    this.targetPosition = null;
    this.isMoving = false;
    this.isWorking = false;
    this.isResting = false;

    // Inventory
    this.inventory = {
      food: 0,
      items: [] // For future item system
    };

    // Timers
    this.lastWorkedAt = 0;
    this.lastAteAt = 0;
    this.restUntil = 0;

    // Status
    this.alive = true;
    this.fatigued = false;
    this.hungry = false;
    this.createdAt = new Date().toISOString();
  }

  /**
   * Update NPC state (called each tick)
   * @param {number} tickCount - Current tick number
   */
  updateState(tickCount) {
    if (!this.alive) return;

    // Check if resting
    if (this.restUntil > tickCount) {
      this.isResting = true;
      this.fatigued = true;
      return;
    }
    this.isResting = false;

    // Check hunger (lose 1 health per tick if starving)
    if (this.inventory.food <= 0 && this.isWorking) {
      this.health -= 0.5;
      this.hungry = true;
    } else {
      this.hungry = false;
    }

    // Death check
    if (this.health <= 0) {
      this.alive = false;
    }

    // Fatigue recovery
    if (!this.isWorking && this.fatigued) {
      // Recover fatigue while resting
    }
  }

  /**
   * Feed NPC
   * @param {number} amount - Food to give
   * @returns {number} Amount actually consumed
   */
  feed(amount) {
    const consumed = Math.min(amount, 10); // Max 10 food per feeding
    this.inventory.food += consumed;
    this.lastAteAt = Date.now();
    this.hungry = false;
    return consumed;
  }

  /**
   * Apply skill training
   * @param {string} skillName - Skill to train
   * @param {number} gain - Amount to increase (typically 0.01-0.1)
   */
  trainSkill(skillName, gain = 0.01) {
    if (skillName in this.skills) {
      this.skills[skillName] = Math.min(this.skills[skillName] + gain, 1.5);
    }
  }

  /**
   * Get effective skill multiplier for role
   * @returns {number} Multiplier 1.0 to 1.5
   */
  getSkillMultiplier() {
    // Average of role-relevant skills
    switch (this.role) {
      case 'FARMER':
        return this.skills.farming;
      case 'CRAFTSMAN':
        return this.skills.crafting;
      case 'GUARD':
        return this.skills.defense;
      default:
        return this.skills.general;
    }
  }

  /**
   * Set work status
   * @param {boolean} working - Is working
   */
  setWorking(working) {
    this.isWorking = working;
    if (working) {
      this.lastWorkedAt = Date.now();
    }
  }

  /**
   * Get NPC state summary
   * @returns {Object} Current state
   */
  getState() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      position: { ...this.position },
      assignedBuilding: this.assignedBuilding,
      isWorking: this.isWorking,
      isMoving: this.isMoving,
      isResting: this.isResting,
      health: this.health,
      happiness: this.happiness,
      morale: this.morale,
      hungry: this.hungry,
      fatigued: this.fatigued,
      alive: this.alive,
      skillMultiplier: this.getSkillMultiplier()
    };
  }
}

class NPCManager {
  /**
   * Initialize NPC manager
   * @param {TownManager} townManager - Town system integration
   */
  constructor(townManager) {
    if (!townManager) {
      throw new Error('NPCManager requires TownManager');
    }

    this.townManager = townManager;
    this.npcs = new Map(); // id -> NPC
    this.npcIdCounter = 0;

    // NPC groups by status
    this.workingNPCs = new Set();
    this.restingNPCs = new Set();
    this.idleNPCs = new Set();

    // Statistics
    this.stats = {
      totalSpawned: 0,
      totalDead: 0,
      totalHappy: 0,
      totalUnhappy: 0
    };
  }

  /**
   * Spawn a new NPC
   * @param {string} role - NPC role (FARMER, CRAFTSMAN, GUARD, WORKER)
   * @param {Object} position - Starting position (if null, generates random position)
   * @returns {NPC} Created NPC
   */
  spawnNPC(role, position = null) {
    const GRID_SIZE = 10; // Must match GRID.GRID_WIDTH from config.js

    // If no position provided, generate random position within grid bounds
    if (!position) {
      position = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: 25,
        z: Math.floor(Math.random() * GRID_SIZE)
      };
    }

    // Validate position is within bounds
    if (position.x < 0 || position.x >= GRID_SIZE ||
        position.z < 0 || position.z >= GRID_SIZE) {
      console.warn(`[NPCManager] Spawn position (${position.x}, ${position.z}) out of bounds, using random`);
      position = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: 25,
        z: Math.floor(Math.random() * GRID_SIZE)
      };
    }

    const id = this.npcIdCounter++;
    const npc = new NPC(id, {
      role: role,
      position: position,
      happiness: 50,
      morale: 0
    });

    this.npcs.set(id, npc);
    this.idleNPCs.add(id);
    this.stats.totalSpawned++;

    console.log(`[NPCManager] Spawned NPC ${id} (${role}) at position (${position.x}, ${position.y}, ${position.z})`);

    // Register with town system
    this.townManager.spawnNPC(role);

    return npc;
  }

  /**
   * Get NPC by ID
   * @param {number} npcId - NPC ID
   * @returns {NPC|null} NPC or null
   */
  getNPC(npcId) {
    return this.npcs.get(npcId) || null;
  }

  /**
   * Get all alive NPCs
   * @returns {Array<NPC>} Living NPCs
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
   * Get NPCs by status
   * @param {string} status - 'working', 'resting', or 'idle'
   * @returns {Array<NPC>} NPCs with status
   */
  getNPCsByStatus(status) {
    let group;
    switch (status) {
      case 'working':
        group = this.workingNPCs;
        break;
      case 'resting':
        group = this.restingNPCs;
        break;
      case 'idle':
        group = this.idleNPCs;
        break;
      default:
        return [];
    }

    const result = [];
    for (const npcId of group) {
      const npc = this.npcs.get(npcId);
      if (npc && npc.alive) {
        result.push(npc);
      }
    }
    return result;
  }

  /**
   * Set NPC work status
   * @param {number} npcId - NPC ID
   * @param {boolean} working - Work status
   */
  setNPCWorking(npcId, working) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.alive) return;

    npc.setWorking(working);

    if (working) {
      this.workingNPCs.add(npcId);
      this.idleNPCs.delete(npcId);
      this.townManager.updateNPCHappiness(npcId, { work: true });
    } else {
      this.workingNPCs.delete(npcId);
      this.idleNPCs.add(npcId);
      this.townManager.updateNPCHappiness(npcId, { work: false });
    }
  }

  /**
   * Move NPC to position
   * @param {number} npcId - NPC ID
   * @param {Object} position - New position
   */
  moveNPC(npcId, position) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.alive) return;

    npc.position = { ...position };
  }

  /**
   * Assign NPC to building
   * @param {number} npcId - NPC ID
   * @param {string} buildingId - Building ID
   * @returns {boolean} Success
   */
  assignNPC(npcId, buildingId) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.alive) return false;

    npc.assignedBuilding = buildingId;
    return this.townManager.assignNPC(npcId, buildingId);
  }

  /**
   * Unassign NPC from building
   * @param {number} npcId - NPC ID
   */
  unassignNPC(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    npc.assignedBuilding = null;
    this.townManager.unassignNPC(npcId);
  }

  /**
   * Update all NPCs (called each tick)
   * @param {number} tickCount - Current tick number
   */
  updateAllNPCs(tickCount) {
    for (const npc of this.npcs.values()) {
      npc.updateState(tickCount);

      // Update happiness
      this.townManager.updateNPCHappiness(npc.id, {
        food: npc.inventory.food * 10,
        work: npc.isWorking
      });

      // Check if dead
      if (!npc.alive) {
        this.killNPC(npc.id);
      }
    }
  }

  /**
   * Kill an NPC
   * @param {number} npcId - NPC ID
   */
  killNPC(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.alive) return;

    npc.alive = false;
    this.workingNPCs.delete(npcId);
    this.restingNPCs.delete(npcId);
    this.idleNPCs.delete(npcId);
    this.stats.totalDead++;

    // Unassign and update town
    this.unassignNPC(npcId);
    this.townManager.killNPC(npcId);
  }

  /**
   * Train NPC skill
   * @param {number} npcId - NPC ID
   * @param {string} skillName - Skill to train
   * @param {number} gain - Training amount
   */
  trainNPC(npcId, skillName, gain = 0.01) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    npc.trainSkill(skillName, gain);
  }

  /**
   * Get NPC statistics
   * @returns {Object} System stats
   */
  getStatistics() {
    const alive = this.getAliveNPCs();
    const working = this.workingNPCs.size;
    const resting = this.restingNPCs.size;
    const idle = this.idleNPCs.size;

    const avgHappiness = alive.length > 0
      ? alive.reduce((sum, n) => sum + n.happiness, 0) / alive.length
      : 0;

    const avgSkill = alive.length > 0
      ? alive.reduce((sum, n) => sum + n.getSkillMultiplier(), 0) / alive.length
      : 1.0;

    return {
      totalSpawned: this.stats.totalSpawned,
      aliveCount: alive.length,
      deadCount: this.stats.totalDead,
      workingCount: working,
      restingCount: resting,
      idleCount: idle,
      averageHappiness: avgHappiness.toFixed(1),
      averageSkill: avgSkill.toFixed(2)
    };
  }

  /**
   * Get all NPC states
   * @returns {Array<Object>} All NPC states
   */
  getAllNPCStates() {
    return Array.from(this.npcs.values())
      .filter(npc => npc.alive)
      .map(npc => npc.getState());
  }
}

export { NPCManager, NPC };
