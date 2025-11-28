/**
 * ResourceItem.jsx - Individual resource display with animations and trends
 *
 * Features:
 * - Animated count-up/down when values change
 * - Trend indicators (↑/↓/→)
 * - Color-coded resource levels (red/yellow/green)
 * - Progress bar for storage capacity
 * - Enhanced tooltip on hover
 * - Responsive design
 */

import React, { useState } from 'react';
import { useResourceAnimation, useResourceTrend } from '../../hooks/useResourceAnimation';
import TrendIndicator from './TrendIndicator';
import ResourceTooltip from './ResourceTooltip';
import './ResourceItem.css';

/**
 * ResourceItem Component
 *
 * @param {Object} props
 * @param {string} props.name - Resource name (e.g., 'Food', 'Wood')
 * @param {string} props.icon - Resource icon/emoji
 * @param {number} props.amount - Current resource amount
 * @param {number} props.capacity - Maximum storage capacity (default: 1000)
 * @param {string} props.color - Resource color for progress bar
 * @param {number} props.production - Production rate per second (default: 0)
 * @param {number} props.consumption - Consumption rate per second (default: 0)
 * @param {boolean} props.showTrend - Whether to show trend indicator (default: true)
 * @param {boolean} props.showTooltip - Whether to show tooltip on hover (default: true)
 */
function ResourceItem({
  name,
  icon,
  amount = 0,
  capacity = 1000,
  color = '#6366f1',
  production = 0,
  consumption = 0,
  showTrend = true,
  showTooltip = true
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Animate value changes
  const animatedValue = useResourceAnimation(amount, {
    duration: 600,
    easing: 'easeOut'
  });

  // Track resource trend
  const trend = useResourceTrend(amount, 1000);

  // Calculate percentage and determine status color
  const percentage = Math.min((amount / capacity) * 100, 100);
  const getStatusColor = () => {
    if (percentage >= 75) return 'high';
    if (percentage >= 25) return 'medium';
    return 'low';
  };
  const statusColor = getStatusColor();

  // Format display value
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return Math.floor(num).toString();
  };

  // Handle mouse enter for tooltip
  const handleMouseEnter = (e) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      className={`resource-item resource-status-${statusColor}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="status"
      aria-label={`${name}: ${Math.floor(amount)} out of ${capacity}`}
    >
      {/* Icon */}
      <div className="resource-item-icon">
        {icon}
      </div>

      {/* Content */}
      <div className="resource-item-content">
        {/* Top row: Name and Trend */}
        <div className="resource-item-header">
          <span className="resource-item-name">{name}</span>
          {showTrend && (
            <TrendIndicator trend={trend} showValue={false} size="small" />
          )}
        </div>

        {/* Middle row: Value */}
        <div className="resource-item-value">
          <span className="resource-item-amount">
            {formatNumber(animatedValue)}
          </span>
          <span className="resource-item-capacity">
            / {formatNumber(capacity)}
          </span>
        </div>

        {/* Bottom row: Progress Bar */}
        <div className="resource-item-progress">
          <div
            className="resource-item-progress-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>

        {/* Percentage Badge */}
        <div className="resource-item-percentage">
          {percentage.toFixed(0)}%
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div
          className="resource-tooltip-container"
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <ResourceTooltip
            name={name}
            icon={icon}
            amount={amount}
            capacity={capacity}
            production={production}
            consumption={consumption}
            visible={true}
          />
        </div>
      )}
    </div>
  );
}

export default ResourceItem;
