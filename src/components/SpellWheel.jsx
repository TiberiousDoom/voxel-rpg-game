import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Wand2 } from 'lucide-react';
import useGameStore from '../stores/useGameStore';
import { SPELLS } from '../data/spells';

/**
 * SpellWheel component - Spell selection wheel that appears on Ctrl key or touch button
 * Mobile-compatible with touch trigger button and responsive layout
 * Supports up to 12 spells with navigation
 */
const SpellWheel = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const player = useGameStore((state) => state.player);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Display 6 spells per page
  const SPELLS_PER_PAGE = 6;
  const totalPages = Math.ceil(SPELLS.length / SPELLS_PER_PAGE);
  const spellsOnPage = SPELLS.slice(page * SPELLS_PER_PAGE, (page + 1) * SPELLS_PER_PAGE);

  // Toggle spell wheel (for mobile button)
  const toggleSpellWheel = () => {
    setIsActive(!isActive);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip keyboard controls on mobile
      if (isMobile) return;

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
      // Skip keyboard controls on mobile
      if (isMobile) return;

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
  }, [isActive, selectedIndex, page, spellsOnPage.length, totalPages, isMobile]);

  const selectedSpell = SPELLS[selectedIndex];

  return (
    <>
      {/* Mobile Floating Spell Button */}
      {isMobile && (
        <button
          onClick={toggleSpellWheel}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: isActive ? 'linear-gradient(135deg, #9333ea, #7e22ce)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            boxShadow: isActive
              ? '0 0 30px rgba(147, 51, 234, 0.8), 0 8px 20px rgba(0, 0, 0, 0.4)'
              : '0 0 20px rgba(99, 102, 241, 0.6), 0 8px 20px rgba(0, 0, 0, 0.4)',
            cursor: 'pointer',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            transform: isActive ? 'scale(1.1) rotate(180deg)' : 'scale(1)',
            touchAction: 'manipulation',
          }}
          aria-label="Toggle Spell Wheel"
        >
          <Wand2 size={28} color="white" />
        </button>
      )}

      {/* Spell Wheel Overlay */}
      {isActive && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1000,
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            overflowY: 'auto',
            padding: isMobile ? '20px 10px' : '0',
          }}
          onClick={(e) => {
            // Close on backdrop click (mobile only)
            if (isMobile && e.target === e.currentTarget) {
              setIsActive(false);
            }
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
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '20px' : '40px',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: isMobile ? '100%' : 'none',
        }}
      >
        {/* Spell grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? (window.innerWidth <= 480 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)')
              : 'repeat(3, 1fr)',
            gap: isMobile ? '12px' : '15px',
            padding: isMobile ? '15px' : '20px',
            backgroundColor: 'rgba(20, 20, 40, 0.8)',
            borderRadius: '10px',
            border: '2px solid rgba(100, 150, 255, 0.5)',
            width: isMobile ? '100%' : 'auto',
            maxWidth: isMobile ? '420px' : 'none',
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
                  width: isMobile ? '100%' : '100px',
                  height: isMobile ? '100px' : '100px',
                  minWidth: isMobile ? '90px' : '100px',
                  minHeight: '90px',
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
                  touchAction: 'manipulation',
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
                    fontSize: isMobile ? '0.75rem' : '0.65rem',
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
                    fontSize: isMobile ? '0.7rem' : '0.55rem',
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
              width: isMobile ? '100%' : '280px',
              maxWidth: isMobile ? '420px' : '280px',
              backgroundColor: 'rgba(20, 20, 40, 0.8)',
              border: `2px solid ${selectedSpell.color}`,
              borderRadius: '10px',
              padding: isMobile ? '15px' : '20px',
              color: 'white',
              boxShadow: `0 0 30px ${selectedSpell.color}40`,
            }}
          >
            <div style={{ fontSize: isMobile ? '1.1rem' : '1.2rem', fontWeight: 'bold', color: selectedSpell.color, marginBottom: '10px' }}>
              {selectedSpell.name}
            </div>
            <div style={{ fontSize: isMobile ? '0.9rem' : '0.8rem', color: '#ccc', marginBottom: '15px', lineHeight: '1.4' }}>
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
              width: isMobile ? '44px' : '30px',
              height: isMobile ? '44px' : '30px',
              minWidth: '44px',
              minHeight: '44px',
              cursor: page > 0 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              touchAction: 'manipulation',
            }}
          >
            <ChevronUp size={isMobile ? 24 : 20} />
          </button>
          <span style={{ fontSize: isMobile ? '1rem' : '0.85rem' }}>Page {page + 1} / {totalPages}</span>
          <button
            onClick={() => page < totalPages - 1 && setPage(page + 1)}
            style={{
              background: page < totalPages - 1 ? 'rgba(100, 150, 255, 0.6)' : 'rgba(100, 150, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: isMobile ? '44px' : '30px',
              height: isMobile ? '44px' : '30px',
              minWidth: '44px',
              minHeight: '44px',
              cursor: page < totalPages - 1 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              touchAction: 'manipulation',
            }}
          >
            <ChevronDown size={isMobile ? 24 : 20} />
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
          fontSize: isMobile ? '0.8rem' : '0.85rem',
          textAlign: 'center',
          lineHeight: '1.5',
          padding: isMobile ? '0 20px' : '0',
          width: isMobile ? '100%' : 'auto',
        }}
      >
        {isMobile ? (
          <>
            <div>Tap spells to select</div>
            <div>Tap outside or 🪄 button to close</div>
          </>
        ) : (
          <>
            <div>← → / A / D to navigate | ↑ ↓ / W / S to change page</div>
            <div>1-6 to quick select | Ctrl to release spell</div>
          </>
        )}
      </div>
        </div>
      )}
    </>
  );
};

export default SpellWheel;
