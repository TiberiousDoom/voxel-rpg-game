import React, { useState } from 'react';
import { Trophy, Star, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import './AchievementPanel.css';

/**
 * AchievementPanel Component
 * Displays player achievements, progress, and unlocked rewards
 */
function AchievementPanel({ achievementSystem, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isExpanded, setIsExpanded] = useState(true);

  if (!achievementSystem) {
    return null;
  }

  // Get achievement statistics
  const stats = achievementSystem.getStatistics();

  // Get all achievements grouped by category
  const categories = {
    all: 'All Achievements',
    building: 'Building',
    resource: 'Resource',
    npc: 'NPC',
    tier: 'Tier Progression',
    survival: 'Survival'
  };

  // Get achievements for selected category
  const achievements = selectedCategory === 'all'
    ? Array.from(achievementSystem.achievements.values())
    : achievementSystem.getAchievementsByCategory(selectedCategory);

  // Get recently unlocked achievements (last 5)
  const recentlyUnlocked = achievementSystem.getUnlockedAchievements().slice(0, 5);

  return (
    <div className="achievement-panel">
      <div className="achievement-panel-header">
        <div className="achievement-panel-title">
          <Trophy size={20} />
          <h3>Achievements</h3>
        </div>
        <div className="achievement-panel-stats">
          <span className="achievement-count">
            {stats.unlockedAchievements} / {stats.totalAchievements}
          </span>
          <span className="achievement-percentage">
            ({stats.completionPercentage.toFixed(1)}%)
          </span>
        </div>
        <button
          className="achievement-panel-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Progress Bar */}
          <div className="achievement-progress-bar">
            <div
              className="achievement-progress-fill"
              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>

          {/* Recently Unlocked */}
          {recentlyUnlocked.length > 0 && (
            <div className="achievement-recent">
              <h4>Recently Unlocked</h4>
              <div className="achievement-recent-list">
                {recentlyUnlocked.map(achievement => (
                  <div key={achievement.id} className="achievement-recent-item">
                    <span className="achievement-icon">{achievement.icon}</span>
                    <span className="achievement-name">{achievement.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="achievement-categories">
            {Object.entries(categories).map(([key, label]) => (
              <button
                key={key}
                className={`achievement-category-btn ${selectedCategory === key ? 'active' : ''}`}
                onClick={() => setSelectedCategory(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Achievement List */}
          <div className="achievement-list">
            {achievements.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * AchievementCard Component
 * Displays a single achievement with progress
 */
function AchievementCard({ achievement }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="achievement-card-header">
        <span className="achievement-card-icon">
          {achievement.isUnlocked ? achievement.icon : <Lock size={20} />}
        </span>
        <div className="achievement-card-info">
          <h4 className="achievement-card-name">{achievement.name}</h4>
          <p className="achievement-card-description">{achievement.description}</p>
        </div>
        {achievement.isUnlocked && (
          <Star size={20} className="achievement-unlocked-star" />
        )}
      </div>

      {/* Progress Bar for locked achievements */}
      {!achievement.isUnlocked && (
        <div className="achievement-card-progress">
          <div className="achievement-progress-bar small">
            <div
              className="achievement-progress-fill"
              style={{ width: `${achievement.progress}%` }}
            />
          </div>
          <span className="achievement-progress-text">
            {achievement.getProgressDescription()}
          </span>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="achievement-card-details">
          <div className="achievement-detail-row">
            <span className="achievement-detail-label">Category:</span>
            <span className="achievement-detail-value">{achievement.category}</span>
          </div>
          {achievement.reward && achievement.reward.type !== 'cosmetic' && (
            <div className="achievement-detail-row">
              <span className="achievement-detail-label">Reward:</span>
              <span className="achievement-detail-value">
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
          {achievement.isUnlocked && (
            <div className="achievement-detail-row">
              <span className="achievement-detail-label">Unlocked:</span>
              <span className="achievement-detail-value">
                {new Date(achievement.unlockedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AchievementPanel;
