/**
 * Notification.jsx - Individual toast notification component
 *
 * Used by Toast.jsx container for stackable notifications.
 * Props: id, type, message, title, icon, duration, onClose, showProgress
 */

import React, { useEffect, useRef } from 'react';

function Notification({
  id,
  type = 'info',
  message,
  title,
  icon,
  duration = 0,
  onClose = () => {},
  showProgress = false,
}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        onClose(id);
      }, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, id, onClose]);

  return (
    <div className={`notification notification-${type}`} role="alert">
      {icon && <span className="notification-icon">{icon}</span>}
      <div className="notification-body">
        {title && <strong className="notification-title">{title}</strong>}
        <span className="notification-message">{message}</span>
      </div>
      <button
        className="notification-close"
        aria-label="Close notification"
        onClick={() => onClose(id)}
      >
        &times;
      </button>
      {showProgress && duration > 0 && (
        <div className="notification-progress" />
      )}
    </div>
  );
}

export default Notification;
