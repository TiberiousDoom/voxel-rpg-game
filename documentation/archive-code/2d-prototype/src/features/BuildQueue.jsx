/**
 * BuildQueue.jsx - Building construction queue display
 *
 * Features:
 * - Display all buildings under construction
 * - Progress bars for each building
 * - Time remaining display
 * - Building type and status
 * - Compact and expanded views
 * - Auto-refresh progress
 *
 * Integrates with BuildQueueManager from Module 3
 */

import React, { useState, useEffect } from 'react';
import { buildQueueManager } from '../modules/resource-economy/managers/BuildQueueManager';
import './BuildQueue.css';

/**
 * BuildQueue component - Displays construction queue
 * @param {Object} props
 * @param {boolean} props.compact - Show compact view (default: false)
 * @param {number} props.refreshInterval - Refresh interval in ms (default: 1000)
 * @param {Function} props.onBuildingClick - Callback when building is clicked
 */
function BuildQueue({ compact = false, refreshInterval = 1000, onBuildingClick = () => {} }) {
  const [queueItems, setQueueItems] = useState([]);
  const [isExpanded, setIsExpanded] = useState(!compact);

  /**
   * Update queue display
   */
  const updateQueue = () => {
    const items = buildQueueManager.getAllInQueue();

    // Enrich with current progress
    const enrichedItems = items.map(item => {
      const progress = buildQueueManager.getProgress(item.buildingId);
      return {
        ...item,
        ...progress
      };
    });

    setQueueItems(enrichedItems);
  };

  /**
   * Set up auto-refresh
   */
  useEffect(() => {
    updateQueue();

    const intervalId = setInterval(updateQueue, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  /**
   * Format time remaining
   */
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  /**
   * Format building type for display
   */
  const formatBuildingType = (type) => {
    return type
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  /**
   * Toggle expanded/collapsed view
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // No buildings in queue
  if (queueItems.length === 0) {
    return (
      <div className="build-queue build-queue-empty">
        <div className="build-queue-header">
          <h3 className="build-queue-title">Build Queue</h3>
          <span className="build-queue-count">Empty</span>
        </div>
        <div className="build-queue-content">
          <p className="build-queue-empty-message">No buildings under construction</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`build-queue ${compact ? 'build-queue-compact' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Header */}
      <div className="build-queue-header" onClick={toggleExpanded}>
        <h3 className="build-queue-title">Build Queue</h3>
        <div className="build-queue-header-right">
          <span className="build-queue-count">{queueItems.length}</span>
          <button
            className="build-queue-toggle"
            aria-label={isExpanded ? 'Collapse queue' : 'Expand queue'}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Queue Items */}
      {isExpanded && (
        <div className="build-queue-content">
          <div className="build-queue-items">
            {queueItems.map((item) => (
              <div
                key={item.buildingId}
                className="build-queue-item"
                onClick={() => onBuildingClick(item)}
              >
                {/* Item Header */}
                <div className="build-queue-item-header">
                  <span className="build-queue-item-name">
                    {formatBuildingType(item.type)}
                  </span>
                  <span className="build-queue-item-time">
                    {formatTime(item.timeRemaining)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="build-queue-progress-container">
                  <div
                    className="build-queue-progress-bar"
                    style={{ width: `${item.progress}%` }}
                  />
                  <span className="build-queue-progress-text">
                    {Math.floor(item.progress)}%
                  </span>
                </div>

                {/* Compact mode: just show basic info */}
                {!compact && (
                  <div className="build-queue-item-details">
                    <span className="build-queue-item-id">ID: {item.buildingId.slice(0, 8)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="build-queue-summary">
            <div className="build-queue-summary-item">
              <span className="build-queue-summary-label">Total:</span>
              <span className="build-queue-summary-value">{queueItems.length} building{queueItems.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="build-queue-summary-item">
              <span className="build-queue-summary-label">Total Time:</span>
              <span className="build-queue-summary-value">
                {formatTime(buildQueueManager.getTotalTimeRemaining())}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuildQueue;
