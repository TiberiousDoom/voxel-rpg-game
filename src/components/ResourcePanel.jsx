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
import CollapsibleSection from './CollapsibleSection';
import CompactResourceItem from './CompactResourceItem';
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

  // Calculate total resource count for badge
  const totalResources = resourceList.reduce(
    (sum, resource) => sum + (resources[resource.key] || 0),
    0
  );

  return (
    <CollapsibleSection
      title="Resources"
      icon="💰"
      badge={Math.floor(totalResources).toLocaleString()}
      defaultExpanded={true}
      className="resource-panel-collapsible"
    >
      <div className="compact-resources-list">
        {resourceList.map((resource) => {
          const amount = resources[resource.key] || 0;
          return (
            <CompactResourceItem
              key={resource.key}
              resource={resource}
              amount={amount}
              max={1000}
            />
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

export default ResourcePanel;
