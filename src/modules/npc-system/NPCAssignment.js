/**
 * Manages NPC work assignments to buildings
 * Handles capacity checking, validation, auto-assignment
 */
class NPCAssignment {
  constructor(npcManager, gridManager) {
    this.npcManager = npcManager;
    this.gridManager = gridManager;
    // Map of buildingId -> Set of npcIds
    this.assignments = new Map();
  }

  /**
   * Assign NPC to a building for work
   * @param {string} npcId - Unique NPC identifier
   * @param {string} buildingId - Unique building identifier
   * @returns {{success: boolean, error?: string}}
   */
  assignNPCToBuilding(npcId, buildingId) {
    // 1. Validate NPC exists
    const npc = this.npcManager.npcs.get(npcId);
    if (!npc) {
      console.error(`[NPCAssignment] NPC ${npcId} not found`);
      return { success: false, error: 'NPC_NOT_FOUND' };
    }

    // 2. Validate building exists
    const building = this.gridManager.buildings.get(buildingId);
    if (!building) {
      console.error(`[NPCAssignment] Building ${buildingId} not found`);
      return { success: false, error: 'BUILDING_NOT_FOUND' };
    }

    // 3. Check building is complete (can't work in blueprint/building)
    if (building.state !== 'COMPLETE') {
      console.warn(`[NPCAssignment] Building ${buildingId} not complete (state: ${building.state})`);
      return { success: false, error: 'BUILDING_NOT_COMPLETE' };
    }

    // 4. Check building capacity
    const capacity = building.properties.npcCapacity || 0;
    if (capacity === 0) {
      console.warn(`[NPCAssignment] Building ${buildingId} has no NPC capacity`);
      return { success: false, error: 'NO_CAPACITY' };
    }

    const currentWorkers = this.assignments.get(buildingId) || new Set();
    if (currentWorkers.size >= capacity) {
      console.warn(`[NPCAssignment] Building ${buildingId} at capacity (${capacity}/${capacity})`);
      return { success: false, error: 'AT_CAPACITY' };
    }

    // 5. Unassign NPC from current building if already assigned
    if (npc.assignedBuilding) {
      console.log(`[NPCAssignment] NPC ${npcId} already assigned to ${npc.assignedBuilding}, unassigning`);
      this.unassignNPC(npcId);
    }

    // 6. Perform assignment
    npc.assignedBuilding = buildingId;
    npc.setWorking(true);
    this.npcManager.moveToWorking(npcId);

    currentWorkers.add(npcId);
    this.assignments.set(buildingId, currentWorkers);

    console.log(`[NPCAssignment] ✅ Assigned NPC ${npcId} (${npc.role}) to building ${buildingId} (${building.type})`);
    return { success: true };
  }

  /**
   * Unassign NPC from current building
   * @param {string} npcId - Unique NPC identifier
   * @returns {boolean} True if unassigned, false if not assigned
   */
  unassignNPC(npcId) {
    const npc = this.npcManager.npcs.get(npcId);
    if (!npc || !npc.assignedBuilding) {
      return false;
    }

    const buildingId = npc.assignedBuilding;
    const workers = this.assignments.get(buildingId);

    if (workers) {
      workers.delete(npcId);
      if (workers.size === 0) {
        this.assignments.delete(buildingId);
      } else {
        this.assignments.set(buildingId, workers);
      }
    }

    npc.assignedBuilding = null;
    npc.setWorking(false);
    this.npcManager.moveToIdle(npcId);

    console.log(`[NPCAssignment] Unassigned NPC ${npcId} from building ${buildingId}`);
    return true;
  }

  /**
   * Auto-assign idle NPCs to understaffed buildings
   * Uses simple greedy algorithm: fill buildings in order
   */
  autoAssign() {
    const idleNPCs = Array.from(this.npcManager.idleNPCs);
    const buildings = Array.from(this.gridManager.buildings.values());

    // Sort buildings by priority (farms first, then production, then others)
    const buildingPriority = {
      'FARM': 1,
      'MINE': 2,
      'LUMBER_MILL': 3,
      'CRAFTING_STATION': 4,
      'MARKETPLACE': 5
    };

    buildings.sort((a, b) => {
      const priorityA = buildingPriority[a.type] || 99;
      const priorityB = buildingPriority[b.type] || 99;
      return priorityA - priorityB;
    });

    let assignedCount = 0;

    for (const building of buildings) {
      if (building.state !== 'COMPLETE') continue;

      const capacity = building.properties.npcCapacity || 0;
      const currentWorkers = this.assignments.get(building.id)?.size || 0;

      if (currentWorkers < capacity && idleNPCs.length > 0) {
        const npcId = idleNPCs.shift();
        const result = this.assignNPCToBuilding(npcId, building.id);
        if (result.success) {
          assignedCount++;
        }
      }
    }

    console.log(`[NPCAssignment] Auto-assigned ${assignedCount} NPCs`);
    return assignedCount;
  }

  /**
   * Get list of workers assigned to a specific building
   * @param {string} buildingId
   * @returns {Array<string>} Array of NPC IDs
   */
  getWorkersForBuilding(buildingId) {
    return Array.from(this.assignments.get(buildingId) || []);
  }

  /**
   * Get building assignment info for display
   * @param {string} buildingId
   * @returns {{capacity: number, current: number, workers: Array}}
   */
  getBuildingAssignmentInfo(buildingId) {
    const building = this.gridManager.buildings.get(buildingId);
    if (!building) return null;

    const capacity = building.properties.npcCapacity || 0;
    const workerIds = this.getWorkersForBuilding(buildingId);
    const workers = workerIds.map(id => this.npcManager.npcs.get(id));

    return {
      capacity,
      current: workerIds.length,
      workers: workers.filter(w => w !== undefined)
    };
  }

  /**
   * Get statistics for all assignments
   */
  getStatistics() {
    return {
      totalAssignments: Array.from(this.assignments.values()).reduce((sum, set) => sum + set.size, 0),
      buildingsStaffed: this.assignments.size,
      idleNPCs: this.npcManager.idleNPCs.size
    };
  }

  /**
   * Clear all assignments (used when building destroyed)
   * @param {string} buildingId
   */
  clearBuildingAssignments(buildingId) {
    const workers = this.assignments.get(buildingId);
    if (!workers) return;

    for (const npcId of workers) {
      const npc = this.npcManager.npcs.get(npcId);
      if (npc) {
        npc.assignedBuilding = null;
        npc.setWorking(false);
        this.npcManager.moveToIdle(npcId);
      }
    }

    this.assignments.delete(buildingId);
    console.log(`[NPCAssignment] Cleared all assignments for building ${buildingId}`);
  }
}

export default NPCAssignment;
