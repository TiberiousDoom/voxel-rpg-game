/**
 * sprite-manifest.js
 * Central registry of all sprite assets
 *
 * Defines paths, frame counts, and dimensions for all game sprites
 */

/**
 * NPC Sprite Manifest
 * Defines sprite sheets for all NPC roles
 *
 * Format:
 * - idle: Single frame or 1-2 frame animation
 * - walk: 4-frame walking animation
 * - work: 4-frame working animation
 */
export const NPC_SPRITE_MANIFEST = {
  FARMER: {
    idle: '/assets/sprites/npcs/farmer/idle.png',
    walk: '/assets/sprites/npcs/farmer/walk.png',
    work: '/assets/sprites/npcs/farmer/work.png',
    frames: {
      idle: 1,
      walk: 4,
      work: 4
    },
    frameSize: {
      width: 16,
      height: 16
    }
  },

  GUARD: {
    idle: '/assets/sprites/npcs/guard/idle.png',
    walk: '/assets/sprites/npcs/guard/walk.png',
    work: '/assets/sprites/npcs/guard/work.png',
    frames: {
      idle: 1,
      walk: 4,
      work: 4
    },
    frameSize: {
      width: 16,
      height: 16
    }
  },

  WORKER: {
    idle: '/assets/sprites/npcs/worker/idle.png',
    walk: '/assets/sprites/npcs/worker/walk.png',
    work: '/assets/sprites/npcs/worker/work.png',
    frames: {
      idle: 1,
      walk: 4,
      work: 4
    },
    frameSize: {
      width: 16,
      height: 16
    }
  },

  CRAFTSMAN: {
    idle: '/assets/sprites/npcs/craftsman/idle.png',
    walk: '/assets/sprites/npcs/craftsman/walk.png',
    work: '/assets/sprites/npcs/craftsman/work.png',
    frames: {
      idle: 1,
      walk: 4,
      work: 4
    },
    frameSize: {
      width: 16,
      height: 16
    }
  },

  MINER: {
    idle: '/assets/sprites/npcs/miner/idle.png',
    walk: '/assets/sprites/npcs/miner/walk.png',
    work: '/assets/sprites/npcs/miner/work.png',
    frames: {
      idle: 1,
      walk: 4,
      work: 4
    },
    frameSize: {
      width: 16,
      height: 16
    }
  },

  MERCHANT: {
    idle: '/assets/sprites/npcs/merchant/idle.png',
    walk: '/assets/sprites/npcs/merchant/walk.png',
    work: '/assets/sprites/npcs/merchant/work.png',
    frames: {
      idle: 1,
      walk: 4,
      work: 4
    },
    frameSize: {
      width: 16,
      height: 16
    }
  }
};

/**
 * Building Sprite Manifest
 * Defines sprites for all building types
 *
 * Format:
 * - Single sprite per building (can be extended for states)
 */
export const BUILDING_SPRITE_MANIFEST = {
  FARM: {
    sprites: {
      default: '/assets/sprites/buildings/farm.png'
    },
    size: {
      width: 40,
      height: 40
    }
  },

  HOUSE: {
    sprites: {
      default: '/assets/sprites/buildings/house.png'
    },
    size: {
      width: 40,
      height: 40
    }
  },

  WAREHOUSE: {
    sprites: {
      default: '/assets/sprites/buildings/warehouse.png'
    },
    size: {
      width: 40,
      height: 40
    }
  },

  TOWN_CENTER: {
    sprites: {
      default: '/assets/sprites/buildings/town_center.png'
    },
    size: {
      width: 40,
      height: 40
    }
  },

  WATCHTOWER: {
    sprites: {
      default: '/assets/sprites/buildings/watchtower.png'
    },
    size: {
      width: 40,
      height: 40
    }
  },

  CAMPFIRE: {
    sprites: {
      default: '/assets/sprites/buildings/campfire.png'
    },
    size: {
      width: 40,
      height: 40
    }
  },

  MARKET: {
    sprites: {
      default: '/assets/sprites/buildings/market.png'
    },
    size: {
      width: 40,
      height: 40
    }
  },

  CASTLE: {
    sprites: {
      default: '/assets/sprites/buildings/castle.png'
    },
    size: {
      width: 40,
      height: 40
    }
  }
};

/**
 * Player Sprite Manifest
 * Defines sprite sheets for the player character
 *
 * Format:
 * - idle: 1 frame
 * - walk: 4-frame walking animation
 * - sprint: 4-frame sprinting animation
 */
export const PLAYER_SPRITE_MANIFEST = {
  idle: '/assets/sprites/player/idle.png',
  walk: '/assets/sprites/player/walk.png',
  sprint: '/assets/sprites/player/sprint.png',
  frames: {
    idle: 1,
    walk: 4,
    sprint: 4
  },
  frameSize: {
    width: 16,
    height: 16
  }
};

/**
 * Get sprite manifest for a specific entity type
 *
 * @param {string} type - Entity type ('npc', 'building', 'player')
 * @returns {Object}
 */
export function getSpriteManifest(type) {
  const manifests = {
    'npc': NPC_SPRITE_MANIFEST,
    'building': BUILDING_SPRITE_MANIFEST,
    'player': PLAYER_SPRITE_MANIFEST
  };

  return manifests[type] || null;
}

/**
 * Get sprite path for a specific entity
 *
 * @param {string} entityType - Type of entity ('npc', 'building', 'player')
 * @param {string} entityId - Specific entity ID (e.g., 'FARMER', 'FARM')
 * @param {string} state - Animation state or sprite variant (e.g., 'idle', 'walk', 'default')
 * @returns {string|null}
 */
export function getSpritePath(entityType, entityId, state = 'default') {
  const manifest = getSpriteManifest(entityType);

  if (!manifest) return null;

  if (entityType === 'player') {
    return manifest[state] || null;
  }

  if (entityType === 'npc') {
    const npcData = manifest[entityId];
    return npcData ? npcData[state] : null;
  }

  if (entityType === 'building') {
    const buildingData = manifest[entityId];
    return buildingData && buildingData.sprites ? buildingData.sprites[state] : null;
  }

  return null;
}

/**
 * Get frame count for an animation
 *
 * @param {string} entityType - Type of entity
 * @param {string} entityId - Specific entity ID
 * @param {string} state - Animation state
 * @returns {number}
 */
export function getFrameCount(entityType, entityId, state) {
  const manifest = getSpriteManifest(entityType);

  if (!manifest) return 1;

  if (entityType === 'player') {
    return manifest.frames ? manifest.frames[state] || 1 : 1;
  }

  if (entityType === 'npc') {
    const npcData = manifest[entityId];
    return npcData && npcData.frames ? npcData.frames[state] || 1 : 1;
  }

  return 1;
}

/**
 * Get frame size for an entity
 *
 * @param {string} entityType - Type of entity
 * @param {string} entityId - Specific entity ID
 * @returns {Object} { width, height }
 */
export function getFrameSize(entityType, entityId) {
  const manifest = getSpriteManifest(entityType);

  if (!manifest) return { width: 16, height: 16 };

  if (entityType === 'player') {
    return manifest.frameSize || { width: 16, height: 16 };
  }

  if (entityType === 'npc') {
    const npcData = manifest[entityId];
    return npcData && npcData.frameSize ? npcData.frameSize : { width: 16, height: 16 };
  }

  if (entityType === 'building') {
    const buildingData = manifest[entityId];
    return buildingData && buildingData.size ? buildingData.size : { width: 40, height: 40 };
  }

  return { width: 16, height: 16 };
}

export default {
  NPC_SPRITE_MANIFEST,
  BUILDING_SPRITE_MANIFEST,
  PLAYER_SPRITE_MANIFEST,
  getSpriteManifest,
  getSpritePath,
  getFrameCount,
  getFrameSize
};
