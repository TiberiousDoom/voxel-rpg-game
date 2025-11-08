/**
 * Foundation Store - useFoundationStore
 *
 * This is the authoritative source of truth for all building placements
 * and their properties. This store is the single point of state management
 * for the Foundation Module.
 *
 * Key Responsibilities:
 * 1. Maintain the registry of all buildings in the world
 * 2. Provide query methods for other modules to check building positions
 * 3. Handle building creation, updates, and deletion
 * 4. Manage building state transitions (blueprint -> building -> complete)
 * 5. Provide persistence interface for save/load
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { BUILDING_STATUS, SAVE_VERSION } from '../../../shared/config';
import { SpatialHash } from '../utils/spatialHash';

// Initialize spatial hash for efficient collision queries
const spatialHash = new SpatialHash(5); // 5-unit cells for spatial hashing

/**
 * Foundation Store
 * Manages all building placements, properties, and state
 */
export const useFoundationStore = create(
  immer((set, get) => ({
    // ========================================================================
    // STATE
    // ========================================================================

    // Map of building ID -> building object
    // Each building contains: id, type, position, rotation, status, properties
    buildings: new Map(),

    // Counter to generate unique building IDs
    nextBuildingId: 1,

    // Track which buildings are being edited/selected
    selectedBuildingId: null,

    // Building mode state (true when player is placing buildings)
    buildingModeActive: false,

    // ========================================================================
    // BUILDING CREATION AND DELETION
    // ========================================================================

    /**
     * Create a new building and add it to the world.
     *
     * This is called by the placement system after validation passes.
     * It creates the building registry entry and initializes all properties.
     *
     * @param {string} type - The building type (from BUILDING_TYPES constant)
     * @param {Object} position - { x, y, z } world position
     * @param {number} rotation - Rotation in degrees
     * @param {Object} properties - Additional properties (optional)
     * @returns {Object} The created building object with full properties
     */
    addBuilding: (type, position, rotation, properties = {}) => {
      set((state) => {
        const buildingId = `building_${state.nextBuildingId}`;
        state.nextBuildingId += 1;

        const building = {
          id: buildingId,
          type,
          position: { ...position },
          rotation,
          status: BUILDING_STATUS.BLUEPRINT,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          hp: 100,
          maxHp: 100,
          buildProgress: 0,
          properties: {
            ...properties,
          },
        };

        state.buildings.set(buildingId, building);
        spatialHash.insert(buildingId, position);

        return state;
      });

      // Return the created building
      return get().getBuilding(get().nextBuildingId - 1);
    },

    /**
     * Remove a building from the world.
     *
     * This is called when a building is destroyed or demolished.
     * It removes the registry entry and updates spatial hash.
     *
     * @param {string} buildingId - The building to remove
     * @returns {boolean} True if building was removed, false if not found
     */
    removeBuilding: (buildingId) => {
      set((state) => {
        const building = state.buildings.get(buildingId);
        if (!building) return state;

        state.buildings.delete(buildingId);
        spatialHash.remove(buildingId, building.position);

        if (state.selectedBuildingId === buildingId) {
          state.selectedBuildingId = null;
        }

        return state;
      });

      return !get().buildings.has(buildingId);
    },

    /**
     * Update a building's properties.
     *
     * This is used when a building's state changes (progress, damage, etc).
     * Immutably updates the building record.
     *
     * @param {string} buildingId - The building to update
     * @param {Object} updates - Properties to update
     * @returns {Object} The updated building, or null if not found
     */
    updateBuilding: (buildingId, updates) => {
      set((state) => {
        const building = state.buildings.get(buildingId);
        if (!building) return state;

        building.updatedAt = Date.now();
        Object.assign(building, updates);

        return state;
      });

      return get().getBuilding(buildingId);
    },

    /**
     * Update a building's position and rotation.
     *
     * This is used when a building moves or rotates.
     * Updates the spatial hash accordingly.
     *
     * @param {string} buildingId - The building to move
     * @param {Object} newPosition - New { x, y, z } position
     * @param {number} newRotation - New rotation in degrees
     * @returns {boolean} True if successful, false if building not found
     */
    moveBuilding: (buildingId, newPosition, newRotation) => {
      set((state) => {
        const building = state.buildings.get(buildingId);
        if (!building) return state;

        // Update spatial hash
        spatialHash.remove(buildingId, building.position);
        spatialHash.insert(buildingId, newPosition);

        // Update building
        building.position = { ...newPosition };
        building.rotation = newRotation;
        building.updatedAt = Date.now();

        return state;
      });

      return get().getBuilding(buildingId) !== null;
    },

    // ========================================================================
    // BUILDING QUERIES AND LOOKUPS
    // ========================================================================

    /**
     * Get a single building by its ID.
     *
     * @param {string} buildingId - The building ID
     * @returns {Object} The building object, or null if not found
     */
    getBuilding: (buildingId) => {
      return get().buildings.get(buildingId) || null;
    },

    /**
     * Get all buildings in the world.
     *
     * @returns {Array} Array of all building objects
     */
    getAllBuildings: () => {
      return Array.from(get().buildings.values());
    },

    /**
     * Get all buildings of a specific type.
     *
     * Called by other modules to find buildings that match certain criteria.
     * For example, Resource Economy might ask for all STORAGE_BUILDINGs.
     *
     * @param {string} buildingType - The type to filter by
     * @returns {Array} Array of matching buildings
     */
    getBuildingsByType: (buildingType) => {
      return Array.from(get().buildings.values()).filter(
        (b) => b.type === buildingType
      );
    },

    /**
     * Get all buildings with a specific status.
     *
     * Used to query buildings in different construction phases.
     *
     * @param {string} status - The status to filter by
     * @returns {Array} Array of buildings with that status
     */
    getBuildingsByStatus: (status) => {
      return Array.from(get().buildings.values()).filter(
        (b) => b.status === status
      );
    },

    /**
     * Get all buildings within a radius of a position.
     *
     * Uses spatial hash for efficient lookup.
     * Called by Territory and Town Planning when checking area constraints.
     *
     * @param {Object} position - { x, y, z } center point
     * @param {number} radius - Search radius in world units
     * @returns {Array} Buildings within radius
     */
    getBuildingsInRadius: (position, radius) => {
      const buildingIds = spatialHash.queryRadius(position, radius);
      return buildingIds
        .map((id) => get().buildings.get(id))
        .filter(Boolean);
    },

    /**
     * Get the building at a specific grid position (if any).
     *
     * This is the core query method: "What's at this position?"
     * Used by Town Planning to check occupancy before placing NPCs.
     *
     * @param {Object} position - { x, y, z } grid position
     * @param {number} tolerance - Distance tolerance (default 0.1)
     * @returns {Object} The building at that position, or null
     */
    getBuildingAtPosition: (position, tolerance = 0.1) => {
      const buildings = get().getAllBuildings();
      return buildings.find((b) => {
        const dx = Math.abs(b.position.x - position.x);
        const dy = Math.abs(b.position.y - position.y);
        const dz = Math.abs(b.position.z - position.z);
        return dx <= tolerance && dy <= tolerance && dz <= tolerance;
      });
    },

    /**
     * Count total buildings in the world.
     *
     * @returns {number} Total number of buildings
     */
    getBuildingCount: () => {
      return get().buildings.size;
    },

    /**
     * Check if a building exists.
     *
     * @param {string} buildingId - The building ID to check
     * @returns {boolean} True if building exists
     */
    hasBuilding: (buildingId) => {
      return get().buildings.has(buildingId);
    },

    // ========================================================================
    // BUILDING STATE MANAGEMENT
    // ========================================================================

    /**
     * Transition a building from one status to another.
     *
     * Called by the building construction system when progress completes.
     * Updates the building status and any related properties.
     *
     * @param {string} buildingId - The building to transition
     * @param {string} newStatus - New status (from BUILDING_STATUS)
     * @returns {boolean} True if transition succeeded
     */
    transitionBuildingStatus: (buildingId, newStatus) => {
      const building = get().getBuilding(buildingId);
      if (!building) return false;

      get().updateBuilding(buildingId, {
        status: newStatus,
        buildProgress: newStatus === BUILDING_STATUS.COMPLETE ? 100 : undefined,
      });

      return true;
    },

    /**
     * Update building construction progress.
     *
     * Called continuously during construction to update progress percentage.
     *
     * @param {string} buildingId - The building being constructed
     * @param {number} progress - Progress 0-100
     * @returns {boolean} True if updated, false if not found
     */
    updateBuildProgress: (buildingId, progress) => {
      const building = get().getBuilding(buildingId);
      if (!building) return false;

      get().updateBuilding(buildingId, {
        buildProgress: Math.min(100, Math.max(0, progress)),
      });

      return true;
    },

    /**
     * Apply damage to a building.
     *
     * Reduces HP and transitions to DAMAGED status if applicable.
     *
     * @param {string} buildingId - The building to damage
     * @param {number} amount - Damage amount
     * @returns {Object} The updated building, or null if not found
     */
    damageBuilding: (buildingId, amount) => {
      const building = get().getBuilding(buildingId);
      if (!building) return null;

      const newHp = Math.max(0, building.hp - amount);
      const newStatus =
        newHp === 0 ? BUILDING_STATUS.DESTROYED : BUILDING_STATUS.DAMAGED;

      get().updateBuilding(buildingId, {
        hp: newHp,
        status: newStatus,
      });

      return get().getBuilding(buildingId);
    },

    /**
     * Repair a building.
     *
     * Increases HP and transitions from DAMAGED back to COMPLETE if fully healed.
     *
     * @param {string} buildingId - The building to repair
     * @param {number} amount - Repair amount
     * @returns {Object} The updated building, or null if not found
     */
    repairBuilding: (buildingId, amount) => {
      const building = get().getBuilding(buildingId);
      if (!building) return null;

      const newHp = Math.min(building.maxHp, building.hp + amount);
      const newStatus =
        newHp === building.maxHp ? BUILDING_STATUS.COMPLETE : BUILDING_STATUS.DAMAGED;

      get().updateBuilding(buildingId, {
        hp: newHp,
        status: newStatus,
      });

      return get().getBuilding(buildingId);
    },

    // ========================================================================
    // BUILDING MODE (UI STATE)
    // ========================================================================

    /**
     * Enter building mode.
     *
     * Activates the building placement system and UI.
     */
    enterBuildingMode: () => {
      set((state) => {
        state.buildingModeActive = true;
        return state;
      });
    },

    /**
     * Exit building mode.
     *
     * Deactivates the building placement system and UI.
     */
    exitBuildingMode: () => {
      set((state) => {
        state.buildingModeActive = false;
        state.selectedBuildingId = null;
        return state;
      });
    },

    /**
     * Select a building for editing/interaction.
     *
     * @param {string} buildingId - The building to select (or null to deselect)
     */
    selectBuilding: (buildingId) => {
      set((state) => {
        state.selectedBuildingId = buildingId;
        return state;
      });
    },

    /**
     * Get the currently selected building.
     *
     * @returns {Object} The selected building, or null
     */
    getSelectedBuilding: () => {
      const selectedId = get().selectedBuildingId;
      return selectedId ? get().getBuilding(selectedId) : null;
    },

    // ========================================================================
    // PERSISTENCE (SAVE/LOAD)
    // ========================================================================

    /**
     * Serialize all buildings for saving.
     *
     * Converts the buildings map to a plain object format suitable for JSON.
     *
     * @returns {Object} Serialized building data
     */
    serializeBuildings: () => {
      const buildingsArray = Array.from(get().buildings.values()).map((b) => ({
        ...b,
        properties: { ...b.properties },
      }));

      return {
        version: SAVE_VERSION,
        nextBuildingId: get().nextBuildingId,
        buildings: buildingsArray,
      };
    },

    /**
     * Deserialize buildings from a saved state.
     *
     * Reconstructs the buildings map from saved data.
     * Called when loading a game.
     *
     * @param {Object} data - Serialized building data
     * @returns {boolean} True if load succeeded
     */
    deserializeBuildings: (data) => {
      if (!data || data.version !== SAVE_VERSION) {
        console.warn(
          'Foundation: Incompatible save version. Starting fresh.'
        );
        return false;
      }

      set((state) => {
        state.buildings.clear();
        state.nextBuildingId = data.nextBuildingId || 1;

        // Reconstruct spatial hash and buildings map
        data.buildings.forEach((buildingData) => {
          const building = {
            ...buildingData,
            position: { ...buildingData.position },
            properties: { ...buildingData.properties },
          };
          state.buildings.set(building.id, building);
          spatialHash.insert(building.id, building.position);
        });

        return state;
      });

      return true;
    },

    /**
     * Clear all buildings.
     *
     * Used when starting a new game or clearing the world.
     */
    clearAllBuildings: () => {
      set((state) => {
        state.buildings.clear();
        state.nextBuildingId = 1;
        state.selectedBuildingId = null;
        return state;
      });

      spatialHash.clear();
    },

    // ========================================================================
    // SPATIAL HASH MANAGEMENT (INTERNAL)
    // ========================================================================

    /**
     * Rebuild the spatial hash (for optimization or after loading).
     *
     * Reconstructs the spatial hash from the current building positions.
     */
    rebuildSpatialHash: () => {
      spatialHash.clear();
      get().getAllBuildings().forEach((building) => {
        spatialHash.insert(building.id, building.position);
      });
    },
  }))
);
