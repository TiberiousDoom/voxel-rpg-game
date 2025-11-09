/**
 * NPCAssignment.js - Work slot and building assignment logic
 *
 * Manages:
 * - Building work slot allocation
 * - NPC assignment priority and balancing
 * - Building staffing levels
 * - Assignment optimization
 *
 * Based on FORMULAS.md section 4: NPC ASSIGNMENT PRIORITY
 */

class BuildingSlot {
  /**
   * Create a work slot
   * @param {number} slotId - Slot ID within building
   * @param {string} buildingId - Building ID
   */
  constructor(slotId, buildingId) {
    this.slotId = slotId;
    this.buildingId = buildingId;
    this.assignedNPC = null;
    this.createdAt = new Date().toISOString();
  }

  /**
   * Assign NPC to slot
   * @param {number} npcId - NPC ID
   */
  assignNPC(npcId) {
    this.assignedNPC = npcId;
  }

  /**
   * Unassign NPC from slot
   */
  unassignNPC() {
    this.assignedNPC = null;
  }

  /**
   * Check if slot is occupied
   * @returns {boolean} True if occupied
   */
  isOccupied() {
    return this.assignedNPC !== null;
  }
}

class NPCAssignment {
  /**
   * Initialize NPC assignment system
   * @param {BuildingConfig} buildingConfig - Building configurations
   */
  constructor(buildingConfig) {
    if (!buildingConfig) {
      throw new Error('NPCAssignment requires BuildingConfig');
    }

    this.buildingConfig = buildingConfig;

    // Work slots by building: buildingId -> [slots]
    this.slots = new Map();

    // NPC to slot mapping: npcId -> {buildingId, slotId}
    this.npcAssignments = new Map();

    // Statistics
    this.stats = {
      totalSlots: 0,
      filledSlots: 0,
      assignments: 0
    };
  }

  /**
   * Register building with work slots
   * @param {Object} building - Building with type
   */
  registerBuilding(building) {
    const config = this.buildingConfig.getConfig(building.type);
    const slotCount = config.workSlots;

    if (slotCount === 0) {
      return; // Non-productive building
    }

    const buildingSlots = [];
    for (let i = 0; i < slotCount; i++) {
      buildingSlots.push(new BuildingSlot(i, building.id));
    }

    this.slots.set(building.id, buildingSlots);
    this.stats.totalSlots += slotCount;
  }

  /**
   * Unregister building (remove all slots)
   * @param {string} buildingId - Building to remove
   */
  unregisterBuilding(buildingId) {
    const slots = this.slots.get(buildingId);
    if (!slots) return;

    // Unassign all NPCs
    for (const slot of slots) {
      if (slot.assignedNPC) {
        this.unassignNPC(slot.assignedNPC);
      }
    }

    this.stats.totalSlots -= slots.length;
    this.slots.delete(buildingId);
  }

  /**
   * Assign NPC to building (uses first available slot)
   * @param {number} npcId - NPC to assign
   * @param {string} buildingId - Building to assign to
   * @returns {boolean} True if assigned
   */
  assignNPC(npcId, buildingId) {
    // Check if NPC already assigned
    if (this.npcAssignments.has(npcId)) {
      this.unassignNPC(npcId);
    }

    const slots = this.slots.get(buildingId);
    if (!slots) {
      return false; // Building not registered or has no slots
    }

    // Find first available slot
    for (const slot of slots) {
      if (!slot.isOccupied()) {
        slot.assignNPC(npcId);
        this.npcAssignments.set(npcId, { buildingId, slotId: slot.slotId });
        this.stats.filledSlots++;
        this.stats.assignments++;
        return true;
      }
    }

    return false; // No available slots
  }

  /**
   * Unassign NPC from current assignment
   * @param {number} npcId - NPC to unassign
   * @returns {boolean} True if was assigned
   */
  unassignNPC(npcId) {
    const assignment = this.npcAssignments.get(npcId);
    if (!assignment) {
      return false;
    }

    const slots = this.slots.get(assignment.buildingId);
    if (slots && assignment.slotId < slots.length) {
      slots[assignment.slotId].unassignNPC();
      this.stats.filledSlots--;
    }

    this.npcAssignments.delete(npcId);
    return true;
  }

  /**
   * Get NPCs assigned to building
   * @param {string} buildingId - Building ID
   * @returns {Array<number>} NPC IDs
   */
  getNPCsInBuilding(buildingId) {
    const slots = this.slots.get(buildingId);
    if (!slots) {
      return [];
    }

    const npcs = [];
    for (const slot of slots) {
      if (slot.assignedNPC !== null) {
        npcs.push(slot.assignedNPC);
      }
    }
    return npcs;
  }

  /**
   * Get assignment for NPC
   * @param {number} npcId - NPC ID
   * @returns {Object|null} Assignment {buildingId, slotId} or null
   */
  getAssignment(npcId) {
    return this.npcAssignments.get(npcId) || null;
  }

  /**
   * Get building for NPC
   * @param {number} npcId - NPC ID
   * @returns {string|null} Building ID or null
   */
  getBuildingForNPC(npcId) {
    const assignment = this.npcAssignments.get(npcId);
    return assignment ? assignment.buildingId : null;
  }

  /**
   * Get staffing level for building
   * @param {string} buildingId - Building ID
   * @returns {Object} {filled, total, percentage}
   */
  getStaffingLevel(buildingId) {
    const slots = this.slots.get(buildingId);
    if (!slots) {
      return null;
    }

    const filled = slots.filter(s => s.isOccupied()).length;
    const total = slots.length;
    const percentage = (filled / total) * 100;

    return {
      filled,
      total,
      percentage: percentage.toFixed(1)
    };
  }

  /**
   * Get buildings with unfilled slots
   * @returns {Array<Object>} Buildings with available slots
   */
  getBuildingsWithAvailableSlots() {
    const buildings = [];

    for (const [buildingId, slots] of this.slots) {
      const unfilled = slots.filter(s => !s.isOccupied()).length;
      if (unfilled > 0) {
        buildings.push({
          buildingId,
          availableSlots: unfilled,
          totalSlots: slots.length
        });
      }
    }

    return buildings;
  }

  /**
   * Balance NPC assignments across buildings
   * Redistributes NPCs to improve overall staffing
   * @param {Array<number>} npcIds - NPCs to balance
   * @returns {Object} Assignment results
   */
  balanceAssignments(npcIds) {
    const results = {
      reassigned: 0,
      failed: 0,
      total: npcIds.length
    };

    // Unassign all first
    for (const npcId of npcIds) {
      this.unassignNPC(npcId);
    }

    // Get buildings sorted by need
    const buildingsNeedingStaff = this.getBuildingsWithAvailableSlots()
      .sort((a, b) => b.availableSlots - a.availableSlots);

    // Reassign to buildings with most need
    let npcIndex = 0;
    for (const building of buildingsNeedingStaff) {
      for (let slot = 0; slot < building.availableSlots && npcIndex < npcIds.length; slot++) {
        const npcId = npcIds[npcIndex++];
        if (this.assignNPC(npcId, building.buildingId)) {
          results.reassigned++;
        } else {
          results.failed++;
        }
      }
    }

    return results;
  }

  /**
   * Get assignment statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const buildingStats = [];
    let totalFilled = 0;
    let totalSlots = 0;

    for (const [buildingId, slots] of this.slots) {
      const filled = slots.filter(s => s.isOccupied()).length;
      totalFilled += filled;
      totalSlots += slots.length;

      buildingStats.push({
        buildingId,
        filled,
        total: slots.length,
        percentage: slots.length > 0 ? (filled / slots.length * 100).toFixed(1) : '0'
      });
    }

    return {
      totalSlots: this.stats.totalSlots,
      filledSlots: this.stats.filledSlots,
      occupancy: this.stats.totalSlots > 0 ? ((this.stats.filledSlots / this.stats.totalSlots) * 100).toFixed(1) : '0',
      totalAssignments: this.stats.assignments,
      byBuilding: buildingStats
    };
  }

  /**
   * Clear all assignments (for testing)
   */
  reset() {
    this.slots.clear();
    this.npcAssignments.clear();
    this.stats = {
      totalSlots: 0,
      filledSlots: 0,
      assignments: 0
    };
  }
}

module.exports = { NPCAssignment, BuildingSlot };
