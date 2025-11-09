/**
 * BuildMenu.jsx - Building selection and control menu
 *
 * Allows:
 * - Select building type to place
 * - Spawn NPCs
 * - Advance tier
 */

import React from 'react';
import './BuildMenu.css';

/**
 * Build menu component
 */
function BuildMenu({
  selectedBuildingType = null,
  onSelectBuilding = () => {},
  onSpawnNPC = () => {},
  onAdvanceTier = () => {}
}) {
  const buildingTypes = [
    {
      name: 'Farm',
      type: 'FARM',
      description: 'Produces food',
      icon: '🌾',
      color: '#90EE90'
    },
    {
      name: 'House',
      type: 'HOUSE',
      description: 'Houses NPCs',
      icon: '🏠',
      color: '#D2B48C'
    },
    {
      name: 'Warehouse',
      type: 'WAREHOUSE',
      description: 'Stores resources',
      icon: '🏭',
      color: '#A9A9A9'
    },
    {
      name: 'Town Center',
      type: 'TOWN_CENTER',
      description: 'Tier advancement',
      icon: '🏛️',
      color: '#FFD700'
    },
    {
      name: 'Watchtower',
      type: 'WATCHTOWER',
      description: 'Defense structure',
      icon: '🗼',
      color: '#8B4513'
    }
  ];

  return (
    <div className="build-menu">
      <h3 className="panel-title">Build Menu</h3>

      {/* Building Selection */}
      <div className="buildings-section">
        <h4 className="section-title">Buildings</h4>
        <div className="buildings-grid">
          {buildingTypes.map((building) => (
            <button
              key={building.type}
              className={`building-button ${
                selectedBuildingType === building.type ? 'active' : ''
              }`}
              onClick={() =>
                onSelectBuilding(
                  selectedBuildingType === building.type ? null : building.type
                )
              }
              style={{
                borderColor:
                  selectedBuildingType === building.type ? building.color : '#ccc'
              }}
            >
              <div className="building-icon">{building.icon}</div>
              <div className="building-name">{building.name}</div>
              <div className="building-description">{building.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* NPC Controls */}
      <div className="npc-controls">
        <h4 className="section-title">NPCs</h4>
        <button className="control-button spawn-npc" onClick={onSpawnNPC}>
          <span className="button-icon">👤</span>
          <span className="button-text">Spawn NPC</span>
        </button>
        <p className="button-hint">Create a new NPC to work in your settlement</p>
      </div>

      {/* Tier Advancement */}
      <div className="tier-controls">
        <h4 className="section-title">Advancement</h4>
        <button className="control-button advance-tier" onClick={onAdvanceTier}>
          <span className="button-icon">📈</span>
          <span className="button-text">Advance Tier</span>
        </button>
        <p className="button-hint">Progress to the next civilization tier</p>
      </div>

      {/* Build Instructions */}
      <div className="build-instructions">
        <h4>How to Play:</h4>
        <ol>
          <li>Select a building from the menu</li>
          <li>Click on the game world to place it</li>
          <li>Spawn NPCs to work in buildings</li>
          <li>Gather resources to advance tiers</li>
        </ol>
      </div>

      {selectedBuildingType && (
        <div className="current-selection">
          <p className="selection-text">
            <strong>Currently Placing:</strong> {selectedBuildingType}
          </p>
          <p className="selection-hint">Click on the game world to place</p>
          <button
            className="cancel-button"
            onClick={() => onSelectBuilding(null)}
          >
            Cancel Selection
          </button>
        </div>
      )}
    </div>
  );
}

export default BuildMenu;
