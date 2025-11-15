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
 * - PathfindingService (pathfinding and navigation)
 */

import PathfindingService from './PathfindingService.js';

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

    // Pathfinding state
    this.currentPath = null; // Array of waypoints
    this.pathIndex = 0; // Current waypoint index
    this.nextWaypoint = null; // Next position to move to

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
   * @param {GridManager} gridManager - Grid system for pathfinding (optional)
   */
  constructor(townManager, gridManager = null) {
    if (!townManager) {
      throw new Error('NPCManager requires TownManager');
    }

    this.townManager = townManager;
    this.gridManager = gridManager;
    this.npcs = new Map(); // id -> NPC
    this.npcIdCounter = 0;
    this.buildingsMap = new Map(); // buildingId -> building (for NPC movement)

    // Initialize pathfinding service if grid manager provided
    this.pathfindingService = null;
    if (gridManager) {
      this.pathfindingService = new PathfindingService(gridManager);
      // eslint-disable-next-line no-console
      console.log('[NPCManager] Pathfinding service initialized');
    }

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

    // Phase 3C: Reference to orchestrator for achievement tracking
    this.orchestrator = null;
  }

  /**
   * Set orchestrator reference (for achievement tracking)
   * @param {ModuleOrchestrator} orchestrator - Module orchestrator
   */
  setOrchestrator(orchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Update buildings map for NPC movement targeting
   * @param {Array} buildings - Array of building objects with id and position
   */
  updateBuildingsMap(buildings) {
    this.buildingsMap.clear();
    if (buildings && Array.isArray(buildings)) {
      for (const building of buildings) {
        if (building && building.id && building.position) {
          this.buildingsMap.set(building.id, building);
        }
      }
    }
  }

   /**
   * Spawn a new NPC
   * @param {string} role - NPC role (FARMER, CRAFTSMAN, GUARD, WORKER)
   * @param {Object} position - Starting position (if null, generates random position)
   * @returns {NPC} Created NPC object (or null if failed)
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

    // Check population limit
    const maxPopulation = this.townManager.getMaxPopulation();
    if (this.npcs.size >= maxPopulation) {
      console.warn(`[NPCManager] Cannot spawn NPC: population limit reached (${maxPopulation})`);
      return {
        success: false,
        error: `Cannot spawn NPC: population limit reached (${maxPopulation})`
      };
    }

    // Continue with the rest of YOUR branch's code for creating the NPC
    const id = String(this.npcIdCounter++); // Convert to string for save validation
    const npc = new NPC(id, {
      role: role,
      position: position,
      happiness: 50,
      morale: 0
    });

    this.npcs.set(id, npc);
    this.idleNPCs.add(id);
    this.stats.totalSpawned++;

    // Register with town system
    this.townManager.spawnNPC(role);

    return {
      success: true,
      npcId: id,
      npc: npc
    };
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
   * Get all NPCs (alive and dead)
   * @returns {Array<NPC>} All NPCs
   */
  getAllNPCs() {
    return Array.from(this.npcs.values());
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
   * Update NPC movement towards target position
   * @private
   * @param {NPC} npc - NPC object
   * @param {number} speed - Movement speed (units per tick)
   * @param {number} deltaTime - Time since last update (for frame-based movement)
   */
  _updateNPCMovement(npc, speed = 0.5, deltaTime = 1.0) {
    if (!npc.isMoving) {
      return;
    }

    // Use pathfinding if available and path exists
    if (this.pathfindingService && npc.currentPath) {
      this._updatePathBasedMovement(npc, speed, deltaTime);
    } else if (npc.targetPosition) {
      // Fallback to straight-line movement
      this._updateStraightLineMovement(npc, speed, deltaTime);
    }
  }

  /**
   * Update NPC movement along a calculated path
   * @private
   * @param {NPC} npc - NPC object
   * @param {number} speed - Movement speed (units per tick)
   * @param {number} deltaTime - Time multiplier
   */
  _updatePathBasedMovement(npc, speed, deltaTime) {
    if (!npc.currentPath || npc.pathIndex >= npc.currentPath.length) {
      // Path completed
      npc.position = { ...npc.targetPosition };
      npc.isMoving = false;
      npc.currentPath = null;
      npc.pathIndex = 0;
      npc.nextWaypoint = null;
      // eslint-disable-next-line no-console
      console.log(`[NPCManager] NPC ${npc.id} arrived at building ${npc.assignedBuilding}`);
      return;
    }

    // Get next waypoint
    if (!npc.nextWaypoint && npc.pathIndex < npc.currentPath.length) {
      npc.nextWaypoint = npc.currentPath[npc.pathIndex];
    }

    if (!npc.nextWaypoint) {
      return;
    }

    // Calculate movement toward next waypoint
    const dx = npc.nextWaypoint.x - npc.position.x;
    const dy = npc.nextWaypoint.y - npc.position.y;
    const dz = npc.nextWaypoint.z - npc.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Check if reached waypoint
    if (distance < 0.3) {
      npc.pathIndex++;
      npc.nextWaypoint = null;
      return;
    }

    // Move towards waypoint
    const moveAmount = Math.min(speed * deltaTime, distance);
    const moveRatio = moveAmount / distance;

    npc.position.x += dx * moveRatio;
    npc.position.y += dy * moveRatio;
    npc.position.z += dz * moveRatio;
  }

  /**
   * Update NPC movement in straight line (fallback when no pathfinding)
   * @private
   * @param {NPC} npc - NPC object
   * @param {number} speed - Movement speed
   * @param {number} deltaTime - Time multiplier
   */
  _updateStraightLineMovement(npc, speed, deltaTime) {
    if (!npc.targetPosition) {
      return;
    }

    const dx = npc.targetPosition.x - npc.position.x;
    const dy = npc.targetPosition.y - npc.position.y;
    const dz = npc.targetPosition.z - npc.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Check if reached target (within 0.5 units)
    if (distance < 0.5) {
      npc.position = { ...npc.targetPosition };
      npc.isMoving = false;
      // eslint-disable-next-line no-console
      console.log(`[NPCManager] NPC ${npc.id} arrived at target (straight-line)`);
      return;
    }

    // Move towards target
    const moveAmount = Math.min(speed * deltaTime, distance);
    const moveRatio = moveAmount / distance;

    npc.position.x += dx * moveRatio;
    npc.position.y += dy * moveRatio;
    npc.position.z += dz * moveRatio;
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

    // Get building to set target position
    const building = this.buildingsMap.get(buildingId);
    if (!building) {
      console.warn(`[NPCManager] Cannot assign NPC ${npcId}: building ${buildingId} not found`);
      return false;
    }

    // Set the NPC's target position to the building
    npc.targetPosition = { ...building.position };
    npc.assignedBuilding = buildingId;

    // Calculate path if pathfinding is available
    if (this.pathfindingService) {
      const path = this.pathfindingService.findPath(npc.position, building.position, {
        maxIterations: 500,
        allowPartialPath: true
      });

      if (path && path.length > 0) {
        // Smooth the path to remove unnecessary waypoints
        npc.currentPath = this.pathfindingService.smoothPath(path);
        npc.pathIndex = 0;
        npc.nextWaypoint = null;
        npc.isMoving = true;

        const stats = this.pathfindingService.getPathStats(npc.currentPath);
        // eslint-disable-next-line no-console
        console.log(`[NPCManager] NPC ${npc.id} pathfinding to building ${buildingId}: ${stats.waypoints} waypoints, ${stats.distance} distance`);
      } else {
        console.warn(`[NPCManager] No path found for NPC ${npc.id}, using direct movement`);
        npc.isMoving = true;
      }
    } else {
      // No pathfinding available, use straight-line movement
      npc.isMoving = true;
    }

    // eslint-disable-next-line no-console
    console.log(`[NPCManager] Assigned NPC ${npcId} to building ${buildingId}, moving to (${building.position.x}, ${building.position.y}, ${building.position.z})`);

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
    npc.targetPosition = null;
    npc.isMoving = false;
    this.townManager.unassignNPC(npcId);
  }

  /**
   * Update NPC movement (frame-based, called frequently)
   * @param {number} deltaTime - Time since last update in seconds (e.g., 0.016 for 60fps)
   */
  updateMovement(deltaTime = 0.016) {
    const speed = 2.0; // units per second

    for (const npc of this.npcs.values()) {
      if (npc.alive && npc.isMoving) {
        this._updateNPCMovement(npc, speed, deltaTime);

        // Apply collision avoidance
        this._applyCollisionAvoidance(npc, deltaTime);
      }
    }
  }

  /**
   * Apply collision avoidance steering to NPC
   * @private
   * @param {NPC} npc - NPC to apply avoidance to
   * @param {number} deltaTime - Time delta
   */
  _applyCollisionAvoidance(npc, deltaTime) {
    const avoidanceRadius = 1.0; // Distance to check for nearby NPCs
    const avoidanceStrength = 1.5; // How strongly to avoid

    let avoidanceX = 0;
    let avoidanceZ = 0;
    let nearbyCount = 0;

    // Check all other NPCs
    for (const otherNPC of this.npcs.values()) {
      if (otherNPC.id === npc.id || !otherNPC.alive) {
        continue;
      }

      const dx = otherNPC.position.x - npc.position.x;
      const dz = otherNPC.position.z - npc.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // If too close, steer away
      if (distance < avoidanceRadius && distance > 0.01) {
        // Calculate avoidance vector (away from other NPC)
        const strength = (avoidanceRadius - distance) / avoidanceRadius;
        avoidanceX -= (dx / distance) * strength;
        avoidanceZ -= (dz / distance) * strength;
        nearbyCount++;
      }
    }

    // Apply avoidance if needed
    if (nearbyCount > 0) {
      npc.position.x += avoidanceX * avoidanceStrength * deltaTime;
      npc.position.z += avoidanceZ * avoidanceStrength * deltaTime;

      // Clamp to grid bounds
      npc.position.x = Math.max(0, Math.min(this.gridManager?.gridSize - 1 || 10, npc.position.x));
      npc.position.z = Math.max(0, Math.min(this.gridManager?.gridSize - 1 || 10, npc.position.z));
    }
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
   * Update all NPCs (alias for updateAllNPCs)
   * @param {number} tickCount - Current tick number
   */
  tick(tickCount) {
    this.updateAllNPCs(tickCount);
  }

  /**
   * Kill an NPC
   * @param {number} npcId - NPC ID
   * @param {string} causeOfDeath - Optional cause of death ('starvation', 'disaster', 'old_age', etc.)
   */
  killNPC(npcId, causeOfDeath = 'unknown') {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.alive) return;

    npc.alive = false;
    this.workingNPCs.delete(npcId);
    this.restingNPCs.delete(npcId);
    this.idleNPCs.delete(npcId);
    this.stats.totalDead++;

    // Phase 3C: Record NPC death for achievement tracking
    if (this.orchestrator && this.orchestrator.achievementSystem) {
      this.orchestrator.achievementSystem.recordNPCDeath(causeOfDeath);
    }

    // Phase 3A: Clean up idle tasks and needs tracking (memory cleanup)
    if (this.orchestrator) {
      if (this.orchestrator.idleTaskManager) {
        this.orchestrator.idleTaskManager.removeNPC(npcId);
      }
      if (this.orchestrator.needsTracker) {
        this.orchestrator.needsTracker.unregisterNPC(npcId);
      }
    }

    // Unassign and update town
    this.unassignNPC(npcId);
    this.townManager.killNPC(npcId);
  }

  /**
   * Remove an NPC completely from the system
   * @param {number} npcId - NPC ID
   * @returns {Object} Result object with success status
   */
  removeNPC(npcId) {
    const npc = this.npcs.get(npcId);

    if (!npc) {
      return {
        success: false,
        error: `NPC ${npcId} not found`
      };
    }

    // Unassign if assigned
    if (npc.assignedBuilding) {
      this.unassignNPC(npcId);
    }

    // Remove from status sets
    this.workingNPCs.delete(npcId);
    this.restingNPCs.delete(npcId);
    this.idleNPCs.delete(npcId);

    // Remove from main collection
    this.npcs.delete(npcId);

    // Update town manager if it has a removeNPC method
    if (this.townManager && typeof this.townManager.removeNPC === 'function') {
      this.townManager.removeNPC(npcId);
    }

    return {
      success: true,
      npcId: npcId
    };
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
    const totalNPCs = this.npcs.size;
    const deadCount = totalNPCs - alive.length;
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
      deadCount: deadCount,
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

  /**
   * Move NPC from idle to working set
   */
  moveToWorking(npcId) {
    this.idleNPCs.delete(npcId);
    this.workingNPCs.add(npcId);
    // eslint-disable-next-line no-console
    console.log(`[NPCManager] NPC ${npcId} now working`);
  }

  /**
   * Move NPC to idle set
   */
  moveToIdle(npcId) {
    this.workingNPCs.delete(npcId);
    this.restingNPCs.delete(npcId);
    this.idleNPCs.add(npcId);
    // eslint-disable-next-line no-console
    console.log(`[NPCManager] NPC ${npcId} now idle`);
  }

  /**
   * Move NPC to resting set
   */
  moveToResting(npcId) {
    this.idleNPCs.delete(npcId);
    this.workingNPCs.delete(npcId);
    this.restingNPCs.add(npcId);
    // eslint-disable-next-line no-console
    console.log(`[NPCManager] NPC ${npcId} now resting`);
  }
}

export { NPCManager, NPC };
