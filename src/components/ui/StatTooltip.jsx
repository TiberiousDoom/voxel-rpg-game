/**
 * StatTooltip.jsx
 * Tooltip showing stat breakdown (base + attributes + equipment)
 */

import React from 'react';
import './StatTooltip.css';

const StatTooltip = ({ stat, value, breakdown, position = 'right' }) => {
  if (!breakdown) return null;

  const getStatIcon = (statName) => {
    const icons = {
      health: '❤️',
      mana: '✨',
      stamina: '⚡',
      damage: '⚔️',
      defense: '🛡️',
      speed: '🏃',
      critChance: '💥',
    };
    return icons[statName] || '📊';
  };

  const getAttributeIcon = (attr) => {
    const icons = {
      combat: '⚔️',
      magic: '✨',
      endurance: '🛡️',
      exploration: '🧭',
      leadership: '👑',
      construction: '🔨',
    };
    return icons[attr] || '⚡';
  };

  return (
    <div className={`stat-tooltip stat-tooltip-${position}`}>
      <div className="stat-tooltip-header">
        <span className="stat-tooltip-icon">{getStatIcon(stat)}</span>
        <span className="stat-tooltip-title">{stat}</span>
        <span className="stat-tooltip-total">{Math.round(value)}</span>
      </div>

      <div className="stat-tooltip-divider" />

      <div className="stat-tooltip-breakdown">
        {/* Base value */}
        {breakdown.base !== undefined && (
          <div className="stat-tooltip-row">
            <span className="stat-tooltip-label">Base</span>
            <span className="stat-tooltip-value">+{Math.round(breakdown.base)}</span>
          </div>
        )}

        {/* Attribute bonuses */}
        {breakdown.attributes && Object.keys(breakdown.attributes).length > 0 && (
          <>
            <div className="stat-tooltip-section-header">From Attributes:</div>
            {Object.entries(breakdown.attributes).map(([attr, bonus]) => (
              bonus !== 0 && (
                <div key={attr} className="stat-tooltip-row attribute-bonus">
                  <span className="stat-tooltip-label">
                    {getAttributeIcon(attr)} {attr}
                  </span>
                  <span className="stat-tooltip-value positive">
                    +{typeof bonus === 'number' ? Math.round(bonus) : bonus}
                  </span>
                </div>
              )
            ))}
          </>
        )}

        {/* Equipment bonuses */}
        {breakdown.equipment && Object.keys(breakdown.equipment).length > 0 && (
          <>
            <div className="stat-tooltip-section-header">From Equipment:</div>
            {Object.entries(breakdown.equipment).map(([item, bonus]) => (
              bonus !== 0 && (
                <div key={item} className="stat-tooltip-row equipment-bonus">
                  <span className="stat-tooltip-label">{item}</span>
                  <span className="stat-tooltip-value positive">
                    +{Math.round(bonus)}
                  </span>
                </div>
              )
            ))}
          </>
        )}

        {/* Skill bonuses */}
        {breakdown.skills && breakdown.skills !== 0 && (
          <div className="stat-tooltip-row skill-bonus">
            <span className="stat-tooltip-label">🌟 Skills</span>
            <span className="stat-tooltip-value positive">
              +{Math.round(breakdown.skills)}
            </span>
          </div>
        )}

        {/* Percentage modifiers */}
        {breakdown.multiplier && breakdown.multiplier !== 1 && (
          <div className="stat-tooltip-row multiplier">
            <span className="stat-tooltip-label">Multiplier</span>
            <span className="stat-tooltip-value special">
              ×{breakdown.multiplier.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Soft cap warning */}
      {breakdown.softCapped && (
        <div className="stat-tooltip-warning">
          ⚠️ Soft cap reached - reduced effectiveness
        </div>
      )}

      {/* Tip */}
      <div className="stat-tooltip-tip">
        Press <kbd>C</kbd> to open Character Sheet
      </div>
    </div>
  );
};

export default StatTooltip;
