import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../stores/useGameStore';

/**
 * ContextualHints - Shows context-sensitive control hints
 */
const ContextualHints = () => {
  const [currentHint, setCurrentHint] = useState(null);
  const shownHintsRef = useRef(new Set()); // Use ref to avoid stale closure in interval
  const hintCooldowns = useRef(new Map()); // id → timestamp of last show
  const currentHintRef = useRef(null); // Ref mirrors currentHint to avoid stale closures
  const hintTimeoutRef = useRef(null); // Active timeout handle
  const gameState = useGameStore((state) => state.gameState);
  const playerHealth = useGameStore((state) => state.player.health);
  const playerMaxHealth = useGameStore((state) => state.player.maxHealth);
  const potions = useGameStore((state) => state.inventory.potions);
  const hunger = useGameStore((state) => state.hunger);
  const worldTime = useGameStore((state) => state.worldTime);
  const shelter = useGameStore((state) => state.shelter);

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
      text: 'Press Tab to enter Build Mode — mine and place blocks',
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
      id: 'spells',
      text: 'Cast spells with 1-6 keys. Attacks cost 5 mana. Hold Ctrl to view spell wheel.',
      condition: () => gameState === 'playing',
      priority: 5,
      delay: 20000,
      duration: 5000,
      showOnce: true,
    },
    {
      id: 'firstPerson',
      text: 'Press V to toggle first-person mode',
      condition: () => gameState === 'playing',
      priority: 6,
      delay: 60000,
      duration: 4000,
      showOnce: true,
    },
    {
      id: 'hungerWarning',
      text: 'You\'re getting hungry! Mine berry bushes or craft food.',
      condition: () => hunger.current < 40 && hunger.current > 0,
      priority: 9,
      duration: 5000,
      showOnce: false,
      cooldown: 60000,
    },
    {
      id: 'nightWarning',
      text: 'Night is falling — monsters become more dangerous!',
      condition: () => worldTime.period === 'dusk',
      priority: 8,
      duration: 5000,
      showOnce: false,
      cooldown: 120000,
    },
    {
      id: 'shelterHint',
      text: 'Build walls and a roof for shelter benefits at night.',
      condition: () => worldTime.isNight && shelter.isExposed,
      priority: 7,
      duration: 5000,
      showOnce: true,
    },
    {
      id: 'use-key',
      text: 'Press E to pick up items or harvest bushes',
      condition: () => gameState === 'playing',
      priority: 5,
      delay: 30000,
      duration: 5000,
      showOnce: true,
    },
  ];

  // Keep ref in sync with state
  useEffect(() => {
    currentHintRef.current = currentHint;
  }, [currentHint]);

  useEffect(() => {
    if (gameState !== 'playing') {
      setCurrentHint(null);
      currentHintRef.current = null;
      return;
    }

    const startTime = Date.now();

    const checkHints = () => {
      // Don't check while a hint is currently displayed (use ref for fresh value)
      if (currentHintRef.current) return;

      const now = Date.now();
      for (const hint of hints.sort((a, b) => a.priority - b.priority)) {
        // Skip if already shown and showOnce
        if (hint.showOnce && shownHintsRef.current.has(hint.id)) continue;

        // Check cooldown for repeating hints
        if (hint.cooldown) {
          const lastShown = hintCooldowns.current.get(hint.id) || 0;
          if (now - lastShown < hint.cooldown) continue;
        }

        // Check condition
        if (!hint.condition()) continue;

        // Check delay
        if (hint.delay && now - startTime < hint.delay) continue;

        // Show hint
        hintCooldowns.current.set(hint.id, now);
        currentHintRef.current = hint;
        setCurrentHint(hint);
        shownHintsRef.current.add(hint.id);

        // Hide after duration
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = setTimeout(() => {
          currentHintRef.current = null;
          setCurrentHint(null);
          hintTimeoutRef.current = null;
        }, hint.duration);

        break;
      }
    };

    const interval = setInterval(checkHints, 2000);
    // Delay initial check to avoid first-frame flash
    const initialTimeout = setTimeout(checkHints, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentHint || gameState !== 'playing') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '220px', // Above BlockHotbar (~140px) and GameUI controls hint (~40px)
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
        animation: 'fadeIn 0.3s ease-in-out',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      {currentHint.text}
    </div>
  );
};

export default ContextualHints;
