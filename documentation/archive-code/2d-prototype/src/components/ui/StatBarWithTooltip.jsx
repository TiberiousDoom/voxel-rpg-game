/**
 * StatBarWithTooltip.jsx
 * Stat bar component with hover tooltip showing breakdown
 */

import React, { useState } from 'react';
import StatTooltip from './StatTooltip';
import './StatBarWithTooltip.css';

const StatBarWithTooltip = ({
  icon,
  iconColor,
  label,
  current,
  max,
  gradientColors,
  statName,
  breakdown,
  isMobile = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const percentage = (current / max) * 100;

  return (
    <div
      className="stat-bar-container"
      onMouseEnter={() => !isMobile && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="stat-bar-header">
        <div className="stat-bar-label">
          {React.cloneElement(icon, { size: isMobile ? 16 : 20, style: { marginRight: isMobile ? '4px' : '8px', color: iconColor } })}
          <span>{Math.round(current)} / {max}</span>
        </div>
        {!isMobile && showTooltip && label && (
          <div className="stat-bar-hint">Hover for details</div>
        )}
      </div>

      <div className="stat-bar-track">
        <div
          className="stat-bar-fill"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${gradientColors[0]}, ${gradientColors[1]})`,
          }}
        />
      </div>

      {/* Tooltip */}
      {showTooltip && breakdown && (
        <StatTooltip
          stat={statName}
          value={max}
          breakdown={breakdown}
          position="right"
        />
      )}
    </div>
  );
};

export default StatBarWithTooltip;
