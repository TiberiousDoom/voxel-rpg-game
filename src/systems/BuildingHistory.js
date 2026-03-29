/**
 * BuildingHistory.js
 * Undo/redo system for building placement
 */

class BuildingHistory {
  constructor(maxHistory = 20) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = maxHistory;
  }

  /**
   * Record a building placement
   * @param {Object} building - The placed building data
   * @param {Object} costs - Resources spent on this building
   */
  recordPlacement(building, costs = {}) {
    this.undoStack.push({
      type: 'PLACE',
      building: { ...building },
      costs: { ...costs },
      timestamp: Date.now(),
    });

    // Clear redo stack on new action
    this.redoStack = [];

    // Enforce max history
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo the last building placement
   * @returns {Object|null} { building, costs } to remove and refund, or null
   */
  undo() {
    if (this.undoStack.length === 0) return null;

    const action = this.undoStack.pop();
    this.redoStack.push(action);

    return {
      building: action.building,
      costs: action.costs,
    };
  }

  /**
   * Redo a previously undone placement
   * @returns {Object|null} { building, costs } to re-place and re-deduct, or null
   */
  redo() {
    if (this.redoStack.length === 0) return null;

    const action = this.redoStack.pop();
    this.undoStack.push(action);

    return {
      building: action.building,
      costs: action.costs,
    };
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get the description of what would be undone
   * @returns {string|null}
   */
  getUndoDescription() {
    if (this.undoStack.length === 0) return null;
    const action = this.undoStack[this.undoStack.length - 1];
    return `Remove ${action.building.type || 'building'}`;
  }

  /**
   * Get the description of what would be redone
   * @returns {string|null}
   */
  getRedoDescription() {
    if (this.redoStack.length === 0) return null;
    const action = this.redoStack[this.redoStack.length - 1];
    return `Re-place ${action.building.type || 'building'}`;
  }

  /**
   * Clear all history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// Singleton
const buildingHistory = new BuildingHistory();
export default buildingHistory;
