/**
 * Wildlife.js - Wildlife entity class
 *
 * Represents a wild animal in the game world with:
 * - Health and combat stats (for aggressive/neutral animals)
 * - AI state management
 * - Position and movement
 * - Herd membership
 */

import { AnimalBehavior, AnimalState, ActivityPattern } from '../modules/ai/WildlifeAISystem.js';

/**
 * Default animal type configurations
 */
const ANIMAL_TYPES = {
  // Passive animals
  DEER: {
    name: 'Deer',
    behavior: AnimalBehavior.PASSIVE,
    activity: ActivityPattern.CREPUSCULAR,
    health: 40,
    maxHealth: 40,
    moveSpeed: 80,
    fleeSpeed: 120,
    detectRange: 60,
    fleeRange: 100,
    color: '#8B4513',
    size: 1.2,
    icon: '🦌',
    loot: [
      { type: 'meat', chance: 1.0, quantity: [2, 4] },
      { type: 'hide', chance: 0.8, quantity: [1, 2] }
    ]
  },
  RABBIT: {
    name: 'Rabbit',
    behavior: AnimalBehavior.PASSIVE,
    activity: ActivityPattern.CREPUSCULAR,
    health: 10,
    maxHealth: 10,
    moveSpeed: 60,
    fleeSpeed: 100,
    detectRange: 40,
    fleeRange: 80,
    color: '#A0522D',
    size: 0.4,
    icon: '🐰',
    loot: [
      { type: 'meat', chance: 1.0, quantity: [1, 1] },
      { type: 'hide', chance: 0.5, quantity: [1, 1] }
    ]
  },
  SHEEP: {
    name: 'Sheep',
    behavior: AnimalBehavior.HERD,
    activity: ActivityPattern.DIURNAL,
    health: 30,
    maxHealth: 30,
    moveSpeed: 40,
    fleeSpeed: 60,
    detectRange: 30,
    fleeRange: 60,
    color: '#F5F5F5',
    size: 0.9,
    icon: '🐑',
    loot: [
      { type: 'meat', chance: 1.0, quantity: [1, 3] },
      { type: 'wool', chance: 1.0, quantity: [2, 4] }
    ]
  },
  // Neutral animals
  BEAR: {
    name: 'Bear',
    behavior: AnimalBehavior.NEUTRAL,
    activity: ActivityPattern.DIURNAL,
    health: 150,
    maxHealth: 150,
    damage: 25,
    defense: 10,
    moveSpeed: 50,
    attackSpeed: 70,
    attackRange: 2,
    detectRange: 50,
    aggroRange: 30,
    color: '#4A3728',
    size: 1.8,
    icon: '🐻',
    loot: [
      { type: 'meat', chance: 1.0, quantity: [4, 8] },
      { type: 'hide', chance: 1.0, quantity: [2, 3] },
      { type: 'bear_claw', chance: 0.3, quantity: [1, 2] }
    ],
    xpReward: 50
  },
  BOAR: {
    name: 'Boar',
    behavior: AnimalBehavior.NEUTRAL,
    activity: ActivityPattern.DIURNAL,
    health: 80,
    maxHealth: 80,
    damage: 15,
    defense: 5,
    moveSpeed: 60,
    attackSpeed: 80,
    attackRange: 1.5,
    detectRange: 40,
    aggroRange: 25,
    color: '#5C4033',
    size: 1.0,
    icon: '🐗',
    loot: [
      { type: 'meat', chance: 1.0, quantity: [2, 5] },
      { type: 'hide', chance: 0.7, quantity: [1, 2] },
      { type: 'tusk', chance: 0.2, quantity: [1, 2] }
    ],
    xpReward: 25
  },
  // Aggressive animals
  WOLF: {
    name: 'Wolf',
    behavior: AnimalBehavior.AGGRESSIVE,
    activity: ActivityPattern.NOCTURNAL,
    health: 60,
    maxHealth: 60,
    damage: 12,
    defense: 3,
    moveSpeed: 70,
    attackSpeed: 90,
    attackRange: 1.5,
    detectRange: 80,
    aggroRange: 60,
    color: '#696969',
    size: 1.1,
    icon: '🐺',
    loot: [
      { type: 'meat', chance: 1.0, quantity: [1, 3] },
      { type: 'hide', chance: 0.8, quantity: [1, 2] },
      { type: 'wolf_fang', chance: 0.25, quantity: [1, 1] }
    ],
    xpReward: 30
  },
  // Birds
  CHICKEN: {
    name: 'Chicken',
    behavior: AnimalBehavior.PASSIVE,
    activity: ActivityPattern.DIURNAL,
    health: 8,
    maxHealth: 8,
    moveSpeed: 30,
    fleeSpeed: 50,
    detectRange: 20,
    fleeRange: 40,
    color: '#FFD700',
    size: 0.3,
    icon: '🐔',
    loot: [
      { type: 'meat', chance: 1.0, quantity: [1, 2] },
      { type: 'feather', chance: 0.8, quantity: [1, 3] }
    ]
  },
  // Fish (for water areas)
  FISH: {
    name: 'Fish',
    behavior: AnimalBehavior.PASSIVE,
    activity: ActivityPattern.ALWAYS,
    health: 5,
    maxHealth: 5,
    moveSpeed: 40,
    fleeSpeed: 80,
    detectRange: 15,
    fleeRange: 30,
    color: '#4682B4',
    size: 0.3,
    icon: '🐟',
    loot: [
      { type: 'fish', chance: 1.0, quantity: [1, 1] }
    ]
  }
};

/**
 * Wildlife entity class
 */
export class Wildlife {
  /**
   * Create a new wildlife animal
   * @param {string} type - Animal type (e.g., 'DEER', 'WOLF')
   * @param {Object} position - Initial position {x, z}
   * @param {Object} options - Additional options
   */
  constructor(type, position, options = {}) {
    const config = ANIMAL_TYPES[type];
    if (!config) {
      throw new Error(`Unknown wildlife type: ${type}`);
    }

    // Core identity
    this.id = options.id || `wildlife_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.name = config.name;
    this.icon = config.icon;

    // Position and movement
    this.position = { ...position, y: 0 };
    this.velocity = { x: 0, z: 0 };
    this.facingAngle = Math.random() * Math.PI * 2;
    this.homePosition = { ...position };

    // Behavior configuration
    this.behavior = config.behavior;
    this.activity = config.activity;

    // Stats
    this.health = config.health;
    this.maxHealth = config.maxHealth;
    this.damage = config.damage || 0;
    this.defense = config.defense || 0;
    this.moveSpeed = config.moveSpeed;
    this.fleeSpeed = config.fleeSpeed || config.moveSpeed * 1.5;
    this.attackSpeed = config.attackSpeed || 0;
    this.attackRange = config.attackRange || 0;
    this.detectRange = config.detectRange;
    this.aggroRange = config.aggroRange || 0;
    this.fleeRange = config.fleeRange || config.detectRange * 2;

    // Visual
    this.color = config.color;
    this.size = config.size;

    // Loot and rewards
    this.loot = config.loot || [];
    this.xpReward = config.xpReward || 0;

    // AI state
    this.aiState = AnimalState.IDLE;
    this.targetId = null;
    this.lastAttackTime = 0;
    this.fleeTarget = null;

    // Herd data
    this.herdId = options.herdId || null;
    this.isHerdLeader = options.isHerdLeader || false;

    // State
    this.alive = true;
    this.spawnTime = Date.now();
    this.deathTime = null;
  }

  /**
   * Take damage
   * @param {number} amount - Damage amount
   * @returns {boolean} true if killed
   */
  takeDamage(amount) {
    if (!this.alive) return false;

    const actualDamage = Math.max(1, amount - this.defense);
    this.health -= actualDamage;

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.aiState = AnimalState.DEAD;
      this.deathTime = Date.now();
      return true;
    }

    // Passive animals flee when damaged
    if (this.behavior === AnimalBehavior.PASSIVE && this.aiState !== AnimalState.FLEEING) {
      this.aiState = AnimalState.FLEEING;
    }

    return false;
  }

  /**
   * Check if animal is currently active based on time of day
   * @param {number} hour - Current game hour (0-23)
   * @returns {boolean}
   */
  isActive(hour) {
    switch (this.activity) {
      case ActivityPattern.ALWAYS:
        return true;
      case ActivityPattern.DIURNAL:
        return hour >= 6 && hour < 20; // 6 AM - 8 PM
      case ActivityPattern.NOCTURNAL:
        return hour < 6 || hour >= 20; // 8 PM - 6 AM
      case ActivityPattern.CREPUSCULAR:
        return (hour >= 5 && hour < 8) || (hour >= 17 && hour < 21); // Dawn/dusk
      default:
        return true;
    }
  }

  /**
   * Generate loot drops
   * @returns {Array} Array of {type, quantity} objects
   */
  generateLoot() {
    const drops = [];
    for (const item of this.loot) {
      if (Math.random() <= item.chance) {
        const quantity = Array.isArray(item.quantity)
          ? Math.floor(Math.random() * (item.quantity[1] - item.quantity[0] + 1)) + item.quantity[0]
          : item.quantity;
        drops.push({ type: item.type, quantity });
      }
    }
    return drops;
  }

  /**
   * Serialize to JSON
   * @returns {Object} Serialized wildlife data
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      health: this.health,
      maxHealth: this.maxHealth,
      aiState: this.aiState,
      alive: this.alive,
      herdId: this.herdId,
      homePosition: this.homePosition
    };
  }

  /**
   * Create wildlife from JSON
   * @param {Object} data - Serialized wildlife data
   * @returns {Wildlife} Wildlife instance
   */
  static fromJSON(data) {
    const wildlife = new Wildlife(data.type, data.position, {
      id: data.id,
      herdId: data.herdId
    });
    wildlife.health = data.health;
    wildlife.aiState = data.aiState;
    wildlife.alive = data.alive;
    wildlife.homePosition = data.homePosition;
    return wildlife;
  }

  /**
   * Get all available animal types
   * @returns {Object}
   */
  static getAnimalTypes() {
    return { ...ANIMAL_TYPES };
  }
}

export default Wildlife;
