/**
 * BottomQuickActionBar.jsx - Bottom floating quick action bar
 *
 * Features:
 * - Positioned at bottom center
 * - Floating bar with glassmorphism
 * - Auto-hide when viewport needs space (optional)
 * - Keyboard shortcuts (1-5)
 * - Large touch-friendly buttons (48px height)
 * - Badge indicators (e.g., "Ready" for tier advancement)
 * - Tooltips on hover
 * - Disabled state when action unavailable
 */

import React, { useState, useEffect } from 'react';
import './BottomQuickActionBar.css';

function BottomQuickActionBar({
  onSpawnNPC,
  onAdvanceTier,
  onStartExpedition,
  onViewStats,
  onShowHelp,
  currentTier = 'SURVIVAL',
  idleNPCs = 0,
  canAdvanceTier = false
}) {
  const [isHidden, setIsHidden] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only trigger if not typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case '1':
          onSpawnNPC && onSpawnNPC();
          break;
        case '2':
          canAdvanceTier && onAdvanceTier && onAdvanceTier();
          break;
        case '3':
          onStartExpedition && onStartExpedition();
          break;
        case '4':
          onViewStats && onViewStats();
          break;
        case '5':
        case '?':
          onShowHelp && onShowHelp();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [onSpawnNPC, onAdvanceTier, onStartExpedition, onViewStats, onShowHelp, canAdvanceTier]);

  const actions = [
    {
      id: 'spawn-npc',
      icon: '🧑',
      label: 'Spawn NPC',
      shortcut: '1',
      onClick: onSpawnNPC,
      badge: idleNPCs > 0 ? `${idleNPCs}` : null,
      disabled: false,
      tooltip: 'Add new NPC to settlement (Press 1)'
    },
    {
      id: 'advance-tier',
      icon: '🏰',
      label: 'Advance Tier',
      shortcut: '2',
      onClick: onAdvanceTier,
      badge: canAdvanceTier ? 'Ready' : null,
      disabled: !canAdvanceTier || currentTier === 'CASTLE',
      tooltip: canAdvanceTier ? 'Advance to next tier (Press 2)' : 'Not enough resources to advance'
    },
    {
      id: 'expedition',
      icon: '⚔️',
      label: 'Expedition',
      shortcut: '3',
      onClick: onStartExpedition,
      badge: null,
      disabled: false,
      tooltip: 'Start expedition (Press 3)'
    },
    {
      id: 'stats',
      icon: '📊',
      label: 'Stats',
      shortcut: '4',
      onClick: onViewStats,
      badge: null,
      disabled: false,
      tooltip: 'View settlement stats (Press 4)'
    },
    {
      id: 'help',
      icon: '❓',
      label: 'Help',
      shortcut: '5',
      onClick: onShowHelp,
      badge: null,
      disabled: false,
      tooltip: 'Keyboard shortcuts guide (Press ?)'
    }
  ];

  if (isHidden) {
    return (
      <button
        className="bottom-quick-action-bar-show"
        onClick={() => setIsHidden(false)}
        title="Show quick action bar"
        aria-label="Show quick action bar"
      >
        ⌃
      </button>
    );
  }

  return (
    <div className="bottom-quick-action-bar">
      <div className="bottom-quick-action-container">
        {actions.map((action) => (
          <button
            key={action.id}
            className={`bottom-quick-action-button ${action.disabled ? 'disabled' : ''} ${action.badge ? 'has-badge' : ''}`}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.tooltip}
            aria-label={action.tooltip}
          >
            <span className="bottom-action-icon">{action.icon}</span>
            <span className="bottom-action-label">{action.label}</span>
            <span className="bottom-action-shortcut">{action.shortcut}</span>
            {action.badge && (
              <span className="bottom-action-badge">{action.badge}</span>
            )}
          </button>
        ))}

        {/* Hide Button */}
        <button
          className="bottom-action-toggle"
          onClick={() => setIsHidden(true)}
          title="Hide quick action bar"
          aria-label="Hide quick action bar"
        >
          ⌄
        </button>
      </div>
    </div>
  );
}

export default BottomQuickActionBar;
