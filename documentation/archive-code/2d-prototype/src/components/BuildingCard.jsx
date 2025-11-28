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
 * - Construction attribute cost reduction display
 */

import React, { useState, useMemo, memo } from 'react';
import useGameStore from '../stores/useGameStore';
import { BuildingIntegration } from '../utils/integrations/BuildingIntegration';
import './BuildingCard.css';

// Resource icons map
const RESOURCE_ICONS = {
  wood: '🪵',
  stone: '🪨',
  food: '🌾',
  gold: '💰',
  iron: '⚒️'
};

/**
 * BuildingCard - Memoized for performance in building lists
 * Re-renders only when building data, selection state, or count changes
 */
const BuildingCard = memo(function BuildingCard({
  building,
  isSelected = false,
  isLocked = false,
  placedCount = 0,
  onSelect = () => {},
  buildingConfig = null,
  displayMode = 'compact' // 'compact' or 'detailed'
}) {
  const character = useGameStore((state) => state.character);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Calculate actual cost with Construction bonuses
  const actualCost = useMemo(() => {
    if (!building.cost || !character) {
      return building.cost || {};
    }

    return BuildingIntegration.calculateBuildingCost(
      {
        baseCost: building.cost,
        type: building.type,
        category: building.category,
      },
      character
    );
  }, [building.cost, building.type, building.category, character]);

  // Calculate cost savings percentage
  const costSavings = useMemo(() => {
    if (!building.cost || !character) return 0;

    const baseCost = building.cost;
    const totalBase = Object.values(baseCost).reduce((sum, val) => sum + val, 0);
    const totalActual = Object.values(actualCost).reduce((sum, val) => sum + val, 0);

    if (totalBase === 0) return 0;

    const savingsPercent = ((totalBase - totalActual) / totalBase) * 100;
    return Math.round(savingsPercent);
  }, [building.cost, actualCost, character]);

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
        className={`building-card ${isSelected ? 'active' : ''} ${isLocked ? 'locked' : ''} ${displayMode}`}
        onClick={handleClick}
        onMouseEnter={displayMode === 'compact' ? handleMouseEnter : undefined}
        onMouseLeave={displayMode === 'compact' ? handleMouseLeave : undefined}
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

        {/* Description - shown in detailed mode */}
        {displayMode === 'detailed' && !isLocked && (
          <p className="building-description-text">{building.description || 'No description'}</p>
        )}

        {/* Cost: Resource icons */}
        {!isLocked && actualCost && Object.keys(actualCost).length > 0 && (
          <div className="building-cost">
            {Object.entries(actualCost)
              .filter(([, amount]) => amount > 0)
              .map(([resource, amount]) => (
                <div key={resource} className="cost-item" title={resource}>
                  <span className="cost-icon">
                    {RESOURCE_ICONS[resource.toLowerCase()] || '📦'}
                  </span>
                  <span className="cost-amount">{Math.ceil(amount)}</span>
                </div>
              ))}
            {costSavings > 0 && (
              <div className="cost-savings" title={`${costSavings}% discount from Construction`}>
                <span className="savings-icon">🔨</span>
                <span className="savings-text">-{costSavings}%</span>
              </div>
            )}
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
          {actualCost && Object.keys(actualCost).length > 0 && (
            <div className="tooltip-section">
              <h4 className="tooltip-section-title">Cost</h4>
              <ul className="tooltip-list">
                {Object.entries(actualCost)
                  .filter(([, amount]) => amount > 0)
                  .map(([resource, amount]) => {
                    const baseCostAmount = building.cost?.[resource] || amount;
                    const hasDiscount = baseCostAmount > amount;
                    return (
                      <li key={resource}>
                        {RESOURCE_ICONS[resource.toLowerCase()] || '📦'}{' '}
                        {hasDiscount && <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{Math.ceil(baseCostAmount)}</span>}{' '}
                        <span style={{ color: hasDiscount ? '#34d399' : 'inherit', fontWeight: hasDiscount ? 'bold' : 'normal' }}>
                          {Math.ceil(amount)}
                        </span>{' '}
                        {resource}
                      </li>
                    );
                  })}
              </ul>
              {costSavings > 0 && (
                <div style={{ marginTop: '8px', padding: '4px 8px', backgroundColor: '#34d39920', borderRadius: '4px', fontSize: '0.85rem', color: '#34d399' }}>
                  🔨 Construction Bonus: -{costSavings}% cost
                </div>
              )}
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
});

export default BuildingCard;
