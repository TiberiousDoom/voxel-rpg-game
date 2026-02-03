/**
 * ModeSelector.jsx - UI component for switching game modes
 */
import React from 'react';
import './ModeSelector.css';

function ModeSelector({ modeManager, currentMode, onModeChange }) {
  const handleSwitch = async (newMode) => {
    if (!modeManager) {
      console.error('ModeManager not available');
      return;
    }

    // For Phase 1, we'll allow basic switching without strict validation
    // Full validation will be enforced in later phases
    const context = {};

    // Add minimal context for testing
    if (newMode === 'expedition') {
      context.expeditionHallId = 'test_hall';
      context.party = ['npc1'];  // Placeholder
    } else if (newMode === 'defense') {
      context.raidId = 'test_raid';
    } else if (newMode === 'settlement') {
      if (currentMode === 'expedition') {
        context.completed = true;
      } else if (currentMode === 'defense') {
        context.defenseComplete = true;
      }
    }

    const result = await modeManager.switchMode(newMode, context);

    if (result.success) {
      if (onModeChange) {
        onModeChange(newMode);
      }
    } else {
      console.error('Mode switch failed:', result.error);
      alert(`Cannot switch to ${newMode}: ${result.error}`);
    }
  };

  return (
    <div className="mode-selector">
      <h3>Game Mode</h3>
      <div className="mode-buttons">
        <button
          className={currentMode === 'settlement' ? 'active' : ''}
          onClick={() => handleSwitch('settlement')}
          disabled={currentMode === 'settlement'}
        >
          🏘️ Settlement
        </button>
        <button
          className={currentMode === 'expedition' ? 'active' : ''}
          onClick={() => handleSwitch('expedition')}
          disabled={currentMode === 'expedition'}
        >
          ⚔️ Expedition
        </button>
        <button
          className={currentMode === 'defense' ? 'active' : ''}
          onClick={() => handleSwitch('defense')}
          disabled={currentMode === 'defense'}
        >
          🛡️ Defense
        </button>
      </div>
      <p className="current-mode">Current: {currentMode}</p>
    </div>
  );
}

export default ModeSelector;
