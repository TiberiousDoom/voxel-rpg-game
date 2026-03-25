/**
 * HousingManager.js — Tracks bed/housing slots and NPC assignments.
 *
 * Buildings with housing capacity (Shelter: 1, House: 2) register here.
 * NPCs are auto-assigned on immigration. Homeless NPCs get a happiness penalty.
 */

import {
  HOUSING_HOMELESS_HAPPINESS_PENALTY,
} from '../../data/tuning';

class HousingManager {
  constructor() {
    /** @type {Map<string, {capacity: number, occupants: Set<string>}>} */
    this.buildings = new Map();
    /** @type {Map<string, string>} npcId → buildingId */
    this.assignments = new Map();
  }

  /**
   * Register a building that provides housing.
   * @param {string} buildingId
   * @param {number} capacity - Number of NPCs it can house
   */
  registerBuilding(buildingId, capacity) {
    if (this.buildings.has(buildingId)) return;
    this.buildings.set(buildingId, {
      capacity,
      occupants: new Set(),
    });
  }

  /**
   * Remove a building (e.g., destroyed). Evicts occupants.
   * @param {string} buildingId
   */
  removeBuilding(buildingId) {
    const building = this.buildings.get(buildingId);
    if (!building) return;
    for (const npcId of building.occupants) {
      this.assignments.delete(npcId);
    }
    this.buildings.delete(buildingId);
  }

  /**
   * Auto-assign an NPC to the first building with available space.
   * @param {string} npcId
   * @returns {boolean} Whether assignment succeeded
   */
  assignNPC(npcId) {
    if (this.assignments.has(npcId)) return true; // already assigned

    for (const [buildingId, building] of this.buildings) {
      if (building.occupants.size < building.capacity) {
        building.occupants.add(npcId);
        this.assignments.set(npcId, buildingId);
        return true;
      }
    }
    return false; // no space
  }

  /**
   * Unassign an NPC from their housing (e.g., NPC left settlement).
   * @param {string} npcId
   */
  unassignNPC(npcId) {
    const buildingId = this.assignments.get(npcId);
    if (buildingId) {
      const building = this.buildings.get(buildingId);
      if (building) {
        building.occupants.delete(npcId);
      }
      this.assignments.delete(npcId);
    }
  }

  /**
   * Get the building ID an NPC is assigned to.
   * @param {string} npcId
   * @returns {string|null}
   */
  getAssignment(npcId) {
    return this.assignments.get(npcId) || null;
  }

  /**
   * Get occupancy info for a building.
   * @param {string} buildingId
   * @returns {{capacity: number, occupied: number, occupants: string[]}|null}
   */
  getOccupancy(buildingId) {
    const building = this.buildings.get(buildingId);
    if (!building) return null;
    return {
      capacity: building.capacity,
      occupied: building.occupants.size,
      occupants: Array.from(building.occupants),
    };
  }

  getTotalCapacity() {
    let total = 0;
    for (const b of this.buildings.values()) {
      total += b.capacity;
    }
    return total;
  }

  getTotalOccupied() {
    return this.assignments.size;
  }

  /**
   * Get happiness penalty for an NPC (0 if housed, negative if homeless).
   * @param {string} npcId
   * @returns {number}
   */
  getHappinessPenalty(npcId) {
    if (this.assignments.has(npcId)) return 0;
    return HOUSING_HOMELESS_HAPPINESS_PENALTY || -20;
  }

  /**
   * Get count of NPCs without housing.
   * @param {number} totalNPCCount
   * @returns {number}
   */
  getHomelessCount(totalNPCCount) {
    return Math.max(0, totalNPCCount - this.getTotalCapacity());
  }

  serialize() {
    const buildings = [];
    for (const [id, b] of this.buildings) {
      buildings.push({ id, capacity: b.capacity, occupants: Array.from(b.occupants) });
    }
    return { buildings, assignments: Array.from(this.assignments.entries()) };
  }

  deserialize(state) {
    if (!state) return;
    this.buildings.clear();
    this.assignments.clear();
    if (state.buildings) {
      for (const b of state.buildings) {
        this.buildings.set(b.id, {
          capacity: b.capacity,
          occupants: new Set(b.occupants || []),
        });
      }
    }
    if (state.assignments) {
      for (const [npcId, buildingId] of state.assignments) {
        this.assignments.set(npcId, buildingId);
      }
    }
  }
}

export default HousingManager;
