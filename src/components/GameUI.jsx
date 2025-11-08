import React from 'react';
import { Heart, Zap, TrendingUp, Package, Activity } from 'lucide-react';
import useGameStore from '../stores/useGameStore';

/**
 * GameUI component - HTML overlay for game interface
 */
const GameUI = () => {
  const player = useGameStore((state) => state.player);
  const inventory = useGameStore((state) => state.inventory);
  const gameState = useGameStore((state) => state.gameState);

  if (gameState === 'intro') {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          zIndex: 1000,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            Voxel RPG 3D
          </h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
            Use WASD to move, Space to jump, Shift to sprint<br />
            Right-click drag to rotate camera, Ctrl for spell wheel
          </p>
          <div style={{
            background: 'rgba(255, 193, 7, 0.2)',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem auto'
          }}>
            <p style={{ fontSize: '1rem', margin: 0, color: '#ffc107', fontWeight: 'bold' }}>
              ⚠️ If experiencing low FPS:
            </p>
            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0', lineHeight: '1.4' }}>
              Enable Hardware Acceleration in Chrome:<br />
              Settings → System → "Use hardware acceleration when available"
            </p>
          </div>
          <button
            onClick={() => useGameStore.getState().setGameState('playing')}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.5rem',
              background: '#4169e1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  if (gameState !== 'playing') {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      {/* Top left - Player stats */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '15px',
          borderRadius: '10px',
          color: 'white',
          minWidth: '250px',
        }}
      >
        {/* Health bar */}
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <Heart size={20} style={{ marginRight: '8px', color: '#ff6b6b' }} />
            <span>
              {player.health} / {player.maxHealth}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(player.health / player.maxHealth) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff6b6b, #ff8787)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {/* Mana bar */}
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <Zap size={20} style={{ marginRight: '8px', color: '#4dabf7' }} />
            <span>
              {Math.round(player.mana)} / {player.maxMana}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(player.mana / player.maxMana) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4dabf7, #74c0fc)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {/* Stamina bar */}
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <Activity size={20} style={{ marginRight: '8px', color: '#51cf66' }} />
            <span>
              {Math.round(player.stamina)} / {player.maxStamina}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(player.stamina / player.maxStamina) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #51cf66, #8ce99a)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>

        {/* Level and XP */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <TrendingUp
              size={20}
              style={{ marginRight: '8px', color: '#ffd43b' }}
            />
            <span>Level {player.level}</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '15px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(player.xp / player.xpToNext) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ffd43b, #ffd43b)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '3px' }}>
            {player.xp} / {player.xpToNext} XP
          </div>
        </div>
      </div>

      {/* Top right - Inventory quick info */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '15px',
          borderRadius: '10px',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Package size={20} style={{ color: '#ffd43b' }} />
            <span>{inventory.gold} Gold</span>
          </div>
          <div>Potions: {inventory.potions}</div>
        </div>
      </div>

      {/* Bottom center - Controls hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '10px 20px',
          borderRadius: '10px',
          color: 'white',
          fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)',
          maxWidth: '90vw',
        }}
      >
        <div style={{ display: 'flex', gap: 'clamp(8px, 3vw, 20px)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>Tap/Click - Move/Attack</span>
          <span style={{ display: window.innerWidth > 768 ? 'inline' : 'none' }}>WASD - Move</span>
          <span style={{ display: window.innerWidth > 768 ? 'inline' : 'none' }}>Space - Jump</span>
          <span style={{ display: window.innerWidth > 768 ? 'inline' : 'none' }}>1-2 - Spells</span>
        </div>
      </div>

      {/* Player position debug info (optional) */}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '10px',
          borderRadius: '5px',
          color: 'white',
          fontSize: '0.8rem',
        }}
      >
        Position: {player.position.map((p) => p.toFixed(1)).join(', ')}
      </div>
    </div>
  );
};

export default GameUI;
