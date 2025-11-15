/**
 * ResourceTooltip.jsx - Enhanced tooltip for resource items
 *
 * Displays detailed information about a resource:
 * - Current amount / Storage capacity
 * - Production rate
 * - Consumption rate
 * - Net rate (production - consumption)
 * - Time to full/empty (if applicable)
 */

import React from 'react';
import './ResourceTooltip.css';

/**
 * ResourceTooltip Component
 *
 * @param {Object} props
 * @param {string} props.name - Resource name
 * @param {string} props.icon - Resource icon/emoji
 * @param {number} props.amount - Current amount
 * @param {number} props.capacity - Storage capacity
 * @param {number} props.production - Production rate per second
 * @param {number} props.consumption - Consumption rate per second
 * @param {boolean} props.visible - Whether tooltip is visible
 */
function ResourceTooltip({
  name,
  icon,
  amount,
  capacity = 1000,
  production = 0,
  consumption = 0,
  visible = false
}) {
  if (!visible) return null;

  const netRate = production - consumption;
  const percentFull = (amount / capacity) * 100;

  // Calculate time to full/empty
  const getTimeEstimate = () => {
    if (Math.abs(netRate) < 0.01) return null;

    if (netRate > 0) {
      // Time to full
      const remaining = capacity - amount;
      if (remaining <= 0) return null;
      const seconds = remaining / netRate;
      return { label: 'Full in', seconds, color: '#22c55e' };
    } else {
      // Time to empty
      if (amount <= 0) return null;
      const seconds = amount / Math.abs(netRate);
      return { label: 'Empty in', seconds, color: '#ef4444' };
    }
  };

  const timeEstimate = getTimeEstimate();

  // Format time duration
  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  // Format number with commas
  const formatNumber = (num) => {
    return Math.floor(num).toLocaleString();
  };

  // Format rate
  const formatRate = (rate) => {
    const sign = rate > 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}/s`;
  };

  return (
    <div className="resource-tooltip">
      <div className="resource-tooltip-header">
        <span className="resource-tooltip-icon">{icon}</span>
        <span className="resource-tooltip-name">{name}</span>
      </div>

      <div className="resource-tooltip-body">
        {/* Storage */}
        <div className="resource-tooltip-row">
          <span className="resource-tooltip-label">Storage:</span>
          <span className="resource-tooltip-value">
            {formatNumber(amount)} / {formatNumber(capacity)}
            <span className="resource-tooltip-percent"> ({percentFull.toFixed(1)}%)</span>
          </span>
        </div>

        {/* Production */}
        <div className="resource-tooltip-row">
          <span className="resource-tooltip-label">Production:</span>
          <span className="resource-tooltip-value resource-tooltip-positive">
            {formatRate(production)}
          </span>
        </div>

        {/* Consumption */}
        <div className="resource-tooltip-row">
          <span className="resource-tooltip-label">Consumption:</span>
          <span className="resource-tooltip-value resource-tooltip-negative">
            {formatRate(consumption)}
          </span>
        </div>

        {/* Net Rate */}
        <div className="resource-tooltip-row resource-tooltip-divider">
          <span className="resource-tooltip-label">Net Rate:</span>
          <span
            className={`resource-tooltip-value resource-tooltip-net ${
              netRate > 0 ? 'resource-tooltip-positive' : netRate < 0 ? 'resource-tooltip-negative' : ''
            }`}
          >
            {formatRate(netRate)}
          </span>
        </div>

        {/* Time Estimate */}
        {timeEstimate && (
          <div className="resource-tooltip-estimate" style={{ color: timeEstimate.color }}>
            {timeEstimate.label}: {formatTime(timeEstimate.seconds)}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResourceTooltip;
