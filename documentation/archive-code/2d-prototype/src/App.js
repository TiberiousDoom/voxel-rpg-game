/**
 * App.js - Main React application entry point for Phase 1.3
 *
 * Sets up:
 * - GameProvider (React Context for game state)
 * - GameScreen (Main UI component)
 * - Global styles
 *
 * This is the 2D Canvas mode entry point.
 * The original 3D mode is in App3D.jsx
 */

import React from 'react';
import { GameProvider } from './context/GameContext';
import GameScreen from './components/GameScreen';
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
