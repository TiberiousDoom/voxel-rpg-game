/**
 * Notification.jsx - Individual notification component
 *
 * Features:
 * - Slide-in animation
 * - Type-based colors
 * - Pulsing glow effect
 * - Click to dismiss
 */

import React, { useState, useEffect } from 'react';
import './Notification.css';

function Notification({ notification, index, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const { type = 'info', title, description, extra, reward, icon } = notification;

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Handle dismiss
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  // Get type-specific styling
  const getTypeStyles = () => {
    switch (type) {
      case 'achievement':
        return {
          bg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(59, 130, 246, 0.9))',
          border: '#3b82f6',
          glow: 'rgba(59, 130, 246, 0.5)'
        };
      case 'raid':
        return {
          bg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(239, 68, 68, 0.9))',
          border: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.5)'
        };
      case 'levelup':
        return {
          bg: 'linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(168, 85, 247, 0.9))',
          border: '#a855f7',
          glow: 'rgba(168, 85, 247, 0.5)'
        };
      case 'success':
        return {
          bg: 'linear-gradient(135deg, rgba(5, 150, 105, 0.9), rgba(16, 185, 129, 0.9))',
          border: '#10b981',
          glow: 'rgba(16, 185, 129, 0.5)'
        };
      case 'warning':
        return {
          bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.9), rgba(245, 158, 11, 0.9))',
          border: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.5)'
        };
      default: // info
        return {
          bg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.9), rgba(59, 130, 246, 0.9))',
          border: '#3b82f6',
          glow: 'rgba(59, 130, 246, 0.5)'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`notification notification-${type} ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}
      style={{
        background: styles.bg,
        borderColor: styles.border,
        boxShadow: `0 0 20px ${styles.glow}, 0 4px 12px rgba(0, 0, 0, 0.3)`,
        top: `${index * 110 + 20}px`
      }}
      onClick={handleDismiss}
    >
      {/* Close Button */}
      <button
        className="notification-close"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        aria-label="Dismiss notification"
      >
        ✕
      </button>

      {/* Icon */}
      <div className="notification-icon">
        {icon}
      </div>

      {/* Content */}
      <div className="notification-content">
        <h3 className="notification-title">{title}</h3>
        <p className="notification-description">{description}</p>
        {extra && <p className="notification-extra">{extra}</p>}
        {reward && <div className="notification-reward">{reward}</div>}
      </div>

      {/* Glow effect */}
      <div
        className="notification-glow"
        style={{ boxShadow: `0 0 40px ${styles.glow}` }}
      />
    </div>
  );
}

export default Notification;
