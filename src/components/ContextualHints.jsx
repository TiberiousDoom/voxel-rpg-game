import React, { useState, useEffect } from 'react';
import useGameStore from '../stores/useGameStore';

/**
 * ContextualHints - Shows context-sensitive control hints
 */
const ContextualHints = () => {
  const [currentHint, setCurrentHint] = useState(null);
  const [shownHints, setShownHints] = useState(new Set());
  const gameState = useGameStore((state) => state.gameState);
  const playerHealth = useGameStore((state) => state.player.health);
  const playerMaxHealth = useGameStore((state) => state.player.maxHealth);
  const potions = useGameStore((state) => state.inventory.potions);

  // Define hints with conditions
  const hints = [
    {
      id: 'movement',
      text: 'WASD to move, SPACE to jump',
      condition: () => gameState === 'playing',
      priority: 1,
      duration: 5000,
      showOnce: true,
    },
    {
      id: 'inventory',
      text: 'Press I to open inventory',
      condition: () => gameState === 'playing',
      priority: 2,
      delay: 8000,
      duration: 4000,
      showOnce: true,
    },
    {
      id: 'attack',
      text: 'Click on enemies to attack',
      condition: () => gameState === 'playing',
      priority: 3,
      delay: 15000,
      duration: 4000,
      showOnce: true,
    },
    {
      id: 'blocks',
      text: 'Hold left-click to mine, right-click to place',
      condition: () => gameState === 'playing',
      priority: 4,
      delay: 25000,
      duration: 5000,
      showOnce: true,
    },
    {
      id: 'sprint',
      text: 'Hold SHIFT to sprint',
      condition: () => gameState === 'playing',
      priority: 5,
      delay: 40000,
      duration: 3000,
      showOnce: true,
    },
    {
      id: 'lowHealth',
      text: 'Low health! Press H to use a potion',
      condition: () => playerHealth < playerMaxHealth * 0.3 && potions > 0,
      priority: 10,
      duration: 4000,
      showOnce: false,
      cooldown: 30000,
    },
    {
      id: 'firstPerson',
      text: 'Click canvas to enter first-person mode (ESC to exit)',
      condition: () => gameState === 'playing',
      priority: 6,
      delay: 60000,
      duration: 4000,
      showOnce: true,
    },
  ];

  useEffect(() => {
    if (gameState !== 'playing') {
      setCurrentHint(null);
      return;
    }

    const checkHints = () => {
      for (const hint of hints.sort((a, b) => a.priority - b.priority)) {
        // Skip if already shown and showOnce
        if (hint.showOnce && shownHints.has(hint.id)) continue;

        // Check condition
        if (!hint.condition()) continue;

        // Check delay
        if (hint.delay && Date.now() - startTime < hint.delay) continue;

        // Show hint
        setCurrentHint(hint);
        setShownHints((prev) => new Set([...prev, hint.id]));

        // Hide after duration
        setTimeout(() => {
          setCurrentHint((current) => (current?.id === hint.id ? null : current));
        }, hint.duration);

        break;
      }
    };

    const startTime = Date.now();
    const interval = setInterval(checkHints, 1000);
    checkHints(); // Initial check

    return () => clearInterval(interval);
  }, [gameState, playerHealth, potions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentHint || gameState !== 'playing') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontFamily: 'sans-serif',
        zIndex: 100,
        pointerEvents: 'none',
        animation: 'fadeInOut 0.3s ease-in-out',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      {currentHint.text}
    </div>
  );
};

export default ContextualHints;
