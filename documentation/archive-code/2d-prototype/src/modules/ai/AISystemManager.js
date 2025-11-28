/**
 * AISystemManager.js - Central coordinator for all AI systems
 *
 * Integrates Phase 4 AI systems with the game's entity/component system:
 * - PathfindingSystem: Navigation for NPCs and monsters
 * - PerceptionSystem: Vision, hearing, and memory (per-entity)
 * - NPCBehaviorSystem: NPC daily schedules and social behavior
 * - EnemyAISystem: Monster/enemy tactical behavior
 * - EconomicAISystem: Trading and merchant behavior
 * - WildlifeAISystem: Animal/creature behavior
 * - CompanionAISystem: Player companion behavior
 * - QuestAISystem: Dynamic quest generation and tracking
 */

import { PathfindingSystem } from './PathfindingSystem.js';
import { PerceptionSystem } from './PerceptionSystem.js';
import { NPCBehaviorSystem } from './NPCBehaviorSystem.js';
import { EnemyAISystem } from './EnemyAISystem.js';
import { EconomicAISystem } from './EconomicAISystem.js';
import { WildlifeAISystem } from './WildlifeAISystem.js';
import { CompanionAISystem } from './CompanionAISystem.js';
import { QuestAISystem, ObjectiveType } from './QuestAISystem.js';

/**
 * AISystemManager - Coordinates all AI systems
 */
export class AISystemManager {
  /**
   * Create AI system manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Store references to game systems
    this.npcManager = options.npcManager || null;
    this.storage = options.storage || null;
    this.territoryManager = options.territoryManager || null;
    this.gridManager = options.gridManager || null;

    // Configuration
    this.config = {
      worldSize: options.worldSize || 512,
      enablePathfinding: options.enablePathfinding !== false,
      enablePerception: options.enablePerception !== false,
      enableNPCBehavior: options.enableNPCBehavior !== false,
      enableEnemyAI: options.enableEnemyAI !== false,
      enableEconomicAI: options.enableEconomicAI !== false,
      enableWildlifeAI: options.enableWildlifeAI !== false,
      enableCompanionAI: options.enableCompanionAI !== false,
      enableQuestAI: options.enableQuestAI !== false
    };

    // Initialize AI systems
    this._initializeSystems();

    // Entity tracking
    this.registeredNPCs = new Map(); // npcId -> NPC entity
    this.registeredMonsters = new Map(); // monsterId -> Monster entity
    this.registeredWildlife = new Map(); // animalId -> Wildlife entity
    this.registeredCompanions = new Map(); // companionId -> Companion entity

    // Statistics
    this.stats = {
      ticksProcessed: 0,
      npcsUpdated: 0,
      monstersUpdated: 0,
      pathsCalculated: 0,
      questsGenerated: 0,
      tradesProcessed: 0
    };

    // Event listeners
    this.listeners = [];
  }

  /**
   * Initialize all AI systems
   * @private
   */
  _initializeSystems() {
    // Pathfinding system
    if (this.config.enablePathfinding) {
      this.pathfinding = new PathfindingSystem({
        worldSize: this.config.worldSize
      });
    }

    // Perception system (shared instance for AI awareness)
    if (this.config.enablePerception) {
      this.perception = new PerceptionSystem();
    }

    // NPC Behavior system
    if (this.config.enableNPCBehavior) {
      this.npcBehavior = new NPCBehaviorSystem();
    }

    // Enemy AI system (uses perception for awareness)
    if (this.config.enableEnemyAI) {
      this.enemyAI = new EnemyAISystem({
        perceptionSystem: this.perception
      });
    }

    // Economic AI system
    if (this.config.enableEconomicAI) {
      this.economicAI = new EconomicAISystem();
    }

    // Wildlife AI system
    if (this.config.enableWildlifeAI) {
      this.wildlifeAI = new WildlifeAISystem();
    }

    // Companion AI system
    if (this.config.enableCompanionAI) {
      this.companionAI = new CompanionAISystem();
    }

    // Quest AI system
    if (this.config.enableQuestAI) {
      this.questAI = new QuestAISystem();
      this._setupQuestListeners();
    }
  }

  /**
   * Setup quest event listeners
   * @private
   */
  _setupQuestListeners() {
    this.questAI.addListener((eventType, data) => {
      this._emitEvent(`quest:${eventType}`, data);
    });
  }

  // ============================================
  // ENTITY REGISTRATION
  // ============================================

  /**
   * Register an NPC with AI systems
   * @param {Object} npc - NPC entity
   */
  registerNPC(npc) {
    if (!npc || !npc.id) return;

    this.registeredNPCs.set(npc.id, npc);

    // Register with NPC behavior system (takes npc object directly)
    if (this.npcBehavior) {
      this.npcBehavior.registerNPC(npc);
    }
  }

  /**
   * Unregister an NPC
   * @param {string} npcId - NPC ID
   */
  unregisterNPC(npcId) {
    this.registeredNPCs.delete(npcId);

    if (this.npcBehavior) {
      this.npcBehavior.unregisterNPC(npcId);
    }
  }

  /**
   * Register a monster with AI systems
   * @param {Object} monster - Monster entity
   */
  registerMonster(monster) {
    if (!monster || !monster.id) return;

    this.registeredMonsters.set(monster.id, monster);

    // Register with enemy AI system (takes enemy object directly)
    if (this.enemyAI) {
      this.enemyAI.registerEnemy(monster);
    }
  }

  /**
   * Unregister a monster
   * @param {string} monsterId - Monster ID
   */
  unregisterMonster(monsterId) {
    this.registeredMonsters.delete(monsterId);

    if (this.enemyAI) {
      this.enemyAI.unregisterEnemy(monsterId);
    }
  }

  /**
   * Register wildlife/animal with AI systems
   * @param {Object} animal - Animal entity
   */
  registerWildlife(animal) {
    if (!animal || !animal.id) return;

    this.registeredWildlife.set(animal.id, animal);

    if (this.wildlifeAI) {
      this.wildlifeAI.registerAnimal(animal.id, {
        species: animal.type || animal.species,
        position: animal.position,
        behavior: animal.behavior || 'NEUTRAL'
      });
    }
  }

  /**
   * Unregister wildlife
   * @param {string} animalId - Animal ID
   */
  unregisterWildlife(animalId) {
    this.registeredWildlife.delete(animalId);

    if (this.wildlifeAI) {
      this.wildlifeAI.unregisterAnimal(animalId);
    }
  }

  /**
   * Register a companion with AI systems
   * @param {Object} companion - Companion entity
   */
  registerCompanion(companion) {
    if (!companion || !companion.id) return;

    this.registeredCompanions.set(companion.id, companion);

    if (this.companionAI) {
      this.companionAI.registerCompanion(companion.id, {
        type: companion.type,
        role: companion.role || 'FIGHTER',
        stats: companion.stats || {},
        position: companion.position
      });
    }
  }

  /**
   * Unregister a companion
   * @param {string} companionId - Companion ID
   */
  unregisterCompanion(companionId) {
    this.registeredCompanions.delete(companionId);

    if (this.companionAI) {
      this.companionAI.unregisterCompanion(companionId);
    }
  }

  /**
   * Register a merchant NPC for economic AI
   * @param {Object} merchant - Merchant data
   */
  registerMerchant(merchant) {
    if (!merchant || !merchant.id) return;

    if (this.economicAI) {
      // EconomicAISystem.registerMerchant takes a config object
      this.economicAI.registerMerchant({
        id: merchant.id,
        name: merchant.name,
        inventory: merchant.inventory || [],
        gold: merchant.gold || 100,
        specialization: merchant.specialization
      });
    }
  }

  // ============================================
  // MAIN UPDATE LOOP
  // ============================================

  /**
   * Update all AI systems
   * @param {number} deltaTime - Time since last update (seconds)
   * @param {Object} gameState - Current game state
   * @returns {Object} Update results
   */
  update(deltaTime, gameState = {}) {
    const result = {
      tick: ++this.stats.ticksProcessed,
      npcBehavior: null,
      enemyAI: null,
      wildlife: null,
      companions: null,
      quests: null,
      economic: null
    };

    // Extract game state info
    const hour = gameState.hour || 12;
    const weather = gameState.weather || 'clear';
    const isNight = hour < 6 || hour >= 20;

    // Update perception system with environment
    if (this.perception) {
      this.perception.setWeather(weather);
      this.perception.setNightMode(isNight);
    }

    // ============================================
    // UPDATE NPC BEHAVIORS
    // ============================================
    if (this.npcBehavior && this.registeredNPCs.size > 0) {
      // NPCBehaviorSystem.update handles all registered NPCs
      this.npcBehavior.setGameState(gameState);
      this.npcBehavior.update(deltaTime, gameState);
      result.npcBehavior = {
        updated: this.registeredNPCs.size,
        stats: this.npcBehavior.getStatistics()
      };
      this.stats.npcsUpdated += this.registeredNPCs.size;
    }

    // ============================================
    // UPDATE ENEMY AI
    // ============================================
    if (this.enemyAI && this.registeredMonsters.size > 0) {
      // Build game state with targets
      const enemyGameState = {
        ...gameState,
        targets: this._buildTargetsList(gameState)
      };

      // EnemyAISystem.update handles all registered enemies
      this.enemyAI.setGameState(enemyGameState);
      this.enemyAI.update(deltaTime, enemyGameState);
      result.enemyAI = {
        updated: this.registeredMonsters.size,
        stats: this.enemyAI.getStatistics()
      };
      this.stats.monstersUpdated += this.registeredMonsters.size;
    }

    // ============================================
    // UPDATE WILDLIFE AI
    // ============================================
    if (this.wildlifeAI && this.registeredWildlife.size > 0) {
      // Build threat list
      const threats = [];
      if (gameState.playerPosition) {
        threats.push({
          id: 'player',
          position: gameState.playerPosition,
          threatLevel: 0.5
        });
      }

      this.wildlifeAI.update(deltaTime, { threats });
      result.wildlife = {
        updated: this.registeredWildlife.size
      };
    }

    // ============================================
    // UPDATE COMPANION AI
    // ============================================
    if (this.companionAI && this.registeredCompanions.size > 0) {
      // Build context for companions
      const companionContext = {
        ownerPosition: gameState.playerPosition,
        threats: this._buildThreatsList(),
        allies: []
      };

      this.companionAI.update(deltaTime, companionContext);
      result.companions = {
        updated: this.registeredCompanions.size
      };
    }

    // ============================================
    // UPDATE QUEST SYSTEM
    // ============================================
    if (this.questAI) {
      this.questAI.update(deltaTime);
      result.quests = {
        active: this.questAI.getActiveQuests().length,
        completed: this.questAI.getCompletedQuests().length
      };
    }

    // ============================================
    // UPDATE ECONOMIC AI
    // ============================================
    if (this.economicAI) {
      this.economicAI.update(deltaTime);
      result.economic = {
        merchantCount: this.economicAI.merchants.size
      };
    }

    return result;
  }

  /**
   * Build targets list from NPCs and player
   * @private
   */
  _buildTargetsList(gameState) {
    const targets = [];

    // Add NPCs as potential targets
    for (const [npcId, npc] of this.registeredNPCs) {
      if (npc.alive !== false) {
        targets.push({
          id: npcId,
          position: npc.position,
          type: 'npc',
          health: npc.health || npc.combatStats?.health?.current
        });
      }
    }

    // Add player if position available
    if (gameState.playerPosition) {
      targets.push({
        id: 'player',
        position: gameState.playerPosition,
        type: 'player',
        health: gameState.playerHealth || 100
      });
    }

    return targets;
  }

  /**
   * Build threats list from monsters
   * @private
   */
  _buildThreatsList() {
    const threats = [];
    for (const [monsterId, monster] of this.registeredMonsters) {
      if (monster.alive) {
        threats.push({
          id: monsterId,
          position: monster.position,
          health: monster.health
        });
      }
    }
    return threats;
  }

  // ============================================
  // PATHFINDING INTERFACE
  // ============================================

  /**
   * Find path between two points
   * @param {Object} start - Start position {x, z}
   * @param {Object} end - End position {x, z}
   * @param {Object} options - Pathfinding options
   * @returns {Array|null} Path waypoints or null
   */
  findPath(start, end, options = {}) {
    if (!this.pathfinding) return null;

    const path = this.pathfinding.findPath(start, end, options);
    if (path) {
      this.stats.pathsCalculated++;
    }
    return path;
  }

  /**
   * Add obstacle at position
   * @param {string} id - Obstacle ID
   * @param {Object} position - Position {x, z}
   * @param {number} radius - Obstacle radius
   */
  addObstacle(id, position, radius = 16) {
    if (this.pathfinding) {
      this.pathfinding.addObstacle(id, position, radius);
    }
  }

  /**
   * Remove obstacle
   * @param {string} id - Obstacle ID
   */
  removeObstacle(id) {
    if (this.pathfinding) {
      this.pathfinding.removeObstacle(id);
    }
  }

  // ============================================
  // QUEST INTERFACE
  // ============================================

  /**
   * Add a quest
   * @param {Object} questData - Quest configuration
   * @returns {Object} Created quest
   */
  addQuest(questData) {
    if (!this.questAI) return null;

    const quest = this.questAI.addQuest(questData);
    this.stats.questsGenerated++;
    return quest;
  }

  /**
   * Accept a quest
   * @param {string} questId - Quest ID
   * @returns {boolean} Success
   */
  acceptQuest(questId) {
    if (!this.questAI) return false;
    return this.questAI.acceptQuest(questId);
  }

  /**
   * Update quest progress (called when game events occur)
   * @param {string} type - Objective type (e.g., 'KILL_ENEMY')
   * @param {string} target - Target identifier
   * @param {number} amount - Progress amount
   */
  updateQuestProgress(type, target, amount = 1) {
    if (!this.questAI) return;
    this.questAI.updateProgress(type, target, amount);
  }

  /**
   * Generate quests for an NPC
   * @param {string} npcId - NPC ID
   * @param {string} npcName - NPC name
   * @param {number} count - Number of quests
   * @returns {Array} Generated quests
   */
  generateQuestsForNPC(npcId, npcName, count = 2) {
    if (!this.questAI) return [];
    return this.questAI.generateQuestsForNPC(npcId, npcName, count);
  }

  // ============================================
  // ECONOMIC INTERFACE
  // ============================================

  /**
   * Process a trade between player and merchant
   * @param {string} merchantId - Merchant ID
   * @param {string} action - 'buy' or 'sell'
   * @param {Object} item - Item to trade
   * @param {number} quantity - Amount
   * @returns {Object} Trade result
   */
  processTrade(merchantId, action, item, quantity = 1) {
    if (!this.economicAI) return { success: false, error: 'Economic AI disabled' };

    let result;
    if (action === 'buy') {
      result = this.economicAI.buyFromMerchant(merchantId, item.id, quantity, { gold: 1000 });
    } else {
      result = this.economicAI.sellToMerchant(merchantId, item.id, quantity);
    }

    if (result && result.success) {
      this.stats.tradesProcessed++;
    }
    return result || { success: false, error: 'Trade failed' };
  }

  // ============================================
  // COMBAT INTEGRATION
  // ============================================

  /**
   * Notify AI systems of combat event
   * @param {Object} event - Combat event data
   */
  onCombatEvent(event) {
    const { type, attackerId, targetId, damage, position } = event;

    // Update quest progress for kills
    if (type === 'kill' && this.questAI) {
      const target = this.registeredMonsters.get(targetId);
      if (target) {
        this.questAI.updateProgress(ObjectiveType.KILL_ENEMY, target.type, 1);
      }
    }

    // Note: PerceptionSystem doesn't create sounds globally - sounds are checked per-perceiver
    // Combat sounds will be detected by nearby entities during their perception updates

    // Update enemy AI with combat info
    if (this.enemyAI && type === 'damage' && position) {
      // Alert nearby enemies via the enemy AI system
      this.enemyAI.dealDamage(targetId, damage, attackerId);
    }
  }

  /**
   * Notify AI systems of item collection
   * @param {Object} item - Collected item
   */
  onItemCollected(item) {
    if (this.questAI && item) {
      this.questAI.updateProgress(ObjectiveType.COLLECT_ITEM, item.type || item.id, 1);
    }
  }

  /**
   * Notify AI systems of location reached
   * @param {string} locationId - Location identifier
   */
  onLocationReached(locationId) {
    if (this.questAI) {
      this.questAI.updateProgress(ObjectiveType.REACH_LOCATION, locationId, 1);
    }
  }

  /**
   * Notify AI systems of NPC interaction
   * @param {string} npcId - NPC ID
   */
  onNPCTalkedTo(npcId) {
    if (this.questAI) {
      this.questAI.updateProgress(ObjectiveType.TALK_TO_NPC, npcId, 1);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Calculate distance between two positions
   * @private
   */
  _distance(pos1, pos2) {
    if (!pos1 || !pos2) return Infinity;
    const dx = pos1.x - pos2.x;
    const dz = (pos1.z || 0) - (pos2.z || 0);
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Add event listener
   * @param {Function} listener - Event listener function
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   * @param {Function} listener - Event listener to remove
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to listeners
   * @private
   */
  _emitEvent(type, data) {
    for (const listener of this.listeners) {
      try {
        listener(type, data);
      } catch (error) {
        console.error('[AISystemManager] Listener error:', error);
      }
    }
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  /**
   * Serialize AI state to JSON
   * @returns {Object} Serialized state
   */
  toJSON() {
    return {
      stats: { ...this.stats },
      questAI: this.questAI?.toJSON() || null,
      economicAI: this.economicAI?.toJSON() || null,
      npcBehavior: this.npcBehavior?.toJSON() || null
    };
  }

  /**
   * Load AI state from JSON
   * @param {Object} data - Serialized state
   */
  fromJSON(data) {
    if (data.stats) {
      this.stats = { ...this.stats, ...data.stats };
    }

    if (data.questAI && this.questAI) {
      this.questAI.fromJSON(data.questAI);
    }

    if (data.economicAI && this.economicAI) {
      this.economicAI.fromJSON(data.economicAI);
    }

    if (data.npcBehavior && this.npcBehavior) {
      this.npcBehavior.fromJSON(data.npcBehavior);
    }
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      registeredNPCs: this.registeredNPCs.size,
      registeredMonsters: this.registeredMonsters.size,
      registeredWildlife: this.registeredWildlife.size,
      registeredCompanions: this.registeredCompanions.size,
      pathfindingEnabled: !!this.pathfinding,
      perceptionEnabled: !!this.perception,
      questsActive: this.questAI?.getActiveQuests()?.length || 0
    };
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.registeredNPCs.clear();
    this.registeredMonsters.clear();
    this.registeredWildlife.clear();
    this.registeredCompanions.clear();
    this.listeners = [];
  }
}

export default AISystemManager;
