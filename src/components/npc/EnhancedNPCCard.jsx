/**
 * EnhancedNPCCard.jsx - Rich NPC information card
 *
 * Features:
 * - Health bar with color coding
 * - Combat level badge
 * - Veteran star indicator
 * - Equipment display
 * - Skill bars (Str, Agi, Vit, End)
 * - Status indicators (expedition, low health, dead)
 * - Interactive (click to expand, quick actions)
 */

import React, { useState } from 'react';
import './EnhancedNPCCard.css';

function EnhancedNPCCard({
  npc,
  building = null,
  onAssign,
  onUnassign,
  onShowDetails,
  compact = false
}) {
  const [expanded, setExpanded] = useState(false);

  // Get NPC stats
  const name = npc.name || 'Unknown NPC';
  const health = npc.health || 100;
  const maxHealth = 100;
  const combatLevel = npc.combatLevel || 1;
  const isVeteran = npc.isVeteran || false;
  const isDead = npc.isDead || false;
  const status = npc.status || 'IDLE';

  // Combat stats
  const attack = npc.attack || 10;
  const defense = npc.defense || 5;
  const speed = npc.speed || 10;

  // Skills
  const strength = npc.skills?.strength || 1;
  const agility = npc.skills?.agility || 1;
  const vitality = npc.skills?.vitality || 1;
  const endurance = npc.skills?.endurance || 1;

  // Equipment
  const weapon = npc.equipment?.weapon;
  const armor = npc.equipment?.armor;

  // Get health color
  const getHealthColor = () => {
    const percent = (health / maxHealth) * 100;
    if (percent >= 75) return '#10b981';
    if (percent >= 50) return '#f59e0b';
    if (percent >= 25) return '#fb923c';
    return '#ef4444';
  };

  // Get status info
  const getStatusInfo = () => {
    if (isDead) return { icon: '💀', label: 'Dead', color: '#64748b' };
    if (status === 'ON_EXPEDITION') return { icon: '🗡️', label: 'On Expedition', color: '#3b82f6' };
    if (health < 30) return { icon: '⚠️', label: 'Low Health', color: '#fb923c' };
    if (building) return { icon: '🏠', label: 'Working', color: '#10b981' };
    return { icon: '💤', label: 'Idle', color: '#64748b' };
  };

  const statusInfo = getStatusInfo();

  // Handle card click
  const handleClick = () => {
    if (compact) {
      setExpanded(!expanded);
    } else if (onShowDetails) {
      onShowDetails(npc);
    }
  };

  // Calculate skill percentage (assuming max skill is 100)
  const skillPercent = (skill) => Math.min((skill / 100) * 100, 100);

  return (
    <div
      className={`enhanced-npc-card ${isDead ? 'dead' : ''} ${status === 'ON_EXPEDITION' ? 'on-expedition' : ''} ${health < 30 ? 'low-health' : ''} ${compact ? 'compact' : ''}`}
      onClick={handleClick}
    >
      {/* Card Header */}
      <div className="npc-card-header">
        <div className="npc-name-section">
          {isVeteran && <span className="veteran-star" title="Veteran">⭐</span>}
          <span className="npc-name">{name}</span>
        </div>
        <div className="npc-level-badge">Lv.{combatLevel}</div>
      </div>

      <div className="npc-card-divider" />

      {/* Health and Status */}
      <div className="npc-health-section">
        <div className="health-info">
          <span className="health-icon">❤️</span>
          <span className="health-text">{Math.floor(health)}/{maxHealth}</span>
        </div>
        <div
          className="status-badge"
          style={{ color: statusInfo.color, borderColor: statusInfo.color }}
        >
          <span className="status-icon">{statusInfo.icon}</span>
          <span className="status-label">{statusInfo.label}</span>
        </div>
      </div>

      {/* Health Bar */}
      <div className="npc-health-bar">
        <div
          className="npc-health-fill"
          style={{
            width: `${(health / maxHealth) * 100}%`,
            backgroundColor: getHealthColor()
          }}
        />
      </div>

      {/* Combat Stats */}
      <div className="npc-combat-stats">
        <div className="combat-stat">
          <span className="stat-icon">⚔️</span>
          <span className="stat-value">{attack}</span>
          <span className="stat-label">dmg</span>
        </div>
        <div className="combat-stat">
          <span className="stat-icon">🛡️</span>
          <span className="stat-value">{defense}</span>
          <span className="stat-label">def</span>
        </div>
        <div className="combat-stat">
          <span className="stat-icon">⚡</span>
          <span className="stat-value">{speed}</span>
          <span className="stat-label">spd</span>
        </div>
      </div>

      {/* Assignment */}
      {building && (
        <div className="npc-assignment">
          <span className="assignment-icon">🏗️</span>
          <span className="assignment-text">Assigned: {building.type}</span>
        </div>
      )}

      {/* Expanded Details */}
      {(expanded || !compact) && (
        <>
          {/* Skills */}
          <div className="npc-skills-section">
            <div className="skill-row">
              <span className="skill-label">📊 Str:</span>
              <div className="skill-bar">
                <div
                  className="skill-fill"
                  style={{ width: `${skillPercent(strength)}%` }}
                />
              </div>
              <span className="skill-value">{strength}</span>
            </div>
            <div className="skill-row">
              <span className="skill-label">📊 Agi:</span>
              <div className="skill-bar">
                <div
                  className="skill-fill"
                  style={{ width: `${skillPercent(agility)}%` }}
                />
              </div>
              <span className="skill-value">{agility}</span>
            </div>
            <div className="skill-row">
              <span className="skill-label">📊 Vit:</span>
              <div className="skill-bar">
                <div
                  className="skill-fill"
                  style={{ width: `${skillPercent(vitality)}%` }}
                />
              </div>
              <span className="skill-value">{vitality}</span>
            </div>
            <div className="skill-row">
              <span className="skill-label">📊 End:</span>
              <div className="skill-bar">
                <div
                  className="skill-fill"
                  style={{ width: `${skillPercent(endurance)}%` }}
                />
              </div>
              <span className="skill-value">{endurance}</span>
            </div>
          </div>

          <div className="npc-card-divider" />

          {/* Equipment */}
          <div className="npc-equipment">
            {weapon ? (
              <div className="equipment-item">
                <span className="equipment-icon">🎒</span>
                <span className="equipment-name">{weapon.name || 'Weapon'}</span>
                <span className="equipment-bonus">+{weapon.bonusDamage || 0} dmg</span>
              </div>
            ) : (
              <div className="equipment-item empty">
                <span className="equipment-icon">🎒</span>
                <span className="equipment-name">No weapon</span>
              </div>
            )}
            {armor ? (
              <div className="equipment-item">
                <span className="equipment-icon">🛡️</span>
                <span className="equipment-name">{armor.name || 'Armor'}</span>
                <span className="equipment-bonus">+{armor.bonusDefense || 0} def</span>
              </div>
            ) : (
              <div className="equipment-item empty">
                <span className="equipment-icon">🛡️</span>
                <span className="equipment-name">No armor</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {!isDead && (
            <div className="npc-quick-actions">
              {building && onUnassign && (
                <button
                  className="quick-action-btn unassign"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnassign(npc.id);
                  }}
                >
                  Unassign
                </button>
              )}
              {!building && onAssign && (
                <button
                  className="quick-action-btn assign"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(npc);
                  }}
                >
                  Assign
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EnhancedNPCCard;
