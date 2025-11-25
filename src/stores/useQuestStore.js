/**
 * useQuestStore.js - Zustand store for quest management
 *
 * Manages:
 * - Available quests (can be accepted)
 * - Active quests (currently in progress)
 * - Completed quests (finished)
 * - Quest progress tracking
 * - Quest rewards
 */

import { create } from 'zustand';
import { Quest } from '../entities/Quest.js';
import useGameStore from './useGameStore.js';

/**
 * Quest store
 */
const useQuestStore = create((set, get) => ({
  // Quest collections
  availableQuests: [],
  activeQuests: [],
  completedQuestIds: [], // Just IDs to save memory

  // Quest history
  questHistory: [], // Recent quest completions for UI

  // Debug flag
  debugMode: false,

  /**
   * Initialize quests from configuration
   * @param {Array<Object>} questConfigs - Quest configurations
   */
  initializeQuests: (questConfigs) => {
    const quests = questConfigs.map(config => new Quest(config));
    set({ availableQuests: quests });
    // eslint-disable-next-line no-console
    console.log(`📜 QuestStore: Initialized ${quests.length} quests`);
  },

  /**
   * Add a new quest to available quests
   * @param {Quest|Object} questOrConfig - Quest instance or configuration
   */
  addAvailableQuest: (questOrConfig) => {
    const quest = questOrConfig instanceof Quest
      ? questOrConfig
      : new Quest(questOrConfig);

    set(state => ({
      availableQuests: [...state.availableQuests, quest]
    }));

    // eslint-disable-next-line no-console
    console.log(`📜 New quest available: ${quest.title}`);
  },

  /**
   * Accept a quest
   * @param {string} questId - Quest ID
   * @returns {boolean} - Success
   */
  acceptQuest: (questId) => {
    const state = get();
    const quest = state.availableQuests.find(q => q.id === questId);

    if (!quest) {
      console.warn(`⚠️ Quest ${questId} not found in available quests`);
      return false;
    }

    // Get player level from game store
    const playerLevel = useGameStore.getState().player?.level || 1;

    // Check if player can accept quest
    if (!quest.canAccept(playerLevel, state.completedQuestIds)) {
      console.warn(`⚠️ Cannot accept quest: ${quest.title}`);
      return false;
    }

    // Accept the quest
    if (!quest.accept()) {
      return false;
    }

    // Move to active quests
    set(state => ({
      availableQuests: state.availableQuests.filter(q => q.id !== questId),
      activeQuests: [...state.activeQuests, quest]
    }));

    return true;
  },

  /**
   * Update quest progress by objective type and target
   * @param {string} objectiveType - Objective type (KILL, COLLECT, etc.)
   * @param {string} targetType - Target type (e.g., 'SLIME', 'IRON_ORE')
   * @param {number} amount - Amount to add
   */
  updateQuestProgress: (objectiveType, targetType, amount = 1) => {
    const state = get();
    let questsCompleted = [];

    // Update all active quests
    const updatedQuests = state.activeQuests.map(quest => {
      // Create a copy to trigger React updates
      const questCopy = new Quest(quest.toJSON());

      // Update progress
      const completed = questCopy.updateProgress(objectiveType, targetType, amount);

      if (completed) {
        questsCompleted.push(questCopy);
      }

      return questCopy;
    });

    set({ activeQuests: updatedQuests });

    // Process completed quests
    if (questsCompleted.length > 0) {
      questsCompleted.forEach(quest => {
        get().completeQuest(quest.id);
      });
    }
  },

  /**
   * Update specific quest objective
   * @param {string} questId - Quest ID
   * @param {string} objectiveId - Objective ID
   * @param {number} amount - Amount to add
   */
  updateObjective: (questId, objectiveId, amount = 1) => {
    const state = get();
    const quest = state.activeQuests.find(q => q.id === questId);

    if (!quest) {
      console.warn(`⚠️ Active quest ${questId} not found`);
      return;
    }

    const questCompleted = quest.updateObjective(objectiveId, amount);

    // Trigger React update
    set(state => ({
      activeQuests: [...state.activeQuests]
    }));

    if (questCompleted) {
      get().completeQuest(questId);
    }
  },

  /**
   * Complete a quest and grant rewards
   * @param {string} questId - Quest ID
   */
  completeQuest: (questId) => {
    const state = get();
    const quest = state.activeQuests.find(q => q.id === questId);

    if (!quest) {
      console.warn(`⚠️ Cannot complete quest ${questId}: not found in active quests`);
      return;
    }

    // Grant rewards via game store
    const gameStore = useGameStore.getState();

    if (quest.rewards.xp > 0) {
      gameStore.addXP(quest.rewards.xp);
    }

    if (quest.rewards.gold > 0) {
      gameStore.addGold(quest.rewards.gold);
    }

    quest.rewards.items.forEach(item => {
      gameStore.addItem(item);
    });

    // Log completion
    // eslint-disable-next-line no-console
    console.log(`🎉 Quest completed: ${quest.title}`);
    // eslint-disable-next-line no-console
    console.log(`   Rewards: ${quest.rewards.xp} XP, ${quest.rewards.gold} gold, ${quest.rewards.items.length} items`);

    // Show notification (if NotificationSystem is mounted)
    if (window.addNotification) {
      const rewardText = [];
      if (quest.rewards.xp > 0) rewardText.push(`${quest.rewards.xp} XP`);
      if (quest.rewards.gold > 0) rewardText.push(`${quest.rewards.gold} Gold`);
      if (quest.rewards.items.length > 0) rewardText.push(`${quest.rewards.items.length} item(s)`);

      window.addNotification({
        type: 'success',
        title: 'Quest Complete!',
        description: quest.title,
        extra: rewardText.length > 0 ? `Rewards: ${rewardText.join(', ')}` : null,
        icon: '📜',
        duration: 5000
      });
    }

    // Move to completed
    set(state => ({
      activeQuests: state.activeQuests.filter(q => q.id !== questId),
      completedQuestIds: [...state.completedQuestIds, questId],
      questHistory: [
        {
          questId: quest.id,
          title: quest.title,
          completedAt: Date.now(),
          rewards: quest.rewards
        },
        ...state.questHistory.slice(0, 9) // Keep last 10
      ]
    }));

    // Unlock new quests if any
    if (quest.rewards.unlockQuests && quest.rewards.unlockQuests.length > 0) {
      quest.rewards.unlockQuests.forEach(unlockedQuestId => {
        // This would require quest definitions to be loaded
        // For now, just log it
        // eslint-disable-next-line no-console
        console.log(`🔓 Unlocked new quest: ${unlockedQuestId}`);
      });
    }

    // If repeatable, make available again
    if (quest.repeatable) {
      setTimeout(() => {
        get().addAvailableQuest(quest);
      }, 100);
    }
  },

  /**
   * Abandon an active quest
   * @param {string} questId - Quest ID
   */
  abandonQuest: (questId) => {
    const state = get();
    const quest = state.activeQuests.find(q => q.id === questId);

    if (!quest) {
      console.warn(`⚠️ Cannot abandon quest ${questId}: not found in active quests`);
      return false;
    }

    quest.abandon();

    // Move back to available
    set(state => ({
      activeQuests: state.activeQuests.filter(q => q.id !== questId),
      availableQuests: [...state.availableQuests, quest]
    }));

    return true;
  },

  /**
   * Get quest by ID (from any collection)
   * @param {string} questId - Quest ID
   * @returns {Quest|null}
   */
  getQuest: (questId) => {
    const state = get();

    // Check active quests
    let quest = state.activeQuests.find(q => q.id === questId);
    if (quest) return quest;

    // Check available quests
    quest = state.availableQuests.find(q => q.id === questId);
    if (quest) return quest;

    return null;
  },

  /**
   * Get all quests matching a category
   * @param {string} category - Quest category (MAIN, SIDE, DAILY, etc.)
   * @returns {Array<Quest>}
   */
  getQuestsByCategory: (category) => {
    const state = get();
    return [
      ...state.availableQuests.filter(q => q.category === category),
      ...state.activeQuests.filter(q => q.category === category)
    ];
  },

  /**
   * Get number of active quests
   * @returns {number}
   */
  getActiveQuestCount: () => {
    return get().activeQuests.length;
  },

  /**
   * Get number of completed quests
   * @returns {number}
   */
  getCompletedQuestCount: () => {
    return get().completedQuestIds.length;
  },

  /**
   * Check if player has completed a quest
   * @param {string} questId - Quest ID
   * @returns {boolean}
   */
  hasCompletedQuest: (questId) => {
    return get().completedQuestIds.includes(questId);
  },

  /**
   * Clear all quest data (for testing/reset)
   */
  clearAllQuests: () => {
    set({
      availableQuests: [],
      activeQuests: [],
      completedQuestIds: [],
      questHistory: []
    });
    // eslint-disable-next-line no-console
    console.log('🧹 Cleared all quest data');
  },

  /**
   * Enable debug mode
   * @param {boolean} enabled - Debug mode enabled
   */
  setDebugMode: (enabled) => {
    set({ debugMode: enabled });
    // eslint-disable-next-line no-console
    console.log(`🐛 Quest debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }
}));

export default useQuestStore;
