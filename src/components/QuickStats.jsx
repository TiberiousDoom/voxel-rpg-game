import React, { memo } from 'react';
import './QuickStats.css';

/**
 * QuickStats Component - Memoized for performance
 * Compact overview of critical game information
 * Re-renders only when resources, NPCs, achievements, or tier change
 *
 * @param {object} resources - Game resources
 * @param {array} npcs - NPCs array
 * @param {object} achievementStats - Achievement statistics
 * @param {string} currentTier - Current tier
 */
const QuickStats = memo(function QuickStats({ resources = {}, npcs = [], achievementStats = null, currentTier = 'SURVIVAL' }) {
  // Helper to format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return Math.floor(num).toString();
  };

  // Key resources to display
  const keyResources = [
    { key: 'food', icon: '🌾' },
    { key: 'wood', icon: '🪵' },
    { key: 'stone', icon: '🪨' },
    { key: 'gold', icon: '⭐' }
  ];

  // NPC stats
  const workingNPCs = npcs.filter(npc => npc.assignedBuilding).length;
  const totalNPCs = npcs.length;

  // Achievement stats
  const unlockedAchievements = achievementStats?.unlockedAchievements || 0;
  const totalAchievements = achievementStats?.totalAchievements || 0;

  return (
    <div className="quick-stats">
      <div className="quick-stats-header">
        <h3 className="quick-stats-title">Quick Stats</h3>
      </div>

      <div className="quick-stats-grid">
        {/* Key Resources Row */}
        <div className="quick-stats-row">
          {keyResources.map(res => (
            <div key={res.key} className="quick-stat-item" title={`${res.key}: ${Math.floor(resources[res.key] || 0)}`}>
              <span className="quick-stat-icon">{res.icon}</span>
              <span className="quick-stat-value">{formatNumber(resources[res.key] || 0)}</span>
            </div>
          ))}
        </div>

        {/* NPCs and Achievements Row */}
        <div className="quick-stats-row">
          <div className="quick-stat-item" title={`Working NPCs: ${workingNPCs} / Total: ${totalNPCs}`}>
            <span className="quick-stat-icon">👥</span>
            <span className="quick-stat-value">{workingNPCs}/{totalNPCs}</span>
          </div>
          <div className="quick-stat-item" title={`Achievements: ${unlockedAchievements} / ${totalAchievements}`}>
            <span className="quick-stat-icon">🏆</span>
            <span className="quick-stat-value">{unlockedAchievements}/{totalAchievements}</span>
          </div>
          <div className="quick-stat-item" title={`Current Tier: ${currentTier}`}>
            <span className="quick-stat-icon">⚡</span>
            <span className="quick-stat-value">{currentTier.charAt(0)}{currentTier.slice(1).charAt(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default QuickStats;
