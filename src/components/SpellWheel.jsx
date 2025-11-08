import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import useGameStore from '../stores/useGameStore';
import { SPELLS } from '../data/spells';

/**
 * SpellWheel component - Spell selection wheel that appears on Ctrl key
 * Supports up to 12 spells with navigation
 */
const SpellWheel = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(0);
  const player = useGameStore((state) => state.player);

  // Display 6 spells per page
  const SPELLS_PER_PAGE = 6;
  const totalPages = Math.ceil(SPELLS.length / SPELLS_PER_PAGE);
  const spellsOnPage = SPELLS.slice(page * SPELLS_PER_PAGE, (page + 1) * SPELLS_PER_PAGE);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control' || e.key === 'Ctrl') {
        setIsActive(true);
        e.preventDefault();
      }

      if (isActive) {
        // Number keys to select spell (1-6 for current page)
        if (e.key >= '1' && e.key <= '6') {
          const index = parseInt(e.key) - 1;
          if (index < spellsOnPage.length) {
            setSelectedIndex(page * SPELLS_PER_PAGE + index);
          }
        }

        // Arrow keys for selection
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          const newIndex = selectedIndex - 1;
          if (newIndex >= 0) {
            setSelectedIndex(newIndex);
            // Auto-page if needed
            setPage(Math.floor(newIndex / SPELLS_PER_PAGE));
          }
          e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          const newIndex = selectedIndex + 1;
          if (newIndex < SPELLS.length) {
            setSelectedIndex(newIndex);
            // Auto-page if needed
            setPage(Math.floor(newIndex / SPELLS_PER_PAGE));
          }
          e.preventDefault();
        }

        // Page navigation
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          if (page > 0) {
            setPage(page - 1);
            setSelectedIndex((page - 1) * SPELLS_PER_PAGE);
          }
          e.preventDefault();
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          if (page < totalPages - 1) {
            setPage(page + 1);
            setSelectedIndex((page + 1) * SPELLS_PER_PAGE);
          }
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
  }, [isActive, selectedIndex, page, spellsOnPage.length, totalPages]);

  if (!isActive) {
    return null;
  }

  const selectedSpell = SPELLS[selectedIndex];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1000,
        pointerEvents: isActive ? 'all' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header */}
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
        SPELL SELECTION
      </div>

      {/* Main content area */}
      <div
        style={{
          display: 'flex',
          gap: '40px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Spell grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '15px',
            padding: '20px',
            backgroundColor: 'rgba(20, 20, 40, 0.8)',
            borderRadius: '10px',
            border: '2px solid rgba(100, 150, 255, 0.5)',
          }}
        >
          {spellsOnPage.map((spell, localIndex) => {
            const globalIndex = page * SPELLS_PER_PAGE + localIndex;
            const isSelected = globalIndex === selectedIndex;
            const Icon = spell.icon;
            const canAfford = player.mana >= spell.manaCost;

            return (
              <div
                key={spell.id}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '10px',
                  background: isSelected
                    ? `linear-gradient(135deg, ${spell.color}, ${spell.color}dd)`
                    : 'rgba(0, 0, 0, 0.6)',
                  border: `3px solid ${isSelected ? spell.color : 'rgba(255, 255, 255, 0.2)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected
                    ? `0 0 20px ${spell.color}, inset 0 0 20px ${spell.color}40`
                    : '0 0 5px rgba(0, 0, 0, 0.5)',
                  opacity: canAfford ? 1 : 0.4,
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
                onClick={() => setSelectedIndex(globalIndex)}
              >
                <Icon
                  size={isSelected ? 36 : 28}
                  color={isSelected ? 'white' : spell.color}
                  style={{ marginBottom: '3px' }}
                />
                <div
                  style={{
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    textAlign: 'center',
                    lineHeight: '1.2',
                  }}
                >
                  {spell.name}
                </div>
                <div
                  style={{
                    color: canAfford ? '#4dabf7' : '#ff6b6b',
                    fontSize: '0.55rem',
                    marginTop: '2px',
                  }}
                >
                  {spell.manaCost}M
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selectedSpell && (
          <div
            style={{
              width: '280px',
              backgroundColor: 'rgba(20, 20, 40, 0.8)',
              border: `2px solid ${selectedSpell.color}`,
              borderRadius: '10px',
              padding: '20px',
              color: 'white',
              boxShadow: `0 0 30px ${selectedSpell.color}40`,
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: selectedSpell.color, marginBottom: '10px' }}>
              {selectedSpell.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '15px', lineHeight: '1.4' }}>
              {selectedSpell.description}
            </div>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                <span>Mana Cost:</span>
                <span style={{ color: selectedSpell.color }}>{selectedSpell.manaCost}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                <span>Cooldown:</span>
                <span style={{ color: selectedSpell.color }}>{selectedSpell.cooldown.toFixed(1)}s</span>
              </div>
              {selectedSpell.damage > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                  <span>Damage:</span>
                  <span style={{ color: '#ff6b6b' }}>{selectedSpell.damage}</span>
                </div>
              )}
              {selectedSpell.healAmount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                  <span>Heal:</span>
                  <span style={{ color: '#ff69b4' }}>{selectedSpell.healAmount}</span>
                </div>
              )}
              {selectedSpell.aoeRadius && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                  <span>AOE Radius:</span>
                  <span style={{ color: selectedSpell.color }}>{selectedSpell.aoeRadius}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            color: 'white',
          }}
        >
          <button
            onClick={() => page > 0 && setPage(page - 1)}
            style={{
              background: page > 0 ? 'rgba(100, 150, 255, 0.6)' : 'rgba(100, 150, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              cursor: page > 0 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <ChevronUp size={20} />
          </button>
          <span>Page {page + 1} / {totalPages}</span>
          <button
            onClick={() => page < totalPages - 1 && setPage(page + 1)}
            style={{
              background: page < totalPages - 1 ? 'rgba(100, 150, 255, 0.6)' : 'rgba(100, 150, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              cursor: page < totalPages - 1 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <ChevronDown size={20} />
          </button>
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#aaa',
          fontSize: '0.85rem',
          textAlign: 'center',
          lineHeight: '1.5',
        }}
      >
        <div>← → / A / D to navigate | ↑ ↓ / W / S to change page</div>
        <div>1-6 to quick select | Ctrl to release spell</div>
      </div>
    </div>
  );
};

export default SpellWheel;
