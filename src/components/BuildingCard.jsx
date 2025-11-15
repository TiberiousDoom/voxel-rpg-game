/**
 * BuildingCard.jsx - Improved building card with tooltips and better hierarchy
 *
 * Features:
 * - Larger, readable fonts (12px minimum)
 * - Icon + name on same line
 * - Resource icons for cost
 * - Description in tooltip, not always visible
 * - Building counter badge
 * - Better visual states
 */

import React, { useState } from 'react';
import './BuildingCard.css';

// Resource icons map
const RESOURCE_ICONS = {
  wood: '🪵',
  stone: '🪨',
  food: '🌾',
  gold: '💰',
  iron: '⚒️'
};

function BuildingCard({
  building,
  isSelected = false,
  isLocked = false,
  placedCount = 0,
  onSelect = () => {},
  buildingConfig = null
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left,
      y: rect.top
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleClick = () => {
    if (!isLocked) {
      onSelect(isSelected ? null : building.type);
    }
  };

  // Get full building details if available
  const getFullDetails = () => {
    if (!buildingConfig) {
      return {
        description: building.description || '',
        production: {},
        consumption: {},
        workSlots: 0
      };
    }

    try {
      const config = buildingConfig.getConfig(building.type);
      return {
        description: config.description || building.description || '',
        production: config.production || {},
        consumption: config.consumption || {},
        workSlots: config.workSlots || 0
      };
    } catch (err) {
      return {
        description: building.description || '',
        production: {},
        consumption: {},
        workSlots: 0
      };
    }
  };

  const details = getFullDetails();
  const hasProduction = Object.keys(details.production).length > 0;
  const hasConsumption = Object.keys(details.consumption).length > 0;

  return (
    <div className="building-card-wrapper">
      <button
        className={`building-card ${isSelected ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={isLocked}
        title={isLocked ? `Requires ${building.tier} tier` : ''}
      >
        {/* Header: Icon + Name */}
        <div className="building-header">
          <span className="building-icon">{building.icon}</span>
          <span className="building-name">{building.name}</span>
          {placedCount > 0 && (
            <span className="building-badge">{placedCount}</span>
          )}
        </div>

        {/* Cost: Resource icons */}
        {!isLocked && building.cost && Object.keys(building.cost).length > 0 && (
          <div className="building-cost">
            {Object.entries(building.cost)
              .filter(([, amount]) => amount > 0)
              .map(([resource, amount]) => (
                <div key={resource} className="cost-item" title={resource}>
                  <span className="cost-icon">
                    {RESOURCE_ICONS[resource.toLowerCase()] || '📦'}
                  </span>
                  <span className="cost-amount">{amount}</span>
                </div>
              ))}
          </div>
        )}

        {/* Locked indicator */}
        {isLocked && (
          <div className="building-locked-indicator">🔒 Locked</div>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isLocked && (
        <div className="building-tooltip" style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`
        }}>
          <div className="tooltip-header">
            <span className="tooltip-icon">{building.icon}</span>
            <h3 className="tooltip-title">{building.name}</h3>
          </div>

          {/* Description */}
          <p className="tooltip-description">{details.description}</p>

          {/* Cost section */}
          {building.cost && Object.keys(building.cost).length > 0 && (
            <div className="tooltip-section">
              <h4 className="tooltip-section-title">Cost</h4>
              <ul className="tooltip-list">
                {Object.entries(building.cost)
                  .filter(([, amount]) => amount > 0)
                  .map(([resource, amount]) => (
                    <li key={resource}>
                      {RESOURCE_ICONS[resource.toLowerCase()] || '📦'} {amount} {resource}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Production section */}
          {hasProduction && (
            <div className="tooltip-section">
              <h4 className="tooltip-section-title">Produces</h4>
              <ul className="tooltip-list">
                {Object.entries(details.production)
                  .filter(([, amount]) => amount > 0)
                  .map(([resource, amount]) => (
                    <li key={resource}>
                      {RESOURCE_ICONS[resource.toLowerCase()] || '📦'} {amount} {resource}/tick
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Consumption section */}
          {hasConsumption && (
            <div className="tooltip-section">
              <h4 className="tooltip-section-title">Consumes</h4>
              <ul className="tooltip-list">
                {Object.entries(details.consumption)
                  .filter(([, amount]) => amount > 0)
                  .map(([resource, amount]) => (
                    <li key={resource}>
                      {RESOURCE_ICONS[resource.toLowerCase()] || '📦'} {amount} {resource}/tick
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Work slots section */}
          {details.workSlots > 0 && (
            <div className="tooltip-section">
              <h4 className="tooltip-section-title">Work Slots</h4>
              <p className="tooltip-value">{details.workSlots} NPC{details.workSlots !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BuildingCard;
