/**
 * ModeManager.test.js - Tests for ModeManager class
 */
import ModeManager from '../ModeManager.js';
import UnifiedGameState from '../UnifiedGameState.js';

describe('ModeManager', () => {
  let modeManager, unifiedState, mockEngine, mockOrchestrator;

  beforeEach(() => {
    unifiedState = new UnifiedGameState();

    mockEngine = {
      pause: jest.fn(),
      resume: jest.fn()
    };

    mockOrchestrator = {
      getGameState: jest.fn(() => ({
        buildings: [],
        npcs: [],
        tick: 100
      }))
    };

    modeManager = new ModeManager(unifiedState, mockEngine, mockOrchestrator);
  });

  describe('initialization', () => {
    test('initializes with correct properties', () => {
      expect(modeManager.state).toBe(unifiedState);
      expect(modeManager.engine).toBe(mockEngine);
      expect(modeManager.orchestrator).toBe(mockOrchestrator);
      expect(modeManager.isTransitioning).toBe(false);
    });
  });

  describe('handler registration', () => {
    test('registers cleanup handler', () => {
      const handler = jest.fn();
      modeManager.registerCleanupHandler('settlement', handler);

      expect(modeManager.cleanupHandlers.get('settlement')).toBe(handler);
    });

    test('registers init handler', () => {
      const handler = jest.fn();
      modeManager.registerInitHandler('expedition', handler);

      expect(modeManager.initHandlers.get('expedition')).toBe(handler);
    });
  });

  describe('getCurrentMode', () => {
    test('returns current mode from state', () => {
      expect(modeManager.getCurrentMode()).toBe('settlement');
    });
  });

  describe('isInTransition', () => {
    test('returns transition status', () => {
      expect(modeManager.isInTransition()).toBe(false);

      modeManager.isTransitioning = true;
      expect(modeManager.isInTransition()).toBe(true);
    });
  });

  describe('switchMode validation', () => {
    test('prevents invalid mode', async () => {
      const result = await modeManager.switchMode('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid mode: invalid');
    });

    test('prevents switching to same mode', async () => {
      const result = await modeManager.switchMode('settlement');

      expect(result.success).toBe(true);
      expect(result.mode).toBe('settlement');
      expect(mockEngine.pause).not.toHaveBeenCalled();
    });

    test('prevents concurrent transitions', async () => {
      modeManager.isTransitioning = true;

      const result = await modeManager.switchMode('expedition', {
        expeditionHallId: 'hall1',
        party: ['npc1']
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transition already in progress');
    });
  });

  describe('transition validation', () => {
    test('settlement to expedition requires expedition hall', async () => {
      const result = await modeManager.switchMode('expedition', {
        party: ['npc1']
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Expedition Hall');
    });

    test('settlement to expedition requires party', async () => {
      const result = await modeManager.switchMode('expedition', {
        expeditionHallId: 'hall1',
        party: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Must have a party');
    });

    test('settlement to defense requires raid ID', async () => {
      const result = await modeManager.switchMode('defense');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active raid');
    });

    test('expedition to settlement requires completion', async () => {
      unifiedState._setMode('expedition');

      const result = await modeManager.switchMode('settlement');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not completed');
    });

    test('defense to settlement requires completion', async () => {
      unifiedState._setMode('defense');

      const result = await modeManager.switchMode('settlement');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not complete');
    });
  });

  describe('successful mode switch', () => {
    test('switches from settlement to expedition with valid context', async () => {
      const result = await modeManager.switchMode('expedition', {
        expeditionHallId: 'hall1',
        party: ['npc1', 'npc2']
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('expedition');
      expect(unifiedState.getCurrentMode()).toBe('expedition');
      expect(mockEngine.pause).toHaveBeenCalled();
      expect(mockEngine.resume).toHaveBeenCalled();
    });

    test('switches from expedition to settlement when completed', async () => {
      unifiedState._setMode('expedition');

      const result = await modeManager.switchMode('settlement', {
        completed: true
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('settlement');
      expect(unifiedState.getCurrentMode()).toBe('settlement');
    });

    test('switches from settlement to defense with raid', async () => {
      const result = await modeManager.switchMode('defense', {
        raidId: 'raid1'
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('defense');
      expect(unifiedState.getCurrentMode()).toBe('defense');
    });

    test('switches from defense to settlement when complete', async () => {
      unifiedState._setMode('defense');

      const result = await modeManager.switchMode('settlement', {
        defenseComplete: true
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('settlement');
    });
  });

  describe('cleanup and init handlers', () => {
    test('calls cleanup handler for current mode', async () => {
      const cleanupHandler = jest.fn();
      modeManager.registerCleanupHandler('settlement', cleanupHandler);

      await modeManager.switchMode('expedition', {
        expeditionHallId: 'hall1',
        party: ['npc1']
      });

      expect(cleanupHandler).toHaveBeenCalled();
    });

    test('calls init handler for new mode', async () => {
      const initHandler = jest.fn();
      modeManager.registerInitHandler('expedition', initHandler);

      await modeManager.switchMode('expedition', {
        expeditionHallId: 'hall1',
        party: ['npc1']
      });

      expect(initHandler).toHaveBeenCalledWith({
        expeditionHallId: 'hall1',
        party: ['npc1']
      });
    });

    test('saves settlement state before transition', async () => {
      await modeManager.switchMode('expedition', {
        expeditionHallId: 'hall1',
        party: ['npc1']
      });

      expect(mockOrchestrator.getGameState).toHaveBeenCalled();
      expect(unifiedState.settlementState.tick).toBe(100);
    });
  });

  describe('error handling', () => {
    test('resumes engine on error', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Init failed');
      });
      modeManager.registerInitHandler('expedition', errorHandler);

      const result = await modeManager.switchMode('expedition', {
        expeditionHallId: 'hall1',
        party: ['npc1']
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Init failed');
      expect(mockEngine.resume).toHaveBeenCalled();
      expect(modeManager.isTransitioning).toBe(false);
    });
  });
});
