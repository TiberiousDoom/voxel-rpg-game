/**
 * BuildingInfoPanel.jsx - Building health and repair UI
 *
 * Displays:
 * - Building information (type, state)
 * - Health bar with current/max HP
 * - Repair button with cost display
 * - State indicators (COMPLETE, DAMAGED, DESTROYED)
 */

import React from 'react';
import './BuildingInfoPanel.css';

const BuildingInfoPanel = ({
  building,
  buildingConfig,
  resources,
  onRepair,
  onClose
}) => {
  if (!building) {
    return null;
  }

  // Get building configuration
  const config = buildingConfig.getConfig(building.type);
  const repairCost = buildingConfig.getRepairCost(building.type);
  const repairAmount = buildingConfig.getRepairAmount(building.type);

  // Initialize health if not present
  const health = building.health !== undefined ? building.health : (config.health || 100);
  const maxHealth = building.maxHealth !== undefined ? building.maxHealth : (config.maxHealth || 100);
  const healthPercent = (health / maxHealth) * 100;

  // State indicators
  const state = building.state || 'COMPLETE';
  const isDestroyed = state === 'DESTROYED';
  const isDamaged = state === 'DAMAGED';
  const needsRepair = health < maxHealth;

  // Check if player can afford repair
  const canAffordRepair = () => {
    for (const [resource, cost] of Object.entries(repairCost)) {
      if (cost > 0 && resources[resource] < cost) {
        return false;
      }
    }
    return true;
  };

  const canRepair = !isDestroyed && needsRepair && canAffordRepair();

  // Health bar color based on percentage
  const getHealthColor = () => {
    if (healthPercent > 75) return '#4caf50'; // Green
    if (healthPercent > 50) return '#ff9800'; // Orange
    if (healthPercent > 25) return '#ff5722'; // Deep orange
    return '#f44336'; // Red
  };

  // State badge color
  const getStateBadgeColor = () => {
    switch(state) {
      case 'COMPLETE': return '#4caf50';
      case 'DAMAGED': return '#ff9800';
      case 'DESTROYED': return '#f44336';
      case 'UNDER_CONSTRUCTION': return '#2196f3';
      case 'BLUEPRINT': return '#9e9e9e';
      default: return '#757575';
    }
  };

  return (
    <div className="building-info-panel">
      <div className="panel-header">
        <h3>{config.displayName}</h3>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        {/* Building Info */}
        <div className="info-section">
          <p className="building-description">{config.description}</p>
          <div className="info-row">
            <span className="info-label">Type:</span>
            <span className="info-value">{building.type}</span>
          </div>
          <div className="info-row">
            <span className="info-label">ID:</span>
            <span className="info-value">{building.id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">State:</span>
            <span
              className="state-badge"
              style={{ backgroundColor: getStateBadgeColor() }}
            >
              {state}
            </span>
          </div>
        </div>

        {/* Health Section */}
        <div className="health-section">
          <div className="health-header">
            <span className="health-label">Building Health</span>
            <span className="health-value">{Math.ceil(health)} / {maxHealth} HP</span>
          </div>

          <div className="health-bar-container">
            <div
              className="health-bar-fill"
              style={{
                width: `${healthPercent}%`,
                backgroundColor: getHealthColor()
              }}
            />
          </div>

          <div className="health-status">
            {isDestroyed && (
              <span className="status-destroyed">
                ⚠️ Building destroyed - cannot be repaired
              </span>
            )}
            {isDamaged && !isDestroyed && (
              <span className="status-damaged">
                ⚠️ Building damaged - repair needed
              </span>
            )}
            {!isDamaged && !isDestroyed && healthPercent === 100 && (
              <span className="status-healthy">
                ✓ Building in perfect condition
              </span>
            )}
          </div>
        </div>

        {/* Repair Section */}
        {needsRepair && !isDestroyed && (
          <div className="repair-section">
            <h4>Repair Building</h4>

            <div className="repair-info">
              <p>
                <strong>Restores:</strong> +{repairAmount} HP
              </p>
              <div className="repair-cost">
                <strong>Cost:</strong>
                {Object.entries(repairCost).map(([resource, cost]) => (
                  cost > 0 && (
                    <div key={resource} className="cost-item">
                      <span className="resource-name">{resource}:</span>
                      <span
                        className={resources[resource] >= cost ? 'cost-affordable' : 'cost-insufficient'}
                      >
                        {cost}
                      </span>
                      <span className="resource-available">
                        (have: {resources[resource] || 0})
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>

            <button
              className={`repair-button ${canRepair ? '' : 'disabled'}`}
              onClick={() => canRepair && onRepair(building.id)}
              disabled={!canRepair}
            >
              {canRepair ? '🔧 Repair Building' : '❌ Insufficient Resources'}
            </button>
          </div>
        )}

        {/* Work Slots Info */}
        {config.workSlots > 0 && (
          <div className="work-slots-section">
            <h4>Work Slots</h4>
            <p>
              <strong>Capacity:</strong> {config.workSlots} workers
            </p>
            <p className="work-info-text">
              Assign NPCs to this building to maximize production
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildingInfoPanel;
