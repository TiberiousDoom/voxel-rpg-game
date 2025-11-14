import React, { useState } from 'react';
import { Star } from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import './AchievementPanel.css';

/**
 * AchievementPanel Component
 * Displays player achievements, progress, and unlocked rewards
 */
function AchievementPanel({ achievementSystem, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!achievementSystem) {
    return null;
  }

  // Get achievement statistics
  const stats = achievementSystem.getStatistics();

  // Get all achievements grouped by category
  const categories = {
    all: 'All',
    building: 'Building',
    resource: 'Resource',
    npc: 'NPC',
    tier: 'Tier',
    survival: 'Survival'
  };

  // Get achievements for selected category
  const achievements = selectedCategory === 'all'
    ? Array.from(achievementSystem.achievements.values())
    : achievementSystem.getAchievementsByCategory(selectedCategory);

  // Get recently unlocked achievements (last 3 for compact view)
  const recentlyUnlocked = achievementSystem.getUnlockedAchievements().slice(0, 3);

  return (
    <CollapsibleSection
      title="Achievements"
      icon="🏆"
      badge={`${stats.unlockedAchievements}/${stats.totalAchievements}`}
      defaultExpanded={false}
      className="achievement-panel-collapsible"
    >
      <div className="achievement-panel-content">
        {/* Compact Progress Bar */}
        <div className="achievement-progress-compact">
          <div className="achievement-progress-bar">
            <div
              className="achievement-progress-fill"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
          <span className="achievement-progress-percentage">
            {stats.completionPercentage.toFixed(1)}%
          </span>
        </div>

        {/* Recently Unlocked - Compact */}
        {recentlyUnlocked.length > 0 && (
          <div className="achievement-recent-compact">
            <h4 className="section-subtitle">Recent</h4>
            <div className="achievement-recent-list-compact">
              {recentlyUnlocked.map(achievement => (
                <div key={achievement.id} className="achievement-recent-item-compact">
                  <span className="achievement-icon-small">{achievement.icon}</span>
                  <span className="achievement-name-small">{achievement.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter - Compact */}
        <div className="achievement-categories-compact">
          {Object.entries(categories).map(([key, label]) => (
            <button
              key={key}
              className={`achievement-category-btn-compact ${selectedCategory === key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Achievement List - Compact */}
        <div className="achievement-list-compact">
          {achievements.slice(0, 5).map(achievement => (
            <AchievementCardCompact
              key={achievement.id}
              achievement={achievement}
            />
          ))}
          {achievements.length > 5 && (
            <div className="achievement-more-indicator">
              +{achievements.length - 5} more achievements
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}

/**
 * AchievementCardCompact Component
 * Compact version of achievement display
 */
function AchievementCardCompact({ achievement }) {
  return (
    <div
      className={`achievement-card-compact ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}
      title={achievement.description}
    >
      <span className="achievement-icon-compact">
        {achievement.isUnlocked ? achievement.icon : '🔒'}
      </span>
      <div className="achievement-info-compact">
        <div className="achievement-name-compact">{achievement.name}</div>
        {!achievement.isUnlocked && achievement.progress > 0 && (
          <div className="achievement-progress-bar-mini">
            <div
              className="achievement-progress-fill-mini"
              style={{ width: `${achievement.progress}%` }}
            />
          </div>
        )}
      </div>
      {achievement.isUnlocked && (
        <Star size={14} className="achievement-star-compact" />
      )}
    </div>
  );
}

export default AchievementPanel;
