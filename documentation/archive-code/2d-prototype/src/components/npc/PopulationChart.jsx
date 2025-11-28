/**
 * PopulationChart.jsx - NPC population distribution chart
 *
 * Displays:
 * - Total population vs. capacity
 * - Role distribution bar chart
 * - Quick spawn buttons by role
 */

import React, { useMemo } from 'react';
import { NPC_ROLES } from '../../modules/module4/types/index';
import './PopulationChart.css';

const PopulationChart = ({
  npcs = [],
  maxPopulation = 100,
  onSpawnNPC,
  showSpawnButtons = true,
}) => {
  /**
   * Calculate role distribution
   */
  const roleDistribution = useMemo(() => {
    const distribution = {};

    // Initialize all roles
    Object.values(NPC_ROLES).forEach((role) => {
      distribution[role] = 0;
    });

    // Count NPCs by role
    npcs.forEach((npc) => {
      if (npc.role && distribution[npc.role] !== undefined) {
        distribution[npc.role]++;
      }
    });

    return distribution;
  }, [npcs]);

  /**
   * Get role colors
   */
  const getRoleColor = (role) => {
    const roleColors = {
      GUARD: '#f44336',
      TRADER: '#ff9800',
      CRAFTER: '#9c27b0',
      SCOUT: '#2196f3',
      FARMER: '#4caf50',
    };
    return roleColors[role] || '#666';
  };

  /**
   * Get role icon
   */
  const getRoleIcon = (role) => {
    const roleIcons = {
      GUARD: '🛡️',
      TRADER: '💰',
      CRAFTER: '🔨',
      SCOUT: '🔭',
      FARMER: '🌾',
    };
    return roleIcons[role] || '👤';
  };

  const totalPopulation = npcs.length;
  const populationPercent = (totalPopulation / maxPopulation) * 100;

  return (
    <div className="population-chart">
      {/* Total Population Header */}
      <div className="population-chart-header">
        <h4 className="population-chart-title">Population Overview</h4>
        <div className="population-chart-total">
          <span className="population-current">{totalPopulation}</span>
          <span className="population-separator">/</span>
          <span className="population-max">{maxPopulation}</span>
        </div>
      </div>

      {/* Total Population Bar */}
      <div className="population-total-bar">
        <div
          className="population-total-fill"
          style={{
            width: `${Math.min(populationPercent, 100)}%`,
            backgroundColor:
              populationPercent >= 90
                ? '#f44336'
                : populationPercent >= 70
                ? '#ff9800'
                : '#4caf50',
          }}
        />
      </div>
      <p className="population-capacity-label">
        {totalPopulation >= maxPopulation
          ? '⚠️ Population limit reached'
          : `${maxPopulation - totalPopulation} slots remaining`}
      </p>

      {/* Role Distribution */}
      <div className="population-roles">
        <h5 className="population-roles-title">Role Distribution</h5>
        <div className="population-roles-list">
          {Object.entries(roleDistribution).map(([role, count]) => {
            const percent = totalPopulation > 0 ? (count / totalPopulation) * 100 : 0;

            return (
              <div key={role} className="population-role-item">
                <div className="population-role-header">
                  <div className="population-role-info">
                    <span className="population-role-icon">{getRoleIcon(role)}</span>
                    <span className="population-role-name">{role}</span>
                  </div>
                  <div className="population-role-count">
                    <span className="population-role-count-value">{count}</span>
                    <span className="population-role-count-percent">
                      ({Math.round(percent)}%)
                    </span>
                  </div>
                </div>
                <div className="population-role-bar">
                  <div
                    className="population-role-fill"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: getRoleColor(role),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Spawn Buttons */}
      {showSpawnButtons && onSpawnNPC && (
        <div className="population-spawn-section">
          <h5 className="population-spawn-title">Quick Spawn</h5>
          <div className="population-spawn-buttons">
            {Object.values(NPC_ROLES).map((role) => (
              <button
                key={role}
                className="population-spawn-btn"
                onClick={() => onSpawnNPC(role)}
                disabled={totalPopulation >= maxPopulation}
                title={`Spawn ${role}`}
              >
                <span className="population-spawn-icon">{getRoleIcon(role)}</span>
                <span className="population-spawn-label">{role}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PopulationChart;
