/**
 * QuestAISystem.test.js - Tests for Quest AI System
 */

import {
  QuestAISystem,
  QuestType,
  QuestDifficulty,
  QuestState,
  ObjectiveType
} from '../QuestAISystem.js';

describe('QuestAISystem', () => {
  let questAI;

  beforeEach(() => {
    questAI = new QuestAISystem();
  });

  // ============================================
  // ENUMS TESTS
  // ============================================

  describe('Enums', () => {
    test('QuestType should have all types', () => {
      expect(QuestType.KILL).toBe('KILL');
      expect(QuestType.FETCH).toBe('FETCH');
      expect(QuestType.ESCORT).toBe('ESCORT');
      expect(QuestType.DISCOVER).toBe('DISCOVER');
      expect(QuestType.CRAFT).toBe('CRAFT');
      expect(QuestType.DEFEND).toBe('DEFEND');
    });

    test('QuestDifficulty should have all levels', () => {
      expect(QuestDifficulty.EASY).toBe('EASY');
      expect(QuestDifficulty.NORMAL).toBe('NORMAL');
      expect(QuestDifficulty.HARD).toBe('HARD');
      expect(QuestDifficulty.LEGENDARY).toBe('LEGENDARY');
    });

    test('QuestState should have all states', () => {
      expect(QuestState.AVAILABLE).toBe('AVAILABLE');
      expect(QuestState.ACTIVE).toBe('ACTIVE');
      expect(QuestState.COMPLETED).toBe('COMPLETED');
      expect(QuestState.FAILED).toBe('FAILED');
      expect(QuestState.EXPIRED).toBe('EXPIRED');
      expect(QuestState.TURNED_IN).toBe('TURNED_IN');
    });

    test('ObjectiveType should have all types', () => {
      expect(ObjectiveType.COLLECT_ITEM).toBe('COLLECT_ITEM');
      expect(ObjectiveType.KILL_ENEMY).toBe('KILL_ENEMY');
      expect(ObjectiveType.REACH_LOCATION).toBe('REACH_LOCATION');
      expect(ObjectiveType.TALK_TO_NPC).toBe('TALK_TO_NPC');
    });
  });

  // ============================================
  // QUEST MANAGEMENT TESTS
  // ============================================

  describe('Quest Management', () => {
    test('should add quest', () => {
      const quest = questAI.addQuest({
        id: 'quest1',
        title: 'Test Quest',
        type: QuestType.KILL
      });

      expect(quest).not.toBeNull();
      expect(questAI.getQuest('quest1')).not.toBeNull();
    });

    test('should abandon quest', () => {
      questAI.addQuest({ id: 'quest1', title: 'Test', type: QuestType.KILL });
      questAI.acceptQuest('quest1');
      questAI.abandonQuest('quest1');

      const quest = questAI.getQuest('quest1');
      expect(quest.state).toBe(QuestState.FAILED);
    });

    test('should get quest by id', () => {
      questAI.addQuest({ id: 'q1', title: 'Quest 1', type: QuestType.KILL });

      expect(questAI.getQuest('q1')).not.toBeNull();
      expect(questAI.getQuest('nonexistent')).toBeNull();
    });
  });

  // ============================================
  // QUEST ACCEPTANCE TESTS
  // ============================================

  describe('Quest Acceptance', () => {
    test('should accept quest', () => {
      const quest = questAI.addQuest({
        id: 'quest1',
        title: 'Test Quest',
        type: QuestType.KILL
      });

      const result = questAI.acceptQuest('quest1');
      expect(result).toBe(true);
      expect(quest.state).toBe(QuestState.ACTIVE);
    });

    test('should track active quests', () => {
      questAI.addQuest({ id: 'q1', title: 'Quest 1', type: QuestType.KILL });
      questAI.addQuest({ id: 'q2', title: 'Quest 2', type: QuestType.FETCH });

      questAI.acceptQuest('q1');

      const activeQuests = questAI.getActiveQuests();
      expect(activeQuests.length).toBe(1);
      expect(activeQuests[0].id).toBe('q1');
    });
  });

  // ============================================
  // OBJECTIVE PROGRESS TESTS
  // ============================================

  describe('Objective Progress', () => {
    test('should update progress by target', () => {
      const quest = questAI.addQuest({
        id: 'quest1',
        title: 'Kill Wolves',
        type: QuestType.KILL,
        objectives: [{
          id: 'obj1',
          type: ObjectiveType.KILL_ENEMY,
          target: 'wolf',
          targetCount: 3
        }]
      });

      questAI.acceptQuest('quest1');
      questAI.updateProgress(ObjectiveType.KILL_ENEMY, 'wolf', 1);

      const obj = quest.objectives.find(o => o.id === 'obj1');
      expect(obj.currentCount).toBe(1);
    });
  });

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('Event Listeners', () => {
    test('should add listener', () => {
      const listener = jest.fn();
      questAI.addListener(listener);
      expect(questAI.listeners).toContain(listener);
    });

    test('should emit questAccepted event', () => {
      const listener = jest.fn();
      questAI.addListener(listener);

      questAI.addQuest({ id: 'q1', title: 'Test', type: QuestType.KILL });
      questAI.acceptQuest('q1');

      expect(listener).toHaveBeenCalledWith('questAccepted', expect.objectContaining({
        questId: 'q1'
      }));
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should get statistics', () => {
      questAI.addQuest({ id: 'q1', title: 'Test', type: QuestType.KILL });
      const stats = questAI.getStatistics();
      expect(stats.totalQuests).toBe(1);
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      questAI.addQuest({
        id: 'quest1',
        title: 'Test Quest',
        type: QuestType.KILL
      });

      const json = questAI.toJSON();
      expect(json.quests).toHaveProperty('quest1');
    });

    test('should deserialize from JSON', () => {
      const data = {
        quests: {
          quest1: {
            id: 'quest1',
            title: 'Restored Quest',
            type: QuestType.FETCH,
            state: QuestState.AVAILABLE,
            objectives: []
          }
        },
        activeQuests: [],
        completedQuests: [],
        playerLevel: 1
      };

      questAI.fromJSON(data);

      const quest = questAI.getQuest('quest1');
      expect(quest).not.toBeNull();
      expect(quest.title).toBe('Restored Quest');
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should handle quest lifecycle', () => {
      // Add quest
      const quest = questAI.addQuest({
        id: 'hunt_wolves',
        title: 'Wolf Hunt',
        type: QuestType.KILL,
        objectives: [{
          id: 'kill_wolves',
          type: ObjectiveType.KILL_ENEMY,
          target: 'wolf',
          targetCount: 3
        }]
      });

      // Accept quest
      questAI.acceptQuest('hunt_wolves');
      expect(quest.state).toBe(QuestState.ACTIVE);

      // Update progress via target (system-wide update)
      questAI.updateProgress(ObjectiveType.KILL_ENEMY, 'wolf', 1);
      questAI.updateProgress(ObjectiveType.KILL_ENEMY, 'wolf', 1);
      questAI.updateProgress(ObjectiveType.KILL_ENEMY, 'wolf', 1);

      const obj = quest.objectives.find(o => o.id === 'kill_wolves');
      expect(obj.currentCount).toBe(3);
    });
  });
});
