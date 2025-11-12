import React from 'react';
import './BuildingInfoPanel.css';

/**
 * BuildingInfoPanel Component
 * Displays detailed information about a selected building including health and repair options
 */
function BuildingInfoPanel({ building, resources, onRepair, onDamage, onClose }) {
  if (!building) {
    return null;
  }

  const healthPercent = (building.health / building.maxHealth) * 100;
  const isDestroyed = building.state === 'DESTROYED';
  const isDamaged = building.state === 'DAMAGED';
  const needsRepair = building.health < building.maxHealth;

  // Calculate repair cost (this should ideally come from BuildingConfig)
  // For now, using a simple formula: 50% of original cost scaled by health deficit
  const getRepairCost = () => {
    const healthDeficit = building.maxHealth - building.health;
    const cost = {};

    // Estimate repair cost based on building type (simplified)
    // In a real implementation, this would come from BuildingConfig.getRepairCost()
    if (building.type === 'CAMPFIRE' || building.type === 'FARM') {
      cost.wood = Math.ceil((healthDeficit / building.maxHealth) * 5);
    } else if (building.type === 'HOUSE' || building.type === 'WAREHOUSE') {
      cost.wood = Math.ceil((healthDeficit / building.maxHealth) * 10);
      cost.stone = Math.ceil((healthDeficit / building.maxHealth) * 3);
    } else if (building.type === 'TOWN_CENTER' || building.type === 'MARKET') {
      cost.wood = Math.ceil((healthDeficit / building.maxHealth) * 25);
      cost.stone = Math.ceil((healthDeficit / building.maxHealth) * 25);
      cost.food = Math.ceil((healthDeficit / building.maxHealth) * 10);
    }

    return cost;
  };

  const repairCost = getRepairCost();

  // Check if player has enough resources for repair
  const canAffordRepair = () => {
    for (const [resource, amount] of Object.entries(repairCost)) {
      if ((resources[resource] || 0) < amount) {
        return false;
      }
    }
    return true;
  };

  const getHealthBarColor = () => {
    if (healthPercent >= 75) return '#4caf50'; // Green
    if (healthPercent >= 50) return '#ffeb3b'; // Yellow
    if (healthPercent >= 25) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getStateColor = () => {
    if (isDestroyed) return '#f44336'; // Red
    if (isDamaged) return '#ff9800'; // Orange
    return '#4caf50'; // Green
  };

  return (
    <div className="building-info-panel">
      <div className="panel-header">
        <h3>{building.type}</h3>
        <button className="close-btn" onClick={onClose}>✖</button>
      </div>

      <div className="panel-content">
        {/* Building ID */}
        <div className="info-row">
          <span className="label">ID:</span>
          <span className="value">{building.id}</span>
        </div>

        {/* Position */}
        <div className="info-row">
          <span className="label">Position:</span>
          <span className="value">
            ({building.position.x}, {building.position.y}, {building.position.z})
          </span>
        </div>

        {/* State */}
        <div className="info-row">
          <span className="label">State:</span>
          <span className="value" style={{ color: getStateColor(), fontWeight: 'bold' }}>
            {building.state}
          </span>
        </div>

        {/* Health Bar */}
        <div className="health-section">
          <div className="health-label">
            <span>Health:</span>
            <span className="health-value">
              {building.health} / {building.maxHealth}
            </span>
          </div>
          <div className="health-bar-container">
            <div
              className="health-bar-fill"
              style={{
                width: `${healthPercent}%`,
                backgroundColor: getHealthBarColor()
              }}
            />
          </div>
          <div className="health-percent">{healthPercent.toFixed(0)}%</div>
        </div>

        {/* Repair Section */}
        {needsRepair && !isDestroyed && (
          <div className="repair-section">
            <h4>Repair Building</h4>

            <div className="repair-cost">
              <span className="cost-label">Cost:</span>
              <div className="cost-items">
                {Object.entries(repairCost).map(([resource, amount]) => (
                  <div
                    key={resource}
                    className={`cost-item ${(resources[resource] || 0) >= amount ? 'affordable' : 'unaffordable'}`}
                  >
                    <span className="resource-name">{resource}:</span>
                    <span className="resource-amount">{amount}</span>
                    <span className="resource-available">
                      (have: {resources[resource] || 0})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="repair-btn"
              onClick={() => onRepair(building.id)}
              disabled={!canAffordRepair()}
            >
              {canAffordRepair() ? '🔧 Repair Building' : '❌ Insufficient Resources'}
            </button>
          </div>
        )}

        {/* Destroyed State Message */}
        {isDestroyed && (
          <div className="destroyed-message">
            <p>⚠️ This building has been destroyed and cannot be repaired.</p>
            <p>You must remove it and build a new one.</p>
          </div>
        )}

        {/* Full Health Message */}
        {!needsRepair && !isDestroyed && (
          <div className="full-health-message">
            <p>✅ This building is at full health!</p>
          </div>
        )}

        {/* Debug Actions */}
        <div className="debug-actions">
          <h4>Debug Actions</h4>
          <button
            className="damage-btn"
            onClick={() => onDamage(building.id, 20)}
          >
            🔨 Damage (-20 HP)
          </button>
          <button
            className="damage-btn"
            onClick={() => onDamage(building.id, 50)}
          >
            💥 Heavy Damage (-50 HP)
          </button>
        </div>
      </div>
    </div>
  );
}

export default BuildingInfoPanel;
