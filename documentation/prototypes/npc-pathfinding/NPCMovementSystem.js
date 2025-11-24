/**
 * NPC Movement System
 *
 * Manages NPC movement with:
 * - 0.1 second movement ticks
 * - 1 cell per tick
 * - Stuck detection (>3 seconds)
 * - Emergency recovery (teleport)
 * - Morale/happiness tracking
 */

class NPC {
  constructor(id, x, y, z) {
    this.id = id;
    this.position = { x, y, z };
    this.targetPosition = { x, y, z };
    this.velocity = { x: 0, y: 0, z: 0 };

    // Movement tracking
    this.isMoving = false;
    this.stuckTime = 0; // How long NPC has been stuck (ms)
    this.stuckThreshold = 3000; // 3 seconds

    // Pathfinding
    this.path = [];
    this.pathIndex = 0;
    this.lastPathUpdate = 0;
    this.pathUpdateInterval = 500; // Recalculate path every 500ms

    // Morale/happiness
    this.happiness = 50;
    this.morale = 50;
    this.idle = true;

    // Role and assignment
    this.role = 'WANDERER';
    this.assignedBuildingId = null;

    // Statistics
    this.distanceTraveled = 0;
    this.movementTicks = 0;
    this.stuckRecoveries = 0;
  }

  /**
   * Assign NPC to work at a building
   * @param {number} buildingId
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} targetZ
   */
  assignToBuilding(buildingId, targetX, targetY, targetZ) {
    this.assignedBuildingId = buildingId;
    this.setTargetPosition(targetX, targetY, targetZ);
    this.idle = false;
  }

  /**
   * Release NPC from current assignment
   */
  unassign() {
    this.assignedBuildingId = null;
    this.idle = true;
    // Set random wander position
    this.setRandomTarget();
  }

  /**
   * Set target position and recalculate path
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setTargetPosition(x, y, z) {
    this.targetPosition = { x, y, z };
    this.isMoving = true;
    this.stuckTime = 0;
  }

  /**
   * Set random wander target (within grid bounds)
   */
  setRandomTarget() {
    const x = Math.floor(Math.random() * 25);
    const y = Math.floor(Math.random() * 25);
    const z = Math.floor(Math.random() * 25);
    this.setTargetPosition(x, y, z);
  }

  /**
   * Check if NPC has reached target
   * @returns {boolean}
   */
  hasReachedTarget() {
    return (
      this.position.x === this.targetPosition.x &&
      this.position.y === this.targetPosition.y &&
      this.position.z === this.targetPosition.z
    );
  }

  /**
   * Record movement and distance
   * @param {number} distance
   */
  recordMovement(distance) {
    this.movementTicks++;
    this.distanceTraveled += distance;
  }

  /**
   * Log a stuck recovery event
   */
  recordStuckRecovery() {
    this.stuckRecoveries++;
    this.stuckTime = 0;
  }

  /**
   * Get diagnostic info for this NPC
   * @returns {object}
   */
  getDiagnostics() {
    return {
      id: this.id,
      position: this.position,
      targetPosition: this.targetPosition,
      isMoving: this.isMoving,
      stuckTime: this.stuckTime,
      assignedBuilding: this.assignedBuildingId,
      happiness: this.happiness,
      morale: this.morale,
      idle: this.idle,
      role: this.role,
      stats: {
        movementTicks: this.movementTicks,
        distanceTraveled: this.distanceTraveled,
        stuckRecoveries: this.stuckRecoveries
      }
    };
  }
}

class NPCMovementSystem {
  constructor(pathfinder, gridSize = 25) {
    this.pathfinder = pathfinder;
    this.gridSize = gridSize;
    this.npcs = new Map(); // ID -> NPC
    this.npcIdCounter = 0;

    // Performance tracking
    this.frameTime = 0;
    this.pathfindingTime = 0;
    this.movementTime = 0;
    this.totalNPCs = 0;
  }

  /**
   * Spawn a new NPC at a position
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {NPC}
   */
  spawnNPC(x, y, z) {
    const id = this.npcIdCounter++;
    const npc = new NPC(id, x, y, z);
    this.npcs.set(id, npc);
    this.totalNPCs = this.npcs.size;
    return npc;
  }

  /**
   * Get NPC by ID
   * @param {number} id
   * @returns {NPC | null}
   */
  getNPC(id) {
    return this.npcs.get(id) || null;
  }

  /**
   * Get all NPCs
   * @returns {Array<NPC>}
   */
  getAllNPCs() {
    return Array.from(this.npcs.values());
  }

  /**
   * Remove an NPC (death, despawn, etc.)
   * @param {number} id
   */
  removeNPC(id) {
    this.npcs.delete(id);
    this.totalNPCs = this.npcs.size;
  }

  /**
   * Update NPC pathfinding (called periodically, not every frame)
   * @param {NPC} npc
   */
  updateNPCPath(npc) {
    if (!npc.isMoving) {
      return;
    }

    const startTime = performance.now();

    // Find path to target
    const path = this.pathfinder.findPath(
      npc.position.x,
      npc.position.y,
      npc.position.z,
      npc.targetPosition.x,
      npc.targetPosition.y,
      npc.targetPosition.z,
      50 // Max 50 cells search
    );

    npc.path = path;
    npc.pathIndex = 0;

    this.pathfindingTime += performance.now() - startTime;
  }

  /**
   * Update NPC movement for one tick (0.1 seconds)
   * @param {NPC} npc
   * @returns {boolean} True if NPC moved
   */
  updateNPCMovement(npc) {
    const startTime = performance.now();

    // Check if reached target
    if (npc.hasReachedTarget()) {
      npc.isMoving = false;
      npc.stuckTime = 0;
      this.movementTime += performance.now() - startTime;
      return false;
    }

    // Get next step from pathfinder
    const nextStep = this.pathfinder.getNextStep(
      npc.position.x,
      npc.position.y,
      npc.position.z,
      npc.targetPosition.x,
      npc.targetPosition.y,
      npc.targetPosition.z
    );

    if (!nextStep) {
      // Stuck
      npc.stuckTime += 100; // Increment by 0.1 seconds

      if (npc.stuckTime >= npc.stuckThreshold) {
        // Emergency recovery: teleport to target
        npc.position = { ...npc.targetPosition };
        npc.stuckTime = 0;
        npc.recordStuckRecovery();
      }

      this.movementTime += performance.now() - startTime;
      return false;
    }

    // Move to next step
    const oldPos = { ...npc.position };
    npc.position = nextStep;
    npc.stuckTime = 0; // Reset stuck timer when successfully moving

    // Record movement
    const distance = Math.sqrt(
      Math.pow(nextStep.x - oldPos.x, 2) +
      Math.pow(nextStep.y - oldPos.y, 2) +
      Math.pow(nextStep.z - oldPos.z, 2)
    );
    npc.recordMovement(distance);

    this.movementTime += performance.now() - startTime;
    return true;
  }

  /**
   * Update all NPCs for one tick
   * Call this once per movement tick (every 0.1 seconds)
   */
  updateAllNPCs() {
    const frameStartTime = performance.now();
    this.pathfindingTime = 0;
    this.movementTime = 0;

    let movedCount = 0;
    let stuckCount = 0;

    for (const npc of this.npcs.values()) {
      // Update path periodically (every 500ms = 5 ticks)
      if (Date.now() - npc.lastPathUpdate > npc.pathUpdateInterval) {
        this.updateNPCPath(npc);
        npc.lastPathUpdate = Date.now();
      }

      // Update movement
      const moved = this.updateNPCMovement(npc);
      if (moved) {
        movedCount++;
      } else if (npc.stuckTime > 0) {
        stuckCount++;
      }
    }

    this.frameTime = performance.now() - frameStartTime;

    return {
      movedCount,
      stuckCount,
      frameTime: this.frameTime,
      pathfindingTime: this.pathfindingTime,
      movementTime: this.movementTime,
      totalNPCs: this.totalNPCs
    };
  }

  /**
   * Register all NPCs as obstacles in the pathfinder
   * (For stuck detection validation)
   */
  updateObstacles() {
    // Clear all NPC obstacles
    const allPositions = this.npcs.values();
    for (const npc of allPositions) {
      this.pathfinder.removeObstacle(npc.position.x, npc.position.y, npc.position.z);
    }

    // Re-add all NPC positions as obstacles
    for (const npc of this.npcs.values()) {
      this.pathfinder.addObstacle(npc.position.x, npc.position.y, npc.position.z);
    }
  }

  /**
   * Get system diagnostics
   * @returns {object}
   */
  getDiagnostics() {
    const allNPCs = this.getAllNPCs();
    const movedLastTick = allNPCs.filter(n => n.movementTicks > 0).length;
    const stuckCount = allNPCs.filter(n => n.stuckTime > 0).length;
    const assignedCount = allNPCs.filter(n => !n.idle).length;

    return {
      totalNPCs: this.totalNPCs,
      movedLastTick,
      stuckCount,
      assignedCount,
      frameTime: this.frameTime,
      pathfindingTime: this.pathfindingTime,
      movementTime: this.movementTime,
      pathfinderDiagnostics: this.pathfinder.getDiagnostics(),
      NPCs: allNPCs.map(n => n.getDiagnostics())
    };
  }

  /**
   * Reset all statistics
   */
  resetStatistics() {
    for (const npc of this.npcs.values()) {
      npc.movementTicks = 0;
      npc.distanceTraveled = 0;
      npc.stuckRecoveries = 0;
      npc.stuckTime = 0;
    }
    this.frameTime = 0;
    this.pathfindingTime = 0;
    this.movementTime = 0;
  }
}

module.exports = { NPCMovementSystem, NPC };
