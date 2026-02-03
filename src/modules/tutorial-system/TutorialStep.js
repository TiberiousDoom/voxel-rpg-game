/**
 * TutorialStep - Represents a single step in the tutorial flow
 *
 * Each step defines:
 * - What to display (title, message)
 * - What to highlight in UI
 * - What action completes the step
 * - Whether to block other inputs
 */

class TutorialStep {
  /**
   * @param {Object} config - Step configuration
   * @param {string} config.id - Unique step identifier
   * @param {string} config.title - Step title
   * @param {string} config.message - Instruction text
   * @param {string|null} config.highlightElement - CSS selector to highlight
   * @param {boolean} config.blockInput - Whether to block other inputs
   * @param {Object} config.completionCondition - What advances to next step
   * @param {string} config.completionCondition.type - Type of completion condition
   * @param {any} config.completionCondition.target - Target value for completion
   * @param {Function|null} config.onStart - Called when step starts
   * @param {Function|null} config.onComplete - Called when step completes
   */
  constructor(config) {
    this.id = config.id;
    this.title = config.title;
    this.message = config.message;
    this.highlightElement = config.highlightElement || null;
    this.blockInput = config.blockInput !== undefined ? config.blockInput : true;
    this.completionCondition = config.completionCondition || { type: 'manual' };
    this.onStart = config.onStart || null;
    this.onComplete = config.onComplete || null;

    // Runtime state
    this.isActive = false;
    this.isCompleted = false;
    this.startedAt = null;
    this.completedAt = null;
  }

  /**
   * Activate this step
   */
  start() {
    this.isActive = true;
    this.startedAt = Date.now();

    if (this.onStart) {
      this.onStart();
    }
  }

  /**
   * Complete this step
   */
  complete() {
    this.isActive = false;
    this.isCompleted = true;
    this.completedAt = Date.now();

    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Check if completion condition is met
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if step should complete
   */
  checkCompletion(gameState) {
    if (!this.isActive) return false;

    const { type, target } = this.completionCondition;

    switch (type) {
      case 'building_placed':
        return this._checkBuildingPlaced(gameState, target);

      case 'button_clicked':
        return this._checkButtonClicked(gameState, target);

      case 'npc_spawned':
        return this._checkNPCSpawned(gameState);

      case 'npc_assigned':
        return this._checkNPCAssigned(gameState);

      case 'territory_expanded':
        return this._checkTerritoryExpanded(gameState);

      case 'timer':
        return this._checkTimer(target);

      case 'manual':
        return false; // Manual completion only

      default:
        console.warn(`Unknown completion type: ${type}`);
        return false;
    }
  }

  // Private helper methods for checking conditions
  _checkBuildingPlaced(gameState, buildingType) {
    if (!gameState.buildingPlaced) return false;
    return buildingType ? gameState.buildingPlaced.type === buildingType : true;
  }

  _checkButtonClicked(gameState, buttonId) {
    return gameState.buttonClicked === buttonId;
  }

  _checkNPCSpawned(gameState) {
    return gameState.npcSpawned === true;
  }

  _checkNPCAssigned(gameState) {
    return gameState.npcAssigned === true;
  }

  _checkTerritoryExpanded(gameState) {
    return gameState.territoryExpanded === true;
  }

  _checkTimer(durationMs) {
    if (!this.startedAt) return false;
    return Date.now() - this.startedAt >= durationMs;
  }

  /**
   * Serialize step state for saving
   * @returns {Object} Serialized state
   */
  serialize() {
    return {
      id: this.id,
      isCompleted: this.isCompleted,
      completedAt: this.completedAt
    };
  }

  /**
   * Deserialize step state from save
   * @param {Object} data - Saved state
   */
  deserialize(data) {
    this.isCompleted = data.isCompleted || false;
    this.completedAt = data.completedAt || null;
  }
}

export default TutorialStep;
