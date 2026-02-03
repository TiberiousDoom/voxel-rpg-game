import React, { useState, useEffect } from 'react';

/**
 * TitleScreen Component
 * Displays the game's title screen with splash image and start button
 */
function TitleScreen({ onStart }) {
  const [fadeIn, setFadeIn] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation after mount
    const timer = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    onStart();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleStart();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        overflow: 'hidden',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      {/* Background Image */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/assets/splash/title-screen.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.8s ease-in-out',
        }}
      />

      {/* Preload image to detect when it's loaded */}
      <img
        src="/assets/splash/title-screen.png"
        alt=""
        style={{ display: 'none' }}
        onLoad={() => setImageLoaded(true)}
      />

      {/* Overlay gradient for better text readability */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.4) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          height: '100%',
          paddingBottom: 'clamp(60px, 15vh, 120px)',
          textAlign: 'center',
        }}
      >
        {/* Start Button */}
        <button
          onClick={handleStart}
          style={{
            padding: 'clamp(12px, 3vw, 20px) clamp(40px, 10vw, 80px)',
            fontSize: 'clamp(1.2rem, 4vw, 1.8rem)',
            fontWeight: 'bold',
            color: '#fff',
            background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.9) 0%, rgba(109, 40, 217, 0.9) 100%)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px) scale(1.02)';
            e.target.style.boxShadow = '0 6px 30px rgba(139, 92, 246, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
          }}
        >
          Start Game
        </button>

        {/* Press any key hint */}
        <p
          style={{
            marginTop: '20px',
            fontSize: 'clamp(0.8rem, 2vw, 1rem)',
            color: 'rgba(255, 255, 255, 0.6)',
            letterSpacing: '1px',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          Press ENTER or SPACE to start
        </p>
      </div>

      {/* Pulse animation for hint text */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default TitleScreen;
