/**
 * ConstructionPanel.jsx - Voxel construction management panel
 *
 * Allows players to:
 * - Browse available blueprints by category
 * - View blueprint requirements
 * - Place construction sites
 * - Monitor construction progress
 */

import React, { useState, useMemo } from 'react';
import {
  Hammer,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Layers,
  Home,
  Shield,
  Factory,
  Warehouse
} from 'lucide-react';
import { Card, Button, ProgressBar, Badge } from '../common';
import './Panel.css';
import './ConstructionPanel.css';

/**
 * Blueprint categories with icons
 */
const CATEGORIES = {
  HOUSING: { label: 'Housing', icon: Home },
  PRODUCTION: { label: 'Production', icon: Factory },
  STORAGE: { label: 'Storage', icon: Warehouse },
  DEFENSE: { label: 'Defense', icon: Shield },
  ALL: { label: 'All', icon: Layers }
};

/**
 * Blueprint card component
 */
function BlueprintCard({ blueprint, onSelect, isSelected, canAfford }) {
  const Icon = CATEGORIES[blueprint.category]?.icon || Package;

  return (
    <Card
      className={`blueprint-card ${isSelected ? 'blueprint-card-selected' : ''} ${!canAfford ? 'blueprint-card-unaffordable' : ''}`}
      onClick={() => onSelect(blueprint)}
    >
      <div className="blueprint-header">
        <Icon size={18} className="blueprint-icon" />
        <span className="blueprint-name">{blueprint.name}</span>
        <Badge variant={blueprint.tier === 'SURVIVAL' ? 'default' : 'accent'}>
          {blueprint.tier}
        </Badge>
      </div>

      <p className="blueprint-description">{blueprint.description}</p>

      <div className="blueprint-requirements">
        <span className="blueprint-req-label">Materials:</span>
        <div className="blueprint-materials">
          {Object.entries(blueprint.materials || {}).map(([resource, amount]) => (
            <span key={resource} className="blueprint-material">
              {resource}: {amount}
            </span>
          ))}
        </div>
      </div>

      <div className="blueprint-size">
        Size: {blueprint.width}x{blueprint.depth}x{blueprint.height}
      </div>

      <ChevronRight size={16} className="blueprint-chevron" />
    </Card>
  );
}

/**
 * Construction site card component
 */
function ConstructionSiteCard({ site, onCancel }) {
  const progress = site.getProgress ? site.getProgress() : 0;
  const isComplete = progress >= 100;

  return (
    <Card className="construction-site-card">
      <div className="site-header">
        {isComplete ? (
          <CheckCircle size={18} className="site-icon site-complete" />
        ) : (
          <Clock size={18} className="site-icon site-in-progress" />
        )}
        <span className="site-name">{site.blueprint?.name || 'Construction'}</span>
      </div>

      <div className="site-location">
        Position: ({site.position?.x}, {site.position?.y}, {site.position?.z})
      </div>

      <ProgressBar
        value={progress}
        max={100}
        variant={isComplete ? 'success' : 'default'}
        showLabel
        label={`${Math.round(progress)}%`}
      />

      <div className="site-stats">
        <span>Blocks: {site.completedBlocks || 0} / {site.totalBlocks || 0}</span>
        <span>Priority: {site.priority || 50}</span>
      </div>

      {!isComplete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCancel(site.id)}
        >
          Cancel
        </Button>
      )}
    </Card>
  );
}

/**
 * ConstructionPanel component
 */
function ConstructionPanel({ gameState, gameActions }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);
  const [viewMode, setViewMode] = useState('blueprints'); // 'blueprints' | 'sites'

  const { gameManager } = gameState || {};
  const voxelBuilding = gameManager?.getVoxelBuildingSystem?.();

  // Get available blueprints
  const blueprints = useMemo(() => {
    if (!voxelBuilding?.constructionManager) return [];

    const allBlueprints = [];
    const manager = voxelBuilding.constructionManager;

    // Get blueprints from the construction manager
    if (manager.blueprints) {
      for (const bp of manager.blueprints.values()) {
        allBlueprints.push(bp);
      }
    }

    return allBlueprints;
  }, [voxelBuilding]);

  // Filter blueprints by category
  const filteredBlueprints = useMemo(() => {
    if (selectedCategory === 'ALL') return blueprints;
    return blueprints.filter(bp => bp.category === selectedCategory);
  }, [blueprints, selectedCategory]);

  // Get active construction sites
  const activeSites = useMemo(() => {
    if (!voxelBuilding) return [];
    return voxelBuilding.getActiveSites?.() || [];
  }, [voxelBuilding]);

  // Get current resources for affordability check
  const currentResources = useMemo(() => {
    return gameManager?.orchestrator?.storage?.getStorage?.() || {};
  }, [gameManager]);

  // Check if player can afford a blueprint
  const canAfford = (blueprint) => {
    if (!blueprint.materials) return true;

    for (const [resource, amount] of Object.entries(blueprint.materials)) {
      if ((currentResources[resource] || 0) < amount) {
        return false;
      }
    }
    return true;
  };

  // Handle blueprint selection for placement
  const handleSelectBlueprint = (blueprint) => {
    setSelectedBlueprint(blueprint);

    // Set placement mode in game actions
    if (gameActions?.setConstructionPlacementMode) {
      gameActions.setConstructionPlacementMode(blueprint.id);
    }
  };

  // Handle construction cancellation
  const handleCancelConstruction = (siteId) => {
    if (voxelBuilding?.cancelConstruction) {
      voxelBuilding.cancelConstruction(siteId);
    }
  };

  return (
    <div className="panel panel-construction">
      {/* View Toggle */}
      <div className="construction-view-toggle">
        <Button
          variant={viewMode === 'blueprints' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('blueprints')}
        >
          <Package size={16} />
          Blueprints
        </Button>
        <Button
          variant={viewMode === 'sites' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('sites')}
        >
          <Hammer size={16} />
          Active ({activeSites.length})
        </Button>
      </div>

      {viewMode === 'blueprints' ? (
        <>
          {/* Category Filter */}
          <div className="construction-categories">
            {Object.entries(CATEGORIES).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                className={`construction-category ${selectedCategory === key ? 'construction-category-active' : ''}`}
                onClick={() => setSelectedCategory(key)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Blueprint List */}
          <div className="construction-blueprints">
            {filteredBlueprints.length === 0 ? (
              <div className="panel-empty-state">
                <Package size={48} className="panel-empty-icon" />
                <p>No blueprints available</p>
                <span className="panel-empty-hint">
                  Blueprints will appear here as you progress
                </span>
              </div>
            ) : (
              <div className="panel-list">
                {filteredBlueprints.map(blueprint => (
                  <BlueprintCard
                    key={blueprint.id}
                    blueprint={blueprint}
                    onSelect={handleSelectBlueprint}
                    isSelected={selectedBlueprint?.id === blueprint.id}
                    canAfford={canAfford(blueprint)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Selected Blueprint Info */}
          {selectedBlueprint && (
            <div className="construction-selected">
              <Card className="selected-blueprint-card">
                <h4>{selectedBlueprint.name}</h4>
                <p>Click on the map to place this construction</p>
                {!canAfford(selectedBlueprint) && (
                  <div className="selected-warning">
                    <AlertCircle size={16} />
                    <span>Insufficient resources</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedBlueprint(null);
                    gameActions?.setConstructionPlacementMode?.(null);
                  }}
                >
                  Cancel Selection
                </Button>
              </Card>
            </div>
          )}
        </>
      ) : (
        /* Active Sites View */
        <div className="construction-sites">
          {activeSites.length === 0 ? (
            <div className="panel-empty-state">
              <Hammer size={48} className="panel-empty-icon" />
              <p>No active construction</p>
              <span className="panel-empty-hint">
                Select a blueprint to start building
              </span>
            </div>
          ) : (
            <div className="panel-list">
              {activeSites.map(site => (
                <ConstructionSiteCard
                  key={site.id}
                  site={site}
                  onCancel={handleCancelConstruction}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConstructionPanel;
