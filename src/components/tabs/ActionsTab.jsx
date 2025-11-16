/**
 * ActionsTab.jsx - Quick actions tab
 *
 * Provides quick access to:
 * - Spawn NPC
 * - Advance tier
 * - Auto-assign NPCs
 * - Start expedition
 * - Save/Load game
 * - Other common actions
 */

import React from 'react';
import { useGame } from '../../context/GameContext';
import './ActionsTab.css';

function ActionsTab({ onSpawnNPC, onAdvanceTier, onAutoAssignNPCs }) {
  const { gameState, actions } = useGame();

  // Get game stats
  const npcs = gameState.npcs || [];
  const idleNPCs = npcs.filter(npc => !npc.assignedBuilding && !npc.assignedBuildingId && !npc.isDead).length;
  const currentTier = gameState.currentTier || 'SURVIVAL';

  // Quick action configurations
  const quickActions = [
    {
      id: 'spawn-npc',
      icon: '🧑',
      label: 'Spawn NPC',
      description: 'Add new NPC to settlement',
      action: onSpawnNPC || (() => actions.spawnNPC('WORKER')),
      color: '#10b981',
      badge: null,
      enabled: true
    },
    {
      id: 'auto-assign',
      icon: '⚡',
      label: 'Auto-Assign',
      description: 'Assign all idle NPCs',
      action: onAutoAssignNPCs || actions.autoAssignNPCs,
      color: '#3b82f6',
      badge: idleNPCs > 0 ? idleNPCs : null,
      enabled: idleNPCs > 0
    },
    {
      id: 'advance-tier',
      icon: '🏰',
      label: 'Advance Tier',
      description: 'Progress to next tier',
      action: onAdvanceTier || (() => {/* Advance tier - to be implemented */}),
      color: '#8b5cf6',
      badge: null,
      enabled: currentTier !== 'CASTLE'
    },
    {
      id: 'save-game',
      icon: '💾',
      label: 'Save Game',
      description: 'Save current progress',
      action: () => actions.saveGame('auto-save'),
      color: '#f59e0b',
      badge: null,
      enabled: true
    }
  ];

  // Resource actions
  const resourceActions = [
    {
      id: 'add-food',
      icon: '🌾',
      label: '+100 Food',
      description: 'Debug: Add food',
      action: () => {/* Debug action - to be implemented */},
      color: '#f59e0b',
      debug: true
    },
    {
      id: 'add-wood',
      icon: '🪵',
      label: '+100 Wood',
      description: 'Debug: Add wood',
      action: () => {/* Debug action - to be implemented */},
      color: '#92400e',
      debug: true
    },
    {
      id: 'add-stone',
      icon: '🪨',
      label: '+100 Stone',
      description: 'Debug: Add stone',
      action: () => {/* Debug action - to be implemented */},
      color: '#78716c',
      debug: true
    },
    {
      id: 'add-gold',
      icon: '⭐',
      label: '+100 Gold',
      description: 'Debug: Add gold',
      action: () => {/* Debug action - to be implemented */},
      color: '#fbbf24',
      debug: true
    }
  ];

  return (
    <div className="actions-tab">
      {/* Quick Actions Section */}
      <div className="actions-section">
        <div className="actions-header">
          <span className="actions-icon">⚡</span>
          <h3>Quick Actions</h3>
        </div>
        <div className="action-grid">
          {quickActions.map(action => (
            <button
              key={action.id}
              className={`action-button ${!action.enabled ? 'disabled' : ''}`}
              onClick={action.action}
              disabled={!action.enabled}
              style={{ '--action-color': action.color }}
            >
              <span className="action-icon">{action.icon}</span>
              <div className="action-info">
                <span className="action-label">{action.label}</span>
                <span className="action-description">{action.description}</span>
              </div>
              {action.badge && (
                <span className="action-badge">{action.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Game Info Section */}
      <div className="actions-section info">
        <div className="actions-header">
          <span className="actions-icon">ℹ️</span>
          <h3>Game Info</h3>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Current Tier</span>
            <span className="info-value">{currentTier}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Total NPCs</span>
            <span className="info-value">{npcs.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Idle NPCs</span>
            <span className="info-value yellow">{idleNPCs}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Buildings</span>
            <span className="info-value">{(gameState.buildings || []).length}</span>
          </div>
        </div>
      </div>

      {/* Debug Actions (Optional) */}
      <div className="actions-section debug">
        <div className="actions-header">
          <span className="actions-icon">🐛</span>
          <h3>Debug Actions</h3>
        </div>
        <div className="action-grid compact">
          {resourceActions.map(action => (
            <button
              key={action.id}
              className="action-button-small"
              onClick={action.action}
              style={{ '--action-color': action.color }}
            >
              <span className="action-icon-small">{action.icon}</span>
              <span className="action-label-small">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="actions-section">
        <div className="actions-header">
          <span className="actions-icon">⌨️</span>
          <h3>Keyboard Shortcuts</h3>
        </div>
        <div className="shortcuts-list">
          <div className="shortcut-item">
            <kbd className="shortcut-key">Space</kbd>
            <span className="shortcut-desc">Pause/Resume</span>
          </div>
          <div className="shortcut-item">
            <kbd className="shortcut-key">N</kbd>
            <span className="shortcut-desc">Spawn NPC</span>
          </div>
          <div className="shortcut-item">
            <kbd className="shortcut-key">B</kbd>
            <span className="shortcut-desc">Build Menu</span>
          </div>
          <div className="shortcut-item">
            <kbd className="shortcut-key">D</kbd>
            <span className="shortcut-desc">Debug Panel</span>
          </div>
          <div className="shortcut-item">
            <kbd className="shortcut-key">Tab</kbd>
            <span className="shortcut-desc">Cycle Tabs</span>
          </div>
          <div className="shortcut-item">
            <kbd className="shortcut-key">Esc</kbd>
            <span className="shortcut-desc">Cancel/Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActionsTab;
