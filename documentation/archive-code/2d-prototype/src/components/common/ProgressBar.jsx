/**
 * ProgressBar.jsx - Progress indicator component
 *
 * Features:
 * - Determinate and indeterminate modes
 * - Multiple color variants
 * - Size options
 * - Optional label
 * - Animated transitions
 */

import React from 'react';
import './ProgressBar.css';

/**
 * ProgressBar component
 * @param {Object} props
 * @param {number} props.value - Progress value (0-100)
 * @param {number} props.max - Maximum value (default: 100)
 * @param {string} props.variant - Color variant: 'default', 'success', 'warning', 'danger', 'health', 'mana', 'stamina', 'xp' (default: 'default')
 * @param {string} props.size - Size: 'small', 'medium', 'large' (default: 'medium')
 * @param {boolean} props.showLabel - Shows percentage label
 * @param {string} props.label - Custom label text
 * @param {boolean} props.indeterminate - Shows indeterminate animation
 * @param {boolean} props.animated - Animates value changes
 * @param {string} props.className - Additional CSS classes
 */
function ProgressBar({
  value = 0,
  max = 100,
  variant = 'default',
  size = 'medium',
  showLabel = false,
  label,
  indeterminate = false,
  animated = true,
  className = '',
  ...rest
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const displayLabel = label || `${Math.round(percentage)}%`;

  return (
    <div
      className={`progress-bar progress-bar-${size} ${className}`}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={displayLabel}
      {...rest}
    >
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill progress-bar-${variant} ${animated ? 'progress-bar-animated' : ''} ${indeterminate ? 'progress-bar-indeterminate' : ''}`}
          style={indeterminate ? undefined : { width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="progress-bar-label">{displayLabel}</span>
      )}
    </div>
  );
}

/**
 * ProgressRing - Circular progress indicator
 */
function ProgressRing({
  value = 0,
  max = 100,
  size = 48,
  strokeWidth = 4,
  variant = 'default',
  showLabel = false,
  className = '',
  ...rest
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`progress-ring progress-ring-${variant} ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...rest}
    >
      <svg width={size} height={size}>
        <circle
          className="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showLabel && (
        <span className="progress-ring-label">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

ProgressBar.Ring = ProgressRing;

export default ProgressBar;
