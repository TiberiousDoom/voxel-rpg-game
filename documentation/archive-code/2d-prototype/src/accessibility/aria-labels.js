/**
 * aria-labels.js - Centralized ARIA label definitions
 *
 * This file contains all ARIA labels and accessibility text used throughout the application.
 * Centralizing these labels ensures consistency and makes it easier to update accessibility text.
 *
 * Usage:
 * import { ARIA_LABELS } from '../accessibility/aria-labels';
 *
 * <button aria-label={ARIA_LABELS.GAME.PAUSE}>Pause</button>
 */

/**
 * ARIA labels organized by feature/component
 */
export const ARIA_LABELS = {
  // Game controls
  GAME: {
    START: 'Start game',
    STOP: 'Stop game',
    PAUSE: 'Pause game',
    RESUME: 'Resume game',
    SAVE: 'Save game',
    LOAD: 'Load game',
    NEW_GAME: 'Start new game',
    SETTINGS: 'Open game settings',
    MENU: 'Open game menu'
  },

  // Building menu
  BUILD_MENU: {
    TITLE: 'Building menu - Select a building type to place',
    TOGGLE: 'Toggle building menu',
    CLOSE: 'Close building menu',
    SELECT_BUILDING: (buildingType) => `Select ${buildingType} for placement`,
    PLACE_BUILDING: (buildingType) => `Place ${buildingType} on the map`,
    BUILDING_INFO: (buildingType) => `View information about ${buildingType}`,
    COST_LABEL: 'Resource cost',
    REQUIREMENTS: 'Building requirements',
    CATEGORY_SURVIVAL: 'Survival tier buildings',
    CATEGORY_PERMANENT: 'Permanent tier buildings',
    CATEGORY_TOWN: 'Town tier buildings',
    CATEGORY_CASTLE: 'Castle tier buildings'
  },

  // NPC Panel
  NPC_PANEL: {
    TITLE: 'NPC management panel - View and manage your NPCs',
    SPAWN_NPC: 'Spawn new NPC',
    SELECT_NPC: (npcName) => `Select ${npcName}`,
    ASSIGN_NPC: (npcName, buildingType) => `Assign ${npcName} to ${buildingType}`,
    UNASSIGN_NPC: (npcName) => `Unassign ${npcName} from current building`,
    NPC_DETAILS: (npcName) => `View details for ${npcName}`,
    NPC_HEALTH: (health, maxHealth) => `Health: ${health} out of ${maxHealth}`,
    NPC_HAPPINESS: (happiness) => `Happiness: ${happiness}%`,
    NPC_ROLE: (role) => `Role: ${role}`,
    FILTER_BY_ROLE: 'Filter NPCs by role',
    SEARCH_NPCS: 'Search NPCs by name',
    SORT_BY: 'Sort NPCs by',
    LIST_VIEW: 'NPC list view',
    GRID_VIEW: 'NPC grid view'
  },

  // Resource Panel
  RESOURCE_PANEL: {
    TITLE: 'Resources panel - View your available resources',
    RESOURCE_AMOUNT: (resourceType, amount) => `${resourceType}: ${amount}`,
    RESOURCE_TREND_UP: (resourceType) => `${resourceType} increasing`,
    RESOURCE_TREND_DOWN: (resourceType) => `${resourceType} decreasing`,
    RESOURCE_TREND_STABLE: (resourceType) => `${resourceType} stable`,
    STORAGE_CAPACITY: (current, max) => `Storage: ${current} / ${max}`,
    PRODUCTION_RATE: (rate) => `Production rate: ${rate} per second`,
    CONSUMPTION_RATE: (rate) => `Consumption rate: ${rate} per second`
  },

  // Game Control Bar
  CONTROL_BAR: {
    TITLE: 'Game controls',
    SPEED_CONTROL: 'Game speed control',
    SPEED_NORMAL: 'Normal speed',
    SPEED_FAST: 'Fast speed',
    SPEED_FASTER: 'Faster speed',
    TIER_PROGRESS: 'Tier progression status',
    ADVANCE_TIER: (nextTier) => `Advance to ${nextTier} tier`,
    CURRENT_TIER: (tier) => `Current tier: ${tier}`
  },

  // Modal/Dialog
  MODAL: {
    CLOSE: 'Close dialog',
    CONFIRM: 'Confirm action',
    CANCEL: 'Cancel action',
    DELETE_CONFIRM: (itemName) => `Confirm deletion of ${itemName}`,
    SAVE_CONFIRM: 'Confirm save',
    LOAD_CONFIRM: 'Confirm load',
    DIALOG: 'Dialog window',
    ALERT: 'Alert message',
    ERROR: 'Error message',
    SUCCESS: 'Success message',
    WARNING: 'Warning message',
    INFO: 'Information message'
  },

  // Navigation
  NAVIGATION: {
    MAIN_MENU: 'Main navigation menu',
    SKIP_TO_CONTENT: 'Skip to main content',
    BACK: 'Go back',
    NEXT: 'Go to next page',
    PREVIOUS: 'Go to previous page',
    HOME: 'Go to home page'
  },

  // Camera controls
  CAMERA: {
    PAN_LEFT: 'Pan camera left',
    PAN_RIGHT: 'Pan camera right',
    PAN_UP: 'Pan camera up',
    PAN_DOWN: 'Pan camera down',
    ZOOM_IN: 'Zoom in',
    ZOOM_OUT: 'Zoom out',
    RESET_VIEW: 'Reset camera view',
    CENTER_ON_BUILDING: (buildingType) => `Center camera on ${buildingType}`
  },

  // Keyboard shortcuts
  SHORTCUTS: {
    HELP: 'Show keyboard shortcuts help',
    HELP_DIALOG_TITLE: 'Keyboard shortcuts reference',
    SHORTCUT_ITEM: (key, description) => `Press ${key} to ${description}`
  },

  // Status indicators
  STATUS: {
    ONLINE: 'Online',
    OFFLINE: 'Offline',
    LOADING: 'Loading',
    SAVING: 'Saving',
    SAVED: 'Saved successfully',
    ERROR: 'Error occurred',
    WARNING: 'Warning',
    SUCCESS: 'Operation successful'
  },

  // Form elements
  FORM: {
    REQUIRED: 'Required field',
    OPTIONAL: 'Optional field',
    INVALID: 'Invalid input',
    VALID: 'Valid input',
    SEARCH: 'Search',
    FILTER: 'Filter',
    SORT: 'Sort',
    SELECT: 'Select',
    CHECKBOX: 'Checkbox',
    RADIO: 'Radio button',
    SUBMIT: 'Submit form',
    RESET: 'Reset form'
  },

  // Building-specific
  BUILDING: {
    PLACE: 'Place building on map',
    REMOVE: 'Remove building from map',
    SELECT: 'Select building',
    DESELECT: 'Deselect building',
    UPGRADE: 'Upgrade building',
    REPAIR: 'Repair building',
    DESTROY: 'Destroy building',
    INFO: 'Building information',
    HEALTH_BAR: (health, maxHealth) => `Building health: ${health} out of ${maxHealth}`,
    STATE_BLUEPRINT: 'Blueprint state',
    STATE_CONSTRUCTION: 'Under construction',
    STATE_COMPLETE: 'Construction complete',
    STATE_DAMAGED: 'Building damaged',
    STATE_DESTROYED: 'Building destroyed'
  },

  // Tooltips
  TOOLTIP: {
    INFO: 'Additional information',
    HELP: 'Help text',
    MORE: 'Click for more details'
  }
};

/**
 * ARIA live region announcements
 * These are used for screen reader announcements of dynamic content
 */
export const ARIA_ANNOUNCEMENTS = {
  GAME: {
    STARTED: 'Game has started',
    STOPPED: 'Game has stopped',
    PAUSED: 'Game paused',
    RESUMED: 'Game resumed',
    SAVED: 'Game saved successfully',
    LOADED: 'Game loaded successfully'
  },

  BUILDING: {
    PLACED: (buildingType) => `${buildingType} placed on map`,
    REMOVED: (buildingType) => `${buildingType} removed from map`,
    COMPLETED: (buildingType) => `${buildingType} construction completed`,
    DAMAGED: (buildingType) => `${buildingType} has been damaged`,
    DESTROYED: (buildingType) => `${buildingType} has been destroyed`,
    REPAIRED: (buildingType) => `${buildingType} has been repaired`
  },

  NPC: {
    SPAWNED: (npcName) => `${npcName} has spawned`,
    ASSIGNED: (npcName, buildingType) => `${npcName} assigned to ${buildingType}`,
    UNASSIGNED: (npcName) => `${npcName} unassigned`,
    DIED: (npcName) => `${npcName} has died`
  },

  RESOURCE: {
    GAINED: (resourceType, amount) => `Gained ${amount} ${resourceType}`,
    LOST: (resourceType, amount) => `Lost ${amount} ${resourceType}`,
    LOW: (resourceType) => `Warning: ${resourceType} is running low`,
    DEPLETED: (resourceType) => `${resourceType} depleted`
  },

  TIER: {
    ADVANCED: (tier) => `Advanced to ${tier} tier`,
    REQUIREMENTS_MET: (tier) => `Requirements met for ${tier} tier`,
    REQUIREMENTS_NOT_MET: (tier) => `Requirements not met for ${tier} tier`
  },

  ERROR: {
    GENERIC: 'An error occurred',
    NETWORK: 'Network error occurred',
    SAVE_FAILED: 'Failed to save game',
    LOAD_FAILED: 'Failed to load game',
    PLACEMENT_FAILED: 'Failed to place building',
    INSUFFICIENT_RESOURCES: 'Insufficient resources'
  }
};

/**
 * ARIA role descriptions
 * Provide additional context for complex UI components
 */
export const ARIA_ROLE_DESCRIPTIONS = {
  GAME_VIEWPORT: 'Interactive game map where buildings and NPCs are displayed',
  BUILD_MENU: 'Building selection menu with categorized building types',
  RESOURCE_PANEL: 'Resource management panel showing current resources and trends',
  NPC_PANEL: 'NPC management panel for viewing and controlling NPCs',
  CONTROL_BAR: 'Game control bar with play, pause, and speed controls'
};

/**
 * Get ARIA label for a specific context
 * Helper function for dynamic label generation
 *
 * @param {string} category - Label category (e.g., 'GAME', 'BUILDING')
 * @param {string} key - Label key
 * @param {...any} args - Arguments for label function
 * @returns {string} ARIA label
 */
export function getAriaLabel(category, key, ...args) {
  const categoryLabels = ARIA_LABELS[category];
  if (!categoryLabels) {
    console.warn(`ARIA category ${category} not found`);
    return '';
  }

  const label = categoryLabels[key];
  if (!label) {
    console.warn(`ARIA label ${key} not found in category ${category}`);
    return '';
  }

  // If label is a function, call it with args
  if (typeof label === 'function') {
    return label(...args);
  }

  return label;
}

/**
 * Get ARIA announcement for a specific event
 *
 * @param {string} category - Announcement category
 * @param {string} key - Announcement key
 * @param {...any} args - Arguments for announcement function
 * @returns {string} ARIA announcement
 */
export function getAriaAnnouncement(category, key, ...args) {
  const categoryAnnouncements = ARIA_ANNOUNCEMENTS[category];
  if (!categoryAnnouncements) {
    console.warn(`ARIA announcement category ${category} not found`);
    return '';
  }

  const announcement = categoryAnnouncements[key];
  if (!announcement) {
    console.warn(`ARIA announcement ${key} not found in category ${category}`);
    return '';
  }

  // If announcement is a function, call it with args
  if (typeof announcement === 'function') {
    return announcement(...args);
  }

  return announcement;
}

export default ARIA_LABELS;
