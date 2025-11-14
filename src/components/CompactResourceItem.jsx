/**
 * CompactResourceItem.jsx - Compact single-line resource display
 *
 * Features:
 * - Single-line layout (~24px height)
 * - Abbreviated numbers (1.2K, 3.5M)
 * - Mini inline progress bar
 * - Hover tooltip with full details
 */

import React, { useState } from 'react';
import './CompactResourceItem.css';

/**
 * Format number with K/M abbreviations
 */
function formatCompactNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return Math.floor(num).toString();
}

/**
 * Compact resource item component
 */
function CompactResourceItem({ resource, amount, max = 1000 }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const percentage = Math.min((amount / max) * 100, 100);
  const displayAmount = formatCompactNumber(amount);

  return (
    <div
      className="compact-resource-item"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="compact-resource-icon">{resource.icon}</span>
      <span className="compact-resource-name">{resource.name}</span>
      <span className="compact-resource-amount">{displayAmount}</span>

      <div className="compact-resource-bar-container">
        <div
          className="compact-resource-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: resource.color
          }}
        />
      </div>

      {showTooltip && (
        <div className="compact-resource-tooltip">
          <div className="tooltip-header">
            <span>{resource.icon} {resource.name}</span>
          </div>
          <div className="tooltip-body">
            <div className="tooltip-row">
              <span>Amount:</span>
              <strong>{Math.floor(amount)}</strong>
            </div>
            <div className="tooltip-row">
              <span>Max Display:</span>
              <strong>{max}</strong>
            </div>
            <div className="tooltip-row">
              <span>Percentage:</span>
              <strong>{percentage.toFixed(1)}%</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompactResourceItem;
