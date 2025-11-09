/**
 * App.jsx - Main React application entry point
 *
 * Sets up:
 * - GameProvider (React Context for game state)
 * - GameScreen (Main UI component)
 * - Global styles
 */

import React from 'react';
import { GameProvider } from './context/GameContext';
import { GameScreen } from './components';
import './App.css';

/**
 * Main App Component
 * Wraps the entire game in GameProvider context
 */
function App() {
  return (
    <GameProvider config={{ debounceInterval: 500 }}>
      <GameScreen />
    </GameProvider>
  );
}

export default App;
