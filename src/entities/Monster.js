/**
 * Monster.js - Monster entity class
 *
 * Represents a hostile monster in the game world with:
 * - Health and combat stats
 * - AI state management
 * - Position and movement
 * - Loot drops and rewards
 */

import MONSTER_STATS from '../config/monsters/monster-types.json';

/**
 * Monster entity class
 */
export class Monster {
  /**
   * Create a new monster
   * @param {string} type - Monster type (e.g., 'SLIME', 'GOBLIN')
   * @param {Object} position - Initial position {x, z}
   * @param {Object} options - Additional options (level, modifier, etc.)
   */
  constructor(type, position, options = {}) {
    const stats = MONSTER_STATS[type];
    if (!stats) {
      throw new Error(`Unknown monster type: ${type}`);
    }

    // Core identity
    this.id = options.id || `monster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.name = stats.name;

    // Position and movement
    this.position = { ...position, y: 0 };
    this.velocity = { x: 0, z: 0 };
    this.facingAngle = 0;
    this.homePosition = { ...position }; // For respawn

    // Combat stats
    this.health = stats.health;
    this.maxHealth = stats.maxHealth;
    this.damage = stats.damage;
    this.defense = stats.defense;
    this.moveSpeed = stats.moveSpeed;
    this.attackSpeed = stats.attackSpeed;
    this.attackRange = stats.attackRange;
    this.aggroRange = stats.aggroRange;

    // Level scaling (if specified)
    this.level = options.level || 1;
    if (this.level > 1) {
      this.scaleToLevel(this.level);
    }

    // AI state
    this.aiState = 'IDLE'; // IDLE, PATROL, CHASE, ATTACK, FLEE, DEATH
    this.targetId = null; // Player or NPC being targeted
    this.lastAttackTime = 0;
    this.patrolPath = options.patrolPath || null;
    this.currentWaypointIndex = 0;

    // Behavior flags
    this.canFlee = stats.canFlee || false;
    this.fleeHealthPercent = stats.fleeHealthPercent || 0.3;

    // Rewards
    this.xpReward = stats.xpReward;
    this.goldReward = stats.goldReward; // [min, max]
    this.lootTable = stats.lootTable;

    // Visual
    this.color = stats.color;
    this.size = stats.size;
    this.tint = options.tint || null; // For variants/modifiers
    this.animationState = 'idle';

    // State
    this.alive = true;
    this.spawnTime = Date.now();
  }

  /**
   * Scale monster stats to level
   * @param {number} level - Target level
   */
  scaleToLevel(level) {
    const multiplier = 1 + ((level - 1) * 0.15); // +15% per level
    this.maxHealth = Math.floor(this.maxHealth * multiplier);
    this.health = this.maxHealth;
    this.damage = Math.floor(this.damage * multiplier);
    this.xpReward = Math.floor(this.xpReward * multiplier);
    this.goldReward = this.goldReward.map(val => Math.floor(val * multiplier));
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
      this.aiState = 'DEATH';
      this.die();
      return true;
    }

    // Check if should flee
    if (this.canFlee && this.aiState !== 'FLEE') {
      const healthPercent = this.health / this.maxHealth;
      if (healthPercent <= this.fleeHealthPercent) {
        this.aiState = 'FLEE';
      }
    }

    return false;
  }

  /**
   * Handle death
   */
  die() {
    this.animationState = 'death';
    // Loot drop logic will be handled by the game system
  }

  /**
   * Update monster state
   * @param {number} deltaTime - Time since last update (ms)
   * @param {Object} gameState - Current game state
   */
  update(deltaTime, gameState) {
    if (!this.alive) return;

    // AI update will be handled by MonsterAI system
    // This is just a placeholder for entity-level updates
  }

  /**
   * Serialize to JSON
   * @returns {Object} Serialized monster data
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      health: this.health,
      maxHealth: this.maxHealth,
      level: this.level,
      aiState: this.aiState,
      alive: this.alive,
      homePosition: this.homePosition
    };
  }

  /**
   * Create monster from JSON
   * @param {Object} data - Serialized monster data
   * @returns {Monster} Monster instance
   */
  static fromJSON(data) {
    const monster = new Monster(data.type, data.position, {
      id: data.id,
      level: data.level
    });
    monster.health = data.health;
    monster.aiState = data.aiState;
    monster.alive = data.alive;
    monster.homePosition = data.homePosition;
    return monster;
  }
}

export default Monster;
