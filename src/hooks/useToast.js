/**
 * useToast.js - Custom hook for managing toast notifications
 *
 * Features:
 * - Add/remove toasts
 * - Auto-dismiss
 * - Type variants
 * - Stacking
 *
 * @returns {Object} Toast state and control functions
 */

import { useState, useCallback } from 'react';

let toastIdCounter = 0;

/**
 * Custom hook for toast management
 * @returns {Object} { notifications, showToast, hideToast, clearAll }
 */
function useToast() {
  const [notifications, setNotifications] = useState([]);

  /**
   * Show toast notification
   * @param {Object} config - Toast configuration
   * @param {string} config.type - Toast type: 'success', 'error', 'info', 'warning' (default: 'info')
   * @param {string} config.message - Toast message
   * @param {string} config.title - Toast title (optional)
   * @param {number} config.duration - Auto-dismiss duration in ms (default: 3000, 0 = no auto-dismiss)
   * @param {string} config.icon - Custom icon (optional)
   * @param {boolean} config.showProgress - Show progress bar (default: true)
   */
  const showToast = useCallback((config = {}) => {
    const {
      type = 'info',
      message = '',
      title = '',
      duration = 3000,
      icon = null,
      showProgress = true
    } = config;

    const id = `toast-${++toastIdCounter}`;

    const newNotification = {
      id,
      type,
      message,
      title,
      duration,
      icon,
      showProgress
    };

    setNotifications((prev) => [...prev, newNotification]);

    return id;
  }, []);

  /**
   * Hide specific toast
   * @param {string} id - Toast ID
   */
  const hideToast = useCallback((id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  /**
   * Clear all toasts
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Convenience methods for different types
   */
  const success = useCallback((message, title = '', duration = 3000) => {
    return showToast({ type: 'success', message, title, duration });
  }, [showToast]);

  const error = useCallback((message, title = '', duration = 4000) => {
    return showToast({ type: 'error', message, title, duration });
  }, [showToast]);

  const info = useCallback((message, title = '', duration = 3000) => {
    return showToast({ type: 'info', message, title, duration });
  }, [showToast]);

  const warning = useCallback((message, title = '', duration = 3500) => {
    return showToast({ type: 'warning', message, title, duration });
  }, [showToast]);

  return {
    notifications,
    showToast,
    hideToast,
    clearAll,
    success,
    error,
    info,
    warning
  };
}

export default useToast;
