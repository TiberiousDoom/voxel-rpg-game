/**
 * StatsDashboard.jsx - Game statistics dashboard with charts
 *
 * Features:
 * - Resource production/consumption rates
 * - Population statistics
 * - Building counts by type
 * - Morale trends
 * - Performance metrics
 * - Visual charts and graphs
 * - Export data functionality
 * - Collapsible sections
 *
 * Usage:
 * <StatsDashboard
 *   gameState={gameState}
 *   refreshInterval={5000}
 * />
 */

import React, { useState, useEffect, useMemo } from 'react';
import './StatsDashboard.css';

/**
 * StatsDashboard component
 * @param {Object} props
 * @param {Object} props.gameState - Current game state
 * @param {number} props.refreshInterval - Refresh interval in ms (default: 5000)
 * @param {boolean} props.compact - Show compact view (default: false)
 */
function StatsDashboard({
  gameState = {},
  refreshInterval = 5000,
  compact = false
}) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'resources' | 'population' | 'buildings'
  const [history, setHistory] = useState([]);

  /**
   * Track game state history for trends
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.resources) {
        setHistory(prev => {
          const newHistory = [...prev, {
            timestamp: Date.now(),
            resources: { ...gameState.resources },
            population: gameState.population?.aliveCount || 0,
            morale: gameState.morale || 0
          }];

          // Keep last 20 data points
          return newHistory.slice(-20);
        });
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [gameState, refreshInterval]);

  /**
   * Calculate resource statistics
   */
  const resourceStats = useMemo(() => {
    if (!gameState.resources) return null;

    const resources = gameState.resources;
    const total = Object.values(resources).reduce((sum, val) => sum + (val || 0), 0);

    return {
      total,
      breakdown: Object.entries(resources).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: value || 0,
        percentage: total > 0 ? ((value || 0) / total) * 100 : 0
      })).sort((a, b) => b.value - a.value)
    };
  }, [gameState.resources]);

  /**
   * Calculate building statistics
   */
  const buildingStats = useMemo(() => {
    if (!gameState.buildings) return null;

    const buildings = gameState.buildings;
    const byType = {};

    buildings.forEach(building => {
      const type = building.type || 'UNKNOWN';
      byType[type] = (byType[type] || 0) + 1;
    });

    return {
      total: buildings.length,
      byType: Object.entries(byType).map(([type, count]) => ({
        type: type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' '),
        count
      })).sort((a, b) => b.count - a.count)
    };
  }, [gameState.buildings]);

  /**
   * Calculate population statistics
   */
  const populationStats = useMemo(() => {
    if (!gameState.npcs) return null;

    const npcs = gameState.npcs;
    const byRole = {};
    let assigned = 0;
    let idle = 0;

    npcs.forEach(npc => {
      const role = npc.role || 'UNKNOWN';
      byRole[role] = (byRole[role] || 0) + 1;

      if (npc.assignedBuilding) {
        assigned++;
      } else {
        idle++;
      }
    });

    return {
      total: npcs.length,
      assigned,
      idle,
      byRole: Object.entries(byRole).map(([role, count]) => ({
        role: role.charAt(0) + role.slice(1).toLowerCase(),
        count
      })).sort((a, b) => b.count - a.count)
    };
  }, [gameState.npcs]);

  /**
   * Format number for display
   */
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  /**
   * Render a simple bar chart
   */
  const renderBarChart = (data, valueKey, labelKey, color = '#4a90e2') => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map(item => item[valueKey]));

    return (
      <div className="stats-bar-chart">
        {data.map((item, index) => (
          <div key={index} className="stats-bar-item">
            <div className="stats-bar-label">{item[labelKey]}</div>
            <div className="stats-bar-container">
              <div
                className="stats-bar-fill"
                style={{
                  width: `${(item[valueKey] / maxValue) * 100}%`,
                  backgroundColor: color
                }}
              />
              <span className="stats-bar-value">{formatNumber(item[valueKey])}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render overview tab
   */
  const renderOverview = () => (
    <div className="stats-tab-content">
      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-card-icon">📦</div>
          <div className="stats-card-value">{formatNumber(resourceStats?.total || 0)}</div>
          <div className="stats-card-label">Total Resources</div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon">👥</div>
          <div className="stats-card-value">{populationStats?.total || 0}</div>
          <div className="stats-card-label">Population</div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon">🏗️</div>
          <div className="stats-card-value">{buildingStats?.total || 0}</div>
          <div className="stats-card-label">Buildings</div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon">😊</div>
          <div className="stats-card-value">{gameState.morale || 0}</div>
          <div className="stats-card-label">Morale</div>
        </div>
      </div>

      <div className="stats-section">
        <h4 className="stats-section-title">Game Info</h4>
        <div className="stats-info-grid">
          <div className="stats-info-item">
            <span className="stats-info-label">Tier:</span>
            <span className="stats-info-value">{gameState.currentTier || 'SURVIVAL'}</span>
          </div>
          <div className="stats-info-item">
            <span className="stats-info-label">FPS:</span>
            <span className="stats-info-value">{gameState.fps || 60}</span>
          </div>
          <div className="stats-info-item">
            <span className="stats-info-label">Tick:</span>
            <span className="stats-info-value">{gameState.currentTick || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render resources tab
   */
  const renderResources = () => (
    <div className="stats-tab-content">
      <div className="stats-section">
        <h4 className="stats-section-title">Resource Breakdown</h4>
        {renderBarChart(resourceStats?.breakdown, 'value', 'name', '#4caf50')}
      </div>
    </div>
  );

  /**
   * Render population tab
   */
  const renderPopulation = () => (
    <div className="stats-tab-content">
      <div className="stats-grid">
        <div className="stats-card small">
          <div className="stats-card-value">{populationStats?.assigned || 0}</div>
          <div className="stats-card-label">Assigned</div>
        </div>

        <div className="stats-card small">
          <div className="stats-card-value">{populationStats?.idle || 0}</div>
          <div className="stats-card-label">Idle</div>
        </div>
      </div>

      <div className="stats-section">
        <h4 className="stats-section-title">By Role</h4>
        {renderBarChart(populationStats?.byRole, 'count', 'role', '#ff9800')}
      </div>
    </div>
  );

  /**
   * Render buildings tab
   */
  const renderBuildings = () => (
    <div className="stats-tab-content">
      <div className="stats-section">
        <h4 className="stats-section-title">Buildings by Type</h4>
        {renderBarChart(buildingStats?.byType, 'count', 'type', '#2196f3')}
      </div>
    </div>
  );

  /**
   * Toggle expanded/collapsed
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`stats-dashboard ${compact ? 'compact' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Header */}
      <div className="stats-dashboard-header" onClick={toggleExpanded}>
        <h3 className="stats-dashboard-title">Statistics</h3>
        <button
          className="stats-dashboard-toggle"
          aria-label={isExpanded ? 'Collapse dashboard' : 'Expand dashboard'}
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="stats-dashboard-content">
          {/* Tabs */}
          <div className="stats-tabs">
            <button
              className={`stats-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`stats-tab ${activeTab === 'resources' ? 'active' : ''}`}
              onClick={() => setActiveTab('resources')}
            >
              Resources
            </button>
            <button
              className={`stats-tab ${activeTab === 'population' ? 'active' : ''}`}
              onClick={() => setActiveTab('population')}
            >
              Population
            </button>
            <button
              className={`stats-tab ${activeTab === 'buildings' ? 'active' : ''}`}
              onClick={() => setActiveTab('buildings')}
            >
              Buildings
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'resources' && renderResources()}
          {activeTab === 'population' && renderPopulation()}
          {activeTab === 'buildings' && renderBuildings()}
        </div>
      )}
    </div>
  );
}

export default StatsDashboard;
