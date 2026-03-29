/**
 * GameModeSelector.jsx
 * Mode selection screen for new game / title screen
 */

import React, { useState } from 'react';
import { GAME_MODES } from '../../systems/GameModeManager.js';
import { getAllChallenges } from '../../config/challenges.js';

const MODE_INFO = [
  {
    mode: GAME_MODES.NORMAL,
    title: 'Normal',
    icon: '\u2694\uFE0F',
    description: 'The standard experience. Build your settlement, explore dungeons, and defeat the Dragon Lord.',
    color: '#3498db',
    alwaysAvailable: true,
  },
  {
    mode: GAME_MODES.NEW_GAME_PLUS,
    title: 'New Game+',
    icon: '\u2B50',
    description: 'Start over with carry-over bonuses and harder enemies. Each cycle increases the challenge.',
    color: '#f39c12',
    alwaysAvailable: false,
    requiresWin: true,
  },
  {
    mode: GAME_MODES.ENDLESS,
    title: 'Endless',
    icon: '\u267E\uFE0F',
    description: 'Survive infinite waves of increasingly powerful enemies. How long can you hold?',
    color: '#e74c3c',
    alwaysAvailable: false,
    requiresWin: true,
  },
  {
    mode: GAME_MODES.SANDBOX,
    title: 'Sandbox',
    icon: '\uD83C\uDFD7\uFE0F',
    description: 'Unlimited resources, no enemies, everything unlocked. Build freely and experiment.',
    color: '#2ecc71',
    alwaysAvailable: true,
  },
  {
    mode: GAME_MODES.CHALLENGE,
    title: 'Challenge',
    icon: '\uD83C\uDFC6',
    description: 'Test your skills with special rules and restrictions. Complete challenges for unique titles.',
    color: '#9b59b6',
    alwaysAvailable: true,
  },
];

const GameModeSelector = ({ onSelectMode, hasWon = false, onClose }) => {
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [sandboxOptions, setSandboxOptions] = useState({
    enableEnemies: false,
  });

  const challenges = getAllChallenges();

  const handleConfirm = () => {
    if (!selectedMode) return;

    const options = {};
    if (selectedMode === GAME_MODES.CHALLENGE && selectedChallenge) {
      options.challengeId = selectedChallenge;
    }
    if (selectedMode === GAME_MODES.SANDBOX) {
      Object.assign(options, sandboxOptions);
    }
    if (selectedMode === GAME_MODES.NEW_GAME_PLUS) {
      options.cycle = 1;
    }

    onSelectMode(selectedMode, options);
  };

  const isAvailable = (info) => {
    if (info.alwaysAvailable) return true;
    if (info.requiresWin && !hasWon) return false;
    return true;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        backgroundColor: '#1a1a2e', borderRadius: '12px', padding: '24px',
        maxWidth: '700px', width: '90%', maxHeight: '85vh', overflowY: 'auto',
        border: '2px solid #333', color: '#eee',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Select Game Mode</h2>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer' }}>x</button>
          )}
        </div>

        {/* Mode Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {MODE_INFO.map((info) => {
            const available = isAvailable(info);
            const selected = selectedMode === info.mode;

            return (
              <div
                key={info.mode}
                onClick={() => available && setSelectedMode(info.mode)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: selected ? `2px solid ${info.color}` : '2px solid #333',
                  backgroundColor: selected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  cursor: available ? 'pointer' : 'not-allowed',
                  opacity: available ? 1 : 0.4,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>{info.icon}</span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: info.color }}>{info.title}</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{info.description}</div>
                  </div>
                </div>
                {!available && (
                  <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px', marginLeft: '32px' }}>
                    Complete the game once to unlock
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Challenge Selection */}
        {selectedMode === GAME_MODES.CHALLENGE && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#9b59b6', marginBottom: '8px' }}>Select Challenge</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {challenges.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChallenge(ch.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: selectedChallenge === ch.id ? '2px solid #9b59b6' : '1px solid #444',
                    backgroundColor: selectedChallenge === ch.id ? 'rgba(155,89,182,0.15)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{ch.icon} {ch.title}</div>
                  <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>{ch.goal.description}</div>
                  <div style={{ color: ch.difficulty === 'EXTREME' ? '#e74c3c' : ch.difficulty === 'HARD' ? '#f39c12' : '#2ecc71', fontSize: '10px', marginTop: '2px' }}>
                    {ch.difficulty}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sandbox Options */}
        {selectedMode === GAME_MODES.SANDBOX && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#2ecc71', marginBottom: '8px' }}>Sandbox Options</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sandboxOptions.enableEnemies}
                onChange={(e) => setSandboxOptions({ ...sandboxOptions, enableEnemies: e.target.checked })}
              />
              Enable enemies
            </label>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedMode || (selectedMode === GAME_MODES.CHALLENGE && !selectedChallenge)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: selectedMode ? '#3498db' : '#333',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: selectedMode ? 'pointer' : 'not-allowed',
            opacity: selectedMode ? 1 : 0.5,
          }}
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

export default GameModeSelector;
