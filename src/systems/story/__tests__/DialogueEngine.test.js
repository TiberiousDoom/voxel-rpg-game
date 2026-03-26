/**
 * DialogueEngine.test.js — Tests for branching dialogue system.
 */

import DialogueEngine from '../DialogueEngine';

const SAMPLE_TREE = {
  root: {
    speaker: 'Aria',
    text: 'Hello, traveler.',
    choices: [
      { id: 'ask', text: 'Who are you?', next: 'about' },
      { id: 'help', text: 'Let me help.', action: 'help_companion', requires: { food: true } },
      { id: 'bye', text: 'Goodbye.', action: 'close' },
    ],
  },
  about: {
    speaker: 'Aria',
    text: 'I am a scholar of the void.',
    choices: [
      { id: 'ok', text: 'Interesting.', action: 'close' },
    ],
  },
};

describe('DialogueEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new DialogueEngine();
  });

  test('starts dialogue at first node', () => {
    engine.startDialogue(SAMPLE_TREE);
    expect(engine.getSpeaker()).toBe('Aria');
    expect(engine.getText()).toBe('Hello, traveler.');
    expect(engine.isComplete()).toBe(false);
  });

  test('starts at specified node', () => {
    engine.startDialogue(SAMPLE_TREE, 'about');
    expect(engine.getText()).toBe('I am a scholar of the void.');
  });

  test('starts from single node (no tree wrapper)', () => {
    engine.startDialogue({ speaker: 'Test', text: 'Single node.' });
    expect(engine.getText()).toBe('Single node.');
  });

  test('getAvailableChoices returns all when no conditions', () => {
    engine.startDialogue(SAMPLE_TREE);
    const choices = engine.getAvailableChoices({});
    // 'help' requires food, so without food only 2 available
    expect(choices).toHaveLength(2);
    expect(choices.map(c => c.id)).toEqual(['ask', 'bye']);
  });

  test('getAvailableChoices includes conditional when met', () => {
    engine.startDialogue(SAMPLE_TREE);
    const choices = engine.getAvailableChoices({
      inventory: { materials: { berry: 5 } },
    });
    expect(choices).toHaveLength(3);
  });

  test('selectChoice advances to next node', () => {
    engine.startDialogue(SAMPLE_TREE);
    const result = engine.selectChoice('ask');
    expect(result.next).toBe('about');
    expect(engine.getText()).toBe('I am a scholar of the void.');
  });

  test('selectChoice with close action completes dialogue', () => {
    engine.startDialogue(SAMPLE_TREE);
    engine.selectChoice('bye');
    expect(engine.isComplete()).toBe(true);
  });

  test('selectChoice returns action name', () => {
    engine.startDialogue(SAMPLE_TREE);
    const result = engine.selectChoice('help');
    expect(result.action).toBe('help_companion');
  });

  test('getLastAction returns most recent action', () => {
    engine.startDialogue(SAMPLE_TREE);
    engine.selectChoice('help');
    expect(engine.getLastAction()).toBe('help_companion');
  });

  test('hasChoices returns true when choices exist', () => {
    engine.startDialogue(SAMPLE_TREE);
    expect(engine.hasChoices()).toBe(true);
  });

  test('advance works for nodes without choices', () => {
    const tree = {
      node1: { speaker: 'A', text: 'First.', next: 'node2' },
      node2: { speaker: 'A', text: 'Second.' },
    };
    engine.startDialogue(tree, 'node1');
    expect(engine.getText()).toBe('First.');
    engine.advance();
    expect(engine.getText()).toBe('Second.');
    engine.advance(); // No next, no choices — completes
    expect(engine.isComplete()).toBe(true);
  });

  test('getCurrentNode returns null when complete', () => {
    engine.startDialogue(SAMPLE_TREE);
    engine.selectChoice('bye');
    expect(engine.getCurrentNode()).toBeNull();
  });

  test('selectChoice with unknown id returns null', () => {
    engine.startDialogue(SAMPLE_TREE);
    expect(engine.selectChoice('nonexistent')).toBeNull();
  });

  test('bond level condition filters choices', () => {
    const tree = {
      root: {
        speaker: 'Test',
        text: 'Choose.',
        choices: [
          { id: 'basic', text: 'Basic.' },
          { id: 'advanced', text: 'Advanced.', requires: { bondLevel: 50 } },
        ],
      },
    };
    engine.startDialogue(tree);

    const low = engine.getAvailableChoices({ bondLevel: 20 });
    expect(low).toHaveLength(1);
    expect(low[0].id).toBe('basic');

    const high = engine.getAvailableChoices({ bondLevel: 60 });
    expect(high).toHaveLength(2);
  });
});
