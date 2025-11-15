/**
 * NPCSprite.jsx - React component for rendering an NPC sprite
 *
 * Provides a reusable NPC sprite component with:
 * - Role-based coloring
 * - Animation support
 * - Direction-based flipping
 * - Status indicators
 */

import React from 'react';
import PropTypes from 'prop-types';
import { getSpriteForRole, getStatusColor } from '../assets/npc-sprites.js';

/**
 * NPCSprite Component
 * Renders an NPC sprite with visual feedback
 *
 * @param {Object} props - Component props
 * @param {Object} props.npc - NPC object
 * @param {number} props.size - Sprite size in pixels (default: 16)
 * @param {boolean} props.showBadge - Show role badge (default: true)
 * @param {string} props.className - Additional CSS class
 * @param {Function} props.onClick - Click handler
 */
function NPCSprite({ npc, size = 16, showBadge = true, className = '', onClick }) {
  if (!npc) return null;

  const sprite = getSpriteForRole(npc.role);
  const statusColor = getStatusColor(npc);

  const containerStyle = {
    position: 'relative',
    width: `${size}px`,
    height: `${size}px`,
    display: 'inline-block',
    cursor: onClick ? 'pointer' : 'default'
  };

  const spriteStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: statusColor,
    border: '2px solid #000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${size * 0.6}px`,
    fontWeight: 'bold',
    color: '#fff',
    transition: 'all 0.2s ease'
  };

  const badgeStyle = {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    width: `${size * 0.4}px`,
    height: `${size * 0.4}px`,
    borderRadius: '50%',
    backgroundColor: sprite.secondaryColor,
    border: '1px solid #000',
    fontSize: `${size * 0.3}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  };

  const handleClick = (e) => {
    if (onClick) {
      e.stopPropagation();
      onClick(npc);
    }
  };

  return (
    <div
      className={`npc-sprite ${className}`}
      style={containerStyle}
      onClick={handleClick}
      role={onClick ? 'button' : 'img'}
      aria-label={`${npc.name || 'NPC'} - ${sprite.name}`}
      tabIndex={onClick ? 0 : undefined}
      title={`${npc.name || 'NPC'} (${sprite.name})`}
    >
      <div style={spriteStyle}>
        {sprite.letter}
      </div>
      {showBadge && (
        <div style={badgeStyle} title={sprite.name}>
          {sprite.letter}
        </div>
      )}
    </div>
  );
}

NPCSprite.propTypes = {
  npc: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    role: PropTypes.string,
    status: PropTypes.string,
    health: PropTypes.number,
    maxHealth: PropTypes.number,
    isWorking: PropTypes.bool,
    isMoving: PropTypes.bool,
    isResting: PropTypes.bool,
    hungry: PropTypes.bool,
    morale: PropTypes.number
  }),
  size: PropTypes.number,
  showBadge: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func
};

export default NPCSprite;
