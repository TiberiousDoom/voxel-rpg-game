/**
 * Personality and Visual Feedback Tests
 *
 * Tests for Phase 3 & 4 NPC Control Redesign:
 * - Personality system
 * - Relationships
 * - Visual feedback
 * - Thought bubbles
 * - Selection system
 */

import {
  Personality,
  PersonalityTrait,
  Relationship,
  RelationshipManager,
  RelationshipStatus,
} from '../NPCPersonality';
import {
  ThoughtBubble,
  ThoughtType,
  NPCVisualState,
  NPCVisualFeedbackManager,
} from '../NPCVisualFeedback';
import { NPCManager } from '../NPCManager';
import GridManager from '../../foundation/GridManager';
import TownManager from '../../territory-town/TownManager';
import BuildingConfig from '../../building-types/BuildingConfig';

describe('Personality System', () => {
  describe('Personality', () => {
    test('should create personality with traits', () => {
      const personality = new Personality({
        industrious: 0.8,
        social: 0.6,
        brave: 0.7,
      });

      expect(personality.traits.INDUSTRIOUS).toBe(0.8);
      expect(personality.traits.SOCIAL).toBe(0.6);
      expect(personality.traits.BRAVE).toBe(0.7);
    });

    test('should calculate work pace modifier', () => {
      const industrious = new Personality({ industrious: 0.9 });
      const lazy = new Personality({ industrious: 0.1 });

      expect(industrious.workPaceModifier).toBeGreaterThan(1.0);
      expect(lazy.workPaceModifier).toBeLessThan(1.0);
    });

    test('should detect dominant trait', () => {
      const personality = new Personality({
        industrious: 0.9,
        social: 0.3,
        brave: 0.5,
      });

      expect(personality.getDominantTrait()).toBe(PersonalityTrait.INDUSTRIOUS);
    });

    test('should check if NPC has trait', () => {
      const personality = new Personality({ social: 0.8 });

      expect(personality.hasTrait(PersonalityTrait.SOCIAL)).toBe(true);
      expect(personality.hasTrait(PersonalityTrait.BRAVE)).toBe(false);
    });

    test('should generate random personality', () => {
      const personality = Personality.generateRandom();

      expect(personality.traits).toBeDefined();
      expect(personality.workPaceModifier).toBeGreaterThan(0);
    });

    test('should create personality from archetype', () => {
      const craftsman = Personality.fromArchetype('CRAFTSMAN');

      expect(craftsman.traits.PERFECTIONIST).toBeGreaterThan(0.7);
    });
  });

  describe('Relationship', () => {
    test('should create relationship between NPCs', () => {
      const rel = new Relationship('npc1', 'npc2');

      expect(rel.npc1Id).toBe('npc1');
      expect(rel.npc2Id).toBe('npc2');
      expect(rel.value).toBe(0);
    });

    test('should modify relationship value', () => {
      const rel = new Relationship('npc1', 'npc2');
      rel.modify(50);

      expect(rel.value).toBe(50);
      expect(rel.interactions).toBe(1);
    });

    test('should clamp relationship value', () => {
      const rel = new Relationship('npc1', 'npc2');
      rel.modify(150); // Try to exceed max

      expect(rel.value).toBe(100);
    });

    test('should determine relationship status', () => {
      const rel = new Relationship('npc1', 'npc2');

      rel.modify(50);
      expect(rel.getStatus()).toBe(RelationshipStatus.FRIEND);

      rel.modify(-80);
      expect(rel.getStatus()).toBe(RelationshipStatus.RIVAL);
    });

    test('should add shared memories', () => {
      const rel = new Relationship('npc1', 'npc2');
      rel.addMemory('Worked together on farm');

      expect(rel.sharedMemories.length).toBe(1);
      expect(rel.sharedMemories[0].description).toBe('Worked together on farm');
    });

    test('should check if relationship is positive', () => {
      const rel = new Relationship('npc1', 'npc2');

      rel.modify(20);
      expect(rel.isPositive()).toBe(true);

      rel.modify(-30);
      expect(rel.isPositive()).toBe(false);
    });
  });

  describe('RelationshipManager', () => {
    let manager;

    beforeEach(() => {
      manager = new RelationshipManager();
    });

    test('should create and retrieve relationships', () => {
      const rel = manager.getRelationship('npc1', 'npc2');

      expect(rel).toBeDefined();
      expect(rel.npc1Id).toBeTruthy();
      expect(rel.npc2Id).toBeTruthy();
    });

    test('should use consistent keys regardless of order', () => {
      const rel1 = manager.getRelationship('npc1', 'npc2');
      const rel2 = manager.getRelationship('npc2', 'npc1');

      expect(rel1).toBe(rel2);
    });

    test('should record interactions', () => {
      manager.recordInteraction('npc1', 'npc2', 'chat', 5);

      const rel = manager.getRelationship('npc1', 'npc2');
      expect(rel.value).toBe(5);
      expect(rel.sharedMemories.length).toBe(1);
    });

    test('should get all relationships for NPC', () => {
      manager.recordInteraction('npc1', 'npc2', 'chat', 10);
      manager.recordInteraction('npc1', 'npc3', 'work', 20);

      const relationships = manager.getNPCRelationships('npc1');

      expect(relationships.length).toBe(2);
    });

    test('should get friends list', () => {
      manager.modifyRelationship('npc1', 'npc2', 50);
      manager.modifyRelationship('npc1', 'npc3', 60);
      manager.modifyRelationship('npc1', 'npc4', 10);

      const friends = manager.getFriends('npc1');

      expect(friends.length).toBe(2);
      expect(friends).toContain('npc2');
      expect(friends).toContain('npc3');
    });

    test('should get rivals list', () => {
      manager.modifyRelationship('npc1', 'npc2', -30);
      manager.modifyRelationship('npc1', 'npc3', -40);

      const rivals = manager.getRivals('npc1');

      expect(rivals.length).toBe(2);
    });

    test('should clear NPC relationships', () => {
      manager.recordInteraction('npc1', 'npc2', 'chat', 10);
      manager.recordInteraction('npc1', 'npc3', 'work', 20);

      manager.clearNPCRelationships('npc1');

      const relationships = manager.getNPCRelationships('npc1');
      expect(relationships.length).toBe(0);
    });

    test('should get relationship statistics', () => {
      manager.modifyRelationship('npc1', 'npc2', 50);
      manager.modifyRelationship('npc3', 'npc4', -30);

      const stats = manager.getStatistics();

      expect(stats.totalRelationships).toBe(2);
      expect(stats.positiveCount).toBe(1);
      expect(stats.negativeCount).toBe(1);
    });
  });
});

describe('Visual Feedback System', () => {
  describe('ThoughtBubble', () => {
    test('should create thought bubble', () => {
      const thought = new ThoughtBubble(ThoughtType.WORK, 'Working hard!', 3000);

      expect(thought.type).toBe(ThoughtType.WORK);
      expect(thought.message).toBe('Working hard!');
      expect(thought.duration).toBe(3000);
    });

    test('should have priority based on type', () => {
      const hunger = new ThoughtBubble(ThoughtType.HUNGER, 'Hungry!');
      const happy = new ThoughtBubble(ThoughtType.HAPPY, 'Happy!');

      expect(hunger.priority).toBeGreaterThan(happy.priority);
    });

    test('should expire after duration', (done) => {
      const thought = new ThoughtBubble(ThoughtType.WORK, 'Test', 100);

      expect(thought.isExpired()).toBe(false);

      setTimeout(() => {
        expect(thought.isExpired()).toBe(true);
        done();
      }, 150);
    });

    test('should calculate remaining time', () => {
      const thought = new ThoughtBubble(ThoughtType.WORK, 'Test', 3000);

      const remaining = thought.getRemainingTime();
      expect(remaining).toBeGreaterThan(2900);
      expect(remaining).toBeLessThanOrEqual(3000);
    });

    test('should convert to render data', () => {
      const thought = new ThoughtBubble(ThoughtType.WORK, 'Working', 3000);
      const renderData = thought.toRenderData();

      expect(renderData.type).toBe(ThoughtType.WORK);
      expect(renderData.icon).toBeDefined();
      expect(renderData.message).toBe('Working');
      expect(renderData.priority).toBeDefined();
    });
  });

  describe('NPCVisualState', () => {
    test('should create visual state for NPC', () => {
      const visualState = new NPCVisualState('npc1');

      expect(visualState.npcId).toBe('npc1');
      expect(visualState.thoughts).toEqual([]);
      expect(visualState.isSelected).toBe(false);
    });

    test('should add thoughts and prioritize', () => {
      const visualState = new NPCVisualState('npc1');

      visualState.addThought(new ThoughtBubble(ThoughtType.WORK, 'Working'));
      visualState.addThought(new ThoughtBubble(ThoughtType.HUNGER, 'Hungry!'));

      const current = visualState.getCurrentThought();
      expect(current.type).toBe(ThoughtType.HUNGER); // Higher priority
    });

    test('should limit thoughts to top 3', () => {
      const visualState = new NPCVisualState('npc1');

      for (let i = 0; i < 5; i++) {
        visualState.addThought(new ThoughtBubble(ThoughtType.WORK, `Thought ${i}`));
      }

      expect(visualState.thoughts.length).toBeLessThanOrEqual(3);
    });

    test('should set and clear path preview', () => {
      const visualState = new NPCVisualState('npc1');
      const path = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }];

      visualState.setPathPreview(path);
      expect(visualState.pathPreview).toBe(path);

      visualState.clearPathPreview();
      expect(visualState.pathPreview).toBeNull();
    });

    test('should update command progress', () => {
      const visualState = new NPCVisualState('npc1');
      const progress = { type: 'MOVE_TO', progress: 0.5 };

      visualState.updateCommandProgress(progress);
      expect(visualState.commandProgress).toBe(progress);
    });

    test('should add status indicators', () => {
      const visualState = new NPCVisualState('npc1');

      visualState.addStatusIndicator('working', '⚒️');
      visualState.addStatusIndicator('resting', '💤');

      expect(visualState.statusIndicators.length).toBe(2);
    });
  });

  describe('NPCVisualFeedbackManager', () => {
    let manager;

    beforeEach(() => {
      manager = new NPCVisualFeedbackManager();
    });

    test('should create visual state on demand', () => {
      const visualState = manager.getVisualState('npc1');

      expect(visualState).toBeDefined();
      expect(visualState.npcId).toBe('npc1');
    });

    test('should add thoughts to NPCs', () => {
      manager.addThought('npc1', ThoughtType.WORK, 'Working hard!', 3000);

      const visualState = manager.getVisualState('npc1');
      const thought = visualState.getCurrentThought();

      expect(thought).toBeDefined();
      expect(thought.message).toBe('Working hard!');
    });

    test('should select and deselect NPCs', () => {
      manager.selectNPC('npc1');
      expect(manager.getSelectedNPC()).toBe('npc1');

      const visualState = manager.getVisualState('npc1');
      expect(visualState.isSelected).toBe(true);

      manager.selectNPC('npc2');
      expect(manager.getSelectedNPC()).toBe('npc2');
      expect(visualState.isSelected).toBe(false);
    });

    test('should set hovered NPC', () => {
      manager.setHoveredNPC('npc1');

      const visualState = manager.getVisualState('npc1');
      expect(visualState.isHovered).toBe(true);

      manager.setHoveredNPC(null);
      expect(visualState.isHovered).toBe(false);
    });

    test('should clear visual state', () => {
      manager.addThought('npc1', ThoughtType.WORK, 'Test');
      manager.clearNPCVisualState('npc1');

      expect(manager.npcVisualStates.has('npc1')).toBe(false);
    });

    test('should get all render data', () => {
      manager.addThought('npc1', ThoughtType.WORK, 'Test1');
      manager.addThought('npc2', ThoughtType.REST, 'Test2');

      const renderData = manager.getAllRenderData();

      expect(renderData.size).toBe(2);
      expect(renderData.has('npc1')).toBe(true);
      expect(renderData.has('npc2')).toBe(true);
    });
  });
});

describe('NPC Integration - Personality and Visual', () => {
  let npcManager;
  let gridManager;
  let townManager;

  beforeEach(() => {
    gridManager = new GridManager(10, 50);
    const buildingConfig = new BuildingConfig();
    townManager = new TownManager(buildingConfig);
    npcManager = new NPCManager(townManager, gridManager);
  });

  test('NPCs should have personalities', () => {
    const result = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npc = npcManager.getNPC(result.npcId);

    expect(npc.personality).toBeDefined();
    expect(npc.personality.traits).toBeDefined();
  });

  test('should process NPC interactions', () => {
    const npc1 = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npc2 = npcManager.spawnNPC('WORKER', { x: 0.5, y: 25, z: 0 }); // Nearby

    // Process interactions
    npcManager.processInteractions(1 / 60);

    // Relationships may or may not be created yet (probabilistic)
    // Just verify the system doesn't crash
    expect(npcManager.relationshipManager).toBeDefined();
  });

  test('should get nearby NPCs', () => {
    const npc1 = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npc2 = npcManager.spawnNPC('WORKER', { x: 1, y: 25, z: 1 });
    const npc3 = npcManager.spawnNPC('WORKER', { x: 10, y: 25, z: 10 }); // Far away

    const nearby = npcManager.getNearbyNPCs(npc1.npcId, 2.0);

    expect(nearby.length).toBe(1); // Only npc2 is nearby
  });

  test('should apply personality to work productivity', () => {
    const npc = npcManager.spawnNPC('CRAFTSMAN', { x: 0, y: 25, z: 0 });

    const baseProductivity = 100;
    const modified = npcManager.applyPersonalityToWork(npc.npcId, baseProductivity);

    expect(modified).toBeDefined();
    expect(modified).toBeGreaterThan(0);
  });

  test('should update NPC mood', () => {
    const npc = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npcObj = npcManager.getNPC(npc.npcId);

    npcObj.happiness = 80; // High happiness
    npcManager.updateNPCMood(npc.npcId);

    expect(npcObj.currentMood).toBeTruthy();
  });

  test('should create and manage visual feedback', () => {
    const npc = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });

    npcManager.addNPCThought(npc.npcId, ThoughtType.WORK, 'Testing!');

    const visualData = npcManager.getNPCVisualData(npc.npcId);
    expect(visualData).toBeDefined();
    expect(visualData.currentThought).toBeTruthy();
  });

  test('should handle NPC selection', () => {
    const npc = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });

    npcManager.selectNPC(npc.npcId);

    const selectionData = npcManager.getSelectionPanelData();
    expect(selectionData).toBeDefined();
    expect(selectionData.npc.id).toBe(npc.npcId);
    expect(selectionData.personality).toBeDefined();
  });

  test('should clear relationships on NPC death', () => {
    const npc1 = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npc2 = npcManager.spawnNPC('WORKER', { x: 1, y: 25, z: 1 });

    // Create relationship
    npcManager.relationshipManager.modifyRelationship(npc1.npcId, npc2.npcId, 50);

    // Kill NPC
    npcManager.killNPC(npc1.npcId);

    // Relationships should be cleared
    const relationships = npcManager.relationshipManager.getNPCRelationships(npc1.npcId);
    expect(relationships.length).toBe(0);
  });

  test('should clear visual state on NPC death', () => {
    const npc = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });

    npcManager.addNPCThought(npc.npcId, ThoughtType.WORK, 'Test');
    npcManager.killNPC(npc.npcId);

    expect(npcManager.visualFeedbackManager.npcVisualStates.has(npc.npcId)).toBe(false);
  });
});
