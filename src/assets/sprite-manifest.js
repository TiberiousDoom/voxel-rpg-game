/**
 * sprite-manifest.js
 * Central registry of all sprite assets
 *
 * Defines paths, frame counts, and dimensions for all game sprites
 */

/**
 * Helper to get the public URL prefix for assets
 * This ensures assets load correctly on GitHub Pages deployments
 */
const PUBLIC_URL = process.env.PUBLIC_URL || '';

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
    idle: `${PUBLIC_URL}/assets/sprites/npcs/farmer/idle.png`,
    walk: `${PUBLIC_URL}/assets/sprites/npcs/farmer/walk.png`,
    work: `${PUBLIC_URL}/assets/sprites/npcs/farmer/work.png`,
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
    idle: `${PUBLIC_URL}/assets/sprites/npcs/guard/idle.png`,
    walk: `${PUBLIC_URL}/assets/sprites/npcs/guard/walk.png`,
    work: `${PUBLIC_URL}/assets/sprites/npcs/guard/work.png`,
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
    idle: `${PUBLIC_URL}/assets/sprites/npcs/worker/idle.png`,
    walk: `${PUBLIC_URL}/assets/sprites/npcs/worker/walk.png`,
    work: `${PUBLIC_URL}/assets/sprites/npcs/worker/work.png`,
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
    idle: `${PUBLIC_URL}/assets/sprites/npcs/craftsman/idle.png`,
    walk: `${PUBLIC_URL}/assets/sprites/npcs/craftsman/walk.png`,
    work: `${PUBLIC_URL}/assets/sprites/npcs/craftsman/work.png`,
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
    idle: `${PUBLIC_URL}/assets/sprites/npcs/miner/idle.png`,
    walk: `${PUBLIC_URL}/assets/sprites/npcs/miner/walk.png`,
    work: `${PUBLIC_URL}/assets/sprites/npcs/miner/work.png`,
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
    idle: `${PUBLIC_URL}/assets/sprites/npcs/merchant/idle.png`,
    walk: `${PUBLIC_URL}/assets/sprites/npcs/merchant/walk.png`,
    work: `${PUBLIC_URL}/assets/sprites/npcs/merchant/work.png`,
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
 * Monster Sprite Manifest
 * Defines sprites for all monster types
 *
 * Format:
 * - Single sprite per monster type (static image)
 */
export const MONSTER_SPRITE_MANIFEST = {
  SLIME: {
    sprite: `${PUBLIC_URL}/assets/sprites/monsters/slime.png`,
    size: { width: 16, height: 16 }
  },
  GOBLIN: {
    sprite: `${PUBLIC_URL}/assets/sprites/monsters/goblin.png`,
    size: { width: 16, height: 16 }
  },
  WOLF: {
    sprite: `${PUBLIC_URL}/assets/sprites/monsters/wolf.png`,
    size: { width: 20, height: 20 }
  },
  SKELETON: {
    sprite: `${PUBLIC_URL}/assets/sprites/monsters/skeleton.png`,
    size: { width: 18, height: 18 }
  },
  ORC: {
    sprite: `${PUBLIC_URL}/assets/sprites/monsters/orc.png`,
    size: { width: 20, height: 20 }
  }
};

/**
 * Wildlife Sprite Manifest
 * Defines sprites for all wildlife animal types
 *
 * Format:
 * - Single sprite per animal type (static image)
 */
export const WILDLIFE_SPRITE_MANIFEST = {
  DEER: {
    sprite: `${PUBLIC_URL}/assets/sprites/wildlife/deer.png`,
    size: { width: 16, height: 16 }
  },
  RABBIT: {
    sprite: `${PUBLIC_URL}/assets/sprites/wildlife/rabbit.png`,
    size: { width: 16, height: 16 }
  },
  SHEEP: {
    sprite: `${PUBLIC_URL}/assets/sprites/wildlife/sheep.png`,
    size: { width: 16, height: 16 }
  },
  BEAR: {
    sprite: `${PUBLIC_URL}/assets/sprites/wildlife/bear.png`,
    size: { width: 16, height: 16 }
  },
  BOAR: {
    sprite: `${PUBLIC_URL}/assets/sprites/wildlife/boar.png`,
    size: { width: 16, height: 16 }
  },
  WOLF: {
    sprite: `${PUBLIC_URL}/assets/sprites/wildlife/wolf.png`,
    size: { width: 16, height: 16 }
  }
};

/**
 * Environment Sprite Manifest
 * Defines sprites for environmental props (trees, rocks, ores, plants)
 *
 * Format:
 * - Single sprite per prop type (static image)
 * - Variants without specific sprites fallback to similar assets
 */
export const ENVIRONMENT_SPRITE_MANIFEST = {
  // === TREES ===
  tree_oak: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/trees/tree_oak.png`,
    size: { width: 40, height: 40 }
  },
  tree_pine: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/trees/tree_pine.png`,
    size: { width: 40, height: 40 }
  },
  tree_birch: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/trees/tree_oak.png`, // fallback
    size: { width: 40, height: 40 }
  },
  tree_dead: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/trees/tree_pine.png`, // fallback
    size: { width: 40, height: 40 }
  },
  tree_swamp: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/trees/tree_oak.png`, // fallback
    size: { width: 40, height: 40 }
  },
  tree: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/trees/tree_oak.png`, // generic tree
    size: { width: 40, height: 40 }
  },

  // === ROCKS ===
  rock: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/rocks/rock.png`,
    size: { width: 40, height: 40 }
  },
  rock_small: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/rocks/rock.png`,
    size: { width: 40, height: 40 }
  },
  rock_large: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/rocks/rock.png`,
    size: { width: 40, height: 40 }
  },
  rock_moss: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/rocks/rock.png`, // fallback
    size: { width: 40, height: 40 }
  },
  rock_ice: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/rocks/rock.png`, // fallback
    size: { width: 40, height: 40 }
  },
  rock_desert: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/rocks/rock.png`, // fallback
    size: { width: 40, height: 40 }
  },

  // === ORES ===
  ore_iron: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/ores/ore_iron.png`,
    size: { width: 40, height: 40 }
  },
  ore_gold: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/ores/ore_gold.png`,
    size: { width: 40, height: 40 }
  },
  ore_crystal: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/ores/ore_crystal.png`,
    size: { width: 40, height: 40 }
  },
  ore_copper: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/ores/ore_iron.png`, // fallback
    size: { width: 40, height: 40 }
  },
  ore_vein: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/ores/ore_iron.png`, // generic ore
    size: { width: 40, height: 40 }
  },

  // === BUSHES ===
  bush: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/bush.png`,
    size: { width: 40, height: 40 }
  },
  bush_berry: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/bush_berry.png`,
    size: { width: 40, height: 40 }
  },
  bush_dead: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/bush.png`, // fallback
    size: { width: 40, height: 40 }
  },

  // === HERBS ===
  herb: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/grass_clump.png`, // fallback
    size: { width: 40, height: 40 }
  },
  herb_medicinal: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/grass_clump.png`, // fallback
    size: { width: 40, height: 40 }
  },
  herb_magical: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/flower_wildflower.png`, // fallback
    size: { width: 40, height: 40 }
  },

  // === MUSHROOMS ===
  mushroom: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/mushroom_red.png`,
    size: { width: 40, height: 40 }
  },
  mushroom_red: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/mushroom_red.png`,
    size: { width: 40, height: 40 }
  },
  mushroom_brown: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/mushroom_red.png`, // fallback
    size: { width: 40, height: 40 }
  },
  mushroom_poison: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/mushroom_red.png`, // fallback
    size: { width: 40, height: 40 }
  },
  mushroom_glowing: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/mushroom_red.png`, // fallback
    size: { width: 40, height: 40 }
  },

  // === FLOWERS ===
  flower: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/flower_wildflower.png`,
    size: { width: 40, height: 40 }
  },
  flower_wildflower: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/flower_wildflower.png`,
    size: { width: 40, height: 40 }
  },
  flower_daisy: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/flower_wildflower.png`, // fallback
    size: { width: 40, height: 40 }
  },

  // === GRASS & VEGETATION ===
  grass_clump: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/grass_clump.png`,
    size: { width: 40, height: 40 }
  },
  grass: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/grass_clump.png`,
    size: { width: 40, height: 40 }
  },
  vine: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/grass_clump.png`, // fallback
    size: { width: 40, height: 40 }
  },
  vine_hanging: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/grass_clump.png`, // fallback
    size: { width: 40, height: 40 }
  },

  // === CACTI (desert) ===
  cactus: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/bush.png`, // fallback
    size: { width: 40, height: 40 }
  },
  cactus_saguaro: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/bush.png`, // fallback
    size: { width: 40, height: 40 }
  },
  cactus_barrel: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/bush.png`, // fallback
    size: { width: 40, height: 40 }
  },

  // === WATER PLANTS ===
  reed: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/grass_clump.png`, // fallback
    size: { width: 40, height: 40 }
  },
  reed_cattail: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/grass_clump.png`, // fallback
    size: { width: 40, height: 40 }
  },
  lily: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/flower_wildflower.png`, // fallback
    size: { width: 40, height: 40 }
  },
  lily_water: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/plants/flower_wildflower.png`, // fallback
    size: { width: 40, height: 40 }
  },

  // === MISCELLANEOUS ===
  bones: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/rocks/rock.png`, // fallback
    size: { width: 40, height: 40 }
  },
  bones_skeleton: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/rocks/rock.png`, // fallback
    size: { width: 40, height: 40 }
  },
  log_fallen: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/trees/tree_pine.png`, // fallback
    size: { width: 40, height: 40 }
  },
  ice_crystal: {
    sprite: `${PUBLIC_URL}/assets/sprites/environment/ores/ore_crystal.png`, // fallback
    size: { width: 40, height: 40 }
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
      default: `${PUBLIC_URL}/assets/sprites/buildings/farm.png`
    },
    size: {
      width: 40,
      height: 40
    }
  },

  HOUSE: {
    sprites: {
      default: `${PUBLIC_URL}/assets/sprites/buildings/house.png`
    },
    size: {
      width: 40,
      height: 40
    }
  },

  WAREHOUSE: {
    sprites: {
      default: `${PUBLIC_URL}/assets/sprites/buildings/warehouse.png`
    },
    size: {
      width: 40,
      height: 40
    }
  },

  TOWN_CENTER: {
    sprites: {
      default: `${PUBLIC_URL}/assets/sprites/buildings/town_center.png`
    },
    size: {
      width: 40,
      height: 40
    }
  },

  WATCHTOWER: {
    sprites: {
      default: `${PUBLIC_URL}/assets/sprites/buildings/watchtower.png`
    },
    size: {
      width: 40,
      height: 40
    }
  },

  CAMPFIRE: {
    sprites: {
      default: `${PUBLIC_URL}/assets/sprites/buildings/campfire.png`
    },
    size: {
      width: 40,
      height: 40
    }
  },

  MARKET: {
    sprites: {
      default: `${PUBLIC_URL}/assets/sprites/buildings/market.png`
    },
    size: {
      width: 40,
      height: 40
    }
  },

  CASTLE: {
    sprites: {
      default: `${PUBLIC_URL}/assets/sprites/buildings/castle.png`
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
  idle: `${PUBLIC_URL}/assets/sprites/player/idle.png`,
  walk: `${PUBLIC_URL}/assets/sprites/player/walk.png`,
  sprint: `${PUBLIC_URL}/assets/sprites/player/sprint.png`,
  frames: {
    idle: 1,
    walk: 4,
    sprint: 4
  },
  frameSize: {
    width: 32,
    height: 32
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
    'player': PLAYER_SPRITE_MANIFEST,
    'monster': MONSTER_SPRITE_MANIFEST,
    'wildlife': WILDLIFE_SPRITE_MANIFEST,
    'environment': ENVIRONMENT_SPRITE_MANIFEST
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

  if (entityType === 'monster') {
    const monsterData = manifest[entityId];
    return monsterData ? monsterData.sprite : null;
  }

  if (entityType === 'wildlife') {
    const wildlifeData = manifest[entityId];
    return wildlifeData ? wildlifeData.sprite : null;
  }

  if (entityType === 'environment') {
    const envData = manifest[entityId];
    return envData ? envData.sprite : null;
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

  if (entityType === 'monster') {
    const monsterData = manifest[entityId];
    return monsterData && monsterData.size ? monsterData.size : { width: 16, height: 16 };
  }

  if (entityType === 'wildlife') {
    const wildlifeData = manifest[entityId];
    return wildlifeData && wildlifeData.size ? wildlifeData.size : { width: 16, height: 16 };
  }

  if (entityType === 'environment') {
    const envData = manifest[entityId];
    return envData && envData.size ? envData.size : { width: 40, height: 40 };
  }

  return { width: 16, height: 16 };
}

const spriteManifestExports = {
  NPC_SPRITE_MANIFEST,
  BUILDING_SPRITE_MANIFEST,
  PLAYER_SPRITE_MANIFEST,
  MONSTER_SPRITE_MANIFEST,
  WILDLIFE_SPRITE_MANIFEST,
  ENVIRONMENT_SPRITE_MANIFEST,
  getSpriteManifest,
  getSpritePath,
  getFrameCount,
  getFrameSize
};

export default spriteManifestExports;
