/**
 * NPCBehaviorSystem.js - Enhanced NPC Behavior System
 *
 * Builds on Phase 3A NPC system (AutonomousDecision, NPCNeedsTracker) to add:
 * - Behavior tree integration for complex decision-making
 * - Personality traits affecting behavior
 * - Long-term memory for player interactions
 * - Social relationships between NPCs
 * - Daily schedules with seasonal awareness
 * - Weather-reactive behaviors
 *
 * @see src/modules/npc-system/AutonomousDecision.js
 * @see src/modules/npc-system/NPCNeedsTracker.js
 */

import {
  BehaviorTreeBuilder,
  Blackboard,
  NodeStatus
} from './BehaviorTree.js';

import { PerceptionSystem } from './PerceptionSystem.js';
import { PathfindingSystem } from './PathfindingSystem.js';

/**
 * Personality trait definitions
 */
export const PersonalityTraits = {
  BRAVERY: 'bravery',      // 0 = cowardly, 1 = brave
  FRIENDLINESS: 'friendliness', // 0 = hostile, 1 = friendly
  WORK_ETHIC: 'workEthic', // 0 = lazy, 1 = hardworking
  CURIOSITY: 'curiosity',  // 0 = cautious, 1 = curious
  SOCIABILITY: 'sociability' // 0 = introverted, 1 = extroverted
};

/**
 * Activity types for NPC schedules
 */
export const ActivityType = {
  SLEEP: 'SLEEP',
  WAKE_UP: 'WAKE_UP',
  EAT_BREAKFAST: 'EAT_BREAKFAST',
  WORK: 'WORK',
  BREAK: 'BREAK',
  EAT_LUNCH: 'EAT_LUNCH',
  SOCIALIZE: 'SOCIALIZE',
  EAT_DINNER: 'EAT_DINNER',
  LEISURE: 'LEISURE',
  RETURN_HOME: 'RETURN_HOME',
  SHELTER: 'SHELTER',     // Seek shelter (weather)
  FESTIVAL: 'FESTIVAL'    // Seasonal event participation
};

/**
 * Default daily schedule (hour -> activity)
 */
const DEFAULT_SCHEDULE = {
  0: ActivityType.SLEEP,
  1: ActivityType.SLEEP,
  2: ActivityType.SLEEP,
  3: ActivityType.SLEEP,
  4: ActivityType.SLEEP,
  5: ActivityType.SLEEP,
  6: ActivityType.WAKE_UP,
  7: ActivityType.EAT_BREAKFAST,
  8: ActivityType.WORK,
  9: ActivityType.WORK,
  10: ActivityType.WORK,
  11: ActivityType.WORK,
  12: ActivityType.EAT_LUNCH,
  13: ActivityType.WORK,
  14: ActivityType.WORK,
  15: ActivityType.BREAK,
  16: ActivityType.WORK,
  17: ActivityType.WORK,
  18: ActivityType.EAT_DINNER,
  19: ActivityType.SOCIALIZE,
  20: ActivityType.LEISURE,
  21: ActivityType.RETURN_HOME,
  22: ActivityType.SLEEP,
  23: ActivityType.SLEEP
};

/**
 * Relationship status between NPCs
 */
export const RelationshipStatus = {
  STRANGER: 'STRANGER',       // < 20
  ACQUAINTANCE: 'ACQUAINTANCE', // 20-40
  FRIEND: 'FRIEND',           // 40-60
  CLOSE_FRIEND: 'CLOSE_FRIEND', // 60-80
  BEST_FRIEND: 'BEST_FRIEND', // > 80
  RIVAL: 'RIVAL',             // < 0
  ENEMY: 'ENEMY'              // < -50
};

/**
 * Memory event types
 */
export const MemoryEventType = {
  MET_PLAYER: 'MET_PLAYER',
  HELPED_BY_PLAYER: 'HELPED_BY_PLAYER',
  ATTACKED_BY_PLAYER: 'ATTACKED_BY_PLAYER',
  TRADE_WITH_PLAYER: 'TRADE_WITH_PLAYER',
  QUEST_GIVEN: 'QUEST_GIVEN',
  QUEST_COMPLETED: 'QUEST_COMPLETED',
  WITNESSED_EVENT: 'WITNESSED_EVENT',
  CONVERSATION: 'CONVERSATION'
};

/**
 * NPC Memory Entry
 */
class NPCMemory {
  constructor(eventType, data = {}) {
    this.eventType = eventType;
    this.data = data;
    this.timestamp = Date.now();
    this.importance = data.importance || 1;
    this.recalled = 0; // Times this memory has been recalled
  }

  getAge() {
    return Date.now() - this.timestamp;
  }

  recall() {
    this.recalled++;
    return this;
  }

  toJSON() {
    return {
      eventType: this.eventType,
      data: this.data,
      timestamp: this.timestamp,
      importance: this.importance,
      recalled: this.recalled
    };
  }

  static fromJSON(data) {
    const memory = new NPCMemory(data.eventType, data.data);
    memory.timestamp = data.timestamp;
    memory.importance = data.importance;
    memory.recalled = data.recalled;
    return memory;
  }
}

/**
 * NPCBehaviorSystem class
 * Manages advanced NPC behaviors
 */
export class NPCBehaviorSystem {
  /**
   * Create NPC behavior system
   * @param {Object} options - Configuration
   * @param {Object} options.needsTracker - NPCNeedsTracker instance
   * @param {Object} options.idleTaskManager - IdleTaskManager instance
   * @param {Object} options.pathfindingSystem - PathfindingSystem instance
   * @param {Object} options.perceptionSystem - PerceptionSystem instance
   */
  constructor(options = {}) {
    this.needsTracker = options.needsTracker;
    this.idleTaskManager = options.idleTaskManager;
    this.pathfindingSystem = options.pathfindingSystem || new PathfindingSystem();
    this.perceptionSystem = options.perceptionSystem || new PerceptionSystem();

    // NPC data storage
    this.npcs = new Map(); // npcId -> NPC data
    this.behaviorTrees = new Map(); // npcId -> BehaviorTree
    this.relationships = new Map(); // npcId -> Map<otherId, relationshipValue>
    this.memories = new Map(); // npcId -> Array<NPCMemory>

    // Current game state
    this.currentHour = 12;
    this.currentSeason = 'SUMMER';
    this.currentWeather = 'CLEAR';
    this.activeEvent = null;

    // Configuration
    this.config = {
      memoryCapacity: 100, // Max memories per NPC
      relationshipDecayRate: 0.001, // Per hour
      socialInteractionRange: 50,
      updateInterval: 1000 // ms between updates
    };

    // Statistics
    this.stats = {
      npcsManaged: 0,
      behaviorsEvaluated: 0,
      memoriesCreated: 0,
      relationshipsUpdated: 0
    };

    // Event listeners
    this.listeners = [];
  }

  /**
   * Register an NPC with the behavior system
   * @param {Object} npc - NPC data
   * @returns {boolean} Success
   */
  registerNPC(npc) {
    if (!npc || !npc.id) {
      console.warn('[NPCBehaviorSystem] Invalid NPC data');
      return false;
    }

    // Create enhanced NPC data
    const enhancedNPC = {
      id: npc.id,
      type: npc.type || 'villager',
      position: npc.position || { x: 0, z: 0 },
      home: npc.home || null,
      workplace: npc.workplace || null,

      // Personality (generate random if not provided)
      personality: npc.personality || this._generatePersonality(),

      // Schedule
      schedule: npc.schedule || { ...DEFAULT_SCHEDULE },
      currentActivity: ActivityType.WORK,

      // State
      state: 'IDLE',
      targetPosition: null,
      currentPath: null,
      pathIndex: 0,

      // Social
      mood: 0.5, // 0 = sad, 1 = happy
      conversationPartner: null,
      lastSocialInteraction: 0,

      ...npc
    };

    this.npcs.set(npc.id, enhancedNPC);
    this.relationships.set(npc.id, new Map());
    this.memories.set(npc.id, []);

    // Create behavior tree for this NPC
    this.behaviorTrees.set(npc.id, this._createBehaviorTree(enhancedNPC));

    this.stats.npcsManaged++;
    return true;
  }

  /**
   * Unregister an NPC
   * @param {string} npcId - NPC ID
   */
  unregisterNPC(npcId) {
    this.npcs.delete(npcId);
    this.behaviorTrees.delete(npcId);
    this.relationships.delete(npcId);
    this.memories.delete(npcId);
    this.stats.npcsManaged--;
  }

  /**
   * Get NPC data
   * @param {string} npcId - NPC ID
   * @returns {Object|null}
   */
  getNPC(npcId) {
    return this.npcs.get(npcId) || null;
  }

  /**
   * Get all NPCs
   * @returns {Object[]}
   */
  getAllNPCs() {
    return Array.from(this.npcs.values());
  }

  /**
   * Update game state
   * @param {Object} gameState - Current game state
   */
  setGameState(gameState) {
    if (gameState.hour !== undefined) this.currentHour = gameState.hour;
    if (gameState.season) this.currentSeason = gameState.season;
    if (gameState.weather) this.currentWeather = gameState.weather;
    if (gameState.activeEvent !== undefined) this.activeEvent = gameState.activeEvent;

    // Update perception system
    this.perceptionSystem.setWeather(this.currentWeather);
    this.perceptionSystem.setNightMode(this.currentHour < 6 || this.currentHour >= 21);
  }

  /**
   * Update all NPCs
   * @param {number} deltaTime - Time since last update (ms)
   * @param {Object} gameState - Current game state
   */
  update(deltaTime, gameState = {}) {
    this.setGameState(gameState);

    // Update perception system
    this.perceptionSystem.update(deltaTime);

    // Update each NPC
    for (const [, npc] of this.npcs) {
      this._updateNPC(npc, deltaTime, gameState);
    }
  }

  /**
   * Update a single NPC
   * @private
   */
  _updateNPC(npc, deltaTime, gameState) {
    // Update scheduled activity
    this._updateScheduledActivity(npc);

    // Run behavior tree
    const tree = this.behaviorTrees.get(npc.id);
    if (tree) {
      const context = {
        npc,
        gameState,
        system: this,
        deltaTime
      };
      tree.update(npc, context, deltaTime);
      this.stats.behaviorsEvaluated++;
    }

    // Update movement if on a path
    if (npc.currentPath && npc.pathIndex < npc.currentPath.length) {
      this._updateMovement(npc, deltaTime);
    }

    // Update mood based on needs satisfaction
    this._updateMood(npc);
  }

  /**
   * Update scheduled activity based on time
   * @private
   */
  _updateScheduledActivity(npc) {
    const scheduledActivity = npc.schedule[this.currentHour];

    // Check for weather override
    if (this._shouldSeekShelter()) {
      npc.currentActivity = ActivityType.SHELTER;
      return;
    }

    // Check for festival override
    if (this.activeEvent && this.activeEvent.type === 'FESTIVAL') {
      npc.currentActivity = ActivityType.FESTIVAL;
      return;
    }

    npc.currentActivity = scheduledActivity;
  }

  /**
   * Check if NPC should seek shelter
   * @private
   */
  _shouldSeekShelter() {
    const badWeather = ['RAIN', 'HEAVY_RAIN', 'STORM', 'SNOW'];
    return badWeather.includes(this.currentWeather);
  }

  /**
   * Update NPC movement along path
   * @private
   */
  _updateMovement(npc, deltaTime) {
    const target = npc.currentPath[npc.pathIndex];
    const dx = target.x - npc.position.x;
    const dz = target.z - npc.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const speed = npc.moveSpeed || 50; // pixels per second
    const moveDistance = speed * (deltaTime / 1000);

    if (dist <= moveDistance) {
      // Reached waypoint
      npc.position.x = target.x;
      npc.position.z = target.z;
      npc.pathIndex++;

      if (npc.pathIndex >= npc.currentPath.length) {
        // Path complete
        npc.currentPath = null;
        npc.pathIndex = 0;
        npc.state = 'IDLE';
      }
    } else {
      // Move toward waypoint
      const ratio = moveDistance / dist;
      npc.position.x += dx * ratio;
      npc.position.z += dz * ratio;
      npc.facingAngle = Math.atan2(dz, dx);
    }
  }

  /**
   * Update NPC mood
   * @private
   */
  _updateMood(npc) {
    if (!this.needsTracker) return;

    const needs = this.needsTracker.getNeedsSummary(npc.id);
    if (!needs) return;

    // Calculate mood from needs satisfaction
    let moodSum = 0;
    let needCount = 0;

    for (const needData of Object.values(needs.needs || {})) {
      moodSum += needData.value / 100;
      needCount++;
    }

    // Apply personality influence
    const friendliness = npc.personality.friendliness || 0.5;
    const baselineMood = needCount > 0 ? moodSum / needCount : 0.5;

    // Mood tends toward personality-influenced baseline
    npc.mood = npc.mood * 0.95 + baselineMood * friendliness * 0.05;
  }

  /**
   * Generate random personality traits
   * @private
   */
  _generatePersonality() {
    return {
      bravery: Math.random(),
      friendliness: Math.random(),
      workEthic: Math.random(),
      curiosity: Math.random(),
      sociability: Math.random()
    };
  }

  /**
   * Create behavior tree for NPC
   * @private
   */
  _createBehaviorTree(npc) {
    const builder = new BehaviorTreeBuilder();

    return builder
      .selector('Root')
        // Emergency behaviors (highest priority)
        .sequence('HandleEmergency')
          .check('IsEmergency', (ctx) => this._checkEmergency(ctx.npc))
          .action('HandleEmergency', (ctx) => this._handleEmergency(ctx.npc))
        .end()

        // Weather shelter behavior
        .sequence('SeekShelter')
          .check('NeedsShelter', (ctx) =>
            ctx.npc.currentActivity === ActivityType.SHELTER && !this._isInShelter(ctx.npc))
          .action('GoToShelter', (ctx) => this._goToShelter(ctx.npc))
        .end()

        // Schedule-based behaviors
        .selector('ScheduledActivity')
          // Sleep
          .sequence('Sleep')
            .check('IsSleepTime', (ctx) => ctx.npc.currentActivity === ActivityType.SLEEP)
            .action('Sleep', (ctx) => this._doSleep(ctx.npc))
          .end()

          // Work
          .sequence('Work')
            .check('IsWorkTime', (ctx) => ctx.npc.currentActivity === ActivityType.WORK)
            .action('Work', (ctx) => this._doWork(ctx.npc))
          .end()

          // Eat
          .sequence('Eat')
            .check('IsEatTime', (ctx) => this._isEatTime(ctx.npc.currentActivity))
            .action('Eat', (ctx) => this._doEat(ctx.npc))
          .end()

          // Socialize
          .sequence('Socialize')
            .check('IsSocialTime', (ctx) => ctx.npc.currentActivity === ActivityType.SOCIALIZE)
            .action('Socialize', (ctx) => this._doSocialize(ctx.npc))
          .end()

          // Leisure/Idle
          .action('Idle', (ctx) => this._doIdle(ctx.npc))
        .end()
      .end()
      .build(new Blackboard());
  }

  /**
   * Check if NPC is in emergency state
   * @private
   */
  _checkEmergency(npc) {
    if (!this.needsTracker) return false;

    const needs = this.needsTracker.getNeedsSummary(npc.id);
    if (!needs) return false;

    // Check for critical needs
    for (const needData of Object.values(needs.needs || {})) {
      if (needData.value < 10) return true;
    }

    return false;
  }

  /**
   * Handle emergency state
   * @private
   */
  _handleEmergency(npc) {
    // Delegate to existing AutonomousDecision if available
    npc.state = 'EMERGENCY';
    return NodeStatus.SUCCESS;
  }

  /**
   * Check if NPC is in shelter
   * @private
   */
  _isInShelter(npc) {
    // Check if NPC is at home or in a building
    if (npc.home) {
      const dx = npc.position.x - npc.home.x;
      const dz = npc.position.z - npc.home.z;
      return Math.sqrt(dx * dx + dz * dz) < 32;
    }
    return false;
  }

  /**
   * Go to shelter
   * @private
   */
  _goToShelter(npc) {
    if (!npc.home) return NodeStatus.FAILURE;

    if (!npc.currentPath) {
      const result = this.pathfindingSystem.findPath(npc.position, npc.home);
      if (result.success) {
        npc.currentPath = result.path;
        npc.pathIndex = 0;
        npc.state = 'MOVING_TO_SHELTER';
      } else {
        return NodeStatus.FAILURE;
      }
    }

    return npc.currentPath ? NodeStatus.RUNNING : NodeStatus.FAILURE;
  }

  /**
   * Do sleep action
   * @private
   */
  _doSleep(npc) {
    npc.state = 'SLEEPING';
    return NodeStatus.SUCCESS;
  }

  /**
   * Do work action
   * @private
   */
  _doWork(npc) {
    // If at workplace, work. Otherwise, go to workplace
    if (npc.workplace) {
      const dx = npc.position.x - npc.workplace.x;
      const dz = npc.position.z - npc.workplace.z;
      const atWork = Math.sqrt(dx * dx + dz * dz) < 32;

      if (atWork) {
        npc.state = 'WORKING';
        return NodeStatus.SUCCESS;
      }

      // Go to workplace
      if (!npc.currentPath) {
        const result = this.pathfindingSystem.findPath(npc.position, npc.workplace);
        if (result.success) {
          npc.currentPath = result.path;
          npc.pathIndex = 0;
          npc.state = 'GOING_TO_WORK';
        }
      }

      return NodeStatus.RUNNING;
    }

    // No workplace, just mark as working (at current location)
    npc.state = 'WORKING';
    return NodeStatus.SUCCESS;
  }

  /**
   * Check if it's eat time
   * @private
   */
  _isEatTime(activity) {
    return [ActivityType.EAT_BREAKFAST, ActivityType.EAT_LUNCH, ActivityType.EAT_DINNER]
      .includes(activity);
  }

  /**
   * Do eat action
   * @private
   */
  _doEat(npc) {
    npc.state = 'EATING';
    // Satisfy food need if tracker available
    if (this.needsTracker) {
      this.needsTracker.satisfyNeed(npc.id, 'FOOD', 30);
    }
    return NodeStatus.SUCCESS;
  }

  /**
   * Do socialize action
   * @private
   */
  _doSocialize(npc) {
    // Find nearby NPCs to socialize with
    const nearbyNPCs = this._findNearbyNPCs(npc, this.config.socialInteractionRange);

    if (nearbyNPCs.length > 0) {
      // Pick a random nearby NPC
      const partner = nearbyNPCs[Math.floor(Math.random() * nearbyNPCs.length)];

      // Increase relationship
      this.modifyRelationship(npc.id, partner.id, 1);

      // Satisfy social need
      if (this.needsTracker) {
        this.needsTracker.satisfyNeed(npc.id, 'SOCIAL', 20);
      }

      npc.state = 'SOCIALIZING';
      npc.conversationPartner = partner.id;
      npc.lastSocialInteraction = Date.now();
    } else {
      // Wander to find someone
      npc.state = 'WANDERING';
    }

    return NodeStatus.SUCCESS;
  }

  /**
   * Do idle action
   * @private
   */
  _doIdle(npc) {
    npc.state = 'IDLE';

    // Delegate to idle task manager if available
    if (this.idleTaskManager) {
      this.idleTaskManager.assignTask(npc.id);
    }

    return NodeStatus.SUCCESS;
  }

  /**
   * Find nearby NPCs
   * @private
   */
  _findNearbyNPCs(npc, range) {
    const nearby = [];

    for (const other of this.npcs.values()) {
      if (other.id === npc.id) continue;

      const dx = other.position.x - npc.position.x;
      const dz = other.position.z - npc.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= range) {
        nearby.push(other);
      }
    }

    return nearby;
  }

  /**
   * Get relationship value between two NPCs
   * @param {string} npcId1 - First NPC ID
   * @param {string} npcId2 - Second NPC ID
   * @returns {number} Relationship value (-100 to 100)
   */
  getRelationship(npcId1, npcId2) {
    const relations = this.relationships.get(npcId1);
    if (!relations) return 0;
    return relations.get(npcId2) || 0;
  }

  /**
   * Modify relationship between two NPCs
   * @param {string} npcId1 - First NPC ID
   * @param {string} npcId2 - Second NPC ID
   * @param {number} change - Relationship change
   */
  modifyRelationship(npcId1, npcId2, change) {
    const relations1 = this.relationships.get(npcId1);
    const relations2 = this.relationships.get(npcId2);

    if (relations1) {
      const current = relations1.get(npcId2) || 0;
      relations1.set(npcId2, Math.max(-100, Math.min(100, current + change)));
      this.stats.relationshipsUpdated++;
    }

    // Relationship is mutual
    if (relations2) {
      const current = relations2.get(npcId1) || 0;
      relations2.set(npcId1, Math.max(-100, Math.min(100, current + change)));
    }
  }

  /**
   * Get relationship status
   * @param {number} value - Relationship value
   * @returns {string} RelationshipStatus
   */
  getRelationshipStatus(value) {
    if (value < -50) return RelationshipStatus.ENEMY;
    if (value < 0) return RelationshipStatus.RIVAL;
    if (value < 20) return RelationshipStatus.STRANGER;
    if (value < 40) return RelationshipStatus.ACQUAINTANCE;
    if (value < 60) return RelationshipStatus.FRIEND;
    if (value < 80) return RelationshipStatus.CLOSE_FRIEND;
    return RelationshipStatus.BEST_FRIEND;
  }

  /**
   * Add memory to NPC
   * @param {string} npcId - NPC ID
   * @param {string} eventType - MemoryEventType
   * @param {Object} data - Memory data
   */
  addMemory(npcId, eventType, data = {}) {
    const memories = this.memories.get(npcId);
    if (!memories) return;

    const memory = new NPCMemory(eventType, data);
    memories.push(memory);

    // Limit memory capacity
    if (memories.length > this.config.memoryCapacity) {
      // Remove oldest, least important memories
      memories.sort((a, b) => {
        // Keep important recent memories
        const scoreA = a.importance * (1 - a.getAge() / 86400000);
        const scoreB = b.importance * (1 - b.getAge() / 86400000);
        return scoreB - scoreA;
      });
      memories.length = this.config.memoryCapacity;
    }

    this.stats.memoriesCreated++;
    this._emitEvent('memoryCreated', { npcId, eventType, data });
  }

  /**
   * Get memories for NPC
   * @param {string} npcId - NPC ID
   * @param {Object} filter - Optional filter
   * @returns {NPCMemory[]}
   */
  getMemories(npcId, filter = {}) {
    const memories = this.memories.get(npcId);
    if (!memories) return [];

    return memories.filter(m => {
      if (filter.eventType && m.eventType !== filter.eventType) return false;
      if (filter.maxAge && m.getAge() > filter.maxAge) return false;
      if (filter.minImportance && m.importance < filter.minImportance) return false;
      return true;
    });
  }

  /**
   * Recall specific memory about player
   * @param {string} npcId - NPC ID
   * @param {string} eventType - Event type to recall
   * @returns {NPCMemory|null}
   */
  recallPlayerMemory(npcId, eventType) {
    const memories = this.getMemories(npcId, { eventType });
    const playerMemories = memories.filter(m => m.data.playerId || m.data.target === 'player');

    if (playerMemories.length > 0) {
      // Return most recent relevant memory
      playerMemories.sort((a, b) => b.timestamp - a.timestamp);
      return playerMemories[0].recall();
    }

    return null;
  }

  /**
   * Record player interaction
   * @param {string} npcId - NPC ID
   * @param {string} interactionType - Type of interaction
   * @param {Object} data - Interaction data
   */
  recordPlayerInteraction(npcId, interactionType, data = {}) {
    // Add to memory
    this.addMemory(npcId, interactionType, {
      ...data,
      playerId: 'player',
      target: 'player'
    });

    // Modify relationship with player (stored as 'player')
    const relationshipChange = this._calculateRelationshipChange(interactionType, data);
    this.modifyRelationship(npcId, 'player', relationshipChange);
  }

  /**
   * Calculate relationship change from interaction
   * @private
   */
  _calculateRelationshipChange(interactionType, data) {
    switch (interactionType) {
      case MemoryEventType.HELPED_BY_PLAYER:
        return data.magnitude || 5;
      case MemoryEventType.ATTACKED_BY_PLAYER:
        return -(data.magnitude || 20);
      case MemoryEventType.TRADE_WITH_PLAYER:
        return data.fair ? 2 : -1;
      case MemoryEventType.QUEST_COMPLETED:
        return data.success ? 10 : -5;
      case MemoryEventType.CONVERSATION:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Get NPC dialogue based on relationship and memories
   * @param {string} npcId - NPC ID
   * @returns {Object} Dialogue data {greeting, options, mood}
   */
  getDialogueContext(npcId) {
    const npc = this.getNPC(npcId);
    if (!npc) return null;

    const playerRelationship = this.getRelationship(npcId, 'player');
    const relationshipStatus = this.getRelationshipStatus(playerRelationship);
    const lastInteraction = this.recallPlayerMemory(npcId, MemoryEventType.CONVERSATION);

    return {
      npcId,
      npcName: npc.name || npc.type,
      mood: npc.mood,
      personality: { ...npc.personality },
      relationship: {
        value: playerRelationship,
        status: relationshipStatus
      },
      lastMet: lastInteraction ? lastInteraction.timestamp : null,
      memories: this.getMemories(npcId, { maxAge: 86400000 }) // Last 24 hours
    };
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
        console.error('[NPCBehaviorSystem] Listener error:', error);
      }
    }
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStatistics() {
    let totalMemories = 0;
    let totalRelationships = 0;

    for (const memories of this.memories.values()) {
      totalMemories += memories.length;
    }

    for (const relations of this.relationships.values()) {
      totalRelationships += relations.size;
    }

    return {
      ...this.stats,
      totalMemories,
      totalRelationships
    };
  }

  /**
   * Serialize to JSON
   * @returns {Object}
   */
  toJSON() {
    const npcs = {};
    for (const [id, npc] of this.npcs) {
      npcs[id] = {
        id: npc.id,
        type: npc.type,
        position: npc.position,
        home: npc.home,
        workplace: npc.workplace,
        personality: npc.personality,
        schedule: npc.schedule,
        mood: npc.mood,
        state: npc.state
      };
    }

    const relationships = {};
    for (const [id, relations] of this.relationships) {
      relationships[id] = Object.fromEntries(relations);
    }

    const memories = {};
    for (const [id, memList] of this.memories) {
      memories[id] = memList.map(m => m.toJSON());
    }

    return { npcs, relationships, memories };
  }

  /**
   * Load from JSON
   * @param {Object} data
   */
  fromJSON(data) {
    // Clear existing data
    this.npcs.clear();
    this.behaviorTrees.clear();
    this.relationships.clear();
    this.memories.clear();

    // Load NPCs
    if (data.npcs) {
      for (const npcData of Object.values(data.npcs)) {
        this.registerNPC(npcData);
      }
    }

    // Load relationships
    if (data.relationships) {
      for (const [id, relations] of Object.entries(data.relationships)) {
        this.relationships.set(id, new Map(Object.entries(relations)));
      }
    }

    // Load memories
    if (data.memories) {
      for (const [id, memList] of Object.entries(data.memories)) {
        this.memories.set(id, memList.map(m => NPCMemory.fromJSON(m)));
      }
    }
  }
}

export { NPCMemory };
export default NPCBehaviorSystem;
