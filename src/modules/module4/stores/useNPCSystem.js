/**
 * NPC System Store - useNPCSystem
 *
 * Manages non-player character (NPC) state and operations.
 * NPCs can be assigned to buildings, patrol, and have morale/productivity.
 *
 * Key Responsibilities:
 * 1. Manage NPC creation, assignment, and deletion
 * 2. Track NPC status, morale, and productivity
 * 3. Handle NPC patrol routes
 * 4. Coordinate NPC placement with buildings
 * 5. Calculate aggregate NPC effects on town
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getNPCCapacity, getSuitableNPCRoles } from '../utils/buildingClassifier';
import { NPC_ROLES, NPC_STATUSES } from '../types/index';

/**
 * NPC System Store
 */
export const useNPCSystem = create(
  immer((set, get) => ({
    // ========================================================================
    // STATE
    // ========================================================================

    // Map of NPC ID -> NPC object
    npcs: new Map(),

    // Counter for unique NPC IDs
    nextNPCId: 1,

    // Current NPC assignments: building ID -> [NPC IDs]
    npcAssignments: new Map(),

    // Last population update time
    lastPopulationUpdate: 0,

    // ========================================================================
    // NPC CREATION AND MANAGEMENT
    // ========================================================================

    /**
     * Create a new NPC
     * @param {string} name - NPC display name
     * @param {string} role - NPC role (from NPC_ROLES)
     * @returns {Object} The created NPC
     */
    createNPC: (name, role) => {
      set((state) => {
        const npcId = `npc_${state.nextNPCId}`;
        state.nextNPCId += 1;

        const npc = {
          id: npcId,
          name,
          role,
          assignedBuildingId: null,
          patrolRoute: [],
          position: { x: 0, y: 0, z: 0 },
          status: NPC_STATUSES.IDLE,
          morale: 75,
          productivity: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        state.npcs.set(npcId, npc);
        return state;
      });

      return get().getNPC(get().nextNPCId - 1);
    },

    /**
     * Get a specific NPC
     * @param {string|number} id - NPC ID or numeric index
     * @returns {Object|null} NPC object or null
     */
    getNPC: (id) => {
      const state = get();
      if (typeof id === 'number') {
        return Array.from(state.npcs.values())[id] || null;
      }
      return state.npcs.get(id) || null;
    },

    /**
     * Get all NPCs
     * @returns {Object[]} Array of all NPCs
     */
    getAllNPCs: () => {
      return Array.from(get().npcs.values());
    },

    /**
     * Delete an NPC
     * @param {string} npcId - NPC to delete
     */
    deleteNPC: (npcId) => {
      set((state) => {
        const npc = state.npcs.get(npcId);
        if (npc && npc.assignedBuildingId) {
          const assignments = state.npcAssignments.get(npc.assignedBuildingId) || [];
          state.npcAssignments.set(
            npc.assignedBuildingId,
            assignments.filter((id) => id !== npcId)
          );
        }
        state.npcs.delete(npcId);
        return state;
      });
    },

    // ========================================================================
    // NPC ASSIGNMENT TO BUILDINGS
    // ========================================================================

    /**
     * Assign an NPC to a building
     * @param {string} npcId - NPC to assign
     * @param {string} buildingId - Building to assign to
     * @param {string} buildingType - Building type for validation
     * @returns {Object} Result { success: boolean, error?: string }
     */
    assignNPCToBuilding: (npcId, buildingId, buildingType) => {
      const npc = get().npcs.get(npcId);
      if (!npc) {
        return { success: false, error: 'NPC not found' };
      }

      // Check if building type can have this NPC role
      const suitableRoles = getSuitableNPCRoles(buildingType);
      if (!suitableRoles.includes(npc.role)) {
        return { success: false, error: `${npc.role} cannot work in ${buildingType}` };
      }

      // Check capacity
      const capacity = getNPCCapacity(buildingType);
      const currentAssignments = get().npcAssignments.get(buildingId) || [];
      if (currentAssignments.length >= capacity) {
        return { success: false, error: `Building is at capacity (${capacity})` };
      }

      set((state) => {
        const npcToAssign = state.npcs.get(npcId);
        if (npcToAssign) {
          // Remove from previous assignment if any
          if (npcToAssign.assignedBuildingId) {
            const prevAssignments = state.npcAssignments.get(npcToAssign.assignedBuildingId) || [];
            state.npcAssignments.set(
              npcToAssign.assignedBuildingId,
              prevAssignments.filter((id) => id !== npcId)
            );
          }

          // Assign to new building
          npcToAssign.assignedBuildingId = buildingId;
          npcToAssign.status = NPC_STATUSES.WORKING;

          const assignments = state.npcAssignments.get(buildingId) || [];
          assignments.push(npcId);
          state.npcAssignments.set(buildingId, assignments);
        }
        return state;
      });

      return { success: true };
    },

    /**
     * Unassign an NPC from its building
     * @param {string} npcId - NPC to unassign
     */
    unassignNPC: (npcId) => {
      set((state) => {
        const npc = state.npcs.get(npcId);
        if (npc && npc.assignedBuildingId) {
          const assignments = state.npcAssignments.get(npc.assignedBuildingId) || [];
          state.npcAssignments.set(
            npc.assignedBuildingId,
            assignments.filter((id) => id !== npcId)
          );
          npc.assignedBuildingId = null;
          npc.status = NPC_STATUSES.IDLE;
        }
        return state;
      });
    },

    /**
     * Get NPCs assigned to a building
     * @param {string} buildingId - Building to query
     * @returns {Object[]} Array of NPC objects
     */
    getNPCsInBuilding: (buildingId) => {
      const state = get();
      const assignments = state.npcAssignments.get(buildingId) || [];
      return assignments.map((npcId) => state.npcs.get(npcId)).filter(Boolean);
    },

    /**
     * Get assignment count for a building
     * @param {string} buildingId - Building to query
     * @returns {number} Number of NPCs assigned
     */
    getNPCCountInBuilding: (buildingId) => {
      const state = get();
      const assignments = state.npcAssignments.get(buildingId) || [];
      return assignments.length;
    },

    /**
     * Check if an NPC is assigned
     * @param {string} npcId - NPC to check
     * @returns {boolean} True if assigned
     */
    isNPCAssigned: (npcId) => {
      const npc = get().npcs.get(npcId);
      return npc ? npc.assignedBuildingId !== null : false;
    },

    // ========================================================================
    // NPC STATUS AND MORALE
    // ========================================================================

    /**
     * Update NPC status
     * @param {string} npcId - NPC to update
     * @param {string} status - New status (from NPC_STATUSES)
     */
    updateNPCStatus: (npcId, status) => {
      set((state) => {
        const npc = state.npcs.get(npcId);
        if (npc) {
          npc.status = status;
          npc.updatedAt = Date.now();
        }
        return state;
      });
    },

    /**
     * Update NPC morale
     * @param {string} npcId - NPC to update
     * @param {number} morale - New morale value (0-100)
     */
    updateNPCMorale: (npcId, morale) => {
      set((state) => {
        const npc = state.npcs.get(npcId);
        if (npc) {
          npc.morale = Math.min(100, Math.max(0, morale));
          npc.updatedAt = Date.now();
        }
        return state;
      });
    },

    /**
     * Adjust NPC morale by amount
     * @param {string} npcId - NPC to adjust
     * @param {number} delta - Amount to adjust by
     */
    adjustNPCMorale: (npcId, delta) => {
      set((state) => {
        const npc = state.npcs.get(npcId);
        if (npc) {
          npc.morale = Math.min(100, Math.max(0, npc.morale + delta));
          npc.updatedAt = Date.now();
        }
        return state;
      });
    },

    /**
     * Update NPC productivity multiplier
     * @param {string} npcId - NPC to update
     * @param {number} productivity - New productivity multiplier
     */
    updateNPCProductivity: (npcId, productivity) => {
      set((state) => {
        const npc = state.npcs.get(npcId);
        if (npc) {
          npc.productivity = Math.max(0, productivity);
          npc.updatedAt = Date.now();
        }
        return state;
      });
    },

    /**
     * Get average morale of all NPCs
     * @returns {number} Average morale (0-100)
     */
    getAverageMorale: () => {
      const npcs = get().getAllNPCs();
      if (npcs.length === 0) return 100;
      const totalMorale = npcs.reduce((sum, npc) => sum + npc.morale, 0);
      return Math.round(totalMorale / npcs.length);
    },

    // ========================================================================
    // NPC PATROLS
    // ========================================================================

    /**
     * Set patrol route for an NPC
     * @param {string} npcId - NPC to set route for
     * @param {string[]} buildingIds - Array of building IDs to patrol
     */
    setPatrolRoute: (npcId, buildingIds) => {
      set((state) => {
        const npc = state.npcs.get(npcId);
        if (npc) {
          npc.patrolRoute = [...buildingIds];
          npc.status = NPC_STATUSES.PATROLLING;
        }
        return state;
      });
    },

    /**
     * Get patrol route for an NPC
     * @param {string} npcId - NPC to query
     * @returns {string[]} Array of building IDs
     */
    getPatrolRoute: (npcId) => {
      const npc = get().npcs.get(npcId);
      return npc ? npc.patrolRoute : [];
    },

    /**
     * Clear patrol route
     * @param {string} npcId - NPC to clear
     */
    clearPatrolRoute: (npcId) => {
      set((state) => {
        const npc = state.npcs.get(npcId);
        if (npc) {
          npc.patrolRoute = [];
          npc.status = NPC_STATUSES.IDLE;
        }
        return state;
      });
    },

    // ========================================================================
    // NPC STATISTICS
    // ========================================================================

    /**
     * Get NPC count by role
     * @returns {Object} Count of NPCs by role
     */
    getNPCCountByRole: () => {
      const npcs = get().getAllNPCs();
      const counts = {};
      for (const role of Object.values(NPC_ROLES)) {
        counts[role] = 0;
      }
      for (const npc of npcs) {
        counts[npc.role] = (counts[npc.role] || 0) + 1;
      }
      return counts;
    },

    /**
     * Get NPC count by status
     * @returns {Object} Count of NPCs by status
     */
    getNPCCountByStatus: () => {
      const npcs = get().getAllNPCs();
      const counts = {};
      for (const status of Object.values(NPC_STATUSES)) {
        counts[status] = 0;
      }
      for (const npc of npcs) {
        counts[npc.status] = (counts[npc.status] || 0) + 1;
      }
      return counts;
    },

    /**
     * Get total population
     * @returns {number} Total NPC count
     */
    getTotalPopulation: () => {
      return get().npcs.size;
    },

    /**
     * Get unassigned NPCs
     * @returns {Object[]} Array of unassigned NPCs
     */
    getUnassignedNPCs: () => {
      return get().getAllNPCs().filter((npc) => !npc.assignedBuildingId);
    },

    // ========================================================================
    // PERSISTENCE
    // ========================================================================

    /**
     * Get state for saving
     * @returns {Object} Serializable state
     */
    getState: () => {
      const state = get();
      return {
        npcs: Array.from(state.npcs.values()),
        npcAssignments: Array.from(state.npcAssignments.entries()),
        nextNPCId: state.nextNPCId,
      };
    },

    /**
     * Load state from saved data
     * @param {Object} savedState - Saved state object
     */
    loadState: (savedState) => {
      set((state) => {
        state.npcs = new Map(
          savedState.npcs.map((n) => [n.id, n])
        );
        state.npcAssignments = new Map(savedState.npcAssignments);
        state.nextNPCId = savedState.nextNPCId;
        return state;
      });
    },

    /**
     * Clear all NPCs
     */
    reset: () => {
      set((state) => {
        state.npcs = new Map();
        state.npcAssignments = new Map();
        state.nextNPCId = 1;
        state.lastPopulationUpdate = 0;
        return state;
      });
    },

    /**
     * Clean up all NPC references to a deleted building.
     * Called when Foundation removes a building to prevent orphaned NPC assignments.
     *
     * @param {string} buildingId - The building ID being deleted
     */
    cleanupDeletedBuilding: (buildingId) => {
      set((state) => {
        // Unassign all NPCs from this building
        Array.from(state.npcs.values()).forEach((npc) => {
          if (npc.assignedBuildingId === buildingId) {
            npc.assignedBuildingId = null;
            npc.assignedRole = null;
          }

          // Remove from patrol route if present
          if (npc.patrolRoute && npc.patrolRoute.includes(buildingId)) {
            npc.patrolRoute = npc.patrolRoute.filter(id => id !== buildingId);
          }
        });

        // Remove from NPC assignments tracking
        state.npcAssignments.delete(buildingId);

        return state;
      });
    },
  }))
);
