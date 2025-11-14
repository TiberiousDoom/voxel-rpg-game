import React, { useState } from 'react';
import { Star, Lock } from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import './AchievementPanel.css';

/**
 * AchievementPanel Component (COMPACT)
 * Displays player achievements, progress, and unlocked rewards
 */
function AchievementPanel({ achievementSystem, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFullList, setShowFullList] = useState(false);

  if (!achievementSystem) {
    return null;
  }

  // Get achievement statistics
  const stats = achievementSystem.getStatistics();

  // Get all achievements grouped by category
  const categories = {
    all: 'All',
    building: 'Build',
    resource: 'Resource',
    npc: 'NPC',
    tier: 'Tier',
    survival: 'Survival'
  };

  // Get achievements for selected category
  const achievements = selectedCategory === 'all'
    ? Array.from(achievementSystem.achievements.values())
    : achievementSystem.getAchievementsByCategory(selectedCategory);

  // Get recently unlocked and in-progress achievements
  const recentlyUnlocked = achievementSystem.getUnlockedAchievements().slice(0, 3);
  const inProgress = achievements
    .filter(a => !a.isUnlocked && a.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  return (
    <CollapsibleSection
      title="Achievements"
      icon="🏆"
      badge={`${stats.unlockedAchievements}/${stats.totalAchievements}`}
      defaultExpanded={false}
      className="achievement-panel-compact"
    >
      <div className="achievement-panel-content">
        {/* Progress Bar */}
        <div className="achievement-progress-overview">
          <div className="achievement-progress-bar-compact">
            <div
              className="achievement-progress-fill-compact"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>
          <span className="achievement-progress-text-compact">
            {stats.completionPercentage.toFixed(0)}% Complete
          </span>
        </div>

        {/* Recently Unlocked */}
        {recentlyUnlocked.length > 0 && (
          <div className="achievement-section-compact">
            <div className="achievement-section-title">Recently Unlocked</div>
            {recentlyUnlocked.map(achievement => (
              <div key={achievement.id} className="achievement-item-compact unlocked">
                <span className="achievement-icon-compact">{achievement.icon}</span>
                <span className="achievement-name-compact">{achievement.name}</span>
                <Star size={14} className="achievement-star-compact" />
              </div>
            ))}
          </div>
        )}

        {/* In Progress */}
        {inProgress.length > 0 && (
          <div className="achievement-section-compact">
            <div className="achievement-section-title">In Progress</div>
            {inProgress.map(achievement => (
              <div key={achievement.id} className="achievement-item-compact">
                <span className="achievement-icon-compact">
                  <Lock size={16} />
                </span>
                <div className="achievement-progress-info">
                  <span className="achievement-name-compact">{achievement.name}</span>
                  <div className="achievement-mini-progress">
                    <div
                      className="achievement-mini-progress-fill"
                      style={{ width: `${achievement.progress}%` }}
                    />
                  </div>
                </div>
                <span className="achievement-progress-percent">{achievement.progress.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* View All Button */}
        <button
          className="achievement-view-all-btn"
          onClick={() => setShowFullList(!showFullList)}
        >
          {showFullList ? '▲ Show Less' : `▼ View All (${achievements.length})`}
        </button>

        {/* Full Achievement List */}
        {showFullList && (
          <>
            {/* Category Filter */}
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

            {/* Achievement List */}
            <div className="achievement-list-compact">
              {achievements.map(achievement => (
                <AchievementCardCompact
                  key={achievement.id}
                  achievement={achievement}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}

/**
 * AchievementCardCompact Component
 * Compact display of a single achievement
 */
function AchievementCardCompact({ achievement }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`achievement-card-compact ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="achievement-card-compact-header">
        <span className="achievement-card-icon-compact">
          {achievement.isUnlocked ? achievement.icon : <Lock size={16} />}
        </span>
        <div className="achievement-card-info-compact">
          <span className="achievement-card-name-compact">{achievement.name}</span>
          {!achievement.isUnlocked && (
            <div className="achievement-card-progress-bar">
              <div
                className="achievement-card-progress-fill"
                style={{ width: `${achievement.progress}%` }}
              />
            </div>
          )}
        </div>
        {achievement.isUnlocked && (
          <Star size={14} className="achievement-unlocked-star-compact" />
        )}
        {!achievement.isUnlocked && (
          <span className="achievement-progress-value-compact">{achievement.progress.toFixed(0)}%</span>
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="achievement-card-details-compact">
          <p className="achievement-card-description-compact">{achievement.description}</p>
          <div className="achievement-detail-row-compact">
            <span className="achievement-detail-label-compact">Category:</span>
            <span className="achievement-detail-value-compact">{achievement.category}</span>
          </div>
          {achievement.reward && achievement.reward.type !== 'cosmetic' && (
            <div className="achievement-detail-row-compact">
              <span className="achievement-detail-label-compact">Reward:</span>
              <span className="achievement-detail-value-compact">
                {achievement.reward.type === 'multiplier' &&
                  Object.entries(achievement.reward.value).map(([key, val]) =>
                    `+${(val * 100).toFixed(0)}% ${key}`
                  ).join(', ')
                }
                {achievement.reward.type === 'unlock' &&
                  `Unlock: ${achievement.reward.value.building || 'Special Feature'}`
                }
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AchievementPanel;
