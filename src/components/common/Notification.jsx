/**
 * Notification.jsx - Single notification component
 *
 * Features:
 * - Type variants (success, error, info, warning)
 * - Auto-dismiss timer
 * - Close button
 * - Progress bar
 * - Icon support
 */

import React, { useEffect, useState } from 'react';
import './Notification.css';

/**
 * Notification component
 * @param {Object} props
 * @param {string} props.id - Notification ID
 * @param {string} props.type - Notification type: 'success', 'error', 'info', 'warning' (default: 'info')
 * @param {string} props.message - Notification message
 * @param {string} props.title - Notification title (optional)
 * @param {number} props.duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @param {Function} props.onClose - Close callback
 * @param {string} props.icon - Custom icon (optional)
 * @param {boolean} props.showProgress - Show progress bar (default: true)
 */
function Notification({
  id,
  type = 'info',
  message = '',
  title = '',
  duration = 3000,
  onClose = () => {},
  icon = null,
  showProgress = true
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  // Default icons for each type
  const defaultIcons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  const displayIcon = icon || defaultIcons[type] || defaultIcons.info;

  // Handle auto-dismiss
  useEffect(() => {
    if (duration > 0) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);

        if (elapsed >= duration) {
          clearInterval(interval);
          handleClose();
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  return (
    <div
      className={`notification notification-${type} ${isExiting ? 'notification-exit' : ''}`}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={`notification-icon notification-icon-${type}`}>
        {displayIcon}
      </div>

      {/* Content */}
      <div className="notification-content">
        {title && (
          <div className="notification-title">{title}</div>
        )}
        <div className="notification-message">{message}</div>
      </div>

      {/* Close Button */}
      <button
        type="button"
        className="notification-close"
        onClick={handleClose}
        aria-label="Close notification"
      >
        <span aria-hidden="true">×</span>
      </button>

      {/* Progress Bar */}
      {showProgress && duration > 0 && (
        <div className="notification-progress">
          <div
            className={`notification-progress-bar notification-progress-${type}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default Notification;
