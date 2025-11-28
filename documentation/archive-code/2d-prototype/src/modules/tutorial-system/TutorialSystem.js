/**
 * TutorialSystem - Main tutorial orchestrator
 *
 * Manages:
 * - Tutorial flow and step progression
 * - UI highlighting and overlays
 * - Tutorial state persistence
 * - Integration with game systems
 */

import TutorialFlowManager from './TutorialFlowManager.js';
import { createTutorialSteps } from './tutorialSteps.js';

class TutorialSystem {
  /**
   * @param {Object} orchestrator - Game module orchestrator (optional)
   */
  constructor(orchestrator = null) {
    this.orchestrator = orchestrator;

    // Create tutorial flow with steps
    const steps = createTutorialSteps();
    this.flowManager = new TutorialFlowManager(steps);

    // Tutorial state
    this.enabled = true; // Can be disabled by player
    this.hasCompletedTutorial = false;
    this.highlightedElement = null;

    // Event listeners
    this.uiUpdateListeners = [];

    // Setup flow event listeners
    this._setupEventListeners();
  }

  /**
   * Check if tutorial should auto-start
   * @returns {boolean}
   */
  shouldAutoStart() {
    return this.enabled && !this.hasCompletedTutorial && !this.flowManager.isActive;
  }

  /**
   * Start the tutorial
   */
  start() {
    if (!this.enabled) {
      // eslint-disable-next-line no-console
      console.log('Tutorial is disabled');
      return;
    }

    if (this.hasCompletedTutorial) {
      // eslint-disable-next-line no-console
      console.log('Tutorial already completed');
      return;
    }

    this.flowManager.start();
    this._notifyUIUpdate();
  }

  /**
   * Pause the tutorial
   */
  pause() {
    this.flowManager.pause();
    this._notifyUIUpdate();
  }

  /**
   * Resume the tutorial
   */
  resume() {
    this.flowManager.resume();
    this._notifyUIUpdate();
  }

  /**
   * Stop the tutorial
   */
  stop() {
    this.flowManager.stop();
    this._clearHighlight();
    this._notifyUIUpdate();
  }

  /**
   * Skip the tutorial entirely
   */
  skipTutorial() {
    this.flowManager.complete();
    this.hasCompletedTutorial = true;
    this._clearHighlight();
    this._notifyUIUpdate();
  }

  /**
   * Enable tutorial system
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable tutorial system
   */
  disable() {
    this.enabled = false;
    this.stop();
  }

  /**
   * Get current tutorial state for UI
   * @returns {Object}
   */
  getState() {
    const currentStep = this.flowManager.currentStep;

    return {
      isActive: this.flowManager.isActive,
      isPaused: this.flowManager.isPaused,
      isCompleted: this.flowManager.isCompleted,
      hasCompletedTutorial: this.hasCompletedTutorial,
      enabled: this.enabled,
      currentStep: currentStep ? {
        id: currentStep.id,
        title: currentStep.title,
        message: currentStep.message,
        highlightElement: currentStep.highlightElement,
        blockInput: currentStep.blockInput
      } : null,
      progress: this.flowManager.progress,
      stepNumber: this.flowManager.currentStepIndex + 1,
      totalSteps: this.flowManager.steps.length
    };
  }

  /**
   * Update tutorial state - called every game tick
   * @param {Object} gameState - Current game state
   */
  update(gameState) {
    if (!this.enabled || !this.flowManager.isActive) {
      return;
    }

    // Check if current step is complete
    const wasCompleted = this.flowManager.checkStepCompletion(gameState);
    if (wasCompleted) {
      this._notifyUIUpdate();
    }
  }

  /**
   * Notify tutorial of game action (for completion detection)
   * @param {string} actionType - Type of action
   * @param {any} actionData - Action data
   */
  notifyAction(actionType, actionData = null) {
    if (!this.enabled || !this.flowManager.isActive) {
      return;
    }

    const gameState = {
      [actionType]: actionData !== null ? actionData : true
    };

    this.update(gameState);
  }

  /**
   * Manually advance to next step (for UI button clicks)
   */
  nextStep() {
    const hasNext = this.flowManager.nextStep();
    this._notifyUIUpdate();
    return hasNext;
  }

  /**
   * Add listener for UI updates
   * @param {Function} listener - Callback function
   */
  onUIUpdate(listener) {
    this.uiUpdateListeners.push(listener);
  }

  /**
   * Remove UI update listener
   * @param {Function} listener - Callback to remove
   */
  removeUIUpdateListener(listener) {
    const index = this.uiUpdateListeners.indexOf(listener);
    if (index !== -1) {
      this.uiUpdateListeners.splice(index, 1);
    }
  }

  /**
   * Serialize tutorial state for saving
   * @returns {Object}
   */
  serialize() {
    return {
      enabled: this.enabled,
      hasCompletedTutorial: this.hasCompletedTutorial,
      flowState: this.flowManager.serialize()
    };
  }

  /**
   * Deserialize tutorial state from save
   * @param {Object} data - Saved state
   */
  deserialize(data) {
    if (!data) return;

    this.enabled = data.enabled !== undefined ? data.enabled : true;
    this.hasCompletedTutorial = data.hasCompletedTutorial || false;

    if (data.flowState) {
      this.flowManager.deserialize(data.flowState);
    }

    this._notifyUIUpdate();
  }

  /**
   * Reset tutorial completely
   */
  reset() {
    this.flowManager.reset();
    this.hasCompletedTutorial = false;
    this._clearHighlight();
    this._notifyUIUpdate();
  }

  // Private methods

  _setupEventListeners() {
    // Listen for step start events
    this.flowManager.onStepStart((step) => {
      this._handleStepStart(step);
    });

    // Listen for step complete events
    this.flowManager.onStepComplete((step) => {
      this._handleStepComplete(step);
    });

    // Listen for tutorial complete
    this.flowManager.onTutorialComplete(() => {
      this._handleTutorialComplete();
    });
  }

  _handleStepStart(step) {
    // Update UI highlight
    if (step.highlightElement) {
      this.highlightedElement = step.highlightElement;
    } else {
      this._clearHighlight();
    }

    this._notifyUIUpdate();
  }

  _handleStepComplete(step) {
    // Clear highlight when step completes
    this._clearHighlight();
  }

  _handleTutorialComplete() {
    this.hasCompletedTutorial = true;
    this._clearHighlight();
    this._notifyUIUpdate();

    // eslint-disable-next-line no-console
    console.log('Tutorial completed!');
  }

  _clearHighlight() {
    this.highlightedElement = null;
  }

  _notifyUIUpdate() {
    const state = this.getState();
    this.uiUpdateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in UI update listener:', error);
      }
    });
  }

  /**
   * Get tutorial statistics
   * @returns {Object}
   */
  getStatistics() {
    const completedSteps = this.flowManager.steps.filter(s => s.isCompleted).length;
    const totalSteps = this.flowManager.steps.length;

    return {
      completedSteps,
      totalSteps,
      progressPercent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      isCompleted: this.hasCompletedTutorial,
      timeElapsed: this.flowManager.startedAt ? Date.now() - this.flowManager.startedAt : 0
    };
  }
}

export default TutorialSystem;
