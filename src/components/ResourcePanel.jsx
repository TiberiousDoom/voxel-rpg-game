/**
 * ResourcePanel.jsx - Display current game resources (COMPACT)
 *
 * Shows:
 * - Food, Wood, Stone, Gold, Essence, Crystal
 * Compact one-line display with mini progress bars
 */

import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import './ResourcePanel.css';

/**
 * Resource display component - Compact version
 */
function ResourcePanel({ resources = {} }) {
  const resourceList = [
    { name: 'Food', key: 'food', icon: '🌾', color: '#FFD700' },
    { name: 'Wood', key: 'wood', icon: '🪵', color: '#8B4513' },
    { name: 'Stone', key: 'stone', icon: '🪨', color: '#A9A9A9' },
    { name: 'Gold', key: 'gold', icon: '⭐', color: '#FFD700' },
    { name: 'Essence', key: 'essence', icon: '✨', color: '#9370DB' },
    { name: 'Crystal', key: 'crystal', icon: '💎', color: '#00CED1' }
  ];

  // Helper to format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return Math.floor(num).toString();
  };

  // Calculate total resources for badge
  const totalResources = resourceList.reduce((sum, res) => sum + (resources[res.key] || 0), 0);

  return (
    <CollapsibleSection
      title="Resources"
      icon="💰"
      badge={formatNumber(totalResources)}
      defaultExpanded={true}
    >
      <div className="resources-compact">
        {resourceList.map((resource) => {
          const amount = resources[resource.key] || 0;
          const percentage = Math.min((amount / 1000) * 100, 100);

          return (
            <div
              key={resource.key}
              className="resource-compact-item"
              title={`${resource.name}: ${Math.floor(amount)} (${percentage.toFixed(1)}%)`}
            >
              <span className="resource-compact-icon">{resource.icon}</span>
              <span className="resource-compact-value">{formatNumber(amount)}</span>
              <div className="resource-compact-bar">
                <div
                  className="resource-compact-fill"
                  style={{
                    width: `${percentage}%`,
                    background: resource.color
                  }}
                />
              </div>
              <span className="resource-compact-percent">{percentage.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

export default ResourcePanel;
