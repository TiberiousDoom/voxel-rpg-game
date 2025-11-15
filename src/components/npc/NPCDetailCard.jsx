/**
 * NPCDetailCard.jsx - Detailed NPC information card
 *
 * Displays:
 * - NPC basic info (name, role, status)
 * - Health and morale bars
 * - Needs (food, rest, social) with progress bars
 * - Skills progression
 * - Assignment information
 */

import React from 'react';
import './NPCDetailCard.css';

const NPCDetailCard = ({ npc, building, onClose, onUnassign, onAssign }) => {
  if (!npc) return null;

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    const statusColors = {
      IDLE: '#999',
      WORKING: '#4caf50',
      PATROLLING: '#2196f3',
      SLEEPING: '#9c27b0',
      TRAVELING: '#ff9800',
    };
    return statusColors[status] || '#666';
  };

  /**
   * Get morale/happiness value
   */
  const getMoraleValue = () => {
    return npc.happiness !== undefined ? npc.happiness : npc.morale || 50;
  };

  /**
   * Get morale color
   */
  const getMoraleColor = (value) => {
    if (value >= 75) return '#4caf50';
    if (value >= 50) return '#ff9800';
    if (value >= 25) return '#f44336';
    return '#d32f2f';
  };

  /**
   * Get health color
   */
  const getHealthColor = (value) => {
    if (value >= 75) return '#4caf50';
    if (value >= 40) return '#ff9800';
    return '#f44336';
  };

  /**
   * Get need value (simulated for now)
   */
  const getNeedValue = (needType) => {
    // In a real implementation, this would come from npc.needs
    // For now, we'll simulate based on available data
    if (needType === 'food') {
      return npc.inventory?.food ? Math.min(100, npc.inventory.food * 10) : 50;
    }
    if (needType === 'rest') {
      return npc.fatigued ? 20 : 80;
    }
    if (needType === 'social') {
      return getMoraleValue();
    }
    return 50;
  };

  /**
   * Get skill value
   */
  const getSkillValue = (skillName) => {
    if (npc.skills && npc.skills[skillName]) {
      return Math.round(npc.skills[skillName] * 100);
    }
    return 50;
  };

  /**
   * Get productivity value
   */
  const getProductivity = () => {
    return npc.productivity !== undefined
      ? Math.round(npc.productivity * 100)
      : 100;
  };

  const moraleValue = getMoraleValue();
  const healthValue = npc.health || 100;

  return (
    <div className="npc-detail-card">
      {/* Header */}
      <div className="npc-detail-header">
        <div className="npc-detail-title">
          <h3 className="npc-detail-name">{npc.name || `NPC #${npc.id}`}</h3>
          <span
            className="npc-detail-status"
            style={{ backgroundColor: getStatusColor(npc.status) }}
          >
            {npc.status || 'IDLE'}
          </span>
        </div>
        <button className="npc-detail-close" onClick={onClose}>
          ✖
        </button>
      </div>

      {/* Basic Info */}
      <div className="npc-detail-section">
        <div className="npc-detail-info-grid">
          <div className="npc-detail-info-item">
            <span className="npc-detail-label">Role:</span>
            <span className="npc-detail-value npc-role-badge">{npc.role}</span>
          </div>
          <div className="npc-detail-info-item">
            <span className="npc-detail-label">ID:</span>
            <span className="npc-detail-value">{npc.id}</span>
          </div>
        </div>
      </div>

      {/* Health & Morale */}
      <div className="npc-detail-section">
        <div className="npc-detail-stat">
          <div className="npc-detail-stat-header">
            <span className="npc-detail-label">Health</span>
            <span className="npc-detail-value">{healthValue}%</span>
          </div>
          <div className="npc-detail-progress-bar">
            <div
              className="npc-detail-progress-fill"
              style={{
                width: `${healthValue}%`,
                backgroundColor: getHealthColor(healthValue),
              }}
            />
          </div>
        </div>

        <div className="npc-detail-stat">
          <div className="npc-detail-stat-header">
            <span className="npc-detail-label">Morale</span>
            <span className="npc-detail-value">{moraleValue}%</span>
          </div>
          <div className="npc-detail-progress-bar">
            <div
              className="npc-detail-progress-fill"
              style={{
                width: `${moraleValue}%`,
                backgroundColor: getMoraleColor(moraleValue),
              }}
            />
          </div>
        </div>

        <div className="npc-detail-stat">
          <div className="npc-detail-stat-header">
            <span className="npc-detail-label">Productivity</span>
            <span className="npc-detail-value">{getProductivity()}%</span>
          </div>
          <div className="npc-detail-progress-bar">
            <div
              className="npc-detail-progress-fill"
              style={{
                width: `${getProductivity()}%`,
                backgroundColor: '#2196f3',
              }}
            />
          </div>
        </div>
      </div>

      {/* Needs */}
      <div className="npc-detail-section">
        <h4 className="npc-detail-section-title">Needs</h4>
        <div className="npc-detail-needs">
          <div className="npc-detail-need">
            <span className="npc-detail-need-icon">🍖</span>
            <div className="npc-detail-need-info">
              <span className="npc-detail-label">Food</span>
              <div className="npc-detail-progress-bar npc-detail-progress-small">
                <div
                  className="npc-detail-progress-fill"
                  style={{
                    width: `${getNeedValue('food')}%`,
                    backgroundColor: '#ff9800',
                  }}
                />
              </div>
            </div>
            <span className="npc-detail-need-value">{getNeedValue('food')}%</span>
          </div>

          <div className="npc-detail-need">
            <span className="npc-detail-need-icon">😴</span>
            <div className="npc-detail-need-info">
              <span className="npc-detail-label">Rest</span>
              <div className="npc-detail-progress-bar npc-detail-progress-small">
                <div
                  className="npc-detail-progress-fill"
                  style={{
                    width: `${getNeedValue('rest')}%`,
                    backgroundColor: '#9c27b0',
                  }}
                />
              </div>
            </div>
            <span className="npc-detail-need-value">{getNeedValue('rest')}%</span>
          </div>

          <div className="npc-detail-need">
            <span className="npc-detail-need-icon">👥</span>
            <div className="npc-detail-need-info">
              <span className="npc-detail-label">Social</span>
              <div className="npc-detail-progress-bar npc-detail-progress-small">
                <div
                  className="npc-detail-progress-fill"
                  style={{
                    width: `${getNeedValue('social')}%`,
                    backgroundColor: '#2196f3',
                  }}
                />
              </div>
            </div>
            <span className="npc-detail-need-value">{getNeedValue('social')}%</span>
          </div>
        </div>
      </div>

      {/* Skills */}
      {npc.skills && (
        <div className="npc-detail-section">
          <h4 className="npc-detail-section-title">Skills</h4>
          <div className="npc-detail-skills">
            {Object.keys(npc.skills).map((skillName) => (
              <div key={skillName} className="npc-detail-skill">
                <span className="npc-detail-label">{skillName}</span>
                <div className="npc-detail-progress-bar npc-detail-progress-small">
                  <div
                    className="npc-detail-progress-fill"
                    style={{
                      width: `${getSkillValue(skillName)}%`,
                      backgroundColor: '#667eea',
                    }}
                  />
                </div>
                <span className="npc-detail-skill-value">{getSkillValue(skillName)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignment */}
      <div className="npc-detail-section">
        <h4 className="npc-detail-section-title">Assignment</h4>
        {npc.assignedBuilding || npc.assignedBuildingId ? (
          <div className="npc-detail-assignment">
            <div className="npc-detail-assignment-info">
              <span className="npc-detail-label">Assigned to:</span>
              <span className="npc-detail-value">
                {building ? building.type || building.name : npc.assignedBuilding || npc.assignedBuildingId}
              </span>
            </div>
            {onUnassign && (
              <button
                className="npc-detail-unassign-btn"
                onClick={() => onUnassign(npc.id)}
              >
                Unassign
              </button>
            )}
          </div>
        ) : (
          <div className="npc-detail-assignment">
            <p className="npc-detail-assignment-none">Not assigned to any building</p>
            {onAssign && (
              <button
                className="npc-detail-assign-btn"
                onClick={() => onAssign(npc)}
              >
                Assign to Building
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NPCDetailCard;
