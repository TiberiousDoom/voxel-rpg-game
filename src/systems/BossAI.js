/**
 * BossAI.js - Extended AI system for boss monsters
 *
 * Builds on MonsterAI with boss-specific behaviors:
 * - Phase-aware ability selection
 * - Cooldown management
 * - Target priority for abilities
 * - Summon coordination
 * - Special attack patterns
 */

import useGameStore from '../stores/useGameStore.js';

/**
 * Calculate distance between two positions
 * @param {Object} pos1 - First position {x, y} or {x, z}
 * @param {Object} pos2 - Second position {x, y} or {x, z}
 * @returns {number} Distance
 */
function distance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  // Support both y (2D) and z (3D) coordinates
  const dy = (pos2.y !== undefined ? pos2.y : pos2.z) -
             (pos1.y !== undefined ? pos1.y : pos1.z);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize a vector
 * @param {Object} vec - Vector {x, y} or {x, z}
 * @returns {Object} Normalized vector
 */
function normalize(vec) {
  const y = vec.y !== undefined ? vec.y : vec.z;
  const len = Math.sqrt(vec.x * vec.x + y * y);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: vec.x / len, y: y / len, z: y / len };
}

/**
 * Subtract two positions
 * @param {Object} pos1 - First position
 * @param {Object} pos2 - Second position
 * @returns {Object} Difference vector
 */
function subtract(pos1, pos2) {
  const y1 = pos1.y !== undefined ? pos1.y : (pos1.z || 0);
  const y2 = pos2.y !== undefined ? pos2.y : (pos2.z || 0);
  return { x: pos1.x - pos2.x, y: y1 - y2 };
}

/**
 * Boss AI States
 */
const BOSS_AI_STATES = {
  IDLE: 'IDLE',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  CASTING: 'CASTING',
  SUMMONING: 'SUMMONING',
  PHASE_TRANSITION: 'PHASE_TRANSITION',
  DEATH: 'DEATH'
};

/**
 * BossAI class - handles boss-specific AI behavior
 */
export class BossAI {
  constructor(options = {}) {
    // AI update rate
    this.updateInterval = options.updateInterval || 100;
    this.lastUpdateTime = 0;

    // Ability selection weights
    this.abilityWeights = options.abilityWeights || {};

    // Casting state
    this.castingBoss = null;
    this.castingAbility = null;
    this.castStartTime = 0;
    this.castDuration = 0;
  }

  /**
   * Update boss AI
   * @param {BossMonster} boss - Boss instance
   * @param {Object} gameState - Current game state
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(boss, gameState, deltaTime) {
    if (!boss || !boss.alive) return;

    // Throttle updates
    this.lastUpdateTime += deltaTime;
    if (this.lastUpdateTime < this.updateInterval) return;

    const actualDeltaTime = this.lastUpdateTime;
    this.lastUpdateTime = 0;

    // Update boss internal state
    boss.update(actualDeltaTime);

    const player = gameState.player;
    if (!player) return;

    const playerPos = {
      x: player.position.x,
      y: player.position.y !== undefined ? player.position.y : player.position.z
    };

    const distToPlayer = distance(boss.position, playerPos);

    // State machine
    switch (boss.aiState) {
      case BOSS_AI_STATES.IDLE:
        this._updateIdle(boss, playerPos, distToPlayer);
        break;
      case BOSS_AI_STATES.CHASE:
        this._updateChase(boss, playerPos, distToPlayer, actualDeltaTime);
        break;
      case BOSS_AI_STATES.ATTACK:
        this._updateAttack(boss, player, playerPos, distToPlayer, actualDeltaTime);
        break;
      case BOSS_AI_STATES.CASTING:
        this._updateCasting(boss, player, playerPos, actualDeltaTime);
        break;
      case BOSS_AI_STATES.SUMMONING:
        this._updateSummoning(boss, actualDeltaTime);
        break;
      case BOSS_AI_STATES.PHASE_TRANSITION:
        this._updatePhaseTransition(boss, actualDeltaTime);
        break;
      case BOSS_AI_STATES.DEATH:
        // No updates
        break;
      default:
        boss.aiState = BOSS_AI_STATES.IDLE;
        break;
    }

    // Try to use abilities when appropriate
    if (boss.aiState === BOSS_AI_STATES.ATTACK || boss.aiState === BOSS_AI_STATES.CHASE) {
      this._tryUseAbility(boss, player, playerPos, distToPlayer);
    }
  }

  /**
   * Update IDLE state
   * @private
   */
  _updateIdle(boss, playerPos, distToPlayer) {
    // Bosses are always aggressive once engaged
    if (distToPlayer <= boss.aggroRange) {
      boss.aiState = BOSS_AI_STATES.CHASE;
      boss.targetId = 'player';
      boss.emit('aggro', { bossId: boss.id });
    }

    boss.velocity = { x: 0, y: 0 };
    boss.animationState = 'idle';
  }

  /**
   * Update CHASE state
   * @private
   */
  _updateChase(boss, playerPos, distToPlayer, deltaTime) {
    // Check if in attack range
    if (distToPlayer <= boss.attackRange) {
      boss.aiState = BOSS_AI_STATES.ATTACK;
      boss.lastAttackTime = Date.now();
      boss.velocity = { x: 0, y: 0 };
      return;
    }

    // Move toward player
    const direction = normalize(subtract(playerPos, boss.position));
    const deltaSeconds = deltaTime / 1000;

    boss.velocity = {
      x: direction.x * boss.moveSpeed,
      y: direction.y * boss.moveSpeed
    };

    boss.position.x += boss.velocity.x * deltaSeconds;
    boss.position.y += boss.velocity.y * deltaSeconds;

    boss.facingAngle = Math.atan2(direction.y, direction.x);
    boss.animationState = 'walk';
  }

  /**
   * Update ATTACK state
   * @private
   */
  _updateAttack(boss, player, playerPos, distToPlayer, deltaTime) {
    // Check if out of attack range
    if (distToPlayer > boss.attackRange * 1.2) {
      boss.aiState = BOSS_AI_STATES.CHASE;
      return;
    }

    // Stop moving when attacking
    boss.velocity = { x: 0, y: 0 };

    // Face player
    const direction = normalize(subtract(playerPos, boss.position));
    boss.facingAngle = Math.atan2(direction.y, direction.x);

    // Attack cooldown
    const now = Date.now();
    const timeSinceAttack = now - (boss.lastAttackTime || 0);
    const attackCooldown = 1000 / boss.attackSpeed;

    if (timeSinceAttack >= attackCooldown) {
      this._performBasicAttack(boss, player, playerPos);
      boss.lastAttackTime = now;
    }

    boss.animationState = 'attack';
  }

  /**
   * Update CASTING state
   * @private
   */
  _updateCasting(boss, player, playerPos, deltaTime) {
    // Stop moving while casting
    boss.velocity = { x: 0, y: 0 };

    // Update cast progress
    boss.castProgress += deltaTime;

    // Check if cast is complete
    if (boss.castProgress >= this.castDuration) {
      this._executeAbility(boss, this.castingAbility, player, playerPos);
      boss.castProgress = 0;
      boss.castingAbility = null;
      boss.aiState = BOSS_AI_STATES.ATTACK;
    }

    boss.animationState = 'casting';
  }

  /**
   * Update SUMMONING state
   * @private
   */
  _updateSummoning(boss, deltaTime) {
    boss.velocity = { x: 0, y: 0 };
    boss.animationState = 'summoning';

    // Summoning takes 1 second
    boss.castProgress += deltaTime;

    if (boss.castProgress >= 1000) {
      boss.castProgress = 0;
      boss.aiState = BOSS_AI_STATES.ATTACK;
    }
  }

  /**
   * Update PHASE_TRANSITION state
   * @private
   */
  _updatePhaseTransition(boss, deltaTime) {
    boss.velocity = { x: 0, y: 0 };
    boss.animationState = 'phase_transition';

    // Phase transition takes 2 seconds
    boss.castProgress += deltaTime;

    if (boss.castProgress >= 2000) {
      boss.castProgress = 0;
      boss.aiState = BOSS_AI_STATES.ATTACK;
    }
  }

  /**
   * Perform basic melee/ranged attack
   * @private
   */
  _performBasicAttack(boss, player, playerPos) {
    const damage = boss.damage;

    // Deal damage through store
    if (useGameStore.getState().dealDamageToPlayer) {
      useGameStore.getState().dealDamageToPlayer(damage);
    }

    boss.emit('attack', {
      bossId: boss.id,
      damage,
      targetPosition: { ...playerPos }
    });
  }

  /**
   * Try to use an ability
   * @private
   */
  _tryUseAbility(boss, player, playerPos, distToPlayer) {
    const availableAbilities = boss.getAvailableAbilities();
    if (availableAbilities.length === 0) return;

    // Find an ability that's off cooldown and in range
    for (const abilityName of availableAbilities) {
      if (!boss.canUseAbility(abilityName)) continue;

      const ability = boss.abilities[abilityName];
      if (!ability) continue;

      // Check range for ranged abilities
      if (ability.range && distToPlayer > ability.range) continue;

      // Decide if we should use this ability
      if (this._shouldUseAbility(boss, abilityName, ability, distToPlayer)) {
        const abilityResult = boss.useAbility(abilityName);
        if (abilityResult) {
          this._handleAbilityUse(boss, abilityResult, player, playerPos);
          return;
        }
      }
    }
  }

  /**
   * Decide if an ability should be used
   * @private
   */
  _shouldUseAbility(boss, abilityName, ability, distToPlayer) {
    // Prioritize summons when low on minions
    if (ability.type === 'SUMMON' && boss.summons.length < 2) {
      return true;
    }

    // Use buffs when available
    if (ability.type === 'BUFF' && !boss.activeBuffs.has('DAMAGE_REDUCTION')) {
      return true;
    }

    // Use AOE when player is close
    if (ability.type === 'AOE' && distToPlayer <= (ability.radius || 3)) {
      return true;
    }

    // Use projectiles at range
    if (ability.type === 'PROJECTILE' && distToPlayer >= boss.attackRange) {
      return Math.random() < 0.3; // 30% chance per check
    }

    // Random chance for other abilities
    return Math.random() < 0.1; // 10% chance
  }

  /**
   * Handle ability use
   * @private
   */
  _handleAbilityUse(boss, abilityResult, player, playerPos) {
    switch (abilityResult.type) {
      case 'SUMMON':
        boss.aiState = BOSS_AI_STATES.SUMMONING;
        boss.castProgress = 0;
        this._createSummons(boss, abilityResult);
        break;

      case 'CHANNEL':
        boss.aiState = BOSS_AI_STATES.CASTING;
        boss.castProgress = 0;
        this.castingAbility = abilityResult;
        this.castDuration = abilityResult.duration || 1000;
        break;

      case 'BUFF':
        // Buff is applied immediately by boss.useAbility
        break;

      case 'PROJECTILE':
        this._executeAbility(boss, abilityResult, player, playerPos);
        break;

      case 'AOE':
        this._executeAbility(boss, abilityResult, player, playerPos);
        break;

      default:
        this._executeAbility(boss, abilityResult, player, playerPos);
        break;
    }
  }

  /**
   * Execute an ability effect
   * @private
   */
  _executeAbility(boss, ability, player, playerPos) {
    const damage = ability.damage || 0;

    if (damage > 0) {
      // Deal damage through store
      if (useGameStore.getState().dealDamageToPlayer) {
        useGameStore.getState().dealDamageToPlayer(damage);
      }
    }

    // Handle healing (life drain)
    if (ability.healPercent && damage > 0) {
      boss.heal(Math.floor(damage * ability.healPercent));
    }

    boss.emit('ability:executed', {
      bossId: boss.id,
      ability: ability.name,
      damage,
      position: { ...playerPos }
    });
  }

  /**
   * Create summoned monsters
   * @private
   */
  _createSummons(boss, ability) {
    const count = ability.spawnCount || 1;
    const summons = [];

    for (let i = 0; i < count; i++) {
      // Position summons around the boss
      const angle = (i / count) * Math.PI * 2;
      const spawnRadius = 3;

      const summon = {
        id: `summon_${Date.now()}_${i}`,
        type: ability.spawnType,
        position: {
          x: boss.position.x + Math.cos(angle) * spawnRadius,
          y: boss.position.y + Math.sin(angle) * spawnRadius
        },
        ownerId: boss.id
      };

      summons.push(summon);
      boss.addSummon(summon);
    }

    boss.emit('summon:created', {
      bossId: boss.id,
      summons,
      spawnType: ability.spawnType
    });

    return summons;
  }

  /**
   * Handle boss phase transition
   * Called when boss transitions to a new phase
   */
  onPhaseTransition(boss, oldPhase, newPhase) {
    boss.aiState = BOSS_AI_STATES.PHASE_TRANSITION;
    boss.castProgress = 0;

    // Clear any casting
    boss.castingAbility = null;
    this.castingAbility = null;
  }

  /**
   * Get the best target for an ability
   * @param {BossMonster} boss
   * @param {Object} ability
   * @param {Object} gameState
   * @returns {Object|null} Target position or null
   */
  getBestTarget(boss, ability, gameState) {
    const player = gameState.player;
    if (!player) return null;

    // Most abilities target the player
    return {
      x: player.position.x,
      y: player.position.y !== undefined ? player.position.y : player.position.z
    };
  }

  /**
   * Check if boss should enrage
   * @param {BossMonster} boss
   * @returns {boolean}
   */
  shouldEnrage(boss) {
    return !boss.enraged && boss.enrageTimer >= boss.enrageThreshold;
  }
}

export { BOSS_AI_STATES };
export default BossAI;
