/**
 * StatusEffectsPanel.jsx - Active status effects display
 *
 * Shows:
 * - Icon + description + value
 * - Positive effects (green border)
 * - Negative effects (red border)
 * - Progress bar for temporary effects
 * - Tooltip with full details
 * - Settlement health
 */

import React, { memo, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import './StatusEffectsPanel.css';

/**
 * StatusEffectsPanel - Memoized for performance
 * Re-renders only when gameState changes
 */
const StatusEffectsPanel = memo(function StatusEffectsPanel({ compact = false }) {
  const { gameState } = useGame();

  // Get NPCs for calculations
  const npcs = gameState.npcs || [];
  const veterans = npcs.filter(npc => npc.isVeteran).length;
  const totalNPCs = npcs.length;
  const avgCombatLevel = npcs.reduce((sum, npc) => sum + (npc.combatLevel || 0), 0) / (totalNPCs || 1);

  // Get morale
  const morale = gameState.morale || 100;

  // Get settlement health
  const settlementHealth = gameState.settlementHealth || 1000;
  const maxSettlementHealth = 1000;

  // Get resources
  const resources = gameState.resources || {};

  // Calculate effects with useMemo for performance
  const effects = useMemo(() => {
    const effectsList = [];

    // Veterans bonus
    if (veterans > 0) {
      effectsList.push({
        id: 'veterans',
        icon: '💪',
        name: 'Veterans',
        value: `+${veterans * 5}% production`,
        type: 'positive',
        description: `${veterans} veteran NPCs providing production bonus`
      });
    }

    // Combat level bonus
    if (avgCombatLevel > 1) {
      effectsList.push({
        id: 'combat-level',
        icon: '⚔️',
        name: 'Combat Training',
        value: `+${(avgCombatLevel * 0.5).toFixed(1)}% production`,
        type: 'positive',
        description: `Average combat level: ${avgCombatLevel.toFixed(1)}`
      });
    }

    // High morale
    if (morale >= 80) {
      effectsList.push({
        id: 'high-morale',
        icon: '😊',
        name: 'High Morale',
        value: '+5% all',
        type: 'positive',
        description: `Morale at ${morale}% - NPCs are happy!`
      });
    }

    // Low morale
    if (morale < 40) {
      effectsList.push({
        id: 'low-morale',
        icon: '😟',
        name: 'Low Morale',
        value: '-10% production',
        type: 'negative',
        description: `Morale at ${morale}% - NPCs are unhappy`
      });
    }

    // Low food warning
    if (resources.food < 100) {
      effectsList.push({
        id: 'low-food',
        icon: '⚠️',
        name: 'Low Food',
        value: '-10% morale',
        type: 'negative',
        description: `Food running low (${Math.floor(resources.food)})`
      });
    }

    // Settlement health
    const healthPercent = (settlementHealth / maxSettlementHealth) * 100;
    const healthStatus = healthPercent >= 80 ? 'positive' : healthPercent >= 50 ? 'neutral' : 'negative';
    effectsList.push({
      id: 'settlement-health',
      icon: '🏰',
      name: 'Settlement Health',
      value: `${Math.floor(settlementHealth)}/${maxSettlementHealth}`,
      type: healthStatus,
      description: `Settlement structural integrity`,
      progress: healthPercent
    });

    return effectsList;
  }, [veterans, avgCombatLevel, morale, resources.food, settlementHealth, maxSettlementHealth]);

  if (compact) {
    // Compact view - show only count
    const positiveCount = effects.filter(e => e.type === 'positive').length;
    const negativeCount = effects.filter(e => e.type === 'negative').length;

    return (
      <div className="status-effects-compact">
        {positiveCount > 0 && (
          <div className="status-count positive" title={`${positiveCount} positive effects`}>
            ✓ {positiveCount}
          </div>
        )}
        {negativeCount > 0 && (
          <div className="status-count negative" title={`${negativeCount} negative effects`}>
            ✗ {negativeCount}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="status-effects-panel">
      <div className="status-effects-header">
        <span className="status-icon">✨</span>
        <h3>Active Effects</h3>
      </div>

      <div className="status-effects-list">
        {effects.length === 0 ? (
          <div className="no-effects">
            <p>No active effects</p>
          </div>
        ) : (
          effects.map((effect) => (
            <div
              key={effect.id}
              className={`status-effect-item ${effect.type}`}
              title={effect.description}
            >
              <span className="effect-icon">{effect.icon}</span>
              <div className="effect-info">
                <span className="effect-name">{effect.name}</span>
                <span className="effect-value">{effect.value}</span>
              </div>
              {effect.progress !== undefined && (
                <div className="effect-progress">
                  <div
                    className="effect-progress-fill"
                    style={{ width: `${effect.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default StatusEffectsPanel;
