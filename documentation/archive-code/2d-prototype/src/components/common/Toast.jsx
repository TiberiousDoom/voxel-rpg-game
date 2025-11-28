/**
 * Toast.jsx - Toast notification container
 *
 * Features:
 * - Stackable notifications
 * - Position options (top-right, top-left, bottom-right, bottom-left, top-center, bottom-center)
 * - Auto-dismiss
 * - Maximum notification limit
 */

import React from 'react';
import Notification from './Notification';
import './Toast.css';

/**
 * Toast container component
 * @param {Object} props
 * @param {Array} props.notifications - Array of notification objects
 * @param {Function} props.onClose - Close callback
 * @param {string} props.position - Toast position (default: 'top-right')
 * @param {number} props.maxNotifications - Max visible notifications (default: 5)
 */
function Toast({
  notifications = [],
  onClose = () => {},
  position = 'top-right',
  maxNotifications = 5
}) {
  // Limit number of visible notifications
  const visibleNotifications = notifications.slice(-maxNotifications);

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={`toast-container toast-${position}`} aria-live="polite" aria-atomic="false">
      {visibleNotifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

export default Toast;
