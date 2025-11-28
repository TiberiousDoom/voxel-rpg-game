/**
 * StockpilePanel.jsx - Stockpile zone management panel
 *
 * Allows players to:
 * - View existing stockpile zones
 * - Create new stockpile zones
 * - Configure resource filters
 * - View stockpile contents
 */

import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Filter,
  Box,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  MapPin
} from 'lucide-react';
import { Card, Button, Badge, ProgressBar } from '../common';
import { ResourceType, ResourceCategory } from '../../modules/stockpile/Stockpile';
import './Panel.css';
import './StockpilePanel.css';

/**
 * Resource category display names
 */
const CATEGORY_LABELS = {
  [ResourceCategory.RAW_MATERIALS]: 'Raw Materials',
  [ResourceCategory.REFINED_MATERIALS]: 'Refined',
  [ResourceCategory.ORES]: 'Ores',
  [ResourceCategory.METALS]: 'Metals',
  [ResourceCategory.FOOD]: 'Food',
  [ResourceCategory.SPECIAL]: 'Special',
  [ResourceCategory.ALL]: 'All Resources'
};

/**
 * Stockpile card component showing stockpile info
 */
function StockpileCard({ stockpile, onDelete, onConfigure, expanded, onToggleExpand }) {
  const stats = stockpile.getStats?.() || {};
  const usagePercent = stats.totalSlots > 0
    ? (stats.usedSlots / stats.totalSlots) * 100
    : 0;

  const resources = stockpile.getAllResources?.() || new Map();

  return (
    <Card className={`stockpile-card ${expanded ? 'stockpile-card-expanded' : ''}`}>
      <div className="stockpile-header" onClick={onToggleExpand}>
        <Package size={18} className="stockpile-icon" />
        <span className="stockpile-name">{stockpile.name}</span>
        <Badge variant={stockpile.enabled ? 'success' : 'default'}>
          {stockpile.enabled ? 'Active' : 'Paused'}
        </Badge>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      <div className="stockpile-location">
        <MapPin size={12} />
        <span>
          ({stockpile.bounds?.x}, {stockpile.bounds?.y}) -
          {stockpile.bounds?.width}x{stockpile.bounds?.depth}
        </span>
      </div>

      <ProgressBar
        value={usagePercent}
        max={100}
        variant={usagePercent > 90 ? 'warning' : 'default'}
        showLabel
        label={`${stats.usedSlots || 0}/${stats.totalSlots || 0} slots`}
      />

      {expanded && (
        <div className="stockpile-details">
          {/* Resource Contents */}
          <div className="stockpile-contents">
            <h5>Contents</h5>
            {resources.size === 0 ? (
              <p className="stockpile-empty">Empty</p>
            ) : (
              <div className="stockpile-resources">
                {Array.from(resources.entries()).map(([type, amount]) => (
                  <div key={type} className="stockpile-resource">
                    <span className="resource-type">{type}</span>
                    <span className="resource-amount">{amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Allowed Categories */}
          <div className="stockpile-filters">
            <h5>Accepts</h5>
            <div className="filter-tags">
              {stockpile.allowedCategories?.has(ResourceCategory.ALL) ? (
                <span className="filter-tag filter-tag-all">All Resources</span>
              ) : (
                Array.from(stockpile.allowedCategories || []).map(cat => (
                  <span key={cat} className="filter-tag">
                    {CATEGORY_LABELS[cat] || cat}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="stockpile-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onConfigure(stockpile)}
            >
              <Filter size={14} />
              Configure
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(stockpile.id)}
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Create stockpile form
 */
function CreateStockpileForm({ onClose, onCreate }) {
  const [name, setName] = useState('Stockpile');
  const [width, setWidth] = useState(3);
  const [depth, setDepth] = useState(3);
  const [selectedCategories, setSelectedCategories] = useState(new Set([ResourceCategory.ALL]));

  const toggleCategory = (category) => {
    const newCategories = new Set(selectedCategories);

    if (category === ResourceCategory.ALL) {
      // Toggle ALL - if selected, select only ALL; otherwise clear ALL
      if (newCategories.has(ResourceCategory.ALL)) {
        newCategories.delete(ResourceCategory.ALL);
      } else {
        newCategories.clear();
        newCategories.add(ResourceCategory.ALL);
      }
    } else {
      // Toggle specific category
      newCategories.delete(ResourceCategory.ALL);
      if (newCategories.has(category)) {
        newCategories.delete(category);
      } else {
        newCategories.add(category);
      }

      // If nothing selected, default to ALL
      if (newCategories.size === 0) {
        newCategories.add(ResourceCategory.ALL);
      }
    }

    setSelectedCategories(newCategories);
  };

  const handleCreate = () => {
    onCreate({
      name,
      width,
      depth,
      allowedCategories: Array.from(selectedCategories)
    });
    onClose();
  };

  return (
    <Card className="create-stockpile-form">
      <h4>Create Stockpile Zone</h4>

      <div className="form-field">
        <label>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label>Width</label>
          <input
            type="number"
            min="1"
            max="10"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="form-field">
          <label>Depth</label>
          <input
            type="number"
            min="1"
            max="10"
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="form-field">
        <label>Allowed Resources</label>
        <div className="category-checkboxes">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <label key={key} className="category-checkbox">
              {selectedCategories.has(key) ? (
                <CheckSquare size={16} className="check-icon checked" />
              ) : (
                <Square size={16} className="check-icon" />
              )}
              <span onClick={() => toggleCategory(key)}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <p className="form-hint">
        Click on the map to place the stockpile zone
      </p>

      <div className="form-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleCreate}>
          Place Stockpile
        </Button>
      </div>
    </Card>
  );
}

/**
 * StockpilePanel component
 */
function StockpilePanel({ gameState, gameActions }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { gameManager } = gameState || {};
  const voxelBuilding = gameManager?.getVoxelBuildingSystem?.();

  // Get all stockpiles
  const stockpiles = useMemo(() => {
    if (!voxelBuilding?.stockpileManager) return [];
    return voxelBuilding.stockpileManager.getAllStockpiles?.() || [];
  }, [voxelBuilding]);

  // Get aggregate stats
  const aggregateStats = useMemo(() => {
    if (!voxelBuilding?.stockpileManager) {
      return { totalStockpiles: 0, totalResources: new Map() };
    }
    return {
      totalStockpiles: stockpiles.length,
      totalResources: voxelBuilding.stockpileManager.getAllResources?.() || new Map()
    };
  }, [voxelBuilding, stockpiles]);

  const handleDeleteStockpile = (stockpileId) => {
    if (voxelBuilding?.removeStockpile) {
      voxelBuilding.removeStockpile(stockpileId);
    }
  };

  const handleConfigureStockpile = (stockpile) => {
    // TODO: Open configuration modal
  };

  const handleCreateStockpile = (config) => {
    if (gameActions?.setStockpilePlacementMode) {
      gameActions.setStockpilePlacementMode(config);
    }
  };

  const toggleExpand = (stockpileId) => {
    setExpandedId(expandedId === stockpileId ? null : stockpileId);
  };

  return (
    <div className="panel panel-stockpile">
      {/* Header Stats */}
      <div className="stockpile-stats">
        <div className="stat-item">
          <Box size={16} />
          <span>{aggregateStats.totalStockpiles} Zones</span>
        </div>
        <div className="stat-item">
          <Package size={16} />
          <span>{aggregateStats.totalResources.size} Resource Types</span>
        </div>
      </div>

      {/* Create Button */}
      <Button
        variant="primary"
        className="create-stockpile-btn"
        onClick={() => setShowCreateForm(true)}
      >
        <Plus size={16} />
        Create Stockpile Zone
      </Button>

      {/* Create Form */}
      {showCreateForm && (
        <CreateStockpileForm
          onClose={() => setShowCreateForm(false)}
          onCreate={handleCreateStockpile}
        />
      )}

      {/* Stockpile List */}
      <div className="stockpile-list">
        {stockpiles.length === 0 ? (
          <div className="panel-empty-state">
            <Package size={48} className="panel-empty-icon" />
            <p>No stockpile zones</p>
            <span className="panel-empty-hint">
              Create a stockpile to store resources
            </span>
          </div>
        ) : (
          <div className="panel-list">
            {stockpiles.map(stockpile => (
              <StockpileCard
                key={stockpile.id}
                stockpile={stockpile}
                expanded={expandedId === stockpile.id}
                onToggleExpand={() => toggleExpand(stockpile.id)}
                onDelete={handleDeleteStockpile}
                onConfigure={handleConfigureStockpile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StockpilePanel;
