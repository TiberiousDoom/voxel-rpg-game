import React, { useState, useEffect } from 'react';
import { Heart, Zap, TrendingUp, Package, Activity, Flame, Hammer } from 'lucide-react';
import useGameStore from '../stores/useGameStore';
import { getTotalStats } from '../utils/equipmentStats';

/**
 * GameUI component - HTML overlay for game interface
 * Mobile-compatible with responsive stat panels
 */
const GameUI = () => {
  const player = useGameStore((state) => state.player);
  const equipment = useGameStore((state) => state.equipment);
  const inventory = useGameStore((state) => state.inventory);
  const gameState = useGameStore((state) => state.gameState);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate total stats with equipment bonuses
  const totalStats = getTotalStats(player, equipment);

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
          padding: isMobile ? '20px' : '0',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: isMobile ? '100%' : '600px' }}>
          <h1 style={{ fontSize: isMobile ? '2rem' : '3rem', marginBottom: '1rem' }}>
            Voxel RPG 3D
          </h1>
          <p style={{ fontSize: isMobile ? '1rem' : '1.2rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            {isMobile ? (
              <>
                Tap to move, swipe to look around<br />
                Tap 🪄 button for spell wheel
              </>
            ) : (
              <>
                Use WASD to move, Space to jump, Shift to sprint<br />
                Right-click drag to rotate camera, Ctrl for spell wheel
              </>
            )}
          </p>
          {!isMobile && (
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
          )}
          <button
            onClick={() => useGameStore.getState().setGameState('playing')}
            style={{
              padding: isMobile ? '14px 28px' : '1rem 2rem',
              fontSize: isMobile ? '1.2rem' : '1.5rem',
              minHeight: isMobile ? '56px' : 'auto',
              minWidth: isMobile ? '200px' : 'auto',
              background: '#4169e1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              touchAction: 'manipulation',
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
          top: isMobile ? '10px' : '20px',
          left: isMobile ? '10px' : '20px',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: isMobile ? '10px' : '15px',
          borderRadius: '10px',
          color: 'white',
          minWidth: isMobile ? '140px' : '250px',
          maxWidth: isMobile ? '180px' : 'none',
        }}
      >
        {/* Health bar */}
        <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
              fontSize: isMobile ? '0.85rem' : '1rem',
            }}
          >
            <Heart size={isMobile ? 16 : 20} style={{ marginRight: isMobile ? '4px' : '8px', color: '#ff6b6b' }} />
            <span>
              {player.health} / {player.maxHealth}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: isMobile ? '14px' : '20px',
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
        <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
              fontSize: isMobile ? '0.85rem' : '1rem',
            }}
          >
            <Zap size={isMobile ? 16 : 20} style={{ marginRight: isMobile ? '4px' : '8px', color: '#4dabf7' }} />
            <span>
              {Math.round(player.mana)} / {player.maxMana}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: isMobile ? '14px' : '20px',
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
        {!isMobile && (
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
        )}

        {/* Rage bar */}
        {!isMobile && (
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
            }}
          >
            <Flame size={20} style={{ marginRight: '8px', color: '#ff6b00' }} />
            <span>
              {Math.round(player.rage)} / {player.maxRage}
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
                width: `${(player.rage / player.maxRage) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff6b00, #ff9933)',
                transition: 'width 0.3s',
                boxShadow: player.rage >= 100 ? '0 0 10px #ff6b00' : 'none',
              }}
            />
          </div>
        </div>
        )}

        {/* Level and XP */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
              fontSize: isMobile ? '0.85rem' : '1rem',
            }}
          >
            <TrendingUp
              size={isMobile ? 16 : 20}
              style={{ marginRight: isMobile ? '4px' : '8px', color: '#ffd43b' }}
            />
            <span>Lv {player.level}</span>
          </div>
          <div
            style={{
              width: '100%',
              height: isMobile ? '12px' : '15px',
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
          {!isMobile && (
            <div style={{ fontSize: '0.8rem', marginTop: '3px' }}>
              {player.xp} / {player.xpToNext} XP
            </div>
          )}
        </div>
      </div>

      {/* Top right - Inventory quick info */}
      {!isMobile && (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Package size={20} style={{ color: '#ffd43b' }} />
              <span>{inventory.gold} Gold</span>
            </div>
            <div>Potions: {inventory.potions}</div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a0aec0', borderTop: '1px solid #4a5568', paddingTop: '8px' }}>
            Total DMG: {totalStats.damage} | DEF: {totalStats.defense}
          </div>
        </div>
      </div>
      )}

      {/* Bottom right - Quick access */}
      <div
        style={{
          position: 'absolute',
          bottom: isMobile ? '10px' : '20px',
          right: isMobile ? '10px' : '20px',
          display: 'flex',
          gap: isMobile ? '8px' : '10px',
          pointerEvents: 'all',
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            padding: isMobile ? '10px' : '12px',
            borderRadius: '10px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            border: '2px solid #4a5568',
            minWidth: isMobile ? '56px' : 'auto',
            minHeight: isMobile ? '56px' : 'auto',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <Package size={isMobile ? 28 : 24} style={{ color: '#4dabf7' }} />
          {!isMobile && <span style={{ fontSize: '0.7rem' }}>Inventory [I]</span>}
        </div>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            padding: isMobile ? '10px' : '12px',
            borderRadius: '10px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            border: '2px solid #4a5568',
            minWidth: isMobile ? '56px' : 'auto',
            minHeight: isMobile ? '56px' : 'auto',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <Hammer size={isMobile ? 28 : 24} style={{ color: '#ffd700' }} />
          {!isMobile && <span style={{ fontSize: '0.7rem' }}>Crafting [C]</span>}
        </div>
      </div>

      {/* Bottom center - Controls hint */}
      <div
        style={{
          position: 'absolute',
          bottom: isMobile ? '10px' : '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: isMobile ? '8px 12px' : '10px 20px',
          borderRadius: '10px',
          color: 'white',
          fontSize: isMobile ? '0.75rem' : '0.9rem',
          maxWidth: '90vw',
        }}
      >
        <div style={{ display: 'flex', gap: isMobile ? '8px' : '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>Tap/Click - Move/Attack</span>
          {!isMobile && <span>WASD - Move</span>}
          {!isMobile && <span>Space - Jump</span>}
          {!isMobile && <span>1-2 - Spells</span>}
        </div>
      </div>

      {/* Player position debug info (optional) */}
      {!isMobile && (
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
      )}
    </div>
  );
};

export default GameUI;
