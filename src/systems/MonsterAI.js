/**
 * MonsterAI.js - Monster AI behavior system
 *
 * Implements state machine for monster behavior:
 * - IDLE: Standing still, detecting player
 * - CHASE: Moving toward player
 * - ATTACK: Attacking player when in range
 * - FLEE: Running away at low health (for certain monster types)
 * - DEATH: Dead, no updates
 *
 * Performance Optimization (Phase 1F):
 * - Spatial partitioning for fast proximity queries
 * - Update range limiting (only update monsters near player)
 * - Configurable update intervals
 */

import useGameStore from '../stores/useGameStore.js';
import { SpatialGrid } from './SpatialGrid.js';

/**
 * Calculate distance between two positions
 * @param {Object} pos1 - First position {x, z}
 * @param {Object} pos2 - Second position {x, z}
 * @returns {number} Distance
 */
function distance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Normalize a vector
 * @param {Object} vec - Vector {x, z}
 * @returns {Object} Normalized vector
 */
function normalize(vec) {
  const len = Math.sqrt(vec.x * vec.x + vec.z * vec.z);
  if (len === 0) return { x: 0, z: 0 };
  return { x: vec.x / len, z: vec.z / len };
}

/**
 * Subtract two positions
 * @param {Object} pos1 - First position
 * @param {Object} pos2 - Second position
 * @returns {Object} Difference vector
 */
function subtract(pos1, pos2) {
  return { x: pos1.x - pos2.x, z: pos1.z - pos2.z };
}

/**
 * Monster AI System
 * Handles AI behavior for all monsters
 */
export class MonsterAI {
  constructor(options = {}) {
    // AI update rate (to avoid updating every frame)
    this.updateInterval = options.updateInterval || 100; // Update AI every 100ms
    this.lastUpdateTime = 0;

    // Performance optimization (Phase 1F)
    this.updateRange = options.updateRange || 100; // Only update monsters within this range of player
    this.spatialGrid = options.enableSpatialGrid === true ? new SpatialGrid(20, 1000) : null;
    this.enableRangeLimit = options.enableRangeLimit !== false;

    console.log(`🤖 MonsterAI: Initialized with${this.enableRangeLimit ? '' : 'out'} range limiting (${this.updateRange} units)${this.spatialGrid ? ', spatial grid enabled' : ' (brute force)'}`);
  }

  /**
   * Update all monsters' AI
   * @param {Array<Monster>} monsters - Array of monster instances
   * @param {Object} gameState - Current game state (player, NPCs, etc.)
   * @param {number} deltaTime - Time since last update (ms)
   */
  updateAll(monsters, gameState, deltaTime) {
    if (!monsters || !gameState || !gameState.player) return;

    // Throttle AI updates for performance
    this.lastUpdateTime += deltaTime;
    if (this.lastUpdateTime < this.updateInterval) return;

    const actualDeltaTime = this.lastUpdateTime;
    this.lastUpdateTime = 0;

    const player = gameState.player;
    let monstersToUpdate = monsters;

    // Performance optimization: Only update monsters near player
    if (this.enableRangeLimit) {
      if (this.spatialGrid) {
        // Use spatial grid for efficient proximity query
        this.spatialGrid.rebuild(monsters.filter(m => m && m.alive));

        const nearbyIds = this.spatialGrid.getNearby(
          player.position.x,
          player.position.z,
          this.updateRange
        );

        monstersToUpdate = monsters.filter(m => m && m.alive && nearbyIds.has(m.id));
      } else {
        // Fallback: Brute force distance check
        const playerPos = { x: player.position.x, z: player.position.z };
        monstersToUpdate = monsters.filter(m => {
          if (!m || !m.alive) return false;
          const dist = distance(m.position, playerPos);
          return dist <= this.updateRange;
        });
      }
    } else {
      // No range limit: update all living monsters
      monstersToUpdate = monsters.filter(m => m && m.alive);
    }

    // Update each monster in range
    for (const monster of monstersToUpdate) {
      this.update(monster, actualDeltaTime, gameState);
    }
  }

  /**
   * Update a single monster's AI
   * @param {Monster} monster - Monster instance
   * @param {number} deltaTime - Time since last update (ms)
   * @param {Object} gameState - Current game state
   */
  update(monster, deltaTime, gameState) {
    if (!monster.alive) return;

    const player = gameState.player;
    if (!player) {
      console.warn('⚠️ MonsterAI: No player in game state');
      return;
    }

    // Player position is an object {x, z}, not an array
    const playerPos = {
      x: player.position.x,
      z: player.position.z
    };

    const distToPlayer = distance(monster.position, playerPos);

    // Debug: Log first time monster detects player nearby
    if (distToPlayer <= monster.aggroRange && monster.aiState === 'IDLE') {
      // eslint-disable-next-line no-console
      console.log(`🎯 ${monster.name} detected player at distance ${distToPlayer.toFixed(1)} tiles (aggro range: ${monster.aggroRange})`);
    }

    // Check for flee condition (before state machine)
    // Monster will flee if:
    // 1. Can flee (canFlee property is true)
    // 2. Health is below flee threshold (default 30%)
    // 3. Not already fleeing
    if (monster.canFlee && monster.aiState !== 'FLEE' && monster.aiState !== 'DEATH') {
      const healthPercent = monster.health / monster.maxHealth;
      const fleeThreshold = monster.fleeHealthPercent || 0.3;

      if (healthPercent < fleeThreshold) {
        // eslint-disable-next-line no-console
        console.log(`🏃 ${monster.name} is fleeing! (${Math.round(healthPercent * 100)}% health)`);
        monster.aiState = 'FLEE';
      }
    }

    // State machine
    switch (monster.aiState) {
      case 'IDLE':
        this.updateIdle(monster, playerPos, distToPlayer);
        break;
      case 'PATROL':
        this.updatePatrol(monster, playerPos, distToPlayer, deltaTime);
        break;
      case 'CHASE':
        this.updateChase(monster, playerPos, distToPlayer, deltaTime);
        break;
      case 'ATTACK':
        this.updateAttack(monster, player, playerPos, distToPlayer, deltaTime);
        break;
      case 'FLEE':
        this.updateFlee(monster, playerPos, distToPlayer, deltaTime);
        break;
      case 'DEATH':
        // No updates for dead monsters
        break;
      default:
        // Unknown state, reset to IDLE
        monster.aiState = 'IDLE';
        break;
    }
  }

  /**
   * Update IDLE state
   * Monster stands still and detects player
   */
  updateIdle(monster, playerPos, distToPlayer) {
    // Detect player in aggro range
    if (distToPlayer <= monster.aggroRange) {
      monster.aiState = 'CHASE';
      monster.targetId = 'player';
      return;
    }

    // Start patrol if has patrol path
    if (monster.patrolPath && monster.patrolPath.length > 0) {
      monster.aiState = 'PATROL';
      monster.currentWaypointIndex = 0;
      return;
    }

    // Stay idle - no movement
    monster.velocity = { x: 0, z: 0 };
    monster.animationState = 'idle';
  }

  /**
   * Update PATROL state
   * Monster follows waypoints
   */
  updatePatrol(monster, playerPos, distToPlayer, deltaTime) {
    // Check for player
    if (distToPlayer <= monster.aggroRange) {
      // eslint-disable-next-line no-console
      console.log(`🎯 ${monster.name} spotted player during patrol! Switching to CHASE (distance: ${distToPlayer.toFixed(1)})`);
      monster.aiState = 'CHASE';
      return;
    }

    // Validate patrol path exists
    if (!monster.patrolPath || monster.patrolPath.length === 0) {
      console.warn(`⚠️ ${monster.name} in PATROL state but has no patrol path! Switching to IDLE`);
      monster.aiState = 'IDLE';
      return;
    }

    // Get current waypoint
    const waypoint = monster.patrolPath[monster.currentWaypointIndex];
    const distToWaypoint = distance(monster.position, waypoint);

    // Reached waypoint
    if (distToWaypoint < 1) {
      monster.currentWaypointIndex = (monster.currentWaypointIndex + 1) % monster.patrolPath.length;
      monster.pauseUntil = Date.now() + 2000; // Pause 2 seconds at waypoint
      monster.velocity = { x: 0, z: 0 };
      monster.animationState = 'idle';
      return;
    }

    // Wait at waypoint
    if (monster.pauseUntil && Date.now() < monster.pauseUntil) {
      monster.velocity = { x: 0, z: 0 };
      monster.animationState = 'idle';
      return;
    }

    // Move to waypoint
    const direction = normalize(subtract(waypoint, monster.position));
    const deltaSeconds = deltaTime / 1000;

    // Patrol at half speed
    monster.velocity = {
      x: direction.x * monster.moveSpeed * 0.5,
      z: direction.z * monster.moveSpeed * 0.5
    };

    // Update position
    monster.position.x += monster.velocity.x * deltaSeconds;
    monster.position.z += monster.velocity.z * deltaSeconds;

    // Update facing angle
    monster.facingAngle = Math.atan2(direction.z, direction.x);

    // Set animation state
    monster.animationState = 'walk';
  }

  /**
   * Update CHASE state
   * Monster moves toward player
   */
  updateChase(monster, playerPos, distToPlayer, deltaTime) {
    // Check if in attack range
    if (distToPlayer <= monster.attackRange) {
      monster.aiState = 'ATTACK';
      monster.lastAttackTime = Date.now();
      monster.velocity = { x: 0, z: 0 };
      return;
    }

    // Check if player escaped aggro range
    if (distToPlayer > monster.aggroRange * 1.5) {
      // Return to idle
      monster.aiState = 'IDLE';
      monster.targetId = null;
      monster.velocity = { x: 0, z: 0 };
      return;
    }

    // Move toward player
    const direction = normalize(subtract(playerPos, monster.position));
    const deltaSeconds = deltaTime / 1000;

    // Update velocity
    monster.velocity = {
      x: direction.x * monster.moveSpeed,
      z: direction.z * monster.moveSpeed
    };

    // Update position
    monster.position.x += monster.velocity.x * deltaSeconds;
    monster.position.z += monster.velocity.z * deltaSeconds;

    // Update facing angle
    monster.facingAngle = Math.atan2(direction.z, direction.x);

    // Set animation state
    monster.animationState = 'walk';
  }

  /**
   * Update ATTACK state
   * Monster attacks player when in range
   */
  updateAttack(monster, player, playerPos, distToPlayer, deltaTime) {
    // Check if out of attack range
    if (distToPlayer > monster.attackRange) {
      monster.aiState = 'CHASE';
      return;
    }

    // Stop moving when attacking
    monster.velocity = { x: 0, z: 0 };

    // Face player
    const direction = normalize(subtract(playerPos, monster.position));
    monster.facingAngle = Math.atan2(direction.z, direction.x);

    // Attack cooldown
    const now = Date.now();
    const timeSinceAttack = now - (monster.lastAttackTime || 0);
    const attackCooldown = 1000 / monster.attackSpeed; // attackSpeed = attacks per second

    if (timeSinceAttack >= attackCooldown) {
      this.performAttack(monster, player, playerPos);
      monster.lastAttackTime = now;
    }

    // Set animation state
    monster.animationState = 'attack';
  }

  /**
   * Update FLEE state
   * Monster runs away from player
   */
  updateFlee(monster, playerPos, distToPlayer, deltaTime) {
    // Check if safe distance reached
    if (distToPlayer > monster.aggroRange * 1.5) {
      monster.aiState = 'IDLE';
      monster.velocity = { x: 0, z: 0 };
      return;
    }

    // Check if health recovered enough to fight again
    const healthPercent = monster.health / monster.maxHealth;
    if (healthPercent > 0.5) {
      monster.aiState = 'CHASE';
      return;
    }

    // Move away from player
    const direction = normalize(subtract(monster.position, playerPos));
    const deltaSeconds = deltaTime / 1000;

    // Flee 20% faster than normal move speed
    monster.velocity = {
      x: direction.x * monster.moveSpeed * 1.2,
      z: direction.z * monster.moveSpeed * 1.2
    };

    // Update position
    monster.position.x += monster.velocity.x * deltaSeconds;
    monster.position.z += monster.velocity.z * deltaSeconds;

    // Update facing angle
    monster.facingAngle = Math.atan2(direction.z, direction.x);

    // Set animation state
    monster.animationState = 'walk';
  }

  /**
   * Perform attack on player
   */
  performAttack(monster, player, playerPos) {
    // Deal damage to player
    const damage = monster.damage;

    // Update player health through store action (proper reactivity)
    useGameStore.getState().dealDamageToPlayer(damage);

    // Get updated player health for logging
    const newHealth = useGameStore.getState().player.health;

    // Log attack (for debugging)
    // eslint-disable-next-line no-console
    console.log(`🗡️ ${monster.type} attacked player for ${damage} damage! Player HP: ${newHealth}/${player.maxHealth}`);

    // Spawn damage number (if system exists)
    if (window.debug && window.debug.spawnDamageNumber) {
      window.debug.spawnDamageNumber(playerPos, damage, 'enemy');
    }

    // Play attack animation/sound (to be implemented)
    monster.animationState = 'attack';

    // Check if player died
    if (newHealth <= 0) {
      // eslint-disable-next-line no-console
      console.log('💀 Player died!');
      // Game over logic will be handled by game manager
    }
  }

  /**
   * Check if monster should flee
   * Called when monster takes damage
   */
  checkFleeCondition(monster) {
    if (!monster.canFlee) return false;

    const healthPercent = monster.health / monster.maxHealth;
    return healthPercent <= (monster.fleeHealthPercent || 0.3);
  }
}

export default MonsterAI;
