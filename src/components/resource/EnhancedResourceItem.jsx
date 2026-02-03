/**
 * EnhancedResourceItem.jsx - Visual resource bars with dynamic colors
 *
 * Features:
 * - Animated fill bars with smooth transitions
 * - Color coding: Green (80-100%), Teal (60-80%), Yellow (40-60%), Orange (20-40%), Red (0-20%)
 * - Production arrows: ↑ Green (positive), ↓ Red (negative), ↔ Gray (neutral)
 * - Glow effects when resources change rapidly
 * - Pulse animation on critical resources
 * - Glassmorphism effect
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import './EnhancedResourceItem.css';

/**
 * EnhancedResourceItem - Memoized for performance in resource lists
 * Re-renders only when amount, capacity, or productionRate changes
 */
const EnhancedResourceItem = memo(function EnhancedResourceItem({
  name,
  icon,
  amount = 0,
  capacity = 500,
  productionRate = 0
}) {
  const [displayAmount, setDisplayAmount] = useState(amount);
  const [isChanging, setIsChanging] = useState(false);
  const prevAmountRef = useRef(amount);

  // Animate value changes
  useEffect(() => {
    const diff = amount - displayAmount;
    if (Math.abs(diff) > 0.1) {
      const increment = diff / 10;
      const timer = setTimeout(() => {
        setDisplayAmount(prev => prev + increment);
      }, 30);
      return () => clearTimeout(timer);
    } else {
      setDisplayAmount(amount);
    }
  }, [amount, displayAmount]);

  // Detect rapid changes for glow effect
  useEffect(() => {
    if (Math.abs(amount - prevAmountRef.current) > 5) {
      setIsChanging(true);
      const timer = setTimeout(() => setIsChanging(false), 1000);
      return () => clearTimeout(timer);
    }
    prevAmountRef.current = amount;
  }, [amount]);

  // Calculate percentage
  const percentage = Math.min((displayAmount / capacity) * 100, 100);

  // Get color based on percentage
  const getResourceColor = (percent) => {
    if (percent >= 80) return { bg: '#10b981', name: 'green', label: 'Plenty' };
    if (percent >= 60) return { bg: '#14b8a6', name: 'teal', label: 'Comfortable' };
    if (percent >= 40) return { bg: '#f59e0b', name: 'yellow', label: 'Getting low' };
    if (percent >= 20) return { bg: '#fb923c', name: 'orange', label: 'Warning' };
    return { bg: '#ef4444', name: 'red', label: 'Critical' };
  };

  const colorInfo = getResourceColor(percentage);

  // Get production arrow
  const getProductionArrow = () => {
    if (productionRate > 0) {
      return { arrow: '↑', color: '#10b981', label: 'Producing' };
    } else if (productionRate < 0) {
      return { arrow: '↓', color: '#ef4444', label: 'Consuming' };
    } else {
      return { arrow: '↔', color: '#64748b', label: 'Neutral' };
    }
  };

  const production = getProductionArrow();

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return Math.floor(num).toString();
  };

  const formatRate = (rate) => {
    const absRate = Math.abs(rate);
    if (absRate >= 1000) return `${(absRate / 1000).toFixed(1)}K/s`;
    return `${absRate.toFixed(1)}/s`;
  };

  return (
    <div className={`enhanced-resource-item ${isChanging ? 'glowing' : ''} ${percentage < 20 ? 'critical-pulse' : ''}`}>
      {/* Resource Header */}
      <div className="resource-header">
        <span className="resource-icon">{icon}</span>
        <span className="resource-name">{name}</span>
        <div
          className="production-arrow"
          style={{ color: production.color }}
          title={production.label}
        >
          {production.arrow} {productionRate !== 0 && formatRate(productionRate)}
        </div>
      </div>

      {/* Animated Progress Bar */}
      <div className="resource-bar-container">
        <div
          className={`resource-bar-fill ${colorInfo.name}`}
          style={{
            width: `${percentage}%`,
            backgroundColor: colorInfo.bg
          }}
        >
          {percentage > 15 && (
            <span className="bar-value">{formatNumber(displayAmount)}/{formatNumber(capacity)}</span>
          )}
        </div>
      </div>

      {/* Resource Info */}
      <div className="resource-info">
        <span className="resource-amount">{formatNumber(displayAmount)}/{formatNumber(capacity)}</span>
        <span className={`resource-status ${colorInfo.name}`}>{colorInfo.label}</span>
      </div>
    </div>
  );
});

export default EnhancedResourceItem;
