/**
 * ResourcePanel.jsx - Display current game resources
 *
 * Shows:
 * - Food
 * - Wood
 * - Stone
 * - Gold
 * - Essence
 * - Crystal
 */

import React from 'react';
import './ResourcePanel.css';

/**
 * Resource display component
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

  return (
    <div className="resource-panel">
      <h3 className="panel-title">Resources</h3>
      <div className="resources-grid">
        {resourceList.map((resource) => {
          const amount = resources[resource.key] || 0;
          return (
            <div key={resource.key} className="resource-item">
              <div className="resource-icon">{resource.icon}</div>
              <div className="resource-info">
                <div className="resource-name">{resource.name}</div>
                <div className="resource-amount">{Math.floor(amount)}</div>
              </div>
              <div
                className="resource-bar"
                style={{
                  background: `linear-gradient(90deg, ${resource.color} ${Math.min(
                    (amount / 1000) * 100,
                    100
                  )}%, #E0E0E0 ${Math.min((amount / 1000) * 100, 100)}%)`
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="resource-footer">
        <p className="resource-note">Resources are consumed by NPCs and buildings</p>
      </div>
    </div>
  );
}

export default ResourcePanel;
