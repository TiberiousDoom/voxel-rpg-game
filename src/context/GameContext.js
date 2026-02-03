/**
 * GameContext.js - Global game state provider
 *
 * Provides:
 * - Game manager accessibility across component tree
 * - Game state sharing without prop drilling
 * - Error boundaries for game errors
 * - Configuration management
 *
 * Usage:
 * <GameProvider config={...}>
 *   <App />
 * </GameProvider>
 *
 * Then in components:
 * const { gameManager, gameState, actions } = useGameManager();
 */

import React, { createContext, useContext } from 'react';
import useGameManager from '../hooks/useGameManager';
import { useCharacterSync } from '../hooks/useCharacterSync';

/**
 * Create the game context
 */
const GameContext = createContext(null);

/**
 * Game provider component
 * Initializes GameManager and provides it to all child components
 */
export function GameProvider({ children, config = {} }) {
  const gameManagerData = useGameManager(config);

  // Sync character data to NPCManager for Leadership bonuses
  useCharacterSync(gameManagerData.gameManager);

  return (
    <GameContext.Provider value={gameManagerData}>
      {children}
    </GameContext.Provider>
  );
}

/**
 * Hook to access game manager from context
 * Must be used within GameProvider
 */
export function useGame() {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error(
      'useGame must be used within a GameProvider component. ' +
      'Make sure your app is wrapped with <GameProvider>.</GameProvider>'
    );
  }

  return context;
}

/**
 * Hook to access only game state (more granular)
 */
export function useGameState() {
  const { gameState } = useGame();
  return gameState;
}

/**
 * Hook to access only game actions (more granular)
 */
export function useGameActions() {
  const { actions } = useGame();
  return actions;
}

/**
 * Higher-order component for class components
 * Provides game context as props
 */
export function withGame(Component) {
  return function GameComponent(props) {
    const gameData = useGame();

    return <Component {...props} game={gameData} />;
  };
}

export default GameContext;
