/**
 * Tutorial Steps Definitions
 *
 * Defines all 12 tutorial steps for the onboarding flow
 */

import TutorialStep from './TutorialStep.js';

/**
 * Create all tutorial steps
 * @returns {Array<TutorialStep>} Array of tutorial steps
 */
export function createTutorialSteps() {
  return [
    // Step 1: Welcome
    new TutorialStep({
      id: 'welcome',
      title: 'Welcome to Voxel RPG!',
      message: "Welcome to Voxel RPG! Let's build your first settlement. This tutorial will guide you through the basics of the game.",
      highlightElement: null,
      blockInput: true,
      completionCondition: {
        type: 'button_clicked',
        target: 'tutorial-next'
      }
    }),

    // Step 2: Place Building
    new TutorialStep({
      id: 'place-campfire',
      title: 'Place Your First Building',
      message: 'Click the CAMPFIRE button in the build menu, then click on the grid to place it. Buildings are the foundation of your settlement.',
      highlightElement: '.build-button-campfire',
      blockInput: true,
      completionCondition: {
        type: 'building_placed',
        target: 'campfire'
      }
    }),

    // Step 3: Resources
    new TutorialStep({
      id: 'understand-resources',
      title: 'Resource Production',
      message: "Great! The campfire produces wood over time. Watch the resources panel to see your wood increase. Resources are essential for building and expansion.",
      highlightElement: '.resources-panel',
      blockInput: false,
      completionCondition: {
        type: 'timer',
        target: 5000 // 5 seconds
      }
    }),

    // Step 4: Build Farm
    new TutorialStep({
      id: 'place-farm',
      title: 'Build a Farm',
      message: "You'll need food to sustain NPCs (citizens). Place a FARM next to your campfire within the green territory area.",
      highlightElement: '.build-button-farm',
      blockInput: true,
      completionCondition: {
        type: 'building_placed',
        target: 'farm'
      }
    }),

    // Step 5: Spawn NPC
    new TutorialStep({
      id: 'spawn-npc',
      title: 'Spawn Your First Citizen',
      message: "Now let's add citizens to your settlement! Click the 'Spawn NPC' button to create your first citizen. NPCs will work in your buildings.",
      highlightElement: '.spawn-npc-button',
      blockInput: true,
      completionCondition: {
        type: 'npc_spawned'
      }
    }),

    // Step 6: Assign NPC
    new TutorialStep({
      id: 'assign-npc',
      title: 'Assign NPC to Farm',
      message: "Click on the farm building, then click 'Assign NPC' to put your citizen to work. Assigned NPCs will produce resources from their building.",
      highlightElement: null,
      blockInput: true,
      completionCondition: {
        type: 'npc_assigned'
      }
    }),

    // Step 7: Food Production
    new TutorialStep({
      id: 'food-production',
      title: 'Food Production & Consumption',
      message: 'Your NPC is now producing food! NPCs consume 0.5 food per minute to survive. Make sure you have enough farms to feed your population.',
      highlightElement: '.food-counter',
      blockInput: false,
      completionCondition: {
        type: 'timer',
        target: 5000 // 5 seconds
      }
    }),

    // Step 8: Build House
    new TutorialStep({
      id: 'place-house',
      title: 'Build Housing',
      message: 'NPCs need shelter! Place a HOUSE to increase your housing capacity. Each house can shelter multiple NPCs.',
      highlightElement: '.build-button-house',
      blockInput: true,
      completionCondition: {
        type: 'building_placed',
        target: 'house'
      }
    }),

    // Step 9: Territory
    new TutorialStep({
      id: 'understand-territory',
      title: 'Territory Boundaries',
      message: 'Buildings must be placed within your territory (the green highlighted area). Territory defines where you can build and expand.',
      highlightElement: '.territory-overlay',
      blockInput: false,
      completionCondition: {
        type: 'timer',
        target: 5000 // 5 seconds
      }
    }),

    // Step 10: Expand Territory
    new TutorialStep({
      id: 'expand-territory',
      title: 'Expand Your Territory',
      message: "Click 'Expand Territory' to grow your settlement area. Expansion costs resources but allows you to build more buildings.",
      highlightElement: '.expand-territory-button',
      blockInput: true,
      completionCondition: {
        type: 'territory_expanded'
      }
    }),

    // Step 11: Tier Progression
    new TutorialStep({
      id: 'tier-progression',
      title: 'Tier Progression',
      message: 'Unlock new buildings by reaching tier gates. Check the tier requirements panel to see what you need to advance (e.g., 2 farms + 1 house for PERMANENT tier).',
      highlightElement: '.tier-panel',
      blockInput: false,
      completionCondition: {
        type: 'timer',
        target: 5000 // 5 seconds
      }
    }),

    // Step 12: Tutorial Complete
    new TutorialStep({
      id: 'tutorial-complete',
      title: "You're Ready!",
      message: "Tutorial complete! You've learned the basics of Voxel RPG. Continue building your civilization, manage your NPCs, and advance through the tiers. Good luck!",
      highlightElement: null,
      blockInput: false,
      completionCondition: {
        type: 'button_clicked',
        target: 'tutorial-finish'
      }
    })
  ];
}

/**
 * Get a specific tutorial step by ID
 * @param {string} stepId - Step ID to find
 * @returns {TutorialStep|null} The step or null if not found
 */
export function getTutorialStepById(stepId) {
  const steps = createTutorialSteps();
  return steps.find(step => step.id === stepId) || null;
}

/**
 * Get step IDs in order
 * @returns {Array<string>} Array of step IDs
 */
export function getTutorialStepIds() {
  return createTutorialSteps().map(step => step.id);
}

/**
 * Validate tutorial step sequence
 * @returns {Object} Validation result
 */
export function validateTutorialSteps() {
  const steps = createTutorialSteps();
  const errors = [];

  // Check for duplicate IDs
  const ids = steps.map(step => step.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate step IDs: ${duplicates.join(', ')}`);
  }

  // Check that all steps have required fields
  steps.forEach((step, index) => {
    if (!step.id) {
      errors.push(`Step ${index} missing ID`);
    }
    if (!step.title) {
      errors.push(`Step ${index} missing title`);
    }
    if (!step.message) {
      errors.push(`Step ${index} missing message`);
    }
    if (!step.completionCondition || !step.completionCondition.type) {
      errors.push(`Step ${index} missing completion condition`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    stepCount: steps.length
  };
}

const tutorialStepsAPI = {
  createTutorialSteps,
  getTutorialStepById,
  getTutorialStepIds,
  validateTutorialSteps
};

export default tutorialStepsAPI;
