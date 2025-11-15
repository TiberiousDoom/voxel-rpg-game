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
 * - Improved UI with collapsible sections and building cards
 */

import React, { useMemo, useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import BuildingCard from './BuildingCard';
import QuickActionBar from './QuickActionBar';
import CurrentSelectionBanner from './CurrentSelectionBanner';
import BuildingCategoryFilter from './BuildingCategoryFilter';
import GridDisplayToggle from './GridDisplayToggle';
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

// Tier icons and metadata
const TIER_METADATA = {
  SURVIVAL: { icon: '⚡', description: 'Early settlement' },
  PERMANENT: { icon: '🏠', description: 'Established settlement' },
  TOWN: { icon: '🏛️', description: 'Growing town' },
  CASTLE: { icon: '🏰', description: 'Mighty civilization' }
};

// Building to category mapping
const BUILDING_CATEGORY_MAP = {
  CAMPFIRE: 'UTILITY',
  FARM: 'PRODUCTION',
  HOUSE: 'HOUSING',
  WAREHOUSE: 'STORAGE',
  TOWN_CENTER: 'ADMINISTRATION',
  MARKET: 'PRODUCTION',
  WATCHTOWER: 'MILITARY',
  CASTLE: 'MILITARY'
};

/**
 * Build menu component - Improved layout with collapsible sections
 */
function BuildMenu({
  selectedBuildingType = null,
  onSelectBuilding = () => {},
  onSpawnNPC = () => {},
  onAdvanceTier = () => {},
  currentTier = 'SURVIVAL',
  buildingConfig = null,
  placedBuildingCounts = {} // Count of placed buildings by type
}) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [displayMode, setDisplayMode] = useState('compact');

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

  // Group buildings by category
  const buildingsByCategory = useMemo(() => {
    const grouped = {
      ALL: [],
      PRODUCTION: [],
      HOUSING: [],
      MILITARY: [],
      ADMINISTRATION: [],
      STORAGE: [],
      UTILITY: []
    };

    availableBuildings.forEach(building => {
      grouped.ALL.push(building);
      const category = BUILDING_CATEGORY_MAP[building.type] || 'UTILITY';
      if (grouped[category]) {
        grouped[category].push(building);
      }
    });

    return grouped;
  }, [availableBuildings]);

  // Group buildings by tier with category filtering
  const buildingsByTier = useMemo(() => {
    const grouped = {
      SURVIVAL: [],
      PERMANENT: [],
      TOWN: [],
      CASTLE: []
    };

    // Get the buildings to display (filtered by category)
    const buildingsToDisplay = selectedCategory === 'ALL'
      ? availableBuildings
      : buildingsByCategory[selectedCategory] || [];

    buildingsToDisplay.forEach(building => {
      if (grouped[building.tier]) {
        grouped[building.tier].push(building);
      }
    });

    return grouped;
  }, [availableBuildings, selectedCategory, buildingsByCategory]);

  // Get currently selected building name and icon
  const getSelectedBuildingInfo = () => {
    const building = availableBuildings.find(b => b.type === selectedBuildingType);
    if (building) {
      return {
        name: building.name,
        icon: building.icon
      };
    }
    return { name: selectedBuildingType, icon: '🏗️' };
  };

  const selectedInfo = getSelectedBuildingInfo();

  return (
    <div className="build-menu">
      {/* Quick Action Bar */}
      <QuickActionBar
        onSpawnNPC={onSpawnNPC}
        onAdvanceTier={onAdvanceTier}
        onShowInfo={() => setShowInstructions(!showInstructions)}
        currentTier={currentTier}
      />

      {/* Current Selection Banner */}
      <CurrentSelectionBanner
        selectedBuildingType={selectedBuildingType}
        buildingName={selectedInfo.name}
        buildingIcon={selectedInfo.icon}
        onCancel={() => onSelectBuilding(null)}
      />

      {/* Building Category Filter */}
      <BuildingCategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        buildingsByCategory={buildingsByCategory}
      />

      {/* Grid Display Toggle */}
      <GridDisplayToggle
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
      />

      {/* Building Selection by Tier */}
      <div className="buildings-section">
        {TIER_HIERARCHY.map(tier => {
          const buildings = buildingsByTier[tier];
          if (!buildings || buildings.length === 0) return null;

          const tierUnlocked = TIER_HIERARCHY.indexOf(tier) <= TIER_HIERARCHY.indexOf(currentTier);
          const tierMeta = TIER_METADATA[tier];
          const tierIcon = tierMeta?.icon || '🏗️';

          return (
            <CollapsibleSection
              key={tier}
              title={tier}
              icon={tierIcon}
              badge={buildings.length}
              defaultExpanded={tierUnlocked && TIER_HIERARCHY.indexOf(tier) === TIER_HIERARCHY.indexOf(currentTier)}
              className={tierUnlocked ? 'tier-unlocked' : 'tier-locked'}
            >
              <div className={`buildings-grid ${displayMode}`}>
                {buildings.map((building) => (
                  <BuildingCard
                    key={building.type}
                    building={building}
                    isSelected={selectedBuildingType === building.type}
                    isLocked={!building.unlocked}
                    placedCount={placedBuildingCounts?.[building.type] || 0}
                    onSelect={onSelectBuilding}
                    buildingConfig={buildingConfig}
                    displayMode={displayMode}
                  />
                ))}
              </div>
            </CollapsibleSection>
          );
        })}
      </div>

      {/* Instructions Section (Collapsible) */}
      {showInstructions && (
        <div className="instructions-section">
          <h4>How to Play:</h4>
          <ol>
            <li>Select a building from the menu above</li>
            <li>Click on the game world to place it</li>
            <li>Use the Quick Actions to spawn NPCs and advance tiers</li>
            <li>Gather resources to progress through civilization tiers</li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default BuildMenu;
