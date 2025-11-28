/**
 * CharacterSystemUI.jsx
 * Manager component for character system UI elements
 * - Character Sheet modal (C key)
 * - Migration notification
 * - Level-up notification
 */

import React, { useState, useEffect } from 'react';
import CharacterSheet from './CharacterSheet';
import MigrationNotification from './MigrationNotification';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { getMigrationNotification } from '../../persistence/SaveMigrationIntegration';
import useGameStore from '../../stores/useGameStore';

const CharacterSystemUI = () => {
  const [isCharacterSheetOpen, setIsCharacterSheetOpen] = useState(false);
  const [migrationData, setMigrationData] = useState(null);
  const [showLevelUpNotification, setShowLevelUpNotification] = useState(false);

  const character = useGameStore((state) => state.character);
  const player = useGameStore((state) => state.player);
  const gameState = useGameStore((state) => state.gameState);

  // Watch for available points (level-up notification)
  const previousLevel = React.useRef(player.level);
  useEffect(() => {
    if (player.level > previousLevel.current && gameState === 'playing') {
      // Player leveled up!
      setShowLevelUpNotification(true);

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowLevelUpNotification(false);
      }, 5000);

      previousLevel.current = player.level;

      return () => clearTimeout(timer);
    }
  }, [player.level, gameState]);

  // Check for migration notification on mount
  useEffect(() => {
    const migration = getMigrationNotification();
    if (migration) {
      setMigrationData(migration);
    }
  }, []);

  // Keyboard shortcuts
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts({
    enabled: gameState === 'playing',
  });

  useEffect(() => {
    // Register C key to toggle character sheet
    registerShortcut(
      'TOGGLE_CHARACTER_SHEET',
      () => {
        setIsCharacterSheetOpen((prev) => !prev);
      },
      { key: 'c', ctrl: false, shift: false, alt: false, description: 'Open Character Sheet' }
    );

    // Register ESC to close character sheet
    registerShortcut(
      'CLOSE_MODAL',
      () => {
        if (isCharacterSheetOpen) {
          setIsCharacterSheetOpen(false);
        }
      },
      { key: 'Escape', ctrl: false, shift: false, alt: false, description: 'Close modals' }
    );

    return () => {
      unregisterShortcut('TOGGLE_CHARACTER_SHEET');
      unregisterShortcut('CLOSE_MODAL');
    };
  }, [registerShortcut, unregisterShortcut, isCharacterSheetOpen]);

  // Don't render if not in game
  if (gameState !== 'playing') {
    return null;
  }

  return (
    <>
      {/* Character Sheet Modal */}
      <CharacterSheet
        isOpen={isCharacterSheetOpen}
        onClose={() => setIsCharacterSheetOpen(false)}
      />

      {/* Migration Notification */}
      {migrationData && (
        <MigrationNotification
          data={migrationData}
          onClose={() => setMigrationData(null)}
        />
      )}

      {/* Level-Up Notification */}
      {showLevelUpNotification && character.attributePoints > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#1a1a2e',
            padding: '15px 25px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(251, 191, 36, 0.5)',
            zIndex: 2000,
            animation: 'slideInRight 0.5s ease-out',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
          }}
          onClick={() => {
            setIsCharacterSheetOpen(true);
            setShowLevelUpNotification(false);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            <div>
              <div>Level Up!</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {character.attributePoints} attribute points available
              </div>
              <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
                Click or press C to allocate
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Character Sheet hint (show once at start if points available) */}
      {!isCharacterSheetOpen && character.attributePoints > 0 && !showLevelUpNotification && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fbbf24',
            padding: '10px 20px',
            borderRadius: '8px',
            border: '2px solid #fbbf24',
            zIndex: 1500,
            fontSize: '14px',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          Press <kbd style={{
            background: 'rgba(251, 191, 36, 0.2)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}>C</kbd> to open Character Sheet
        </div>
      )}

      {/* CSS animations */}
      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.6;
            }
          }
        `}
      </style>
    </>
  );
};

export default CharacterSystemUI;
