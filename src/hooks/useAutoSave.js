/**
 * useAutoSave.js - React hook for auto-save functionality
 *
 * Features:
 * - Auto-save integration with visual indicators
 * - Last save timestamp display
 * - Save status (saving, success, error)
 * - Manual save trigger
 * - Enable/disable auto-save
 * - Configurable save interval
 *
 * Usage:
 * const {
 *   lastSaveTime,
 *   isSaving,
 *   saveStatus,
 *   manualSave,
 *   enable,
 *   disable,
 *   isEnabled
 * } = useAutoSave(gameManager, options);
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import AutoSaveManager from '../features/AutoSaveManager';
import { useToast } from './useToast';

/**
 * Default options for auto-save
 */
const DEFAULT_OPTIONS = {
  interval: 60000, // 60 seconds
  enabled: true,
  showToasts: true, // Show toast notifications for saves
  showErrorToasts: true, // Show toast notifications for errors
  slotName: 'autosave'
};

/**
 * useAutoSave hook - Manages auto-save with visual feedback
 * @param {Object} gameManager - GameManager instance
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Auto-save interval in ms (default: 60000)
 * @param {boolean} options.enabled - Initial enabled state (default: true)
 * @param {boolean} options.showToasts - Show toast notifications (default: true)
 * @param {boolean} options.showErrorToasts - Show error toasts (default: true)
 * @param {string} options.slotName - Save slot name (default: 'autosave')
 * @returns {Object} Auto-save state and controls
 */
export function useAutoSave(gameManager, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { showToast } = useToast();

  // Auto-save manager instance
  const autoSaveManagerRef = useRef(null);

  // State
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [lastError, setLastError] = useState(null);
  const [isEnabled, setIsEnabled] = useState(opts.enabled);
  const [saveCount, setSaveCount] = useState(0);

  // Time since last save (updates every second for UI)
  const [timeSinceLastSave, setTimeSinceLastSave] = useState(null);
  const [timeUntilNextSave, setTimeUntilNextSave] = useState(null);

  /**
   * Initialize AutoSaveManager
   */
  useEffect(() => {
    if (!gameManager) {
      console.warn('[useAutoSave] No game manager provided');
      return;
    }

    // Create AutoSaveManager with callbacks
    const manager = new AutoSaveManager(gameManager, {
      interval: opts.interval,
      enabled: opts.enabled,
      slotName: opts.slotName,

      onSaveStart: () => {
        setIsSaving(true);
        setSaveStatus(null);
      },

      onSaveSuccess: (result) => {
        setIsSaving(false);
        setSaveStatus('success');
        setLastSaveTime(Date.now());
        setLastError(null);
        setSaveCount(prev => prev + 1);

        if (opts.showToasts) {
          showToast({
            type: 'success',
            message: 'Game auto-saved',
            duration: 2000
          });
        }
      },

      onSaveError: (error) => {
        setIsSaving(false);
        setSaveStatus('error');
        setLastError(error.message);

        if (opts.showErrorToasts) {
          showToast({
            type: 'error',
            message: `Auto-save failed: ${error.message}`,
            duration: 4000
          });
        }
      }
    });

    autoSaveManagerRef.current = manager;
    manager.start();

    // Cleanup on unmount
    return () => {
      if (autoSaveManagerRef.current) {
        autoSaveManagerRef.current.destroy();
        autoSaveManagerRef.current = null;
      }
    };
  }, [gameManager, opts.interval, opts.enabled, opts.slotName, opts.showToasts, opts.showErrorToasts, showToast]);

  /**
   * Update time displays every second
   */
  useEffect(() => {
    const updateTimer = setInterval(() => {
      if (autoSaveManagerRef.current) {
        const status = autoSaveManagerRef.current.getStatus();
        setTimeSinceLastSave(status.timeSinceLastSave);
        setTimeUntilNextSave(status.timeUntilNextSave);
      }
    }, 1000);

    return () => clearInterval(updateTimer);
  }, []);

  /**
   * Manually trigger a save
   */
  const manualSave = useCallback(async () => {
    if (!autoSaveManagerRef.current) {
      console.warn('[useAutoSave] AutoSaveManager not initialized');
      return { success: false, message: 'Auto-save not initialized' };
    }

    return await autoSaveManagerRef.current.manualSave();
  }, []);

  /**
   * Enable auto-save
   */
  const enable = useCallback(() => {
    if (autoSaveManagerRef.current) {
      autoSaveManagerRef.current.enable();
      setIsEnabled(true);

      if (opts.showToasts) {
        showToast({
          type: 'info',
          message: 'Auto-save enabled',
          duration: 2000
        });
      }
    }
  }, [opts.showToasts, showToast]);

  /**
   * Disable auto-save
   */
  const disable = useCallback(() => {
    if (autoSaveManagerRef.current) {
      autoSaveManagerRef.current.disable();
      setIsEnabled(false);

      if (opts.showToasts) {
        showToast({
          type: 'info',
          message: 'Auto-save disabled',
          duration: 2000
        });
      }
    }
  }, [opts.showToasts, showToast]);

  /**
   * Change auto-save interval
   */
  const setInterval = useCallback((intervalMs) => {
    if (autoSaveManagerRef.current) {
      autoSaveManagerRef.current.setInterval(intervalMs);
    }
  }, []);

  /**
   * Format time for display
   */
  const formatTime = useCallback((ms) => {
    if (ms === null || ms === undefined) return null;

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s ago`;
    } else {
      return `${seconds}s ago`;
    }
  }, []);

  /**
   * Format countdown time
   */
  const formatCountdown = useCallback((ms) => {
    if (ms === null || ms === undefined) return null;

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  return {
    // State
    lastSaveTime,
    isSaving,
    saveStatus,
    lastError,
    isEnabled,
    saveCount,
    timeSinceLastSave,
    timeUntilNextSave,

    // Formatted times for display
    lastSaveDisplay: formatTime(timeSinceLastSave),
    nextSaveDisplay: formatCountdown(timeUntilNextSave),

    // Actions
    manualSave,
    enable,
    disable,
    setInterval,

    // Manager instance (for advanced usage)
    manager: autoSaveManagerRef.current
  };
}

export default useAutoSave;
