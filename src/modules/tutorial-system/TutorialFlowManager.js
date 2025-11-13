/**
 * TutorialFlowManager - Manages tutorial step progression
 *
 * Handles:
 * - Step sequencing (linear progression)
 * - Step completion detection
 * - Tutorial flow state (active, paused, completed)
 * - Step skipping/navigation
 */

import TutorialStep from './TutorialStep.js';

class TutorialFlowManager {
  /**
   * @param {Array<TutorialStep>} steps - Array of tutorial steps
   */
  constructor(steps = []) {
    this.steps = steps;
    this.currentStepIndex = 0;
    this.isActive = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.startedAt = null;
    this.completedAt = null;

    // Listeners for step events
    this.stepStartListeners = [];
    this.stepCompleteListeners = [];
    this.tutorialCompleteListeners = [];
  }

  /**
   * Start the tutorial flow
   */
  start() {
    if (this.steps.length === 0) {
      console.warn('Cannot start tutorial: no steps defined');
      return;
    }

    this.isActive = true;
    this.isPaused = false;
    this.currentStepIndex = 0;
    this.startedAt = Date.now();

    // Start first step
    this._activateCurrentStep();
  }

  /**
   * Pause the tutorial
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume the tutorial
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Stop the tutorial
   */
  stop() {
    if (this.currentStep) {
      this.currentStep.isActive = false;
    }
    this.isActive = false;
    this.isPaused = false;
  }

  /**
   * Complete the tutorial
   */
  complete() {
    this.isActive = false;
    this.isCompleted = true;
    this.completedAt = Date.now();

    // Notify listeners
    this.tutorialCompleteListeners.forEach(listener => listener());
  }

  /**
   * Get the current step
   * @returns {TutorialStep|null}
   */
  get currentStep() {
    if (this.currentStepIndex >= 0 && this.currentStepIndex < this.steps.length) {
      return this.steps[this.currentStepIndex];
    }
    return null;
  }

  /**
   * Get progress percentage
   * @returns {number} Progress from 0-100
   */
  get progress() {
    if (this.steps.length === 0) return 0;
    return Math.round((this.currentStepIndex / this.steps.length) * 100);
  }

  /**
   * Check if there are more steps
   * @returns {boolean}
   */
  hasNextStep() {
    return this.currentStepIndex < this.steps.length - 1;
  }

  /**
   * Advance to next step
   * @returns {boolean} True if advanced, false if no more steps
   */
  nextStep() {
    if (!this.hasNextStep()) {
      this.complete();
      return false;
    }

    // Complete current step
    if (this.currentStep) {
      this.currentStep.complete();
      this._notifyStepComplete(this.currentStep);
    }

    // Move to next step
    this.currentStepIndex++;
    this._activateCurrentStep();

    return true;
  }

  /**
   * Go to a specific step by index
   * @param {number} stepIndex - Step index to jump to
   */
  goToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) {
      console.warn(`Invalid step index: ${stepIndex}`);
      return;
    }

    // Deactivate current step
    if (this.currentStep) {
      this.currentStep.isActive = false;
    }

    this.currentStepIndex = stepIndex;
    this._activateCurrentStep();
  }

  /**
   * Skip current step and go to next
   */
  skipCurrentStep() {
    this.nextStep();
  }

  /**
   * Reset tutorial to beginning
   */
  reset() {
    // Reset all steps
    this.steps.forEach(step => {
      step.isActive = false;
      step.isCompleted = false;
      step.startedAt = null;
      step.completedAt = null;
    });

    this.currentStepIndex = 0;
    this.isActive = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.startedAt = null;
    this.completedAt = null;
  }

  /**
   * Check if current step's completion condition is met
   * @param {Object} gameState - Current game state
   * @returns {boolean} True if should advance
   */
  checkStepCompletion(gameState) {
    if (!this.isActive || this.isPaused) return false;
    if (!this.currentStep) return false;

    const shouldComplete = this.currentStep.checkCompletion(gameState);
    if (shouldComplete) {
      this.nextStep();
      return true;
    }

    return false;
  }

  /**
   * Add listener for step start events
   * @param {Function} listener - Callback function
   */
  onStepStart(listener) {
    this.stepStartListeners.push(listener);
  }

  /**
   * Add listener for step complete events
   * @param {Function} listener - Callback function
   */
  onStepComplete(listener) {
    this.stepCompleteListeners.push(listener);
  }

  /**
   * Add listener for tutorial complete event
   * @param {Function} listener - Callback function
   */
  onTutorialComplete(listener) {
    this.tutorialCompleteListeners.push(listener);
  }

  // Private methods

  _activateCurrentStep() {
    if (!this.currentStep) return;

    this.currentStep.start();
    this._notifyStepStart(this.currentStep);
  }

  _notifyStepStart(step) {
    this.stepStartListeners.forEach(listener => listener(step));
  }

  _notifyStepComplete(step) {
    this.stepCompleteListeners.forEach(listener => listener(step));
  }

  /**
   * Serialize flow state for saving
   * @returns {Object}
   */
  serialize() {
    return {
      currentStepIndex: this.currentStepIndex,
      isActive: this.isActive,
      isPaused: this.isPaused,
      isCompleted: this.isCompleted,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      steps: this.steps.map(step => step.serialize())
    };
  }

  /**
   * Deserialize flow state from save
   * @param {Object} data - Saved state
   */
  deserialize(data) {
    this.currentStepIndex = data.currentStepIndex || 0;
    this.isActive = data.isActive || false;
    this.isPaused = data.isPaused || false;
    this.isCompleted = data.isCompleted || false;
    this.startedAt = data.startedAt || null;
    this.completedAt = data.completedAt || null;

    // Restore step states
    if (data.steps) {
      data.steps.forEach((stepData, index) => {
        if (this.steps[index]) {
          this.steps[index].deserialize(stepData);
        }
      });
    }
  }
}

export default TutorialFlowManager;
