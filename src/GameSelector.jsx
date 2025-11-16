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
        background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{
        fontSize: 'clamp(1.5rem, 8vw, 3rem)',
        marginBottom: '1rem',
        textAlign: 'center',
        padding: '0 1rem'
      }}>
        Voxel RPG Game
      </h1>
      <p style={{
        fontSize: 'clamp(0.9rem, 4vw, 1.2rem)',
        marginBottom: '2rem',
        opacity: 0.9,
        textAlign: 'center',
        padding: '0 1rem'
      }}>
        Choose your version
      </p>

      <div style={{
        display: 'flex',
        gap: '1rem',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '0 1rem',
        maxWidth: '100%'
      }}>
        <button
          onClick={() => setMode('2d')}
          style={{
            padding: 'clamp(1rem, 4vw, 2rem) clamp(1.5rem, 6vw, 3rem)',
            fontSize: 'clamp(1rem, 4vw, 1.5rem)',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '15px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            backdropFilter: 'blur(10px)',
            minWidth: 'clamp(140px, 40vw, 200px)',
            maxWidth: '300px',
            flex: '1 1 auto',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            e.target.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
          onTouchStart={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onTouchEnd={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          <div style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', marginBottom: '0.5rem' }}>🎮</div>
          <div>2D Canvas</div>
          <div style={{ fontSize: 'clamp(0.7rem, 3vw, 0.8rem)', opacity: 0.8, marginTop: '0.5rem' }}>
            Original top-down view
          </div>
        </button>

        <button
          onClick={() => setMode('3d')}
          style={{
            padding: 'clamp(1rem, 4vw, 2rem) clamp(1.5rem, 6vw, 3rem)',
            fontSize: 'clamp(1rem, 4vw, 1.5rem)',
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '15px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            backdropFilter: 'blur(10px)',
            minWidth: 'clamp(140px, 40vw, 200px)',
            maxWidth: '300px',
            flex: '1 1 auto',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            e.target.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
          onTouchStart={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onTouchEnd={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          <div style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', marginBottom: '0.5rem' }}>🎯</div>
          <div>3D Voxel</div>
          <div style={{ fontSize: 'clamp(0.7rem, 3vw, 0.8rem)', opacity: 0.8, marginTop: '0.5rem' }}>
            New 3D experience
          </div>
          <div style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.7rem)', opacity: 0.6, marginTop: '0.3rem', fontStyle: 'italic' }}>
            (Best on PC/Desktop)
          </div>
        </button>
      </div>

      <div style={{
        marginTop: 'clamp(1.5rem, 6vw, 3rem)',
        fontSize: 'clamp(0.7rem, 3vw, 0.9rem)',
        opacity: 0.7,
        textAlign: 'center',
        padding: '0 1rem'
      }}>
        Press ESC in-game to return to this menu
      </div>
    </div>
  );
};

export default GameSelector;
