/**
 * QuickActionBar.jsx - Compact horizontal action bar for quick building operations
 *
 * Features:
 * - Icon-first horizontal layout
 * - Frequently used controls in one place
 * - Minimal text, maximum clarity
 * - Takes minimal vertical space
 */

import React, { useState } from 'react';
import './QuickActionBar.css';

function QuickActionBar({
  onSpawnNPC = () => {},
  onAdvanceTier = () => {},
  onShowInfo = () => {},
  currentTier = 'SURVIVAL'
}) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const actions = [
    {
      id: 'spawn',
      icon: '👤',
      label: 'Spawn NPC',
      description: 'Create a new worker NPC',
      onClick: onSpawnNPC
    },
    {
      id: 'advance',
      icon: '📈',
      label: 'Advance Tier',
      description: 'Progress to next tier',
      onClick: onAdvanceTier
    },
    {
      id: 'info',
      icon: 'ⓘ',
      label: 'Help',
      description: 'How to play guide',
      onClick: onShowInfo
    }
  ];

  return (
    <div className="quick-action-bar">
      <div className="action-buttons">
        {actions.map(action => (
          <div
            key={action.id}
            className="action-button-wrapper"
            onMouseEnter={() => setActiveTooltip(action.id)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <button
              className="action-button"
              onClick={action.onClick}
              title={action.label}
              aria-label={action.label}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-label">{action.label}</span>
            </button>

            {/* Tooltip */}
            {activeTooltip === action.id && (
              <div className="action-tooltip">
                <span className="tooltip-label">{action.label}</span>
                <span className="tooltip-description">{action.description}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current tier display */}
      <div className="tier-display">
        <span className="tier-label">Tier:</span>
        <span className="tier-badge">{currentTier}</span>
      </div>
    </div>
  );
}

export default QuickActionBar;
