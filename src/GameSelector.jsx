import React, { useState } from 'react';
import App from './App'; // 2D version
import App3D from './App3D'; // 3D version

/**
 * GameSelector - Choose between 2D and 3D versions
 */
const GameSelector = () => {
  const [mode, setMode] = useState(null);

  if (mode === '2d') {
    return <App />;
  }

  if (mode === '3d') {
    return <App3D />;
  }

  // Selection screen
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        Voxel RPG Game
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '3rem', opacity: 0.9 }}>
        Choose your version
      </p>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <button
          onClick={() => setMode('2d')}
          style={{
            padding: '2rem 3rem',
            fontSize: '1.5rem',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '15px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            e.target.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎮</div>
          <div>2D Canvas</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.5rem' }}>
            Original top-down view
          </div>
        </button>

        <button
          onClick={() => setMode('3d')}
          style={{
            padding: '2rem 3rem',
            fontSize: '1.5rem',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '15px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            e.target.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎯</div>
          <div>3D Voxel</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.5rem' }}>
            New 3D experience
          </div>
        </button>
      </div>

      <div style={{ marginTop: '3rem', fontSize: '0.9rem', opacity: 0.7 }}>
        Press ESC in-game to return to this menu
      </div>
    </div>
  );
};

export default GameSelector;
