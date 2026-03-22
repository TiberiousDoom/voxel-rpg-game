import React, { useState, useEffect } from 'react';
import { Heart, Zap, TrendingUp, Package, Activity, Flame, Hammer, Pickaxe, MapPin } from 'lucide-react';
import useGameStore from '../stores/useGameStore';
import { getTotalStats } from '../utils/equipmentStats';
import StatBarWithTooltip from './ui/StatBarWithTooltip';
import { useStatBreakdown } from '../hooks/useStatBreakdown';

/**
 * GameUI component - HTML overlay for game interface
 * Mobile-compatible with responsive stat panels
 */
const GameUI = () => {
  const player = useGameStore((state) => state.player);
  const equipment = useGameStore((state) => state.equipment);
  const inventory = useGameStore((state) => state.inventory);
  const gameState = useGameStore((state) => state.gameState);
  const hunger = useGameStore((state) => state.hunger);
  const shelter = useGameStore((state) => state.shelter);
  const worldTime = useGameStore((state) => state.worldTime);
  const buildMode = useGameStore((state) => state.buildMode);
  const zoneMode = useGameStore((state) => state.zoneMode);
  const toggleBuildMode = useGameStore((state) => state.toggleBuildMode);
  const [isMobile, setIsMobile] = useState(false);
  const statBreakdowns = useStatBreakdown();

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
            onClick={() => {
              const store = useGameStore.getState();
              store.setGameState('playing');
              store.updateWorldTime({ paused: false });
            }}
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
      {/* Build mode badge (top-center, pushed right on mobile to avoid stat panel) */}
      {buildMode && (
        <div
          style={{
            position: 'absolute',
            top: isMobile ? '10px' : '20px',
            left: isMobile ? 'auto' : '50%',
            right: isMobile ? '10px' : 'auto',
            transform: isMobile ? 'none' : 'translateX(-50%)',
            background: 'rgba(255, 165, 0, 0.85)',
            color: '#fff',
            padding: isMobile ? '4px 12px' : '6px 18px',
            borderRadius: '6px',
            fontSize: isMobile ? '0.75rem' : '1rem',
            fontWeight: 'bold',
            letterSpacing: '2px',
            border: '2px solid #ffa500',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            zIndex: 110,
          }}
        >
          BUILD MODE
        </div>
      )}

      {/* Zone mode badge (top-center, pushed right on mobile to avoid stat panel) */}
      {zoneMode && (
        <div
          style={{
            position: 'absolute',
            top: isMobile ? '10px' : '20px',
            left: isMobile ? 'auto' : '50%',
            right: isMobile ? '10px' : 'auto',
            transform: isMobile ? 'none' : 'translateX(-50%)',
            background: 'rgba(255, 140, 0, 0.85)',
            color: '#fff',
            padding: isMobile ? '4px 12px' : '6px 18px',
            borderRadius: '6px',
            fontSize: isMobile ? '0.75rem' : '1rem',
            fontWeight: 'bold',
            letterSpacing: '2px',
            border: '2px solid #ff8c00',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            zIndex: 110,
          }}
        >
          ZONE MODE
        </div>
      )}

      {/* Top left - Player stats */}
      <div
        style={{
          position: 'absolute',
          top: isMobile ? '8px' : '20px',
          left: isMobile ? '8px' : '20px',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: isMobile ? '8px' : '15px',
          borderRadius: '10px',
          color: 'white',
          minWidth: isMobile ? '130px' : '250px',
          maxWidth: isMobile ? '160px' : 'none',
        }}
      >
        {/* Health bar */}
        <StatBarWithTooltip
          icon={<Heart />}
          iconColor="#ff6b6b"
          label="Health"
          current={player.health}
          max={player.maxHealth}
          gradientColors={['#ff6b6b', '#ff8787']}
          statName="health"
          breakdown={statBreakdowns.health}
          isMobile={isMobile}
        />

        {/* Mana bar */}
        <StatBarWithTooltip
          icon={<Zap />}
          iconColor="#4dabf7"
          label="Mana"
          current={Math.round(player.mana)}
          max={player.maxMana}
          gradientColors={['#4dabf7', '#74c0fc']}
          statName="mana"
          breakdown={statBreakdowns.mana}
          isMobile={isMobile}
        />

        {/* Stamina bar */}
        {!isMobile && (
          <StatBarWithTooltip
            icon={<Activity />}
            iconColor="#51cf66"
            label="Stamina"
            current={Math.round(player.stamina)}
            max={player.maxStamina}
            gradientColors={['#51cf66', '#8ce99a']}
            statName="stamina"
            breakdown={statBreakdowns.stamina}
            isMobile={false}
          />
        )}

        {/* Hunger bar */}
        <div style={{ marginBottom: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '5px',
              fontSize: isMobile ? '0.85rem' : '1rem',
            }}
          >
            <span style={{ marginRight: isMobile ? '4px' : '8px', fontSize: isMobile ? 16 : 20, color: '#cc7733' }}>
              &#9749;
            </span>
            <span>
              {Math.round(hunger.current)} / {hunger.max}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: isMobile ? '12px' : '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(hunger.current / hunger.max) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #cc7733, #ee9955)',
                transition: 'width 0.3s',
                animation: hunger.current < 20 ? 'pulse 1s infinite' : 'none',
              }}
            />
          </div>
        </div>

        {/* Shelter status badge */}
        {!shelter.isExposed && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            marginBottom: '8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            background: shelter.isFullShelter
              ? 'rgba(81, 207, 102, 0.25)'
              : 'rgba(255, 193, 7, 0.25)',
            color: shelter.isFullShelter ? '#51cf66' : '#ffc107',
            border: `1px solid ${shelter.isFullShelter ? '#51cf66' : '#ffc107'}`,
          }}>
            {shelter.isFullShelter ? '\u{1F3E0}' : '\u{26D1}'} {shelter.isFullShelter ? 'Sheltered' : 'Partial Shelter'}
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

      {/* Top right - Time + Inventory quick info */}
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
          {/* Time display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace' }}>
            <span style={{ fontSize: '16px', color: worldTime.isNight ? '#8888cc' : (worldTime.period === 'dawn' || worldTime.period === 'dusk') ? '#ffaa66' : '#ffd43b' }}>
              {worldTime.isNight ? '\u263E' : '\u2600'}
            </span>
            <span>Day {worldTime.dayNumber} - {String(worldTime.hour).padStart(2, '0')}:{String(worldTime.minute).padStart(2, '0')}</span>
          </div>
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

      {/* Mobile: Time + gold display (top right, below mode badge if active) */}
      {isMobile && (
        <div
          style={{
            position: 'absolute',
            top: (buildMode || zoneMode) ? '42px' : '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '6px 10px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            transition: 'top 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: worldTime.isNight ? '#8888cc' : '#ffd43b' }}>
              {worldTime.isNight ? '\u263E' : '\u2600'}
            </span>
            <span>Day {worldTime.dayNumber} {String(worldTime.hour).padStart(2, '0')}:{String(worldTime.minute).padStart(2, '0')}</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#ffd43b', marginTop: '2px' }}>
            {inventory.gold}g | {inventory.potions}pot
          </div>
        </div>
      )}

      {/* Bottom left - Quick access (hide inventory/crafting on mobile during build/zone mode) */}
      <div
        style={{
          position: 'absolute',
          bottom: (buildMode || zoneMode) ? (isMobile ? '150px' : '110px') : (isMobile ? '10px' : '20px'),
          left: isMobile ? '10px' : '20px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '6px' : '10px',
          pointerEvents: 'all',
          transition: 'bottom 0.2s ease',
        }}
      >
        {/* Inventory - hide on mobile during build/zone mode to save space */}
        {!(isMobile && (buildMode || zoneMode)) && (
        <div
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }))}
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
            minWidth: isMobile ? '48px' : 'auto',
            minHeight: isMobile ? '48px' : 'auto',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <Package size={isMobile ? 24 : 24} style={{ color: '#4dabf7' }} />
          {!isMobile && <span style={{ fontSize: '0.7rem' }}>Inventory [I]</span>}
        </div>
        )}
        {/* Crafting - hide on mobile during build/zone mode to save space */}
        {!(isMobile && (buildMode || zoneMode)) && (
        <div
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }))}
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
            minWidth: isMobile ? '48px' : 'auto',
            minHeight: isMobile ? '48px' : 'auto',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <Hammer size={isMobile ? 24 : 24} style={{ color: '#ffd700' }} />
          {!isMobile && <span style={{ fontSize: '0.7rem' }}>Crafting [C]</span>}
        </div>
        )}
        <div
          onClick={toggleBuildMode}
          style={{
            background: buildMode ? 'rgba(255, 165, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
            padding: isMobile ? '10px' : '12px',
            borderRadius: '10px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            border: buildMode ? '2px solid #ffa500' : '2px solid #4a5568',
            minWidth: isMobile ? '48px' : 'auto',
            minHeight: isMobile ? '48px' : 'auto',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <Pickaxe size={isMobile ? 24 : 24} style={{ color: buildMode ? '#fff' : '#ffa500' }} />
          {!isMobile && <span style={{ fontSize: '0.7rem' }}>Build [Tab]</span>}
        </div>
        <div
          onClick={() => {
            const store = useGameStore.getState();
            if (store.zoneMode) {
              store.setZoneMode(false);
            } else {
              if (store.buildMode) store.setBuildMode(false);
              store.setZoneMode(true, 'MINING');
            }
          }}
          style={{
            background: zoneMode ? 'rgba(255, 140, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
            padding: isMobile ? '10px' : '12px',
            borderRadius: '10px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            border: zoneMode ? '2px solid #ff8c00' : '2px solid #4a5568',
            minWidth: isMobile ? '48px' : 'auto',
            minHeight: isMobile ? '48px' : 'auto',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <MapPin size={isMobile ? 24 : 24} style={{ color: zoneMode ? '#fff' : '#ff8c00' }} />
          {!isMobile && <span style={{ fontSize: '0.7rem' }}>Zones [Z]</span>}
        </div>
      </div>

      {/* Bottom center - Controls hint (positioned above BlockHotbar) */}

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
