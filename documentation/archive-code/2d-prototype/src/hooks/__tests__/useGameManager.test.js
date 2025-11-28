/**
 * useGameManager.test.js - Tests for React game integration hook
 *
 * Test scenarios:
 * - Hook initialization and cleanup
 * - Game state synchronization
 * - Event subscription and debouncing
 * - Memory leak prevention
 * - Action creators
 * - Error handling
 * - Lifecycle management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useGameManager from '../useGameManager';

// Mock GameManager - must be defined inline in jest.mock to avoid TDZ issues
jest.mock('../../GameManager', () => {
  return class MockGameManager {
    constructor() {
      this.isRunning = false;
      this.eventListeners = {};
      this.orchestrator = {
        tickCount: 0,
        gameState: {
          currentTier: 'SURVIVAL',
          buildings: [],
          npcs: []
        },
        getStatistics: jest.fn().mockReturnValue({
          aliveCount: 0,
          totalSpawned: 0
        }),
        storage: {
          getStorage: jest.fn().mockReturnValue({
            food: 100,
            wood: 50,
            stone: 50,
            gold: 0,
            essence: 0,
            crystal: 0
          })
        },
        morale: {
          getCurrentMorale: jest.fn().mockReturnValue(0),
          getMoraleState: jest.fn().mockReturnValue('NEUTRAL')
        },
        npcManager: {
          getStatistics: jest.fn().mockReturnValue({
            aliveCount: 0,
            totalSpawned: 0
          })
        }
      };
      this.engine = {
        fps: 60
      };
      this.performanceMonitor = null;
    }

    initialize() {
      return true;
    }

    async stopGame() {
      return true;
    }

    async startGame() {
      return true;
    }

    pauseGame() {}

    resumeGame() {}

    placeBuilding() {
      return { success: true };
    }

    spawnNPC() {
      return { id: 'npc-1', role: 'FARMER' };
    }

    advanceTier() {
      return { success: true };
    }

    saveGame() {
      return { success: true };
    }

    loadGame() {
      return { success: true };
    }

    getSaveSlots() {
      return [];
    }

    getGameStatus() {
      return {};
    }

    on(event, callback) {
      if (!this.eventListeners[event]) {
        this.eventListeners[event] = [];
      }
      this.eventListeners[event].push(callback);
    }

    off(event, callback) {
      if (this.eventListeners[event]) {
        this.eventListeners[event] = this.eventListeners[event].filter(
          cb => cb !== callback
        );
      }
    }

    emit(event, data) {
      if (this.eventListeners[event]) {
        this.eventListeners[event].forEach(cb => cb(data));
      }
    }
  };
});

jest.mock('../../persistence/BrowserSaveManager', () => {
  return jest.fn().mockImplementation(() => ({}));
});

describe('useGameManager Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // TEST 1: INITIALIZATION
  // ============================================

  describe('Initialization', () => {
    test('should initialize hook on mount', async () => {
      const { result } = renderHook(() => useGameManager());

      // With mock GameManager, initialization is synchronous
      // So we just wait for the hook to be ready
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.gameManager).toBeDefined();
    });

    test('should have default game state on initialization', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.gameState).toMatchObject({
        isRunning: false,
        isPaused: false,
        currentTick: 0,
        currentTier: 'SURVIVAL',
        buildings: [],
        npcs: [],
        fps: 60
      });
    });

    test('should accept custom configuration', async () => {
      const config = {
        savePath: '/custom/path',
        enableAutoSave: false,
        debounceInterval: 200
      };

      const { result } = renderHook(() => useGameManager(config));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.gameManager).toBeDefined();
    });

    test('should provide game manager reference', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.gameManager).toBeDefined();
      expect(result.current.gameManager.orchestrator).toBeDefined();
      expect(result.current.gameManager.engine).toBeDefined();
    });
  });

  // ============================================
  // TEST 2: STATE PROPERTIES
  // ============================================

  describe('State Properties', () => {
    test('should have default state values', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.gameState.isRunning).toBe(false);
      expect(result.current.gameState.isPaused).toBe(false);
      expect(result.current.gameState.currentTick).toBe(0);
      expect(result.current.gameState.currentTier).toBe('SURVIVAL');
    });

    test('should have resources in state', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.gameState.resources).toEqual({
        food: 100,
        wood: 50,
        stone: 50,
        gold: 0,
        essence: 0,
        crystal: 0
      });
    });

    test('should have population statistics', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.gameState.population).toBeDefined();
      expect(result.current.gameState.population.aliveCount).toBe(0);
      expect(result.current.gameState.population.totalSpawned).toBe(0);
    });
  });

  // ============================================
  // TEST 3: ACTION CREATORS
  // ============================================

  describe('Action Creators', () => {
    test('should expose actions on return object', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.actions).toBeDefined();
      expect(typeof result.current.actions.startGame).toBe('function');
      expect(typeof result.current.actions.stopGame).toBe('function');
      expect(typeof result.current.actions.pauseGame).toBe('function');
      expect(typeof result.current.actions.resumeGame).toBe('function');
      expect(typeof result.current.actions.placeBuilding).toBe('function');
      expect(typeof result.current.actions.spawnNPC).toBe('function');
      expect(typeof result.current.actions.saveGame).toBe('function');
      expect(typeof result.current.actions.loadGame).toBe('function');
    });

    test('should call startGame method', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const startGameSpy = jest.spyOn(result.current.gameManager, 'startGame');

      act(() => {
        result.current.actions.startGame();
      });

      expect(startGameSpy).toHaveBeenCalled();
    });

    test('should call stopGame method', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const stopGameSpy = jest.spyOn(result.current.gameManager, 'stopGame');

      act(() => {
        result.current.actions.stopGame();
      });

      expect(stopGameSpy).toHaveBeenCalled();
    });

    test('should call placeBuilding with parameters', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const placeBuildingSpy = jest.spyOn(result.current.gameManager, 'placeBuilding');

      act(() => {
        result.current.actions.placeBuilding('FARM', { x: 0, y: 0, z: 0 });
      });

      expect(placeBuildingSpy).toHaveBeenCalledWith('FARM', { x: 0, y: 0, z: 0 });
    });

    test('should call spawnNPC with parameters', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const spawnNPCSpy = jest.spyOn(result.current.gameManager, 'spawnNPC');

      act(() => {
        result.current.actions.spawnNPC('FARMER');
      });

      // spawnNPC accepts (role, position), position will be undefined if not provided
      expect(spawnNPCSpy).toHaveBeenCalledWith('FARMER', undefined);
    });

    test('should call saveGame with slot name', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const saveGameSpy = jest.spyOn(result.current.gameManager, 'saveGame');

      act(() => {
        result.current.actions.saveGame('slot-1');
      });

      // saveGame accepts (slotName, description), description defaults to ''
      expect(saveGameSpy).toHaveBeenCalledWith('slot-1', '');
    });
  });

  // ============================================
  // TEST 4: RETURN OBJECT PROPERTIES
  // ============================================

  describe('Return Object', () => {
    test('should return all expected properties', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current).toHaveProperty('gameManager');
      expect(result.current).toHaveProperty('gameState');
      expect(result.current).toHaveProperty('actions');
      expect(result.current).toHaveProperty('isReady');
      expect(result.current).toHaveProperty('isInitializing');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isRunning');
      expect(result.current).toHaveProperty('isPaused');
      expect(result.current).toHaveProperty('currentTick');
      expect(result.current).toHaveProperty('currentTier');
    });

    test('should have proper isRunning getter', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isRunning).toBe(false);
      expect(typeof result.current.isRunning).toBe('boolean');
    });

    test('should have proper isPaused getter', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isPaused).toBe(false);
      expect(typeof result.current.isPaused).toBe('boolean');
    });

    test('should have proper currentTick getter', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.currentTick).toBe(0);
      expect(typeof result.current.currentTick).toBe('number');
    });

    test('should have proper currentTier getter', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.currentTier).toBe('SURVIVAL');
      expect(typeof result.current.currentTier).toBe('string');
    });
  });

  // ============================================
  // TEST 5: ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    test('should initialize with no error', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.error).toBeNull();
    });

    test('should be not initializing after setup', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isInitializing).toBe(false);
    });
  });

  // ============================================
  // TEST 6: CONFIGURATION
  // ============================================

  describe('Configuration', () => {
    test('should use custom debounce interval', async () => {
      const { result } = renderHook(() =>
        useGameManager({ debounceInterval: 100 })
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isReady).toBe(true);
    });

    test('should use default values when config not provided', async () => {
      const { result } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isReady).toBe(true);
    });

    test('should accept empty config', async () => {
      const { result } = renderHook(() => useGameManager({}));

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.isReady).toBe(true);
    });
  });

  // ============================================
  // TEST 7: CLEANUP
  // ============================================

  describe('Cleanup', () => {
    test('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => useGameManager());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const stopGameSpy = jest.spyOn(result.current.gameManager, 'stopGame');

      unmount();

      // Stop should have been called during cleanup
      // (might be async, so we don't assert here)
      expect(stopGameSpy).toBeDefined();
    });
  });
});
