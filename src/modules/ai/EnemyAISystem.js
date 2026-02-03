/**
 * EnemyAISystem.js - Enhanced Enemy AI with Group Tactics
 *
 * Builds on existing MonsterAI (src/systems/MonsterAI.js) to add:
 * - Group tactics and formations
 * - Faction system with relations
 * - Threat assessment and target prioritization
 * - Advanced combat behaviors (flanking, retreat, ambush)
 * - Dungeon guard integration
 * - Dynamic difficulty adjustment
 *
 * @see src/systems/MonsterAI.js
 */

import {
  BehaviorTreeBuilder,
  Blackboard,
  NodeStatus
} from './BehaviorTree.js';

import { PathfindingSystem, distance, normalize } from './PathfindingSystem.js';
import { PerceptionSystem } from './PerceptionSystem.js';

/**
 * Enemy AI States
 */
export const EnemyState = {
  IDLE: 'IDLE',
  PATROL: 'PATROL',
  ALERT: 'ALERT',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  FLANK: 'FLANK',
  RETREAT: 'RETREAT',
  FLEE: 'FLEE',
  REGROUP: 'REGROUP',
  GUARD: 'GUARD',
  AMBUSH: 'AMBUSH',
  DEAD: 'DEAD'
};

/**
 * Combat behavior profiles
 */
export const CombatBehavior = {
  AGGRESSIVE: 'AGGRESSIVE',   // Charges in, high aggro
  DEFENSIVE: 'DEFENSIVE',     // Maintains distance, blocks
  TACTICAL: 'TACTICAL',       // Uses cover, flanks
  SUPPORT: 'SUPPORT',         // Heals allies, buffs
  AMBUSH: 'AMBUSH',           // Waits for opportunity
  BERSERKER: 'BERSERKER'      // More aggressive at low health
};

/**
 * Formation types for group combat
 */
export const FormationType = {
  NONE: 'NONE',
  LINE: 'LINE',
  CIRCLE: 'CIRCLE',
  SURROUND: 'SURROUND',
  WEDGE: 'WEDGE',
  PROTECT_LEADER: 'PROTECT_LEADER'
};

/**
 * Faction relations
 */
export const FactionRelation = {
  HOSTILE: 'HOSTILE',
  NEUTRAL: 'NEUTRAL',
  FRIENDLY: 'FRIENDLY'
};

/**
 * Default faction relations matrix
 */
const DEFAULT_FACTION_RELATIONS = {
  player: {
    bandits: FactionRelation.HOSTILE,
    monsters: FactionRelation.HOSTILE,
    wildlife: FactionRelation.NEUTRAL,
    villagers: FactionRelation.FRIENDLY,
    guards: FactionRelation.FRIENDLY
  },
  bandits: {
    player: FactionRelation.HOSTILE,
    monsters: FactionRelation.NEUTRAL,
    wildlife: FactionRelation.NEUTRAL,
    villagers: FactionRelation.HOSTILE,
    guards: FactionRelation.HOSTILE
  },
  monsters: {
    player: FactionRelation.HOSTILE,
    bandits: FactionRelation.NEUTRAL,
    wildlife: FactionRelation.NEUTRAL,
    villagers: FactionRelation.HOSTILE,
    guards: FactionRelation.HOSTILE
  },
  wildlife: {
    player: FactionRelation.NEUTRAL,
    bandits: FactionRelation.NEUTRAL,
    monsters: FactionRelation.NEUTRAL,
    villagers: FactionRelation.NEUTRAL,
    guards: FactionRelation.NEUTRAL
  },
  villagers: {
    player: FactionRelation.FRIENDLY,
    bandits: FactionRelation.HOSTILE,
    monsters: FactionRelation.HOSTILE,
    wildlife: FactionRelation.NEUTRAL,
    guards: FactionRelation.FRIENDLY
  },
  guards: {
    player: FactionRelation.FRIENDLY,
    bandits: FactionRelation.HOSTILE,
    monsters: FactionRelation.HOSTILE,
    wildlife: FactionRelation.NEUTRAL,
    villagers: FactionRelation.FRIENDLY
  }
};

/**
 * Threat entry for target assessment
 */
class ThreatEntry {
  constructor(targetId, initialThreat = 0) {
    this.targetId = targetId;
    this.threat = initialThreat;
    this.lastSeen = Date.now();
    this.damageDealt = 0;
    this.damageReceived = 0;
  }

  addThreat(amount) {
    this.threat += amount;
    this.lastSeen = Date.now();
  }

  decay(rate, deltaTime) {
    const decayAmount = rate * (deltaTime / 1000);
    this.threat = Math.max(0, this.threat - decayAmount);
  }
}

/**
 * Enemy Group for coordinated combat
 */
class EnemyGroup {
  constructor(leaderId) {
    this.leaderId = leaderId;
    this.members = new Set([leaderId]);
    this.formation = FormationType.NONE;
    this.targetId = null;
    this.rallyPoint = null;
    this.state = 'IDLE';
  }

  addMember(enemyId) {
    this.members.add(enemyId);
  }

  removeMember(enemyId) {
    this.members.delete(enemyId);
    if (enemyId === this.leaderId && this.members.size > 0) {
      this.leaderId = this.members.values().next().value;
    }
  }

  get size() {
    return this.members.size;
  }
}

/**
 * EnemyAISystem class
 */
export class EnemyAISystem {
  /**
   * Create enemy AI system
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    // Core systems
    this.pathfindingSystem = options.pathfindingSystem || new PathfindingSystem();
    this.perceptionSystem = options.perceptionSystem || new PerceptionSystem();

    // Enemy storage
    this.enemies = new Map(); // enemyId -> enemy data
    this.behaviorTrees = new Map(); // enemyId -> BehaviorTree
    this.threatTables = new Map(); // enemyId -> Map<targetId, ThreatEntry>
    this.groups = new Map(); // groupId -> EnemyGroup

    // Faction relations
    this.factionRelations = { ...DEFAULT_FACTION_RELATIONS };

    // Configuration
    this.config = {
      updateInterval: 100, // ms
      threatDecayRate: 5, // threat per second
      callForHelpRange: 100,
      groupFormationSpacing: 40,
      flankAngle: Math.PI / 3, // 60 degrees
      retreatHealthThreshold: 0.3,
      difficultyMultiplier: 1.0
    };

    // Current game state
    this.currentWeather = 'CLEAR';
    this.isNight = false;

    // Statistics
    this.stats = {
      enemiesManaged: 0,
      behaviorsEvaluated: 0,
      groupsActive: 0,
      attacksCoordinated: 0
    };

    // Event listeners
    this.listeners = [];
  }

  /**
   * Register an enemy with the AI system
   * @param {Object} enemy - Enemy data
   * @returns {boolean} Success
   */
  registerEnemy(enemy) {
    if (!enemy || !enemy.id) {
      console.warn('[EnemyAISystem] Invalid enemy data');
      return false;
    }

    const enhancedEnemy = {
      id: enemy.id,
      type: enemy.type || 'monster',
      faction: enemy.faction || 'monsters',
      position: enemy.position || { x: 0, z: 0 },
      facingAngle: enemy.facingAngle || 0,

      // Combat stats
      health: enemy.health || 100,
      maxHealth: enemy.maxHealth || 100,
      damage: enemy.damage || 10,
      attackRange: enemy.attackRange || 30,
      attackSpeed: enemy.attackSpeed || 1,
      moveSpeed: enemy.moveSpeed || 50,

      // Perception
      aggroRange: enemy.aggroRange || 80,
      visionRange: enemy.visionRange || 100,
      fov: enemy.fov || 120,

      // Behavior
      combatBehavior: enemy.combatBehavior || CombatBehavior.AGGRESSIVE,
      canFlee: enemy.canFlee !== false,
      fleeHealthPercent: enemy.fleeHealthPercent || 0.3,

      // State
      state: EnemyState.IDLE,
      targetId: null,
      currentPath: null,
      pathIndex: 0,
      lastAttackTime: 0,
      alive: true,

      // Patrol
      patrolPath: enemy.patrolPath || null,
      currentWaypointIndex: 0,
      pauseUntil: 0,

      // Guard duty
      guardPosition: enemy.guardPosition || null,
      guardRadius: enemy.guardRadius || 50,

      // Group
      groupId: null,
      isLeader: false,

      ...enemy
    };

    this.enemies.set(enemy.id, enhancedEnemy);
    this.threatTables.set(enemy.id, new Map());

    // Create behavior tree
    this.behaviorTrees.set(enemy.id, this._createBehaviorTree(enhancedEnemy));

    this.stats.enemiesManaged++;
    return true;
  }

  /**
   * Unregister an enemy
   * @param {string} enemyId - Enemy ID
   */
  unregisterEnemy(enemyId) {
    const enemy = this.enemies.get(enemyId);
    if (enemy && enemy.groupId) {
      this._removeFromGroup(enemyId, enemy.groupId);
    }

    this.enemies.delete(enemyId);
    this.behaviorTrees.delete(enemyId);
    this.threatTables.delete(enemyId);
    this.stats.enemiesManaged--;
  }

  /**
   * Get enemy data
   * @param {string} enemyId - Enemy ID
   * @returns {Object|null}
   */
  getEnemy(enemyId) {
    return this.enemies.get(enemyId) || null;
  }

  /**
   * Get all enemies
   * @returns {Object[]}
   */
  getAllEnemies() {
    return Array.from(this.enemies.values());
  }

  /**
   * Get living enemies
   * @returns {Object[]}
   */
  getLivingEnemies() {
    return Array.from(this.enemies.values()).filter(e => e.alive);
  }

  /**
   * Set faction relation
   * @param {string} faction1 - First faction
   * @param {string} faction2 - Second faction
   * @param {string} relation - FactionRelation
   */
  setFactionRelation(faction1, faction2, relation) {
    if (!this.factionRelations[faction1]) {
      this.factionRelations[faction1] = {};
    }
    this.factionRelations[faction1][faction2] = relation;

    // Make it mutual
    if (!this.factionRelations[faction2]) {
      this.factionRelations[faction2] = {};
    }
    this.factionRelations[faction2][faction1] = relation;
  }

  /**
   * Get faction relation
   * @param {string} faction1 - First faction
   * @param {string} faction2 - Second faction
   * @returns {string} FactionRelation
   */
  getFactionRelation(faction1, faction2) {
    if (faction1 === faction2) return FactionRelation.FRIENDLY;

    const relations = this.factionRelations[faction1];
    return relations ? (relations[faction2] || FactionRelation.NEUTRAL) : FactionRelation.NEUTRAL;
  }

  /**
   * Check if two factions are hostile
   * @param {string} faction1 - First faction
   * @param {string} faction2 - Second faction
   * @returns {boolean}
   */
  areHostile(faction1, faction2) {
    return this.getFactionRelation(faction1, faction2) === FactionRelation.HOSTILE;
  }

  /**
   * Create enemy group
   * @param {string} leaderId - Leader enemy ID
   * @param {string[]} memberIds - Member enemy IDs
   * @returns {string} Group ID
   */
  createGroup(leaderId, memberIds = []) {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const group = new EnemyGroup(leaderId);

    for (const memberId of memberIds) {
      group.addMember(memberId);
      const enemy = this.enemies.get(memberId);
      if (enemy) {
        enemy.groupId = groupId;
        enemy.isLeader = memberId === leaderId;
      }
    }

    const leader = this.enemies.get(leaderId);
    if (leader) {
      leader.groupId = groupId;
      leader.isLeader = true;
    }

    this.groups.set(groupId, group);
    this.stats.groupsActive++;

    return groupId;
  }

  /**
   * Add enemy to group
   * @param {string} enemyId - Enemy ID
   * @param {string} groupId - Group ID
   */
  addToGroup(enemyId, groupId) {
    const group = this.groups.get(groupId);
    const enemy = this.enemies.get(enemyId);

    if (group && enemy) {
      group.addMember(enemyId);
      enemy.groupId = groupId;
    }
  }

  /**
   * Remove enemy from group
   * @private
   */
  _removeFromGroup(enemyId, groupId) {
    const group = this.groups.get(groupId);
    if (group) {
      group.removeMember(enemyId);
      if (group.size === 0) {
        this.groups.delete(groupId);
        this.stats.groupsActive--;
      }
    }

    const enemy = this.enemies.get(enemyId);
    if (enemy) {
      enemy.groupId = null;
      enemy.isLeader = false;
    }
  }

  /**
   * Update game state
   * @param {Object} gameState - Current game state
   */
  setGameState(gameState) {
    if (gameState.weather) this.currentWeather = gameState.weather;
    if (gameState.isNight !== undefined) this.isNight = gameState.isNight;
    if (gameState.difficultyMultiplier !== undefined) {
      this.config.difficultyMultiplier = gameState.difficultyMultiplier;
    }

    this.perceptionSystem.setWeather(this.currentWeather);
    this.perceptionSystem.setNightMode(this.isNight);
  }

  /**
   * Update all enemies
   * @param {number} deltaTime - Time since last update (ms)
   * @param {Object} gameState - Current game state
   */
  update(deltaTime, gameState = {}) {
    this.setGameState(gameState);

    // Update perception system
    this.perceptionSystem.update(deltaTime);

    // Update threat tables (decay)
    this._updateThreatTables(deltaTime);

    // Update groups
    this._updateGroups(deltaTime, gameState);

    // Update each enemy
    for (const [, enemy] of this.enemies) {
      if (!enemy.alive) continue;
      this._updateEnemy(enemy, deltaTime, gameState);
    }
  }

  /**
   * Update a single enemy
   * @private
   */
  _updateEnemy(enemy, deltaTime, gameState) {
    // Check for death
    if (enemy.health <= 0) {
      enemy.alive = false;
      enemy.state = EnemyState.DEAD;
      this._emitEvent('enemyDied', { enemyId: enemy.id });
      return;
    }

    // Run behavior tree
    const tree = this.behaviorTrees.get(enemy.id);
    if (tree) {
      const context = {
        enemy,
        gameState,
        system: this,
        deltaTime
      };
      tree.update(enemy, context, deltaTime);
      this.stats.behaviorsEvaluated++;
    }

    // Update movement
    if (enemy.currentPath && enemy.pathIndex < enemy.currentPath.length) {
      this._updateMovement(enemy, deltaTime);
    }
  }

  /**
   * Update threat tables
   * @private
   */
  _updateThreatTables(deltaTime) {
    for (const [, threatTable] of this.threatTables) {
      for (const [targetId, entry] of threatTable) {
        entry.decay(this.config.threatDecayRate, deltaTime);
        if (entry.threat <= 0) {
          threatTable.delete(targetId);
        }
      }
    }
  }

  /**
   * Update groups
   * @private
   */
  _updateGroups(deltaTime, gameState) {
    for (const [, group] of this.groups) {
      const leader = this.enemies.get(group.leaderId);
      if (!leader || !leader.alive) {
        // Find new leader
        for (const memberId of group.members) {
          const member = this.enemies.get(memberId);
          if (member && member.alive) {
            group.leaderId = memberId;
            member.isLeader = true;
            break;
          }
        }
      }

      // Update formation positions
      if (group.formation !== FormationType.NONE && leader && leader.alive) {
        this._updateFormation(group, leader);
      }
    }
  }

  /**
   * Update formation positions for group
   * @private
   */
  _updateFormation(group, leader) {
    const spacing = this.config.groupFormationSpacing;
    const members = Array.from(group.members).filter(id => {
      const m = this.enemies.get(id);
      return m && m.alive && id !== leader.id;
    });

    switch (group.formation) {
      case FormationType.LINE:
        members.forEach((id, i) => {
          const enemy = this.enemies.get(id);
          if (enemy) {
            enemy.formationOffset = {
              x: (i - (members.length - 1) / 2) * spacing,
              z: -spacing
            };
          }
        });
        break;

      case FormationType.CIRCLE:
        members.forEach((id, i) => {
          const enemy = this.enemies.get(id);
          if (enemy) {
            const angle = (i / members.length) * Math.PI * 2;
            enemy.formationOffset = {
              x: Math.cos(angle) * spacing,
              z: Math.sin(angle) * spacing
            };
          }
        });
        break;

      case FormationType.SURROUND:
        if (group.targetId) {
          const target = this._getTarget(group.targetId);
          if (target) {
            members.forEach((id, i) => {
              const enemy = this.enemies.get(id);
              if (enemy) {
                const angle = (i / members.length) * Math.PI * 2;
                enemy.targetPosition = {
                  x: target.position.x + Math.cos(angle) * spacing,
                  z: target.position.z + Math.sin(angle) * spacing
                };
              }
            });
          }
        }
        break;

      case FormationType.PROTECT_LEADER:
        members.forEach((id, i) => {
          const enemy = this.enemies.get(id);
          if (enemy) {
            const angle = (i / members.length) * Math.PI * 2;
            enemy.formationOffset = {
              x: Math.cos(angle) * (spacing * 0.7),
              z: Math.sin(angle) * (spacing * 0.7)
            };
          }
        });
        break;
      default:
        // Unknown formation, no offset changes
        break;
    }
  }

  /**
   * Update enemy movement
   * @private
   */
  _updateMovement(enemy, deltaTime) {
    const target = enemy.currentPath[enemy.pathIndex];
    const dx = target.x - enemy.position.x;
    const dz = target.z - enemy.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const speed = enemy.moveSpeed * this.config.difficultyMultiplier;
    const moveDistance = speed * (deltaTime / 1000);

    if (dist <= moveDistance) {
      enemy.position.x = target.x;
      enemy.position.z = target.z;
      enemy.pathIndex++;

      if (enemy.pathIndex >= enemy.currentPath.length) {
        enemy.currentPath = null;
        enemy.pathIndex = 0;
      }
    } else {
      const ratio = moveDistance / dist;
      enemy.position.x += dx * ratio;
      enemy.position.z += dz * ratio;
      enemy.facingAngle = Math.atan2(dz, dx);
    }
  }

  /**
   * Create behavior tree for enemy
   * @private
   */
  _createBehaviorTree(enemy) {
    const builder = new BehaviorTreeBuilder();

    return builder
      .selector('Root')
        // Flee at low health
        .sequence('Flee')
          .check('ShouldFlee', (ctx) => this._shouldFlee(ctx.enemy))
          .action('FleeFromTarget', (ctx) => this._flee(ctx.enemy))
        .end()

        // Attack if in range
        .sequence('Attack')
          .check('HasTarget', (ctx) => ctx.enemy.targetId !== null)
          .check('InAttackRange', (ctx) => this._isInAttackRange(ctx.enemy))
          .action('PerformAttack', (ctx) => this._attack(ctx.enemy, ctx.gameState))
        .end()

        // Chase target
        .sequence('Chase')
          .check('HasTarget', (ctx) => ctx.enemy.targetId !== null)
          .action('ChaseTarget', (ctx) => this._chase(ctx.enemy))
        .end()

        // Guard behavior
        .sequence('Guard')
          .check('IsGuard', (ctx) => ctx.enemy.guardPosition !== null)
          .selector('GuardActions')
            .sequence('ReturnToPost')
              .check('TooFarFromPost', (ctx) => this._isTooFarFromPost(ctx.enemy))
              .action('ReturnToGuardPost', (ctx) => this._returnToPost(ctx.enemy))
            .end()
            .action('GuardIdle', (ctx) => this._guardIdle(ctx.enemy))
          .end()
        .end()

        // Patrol behavior
        .sequence('Patrol')
          .check('HasPatrolPath', (ctx) => ctx.enemy.patrolPath !== null)
          .action('DoPatrol', (ctx) => this._patrol(ctx.enemy, ctx.deltaTime))
        .end()

        // Detect threats
        .sequence('DetectThreats')
          .action('ScanForThreats', (ctx) => this._scanForThreats(ctx.enemy, ctx.gameState))
        .end()

        // Idle
        .action('Idle', (ctx) => {
          ctx.enemy.state = EnemyState.IDLE;
          return NodeStatus.SUCCESS;
        })
      .end()
      .build(new Blackboard());
  }

  /**
   * Check if enemy should flee
   * @private
   */
  _shouldFlee(enemy) {
    if (!enemy.canFlee) return false;
    const healthPercent = enemy.health / enemy.maxHealth;
    return healthPercent < enemy.fleeHealthPercent;
  }

  /**
   * Flee from current target
   * @private
   */
  _flee(enemy) {
    if (!enemy.targetId) {
      enemy.state = EnemyState.IDLE;
      return NodeStatus.SUCCESS;
    }

    const target = this._getTarget(enemy.targetId);
    if (!target) {
      enemy.targetId = null;
      return NodeStatus.FAILURE;
    }

    // Move away from target
    const dx = enemy.position.x - target.position.x;
    const dz = enemy.position.z - target.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > enemy.aggroRange * 1.5) {
      enemy.state = EnemyState.IDLE;
      enemy.targetId = null;
      return NodeStatus.SUCCESS;
    }

    // Find flee direction
    const fleeDir = normalize({ x: dx, z: dz });
    const fleeTarget = {
      x: enemy.position.x + fleeDir.x * 100,
      z: enemy.position.z + fleeDir.z * 100
    };

    if (!enemy.currentPath) {
      const result = this.pathfindingSystem.findPath(enemy.position, fleeTarget);
      if (result.success) {
        enemy.currentPath = result.path;
        enemy.pathIndex = 0;
      }
    }

    enemy.state = EnemyState.FLEE;
    return NodeStatus.RUNNING;
  }

  /**
   * Check if in attack range
   * @private
   */
  _isInAttackRange(enemy) {
    const target = this._getTarget(enemy.targetId);
    if (!target) return false;

    const dist = distance(enemy.position, target.position);
    return dist <= enemy.attackRange;
  }

  /**
   * Perform attack
   * @private
   */
  _attack(enemy, gameState) {
    const now = Date.now();
    const attackCooldown = 1000 / (enemy.attackSpeed * this.config.difficultyMultiplier);

    if (now - enemy.lastAttackTime < attackCooldown) {
      return NodeStatus.RUNNING;
    }

    const target = this._getTarget(enemy.targetId);
    if (!target) return NodeStatus.FAILURE;

    // Face target
    const dx = target.position.x - enemy.position.x;
    const dz = target.position.z - enemy.position.z;
    enemy.facingAngle = Math.atan2(dz, dx);

    // Deal damage
    const damage = enemy.damage * this.config.difficultyMultiplier;
    this._emitEvent('enemyAttack', {
      enemyId: enemy.id,
      targetId: enemy.targetId,
      damage,
      position: { ...target.position }
    });

    enemy.lastAttackTime = now;
    enemy.state = EnemyState.ATTACK;

    // Update threat
    this._addThreat(enemy.id, enemy.targetId, damage * 0.5);

    return NodeStatus.SUCCESS;
  }

  /**
   * Chase target
   * @private
   */
  _chase(enemy) {
    const target = this._getTarget(enemy.targetId);
    if (!target) {
      enemy.targetId = null;
      return NodeStatus.FAILURE;
    }

    const dist = distance(enemy.position, target.position);

    // Lost target
    if (dist > enemy.aggroRange * 1.5) {
      enemy.targetId = null;
      enemy.currentPath = null;
      return NodeStatus.FAILURE;
    }

    // Calculate path to target
    if (!enemy.currentPath || enemy.pathIndex >= enemy.currentPath.length - 1) {
      const result = this.pathfindingSystem.findPath(enemy.position, target.position);
      if (result.success) {
        enemy.currentPath = result.path;
        enemy.pathIndex = 0;
      }
    }

    enemy.state = EnemyState.CHASE;
    return NodeStatus.RUNNING;
  }

  /**
   * Check if too far from guard post
   * @private
   */
  _isTooFarFromPost(enemy) {
    if (!enemy.guardPosition) return false;
    const dist = distance(enemy.position, enemy.guardPosition);
    return dist > enemy.guardRadius;
  }

  /**
   * Return to guard post
   * @private
   */
  _returnToPost(enemy) {
    if (!enemy.currentPath) {
      const result = this.pathfindingSystem.findPath(enemy.position, enemy.guardPosition);
      if (result.success) {
        enemy.currentPath = result.path;
        enemy.pathIndex = 0;
      }
    }

    enemy.state = EnemyState.REGROUP;
    return NodeStatus.RUNNING;
  }

  /**
   * Guard idle behavior
   * @private
   */
  _guardIdle(enemy) {
    enemy.state = EnemyState.GUARD;
    return NodeStatus.SUCCESS;
  }

  /**
   * Patrol behavior
   * @private
   */
  _patrol(enemy, deltaTime) {
    if (!enemy.patrolPath || enemy.patrolPath.length === 0) {
      return NodeStatus.FAILURE;
    }

    // Check for pause
    if (enemy.pauseUntil && Date.now() < enemy.pauseUntil) {
      enemy.state = EnemyState.PATROL;
      return NodeStatus.RUNNING;
    }

    const waypoint = enemy.patrolPath[enemy.currentWaypointIndex];
    const dist = distance(enemy.position, waypoint);

    if (dist < 16) {
      // Reached waypoint
      enemy.currentWaypointIndex = (enemy.currentWaypointIndex + 1) % enemy.patrolPath.length;
      enemy.pauseUntil = Date.now() + 2000;
      enemy.currentPath = null;
    } else if (!enemy.currentPath) {
      const result = this.pathfindingSystem.findPath(enemy.position, waypoint);
      if (result.success) {
        enemy.currentPath = result.path;
        enemy.pathIndex = 0;
      }
    }

    enemy.state = EnemyState.PATROL;
    return NodeStatus.RUNNING;
  }

  /**
   * Scan for threats
   * @private
   */
  _scanForThreats(enemy, gameState) {
    const player = gameState.player;
    if (!player || !player.position) return NodeStatus.FAILURE;

    // Check if player is in range and visible
    const dist = distance(enemy.position, player.position);

    if (dist <= enemy.aggroRange) {
      // Check faction hostility
      if (this.areHostile(enemy.faction, 'player')) {
        enemy.targetId = 'player';
        enemy.state = EnemyState.ALERT;

        // Call for help from nearby allies
        this._callForHelp(enemy, 'player');

        this._emitEvent('enemyAggro', {
          enemyId: enemy.id,
          targetId: 'player',
          distance: dist
        });

        return NodeStatus.SUCCESS;
      }
    }

    return NodeStatus.FAILURE;
  }

  /**
   * Call for help from nearby allies
   * @private
   */
  _callForHelp(enemy, targetId) {
    for (const [otherId, other] of this.enemies) {
      if (otherId === enemy.id || !other.alive) continue;
      if (other.faction !== enemy.faction) continue;
      if (other.targetId) continue; // Already engaged

      const dist = distance(enemy.position, other.position);
      if (dist <= this.config.callForHelpRange) {
        other.targetId = targetId;
        other.state = EnemyState.ALERT;

        this._emitEvent('enemyAlerted', {
          enemyId: otherId,
          alerterId: enemy.id,
          targetId
        });
      }
    }
  }

  /**
   * Get target entity
   * @private
   */
  _getTarget(targetId) {
    if (targetId === 'player') {
      // Return player from last game state
      return this._lastGameState?.player || null;
    }

    // Check if it's another enemy
    const enemy = this.enemies.get(targetId);
    if (enemy && enemy.alive) {
      return enemy;
    }

    return null;
  }

  /**
   * Add threat to threat table
   * @param {string} enemyId - Enemy ID
   * @param {string} targetId - Target ID
   * @param {number} amount - Threat amount
   */
  _addThreat(enemyId, targetId, amount) {
    const table = this.threatTables.get(enemyId);
    if (!table) return;

    if (table.has(targetId)) {
      table.get(targetId).addThreat(amount);
    } else {
      table.set(targetId, new ThreatEntry(targetId, amount));
    }
  }

  /**
   * Get highest threat target
   * @param {string} enemyId - Enemy ID
   * @returns {string|null} Target ID with highest threat
   */
  getHighestThreatTarget(enemyId) {
    const table = this.threatTables.get(enemyId);
    if (!table || table.size === 0) return null;

    let highest = null;
    let highestThreat = 0;

    for (const [targetId, entry] of table) {
      if (entry.threat > highestThreat) {
        highest = targetId;
        highestThreat = entry.threat;
      }
    }

    return highest;
  }

  /**
   * Deal damage to enemy
   * @param {string} enemyId - Enemy ID
   * @param {number} damage - Damage amount
   * @param {string} sourceId - Damage source ID
   */
  dealDamage(enemyId, damage, sourceId = 'player') {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || !enemy.alive) return;

    enemy.health = Math.max(0, enemy.health - damage);

    // Add threat from damage source
    this._addThreat(enemyId, sourceId, damage);

    // Switch target to attacker
    if (!enemy.targetId) {
      enemy.targetId = sourceId;
      enemy.state = EnemyState.ALERT;
    }

    this._emitEvent('enemyDamaged', {
      enemyId,
      damage,
      sourceId,
      healthRemaining: enemy.health
    });

    if (enemy.health <= 0) {
      enemy.alive = false;
      enemy.state = EnemyState.DEAD;
      this._emitEvent('enemyDied', { enemyId, killerId: sourceId });
    }
  }

  /**
   * Set group formation
   * @param {string} groupId - Group ID
   * @param {string} formation - FormationType
   */
  setGroupFormation(groupId, formation) {
    const group = this.groups.get(groupId);
    if (group) {
      group.formation = formation;
    }
  }

  /**
   * Coordinate group attack
   * @param {string} groupId - Group ID
   * @param {string} targetId - Target ID
   */
  coordinateGroupAttack(groupId, targetId) {
    const group = this.groups.get(groupId);
    if (!group) return;

    group.targetId = targetId;

    // Set all members to target
    for (const memberId of group.members) {
      const member = this.enemies.get(memberId);
      if (member && member.alive) {
        member.targetId = targetId;
        member.state = EnemyState.ALERT;
      }
    }

    // Set surround formation for coordinated attack
    this.setGroupFormation(groupId, FormationType.SURROUND);
    this.stats.attacksCoordinated++;

    this._emitEvent('coordinatedAttack', { groupId, targetId });
  }

  /**
   * Add event listener
   * @param {Function} listener - Callback(eventType, data)
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   * @param {Function} listener
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit event
   * @private
   */
  _emitEvent(type, data) {
    for (const listener of this.listeners) {
      try {
        listener(type, data);
      } catch (error) {
        console.error('[EnemyAISystem] Listener error:', error);
      }
    }
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStatistics() {
    return {
      ...this.stats,
      livingEnemies: this.getLivingEnemies().length
    };
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    const enemies = {};
    for (const [id, enemy] of this.enemies) {
      enemies[id] = {
        id: enemy.id,
        type: enemy.type,
        faction: enemy.faction,
        position: enemy.position,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        state: enemy.state,
        targetId: enemy.targetId,
        alive: enemy.alive,
        guardPosition: enemy.guardPosition,
        patrolPath: enemy.patrolPath,
        currentWaypointIndex: enemy.currentWaypointIndex
      };
    }

    const groups = {};
    for (const [id, group] of this.groups) {
      groups[id] = {
        leaderId: group.leaderId,
        members: Array.from(group.members),
        formation: group.formation,
        targetId: group.targetId
      };
    }

    return { enemies, groups };
  }

  /**
   * Load from JSON
   * @param {Object} data
   */
  fromJSON(data) {
    this.enemies.clear();
    this.behaviorTrees.clear();
    this.threatTables.clear();
    this.groups.clear();

    if (data.enemies) {
      for (const enemyData of Object.values(data.enemies)) {
        this.registerEnemy(enemyData);
      }
    }

    if (data.groups) {
      for (const [groupId, groupData] of Object.entries(data.groups)) {
        const group = new EnemyGroup(groupData.leaderId);
        for (const memberId of groupData.members) {
          group.addMember(memberId);
        }
        group.formation = groupData.formation;
        group.targetId = groupData.targetId;
        this.groups.set(groupId, group);
      }
    }
  }
}

export { ThreatEntry, EnemyGroup };
export default EnemyAISystem;
