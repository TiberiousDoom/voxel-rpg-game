/**
 * NPCIndicators.jsx - Visual indicators for NPC status
 *
 * Provides:
 * - Health bars
 * - Status icons (working/idle/resting)
 * - Role indicator badges
 * - Morale indicators
 */

import React from 'react';
import PropTypes from 'prop-types';
import { getHealthBarColor, NPC_STATUS_COLORS } from '../../assets/npc-sprites.js';
import './NPCIndicators.css';

/**
 * Health Bar Component
 * Displays NPC health as a progress bar
 *
 * @param {Object} props - Component props
 * @param {number} props.health - Current health
 * @param {number} props.maxHealth - Maximum health
 * @param {number} props.width - Bar width in pixels (default: 16)
 * @param {number} props.height - Bar height in pixels (default: 3)
 */
export function HealthBar({ health = 100, maxHealth = 100, width = 16, height = 3 }) {
  const healthPercent = Math.max(0, Math.min(1, health / maxHealth));
  const barColor = getHealthBarColor(healthPercent);

  // Don't show if at full health
  if (healthPercent >= 1.0) return null;

  const containerStyle = {
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '1px',
    overflow: 'hidden',
    position: 'relative'
  };

  const fillStyle = {
    width: `${healthPercent * 100}%`,
    height: '100%',
    backgroundColor: barColor,
    transition: 'width 0.3s ease, background-color 0.3s ease'
  };

  return (
    <div className="npc-health-bar" style={containerStyle} title={`Health: ${health}/${maxHealth}`}>
      <div className="npc-health-bar-fill" style={fillStyle} />
    </div>
  );
}

HealthBar.propTypes = {
  health: PropTypes.number,
  maxHealth: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number
};

/**
 * Status Icon Component
 * Displays icon representing current NPC status
 *
 * @param {Object} props - Component props
 * @param {Object} props.npc - NPC object
 * @param {number} props.size - Icon size in pixels (default: 12)
 */
export function StatusIcon({ npc, size = 12 }) {
  if (!npc) return null;

  let icon = null;
  let tooltip = '';
  let color = NPC_STATUS_COLORS.DEFAULT;

  // Determine status icon based on NPC state
  if (npc.alive === false) {
    icon = '💀';
    tooltip = 'Dead';
    color = '#666';
  } else if (npc.hungry) {
    icon = '🍖';
    tooltip = 'Hungry - needs food';
    color = NPC_STATUS_COLORS.HUNGRY;
  } else if (npc.fatigued || npc.isResting) {
    icon = '😴';
    tooltip = 'Resting';
    color = NPC_STATUS_COLORS.RESTING;
  } else if (npc.isWorking || npc.status === 'WORKING') {
    icon = '⚙️';
    tooltip = 'Working';
    color = NPC_STATUS_COLORS.WORKING;
  } else if (npc.isMoving || npc.status === 'MOVING') {
    icon = '🚶';
    tooltip = 'Moving';
    color = NPC_STATUS_COLORS.MOVING;
  } else if (npc.status === 'PATROLLING') {
    icon = '👁️';
    tooltip = 'Patrolling';
    color = NPC_STATUS_COLORS.PATROLLING;
  } else if (npc.status === 'IDLE') {
    icon = '💤';
    tooltip = 'Idle';
    color = NPC_STATUS_COLORS.IDLE;
  }

  if (!icon) return null;

  const iconStyle = {
    fontSize: `${size}px`,
    lineHeight: 1,
    filter: `drop-shadow(0 0 2px ${color})`,
    cursor: 'help'
  };

  return (
    <span className="npc-status-icon" style={iconStyle} title={tooltip}>
      {icon}
    </span>
  );
}

StatusIcon.propTypes = {
  npc: PropTypes.shape({
    alive: PropTypes.bool,
    hungry: PropTypes.bool,
    fatigued: PropTypes.bool,
    isResting: PropTypes.bool,
    isWorking: PropTypes.bool,
    isMoving: PropTypes.bool,
    status: PropTypes.string
  }),
  size: PropTypes.number
};

/**
 * Role Badge Component
 * Displays NPC role as a small badge
 *
 * @param {Object} props - Component props
 * @param {string} props.role - NPC role
 * @param {number} props.size - Badge size in pixels (default: 14)
 */
export function RoleBadge({ role, size = 14 }) {
  if (!role) return null;

  const roleColors = {
    FARMER: '#4CAF50',
    CRAFTSMAN: '#FF9800',
    GUARD: '#F44336',
    WORKER: '#2196F3',
    MINER: '#9C27B0',
    MERCHANT: '#FFEB3B'
  };

  const color = roleColors[role] || '#9E9E9E';
  const letter = role[0] || '?';

  const badgeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: color,
    border: '1px solid #000',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${size * 0.6}px`,
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 1px 1px rgba(0,0,0,0.5)'
  };

  return (
    <div className="npc-role-badge" style={badgeStyle} title={role}>
      {letter}
    </div>
  );
}

RoleBadge.propTypes = {
  role: PropTypes.string,
  size: PropTypes.number
};

/**
 * Morale Indicator Component
 * Displays NPC morale as a colored indicator
 *
 * @param {Object} props - Component props
 * @param {number} props.morale - Morale value (0-100)
 * @param {number} props.size - Indicator size in pixels (default: 8)
 */
export function MoraleIndicator({ morale = 50, size = 8 }) {
  let color;
  let tooltip;

  if (morale >= 75) {
    color = '#4CAF50'; // Green - Happy
    tooltip = 'High morale';
  } else if (morale >= 50) {
    color = '#8BC34A'; // Light green - Content
    tooltip = 'Good morale';
  } else if (morale >= 30) {
    color = '#FF9800'; // Orange - Unhappy
    tooltip = 'Low morale';
  } else {
    color = '#F44336'; // Red - Very unhappy
    tooltip = 'Very low morale';
  }

  const indicatorStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: color,
    border: '1px solid rgba(0,0,0,0.3)',
    display: 'inline-block'
  };

  return (
    <div className="npc-morale-indicator" style={indicatorStyle} title={`${tooltip}: ${morale}/100`} />
  );
}

MoraleIndicator.propTypes = {
  morale: PropTypes.number,
  size: PropTypes.number
};

/**
 * Combined NPC Indicators Component
 * Displays all relevant indicators for an NPC
 *
 * @param {Object} props - Component props
 * @param {Object} props.npc - NPC object
 * @param {boolean} props.showHealth - Show health bar (default: true)
 * @param {boolean} props.showStatus - Show status icon (default: true)
 * @param {boolean} props.showRole - Show role badge (default: true)
 * @param {boolean} props.showMorale - Show morale indicator (default: false)
 * @param {string} props.layout - Layout direction ('vertical' or 'horizontal', default: 'vertical')
 */
export function NPCIndicators({
  npc,
  showHealth = true,
  showStatus = true,
  showRole = true,
  showMorale = false,
  layout = 'vertical'
}) {
  if (!npc) return null;

  const containerStyle = {
    display: 'flex',
    flexDirection: layout === 'horizontal' ? 'row' : 'column',
    alignItems: 'center',
    gap: '4px'
  };

  return (
    <div className="npc-indicators" style={containerStyle}>
      {showHealth && <HealthBar health={npc.health} maxHealth={npc.maxHealth} />}
      {showStatus && <StatusIcon npc={npc} />}
      {showRole && <RoleBadge role={npc.role} />}
      {showMorale && npc.morale !== undefined && <MoraleIndicator morale={npc.morale} />}
    </div>
  );
}

NPCIndicators.propTypes = {
  npc: PropTypes.object,
  showHealth: PropTypes.bool,
  showStatus: PropTypes.bool,
  showRole: PropTypes.bool,
  showMorale: PropTypes.bool,
  layout: PropTypes.oneOf(['vertical', 'horizontal'])
};

export default NPCIndicators;
