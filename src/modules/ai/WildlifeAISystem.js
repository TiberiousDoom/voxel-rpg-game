/**
 * WildlifeAISystem.js - Animal Behaviors and Herding
 *
 * Features:
 * - Natural animal behaviors (foraging, grazing, hunting, fleeing)
 * - Herd dynamics with flocking behavior
 * - Predator/prey relationships
 * - Territorial behaviors
 * - Day/night cycles for nocturnal animals
 * - Seasonal migration and hibernation
 */

import {
  BehaviorTree,
  BehaviorTreeBuilder,
  Blackboard,
  NodeStatus
} from './BehaviorTree.js';

import { PathfindingSystem, distance, normalize } from './PathfindingSystem.js';

/**
 * Animal behavior types
 */
export const AnimalBehavior = {
  PASSIVE: 'PASSIVE',       // Flees from threats
  NEUTRAL: 'NEUTRAL',       // Attacks if provoked
  AGGRESSIVE: 'AGGRESSIVE', // Hunts players/prey
  HERD: 'HERD'              // Follows herd leader
};

/**
 * Animal activity patterns
 */
export const ActivityPattern = {
  DIURNAL: 'DIURNAL',     // Active during day
  NOCTURNAL: 'NOCTURNAL', // Active at night
  CREPUSCULAR: 'CREPUSCULAR', // Active at dawn/dusk
  ALWAYS: 'ALWAYS'        // Always active
};

/**
 * Animal states
 */
export const AnimalState = {
  IDLE: 'IDLE',
  WANDERING: 'WANDERING',
  FORAGING: 'FORAGING',
  GRAZING: 'GRAZING',
  HUNTING: 'HUNTING',
  FLEEING: 'FLEEING',
  RESTING: 'RESTING',
  FOLLOWING_HERD: 'FOLLOWING_HERD',
  DEFENDING_TERRITORY: 'DEFENDING_TERRITORY',
  HIBERNATING: 'HIBERNATING',
  MIGRATING: 'MIGRATING',
  DEAD: 'DEAD'
};

/**
 * Default animal type definitions
 */
const DEFAULT_ANIMAL_TYPES = {
  // Passive animals
  deer: {
    behavior: AnimalBehavior.PASSIVE,
    activity: ActivityPattern.CREPUSCULAR,
    moveSpeed: 80,
    fleeSpeed: 120,
    detectRange: 60,
    fleeRange: 100,
    herdSize: { min: 3, max: 8 },
    canHibernate: false
  },
  rabbit: {
    behavior: AnimalBehavior.PASSIVE,
    activity: ActivityPattern.CREPUSCULAR,
    moveSpeed: 60,
    fleeSpeed: 100,
    detectRange: 40,
    fleeRange: 80,
    herdSize: null,
    canHibernate: false
  },
  sheep: {
    behavior: AnimalBehavior.HERD,
    activity: ActivityPattern.DIURNAL,
    moveSpeed: 40,
    fleeSpeed: 60,
    detectRange: 30,
    fleeRange: 60,
    herdSize: { min: 5, max: 15 },
    canHibernate: false
  },

  // Neutral animals
  bear: {
    behavior: AnimalBehavior.NEUTRAL,
    activity: ActivityPattern.DIURNAL,
    moveSpeed: 50,
    attackSpeed: 70,
    detectRange: 50,
    aggroRange: 30,
    damage: 25,
    health: 150,
    canHibernate: true,
    territorial: true,
    territoryRadius: 100
  },
  boar: {
    behavior: AnimalBehavior.NEUTRAL,
    activity: ActivityPattern.DIURNAL,
    moveSpeed: 60,
    attackSpeed: 80,
    detectRange: 40,
    aggroRange: 25,
    damage: 15,
    health: 80,
    herdSize: { min: 2, max: 5 }
  },

  // Aggressive animals
  wolf: {
    behavior: AnimalBehavior.AGGRESSIVE,
    activity: ActivityPattern.NOCTURNAL,
    moveSpeed: 70,
    attackSpeed: 90,
    detectRange: 80,
    aggroRange: 60,
    damage: 12,
    health: 60,
    herdSize: { min: 3, max: 7 },
    huntPrey: ['deer', 'rabbit', 'sheep']
  }
};

/**
 * Herd data
 */
class Herd {
  constructor(leaderId, animalType) {
    this.id = `herd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.leaderId = leaderId;
    this.animalType = animalType;
    this.members = new Set([leaderId]);
    this.targetPosition = null;
    this.state = 'IDLE';
  }

  addMember(animalId) {
    this.members.add(animalId);
  }

  removeMember(animalId) {
    this.members.delete(animalId);
    if (animalId === this.leaderId && this.members.size > 0) {
      this.leaderId = this.members.values().next().value;
    }
  }

  get size() {
    return this.members.size;
  }
}

/**
 * WildlifeAISystem class
 */
export class WildlifeAISystem {
  /**
   * Create wildlife AI system
   * @param {Object} options - Configuration
   */
  constructor(options = {}) {
    this.pathfindingSystem = options.pathfindingSystem || new PathfindingSystem();

    // Animal definitions
    this.animalTypes = { ...DEFAULT_ANIMAL_TYPES, ...options.animalTypes };

    // Animals
    this.animals = new Map(); // animalId -> animal data
    this.behaviorTrees = new Map(); // animalId -> BehaviorTree

    // Herds
    this.herds = new Map(); // herdId -> Herd

    // Game state
    this.currentHour = 12;
    this.currentSeason = 'SUMMER';
    this.isNight = false;

    // Configuration
    this.config = {
      flockingRadius: 50,
      separationWeight: 1.5,
      alignmentWeight: 1.0,
      cohesionWeight: 1.0,
      wanderRadius: 100,
      restDuration: 5000 // ms
    };

    // Statistics
    this.stats = {
      animalsManaged: 0,
      herdsActive: 0,
      behaviorsEvaluated: 0
    };

    // Event listeners
    this.listeners = [];
  }

  /**
   * Register an animal
   * @param {Object} animal - Animal data
   * @returns {boolean} Success
   */
  registerAnimal(animal) {
    if (!animal || !animal.id) return false;

    const typeData = this.animalTypes[animal.type] || {};

    const enhancedAnimal = {
      id: animal.id,
      type: animal.type,
      position: animal.position || { x: 0, z: 0 },
      facingAngle: 0,

      // Stats from type
      moveSpeed: animal.moveSpeed || typeData.moveSpeed || 50,
      fleeSpeed: animal.fleeSpeed || typeData.fleeSpeed || 80,
      detectRange: animal.detectRange || typeData.detectRange || 50,
      fleeRange: animal.fleeRange || typeData.fleeRange || 100,
      behavior: animal.behavior || typeData.behavior || AnimalBehavior.PASSIVE,
      activity: animal.activity || typeData.activity || ActivityPattern.ALWAYS,

      // Combat (for aggressive/neutral)
      health: animal.health || typeData.health || 50,
      maxHealth: animal.maxHealth || typeData.health || 50,
      damage: animal.damage || typeData.damage || 5,
      aggroRange: animal.aggroRange || typeData.aggroRange || 30,

      // Territory
      territorial: typeData.territorial || false,
      territoryCenter: animal.position ? { ...animal.position } : { x: 0, z: 0 },
      territoryRadius: typeData.territoryRadius || 50,

      // State
      state: AnimalState.IDLE,
      targetId: null,
      targetPosition: null,
      currentPath: null,
      pathIndex: 0,
      alive: true,

      // Herd
      herdId: null,
      isHerdLeader: false,

      // Timing
      lastStateChange: Date.now(),
      restUntil: 0,

      ...animal
    };

    this.animals.set(animal.id, enhancedAnimal);
    this.behaviorTrees.set(animal.id, this._createBehaviorTree(enhancedAnimal));
    this.stats.animalsManaged++;

    return true;
  }

  /**
   * Unregister an animal
   * @param {string} animalId - Animal ID
   */
  unregisterAnimal(animalId) {
    const animal = this.animals.get(animalId);
    if (animal && animal.herdId) {
      this._removeFromHerd(animalId, animal.herdId);
    }

    this.animals.delete(animalId);
    this.behaviorTrees.delete(animalId);
    this.stats.animalsManaged--;
  }

  /**
   * Get animal data
   * @param {string} animalId - Animal ID
   * @returns {Object|null}
   */
  getAnimal(animalId) {
    return this.animals.get(animalId) || null;
  }

  /**
   * Get all animals
   * @returns {Object[]}
   */
  getAllAnimals() {
    return Array.from(this.animals.values());
  }

  /**
   * Get living animals
   * @returns {Object[]}
   */
  getLivingAnimals() {
    return Array.from(this.animals.values()).filter(a => a.alive);
  }

  /**
   * Create a herd
   * @param {string} leaderId - Leader animal ID
   * @param {string[]} memberIds - Member animal IDs
   * @returns {string|null} Herd ID
   */
  createHerd(leaderId, memberIds = []) {
    const leader = this.animals.get(leaderId);
    if (!leader) return null;

    const herd = new Herd(leaderId, leader.type);

    leader.herdId = herd.id;
    leader.isHerdLeader = true;

    for (const memberId of memberIds) {
      const member = this.animals.get(memberId);
      if (member && member.type === leader.type) {
        herd.addMember(memberId);
        member.herdId = herd.id;
      }
    }

    this.herds.set(herd.id, herd);
    this.stats.herdsActive++;

    return herd.id;
  }

  /**
   * Remove animal from herd
   * @private
   */
  _removeFromHerd(animalId, herdId) {
    const herd = this.herds.get(herdId);
    if (herd) {
      herd.removeMember(animalId);
      if (herd.size === 0) {
        this.herds.delete(herdId);
        this.stats.herdsActive--;
      }
    }

    const animal = this.animals.get(animalId);
    if (animal) {
      animal.herdId = null;
      animal.isHerdLeader = false;
    }
  }

  /**
   * Set game state
   * @param {Object} gameState - Current game state
   */
  setGameState(gameState) {
    if (gameState.hour !== undefined) {
      this.currentHour = gameState.hour;
      this.isNight = this.currentHour < 6 || this.currentHour >= 21;
    }
    if (gameState.season) this.currentSeason = gameState.season;
  }

  /**
   * Check if animal should be active based on time
   * @param {Object} animal - Animal data
   * @returns {boolean}
   */
  _isActiveTime(animal) {
    switch (animal.activity) {
      case ActivityPattern.DIURNAL:
        return !this.isNight;
      case ActivityPattern.NOCTURNAL:
        return this.isNight;
      case ActivityPattern.CREPUSCULAR:
        return this.currentHour >= 5 && this.currentHour <= 8 ||
               this.currentHour >= 17 && this.currentHour <= 20;
      default:
        return true;
    }
  }

  /**
   * Update all animals
   * @param {number} deltaTime - Time since last update (ms)
   * @param {Object} gameState - Current game state
   */
  update(deltaTime, gameState = {}) {
    this.setGameState(gameState);

    // Update herds
    this._updateHerds(deltaTime);

    // Update each animal
    for (const [animalId, animal] of this.animals) {
      if (!animal.alive) continue;

      // Check for hibernation
      if (this._shouldHibernate(animal)) {
        animal.state = AnimalState.HIBERNATING;
        continue;
      }

      // Check activity time
      if (!this._isActiveTime(animal)) {
        animal.state = AnimalState.RESTING;
        continue;
      }

      this._updateAnimal(animal, deltaTime, gameState);
    }
  }

  /**
   * Check if animal should hibernate
   * @private
   */
  _shouldHibernate(animal) {
    const typeData = this.animalTypes[animal.type];
    return typeData?.canHibernate && this.currentSeason === 'WINTER';
  }

  /**
   * Update herds
   * @private
   */
  _updateHerds(deltaTime) {
    for (const herd of this.herds.values()) {
      const leader = this.animals.get(herd.leaderId);

      if (!leader || !leader.alive) {
        // Find new leader
        for (const memberId of herd.members) {
          const member = this.animals.get(memberId);
          if (member && member.alive) {
            herd.leaderId = memberId;
            member.isHerdLeader = true;
            break;
          }
        }
      }

      // Set herd target position from leader
      if (leader && leader.alive) {
        herd.targetPosition = { ...leader.position };
      }
    }
  }

  /**
   * Update single animal
   * @private
   */
  _updateAnimal(animal, deltaTime, gameState) {
    // Run behavior tree
    const tree = this.behaviorTrees.get(animal.id);
    if (tree) {
      const context = { animal, gameState, system: this, deltaTime };
      tree.update(animal, context, deltaTime);
      this.stats.behaviorsEvaluated++;
    }

    // Update movement
    if (animal.currentPath && animal.pathIndex < animal.currentPath.length) {
      this._updateMovement(animal, deltaTime);
    }
  }

  /**
   * Update animal movement
   * @private
   */
  _updateMovement(animal, deltaTime) {
    const target = animal.currentPath[animal.pathIndex];
    const dx = target.x - animal.position.x;
    const dz = target.z - animal.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const speed = animal.state === AnimalState.FLEEING ?
      animal.fleeSpeed : animal.moveSpeed;
    const moveDistance = speed * (deltaTime / 1000);

    if (dist <= moveDistance) {
      animal.position.x = target.x;
      animal.position.z = target.z;
      animal.pathIndex++;

      if (animal.pathIndex >= animal.currentPath.length) {
        animal.currentPath = null;
        animal.pathIndex = 0;
      }
    } else {
      const ratio = moveDistance / dist;
      animal.position.x += dx * ratio;
      animal.position.z += dz * ratio;
      animal.facingAngle = Math.atan2(dz, dx);
    }
  }

  /**
   * Create behavior tree for animal
   * @private
   */
  _createBehaviorTree(animal) {
    const builder = new BehaviorTreeBuilder();

    return builder
      .selector('Root')
        // Flee from threats (passive/herd)
        .sequence('Flee')
          .check('IsFleeing', (ctx) => ctx.animal.state === AnimalState.FLEEING)
          .action('ContinueFlee', (ctx) => this._continueFlee(ctx.animal))
        .end()

        .sequence('DetectThreat')
          .check('IsPassive', (ctx) =>
            ctx.animal.behavior === AnimalBehavior.PASSIVE ||
            ctx.animal.behavior === AnimalBehavior.HERD)
          .check('ThreatNearby', (ctx) => this._detectThreat(ctx.animal, ctx.gameState))
          .action('StartFlee', (ctx) => this._startFlee(ctx.animal, ctx.gameState))
        .end()

        // Defend territory (neutral)
        .sequence('DefendTerritory')
          .check('IsTerritorial', (ctx) => ctx.animal.territorial)
          .check('IntruderInTerritory', (ctx) => this._checkTerritory(ctx.animal, ctx.gameState))
          .action('DefendTerritory', (ctx) => this._defend(ctx.animal, ctx.gameState))
        .end()

        // Hunt (aggressive)
        .sequence('Hunt')
          .check('IsAggressive', (ctx) => ctx.animal.behavior === AnimalBehavior.AGGRESSIVE)
          .check('HasPrey', (ctx) => this._findPrey(ctx.animal, ctx.gameState))
          .action('HuntPrey', (ctx) => this._hunt(ctx.animal))
        .end()

        // Follow herd
        .sequence('FollowHerd')
          .check('InHerd', (ctx) => ctx.animal.herdId && !ctx.animal.isHerdLeader)
          .action('FollowHerd', (ctx) => this._followHerd(ctx.animal))
        .end()

        // Wander
        .action('Wander', (ctx) => this._wander(ctx.animal))
      .end()
      .build(new Blackboard());
  }

  /**
   * Detect threat for passive animals
   * @private
   */
  _detectThreat(animal, gameState) {
    const player = gameState.player;
    if (!player) return false;

    const dist = distance(animal.position, player.position);
    if (dist <= animal.detectRange) {
      animal.targetId = 'player';
      return true;
    }

    return false;
  }

  /**
   * Start fleeing from threat
   * @private
   */
  _startFlee(animal, gameState) {
    const player = gameState.player;
    if (!player) return NodeStatus.FAILURE;

    // Calculate flee direction (away from player)
    const dx = animal.position.x - player.position.x;
    const dz = animal.position.z - player.position.z;
    const fleeDir = normalize({ x: dx, z: dz });

    const fleeTarget = {
      x: animal.position.x + fleeDir.x * animal.fleeRange,
      z: animal.position.z + fleeDir.z * animal.fleeRange
    };

    const result = this.pathfindingSystem.findPath(animal.position, fleeTarget);
    if (result.success) {
      animal.currentPath = result.path;
      animal.pathIndex = 0;
      animal.state = AnimalState.FLEEING;

      // Alert herd members
      if (animal.herdId) {
        this._alertHerd(animal.herdId, 'player');
      }

      return NodeStatus.SUCCESS;
    }

    return NodeStatus.FAILURE;
  }

  /**
   * Continue fleeing
   * @private
   */
  _continueFlee(animal) {
    if (!animal.targetId) {
      animal.state = AnimalState.IDLE;
      return NodeStatus.SUCCESS;
    }

    // Check if safe
    if (animal.currentPath && animal.pathIndex >= animal.currentPath.length) {
      animal.state = AnimalState.IDLE;
      animal.targetId = null;
      return NodeStatus.SUCCESS;
    }

    return NodeStatus.RUNNING;
  }

  /**
   * Alert herd to threat
   * @private
   */
  _alertHerd(herdId, threatId) {
    const herd = this.herds.get(herdId);
    if (!herd) return;

    for (const memberId of herd.members) {
      const member = this.animals.get(memberId);
      if (member && member.alive && !member.targetId) {
        member.targetId = threatId;
        member.state = AnimalState.FLEEING;
      }
    }
  }

  /**
   * Check territory for intruders
   * @private
   */
  _checkTerritory(animal, gameState) {
    const player = gameState.player;
    if (!player) return false;

    const distToCenter = distance(animal.territoryCenter, player.position);
    return distToCenter <= animal.territoryRadius;
  }

  /**
   * Defend territory
   * @private
   */
  _defend(animal, gameState) {
    const player = gameState.player;
    if (!player) return NodeStatus.FAILURE;

    animal.targetId = 'player';
    animal.state = AnimalState.DEFENDING_TERRITORY;

    // Move toward intruder
    const dist = distance(animal.position, player.position);
    if (dist > animal.aggroRange) {
      if (!animal.currentPath) {
        const result = this.pathfindingSystem.findPath(animal.position, player.position);
        if (result.success) {
          animal.currentPath = result.path;
          animal.pathIndex = 0;
        }
      }
    }

    return NodeStatus.RUNNING;
  }

  /**
   * Find prey for aggressive animals
   * @private
   */
  _findPrey(animal, gameState) {
    const typeData = this.animalTypes[animal.type];
    if (!typeData?.huntPrey) {
      // Hunt player by default
      const player = gameState.player;
      if (player) {
        const dist = distance(animal.position, player.position);
        if (dist <= animal.detectRange) {
          animal.targetId = 'player';
          return true;
        }
      }
      return false;
    }

    // Look for prey animals
    for (const other of this.animals.values()) {
      if (!other.alive || other.id === animal.id) continue;
      if (!typeData.huntPrey.includes(other.type)) continue;

      const dist = distance(animal.position, other.position);
      if (dist <= animal.detectRange) {
        animal.targetId = other.id;
        return true;
      }
    }

    return false;
  }

  /**
   * Hunt prey
   * @private
   */
  _hunt(animal) {
    if (!animal.targetId) return NodeStatus.FAILURE;

    animal.state = AnimalState.HUNTING;

    const target = animal.targetId === 'player' ?
      this._lastGameState?.player :
      this.animals.get(animal.targetId);

    if (!target || (target.alive !== undefined && !target.alive)) {
      animal.targetId = null;
      return NodeStatus.FAILURE;
    }

    // Path to target
    if (!animal.currentPath) {
      const result = this.pathfindingSystem.findPath(animal.position, target.position);
      if (result.success) {
        animal.currentPath = result.path;
        animal.pathIndex = 0;
      }
    }

    return NodeStatus.RUNNING;
  }

  /**
   * Follow herd
   * @private
   */
  _followHerd(animal) {
    const herd = this.herds.get(animal.herdId);
    if (!herd || !herd.targetPosition) {
      return NodeStatus.FAILURE;
    }

    animal.state = AnimalState.FOLLOWING_HERD;

    // Apply flocking behavior
    const flockingForce = this._calculateFlocking(animal);

    // Move toward herd with flocking
    const targetPos = {
      x: herd.targetPosition.x + flockingForce.x,
      z: herd.targetPosition.z + flockingForce.z
    };

    const dist = distance(animal.position, targetPos);
    if (dist > 20 && !animal.currentPath) {
      const result = this.pathfindingSystem.findPath(animal.position, targetPos);
      if (result.success) {
        animal.currentPath = result.path;
        animal.pathIndex = 0;
      }
    }

    return NodeStatus.SUCCESS;
  }

  /**
   * Calculate flocking forces
   * @private
   */
  _calculateFlocking(animal) {
    const herd = this.herds.get(animal.herdId);
    if (!herd) return { x: 0, z: 0 };

    let separation = { x: 0, z: 0 };
    let alignment = { x: 0, z: 0 };
    let cohesion = { x: 0, z: 0 };
    let neighborCount = 0;

    for (const memberId of herd.members) {
      if (memberId === animal.id) continue;

      const other = this.animals.get(memberId);
      if (!other || !other.alive) continue;

      const dist = distance(animal.position, other.position);
      if (dist > this.config.flockingRadius) continue;

      neighborCount++;

      // Separation: steer away from close neighbors
      if (dist < 20) {
        separation.x += animal.position.x - other.position.x;
        separation.z += animal.position.z - other.position.z;
      }

      // Alignment: match velocity
      alignment.x += Math.cos(other.facingAngle);
      alignment.z += Math.sin(other.facingAngle);

      // Cohesion: move toward center
      cohesion.x += other.position.x;
      cohesion.z += other.position.z;
    }

    if (neighborCount === 0) return { x: 0, z: 0 };

    // Average cohesion and convert to steering
    cohesion.x = cohesion.x / neighborCount - animal.position.x;
    cohesion.z = cohesion.z / neighborCount - animal.position.z;

    // Weight and combine
    return {
      x: separation.x * this.config.separationWeight +
         alignment.x * this.config.alignmentWeight +
         cohesion.x * this.config.cohesionWeight,
      z: separation.z * this.config.separationWeight +
         alignment.z * this.config.alignmentWeight +
         cohesion.z * this.config.cohesionWeight
    };
  }

  /**
   * Wander behavior
   * @private
   */
  _wander(animal) {
    // Rest periodically
    if (Date.now() < animal.restUntil) {
      animal.state = AnimalState.RESTING;
      return NodeStatus.SUCCESS;
    }

    // If no path, pick random destination
    if (!animal.currentPath) {
      if (Math.random() < 0.3) {
        // Rest
        animal.restUntil = Date.now() + this.config.restDuration;
        animal.state = AnimalState.RESTING;
        return NodeStatus.SUCCESS;
      }

      // Pick random position within wander radius
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.config.wanderRadius;
      const target = {
        x: animal.position.x + Math.cos(angle) * dist,
        z: animal.position.z + Math.sin(angle) * dist
      };

      const result = this.pathfindingSystem.findPath(animal.position, target);
      if (result.success) {
        animal.currentPath = result.path;
        animal.pathIndex = 0;
        animal.state = AnimalState.WANDERING;
      }
    }

    return NodeStatus.SUCCESS;
  }

  /**
   * Deal damage to animal
   * @param {string} animalId - Animal ID
   * @param {number} damage - Damage amount
   * @param {string} sourceId - Damage source
   */
  dealDamage(animalId, damage, sourceId = 'player') {
    const animal = this.animals.get(animalId);
    if (!animal || !animal.alive) return;

    animal.health = Math.max(0, animal.health - damage);

    // Trigger flee for passive animals
    if (animal.behavior === AnimalBehavior.PASSIVE) {
      animal.targetId = sourceId;
      animal.state = AnimalState.FLEEING;
    }

    this._emitEvent('animalDamaged', {
      animalId,
      damage,
      sourceId,
      healthRemaining: animal.health
    });

    if (animal.health <= 0) {
      animal.alive = false;
      animal.state = AnimalState.DEAD;
      this._emitEvent('animalDied', { animalId, killerId: sourceId });
    }
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
        console.error('[WildlifeAISystem] Listener error:', error);
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      livingAnimals: this.getLivingAnimals().length
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    const animals = {};
    for (const [id, animal] of this.animals) {
      animals[id] = {
        id: animal.id,
        type: animal.type,
        position: animal.position,
        health: animal.health,
        state: animal.state,
        alive: animal.alive,
        herdId: animal.herdId
      };
    }

    const herds = {};
    for (const [id, herd] of this.herds) {
      herds[id] = {
        id: herd.id,
        leaderId: herd.leaderId,
        animalType: herd.animalType,
        members: Array.from(herd.members)
      };
    }

    return { animals, herds };
  }

  /**
   * Load from JSON
   */
  fromJSON(data) {
    this.animals.clear();
    this.behaviorTrees.clear();
    this.herds.clear();

    if (data.animals) {
      for (const animalData of Object.values(data.animals)) {
        this.registerAnimal(animalData);
      }
    }

    if (data.herds) {
      for (const herdData of Object.values(data.herds)) {
        const herd = new Herd(herdData.leaderId, herdData.animalType);
        herd.id = herdData.id;
        for (const memberId of herdData.members) {
          herd.addMember(memberId);
        }
        this.herds.set(herd.id, herd);
      }
    }
  }
}

export { Herd };
export default WildlifeAISystem;
