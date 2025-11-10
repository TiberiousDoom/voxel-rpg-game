/**
 * useGameManager.js - React hook for game engine integration
 *
 * Provides:
 * - GameManager initialization (once per component tree)
 * - Game state synchronization with React
 * - Event subscription and cleanup
 * - Debounced state updates (prevents excessive re-renders)
 * - Error handling and recovery
 * - Action API for game operations
 *
 * Usage:
 * const { gameManager, gameState, actions, isReady, error } = useGameManager(config);
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import GameManager from '../GameManager';
import BrowserSaveManager from '../persistence/BrowserSaveManager';

/**
 * Default game state structure
 */
const DEFAULT_GAME_STATE = {
  isRunning: false,
  isPaused: false,
  currentTick: 0,
  currentTier: 'SURVIVAL',
  buildings: [],
  npcs: [],
  resources: {
    food: 100,
    wood: 50,
    stone: 50,
    gold: 0,
    essence: 0,
    crystal: 0
  },
  morale: 0,
  moraleState: 'NEUTRAL',
  population: {
    aliveCount: 0,
    totalSpawned: 0
  },
  fps: 60,
  ticksElapsed: 0
};

/**
 * useGameManager - Main game integration hook
 * @param {Object} config - Configuration options
 * @returns {Object} Game manager, state, and actions
 */
export function useGameManager(config = {}) {
  // Refs (persist across renders without causing re-renders)
  const gameManagerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const stateUpdateQueueRef = useRef(null);

  // State (causes re-renders when updated)
  const [gameState, setGameState] = useState(DEFAULT_GAME_STATE);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Configuration with defaults
  const options = {
    savePath: config.savePath || 'voxel-rpg-saves',
    enableAutoSave: config.enableAutoSave !== false,
    autoSaveInterval: config.autoSaveInterval || 300, // 5 minutes
    enablePerformanceMonitoring: config.enablePerformanceMonitoring !== false,
    enableErrorRecovery: config.enableErrorRecovery !== false,
    debounceInterval: config.debounceInterval || 500, // 500ms update throttle
    ...config
  };

  /**
   * Queue a state update and debounce the actual React setState
   * This prevents excessive re-renders from high-frequency game events
   */
  const queueStateUpdate = useCallback((updates) => {
    // Merge with queued updates
    stateUpdateQueueRef.current = {
      ...stateUpdateQueueRef.current,
      ...updates
    };

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      if (stateUpdateQueueRef.current) {
        setGameState(prev => ({
          ...prev,
          ...stateUpdateQueueRef.current
        }));
        stateUpdateQueueRef.current = null;
      }
      debounceTimerRef.current = null;
    }, options.debounceInterval);
  }, [options.debounceInterval]);

  /**
   * Initialize GameManager and set up event listeners
   * Runs only once on component mount
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const initializeGameManager = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // eslint-disable-next-line no-console
        console.log('useGameManager: Starting initialization...');

        // Create GameManager with browser-compatible SaveManager
        const gm = new GameManager({
          ...options,
          // Force browser save manager
          SaveManager: BrowserSaveManager
        });

        // eslint-disable-next-line no-console
        console.log('useGameManager: GameManager instance created');

        // Initialize all systems
        const initSuccess = gm.initialize();
        // eslint-disable-next-line no-console
        console.log('useGameManager: Initialize result:', initSuccess);

        if (!initSuccess) {
          throw new Error('Failed to initialize GameManager');
        }

        // eslint-disable-next-line no-console
        console.log('useGameManager: GameManager initialized successfully');

        gameManagerRef.current = gm;

        // ============================================
        // Subscribe to game events
        // ============================================

        gm.on('game:initialized', () => {
          queueStateUpdate({
            isRunning: false,
            isPaused: false
          });
        });

        gm.on('game:started', (data) => {
          queueStateUpdate({
            isRunning: true,
            isPaused: false,
            currentTick: data.tick || 0
          });
        });

        gm.on('game:stopped', (data) => {
          queueStateUpdate({
            isRunning: false,
            currentTick: data.tick || gameState.currentTick
          });
        });

        gm.on('game:paused', () => {
          queueStateUpdate({
            isPaused: true
          });
        });

        gm.on('game:resumed', () => {
          queueStateUpdate({
            isPaused: false
          });
        });

        // Main game tick - update core game state
        gm.on('tick:complete', (tickData) => {
          const orchestrator = gm.orchestrator;
          const stats = orchestrator?.getStatistics();

          if (stats) {
            queueStateUpdate({
              currentTick: orchestrator.tickCount,
              currentTier: orchestrator.gameState.currentTier,
              buildings: orchestrator.gameState.buildings?.map(b => ({
                id: b.id,
                type: b.type,
                position: b.position
              })) || [],
              resources: orchestrator.storage?.getStorage?.() || {},
              morale: orchestrator.morale?.getCurrentMorale?.() || 0,
              moraleState: orchestrator.morale?.getMoraleState?.() || 'NEUTRAL',
              population: orchestrator.npcManager?.getStatistics?.() || {}
            });
          }
        });

        gm.on('building:placed', (data) => {
          // eslint-disable-next-line no-console
          console.log('Building placed:', data.buildingId);

          // Update React state immediately (don't wait for tick)
          queueStateUpdate({
            buildings: gm.orchestrator.gameState.buildings?.map(b => ({
              id: b.id,
              type: b.type,
              position: b.position
            })) || []
          });
        });

        gm.on('npc:spawned', (data) => {
          // eslint-disable-next-line no-console
          console.log('NPC spawned:', data.npc.id);

          // Update React state immediately (don't wait for tick)
          queueStateUpdate({
            npcs: gm.orchestrator.gameState.npcs || [],
            population: gm.orchestrator.npcManager?.getStatistics() || {}
          });
        });

        gm.on('tier:advanced', (data) => {
          queueStateUpdate({
            currentTier: data.tier
          });
        });

        gm.on('game:saved', (data) => {
          // eslint-disable-next-line no-console
          console.log('Game saved:', data.slot);
        });

        gm.on('game:loaded', (data) => {
          // eslint-disable-next-line no-console
          console.log('Game loaded:', data.slot);
          // State will be updated on next tick:complete
        });

        gm.on('game:error', (data) => {
          // eslint-disable-next-line no-console
          console.error('Game error:', data.error);
          setError(data.error);
        });

        // Performance monitoring if enabled
        if (options.enablePerformanceMonitoring && gm.performanceMonitor) {
          gm.on('tick:complete', (tickData) => {
            const monitor = gm.performanceMonitor;
            if (monitor && tickData.tickTimeMs) {
              queueStateUpdate({
                fps: (gm.engine?.fps || 60).toFixed(1)
              });
            }
          });
        }

        setIsReady(true);
        setIsInitializing(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize GameManager:', err);
        setError(err.message);
        setIsInitializing(false);
      }
    };

    initializeGameManager();

    // ============================================
    // Cleanup on unmount
    // ============================================
    return () => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Stop game if running
      if (gameManagerRef.current?.isRunning) {
        gameManagerRef.current.stopGame().catch(err => {
          // eslint-disable-next-line no-console
          console.error('Error stopping game:', err);
        });
      }

      // Remove all event listeners
      if (gameManagerRef.current) {
        // GameManager should clean up its own listeners
        // but we can't explicitly remove them without exposing internal API
        gameManagerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only on mount

  /**
   * Action creators - functions to trigger game operations
   */
  const actions = {
    /**
     * Start or resume the game
     */
    startGame: useCallback(
      async (saveSlot = null) => {
        try {
          setError(null);
          if (gameManagerRef.current) {
            const success = await gameManagerRef.current.startGame(saveSlot);
            if (!success) {
              setError('Failed to start game');
            }
            return success;
          }
          return false;
        } catch (err) {
          setError(err.message);
          return false;
        }
      },
      []
    ),

    /**
     * Stop the game
     */
    stopGame: useCallback(
      async () => {
        try {
          setError(null);
          if (gameManagerRef.current) {
            const success = await gameManagerRef.current.stopGame();
            if (!success) {
              setError('Failed to stop game');
            }
            return success;
          }
          return false;
        } catch (err) {
          setError(err.message);
          return false;
        }
      },
      []
    ),

    /**
     * Pause the game
     */
    pauseGame: useCallback(() => {
      try {
        setError(null);
        if (gameManagerRef.current) {
          gameManagerRef.current.pauseGame();
          return true;
        }
        return false;
      } catch (err) {
        setError(err.message);
        return false;
      }
    }, []),

    /**
     * Resume the game
     */
    resumeGame: useCallback(() => {
      try {
        setError(null);
        if (gameManagerRef.current) {
          gameManagerRef.current.resumeGame();
          return true;
        }
        return false;
      } catch (err) {
        setError(err.message);
        return false;
      }
    }, []),

    /**
     * Place a building
     */
    placeBuilding: useCallback(
      (buildingType, position) => {
        try {
          setError(null);
          if (gameManagerRef.current) {
            const result = gameManagerRef.current.placeBuilding(buildingType, position);
            if (!result.success) {
              setError(result.message);
            }
            return result;
          }
          return { success: false, message: 'Game not initialized' };
        } catch (err) {
          setError(err.message);
          return { success: false, message: err.message };
        }
      },
      []
    ),

    /**
     * Spawn an NPC
     */
    spawnNPC: useCallback(
      (role, position) => {
        try {
          setError(null);
          if (gameManagerRef.current) {
            const npc = gameManagerRef.current.spawnNPC(role, position);
            if (npc.error) {
              setError(npc.error);
            }
            return npc;
          }
          return { error: 'Game not initialized' };
        } catch (err) {
          setError(err.message);
          return { error: err.message };
        }
      },
      []
    ),

    /**
     * Advance to next tier
     */
    advanceTier: useCallback(
      (targetTier) => {
        try {
          setError(null);
          if (gameManagerRef.current) {
            const result = gameManagerRef.current.advanceTier(targetTier);
            if (!result.success) {
              setError(result.reason);
            }
            return result;
          }
          return { success: false };
        } catch (err) {
          setError(err.message);
          return { success: false };
        }
      },
      []
    ),

    /**
     * Save the game
     */
    saveGame: useCallback(
      (slotName = 'autosave', description = '') => {
        try {
          setError(null);
          if (gameManagerRef.current) {
            const result = gameManagerRef.current.saveGame(slotName, description);
            if (!result.success) {
              setError(result.message);
            }
            return result;
          }
          return { success: false, message: 'Game not initialized' };
        } catch (err) {
          setError(err.message);
          return { success: false, message: err.message };
        }
      },
      []
    ),

    /**
     * Load a saved game
     */
    loadGame: useCallback(
      (slotName) => {
        try {
          setError(null);
          if (gameManagerRef.current) {
            const result = gameManagerRef.current.loadGame(slotName);
            if (!result.success) {
              setError(result.message);
            }
            return result;
          }
          return { success: false, message: 'Game not initialized' };
        } catch (err) {
          setError(err.message);
          return { success: false, message: err.message };
        }
      },
      []
    ),

    /**
     * Get available save slots
     */
    getSaveSlots: useCallback(() => {
      try {
        setError(null);
        if (gameManagerRef.current) {
          return gameManagerRef.current.getSaveSlots();
        }
        return [];
      } catch (err) {
        setError(err.message);
        return [];
      }
    }, []),

    /**
     * Get game status
     */
    getStatus: useCallback(() => {
      try {
        setError(null);
        if (gameManagerRef.current) {
          return gameManagerRef.current.getGameStatus();
        }
        return null;
      } catch (err) {
        setError(err.message);
        return null;
      }
    }, [])
  };

  return {
    // Game manager reference (for advanced usage)
    gameManager: gameManagerRef.current,

    // Game state (reactive, updates trigger re-renders)
    gameState,

    // Action creators (methods to control the game)
    actions,

    // Loading/error states
    isReady,
    isInitializing,
    error,

    // Game properties (derived from gameManager)
    isRunning: gameState.isRunning,
    isPaused: gameState.isPaused,
    currentTick: gameState.currentTick,
    currentTier: gameState.currentTier
  };
}

export default useGameManager;
