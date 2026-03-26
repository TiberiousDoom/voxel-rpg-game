/**
 * CompanionStoryManager.test.js — Tests for companion discovery and bond milestones.
 */

vi.mock('../../../config/dialogue/companion-dialogue.json', () => ({
  default: {
    discovery: { speaker: 'Wounded Mage', text: 'Help me...' },
    bond_30: { speaker: 'Aria', text: 'Feeling stronger.' },
    bond_50: { speaker: 'Aria', text: 'Learn Frost Nova.' },
    bond_80: { speaker: 'Aria', text: 'The rifts were opened.' },
  },
}));

import CompanionStoryManager from '../CompanionStoryManager';

function makeStore(overrides = {}) {
  return {
    inventory: { materials: { berry: 5, meat: 3 } },
    companion: { active: false, bondLevel: 0 },
    setCompanionState: vi.fn(),
    removeMaterial: vi.fn(),
    unlockSpell: vi.fn(),
    ...overrides,
  };
}

describe('CompanionStoryManager', () => {
  let manager;

  beforeEach(() => {
    manager = new CompanionStoryManager();
    manager.initialize([0, 0, 0]);
  });

  describe('initialize', () => {
    test('sets story rift position offset from spawn', () => {
      expect(manager.storyRiftPosition).toBeDefined();
      expect(manager.storyRiftPosition[0]).toBe(120);
      expect(manager.storyRiftPosition[2]).toBe(80);
    });
  });

  describe('checkDiscovery', () => {
    test('returns true when player is near story rift', () => {
      expect(manager.checkDiscovery([120, 0, 80])).toBe(true);
    });

    test('returns false when player is far from story rift', () => {
      expect(manager.checkDiscovery([0, 0, 0])).toBe(false);
    });

    test('returns false after already discovered', () => {
      manager.discovered = true;
      expect(manager.checkDiscovery([120, 0, 80])).toBe(false);
    });
  });

  describe('helpCompanion', () => {
    test('activates companion and consumes food', () => {
      const store = makeStore();
      expect(manager.helpCompanion(store)).toBe(true);
      expect(store.removeMaterial).toHaveBeenCalledWith('berry', 1);
      expect(store.setCompanionState).toHaveBeenCalledWith(
        expect.objectContaining({
          active: true,
          type: 'MAGE',
          name: 'Aria',
          health: 25,
          bondLevel: 10,
        })
      );
      expect(manager.helped).toBe(true);
    });

    test('falls back to meat if no berries', () => {
      const store = makeStore({
        inventory: { materials: { berry: 0, meat: 2 } },
      });
      manager.helpCompanion(store);
      expect(store.removeMaterial).toHaveBeenCalledWith('meat', 1);
    });

    test('returns false if no food available', () => {
      const store = makeStore({
        inventory: { materials: {} },
      });
      expect(manager.helpCompanion(store)).toBe(false);
    });

    test('returns false if already helped', () => {
      const store = makeStore();
      manager.helped = true;
      expect(manager.helpCompanion(store)).toBe(false);
    });
  });

  describe('checkMilestones', () => {
    test('triggers bond30 milestone', () => {
      const store = makeStore({
        companion: { active: true, bondLevel: 30 },
      });
      const result = manager.checkMilestones(store);
      expect(result).not.toBeNull();
      expect(result.milestone).toBe('bond30');
      expect(manager.milestones.bond30).toBe(true);
    });

    test('unlocks frostNova at bond50', () => {
      const store = makeStore({
        companion: { active: true, bondLevel: 50 },
      });
      manager.milestones.bond30 = true; // Already triggered
      const result = manager.checkMilestones(store);
      expect(result.milestone).toBe('bond50');
      expect(store.unlockSpell).toHaveBeenCalledWith('frostNova');
    });

    test('unlocks arcaneBarrage at bond80', () => {
      const store = makeStore({
        companion: { active: true, bondLevel: 80 },
      });
      manager.milestones.bond30 = true;
      manager.milestones.bond50 = true;
      const result = manager.checkMilestones(store);
      expect(result.milestone).toBe('bond80');
      expect(store.unlockSpell).toHaveBeenCalledWith('arcaneBarrage');
    });

    test('returns null when no new milestones', () => {
      const store = makeStore({
        companion: { active: true, bondLevel: 20 },
      });
      expect(manager.checkMilestones(store)).toBeNull();
    });

    test('does not re-trigger milestones', () => {
      const store = makeStore({
        companion: { active: true, bondLevel: 50 },
      });
      manager.milestones.bond30 = true;
      manager.milestones.bond50 = true;
      expect(manager.checkMilestones(store)).toBeNull();
    });
  });

  describe('serialization', () => {
    test('serialize and deserialize roundtrip', () => {
      manager.discovered = true;
      manager.helped = true;
      manager.milestones.bond30 = true;
      manager.milestones.bond50 = true;

      const data = manager.serialize();
      const manager2 = new CompanionStoryManager();
      manager2.deserialize(data);

      expect(manager2.discovered).toBe(true);
      expect(manager2.helped).toBe(true);
      expect(manager2.milestones.bond30).toBe(true);
      expect(manager2.milestones.bond50).toBe(true);
      expect(manager2.milestones.bond80).toBe(false);
    });

    test('handles null deserialization', () => {
      manager.deserialize(null);
      expect(manager.discovered).toBe(false);
    });
  });

  describe('getDialogue', () => {
    test('returns dialogue for known node', () => {
      const d = manager.getDialogue('bond_50');
      expect(d).not.toBeNull();
      expect(d.speaker).toBe('Aria');
    });

    test('returns null for unknown node', () => {
      expect(manager.getDialogue('nonexistent')).toBeNull();
    });

    test('getDiscoveryDialogue returns discovery node', () => {
      expect(manager.getDiscoveryDialogue()).not.toBeNull();
      expect(manager.getDiscoveryDialogue().speaker).toBe('Wounded Mage');
    });
  });
});
