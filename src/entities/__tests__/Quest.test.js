/**
 * Quest.test.js - Quest entity tests
 */

import { Quest, QuestObjective } from '../Quest.js';

describe('QuestObjective', () => {
  it('should create objective with default values', () => {
    const objective = new QuestObjective({
      description: 'Kill 10 Slimes',
      type: 'KILL',
      targetType: 'SLIME',
      targetCount: 10
    });

    expect(objective.description).toBe('Kill 10 Slimes');
    expect(objective.type).toBe('KILL');
    expect(objective.targetType).toBe('SLIME');
    expect(objective.targetCount).toBe(10);
    expect(objective.currentCount).toBe(0);
    expect(objective.completed).toBe(false);
  });

  it('should track progress', () => {
    const objective = new QuestObjective({
      description: 'Kill 10 Slimes',
      type: 'KILL',
      targetType: 'SLIME',
      targetCount: 10
    });

    objective.addProgress(5);
    expect(objective.currentCount).toBe(5);
    expect(objective.completed).toBe(false);
    expect(objective.getProgress()).toBe(0.5);

    objective.addProgress(5);
    expect(objective.currentCount).toBe(10);
    expect(objective.completed).toBe(true);
    expect(objective.getProgress()).toBe(1.0);
  });

  it('should not exceed target count', () => {
    const objective = new QuestObjective({
      description: 'Kill 10 Slimes',
      type: 'KILL',
      targetType: 'SLIME',
      targetCount: 10
    });

    objective.addProgress(15);
    expect(objective.currentCount).toBe(10);
    expect(objective.completed).toBe(true);
  });

  it('should reset progress', () => {
    const objective = new QuestObjective({
      description: 'Kill 10 Slimes',
      type: 'KILL',
      targetType: 'SLIME',
      targetCount: 10
    });

    objective.addProgress(10);
    expect(objective.completed).toBe(true);

    objective.reset();
    expect(objective.currentCount).toBe(0);
    expect(objective.completed).toBe(false);
  });
});

describe('Quest', () => {
  describe('Quest Creation', () => {
    it('should create quest with basic properties', () => {
      const quest = new Quest({
        id: 'quest_001',
        title: 'Test Quest',
        description: 'A test quest',
        type: 'KILL',
        levelRequirement: 1
      });

      expect(quest.id).toBe('quest_001');
      expect(quest.title).toBe('Test Quest');
      expect(quest.description).toBe('A test quest');
      expect(quest.type).toBe('KILL');
      expect(quest.levelRequirement).toBe(1);
      expect(quest.state).toBe('AVAILABLE');
    });

    it('should create quest with objectives', () => {
      const quest = new Quest({
        title: 'Slime Hunter',
        objectives: [
          {
            description: 'Kill 10 Slimes',
            type: 'KILL',
            targetType: 'SLIME',
            targetCount: 10
          }
        ]
      });

      expect(quest.objectives.length).toBe(1);
      expect(quest.objectives[0]).toBeInstanceOf(QuestObjective);
      expect(quest.objectives[0].description).toBe('Kill 10 Slimes');
    });

    it('should create quest with rewards', () => {
      const quest = new Quest({
        title: 'Test Quest',
        rewards: {
          xp: 100,
          gold: 50,
          items: []
        }
      });

      expect(quest.rewards.xp).toBe(100);
      expect(quest.rewards.gold).toBe(50);
      expect(quest.rewards.items).toEqual([]);
    });
  });

  describe('Quest Acceptance', () => {
    it('should accept available quest', () => {
      const quest = new Quest({
        title: 'Test Quest',
        levelRequirement: 1
      });

      const result = quest.accept();
      expect(result).toBe(true);
      expect(quest.state).toBe('ACTIVE');
      expect(quest.acceptedAt).toBeDefined();
    });

    it('should not accept non-available quest', () => {
      const quest = new Quest({
        title: 'Test Quest',
        state: 'ACTIVE'
      });

      const result = quest.accept();
      expect(result).toBe(false);
    });

    it('should check level requirement', () => {
      const quest = new Quest({
        title: 'High Level Quest',
        levelRequirement: 10
      });

      const canAccept = quest.canAccept(5, []);
      expect(canAccept).toBe(false);

      const canAcceptHighLevel = quest.canAccept(10, []);
      expect(canAcceptHighLevel).toBe(true);
    });

    it('should check prerequisites', () => {
      const quest = new Quest({
        title: 'Follow-up Quest',
        prerequisiteQuests: ['quest_001', 'quest_002']
      });

      const canAcceptNoPrereq = quest.canAccept(1, []);
      expect(canAcceptNoPrereq).toBe(false);

      const canAcceptPartialPrereq = quest.canAccept(1, ['quest_001']);
      expect(canAcceptPartialPrereq).toBe(false);

      const canAcceptAllPrereq = quest.canAccept(1, ['quest_001', 'quest_002']);
      expect(canAcceptAllPrereq).toBe(true);
    });
  });

  describe('Quest Progress', () => {
    it('should update quest progress by target type', () => {
      const quest = new Quest({
        title: 'Slime Hunter',
        objectives: [
          {
            description: 'Kill 10 Slimes',
            type: 'KILL',
            targetType: 'SLIME',
            targetCount: 10
          }
        ]
      });

      quest.accept();

      quest.updateProgress('KILL', 'SLIME', 5);
      expect(quest.objectives[0].currentCount).toBe(5);
      expect(quest.getProgress()).toBe(0.5);

      const completed = quest.updateProgress('KILL', 'SLIME', 5);
      expect(quest.objectives[0].currentCount).toBe(10);
      expect(quest.getProgress()).toBe(1.0);
      expect(completed).toBe(true);
      expect(quest.state).toBe('COMPLETED');
    });

    it('should handle multiple objectives', () => {
      const quest = new Quest({
        title: 'Monster Hunter',
        objectives: [
          {
            description: 'Kill 10 Slimes',
            type: 'KILL',
            targetType: 'SLIME',
            targetCount: 10
          },
          {
            description: 'Kill 5 Goblins',
            type: 'KILL',
            targetType: 'GOBLIN',
            targetCount: 5
          }
        ]
      });

      quest.accept();

      quest.updateProgress('KILL', 'SLIME', 10);
      expect(quest.objectives[0].completed).toBe(true);
      expect(quest.state).toBe('ACTIVE'); // Not complete yet

      quest.updateProgress('KILL', 'GOBLIN', 5);
      expect(quest.objectives[1].completed).toBe(true);
      expect(quest.state).toBe('COMPLETED');
    });

    it('should handle optional objectives', () => {
      const quest = new Quest({
        title: 'Mixed Objectives',
        objectives: [
          {
            description: 'Kill 10 Slimes',
            type: 'KILL',
            targetType: 'SLIME',
            targetCount: 10,
            optional: false
          },
          {
            description: 'Collect 5 Gems (Optional)',
            type: 'COLLECT',
            targetType: 'GEM',
            targetCount: 5,
            optional: true
          }
        ]
      });

      quest.accept();

      // Complete only required objective
      quest.updateProgress('KILL', 'SLIME', 10);
      expect(quest.state).toBe('COMPLETED'); // Should complete even without optional
    });
  });

  describe('Quest Completion', () => {
    it('should complete quest when all objectives done', () => {
      const quest = new Quest({
        title: 'Simple Quest',
        objectives: [
          {
            description: 'Kill 5 Slimes',
            type: 'KILL',
            targetType: 'SLIME',
            targetCount: 5
          }
        ]
      });

      quest.accept();
      quest.updateProgress('KILL', 'SLIME', 5);

      expect(quest.state).toBe('COMPLETED');
      expect(quest.completedAt).toBeDefined();
      expect(quest.timesCompleted).toBe(1);
    });

    it('should handle repeatable quests', () => {
      const quest = new Quest({
        title: 'Daily Quest',
        repeatable: true,
        objectives: [
          {
            description: 'Kill 5 Slimes',
            type: 'KILL',
            targetType: 'SLIME',
            targetCount: 5
          }
        ]
      });

      quest.accept();
      quest.updateProgress('KILL', 'SLIME', 5);

      expect(quest.timesCompleted).toBe(1);

      // Wait for state reset (async)
      setTimeout(() => {
        expect(quest.state).toBe('AVAILABLE');
        expect(quest.objectives[0].currentCount).toBe(0);
      }, 10);
    });
  });

  describe('Quest Abandonment', () => {
    it('should abandon active quest', () => {
      const quest = new Quest({
        title: 'Test Quest',
        objectives: [
          {
            description: 'Kill 10 Slimes',
            type: 'KILL',
            targetType: 'SLIME',
            targetCount: 10
          }
        ]
      });

      quest.accept();
      quest.updateProgress('KILL', 'SLIME', 5);

      const result = quest.abandon();
      expect(result).toBe(true);
      expect(quest.state).toBe('AVAILABLE');
      expect(quest.acceptedAt).toBeNull();
      expect(quest.objectives[0].currentCount).toBe(0);
    });

    it('should not abandon non-active quest', () => {
      const quest = new Quest({
        title: 'Test Quest',
        state: 'AVAILABLE'
      });

      const result = quest.abandon();
      expect(result).toBe(false);
    });
  });

  describe('Quest Serialization', () => {
    it('should serialize to JSON', () => {
      const quest = new Quest({
        id: 'quest_001',
        title: 'Test Quest',
        description: 'A test',
        levelRequirement: 5,
        objectives: [
          {
            description: 'Kill 10 Slimes',
            type: 'KILL',
            targetType: 'SLIME',
            targetCount: 10
          }
        ],
        rewards: {
          xp: 100,
          gold: 50
        }
      });

      const json = quest.toJSON();

      expect(json.id).toBe('quest_001');
      expect(json.title).toBe('Test Quest');
      expect(json.levelRequirement).toBe(5);
      expect(json.objectives.length).toBe(1);
      expect(json.rewards.xp).toBe(100);
    });

    it('should deserialize from JSON', () => {
      const data = {
        id: 'quest_001',
        title: 'Test Quest',
        description: 'A test',
        levelRequirement: 5,
        objectives: [
          {
            description: 'Kill 10 Slimes',
            type: 'KILL',
            targetType: 'SLIME',
            targetCount: 10,
            currentCount: 5
          }
        ],
        rewards: {
          xp: 100,
          gold: 50
        }
      };

      const quest = Quest.fromJSON(data);

      expect(quest.id).toBe('quest_001');
      expect(quest.title).toBe('Test Quest');
      expect(quest.objectives[0].currentCount).toBe(5);
    });
  });
});
