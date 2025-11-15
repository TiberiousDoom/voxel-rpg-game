/**
 * building-icons.js - Building icon and visual asset definitions
 *
 * This file defines the visual representation for each building type,
 * including icons, colors, textures, and visual effects.
 *
 * Part of WF3: Building Rendering & Visual Effects
 */

import { BUILDING_TYPES, BUILDING_TIERS } from '../shared/config.js';

/**
 * Building icon definitions
 * Each building has multiple visual representations based on state
 */
export const BUILDING_ICONS = {
  [BUILDING_TYPES.WALL]: {
    name: 'Wall',
    icon: '🧱',
    emoji: '🧱',
    symbol: 'W',
    colors: {
      preview: '#cccccc',
      blueprint: 'rgba(150, 150, 150, 0.5)',
      construction: 'rgba(136, 136, 136, 0.7)',
      complete: '#888888',
      damaged: '#606060',
      destroyed: '#2a2a2a'
    },
    tier: BUILDING_TIERS.SURVIVAL,
    size: 'small'
  },

  [BUILDING_TYPES.DOOR]: {
    name: 'Door',
    icon: '🚪',
    emoji: '🚪',
    symbol: 'D',
    colors: {
      preview: '#d4a574',
      blueprint: 'rgba(212, 165, 116, 0.5)',
      construction: 'rgba(184, 134, 11, 0.7)',
      complete: '#8b4513',
      damaged: '#654321',
      destroyed: '#3a2817'
    },
    tier: BUILDING_TIERS.SURVIVAL,
    size: 'small'
  },

  [BUILDING_TYPES.CHEST]: {
    name: 'Chest',
    icon: '📦',
    emoji: '📦',
    symbol: 'C',
    colors: {
      preview: '#c0a080',
      blueprint: 'rgba(192, 160, 128, 0.5)',
      construction: 'rgba(184, 134, 11, 0.7)',
      complete: '#8b4513',
      damaged: '#654321',
      destroyed: '#3a2817'
    },
    tier: BUILDING_TIERS.SURVIVAL,
    size: 'small'
  },

  [BUILDING_TYPES.TOWER]: {
    name: 'Tower',
    icon: '🗼',
    emoji: '🗼',
    symbol: 'T',
    colors: {
      preview: '#666666',
      blueprint: 'rgba(102, 102, 102, 0.5)',
      construction: 'rgba(74, 74, 74, 0.7)',
      complete: '#4a4a4a',
      damaged: '#2a2a2a',
      destroyed: '#1a1a1a'
    },
    tier: BUILDING_TIERS.PERMANENT,
    size: 'medium'
  },

  [BUILDING_TYPES.WATCHTOWER]: {
    name: 'Watchtower',
    icon: '🏰',
    emoji: '🏰',
    symbol: 'WT',
    colors: {
      preview: '#556b2f',
      blueprint: 'rgba(85, 107, 47, 0.5)',
      construction: 'rgba(68, 68, 68, 0.7)',
      complete: '#444444',
      damaged: '#2a2a2a',
      destroyed: '#1a1a1a'
    },
    tier: BUILDING_TIERS.PERMANENT,
    size: 'medium'
  },

  [BUILDING_TYPES.GUARD_POST]: {
    name: 'Guard Post',
    icon: '🛡️',
    emoji: '🛡️',
    symbol: 'GP',
    colors: {
      preview: '#8b5a3c',
      blueprint: 'rgba(139, 90, 60, 0.5)',
      construction: 'rgba(101, 67, 33, 0.7)',
      complete: '#654321',
      damaged: '#4a3728',
      destroyed: '#2a1f16'
    },
    tier: BUILDING_TIERS.PERMANENT,
    size: 'medium'
  },

  [BUILDING_TYPES.CRAFTING_STATION]: {
    name: 'Crafting Station',
    icon: '🔨',
    emoji: '🔨',
    symbol: 'CS',
    colors: {
      preview: '#cd853f',
      blueprint: 'rgba(205, 133, 63, 0.5)',
      construction: 'rgba(184, 134, 11, 0.7)',
      complete: '#8b4513',
      damaged: '#654321',
      destroyed: '#3a2817'
    },
    tier: BUILDING_TIERS.TOWN,
    size: 'medium'
  },

  [BUILDING_TYPES.STORAGE_BUILDING]: {
    name: 'Storage Building',
    icon: '🏚️',
    emoji: '🏚️',
    symbol: 'SB',
    colors: {
      preview: '#a0522d',
      blueprint: 'rgba(160, 82, 45, 0.5)',
      construction: 'rgba(139, 69, 19, 0.7)',
      complete: '#8b4513',
      damaged: '#654321',
      destroyed: '#3a2817'
    },
    tier: BUILDING_TIERS.TOWN,
    size: 'large'
  },

  [BUILDING_TYPES.BARRACKS]: {
    name: 'Barracks',
    icon: '⚔️',
    emoji: '⚔️',
    symbol: 'B',
    colors: {
      preview: '#556b2f',
      blueprint: 'rgba(85, 107, 47, 0.5)',
      construction: 'rgba(74, 74, 74, 0.7)',
      complete: '#4a4a4a',
      damaged: '#2a2a2a',
      destroyed: '#1a1a1a'
    },
    tier: BUILDING_TIERS.TOWN,
    size: 'large'
  },

  [BUILDING_TYPES.MARKETPLACE]: {
    name: 'Marketplace',
    icon: '🏪',
    emoji: '🏪',
    symbol: 'M',
    colors: {
      preview: '#d4af37',
      blueprint: 'rgba(212, 175, 55, 0.5)',
      construction: 'rgba(255, 215, 0, 0.7)',
      complete: '#ffd700',
      damaged: '#daa520',
      destroyed: '#8b7500'
    },
    tier: BUILDING_TIERS.TOWN,
    size: 'large'
  },

  [BUILDING_TYPES.FORTRESS]: {
    name: 'Fortress',
    icon: '🏛️',
    emoji: '🏛️',
    symbol: 'F',
    colors: {
      preview: '#4a4a4a',
      blueprint: 'rgba(74, 74, 74, 0.5)',
      construction: 'rgba(42, 42, 42, 0.7)',
      complete: '#2a2a2a',
      damaged: '#1a1a1a',
      destroyed: '#0a0a0a'
    },
    tier: BUILDING_TIERS.CASTLE,
    size: 'xlarge'
  },

  [BUILDING_TYPES.CASTLE]: {
    name: 'Castle',
    icon: '🏰',
    emoji: '🏰',
    symbol: 'K',
    colors: {
      preview: '#2a2a2a',
      blueprint: 'rgba(42, 42, 42, 0.5)',
      construction: 'rgba(26, 26, 26, 0.7)',
      complete: '#1a1a1a',
      damaged: '#0a0a0a',
      destroyed: '#000000'
    },
    tier: BUILDING_TIERS.CASTLE,
    size: 'xlarge'
  }
};

/**
 * Texture overlay patterns for building states
 */
export const TEXTURE_OVERLAYS = {
  CRACKS: {
    light: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Cpath d=\'M0 20 L10 10 L20 20 L30 15\' stroke=\'%23000\' stroke-width=\'1\' fill=\'none\' opacity=\'0.3\'/%3E%3C/svg%3E")',
    medium: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Cpath d=\'M0 20 L10 10 L20 20 L30 15 M5 30 L15 25 L25 35\' stroke=\'%23000\' stroke-width=\'2\' fill=\'none\' opacity=\'0.5\'/%3E%3C/svg%3E")',
    heavy: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Cpath d=\'M0 20 L10 10 L20 20 L30 15 M5 30 L15 25 L25 35 M10 5 L20 15\' stroke=\'%23000\' stroke-width=\'3\' fill=\'none\' opacity=\'0.7\'/%3E%3C/svg%3E")'
  },
  RUBBLE: {
    light: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
    medium: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(0,0,0,0.2) 1px, rgba(0,0,0,0.2) 3px)',
    heavy: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(0,0,0,0.4) 1px, rgba(0,0,0,0.4) 2px)'
  },
  BLUEPRINT_GRID: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 5px)',
  CONSTRUCTION_PATTERN: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 10px, transparent 10px, transparent 20px)'
};

/**
 * Shadow and depth effect configurations
 */
export const SHADOW_EFFECTS = {
  small: {
    offsetX: 2,
    offsetY: 2,
    blur: 4,
    color: 'rgba(0, 0, 0, 0.3)'
  },
  medium: {
    offsetX: 3,
    offsetY: 3,
    blur: 6,
    color: 'rgba(0, 0, 0, 0.4)'
  },
  large: {
    offsetX: 4,
    offsetY: 4,
    blur: 8,
    color: 'rgba(0, 0, 0, 0.5)'
  },
  xlarge: {
    offsetX: 6,
    offsetY: 6,
    blur: 12,
    color: 'rgba(0, 0, 0, 0.6)'
  }
};

/**
 * Get the icon definition for a building type
 * @param {string} buildingType - The building type constant
 * @returns {object} The icon definition
 */
export function getBuildingIcon(buildingType) {
  return BUILDING_ICONS[buildingType] || {
    name: 'Unknown',
    icon: '❓',
    emoji: '❓',
    symbol: '?',
    colors: {
      preview: '#cccccc',
      blueprint: 'rgba(204, 204, 204, 0.5)',
      construction: 'rgba(153, 153, 153, 0.7)',
      complete: '#999999',
      damaged: '#666666',
      destroyed: '#333333'
    },
    tier: BUILDING_TIERS.SURVIVAL,
    size: 'small'
  };
}

/**
 * Get the color for a building based on its state
 * @param {string} buildingType - The building type
 * @param {string} state - The building state (BLUEPRINT, UNDER_CONSTRUCTION, COMPLETE, DAMAGED, DESTROYED)
 * @returns {string} The color hex/rgba string
 */
export function getBuildingColor(buildingType, state = 'COMPLETE') {
  const icon = getBuildingIcon(buildingType);
  const stateKey = state.toLowerCase().replace('_', '');

  // Map state names to color keys
  const stateMap = {
    'blueprint': 'blueprint',
    'underconstruction': 'construction',
    'building': 'construction',
    'complete': 'complete',
    'completed': 'complete',
    'damaged': 'damaged',
    'destroyed': 'destroyed'
  };

  const colorKey = stateMap[stateKey] || 'complete';
  return icon.colors[colorKey] || icon.colors.complete;
}

/**
 * Get the appropriate texture overlay for a building state
 * @param {string} state - Building state
 * @param {number} healthPercent - Health percentage (0-1)
 * @returns {string|null} CSS background pattern or null
 */
export function getTextureOverlay(state, healthPercent = 1) {
  if (state === 'BLUEPRINT') {
    return TEXTURE_OVERLAYS.BLUEPRINT_GRID;
  }

  if (state === 'UNDER_CONSTRUCTION' || state === 'BUILDING') {
    return TEXTURE_OVERLAYS.CONSTRUCTION_PATTERN;
  }

  if (state === 'DAMAGED' || healthPercent < 1) {
    if (healthPercent > 0.6) {
      return TEXTURE_OVERLAYS.CRACKS.light;
    } else if (healthPercent > 0.3) {
      return TEXTURE_OVERLAYS.CRACKS.medium;
    } else {
      return TEXTURE_OVERLAYS.CRACKS.heavy;
    }
  }

  if (state === 'DESTROYED') {
    return TEXTURE_OVERLAYS.RUBBLE.heavy;
  }

  return null;
}

/**
 * Get shadow configuration based on building size
 * @param {string} buildingType - The building type
 * @returns {object} Shadow effect configuration
 */
export function getShadowEffect(buildingType) {
  const icon = getBuildingIcon(buildingType);
  return SHADOW_EFFECTS[icon.size] || SHADOW_EFFECTS.small;
}

/**
 * Generate CSS box-shadow string from shadow config
 * @param {object} shadowConfig - Shadow configuration object
 * @returns {string} CSS box-shadow value
 */
export function generateShadowCSS(shadowConfig) {
  return `${shadowConfig.offsetX}px ${shadowConfig.offsetY}px ${shadowConfig.blur}px ${shadowConfig.color}`;
}

/**
 * Export all building types with their visual data
 */
export const ALL_BUILDING_VISUALS = Object.keys(BUILDING_TYPES).map(key => ({
  type: BUILDING_TYPES[key],
  ...getBuildingIcon(BUILDING_TYPES[key])
}));
