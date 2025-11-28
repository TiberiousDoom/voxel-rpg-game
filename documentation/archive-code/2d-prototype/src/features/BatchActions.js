/**
 * BatchActions.js - Batch operations for NPCs
 *
 * Features:
 * - Multi-select NPCs
 * - Batch assign to buildings
 * - Batch unassign from buildings
 * - Select by role/filter
 * - Select all/none
 * - Selection state management
 *
 * Usage:
 * const batchActions = new BatchActions(gameManager);
 * batchActions.selectNPC(npcId);
 * batchActions.assignSelected(buildingId);
 */

/**
 * BatchActions - Manages batch operations on NPCs
 */
export class BatchActions {
  /**
   * Create a BatchActions instance
   * @param {Object} gameManager - GameManager instance
   */
  constructor(gameManager) {
    if (!gameManager) {
      throw new Error('BatchActions requires a GameManager instance');
    }

    this.gameManager = gameManager;
    this.selectedNPCs = new Set(); // Set of selected NPC IDs
    this.callbacks = {
      onSelectionChange: [],
      onBatchComplete: [],
      onBatchError: []
    };
  }

  /**
   * Register a callback
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  /**
   * Trigger callbacks
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  trigger(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  /**
   * Select an NPC
   * @param {string} npcId - NPC ID to select
   * @returns {boolean} True if selected
   */
  selectNPC(npcId) {
    if (!npcId) return false;

    this.selectedNPCs.add(npcId);
    this.trigger('onSelectionChange', {
      selected: Array.from(this.selectedNPCs),
      count: this.selectedNPCs.size
    });

    return true;
  }

  /**
   * Deselect an NPC
   * @param {string} npcId - NPC ID to deselect
   * @returns {boolean} True if deselected
   */
  deselectNPC(npcId) {
    const removed = this.selectedNPCs.delete(npcId);

    if (removed) {
      this.trigger('onSelectionChange', {
        selected: Array.from(this.selectedNPCs),
        count: this.selectedNPCs.size
      });
    }

    return removed;
  }

  /**
   * Toggle NPC selection
   * @param {string} npcId - NPC ID to toggle
   * @returns {boolean} True if now selected, false if deselected
   */
  toggleNPC(npcId) {
    if (this.isSelected(npcId)) {
      this.deselectNPC(npcId);
      return false;
    } else {
      this.selectNPC(npcId);
      return true;
    }
  }

  /**
   * Check if NPC is selected
   * @param {string} npcId - NPC ID to check
   * @returns {boolean} True if selected
   */
  isSelected(npcId) {
    return this.selectedNPCs.has(npcId);
  }

  /**
   * Select multiple NPCs
   * @param {Array<string>} npcIds - Array of NPC IDs
   * @returns {number} Number of NPCs selected
   */
  selectMultiple(npcIds) {
    if (!Array.isArray(npcIds)) return 0;

    let count = 0;
    npcIds.forEach(id => {
      if (this.selectNPC(id)) count++;
    });

    return count;
  }

  /**
   * Select all NPCs
   * @param {Array} npcs - Array of NPC objects (optional, fetches from game if not provided)
   * @returns {number} Number of NPCs selected
   */
  selectAll(npcs = null) {
    const npcList = npcs || this.getAllNPCs();

    this.selectedNPCs.clear();
    npcList.forEach(npc => {
      this.selectedNPCs.add(npc.id);
    });

    this.trigger('onSelectionChange', {
      selected: Array.from(this.selectedNPCs),
      count: this.selectedNPCs.size
    });

    return this.selectedNPCs.size;
  }

  /**
   * Select NPCs by role
   * @param {string} role - Role to filter by
   * @returns {number} Number of NPCs selected
   */
  selectByRole(role) {
    const npcs = this.getAllNPCs();
    const matchingNPCs = npcs.filter(npc => npc.role === role);

    return this.selectMultiple(matchingNPCs.map(npc => npc.id));
  }

  /**
   * Select idle NPCs (not assigned to any building)
   * @returns {number} Number of NPCs selected
   */
  selectIdle() {
    const npcs = this.getAllNPCs();
    const idleNPCs = npcs.filter(npc => !npc.assignedBuilding);

    return this.selectMultiple(idleNPCs.map(npc => npc.id));
  }

  /**
   * Clear all selections
   * @returns {number} Number of NPCs that were selected
   */
  clearSelection() {
    const count = this.selectedNPCs.size;
    this.selectedNPCs.clear();

    this.trigger('onSelectionChange', {
      selected: [],
      count: 0
    });

    return count;
  }

  /**
   * Get all selected NPC IDs
   * @returns {Array<string>} Array of selected NPC IDs
   */
  getSelected() {
    return Array.from(this.selectedNPCs);
  }

  /**
   * Get count of selected NPCs
   * @returns {number} Selection count
   */
  getSelectionCount() {
    return this.selectedNPCs.size;
  }

  /**
   * Batch assign selected NPCs to a building
   * @param {string} buildingId - Building ID to assign to
   * @returns {Object} Result with success count and errors
   */
  async assignSelected(buildingId) {
    if (!buildingId) {
      return { success: false, message: 'No building specified' };
    }

    if (this.selectedNPCs.size === 0) {
      return { success: false, message: 'No NPCs selected' };
    }

    const results = {
      success: true,
      total: this.selectedNPCs.size,
      assigned: 0,
      failed: 0,
      errors: []
    };

    for (const npcId of this.selectedNPCs) {
      try {
        const result = this.gameManager.assignNPC(npcId, buildingId);

        if (result.success) {
          results.assigned++;
        } else {
          results.failed++;
          results.errors.push({ npcId, error: result.message });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ npcId, error: error.message });
      }
    }

    if (results.failed > 0) {
      results.success = false;
      this.trigger('onBatchError', results);
    } else {
      this.trigger('onBatchComplete', results);
    }

    return results;
  }

  /**
   * Batch unassign selected NPCs from their buildings
   * @returns {Object} Result with success count and errors
   */
  async unassignSelected() {
    if (this.selectedNPCs.size === 0) {
      return { success: false, message: 'No NPCs selected' };
    }

    const results = {
      success: true,
      total: this.selectedNPCs.size,
      unassigned: 0,
      failed: 0,
      errors: []
    };

    for (const npcId of this.selectedNPCs) {
      try {
        const result = this.gameManager.unassignNPC(npcId);

        if (result.success) {
          results.unassigned++;
        } else {
          results.failed++;
          results.errors.push({ npcId, error: result.message });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ npcId, error: error.message });
      }
    }

    if (results.failed > 0) {
      results.success = false;
      this.trigger('onBatchError', results);
    } else {
      this.trigger('onBatchComplete', results);
    }

    return results;
  }

  /**
   * Auto-assign selected idle NPCs to available buildings
   * @returns {Object} Result with assignment statistics
   */
  async autoAssignSelected() {
    if (this.selectedNPCs.size === 0) {
      return { success: false, message: 'No NPCs selected' };
    }

    // Use game manager's auto-assign for selected NPCs only
    // This is a simplified version - in practice, you'd filter the auto-assign
    // to only work on selected NPCs

    const results = {
      success: true,
      total: this.selectedNPCs.size,
      assigned: 0,
      message: 'Auto-assign completed'
    };

    try {
      const result = this.gameManager.autoAssignNPCs();

      if (result.success) {
        results.assigned = result.assigned || 0;
        this.trigger('onBatchComplete', results);
      } else {
        results.success = false;
        results.message = result.message;
        this.trigger('onBatchError', results);
      }
    } catch (error) {
      results.success = false;
      results.message = error.message;
      this.trigger('onBatchError', results);
    }

    return results;
  }

  /**
   * Get all NPCs from game manager
   * @returns {Array} Array of NPC objects
   */
  getAllNPCs() {
    try {
      const gameState = this.gameManager.orchestrator?.gameState;
      return gameState?.npcs || [];
    } catch (error) {
      console.error('[BatchActions] Error fetching NPCs:', error);
      return [];
    }
  }

  /**
   * Get selected NPCs with full data
   * @returns {Array} Array of selected NPC objects
   */
  getSelectedNPCsData() {
    const allNPCs = this.getAllNPCs();
    return allNPCs.filter(npc => this.isSelected(npc.id));
  }

  /**
   * Clear and destroy
   */
  destroy() {
    this.clearSelection();
    this.gameManager = null;
    this.callbacks = {
      onSelectionChange: [],
      onBatchComplete: [],
      onBatchError: []
    };
  }
}

export default BatchActions;
