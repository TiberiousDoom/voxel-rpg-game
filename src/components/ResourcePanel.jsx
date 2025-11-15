/**
 * ResourcePanel.jsx - Display current game resources (Enhanced)
 *
 * Shows:
 * - Food, Wood, Stone, Gold, Essence, Crystal
 * Enhanced display with animations, trends, and tooltips
 *
 * Phase 4 WF1 Enhancements:
 * - Animated resource counters with count-up/down effects
 * - Trend indicators (↑/↓/→) showing production/consumption rates
 * - Color-coded resource levels (red/yellow/green)
 * - Progress bars for storage capacity
 * - Enhanced tooltips with detailed information
 * - Responsive design (mobile/tablet/desktop)
 */

import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import ResourceItem from './resource/ResourceItem';
import './ResourcePanel.css';

/**
 * Resource display component - Enhanced version
 *
 * @param {Object} props
 * @param {Object} props.resources - Current resource amounts
 * @param {Object} props.production - Production rates per second (optional)
 * @param {Object} props.consumption - Consumption rates per second (optional)
 * @param {Object} props.capacity - Storage capacities (optional)
 */
function ResourcePanel({
  resources = {},
  production = {},
  consumption = {},
  capacity = {}
}) {
  const resourceList = [
    { name: 'Food', key: 'food', icon: '🌾', color: '#f59e0b' },
    { name: 'Wood', key: 'wood', icon: '🪵', color: '#92400e' },
    { name: 'Stone', key: 'stone', icon: '🪨', color: '#78716c' },
    { name: 'Gold', key: 'gold', icon: '⭐', color: '#fbbf24' },
    { name: 'Essence', key: 'essence', icon: '✨', color: '#a855f7' },
    { name: 'Crystal', key: 'crystal', icon: '💎', color: '#06b6d4' }
  ];

  // Default capacity per resource
  const defaultCapacity = 1000;

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
      <div className="resources-enhanced">
        {resourceList.map((resource) => {
          const amount = resources[resource.key] || 0;
          const resourceCapacity = capacity[resource.key] || defaultCapacity;
          const resourceProduction = production[resource.key] || 0;
          const resourceConsumption = consumption[resource.key] || 0;

          return (
            <ResourceItem
              key={resource.key}
              name={resource.name}
              icon={resource.icon}
              amount={amount}
              capacity={resourceCapacity}
              color={resource.color}
              production={resourceProduction}
              consumption={resourceConsumption}
              showTrend={true}
              showTooltip={true}
            />
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

export default ResourcePanel;
