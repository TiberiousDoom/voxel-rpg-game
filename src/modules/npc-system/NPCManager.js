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
import { CommandQueue, Formation } from './NPCCommand.js';
import { Personality, RelationshipManager } from './NPCPersonality.js';
import { NPCVisualFeedbackManager } from './NPCVisualFeedback.js';

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

    // Phase 2: Command & Control
    this.commandQueue = new CommandQueue(); // Command queue for player orders
    this.formationId = null; // Formation this NPC belongs to
    this.followTarget = null; // NPC ID being followed
    this.patrolWaypoints = null; // Patrol waypoints
    this.patrolIndex = 0; // Current patrol waypoint index

    // Phase 3: Personality & Variation
    this.personality = data.personality || Personality.fromArchetype(this.role);
    this.currentMood = 'neutral'; // Current emotional state
    this.recentMemories = []; // Recent events/interactions

    // Inventory
    this.inventory = {
      food: 0,
      items: [] // For future item system
    };

    // Hybrid Game: Combat statistics
    this.combatStats = {
      health: {
        current: 100,
        max: 100
      },
      damage: 10,           // Base attack damage
      defense: 0,           // Damage reduction
      speed: 3,             // Movement speed in combat
      critChance: 5,        // Critical hit chance (%)
      critDamage: 150,      // Critical damage multiplier (%)
      dodgeChance: 5        // Dodge chance (%)
    };

    // Hybrid Game: Combat progression
    this.combatLevel = data.combatLevel || 1;
    this.combatXP = data.combatXP || 0;
    this.combatXPToNext = data.combatXPToNext || 100;

    // Hybrid Game: Equipment slots
    this.equipment = data.equipment || {
      weapon: null,         // Weapon item
      armor: null,          // Armor item
      accessory: null       // Accessory item
    };

    // Hybrid Game: Skill points and unlocked skills
    this.skillPoints = data.skillPoints || 0;
    this.skills_combat = data.skills_combat || {
      combat: {
        powerStrike: 0,     // Level 0-5
        criticalHit: 0,     // Level 0-5
        deadlyBlow: 0       // Level 0-3
      },
      magic: {
        manaPool: 0,        // Level 0-5
        spellPower: 0,      // Level 0-5
        fastCasting: 0      // Level 0-3
      },
      defense: {
        ironSkin: 0,        // Level 0-5
        vitality: 0,        // Level 0-5
        evasion: 0          // Level 0-5
      },
      utility: {
        swiftness: 0,       // Level 0-3
        fortune: 0,         // Level 0-5
        regeneration: 0     // Level 0-3
      }
    };

    // Hybrid Game: Combat experience
    this.expeditionCount = data.expeditionCount || 0;     // Number of expeditions completed
    this.kills = data.kills || 0;                         // Total enemies killed
    this.damageDealt = data.damageDealt || 0;             // Total damage dealt
    this.damageTaken = data.damageTaken || 0;             // Total damage taken
    this.isVeteran = data.isVeteran || false;             // True after 10 expeditions
    this.onExpedition = data.onExpedition || false;       // Currently on expedition

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

    // Phase 2: Formation management
    this.formations = new Map(); // formationId -> Formation

    // Phase 3: Relationship management
    this.relationshipManager = new RelationshipManager();

    // Phase 4: Visual feedback
    this.visualFeedbackManager = new NPCVisualFeedbackManager();
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

    // Phase 2: Process commands first
    this.processCommands(deltaTime);

    // Phase 2: Update formations
    this.updateFormations(deltaTime);

    // Phase 3: Process NPC interactions
    this.processInteractions(deltaTime);

    // Then update movement
    for (const npc of this.npcs.values()) {
      if (npc.alive && npc.isMoving) {
        this._updateNPCMovement(npc, speed, deltaTime);

        // Apply collision avoidance
        this._applyCollisionAvoidance(npc, deltaTime);
      }

      // Phase 3: Update mood
      if (npc.alive) {
        this.updateNPCMood(npc.id);
      }

      // Phase 4: Update visual feedback
      if (npc.alive) {
        this.visualFeedbackManager.updateFromNPCState(npc);
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

    // Phase 3: Clean up relationships
    this.relationshipManager.clearNPCRelationships(npcId);

    // Phase 4: Clean up visual feedback
    this.visualFeedbackManager.clearNPCVisualState(npcId);

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

  // ============================================================
  // PHASE 2: COMMAND & CONTROL SYSTEM
  // ============================================================

  /**
   * Issue a command to an NPC
   * @param {string} npcId - NPC ID
   * @param {Command} command - Command to issue
   * @returns {boolean} Success
   */
  issueCommand(npcId, command) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.alive) {
      return false;
    }

    npc.commandQueue.addCommand(command);
    return true;
  }

  /**
   * Cancel NPC's current command
   * @param {string} npcId - NPC ID
   */
  cancelCommand(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    npc.commandQueue.cancelCurrent();
  }

  /**
   * Cancel all commands for an NPC
   * @param {string} npcId - NPC ID
   */
  cancelAllCommands(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    npc.commandQueue.cancelAll();
  }

  /**
   * Process commands for all NPCs
   * Called during movement update to execute player commands
   * @param {number} deltaTime - Time delta
   */
  processCommands(deltaTime) {
    for (const npc of this.npcs.values()) {
      if (!npc.alive) continue;

      const command = npc.commandQueue.getNextCommand();
      if (!command) continue;

      this._executeCommand(npc, command, deltaTime);
    }
  }

  /**
   * Execute a specific command for an NPC
   * @private
   * @param {NPC} npc - NPC instance
   * @param {Command} command - Command to execute
   * @param {number} deltaTime - Time delta
   */
  _executeCommand(npc, command, deltaTime) {
    const { CommandType } = require('./NPCCommand.js');

    switch (command.type) {
      case CommandType.MOVE_TO:
        this._executeMoveToCommand(npc, command);
        break;

      case CommandType.FOLLOW:
        this._executeFollowCommand(npc, command, deltaTime);
        break;

      case CommandType.PATROL:
        this._executePatrolCommand(npc, command);
        break;

      case CommandType.RALLY:
        this._executeRallyCommand(npc, command);
        break;

      case CommandType.PRIORITIZE_BUILDING:
        this._executePrioritizeBuildingCommand(npc, command);
        break;

      case CommandType.IDLE:
        this._executeIdleCommand(npc, command);
        break;

      default:
        command.fail('Unknown command type');
    }
  }

  /**
   * Execute MOVE_TO command
   * @private
   */
  _executeMoveToCommand(npc, command) {
    const { position } = command.params;

    // Set target and calculate path
    if (!npc.targetPosition || !this._positionsEqual(npc.targetPosition, position)) {
      npc.targetPosition = position;

      // Calculate path if pathfinding available
      if (this.pathfindingService) {
        const path = this.pathfindingService.findPath(npc.position, position);
        if (path) {
          npc.currentPath = this.pathfindingService.smoothPath(path);
          npc.pathIndex = 0;
          npc.nextWaypoint = null;
        }
      }

      npc.isMoving = true;
    }

    // Check if arrived
    const distance = Math.sqrt(
      Math.pow(position.x - npc.position.x, 2) +
      Math.pow(position.z - npc.position.z, 2)
    );

    if (distance < 0.5) {
      npc.isMoving = false;
      command.complete();
    } else {
      // Update progress based on distance
      const totalDistance = command.params.initialDistance || distance;
      command.params.initialDistance = totalDistance;
      command.updateProgress(1 - (distance / totalDistance));
    }
  }

  /**
   * Execute FOLLOW command
   * @private
   */
  _executeFollowCommand(npc, command, deltaTime) {
    const { targetId, distance: followDistance } = command.params;
    const target = this.npcs.get(targetId);

    if (!target || !target.alive) {
      command.fail('Target NPC not found or dead');
      return;
    }

    // Calculate desired position (behind target)
    const dx = target.position.x - npc.position.x;
    const dz = target.position.z - npc.position.z;
    const currentDistance = Math.sqrt(dx * dx + dz * dz);

    // If too far, move closer
    if (currentDistance > followDistance + 0.5) {
      const targetPos = {
        x: target.position.x - (dx / currentDistance) * followDistance,
        y: target.position.y,
        z: target.position.z - (dz / currentDistance) * followDistance,
      };

      npc.targetPosition = targetPos;
      npc.isMoving = true;

      // Recalculate path periodically
      if (!npc.currentPath || Math.random() < 0.1) {
        if (this.pathfindingService) {
          const path = this.pathfindingService.findPath(npc.position, targetPos);
          if (path) {
            npc.currentPath = path;
            npc.pathIndex = 0;
          }
        }
      }
    } else if (currentDistance < followDistance - 0.5) {
      // Too close, back away slightly
      npc.isMoving = false;
    } else {
      // In good position
      npc.isMoving = false;
    }

    // Follow commands don't complete automatically (infinite)
    command.updateProgress(0.5); // Always 50% (active)
  }

  /**
   * Execute PATROL command
   * @private
   */
  _executePatrolCommand(npc, command) {
    const { waypoints, loop } = command.params;

    if (!waypoints || waypoints.length === 0) {
      command.fail('No patrol waypoints');
      return;
    }

    // Initialize patrol if needed
    if (command.params.currentIndex === undefined) {
      command.params.currentIndex = 0;
    }

    const currentWaypoint = waypoints[command.params.currentIndex];
    npc.targetPosition = currentWaypoint;

    // Check if reached current waypoint
    const distance = Math.sqrt(
      Math.pow(currentWaypoint.x - npc.position.x, 2) +
      Math.pow(currentWaypoint.z - npc.position.z, 2)
    );

    if (distance < 0.5) {
      // Move to next waypoint
      command.params.currentIndex++;

      if (command.params.currentIndex >= waypoints.length) {
        if (loop) {
          command.params.currentIndex = 0; // Loop back
        } else {
          command.complete(); // Patrol complete
          npc.isMoving = false;
          return;
        }
      }
    } else {
      // Move towards waypoint
      if (!npc.isMoving) {
        npc.isMoving = true;
        if (this.pathfindingService) {
          const path = this.pathfindingService.findPath(npc.position, currentWaypoint);
          if (path) {
            npc.currentPath = this.pathfindingService.smoothPath(path);
            npc.pathIndex = 0;
          }
        }
      }
    }

    // Update progress
    const progress = command.params.currentIndex / waypoints.length;
    command.updateProgress(progress);
  }

  /**
   * Execute RALLY command (same as MOVE_TO but higher priority)
   * @private
   */
  _executeRallyCommand(npc, command) {
    this._executeMoveToCommand(npc, command);
  }

  /**
   * Execute PRIORITIZE_BUILDING command
   * @private
   */
  _executePrioritizeBuildingCommand(npc, command) {
    const { buildingId } = command.params;

    // Store priority preference
    npc.priorityBuilding = buildingId;

    // Try to assign to that building
    const result = this.assignNPC(npc.id, buildingId);

    if (result) {
      command.complete();
    } else {
      command.fail('Could not assign to building');
    }
  }

  /**
   * Execute IDLE command
   * @private
   */
  _executeIdleCommand(npc, command) {
    // Unassign from work
    if (npc.assignedBuilding) {
      this.unassignNPC(npc.id);
    }

    npc.isMoving = false;
    npc.isWorking = false;
    npc.targetPosition = null;
    npc.currentPath = null;

    command.complete();
  }

  /**
   * Check if two positions are equal
   * @private
   */
  _positionsEqual(pos1, pos2) {
    return Math.abs(pos1.x - pos2.x) < 0.1 &&
           Math.abs(pos1.y - pos2.y) < 0.1 &&
           Math.abs(pos1.z - pos2.z) < 0.1;
  }

  /**
   * Get command status for an NPC
   * @param {string} npcId - NPC ID
   * @returns {Object|null} Command queue status
   */
  getCommandStatus(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;

    return npc.commandQueue.getStatus();
  }

  // ============================================================
  // FORMATION MANAGEMENT
  // ============================================================

  /**
   * Create a new formation
   * @param {string} type - Formation type (from FormationType)
   * @param {string} leaderId - Leader NPC ID
   * @returns {Formation} Created formation
   */
  createFormation(type, leaderId) {
    const formation = new Formation(type, leaderId);
    this.formations.set(formation.id, formation);

    // Set leader's formation
    const leader = this.npcs.get(leaderId);
    if (leader) {
      leader.formationId = formation.id;
    }

    return formation;
  }

  /**
   * Add NPC to formation
   * @param {string} formationId - Formation ID
   * @param {string} npcId - NPC ID to add
   * @returns {boolean} Success
   */
  addToFormation(formationId, npcId) {
    const formation = this.formations.get(formationId);
    const npc = this.npcs.get(npcId);

    if (!formation || !npc) {
      return false;
    }

    formation.addMember(npcId);
    npc.formationId = formationId;

    return true;
  }

  /**
   * Remove NPC from formation
   * @param {string} npcId - NPC ID
   * @returns {boolean} Success
   */
  removeFromFormation(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.formationId) {
      return false;
    }

    const formation = this.formations.get(npc.formationId);
    if (formation) {
      formation.removeMember(npcId);

      // Delete formation if empty
      if (formation.memberIds.length === 0) {
        this.formations.delete(formation.id);
      }
    }

    npc.formationId = null;
    return true;
  }

  /**
   * Update formation positions
   * Called during movement update to maintain formations
   * @param {number} deltaTime - Time delta
   */
  updateFormations(deltaTime) {
    for (const formation of this.formations.values()) {
      const leader = this.npcs.get(formation.leaderId);
      if (!leader || !leader.alive) {
        // Remove formation if leader is gone
        this.formations.delete(formation.id);
        continue;
      }

      // Calculate leader direction (from movement)
      let leaderDirection = { x: 0, z: 1 }; // Default forward
      if (leader.targetPosition) {
        const dx = leader.targetPosition.x - leader.position.x;
        const dz = leader.targetPosition.z - leader.position.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length > 0.1) {
          leaderDirection = { x: dx / length, z: dz / length };
        }
      }

      // Calculate formation positions
      const positions = formation.calculatePositions(leader.position, leaderDirection);

      // Assign positions to formation members
      for (const [npcId, position] of positions.entries()) {
        const member = this.npcs.get(npcId);
        if (!member || !member.alive) continue;

        // Set target position for member
        member.targetPosition = position;
        member.isMoving = true;

        // Calculate path if needed
        if (this.pathfindingService && !member.currentPath) {
          const path = this.pathfindingService.findPath(member.position, position);
          if (path) {
            member.currentPath = path;
            member.pathIndex = 0;
          }
        }
      }
    }
  }

  /**
   * Get formation info
   * @param {string} formationId - Formation ID
   * @returns {Object|null} Formation summary
   */
  getFormation(formationId) {
    const formation = this.formations.get(formationId);
    return formation ? formation.getSummary() : null;
  }

  /**
   * Get all formations
   * @returns {Array<Object>} All formation summaries
   */
  getAllFormations() {
    return Array.from(this.formations.values()).map(f => f.getSummary());
  }

  // ============================================================
  // PHASE 3: PERSONALITY & RELATIONSHIPS
  // ============================================================

  /**
   * Process NPC interactions (called periodically)
   * Handles automatic social interactions between nearby NPCs
   * @param {number} deltaTime - Time delta
   */
  processInteractions(deltaTime) {
    const interactionRadius = 2.0; // NPCs within this radius can interact
    const interactionChance = 0.01; // 1% chance per frame when near

    for (const npc of this.npcs.values()) {
      if (!npc.alive || npc.isWorking) continue;

      // Find nearby NPCs
      const nearbyNPCs = this.getNearbyNPCs(npc.id, interactionRadius);

      for (const otherNPC of nearbyNPCs) {
        if (Math.random() < interactionChance) {
          this._performSocialInteraction(npc, otherNPC);
        }
      }
    }
  }

  /**
   * Perform social interaction between two NPCs
   * @private
   * @param {NPC} npc1 - First NPC
   * @param {NPC} npc2 - Second NPC
   */
  _performSocialInteraction(npc1, npc2) {
    // Calculate compatibility based on personalities
    const compatibility = this._calculateCompatibility(npc1.personality, npc2.personality);

    // Interaction impact based on compatibility and traits
    const socialTrait1 = npc1.personality.getTraitStrength('SOCIAL');
    const socialTrait2 = npc2.personality.getTraitStrength('SOCIAL');

    const impact = compatibility * (socialTrait1 + socialTrait2) * 5; // -5 to +5

    // Record interaction
    this.relationshipManager.recordInteraction(npc1.id, npc2.id, 'social', impact);

    // Add memory to NPCs
    npc1.recentMemories.push({
      type: 'interaction',
      withNPC: npc2.id,
      impact: impact,
      timestamp: Date.now(),
    });

    // Keep only last 20 memories
    if (npc1.recentMemories.length > 20) {
      npc1.recentMemories.shift();
    }

    // Boost happiness slightly for social NPCs
    if (socialTrait1 > 0.6) {
      npc1.happiness = Math.min(100, npc1.happiness + 0.5);
    }
  }

  /**
   * Calculate compatibility between two personalities
   * @private
   * @param {Personality} p1 - First personality
   * @param {Personality} p2 - Second personality
   * @returns {number} Compatibility (-1 to 1)
   */
  _calculateCompatibility(p1, p2) {
    let compatibility = 0;

    // Similar social traits get along
    const socialDiff = Math.abs(p1.traits.SOCIAL - p2.traits.SOCIAL);
    compatibility += (1 - socialDiff) * 0.3;

    // Optimists get along with optimists
    const optimismDiff = Math.abs(p1.traits.OPTIMISTIC - p2.traits.OPTIMISTIC);
    compatibility += (1 - optimismDiff) * 0.2;

    // Complementary work styles (industrious + lazy can conflict)
    const workDiff = Math.abs(p1.traits.INDUSTRIOUS - p2.traits.INDUSTRIOUS);
    if (workDiff > 0.5) {
      compatibility -= 0.2; // Conflict
    }

    // Random factor
    compatibility += (Math.random() - 0.5) * 0.3;

    return Math.max(-1, Math.min(1, compatibility));
  }

  /**
   * Get NPCs near a specific NPC
   * @param {string} npcId - NPC ID
   * @param {number} radius - Search radius
   * @returns {Array<NPC>} Nearby NPCs
   */
  getNearbyNPCs(npcId, radius = 3.0) {
    const npc = this.npcs.get(npcId);
    if (!npc) return [];

    const nearby = [];

    for (const otherNPC of this.npcs.values()) {
      if (otherNPC.id === npcId || !otherNPC.alive) continue;

      const dx = otherNPC.position.x - npc.position.x;
      const dz = otherNPC.position.z - npc.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= radius) {
        nearby.push(otherNPC);
      }
    }

    return nearby;
  }

  /**
   * Get NPC relationships
   * @param {string} npcId - NPC ID
   * @returns {Array<Object>} Relationships
   */
  getNPCRelationships(npcId) {
    return this.relationshipManager.getNPCRelationships(npcId);
  }

  /**
   * Get NPC friends
   * @param {string} npcId - NPC ID
   * @returns {Array<string>} Friend NPC IDs
   */
  getNPCFriends(npcId) {
    return this.relationshipManager.getFriends(npcId);
  }

  /**
   * Apply personality modifiers to NPC work
   * @param {string} npcId - NPC ID
   * @param {number} baseProductivity - Base productivity value
   * @returns {number} Modified productivity
   */
  applyPersonalityToWork(npcId, baseProductivity) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.personality) return baseProductivity;

    // Apply work pace modifier
    let productivity = baseProductivity * npc.personality.workPaceModifier;

    // Check if working with friends (bonus)
    const nearbyNPCs = this.getNearbyNPCs(npcId, 3.0);
    const friends = this.getNPCFriends(npcId);

    const friendsNearby = nearbyNPCs.filter(n => friends.includes(n.id)).length;
    if (friendsNearby > 0) {
      productivity *= 1 + (friendsNearby * 0.05); // 5% bonus per friend nearby
    }

    // Mood affects productivity
    if (npc.currentMood === 'happy') {
      productivity *= 1.1;
    } else if (npc.currentMood === 'sad') {
      productivity *= 0.9;
    }

    return productivity;
  }

  /**
   * Update NPC mood based on circumstances
   * @param {string} npcId - NPC ID
   */
  updateNPCMood(npcId) {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    // Calculate mood from multiple factors
    let moodScore = 0;

    // Happiness contributes
    moodScore += (npc.happiness - 50) / 50; // -1 to 1

    // Recent positive interactions
    const recentPositive = npc.recentMemories
      .filter(m => m.type === 'interaction' && m.impact > 0)
      .length;
    moodScore += recentPositive * 0.1;

    // Personality affects baseline mood
    if (npc.personality) {
      const optimism = npc.personality.getTraitStrength('OPTIMISTIC');
      moodScore += (optimism - 0.5); // -0.5 to +0.5
    }

    // Set mood
    if (moodScore > 0.5) {
      npc.currentMood = 'happy';
    } else if (moodScore < -0.5) {
      npc.currentMood = 'sad';
    } else {
      npc.currentMood = 'neutral';
    }
  }

  /**
   * Get personality-influenced decision for NPC
   * @param {string} npcId - NPC ID
   * @param {string} decisionType - Type of decision
   * @param {Object} options - Decision options
   * @returns {*} Decision result
   */
  getPersonalityDecision(npcId, decisionType, options = {}) {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.personality) return null;

    switch (decisionType) {
      case 'shouldRest':
        // Lazy NPCs rest more, industrious less
        const restThreshold = npc.personality.restThreshold;
        return npc.fatigued || (options.fatigueLevel || 0) > restThreshold;

      case 'preferredTask':
        // Choose task based on skill preferences
        if (options.tasks) {
          return options.tasks.sort((a, b) => {
            const prefA = npc.personality.skillPreferences[a.skill] || 0.5;
            const prefB = npc.personality.skillPreferences[b.skill] || 0.5;
            return prefB - prefA;
          })[0];
        }
        return null;

      case 'riskTaking':
        // Brave NPCs take more risks
        return Math.random() < npc.personality.riskTolerance;

      default:
        return null;
    }
  }

  // ============================================================
  // PHASE 4: VISUAL FEEDBACK
  // ============================================================

  /**
   * Select an NPC for UI
   * @param {string} npcId - NPC ID (null to deselect)
   */
  selectNPC(npcId) {
    this.visualFeedbackManager.selectNPC(npcId);
  }

  /**
   * Set hovered NPC
   * @param {string} npcId - NPC ID (null to clear)
   */
  setHoveredNPC(npcId) {
    this.visualFeedbackManager.setHoveredNPC(npcId);
  }

  /**
   * Get visual render data for all NPCs
   * @returns {Map<string, Object>} Render data map
   */
  getAllVisualData() {
    return this.visualFeedbackManager.getAllRenderData();
  }

  /**
   * Get selection panel data for selected NPC
   * @returns {Object|null} Selection panel data
   */
  getSelectionPanelData() {
    const selectedId = this.visualFeedbackManager.getSelectedNPC();
    if (!selectedId) return null;

    const npc = this.getNPC(selectedId);
    return this.visualFeedbackManager.getSelectionPanelData(npc);
  }

  /**
   * Add custom thought to NPC
   * @param {string} npcId - NPC ID
   * @param {string} type - Thought type
   * @param {string} message - Thought message
   * @param {number} duration - Duration in ms
   */
  addNPCThought(npcId, type, message, duration = 3000) {
    this.visualFeedbackManager.addThought(npcId, type, message, duration);
  }

  /**
   * Update path preview for NPC
   * @param {string} npcId - NPC ID
   * @param {Array<Object>} path - Path waypoints
   */
  updatePathPreview(npcId, path) {
    this.visualFeedbackManager.updatePathPreview(npcId, path);
  }

  /**
   * Get visual data for specific NPC
   * @param {string} npcId - NPC ID
   * @returns {Object|null} Visual data
   */
  getNPCVisualData(npcId) {
    const visualState = this.visualFeedbackManager.getVisualState(npcId);
    return visualState ? visualState.getRenderData() : null;
  }

  // ==================== HYBRID GAME: COMBAT SYSTEM ====================

  /**
   * Calculate XP required for next combat level
   * @param {number} currentLevel - Current combat level
   * @returns {number} XP required for next level
   */
  calculateCombatXPToNext(currentLevel) {
    return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
  }

  /**
   * Award combat XP to NPC and handle leveling
   * @param {string} npcId - NPC ID
   * @param {number} xp - XP to award
   * @returns {Object} Result with levelUps array
   */
  awardCombatXP(npcId, xp) {
    const npc = this.getNPC(npcId);
    if (!npc || !npc.alive) {
      return { success: false, error: 'NPC not found or dead' };
    }

    npc.combatXP += xp;
    const levelUps = [];

    // Process level ups
    while (npc.combatXP >= npc.combatXPToNext) {
      npc.combatXP -= npc.combatXPToNext;
      this._levelUpCombat(npc);
      levelUps.push(npc.combatLevel);
    }

    return {
      success: true,
      currentLevel: npc.combatLevel,
      currentXP: npc.combatXP,
      xpToNext: npc.combatXPToNext,
      levelUps
    };
  }

  /**
   * Level up NPC combat stats
   * @private
   * @param {NPC} npc - NPC to level up
   */
  _levelUpCombat(npc) {
    npc.combatLevel++;
    npc.combatXPToNext = this.calculateCombatXPToNext(npc.combatLevel);

    // Award skill points (2 per level)
    npc.skillPoints += 2;

    // Increase base stats
    npc.combatStats.health.max += 20;
    npc.combatStats.health.current = npc.combatStats.health.max; // Heal to full on level up
    npc.combatStats.damage += 5;
    npc.combatStats.speed += 0.1;

    console.log(`[NPCManager] ${npc.name} leveled up to combat level ${npc.combatLevel}!`);
  }

  /**
   * Check and update veteran status
   * @param {string} npcId - NPC ID
   */
  checkVeteranStatus(npcId) {
    const npc = this.getNPC(npcId);
    if (!npc) return;

    if (npc.expeditionCount >= 10 && !npc.isVeteran) {
      npc.isVeteran = true;
      console.log(`[NPCManager] ${npc.name} is now a veteran!`);
    }
  }

  /**
   * Upgrade NPC skill
   * @param {string} npcId - NPC ID
   * @param {string} category - Skill category (combat, magic, defense, utility)
   * @param {string} skillName - Skill name
   * @returns {Object} Result
   */
  upgradeNPCSkill(npcId, category, skillName) {
    const npc = this.getNPC(npcId);
    if (!npc) {
      return { success: false, error: 'NPC not found' };
    }

    // Check if skill exists
    if (!npc.skills_combat[category] || npc.skills_combat[category][skillName] === undefined) {
      return { success: false, error: 'Invalid skill' };
    }

    // Check skill points
    if (npc.skillPoints < 1) {
      return { success: false, error: 'Not enough skill points' };
    }

    // Check max level (varies by skill)
    const currentLevel = npc.skills_combat[category][skillName];
    const maxLevel = skillName.includes('Blow') || skillName.includes('Casting') ||
                     skillName.includes('swiftness') || skillName.includes('regeneration') ? 3 : 5;

    if (currentLevel >= maxLevel) {
      return { success: false, error: 'Skill already at max level' };
    }

    // Upgrade skill
    npc.skills_combat[category][skillName]++;
    npc.skillPoints--;

    return {
      success: true,
      newLevel: npc.skills_combat[category][skillName],
      skillPointsRemaining: npc.skillPoints
    };
  }

  /**
   * Get NPC combat summary
   * @param {string} npcId - NPC ID
   * @returns {Object|null} Combat summary
   */
  getNPCCombatSummary(npcId) {
    const npc = this.getNPC(npcId);
    if (!npc) return null;

    return {
      name: npc.name,
      level: npc.combatLevel,
      xp: npc.combatXP,
      xpToNext: npc.combatXPToNext,
      skillPoints: npc.skillPoints,
      stats: { ...npc.combatStats },
      expeditions: npc.expeditionCount,
      kills: npc.kills,
      isVeteran: npc.isVeteran,
      onExpedition: npc.onExpedition
    };
  }
}

export { NPCManager, NPC };
