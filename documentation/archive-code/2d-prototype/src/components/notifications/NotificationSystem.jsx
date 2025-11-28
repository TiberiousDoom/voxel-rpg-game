/**
 * NotificationSystem.jsx - Animated notification system
 *
 * Notification Types:
 * - Achievement (Blue) - Achievement unlocked
 * - Raid (Red) - Raid warning/approaching
 * - LevelUp (Purple) - NPC level up
 * - Success (Green) - General success
 * - Warning (Yellow) - Warnings
 * - Info (Blue) - Information
 *
 * Features:
 * - Slide in from top-right
 * - Pulsing glow border
 * - Auto-dismiss after 5 seconds
 * - Stack multiple notifications
 * - Click to dismiss
 */

import React, { useState, useEffect } from 'react';
import Notification from './Notification';
import './NotificationSystem.css';

let notificationId = 0;

function NotificationSystem() {
  const [notifications, setNotifications] = useState([]);

  // Expose global function to add notifications
  useEffect(() => {
    window.addNotification = (notification) => {
      const id = ++notificationId;
      const newNotification = {
        id,
        ...notification,
        timestamp: Date.now()
      };

      setNotifications(prev => [...prev, newNotification]);

      // Auto-dismiss after duration (default 5 seconds)
      const duration = notification.duration || 5000;
      if (duration > 0) {
        setTimeout(() => {
          dismissNotification(id);
        }, duration);
      }
    };

    return () => {
      delete window.addNotification;
    };
  }, []);

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="notification-system">
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id}
          notification={notification}
          index={index}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </div>
  );
}

export default NotificationSystem;

// Helper functions for common notification types
export const showAchievementNotification = (title, description, reward) => {
  if (window.addNotification) {
    window.addNotification({
      type: 'achievement',
      title,
      description,
      reward,
      icon: '🏆'
    });
  }
};

export const showRaidNotification = (raidType, wave, totalWaves, difficulty) => {
  if (window.addNotification) {
    window.addNotification({
      type: 'raid',
      title: 'RAID APPROACHING!',
      description: `${raidType} - Wave ${wave}/${totalWaves}`,
      extra: `Difficulty: ${difficulty}`,
      icon: '⚔️',
      duration: 7000
    });
  }
};

export const showLevelUpNotification = (npcName, level, statsGained) => {
  if (window.addNotification) {
    window.addNotification({
      type: 'levelup',
      title: 'LEVEL UP!',
      description: `${npcName} reached Level ${level}`,
      extra: statsGained,
      icon: '✨'
    });
  }
};

export const showSuccessNotification = (title, description) => {
  if (window.addNotification) {
    window.addNotification({
      type: 'success',
      title,
      description,
      icon: '✓'
    });
  }
};

export const showWarningNotification = (title, description) => {
  if (window.addNotification) {
    window.addNotification({
      type: 'warning',
      title,
      description,
      icon: '⚠️'
    });
  }
};

export const showInfoNotification = (title, description) => {
  if (window.addNotification) {
    window.addNotification({
      type: 'info',
      title,
      description,
      icon: 'ℹ️'
    });
  }
};
