/**
 * NPC Sprite Definitions
 *
 * Defines visual representation for different NPC roles.
 * Each role has color schemes, icons, and animation states.
 */

/**
 * NPC Role Definitions
 * Maps role types to visual properties
 */
export const NPC_SPRITE_DEFINITIONS = {
  FARMER: {
    name: 'Farmer',
    color: '#4CAF50',      // Green
    secondaryColor: '#81C784',
    icon: '🌾',             // Unicode fallback
    letter: 'F',           // First letter for simple rendering
    size: 8,               // Radius in pixels
    animationSpeed: 1.0,
  },

  CRAFTSMAN: {
    name: 'Craftsman',
    color: '#FF9800',      // Orange
    secondaryColor: '#FFB74D',
    icon: '🔨',
    letter: 'C',
    size: 8,
    animationSpeed: 0.9,
  },

  GUARD: {
    name: 'Guard',
    color: '#F44336',      // Red
    secondaryColor: '#E57373',
    icon: '⚔️',
    letter: 'G',
    size: 8,
    animationSpeed: 1.1,
  },

  WORKER: {
    name: 'Worker',
    color: '#2196F3',      // Blue
    secondaryColor: '#64B5F6',
    icon: '👷',
    letter: 'W',
    size: 8,
    animationSpeed: 1.0,
  },

  MINER: {
    name: 'Miner',
    color: '#9C27B0',      // Purple
    secondaryColor: '#BA68C8',
    icon: '⛏️',
    letter: 'M',
    size: 8,
    animationSpeed: 0.85,
  },

  MERCHANT: {
    name: 'Merchant',
    color: '#FFEB3B',      // Yellow
    secondaryColor: '#FFF176',
    icon: '💰',
    letter: 'T',           // T for Trader
    size: 8,
    animationSpeed: 1.2,
  },

  // Fallback for unknown roles
  DEFAULT: {
    name: 'NPC',
    color: '#9E9E9E',      // Grey
    secondaryColor: '#BDBDBD',
    icon: '👤',
    letter: '?',
    size: 8,
    animationSpeed: 1.0,
  }
};

/**
 * NPC Status Colors
 * Visual indicators for NPC state
 */
export const NPC_STATUS_COLORS = {
  WORKING: '#4CAF50',      // Green - actively working
  IDLE: '#FFC107',         // Amber - idle/available
  RESTING: '#03A9F4',      // Light blue - resting
  MOVING: '#9C27B0',       // Purple - moving
  PATROLLING: '#00BCD4',   // Cyan - on patrol
  LOW_HEALTH: '#F44336',   // Red - health critical
  HUNGRY: '#FF5722',       // Deep orange - needs food
  HAPPY: '#8BC34A',        // Light green - high morale
  UNHAPPY: '#FF9800',      // Orange - low morale
  DEFAULT: '#FF6B6B',      // Pink - fallback
};

/**
 * Health Bar Colors
 * Color coding for health percentage
 */
export const HEALTH_BAR_COLORS = {
  HIGH: '#4CAF50',         // Green (>66%)
  MEDIUM: '#FF9800',       // Orange (33-66%)
  LOW: '#F44336',          // Red (<33%)
  BACKGROUND: 'rgba(0, 0, 0, 0.3)',
};

/**
 * Animation States
 * Different visual states for NPC animations
 */
export const ANIMATION_STATES = {
  IDLE: 'idle',
  WALKING: 'walking',
  WORKING: 'working',
  RESTING: 'resting',
};

/**
 * Sprite Animation Frames
 * Simple 2-frame walking animation (can be expanded)
 */
export const WALKING_ANIMATION_FRAMES = [
  { offset: { x: 0, y: 0 }, scale: 1.0 },      // Frame 1
  { offset: { x: 0, y: -1 }, scale: 0.95 },    // Frame 2 (slight bob)
];

/**
 * Working Animation Frames
 * Slight scaling animation when working
 */
export const WORKING_ANIMATION_FRAMES = [
  { offset: { x: 0, y: 0 }, scale: 1.0 },      // Frame 1
  { offset: { x: 0, y: 0 }, scale: 1.05 },     // Frame 2 (slight grow)
];

/**
 * Get sprite definition for a role
 * @param {string} role - NPC role
 * @returns {Object} Sprite definition
 */
export function getSpriteForRole(role) {
  return NPC_SPRITE_DEFINITIONS[role] || NPC_SPRITE_DEFINITIONS.DEFAULT;
}

/**
 * Get status color for NPC
 * @param {Object} npc - NPC object with status and health
 * @returns {string} Color hex code
 */
export function getStatusColor(npc) {
  const health = npc.health || 100;
  const maxHealth = npc.maxHealth || 100;
  const healthPercent = health / maxHealth;

  // Priority: Low health > Status-based color
  if (healthPercent < 0.3) {
    return NPC_STATUS_COLORS.LOW_HEALTH;
  }

  // Check various status conditions
  if (npc.hungry) return NPC_STATUS_COLORS.HUNGRY;
  if (npc.isResting) return NPC_STATUS_COLORS.RESTING;
  if (npc.isMoving) return NPC_STATUS_COLORS.MOVING;
  if (npc.isWorking || npc.status === 'WORKING') return NPC_STATUS_COLORS.WORKING;
  if (npc.status === 'PATROLLING') return NPC_STATUS_COLORS.PATROLLING;
  if (npc.status === 'IDLE') return NPC_STATUS_COLORS.IDLE;

  // Morale-based coloring (if no specific status)
  if (npc.morale !== undefined) {
    if (npc.morale > 75) return NPC_STATUS_COLORS.HAPPY;
    if (npc.morale < 30) return NPC_STATUS_COLORS.UNHAPPY;
  }

  return NPC_STATUS_COLORS.DEFAULT;
}

/**
 * Get health bar color based on health percentage
 * @param {number} healthPercent - Health as percentage (0-1)
 * @returns {string} Color hex code
 */
export function getHealthBarColor(healthPercent) {
  if (healthPercent > 0.66) return HEALTH_BAR_COLORS.HIGH;
  if (healthPercent > 0.33) return HEALTH_BAR_COLORS.MEDIUM;
  return HEALTH_BAR_COLORS.LOW;
}

/**
 * Get animation state for NPC
 * @param {Object} npc - NPC object
 * @returns {string} Animation state
 */
export function getAnimationState(npc) {
  if (npc.isResting) return ANIMATION_STATES.RESTING;
  if (npc.isMoving) return ANIMATION_STATES.WALKING;
  if (npc.isWorking || npc.status === 'WORKING') return ANIMATION_STATES.WORKING;
  return ANIMATION_STATES.IDLE;
}

export default {
  NPC_SPRITE_DEFINITIONS,
  NPC_STATUS_COLORS,
  HEALTH_BAR_COLORS,
  ANIMATION_STATES,
  WALKING_ANIMATION_FRAMES,
  WORKING_ANIMATION_FRAMES,
  getSpriteForRole,
  getStatusColor,
  getHealthBarColor,
  getAnimationState,
};
