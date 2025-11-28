/**
 * BossMonster.js - Boss monster entity with phases and abilities
 *
 * Extends the base Monster class with:
 * - Multi-phase health thresholds
 * - Special abilities with cooldowns
 * - Phase transition effects
 * - Enrage mechanics
 * - Event emission for UI updates
 */

import EventEmitter from 'events';

// Boss configurations
const BOSS_CONFIGS = {
  BROOD_MOTHER: {
    name: 'Brood Mother',
    description: 'A giant spider that commands a swarm of spiderlings',
    baseStats: {
      health: 500,
      maxHealth: 500,
      damage: 25,
      defense: 10,
      moveSpeed: 2.0,
      attackSpeed: 0.8,
      attackRange: 2.0,
      aggroRange: 15
    },
    phases: [
      {
        name: 'Normal',
        healthThreshold: 1.0,
        abilities: ['VENOM_SPIT', 'WEB_TRAP']
      },
      {
        name: 'Swarm',
        healthThreshold: 0.6,
        damageMultiplier: 1.2,
        onEnterAbility: 'SPAWN_SPIDERLINGS',
        abilities: ['VENOM_SPIT', 'WEB_TRAP', 'SPAWN_SPIDERLINGS']
      },
      {
        name: 'Frenzy',
        healthThreshold: 0.3,
        damageMultiplier: 1.5,
        speedMultiplier: 1.3,
        onEnterAbility: 'POISON_NOVA',
        abilities: ['POISON_NOVA', 'SPAWN_SPIDERLINGS', 'VENOM_SPIT']
      }
    ],
    abilities: {
      VENOM_SPIT: {
        name: 'Venom Spit',
        type: 'PROJECTILE',
        damage: 15,
        range: 8,
        cooldown: 3000,
        effect: 'POISON',
        effectDamage: 5,
        effectDuration: 5000
      },
      WEB_TRAP: {
        name: 'Web Trap',
        type: 'AOE',
        range: 6,
        radius: 2,
        cooldown: 8000,
        effect: 'SLOW',
        slowAmount: 0.5,
        duration: 3000
      },
      SPAWN_SPIDERLINGS: {
        name: 'Spawn Spiderlings',
        type: 'SUMMON',
        cooldown: 15000,
        spawnCount: 3,
        spawnType: 'CAVE_SPIDER'
      },
      POISON_NOVA: {
        name: 'Poison Nova',
        type: 'AOE',
        damage: 30,
        radius: 5,
        cooldown: 20000,
        effect: 'POISON',
        effectDamage: 8,
        effectDuration: 4000
      }
    },
    xpReward: 500,
    goldReward: [200, 500],
    lootTable: 'boss_brood_mother',
    guaranteedDrops: ['BROOD_MOTHER_FANG'],
    color: '#4a0080',
    size: 3
  },
  NECROMANCER: {
    name: 'The Necromancer',
    description: 'A dark mage who commands the undead',
    baseStats: {
      health: 400,
      maxHealth: 400,
      damage: 30,
      defense: 5,
      moveSpeed: 2.5,
      attackSpeed: 1.0,
      attackRange: 8.0,
      aggroRange: 12
    },
    phases: [
      {
        name: 'Arcane',
        healthThreshold: 1.0,
        abilities: ['SHADOW_BOLT', 'BONE_SHIELD']
      },
      {
        name: 'Undead Army',
        healthThreshold: 0.5,
        onEnterAbility: 'RAISE_DEAD',
        abilities: ['SHADOW_BOLT', 'RAISE_DEAD', 'LIFE_DRAIN']
      }
    ],
    abilities: {
      SHADOW_BOLT: {
        name: 'Shadow Bolt',
        type: 'PROJECTILE',
        damage: 35,
        range: 10,
        cooldown: 2000
      },
      BONE_SHIELD: {
        name: 'Bone Shield',
        type: 'BUFF',
        cooldown: 15000,
        duration: 5000,
        damageReduction: 0.5
      },
      RAISE_DEAD: {
        name: 'Raise Dead',
        type: 'SUMMON',
        cooldown: 20000,
        spawnCount: 4,
        spawnType: 'ZOMBIE'
      },
      LIFE_DRAIN: {
        name: 'Life Drain',
        type: 'CHANNEL',
        damage: 10,
        healPercent: 0.5,
        range: 6,
        cooldown: 10000,
        duration: 3000
      }
    },
    xpReward: 600,
    goldReward: [250, 600],
    lootTable: 'boss_necromancer',
    guaranteedDrops: ['STAFF_OF_UNDEATH'],
    color: '#301040',
    size: 2.5
  },
  STONE_GOLEM: {
    name: 'Ancient Stone Golem',
    description: 'A massive construct of living stone',
    baseStats: {
      health: 800,
      maxHealth: 800,
      damage: 35,
      defense: 20,
      moveSpeed: 1.2,
      attackSpeed: 0.5,
      attackRange: 2.5,
      aggroRange: 10
    },
    phases: [
      {
        name: 'Dormant',
        healthThreshold: 1.0,
        abilities: ['GROUND_SLAM', 'ROCK_THROW']
      },
      {
        name: 'Awakened',
        healthThreshold: 0.6,
        speedMultiplier: 1.3,
        onEnterAbility: 'STONE_ARMOR',
        abilities: ['GROUND_SLAM', 'ROCK_THROW', 'STONE_ARMOR']
      },
      {
        name: 'Berserker',
        healthThreshold: 0.3,
        damageMultiplier: 1.5,
        speedMultiplier: 1.5,
        attackSpeedMultiplier: 1.5,
        abilities: ['GROUND_SLAM', 'EARTHQUAKE']
      }
    ],
    abilities: {
      GROUND_SLAM: {
        name: 'Ground Slam',
        type: 'AOE',
        damage: 40,
        radius: 3,
        cooldown: 6000,
        effect: 'STUN',
        stunDuration: 1500
      },
      ROCK_THROW: {
        name: 'Rock Throw',
        type: 'PROJECTILE',
        damage: 25,
        range: 8,
        cooldown: 4000
      },
      STONE_ARMOR: {
        name: 'Stone Armor',
        type: 'BUFF',
        cooldown: 25000,
        duration: 8000,
        damageReduction: 0.5
      },
      EARTHQUAKE: {
        name: 'Earthquake',
        type: 'AOE',
        damage: 50,
        radius: 6,
        cooldown: 15000,
        effect: 'KNOCKBACK',
        knockbackForce: 5
      }
    },
    xpReward: 700,
    goldReward: [300, 700],
    lootTable: 'boss_stone_golem',
    guaranteedDrops: ['HEART_OF_STONE'],
    color: '#5a5a5a',
    size: 4
  }
};

/**
 * BossMonster class
 */
class BossMonster extends EventEmitter {
  /**
   * Create a boss monster
   * @param {string} bossType - Boss type (BROOD_MOTHER, NECROMANCER, STONE_GOLEM)
   * @param {Object} position - Initial position {x, y}
   * @param {Object} options - Additional options
   */
  constructor(bossType, position, options = {}) {
    super();

    const config = BOSS_CONFIGS[bossType];
    if (!config) {
      throw new Error(`Unknown boss type: ${bossType}`);
    }

    // Store config reference
    this.config = config;
    this.bossType = bossType;

    // Core identity
    this.id = options.id || `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name;
    this.description = config.description;
    this.isBoss = true;

    // Position
    this.position = { x: position.x, y: position.y || 0 };
    this.velocity = { x: 0, y: 0 };
    this.facingAngle = 0;

    // Combat stats (copy from config)
    this.health = config.baseStats.health;
    this.maxHealth = config.baseStats.maxHealth;
    this.damage = config.baseStats.damage;
    this.baseDamage = config.baseStats.damage;
    this.defense = config.baseStats.defense;
    this.moveSpeed = config.baseStats.moveSpeed;
    this.baseMoveSpeed = config.baseStats.moveSpeed;
    this.attackSpeed = config.baseStats.attackSpeed;
    this.baseAttackSpeed = config.baseStats.attackSpeed;
    this.attackRange = config.baseStats.attackRange;
    this.aggroRange = config.baseStats.aggroRange;

    // Level (scaling applied after rewards are set)
    this.level = options.level || 1;

    // Phase system
    this.phases = config.phases;
    this.currentPhase = 0;
    this.phaseTransitioned = [true]; // Track which phases we've entered

    // Abilities
    this.abilities = config.abilities;
    this.abilityCooldowns = new Map();
    this.activeBuffs = new Map();

    // Combat state
    this.aiState = 'IDLE';
    this.targetId = null;
    this.lastAttackTime = 0;
    this.castingAbility = null;
    this.castProgress = 0;

    // Enrage
    this.enraged = false;
    this.enrageTimer = 0;
    this.enrageThreshold = options.enrageTime || 300000; // 5 minutes

    // Summons tracking
    this.summons = [];
    this.maxSummons = options.maxSummons || 10;

    // Rewards
    this.xpReward = config.xpReward;
    this.goldReward = config.goldReward;
    this.lootTable = config.lootTable;
    this.guaranteedDrops = config.guaranteedDrops;

    // Visual
    this.color = config.color;
    this.size = config.size;
    this.animationState = 'idle';

    // State
    this.alive = true;
    this.spawnTime = Date.now();
    this.deathTime = null;

    // Apply level scaling after all stats are set
    if (this.level > 1) {
      this._scaleToLevel(this.level);
    }
  }

  /**
   * Scale boss stats to level
   * @private
   */
  _scaleToLevel(level) {
    const multiplier = 1 + ((level - 1) * 0.2); // +20% per level for bosses
    this.maxHealth = Math.floor(this.maxHealth * multiplier);
    this.health = this.maxHealth;
    this.damage = Math.floor(this.damage * multiplier);
    this.baseDamage = this.damage;
    this.xpReward = Math.floor(this.xpReward * multiplier);
    this.goldReward = this.goldReward.map(val => Math.floor(val * multiplier));
  }

  /**
   * Take damage and check for phase transitions
   * @param {number} amount - Damage amount
   * @param {Object} source - Damage source info
   * @returns {Object} Damage result
   */
  takeDamage(amount, source = null) {
    if (!this.alive) return { damage: 0, killed: false };

    // Apply defense reduction
    const actualDamage = Math.max(1, amount - this.defense);

    // Check for damage reduction buffs
    let finalDamage = actualDamage;
    if (this.activeBuffs.has('DAMAGE_REDUCTION')) {
      const buff = this.activeBuffs.get('DAMAGE_REDUCTION');
      finalDamage = Math.floor(actualDamage * (1 - buff.amount));
    }

    this.health = Math.max(0, this.health - finalDamage);

    // Emit damage event
    this.emit('damage', {
      bossId: this.id,
      damage: finalDamage,
      health: this.health,
      maxHealth: this.maxHealth,
      source
    });

    // Check for phase transition
    this._checkPhaseTransition();

    // Check for death
    if (this.health <= 0) {
      this._die();
      return { damage: finalDamage, killed: true };
    }

    return { damage: finalDamage, killed: false };
  }

  /**
   * Heal the boss
   * @param {number} amount - Heal amount
   */
  heal(amount) {
    if (!this.alive) return;

    const oldHealth = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);

    this.emit('heal', {
      bossId: this.id,
      amount: this.health - oldHealth,
      health: this.health,
      maxHealth: this.maxHealth
    });
  }

  /**
   * Check and handle phase transitions
   * @private
   */
  _checkPhaseTransition() {
    const hpPercent = this.health / this.maxHealth;

    // Find the appropriate phase
    for (let i = this.phases.length - 1; i >= 0; i--) {
      const phase = this.phases[i];
      if (hpPercent <= phase.healthThreshold && !this.phaseTransitioned[i]) {
        this._transitionToPhase(i);
        break;
      }
    }
  }

  /**
   * Transition to a new phase
   * @private
   */
  _transitionToPhase(phaseIndex) {
    const oldPhase = this.currentPhase;
    this.currentPhase = phaseIndex;
    this.phaseTransitioned[phaseIndex] = true;

    const phase = this.phases[phaseIndex];

    // Apply phase modifiers
    if (phase.damageMultiplier) {
      this.damage = Math.floor(this.baseDamage * phase.damageMultiplier);
    }

    if (phase.speedMultiplier) {
      this.moveSpeed = this.baseMoveSpeed * phase.speedMultiplier;
    }

    if (phase.attackSpeedMultiplier) {
      this.attackSpeed = this.baseAttackSpeed * phase.attackSpeedMultiplier;
    }

    // Emit phase transition event
    this.emit('phase:transition', {
      bossId: this.id,
      oldPhase,
      newPhase: phaseIndex,
      phaseName: phase.name
    });

    // Use on-enter ability if specified
    if (phase.onEnterAbility) {
      // Reset cooldown to allow immediate use
      this.abilityCooldowns.delete(phase.onEnterAbility);
      this.useAbility(phase.onEnterAbility);
    }
  }

  /**
   * Get current phase info
   * @returns {Object}
   */
  getCurrentPhase() {
    return {
      index: this.currentPhase,
      ...this.phases[this.currentPhase]
    };
  }

  /**
   * Get available abilities for current phase
   * @returns {string[]}
   */
  getAvailableAbilities() {
    const phase = this.phases[this.currentPhase];
    return phase ? phase.abilities : [];
  }

  /**
   * Check if ability is off cooldown
   * @param {string} abilityName
   * @returns {boolean}
   */
  canUseAbility(abilityName) {
    const ability = this.abilities[abilityName];
    if (!ability) return false;

    const cooldownEnd = this.abilityCooldowns.get(abilityName) || 0;
    return Date.now() >= cooldownEnd;
  }

  /**
   * Use an ability
   * @param {string} abilityName
   * @returns {Object|null} Ability result or null if failed
   */
  useAbility(abilityName) {
    if (!this.canUseAbility(abilityName)) {
      return null;
    }

    const ability = this.abilities[abilityName];
    if (!ability) return null;

    // Set cooldown
    this.abilityCooldowns.set(abilityName, Date.now() + ability.cooldown);

    // Emit ability use event
    this.emit('ability:used', {
      bossId: this.id,
      ability: abilityName,
      abilityData: ability
    });

    // Handle buff abilities
    if (ability.type === 'BUFF') {
      this._applyBuff(abilityName, ability);
    }

    // Return ability data for AI to execute
    return {
      name: abilityName,
      ...ability,
      position: { ...this.position }
    };
  }

  /**
   * Apply a buff
   * @private
   */
  _applyBuff(name, ability) {
    const buff = {
      name,
      startTime: Date.now(),
      duration: ability.duration,
      amount: ability.damageReduction || 0
    };

    if (ability.damageReduction) {
      this.activeBuffs.set('DAMAGE_REDUCTION', buff);
    }

    this.emit('buff:applied', {
      bossId: this.id,
      buff: name,
      duration: ability.duration
    });

    // Schedule buff removal
    setTimeout(() => {
      this._removeBuff(name);
    }, ability.duration);
  }

  /**
   * Remove a buff
   * @private
   */
  _removeBuff(name) {
    this.activeBuffs.delete('DAMAGE_REDUCTION');

    this.emit('buff:removed', {
      bossId: this.id,
      buff: name
    });
  }

  /**
   * Update boss state
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime) {
    if (!this.alive) return;

    // Update enrage timer
    this.enrageTimer += deltaTime;
    if (!this.enraged && this.enrageTimer >= this.enrageThreshold) {
      this._enrage();
    }

    // Update buff durations
    this._updateBuffs();
  }

  /**
   * Update buff durations
   * @private
   */
  _updateBuffs() {
    const now = Date.now();

    for (const [key, buff] of this.activeBuffs.entries()) {
      if (now >= buff.startTime + buff.duration) {
        this.activeBuffs.delete(key);
      }
    }
  }

  /**
   * Trigger enrage mode
   * @private
   */
  _enrage() {
    this.enraged = true;
    this.damage = Math.floor(this.damage * 1.5);
    this.attackSpeed *= 1.5;
    this.moveSpeed *= 1.2;

    this.emit('enrage', {
      bossId: this.id
    });
  }

  /**
   * Handle boss death
   * @private
   */
  _die() {
    this.alive = false;
    this.aiState = 'DEATH';
    this.deathTime = Date.now();

    this.emit('death', {
      bossId: this.id,
      bossType: this.bossType,
      xpReward: this.xpReward,
      goldReward: this.goldReward,
      lootTable: this.lootTable,
      guaranteedDrops: this.guaranteedDrops,
      position: { ...this.position }
    });
  }

  /**
   * Add a summoned creature
   * @param {Object} summon
   */
  addSummon(summon) {
    if (this.summons.length < this.maxSummons) {
      this.summons.push(summon);
    }
  }

  /**
   * Remove a summoned creature
   * @param {string} summonId
   */
  removeSummon(summonId) {
    this.summons = this.summons.filter(s => s.id !== summonId);
  }

  /**
   * Get health percentage
   * @returns {number}
   */
  getHealthPercent() {
    return this.health / this.maxHealth;
  }

  /**
   * Check if boss is in final phase
   * @returns {boolean}
   */
  isInFinalPhase() {
    return this.currentPhase === this.phases.length - 1;
  }

  /**
   * Serialize boss state
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      bossType: this.bossType,
      position: { ...this.position },
      health: this.health,
      maxHealth: this.maxHealth,
      currentPhase: this.currentPhase,
      phaseTransitioned: [...this.phaseTransitioned],
      enraged: this.enraged,
      enrageTimer: this.enrageTimer,
      alive: this.alive,
      level: this.level,
      abilityCooldowns: Array.from(this.abilityCooldowns.entries())
    };
  }

  /**
   * Create boss from saved state
   * @param {Object} data
   * @returns {BossMonster}
   */
  static fromJSON(data) {
    const boss = new BossMonster(data.bossType, data.position, {
      id: data.id,
      level: data.level
    });

    boss.health = data.health;
    boss.currentPhase = data.currentPhase;
    boss.phaseTransitioned = data.phaseTransitioned;
    boss.enraged = data.enraged;
    boss.enrageTimer = data.enrageTimer;
    boss.alive = data.alive;

    if (data.abilityCooldowns) {
      boss.abilityCooldowns = new Map(data.abilityCooldowns);
    }

    return boss;
  }

  /**
   * Get boss configuration
   * @param {string} bossType
   * @returns {Object|null}
   */
  static getConfig(bossType) {
    return BOSS_CONFIGS[bossType] || null;
  }

  /**
   * Get all boss types
   * @returns {string[]}
   */
  static getBossTypes() {
    return Object.keys(BOSS_CONFIGS);
  }
}

export default BossMonster;
export { BossMonster, BOSS_CONFIGS };
