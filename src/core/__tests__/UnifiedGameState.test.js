/**
 * UnifiedGameState.test.js - Tests for UnifiedGameState class
 */
import UnifiedGameState from '../UnifiedGameState.js';

describe('UnifiedGameState', () => {
  let state;

  beforeEach(() => {
    state = new UnifiedGameState();
  });

  describe('initialization', () => {
    test('initializes with default values', () => {
      expect(state.getCurrentMode()).toBe('settlement');
      expect(state.sharedResources.gold).toBe(0);
      expect(state.sharedResources.wood).toBe(0);
      expect(state.sharedResources.stone).toBe(0);
      expect(state.sharedInventory.equipment).toEqual([]);
      expect(state.expeditionState).toBeNull();
      expect(state.defenseState).toBeNull();
    });

    test('initializes settlementState', () => {
      expect(state.settlementState).toBeDefined();
      expect(state.settlementState.buildings).toEqual([]);
      expect(state.settlementState.npcs).toEqual([]);
      expect(state.settlementState.tick).toBe(0);
    });
  });

  describe('getCurrentMode', () => {
    test('returns current mode', () => {
      expect(state.getCurrentMode()).toBe('settlement');
    });
  });

  describe('_setMode', () => {
    test('sets valid mode', () => {
      state._setMode('expedition');
      expect(state.getCurrentMode()).toBe('expedition');

      state._setMode('defense');
      expect(state.getCurrentMode()).toBe('defense');

      state._setMode('settlement');
      expect(state.getCurrentMode()).toBe('settlement');
    });

    test('throws error for invalid mode', () => {
      expect(() => state._setMode('invalid')).toThrow('Invalid mode: invalid');
    });
  });

  describe('serialize', () => {
    test('serializes all state', () => {
      state.sharedResources.gold = 100;
      state.sharedInventory.equipment.push({ name: 'Sword' });

      const serialized = state.serialize();

      expect(serialized.currentMode).toBe('settlement');
      expect(serialized.sharedResources.gold).toBe(100);
      expect(serialized.sharedInventory.equipment).toHaveLength(1);
      expect(serialized.sharedInventory.equipment[0].name).toBe('Sword');
    });

    test('creates deep copies', () => {
      state.sharedResources.gold = 50;
      const serialized = state.serialize();

      // Modify original
      state.sharedResources.gold = 100;

      // Serialized should not change
      expect(serialized.sharedResources.gold).toBe(50);
    });

    test('handles null expedition and defense states', () => {
      const serialized = state.serialize();

      expect(serialized.expeditionState).toBeNull();
      expect(serialized.defenseState).toBeNull();
    });

    test('serializes expedition state when present', () => {
      state.expeditionState = { id: 'exp1', difficulty: 2 };

      const serialized = state.serialize();

      expect(serialized.expeditionState).toBeDefined();
      expect(serialized.expeditionState.id).toBe('exp1');
    });
  });

  describe('deserialize', () => {
    test('deserializes state correctly', () => {
      const data = {
        currentMode: 'expedition',
        sharedResources: { gold: 200, wood: 50 },
        sharedInventory: {
          equipment: [{ name: 'Axe' }],
          consumables: [],
          materials: []
        },
        expeditionState: { id: 'exp1' },
        defenseState: null,
        settlementState: { tick: 100 }
      };

      state.deserialize(data);

      expect(state.getCurrentMode()).toBe('expedition');
      expect(state.sharedResources.gold).toBe(200);
      expect(state.sharedInventory.equipment[0].name).toBe('Axe');
      expect(state.expeditionState.id).toBe('exp1');
      expect(state.settlementState.tick).toBe(100);
    });

    test('handles missing data with defaults', () => {
      state.deserialize({});

      expect(state.getCurrentMode()).toBe('settlement');
      expect(state.sharedResources).toEqual({});
      expect(state.expeditionState).toBeNull();
    });

    test('round-trip serialize/deserialize', () => {
      state.sharedResources.gold = 300;
      state.sharedInventory.equipment.push({ name: 'Shield' });
      state._setMode('defense');

      const serialized = state.serialize();
      const newState = new UnifiedGameState();
      newState.deserialize(serialized);

      expect(newState.getCurrentMode()).toBe('defense');
      expect(newState.sharedResources.gold).toBe(300);
      expect(newState.sharedInventory.equipment[0].name).toBe('Shield');
    });
  });

  describe('validate', () => {
    test('validates correct state', () => {
      const result = state.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('detects invalid mode', () => {
      state.currentMode = 'invalid';

      const result = state.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid mode: invalid');
    });

    test('detects invalid resource amounts', () => {
      state.sharedResources.gold = -10;

      const result = state.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid resource gold'))).toBe(true);
    });

    test('detects non-number resources', () => {
      state.sharedResources.wood = 'many';

      const result = state.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid resource wood'))).toBe(true);
    });

    test('detects invalid inventory structure', () => {
      state.sharedInventory.equipment = 'not an array';

      const result = state.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Equipment must be an array');
    });

    test('detects multiple errors', () => {
      state.currentMode = 'bad';
      state.sharedResources.gold = -50;
      state.sharedInventory.consumables = null;

      const result = state.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
