/**
 * TrendIndicator.jsx - Visual indicator for resource production/consumption trends
 *
 * Shows:
 * - ↑ (green) for increasing resources (production > consumption)
 * - ↓ (red) for decreasing resources (consumption > production)
 * - → (gray) for stable resources (no change)
 */

import React from 'react';
import './TrendIndicator.css';

/**
 * TrendIndicator Component
 *
 * @param {Object} props
 * @param {number} props.trend - Rate of change per second (positive=increase, negative=decrease, 0=stable)
 * @param {boolean} props.showValue - Whether to display the numeric trend value (default: false)
 * @param {string} props.size - Size variant ('small', 'medium', 'large') (default: 'medium')
 */
function TrendIndicator({ trend = 0, showValue = false, size = 'medium' }) {
  // Determine trend direction
  const getTrendType = () => {
    if (Math.abs(trend) < 0.1) return 'stable'; // Threshold for "stable"
    return trend > 0 ? 'increasing' : 'decreasing';
  };

  const trendType = getTrendType();

  // Get appropriate icon and color
  const getIcon = () => {
    switch (trendType) {
      case 'increasing':
        return '↑';
      case 'decreasing':
        return '↓';
      case 'stable':
      default:
        return '→';
    }
  };

  // Format trend value for display
  const formatTrend = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 100) return `${value > 0 ? '+' : ''}${Math.floor(value)}`;
    if (absValue >= 10) return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
    if (absValue >= 1) return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
    if (absValue > 0.1) return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
    return '0';
  };

  return (
    <div
      className={`trend-indicator trend-${trendType} trend-size-${size}`}
      title={`${trendType === 'increasing' ? 'Increasing' : trendType === 'decreasing' ? 'Decreasing' : 'Stable'} at ${formatTrend(trend)}/s`}
      aria-label={`Resource trend: ${trendType} at ${formatTrend(trend)} per second`}
    >
      <span className="trend-icon">{getIcon()}</span>
      {showValue && (
        <span className="trend-value">{formatTrend(trend)}/s</span>
      )}
    </div>
  );
}

export default TrendIndicator;
