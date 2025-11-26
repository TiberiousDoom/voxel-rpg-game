/**
 * App.jsx - Main React application entry point
 *
 * Sets up:
 * - TitleScreen (shown first)
 * - GameProvider (React Context for game state)
 * - GameScreen/GameScreenNew (Main UI component)
 * - UI toggle between legacy and new UI
 * - Global styles
 */

import React, { useState, useEffect } from 'react';
import { GameProvider } from './context/GameContext';
import { GameScreen, GameScreenNew } from './components';
import TitleScreen from './components/TitleScreen';
import './App.css';

// LocalStorage key for UI preference
const UI_PREFERENCE_KEY = 'voxel-rpg-use-new-ui';

/**
 * Main App Component
 * Shows title screen first, then game when user clicks start
 */
function App() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);

  // UI toggle state - defaults to new UI
  const [useNewUI, setUseNewUI] = useState(() => {
    const stored = localStorage.getItem(UI_PREFERENCE_KEY);
    // Default to new UI (true) if no preference stored
    return stored === null ? true : stored === 'true';
  });

  // Persist UI preference
  useEffect(() => {
    localStorage.setItem(UI_PREFERENCE_KEY, String(useNewUI));
  }, [useNewUI]);

  // Keyboard shortcut to toggle UI (Ctrl+Shift+U)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'U') {
        e.preventDefault();
        setUseNewUI(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartGame = () => {
    setShowTitleScreen(false);
  };

  if (showTitleScreen) {
    return <TitleScreen onStart={handleStartGame} />;
  }

  // Select which GameScreen to render
  const GameComponent = useNewUI ? GameScreenNew : GameScreen;

  return (
    <GameProvider config={{ debounceInterval: 500 }}>
      <GameComponent />

      {/* UI Toggle Indicator (dev helper) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            bottom: '70px',
            right: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            zIndex: 99999,
            pointerEvents: 'none',
            opacity: 0.7,
          }}
        >
          {useNewUI ? 'New UI' : 'Legacy UI'} (Ctrl+Shift+U to toggle)
        </div>
      )}
    </GameProvider>
  );
}

export default App;
