/**
 * BuildMenu.jsx - Building selection and control menu
 *
 * Allows:
 * - Select building type to place
 * - Spawn NPCs
 * - Advance tier
 *
 * Features:
 * - Dynamic building loading from BuildingConfig
 * - Tier-based building availability
 * - Buildings grouped by tier
 */

import React, { useMemo } from 'react';
import './BuildMenu.css';

// Building icons map (constant)
const BUILDING_ICONS = {
  CAMPFIRE: '🔥',
  FARM: '🌾',
  HOUSE: '🏠',
  WAREHOUSE: '🏭',
  TOWN_CENTER: '🏛️',
  MARKET: '🏪',
  WATCHTOWER: '🗼',
  CASTLE: '🏰'
};

// Tier hierarchy for availability checking (constant)
const TIER_HIERARCHY = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];

/**
 * Build menu component
 */
function BuildMenu({
  selectedBuildingType = null,
  onSelectBuilding = () => {},
  onSpawnNPC = () => {},
  onAdvanceTier = () => {},
  currentTier = 'SURVIVAL',
  buildingConfig = null
}) {

  // Get available buildings based on current tier
  const availableBuildings = useMemo(() => {
    if (!buildingConfig) {
      // Fallback to hardcoded buildings if no buildingConfig
      return [
        { type: 'FARM', name: 'Farm', description: 'Produces food', tier: 'SURVIVAL', icon: '🌾', unlocked: true },
        { type: 'HOUSE', name: 'House', description: 'Houses NPCs', tier: 'PERMANENT', icon: '🏠', unlocked: false }
      ];
    }

    const currentTierIndex = TIER_HIERARCHY.indexOf(currentTier);
    const buildings = [];

    // Get all building types from config
    const buildingTypes = [
      'CAMPFIRE', 'FARM', 'HOUSE', 'WAREHOUSE',
      'TOWN_CENTER', 'MARKET', 'WATCHTOWER', 'CASTLE'
    ];

    for (const type of buildingTypes) {
      try {
        const config = buildingConfig.getConfig(type);
        if (config) {
          const buildingTierIndex = TIER_HIERARCHY.indexOf(config.tier);
          const unlocked = buildingTierIndex <= currentTierIndex;

          buildings.push({
            type: config.type,
            name: config.displayName || type,
            description: config.description || '',
            tier: config.tier,
            icon: BUILDING_ICONS[type] || '🏗️',
            unlocked,
            cost: config.cost || {}
          });
        }
      } catch (err) {
        // Skip buildings that don't exist in config
        console.warn(`Building ${type} not found in config`);
      }
    }

    return buildings;
  }, [buildingConfig, currentTier]);

  // Group buildings by tier
  const buildingsByTier = useMemo(() => {
    const grouped = {
      SURVIVAL: [],
      PERMANENT: [],
      TOWN: [],
      CASTLE: []
    };

    availableBuildings.forEach(building => {
      if (grouped[building.tier]) {
        grouped[building.tier].push(building);
      }
    });

    return grouped;
  }, [availableBuildings]);

  return (
    <div className="build-menu">
      <h3 className="panel-title">Build Menu</h3>

      {/* Building Selection */}
      <div className="buildings-section">
        <h4 className="section-title">Buildings</h4>

        {/* Display by tier */}
        {tierHierarchy.map(tier => {
          const buildings = buildingsByTier[tier];
          if (!buildings || buildings.length === 0) return null;

          const tierUnlocked = tierHierarchy.indexOf(tier) <= tierHierarchy.indexOf(currentTier);

          return (
            <div key={tier} className="tier-group">
              <div className="tier-header">
                <span className={`tier-badge ${tierUnlocked ? 'unlocked' : 'locked'}`}>
                  {tier}
                </span>
              </div>
              <div className="buildings-grid">
                {buildings.map((building) => (
                  <button
                    key={building.type}
                    className={`building-button ${
                      selectedBuildingType === building.type ? 'active' : ''
                    } ${!building.unlocked ? 'locked' : ''}`}
                    onClick={() => {
                      if (building.unlocked) {
                        onSelectBuilding(
                          selectedBuildingType === building.type ? null : building.type
                        );
                      }
                    }}
                    disabled={!building.unlocked}
                    title={!building.unlocked ? `Requires ${building.tier} tier` : building.description}
                  >
                    <div className="building-icon">{building.icon}</div>
                    <div className="building-name">{building.name}</div>
                    <div className="building-description">
                      {building.unlocked ? building.description : '🔒 Locked'}
                    </div>
                    {building.unlocked && building.cost && (
                      <div className="building-cost">
                        {Object.entries(building.cost).filter(([, amount]) => amount > 0).map(([resource, amount]) => (
                          <span key={resource} className="cost-item">
                            {amount} {resource}
                          </span>
                        )).slice(0, 2) /* Show max 2 resources */}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
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
