/**
 * App.jsx - Main React application entry point
 *
 * Sets up:
 * - TitleScreen (shown first)
 * - GameProvider (React Context for game state)
 * - GameScreenNew (Main UI component with new design system)
 * - Global styles
 */

import React, { useState } from 'react';
import { GameProvider } from './context/GameContext';
import { GameScreenNew } from './components';
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
      <GameScreenNew />
    </GameProvider>
  );
}

export default App;
