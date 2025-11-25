/**
 * QuestAISystem.test.js - Comprehensive tests for Quest AI System
 */

import {
  QuestAISystem,
  Quest,
  QuestObjective,
  QuestReward,
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
      expect(QuestType.GATHER).toBe('GATHER');
      expect(QuestType.EXPLORE).toBe('EXPLORE');
      expect(QuestType.ESCORT).toBe('ESCORT');
      expect(QuestType.DELIVERY).toBe('DELIVERY');
      expect(QuestType.RESCUE).toBe('RESCUE');
      expect(QuestType.DEFEND).toBe('DEFEND');
    });

    test('QuestDifficulty should have all levels', () => {
      expect(QuestDifficulty.EASY).toBe('EASY');
      expect(QuestDifficulty.MEDIUM).toBe('MEDIUM');
      expect(QuestDifficulty.HARD).toBe('HARD');
      expect(QuestDifficulty.LEGENDARY).toBe('LEGENDARY');
    });

    test('QuestState should have all states', () => {
      expect(QuestState.AVAILABLE).toBe('AVAILABLE');
      expect(QuestState.ACTIVE).toBe('ACTIVE');
      expect(QuestState.COMPLETED).toBe('COMPLETED');
      expect(QuestState.FAILED).toBe('FAILED');
      expect(QuestState.EXPIRED).toBe('EXPIRED');
    });

    test('ObjectiveType should have all types', () => {
      expect(ObjectiveType.KILL).toBe('KILL');
      expect(ObjectiveType.COLLECT).toBe('COLLECT');
      expect(ObjectiveType.INTERACT).toBe('INTERACT');
      expect(ObjectiveType.REACH).toBe('REACH');
      expect(ObjectiveType.PROTECT).toBe('PROTECT');
    });
  });

  // ============================================
  // QUEST REWARD TESTS
  // ============================================

  describe('QuestReward', () => {
    test('should create reward', () => {
      const reward = new QuestReward({
        gold: 100,
        experience: 50,
        items: ['sword']
      });

      expect(reward.gold).toBe(100);
      expect(reward.experience).toBe(50);
      expect(reward.items).toContain('sword');
    });

    test('should serialize to JSON', () => {
      const reward = new QuestReward({ gold: 100 });
      const json = reward.toJSON();
      expect(json.gold).toBe(100);
    });

    test('should deserialize from JSON', () => {
      const data = { gold: 200, experience: 100, items: ['armor'] };
      const reward = QuestReward.fromJSON(data);
      expect(reward.gold).toBe(200);
      expect(reward.items).toContain('armor');
    });
  });

  // ============================================
  // QUEST OBJECTIVE TESTS
  // ============================================

  describe('QuestObjective', () => {
    test('should create objective', () => {
      const objective = new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 10,
        description: 'Kill 10 goblins'
      });

      expect(objective.type).toBe(ObjectiveType.KILL);
      expect(objective.target).toBe('goblin');
      expect(objective.requiredCount).toBe(10);
      expect(objective.currentCount).toBe(0);
    });

    test('should track progress', () => {
      const objective = new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 10
      });

      objective.addProgress(5);
      expect(objective.currentCount).toBe(5);
      expect(objective.isComplete()).toBe(false);
    });

    test('should complete when target reached', () => {
      const objective = new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 5
      });

      objective.addProgress(5);
      expect(objective.isComplete()).toBe(true);
    });

    test('should not exceed required count', () => {
      const objective = new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 5
      });

      objective.addProgress(10);
      expect(objective.currentCount).toBe(5);
    });

    test('should calculate completion percentage', () => {
      const objective = new QuestObjective({
        type: ObjectiveType.COLLECT,
        target: 'herb',
        requiredCount: 10
      });

      objective.addProgress(5);
      expect(objective.getProgress()).toBe(0.5);
    });

    test('should reset progress', () => {
      const objective = new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 10
      });

      objective.addProgress(5);
      objective.reset();
      expect(objective.currentCount).toBe(0);
    });
  });

  // ============================================
  // QUEST TESTS
  // ============================================

  describe('Quest', () => {
    test('should create quest', () => {
      const quest = new Quest({
        id: 'quest1',
        title: 'Test Quest',
        description: 'A test quest',
        type: QuestType.KILL,
        difficulty: QuestDifficulty.EASY
      });

      expect(quest.id).toBe('quest1');
      expect(quest.title).toBe('Test Quest');
      expect(quest.state).toBe(QuestState.AVAILABLE);
    });

    test('should add objectives', () => {
      const quest = new Quest({ id: 'quest1' });
      const objective = new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 5
      });

      quest.addObjective(objective);
      expect(quest.objectives.length).toBe(1);
    });

    test('should calculate total progress', () => {
      const quest = new Quest({ id: 'quest1' });
      quest.addObjective(new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 10
      }));
      quest.addObjective(new QuestObjective({
        type: ObjectiveType.COLLECT,
        target: 'herb',
        requiredCount: 10
      }));

      quest.objectives[0].addProgress(5);
      quest.objectives[1].addProgress(5);

      expect(quest.getProgress()).toBe(0.5);
    });

    test('should check if all objectives complete', () => {
      const quest = new Quest({ id: 'quest1' });
      quest.addObjective(new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 5
      }));

      expect(quest.areObjectivesComplete()).toBe(false);

      quest.objectives[0].addProgress(5);
      expect(quest.areObjectivesComplete()).toBe(true);
    });

    test('should activate quest', () => {
      const quest = new Quest({ id: 'quest1' });
      quest.activate();

      expect(quest.state).toBe(QuestState.ACTIVE);
      expect(quest.startTime).not.toBeNull();
    });

    test('should complete quest', () => {
      const quest = new Quest({ id: 'quest1' });
      quest.activate();
      quest.complete();

      expect(quest.state).toBe(QuestState.COMPLETED);
      expect(quest.completionTime).not.toBeNull();
    });

    test('should fail quest', () => {
      const quest = new Quest({ id: 'quest1' });
      quest.activate();
      quest.fail();

      expect(quest.state).toBe(QuestState.FAILED);
    });

    test('should check expiration', () => {
      const quest = new Quest({
        id: 'quest1',
        timeLimit: 1000 // 1 second
      });
      quest.activate();
      quest.startTime = Date.now() - 2000; // 2 seconds ago

      expect(quest.isExpired()).toBe(true);
    });

    test('should not expire without time limit', () => {
      const quest = new Quest({ id: 'quest1' });
      quest.activate();

      expect(quest.isExpired()).toBe(false);
    });
  });

  // ============================================
  // QUEST REGISTRATION TESTS
  // ============================================

  describe('Quest Registration', () => {
    test('should register quest', () => {
      const quest = questAI.registerQuest({
        id: 'quest1',
        title: 'Test Quest',
        type: QuestType.KILL
      });

      expect(quest).not.toBeNull();
      expect(questAI.getQuest('quest1')).toBe(quest);
    });

    test('should unregister quest', () => {
      questAI.registerQuest({ id: 'quest1' });
      questAI.unregisterQuest('quest1');

      expect(questAI.getQuest('quest1')).toBeNull();
    });
  });

  // ============================================
  // QUEST RETRIEVAL TESTS
  // ============================================

  describe('Quest Retrieval', () => {
    beforeEach(() => {
      questAI.registerQuest({ id: 'quest1', type: QuestType.KILL });
      questAI.registerQuest({ id: 'quest2', type: QuestType.GATHER });
      questAI.registerQuest({ id: 'quest3', type: QuestType.EXPLORE });
    });

    test('should get all quests', () => {
      expect(questAI.getAllQuests().length).toBe(3);
    });

    test('should get available quests', () => {
      const quest1 = questAI.getQuest('quest1');
      quest1.activate();

      const available = questAI.getAvailableQuests();
      expect(available.length).toBe(2);
    });

    test('should get active quests', () => {
      const quest1 = questAI.getQuest('quest1');
      quest1.activate();

      const active = questAI.getActiveQuests();
      expect(active.length).toBe(1);
      expect(active[0].id).toBe('quest1');
    });

    test('should get completed quests', () => {
      const quest1 = questAI.getQuest('quest1');
      quest1.activate();
      quest1.complete();

      const completed = questAI.getCompletedQuests();
      expect(completed.length).toBe(1);
    });

    test('should get quests by type', () => {
      const killQuests = questAI.getQuestsByType(QuestType.KILL);
      expect(killQuests.length).toBe(1);
    });
  });

  // ============================================
  // QUEST GENERATION TESTS
  // ============================================

  describe('Quest Generation', () => {
    test('should generate kill quest', () => {
      const quest = questAI.generateQuest({
        type: QuestType.KILL,
        difficulty: QuestDifficulty.EASY
      });

      expect(quest).not.toBeNull();
      expect(quest.type).toBe(QuestType.KILL);
      expect(quest.objectives.length).toBeGreaterThan(0);
    });

    test('should generate gather quest', () => {
      const quest = questAI.generateQuest({
        type: QuestType.GATHER,
        difficulty: QuestDifficulty.MEDIUM
      });

      expect(quest).not.toBeNull();
      expect(quest.type).toBe(QuestType.GATHER);
    });

    test('should scale rewards by difficulty', () => {
      const easyQuest = questAI.generateQuest({
        type: QuestType.KILL,
        difficulty: QuestDifficulty.EASY
      });

      const hardQuest = questAI.generateQuest({
        type: QuestType.KILL,
        difficulty: QuestDifficulty.HARD
      });

      expect(hardQuest.reward.gold).toBeGreaterThan(easyQuest.reward.gold);
      expect(hardQuest.reward.experience).toBeGreaterThan(easyQuest.reward.experience);
    });

    test('should generate random quest', () => {
      const quest = questAI.generateRandomQuest(QuestDifficulty.MEDIUM);
      expect(quest).not.toBeNull();
      expect(quest.type).toBeDefined();
    });
  });

  // ============================================
  // QUEST ACTION TESTS
  // ============================================

  describe('Quest Actions', () => {
    let quest;

    beforeEach(() => {
      quest = questAI.registerQuest({
        id: 'quest1',
        title: 'Kill Goblins',
        type: QuestType.KILL
      });
      quest.addObjective(new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 5
      }));
    });

    test('should accept quest', () => {
      const result = questAI.acceptQuest('quest1');
      expect(result).toBe(true);
      expect(quest.state).toBe(QuestState.ACTIVE);
    });

    test('should not accept already active quest', () => {
      questAI.acceptQuest('quest1');
      const result = questAI.acceptQuest('quest1');
      expect(result).toBe(false);
    });

    test('should abandon quest', () => {
      questAI.acceptQuest('quest1');
      const result = questAI.abandonQuest('quest1');
      expect(result).toBe(true);
      expect(quest.state).toBe(QuestState.AVAILABLE);
    });

    test('should complete quest', () => {
      questAI.acceptQuest('quest1');
      quest.objectives[0].addProgress(5);

      const result = questAI.completeQuest('quest1');
      expect(result).not.toBeNull();
      expect(quest.state).toBe(QuestState.COMPLETED);
    });

    test('should not complete incomplete quest', () => {
      questAI.acceptQuest('quest1');
      const result = questAI.completeQuest('quest1');
      expect(result).toBeNull();
    });

    test('should turn in quest for rewards', () => {
      questAI.acceptQuest('quest1');
      quest.objectives[0].addProgress(5);
      questAI.completeQuest('quest1');

      const rewards = questAI.turnInQuest('quest1');
      expect(rewards).not.toBeNull();
    });
  });

  // ============================================
  // OBJECTIVE PROGRESS TESTS
  // ============================================

  describe('Objective Progress', () => {
    test('should update kill objective', () => {
      const quest = questAI.registerQuest({ id: 'quest1', type: QuestType.KILL });
      quest.addObjective(new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 10
      }));
      questAI.acceptQuest('quest1');

      questAI.updateObjectiveProgress(ObjectiveType.KILL, 'goblin', 3);

      expect(quest.objectives[0].currentCount).toBe(3);
    });

    test('should update collect objective', () => {
      const quest = questAI.registerQuest({ id: 'quest1', type: QuestType.GATHER });
      quest.addObjective(new QuestObjective({
        type: ObjectiveType.COLLECT,
        target: 'herb',
        requiredCount: 5
      }));
      questAI.acceptQuest('quest1');

      questAI.updateObjectiveProgress(ObjectiveType.COLLECT, 'herb', 2);

      expect(quest.objectives[0].currentCount).toBe(2);
    });

    test('should update all matching objectives', () => {
      const quest1 = questAI.registerQuest({ id: 'quest1', type: QuestType.KILL });
      quest1.addObjective(new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 5
      }));

      const quest2 = questAI.registerQuest({ id: 'quest2', type: QuestType.KILL });
      quest2.addObjective(new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 10
      }));

      questAI.acceptQuest('quest1');
      questAI.acceptQuest('quest2');

      questAI.updateObjectiveProgress(ObjectiveType.KILL, 'goblin', 3);

      expect(quest1.objectives[0].currentCount).toBe(3);
      expect(quest2.objectives[0].currentCount).toBe(3);
    });
  });

  // ============================================
  // UPDATE TESTS
  // ============================================

  describe('Update System', () => {
    test('should expire timed quests', () => {
      const quest = questAI.registerQuest({
        id: 'quest1',
        timeLimit: 100
      });
      questAI.acceptQuest('quest1');
      quest.startTime = Date.now() - 200;

      questAI.update(16);

      expect(quest.state).toBe(QuestState.EXPIRED);
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

      questAI.registerQuest({ id: 'quest1' });
      questAI.acceptQuest('quest1');

      expect(listener).toHaveBeenCalledWith('questAccepted', expect.objectContaining({
        questId: 'quest1'
      }));
    });

    test('should emit questCompleted event', () => {
      const listener = jest.fn();
      questAI.addListener(listener);

      const quest = questAI.registerQuest({ id: 'quest1' });
      quest.addObjective(new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 1
      }));
      questAI.acceptQuest('quest1');
      quest.objectives[0].addProgress(1);
      questAI.completeQuest('quest1');

      expect(listener).toHaveBeenCalledWith('questCompleted', expect.objectContaining({
        questId: 'quest1'
      }));
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should get statistics', () => {
      questAI.registerQuest({ id: 'quest1' });
      questAI.registerQuest({ id: 'quest2' });
      questAI.acceptQuest('quest1');

      const stats = questAI.getStatistics();
      expect(stats.totalQuests).toBe(2);
      expect(stats.activeQuests).toBe(1);
    });
  });

  // ============================================
  // SERIALIZATION TESTS
  // ============================================

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      const quest = questAI.registerQuest({
        id: 'quest1',
        title: 'Test Quest',
        type: QuestType.KILL
      });
      quest.addObjective(new QuestObjective({
        type: ObjectiveType.KILL,
        target: 'goblin',
        requiredCount: 5
      }));
      questAI.acceptQuest('quest1');

      const json = questAI.toJSON();
      expect(json.quests).toHaveProperty('quest1');
    });

    test('should deserialize from JSON', () => {
      const data = {
        quests: {
          quest1: {
            id: 'quest1',
            title: 'Test Quest',
            type: QuestType.KILL,
            state: QuestState.ACTIVE,
            objectives: [{
              type: ObjectiveType.KILL,
              target: 'goblin',
              requiredCount: 5,
              currentCount: 3
            }],
            reward: { gold: 100, experience: 50, items: [] }
          }
        }
      };

      questAI.fromJSON(data);

      const quest = questAI.getQuest('quest1');
      expect(quest).not.toBeNull();
      expect(quest.objectives[0].currentCount).toBe(3);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should complete full quest lifecycle', () => {
      // Generate quest
      const quest = questAI.generateQuest({
        type: QuestType.KILL,
        difficulty: QuestDifficulty.EASY
      });

      // Accept quest
      questAI.acceptQuest(quest.id);
      expect(quest.state).toBe(QuestState.ACTIVE);

      // Progress objectives
      const objective = quest.objectives[0];
      const target = objective.target;
      for (let i = 0; i < objective.requiredCount; i++) {
        questAI.updateObjectiveProgress(objective.type, target, 1);
      }

      // Complete quest
      const result = questAI.completeQuest(quest.id);
      expect(result).not.toBeNull();
      expect(quest.state).toBe(QuestState.COMPLETED);

      // Claim rewards
      const rewards = questAI.turnInQuest(quest.id);
      expect(rewards.gold).toBeGreaterThan(0);
    });
  });
});
