/**
 * Tests for TutorialSystem
 */

import TutorialSystem from '../TutorialSystem.js';
import TutorialStep from '../TutorialStep.js';
import { createTutorialSteps } from '../tutorialSteps.js';

describe('TutorialSystem', () => {
  let tutorialSystem;

  beforeEach(() => {
    tutorialSystem = new TutorialSystem();
  });

  describe('Initialization', () => {
    test('should initialize with correct default state', () => {
      expect(tutorialSystem.enabled).toBe(true);
      expect(tutorialSystem.hasCompletedTutorial).toBe(false);
      expect(tutorialSystem.flowManager).toBeDefined();
      expect(tutorialSystem.flowManager.steps.length).toBe(12);
    });

    test('should create flow manager with tutorial steps', () => {
      const steps = tutorialSystem.flowManager.steps;
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toBeInstanceOf(TutorialStep);
    });
  });

  describe('Tutorial Flow Control', () => {
    test('should start tutorial', () => {
      tutorialSystem.start();
      expect(tutorialSystem.flowManager.isActive).toBe(true);
      expect(tutorialSystem.flowManager.currentStepIndex).toBe(0);
    });

    test('should not start if disabled', () => {
      tutorialSystem.disable();
      tutorialSystem.start();
      expect(tutorialSystem.flowManager.isActive).toBe(false);
    });

    test('should not start if already completed', () => {
      tutorialSystem.hasCompletedTutorial = true;
      tutorialSystem.start();
      expect(tutorialSystem.flowManager.isActive).toBe(false);
    });

    test('should pause and resume tutorial', () => {
      tutorialSystem.start();
      tutorialSystem.pause();
      expect(tutorialSystem.flowManager.isPaused).toBe(true);

      tutorialSystem.resume();
      expect(tutorialSystem.flowManager.isPaused).toBe(false);
    });

    test('should stop tutorial', () => {
      tutorialSystem.start();
      tutorialSystem.stop();
      expect(tutorialSystem.flowManager.isActive).toBe(false);
      expect(tutorialSystem.highlightedElement).toBeNull();
    });

    test('should skip tutorial entirely', () => {
      tutorialSystem.start();
      tutorialSystem.skipTutorial();
      expect(tutorialSystem.hasCompletedTutorial).toBe(true);
      expect(tutorialSystem.flowManager.isCompleted).toBe(true);
    });
  });

  describe('Step Progression', () => {
    test('should advance to next step', () => {
      tutorialSystem.start();
      const initialStep = tutorialSystem.flowManager.currentStepIndex;

      tutorialSystem.nextStep();

      expect(tutorialSystem.flowManager.currentStepIndex).toBe(initialStep + 1);
    });

    test('should complete tutorial when reaching last step', () => {
      tutorialSystem.start();

      // Advance through all steps
      while (tutorialSystem.flowManager.hasNextStep()) {
        tutorialSystem.nextStep();
      }

      // Complete last step
      tutorialSystem.nextStep();

      expect(tutorialSystem.flowManager.isCompleted).toBe(true);
      expect(tutorialSystem.hasCompletedTutorial).toBe(true);
    });
  });

  describe('Action Notifications', () => {
    test('should process building placed action', () => {
      tutorialSystem.start();

      // Skip to step that requires building placement
      tutorialSystem.flowManager.goToStep(1); // place-campfire step

      tutorialSystem.notifyAction('buildingPlaced', { type: 'campfire' });

      // Should advance to next step
      expect(tutorialSystem.flowManager.currentStepIndex).toBe(2);
    });

    test('should ignore actions when tutorial is disabled', () => {
      tutorialSystem.disable();
      const initialStep = tutorialSystem.flowManager.currentStepIndex;

      tutorialSystem.notifyAction('buildingPlaced', { type: 'campfire' });

      expect(tutorialSystem.flowManager.currentStepIndex).toBe(initialStep);
    });

    test('should ignore actions when tutorial is not active', () => {
      const initialStep = tutorialSystem.flowManager.currentStepIndex;

      tutorialSystem.notifyAction('buildingPlaced', { type: 'campfire' });

      expect(tutorialSystem.flowManager.currentStepIndex).toBe(initialStep);
    });
  });

  describe('UI State', () => {
    test('should return correct state when inactive', () => {
      const state = tutorialSystem.getState();

      expect(state.isActive).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isCompleted).toBe(false);
      expect(state.currentStep).toBeNull();
      expect(state.enabled).toBe(true);
    });

    test('should return correct state when active', () => {
      tutorialSystem.start();
      const state = tutorialSystem.getState();

      expect(state.isActive).toBe(true);
      expect(state.currentStep).toBeDefined();
      expect(state.currentStep.id).toBe('welcome');
      expect(state.stepNumber).toBe(1);
      expect(state.totalSteps).toBe(12);
    });

    test('should update highlighted element', () => {
      tutorialSystem.start();

      // Go to step with highlight
      tutorialSystem.nextStep(); // Go to place-campfire step

      const state = tutorialSystem.getState();
      expect(state.currentStep.highlightElement).toBe('.build-button-campfire');
    });
  });

  describe('Event Listeners', () => {
    test('should notify UI update listeners', () => {
      const mockListener = jest.fn();
      tutorialSystem.onUIUpdate(mockListener);

      tutorialSystem.start();

      expect(mockListener).toHaveBeenCalled();
      const state = mockListener.mock.calls[0][0];
      expect(state.isActive).toBe(true);
    });

    test('should remove UI update listeners', () => {
      const mockListener = jest.fn();
      tutorialSystem.onUIUpdate(mockListener);
      tutorialSystem.removeUIUpdateListener(mockListener);

      tutorialSystem.start();

      expect(mockListener).not.toHaveBeenCalled();
    });

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Test error');
      });

      tutorialSystem.onUIUpdate(errorListener);

      // Should not throw
      expect(() => tutorialSystem.start()).not.toThrow();
    });
  });

  describe('Serialization', () => {
    test('should serialize tutorial state', () => {
      tutorialSystem.start();
      tutorialSystem.nextStep();

      const serialized = tutorialSystem.serialize();

      expect(serialized.enabled).toBe(true);
      expect(serialized.hasCompletedTutorial).toBe(false);
      expect(serialized.flowState).toBeDefined();
      expect(serialized.flowState.currentStepIndex).toBe(1);
    });

    test('should deserialize tutorial state', () => {
      const savedState = {
        enabled: true,
        hasCompletedTutorial: false,
        flowState: {
          currentStepIndex: 2,
          isActive: true,
          isPaused: false,
          isCompleted: false,
          steps: []
        }
      };

      tutorialSystem.deserialize(savedState);

      expect(tutorialSystem.enabled).toBe(true);
      expect(tutorialSystem.hasCompletedTutorial).toBe(false);
      expect(tutorialSystem.flowManager.currentStepIndex).toBe(2);
    });

    test('should handle missing data in deserialize', () => {
      expect(() => tutorialSystem.deserialize(null)).not.toThrow();
      expect(() => tutorialSystem.deserialize({})).not.toThrow();
    });
  });

  describe('Auto-start Detection', () => {
    test('should auto-start when not completed and enabled', () => {
      expect(tutorialSystem.shouldAutoStart()).toBe(true);
    });

    test('should not auto-start when disabled', () => {
      tutorialSystem.disable();
      expect(tutorialSystem.shouldAutoStart()).toBe(false);
    });

    test('should not auto-start when already completed', () => {
      tutorialSystem.hasCompletedTutorial = true;
      expect(tutorialSystem.shouldAutoStart()).toBe(false);
    });

    test('should not auto-start when already active', () => {
      tutorialSystem.start();
      expect(tutorialSystem.shouldAutoStart()).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should provide correct statistics', () => {
      tutorialSystem.start();
      tutorialSystem.nextStep();
      tutorialSystem.nextStep();

      const stats = tutorialSystem.getStatistics();

      expect(stats.completedSteps).toBe(2);
      expect(stats.totalSteps).toBe(12);
      expect(stats.progressPercent).toBeGreaterThan(0);
      expect(stats.isCompleted).toBe(false);
      expect(stats.timeElapsed).toBeGreaterThan(0);
    });

    test('should show completed statistics', () => {
      tutorialSystem.skipTutorial();

      const stats = tutorialSystem.getStatistics();

      expect(stats.isCompleted).toBe(true);
    });
  });

  describe('Reset', () => {
    test('should reset tutorial completely', () => {
      tutorialSystem.start();
      tutorialSystem.nextStep();
      tutorialSystem.hasCompletedTutorial = true;

      tutorialSystem.reset();

      expect(tutorialSystem.hasCompletedTutorial).toBe(false);
      expect(tutorialSystem.flowManager.currentStepIndex).toBe(0);
      expect(tutorialSystem.flowManager.isActive).toBe(false);
      expect(tutorialSystem.highlightedElement).toBeNull();
    });
  });
});
