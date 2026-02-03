/**
 * CompanionAISystem.js - Player Companion AI
 *
 * Features:
 * - Follow behavior with smart pathfinding
 * - Combat assistance with target prioritization
 * - Utility actions (gathering, scouting)
 * - Command system (stay, follow, attack, defend)
 * - Companion personality and bonding
 */

import {
  BehaviorTreeBuilder,
  Blackboard,
  NodeStatus
} from './BehaviorTree.js';

import { PathfindingSystem, distance } from './PathfindingSystem.js';

/**
 * Companion types
 */
export const CompanionType = {
  PET: 'PET',           // Dog, cat - moral support, find items
  MERCENARY: 'MERCENARY', // Fighter - combat focused
  MAGE: 'MAGE',         // Caster - ranged support
  MOUNT: 'MOUNT',       // Horse, wolf - fast travel, storage
  GATHERER: 'GATHERER'  // Collector - gathers resources
};

/**
 * Companion commands
 */
export const CompanionCommand = {
  FOLLOW: 'FOLLOW',     // Follow player
  STAY: 'STAY',         // Stay at position
  ATTACK: 'ATTACK',     // Attack target
  DEFEND: 'DEFEND',     // Defend player/area
  GATHER: 'GATHER',     // Gather nearby resources
  SCOUT: 'SCOUT',       // Scout ahead
  PATROL: 'PATROL',     // Patrol area
  RETURN: 'RETURN'      // Return to player
};

/**
 * Companion states
 */
export const CompanionState = {
  IDLE: 'IDLE',
  FOLLOWING: 'FOLLOWING',
  STAYING: 'STAYING',
  ATTACKING: 'ATTACKING',
  DEFENDING: 'DEFENDING',
  GATHERING: 'GATHERING',
  SCOUTING: 'SCOUTING',
  PATROLLING: 'PATROLLING',
  RETURNING: 'RETURNING',
  RESTING: 'RESTING',
  DEAD: 'DEAD'
};

/**
 * Default companion type configurations
 */
const DEFAULT_COMPANION_TYPES = {
  [CompanionType.PET]: {
    moveSpeed: 80,
    followDistance: 40,
    combatCapable: false,
    canGather: false,
    canScout: true,
    detectRange: 100,
    bondingRate: 2.0
  },
  [CompanionType.MERCENARY]: {
    moveSpeed: 60,
    followDistance: 50,
    combatCapable: true,
    canGather: false,
    canScout: false,
    attackRange: 30,
    damage: 15,
    health: 100,
    bondingRate: 1.0
  },
  [CompanionType.MAGE]: {
    moveSpeed: 50,
    followDistance: 70,
    combatCapable: true,
    canGather: false,
    canScout: false,
    attackRange: 80,
    damage: 20,
    health: 60,
    bondingRate: 1.2
  },
  [CompanionType.MOUNT]: {
    moveSpeed: 120,
    followDistance: 30,
    combatCapable: false,
    canGather: false,
    canScout: false,
    canMount: true,
    storageSlots: 10,
    bondingRate: 1.5
  },
  [CompanionType.GATHERER]: {
    moveSpeed: 50,
    followDistance: 60,
    combatCapable: false,
    canGather: true,
    canScout: false,
    gatherRange: 50,
    gatherSpeed: 1.5,
    bondingRate: 1.0
  }
};

/**
 * CompanionAISystem class
 */
export class CompanionAISystem {
  /**
   * Create companion AI system
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    this.pathfindingSystem = options.pathfindingSystem || new PathfindingSystem();

    // Companion type definitions
    this.companionTypes = { ...DEFAULT_COMPANION_TYPES, ...options.companionTypes };

    // Companions
    this.companions = new Map(); // companionId -> companion data
    this.behaviorTrees = new Map(); // companionId -> BehaviorTree

    // Currently active companion (player can have one active at a time)
    this.activeCompanionId = null;

    // Configuration
    this.config = {
      maxFollowDistance: 200, // Teleport if too far
      combatEngageRange: 80,
      returnThreshold: 150,
      bondingDecayRate: 0.001 // Per hour
    };

    // Statistics
    this.stats = {
      companionsManaged: 0,
      commandsExecuted: 0,
      combatAssists: 0,
      itemsGathered: 0
    };

    // Event listeners
    this.listeners = [];
  }

  /**
   * Register a companion
   * @param {Object} companion - Companion data
   * @returns {boolean} Success
   */
  registerCompanion(companion) {
    if (!companion || !companion.id) return false;

    const typeData = this.companionTypes[companion.type] || this.companionTypes[CompanionType.PET];

    const enhancedCompanion = {
      id: companion.id,
      name: companion.name || 'Companion',
      type: companion.type || CompanionType.PET,
      position: companion.position || { x: 0, z: 0 },
      facingAngle: 0,

      // Stats from type
      moveSpeed: companion.moveSpeed || typeData.moveSpeed || 60,
      followDistance: companion.followDistance || typeData.followDistance || 50,
      combatCapable: typeData.combatCapable || false,
      attackRange: typeData.attackRange || 30,
      damage: typeData.damage || 10,
      health: companion.health || typeData.health || 50,
      maxHealth: companion.maxHealth || typeData.health || 50,
      detectRange: typeData.detectRange || 60,

      // Abilities
      canGather: typeData.canGather || false,
      canScout: typeData.canScout || false,
      canMount: typeData.canMount || false,
      gatherRange: typeData.gatherRange || 50,
      storageSlots: typeData.storageSlots || 0,

      // State
      state: CompanionState.IDLE,
      command: CompanionCommand.FOLLOW,
      targetId: null,
      targetPosition: null,
      currentPath: null,
      pathIndex: 0,
      alive: true,

      // Bonding
      bondLevel: companion.bondLevel || 0, // 0-100
      bondingRate: typeData.bondingRate || 1.0,
      lastBondingUpdate: Date.now(),

      // Inventory (for mounts/gatherers)
      inventory: companion.inventory || [],

      // Stats tracking
      enemiesKilled: companion.enemiesKilled || 0,
      itemsGathered: companion.itemsGathered || 0,
      distanceTraveled: companion.distanceTraveled || 0,

      ...companion
    };

    this.companions.set(companion.id, enhancedCompanion);
    this.behaviorTrees.set(companion.id, this._createBehaviorTree(enhancedCompanion));
    this.stats.companionsManaged++;

    return true;
  }

  /**
   * Unregister a companion
   * @param {string} companionId - Companion ID
   */
  unregisterCompanion(companionId) {
    if (this.activeCompanionId === companionId) {
      this.activeCompanionId = null;
    }
    this.companions.delete(companionId);
    this.behaviorTrees.delete(companionId);
    this.stats.companionsManaged--;
  }

  /**
   * Get companion data
   * @param {string} companionId - Companion ID
   * @returns {Object|null}
   */
  getCompanion(companionId) {
    return this.companions.get(companionId) || null;
  }

  /**
   * Get all companions
   * @returns {Object[]}
   */
  getAllCompanions() {
    return Array.from(this.companions.values());
  }

  /**
   * Get active companion
   * @returns {Object|null}
   */
  getActiveCompanion() {
    return this.activeCompanionId ? this.companions.get(this.activeCompanionId) : null;
  }

  /**
   * Set active companion
   * @param {string} companionId - Companion ID
   * @returns {boolean} Success
   */
  setActiveCompanion(companionId) {
    if (!this.companions.has(companionId)) return false;

    // Deactivate previous companion
    if (this.activeCompanionId) {
      const prev = this.companions.get(this.activeCompanionId);
      if (prev) {
        prev.command = CompanionCommand.STAY;
        prev.state = CompanionState.STAYING;
      }
    }

    this.activeCompanionId = companionId;
    const companion = this.companions.get(companionId);
    companion.command = CompanionCommand.FOLLOW;

    this._emitEvent('companionActivated', { companionId });
    return true;
  }

  /**
   * Issue command to companion
   * @param {string} companionId - Companion ID
   * @param {string} command - CompanionCommand
   * @param {Object} params - Command parameters
   * @returns {boolean} Success
   */
  issueCommand(companionId, command, params = {}) {
    const companion = this.companions.get(companionId);
    if (!companion || !companion.alive) return false;

    companion.command = command;
    companion.targetId = params.targetId || null;
    companion.targetPosition = params.position || null;
    companion.currentPath = null;

    // Set initial state based on command
    switch (command) {
      case CompanionCommand.FOLLOW:
        companion.state = CompanionState.FOLLOWING;
        break;
      case CompanionCommand.STAY:
        companion.state = CompanionState.STAYING;
        companion.targetPosition = { ...companion.position };
        break;
      case CompanionCommand.ATTACK:
        if (companion.combatCapable && params.targetId) {
          companion.state = CompanionState.ATTACKING;
        } else {
          return false;
        }
        break;
      case CompanionCommand.DEFEND:
        companion.state = CompanionState.DEFENDING;
        companion.targetPosition = params.position || { ...companion.position };
        break;
      case CompanionCommand.GATHER:
        if (companion.canGather) {
          companion.state = CompanionState.GATHERING;
        } else {
          return false;
        }
        break;
      case CompanionCommand.SCOUT:
        if (companion.canScout) {
          companion.state = CompanionState.SCOUTING;
          companion.targetPosition = params.position;
        } else {
          return false;
        }
        break;
      case CompanionCommand.RETURN:
        companion.state = CompanionState.RETURNING;
        break;
      default:
        // Unknown command, no state change
        break;
    }

    this.stats.commandsExecuted++;
    this._emitEvent('commandIssued', { companionId, command, params });

    return true;
  }

  /**
   * Update all companions
   * @param {number} deltaTime - Time since last update (ms)
   * @param {Object} gameState - Current game state
   */
  update(deltaTime, gameState = {}) {
    for (const [, companion] of this.companions) {
      if (!companion.alive) continue;

      this._updateCompanion(companion, deltaTime, gameState);
    }
  }

  /**
   * Update single companion
   * @private
   */
  _updateCompanion(companion, deltaTime, gameState) {
    // Update bonding
    this._updateBonding(companion, deltaTime, gameState);

    // Run behavior tree
    const tree = this.behaviorTrees.get(companion.id);
    if (tree) {
      const context = { companion, gameState, system: this, deltaTime };
      tree.update(companion, context, deltaTime);
    }

    // Update movement
    if (companion.currentPath && companion.pathIndex < companion.currentPath.length) {
      this._updateMovement(companion, deltaTime);
    }

    // Teleport if too far from player
    if (companion.command === CompanionCommand.FOLLOW && gameState.player) {
      const dist = distance(companion.position, gameState.player.position);
      if (dist > this.config.maxFollowDistance) {
        this._teleportToPlayer(companion, gameState.player);
      }
    }
  }

  /**
   * Update bonding level
   * @private
   */
  _updateBonding(companion, deltaTime, gameState) {
    const timeSinceUpdate = Date.now() - companion.lastBondingUpdate;
    if (timeSinceUpdate < 60000) return; // Update every minute

    companion.lastBondingUpdate = Date.now();

    // Increase bonding while active and near player
    if (this.activeCompanionId === companion.id && gameState.player) {
      const dist = distance(companion.position, gameState.player.position);
      if (dist < 100) {
        companion.bondLevel = Math.min(100, companion.bondLevel + companion.bondingRate);
      }
    }

    // Decay if not active
    if (this.activeCompanionId !== companion.id) {
      companion.bondLevel = Math.max(0, companion.bondLevel - this.config.bondingDecayRate);
    }
  }

  /**
   * Update companion movement
   * @private
   */
  _updateMovement(companion, deltaTime) {
    const target = companion.currentPath[companion.pathIndex];
    const dx = target.x - companion.position.x;
    const dz = target.z - companion.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const moveDistance = companion.moveSpeed * (deltaTime / 1000);

    if (dist <= moveDistance) {
      companion.position.x = target.x;
      companion.position.z = target.z;
      companion.pathIndex++;

      if (companion.pathIndex >= companion.currentPath.length) {
        companion.currentPath = null;
        companion.pathIndex = 0;
      }
    } else {
      const ratio = moveDistance / dist;
      const oldPos = { ...companion.position };
      companion.position.x += dx * ratio;
      companion.position.z += dz * ratio;
      companion.facingAngle = Math.atan2(dz, dx);

      // Track distance traveled
      companion.distanceTraveled += distance(oldPos, companion.position);
    }
  }

  /**
   * Teleport companion to player
   * @private
   */
  _teleportToPlayer(companion, player) {
    const angle = Math.random() * Math.PI * 2;
    companion.position = {
      x: player.position.x + Math.cos(angle) * 30,
      z: player.position.z + Math.sin(angle) * 30
    };
    companion.currentPath = null;

    this._emitEvent('companionTeleported', {
      companionId: companion.id,
      position: { ...companion.position }
    });
  }

  /**
   * Create behavior tree for companion
   * @private
   */
  _createBehaviorTree(companion) {
    const builder = new BehaviorTreeBuilder();

    return builder
      .selector('Root')
        // Combat (if combat capable and in combat mode)
        .sequence('Combat')
          .check('IsCombatCapable', (ctx) => ctx.companion.combatCapable)
          .check('HasCombatTarget', (ctx) =>
            ctx.companion.state === CompanionState.ATTACKING ||
            ctx.companion.state === CompanionState.DEFENDING)
          .action('DoCombat', (ctx) => this._doCombat(ctx.companion, ctx.gameState))
        .end()

        // Follow player
        .sequence('Follow')
          .check('IsFollowing', (ctx) => ctx.companion.command === CompanionCommand.FOLLOW)
          .action('DoFollow', (ctx) => this._doFollow(ctx.companion, ctx.gameState))
        .end()

        // Stay at position
        .sequence('Stay')
          .check('IsStaying', (ctx) => ctx.companion.command === CompanionCommand.STAY)
          .action('DoStay', (ctx) => this._doStay(ctx.companion))
        .end()

        // Gather resources
        .sequence('Gather')
          .check('IsGathering', (ctx) => ctx.companion.state === CompanionState.GATHERING)
          .action('DoGather', (ctx) => this._doGather(ctx.companion, ctx.gameState))
        .end()

        // Scout
        .sequence('Scout')
          .check('IsScouting', (ctx) => ctx.companion.state === CompanionState.SCOUTING)
          .action('DoScout', (ctx) => this._doScout(ctx.companion))
        .end()

        // Return to player
        .sequence('Return')
          .check('IsReturning', (ctx) => ctx.companion.state === CompanionState.RETURNING)
          .action('DoReturn', (ctx) => this._doReturn(ctx.companion, ctx.gameState))
        .end()

        // Idle
        .action('Idle', (ctx) => {
          ctx.companion.state = CompanionState.IDLE;
          return NodeStatus.SUCCESS;
        })
      .end()
      .build(new Blackboard());
  }

  /**
   * Combat behavior
   * @private
   */
  _doCombat(companion, gameState) {
    if (!companion.targetId) {
      // Find target
      if (companion.state === CompanionState.DEFENDING) {
        // Look for enemies near defend position
        companion.targetId = this._findNearbyEnemy(companion, gameState);
      }
      if (!companion.targetId) {
        companion.state = CompanionState.IDLE;
        return NodeStatus.FAILURE;
      }
    }

    const target = this._getTarget(companion.targetId, gameState);
    if (!target || (target.alive !== undefined && !target.alive)) {
      companion.targetId = null;
      this.stats.combatAssists++;
      return NodeStatus.SUCCESS;
    }

    const dist = distance(companion.position, target.position);

    // In range - attack
    if (dist <= companion.attackRange) {
      this._emitEvent('companionAttack', {
        companionId: companion.id,
        targetId: companion.targetId,
        damage: companion.damage
      });
      return NodeStatus.RUNNING;
    }

    // Move toward target
    if (!companion.currentPath) {
      const result = this.pathfindingSystem.findPath(companion.position, target.position);
      if (result.success) {
        companion.currentPath = result.path;
        companion.pathIndex = 0;
      }
    }

    return NodeStatus.RUNNING;
  }

  /**
   * Follow player behavior
   * @private
   */
  _doFollow(companion, gameState) {
    const player = gameState.player;
    if (!player) return NodeStatus.FAILURE;

    companion.state = CompanionState.FOLLOWING;

    const dist = distance(companion.position, player.position);

    // Already close enough
    if (dist <= companion.followDistance) {
      companion.currentPath = null;
      return NodeStatus.SUCCESS;
    }

    // Path to player
    if (!companion.currentPath || companion.pathIndex >= companion.currentPath.length) {
      // Calculate position behind player
      const behindAngle = player.facingAngle + Math.PI;
      const targetPos = {
        x: player.position.x + Math.cos(behindAngle) * companion.followDistance,
        z: player.position.z + Math.sin(behindAngle) * companion.followDistance
      };

      const result = this.pathfindingSystem.findPath(companion.position, targetPos);
      if (result.success) {
        companion.currentPath = result.path;
        companion.pathIndex = 0;
      }
    }

    return NodeStatus.RUNNING;
  }

  /**
   * Stay behavior
   * @private
   */
  _doStay(companion) {
    companion.state = CompanionState.STAYING;
    companion.currentPath = null;
    return NodeStatus.SUCCESS;
  }

  /**
   * Gather behavior
   * @private
   */
  _doGather(companion, gameState) {
    // Find nearby resource
    if (!companion.targetPosition) {
      // This would normally integrate with a resource system
      // For now, just wander and "gather"
      const angle = Math.random() * Math.PI * 2;
      companion.targetPosition = {
        x: companion.position.x + Math.cos(angle) * companion.gatherRange,
        z: companion.position.z + Math.sin(angle) * companion.gatherRange
      };
    }

    const dist = distance(companion.position, companion.targetPosition);

    if (dist < 10) {
      // "Gathered" resource
      companion.itemsGathered++;
      this.stats.itemsGathered++;
      companion.targetPosition = null;

      this._emitEvent('itemGathered', {
        companionId: companion.id,
        position: { ...companion.position }
      });

      return NodeStatus.SUCCESS;
    }

    // Move to gather point
    if (!companion.currentPath) {
      const result = this.pathfindingSystem.findPath(companion.position, companion.targetPosition);
      if (result.success) {
        companion.currentPath = result.path;
        companion.pathIndex = 0;
      }
    }

    return NodeStatus.RUNNING;
  }

  /**
   * Scout behavior
   * @private
   */
  _doScout(companion) {
    if (!companion.targetPosition) {
      companion.state = CompanionState.IDLE;
      return NodeStatus.SUCCESS;
    }

    const dist = distance(companion.position, companion.targetPosition);

    if (dist < 20) {
      // Reached scout point
      this._emitEvent('scoutComplete', {
        companionId: companion.id,
        position: { ...companion.targetPosition }
      });
      companion.targetPosition = null;
      companion.state = CompanionState.RETURNING;
      return NodeStatus.SUCCESS;
    }

    // Move to scout point
    if (!companion.currentPath) {
      const result = this.pathfindingSystem.findPath(companion.position, companion.targetPosition);
      if (result.success) {
        companion.currentPath = result.path;
        companion.pathIndex = 0;
      }
    }

    return NodeStatus.RUNNING;
  }

  /**
   * Return to player behavior
   * @private
   */
  _doReturn(companion, gameState) {
    const player = gameState.player;
    if (!player) return NodeStatus.FAILURE;

    const dist = distance(companion.position, player.position);

    if (dist <= companion.followDistance) {
      companion.command = CompanionCommand.FOLLOW;
      companion.state = CompanionState.FOLLOWING;
      return NodeStatus.SUCCESS;
    }

    if (!companion.currentPath) {
      const result = this.pathfindingSystem.findPath(companion.position, player.position);
      if (result.success) {
        companion.currentPath = result.path;
        companion.pathIndex = 0;
      }
    }

    return NodeStatus.RUNNING;
  }

  /**
   * Find nearby enemy
   * @private
   */
  _findNearbyEnemy(companion, gameState) {
    // This would normally integrate with EnemyAISystem
    // For now, return null
    return null;
  }

  /**
   * Get target entity
   * @private
   */
  _getTarget(targetId, gameState) {
    if (targetId === 'player') {
      return gameState.player;
    }
    // Would integrate with enemy system
    return null;
  }

  /**
   * Deal damage to companion
   * @param {string} companionId - Companion ID
   * @param {number} damage - Damage amount
   */
  dealDamage(companionId, damage) {
    const companion = this.companions.get(companionId);
    if (!companion || !companion.alive) return;

    companion.health = Math.max(0, companion.health - damage);

    this._emitEvent('companionDamaged', {
      companionId,
      damage,
      healthRemaining: companion.health
    });

    if (companion.health <= 0) {
      companion.alive = false;
      companion.state = CompanionState.DEAD;
      if (this.activeCompanionId === companionId) {
        this.activeCompanionId = null;
      }
      this._emitEvent('companionDied', { companionId });
    }
  }

  /**
   * Heal companion
   * @param {string} companionId - Companion ID
   * @param {number} amount - Heal amount
   */
  healCompanion(companionId, amount) {
    const companion = this.companions.get(companionId);
    if (!companion || !companion.alive) return;

    companion.health = Math.min(companion.maxHealth, companion.health + amount);
  }

  /**
   * Add event listener
   */
  addListener(listener) {
    this.listeners.push(listener);
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
        console.error('[CompanionAISystem] Listener error:', error);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return { ...this.stats };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    const companions = {};
    for (const [id, companion] of this.companions) {
      companions[id] = {
        id: companion.id,
        name: companion.name,
        type: companion.type,
        position: companion.position,
        health: companion.health,
        maxHealth: companion.maxHealth,
        state: companion.state,
        command: companion.command,
        alive: companion.alive,
        bondLevel: companion.bondLevel,
        inventory: companion.inventory,
        enemiesKilled: companion.enemiesKilled,
        itemsGathered: companion.itemsGathered,
        distanceTraveled: companion.distanceTraveled
      };
    }

    return {
      companions,
      activeCompanionId: this.activeCompanionId
    };
  }

  /**
   * Load from JSON
   */
  fromJSON(data) {
    this.companions.clear();
    this.behaviorTrees.clear();

    if (data.companions) {
      for (const companionData of Object.values(data.companions)) {
        this.registerCompanion(companionData);
      }
    }

    this.activeCompanionId = data.activeCompanionId || null;
  }
}

export default CompanionAISystem;
