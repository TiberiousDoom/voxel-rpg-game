import React, { useState, useEffect } from 'react';
import { Flame, Zap, Snowflake, Wind } from 'lucide-react';
import useGameStore from '../stores/useGameStore';

/**
 * SpellWheel component - Spell selection wheel that appears on Ctrl key
 */
const SpellWheel = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const player = useGameStore((state) => state.player);

  // Available spells
  const spells = [
    {
      name: 'Fireball',
      icon: Flame,
      color: '#ff6b00',
      manaCost: 20,
      damage: 20,
      speed: 20,
      key: '1',
    },
    {
      name: 'Lightning',
      icon: Zap,
      color: '#00bfff',
      manaCost: 30,
      damage: 40,
      speed: 30,
      key: '2',
    },
    {
      name: 'Ice Shard',
      icon: Snowflake,
      color: '#a8dadc',
      manaCost: 25,
      damage: 25,
      speed: 25,
      key: '3',
    },
    {
      name: 'Wind Blast',
      icon: Wind,
      color: '#90e0ef',
      manaCost: 15,
      damage: 15,
      speed: 35,
      key: '4',
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control' || e.key === 'Ctrl') {
        setIsActive(true);
        e.preventDefault();
      }

      // Number keys to select spell while wheel is open
      if (isActive && e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        if (index < spells.length) {
          setSelectedIndex(index);
        }
      }

      // Arrow keys for selection
      if (isActive) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          setSelectedIndex((prev) => (prev - 1 + spells.length) % spells.length);
          e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          setSelectedIndex((prev) => (prev + 1) % spells.length);
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Control' || e.key === 'Ctrl') {
        setIsActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, spells.length]);

  if (!isActive) {
    return null;
  }

  const radius = 120;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
        pointerEvents: isActive ? 'all' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Time slow indicator */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#00ffff',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          textShadow: '0 0 10px #00ffff',
        }}
      >
        TIME SLOWED
      </div>

      {/* Center circle */}
      <div
        style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '3px solid rgba(255, 255, 255, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.9rem',
          textAlign: 'center',
        }}
      >
        Select<br />Spell
      </div>

      {/* Spell options in a circle */}
      {spells.map((spell, index) => {
        const angle = (index / spells.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const isSelected = index === selectedIndex;
        const Icon = spell.icon;
        const canAfford = player.mana >= spell.manaCost;

        return (
          <div
            key={spell.name}
            style={{
              position: 'absolute',
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
              width: isSelected ? '120px' : '100px',
              height: isSelected ? '120px' : '100px',
              borderRadius: '50%',
              background: isSelected
                ? `linear-gradient(135deg, ${spell.color}, ${spell.color}dd)`
                : 'rgba(0, 0, 0, 0.8)',
              border: `4px solid ${isSelected ? spell.color : 'rgba(255, 255, 255, 0.3)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isSelected
                ? `0 0 30px ${spell.color}`
                : '0 0 10px rgba(0, 0, 0, 0.5)',
              opacity: canAfford ? 1 : 0.5,
            }}
            onClick={() => setSelectedIndex(index)}
          >
            <Icon
              size={isSelected ? 48 : 36}
              color={isSelected ? 'white' : spell.color}
              style={{ marginBottom: '5px' }}
            />
            <div
              style={{
                color: 'white',
                fontSize: isSelected ? '0.9rem' : '0.75rem',
                fontWeight: isSelected ? 'bold' : 'normal',
                textAlign: 'center',
              }}
            >
              {spell.name}
            </div>
            <div
              style={{
                color: canAfford ? '#4dabf7' : '#ff6b6b',
                fontSize: '0.7rem',
                marginTop: '2px',
              }}
            >
              {spell.manaCost} Mana
            </div>
            <div
              style={{
                color: 'white',
                fontSize: '0.6rem',
                opacity: 0.7,
              }}
            >
              [{spell.key}]
            </div>
          </div>
        );
      })}

      {/* Instructions */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '1rem',
          textAlign: 'center',
        }}
      >
        <div>Use Arrow Keys or Mouse to Select</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '5px' }}>
          Press number keys (1-4) or release Ctrl to activate
        </div>
      </div>
    </div>
  );
};

export default SpellWheel;
