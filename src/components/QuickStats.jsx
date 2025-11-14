/**
 * QuickStats.jsx - Quick statistics dashboard
 *
 * Shows key game metrics at a glance:
 * - NPCs (total/max)
 * - Buildings (count)
 * - Territory (size)
 * - Active Events
 * - Achievement Progress
 */

import React from 'react';
import './QuickStats.css';

/**
 * QuickStats component
 */
function QuickStats({
  npcCount = 0,
  maxNpcs = 10,
  buildingCount = 0,
  territorySize = 0,
  activeEvents = 0,
  achievementProgress = { unlocked: 0, total: 50 }
}) {
  const stats = [
    {
      icon: '👥',
      label: 'NPCs',
      value: `${npcCount}/${maxNpcs}`,
      color: '#4CAF50'
    },
    {
      icon: '🏠',
      label: 'Buildings',
      value: buildingCount,
      color: '#2196F3'
    },
    {
      icon: '🗺️',
      label: 'Territory',
      value: territorySize,
      color: '#FF9800'
    },
    {
      icon: '⚡',
      label: 'Events',
      value: activeEvents,
      color: activeEvents > 0 ? '#F44336' : '#9E9E9E'
    },
    {
      icon: '🏆',
      label: 'Achievements',
      value: `${achievementProgress.unlocked}/${achievementProgress.total}`,
      color: '#9C27B0'
    }
  ];

  return (
    <div className="quick-stats">
      {stats.map((stat, index) => (
        <div key={index} className="stat-item">
          <span className="stat-icon" style={{ color: stat.color }}>
            {stat.icon}
          </span>
          <div className="stat-info">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default QuickStats;
