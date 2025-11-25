/**
 * App.jsx - Main React application entry point
 *
 * Sets up:
 * - TitleScreen (shown first)
 * - GameProvider (React Context for game state)
 * - GameScreen (Main UI component)
 * - Global styles
 */

import React, { useState } from 'react';
import { GameProvider } from './context/GameContext';
import { GameScreen } from './components';
import TitleScreen from './components/TitleScreen';
import './App.css';

/**
 * Main App Component
 * Shows title screen first, then game when user clicks start
 */
function App() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);

  const handleStartGame = () => {
    setShowTitleScreen(false);
  };

  if (showTitleScreen) {
    return <TitleScreen onStart={handleStartGame} />;
  }

  return (
    <GameProvider config={{ debounceInterval: 500 }}>
      <GameScreen />
    </GameProvider>
  );
}

export default App;
