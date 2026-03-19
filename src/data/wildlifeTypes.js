/**
 * wildlifeTypes.js — Definitions for all ambient wildlife animals.
 *
 * Each type specifies rendering, behavior, and spawning properties.
 * hp/xp are stored for future combat integration but unused for now.
 */

export const WILDLIFE_TYPES = {
  DEER:     { name: 'Deer',     size: [1.2, 1.6, 0.6], speed: 3.5, fleeRange: 16, biomes: ['forest', 'plains'], nocturnal: false, ground: true,  color: [0.6, 0.45, 0.3],   hp: 20, xp: 15 },
  RACCOON:  { name: 'Raccoon',  size: [0.6, 0.5, 0.4], speed: 2.5, fleeRange: 10, biomes: ['forest'],           nocturnal: true,  ground: true,  color: [0.4, 0.4, 0.42],   hp: 10, xp: 8  },
  BEAVER:   { name: 'Beaver',   size: [0.7, 0.5, 0.5], speed: 1.8, fleeRange: 12, biomes: ['wetland'],          nocturnal: false, ground: true,  color: [0.45, 0.3, 0.2],   hp: 15, xp: 10 },
  SKUNK:    { name: 'Skunk',    size: [0.5, 0.4, 0.3], speed: 1.5, fleeRange: 8,  biomes: ['forest', 'plains'], nocturnal: true,  ground: true,  color: [0.15, 0.15, 0.15], hp: 8,  xp: 5  },
  OPOSSUM:  { name: 'Opossum',  size: [0.5, 0.4, 0.3], speed: 1.8, fleeRange: 10, biomes: ['forest'],           nocturnal: true,  ground: true,  color: [0.55, 0.55, 0.5],  hp: 8,  xp: 5  },
  MOLE:     { name: 'Mole',     size: [0.3, 0.25, 0.25], speed: 1.0, fleeRange: 6, biomes: ['plains', 'forest'], nocturnal: false, ground: true, color: [0.35, 0.25, 0.2],  hp: 5,  xp: 3  },
  BEAR:     { name: 'Bear',     size: [1.4, 1.4, 1.0], speed: 3.0, fleeRange: 0,  biomes: ['forest'],           nocturnal: false, ground: true,  color: [0.35, 0.22, 0.12], hp: 60, xp: 40 },
  WOLF:     { name: 'Wolf',     size: [1.0, 0.9, 0.5], speed: 4.0, fleeRange: 0,  biomes: ['forest', 'snow'],   nocturnal: false, ground: true,  color: [0.5, 0.5, 0.52],   hp: 30, xp: 25 },
  PUMA:     { name: 'Puma',     size: [1.1, 0.8, 0.5], speed: 4.5, fleeRange: 0,  biomes: ['forest', 'plains'], nocturnal: true,  ground: true,  color: [0.65, 0.5, 0.35],  hp: 35, xp: 30 },
  BAT:      { name: 'Bat',      size: [0.4, 0.3, 0.15], speed: 3.0, fleeRange: 12, biomes: ['all'],             nocturnal: true,  ground: false, color: [0.2, 0.18, 0.2],   hp: 5,  xp: 3  },
  CROW:     { name: 'Crow',     size: [0.4, 0.3, 0.3], speed: 3.5, fleeRange: 14, biomes: ['all'],              nocturnal: false, ground: false, color: [0.1, 0.1, 0.12],   hp: 5,  xp: 3  },
  SQUIRREL: { name: 'Squirrel', size: [0.35, 0.35, 0.25], speed: 3.0, fleeRange: 12, biomes: ['forest'],        nocturnal: false, ground: true,  color: [0.55, 0.35, 0.2],  hp: 5,  xp: 3  },
};

// Pre-computed list of all type keys for random selection
export const WILDLIFE_TYPE_KEYS = Object.keys(WILDLIFE_TYPES);
