import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, X } from 'lucide-react';
import './AchievementNotification.css';

/**
 * AchievementNotification Component
 * Displays a toast notification when an achievement is unlocked
 */
function AchievementNotification({ achievements, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [queue, setQueue] = useState([]);

  // Add new achievements to queue
  useEffect(() => {
    if (achievements && achievements.length > 0) {
      setQueue(prev => [...prev, ...achievements]);
    }
  }, [achievements]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setCurrentAchievement(null);
      if (onDismiss) {
        onDismiss();
      }
    }, 300); // Wait for fade-out animation
  }, [onDismiss]);

  // Show next achievement from queue
  useEffect(() => {
    if (queue.length > 0 && !currentAchievement) {
      const next = queue[0];
      setCurrentAchievement(next);
      setQueue(prev => prev.slice(1));
      setVisible(true);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [queue, currentAchievement, handleDismiss]);

  if (!currentAchievement) {
    return null;
  }

  return (
    <div className={`achievement-notification ${visible ? 'visible' : ''}`}>
      <div className="achievement-notification-content">
        <div className="achievement-notification-header">
          <Trophy size={24} className="achievement-notification-trophy" />
          <span className="achievement-notification-title">Achievement Unlocked!</span>
          <button
            className="achievement-notification-close"
            onClick={handleDismiss}
          >
            <X size={16} />
          </button>
        </div>
        <div className="achievement-notification-body">
          <span className="achievement-notification-icon">{currentAchievement.icon}</span>
          <div className="achievement-notification-info">
            <h4 className="achievement-notification-name">{currentAchievement.name}</h4>
            <p className="achievement-notification-description">
              {currentAchievement.description}
            </p>
            {currentAchievement.reward && currentAchievement.reward.type !== 'cosmetic' && (
              <div className="achievement-notification-reward">
                <span className="achievement-notification-reward-label">Reward:</span>
                {currentAchievement.reward.type === 'multiplier' &&
                  Object.entries(currentAchievement.reward.value).map(([key, val]) => (
                    <span key={key} className="achievement-notification-reward-value">
                      +{(val * 100).toFixed(0)}% {key}
                    </span>
                  ))
                }
                {currentAchievement.reward.type === 'unlock' && (
                  <span className="achievement-notification-reward-value">
                    Unlocked: {currentAchievement.reward.value.building || 'Special Feature'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AchievementNotification;
