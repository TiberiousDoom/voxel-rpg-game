/**
 * QuestManager.js - Quest system manager
 *
 * Manages:
 * - Quest loading and initialization
 * - Quest progression tracking
 * - Integration with game events (kills, collection, exploration)
 * - Quest chain management
 */

/* eslint-disable no-console */

import useQuestStore from '../stores/useQuestStore.js';
import useGameStore from '../stores/useGameStore.js';

/**
 * Quest Manager
 * Handles quest lifecycle and event integration
 */
export class QuestManager {
  constructor() {
    this.initialized = false;
    this.eventListeners = new Map();

    console.log('📜 QuestManager: Initialized');
  }

  /**
   * Initialize quest system with quest definitions
   * @param {Array<Object>} questDefinitions - Quest configuration objects
   */
  initialize(questDefinitions = []) {
    if (this.initialized) {
      console.warn('⚠️ QuestManager already initialized');
      return;
    }

    // Load quests into store
    useQuestStore.getState().initializeQuests(questDefinitions);

    // Setup event listeners
    this.setupEventListeners();

    this.initialized = true;
    console.log(`✅ QuestManager: Loaded ${questDefinitions.length} quest definitions`);
  }

  /**
   * Setup event listeners for quest tracking
   */
  setupEventListeners() {
    // These will be called from game events

    // Monster kill tracking
    this.on('monsterKilled', (monsterType) => {
      this.trackKill(monsterType);
    });

    // Item collection tracking
    this.on('itemCollected', (itemType) => {
      this.trackCollection(itemType);
    });

    // Location discovery tracking
    this.on('locationDiscovered', (locationName) => {
      this.trackExploration(locationName);
    });

    // Building construction tracking
    this.on('buildingPlaced', (buildingType) => {
      this.trackBuilding(buildingType);
    });

    // NPC interaction tracking
    this.on('npcTalkedTo', (npcId) => {
      this.trackTalk(npcId);
    });
  }

  /**
   * Register an event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  on(eventName, callback) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(callback);
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  emit(eventName, data) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Track monster kill for quest objectives
   * @param {string} monsterType - Monster type (e.g., 'SLIME', 'GOBLIN')
   */
  trackKill(monsterType) {
    const questStore = useQuestStore.getState();
    questStore.updateQuestProgress('KILL', monsterType, 1);
  }

  /**
   * Track item collection for quest objectives
   * @param {string} itemType - Item type
   */
  trackCollection(itemType) {
    const questStore = useQuestStore.getState();
    questStore.updateQuestProgress('COLLECT', itemType, 1);
  }

  /**
   * Track location exploration for quest objectives
   * @param {string} locationName - Location name
   */
  trackExploration(locationName) {
    const questStore = useQuestStore.getState();
    questStore.updateQuestProgress('EXPLORE', locationName, 1);
  }

  /**
   * Track building placement for quest objectives
   * @param {string} buildingType - Building type
   */
  trackBuilding(buildingType) {
    const questStore = useQuestStore.getState();
    questStore.updateQuestProgress('BUILD', buildingType, 1);
  }

  /**
   * Track NPC talk for quest objectives
   * @param {string} npcId - NPC ID
   */
  trackTalk(npcId) {
    const questStore = useQuestStore.getState();
    questStore.updateQuestProgress('TALK', npcId, 1);
  }

  /**
   * Accept a quest
   * @param {string} questId - Quest ID
   * @returns {boolean} - Success
   */
  acceptQuest(questId) {
    return useQuestStore.getState().acceptQuest(questId);
  }

  /**
   * Abandon a quest
   * @param {string} questId - Quest ID
   * @returns {boolean} - Success
   */
  abandonQuest(questId) {
    return useQuestStore.getState().abandonQuest(questId);
  }

  /**
   * Get all available quests for current player level
   * @returns {Array<Quest>}
   */
  getAvailableQuests() {
    const questStore = useQuestStore.getState();
    const playerLevel = useGameStore.getState().player?.level || 1;
    const completedQuestIds = questStore.completedQuestIds;

    return questStore.availableQuests.filter(quest =>
      quest.canAccept(playerLevel, completedQuestIds)
    );
  }

  /**
   * Get all active quests
   * @returns {Array<Quest>}
   */
  getActiveQuests() {
    return useQuestStore.getState().activeQuests;
  }

  /**
   * Get quest by ID
   * @param {string} questId - Quest ID
   * @returns {Quest|null}
   */
  getQuest(questId) {
    return useQuestStore.getState().getQuest(questId);
  }

  /**
   * Check if player can accept more quests
   * @param {number} maxActiveQuests - Maximum active quests (default 10)
   * @returns {boolean}
   */
  canAcceptMoreQuests(maxActiveQuests = 10) {
    const activeCount = useQuestStore.getState().getActiveQuestCount();
    return activeCount < maxActiveQuests;
  }

  /**
   * Get quest chains (quests linked by prerequisites)
   * @returns {Object} - Map of chain ID to quest array
   */
  getQuestChains() {
    const questStore = useQuestStore.getState();
    const allQuests = [
      ...questStore.availableQuests,
      ...questStore.activeQuests
    ];

    const chains = new Map();

    allQuests.forEach(quest => {
      if (quest.chainId) {
        if (!chains.has(quest.chainId)) {
          chains.set(quest.chainId, []);
        }
        chains.get(quest.chainId).push(quest);
      }
    });

    // Sort each chain by index
    chains.forEach((quests, chainId) => {
      chains.set(chainId, quests.sort((a, b) =>
        (a.chainIndex || 0) - (b.chainIndex || 0)
      ));
    });

    return Object.fromEntries(chains);
  }

  /**
   * Get quest statistics
   * @returns {Object} - Quest stats
   */
  getStats() {
    const questStore = useQuestStore.getState();

    return {
      available: questStore.availableQuests.length,
      active: questStore.activeQuests.length,
      completed: questStore.completedQuestIds.length,
      total: questStore.availableQuests.length +
             questStore.activeQuests.length +
             questStore.completedQuestIds.length
    };
  }

  /**
   * Update all active quests (called each frame)
   * Useful for time-based quest objectives or updates
   * @param {number} deltaTime - Time since last update (ms)
   */
  update(deltaTime) {
    // Currently no time-based quest mechanics
    // But this is a hook for future features like:
    // - Time limit quests
    // - Periodic quest updates
    // - Quest event triggers
  }

  /**
   * Reset quest system (for testing)
   */
  reset() {
    useQuestStore.getState().clearAllQuests();
    this.eventListeners.clear();
    this.initialized = false;
    console.log('🔄 QuestManager: Reset complete');
  }

  /**
   * Debug: Complete quest immediately
   * @param {string} questId - Quest ID
   */
  debugCompleteQuest(questId) {
    const quest = this.getQuest(questId);
    if (!quest) {
      console.warn(`⚠️ Quest ${questId} not found`);
      return;
    }

    // Complete all objectives
    quest.objectives.forEach(objective => {
      objective.currentCount = objective.targetCount;
      objective.completed = true;
    });

    // Complete quest
    useQuestStore.getState().completeQuest(questId);
    console.log(`🐛 Debug: Completed quest ${quest.title}`);
  }

  /**
   * Debug: Accept all available quests
   */
  debugAcceptAllQuests() {
    const available = this.getAvailableQuests();
    available.forEach(quest => {
      this.acceptQuest(quest.id);
    });
    console.log(`🐛 Debug: Accepted ${available.length} quests`);
  }
}

// Singleton instance
let questManagerInstance = null;

/**
 * Get QuestManager singleton instance
 * @returns {QuestManager}
 */
export function getQuestManager() {
  if (!questManagerInstance) {
    questManagerInstance = new QuestManager();
  }
  return questManagerInstance;
}

export default QuestManager;
